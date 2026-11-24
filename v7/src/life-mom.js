/* 휴대폰과 게임을 잇는 곳, 그리고 엄마 줄기.
   - Phone이 묻는 것(오늘 날짜, 누구와 나눈 대화인지, 사진, 은행)에 게임 상태로 답한다.
   - 엄마: 답하지 않은 문자 37통이 쌓인 대화방. 고양이 사진 한 장이 첫 답장이 된다.
     사진을 받은 엄마가 전화를 걸어 오고, 반찬을 부치고, 어버이날(5/8 금요일, 출근하는 날) 아침에 전화할 수 있다.
   값은 Life(momTouch, momSend, momOpen), 글은 Story.MOM, 여기서는 장면과 휴대폰. */
var Mom = (function () {
  'use strict';
  function S() { return G.s; }
  function say(l) { return UI.say(l); }
  function M() { return Story.MOM; }
  function me(t) { return { who: 'me', text: t }; }
  function narr(t) { return { who: 'narr', text: t }; }
  function pro() { return !!(G.pro && G.pro.active); }
  function atHome() { return G.place === 'living' || G.place === 'bedroom'; }
  function now(add) { return Town.phoneTime(add || 0); }
  // 그림 자리: 회색 상자와 이름표
  function ph(c, x, y, w, h, label) {
    View.box(c, x, y, w, h, '#c9c6c0', '#55505a', 2);
    if (label) View.text(c, label, x + w / 2, y + h / 2 + 4, 10, '#55505a', 'center');
  }

  // ---------- 날짜 ----------
  var PRO_REJECT = [2025, 12, 2], PRO_OFFER = [2026, 4, 8];
  function today() {
    if (pro()) return G.pro.ymd || PRO_REJECT;
    var s = S(); if (!s) return [2026, 4, 12];
    var d = Life.day(s).date.split('/'); return [2026, +d[0], +d[1]];
  }
  // 새 판의 휴대폰: 엄마의 문자와 부재중 전화가 쌓여 있다. played: 프롤로그를 이미 지난 저장이면 그때 받은 두 문자도 넣는다.
  function fresh(me, played) {
    var log = M().unread.map(function (m) { return { c: '엄마', ymd: [m[0], m[1], m[2]], time: m[3], dir: 'in', text: m[4], u: true, old: true }; });
    var calls = M().missed.map(function (m) { return { c: '엄마', ymd: [m[0], m[1], m[2]], time: m[3], kind: 'missed', n: 1, old: true }; });
    // 대학 친구 은지의 모바일 청첩장 (읽고 답하지 않았다)
    var wc = Story.WED.card;
    log.push({ c: wc.from, ymd: wc.ymd.slice(), time: wc.time, dir: 'in', text: wc.body, u: false, old: true });
    if (played) {
      var rej = Story.phone.rejection(me), off = Story.phone.offer(me);
      log.push({ c: rej.from, ymd: PRO_REJECT, time: rej.time, dir: 'in', text: rej.body });
      log.push({ c: off.from, ymd: PRO_OFFER, time: off.time, dir: 'in', text: off.body });
    }
    return { log: log, calls: calls };
  }

  // ---------- 연락처 ----------
  var PERSONS = ['집주인', '새솔지점 지점장', '윤순자 사장님', '은지'];
  function idOf(c) {
    if (c === Story.ONE.contact || c === Story.ONE.near) return 'one';
    for (var k in Story.CONTACT) if (Story.CONTACT[k] === c) return k;
    return null;
  }
  function contact(c) {
    var id = idOf(c), s = S();
    if (!id) return { person: PERSONS.indexOf(c) >= 0 || / 고객님$/.test(c) };
    if (!s || pro()) return { id: id, person: true };
    var p = Life.person(s, id) || {};
    // 사진을 보낼 수 있는 방: 엄마는 처음부터, 할머니는 번호를 저장한 뒤(현관 비밀번호를 알려 드린 날), 다른 사람은 알게 된 뒤
    var send = id === 'mom' ? true : id === 'grandma' ? !!p.key : !!p.met;
    return { id: id, person: true, face: p.bond >= 2, send: send };
  }

  // ---------- 카메라와 사진 ----------
  function canCamera() {
    var s = S(), h = Home.H;
    return !!s && !pro() && atHome() && Life.homeTime(s) && h.mode !== 'night' && !h.closeUp && !h.lock && !h.pro;
  }
  function catInView() { var k = G.cat; return !!k && k.visible && k.room === Home.H.room && !S().hidden; }
  function focus() {
    if (catInView()) return { x: G.cat.x, y: G.cat.y - 14 };
    return { x: G.hero.x, y: G.hero.y - 50 };
  }
  function camOpen() { if (catInView()) { G.hero.dir = G.cat.x >= G.hero.x ? 1 : -1; G.hero.pose = null; } }
  function shot() {
    var s = S(), mo = Arc.moment();
    var kind = mo && mo.ready ? mo.kind : catInView() ? 'cat' : 'room';
    var r = Life.photo(s, { kind: kind, pose: G.cat.pose });
    if (!r.ok) return null;
    if (mo && mo.ready) Arc.shotTaken();
    if (r.n === 1) { Home.queueLine({ key: 'photoFirst', text: '잘 나왔다.' }); Home.queueLine({ key: 'photoWho', text: '...보여 줄 사람이 있나.' }); }
    return { id: r.id };
  }
  // 사진을 보냈다. 엄마의 답은 Story.MOM.photoReply, 처음 한 장에는 문자 대신 전화가 온다.
  var OTHER = {
    mate: { first: '헐 너무 귀여워요ㅠㅠ 출근할 때 이 얼굴 두고 나오기 힘들겠어요', more: ['ㅋㅋㅋ 표정 뭐예요', '오늘도 귀엽네요ㅎㅎ', '이거 저장해도 돼요?'] },
    grandma: { first: '아이고 이뻐라. 밥은 잘 먹지?', more: ['이쁘네', '잘 크는구나', '고양이도 주인 닮는다더니'] },
    boss: { first: '잘 지내네ㅎㅎ 그때 비 맞던 그 녀석 맞지?', more: ['ㅎㅎ 좋네', '사료 떨어지면 가게 들러', '얼굴 좋아졌네'] }
  };
  function photoSent(c, id) {
    var s = S(), k = contact(c); if (!k.id || pro()) return [];
    var r = Life.sendPhoto(s, id, k.id); if (!r.ok) return [];
    if (k.id !== 'mom') {
      var o = k.id === 'one' ? { first: Story.ONE.photoFirst(s), more: Story.ONE.photoMore(s) } : OTHER[k.id];
      return [r.first ? o.first : o.more[(s.sent.length + s.day) % o.more.length]];
    }
    if (r.first) { Phone.afterClose(function () { setTimeout(firstCall, 1600); }); return []; }
    var fromParcel = r.kind === 'box' && s.mom.opened !== null && s.box === s.mom.opened;
    var lines = M().photoReply(s, r, fromParcel).slice();
    if (r.up && r.bond >= 2 && s.mom.parcel === null) { var d = Life.momSend(s); if (d !== null) lines.push(M().parcelText(s, d)); }
    return lines;
  }

  // ---------- 은행 ----------
  var BILL_STATUS = { paid: 'paid', deferred: 'deferred', late: 'late' };
  function bank() {
    var s = S();
    if (!s || pro()) return { wallet: G.pro ? G.pro.wallet : 0, out: [], pending: null, lost: 0, borrowed: [], canCash: false, cash: Life.CASH.amount };
    var out = Life.BILLS.filter(function (b) { return s.day >= b.notice; }).map(function (b) {
      var st = s.bills[b.id], status = st === 'none' ? (s.day >= b.due ? (b.auto ? 'unpaid' : 'due') : 'soon') : st === 'paid' ? (b.auto ? 'paid' : 'sent') : BILL_STATUS[st] || 'soon';
      return { id: b.id, date: Life.DAYS[b.due].date, name: Story.BILL[b.id].name, amount: b.amount, status: status };
    });
    var lost = s.pending.reduce(function (n, e) { return n + (e.status !== 'active' ? e.amount : 0); }, 0);
    var borrowed = [];
    if (s.borrowed && !s.borrowed.back) borrowed.push({ when: Life.DAYS[s.borrowed.day].date, name: Story.CONTACT[s.borrowed.who] || '', note: '5/8에 갚기', amount: s.borrowed.amount });
    if (s.loan && !s.paid) borrowed.push({ when: Life.DAYS[s.loan.day].date, name: '카드 현금서비스', note: '이자 포함, 다음 카드값', amount: s.loan.amount + Life.loanInterest(s) });
    if (s.card && s.card.amount && !s.card.back) borrowed.push({ when: Life.DAYS[s.card.items[0].day].date, name: '신용카드', note: s.card.items.map(function (x) { return Story.ITEM[x.item]; }).join(', ') + ' · 다음 카드값', amount: s.card.amount });
    return { wallet: s.wallet, out: out, pending: s.paid ? 0 : Life.pendingTotal(s), lost: lost, borrowed: borrowed, canCash: Life.canCash(s) && !s.paid, cash: Life.CASH.amount };
  }
  function cashText() { Phone.drop({ from: '은행', time: now().label, body: Story.MONEY.cashSms(Life.CASH.amount) }); }
  function cash() {
    var s = S(); if (!s || pro()) return false;
    var r = Life.cashService(s); if (!r.ok) return false;
    cashText();
    return true;
  }

  // ---------- 전화 ----------
  function talkedToday(s) { return s.mom.touch && s.mom.touch.talk === s.day; }
  function canCall(c) {
    var s = S();
    // 집에 있을 때 (출근 전 아침도), 하루 한 통
    if (c !== '엄마' || !s || pro() || !atHome() || !(Life.homeTime(s) || s.phase === 'morning') || Home.H.mode === 'night') return false;
    return !talkedToday(s);
  }
  function spentPuff(m) { if (m) Engine.puff({ x: G.hero.x, y: 220, icon: 'clock', text: '+' + m + '분', px: 1 }); }
  // 통화 한 통: 통화 막대를 띄우고, 대사를 나누고, 끝나면 막대를 내린다
  async function talk(run) {
    Phone.callStart('엄마');
    try { await run(); } finally { Phone.callEnd(); }
  }
  async function pick(options) { return Phone.callPick(options); }
  // 내가 건다
  async function call() {
    var s = S(), bond = Life.momBond(s), d = Life.day(s);
    if (d.final) return parentsDay();
    if (bond < 1) { await say(M().hesitate); return; }
    var r = null;
    await talk(async function () {
      // 첫 통화는 '웬일이야'로 시작하고, 그다음부터는 나머지 이야기를 돌아가며
      var n = s.seen.momChats || 0, L = M().chat.length; s.seen.momChats = n + 1;
      var lines = M().chat[n === 0 ? 0 : 1 + (n - 1) % (L - 1)](s);
      r = Life.momTouch(s, 'call');
      // 가까워져서 반찬을 부친다: 끊는 인사('...자라') 앞에 끼운다
      if (r.bond >= 2 && s.mom.parcel === null && Life.momSend(s) !== null) {
        var at = /자라\.$/.test(lines[lines.length - 1].text) ? lines.length - 1 : lines.length;
        Array.prototype.splice.apply(lines, [at, 0].concat(M().parcelCall));
      }
      await say(lines);
    });
    spentPuff(r && r.minutes);
  }
  // 사진 한 장을 받은 엄마가 바로 전화를 걸어 온다. 안 받으면 문자가 온다.
  async function firstCall() {
    var s = S(); if (!s || pro()) return;
    var r = await Phone.incoming('엄마', 25);
    if (r !== 'answer') {
      setTimeout(function () { Phone.drop({ from: '엄마', time: now(1).label, body: M().declined }); }, 2600);
      return;
    }
    var F = M().firstCall;
    await talk(async function () {
      await say(F.open(s));
      var k = await pick(F.picks);
      s.mom.knows = k === 0;
      await say(k === 0 ? F.told : F.hid);
      var t = Life.momTouch(s, 'answer'), parcel = false;
      if (t.bond >= 2 && s.mom.parcel === null) parcel = Life.momSend(s) !== null;
      await say(F.close(s, parcel));
      spentPuff(t.minutes);
    });
  }
  // 5/8 어버이날 아침
  async function parentsDay() {
    var s = S(), bond = Life.momBond(s), talked = s.mom.called, P = M().parentsDay;
    await talk(async function () {
      await say(P.open(s, bond, talked));
      var k = await pick(P.picks(bond));
      s.mom.hard = k === 1;
      await say(k === 1 ? P.hard(s) : P.fine(s, bond));
    });
    s.seen.parentsCall = true;
    var r = Life.momTouch(s, 'call'); spentPuff(r.minutes);
  }

  // ---------- 문자 ----------
  // 4/17 금요일 밤 (Arc.homeBeats에서): 답하지 않고 닫아도 된다
  async function text417() {
    var s = S(), H = Home.H, k = G.cat, bond = Life.momBond(s), t = now();
    var pickN = await Phone.wait({ from: '엄마', time: t.label, body: M().text417(s, bond), replies: M().reply417(bond), optional: true }, t.clock);
    if (pickN != null) Life.momTouch(s, 'reply');
    var back = M().back417(s, bond, pickN);
    if (back) setTimeout(function () { Phone.drop({ from: '엄마', time: now(2).label, body: back }); }, 3000);
    var lines = M().after417(s, bond, pickN);
    if (lines.length > 1) await say([lines[0]]);
    if (!s.hidden) {
      H.catAct = 'still'; k.pose = 'walk';
      await Engine.catTo(Math.min(540, G.hero.x + 30), { y: 336 });
      k.dir = -1; k.pose = 'rub'; UI.sfx('purr');
      await say([lines[lines.length - 1]]);
      H.catAct = null;
    }
  }
  // 집에 돌아온 저녁 (Town.homeBeats 다음)
  async function homeBeats() {
    var s = S();
    // 반찬 택배가 온 날: 상자를 들고 들어온다. 엄마는 낮에 배송 완료 문자를 받았다.
    if (s.mom.parcel === s.day && s.mom.opened === null && s.mom.got !== s.day) {
      s.mom.got = s.day;
      await say(M().parcelNotice);
      Phone.drop({ from: '엄마', time: '오후 2:40', body: M().parcelGot, quiet: true });
    }
    // 4/28 화요일 밤: 어버이날
    if (s.day === 16 && !s.seen.mom428) {
      s.seen.mom428 = true;
      var t = now();
      if (Life.momBond(s) < 1) { Phone.drop({ from: '엄마', time: t.label, body: M().text428 }); return; }
      var k = await Phone.wait({ from: '엄마', time: t.label, body: M().text428, replies: M().reply428, optional: true }, t.clock);
      if (k != null) {
        Life.momTouch(s, 'reply');
        if (k === 0) s.mom.promised = true;
        setTimeout(function () { Phone.drop({ from: '엄마', time: now(2).label, body: M().back428[k] }); }, 3000);
      }
    }
  }
  // 5/8 아침: 오늘은 어버이날이다 (출근 전에 전화할 수 있다)
  async function morningBeats() {
    var s = S(); if (!Life.day(s).final || s.seen.parentsMorning) return;
    s.seen.parentsMorning = true;
    await say(M().morning(s));
    UI.point($('phoneButton'));
    setTimeout(function () { if ($('phone').hidden) UI.point(null); }, 6000);
  }
  function $(id) { return document.getElementById(id); }
  // 5/8 점심: 전화하지 않았으면 엄마가 먼저 문자한다
  function lunch() {
    var s = S(); if (!Life.day(s).final || talkedToday(s) || s.seen.momNoCall) return Promise.resolve();
    s.seen.momNoCall = true;
    Phone.drop({ from: '엄마', time: '오후 12:20', body: M().noCall });
    return Promise.resolve();
  }

  // ---------- 집: 반찬 택배와 냉장고 ----------
  var PARCEL = { x: 40, y: 298, w: 46, h: 34 }, FRIDGE = { x: 314, y: 180, w: 62, h: 78 }; // 현관 매트 앞 바닥, 냉장고 아래 칸
  function parcelHere(s) { return s.mom.parcel !== null && s.day >= s.mom.parcel && s.mom.opened === null && s.mom.got !== null; }
  function drawHome(c) {
    var s = S(), h = Home.H; if (!s || h.pro || h.room !== 'living') return;
    if (parcelHere(s)) ph(c, PARCEL.x, PARCEL.y, PARCEL.w, PARCEL.h, '엄마 택배');
  }
  function homeSpots(room) {
    var s = S(), h = Home.H, out = [];
    if (!s || h.pro || room !== 'living' || !Life.homeTime(s)) return out;
    if (parcelHere(s)) out.push({ id: 'momParcel', x: PARCEL.x - 4, y: PARCEL.y - 6, w: PARCEL.w + 8, h: PARCEL.h + 10, pulse: true, tap: openParcel });
    if (s.mom.food > 0 && !Life.eatBlock(s)) out.push({ id: 'momFood', x: FRIDGE.x, y: FRIDGE.y, w: FRIDGE.w, h: FRIDGE.h, chips: [Home.cMin(Life.T.banchan), Home.cBolt(1)], tap: eatFood });
    return out;
  }
  function openParcel() {
    var s = S();
    return Engine.walkTo(130).then(function () {
      G.hero.dir = -1;
      var r = Life.momOpen(s); if (!r.ok) return null;
      UI.sfx('page');
      return say(M().parcelOpen).then(function () { UI.sfx('good'); return say([me('냉장고에 넣어 두자.')]); });
    });
  }
  function eatFood() {
    var s = S();
    return Engine.walkTo(FRIDGE.x + FRIDGE.w / 2).then(function () {
      var r = Life.eat(s, 'mom'); if (!r.ok) return null;
      G.hero.pose = 'back'; UI.sfx('tap');
      return Engine.sleep(.8).then(function () {
        G.hero.pose = null; spentPuff(r.minutes);
        if (!s.seen.momEat) { s.seen.momEat = true; return say(M().eat); }
        return null;
      });
    });
  }

  // ---------- 휴대폰에 잇기 ----------
  function init() {
    Phone.setHooks({
      today: today,
      timeLabel: function () { return S() && !pro() ? now().label : ''; },
      clock: function () { var s = S(); return s && !pro() && atHome() ? now().clock : null; },
      contact: contact,
      photos: function () { var s = S(); return s && !pro() ? s.photos : []; },
      photoSent: photoSent,
      canCamera: canCamera, focus: focus, shot: shot, camOpen: camOpen,
      bank: bank, cash: cash,
      canCall: canCall, call: call
    });
  }

  return {
    init: init, fresh: fresh, today: today, PRO_REJECT: PRO_REJECT, PRO_OFFER: PRO_OFFER,
    text417: text417, homeBeats: homeBeats, morningBeats: morningBeats, lunch: lunch,
    drawHome: drawHome, homeSpots: homeSpots, cashText: cashText, firstCall: firstCall
  };
}());
