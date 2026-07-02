/* Federal Benefits Exchange — Landing Page JS */

// --- Scroll-aware header fallback ---
if (!CSS.supports('animation-timeline', 'scroll()')) {
  (function () {
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) header.classList.add('header--scrolled');
      else header.classList.remove('header--scrolled');
    }, { passive: true });
  })();
}

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

// --- FAQ Accordion fallback for older browsers ---
(function() {
  const detailsElements = document.querySelectorAll('details[name="faq-accordion"]');
  detailsElements.forEach(targetDetails => {
    targetDetails.addEventListener('toggle', () => {
      if (targetDetails.open) {
        detailsElements.forEach(detail => {
          if (detail !== targetDetails && detail.open) {
            detail.open = false;
          }
        });
      }
    });
  });
})();

// --- Scroll Animations fallback ---
if (!CSS.supports('animation-timeline', 'view()')) {
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
} else {
  // If native Scroll-Driven Animations are supported, we still need to add 'animate-in' class to make them active
  document.querySelectorAll('.benefit-card, .testimonial-card, .faq-item, .section-header, .who-content, .register-content')
    .forEach(el => el.classList.add('animate-in'));
}

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

// --- Form Submission & Validation ---
const form = document.getElementById('registerForm');
const formSuccess = document.getElementById('formSuccess');
const submitBtn = document.getElementById('submitBtn');

if (form) {
  const syncAria = (el) => {
    if (el.checkValidity) {
      const isValid = el.checkValidity();
      el.setAttribute('aria-invalid', isValid ? 'false' : 'true');
      el.classList.toggle('error', !isValid);
      
      if (el.id === 'consent') {
        el.closest('.form-consent').classList.toggle('has-error', !isValid);
      }
    }
  };

  form.addEventListener('blur', (e) => {
    if (e.target.matches('input, select, textarea')) {
      syncAria(e.target);
    }
  }, true);

  form.addEventListener('input', (e) => {
    if (e.target.hasAttribute('aria-invalid')) {
      syncAria(e.target);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const inputs = form.querySelectorAll('input, select');
    let firstInvalid = null;
    
    inputs.forEach(input => {
      syncAria(input);
      if (!input.checkValidity() && !firstInvalid) {
        firstInvalid = input;
      }
    });

    if (!form.checkValidity()) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Loading state
    submitBtn.disabled = true;
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2"/><path d="M21 12a9 9 0 00-9-9"/></svg> Registering...';

    // Generate a unique event ID for Meta CAPI deduplication
    const eventId = 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Get Meta Cookies if they exist
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    };

    const payload = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      webinarDate: document.getElementById('webinarDate').value,
      yearsService: document.getElementById('yearsService').value,
      topic: document.getElementById('topic').value,
      agency: document.getElementById('agency') ? document.getElementById('agency').value : 'Federal',
      // Meta CAPI data
      eventId: eventId,
      clientUserAgent: navigator.userAgent,
      eventSourceUrl: window.location.href,
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc')
    };

    // Trigger Browser Pixel event manually with the same eventId for deduplication
    if (typeof fbq === 'function') {
      fbq('track', 'Lead', {
        content_name: 'Webinar Registration',
        content_category: payload.agency === 'USPS' ? 'USPS' : 'Federal'
      }, { eventID: eventId });
    }

    fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Show success state
        form.style.display = 'none';
        formSuccess.style.display = 'flex';
        formSuccess.style.flexDirection = 'column';

        // Track conversion event (if Meta Pixel is installed)
        if (typeof fbq !== 'undefined') {
          fbq('track', 'Lead');
          fbq('track', 'CompleteRegistration', {
            content_name: payload.agency === 'USPS' ? 'USPS Benefits Webinar' : 'Federal Benefits Webinar',
            currency: 'USD',
            value: 0
          });
        }
      } else {
        alert(data.error || 'An error occurred during registration. Please check your details and try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    })
    .catch(err => {
      console.error('Registration error:', err);
      alert('Network error. Please try again later.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
    });
  });
}

// Copy link helper
function copyLink(btn) {
  const targetBtn = btn || (typeof event !== 'undefined' ? event.target : null);
  navigator.clipboard.writeText(window.location.href).then(() => {
    if (targetBtn) {
      const buttonEl = targetBtn.closest ? targetBtn.closest('button') : targetBtn;
      const orig = buttonEl.innerHTML;
      buttonEl.innerHTML = '✓ Copied!';
      setTimeout(() => { buttonEl.innerHTML = orig; }, 2000);
    }
  }).catch(err => {
    console.error('Failed to copy link:', err);
  });
}

// Spin animation for loading
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

// --- Dark Mode Switcher ---
(function () {
  const root = document.documentElement;
  const toggles = document.querySelectorAll('.theme-toggle');
  
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  
  root.setAttribute('data-theme', currentTheme);
  
  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', currentTheme);
      localStorage.setItem('theme', currentTheme);
    });
  });
})();


