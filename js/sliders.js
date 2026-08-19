/* ==========================================================================
   ALUMNI IN ACTION — Swiper instances
   Ways to help: a card track with a crossfading background bed behind it.
   ========================================================================== */

(function () {
  'use strict';

  if (typeof Swiper === 'undefined') return;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  document.querySelectorAll('.section-home-projects').forEach(function (section) {
    var bgEl = section.querySelector('.home-projects_bg-list-wrapper.swiper');
    var mainEl = section.querySelector('.home-projects_list-wrapper.swiper');
    if (!mainEl) return;

    var swiperBg = null;

    if (bgEl) {
      swiperBg = new Swiper(bgEl, {
        direction: 'horizontal',
        loop: false,
        speed: 800,
        slidesPerView: 1,
        allowTouchMove: false,
        effect: 'fade',
        fadeEffect: { crossFade: true }
      });
    }

    var swiperMain = new Swiper(mainEl, {
      direction: 'horizontal',
      loop: false,
      spaceBetween: 16,
      slidesPerView: 'auto',
      speed: 800,
      followFinger: true,
      navigation: {
        nextEl: section.querySelector('.btn-next'),
        prevEl: section.querySelector('.btn-prev'),
        disabledClass: 'is-disabled'
      }
    });

    /* Keep the photo bed in step with the card the visitor is reading. */
    if (swiperBg) {
      swiperMain.on('slideChange', function () {
        swiperBg.slideTo(Math.min(swiperMain.activeIndex, swiperBg.slides.length - 1));
      });
    }

    var current = section.querySelector('.swiper-number-current');
    var total = section.querySelector('.swiper-number-total');
    var count = mainEl.querySelectorAll('.swiper-slide').length;

    if (total) total.textContent = pad(count);
    if (current) current.textContent = '01';

    swiperMain.on('slideChange', function () {
      if (current) current.textContent = pad(swiperMain.realIndex + 1);
    });
  });
})();
