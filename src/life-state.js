/* 하루 상태 모델. 화면 없이 돌아가고, JSON으로 그대로 저장할 수 있는 값만 담는다.
   시간은 자정부터 센 분, 돈은 원, 체력과 하트는 0~5칸이다.
   집에서 하는 일은 모두 시계를 움직인다. 저녁에 무엇을 얼마나 할지는 자유이고,
   늦게 잘수록 다음 날 아침 체력이 덜 찬다. 피곤하면(체력 1칸 이하) 모든 일이 오래 걸린다. */
var Life = (function () {
  'use strict';

  var VERSION = 2;
  var GOAL = 8;            // 수습 평가 목표 계약 건수
  var ALLOWANCE = 2000;    // 출근한 날 활동비
  var BONUS = 1.5;         // 목표를 채운 뒤의 계약 수당 배율 (성과급)
  var MAX = 5;             // 체력, 하트 칸 수

  // 시계 (분)
  var T = {
    wake: 465, wokeWake: 475, leaveBy: 490, commute: 50, assembly: 540,
    dress: 6, roller: 6, feed: 5, water: 3, scoop: 6, sand: 6, pet: 4, coffee: 3,
    accident: 10, search: 3,
    workEnd: 1080, homeArrive: 1140, shopStop: 20, groupLeave: 1260, groupHome: 1290,
    bedtime: 1380, weekendStart: 600, weekendLunch: 900,
    play: 40, rest: 60, prep: 60, sweep: 30, mop: 30, job: 240, curtain: 10, lunch: 15, shopTrip: 60
  };

  var PRODUCTS = {
    dental: { pay: 6000 }, pet: { pay: 5000 }, car: { pay: 5000 },
    home: { pay: 4000 }, travel: { pay: 3000 }, group: { pay: 20000 }
  };

  var SHOP = {
    dry: { price: 12000 }, sand: { price: 8000 }, wet: { price: 15000 }, toy: { price: 3500 },
    tower: { price: 30000, once: true }, feeder: { price: 25000, once: true },
    roller: { price: 3000, once: true }, coffee: { price: 2000 }, lunch: { price: 6000 },
    // 4/17(금)부터 진열되는 자동 물건. 손으로 하는 것보다 효과가 눈에 띄게 적다.
    robot: { price: 24000, once: true, from: 5 }, autoToy: { price: 16000, once: true, from: 5 }
  };
  var AUTO_TOY_NIGHTS = 5;  // 자동 장난감은 혼자 노는 밤 다섯 번이면 닳는다
  var JOB = { pay: 5000, minutes: 240, energy: 3, lastStart: 900 }; // 주말 슈퍼 알바
  var DRY_MEALS = 8, WET_MEALS = 6, SAND_DAYS = 4, TOY_PLAYS = 4;

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

  // 고객 15명. need는 원하는 상품, mark는 고객 메모에 적힌 특징.
  // 첫 고객(c1)은 털 알레르기가 있다: 첫날 아침 정장에 붙은 털 때문에 반드시 계약을 놓친다.
  var CLIENTS = {
    c1: { day: 1, need: 'dental', mark: 'sneeze', tutorial: true },
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
    return { day: s.day, earned: [], lost: [], spent: [], hearts: [], stickers: [], notes: [], energyNext: null, total: 0, sleep: null };
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
      floor: { fur: 1, dust: 0 },
      toy: TOY_PLAYS,
      fur: 0, wearing: 'hoodie',
      owned: { roller: false, tower: false, feeder: false, robot: false, autoToy: false }, autoToyLeft: 0, jobbed: false,
      pantry: { sand: 0, coffee: 0, lunch: 0 },
      coffee: false, lateCoffee: false, shopped: false,
      played: false, petted: false, rested: 0,
      prepared: {}, cards: [],
      door: 'closed', woke: false, left: 0, late: 0,
      hidden: false, stormDone: false, group: null,
      contracts: 0, goalDay: null, results: [], missed: 0,
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
  // 집에 있을 때는 무엇을 하든 시계가 간다. 걷기와 대화는 시간을 쓰지 않는다.
  function timed(s) { return s.phase === 'morning' || s.phase === 'evening' || s.phase === 'weekend'; }
  function tired(s) { return s.energy <= 1; }
  function cost(s, minutes) { return tired(s) ? Math.ceil(minutes * 1.5) : minutes; }
  function spend(s, minutes) {
    if (!timed(s)) return 0;
    var m = cost(s, minutes);
    s.minute += m;
    if (s.phase === 'weekend' && s.meal === 'am' && s.minute >= T.weekendLunch) switchMeal(s);
    return m;
  }

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
  // 모래가 하루 한 칸씩 준다. 1칸 이하면 갈아 줄 때다.
  function sandLow(s) { return s.litter.sand <= 1; }
  function refill(s) {
    if (s.pantry.sand <= 0) return { ok: false, why: 'noSand' };
    if (s.litter.sand >= SAND_DAYS) return { ok: false, why: 'full' };
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
    // 바닥에 털이 쌓여 있으면 정장으로 갈아입는 사이에도 털이 묻는다
    if (s.floor.fur >= 3 && s.fur < 3) { s.fur++; s.today.notes.push('floorFur'); }
    return { ok: true, minutes: spend(s, T.dress) };
  }
  function canRoll(s) { return !!s.owned.roller; }
  function roll(s) {
    if (!s.fur) return { ok: false, why: 'clean' };
    if (!canRoll(s)) return { ok: false, why: 'noRoller' };
    s.fur = 0;
    return { ok: true, minutes: spend(s, T.roller) };
  }
  // 커피는 하루 한 잔. 마시면 체력 +1. 저녁 6시 넘어 마시면 그날 밤 잠이 덜 찬다.
  function drinkCoffee(s) {
    if (s.coffee) return { ok: false, why: 'already' };
    if (s.pantry.coffee <= 0) return { ok: false, why: 'none' };
    s.pantry.coffee--; s.coffee = true; energy(s, +1);
    if ((s.phase === 'evening' || s.phase === 'weekend') && s.minute >= T.workEnd) s.lateCoffee = true;
    return { ok: true, minutes: spend(s, T.coffee), late: s.lateCoffee };
  }
  function eatLunch(s) {
    if (s.pantry.lunch <= 0) return { ok: false, why: 'none' };
    if (s.energy >= MAX) return { ok: false, why: 'full' };
    s.pantry.lunch--; energy(s, +1); s.today.notes.push('lunch');
    return { ok: true, minutes: spend(s, T.lunch) };
  }
  function search(s, spot) {
    if (!s.hidden || day(s).kind !== 'work' || !day(s).hide) return { ok: false };
    var minutes = spend(s, T.search);
    if (spot === 'drawer') { s.hidden = false; event(s, 'drawer'); return { ok: true, found: true, minutes: minutes }; }
    return { ok: true, found: false, minutes: minutes };
  }

  // ---------- 저녁과 주말에 하는 일 (모두 시간이 든다) ----------
  function homeTime(s) { return s.phase === 'evening' || s.phase === 'weekend'; }
  function doBlock(s, kind) {
    if (!homeTime(s)) return 'notHome';
    if (kind === 'play') { if (s.hidden) return 'hidden'; if (s.toy <= 0) return 'noToy'; if (s.played) return 'played'; if (s.energy <= 1) return 'tired'; }
    if (kind === 'prep') { if (!s.cards.length) return 'noCard'; if (s.cards.every(function (id) { return s.prepared[id]; })) return 'prepared'; }
    if (kind === 'rest') { if (s.energy >= MAX) return 'full'; if (s.rested >= (s.phase === 'weekend' ? 2 : 1)) return 'rested'; }
    if (kind === 'sweep' && s.floor.fur <= 0) return 'clean';
    if (kind === 'mop' && s.floor.dust <= 0) return 'clean';
    if (kind === 'curtain' && (!day(s).storm || s.stormDone || s.phase !== 'evening')) return 'noStorm';
    if (kind === 'shop' && s.phase !== 'weekend') return 'noShop';
    return null;
  }
  function act(s, kind) {
    var why = doBlock(s, kind);
    if (why) return { ok: false, why: why };
    var r = { ok: true };
    if (kind === 'play') { s.played = true; s.toy--; heart(s, +1, 'play'); r.broke = s.toy <= 0; }
    else if (kind === 'rest') { energy(s, +1); s.rested++; }
    else if (kind === 'prep') { s.cards.forEach(function (id) { s.prepared[id] = true; }); }
    else if (kind === 'sweep') { s.floor.fur = 0; }
    else if (kind === 'mop') { s.floor.dust = 0; }
    else if (kind === 'curtain') { s.stormDone = true; s.hidden = false; heart(s, +1, 'curtain'); event(s, 'curtain'); }
    else if (kind === 'shop') { s.shopped = true; }
    r.minutes = spend(s, { play: T.play, rest: T.rest, prep: T.prep, sweep: T.sweep, mop: T.mop, curtain: T.curtain, shop: T.shopTrip }[kind]);
    return r;
  }

  // ---------- 주말 알바 ----------
  // 슈퍼 진열 정리 네 시간에 5,000원. 몸이 고되고, 그동안 고양이는 혼자 있다.
  function jobBlock(s) {
    if (s.phase !== 'weekend') return 'notWeekend';
    if (s.jobbed) return 'done';
    if (s.minute > JOB.lastStart) return 'late';
    if (s.energy < JOB.energy) return 'tired';
    return null;
  }
  function sideJob(s) {
    var why = jobBlock(s);
    if (why) return { ok: false, why: why };
    s.jobbed = true;
    var minutes = spend(s, T.job);
    energy(s, -JOB.energy);
    s.wallet += JOB.pay;
    s.today.earned.push({ key: 'job', amount: JOB.pay });
    heart(s, -1, 'jobAlone');
    event(s, 'job');
    return { ok: true, minutes: minutes, pay: JOB.pay };
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
  // 상담 계획. 처음 보는 신입이라 기분은 1에서 시작하고, 계약서를 건넬 때 3 이상이어야 서명한다.
  // 메일을 읽고 가면 +1이라 실수 하나쯤은 버틴다. 안 읽고 가면 털, 하품, 머뭇거림 하나에 놓친다.
  // 맞게 건네면 +1, 너무 오래 걸리면 −1. 엉뚱한 것을 건네면 고객은 그 자리에서 생각해 보겠다고 한다.
  function plan(s, id) {
    var c = CLIENTS[id], mood = 1, reasons = [], fur = s.fur > 0;
    var eff = s.energy;
    if (c.evening) eff = s.energy - 2; // 저녁 8시에는 하루 일한 만큼 지쳐 있다
    var busy = c.mark === 'clock', first = id === firstClient(s) && !c.evening;
    // 늦으면 첫 고객은 기다리다 가 버린다
    if (first && s.late > 0) return { id: id, need: c.need, mark: c.mark, leaves: true, mood: 0, reasons: [{ key: busy ? 'busyLeft' : 'lateLeft', delta: 0 }], steps: [], tutorial: !!c.tutorial };
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
      timer: c.tutorial ? 0 : busy ? 3.5 : 5,
      blur: eff >= 1 && eff <= 2, blink: eff <= 0,
      prepared: !!s.prepared[id], tutorial: !!c.tutorial, evening: !!c.evening, leaves: false, fur: fur
    };
  }
  function consult(p) { return { step: 0, mood: p.mood, wrong: 0, slow: 0, done: !!p.leaves, signed: false }; }
  function wants(p, st) {
    var step = p.steps[st.step];
    return step === 'need' ? p.need : step;
  }
  function answer(p, st, item) {
    if (st.done) return { ok: false, done: true };
    var want = wants(p, st);
    if (item !== want) { st.mood = 0; st.wrong++; st.done = true; st.signed = false; return { ok: false, done: true, signed: false, mood: 0, want: want }; }
    if (want === 'contract') { st.done = true; st.signed = st.mood >= 3; return { ok: true, done: true, signed: st.signed, mood: st.mood }; }
    st.mood = clamp(st.mood + 1, 0, 4); st.step++;
    return { ok: true, mood: st.mood, next: wants(p, st) };
  }
  function timeout(p, st) { if (st.done || !p.timer) return st.mood; st.mood = clamp(st.mood - 1, 0, 4); st.slow++; return st.mood; }
  function lossReason(p, st) {
    if (p.leaves) return p.reasons[0] ? p.reasons[0].key : 'lateLeft';
    var order = ['sneeze', 'fur', 'yawn'];
    if (st.wrong) return 'mistake';
    for (var i = 0; i < order.length; i++) {
      for (var j = 0; j < p.reasons.length; j++) if (p.reasons[j].key === order[i]) return order[i];
    }
    return st.slow ? 'slow' : 'mistake';
  }
  function payFor(s, need) { return Math.round(PRODUCTS[need].pay * (s.contracts >= GOAL ? BONUS : 1)); }
  function finish(s, p, st) {
    var signed = !p.leaves && !!st.signed;
    var r = { id: p.id, day: s.day, need: p.need, signed: signed, pet: signed && p.steps.indexOf('pet') >= 0, pay: 0, why: null, bonus: false, goal: false };
    if (signed) {
      r.bonus = s.contracts >= GOAL;
      r.pay = payFor(s, p.need) + (r.pet ? payFor(s, 'pet') : 0);
      if (!s.contracts) event(s, 'firstContract', { id: p.id });
      var before = s.contracts;
      s.contracts += r.pet ? 2 : 1;
      if (before < GOAL && s.contracts >= GOAL) { r.goal = true; s.goalDay = s.day; event(s, 'goal'); }
      s.today.stickers.push(p.need);
      if (r.pet) { s.today.stickers.push('pet'); event(s, 'catLover', { id: p.id }); }
      if (p.evening) event(s, 'groupSigned');
    } else {
      r.why = lossReason(p, st);
      // 털 알레르기 고객을 털 묻은 정장으로 놓친 첫날, 선배가 돌돌이 이야기를 해 준다
      var sneezed = p.reasons.some(function (x) { return x.key === 'sneeze'; });
      if (sneezed && !s.seen.furLost) { s.seen.furLost = true; event(s, 'furLost', { id: p.id }); }
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
      if (r.signed) { s.wallet += r.pay; s.today.earned.push({ key: 'contract', id: r.id, need: r.need, pet: r.pet, bonus: r.bonus, amount: r.pay }); }
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
    if (it.from && s.day < it.from) return 'notYet';
    if (it.once && s.owned[item] && !(item === 'autoToy' && s.autoToyLeft <= 0)) return 'owned';
    if (s.wallet < it.price) return 'money';
    return null;
  }
  function onShelf(s, item) { var it = SHOP[item]; return !!it && !(it.from && s.day < it.from); }
  function buy(s, item) {
    var why = buyBlock(s, item);
    if (why) return { ok: false, why: why };
    var price = SHOP[item].price;
    s.wallet -= price;
    s.today.spent.push({ item: item, amount: price });
    if (item === 'dry') s.food.dry += DRY_MEALS;
    else if (item === 'wet') s.food.wet += WET_MEALS;
    else if (item === 'toy') s.toy += TOY_PLAYS;
    else if (item === 'sand') s.pantry.sand++;
    else if (item === 'coffee') s.pantry.coffee++;
    else if (item === 'lunch') s.pantry.lunch++;
    else s.owned[item] = true;
    if (item === 'autoToy') s.autoToyLeft = AUTO_TOY_NIGHTS;
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
    if (item === 'toy' && s.toy < TOY_PLAYS) return { ok: false, why: 'used' };
    if (s.pantry[item] !== undefined && s.pantry[item] <= 0) return { ok: false, why: 'used' };
    s.wallet += sp[i].amount;
    sp.splice(i, 1);
    if (item === 'dry') s.food.dry -= DRY_MEALS;
    else if (item === 'wet') s.food.wet -= WET_MEALS;
    else if (item === 'toy') s.toy -= TOY_PLAYS;
    else if (s.pantry[item] !== undefined) s.pantry[item]--;
    else s.owned[item] = false;
    if (item === 'autoToy') s.autoToyLeft = 0;
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
    s.rested = 0;
    s.wearing = 'hoodie';
    // 혼자 보낸 하루. 캣타워가 있으면 창밖을 보며 덜 심심했다.
    if (day(s).kind === 'work') { if (s.owned.tower) heart(s, -1, 'aloneTower'); else heart(s, -2, 'alone'); }
    s.hidden = !!day(s).storm; // 천둥 치는 밤에는 숨는다. 아침에 숨었던 것은 저녁에 나온다
    return {};
  }
  // 주말 오후 3시 전에 침대에 누우면 낮잠이다. 오후 3시에 깨고, 고양이 저녁 끼니가 시작된다.
  function napFirst(s) { return s.phase === 'weekend' && s.meal === 'am'; }
  function nap(s) {
    if (!napFirst(s)) return { ok: false };
    var minutes = Math.max(0, T.weekendLunch - s.minute);
    s.minute = Math.max(s.minute, T.weekendLunch);
    switchMeal(s);
    return { ok: true, minutes: minutes };
  }
  function toBed(s) { s.phase = 'night'; }
  function setDoor(s, open) { s.door = open ? 'open' : 'closed'; return s.door; }
  // 안 놀아 준 밤: 자동 장난감이 돌면 혼자 놀아서 울지 않는다 (마음은 오르지 않는다)
  function autoToyOn(s) { return !!s.owned.autoToy && s.autoToyLeft > 0; }
  function unplayed(s) { return !s.played && !autoToyOn(s); }
  function needsPOV(s) { return s.door === 'closed' && unplayed(s) && !s.hidden; }
  // 잠든 시각에 따라 찰 체력: 11시 전 +3, 그 뒤로 한 시간마다 1칸씩 덜 찬다
  function sleepGain(minute) {
    var over = Math.max(0, minute - T.bedtime);
    return Math.max(0, 3 - Math.ceil(over / 60));
  }
  function sleep(s, opt) {
    opt = opt || {};
    var t = s.today, woke = false, note = null;
    var bed = s.minute;
    var hungry = !s.fed.pm ? missMeal(s, 'pm') : false;
    if (!s.water) heart(s, -1, 'dry');
    if (s.floor.dust >= 3) heart(s, -1, 'dusty');
    var autoPlayed = !s.played && autoToyOn(s) && !s.hidden;
    var together = s.door === 'open' && !s.hidden;
    if (together) {
      heart(s, +1, 'together');
      if (hungry || unplayed(s)) { woke = true; note = hungry ? 'wakeHungry' : 'wakeZoomies'; }
      else note = 'slept';
    } else if (needsPOV(s)) {
      if (opt.cat === 'scratch') { woke = true; note = 'scratched'; event(s, 'scratched'); }
      else { heart(s, -1, 'lonely'); note = 'lonely'; event(s, 'lonely'); }
    } else note = 'closed';
    if (autoPlayed) { s.autoToyLeft--; t.notes.push(s.autoToyLeft > 0 ? 'autoToy' : 'autoToyWorn'); }
    var base = sleepGain(bed), lost = [];
    if (bed > T.bedtime) lost.push('late');
    if (woke) lost.push('woke');
    if (s.lateCoffee) lost.push('coffee');
    var want = Math.max(0, base - (woke ? 1 : 0) - (s.lateCoffee ? 1 : 0));
    var gain = energy(s, want);
    s.woke = woke;
    s.morningNote = { key: note, gain: gain };
    t.sleep = { bed: bed, gain: gain, lost: lost };
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
    var doorOpen = s.door === 'open';
    s.day++;
    s.today = freshToday(s);
    var d = day(s);
    s.fed = { am: false, pm: false }; s.meal = 'am'; s.bowl = 'empty';
    s.water = false; s.played = false; s.petted = false; s.rested = 0;
    s.coffee = false; s.lateCoffee = false; s.shopped = false; s.late = 0; s.left = 0;
    s.wearing = 'hoodie';
    s.hidden = !!d.hide;
    s.litter.poop++;
    var dirty = s.litter.poop >= 3, noSand = s.litter.sand <= 0, accident = dirty || noSand;
    var why = noSand && !dirty ? 'Sand' : '';
    s.litter.sand = Math.max(0, s.litter.sand - 1);
    // 고양이 털은 매일 바닥에 쌓이고, 먼지는 이틀에 한 번 쌓인다
    s.floor.fur = Math.min(6, s.floor.fur + 1);
    if (s.day % 2 === 0) s.floor.dust = Math.min(6, s.floor.dust + 1);
    // 로봇청소기: 밤새 돌아서 털이 더 쌓이지 않게 막는다. 다 치우지는 못하고, 먼지는 못 닦는다.
    if (s.owned.robot && s.floor.fur > 1) { s.floor.fur--; s.today.notes.push('robot'); }
    s.jobbed = false;
    if (d.kind === 'off') {
      s.phase = 'weekend'; s.minute = T.weekendStart;
    } else {
      s.phase = 'morning'; s.minute = s.woke ? T.wokeWake : T.wake;
    }
    // 문을 열어 두고 잤으면 침대까지 와서, 닫고 잤으면 거실 바닥에 실수한다
    var key = 'accident' + why + (doorOpen ? 'Bed' : '');
    if (accident) { if (s.phase === 'morning') s.minute += T.accident; heart(s, -1, key); }
    var note = s.morningNote; s.morningNote = null;
    return { accident: accident, key: accident ? key : null, where: doorOpen ? 'bed' : 'floor', note: note, hidden: s.hidden };
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
    VERSION: VERSION, GOAL: GOAL, ALLOWANCE: ALLOWANCE, BONUS: BONUS, MAX: MAX, T: T,
    PRODUCTS: PRODUCTS, SHOP: SHOP, DAYS: DAYS, CLIENTS: CLIENTS,
    DRY_MEALS: DRY_MEALS, WET_MEALS: WET_MEALS, SAND_DAYS: SAND_DAYS, TOY_PLAYS: TOY_PLAYS,
    create: create, day: day, clientsOn: clientsOn, nextWorkDay: nextWorkDay, tired: tired, cost: cost,
    feed: feed, feedBlock: feedBlock, ate: ate, water: giveWater, scoop: scoop, refill: refill, sandLow: sandLow, pet: pet,
    dress: dress, roll: roll, canRoll: canRoll, coffee: drinkCoffee, jobBlock: jobBlock, sideJob: sideJob, JOB: JOB, autoToyOn: autoToyOn, onShelf: onShelf, lunch: eatLunch, search: search,
    act: act, doBlock: doBlock, homeTime: homeTime,
    leaveHome: leaveHome, plan: plan, consult: consult, wants: wants, answer: answer, timeout: timeout, finish: finish, payFor: payFor,
    decideGroup: decideGroup, leaveOffice: leaveOffice,
    buy: buy, buyBlock: buyBlock, unbuy: unbuy,
    arriveHome: arriveHome, napFirst: napFirst, nap: nap, toBed: toBed, setDoor: setDoor, needsPOV: needsPOV, unplayed: unplayed, sleepGain: sleepGain, sleep: sleep, morning: morning,
    evaluate: evaluate, ending: ending,
    save: save, load: load,
    hasBatchim: hasBatchim, nameForm: nameForm, josa: josa, clock: clock, won: won, cleanName: cleanName
  };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Life;
