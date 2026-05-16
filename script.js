document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Swiper init - run this first and don't let Firebase break it
  const swiperEl = document.querySelector('.swiper');
  if (swiperEl && window.Swiper) {
    try {
      new Swiper('.swiper', {
        loop: true,
        pagination: { el: '.swiper-pagination', clickable: true },
        autoplay: { delay: 3000 }
      });
      console.log('Swiper initialized');
    } catch (err) {
      console.error('Swiper error:', err);
    }
  }

  // 2. Check if Firebase is ready. If not, stop here but don't break swiper
  if (!window.firebaseAuth || !window.signIn) {
    console.warn('Firebase not loaded yet. Login/admin/booking disabled.');
    return;
  }

  // 3. Firebase refs
  const auth = window.firebaseAuth;
  const db = window.firebaseDb || window.db;
  const signIn = window.signIn;
  const signUp = window.signUp;
  const onAuthState = window.onAuthState;
  const logOut = window.logOut;

  // 4. DOM elements
  const emailInput = document.getElementById('userEmail');
  const passInput = document.getElementById('userPass');
  const loginBtn = document.getElementById('mainLoginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminBtn = document.getElementById('adminBtn');
  const authMsg = document.getElementById('authMsg');

  // 5. Login
  if (loginBtn && emailInput && passInput) {
    loginBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim();
      
      if (!email || !password) {
        if (authMsg) {
          authMsg.textContent = 'Enter email and password';
          authMsg.style.color = 'red';
        }
        return;
      }

      try {
        if (authMsg) authMsg.textContent = 'Logging in...';
        const userCredential = await signIn(auth, email, password);
        const role = await getUserRole(userCredential.user.uid);
        redirectByRole(role);
      } catch (err) {
        if (authMsg) {
          authMsg.textContent = err.message;
          authMsg.style.color = 'red';
        }
        console.error('Login error:', err);
      }
    });
  }

  // 6. Signup
  if (signupBtn && emailInput && passInput) {
    signupBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim();
      
      if (!email || !password) {
        if (authMsg) {
          authMsg.textContent = 'Enter email and password';
          authMsg.style.color = 'red';
        }
        return;
      }

      try {
        if (authMsg) authMsg.textContent = 'Creating account...';
        const userCredential = await signUp(auth, email, password);
        await saveUserToFirestore(userCredential.user.uid, email, 'client');
        redirectByRole('client');
      } catch (err) {
        if (authMsg) {
          authMsg.textContent = err.message;
          authMsg.style.color = 'red';
        }
        console.error('Signup error:', err);
      }
    });
  }

  // 7. Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logOut(auth);
      window.location.href = 'index.html';
    });
  }

  // 8. Auth state watcher
  if (onAuthState) {
    onAuthState(auth, async (user) => {
