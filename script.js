document.addEventListener('DOMContentLoaded', () => {

    // 0. INITIALIZE AUTOMATIC PICTURE SWIPER
    if (typeof Swiper !== 'undefined' && document.querySelector('.elite-swiper')) {
        new Swiper('.elite-swiper', {
            loop: true,
            speed: 800,
            autoplay: {
                delay: 2200, // Slides automatically every 2.2 seconds without touching
                disableOnInteraction: false, // Continues auto-swiping after manual user interaction
                pauseOnMouseEnter: false
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
        });
    }

    /* WORD ANIMATION */
    const words = ["Fresh Cuts", "No Lines", "Kasi Prices"];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typedText = document.getElementById("typed-text");

    function type() {
        if (!typedText) return;
        const currentWord = words[wordIndex];

        if (isDeleting) {
            typedText.textContent = currentWord.substring(0, charIndex--);
        } else {
            typedText.textContent = currentWord.substring(0, charIndex++);
        }

        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            setTimeout(type, 1500);
            return;
        }

        if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
        }

        setTimeout(type, isDeleting ? 80 : 120);
    }

    type();

    // 1. SAFE ACCESS TO GLOBAL FIREBASE UTILITIES
    if (!window.firebaseAuth || !window.firebaseDB) {
        console.error("Firebase services not found on window object.");
        return;
    }

    const { 
        firebaseAuth: auth, 
        firebaseDB: db, 
        onAuthState, 
        dbDoc, 
        dbGet, 
        addDoc, 
        collection, 
        onSnapshot, 
        query, 
        where, 
        orderBy, 
        serverTimestamp, 
        logOut: signOut 
    } = window;

    // DOM ELEMENTS
    const salonList = document.getElementById('salonList');
    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('searchBtn');
    const bookingsToday = document.getElementById('bookingsToday');
    const custDateInput = document.getElementById('custDate');

    let selectedSalonId = null;
    let selectedSalonData = null;
    let allSalons = [];

    // AUDIO & HAPTIC FEEDBACK
    const clickSound = document.getElementById('clickSound');
    if (clickSound) clickSound.volume = 0.4;
    
    function playClick() {
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => {});
        }
        if (navigator.vibrate) navigator.vibrate(30);
    }

    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            playClick();
        }
    });

    if (custDateInput) {
        custDateInput.min = new Date().toISOString().split('T')[0];
    }

    // 2. AUTHENTICATION STATE & ROLE ROUTING
    onAuthState(auth, async (user) => {
        if (user) {
            if (logoutBtn) logoutBtn.style.display = 'flex';
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) {
                    const role = userSnap.data().role;
                    if ((role === 'admin' || role === 'salon_owner') && adminBtn) {
                        adminBtn.style.display = 'flex';
                        adminBtn.onclick = () => {
                            window.location.href = role === 'admin' ? 'admin.html' : 'owners.html';
                        };
                    }
                }
            } catch (e) { 
                console.error("User document fetch error:", e); 
            }
        } else {
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
        }
    });

    // 3. LOAD & RENDER SALONS
    const qSalons = query(collection(db, "salons"), orderBy("name"));
    
    onSnapshot(qSalons, (snapshot) => {
        allSalons = [];
        if (!salonList) return;
        salonList.innerHTML = "";

        if (snapshot.empty) {
            salonList.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color:#888;">
                    <i class='bx bx-store-alt' style='font-size: 3rem; margin-bottom: 10px;'></i>
                    <p style="font-size: 1.1rem; font-weight: 600;">No salons registered yet</p>
                    <p style="font-size: 0.9rem;">The salons collection is empty.</p>
                </div>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const salon = { 
                id: docSnap.id, 
                salonId: data.salonId || docSnap.id,
                ownerId: data.ownerId || data.OwnerId || null,
                ...data 
            };
            allSalons.push(salon);
            renderSalon(salon);
        });

        updateBookingCount();

    }, (error) => {
        console.error("Firestore Salons Error:", error);
        if (salonList) {
            salonList.innerHTML = `
                <div style="text-align:center; padding: 30px; color:#ff4757;">
                    <i class='bx bx-error-circle' style='font-size: 2.5rem;'></i>
                    <p style="margin-top:10px; font-weight:bold;">Failed to load salons</p>
                    <small style="color:#aaa;">${escapeHtml(error.message)}</small>
                </div>`;
        }
    });

    function renderSalon(salon) {
        const noOwner = !salon.ownerId;
        const card = document.createElement('div');
        card.className = 'glass-card salon-card';
        card.innerHTML = `
            <h3>${escapeHtml(salon.name)}</h3>
            <p><i class='bx bx-map'></i> ${escapeHtml(salon.location || 'Soweto')}</p>
            <p><i class='bx bx-time'></i> ${escapeHtml(salon.hours || '9AM - 6PM')}</p>
            ${noOwner ? `<small style="color:#ff4757; display:block; margin-bottom:8px;">⚠️ Not available for booking</small>` : ''}
            <button class="primary-btn bookBtn" data-id="${salon.id}" ${noOwner ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Book Now</button>
        `;
        salonList.appendChild(card);
    }

    // 4. SEARCH FUNCTIONALITY
    if (searchBtn && searchBar) {
        searchBtn.onclick = () => {
            const term = searchBar.value.toLowerCase().trim();
            if (!salonList) return;
            salonList.innerHTML = "";
            
            const filtered = allSalons.filter(s => 
                s.name?.toLowerCase().includes(term) || 
                s.location?.toLowerCase().includes(term)
            );

            if (filtered.length === 0) {
                salonList.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">No salons matching "${escapeHtml(term)}"</p>`;
                return;
            }

            filtered.forEach(renderSalon);
        };
    }

    // 5. OPEN & CLOSE BOOKING MODAL
    if (salonList) {
        salonList.addEventListener('click', (e) => {
            const bookBtn = e.target.closest('.bookBtn');
            if (bookBtn) {
                if (bookBtn.disabled) return;
                if (!auth.currentUser) { 
                    alert("Please login first to book an appointment."); 
                    window.location.href = 'index.html'; 
                    return; 
                }
                selectedSalonId = bookBtn.dataset.id;
                selectedSalonData = allSalons.find(s => s.id === selectedSalonId);
                
                if (bookingModal) bookingModal.classList.add('active');
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (bookingModal) bookingModal.classList.remove('active');
        });
    }

    // 6. SUBMIT BOOKING
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!auth.currentUser || !selectedSalonData) return;

            const serviceElem = document.getElementById('serviceType');
            const serviceVal = serviceElem ? serviceElem.value : '';
            
            let service = serviceVal;
            let price = 0;
            if (serviceVal.includes('— R')) {
                const parts = serviceVal.split('— R');
                service = parts[0].trim();
                price = Number(parts[1]) || 0;
            }

            try {
                await addDoc(collection(db, "bookings"), {
                    userId: auth.currentUser.uid,
                    ownerId: selectedSalonData.ownerId,
                    salonId: selectedSalonId,
                    salon: selectedSalonData.name,
                    name: document.getElementById('custName')?.value || '',
                    phone: document.getElementById('custPhone')?.value || '',
                    service: service,
                    price: price,
                    status: "pending",
                    date: document.getElementById('custDate')?.value || '',
                    time: document.getElementById('custTime')?.value || '',
                    createdAt: serverTimestamp()
                });

                alert("Booking placed! Owner will approve soon 💈");
                if (bookingModal) bookingModal.classList.remove('active');
                bookingForm.reset();
            } catch (err) {
                console.error("Booking error:", err);
                alert("Booking failed: " + err.message);
            }
        });
    }

    // 7. TODAY'S BOOKING COUNTER
    function updateBookingCount() {
        if (!bookingsToday) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const qBookings = query(collection(db, "bookings"), where("date", "==", todayStr));
        
        onSnapshot(qBookings, (snap) => {
            bookingsToday.textContent = `${snap.size} bookings today`;
        }, (err) => {
            console.error("Booking count error:", err);
        });
    }

    // 8. LOGOUT ACTION
    if (logoutBtn) {
        logoutBtn.onclick = () => signOut(auth).then(() => window.location.href = 'index.html');
    }

    // 9. COOKIE & CONSENT BANNER LOGIC
    const banner = document.getElementById('cookieBanner');
    const acceptAll = document.getElementById('acceptAllCookies');
    const essential = document.getElementById('essentialCookies');
    const closeBtn = document.getElementById('cookieClose');
    const subBtn = document.getElementById('subscribe-btn');

    const cookieChoice = localStorage.getItem('kasiCookieChoice');
    if (!cookieChoice && banner) {
        setTimeout(() => { banner.style.display = 'flex'; }, 1000);
    }

    function saveChoice(choice) {
        playClick();
        localStorage.setItem('kasiCookieChoice', choice);
        if (banner) banner.style.display = 'none';
    }

    acceptAll?.addEventListener('click', () => {
        saveChoice('all');
        if (window.OneSignalDeferred) {
            OneSignalDeferred.push(async function (OneSignal) {
                try {
                    await OneSignal.showNativePrompt();
                    await OneSignal.registerForPushNotifications();
                } catch (error) {
                    console.error("Notification permission error:", error);
                }
            });
        }
    });

    essential?.addEventListener('click', () => saveChoice('essential'));
    closeBtn?.addEventListener('click', () => saveChoice('essential'));

    subBtn?.addEventListener('click', () => {
        const choice = localStorage.getItem('kasiCookieChoice');
        if (choice !== 'all') {
            alert('Please accept all cookies first to enable notifications 🍪');
            if (banner) banner.style.display = 'flex';
            return;
        }

        if (window.OneSignalDeferred) {
            OneSignalDeferred.push(async function (OneSignal) {
                try {
                    await OneSignal.showNativePrompt();
                } catch (error) {
                    console.error("Notification prompt error:", error);
                }
            });
        }
    });

    function escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
