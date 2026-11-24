// 개발자 모드: 주소 끝에 ?dev 를 붙이면 처음 화면에서 원하는 날로 바로 건너뛴다.
// 건너뛴 날들은 고른 플레이 방식대로 상태만 빠르게 계산해 둔다(돈, 계약, 하트, 사진, 사료가 그날답게 남는다).
// 게임 안에서는 왼쪽 아래 DEV 단추로 하트·체력·돈·시간을 바로 바꿀 수 있다.
var Dev = (function () {
  'use strict';
  var on = typeof location !== 'undefined' && /[?&#]dev\b/.test(location.search + location.hash);

  // ---------- 플레이 방식 ----------
  var STYLES = {
    balance: { label: '일도 고양이도', people: true, door: true, play: true, photos: true, prep: true, cook: 'weekend', knead: 'pet', dinner: false, overtime: false, lastPrep: 'lid' },
    work: { label: '일만', door: false, play: false, photos: false, prep: true, cook: 'never', knead: 'push', dinner: true, overtime: true, lastPrep: 'work' },
    greedy: { label: '실적만 (무리하게 권함)', greedy: true, door: false, play: false, photos: false, prep: true, cook: 'never', knead: 'push', dinner: true, overtime: true, lastPrep: 'work' },
    cat: { label: '고양이만', people: true, door: true, play: true, photos: true, prep: false, cook: 'always', knead: 'pet', dinner: false, overtime: false, lastPrep: 'lid' }
  };

  var flip = 0;
  // 봇 상담: 맞는 상품과 꼭 필요한 보장, 예산 안에서 가장 많이. greedy면 예산을 넘기고 알릴 의무를 넘긴다.
  function bestCovers(p) {
    var items = Life.PRODUCTS[p.product].items, base = Life.PRODUCTS[p.product].base, on = {};
    p.needs.forEach(function (k) { on[k] = true; }); if (base) on[base] = true;
    var cost = function () { return Object.keys(on).reduce(function (t, k) { return t + items[k]; }, 0); };
    Object.keys(items).forEach(function (k) {
      if (on[k] || (p.existing && p.existing.indexOf(k) >= 0)) return;
      on[k] = true; if (cost() > p.budget) delete on[k];
    });
    return on;
  }
  function consult(s, id, st) {
    var p = Life.plan(s, id), c = Life.consult(p), greedy = st.greedy;
    if (c.done) return Life.finish(s, p, c);
    p.facts.forEach(function (f) { if (f !== 'life') Life.note(p, c, f); });
    Life.listened(p, c);
    if (!p.prepared && !st.prep && (flip++ % 3 === 0)) Life.pickProduct(p, c, p.product === 'home' ? 'dental' : 'home');
    if (c.done) return Life.finish(s, p, c);
    Life.pickProduct(p, c, p.product);
    var want = greedy ? Life.PRODUCTS[p.product].items : bestCovers(p);
    Object.keys(want).forEach(function (k) { if (!c.covers[k]) Life.toggle(p, c, k); });
    var r = Life.submitDesign(p, c, greedy);
    if (!r.ok && !c.done) { c.covers = {}; Life.pickProduct(p, c, p.product); var b = bestCovers(p); Object.keys(b).forEach(function (k) { if (!c.covers[k]) Life.toggle(p, c, k); }); Life.submitDesign(p, c); }
    if (c.done) return Life.finish(s, p, c);
    Life.apply(p, c, !greedy);
    if (c.done) return Life.finish(s, p, c);
    [0, 1, 2].forEach(function (i) { Life.explain(p, c, i); }); Life.hand(p, c);
    if (Life.needsPersuade(p, c)) Life.persuade(p, c);
    if (!c.done) Life.sign(p, c);
    return Life.finish(s, p, c);
  }
  // 동네 사람: people이면 먼저 말 걸고, 사과하고, 택배를 전하고, 점심을 같이 먹고, 현관 비밀번호를 알려 드리고, 늦는 날 부탁한다
  function ask(s, kind) { var h = Life.helpers(s, kind); return h.length ? Life.ask(s, kind, h[0]).ok : false; }
  function evening(s, st) {
    if (!st.people) return;
    if (s.day === 2) Life.reach(s, 'bow');
    if (s.day === 4) Life.reach(s, 'parcel');
    if (s.day >= Life.DISH_FROM && !s.seen.dish && Life.person(s, 'grandma').bond >= 2 && Life.day(s).kind === 'work') { s.seen.dish = true; s.dish = 'full'; }
    if (s.dish === 'full' && !Life.eatBlock(s)) { Life.eat(s, 'banchan'); s.dish = 'empty'; }
    else if (s.dish === 'empty' && Life.reach(s, 'dish').ok) s.dish = null;
    if (Life.person(s, 'grandma').owe && !Life.reachBlock(s, 'visit')) Life.reach(s, 'visit');
    Life.giveKey(s);
    if (s.day === 15 && Life.person(s, 'mate').met && st.label === STYLES.balance.label) { var next = Life.clientsOn(Life.nextWorkDay(s.day), s)[0]; if (next) { s.gave = next; Life.reach(s, 'refer'); } }
  }
  function bills(s, st) {
    var due = Life.billDue(s);
    while (due) {
      if (st && st.people && s.wallet < due.amount) ask(s, 'money');
      if (s.wallet >= due.amount) Life.payBill(s, due.id, 'pay');
      else if (due.defer) Life.payBill(s, due.id, 'defer');
      else if (Life.canCash(s)) Life.payBill(s, due.id, 'cash');
      else Life.lateBill(s, due.id);
      due = Life.billDue(s);
    }
  }
  function shopping(s) {
    var list = [];
    if (!s.owned.roller) list.push('roller');
    if (s.food.dry <= 3) list.push('dry');
    if (!s.pantry.sand && s.litter.sand <= 2) list.push('sand');
    if (s.toy <= 1) list.push('toy');
    var left = s.wallet;
    return list.filter(function (k) { var ok = left >= Life.SHOP[k].price; if (ok) left -= Life.SHOP[k].price; return ok; });
  }
  function care(s, st) {
    if (s.hidden && Life.day(s).storm) Life.act(s, 'curtain');
    Life.feed(s, 'dry'); Life.water(s); Life.scoop(s);
    if (s.pantry.sand && Life.sandLow(s)) Life.refill(s);
    Life.pet(s);
  }
  // 사진을 찍고, 사람들(people)과 지내는 방식이면 엄마에게 하루 한 장 보낸다. 처음 보낸 날 엄마 전화를 받는다.
  function photos(s, st) {
    if (!st.photos || s.day === 0) return;
    while (Life.photosToday(s) < Life.photoCap(s)) if (!Life.photo(s, 'sit').ok) break;
    if (!st.people || !s.photos.length) return;
    var r = Life.sendPhoto(s, s.photos[s.photos.length - 1].id, 'mom');
    if (r.first) { Life.momTouch(s, 'answer'); s.mom.knows = true; }
    if (Life.momBond(s) >= 2 && s.mom.parcel === null) Life.momSend(s);
    if (s.mom.parcel !== null && s.day >= s.mom.parcel && s.mom.opened === null) { s.mom.got = s.day; Life.momOpen(s); }
  }
  function home(s, st) {
    care(s, st);
    if (st.play) Life.act(s, 'play');
    photos(s, st);
    if (Life.day(s).eve && !s.lid) Life.lastPrep(s, st.lastPrep);
    if (st.prep) Life.act(s, 'prep');
    if (s.day > 0) Life.eat(s, st.cook === 'always' || (st.cook === 'weekend' && s.phase === 'weekend') ? 'cook' : 'quick');
  }
  function sleep(s, st) {
    Life.toBed(s);
    Life.setDoor(s, st.door);
    Life.sleep(s, {});
    if (Life.kneadNight(s)) Life.knead(s, st.knead === 'pet' && s.energy >= 2 ? 'pet' : 'push');
  }
  function weekday(s, st) {
    Life.dress(s);
    if (s.fur && s.owned.roller) Life.roll(s);
    Life.feed(s, 'dry'); Life.scoop(s); Life.water(s);
    if (st.people && s.alarm === 'late') ask(s, 'cover');
    Life.leaveHome(s);
    if (st.people && Life.day(s).first) Life.reach(s, 'talk');
    Life.clientsOn(s.day, s).forEach(function (id) { consult(s, id, st); });
    if (st.people && Life.LUNCH_DAYS.indexOf(s.day) >= 0 && s.wallet >= 120000) Life.reach(s, 'lunch');
    var d = Life.day(s);
    if (d.group) {
      var go = d.overtime ? st.overtime : st.play === false; Life.decideGroup(s, go);
      if (go && st.people) { ask(s, 'work'); ask(s, 'cat'); }
      if (go) consult(s, 'c6', st);
    }
    if (d.dinner) { Life.dinner(s, st.dinner); if (st.dinner && st.people) ask(s, 'cat'); }
    Life.leaveOffice(s);
    shopping(s).forEach(function (k) { Life.buy(s, k); });
    Life.arriveHome(s);
    bills(s, st);
  }
  function weekend(s, st) {
    care(s, st);
    Life.act(s, 'sweep'); Life.act(s, 'mop');
    Life.act(s, 'shop'); shopping(s).forEach(function (k) { Life.buy(s, k); });
    if (st.play) Life.act(s, 'play');
    photos(s, st);
    if (st.prep) Life.act(s, 'prep');
    Life.act(s, 'rest');
    if (Life.napFirst(s)) Life.nap(s);
    Life.feed(s, 'dry');
    Life.eat(s, st.cook === 'never' ? 'quick' : 'cook');
  }

  // day: 0~26, when: 'morning'(평일 아침, 주말 낮) | 'evening'(퇴근 후)
  function simulate(me, cat, styleKey, day, when) {
    var st = STYLES[styleKey] || STYLES.balance, s = Life.create(me, cat);
    flip = 0;
    s.seen.eveClock = true;
    home(s, st); sleep(s, st);
    while (!s.ended) {
      Life.morning(s);
      var d = Life.day(s), off = d.kind === 'off';
      if (s.day === day && (when === 'morning' || off || d.final)) break;
      if (off) { weekend(s, st); sleep(s, st); continue; }
      weekday(s, st);
      if (d.final) { Life.evaluate(s); break; }
      if (s.day === day) break; // 퇴근해서 집에 막 들어온 저녁
      evening(s, st); home(s, st); sleep(s, st);
    }
    s.seen.eveClock = true; s.seen.mealIntro = true; s.seen.packed = true;
    if (s.day > 1) { s.seen.train = true; s.seen.mapHint = true; }
    if (s.day > 2) s.seen.knock = true;
    if (s.day > 4) s.seen.parcel = true;
    if (s.day > 15) s.seen.refer = true;
    Life.LUNCH_DAYS.forEach(function (d) { if (d < s.day || (d === s.day && when === 'evening')) s.seen['lunch' + d] = true; });
    s.seen.memoDay = s.day - 1;
    return s;
  }

  // ---------- 처음 화면 ----------
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html !== undefined) e.innerHTML = html; return e; }
  function choices() {
    var list = [];
    Life.DAYS.forEach(function (d, i) {
      if (i === 0) return;
      if (d.kind === 'off') list.push({ day: i, when: 'morning', label: d.date + ' ' + d.wd + ' 주말 아침' });
      else {
        list.push({ day: i, when: 'morning', label: d.date + ' ' + d.wd + ' 출근 아침' });
        if (!d.final) list.push({ day: i, when: 'evening', label: d.date + ' ' + d.wd + ' 퇴근 후 저녁' + note(d, i) });
      }
    });
    return list;
  }
  function note(d, i) {
    if (d.storm) return ' (천둥)';
    if (d.mom) return ' (엄마 문자)';
    if (d.overtime) return ' (야근)';
    if (d.eve) return ' (노트북 고양이)';
    if (d.hide) return ' (숨은 고양이)';
    return '';
  }
  function titlePanel() {
    var card = document.querySelector('.title-card'); if (!card) return;
    var box = el('div', { class: 'dev-panel', id: 'devPanel' });
    var opts = choices().map(function (c, i) { return '<option value="' + i + '">' + c.label + '</option>'; }).join('');
    var styles = Object.keys(STYLES).map(function (k) { return '<option value="' + k + '">' + STYLES[k].label + '</option>'; }).join('');
    box.innerHTML = '<p class="dev-title">개발자 모드</p>' +
      '<label>어디서 시작<select id="devDay">' + opts + '</select></label>' +
      '<label>그때까지 플레이<select id="devStyle">' + styles + '</select></label>' +
      '<label>고양이 이름<input id="devCat" maxlength="6" value="땅콩"></label>' +
      '<button id="devGo" class="primary">바로 시작</button>' +
      '<p class="dev-small">게임 중 왼쪽 아래 DEV 단추로 하트·체력·돈·시간을 바꿀 수 있어요.</p>';
    card.appendChild(box);
    var list = choices();
    var last = null; try { last = JSON.parse(localStorage.getItem('catdoor-dev') || 'null'); } catch (e) { /* 무시 */ }
    if (last) { $('devDay').value = last.i; $('devStyle').value = last.style; $('devCat').value = last.cat || '땅콩'; }
    $('devGo').onclick = function () {
      var c = list[+$('devDay').value], style = $('devStyle').value, cat = Life.cleanName($('devCat').value, '땅콩');
      try { localStorage.setItem('catdoor-dev', JSON.stringify({ i: +$('devDay').value, style: style, cat: cat })); } catch (e) { /* 무시 */ }
      var me = Life.cleanName($('playerName').value, '김신입');
      start(simulate(me, cat, style, c.day, c.when));
    };
  }
  function start(s) {
    G.s = s; G.pro = { me: s.me, cat: s.cat, wallet: 0, active: false };
    Phone.load(Mom.fresh(s.me, true), { fresh: true });
    Game.checkpoint();
    Game.startGame(function () { Game.hudAll(true); return Game.mainLoop(); });
  }

  // ---------- 게임 안 DEV 단추 ----------
  function bar() {
    var wrap = el('div', { class: 'dev-bar', id: 'devBar' });
    var btns = [
      ['♥+', function (s) { s.hearts = Math.min(Life.MAX, s.hearts + 1); }],
      ['♥−', function (s) { s.hearts = Math.max(0, s.hearts - 1); }],
      ['⚡+', function (s) { s.energy = Math.min(Life.MAX, s.energy + 1); }],
      ['⚡−', function (s) { s.energy = Math.max(0, s.energy - 1); }],
      ['+1만원', function (s) { s.wallet += 10000; }],
      ['계약+1', function (s) { s.contracts++; }],
      ['사진+1', function (s) { s.photos.push({ day: s.day, pose: 'sit' }); }],
      ['+1시간', function (s) { s.minute += 60; }],
      ['날짜 고르기', function () { location.reload(); }]
    ];
    var panel = el('div', { class: 'dev-bar-panel', hidden: '' });
    btns.forEach(function (b) {
      var x = el('button', { type: 'button' }, b[0]);
      x.onclick = function (e) { e.stopPropagation(); if (G.s) b[1](G.s); info(); };
      panel.appendChild(x);
    });
    var stat = el('span', { class: 'dev-stat' });
    panel.appendChild(stat);
    var toggle = el('button', { type: 'button', class: 'dev-toggle' }, 'DEV');
    toggle.onclick = function (e) { e.stopPropagation(); panel.hidden = !panel.hidden; info(); };
    wrap.appendChild(toggle); wrap.appendChild(panel);
    $('gameScreen').appendChild(wrap);
    function info() { var s = G.s; if (s) stat.textContent = '계약 ' + s.contracts + ' · 사진 ' + s.photos.length + ' · 놓친 밥 ' + s.missed; }
    setInterval(function () { if (!panel.hidden) info(); }, 500);
  }

  function $(id) { return document.getElementById(id); }
  function boot() { if (!on) return; titlePanel(); bar(); }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
  return { on: on, simulate: simulate, STYLES: STYLES };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Dev;
