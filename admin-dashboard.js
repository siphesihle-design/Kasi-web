document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; const dbGet = window.dbGet;
    const removeDoc = window.removeDoc; const collection = window.collection;
    const onSnapshot = window.onSnapshot; const query = window.query;
    const where = window.where; const orderBy = window.orderBy; const getDocs = window.getDocs;
    const setDoc = window.setDoc;

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
    let unsubscribeSalons = null;

    onAuthState(auth, async (user) => {
        if (user) {
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) {
                    currentUserRole = userSnap.data().role;
                    if (currentUserRole === 'admin') {
                        dashboardTitle.textContent = "Admin Dashboard - God Mode";
                        loadSalonsForAdmin();
                    }
                    syncAdminDashboard(currentUserRole, user.uid);
                } else { alert("No user data found."); window.location.href = 'index.html'; }
            } catch (err) { console.error("Admin error:", err); }
        } else { window.location.href = 'index.html'; }
    });

    if (logoutBtnAdmin) {
        logoutBtnAdmin.addEventListener('click', () => {
            if (unsubscribeBookings) unsubscribeBookings();
            if (unsubscribeSalons) unsubscribeSalons();
            window.logOut(auth);
        });
    }

    function loadSalonsForAdmin() {
        const wrapper = document.querySelector('.dashboard-wrapper');
        wrapper.insertAdjacentHTML('afterbegin', `
            <div class="table-wrapper" style="margin-bottom:30px;">
                <h2 style="padding:20px 20px 0 20px; color:#008080;">Manage Salons</h2>
                <div style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <h3 style="color:#fff; margin-bottom:10px;">Add New Salon</h3>
                    <form id="addSalonForm" style="display:grid; gap:10px;">
                        <input type="text" id="salonName" placeholder="Salon Name" required style="padding:12px; border-radius:10px; border:1px solid #333; background:#0a0a0a; color:#fff;">
                        <input type="text" id="salonUid" placeholder="Owner UID - must match user doc" required style="padding:12px; border-radius:10px; border:1px solid #333; background:#0a0a0a; color:#fff;">
                        <input type="text" id="salonImg" placeholder="Image URL" required style="padding:12px; border-radius:10px; border:1px solid #333; background:#0a0a0a; color:#fff;">
                        <input type="text" id="salonLocation" placeholder="Location e.g Sharpeville" required style="padding:12px; border-radius:10px; border:1px solid #333; background:#0a0a0a; color:#fff;">
                        <input type="text" id="salonHours" placeholder="Hours e.g 8AM - 6PM" required style="padding:12px; border-radius:10px; border:1px solid #333; background:#0a0a0a; color:#fff;">
                        <textarea id="salonDesc" placeholder="Description" required style="padding:12px; border-radius:10px; border:1px solid #333; background:#0a0a0a; color:#fff;"></textarea>
                        <button type="submit" class="primary-btn">Add Salon</button>
                    </form>
                </div>
                <div id="salonList" style="padding:20px;"></div>
            </div>
        `);

        const salonListDiv = document.getElementById('salonList');
        const addSalonForm = document.getElementById('addSalonForm');

        addSalonForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uid = document.getElementById('salonUid').value.trim();
            const data = {
                name: document.getElementById('salonName').value,
                uid: uid,
                img: document.getElementById('salonImg').value,
                rating: 5.0,
                desc: document.getElementById('salonDesc').value,
                location: document.getElementById('salonLocation').value,
                hours: document.getElementById('salonHours').value
            };
            try {
                await setDoc(dbDoc(db, "salons", uid), data);
                await setDoc(dbDoc(db, "shopStatus", uid), { status: "Open" });
                alert(`Salon ${data.name} added!`);
                addSalonForm.reset();
            } catch(err) { alert("Error: " + err.message); }
        });

        unsubscribeSalons = onSnapshot(collection(db, "salons"), (snap) => {
            salonListDiv.innerHTML = "";
            snap.forEach(docSnap => {
                const s = docSnap.data();
                salonListDiv.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <div><strong>${s.name}</strong><br><small style="color:#888;">${s.location}</small></div>
                        <button class="delete-salon-btn" data-id="${docSnap.id}" style="background:#ff4757; border:none; color:white; padding:8px 12px; border-radius:8px; cursor:pointer;">Delete</button>
                    </div>
                `;
            });
            document.querySelectorAll('.delete-salon-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.target.dataset.id;
                    if(confirm(`Delete salon ${id}?`)) {
                        await removeDoc(dbDoc(db, "salons", id));
                        await removeDoc(dbDoc(db, "shopStatus", id));
                    }
                }
            });
        });
    }

    function syncAdminDashboard(role, uid) {
        const todayStr = new Date().toISOString().split('T')[0];
        const bookingsRef = collection(db, "bookings");
        let q = role === 'admin' 
            ? query(bookingsRef, where("date", "==", todayStr), orderBy("time", "asc"))
            : query(bookingsRef, where("s", "==", uid), where("date", "==", todayStr), orderBy("time", "asc"));

        unsubscribeBookings = onSnapshot(q, (snapshot) => {
            tableBody.innerHTML = "";
            let total = 0, pending = 0, completed = 0, revenue = 0;
            if (snapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#666; padding: 30px;">No bookings for today.</td></tr>`;
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
                    <td><span class="status-pill ${item.status === 'completed'? 'status-completed' : 'status-pending'}">${item.status}</span></td>
                    ${role === 'admin'? `<td><button class="cancel-btn" data-id="${docSnap.id}" style="background:#ff4757; border:none; color:white; padding:6px 10px; border-radius:8px; cursor:pointer;">Cancel</button></td>` : '<td>-</td>'}
                `;
                tableBody.appendChild(tr);
            });
            document.querySelectorAll('.cancel-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.target.dataset.id;
                    if(confirm("Cancel this booking?")) await removeDoc(dbDoc(db, "bookings", id));
                }
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
    function escapeHtml(str) { if (!str) return ''; return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
});
