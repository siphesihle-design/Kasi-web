document.addEventListener('DOMContentLoaded', () => {
  if (!window.firebaseAuth) return;

  const auth = window.firebaseAuth;
  const db = window.firebaseDB;
  const signIn = window.signIn;
  const signUp = window.signUp;
  const onAuthState = window.onAuthState;
  const logOut = window.logOut;
  const dbRef = window.dbRef;
  const dbGet = window.dbGet;
  const dbSet = window.dbSet;
  const push = window.push;
  const remove = window.remove;
  const onValue = window.onValue;

  // Swiper Slider Init
  if (document.querySelector('.swiper')) {
    new Swiper('.swiper', {
      loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      autoplay: { delay: 3500, disableOnInteraction: false }
    });
  }

  // Auth DOM Elements
  const emailInput = document.getElementById('userEmail');
  const passInput = document.getElementById('userPass');
  const loginBtn = document.getElementById('mainLoginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminBtn = document.getElementById('adminBtn');
  const authMsg = document.getElementById('authMsg');
  const authSection = document.getElementById('authSection');

  // FIXED: Added Login Click Event Listener
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value;
      if (!email || !password) { alert('Please fill in all layout fields.'); return; }
      
      try {
        authMsg.textContent = "Logging in...";
        await signIn(auth, email, password);
        authMsg.textContent = "Login successful! 🔥";
        clearAuthInputs();
      } catch (err) {
        authMsg.textContent = "Error: " + err.message;
        console.error(err);
      }
    });
  }

  // FIXED: Added Signup Click Event Listener
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value;
      if (!email || !password) { alert('Please fill in all layout fields.'); return; }
      if (password.length < 6) { alert('Password should be at least 6 characters.'); return; }

      try {
        authMsg.textContent = "Creating Account...";
        await signUp(auth, email, password);
        authMsg.textContent = "Account created successfully!";
        clearAuthInputs();
      } catch (err) {
        authMsg.textContent = "Error: " + err.message;
        console.error(err);
      }
    });
  }

  // FIXED: Added Logout Click Event Listener
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await logOut(auth);
        alert('Logged out successfully.');
        window.location.replace('index.html');
      } catch (err) {
        console.error("Logout failed:", err);
      }
    });
  }

  function clearAuthInputs() {
    if (emailInput) emailInput.value = "";
    if (passInput) passInput.value = "";
  }

  async function getRole(uid) {
    try {
      const roleRef = dbRef(db, 'users/' + uid + '/role');
      const snap = await dbGet(roleRef);
      if (snap.exists()) return snap.val();
      
      const user = auth.currentUser;
      const role = user?.email?.endsWith('@yoursalon.com') ? 'salon_owner' : 'client';
      await dbSet(dbRef(db, 'users/' + uid), {email: user.email, role: role, createdAt: Date.now()});
      return role;
    } catch (e) { 
      return 'client'; 
    }
  }

  // Central Auth Observer management
  onAuthState(auth, async (user) => {
    const page = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
    
    if (user) {
      const role = await getRole(user.uid);
      
      // Update Navbar layout visibility controls
      if (logoutBtn) logoutBtn.style.display = "flex";
      if (adminBtn && role === 'salon_owner') adminBtn.style.display = "flex";
      if (authSection) authSection.style.display = "none"; // Hide auth box if logged in

      if (page === 'salons.html') {
        initBookingModal(user);
        loadBookingsCounter();
        updateDistances();
      }
    } else {
      if (logoutBtn) logoutBtn.style.display = "none";
      if (adminBtn) adminBtn.style.display = "none";
      if (authSection) authSection.style.display = "block";
      
      if (page === 'salons.html') window.location.replace('index.html');
    }
  });

  function loadBookingsCounter() {
    const counterEl = document.getElementById('bookingsToday');
    if (!counterEl) return;
    const today = new Date().toISOString().split('T')[0];
    onValue(dbRef(db, 'bookings'), (snap) => {
      let count = 0;
      snap.forEach(child => { if (child.val().date === today) count++; });
      counterEl.textContent = `${count} haircuts booked today 🔥`;
    });
  }

  function updateDistances() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const userLat = pos.coords.latitude, userLng = pos.coords.longitude;
      const vaalLat = -26.7086, vaalLng = 27.8785;
      const sharpLat = -26.7000, sharpLng = 27.8700;
      const distVaal = getDistance(userLat, userLng, vaalLat, vaalLng);
      const distSharp = getDistance(userLat, userLng, sharpLat, sharpLng);
      document.getElementById('dist-vaal') && (document.getElementById('dist-vaal').innerHTML = `<i class='bx bx-map'></i> ${distVaal.toFixed(1)}km`);
      document.getElementById('dist-sharp') && (document.getElementById('dist-sharp').innerHTML = `<i class='bx bx-map'></i> ${distSharp.toFixed(1)}km`);
    });
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function initBookingModal(user) {
    const modal = document.getElementById('bookingModal');
    const openBtns = document.querySelectorAll('.openBooking');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('bookingForm');
    if (!modal || !form) return;

    let selectedSalon = '', selectedSalonUid = '';

    openBtns.forEach(btn => {
      btn.onclick = () => {
        if (!user) { alert('Login first to book'); window.location.replace('index.html'); return; }
        selectedSalon = btn.dataset.salon || 'General';
        selectedSalonUid = btn.dataset.salonUid || 'unknown';
        modal.classList.add('active');
      };
    });

    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));

    // FIXED: Adjusted fields structure matching database validations rules accurately
    form.onsubmit = async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('custName').value.trim();
      const phone = document.getElementById('custPhone').value.trim();
      const time = document.getElementById('custTime').value;
      const service = document.getElementById('serviceType').value;
      
      if (!name || !phone || !time || !service) { alert('Fill all fields'); return; }
      const priceMatch = service.match(/R(\d+)/);
      const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

      // Object fields payload architecture mapped to rules validation structure
      const booking = {
        name, 
        time, 
        service, 
        price, 
        phone, // explicitly evaluated inside validate rules checks
        salon: selectedSalon,
        s: selectedSalonUid,
        c: user.uid,
        email: user.email,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now()
      };

      try {
        // Safe programmatic path building utilizing modular Firebase syntax
        const newBookingRef = push(dbRef(db, 'bookings'));
        await dbSet(newBookingRef, booking);
        
        alert('Booking confirmed!');
        modal.classList.remove('active');
        form.reset();
      } catch (err) {
        alert('Error saving booking: ' + err.message);
        console.error(err);
      }
    };
  }
});
