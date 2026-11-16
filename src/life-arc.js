/* 둘이라서: 열이틀을 꿰는 사건과 새 손짓.
   기(4/13~15) 둘이라 무겁다: 털, 빠듯한 아침, 새벽 꾹꾹이, 천둥 밤.
   승(4/16~20) 쌓이다가 풀린다: 바닥 친 금요일(4/17, 엄마 문자), 같이 쉬는 주말, 알람이 고장 난 아침(4/20).
   전(4/21~23) 잘될수록 멀어진다: 고양이를 키우는 고객(4/21), 야근(4/22), 자판 위의 고양이(4/23).
   결(4/24) 다시 비: 같은 슈퍼 앞, 같은 우산, 현관에서 기다리는 고양이.
   사건은 꼭 일어나고, 플레이어의 손이 결과만 바꾼다. 값은 Life, 대사는 Story.BEAT, 여기서는 장면과 손짓. */
var Arc = (function () {
  'use strict';
  function S() { return G.s; }
  function say(l) { return UI.say(l); }
  function B() { return Story.BEAT; }

  // ---------- 손짓 도우미 ----------
  function catWalk(x, opts) { var k = G.cat; Home.H.catAct = 'still'; k.pose = 'walk'; return Engine.catTo(x, opts || { y: 336 }).then(function () { k.pose = 'sit'; }); }
  function tapWait(spots) {
    var H = Home.H, pick = null, prev = H.arcHot;
    H.arcHot = function () { return spots.map(function (sp) { var o = {}; for (var k in sp) o[k] = sp[k]; o.tap = function () { pick = sp.id; return null; }; return o; }); };
    return Engine.until(function () { return pick; }).then(function () { H.arcHot = prev || null; return pick; });
  }
  function spent(m, x, y) { if (m) Engine.puff({ x: x || G.hero.x, y: y || 220, icon: 'clock', text: '+' + m + '분', px: 1 }); }

  // ---------- 반짝이는 순간 (사진) ----------
  // 저녁과 주말, 고양이가 가끔 사진 찍고 싶은 얼굴을 한다. 몇 초 안에 누르면 휴대폰에 남는다.
  var M = { on: false, until: 0, next: 0, pose: 'sit', key: '', hint: false, rumble: -1 };
  var POSES = ['sleep', 'groom', 'lookUp', 'purr'];
  function homeNow() {
    var s = S(), h = Home.H;
    return !!s && !h.pro && Life.homeTime(s) && h.mode !== 'night' && !h.closeUp && !h.arcHot && !h.clean && !h.toy && !h.held && !h.lock;
  }
  function catFree() {
    var s = S(), h = Home.H, k = G.cat;
    return !s.hidden && k.visible && !k.walking && k.room === h.room && !h.catAct && !G.drag;
  }
  function tick(dt) {
    var s = S(); if (!s || !G.cat) return;
    var key = s.day + ':' + s.phase;
    if (M.key !== key) { M.key = key; endMoment(); M.next = G.t + 6; }
    // 저녁 8시 반이 넘도록 내 저녁을 안 먹었으면 배에서 꼬르륵
    if (homeNow() && s.phase === 'evening' && s.day > 0 && !s.myMeal && s.minute >= 1230 && M.rumble !== s.day && !UI.busy()) {
      M.rumble = s.day; Engine.puff({ x: G.hero.x, y: G.hero.y - 110, icon: 'rice', px: 2, life: 1.6, rise: 10 });
    }
    if (M.on) {
      if (UI.busy()) M.until += dt;
      if (G.t > M.until || !homeNow() || G.cat.room !== Home.H.room || !G.cat.visible) endMoment();
      return;
    }
    if (G.t < M.next || UI.busy() || G.acting || !homeNow() || !catFree()) return;
    if (s.day === 0 || Life.photosToday(s) >= Life.photoCap(s)) return;
    startMoment();
  }
  function startMoment() {
    var s = S(), k = G.cat;
    M.on = true; M.until = G.t + 7; M.pose = POSES[(s.photos.length + s.day) % POSES.length];
    Home.H.catAct = 'still'; k.tx = null; k.pose = M.pose;
    UI.sfx('purr');
    if (!s.seen.photoHint) {
      s.seen.photoHint = true; M.hint = true; M.until += 8;
      G.hand = { x: k.x + 6, y: k.y - 64, tx: k.x + 6, ty: k.y - 34, period: 1.4, t0: G.t };
      say(B().photo(s));
    }
  }
  function endMoment() {
    if (!M.on) return;
    M.on = false;
    if (M.hint) { G.hand = null; M.hint = false; }
    if (Home.H.catAct === 'still') Home.H.catAct = null;
    M.next = G.t + 20 + Math.random() * 12;
  }
  function momentDraw(c, k) {
    if (!M.on || k.walking) return;
    var t = G.t;
    for (var i = 0; i < 3; i++) {
      var a = t * 1.6 + i * 2.1, q = (Math.sin(t * 5 + i * 2) + 1) / 2;
      View.icon(c, 'sparkle', k.x + Math.cos(a) * 26, k.y - 26 + Math.sin(a) * 16, 1, { alpha: .45 + q * .55 });
    }
    View.icon(c, 'camera', k.x, k.y - 64 + Math.round(Math.sin(t * 4) * 2), 2);
  }
  function photoSpot() {
    if (!M.on) return null;
    var k = G.cat;
    return { id: 'photo', x: k.x - 24, y: k.y - 80, w: 48, h: 82, glow: false, tap: snap };
  }
  function snap() {
    var s = S(), k = G.cat, r = Life.photo(s, M.pose);
    if (!r.ok) { endMoment(); return null; }
    UI.sfx('shutter'); G.flash = .55;
    Engine.puff({ x: k.x, y: k.y - 60, icon: 'camera', text: r.n + '', px: 1, life: 1.2 });
    endMoment();
    return Engine.sleep(.4);
  }

  // ---------- 내 저녁 ----------
  // 부엌 조리대: 삼각김밥(서서 5분)과 가스레인지(차려 먹기 40분, 그날 밤 체력 +1)
  var KITCHEN = { stove: { x: 146, y: 160, w: 54, h: 26 }, rice: { x: 262, y: 178 } };
  function mealOpen() { var s = S(); return homeNow() && s.day > 0 && !Life.eatBlock(s); }
  function drawKitchen(c) {
    var s = S(), h = Home.H; if (!s || h.pro || h.room !== 'living') return;
    var t = G.t, st = KITCHEN.stove;
    if (mealOpen()) View.icon(c, 'rice', KITCHEN.rice.x, KITCHEN.rice.y - 8, 2);
    if (M.cooking) { // 김이 피어오른다
      for (var i = 0; i < 3; i++) { var q = (t * .8 + i / 3) % 1; View.r(c, st.x + 16 + i * 12 + Math.sin(t * 3 + i) * 3, st.y - q * 34, 3, 3, 'rgba(255,255,255,' + (0.7 * (1 - q)).toFixed(2) + ')'); }
    }
  }
  function mealSpots() {
    if (!mealOpen() || Home.H.room !== 'living') return [];
    var st = KITCHEN.stove, ri = KITCHEN.rice, guide = !!Home.H.mealGuide;
    return [
      { id: 'kimbap', x: ri.x - 16, y: ri.y - 24, w: 32, h: 28, chips: [Home.cMin(Life.T.quick)], pulse: guide, tap: function () { return eat('quick'); } },
      { id: 'stove', x: st.x, y: st.y, w: st.w, h: st.h, chips: [Home.cMin(Life.T.cook), Home.cBolt(1)], pulse: guide, tap: function () { return eat('cook'); } }
    ];
  }
  function eat(kind) {
    var s = S(), to = kind === 'cook' ? KITCHEN.stove.x + 30 : KITCHEN.rice.x;
    Home.H.mealGuide = false;
    return Engine.walkTo(to).then(function () {
      var r = Life.eat(s, kind); if (!r.ok) return null;
      G.hero.pose = kind === 'cook' ? 'back' : 'front';
      if (kind === 'cook') M.cooking = true;
      UI.sfx('tap');
      return Engine.sleep(kind === 'cook' ? 1.6 : .7).then(function () {
        M.cooking = false; G.hero.pose = null; spent(r.minutes, to, 160);
        if (r.together) Engine.puff({ x: G.cat.x, y: G.cat.y - 50, icon: 'heart', px: 1, life: 1.2 });
      });
    });
  }
  // 집 안에서 늘 더해지는 자리 (사진 자리는 Home.hot이 고양이 자리와 바꿔 끼운다)
  function homeSpots(room) {
    if (!homeNow()) return [];
    return room === 'living' ? mealSpots() : [];
  }

  // ---------- 새벽 꾹꾹이 ----------
  // 같이 잔 밤 몇 번, 새벽 다섯 시에 얼굴을 밟는다. 쓰다듬어 받아 주거나, 이불을 덮어쓴다.
  async function knead() {
    var s = S(), H = Home.H, k = G.cat;
    if (!Life.kneadNight(s)) return;
    H.mode = 'night'; H.inBed = true; H.awake = true; H.closeUp = null;
    Home.enter('bedroom', { mode: 'night' });
    G.hero.visible = false; H.door = 1;
    k.visible = true; k.room = 'bedroom'; H.catAct = 'still'; k.x = 84; k.y = 262; k.dir = -1; k.pose = 'rub';
    await Engine.fade(0, .5);
    UI.sfx('meow');
    await say(B().knead(s));
    var first = !s.seen.kneadHint;
    if (first) { s.seen.kneadHint = true; G.outlineAll = true; setTimeout(function () { G.outlineAll = false; }, 2600); }
    var pick = await tapWait([
      { id: 'kneadPush', x: 120, y: 262, w: 100, h: 56, pulse: true },
      { id: 'kneadPet', x: k.x - 28, y: k.y - 46, w: 56, h: 50, pulse: true }
    ]);
    Life.knead(s, pick === 'kneadPet' ? 'pet' : 'push');
    if (pick === 'kneadPet') { k.pose = 'purr'; UI.sfx('purr'); Engine.puff({ x: k.x, y: k.y - 50, icon: 'heart', px: 1, life: 1.2 }); await say(B().kneadPet(s)); }
    else { k.pose = 'sit'; H.awake = false; await say(B().kneadPush(s)); }
    await Engine.fade(1, .6);
    H.catAct = null; H.awake = false;
  }

  // ---------- 지점 ----------
  // 퇴근 전에 선배나 지점장님이 하는 한마디 (날마다 한 번)
  function officeLines(s) {
    var key = 'beatOffice' + s.day;
    if (s.seen[key]) return [];
    var lines = Life.day(s).storm ? B().storm : Life.day(s).dinner ? B().friday(s) : [];
    if (lines.length) s.seen[key] = true;
    return lines;
  }
  function clearOverlay() { G.overlay = null; }
  // 4/17 금요일 저녁: 동기들의 저녁 약속
  function dinnerOffer() {
    var s = S(); if (!Life.day(s).dinner || s.out) return Promise.resolve();
    var m = B().dinnerText;
    return UI.phoneWait({ from: m.from, time: m.time, preview: m.preview, body: m.body, replies: [m.yes, m.no] }, '5:52').then(function (reply) {
      var r = Life.dinner(s, reply === 0);
      if (r && r.go) { UI.sfx('coin'); return say([{ who: 'narr', text: '동기 친구와 여행자보험을 계약했다. 집에는 9시 반이 넘어서 들어갔다.' }]); }
      return null;
    });
  }

  // ---------- 집에 돌아온 저녁 ----------
  async function homeBeats() {
    var s = S(), d = Life.day(s), k = G.cat, H = Home.H;
    // 4/13: 나도 저녁을 먹어야 한다
    if (s.day === 1 && !s.seen.mealIntro) { s.seen.mealIntro = true; H.mealGuide = true; await say(B().meal); }
    // 4/22 야근하고 온 밤: 현관 매트에서 잠든 고양이
    if (d.overtime && s.group === 'go' && !s.seen.waitedAsleep) {
      s.seen.waitedAsleep = true;
      if (!s.hidden) { k.visible = true; k.room = 'living'; k.x = 92; k.y = 336; k.pose = 'sleep'; H.catAct = 'still'; }
      await say(B().waitedAsleep(s));
      H.catAct = null;
    } else if (s.out === 'dinner' && !s.seen.lateHome) { s.seen.lateHome = true; await say(B().lateHome(s)); }
    // 4/17 밤: 엄마 문자
    if (d.mom && !s.seen.momText) {
      s.seen.momText = true;
      var m = B().momText;
      await UI.phoneWait({ from: m.from, time: m.time, preview: m.preview, body: m.body, replies: m.replies }, '9:40');
      var lines = B().momAfter(s);
      await say([lines[0]]);
      if (!s.hidden) { await catWalk(Math.min(540, G.hero.x + 30)); k.dir = -1; k.pose = 'rub'; UI.sfx('purr'); }
      await say([lines[1]]);
      H.catAct = null;
    }
    // 4/23: 발표 준비, 자판 위의 고양이
    if (d.eve && !s.lid) await lastPrep();
  }
  async function lastPrep() {
    var s = S(), H = Home.H, k = G.cat, P = Home.P;
    await say(B().prep(s));
    await Engine.fade(1, .3);
    H.closeUp = null;
    Home.enter('bedroom', { mode: 'evening', heroX: P.laptop.x - 6, catRoom: 'bedroom', catX: 470, catY: 336 });
    G.hero.dir = 1; G.hero.pose = 'study';
    k.visible = !s.hidden;
    await Engine.fade(0, .3);
    await Engine.sleep(.8);
    if (s.hidden) { Life.lastPrep(s, 'work'); s.minute += Life.cost(s, Life.T.prep); G.hero.pose = null; return; }
    H.catAct = 'still'; k.pose = 'walk';
    await Engine.catTo(P.laptop.x + 22, { y: P.laptop.y + 8 });
    k.pose = 'sit'; k.dir = -1; UI.sfx('tap');
    await say(B().onKeys(s));
    if (!s.seen.prepHint) { s.seen.prepHint = true; G.outlineAll = true; setTimeout(function () { G.outlineAll = false; }, 2600); }
    var pick = await tapWait([
      { id: 'closeLid', x: P.laptop.x - 34, y: P.laptop.y - 32, w: 36, h: 30, pulse: true },
      { id: 'liftCat', x: k.x - 22, y: k.y - 44, w: 46, h: 48, pulse: true }
    ]);
    if (pick === 'liftCat') {
      Life.lastPrep(s, 'work');
      await catWalk(470, { y: 336 });
      k.dir = 1; k.pose = 'sit';
      await say(B().prepWork(s));
      var m = Life.cost(s, Life.T.prep); s.minute += m; spent(m, P.laptop.x, 160);
    } else {
      Life.lastPrep(s, 'lid');
      UI.sfx('page'); G.hero.pose = null;
      await say(B().prepLid(s));
      await catWalk(400, { y: 336 });
      k.pose = 'purr'; UI.sfx('purr'); Engine.puff({ x: k.x, y: k.y - 50, icon: 'heart', px: 1, life: 1.2 });
      s.minute += Life.cost(s, Life.T.play); spent(Life.T.play, 400, 240);
    }
    G.hero.pose = null; H.catAct = null;
  }

  // ---------- 4/24: 다시, 비 ----------
  async function rainHome() {
    var s = S(), st = { open: 0, opened: false };
    G.hero.x = 40; G.hero.dir = 1; G.hero.tx = null; G.hero.visible = true;
    Work.street({
      dusk: true,
      draw: function (c) {
        var h = G.hero, t = G.t;
        PixelArt.rain(c, { x: 0, y: 0, w: 640, h: 360 }, t, 1);
        View.shadow(c, h.x, 343, 20);
        View.person(c, G, h.x, 342, 'suit', h.walking ? h.dir : 1, t, h.walking ? (st.opened ? 'umbrellaWalk' : 'walk') : (st.opened ? 'umbrella' : 'stand'), 2.35);
        if (st.opened || st.open > 0) PixelArt.umbrella(c, h.x + (h.walking ? 6 : 16), h.walking ? 262 : 258 + (1 - st.open) * 30, 0, View.HERO_PX);
        else View.r(c, h.x + 14, 270, 3, 44, '#3a3440'); // 접힌 우산
      },
      hot: function () {
        if (st.opened || G.hero.walking || !st.ready) return [];
        var x = G.hero.x + 16;
        return [{ id: 'umbrella', x: x - 30, y: 220, w: 60, h: 110, drag: {
          start: function (d) { st.y0 = d.y; G.hand = null; },
          move: function (d) { st.open = Math.max(0, Math.min(1, (st.y0 - d.y) / 60)); },
          end: function () { if (st.open > .6) { st.open = 1; st.opened = true; UI.sfx('tap'); } else st.open = 0; return null; }
        } }];
      },
      walk: null
    });
    await Engine.fade(0, .6);
    UI.sfx('rain');
    await Engine.walkTo(430, { speed: 90 });
    G.hero.speed = 170;
    await say(B().rain(s));
    st.ready = true;
    G.hand = { x: G.hero.x + 16, y: 300, tx: G.hero.x + 16, ty: 240, period: 2, t0: G.t };
    await Engine.until(function () { return st.opened; });
    G.hand = null;
    await Engine.sleep(.5);
    await Engine.walkTo(640, { speed: 110 });
    G.hero.speed = 170;
    await Engine.fade(1, .5);
    // 집: 기다리는 고양이
    var H = Home.H, k = G.cat, close = s.hearts >= 3;
    H.mode = 'evening'; H.inBed = false; H.closeUp = null; H.catAct = 'still';
    Home.enter('living', { mode: 'evening', heroX: 60, catRoom: 'living', catX: close ? 150 : 470 });
    k.visible = true; k.y = close ? 336 : 228; k.pose = 'sit'; k.dir = -1;
    G.hero.dir = 1;
    await Engine.fade(0, .5);
    await Engine.walkTo(110);
    if (close) { k.pose = 'rub'; UI.sfx('purr'); }
    await say(B().home(s));
    H.catAct = null;
    await Engine.fade(1, .8);
  }

  // ---------- 엔딩의 사진첩 ----------
  // 고객 메모 캡처(메일을 읽은 날)와 내가 찍은 고양이 사진을 날짜 순으로
  function album(s) {
    var shots = [];
    s.ledger.forEach(function (t) { if (Life.DAYS[t.day].kind === 'work' && s.results.some(function (r) { return r.day === t.day; })) shots.push({ day: t.day, memo: true }); });
    (s.photos || []).forEach(function (p) { shots.push({ day: p.day, pose: p.pose }); });
    shots.sort(function (a, b) { return a.day - b.day || (a.memo ? -1 : 1); });
    return shots;
  }
  function drawShot(cv, shot) {
    var c = cv.getContext('2d'), w = cv.width, h = cv.height;
    c.imageSmoothingEnabled = false;
    if (shot.memo) {
      c.fillStyle = '#f4f6fb'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#5f86c8'; c.fillRect(0, 0, w, 10);
      c.fillStyle = '#c8cedb'; for (var i = 0; i < 5; i++) c.fillRect(8, 18 + i * 10, w - 16 - (i % 2) * 14, 4);
      return;
    }
    var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f7e3c4'); g.addColorStop(1, '#d9b994');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,240,200,.6)'; c.fillRect(w * .62, 0, w * .3, h * .6); // 창으로 드는 볕
    c.save(); c.translate(w / 2, h - 8); View.cat(c, G, 0, 0, shot.day % 2 ? 1 : -1, 0, shot.pose || 'sit', 1.6); c.restore();
  }

  return {
    tick: tick, momentDraw: momentDraw, homeSpots: homeSpots, drawKitchen: drawKitchen, photoSpot: photoSpot,
    knead: knead, officeLines: officeLines, clearOverlay: clearOverlay, dinnerOffer: dinnerOffer, homeBeats: function () { // 장면이 끝날 때까지 다른 물건은 눌리지 않게 한다
      var H = Home.H, none = function () { return []; }; H.arcHot = none; G.drag = null; H.held = null; G.hero.tx = null;
      return homeBeats().then(function () { if (H.arcHot === none) H.arcHot = null; }, function (e) { if (H.arcHot === none) H.arcHot = null; throw e; });
    }, lastPrep: lastPrep,
    rainHome: rainHome, album: album, drawShot: drawShot, KITCHEN: KITCHEN,
    moment: function () { return M.on ? { pose: M.pose, until: M.until } : null; }
  };
}());
