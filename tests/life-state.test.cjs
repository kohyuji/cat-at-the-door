const test = require('node:test');
const assert = require('node:assert/strict');
const Life = require('../src/life-state.js');
const T = Life.T;

// 상담을 끝까지 해낸다. 기본은 걱정과 예산을 적고, 꼭 필요한 보장을 예산 안에서 넣고, 솔직하게 적고, 다 설명한다.
// o: wrong(먼저 엉뚱한 안내서), all(보장을 다 켬), over(예산을 넘겨도 권함), hide(알릴 의무를 넘김), skip(설명 건너뜀), noHook(이유를 안 적음), slow(머뭇거린 횟수)
function play(s, id, o = {}) {
  const p = Life.plan(s, id), st = Life.consult(p);
  if (st.done) return Life.finish(s, p, st);
  for (const f of p.facts) if (f !== 'life' && !(o.noHook && f === 'hook')) Life.note(p, st, f);
  for (let i = 0; i < (o.slow || 0); i++) Life.timeout(p, st);
  Life.listened(p, st);
  for (let i = 0; i < (o.wrong || 0) && !st.done; i++) Life.pickProduct(p, st, p.product === 'home' ? 'dental' : 'home');
  if (st.done) return Life.finish(s, p, st);
  Life.pickProduct(p, st, p.product);
  const items = Life.PRODUCTS[p.product].items;
  for (const k of Object.keys(items)) if ((o.all || p.needs.includes(k)) && !st.covers[k]) Life.toggle(p, st, k);
  Life.submitDesign(p, st, !!(o.over || o.all));
  if (st.done) return Life.finish(s, p, st);
  Life.apply(p, st, !o.hide);
  if (st.done) return Life.finish(s, p, st);
  if (!o.skip) { [0, 1, 2].forEach(i => Life.explain(p, st, i)); Life.hand(p, st); }
  if (Life.needsPersuade(p, st)) Life.persuade(p, st);
  if (!st.done) Life.sign(p, st);
  return Life.finish(s, p, st);
}
// 아침에 꼭 할 일만 하고 나간다: 정장, 털(돌돌이가 있으면), 밥, 화장실.
function morningRoutine(s, o) {
  Life.dress(s);
  if (s.fur && s.owned.roller && o.roll !== false) Life.roll(s);
  if (!o.skipFeed) Life.feed(s, 'dry');
  if (o.scoop !== false) Life.scoop(s);
  if (o.late) s.minute = T.leaveBy + o.late;
}
// 저녁과 주말에 고양이를 챙기고, 할 일을 고른다.
function homeRoutine(s, o) {
  if (s.hidden && Life.day(s).storm && o.curtain !== false) Life.act(s, 'curtain');
  if (!o.skipFeed) Life.feed(s, 'dry');
  Life.water(s);
  Life.scoop(s);
  if (s.pantry.sand && Life.sandLow(s)) Life.refill(s);
  Life.pet(s);
  for (const k of o.acts || ['play', 'prep', 'rest']) Life.act(s, k);
  if (!o.noMeal) Life.eat(s, o.cook ? 'cook' : 'quick');
}
function sleep(s, o) {
  Life.toBed(s);
  Life.setDoor(s, !!o.open);
  return Life.sleep(s, { cat: o.cat });
}
// 평일 하루를 정해진 방식대로 보낸다.
function weekday(s, o = {}) {
  Life.morning(s);
  morningRoutine(s, o);
  Life.leaveHome(s);
  for (const id of Life.clientsOn(s.day, s)) play(s, id, o.greedy ? { all: true, hide: true } : { wrong: o.mistakes || 0, slow: o.hesitate ? 1 : 0 });
  if (Life.day(s).group) { Life.decideGroup(s, !!o.group); if (o.group) play(s, 'c6'); }
  if (Life.day(s).final) return Life.evaluate(s);
  Life.leaveOffice(s);
  for (const item of o.buy ? o.buy(s) : []) Life.buy(s, item);
  Life.arriveHome(s);
  payBills(s);
  homeRoutine(s, o);
  return sleep(s, o);
}
// 주말: 오전에 밥, 청소, 장보기, 오후 3시가 지나면 저녁 밥.
function weekend(s, o = {}) {
  Life.morning(s);
  Life.feed(s, 'dry'); Life.water(s); Life.scoop(s); Life.pet(s);
  if (s.pantry.sand && Life.sandLow(s)) Life.refill(s);
  Life.act(s, 'sweep'); Life.act(s, 'mop');
  if (o.buy) { Life.act(s, 'shop'); for (const item of o.buy(s)) Life.buy(s, item); }
  Life.act(s, 'play'); Life.act(s, 'prep'); Life.act(s, 'rest');
  if (Life.napFirst(s)) Life.nap(s);
  Life.feed(s, 'dry');
  return sleep(s, o);
}
// 성실한 사람의 장보기: 사료가 떨어지기 전에, 모래가 바닥나기 전에, 장난감이 닳기 전에, 돌돌이는 처음 한 번.
function sensibleBuy(s) {
  const list = [];
  if (!s.owned.roller) list.push('roller');
  if (s.food.dry <= 3) list.push('dry');
  if (!s.pantry.sand && s.litter.sand <= 2) list.push('sand');
  if (s.toy <= 1) list.push('toy');
  let left = s.wallet;
  return list.filter(item => { const ok = left >= Life.SHOP[item].price; if (ok) left -= Life.SHOP[item].price; return ok; });
}
function payBills(s) {
  for (let b = Life.billDue(s); b; b = Life.billDue(s)) {
    if (s.wallet >= b.amount) Life.payBill(s, b.id, 'pay');
    else if (b.defer) Life.payBill(s, b.id, 'defer');
    else if (Life.canCash(s)) Life.payBill(s, b.id, 'cash');
    else Life.lateBill(s, b.id);
  }
}
function month(o = {}) {
  const s = Life.create('나', '보리');
  homeRoutine(s, { acts: ['play'] });
  sleep(s, { open: true }); // 첫날 밤은 문을 열어 두고 잔다
  let min = s.wallet;
  while (!s.ended) {
    if (Life.DAYS[s.day + 1].kind === 'off') weekend(s, { ...o, buy: o.buy });
    else weekday(s, { group: true, ...o });
    min = Math.min(min, s.wallet);
  }
  return { s, min };
}

test('이름 뒤 조사는 받침에 따라 바뀐다', () => {
  assert.equal(Life.josa('땅콩', 'subject'), '땅콩이가');
  assert.equal(Life.josa('땅콩', 'call'), '땅콩아');
  assert.equal(Life.josa('사라', 'subject'), '사라가');
  assert.equal(Life.josa('사라', 'call'), '사라야');
  assert.equal(Life.josa('안녕', 'object'), '안녕이를');
  assert.equal(Life.create('', '').cat, '보리');
  assert.equal(Life.create('', '안녕').cat, '안녕');
});

