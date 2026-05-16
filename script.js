// Wait for Firebase to be on window before running
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Swiper init
  const swiperEl = document.querySelector('.swiper');
  if (swiperEl && window.Swiper) {
    new Swiper('.swiper', {
      loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      autoplay: { delay: 3000 }
    });
  }

  // 2. Firebase refs - only declare once
  const auth = window.firebaseAuth;
  const db = window.firebaseDb || window.db;
  const signIn = window.signIn;
  const signUp = window.signUp;
  const onAuthState = window.onAuthState;
  const logOut = window.logOut;

  // 3. DOM elements
  const emailInput = document.getElementById('userEmail');
  const passInput = document.getElementById('userPass');
  const loginBtn = document.getElementById('mainLoginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminBtn = document.getElementById('adminBtn');
  const authMsg = document.getElementById('authMsg');

  // 4. Login
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim();
      
      if (!email || !password) {
        authMsg.textContent = 'Enter email and password';
        authMsg.style.color = 'red';
        return;
      }

      try {
        authMsg.textContent = 'Logging in...';
        const userCredential = await signIn(auth, email, password);
        const role = await getUserRole(userCredential.user.uid);
        redirectByRole(role);
      } catch (err) {
        authMsg.textContent = err.message;
        authMsg.style.color = 'red';
      }
    });
  }

  // 5. Signup - defaults to client
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim();
      
      if (!email || !password) {
        authMsg.textContent = 'Enter email and password';
        authMsg.style.color = 'red';
        return;
      }

      try {
        authMsg.textContent = 'Creating account...';
        const userCredential = await signUp(auth, email, password);
        const user = userCredential.user;

        // Save to Firestore with role = client
        await saveUserToFirestore(user.uid, email, 'client');
        redirectByRole('client');
      } catch (err) {
        authMsg.textContent = err.message;
        authMsg.style.color = 'red';
      }
    });
  }

  // 6. Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logOut(auth);
      window.location.href = 'index.html';
    });
  }

  // 7. Auth state watcher
  if (onAuthState) {
    onAuthState(auth, async (user) => {
      const onLoginPage = window.location.pathname.endsWith('index.html') || 
                          window.location.pathname === '/' || 
                          window.location.pathname.endsWith('/');

      if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (authMsg) authMsg.textContent = `Hi, ${user.email}`;

        const role = await getUserRole(user.uid);
        
        // Hide admin button if not admin
        if (role !== 'admin' && adminBtn) adminBtn.style.display = 'none';

        // Redirect only if on login page
        if (onLoginPage) redirectByRole(role);
      } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (signupBtn) signupBtn.style.display = 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'inline-flex';
        if (authMsg) authMsg.textContent = '';
      }
    });
  }

  // 8. Admin button - verifies role after login
  if (adminBtn) {
    adminBtn.addEventListener('click', async () => {
      const email = prompt('Enter admin email:');
      if (!email) return;

      const pass = prompt('Enter admin password:');
      if (!pass) return;

      try {
        const cred = await signIn(auth, email, pass);
        const role = await getUserRole(cred.user.uid);
        if (role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          alert('Not an admin account');
          await logOut(auth);
        }
      } catch (err) {
        alert('Login failed: ' + err.message);
      }
    });
  }

  // 9. Booking modal
  const modal = document.getElementById('bookingModal');
  const openBookingBtns = document.querySelectorAll('.openBooking');
  const closeBtn = document.querySelector('.close-btn');
  const bookingForm = document.getElementById('bookingForm');
  let selectedSalon = '';

  // Setup bookings ref if missing
  let bookingsRef = window.bookingsRef;
  if (!bookingsRef && db && window.collection) {
    window.bookingsRef = window.collection(db, 'bookings');
    bookingsRef = window.bookingsRef;
  }

  if (openBookingBtns.length > 0) {
    openBookingBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!auth || !auth.currentUser) {
          alert('Login first to book');
          return;
        }
        selectedSalon = btn.dataset.salon;
        modal?.classList.add('active');
      });
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }
  if (modal) {
    modal.querySelector('.modal-overlay')?.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!bookingsRef) {
        alert('Database not connected. Refresh and try again.');
        return;
      }

      if (!auth.currentUser) {
        alert('You got logged out. Please login again.');
        return;
      }

      const name = document.getElementById('custName')?.value.trim();
      const time = document.getElementById('custTime')?.value;
      const service = document.getElementById('serviceType')?.value;

      if (!name || !time || !service) {
        alert('Fill all fields');
        return;
      }

      const booking = {
        name,
        time,
        service,
        salon: selectedSalon,
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now()
      };

      try {
        if (window.addDoc) {
          await window.addDoc(bookingsRef, booking);
        } else if (window.push && window.set) {
          const newBookingRef = window.push(bookingsRef);
          await window.set(newBookingRef, booking);
        } else {
          throw new Error('Firebase methods not found');
        }

        alert('Booking confirmed!');
        modal.classList.remove('active');
        bookingForm.reset();
      } catch (err) {
        console.error('Booking error:', err);
        alert('Error saving booking: ' + err.message);
      }
    });
  }

  // 10. Helpers
  async function getUserRole(uid) {
    try {
      if (window.getDoc && window.doc) {
        // Modular SDK
        const docRef = window.doc(db, 'users', uid);
        const snap = await window.getDoc(docRef);
        return snap.exists() ? snap.data().role : 'client';
      } else {
        // REST API fallback
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/kasi-web-d073f/databases/(default)/documents/users/${uid}`);
        if (!res.ok) return 'client';
        const data = await res.json();
        return data.fields?.role?.stringValue || 'client';
      }
    } catch (err) {
      console.error('Get role error:', err);
      return 'client';
    }
  }

  async function saveUserToFirestore(uid, email, role) {
    if (window.setDoc && window.doc) {
      // Modular SDK
      await window.setDoc(window.doc(db, 'users', uid), {
        email,
        role,
        createdAt: new Date().toISOString()
      });
    } else {
      // REST API fallback
      await fetch(`https://firestore.googleapis.com/v1/projects/kasi-web-d073f/databases/(default)/documents/users/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            email: { stringValue: email },
            role: { stringValue: role },
            createdAt: { timestampValue: new Date().toISOString() }
          }
        })
      });
    }
  }

  function redirectByRole(role) {
    if (role === 'admin') {
      window.location.href = '/admin.html';
    } else if (role === 'salon_owner') {
      window.location.href = '/owners.html';
    } else {
      window.location.href = '/salons.html';
    }
  }
});
