/* =============================================
   LUMINARY — THEME TOGGLE SCRIPT
   GSAP-powered animations
   ============================================= */

/* ---- State ---- */
let isDark = true;
let isAnimating = false;

/* ---- DOM refs ---- */
const html        = document.documentElement;
const toggle      = document.getElementById('toggle');
const thumb       = document.getElementById('thumb');
const statusText  = document.getElementById('status-text');
const statusDot   = document.getElementById('status-dot');
const themeValue  = document.getElementById('theme-value');
const card        = document.getElementById('card');
const logo        = document.getElementById('logo');
const wordmark    = document.getElementById('wordmark');
const infoPill    = document.getElementById('status-pill');
const infoCards   = document.querySelectorAll('.info-card');
const orbs        = document.querySelectorAll('.orb');
const canvas      = document.getElementById('stars');

/* ---- Star field ---- */
const ctx = canvas.getContext('2d');
let stars = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function generateStars(count = 140) {
  stars = Array.from({ length: count }, () => ({
    x:       Math.random() * canvas.width,
    y:       Math.random() * canvas.height,
    r:       Math.random() * 1.2 + 0.2,
    alpha:   Math.random(),
    speed:   Math.random() * 0.008 + 0.003,
    twinkle: Math.random() * Math.PI * 2,
  }));
}

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (html.getAttribute('data-theme') === 'light') return;
  stars.forEach(s => {
    s.twinkle += s.speed;
    const a = (Math.sin(s.twinkle) * 0.4 + 0.6) * s.alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 210, 255, ${a})`;
    ctx.fill();
  });
  requestAnimationFrame(drawStars);
}

resizeCanvas();
generateStars();
drawStars();
window.addEventListener('resize', () => { resizeCanvas(); generateStars(); });

/* ---- Load saved theme ---- */
function applyTheme(dark, animate = false) {
  isDark = dark;
  const theme = dark ? 'dark' : 'light';
  html.setAttribute('data-theme', theme);
  toggle.setAttribute('aria-checked', String(dark));
  statusText.textContent = dark ? 'Night Mode Active' : 'Day Mode Active';
  themeValue.textContent = dark ? 'Dark' : 'Light';

  const thumbX = dark ? 0 : 38;

  if (animate) {
    gsap.to(thumb, {
      x: thumbX,
      duration: 0.5,
      ease: 'back.out(1.8)',
    });
  } else {
    gsap.set(thumb, { x: thumbX });
  }
}

const saved = localStorage.getItem('luminary-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initDark = saved ? saved === 'dark' : prefersDark;
applyTheme(initDark, false);

/* ---- Page load entrance ---- */
gsap.set([card, '.footer'], { opacity: 0, y: 30 });
gsap.set(infoCards, { opacity: 0, y: 15, scale: 0.95 });
gsap.set('.divider', { scaleX: 0, transformOrigin: 'left center' });
gsap.set(infoPill, { opacity: 0, scale: 0.9 });

const tl = gsap.timeline({ delay: 0.1 });
tl.to(card, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' })
  .to('.footer', { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, '-=0.4')
  .to(infoPill, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }, '-=0.5')
  .to('.divider', { scaleX: 1, duration: 0.6, ease: 'expo.out' }, '-=0.4')
  .to(infoCards, {
    opacity: 1, y: 0, scale: 1,
    duration: 0.5, ease: 'back.out(1.4)',
    stagger: 0.08,
  }, '-=0.4');

/* ---- Toggle click ---- */
toggle.addEventListener('click', () => {
  if (isAnimating) return;
  isAnimating = true;

  const nextDark = !isDark;
  const thumbX   = nextDark ? 0 : 38;

  /* Thumb bounce */
  gsap.to(thumb, {
    x: thumbX,
    duration: 0.55,
    ease: 'back.out(2)',
  });

  /* Squish thumb on click */
  gsap.fromTo(thumb,
    { scaleX: 1.2, scaleY: 0.85 },
    { scaleX: 1, scaleY: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' }
  );

  /* Status pill pulse */
  gsap.fromTo(infoPill,
    { scale: 0.92 },
    { scale: 1, duration: 0.4, ease: 'back.out(2)' }
  );

  /* Logo swap: spin out and in */
  gsap.to(logo, {
    rotationY: 90, duration: 0.2, ease: 'power2.in',
    onComplete: () => {
      applyTheme(nextDark, false);
      gsap.to(logo, { rotationY: 0, duration: 0.35, ease: 'back.out(1.5)' });
    }
  });

  /* Info cards wave */
  gsap.fromTo(infoCards,
    { y: 4, opacity: 0.6 },
    { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.07, delay: 0.1 }
  );

  /* Card subtle scale pulse */
  gsap.fromTo('.card-inner',
    { scale: 0.985 },
    { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }
  );

  /* Wordmark letter flicker */
  gsap.fromTo(wordmark,
    { opacity: 0.5, letterSpacing: '0.2em' },
    { opacity: 1, letterSpacing: '0.12em', duration: 0.4, ease: 'power2.out', delay: 0.1 }
  );

  localStorage.setItem('luminary-theme', nextDark ? 'dark' : 'light');

  setTimeout(() => { isAnimating = false; }, 600);
});

/* ---- Toggle hover animations ---- */
toggle.addEventListener('mouseenter', () => {
  gsap.to(thumb, { scale: 1.1, duration: 0.25, ease: 'power2.out' });
});
toggle.addEventListener('mouseleave', () => {
  gsap.to(thumb, { scale: 1, duration: 0.25, ease: 'power2.out' });
});

/* ---- Info card hover micro-interactions ---- */
infoCards.forEach(card => {
  card.addEventListener('mouseenter', () => {
    gsap.to(card.querySelector('.info-icon'), {
      y: -3, scale: 1.2, duration: 0.25, ease: 'power2.out',
    });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card.querySelector('.info-icon'), {
      y: 0, scale: 1, duration: 0.3, ease: 'back.out(2)',
    });
  });
});

/* ---- Subtle floating orb animation ---- */
gsap.to('.orb-1', {
  x: 30, y: 20, duration: 8, repeat: -1, yoyo: true, ease: 'sine.inOut',
});
gsap.to('.orb-2', {
  x: -20, y: -30, duration: 10, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2,
});
gsap.to('.orb-3', {
  x: 15, y: 25, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1,
});

/* ---- Status dot pulse ---- */
gsap.to(statusDot, {
  scale: 1.4, opacity: 0.6,
  duration: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut',
});