test('그릇이 차 있으면 사료를 또 부을 수 없고, 다음 끼니가 되면 다시 줄 수 있다', () => {
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

test('집에서 하는 일은 아침이든 저녁이든 시계를 움직이고, 피곤하면 1.5배 걸린다', () => {
  const s = Life.create('나', '보리');
  s.day = 1; s.floor.fur = 1;
  const m0 = s.minute;
  Life.feed(s, 'dry'); Life.water(s); Life.pet(s);
  assert.equal(s.minute, m0 + T.feed + T.water + T.pet);
  s.energy = 1;
  assert.equal(Life.tired(s), true);
  assert.equal(Life.act(s, 'sweep').minutes, Math.ceil(T.sweep * 1.5));
  Life.toBed(s); Life.setDoor(s, false); Life.sleep(s); Life.morning(s);
  assert.equal(s.minute, T.wake);
  Life.dress(s); Life.feed(s, 'dry'); Life.water(s); Life.scoop(s);
  assert.equal(s.minute, T.wake + T.dress + T.feed + T.water + T.scoop);
});

test('아침은 7시 40분부터 30분뿐이라 다 하려면 늦는다', () => {
  assert.equal(T.leaveBy - T.wake, 30);
  const s = Life.create('나', '보리');
  s.day = 1;
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  s.owned.roller = true; s.fur = 1; s.pantry.coffee = 1;
  Life.dress(s); Life.roll(s); Life.feed(s, 'dry'); Life.water(s); Life.scoop(s);
  assert.ok(s.minute <= T.leaveBy);                // 꼭 할 일은 다 할 수 있지만
  Life.pet(s); Life.coffee(s);
  assert.ok(s.minute > T.leaveBy);                 // 쓰다듬고 커피까지 마시면 늦는다
  assert.ok(Life.leaveHome(s).late > 0);
});

test('정장을 안 입으면 현관을 나설 수 없고, 8시 10분이 지나 나가면 지각이다', () => {
  const s = Life.create('나', '보리');
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(Life.leaveHome(s).why, 'noSuit');
  Life.dress(s);
  s.minute = T.leaveBy + 12;
  const r = Life.leaveHome(s);
  assert.equal(r.ok, true);
  assert.equal(r.late, 12);
  const t = Life.create('나', '보리');
  Life.toBed(t); Life.sleep(t); Life.morning(t);
  Life.dress(t); t.minute = T.leaveBy;
  assert.equal(Life.leaveHome(t).late, 0);
});

test('바닥에 털이 쌓여 있으면 정장으로 갈아입는 사이에 털이 묻는다', () => {
  const s = Life.create('나', '보리');
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  s.floor.fur = 3;
  Life.dress(s);
  assert.equal(s.fur, 1);
  assert.ok(s.today.notes.includes('floorFur'));
  assert.equal(Life.roll(s).why, 'noRoller');
  s.owned.roller = true;
  assert.equal(Life.roll(s).ok, true);
  assert.equal(s.fur, 0);
});

test('저녁에 할 일은 자유지만 하나하나 시간이 들고, 같은 일은 정해진 만큼만 할 수 있다', () => {
  const s = Life.create('나', '보리');
  s.energy = 2; s.floor.fur = 1;
  assert.equal(Life.act(s, 'play').minutes, T.play);
  assert.equal(Life.act(s, 'play').why, 'played');
  assert.equal(Life.act(s, 'rest').ok, true);
  assert.equal(s.energy, 3);
  assert.equal(Life.act(s, 'rest').why, 'rested');
  assert.equal(Life.act(s, 'sweep').ok, true);
  assert.equal(Life.act(s, 'sweep').why, 'clean');
  assert.equal(Life.act(s, 'mop').why, 'clean');
  assert.equal(Life.doBlock(s, 'shop'), null);     // 저녁에도 다시 나가서 장을 볼 수 있다
  assert.equal(Life.act(s, 'curtain').why, 'noStorm');
  assert.equal(s.minute, T.homeArrive + T.play + T.rest + T.sweep);
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(Life.act(s, 'play').why, 'notHome');
});

test('장난감은 네 번 놀면 닳고, 새로 사야 다시 놀 수 있다', () => {
  const s = Life.create('나', '보리');
  s.toy = 1;
  const r = Life.act(s, 'play');
  assert.equal(r.ok, true);
  assert.equal(r.broke, true);
  Life.toBed(s); Life.setDoor(s, false); Life.sleep(s); Life.morning(s);
  s.phase = 'evening';
  assert.equal(Life.act(s, 'play').why, 'noToy');
  Life.buy(s, 'toy');
  assert.equal(s.toy, Life.TOY_PLAYS);
  assert.equal(Life.act(s, 'play').ok, true);
});

test('11시 전에 자면 체력 +3, 한 시간 늦을 때마다 한 칸씩 덜 찬다. 저녁 커피도 한 칸을 깎는다', () => {
  assert.equal(Life.sleepGain(T.bedtime), 3);
  assert.equal(Life.sleepGain(T.bedtime + 1), 2);
  assert.equal(Life.sleepGain(T.bedtime + 60), 2);
  assert.equal(Life.sleepGain(T.bedtime + 61), 1);
  assert.equal(Life.sleepGain(T.bedtime + 121), 0);
  const s = Life.create('나', '보리');
  Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play');
  s.energy = 1; s.pantry.coffee = 1;
  const c = Life.coffee(s);
  assert.equal(c.late, true);
  assert.equal(s.energy, 2);
  s.minute = T.bedtime + 30;
  const t = sleep(s, {});
  assert.equal(t.sleep.gain, 1);
  assert.deepEqual(t.sleep.lost, ['late', 'coffee']);
  assert.equal(s.energy, 3);
});

test('같이 자면 하트가 오르고 다음 날 정장에 털이 붙는다. 안 놀았으면 새벽에 깨운다', () => {
  const s = Life.create('나', '보리');
  Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play');
  const h = s.hearts;
  sleep(s, { open: true });
  assert.equal(s.hearts, Math.min(5, h + 1));
  assert.equal(s.fur, 1);
  assert.equal(s.woke, false);
  const t = Life.create('나', '보리');
  Life.feed(t, 'dry'); Life.water(t);
  t.energy = 1;
  sleep(t, { open: true });
  assert.equal(t.woke, true);
  assert.equal(t.morningNote.key, 'wakeZoomies');
  assert.equal(t.ledger[0].sleep.gain, 2);
  Life.morning(t);
  assert.equal(t.minute, T.wokeWake);
});

test('문 닫고 자면 안 논 밤에는 고양이 시점에서 긁을지 참을지 고른다. 자동 장난감이 돌면 혼자 논다', () => {
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
  sleep(b, { cat: 'endure' });
  assert.equal(b.energy, 4);
  assert.equal(b.hearts, h - 1);
  const c = Life.create('나', '보리');
  c.owned.tower = true;
  Life.feed(c, 'dry'); Life.water(c);
  Life.toBed(c); Life.setDoor(c, false);
  assert.equal(Life.needsPOV(c), true, '캣타워는 낮의 외로움만 덜어 준다');
  c.owned.autoToy = true; c.autoToyLeft = 1;
  assert.equal(Life.needsPOV(c), false);
  const hc = c.hearts;
  sleep(c, {});
  assert.equal(c.hearts, hc, '자동 장난감은 울지 않게 할 뿐 마음을 올리지 않는다');
  assert.equal(c.autoToyLeft, 0);
  assert.ok(c.ledger[c.ledger.length - 1].notes.includes('autoToyWorn'));
});

test('지쳐 있으면(체력 1 이하) 쥐돌이로 놀아 줄 수 없다', () => {
  const s = Life.create('나', '보리');
  s.energy = 1;
  assert.equal(Life.act(s, 'play').why, 'tired');
  s.energy = 2;
  assert.equal(Life.act(s, 'play').ok, true);
});

test('로봇청소기는 털이 더 쌓이지 않게만 막고 먼지는 못 닦는다', () => {
  const s = Life.create('나', '보리');
  s.owned.robot = true; s.floor = { fur: 3, dust: 2 }; s.day = 2;
  Life.feed(s, 'dry'); Life.water(s); Life.toBed(s); Life.setDoor(s, false); Life.sleep(s, { cat: 'endure' }); Life.morning(s);
  assert.equal(s.floor.fur, 3, '밤새 쌓인 만큼만 치운다');
  assert.equal(s.floor.dust, 2);
  s.floor.fur = 1; s.day++; Life.morning(s);
  assert.equal(s.floor.fur, 1, '한 뭉치는 늘 남는다');
});

test('로봇청소기와 자동 장난감은 4/17부터 슈퍼에 나온다', () => {
  const s = Life.create('나', '보리');
  s.wallet = 100000; s.day = 4;
  assert.equal(Life.onShelf(s, 'robot'), false);
  assert.equal(Life.buy(s, 'autoToy').why, 'notYet');
  assert.equal(Life.onShelf(s, 'tower'), true);
  s.day = 5;
  assert.equal(Life.buy(s, 'autoToy').ok, true);
  assert.equal(s.autoToyLeft, 5);
  assert.equal(Life.buy(s, 'autoToy').why, 'owned');
  s.autoToyLeft = 0;
  assert.equal(Life.buy(s, 'autoToy').ok, true, '닳으면 다시 살 수 있다');
});

test('혼자 집을 본 날은 하트가 두 칸 줄고, 캣타워가 있으면 한 칸만 준다', () => {
  const a = Life.create('나', '보리');
  a.day = 1; a.phase = 'work';
  Life.leaveOffice(a); Life.arriveHome(a);
  assert.equal(a.hearts, 1);
  assert.ok(a.today.hearts.some(x => x.key === 'alone'));
  const b = Life.create('나', '보리');
  b.day = 1; b.phase = 'work'; b.owned.tower = true;
  Life.leaveOffice(b); Life.arriveHome(b);
  assert.equal(b.hearts, 2);
  assert.ok(b.today.hearts.some(x => x.key === 'aloneTower'));
});

test('밥과 물을 거르면 그날 결산에 이유와 함께 하트가 줄고, 넉 끼를 거르면 빈 밥그릇이다', () => {
  const s = Life.create('나', '보리');
  const t = sleep(s, { cat: 'endure' });
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
  Life.water(s); Life.act(s, 'play');
  sleep(s, {});
  assert.equal(s.missed, 0);
  assert.ok(s.ledger[0].notes.includes('feeder'));
});

test('화장실은 매일 아침 똥이 하나씩 생기고, 세 개가 되거나 모래가 떨어지면 실수한다', () => {
  const s = Life.create('나', '보리');
  s.litter.sand = 4; s.day = 2;
  const night = (open) => { sleep(s, { open }); return Life.morning(s); };
  assert.equal(night().accident, false); // 1
  assert.equal(night().accident, false); // 2
  const r = night();                     // 3
  assert.equal(r.accident, true);
  assert.equal(r.key, 'accident');
  assert.equal(r.where, 'floor');
  assert.equal(s.minute, T.wake + T.accident);
  assert.ok(s.today.hearts.some(h => h.key === 'accident'));
  Life.scoop(s);
  assert.equal(s.litter.poop, 0);
  assert.equal(Life.scoop(s).why, 'clean');
  assert.equal(s.litter.sand, 1);
  assert.equal(Life.sandLow(s), true);
  assert.equal(Life.refill(s).why, 'noSand');
  s.pantry.sand = 1;
  assert.equal(Life.refill(s).ok, true);
  assert.equal(s.litter.sand, Life.SAND_DAYS);
  assert.equal(Life.sandLow(s), false);
});

test('실수한 자리는 잔 방식에 따라 다르다: 문을 닫으면 거실 바닥, 열면 이불. 모래가 없어서인지도 따로 알린다', () => {
  const run = (open, sand) => {
    const s = Life.create('나', '보리');
    s.litter.sand = sand; s.litter.poop = sand ? 2 : 0; s.day = 2;
    Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play');
    sleep(s, { open });
    return Life.morning(s);
  };
  assert.equal(run(false, 3).key, 'accident');
  assert.equal(run(true, 3).key, 'accidentBed');
  assert.equal(run(true, 3).where, 'bed');
  assert.equal(run(false, 0).key, 'accidentSand');
  assert.equal(run(true, 0).key, 'accidentSandBed');
});

test('바닥에는 털이 매일, 먼지가 이틀에 한 번 쌓이고 주말에 쓸고 닦는다', () => {
  const s = Life.create('나', '보리');
  s.day = 2;
  for (let i = 0; i < 4; i++) { Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play'); sleep(s, {}); Life.morning(s); s.phase = 'evening'; s.fed.pm = false; s.bowl = 'empty'; s.meal = 'pm'; }
  assert.equal(s.floor.fur, 4);
  assert.equal(s.floor.dust, 2);
  const m = s.minute;
  assert.equal(Life.act(s, 'sweep').ok, true);
  assert.equal(Life.act(s, 'mop').ok, true);
  assert.equal(s.floor.fur, 0);
  assert.equal(s.floor.dust, 0);
  assert.equal(s.minute, m + T.sweep + T.mop);
});

test('주말 오후 3시 전에 누우면 낮잠을 자고 3시에 깨어 저녁 밥을 줄 수 있다', () => {
  const s = Life.create('나', '보리');
  s.day = 5; s.phase = 'work';
  Life.leaveOffice(s); Life.arriveHome(s);
  Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play');
  sleep(s, {}); Life.morning(s);
  assert.equal(s.phase, 'weekend');
  Life.feed(s, 'dry');
  assert.equal(Life.feed(s, 'dry').why, 'fed');
  assert.equal(Life.napFirst(s), true);
  const r = Life.nap(s);
  assert.equal(r.ok, true);
  assert.equal(r.minutes, T.weekendLunch - T.weekendStart - T.feed);
  assert.equal(s.meal, 'pm');
  assert.equal(Life.napFirst(s), false);
  assert.equal(Life.feed(s, 'dry').ok, true);
  assert.equal(s.missed, 0);
});

test('집에 와서도 몇 번이든 다시 장을 보러 나갈 수 있고, 한 번에 40분이 든다', () => {
  const s = Life.create('나', '보리');
  s.day = 5; s.phase = 'work';
  Life.leaveOffice(s); Life.arriveHome(s);
  let m = s.minute;
  assert.equal(Life.act(s, 'shop').ok, true);
  assert.equal(s.minute, m + T.shopTrip);
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  m = s.minute;
  assert.equal(Life.act(s, 'shop').ok, true);
  assert.equal(Life.act(s, 'shop').ok, true);
  assert.equal(s.minute, m + 2 * T.shopTrip);
});

test('4/15 천둥 치는 밤에는 고양이가 숨고, 커튼을 쳐 주면 나온다', () => {
  const s = Life.create('나', '보리');
  s.day = 3; s.phase = 'work';
  Life.leaveOffice(s); Life.arriveHome(s);
  assert.equal(s.hidden, true);
  assert.equal(Life.pet(s).why, 'hidden');
  assert.equal(Life.act(s, 'play').why, 'hidden');
  const m = s.minute;
  assert.equal(Life.act(s, 'curtain').ok, true);
  assert.equal(s.minute, m + T.curtain);
  assert.equal(s.hidden, false);
  assert.ok(s.today.hearts.some(h => h.key === 'curtain'));
  assert.equal(Life.act(s, 'play').ok, true);
});

test('4/21 고양이를 못 찾고 출근하면 서랍 속에 하루 종일 갇혀 있다가 저녁에야 나온다', () => {
  const s = Life.create('나', '보리');
  s.day = 8; s.phase = 'evening';
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  Life.dress(s); Life.scoop(s); Life.leaveHome(s);
  assert.equal(s.locked, true);
  Life.leaveOffice(s); Life.arriveHome(s);
  assert.ok(s.today.hearts.some(h => h.key === 'locked' && h.delta === -1));
  assert.equal(s.hidden, true);
  assert.equal(Life.pet(s).why, 'hidden');
  const r = Life.search(s, 'drawer');
  assert.equal(r.found, true);
  assert.equal(r.late, true);
  assert.equal(s.hidden, false);
  assert.ok(s.events.some(e => e.key === 'drawerLate'));
});

test('천둥 치는 밤에 끝내 커튼을 안 쳐 주면 마음이 준다', () => {
  const s = Life.create('나', '보리');
  s.day = 3; s.phase = 'work';
  Life.leaveOffice(s); Life.arriveHome(s);
  Life.feed(s, 'dry'); Life.water(s);
  Life.toBed(s); Life.sleep(s);
  assert.ok(s.ledger[0].hearts.some(h => h.key === 'stormAlone'));
});

test('4/21 아침에는 고양이가 안 보이고, 서랍 속에서 찾는다', () => {
  const s = Life.create('나', '보리');
  s.day = 8; s.phase = 'evening';
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(Life.day(s).date, '4/21');
  assert.equal(s.hidden, true);
  const m = s.minute;
  assert.equal(Life.search(s, 'sofa').found, false);
  assert.equal(Life.search(s, 'drawer').found, true);
  assert.equal(s.minute, m + 2 * T.search);
  assert.equal(s.hidden, false);
});

test('엔딩은 계약, 마음, 가까워진 사람, 남은 빚으로 정해지고, 다 지켜 준 사람만 숨은 엔딩을 본다', () => {
  const s = Life.create('나', '보리');
  const G = Life.GOAL;
  const bond = (who, b) => { const p = Life.person(s, who); p.met = true; p.bond = b; if (who === 'one') p.near = true; };
  const pick = (h, c) => { s.hearts = h; s.contracts = c; return Life.ending(s).key; };
  assert.deepEqual(Life.ties(s), [], '사장님은 처음부터 아는 사이지만 한 칸뿐이다');
  assert.equal(pick(5, G), 'soso', '일과 고양이만 지키고 가까워진 사람이 없으면 좋은 엔딩이 아니다');
  bond('grandma', 2);
  assert.equal(pick(5, G), 'both');
  assert.equal(Life.umbrellaBy(s), 'grandma');
  bond('mate', 2); bond('mom', 3);
  assert.deepEqual(Life.ties(s), ['grandma', 'mate', 'mom']);
  assert.equal(pick(5, G), 'both', '천둥 치던 밤과 서랍 속 아침도 지켜 줘야');
  s.events.push({ day: 3, key: 'curtain' }, { day: 9, key: 'drawer' });
  assert.equal(pick(5, G), 'family');
  assert.equal(Life.ending(s).grade, 'hidden');
  assert.equal(pick(4, G), 'both', '마음이 하나라도 비면 아니다');
  s.missed = 1;
  assert.equal(pick(5, G), 'both', '한 끼라도 굶기면 아니다');
  s.missed = 0;
  // 우산: 엄마는 이 동네에 없다. 가장 가까운 사람, 같으면 최근에 닿은 사람
  Life.person(s, 'grandma').last = 5; Life.person(s, 'mate').last = 9;
  assert.equal(Life.umbrellaBy(s), 'mate');
  bond('one', 3);
  assert.equal(Life.umbrellaBy(s), 'one');
  Life.person(s, 'one').near = false;
  assert.equal(Life.umbrellaBy(s), 'mate', '같은 동네에 사는 줄 모르면 그 사람은 오지 않는다');
  // 5/8에 다 갚고도 통장이 마이너스면 빚 엔딩
  s.paid = { wallet: -12000 };
  assert.equal(pick(5, G), 'debt');
  s.paid = { wallet: 3000 };
  assert.equal(pick(5, G), 'family');
  // 사람만 챙겨서는 안 된다
  assert.equal(pick(4, G - 1), 'catStays');
  assert.equal(pick(1, G - 1), 'again');
  assert.equal(pick(3, G + 1), 'soso');
  assert.equal(pick(2, 3), 'clumsy');
  assert.equal(pick(1, G + 2), 'oneBody');
  assert.equal(Life.ENDINGS.length, 9);
  assert.deepEqual(Life.ENDINGS.map(k => Life.GRADE[k]), ['hidden', 'good', 'normal', 'normal', 'normal', 'bad', 'bad', 'bad', 'bad']);
  s.missed = 4;
  assert.equal(pick(5, G), 'emptyBowl');
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

test('모래가 다 떨어지면 똥을 퍼낼 수 없고, 새 모래를 부어야 깨끗해진다', () => {
  const s = Life.create('나', '보리');
  s.litter.poop = 2; s.litter.sand = 0;
  assert.equal(Life.scoop(s).why, 'noSand');
  assert.equal(s.litter.poop, 2);
  s.pantry.sand = 1;
  assert.equal(Life.refill(s).ok, true);
  assert.equal(s.litter.poop, 0);
});

test('정장을 입고 고양이를 쓰다듬으면 정장에 털이 묻는다', () => {
  const s = Life.create('나', '보리');
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(s.fur, 0);
  Life.pet(s);
  assert.equal(s.fur, 0);                           // 후드티일 때는 괜찮다
  Life.dress(s);
  const r = Life.pet(s);
  assert.equal(r.fur, true);
  assert.equal(s.fur, 1);
});

test('일은 하나씩 늘어난다: 첫 출근 날은 털만, 4/14부터 화장실과 바닥 털, 4/16부터 먼지', () => {
  const s = Life.create('나', '보리');
  assert.deepEqual(s.floor, { fur: 0, dust: 0 });
  assert.equal(s.litter.sand, 4);
  const night = () => { Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play'); sleep(s, {}); Life.morning(s); s.phase = 'evening'; s.fed.pm = false; s.bowl = 'empty'; s.meal = 'pm'; };
  night(); // 4/13
  assert.equal(s.day, 1);
  assert.equal(s.litter.poop, 0); assert.equal(s.floor.fur, 0);
  night(); // 4/14
  assert.equal(s.litter.poop, 1); assert.equal(s.floor.fur, 1); assert.equal(s.floor.dust, 0);
  Life.scoop(s);
  night(); Life.scoop(s); night(); // 4/16
  assert.equal(s.floor.dust, 1);
  assert.equal(Life.sandLow(s), true, '모래는 4/15 무렵에야 갈 때가 된다');
});

test('둘이라서: 사진, 내 저녁, 새벽 꾹꾹이, 4/17 저녁, 4/20 알람, 4/23 자판 위의 고양이', () => {
  const s = Life.create('나', '보리');
  s.day = 1; s.phase = 'evening'; s.minute = T.homeArrive;
  // 사진은 집에서 언제든 찍는다 (장 수 제한 없음)
  assert.equal(Life.photo(s, 'sleep').ok, true);
  assert.equal(Life.photo(s, 'groom').ok, true);
  assert.equal(Life.photo(s, { kind: 'box' }).photo.kind, 'box');
  s.minute -= 3 * T.photo;
  // 차려 먹으면 그날 밤 체력이 한 칸 더 차고, 굶으면 한 칸 덜 찬다
  const m = s.minute;
  assert.equal(Life.eat(s, 'cook').ok, true);
  assert.equal(s.minute, m + T.cook);
  assert.equal(Life.eat(s, 'quick').why, 'ate');
  s.energy = 1; Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play');
  Life.toBed(s); Life.setDoor(s, false); Life.sleep(s, {});
  assert.equal(s.energy, 5);
  const h = Life.create('나', '보리'); h.day = 2; h.phase = 'evening'; h.minute = T.homeArrive; h.energy = 2;
  Life.feed(h, 'dry'); Life.water(h); Life.act(h, 'play'); Life.toBed(h); Life.setDoor(h, true); Life.sleep(h, {});
  assert.equal(h.energy, 4); // 11시 전 +3, 굶은 밤 −1 (놀이에 −0)
  // 새벽 꾹꾹이: 같이 잔 밤 중 몇 번
  assert.equal(Life.kneadNight(h), true);
  const before = h.hearts;
  Life.knead(h, 'pet');
  assert.equal(h.hearts, Math.min(5, before + 1)); assert.equal(h.energy, 3);
  Life.knead(h, 'push');
  assert.equal(h.hearts, Math.min(5, before + 1) - 1);
  // 4/17 동기들과 저녁: 소개 계약 한 건, 늦게 들어오고 오래 기다린다
  const f = Life.create('나', '보리'); f.day = 5; f.phase = 'work'; f.hearts = 5;
  assert.equal(Life.dinner(f, true).go, true);
  assert.equal(f.contracts, 1);
  Life.leaveOffice(f); Life.arriveHome(f);
  assert.equal(f.minute, T.groupHome); assert.equal(f.hearts, 2);
  // 4/20 알람: 마음이 가까우면 고양이가 깨운다
  const a = Life.create('나', '보리'); a.day = 7; a.hearts = 4; a.phase = 'evening';
  Life.toBed(a); Life.morning(a);
  assert.equal(a.day, 8); assert.equal(a.alarm, 'cat'); assert.equal(a.minute, T.wake);
  const b = Life.create('나', '보리'); b.day = 7; b.hearts = 1; b.phase = 'evening';
  Life.toBed(b); Life.morning(b);
  assert.equal(b.alarm, 'late'); assert.ok(b.minute + T.commute > T.assembly);
  // 4/21 고양이를 키우는 고객: 사진이 두 장 넘으면 이야기가 풀린다
  b.day = 9; b.photos = [{ day: 2 }, { day: 3 }];
  assert.ok(Life.plan(b, 'c10').reasons.some(r => r.key === 'photos'));
  // 4/23 자판 위의 고양이
  const e = Life.create('나', '보리'); e.day = 11; e.phase = 'evening'; e.cards = ['c15', 'c21']; e.hearts = 3;
  Life.lastPrep(e, 'work');
  assert.equal(e.prepared.c15, true); assert.equal(e.hearts, 2);
  const l = Life.create('나', '보리'); l.day = 11; l.phase = 'evening'; l.cards = ['c15', 'c21']; l.hearts = 3;
  Life.lastPrep(l, 'lid');
  assert.equal(l.hearts, 4); assert.equal(Life.doBlock(l, 'prep'), 'lid');
  global.Life = Life; const Story = require('../src/life-story.js');
  assert.ok(Story.epilogue(e)[0].indexOf('우산') >= 0, '고양이 일기는 작년 겨울 비 오던 밤부터 시작한다');
  assert.equal(Story.careNote('보리', 0).rows.length, 4);           // 첫날 메모는 네 줄
  assert.ok(Story.careNote('보리', 4).rows.length > 8);             // 날마다 한 줄씩 늘어난다
  assert.equal(Story.careFresh(2, 1), true); assert.equal(Story.careFresh(3, 2), false);
});

test('옛 저장에는 새 상태가 없어도 불러온다', () => {
  const s = Life.create('나', '보리'); delete s.photos; delete s.myMeal;
  const r = Life.load(JSON.stringify(s));
  assert.deepEqual(r.photos, []); assert.equal(r.myMeal, null);
});

test('배경음악: 곡마다 32칸이고 장소마다 곡이 있다', () => {
  const Music = require('../src/life-music.js');
  for (const [k, v] of Object.entries(Music.SONGS)) assert.equal(v.len, 32, k);
  for (const k of ['rain', 'morning', 'evening', 'weekend', 'night', 'pov', 'storm', 'train', 'office', 'consult', 'street', 'shop', 'visit']) assert.ok(Music.SONGS[k], k);
});

// ---------- v7: 위촉 첫 달, 돈, 상담 네 단계 ----------
test('4/12 일요일 저녁에 통장 38만 원으로 시작하고, 첫 달은 5/8(금)까지 4주다', () => {
  const s = Life.create('김신입', '보리');
  assert.equal(Life.day(s).date, '4/12');
  assert.equal(s.phase, 'evening');
  assert.equal(s.wallet, 380000);
  assert.equal(s.food.dry, 4);
  assert.equal(Life.DAYS.length, 27);
  assert.equal(Life.DAYS.at(-1).date, '5/8');
  assert.equal(Life.DAYS.at(-1).final, true);
  assert.equal(Life.DAYS.filter(d => d.kind === 'work').length, 19); // 5/5 어린이날은 쉰다
  assert.equal(Life.DAYS.find(d => d.date === '5/5').kind, 'off');
  assert.equal(Life.DAYS.find(d => d.date === '5/1').kind, 'work');
});

test('평일 고객은 하루 한 분(첫날만 두 분)이고, 소개받은 고객은 소개가 있어야 온다', () => {
  const s = Life.create('나', '보리');
  assert.deepEqual(Life.clientsOn(1, s), ['c1', 'c16']);
  // 4/22만 오전과 오후 두 분이다 (오후 상담을 미루고 동물병원에 갈 수 있다)
  for (let d = 2; d < Life.DAYS.length; d++) if (Life.DAYS[d].kind === 'work') assert.ok(Life.clientsOn(d, s).length <= (d === Life.VET.day ? 2 : 1), Life.DAYS[d].date);
  assert.deepEqual(Life.clientsOn(Life.VET.day, s), ['c4', 'c22']);
  // 회식 2차에서 넘겨받은 상담 신청 고객은 2차에 가야 온다
  assert.deepEqual(Life.clientsOn(15, s), ['c13']);
  s.refs.d1 = true;
  assert.deepEqual(Life.clientsOn(15, s), ['c13', 'd1']);
  assert.deepEqual(Life.clientsOn(25, s), ['c21']);
  s.refs.r1 = true;
  assert.deepEqual(Life.clientsOn(25, s), ['r1', 'c21']);
  for (const id of Object.keys(Life.CLIENTS)) {
    const c = Life.CLIENTS[id];
    assert.equal(Life.DAYS[c.day].kind, 'work', id);
    assert.ok(Life.PRODUCTS[c.product], id);
    for (const k of c.needs) assert.ok(Life.PRODUCTS[c.product].items[k], id + ' ' + k);
  }
});

test('필요한 보장만 넣으면 모든 고객이 예산 안에 들어온다', () => {
  for (const id of Object.keys(Life.CLIENTS)) {
    const c = Life.CLIENTS[id], items = Life.PRODUCTS[c.product].items, base = Life.PRODUCTS[c.product].base;
    const keys = new Set(c.needs); if (base) keys.add(base);
    const sum = [...keys].reduce((t, k) => t + items[k], 0);
    assert.ok(sum <= c.budget, id + ' ' + sum + ' > ' + c.budget);
  }
});

test('상담은 듣기, 설계하기, 청약서, 설명과 서명 순서로 흘러간다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.energy = 4;
  const p = Life.plan(s, 'c2'), st = Life.consult(p);
  assert.equal(st.stage, 'listen');
  assert.equal(st.mood, Life.SIGN_MOOD);
  assert.equal(Life.note(p, st, 'worry').ok, true);
  Life.note(p, st, 'budget'); Life.note(p, st, 'life');
  assert.equal(Life.note(p, st, 'hook').ok, false);          // 없는 말은 적을 수 없다
  Life.listened(p, st);
  assert.equal(st.stage, 'design');
  assert.equal(Life.pickProduct(p, st, 'travel').ok, true);
  Life.toggle(p, st, 'med');
  assert.equal(Life.premium(p, st), 18000);
  assert.equal(Life.submitDesign(p, st).ok, true);
  assert.equal(st.stage, 'apply');
  assert.equal(Life.apply(p, st, true).clean, true);         // 예라고 답할 게 없는 고객
  assert.equal(st.stage, 'explain');
  [0, 1, 2].forEach(i => Life.explain(p, st, i)); Life.hand(p, st);
  assert.equal(Life.sign(p, st).signed, true);
  const r = Life.finish(s, p, st);
  assert.equal(r.amount, Life.commission('travel', 18000));
  assert.equal(s.contracts, 1);
  assert.equal(s.wallet, 380000);                            // 수수료는 바로 들어오지 않는다
  assert.equal(Life.pendingTotal(s), r.amount);
});

test('엉뚱한 안내서는 기분을 깎고 두 번이면 놓친다. 걱정한 보장을 빠뜨려도 기분이 준다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.energy = 4;
  let p = Life.plan(s, 'c2'), st = Life.consult(p);
  Life.listened(p, st);
  assert.equal(Life.pickProduct(p, st, 'home').wrongProduct, true);
  assert.equal(st.mood, Life.SIGN_MOOD - 1);
  assert.equal(Life.pickProduct(p, st, 'dental').done, true);
  assert.equal(Life.finish(s, p, st).why, 'wrongProduct');
  p = Life.plan(s, 'c2'); st = Life.consult(p); Life.listened(p, st);
  Life.pickProduct(p, st, 'travel'); Life.toggle(p, st, 'luggage');
  assert.equal(Life.submitDesign(p, st).missing, 'med');
  assert.equal(st.mood, Life.SIGN_MOOD - 1);
});

test('화재보험은 화재 보장이 기본이라 끌 수 없고, 일상배상은 그 위에 붙는다', () => {
  const s = Life.create('나', '보리');
  s.day = 1; s.energy = 4;
  const p = Life.plan(s, 'c16'), st = Life.consult(p);
  Life.listened(p, st); Life.pickProduct(p, st, 'home');
  assert.equal(st.covers.fire, true);
  assert.equal(Life.toggle(p, st, 'fire').ok, false);
  Life.toggle(p, st, 'liab');
  assert.equal(Life.premium(p, st), 9000);
});

test('예산을 넘겨 권하면 그날은 계약되지만 엿새쯤 뒤 청약철회로 빠진다. 여행자보험은 그 자리에서 거절한다', () => {
  const s = Life.create('나', '보리');
  s.day = 17; s.energy = 4; s.phase = 'work';
  let p = Life.plan(s, 'c15'), st = Life.consult(p);
  Life.listened(p, st); Life.pickProduct(p, st, 'home'); Life.toggle(p, st, 'liab'); Life.toggle(p, st, 'theft');
  assert.equal(Life.submitDesign(p, st).over, true);
  assert.equal(Life.submitDesign(p, st, true).ok, true);
  Life.apply(p, st, true); [0, 1, 2].forEach(i => Life.explain(p, st, i)); Life.hand(p, st); Life.sign(p, st);
  assert.equal(Life.finish(s, p, st).signed, true);
  assert.equal(s.pending.at(-1).cancel.why, 'over');
  const day = s.pending.at(-1).cancel.day;
  s.day = day;
  const gone = Life.cancels(s);
  assert.equal(gone.length, 1);
  assert.equal(s.contracts, 0);
  assert.equal(Life.pendingTotal(s), 0);
  s.day = 2;
  p = Life.plan(s, 'c2'); st = Life.consult(p); Life.listened(p, st); Life.pickProduct(p, st, 'travel');
  ['med', 'luggage', 'delay'].forEach(k => Life.toggle(p, st, k));
  p.budget = 20000;
  assert.equal(Life.submitDesign(p, st, true).overRefused, true);
});

test('알릴 의무를 넘기면 그날 해피콜에서 취소되고 다음 날 지점장 면담이 있다. 솔직하면 그 치아만 빠지고 계약된다', () => {
  const s = Life.create('나', '보리');
  s.day = 10; s.energy = 4; s.phase = 'work';
  let r = play(s, 'c4', { hide: true });
  assert.equal(r.signed, true);
  assert.equal(s.pending.at(-1).cancel.why, 'hide');
  Life.leaveOffice(s);
  const home = Life.arriveHome(s);
  assert.equal(home.cancels.length, 1);
  assert.equal(s.contracts, 0);
  assert.equal(s.seen.bossTalk, 11);
  const t = Life.create('나', '보리');
  t.day = 10; t.energy = 4;
  r = play(t, 'c4');
  assert.equal(r.signed, true);
  assert.equal(t.pending.at(-1).cancel, null);
});

test('알리면 가입이 어려운 고객에게 솔직하면 계약은 없지만, 그 고객이 다른 사람을 소개해 준다', () => {
  const s = Life.create('나', '보리');
  s.day = 24; s.energy = 4;
  const r = play(s, 'c20');
  assert.equal(r.signed, false);
  assert.equal(r.why, 'declined');
  assert.equal(s.refs.r2, true);
  assert.deepEqual(Life.clientsOn(26, s), ['r2']);
});

test('이미 보험이 있는 고객을 갈아타게 하면 일주일쯤 뒤 승환 점검에서 취소되고, 빈 보장만 채우면 소개가 온다', () => {
  const s = Life.create('나', '보리');
  s.day = 15; s.energy = 4;
  let r = play(s, 'c13', { all: true });
  assert.equal(r.signed, true);
  assert.equal(s.pending.at(-1).cancel.why, 'switch');
  assert.equal(s.pending.at(-1).cancel.day, 22);
  assert.ok(!s.refs.r1);
  const t = Life.create('나', '보리');
  t.day = 15; t.energy = 4;
  r = play(t, 'c13');
  assert.equal(r.signed, true);
  assert.equal(t.pending.at(-1).cancel, null);
  assert.equal(t.refs.r1, true);
});

test('미루는 고객은 듣기에서 적어 둔 이유를 보여 줘야 마음을 바꾼다', () => {
  const s = Life.create('나', '보리');
  s.day = 16; s.energy = 4;
  assert.equal(play(s, 'c14', { noHook: true }).why, 'later');
  assert.equal(play(s, 'c14').signed, true);
});

test('꼼꼼한 고객에게 설명을 건너뛰면 그날 해피콜에서 철회한다', () => {
  const s = Life.create('나', '보리');
  s.day = 9; s.energy = 4;
  assert.equal(play(s, 'c9', { skip: true }).signed, true);
  assert.equal(s.pending.at(-1).cancel.why, 'unexplained');
  s.day = 8;
  assert.equal(play(s, 'c8', { skip: true }).signed, true);
  assert.equal(s.pending.at(-1).cancel, null);       // 바쁜 고객은 건너뛰어도 괜찮다
});

test('설명을 세 번 끝까지 하면 손에 익어 한 번에 짚는다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.energy = 4;
  for (let i = 0; i < 3; i++) play(s, 'c2');
  assert.equal(Life.plan(s, 'c2').quick, true);
});

test('지각하면 첫 고객은 가 버리고, 털과 냄새와 하품은 기분을 깎는다. 고양이 키우는 고객은 털을 반긴다', () => {
  const s = Life.create('나', '보리');
  s.day = 3; s.late = 5; s.energy = 4;
  const p = Life.plan(s, 'c3');
  assert.equal(p.leaves, true);
  assert.equal(Life.finish(s, p, Life.consult(p)).why, 'lateLeft');
  s.late = 0; s.fur = 1;
  assert.equal(Life.plan(s, 'c3').mood, Life.SIGN_MOOD - 1);
  s.day = 1;
  assert.deepEqual(Life.plan(s, 'c1').reasons, [{ key: 'sneeze', delta: -2 }]);
  s.day = 4;
  assert.equal(Life.plan(s, 'c10').mood, Life.SIGN_MOOD + 1);
  s.fur = 0; s.energy = 1;
  assert.ok(Life.plan(s, 'c10').reasons.some(r => r.key === 'yawn'));
  assert.equal(Life.plan(s, 'c10').blur, true);
});

test('첫날 밤 같이 자고 나간 첫 고객은 털 때문에 놓치고, 선배가 털 이야기를 꺼낸다', () => {
  const s = Life.create('나', '보리');
  Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play');
  sleep(s, { open: true });
  Life.morning(s); Life.dress(s); Life.feed(s, 'dry');
  Life.leaveHome(s);
  const r = play(s, 'c1');
  assert.equal(r.signed, false);
  assert.equal(r.why, 'sneeze');
  assert.ok(s.events.some(e => e.key === 'furLost' && e.id === 'c1'));
  s.prepared.c1 = true;
  assert.equal(play(s, 'c1').signed, true);          // 메일을 읽고 가면 버틴다
});

test('첫 주는 선배가 옆에 앉고, 시간이 없는 고객은 단계마다 12초를 기다린다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.energy = 4;
  assert.equal(Life.plan(s, 'c2').tutorial, true);
  assert.equal(Life.plan(s, 'c2').timer, 0);
  s.day = 8;
  const p = Life.plan(s, 'c8'), st = Life.consult(p);
  assert.equal(p.tutorial, false);
  assert.equal(p.timer, 12);
  Life.timeout(p, st); Life.timeout(p, st);
  assert.equal(st.done, true);
  assert.equal(Life.finish(s, p, st).why, 'slow');
});

test('안내서는 주마다 늘어난다: 첫날 치아와 화재, 4/14 여행자, 4/15 운전자, 4/16 펫', () => {
  const s = Life.create('나', '보리');
  s.day = 1; assert.deepEqual(Life.plan(s, 'c1').kinds, ['dental', 'home']);
  s.day = 4; assert.deepEqual(Life.plan(s, 'c10').kinds, ['dental', 'home', 'travel', 'car', 'pet']);
  s.day = 17; assert.ok(Life.plan(s, 'c6').kinds.includes('group'));
});

test('요금 안내는 이틀 전에 휴대폰으로 오고, 내는 날 빠져나가거나 보내고, 월세는 5/8까지 미루거나, 현금서비스를 받는다', () => {
  const s = Life.create('나', '보리');
  Life.toBed(s); Life.sleep(s);
  const m = Life.morning(s);
  assert.deepEqual(m.notices, ['phone']);
  assert.equal(Life.billsUp(s)[0].id, 'phone');
  s.day = 3;
  assert.equal(Life.billDue(s).id, 'phone');
  assert.equal(Life.payBill(s, 'phone', 'defer').why, 'noDefer');
  assert.equal(Life.payBill(s, 'phone', 'pay').ok, true);
  assert.equal(s.wallet, 380000 - 55000);
  s.day = 15; s.wallet = 100000;
  assert.equal(Life.payBill(s, 'rent', 'pay').why, 'money');
  assert.equal(Life.payBill(s, 'rent', 'defer').ok, true);
  assert.equal(s.bills.rent, 'deferred');
  s.day = 18; s.wallet = 50000;
  assert.equal(Life.payBill(s, 'loan', 'cash').ok, true);
  assert.equal(s.wallet, 50000 + 300000 - 120000);
  assert.equal(Life.canCash(s), false);
});

test('5/8에 4월 수수료와 정착지원금이 3.3%를 떼고 들어오고, 미룬 월세와 현금서비스를 이자와 함께 갚는다', () => {
  const s = Life.create('나', '보리');
  s.pending = [{ id: 'x', amount: 400000, status: 'active' }, { id: 'y', amount: 99999, status: 'cancelled' }];
  s.contracts = Life.GOAL;
  s.bills.rent = 'deferred';
  s.loan = { amount: 300000, day: 18 };
  s.day = 26; s.wallet = 10000;
  const p = Life.payday(s);
  assert.equal(p.gross, 400000);
  assert.equal(p.settle, Life.SETTLE);
  assert.equal(p.tax, Math.floor(900000 * 0.033 / 10) * 10);
  const interest = Math.round(300000 * 0.18 * 8 / 365 / 10) * 10;
  assert.equal(p.out[0].interest, interest);
  assert.equal(s.wallet, 10000 + 900000 - p.tax - 300000 - interest - 480000);
  assert.equal(s.bills.rent, 'paid');
  const t = Life.create('나', '보리');
  t.contracts = Life.GOAL - 1;
  assert.equal(Life.payday(t).settle, 0);
  // 자동이체가 빠져나가지 못해 연체된 요금은 5/8에 연체료를 더해 낸다
  const u = Life.create('나', '보리');
  u.day = 3; assert.equal(Life.bill('phone').auto, true);
  assert.equal(Life.lateBill(u, 'phone'), true);
  u.day = 26; u.wallet = 0;
  const q = Life.payday(u);
  assert.equal(q.out[0].amount, 55000 + Life.bill('phone').lateFee);
  assert.equal(q.out[0].late, true);
  assert.equal(u.bills.phone, 'paid');
});

test('주말 알바: 네 시간, 41,280원(최저시급), 체력 3칸, 마음 1칸', () => {
  const s = Life.create('나', '보리');
  assert.equal(Life.jobBlock(s), 'notWeekend');
  s.day = 6; s.phase = 'weekend'; s.minute = T.weekendStart; s.energy = 4; s.meal = 'am'; s.fed = { am: true, pm: false };
  const w = s.wallet, h = s.hearts;
  assert.equal(Life.sideJob(s).ok, true);
  assert.equal(s.wallet, w + 41280);
  assert.equal(s.energy, 1);
  assert.equal(s.hearts, h - 1);
});

test('밤 11시가 넘으면 슈퍼 물건값이 심야 할증으로 1.5배가 되고, 방금 담은 것은 되돌릴 수 있다', () => {
  const s = Life.create('나', '보리');
  assert.equal(Life.price(s, 'dry'), 12000);
  Life.buy(s, 'dry');
  assert.equal(s.wallet, 380000 - 12000);
  assert.equal(Life.unbuy(s, 'dry').ok, true);
  assert.equal(s.wallet, 380000);
  s.minute = T.bedtime;
  assert.equal(Life.price(s, 'dry'), 18000);
  s.wallet = 10000;
  assert.equal(Life.buyBlock(s, 'dry'), 'money');
});

test('4/29 야근: 남아서 저녁 8시 단체보험 상담을 하면 늦게 들어오고, 고양이는 현관에서 기다리다 잠든다', () => {
  const s = Life.create('나', '보리');
  s.day = 17; s.phase = 'work'; s.energy = 5; s.hearts = 5;
  assert.equal(Life.day(s).overtime, true);
  Life.decideGroup(s, true);
  assert.equal(play(s, 'c6').signed, true);
  Life.leaveOffice(s);
  Life.arriveHome(s);
  assert.equal(s.minute, T.groupHome);
  assert.equal(s.hearts, 2);
  assert.ok(s.events.some(e => e.key === 'waitedAsleep'));
});

test('성실한 한 달: 정직하게 상담하면 기준을 넘기고, 5/8 전에는 통장이 바닥 가까이 내려간다', () => {
  const { s, min } = month({ buy: sensibleBuy });
  assert.equal(s.ended, 'evaluation');
  assert.ok(s.contracts >= Life.GOAL, 'contracts ' + s.contracts);
  assert.ok(min < 60000, '가장 적을 때 ' + min);
  assert.equal(s.missed, 0);
  assert.ok(s.paid.net > 500000);
  assert.equal(s.ledger.length, 27);
});

test('무리하게 권하는 한 달(예산 넘기기, 알릴 의무 넘기기)은 취소가 쌓여 기준을 못 넘긴다', () => {
  const { s } = month({ buy: sensibleBuy, greedy: true });
  assert.ok(s.contracts < Life.GOAL, 'contracts ' + s.contracts);
  assert.ok(s.pending.filter(e => e.status === 'cancelled').length >= 5);
});

test('밥 두 끼, 물, 화장실을 다 챙긴 날이 사흘이면 손에 익어 그릇 한 번으로 챙긴다', () => {
  const s = Life.create('나', '보리');
  for (let i = 0; i < 3; i++) {
    assert.equal(Life.habitReady(s), false);
    s.fed = { am: true, pm: true }; s.water = true; s.litter.poop = 0;
    Life.toBed(s); Life.sleep(s); Life.morning(s);
  }
  assert.equal(Life.habitReady(s), true);
});

// ---------- v7 2단계: 동네 사람들 ----------
test('사람: 손을 내밀면 창문이 켜지고, 가까워지면 환해진다. 사장님은 처음부터 아는 사이', () => {
  const s = Life.create('나', '보리');
  assert.equal(Life.windowOf(s, 'grandma'), 0);
  assert.equal(Life.windowOf(s, 'boss'), 1);
  assert.equal(Life.litWindows(s), 1);
  s.day = 2; s.phase = 'evening'; s.minute = 1200;
  const r = Life.reach(s, 'bow');
  assert.equal(r.ok, true); assert.equal(r.first, true); assert.equal(r.minutes, 10);
  assert.equal(Life.windowOf(s, 'grandma'), 1);
  assert.equal(Life.reach(s, 'parcel').why, 'today'); // 같은 사람에게는 하루 한 번
  s.day = 4;
  assert.equal(Life.reach(s, 'parcel').ok, true);
  assert.equal(Life.windowOf(s, 'grandma'), 2);
  s.day = 5; assert.equal(Life.reachBlock(s, 'visit'), 'soon'); // 찾아가 인사드리기는 마지막으로 본 날부터 사흘 뒤에
  s.day = 7; assert.equal(Life.reachBlock(s, 'visit'), null);
});

test('사람: 점심은 9,000원이 들고, 돈이 모자라면 못 간다', () => {
  const s = Life.create('나', '보리');
  s.day = 3; s.wallet = 8000;
  assert.equal(Life.reach(s, 'lunch').why, 'money');
  s.wallet = 20000;
  assert.equal(Life.reach(s, 'lunch').ok, true);
  assert.equal(s.wallet, 11000);
  assert.equal(Life.person(s, 'mate').bond, 1);
});

test('부탁: 열쇠를 맡긴 할머니만 고양이 밥을 챙겨 줄 수 있고, 늦은 밤 밥그릇이 채워져 있다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; Life.reach(s, 'bow');
  assert.deepEqual(Life.helpers(s, 'cat'), []);
  assert.equal(Life.giveKey(s).ok, false); // 아직 가까운 사이가 아니다
  s.day = 4; Life.reach(s, 'parcel');
  assert.equal(Life.giveKey(s).ok, true);
  assert.deepEqual(Life.helpers(s, 'cat'), ['grandma']);
  // 4/17 동기들과 저녁에 가는 날
  s.day = 5; s.phase = 'work'; s.fed = { am: true, pm: false };
  Life.dinner(s, true);
  assert.equal(Life.ask(s, 'cat', 'grandma').ok, true);
  assert.deepEqual(Life.helpers(s, 'cat'), []); // 빚을 진 사람에게는 다시 부탁하지 못한다
  const food = s.food.dry, hearts = s.hearts;
  Life.leaveOffice(s);
  const a = Life.arriveHome(s);
  assert.equal(a.helper.who, 'grandma');
  assert.equal(s.fed.pm, true); assert.equal(s.water, true); assert.equal(s.food.dry, food - 1);
  assert.equal(s.hearts, hearts - 2); // 혼자 보낸 낮(−2)만 있고, 늦게 와서 깎이는 마음은 없다
});

test('부탁: 갚지 않고 이레가 지나면 한 칸 멀어지고, 다시 손을 내밀면 갚아진다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; Life.reach(s, 'bow'); s.day = 4; Life.reach(s, 'parcel'); Life.giveKey(s);
  s.day = 5; Life.ask(s, 'cat', 'grandma');
  s.day = 9; Life.reach(s, 'visit');
  assert.equal(Life.person(s, 'grandma').owe, null);
  assert.equal(Life.person(s, 'grandma').bond, 3);
  s.day = 10; Life.ask(s, 'cat', 'grandma');
  s.day = 16; assert.deepEqual(Life.drift(s), []);
  s.day = 17; assert.deepEqual(Life.drift(s), ['grandma']);
  assert.equal(Life.person(s, 'grandma').bond, 2);
  assert.equal(Life.person(s, 'grandma').owe, null);
});

