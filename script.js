document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return console.log("Firebase not loaded");

    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; const dbGet = window.dbGet;
    const addDoc = window.addDoc; const collection = window.collection;
    const onSnapshot = window.onSnapshot; const query = window.query; const orderBy = window.orderBy; const where = window.where;
    const setDoc = window.dbSet;

    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const bookingsTodayEl = document.getElementById('bookingsToday');
    const salonList = document.getElementById('salonList');
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('searchBtn');

    // SOUNDS FROM GITHUB
    const notifySound = new Audio('https://raw.githubusercontent.com/YOUR_USERNAME/kasi-web/main/notify.mp3');
    const successSound = new Audio('https://raw.githubusercontent.com/YOUR_USERNAME/kasi-web/main/success.mp3');
    notifySound.volume = 0.4; successSound.volume = 0.5;

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
    let allSalons = [];

    onAuthState(auth, async (user) => {
        if (user) {
            currentClientUid = user.uid;
            logoutBtn.style.display = 'flex';
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) { cachedUserRole = userSnap.data().role; }
                else { await setDoc(dbDoc(db, "users", user.uid), { email: user.email, role: "customer", createdAt: new Date() }); }

                // GUARD: Kick admins/owners out of customer page
                if (cachedUserRole === 'admin') { window.location.href = 'admin.html'; return; }
                if (cachedUserRole === 'salon_owner') { window.location.href = 'owners.html'; return; }

                adminBtn.style.display = 'flex';
                adminBtn.querySelector('span').textContent = 'My Bookings'; // customers only here
            } catch(err) { console.error(err) }
        } else {
            currentClientUid = null; cachedUserRole = "customer";
            logoutBtn.style.display = 'none';
            adminBtn.style.display = 'none';
            if(window.location.pathname.includes('salons.html')) window.location.href = 'index.html'; // FIXED
        }
    });

    function isOpenNow(hours) {
        try {
            if(!hours) return false;
            const now = new Date(); const currentHour = now.getHours();
            const match = hours.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)?\s*-\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)?/i);
            if(!match) return true;
            let open = parseInt(match[1]); let close = parseInt(match[3]);
            if(match[2]?.toLowerCase() === 'pm' && open!== 12) open += 12;
            if(match[4]?.toLowerCase() === 'pm' && close!== 12) close += 12;
            return currentHour >= open && currentHour < close;
        } catch { return true; }
    }

    function renderSalons(salons) {
        salonList.innerHTML = "";
        if(salons.length === 0) { bookingsTodayEl.textContent = "No salons found"; return; }
        bookingsTodayEl.textContent = `${salons.length} salons available`;

        salons.forEach(docSnap => {
            const s = docSnap.data(); const salonId = docSnap.id;
            const isOpen = isOpenNow(s.hours);
            const statusText = s.status === 'Busy'? 'Busy' : isOpen? 'Open' : 'Closed';

            salonList.innerHTML += `
                <div class="glass-card salon-card">
                    <div class="card-media">
                        <span class="status-badge ${statusText}">${statusText}</span>
                        <img src="${s.image}" alt="${s.name}" class="salon-img" loading="lazy" onerror="this.src='https://via.placeholder.com/400x220/1a1a2e/7B68EE?text=Kasi+Web'">
                        <div class="img-overlay"></div>
                    </div>
                    <div class="card-content">
                        <h2>${s.name} ${s.verified? `<i class='bx bxs-badge-check'></i>` : ''}</h2>
                        <p><i class='bx bx-time'></i> ${s.hours}</p>
                        <p><i class='bx bx-map'></i> ${s.location}</p>
                        <p><i class='bx bx-cut'></i> ${Array.isArray(s.services)? s.services.join(', ') : s.services}</p>
                        <p id="queue-${salonId}"><i class='bx bx-group'></i> Loading queue...</p>

                        <div style="display:flex; gap:8px; margin-top:10px;">
                            <button class="primary-btn openBooking" data-salon="${s.name}" data-salon-uid="${salonId}" style="flex:2;" ${statusText === 'Closed'? 'disabled style="opacity:0.5;"' : ''}>Book Now</button>
                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.location)}" target="_blank" class="secondary-btn" style="flex:1;"><i class='bx bx-map'></i></a>
                        </div>
                    </div>
                </div>`;

            // QUEUE COUNT - uses ownerId to match rules
            const bookingQuery = query(collection(db, "bookings"), where("ownerId", "==", s.ownerId), where("status", "in", ["pending", "approved"]));
            onSnapshot(bookingQuery, (bookSnap) => {
                const countEl = document.getElementById(`queue-${salonId}`);
                if(countEl) countEl.innerHTML = `<i class='bx bx-group'></i> ${bookSnap.size} in queue`;
            });
        });
    }

    // LIST SALONS
    const q = query(collection(db, "salons"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        allSalons = [];
        snapshot.forEach(docSnap => allSalons.push(docSnap));
        renderSalons(allSalons);
    });

    // SEARCH
    function doSearch() {
        const term = searchBar.value.toLowerCase().trim();
        if(term === "") { renderSalons(allSalons); return; }
        const filtered = allSalons.filter(docSnap => {
            const s = docSnap.data();
            return s.name.toLowerCase().includes(term) ||
                   s.location.toLowerCase().includes(term) ||
                   (Array.isArray(s.services)? s.services.join(' ') : s.services).toLowerCase().includes(term);
        });
        renderSalons(filtered);
    }
    searchBtn.onclick = doSearch;
    searchBar.onkeyup = (e) => { if(e.key === 'Enter') doSearch(); }

    // OPEN BOOKING MODAL
    document.addEventListener('click', (e) => {
        unlockAudio();
        const trigger = e.target.closest('.openBooking');
        if (!trigger) return;
        if (!currentClientUid) { alert('Please log in first.'); window.location.href = 'index.html'; return; } // FIXED
        activeSalonName = trigger.dataset.salon; activeSalonUid = trigger.dataset.salonUid;
        bookingModal.classList.add('active');
    });

    // BOOKING SUBMIT - MATCHES FIRESTORE RULES
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const service = document.getElementById('serviceType').value;
        const [serviceName, price] = service.split(' — R');

        const salonSnap = await dbGet(dbDoc(db, "salons", activeSalonUid));

        const bookingPayload = {
            userId: currentClientUid, // MATCHES RULES
            ownerId: salonSnap.data().ownerId, // MATCHES RULES
            salonId: activeSalonUid,
            salon: activeSalonName,
            name: document.getElementById('custName').value,
            phone: document.getElementById('custPhone').value,
            service: serviceName,
            price: Number(price),
            time: document.getElementById('custTime').value,
            date: new Date().toISOString().split('T')[0],
            status: "pending",
            createdAt: new Date()
        };

        try {
            await addDoc(collection(db, "bookings"), bookingPayload);
            notifySound.play();
            successSound.play();
            alert(`Booked with ${activeSalonName}!`);
            bookingModal.classList.remove('active'); bookingForm.reset();
        } catch(err) {
            alert("Booking failed: " + err.message)
        }
    });

    bookingModal.addEventListener('click', (e) => { if(e.target.classList.contains('modal-overlay')) bookingModal.classList.remove('active'); })

    // NAV ROUTING
    adminBtn.addEventListener('click', () => {
        if(cachedUserRole === 'admin') window.location.href = 'admin.html';
        else if(cachedUserRole === 'salon_owner') window.location.href = 'owners.html';
        else window.location.href = 'salons.html'; // should never hit this
    });

    logoutBtn.addEventListener('click', () => {
        unlockAudio();
        window.logOut(auth).then(() => window.location.href = 'index.html') // FIXED: cover -> index
    });
});
