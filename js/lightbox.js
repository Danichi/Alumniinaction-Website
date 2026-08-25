/* ==========================================================================
   ALUMNI IN ACTION — Document lightbox

   The letters of support and the printed feature run at thumbnail size in the
   page grid, which is enough to see that they exist but nowhere near enough to
   read them. Any image tagged [data-zoom] becomes clickable: it opens full
   screen, fitted to the viewport, and then zooms in steps.

   The steps are multiples of the fitted size, not of the file's own pixel
   dimensions. A one-page letter is legible at native resolution; a full
   magazine page shot at the same resolution is not, because the same pixels
   are carrying ten times the words. Anchoring to the fitted size means both
   reach a readable size in the same number of clicks.

   Images tagged with the same [data-zoom-group] are browsable with the arrows.
   ========================================================================== */

(function () {
  'use strict';

  var items = Array.prototype.slice.call(document.querySelectorAll('[data-zoom]'));
  if (!items.length) return;

  /* ------------------------------------------------------------------
     Markup — one overlay for the whole page, built once on first open
     ------------------------------------------------------------------ */
  var box, stage, img, capEl, countEl, outBtn, inBtn, pctEl, prevBtn, nextBtn;
  var index = 0;
  var group = items;
  var lastFocus = null;

  /* Multiples of the fitted size. The top step is deliberately past native for
     most of these files — they are photographs of print, so an upscale is soft
     but still the difference between reading it and not. */
  var STEPS = [1, 1.9, 2.9, 4.2];
  var step = 0;
  var fitW = 0;

  function build() {
    box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Document viewer');
    box.innerHTML =
      '<div class="lightbox_backdrop" data-lb-close></div>' +
      '<div class="lightbox_bar">' +
        '<div class="lightbox_cap"><span class="lightbox_cap-text"></span>' +
        '<span class="lightbox_count labels"></span></div>' +
        '<div class="lightbox_tools">' +
          '<div class="lightbox_zoom">' +
            '<button type="button" class="lightbox_btn is-icon" data-lb-out aria-label="Zoom out">' +
              '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
            '</button>' +
            '<span class="lightbox_pct labels" aria-live="polite">Fit</span>' +
            '<button type="button" class="lightbox_btn is-icon" data-lb-in aria-label="Zoom in">' +
              '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>' +
          '<button type="button" class="lightbox_btn is-icon" data-lb-close aria-label="Close">' +
            '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="lightbox_stage" data-lb-stage><img alt=""></div>' +
      '<button type="button" class="lightbox_nav is-prev" data-lb-prev aria-label="Previous">' +
        '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 2L4 8l6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button type="button" class="lightbox_nav is-next" data-lb-next aria-label="Next">' +
        '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 2l6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';

    document.body.appendChild(box);

    stage   = box.querySelector('[data-lb-stage]');
    img     = stage.querySelector('img');
    capEl   = box.querySelector('.lightbox_cap-text');
    countEl = box.querySelector('.lightbox_count');
    outBtn  = box.querySelector('[data-lb-out]');
    inBtn   = box.querySelector('[data-lb-in]');
    pctEl   = box.querySelector('.lightbox_pct');
    prevBtn = box.querySelector('[data-lb-prev]');
    nextBtn = box.querySelector('[data-lb-next]');

    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]')) { close(); return; }
      if (e.target.closest('[data-lb-out]'))   { setStep(step - 1); return; }
      if (e.target.closest('[data-lb-in]'))    { setStep(step + 1); return; }
      if (e.target.closest('[data-lb-prev]'))  { go(-1); return; }
      if (e.target.closest('[data-lb-next]'))  { go(1); return; }
      /* Clicking the picture steps further in, then wraps back to fit —
         the whole range is reachable without going near the toolbar. */
      if (e.target === img) {
        if (img.dataset.lbDragged) return;
        setStep(step >= STEPS.length - 1 ? 0 : step + 1);
        return;
      }
      /* Anywhere else on the stage is dead space around the page — close. */
      if (e.target === stage) close();
    });

    /* Ctrl/⌘ + wheel zooms, the way every other document viewer does it.
       A bare wheel is left alone so a zoomed page scrolls normally. */
    stage.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setStep(step + (e.deltaY < 0 ? 1 : -1));
    }, { passive: false });

    /* Drag to pan once the document is bigger than the stage. */
    var dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
    stage.addEventListener('pointerdown', function (e) {
      if (step === 0) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      sl = stage.scrollLeft; st = stage.scrollTop;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('is-grabbing');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      stage.scrollLeft = sl - (e.clientX - sx);
      stage.scrollTop  = st - (e.clientY - sy);
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      /* A drag must not also register as the click that toggles zoom. */
      if (Math.abs(e.clientX - sx) > 4 || Math.abs(e.clientY - sy) > 4) {
        img.dataset.lbDragged = '1';
        setTimeout(function () { delete img.dataset.lbDragged; }, 0);
      }
      stage.classList.remove('is-grabbing');
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
  }

  /* ------------------------------------------------------------------
     Open / close / navigate
     ------------------------------------------------------------------ */
  function captionFor(el) {
    if (el.getAttribute('data-zoom-caption')) return el.getAttribute('data-zoom-caption');
    var fig = el.closest('figure');
    var cap = fig && fig.querySelector('figcaption');
    if (cap) return cap.textContent.trim();
    return el.getAttribute('alt') || '';
  }

  function show(i) {
    index = i;
    var el = group[index];

    /* Back to fit before swapping, so the next file is measured unzoomed. */
    step = 0;
    box.classList.remove('is-zoomed');
    img.style.width = '';
    img.style.height = '';

    img.src = el.currentSrc || el.src;
    img.alt = el.getAttribute('alt') || '';
    capEl.textContent = captionFor(el);
    countEl.textContent = group.length > 1 ? '[ ' + (index + 1) + ' / ' + group.length + ' ]' : '';
    var many = group.length > 1;
    prevBtn.hidden = !many;
    nextBtn.hidden = !many;

    /* The fitted width is the basis for every zoom step, so it has to be
       measured once the file is actually laid out. */
    if (img.complete && img.naturalWidth) measureFit();
    else img.addEventListener('load', measureFit, { once: true });
  }

  function measureFit() {
    fitW = img.clientWidth;
    updateTools();
  }

  function go(dir) {
    show((index + dir + group.length) % group.length);
  }

  function updateTools() {
    pctEl.textContent = step === 0 ? 'Fit' : Math.round(STEPS[step] * 100) + '%';
    outBtn.disabled = step === 0;
    inBtn.disabled = step >= STEPS.length - 1;
    /* At the top step the next click on the picture wraps back to fit, so the
       cursor has to say zoom-out rather than promising more magnification. */
    box.classList.toggle('is-max', step >= STEPS.length - 1);
  }

  function setStep(next) {
    next = Math.max(0, Math.min(STEPS.length - 1, next));
    if (next === step || !fitW) { updateTools(); return; }

    /* Hold whatever is in the middle of the stage in the middle of the stage,
       so zooming in on a paragraph does not throw you somewhere else on the
       page. From the fitted view there is nothing to hold — start at the top,
       which is where you read from. */
    var fromFit = step === 0;
    var cx = stage.scrollWidth ? (stage.scrollLeft + stage.clientWidth / 2) / stage.scrollWidth : 0.5;
    var cy = stage.scrollHeight ? (stage.scrollTop + stage.clientHeight / 2) / stage.scrollHeight : 0;

    step = next;

    if (step === 0) {
      box.classList.remove('is-zoomed');
      img.style.width = '';
      img.style.height = '';
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
      updateTools();
      return;
    }

    /* Past roughly 3.5x the file's own pixels an upscale stops adding anything
       readable and just adds mush, so that is the ceiling. */
    var natural = img.naturalWidth || fitW;
    var target = Math.min(fitW * STEPS[step], natural * 3.5);

    box.classList.add('is-zoomed');
    img.style.width = Math.round(target) + 'px';
    img.style.height = 'auto';

    if (fromFit) {
      stage.scrollTop = 0;
      stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
    } else {
      stage.scrollLeft = cx * stage.scrollWidth - stage.clientWidth / 2;
      stage.scrollTop = cy * stage.scrollHeight - stage.clientHeight / 2;
    }
    updateTools();
  }

  function open(el) {
    if (!box) build();
    var name = el.getAttribute('data-zoom-group');
    group = name
      ? items.filter(function (n) { return n.getAttribute('data-zoom-group') === name; })
      : [el];

    lastFocus = document.activeElement;
    show(group.indexOf(el));
    box.classList.add('is-open');
    if (window.AIA && AIA.stopScroll) AIA.stopScroll();
    else document.documentElement.classList.add('no-scroll');
    inBtn.focus();
  }

  function close() {
    if (!box) return;
    box.classList.remove("is-open");
    setStep(0);
    if (window.AIA && AIA.startScroll) AIA.startScroll();
    else document.documentElement.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ------------------------------------------------------------------
     Wiring
     ------------------------------------------------------------------ */
  items.forEach(function (el) {
    el.classList.add('is-zoomable');

    /* Keyboard and screen-reader users need a real control, not a bare img. */
    var trigger = el.closest('a') ? null : el;
    if (!trigger) return;
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    if (!trigger.getAttribute('title')) trigger.setAttribute('title', 'Click to enlarge');

    trigger.addEventListener('click', function () { open(el); });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!box || !box.classList.contains('is-open')) return;
    if (e.key === 'Escape')     { e.preventDefault(); close(); }
    if (e.key === "ArrowLeft")  { go(-1); }
    if (e.key === "ArrowRight") { go(1); }
    if (e.key === "+" || e.key === "=") { setStep(step + 1); }
    if (e.key === "-" || e.key === "_") { setStep(step - 1); }
  });
})();