test('부탁: 동기가 늦은 아침 첫 고객님을 붙잡아 주고, 야근을 나눠 하면 한 시간 일찍 들어온다', () => {
  const s = Life.create('나', '보리');
  s.day = 1; Life.reach(s, 'talk');
  s.day = 8; s.phase = 'morning'; s.minute = T.leaveBy + 30; s.wearing = 'suit';
  Life.leaveHome(s);
  assert.ok(s.late > 0);
  assert.equal(Life.plan(s, Life.clientsOn(8, s)[0]).leaves, true);
  assert.equal(Life.ask(s, 'cover', 'mate').ok, true);
  assert.ok(!Life.plan(s, Life.clientsOn(8, s)[0]).leaves);
  // 4/29 야근
  const t = Life.create('나', '보리');
  t.day = 15; Life.reach(t, 'lunch'); t.day = 16; Life.reach(t, 'refer');
  t.day = 17; t.phase = 'work';
  Life.decideGroup(t, true);
  assert.deepEqual(Life.helpers(t, 'work'), ['mate']);
  Life.ask(t, 'work', 'mate');
  Life.leaveOffice(t); Life.arriveHome(t);
  assert.equal(t.minute, T.groupHome - Life.WORK_HELP);
});

test('부탁: 동기에게 고객 한 분을 넘기면 그날 그 고객은 오지 않는다', () => {
  const s = Life.create('나', '보리');
  s.day = 15;
  const next = Life.clientsOn(16, s)[0];
  s.gave = next; Life.reach(s, 'refer');
  assert.equal(Life.clientsOn(16, s).includes(next), false);
  assert.equal(Life.person(s, 'mate').bond, 2);
});

