/* 하루 상태 모델. 화면 없이 돌아가고, JSON으로 그대로 저장할 수 있는 값만 담는다.
   시간은 자정부터 센 분, 돈은 원, 체력과 하트는 0~5칸이다.
   집에서 하는 일은 모두 시계를 움직인다. 저녁에 무엇을 얼마나 할지는 자유이고,
   늦게 잘수록 다음 날 아침 체력이 덜 찬다. 피곤하면(체력 1칸 이하) 모든 일이 오래 걸린다. */
var Life = (function () {
  'use strict';

  var VERSION = 3;
  var GOAL = 12;           // 위촉 첫 달 기준 실적(계약 건수). 채우면 정착지원금이 나온다.
  var MAX = 5;             // 체력, 하트 칸 수
  var START_WALLET = 380000;
  var SETTLE = 500000;     // 신입 정착지원금 (기준 실적을 채운 달에만)
  var TAX = 0.033;         // 사업소득세 3.3% (설계사는 회사 직원이 아니라 위촉된 개인사업자)
  var CASH = { amount: 300000, rate: 0.18 }; // 현금서비스(단기카드대출): 연 18%로 계산

  // 시계 (분)
  var T = {
    wake: 460, wokeWake: 470, leaveBy: 490, commute: 50, assembly: 540,
    dress: 6, roller: 6, feed: 5, water: 3, scoop: 6, sand: 6, pet: 4, coffee: 3,
    accident: 10, search: 3,
    workEnd: 1080, homeArrive: 1140, shopStop: 20, groupLeave: 1260, groupHome: 1290,
    bedtime: 1380, weekendStart: 600, weekendLunch: 900,
    play: 40, rest: 60, cook: 40, quick: 5, photo: 1, prep: 60, sweep: 30, mop: 30, job: 240, curtain: 10, lunch: 15, shopTrip: 40
  };
  var NIGHT_RATE = 1.5;     // 밤 11시가 넘으면 슈퍼 물건값이 심야 할증으로 오른다

  // 상품과 보장 항목. 숫자는 그 항목을 넣었을 때 늘어나는 한 달 보험료(원).
  // 여행자보험은 여행 한 번에 한 번 내는 보험료, 단체보험은 직원 일곱 명을 더한 값이다.
  // rate: 보험료의 몇 배를 수수료로 받는지 (실제로는 회사와 상품마다 다르고, 첫해 수수료는 월 보험료의 12배를 넘지 못한다)
  var PRODUCTS = {
    dental: { rate: 2, items: { fill: 9000, implant: 14000, gum: 5000 } },
    car: { rate: 2, items: { settle: 8000, fine: 3000, lawyer: 4000, injury: 9000 } },
    travel: { rate: 0.4, once: true, items: { med: 18000, luggage: 6000, delay: 4000 } },
    home: { rate: 2, base: 'fire', items: { fire: 7000, liab: 2000, theft: 4000 } }, // 일상배상과 도난은 화재보험에 붙이는 특약이라 화재 보장이 기본
    pet: { rate: 2, items: { surgery: 16000, clinic: 14000, bite: 2000 } },
    group: { rate: 1, items: { injury: 42000, hospital: 28000, surgery: 21000 } }
  };
  var UNLOCK = { dental: 1, home: 1, travel: 2, car: 3, pet: 4 }; // 이날부터 상담 책상에 안내서가 놓인다

  var SHOP = {
    dry: { price: 12000 }, sand: { price: 8000 }, wet: { price: 15000 }, toy: { price: 3500 },
    tower: { price: 30000, once: true }, feeder: { price: 25000, once: true },
    roller: { price: 3000, once: true }, coffee: { price: 2000 }, lunch: { price: 6000 },
    // 4/17(금)부터 진열되는 자동 물건. 손으로 하는 것보다 효과가 눈에 띄게 적다.
    robot: { price: 24000, once: true, from: 5 }, autoToy: { price: 16000, once: true, from: 5 }
  };
  var AUTO_TOY_NIGHTS = 5;  // 자동 장난감은 혼자 노는 밤 다섯 번이면 닳는다
  var JOB = { pay: 41280, minutes: 240, energy: 3, lastStart: 900 }; // 주말 슈퍼 알바 (2026년 최저시급 10,320원 × 4시간)
  var DRY_MEALS = 8, WET_MEALS = 6, SAND_DAYS = 4, TOY_PLAYS = 4;
  var CLEAN_FROM = 2, DUST_FROM = 4; // 바닥 청소와 화장실은 4/14부터, 먼지 발자국은 4/16부터

  // 위촉 첫 달: 4/12(일) 저녁부터 5/8(금)까지. 5/5 어린이날은 쉰다.
  var DAYS = [
    { date: '4/12', wd: '일', kind: 'eve' },
    { date: '4/13', wd: '월', kind: 'work', first: true },
    { date: '4/14', wd: '화', kind: 'work' },
    { date: '4/15', wd: '수', kind: 'work', storm: true },
    { date: '4/16', wd: '목', kind: 'work' },
    { date: '4/17', wd: '금', kind: 'work', dinner: true, mom: true },
    { date: '4/18', wd: '토', kind: 'off' },
    { date: '4/19', wd: '일', kind: 'off' },
    { date: '4/20', wd: '월', kind: 'work', alarm: true },
    { date: '4/21', wd: '화', kind: 'work', hide: true },
    { date: '4/22', wd: '수', kind: 'work' },
    { date: '4/23', wd: '목', kind: 'work' },
    { date: '4/24', wd: '금', kind: 'work' },
    { date: '4/25', wd: '토', kind: 'off' },
    { date: '4/26', wd: '일', kind: 'off' },
    { date: '4/27', wd: '월', kind: 'work' },
    { date: '4/28', wd: '화', kind: 'work' },
    { date: '4/29', wd: '수', kind: 'work', group: 'c6', overtime: true },
    { date: '4/30', wd: '목', kind: 'work' },
    { date: '5/1', wd: '금', kind: 'work' },
    { date: '5/2', wd: '토', kind: 'off' },
    { date: '5/3', wd: '일', kind: 'off' },
    { date: '5/4', wd: '월', kind: 'work' },
    { date: '5/5', wd: '화', kind: 'off', holiday: '어린이날' },
    { date: '5/6', wd: '수', kind: 'work' },
    { date: '5/7', wd: '목', kind: 'work', eve: true },
    { date: '5/8', wd: '금', kind: 'work', final: true }
  ];
  function week(d) { return d <= 7 ? 1 : d <= 14 ? 2 : d <= 21 ? 3 : 4; }

  // 날짜가 정해진 요금. notice 날 저녁에 휴대폰으로 안내가 오고, due 날 저녁에 낸다.
  var BILLS = [
    { id: 'phone', notice: 1, due: 3, amount: 55000, auto: true, lateFee: 1100 },
    { id: 'rent', notice: 12, due: 15, amount: 480000, defer: true, lateFee: 0 },
    { id: 'loan', notice: 15, due: 18, amount: 120000, auto: true, lateFee: 300 }
  ];

  // 고객. 평일마다 한 분 (첫날만 두 분). 대사는 Story.TALK에 있다.
  // needs: 꼭 넣어야 하는 보장, budget: 한 달에 낼 수 있는 보험료
  // mark: sneeze(털 알레르기) cat(고양이를 키움) clock(시간이 없음) doubt(꼼꼼히 따짐)
  // ask: disclose(알릴 사실이 있음) refuse(알리면 가입이 어려움) switch(이미 든 보험이 있음) delay(나중에 들겠다고 함)
  var CLIENTS = {
    c1: { day: 1, product: 'dental', budget: 30000, needs: ['implant'], mark: 'sneeze' },
    c16: { day: 1, product: 'home', budget: 15000, needs: ['liab'], mark: 'none' },
    c2: { day: 2, product: 'travel', budget: 40000, needs: ['med'], mark: 'none' },
    c3: { day: 3, product: 'car', budget: 15000, needs: ['settle'], mark: 'none' },
    c10: { day: 4, product: 'pet', budget: 35000, needs: ['surgery'], mark: 'cat' },
    c7: { day: 5, product: 'home', budget: 15000, needs: ['fire', 'liab'], mark: 'cat' },
    c8: { day: 8, product: 'travel', budget: 20000, needs: ['med'], mark: 'clock' },
    c9: { day: 9, product: 'car', budget: 20000, needs: ['settle', 'fine'], mark: 'doubt' },
    c4: { day: 10, product: 'dental', budget: 30000, needs: ['fill'], mark: 'sneeze', ask: 'disclose' },
    c11: { day: 11, product: 'home', budget: 10000, needs: ['fire'], mark: 'none' },
    c12: { day: 12, product: 'travel', budget: 30000, needs: ['med'], mark: 'doubt', history: true },
    c13: { day: 15, product: 'dental', budget: 25000, needs: ['implant'], mark: 'none', ask: 'switch', existing: { covers: ['fill'] } },
    c14: { day: 16, product: 'car', budget: 15000, needs: ['settle'], mark: 'none', ask: 'delay', persuade: 'start' },
    c15: { day: 17, product: 'home', budget: 12000, needs: ['fire', 'liab'], mark: 'doubt' },
    c6: { day: 17, product: 'group', budget: 80000, needs: ['injury', 'hospital'], mark: 'none', evening: true },
    c17: { day: 18, product: 'pet', budget: 40000, needs: ['clinic'], mark: 'none', ask: 'disclose' },
    c18: { day: 19, product: 'car', budget: 20000, needs: ['settle', 'injury'], mark: 'clock' },
    c19: { day: 22, product: 'travel', budget: 50000, needs: ['med', 'luggage'], mark: 'cat' },
    c20: { day: 24, product: 'dental', budget: 30000, needs: ['gum'], mark: 'none', ask: 'refuse' },
    r1: { day: 25, product: 'home', budget: 15000, needs: ['liab'], mark: 'none', ref: 'c13' },
    c21: { day: 25, product: 'dental', budget: 30000, needs: ['fill', 'implant'], mark: 'none', ask: 'delay', persuade: 'family' },
    r2: { day: 26, product: 'car', budget: 20000, needs: ['settle', 'fine'], mark: 'none', ref: 'c20' }
  };
  var CLIENT_IDS = Object.keys(CLIENTS);
  // 정직하게 대한 고객이 소개해 준 사람만 온다
  function comes(s, id) { var c = CLIENTS[id]; return !c.ref || !!(s.refs && s.refs[id]); }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function cleanName(n, fallback) {
    var v = String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, 8);
    return v || fallback;
  }
  function day(s) { return DAYS[s.day] || DAYS[DAYS.length - 1]; }
  function clientsOn(d, s) {
    return CLIENT_IDS.filter(function (id) { return CLIENTS[id].day === d && !CLIENTS[id].evening && (!s || comes(s, id)); });
  }
  function nextWorkDay(d) {
    for (var i = d + 1; i < DAYS.length; i++) if (DAYS[i].kind === 'work') return i;
    return -1;
  }

  function freshToday(s) {
    return { day: s.day, earned: [], lost: [], spent: [], hearts: [], stickers: [], notes: [], cancels: [], bills: [], energyNext: null, total: 0, sleep: null };
  }

  function create(me, cat) {
    var s = {
      v: VERSION, me: cleanName(me, '김신입'), cat: cleanName(cat, '보리'),
      day: 0, phase: 'evening', minute: T.homeArrive,
      wallet: START_WALLET, energy: 4, hearts: 3,
      food: { dry: 4, wet: 0 },
      bowl: 'empty', bowlKind: 'dry', meal: 'pm', fed: { am: true, pm: false },
      water: false,
      litter: { poop: 0, sand: 4 },
      floor: { fur: 0, dust: 0 },
      toy: TOY_PLAYS,
      fur: 0, smell: 0, locked: false, wearing: 'hoodie',
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
      seen: {},
      // 둘이라서: 내가 찍은 사진, 내 저녁, 4/17 회식, 4/20 알람, 4/23 마지막 준비
      photos: [], myMeal: null, cooked: false, out: null, alarm: null, lid: null,
      // v7: 들어올 수수료, 요금, 현금서비스, 소개, 손에 익은 일
      pending: [], bills: { phone: 'none', rent: 'none', loan: 'none' }, loan: null, refs: {}, paid: null,
      habit: { care: 0, explain: 0 }
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
  // 모래가 다 떨어지면 똥이 바닥에 눌어붙어 퍼낼 수 없다. 새 모래를 부어야 한다.
  function scoop(s) {
    if (s.litter.poop <= 0) return { ok: false, why: 'clean' };
    if (s.litter.sand <= 0) return { ok: false, why: 'noSand' };
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
    var first = !s.petted, furred = false;
    s.petted = true;
    var minutes = spend(s, T.pet);
    if (first) heart(s, +1, 'pet');
    // 정장을 입고 안아 주면 털이 묻는다
    if (s.wearing === 'suit' && s.fur < 3) { s.fur++; furred = true; s.today.notes.push('petFur'); }
    return { ok: true, minutes: minutes, first: first, fur: furred };
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

  // 손에 익은 돌봄: 그릇을 한 번 누르면 밥, 물, 화장실을 이어서 챙긴다 (걸리는 시간은 같다)
  var HABIT_DAYS = 3;
  function habitReady(s) { return !!s.habit && (s.habit.care || 0) >= HABIT_DAYS; }

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
    if (spot === 'drawer') { var late = s.locked; s.hidden = false; s.locked = false; event(s, late ? 'drawerLate' : 'drawer'); return { ok: true, found: true, late: late, minutes: minutes }; }
    return { ok: true, found: false, minutes: minutes };
  }

  // ---------- 저녁과 주말에 하는 일 (모두 시간이 든다) ----------
  function homeTime(s) { return s.phase === 'evening' || s.phase === 'weekend'; }
  function doBlock(s, kind) {
    if (!homeTime(s)) return 'notHome';
    if (kind === 'play') { if (s.hidden) return 'hidden'; if (s.toy <= 0) return 'noToy'; if (s.played) return 'played'; if (s.energy <= 1) return 'tired'; }
    if (kind === 'prep') { if (s.lid === 'lid') return 'lid'; if (!s.cards.length) return 'noCard'; if (s.cards.every(function (id) { return s.prepared[id]; })) return 'prepared'; }
    if (kind === 'rest') { if (s.energy >= MAX) return 'full'; if (s.rested >= (s.phase === 'weekend' ? 2 : 1)) return 'rested'; }
    if (kind === 'sweep' && s.floor.fur <= 0) return 'clean';
    if (kind === 'mop' && s.floor.dust <= 0) return 'clean';
    if (kind === 'curtain' && (!day(s).storm || s.stormDone || s.phase !== 'evening')) return 'noStorm';
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
    else if (kind === 'shop') { s.trips = (s.trips || 0) + 1; }
    r.minutes = spend(s, { play: T.play, rest: T.rest, prep: T.prep, sweep: T.sweep, mop: T.mop, curtain: T.curtain, shop: T.shopTrip }[kind]);
    return r;
  }

  // ---------- 주말 알바 ----------
  // 슈퍼 진열 정리 네 시간에 최저시급만큼. 몸이 고되고, 그동안 고양이는 혼자 있다.
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
  // 화장실에 똥을 두고 나가면 옷에 냄새가 밴다 (하나면 −1, 쌓였으면 −2)
  function smellOf(poop) { return poop >= 3 ? 2 : poop >= 1 ? 1 : 0; }
  function leaveHome(s) {
    if (s.wearing !== 'suit') return { ok: false, why: 'noSuit' };
    s.left = s.minute;
    s.late = Math.max(0, s.minute + T.commute - T.assembly);
    s.smell = smellOf(s.litter.poop);
    if (s.smell) s.today.notes.push('smell');
    // 못 찾은 고양이는 서랍 속에 갇힌 채 하루를 보낸다
    if (s.hidden) { s.today.notes.push('leftHidden'); s.locked = true; }
    switchMeal(s);
    s.phase = 'work';
    s.minute = s.left + T.commute;
    return { ok: true, late: s.late };
  }
  function firstClient(s) { return clientsOn(s.day, s)[0]; }

  // ---------- 상담 ----------
  // 한 번의 상담은 실제 순서대로 네 단계다: 듣기 → 설계하기 → 청약서 쓰기 → 설명하고 서명받기.
  // 기분(mood)은 2에서 시작하고, 서명할 때 2 이상이어야 서명한다.
  // 털, 냄새, 하품은 기분을 깎고, 메일을 읽고 간 고객, 맞는 설계, 솔직한 청약서는 기분을 올린다.
  var SIGN_MOOD = 2;
  // 듣기에서 고객이 하는 말. life: 사는 이야기, worry: 걱정, budget: 한 달 예산, hook: 지금 들어야 할 이유(미루는 고객만)
  function facts(c) { var f = ['life', 'worry', 'budget']; if (c.persuade) f.push('hook'); return f; }
  // 청약서의 알릴 의무 질문 세 줄. 예라고 답할 줄(yes)은 고객마다 다르다.
  function questions(c) {
    var yes = c.ask === 'disclose' || c.ask === 'refuse' || c.history ? 1 : -1;
    return { n: 3, yes: yes };
  }
  function plan(s, id) {
    var c = CLIENTS[id], mood = SIGN_MOOD, reasons = [], fur = s.fur > 0;
    var eff = s.energy;
    if (c.evening) eff = s.energy - 2; // 저녁 8시에는 하루 일한 만큼 지쳐 있다
    var busy = c.mark === 'clock', first = id === firstClient(s) && !c.evening;
    var base = { id: id, product: c.product, budget: c.budget, needs: c.needs.slice(), mark: c.mark, ask: c.ask || null, evening: !!c.evening };
    // 늦으면 첫 고객은 기다리다 가 버린다
    if (first && s.late > 0) { base.leaves = true; base.mood = 0; base.reasons = [{ key: busy ? 'busyLeft' : 'lateLeft', delta: 0 }]; return base; }
    // 첫 주는 선배가 옆에 앉아 청약서와 서명을 함께 봐 준다
    var tutorial = week(s.day) === 1 && !c.evening;
    if (s.smell) { mood -= s.smell; reasons.push({ key: s.smell > 1 ? 'stink' : 'smell', delta: -s.smell }); }
    if (fur) {
      if (c.mark === 'sneeze') { mood -= 2; reasons.push({ key: 'sneeze', delta: -2 }); }
      else if (c.mark === 'cat') { mood += 1; reasons.push({ key: 'catLover', delta: +1 }); }
      else { mood -= 1; reasons.push({ key: 'fur', delta: -1 }); }
    }
    if (c.mark === 'cat' && (s.photos || []).length >= 2) { mood += 1; reasons.push({ key: 'photos', delta: +1 }); }
    if (s.prepared[id]) { mood += 1; reasons.push({ key: 'prepared', delta: +1 }); }
    if (eff <= 1) { mood -= 1; reasons.push({ key: 'yawn', delta: -1 }); }
    base.mood = clamp(mood, 0, 4); base.reasons = reasons; base.leaves = false;
    base.facts = facts(c); base.questions = questions(c);
    base.existing = c.existing ? c.existing.covers.slice() : null;
    base.items = Object.keys(PRODUCTS[c.product].items);
    base.kinds = Object.keys(UNLOCK).filter(function (k) { return s.day >= UNLOCK[k]; }).concat(c.evening ? ['group'] : []);
    base.timer = busy ? 12 : 0; // 시간이 없는 고객: 단계마다 12초가 지나면 기분이 한 칸 내려간다
    base.tutorial = tutorial; base.prepared = !!s.prepared[id]; base.fur = fur; base.smell = s.smell || 0;
    base.blur = eff >= 1 && eff <= 2; base.blink = eff <= 0;
    base.quick = (s.habit.explain || 0) >= 3; // 설명을 세 번 끝까지 하면 손에 익어 한 번에 짚는다
    return base;
  }
  function consult(p) {
    return { stage: p.leaves ? 'done' : 'listen', mood: p.mood, notes: [], product: null, covers: {}, wrong: 0, slow: 0,
      over: false, switched: false, hidden: false, honest: null, explained: [], copies: false, skipped: false,
      persuaded: false, signed: false, outcome: p.leaves ? 'left' : null, done: !!p.leaves };
  }
  function lose(st, outcome) { st.done = true; st.signed = false; st.stage = 'done'; st.outcome = outcome; return { ok: false, done: true, outcome: outcome }; }
  // 1. 듣기: 고객의 말 중 적어 둘 것을 누른다 (세 줄까지)
  function note(p, st, fact) {
    if (st.stage !== 'listen' || p.facts.indexOf(fact) < 0) return { ok: false };
    var i = st.notes.indexOf(fact);
    if (i >= 0) { st.notes.splice(i, 1); return { ok: true, noted: false }; }
    if (st.notes.length >= 3) return { ok: false, full: true };
    st.notes.push(fact);
    return { ok: true, noted: true };
  }
  function listened(p, st) { if (st.stage === 'listen') st.stage = 'design'; return st.stage; }
  // 2. 설계하기: 안내서를 고르고, 보장을 켜고 끄면 보험료가 바로 바뀐다
  function pickProduct(p, st, kind) {
    if (st.stage !== 'design') return { ok: false };
    if (kind !== p.product) {
      st.wrong++; st.mood = clamp(st.mood - 1, 0, 4);
      if (st.wrong >= 2) return lose(st, 'wrongProduct');
      return { ok: false, wrongProduct: true, mood: st.mood };
    }
    st.product = kind; st.covers = {};
    if (PRODUCTS[kind].base) st.covers[PRODUCTS[kind].base] = true;
    return { ok: true };
  }
  function toggle(p, st, item) {
    if (st.stage !== 'design' || !st.product || p.items.indexOf(item) < 0 || PRODUCTS[st.product].base === item) return { ok: false };
    st.covers[item] = !st.covers[item];
    return { ok: true, on: st.covers[item], premium: premium(p, st) };
  }
  function covered(st) { return Object.keys(st.covers).filter(function (k) { return st.covers[k]; }); }
  function premium(p, st) {
    var items = PRODUCTS[p.product].items;
    return covered(st).reduce(function (sum, k) { return sum + (items[k] || 0); }, 0);
  }
  // 설계를 고객에게 보여 준다. force: 예산을 넘어도 이대로 권한다
  function submitDesign(p, st, force) {
    if (st.stage !== 'design' || !st.product) return { ok: false };
    var on = covered(st);
    var missing = p.needs.filter(function (k) { return on.indexOf(k) < 0; });
    if (missing.length) {
      st.wrong++; st.mood = clamp(st.mood - 1, 0, 4);
      if (st.wrong >= 3) return lose(st, 'missing');
      return { ok: false, missing: missing[0], mood: st.mood };
    }
    var pr = premium(p, st), over = pr > p.budget;
    if (over && !force) return { ok: false, over: true, premium: pr };
    // 여행자보험은 보험기간이 짧아 청약철회가 없어서, 고객이 그 자리에서 비싸다고 거절한다
    if (over && PRODUCTS[p.product].once) { st.mood = clamp(st.mood - 1, 0, 4); return { ok: false, overRefused: true, mood: st.mood }; }
    st.over = over;
    // 이미 든 보험과 겹치는 보장을 새로 넣으면 갈아타기(승환)다
    st.switched = !!(p.existing && on.some(function (k) { return p.existing.indexOf(k) >= 0; }));
    if (!over) st.mood = clamp(st.mood + 1, 0, 4);
    st.stage = 'apply';
    return { ok: true, premium: pr, over: over, switched: st.switched };
  }
  // 3. 청약서 쓰기: 고객이 알릴 의무 질문에 답한다. 예라고 답한 줄이 있으면 그대로 적을지 정한다.
  function apply(p, st, honest) {
    if (st.stage !== 'apply') return { ok: false };
    if (p.questions.yes < 0) { st.stage = 'explain'; st.honest = true; return { ok: true, clean: true }; }
    st.honest = !!honest;
    if (!honest) { st.hidden = true; st.stage = 'explain'; return { ok: true, hidden: true }; }
    // 알리면 가입이 어려운 고객: 솔직하게 적으면 오늘은 계약이 안 된다
    if (p.ask === 'refuse') return lose(st, 'declined');
    st.mood = clamp(st.mood + 1, 0, 4);
    st.stage = 'explain';
    return { ok: true, exclusion: true, mood: st.mood };
  }
  // 미루는 고객: 듣기에서 적어 둔 지금 들어야 할 이유를 보여 주면 마음을 바꾼다
  function persuade(p, st) {
    if (p.ask !== 'delay' || st.persuaded || st.done) return { ok: false };
    if (st.notes.indexOf('hook') >= 0) { st.persuaded = true; return { ok: true }; }
    return lose(st, 'later');
  }
  // 4. 설명하고 서명받기: 설명서의 굵은 칸 세 개(보장 안 되는 경우, 처음 90일, 줄어드는 기간)를 짚고, 약관과 부본을 건넨다
  function explain(p, st, i) {
    if (st.stage !== 'explain' || st.explained.indexOf(i) >= 0 || i < 0 || i > 2) return { ok: false };
    st.explained.push(i);
    return { ok: true, left: 3 - st.explained.length };
  }
  function hand(p, st) { if (st.stage !== 'explain') return { ok: false }; st.copies = true; return { ok: true }; }
  function needsPersuade(p, st) { return p.ask === 'delay' && !st.persuaded; }
  function sign(p, st) {
    if (st.stage !== 'explain' || needsPersuade(p, st)) return { ok: false };
    st.skipped = st.explained.length < 3 || !st.copies;
    st.done = true; st.stage = 'done';
    st.signed = st.mood >= SIGN_MOOD;
    st.outcome = st.signed ? 'signed' : 'mood';
    return { ok: true, signed: st.signed, mood: st.mood };
  }
  function timeout(p, st) {
    if (st.done || !p.timer) return st.mood;
    st.mood = clamp(st.mood - 1, 0, 4); st.slow++;
    if (st.mood <= 0) lose(st, 'slow');
    return st.mood;
  }
  function lossReason(p, st) {
    if (p.leaves) return p.reasons[0] ? p.reasons[0].key : 'lateLeft';
    if (st.outcome && st.outcome !== 'mood') return st.outcome;
    var order = ['sneeze', 'stink', 'smell', 'fur', 'yawn'];
    for (var i = 0; i < order.length; i++) {
      for (var j = 0; j < p.reasons.length; j++) if (p.reasons[j].key === order[i]) return order[i];
    }
    return st.slow ? 'slow' : st.wrong ? 'mistake' : 'mood';
  }
  // 수수료: 보험료 × 상품별 배수. 이번 달 실적은 5/8에 한꺼번에 들어온다.
  function commission(product, prem) { return Math.round(prem * PRODUCTS[product].rate / 10) * 10; }
  // 계약이 나중에 취소되는 경우. 해피콜은 그날 저녁, 청약철회는 엿새쯤 뒤, 승환 점검은 일주일쯤 뒤.
  function cancelPlan(s, p, st) {
    if (st.hidden) return { day: s.day, why: 'hide' };
    if (st.skipped && p.mark === 'doubt') return { day: s.day, why: 'unexplained' };
    if (st.switched) return { day: Math.min(DAYS.length - 1, s.day + 7), why: 'switch' };
    if (st.over) return { day: Math.min(DAYS.length - 1, s.day + 6), why: 'over' };
    return null;
  }
  function finish(s, p, st) {
    var signed = !p.leaves && !!st.signed;
    var r = { id: p.id, day: s.day, product: p.product, signed: signed, premium: 0, amount: 0, why: null, goal: false, outcome: st.outcome };
    if (!p.leaves) s.seen.consulted = true;
    if (signed) {
      r.premium = premium(p, st);
      r.amount = commission(p.product, r.premium);
      var cancel = cancelPlan(s, p, st);
      s.pending.push({ id: p.id, day: s.day, product: p.product, premium: r.premium, amount: r.amount, status: 'active', cancel: cancel });
      if (!st.skipped) s.habit.explain = (s.habit.explain || 0) + 1;
      if (!s.contracts) event(s, 'firstContract', { id: p.id });
      var before = s.contracts;
      s.contracts++;
      if (before < GOAL && s.contracts >= GOAL) { r.goal = true; s.goalDay = s.day; event(s, 'goal'); }
      s.today.stickers.push(p.product);
      s.today.earned.push({ key: 'pending', id: p.id, product: p.product, amount: r.amount });
      if (p.mark === 'cat') event(s, 'catLover', { id: p.id });
      if (p.evening) event(s, 'groupSigned');
      // 갈아타게 하지 않고 비어 있는 보장만 넣어 준 고객은 다음에 다른 사람을 소개해 준다
      if (p.existing && !st.switched) { s.refs.r1 = true; event(s, 'referralPromise', { id: p.id }); }
      if (st.hidden) event(s, 'hid', { id: p.id });
    } else {
      r.why = lossReason(p, st);
      // 알리면 가입이 어려운 고객에게 솔직했으면, 그 고객이 다른 사람을 보내 준다
      if (st.outcome === 'declined') { s.refs.r2 = true; event(s, 'honestNo', { id: p.id }); }
      var furry = p.reasons && p.reasons.some(function (x) { return x.key === 'sneeze' || x.key === 'fur'; });
      if (furry && !s.seen.furLost) { s.seen.furLost = true; event(s, 'furLost', { id: p.id }); }
      var smelly = p.reasons && p.reasons.some(function (x) { return x.key === 'smell' || x.key === 'stink'; });
      if (smelly && !s.seen.smellLost) { s.seen.smellLost = true; event(s, 'smellLost', { id: p.id }); }
      if (!p.leaves && st.outcome !== 'declined' && st.outcome !== 'later') s.today.lost.push({ id: p.id, why: r.why });
    }
    s.results.push(r);
    return r;
  }
  // 오늘 취소되는 계약을 처리한다 (집에 오는 길에 전화나 문자가 온다)
  function cancels(s) {
    var out = [];
    s.pending.forEach(function (e) {
      if (e.status !== 'active' || !e.cancel || e.cancel.day > s.day) return;
      e.status = 'cancelled';
      s.contracts = Math.max(0, s.contracts - 1);
      var x = { id: e.id, why: e.cancel.why, amount: e.amount, product: e.product };
      out.push(x); s.today.cancels.push(x);
      event(s, 'cancel', { id: e.id, why: e.cancel.why });
      if (e.cancel.why === 'hide') s.seen.bossTalk = s.day + 1; // 다음 날 아침 지점장 면담
    });
    return out;
  }
  function pendingTotal(s) { return s.pending.reduce(function (sum, e) { return sum + (e.status === 'active' ? e.amount : 0); }, 0); }
  function decideGroup(s, go) {
    if (!day(s).group || s.group) return false;
    s.group = go ? 'go' : 'skip';
    if (!go) event(s, 'groupSkipped');
    return true;
  }
  function leaveOffice(s) {
    energy(s, -2);
    var wentGroup = outLate(s);
    if (wentGroup) energy(s, -1);
    var next = nextWorkDay(s.day);
    s.cards = next < 0 ? [] : clientsOn(next, s);
    s.phase = 'commute';
    s.minute = wentGroup ? T.groupLeave : T.workEnd;
    return { earned: s.today.earned.slice(), cards: s.cards.slice() };
  }

  // ---------- 요금과 돈 ----------
  function bill(id) { return BILLS.filter(function (b) { return b.id === id; })[0]; }
  // 냉장고 달력에 적은 요금: 안내를 받은 날부터 낼 때까지
  function billsUp(s) { return BILLS.filter(function (b) { return s.day >= b.notice && s.bills[b.id] === 'none'; }); }
  function billDue(s) { return BILLS.filter(function (b) { return b.due <= s.day && s.bills[b.id] === 'none'; })[0] || null; }
  function canCash(s) { return !s.loan; }
  // how: pay(그냥 낸다) defer(집주인에게 8일까지 기다려 달라고 한다, 월세만) cash(현금서비스를 받아 낸다)
  function payBill(s, id, how) {
    var b = bill(id); if (!b || s.bills[id] !== 'none') return { ok: false, why: 'done' };
    if (how === 'defer') {
      if (!b.defer) return { ok: false, why: 'noDefer' };
      s.bills[id] = 'deferred'; event(s, 'deferRent');
      return { ok: true, deferred: true };
    }
    if (how === 'cash') {
      if (!canCash(s)) return { ok: false, why: 'cashUsed' };
      s.loan = { amount: CASH.amount, day: s.day };
      s.wallet += CASH.amount;
      s.today.earned.push({ key: 'cash', amount: CASH.amount });
      event(s, 'cash');
    }
    if (s.wallet < b.amount) return { ok: false, why: 'money' };
    s.wallet -= b.amount; s.bills[id] = 'paid';
    s.today.spent.push({ item: 'bill', bill: id, amount: b.amount });
    return { ok: true, paid: b.amount };
  }
  // 출금되지 않았거나 보내지 못한 날: 연체. 5/8에 연체료(lateFee, 게임용 고정 금액)를 더해 낸다.
  function lateBill(s, id) { if (s.bills[id] !== 'none') return false; s.bills[id] = 'late'; event(s, 'lateBill', { id: id }); return true; }
  function loanInterest(s) {
    if (!s.loan) return 0;
    var days = Math.max(1, (DAYS.length - 1) - s.loan.day);
    return Math.round(s.loan.amount * CASH.rate * days / 365 / 10) * 10;
  }
  // 5/8: 4월 실적 수수료와 정착지원금이 한꺼번에 들어오고, 미룬 돈을 갚는다
  function payday(s) {
    if (s.paid) return s.paid;
    var gross = pendingTotal(s), settle = s.contracts >= GOAL ? SETTLE : 0;
    var tax = Math.floor((gross + settle) * TAX / 10) * 10, net = gross + settle - tax;
    s.wallet += net;
    var out = [];
    if (s.loan) { var back = s.loan.amount + loanInterest(s); s.wallet -= back; out.push({ key: 'loan', amount: back, interest: loanInterest(s) }); }
    BILLS.forEach(function (b) {
      if (s.bills[b.id] === 'deferred') { s.wallet -= b.amount; s.bills[b.id] = 'paid'; out.push({ key: 'bill', bill: b.id, amount: b.amount }); }
      else if (s.bills[b.id] === 'late') { var a = b.amount + (b.lateFee || 0); s.wallet -= a; s.bills[b.id] = 'paid'; out.push({ key: 'bill', bill: b.id, amount: a, late: true }); }
    });
    s.paid = { gross: gross, settle: settle, tax: tax, net: net, out: out, wallet: s.wallet };
    event(s, 'payday');
    return s.paid;
  }

  // ---------- 가게 ----------
  function lateNight(s) { return (s.phase === 'evening' || s.phase === 'weekend') && s.minute >= T.bedtime; }
  function price(s, item) {
    var it = SHOP[item]; if (!it) return 0;
    return lateNight(s) ? Math.ceil(it.price * NIGHT_RATE / 500) * 500 : it.price;
  }
  function buyBlock(s, item, extra) {
    var it = SHOP[item];
    if (!it) return 'unknown';
    if (it.from && s.day < it.from) return 'notYet';
    if (it.once && s.owned[item] && !(item === 'autoToy' && s.autoToyLeft <= 0)) return 'owned';
    if (s.wallet - (extra || 0) < price(s, item)) return 'money';
    return null;
  }
  function onShelf(s, item) { var it = SHOP[item]; return !!it && !(it.from && s.day < it.from); }
  function buy(s, item) {
    var why = buyBlock(s, item);
    if (why) return { ok: false, why: why };
    var cost = price(s, item);
    s.wallet -= cost;
    s.today.spent.push({ item: item, amount: cost });
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
  // 늦게 들어오는 날: 4/22 야근, 4/17 동기들과 저녁
  function outLate(s) { return !!(day(s).group && s.group === 'go') || s.out === 'dinner'; }
  function arriveHome(s) {
    var wentGroup = outLate(s);
    s.phase = 'evening';
    s.minute = wentGroup ? T.groupHome : T.homeArrive + (s.shopped ? T.shopStop : 0);
    s.meal = 'pm';
    if (s.bowl !== 'empty' && !s.fed.pm) s.bowl = 'empty';
    s.rested = 0;
    s.wearing = 'hoodie'; s.smell = 0;
    // 혼자 보낸 하루. 캣타워가 있으면 창밖을 보며 덜 심심했다.
    if (day(s).kind === 'work') { if (s.owned.tower) heart(s, -1, 'aloneTower'); else heart(s, -2, 'alone'); }
    s.hidden = !!day(s).storm; // 천둥 치는 밤에는 숨는다
    // 아침에 못 찾고 나간 날: 서랍 속에 하루 종일 갇혀 있었다. 찾아 줄 때까지 안 나온다.
    if (s.locked) { heart(s, -1, 'locked'); s.hidden = true; }
    // 늦게 온 밤: 현관에서 기다리다 잠들었다
    if (day(s).overtime && s.group === 'go') { heart(s, -1, 'waitedAsleep'); event(s, 'waitedAsleep'); }
    else if (s.out === 'dinner') heart(s, -1, 'lateHome');
    var gone = cancels(s);
    return { locked: !!s.locked, late: wentGroup, cancels: gone, bill: billDue(s) };
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
    if (day(s).storm && !s.stormDone) { heart(s, -1, 'stormAlone'); event(s, 'stormAlone'); }
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
    // 밥 두 끼, 물, 화장실을 다 챙긴 날이 세 번이면 손에 익는다
    if (s.fed.am && s.fed.pm && s.water && s.litter.poop === 0) s.habit.care = (s.habit.care || 0) + 1;
    var base = sleepGain(bed), lost = [];
    if (bed > T.bedtime) lost.push('late');
    if (woke) lost.push('woke');
    if (s.lateCoffee) lost.push('coffee');
    // 내 저녁: 굶고 자면 덜 차고, 제대로 차려 먹었으면 더 찬다
    var skipped = !s.myMeal && s.day > 0, fed = s.cooked ? 1 : 0;
    if (skipped) lost.push('hungry');
    var want = Math.max(0, base - (woke ? 1 : 0) - (s.lateCoffee ? 1 : 0) - (skipped ? 1 : 0) + fed);
    var gain = energy(s, want);
    s.woke = woke;
    s.morningNote = { key: note, gain: gain };
    t.sleep = { bed: bed, gain: gain, lost: lost };
    if (together) s.fur = Math.min(3, s.fur + 1);
    t.energyNext = s.energy;
    t.total = s.contracts;
    s.diary.push({ day: s.day, together: together, meals: (s.fed.am ? 1 : 0) + (s.fed.pm ? 1 : 0), played: s.played, water: s.water, photos: s.photos.filter(function (p) { return p.day === s.day; }).length, myMeal: s.myMeal });
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
    s.coffee = false; s.lateCoffee = false; s.shopped = false; s.late = 0; s.left = 0; s.smell = 0; s.locked = false; s.trips = 0;
    s.wearing = 'hoodie'; s.myMeal = null; s.cooked = false; s.out = null;
    s.hidden = !!d.hide;
    // 일은 하나씩 늘어난다: 첫 출근 날은 털(돌돌이)만, 사흘째(4/14)부터 화장실과 바닥 털, 4/16부터 먼지
    if (s.day >= CLEAN_FROM) s.litter.poop++;
    var dirty = s.litter.poop >= 3, noSand = s.litter.sand <= 0, accident = dirty || noSand;
    var why = noSand && !dirty ? 'Sand' : '';
    s.litter.sand = Math.max(0, s.litter.sand - 1);
    // 고양이 털은 매일 바닥에 쌓이고, 먼지는 이틀에 한 번 쌓인다
    if (s.day >= CLEAN_FROM) s.floor.fur = Math.min(6, s.floor.fur + 1);
    if (s.day >= DUST_FROM && s.day % 2 === 0) s.floor.dust = Math.min(6, s.floor.dust + 1);
    // 로봇청소기: 밤새 돌아서 털이 더 쌓이지 않게 막는다. 다 치우지는 못하고, 먼지는 못 닦는다.
    if (s.owned.robot && s.floor.fur > 1) { s.floor.fur--; s.today.notes.push('robot'); }
    s.jobbed = false;
    if (d.kind === 'off') {
      s.phase = 'weekend'; s.minute = T.weekendStart;
    } else {
      s.phase = 'morning'; s.minute = s.woke ? T.wokeWake : T.wake;
    }
    // 4/20 알람이 고장 난 아침: 마음이 가까우면 고양이가 깨워 주고, 아니면 늦잠
    if (d.alarm) {
      s.alarm = s.hearts >= ALARM_HEARTS ? 'cat' : 'late';
      if (s.alarm === 'cat') { s.minute = T.wake; event(s, 'catWoke'); }
      else s.minute = T.wake + 40;
    }
    // 문을 열어 두고 잤으면 침대까지 와서, 닫고 잤으면 거실 바닥에 실수한다
    var key = 'accident' + why + (doorOpen ? 'Bed' : '');
    if (accident) { if (s.phase === 'morning') s.minute += T.accident; heart(s, -1, key); }
    // 휴대폰으로 요금 안내가 온 날
    var notices = BILLS.filter(function (b) { return b.notice === s.day; }).map(function (b) { return b.id; });
    notices.forEach(function (id) { s.today.notes.push('bill:' + id); });
    var note = s.morningNote; s.morningNote = null;
    return { notices: notices, boss: s.seen.bossTalk === s.day, accident: accident, key: accident ? key : null, where: doorOpen ? 'bed' : 'floor', note: note, hidden: s.hidden };
  }
  function evaluate(s) {
    s.evaluated = { contracts: s.contracts, pass: s.contracts >= GOAL, paid: payday(s) };
    var t = s.today;
    t.energyNext = s.energy; t.total = s.contracts;
    s.diary.push({ day: s.day, together: false, meals: s.fed.am ? 1 : 0, played: false, water: s.water });
    s.ledger.push(t);
    s.ended = 'evaluation';
    return s.evaluated;
  }
  // 엔딩 8개: 좋음 1, 보통 3, 나쁨 3, 숨은 엔딩 1
  // 일(계약)과 고양이(마음)와 둘이 보낸 순간(사진) 셋이 함께 정한다. 한쪽만 챙기면 좋은 엔딩은 안 나온다.
  var ENDINGS = ['family', 'both', 'soso', 'catStays', 'clumsy', 'oneBody', 'again', 'emptyBowl'];
  var GRADE = { family: 'hidden', both: 'good', soso: 'normal', catStays: 'normal', clumsy: 'normal', oneBody: 'bad', again: 'bad', emptyBowl: 'bad' };
  var PHOTO_GOOD = 4, PHOTO_FAMILY = 7;
  function has(s, key) { return s.events.some(function (e) { return e.key === key; }); }
  function photos(s) { return (s.photos || []).length; }
  // 숨은 엔딩: 목표를 채우고, 마음을 가득 채우고, 한 끼도 굶기지 않고, 천둥 치던 밤과 서랍 속 아침을 둘 다 지켜 주고, 사진첩이 가득한 사람
  function family(s) { return s.contracts >= GOAL && s.hearts >= MAX && s.missed === 0 && has(s, 'curtain') && has(s, 'drawer') && photos(s) >= PHOTO_FAMILY; }
  function ending(s) {
    if (s.missed > 3) return { key: 'emptyBowl', grade: 'bad', pass: false, hearts: s.hearts, contracts: s.contracts };
    var band = s.hearts >= 4 ? 'close' : s.hearts >= 2 ? 'mid' : 'far';
    var pass = s.contracts >= GOAL;
    var key = family(s) ? 'family' : { close: pass ? (photos(s) >= PHOTO_GOOD ? 'both' : 'soso') : 'catStays', mid: pass ? 'soso' : 'clumsy', far: pass ? 'oneBody' : 'again' }[band];
    return { key: key, grade: GRADE[key], band: band, pass: pass, hearts: s.hearts, contracts: s.contracts, photos: photos(s) };
  }

  // ---------- 둘이라서 ----------
  var ALARM_HEARTS = 3;          // 4/20 아침, 이만큼 가까우면 고양이가 깨워 준다
  var KNEAD_NIGHTS = [2, 4, 9, 11, 16, 18, 22]; // 같이 잔 이 밤들의 새벽 5시에 얼굴을 꾹꾹 누른다
  // 반짝이는 순간을 휴대폰으로 찍는다 (평일 저녁 두 장, 주말 세 장까지)
  function photoCap(s) { return s.phase === 'weekend' ? 3 : 2; }
  function photosToday(s) { return s.photos.filter(function (p) { return p.day === s.day; }).length; }
  function photo(s, pose) {
    if (!homeTime(s) || s.hidden) return { ok: false, why: 'notNow' };
    if (photosToday(s) >= photoCap(s)) return { ok: false, why: 'cap' };
    s.photos.push({ day: s.day, pose: pose || 'sit' });
    if (s.photos.length === 1) event(s, 'firstPhoto');
    return { ok: true, n: s.photos.length, minutes: spend(s, T.photo) };
  }
  // 내 저녁: 서서 삼각김밥(5분) 또는 차려 먹기(40분, 그날 밤 체력 +1). 주말에 같이 먹으면 마음 +1.
  function eatBlock(s) { if (!homeTime(s)) return 'notHome'; if (s.myMeal) return 'ate'; if (s.phase === 'weekend' && s.meal === 'am') return 'early'; return null; }
  function eat(s, kind) {
    var why = eatBlock(s); if (why) return { ok: false, why: why };
    kind = kind === 'cook' ? 'cook' : 'quick';
    s.myMeal = kind; if (kind === 'cook') s.cooked = true;
    var r = { ok: true, kind: kind, minutes: spend(s, kind === 'cook' ? T.cook : T.quick) };
    if (kind === 'cook' && s.phase === 'weekend' && !s.hidden) { heart(s, +1, 'mealTogether'); r.together = true; }
    return r;
  }
  // 새벽 꾹꾹이: 받아 주면 마음 +1 체력 −1, 이불을 덮어쓰면 마음 −1
  function kneadNight(s) { return KNEAD_NIGHTS.indexOf(s.day) >= 0 && s.door === 'open' && !s.hidden; }
  function knead(s, pick) {
    if (pick === 'pet') { heart(s, +1, 'kneadPet'); energy(s, -1); if (s.today.energyNext !== null) s.today.energyNext = s.energy; }
    else heart(s, -1, 'kneadPush');
    event(s, pick === 'pet' ? 'kneadPet' : 'kneadPush');
    return { hearts: s.hearts, energy: s.energy };
  }
  // 4/17 동기들과 저녁: 가면 소개 계약 한 건, 대신 늦게 들어간다
  function dinner(s, go) {
    if (!day(s).dinner || s.out) return null;
    s.out = go ? 'dinner' : 'home';
    if (!go) return { go: false };
    // 동기의 친구가 여행을 간다며 여행자보험을 부탁한다
    var prem = 30000, amount = commission('travel', prem), before = s.contracts;
    s.contracts++;
    s.pending.push({ id: 'referral', day: s.day, product: 'travel', premium: prem, amount: amount, status: 'active', cancel: null });
    s.results.push({ id: 'referral', day: s.day, product: 'travel', signed: true, premium: prem, amount: amount, why: null, goal: before < GOAL && s.contracts >= GOAL });
    if (before < GOAL && s.contracts >= GOAL) { s.goalDay = s.day; event(s, 'goal'); }
    s.today.stickers.push('travel');
    s.today.earned.push({ key: 'pending', id: 'referral', product: 'travel', amount: amount });
    event(s, 'referral');
    return { go: true, amount: amount };
  }
  // 4/23 밤: 발표 준비 중 자판 위에 앉은 고양이. 옮기면(work) 준비가 끝나고, 노트북을 덮으면(lid) 같이 논다.
  function lastPrep(s, pick) {
    s.lid = pick;
    if (pick === 'work') { s.cards.forEach(function (id) { s.prepared[id] = true; }); heart(s, -1, 'moved'); event(s, 'moved'); }
    else { s.played = true; heart(s, +1, 'lid'); event(s, 'lid'); }
    return s.lid;
  }

  // ---------- 저장 ----------
  function save(s) { return JSON.stringify(s); }
  function load(text) {
    try {
      var s = typeof text === 'string' ? JSON.parse(text) : text;
      if (!s || s.v !== VERSION || typeof s.day !== 'number' || !s.today) return null;
      if (!s.seen) s.seen = {};
      if (!s.photos) s.photos = [];
      if (s.myMeal === undefined) { s.myMeal = null; s.cooked = false; s.out = null; s.alarm = null; s.lid = null; }
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
    VERSION: VERSION, GOAL: GOAL, MAX: MAX, T: T, START_WALLET: START_WALLET, SETTLE: SETTLE, TAX: TAX, CASH: CASH, SIGN_MOOD: SIGN_MOOD,
    PRODUCTS: PRODUCTS, UNLOCK: UNLOCK, SHOP: SHOP, DAYS: DAYS, CLIENTS: CLIENTS, BILLS: BILLS, week: week, comes: comes,
    DRY_MEALS: DRY_MEALS, WET_MEALS: WET_MEALS, SAND_DAYS: SAND_DAYS, TOY_PLAYS: TOY_PLAYS,
    create: create, day: day, clientsOn: clientsOn, nextWorkDay: nextWorkDay, tired: tired, cost: cost,
    feed: feed, feedBlock: feedBlock, ate: ate, water: giveWater, scoop: scoop, refill: refill, sandLow: sandLow, pet: pet,
    dress: dress, roll: roll, canRoll: canRoll, coffee: drinkCoffee, jobBlock: jobBlock, sideJob: sideJob, JOB: JOB, autoToyOn: autoToyOn, onShelf: onShelf, lunch: eatLunch, search: search,
    act: act, doBlock: doBlock, homeTime: homeTime,
    leaveHome: leaveHome, plan: plan, consult: consult, note: note, listened: listened, pickProduct: pickProduct, toggle: toggle, covered: covered, premium: premium,
    submitDesign: submitDesign, apply: apply, persuade: persuade, needsPersuade: needsPersuade, explain: explain, hand: hand, sign: sign, timeout: timeout, finish: finish,
    commission: commission, cancels: cancels, pendingTotal: pendingTotal, billsUp: billsUp, billDue: billDue, bill: bill, payBill: payBill, lateBill: lateBill, canCash: canCash, loanInterest: loanInterest, payday: payday,
    decideGroup: decideGroup, leaveOffice: leaveOffice,
    buy: buy, buyBlock: buyBlock, unbuy: unbuy, price: price, lateNight: lateNight, NIGHT_RATE: NIGHT_RATE, smellOf: smellOf,
    ENDINGS: ENDINGS, GRADE: GRADE,
    arriveHome: arriveHome, napFirst: napFirst, nap: nap, toBed: toBed, setDoor: setDoor, needsPOV: needsPOV, unplayed: unplayed, sleepGain: sleepGain, sleep: sleep, morning: morning,
    evaluate: evaluate, ending: ending, CLEAN_FROM: CLEAN_FROM, DUST_FROM: DUST_FROM, outLate: outLate,
    photo: photo, photoCap: photoCap, photosToday: photosToday, eat: eat, eatBlock: eatBlock, kneadNight: kneadNight, knead: knead, dinner: dinner, lastPrep: lastPrep,
    ALARM_HEARTS: ALARM_HEARTS, KNEAD_NIGHTS: KNEAD_NIGHTS, PHOTO_GOOD: PHOTO_GOOD, PHOTO_FAMILY: PHOTO_FAMILY,
    habitReady: habitReady, HABIT_DAYS: HABIT_DAYS,
    save: save, load: load,
    hasBatchim: hasBatchim, nameForm: nameForm, josa: josa, clock: clock, won: won, cleanName: cleanName
  };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Life;
