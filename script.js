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
    if (bookingsTodayEl) {
        const todayStr = new Date().toISOString().split('T')[0];
        onSnapshot(collection(db, "bookings"), (snapshot) => {
            let activeTodayCount = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.date === todayStr) {
                    activeTodayCount++;
                }
            });
            bookingsTodayEl.textContent = `${activeTodayCount} appointments scheduled across shops today`;
        }, (err) => {
            console.error("Error reading global dashboard snapshot metric: ", err);
        });
    }
});

```

---

### 2. Required `admin-dashboard.js`

This file connects to the globals created inside your `owners.html` page to drive the workspace dashboard, handle security loops for owners, compile real-time metrics, and manage inline actions.

```javascript
document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;

    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;

    const dbDoc = window.dbDoc;
    const dbGet = window.dbGet;
    const dbSet = window.dbSet;
    const removeDoc = window.removeDoc;
    const collection = window.collection;
    const onSnapshot = window.onSnapshot;
    const query = window.query;
    const where = window.where;
    const orderBy = window.orderBy;

    // UI elements
    const tableBody = document.getElementById('tableBody');
    const totalCountEl = document.getElementById('totalCount');
    const nextTimeEl = document.getElementById('nextTime');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const clearBtn = document.getElementById('clearBtn');
    const logoutBtnOwner = document.getElementById('logoutBtnOwner');
    const shopStatusSelect = document.getElementById('shopStatusSelect');

    let currentOwnerUid = null;
    let unsubscribeBookings = null;

    // Guard route verification structure
    onAuthState(auth, async (user) => {
        if (user) {
            currentOwnerUid = user.uid;
            try {
                const userSnap = await dbGet(dbDoc(db, "users", user.uid));
                if (userSnap.exists() && (userSnap.data().role === 'salon_owner' || userSnap.data().role === 'admin')) {
                    // Start listening to live booking entries matching this workspace session
                    syncWorkspaceDashboard(user.uid);
                } else {
                    alert("Unauthorized entry clearance verification denied.");
                    window.location.href = 'salons.html';
                }
            } catch (err) {
                console.error("Dashboard core loop panic: ", err);
            }
        } else {
            window.location.href = 'index.html';
        }
    });

    if (logoutBtnOwner) {
        logoutBtnOwner.addEventListener('click', () => {
            if (unsubscribeBookings) unsubscribeBookings();
            window.logOut(auth);
        });
    }

    function syncWorkspaceDashboard(ownerUid) {
        const todayStr = new Date().toISOString().split('T')[0];
        const bookingsRef = collection(db, "bookings");
        
        // Filter elements explicitly assigned to this provider setup row
        const q = query(bookingsRef, where("date", "==", todayStr), orderBy("time", "asc"));

        unsubscribeBookings = onSnapshot(q, (snapshot) => {
            tableBody.innerHTML = "";
            let totalBookings = 0;
            let totalRevenue = 0;
            let upcomingTime = "--:--";

            if (snapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666; padding: 30px;">No bookings received yet for today.</td></tr>`;
                totalCountEl.textContent = "0";
                nextTimeEl.textContent = "--:--";
                totalRevenueEl.textContent = "R0";
                return;
            }

            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                const docId = docSnap.id;
                totalBookings++;

                // Track total revenue across complete or pending items
                const itemPrice = parseInt(item.price) || 0;
                totalRevenue += itemPrice;

                // Identify baseline active time frame markers
                if (upcomingTime === "--:--" && item.status === "pending") {
                    upcomingTime = item.time;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.name)}</strong><br><small style="color:#666;">${escapeHtml(item.phone)}</small></td>
                    <td><span style="color:#008080; font-weight:bold;">${item.time}</span></td>
                    <td>${escapeHtml(item.service)}</td>
                    <td>
                        <button class="status-btn action-complete" data-id="${docId}" style="background:${item.status === 'completed' ? '#2ed573' : '#008080'}">
                            ${item.status === 'completed' ? 'Done ✓' : 'Complete'}
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            totalCountEl.textContent = totalBookings;
            nextTimeEl.textContent = upcomingTime;
            totalRevenueEl.textContent = `R${totalRevenue}`;
        }, (err) => {
            console.error("Workspace listener error: ", err);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ff4757; padding: 20px;">Database parsing failed: ${err.message}</td></tr>`;
        });
    }

    // Toggle process items via tracking clicks directly inside elements
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('action-complete')) {
            const docId = e.target.getAttribute('data-id');
            try {
                await dbSet(dbDoc(db, "bookings", docId), { status: "completed" }, { merge: true });
            } catch (err) {
                alert("Could not update state: " + err.message);
            }
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (!confirm("Are you sure you want to clear out your whole screen layout metrics for today?")) return;
            const todayStr = new Date().toISOString().split('T')[0];
            const bookingsRef = collection(db, "bookings");
            const q = query(bookingsRef, where("date", "==", todayStr));

            try {
                // Read local snapshot values and delete iteratively 
                onSnapshot(q, (snapshot) => {
                    snapshot.forEach(async (docSnap) => {
                        await removeDoc(dbDoc(db, "bookings", docSnap.id));
                    });
                });
                alert("Queue structure initialized successfully.");
            } catch (err) {
                alert("Queue operational clear-down cycle halted: " + err.message);
            }
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
});
