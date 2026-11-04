const test = require('node:test');
const assert = require('node:assert/strict');
const Life = require('../src/life-state.js');

// 상담을 완벽하게 해낸다. 틀린 횟수를 주면 그만큼 먼저 틀린다.
function play(s, id, mistakes = 0) {
  const p = Life.plan(s, id), st = Life.consult(p);
  for (let i = 0; i < mistakes && !st.done; i++) Life.answer(p, st, 'nothing');
  while (!st.done) Life.answer(p, st, Life.wants(p, st));
  return Life.finish(s, p, st);
}
// 평일 하루를 정해진 방식대로 보낸다.
function weekday(s, o = {}) {
  Life.morning(s);
  if (o.roll) Life.roll(s);
  Life.dress(s);
  if (!o.skipFeed) Life.feed(s, 'dry');
  Life.water(s);
  if (!o.skipScoop) Life.scoop(s);
  if (s.pantry.sand && s.litter.sand <= 1) Life.refill(s);
  if (o.petMorning) Life.pet(s);
  if (o.late) s.minute = Life.T.leaveBy + o.late;
  Life.leaveHome(s);
  for (const id of Life.clientsOn(s.day)) play(s, id, o.mistakes || 0);
  if (Life.day(s).group) { Life.decideGroup(s, !!o.group); if (o.group) play(s, 'c6'); }
  if (Life.day(s).final) return Life.evaluate(s);
  Life.leaveOffice(s);
  for (const item of o.buy || []) Life.buy(s, item);
  Life.arriveHome(s);
  if (s.hidden && Life.day(s).storm && o.curtain) Life.slot(s, 'curtain');
  if (!o.skipFeed) Life.feed(s, 'dry');
  Life.water(s);
  Life.pet(s);
  for (const k of o.slots || ['play', 'prep']) Life.slot(s, k);
  Life.toBed(s);
  Life.setDoor(s, !!o.open);
  return Life.sleep(s, { cat: o.cat });
}

test('4/12 일요일 저녁에 지갑 2만 원, 사료 반 봉지, 저녁 두 칸으로 시작한다', () => {
  const s = Life.create('김신입', '보리');
  assert.equal(Life.day(s).date, '4/12');
  assert.equal(s.phase, 'evening');
  assert.equal(s.wallet, 20000);
  assert.equal(s.food.dry, 4);
  assert.equal(s.slots, 2);
  assert.deepEqual(s.cards, []);
  assert.equal(Life.DAYS.length, 13);
  assert.equal(Life.DAYS[12].date, '4/24');
});

test('고객은 평일 열흘 동안 저녁 8시 단체 고객까지 모두 15명이다', () => {
  const ids = Object.keys(Life.CLIENTS);
  assert.equal(ids.length, 15);
  let weekdays = 0;
  for (let d = 0; d < Life.DAYS.length; d++) if (Life.DAYS[d].kind === 'work') { weekdays++; assert.ok(Life.clientsOn(d).length >= 1); }
  assert.equal(weekdays, 10);
  assert.equal(Life.clientsOn(9)[0], 'c10');
  assert.equal(Life.CLIENTS.c10.mark, 'clock');
  assert.equal(Life.CLIENTS.c4.mark, 'sneeze');
});

test('이름 뒤 조사는 받침에 따라 바뀐다', () => {
  assert.equal(Life.josa('땅콩', 'subject'), '땅콩이가');
  assert.equal(Life.josa('땅콩', 'call'), '땅콩아');
  assert.equal(Life.josa('사라', 'subject'), '사라가');
  assert.equal(Life.josa('사라', 'call'), '사라야');
  assert.equal(Life.josa('안녕', 'object'), '안녕이를');
  assert.equal(Life.create('', '').cat, '보리');
  assert.equal(Life.create('', '안녕').cat, '안녕');
});

test('그릇이 차 있으면 사료를 또 부을 수 없고, 저녁이 되면 다시 줄 수 있다', () => {
  const s = Life.create('나', '보리');
  assert.equal(Life.feed(s, 'dry').ok, true);
  assert.equal(Life.feed(s, 'dry').why, 'fed');
  Life.ate(s);
  assert.equal(Life.feed(s, 'dry').why, 'fed');
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(s.meal, 'am');
  assert.equal(Life.feed(s, 'dry').ok, true);
  assert.equal(s.food.dry, 2);
});

test('평일 아침에는 돌봄마다 시계가 가고, 저녁 돌봄은 시간이 들지 않는다', () => {
  const s = Life.create('나', '보리');
  const before = s.minute;
  Life.feed(s, 'dry'); Life.water(s); Life.pet(s);
  assert.equal(s.minute, before);
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(s.minute, Life.T.wake);
  Life.dress(s); Life.feed(s, 'dry'); Life.water(s); Life.scoop(s); Life.pet(s);
  assert.equal(s.minute, Life.T.wake + 5 + 5 + 3 + 7 + 5);
});

