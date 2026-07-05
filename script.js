document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; const dbGet = window.dbGet;
    const addDoc = window.addDoc; const collection = window.collection;
    const onSnapshot = window.onSnapshot; const query = window.query; const where = window.where;

    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const bookingsTodayEl = document.getElementById('bookingsToday');

    let activeSalonName = "";
    let activeSalonUid = "";
    let currentClientUid = null;
    let cachedUserRole = "customer";

    onAuthState(auth, async (user) => {
        if (user) {
            currentClientUid = user.uid;
            if (logoutBtn) logoutBtn.style.display = 'block';
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    cachedUserRole = userData.role;
                    if (cachedUserRole === 'salon_owner' || cachedUserRole === 'admin') {
                        if (adminBtn) {
                            adminBtn.style.display = 'block';
                            adminBtn.querySelector('span').textContent = cachedUserRole === 'admin'? 'Admin' : 'Dashboard';
                        }
                    }
                }
            } catch (err) { console.error("Auth error:", err); }
        } else {
            currentClientUid = null; cachedUserRole = "customer";
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
        }
    });

    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            if (cachedUserRole === 'admin') window.location.href = 'admin.html';
            else if (cachedUserRole === 'salon_owner') window.location.href = 'owners.html';
            else window.location.href = 'salons.html';
        });
    }
    if (logoutBtn) logoutBtn.addEventListener('click', () => { window.logOut(auth); });

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.openBooking');
        if (!trigger) return;
        if (!currentClientUid) { alert('Please log in first.'); window.location.href = 'index.html'; return; }
        activeSalonName = trigger.getAttribute('data-salon');
        activeSalonUid = trigger.getAttribute('data-salon-uid');
        if (bookingModal) bookingModal.classList.add('active');
    });

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentClientUid) { alert('Session expired.'); window.location.href = 'index.html'; return; }
            const rawService = document.getElementById('serviceType').value;
            const nameValue = document.getElementById('custName').value.trim();
            const phoneValue = document.getElementById('custPhone').value.trim();
            const timeValue = document.getElementById('custTime').value;
            const todayDateStr = new Date().toISOString().split('T')[0];
            const priceMatch = rawService.match(/R(\d+)/);
            const isolatedPrice = priceMatch? priceMatch[1] : "0";
            const bookingPayload = {
                c: currentClientUid, s: activeSalonUid, salon: activeSalonName,
                name: nameValue, phone: phoneValue, service: rawService, price: isolatedPrice,
                time: timeValue, date: todayDateStr, status: "pending"
            };
            try {
                await addDoc(collection(db, "bookings"), bookingPayload);
                alert(`Success! Booked with ${activeSalonName} ✂️`);
                if (bookingModal) bookingModal.classList.remove('active');
                bookingForm.reset();
            } catch (err) { alert('Booking failed: ' + err.message); }
        });
    }

    if (bookingsTodayEl) {
        const todayStr = new Date().toISOString().split('T')[0];
        onSnapshot(collection(db, "bookings"), (snapshot) => {
            let activeTodayCount = 0;
            snapshot.forEach((doc) => { if (doc.data().date === todayStr) activeTodayCount++; });
            bookingsTodayEl.textContent = `${activeTodayCount} appointments scheduled today`;
        }, () => { bookingsTodayEl.textContent = "Book your clean trim today!"; });
    }

    // NEW: Live shop status updater
    onSnapshot(collection(db, "shopStatus"), (snap) => {
        snap.forEach(docSnap => {
            const status = docSnap.data().status.toLowerCase();
            const id = docSnap.id;
            let badgeId = '';
            if(id === 'VaalFreshBarberOwnerXYZ12345') badgeId = 'status-vaal';
            if(id === 'D40CutzOwnerABC98765') badgeId = 'status-d40';
            const badge = document.getElementById(badgeId);
            if(badge) badge.className = `status-badge ${status}`;
        })
    })
});
