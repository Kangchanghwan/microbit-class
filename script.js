/* micro:bit 수업 자료 — 이미지 라이트박스
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
    if (!fig) return;
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
    var shots = document.querySelectorAll('.shot');
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

})();
