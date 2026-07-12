document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; const dbGet = window.dbGet;
    const addDoc = window.addDoc; const collection = window.collection;
    const onSnapshot = window.onSnapshot; const query = window.query; const orderBy = window.orderBy; const where = window.where;
    const setDoc = window.dbSet;
    const updateDoc = window.updateDoc;

    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const bookingsTodayEl = document.getElementById('bookingsToday');
    const salonList = document.getElementById('salonList');
    const bookingsList = document.getElementById('bookingsList');

    // FAST SOUNDS
    const notifySound = new Audio('notify.mp3');
    const successSound = new Audio('success.mp3');
    notifySound.volume = 0.4;
    notifySound.preload = 'auto';
    notifySound.playbackRate = 1.3; // 30% FASTER

    successSound.volume = 0.5;
    successSound.preload = 'auto';
    successSound.playbackRate = 1.2; // 20% FASTER

    let audioUnlocked = false;
    const unlockAudio = () => {
        if(!audioUnlocked) {
            notifySound.play().then(() => {notifySound.pause(); notifySound.currentTime = 0;}).catch(()=>{});
            successSound.play().then(() => {successSound.pause(); successSound.currentTime = 0;}).catch(()=>{});
            audioUnlocked = true;
        }
    }
    document.addEventListener('click', unlockAudio, { once: true });

    let activeSalonName = ""; let activeSalonUid = ""; let currentClientUid = null; let cachedUserRole = "customer";

    onAuthState(auth, async (user) => {
        if (user) {
            currentClientUid = user.uid;
            if (logoutBtn) logoutBtn.style.display = 'block';
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) { cachedUserRole = userSnap.data().role; }
                else { await setDoc(dbDoc(db, "users", user.uid), { email: user.email, role: "customer", createdAt: new Date() }); }

                if (adminBtn) {
                    adminBtn.style.display = 'block';
                    const spanEl = adminBtn.querySelector('span');
                    if(spanEl) spanEl.textContent = cachedUserRole === 'admin'? 'Admin' : 'Dashboard';
                }
            } catch(err) { console.error(err) }
        } else {
            currentClientUid = null; cachedUserRole = "customer";
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
        }
    });

    if(salonList) {
        const q = query(collection(db, "salons"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            salonList.innerHTML = "";
            if(snapshot.empty) { if(bookingsTodayEl) bookingsTodayEl.textContent = "No salons yet. Contact admin."; return; }
            if(bookingsTodayEl) bookingsTodayEl.textContent = `${snapshot.size} salons available`;
            snapshot.forEach(docSnap => {
                const s = docSnap.data(); const salonId = docSnap.id;
                salonList.innerHTML += `
                    <div class="glass-card salon-card">
                        <div class="card-media">
                            <span class="status-badge ${s.status}">${s.status}</span>
                            <img src="${s.image}" alt="${s.name}" class="salon-img" onerror="this.src='https://via.placeholder.com/400x220/1a1a2e/008CFF?text=Kasi+Web'">
                            <div class="img-overlay"></div>
                        </div>
                        <div class="card-content">
                            <h2>${s.name}</h2>
                            <p><i class='bx bx-time'></i> ${s.hours}</p>
                            <p><i class='bx bx-map'></i> ${s.location}</p>
                            <p><i class='bx bx-cut'></i> ${s.services}</p>
                            <p id="queue-${salonId}" class="queue-count"><i class='bx bx-group'></i> Loading queue...</p>
                            <button class="primary-btn openBooking" data-salon="${s.name}" data-salon-uid="${salonId}">Book Appointment</button>
                        </div>
                    </div>`;
                const bookingQuery = query(collection(db, "bookings"), where("s", "==", salonId), where("status", "in", ["pending", "approved"]));
                onSnapshot(bookingQuery, (bookSnap) => {
                    const countEl = document.getElementById(`queue-${salonId}`);
                    if(countEl) countEl.innerHTML = `<i class='bx bx-group'></i> ${bookSnap.size} people in queue`;
                });
            });
        });
    }

    document.addEventListener('click', (e) => {
        unlockAudio();
        const trigger = e.target.closest('.openBooking');
        if (!trigger) return;
        if (!currentClientUid) { alert('Please log in first.'); window.location.href = 'index.html'; return; }
        activeSalonName = trigger.dataset.salon; activeSalonUid = trigger.dataset.salonUid;
        if(bookingModal) bookingModal.classList.add('active');
    });

    if (bookingForm) bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bookingPayload = {
            c: currentClientUid, s: activeSalonUid, salon: activeSalonName,
            name: document.getElementById('custName').value, phone: document.getElementById('custPhone').value,
            service: document.getElementById('serviceType').value, time: document.getElementById('custTime').value,
            date: new Date().toISOString().split('T')[0], status: "pending"
        };
        await addDoc(collection(db, "bookings"), bookingPayload);
        notifySound.currentTime = 0; // RESET
        notifySound.play().catch(e => console.log("Booking sound error:", e)); // INSTANT
        alert(`Booked with ${activeSalonName}!`);
        if(bookingModal) bookingModal.classList.remove('active'); bookingForm.reset();
    });

    if(bookingModal) bookingModal.addEventListener('click', (e) => { if(e.target.classList.contains('modal-overlay')) bookingModal.classList.remove('active'); })

    if(bookingsList) {
        const q = query(collection(db, "bookings"), orderBy("date", "desc"));
        onSnapshot(q, (snapshot) => {
            bookingsList.innerHTML = "";
            if(snapshot.empty) { bookingsList.innerHTML = "<p style='text-align:center; color:#B0B0D0;'>No bookings yet</p>"; return; }
            snapshot.forEach(docSnap => {
                const b = docSnap.data(); const bookingId = docSnap.id;
                bookingsList.innerHTML += `
                    <div class="booking-item glass-card">
                        <p><b>${b.name}</b> - ${b.salon}</p>
                        <p style="font-size:0.85rem; color:#B0B0D0;">${b.service} at ${b.time} on ${b.date}</p>
                        <p style="font-size:0.85rem;"><i class='bx bx-phone'></i> ${b.phone}</p>
                        <span class="status-badge ${b.status}">${b.status}</span>
                        <div style="margin-top:10px;">
                            <button class="secondary-btn approveBtn" data-id="${bookingId}">Approve</button>
                            <button class="secondary-btn rejectBtn" data-id="${bookingId}" style="background:#ff4d4d; margin-left:8px;">Reject</button>
                            <button class="secondary-btn doneBtn" data-id="${bookingId}" style="background:#00c853; margin-left:8px;">Done</button>
                        </div>
                    </div>`;
            });
        });
        bookingsList.addEventListener('click', async (e) => {
            unlockAudio();
            const approveBtn = e.target.closest('.approveBtn');
            const rejectBtn = e.target.closest('.rejectBtn');
            const doneBtn = e.target.closest('.doneBtn');
            if(approveBtn) {
                await updateDoc(dbDoc(db, "bookings", approveBtn.dataset.id), { status: "approved" });
                successSound.currentTime = 0; successSound.play().catch(()=>{});
            }
            if(rejectBtn) { await updateDoc(dbDoc(db, "bookings", rejectBtn.dataset.id), { status: "rejected" }); }
            if(doneBtn) {
                await updateDoc(dbDoc(db, "bookings", doneBtn.dataset.id), { status: "done" });
                successSound.currentTime = 0; successSound.play().catch(()=>{});
            }
        });
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
        if(btn.querySelector('span')?.textContent === 'Home') {
            btn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'index.html'; })
        }
    })

    if (adminBtn) adminBtn.addEventListener('click', () => {
        if(cachedUserRole === 'admin') window.location.href = 'admin.html';
        else if(cachedUserRole === 'salon_owner') window.location.href = 'owners.html';
        else window.location.href = 'salons.html';
    });
    if (logoutBtn) logoutBtn.addEventListener('click', () => { unlockAudio(); window.logOut(auth) });
});
