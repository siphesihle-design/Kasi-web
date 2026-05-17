document.addEventListener('DOMContentLoaded', () => {

  // 1. Init Swiper if on index.html
  const swiperEl = document.querySelector('.swiper');
  if (swiperEl && window.Swiper) {
    new Swiper('.swiper', {
      loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      autoplay: { delay: 3000 }
    });
  }

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

  const emailInput = document.getElementById('userEmail');
  const passInput = document.getElementById('userPass');
  const loginBtn = document.getElementById('mainLoginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminBtn = document.getElementById('adminBtn');
  const authMsg = document.getElementById('authMsg');

  // Get role from database
  async function getRole(uid) {
    try {
      const snap = await dbGet(dbRef(db, 'users/' + uid));
      return snap.exists()? snap.val().role || 'client' : 'client';
    } catch (err) {
      console.error('Get role error:', err);
      return 'client';
    }
  }

  // 2. Login
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
        const cred = await signIn(auth, email, password);
        const role = await getRole(cred.user.uid);
        redirectByRole(role);
      } catch (err) {
        if (authMsg) authMsg.textContent = err.message;
      }
    });
  }

  // 3. Signup - always creates client role
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim();
      if (!password) {
        if (authMsg) authMsg.textContent = 'Enter password';
        return;
      }

      try {
        if (authMsg) authMsg.textContent = 'Creating account...';
        const cred = await signUp(auth, email, password);
        await dbSet(dbRef(db, 'users/' + cred.user.uid), {
          email,
          role: 'client',
          createdAt: Date.now()
        });
        redirectByRole('client');
      } catch (err) {
        if (authMsg) authMsg.textContent = err.message;
      }
    });
  }

  // 4. Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logOut(auth);
      window.location.href = 'index.html';
    });
  }

  // 5. Hide admin button - not used anymore
  if (adminBtn) adminBtn.style.display = 'none';

  // 6. Auth state watcher
  onAuthState(auth, async (user) => {
    const page = window.location.pathname.split('/').pop();
    const onLoginPage = page === 'index.html' || page === '';

    if (user) {
      const role = await getRole(user.uid);

      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
      if (authMsg) authMsg.textContent = `Hi ${user.email.split('@')[0]}`;

      if (onLoginPage) redirectByRole(role);

      // Protect pages using role from DB
      if (page === 'admin.html' && role!== 'admin') {
        alert('Admin access only');
        await logOut(auth);
        window.location.href = 'index.html';
        return;
      }
      if (page === 'owners.html' && role!== 'salon_owner' && role!== 'admin') {
        alert('Salon owner access only');
        await logOut(auth);
        window.location.href = 'index.html';
        return;
      }

      if (page === 'admin.html') loadAdminBookings();
      if (page === 'owners.html') loadOwnerDashboard(user.uid);
      if (page === 'salons.html') initBookingModal(user);

    } else {
      if (page === 'admin.html' || page === 'owners.html' || page === 'salons.html') {
        window.location.href = 'index.html';
      }
    }
  });

  // 7. Load all bookings for admin
  function loadAdminBookings() {
    const listEl = document.getElementById('bookingsList');
    const countEl = document.getElementById('bookingCount');
    if (!listEl) return;

    const bookingsRef = dbRef(db, 'bookings');
    onValue(bookingsRef, (snap) => {
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
                <i class='bx bx-envelope'></i> ${b.email}
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
        btn.addEventListener('click', () => {
          if (confirm('Delete this booking?')) {
            remove(dbRef(db, 'bookings/' + btn.dataset.id));
          }
        });
      });
    });
  }

  // 8. Load bookings for owner dashboard
  function loadOwnerDashboard(ownerUid) {
    const statusSelect = document.getElementById('shopStatusSelect');
    const tableBody = document.getElementById("tableBody");
    const totalCount = document.getElementById("totalCount");
    const nextTime = document.getElementById("nextTime");
    const totalRevenue = document.getElementById("totalRevenue");
    const clearBtn = document.getElementById("clearBtn");
    if (!tableBody) return;

    const statusRef = dbRef(db, 'shopStatus/' + ownerUid);
    onValue(statusRef, (snap) => {
      if (snap.exists()) statusSelect.value = snap.val();
    });
    statusSelect?.addEventListener('change', () => {
      dbSet(statusRef, statusSelect.value);
      alert(`Shop status updated to: ${statusSelect.value}`);
    });

    const bookingsRef = dbRef(db, 'bookings');
    onValue(bookingsRef, (snap) => {
      const bookings = [];
      snap.forEach(child => bookings.push({ id: child.key,...child.val() }));

      const myBookings = bookings.filter(b => b.salonUid === ownerUid);
      myBookings.sort((a, b) => a.time.localeCompare(b.time));

      totalCount.textContent = myBookings.length;
      nextTime.textContent = myBookings.length > 0? myBookings[0].time : '--:--';

      let revenue = 0;
      myBookings.forEach(b => {
        const price = parseInt(b.service.match(/R(\d+)/)?.[1] || 0);
        revenue += price;
      });
      totalRevenue.textContent = `R${revenue}`;

      if (myBookings.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#666;">No bookings yet. Relax, King! 👑</td></tr>`;
        return;
      }

      tableBody.innerHTML = myBookings.map(b => `
        <tr>
          <td style="font-weight: bold;">${b.name}</td>
          <td><span style="background: #333; padding: 4px 8px; border-radius: 5px;">${b.time}</span></td>
          <td>${b.service}</td>
          <td><button class="status-btn doneBtn" data-id="${b.id}">Done</button></td>
        </tr>
      `).join('');

      document.querySelectorAll('.doneBtn').forEach(btn => {
        btn.addEventListener('click', () => remove(dbRef(db, 'bookings/' + btn.dataset.id)));
      });
    });

    clearBtn?.addEventListener('click', () => {
      if (confirm('Clear all your bookings?')) {
        onValue(dbRef(db, 'bookings'), (snap) => {
          snap.forEach(child => {
            if (child.val().salonUid === ownerUid) remove(dbRef(db, 'bookings/' + child.key));
          });
        }, { onlyOnce: true });
      }
    });
  }

  // 9. Booking modal for salons.html
  function initBookingModal(user) {
    const modal = document.getElementById('bookingModal');
    const openBtns = document.querySelectorAll('.openBooking');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('bookingForm');
    if (!modal) return;

    let selectedSalon = '';
    let selectedSalonUid = '';

    openBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!user) {
          alert('Login first to book');
          window.location.href = 'index.html';
          return;
        }
        selectedSalon = btn.dataset.salon;
        selectedSalonUid = btn.dataset.salonUid;
        modal.classList.add('active');
      });
    });

    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
    modal.querySelector('.modal-overlay')?.addEventListener('click', () => modal.classList.remove('active'));

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('custName').value.trim();
      const time = document.getElementById('custTime').value;
      const service = document.getElementById('serviceType').value;

      if (!name ||!time ||!service) {
        alert('Fill all fields');
        return;
      }

      const booking = {
        name,
        time,
        service,
        salon: selectedSalon,
        salonUid: selectedSalonUid,
        customerUid: user.uid,
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

  // 10. Redirect helper
  function redirectByRole(role) {
    if (role === 'admin') window.location.href = 'admin.html';
    else if (role === 'salon_owner') window.location.href = 'owners.html';
    else window.location.href = 'salons.html';
  }
});
