/* micro:bit 수업 자료 — 이미지 라이트박스 + MakeCode 임베드
   외부 라이브러리 없이 바닐라 JS만 사용한다. */
(function () {
  'use strict';

  /* 블록 코드 글씨가 작아 확대 없이는 읽기 어렵다.
     클릭 -> 어두운 배경 위에 원본 크기로 표시.
     다시 클릭하거나 ESC 로 닫는다. 원본이 화면보다 크면 스크롤된다. */
  var box = null;
  var boxImg = null;
  var closeBtn = null;
  var lastTrigger = null;

  function buildLightbox() {
    box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '이미지 확대 보기');

    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox-close';
    closeBtn.textContent = '닫기 (ESC)';

    boxImg = document.createElement('img');
    boxImg.alt = '';

    box.appendChild(boxImg);
    document.body.appendChild(box);
    document.body.appendChild(closeBtn);
    closeBtn.hidden = true;

    box.addEventListener('click', closeLightbox);
    closeBtn.addEventListener('click', closeLightbox);
  }

  function openLightbox(img) {
    if (!box) buildLightbox();
    boxImg.src = img.currentSrc || img.src;
    boxImg.alt = img.alt || '';
    box.hidden = false;
    closeBtn.hidden = false;
    box.scrollTop = 0;
    box.scrollLeft = 0;
    document.body.classList.add('lb-open');
    closeBtn.focus();
  }

  function closeLightbox() {
    if (!box || box.hidden) return;
    box.hidden = true;
    closeBtn.hidden = true;
    boxImg.removeAttribute('src');
    document.body.classList.remove('lb-open');
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
  }

  document.addEventListener('click', function (e) {
    var fig = e.target.closest ? e.target.closest('.shot') : null;
    if (!fig || fig.classList.contains('print-only')) return;
    var img = fig.querySelector('img');
    if (!img) return;
    lastTrigger = fig;
    openLightbox(img);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });

  /* 확대 가능한 이미지에 키보드 접근성 부여 */
  document.addEventListener('DOMContentLoaded', function () {
    var shots = document.querySelectorAll('.shot:not(.print-only)');
    for (var i = 0; i < shots.length; i++) {
      var s = shots[i];
      s.tabIndex = 0;
      s.setAttribute('role', 'button');
      s.setAttribute('aria-label', '이미지 크게 보기');
      s.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          lastTrigger = this;
          openLightbox(this.querySelector('img'));
        }
      });
    }
  });

  /* ==========================================================
     MakeCode 임베드
     <div class="mc" data-share="S…" data-name="…"> 안에서
     - [블록 코드] / [시뮬레이터] 탭: iframe 을 바꿔 보여 준다.
       시뮬레이터 iframe 은 처음 눌렀을 때만 만든다(무거워서).
     - [크게 보기]: 높이를 화면의 86% 로 늘였다 줄였다 한다.
     ========================================================== */
  var MC = 'https://makecode.microbit.org/';

  function mcFrame(wrap, view) {
    var share = wrap.getAttribute('data-share');
    var name = wrap.getAttribute('data-name') || '';
    var slot = wrap.querySelector('.mc-frame');
    var frame = slot.querySelector('iframe[data-view="' + view + '"]');
    if (frame) return frame;

    frame = document.createElement('iframe');
    frame.setAttribute('data-view', view);
    if (view === 'sim') {
      frame.src = MC + '---run?id=' + share;
      frame.title = name + ' 시뮬레이터';
    } else {
      frame.src = MC + '---codeembed#pub:' + share;
      frame.title = name + ' 블록 코드';
    }
    frame.setAttribute('allowfullscreen', 'true');
    frame.setAttribute('sandbox',
      'allow-scripts allow-same-origin allow-popups allow-forms');
    slot.appendChild(frame);
    return frame;
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null;
    if (!t) return;

    var tab = t.closest('[data-mc-view]');
    if (tab) {
      var wrap = tab.closest('.mc');
      var view = tab.getAttribute('data-mc-view');
      var tabs = wrap.querySelectorAll('[data-mc-view]');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('is-on', tabs[i] === tab);
        tabs[i].setAttribute('aria-selected', tabs[i] === tab ? 'true' : 'false');
      }
      var frames = wrap.querySelectorAll('.mc-frame iframe');
      for (var j = 0; j < frames.length; j++) frames[j].hidden = true;
      mcFrame(wrap, view).hidden = false;
      return;
    }

    var tall = t.closest('[data-mc-tall]');
    if (tall) {
      var box = tall.closest('.mc');
      var on = box.classList.toggle('mc--tall');
      tall.textContent = on ? '작게 보기' : '크게 보기';
      if (on && box.scrollIntoView) box.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  });

  /* 페이지가 열리면 블록 코드 iframe 을 만든다(HTML 에는 iframe 을 두지 않는다). */
  document.addEventListener('DOMContentLoaded', function () {
    var wraps = document.querySelectorAll('.mc[data-share]');
    for (var i = 0; i < wraps.length; i++) mcFrame(wraps[i], 'blocks');
  });

})();
