document.addEventListener('DOMContentLoaded', () => {
    if (!window.firebaseAuth) return;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const onAuthState = window.onAuthState;
    const dbDoc = window.dbDoc; const dbGet = window.dbGet;
    const addDoc = window.addDoc; const collection = window.collection;
    const onSnapshot = window.onSnapshot; const query = window.query;
    const where = window.where; const orderBy = window.orderBy;
    const serverTimestamp = window.serverTimestamp;
    const signOut = window.logOut;

    const salonList = document.getElementById('salonList');
    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('searchBtn');
    const bookingsToday = document.getElementById('bookingsToday');

    let selectedSalonId = null;
    let selectedSalonData = null;
    let allSalons = [];

    // Set min date to today
    document.getElementById('custDate').min = new Date().toISOString().split('T')[0];

    // 1. AUTH + SHOW DASHBOARD BUTTON
    onAuthState(auth, async (user) => {
        if(user) {
            logoutBtn.style.display = 'flex';
            const userSnap = await dbGet(dbDoc(db, "users", user.uid));
            if(userSnap.exists()){
                const role = userSnap.data().role;
                if(role === 'admin' || role === 'salon_owner') adminBtn.style.display = 'flex';
                adminBtn.onclick = () => window.location.href = role === 'admin'? 'admin.html' : 'owners.html';
            }
        } else {
            logoutBtn.style.display = 'none';
            adminBtn.style.display = 'none';
        }
    });

    // 2. LOAD SALONS
    const q = query(collection(db, "salons"), orderBy("name"));
    onSnapshot(q, (snapshot) => {
        allSalons = [];
        salonList.innerHTML = "";
        if(snapshot.empty) {
            salonList.innerHTML = `<p style="text-align:center; color:#888;">No salons yet. Ask admin to add one.</p>`;
            return;
        }
        snapshot.forEach(docSnap => {
            const salon = { id: docSnap.id,...docSnap.data() };
            allSalons.push(salon);
            renderSalon(salon);
        });
        updateBookingCount();
    });

    function renderSalon(salon){
        const noOwner =!salon.ownerId;
        const card = document.createElement('div');
        card.className = 'glass-card salon-card';
        card.innerHTML = `
            <h3>${salon.name}</h3>
            <p><i class='bx bx-map'></i> ${salon.location || 'Soweto'}</p>
            <p><i class='bx bx-time'></i> ${salon.hours || '9AM - 6PM'}</p>
            ${noOwner? `<small style="color:#ff4757; display:block; margin-bottom:8px;">⚠️ Not available for booking</small>` : ''}
            <button class="primary-btn bookBtn" data-id="${salon.id}" ${noOwner? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Book Now</button>
        `;
        salonList.appendChild(card);
    }

    // 3. SEARCH
    searchBtn.onclick = () => {
        const term = searchBar.value.toLowerCase();
        salonList.innerHTML = "";
        allSalons.filter(s => s.name.toLowerCase().includes(term) || s.location?.toLowerCase().includes(term))
             .forEach(renderSalon);
    }

    // 4. OPEN BOOKING MODAL
    salonList.addEventListener('click', (e) => {
        const bookBtn = e.target.closest('.bookBtn');
        if(bookBtn){
            if(bookBtn.disabled) return; // Block if no owner
            if(!auth.currentUser){ alert("Please login first"); window.location.href = 'index.html'; return; }
            selectedSalonId = bookBtn.dataset.id;
            selectedSalonData = allSalons.find(s => s.id === selectedSalonId);
            bookingModal.classList.add('active');
        }
    });

    // 5. SUBMIT BOOKING - THE IMPORTANT FIX
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!auth.currentUser) return;

        const serviceVal = document.getElementById('serviceType').value;
        const [service, priceStr] = serviceVal.split(' — R');
        const price = Number(priceStr);

        try {
            await addDoc(collection(db, "bookings"), {
                userId: auth.currentUser.uid, // Customer
                ownerId: selectedSalonData.ownerId, // Salon Owner - THIS MAKES IT SHOW IN OWNER/ADMIN
                salonId: selectedSalonId,
                salon: selectedSalonData.name,
                name: document.getElementById('custName').value,
                phone: document.getElementById('custPhone').value,
                service: service,
                price: price,
                status: "pending",
                date: document.getElementById('custDate').value, // "2026-07-26"
                time: document.getElementById('custTime').value,
                createdAt: serverTimestamp()
            });

            alert("Booking placed! Owner will approve soon 💈");
            bookingModal.classList.remove('active');
            bookingForm.reset();
        } catch(err) {
            console.error("Booking error:", err);
            alert("Booking failed: " + err.message);
        }
    });

    // 6. UPDATE TODAY'S BOOKING COUNT
    function updateBookingCount(){
        const todayStr = new Date().toISOString().split('T')[0];
        const q = query(collection(db, "bookings"), where("date", "==", todayStr));
        onSnapshot(q, (snap) => {
            bookingsToday.textContent = `${snap.size} bookings today`;
        });
    }

    // 7. LOGOUT
    logoutBtn.onclick = () => {
        signOut(auth).then(() => window.location.href = 'index.html');
    }
});
