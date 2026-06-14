document.addEventListener('DOMContentLoaded', () => {
    // Safety check: wait for Firebase to expose modules to the window object
    if (!window.firebaseAuth) return;

    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbRef = window.dbRef;
    const dbGet = window.dbGet;
    const dbSet = window.dbSet;
    const push = window.push;
    const onValue = window.onValue;

    // DOM Target Elements from salons.html
    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const bookingsTodayEl = document.getElementById('bookingsToday');

    // Runtime state tracking variables
    let activeSalonName = "";
    let activeSalonUid = "";
    let currentClientUid = null;

    // --- 1. AUTHENTICATION & ROLE MANAGEMENT ---
    onAuthState(auth, async (user) => {
        if (user) {
            currentClientUid = user.uid;
            if (logoutBtn) logoutBtn.style.display = 'block';

            try {
                // Read user node to see if they should have access to the Admin button shortcut
                const userSnap = await dbGet(dbRef(db, `users/${user.uid}`));
                if (userSnap.exists()) {
                    const userData = userSnap.val();
                    if (userData.role === 'salon_owner' || userData.role === 'admin') {
                        if (adminBtn) adminBtn.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error("Error fetching user role context:", err);
            }
        } else {
            currentClientUid = null;
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
        }
    });

    // Navigation Redirections
    if (adminBtn) {
        adminBtn.addEventListener('click', () => { window.location.href = 'owners.html'; });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => { window.logOut(auth); });
    }

    // --- 2. MODAL ENGAGEMENT ROUTINES ---
    // Listen globally for clicks on the "Book Appointment" buttons
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.openBooking');
        if (!trigger) return;

        // Force a valid login session before allowing a customer to book
        if (!currentClientUid) {
            alert('Please sign up or log in on the home page before booking a cut.');
            window.location.href = 'index.html';
            return;
        }

        // Extract metadata values embedded within the HTML data attributes
        activeSalonName = trigger.getAttribute('data-salon');
        activeSalonUid = trigger.getAttribute('data-salon-uid');

        // Reveal the modal layout wrapper sheet
        if (bookingModal) {
            bookingModal.classList.add('active');
        }
    });

    // --- 3. BOOKING TRANSACTION HANDLER ---
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentClientUid) {
                alert('Your session expired. Re-routing back to home page.');
                window.location.href = 'index.html';
                return;
            }

            const rawService = document.getElementById('serviceType').value; // e.g., "Fade R150"
            const nameValue = document.getElementById('custName').value.trim();
            const phoneValue = document.getElementById('custPhone').value.trim();
            const timeValue = document.getElementById('custTime').value;
            const todayDateStr = new Date().toISOString().split('T')[0]; // Generates local date: YYYY-MM-DD

            // Safely extract the payment amount number using a regex lookahead match
            const priceMatch = rawService.match(/R(\d+)/);
            const isolatedPrice = priceMatch ? priceMatch[1] : "0";

            // Map standard layout definitions directly onto database structural definitions
            const bookingPayload = {
                c: currentClientUid,          // Client identification node (used by Security Rules validation)
                s: activeSalonUid,           // Targeted Salon account UID link
                salon: activeSalonName,       // Text context representation fallback
                name: nameValue,
                phone: phoneValue,
                service: rawService,
                price: isolatedPrice,         // Stripped numeric cost value
                time: timeValue,
                date: todayDateStr,
                status: "pending"             // Lifecycle state tracker logic
            };

            try {
                // Point explicitly to global window instances to prevent race-condition script dropouts
                const bookingsCollectionRef = window.dbRef(window.firebaseDB, 'bookings');
                const uniqueKeyRef = window.push(bookingsCollectionRef);

                await window.dbSet(uniqueKeyRef, bookingPayload);

                alert(`Success! Appointment scheduled with ${activeSalonName} ✂️\nCheck back soon for confirmation.`);
                bookingModal.classList.remove('active');
                bookingForm.reset();
            } catch (err) {
                alert('Database write action dropped: ' + err.message);
                console.error("Booking Write Error Log:", err);
            }
        });
    }

    // --- 4. REAL-TIME DATA & COUNTER SYNC ---
    // Count active appointments running today across all salons
    const bookingsFolderRef = dbRef(db, 'bookings');
    onValue(bookingsFolderRef, (snapshot) => {
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

    // Watch the 'shopStatus' node to update Open/Busy/Closed tags in real-time
    const shopStatusFolderRef = dbRef(db, 'shopStatus');
    onValue(shopStatusFolderRef, (snapshot) => {
        if (!snapshot.exists()) return;
        
        const statusData = snapshot.val();

        document.querySelectorAll('.openBooking').forEach((btn) => {
            const currentUID = btn.getAttribute('data-salon-uid');
            if (!currentUID || !statusData[currentUID]) return;

            const currentShopState = statusData[currentUID].status; // Pulls 'Open', 'Busy', or 'Closed'
            const cardParent = btn.closest('.salon-card');
            if (!cardParent) return;

            const badgeElement = cardParent.querySelector('.status-badge');
            if (!badgeElement) return;

            // Paint standard styling contexts cleanly across layout cards
            badgeElement.textContent = currentShopState === "Open" ? "Open Now" : currentShopState;
            badgeElement.className = "status-badge"; // Wipe old utility tags clear

            if (currentShopState === "Busy") {
                badgeElement.classList.add('busy');
                btn.disabled = false; // Keep button accessible so users can stack queues
            } else if (currentShopState === "Closed") {
                badgeElement.classList.add('closed');
                badgeElement.style.backgroundColor = "#333";
                badgeElement.textContent = "Closed";
            } else {
                badgeElement.style.backgroundColor = ""; // Reset fallback overrides
            }
        });
    });
});
