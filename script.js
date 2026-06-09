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
  const query = window.query;
  const orderByChild = window.orderByChild;
  const equalTo = window.equalTo;

  if (!query ||!orderByChild ||!equalTo) {
    console.error('Firebase query utils missing. Add query, orderByChild, equalTo to window in HTML');
  }

  let hasRedirected = false;

  async function getRole(uid) {
    try {
      const roleRef = dbRef(db, 'users/' + uid + '/role');
      const snap = await Promise.race([dbGet(roleRef), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))]);
      if (snap.exists()) return snap.val();
      const user = auth.currentUser;
      const role = user?.email?.endsWith('@yoursalon.com')? 'salon_owner' : 'client';
      await dbSet(dbRef(db, 'users/' + uid), {email: user.email, role: role, createdAt: Date.now()});
      return role;
    } catch { return 'client'; }
  }

  onAuthState(auth, async (user) => {
    const page = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
    if (user) {
      const role = await getRole(user.uid);
      if (page === 'salons.html') {
        initBookingModal(user);
        loadBookingsCounter();
        updateDistances();
      }
    } else {
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
    console.log('initBookingModal called for', user.email);
    const modal = document.getElementById('bookingModal');
    const openBtns = document.querySelectorAll('.openBooking');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('bookingForm');
    if (!modal ||!form) { console.error('Modal or form not found'); return; }

    let selectedSalon = '', selectedSalonUid = '';

    openBtns.forEach(btn => {
      btn.onclick = () => {
        if (!user) { alert('Login first to book'); window.location.replace('index.html'); return; }
        selectedSalon = btn.dataset.salon;
        selectedSalonUid = btn.dataset.salonUid;
        modal.classList.add('active');
      };
    });

    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
    modal.querySelector('.modal-overlay')?.addEventListener('click', () => modal.classList.remove('active'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Form submitted!');
      const name = document.getElementById('custName').value.trim();
      const phone = document.getElementById('custPhone').value.trim();
      const time = document.getElementById('custTime').value;
      const service = document.getElementById('serviceType').value;
      if (!name ||!phone ||!time ||!service) { alert('Fill all fields'); return; }
      const priceMatch = service.match(/R(\d+)/);
      const price = priceMatch? parseInt(priceMatch[1], 10) : 0;

      const booking = {
        name, time, service, price, phone,
        salon: selectedSalon,
        s: selectedSalonUid,
        c: user.uid,
        email: user.email,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now()
      };

      console.log('Saving booking:', booking);
      try {
        await dbSet(push(dbRef(db, 'bookings')), booking);
        alert('Booking confirmed!');
        modal.classList.remove('active');
        form.reset();
      } catch (err) {
        alert('Error saving booking: ' + err.message);
        console.error(err);
      }
    });
  }
});
