/* 둘이라서: 한 달을 꿰는 사건과 새 손짓.
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
  // 책상 위로 폴짝 (또는 바닥으로): 짧은 포물선
  async function hop(x, y) {
    var k = G.cat, x0 = k.x, y0 = k.y, t0 = G.t, dur = .45;
    k.pose = 'jump'; k.dir = x >= x0 ? 1 : -1;
    while (G.t - t0 < dur) {
      var q = (G.t - t0) / dur;
      k.x = x0 + (x - x0) * q; k.y = y0 + (y - y0) * q - Math.sin(q * Math.PI) * 34;
      await Engine.sleep(.016);
    }
    k.x = x; k.y = y; k.pose = 'sit';
  }
  function tapWait(spots) {
    var H = Home.H, pick = null, prev = H.arcHot;
    H.arcHot = function () { return spots.map(function (sp) { var o = {}; for (var k in sp) o[k] = sp[k]; o.tap = function () { pick = sp.id; return null; }; return o; }); };
    return Engine.until(function () { return pick; }).then(function () { H.arcHot = prev || null; return pick; });
  }
  function spent(m, x, y) { if (m) Engine.puff({ x: x || G.hero.x, y: y || 220, icon: 'clock', text: '+' + m + '분', px: 1 }); }

  // ---------- 사진으로 남기고 싶은 순간 ----------
  // 하루에 갈래마다 한 번, 고양이가 사진으로 남기고 싶은 자리에 간다. 고양이를 누르면 휴대폰 카메라가 열린다.
  //   suit: 출근한 날 저녁, 침실. 벗어 둔 정장 위에 웅크린다 (그동안 옷걸이의 정장은 침대 위에 있다).
  //   sun: 쉬는 날 낮 11시~4시, 거실. 창 아래 소파의 볕에서 배를 드러낸다.
  //   box: 엄마 택배를 연 날과 그다음 날, 거실. 비워 둔 상자에 들어간다.
  // 그림이 오기 전까지 고양이 자리는 회색 상자와 이름표로 둔다. 카메라는 이 순간이 아니어도 집에서는 언제든 열 수 있다.
  var M = { on: null, ready: false, shot: false, until: 0, next: 0, key: '', hint: false, rumble: -1 };
  var SPOT = {
    suit: { room: 'bedroom', x: 128, y: 266, floor: 214, w: 80, h: 34, label: '정장 위 고양이' },
    sun: { room: 'living', x: 468, y: 228, floor: 468, w: 78, h: 34, label: '볕 쬐는 고양이' },
    box: { room: 'living', x: 512, y: 336, floor: 490, w: 56, h: 40, label: '상자 속 고양이' }
  };
  var BOX = { x: 484, y: 300, w: 56, h: 36 }; // 비워 둔 상자 (고양이가 없을 때)
  function ph(c, x, y, w, h, label) {
    View.box(c, x, y, w, h, '#c9c6c0', '#55505a', 2);
    if (label) View.text(c, label, x + w / 2, y + h / 2 + 4, 10, '#55505a', 'center');
  }
  function atHome() { return G.place === 'living' || G.place === 'bedroom'; } // 집 밖(지도, 동네)에 나가 있지 않다
  function homeNow() {
    var s = S(), h = Home.H;
    return !!s && !h.pro && Life.homeTime(s) && h.mode !== 'night' && !h.closeUp && !h.arcHot && !h.clean && !h.toy && !h.held && !h.lock && atHome();
  }
  function catFree() {
    var s = S(), h = Home.H, k = G.cat;
    return !s.hidden && k.visible && !k.walking && k.room === h.room && !h.catAct && !G.drag;
  }
  function boxDay(s) { return s.box !== null && s.box !== undefined && (s.day === s.box || s.day === s.box + 1); }
  // 지금 이 방에서 일어날 수 있는 순간 (그날 이미 지나간 갈래는 다시 오지 않는다)
  function kindNow(s) {
    var d = Life.day(s), room = Home.H.room, done = function (k) { return s.seen['moment:' + k + ':' + s.day]; };
    if (boxDay(s) && room === 'living' && !done('box')) return 'box';
    if (d.kind === 'off' && s.minute >= 660 && s.minute <= 960 && room === 'living' && !done('sun')) return 'sun';
    if (d.kind === 'work' && s.phase === 'evening' && room === 'bedroom' && s.wearing !== 'suit' && !done('suit')) return 'suit';
    return null;
  }
  function tick(dt) {
    var s = S(); if (!s || !G.cat) return;
    var key = s.day + ':' + s.phase;
    if (M.key !== key) { M.key = key; endMoment(true); M.next = G.t + 8; }
    // 저녁 8시 반이 넘도록 내 저녁을 안 먹었으면 배에서 꼬르륵
    if (homeNow() && s.phase === 'evening' && s.day > 0 && !s.myMeal && s.minute >= 1230 && M.rumble !== s.day && !UI.busy()) {
      M.rumble = s.day; Engine.puff({ x: G.hero.x, y: G.hero.y - 110, icon: 'rice', px: 2, life: 1.6, rise: 10 });
    }
    if (M.on) {
      var sp = SPOT[M.on];
      if (UI.busy()) { M.until += dt; return; }
      if (M.shot || G.t > M.until || Home.H.room !== sp.room || !atHome() || !Life.homeTime(s) || Home.H.mode === 'night' || !G.cat.visible) endMoment(!atHome());
      return;
    }
    if (G.t < M.next || UI.busy() || G.acting || !homeNow() || !catFree() || s.day === 0) return;
    var kind = kindNow(s); if (kind) startMoment(kind);
  }
  function startMoment(kind) {
    var s = S(), k = G.cat, sp = SPOT[kind], H = Home.H;
    M.on = kind; M.ready = false; M.shot = false; M.until = G.t + 40;
    s.seen['moment:' + kind + ':' + s.day] = true;
    H.catAct = 'still'; k.tx = null; k.pose = 'walk';
    var go = Engine.catTo(sp.floor, { y: 336 });
    go.then(function () {
      if (M.on !== kind) return null;
      return sp.y < 336 ? hop(sp.x, sp.y) : Engine.catTo(sp.x, { y: sp.y });
    }).then(function () {
      if (M.on !== kind || !atHome() || Home.H.arcHot) return;
      k.pose = 'sleep'; M.ready = true; UI.sfx('purr');
      if (!s.seen['momentHint:' + kind]) {
        s.seen['momentHint:' + kind] = true; M.hint = true;
        G.hand = { x: sp.x, y: sp.y - sp.h - 24, tx: sp.x, ty: sp.y - sp.h / 2, period: 1.4, t0: G.t };
        say(B().moment[kind](s));
      }
    });
  }
  function endMoment(quiet) {
    if (!M.on) return;
    var was = SPOT[M.on];
    M.on = null; M.ready = false; M.shot = false;
    if (M.hint) { G.hand = null; M.hint = false; }
    var H = Home.H;
    // 높은 자리(침대, 소파)에 있던 고양이는 바닥으로 폴짝 내려온다
    if (!quiet && G.cat.visible && G.cat.y < 336 && was && G.cat.room === H.room) {
      H.catAct = 'still';
      hop(was.floor, 336).then(function () { if (H.catAct === 'still' && !M.on) H.catAct = null; });
    } else {
      if (H.catAct === 'still') H.catAct = null;
      if (G.cat.y < 336 && was) { G.cat.y = 336; G.cat.x = was.floor; G.cat.pose = 'sit'; }
    }
    M.next = G.t + 30;
  }
  // 순간에는 고양이 새 자세를 그린다: 정장 위(v7-cats 0), 볕 쬐며 배 드러내기(1), 상자 속(2) (그렸으면 true)
  var MOMENT_CAT = { suit: 0, sun: 1, box: 2 };
  function momentDraw(c, k) {
    if (!M.on || !M.ready || k.walking) return false;
    var sp = SPOT[M.on];
    if (View.v7cat(c, G, MOMENT_CAT[M.on], k.x, k.y, M.on === 'sun' ? -1 : 1, k.scale || 1.6)) return true;
    ph(c, Math.round(k.x - sp.w / 2), Math.round(k.y - sp.h), sp.w, sp.h, sp.label);
    return true;
  }
  // 비워 둔 상자: 고양이가 들어가 있지 않을 때 거실 바닥에 (v7-props 4번, 뚜껑 날개를 연 빈 상자)
  function drawBox(c) {
    var s = S(), h = Home.H; if (!s || h.pro || h.room !== 'living' || !boxDay(s)) return;
    if (M.on === 'box' && M.ready) return;
    if (PixelArt.v7propIn(c, 4, BOX.x, BOX.y, BOX.w, BOX.h)) return;
    ph(c, BOX.x, BOX.y, BOX.w, BOX.h, '빈 상자');
  }
  // 정장 위 고양이가 있는 동안 옷걸이의 정장은 침대 위에 있다
  function suitOnBed() { return M.on === 'suit' && M.ready; }
  function photoSpot() {
    if (!M.on || !M.ready) return null;
    var k = G.cat, sp = SPOT[M.on];
    return { id: 'photo', x: k.x - sp.w / 2 - 6, y: k.y - sp.h - 10, w: sp.w + 12, h: sp.h + 16, glow: false, tap: snap };
  }
  function snap() {
    if (M.hint) { G.hand = null; M.hint = false; }
    Phone.open('camera');
    return null;
  }
  function shotTaken() { M.shot = true; }

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
      if (!r || !r.go) return null;
      return Town.askCat(17 * 60 + 54).then(function () { // 단톡 답장(오후 5:52) 바로 뒤
        UI.sfx('coin');
        return say([{ who: 'narr', text: '동기 친구와 여행자보험을 계약했다. 집에는 9시 반이 넘어서 들어갔다.' }]);
      });
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
    // 4/17 밤: 엄마 문자 (답하지 않고 닫아도 된다)
    if (d.mom && !s.seen.momText) { s.seen.momText = true; await Mom.text417(); }
    // 4/23: 발표 준비, 자판 위의 고양이
    if (d.eve && !s.lid) await lastPrep();
  }
  async function lastPrep() {
    var s = S(), H = Home.H, k = G.cat, P = Home.P;
    await say(B().prep(s));
    await Engine.fade(1, .3);
    H.closeUp = null;
    Home.enter('bedroom', { mode: 'evening', heroX: P.laptop.x - 6, catRoom: 'bedroom', catX: 470, catY: 336 });
    G.hero.dir = 1; G.hero.pose = 'back';
    k.visible = !s.hidden;
    await Engine.fade(0, .3);
    await Engine.sleep(.8);
    if (s.hidden) { Life.lastPrep(s, 'work'); s.minute += Life.cost(s, Life.T.prep); G.hero.pose = null; return; }
    H.catAct = 'still'; k.pose = 'walk';
    await Engine.catTo(P.laptop.x + 40, { y: 336 });
    await hop(P.laptop.x + 14, P.laptop.y + 6);
    k.pose = 'sit'; k.dir = -1; UI.sfx('tap');
    await say(B().onKeys(s));
    if (!s.seen.prepHint) { s.seen.prepHint = true; G.outlineAll = true; setTimeout(function () { G.outlineAll = false; }, 2600); }
    var pick = await tapWait([
      { id: 'closeLid', x: P.laptop.x - 34, y: P.laptop.y - 32, w: 36, h: 30, pulse: true },
      { id: 'liftCat', x: k.x - 22, y: k.y - 44, w: 46, h: 48, pulse: true }
    ]);
    if (pick === 'liftCat') {
      Life.lastPrep(s, 'work');
      await hop(P.laptop.x + 52, 336);
      await catWalk(470, { y: 336 });
      k.dir = 1; k.pose = 'sit';
      await say(B().prepWork(s));
      var m = Life.cost(s, Life.T.prep); s.minute += m; spent(m, P.laptop.x, 160);
    } else {
      Life.lastPrep(s, 'lid');
      UI.sfx('page'); G.hero.pose = null;
      await say(B().prepLid(s));
      await hop(P.laptop.x + 52, 336);
      await catWalk(400, { y: 336 });
      k.pose = 'purr'; UI.sfx('purr'); Engine.puff({ x: k.x, y: k.y - 50, icon: 'heart', px: 1, life: 1.2 });
      s.minute += Life.cost(s, Life.T.play); spent(Life.T.play, 400, 240);
    }
    G.hero.pose = null; H.catAct = null;
  }

  // ---------- 5/8: 다시, 비 ----------
  // 프롤로그를 뒤집는다. 그날은 내가 슈퍼 앞의 고양이에게 우산을 기울였다. 오늘은 우산이 없다.
  // 이 동네에서 가장 가까워진 사람(성훈 씨, 옆집 할머니, 슈퍼 사장님)이 우산을 기울이고, 나는 그 아래로 한 걸음 들어간다.
  // 동기 지안이 가장 가까우면 지점을 나설 때 우산을 빌려줬다. 아무도 없으면 슈퍼에서 비닐우산을 사서 혼자 편다.
  var RAIN_PAL = { grandma: { label: '옆집 할머니', fill: '#d6cbbd' } };
  var RAIN_LOOK = { one: 'one', grandma: 'grandma', boss: 'owner' };
  async function rainHome() {
    var s = S(), R = B().RAIN, who = Life.umbrellaBy(s);
    var st = { open: 0, opened: false, own: who === 'mate', mine: false, other: null, under: false, step: 0 }, STEP = 26;
    var o = who && who !== 'mate' ? { who: who, x: 520, dir: -1, on: false, walking: false } : null;
    st.other = o;
    G.hero.x = 40; G.hero.dir = 1; G.hero.tx = null; G.hero.visible = true;
    Work.street({
      dusk: true,
      draw: function (c) {
        var h = G.hero, t = G.t;
        PixelArt.rain(c, { x: 0, y: 0, w: 640, h: 360 }, t, 1);
        // 함께 쓰는 우산: 그 사람이 들고 내 쪽으로 기울인다
        // v7 그림: 머리 위로 든 손에 우산대를 쥐고 장바구니(할머니는 비닐봉지)를 든 모습 (v7-people 7번 칸). 우산은 그 손에 붙인다.
        var art = o && PixelArt.v7img('v7People'), look = o && RAIN_LOOK[o.who];
        if (o && o.on && art) {
          View.shadow(c, o.x, 343, 18);
          // 같이 걸을 때는 걷는 칸으로 앞(오른쪽)을 보고, 우산은 내 쪽 머리 위에 그대로 둔다
          View.person(c, G, o.x, 342, look, o.walking && st.under ? 1 : o.dir, t, o.walking ? 'walk' : 'umbrella', 2.35);
          var g = View.gripAt(look, o.x, 342, -1);
          PixelArt.umbrella(c, g.x, g.y, st.under ? -.18 : -.5, View.HERO_PX, 'navy');
        } else if (o && o.on) {
          View.shadow(c, o.x, 343, 18);
          if (RAIN_PAL[o.who]) { var P = RAIN_PAL[o.who]; View.box(c, o.x - 20, 236, 40, 106, P.fill, '#55505a', 2); }
          else View.person(c, G, o.x, 342, o.who === 'one' ? 'customerA' : 'customerC', o.walking ? 1 : o.dir, t, o.walking ? 'walk' : 'stand', 2.35, o.who === 'one' ? 100 : 200);
          var mid = st.under ? (o.x + h.x) / 2 : o.x - 6;
          PixelArt.umbrella(c, mid, 258, st.under ? -.18 : -.5, View.HERO_PX, 'navy');
        }
        View.shadow(c, h.x, 343, 20);
        var holding = st.opened || st.open > 0;
        View.person(c, G, h.x, 342, 'suit', h.walking ? h.dir : 1, t, h.walking ? (holding ? 'umbrellaWalk' : 'walk') : (holding ? 'umbrella' : 'stand'), 2.35);
        if (holding) PixelArt.umbrella(c, h.x + (h.walking ? 6 : 16), h.walking ? 262 : 258 + (1 - st.open) * 30, 0, View.HERO_PX, st.own ? 'yellow' : 'clear');
        else if (st.mine) View.r(c, h.x + 14, 270, 3, 44, st.own ? '#e0b43c' : '#c9d2d8'); // 접힌 우산 (지안의 노란 우산 / 비닐우산)
        // 그림이 오기 전의 회색 상자: 이름은 나보다 앞에 써서 가리지 않는다
        if (o && o.on && !art && RAIN_PAL[o.who]) View.text(c, RAIN_PAL[o.who].label, o.x + 8, 254, 9, '#3b3540', 'center');
      },
      hot: function () {
        var h = G.hero;
        if (st.ready === 'open' && !st.opened && !h.walking) {
          return [{ id: 'umbrella', x: h.x + 16 - 30, y: 220, w: 60, h: 110, drag: {
            start: function (d) { st.y0 = d.y; G.hand = null; },
            move: function (d) { st.open = Math.max(0, Math.min(1, (st.y0 - d.y) / 60)); },
            end: function () { if (st.open > .6) { st.open = 1; st.opened = true; UI.sfx('tap'); } else st.open = 0; return null; }
          } }];
        }
        if (st.ready === 'step' && !st.under) {
          // 나를 우산 아래로 한 걸음 끌어 옮긴다 (눌러도 된다)
          return [{ id: 'step', x: h.x - 30, y: 200, w: o.x - h.x + 30, h: 150, drag: {
            start: function (d) { st.x0 = d.x; G.hand = null; },
            move: function (d) { st.step = Math.max(0, Math.min(1, (d.x - st.x0) / 40)); h.x = st.base + st.step * STEP; },
            end: function () { if (st.step > .5) { st.under = true; h.x = st.base + STEP; UI.sfx('tap'); } else { st.step = 0; h.x = st.base; } return null; }
          }, tap: function () { st.under = true; h.x = st.base + STEP; UI.sfx('tap'); return null; } }];
        }
        if (st.ready === 'shop') {
          return [{ id: 'shopDoor', x: 452, y: 168, w: 112, h: 128, pulse: true, tap: function () { st.buy = true; return null; } }];
        }
        return [];
      },
      walk: null
    });
    await Engine.fade(0, .6);
    UI.sfx('rain');
    if (st.own) {
      // 지점을 나설 때 지안이 우산을 쥐여 줬다
      st.mine = true;
      await Engine.walkTo(300, { speed: 90 });
      await say(R.start(s));
      await say(R.mate);
      await openOwn();
      await say(R.mateAfter);
      await Engine.walkTo(640, { speed: 110 });
    } else {
      // 슈퍼 차양 아래에 선다
      await Engine.walkTo(392, { speed: 90 });
      G.hero.speed = 170;
      await say(R.start(s));
      await say(R.noUmbrella);
      if (o) {
        o.on = true; UI.sfx('door');
        // 한 걸음 다가가도 얼굴이 맞닿지 않게 떨어져 선다 (다가간 뒤 사이 72, 우산 끝이 내 머리 위까지 온다)
        o.walking = true; await slideX(o, 490, .7); o.walking = false; o.dir = -1;
        await say(R.come[o.who]);
        st.base = G.hero.x; st.ready = 'step';
        G.hand = { x: G.hero.x, y: 300, tx: G.hero.x + 30, ty: 300, period: 1.6, t0: G.t };
        await Engine.until(function () { return st.under; });
        G.hand = null; st.ready = null;
        await Engine.sleep(.4);
        await say(R.under);
        // 둘이 같이 걷는다
        o.walking = true;
        var gap = o.x - G.hero.x;
        var follow = setInterval(function () { o.x = G.hero.x + gap; }, 16);
        await Engine.walkTo(640, { speed: 90 });
        clearInterval(follow);
        G.hero.speed = 170;
      } else {
        st.ready = 'shop'; G.guide = { x: 508, y: 160, dir: 'down' };
        await Engine.until(function () { return st.buy; });
        G.guide = null; st.ready = null;
        await Engine.fade(1, .3);
        var r = Life.payAny(s, 'umbrella', Life.UMBRELLA); UI.sfx(r.card ? 'tap' : 'spend');
        st.mine = true;
        await Engine.fade(0, .3);
        await say(R.bought);
        await openOwn();
        await Engine.walkTo(640, { speed: 110 });
      }
    }
    G.hero.speed = 170;
    await Engine.fade(1, .5);
    if (o) await say(R.home[o.who]);
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

    // 접힌 우산을 위로 밀어 편다 (프롤로그와 같은 손짓)
    function openOwn() {
      st.ready = 'open';
      G.hand = { x: G.hero.x + 16, y: 300, tx: G.hero.x + 16, ty: 240, period: 2, t0: G.t };
      return Engine.until(function () { return st.opened; }).then(function () { G.hand = null; st.ready = null; return Engine.sleep(.5); });
    }
  }
  function slideX(b, x, sec) {
    var x0 = b.x, t0 = G.t;
    return new Promise(function (resolve) { (function step() { var q = Math.min(1, (G.t - t0) / sec); b.x = x0 + (x - x0) * q; if (q < 1) setTimeout(step, 16); else resolve(); }()); });
  }

  // ---------- 엔딩의 사진첩 ----------
  // 고객 메모 캡처(메일을 읽은 날)와 내가 찍은 고양이 사진을 날짜 순으로
  function album(s) {
    var shots = [];
    s.ledger.forEach(function (t) { if (Life.DAYS[t.day].kind === 'work' && s.results.some(function (r) { return r.day === t.day; })) shots.push({ day: t.day, memo: true }); });
    (s.photos || []).forEach(function (p) { shots.push({ day: p.day, pose: p.pose, to: (p.to || []).slice() }); });
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
    rainHome: rainHome, album: album, stopMoment: function () { endMoment(true); }, drawShot: drawShot, KITCHEN: KITCHEN,
    drawBox: drawBox, suitOnBed: suitOnBed, shotTaken: shotTaken, SPOT: SPOT,
    moment: function () { return M.on ? { kind: M.on, ready: M.ready, until: M.until } : null; }
  };
}());
