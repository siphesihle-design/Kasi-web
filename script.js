document.addEventListener('DOMContentLoaded', () => {
    // Structural Guard Check: Verify window modules are loaded before booting up layout listeners
    if (!window.firebaseAuth) return;

    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    
    // Cloud Firestore mapped methods
    const dbDoc = window.dbDoc;
    const dbGet = window.dbGet;
    const dbSet = window.dbSet;
    const addDoc = window.addDoc;
    const collection = window.collection;
    const onSnapshot = window.onSnapshot;

    // DOM Target Elements Extraction Checks
    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const bookingsTodayEl = document.getElementById('bookingsToday');

    // System States
    let activeSalonName = "";
    let activeSalonUid = "";
    let currentClientUid = null;
    let cachedUserRole = "customer"; // Safely caches the authenticated role layout

    // --- 1. USER AUTH ROUTINES & PORTAL BUTTON MANAGEMENT ---
    onAuthState(auth, async (user) => {
        if (user) {
            currentClientUid = user.uid;
            if (logoutBtn) logoutBtn.style.display = 'block';

            try {
                // Accessing user security attributes inside the Firestore document structure
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    cachedUserRole = userData.role; // Cache for button target routing updates
                    
                    if (cachedUserRole === 'salon_owner' || cachedUserRole === 'admin') {
                        if (adminBtn) {
                            adminBtn.style.display = 'block';
                            // Dynamic button label updates depending on authorization context
                            const spanEl = adminBtn.querySelector('span');
                            if (spanEl) {
                                spanEl.textContent = cachedUserRole === 'admin' ? 'Admin' : 'Dashboard';
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed handling user session context permissions: ", err);
            }
        } else {
            currentClientUid = null;
            cachedUserRole = "customer";
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
        }
    });

    if (adminBtn) {
        adminBtn.addEventListener('click', () => { 
            // Multi-Role structural destination routing management
            if (cachedUserRole === 'admin') {
                window.location.href = 'admin.html';
            } else if (cachedUserRole === 'salon_owner') {
                window.location.href = 'owners.html';
            } else {
                window.location.href = 'salons.html';
            }
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => { window.logOut(auth); });
    }

    // --- 2. MODAL ENGAGEMENT CLICK HANDLER ---
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.openBooking');
        if (!trigger) return;

        if (!currentClientUid) {
            alert('Please sign up or log in on the home page before booking a cut.');
            window.location.href = 'index.html';
            return;
        }

        activeSalonName = trigger.getAttribute('data-salon');
        activeSalonUid = trigger.getAttribute('data-salon-uid');

        if (bookingModal) {
            bookingModal.classList.add('active');
        }
    });

    // --- 3. SAFE BOOKING DATA TRANSACTION HANDLER ---
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentClientUid) {
                alert('Your session expired. Re-routing back to home page.');
                window.location.href = 'index.html';
                return;
            }

            const rawService = document.getElementById('serviceType').value; 
            const nameValue = document.getElementById('custName').value.trim();
            const phoneValue = document.getElementById('custPhone').value.trim();
            const timeValue = document.getElementById('custTime').value;
            const todayDateStr = new Date().toISOString().split('T')[0]; 

            const priceMatch = rawService.match(/R(\d+)/);
            const isolatedPrice = priceMatch ? priceMatch[1] : "0";

            const bookingPayload = {
                c: currentClientUid,          
                s: activeSalonUid,            
                salon: activeSalonName,       
                name: nameValue,
                phone: phoneValue,
                service: rawService,
                price: isolatedPrice,         
                time: timeValue,
                date: todayDateStr,
                status: "pending"             
            };

            try {
                // Writing records securely using Firestore addDoc into collections path
                await addDoc(collection(db, "bookings"), bookingPayload);

                alert(`Success! Appointment scheduled with ${activeSalonName} ✂️\nCheck back soon for confirmation.`);
                if (bookingModal) bookingModal.classList.remove('active');
                bookingForm.reset();
            } catch (err) {
                alert('Database write action dropped: ' + err.message);
            }
        });
    }

    // --- 4. REAL-TIME SYNCHRONIZATION COUNTERS ---
    // Reads a collection-wide stream from Firestore to evaluate current daily quotas
    onSnapshot(collection(db, "bookings"), (snapshot) => {
        const todayStr = new Date().toISOString().split('T')[0];
        let runningCounter = 0;

        snapshot.forEach((doc) => {
            if (doc.data().date === todayStr) runningCounter++;
        });

        if (bookingsTodayEl) {
            bookingsTodayEl.textContent = `⚡ ${runningCounter} appointments booked across K@si today`;
        }
    }, (err) => console.error("Bookings stream interrupted:", err));

    // Real-time Business operational Tag Painter via Firestore snapshot streams
    onSnapshot(collection(db, "shopStatus"), (snapshot) => {
        // Collect mapping structure of all store documents locally 
        const statusData = {};
        snapshot.forEach((doc) => {
            statusData[doc.id] = doc.data();
        });

        document.querySelectorAll('.openBooking').forEach((btn) => {
            const currentUID = btn.getAttribute('data-salon-uid');
            if (!currentUID || !statusData[currentUID]) return;

            const currentShopState = statusData[currentUID].status; 
            const cardParent = btn.closest('.salon-card');
            if (!cardParent) return;

            const badgeElement = cardParent.querySelector('.status-badge');
            if (!badgeElement) return;

            badgeElement.textContent = currentShopState === "Open" ? "Open Now" : currentShopState;
            badgeElement.className = "status-badge"; 

            if (currentShopState === "Busy") {
                badgeElement.classList.add('busy');
                btn.disabled = false; 
            } else if (currentShopState === "Closed") {
                badgeElement.classList.add('closed');
                badgeElement.style.backgroundColor = "#333";
                badgeElement.textContent = "Closed";
            } else {
                badgeElement.style.backgroundColor = ""; 
            }
        });
    }, (err) => console.error("Status streams execution fault: ", err));
});
