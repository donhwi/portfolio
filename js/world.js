/* 세계관 페이지 동작 — 손으로 관리하는 파일이다. 외부 라이브러리 없음.
   자료는 world-data.js 의 window.WORLD 에서 온다 (시안에서 그대로 옮긴 것).

   시안에서는 캔버스 런타임이 상태를 들고 다시 그렸다. 여기서는 DOM 을 직접 만진다. */
(function () {
  'use strict';

  /* ── 1. 용어 툴팁 ─────────────────────────────────────────────
     본문 낱말(a.t[data-term])에 마우스를 올리거나 초점을 주면 뜻을 띄운다.
     상자는 하나만 만들어 놓고 자리와 글만 갈아 끼운다 */
  var tip = null;

  function tipEl() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tip';
      tip.setAttribute('role', 'tooltip');
      tip.style.display = 'none';
      document.body.appendChild(tip);
    }
    return tip;
  }

  function showTip(a) {
    var d = window.WORLD.TERMS[a.getAttribute('data-term')];
    if (!d) return;                       // d = [한자, 갈래, 앵커, 뜻, 출처]
    var el = tipEl();
    el.innerHTML = '';
    var b = document.createElement('b');
    b.textContent = a.getAttribute('data-term') + (d[0] ? ' ' + d[0] : '');
    var p = document.createElement('span');
    p.textContent = d[3];
    var src = document.createElement('i');
    src.style.cssText = 'display:block;margin-top:6px;font-family:Galmuri11,monospace;' +
                        'font-size:10px;font-style:normal;color:#8b8375';
    src.textContent = d[4];
    el.appendChild(b);
    el.appendChild(p);
    el.appendChild(src);

    var r = a.getBoundingClientRect();
    el.style.display = 'block';
    var top = r.top + window.scrollY - el.offsetHeight - 8;
    if (top < window.scrollY + 4) top = r.bottom + window.scrollY + 8;   // 위가 좁으면 아래로
    el.style.top = top + 'px';
    el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 8)) + 'px';
  }

  function hideTip() { if (tip) tip.style.display = 'none'; }

  /* ── 2. 용어 검색 ─────────────────────────────────────────────
     이름·한자·뜻을 다 훑는다. 엔터는 첫 결과로 간다.

     검색칸은 화면 폭에 따라 둘 중 하나만 보인다 — 넓으면 목차 aside 안의 것,
     좁으면 .toc-drop 안의 것 (결함 I-2). 어느 쪽이 보이든 같은 동작이어야 하니
     함수에 이름을 받아 두 벌 다 배선한다. 숨어 있는 쪽은 손잡이가 달려 있어도
     화면에 없어 아무 일도 안 한다 */
  var FIND = [
    ['world-search', 'world-suggest'],
    ['world-search-drop', 'world-suggest-drop']
  ];

  function search(boxId, listId) {
    var box = document.getElementById(boxId);
    var list = document.getElementById(listId);
    if (!box || !list) return;

    function hits(q) {
      q = q.trim().toLowerCase();
      if (!q) return [];
      var T = window.WORLD.TERMS;
      return Object.keys(T).filter(function (k) {
        var d = T[k];
        return k.toLowerCase().indexOf(q) >= 0 ||
               d[0].toLowerCase().indexOf(q) >= 0 ||
               d[3].toLowerCase().indexOf(q) >= 0;
      }).slice(0, 12);
    }

    function draw(names) {
      list.innerHTML = '';
      if (!names.length) { list.style.display = 'none'; return; }
      names.forEach(function (name) {
        var d = window.WORLD.TERMS[name];
        var a = document.createElement('a');
        a.href = d[2];
        a.style.cssText = 'display:block;padding:7px 9px;border-bottom:2px solid #221e17;' +
                          "font-family:'Noto Sans KR',sans-serif;font-size:12px;" +
                          'color:#b0a695;text-decoration:none;transition:90ms steps(3)';
        a.innerHTML = '<span style="color:#f4eee1">' + name + '</span>' +
                      '<span style="font-family:Galmuri11,monospace;font-size:10px;' +
                      'color:#8b8375;margin-left:6px">' + d[0] + '</span>';
        a.addEventListener('click', function () {
          box.value = '';
          list.style.display = 'none';
        });
        list.appendChild(a);
      });
      list.style.display = 'block';
    }

    box.addEventListener('input', function () { draw(hits(box.value)); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { box.value = ''; list.style.display = 'none'; }
      if (e.key === 'Enter') {
        var first = list.querySelector('a');
        if (first) { e.preventDefault(); first.click(); location.hash = first.getAttribute('href'); }
      }
    });
  }

  /* ── 2-2. 좁은 화면의 장 고르개 ───────────────────────────────
     design.css 가 1399px 아래에서 목차 aside 를 통째로 지운다. 걷어낸 상단바를
     되살리는 대신 .toc-drop 의 <select> 한 칸이 그 몫을 맡는다 (결함 I-2).
     주소를 직접 바꿔 브라우저의 앵커 이동에 맡긴다 — 기록 칸도 그래야 쌓여서
     뒤로가기가 온 자리로 되돌아간다 (toggle.js 의 ★ 참고) */
  function jump() {
    var sel = document.getElementById('world-jump');
    if (!sel) return;
    sel.addEventListener('change', function () {
      var to = sel.value;
      sel.selectedIndex = 0;      // 같은 장을 다시 골라도 또 뛰게 되돌려 놓는다
      if (to) location.hash = to;
    });
  }

  /* ── 3. 목차 하이라이트 ───────────────────────────────────────
     지금 보고 있는 장의 막대를 강조색으로 켠다. 포폴 main.js 의 spy() 와 같은 방식 */
  function spy() {
    var links = [].slice.call(document.querySelectorAll('aside[data-side-index] a[href^="#"]'));
    if (!links.length) return;
    var targets = [];
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) targets.push({ a: a, el: el });
    });
    if (!targets.length) return;

    function paint() {
      var y = window.scrollY + window.innerHeight * 0.3;
      var cur = targets[0];
      targets.forEach(function (t) {
        if (t.el.getBoundingClientRect().top + window.scrollY <= y) cur = t;
      });
      targets.forEach(function (t) {
        var on = t === cur;
        t.a.style.color = on ? '#f4eee1' : '#8b8375';
        var bar = t.a.querySelector('[data-navbar]');
        if (bar) {
          bar.style.background = on ? '#c8452a' : '#2a251c';
          bar.style.width = on ? '26px' : '14px';
        }
      });
    }

    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ── 시동 ───────────────────────────────────────────────────── */
  function boot() {
    if (!window.WORLD) return;          // 자료가 아직 안 왔다
    FIND.forEach(function (pair) { search(pair[0], pair[1]); });
    jump();
    spy();
    document.addEventListener('mouseover', function (e) {
      var a = e.target.closest && e.target.closest('a.t[data-term]');
      if (a) showTip(a);
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest('a.t[data-term]')) hideTip();
    });
    document.addEventListener('focusin', function (e) {
      var a = e.target.closest && e.target.closest('a.t[data-term]');
      if (a) showTip(a);
    });
    document.addEventListener('focusout', hideTip);
    document.addEventListener('click', function (e) {
      FIND.forEach(function (pair) {
        var sel = '#' + pair[0] + ', #' + pair[1];
        if (e.target.closest && e.target.closest(sel)) return;
        var list = document.getElementById(pair[1]);
        if (list) list.style.display = 'none';
      });
    });
    window.addEventListener('scroll', hideTip, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
