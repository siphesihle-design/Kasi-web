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
// Wait for Firebase to load
const auth = window.firebaseAuth;
const signIn = window.signIn;
const signUp = window.signUp;
const onAuthState = window.onAuthState;
const logOut = window.logOut;

// DOM elements
const emailInput = document.getElementById("userEmail");
const passInput = document.getElementById("userPass");
const loginBtn = document.getElementById("mainLoginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminBtn = document.getElementById("adminBtn");
const authMsg = document.getElementById("authMsg");

// 1. Handle Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passInput.value.trim();
  
  if (!email || !password) {
    authMsg.textContent = "Enter email and password";
    return;
  }

  try {
    authMsg.textContent = "Logging in...";
    const userCredential = await signIn(auth, email, password);
    const user = userCredential.user;
    
    // Get role from Firestore
    const role = await getUserRole(user.uid);
    redirectByRole(role);
  } catch (error) {
    authMsg.textContent = error.message;
  }
});

// 2. Handle Signup - defaults to client
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passInput.value.trim();
  
  if (!email || !password) {
    authMsg.textContent = "Enter email and password";
    return;
  }

  try {
    authMsg.textContent = "Creating account...";
    const userCredential = await signUp(auth, email, password);
    const user = userCredential.user;

    // Save user to Firestore with role = client
    await fetch(`https://firestore.googleapis.com/v1/projects/kasi-web-d073f/databases/(default)/documents/users/${user.uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          email: { stringValue: email },
          role: { stringValue: "client" },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      })
    });

    redirectByRole("client");
  } catch (error) {
    authMsg.textContent = error.message;
  }
});

// 3. Handle Logout
logoutBtn.addEventListener("click", async () => {
  await logOut(auth);
  location.reload();
});

// 4. Check auth state on page load
onAuthState(auth, async (user) => {
  if (user) {
    // User logged in
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    logoutBtn.style.display = "inline-flex";
    
    const role = await getUserRole(user.uid);
    
    // Hide admin button if not admin
    if (role !== "admin") {
      adminBtn.style.display = "none";
    }
  } else {
    // Not logged in
    loginBtn.style.display = "inline-flex";
    signupBtn.style.display = "inline-flex";
    logoutBtn.style.display = "none";
    adminBtn.style.display = "inline-flex";
  }
});

// 5. Helper: Get user role from Firestore
async function getUserRole(uid) {
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/kasi-web-d073f/databases/(default)/documents/users/${uid}`);
    if (!res.ok) return "client";
    const data = await res.json();
    return data.fields?.role?.stringValue || "client";
  } catch {
    return "client";
  }
}

// 6. Helper: Redirect based on role
function redirectByRole(role) {
  if (role === "admin") {
    window.location.href = "/admin.html";
  } else if (role === "salon_owner") {
    window.location.href = "/owners.html";
  } else {
    window.location.href = "/salons.html";
  }
}

// 7. Admin button click
adminBtn.addEventListener("click", () => {
  window.location.href = "/admin.html";
});
