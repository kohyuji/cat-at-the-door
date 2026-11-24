/* 동물병원 (4/21~4/23): 고양이 방광염.
   4/21 저녁에 화장실을 자주 들락거리고, 4/22 아침 모래에 피가 비친다.
   데려가는 때는 넷이다. 출근 전 아침(오전 상담을 놓친다), 오후 상담을 미룬 점심, 퇴근한 저녁(하루 종일 아프다),
   다음 날 아침(더 아프고 수액이 더해진다). 대기실에서 4/16 상담 고객 성훈 씨를 다시 만난다.
   성훈 씨가 접수대에 불려 가며 이동장을 들고 머뭇거릴 때, 그 이동장을 누르면 맡아 준다.
   값은 Life(VET, treat, payAny), 대사는 Story.VET, 여기서는 장면과 손짓. */
var Vet = (function () {
  'use strict';
  function S() { return G.s; }
  function say(l) { return UI.say(l); }
  function V() { return Story.VET; }
  function me(t) { return { who: 'me', text: t }; }
  function H() { return Home.H; }
  // 이동장: 현관 매트 옆 바닥 (그림 자리)
  var CARRIER = { x: 112, y: 292, w: 46, h: 38 };
  var ST = { trip: false, inside: false };

  // ---------- 집 ----------
  // 이동장은 아픈 걸 안 아침부터 병원에 다녀올 때까지 현관 옆에 꺼내 둔다
  function carrierOut(s) { return !!s && Life.vetDue(s) && !!s.seen.vetKnown && s.day <= Life.VET.day + 1; }
  function canGo(s) {
    var h = H();
    if (h.pro || h.closeUp || h.mode === 'night') return false;
    if (h.mode === 'morning') return s.phase === 'morning';
    return Life.homeTime(s) && s.phase === 'evening';
  }
  function drawHome(c) {
    var s = S(), h = H(); if (!s || h.pro || h.room !== 'living') return;
    if (!carrierOut(s) && !ST.inside) return;
    View.box(c, CARRIER.x, CARRIER.y, CARRIER.w, CARRIER.h, '#cdb79a', '#55505a', 2);
    View.text(c, '이동장', CARRIER.x + CARRIER.w / 2, CARRIER.y + CARRIER.h / 2 + 4, 10, '#55505a', 'center');
    if (ST.inside) View.text(c, '(' + s.cat + ')', CARRIER.x + CARRIER.w / 2, CARRIER.y - 6, 9, '#55505a', 'center');
  }
  function homeSpots(room) {
    var s = S(); if (room !== 'living' || !carrierOut(s) || !canGo(s) || ST.trip) return [];
    var closed = H().mode !== 'morning' && !Life.vetOpen(s, s.minute);
    if (closed && s.seen.vetClosed === s.day) return [];
    return [{ id: 'carrier', x: CARRIER.x - 4, y: CARRIER.y - 6, w: CARRIER.w + 8, h: CARRIER.h + 10, pulse: true, chips: closed ? null : [Home.cMin(Life.VET.trip)], tap: tapCarrier }];
  }
  function tapCarrier() {
    var s = S(), h = H();
    if (h.mode === 'morning' && s.wearing !== 'suit') { UI.sfx('bad'); return say(V().suitFirst); }
    if (h.mode !== 'morning' && !Life.vetOpen(s, s.minute)) { s.seen.vetClosed = s.day; UI.sfx('bad'); return say(V().closed); }
    return Engine.walkTo(CARRIER.x + CARRIER.w + 24).then(function () {
      G.hero.dir = -1;
      if (!Town.go('vet')) return say([me('지금은 나갈 때가 아니야.')]);
      return null;
    });
  }
  // 4/23 아침에는 병원부터 간다 (현관으로 바로 나가지 못한다)
  function leaveBlock() {
    var s = S(), h = H();
    if (!s || h.pro || h.mode !== 'morning' || !Life.vetDue(s) || s.day !== Life.VET.day + 1) return null;
    return V().mustGo;
  }

  // 4/21 저녁: 화장실에 들어가 한참 앉아 있다 나온다 / 4/22: 하루 종일 화장실 앞에 웅크려 있었다
  async function homeBeats() {
    var s = S(), h = H(), k = G.cat;
    if (Life.vetSign(s) && !s.seen.vetSign && !s.hidden && !s.locked) {
      s.seen.vetSign = true;
      h.catAct = 'still'; k.visible = true; k.room = 'living'; k.pose = 'walk';
      await Engine.catTo(Home.P.litter.x - 20, { y: 336 });
      k.pose = 'sit'; k.dir = 1;
      await Engine.sleep(1.6);
      await say(V().sign(s));
      k.pose = 'walk'; await Engine.catTo(420, { y: 336 }); k.pose = 'sit';
      h.catAct = null;
    }
  }
  // 현관에 들어설 때: 아픈 고양이는 현관이 아니라 화장실 앞에 있다 (그 말을 했으면 true)
  async function door() {
    var s = S(), h = H(), k = G.cat;
    if (!(Life.vetDue(s) && s.day === Life.VET.day && s.seen.vetKnown && !s.seen.vetEve)) return false;
    s.seen.vetEve = true;
    if (!s.hidden) { h.catAct = 'still'; k.visible = true; k.room = 'living'; k.x = Home.P.litter.x - 30; k.y = 336; k.pose = 'sleep'; }
    await say(V().eveHome(s, s.vetPm === s.day));
    h.catAct = null;
    Town.outline(2.4);
    return true;
  }
  // 4/22 아침: 모래에 피 / 4/23 아침: 더 미룰 수 없다
  async function morningBeats() {
    var s = S();
    if (!Life.vetDue(s)) return;
    if (s.day === Life.VET.day && !s.seen.vetKnown) {
      s.seen.vetKnown = true;
      await say(V().morning(s));
      Town.outline(2.4);
    } else if (s.day === Life.VET.day + 1 && !s.seen.vetNext) {
      s.seen.vetNext = true; s.seen.vetKnown = true;
      await say(V().next(s));
      Town.outline(2.4);
    }
  }
  // 돌봄 뒤: 4/21 화장실 모래, 약 먹는 날의 밥
  function onCare(kind) {
    var s = S(); if (!s || H().pro) return;
    if (kind === 'scoop' && Life.vetSign(s) && !s.seen.vetScoop) { s.seen.vetScoop = true; Home.queueLine({ key: 'vetScoop', text: V().scoop, narrate: true }); }
    if (kind === 'feed' && Life.onMed(s) && !s.seen['vetMed' + s.day + s.meal]) {
      s.seen['vetMed' + s.day + s.meal] = true;
      if (!s.seen.vetMedLine) { s.seen.vetMedLine = true; Home.queueLine({ key: 'vetMed', text: V().med(s), narrate: true }); }
      else Engine.puff({ x: Home.P.bowl.x, y: Home.P.bowl.y - 40, icon: 'sparkle', px: 1, life: 1 });
    }
  }

  // ---------- 4/22 점심: 오후 상담을 미루고 나갈지 ----------
  // 내 자리에 앉으면 남고, 출구로 가면 2시 고객님께 양해 문자를 보내고 집으로 간다
  function noon(nextId) {
    var s = S();
    if (s.day !== Life.VET.day || !Life.vetDue(s) || s.seen.vetNoon) return Promise.resolve('stay');
    s.seen.vetNoon = true;
    var pick = null, DESK = Work.DESK, EXIT = Work.EXIT;
    Work.office();
    Work.Wk.lead = { x: 300, dir: 1 }; Work.Wk.peer = { x: 150, dir: 1 };
    G.hero.x = 470; G.hero.dir = -1; G.hero.visible = true; G.hero.pose = null;
    s.minute = Math.max(s.minute, 720);
    Engine.setScene({
      place: 'office',
      draw: function (c) { Work.drawOffice(c); if (!pick) View.lampGlow(c, DESK.x + DESK.w / 2, DESK.y + 40, 80, .2 + Math.sin(G.t * 3) * .05); },
      hot: function () {
        if (pick) return [];
        return [
          { id: 'stay', x: DESK.x, y: DESK.y, w: DESK.w, h: DESK.h, pulse: true, tap: function () { return Engine.walkTo(DESK.x + DESK.w / 2).then(function () { pick = 'stay'; }); } },
          { id: 'exit', x: EXIT.x, y: EXIT.y, w: EXIT.w, h: EXIT.h, pulse: true, tap: function () { return Engine.walkTo(590).then(function () { G.hero.pose = 'back'; pick = 'go'; }); } }
        ];
      }
    });
    return Engine.fade(0, .3).then(function () { return say(V().noon(s)); }).then(function () {
      return Engine.until(function () { return pick; });
    }).then(function () {
      G.hero.pose = null;
      if (pick === 'stay') return say(V().stay(s)).then(function () { return 'stay'; });
      s.vetPm = s.day;
      // 2시 고객님께 양해 문자를 보낸다
      var cl = Story.CLIENT[nextId], to = cl ? cl.name + ' 고객님' : null, t = Town.phoneTime(0, 730);
      if (to) {
        Phone.drop({ from: to, dir: 'out', time: t.label, body: V().postpone(cl.name) });
        setTimeout(function () { Phone.drop({ from: to, time: Town.phoneTime(0, 736).label, body: V().postponed }); }, 2200);
        Life.postpone(s, nextId);
      }
      return say(V().leadOk(s)).then(function () { return 'go'; });
    });
  }
  // 점심에 나온 날: 지하철로 50분, 1시쯤 집에 온다
  function pmAt() { return 720 + 10 + Life.T.commute; }

  // ---------- 동물병원까지 ----------
  // Town.run에서 부른다. 아침에 다녀오면 'leave'를 돌려준다 (그대로 출근한다).
  async function run() {
    var s = S(), h = H(), k = G.cat, morning = h.mode === 'morning';
    var when = morning ? (s.day === Life.VET.day ? 'am' : 'next') : (s.vetPm === s.day ? 'pm' : 'eve');
    ST.trip = true;
    Arc.stopMoment();
    // 이동장에 넣는다
    if (!s.hidden) {
      h.catAct = 'still'; k.visible = true; k.room = 'living'; k.pose = 'walk';
      await Engine.catTo(CARRIER.x + CARRIER.w / 2, { y: 336 });
    }
    k.visible = false; ST.inside = true; UI.sfx('door');
    await say(V().carrierIn(s));
    if (morning) {
      await say(V().toBranch);
      var B = V().branchText, t = Town.phoneTime();
      Phone.drop({ from: B.to, dir: 'out', time: t.label, body: B.out });
      setTimeout(function () { Phone.drop({ from: B.to, time: Town.phoneTime(3).label, body: B.back }); }, 1800);
    }
    await Engine.fade(1, .3);
    await Town.map('home', ['vet']);
    await clinic(when);
    // 집에 돌아온다: 고양이가 이동장에서 나와 물그릇으로
    ST.inside = false; ST.trip = false;
    await Town.backIn(CARRIER.x + CARRIER.w + 30);
    G.hero.dir = -1;
    k.visible = true; k.room = 'living'; k.x = CARRIER.x + CARRIER.w / 2; k.y = 336; k.pose = 'walk'; h.catAct = 'still';
    s.hidden = false; s.locked = false;
    await Engine.catTo(Home.P.water.x - 26, { y: 336 });
    k.pose = 'sit';
    await say(V().home(s));
    h.catAct = null;
    if (morning) { await say(V().amBack(s)); return 'leave'; }
    One.vetLater();
    return null;
  }
  // 대기실 → 진료실 → 영수증
  async function clinic(when) {
    var s = S(), VT = Life.VET, worse = when === 'next';
    var one = Life.person(s, 'one'), knew = !!(one && one.met), shown = !!(s.one && s.one.show !== undefined && s.one.show !== null);
    s.minute = Math.max(s.minute + 15, VT.open);
    var mine = { x: 262, y: 268, w: 40, h: 30, label: '이동장', fill: '#cdb79a' };
    var his = { x: 504, y: 268, w: 40, h: 30, label: '이동장', fill: '#b9c2c9' };
    var sh = { x: 470, y: 300, v: 'customerA', hue: 100, dir: -1, pose: 'sit' };
    var st = Town.stage({
      title: '동물병원 대기실', place: 'vet', heroX: 232, heroY: 300, pose: 'sit', dir: 1,
      boxes: [
        { x: 20, y: 120, w: 112, h: 200, label: '접수대', fill: '#c9c6c0' },
        { x: 562, y: 100, w: 70, h: 222, label: '진료실 문', fill: '#c9c6c0' },
        { x: 170, y: 262, w: 380, h: 18, label: '대기 의자', fill: '#bdb7ad' },
        mine, his
      ],
      people: [sh]
    });
    await Engine.fade(0, .35);
    if (when === 'am' || when === 'next') await say(V().amWait);
    await say(V().wait(s));
    await say(knew ? V().meet(s, shown) : V().stranger);
    // 접수대에서 성훈 씨를 부른다: 이동장을 들고 일어서다 머뭇거린다
    await say(V().desk(s));
    sh.pose = 'stand'; sh.x = 486; his.y = 236; his.x = 500;
    var held = false, wait = true, t0 = G.t;
    st.spots = [{ id: 'holdCarrier', x: his.x - 6, y: his.y - 6, w: his.w + 12, h: his.h + 12, pulse: true, tap: function () { held = true; return null; } }];
    var look = setInterval(function () { sh.dir = -sh.dir; }, 700);
    await Engine.until(function () { return held || G.t - t0 > 5; });
    clearInterval(look); st.spots = []; sh.dir = -1; wait = false;
    if (held) {
      // 내 옆 의자로 옮겨 놓는다
      await slide(his, 312, 268, .45);
      UI.sfx('tap');
      await say(V().hold);
      if (knew) { Life.oneMeet(s, 'carrier'); Town.heartPuff(sh.x, 200); }
    } else await say(V().holdNot(knew));
    // 접수대에 다녀온다
    await walkBox(sh, his, held, 150);
    await Engine.sleep(.8);
    await walkBox(sh, his, held, 470);
    sh.pose = 'sit'; sh.dir = -1;
    if (held) await slide(his, 504, 268, .35); else { his.x = 504; his.y = 268; }
    if (knew) {
      await say(V().back(s, held));
      await say(V().worry(s));
      Life.oneMeet(s, 'vet');
    } else if (held) await say(V().strangerThanks(s));
    await say(V().call(s));
    // 진료실
    await Engine.fade(1, .3);
    var R = { on: false, paid: false };
    var ex = Town.stage({
      title: '진료실', place: 'vet', heroX: 200, dir: 1,
      boxes: [{ x: 270, y: 210, w: 200, h: 26, label: '진료대', fill: '#d3d8dc' }, { x: 340, y: 180, w: 56, h: 30, label: s.cat, fill: '#e8d6b8' }],
      people: [{ x: 520, y: 342, box: '수의사', fill: '#cfd8d6' }],
      top: function (c) { if (R.on) receipt(c, worse, R.paid); }
    });
    await Engine.fade(0, .3);
    await say(V().exam(s, worse));
    // 영수증: 체크카드를 내민다
    R.on = true; UI.sfx('page');
    await Engine.sleep(.4);
    var paid = false;
    ex.spots = [{ id: 'payCard', x: CARD.x - 4, y: CARD.y - 4, w: CARD.w + 8, h: CARD.h + 8, pulse: true, tap: function () { paid = true; return null; } }];
    await Engine.until(function () { return paid; });
    ex.spots = [];
    var r = Life.treat(s, when);
    R.paid = true; UI.sfx(r.card ? 'bad' : 'coin');
    await say(r.card ? V().card(r.amount) : V().paid(r.amount));
    await say(V().irony);
    R.on = false;
    s.minute += 70 + 15; // 검사와 진료, 집까지 걸어서
    await Engine.fade(1, .35);
  }
  var PAPER = { x: 180, y: 30, w: 280, h: 276 }, CARD = { x: 392, y: 258, w: 54, h: 34 };
  function receipt(c, worse, paid) {
    var P = PAPER, items = V().BILL.slice(); if (worse) items.push(V().EXTRA);
    var total = items.reduce(function (a, it) { return a + it[1]; }, 0), lh = items.length > 6 ? 21 : 23;
    View.box(c, P.x, P.y, P.w, P.h, '#f6f3ec', '#55505a', 2);
    View.text(c, '진료비 영수증', P.x + P.w / 2, P.y + 24, 13, '#2f2a33', 'center');
    items.forEach(function (it, i) {
      View.text(c, it[0], P.x + 18, P.y + 52 + i * lh, 11, '#3b3540', 'left');
      View.text(c, Life.won(it[1]), P.x + P.w - 18, P.y + 52 + i * lh, 11, '#3b3540', 'right');
    });
    var ty = P.y + 52 + items.length * lh + 6;
    View.r(c, P.x + 14, ty - 12, P.w - 28, 2, '#8a8490');
    View.text(c, '합계', P.x + 18, ty + 6, 12, '#2f2a33', 'left');
    View.text(c, Life.won(total), P.x + P.w - 18, ty + 6, 12, '#c0392b', 'right');
    if (!paid) { View.box(c, CARD.x, CARD.y, CARD.w, CARD.h, '#8fb3d9', '#3a3640', 2); View.text(c, '카드', CARD.x + CARD.w / 2, CARD.y + 21, 10, '#2f2a33', 'center'); }
  }
  function slide(b, x, y, sec) {
    var x0 = b.x, y0 = b.y, t0 = G.t;
    return new Promise(function (resolve) { (function step() { var q = Math.min(1, (G.t - t0) / sec); b.x = x0 + (x - x0) * q; b.y = y0 + (y - y0) * q; if (q < 1) setTimeout(step, 16); else resolve(); }()); });
  }
  // 성훈 씨가 걸어간다 (맡겨 둔 이동장은 내 옆에 남는다)
  function walkBox(p, box, held, x) {
    var x0 = p.x, t0 = G.t, dur = Math.abs(x - x0) / 260;
    p.dir = x < x0 ? -1 : 1; p.pose = 'walk';
    return new Promise(function (resolve) {
      (function step() {
        var q = Math.min(1, (G.t - t0) / Math.max(.2, dur)); p.x = x0 + (x - x0) * q;
        if (!held) { box.x = p.x + 10 * p.dir - 20; box.y = 236; }
        if (q < 1) setTimeout(step, 16); else { p.pose = 'stand'; resolve(); }
      }());
    });
  }

  function init() {
    Home.hook('spots', homeSpots);
    Home.hook('draw', { y: 310, f: drawHome });
    Home.hook('care', onCare);
    Home.H.leaveBlock = leaveBlock;
    Town.onRun('vet', run);
    // 이동장을 들고 나선 길: 동네 지도에서 동물병원만 고를 수 있다
    Town.addRoutes(function () { return ST.trip ? { vet: 15 } : {}; });
  }
  if (typeof document !== 'undefined') init();

  return { homeBeats: homeBeats, door: door, morningBeats: morningBeats, noon: noon, pmAt: pmAt, run: run, CARRIER: CARRIER, ST: ST, carrierOut: carrierOut };
}());