test('부탁: 사장님께 10만 원을 빌리면 5/8에 갚는다. 주말 일손을 도우면 가까워진다', () => {
  const s = Life.create('나', '보리');
  assert.deepEqual(Life.helpers(s, 'money'), []);
  s.day = 6; s.phase = 'weekend'; s.minute = T.weekendStart; s.energy = 4; s.meal = 'am'; s.fed = { am: true, pm: false };
  Life.sideJob(s);
  assert.equal(Life.person(s, 'boss').bond, 2);
  s.day = 15; s.wallet = 100000;
  const r = Life.ask(s, 'money', 'boss');
  assert.equal(r.amount, 100000); assert.equal(s.wallet, 200000);
  assert.equal(Life.payBill(s, 'rent', 'pay').why, 'money');
  s.day = 26; s.wallet = 0; s.contracts = 0;
  const p = Life.payday(s);
  assert.equal(p.out.find(o => o.key === 'borrow').amount, 100000);
  assert.equal(s.borrowed.back, true);
});

test('엄마: 첫 답장은 사진, 보낸 날마다 가까워지고, 반찬 택배는 이틀 뒤', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.phase = 'evening'; s.minute = T.homeArrive;
  assert.equal(Life.person(s, 'mom').met, true);
  assert.equal(Life.person(s, 'mom').bond, 0);
  assert.equal(Life.litWindows(s), 1, '엄마는 동네 지도의 창문에 들지 않는다 (사장님만 켜져 있다)');
  const a = Life.photo(s, { kind: 'cat' }), b = Life.photo(s, { kind: 'cat' });
  assert.notEqual(a.id, b.id);
  let r = Life.sendPhoto(s, a.id, 'mom');
  assert.equal(r.up, true); assert.equal(r.first, true); assert.equal(Life.person(s, 'mom').bond, 1);
  r = Life.sendPhoto(s, b.id, 'mom');
  assert.equal(r.up, false, '같은 날 두 장째는 더 가까워지지 않는다');
  assert.deepEqual(s.photos[0].to, ['mom']);
  s.day = 3;
  r = Life.sendPhoto(s, a.id, 'mom');
  assert.equal(r.up, true); assert.equal(r.days, 2); assert.equal(Life.person(s, 'mom').bond, 2);
  // 동기에게는 첫 한 장만 손을 내민 것으로 센다
  Life.reach(s, 'talk');
  const m0 = Life.person(s, 'mate').bond;
  assert.equal(Life.sendPhoto(s, a.id, 'mate').up, true);
  s.day = 4;
  assert.equal(Life.sendPhoto(s, b.id, 'mate').up, false);
  assert.equal(Life.person(s, 'mate').bond, m0 + 1);
  // 반찬 택배: 이틀 뒤에 열 수 있고, 저녁 네 끼가 생긴다. 빈 상자가 남는다.
  // 4/16(목)에 부치면 이틀 뒤는 토요일이라 다음 출근날인 4/20(월)에 온다.
  assert.equal(Life.momSend(s), 8);
  assert.equal(Life.momSend(s), null, '한 번만 부친다');
  assert.equal(Life.momOpen(s).ok, false);
  s.day = 8;
  assert.equal(Life.momOpen(s).ok, true);
  assert.equal(s.mom.food, Life.MOM_FOOD); assert.equal(s.box, 8);
  s.myMeal = null;
  assert.equal(Life.eat(s, 'mom').ok, true);
  assert.equal(s.mom.food, Life.MOM_FOOD - 1);
  assert.equal(s.cooked, true);
});

