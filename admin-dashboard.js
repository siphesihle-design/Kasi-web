document.addEventListener("DOMContentLoaded", () => {

    /*
    ============================================================
       K@si Web — Elite Admin Dashboard
       Version: 2.0
    ============================================================

       Firebase objects are expected from your existing project:

       window.firebaseAuth
       window.firebaseDB
       window.onAuthState
       window.dbDoc
       window.dbGet
       window.removeDoc
       window.collection
       window.onSnapshot
       window.query
       window.where
       window.getDocs
       window.updateDoc
       window.logOut

    ============================================================
    */


    /* =========================================================
       FIREBASE CHECK
    ========================================================= */

    if (!window.firebaseAuth || !window.firebaseDB) {

        console.error(
            "K@si Web: Firebase has not been initialized."
        );

        showToast(
            "Firebase connection is not available.",
            "error"
        );

        return;
    }


    const auth = window.firebaseAuth;
    const db = window.firebaseDB;

    const onAuthState = window.onAuthState;

    const dbDoc = window.dbDoc;
    const dbGet = window.dbGet;

    const removeDoc = window.removeDoc;

    const collection = window.collection;
    const onSnapshot = window.onSnapshot;

    const query = window.query;
    const where = window.where;

    const getDocs = window.getDocs;
    const updateDoc = window.updateDoc;


    /* =========================================================
       ELEMENTS
    ========================================================= */

    const tableBody =
        document.getElementById("tableBody");

    const totalCountEl =
        document.getElementById("totalCount");

    const pendingCountEl =
        document.getElementById("pendingCount");

    const completedCountEl =
        document.getElementById("completedCount");

    const totalRevenueEl =
        document.getElementById("totalRevenue");

    const clearBtn =
        document.getElementById("clearBtn");

    const logoutBtnAdmin =
        document.getElementById("logoutBtnAdmin");

    const dashboardTitle =
        document.getElementById("dashboardTitle");

    const nextTimeEl =
        document.getElementById("nextTime");

    const nextCustomerEl =
        document.getElementById("nextCustomer");

    const visibleCountEl =
        document.getElementById("visibleCount");

    const searchInput =
        document.getElementById("searchInput");

    const refreshBtn =
        document.getElementById("refreshBtn");

    const refreshBookingsBtn =
        document.getElementById("refreshBookingsBtn");

    const bookingDateEl =
        document.getElementById("bookingDate");

    const todayLabelEl =
        document.getElementById("todayLabel");


    /* =========================================================
       STATE
    ========================================================= */

    let currentUser = null;

    let currentUserRole = null;

    let unsubscribeBookings = null;

    let allBookings = [];

    let dashboardReady = false;


    /* =========================================================
       SOUTH AFRICA DATE
    ========================================================= */

    function getSouthAfricaDate() {

        return new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "Africa/Johannesburg",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).format(new Date());

    }


    function getPrettyDate() {

        return new Intl.DateTimeFormat(
            "en-ZA",
            {
                timeZone: "Africa/Johannesburg",
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(new Date());

    }


    function getCurrentTime() {

        return new Intl.DateTimeFormat(
            "en-ZA",
            {
                timeZone: "Africa/Johannesburg",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }
        ).format(new Date());

    }


    const todayStr = getSouthAfricaDate();


    if (bookingDateEl) {

        bookingDateEl.textContent =
            getPrettyDate();

    }


    if (todayLabelEl) {

        todayLabelEl.textContent =
            getCurrentTime() + " SAST";

    }


    /* =========================================================
       AUTHENTICATION
    ========================================================= */

    onAuthState(auth, async (user) => {

        try {

            if (!user) {

                window.location.href =
                    "index.html";

                return;
            }


            currentUser = user;


            console.log(
                "K@si Admin:",
                user.uid
            );


            /* ---------------------------------------------
               LOAD USER DOCUMENT
            --------------------------------------------- */

            const userRef =
                dbDoc(
                    db,
                    "users",
                    user.uid
                );


            const userSnap =
                await dbGet(userRef);


            if (!userSnap.exists()) {

                showToast(
                    "Your K@si account profile was not found.",
                    "error"
                );

                setTimeout(() => {

                    window.location.href =
                        "index.html";

                }, 1200);

                return;
            }


            const userData =
                userSnap.data() || {};


            currentUserRole =
                String(
                    userData.role ||
                    userData.Role ||
                    ""
                ).toLowerCase();


            console.log(
                "K@si role:",
                currentUserRole
            );


            /* ---------------------------------------------
               ADMIN GUARD
            --------------------------------------------- */

            if (currentUserRole !== "admin") {

                showToast(
                    "Administrator access required.",
                    "error"
                );


                setTimeout(() => {

                    if (
                        currentUserRole ===
                        "salon_owner"
                    ) {

                        window.location.href =
                            "owners.html";

                    } else {

                        window.location.href =
                            "salons.html";

                    }

                }, 1200);

                return;
            }


            /* ---------------------------------------------
               ADMIN ACCEPTED
            --------------------------------------------- */

            dashboardReady = true;


            if (dashboardTitle) {

                dashboardTitle.innerHTML =
                    'Welcome to the <span>K@si Control Centre</span>';

            }


            await startAdminDashboard();


        } catch (error) {

            console.error(
                "K@si Admin authentication error:",
                error
            );


            showToast(
                "Unable to load administrator account.",
                "error"
            );

        }

    });


    /* =========================================================
       START DASHBOARD
    ========================================================= */

    async function startAdminDashboard() {

        if (!dashboardReady) {
            return;
        }


        loadBookings();


        console.log(
            "K@si Admin Dashboard started."
        );

    }


    /* =========================================================
       LOAD ALL TODAY'S BOOKINGS
    ========================================================= */

    function loadBookings() {

        if (unsubscribeBookings) {

            unsubscribeBookings();

            unsubscribeBookings = null;

        }


        if (!tableBody) {
            return;
        }


        showLoading();


        try {

            const bookingsRef =
                collection(
                    db,
                    "bookings"
                );


            /*
              IMPORTANT:

              We intentionally DO NOT use:

              orderBy("time")

              This avoids requiring a Firestore
              composite index.

              We sort locally below.
            */

            const bookingsQuery =
                query(
                    bookingsRef,
                    where(
                        "date",
                        "==",
                        todayStr
                    )
                );


            unsubscribeBookings =
                onSnapshot(
                    bookingsQuery,

                    (snapshot) => {

                        allBookings = [];


                        snapshot.forEach(
                            (docSnap) => {

                                const data =
                                    docSnap.data() || {};


                                allBookings.push({

                                    id:
                                        docSnap.id,

                                    ...data

                                });

                            }
                        );


                        /*
                           Sort by time.
                        */

                        allBookings.sort(
                            (a, b) => {

                                return compareTimes(
                                    a.time,
                                    b.time
                                );

                            }
                        );


                        renderBookings();

                    },

                    (error) => {

                        console.error(
                            "Booking listener error:",
                            error
                        );


                        showError(
                            "Could not load bookings.",
                            error.message
                        );

                    }
                );


        } catch (error) {

            console.error(
                "Booking query error:",
                error
            );


            showError(
                "Could not connect to bookings.",
                error.message
            );

        }

    }


    /* =========================================================
       COMPARE TIMES
    ========================================================= */

    function compareTimes(
        first,
        second
    ) {

        const a =
            convertTimeToMinutes(first);

        const b =
            convertTimeToMinutes(second);

        return a - b;

    }


    function convertTimeToMinutes(time) {

        if (!time) {
            return 9999;
        }


        const value =
            String(time)
                .trim()
                .toLowerCase();


        /*
          Supports:

          09:30
          9:30
          09:30 AM
          9:30 pm
        */


        const match =
            value.match(
                /^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/
            );


        if (!match) {
            return 9999;
        }


        let hour =
            parseInt(
                match[1],
                10
            );


        const minute =
            parseInt(
                match[2],
                10
            );


        const meridiem =
            match[3];


        if (meridiem === "pm" && hour < 12) {

            hour += 12;

        }


        if (meridiem === "am" && hour === 12) {

            hour = 0;

        }


        return (
            hour * 60 +
            minute
        );

    }


    /* =========================================================
       RENDER BOOKINGS
    ========================================================= */

    function renderBookings() {

        if (!tableBody) {
            return;
        }


        const searchTerm =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";


        let visibleBookings =
            allBookings.filter(
                bookingMatchesSearch
            );


        updateStats(
            allBookings
        );


        updateNextAppointment(
            allBookings
        );


        if (visibleCountEl) {

            visibleCountEl.textContent =
                visibleBookings.length +
                (
                    visibleBookings.length === 1
                        ? " booking"
                        : " bookings"
                );

        }


        if (!visibleBookings.length) {

            if (allBookings.length === 0) {

                showEmpty(
                    "No bookings for today.",
                    "New customer bookings will appear here automatically."
                );

            } else {

                showEmpty(
                    "No matching bookings.",
                    "Try a different search."
                );

            }

            return;
        }


        tableBody.innerHTML = "";


        visibleBookings.forEach(
            (booking) => {

                const row =
                    createBookingRow(
                        booking
                    );


                tableBody.appendChild(row);

            }
        );

    }


    /* =========================================================
       SEARCH
    ========================================================= */

    function bookingMatchesSearch(
        booking
    ) {

        if (!searchInput) {
            return true;
        }


        const term =
            searchInput.value
                .trim()
                .toLowerCase();


        if (!term) {
            return true;
        }


        const searchable =
            [

                booking.salon,
                booking.name,
                booking.phone,
                booking.service,
                booking.status,
                booking.time,
                booking.date,
                booking.userEmail

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


        return searchable.includes(term);

    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                renderBookings();

            }
        );

    }


    /* =========================================================
       CREATE BOOKING ROW
    ========================================================= */

    function createBookingRow(
        booking
    ) {

        const row =
            document.createElement("tr");


        const price =
            Number(
                booking.price
            ) || 0;


        const status =
            normalizeStatus(
                booking.status
            );


        const salon =
            safeText(
                booking.salon ||
                "K@si Salon"
            );


        const customer =
            safeText(
                booking.name ||
                "Customer"
            );


        const phone =
            safeText(
                booking.phone ||
                "No phone"
            );


        const service =
            safeText(
                booking.service ||
                "Service"
            );


        const time =
            safeText(
                booking.time ||
                "--:--"
            );


        const statusInfo =
            getStatusInfo(
                status
            );


        row.innerHTML = `

            <td>

                <strong>
                    ${salon}
                </strong>

                <div class="sub">
                    ${safeText(
                        booking.salonId ||
                        ""
                    )}
                </div>

            </td>


            <td>

                <div class="customer-name">
                    ${customer}
                </div>

                <div class="sub">
                    ${phone}
                </div>

            </td>


            <td>

                <span class="time">
                    ${time}
                </span>

            </td>


            <td>

                <strong>
                    ${service}
                </strong>

                <div class="sub price">
                    R${formatMoney(price)}
                </div>

            </td>


            <td>

                <span
                    class="status-pill ${statusInfo.className}"
                >
                    ${statusInfo.label}
                </span>

            </td>


            <td>

                <div class="action-group">

                    ${getActionButtons(
                        booking
                    )}

                </div>

            </td>

        `;


        return row;

    }


    /* =========================================================
       ACTION BUTTONS
    ========================================================= */

    function getActionButtons(
        booking
    ) {

        const status =
            normalizeStatus(
                booking.status
            );


        let buttons = "";


        /*
          ADMIN can delete.
        */

        buttons += `

            <button
                class="action-btn delete"
                data-action="delete"
                data-id="${escapeAttribute(
                    booking.id
                )}"
                title="Delete booking"
            >
                <i class='bx bx-trash'></i>
                Delete
            </button>

        `;


        /*
          Admin can also manually approve
          or complete bookings.
        */

        if (status === "pending") {

            buttons += `

                <button
                    class="action-btn approve"
                    data-action="approve"
                    data-id="${escapeAttribute(
                        booking.id
                    )}"
                >
                    <i class='bx bx-check'></i>
                    Approve
                </button>

            `;

        }


        if (status === "approved") {

            buttons += `

                <button
                    class="action-btn done"
                    data-action="complete"
                    data-id="${escapeAttribute(
                        booking.id
                    )}"
                >
                    <i class='bx bx-check-double'></i>
                    Done
                </button>

            `;

        }


        return buttons;

    }


    /* =========================================================
       STATUS
    ========================================================= */

    function normalizeStatus(
        status
    ) {

        return String(
            status ||
            "pending"
        )
            .trim()
            .toLowerCase();

    }


    function getStatusInfo(
        status
    ) {

        switch (status) {

            case "approved":

                return {
                    label: "Approved",
                    className: "status-approved"
                };


            case "completed":

                return {
                    label: "Completed",
                    className: "status-completed"
                };


            case "declined":

                return {
                    label: "Declined",
                    className: "status-declined"
                };


            case "pending":

            default:

                return {
                    label: "Pending",
                    className: "status-pending"
                };

        }

    }


    /* =========================================================
       STATISTICS
    ========================================================= */

    function updateStats(
        bookings
    ) {

        let total = 0;

        let pending = 0;

        let completed = 0;

        let revenue = 0;


        bookings.forEach(
            (booking) => {

                total++;


                const status =
                    normalizeStatus(
                        booking.status
                    );


                const price =
                    Number(
                        booking.price
                    ) || 0;


                revenue += price;


                if (
                    status ===
                    "pending"
                ) {

                    pending++;

                }


                if (
                    status ===
                    "completed"
                ) {

                    completed++;

                }

            }
        );


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
                "R" +
                formatMoney(
                    revenue
                );

        }

    }


    /* =========================================================
       NEXT APPOINTMENT
    ========================================================= */

    function updateNextAppointment(
        bookings
    ) {

        if (
            !nextTimeEl ||
            !nextCustomerEl
        ) {
            return;
        }


        const nowMinutes =
            convertTimeToMinutes(
                getCurrentTime()
            );


        const upcoming =
            bookings
                .filter(
                    booking => {

                        const status =
                            normalizeStatus(
                                booking.status
                            );


                        if (
                            status ===
                            "completed"
                        ) {
                            return false;
                        }


                        const time =
                            convertTimeToMinutes(
                                booking.time
                            );


                        return time >= nowMinutes;

                    }
                )
                .sort(
                    (a, b) =>
                        compareTimes(
                            a.time,
                            b.time
                        )
                );


        if (!upcoming.length) {

            nextTimeEl.textContent =
                "--:--";


            nextCustomerEl.textContent =
                "No more appointments";


            return;

        }


        const next =
            upcoming[0];


        nextTimeEl.textContent =
            next.time ||
            "--:--";


        nextCustomerEl.textContent =
            next.name ||
            "Customer";

    }


    /* =========================================================
       BUTTON EVENTS
    ========================================================= */

    document.addEventListener(
        "click",
        async (event) => {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {
                return;
            }


            const action =
                button.dataset.action;


            const id =
                button.dataset.id;


            if (!id) {
                return;
            }


            if (
                currentUserRole !==
                "admin"
            ) {

                showToast(
                    "Administrator access required.",
                    "error"
                );

                return;

            }


            if (action === "delete") {

                await deleteBooking(
                    id
                );

                return;

            }


            if (action === "approve") {

                await changeBookingStatus(
                    id,
                    "approved"
                );

                return;

            }


            if (action === "complete") {

                await changeBookingStatus(
                    id,
                    "completed"
                );

            }

        }
    );


    /* =========================================================
       CHANGE BOOKING STATUS
    ========================================================= */

    async function changeBookingStatus(
        id,
        status
    ) {

        try {

            showToast(
                "Updating booking...",
                "success"
            );


            const bookingRef =
                dbDoc(
                    db,
                    "bookings",
                    id
                );


            await updateDoc(
                bookingRef,
                {
                    status: status
                }
            );


            showToast(
                status === "approved"
                    ? "Booking approved."
                    : "Booking marked as completed.",
                "success"
            );


        } catch (error) {

            console.error(
                "Status update failed:",
                error
            );


            showToast(
                "Could not update booking: " +
                error.message,
                "error"
            );

        }

    }


    /* =========================================================
       DELETE BOOKING
    ========================================================= */

    async function deleteBooking(
        id
    ) {

        const booking =
            allBookings.find(
                item =>
                    item.id === id
            );


        const customerName =
            booking?.name ||
            "this booking";


        const confirmed =
            confirm(
                "Delete " +
                customerName +
                "'s booking?\n\n" +
                "This cannot be undone."
            );


        if (!confirmed) {
            return;
        }


        try {

            showToast(
                "Deleting booking...",
                "success"
            );


            await removeDoc(
                dbDoc(
                    db,
                    "bookings",
                    id
                )
            );


            showToast(
                "Booking deleted.",
                "success"
            );


        } catch (error) {

            console.error(
                "Delete booking error:",
                error
            );


            showToast(
                "Delete failed: " +
                error.message,
                "error"
            );

        }

    }


    /* =========================================================
       CLEAR TODAY
    ========================================================= */

    if (clearBtn) {

        clearBtn.addEventListener(
            "click",
            clearTodayBookings
        );

    }


    async function clearTodayBookings() {

        if (
            currentUserRole !==
            "admin"
        ) {

            showToast(
                "Only administrators can clear bookings.",
                "error"
            );

            return;
        }


        if (!allBookings.length) {

            showToast(
                "There are no bookings to clear.",
                "error"
            );

            return;

        }


        const confirmed =
            confirm(
                "CLEAR ALL BOOKINGS FOR TODAY?\n\n" +
                allBookings.length +
                " booking(s) will be permanently deleted.\n\n" +
                "This action cannot be undone."
            );


        if (!confirmed) {
            return;
        }


        try {

            showToast(
                "Clearing today's bookings...",
                "success"
            );


            /*
              Stop listener temporarily.
            */

            if (
                unsubscribeBookings
            ) {

                unsubscribeBookings();

                unsubscribeBookings =
                    null;

            }


            const bookingsRef =
                collection(
                    db,
                    "bookings"
                );


            const q =
                query(
                    bookingsRef,
                    where(
                        "date",
                        "==",
                        todayStr
                    )
                );


            const snapshot =
                await getDocs(q);


            const deletions =
                snapshot.docs.map(
                    docSnap =>
                        removeDoc(
                            dbDoc(
                                db,
                                "bookings",
                                docSnap.id
                            )
                        )
                );


            await Promise.all(
                deletions
            );


            allBookings = [];


            renderBookings();


            showToast(
                "All today's bookings were cleared.",
                "success"
            );


            /*
              Restart listener.
            */

            setTimeout(
                loadBookings,
                500
            );


        } catch (error) {

            console.error(
                "Clear bookings error:",
                error
            );


            showToast(
                "Clear failed: " +
                error.message,
                "error"
            );


            loadBookings();

        }

    }


    /* =========================================================
       REFRESH
    ========================================================= */

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            () => {

                loadBookings();

                showToast(
                    "Dashboard refreshed.",
                    "success"
                );

            }
        );

    }


    if (refreshBookingsBtn) {

        refreshBookingsBtn.addEventListener(
            "click",
            () => {

                loadBookings();

                showToast(
                    "Bookings refreshed.",
                    "success"
                );

            }
        );

    }


    /* =========================================================
       LOGOUT
    ========================================================= */

    if (logoutBtnAdmin) {

        logoutBtnAdmin.addEventListener(
            "click",
            async () => {

                try {

                    if (
                        unsubscribeBookings
                    ) {

                        unsubscribeBookings();

                        unsubscribeBookings =
                            null;

                    }


                    if (
                        typeof window.logOut ===
                        "function"
                    ) {

                        await window.logOut(
                            auth
                        );

                    } else {

                        await auth.signOut();

                    }


                    window.location.href =
                        "index.html";


                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );


                    showToast(
                        "Logout failed.",
                        "error"
                    );

                }

            }
        );

    }


    /* =========================================================
       LOADING STATE
    ========================================================= */

    function showLoading() {

        if (!tableBody) {
            return;
        }


        tableBody.innerHTML = `

            <tr>

                <td colspan="6">

                    <div class="state">

                        <div class="spinner"></div>

                        <strong>
                            Loading bookings...
                        </strong>

                        <small>
                            Connecting to K@si Web
                        </small>

                    </div>

                </td>

            </tr>

        `;

    }


    /* =========================================================
       EMPTY STATE
    ========================================================= */

    function showEmpty(
        title,
        message
    ) {

        if (!tableBody) {
            return;
        }


        tableBody.innerHTML = `

            <tr>

                <td colspan="6">

                    <div class="state">

                        <i class='bx bx-calendar-x'></i>

                        <strong>
                            ${escapeHtml(title)}
                        </strong>

                        <small>
                            ${escapeHtml(message)}
                        </small>

                    </div>

                </td>

            </tr>

        `;

    }


    /* =========================================================
       ERROR STATE
    ========================================================= */

    function showError(
        title,
        message
    ) {

        if (!tableBody) {
            return;
        }


        tableBody.innerHTML = `

            <tr>

                <td colspan="6">

                    <div class="state">

                        <i class='bx bx-error-circle'></i>

                        <strong>
                            ${escapeHtml(title)}
                        </strong>

                        <small>
                            ${escapeHtml(
                                message ||
                                "Please try again."
                            )}
                        </small>

                    </div>

                </td>

            </tr>

        `;


        showToast(
            title,
            "error"
        );

    }


    /* =========================================================
       TOAST
    ========================================================= */

    let toastTimer = null;


    function showToast(
        message,
        type = "success"
    ) {

        const toast =
            document.getElementById(
                "toast"
            );


        if (!toast) {
            return;
        }


        clearTimeout(
            toastTimer
        );


        toast.textContent =
            message;


        toast.className =
            "";


        toast.classList.add(
            type,
            "show"
        );


        toastTimer =
            setTimeout(
                () => {

                    toast.classList.remove(
                        "show"
                    );

                },
                2800
            );

    }


    /* =========================================================
       MONEY
    ========================================================= */

    function formatMoney(
        value
    ) {

        const number =
            Number(value) || 0;


        return number.toLocaleString(
            "en-ZA",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        );

    }


    /* =========================================================
       SAFE HTML
    ========================================================= */

    function safeText(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return escapeHtml(
            String(value)
        );

    }


    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
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


    function escapeAttribute(
        value
    ) {

        return escapeHtml(
            value
        );

    }


    /* =========================================================
       CLEANUP
    ========================================================= */

    window.addEventListener(
        "beforeunload",
        () => {

            if (
                unsubscribeBookings
            ) {

                unsubscribeBookings();

            }

        }
    );


});
