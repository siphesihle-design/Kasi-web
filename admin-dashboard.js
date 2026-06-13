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

    // DOM UI Hooks
    const shopStatusSelect = document.getElementById('shopStatusSelect');
    const totalCountEl = document.getElementById('totalCount');
    const nextTimeEl = document.getElementById('nextTime');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const tableBody = document.getElementById('tableBody');
    const clearBtn = document.getElementById('clearBtn');
    const logoutBtnOwner = document.getElementById('logoutBtnOwner');

    // 1. ADAPTIVE ROUTE GUARD
    onAuthState(auth, async (user) => {
        if (!user) {
            window.location.replace('index.html');
            return;
        }

        // Fetch the user's role to see if they are a regular owner or the Super Admin
        const roleRef = dbRef(db, 'users/' + user.uid + '/role');
        const roleSnap = await dbGet(roleRef);
        
        if (!roleSnap.exists()) {
            window.location.replace('index.html');
            return;
        }

        const userRole = roleSnap.val();

        if (userRole === 'admin') {
            // You are the Super Admin -> Initialize Master View
            document.querySelector('header p').textContent = "Master Admin Panel — Global Overview";
            // Hide shop status selector since the global admin doesn't run a single shop
            if(document.querySelector('.status-control')) document.querySelector('.status-control').style.display = 'none';
            
            initDashboardEngine(user.uid, true);
        } else if (userRole === 'salon_owner') {
            // Regular Barber/Salon Owner -> Initialize Scoped View
            initDashboardEngine(user.uid, false);
        } else {
            alert('Access Denied.');
            window.location.replace('index.html');
        }
    });

    // 2. ADAPTIVE METRICS & DATA STREAM ENGINE
    function initDashboardEngine(userUid, isSuperAdmin) {
        const bookingsRef = dbRef(db, 'bookings');
        const todayStr = new Date().toISOString().split('T')[0];

        // Only manage shop status dropdown if user is a standard salon owner
        if (!isSuperAdmin) {
            const statusNodeRef = dbRef(db, 'shopStatus/' + userUid + '/status');
            onValue(statusNodeRef, (snap) => {
                if (snap.exists()) shopStatusSelect.value = snap.val();
            });

            shopStatusSelect.addEventListener('change', async () => {
                try {
                    const { dbSet } = window;
                    await dbSet(statusNodeRef, shopStatusSelect.value);
                } catch (err) { alert('Error updating status: ' + err.message); }
            });
        }

        // Fetch & Stream Data
        onValue(bookingsRef, (snapshot) => {
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

                // ADAPTIVE FILTER CONDITIONAL:
                // If Super Admin -> match all bookings for today.
                // If Salon Owner -> match only bookings where data.s matches their own UID.
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

            // Update UI Counters
            totalCountEl.textContent = totalBookings;
            totalRevenueEl.textContent = `R${totalRevenue}`;
            
            if (appointmentTimes.length > 0) {
                appointmentTimes.sort();
                nextTimeEl.textContent = appointmentTimes[0];
            } else {
                nextTimeEl.textContent = '--:--';
                tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No pending cuts remaining today.</td></tr>`;
            }
        });

        // --- CLEAR QUEUE BUTTON ---
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
            } catch (err) { alert('Error dropping records: ' + err.message); }
        });
    }

    // 3. RENDER DATA ROW WITH SHOP IDENTITY IF ADMIN
    function appendBookingRow(bookingId, bData, isSuperAdmin) {
        const tr = document.createElement('tr');
        const { dbSet } = window;
        
        const isConfirmed = bData.status === 'confirmed';
        const actionBtnLabel = isConfirmed ? "✂️ Complete Cut" : "✅ Confirm Cut";
        const btnStyle = isConfirmed ? "background-color: #22c55e;" : "background-color: var(--admin-teal);";

        // If you are the Super Admin, append the Salon name next to the client's name so you know where they're going
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
            <td><button class="status-btn" style="${btnStyle}">${actionBtnLabel}</button></td>
        `;

        tr.querySelector('.status-btn').addEventListener('click', async () => {
            try {
                if (!isConfirmed) {
                    await dbSet(dbRef(db, `bookings/${bookingId}/status`), 'confirmed');
                } else {
                    await dbSet(dbRef(db, `bookings/${bookingId}/status`), 'completed');
                }
            } catch (err) { alert('Action failed: ' + err.message); }
        });

        tableBody.appendChild(tr);
    }

    function resetMetrics() {
        totalCountEl.textContent = '0';
        nextTimeEl.textContent = '--:--';
        totalRevenueEl.textContent = 'R0';
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No appointments booked yet.</td></tr>`;
    }

    if (logoutBtnOwner) {
        logoutBtnOwner.addEventListener('click', async () => {
            try {
                await logOut(auth);
                window.location.replace('index.html');
            } catch (err) { console.error(err); }
        });
    }
