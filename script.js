/* =========================================================
   K@si Web - script.js
   Firebase COMPAT version
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       BASIC UI ELEMENTS
       ===================================================== */

    const authSection = document.getElementById("authSection");
    const logoutBtn = document.getElementById("logoutBtn");
    const adminBtn = document.getElementById("adminBtn");

    const bookingModal = document.getElementById("bookingModal");
    const closeBookingModal =
        document.getElementById("closeBookingModal");
    const cancelBookingBtn =
        document.getElementById("cancelBookingBtn");
    const bookingForm =
        document.getElementById("bookingForm");

    const salonsContainer =
        document.getElementById("salonsContainer") ||
        document.getElementById("salonContainer") ||
        document.getElementById("salonsGrid");

    const serviceType =
        document.getElementById("serviceType");

    const custName =
        document.getElementById("custName");

    const custPhone =
        document.getElementById("custPhone");

    const custDate =
        document.getElementById("custDate");

    const custTime =
        document.getElementById("custTime");

    const bookingMessage =
        document.getElementById("bookingMessage") ||
        document.getElementById("bookingStatus");

    const todayBookings =
        document.getElementById("todayBookings") ||
        document.getElementById("bookingsToday");


    /* =====================================================
       FIREBASE COMPAT CHECK
       ===================================================== */

    const auth = window.firebaseAuth;
    const db = window.firebaseDB;

    if (!auth || !db) {

        console.error(
            "K@si Web: Firebase Auth or Firestore is missing."
        );

        if (bookingMessage) {

            bookingMessage.textContent =
                "Firebase is not connected. Please refresh the page.";
        }

        return;
    }

    console.log(
        "K@si Web: Firebase connected successfully."
    );


    /* =====================================================
       GLOBAL STATE
       ===================================================== */

    let currentUser = null;

    let selectedSalonData = null;

    let selectedSalonId = null;

    let bookingCounterUnsubscribe = null;

    let salonsUnsubscribe = null;


    /* =====================================================
       HELPERS
       ===================================================== */

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function showMessage(
        message,
        type = "info"
    ) {

        console.log(message);

        if (!bookingMessage) return;

        bookingMessage.textContent = message;

        bookingMessage.classList.remove(
            "text-red-400",
            "text-green-400",
            "text-yellow-400",
            "text-blue-400"
        );

        if (type === "error") {

            bookingMessage.classList.add(
                "text-red-400"
            );

        } else if (type === "success") {

            bookingMessage.classList.add(
                "text-green-400"
            );

        } else if (type === "warning") {

            bookingMessage.classList.add(
                "text-yellow-400"
            );

        } else {

            bookingMessage.classList.add(
                "text-blue-400"
            );
        }
    }


    function vibrate() {

        try {

            if (navigator.vibrate) {

                navigator.vibrate(30);
            }

        } catch (error) {

            console.warn(
                "Vibration unavailable."
            );
        }
    }


    function playClickSound() {

        try {

            const sound =
                document.getElementById("clickSound");

            if (sound) {

                sound.currentTime = 0;

                sound.play().catch(() => {});
            }

        } catch (error) {

            console.warn(
                "Click sound unavailable."
            );
        }
    }


    function formatPrice(price) {

        const number = Number(price);

        if (
            !Number.isFinite(number) ||
            number <= 0
        ) {
            return "";
        }

        return `R${number}`;
    }


    function getServiceName(service) {

        if (typeof service === "string") {

            return service;
        }

        if (
            !service ||
            typeof service !== "object"
        ) {

            return "";
        }

        return (
            service.name ||
            service.service ||
            service.title ||
            service.serviceName ||
            ""
        );
    }


    function getServicePrice(service) {

        if (
            !service ||
            typeof service !== "object"
        ) {

            return 0;
        }

        const price =
            service.price ??
            service.amount ??
            service.cost ??
            0;

        const number = Number(price);

        return Number.isFinite(number)
            ? number
            : 0;
    }


    /* =====================================================
       SOUTH AFRICA DATE
       ===================================================== */

    function getSouthAfricaDate() {

        try {

            const formatter =
                new Intl.DateTimeFormat(
                    "en-CA",
                    {
                        timeZone:
                            "Africa/Johannesburg",

                        year: "numeric",

                        month: "2-digit",

                        day: "2-digit"
                    }
                );

            return formatter.format(
                new Date()
            );

        } catch (error) {

            return formatInputDate(
                new Date()
            );
        }
    }


    /* =====================================================
       TYPEWRITER
       ===================================================== */

    const typewriterElement =
        document.getElementById("typewriter") ||
        document.querySelector(".typewriter");

    if (typewriterElement) {

        const words = [
            "Fresh Cuts",
            "No Lines",
            "Kasi Prices"
        ];

        let wordIndex = 0;

        let charIndex = 0;

        let deleting = false;


        function typeWriter() {

            const word =
                words[wordIndex];

            if (!deleting) {

                typewriterElement.textContent =
                    word.substring(
                        0,
                        charIndex + 1
                    );

                charIndex++;

                if (
                    charIndex ===
                    word.length
                ) {

                    deleting = true;

                    setTimeout(
                        typeWriter,
                        1500
                    );

                    return;
                }

            } else {

                typewriterElement.textContent =
                    word.substring(
                        0,
                        charIndex - 1
                    );

                charIndex--;

                if (charIndex === 0) {

                    deleting = false;

                    wordIndex =
                        (wordIndex + 1) %
                        words.length;
                }
            }

            setTimeout(
                typeWriter,
                deleting ? 70 : 110
            );
        }


        typeWriter();
    }


    /* =====================================================
       SWIPER
       ===================================================== */

    if (
        typeof Swiper !== "undefined" &&
        document.querySelector(".elite-swiper")
    ) {

        try {

            new Swiper(
                ".elite-swiper",
                {

                    effect: "coverflow",

                    grabCursor: true,

                    centeredSlides: true,

                    slidesPerView: "auto",

                    loop: true,

                    autoplay: {

                        delay: 3000,

                        disableOnInteraction: false
                    },

                    coverflowEffect: {

                        rotate: 15,

                        stretch: 0,

                        depth: 100,

                        modifier: 1,

                        slideShadows: true
                    },

                    pagination: {

                        el:
                            ".swiper-pagination",

                        clickable: true
                    },

                    touchRatio: 1,

                    touchAngle: 45,

                    simulateTouch: true
                }
            );

        } catch (error) {

            console.error(
                "Swiper error:",
                error
            );
        }
    }


    /* =====================================================
       OWNER SALON ID SYNCHRONIZATION
       
       IMPORTANT:
       We NEVER generate salon_${uid}.
       
       The actual Firestore document ID inside
       /salons is the canonical salon ID.
       ===================================================== */

    async function syncOwnerSalonId(
        user,
        userData
    ) {

        if (!user) return null;

        const role =
            userData.role ||
            userData.userRole ||
            userData.Role ||
            "customer";


        if (role !== "salon_owner") {

            return (
                userData.salonId ||
                null
            );
        }


        /*
         * First check whether the user's existing
         * salonId actually points to a salon.
         */

        const existingSalonId =
            userData.salonId ||
            null;


        if (existingSalonId) {

            try {

                const existingSalon =
                    await db
                        .collection("salons")
                        .doc(existingSalonId)
                        .get();

                if (
                    existingSalon.exists
                ) {

                    const salonData =
                        existingSalon.data() ||
                        {};

                    /*
                     * Make sure this salon actually
                     * belongs to the logged-in owner.
                     */

                    if (
                        salonData.ownerId ===
                            user.uid ||
                        salonData.OwnerId ===
                            user.uid
                    ) {

                        console.log(
                            "Owner salon ID verified:",
                            existingSalonId
                        );

                        return existingSalonId;
                    }

                    console.warn(
                        "Existing salonId belongs to another owner."
                    );
                }

            } catch (error) {

                console.warn(
                    "Could not verify existing salonId:",
                    error
                );
            }
        }


        /* =================================================
           FIND SALON USING ownerId
           ================================================= */

        try {

            const snapshot =
                await db
                    .collection("salons")
                    .where(
                        "ownerId",
                        "==",
                        user.uid
                    )
                    .limit(1)
                    .get();


            if (!snapshot.empty) {

                const salonDoc =
                    snapshot.docs[0];

                const realSalonId =
                    salonDoc.id;

                console.log(
                    "Found owner's actual salon:",
                    realSalonId
                );


                /*
                 * Synchronize users/{uid}.salonId
                 * with the real Firestore document ID.
                 */

                try {

                    await db
                        .collection("users")
                        .doc(user.uid)
                        .set(
                            {
                                salonId:
                                    realSalonId,

                                role:
                                    "salon_owner"
                            },
                            {
                                merge: true
                            }
                        );

                    console.log(
                        "users/{uid}.salonId synchronized:",
                        realSalonId
                    );

                } catch (error) {

                    console.warn(
                        "Could not synchronize owner salonId:",
                        error
                    );
                }


                return realSalonId;
            }


        } catch (error) {

            console.error(
                "Could not find salon by ownerId:",
                error
            );
        }


        /*
         * IMPORTANT:
         * We do NOT create a fake/generated salon ID.
         *
         * If the owner has no salon document yet,
         * ownerdashboard.html should create one.
         */

        console.log(
            "No salon document found for this owner yet."
        );

        return null;
    }


    /* =====================================================
       AUTH STATE
       ===================================================== */

    auth.onAuthStateChanged(
        async (user) => {

            currentUser = user;

            console.log(
                "Auth state:",
                user
                    ? user.uid
                    : "Not logged in"
            );


            /* =================================================
               LOGGED OUT
               ================================================= */

            if (!user) {

                if (logoutBtn) {

                    logoutBtn.classList.add(
                        "hidden"
                    );
                }

                if (adminBtn) {

                    adminBtn.classList.add(
                        "hidden"
                    );
                }

                updateBookingCounter(
                    null
                );

                return;
            }


            /* =================================================
               LOGGED IN
               ================================================= */

            if (logoutBtn) {

                logoutBtn.classList.remove(
                    "hidden"
                );
            }


            /* =================================================
               LOAD USER DOCUMENT
               ================================================= */

            try {

                const userDoc =
                    await db
                        .collection("users")
                        .doc(user.uid)
                        .get();

                let userData = {};


                if (userDoc.exists) {

                    userData =
                        userDoc.data() ||
                        {};
                }


                const role =
                    userData.role ||
                    userData.userRole ||
                    userData.Role ||
                    "customer";


                console.log(
                    "Logged-in user role:",
                    role
                );


                /* =================================================
                   ADMIN BUTTON
                   ================================================= */

                if (adminBtn) {

                    if (
                        role ===
                        "admin"
                    ) {

                        adminBtn.classList.remove(
                            "hidden"
                        );

                    } else {

                        adminBtn.classList.add(
                            "hidden"
                        );
                    }
                }


                /* =================================================
                   OWNER SALON SYNCHRONIZATION
                   ================================================= */

                if (
                    role ===
                    "salon_owner"
                ) {

                    const realSalonId =
                        await syncOwnerSalonId(
                            user,
                            userData
                        );

                    console.log(
                        "Owner canonical salon ID:",
                        realSalonId
                    );
                }


                /* =================================================
                   BOOKING COUNTER
                   ================================================= */

                updateBookingCounter(
                    user
                );


            } catch (error) {

                console.error(
                    "Could not load user document:",
                    error
                );
            }
        }
    );


    /* =====================================================
       LOGOUT
       ===================================================== */

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            async () => {

                playClickSound();

                vibrate();

                try {

                    await auth.signOut();

                    console.log(
                        "User signed out."
                    );

                    window.location.href =
                        "index.html";

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );
                }
            }
        );
    }


    /* =====================================================
       LOAD SALONS
       ===================================================== */

    function loadSalons() {

        if (!salonsContainer) {

            console.warn(
                "Salon container not found."
            );

            return;
        }


        salonsContainer.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-gray-400">
                    Loading salons...
                </p>
            </div>
        `;


        /*
         * Prevent multiple listeners if reloadSalons()
         * is called.
         */

        if (
            typeof salonsUnsubscribe ===
            "function"
        ) {

            salonsUnsubscribe();
        }


        salonsUnsubscribe =
            db
                .collection("salons")
                .onSnapshot(

                    (snapshot) => {

                        console.log(
                            "Salons found:",
                            snapshot.size
                        );


                        if (
                            snapshot.empty
                        ) {

                            salonsContainer.innerHTML = `
                                <div class="col-span-full text-center py-10">
                                    <p class="text-gray-400">
                                        No salons registered yet.
                                    </p>
                                </div>
                            `;

                            return;
                        }


                        const salons = [];


                        snapshot.forEach(
                            (docSnap) => {

                                const data =
                                    docSnap.data() ||
                                    {};


                                /*
                                 * IMPORTANT:
                                 *
                                 * Firestore document ID
                                 * is the canonical salon ID.
                                 */

                                const realSalonId =
                                    docSnap.id;


                                const ownerId =
                                    data.ownerId ||
                                    data.OwnerId ||
                                    null;


                                const salon = {

                                    ...data,

                                    id:
                                        realSalonId,

                                    salonId:
                                        realSalonId,

                                    ownerId:
                                        ownerId,

                                    name:
                                        data.name ||
                                        "Unnamed Salon",

                                    location:
                                        data.location ||
                                        "Soweto",

                                    hours:
                                        data.hours ||
                                        "9AM - 6PM",

                                    image:
                                        data.image ||
                                        "",

                                    services:
                                        Array.isArray(
                                            data.services
                                        )
                                            ? data.services
                                            : []
                                };


                                salons.push(
                                    salon
                                );
                            }
                        );


                        salons.sort(
                            (a, b) =>
                                String(a.name)
                                    .localeCompare(
                                        String(b.name)
                                    )
                        );


                        salonsContainer.innerHTML =
                            "";


                        salons.forEach(
                            (salon) => {

                                salonsContainer.appendChild(
                                    renderSalon(
                                        salon
                                    )
                                );
                            }
                        );

                    },

                    (error) => {

                        console.error(
                            "Salon loading error:",
                            error
                        );


                        salonsContainer.innerHTML = `
                            <div class="col-span-full text-center py-10">
                                <p class="text-red-400">
                                    Could not load salons.
                                </p>

                                <p class="text-gray-500 text-sm mt-2">
                                    ${escapeHtml(
                                        error.message
                                    )}
                                </p>
                            </div>
                        `;
                    }
                );
    }


    /* =====================================================
       RENDER SALON
       ===================================================== */

    function renderSalon(
        salon
    ) {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "salon-card bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-gray-800";


        const image =
            salon.image ||
            "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80";


        const hasOwner =
            Boolean(
                salon.ownerId
            );


        card.innerHTML = `

            <div class="relative">

                <img
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(salon.name)}"
                    class="w-full h-48 object-cover"
                    loading="lazy"
                >

                <div class="
                    absolute
                    top-3
                    right-3
                    bg-black/70
                    px-3
                    py-1
                    rounded-full
                    text-xs
                    text-white
                ">
                    ${
                        hasOwner
                            ? "Available"
                            : "Unavailable"
                    }
                </div>

            </div>


            <div class="p-5">

                <h3 class="
                    text-xl
                    font-bold
                    text-white
                    mb-2
                ">
                    ${escapeHtml(
                        salon.name
                    )}
                </h3>


                <p class="
                    text-gray-400
                    text-sm
                    mb-2
                ">
                    📍 ${escapeHtml(
                        salon.location
                    )}
                </p>


                <p class="
                    text-gray-400
                    text-sm
                    mb-4
                ">
                    🕒 ${escapeHtml(
                        salon.hours
                    )}
                </p>


                <div class="mb-4">

                    <p class="
                        text-sm
                        font-semibold
                        text-gray-300
                        mb-2
                    ">
                        Services
                    </p>


                    <div class="
                        flex
                        flex-wrap
                        gap-2
                    ">

                        ${
                            salon.services.length

                                ? salon.services
                                    .slice(0, 5)
                                    .map(
                                        service => {

                                            const name =
                                                getServiceName(
                                                    service
                                                );

                                            const price =
                                                getServicePrice(
                                                    service
                                                );

                                            return `
                                                <span class="
                                                    bg-gray-800
                                                    text-gray-300
                                                    text-xs
                                                    px-2
                                                    py-1
                                                    rounded-lg
                                                ">
                                                    ${escapeHtml(
                                                        name
                                                    )}

                                                    ${
                                                        price > 0
                                                            ? ` — R${price}`
                                                            : ""
                                                    }
                                                </span>
                                            `;
                                        }
                                    )
                                    .join("")

                                : `
                                    <span class="
                                        text-gray-500
                                        text-xs
                                    ">
                                        Services not listed
                                    </span>
                                `
                        }

                    </div>

                </div>


                <button
                    type="button"
                    class="
                        book-salon-btn
                        w-full
                        py-3
                        rounded-xl
                        font-semibold
                        transition
                        ${
                            hasOwner

                                ? "bg-blue-600 hover:bg-blue-700 text-white"

                                : "bg-gray-700 text-gray-400 cursor-not-allowed"
                        }
                    "

                    ${
                        hasOwner
                            ? ""
                            : "disabled"
                    }

                    data-salon-id="${escapeHtml(
                        salon.id
                    )}"
                >

                    ${
                        hasOwner
                            ? "Book Now"
                            : "Booking Unavailable"
                    }

                </button>

            </div>
        `;


        const button =
            card.querySelector(
                ".book-salon-btn"
            );


        if (
            button &&
            hasOwner
        ) {

            button.addEventListener(
                "click",
                () => {

                    playClickSound();

                    vibrate();

                    openBookingModal(
                        salon
                    );
                }
            );
        }


        return card;
    }


    /* =====================================================
       OPEN BOOKING MODAL
       ===================================================== */

    function openBookingModal(
        salon
    ) {

        if (!currentUser) {

            alert(
                "Please log in before booking a salon."
            );

            return;
        }


        if (!salon) {

            alert(
                "Salon information is unavailable."
            );

            return;
        }


        if (!salon.ownerId) {

            alert(
                "This salon is not connected to an owner yet."
            );

            return;
        }


        selectedSalonData =
            salon;


        /*
         * IMPORTANT:
         * Always use the real Firestore document ID.
         */

        selectedSalonId =
            salon.id;


        console.log(
            "Selected salon:",
            selectedSalonData
        );


        console.log(
            "Canonical salon ID:",
            selectedSalonId
        );


        populateServices(
            salon
        );


        /* =================================================
           PREFILL CUSTOMER NAME
           ================================================= */

        if (
            custName &&
            !custName.value
        ) {

            db.collection("users")
                .doc(currentUser.uid)
                .get()
                .then(
                    (docSnap) => {

                        if (
                            !docSnap.exists
                        ) {
                            return;
                        }


                        const data =
                            docSnap.data() ||
                            {};


                        const name =
                            data.name ||
                            data.fullName ||
                            data.displayName ||
                            currentUser.displayName ||
                            "";


                        if (name) {

                            custName.value =
                                name;
                        }
                    }
                )
                .catch(
                    (error) => {

                        console.warn(
                            "Could not load customer name:",
                            error
                        );
                    }
                );
        }


        /* =================================================
           DATE LIMITS
           ================================================= */

        if (custDate) {

            const today =
                new Date();


            const maxDate =
                new Date();


            maxDate.setDate(
                today.getDate() + 30
            );


            custDate.min =
                formatInputDate(
                    today
                );


            custDate.max =
                formatInputDate(
                    maxDate
                );


            if (
                !custDate.value
            ) {

                custDate.value =
                    formatInputDate(
                        today
                    );
            }
        }


        showMessage(
            "",
            "info"
        );


        if (bookingModal) {

            bookingModal.classList.remove(
                "hidden"
            );

            bookingModal.classList.add(
                "flex"
            );

            document.body.classList.add(
                "overflow-hidden"
            );
        }
    }


    /* =====================================================
       DATE FORMAT
       ===================================================== */

    function formatInputDate(
        date
    ) {

        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        return `${year}-${month}-${day}`;
    }


    /* =====================================================
       POPULATE SERVICES
       ===================================================== */

    function populateServices(
        salon
    ) {

        if (!serviceType) {
            return;
        }


        serviceType.innerHTML = `
            <option value="">
                Select a service
            </option>
        `;


        const services =
            Array.isArray(
                salon.services
            )
                ? salon.services
                : [];


        if (
            !services.length
        ) {

            serviceType.innerHTML += `
                <option
                    value=""
                    disabled
                >
                    No services available
                </option>
            `;

            return;
        }


        services.forEach(
            (service) => {

                const serviceName =
                    getServiceName(
                        service
                    );


                const servicePrice =
                    getServicePrice(
                        service
                    );


                if (!serviceName) {
                    return;
                }


                const option =
                    document.createElement(
                        "option"
                    );


                /*
                 * ONLY the service name is stored
                 * in the option value.
                 */

                option.value =
                    serviceName;


                option.textContent =
                    servicePrice > 0

                        ? `${serviceName} — R${servicePrice}`

                        : serviceName;


                option.dataset.price =
                    String(
                        servicePrice
                    );


                serviceType.appendChild(
                    option
                );
            }
        );
    }


    /* =====================================================
       CLOSE BOOKING MODAL
       ===================================================== */

    function closeModal() {

        if (!bookingModal) {
            return;
        }


        bookingModal.classList.add(
            "hidden"
        );


        bookingModal.classList.remove(
            "flex"
        );


        document.body.classList.remove(
            "overflow-hidden"
        );


        selectedSalonData =
            null;


        selectedSalonId =
            null;


        showMessage(
            "",
            "info"
        );
    }


    if (
        closeBookingModal
    ) {

        closeBookingModal.addEventListener(
            "click",
            closeModal
        );
    }


    if (
        cancelBookingBtn
    ) {

        cancelBookingBtn.addEventListener(
            "click",
            closeModal
        );
    }


    if (
        bookingModal
    ) {

        bookingModal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    bookingModal
                ) {

                    closeModal();
                }
            }
        );
    }


    /* =====================================================
       SERVICE CHANGE
       ===================================================== */

    if (
        serviceType
    ) {

        serviceType.addEventListener(
            "change",
            () => {

                const option =
                    serviceType.options[
                        serviceType.selectedIndex
                    ];


                console.log(
                    "Selected service:",
                    serviceType.value,

                    "Price:",

                    option
                        ? option.dataset.price
                        : 0
                );
            }
        );
    }


    /* =====================================================
       BOOKING SUBMISSION
       ===================================================== */

    if (
        bookingForm
    ) {

        bookingForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                console.log(
                    "Booking form submitted."
                );


                /* =========================================
                   CHECK AUTH
                   ========================================= */

                const user =
                    auth.currentUser;


                if (!user) {

                    showMessage(
                        "Please log in before booking.",
                        "error"
                    );

                    return;
                }


                /* =========================================
                   CHECK SALON
                   ========================================= */

                if (
                    !selectedSalonData
                ) {

                    showMessage(
                        "Please select a salon first.",
                        "error"
                    );

                    return;
                }


                const ownerId =
                    selectedSalonData.ownerId ||
                    selectedSalonData.OwnerId ||
                    null;


                if (!ownerId) {

                    showMessage(
                        "This salon has no owner ID. Booking cannot continue.",
                        "error"
                    );


                    console.error(
                        "Missing ownerId:",
                        selectedSalonData
                    );

                    return;
                }


                /* =========================================
                   CANONICAL SALON ID
                   ========================================= */

                const canonicalSalonId =
                    selectedSalonData.id;


                if (
                    !canonicalSalonId
                ) {

                    showMessage(
                        "This salon has no valid Firestore document ID.",
                        "error"
                    );

                    console.error(
                        "Missing canonical salon ID:",
                        selectedSalonData
                    );

                    return;
                }


                /* =========================================
                   FORM VALUES
                   ========================================= */

                const customerName =
                    custName
                        ? custName.value.trim()
                        : "";


                const phone =
                    custPhone
                        ? custPhone.value.trim()
                        : "";


                const date =
                    custDate
                        ? custDate.value
                        : "";


                const time =
                    custTime
                        ? custTime.value
                        : "";


                const serviceName =
                    serviceType
                        ? serviceType.value
                        : "";


                /* =========================================
                   VALIDATION
                   ========================================= */

                if (!customerName) {

                    showMessage(
                        "Please enter your name.",
                        "error"
                    );

                    custName?.focus();

                    return;
                }


                if (!phone) {

                    showMessage(
                        "Please enter your phone number.",
                        "error"
                    );

                    custPhone?.focus();

                    return;
                }


                if (!serviceName) {

                    showMessage(
                        "Please select a service.",
                        "error"
                    );

                    serviceType?.focus();

                    return;
                }


                if (!date) {

                    showMessage(
                        "Please select a date.",
                        "error"
                    );

                    custDate?.focus();

                    return;
                }


                if (!time) {

                    showMessage(
                        "Please select a time.",
                        "error"
                    );

                    custTime?.focus();

                    return;
                }


                /* =========================================
                   GET PRICE
                   ========================================= */

                let price = 0;


                const selectedOption =
                    serviceType.options[
                        serviceType.selectedIndex
                    ];


                if (
                    selectedOption
                ) {

                    price =
                        Number(
                            selectedOption
                                .dataset
                                .price ||
                            0
                        );
                }


                /* =========================================
                   BUILD BOOKING
                   ========================================= */

                const bookingData = {

                    /*
                     * CUSTOMER
                     */

                    userId:
                        user.uid,


                    /*
                     * OWNER
                     */

                    ownerId:
                        ownerId,


                    /*
                     * CANONICAL FIRESTORE
                     * SALON DOCUMENT ID
                     */

                    salonId:
                        canonicalSalonId,


                    /*
                     * SALON NAME
                     */

                    salonName:
                        selectedSalonData.name ||
                        "Salon",


                    /*
                     * CUSTOMER DETAILS
                     */

                    customerName:
                        customerName,


                    phone:
                        phone,


                    /*
                     * SERVICE
                     */

                    service:
                        serviceName,


                    price:
                        price,


                    /*
                     * APPOINTMENT
                     */

                    date:
                        date,


                    time:
                        time,


                    /*
                     * STATUS
                     */

                    status:
                        "pending",


                    /*
                     * TIMESTAMPS
                     */

                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp(),


                    updatedAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()
                };


                console.log(
                    "FINAL BOOKING DATA:",
                    bookingData
                );


                console.log(
                    "Booking salonId:",
                    canonicalSalonId
                );


                console.log(
                    "Booking ownerId:",
                    ownerId
                );


                /* =========================================
                   DISABLE BUTTON
                   ========================================= */

                const submitButton =
                    bookingForm.querySelector(
                        'button[type="submit"]'
                    );


                const originalText =
                    submitButton
                        ? submitButton.textContent
                        : "";


                if (
                    submitButton
                ) {

                    submitButton.disabled =
                        true;


                    submitButton.textContent =
                        "Booking...";
                }


                showMessage(
                    "Submitting your booking...",
                    "info"
                );


                /* =========================================
                   SAVE TO FIRESTORE
                   ========================================= */

                try {

                    const bookingRef =
                        await db
                            .collection(
                                "bookings"
                            )
                            .add(
                                bookingData
                            );


                    console.log(
                        "Booking successfully created:",
                        bookingRef.id
                    );


                    showMessage(
                        "Booking successful! Your booking is pending confirmation.",
                        "success"
                    );


                    /* =====================================
                       SUCCESS RESET
                       ===================================== */

                    setTimeout(
                        () => {

                            if (
                                bookingForm
                            ) {

                                bookingForm.reset();
                            }


                            closeModal();


                            alert(
                                "Booking successful! Your booking is pending confirmation."
                            );

                        },
                        1200
                    );


                } catch (error) {

                    console.error(
                        "BOOKING ERROR:",
                        error
                    );


                    console.error(
                        "Error code:",
                        error.code
                    );


                    console.error(
                        "Error message:",
                        error.message
                    );


                    let message =
                        "Booking failed. Please try again.";


                    if (
                        error.code ===
                        "permission-denied"
                    ) {

                        message =
                            "Booking was denied by Firebase. Please check your Firestore security rules.";

                    } else if (
                        error.code ===
                        "unauthenticated"
                    ) {

                        message =
                            "Your login session has expired. Please log in again.";

                    } else if (
                        error.code ===
                        "failed-precondition"
                    ) {

                        message =
                            "Firebase needs an index or database configuration update.";

                    } else if (
                        error.code ===
                        "unavailable"
                    ) {

                        message =
                            "Firebase is temporarily unavailable. Please try again.";

                    } else if (
                        error.message
                    ) {

                        message =
                            error.message;
                    }


                    showMessage(
                        message,
                        "error"
                    );


                    alert(
                        "Booking failed:\n\n" +
                        message
                    );


                } finally {

                    if (
                        submitButton
                    ) {

                        submitButton.disabled =
                            false;


                        submitButton.textContent =
                            originalText ||
                            "Confirm Booking";
                    }
                }
            }
        );
    }


    /* =====================================================
       TODAY'S BOOKINGS
       ===================================================== */

    function updateBookingCounter(
        user
    ) {

        if (!todayBookings) {
            return;
        }


        /* ================================================
           REMOVE OLD LISTENER
           ================================================ */

        if (
            typeof bookingCounterUnsubscribe ===
            "function"
        ) {

            bookingCounterUnsubscribe();

            bookingCounterUnsubscribe =
                null;
        }


        if (!user) {

            todayBookings.textContent =
                "0";

            return;
        }


        /*
         * Query only by userId.
         *
         * Date is filtered locally.
         *
         * This avoids a composite index.
         */

        bookingCounterUnsubscribe =
            db
                .collection("bookings")
                .where(
                    "userId",
                    "==",
                    user.uid
                )
                .onSnapshot(

                    (snapshot) => {

                        /*
                         * Use South African date.
                         */

                        const today =
                            getSouthAfricaDate();


                        let count = 0;


                        snapshot.forEach(
                            (docSnap) => {

                                const data =
                                    docSnap.data() ||
                                    {};


                                if (
                                    data.date ===
                                    today
                                ) {

                                    count++;
                                }
                            }
                        );


                        todayBookings.textContent =
                            String(count);
                    },


                    (error) => {

                        console.warn(
                            "Booking counter error:",
                            error
                        );


                        todayBookings.textContent =
                            "0";
                    }
                );
    }


    /* =====================================================
       LOAD SALONS NOW
       ===================================================== */

    loadSalons();


    /* =====================================================
       GLOBAL DEBUG HELPERS
       ===================================================== */

    window.kasiWeb = {

        getCurrentUser:
            () => auth.currentUser,


        getSelectedSalon:
            () => selectedSalonData,


        getSelectedSalonId:
            () => selectedSalonId,


        reloadSalons:
            () => loadSalons(),


        syncOwnerSalonId:
            async () => {

                const user =
                    auth.currentUser;

                if (!user) {

                    console.warn(
                        "No logged-in user."
                    );

                    return null;
                }


                const userDoc =
                    await db
                        .collection("users")
                        .doc(user.uid)
                        .get();


                const userData =
                    userDoc.exists
                        ? userDoc.data() || {}
                        : {};


                return syncOwnerSalonId(
                    user,
                    userData
                );
            },


        db,

        auth
    };


    console.log(
        "K@si Web script.js loaded successfully."
    );

});