test('정장을 안 입으면 현관을 나설 수 없고, 8시 10분이 지나 나가면 지각이다', () => {
  const s = Life.create('나', '보리');
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(Life.leaveHome(s).why, 'noSuit');
  Life.dress(s);
  s.minute = Life.T.leaveBy + 12;
  const r = Life.leaveHome(s);
  assert.equal(r.ok, true);
  assert.equal(r.late, 12);
});

test('지각하면 첫 고객 기분이 한 칸 낮고, 바쁜 첫 고객은 가 버린다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.late = 10;
  assert.equal(Life.plan(s, 'c2').mood, 1);
  s.day = 9;
  const p = Life.plan(s, 'c10');
  assert.equal(p.leaves, true);
  const r = Life.finish(s, p, Life.consult(p));
  assert.equal(r.signed, false);
  assert.equal(r.why, 'busyLeft');
});

test('정장의 털은 고객 카드에 따라 독도 되고 득도 된다', () => {
  const s = Life.create('나', '보리');
  s.fur = 1; s.day = 3;
  assert.equal(Life.plan(s, 'c3').mood, 1);          // 보통 고객: 한 칸 낮게
  assert.equal(Life.plan(s, 'c4').mood, 0);          // 털 알레르기: 두 칸 낮게
  s.day = 5;
  const cat = Life.plan(s, 'c7');
  assert.equal(cat.mood, 3);                         // 고양이를 키우는 고객: 반가워한다
  assert.ok(cat.steps.includes('pet'));
  s.fur = 0;
  assert.ok(!Life.plan(s, 'c7').steps.includes('pet'));
});

test('털 알레르기 고객은 털이 있으면 준비해야만 겨우 계약한다', () => {
  const s = Life.create('나', '보리');
  s.fur = 2; s.day = 3; s.energy = 4;
  assert.equal(play(s, 'c4').signed, false);
  assert.equal(s.results.at(-1).why, 'sneeze');
  s.prepared.c4 = true;
  assert.equal(play(s, 'c4').signed, true);
});

test('보통 고객은 한 번 실수해도 계약하지만 두 번 실수하면 생각해 보겠다고 간다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.energy = 4;
  assert.equal(play(s, 'c2', 1).signed, true);
  assert.equal(play(s, 'c2', 2).signed, false);
});

test('체력이 낮으면 안내서가 흐려지고 0칸이면 깜빡이며 하품을 한다', () => {
  const s = Life.create('나', '보리');
  s.day = 2;
  s.energy = 3; let p = Life.plan(s, 'c2'); assert.equal(p.blur, false); assert.equal(p.blink, false);
  s.energy = 2; p = Life.plan(s, 'c2'); assert.equal(p.blur, true);
  s.energy = 1; p = Life.plan(s, 'c2'); assert.equal(p.blur, true); assert.equal(p.mood, 1);
  s.energy = 0; p = Life.plan(s, 'c2'); assert.equal(p.blink, true);
  s.coffee = true; p = Life.plan(s, 'c2'); assert.equal(p.blink, false); assert.equal(p.blur, true);
});

test('고양이를 키우는 고객이 털을 보고 웃으면 펫보험까지 두 건이 붙는다', () => {
  const s = Life.create('나', '보리');
  s.day = 5; s.fur = 1; s.energy = 4;
  const r = play(s, 'c7');
  assert.equal(r.signed, true);
  assert.equal(r.pet, true);
  assert.equal(r.pay, 6000 + 8000);
  assert.equal(s.contracts, 2);
});

test('지점을 나설 때 활동비와 수당이 들어오고 체력이 두 칸 줄며 내일 고객 카드를 받는다', () => {
  const s = Life.create('나', '보리');
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  Life.dress(s); Life.leaveHome(s);
  play(s, 'c1');
  const e = s.energy;
  Life.leaveOffice(s);
  assert.equal(s.wallet, 20000 + 2000 + 10000);
  assert.equal(s.energy, e - 2);
  assert.deepEqual(s.cards, ['c2']);
  assert.equal(s.today.earned.length, 2);
});

test('금요일에는 월요일 고객 카드를 받고 주말에 준비할 수 있다', () => {
  const s = Life.create('나', '보리');
  s.day = 5; s.phase = 'work';
  Life.leaveOffice(s);
  assert.deepEqual(s.cards, ['c9']);
  Life.arriveHome(s); Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(s.phase, 'weekend');
  assert.equal(s.slots, 4);
  assert.equal(Life.slot(s, 'prep').ok, true);
  assert.equal(s.prepared.c9, true);
});

