/* 하루 상태 모델. 화면 없이 돌아가고, JSON으로 그대로 저장할 수 있는 값만 담는다.
   시간은 자정부터 센 분, 돈은 원, 체력과 하트는 0~5칸이다.
   규칙의 근거는 docs/클로드-핵심로직.md 에 적었다. */
var Life = (function () {
  'use strict';

  var VERSION = 1;
  var GOAL = 8;            // 수습 평가 목표 계약 건수
  var ALLOWANCE = 2000;    // 출근한 날 활동비
  var MAX = 5;             // 체력, 하트 칸 수

  // 시계 (분)
  var T = {
    wake: 450, wokeWake: 470, leaveBy: 490, commute: 50, assembly: 540,
    dress: 5, roller: 10, feed: 5, water: 3, scoop: 7, sand: 5, pet: 5, coffee: 2,
    accident: 15, search: 3,
    workEnd: 1080, homeArrive: 1140, shopStop: 20, groupLeave: 1260, groupHome: 1290,
    eveningSlot: 90, weekendStart: 600, weekendSlot: 180
  };

  var PRODUCTS = {
    dental: { pay: 10000 }, pet: { pay: 8000 }, car: { pay: 6000 },
    home: { pay: 6000 }, travel: { pay: 4000 }, group: { pay: 30000 }
  };

  var SHOP = {
    dry: { price: 12000 }, sand: { price: 8000 }, wet: { price: 15000 },
    tower: { price: 50000, once: true }, feeder: { price: 40000, once: true },
    roller: { price: 3000, once: true }, coffee: { price: 2000 }, lunch: { price: 6000 }
  };
  var DRY_MEALS = 8, WET_MEALS = 6, SAND_DAYS = 4;

  var DAYS = [
    { date: '4/12', wd: '일', kind: 'eve' },
    { date: '4/13', wd: '월', kind: 'work', first: true },
    { date: '4/14', wd: '화', kind: 'work' },
    { date: '4/15', wd: '수', kind: 'work', storm: true },
    { date: '4/16', wd: '목', kind: 'work', group: 'c6' },
    { date: '4/17', wd: '금', kind: 'work' },
    { date: '4/18', wd: '토', kind: 'off' },
    { date: '4/19', wd: '일', kind: 'off' },
    { date: '4/20', wd: '월', kind: 'work' },
    { date: '4/21', wd: '화', kind: 'work', hide: true },
    { date: '4/22', wd: '수', kind: 'work' },
    { date: '4/23', wd: '목', kind: 'work', eve: true },
    { date: '4/24', wd: '금', kind: 'work', final: true }
  ];

  // 고객 15명. need는 말풍선 그림, mark는 고객 카드의 표시.
  var CLIENTS = {
    c1: { day: 1, need: 'dental', mark: 'none', tutorial: true },
    c2: { day: 2, need: 'travel', mark: 'none' },
    c3: { day: 3, need: 'car', mark: 'none' },
    c4: { day: 3, need: 'dental', mark: 'sneeze' },
    c5: { day: 4, need: 'home', mark: 'none' },
    c6: { day: 4, need: 'group', mark: 'none', evening: true },
    c7: { day: 5, need: 'home', mark: 'cat' },
    c8: { day: 5, need: 'travel', mark: 'clock' },
    c9: { day: 8, need: 'car', mark: 'none' },
    c10: { day: 9, need: 'dental', mark: 'clock' },
    c11: { day: 9, need: 'home', mark: 'none' },
    c12: { day: 10, need: 'travel', mark: 'sneeze' },
    c13: { day: 11, need: 'dental', mark: 'cat' },
    c14: { day: 11, need: 'car', mark: 'none' },
    c15: { day: 12, need: 'home', mark: 'none' }
  };
  var CLIENT_IDS = Object.keys(CLIENTS);

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function cleanName(n, fallback) {
    var v = String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, 8);
    return v || fallback;
  }
  function day(s) { return DAYS[s.day] || DAYS[DAYS.length - 1]; }
  function clientsOn(d) {
    return CLIENT_IDS.filter(function (id) { return CLIENTS[id].day === d && !CLIENTS[id].evening; });
  }
  function nextWorkDay(d) {
    for (var i = d + 1; i < DAYS.length; i++) if (DAYS[i].kind === 'work') return i;
    return -1;
  }

  function freshToday(s) {
    return { day: s.day, earned: [], lost: [], spent: [], hearts: [], stickers: [], notes: [], energyNext: null, total: 0 };
  }

  function create(me, cat) {
    var s = {
      v: VERSION, me: cleanName(me, '김신입'), cat: cleanName(cat, '보리'),
      day: 0, phase: 'evening', minute: T.homeArrive,
      wallet: 20000, energy: 4, hearts: 3,
      food: { dry: 4, wet: 0 },
      bowl: 'empty', bowlKind: 'dry', meal: 'pm', fed: { am: true, pm: false },
      water: false,
      litter: { poop: 0, sand: 2 },
      fur: 0, wearing: 'hoodie',
      owned: { roller: false, tower: false, feeder: false },
      pantry: { sand: 0, coffee: 0, lunch: 0 },
      coffee: false, shopped: false,
      slots: 2, slotsMax: 2, played: false, petted: false, rested: 0,
      prepared: {}, cards: [],
      door: 'closed', woke: false, left: 0, late: 0,
      hidden: false, stormDone: false, group: null,
      contracts: 0, results: [], missed: 0,
      today: null, ledger: [], diary: [], events: [],
      morningNote: null, evaluated: null, ended: null,
      seen: {}
    };
    s.today = freshToday(s);
    return s;
  }

  function event(s, key, extra) {
    var e = { day: s.day, key: key };
    if (extra) for (var k in extra) e[k] = extra[k];
    s.events.push(e);
  }
  function heart(s, delta, key) {
    var before = s.hearts;
    s.hearts = clamp(before + delta, 0, MAX);
    s.today.hearts.push({ key: key, delta: delta, applied: s.hearts - before });
    return s.hearts - before;
  }
  function energy(s, delta) {
    var before = s.energy;
    s.energy = clamp(before + delta, 0, MAX);
    return s.energy - before;
  }
  // 평일 아침에만 행동마다 시계가 간다. 걷기와 대화는 시간을 쓰지 않는다.
  function timed(s) { return s.phase === 'morning'; }
  function spend(s, minutes) { if (!timed(s)) return 0; s.minute += minutes; return minutes; }

  // ---------- 고양이 돌봄 ----------
  function feedBlock(s, kind) {
    if (s.bowl === 'full' || s.bowl === 'ate' || s.fed[s.meal]) return 'fed';
    if (!s.food[kind]) return 'noFood';
    return null;
  }
  function feed(s, kind) {
    kind = kind === 'wet' ? 'wet' : 'dry';
    var why = feedBlock(s, kind);
    if (why) return { ok: false, why: why };
    s.food[kind]--; s.bowl = 'full'; s.bowlKind = kind; s.fed[s.meal] = true;
    var minutes = spend(s, T.feed);
    if (kind === 'wet') heart(s, +1, 'wet');
    return { ok: true, minutes: minutes };
  }
  function ate(s) { if (s.bowl === 'full') s.bowl = 'ate'; }
  function giveWater(s) {
    if (s.water) return { ok: false, why: 'already' };
    s.water = true;
    return { ok: true, minutes: spend(s, T.water) };
  }
  function scoop(s) {
    if (s.litter.poop <= 0) return { ok: false, why: 'clean' };
    s.litter.poop = 0;
    return { ok: true, minutes: spend(s, T.scoop) };
  }
  function refill(s) {
    if (s.pantry.sand <= 0) return { ok: false, why: 'noSand' };
    if (s.litter.sand >= SAND_DAYS && s.litter.poop === 0) return { ok: false, why: 'full' };
    s.pantry.sand--; s.litter.sand = SAND_DAYS; s.litter.poop = 0;
    return { ok: true, minutes: spend(s, T.sand) };
  }
  function pet(s) {
    if (s.hidden) return { ok: false, why: 'hidden' };
    var first = !s.petted;
    s.petted = true;
    var minutes = spend(s, T.pet);
    if (first) heart(s, +1, 'pet');
    return { ok: true, minutes: minutes, first: first };
  }
  function missMeal(s, which) {
    if (s.owned.feeder && s.food.dry > 0) {
      s.food.dry--; s.fed[which] = true; s.today.notes.push('feeder');
      return false;
    }
    s.missed++;
    heart(s, -1, which === 'am' ? 'missAm' : 'missPm');
    return true;
  }
  function switchMeal(s) {
    if (s.meal === 'pm') return;
    if (!s.fed.am) missMeal(s, 'am');
    s.meal = 'pm'; s.bowl = 'empty';
  }

  // ---------- 나 ----------
  function dress(s) {
    if (s.wearing === 'suit') return { ok: false, why: 'already' };
    s.wearing = 'suit';
    return { ok: true, minutes: spend(s, T.dress) };
  }
  function canRoll(s) { return !!s.owned.roller; }
  function roll(s) {
    if (!s.fur) return { ok: false, why: 'clean' };
    if (!canRoll(s)) return { ok: false, why: 'noRoller' };
    s.fur = 0;
    return { ok: true, minutes: spend(s, T.roller) };
  }
  // 첫 출근 날 지점에서 선배가 소매의 털을 떼 준다. 시간은 들지 않는다.
  function seniorRoll(s) {
    if (!s.fur) return false;
    s.fur = 0; event(s, 'seniorRoller');
    return true;
  }
  function drinkCoffee(s) {
    if (s.coffee) return { ok: false, why: 'already' };
    if (s.pantry.coffee <= 0) return { ok: false, why: 'none' };
    s.pantry.coffee--; s.coffee = true;
    return { ok: true, minutes: spend(s, T.coffee) };
  }
  function eatLunch(s) {
    if (s.pantry.lunch <= 0) return { ok: false, why: 'none' };
    if (s.energy >= MAX) return { ok: false, why: 'full' };
    s.pantry.lunch--; energy(s, +1); s.today.notes.push('lunch');
    return { ok: true };
  }
  function search(s, spot) {
    if (!s.hidden || day(s).kind !== 'work' || !day(s).hide) return { ok: false };
    var minutes = spend(s, T.search);
    if (spot === 'drawer') { s.hidden = false; event(s, 'drawer'); return { ok: true, found: true, minutes: minutes }; }
    return { ok: true, found: false, minutes: minutes };
  }

  // ---------- 저녁 칸 ----------
  function slotLength(s) { return s.phase === 'weekend' ? T.weekendSlot : T.eveningSlot; }
  function slotBlock(s, kind) {
    if (s.slots <= 0) return 'noSlot';
    if (kind === 'play') { if (s.hidden) return 'hidden'; if (s.played) return 'played'; }
    if (kind === 'prep') { if (!s.cards.length) return 'noCard'; if (s.cards.every(function (id) { return s.prepared[id]; })) return 'prepared'; }
    if (kind === 'rest' && s.energy >= MAX) return 'full';
    if (kind === 'curtain' && (!day(s).storm || s.stormDone || s.phase !== 'evening')) return 'noStorm';
    if (kind === 'shop' && s.phase !== 'weekend') return 'noShop';
    return null;
  }
  function slot(s, kind) {
    var why = slotBlock(s, kind);
    if (why) return { ok: false, why: why };
    if (kind === 'play') { s.played = true; energy(s, -1); heart(s, +1, 'play'); }
    else if (kind === 'rest') { energy(s, +1); s.rested++; }
    else if (kind === 'prep') { s.cards.forEach(function (id) { s.prepared[id] = true; }); energy(s, -1); }
    else if (kind === 'curtain') { s.stormDone = true; s.hidden = false; heart(s, +1, 'curtain'); event(s, 'curtain'); }
    else if (kind === 'shop') { s.shopped = true; }
    s.slots--;
    s.minute += slotLength(s);
    if (s.phase === 'weekend' && s.slotsMax - s.slots === 2) switchMeal(s);
    return { ok: true, slots: s.slots };
  }

  // ---------- 출근 ----------
  function leaveHome(s) {
    if (s.wearing !== 'suit') return { ok: false, why: 'noSuit' };
    s.left = s.minute;
    s.late = Math.max(0, s.minute + T.commute - T.assembly);
    if (s.hidden) s.today.notes.push('leftHidden');
    switchMeal(s);
    s.phase = 'work';
    s.minute = s.left + T.commute;
    return { ok: true, late: s.late };
  }
  function firstClient(s) { return clientsOn(s.day)[0]; }
  function plan(s, id) {
    var c = CLIENTS[id], mood = 2, reasons = [], fur = s.fur > 0 && !c.tutorial;
    var eff = s.energy + (s.coffee ? 1 : 0);
    if (c.evening) eff = s.energy - 2; // 저녁 8시에는 하루 일한 만큼 지쳐 있다
    var busy = c.mark === 'clock', first = id === firstClient(s) && !c.evening;
    if (first && s.late > 0) {
      if (busy) return { id: id, need: c.need, mark: c.mark, leaves: true, mood: 0, reasons: [{ key: 'busyLeft', delta: 0 }], steps: [] };
      mood -= 1; reasons.push({ key: 'late', delta: -1 });
    }
    if (fur) {
      if (c.mark === 'sneeze') { mood -= 2; reasons.push({ key: 'sneeze', delta: -2 }); }
      else if (c.mark === 'cat') { mood += 1; reasons.push({ key: 'catLover', delta: +1 }); }
      else { mood -= 1; reasons.push({ key: 'fur', delta: -1 }); }
    }
    if (s.prepared[id]) { mood += 1; reasons.push({ key: 'prepared', delta: +1 }); }
    if (eff <= 1) { mood -= 1; reasons.push({ key: 'yawn', delta: -1 }); }
    var steps = ['need', 'price'];
    if (fur && c.mark === 'cat') steps.push('pet');
    steps.push('contract');
    return {
      id: id, need: c.need, mark: c.mark, mood: clamp(mood, 0, 4), reasons: reasons, steps: steps,
      timer: c.tutorial ? 0 : busy ? 5 : 8,
      blur: eff >= 1 && eff <= 2, blink: eff <= 0,
      prepared: !!s.prepared[id], tutorial: !!c.tutorial, evening: !!c.evening, leaves: false, fur: fur
    };
  }
  // 상담 한 판의 상태. 단계마다 맞는 것을 건네면 기분 +1, 틀리거나 늦으면 -1.
  function consult(p) { return { step: 0, mood: p.mood, wrong: 0, slow: 0, done: !!p.leaves, signed: false }; }
  function wants(p, st) {
    var step = p.steps[st.step];
    return step === 'need' ? p.need : step;
  }
  function answer(p, st, item) {
    if (st.done) return { ok: false, done: true };
    var want = wants(p, st);
    if (item !== want) { st.mood = clamp(st.mood - 1, 0, 4); st.wrong++; return { ok: false, mood: st.mood, want: want }; }
    if (want === 'contract') { st.done = true; st.signed = st.mood >= 3; return { ok: true, done: true, signed: st.signed, mood: st.mood }; }
    st.mood = clamp(st.mood + 1, 0, 4); st.step++;
    return { ok: true, mood: st.mood, next: wants(p, st) };
  }
  function timeout(p, st) { if (st.done || !p.timer) return st.mood; st.mood = clamp(st.mood - 1, 0, 4); st.slow++; return st.mood; }
  function lossReason(p, st) {
    if (p.leaves) return 'busyLeft';
    var order = ['sneeze', 'late', 'fur', 'yawn'];
    for (var i = 0; i < order.length; i++) {
      for (var j = 0; j < p.reasons.length; j++) if (p.reasons[j].key === order[i]) return order[i];
    }
    return st.slow > st.wrong ? 'slow' : 'mistake';
  }
  function finish(s, p, st) {
    var signed = !p.leaves && !!st.signed;
    var r = { id: p.id, day: s.day, need: p.need, signed: signed, pet: signed && p.steps.indexOf('pet') >= 0, pay: 0, why: null };
    if (signed) {
      r.pay = PRODUCTS[p.need].pay + (r.pet ? PRODUCTS.pet.pay : 0);
      if (!s.contracts) event(s, 'firstContract', { id: p.id });
      s.contracts += r.pet ? 2 : 1;
      s.today.stickers.push(p.need);
      if (r.pet) { s.today.stickers.push('pet'); event(s, 'catLover', { id: p.id }); }
      if (p.evening) event(s, 'groupSigned');
    } else {
      r.why = lossReason(p, st);
    }
    s.results.push(r);
    return r;
  }
  function decideGroup(s, go) {
    if (!day(s).group || s.group) return false;
    s.group = go ? 'go' : 'skip';
    if (!go) event(s, 'groupSkipped');
    return true;
  }
  function leaveOffice(s) {
    var mine = s.results.filter(function (r) { return r.day === s.day; });
    s.wallet += ALLOWANCE;
    s.today.earned.push({ key: 'allowance', amount: ALLOWANCE });
    mine.forEach(function (r) {
      if (r.signed) { s.wallet += r.pay; s.today.earned.push({ key: 'contract', id: r.id, need: r.need, pet: r.pet, amount: r.pay }); }
      else s.today.lost.push({ id: r.id, why: r.why });
    });
    energy(s, -2);
    var wentGroup = day(s).group && s.group === 'go';
    if (wentGroup) energy(s, -1);
    var next = nextWorkDay(s.day);
    s.cards = next < 0 ? [] : clientsOn(next);
    s.phase = 'commute';
    s.minute = wentGroup ? T.groupLeave : T.workEnd;
    return { earned: s.today.earned.slice(), cards: s.cards.slice() };
  }

  // ---------- 가게 ----------
  function buyBlock(s, item) {
    var it = SHOP[item];
    if (!it) return 'unknown';
    if (it.once && s.owned[item]) return 'owned';
    if (s.wallet < it.price) return 'money';
    return null;
  }
  function buy(s, item) {
    var why = buyBlock(s, item);
    if (why) return { ok: false, why: why };
    var price = SHOP[item].price;
    s.wallet -= price;
    s.today.spent.push({ item: item, amount: price });
    if (item === 'dry') s.food.dry += DRY_MEALS;
    else if (item === 'wet') s.food.wet += WET_MEALS;
    else if (item === 'sand') s.pantry.sand++;
    else if (item === 'coffee') s.pantry.coffee++;
    else if (item === 'lunch') s.pantry.lunch++;
    else s.owned[item] = true;
    s.shopped = true;
    return { ok: true, wallet: s.wallet };
  }

  // 가게 안에서 방금 담은 물건을 진열대에 되돌린다. 이미 쓴 것은 무를 수 없다.
  function unbuy(s, item) {
    var sp = s.today.spent, i = sp.length - 1;
    while (i >= 0 && sp[i].item !== item) i--;
    if (i < 0) return { ok: false, why: 'none' };
    if (item === 'dry' && s.food.dry < DRY_MEALS) return { ok: false, why: 'used' };
    if (item === 'wet' && s.food.wet < WET_MEALS) return { ok: false, why: 'used' };
    if (s.pantry[item] !== undefined && s.pantry[item] <= 0) return { ok: false, why: 'used' };
    s.wallet += sp[i].amount;
    sp.splice(i, 1);
    if (item === 'dry') s.food.dry -= DRY_MEALS;
    else if (item === 'wet') s.food.wet -= WET_MEALS;
    else if (s.pantry[item] !== undefined) s.pantry[item]--;
    else s.owned[item] = false;
    if (!sp.length && s.phase !== 'weekend') s.shopped = false;
    return { ok: true, wallet: s.wallet };
  }

  // ---------- 저녁, 밤 ----------
  function arriveHome(s) {
    var wentGroup = day(s).group && s.group === 'go';
    s.phase = 'evening';
    s.minute = wentGroup ? T.groupHome : T.homeArrive + (s.shopped ? T.shopStop : 0);
    s.meal = 'pm';
    if (s.bowl !== 'empty' && !s.fed.pm) s.bowl = 'empty';
    s.slots = s.slotsMax = wentGroup ? 1 : 2;
    s.wearing = 'hoodie';
    if (day(s).kind === 'work') heart(s, -2, 'alone');
    s.hidden = !!day(s).storm; // 천둥 치는 밤에는 숨는다. 아침에 숨었던 것은 저녁에 나온다
    return { slots: s.slots };
  }
  function toBed(s) { s.phase = 'night'; }
  function setDoor(s, open) { s.door = open ? 'open' : 'closed'; return s.door; }
  function unplayed(s) { return !s.played && !s.owned.tower; }
  function needsPOV(s) { return s.door === 'closed' && unplayed(s) && !s.hidden; }
  function sleep(s, opt) {
    opt = opt || {};
    var t = s.today, woke = false, note = null;
    var hungry = !s.fed.pm ? missMeal(s, 'pm') : false;
    if (!s.water) heart(s, -1, 'dry');
    var together = s.door === 'open' && !s.hidden;
    if (together) {
      heart(s, +1, 'together');
      if (hungry || unplayed(s)) { woke = true; note = hungry ? 'wakeHungry' : 'wakeZoomies'; }
      else note = 'slept';
    } else if (needsPOV(s)) {
      if (opt.cat === 'scratch') { woke = true; note = 'scratched'; event(s, 'scratched'); }
      else { heart(s, -1, 'lonely'); note = 'lonely'; event(s, 'lonely'); }
    } else note = 'closed';
    var gain = energy(s, woke ? 2 : 3);
    s.woke = woke;
    s.morningNote = { key: note, gain: gain };
    if (together) s.fur = Math.min(3, s.fur + 1);
    t.energyNext = s.energy;
    t.total = s.contracts;
    s.diary.push({ day: s.day, together: together, meals: (s.fed.am ? 1 : 0) + (s.fed.pm ? 1 : 0), played: s.played, water: s.water });
    if (together) event(s, 'together');
    s.ledger.push(t);
    if (s.missed > 3) s.ended = 'emptyBowl';
    return t;
  }
  function morning(s) {
    s.day++;
    s.today = freshToday(s);
    var d = day(s);
    s.fed = { am: false, pm: false }; s.meal = 'am'; s.bowl = 'empty';
    s.water = false; s.played = false; s.petted = false; s.rested = 0;
    s.coffee = false; s.shopped = false; s.late = 0; s.left = 0;
    s.wearing = 'hoodie';
    s.hidden = !!d.hide;
    s.litter.poop++;
    var accident = s.litter.poop >= 3 || s.litter.sand <= 0;
    s.litter.sand = Math.max(0, s.litter.sand - 1);
    if (d.kind === 'off') {
      s.phase = 'weekend'; s.minute = T.weekendStart; s.slots = s.slotsMax = 4;
    } else {
      s.phase = 'morning'; s.minute = s.woke ? T.wokeWake : T.wake;
    }
    if (accident) { if (s.phase === 'morning') s.minute += T.accident; heart(s, -1, 'accident'); }
    var note = s.morningNote; s.morningNote = null;
    return { accident: accident, note: note, hidden: s.hidden };
  }
  function evaluate(s) {
    s.evaluated = { contracts: s.contracts, pass: s.contracts >= GOAL };
    var t = s.today;
    t.energyNext = s.energy; t.total = s.contracts;
    s.diary.push({ day: s.day, together: false, meals: s.fed.am ? 1 : 0, played: false, water: s.water });
    s.ledger.push(t);
    s.ended = 'evaluation';
    return s.evaluated;
  }
  function ending(s) {
    if (s.missed > 3) return { key: 'emptyBowl', pass: false, hearts: s.hearts, contracts: s.contracts };
    var band = s.hearts >= 4 ? 'close' : s.hearts >= 2 ? 'mid' : 'far';
    var pass = s.contracts >= GOAL;
    var key = { close: pass ? 'both' : 'catStays', mid: pass ? 'soso' : 'clumsy', far: pass ? 'oneBody' : 'again' }[band];
    return { key: key, band: band, pass: pass, hearts: s.hearts, contracts: s.contracts };
  }

  // ---------- 저장 ----------
  function save(s) { return JSON.stringify(s); }
  function load(text) {
    try {
      var s = typeof text === 'string' ? JSON.parse(text) : text;
      if (!s || s.v !== VERSION || typeof s.day !== 'number' || !s.today) return null;
      if (!s.seen) s.seen = {};
      return s;
    } catch (e) { return null; }
  }

  // ---------- 글자 ----------
  function hasBatchim(word) {
    var w = String(word || ''), c = w.charCodeAt(w.length - 1);
    return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
  }
  // 땅콩 -> 땅콩이, 사라 -> 사라. 조사는 늘 받침 없는 모양이 붙는다.
  function nameForm(n) { return hasBatchim(n) ? n + '이' : String(n); }
  function josa(n, kind) {
    if (kind === 'call') return n + (hasBatchim(n) ? '아' : '야');
    var tail = { subject: '가', topic: '는', object: '를', with: '랑', and: '와', of: '의', to: '한테', bare: '' }[kind];
    return nameForm(n) + (tail === undefined ? '' : tail);
  }
  function clock(minute) {
    var m = Math.max(0, Math.round(minute)), h = Math.floor(m / 60) % 24, mm = m % 60;
    return h + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function won(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'; }

  return {
    VERSION: VERSION, GOAL: GOAL, ALLOWANCE: ALLOWANCE, MAX: MAX, T: T,
    PRODUCTS: PRODUCTS, SHOP: SHOP, DAYS: DAYS, CLIENTS: CLIENTS,
    DRY_MEALS: DRY_MEALS, WET_MEALS: WET_MEALS, SAND_DAYS: SAND_DAYS,
    create: create, day: day, clientsOn: clientsOn, nextWorkDay: nextWorkDay,
    feed: feed, feedBlock: feedBlock, ate: ate, water: giveWater, scoop: scoop, refill: refill, pet: pet,
    dress: dress, roll: roll, canRoll: canRoll, seniorRoll: seniorRoll, coffee: drinkCoffee, lunch: eatLunch, search: search,
    slot: slot, slotBlock: slotBlock,
    leaveHome: leaveHome, plan: plan, consult: consult, wants: wants, answer: answer, timeout: timeout, finish: finish,
    decideGroup: decideGroup, leaveOffice: leaveOffice,
    buy: buy, buyBlock: buyBlock, unbuy: unbuy,
    arriveHome: arriveHome, toBed: toBed, setDoor: setDoor, needsPOV: needsPOV, unplayed: unplayed, sleep: sleep, morning: morning,
    evaluate: evaluate, ending: ending,
    save: save, load: load,
    hasBatchim: hasBatchim, nameForm: nameForm, josa: josa, clock: clock, won: won, cleanName: cleanName
  };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Life;
