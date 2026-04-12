/* ============================================================
   NEXOVA CONSEIL — script.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Footer year ─────────────────────────────────────── */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  /* ── 2. Sticky header ───────────────────────────────────── */
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }


  /* ── 3. Mobile navigation hamburger ─────────────────────── */
  const navToggle = document.getElementById('nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const isOpen = document.body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu on link click (mobile)
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (
        document.body.classList.contains('nav-open') &&
        !e.target.closest('.nav-links') &&
        !e.target.closest('#nav-toggle')
      ) {
        document.body.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }


  /* ── 4. Scroll reveal (IntersectionObserver) ────────────── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = el.style.getPropertyValue('--delay') || '0s';
        el.style.transitionDelay = delay;
        el.classList.add('visible');
        revealObserver.unobserve(el);
      });
    },
    { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
  );

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


  /* ── 5. Animated counters ───────────────────────────────── */
  const counters = document.querySelectorAll('.counter[data-target]');

  if (counters.length > 0) {
    const animateCounter = (el, target) => {
      const duration = 1600;
      const start = performance.now();

      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(ease * target);
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.dataset.target, 10);
          animateCounter(el, target);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(el => counterObserver.observe(el));
  }


  /* ── 6. Contact form validation ─────────────────────────── */
  const form = document.getElementById('contact-form');
  const formSuccess = document.getElementById('form-success');

  if (form && formSuccess) {
    const showError = (groupId) => {
      const group = document.getElementById(groupId);
      if (group) group.classList.add('has-error');
    };

    const clearError = (groupId) => {
      const group = document.getElementById(groupId);
      if (group) group.classList.remove('has-error');
    };

    const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

    // Live clear on input
    form.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => {
        const groupId = 'group-' + field.id;
        clearError(groupId);
      });
      field.addEventListener('change', () => {
        const groupId = 'group-' + field.id;
        clearError(groupId);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      const prenom = form.querySelector('#prenom');
      const nom    = form.querySelector('#nom');
      const email  = form.querySelector('#email');
      const objet  = form.querySelector('#objet');
      const msg    = form.querySelector('#message');

      if (!prenom.value.trim()) { showError('group-prenom'); valid = false; }
      else clearError('group-prenom');

      if (!nom.value.trim()) { showError('group-nom'); valid = false; }
      else clearError('group-nom');

      if (!isValidEmail(email.value.trim())) { showError('group-email'); valid = false; }
      else clearError('group-email');

      if (!objet.value) { showError('group-objet'); valid = false; }
      else clearError('group-objet');

      if (!msg.value.trim()) { showError('group-message'); valid = false; }
      else clearError('group-message');

      if (!valid) {
        // Scroll to first error
        const firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
        if (firstError) firstError.focus();
        return;
      }

      // Simulate submission
      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours…';

      setTimeout(() => {
        form.style.display = 'none';
        formSuccess.style.display = 'block';
        formSuccess.focus();
      }, 900);
    });
  }

}); // end DOMContentLoaded
