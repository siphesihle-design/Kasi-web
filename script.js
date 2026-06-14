document.addEventListener('DOMContentLoaded', () => {
    // Fail-safe protection if firebase initialization hasn't cleared yet
    if (!window.firebaseAuth) return;

    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbRef = window.dbRef;
    const dbGet = window.dbGet;
    const dbSet = window.dbSet;
    const push = window.push;
    const onValue = window.onValue;

    // DOM Target Elements
    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const bookingsTodayEl = document.getElementById('bookingsToday');

    // State placeholders tracking current active interaction context
    let activeSalonName = "";
    let activeSalonUid = "";
    let currentClientUid = null;

    // --- 1. SESSION / IDENTITY OBSERVATION ---
    onAuthState(auth, async (user) => {
        if (user) {
            currentClientUid = user.uid;
            if (logoutBtn) logoutBtn.style.display = 'block';

            // Verify role to determine visibility modifiers for workspace shortcuts
            try {
                const userSnap = await dbGet(dbRef(db, `users/${user.uid}`));
                if (userSnap.exists()) {
                    const userData = userSnap.val();
                    if (userData.role === 'salon_owner' || userData.role === 'admin') {
                        if (adminBtn) adminBtn.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error("Role resolution system execution fault:", err);
            }
        } else {
            currentClientUid = null;
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
        }
    });

    // Navigation UI Redirect Bindings
    if (adminBtn) {
        adminBtn.addEventListener('click', () => { window.location.href = 'owners.html'; });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => { window.logOut(auth); });
    }

    // --- 2. MODAL ENGAGEMENT ROUTINES ---
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.openBooking');
        if (!trigger) return;

        // Force explicit user session requirement state before processing reservation parameters
        if (!currentClientUid) {
            alert('Please register or log in on the home page before scheduling appointments.');
            window.location.href = 'index.html';
            return;
        }

        // Cache parameters tied into HTML structural elements
        activeSalonName = trigger.getAttribute('data-salon');
        activeSalonUid = trigger.getAttribute('data-salon-uid');

        // Present UI sheet configuration
        bookingModal.classList.add('active');
    });

    // --- 3. TRANSACTION ENGINE SUBMISSION ---
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentClientUid) {
                alert('Authentication expired. Re-routing back.');
                window.location.href = 'index.html';
                return;
            }

            const rawService = document.getElementById('serviceType').value; // e.g., "Fade R150"
            const nameValue = document.getElementById('custName').value.trim();
            const phoneValue = document.getElementById('custPhone').value.trim();
            const timeValue = document.getElementById('custTime').value;
            const todayDateStr = new Date().toISOString().split('T')[0]; // Format standard: YYYY-MM-DD

            // Isolate numeric string parameter payload definitions safely
            const priceExtractionArray = rawService.match(/R(\d+)/);
            const isolatedPrice = priceExtractionArray ? priceExtractionArray[1] : "0";

            // Map data structure variables directly to Firebase Schema Requirements
            const bookingPayload = {
                c: currentClientUid,          // Client identity node validation variable
                s: activeSalonUid,           // Salon owner pointer link
                salon: activeSalonName,       // Text label for super-admin panel reference
                name: nameValue,
                phone: phoneValue,
                service: rawService,
                price: isolatedPrice,         // Tracks billing validation variables
                time: timeValue,
                date: todayDateStr,
                status: "pending"             // Lifecycle state flags: pending -> confirmed -> completed
            };

            try {
                // Initialize unique key record path allocations inside data engine
                const targetCollectionRef = dbRef(db, 'bookings');
                const generatedRecordReference = push(targetCollectionRef);

                await dbSet(generatedRecordReference, bookingPayload);

                alert(`Appointment scheduled successfully with ${activeSalonName}! ✂️\nKeep an eye on WhatsApp notifications.`);
                bookingModal.classList.remove('active');
                bookingForm.reset();
            } catch (err) {
                alert('Database write execution failed: ' + err.message);
                console.error(err);
            }
        });
    }

    // --- 4. REAL-TIME DATA STREAM INTERACTION SYNC ---
    // Monitor global dynamic booking operations count logic metrics for current day 
    const structuralBookingsRootRef = dbRef(db, 'bookings');
    onValue(structuralBookingsRootRef, (snapshot) => {
        const todayStr = new Date().toISOString().split('T')[0];
        let runningCounter = 0;

        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                if (child.val().date === todayStr) runningCounter++;
            });
        }
        if (bookingsTodayEl) {
            bookingsTodayEl.textContent = `⚡ ${runningCounter} appointments booked across K@si today`;
        }
    });

    // Real-time status update loop mapping barber availability directly to dashboard dropdown selections
    const shopStatusFolderRef = dbRef(db, 'shopStatus');
    onValue(shopStatusFolderRef, (snapshot) => {
        if (!snapshot.exists()) return;
        
        const data = snapshot.val();

        // Loop dynamic checks mapping across buttons mapped dynamically inside page structure
        document.querySelectorAll('.openBooking').forEach((btn) => {
            const currentUID = btn.getAttribute('data-salon-uid');
            if (!currentUID || !data[currentUID]) return;

            const currentShopState = data[currentUID].status; // Reads 'Open', 'Busy', or 'Closed'
            const cardParent = btn.closest('.salon-card');
            if (!cardParent) return;

            const badgeElement = cardParent.querySelector('.status-badge');
            if (!badgeElement) return;

            // Update badges live to display true state shifts instantly across screens
            badgeElement.textContent = currentShopState === "Open" ? "Open Now" : currentShopState;
            badgeElement.className = "status-badge"; // Clear classes

            if (currentShopState === "Busy") {
                badgeElement.classList.add('busy');
                btn.disabled = false; // Barbers can still stack items onto standard workflow queues
            } else if (currentShopState === "Closed") {
                badgeElement.classList.add('closed'); // Ensure target styling fallback rules exist inside style.css
                badgeElement.style.backgroundColor = "#333";
                badgeElement.textContent = "Closed";
            } else {
                badgeElement.style.backgroundColor = ""; // Reset baseline structural style declarations
            }
        });
    });
});
