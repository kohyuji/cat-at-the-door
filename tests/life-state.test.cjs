const test = require('node:test');
const assert = require('node:assert/strict');
const Life = require('../src/life-state.js');
const T = Life.T;

// 상담을 끝까지 해낸다. 틀린 횟수를 주면 그만큼 먼저 엉뚱한 것을 건넨다.
// hesitate: 메일을 안 읽은 고객 앞에서는 말을 알아듣느라 한 번 머뭇거린다.
function play(s, id, mistakes = 0, hesitate = false) {
  const p = Life.plan(s, id), st = Life.consult(p);
  if (hesitate && !p.prepared) Life.timeout(p, st);
  for (let i = 0; i < mistakes && !st.done; i++) Life.answer(p, st, 'nothing');
  while (!st.done) Life.answer(p, st, Life.wants(p, st));
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
  for (const id of Life.clientsOn(s.day)) play(s, id, o.mistakes || 0, o.hesitate);
  if (Life.day(s).group) { Life.decideGroup(s, !!o.group); if (o.group) play(s, 'c6', o.mistakes || 0, o.hesitate); }
  if (Life.day(s).final) return Life.evaluate(s);
  Life.leaveOffice(s);
  for (const item of o.buy ? o.buy(s) : []) Life.buy(s, item);
  Life.arriveHome(s);
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
function twelveDays(o = {}) {
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

test('4/12 일요일 저녁 7시, 지갑 2만 원과 사료 반 봉지로 시작한다', () => {
  const s = Life.create('김신입', '보리');
  assert.equal(Life.day(s).date, '4/12');
  assert.equal(s.phase, 'evening');
  assert.equal(s.minute, T.homeArrive);
  assert.equal(s.wallet, 20000);
  assert.equal(s.food.dry, 4);
  assert.deepEqual(s.cards, []);
  assert.equal(Life.DAYS.length, 13);
  assert.equal(Life.DAYS[12].date, '4/24');
});

test('고객은 평일 열흘 동안 날마다 두 분(오전, 오후)과 저녁 8시 단체 고객까지 모두 21명이다', () => {
  const ids = Object.keys(Life.CLIENTS);
  assert.equal(ids.length, 21);
  assert.deepEqual(Life.clientsOn(1), ['c1', 'c16']);
  let weekdays = 0;
  for (let d = 0; d < Life.DAYS.length; d++) if (Life.DAYS[d].kind === 'work') { weekdays++; assert.equal(Life.clientsOn(d).length, 2, Life.DAYS[d].date); }
  assert.equal(weekdays, 10);
  assert.equal(Life.clientsOn(9)[0], 'c10');
  assert.equal(Life.CLIENTS.c10.mark, 'clock');
  assert.equal(Life.CLIENTS.c1.mark, 'sneeze');
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

test('지각하면 첫 고객은 기다리다 가 버리고, 다음 고객은 그대로 만난다', () => {
  const s = Life.create('나', '보리');
  s.day = 3; s.late = 5; s.energy = 4;
  const p = Life.plan(s, 'c3');
  assert.equal(p.leaves, true);
  const r = Life.finish(s, p, Life.consult(p));
  assert.equal(r.signed, false);
  assert.equal(r.why, 'lateLeft');
  const q = Life.plan(s, 'c4');
  assert.equal(q.leaves, false);
  assert.equal(q.mood, 1);
  s.day = 9;
  const b = Life.plan(s, 'c10');
  assert.equal(b.leaves, true);
  assert.equal(Life.finish(s, b, Life.consult(b)).why, 'busyLeft');
});

test('정장의 털은 고객 메모에 따라 독도 되고 득도 된다', () => {
  const s = Life.create('나', '보리');
  s.fur = 1; s.day = 3; s.energy = 4;
  assert.equal(Life.plan(s, 'c3').mood, 0);          // 보통 고객: 한 칸 낮게
  assert.deepEqual(Life.plan(s, 'c4').reasons, [{ key: 'sneeze', delta: -2 }]); // 털 알레르기: 두 칸 낮게
  s.day = 5;
  const cat = Life.plan(s, 'c7');
  assert.equal(cat.mood, 2);                         // 고양이를 키우는 고객: 반가워한다
  assert.ok(cat.steps.includes('pet'));
  s.fur = 0;
  assert.ok(!Life.plan(s, 'c7').steps.includes('pet'));
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

test('첫날 밤 같이 자고 나간 첫 고객은 털 때문에 꼭 놓치고, 그 일로 선배가 털 이야기를 꺼낸다', () => {
  const s = Life.create('나', '보리');
  Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play');
  sleep(s, { open: true });
  Life.morning(s); Life.dress(s); Life.feed(s, 'dry');
  assert.equal(s.fur, 1);
  Life.leaveHome(s);
  const r = play(s, 'c1');
  assert.equal(r.signed, false);
  assert.equal(r.why, 'sneeze');
  assert.ok(s.events.some(e => e.key === 'furLost' && e.id === 'c1'));
  // 같은 이야기는 두 번 하지 않는다
  s.day = 3;
  play(s, 'c4');
  assert.equal(s.events.filter(e => e.key === 'furLost').length, 1);
});

test('털 알레르기 고객 앞에 털 묻은 정장이면 메일을 읽고 가도 계약하지 않는다', () => {
  const s = Life.create('나', '보리');
  s.fur = 2; s.day = 3; s.energy = 4; s.prepared.c4 = true;
  assert.equal(play(s, 'c4').signed, false);
  assert.equal(s.results.at(-1).why, 'sneeze');
  s.fur = 0;
  assert.equal(play(s, 'c4').signed, true);
});

test('메일을 안 읽고 가면 여유가 없고, 읽고 가면 털이나 머뭇거림 하나는 버틴다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.energy = 4;
  assert.equal(Life.plan(s, 'c2').mood, 1);
  assert.equal(play(s, 'c2').signed, true);              // 안 읽어도 막힘없이 하면 계약
  assert.equal(play(s, 'c2', 0, true).signed, false);    // 한 번 머뭇거리면 놓친다
  s.fur = 1;
  assert.equal(play(s, 'c2').signed, false);             // 털이 묻어도 놓친다
  s.prepared.c2 = true;
  assert.equal(Life.plan(s, 'c2').mood, 1);
  assert.equal(play(s, 'c2').signed, true);              // 읽고 가면 털이 있어도 계약
  s.fur = 0;
  const p = Life.plan(s, 'c2'), st = Life.consult(p);
  Life.timeout(p, st);
  while (!st.done) Life.answer(p, st, Life.wants(p, st));
  assert.equal(Life.finish(s, p, st).signed, true);      // 읽고 가면 한 번 머뭇거려도 계약
});

test('엉뚱한 안내서를 건네면 기분이 한 칸 내려가고 고객이 다시 말해 준다. 두 번이면 그 자리에서 놓친다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.energy = 4; s.prepared.c2 = true;
  let p = Life.plan(s, 'c2'), st = Life.consult(p);
  const wrong = Life.answer(p, st, 'car');
  assert.equal(wrong.ok, false);
  assert.equal(wrong.done, false);
  assert.equal(wrong.clue, true);
  assert.equal(st.mood, p.mood - 1);
  assert.equal(st.clue, 0);                               // 지금 차례(need)를 더 분명하게 말해 준다
  const again = Life.answer(p, st, 'home');
  assert.equal(again.done, true);
  assert.equal(Life.answer(p, st, 'travel').done, true);  // 끝난 상담에는 더 건넬 수 없다
  let r = Life.finish(s, p, st);
  assert.equal(r.signed, false);
  assert.equal(r.why, 'mistake');
  // 메일을 읽고 갔으면 한 번 틀려도 계약까지 간다. 안 읽었으면 한 번에 놓친다.
  assert.equal(play(s, 'c2', 1).signed, true);
  s.prepared.c2 = false;
  assert.equal(play(s, 'c2', 1).signed, false);
  assert.equal(play(s, 'c2').signed, true);
});

test('오래 머뭇거리면 기분이 한 칸씩 내려가고, 메일을 읽었어도 두 번이면 놓친다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.energy = 4; s.prepared.c2 = true; s.seen.consulted = true;
  assert.equal(Life.plan(s, 'c2').timer, 5);
  s.day = 5;
  assert.equal(Life.plan(s, 'c8').timer, 3.5);           // 바쁜 고객은 더 짧게 기다린다
  s.day = 2;
  const p = Life.plan(s, 'c2'), st = Life.consult(p);
  Life.timeout(p, st); Life.timeout(p, st);
  while (!st.done) Life.answer(p, st, Life.wants(p, st));
  const r = Life.finish(s, p, st);
  assert.equal(r.signed, false);
  assert.equal(r.why, 'slow');
});

test('체력이 낮으면 안내서가 흐려지고 0칸이면 깜빡이며 하품을 한다. 커피는 한 칸을 채운다', () => {
  const s = Life.create('나', '보리');
  s.day = 2;
  s.energy = 3; let p = Life.plan(s, 'c2'); assert.equal(p.blur, false); assert.equal(p.blink, false);
  s.energy = 2; p = Life.plan(s, 'c2'); assert.equal(p.blur, true);
  s.energy = 1; p = Life.plan(s, 'c2'); assert.equal(p.blur, true); assert.equal(p.mood, 0);
  s.energy = 0; p = Life.plan(s, 'c2'); assert.equal(p.blink, true);
  s.pantry.coffee = 1; s.phase = 'morning';
  assert.equal(Life.coffee(s).ok, true);
  assert.equal(s.energy, 1);
  assert.equal(Life.coffee(s).why, 'already');
});

test('고양이를 키우는 고객이 털을 보고 웃으면 펫보험까지 두 건이 붙는다', () => {
  const s = Life.create('나', '보리');
  s.day = 5; s.fur = 1; s.energy = 4;
  const r = play(s, 'c7');
  assert.equal(r.signed, true);
  assert.equal(r.pet, true);
  assert.equal(r.pay, Life.PRODUCTS.home.pay + Life.PRODUCTS.pet.pay);
  assert.equal(s.contracts, 2);
});

test('목표 건수를 채우면 목표 달성으로 남기고, 그 뒤 계약은 성과급 1.5배다', () => {
  const s = Life.create('나', '보리');
  s.day = 9; s.phase = 'work'; s.energy = 4; s.contracts = Life.GOAL - 1;
  const a = play(s, 'c11');
  assert.equal(a.goal, true);
  assert.equal(a.bonus, false);
  assert.equal(a.pay, Life.PRODUCTS.home.pay);
  assert.equal(s.goalDay, 9);
  assert.ok(s.events.some(e => e.key === 'goal'));
  const b = play(s, 'c10');
  assert.equal(b.goal, false);
  assert.equal(b.bonus, true);
  assert.equal(b.pay, Life.PRODUCTS.dental.pay * Life.BONUS);
  Life.leaveOffice(s);
  assert.ok(s.today.earned.some(e => e.key === 'contract' && e.bonus));
});

test('지점을 나설 때 활동비와 수당이 들어오고 체력이 두 칸 줄며, 내일 고객 메모가 메일로 온다', () => {
  const s = Life.create('나', '보리');
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  Life.dress(s); Life.scoop(s); Life.leaveHome(s);
  assert.equal(play(s, 'c1').signed, true);   // 털도 냄새도 없으면 첫 고객도 계약한다
  const e = s.energy;
  Life.leaveOffice(s);
  assert.equal(s.wallet, 20000 + Life.ALLOWANCE + Life.PRODUCTS.dental.pay);
  assert.equal(s.energy, e - 2);
  assert.deepEqual(s.cards, ['c2', 'c17']);
  assert.equal(s.today.earned.length, 2);
});

test('메일을 읽으면(준비) 한 시간이 들고, 금요일에 온 월요일 메일은 주말에 읽을 수 있다', () => {
  const s = Life.create('나', '보리');
  assert.equal(Life.act(s, 'prep').why, 'noCard');
  s.day = 5; s.phase = 'work';
  Life.leaveOffice(s);
  assert.deepEqual(s.cards, ['c9', 'c19']);
  Life.arriveHome(s); Life.toBed(s); Life.sleep(s); Life.morning(s);
  assert.equal(s.phase, 'weekend');
  assert.equal(s.minute, T.weekendStart);
  const r = Life.act(s, 'prep');
  assert.equal(r.ok, true);
  assert.equal(r.minutes, T.prep);
  assert.equal(s.prepared.c9, true);
  assert.equal(Life.act(s, 'prep').why, 'prepared');
});

test('저녁에 할 일은 자유지만 하나하나 시간이 들고, 같은 일은 정해진 만큼만 할 수 있다', () => {
  const s = Life.create('나', '보리');
  s.energy = 2;
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

test('주말 알바: 네 시간, 5,000원, 체력 3칸, 마음 1칸. 하루 한 번, 오후 3시 전, 체력 3 이상', () => {
  const s = Life.create('나', '보리');
  assert.equal(Life.jobBlock(s), 'notWeekend');
  s.day = 6; s.phase = 'weekend'; s.minute = T.weekendStart; s.energy = 4; s.meal = 'am'; s.fed = { am: true, pm: false };
  const w = s.wallet, h = s.hearts;
  const r = Life.sideJob(s);
  assert.equal(r.ok, true);
  assert.equal(s.wallet, w + 5000);
  assert.equal(s.minute, T.weekendStart + 240);
  assert.equal(s.energy, 1);
  assert.equal(s.hearts, h - 1);
  assert.equal(Life.jobBlock(s), 'done');
  assert.equal(Life.act(s, 'play').why, 'tired', '알바한 날은 쉬어야 놀아 줄 수 있다');
  const t = Life.create('나', '보리');
  t.day = 6; t.phase = 'weekend'; t.minute = 901; t.energy = 5;
  assert.equal(Life.jobBlock(t), 'late');
  t.minute = 700; t.energy = 2;
  assert.equal(Life.jobBlock(t), 'tired');
});

test('로봇청소기는 털이 더 쌓이지 않게만 막고 먼지는 못 닦는다', () => {
  const s = Life.create('나', '보리');
  s.owned.robot = true; s.floor = { fur: 3, dust: 2 };
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
  s.litter.sand = 4;
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
    s.litter.sand = sand; s.litter.poop = sand ? 2 : 0;
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
  for (let i = 0; i < 4; i++) { Life.feed(s, 'dry'); Life.water(s); Life.act(s, 'play'); sleep(s, {}); Life.morning(s); s.phase = 'evening'; s.fed.pm = false; s.bowl = 'empty'; s.meal = 'pm'; }
  assert.equal(s.floor.fur, 5);
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

test('밤 11시가 넘으면 슈퍼 물건값이 심야 할증으로 1.5배가 된다', () => {
  const s = Life.create('나', '보리');
  assert.equal(Life.price(s, 'dry'), 12000);
  s.minute = T.bedtime;
  assert.equal(Life.price(s, 'dry'), 18000);
  assert.equal(Life.price(s, 'coffee'), 3000);
  assert.equal(Life.price(s, 'toy'), 5500);
  assert.equal(Life.buyBlock(s, 'dry', 3000), 'money');   // 장바구니에 이미 담은 값까지 치면 모자란다
  Life.buy(s, 'dry');
  assert.equal(s.wallet, 2000);
  assert.equal(s.today.spent[0].amount, 18000);
});

test('가게에서는 돈이 모자라면 못 사고, 방금 담은 것은 되돌릴 수 있다', () => {
  const s = Life.create('나', '보리');
  assert.equal(Life.buy(s, 'roller').ok, true);
  assert.equal(Life.buy(s, 'roller').why, 'owned');
  assert.equal(Life.buy(s, 'tower').why, 'money');
  Life.buy(s, 'dry');
  assert.equal(s.food.dry, 4 + Life.DRY_MEALS);
  assert.equal(s.wallet, 20000 - 3000 - 12000);
  assert.deepEqual(s.today.spent.map(x => x.item), ['roller', 'dry']);
  assert.equal(Life.unbuy(s, 'dry').ok, true);
  assert.equal(s.wallet, 20000 - 3000);
  assert.equal(s.food.dry, 4);
  Life.buy(s, 'coffee');
  s.phase = 'morning'; Life.coffee(s);
  assert.equal(Life.unbuy(s, 'coffee').why, 'used');
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

test('4/16 저녁 8시 단체 상담에 가면 늦게 들어오고 체력이 한 칸 더 준다', () => {
  const s = Life.create('나', '보리');
  s.day = 4; s.phase = 'work'; s.energy = 5;
  assert.equal(play(s, 'c5').signed, true);
  Life.decideGroup(s, true);
  assert.equal(play(s, 'c6').signed, true);
  Life.leaveOffice(s);
  assert.equal(s.energy, 2);
  assert.equal(s.wallet, 20000 + Life.ALLOWANCE + Life.PRODUCTS.home.pay + Life.PRODUCTS.group.pay);
  Life.arriveHome(s);
  assert.equal(s.minute, T.groupHome);
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

test('엔딩은 하트와 계약 건수로 정해지고, 다 지켜 준 사람만 숨은 엔딩을 본다', () => {
  const s = Life.create('나', '보리');
  const G = Life.GOAL;
  const pick = (h, c) => { s.hearts = h; s.contracts = c; return Life.ending(s).key; };
  assert.equal(pick(5, G), 'both');
  s.events.push({ day: 3, key: 'curtain' });
  assert.equal(pick(5, G), 'both');                 // 서랍 속 아침도 지켜 줘야
  s.events.push({ day: 9, key: 'drawer' });
  assert.equal(pick(5, G), 'family');
  assert.equal(Life.ending(s).grade, 'hidden');
  assert.equal(pick(4, G), 'both');                 // 마음이 하나라도 비면 아니다
  s.missed = 1;
  assert.equal(pick(5, G), 'both');                 // 한 끼라도 굶기면 아니다
  s.missed = 0; s.events = [];
  assert.equal(Life.ENDINGS.length, 8);
  assert.deepEqual(Life.ENDINGS.map(k => Life.GRADE[k]), ['hidden', 'good', 'normal', 'normal', 'normal', 'bad', 'bad', 'bad']);
  assert.equal(pick(4, G - 1), 'catStays');
  assert.equal(pick(3, G + 1), 'soso');
  assert.equal(pick(2, 3), 'clumsy');
  assert.equal(pick(1, G + 2), 'oneBody');
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

test('성실한 12일: 메일 읽고 일찍 자고 털을 떼면 목표를 넘기지만, 지갑은 빠듯하고 목표는 둘째 주에야 채운다', () => {
  const { s, min } = twelveDays({ buy: sensibleBuy });
  assert.equal(s.ended, 'evaluation');
  assert.ok(s.contracts >= Life.GOAL, 'contracts ' + s.contracts);
  assert.ok(s.goalDay !== null);
  assert.ok(s.goalDay >= 8, '목표 달성일 ' + Life.DAYS[s.goalDay].date);
  assert.ok(min >= 0);
  assert.ok(min < 10000, '가장 적을 때 ' + min);
  assert.equal(s.missed, 0);
  assert.ok(['both', 'soso'].includes(Life.ending(s).key), Life.ending(s).key);
  assert.equal(s.ledger.length, 13);
  assert.equal(s.diary.length, 13);
});

test('메일을 안 읽고 가서 고객 말을 알아듣느라 머뭇거리거나, 엉뚱한 안내서를 건네면 목표를 못 채운다', () => {
  const read = twelveDays({ buy: sensibleBuy, hesitate: true }).s;
  assert.ok(read.contracts >= Life.GOAL, '읽고 머뭇 ' + read.contracts);
  const lazy = twelveDays({ buy: sensibleBuy, acts: ['play', 'rest'], hesitate: true }).s;
  assert.ok(lazy.contracts < Life.GOAL, '안 읽고 머뭇 ' + lazy.contracts);
  const clumsy = twelveDays({ buy: sensibleBuy, acts: ['play', 'rest'], mistakes: 1 }).s;
  assert.equal(clumsy.contracts, 0);                  // 안 읽고 가서 한 번씩 틀리면 하나도 못 딴다
  const readClumsy = twelveDays({ buy: sensibleBuy, mistakes: 1 }).s;
  assert.ok(readClumsy.contracts >= Life.GOAL, '읽고 한 번씩 틀림 ' + readClumsy.contracts); // 읽고 가면 실수 하나는 버틴다
});

test('늦게 자고 털도 안 떼면 지각과 하품으로 계약이 크게 준다', () => {
  const careless = twelveDays({ buy: s => sensibleBuy(s).filter(x => x !== 'roller'), open: true, acts: ['prep'], late: 5 }).s;
  assert.ok(careless.contracts < Life.GOAL, '털, 지각 ' + careless.contracts);
});

test('첫날 늦어서 첫 고객을 놓쳐도, 오후 고객과 처음 상담할 때 선배가 옆에서 알려 준다', () => {
  const s = Life.create('나', '보리');
  Life.toBed(s); Life.sleep(s); Life.morning(s);
  Life.dress(s); Life.scoop(s); s.minute = T.leaveBy + 10; Life.leaveHome(s);
  const p1 = Life.plan(s, 'c1');
  assert.equal(p1.leaves, true);
  Life.finish(s, p1, Life.consult(p1));
  const p2 = Life.plan(s, 'c16');
  assert.equal(p2.leaves, false);
  assert.equal(p2.tutorial, true);
  assert.equal(p2.timer, 0);
  play(s, 'c16');
  assert.equal(Life.plan(s, 'c2').tutorial, false);
});

test('화장실 똥을 두고 출근하면 옷에 냄새가 배서 고객 기분이 내려가고, 쌓였으면 더 내려간다', () => {
  const s = Life.create('나', '보리');
  s.day = 2; s.phase = 'morning'; s.minute = T.wake; s.seen.consulted = true; s.prepared.c2 = true;
  s.litter.poop = 1; Life.dress(s); Life.leaveHome(s);
  assert.equal(s.smell, 1);
  let p = Life.plan(s, 'c2');
  assert.ok(p.reasons.some(r => r.key === 'smell' && r.delta === -1));
  assert.equal(play(s, 'c2').signed, true);         // 메일을 읽었으면 하나는 버틴다
  s.phase = 'morning'; s.minute = T.wake; s.litter.poop = 3; s.wearing = 'hoodie'; Life.dress(s); Life.leaveHome(s);
  assert.equal(s.smell, 2);
  p = Life.plan(s, 'c2');
  assert.ok(p.reasons.some(r => r.key === 'stink' && r.delta === -2));
  const r = play(s, 'c2');
  assert.equal(r.signed, false);
  assert.equal(r.why, 'stink');
  Life.leaveOffice(s); Life.arriveHome(s);
  assert.equal(s.smell, 0);                         // 집에 오면 옷을 갈아입는다
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
