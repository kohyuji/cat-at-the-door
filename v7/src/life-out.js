/* 회사 밖의 저녁과 주말: 4/24(금) 첫 회식, 4/25(토) 대학 친구 은지의 결혼식.
   회식 1차는 신입 환영이라 다 같이 간다. 2차(노래방, 각자 2만 원)까지 가면 지점장님이 상담 신청 고객 한 분을 넘겨주고,
   대신 자정이 넘어 들어간다. 결혼식은 4/20 저녁 은지의 문자에 답해야 갈 수 있다. 축의금은 봉투에 넣는 현금이다.
   값은 Life(hoesik, wedAnswer, wedGift, wedGo), 대사는 Story.HOESIK과 Story.WED, 여기서는 장면과 손짓. */
var Out = (function () {
  'use strict';
  function S() { return G.s; }
  function say(l) { return UI.say(l); }
  function HO() { return Story.HOESIK; }
  function W() { return Story.WED; }
  function H() { return Home.H; }
  function wedDay(s) { return !!Life.day(s).wedding && !!s.wed && s.wed.answer === 'yes' && !s.wed.went; }
  var WE = Life.WEDDING, HK = Life.HOESIK;

  // ---------- 아침 ----------
  // 4/20: 지점 단톡에 회식 공지 / 4/24: 오늘은 회식
  async function morningBeats() {
    var s = S();
    if (s.day === HK.day - 4 && !s.seen.hoesikNotice) {
      s.seen.hoesikNotice = true;
      var n = HO().notice;
      Phone.drop({ from: n.from, time: n.time, body: n.body });
    }
    if (Life.day(s).hoesik && !s.seen.hoesikThink) { s.seen.hoesikThink = true; await say(HO().think); }
  }
  // 쉬는 날 아침: 2차까지 간 다음 날 / 결혼식 날
  async function weekendBeats() {
    var s = S();
    if (s.events.some(function (e) { return e.key === 'hoesik2' && e.day === s.day - 1; }) && !s.seen.hoesikMorning) { s.seen.hoesikMorning = true; await say(HO().morning2); }
    if (wedDay(s) && !s.seen.wedDress) { s.seen.wedDress = true; if (s.wearing !== 'suit') await say(W().dress); Town.outline(2.2); }
  }

  // ---------- 4/20 저녁: 은지의 문자 ----------
  async function homeBeats() {
    var s = S(), k = G.cat;
    if (s.day === WE.ask && !s.seen.wedAsk) {
      s.seen.wedAsk = true;
      var m = W().ask(s), t = Town.phoneTime();
      var pick = await Phone.wait({ from: m.from, time: t.label, body: m.body, replies: m.replies, optional: true }, t.clock);
      if (pick === 0) {
        Life.wedAnswer(s, true); Life.addAppt(s, 'wedding', WE.day, WE.at, 'hall');
        setTimeout(function () { Phone.drop({ from: '은지', time: Town.phoneTime(2).label, body: W().yes }); }, 2200);
      } else if (pick === 1) {
        Life.wedAnswer(s, false);
        Phone.drop({ from: '은지', time: Town.phoneTime(2).label, body: W().no });
        await Engine.sleep(1.2);
        await say(W().sendThink);
        // 못 가는 대신 축의금을 보낸다 (안 보내고 닫아도 된다)
        var sent = await Phone.bankTransfer({ to: '은지', amount: 50000, optional: true, clock: t.clock, pay: function (how) { if (how === 'pay') Life.wedGift(s, 50000, 'send'); } });
        if (sent === 'pay') setTimeout(function () { Phone.drop({ from: '은지', time: Town.phoneTime(4).label, body: W().sent }); }, 2400);
      }
    }
  }
  // 4/24 회식에서 늦게 들어온 밤: 현관에 들어서면 신발장 앞(2차까지 가면 현관 매트 위)의 고양이 (그 말을 했으면 true)
  async function door() {
    var s = S(), k = G.cat;
    if (!(Life.day(s).hoesik && (s.out === 'hoesik' || s.out === 'hoesik2') && !s.seen.hoesikHome)) return false;
    s.seen.hoesikHome = true;
    if (s.hidden) return false;
    H().catAct = 'still'; k.visible = true; k.room = 'living'; k.x = 96; k.y = 336; k.pose = 'sit'; k.dir = 1;
    await say(s.out === 'hoesik2' ? HO().home2(s) : HO().home1(s));
    H().catAct = null;
    return true;
  }

  // ---------- 4/24 회식 ----------
  // 퇴근 전 지점에서: 늦게 들어가니 고양이 밥을 부탁할 수 있다
  async function hoesikStart() {
    var s = S(); if (!Life.day(s).hoesik || s.out) return;
    Life.hoesik(s, 1);
    Work.office();
    G.hero.x = 470; G.hero.dir = -1; G.hero.visible = true;
    await Engine.fade(0, .3);
    await Town.askCat(17 * 60 + 50);
    await Engine.fade(1, .3);
  }
  // 퇴근하고 지점 앞 고깃집: 1차가 끝나면 2차(노래방 간판)로 갈지, 역으로 갈지 손으로 고른다
  async function hoesik() {
    var s = S(); if (s.out !== 'hoesik') return;
    var mateMet = !!(Life.person(s, 'mate') && Life.person(s, 'mate').met);
    s.minute = 19 * 60;
    var people = [{ x: 390, y: 342, v: 'lead', dir: -1 }, { x: 470, y: 342, v: 'peer', dir: -1 }];
    if (mateMet) people.push({ x: 150, y: 342, box: '지안' });
    var st = Town.stage({
      title: '지점 앞 고깃집', place: 'hoesik', heroX: 240, dir: 1, bg: '#dccbb8', night: .18,
      boxes: [{ x: 200, y: 262, w: 300, h: 30, label: '불판과 테이블', fill: '#a8988a' },
        { x: 500, y: 60, w: 124, h: 84, label: '2차 노래방 간판', fill: '#d9b8d0', hide: true },
        { x: 16, y: 110, w: 92, h: 212, label: '역 쪽 길', fill: '#c9c6c0', hide: true }],
      people: people
    });
    await Engine.fade(0, .35);
    await say(HO().first(s));
    s.minute = HK.leave1 - 10;
    await say(HO().second);
    var B = st.o.boxes, pick = null; B[1].hide = false; B[2].hide = false;
    st.spots = [
      { id: 'second', x: B[1].x, y: B[1].y, w: B[1].w, h: B[1].h, pulse: true, tap: function () { pick = 'second'; return null; } },
      { id: 'station', x: B[2].x, y: B[2].y, w: B[2].w, h: B[2].h, pulse: true, tap: function () { pick = 'home'; return null; } }
    ];
    Town.outline(2.4);
    await Engine.until(function () { return pick; });
    st.spots = [];
    if (pick === 'second') {
      var r = Life.hoesik(s, 2);
      if (r && r.ok) {
        UI.sfx('spend');
        await Engine.fade(1, .35);
        var kara = [{ x: 400, y: 342, v: 'lead', dir: -1 }, { x: 480, y: 342, v: 'peer', dir: -1 }];
        if (mateMet) kara.push({ x: 320, y: 342, box: '지안' });
        Town.stage({ title: '노래방', place: 'hoesik', heroX: 250, dir: 1, bg: '#cbbbd8', night: .3, boxes: [{ x: 40, y: 70, w: 200, h: 120, label: '노래방 화면', fill: '#9fb2c9' }], people: kara });
        await Engine.fade(0, .35);
        await say(HO().go2(s));
        if (mateMet) await say(HO().go2Mate);
        await Engine.sleep(.4);
      } else {
        await say(HO().broke);
        await say(HO().goHome);
      }
    } else await say(HO().goHome);
    await Engine.fade(1, .35);
  }

  // ---------- 4/25 결혼식 ----------
  function dressOK() { var s = S(); return !!s && s.phase === 'weekend' && wedDay(s); }
  function routes(s, from) {
    if (from !== 'home' || s.phase !== 'weekend' || !wedDay(s) || s.minute > WE.last) return {};
    return { hall: 40 };
  }
  // 집에 있는 동안: 나갈 시간이 되면 한마디 / 끝내 못 가면 은지의 문자
  function tick() {
    var s = S(), h = H(); if (!s || h.pro || s.phase !== 'weekend' || !wedDay(s)) return;
    if (G.place !== 'living' && G.place !== 'bedroom') return;
    if (s.minute >= WE.leave && !s.seen.wedGo) { s.seen.wedGo = true; Home.queueLine({ key: 'wedGo', text: W().goLine[0].text }); Town.outline(2); }
    if (s.minute > WE.last && !s.seen.wedMissed && !UI.busy()) {
      s.seen.wedMissed = true;
      Life.apptDone(s, 'wedding', 'missed');
      setTimeout(function () { Phone.drop({ from: '은지', time: Town.phoneTime(30).label, body: W().missed }); }, 1500);
    }
  }
  var NOTE = { w: 46, h: 22 }, ENV = { x: 300, y: 214, w: 60, h: 40 }, CARD = { x: 300, y: 236, w: 40, h: 24 }, PLATE = { x: 410, y: 266, w: 50, h: 18 };
  async function hall() {
    var s = S();
    if (s.wearing !== 'suit') { await say(W().dress); await Town.backIn(110); return; }
    s.minute += 40;
    var late = s.minute > WE.at;
    // 역 ATM: 축의금은 현금 봉투다. 통장이 모자라면 카드 현금서비스를 받을 수 있다 (은행 앱의 광고)
    var cashed = false;
    if (s.wallet < 50000 && Life.canCash(s)) {
      Town.stage({ title: '역 ATM', place: 'hall', heroX: 300, dir: 1, boxes: [{ x: 360, y: 150, w: 90, h: 172, label: 'ATM', fill: '#c9cdd2' }] });
      await Engine.fade(0, .3);
      await say(W().atm);
      var before = !!s.loan;
      Phone.open('bank');
      await Engine.until(function () { return !Phone.busy(); });
      cashed = !before && !!s.loan;
      await Engine.fade(1, .3);
    }
    var n = s.wallet >= 100000 ? 2 : s.wallet >= 50000 ? 1 : 0;
    var notes = [], env = { n: 0, given: false };
    for (var i = 0; i < n; i++) notes.push({ x: 180 + i * 56, y: 270, w: NOTE.w, h: NOTE.h, label: '5만 원', fill: '#e6cf8a', i: i });
    var st = Town.stage({
      title: '봄결웨딩홀 3층 로비', place: 'hall', heroX: 140, dir: 1,
      boxes: [{ x: 420, y: 150, w: 180, h: 60, label: '축의대', fill: '#e9e2d4' }, { x: 420, y: 210, w: 180, h: 112, label: '', fill: '#d8cfc0' }, { x: ENV.x, y: ENV.y, w: ENV.w, h: ENV.h, label: '봉투', fill: '#f4f1ea', hide: !n }].concat(notes),
      people: [{ x: 520, y: 150, box: '축의대 직원', fill: '#cfd8d6' }]
    });
    await Engine.fade(0, .35);
    await say(W().lobby(n, cashed));
    if (n) {
      await say(W().envelope);
      // 5만 원짜리를 봉투에 넣고, 봉투를 축의대에 낸다
      var envBox = st.o.boxes[2];
      var spots = function () {
        var list = notes.filter(function (b) { return !b.in; }).map(function (b) { return { id: 'note' + b.i, x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8, pulse: true, tap: function () { b.in = true; b.hide = true; env.n++; UI.sfx('page'); envBox.label = '봉투 ' + (env.n * 5) + '만'; return null; } }; });
        if (env.n) list.push({ id: 'giveEnv', x: 420, y: 150, w: 180, h: 60, pulse: true, tap: function () { env.given = true; return null; } });
        return list;
      };
      st.spots = spots();
      var iv = setInterval(function () { st.spots = env.given ? [] : spots(); }, 100);
      await Engine.until(function () { return env.given; });
      clearInterval(iv); st.spots = []; envBox.hide = true;
      var amount = env.n * 50000, g = Life.wedGift(s, amount, 'cash');
      UI.sfx('coin');
      await say(W().handed(g.ok ? amount : 0));
      if (amount === 50000) await say(W().cheap);
    } else await say(W().noCash);
    await say(late ? W().lateIn : W().ceremony);
    // 식사 자리: 오랜만에 만난 친구들. 명함을 꺼내거나, 접시를 내려다본다.
    await Engine.fade(1, .35);
    var pick = null;
    var tb = Town.stage({
      title: '피로연장', place: 'hall', heroX: 250, heroY: 330, pose: 'sit', dir: 1,
      boxes: [{ x: 200, y: 280, w: 280, h: 26, label: '테이블', fill: '#e9e2d4' }, { x: CARD.x, y: CARD.y, w: CARD.w, h: CARD.h, label: '명함', fill: '#f4f1ea' }, { x: PLATE.x, y: PLATE.y, w: PLATE.w, h: PLATE.h, label: '접시', fill: '#ffffff' }],
      people: [{ x: 390, y: 330, box: '다솜' }, { x: 470, y: 330, box: '준호' }]
    });
    await Engine.fade(0, .35);
    await say(W().table(s));
    tb.spots = [
      { id: 'card', x: CARD.x - 4, y: CARD.y - 4, w: CARD.w + 8, h: CARD.h + 8, pulse: true, tap: function () { pick = 'fc'; return null; } },
      { id: 'plate', x: PLATE.x - 4, y: PLATE.y - 4, w: PLATE.w + 8, h: PLATE.h + 8, pulse: true, tap: function () { pick = 'vague'; return null; } }
    ];
    Town.outline(2.4);
    await Engine.until(function () { return pick; });
    tb.spots = [];
    s.wed.job = pick;
    if (pick === 'fc') { tb.o.boxes[1].x = 350; tb.o.boxes[1].y = 270; await say(W().bizCard); await say(W().jobFc(s)); }
    else await say(W().jobVague(s));
    tb.o.people.push({ x: 160, y: 342, box: '은지', fill: '#f2e6ee' });
    await say(W().bride(s));
    await say(W().photo);
    Life.wedGo(s);
    Life.apptDone(s, 'wedding');
    await Engine.fade(1, .35);
    await Town.backIn(110);
    await say(W().back);
    var m = W().thanks;
    setTimeout(function () { Phone.wait({ from: '은지', time: Town.phoneTime(20).label, body: m.body, replies: m.replies, optional: true }); }, 2500);
  }

  // ---------- 냉장고 달력 ----------
  function calRows(s) {
    var rows = [];
    if (s.seen.hoesikNotice && s.day <= HK.day) rows.push({ date: Life.DAYS[HK.day].date, text: '회식 저녁 7시', red: s.day === HK.day });
    if (s.wed && s.wed.answer === 'yes' && !s.wed.went && s.day <= WE.day) rows.push({ date: Life.DAYS[WE.day].date, text: '은지 결혼식 12:30', red: s.day >= WE.day - 1 });
    return rows;
  }

  function init() {
    Home.hook('tick', tick);
    Home.hook('cal', calRows);
    Home.H.dressOK = dressOK;
    Town.addRoutes(routes);
    Town.place('hall', hall);
  }
  if (typeof document !== 'undefined') init();

  return { morningBeats: morningBeats, weekendBeats: weekendBeats, homeBeats: homeBeats, door: door, hoesikStart: hoesikStart, hoesik: hoesik, hall: hall, calRows: calRows };
}());
