document.addEventListener('DOMContentLoaded', () => {
    // Safety check for global Firebase bindings
    if (!window.firebaseAuth || !window.firebaseDB) return;

    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; 
    const dbGet = window.dbGet;
    const addDoc = window.addDoc; 
    const collection = window.collection;
    const onSnapshot = window.onSnapshot; 
    const query = window.query;
    const where = window.where; 
    const orderBy = window.orderBy;
    const serverTimestamp = window.serverTimestamp;
    const signOut = window.logOut;

    // DOM Elements
    const salonList = document.getElementById('salonList');
    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const adminBtn = document.getElementById('adminBtn');
    const adminBtnMobile = document.getElementById('adminBtnMobile');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('searchBtn');
    const bookingsToday = document.getElementById('bookingsToday');

    let selectedSalonId = null;
    let selectedSalonData = null;
    let allSalons = [];
    let isBookingCountListening = false;

    // ========== AUDIO & HAPTIC FEEDBACK ==========
    const clickSound = document.getElementById('clickSound');
    if (clickSound) clickSound.volume = 0.4;

    function playClick() {
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => {});
        }
        if (navigator.vibrate) navigator.vibrate(40);
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('button, .nav-item, .primary-btn, .secondary-btn')) {
            playClick();
        }
    });

    // Set minimum date input to today
    const custDateInput = document.getElementById('custDate');
    if (custDateInput) {
        custDateInput.min = new Date().toISOString().split('T')[0];
    }

    // ========== 1. AUTHENTICATION & ROLE MANAGEMENT ==========
    onAuthState(auth, async (user) => {
        if (user) {
            if (logoutBtn) logoutBtn.style.display = 'flex';
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) {
                    const role = userSnap.data().role;
                    if (role === 'admin' || role === 'salon_owner') {
                        if (adminBtn) {
                            adminBtn.style.display = 'flex';
                            adminBtn.onclick = () => {
                                window.location.href = (role === 'admin') ? 'admin.html' : 'owners.html';
                            };
                        }
                        if (adminBtnMobile) adminBtnMobile.style.display = 'flex';
                    }
                }
            } catch (err) {
                console.error("Profile retrieval error:", err);
            }
        } else {
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminBtnMobile) adminBtnMobile.style.display = 'none';
        }
    });

    // ========== 2. LOAD SALONS IN REAL-TIME ==========
    const salonsQuery = query(collection(db, "salons"), orderBy("name"));
    onSnapshot(salonsQuery, (snapshot) => {
        allSalons = [];
        salonList.innerHTML = "";

        if (snapshot.empty) {
            salonList.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">No registered salons found.</p>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const salon = { id: docSnap.id, ...docSnap.data() };
            allSalons.push(salon);
            renderSalon(salon);
        });

        if (!isBookingCountListening) {
            listenToTodayBookingCount();
            isBookingCountListening = true;
        }
    }, (error) => {
        console.error("Salons real-time error:", error);
        salonList.innerHTML = `<p style="text-align:center; color:#FF4444; padding:20px;">Unable to load salons right now.</p>`;
    });

    function renderSalon(salon) {
        const noOwner = !salon.ownerId;
        const card = document.createElement('div');
        card.className = 'glass-card salon-card';
        card.innerHTML = `
            <h3>${salon.name || 'Unnamed Salon'}</h3>
            <p><i class='bx bx-map'></i> ${salon.location || 'Soweto'}</p>
            <p><i class='bx bx-time'></i> ${salon.hours || '9AM - 6PM'}</p>
            ${noOwner ? `<small style="color:#FF4444; display:block; margin-bottom:8px;">⚠️ Salon currently unassigned</small>` : ''}
            <button class="primary-btn bookBtn" data-id="${salon.id}" ${noOwner ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                Book Appointment
            </button>
        `;
        salonList.appendChild(card);
    }

    // ========== 3. SEARCH FILTER ==========
    if (searchBtn && searchBar) {
        searchBtn.onclick = () => {
            const term = searchBar.value.trim().toLowerCase();
            salonList.innerHTML = "";
            const filtered = allSalons.filter(s => 
                (s.name && s.name.toLowerCase().includes(term)) || 
                (s.location && s.location.toLowerCase().includes(term))
            );
            
            if (filtered.length === 0) {
                salonList.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">No salons match "${term}".</p>`;
                return;
            }
            
            filtered.forEach(renderSalon);
        };
    }

    // ========== 4. OPEN BOOKING MODAL ==========
    salonList.addEventListener('click', (e) => {
        const bookBtn = e.target.closest('.bookBtn');
        if (bookBtn) {
            if (bookBtn.disabled) return;
            if (!auth.currentUser) { 
                alert("Please sign in first to complete a booking."); 
                window.location.href = 'index.html'; 
                return; 
            }
            
            selectedSalonId = bookBtn.dataset.id;
            selectedSalonData = allSalons.find(s => s.id === selectedSalonId);
            
            if (bookingModal) {
                bookingModal.style.display = 'block';
                bookingModal.classList.add('active');
            }
        }
    });

    // ========== 5. SUBMIT BOOKING FORM ==========
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!auth.currentUser) return alert("Session expired. Please log in again.");
            if (!selectedSalonData) return alert("Selected salon data is missing.");

            const serviceVal = document.getElementById('serviceType').value;
            if (!serviceVal) return alert("Please choose a service.");

            let serviceName = serviceVal;
            let price = 0;

            if (serviceVal.includes(' — R')) {
                const parts = serviceVal.split(' — R');
                serviceName = parts[0];
                price = Number(parts[1]) || 0;
            }

            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            try {
                await addDoc(collection(db, "bookings"), {
                    userId: auth.currentUser.uid,
                    ownerId: selectedSalonData.ownerId || "",
                    salonId: selectedSalonId,
                    salon: selectedSalonData.name || "Kasi Salon",
                    customerName: document.getElementById('custName').value.trim(),
                    phone: document.getElementById('custPhone').value.trim(),
                    service: serviceName,
                    price: price,
                    status: "pending",
                    date: document.getElementById('custDate').value,
                    time: document.getElementById('custTime').value,
                    createdAt: serverTimestamp()
                });

                alert("✅ Booking request submitted! The salon owner will confirm shortly.");
                if (bookingModal) {
                    bookingModal.style.display = 'none';
                    bookingModal.classList.remove('active');
                }
                bookingForm.reset();
            } catch (err) {
                console.error("Booking submission error:", err);
                alert("Booking failed: " + err.message);
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // ========== 6. SINGLETON TODAY'S BOOKINGS COUNTER ==========
    function listenToTodayBookingCount() {
        if (!bookingsToday) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const countQuery = query(collection(db, "bookings"), where("date", "==", todayStr));
        
        onSnapshot(countQuery, (snap) => {
            bookingsToday.textContent = `${snap.size} booking${snap.size === 1 ? '' : 's'} today`;
        }, (err) => console.error("Count query error:", err));
    }

    // ========== 7. LOGOUT FUNCTIONALITY ==========
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            signOut(auth).then(() => window.location.href = 'index.html');
        };
    }

    // ========== 8. COOKIE BANNER LOGIC ==========
    const banner = document.getElementById('cookieBanner');
    const acceptAll = document.getElementById('acceptAllCookies');
    const essential = document.getElementById('essentialCookies');
    const closeBtn = document.getElementById('cookieClose');

    const cookieChoice = localStorage.getItem('kasiCookieChoice');
    if (!cookieChoice && banner) {
        setTimeout(() => { banner.style.display = 'flex'; }, 1200);
    }

    function saveChoice(choice) {
        playClick();
        localStorage.setItem('kasiCookieChoice', choice);
        if (banner) banner.style.display = 'none';
    }

    acceptAll?.addEventListener('click', () => saveChoice('all'));
    essential?.addEventListener('click', () => saveChoice('essential'));
    closeBtn?.addEventListener('click', () => saveChoice('essential'));
});
