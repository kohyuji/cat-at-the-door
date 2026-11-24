/* 동네: 동네 지도, 빌라 복도, 지하철의 입사 동기, 부탁하기.
   사람 셋(옆집 할머니, 입사 동기 지안, 슈퍼 사장님)은 모두 주인공의 손짓으로 가까워진다.
   값은 Life(사람과 부탁), 대사는 Story.PEOPLE, 여기서는 장면과 손짓.
   새 사람과 장소는 그림이 오기 전까지 회색 상자와 이름표로 둔다. */
var Town = (function () {
  'use strict';
  function S() { return G.s; }
  function say(l) { return UI.say(l); }
  function PP() { return Story.PEOPLE; }
  function narr(t) { return { who: 'narr', text: t }; }
  // 그림 자리: 회색 상자와 이름표
  function ph(c, x, y, w, h, label, fill, ink) {
    View.box(c, x, y, w, h, fill || '#c9c6c0', ink || '#55505a', 2);
    if (label) View.text(c, label, x + w / 2, y + h / 2 + 4, 10, ink || '#55505a', 'center');
  }
  function spent(m, x, y) { if (m) Engine.puff({ x: x || G.hero.x, y: y || 220, icon: 'clock', text: '+' + m + '분', px: 1 }); }
  function heartPuff(x, y) { Engine.puff({ x: x, y: y, icon: 'heart', px: 1, life: 1.2 }); }
  // 휴대폰 시계는 지금 게임 시각을 12시간제로 (at: 장면이 정한 시각(분). 지점 안에서는 게임 시계가 멈춰 있다)
  function phoneTime(add, at) {
    var m = Math.round((at === undefined || at === null ? S().minute : at) + (add || 0)), h = Math.floor(m / 60) % 24, mm = m % 60, hh = (h % 12) || 12, t = hh + ':' + (mm < 10 ? '0' : '') + mm;
    return { clock: t, label: (h < 12 ? '오전 ' : '오후 ') + t };
  }
  function nameOf(who) { return Story.NAMES[who === 'boss' ? 'owner' : who]; }
  function outline(sec) { G.outlineAll = true; setTimeout(function () { G.outlineAll = false; }, (sec || 2.4) * 1000); }
  // 장면 안에서 고르기: 누른 자리의 id를 돌려준다
  function pickFrom(holder, spots) {
    var pick = null;
    holder.spots = spots.map(function (sp) { var o = {}; for (var k in sp) o[k] = sp[k]; o.tap = function () { pick = sp.id; return null; }; return o; });
    return Engine.until(function () { return pick; }).then(function () { holder.spots = []; return pick; });
  }

  // ---------- 동네 지도 ----------
  // 내 인형을 끌어서 가고 싶은 곳에 놓는다 (눌러도 된다). 멀수록 시계가 더 흐른다.
  // 창문: 모르는 사람의 창은 꺼져 있고, 아는 사람의 창은 희미하게, 가까운 사람의 창은 환하게 켜진다.
  // 우리 집 창은 집을 오래 비울수록 어둡다.
  var SPOT = {
    home: { x: 66, y: 232, w: 62, h: 76, label: '301호' },
    grandma: { x: 130, y: 232, w: 62, h: 76, label: '302호' },
    station: { x: 286, y: 272, w: 96, h: 50, label: '역' },
    shop: { x: 272, y: 150, w: 100, h: 64, label: '슈퍼' },
    branch: { x: 500, y: 34, w: 112, h: 110, label: '새솔지점' }
  };
  var VILLA = { x: 58, y: 196, w: 142, h: 120 };
  // 아직 모르는 곳: 사람을 알게 될 때마다 하나씩 밝아진다 (4단계)
  var DARK = [{ x: 52, y: 44, w: 132, h: 84 }, { x: 212, y: 52, w: 84, h: 58 }, { x: 352, y: 58, w: 92, h: 58 }, { x: 414, y: 178, w: 86, h: 58 }, { x: 498, y: 228, w: 116, h: 90 }];
  var ROADS = [['station', 'home'], ['station', 'shop'], ['shop', 'grandma'], ['station', 'branch']];
  var WIN = { mine: { x: 89, y: 244 }, grandma: { x: 153, y: 244 }, boss: { x: 336, y: 158 }, mate: { x: 560, y: 52 } };
  var MP = null;
  function center(id) { var r = SPOT[id]; return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  function foot(id) { var r = SPOT[id]; return { x: r.x + r.w / 2, y: r.y + r.h - 8 }; }
  // 갈 수 있는 곳과 드는 시간(분). 저녁에 역에서 내리면 집, 슈퍼, 옆집. 집에서 나서면 슈퍼, 옆집, 그대로 집.
  function routes(s, from) {
    var out = { home: 0 };
    if (from === 'station') out.shop = Life.T.shopStop;
    else if (!Life.doBlock(s, 'shop')) out.shop = Life.T.shopTrip;
    if (!Life.reachBlock(s, 'visit')) out.grandma = Life.REACH.visit[2];
    return out;
  }
  function windowColor(level) { return level >= 2 ? '#ffd970' : level === 1 ? '#b59a5c' : '#4a4754'; }
  function drawWindow(c, w, level, glow) {
    if (glow && level >= 2) View.lampGlow(c, w.x + 8, w.y + 6, 26, .35);
    View.box(c, w.x, w.y, 16, 12, windowColor(level), '#3a3640', 2);
  }
  function drawMap(c) {
    var s = S(), t = G.t;
    c.fillStyle = '#d9d6cf'; c.fillRect(0, 0, 640, 360);
    View.text(c, '동네 지도 (그림 자리)', 10, 16, 10, '#7a7480', 'left');
    c.lineCap = 'round';
    ROADS.forEach(function (r) { var a = center(r[0]), b = center(r[1]); c.strokeStyle = '#f2efe8'; c.lineWidth = 14; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); });
    DARK.forEach(function (d) { ph(c, d.x, d.y, d.w, d.h, '', '#8f8a92', '#6c6772'); });
    ph(c, VILLA.x, VILLA.y, VILLA.w, VILLA.h, '', '#c9c6c0');
    View.text(c, '우리 빌라', VILLA.x + VILLA.w / 2, VILLA.y + 18, 10, '#55505a', 'center');
    Object.keys(SPOT).forEach(function (id) {
      var r = SPOT[id], can = MP.to[id] !== undefined && id !== MP.at;
      ph(c, r.x, r.y, r.w, r.h, '', can ? '#efeae0' : '#c9c6c0');
      View.text(c, r.label, r.x + r.w / 2, r.y - 6, 10, '#55505a', 'center');
    });
    // 우리 집 창: 오래 비울수록 어둡다. 사람들의 창: 가까워진 만큼 밝다.
    drawWindow(c, WIN.mine, MP.away > .6 ? 2 : MP.away > .25 ? 1 : 0, true);
    drawWindow(c, WIN.grandma, Life.windowOf(s, 'grandma'), true);
    drawWindow(c, WIN.boss, Life.windowOf(s, 'boss'), true);
    drawWindow(c, WIN.mate, Life.windowOf(s, 'mate'), true);
    // 내 인형
    var p = MP.drag || MP.tok;
    View.shadow(c, p.x, p.y + 2, 10);
    View.person(c, G, p.x, p.y, s.wearing === 'suit' ? 'suit' : 'hoodie', 1, t, MP.drag || MP.moving ? 'walk' : 'stand', 1);
    if (MP.view === 'evening') View.nightTint(c, .22);
  }
  function destAt(p) {
    var hitId = null;
    Object.keys(MP.to).forEach(function (id) {
      if (id === MP.at) return;
      var r = SPOT[id];
      if (p.x >= r.x - 8 && p.x <= r.x + r.w + 8 && p.y >= r.y - 8 && p.y <= r.y + r.h + 8) hitId = id;
    });
    return hitId;
  }
  function goTo(id) {
    if (MP.moving || MP.done) return null;
    var from = { x: MP.tok.x, y: MP.tok.y }, to = foot(id), t0 = G.t, dur = .55;
    MP.moving = true; MP.drag = null; G.hand = null;
    return new Promise(function (resolve) {
      (function step() {
        var q = Math.min(1, (G.t - t0) / dur);
        MP.tok = { x: from.x + (to.x - from.x) * q, y: from.y + (to.y - from.y) * q };
        if (q < 1) setTimeout(step, 16); else { MP.moving = false; MP.done = id; resolve(); }
      }());
    });
  }
  function hotMap() {
    if (!MP || MP.moving || MP.done) return [];
    var list = [];
    Object.keys(MP.to).forEach(function (id) {
      if (id === MP.at) return;
      var r = SPOT[id], m = MP.to[id];
      list.push({ id: 'go-' + id, x: r.x, y: r.y, w: r.w, h: r.h, chips: m ? [Home.cMin(m)] : null, tap: function () { return goTo(id); } });
    });
    var p = MP.tok;
    list.push({ id: 'me', x: p.x - 16, y: p.y - 46, w: 32, h: 50, pulse: !MP.moved, drag: {
      start: function () { G.hand = null; },
      move: function (d) { MP.drag = { x: d.x, y: d.y + 20 }; },
      end: function (d) { MP.moved = true; var id = destAt({ x: d.x, y: d.y }); MP.drag = null; return id ? goTo(id) : null; },
      cancel: function () { MP.drag = null; }
    } });
    return list;
  }
  // from: 'station'(퇴근길) 또는 'home'(집에서 나섬). 고른 곳의 id를 돌려준다.
  function map(from) {
    var s = S(), at = from === 'station' ? 'station' : 'home';
    var away = from === 'station' ? Math.max(0, 1 - (Life.T.homeArrive - (s.left || Life.T.leaveBy)) / 720) : 1;
    MP = { from: from, at: at, to: routes(s, from), tok: foot(at), done: null, drag: null, moving: false, moved: false, away: away, view: s.phase === 'evening' || from === 'station' ? 'evening' : 'day' };
    Engine.setScene({ draw: drawMap, hot: hotMap, place: 'map' });
    var first = !s.seen.mapHint;
    return Engine.fade(0, .3).then(function () {
      if (!first) return null;
      s.seen.mapHint = true;
      var a = MP.tok, b = foot('home');
      G.hand = { x: a.x, y: a.y - 20, tx: b.x, ty: b.y - 20, period: 2.2, t0: G.t };
      return say(PP().mapHint);
    }).then(function () { return Engine.until(function () { return MP.done; }); })
      .then(function (id) { G.hand = null; return Engine.sleep(.2).then(function () { return Engine.fade(1, .3); }).then(function () { return id; }); });
  }

  // ---------- 빌라 복도 ----------
  var DOOR = { mine: { x: 150, y: 116, w: 74, h: 206 }, next: { x: 404, y: 116, w: 74, h: 206 } };
  var CR = { spots: [] };
  function drawCorridor(c) {
    var s = S(), t = G.t, h = G.hero;
    c.fillStyle = '#d8d4cc'; c.fillRect(0, 0, 640, 360);
    View.text(c, '빌라 복도 (그림 자리)', 10, 16, 10, '#7a7480', 'left');
    c.fillStyle = '#b7b1a6'; c.fillRect(0, 322, 640, 38);
    ph(c, DOOR.mine.x, DOOR.mine.y, DOOR.mine.w, DOOR.mine.h, '301호', CR.mineOpen ? '#6f6a64' : '#c9c6c0');
    ph(c, DOOR.next.x, DOOR.next.y, DOOR.next.w, DOOR.next.h, '302호', CR.nextOpen ? '#6f6a64' : '#c9c6c0');
    ph(c, 584, 120, 56, 202, '계단', '#bdb7ad');
    if (CR.gm) ph(c, CR.gm.x - 22, 214, 44, 108, '할머니', '#bfb6c9');
    if (h.visible) {
      View.shadow(c, h.x, 343, 20);
      View.person(c, G, h.x, 342 + (CR.bow ? 5 : 0), s.wearing === 'suit' ? 'suit' : 'hoodie', h.dir, t, h.walking ? 'walk' : 'stand', 2.35);
    }
    if (CR.carry) ph(c, h.x + 6 * h.dir - 16, 250, 32, 24, CR.carry, '#d9c39a');
    if (CR.key) { var k = CR.key; ph(c, k.x - 14, k.y - 10, 28, 20, '쪽지', '#f3e48a'); }
    if (Home.H.mode === 'evening' || Home.H.mode === 'night') View.nightTint(c, .12);
  }
  function enterCorridor(o) {
    CR = { mineOpen: !!o.mineOpen, nextOpen: false, gm: null, spots: [], carry: o.carry || null, key: null, bow: false };
    G.hero.x = o.heroX; G.hero.dir = o.dir || 1; G.hero.tx = null; G.hero.visible = true; G.hero.pose = null;
    Engine.setScene({ draw: drawCorridor, hot: function () { return CR.spots; }, place: 'corridor' });
  }
  function backHome() {
    return Engine.fade(1, .3).then(function () {
      Home.enter('living', { mode: Home.H.mode, heroX: 130 });
      G.hero.dir = 1;
      return Engine.fade(0, .3);
    });
  }
  // 302호 문을 두드리면 할머니가 나온다
  async function callNext() {
    await Engine.walkTo(DOOR.next.x - 30); G.hero.dir = 1;
    UI.sfx('knock'); await Engine.sleep(.9);
    CR.nextOpen = true; UI.sfx('door'); CR.gm = { x: DOOR.next.x + DOOR.next.w / 2 };
    await Engine.sleep(.3);
  }
  function gmGoesIn() {
    var gm = CR.gm; if (!gm) return Promise.resolve();
    var x0 = gm.x, x1 = DOOR.next.x + DOOR.next.w / 2, t0 = G.t;
    return new Promise(function (resolve) {
      (function step() {
        var q = Math.min(1, (G.t - t0) / .7); gm.x = x0 + (x1 - x0) * q;
        if (q < 1) setTimeout(step, 16); else { CR.gm = null; CR.nextOpen = false; UI.sfx('door'); resolve(); }
      }());
    });
  }
  // 현관 비밀번호: 가까운 사이가 된 할머니가 먼저 말을 꺼낸다. 비밀번호 쪽지를 건네거나, 내 문으로 돌아선다. (두 번까지 묻는다)
  async function keyOffer() {
    var s = S(), p = Life.person(s, 'grandma');
    if (p.key || p.bond < 2 || (s.seen.keyOffers || 0) >= 2 || !CR.gm) return;
    s.seen.keyOffers = (s.seen.keyOffers || 0) + 1;
    await say(PP().key.offer);
    CR.key = { x: G.hero.x + 26, y: 250 };
    outline();
    var pick = await pickFrom(CR, [
      { id: 'giveKey', x: CR.key.x - 18, y: CR.key.y - 16, w: 36, h: 32, pulse: true },
      { id: 'keepKey', x: DOOR.mine.x, y: DOOR.mine.y, w: DOOR.mine.w, h: DOOR.mine.h, pulse: true }
    ]);
    if (pick === 'giveKey') {
      var k = CR.key, x0 = k.x, x1 = CR.gm.x - 14, t0 = G.t;
      await new Promise(function (resolve) { (function step() { var q = Math.min(1, (G.t - t0) / .5); k.x = x0 + (x1 - x0) * q; if (q < 1) setTimeout(step, 16); else resolve(); }()); });
      CR.key = null; Life.giveKey(s); UI.sfx('tap');
      await say(PP().key.give(s));
      heartPuff(CR.gm.x, 200);
    } else {
      CR.key = null;
      await say(PP().key.keep(s));
    }
  }

  // 4/14 밤: 옆집에서 문을 두드린다. 고개를 숙여 사과하거나, 문을 닫는다.
  async function knock() {
    var s = S();
    UI.sfx('knock');
    await say([narr(PP().knock.sound)]);
    await Engine.fade(1, .3);
    enterCorridor({ heroX: DOOR.mine.x + DOOR.mine.w / 2 + 34, mineOpen: true });
    CR.gm = { x: DOOR.mine.x + DOOR.mine.w + 96 };
    await Engine.fade(0, .3);
    await say(PP().knock.open(s));
    outline(2.6);
    var pick = await pickFrom(CR, [
      { id: 'bow', x: G.hero.x - 24, y: 206, w: 48, h: 132, pulse: true },
      { id: 'shut', x: DOOR.mine.x, y: DOOR.mine.y, w: DOOR.mine.w, h: DOOR.mine.h, pulse: true }
    ]);
    if (pick === 'bow') {
      CR.bow = true; UI.sfx('tap'); await Engine.sleep(.7); CR.bow = false;
      var r = Life.reach(s, 'bow');
      await say(PP().knock.bow(s));
      heartPuff(CR.gm.x, 200); spent(r.minutes, G.hero.x, 200);
      await gmGoesIn();
      await Engine.sleep(.3);
    } else {
      await Engine.walkTo(DOOR.mine.x + DOOR.mine.w / 2);
      G.hero.visible = false; CR.mineOpen = false; UI.sfx('door');
      await say(PP().knock.shut(s));
    }
    await backHome();
  }
  // 옆집 택배를 대신 전해 드린다 (처음 만나는 자리가 되기도 한다)
  async function deliverParcel() {
    var s = S();
    s.seen.parcelAt = null;
    await Engine.fade(1, .3);
    enterCorridor({ heroX: DOOR.mine.x + DOOR.mine.w / 2 + 30, carry: '택배' });
    await Engine.fade(0, .3);
    await callNext();
    var first = !Life.person(s, 'grandma').met, r = Life.reach(s, 'parcel');
    CR.carry = null;
    await say(first ? PP().parcel.stranger(s) : PP().parcel.met(s));
    if (r.ok) { heartPuff(CR.gm.x, 200); spent(r.minutes, G.hero.x, 200); }
    await keyOffer();
    await gmGoesIn();
    await Engine.walkTo(DOOR.mine.x + DOOR.mine.w / 2);
    await backHome();
  }
  // 빈 반찬통을 돌려드린다
  async function returnDish() {
    var s = S();
    s.dish = null;
    await Engine.fade(1, .3);
    enterCorridor({ heroX: DOOR.mine.x + DOOR.mine.w / 2 + 30, carry: '반찬통' });
    await Engine.fade(0, .3);
    await callNext();
    var owed = !!Life.person(s, 'grandma').owe, r = Life.reach(s, 'dish');
    CR.carry = null;
    if (owed) await say([PP().repaid.grandma]);
    await say(PP().dish.back(s));
    if (r.ok) { heartPuff(CR.gm.x, 200); spent(r.minutes, G.hero.x, 200); }
    await keyOffer();
    await gmGoesIn();
    await Engine.walkTo(DOOR.mine.x + DOOR.mine.w / 2);
    await backHome();
  }
  // 찾아가 인사드리기 (지도에서 302호). outside: 퇴근길에 집에 들어가기 전에 들른다
  async function visit(outside) {
    var s = S(), owed = !!Life.person(s, 'grandma').owe;
    enterCorridor({ heroX: outside ? 600 : DOOR.mine.x + DOOR.mine.w / 2 + 30, dir: outside ? -1 : 1 });
    await Engine.fade(0, .3);
    await callNext();
    var r = Life.reach(s, 'visit'), n = s.seen.visits || 0;
    s.seen.visits = n + 1;
    if (owed) await say([PP().repaid.grandma]);
    await say(PP().visit[n % PP().visit.length](s));
    if (r.ok) { heartPuff(CR.gm.x, 200); spent(r.minutes, G.hero.x, 200); }
    await keyOffer();
    await gmGoesIn();
    await Engine.walkTo(DOOR.mine.x + DOOR.mine.w / 2);
    if (outside) { G.hero.pose = 'back'; UI.sfx('door'); await Engine.fade(1, .3); G.hero.pose = null; return; }
    await backHome();
  }

  // ---------- 우리 집 현관에 놓이는 것 ----------
  // 택배 상자(4/16 그날 저녁만), 할머니의 반찬통(가득 / 빈 통)
  var HOME_SPOT = { parcel: { x: 58, y: 304 }, dish: { x: 92, y: 300 } };
  function homeOK() { var s = S(), H = Home.H; return !!s && !H.pro && Life.homeTime(s) && H.mode !== 'night' && !H.closeUp; }
  function drawHome(c) {
    var s = S(), H = Home.H; if (!s || H.pro || H.room !== 'living') return;
    if (s.seen.parcelAt) ph(c, HOME_SPOT.parcel.x - 18, HOME_SPOT.parcel.y - 22, 36, 26, '택배', '#d9c39a');
    if (s.dish) ph(c, HOME_SPOT.dish.x - 16, HOME_SPOT.dish.y - 16, 32, 18, s.dish === 'full' ? '반찬' : '빈 통', s.dish === 'full' ? '#e7d0a6' : '#e4e0d8');
  }
  // 복도로 나가는 일(택배, 빈 통)은 저녁 기다림을 'town'으로 끝내고, 저녁 흐름이 run()으로 이어 간다.
  // (누른 행동 안에서 복도 장면을 열면, 복도에서 또 눌러야 하는 곳이 막힌다)
  var GO = { next: null };
  function outTo(kind, x) {
    return function () {
      return Engine.walkTo(x).then(function () { GO.next = kind; if (!Home.resolveWait('town')) GO.next = null; });
    };
  }
  function homeSpots(room) {
    var s = S(), H = Home.H; if (room !== 'living' || !homeOK()) return [];
    var list = [], out = !!H.waiter && H.waiter.types.indexOf('town') >= 0;
    if (out && s.seen.parcelAt === s.day) list.push({ id: 'parcel', x: HOME_SPOT.parcel.x - 20, y: HOME_SPOT.parcel.y - 26, w: 40, h: 30, chips: [Home.cMin(Life.REACH.parcel[2])], tap: outTo('parcel', HOME_SPOT.parcel.x + 20) });
    if (s.dish === 'full' && !Life.eatBlock(s)) list.push({ id: 'dish', x: HOME_SPOT.dish.x - 18, y: HOME_SPOT.dish.y - 20, w: 36, h: 24, chips: [Home.cMin(Life.T.banchan), Home.cBolt(1)], tap: eatDish });
    if (out && s.dish === 'empty' && !Life.reachBlock(s, 'dish')) list.push({ id: 'dishBack', x: HOME_SPOT.dish.x - 18, y: HOME_SPOT.dish.y - 20, w: 36, h: 24, chips: [Home.cMin(Life.REACH.dish[2])], tap: outTo('dish', HOME_SPOT.dish.x + 20) });
    return list;
  }
  // 저녁 흐름에서 부른다: 방금 고른 복도 일을 한다
  function run() {
    var k = GO.next; GO.next = null;
    if (k === 'parcel') return deliverParcel();
    if (k === 'dish') return returnDish();
    return Promise.resolve();
  }
  function eatDish() {
    var s = S();
    return Engine.walkTo(HOME_SPOT.dish.x + 24).then(function () {
      var r = Life.eat(s, 'banchan'); if (!r.ok) return null;
      s.dish = 'empty'; UI.sfx('tap');
      spent(r.minutes, HOME_SPOT.dish.x, 250);
      return say(PP().dish.eat);
    });
  }

  // ---------- 집에 돌아온 저녁의 사람 일 ----------
  async function homeBeats() {
    var s = S(), H = Home.H;
    // 늦게 들어온 밤에 다녀간 흔적
    if (s.events.some(function (e) { return e.key === 'helperFed' && e.day === s.day; }) && !s.seen['fedNote' + s.day]) {
      s.seen['fedNote' + s.day] = true;
      await say(PP().fedNote(s));
    }
    // 4/14: 문 두드리는 소리
    if (s.day === 2 && !s.seen.knock) { s.seen.knock = true; await knock(); }
    // 4/16: 잘못 온 택배
    if (s.day === 4 && !s.seen.parcel) { s.seen.parcel = true; s.seen.parcelAt = s.day; await say(PP().parcel.notice); }
    // 가까워진 뒤: 문고리에 걸린 반찬통
    if (s.day >= Life.DISH_FROM && !s.seen.dish && Life.person(s, 'grandma').bond >= 2 && Life.day(s).kind === 'work') {
      s.seen.dish = true; s.dish = 'full'; UI.sfx('page'); await say(PP().dish.notice);
    }
    // 4/27: 실적이 모자란 동기
    if (s.day === 15 && !s.seen.refer && Life.person(s, 'mate').met) { s.seen.refer = true; await referText(); }
  }
  async function referText() {
    var s = S(), m = PP().refer.text, next = Life.nextWorkDay(s.day), give = next > 0 ? Life.clientsOn(next, s)[0] : null;
    var now = phoneTime();
    var k = await UI.phoneWait({ from: m.from, time: now.label, preview: m.preview, body: m.body, replies: give ? [m.yes, m.no] : [m.no] }, now.clock);
    if (!give || k !== 0) return;
    s.gave = give; s.cards = (s.cards || []).filter(function (id) { return id !== give; });
    Life.reach(s, 'refer');
    var t = PP().refer.thanks, later = phoneTime(4);
    await UI.phoneWait({ from: t.from, time: later.label, preview: t.preview, body: t.body }, later.clock);
    await say(PP().refer.gave);
  }

  // ---------- 지하철: 4/13 첫 출근 ----------
  // 옆에 선 사람(우리 회사 서류 봉투)이 내 소매의 털을 본다. 먼저 말을 걸거나, 소매를 털고 창밖을 본다.
  var TR = { spots: [] };
  async function train() {
    var s = S(), mateX = 354;
    G.hero.x = 300; G.hero.tx = null; G.hero.dir = 1; Work.Wk.dark = false;
    TR = { spots: [] };
    Engine.setScene({
      place: 'train',
      draw: function (c) { Work.drawTrain(c); ph(c, mateX - 20, 216, 40, 128, '동기', '#bfb6c9'); },
      hot: function () { return TR.spots; }
    });
    await Engine.fade(0, .35);
    await Engine.sleep(.6);
    await say(PP().train.see);
    outline(2.6);
    var pick = await pickFrom(TR, [
      { id: 'mate', x: mateX - 22, y: 214, w: 44, h: 132, pulse: true },
      { id: 'sleeve', x: G.hero.x - 6, y: 236, w: 34, h: 44, pulse: true }
    ]);
    if (pick === 'mate') {
      Life.reach(s, 'talk');
      await say(PP().train.talk(s));
      heartPuff(mateX, 200);
    } else await say(PP().train.brush);
    await Engine.sleep(.4);
    await Engine.fade(1, .35);
  }

  // ---------- 점심: 지안의 문자 ----------
  async function lunch() {
    var s = S();
    if (Life.LUNCH_DAYS.indexOf(s.day) < 0 || s.seen['lunch' + s.day]) return;
    s.seen['lunch' + s.day] = true;
    Work.office(); s.minute = Math.max(s.minute, 725);
    await Engine.fade(0, .3);
    var p = Life.person(s, 'mate'), m = PP().lunch.text(s, !p.met), can = !Life.reachBlock(s, 'lunch');
    var k = await UI.phoneWait({ from: m.from, time: m.time, preview: m.preview, body: m.body, replies: can ? [m.yes, m.no] : [m.no] }, '12:05');
    if (can && k === 0) {
      var r = Life.reach(s, 'lunch');
      if (r.ok) { UI.sfx('spend'); var n = s.seen.lunches || 0; s.seen.lunches = n + 1; await say(PP().lunch.after[n % PP().lunch.after.length]); }
    }
    await Engine.fade(1, .3);
  }

  // ---------- 부탁하기 (청하는 손) ----------
  function askVia(kind, at) {
    var s = S(), A = PP().ask[kind], now = phoneTime(0, at);
    return UI.phoneAsk({
      list: Life.helpers(s, kind).map(function (w) { return { id: w, name: nameOf(w) }; }),
      draft: function (w) { return A[w](s); },
      reply: function (w) { return A.reply[w]; },
      clock: now.clock, time: now.label
    }).then(function (who) {
      if (!who) return null;
      return Life.ask(s, kind, who).ok ? who : null;
    });
  }
  // 늦는 밤: 고양이 저녁을 부탁한다. 부탁할 사람이 없으면 연락처가 비어 있다.
  async function askCat(at) {
    var s = S(), none = !Life.helpers(s, 'cat').length;
    await say(PP().think.cat(s));
    var who = await askVia('cat', at);
    if (!who && none) await say(PP().think.catNobody(s));
    return who;
  }
  // 아침: 어젯밤 못 갖다드린 택배는 나가는 길에 옆집 문 앞에 둔다
  async function morningBeats() {
    var s = S();
    if (s.seen.parcelAt && s.seen.parcelAt < s.day) { s.seen.parcelAt = null; await say(PP().parcel.left); }
    await askCover();
  }
  // 4/20 알람이 고장 난 아침: 동기에게 첫 고객님을 붙잡아 달라고 한다
  async function askCover() {
    var s = S();
    if (s.alarm !== 'late' || !Life.helpers(s, 'cover').length) return null;
    await say(PP().think.cover);
    return askVia('cover');
  }
  // 4/29 야근: 남기로 한 뒤, 동기에게 서류를 나눠 달라고 하고, 고양이 밥을 부탁한다
  async function lateAsks(work) {
    var s = S();
    if (work && Life.helpers(s, 'work').length) {
      await say(PP().think.work);
      if (await askVia('work')) await say(PP().helped.work);
    }
    await askCat();
  }
  // 요금 날 돈이 모자라면: 사장님께 빌려 달라고 해 볼 수 있다
  async function askMoney(bill) {
    var s = S();
    if (s.wallet >= bill.amount || !Life.helpers(s, 'money').length) return null;
    await say(PP().think.money(s, Story.BILL[bill.id].name, bill.amount));
    var who = await askVia('money');
    if (who) { UI.sfx('coin'); await say(PP().helped.money); }
    return who;
  }

  return {
    map: map, visit: visit, knock: knock, train: train, lunch: lunch, homeBeats: homeBeats, homeSpots: homeSpots, drawHome: drawHome,
    askCat: askCat, askCover: askCover, morningBeats: morningBeats, run: run, lateAsks: lateAsks, askMoney: askMoney, phoneTime: phoneTime,
    SPOT: SPOT
  };
}());
