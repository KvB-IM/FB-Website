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

    const payload = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      webinarDate: document.getElementById('webinarDate').value,
      yearsService: document.getElementById('yearsService').value,
      topic: document.getElementById('topic').value,
      agency: document.getElementById('agency') ? document.getElementById('agency').value : 'Federal'
    };

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

// --- Concerns Card Stack Slider ---
(function() {
  const concernsCard = document.getElementById('concernsCard');
  if (!concernsCard) return;

  const slides = concernsCard.querySelectorAll('.concern-card-item');
  const dotsContainer = document.getElementById('concernDots');
  const currentText = document.getElementById('concernCurrent');
  const totalText = document.getElementById('concernTotal');
  const prevBtn = document.getElementById('prevConcern');
  const nextBtn = document.getElementById('nextConcern');
  const progressBar = document.getElementById('concernProgress');

  if (slides.length === 0) return;

  let currentIndex = 0;
  let prevIndex = 0;
  const slideDuration = 4000; // 4 seconds
  let slideInterval = null;
  let isHovered = false;

  if (totalText) totalText.textContent = slides.length;

  // Generate dots
  if (dotsContainer) {
    slides.forEach((_, index) => {
      const dot = document.createElement('div');
      dot.className = `nav-dot${index === 0 ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Go to alert ${index + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(index);
        resetAutoplay();
      });
      dotsContainer.appendChild(dot);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      resetAutoplay();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      resetAutoplay();
    });
  }

  function updateCarousel() {
    const total = slides.length;

    slides.forEach((slide, i) => {
      // Clear all layout state classes
      slide.classList.remove('card--front', 'card--middle', 'card--back', 'card--hidden', 'card--exit');

      let diff = (i - currentIndex + total) % total;

      if (i === prevIndex && currentIndex !== prevIndex) {
        slide.classList.add('card--exit');
      } else if (diff === 0) {
        slide.classList.add('card--front');
      } else if (diff === 1) {
        slide.classList.add('card--middle');
      } else if (diff === 2) {
        slide.classList.add('card--back');
      } else {
        slide.classList.add('card--hidden');
      }
    });

    prevIndex = currentIndex;

    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.nav-dot');
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
      });
    }

    if (currentText) {
      currentText.textContent = currentIndex + 1;
    }

    if (!isHovered) {
      resetProgressBar();
    }
  }

  function resetProgressBar() {
    if (!progressBar) return;
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    void progressBar.offsetWidth;
    progressBar.style.transition = `width ${slideDuration}ms linear`;
    progressBar.style.width = '100%';
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateCarousel();
  }

  function nextSlide() {
    currentIndex = (currentIndex + 1) % slides.length;
    updateCarousel();
  }

  function goToSlide(index) {
    currentIndex = index;
    updateCarousel();
  }

  function startAutoplay() {
    resetProgressBar();
    slideInterval = setInterval(nextSlide, slideDuration);
  }

  function resetAutoplay() {
    clearInterval(slideInterval);
    startAutoplay();
  }

  concernsCard.addEventListener('mouseenter', () => {
    isHovered = true;
    clearInterval(slideInterval);
    if (progressBar) {
      const computedWidth = window.getComputedStyle(progressBar).width;
      progressBar.style.transition = 'none';
      progressBar.style.width = computedWidth;
    }
  });

  concernsCard.addEventListener('mouseleave', () => {
    isHovered = false;
    resetAutoplay();
  });

  updateCarousel();
  startAutoplay();
})();