test('엄마와 닿는 갈래: 사진, 통화, 답장은 같은 날 갈래마다 한 번씩만 센다', () => {
  const s = Life.create('나', '보리');
  s.day = 1; s.phase = 'evening'; s.minute = T.homeArrive;
  const a = Life.photo(s, { kind: 'cat' });
  Life.sendPhoto(s, a.id, 'mom');
  assert.equal(Life.momBond(s), 1);
  let r = Life.momTouch(s, 'answer');
  assert.equal(r.up, true); assert.equal(Life.momBond(s), 2); assert.equal(r.minutes > 0, true);
  assert.equal(s.mom.called, true);
  r = Life.momTouch(s, 'call');
  assert.equal(r.up, false, '같은 날 두 번째 통화는 더 가까워지지 않는다');
  Life.momTouch(s, 'reply');
  assert.equal(Life.momBond(s), 3);
  s.day = 2; Life.momTouch(s, 'call');
  assert.equal(Life.momBond(s), 3, '세 칸이 끝이다');
  // 5/8까지 오지 못하는 택배는 부치지 않는다
  const t = Life.create('나', '보리'); t.day = 24;
  assert.equal(Life.momSend(t), null);
});

test('현금서비스는 은행 앱에서 한 번만, 요금이 모자랄 때도 같은 돈이다', () => {
  const s = Life.create('나', '보리');
  const w = s.wallet;
  assert.equal(Life.cashService(s).ok, true);
  assert.equal(s.wallet, w + Life.CASH.amount);
  assert.equal(Life.canCash(s), false);
  assert.equal(Life.cashService(s).ok, false);
  // 이미 받은 돈으로 요금을 낼 수 있으면 'cash'로 골라도 그냥 낸다
  s.day = 3;
  const r = Life.payBill(s, 'phone', 'cash');
  assert.equal(r.ok, true);
});

