document.addEventListener('DOMContentLoaded', () => {

  // 1. Init Swiper
  const swiperEl = document.querySelector('.swiper');
  if (swiperEl && window.Swiper) {
    new Swiper('.swiper', {
      loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      autoplay: { delay: 3000 }
    });
  }

  if (!window.firebaseAuth) return;

  // Firebase Setup & Global Mappings - with safety check for query utils
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
  const query = window.query;
  const orderByChild = window.orderByChild;
  const equalTo = window.equalTo;

  // Safety check - if query utils missing, log error but don't crash
  if (!query ||!orderByChild ||!equalTo) {
    console.error('Firebase query utils missing. Add query, orderByChild, equalTo to window in HTML');
  }

  // DOM Elements
  const emailInput = document.getElementById('userEmail');
  const passInput = document.getElementById('userPass');
  const loginBtn = document.getElementById('mainLoginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logoutBtnOwner') || document.getElementById('logoutBtnAdmin');
  const adminBtn = document.getElementById('adminBtn');
  const authMsg = document.getElementById('authMsg');

  let hasRedirected = false;

  async function getRole(uid) {
    try {
      const roleRef = dbRef(db, 'users/' + uid + '/role');
      const snap = await Promise.race([
        dbGet(roleRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
      if (snap.exists()) return snap.val();

      const user = auth.currentUser;
      const role = user?.email?.endsWith('@yoursalon.com')? 'salon_owner' : 'client';
      await dbSet(dbRef(db, 'users/' + uid), {
        email: user.email,
        role: role,
        createdAt: Date.now()
      });
      return role;
    } catch {
      return 'client';
    }
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim();
      if (!email ||!password) {
        if (authMsg) authMsg.textContent = 'Enter email and password';
        return;
      }
      try {
        if (authMsg) authMsg.textContent = 'Logging in...';
        hasRedirected = false;
        const cred = await signIn(auth, email, password);
        const role = await getRole(cred.user.uid);
        redirectByRole(role);
      } catch (err) {
        if (authMsg) authMsg.textContent = err.message;
      }
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim();
      if (!email ||!password) {
        if (authMsg) authMsg.textContent = 'Enter email and password';
        return;
      }
      try {
        if (authMsg) authMsg.textContent = 'Creating account...';
        hasRedirected = false;
        const cred = await signUp(auth, email, password);
        await dbSet(dbRef(db, 'users/' + cred.user.uid), {
          email, role: 'client', createdAt: Date.now()
        });
        redirectByRole('client');
      } catch (err) {
        if (authMsg) authMsg.textContent = err.message;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      hasRedirected = false;
      await logOut(auth);
      window.location.replace('index.html');
    });
  }

  if (adminBtn) adminBtn.style.display = 'none';

  // Live bookings counter
  function loadBookingsCounter() {
    const counterEl = document.getElementById('bookingsToday');
    if (!counterEl) return;
    const today = new Date().toISOString().split('T')[0];
    onValue(dbRef(db, 'bookings'), (snap) => {
      let count = 0;
      snap.forEach(child => {
        if (child.val().date === today) count++;
      });
      counterEl.textContent = `${count} haircuts booked today 🔥`;
    });
  }

  // GPS Distance
  function updateDistances() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      const vaalLat = -26.7086, vaalLng = 27.8785;
      const sharpLat = -26.7000, sharpLng = 27.8700;

      const distVaal = getDistance(userLat, userLng, vaalLat, vaalLng);
      const distSharp = getDistance(userLat, userLng, sharpLat, sharpLng);

      const elVaal = document.getElementById('dist-vaal');
      const elSharp = document.getElementById('dist-sharp');
      if (elVaal) elVaal.innerHTML = `<i class='bx bx-map'></i> ${distVaal.toFixed(1)}km`;
      if (elSharp) elSharp.innerHTML = `<i class='bx bx-map'></i> ${distSharp.toFixed(1)}km`;
    }, () => {
      document.getElementById('dist-vaal') && (document.getElementById('dist-vaal').innerHTML = `<i class='bx bx-map'></i> Allow location`);
      document.getElementById('dist-sharp') && (document.getElementById('dist-sharp').innerHTML = `<i class='bx bx-map'></i> Allow location`);
    });
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
