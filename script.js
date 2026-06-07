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

  // Firebase Setup & Global Mappings
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

  // CENTRALIZED AUTH STATE OBSERVER & ROUTE GUARD
  onAuthState(auth, async (user) => {
    const rawPage = window.location.pathname.split('/').pop() || 'index.html';
    const page = rawPage.toLowerCase();
    const onLoginPage = page === 'index.html' || page === '';

    if (user) {
      if (authMsg) authMsg.textContent = 'Verifying account...';
      const role = await getRole(user.uid);

      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
      if (authMsg) authMsg.textContent = `Hi ${user.email.split('@')[0]}`;

      const correctPage = role === 'admin'? 'admin.html'
                        : role === 'salon_owner'? 'owners.html'
                        : 'salons.html';

      if (onLoginPage &&!hasRedirected) {
        hasRedirected = true;
        window.location.replace(correctPage);
        return;
      }

      if (page!== correctPage) {
        if (role === 'client' && (page === 'admin.html' || page === 'owners.html')) {
          alert('Access denied: Clients only have access to salon booking.');
          window.location.replace('salons.html');
          return;
        }
        if (role === 'salon_owner' && page === 'admin.html') {
          alert('Access denied: Admin panel only.');
          window.location.replace('owners.html');
          return;
        }
      }

      if (page === 'admin.html') loadAdminBookings();
      if (page === 'owners.html') loadOwnerDashboard(user.uid);
      if (page === 'salons.html') {
        initBookingModal(user);
        loadBookingsCounter();
        updateDistances();
      }

    } else {
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (signupBtn) signupBtn.style.display = 'inline-flex';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (authMsg) authMsg.textContent = '';

      if (page === 'admin.html' || page === 'owners.html' || page === 'salons.html') {
        window.location.replace('index.html');
      }
    }
  });

  function loadAdminBookings() {
    const listEl = document.getElementById('bookingsList');
    const countEl = document.getElementById('bookingCount');
    if (!listEl) return;

    onValue(dbRef(db, 'bookings'), (snap) => {
      const bookings = [];
      snap.forEach(child => bookings.push({ id: child.key,...child.val() }));
      countEl.textContent = `${bookings.length} total booking${bookings.length!== 1? 's' : ''}`;

      if (bookings.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#888;">No bookings yet.</p>';
        return;
      }

      bookings.sort((a, b) => b.createdAt - a.createdAt);
      listEl.innerHTML = bookings.map(b => `
        <div class="glass-card booking-item" style="padding:15px; margin-bottom:15px;">
          <div style="display:flex; justify-content:space-between; align-items:start;">
            <div>
              <h3 style="margin:0 0 5px 0;">${b.name}</h3>
              <p style="margin:0; color:#008080; font-weight:600;">${b.service}</p>
              <p style="margin:5px 0; color:#aaa; font-size:0.85rem;">
                <i class='bx bx-store'></i> ${b.salon}<br>
                <i class='bx bx-time'></i> ${b.time} • ${b.date}<br>
                <i class='bx bx-phone'></i> ${b.phone || 'No phone'}<br>
                <i class='bx bx-envelope'></i> ${b.email}<br>
                <i class='bx bx-id-card'></i> Client: ${b.c || 'N/A'} | Salon: ${b.s || 'N/A'}
              </p>
            </div>
            <button class="secondary-btn deleteBtn" data-id="${b.id}"
                    style="width:auto; padding:6px 12px; color:#ff4757; border-color:#ff4757;">
              <i class='bx bx-trash'></i>
            </button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.deleteBtn').forEach(btn => {
        btn.onclick = () => {
          if (confirm('Delete this booking?')) {
            remove(dbRef(db, 'bookings/' + btn.dataset.id));
          }
        };
      });
    });
  }

  // Owner Dashboard - uses short keys 's' for salonUid
  function loadOwnerDashboard(ownerUid) {
    const statusSelect = document.getElementById('shopStatusSelect');
    const tableBody = document.getElementById("tableBody");
    const totalCount = document.getElementById("totalCount");
    const nextTime = document.getElementById("nextTime");
    const totalRevenue = document.getElementById("totalRevenue");
    const clearBtn = document.getElementById("clearBtn");
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4"><div class="skeleton"></div><div class="skeleton"></div></td></tr>';

    onValue(dbRef(db, 'shopStatus/' + ownerUid), (snap) => {
      if (snap.exists() && statusSelect) statusSelect.value = snap.val();
    });

    if (statusSelect) {
      statusSelect.onchange = () => {
        dbSet(dbRef(db, 'shopStatus/' + ownerUid), statusSelect.value);
        alert(`Shop status updated to: ${statusSelect.value}`);
      };
    }

    // Query using 's' instead of 'salonUid'
    const bookingsRef = dbRef(db, 'bookings');
    const ownerBookingsQuery = query(bookingsRef, orderByChild('s'), equalTo(ownerUid));

    onValue(ownerBookingsQuery, (snap) => {
      const myBookings = [];
      snap.forEach(child => myBookings.push({ id: child.key,...child.val() }));
      myBookings.sort((a, b) => a.time.localeCompare(b.time));

      if (totalCount) totalCount.textContent = myBookings.length;
      if (nextTime) nextTime.textContent = myBookings.length > 0? myBookings[0].time : '--:--';
      if (totalRevenue) totalRevenue.textContent = `R${myBookings.reduce((sum, b) => sum + (b.price || 0), 0)}`;

      if (myBookings.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#666;">No bookings yet. Relax, King! 👑</td></tr>`;
        return;
      }

      tableBody.innerHTML = myBookings.map(b => `
        <tr>
          <td style="font-weight: bold;">${b.name}</td>
          <td><span style="background: #333; padding: 4px 8px; border-radius: 5px;">${b.time}</span></td>
          <td>${b.service}</td>
          <td>
            <button class="status-btn doneBtn" data-id="${b.id}" style="margin-right:5px;">Done</button>
            <a href="https://wa.me/${b.phone || ''}?text=Hi ${b.name}, your ${b.service} at ${b.time} is confirmed ✅"
               target="_blank"
               style="background:#25D366; color:white; padding:8px 12px; border-radius:8px; text-decoration:none; font-size:0.8rem;">
               <i class='bx bxl-whatsapp'></i>
            </a>
          </td>
        </tr>
      `).join('');

      document.querySelectorAll('.doneBtn').forEach(btn => {
        btn.onclick = () => remove(dbRef(db, 'bookings/' + btn.dataset.id));
      });
    });

    if (clearBtn) {
      clearBtn.onclick = async () => {
        if (confirm('Clear all your bookings?')) {
          try {
            const snap = await dbGet(ownerBookingsQuery);
            snap.forEach(child => {
              remove(dbRef(db, 'bookings/' + child.key));
            });
          } catch (err) {
            console.error("Failed to clear bookings:", err);
          }
        }
      };
    }
  }

  function initBookingModal(user) {
    const modal = document.getElementById('bookingModal');
    const openBtns = document.querySelectorAll('.openBooking');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('bookingForm');
    if (!modal) return;

    let selectedSalon = '';
    let selectedSalonUid = '';

    openBtns.forEach(btn => {
      btn.onclick = () => {
        if (!user) {
          alert('Login first to book');
          window.location.replace('index.html');
          return;
        }
        selectedSalon = btn.dataset.salon;
        selectedSalonUid = btn.dataset.salonUid;
        modal.classList.add('active');
      };
    });

    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
    modal.querySelector('.modal-overlay')?.addEventListener('click', () => modal.classList.remove('active'));

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('custName').value.trim();
      const phone = document.getElementById('custPhone').value.trim();
      const time = document.getElementById('custTime').value;
      const service = document.getElementById('serviceType').value;
      if (!name ||!phone ||!time ||!service) {
        alert('Fill all fields');
        return;
      }
      const priceMatch = service.match(/R(\d+)/);
      const price = priceMatch? parseInt(priceMatch[1], 10) : 0;

      const booking = {
        name, time, service, price,
        phone,
        salon: selectedSalon,
        s: selectedSalonUid, // CHANGED: salonUid → s
        c: user.uid, // CHANGED: customerUid → c
        email: user.email,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now()
      };

      try {
        await dbSet(push(dbRef(db, 'bookings')), booking);
        alert('Booking confirmed!');
        modal.classList.remove('active');
        form.reset();
      } catch (err) {
        alert('Error saving booking: ' + err.message);
      }
    });
  }

  function redirectByRole(role) {
    const targetPage = role === 'admin'? 'admin.html'
                     : role === 'salon_owner'? 'owners.html'
                     : 'salons.html';
    window.location.replace(targetPage);
  }

  // PWA Install button
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.style.display = 'block';
  });

  document.getElementById('installBtn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
  });
});
