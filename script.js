document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; const dbGet = window.dbGet;
    const addDoc = window.addDoc; const collection = window.collection;
    const onSnapshot = window.onSnapshot; const query = window.query; const orderBy = window.orderBy;

    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const bookingsTodayEl = document.getElementById('bookingsToday');
    const salonForm = document.getElementById('salonForm');
    const salonList = document.getElementById('salonList');
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('imagePreview');
    const addSalonSection = document.getElementById('addSalonSection');

    let activeSalonName = "";
    let activeSalonUid = "";
    let currentClientUid = null;
    let cachedUserRole = "customer";

    // AUTH
    onAuthState(auth, async (user) => {
        if (user) {
            currentClientUid = user.uid;
            if (logoutBtn) logoutBtn.style.display = 'block';
            const userSnap = await dbGet(dbDoc(db, "users", user.uid));
            if (userSnap.exists()) {
                cachedUserRole = userSnap.data().role;
                if (addSalonSection && cachedUserRole === 'admin') addSalonSection.style.display = 'block';
                if (adminBtn) {
                    adminBtn.style.display = 'block';
                    adminBtn.querySelector('span').textContent = cachedUserRole === 'admin'? 'Admin' : 'Dashboard';
                }
            }
        } else {
            currentClientUid = null; cachedUserRole = "customer";
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            if (addSalonSection) addSalonSection.style.display = 'none';
        }
    });

    // IMAGE PREVIEW
    if(imageInput) imageInput.addEventListener("input", function() {
        imagePreview.src = this.value;
        imagePreview.style.display = this.value ? "block" : "none";
    });

    // ADD SALON - ADMIN ONLY
    if(salonForm) salonForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if(cachedUserRole !== 'admin') return alert("Only Admin can add salons");
        const salonData = {
            name: document.getElementById("name").value,
            image: document.getElementById("image").value, // SAVED AS image
            location: document.getElementById("location").value,
            hours: document.getElementById("hours").value,
            services: document.getElementById("services").value,
            status: "open",
            createdAt: new Date()
        };
        await addDoc(collection(db, "salons"), salonData);
        alert("Salon Added!");
        salonForm.reset();
        imagePreview.style.display = "none";
    });

    // LIST SALONS - WITH IMAGE
    if(salonList) {
        const q = query(collection(db, "salons"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            salonList.innerHTML = "";
            if(snapshot.empty) {bookingsTodayEl.textContent = "No salons yet. Contact admin."; return;}
            bookingsTodayEl.textContent = `${snapshot.size} salons available`;
            snapshot.forEach(docSnap => {
                const s = docSnap.data();
                salonList.innerHTML += `
                    <div class="glass-card salon-card">
                        <div class="card-media">
                            <span class="status-badge ${s.status}">${s.status}</span>
                            <img src="${s.image}" alt="${s.name}" class="salon-img"> <!-- READS s.image -->
                            <div class="img-overlay"></div>
                        </div>
                        <div class="card-content">
                            <h2>${s.name}</h2>
                            <p><i class='bx bx-time'></i> ${s.hours}</p>
                            <p><i class='bx bx-map'></i> ${s.location}</p>
                            <p><i class='bx bx-cut'></i> ${s.services}</p>
                            <button class="primary-btn openBooking" data-salon="${s.name}" data-salon-uid="${docSnap.id}">Book Appointment</button>
                        </div>
                    </div>`;
            });
        });
    }

    // BOOKING
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.openBooking');
        if (!trigger) return;
        if (!currentClientUid) { alert('Please log in first.'); window.location.href = 'index.html'; return; }
        activeSalonName = trigger.dataset.salon;
        activeSalonUid = trigger.dataset.salonUid;
        bookingModal.classList.add('active');
    });

    if (bookingForm) bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bookingPayload = {
            c: currentClientUid, 
            s: activeSalonUid,
            salon: activeSalonName,
            name: document.getElementById('custName').value,
            phone: document.getElementById('custPhone').value,
            service: document.getElementById('serviceType').value,
            time: document.getElementById('custTime').value,
            date: new Date().toISOString().split('T')[0],
            status: "pending"
        };
        await addDoc(collection(db, "bookings"), bookingPayload);
        alert(`Booked with ${activeSalonName}!`);
        bookingModal.classList.remove('active');
        bookingForm.reset();
    });

    if (adminBtn) adminBtn.addEventListener('click', () => window.location.href = 'admin.html');
    if (logoutBtn) logoutBtn.addEventListener('click', () => window.logOut(auth));
});