test('옛 v7 저장에 엄마와 사진 칸이 없어도 불러온다', () => {
  const s = Life.create('나', '보리');
  delete s.mom; delete s.people.mom; delete s.sent; s.photos = [{ day: 1, pose: 'sit' }]; delete s.photoSeq;
  const t = Life.load(Life.save(s));
  assert.ok(t.mom); assert.ok(t.people.mom); assert.deepEqual(t.sent, []);
  assert.equal(t.photos[0].id, 'p1'); assert.deepEqual(t.photos[0].to, []);
  assert.equal(Life.photo(Object.assign(t, { day: 1, phase: 'evening', minute: T.homeArrive }), {}).id, 'p2');
});

test('동물병원: 4/22부터 갈 수 있고, 통장이 모자라면 신용카드로 긁어 5/8에 갚는다. 다음 날 가면 더 든다', () => {
  const s = Life.create('나', '보리');
  s.day = 9; s.phase = 'evening'; s.minute = T.homeArrive;
  assert.equal(Life.treat(s, 'eve').ok, false, '4/21에는 아직 모른다');
  s.day = 10;
  assert.equal(Life.vetDue(s), true);
  s.wallet = 200000;
  let r = Life.treat(s, 'eve');
  assert.equal(r.ok, true); assert.equal(r.amount, Life.VET.bill); assert.equal(r.card, false);
  assert.equal(s.wallet, 200000 - Life.VET.bill);
  assert.equal(Life.treat(s, 'eve').ok, false, '한 번만 간다');
  assert.equal(Life.vetDue(s), false);
  // 약은 그날부터 닷새
  assert.equal(Life.onMed(s), true); s.day = 14; assert.equal(Life.onMed(s), true); s.day = 15; assert.equal(Life.onMed(s), false);
  // 다음 날 아침에 가면 수액이 붙고, 통장이 모자라면 카드
  const t = Life.create('나', '보리');
  t.day = 11; t.phase = 'commute'; t.minute = T.leaveBy; t.wallet = 50000;
  r = Life.treat(t, 'next');
  assert.equal(r.amount, Life.VET.worse); assert.equal(r.card, true);
  assert.equal(t.wallet, 50000, '통장은 그대로');
  assert.equal(t.card.amount, Life.VET.worse);
  assert.equal(t.vet.med, 11 + Life.VET.med - 1);
  t.day = Life.DAYS.length - 1;
  const p = Life.payday(t);
  assert.ok(p.out.some(o => o.key === 'card' && o.amount === Life.VET.worse));
  assert.equal(t.card.back, true);
});

