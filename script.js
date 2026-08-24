document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 0. AUTOMATIC + TOUCH PICTURE SWIPER
    // =========================================================

    function initializeSwiper() {

        const swiperElement =
            document.querySelector('.elite-swiper');

        if (!swiperElement) {
            console.warn(
                'K@si Web: .elite-swiper was not found.'
            );
            return;
        }

        if (typeof Swiper === 'undefined') {
            console.error(
                'K@si Web: Swiper library was not loaded.'
            );
            return;
        }

        const wrapper =
            swiperElement.querySelector('.swiper-wrapper');

        const slides =
            swiperElement.querySelectorAll('.swiper-slide');

        if (!wrapper || slides.length === 0) {
            console.error(
                'K@si Web: Swiper requires .swiper-wrapper and at least one .swiper-slide.'
            );
            return;
        }

        const pagination =
            swiperElement.querySelector('.swiper-pagination');

        try {

            const eliteSwiper = new Swiper(
                swiperElement,
                {
                    // -------------------------------------------------
                    // Basic
                    // -------------------------------------------------
                    loop: slides.length > 1,
                    speed: 800,

                    slidesPerView: 1,
                    slidesPerGroup: 1,
                    spaceBetween: 0,

                    // -------------------------------------------------
                    // MOBILE TOUCH SWIPING
                    // -------------------------------------------------
                    allowTouchMove: true,

                    touchRatio: 1,

                    touchAngle: 45,

                    threshold: 5,

                    resistance: true,

                    resistanceRatio: 0.85,

                    grabCursor: true,

                    simulateTouch: true,

                    followFinger: true,

                    shortSwipes: true,

                    longSwipes: true,

                    longSwipesRatio: 0.5,

                    longSwipesMs: 300,

                    // -------------------------------------------------
                    // Automatic slideshow
                    // -------------------------------------------------
                    autoplay: {
                        delay: 2200,

                        disableOnInteraction: false,

                        pauseOnMouseEnter: false
                    },

                    // -------------------------------------------------
                    // Pagination dots
                    // -------------------------------------------------
                    pagination: pagination
                        ? {
                            el: pagination,

                            clickable: true
                        }
                        : undefined,

                    // -------------------------------------------------
                    // Prevent Swiper from interfering with normal
                    // vertical page scrolling
                    // -------------------------------------------------
                    touchStartPreventDefault: false,

                    passiveListeners: true
                }
            );

            console.log(
                'K@si Web: Swiper initialized successfully.',
                eliteSwiper
            );

            // ---------------------------------------------------------
            // Extra protection for Android touch devices
            // ---------------------------------------------------------

            swiperElement.style.touchAction =
                'pan-y';

            wrapper.style.touchAction =
                'pan-y';

        } catch (error) {

            console.error(
                'K@si Web: Swiper initialization failed:',
                error
            );
        }
    }

    /*
     * Initialize after the page has rendered.
     * This also gives the Swiper CDN a little extra time to load.
     */
    if (typeof Swiper !== 'undefined') {

        initializeSwiper();

    } else {

        window.addEventListener(
            'load',
            () => {
                initializeSwiper();
            },
            { once: true }
        );
    }


    // =========================================================
    // 1. TYPEWRITER WORD ANIMATION
    // =========================================================

    const words = [
        "Fresh Cuts",
        "No Lines",
        "Kasi Prices"
    ];

    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typedText =
        document.getElementById('typed-text');

    function type() {

        if (!typedText) return;

        const currentWord =
            words[wordIndex];

        if (isDeleting) {

            typedText.textContent =
                currentWord.substring(
                    0,
                    charIndex--
                );

        } else {

            typedText.textContent =
                currentWord.substring(
                    0,
                    charIndex++
                );
        }

        // Finished typing
        if (
            !isDeleting &&
            charIndex === currentWord.length
        ) {

            isDeleting = true;

            setTimeout(
                type,
                1500
            );

            return;
        }

        // Finished deleting
        if (
            isDeleting &&
            charIndex === 0
        ) {

            isDeleting = false;

            wordIndex =
                (wordIndex + 1) %
                words.length;
        }

        setTimeout(
            type,
            isDeleting
                ? 80
                : 120
        );
    }

    type();


    // =========================================================
    // 2. FIREBASE SAFETY CHECK
    // =========================================================

    if (
        !window.firebaseAuth ||
        !window.firebaseDB
    ) {

        console.error(
            'Firebase services not found on window object.'
        );

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
        serverTimestamp,
        logOut: signOut
    } = window;


    // =========================================================
    // 3. DOM ELEMENTS
    // =========================================================

    const salonList =
        document.getElementById(
            'salonList'
        );

    const bookingModal =
        document.getElementById(
            'bookingModal'
        );

    const bookingForm =
        document.getElementById(
            'bookingForm'
        );

    const closeModalBtn =
        document.getElementById(
            'closeModalBtn'
        );

    const adminBtn =
        document.getElementById(
            'adminBtn'
        );

    const logoutBtn =
        document.getElementById(
            'logoutBtn'
        );

    const searchBar =
        document.getElementById(
            'searchBar'
        );

    const searchBtn =
        document.getElementById(
            'searchBtn'
        );

    const bookingsToday =
        document.getElementById(
            'bookingsToday'
        );

    const custDateInput =
        document.getElementById(
            'custDate'
        );


    let selectedSalonId = null;

    let selectedSalonData = null;

    let allSalons = [];


    // =========================================================
    // 4. AUDIO + HAPTIC FEEDBACK
    // =========================================================

    const clickSound =
        document.getElementById(
            'clickSound'
        );

    if (clickSound) {
        clickSound.volume = 0.4;
    }

    function playClick() {

        if (clickSound) {

            try {

                clickSound.currentTime = 0;

                const playPromise =
                    clickSound.play();

                if (
                    playPromise &&
                    typeof playPromise.catch ===
                    'function'
                ) {

                    playPromise.catch(
                        () => {}
                    );
                }

            } catch (error) {

                console.warn(
                    'Click sound could not play:',
                    error
                );
            }
        }

        if (navigator.vibrate) {

            try {

                navigator.vibrate(30);

            } catch (error) {

                // Ignore vibration errors
            }
        }
    }


    document.addEventListener(
        'click',
        (event) => {

            const button =
                event.target.closest(
                    'button'
                );

            if (button) {
                playClick();
            }
        }
    );


    // =========================================================
    // 5. DATE INPUT RANGE
    // TODAY -> 30 DAYS
    // =========================================================

    if (custDateInput) {

        const today =
            new Date();

        const maxDate =
            new Date();

        maxDate.setDate(
            today.getDate() + 30
        );

        const todayString =
            today
                .toISOString()
                .split('T')[0];

        const maxDateString =
            maxDate
                .toISOString()
                .split('T')[0];

        custDateInput.min =
            todayString;

        custDateInput.max =
            maxDateString;
    }


    // =========================================================
    // 6. AUTHENTICATION + ROLE ROUTING
    // =========================================================

    if (
        typeof onAuthState ===
        'function'
    ) {

        onAuthState(
            auth,
            async (user) => {

                if (user) {

                    if (logoutBtn) {

                        logoutBtn.style.display =
                            'flex';
                    }

                    try {

                        const userRef =
                            dbDoc(
                                db,
                                'users',
                                user.uid
                            );

                        const userSnap =
                            await dbGet(
                                userRef
                            );

                        if (
                            !userSnap.exists()
                        ) {

                            console.warn(
                                'No user document found for:',
                                user.uid
                            );

                            if (adminBtn) {

                                adminBtn.style.display =
                                    'none';
                            }

                            return;
                        }

                        const userData =
                            userSnap.data() ||
                            {};

                        const role =
                            userData.role ||
                            'customer';

                        console.log(
                            'Logged in user:',
                            user.uid,
                            'Role:',
                            role
                        );


                        // ADMIN
                        if (
                            role === 'admin' &&
                            adminBtn
                        ) {

                            adminBtn.style.display =
                                'flex';

                            adminBtn.onclick =
                                () => {

                                    window.location.href =
                                        'admin.html';
                                };
                        }


                        // SALON OWNER
                        else if (
                            role === 'salon_owner' &&
                            adminBtn
                        ) {

                            adminBtn.style.display =
                                'flex';

                            adminBtn.onclick =
                                () => {

                                    window.location.href =
                                        'owners.html';
                                };
                        }


                        // CUSTOMER
                        else if (adminBtn) {

                            adminBtn.style.display =
                                'none';
                        }

                    } catch (error) {

                        console.error(
                            'User document fetch error:',
                            error
                        );

                        if (adminBtn) {

                            adminBtn.style.display =
                                'none';
                        }
                    }

                } else {

                    if (logoutBtn) {

                        logoutBtn.style.display =
                            'none';
                    }

                    if (adminBtn) {

                        adminBtn.style.display =
                            'none';
                    }
                }
            }
        );

    } else {

        console.error(
            'onAuthState function is missing from window.'
        );
    }


    // =========================================================
    // 7. LOAD SALONS FROM FIRESTORE
    // =========================================================

    if (salonList) {

        const salonsCollection =
            collection(
                db,
                'salons'
            );

        onSnapshot(
            salonsCollection,

            (snapshot) => {

                allSalons = [];

                salonList.innerHTML = '';

                if (snapshot.empty) {

                    salonList.innerHTML = `

                        <div
                            style="
                                text-align:center;
                                padding:40px 20px;
                                color:#888;
                            "
                        >

                            <i
                                class="bx bx-store-alt"
                                style="
                                    font-size:3rem;
                                    margin-bottom:10px;
                                "
                            ></i>

                            <p
                                style="
                                    font-size:1.1rem;
                                    font-weight:600;
                                    margin-bottom:5px;
                                "
                            >
                                No salons registered yet
                            </p>

                            <p
                                style="
                                    font-size:0.9rem;
                                "
                            >
                                The salons collection is empty.
                            </p>

                        </div>
                    `;

                    updateBookingCount();

                    return;
                }


                snapshot.forEach(
                    (docSnap) => {

                        const data =
                            docSnap.data() ||
                            {};

                        const ownerId =
                            data.ownerId ||
                            data.OwnerId ||
                            null;

                        const salon = {

                            ...data,

                            id:
                                docSnap.id,

                            salonId:
                                data.salonId ||
                                docSnap.id,

                            ownerId:
                                ownerId,

                            name:
                                data.name ||
                                'Unnamed Salon',

                            location:
                                data.location ||
                                'Soweto',

                            hours:
                                data.hours ||
                                '9AM - 6PM',

                            image:
                                data.image ||
                                '',

                            services:
                                Array.isArray(
                                    data.services
                                )
                                    ? data.services
                                    : []
                        };

                        allSalons.push(
                            salon
                        );
                    }
                );


                // Sort salons
                allSalons.sort(
                    (a, b) => {

                        return String(
                            a.name || ''
                        ).localeCompare(
                            String(
                                b.name || ''
                            )
                        );
                    }
                );


                console.log(
                    'Loaded salons:',
                    allSalons
                );


                allSalons.forEach(
                    (salon) => {

                        renderSalon(
                            salon
                        );
                    }
                );


                updateBookingCount();
            },

            (error) => {

                console.error(
                    'Firestore Salons Error:',
                    error
                );

                salonList.innerHTML = `

                    <div
                        style="
                            text-align:center;
                            padding:30px;
                            color:#ff4757;
                        "
                    >

                        <i
                            class="bx bx-error-circle"
                            style="
                                font-size:2.5rem;
                            "
                        ></i>

                        <p
                            style="
                                margin-top:10px;
                                font-weight:bold;
                            "
                        >
                            Failed to load salons
                        </p>

                        <small
                            style="
                                color:#aaa;
                                word-break:break-word;
                            "
                        >
                            ${escapeHtml(
                                error.message
                            )}
                        </small>

                    </div>
                `;
            }
        );
    }


    // =========================================================
    // 8. RENDER SALON CARD
    // =========================================================

    function renderSalon(salon) {

        const noOwner =
            !salon.ownerId;

        const card =
            document.createElement(
                'div'
            );

        card.className =
            'glass-card salon-card';


        const salonImage =
            salon.image
                ? `

                    <img
                        src="${escapeHtml(
                            salon.image
                        )}"
                        alt="${escapeHtml(
                            salon.name
                        )}"
                        loading="lazy"

                        style="
                            width:100%;
                            height:180px;
                            object-fit:cover;
                            border-radius:15px;
                            margin-bottom:12px;
                        "

                        onerror="
                            this.style.display='none';
                        "
                    >

                `
                : '';


        card.innerHTML = `

            ${salonImage}

            <h3>
                ${escapeHtml(
                    salon.name
                )}
            </h3>

            <p>
                <i class="bx bx-map"></i>
                ${escapeHtml(
                    salon.location ||
                    'Soweto'
                )}
            </p>

            <p>
                <i class="bx bx-time"></i>
                ${escapeHtml(
                    salon.hours ||
                    '9AM - 6PM'
                )}
            </p>

            ${
                noOwner
                    ? `

                        <small
                            style="
                                color:#ff4757;
                                display:block;
                                margin-bottom:8px;
                                font-weight:600;
                            "
                        >
                            ⚠️ This salon is not available
                            for online booking.
                        </small>

                    `
                    : ''
            }


            <button
                class="primary-btn bookBtn"
                data-id="${escapeHtml(
                    salon.id
                )}"

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
                Book Now
            </button>
        `;


        salonList.appendChild(
            card
        );
    }


    // =========================================================
    // 9. SEARCH FUNCTIONALITY
    // =========================================================

    if (
        searchBtn &&
        searchBar
    ) {

        const executeSearch =
            () => {

                const term =
                    searchBar.value
                        .toLowerCase()
                        .trim();

                if (!salonList) {
                    return;
                }

                salonList.innerHTML = '';

                const filtered =
                    allSalons.filter(
                        (salon) => {

                            const name =
                                String(
                                    salon.name ||
                                    ''
                                ).toLowerCase();

                            const location =
                                String(
                                    salon.location ||
                                    ''
                                ).toLowerCase();

                            return (
                                name.includes(
                                    term
                                ) ||
                                location.includes(
                                    term
                                )
                            );
                        }
                    );


                if (
                    filtered.length === 0
                ) {

                    salonList.innerHTML = `

                        <p
                            style="
                                text-align:center;
                                color:#888;
                                padding:20px;
                            "
                        >
                            No salons matching
                            "${escapeHtml(
                                term
                            )}"
                        </p>

                    `;

                    return;
                }


                filtered.forEach(
                    (salon) => {

                        renderSalon(
                            salon
                        );
                    }
                );
            };


        searchBtn.onclick =
            executeSearch;


        searchBar.addEventListener(
            'keyup',
            (event) => {

                if (
                    event.key ===
                    'Enter'
                ) {

                    executeSearch();
                }
            }
        );


        searchBar.addEventListener(
            'input',
            () => {

                executeSearch();
            }
        );
    }


    // =========================================================
    // 10. OPEN BOOKING MODAL
    // =========================================================

    if (salonList) {

        salonList.addEventListener(
            'click',
            (event) => {

                const bookBtn =
                    event.target.closest(
                        '.bookBtn'
                    );

                if (!bookBtn) {
                    return;
                }

                if (bookBtn.disabled) {
                    return;
                }


                if (!auth.currentUser) {

                    alert(
                        'Please login first to book an appointment.'
                    );

                    window.location.href =
                        'index.html';

                    return;
                }


                selectedSalonId =
                    bookBtn.dataset.id;


                selectedSalonData =
                    allSalons.find(
                        (salon) =>
                            salon.id ===
                            selectedSalonId
                    );


                if (!selectedSalonData) {

                    console.error(
                        'Selected salon could not be found:',
                        selectedSalonId
                    );

                    alert(
                        'Salon information could not be loaded.'
                    );

                    return;
                }


                if (
                    !selectedSalonData.ownerId
                ) {

                    alert(
                        'This salon is not configured for online booking yet.'
                    );

                    return;
                }


                console.log(
                    'Selected salon:',
                    selectedSalonData
                );


                if (bookingModal) {

                    bookingModal.classList.add(
                        'active'
                    );
                }


                populateServices(
                    selectedSalonData
                );
            }
        );
    }


    // =========================================================
    // 11. POPULATE SERVICES
    // =========================================================

    function populateServices(
        salon
    ) {

        const serviceElem =
            document.getElementById(
                'serviceType'
            );

        if (!serviceElem) {
            return;
        }


        const services =
            Array.isArray(
                salon.services
            )
                ? salon.services
                : [];


        if (
            services.length === 0
        ) {

            return;
        }


        serviceElem.innerHTML = `

            <option value="">
                Select a service
            </option>

        `;


        services.forEach(
            (item) => {

                let serviceName =
                    '';

                let servicePrice =
                    0;


                if (
                    typeof item ===
                        'object' &&
                    item !== null
                ) {

                    serviceName =
                        item.name ||
                        item.service ||
                        '';

                    servicePrice =
                        Number(
                            item.price ||
                            0
                        );

                } else {

                    serviceName =
                        String(item);

                    servicePrice =
                        0;
                }


                if (!serviceName) {
                    return;
                }


                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    `${serviceName} — R${servicePrice}`;


                option.textContent =
                    servicePrice > 0
                        ? `${serviceName} — R${servicePrice}`
                        : serviceName;


                serviceElem.appendChild(
                    option
                );
            }
        );
    }


    // =========================================================
    // 12. CLOSE BOOKING MODAL
    // =========================================================

    if (closeModalBtn) {

        closeModalBtn.addEventListener(
            'click',
            () => {

                if (bookingModal) {

                    bookingModal.classList.remove(
                        'active'
                    );
                }

                selectedSalonId =
                    null;

                selectedSalonData =
                    null;
            }
        );
    }


    if (bookingModal) {

        bookingModal.addEventListener(
            'click',
            (event) => {

                if (
                    event.target ===
                    bookingModal
                ) {

                    bookingModal.classList.remove(
                        'active'
                    );

                    selectedSalonId =
                        null;

                    selectedSalonData =
                        null;
                }
            }
        );
    }


    // =========================================================
    // 13. SUBMIT BOOKING
    // =========================================================

    if (bookingForm) {

        bookingForm.addEventListener(
            'submit',
            async (event) => {

                event.preventDefault();


                if (!auth.currentUser) {

                    alert(
                        'Please login first.'
                    );

                    window.location.href =
                        'index.html';

                    return;
                }


                if (!selectedSalonData) {

                    alert(
                        'Please select a salon first.'
                    );

                    return;
                }


                if (
                    !selectedSalonData.ownerId
                ) {

                    alert(
                        'This salon is not configured correctly for bookings.'
                    );

                    console.error(
                        'Missing ownerId:',
                        selectedSalonData
                    );

                    return;
                }


                const customerName =
                    document
                        .getElementById(
                            'custName'
                        )
                        ?.value
                        .trim() || '';


                const phone =
                    document
                        .getElementById(
                            'custPhone'
                        )
                        ?.value
                        .trim() || '';


                const date =
                    document
                        .getElementById(
                            'custDate'
                        )
                        ?.value || '';


                const time =
                    document
                        .getElementById(
                            'custTime'
                        )
                        ?.value || '';


                const serviceElem =
                    document.getElementById(
                        'serviceType'
                    );


                const serviceVal =
                    serviceElem
                        ? serviceElem.value.trim()
                        : '';


                if (!customerName) {

                    alert(
                        'Please enter your name.'
                    );

                    return;
                }


                if (!phone) {

                    alert(
                        'Please enter your phone number.'
                    );

                    return;
                }


                if (!serviceVal) {

                    alert(
                        'Please select a service.'
                    );

                    return;
                }


                if (!date) {

                    alert(
                        'Please select a date.'
                    );

                    return;
                }


                if (!time) {

                    alert(
                        'Please select a time.'
                    );

                    return;
                }


                let service =
                    serviceVal;

                let price =
                    0;


                if (
                    serviceVal.includes(
                        '— R'
                    )
                ) {

                    const parts =
                        serviceVal.split(
                            '— R'
                        );

                    service =
                        parts[0].trim();

                    price =
                        Number(
                            parts[1]
                                ?.replace(
                                    /[^\d.]/g,
                                    ''
                                )
                        ) || 0;

                } else if (
                    serviceVal.includes(
                        ' - R'
                    )
                ) {

                    const parts =
                        serviceVal.split(
                            ' - R'
                        );

                    service =
                        parts[0].trim();

                    price =
                        Number(
                            parts[1]
                                ?.replace(
                                    /[^\d.]/g,
                                    ''
                                )
                        ) || 0;

                } else if (
                    serviceVal.includes('R')
                ) {

                    const parts =
                        serviceVal.split('R');

                    service =
                        parts[0].trim();

                    price =
                        Number(
                            parts[1]
                                ?.replace(
                                    /[^\d.]/g,
                                    ''
                                )
                        ) || 0;
                }


                const bookingData = {

                    userId:
                        auth.currentUser.uid,

                    ownerId:
                        selectedSalonData.ownerId,

                    salonId:
                        selectedSalonId,

                    salonName:
                        selectedSalonData.name,

                    salon:
                        selectedSalonData.name,

                    customerName:
                        customerName,

                    name:
                        customerName,

                    phone:
                        phone,

                    service:
                        service,

                    price:
                        price,

                    date:
                        date,

                    time:
                        time,

                    status:
                        'pending',

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()
                };


                console.log(
                    'Creating booking:',
                    bookingData
                );


                try {

                    await addDoc(
                        collection(
                            db,
                            'bookings'
                        ),
                        bookingData
                    );


                    alert(
                        'Booking placed! Owner will approve soon 💈'
                    );


                    if (bookingModal) {

                        bookingModal.classList.remove(
                            'active'
                        );
                    }


                    bookingForm.reset();


                    selectedSalonId =
                        null;

                    selectedSalonData =
                        null;

                } catch (error) {

                    console.error(
                        'Booking error:',
                        error
                    );

                    alert(
                        'Booking failed: ' +
                        (
                            error.message ||
                            'Unknown error'
                        )
                    );
                }
            }
        );
    }


    // =========================================================
    // 14. TODAY'S BOOKING COUNTER
    // =========================================================

    function updateBookingCount() {

        if (!bookingsToday) {
            return;
        }


        const todayStr =
            new Date()
                .toISOString()
                .split('T')[0];


        try {

            const bookingsCollection =
                collection(
                    db,
                    'bookings'
                );


            const qBookings =
                query(
                    bookingsCollection,

                    where(
                        'date',
                        '==',
                        todayStr
                    )
                );


            onSnapshot(
                qBookings,

                (snapshot) => {

                    bookingsToday.textContent =
                        `${snapshot.size} bookings today`;
                },

                (error) => {

                    console.error(
                        'Booking count error:',
                        error
                    );

                    bookingsToday.textContent =
                        'Bookings today';
                }
            );

        } catch (error) {

            console.error(
                'Booking count setup error:',
                error
            );

            bookingsToday.textContent =
                'Bookings today';
        }
    }


    // =========================================================
    // 15. LOGOUT
    // =========================================================

    if (logoutBtn) {

        logoutBtn.onclick =
            async () => {

                try {

                    await signOut(
                        auth
                    );

                    window.location.href =
                        'index.html';

                } catch (error) {

                    console.error(
                        'Logout error:',
                        error
                    );

                    alert(
                        'Logout failed: ' +
                        error.message
                    );
                }
            };
    }


    // =========================================================
    // 16. COOKIE + ONESIGNAL CONSENT
    // =========================================================

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

    const subBtn =
        document.getElementById(
            'subscribe-btn'
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
            1000
        );
    }


    function saveChoice(
        choice
    ) {

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


    // ACCEPT ALL
    if (acceptAll) {

        acceptAll.addEventListener(
            'click',
            () => {

                saveChoice(
                    'all'
                );


                if (
                    window.OneSignalDeferred
                ) {

                    OneSignalDeferred.push(
                        async function (
                            OneSignal
                        ) {

                            try {

                                await OneSignal.showNativePrompt();

                                await OneSignal.registerForPushNotifications();

                            } catch (error) {

                                console.error(
                                    'Notification permission error:',
                                    error
                                );
                            }
                        }
                    );
                }
            }
        );
    }


    // ESSENTIAL ONLY
    if (essential) {

        essential.addEventListener(
            'click',
            () => {

                saveChoice(
                    'essential'
                );
            }
        );
    }


    // CLOSE
    if (closeBtn) {

        closeBtn.addEventListener(
            'click',
            () => {

                saveChoice(
                    'essential'
                );
            }
        );
    }


    // SUBSCRIBE
    if (subBtn) {

        subBtn.addEventListener(
            'click',
            () => {

                const choice =
                    localStorage.getItem(
                        'kasiCookieChoice'
                    );


                if (
                    choice !== 'all'
                ) {

                    alert(
                        'Please accept all cookies first to enable notifications 🍪'
                    );


                    if (banner) {

                        banner.style.display =
                            'flex';
                    }

                    return;
                }


                if (
                    window.OneSignalDeferred
                ) {

                    OneSignalDeferred.push(
                        async function (
                            OneSignal
                        ) {

                            try {

                                await OneSignal.showNativePrompt();

                            } catch (error) {

                                console.error(
                                    'Notification prompt error:',
                                    error
                                );
                            }
                        }
                    );
                }
            }
        );
    }


    // =========================================================
    // 17. HTML ESCAPE
    // =========================================================

    function escapeHtml(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return '';
        }


        return String(value)

            .replace(
                /&/g,
                '&amp;'
            )

            .replace(
                /</g,
                '&lt;'
            )

            .replace(
                />/g,
                '&gt;'
            )

            .replace(
                /"/g,
                '&quot;'
            )

            .replace(
                /'/g,
                '&#039;'
            );
    }

});
