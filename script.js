document.addEventListener('DOMContentLoaded', () => {

    // ============================================================
    // FIREBASE SAFETY CHECK
    // ============================================================
    if (!window.firebaseAuth || !window.firebaseDB) {
        console.error("Firebase Auth or Firestore is not available.");
        return;
    }

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
    const removeDoc = window.removeDoc;
    const updateDoc = window.updateDoc;
    const getDocs = window.getDocs;

    // ============================================================
    // CURRENT PAGE
    // ============================================================
    const page = window.location.pathname.split('/').pop().toLowerCase();

    const isOwnerPage =
        page === 'owners.html' ||
        page === 'ownersdashboard.html' ||
        page === 'ownersdashboard';

    const isAdminPage =
        page === 'admin.html';

    // ============================================================
    // DOM ELEMENTS
    // ============================================================
    const salonList = document.getElementById('salonList');

    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');

    const adminBtn = document.getElementById('adminBtn');
    const adminBtnMobile = document.getElementById('adminBtnMobile');

    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');

    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('searchBtn');

    const bookingsToday = document.getElementById('bookingsToday');

    const tableBody = document.getElementById('tableBody');
    const totalCountEl = document.getElementById('totalCount');
    const pendingCountEl = document.getElementById('pendingCount');
    const completedCountEl = document.getElementById('completedCount');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const clearBtn = document.getElementById('clearBtn');
    const dashboardTitle = document.getElementById('dashboardTitle');
    const nextTimeEl = document.getElementById('nextTime');

    // ============================================================
    // GLOBAL STATE
    // ============================================================
    let selectedSalonId = null;
    let selectedSalonData = null;

    let allSalons = [];

    let currentUserRole = null;
    let currentUserId = null;
    let currentSalonId = null;

    let unsubscribeBookings = null;
    let isBookingCountListening = false;

    // ============================================================
    // AUDIO / HAPTIC
    // ============================================================
    const clickSound = document.getElementById('clickSound');

    if (clickSound) {
        clickSound.volume = 0.4;
    }

    function playClick() {
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => {});
        }

        if (navigator.vibrate) {
            navigator.vibrate(40);
        }
    }

    document.addEventListener('click', (e) => {
        if (
            e.target.closest(
                'button, .nav-item, .primary-btn, .secondary-btn'
            )
        ) {
            playClick();
        }
    });

    // ============================================================
    // DATE INPUT
    // ============================================================
    const custDateInput = document.getElementById('custDate');

    if (custDateInput) {
        custDateInput.min =
            new Date().toISOString().split('T')[0];
    }

    // ============================================================
    // AUTHENTICATION
    // ============================================================
    onAuthState(auth, async (user) => {

        console.log("AUTH STATE:", user ? user.uid : "NO USER");

        // --------------------------------------------------------
        // NOT LOGGED IN
        // --------------------------------------------------------
        if (!user) {

            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }

            if (adminBtn) {
                adminBtn.style.display = 'none';
            }

            if (adminBtnMobile) {
                adminBtnMobile.style.display = 'none';
            }

            // Only protected dashboard pages redirect.
            // Normal home/salon pages remain accessible.
            if (isOwnerPage || isAdminPage) {
                console.log("Protected page requires login.");
                window.location.replace('index.html');
            }

            return;
        }

        // --------------------------------------------------------
        // LOGGED IN
        // --------------------------------------------------------
        if (logoutBtn) {
            logoutBtn.style.display = 'flex';
        }

        try {

            console.log("Reading user profile:", user.uid);

            const userRef = dbDoc(db, "users", user.uid);
            const userSnap = await dbGet(userRef);

            if (!userSnap.exists()) {

                console.error(
                    "No Firestore user document exists for:",
                    user.uid
                );

                if (isOwnerPage || isAdminPage) {
                    alert("Your account profile was not found.");
                    window.location.replace('index.html');
                }

                return;
            }

            const userData = userSnap.data();

            currentUserId = user.uid;
            currentUserRole = userData.role || null;
            currentSalonId = userData.salonId || null;

            console.log("USER DATA:", userData);
            console.log("ROLE:", currentUserRole);
            console.log("SALON ID:", currentSalonId);

            // ====================================================
            // OWNER PAGE GUARD
            // ====================================================
            if (isOwnerPage) {

                if (currentUserRole !== 'salon_owner') {

                    console.error(
                        "OWNER ACCESS DENIED. Role:",
                        currentUserRole
                    );

                    alert("Salon owners only.");

                    if (currentUserRole === 'admin') {
                        window.location.replace('admin.html');
                    } else {
                        window.location.replace('index.html');
                    }

                    return;
                }

                // ------------------------------------------------
                // SALON ID CHECK
                // ------------------------------------------------
                if (!currentSalonId) {

                    console.error(
                        "Salon owner has no salonId."
                    );

                    if (tableBody) {
                        tableBody.innerHTML = `
                            <tr>
                                <td colspan="6"
                                    style="
                                        text-align:center;
                                        color:#ff4757;
                                        padding:30px;
                                    ">
                                    No salon is linked to this owner account.
                                </td>
                            </tr>
                        `;
                    }

                    return;
                }

                console.log(
                    "OWNER AUTHORIZED.",
                    "Salon:",
                    currentSalonId
                );

                // ------------------------------------------------
                // LOAD OWNER DASHBOARD
                // ------------------------------------------------
                await loadOwnerSalon(currentSalonId);
                await syncDashboard(
                    'salon_owner',
                    user.uid,
                    currentSalonId
                );

                return;
            }

            // ====================================================
            // ADMIN PAGE GUARD
            // ====================================================
            if (isAdminPage) {

                if (currentUserRole !== 'admin') {

                    console.error(
                        "ADMIN ACCESS DENIED. Role:",
                        currentUserRole
                    );

                    alert("Admins only.");

                    if (currentUserRole === 'salon_owner') {
                        window.location.replace('ownersdashboard.html');
                    } else {
                        window.location.replace('index.html');
                    }

                    return;
                }

                if (dashboardTitle) {
                    dashboardTitle.textContent =
                        "Admin Dashboard - All Salons";
                }

                await syncDashboard(
                    'admin',
                    user.uid,
                    null
                );

                return;
            }

            // ====================================================
            // NORMAL WEBSITE
            // ====================================================
            if (
                currentUserRole === 'admin' ||
                currentUserRole === 'salon_owner'
            ) {

                if (adminBtn) {
                    adminBtn.style.display = 'flex';

                    adminBtn.onclick = () => {

                        if (currentUserRole === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href =
                                'ownersdashboard.html';
                        }

                    };
                }

                if (adminBtnMobile) {
                    adminBtnMobile.style.display = 'flex';

                    adminBtnMobile.onclick = () => {

                        if (currentUserRole === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href =
                                'ownersdashboard.html';
                        }

                    };
                }
            }

            // Load public salon list on normal pages
            if (salonList) {
                loadSalons();
            }

        } catch (err) {

            console.error(
                "Authentication/profile error:",
                err
            );

            // IMPORTANT:
            // Do NOT automatically log the user out.
            // A Firestore error is not the same as an invalid login.

            if (isOwnerPage && tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6"
                            style="
                                text-align:center;
                                color:#ff4757;
                                padding:30px;
                            ">
                            Unable to load your account.
                            Please refresh and try again.
                        </td>
                    </tr>
                `;
            }
        }
    });

    // ============================================================
    // LOAD OWNER'S SALON
    // ============================================================
    async function loadOwnerSalon(salonId) {

        try {

            console.log(
                "Loading salon:",
                salonId
            );

            const salonRef =
                dbDoc(db, "salons", salonId);

            const salonSnap =
                await dbGet(salonRef);

            if (!salonSnap.exists()) {

                console.error(
                    "Salon document does not exist:",
                    salonId
                );

                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="6"
                                style="
                                    text-align:center;
                                    color:#ff4757;
                                    padding:30px;
                                ">
                                The linked salon could not be found.
                            </td>
                        </tr>
                    `;
                }

                return;
            }

            const salon = salonSnap.data();

            console.log(
                "OWNER SALON:",
                salon
            );

            if (dashboardTitle) {

                dashboardTitle.textContent =
                    `Owner Dashboard - ${salon.name || 'My Salon'}`;
            }

        } catch (err) {

            console.error(
                "Could not load owner salon:",
                err
            );
        }
    }

    // ============================================================
    // LOAD ALL SALONS
    // ============================================================
    function loadSalons() {

        if (!salonList) return;

        const salonsQuery =
            query(
                collection(db, "salons"),
                orderBy("name")
            );

        onSnapshot(
            salonsQuery,
            (snapshot) => {

                allSalons = [];

                salonList.innerHTML = "";

                if (snapshot.empty) {

                    salonList.innerHTML = `
                        <p style="
                            text-align:center;
                            color:#888;
                            padding:20px;
                        ">
                            No registered salons found.
                        </p>
                    `;

                    return;
                }

                snapshot.forEach((docSnap) => {

                    const salon = {
                        id: docSnap.id,
                        ...docSnap.data()
                    };

                    allSalons.push(salon);

                    renderSalon(salon);
                });

                if (!isBookingCountListening) {

                    listenToTodayBookingCount();

                    isBookingCountListening = true;
                }
            },
            (error) => {

                console.error(
                    "Salons real-time error:",
                    error
                );

                salonList.innerHTML = `
                    <p style="
                        text-align:center;
                        color:#FF4444;
                        padding:20px;
                    ">
                        Unable to load salons right now.
                    </p>
                `;
            }
        );
    }

    // ============================================================
    // RENDER SALON
    // ============================================================
    function renderSalon(salon) {

        if (!salonList) return;

        const noOwner = !salon.ownerId;

        const card =
            document.createElement('div');

        card.className =
            'glass-card salon-card';

        card.innerHTML = `
            <h3>
                ${escapeHtml(
                    salon.name || 'Unnamed Salon'
                )}
            </h3>

            <p>
                <i class='bx bx-map'></i>
                ${escapeHtml(
                    salon.location || 'Soweto'
                )}
            </p>

            <p>
                <i class='bx bx-time'></i>
                ${escapeHtml(
                    salon.hours || '9AM - 6PM'
                )}
            </p>

            ${
                noOwner
                    ? `
                    <small style="
                        color:#FF4444;
                        display:block;
                        margin-bottom:8px;
                    ">
                        ⚠️ Salon currently unassigned
                    </small>
                    `
                    : ''
            }

            <button
                class="primary-btn bookBtn"
                data-id="${salon.id}"
                ${
                    noOwner
                        ? `
                        disabled
                        style="
                            opacity:0.5;
                            cursor:not-allowed;
                        "
                        `
                        : ''
                }
            >
                Book Appointment
            </button>
        `;

        salonList.appendChild(card);
    }

    // ============================================================
    // SEARCH
    // ============================================================
    if (searchBtn && searchBar) {

        searchBtn.onclick = () => {

            const term =
                searchBar.value
                    .trim()
                    .toLowerCase();

            salonList.innerHTML = "";

            const filtered =
                allSalons.filter((s) =>

                    (
                        s.name &&
                        s.name
                            .toLowerCase()
                            .includes(term)
                    ) ||

                    (
                        s.location &&
                        s.location
                            .toLowerCase()
                            .includes(term)
                    )
                );

            if (filtered.length === 0) {

                salonList.innerHTML = `
                    <p style="
                        text-align:center;
                        color:#888;
                        padding:20px;
                    ">
                        No salons match "${escapeHtml(term)}".
                    </p>
                `;

                return;
            }

            filtered.forEach(renderSalon);
        };
    }

    // ============================================================
    // BOOKING MODAL
    // ============================================================
    if (salonList) {

        salonList.addEventListener(
            'click',
            (e) => {

                const bookBtn =
                    e.target.closest('.bookBtn');

                if (!bookBtn) return;

                if (bookBtn.disabled) return;

                if (!auth.currentUser) {

                    alert(
                        "Please sign in first to complete a booking."
                    );

                    window.location.href =
                        'index.html';

                    return;
                }

                selectedSalonId =
                    bookBtn.dataset.id;

                selectedSalonData =
                    allSalons.find(
                        s => s.id === selectedSalonId
                    );

                if (bookingModal) {

                    bookingModal.style.display =
                        'block';

                    bookingModal.classList.add(
                        'active'
                    );
                }
            }
        );
    }

    // ============================================================
    // BOOKING FORM
    // ============================================================
    if (bookingForm) {

        bookingForm.addEventListener(
            'submit',
            async (e) => {

                e.preventDefault();

                if (!auth.currentUser) {

                    alert(
                        "Session expired. Please log in again."
                    );

                    return;
                }

                if (!selectedSalonData) {

                    alert(
                        "Selected salon data is missing."
                    );

                    return;
                }

                const serviceEl =
                    document.getElementById(
                        'serviceType'
                    );

                const serviceVal =
                    serviceEl
                        ? serviceEl.value
                        : '';

                if (!serviceVal) {

                    alert(
                        "Please choose a service."
                    );

                    return;
                }

                let serviceName =
                    serviceVal;

                let price = 0;

                if (
                    serviceVal.includes(' — R')
                ) {

                    const parts =
                        serviceVal.split(' — R');

                    serviceName =
                        parts[0];

                    price =
                        Number(parts[1]) || 0;
                }

                const submitBtn =
                    bookingForm.querySelector(
                        'button[type="submit"]'
                    );

                if (submitBtn) {
                    submitBtn.disabled = true;
                }

                try {

                    await addDoc(
                        collection(
                            db,
                            "bookings"
                        ),
                        {
                            userId:
                                auth.currentUser.uid,

                            ownerId:
                                selectedSalonData.ownerId || "",

                            salonId:
                                selectedSalonId,

                            salon:
                                selectedSalonData.name ||
                                "Kasi Salon",

                            customerName:
                                document
                                    .getElementById(
                                        'custName'
                                    )
                                    .value
                                    .trim(),

                            phone:
                                document
                                    .getElementById(
                                        'custPhone'
                                    )
                                    .value
                                    .trim(),

                            service:
                                serviceName,

                            price:
                                price,

                            status:
                                "pending",

                            date:
                                document
                                    .getElementById(
                                        'custDate'
                                    )
                                    .value,

                            time:
                                document
                                    .getElementById(
                                        'custTime'
                                    )
                                    .value,

                            createdAt:
                                serverTimestamp()
                        }
                    );

                    alert(
                        "✅ Booking request submitted! The salon owner will confirm shortly."
                    );

                    if (bookingModal) {

                        bookingModal.style.display =
                            'none';

                        bookingModal.classList.remove(
                            'active'
                        );
                    }

                    bookingForm.reset();

                } catch (err) {

                    console.error(
                        "Booking submission error:",
                        err
                    );

                    alert(
                        "Booking failed: " +
                        err.message
                    );

                } finally {

                    if (submitBtn) {
                        submitBtn.disabled = false;
                    }
                }
            }
        );
    }

    // ============================================================
    // TODAY BOOKING COUNT
    // ============================================================
    function listenToTodayBookingCount() {

        if (!bookingsToday) return;

        const todayStr =
            new Date()
                .toISOString()
                .split('T')[0];

        const countQuery =
            query(
                collection(db, "bookings"),
                where(
                    "date",
                    "==",
                    todayStr
                )
            );

        onSnapshot(
            countQuery,
            (snap) => {

                bookingsToday.textContent =
                    `${snap.size} booking${
                        snap.size === 1
                            ? ''
                            : 's'
                    } today`;
            },
            (err) => {

                console.error(
                    "Count query error:",
                    err
                );
            }
        );
    }

    // ============================================================
    // DASHBOARD BOOKING SYNC
    // ============================================================
    async function syncDashboard(
        role,
        uid,
        salonId
    ) {

        if (!tableBody) return;

        const todayStr =
            new Date()
                .toISOString()
                .split('T')[0];

        const bookingsRef =
            collection(
                db,
                "bookings"
            );

        let q;

        // --------------------------------------------------------
        // ADMIN
        // --------------------------------------------------------
        if (role === 'admin') {

            q = query(
                bookingsRef,
                where(
                    "date",
                    "==",
                    todayStr
                ),
                orderBy(
                    "time",
                    "asc"
                )
            );

        }

        // --------------------------------------------------------
        // SALON OWNER
        // --------------------------------------------------------
        else if (role === 'salon_owner') {

            if (!salonId) {

                console.error(
                    "syncDashboard: Missing salonId"
                );

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6"
                            style="
                                text-align:center;
                                color:#ff4757;
                                padding:30px;
                            ">
                            No salon linked to this account.
                        </td>
                    </tr>
                `;

                return;
            }

            console.log(
                "Loading bookings for salon:",
                salonId
            );

            q = query(
                bookingsRef,
                where(
                    "salonId",
                    "==",
                    salonId
                ),
                where(
                    "date",
                    "==",
                    todayStr
                ),
                orderBy(
                    "time",
                    "asc"
                )
            );

        }

        else {
            return;
        }

        // --------------------------------------------------------
        // REAL-TIME BOOKINGS
        // --------------------------------------------------------
        unsubscribeBookings =
            onSnapshot(
                q,
                (snapshot) => {

                    tableBody.innerHTML = "";

                    let total = 0;
                    let pending = 0;
                    let completed = 0;
                    let revenue = 0;

                    let next = "--:--";

                    if (snapshot.empty) {

                        tableBody.innerHTML = `
                            <tr>
                                <td colspan="6"
                                    style="
                                        text-align:center;
                                        color:#666;
                                        padding:30px;
                                    ">
                                    No bookings for today.
                                </td>
                            </tr>
                        `;

                        updateDashboardStats(
                            0,
                            0,
                            0,
                            0,
                            "--:--"
                        );

                        return;
                    }

                    snapshot.forEach(
                        (docSnap, i) => {

                            const item =
                                docSnap.data();

                            total++;

                            const itemPrice =
                                Number(
                                    item.price
                                ) || 0;

                            revenue +=
                                itemPrice;

                            if (
                                item.status ===
                                'pending'
                            ) {
                                pending++;
                            }

                            if (
                                item.status ===
                                'completed'
                            ) {
                                completed++;
                            }

                            if (
                                i === 0 &&
                                item.status !==
                                'completed'
                            ) {
                                next =
                                    item.time ||
                                    "--:--";
                            }

                            const statusClass =
                                item.status ===
                                'approved'
                                    ? 'status-approved'
                                    : item.status ===
                                      'completed'
                                        ? 'status-completed'
                                        : 'status-pending';

                            const statusText =
                                item.status ===
                                'approved'
                                    ? 'Approved'
                                    : item.status ===
                                      'completed'
                                        ? 'Completed'
                                        : 'Pending';

                            const tr =
                                document.createElement(
                                    'tr'
                                );

                            tr.innerHTML = `
                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            item.salon
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.customerName ||
                                        item.name ||
                                        ''
                                    )}
                                    <br>
                                    <small
                                        style="
                                            color:#B0B0D0;
                                        "
                                    >
                                        ${escapeHtml(
                                            item.phone
                                        )}
                                    </small>
                                </td>

                                <td>
                                    <span
                                        style="
                                            color:#7B68EE;
                                            font-weight:bold;
                                        "
                                    >
                                        ${escapeHtml(
                                            item.time
                                        )}
                                    </span>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.service
                                    )}
                                    <br>
                                    <small>
                                        R${itemPrice}
                                    </small>
                                </td>

                                <td>
                                    <span
                                        class="status-pill ${statusClass}"
                                    >
                                        ${statusText}
                                    </span>
                                </td>

                                <td>

                                    ${
                                        item.status ===
                                        'pending' &&
                                        role ===
                                        'salon_owner'
                                            ? `
                                            <button
                                                class="status-btn approveBtn"
                                                data-id="${docSnap.id}"
                                            >
                                                Approve
                                            </button>
                                            `
                                            : ''
                                    }

                                    ${
                                        item.status ===
                                        'approved' &&
                                        role ===
                                        'salon_owner'
                                            ? `
                                            <button
                                                class="status-btn"
                                                style="
                                                    background:#00c853
                                                "
                                                data-done="${docSnap.id}"
                                            >
                                                Done
                                            </button>
                                            `
                                            : ''
                                    }

                                    ${
                                        role ===
                                        'admin'
                                            ? `
                                            <button
                                                class="status-btn"
                                                style="
                                                    background:#ff4757
                                                "
                                                data-del="${docSnap.id}"
                                            >
                                                Del
                                            </button>
                                            `
                                            : ''
                                    }

                                </td>
                            `;

                            tableBody.appendChild(
                                tr
                            );
                        }
                    );

                    updateDashboardStats(
                        total,
                        pending,
                        completed,
                        revenue,
                        next
                    );
                },
                (error) => {

                    console.error(
                        "BOOKINGS QUERY ERROR:",
                        error
                    );

                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="6"
                                style="
                                    text-align:center;
                                    color:#ff4757;
                                    padding:30px;
                                ">
                                Unable to load bookings.
                                Check your Firestore index/rules.
                            </td>
                        </tr>
                    `;
                }
            );
    }

    // ============================================================
    // DASHBOARD STATS
    // ============================================================
    function updateDashboardStats(
        total,
        pending,
        completed,
        revenue,
        next
    ) {

        if (totalCountEl) {
            totalCountEl.textContent =
                total;
        }

        if (pendingCountEl) {
            pendingCountEl.textContent =
                pending;
        }

        if (completedCountEl) {
            completedCountEl.textContent =
                completed;
        }

        if (totalRevenueEl) {
            totalRevenueEl.textContent =
                `R${revenue}`;
        }

        if (nextTimeEl) {
            nextTimeEl.textContent =
                next;
        }
    }

    // ============================================================
    // DASHBOARD BUTTON ACTIONS
    // ============================================================
    document.addEventListener(
        'click',
        async (e) => {

            const approveBtn =
                e.target.closest(
                    '.approveBtn'
                );

            const doneBtn =
                e.target.closest(
                    '[data-done]'
                );

            const delBtn =
                e.target.closest(
                    '[data-del]'
                );

            try {

                if (approveBtn) {

                    await updateDoc(
                        dbDoc(
                            db,
                            "bookings",
                            approveBtn.dataset.id
                        ),
                        {
                            status:
                                'approved'
                        }
                    );
                }

                if (doneBtn) {

                    await updateDoc(
                        dbDoc(
                            db,
                            "bookings",
                            doneBtn.dataset.done
                        ),
                        {
                            status:
                                'completed'
                        }
                    );
                }

                if (
                    delBtn &&
                    currentUserRole ===
                    'admin'
                ) {

                    if (
                        confirm(
                            "Delete this booking?"
                        )
                    ) {

                        await removeDoc(
                            dbDoc(
                                db,
                                "bookings",
                                delBtn.dataset.del
                            )
                        );
                    }
                }

            } catch (err) {

                console.error(
                    "Booking action error:",
                    err
                );

                alert(
                    "Action failed: " +
                    err.message
                );
            }
        }
    );

    // ============================================================
    // CLEAR TODAY'S BOOKINGS
    // ============================================================
    if (clearBtn) {

        clearBtn.addEventListener(
            'click',
            async () => {

                if (
                    currentUserRole !==
                    'admin'
                ) {

                    alert(
                        "Only Admin can clear all bookings."
                    );

                    return;
                }

                if (
                    !confirm(
                        "Clear ALL bookings for today? This cannot be undone."
                    )
                ) {
                    return;
                }

                const todayStr =
                    new Date()
                        .toISOString()
                        .split('T')[0];

                const q =
                    query(
                        collection(
                            db,
                            "bookings"
                        ),
                        where(
                            "date",
                            "==",
                            todayStr
                        )
                    );

                try {

                    if (unsubscribeBookings) {
                        unsubscribeBookings();
                    }

                    const snapshot =
                        await getDocs(q);

                    const deletes =
                        snapshot.docs.map(
                            d =>
                                removeDoc(
                                    dbDoc(
                                        db,
                                        "bookings",
                                        d.id
                                    )
                                )
                        );

                    await Promise.all(
                        deletes
                    );

                    alert(
                        "All bookings cleared."
                    );

                    await syncDashboard(
                        'admin',
                        currentUserId,
                        null
                    );

                } catch (err) {

                    console.error(
                        "Clear failed:",
                        err
                    );

                    alert(
                        "Clear failed: " +
                        err.message
                    );
                }
            }
        );
    }

    // ============================================================
    // LOGOUT
    // ============================================================
    async function doLogout() {

        try {

            if (unsubscribeBookings) {
                unsubscribeBookings();
                unsubscribeBookings = null;
            }

            await signOut(auth);

            window.location.replace(
                'index.html'
            );

        } catch (err) {

            console.error(
                "Logout error:",
                err
            );

            alert(
                "Logout failed: " +
                err.message
            );
        }
    }

    if (logoutBtn) {
        logoutBtn.onclick = doLogout;
    }

    if (logoutBtnAdmin) {
        logoutBtnAdmin.onclick = doLogout;
    }

    // ============================================================
    // COOKIE BANNER
    // ============================================================
    const banner =
        document.getElementById(
            'cookieBanner'
        );

    const acceptAll =
        document.getElementById(
            'acceptAllCookies'
        );

    const essential =
        document.getElementById(
            'essentialCookies'
        );

    const closeBtn =
        document.getElementById(
            'cookieClose'
        );

    const cookieChoice =
        localStorage.getItem(
            'kasiCookieChoice'
        );

    if (
        !cookieChoice &&
        banner
    ) {

        setTimeout(
            () => {
                banner.style.display =
                    'flex';
            },
            1200
        );
    }

    function saveChoice(choice) {

        playClick();

        localStorage.setItem(
            'kasiCookieChoice',
            choice
        );

        if (banner) {
            banner.style.display =
                'none';
        }
    }

    acceptAll?.addEventListener(
        'click',
        () => saveChoice('all')
    );

    essential?.addEventListener(
        'click',
        () => saveChoice('essential')
    );

    closeBtn?.addEventListener(
        'click',
        () => saveChoice('essential')
    );

    // ============================================================
    // ESCAPE HTML
    // ============================================================
    function escapeHtml(str) {

        if (
            str === null ||
            str === undefined
        ) {
            return '';
        }

        return str
            .toString()
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

});
