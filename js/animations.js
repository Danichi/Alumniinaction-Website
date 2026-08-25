/* ==========================================================================
   ALUMNI IN ACTION — Scroll animations
   SplitText line reveals, hero pin, program card stack, count-ups, parallax
   ========================================================================== */

(function () {
  'use strict';

  if (window.AIA && window.AIA.reduceMotion) return;

  gsap.registerPlugin(ScrollTrigger);
  var hasSplit = typeof SplitText !== 'undefined';

  var mm = gsap.matchMedia();

  /* ------------------------------------------------------------------
     Line-by-line heading reveals
     ------------------------------------------------------------------ */
  function initSplitReveals() {
    document.querySelectorAll('[data-split-lines]').forEach(function (el) {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = '1';

      if (!hasSplit) {
        gsap.from(el, {
          y: 40, opacity: 0, duration: 0.9, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%' }
        });
        return;
      }

      var split = new SplitText(el, { type: 'lines', linesClass: 'split-line' });

      /* Wrap each line so it can slide out from behind a mask. */
      var inners = split.lines.map(function (line) {
        var inner = document.createElement('span');
        inner.style.display = 'block';
        while (line.firstChild) inner.appendChild(line.firstChild);
        line.appendChild(inner);
        return inner;
      });

      gsap.set(inners, { yPercent: 110 });

      gsap.to(inners, {
        yPercent: 0,
        duration: 1.05,
        ease: 'expo.out',
        stagger: 0.075,
        scrollTrigger: { trigger: el, start: 'top 95%', once: true }
      });
    });
  }

  /* ------------------------------------------------------------------
     Generic fade-up reveals
     ------------------------------------------------------------------ */
  function initReveals() {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.dataset.revealDone) return;
      el.dataset.revealDone = '1';

      gsap.from(el, {
        y: 34,
        opacity: 0,
        duration: 0.95,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 98%', once: true }
      });
    });
  }

  /* Staggered reveal for grids — children lift in sequence, not as one block. */
  function initStaggers() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      if (group.dataset.staggerDone) return;
      group.dataset.staggerDone = '1';

      gsap.from(group.children, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.09,
        scrollTrigger: { trigger: group, start: 'top 92%', once: true }
      });
    });
  }

  /* ------------------------------------------------------------------
     Hero — bed parallax, text lift-out, crest reveal into the centre
     ------------------------------------------------------------------ */
  function initHero() {
    var section = document.querySelector('.section-home-hero');
    if (!section) return;

    mm.add('(min-width: 992px)', function () {
      var wrapper = section.querySelector('.home-hero_wrapper');
      var shift = section.querySelector('.home-hero_crest-shift');
      var sticky = section.querySelector('.home-hero_sticky-div');

      /* Both of these read offsetHeight, which transforms do not affect — so
         they stay correct when ScrollTrigger re-evaluates them on refresh,
         even though the crest is mid-tween at the time. */
      function crestTravel() {
        /* The wrapper is centred in the sticky stage and the crest sits at the
           top of it, so this is exactly the distance to the middle. */
        return (wrapper.offsetHeight - shift.offsetHeight) / 2;
      }

      function crestScale() {
        if (!shift.offsetHeight) return 2;
        /* Land at roughly a quarter of the stage height, whatever the viewport
           is doing to the em-based crest. */
        var target = sticky.offsetHeight * 0.26 / shift.offsetHeight;
        return Math.max(1.6, Math.min(3.2, target));
      }

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          invalidateOnRefresh: true
        }
      });

      /* One photo bed the whole way down — it drifts and scales, and the cream
         curtain below takes it out. No swap to a second image.

         The text has to be gone before it reaches the navbar, which flips to
         solid cream at 80px of scroll and slices anything still behind it. The
         crest is the exception: instead of fading with the rest it grows and
         travels down into the middle of the stage, holds there as the brand
         moment, and only then goes out with the wash. */
      tl.to('.home-hero_bg', { yPercent: 12, scale: 1.12, ease: 'none', duration: 1 }, 0)
        .to('.home-hero_lockup', { yPercent: -10, ease: 'none', duration: 1 }, 0)
        .to('.home-hero_lockup', { opacity: 0, ease: 'power2.in', duration: 0.26 }, 0.02)
        /* Held until the text is fully gone. Overlapping the two puts the
           crest on top of a half-faded headline, which reads as a collision
           rather than a hand-off. */
        .to(shift, {
          y: crestTravel,
          scale: crestScale,
          ease: 'power2.inOut',
          duration: 0.40
        }, 0.12)
        .to(shift, { opacity: 0, ease: 'power2.in', duration: 0.24 }, 0.74)
        .to('.home-hero_sticky-div', { '--hero-fade': 1, ease: 'none', duration: 1 }, 0);

      /* The ::after curtain can't be tweened directly — drive its opacity
         through a custom property the pseudo-element reads. */
      gsap.set('.home-hero_sticky-div', { '--hero-fade': 0 });

      /* Dropping below the breakpoint tears the timeline down; clear what it
         left on the crest so the stacked mobile hero starts clean. */
      return function () {
        gsap.set(shift, { clearProps: 'transform,opacity' });
      };
    });

    /* Entry animation for the hero, once the page is up. */
    document.addEventListener('aia:ready', function () {
      gsap.from('.home-hero_crest', {
        scale: 0.8, opacity: 0, duration: 1.1, ease: 'expo.out', delay: 0.15
      });
      gsap.from('.home-hero_bg', {
        scale: 1.16, duration: 1.8, ease: 'expo.out'
      });
    }, { once: true });
  }

  /* ------------------------------------------------------------------
     Programs — the sticky stacked-card scrub
     Each card lifts away as the next one settles behind it.
     ------------------------------------------------------------------ */
  function initScopeStack() {
    var track = document.querySelector('[data-scope-track]');
    if (!track) return;

    var cards = gsap.utils.toArray('[data-scope-card]');
    if (!cards.length) return;

    mm.add('(min-width: 992px)', function () {
      /* Opt the CSS into the pinned, overlapping layout. Until this runs the
         cards render as an ordinary vertical list, so a failed script degrades
         to something readable instead of four cards on top of each other. */
      track.classList.add('is-stacked');

      /* Stack order: card 1 on top, each subsequent card behind it. */
      cards.forEach(function (card, i) {
        gsap.set(card, { zIndex: cards.length - i });
        if (i > 0) {
          gsap.set(card, { yPercent: 8, opacity: 0 });
          gsap.set(card.querySelector('.home-scope_item_img'), { scale: 0.92 });
        }
      });

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.7
        }
      });

      /* One segment per handoff, so the timeline maps evenly to the track. */
      cards.forEach(function (card, i) {
        if (i === 0) return;
        var prev = cards[i - 1];
        var at = (i - 1);

        tl.to(prev, { yPercent: -10, opacity: 0, duration: 1, ease: 'power2.inOut' }, at)
          .to(prev.querySelector('.home-scope_item_img'), { scale: 1.06, duration: 1, ease: 'power2.inOut' }, at)
          .to(card, { yPercent: 0, opacity: 1, duration: 1, ease: 'power2.inOut' }, at)
          .to(card.querySelector('.home-scope_item_img'), { scale: 1, duration: 1, ease: 'power2.inOut' }, at);
      });

      return function () {
        track.classList.remove('is-stacked');
        cards.forEach(function (card) {
          gsap.set(card, { clearProps: 'all' });
          gsap.set(card.querySelector('.home-scope_item_img'), { clearProps: 'all' });
        });
      };
    });
  }

  /* ------------------------------------------------------------------
     Stats — divider rule draw + number count-up
     ------------------------------------------------------------------ */
  function initStats() {
    document.querySelectorAll('[data-divider]').forEach(function (el) {
      gsap.to(el, {
        scaleX: 1,
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    document.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var plain = el.hasAttribute('data-count-plain');
      var decimals = parseInt(el.getAttribute('data-count-decimals') || '0', 10);
      var obj = { v: 0 };

      /* The markup carries the finished figure so a failed script still reads
         correctly — zero it only once we know the count-up will actually run. */
      el.textContent = decimals > 0 ? (0).toFixed(decimals) : '0';

      gsap.to(obj, {
        v: target,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onUpdate: function () {
          if (decimals > 0) {
            el.textContent = obj.v.toFixed(decimals);
            return;
          }
          var n = Math.round(obj.v);
          el.textContent = plain ? String(n) : n.toLocaleString('en-US');
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Background parallax
     ------------------------------------------------------------------ */
  function initParallax() {
    mm.add('(min-width: 768px)', function () {
      document.querySelectorAll('[data-parallax]').forEach(function (el) {
        gsap.fromTo(el,
          { yPercent: -8, scale: 1.14 },
          {
            yPercent: 8,
            scale: 1.14,
            ease: 'none',
            scrollTrigger: {
              trigger: el.closest('section') || el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6
            }
          }
        );
      });
    });
  }

  /* ------------------------------------------------------------------
     Marquees — duplicate each track so the loop is seamless
     ------------------------------------------------------------------ */
  function initMarquees() {
    document.querySelectorAll('[data-marquee-track]').forEach(function (track) {
      var parent = track.parentElement;
      /* Two clones keeps the strip wider than any viewport at 100% translate. */
      for (var i = 0; i < 2; i++) {
        var clone = track.cloneNode(true);
        clone.removeAttribute('data-marquee-track');
        clone.setAttribute('aria-hidden', 'true');
        parent.appendChild(clone);
      }
    });
  }

  /* ------------------------------------------------------------------
     Accordions
     ------------------------------------------------------------------ */
  function initAccordions() {
    var items = document.querySelectorAll('[data-accordion]');
    items.forEach(function (item) {
      var toggle = item.querySelector('[data-accordion-toggle]');
      if (!toggle) return;

      toggle.addEventListener('click', function () {
        var wasOpen = item.classList.contains('is-open');

        items.forEach(function (other) {
          other.classList.remove('is-open');
          var t = other.querySelector('[data-accordion-toggle]');
          if (t) t.setAttribute('aria-expanded', 'false');
        });

        if (!wasOpen) {
          item.classList.add('is-open');
          toggle.setAttribute('aria-expanded', 'true');
        }

        /* Height changed — let pinned sections re-measure. */
        setTimeout(function () { ScrollTrigger.refresh(); }, 520);
      });
    });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function init() {
    initMarquees();
    initAccordions();
    initSplitReveals();
    initReveals();
    initStaggers();
    initHero();
    initScopeStack();
    initStats();
    initParallax();
    ScrollTrigger.refresh();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
  } else {
    window.addEventListener('load', init);
  }

  /* Re-measure after a resize so line breaks and pin distances stay correct. */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 250);
  });
})();
