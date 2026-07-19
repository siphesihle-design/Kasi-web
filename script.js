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
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('searchBtn');

    // FAST SOUNDS
    const notifySound = new Audio('notify.mp3');
    const successSound = new Audio('success.mp3');
    notifySound.volume = 0.4; notifySound.preload = 'auto'; notifySound.playbackRate = 1.3;
    successSound.volume = 0.5; successSound.preload = 'auto'; successSound.playbackRate = 1.2;

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
    let allSalons = []; // For search

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
                    if(spanEl) spanEl.textContent = cachedUserRole === 'admin'? 'Admin' : cachedUserRole === 'salon_owner'? 'Dashboard' : 'My Bookings';
                }
            } catch(err) { console.error(err) }
        } else {
            currentClientUid = null; cachedUserRole = "customer";
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            // FIX: if on salons page and not logged in, kick to LOGIN
            if(window.location.pathname.includes('salons.html')) window.location.href = 'home.html';
        }
    });

    // REAL OPEN/CLOSE TIME CHECK
    function isOpenNow(hours) {
        try {
            if(!hours) return false;
            const now = new Date();
            const currentHour = now.getHours();
            const match = hours.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)?\s*-\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)?/i);
            if(!match) return true;

            let open = parseInt(match[1]);
            let close = parseInt(match[3]);
            if(match[2]?.toLowerCase() === 'pm' && open!== 12) open += 12;
            if(match[4]?.toLowerCase() === 'pm' && close!== 12) close += 12;
            if(close < open) close += 24;

            let adjustedHour = currentHour;
            if(adjustedHour < open && close > 24) adjustedHour += 24;

            return adjustedHour >= open && adjustedHour < close;
        } catch { return false; }
    }

    // RENDER SALONS FUNCTION
    function renderSalons(salons) {
        salonList.innerHTML = "";
        if(salons.length === 0) { bookingsTodayEl.textContent = "No salons found"; return; }
        bookingsTodayEl.textContent = `${salons.length} salons available`;

        salons.forEach(docSnap => {
            const s = docSnap.data(); const salonId = docSnap.id;
            const rating = s.rating || 0;
            const reviewCount = s.reviewCount || 0;
            const isOpen = isOpenNow(s.hours);
            const statusText = s.status === 'Busy'? 'Busy' : isOpen? 'Open' : 'Closed';

            salonList.innerHTML += `
                <div class="glass-card salon-card">
                    <div class="card-media">
                        <span class="status-badge ${statusText}">${statusText}</span>
                        ${isOpen && s.status!== 'Busy'? `<span class="status-badge" style="background:#00c853; right:85px; left:auto;">Open Now</span>` : ''}
                        <img src="${s.image}" alt="${s.name}" class="salon-img" loading="lazy" onerror="this.src='https://via.placeholder.com/400x220/1a1a2e/7B68EE?text=Kasi+Web'">
                        <div class="img-overlay"></div>
                    </div>
                    <div class="card-content">
                        <h2>${s.name} ${s.verified? `<i class='bx bxs-badge-check' style="color:#7B68EE;"></i>` : ''}</h2>
                        <p style="color:#FFD700;">⭐ ${rating.toFixed(1)} (${reviewCount} reviews)</p>
                        <p><i class='bx bx-time'></i> ${s.hours}</p>
                        <p><i class='bx bx-map'></i> ${s.location}</p>
                        <p><i class='bx bx-cut'></i> ${s.services}</p>
                        <p id="queue-${salonId}" class="queue-count"><i class='bx bx-group'></i> Loading queue...</p>

                        <div style="display:flex; gap:8px; margin-top:10px;">
                            <button class="primary-btn openBooking" data-salon="${s.name}" data-salon-uid="${salonId}" style="flex:2;" ${statusText === 'Closed'? 'disabled style="opacity:0.5;"' : ''}>Book</button>

                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.location + ', Soweto')}" target="_blank" class="secondary-btn" style="flex:1; text-align:center; padding:12px;">
                                <i class='bx bx-map'></i>
                            </a>

                            <button class="secondary-btn shareBtn" data-name="${s.name}" style="flex:1; text-align:center; padding:12px;">
                                <i class='bx bx-share-alt'></i>
                            </button>
                        </div>
                    </div>
                </div>`;

            const bookingQuery = query(collection(db, "bookings"), where("s", "==", salonId), where("status", "in", ["pending", "approved"]));
            onSnapshot(bookingQuery, (bookSnap) => {
                const countEl = document.getElementById(`queue-${salonId}`);
                if(countEl) countEl.innerHTML = `<i class='bx bx-group'></i> ${bookSnap.size} people in queue`;
            });
        });
    }

    // LIST SALONS
    if(salonList) {
        const q = query(collection(db, "salons"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            allSalons = [];
            snapshot.forEach(docSnap => allSalons.push(docSnap));
            renderSalons(allSalons);
        });
    }

    // SEARCH FUNCTION
    function doSearch() {
        const term = searchBar.value.toLowerCase().trim();
        if(term === "") { renderSalons(allSalons); return; }
        const filtered = allSalons.filter(docSnap => {
            const s = docSnap.data();
            return s.name.toLowerCase().includes(term) ||
                   s.location.toLowerCase().includes(term) ||
                   s.services.toLowerCase().includes(term);
        });
        renderSalons(filtered);
    }
    if(searchBtn) searchBtn.onclick = doSearch;
    if(searchBar) searchBar.onkeyup = (e) => { if(e.key === 'Enter') doSearch(); }

    // SHARE BUTTON
    document.addEventListener('click', (e) => {
        const shareBtn = e.target.closest('.shareBtn');
        if(!shareBtn) return;
        unlockAudio();
        const name = shareBtn.dataset.name;
        const url = window.location.origin;
        const text = `Check out ${name} on K@si Web - Book your cut, skip the queue! ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });

    // OPEN BOOKING MODAL
    document.addEventListener('click', (e) => {
        unlockAudio();
        const trigger = e.target.closest('.openBooking');
        if (!trigger) return;
        if (!currentClientUid) { alert('Please log in first.'); window.location.href = 'home.html'; return; } // FIX: to login
        activeSalonName = trigger.dataset.salon; activeSalonUid = trigger.dataset.salonUid;
        if(bookingModal) bookingModal.classList.add('active');
    });

    // BOOKING SUBMIT
    if (bookingForm) bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!document.getElementById('custName').value ||!document.getElementById('custPhone').value) {
            return alert("Please fill name and phone");
        }
        const bookingPayload = {
            c: currentClientUid,
            s: activeSalonUid,
            salon: activeSalonName,
            name: document.getElementById('custName').value,
            phone: document.getElementById('custPhone').value,
            service: document.getElementById('serviceType').value,
            time: document.getElementById('custTime').value,
            date: new Date().toISOString().split('T')[0],
            status: "pending",
            createdAt: new Date()
        };
        await addDoc(collection(db, "bookings"), bookingPayload);
        notifySound.currentTime = 0; notifySound.play().catch(e => console.log("Booking sound error:", e));
        successSound.play();
        alert(`Booked with ${activeSalonName}! We'll notify you.`);
        if(bookingModal) bookingModal.classList.remove('active'); bookingForm.reset();
    });

    if(bookingModal) bookingModal.addEventListener('click', (e) => { if(e.target.classList.contains('modal-overlay')) bookingModal.classList.remove('active'); })

    // ADMIN BTN ROUTING
    if (adminBtn) adminBtn.addEventListener('click', () => {
        if(cachedUserRole === 'admin') window.location.href = 'admin.html';
        else if(cachedUserRole === 'salon_owner') window.location.href = 'owners.html';
        else window.location.href = 'home.html'; // FIX: customers go to login/home
    });

    // LOGOUT GOES TO COVER
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        unlockAudio();
        sessionStorage.clear();
        window.logOut(auth).then(() => window.location.href = 'index.html') // FIX: to cover
    });
});