test('가게 진열대에서만 사고, 돈이 모자라면 못 산다', () => {
  const s = Life.create('나', '보리');
  assert.equal(Life.buy(s, 'roller').ok, true);
  assert.equal(Life.buy(s, 'roller').why, 'owned');
  assert.equal(Life.buy(s, 'tower').why, 'money');
  Life.buy(s, 'dry');
  assert.equal(s.food.dry, 12);
  assert.equal(s.wallet, 20000 - 3000 - 12000);
  assert.deepEqual(s.today.spent.map(x => x.item), ['roller', 'dry']);
});

test('같이 자면 하트가 오르고 다음 날 정장에 털이 붙는다. 안 놀았으면 새벽에 깨운다', () => {
  const s = Life.create('나', '보리');
  Life.feed(s, 'dry'); Life.water(s); Life.slot(s, 'play');
  const h = s.hearts;
  Life.toBed(s); Life.setDoor(s, true); Life.sleep(s);
  assert.equal(s.hearts, h + 1);
  assert.equal(s.fur, 1);
  assert.equal(s.woke, false);
  const t = Life.create('나', '보리');
  Life.feed(t, 'dry'); Life.water(t);
  Life.toBed(t); Life.setDoor(t, true); Life.sleep(t);
  assert.equal(t.woke, true);
  assert.equal(t.morningNote.key, 'wakeZoomies');
  Life.morning(t);
  assert.equal(t.minute, Life.T.wokeWake);
});

test('문 닫고 자면 잠 +3, 안 논 밤에는 보리 시점에서 긁을지 참을지 고른다', () => {
  const a = Life.create('나', '보리');
  Life.feed(a, 'dry'); Life.water(a);
  a.energy = 1;
  Life.toBed(a); Life.setDoor(a, false);
  assert.equal(Life.needsPOV(a), true);
  Life.sleep(a, { cat: 'scratch' });
  assert.equal(a.energy, 3);
  const b = Life.create('나', '보리');
  Life.feed(b, 'dry'); Life.water(b);
  const h = b.hearts; b.energy = 1;
  Life.toBed(b); Life.setDoor(b, false); Life.sleep(b, { cat: 'endure' });
  assert.equal(b.energy, 4);
  assert.equal(b.hearts, h - 1);
  const c = Life.create('나', '보리');
  c.owned.tower = true;
  Life.toBed(c); Life.setDoor(c, false);
  assert.equal(Life.needsPOV(c), false);
});

test('밥과 물을 거르면 그날 결산에 이유와 함께 하트가 줄고, 넉 끼를 거르면 빈 밥그릇이다', () => {
  const s = Life.create('나', '보리');
  Life.toBed(s); Life.setDoor(s, false);
  const t = Life.sleep(s, { cat: 'endure' });
  assert.deepEqual(t.hearts.map(h => h.key), ['missPm', 'dry', 'lonely']);
  assert.equal(s.missed, 1);
  Life.morning(s); Life.dress(s); Life.leaveHome(s);
  assert.equal(s.missed, 2);
  s.missed = 3;
  Life.leaveOffice(s); Life.arriveHome(s); Life.toBed(s); Life.sleep(s);
  assert.equal(s.ended, 'emptyBowl');
  assert.equal(Life.ending(s).key, 'emptyBowl');
});

test('자동 급식기는 못 챙긴 끼니를 대신 준다', () => {
  const s = Life.create('나', '보리');
  s.owned.feeder = true;
  Life.water(s);
  Life.toBed(s); Life.setDoor(s, false); Life.slot(s, 'play');
  Life.sleep(s);
  assert.equal(s.missed, 0);
  assert.ok(s.ledger[0].notes.includes('feeder'));
});

test('화장실은 매일 아침 똥이 하나씩 생기고, 세 개가 되거나 모래가 떨어지면 실수한다', () => {
  const s = Life.create('나', '보리');
  s.litter.sand = 4;
  const night = () => { Life.toBed(s); Life.sleep(s); return Life.morning(s); };
  assert.equal(night().accident, false); // 1
  assert.equal(night().accident, false); // 2
  const r = night();                     // 3
  assert.equal(r.accident, true);
  assert.equal(s.minute, Life.T.wake + Life.T.accident);
  assert.ok(s.today.hearts.some(h => h.key === 'accident'));
  Life.scoop(s);
  assert.equal(s.litter.poop, 0);
  assert.equal(s.litter.sand, 1);
  s.pantry.sand = 1;
  assert.equal(Life.refill(s).ok, true);
  assert.equal(s.litter.sand, 4);
});

