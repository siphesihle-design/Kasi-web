// Swiper init
const swiperEl = document.querySelector('.swiper');
if (swiperEl) {
  new Swiper('.swiper', {
    loop: true,
    pagination: { el: '.swiper-pagination', clickable: true },
    autoplay: { delay: 3000 }
  });
}

// Auth elements
const emailInput = document.getElementById('userEmail');
const passInput = document.getElementById('userPass');
const loginBtn = document.getElementById('mainLoginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authMsg = document.getElementById('authMsg');
const adminBtn = document.getElementById('adminBtn');

// Login for salon owners
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    try {
      await window.signIn(window.firebaseAuth, emailInput.value, passInput.value);
      authMsg.textContent = "Logged in!";
      authMsg.style.color = "green";
    } catch (err) {
      authMsg.textContent = err.message;
      authMsg.style.color = "red";
    }
  });
}

// Signup for salon owners
if (signupBtn) {
  signupBtn.addEventListener('click', async () => {
    try {
      await window.signUp(window.firebaseAuth, emailInput.value, passInput.value);
      authMsg.textContent = "Account created!";
      authMsg.style.color = "green";
    } catch (err) {
      authMsg.textContent = err.message;
      authMsg.style.color = "red";
    }
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await window.logOut(window.firebaseAuth);
    window.location.href = 'index.html';
  });
}

// Watch auth state and redirect salon owners only
if (window.onAuthState) {
  window.onAuthState(window.firebaseAuth, (user) => {
    const onLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');

    if (user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'block';
      if (authMsg) authMsg.textContent = `Hi, ${user.email}`;

      // Redirect salon owners to owners.html, not admin
      if (onLoginPage) {
        window.location.href = 'owners.html';
      }
    } else {
      if (loginBtn) loginBtn.style.display = 'block';
      if (signupBtn) signupBtn.style.display = 'block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (authMsg) authMsg.textContent = '';
    }
  });
}

// Admin button logic - no hardcoded credentials
if (adminBtn) {
  adminBtn.onclick = async () => {
    const email = prompt('Enter admin email:');
    if (!email) return;

    const pass = prompt('Enter admin password:');
    if (!pass) return;

    try {
      await window.signIn(window.firebaseAuth, email, pass);
      window.location.href = 'admin.html';
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };
}

// Booking modal
const modal = document.getElementById('bookingModal');
const openBookingBtns = document.querySelectorAll('.openBooking');
const closeBtn = document.querySelector('.close-btn');
const bookingForm = document.getElementById('bookingForm');
let selectedSalon = '';

if (openBookingBtns.length > 0) {
  openBookingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!window.firebaseAuth ||!window.firebaseAuth.currentUser) {
        alert('Login first to book');
        return;
      }
      selectedSalon = btn.dataset.salon;
      modal.classList.add('active');
    });
  });
}

if (closeBtn) {
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
}
if (modal) {
  modal.querySelector('.modal-overlay').addEventListener('click', () => modal.classList.remove('active'));
}

if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('custName').value;
    const time = document.getElementById('custTime').value;
    const service = document.getElementById('serviceType').value;

    const booking = {
      name,
      time,
      service,
      salon: selectedSalon,
      uid: window.firebaseAuth.currentUser.uid,
      email: window.firebaseAuth.currentUser.email,
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now()
    };

    try {
      const newBookingRef = window.push(window.bookingsRef);
      await window.set(newBookingRef, booking);

      alert('Booking confirmed!');
      modal.classList.remove('active');
      bookingForm.reset();
    } catch (err) {
      alert('Error saving booking: ' + err.message);
    }
  });
}
