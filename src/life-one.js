/* 그 사람: 문성훈. 집에서 그림을 그리는 프리랜서이고, 세 살 고양이와 산다.
   4/16 펫보험 상담 고객으로 처음 만나고, 4/22 동물병원 대기실에서 다시 마주친다(같은 동네에 산다).
   그다음은 약속이다. 4/26(일) 공원, 5/2(토) 영화와 카페, 5/5(화, 어린이날) 고양이를 보러 우리 집에.
   약속은 시간도 돈도 들고, 그동안 고양이는 집에 혼자 있다. 이 줄기를 따라가지 않아도 좋은 엔딩에 갈 수 있다.
   값은 Life(oneMeet, addAppt, dateOut), 대사는 Story.ONE, 여기서는 장면과 손짓. */
var One = (function () {
  'use strict';
  function S() { return G.s; }
  function say(l) { return UI.say(l); }
  function O() { return Story.ONE; }
  function H() { return Home.H; }
  function name(s) { return Story.contactName('one', s || S()); }
  function done(s, k) { return !!(s.one && s.one[k] !== undefined && s.one[k] !== null); }
  var SH = { v: 'customerA', hue: 100 }; // 그림이 오기 전까지는 4/16 상담 고객 그림을 빌려 쓴다

  // ---------- 4/16 상담이 끝나고 ----------
  // 고객님이 휴대폰 화면의 고양이를 보여 준다. 내 휴대폰(사진이 있으면)을 내밀거나, 고객님께 고개를 끄덕인다.
  function consultEnd(id, res) {
    var s = S(); if (id !== 'c10' || done(s, 'client')) return Promise.resolve();
    Life.oneMeet(s, 'client');
    var pick = null, me = { x: 470 }, one = { x: 380, dir: 1 }, phone = { x: 494, y: 236, w: 22, h: 30 };
    var can = (s.photos || []).length > 0;
    Work.office();
    G.hero.x = me.x; G.hero.dir = -1; G.hero.visible = true; G.hero.pose = null;
    var spots = function () {
      if (!can || pick) return [];
      return [
        { id: 'myPhone', x: phone.x - 4, y: phone.y - 4, w: phone.w + 8, h: phone.h + 8, pulse: true, tap: function () { pick = 'show'; return null; } },
        { id: 'oneNod', x: one.x - 22, y: 212, w: 44, h: 126, pulse: true, tap: function () { pick = 'nod'; return null; } }
      ];
    };
    Engine.setScene({
      place: 'office',
      draw: function (c) {
        Work.drawOffice(c);
        View.shadow(c, one.x, 337, 18); View.person(c, G, one.x, 336, SH.v, one.dir, G.t, 'stand', 2.35, SH.hue);
        Town.ph(c, one.x + 16, 232, 20, 28, '폰', '#b9c2c9');
        if (can && pick !== 'nod') Town.ph(c, phone.x, phone.y, phone.w, phone.h, '폰', pick === 'show' ? '#e8d6b8' : '#c9c6c0');
      },
      hot: spots
    });
    return Engine.fade(0, .3).then(function () { return say(O().end(s, !!(res && res.signed))); }).then(function () {
      if (!can) return say(O().noShow);
      Town.outline(2.4);
      return Engine.until(function () { return pick; }).then(function () {
        if (pick !== 'show') return say(O().noShow);
        UI.sfx('tap'); phone.x = 430; phone.y = 226;
        Life.oneMeet(s, 'show');
        return say(O().show(s)).then(function () { Town.heartPuff(one.x, 200); return Engine.sleep(.5); });
      });
    }).then(function () { return Engine.fade(1, .3); });
  }

  // ---------- 동물병원에 다녀온 날 ----------
  async function vetText() {
    var s = S(); if (!done(s, 'vet') || s.seen.oneVetText) return;
    s.seen.oneVetText = true;
    var m = O().vetText(s), t = Town.phoneTime();
    await Engine.sleep(.6);
    var k = await Phone.wait({ from: name(s), time: t.label, body: m.body, replies: m.replies, optional: true }, t.clock);
    if (k != null && (s.photos || []).length && !(s.sent || []).some(function (e) { return e.who === 'one'; })) await say(O().vetAfter);
  }

  // 낮(상담을 미루고)이나 저녁에 다녀왔으면 바로 보내지 않고, 집에서 시간이 좀 지난 뒤나 자러 갈 때 온다
  function vetLater() { var s = S(); if (done(s, 'vet') && !s.seen.oneVetText) s.seen.oneVetAt = s.minute + 100; }
  async function beforeBed() { var s = S(); if (s.seen.oneVetAt && !s.seen.oneVetText) await vetText(); }

  // ---------- 약속 ----------
  var APPT = {
    park: { invite: function () { return O().parkText; }, yes: function () { return O().parkYes; }, no: function () { return O().parkNo; }, day: 14, at: function () { return Life.DATE.park; }, place: 'park', go: function () { return O().parkGo; }, missed: function () { return O().missed; } },
    date: { invite: function () { return O().dateText; }, yes: function () { return O().dateYes; }, no: function () { return O().dateNo; }, day: 20, at: function () { return Life.DATE.movie; }, place: 'cinema', go: function () { return O().dateGo; }, missed: function () { return O().dateMissed; } },
    visit: { invite: function (s) { return O().visitText(s); }, yes: function () { return O().visitYes; }, no: function () { return O().visitNo; }, day: 23, at: function () { return Life.DATE.visit; }, place: 'home' }
  };
  // 언제 묻는지: 공원은 그날 아침, 영화는 4/30(목) 저녁, 집에 오는 건 5/3(일) 낮
  var ASK_ON = { park: 14, date: 18, visit: 21 };
  function canAsk(s, key) {
    if (s.day !== ASK_ON[key] || s.seen['oneAsk:' + key]) return false;
    if (key === 'park') return done(s, 'vet') && Life.oneBond(s) >= 1;
    if (key === 'date') return done(s, 'park');
    if (key === 'visit') return done(s, 'date');
    return false;
  }
  async function invite(key) {
    var s = S(), A = APPT[key]; if (!canAsk(s, key)) return;
    s.seen['oneAsk:' + key] = true;
    var m = A.invite(s), t = Town.phoneTime();
    var k = await Phone.wait({ from: name(s), time: t.label, body: m.body, replies: m.replies, optional: true }, t.clock);
    if (k === 0) Life.addAppt(s, key, A.day, A.at(), A.place);
    var back = k === 0 ? A.yes() : A.no();
    setTimeout(function () { Phone.drop({ from: name(s), time: Town.phoneTime(2).label, body: back }); }, 2200);
  }
  // 쉬는 날 아침 (깨어난 뒤): 그날 약속 / 묻는 문자
  async function weekendBeats() {
    var s = S();
    markPast(s);
    await invite('park');
    await invite('visit');
  }
  // 집에 돌아온 저녁: 아침에 병원에 다녀온 날의 문자, 영화 약속 문자
  async function homeBeats() {
    var s = S();
    markPast(s);
    if (done(s, 'vet') && s.vet && (s.vet.when === 'am' || s.vet.when === 'next')) await vetText();
    await invite('date');
  }
  // 지난 날의 약속은 지나간 대로 둔다
  function markPast(s) { (s.appts || []).forEach(function (a) { if (a.state === 'set' && a.day < s.day && APPT[a.key]) a.state = 'missed'; }); }

  // 지도: 약속 시각 한 시간 전부터 30분 뒤까지 그곳이 뜬다 (집에서 나설 때만)
  function routes(s, from) {
    if (from !== 'home' || s.phase !== 'weekend') return {};
    var a = Life.apptNow(s); if (!a || !APPT[a.key] || a.place === 'home') return {};
    var o = {}; o[a.place] = a.place === 'park' ? 10 : 20; return o;
  }
  // 집에 있는 동안: 갈 시간이 되면 한마디, 지나 버리면 문자 / 집에 오는 약속은 그 시각에 벨이 울린다
  function tick() {
    var s = S(), h = H(); if (!s || h.pro || h.mode === 'night') return;
    if (G.place !== 'living' && G.place !== 'bedroom') return;
    // 낮이나 저녁에 병원에 다녀온 날: 한두 시간 지나서 문자가 온다
    if (s.seen.oneVetAt && !s.seen.oneVetText && s.minute >= s.seen.oneVetAt && !G.acting && !UI.busy() && !Phone.busy() && h.waiter && h.waiter.types.indexOf('town') >= 0) { Town.go('oneVet'); return; }
    if (s.phase !== 'weekend') return;
    (s.appts || []).forEach(function (a) {
      if (a.state !== 'set' || a.day !== s.day || !APPT[a.key]) return;
      if (a.place === 'home') {
        // 약속 시각부터 45분 안에 집에 있으면 벨이 울린다. 그 뒤에는 돌아가고 문자를 남긴다.
        if (s.minute > a.at + 45 && !VS.on && !UI.busy()) {
          a.state = 'missed';
          Phone.drop({ from: name(s), time: Town.phoneTime(-5).label, body: O().visitMissed });
          return;
        }
        if (s.minute >= a.at && !G.acting && !UI.busy() && !Phone.busy() && h.waiter && h.waiter.types.indexOf('town') >= 0 && !VS.on) {
          VS.late = s.minute > a.at + 15;
          Town.go('visit');
        }
        return;
      }
      var k = 'oneGo:' + a.key;
      if (s.minute >= a.at - 60 && s.minute <= a.at + 30 && !s.seen[k]) { s.seen[k] = true; Home.queueLine({ key: k, text: APPT[a.key].go()[0].text }); Town.outline(2); }
      if (s.minute > a.at + 30 && !UI.busy()) {
        a.state = 'missed';
        Phone.drop({ from: name(s), time: Town.phoneTime(-10).label, body: APPT[a.key].missed() });
      }
    });
  }

  // ---------- 4/26(일) 공원 ----------
  async function park() {
    var s = S(), a = Life.appt(s, 'park'), D = Life.DATE;
    s.minute = Math.max(s.minute + 10, a.at);
    var one = { x: 330, y: 342, v: SH.v, hue: SH.hue, dir: -1 };
    Town.stage({
      title: '동네 공원', place: 'park', heroX: 250, dir: 1, bg: '#d7e3cc', floorFill: '#b9c7a6',
      boxes: [{ x: 0, y: 60, w: 640, h: 150, label: '나무 (연두색 잎)', fill: '#bcd2a9' }, { x: 470, y: 214, w: 110, h: 108, label: '편의점', fill: '#c9c6c0' }, { x: 120, y: 290, w: 150, h: 24, label: '벤치', fill: '#bdb7ad' }],
      people: [one]
    });
    await Engine.fade(0, .35);
    var r = Life.payAny(s, 'parkDrink', D.drink); UI.sfx(r.card ? 'tap' : 'spend');
    await say(O().park(s));
    Life.oneMeet(s, 'park'); Town.heartPuff(one.x, 200);
    Life.apptDone(s, 'park');
    s.minute += 90;
    await Engine.sleep(.4);
    await Engine.fade(1, .35);
    await Town.backIn(120);
    // 연락처 이름을 고친다
    s.one.renamed = true;
    Phone.rename(O().contact, O().near);
    await say(O().rename);
  }

  // ---------- 5/2(토) 영화와 카페 ----------
  async function date() {
    var s = S(), a = Life.appt(s, 'date'), D = Life.DATE;
    s.minute = Math.max(s.minute + 20, a.at);
    var one = { x: 330, y: 342, v: SH.v, hue: SH.hue, dir: -1 };
    Town.stage({ title: '역 앞 영화관', place: 'cinema', heroX: 250, dir: 1, bg: '#d4d0dc', boxes: [{ x: 60, y: 60, w: 520, h: 120, label: '상영관 입구', fill: '#bfb9c9' }], people: [one] });
    await Engine.fade(0, .35);
    await say(O().movie(s));
    s.minute += 120;
    await Engine.fade(1, .35);
    // 카페: 커피 두 잔과 케이크는 내가 산다
    var pick = null;
    var cafe = Town.stage({ title: '영화관 옆 카페', place: 'cinema', heroX: 230, dir: 1, pose: 'sit', heroY: 330, bg: '#e2d6c6',
      boxes: [{ x: 250, y: 270, w: 90, h: 22, label: '테이블', fill: '#cdb79a' }, { x: 470, y: 120, w: 140, h: 120, label: '파스타 집 간판', fill: '#d9c9b0', hide: true }, { x: 20, y: 120, w: 110, h: 200, label: '역 쪽 문', fill: '#c9c6c0', hide: true }],
      people: [{ x: 370, y: 330, v: SH.v, hue: SH.hue, dir: -1, pose: 'sit' }] });
    await Engine.fade(0, .35);
    var r = Life.payAny(s, 'dateCoffee', D.coffee); UI.sfx(r.card ? 'tap' : 'spend');
    await say(O().cafe(s));
    s.minute = Math.max(s.minute + 120, 1080);
    await say(O().dinnerAsk);
    // 저녁까지 먹을지(파스타 집), 들어갈지(역 쪽 문)
    var B = cafe.o.boxes; B[1].hide = false; B[2].hide = false;
    cafe.spots = [
      { id: 'dinner', x: B[1].x, y: B[1].y, w: B[1].w, h: B[1].h, pulse: true, tap: function () { pick = 'dinner'; return null; } },
      { id: 'goHome', x: B[2].x, y: B[2].y, w: B[2].w, h: B[2].h, pulse: true, tap: function () { pick = 'home'; return null; } }
    ];
    Town.outline(2.4);
    await Engine.until(function () { return pick; });
    cafe.spots = [];
    var dinner = pick === 'dinner';
    if (dinner) {
      var r2 = Life.payAny(s, 'dateDinner', D.dinner); UI.sfx(r2.card ? 'tap' : 'spend');
      await say(O().dinner(s));
      s.minute += 90;
    } else await say(O().goHome(s));
    s.minute += 20; // 지하철로 집까지
    Life.oneMeet(s, 'date'); Life.dateOut(s, dinner);
    Life.apptDone(s, 'date');
    await Engine.fade(1, .35);
    await Town.backIn(120);
  }

  // ---------- 5/5(화, 어린이날) 고양이를 보러 온다 ----------
  // 고양이는 소파 밑으로 숨는다. 성훈 씨 옆에 가만히 앉아 기다리면 나온다. 손을 뻗으면 더 깊이 들어간다.
  var VS = { on: false, x: 70, sat: false, t0: 0, peek: false, out: false, late: false, hint: false };
  var SOFA = { x: 380, y: 168, w: 162, h: 96 }, FLOOR = { x: 300, y: 270, w: 90, h: 70 };
  function drawVisitor(c) {
    if (!VS.on || H().room !== 'living') return;
    View.shadow(c, VS.x, 335, 18);
    View.person(c, G, VS.x, 334, SH.v, VS.dir || 1, G.t, VS.sit ? 'sit' : 'stand', 2.35, SH.hue);
    if (VS.hidden) {
      // 소파 밑으로 보이는 꼬리 (나오기 전에는 코끝이)
      View.r(c, 470, 258, 16, 3, '#d89553'); View.r(c, 484, 255, 4, 4, '#d89553');
      if (VS.peek) { View.r(c, 452, 254, 6, 4, '#e7b48a'); View.r(c, 450, 255, 2, 2, '#3a2a2a'); }
    }
  }
  function visitSpots() {
    if (VS.out) return [];
    return [
      { id: 'visitSit', x: FLOOR.x, y: FLOOR.y, w: FLOOR.w, h: FLOOR.h, pulse: !VS.sat, tap: function () {
        if (VS.sat) return null;
        return Engine.walkTo(FLOOR.x + FLOOR.w / 2).then(function () { G.hero.dir = 1; G.hero.pose = 'sit'; VS.sat = true; VS.t0 = G.t; });
      } },
      { id: 'visitGrab', x: SOFA.x + 50, y: SOFA.y + 70, w: 110, h: 34, tap: function () {
        VS.sat = false; VS.peek = false; G.hero.pose = null;
        return Engine.walkTo(470).then(function () { G.hero.dir = 1; return say(O().visit.grab(S())); }).then(function () { VS.t0 = G.t; });
      } }
    ];
  }
  async function visit() {
    var s = S(), h = H(), k = G.cat, V2 = O().visit, a = Life.appt(s, 'visit');
    Arc.stopMoment();
    VS.on = false; VS.sat = false; VS.peek = false; VS.out = false; VS.hidden = false; VS.hint = false; VS.sit = false;
    h.closeUp = null;
    if (h.room !== 'living') { await Engine.fade(1, .25); Home.enter('living', { mode: h.mode, heroX: 200 }); await Engine.fade(0, .25); }
    UI.sfx('knock');
    await say(V2.bell);
    await Engine.walkTo(140); G.hero.dir = -1;
    h.entranceOpen = 1; UI.sfx('door');
    VS.on = true; VS.x = 70; VS.dir = 1;
    await Engine.sleep(.3);
    if (VS.late) await say(V2.late);
    await say(V2.enter(s));
    // 고양이는 소파 밑으로
    if (!s.hidden) {
      h.catAct = 'still'; k.visible = true; k.room = 'living'; k.pose = 'walk';
      await Engine.catTo(470, { y: 336 });
    }
    k.visible = false; VS.hidden = true;
    h.entranceOpen = 0; UI.sfx('door');
    // 성훈 씨는 소파 앞 바닥에 앉는다
    await new Promise(function (resolve) { var x0 = VS.x, t0 = G.t; (function step() { var q = Math.min(1, (G.t - t0) / .9); VS.x = x0 + (400 - x0) * q; if (q < 1) setTimeout(step, 16); else resolve(); }()); });
    VS.sit = true; VS.dir = 1;
    await say(V2.wait(s));
    h.arcHot = visitSpots;
    Town.outline(2.4);
    var wait0 = G.t;
    await Engine.until(function () {
      if (!VS.sat && !VS.hint && G.t - wait0 > 9 && !UI.busy()) { VS.hint = true; say(V2.sitHint); }
      if (VS.sat && !VS.peek && G.t - VS.t0 > 4 && !UI.busy()) { VS.peek = true; say(V2.peek(s)); }
      return VS.sat && VS.peek && G.t - VS.t0 > 8 && !UI.busy();
    });
    // 한 발씩 다가와 성훈 씨 손끝에 코를 댄다
    VS.out = true; VS.hidden = false; h.arcHot = function () { return []; };
    k.visible = true; k.room = 'living'; k.x = 470; k.y = 300; k.pose = 'walk'; k.dir = -1;
    await Engine.catTo(430, { y: 300 });
    k.pose = 'sit';
    Life.visitOk(s);
    await say(V2.sniff(s));
    Town.heartPuff(VS.x, 200);
    await say(V2.promise(s));
    Life.oneMeet(s, 'visit');
    if (a) Life.apptDone(s, 'visit');
    s.minute += 90;
    // 돌아간다
    G.hero.pose = null; VS.sit = false; VS.dir = -1;
    await new Promise(function (resolve) { var x0 = VS.x, t0 = G.t; (function step() { var q = Math.min(1, (G.t - t0) / 1); VS.x = x0 + (70 - x0) * q; if (q < 1) setTimeout(step, 16); else resolve(); }()); });
    h.entranceOpen = 1; UI.sfx('door'); await Engine.sleep(.3);
    VS.on = false; h.entranceOpen = 0; UI.sfx('door');
    k.pose = 'walk'; await Engine.catTo(150, { y: 336 }); k.pose = 'sit'; k.dir = -1;
    await say(V2.bye(s));
    h.arcHot = null; h.catAct = null;
  }

  // ---------- 냉장고 달력 ----------
  var CAL = { park: '공원 산책 4시', date: '영화 2시 (성훈 씨)', visit: '성훈 씨 놀러 옴 3시' };
  function calRows(s) {
    return (s.appts || []).filter(function (a) { return a.state === 'set' && a.day >= s.day && CAL[a.key]; })
      .map(function (a) { return { date: Life.DAYS[a.day].date, text: CAL[a.key], red: a.day === s.day }; });
  }

  function init() {
    Home.hook('tick', tick);
    Home.hook('draw', { y: 334, f: drawVisitor });
    Home.hook('cal', calRows);
    Town.addRoutes(routes);
    Town.place('park', park);
    Town.place('cinema', date);
    Town.onRun('visit', visit);
    Town.onRun('oneVet', vetText);
  }
  if (typeof document !== 'undefined') init();

  return { consultEnd: consultEnd, vetText: vetText, vetLater: vetLater, beforeBed: beforeBed, weekendBeats: weekendBeats, homeBeats: homeBeats, invite: invite, park: park, date: date, visit: visit, calRows: calRows, VS: VS, APPT: APPT };
}());
