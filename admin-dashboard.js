document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;

    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const logOut = window.logOut;
    const dbRef = window.dbRef;
    const dbGet = window.dbGet;
    const remove = window.remove;
    const onValue = window.onValue;

    // DOM UI Components Hooks
    const shopStatusSelect = document.getElementById('shopStatusSelect');
    const totalCountEl = document.getElementById('totalCount');
    const nextTimeEl = document.getElementById('nextTime');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const tableBody = document.getElementById('tableBody');
    const clearBtn = document.getElementById('clearBtn');
    const logoutBtnOwner = document.getElementById('logoutBtnOwner');

    // --- 1. ADMIN ROUTE VERIFICATION GUARD ---
    onAuthState(auth, async (user) => {
        if (!user) {
            window.location.replace('index.html');
            return;
        }

        const roleRef = dbRef(db, 'users/' + user.uid + '/role');
        const roleSnap = await dbGet(roleRef);
        
        if (!roleSnap.exists()) {
            window.location.replace('index.html');
            return;
        }

        const userRole = roleSnap.val();

        if (userRole === 'admin') {
            document.querySelector('header p').textContent = "Master Admin Panel — Global Overview";
            if(document.querySelector('.status-control')) {
                document.querySelector('.status-control').style.display = 'none';
            }
            initDashboardEngine(user.uid, true);
        } else if (userRole === 'salon_owner') {
            initDashboardEngine(user.uid, false);
        } else {
            alert('Access Denied: Administrative access authorization required.');
            window.location.replace('index.html');
        }
    });

    // --- 2. METRICS CONTROL STREAM STORAGE MODULE ---
    function initDashboardEngine(userUid, isSuperAdmin) {
        const bookingsRef = dbRef(db, 'bookings');
        const todayStr = new Date().toISOString().split('T')[0];

        if (!isSuperAdmin && shopStatusSelect) {
            const statusNodeRef = dbRef(db, 'shopStatus/' + userUid + '/status');
            onValue(statusNodeRef, (snap) => {
                if (snap.exists()) shopStatusSelect.value = snap.val();
            });

            shopStatusSelect.addEventListener('change', async () => {
                try {
                    await window.dbSet(statusNodeRef, shopStatusSelect.value);
                } catch (err) { 
                    alert('Error updating status context: ' + err.message); 
                }
            });
        }

        // Live Real-Time Dashboard Subscription Syncing
        onValue(bookingsRef, (snapshot) => {
            if (!tableBody) return;
            tableBody.innerHTML = ''; 
            
            let totalBookings = 0;
            let totalRevenue = 0;
            let appointmentTimes = [];

            if (!snapshot.exists()) {
                resetMetrics();
                return;
            }

            snapshot.forEach((child) => {
                const bookingId = child.key;
                const data = child.val();
                const matchesOwnership = isSuperAdmin || (data.s === userUid);

                if (matchesOwnership && data.date === todayStr) {
                    totalBookings++;
                    const priceValue = parseInt(data.price, 10) || 0;
                    
                    if (data.status !== 'completed') {
                        appointmentTimes.push(data.time);
                        totalRevenue += priceValue;
                        appendBookingRow(bookingId, data, isSuperAdmin);
                    }
                }
            });

            if (totalCountEl) totalCountEl.textContent = totalBookings;
            if (totalRevenueEl) totalRevenueEl.textContent = `R${totalRevenue}`;
            
            if (nextTimeEl) {
                if (appointmentTimes.length > 0) {
                    appointmentTimes.sort();
                    nextTimeEl.textContent = appointmentTimes[0];
                } else {
                    nextTimeEl.textContent = '--:--';
                    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No pending cuts remaining today.</td></tr>`;
                }
            }
        });

        // Clear Dashboard Queue Interaction Action
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                const scopeMessage = isSuperAdmin ? "ALL salons globally" : "your salon";
                if (!confirm(`Are you sure you want to clear the entire appointment queue for ${scopeMessage} today?`)) return;
                
                try {
                    const snapshot = await dbGet(bookingsRef);
                    if (snapshot.exists()) {
                        snapshot.forEach((child) => {
                            const data = child.val();
                            const matchesOwnership = isSuperAdmin || (data.s === userUid);
                            if (matchesOwnership && data.date === todayStr) {
                                remove(dbRef(db, 'bookings/' + child.key));
                            }
                        });
                    }
                } catch (err) { 
                    alert('Error clearing queue records: ' + err.message); 
                }
            });
        }
    }

    // --- 3. BOOKING ROWS DOM RENDER INJECTOR ---
    function appendBookingRow(bookingId, bData, isSuperAdmin) {
        const tr = document.createElement('tr');
        const isConfirmed = bData.status === 'confirmed';
        const actionBtnLabel = isConfirmed ? "✂️ Complete Cut" : "✅ Confirm Cut";
        const btnStyle = isConfirmed ? "background-color: #22c55e;" : "background-color: var(--admin-teal, #008080);";

        const identityMeta = isSuperAdmin 
            ? `<div style="font-size:0.75rem; color:#008080; font-weight:bold; margin-top:2px;"><i class='bx bx-cut'></i> ${bData.salon || 'Unknown Salon'}</div>` 
            : '';

        tr.innerHTML = `
            <td>
                <div style="font-weight:bold;">${bData.name}</div>
                <div style="font-size:0.75rem; color:#777;">${bData.phone}</div>
                ${identityMeta}
            </td>
            <td><span style="background:#252525; padding:4px 8px; border-radius:6px;">${bData.time}</span></td>
            <td style="font-size:0.85rem; color:var(--text-muted);">${bData.service}</td>
            <td><button class="status-btn" style="${btnStyle} color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">${actionBtnLabel}</button></td>
        `;

        tr.querySelector('.status-btn').addEventListener('click', async () => {
            try {
                const targetStatus = !isConfirmed ? 'confirmed' : 'completed';
                await window.dbSet(dbRef(db, `bookings/${bookingId}/status`), targetStatus);
            } catch (err) { 
                alert('Action execution failed: ' + err.message); 
            }
        });

        if (tableBody) tableBody.appendChild(tr);
    }

    function resetMetrics() {
        if (totalCountEl) totalCountEl.textContent = '0';
        if (nextTimeEl) nextTimeEl.textContent = '--:--';
        if (totalRevenueEl) totalRevenueEl.textContent = 'R0';
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No appointments booked yet.</td></tr>`;
    }

    if (logoutBtnOwner) {
        logoutBtnOwner.addEventListener('click', async () => {
            try {
                await logOut(auth);
                window.location.replace('index.html');
            } catch (err) { 
                console.error("Dashboard Logout Exception Handled:", err); 
            }
        });
    }
