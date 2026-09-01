/* micro:bit 수업 자료 — 라이트박스 + MakeCode 지연 로딩
   외부 라이브러리 없이 바닐라 JS만 사용한다. */
(function () {
  'use strict';

  /* ==========================================================
     1) 이미지 라이트박스
     블록 코드 글씨가 작아 확대 없이는 읽기 어렵다.
     클릭 -> 어두운 배경 위에 원본 크기로 표시.
     다시 클릭하거나 ESC 로 닫는다. 원본이 화면보다 크면 스크롤된다.
     ========================================================== */
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

  /* ==========================================================
     2) MakeCode 연동
     "여기서 바로 해보기" 는 클릭한 순간에만 <iframe> 을 만든다.
     6개 페이지의 임베드를 미리 불러오면 무겁기 때문이다.
     ========================================================== */

  /* 아직 공유 링크/hex 파일이 준비되지 않은 버튼에 안내를 띄운다. */
  function notice(wrap, text) {
    var msg = wrap.querySelector('.makecode-msg');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'makecode-msg';
      wrap.appendChild(msg);
    }
    msg.textContent = text;
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-mc]') : null;
    if (!el) return;

    var wrap = el.closest('.makecode');
    var kind = el.getAttribute('data-mc');
    var share = (el.getAttribute('data-share') || '').trim();
    var hex = (el.getAttribute('data-hex') || '').trim();

    if (kind === 'open') {
      e.preventDefault();
      if (!share) {
        notice(wrap, 'MakeCode 공유 링크가 아직 등록되지 않았습니다. 선생님께 물어보세요.');
        return;
      }
      window.open('https://makecode.microbit.org/' + share, '_blank', 'noopener');
      return;
    }

    if (kind === 'hex') {
      e.preventDefault();
      if (!hex) {
        notice(wrap, 'hex 파일이 아직 올라오지 않았습니다. 선생님께 물어보세요.');
        return;
      }
      window.location.href = hex;
      return;
    }

    if (kind === 'embed') {
      e.preventDefault();
      if (!share) {
        notice(wrap, 'MakeCode 공유 링크가 아직 등록되지 않아 바로 해보기를 열 수 없습니다.');
        return;
      }
      var slot = wrap.parentNode.querySelector('.makecode-embed');
      if (!slot || slot.getAttribute('data-loaded') === 'yes') return;

      var frame = document.createElement('iframe');
      frame.src = 'https://makecode.microbit.org/---codeembed#pub:' + share;
      frame.title = 'MakeCode 편집기';
      frame.setAttribute('allowfullscreen', 'true');
      frame.setAttribute('sandbox',
        'allow-popups allow-forms allow-scripts allow-same-origin');
      slot.appendChild(frame);
      slot.setAttribute('data-loaded', 'yes');
      el.textContent = '아래에서 편집할 수 있어요';
      el.disabled = true;
    }
  });
})();