test('저녁 칸은 두 개이고 놀이, 쉬기, 준비 중에서 고른다', () => {
  const s = Life.create('나', '보리');
  s.cards = ['c1'];
  assert.equal(Life.slot(s, 'play').ok, true);
  assert.equal(Life.slot(s, 'play').why, 'played');
  assert.equal(Life.slot(s, 'prep').ok, true);
  assert.equal(Life.slot(s, 'rest').why, 'noSlot');
  assert.equal(s.prepared.c1, true);
});

test('4/15 비 오는 밤에는 보리가 숨고, 커튼을 쳐 주면 나온다', () => {
  const s = Life.create('나', '보리');
  s.day = 3; s.phase = 'work';
  Life.leaveOffice(s); Life.arriveHome(s);
  assert.equal(s.hidden, true);
  assert.equal(Life.pet(s).why, 'hidden');
  assert.equal(Life.slot(s, 'curtain').ok, true);
  assert.equal(s.hidden, false);
  assert.ok(s.today.hearts.some(h => h.key === 'curtain'));
});

test('4/16 저녁 8시 상담에 가면 저녁은 한 칸이고 체력이 한 칸 더 준다', () => {
  const s = Life.create('나', '보리');
  s.day = 4; s.phase = 'work'; s.energy = 5;
  play(s, 'c5');
  Life.decideGroup(s, true);
  const r = play(s, 'c6');
  Life.leaveOffice(s);
  assert.equal(s.energy, 2);
  if (r.signed) assert.ok(s.wallet >= 20000 + 2000 + 6000 + 30000);
  Life.arriveHome(s);
  assert.equal(s.slots, 1);
  assert.equal(s.minute, Life.T.groupHome);
});

test('4/21 아침에는 보리가 안 보이고, 서랍 속에서 찾는다', () => {
  const s = Life.create('나', '보리');
  s.day = 8; s.phase = 'evening';
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(Life.day(s).date, '4/21');
  assert.equal(s.hidden, true);
  const m = s.minute;
  assert.equal(Life.search(s, 'sofa').found, false);
  assert.equal(Life.search(s, 'drawer').found, true);
  assert.equal(s.minute, m + 6);
  assert.equal(s.hidden, false);
});

test('엔딩은 하트와 계약 건수 두 가지로만 정해진다', () => {
  const s = Life.create('나', '보리');
  const pick = (h, c) => { s.hearts = h; s.contracts = c; return Life.ending(s).key; };
  assert.equal(pick(5, 8), 'both');
  assert.equal(pick(4, 7), 'catStays');
  assert.equal(pick(3, 9), 'soso');
  assert.equal(pick(2, 3), 'clumsy');
  assert.equal(pick(1, 10), 'oneBody');
  assert.equal(pick(0, 0), 'again');
});

test('저장하고 다시 불러오면 같은 상태다', () => {
  const s = Life.create('김신입', '안녕');
  weekday(s, { open: true });
  const back = Life.load(Life.save(s));
  assert.deepEqual(back, s);
  assert.equal(back.cat, '안녕');
  assert.equal(back.door, 'open');
  assert.equal(Life.load('{"v":0}'), null);
});

test('성실한 12일: 계약 8건 이상, 하트 가득, 지갑은 바닥나지 않는다', () => {
  const s = Life.create('나', '보리');
  Life.feed(s, 'dry'); Life.water(s); Life.pet(s); Life.slot(s, 'play'); Life.slot(s, 'rest');
  Life.toBed(s); Life.setDoor(s, false); Life.sleep(s);
  const shopping = { 1: ['roller', 'sand'], 2: ['dry'], 5: ['sand', 'dry'], 9: ['sand', 'dry'] };
  let min = s.wallet;
  while (!s.ended) {
    const d = s.day + 1;
    if (Life.DAYS[d].kind === 'off') {
      Life.morning(s); Life.feed(s, 'dry'); Life.water(s); Life.scoop(s); Life.pet(s);
      if (s.pantry.sand && s.litter.sand <= 1) Life.refill(s);
      Life.slot(s, 'play'); Life.slot(s, 'rest');
      Life.feed(s, 'dry'); Life.slot(s, 'prep'); Life.slot(s, 'rest');
      Life.toBed(s); Life.setDoor(s, false); Life.sleep(s);
    } else {
      weekday(s, { buy: shopping[d] || [], curtain: true, group: true, slots: ['play', 'prep'] });
    }
    min = Math.min(min, s.wallet);
  }
  assert.equal(s.ended, 'evaluation');
  assert.ok(s.contracts >= Life.GOAL, 'contracts ' + s.contracts);
  assert.ok(min >= 0);
  assert.equal(s.missed, 0);
  assert.equal(Life.ending(s).key, 'both');
  assert.equal(s.ledger.length, 13);
  assert.equal(s.diary.length, 13);
});
