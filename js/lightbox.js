/* ==========================================================================
   ALUMNI IN ACTION — Document lightbox

   The letters of support and the printed feature run at thumbnail size in the
   page grid, which is enough to see that they exist but nowhere near enough to
   read them. Any image tagged [data-zoom] becomes clickable: it opens full
   screen, fitted to the viewport, with a second click stepping up to the
   file's native resolution so the body copy is actually legible.

   Images tagged with the same [data-zoom-group] are browsable with the arrows.
   ========================================================================== */

(function () {
  'use strict';

  var items = Array.prototype.slice.call(document.querySelectorAll('[data-zoom]'));
  if (!items.length) return;

  /* ------------------------------------------------------------------
     Markup — one overlay for the whole page, built once on first open
     ------------------------------------------------------------------ */
  var box, stage, img, capEl, countEl, zoomBtn, prevBtn, nextBtn;
  var index = 0;
  var group = items;
  var zoomed = false;
  var lastFocus = null;

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
          '<button type="button" class="lightbox_btn" data-lb-zoom aria-label="Zoom in">' +
            '<span class="lightbox_btn-label">Zoom in</span></button>' +
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
    zoomBtn = box.querySelector('[data-lb-zoom]');
    prevBtn = box.querySelector('[data-lb-prev]');
    nextBtn = box.querySelector('[data-lb-next]');

    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]')) { close(); return; }
      if (e.target.closest('[data-lb-zoom]'))  { toggleZoom(); return; }
      if (e.target.closest('[data-lb-prev]'))  { step(-1); return; }
      if (e.target.closest('[data-lb-next]'))  { step(1); return; }
      /* Clicking the picture itself is the fastest way in and out of zoom. */
      if (e.target === img) { toggleZoom(); return; }
      /* Anywhere else on the stage is dead space around the page — close. */
      if (e.target === stage) close();
    });

    /* Drag to pan once the document is bigger than the stage. */
    var dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
    stage.addEventListener('pointerdown', function (e) {
      if (!zoomed) return;
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
    setZoom(false);
    img.src = el.currentSrc || el.src;
    img.alt = el.getAttribute('alt') || '';
    capEl.textContent = captionFor(el);
    countEl.textContent = group.length > 1 ? '[ ' + (index + 1) + ' / ' + group.length + ' ]' : '';
    var many = group.length > 1;
    prevBtn.hidden = !many;
    nextBtn.hidden = !many;
  }

  function step(dir) {
    show((index + dir + group.length) % group.length);
  }

  function setZoom(on) {
    /* Measure the fitted size before the class flip changes it. */
    var fitW = img.clientWidth;

    zoomed = on;
    box.classList.toggle('is-zoomed', on);
    zoomBtn.querySelector('.lightbox_btn-label').textContent = on ? 'Fit to screen' : 'Zoom in';
    zoomBtn.setAttribute('aria-label', on ? 'Fit to screen' : 'Zoom in');

    if (!on) {
      img.style.width = '';
      img.style.height = '';
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
      return;
    }

    /* Native resolution is the goal, but the low-res scans are already smaller
       than the fitted view — for those, step up anyway rather than shrinking
       the picture on a button marked "Zoom in". Capped so an upscale stays
       this side of unreadable. */
    var natural = img.naturalWidth || fitW;
    var target = Math.min(Math.max(natural, fitW * 1.8), natural * 2.2);
    img.style.width = Math.round(target) + 'px';
    img.style.height = 'auto';

    /* Open on the top of the document, horizontally centred — letters and
       articles are read from the top down. */
    stage.scrollTop = 0;
    stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
  }

  function toggleZoom() {
    if (img.dataset.lbDragged) return;
    setZoom(!zoomed);
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
    zoomBtn.focus();
  }

  function close() {
    if (!box) return;
    box.classList.remove('is-open');
    setZoom(false);
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
    if (e.key === 'ArrowLeft')  { step(-1); }
    if (e.key === 'ArrowRight') { step(1); }
  });
})();