test('4/22 오후 상담을 미루면 그 고객님은 미룬 것으로 남는다', () => {
  const s = Life.create('나', '보리');
  s.day = 10;
  assert.deepEqual(Life.clientsOn(10, s), ['c4', 'c22']);
  Life.postpone(s, 'c22');
  assert.equal(s.postponed.c22, 10);
  assert.ok(s.events.some(e => e.key === 'postponed'));
});

test('회식: 1차는 누구나, 2차 회비 2만 원은 통장에서만 나간다. 2차에 가면 동기와 가까워지고 고객을 넘겨받는다', () => {
  const s = Life.create('나', '보리');
  s.day = 11;
  assert.equal(Life.hoesik(s, 1), null, '회식 날이 아니다');
  s.day = Life.HOESIK.day; s.phase = 'commute';
  assert.equal(Life.hoesik(s, 1).stage, 1);
  assert.equal(Life.hoesik(s, 1), null, '1차는 한 번');
  s.wallet = 15000;
  let r = Life.hoesik(s, 2);
  assert.equal(r.ok, false); assert.equal(r.why, 'money');
  assert.equal(s.out, 'hoesik'); assert.equal(s.wallet, 15000);
  assert.ok(!s.card || !s.card.amount, '카드로는 못 낸다');
  s.wallet = 50000;
  const m = Life.person(s, 'mate'); m.met = true; const b0 = m.bond;
  r = Life.hoesik(s, 2);
  assert.equal(r.ok, true); assert.equal(r.mate, true);
  assert.equal(s.wallet, 50000 - Life.HOESIK.second);
  assert.equal(m.bond, b0 + 1);
  assert.equal(s.refs.d1, true);
  assert.equal(s.minute, Life.HOESIK.leave2);
  assert.equal(Life.hoesik(s, 2), null, '2차도 한 번');
});

