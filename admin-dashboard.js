document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; const dbGet = window.dbGet;
    const removeDoc = window.removeDoc; const collection = window.collection;
    const onSnapshot = window.onSnapshot; const query = window.query;
    const where = window.where; const orderBy = window.orderBy; const getDocs = window.getDocs;
    const updateDoc = window.updateDoc;

    const tableBody = document.getElementById('tableBody');
    const totalCountEl = document.getElementById('totalCount');
    const pendingCountEl = document.getElementById('pendingCount');
    const completedCountEl = document.getElementById('completedCount');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const clearBtn = document.getElementById('clearBtn');
    const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');
    const dashboardTitle = document.getElementById('dashboardTitle');
    const nextTimeEl = document.getElementById('nextTime');

    let currentUserRole = null;
    let currentUserId = null;
    let unsubscribeBookings = null;

    const SERVICE_PRICES = { 'Fade': 50, 'Line Up': 40, 'Beard Trim': 30, 'Full Cut': 80, 'Dye': 100 };

    onAuthState(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) {
                    currentUserRole = userSnap.data().role;
                    if (currentUserRole === 'admin') {
                        dashboardTitle.textContent = "Admin Dashboard - All Salons";
                    } else if (currentUserRole === 'salon_owner') {
                        dashboardTitle.textContent = "Owner Dashboard - My Salon";
                    }
                    syncAdminDashboard(currentUserRole, user.uid);
                } else { alert("No user data found."); window.location.href = 'index.html'; }
            } catch (err) { console.error("Admin error:", err); }
        } else { window.location.href = 'index.html'; } // Not logged in = go to cover
    });

    // FIX: LOGOUT NOW GOES TO COVER
    if (logoutBtnAdmin) {
        logoutBtnAdmin.addEventListener('click', () => {
            if (unsubscribeBookings) unsubscribeBookings();
            window.logOut(auth).then(() => {
                window.location.href = 'index.html' // Cover page
            });
        });
    }

    function syncAdminDashboard(role, uid) {
        const todayStr = new Date().toISOString().split('T')[0];
        const bookingsRef = collection(db, "bookings");

        let q;
        if (role === 'admin') {
            q = query(bookingsRef, where("date", "==", todayStr), orderBy("time", "asc"));
        } else {
            q = query(bookingsRef, where("s", "==", uid), where("date", "==", todayStr), orderBy("time", "asc"));
        }

        unsubscribeBookings = onSnapshot(q, (snapshot) => {
            tableBody.innerHTML = "";
            let total = 0, pending = 0, completed = 0, revenue = 0;
            let next = "--:--";

            if (snapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#666; padding: 30px;">No bookings for today.</td></tr>`;
                totalCountEl.textContent = "0"; pendingCountEl.textContent = "0"; completedCountEl.textContent = "0"; totalRevenueEl.textContent = "R0"; if(nextTimeEl) nextTimeEl.textContent = "--:--"; return;
            }

            snapshot.forEach((docSnap, i) => {
                const item = docSnap.data(); total++;
                const itemPrice = SERVICE_PRICES[item.service] || parseInt(item.price) || 50;
                revenue += itemPrice;
                if(item.status === 'pending') pending++; else completed++;
                if(i === 0 && item.status!== 'done') next = item.time;

                const statusClass = item.status === 'approved'? 'status-approved' : item.status === 'done'? 'status-completed' : 'status-pending';
                const statusText = item.status === 'approved'? 'Approved' : item.status === 'done'? 'Done' : 'Pending';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.salon)}</strong></td>
                    <td>${escapeHtml(item.name)}<br><small style="color:#666;">${escapeHtml(item.phone)}</small></td>
                    <td><span style="color:#008080; font-weight:bold;">${item.time}</span></td>
                    <td>${escapeHtml(item.service)}<br><small>R${itemPrice}</small></td>
                    <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                    <td>
                        ${item.status === 'pending' && role === 'salon_owner'? `<button class="status-btn approveBtn" data-id="${docSnap.id}">Approve</button>` : ''}
                        ${item.status === 'approved' && role === 'salon_owner'? `<button class="status-btn" style="background:#00c853" data-done="${docSnap.id}">Done</button>` : ''}
                        ${role === 'admin'? `<button class="status-btn" style="background:#ff4757" data-del="${docSnap.id}">Del</button>` : ''}
                    </td>`;
                tableBody.appendChild(tr);
            });
            totalCountEl.textContent = total;
            pendingCountEl.textContent = pending;
            completedCountEl.textContent = completed;
            totalRevenueEl.textContent = `R${revenue}`;
            if(nextTimeEl) nextTimeEl.textContent = next;
        });
    }

    // BUTTON ACTIONS
    document.addEventListener('click', async (e) => {
        const approveBtn = e.target.closest('.approveBtn');
        const doneBtn = e.target.closest('[data-done]');
        const delBtn = e.target.closest('[data-del]');

        if(approveBtn) {
            await updateDoc(dbDoc(db, "bookings", approveBtn.dataset.id), { status: 'approved' });
        }
        if(doneBtn) {
            await updateDoc(dbDoc(db, "bookings", doneBtn.dataset.done), { status: 'done' });
        }
        if(delBtn && currentUserRole === 'admin') {
            if(confirm("Delete this booking?")) await removeDoc(dbDoc(db, "bookings", delBtn.dataset.del));
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (currentUserRole!== 'admin') return alert("Only Admin can clear all");
            if (!confirm("Clear ALL bookings for today? This cannot be undone.")) return;
            const todayStr = new Date().toISOString().split('T')[0];
            let q = query(collection(db, "bookings"), where("date", "==", todayStr));

            try {
                if (unsubscribeBookings) unsubscribeBookings();
                const snapshot = await getDocs(q);
                const deletes = snapshot.docs.map(d => removeDoc(dbDoc(db, "bookings", d.id)));
                await Promise.all(deletes);
                alert("All bookings cleared.");
            } catch (err) { alert("Clear failed: " + err.message); }
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
});
