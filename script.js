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
  const
