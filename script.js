/* =========================================================
   K@si Web - script.js
   Firebase COMPAT
   Stable / Anti-Stuck Loading Version
   ========================================================= */

(() => {

    /* =====================================================
       PREVENT SCRIPT FROM RUNNING TWICE
       ===================================================== */

    if (window.__KASI_SCRIPT_LOADED__) {
        console.warn("K@si Web: script.js already loaded.");
        return;
    }

    window.__KASI_SCRIPT_LOADED__ = true;


    /* =====================================================
       DOM READY
       ===================================================== */

    document.addEventListener("DOMContentLoaded", () => {

        console.log("K@si Web: script.js starting...");


        /* =================================================
           LOADING SCREEN
           ================================================= */

        let loadingFinished = false;


        function getLoadingElements() {

            const elements = [];

            const selectors = [
                "#loadingScreen",
                "#loader",
                "#pageLoader",
                "#kasiLoader",
                ".loading-screen",
                ".loader-screen",
                ".page-loader",
                ".kasi-loader"
            ];


            selectors.forEach(selector => {

                document
                    .querySelectorAll(selector)
                    .forEach(element => {

                        if (!elements.includes(element)) {
                            elements.push(element);
                        }

                    });

            });


            /*
             * Also find a screen containing the exact
             * text shown in the current K@si loading screen.
             */

            document
                .querySelectorAll("body *")
                .forEach(element => {

                    if (
                        element.children.length === 0 &&
                        element.textContent &&
                        element.textContent
                            .trim()
                            .toLowerCase()
                            .includes(
                                "loading your k@si space"
                            )
                    ) {

                        let parent = element.parentElement;

                        for (
                            let i = 0;
                            i < 5 && parent;
                            i++
                        ) {

                            const style =
                                window.getComputedStyle(
                                    parent
                                );

                            const position =
                                style.position;

                            const fixedOrFull =
                                position === "fixed" ||
                                position === "absolute";

                            if (
                                fixedOrFull ||
                                parent.id ||
                                parent.className
                            ) {

                                if (
                                    !elements.includes(
                                        parent
                                    )
                                ) {

                                    elements.push(
                                        parent
                                    );
                                }

                                break;
                            }

                            parent =
                                parent.parentElement;
                        }
                    }

                });


            return elements;
        }


        function hideLoadingScreen(
            reason = "normal"
        ) {

            if (loadingFinished) {
                return;
            }

            loadingFinished = true;

            console.log(
                "K@si loading screen released:",
                reason
            );


            const elements =
                getLoadingElements();


            elements.forEach(element => {

                try {

                    element.style.opacity = "0";
                    element.style.visibility = "hidden";
                    element.style.pointerEvents = "none";

                    /*
                     * Do not use display:none immediately.
                     * This allows CSS transitions to finish.
                     */

                    setTimeout(() => {

                        try {

                            element.style.display =
                                "none";

                        } catch (_) {}

                    }, 350);

                } catch (error) {

                    console.warn(
                        "Could not hide loader:",
                        error
                    );
                }

            });


            document.body.classList.remove(
                "loading"
            );

            document.body.classList.remove(
                "is-loading"
            );

            document.documentElement.classList.remove(
                "loading"
            );

        }


        /*
         * IMPORTANT:
         *
         * Never allow the loading screen to remain
         * forever, even if Firebase or Firestore hangs.
         */

        const LOADING_FAILSAFE =
            setTimeout(() => {

                hideLoadingScreen(
                    "failsafe timeout"
                );

            }, 7000);


        /*
         * If the browser finishes loading normally,
         * release the screen too.
         */

        window.addEventListener(
            "load",
            () => {

                setTimeout(() => {

                    hideLoadingScreen(
                        "window load"
                    );

                }, 250);

            },
            {
                once: true
            }
        );


        /* =================================================
           BASIC UI ELEMENTS
           ================================================= */

        const authSection =
            document.getElementById(
                "authSection"
            );

        const logoutBtn =
            document.getElementById(
                "logoutBtn"
            );

        const adminBtn =
            document.getElementById(
                "adminBtn"
            );

        const bookingModal =
            document.getElementById(
                "bookingModal"
            );

        const closeBookingModal =
            document.getElementById(
                "closeBookingModal"
            );

        const cancelBookingBtn =
            document.getElementById(
                "cancelBookingBtn"
            );

        const bookingForm =
            document.getElementById(
                "bookingForm"
            );

        const salonsContainer =
            document.getElementById(
                "salonsContainer"
            ) ||
            document.getElementById(
                "salonContainer"
            ) ||
            document.getElementById(
                "salonsGrid"
            );

        const serviceType =
            document.getElementById(
                "serviceType"
            );

        const custName =
            document.getElementById(
                "custName"
            );

        const custPhone =
            document.getElementById(
                "custPhone"
            );

        const custDate =
            document.getElementById(
                "custDate"
            );

        const custTime =
            document.getElementById(
                "custTime"
            );

        const bookingMessage =
            document.getElementById(
                "bookingMessage"
            ) ||
            document.getElementById(
                "bookingStatus"
            );

        const todayBookings =
            document.getElementById(
                "todayBookings"
            ) ||
            document.getElementById(
                "bookingsToday"
            );


        /* =================================================
           FIREBASE CHECK
           ================================================= */

        const auth =
            window.firebaseAuth;

        const db =
            window.firebaseDB;


        if (!auth || !db) {

            console.error(
                "K@si Web: Firebase Auth or Firestore missing."
            );


            hideLoadingScreen(
                "Firebase unavailable"
            );


            if (bookingMessage) {

                bookingMessage.textContent =
                    "Firebase is not connected. Please refresh the page.";

                bookingMessage.className +=
                    " text-red-400";
            }


            /*
             * DO NOT return before releasing the loader.
             */

            return;
        }


        console.log(
            "K@si Web: Firebase connected."
        );


        /* =================================================
           GLOBAL STATE
           ================================================= */

        let currentUser =
            auth.currentUser || null;

        let selectedSalonData =
            null;

        let selectedSalonId =
            null;

        let bookingCounterUnsubscribe =
            null;

        let salonsUnsubscribe =
            null;


        /* =================================================
           HELPERS
           ================================================= */

        function escapeHtml(value) {

            if (
                value === null ||
                value === undefined
            ) {

                return "";
            }

            return String(value)
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


        function showMessage(
            message,
            type = "info"
        ) {

            console.log(
                "K@si message:",
                message
            );


            if (!bookingMessage) {
                return;
            }


            bookingMessage.textContent =
                message;


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

            } else if (
                type === "success"
            ) {

                bookingMessage.classList.add(
                    "text-green-400"
                );

            } else if (
                type === "warning"
            ) {

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

                if (
                    navigator.vibrate
                ) {

                    navigator.vibrate(
                        30
                    );
                }

            } catch (_) {}
        }


        function playClickSound() {

            try {

                const sound =
                    document.getElementById(
                        "clickSound"
                    );


                if (sound) {

                    sound.currentTime = 0;

                    sound
                        .play()
                        .catch(() => {});
                }

            } catch (_) {}
        }


        function formatPrice(price) {

            const number =
                Number(price);


            if (
                !Number.isFinite(number) ||
                number <= 0
            ) {

                return "";
            }


            return `R${number}`;
        }


        function getServiceName(
            service
        ) {

            if (
                typeof service ===
                "string"
            ) {

                return service.trim();
            }


            if (
                !service ||
                typeof service !==
                "object"
            ) {

                return "";
            }


            return String(
                service.name ||
                service.service ||
                service.title ||
                service.serviceName ||
                ""
            ).trim();
        }


        function getServicePrice(
            service
        ) {

            if (
                typeof service ===
                "string" ||
                !service ||
                typeof service !==
                "object"
            ) {

                return 0;
            }


            const price =
                service.price ??
                service.amount ??
                service.cost ??
                0;


            const number =
                Number(price);


            return Number.isFinite(number)
                ? number
                : 0;
        }


        /* =================================================
           SOUTH AFRICA DATE
           ================================================= */

        function getSouthAfricaDate() {

            try {

                const formatter =
                    new Intl.DateTimeFormat(
                        "en-CA",
                        {
                            timeZone:
                                "Africa/Johannesburg",

                            year:
                                "numeric",

                            month:
                                "2-digit",

                            day:
                                "2-digit"
                        }
                    );


                return formatter.format(
                    new Date()
                );

            } catch (_) {

                return formatInputDate(
                    new Date()
                );
            }
        }


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


        /* =================================================
           SAFE FIRESTORE GET
           
           Prevent Firestore from holding the page forever.
           ================================================= */

        function firestoreGetWithTimeout(
            promise,
            timeout = 5000
        ) {

            return Promise.race([

                promise,

                new Promise(
                    (_, reject) => {

                        setTimeout(() => {

                            const error =
                                new Error(
                                    "Firestore request timed out."
                                );

                            error.code =
                                "deadline-exceeded";

                            reject(
                                error
                            );

                        }, timeout);

                    }
                )

            ]);
        }


        /* =================================================
           TYPEWRITER
           ================================================= */

        const typewriterElement =
            document.getElementById(
                "typewriter"
            ) ||
            document.querySelector(
                ".typewriter"
            );


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

                if (
                    !typewriterElement
                ) {

                    return;
                }


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
                        charIndex >=
                        word.length
                    ) {

                        deleting =
                            true;


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
                            Math.max(
                                0,
                                charIndex - 1
                            )
                        );


                    charIndex--;


                    if (
                        charIndex <= 0
                    ) {

                        charIndex = 0;

                        deleting =
                            false;


                        wordIndex =
                            (
                                wordIndex + 1
                            ) %
                            words.length;
                    }
                }


                setTimeout(
                    typeWriter,
                    deleting
                        ? 70
                        : 110
                );
            }


            typeWriter();
        }


        /* =================================================
           SWIPER
           ================================================= */

        if (
            typeof Swiper !==
                "undefined" &&
            document.querySelector(
                ".elite-swiper"
            )
        ) {

            try {

                new Swiper(
                    ".elite-swiper",
                    {

                        effect:
                            "coverflow",

                        grabCursor:
                            true,

                        centeredSlides:
                            true,

                        slidesPerView:
                            "auto",

                        loop:
                            true,

                        autoplay: {

                            delay:
                                3000,

                            disableOnInteraction:
                                false
                        },

                        coverflowEffect: {

                            rotate:
                                15,

                            stretch:
                                0,

                            depth:
                                100,

                            modifier:
                                1,

                            slideShadows:
                                true
                        },

                        pagination: {

                            el:
                                ".swiper-pagination",

                            clickable:
                                true
                        },

                        touchRatio:
                            1,

                        touchAngle:
                            45,

                        simulateTouch:
                            true
                    }
                );

            } catch (error) {

                console.warn(
                    "Swiper unavailable:",
                    error
                );
            }
        }


        /* =================================================
           OWNER SALON ID
           ================================================= */

        async function syncOwnerSalonId(
            user,
            userData = {}
        ) {

            if (!user) {
                return null;
            }


            const role =
                String(
                    userData.role ||
                    userData.userRole ||
                    userData.Role ||
                    "customer"
                ).toLowerCase();


            if (
                role !==
                "salon_owner"
            ) {

                return (
                    userData.salonId ||
                    null
                );
            }


            /* =============================================
               CHECK EXISTING salonId
               ============================================= */

            const existingSalonId =
                userData.salonId ||
                null;


            if (existingSalonId) {

                try {

                    const salonDoc =
                        await firestoreGetWithTimeout(
                            db
                                .collection(
                                    "salons"
                                )
                                .doc(
                                    existingSalonId
                                )
                                .get(),
                            4000
                        );


                    if (
                        salonDoc.exists
                    ) {

                        const data =
                            salonDoc.data() ||
                            {};


                        const ownerId =
                            data.ownerId ||
                            data.OwnerId ||
                            null;


                        if (
                            ownerId ===
                            user.uid
                        ) {

                            return existingSalonId;
                        }
                    }

                } catch (error) {

                    console.warn(
                        "Existing salon check failed:",
                        error
                    );
                }
            }


            /* =============================================
               FIND BY ownerId
               ============================================= */

            try {

                const snapshot =
                    await firestoreGetWithTimeout(
                        db
                            .collection(
                                "salons"
                            )
                            .where(
                                "ownerId",
                                "==",
                                user.uid
                            )
                            .limit(1)
                            .get(),
                        4000
                    );


                if (
                    !snapshot.empty
                ) {

                    const salonId =
                        snapshot.docs[0].id;


                    try {

                        await db
                            .collection(
                                "users"
                            )
                            .doc(
                                user.uid
                            )
                            .set(
                                {
                                    salonId:
                                        salonId,

                                    role:
                                        "salon_owner"
                                },
                                {
                                    merge:
                                        true
                                }
                            );

                    } catch (error) {

                        console.warn(
                            "Could not sync user salonId:",
                            error
                        );
                    }


                    return salonId;
                }

            } catch (error) {

                console.warn(
                    "ownerId lookup failed:",
                    error
                );
            }


            /*
             * Compatibility with older Firestore
             * documents using OwnerId.
             */

            try {

                const snapshot =
                    await firestoreGetWithTimeout(
                        db
                            .collection(
                                "salons"
                            )
                            .where(
                                "OwnerId",
                                "==",
                                user.uid
                            )
                            .limit(1)
                            .get(),
                        4000
                    );


                if (
                    !snapshot.empty
                ) {

                    const salonId =
                        snapshot.docs[0].id;


                    try {

                        await db
                            .collection(
                                "users"
                            )
                            .doc(
                                user.uid
                            )
                            .set(
                                {
                                    salonId:
                                        salonId,

                                    role:
                                        "salon_owner"
                                },
                                {
                                    merge:
                                        true
                                }
                            );

                    } catch (error) {

                        console.warn(
                            "Could not sync legacy salonId:",
                            error
                        );
                    }


                    return salonId;
                }

            } catch (error) {

                console.warn(
                    "Legacy OwnerId lookup failed:",
                    error
                );
            }


            return null;
        }


        /* =================================================
           AUTH STATE
           
           IMPORTANT:
           Loading screen is released BEFORE slow Firestore
           profile operations.
           ================================================= */

        auth.onAuthStateChanged(
            async user => {

                currentUser =
                    user || null;


                console.log(
                    "Auth state:",
                    user
                        ? user.uid
                        : "logged out"
                );


                /*
                 * THIS IS THE IMPORTANT FIX.
                 *
                 * Never wait for users/{uid}, salon lookup,
                 * booking listener, etc. before releasing
                 * the loading screen.
                 */

                hideLoadingScreen(
                    user
                        ? "Firebase Auth ready"
                        : "No user session"
                );


                clearTimeout(
                    LOADING_FAILSAFE
                );


                /* =========================================
                   LOGGED OUT
                   ========================================= */

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


                /* =========================================
                   LOGGED IN
                   ========================================= */

                if (logoutBtn) {

                    logoutBtn.classList.remove(
                        "hidden"
                    );
                }


                /*
                 * Do NOT block the UI while this happens.
                 */

                try {

                    const userDoc =
                        await firestoreGetWithTimeout(
                            db
                                .collection(
                                    "users"
                                )
                                .doc(
                                    user.uid
                                )
                                .get(),
                            5000
                        );


                    const userData =
                        userDoc.exists
                            ? (
                                userDoc.data() ||
                                {}
                            )
                            : {};


                    const role =
                        String(
                            userData.role ||
                            userData.userRole ||
                            userData.Role ||
                            "customer"
                        ).toLowerCase();


                    console.log(
                        "K@si user role:",
                        role
                    );


                    /* =====================================
                       ADMIN BUTTON
                       ===================================== */

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


                    /* =====================================
                       OWNER SYNC
                       ===================================== */

                    if (
                        role ===
                        "salon_owner"
                    ) {

                        syncOwnerSalonId(
                            user,
                            userData
                        )
                        .then(
                            salonId => {

                                console.log(
                                    "Canonical owner salon ID:",
                                    salonId
                                );

                            }
                        )
                        .catch(
                            error => {

                                console.warn(
                                    "Owner salon sync failed:",
                                    error
                                );

                            }
                        );
                    }


                    /* =====================================
                       BOOKING COUNTER
                       ===================================== */

                    updateBookingCounter(
                        user
                    );


                } catch (error) {

                    console.warn(
                        "User profile load failed:",
                        error
                    );


                    /*
                     * VERY IMPORTANT:
                     *
                     * Even if users/{uid} fails,
                     * the page remains usable.
                     */

                    if (adminBtn) {

                        adminBtn.classList.add(
                            "hidden"
                        );
                    }


                    updateBookingCounter(
                        user
                    );
                }

            }
        );


        /* =================================================
           LOGOUT
           ================================================= */

        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                async () => {

                    playClickSound();
                    vibrate();


                    logoutBtn.disabled =
                        true;


                    try {

                        await auth.signOut();


                        console.log(
                            "K@si user logged out."
                        );


                        window.location.href =
                            "index.html";


                    } catch (error) {

                        console.error(
                            "Logout error:",
                            error
                        );


                        logoutBtn.disabled =
                            false;
                    }

                }
            );
        }


        /* =================================================
           LOAD SALONS
           ================================================= */

        function loadSalons() {

            if (!salonsContainer) {

                console.log(
                    "Salon container not present on this page."
                );

                return;
            }


            salonsContainer.innerHTML = `

                <div class="
                    col-span-full
                    text-center
                    py-10
                ">

                    <div class="
                        inline-block
                        w-8
                        h-8
                        border-2
                        border-gray-700
                        border-t-blue-500
                        rounded-full
                        animate-spin
                        mb-4
                    "></div>

                    <p class="text-gray-400">
                        Loading salons...
                    </p>

                </div>

            `;


            if (
                typeof salonsUnsubscribe ===
                "function"
            ) {

                salonsUnsubscribe();

                salonsUnsubscribe =
                    null;
            }


            salonsUnsubscribe =
                db
                    .collection(
                        "salons"
                    )
                    .onSnapshot(

                        snapshot => {

                            console.log(
                                "Firestore salons:",
                                snapshot.size
                            );


                            if (
                                snapshot.empty
                            ) {

                                salonsContainer.innerHTML = `

                                    <div class="
                                        col-span-full
                                        text-center
                                        py-12
                                    ">

                                        <div class="
                                            text-4xl
                                            mb-4
                                        ">
                                            💈
                                        </div>

                                        <h3 class="
                                            text-white
                                            font-bold
                                            text-lg
                                            mb-2
                                        ">
                                            No salons yet
                                        </h3>

                                        <p class="
                                            text-gray-500
                                            text-sm
                                        ">
                                            No salons are registered yet.
                                        </p>

                                    </div>

                                `;

                                return;
                            }


                            const salons = [];


                            snapshot.forEach(
                                docSnap => {

                                    const data =
                                        docSnap.data() ||
                                        {};


                                    /*
                                     * CANONICAL ID
                                     *
                                     * This is ALWAYS the
                                     * Firestore document ID.
                                     */

                                    const realSalonId =
                                        docSnap.id;


                                    const ownerId =
                                        data.ownerId ||
                                        data.OwnerId ||
                                        null;


                                    let services =
                                        Array.isArray(
                                            data.services
                                        )
                                            ? data.services
                                            : [];


                                    /*
                                     * Remove exact duplicate
                                     * service entries.
                                     */

                                    const serviceKeys =
                                        new Set();


                                    services =
                                        services.filter(
                                            service => {

                                                const name =
                                                    getServiceName(
                                                        service
                                                    )
                                                        .toLowerCase();

                                                const price =
                                                    getServicePrice(
                                                        service
                                                    );

                                                const key =
                                                    `${name}|${price}`;

                                                if (
                                                    serviceKeys.has(
                                                        key
                                                    )
                                                ) {

                                                    return false;
                                                }


                                                serviceKeys.add(
                                                    key
                                                );


                                                return true;
                                            }
                                        );


                                    salons.push({

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
                                            "South Africa",

                                        hours:
                                            data.hours ||
                                            "09:00 - 18:00",

                                        image:
                                            data.image ||
                                            "",

                                        services:
                                            services
                                    });

                                }
                            );


                            salons.sort(
                                (a, b) =>
                                    String(
                                        a.name
                                    ).localeCompare(
                                        String(
                                            b.name
                                        )
                                    )
                            );


                            salonsContainer.innerHTML =
                                "";


                            salons.forEach(
                                salon => {

                                    salonsContainer.appendChild(
                                        renderSalon(
                                            salon
                                        )
                                    );

                                }
                            );

                        },

                        error => {

                            console.error(
                                "Salon loading error:",
                                error
                            );


                            salonsContainer.innerHTML = `

                                <div class="
                                    col-span-full
                                    text-center
                                    py-12
                                ">

                                    <div class="
                                        text-4xl
                                        mb-4
                                    ">
                                        ⚠️
                                    </div>

                                    <h3 class="
                                        text-white
                                        font-bold
                                        text-lg
                                        mb-2
                                    ">
                                        Couldn't load salons
                                    </h3>

                                    <p class="
                                        text-gray-500
                                        text-sm
                                        mb-4
                                    ">
                                        Please refresh and try again.
                                    </p>

                                    <button
                                        type="button"
                                        id="retrySalonsBtn"
                                        class="
                                            px-5
                                            py-3
                                            rounded-xl
                                            bg-blue-600
                                            text-white
                                            font-semibold
                                        "
                                    >
                                        Try Again
                                    </button>

                                </div>

                            `;


                            const retry =
                                document.getElementById(
                                    "retrySalonsBtn"
                                );


                            if (retry) {

                                retry.addEventListener(
                                    "click",
                                    () => {

                                        playClickSound();
                                        vibrate();

                                        loadSalons();

                                    }
                                );
                            }

                        }
                    );
        }


        /* =================================================
           RENDER SALON
           ================================================= */

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


            const services =
                Array.isArray(
                    salon.services
                )
                    ? salon.services
                    : [];


            const serviceHtml =
                services.length

                    ? services
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


                                if (!name) {
                                    return "";
                                }


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
                                                ? ` — ${escapeHtml(
                                                    formatPrice(
                                                        price
                                                    )
                                                )}`
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

                    `;


            card.innerHTML = `

                <div class="relative">

                    <img
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(salon.name)}"
                        class="
                            w-full
                            h-48
                            object-cover
                        "
                        loading="lazy"
                        onerror="
                            this.onerror=null;
                            this.src='https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80';
                        "
                    >


                    <div class="
                        absolute
                        top-3
                        right-3
                        bg-black/75
                        backdrop-blur-md
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

                            ${serviceHtml}

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


        /* =================================================
           OPEN BOOKING MODAL
           ================================================= */

        function openBookingModal(
            salon
        ) {

            if (!auth.currentUser) {

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


            const ownerId =
                salon.ownerId ||
                salon.OwnerId ||
                null;


            if (!ownerId) {

                alert(
                    "This salon is not connected to an owner yet."
                );

                return;
            }


            selectedSalonData =
                salon;


            selectedSalonId =
                salon.id;


            console.log(
                "Selected salon:",
                salon.name
            );


            console.log(
                "Canonical salon ID:",
                selectedSalonId
            );


            populateServices(
                salon
            );


            /* =============================================
               PREFILL NAME
               ============================================= */

            if (
                custName &&
                !custName.value
            ) {

                db
                    .collection(
                        "users"
                    )
                    .doc(
                        currentUser.uid
                    )
                    .get()
                    .then(
                        docSnap => {

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


                            if (
                                name &&
                                custName
                            ) {

                                custName.value =
                                    name;
                            }

                        }
                    )
                    .catch(
                        error => {

                            console.warn(
                                "Name prefill failed:",
                                error
                            );

                        }
                    );
            }


            /* =============================================
               DATE
               ============================================= */

            if (custDate) {

                const today =
                    new Date();


                const maxDate =
                    new Date();


                maxDate.setDate(
                    maxDate.getDate() +
                    30
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


        /* =================================================
           POPULATE SERVICES
           ================================================= */

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
                service => {

                    const name =
                        getServiceName(
                            service
                        );


                    const price =
                        getServicePrice(
                            service
                        );


                    if (!name) {
                        return;
                    }


                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        name;


                    option.textContent =
                        price > 0
                            ? `${name} — R${price}`
                            : name;


                    option.dataset.price =
                        String(
                            price
                        );


                    serviceType.appendChild(
                        option
                    );
                }
            );
        }


        /* =================================================
           CLOSE MODAL
           ================================================= */

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
                event => {

                    if (
                        event.target ===
                        bookingModal
                    ) {

                        closeModal();
                    }

                }
            );
        }


        /* =================================================
           BOOKING SUBMISSION
           ================================================= */

        if (bookingForm) {

            bookingForm.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const user =
                        auth.currentUser;


                    /* =====================================
                       AUTH
                       ===================================== */

                    if (!user) {

                        showMessage(
                            "Please log in before booking.",
                            "error"
                        );

                        return;
                    }


                    /* =====================================
                       SALON
                       ===================================== */

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
                            "This salon has no owner ID.",
                            "error"
                        );

                        return;
                    }


                    /*
                     * REAL FIRESTORE DOCUMENT ID.
                     */

                    const canonicalSalonId =
                        selectedSalonData.id;


                    if (
                        !canonicalSalonId
                    ) {

                        showMessage(
                            "Invalid salon Firestore ID.",
                            "error"
                        );

                        return;
                    }


                    /* =====================================
                       VALUES
                       ===================================== */

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


                    /* =====================================
                       VALIDATION
                       ===================================== */

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


                    /* =====================================
                       PRICE
                       ===================================== */

                    const selectedOption =
                        serviceType
                            ? serviceType.options[
                                serviceType
                                    .selectedIndex
                            ]
                            : null;


                    const price =
                        selectedOption
                            ? Number(
                                selectedOption
                                    .dataset
                                    .price ||
                                0
                            )
                            : 0;


                    /* =====================================
                       BOOKING OBJECT
                       ===================================== */

                    const bookingData = {

                        userId:
                            user.uid,

                        ownerId:
                            ownerId,

                        salonId:
                            canonicalSalonId,

                        salonName:
                            selectedSalonData.name ||
                            "Salon",

                        customerName:
                            customerName,

                        phone:
                            phone,

                        service:
                            serviceName,

                        price:
                            price,

                        date:
                            date,

                        time:
                            time,

                        status:
                            "pending",

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
                        "Creating booking:",
                        bookingData
                    );


                    /* =====================================
                       BUTTON
                       ===================================== */

                    const submitButton =
                        bookingForm.querySelector(
                            'button[type="submit"]'
                        );


                    const originalText =
                        submitButton
                            ? submitButton.textContent
                            : "Confirm Booking";


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
