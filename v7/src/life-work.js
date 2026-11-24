/* 출근길, 지점 조회, 고객 상담, 실적 스티커, 퇴근길 거리와 가게. */
var Work = (function () {
  'use strict';
  var Wk = { lead: { x: 300, dir: 1 }, peer: { x: 150, dir: 1 }, glow: 0, consult: null, chart: null, shop: null, street: null, dark: false, look: {} };
  function S() { return G.s; }
  function me(text) { return { who: 'me', text: text }; }
  function lead(text) { return { who: 'lead', text: text }; }
  function peer(text) { return { who: 'peer', text: text }; }
  function client(id, text) { return { who: 'client', id: id, text: text }; }
  function inside(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  var say = function (l) { return UI.say(l); };

  // 정장에 붙은 털과 옷에 밴 냄새는 집 밖에서도 그대로 보인다
  function heroMarks(c, x, footY) {
    var s = S(); if (!s || (G.pro && G.pro.active)) return;
    if (s.wearing === 'suit' && s.fur > 0) Home.furOn(c, x, footY - 96, s.fur, 1);
    if (s.smell) Home.stinkLines(c, x + 2, footY - 98, s.smell + 1, G.t);
  }
  // ---------- 지하철 ----------
  function drawTrain(c) {
    View.bg(c, G, 'train');
    var t = G.t;
    // 창밖으로 지나가는 불빛
    [26, 160, 294, 428].forEach(function (wx) {
      c.save(); c.beginPath(); c.rect(wx + 4, 128, 122, 82); c.clip();
      for (var i = 0; i < 3; i++) { var lx = wx + 130 - ((t * 260 + i * 70 + wx) % 190); View.r(c, lx, 150 + i * 14, 26, 3, 'rgba(255,230,160,.6)'); }
      c.restore();
    });
    // 의자에 앉은 승객 넷 (codex-v5 R6 그림). 주인공은 가운데 손잡이 아래에 선다.
    SEATS.forEach(function (st) { View.commuter(c, G, st[0], 306, st[1], st[2]); });
    View.person(c, G, G.hero.x, 344, G.s && G.s.wearing === 'suit' ? 'suit' : 'hoodie', 1, t, 'stand', 2.35);
    heroMarks(c, G.hero.x, 344);
    if (Wk.dark) View.nightTint(c, .35);
  }
  var SEATS = [[96, 0, false], [203, 1, false], [426, 2, true], [540, 3, true]];
  function commute(evening) {
    G.hero.x = 300; G.hero.tx = null; Wk.dark = !!evening;
    Engine.setScene({ draw: drawTrain, place: 'train' });
    return Engine.fade(0, .35).then(function () { return Engine.sleep(1.4); }).then(function () { return Engine.fade(1, .35); });
  }

  // ---------- 지점 ----------
  // 사무실 벽시계: 그림 속 바늘을 지우고 지금 시각으로 다시 그린다 (위쪽 시계와 같은 시각)
  function officeClock(c, minute) {
    var cx = 463.2, cy = 63.9, h = (minute / 60) % 12, m = minute % 60;
    c.save();
    c.fillStyle = '#fdefda'; c.beginPath(); c.arc(cx, cy, 10.6, 0, Math.PI * 2); c.fill();
    c.lineCap = 'round';
    function hand(a, len, w, col) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len); c.stroke(); }
    hand(h / 12 * Math.PI * 2, 7, 2, '#394258');
    hand(m / 60 * Math.PI * 2, 10, 1.2, '#e8604a');
    c.fillStyle = '#394258'; c.beginPath(); c.arc(cx, cy, 1.4, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function drawOffice(c) {
    var s = S(), t = G.t;
    View.bg(c, G, 'office');
    officeClock(c, s.minute);
    View.chart(c, 384, 78, 60, 60, s, false, Wk.glow > G.t ? G.t : 0);
    var night = Wk.dark;
    var people = [
      { x: Wk.peer.x, v: 'peer', d: Wk.peer.dir, show: !night || Wk.peerNight },
      { x: Wk.lead.x, v: 'lead', d: Wk.lead.dir, show: !night },
      { x: G.hero.x, v: 'suit', d: G.hero.walking ? G.hero.dir : G.hero.dir, hero: true, show: G.hero.visible }
    ];
    people.forEach(function (p) {
      if (!p.show) return;
      View.shadow(c, p.x, 337, 20);
      View.person(c, G, p.x, 336, p.v, p.d, t, p.hero && G.hero.walking ? 'walk' : 'stand', 2.35);
      if (p.hero) heroMarks(c, p.x, 336);
      // 퇴근 전: 아직 이야기 안 한 사람 머리 위에 말풍선
      if (!p.hero && Wk.talkable && !Wk.talked[p.v === 'lead' ? 'lead' : 'peer']) View.icon(c, 'talk', p.x + 10, 200 + Math.round(Math.sin(t * 4 + p.x) * 3), 2);
    });
    (Wk.look.marks || []).forEach(function (m) { View.icon(c, 'bang', m, 228 + Math.sin(t * 8) * 2, 1); });
    if (Wk.board) drawBoard(c);
    if (Wk.chartHint && !Wk.chart) View.outline(c, { x: 384, y: 78, w: 60, h: 60 }, t);
    if (night) { View.nightTint(c, .45); View.lampGlow(c, 470, 150, 160, .25); }
    if (Wk.chart) drawChartBig(c);
  }
  // 첫 조회: 지점장님이 상품 안내서를 칠판에 붙여 가며 이 일이 무엇인지 설명한다
  function drawBoard(c) {
    var q = Math.min(1, (G.t - Wk.board) / .35), x = 150, y = 34, w = 300, h = 128;
    c.save(); c.globalAlpha = q;
    View.box(c, x, y, w, h, '#fbfbf6', '#5b4636', 3);
    View.r(c, x + 6, y + h - 6, w - 12, 3, '#c8c2b4');
    ['dental', 'car', 'travel', 'home'].forEach(function (k, i) {
      var bx = x + 44 + i * 70;
      View.brochure(c, k, bx, y + 74 + (1 - q) * 10, .9, {});
      View.text(c, Story.PRODUCT[k], bx, y + 112, 11, '#2f2a33');
    });
    View.text(c, '고객님 걱정  →  맞는 보험', x + w / 2, y + 18, 13, '#c0392b');
    c.restore();
  }
  function office(opts) {
    opts = opts || {};
    Wk.dark = !!opts.night; Wk.look = {}; Wk.talkable = false; Wk.board = 0; Wk.chartHint = false;
    Engine.setScene({ draw: drawOffice, place: 'office' });
  }
  function assembly() {
    var s = S(), late = s.late > 0;
    office();
    Wk.lead = { x: 300, dir: 1 }; Wk.peer = { x: 150, dir: 1 };
    G.hero.x = 600; G.hero.dir = -1; G.hero.visible = true;
    return Engine.fade(0, .35).then(function () { return Engine.walkTo(470); }).then(function () {
      workClock(Life.T.assembly);
      if (late) { Wk.look.marks = [Wk.lead.x, Wk.peer.x]; UI.sfx('bad'); }
      return say(Story.assembly(s, late).map(function (l) {
        return { who: l.who, text: l.text, on: function () {
          if (l.board && !Wk.board) { Wk.board = G.t; UI.sfx('page'); }
          if (!l.board) Wk.board = 0;
          if (l.chart) Wk.glow = G.t + 4;
          if (l.sniff) { // 지점장님과 선배가 코를 킁킁, 냄새 나는 쪽(나)을 돌아본다
            Wk.lead.dir = 1; Wk.peer.dir = 1; Wk.look.marks = [Wk.lead.x, Wk.peer.x];
            Engine.puff({ x: G.hero.x, y: 210, icon: 'stink', px: 2, life: 1.8, rise: 26 });
          }
        } };
      }));
    }).then(function () { Wk.look = {}; Wk.board = 0; });
  }
  // 털 때문에 첫 계약을 놓친 날: 상담이 끝난 뒤에야 선배가 이유를 알려 준다.
  // 오후 상담이 남았으면 선배가 자기 돌돌이로 털을 떼 준다.
  function seniorLesson(sneezed, lend) {
    var s = S();
    office(); Wk.lead = { x: 300, dir: 1 }; Wk.peer = { x: 150, dir: 1 };
    G.hero.x = 470; G.hero.dir = -1;
    return Engine.fade(0, .3).then(function () {
      return new Promise(function (resolve) {
        var from = Wk.peer.x, to = 410, t0 = G.t;
        (function step() { var q = Math.min(1, (G.t - t0) / .9); Wk.peer.x = from + (to - from) * q; if (q < 1) setTimeout(step, 30); else resolve(); }());
      });
    }).then(function () {
      Wk.look.marks = [Wk.peer.x];
      for (var i = 0; i < 4; i++) Engine.puff({ x: G.hero.x - 14 + i * 8, y: 250 + i * 6, icon: 'fur', px: 1, life: 1.2, rise: 6 });
      return say(Story.senior(s, sneezed, lend).map(function (l) {
        return { who: l.who, text: l.text, on: l.lend ? function () {
          Wk.look = {};
          UI.sfx('scoop');
          for (var k = 0; k < 6; k++) Engine.puff({ x: G.hero.x - 16 + k * 6, y: 236 + k * 7, icon: 'fur', px: 1, life: .9, rise: -14 });
          s.fur = 0;
        } : null };
      }));
    }).then(function () { Wk.look = {}; s.seen.rollerTip = true; });
  }
  // 냄새 때문에 처음 놓친 날: 선배가 다가와 이유를 알려 주고, 오후 상담이 남았으면 섬유 탈취제를 뿌려 준다
  function smellLesson(lend) {
    var s = S();
    office(); Wk.lead = { x: 300, dir: 1 }; Wk.peer = { x: 150, dir: 1 };
    G.hero.x = 470; G.hero.dir = -1;
    return Engine.fade(0, .3).then(function () {
      return new Promise(function (resolve) {
        var from = Wk.peer.x, to = 410, t0 = G.t;
        (function step() { var q = Math.min(1, (G.t - t0) / .9); Wk.peer.x = from + (to - from) * q; if (q < 1) setTimeout(step, 30); else resolve(); }());
      });
    }).then(function () {
      Engine.puff({ x: G.hero.x, y: 200, icon: 'stink', px: 2, life: 1.6, rise: 24 });
      return say(Story.seniorSmell(s, lend).map(function (l) {
        return { who: l.who, text: l.text, on: l.spray ? function () {
          UI.sfx('water');
          for (var k = 0; k < 6; k++) Engine.puff({ x: G.hero.x - 18 + k * 7, y: 230 + (k % 3) * 14, icon: 'drop', px: 1, life: .9, rise: 10 });
          s.smell = Math.max(0, (s.smell || 0) - 1);
        } : null };
      }));
    });
  }
  // 목표를 채운 순간
  function goalParty() {
    var s = S();
    UI.sfx('sticker');
    for (var i = 0; i < 14; i++) Engine.puff({ x: 120 + i * 30, y: 120 + (i % 3) * 30, icon: i % 2 ? 'sticker' : 'heart', px: 2, life: 2.2, rise: 40 });
    Wk.glow = G.t + 4;
    return say(Story.goalReached(s));
  }
  // 실적 그래프 크게 보기 (스티커가 붙는 순간)
  function drawChartBig(c) {
    var ch = Wk.chart, s = S();
    c.fillStyle = 'rgba(20,18,26,.65)'; c.fillRect(0, 0, 640, 360);
    View.chart(c, 160, 26, 320, 300, s, true, 0);
    if (ch.fly) {
      var q = Math.min(1, (G.t - ch.t0) / .6), bw = (320 - 60) / 4, bx = 160 + 40 + bw * .31, top = 26 + 34, bottom = 26 + 300 - 26;
      var ty = bottom - (s.contracts - .5) * (bottom - top) / 14;
      View.icon(c, 'sticker', 560 + (bx - 560) * q, 300 + (ty - 300) * q - Math.sin(q * Math.PI) * 60, 2.4 - q * 1.2);
    }
  }
  function sticker(n) {
    var s = S();
    Wk.chart = { fly: true, t0: G.t };
    s.contracts -= n; // 날아가는 동안에는 아직 안 붙은 것처럼
    return Engine.sleep(.6).then(function () { s.contracts += n; UI.sfx('sticker'); Wk.chart.fly = false; return Engine.sleep(.9); }).then(function () { Wk.chart = null; Wk.glow = G.t + 2; });
  }

  // ---------- 상담 ----------
  // 듣기는 옆에서 본 상담 자리, 설계부터 서명까지는 위에서 내려다본 책상 한 화면이다.
  // 상담 노트, 태블릿, 설명서, 증권 같은 그림은 아직 없어서 회색 상자에 이름만 적어 둔다.
  var NOTE_BOX = { x: 14, y: 64, w: 156, h: 214 };
  var TAB = { x: 184, y: 26, w: 286, h: 238 };
  var FACE = { x: 486, y: 12, w: 140, h: 104 };
  var COPIES = { x: 498, y: 236, w: 116, h: 56 };
  var POLICY = { x: 24, y: 290, w: 140, h: 56 };
  function ph(c, x, y, w, h, label, fill) {
    View.box(c, x, y, w, h, fill || '#c9c6c0', '#55505a', 2);
    if (label) View.text(c, label, x + 8, y + 12, 10, '#55505a', 'left');
  }
  function wrapLines(c, text, maxW, size) {
    c.font = size + "px 'NeoDunggeunmo', monospace";
    var out = [], cur = '';
    String(text).split(' ').forEach(function (word) {
      var t = cur ? cur + ' ' + word : word;
      if (c.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = word; }
    });
    if (cur) out.push(cur);
    return out;
  }
  function wrap(c, text, x, y, maxW, size, col, lh, align) {
    var ls = wrapLines(c, text, maxW, size);
    ls.forEach(function (l, i) { View.text(c, l, x, y + i * (lh || size + 5), size, col, align || 'left'); });
    return ls.length * (lh || size + 5);
  }
  function talkOf(id) { return Story.TALK[id] || {}; }
  function factText(id, f) { return talkOf(id)[f] || ''; }
  // 고객님이 지금 하는 말 (말풍선)
  function setBubble(k, text) { k.bubble = text; k.bubbleAt = G.t; }
  function clientSays(k, text) { setBubble(k, text); return say([client(k.id, text)]); }

  // 듣기 화면의 말 줄 (위치는 그릴 때마다 다시 잰다)
  function listenRows(c, k) {
    var y = 18, rows = [];
    k.p.facts.forEach(function (f, i) {
      if (i >= k.shown) return;
      var ls = wrapLines(c, factText(k.id, f), 270, 11), h = 12 + ls.length * 15;
      rows.push({ f: f, x: 340, y: y, w: 290, h: h, lines: ls });
      y += h + 6;
    });
    return rows;
  }
  function drawListen(c, k, t) {
    var s = S();
    View.seated(c, G, 196, 262, 'suit', k.heroFrame || 0, 2.5, null, false);
    if (s.fur > 0 && k.p.fur) Home.furOn(c, 198, 262 - 84, s.fur, 1);
    if (k.p.smell) Home.stinkLines(c, 204, 150, k.p.smell + 1, t);
    if (k.peer) View.person(c, G, 110, 268, 'peer', 1, t, 'stand', 2.2);
    var cl = Story.CLIENT[k.id];
    if (!k.gone) View.seated(c, G, 446 + (k.shake ? Math.sin(t * 40) * 3 : 0), 262, cl.look, 0, 2.5, cl.tint, false);
    View.box(c, 250, 206, 140, 10, '#b98a5f', '#5b4636', 2);
    View.box(c, 40, 270, 560, 96, '#c99b6c', '#5b4636', 3);
    // 상담 노트 (왼쪽 위)
    ph(c, 14, 14, 210, 120, '상담 노트', '#e9e4d8');
    k.st.notes.forEach(function (f, i) { wrap(c, '· ' + factText(k.id, f), 22, 36 + i * 32, 196, 10, '#2f2a33', 13); });
    listenRows(c, k).forEach(function (r) {
      var on = k.st.notes.indexOf(r.f) >= 0;
      View.box(c, r.x, r.y, r.w, r.h, on ? '#ffe3b0' : '#fffaf0', '#2f2a33', 2);
      r.lines.forEach(function (l, i) { View.text(c, l, r.x + 10, r.y + 12 + i * 15, 11, '#2f2a33', 'left'); });
      if (on) View.box(c, r.x - 8, r.y + 4, 6, r.h - 8, '#ff8a3d', '#5b4636', 1);
    });
    if (k.shown >= k.p.facts.length) { View.box(c, 540, 226, 84, 34, '#ffb05a', '#2f2a33', 2); View.text(c, '다 들었어요', 582, 243, 11, '#2f2a33'); }
    if (!k.gone) PixelIcons.mood(c, 514, 140, k.st.mood, 11);
  }
  function hotListen(k) {
    var cvs = document.createElement('canvas').getContext('2d');
    var hot = listenRows(cvs, k).map(function (r) {
      return { id: 'f-' + r.f, x: r.x, y: r.y, w: r.w, h: r.h, glow: true, tap: function () { var res = Life.note(k.p, k.st, r.f); UI.sfx(res.ok ? 'page' : 'bad'); return null; } };
    });
    if (k.shown >= k.p.facts.length) hot.push({ id: 'listened', x: 540, y: 226, w: 84, h: 34, pulse: true, tap: function () { k.next = true; return null; } });
    return hot;
  }

  // 위에서 본 책상
  function drawDesk(c, k, t) {
    var s = S(), p = k.p, st = k.st;
    c.fillStyle = '#a77d57'; c.fillRect(0, 0, 640, 360);
    View.text(c, '상담 책상 (위에서 본 모습)', 320, 352, 9, 'rgba(47,42,51,.5)');
    // 고객님 얼굴과 말풍선
    ph(c, FACE.x, FACE.y, FACE.w, FACE.h, '', '#d7d3cc');
    var cl = Story.CLIENT[k.id];
    View.portrait(c, G, cl.look, FACE.x + 22 + (k.shake ? Math.sin(t * 40) * 3 : 0), FACE.y + 2, FACE.w - 44, FACE.h - 4, cl.tint);
    PixelIcons.mood(c, FACE.x + FACE.w - 14, FACE.y + 14, st.mood, 8);
    if (k.bubble) {
      var ls = wrapLines(c, k.bubble, 136, 10), bh = 12 + ls.length * 13;
      View.box(c, 478, 122, 156, bh, '#fffaf0', '#2f2a33', 2);
      ls.forEach(function (l, i) { View.text(c, l, 486, 132 + i * 13, 10, '#2f2a33', 'left'); });
    }
    if (p.timer && !st.done) {
      var left = Math.max(0, k.left / p.timer), tx = FACE.x + 12, ty = FACE.y + 14;
      View.disc(c, tx, ty, 10, '#2f2a33'); View.disc(c, tx, ty, 8, '#fffaf0');
      c.fillStyle = left < .35 ? '#e0574f' : '#ffb05a'; c.beginPath(); c.moveTo(tx, ty); c.arc(tx, ty, 7, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); c.closePath(); c.fill();
    }
    // 상담 노트
    ph(c, NOTE_BOX.x, NOTE_BOX.y, NOTE_BOX.w, NOTE_BOX.h, '상담 노트', '#e9e4d8');
    var ny = NOTE_BOX.y + 28;
    st.notes.forEach(function (f) { ny += wrap(c, '· ' + factText(k.id, f), NOTE_BOX.x + 8, ny, NOTE_BOX.w - 16, 10, '#2f2a33', 13) + 6; });
    if (!st.notes.length) View.text(c, '(적은 게 없다)', NOTE_BOX.x + NOTE_BOX.w / 2, NOTE_BOX.y + 60, 10, '#8a8490');
    // 고객이 들고 온 증권
    if (p.existing) {
      ph(c, POLICY.x, POLICY.y, POLICY.w, POLICY.h, '기존 보험증권', '#e6e0f0');
      View.text(c, p.existing.map(function (x) { return Story.coverName(p.product, x); }).join(', ') + '만 보장', POLICY.x + 8, POLICY.y + 36, 10, '#2f2a33', 'left');
    }
    // 태블릿
    ph(c, TAB.x, TAB.y, TAB.w, TAB.h, st.stage === 'design' ? '가입설계서' : st.stage === 'apply' ? '청약서' : '상품설명서', '#e8edf0');
    if (st.stage === 'design') drawDesign(c, k, t);
    else if (st.stage === 'apply') drawApply(c, k, t);
    else if (st.stage === 'explain') drawExplain(c, k, t);
    if (k.held) View.brochure(c, k.held.kind, k.held.x, k.held.y, 1.05, { lift: true, t: t });
    if (k.choices) k.choices.forEach(function (ch) {
      View.box(c, ch.x, ch.y, ch.w, ch.h, ch.hot ? '#ffb05a' : '#fffaf0', '#2f2a33', 2);
      View.text(c, ch.text, ch.x + ch.w / 2, ch.y + ch.h / 2, 11, '#2f2a33');
    });
    if (p.blink) { var phs = (t % 3.6); if (phs < .35) { c.fillStyle = 'rgba(10,8,14,' + (phs < .17 ? phs / .17 : (.35 - phs) / .18) * .92 + ')'; c.fillRect(0, 0, 640, 360); } }
  }
  function trayPos(kinds, i) { var n = kinds.length, gap = Math.min(64, 300 / n); return { x: 327 - (n - 1) * gap / 2 + i * gap, y: 308 }; }
  function coverRows(k) {
    return k.p.items.map(function (item, i) { return { item: item, x: TAB.x + 12, y: TAB.y + 28 + i * 34, w: TAB.w - 24, h: 28 }; });
  }
  var SHOW = { x: TAB.x + TAB.w - 92, y: TAB.y + TAB.h - 40, w: 82, h: 30 };
  function drawDesign(c, k, t) {
    var p = k.p, st = k.st;
    p.kinds.forEach(function (kind, i) {
      if (k.held && k.held.kind === kind) return;
      var pos = trayPos(p.kinds, i), top = p.prepared && kind === p.product;
      View.brochure(c, kind, pos.x, pos.y - (top ? 8 : 0), .9, { blur: p.blur || p.blink, t: t, top: top });
    });
    if (!st.product) { wrap(c, '안내서를 여기로 끌어 오세요', TAB.x + 30, TAB.y + 110, TAB.w - 60, 12, '#55505a'); return; }
    View.text(c, Story.PRODUCT[st.product], TAB.x + TAB.w - 12, TAB.y + 12, 10, '#2f2a33', 'right');
    var items = Life.PRODUCTS[st.product].items, base = Life.PRODUCTS[st.product].base;
    coverRows(k).forEach(function (r) {
      var on = !!st.covers[r.item];
      View.box(c, r.x, r.y, r.w, r.h, '#fffaf0', '#8a8490', 1);
      View.text(c, Story.coverName(st.product, r.item), r.x + 8, r.y + r.h / 2, 11, '#2f2a33', 'left');
      View.text(c, '+' + Life.won(items[r.item]), r.x + r.w - 64, r.y + r.h / 2, 10, '#55505a', 'right');
      // 켜고 끄는 스위치
      View.box(c, r.x + r.w - 52, r.y + 6, 42, 16, on ? '#7fc98f' : '#cfcac2', '#2f2a33', 2);
      View.box(c, r.x + r.w - 52 + (on ? 24 : 2), r.y + 8, 16, 12, '#fffaf0', '#2f2a33', 1);
      if (r.item === base) View.text(c, '기본', r.x + r.w - 31, r.y - 3, 8, '#55505a');
    });
    var pr = Life.premium(p, st), over = pr > p.budget;
    View.text(c, (Life.PRODUCTS[st.product].once ? '한 번 ' : '한 달 ') + Life.won(pr), TAB.x + 14, SHOW.y + 15, 14, over && k.seenBudget ? '#c0392b' : '#2f2a33', 'left');
    View.box(c, SHOW.x, SHOW.y, SHOW.w, SHOW.h, '#ffb05a', '#2f2a33', 2); View.text(c, '보여 드리기', SHOW.x + SHOW.w / 2, SHOW.y + 15, 11, '#2f2a33');
  }
  function qRows(k) { return [0, 1, 2].map(function (i) { return { i: i, x: TAB.x + 12, y: TAB.y + 30 + i * 52, w: TAB.w - 24, h: 46 }; }); }
  function drawApply(c, k, t) {
    var qs = Story.QUESTIONS[k.p.product];
    qRows(k).forEach(function (r) {
      View.box(c, r.x, r.y, r.w, r.h, '#fffaf0', '#8a8490', 1);
      wrap(c, qs[r.i], r.x + 8, r.y + 12, r.w - 80, 10, '#2f2a33', 13);
      var a = k.answers[r.i];
      View.box(c, r.x + r.w - 64, r.y + 14, 26, 18, a === 'yes' ? '#ffb05a' : '#fffaf0', '#2f2a33', 1); View.text(c, '예', r.x + r.w - 51, r.y + 23, 10, '#2f2a33');
      View.box(c, r.x + r.w - 34, r.y + 14, 26, 18, a === 'no' ? '#9fd8c9' : '#fffaf0', '#2f2a33', 1); View.text(c, '아니오', r.x + r.w - 21, r.y + 23, 8, '#2f2a33');
    });
    var sy = TAB.y + TAB.h - 34;
    View.box(c, TAB.x + 12, sy, TAB.w - 24, 26, '#f3f0e6', '#8a8490', 1); View.text(c, '서명', TAB.x + 22, sy + 13, 10, '#8a8490', 'left');
  }
  function pointRows(k) { return [0, 1, 2].map(function (i) { return { i: i, x: TAB.x + 12, y: TAB.y + 30 + i * 50, w: TAB.w - 24, h: 44 }; }); }
  var SIGN_BOX = { x: TAB.x + 12, y: TAB.y + TAB.h - 34, w: TAB.w - 24, h: 26 };
  function drawExplain(c, k, t) {
    var pts = Story.EXPLAIN[k.p.product], st = k.st;
    pointRows(k).forEach(function (r) {
      var done = st.explained.indexOf(r.i) >= 0;
      View.box(c, r.x, r.y, r.w, r.h, done ? '#d8efd9' : '#fffaf0', '#2f2a33', done ? 1 : 3);
      wrap(c, pts[r.i], r.x + 8, r.y + 12, r.w - 20, 10, '#2f2a33', 13);
    });
    ph(c, COPIES.x, COPIES.y, COPIES.w, COPIES.h, '약관과 부본', st.copies ? '#d8efd9' : '#e6e0f0');
    View.box(c, SIGN_BOX.x, SIGN_BOX.y, SIGN_BOX.w, SIGN_BOX.h, '#f3f0e6', '#2f2a33', 2);
    View.text(c, st.signed ? '서명됨' : '여기에 서명', SIGN_BOX.x + SIGN_BOX.w / 2, SIGN_BOX.y + 13, 11, st.signed ? '#2e7d4f' : '#2f2a33');
  }
  function hotDesk(k) {
    var p = k.p, st = k.st, hot = [];
    if (k.choices) return k.choices.map(function (ch, i) {
      return { id: 'ch-' + i, x: ch.x, y: ch.y, w: ch.w, h: ch.h, pulse: true, tap: function () { k.choices = null; k.pick = i; return null; } };
    });
    if (k.wait) return [];
    if (st.stage === 'design') {
      p.kinds.forEach(function (kind, i) {
        var pos = trayPos(p.kinds, i);
        hot.push({ id: 'b-' + kind, x: pos.x - 22, y: pos.y - 28, w: 44, h: 56, glow: true,
          tap: function () { UI.sfx('tap'); k.drop = kind; return null; },
          drag: {
            start: function (d) { k.held = { kind: kind, x: d.x, y: d.y }; UI.sfx('page'); },
            move: function (d) { if (k.held) { k.held.x = d.x; k.held.y = d.y; } },
            end: function (d) { var h = k.held; k.held = null; if (h && inside(d, TAB)) k.drop = kind; return null; },
            cancel: function () { k.held = null; }
          } });
      });
      if (st.product) {
        coverRows(k).forEach(function (r) {
          if (r.item === Life.PRODUCTS[st.product].base) return;
          hot.push({ id: 'cv-' + r.item, x: r.x, y: r.y, w: r.w, h: r.h, glow: true, tap: function () { Life.toggle(p, st, r.item); UI.sfx('tap'); return null; } });
        });
        hot.push({ id: 'show', x: SHOW.x, y: SHOW.y, w: SHOW.w, h: SHOW.h, pulse: true, tap: function () { k.submit = true; return null; } });
      }
    } else if (st.stage === 'explain') {
      pointRows(k).forEach(function (r) {
        if (st.explained.indexOf(r.i) >= 0) return;
        hot.push({ id: 'pt-' + r.i, x: r.x, y: r.y, w: r.w, h: r.h, pulse: true, tap: function () { k.point = r.i; return null; } });
      });
      if (!st.copies) hot.push({ id: 'copies', x: COPIES.x, y: COPIES.y, w: COPIES.w, h: COPIES.h, pulse: true, tap: function () { Life.hand(p, st); UI.sfx('page'); setBubble(k, Story.SIGN.copies); return null; } });
      hot.push({ id: 'sign', x: SIGN_BOX.x, y: SIGN_BOX.y, w: SIGN_BOX.w, h: SIGN_BOX.h, glow: true, pulse: st.explained.length >= 3 && st.copies, tap: function () { k.signTap = true; return null; } });
    }
    return hot;
  }
  function drawConsult(c) {
    var k = Wk.consult, s = S(), t = G.t;
    if (k.view === 'listen') {
      View.bg(c, G, 'office'); officeClock(c, s.minute);
      if (k.p.evening || Wk.dark) View.nightTint(c, .45);
      c.fillStyle = 'rgba(30,26,34,.35)'; c.fillRect(0, 0, 640, 360);
      drawListen(c, k, t);
    } else drawDesk(c, k, t);
  }
  function hotConsult() {
    var k = Wk.consult; if (!k || k.st.done || k.gone || !k.ready) return [];
    return k.view === 'listen' ? hotListen(k) : hotDesk(k);
  }
  function tickConsult(dt) {
    var k = Wk.consult; if (!k || !k.ready || k.st.done) return;
    if (UI.busy() || G.drag || k.wait || k.choices) return;
    if (k.p.timer) { k.left -= dt; if (k.left <= 0) { k.left = k.p.timer; k.timeout = true; } }
    if (k.p.blink && (G.t % 3.6) < .02) UI.sfx('yawn');
  }
  // 두세 개 중 하나를 고르는 단추 (책상 아래쪽)
  function choose(k, list) {
    var w = Math.min(190, 560 / list.length - 10), x0 = 320 - (list.length * (w + 10) - 10) / 2;
    k.pick = null;
    k.choices = list.map(function (text, i) { return { text: text, x: x0 + i * (w + 10), y: 270, w: w, h: 30 }; });
    return Engine.until(function () { return k.pick !== null; }).then(function () { var i = k.pick; k.pick = null; return i; });
  }
  function bad(k) { UI.sfx('bad'); k.shake = true; setTimeout(function () { k.shake = false; }, 600); }
  function consult(id, opts) {
    var s = S(), p = Life.plan(s, id), st = Life.consult(p), k;
    k = Wk.consult = { id: id, p: p, st: st, left: p.timer, ready: false, gone: !!p.leaves, peer: !!p.tutorial, heroFrame: 0, view: 'listen', shown: 0, answers: [] };
    Engine.setScene({ draw: drawConsult, hot: hotConsult, tick: tickConsult, place: 'consult' });
    var CAUSE_ICON = { sneeze: 'sneeze', catLover: 'heart', fur: 'fur', photos: 'camera', prepared: 'mail', yawn: 'zzz', smell: 'stink', stink: 'stink' };
    function wait(fn) { return Engine.until(function () { return fn() || k.timeout || st.done; }).then(function () { if (k.timeout && !st.done) { k.timeout = false; Life.timeout(p, st); bad(k); return clientSays(k, Story.CONSULT.slow).then(function () { return st.done ? null : wait(fn); }); } return null; }); }
    return Engine.fade(0, .35).then(function () {
      if (p.leaves) return say([me(Story.CAUSE[p.reasons[0].key] || Story.CAUSE.lateLeft)]).then(function () { return Life.finish(s, p, st); });
      return say([client(id, Story.CONSULT.greet)]).then(function () {
        return p.reasons.reduce(function (pr, r) {
          return pr.then(function () {
            var ic = CAUSE_ICON[r.key];
            if (r.key === 'sneeze') UI.sfx('sneeze');
            if (r.key === 'yawn') { UI.sfx('yawn'); Engine.puff({ x: 210, y: 150, icon: ic, px: 2, life: 1.6 }); }
            else if (r.key === 'smell' || r.key === 'stink') { bad(k); Engine.puff({ x: 300, y: 170, icon: 'stink', px: 2, life: 1.6, rise: 30 }); }
            else Engine.puff({ x: 456, y: 150, icon: ic, px: 2, life: 1.6 });
            return say([me(Story.CAUSE[r.key === 'sneeze' && !s.seen.furLost ? 'sneezeFirst' : r.key])]);
          });
        }, Promise.resolve());
      }).then(function () { return p.tutorial && !s.seen.tutListen ? (s.seen.tutListen = true, say(Story.TUTORIAL.listen)) : null; })
        .then(listen).then(design).then(applyStep).then(explainStep).then(done);
    });
    // 1. 듣기: 고객님이 한 줄씩 말하고, 적어 둘 말을 누른다
    function listen() {
      k.ready = true; k.left = p.timer;
      return p.facts.reduce(function (pr) { return pr.then(function () { k.shown++; UI.sfx('page'); return Engine.sleep(.8); }); }, Promise.resolve())
        .then(function () { return wait(function () { return k.next; }); })
        .then(function () { k.next = false; Life.listened(p, st); });
    }
    // 2. 설계하기
    function design() {
      if (st.done) return null;
      k.view = 'desk'; k.left = p.timer;
      setBubble(k, p.existing ? Story.DESIGN.switchAsk : Story.DESIGN.pickFirst);
      var intro = p.tutorial && !s.seen.tutDesign ? (s.seen.tutDesign = true, say(Story.TUTORIAL.design)) : Promise.resolve();
      if (p.existing) intro = intro.then(function () { return clientSays(k, Story.DESIGN.switchAsk); });
      return intro.then(loop);
      function loop() {
        if (st.done) return null;
        return wait(function () { return k.drop || k.submit; }).then(function () {
          if (st.done) return null;
          if (k.drop) {
            var kind = k.drop; k.drop = null;
            var r = Life.pickProduct(p, st, kind);
            if (r.ok) { UI.sfx('good'); k.left = p.timer; return loop(); }
            bad(k);
            return clientSays(k, Story.DESIGN.wrongProduct[Math.min(st.wrong - 1, 1)]).then(loop);
          }
          k.submit = false;
          var res = Life.submitDesign(p, st);
          if (res.over) {
            k.seenBudget = true;
            return clientSays(k, Story.DESIGN.over(res.premium)).then(function () { return choose(k, ['보장을 줄여 보기', '이대로 권하기']); }).then(function (i) {
              if (i === 0) return loop();
              var f = Life.submitDesign(p, st, true);
              if (f.overRefused) { bad(k); return clientSays(k, Story.DESIGN.overOnce(Life.premium(p, st))).then(loop); }
              return clientSays(k, Story.DESIGN.overPush).then(afterDesign);
            });
          }
          if (res.missing) { bad(k); return clientSays(k, Story.DESIGN.missing(p.product, res.missing)).then(loop); }
          if (!res.ok) return st.done ? null : loop();
          UI.sfx('good');
          return clientSays(k, p.existing ? (res.switched ? Story.DESIGN.switched : Story.DESIGN.kept) : Story.DESIGN.ok).then(afterDesign);
        });
      }
      function afterDesign() { return null; }
    }
    // 3. 청약서 쓰기: 고객님이 한 줄씩 답한다
    function applyStep() {
      if (st.done) return null;
      var yes = talkOf(id).yes, line = yes ? yes.line : -1;
      setBubble(k, Story.APPLY.intro);
      var pr = p.tutorial && !s.seen.tutApply ? (s.seen.tutApply = true, say(Story.TUTORIAL.apply)) : Promise.resolve();
      k.wait = true;
      return pr.then(function () {
        return [0, 1, 2].reduce(function (q, i) {
          return q.then(function () {
            if (i === line) { k.answers[i] = 'yes'; return clientSays(k, yes.say); }
            k.answers[i] = 'no'; setBubble(k, Story.APPLY.no[i]); UI.sfx('tap'); return Engine.sleep(.6);
          });
        }, Promise.resolve());
      }).then(function () {
        k.wait = false;
        if (line < 0) { Life.apply(p, st, true); return null; }
        return choose(k, [Story.APPLY.tell, Story.APPLY.hide]).then(function (i) {
          var honest = i === 0, r = Life.apply(p, st, honest);
          if (!honest) { k.answers[line] = 'no'; return clientSays(k, Story.APPLY.clientHid); }
          if (r.outcome === 'declined') return say([me(Story.APPLY.toldRefuse)]).then(function () { return clientSays(k, Story.APPLY.clientThanks); });
          UI.sfx('good');
          return say([me(Story.APPLY.toldExclusion[p.product] || Story.APPLY.toldExclusion.dental)]);
        });
      });
    }
    // 4. 설명하고 서명받기
    function explainStep() {
      if (st.done) return null;
      setBubble(k, '');
      var pr = p.tutorial && !s.seen.tutExplain ? (s.seen.tutExplain = true, say(Story.TUTORIAL.explain)) : Promise.resolve();
      return pr.then(function () {
        // 손에 익은 뒤에는 설명서를 한 번 짚으면 세 칸을 이어서 설명한다
        return loop();
      });
      function loop() {
        if (st.done) return null;
        return wait(function () { return k.point !== undefined && k.point !== null || k.signTap; }).then(function () {
          if (st.done) return null;
          if (k.point !== undefined && k.point !== null) {
            var i = k.point; k.point = null;
            if (p.quick) { [0, 1, 2].forEach(function (n) { Life.explain(p, st, n); }); Life.hand(p, st); UI.sfx('page'); setBubble(k, '네, 알겠어요.'); return loop(); }
            Life.explain(p, st, i); UI.sfx('page');
            return say([me(Story.EXPLAIN[p.product][i])]).then(loop);
          }
          k.signTap = false;
          if (Life.needsPersuade(p, st)) {
            return clientSays(k, Story.SIGN.delay[id]).then(function () {
              var hook = st.notes.indexOf('hook') >= 0;
              return choose(k, hook ? ['상담 노트를 다시 보여 드리기', '다음에 뵙기'] : ['다음에 뵙기']).then(function (i) {
                if (hook && i === 0) { Life.persuade(p, st); return say([me(Story.SIGN.persuade[id])]).then(function () { return clientSays(k, Story.SIGN.persuaded[id]); }).then(loop); }
                st.notes = st.notes.filter(function (f) { return f !== 'hook'; }); Life.persuade(p, st);
                return clientSays(k, Story.SIGN.later);
              });
            });
          }
          var rushed = st.explained.length < 3 || !st.copies;
          var r = Life.sign(p, st);
          if (r.signed) { UI.sfx('good'); return clientSays(k, rushed && p.mark === 'doubt' ? Story.SIGN.rushed : Story.SIGN.signed); }
          bad(k); return clientSays(k, Story.SIGN.lost).then(function () { k.gone = true; });
        });
      }
    }
    function done() {
      G.hand = null; k.choices = null;
      var res = Life.finish(s, p, st);
      if (!res.signed && res.why !== 'declined' && res.why !== 'later') return say([me(Story.CAUSE.lost)]).then(function () { return res; });
      return res;
    }
  }

  // ---------- 하루 지점 일정 ----------
  // 지점에 있는 동안 위쪽 시계만 상담 시각으로 옮긴다 (규칙 계산에는 쓰지 않는다)
  var CONSULT_AT = [600, 840, 960];
  function workClock(m) { var s = S(); if (s && s.phase === 'work') s.minute = Math.max(s.minute, m); }
  function workDay() {
    var s = S(), ids = Life.clientsOn(s.day, s), results = [];
    return Engine.fade(1, .3).then(assembly).then(function () {
      return ids.reduce(function (pr, id, i) {
        return pr.then(function () { return Engine.fade(1, .3); }).then(function () { workClock(CONSULT_AT[Math.min(i, 2)]); return consult(id); }).then(function (res) {
          results.push(res);
          var furLost = !res.signed && s.events.some(function (e) { return e.key === 'furLost' && e.day === s.day && e.id === res.id; });
          var smellLost = !res.signed && s.events.some(function (e) { return e.key === 'smellLost' && e.day === s.day && e.id === res.id; });
          if (furLost || smellLost) return Engine.fade(1, .3).then(function () { return furLost ? seniorLesson(res.why === 'sneeze', i < ids.length - 1) : null; })
            .then(function () { return smellLost ? smellLesson(i < ids.length - 1) : null; }).then(function () { return Engine.fade(1, .3); });
          if (!res.signed) return Engine.fade(1, .3);
          return Engine.fade(1, .3).then(function () { office(); return Engine.fade(0, .3); }).then(function () { return sticker(1); })
            .then(function () { return res.goal ? goalParty() : null; });
        });
      }, Promise.resolve());
    }).then(function () { return results; });
  }
  // 4/16 저녁 8시 단체보험
  function groupEvening() {
    var s = S(), id = Life.day(s).group;
    office();
    workClock(920);
    return Engine.fade(0, .3).then(function () { return say(Story.groupOffer(s)); }).then(function () {
      var m = Story.phone.group;
      return UI.phoneWait({ from: m.from, time: m.time, body: m.body, preview: m.body, replies: [m.yes, m.no] }, '3:20');
    }).then(function (reply) {
      var go = reply === 0;
      Life.decideGroup(s, go);
      if (!go) return null;
      return Engine.fade(1, .4).then(function () { Wk.dark = true; office({ night: true }); return Engine.fade(0, .4); })
        .then(function () { return Engine.fade(1, .3); }).then(function () { Wk.dark = true; workClock(1200); return consult(id); })
        .then(function (res) {
          if (!res.signed) return Engine.fade(1, .3);
          return Engine.fade(1, .3).then(function () { office({ night: true }); return Engine.fade(0, .3); }).then(function () { return sticker(1); })
            .then(function () { return res.goal ? goalParty() : null; });
        });
    });
  }
  // 4/22 야근: 퇴근 시각, 내 자리에 다시 앉을지(남아서 한 건 더) 가방을 멜지(퇴근) 손으로 정한다
  var DESK = { x: 418, y: 196, w: 140, h: 66 }; // 내 자리 (출구 옆 책상)
  function overtime() {
    var s = S(), id = Life.day(s).group, pick = null;
    office();
    Wk.lead = { x: 300, dir: 1 }; Wk.peer = { x: 150, dir: 1 };
    G.hero.x = 470; G.hero.dir = -1;
    workClock(Life.T.workEnd);
    Engine.setScene({
      place: 'office',
      draw: function (c) { drawOffice(c); if (!pick) View.lampGlow(c, DESK.x + DESK.w / 2, DESK.y + 40, 80, .28 + Math.sin(G.t * 3) * .06); },
      hot: function () {
        if (pick) return [];
        return [
          { id: 'stay', x: DESK.x, y: DESK.y, w: DESK.w, h: DESK.h, pulse: true, tap: function () { return Engine.walkTo(DESK.x + DESK.w / 2).then(function () { pick = 'stay'; }); } },
          { id: 'exit', x: EXIT.x, y: EXIT.y, w: EXIT.w, h: EXIT.h, pulse: true, tap: function () { return Engine.walkTo(590).then(function () { G.hero.pose = 'back'; pick = 'go'; }); } }
        ];
      }
    });
    return Engine.fade(0, .3).then(function () { return say(Story.BEAT.overtime(s)); }).then(function () {
      return Engine.until(function () { return pick; });
    }).then(function () {
      G.hero.pose = null;
      var stay = pick === 'stay';
      Life.decideGroup(s, stay);
      if (!stay) return Engine.fade(1, .3);
      return Engine.fade(1, .4).then(function () { Wk.dark = true; office({ night: true }); workClock(1200); return consult(id); })
        .then(function (res) {
          if (!res.signed) return Engine.fade(1, .3);
          return Engine.fade(1, .3).then(function () { office({ night: true }); return Engine.fade(0, .3); }).then(function () { return sticker(1); })
            .then(function () { return res.goal ? goalParty() : null; });
        });
    });
  }
  var EXIT = { x: 554, y: 66, w: 72, h: 174 };
  function leaveOffice() {
    var s = S(), first = Life.day(s).first, out = false, night = Wk.dark;
    office({ night: night });
    Wk.lead = { x: 300, dir: 1 }; Wk.peer = { x: 150, dir: 1 };
    G.hero.x = 470; G.hero.dir = 1;
    Life.leaveOffice(s);
    Wk.talked = { lead: false, peer: false };
    function talk(who) {
      var p = Wk[who];
      return Engine.walkTo(p.x + 56).then(function () { G.hero.dir = -1; p.dir = 1; Wk.talked[who] = true; return say(Story.officeTip(s, who)); });
    }
    // 벽의 실적 그래프: 누르면 크게 본다 (다시 누르면 닫힌다)
    function bigChart() {
      return Engine.walkTo(414).then(function () { G.hero.pose = 'back'; UI.sfx('page'); Wk.chart = { fly: false, t0: G.t, view: true }; Wk.chartHint = false; s.seen.chartView = true; });
    }
    Engine.setScene({
      draw: drawOffice, place: 'office',
      walk: function (p) { return Wk.chart ? null : Math.max(60, Math.min(600, p.x)); },
      hot: function () {
        if (Wk.chart && Wk.chart.view) return [{ id: 'chartClose', x: 0, y: 0, w: 640, h: 360, glow: false, tap: function () { Wk.chart = null; G.hero.pose = null; return null; } }];
        var list = [];
        list.push({ id: 'chart', x: 380, y: 74, w: 68, h: 68, tap: bigChart });
        if (!night) {
          list.push({ id: 'lead', x: Wk.lead.x - 22, y: 214, w: 44, h: 124, tap: function () { return talk('lead'); } });
          list.push({ id: 'peer', x: Wk.peer.x - 22, y: 214, w: 44, h: 124, tap: function () { return talk('peer'); } });
        }
        list.push({ id: 'exit', x: EXIT.x, y: EXIT.y, w: EXIT.w, h: EXIT.h, tap: function () {
          return Engine.walkTo(590).then(function () { G.hero.pose = 'back'; UI.sfx('door'); return Engine.sleep(.25); }).then(function () { out = true; });
        } });
        return list;
      }
    });
    return Engine.fade(0, .3).then(function () {
      UI.sfx('coin');
      var lines = Story.leaveOffice(s, first);
      return lines.length ? say(lines) : null;
    }).then(function () {
      // 선배 이야기가 있는 날: 선배가 곁으로 다가와 말을 건다
      var arc = night ? [] : Arc.officeLines(s);
      if (!arc.length) return null;
      return new Promise(function (resolve) {
        var from = Wk.peer.x, to = 400, t0 = G.t;
        (function step() { var q = Math.min(1, (G.t - t0) / .8); Wk.peer.x = from + (to - from) * q; if (q < 1) setTimeout(step, 30); else resolve(); }());
      }).then(function () { G.hero.dir = -1; Wk.peer.dir = 1; return say(arc); });
    }).then(function () {
      Arc.clearOverlay();
      Wk.talkable = !night;
      Wk.chartHint = !s.seen.chartView;
      if (first) { // 처음 퇴근할 때: 누를 수 있는 사람과 그래프를 한 번 다 빛낸다
        G.outlineAll = true; setTimeout(function () { G.outlineAll = false; }, 2800);
        G.guide = { x: EXIT.x + EXIT.w / 2, y: EXIT.y - 4, dir: 'down' };
      }
      return Engine.until(function () { return out; });
    }).then(function () { G.guide = null; G.hero.pose = null; Wk.talkable = false; Wk.chartHint = false; Wk.chart = null; return Engine.fade(1, .3); });
  }

  // ---------- 거리 ----------
  var SHOPDOOR = { x: 452, y: 168, w: 112, h: 128 };
  function drawStreet(c) {
    var st = Wk.street, t = G.t;
    View.bg(c, G, st.winter ? 'streetWinter' : 'streetSpring');
    if (st.winter) PixelArt.rain(c, { x: 0, y: 0, w: 640, h: 360 }, t, 1);
    if (st.dusk) { c.fillStyle = 'rgba(255,150,90,.16)'; c.fillRect(0, 0, 640, 360); View.nightTint(c, .18); }
    if (st.night) { View.nightTint(c, .5); View.lampGlow(c, 508, 220, 120, .3); }
    if (st.draw) st.draw(c);
    else {
      View.shadow(c, G.hero.x, 343, 20);
      View.person(c, G, G.hero.x, 342, G.s && G.s.wearing === 'suit' ? 'suit' : 'hoodie', G.hero.walking ? G.hero.dir : G.hero.dir, t, G.hero.walking ? 'walk' : 'stand', 2.35);
      heroMarks(c, G.hero.x, 342);
    }
  }
  function street(opts) {
    Wk.street = opts || {};
    Engine.setScene({ draw: drawStreet, hot: opts.hot, tick: opts.tick, walk: opts.walk, place: 'street' });
  }
  // 퇴근길: 가게에 들르거나 그냥 집으로
  function walkHome() {
    var s = S(), first = !s.seen.street, choice = null;
    s.seen.street = true;
    G.hero.x = 30; G.hero.dir = 1; G.hero.tx = null;
    street({
      dusk: true,
      hot: function () {
        return [
          { id: 'shopDoor', x: SHOPDOOR.x, y: SHOPDOOR.y, w: SHOPDOOR.w, h: SHOPDOOR.h, tap: function () { return Engine.walkTo(508).then(function () { choice = 'shop'; }); } },
          { id: 'home', x: 586, y: 180, w: 54, h: 180, tap: function () { return Engine.walkTo(630).then(function () { choice = 'home'; }); } }
        ];
      },
      walk: function (p) { return Math.max(30, Math.min(610, p.x)); }
    });
    return Engine.fade(0, .35).then(function () { return Engine.walkTo(300); }).then(function () {
      if (first) { G.guide = { x: 508, y: 160, dir: 'down' }; return say([me('그 슈퍼다.')]); }
      return null;
    }).then(function () {
      return Engine.until(function () { return choice; });
    }).then(function () { G.guide = null; return Engine.fade(1, .3).then(function () { return choice; }); });
  }

  // ---------- 가게 ----------
  // 진열대 자리: 가운데 칸(y 160)과 아래 칸(y 222), 바닥. 이름은 물건 위에, 값은 아래에 붙인다.
  var SHELF = {
    dry: { x: 262, y: 160 }, wet: { x: 318, y: 160 }, roller: { x: 372, y: 160 }, coffee: { x: 424, y: 160 }, lunch: { x: 478, y: 160 },
    sand: { x: 266, y: 228 }, feeder: { x: 314, y: 228 }, autoToy: { x: 362, y: 228 }, toy: { x: 408, y: 228 },
    robot: { x: 320, y: 334 }, tower: { x: 452, y: 330 }
  };
  var PRO_SHELF = { charcoal: { x: 292, y: 160, price: 12000 }, dry: { x: 382, y: 160, price: 12000 }, wet: { x: 470, y: 160, price: 15000 } };
  // 계산대: 사장님은 계산대 뒤에 서 있고, 고른 물건은 계산대 위에 쌓인다
  var COUNTER = { x: 470, top: 236, clerk: 596, stand: 440 };
  function drawShopItem(c, item, x, y, scale) {
    scale = scale || 1;
    if (item === 'dry') View.foodBag(c, x, y, undefined, 8, 0, scale);
    else if (item === 'wet') View.item(c, 'wetFood', x, y, 1.1 * scale);
    else if (item === 'sand') View.sandBag(c, x, y, 1.05 * scale);
    else if (item === 'roller') View.item(c, 'roller', x, y, 1 * scale);
    else if (item === 'coffee') View.cup(c, x, y, 1 * scale);
    else if (item === 'lunch') View.lunchbox(c, x, y, 1 * scale);
    else if (item === 'feeder') View.feeder(c, x, y, .9 * scale);
    else if (item === 'tower') View.catTower(c, x, y, .82 * scale);
    else if (item === 'toy') View.toy(c, x, y - 2, G.t);
    else if (item === 'charcoal') View.charcoal(c, x, y, .9 * scale);
    else if (item === 'robot') View.robot(c, x, y, 46 * scale);
    else if (item === 'autoToy') View.autoToy(c, x, y, 34 * scale);
  }
  function itemTop(item) { return item === 'tower' ? 96 : item === 'charcoal' ? 52 : item === 'toy' ? 20 : item === 'robot' ? 40 : 38; }
  function shown(item) { var sh = Wk.shop; return sh.pro || Life.onShelf(S(), item); }
  function fresh(item) { var it = Life.SHOP[item]; return !Wk.shop.pro && it && it.from && S().day <= it.from + 1; }
  function descKey(item) { var sh = Wk.shop; return sh.pro && (item === 'dry' || item === 'wet') ? (item === 'dry' ? 'proDry' : 'proWet') : item; }
  function priceOf(item) { var sh = Wk.shop; return sh.pro ? sh.shelf[item].price : Life.price(S(), item); }
  function walletNow() { var sh = Wk.shop; return sh.pro ? G.pro.wallet : S().wallet; }
  function cartTotal() { return Wk.shop.basket.reduce(function (a, it) { return a + priceOf(it); }, 0); }
  // 지금 설명을 보여 줄 물건: 마우스를 댄 것, 손가락이면 한 번 누른 것
  function focusItem() {
    var sh = Wk.shop, hv = G.hover && G.hover.id;
    if (hv && hv.indexOf('shelf-') === 0 && G.pointerType === 'mouse') return hv.slice(6);
    return sh.focus || null;
  }
  // 꼬리표: 위에 이름, 아래에 값 (돈이 모자라면 값이 빨갛다)
  function tag(c, name, price, x, y, red, night) {
    c.font = "9px 'NeoDunggeunmo', monospace";
    var w = Math.max(c.measureText(name).width, c.measureText(Life.won(price)).width) + 8;
    View.box(c, x - w / 2, y, w, 24, red ? '#ffe3dc' : night ? '#fff0c9' : '#fffaf0', '#5b4636', 1);
    View.text(c, name, x, y + 7, 9, '#2f2a33');
    View.text(c, Life.won(price), x, y + 17, 9, red ? '#c0392b' : night ? '#b0561c' : '#5b4636');
    return w;
  }
  function drawDesc(c, item) {
    var sh = Wk.shop, p = sh.shelf[item], lines = Story.ITEM_DESC[descKey(item)] || [], price = priceOf(item);
    if (sh.night && !sh.pro) lines = lines.concat(['밤 11시가 넘어서 심야 할증이 붙었다.']);
    c.font = "11px 'NeoDunggeunmo', monospace";
    var w = Math.max(150, Math.ceil(Math.max.apply(null, lines.map(function (l) { return c.measureText(l).width; }))) + 22);
    var h = 34 + lines.length * 17, x = Math.max(8, Math.min(632 - w, p.x - w / 2)), y = p.y - itemTop(item) - h - 8;
    if (y < 8) y = p.y + 30;
    View.box(c, x, y, w, h, '#fffaf0', '#2f2a33', 2);
    View.text(c, Story.ITEM[item], x + 10, y + 17, 13, '#2f2a33', 'left');
    View.text(c, Life.won(price), x + w - 10, y + 17, 12, '#c0392b', 'right');
    lines.forEach(function (l, i) { View.text(c, l, x + 10, y + 36 + i * 17, 11, '#3b3540', 'left'); });
  }
  // 계산대 뒤의 사장님: 계산대 윗면 위로 상반신만 보인다
  function drawClerk(c) {
    var t = G.t, sh = Wk.shop;
    c.save(); c.beginPath(); c.rect(COUNTER.x, 0, 640 - COUNTER.x, COUNTER.top + 2); c.clip();
    View.person(c, G, COUNTER.clerk, 292 + (sh.asking ? Math.sin(t * 6) : 0), 'customerC', -1, t, 'stand', 2.2, 200);
    c.restore();
    if (sh.night && !sh.pro) { // 심야 할증 안내판 (천장에 매달린 판)
      View.r(c, 566, 92, 2, 16, '#5b4636'); View.r(c, 610, 92, 2, 16, '#5b4636');
      View.box(c, 552, 106, 74, 24, '#2f3550', '#2f2a33', 2);
      View.text(c, '심야 할증 ×' + Life.NIGHT_RATE, 589, 118, 10, '#ffd76a');
    }
  }
  // 밤 11시가 넘으면 문 유리 너머도 밤이다 (가게 안 불빛만 환하다)
  var GLASS = [[21, 54, 70, 25], [91, 54, 69, 25], [26, 90, 57, 145], [96, 90, 62, 145]];
  function nightGlass(c) {
    c.save();
    GLASS.forEach(function (g) { c.fillStyle = 'rgba(14,20,48,.86)'; c.fillRect(g[0], g[1], g[2], g[3]); });
    c.fillStyle = 'rgba(255,214,120,.85)';
    [[34, 120], [44, 120], [34, 132], [62, 112], [108, 104], [118, 104], [140, 118], [108, 140], [150, 128]].forEach(function (d, i) { if ((i + Math.floor(G.t / 3)) % 7) c.fillRect(d[0], d[1], 3, 3); });
    var lamp = c.createRadialGradient(128, 196, 2, 128, 196, 34); lamp.addColorStop(0, 'rgba(255,220,140,.45)'); lamp.addColorStop(1, 'rgba(255,220,140,0)');
    c.beginPath(); c.rect(96, 90, 62, 145); c.clip(); c.fillStyle = lamp; c.fillRect(90, 150, 70, 90);
    c.restore();
  }
  function drawShop(c) {
    var sh = Wk.shop, s = S(), t = G.t;
    View.bg(c, G, 'shop');
    if (sh.winter) { c.fillStyle = 'rgba(40,60,90,.12)'; c.fillRect(0, 0, 640, 360); }
    if (sh.night) { c.fillStyle = 'rgba(20,24,52,.18)'; c.fillRect(0, 0, 640, 360); nightGlass(c); }
    var wallet = walletNow(), focus = focusItem(), total = cartTotal();
    if (sh.job) { drawClerk(c); drawJob(c); return; }
    if (jobOpen()) drawPoster(c);
    drawClerk(c);
    Object.keys(sh.shelf).forEach(function (item) {
      var p = sh.shelf[item], price = priceOf(item);
      if (!shown(item)) return;
      if (!sh.pro && Life.SHOP[item].once && s.owned[item] && !(item === 'autoToy' && !Life.autoToyOn(s))) return;
      if (sh.basket.indexOf(item) >= 0 && (sh.pro || (Life.SHOP[item] && Life.SHOP[item].once))) return;
      var lift = item === focus ? -3 - Math.abs(Math.sin(t * 5)) * 2 : 0;
      drawShopItem(c, item, p.x, p.y + lift, item === focus ? 1.08 : 1);
      tag(c, Story.ITEM[item], price, p.x, p.y + 3, wallet - total < price, sh.night && !sh.pro);
      if (fresh(item)) { var by = p.y - itemTop(item) + 2, bx = p.x + 14; View.box(c, bx, by, 24, 11, '#e2775e', '#5b4636', 1); View.text(c, '신상', bx + 12, by + 6, 8, '#fffaf0'); }
    });
    // 고른 물건은 계산대 위에 올려 둔다 (누르면 다시 진열대로). 계산 전에는 합계만 보인다.
    sh.basket.forEach(function (item, i) { var b = basketPos(i); drawShopItem(c, item, b.x, b.y, .62); });
    if (sh.basket.length) {
      View.box(c, 486, 252, 92, 22, '#fffaf0', '#2f2a33', 2);
      View.text(c, '합계 ' + Life.won(total), 532, 263, 11, total > wallet ? '#c0392b' : '#2f2a33');
    }
    View.shadow(c, G.hero.x, 343, 20);
    View.person(c, G, G.hero.x, 342, sh.pro ? 'hoodie' : (s.wearing === 'suit' ? 'suit' : 'hoodie'), G.hero.walking ? G.hero.dir : (sh.asking ? 1 : -1), t, G.hero.walking ? 'walk' : 'stand', 2.35);
    if (!sh.pro) heroMarks(c, G.hero.x, 342);
    if (focus && sh.shelf[focus] && !sh.asking) drawDesc(c, focus);
  }
  function basketPos(i) { return { x: 492 + (i % 5) * 18, y: 238 - Math.floor(i / 5) * 12 }; }
  function hotShop() {
    var sh = Wk.shop, s = S(), list = [];
    if (sh.job) return hotJob();
    if (sh.asking) return [];
    if (jobOpen()) list.push({ id: 'jobPoster', x: POSTER.x - 4, y: POSTER.y - 4, w: POSTER.w + 8, h: POSTER.h + 8, tap: startJob });
    Object.keys(sh.shelf).forEach(function (item) {
      var p = sh.shelf[item];
      if (!shown(item)) return;
      if (!sh.pro && Life.SHOP[item].once && s.owned[item] && !(item === 'autoToy' && !Life.autoToyOn(s))) return;
      if (sh.basket.indexOf(item) >= 0 && (sh.pro || Life.SHOP[item].once)) return;
      var w = item === 'tower' ? 54 : 46, h = itemTop(item) + 6;
      list.push({ id: 'shelf-' + item, x: p.x - w / 2, y: p.y - h, w: w, h: h + 28, tap: function () {
        // 손가락: 처음 누르면 설명만, 한 번 더 누르면 담는다. 마우스: 대면 설명, 누르면 담는다.
        if (G.pointerType !== 'mouse' && sh.focus !== item) { sh.focus = item; UI.sfx('tap'); return null; }
        sh.focus = null;
        return pick(item);
      } });
    });
    sh.basket.forEach(function (item, i) { var b = basketPos(i); list.push({ id: 'basket-' + i, x: b.x - 9, y: b.y - 24, w: 18, h: 26, tap: function () { sh.basket.splice(i, 1); UI.sfx('tap'); return null; } }); });
    // 계산대(사장님)를 누르거나 문으로 나가면 계산한다
    if (sh.basket.length) list.push({ id: 'clerk', x: COUNTER.clerk - 30, y: 150, w: 60, h: 86, tap: checkout });
    list.push({ id: 'exit', x: 14, y: 44, w: 152, h: 196, tap: function () { return sh.basket.length ? checkout() : (sh.leave = true, null); } });
    return list;
  }
  // 진열대에서 집어 계산대에 올린다 (돈은 계산할 때 낸다)
  function pick(item) {
    var sh = Wk.shop, s = S(), p = sh.shelf[item], price = priceOf(item);
    return Engine.walkTo(Math.max(150, Math.min(230, p.x - 60))).then(function () {
      if (walletNow() - cartTotal() < price) { UI.sfx('bad'); return say([me(cartTotal() ? '이것까지 사기엔 돈이 모자라.' : '돈이 모자라.')]); }
      if (!sh.pro) { var why = Life.buyBlock(s, item, cartTotal()); if (why) { UI.sfx('bad'); return null; } }
      UI.sfx('page'); sh.basket.push(item);
      if (sh.pro) return checkout(); // 프롤로그: 하나를 고르면 바로 계산대로
      return null;
    });
  }
  // 계산대 앞: 사장님이 합계를 말하고 묻는다. 계산하면 돈을 내고, 아니면 다시 고른다.
  function checkout() {
    var sh = Wk.shop, s = S(), total = cartTotal(), btn = $('actionButton'), back = $('backButton');
    if (!sh.basket.length) return null;
    return Engine.walkTo(COUNTER.stand).then(function () {
      G.hero.dir = 1; sh.asking = true;
      return say([{ who: 'owner', text: (sh.basket.length > 1 ? sh.basket.length + '개, ' : '') + '전부 ' + Life.won(total) + '이에요. 계산하시겠어요?' }]);
    }).then(function () {
      btn.textContent = '계산하기'; btn.hidden = false; back.hidden = false;
      return new Promise(function (resolve) {
        btn.onclick = function () { if (!UI.busy()) resolve(true); };
        back.onclick = function () { if (!UI.busy()) resolve(false); };
      });
    }).then(function (pay) {
      btn.hidden = true; back.hidden = true; btn.onclick = null; back.onclick = null;
      if (!pay) { sh.asking = false; if (sh.pro) sh.basket = []; return Engine.walkTo(220); }
      UI.sfx('coin');
      if (sh.pro) { G.pro.wallet -= total; sh.picked = sh.basket[0]; sh.basket = []; sh.asking = false; return null; }
      sh.basket.forEach(function (item) { var r = Life.buy(s, item); if (r.ok) sh.bought.push(item); });
      sh.basket = [];
      return say([{ who: 'owner', text: s.minute >= Life.T.bedtime ? '늦게까지 고생 많아요. 조심히 들어가요.' : '감사합니다. 또 오세요.' }]).then(function () { sh.asking = false; sh.leave = true; });
    });
  }
  function $(id) { return document.getElementById(id); }
  // ---------- 주말 알바: 슈퍼 진열 정리 ----------
  var POSTER = { x: 196, y: 64, w: 56, h: 42 };
  var JOB_ITEMS = ['dry', 'sand', 'wet', 'coffee', 'lunch', 'roller'];
  var CRATE = { x: 470, y: 300 };
  function jobOpen() { var s = S(), sh = Wk.shop; return !sh.pro && s && s.phase === 'weekend' && !s.jobbed; }
  function drawPoster(c) {
    var q = POSTER, glow = Math.sin(G.t * 3) * .5 + .5;
    View.box(c, q.x, q.y, q.w, q.h, '#fffaf0', '#5b4636', 1);
    View.r(c, q.x + q.w / 2 - 3, q.y - 2, 6, 4, '#c0392b');
    View.text(c, '알바 구함', q.x + q.w / 2, q.y + 11, 9, '#c0392b');
    View.text(c, '토·일 4시간', q.x + q.w / 2, q.y + 23, 8, '#3b3540');
    View.text(c, Life.won(Life.JOB.pay), q.x + q.w / 2, q.y + 34, 8, '#3b3540');
    if (!S().seen.job) { c.globalAlpha = .35 + glow * .4; c.strokeStyle = '#ff9a3c'; c.lineWidth = 2; c.strokeRect(q.x - 3, q.y - 3, q.w + 6, q.h + 6); c.globalAlpha = 1; }
  }
  function startJob() {
    var s = S(), sh = Wk.shop, why = Life.jobBlock(s);
    if (why === 'late') { UI.sfx('bad'); return say([me('알바는 오후 3시 전에 와야 받아 준대. 오늘은 늦었어.')]); }
    if (why === 'tired') { UI.sfx('bad'); return say([me('지금 몸으로는 네 시간 못 버텨. 체력이 세 칸은 있어야 해. 좀 쉬고 와야겠다.')]); }
    if (why) return null;
    return Engine.walkTo(200).then(function () {
      s.seen.job = true;
      return say([{ who: 'owner', text: '왔어요? 창고에서 꺼낸 물건을 빈 칸에 채워 줘요. 자리마다 그림이 붙어 있어요.' }]);
    }).then(function () {
      // 진열은 끌기로 하므로 여기서 기다리지 않는다 (마지막 물건을 놓으면 finishJob)
      sh.job = { left: JOB_ITEMS.slice(), held: null, placed: [] };
      G.hand = { x: CRATE.x, y: CRATE.y - 30, tx: SHELF[JOB_ITEMS[0]].x, ty: SHELF[JOB_ITEMS[0]].y - 20, period: 2, t0: G.t };
    });
  }
  function finishJob() {
    var s = S(), sh = Wk.shop;
    G.hand = null;
    return Engine.sleep(.35).then(function () { return Engine.fade(1, .4); }).then(function () {
      var r = Life.sideJob(s);
      sh.job = null;
      return UI.black(['네 시간 뒤']).then(function () { return Engine.fade(0, .4); }).then(function () {
        UI.sfx('coin');
        Engine.puff({ x: G.hero.x, y: 230, icon: 'coin', text: '+' + Life.won(r.pay || 0), px: 1, life: 1.6 });
        return say([{ who: 'owner', text: '수고했어요. 여기 ' + Life.won(Life.JOB.pay) + '.' }, me('허리 끊어지겠다... ' + Life.josa(s.cat, 'subject') + ' 오늘도 혼자 기다렸겠네.')]);
      });
    });
  }
  // 진열대에서 물건을 걷어 낸 빈 칸에, 상자에서 하나씩 끌어다 채운다
  function drawJob(c) {
    var j = Wk.shop.job, t = G.t, next = j.left[0];
    JOB_ITEMS.forEach(function (item) {
      var p = SHELF[item];
      if (j.placed.indexOf(item) >= 0) { drawShopItem(c, item, p.x, p.y); return; }
      c.globalAlpha = item === next ? .35 + (Math.sin(t * 5) * .5 + .5) * .25 : .18;
      drawShopItem(c, item, p.x, p.y);
      c.globalAlpha = 1;
    });
    // 상자
    View.box(c, CRATE.x - 34, CRATE.y - 26, 68, 30, '#c79a63', '#5b4636', 2);
    View.r(c, CRATE.x - 30, CRATE.y - 16, 60, 2, '#a97b47');
    if (next && !(j.held)) drawShopItem(c, next, CRATE.x, CRATE.y - 22, .9);
    if (j.held) drawShopItem(c, j.held.item, j.held.x, j.held.y + 18, 1);
    View.text(c, (JOB_ITEMS.length - j.left.length) + ' / ' + JOB_ITEMS.length, CRATE.x, CRATE.y + 14, 10, '#2f2a33');
    View.shadow(c, G.hero.x, 343, 20);
    View.person(c, G, G.hero.x, 342, 'hoodie', 1, t, 'stand', 2.35);
  }
  function hotJob() {
    var j = Wk.shop.job, next = j.left[0];
    if (!next) return [];
    var slot = SHELF[next];
    return [{ id: 'crate', x: CRATE.x - 34, y: CRATE.y - 60, w: 68, h: 64, glow: true, drag: {
      start: function (d) { j.held = { item: next, x: d.x, y: d.y }; UI.sfx('page'); G.hand = null; },
      move: function (d) { if (j.held) { j.held.x = d.x; j.held.y = d.y; } },
      end: function (d) {
        var h = j.held; j.held = null;
        if (!h) return null;
        if (Math.abs(d.x - slot.x) < 30 && Math.abs(d.y - (slot.y - 18)) < 34) {
          j.placed.push(next); j.left.shift(); UI.sfx('good');
          if (!j.left.length) return finishJob();
        } else UI.sfx('tap');
        return null;
      }
    } }];
  }
  function shop(opts) {
    opts = opts || {};
    var s0 = S(), night = !opts.pro && !!s0 && Life.lateNight(s0);
    Wk.shop = { pro: !!opts.pro, winter: !!opts.pro, night: night, shelf: opts.pro ? PRO_SHELF : SHELF, basket: [], bought: [], leave: false, picked: null, focus: null, asking: false };
    G.hero.x = 120; G.hero.dir = 1; G.hero.tx = null;
    Engine.setScene({ draw: drawShop, hot: hotShop, walk: function (p) { return Wk.shop.asking ? null : Math.max(110, Math.min(230, p.x)); }, place: 'shop' });
    return Engine.fade(0, .35).then(function () { return Engine.walkTo(220); }).then(function () {
      var s = S();
      if (opts.intro) return say(opts.intro);
      var told = null;
      if (told) return say(told);
      if (!opts.pro && s && Life.onShelf(s, 'robot') && !s.seen.newStock) { s.seen.newStock = true; return say([me('새 물건이 들어왔네. 로봇청소기랑 자동 장난감?'), me('편하긴 하겠지만, 내가 직접 하는 것만은 못하겠지.')]); }
      if (jobOpen() && !s.seen.jobPoster) { s.seen.jobPoster = true; return say([me('저게 사장님이 말한 알바 공고구나.')]); }
      if (night && !s.seen.nightShop) { s.seen.nightShop = true; return say([{ who: 'owner', text: '어서 와요. 11시 넘어서는 심야 할증이라 좀 비싸요.' }]); }
      return null;
    }).then(function () {
      if (opts.pro) return Engine.until(function () { return Wk.shop.picked; });
      return Engine.until(function () { return Wk.shop.leave; }).then(function () { return Engine.walkTo(90); });
    }).then(function () { var r = Wk.shop.pro ? Wk.shop.picked : Wk.shop.bought.slice(); return r; });
  }

  return { Wk: Wk, commute: commute, office: office, assembly: assembly, consult: consult, sticker: sticker, workDay: workDay, groupEvening: groupEvening,
    leaveOffice: leaveOffice, overtime: overtime, walkHome: walkHome, street: street, shop: shop, drawOffice: drawOffice, drawShopItem: drawShopItem, SHOPDOOR: SHOPDOOR, EXIT: EXIT };
}());
