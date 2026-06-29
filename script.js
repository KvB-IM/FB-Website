/* Federal Benefits Exchange — Landing Page JS */

// --- Scroll-aware header ---
(function () {
  const header = document.getElementById('header');
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > 60) header.classList.add('header--scrolled');
    else header.classList.remove('header--scrolled');
    lastScroll = current;
  }, { passive: true });
})();

// --- Mobile Nav ---
const menuBtn = document.getElementById('menuBtn');
const mobileNav = document.getElementById('mobileNav');
if (menuBtn && mobileNav) {
  menuBtn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    menuBtn.innerHTML = isOpen
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  });
}
function closeMobileNav() {
  if (mobileNav) {
    mobileNav.classList.remove('is-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-label', 'Open menu');
      menuBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    }
  }
}

// --- FAQ Accordion ---
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    // Close all
    document.querySelectorAll('.faq-question').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      const ans = b.nextElementSibling;
      if (ans) ans.classList.remove('is-open');
    });
    // Toggle clicked
    if (!expanded) {
      btn.setAttribute('aria-expanded', 'true');
      const answer = btn.nextElementSibling;
      if (answer) answer.classList.add('is-open');
    }
  });
});

// --- Scroll Animations ---
const animateEls = document.querySelectorAll('.benefit-card, .testimonial-card, .faq-item, .section-header, .who-content, .register-content');
animateEls.forEach(el => el.classList.add('animate-in'));
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
animateEls.forEach(el => observer.observe(el));

// --- Phone formatting ---
const phoneInput = document.getElementById('phone');
if (phoneInput) {
  phoneInput.addEventListener('input', e => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length <= 3) val = val;
    else if (val.length <= 6) val = `(${val.slice(0,3)}) ${val.slice(3)}`;
    else val = `(${val.slice(0,3)}) ${val.slice(3,6)}-${val.slice(6,10)}`;
    e.target.value = val;
  });
}

// --- Form Submission ---
const form = document.getElementById('registerForm');
const formSuccess = document.getElementById('formSuccess');
const submitBtn = document.getElementById('submitBtn');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic validation
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const consent = document.getElementById('consent').checked;

    let valid = true;
    if (!firstName) { markError('firstName'); valid = false; }
    if (!lastName) { markError('lastName'); valid = false; }
    if (!email || !email.includes('@')) { markError('email'); valid = false; }
    if (!consent) {
      document.getElementById('consent').closest('.form-consent').style.outline = '2px solid #DC2626';
      valid = false;
    }
    if (!valid) return;

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2"/><path d="M21 12a9 9 0 00-9-9"/></svg> Registering...';

    // Simulate submission (replace with real endpoint)
    await new Promise(r => setTimeout(r, 1400));

    // Show success
    form.style.display = 'none';
    formSuccess.style.display = 'flex';
    formSuccess.style.flexDirection = 'column';

    // Track conversion event (if Meta Pixel is installed)
    if (typeof fbq !== 'undefined') {
      fbq('track', 'CompleteRegistration', {
        content_name: 'USPS Benefits Webinar',
        currency: 'USD',
        value: 0
      });
    }
  });
}

function markError(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('error');
    el.addEventListener('input', () => el.classList.remove('error'), { once: true });
  }
}

// Copy link
function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = event.target.closest('button');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  });
}

// Spin animation for loading
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

// Dark mode toggle (attach to any [data-theme-toggle] element)
(function () {
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  r.setAttribute('data-theme', d);
  if (t) {
    t.addEventListener('click', () => {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
    });
  }
})();
