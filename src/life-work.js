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
    if (Wk.dark) View.nightTint(c, .35);
  }
  var SEATS = [[96, 0, false], [203, 1, false], [426, 2, true], [540, 3, true]];
  function commute(evening) {
    G.hero.x = 300; G.hero.tx = null; Wk.dark = !!evening;
    Engine.setScene({ draw: drawTrain, place: 'train' });
    return Engine.fade(0, .35).then(function () { return Engine.sleep(1.4); }).then(function () { return Engine.fade(1, .35); });
  }

  // ---------- 지점 ----------
  function drawOffice(c) {
    var s = S(), t = G.t;
    View.bg(c, G, 'office');
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
      if (p.hero && s.fur > 0) Home.furOn(c, p.x, 336 - 96, s.fur, 1);
    });
    (Wk.look.marks || []).forEach(function (m) { View.icon(c, 'bang', m, 228 + Math.sin(t * 8) * 2, 1); });
    if (night) { View.nightTint(c, .45); View.lampGlow(c, 470, 150, 160, .25); }
    if (Wk.chart) drawChartBig(c);
  }
  function office(opts) {
    opts = opts || {};
    Wk.dark = !!opts.night; Wk.look = {};
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
      return say(Story.assembly(s, late).map(function (l) { return { who: l.who, text: l.text }; }));
    }).then(function () { Wk.look = {}; });
  }
  // 털 때문에 첫 계약을 놓친 날: 상담이 끝난 뒤에야 선배가 이유를 알려 준다
  function seniorLesson() {
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
      return say(Story.senior(s));
    }).then(function () { Wk.look = {}; s.seen.rollerTip = true; });
  }
  // 목표 8건을 채운 순간
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
  var TRAY_BASE = ['dental', 'car', 'travel', 'home', 'pet', 'price', 'contract'];
  function trayKinds(p) { var k = TRAY_BASE.slice(); if (p.evening) k.splice(5, 0, 'group'); return k; }
  function trayPos(kinds, i) { var n = kinds.length, gap = Math.min(64, 520 / n); return { x: 320 - (n - 1) * gap / 2 + i * gap, y: 312 }; }
  var DROP = { x: 330, y: 20, w: 250, h: 250 };
  function drawConsult(c) {
    var k = Wk.consult, s = S(), t = G.t;
    View.bg(c, G, 'office');
    if (k.p.evening || Wk.dark) View.nightTint(c, .45);
    c.fillStyle = 'rgba(30,26,34,.35)'; c.fillRect(0, 0, 640, 360);
    // 탁자와 두 사람 (옆모습)
    View.seated(c, G, 196, 262, 'suit', k.heroFrame || 0, 2.5, null, false);
    if (s.fur > 0 && k.p.fur) Home.furOn(c, 198, 262 - 84, s.fur, 1); // 무릎 위 정장 소매와 가슴께
    if (k.peer) View.person(c, G, 110, 268, 'peer', 1, t, 'stand', 2.2);
    var cl = Story.CLIENT[k.id];
    if (!k.gone) View.seated(c, G, 446 + (k.shake ? Math.sin(t * 40) * 3 : 0), 262, cl.look, 0, 2.5, cl.tint, false);
    View.box(c, 250, 206, 140, 10, '#b98a5f', '#5b4636', 2); View.r(c, 262, 216, 8, 46, '#5b4636'); View.r(c, 370, 216, 8, 46, '#5b4636');
    // 앞 책상 (안내서 자리)
    View.box(c, 40, 270, 560, 96, '#c99b6c', '#5b4636', 3); View.r(c, 46, 274, 548, 5, '#ddb487');
    if (!k.gone && !k.st.done) {
      // 말풍선: 지금 원하는 것
      var want = Life.wants(k.p, k.st);
      if (want === k.p.need && !k.p.prepared && Story.HINT[want]) {
        View.bubble(c, 388, 38, 124, 76, 448);
        View.text(c, Story.HINT[want].bubble, 450, 80, 14, k.blink ? 'rgba(47,42,51,.4)' : '#2f2a33');
      } else {
        View.bubble(c, 404, 38, 92, 76, 448);
        View.icon(c, want, 450, 76, 3, { alpha: k.blink ? .4 : 1 });
      }
      if (k.p.timer) { // 남은 시간
        var left = Math.max(0, k.left / k.p.timer);
        View.disc(c, 488, 46, 11, '#2f2a33'); View.disc(c, 488, 46, 9, '#fffaf0');
        c.fillStyle = left < .35 ? '#e0574f' : '#ffb05a'; c.beginPath(); c.moveTo(488, 46); c.arc(488, 46, 8, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); c.closePath(); c.fill();
      }
    }
    if (!k.gone) PixelIcons.mood(c, 514, 140, k.st.mood, 11);
    // 안내서 묶음
    var kinds = trayKinds(k.p);
    kinds.forEach(function (kind, i) {
      if (k.held && k.held.kind === kind) return;
      var pos = trayPos(kinds, i), top = k.p.prepared && kind === k.p.need;
      View.brochure(c, kind, pos.x, pos.y - (top ? 10 : 0), .95, { blur: k.p.blur || k.p.blink, t: t, top: top });
    });
    if (k.held) View.brochure(c, k.held.kind, k.held.x, k.held.y, 1.05, { lift: true, blur: k.p.blur || k.p.blink, t: t });
    // 체력 0: 하품하느라 눈앞이 깜빡인다
    if (k.p.blink) { var ph = (t % 3.6); if (ph < .35) { c.fillStyle = 'rgba(10,8,14,' + (ph < .17 ? ph / .17 : (.35 - ph) / .18) * .92 + ')'; c.fillRect(0, 0, 640, 360); } }
  }
  function hotConsult() {
    var k = Wk.consult; if (!k || k.st.done || k.gone || !k.ready) return [];
    var kinds = trayKinds(k.p);
    return kinds.map(function (kind, i) {
      var pos = trayPos(kinds, i);
      return {
        id: 'b-' + kind, x: pos.x - 24, y: pos.y - 32, w: 48, h: 62, glow: true,
        drag: {
          start: function (d) { k.held = { kind: kind, x: d.x, y: d.y }; UI.sfx('page'); if (G.hand && G.hand.tutorial) G.hand = null; },
          move: function (d) { if (k.held) { k.held.x = d.x; k.held.y = d.y; } },
          end: function (d) {
            var h = k.held; k.held = null;
            if (!h || !inside(d, DROP)) return null;
            k.drop = kind;
            return null;
          },
          cancel: function () { k.held = null; }
        }
      };
    });
  }
  function tickConsult(dt) {
    var k = Wk.consult; if (!k || !k.ready || k.st.done) return;
    if (UI.busy() || G.drag) return;
    if (k.p.timer) { k.left -= dt; if (k.left <= 0) { k.left = k.p.timer; k.timeout = true; } }
    if (k.p.blink && (G.t % 3.6) < .02) UI.sfx('yawn');
  }
  function consult(id, opts) {
    opts = opts || {};
    var s = S(), p = Life.plan(s, id), st = Life.consult(p), k;
    k = Wk.consult = { id: id, p: p, st: st, left: p.timer, ready: false, gone: !!p.leaves, peer: !!p.tutorial, heroFrame: 0 };
    Engine.setScene({ draw: drawConsult, hot: hotConsult, tick: tickConsult, place: 'consult' });
    var CAUSE_ICON = { late: 'clock', sneeze: 'sneeze', catLover: 'heart', fur: 'fur', prepared: 'mail', yawn: 'zzz' };
    return Engine.fade(0, .35).then(function () {
      if (p.leaves) return say([me(Story.CAUSE[p.reasons[0].key] || Story.CAUSE.lateLeft)]).then(function () { return Life.finish(s, p, st); });
      return say([client(id, Story.CONSULT.greet), client(id, (Story.HINT[p.need] || {}).say || Story.CONSULT.greet)]).then(function () {
        // 시작할 때 생기는 일과 그 이유를 한 줄씩
        return p.reasons.reduce(function (pr, r) {
          return pr.then(function () {
            var ic = CAUSE_ICON[r.key];
            if (r.key === 'sneeze') UI.sfx('sneeze');
            if (r.key === 'yawn') { UI.sfx('yawn'); Engine.puff({ x: 210, y: 150, icon: ic, px: 2, life: 1.6 }); }
            else Engine.puff({ x: 456, y: 150, icon: ic, px: 2, life: 1.6 });
            return say([me(Story.CAUSE[r.key === 'sneeze' && !s.seen.furLost ? 'sneezeFirst' : r.key])]);
          });
        }, Promise.resolve());
      }).then(function () {
        if (!p.tutorial) return null;
        return say(Story.TUTORIAL).then(function () {
          var kinds = trayKinds(p), i = kinds.indexOf(p.need), pos = trayPos(kinds, i);
          G.hand = { x: pos.x, y: pos.y - 6, tx: 450, ty: 150, period: 2.2, t0: G.t, tutorial: true };
        });
      }).then(function () { k.ready = true; k.left = p.timer; return loop(); });
    });
    function loop() {
      return Engine.until(function () { return k.drop || k.timeout; }).then(function () {
        if (k.timeout) {
          k.timeout = false;
          Life.timeout(p, st);
          UI.sfx('bad');
          return say([client(id, Story.CONSULT.slow)]).then(next);
        }
        var kind = k.drop; k.drop = null;
        var r = Life.answer(p, st, kind);
        k.left = p.timer;
        if (!r.ok) {
          UI.sfx('bad'); k.shake = true;
          return Engine.sleep(.35).then(function () { k.shake = false; return say([client(id, Story.CONSULT.wrong), client(id, Story.CONSULT.lost)]); })
            .then(function () { k.gone = true; return done(); });
        }
        UI.sfx('good'); k.heroFrame = 1;
        setTimeout(function () { k.heroFrame = 0; }, 500);
        if (!r.done) return next();
        if (r.signed) return say([client(id, Story.CONSULT.signed)]).then(done);
        return say([client(id, Story.CONSULT.lost)]).then(function () { k.gone = true; return done(); });
      });
    }
    function next() { return st.done ? done() : loop(); }
    function done() {
      G.hand = null;
      var res = Life.finish(s, p, st);
      if (!res.signed) return say([me(Story.CAUSE.lost)]).then(function () { return res; });
      return res;
    }
  }

  // ---------- 하루 지점 일정 ----------
  // 지점에 있는 동안 위쪽 시계만 상담 시각으로 옮긴다 (규칙 계산에는 쓰지 않는다)
  var CONSULT_AT = [600, 840, 960];
  function workClock(m) { var s = S(); if (s && s.phase === 'work') s.minute = Math.max(s.minute, m); }
  function workDay() {
    var s = S(), ids = Life.clientsOn(s.day), results = [];
    return Engine.fade(1, .3).then(assembly).then(function () {
      return ids.reduce(function (pr, id, i) {
        return pr.then(function () { return Engine.fade(1, .3); }).then(function () { workClock(CONSULT_AT[Math.min(i, 2)]); return consult(id); }).then(function (res) {
          results.push(res);
          var furLost = !res.signed && s.events.some(function (e) { return e.key === 'furLost' && e.day === s.day && e.id === res.id; });
          if (furLost) return Engine.fade(1, .3).then(seniorLesson).then(function () { return Engine.fade(1, .3); });
          if (!res.signed) return Engine.fade(1, .3);
          return Engine.fade(1, .3).then(function () { office(); return Engine.fade(0, .3); }).then(function () { return sticker(res.pet ? 2 : 1); })
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
  var EXIT = { x: 554, y: 66, w: 72, h: 174 };
  function leaveOffice() {
    var s = S(), first = Life.day(s).first, out = false, night = Wk.dark;
    office({ night: night });
    Wk.lead = { x: 300, dir: 1 }; Wk.peer = { x: 150, dir: 1 };
    G.hero.x = 470; G.hero.dir = 1;
    Life.leaveOffice(s);
    function talk(who) {
      var p = Wk[who];
      return Engine.walkTo(p.x + 56).then(function () { G.hero.dir = -1; p.dir = 1; return say(Story.officeTip(s, who)); });
    }
    Engine.setScene({
      draw: drawOffice, place: 'office',
      walk: function (p) { return Math.max(60, Math.min(600, p.x)); },
      hot: function () {
        var list = [];
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
      if (first) G.guide = { x: EXIT.x + EXIT.w / 2, y: EXIT.y - 4, dir: 'down' };
      return Engine.until(function () { return out; });
    }).then(function () { G.guide = null; G.hero.pose = null; return Engine.fade(1, .3); });
  }

  // ---------- 거리 ----------
  var SHOPDOOR = { x: 452, y: 168, w: 112, h: 128 };
  function drawStreet(c) {
    var st = Wk.street, t = G.t;
    View.bg(c, G, st.winter ? 'streetWinter' : 'streetSpring');
    if (st.winter) PixelArt.rain(c, { x: 0, y: 0, w: 640, h: 360 }, t, 1);
    if (st.dusk) { c.fillStyle = 'rgba(255,150,90,.16)'; c.fillRect(0, 0, 640, 360); View.nightTint(c, .18); }
    if (st.draw) st.draw(c);
    else {
      View.shadow(c, G.hero.x, 343, 20);
      View.person(c, G, G.hero.x, 342, G.s && G.s.wearing === 'suit' ? 'suit' : 'hoodie', G.hero.walking ? G.hero.dir : G.hero.dir, t, G.hero.walking ? 'walk' : 'stand', 2.35);
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
    sand: { x: 276, y: 228 }, feeder: { x: 372, y: 228 }, toy: { x: 470, y: 228 }, tower: { x: 540, y: 330 }
  };
  var PRO_SHELF = { charcoal: { x: 292, y: 160, price: 12000 }, dry: { x: 382, y: 160, price: 12000 }, wet: { x: 470, y: 160, price: 15000 } };
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
  }
  function itemTop(item) { return item === 'tower' ? 96 : item === 'charcoal' ? 52 : item === 'toy' ? 20 : 38; }
  function descKey(item) { var sh = Wk.shop; return sh.pro && (item === 'dry' || item === 'wet') ? (item === 'dry' ? 'proDry' : 'proWet') : item; }
  // 지금 설명을 보여 줄 물건: 마우스를 댄 것, 손가락이면 한 번 누른 것
  function focusItem() {
    var sh = Wk.shop, hv = G.hover && G.hover.id;
    if (hv && hv.indexOf('shelf-') === 0 && G.pointerType === 'mouse') return hv.slice(6);
    return sh.focus || null;
  }
  // 꼬리표: 위에 이름, 아래에 값 (돈이 모자라면 값이 빨갛다)
  function tag(c, name, price, x, y, red) {
    c.font = "9px 'NeoDunggeunmo', monospace";
    var w = Math.max(c.measureText(name).width, c.measureText(Life.won(price)).width) + 8;
    View.box(c, x - w / 2, y, w, 24, red ? '#ffe3dc' : '#fffaf0', '#5b4636', 1);
    View.text(c, name, x, y + 7, 9, '#2f2a33');
    View.text(c, Life.won(price), x, y + 17, 9, red ? '#c0392b' : '#5b4636');
  }
  function drawDesc(c, item) {
    var sh = Wk.shop, p = sh.shelf[item], lines = Story.ITEM_DESC[descKey(item)] || [], price = p.price || Life.SHOP[item].price;
    c.font = "11px 'NeoDunggeunmo', monospace";
    var w = Math.max(150, Math.ceil(Math.max.apply(null, lines.map(function (l) { return c.measureText(l).width; }))) + 22);
    var h = 34 + lines.length * 17, x = Math.max(8, Math.min(632 - w, p.x - w / 2)), y = p.y - itemTop(item) - h - 8;
    if (y < 8) y = p.y + 30;
    View.box(c, x, y, w, h, '#fffaf0', '#2f2a33', 2);
    View.text(c, Story.ITEM[item], x + 10, y + 17, 13, '#2f2a33', 'left');
    View.text(c, Life.won(price), x + w - 10, y + 17, 12, '#c0392b', 'right');
    lines.forEach(function (l, i) { View.text(c, l, x + 10, y + 36 + i * 17, 11, '#3b3540', 'left'); });
  }
  function drawShop(c) {
    var sh = Wk.shop, s = S(), t = G.t;
    View.bg(c, G, 'shop');
    if (sh.winter) { c.fillStyle = 'rgba(40,60,90,.12)'; c.fillRect(0, 0, 640, 360); }
    var wallet = sh.pro ? G.pro.wallet : s.wallet, focus = focusItem();
    Object.keys(sh.shelf).forEach(function (item) {
      var p = sh.shelf[item], price = p.price || Life.SHOP[item].price;
      if (!sh.pro && Life.SHOP[item].once && s.owned[item] && sh.basket.indexOf(item) < 0) return;
      if (sh.basket.indexOf(item) >= 0 && Life.SHOP[item] && Life.SHOP[item].once) return;
      var lift = item === focus ? -3 - Math.abs(Math.sin(t * 5)) * 2 : 0;
      drawShopItem(c, item, p.x, p.y + lift, item === focus ? 1.08 : 1);
      tag(c, Story.ITEM[item], price, p.x, p.y + 3, wallet < price);
    });
    // 고른 물건은 계산대 위에 올려 둔다 (누르면 다시 진열대로)
    sh.basket.forEach(function (item, i) { var b = basketPos(i); drawShopItem(c, item, b.x, b.y, .62); });
    View.shadow(c, G.hero.x, 343, 20);
    View.person(c, G, G.hero.x, 342, sh.pro ? 'hoodie' : (s.wearing === 'suit' ? 'suit' : 'hoodie'), G.hero.walking ? G.hero.dir : -1, t, G.hero.walking ? 'walk' : 'stand', 2.35);
    if (focus && sh.shelf[focus]) drawDesc(c, focus);
  }
  function basketPos(i) { return { x: 500 + (i % 6) * 22, y: 246 - Math.floor(i / 6) * 14 }; }
  function hotShop() {
    var sh = Wk.shop, s = S(), list = [];
    Object.keys(sh.shelf).forEach(function (item) {
      var p = sh.shelf[item], price = p.price || Life.SHOP[item].price;
      if (!sh.pro && Life.SHOP[item].once && (s.owned[item])) return;
      var w = item === 'tower' ? 54 : 46, h = itemTop(item) + 6;
      list.push({ id: 'shelf-' + item, x: p.x - w / 2, y: p.y - h, w: w, h: h + 28, tap: function () {
        // 손가락: 처음 누르면 설명만, 한 번 더 누르면 산다. 마우스: 대면 설명, 누르면 산다.
        if (G.pointerType !== 'mouse' && sh.focus !== item) { sh.focus = item; UI.sfx('tap'); return null; }
        sh.focus = null;
        return buy(item, price);
      } });
    });
    sh.basket.forEach(function (item, i) { var b = basketPos(i); list.push({ id: 'basket-' + i, x: b.x - 11, y: b.y - 30, w: 22, h: 32, tap: function () { return unbuy(item); } }); });
    list.push({ id: 'exit', x: 14, y: 44, w: 152, h: 196, tap: function () { sh.leave = true; } });
    return list;
  }
  function buy(item, price) {
    var sh = Wk.shop, s = S(), p = sh.shelf[item];
    return Engine.walkTo(Math.max(150, Math.min(230, p.x - 60))).then(function () {
      if (sh.pro) {
        if (G.pro.wallet < price) { UI.sfx('bad'); return say([me('돈이 모자라.')]); }
        sh.picked = item; return null;
      }
      var r = Life.buy(s, item);
      if (!r.ok) { UI.sfx('bad'); return r.why === 'money' ? say([me('돈이 모자라.')]) : null; }
      UI.sfx('spend'); sh.basket.push(item);
      return null;
    });
  }
  function unbuy(item) {
    var sh = Wk.shop, s = S(), r = Life.unbuy(s, item);
    if (!r.ok) return null;
    UI.sfx('tap'); sh.basket.splice(sh.basket.indexOf(item), 1);
    return null;
  }
  function shop(opts) {
    opts = opts || {};
    Wk.shop = { pro: !!opts.pro, winter: !!opts.pro, shelf: opts.pro ? PRO_SHELF : SHELF, basket: [], leave: false, picked: null, focus: null };
    G.hero.x = 120; G.hero.dir = 1; G.hero.tx = null;
    Engine.setScene({ draw: drawShop, hot: hotShop, walk: function (p) { return Math.max(110, Math.min(230, p.x)); }, place: 'shop' });
    return Engine.fade(0, .35).then(function () { return Engine.walkTo(220); }).then(function () {
      if (opts.pro) return Engine.until(function () { return Wk.shop.picked; });
      return Engine.until(function () { return Wk.shop.leave; }).then(function () { return Engine.walkTo(90); });
    }).then(function () { var r = Wk.shop.pro ? Wk.shop.picked : Wk.shop.basket.slice(); return r; });
  }

  return { Wk: Wk, commute: commute, office: office, assembly: assembly, consult: consult, sticker: sticker, workDay: workDay, groupEvening: groupEvening,
    leaveOffice: leaveOffice, walkHome: walkHome, street: street, shop: shop, drawOffice: drawOffice, drawShopItem: drawShopItem, SHOPDOOR: SHOPDOOR, EXIT: EXIT };
}());
