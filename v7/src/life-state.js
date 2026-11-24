/* 하루 상태 모델. 화면 없이 돌아가고, JSON으로 그대로 저장할 수 있는 값만 담는다.
   시간은 자정부터 센 분, 돈은 원, 체력과 하트는 0~5칸이다.
   집에서 하는 일은 모두 시계를 움직인다. 저녁에 무엇을 얼마나 할지는 자유이고,
   늦게 잘수록 다음 날 아침 체력이 덜 찬다. 피곤하면(체력 1칸 이하) 모든 일이 오래 걸린다. */
var Life = (function () {
  'use strict';

  var VERSION = 4;
  var GOAL = 12;           // 위촉 첫 달 기준 실적(계약 건수). 채우면 정착지원금이 나온다.
  var MAX = 5;             // 체력, 하트 칸 수
  var START_WALLET = 380000;
  var SETTLE = 500000;     // 신입 정착지원금 (기준 실적을 채운 달에만)
  var TAX = 0.033;         // 원천징수 3.3%: 소득세 3% + 지방소득세 0.3% (설계사는 회사 직원이 아니라 위촉된 개인사업자)
  var CASH = { amount: 300000, rate: 0.18 }; // 현금서비스(단기카드대출): 연 18%로 계산
  var WORK_HELP = 60;      // 동기가 야근을 나눠 하면 한 시간 일찍 나온다

  // 시계 (분)
  var T = {
    wake: 460, wokeWake: 470, leaveBy: 490, commute: 50, assembly: 540,
    dress: 6, roller: 6, feed: 5, water: 3, scoop: 6, sand: 6, pet: 4, coffee: 3,
    accident: 10, search: 3,
    workEnd: 1080, homeArrive: 1140, shopStop: 20, groupLeave: 1260, groupHome: 1290,
    bedtime: 1380, weekendStart: 600, weekendLunch: 900,
    play: 40, rest: 60, cook: 40, quick: 5, banchan: 10, photo: 1, prep: 60, sweep: 30, mop: 30, job: 240, curtain: 10, lunch: 15, shopTrip: 40, call: 10
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
  var UMBRELLA = 5000;      // 5/8 비 오는 퇴근길, 우산을 빌려줄 사람이 없으면 슈퍼에서 비닐우산을 산다
  var AUTO_TOY_NIGHTS = 5;  // 자동 장난감은 혼자 노는 밤 다섯 번이면 닳는다
  var JOB = { pay: 41280, minutes: 240, energy: 3, lastStart: 900 }; // 주말 슈퍼 알바 (2026년 최저시급 10,320원 × 4시간)
  var DRY_MEALS = 8, WET_MEALS = 6, SAND_DAYS = 4, TOY_PLAYS = 4;
  var CLEAN_FROM = 2, DUST_FROM = 4; // 바닥 청소와 화장실은 4/14부터, 먼지 발자국은 4/16부터

  // 동물병원: 4/21 저녁부터 화장실을 자주 들락거리고, 4/22 아침 모래에 피가 비친다(방광염).
  // 동네 동물병원은 평일 오전 9시 반부터 밤 9시까지. 출근 전 아침, 오후 상담을 미룬 점심, 퇴근한 저녁에 데려갈 수 있다.
  // 4/22에 못 가면 4/23 아침에는 더 미룰 수 없다(수액 처치가 더해진다).
  var VET = { sign: 9, day: 10, open: 570, close: 1260, trip: 100, bill: 180000, worse: 230000, med: 5 };
  // 4/24(금) 첫 회식: 1차는 지점장님이 내고, 2차는 각자 낸다. 2차까지 가면 지점장님이 상담 신청 고객 한 분을 넘겨준다(4/27).
  var HOESIK = { day: 12, second: 20000, leave1: 1260, home1: 1300, leave2: 1410, home2: 1460 };
  // 4/25(토) 대학 친구 결혼식 낮 12시 30분. 4/20 저녁에 친구가 올 수 있는지 묻는다. 11시 반에 나가면 3시 반에 돌아온다.
  var WEDDING = { day: 13, ask: 8, at: 750, leave: 660, last: 735, back: 930 }; // leave: 나갈 때라고 알려 주는 시각, last: 이때까지 나서면 식 도중에라도 들어간다 (지하철 40분)
  // 그 사람과의 약속: 커피와 케이크는 내가, 영화표는 그 사람이. 저녁까지 먹으면 각자 낸다.
  // 공원 앞 편의점 음료 두 병은 내가 산다
  var DATE = { coffee: 16000, dinner: 18000, drink: 4000, park: 960, movie: 840, visit: 900 };

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
    { date: '4/24', wd: '금', kind: 'work', hoesik: true },
    { date: '4/25', wd: '토', kind: 'off', wedding: true },
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
    c22: { day: 10, product: 'travel', budget: 30000, needs: ['med', 'luggage'], mark: 'none' },
    c11: { day: 11, product: 'home', budget: 10000, needs: ['fire'], mark: 'none' },
    c12: { day: 12, product: 'travel', budget: 30000, needs: ['med'], mark: 'doubt', history: true },
    c13: { day: 15, product: 'dental', budget: 25000, needs: ['implant'], mark: 'none', ask: 'switch', existing: { covers: ['fill'] } },
    d1: { day: 15, product: 'home', budget: 15000, needs: ['fire', 'liab'], mark: 'none', ref: 'hoesik' }, // 회식 2차에서 지점장님이 넘겨준 상담 신청 고객
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
    return CLIENT_IDS.filter(function (id) { return CLIENTS[id].day === d && !CLIENTS[id].evening && (!s || (comes(s, id) && s.gave !== id)); });
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
      habit: { care: 0, explain: 0 },
      // v7 동네: 손을 내민 사람들. helped(오늘 고양이 밥을 챙겨 준 사람), covered(늦은 아침 첫 고객을 붙잡아 준 사람),
      // workHelp(야근을 나눠 한 사람), borrowed(빌린 돈), gave(동기에게 넘긴 고객)
      people: freshPeople(), dish: null, helped: null, covered: null, workHelp: null, borrowed: null, gave: null,
      // v7 휴대폰과 엄마: phone(대화와 통화 기록), sent(보낸 사진), box(빈 상자가 놓인 날), mom(엄마 줄기)
      phone: null, sent: [], photoSeq: 0, box: null, mom: freshMom(),
      // v7 4단계: vet(동물병원), card(신용카드로 긁은 돈), wed(결혼식), one(그 사람과 지나온 일), appts(약속과 냉장고 달력)
      vet: freshVet(), card: null, wed: freshWed(), one: {}, appts: []
    };
    s.today = freshToday(s);
    return s;
  }

  // 엄마 줄기: knows(일을 시작한 걸 아는지), parcel(반찬 택배가 오는 날), food(냉장고에 남은 엄마 반찬, 끼니),
  // opened(택배를 연 날), promised(어버이날 전화하겠다고 했는지), called(엄마와 통화한 적이 있는지), hard('힘들었어'라고 말했는지),
  // touch(갈래마다 마지막으로 닿은 날: photo 사진, talk 통화, reply 문자 답장), got(택배가 왔다고 엄마가 문자한 날)
  function freshVet() { return { day: null, when: null, amount: 0, card: false, med: null }; }
  function freshWed() { return { answer: null, went: false, gift: 0, how: null, thanked: false }; }
  function freshMom() { return { knows: false, parcel: null, food: 0, opened: null, promised: false, called: false, hard: false, touch: {}, got: null }; }
  var MOM_FOOD = 4;              // 엄마 반찬 택배: 저녁 네 끼
  // 엄마가 반찬을 부친다: 이틀 뒤, 그날이 쉬는 날이면 그다음 출근하는 날 저녁에 현관 앞에 와 있다 (5/8까지 못 오면 보내지 않는다)
  function momSend(s) {
    if (s.mom.parcel !== null) return null;
    var d = s.day + 2; while (d < DAYS.length && DAYS[d].kind !== 'work') d++;
    if (d >= DAYS.length || DAYS[d].final) return null;
    s.mom.parcel = d; event(s, 'momSend'); return d;
  }
  // 엄마와 닿은 날: 사진(photo, sendPhoto가 센다), 통화(answer 받은 전화, call 건 전화), 문자 답장(reply).
  // 같은 날 같은 갈래는 한 번만 한 칸 가까워진다. 통화는 10분이 든다.
  function momTouch(s, kind) {
    var m = s.mom, p = person(s, 'mom'); m.touch = m.touch || {};
    var k = kind === 'answer' || kind === 'call' ? 'talk' : kind;
    var up = m.touch[k] !== s.day; m.touch[k] = s.day;
    if (up) p.bond = clamp(p.bond + 1, 0, 3);
    p.met = true; p.last = s.day;
    if (k === 'talk') m.called = true;
    event(s, 'mom', { kind: kind });
    return { ok: true, up: up, bond: p.bond, minutes: k === 'talk' && (homeTime(s) || s.phase === 'morning') ? spend(s, T.call) : 0 };
  }
  function momBond(s) { var p = person(s, 'mom'); return p ? p.bond : 0; }
  function momOpen(s) {
    if (s.mom.parcel === null || s.mom.opened !== null || s.day < s.mom.parcel) return { ok: false };
    s.mom.opened = s.day; s.mom.food += MOM_FOOD; s.box = s.day; event(s, 'momParcel');
    return { ok: true, food: s.mom.food };
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
    // 일손을 도운 날: 사장님과 한 칸 가까워진다 (빌린 돈이 있으면 그 고마움도 갚는다)
    var b = person(s, 'boss'); if (b && b.last !== s.day) { b.met = true; b.bond = clamp(b.bond + 1, 0, 3); b.owe = null; b.last = s.day; event(s, 'reach', { who: 'boss', kind: 'job' }); }
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
    if (first && s.late > 0 && !s.covered) { base.leaves = true; base.mood = 0; base.reasons = [{ key: busy ? 'busyLeft' : 'lateLeft', delta: 0 }]; return base; }
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
    s.minute = wentGroup ? lateLeave(s) : T.workEnd;
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
    if (how === 'cash' && s.wallet < b.amount) {
      if (!cashService(s).ok) return { ok: false, why: 'cashUsed' };
    }
    if (s.wallet < b.amount) return { ok: false, why: 'money' };
    s.wallet -= b.amount; s.bills[id] = 'paid';
    s.today.spent.push({ item: 'bill', bill: id, amount: b.amount });
    return { ok: true, paid: b.amount };
  }
  // 카드 현금서비스: 은행 앱에서 한 번에 받는다. 누구에게도 아쉬운 소리를 하지 않아도 되는 가장 쉬운 길. 이자는 다음 카드값에.
  function cashService(s) {
    if (!canCash(s)) return { ok: false, why: 'cashUsed' };
    s.loan = { amount: CASH.amount, day: s.day };
    s.wallet += CASH.amount;
    s.today.earned.push({ key: 'cash', amount: CASH.amount });
    event(s, 'cash');
    return { ok: true, amount: CASH.amount };
  }
  // 출금되지 않았거나 보내지 못한 날: 연체. 5/8에 연체료(lateFee, 게임용 고정 금액)를 더해 낸다.
  function lateBill(s, id) { if (s.bills[id] !== 'none') return false; s.bills[id] = 'late'; event(s, 'lateBill', { id: id }); return true; }
  function loanInterest(s) {
    if (!s.loan) return 0;
    var days = Math.max(1, (DAYS.length - 1) - s.loan.day);
    return Math.round(s.loan.amount * CASH.rate * days / 365 / 10) * 10;
  }
  // 5/8: 첫 달(4/13~5/8) 실적 수수료와 정착지원금이 한꺼번에 들어오고, 미룬 돈을 갚는다
  function payday(s) {
    if (s.paid) return s.paid;
    var gross = pendingTotal(s), settle = s.contracts >= GOAL ? SETTLE : 0;
    var tax = Math.floor((gross + settle) * TAX / 10) * 10, net = gross + settle - tax;
    s.wallet += net;
    var out = [];
    if (s.loan) { var back = s.loan.amount + loanInterest(s); s.wallet -= back; out.push({ key: 'loan', amount: back, interest: loanInterest(s) }); }
    if (s.borrowed && !s.borrowed.back) { s.wallet -= s.borrowed.amount; s.borrowed.back = true; out.push({ key: 'borrow', who: s.borrowed.who, amount: s.borrowed.amount }); }
    if (s.card && s.card.amount && !s.card.back) { s.wallet -= s.card.amount; s.card.back = true; out.push({ key: 'card', amount: s.card.amount, items: s.card.items.map(function (x) { return x.item; }) }); }
    BILLS.forEach(function (b) {
      if (s.bills[b.id] === 'deferred') { s.wallet -= b.amount; s.bills[b.id] = 'paid'; out.push({ key: 'bill', bill: b.id, amount: b.amount }); }
      else if (s.bills[b.id] === 'late') { var a = b.amount + (b.lateFee || 0); s.wallet -= a; s.bills[b.id] = 'paid'; out.push({ key: 'bill', bill: b.id, amount: a, late: true }); }
    });
    s.paid = { gross: gross, settle: settle, tax: tax, net: net, out: out, wallet: s.wallet };
    event(s, 'payday');
    return s.paid;
  }

  // 체크카드(통장)로 내고, 통장이 모자라면 신용카드로 긁는다. 카드값은 5/8 수수료가 들어온 뒤 현금서비스와 함께 나간다.
  function payAny(s, item, amount) {
    if (s.wallet >= amount) { s.wallet -= amount; s.today.spent.push({ item: item, amount: amount }); return { ok: true, card: false }; }
    if (!s.card) s.card = { amount: 0, items: [], back: false };
    s.card.amount += amount; s.card.items.push({ item: item, amount: amount, day: s.day });
    s.today.spent.push({ item: item, amount: amount, card: true });
    event(s, 'card', { item: item });
    return { ok: true, card: true };
  }

  // ---------- 동물병원 (4/21~4/23) ----------
  function vetDone(s) { return !!(s.vet && s.vet.day !== null && s.vet.day !== undefined); }
  // 아픈 걸 아는 날부터 병원에 갈 때까지 (4/21 저녁은 화장실을 자주 가는 것만 보인다)
  function vetSign(s) { return s.day === VET.sign && !vetDone(s); }
  function vetDue(s) { return s.day >= VET.day && s.day <= VET.day + 1 && !vetDone(s); } // 4/23 아침에는 더 미루지 못하고 데려간다
  function vetOpen(s, minute) { var m = minute === undefined ? s.minute : minute; return m >= VET.open && m + 30 <= VET.close; }
  // when: am(출근 전), pm(오후 상담을 미루고), eve(퇴근하고), next(다음 날 아침)
  function treat(s, when) {
    if (vetDone(s) || s.day < VET.day) return { ok: false };
    var amount = when === 'next' ? VET.worse : VET.bill;
    var r = payAny(s, 'vet', amount);
    s.vet = { day: s.day, when: when, amount: amount, card: r.card, med: s.day + VET.med - 1 };
    event(s, 'vet', { when: when });
    return { ok: true, amount: amount, card: r.card };
  }
  // 4/22 점심에 병원에 가느라 오후 상담을 미뤘다 (그 고객님은 다음에 다시 연락하겠다고 했다)
  function postpone(s, id) { s.postponed = s.postponed || {}; s.postponed[id] = s.day; event(s, 'postponed', { id: id }); return true; }
  // 가루약을 먹이는 날 (밥에 섞는다)
  function onMed(s) { return vetDone(s) && s.day <= s.vet.med; }

  // ---------- 4/24 첫 회식 ----------
  // stage 1: 1차(고깃집)에 간다. stage 2: 2차까지 간다(각자 2만 원, 지점장님이 상담 신청 고객을 넘겨준다, 동기와 가까워진다).
  function hoesik(s, stage) {
    if (!day(s).hoesik) return null;
    if (stage === 1) { if (s.out) return null; s.out = 'hoesik'; event(s, 'hoesik1'); return { stage: 1 }; }
    if (s.out !== 'hoesik') return null;
    if (s.wallet < HOESIK.second) return { ok: false, why: 'money' }; // 2차 회비는 선배 계좌로 보낸다 (카드로는 못 낸다)
    s.out = 'hoesik2';
    s.wallet -= HOESIK.second; s.today.spent.push({ item: 'hoesik2', amount: HOESIK.second });
    s.refs.d1 = true;
    energy(s, -1);
    if (s.phase === 'commute') s.minute = HOESIK.leave2;
    var m = person(s, 'mate'), up = false;
    if (m && m.met && m.last !== s.day) { m.bond = clamp(m.bond + 1, 0, 3); m.last = s.day; m.owe = null; up = true; }
    event(s, 'hoesik2');
    return { ok: true, stage: 2, mate: up };
  }

  // ---------- 4/25 대학 친구 결혼식 ----------
  function wedAnswer(s, yes) { if (!s.wed) s.wed = freshWed(); s.wed.answer = yes ? 'yes' : 'no'; event(s, 'wedAnswer', { yes: !!yes }); return s.wed; }
  // 축의금: how cash(식장 축의대에 봉투로), send(못 가는 대신 계좌로). 봉투는 현금이라 통장이 모자라면 ATM 현금서비스를 받는다.
  function wedGift(s, amount, how) {
    if (!s.wed) s.wed = freshWed();
    if (!(amount > 0) || s.wed.gift) return { ok: false, why: 'done' };
    var cashed = false;
    if (s.wallet < amount) { if (!canCash(s)) return { ok: false, why: 'money' }; cashService(s); cashed = true; }
    s.wallet -= amount; s.wed.gift = amount; s.wed.how = how;
    s.today.spent.push({ item: 'gift', amount: amount });
    event(s, 'wedGift', { amount: amount, how: how });
    return { ok: true, cashed: cashed };
  }
  function wedGo(s) {
    if (!s.wed) s.wed = freshWed();
    s.wed.went = true;
    if (s.phase === 'weekend') { s.minute = Math.max(s.minute, WEDDING.back); if (s.meal === 'am' && s.minute >= T.weekendLunch) switchMeal(s); }
    event(s, 'wedding');
    return s.wed;
  }

  // ---------- 그 사람 (성훈) ----------
  // client(4/16 상담에서 만남), show(상담 끝에 내 고양이 사진을 보여 줌), carrier(동물병원 대기실에서 이동장을 맡아 줌),
  // vet(대기실에서 다시 만남), park(공원 산책), date(영화와 커피), visit(우리 집에 고양이를 보러 옴). 처음 보낸 사진 한 장도 한 칸이다(sendPhoto).
  // 같은 일은 한 번만 센다. 동네에 사는 줄은 대기실에서 알게 되고, 그때부터 동네 지도에 그 사람의 창이 보인다.
  var ONE_STEP = { client: 0, show: 1, vet: 0, carrier: 1, park: 1, date: 1, visit: 0 };
  function oneMeet(s, kind) {
    var p = person(s, 'one'); if (!p || ONE_STEP[kind] === undefined) return { ok: false };
    if (!s.one) s.one = {};
    if (s.one[kind] !== undefined && s.one[kind] !== null) return { ok: false, why: 'done' };
    var first = !p.met;
    p.met = true; p.bond = clamp(p.bond + ONE_STEP[kind], 0, 3); p.last = s.day; p.owe = null;
    s.one[kind] = s.day;
    if (kind === 'vet' || kind === 'carrier' || kind === 'park') p.near = true;
    if (kind === 'visit') p.key = true; // 서로 현관 비밀번호를 알려 주고 고양이를 봐 주기로 한다
    event(s, 'one', { kind: kind });
    return { ok: true, first: first, bond: p.bond };
  }
  // 그 사람과 약속에 나간 쉬는 날: 오후 내내 고양이는 혼자다 (저녁까지 먹고 오면 더)
  function dateOut(s, dinner) { heart(s, -1, 'dateAlone'); if (dinner) heart(s, -1, 'lateDate'); event(s, 'dateOut', { dinner: !!dinner }); }
  // 처음 온 손님 손끝에 코를 대 봤다
  function visitOk(s) { heart(s, +1, 'visitOk'); event(s, 'visitOk'); }
  function oneBond(s) { var p = person(s, 'one'); return p ? p.bond : 0; }

  // ---------- 약속 (냉장고 달력에 붙는다) ----------
  // key: wedding, park, date, visit. at: 그날 만나는 시각(분). place: 동네 지도에서 갈 곳(home이면 그 사람이 우리 집에 온다)
  function addAppt(s, key, d, at, place) {
    if (!s.appts) s.appts = [];
    s.appts = s.appts.filter(function (a) { return a.key !== key; });
    var a = { key: key, day: d, at: at, place: place, state: 'set' };
    s.appts.push(a); return a;
  }
  function appt(s, key) { return (s.appts || []).filter(function (a) { return a.key === key; })[0] || null; }
  function apptsUp(s) { return (s.appts || []).filter(function (a) { return a.state === 'set' && a.day >= s.day; }); }
  // 오늘 갈 약속: 만나는 시각 한 시간 전부터 30분 뒤까지 동네 지도에 그곳이 뜬다
  function apptNow(s) {
    return (s.appts || []).filter(function (a) { return a.state === 'set' && a.day === s.day && s.minute >= a.at - 60 && s.minute <= a.at + 30; })[0] || null;
  }
  function apptDone(s, key, state) { var a = appt(s, key); if (a) a.state = state || 'done'; return a; }
  // 약속 시각이 지나도록 집에 있었다 (또는 낮잠을 잤다)
  function apptMissed(s) {
    return (s.appts || []).filter(function (a) { return a.state === 'set' && a.place !== 'home' && (a.day < s.day || (a.day === s.day && s.minute > a.at + 30)); });
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
  // 늦게 들어오는 날: 4/29 야근, 4/17 동기들과 저녁, 4/24 회식(1차, 2차)
  function outLate(s) { return !!(day(s).group && s.group === 'go') || s.out === 'dinner' || s.out === 'hoesik' || s.out === 'hoesik2'; }
  function lateLeave(s) { return s.out === 'hoesik2' ? HOESIK.leave2 : s.out === 'hoesik' ? HOESIK.leave1 : T.groupLeave - (s.workHelp ? WORK_HELP : 0); }
  function lateHome(s) { return s.out === 'hoesik2' ? HOESIK.home2 : s.out === 'hoesik' ? HOESIK.home1 : T.groupHome - (s.workHelp ? WORK_HELP : 0); }
  // opt.at: 일찍 들어온 날(동물병원에 가느라 점심에 나온 날)의 시각
  function arriveHome(s, opt) {
    opt = opt || {};
    var wentGroup = outLate(s);
    s.phase = 'evening';
    s.minute = opt.at ? opt.at : wentGroup ? lateHome(s) : T.homeArrive + (s.shopped ? T.shopStop : 0);
    s.meal = 'pm';
    if (s.bowl !== 'empty' && !s.fed.pm) s.bowl = 'empty';
    s.rested = 0;
    s.wearing = 'hoodie'; s.smell = 0;
    // 혼자 보낸 하루. 캣타워가 있으면 창밖을 보며 덜 심심했다.
    if (day(s).kind === 'work') { if (opt.at) heart(s, -1, 'aloneHalf'); else if (s.owned.tower) heart(s, -1, 'aloneTower'); else heart(s, -2, 'alone'); }
    s.hidden = !!day(s).storm; // 천둥 치는 밤에는 숨는다
    // 아침에 못 찾고 나간 날: 서랍 속에 하루 종일 갇혀 있었다. 찾아 줄 때까지 안 나온다.
    if (s.locked) { heart(s, -1, 'locked'); s.hidden = true; }
    // 늦게 온 밤: 부탁한 사람이 밥을 챙겨 주지 않았으면 현관에서 기다리다 잠들었다
    var visit = wentGroup ? helperVisit(s) : null;
    if (visit) event(s, 'helperFed', { who: visit.who });
    else if (day(s).overtime && s.group === 'go') { heart(s, -1, 'waitedAsleep'); event(s, 'waitedAsleep'); }
    else if (s.out === 'dinner' || s.out === 'hoesik') heart(s, -1, 'lateHome');
    else if (s.out === 'hoesik2') heart(s, -2, 'lateHome2');
    // 아픈 채로 하루를 혼자 보냈다 (병원에 아직 못 갔다. 점심에 나온 날은 반나절이라 빼 준다)
    if (vetDue(s) && !opt.at) heart(s, -1, 'pain');
    var gone = cancels(s);
    return { locked: !!s.locked, late: wentGroup, cancels: gone, bill: billDue(s), helper: visit };
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
    if (vetDue(s)) { heart(s, -1, 'painNight'); event(s, 'painNight'); }
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
    s.wearing = 'hoodie'; s.myMeal = null; s.cooked = false; s.out = null; s.alarm = null; // 알람이 고장 난 건 4/20 그날 아침뿐이다
    s.helped = null; s.covered = null; s.workHelp = null;
    drift(s);
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
  // 엔딩 9개: 좋음 1, 보통 3, 나쁨 4, 숨은 엔딩 1
  // 일(계약), 고양이(마음), 사람(마음이 두 칸 넘게 쌓인 사람), 남은 빚이 함께 정한다. 실적만, 고양이만, 사람만 챙겨서는 좋은 엔딩이 안 나온다.
  var ENDINGS = ['family', 'both', 'soso', 'catStays', 'clumsy', 'oneBody', 'again', 'debt', 'emptyBowl'];
  var GRADE = { family: 'hidden', both: 'good', soso: 'normal', catStays: 'normal', clumsy: 'normal', oneBody: 'bad', again: 'bad', debt: 'bad', emptyBowl: 'bad' };
  var TIE_PEOPLE = ['grandma', 'mate', 'boss', 'mom', 'one'], TIES_FAMILY = 3;
  function has(s, key) { return s.events.some(function (e) { return e.key === key; }); }
  function photos(s) { return (s.photos || []).length; }
  // 가까워진 사람: 마음이 두 칸 이상 쌓인 사람 (엄마도 센다)
  function ties(s) { return TIE_PEOPLE.filter(function (k) { var p = person(s, k); return !!p && p.met && p.bond >= 2; }); }
  // 5/8 비 오는 퇴근길, 슈퍼 앞에서 우산을 기울여 주는 사람: 이 동네에 사는 가까운 사람 가운데 가장 가까운 사람 (같으면 최근에 닿은 사람)
  function umbrellaBy(s) {
    var c = ['one', 'mate', 'grandma', 'boss'].filter(function (k) { var p = person(s, k); return !!p && p.met && p.bond >= 2 && (k !== 'one' || p.near); });
    c.sort(function (a, b) { var pa = person(s, a), pb = person(s, b); return (pb.bond - pa.bond) || (pb.last - pa.last); });
    return c[0] || null;
  }
  // 5/8에 수수료가 들어와 미룬 돈을 다 갚고도 통장이 마이너스면 빚이 남았다
  function debtLeft(s) { return !!(s.paid && s.paid.wallet < 0); }
  // 숨은 엔딩 '우리 집': 목표를 채우고, 마음을 가득 채우고, 한 끼도 굶기지 않고, 천둥 치던 밤과 서랍 속 아침을 둘 다 지켜 주고,
  // 세 사람 이상과 가까워지고, 빚 없이 끝낸 사람
  function family(s) { return s.contracts >= GOAL && s.hearts >= MAX && s.missed === 0 && has(s, 'curtain') && has(s, 'drawer') && ties(s).length >= TIES_FAMILY && !debtLeft(s); }
  function ending(s) {
    var base = { hearts: s.hearts, contracts: s.contracts, ties: ties(s).length, umbrella: umbrellaBy(s), debt: debtLeft(s) };
    if (s.missed > 3) return Object.assign(base, { key: 'emptyBowl', grade: 'bad', pass: false });
    var band = s.hearts >= 4 ? 'close' : s.hearts >= 2 ? 'mid' : 'far';
    var pass = s.contracts >= GOAL;
    var key = family(s) ? 'family' : base.debt ? 'debt' : { close: pass ? (base.ties >= 1 ? 'both' : 'soso') : 'catStays', mid: pass ? 'soso' : 'clumsy', far: pass ? 'oneBody' : 'again' }[band];
    return Object.assign(base, { key: key, grade: GRADE[key], band: band, pass: pass, photos: photos(s) });
  }

  // ---------- 둘이라서 ----------
  var ALARM_HEARTS = 3;          // 4/20 아침, 이만큼 가까우면 고양이가 깨워 준다
  var KNEAD_NIGHTS = [2, 4, 9, 11, 16, 18, 22]; // 같이 잔 이 밤들의 새벽 5시에 얼굴을 꾹꾹 누른다
  // 사진: 집에서는 휴대폰 카메라로 언제든 찍는다. 무엇을 찍었는지(kind)와 누구에게 보냈는지(to)가 남는다.
  // kind: cat(고양이), room(고양이 없이), box(상자 속), sun(햇볕에 배를 드러냄), suit(정장 위에 웅크림)
  // photoCap은 개발자 모드 봇이 하루에 찍는 장 수로만 쓴다.
  function photoCap(s) { return s.phase === 'weekend' ? 3 : 2; }
  function photosToday(s) { return s.photos.filter(function (p) { return p.day === s.day; }).length; }
  function photo(s, meta) {
    if (!homeTime(s)) return { ok: false, why: 'notNow' };
    meta = typeof meta === 'string' ? { kind: 'cat', pose: meta } : (meta || {});
    var n = Math.max(s.photoSeq || 0, s.photos.length) + 1; s.photoSeq = n;
    var p = { id: 'p' + n, day: s.day, minute: Math.round(s.minute), kind: meta.kind || (s.hidden ? 'room' : 'cat'), pose: meta.pose || null, to: [] };
    s.photos.push(p);
    if (s.photos.length === 1) event(s, 'firstPhoto');
    return { ok: true, id: p.id, n: s.photos.length, photo: p, minutes: spend(s, T.photo) };
  }
  // 사진을 보낸다. 엄마에게는 보낸 날마다 한 칸씩 가까워지고, 다른 사람에게는 처음 보낸 한 장만 손을 내민 것으로 센다.
  function sendPhoto(s, id, who) {
    var ph = s.photos.filter(function (x) { return x.id === id; })[0], p = person(s, who);
    if (!ph || !p) return { ok: false };
    s.sent = s.sent || [];
    var before = s.sent.filter(function (e) { return e.who === who; }), sentToday = before.some(function (e) { return e.day === s.day; });
    s.sent.push({ who: who, day: s.day, id: id, kind: ph.kind });
    if (ph.to.indexOf(who) < 0) ph.to.push(who);
    var up = who === 'mom' ? !sentToday : !before.length;
    if (up) { p.bond = clamp(p.bond + 1, 0, 3); p.met = true; p.last = s.day; p.owe = null; }
    if (who === 'mom') { s.mom.touch = s.mom.touch || {}; s.mom.touch.photo = s.day; }
    event(s, 'photoSent', { who: who, kind: ph.kind });
    var days = {}; s.sent.forEach(function (e) { if (e.who === who) days[e.day] = true; });
    return { ok: true, up: up, bond: p.bond, first: !before.length, kind: ph.kind, days: Object.keys(days).length, today: sentToday };
  }
  // 내 저녁: 서서 삼각김밥(5분) 또는 차려 먹기(40분, 그날 밤 체력 +1). 주말에 같이 먹으면 마음 +1.
  function eatBlock(s) { if (!homeTime(s)) return 'notHome'; if (s.myMeal) return 'ate'; if (s.phase === 'weekend' && s.meal === 'am') return 'early'; return null; }
  function eat(s, kind) {
    var why = eatBlock(s); if (why) return { ok: false, why: why };
    // banchan: 옆집 할머니가 준 반찬, mom: 엄마가 택배로 보낸 반찬. 차려 먹은 것만큼 든든하다.
    kind = kind === 'cook' || kind === 'banchan' || kind === 'mom' ? kind : 'quick';
    if (kind === 'mom') { if (!s.mom || !(s.mom.food > 0)) return { ok: false, why: 'none' }; s.mom.food--; }
    s.myMeal = kind; if (kind !== 'quick') s.cooked = true;
    var r = { ok: true, kind: kind, minutes: spend(s, kind === 'cook' ? T.cook : kind === 'quick' ? T.quick : T.banchan) };
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

  // ---------- 사람 ----------
  // 손을 내민 만큼 가까워진다. bond 0 모르는 사이, 1 아는 사이, 2 가까운 사이, 3 기댈 수 있는 사이.
  // 부탁(청하는 손)을 하면 빚이 남고, 다시 손을 내밀면 갚아진다. 갚지 않고 이레가 지나면 한 칸 멀어진다.
  var PEOPLE = {
    grandma: { start: 0 }, // 옆집 할머니: 현관 비밀번호를 알려 드리면 늦는 날 고양이 밥을 챙겨 준다
    mate: { start: 0 },    // 입사 동기: 늦은 아침 첫 고객을 붙잡아 주고, 야근을 나눠 한다
    boss: { start: 1 },    // 슈퍼 사장님: 프롤로그의 비 오는 밤에 나를 봤다. 급할 때 돈을 빌려준다
    mom: { start: 0, met: true, map: false }, // 엄마: 피해 온 사람. 첫 답장은 고양이 사진 한 장이다 (동네 지도에는 없다)
    one: { start: 0, farWin: true } // 그 사람(성훈): 고양이를 키우는 상담 고객. 같은 동네에 사는 줄 알기 전에는 창이 지도에 없다
  };
  // 내미는 손: [누구에게, 가까워지는 칸, 드는 시간(분), 드는 돈(원)]
  var REACH = {
    bow: ['grandma', 1, 10], parcel: ['grandma', 1, 10], dish: ['grandma', 1, 10], visit: ['grandma', 1, 20],
    talk: ['mate', 1, 0], lunch: ['mate', 1, 0, 9000], refer: ['mate', 2, 0],
    job: ['boss', 1, 0], greet: ['boss', 1, 0],
  };
  // 청하는 손: 누가 들어줄 수 있는지 (가까운 정도, 현관 비밀번호)
  var ASK = {
    cat: { who: ['grandma', 'one'], min: 2, key: true }, // 늦는 날 고양이 밥과 물 (현관 비밀번호를 아는 사람)
    cover: { who: ['mate'], min: 1 },               // 늦은 아침, 첫 고객님께 양해를 구하고 붙잡아 준다
    work: { who: ['mate'], min: 2 },                // 야근을 나눠 해서 일찍 들어간다
    money: { who: ['boss'], min: 2, amount: 100000 } // 5/8까지 10만 원
  };
  var DRIFT_DAYS = 7, VISIT_GAP = 3;
  var VISIT_UNTIL = 21 * 60; // 이웃집에 들르는 건 밤 9시까지
  var LUNCH_DAYS = [3, 9, 22]; // 동기가 점심을 같이 먹자고 하는 날 (4/15, 4/21, 5/4)
  var DISH_FROM = 8;           // 할머니와 가까워졌으면 이날(4/20)부터 문고리에 반찬통이 걸린다
  function freshPeople() {
    var p = {};
    Object.keys(PEOPLE).forEach(function (k) { p[k] = freshPerson(k); });
    return p;
  }
  function freshPerson(k) { return { bond: PEOPLE[k].start, owe: null, key: false, last: -9, asked: 0, met: PEOPLE[k].start > 0 || !!PEOPLE[k].met }; }
  function person(s, who) { return s.people && s.people[who]; }
  // 동네 지도의 창문: 0 꺼짐(모르는 사이), 1 희미함, 2 환함
  function windowOf(s, who) { var p = person(s, who); if (!p || !p.met || (PEOPLE[who] && PEOPLE[who].farWin && !p.near)) return 0; return p.bond >= 2 ? 2 : 1; }
  function litWindows(s) { return Object.keys(PEOPLE).filter(function (k) { return PEOPLE[k].map !== false && windowOf(s, k) > 0; }).length; }
  function reachBlock(s, kind) {
    var r = REACH[kind]; if (!r) return 'unknown';
    var p = person(s, r[0]);
    if (kind === 'visit' && (!p.met || s.day - p.last < VISIT_GAP)) return p.met ? 'soon' : 'stranger';
    if (kind === 'visit' && s.minute > VISIT_UNTIL) return 'late'; // 밤늦게 이웃집 문을 두드리지는 않는다
    if (r[3] && s.wallet < r[3]) return 'money';
    if (p.last === s.day && kind !== 'refer') return 'today';
    return null;
  }
  function reach(s, kind) {
    var why = reachBlock(s, kind); if (why) return { ok: false, why: why };
    var r = REACH[kind], who = r[0], p = person(s, who), first = !p.met;
    p.met = true; p.bond = clamp(p.bond + r[1], 0, 3); p.last = s.day;
    var repaid = !!p.owe; p.owe = null;
    var minutes = r[2] ? spend(s, r[2]) : 0;
    if (r[3]) { s.wallet -= r[3]; s.today.spent.push({ item: kind === 'lunch' ? 'lunchOut' : kind, amount: r[3] }); }
    event(s, 'reach', { who: who, kind: kind });
    return { ok: true, who: who, bond: p.bond, first: first, repaid: repaid, minutes: minutes };
  }
  // 현관 비밀번호(key): 가까운 사이가 된 할머니에게만 알려 드린다
  function giveKey(s) {
    var p = person(s, 'grandma');
    if (p.bond < 2 || p.key) return { ok: false };
    p.key = true; event(s, 'key');
    return { ok: true };
  }
  // 지금 이 부탁을 들어줄 수 있는 사람들 (빚을 진 사람에게는 다시 부탁하지 못한다)
  function helpers(s, kind) {
    var a = ASK[kind]; if (!a) return [];
    return a.who.filter(function (who) { var p = person(s, who); return p && p.met && p.bond >= a.min && !p.owe && (!a.key || p.key); });
  }
  function ask(s, kind, who) {
    if (helpers(s, kind).indexOf(who) < 0) return { ok: false };
    var p = person(s, who), r = { ok: true, who: who };
    p.owe = { day: s.day, kind: kind }; p.asked++;
    if (kind === 'cat') s.helped = who;
    if (kind === 'cover') s.covered = who;
    if (kind === 'work') s.workHelp = who;
    if (kind === 'money') { var n = ASK.money.amount; s.wallet += n; s.borrowed = { who: who, amount: n, day: s.day }; s.today.earned.push({ key: 'borrow', who: who, amount: n }); r.amount = n; }
    event(s, 'ask', { who: who, kind: kind });
    return r;
  }
  // 아침마다: 부탁하고 이레 넘게 갚지 않은 사이는 한 칸 멀어진다
  function drift(s) {
    var out = [];
    Object.keys(s.people || {}).forEach(function (who) {
      var p = s.people[who];
      if (p.owe && s.day - p.owe.day >= DRIFT_DAYS) { p.bond = Math.max(1, p.bond - 1); p.owe = null; out.push(who); event(s, 'drift', { who: who }); }
    });
    return out;
  }
  // 늦게 들어온 밤, 부탁받은 사람이 저녁 시간에 밥과 물을 챙겨 두었다
  function helperVisit(s) {
    if (!s.helped || s.fed.pm) return null;
    var kind = s.food.dry > 0 ? 'dry' : s.food.wet > 0 ? 'wet' : null;
    if (kind) { s.food[kind]--; s.fed.pm = true; s.bowl = 'ate'; s.bowlKind = kind; }
    s.water = true;
    return { who: s.helped, fed: !!kind };
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
      if (s.people) Object.keys(PEOPLE).forEach(function (k) { if (!s.people[k]) s.people[k] = freshPerson(k); });
      if (!s.mom) s.mom = freshMom();
      if (!s.mom.touch) s.mom.touch = {};
      if (s.mom.got === undefined) s.mom.got = null;
      if (!s.sent) s.sent = [];
      if (s.phone === undefined) s.phone = null;
      if (s.box === undefined) s.box = null;
      s.photos.forEach(function (p, i) { if (!p.id) p.id = 'p' + (i + 1); if (!p.to) p.to = []; if (!p.kind) p.kind = 'cat'; });
      if (!s.photoSeq) s.photoSeq = s.photos.length;
      if (!s.vet) s.vet = freshVet();
      if (s.card === undefined) s.card = null;
      if (!s.wed) s.wed = freshWed();
      if (!s.one) s.one = {};
      if (!s.appts) s.appts = [];
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
    PRODUCTS: PRODUCTS, UNLOCK: UNLOCK, SHOP: SHOP, UMBRELLA: UMBRELLA, DAYS: DAYS, CLIENTS: CLIENTS, BILLS: BILLS, week: week, comes: comes,
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
    VET: VET, HOESIK: HOESIK, WEDDING: WEDDING, DATE: DATE, payAny: payAny, vetDone: vetDone, vetSign: vetSign, vetDue: vetDue, vetOpen: vetOpen, treat: treat, onMed: onMed, postpone: postpone,
    hoesik: hoesik, wedAnswer: wedAnswer, wedGift: wedGift, wedGo: wedGo, oneMeet: oneMeet, oneBond: oneBond, dateOut: dateOut, visitOk: visitOk, ONE_STEP: ONE_STEP,
    addAppt: addAppt, appt: appt, apptsUp: apptsUp, apptNow: apptNow, apptDone: apptDone, apptMissed: apptMissed, freshVet: freshVet, freshWed: freshWed,
    photo: photo, sendPhoto: sendPhoto, cashService: cashService, momSend: momSend, momOpen: momOpen, momTouch: momTouch, momBond: momBond, MOM_FOOD: MOM_FOOD, freshMom: freshMom, photoCap: photoCap, photosToday: photosToday, eat: eat, eatBlock: eatBlock, kneadNight: kneadNight, knead: knead, dinner: dinner, lastPrep: lastPrep,
    ALARM_HEARTS: ALARM_HEARTS, KNEAD_NIGHTS: KNEAD_NIGHTS, ties: ties, umbrellaBy: umbrellaBy, debtLeft: debtLeft, TIES_FAMILY: TIES_FAMILY,
    habitReady: habitReady, HABIT_DAYS: HABIT_DAYS,
    PEOPLE: PEOPLE, REACH: REACH, ASK: ASK, LUNCH_DAYS: LUNCH_DAYS, DISH_FROM: DISH_FROM, DRIFT_DAYS: DRIFT_DAYS, VISIT_GAP: VISIT_GAP, WORK_HELP: WORK_HELP,
    person: person, windowOf: windowOf, litWindows: litWindows, reach: reach, reachBlock: reachBlock, giveKey: giveKey, helpers: helpers, ask: ask, drift: drift, helperVisit: helperVisit,
    save: save, load: load,
    hasBatchim: hasBatchim, nameForm: nameForm, josa: josa, clock: clock, won: won, cleanName: cleanName
  };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Life;
