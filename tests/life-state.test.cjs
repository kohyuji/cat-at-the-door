const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Life=require('../life-state.js');

test('the final scene describes the actual clothes and resting place the player left',()=>{
 const s=Life.create();s.routine=4;s.trust=6;s.strain=0;s.lastNight={open:false};
 assert.equal(Life.ending(s).key,'settled');assert.ok(!Life.ending(s).lines.join('').includes('후드티'));
 s.hoodie=true;assert.ok(Life.ending(s).lines.join('').includes('후드티'));
 s.lastNight.open=true;s.suitStored=false;assert.ok(!Life.ending(s).lines.join('').includes('옷걸이에 걸려'));
 s.suitStored=true;assert.ok(Life.ending(s).lines.join('').includes('옷걸이에 걸려'));
});

function cared(s){
  if(s.food===0)assert.equal(Life.act(s,'askFood').ok,true);
  assert.equal(Life.act(s,'feed').ok,true);
  assert.equal(Life.act(s,'water').ok,true);
  assert.equal(Life.act(s,'play').ok,true);
}
test('classic browser script exposes Life without a DOM or module',()=>{
  const context=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../life-state.js'),'utf8'),context);
  assert.equal(vm.runInContext('typeof Life.create',context),'function');
  assert.equal(vm.runInContext("Life.create('하늘','보리').cash",context),82000);
});
test('food depletion is visible, and free help and basic care remain possible late at night',()=>{
  const s=Life.create();s.cash=0;s.food=1;s.eveningMin=179;
  assert.equal(Life.act(s,'feed').ok,true);assert.equal(s.food,0);assert.equal(s.flags.foodWarningSeen,true);
  const cash=s.cash,time=s.eveningMin;
  assert.equal(Life.act(s,'feed').ok,false);assert.equal(s.eveningMin,time);assert.equal(s.cash,cash);
  // A later evening with no food never becomes a money or time dead end.
  s.done={};s.needs.fed=false;
  const warning=Life.act(s,'feed');assert.equal(warning.reason,'noFood');assert.ok(warning.alternatives.includes('askFood'));
  assert.equal(Life.act(s,'buyFood').reason,'notEnoughCash');
  assert.equal(Life.act(s,'askFood').ok,true);assert.equal(s.food,2);assert.equal(s.support,true);
  assert.equal(Life.act(s,'feed').ok,true);assert.equal(Life.act(s,'water').ok,true);assert.ok(s.eveningMin>180);
  assert.equal(Life.act(s,'askFood').reason,'alreadyDone');
});
test('a repeated activity cannot create extra preparation or trust and failed time checks spend nothing',()=>{
  const s=Life.create();s.eveningMin=140;
  const before=JSON.stringify(s);const no=Life.act(s,'prepare');
  assert.equal(no.reason,'notEnoughTime');assert.equal(JSON.stringify(s),before);
  s.eveningMin=0;assert.equal(Life.act(s,'prepare').ok,true);assert.equal(s.prep,1);
  const minute=s.eveningMin;assert.equal(Life.act(s,'prepare').reason,'alreadyDone');assert.equal(s.prep,1);assert.equal(s.eveningMin,minute);
});
test('roller purchase, first stroke, pause, resume and peeling have one consistent cost',()=>{
  const s=Life.create();s.phase='morning';s.fur=12;
  assert.equal(Life.act(s,'startRoller').reason,'noRoller');
  assert.equal(Life.act(s,'buyRoller').ok,true);assert.equal(s.cash,78000);assert.equal(s.roller.sheets,20);
  assert.equal(Life.act(s,'buyRoller').reason,'alreadyOwned');assert.equal(s.cash,78000);
  Life.act(s,'stopRoller');assert.equal(s.roller.usedToday,false);assert.equal(s.roller.sheets,20);
  assert.equal(Life.act(s,'startRoller').ok,true);assert.equal(s.roller.sheets,19);assert.equal(s.roller.usedToday,true);
  Life.act(s,'startRoller');assert.equal(s.roller.sheets,19);
  Life.act(s,'roll',{amount:3});assert.equal(s.fur,9);
  Life.act(s,'stopRoller');assert.equal(s.roller.usedToday,true);assert.equal(s.roller.active,false);
  Life.act(s,'startRoller');assert.equal(s.roller.sheets,19,'resuming the same face is not a new sheet');
  Life.act(s,'roll',{amount:8});assert.equal(s.fur,4);assert.equal(s.roller.dirty,8);
  assert.equal(Life.act(s,'roll').reason,'dirtySheet');
  Life.act(s,'peelRoller');assert.equal(s.roller.sheets,19);assert.equal(s.roller.active,false);
  Life.act(s,'startRoller');assert.equal(s.roller.sheets,18);
  Life.act(s,'roll',{amount:8});assert.equal(s.fur,0);assert.equal(s.cash,78000);
  Life.act(s,'stopRoller');assert.equal(Life.act(s,'startRoller').reason,'noFur');assert.equal(s.roller.sheets,18);
});
test('a replacement roll adds sheets for 2000 without buying the body again',()=>{
  const s=Life.create();Life.act(s,'buyRoller');s.roller.sheets=0;
  assert.equal(Life.act(s,'buyRefill').ok,true);assert.equal(s.cash,76000);assert.equal(s.roller.sheets,20);
  assert.equal(Life.act(s,'buyRefill').reason,'alreadyDone');assert.equal(s.cash,76000);
});
test('a settled closed door is a valid care choice and sleeping together does not automatically exhaust the player',()=>{
  const together=Life.create(),separate=Life.create();
  cared(together);cared(separate);Life.act(separate,'hoodie');
  Life.sleep(together,true);Life.sleep(separate,false);
  assert.equal(together.energy,3);assert.equal(separate.energy,3);
  assert.ok(together.trust>4);assert.ok(separate.trust>4);
  assert.equal(together.day,1);assert.equal(together.phase,'morning');assert.equal(together.log.length,1);
  assert.equal(Life.sleep(together,true).reason,'wrongPhase');assert.equal(together.log.length,1);
});
test('fur never changes salary; preparation and energy determine work, and salary pays once',()=>{
  const a=Life.create(),b=Life.create();
  for(const s of [a,b]){s.day=4;s.phase='morning';s.prep=1;s.energy=3;}
  a.fur=0;b.fur=20;
  assert.equal(Life.finishWork(a).work.status,'good');assert.equal(Life.finishWork(b).work.status,'good');
  assert.equal(a.cash,82000);assert.equal(b.cash,82000);assert.equal(a.prep,0);
  const s=Life.create();s.day=12;s.phase='morning';s.prep=1;
  const first=Life.finishWork(s);assert.equal(s.cash,1192000);assert.equal(first.payday.firstPay,1110000);assert.equal(first.payday.monthlySalary,2450000);
  assert.equal(Life.finishWork(s).alreadyDone,true);assert.equal(s.cash,1192000);assert.equal(s.transactions.filter(t=>t.type==='firstPay').length,1);
});
test('weekends have no office result and entering home twice cannot refill the evening',()=>{
  const s=Life.create();s.day=6;s.phase='morning';
  assert.equal(Life.finishWork(s).weekend,true);assert.equal(s.work.length,0);
  Life.arriveHome(s);Life.act(s,'play');const minutes=s.eveningMin;
  Life.arriveHome(s);assert.equal(s.eveningMin,minutes);assert.equal(s.needs.played,true);
  assert.equal(Life.act(s,'weekendSpace').ok,true);
});
test('making a desk seat uses fifteen minutes once, survives the day, and cannot farm affection',()=>{
  const s=Life.create();s.eveningMin=170;
  const before=JSON.stringify(s);
  assert.equal(Life.act(s,'deskSpace').reason,'notEnoughTime');assert.equal(JSON.stringify(s),before);
  s.eveningMin=150;const made=Life.act(s,'deskSpace');
  assert.equal(made.ok,true);assert.equal(made.cost.minutes,15);assert.equal(s.eveningMin,165);
  assert.equal(s.flags.deskSeat,true);assert.equal(s.trust,4);assert.equal(s.needs.comfort,false);
  Life.sleep(s,true);Life.arriveHome(s);const nextDay=JSON.stringify(s);
  assert.equal(s.flags.deskSeat,true);assert.equal(Life.act(s,'deskSpace').reason,'alreadyDone');assert.equal(JSON.stringify(s),nextDay);
});
test('a weekend resting box stays in the home after daily care resets',()=>{
  const s=Life.create();s.day=6;
  assert.equal(Life.act(s,'weekendSpace').ok,true);assert.equal(s.flags.cozyBox,true);
  Life.sleep(s,false);Life.arriveHome(s);
  assert.equal(s.day,7);assert.equal(s.needs.comfort,false);assert.equal(s.flags.cozyBox,true);
});
test('an agreed work plan is dated, can be requested on a later day, and does not change an already reported result',()=>{
  const s=Life.create();assert.equal(Life.act(s,'phonePlan',{day:4}).ok,true);
  assert.equal(Life.act(s,'phonePlan',{day:9}).reason,'alreadyDone');
  cared(s);Life.sleep(s,true);Life.finishWork(s);
  assert.equal(Life.act(s,'phonePlan',{day:9}).ok,true);assert.deepEqual(s.planDays,[4,9]);
  s.day=4;s.phase='morning';s.prep=0;
  const report=Life.finishWork(s,{completed:true}).work;assert.equal(report.status,'steady');assert.equal(report.planned,true);assert.equal(report.extraMinutes,15);
  s.prep=3;assert.equal(Life.finishWork(s).work.status,'steady');
});
test('completed office work is never called missed, and preparation saves visible time',()=>{
  const prepared=Life.create(),unprepared=Life.create(),tired=Life.create(),unfinished=Life.create();
  for(const s of [prepared,unprepared,tired,unfinished]){s.day=9;s.phase='work';}
  prepared.prep=1;tired.energy=0;unfinished.prep=2;
  const a=Life.finishWork(prepared,{completed:true}).work;
  const b=Life.finishWork(unprepared,{completed:true}).work;
  const c=Life.finishWork(tired,{completed:true}).work;
  const d=Life.finishWork(unfinished,{completed:false}).work;
  assert.equal(a.status,'good');assert.equal(a.extraMinutes,0);assert.equal(prepared.prep,0);
  assert.equal(b.completed,true);assert.equal(b.status,'steady');assert.equal(b.extraMinutes,30);
  assert.equal(c.completed,true);assert.equal(c.status,'strained');assert.equal(c.extraMinutes,50);
  assert.equal(d.completed,false);assert.equal(d.status,'missed');assert.match(d.reason,/남은 부분/);
  assert.equal(unprepared.flags.workDelayMinutes,b.extraMinutes);
  assert.equal(Life.finishWork(unfinished,{completed:true}).work.completed,false,'reporting a partial hand-off is not undone by a duplicate call');
});
test('only the visible storm nights, three and eleven, affect weather outcomes',()=>{
  for(const day of [3,10,11]){
    const s=Life.create();s.day=day;s.phase='evening';cared(s);
    Life.sleep(s,false);assert.equal(s.lastNight.storm,[3,11].includes(day));
  }
  const s=Life.create();s.flags.raining=true;cared(s);Life.sleep(s,true);
  assert.equal(s.lastNight.storm,true);assert.equal(s.flags.raining,false);
});
test('closing the window costs no evening time and needs a familiar place or contact to ease a storm',()=>{
  const bare=Life.create(),familiar=Life.create(),contact=Life.create();
  for(const s of [bare,familiar,contact]){
    s.day=3;s.eveningMin=180;s.needs.fed=true;s.water=true;
    assert.equal(Life.act(s,'secureWindow').ok,true);assert.equal(s.eveningMin,180);
    assert.equal(Life.act(s,'secureWindow').reason,'alreadyDone');assert.equal(s.trust,4);
  }
  familiar.hoodie=true;contact.needs.played=true;
  Life.sleep(bare,false);Life.sleep(familiar,false);Life.sleep(contact,false);
  assert.equal(bare.lastNight.comforted,false,'a closed curtain alone is not emotional care');
  assert.equal(familiar.lastNight.comforted,true);assert.equal(contact.lastNight.comforted,true);
  assert.equal(familiar.lastNight.windowSecured,true);assert.equal(familiar.flags.windowSecured,false);
  assert.ok(familiar.trust<=4,'the window and an existing hoodie do not farm affection');
  Life.arriveHome(familiar);assert.equal(Life.act(familiar,'secureWindow').ok,true);
});
test('controller-like commute, work, home and weekend transitions remain coherent for all twelve days',()=>{
  const s=Life.create();const seen=[];
  for(let evening=0;evening<12;evening++){
    assert.equal(s.phase,'evening');assert.equal(s.day,evening);
    cared(s);if([3,8,11].includes(s.day))Life.act(s,'prepare');
    if(s.day===3||s.day===11)Life.act(s,'calmRain');
    Life.sleep(s,evening%2===0);assert.equal(s.day,evening+1);assert.equal(s.phase,'morning');
    if([6,7].includes(s.day)){
      assert.equal(Life.finishWork(s).reason,'weekend');Life.arriveHome(s);
      assert.equal(Life.act(s,'weekendSpace').ok,true);
    }else{
      s.phase='work';const report=Life.finishWork(s,{completed:true});seen.push(s.day);
      assert.equal(report.ok,true);assert.equal(report.work.completed,true);assert.equal(s.phase,'afterWork');
      // This is the order used when the station takes the player home.
      Life.arriveHome(s);s.eveningMin=(s.day===8?60:s.day===3?20:0)+report.work.extraMinutes;
    }
    assert.equal(s.phase,'evening');assert.equal(s.needs.fed,false);assert.equal(s.water,false);
    const remaining=s.eveningMin;Life.arriveHome(s);assert.equal(s.eveningMin,remaining);
  }
  assert.deepEqual(seen,[1,2,3,4,5,8,9,10,11,12]);assert.equal(s.flags.paydayPaid,true);
  cared(s);Life.sleep(s,false);assert.equal(s.phase,'ending');assert.equal(s.day,12);assert.equal(s.log.length,13);
});
test('cash-poor but responsible basic care can complete the story using free food help',()=>{
  const s=Life.create();s.cash=0;s.food=0;
  for(let evening=0;evening<13;evening++){
    if(s.food===0){const help=Life.act(s,'askFood');assert.equal(help.ok,true);}
    assert.equal(Life.act(s,'feed').ok,true);assert.equal(Life.act(s,'water').ok,true);
    if(evening===0)assert.equal(Life.act(s,'hoodie').ok,true);
    if([3,11].includes(evening))Life.act(s,'calmRain');
    Life.sleep(s,false);
    if(s.phase==='ending')break;
    if(![6,7].includes(s.day)){s.phase='work';assert.equal(Life.finishWork(s,{completed:true}).ok,true);}
    Life.arriveHome(s);
  }
  assert.equal(s.phase,'ending');assert.ok(s.log.every(n=>n.fed));assert.ok(s.log.every(n=>n.water));
  assert.equal(s.cash,1110000);assert.equal(s.flags.foodHelpReceived,true);assert.equal(s.work.length,10);
  assert.notEqual(Life.ending(s).key,'broke');
});
test('a hoodie and supplies are not an automatic source of relationship growth',()=>{
  const s=Life.create();Life.act(s,'hoodie');Life.act(s,'feed');Life.act(s,'water');Life.sleep(s,false);
  const first=s.trust;
  for(let i=0;i<3;i++){
    Life.arriveHome(s);if(s.food===0)Life.act(s,'askFood');Life.act(s,'feed');Life.act(s,'water');Life.sleep(s,false);
  }
  assert.ok(s.trust<=first);assert.ok(s.routine>0);
});
test('twelve days finish with a coherent ledger and no hidden bankruptcy ending',()=>{
  const s=Life.create('하늘','보리');
  for(let night=0;night<12;night++){
    cared(s);if([3,8,11].includes(s.day))Life.act(s,'prepare');
    assert.equal(Life.sleep(s,night%2===0).ok,true);
    if(s.day!==6&&s.day!==7)assert.equal(Life.finishWork(s).ok,true);
    Life.arriveHome(s);
  }
  assert.equal(s.day,12);assert.equal(s.phase,'evening');assert.equal(s.work.length,10);
  cared(s);assert.equal(Life.sleep(s,false).ok,true);assert.equal(s.day,12);assert.equal(s.phase,'ending');assert.equal(s.log.length,13);
  assert.ok(['settled','shared','finding','worn','distance'].includes(Life.ending(s).key));
  const noMoney=Life.create();noMoney.cash=0;noMoney.trust=7;noMoney.routine=4;
  assert.equal(Life.ending(noMoney).key,'settled');
});