test('결혼식 축의금: 봉투는 현금이라 통장이 모자라면 현금서비스를 받고, 그마저 썼으면 못 낸다', () => {
  const s = Life.create('나', '보리');
  s.day = Life.WEDDING.day; s.phase = 'weekend'; s.minute = 600;
  Life.wedAnswer(s, true);
  s.wallet = 20000;
  let r = Life.wedGift(s, 50000, 'cash');
  assert.equal(r.ok, true); assert.equal(r.cashed, true);
  assert.equal(s.wallet, 20000 + Life.CASH.amount - 50000);
  assert.equal(Life.wedGift(s, 50000, 'cash').ok, false, '한 번만 낸다');
  const t = Life.create('나', '보리');
  t.day = Life.WEDDING.ask; t.phase = 'evening'; t.minute = T.homeArrive;
  Life.cashService(t); t.wallet = 10000;
  r = Life.wedGift(t, 50000, 'send');
  assert.equal(r.ok, false); assert.equal(r.why, 'money');
  assert.equal(t.wed.gift, 0);
  Life.wedGo(s);
  assert.equal(s.wed.went, true);
  assert.equal(s.minute >= Life.WEDDING.back, true);
});

test('그 사람: 같은 일은 한 번만 세고, 사진 보여 주기, 이동장 맡아 주기, 공원, 영화가 한 칸씩이다', () => {
  const s = Life.create('나', '보리');
  s.day = 4;
  const p = Life.person(s, 'one');
  assert.equal(p.met, false);
  assert.equal(Life.oneMeet(s, 'client').first, true);
  assert.equal(Life.oneBond(s), 0);
  assert.equal(Life.oneMeet(s, 'show').bond, 1);
  assert.equal(Life.oneMeet(s, 'show').ok, false);
  s.day = 10;
  Life.oneMeet(s, 'carrier'); Life.oneMeet(s, 'vet');
  assert.equal(Life.oneBond(s), 2); assert.equal(p.near, true);
  s.day = 14; Life.oneMeet(s, 'park');
  s.day = 20; Life.oneMeet(s, 'date');
  assert.equal(Life.oneBond(s), 3, '세 칸이 끝이다');
  s.day = 23; Life.oneMeet(s, 'visit');
  assert.equal(p.key, true);
  assert.equal(Life.oneMeet(s, 'nope').ok, false);
});

test('약속: 냉장고 달력에 붙고, 한 시간 전부터 30분 뒤까지 갈 수 있고, 지나면 놓친다', () => {
  const s = Life.create('나', '보리');
  s.day = 14; s.phase = 'weekend'; s.minute = 600;
  Life.addAppt(s, 'park', 14, Life.DATE.park, 'park');
  Life.addAppt(s, 'park', 14, Life.DATE.park, 'park');
  assert.equal(s.appts.length, 1, '같은 약속은 하나');
  assert.equal(Life.apptNow(s), null);
  s.minute = Life.DATE.park - 60; assert.equal(Life.apptNow(s).key, 'park');
  s.minute = Life.DATE.park + 30; assert.equal(Life.apptNow(s).key, 'park');
  assert.equal(Life.apptMissed(s).length, 0);
  s.minute = Life.DATE.park + 31; assert.equal(Life.apptNow(s), null);
  assert.equal(Life.apptMissed(s).length, 1);
  Life.apptDone(s, 'park', 'missed');
  assert.equal(Life.apptMissed(s).length, 0);
  // 집에 오는 약속은 놓치는 약속으로 세지 않는다
  Life.addAppt(s, 'visit', 14, 600, 'home');
  assert.equal(Life.apptMissed(s).length, 0);
});

test('그 사람과 나간 쉬는 날은 고양이가 혼자다. 처음 온 손님에게 다가가면 한 칸', () => {
  const s = Life.create('나', '보리');
  s.day = 20; s.phase = 'weekend'; s.minute = 600; s.hearts = 3;
  Life.dateOut(s, false); assert.equal(s.hearts, 2);
  Life.dateOut(s, true); assert.equal(s.hearts, 0);
  Life.visitOk(s); assert.equal(s.hearts, 1);
});
