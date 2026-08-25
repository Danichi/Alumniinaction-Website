/* ==========================================================================
   ALUMNI IN ACTION — Smooth scroll, ScrollTrigger bridge, fluid type ramp,
   scroll, nav, forms
   ========================================================================== */

window.AIA = window.AIA || {};

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  AIA.reduceMotion = reduceMotion;

  /* ------------------------------------------------------------------
     Fluid type ramp
     Every size token is em-based, so scaling the root font-size between
     991px and 1440px scales the entire layout with the viewport.
     ------------------------------------------------------------------ */
  function setFontSize() {
    var w = window.innerWidth;
    if (w <= 1440 && w >= 991) {
      /* Floored at 0.8 — below that the tablet media queries are already
         shrinking the tokens and the two together crush the layout. */
      document.body.style.fontSize = Math.max(w / 1440, 0.8) + 'rem';
    } else {
      document.body.style.removeProperty('font-size');
    }
  }
  setFontSize();
  window.addEventListener('resize', setFontSize);

  /* ------------------------------------------------------------------
     Always open at the top — the hero pin depends on it
     ------------------------------------------------------------------ */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!window.location.hash) window.scrollTo(0, 0);

  /* ------------------------------------------------------------------
     Lenis + ScrollTrigger
     ------------------------------------------------------------------ */
  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;

  if (!reduceMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 0.65,
      gestureOrientation: 'vertical',
      normalizeWheel: false,
      smoothTouch: false
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  AIA.lenis = lenis;
  AIA.stopScroll = function () { if (lenis) lenis.stop(); document.documentElement.classList.add('no-scroll'); };
  AIA.startScroll = function () { if (lenis) lenis.start(); document.documentElement.classList.remove('no-scroll'); };

  /* Anchor links routed through Lenis so in-page jumps stay smooth. */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -80 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ------------------------------------------------------------------
     Ready signal — the hero entry animation waits on this. There is no
     loader curtain any more, so it fires as soon as the page is up.
     ------------------------------------------------------------------ */
  function signalReady() {
    ScrollTrigger.refresh();
    document.dispatchEvent(new Event('aia:ready'));
  }

  if (document.readyState === 'complete') signalReady();
  else window.addEventListener('load', signalReady);

  /* ------------------------------------------------------------------
     Navbar — colour flip on scroll, mobile menu
     ------------------------------------------------------------------ */
  var navbar = document.querySelector('.navbar');

  if (navbar) {
    /* Pages without a photographic hero start with dark type on cream. */
    if (navbar.hasAttribute('data-nav-solid')) navbar.classList.add('is-scrolled');

    ScrollTrigger.create({
      start: 'top -80',
      end: 99999,
      onUpdate: function (self) {
        if (navbar.hasAttribute('data-nav-solid')) return;
        navbar.classList.toggle('is-scrolled', self.scroll() > 80);
      }
    });

    var navToggle = navbar.querySelector('[data-nav-toggle]');
    if (navToggle) {
      navToggle.addEventListener('click', function () {
        var open = navbar.classList.toggle('is-nav-open');
        navToggle.setAttribute('aria-expanded', String(open));
        if (open) AIA.stopScroll(); else AIA.startScroll();
      });

      /* Close the mobile menu when a link inside it is tapped. */
      navbar.querySelectorAll('.nav-menu a').forEach(function (a) {
        a.addEventListener('click', function () {
          if (!navbar.classList.contains('is-nav-open')) return;
          navbar.classList.remove('is-nav-open');
          navToggle.setAttribute('aria-expanded', 'false');
          AIA.startScroll();
        });
      });
    }
  }

  /* ------------------------------------------------------------------
     Donation amount picker — chips write into the "other amount" field
     ------------------------------------------------------------------ */
  var amountGrid = document.querySelector('[data-amount-grid]');
  if (amountGrid) {
    var amountInput = document.querySelector('[data-amount-input]');
    amountGrid.querySelectorAll('.amount-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        amountGrid.querySelectorAll('.amount-chip').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        if (amountInput) amountInput.value = chip.getAttribute('data-amount') || '';
      });
    });
  }

  /* ------------------------------------------------------------------
     Contact form
     No backend on a static build — validate, then hand the visitor a
     mailto fallback so the message still reaches the organisation.
     ------------------------------------------------------------------ */
  var CONTACT_EMAIL = 'j.kovacic@alumniinaction.com';

  var form = document.querySelector('[data-contact-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var note = form.querySelector('[data-form-note]');
      var data = new FormData(form);
      var name = (data.get('name') || '').trim();
      var email = (data.get('email') || '').trim();

      if (!name || !email) {
        if (note) {
          note.textContent = 'Please add your name and email so we can reply.';
          note.style.color = '#b3401a';
        }
        return;
      }

      var body = [
        'Name: ' + name,
        'Email: ' + email,
        'Phone: ' + (data.get('phone') || '—'),
        'I am a: ' + (data.get('role') || '—'),
        'Subject: ' + (data.get('subject') || '—'),
        '',
        data.get('message') || ''
      ].join('\n');

      window.location.href = 'mailto:' + CONTACT_EMAIL
        + '?subject=' + encodeURIComponent('Website enquiry — ' + name)
        + '&body=' + encodeURIComponent(body);

      if (note) {
        note.textContent = 'Opening your email client. If nothing happens, write to ' + CONTACT_EMAIL + ' directly.';
        note.style.color = '';
      }
    });
  }

  /* Donation enquiry form — same mailto handoff, different subject line. */
  var donateForm = document.querySelector('[data-donate-form]');
  if (donateForm) {
    donateForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var note = donateForm.querySelector('[data-form-note]');
      var data = new FormData(donateForm);
      var name = (data.get('name') || '').trim();
      var email = (data.get('email') || '').trim();

      if (!name || !email) {
        if (note) {
          note.textContent = 'Please add your name and email so we can send you the donation details.';
          note.style.color = '#b3401a';
        }
        return;
      }

      var body = [
        'Name: ' + name,
        'Email: ' + email,
        'Organisation: ' + (data.get('organisation') || '—'),
        'Intended amount: ' + (data.get('amount') || '—'),
        '',
        data.get('message') || ''
      ].join('\n');

      window.location.href = 'mailto:' + CONTACT_EMAIL
        + '?subject=' + encodeURIComponent('Donation enquiry — ' + name)
        + '&body=' + encodeURIComponent(body);

      if (note) {
        note.textContent = 'Opening your email client. If nothing happens, write to ' + CONTACT_EMAIL + ' directly.';
        note.style.color = '';
      }
    });
  }

  /* ------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------ */
  var year = new Date().getFullYear();
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = year; });
})();
