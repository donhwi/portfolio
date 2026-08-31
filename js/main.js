/* 이돈휘 포트폴리오 — 시안에는 없던 동작만 여기서 붙인다.
   외부 라이브러리 없음. 재생성 대상이 아니라 손으로 관리하는 파일이다. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. 영상: 화면에 들어올 때 불러오고, 나가면 멈춘다 ──────────
     한 페이지에 자동 재생 영상이 여섯이다. 전부 동시에 돌리면
     노트북 팬이 돈다. 보이는 것만 돌린다. */
  function videos() {
    var vs = [].slice.call(document.querySelectorAll('video[data-src]'));
    if (!vs.length) return;
    // 한 파일로 묶는 판(Artifact)에서는 mp4 가 data: 로 들어온다.
    // 같은 영상을 두 자리에서 쓰므로 경로를 열쇠로 한 번만 담는다.
    function src(v) {
      return (window.__M && window.__M[v.dataset.src]) || v.dataset.src;
    }
    // 「움직임 줄이기」를 켠 사람에게 배경 영상 아홉 개가 저절로 돌면 안 된다.
    // 포스터를 그대로 두고, 보고 싶으면 직접 틀 수 있게 조작 막대를 단다.
    if (reduce) {
      vs.forEach(function (v) {
        v.controls = true;
        v.preload = 'none';
        v.addEventListener('click', function () { if (!v.src) v.src = src(v); }, { once: true });
      });
      return;
    }
    if (!('IntersectionObserver' in window)) {
      vs.forEach(function (v) { v.src = src(v); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.src) v.src = src(v);
          var p = v.play();
          if (p && p.catch) p.catch(function () { /* 자동재생 거부는 포스터로 버틴다 */ });
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px' });
    vs.forEach(function (v) { io.observe(v); });
  }

  /* ── 2. 좌측 인덱스: 지금 읽고 있는 구간 ────────────────────── */
  function spy() {
    var links = [].slice.call(document.querySelectorAll('aside[data-side-index] a[href^="#"]'));
    if (!links.length) return;
    var map = links.map(function (a) {
      return { a: a, el: document.getElementById(a.getAttribute('href').slice(1)) };
    }).filter(function (m) { return m.el; });
    var cur = null;
    function mark() {
      var line = window.scrollY + window.innerHeight * 0.32, best = map[0];
      for (var i = 0; i < map.length; i++) {
        if (map[i].el.offsetTop <= line) best = map[i];
      }
      if (best === cur) return;
      if (cur) cur.a.removeAttribute('aria-current');
      best.a.setAttribute('aria-current', 'true');
      cur = best;
    }
    var tick = false;
    addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { tick = false; mark(); });
    }, { passive: true });
    addEventListener('resize', mark);
    mark();
  }

  /* ── 3. BT 뷰어: 휠로 확대, 끌어서 이동 ─────────────────────── */
  function btViewer() {
    var box = document.getElementById('bt-viewer');
    if (!box) return;
    var stage = box.firstElementChild;
    if (!stage) return;
    var z = 1, x = 0, y = 0, MIN = 0.25, MAX = 4, fit = 1;

    function apply() {
      stage.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) scale(' + z + ')';
    }
    /* 처음 화면은 **폭에 맞춘다.**
       트리가 세로로 길어(1082x2926) 통째로 맞추면 배율이 0.2가 되고 글자가 3px 이 된다 —
       읽을 수 없는 벽이 된다. 폭을 채우고 위에서 시작하면 첫 줄부터 읽힌다.
       나머지는 끌어서 내려가는 쪽이 맞다. */
    function fitAll() {
      var art = stage.firstElementChild || stage;
      var w = art.getAttribute && +art.getAttribute('width');
      var h = art.getAttribute && +art.getAttribute('height');
      var r = box.getBoundingClientRect();
      if (!w || !h || !r.width) return;
      fit = Math.min(1, (r.width - 16) / w);
      /* 좁은 화면에서는 **폭에 맞추는 것 자체가** 그 벽이다.
         375px 에서 칸이 331px 이라 fit 이 0.286 이 되고, 원본 14~15px 글자가 4px 이 됐다
         (2026-08-31 실측). 읽히는 하한을 두고 나머지는 끌어서 보게 한다. */
      z = Math.max(fit, 0.7);
      x = Math.max(0, (r.width - w * z) / 2);
      // 위쪽 46px 은 「끌어서 옮기고…」 안내 칩이 덮는 자리다. 첫 줄이 그 밑에 깔리면 안 된다
      y = h * z <= r.height ? Math.max(0, (r.height - h * z) / 2) : 46;
      apply();
    }
    function zoomAt(f, cx, cy) {
      var nz = Math.min(MAX, Math.max(MIN, z * f));
      if (nz === z) return;
      var r = nz / z;
      x = cx - (cx - x) * r;
      y = cy - (cy - y) * r;
      z = nz;
      apply();
    }
    /* 휠은 Ctrl 을 눌렀을 때만 확대한다. 그냥 굴리면 페이지가 내려가야 한다 —
       본문 한가운데의 520px 짜리 칸이 스크롤을 삼키면 읽는 사람이 갇힌다. */
    box.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var r = box.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    var drag = null;
    box.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      drag = { px: e.clientX, py: e.clientY };
      box.classList.add('is-drag');
      box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', function (e) {
      if (!drag) return;
      x += e.clientX - drag.px;
      y += e.clientY - drag.py;
      drag.px = e.clientX; drag.py = e.clientY;
      apply();
    });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      box.addEventListener(t, function () { drag = null; box.classList.remove('is-drag'); });
    });

    // 확대 · 축소 · 처음 크기로
    var btns = box.parentElement.querySelectorAll('[data-btbtn]');
    function mid() { var r = box.getBoundingClientRect(); return [r.width / 2, r.height / 2]; }
    if (btns[0]) btns[0].onclick = function () { var m = mid(); zoomAt(1.25, m[0], m[1]); };
    if (btns[1]) btns[1].onclick = function () { var m = mid(); zoomAt(1 / 1.25, m[0], m[1]); };
    if (btns[2]) btns[2].onclick = fitAll;
    fitAll();
    addEventListener('resize', fitAll);
  }

  /* ── 4. 기믹 카드: 노드에 올리면 그 줄만 밝아진다 ────────────
     어느 노드가 어느 줄인지는 코드를 읽어야 아는 것이라 표로 박아 둔다.
     (시안의 「노드에 올리면 코드가 밝아집니다」가 이 동작이다) */
  var LINES = [
    [[], [3, 4], [6, 7], [9, 10], [12, 13, 14, 15]],          // ChasePressure.cs
    [[], [3, 4], [6, 7, 8], [10, 11, 12], [14, 15]],          // SacredTreeWipe.cs
    [[], [3, 4], [6, 7, 8], [10, 11, 12], [14, 15, 16]]       // IceMissileAction.cs
  ];
  function peek() {
    [].slice.call(document.querySelectorAll('[data-gimcard]')).forEach(function (card, ci) {
      var nodes = [].slice.call(card.querySelectorAll('[data-btnode]'));
      var lines = [].slice.call(card.querySelectorAll('[data-line]'));
      if (!nodes.length || !lines.length || !LINES[ci]) return;
      function on(i) {
        var want = LINES[ci][i] || [];
        if (!want.length) { off(); return; }
        card.classList.add('is-peek');
        lines.forEach(function (l) {
          l.classList.toggle('is-lit', want.indexOf(+l.dataset.line) >= 0);
        });
      }
      function off() {
        card.classList.remove('is-peek');
        lines.forEach(function (l) { l.classList.remove('is-lit'); });
      }
      nodes.forEach(function (n, i) {
        n.tabIndex = 0;
        n.addEventListener('mouseenter', function () { on(i); });
        n.addEventListener('focus', function () { on(i); });
        n.addEventListener('mouseleave', off);
        n.addEventListener('blur', off);
      });
    });
  }

  /* ── 5. 남의 게임은 눌렀을 때만, 그리고 크게 띄운다 ──────────────
     ① 대역폭이 그쪽 것이라 누르기 전에는 안 부른다.
     ② 세로 9:16 게임을 본문의 16:9 칸에 넣으면 손톱만 해진다. 그래서 덮개로 띄운다.
     ③ **소리를 우리가 끌 수는 없다.** 다른 출처의 iframe 안은 손이 닿지 않는다.
        대신 닫으면 iframe 이 통째로 사라져 소리가 즉시 멎는다 — 끄기 대신 멈추기다. */
  function embeds() {
    var open = null;

    function close() {
      if (!open) return;
      var back = open.back;
      document.removeEventListener('keydown', onKey);
      removeEventListener('resize', fit);
      open.overlay.remove();          // iframe 이 사라지면서 소리도 멎는다
      document.body.style.overflow = '';
      open = null;
      if (back && back.focus) back.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function fit() {
      if (!open) return;
      var ar = open.ar;
      var h = Math.min(innerHeight * 0.86, 1000);
      var w = h * ar;
      if (w > innerWidth * 0.94) { w = innerWidth * 0.94; h = w / ar; }
      open.frame.style.width = Math.round(w) + 'px';
      open.frame.style.height = Math.round(h) + 'px';
    }

    [].slice.call(document.querySelectorAll('[data-embed]')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (open) return;
        var r = (btn.dataset.embedRatio || '16/9').split('/');
        var overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', btn.dataset.embedTitle || '게임');
        overlay.innerHTML =
          '<div class="modal-box">' +
            '<div class="modal-bar">' +
              '<span class="modal-title"></span>' +
              '<span class="modal-note">소리가 납니다 · 닫으면 멈춥니다</span>' +
              // 광고 차단기가 게임 포털을 막으면 덮개가 빈 채로 남는다. 그때 나갈 길을 같이 둔다
              '<a class="modal-x" target="_blank" rel="noopener">↗ 새 창</a>' +
              '<button class="modal-x" type="button">✕ 닫기</button>' +
            '</div>' +
            '<div class="modal-frame"></div>' +
          '</div>';
        overlay.querySelector('.modal-title').textContent = btn.dataset.embedTitle || '게임';
        overlay.querySelector('a.modal-x').href = new URL(btn.dataset.embed, location.href).href;

        var frame = overlay.querySelector('.modal-frame');
        var f = document.createElement('iframe');
        f.className = 'embed';
        f.src = btn.dataset.embed;
        f.title = btn.dataset.embedTitle || '게임';
        f.allow = 'fullscreen';
        frame.appendChild(f);

        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        overlay.querySelector('button.modal-x').addEventListener('click', close);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        open = { overlay: overlay, frame: frame, back: btn, ar: (+r[0] / +r[1]) || 16 / 9 };
        fit();
        addEventListener('resize', fit);
        document.addEventListener('keydown', onKey);
        overlay.querySelector('button.modal-x').focus();
      });
    });
  }

  /* ── 6. 앵커 이동: 인덱스를 눌렀을 때 ──────────────────────── */
  function anchors() {
    if (!reduce) return;             // 부드러운 이동은 CSS 가 한다
    document.documentElement.style.scrollBehavior = 'auto';
  }

  function boot() { videos(); spy(); btViewer(); peek(); embeds(); anchors(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
