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
    /* 처음에는 트리가 통째로 보이게 맞춘다. 잘려 있으면 고장난 것으로 읽힌다. */
    function fitAll() {
      var art = stage.firstElementChild || stage;
      var w = art.getAttribute && +art.getAttribute('width');
      var h = art.getAttribute && +art.getAttribute('height');
      var r = box.getBoundingClientRect();
      if (!w || !h || !r.width) return;
      fit = Math.min(1, Math.min((r.width - 16) / w, (r.height - 16) / h));
      z = fit;
      x = Math.max(0, (r.width - w * z) / 2);
      y = Math.max(0, (r.height - h * z) / 2);
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

  /* ── 5. 남의 서버는 눌렀을 때만 부른다 ──────────────────────
     게임엔에 올라간 MAGNET FRIENDS 원본이라 대역폭이 그쪽 것이다. */
  function embeds() {
    [].slice.call(document.querySelectorAll('[data-embed]')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var host = btn.closest('[data-embed-host]');
        if (!host) return;
        var f = document.createElement('iframe');
        f.className = 'embed';
        f.src = btn.dataset.embed;
        f.title = btn.dataset.embedTitle || '게임';
        f.allow = 'autoplay; fullscreen';
        f.setAttribute('loading', 'lazy');
        host.innerHTML = '';
        host.appendChild(f);
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
