document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; const dbGet = window.dbGet;
    const removeDoc = window.removeDoc; const collection = window.collection;
    const onSnapshot = window.onSnapshot; const query = window.query;
    const where = window.where; const orderBy = window.orderBy; const getDocs = window.getDocs;

    const tableBody = document.getElementById('tableBody');
    const totalCountEl = document.getElementById('totalCount');
    const pendingCountEl = document.getElementById('pendingCount');
    const completedCountEl = document.getElementById('completedCount');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const clearBtn = document.getElementById('clearBtn');
    const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');
    const dashboardTitle = document.getElementById('dashboardTitle');

    let currentUserRole = null;
    let unsubscribeBookings = null;

    onAuthState(auth, async (user) => {
        if (user) {
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) {
                    currentUserRole = userSnap.data().role;
                    if (currentUserRole === 'admin') {
                        dashboardTitle.textContent = "Admin Dashboard - All Salons";
                    }
                    syncAdminDashboard(currentUserRole, user.uid);
                } else { alert("No user data found."); window.location.href = 'index.html'; }
            } catch (err) { console.error("Admin error:", err); }
        } else { window.location.href = 'index.html'; }
    });

    if (logoutBtnAdmin) {
        logoutBtnAdmin.addEventListener('click', () => {
            if (unsubscribeBookings) unsubscribeBookings();
            window.logOut(auth);
        });
    }

    function syncAdminDashboard(role, uid) {
        const todayStr = new Date().toISOString().split('T')[0];
        const bookingsRef = collection(db, "bookings");

        // IF ADMIN: show all. IF OWNER: show only theirs
        let q;
        if (role === 'admin') {
            q = query(bookingsRef, where("date", "==", todayStr), orderBy("time", "asc"));
        } else {
            q = query(bookingsRef, where("s", "==", uid), where("date", "==", todayStr), orderBy("time", "asc"));
        }

        unsubscribeBookings = onSnapshot(q, (snapshot) => {
            tableBody.innerHTML = "";
            let total = 0, pending = 0, completed = 0, revenue = 0;

            if (snapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#666; padding: 30px;">No bookings for today.</td></tr>`;
                totalCountEl.textContent = "0"; pendingCountEl.textContent = "0"; completedCountEl.textContent = "0"; totalRevenueEl.textContent = "R0"; return;
            }

            snapshot.forEach((docSnap) => {
                const item = docSnap.data(); total++;
                const itemPrice = parseInt(item.price) || 0; revenue += itemPrice;
                if(item.status === 'pending') pending++; else completed++;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.salon)}</strong></td>
                    <td>${escapeHtml(item.name)}<br><small style="color:#666;">${escapeHtml(item.phone)}</small></td>
                    <td><span style="color:#008080; font-weight:bold;">${item.time}</span></td>
                    <td>${escapeHtml(item.service)}</td>
                    <td><span class="status-pill ${item.status === 'completed'? 'status-completed' : 'status-pending'}">${item.status}</span></td>`;
                tableBody.appendChild(tr);
            });
            totalCountEl.textContent = total;
            pendingCountEl.textContent = pending;
            completedCountEl.textContent = completed;
            totalRevenueEl.textContent = `R${revenue}`;
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (!confirm("Clear ALL bookings for today?")) return;
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
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
});
