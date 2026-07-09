document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; const dbGet = window.dbGet;
    const removeDoc = window.removeDoc; const collection = window.collection;
    const onSnapshot = window.onSnapshot; const query = window.query;
    const where = window.where; const orderBy = window.orderBy; const getDocs = window.getDocs;
    const setDoc = window.setDoc; const addDoc = window.addDoc;

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

    // COPY + USE IMAGE BUTTONS
    const copyBtn = document.getElementById('copyBtn');
    const useLinkBtn = document.getElementById('useLinkBtn');
    const quickLink = document.getElementById('quickLink');
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('imagePreview');
    const salonForm = document.getElementById('salonForm');

    if(copyBtn) copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(quickLink.value);
        copyBtn.innerHTML = "<i class='bx bx-check'></i> Copied";
        setTimeout(() => copyBtn.innerHTML = "<i class='bx bx-copy'></i>", 1500);
    });

    if(useLinkBtn) useLinkBtn.addEventListener('click', () => {
        imageInput.value = quickLink.value;
        imagePreview.src = quickLink.value;
        imagePreview.style.display = "block";
    });

    onAuthState(auth, async (user) => {
        if (user) {
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) {
                    currentUserRole = userSnap.data().role;
                    if (currentUserRole === 'admin') {
                        dashboardTitle.textContent = "Admin Dashboard - God Mode";
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

    // ADD SALON - FIXED FIELD NAMES
    if(salonForm) salonForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if(currentUserRole!== 'admin') return alert("Only Admin can add salons");
        const salonData = {
            name: document.getElementById("name").value,
            image: document.getElementById("image").value, // FIXED: was img
            location: document.getElementById("location").value,
            hours: document.getElementById("hours").value,
            services: document.getElementById("services").value, // FIXED: was desc
            status: "open",
            createdAt: new Date()
        };
        await addDoc(collection(db, "salons"), salonData);
        alert("Salon Added!");
        salonForm.reset();
        imagePreview.style.display = "none";
    });

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
