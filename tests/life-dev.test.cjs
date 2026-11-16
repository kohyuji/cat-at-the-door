const test = require('node:test');
const assert = require('node:assert/strict');
global.Life = require('../src/life-state.js');
const Dev = require('../src/life-dev.js');

test('개발자 모드는 어느 날 아침이든 퇴근 후 저녁이든 바로 만들어 준다', () => {
  for (const style of Object.keys(Dev.STYLES)) {
    for (let d = 1; d < Life.DAYS.length; d++) {
      for (const when of ['morning', 'evening']) {
        const s = Dev.simulate('나', '땅콩', style, d, when);
        const off = Life.DAYS[d].kind === 'off', final = Life.DAYS[d].final;
        assert.equal(s.day, d, style + ' ' + d + ' ' + when);
        assert.equal(s.phase, off ? 'weekend' : (when === 'evening' && !final ? 'evening' : 'morning'));
        assert.ok(!s.ended);
        assert.ok(Life.load(Life.save(s)));
      }
    }
  }
});

test('개발자 모드의 플레이 방식은 그날까지의 상태를 다르게 남긴다', () => {
  const bal = Dev.simulate('나', '땅콩', 'balance', 12, 'morning');
  const work = Dev.simulate('나', '땅콩', 'work', 12, 'morning');
  const cat = Dev.simulate('나', '땅콩', 'cat', 12, 'morning');
  assert.ok(work.contracts > cat.contracts);
  assert.ok(bal.photos.length > 0 && work.photos.length === 0);
  assert.ok(bal.hearts > work.hearts);
  assert.equal(bal.lid, 'lid'); assert.equal(work.lid, 'work');
});
