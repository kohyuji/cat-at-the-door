const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Life=require('../life-state.js');
function stocked(){const s=Life.create('하늘','보리');assert.equal(Life.act(s,'buyFood').ok,true);return s;}
function basic(s){if(s.food===0)assert.equal(Life.act(s,'buyFood').ok,true);assert.equal(Life.act(s,'feed').ok,true);assert.equal(Life.act(s,'water').ok,true);}
function care(s){basic(s);assert.equal(Life.act(s,'play').ok,true);}
function depart(s){assert.equal(Life.act(s,'dress').ok,true);assert.equal(Life.act(s,'makeBed').ok,true);if(!s.bagPacked)assert.equal(Life.act(s,'packBag').ok,true);assert.equal(Life.act(s,'pickBag').ok,true);assert.equal(Life.act(s,'leaveHome').ok,true);s.phase='work';}

test('browser script exposes the same API without a browser or module',()=>{
  const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../life-state.js'),'utf8'),c);
  assert.equal(vm.runInContext('typeof Life.create',c),'function');assert.equal(vm.runInContext("Life.create('하늘','보리').cash",c),58000);
  assert.equal(vm.runInContext('typeof Life.workTask',c),'function');
});
test('ordinary-office task slots and persistent missing-data keys agree on every workday',()=>{
  const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../life-story.js'),'utf8'),c);
  for(const item of Life.schedule.filter(day=>day.day>0&&!day.weekend)){
    const s=Life.create();s.day=item.day;s.phase='work';const task=c.LifeStory.task(s,'work');
    assert.deepEqual(Array.from(task.slots,slot=>slot.id),item.required,`day ${item.day}`);
  }
});
test('the story begins with an empty food bag and an explicit first shopping objective',()=>{
  const s=Life.create();assert.equal(s.food,0);assert.equal(s.cash,58000);assert.equal(Life.objective(s).key,'firstFood');
  const empty=Life.act(s,'feed');assert.equal(empty.reason,'noFood');assert.equal(empty.mandatoryShop,true);assert.ok(empty.alternatives.includes('buyFood'));
  assert.equal('monthlySalary' in s,false);assert.equal('firstPay' in s,false);
});
test('normal and favorite food have a visible price and quantity tradeoff, without buying affection',()=>{
  const a=Life.create(),b=Life.create();Life.act(a,'buyFood');Life.act(b,'buyFavorite');
  assert.equal(a.cash,46000);assert.equal(a.food,4);assert.equal(a.favoriteFood,0);
  assert.equal(b.cash,43000);assert.equal(b.food,3);assert.equal(b.favoriteFood,3);
  const ordinary=Life.act(a,'feed'),favorite=Life.act(b,'feed',{kind:'favorite'});
  assert.equal(ordinary.reaction,'eat');assert.equal(favorite.reaction,'eager');assert.equal(b.favoriteFood,2);assert.equal(b.flags.catEager,true);
  assert.equal(a.trust,b.trust);Life.act(a,'water');Life.act(b,'water');Life.sleep(a,true);Life.sleep(b,true);
  assert.equal(a.trust,b.trust);assert.equal(b.flags.catEager,false);
});
test('food variants remain separate and an unavailable favorite cannot spend a meal or time',()=>{
  const s=stocked();const before=JSON.stringify(s);assert.equal(Life.act(s,'feed',{kind:'favorite'}).reason,'noFavoriteFood');assert.equal(JSON.stringify(s),before);
  Life.act(s,'smallFood');assert.equal(s.food,5);assert.equal(s.favoriteFood,1);assert.equal(s.cash,41000);
  Life.act(s,'feed');assert.equal(s.food,4);assert.equal(s.favoriteFood,1);
  const time=s.eveningMin;assert.equal(Life.act(s,'feed').reason,'alreadyDone');assert.equal(s.eveningMin,time);
});
test('a favorite meal makes play take twenty minutes that day, without an extra trust reward',()=>{
  const normal=stocked(),favorite=Life.create();Life.act(favorite,'buyFavorite');
  Life.act(normal,'feed');Life.act(favorite,'feed',{kind:'favorite'});
  assert.equal(Life.duration(normal,'play'),30);assert.equal(Life.duration(favorite,'play'),20);
  normal.eveningMin=160;favorite.eveningMin=160;
  assert.equal(Life.act(normal,'play').reason,'notEnoughTime');assert.equal(Life.act(favorite,'play').minutes,20);
  assert.equal(favorite.eveningMin,180);assert.equal(favorite.trust,4);
  Life.act(favorite,'water');Life.sleep(favorite,true);assert.equal(Life.duration(favorite,'play'),30);
});
test('zero cash cannot generate free food or an automatic bankruptcy ending',()=>{
  const s=Life.create();s.cash=0;const before=JSON.stringify(s);
  assert.equal(Life.act(s,'buyFood').reason,'notEnoughCash');assert.equal(JSON.stringify(s),before);
  for(const action of ['askFood','askSupport'])assert.equal(Life.act(s,action).reason,'removedAction');
  assert.equal(s.food,0);assert.equal(s.support,false);assert.notEqual(Life.ending(s).key,'broke');
});
test('activity durations advance the visible clock exactly once',()=>{
  const s=stocked();assert.equal(Life.clock(s).text,'21:15');
  const r=Life.act(s,'prepare');assert.deepEqual(r.clock,{before:'21:15',after:'22:15'});assert.equal(r.minutes,60);
  assert.equal(Life.act(s,'packBag').minutes,5);basic(s);assert.equal(Life.clock(s).text,'22:35');
  const time=s.eveningMin;assert.equal(Life.act(s,'rest').reason,'notEnoughTime');assert.equal(Life.act(s,'play').reason,'notEnoughTime');assert.equal(s.eveningMin,time);
});
test('a blocked activity spends nothing, while essential care and a physical window remain possible',()=>{
  const s=stocked();s.eveningMin=170;const before=JSON.stringify(s);
  assert.equal(Life.act(s,'deskSpace').reason,'notEnoughTime');assert.equal(JSON.stringify(s),before);
  assert.equal(Life.act(s,'secureWindow').ok,true);assert.equal(s.eveningMin,170);
  assert.equal(Life.act(s,'feed').ok,true);assert.equal(Life.act(s,'water').ok,true);assert.equal(Life.clock(s).text,'23:05');
  Life.sleep(s,true);assert.equal(s.lastNight.lateMinutes,5);assert.ok(s.energy<=2);
});
test('desk seating and the weekend box remain physical changes without repeated rewards',()=>{
  const s=stocked();assert.equal(Life.act(s,'deskSpace').minutes,15);assert.equal(s.flags.deskSeat,true);assert.equal(s.trust,4);assert.equal(Life.duration(s,'prepare'),50);
  assert.equal(Life.act(s,'prepare').minutes,50);
  s.day=6;s.phase='morning';Life.arriveHome(s);assert.equal(Life.act(s,'weekendSpace').ok,true);assert.equal(s.flags.cozyBox,true);
  Life.sleep(s,false);Life.arriveHome(s);assert.equal(s.flags.cozyBox,true);assert.equal(s.needs.comfort,false);assert.equal(Life.act(s,'deskSpace').reason,'alreadyDone');
});
test('one roller purchase lasts the whole story and resuming never charges another fee',()=>{
  const s=Life.create();s.phase='morning';s.fur=40;Life.act(s,'buyRoller');assert.equal(s.cash,54000);
  assert.equal('sheets' in s.roller,false);assert.equal(Life.act(s,'startRoller').ok,true);assert.equal(Life.act(s,'roll',{amount:25}).removed,25);
  Life.act(s,'stopRoller');assert.equal(s.roller.usedToday,true);Life.act(s,'startRoller');assert.equal(Life.act(s,'roll',{amount:99}).removed,15);
  assert.equal(s.fur,0);assert.equal(s.cash,54000);assert.equal(Life.act(s,'buyRoller').reason,'alreadyOwned');
  assert.equal(Life.act(s,'buyRefill').reason,'removedAction');assert.equal(Life.act(s,'peelRoller').reason,'removedAction');
});
test('the prepared bag survives the night and must actually be picked up',()=>{
  const s=stocked();basic(s);Life.act(s,'hoodie');Life.act(s,'prepare');Life.act(s,'packBag');assert.equal(s.bagPrepared,true);assert.equal(s.hasBag,false);
  Life.sleep(s,true);assert.equal(s.bagPacked,true);assert.equal(s.bagPrepared,true);assert.equal(Life.ready(s).ok,false);
  Life.act(s,'dress');assert.equal(Life.act(s,'leaveHome').reason,'noBag');Life.act(s,'pickBag');assert.equal(Life.ready(s).ok,true);
  assert.equal(Life.workTask(s).prepared,true);assert.equal(Life.workTask(s).clueAvailable,true);
});
test('morning clothes, bed, packing and an 08:10 departure have real clock effects',()=>{
  const s=stocked();care(s);Life.sleep(s,true);s.morningMin=45;
  assert.equal(Life.act(s,'dress').minutes,5);assert.equal(Life.clock(s).text,'08:10');
  assert.equal(Life.act(s,'makeBed').minutes,3);assert.equal(Life.act(s,'packBag').minutes,5);Life.act(s,'pickBag');
  const r=Life.act(s,'leaveHome');assert.equal(r.ok,true);assert.equal(r.lateMinutes,8);assert.equal(Life.clock(s).text,'08:18');assert.equal(Life.ready(s).lateMinutes,8);
  assert.equal(Life.workTask(s).availableMinutes,112);
});
test('forgetting a bag requires a decision and borrowing changes actual work resources',()=>{
  const s=stocked();s.day=9;s.phase='morning';Life.act(s,'dress');const before=JSON.stringify(s);
  assert.equal(Life.act(s,'leaveHome').reason,'noBag');assert.equal(JSON.stringify(s),before);
  const r=Life.act(s,'leaveHome',{borrowLaptop:true});assert.equal(r.ok,true);assert.equal(s.flags.borrowedLaptop,true);assert.equal(s.flags.missingPhotos,true);
  const task=Life.workTask(s);assert.equal(task.availableMinutes,75);assert.equal(task.prepared,false);assert.ok(task.extraSteps.some(step=>step.id==='requestFiles'));
  s.phase='work';Life.act(s,'requestFiles');assert.equal(s.flags.missingPhotos,false);assert.equal(s.workMin,15);assert.equal(Life.workTask(s).availableMinutes,60);
  const report=Life.finishWork(s,{completed:true}).work;assert.equal(report.missing.length,0);assert.equal(report.borrowedLaptop,true);assert.equal(report.extraMinutes,75);
});
test('a borrowed computer cannot pretend to contain the unrequested meeting files',()=>{
  const s=stocked();s.day=9;s.phase='morning';Life.act(s,'dress');Life.act(s,'leaveHome',{borrowLaptop:true});s.phase='work';
  const report=Life.finishWork(s,{completed:true}).work;assert.equal(report.status,'partial');assert.deepEqual(report.missing,['rowsFile']);
  assert.equal(s.issueQueue[0].id,'9:rowsFile');assert.equal(s.issueQueue[0].deadline,true);
});
test('work performed while tired is still performed, and preparation changes needed steps',()=>{
  const a=stocked(),b=stocked();for(const s of [a,b]){basic(s);Life.act(s,'packBag');}
  Life.act(a,'prepare');Life.sleep(a,true);Life.sleep(b,true);depart(a);depart(b);
  assert.equal(Life.workTask(a).extraSteps.some(step=>step.id==='findReference'),false);assert.equal(Life.workTask(b).extraSteps.some(step=>step.id==='findReference'),true);
  a.energy=0;const done=Life.finishWork(a,{completed:true}).work;assert.equal(done.completed,true);assert.equal(done.status,'strained');assert.equal(done.missing.length,0);
  const missed=Life.finishWork(b,{completed:false}).work;assert.equal(missed.status,'missed');assert.deepEqual(missed.missing,Life.schedule[1].required);
});
test('missing checklist items persist into later tasks until those exact issues are repaired',()=>{
  const s=stocked();s.day=4;s.phase='work';Life.finishWork(s,{completed:true,missing:['completedCount','pendingCount'],labels:{completedCount:'완료 합계',pendingCount:'대기 합계'}});
  assert.equal(s.work[0].status,'partial');assert.equal(s.issueQueue.length,2);Life.arriveHome(s);care(s);Life.sleep(s,true);depart(s);
  const task=Life.workTask(s);assert.deepEqual(task.carryover.map(i=>i.id),['4:completedCount','4:pendingCount']);assert.ok(task.extraSteps.some(i=>i.id==='4:completedCount'));
  Life.finishWork(s,{completed:true,resolved:['4:completedCount']});assert.equal(s.issueQueue[0].resolved,true);assert.equal(s.issueQueue[1].resolved,false);
  assert.equal(s.issueQueue[0].resolvedDay,5);assert.deepEqual(s.work[1].carryover,['4:pendingCount']);
});
test('a reported work result cannot be replayed to erase issues or create money',()=>{
  const s=stocked();s.day=12;s.phase='work';const cash=s.cash;Life.finishWork(s,{completed:false});
  assert.equal(Life.finishWork(s,{completed:true,resolved:s.issueQueue.map(i=>i.id)}).alreadyDone,true);
  assert.equal(s.cash,cash);assert.equal(s.project.launched,false);assert.equal(s.issueQueue.filter(i=>!i.resolved).length,3);
  assert.ok(s.transactions.every(t=>t.cash<0));
});
test('night hunger, thirst and calling produce a playable episode description and morning fatigue',()=>{
  const s=stocked();const beforeTrust=s.trust;const r=Life.sleep(s,false);
  assert.deepEqual(r.night.wakeReasons,['hunger','thirst','calling']);assert.deepEqual(s.nightIssue.reasons,r.night.wakeReasons);
  assert.equal(s.flags.nightHunger,true);assert.equal(s.flags.nightThirst,true);assert.equal(s.flags.nightCalling,true);assert.ok(s.energy<3);assert.ok(s.trust<beforeTrust);
  assert.equal(Life.act(s,'feed').ok,true);assert.equal(Life.act(s,'water').ok,true);assert.equal(s.morningMin,15);
  assert.equal(s.flags.nightHunger,true,'the morning reaction can still refer to what happened overnight');
});
test('fed and watered cats can sleep separately in a familiar place without a calling penalty',()=>{
  const s=stocked();Life.act(s,'feed');Life.act(s,'water');Life.act(s,'hoodie');Life.sleep(s,false);
  assert.equal(s.flags.nightCalling,false);assert.deepEqual(s.lastNight.wakeReasons,[]);assert.equal(s.energy,3);
});
test('only the visible day-three storm adds rain; a closed window alone cannot replace care',()=>{
  for(const day of [3,10,11]){const s=stocked();s.day=day;Life.act(s,'feed');Life.act(s,'water');Life.act(s,'secureWindow');Life.sleep(s,false);assert.equal(s.lastNight.storm,day===3);assert.equal(s.nightIssue.rain,day===3);}
  const s=stocked();s.day=3;s.hoodie=true;Life.act(s,'feed');Life.act(s,'water');Life.act(s,'secureWindow');Life.sleep(s,false);
  assert.equal(s.nightIssue.rain,false);assert.equal(s.flags.windowSecured,false);assert.ok(s.trust<=4);
});
test('night care is recorded in that night without stealing morning time or erasing poor sleep',()=>{
  const s=stocked();Life.sleep(s,false);const energy=s.energy,trust=s.trust;
  const feed=Life.actAtNight(s,'feed');assert.equal(feed.ok,true);assert.equal(feed.atNight,true);assert.equal(feed.minutes,10);
  const water=Life.actAtNight(s,'water');assert.equal(water.ok,true);assert.deepEqual(water.clock,{before:'02:50',after:'02:55'});assert.equal(s.morningMin,0);assert.equal(s.dayMinutes,0);assert.equal(Life.clock(s).text,'07:20');
  assert.equal(s.lastNight.nightCareMinutes,15);assert.equal(s.lastNight.nightCare.length,2);assert.equal(s.lastNight.fed,false);
  assert.equal(s.energy,energy);assert.equal(s.trust,trust);assert.equal(s.needs.fed,true);assert.equal(s.water,true);
  assert.equal(Life.actAtNight(s,'feed').reason,'alreadyDone');
});
test('weekend activity starts at 10:00 and concrete chores advance daytime without an office',()=>{
  const s=stocked();s.day=6;s.phase='morning';Life.arriveHome(s);assert.equal(Life.clock(s).text,'10:00');assert.equal(Life.clock(s).remaining,780);
  Life.act(s,'laundry');Life.act(s,'dishes');Life.act(s,'tidy');assert.equal(Life.clock(s).text,'12:05');assert.equal(Life.finishWork(s).reason,'weekend');
  const minutes=s.eveningMin;Life.arriveHome(s);assert.equal(s.eveningMin,minutes);assert.equal(Life.sleep(s,true).earlySleep,true);
});
test('preparation is dated, cannot be farmed, and weekend preparation still belongs to Monday',()=>{
  const s=stocked();s.day=6;s.phase='morning';Life.arriveHome(s);Life.act(s,'prepare');assert.deepEqual(s.preparedDays,[8]);
  Life.sleep(s,true);Life.arriveHome(s);const before=JSON.stringify(s);assert.equal(Life.act(s,'prepare').reason,'alreadyPrepared');assert.equal(JSON.stringify(s),before);
  Life.act(s,'packBag');Life.sleep(s,true);assert.equal(s.day,8);depart(s);assert.equal(Life.workTask(s).prepared,true);Life.finishWork(s,{completed:true});assert.deepEqual(s.preparedDays,[]);
});
test('a twelve-day route alternates preparation and rest, buys food, and reaches the first team meeting',()=>{
  const s=Life.create('하늘','보리');Life.act(s,'buyRoller');Life.act(s,'hoodie');const officeDays=[],rested=[],unprepared=[];
  for(let evening=0;evening<=12;evening++){
    assert.equal(s.day,evening);assert.equal(s.phase,'evening');basic(s);
    if(evening<12&&(s.strain<2||evening===11))Life.act(s,'prepare');
    else if(Life.act(s,'rest').ok)rested.push(evening);
    if(evening<12)Life.act(s,'packBag');
    if(Life.clock(s).remaining>=Life.duration(s,'play'))Life.act(s,'play');
    if(evening===3)Life.act(s,'secureWindow');
    const night=Life.sleep(s,evening%2===0);assert.equal(night.ok,true);if(s.phase==='ending')break;
    if([6,7].includes(s.day)){assert.equal(Life.finishWork(s).reason,'weekend');Life.arriveHome(s);Life.act(s,'weekendSpace');}
    else{depart(s);officeDays.push(s.day);if(!Life.workTask(s).prepared){unprepared.push(s.day);assert.equal(Life.act(s,'openReference').ok,true);}assert.equal(Life.act(s,'workReview').ok,true);const done=Life.finishWork(s,{completed:true});assert.equal(done.work.missing.length,0);Life.arriveHome(s);}
  }
  assert.deepEqual(officeDays,[1,2,3,4,5,8,9,10,11,12]);assert.equal(s.log.length,13);assert.equal(s.phase,'ending');assert.equal(s.project.presented,true);assert.ok(rested.length>=3);assert.ok(unprepared.length>=2);assert.ok(s.strain<7);
  assert.equal(s.cash,6000);assert.equal(s.food,3);assert.equal(s.transactions.filter(t=>t.type==='buyFood').length,4);assert.ok(s.transactions.every(t=>t.cash<0));
  assert.equal(Life.ending(s).presented,true);
});
test('two favorite multipacks remain affordable alongside fourteen meals and the roller',()=>{
  const s=Life.create();Life.act(s,'buyFavorite');Life.act(s,'buyFavorite');Life.act(s,'buyFood');Life.act(s,'buyFood');Life.act(s,'buyRoller');
  assert.equal(s.cash,0);assert.equal(s.food,14);assert.equal(s.favoriteFood,6);assert.equal(s.roller.owned,true);
});
test('endings describe the actual team meeting and relationship, never a final wealth target',()=>{
  const a=Life.create(),b=Life.create();a.cash=0;b.cash=999999;
  for(const s of [a,b]){s.project.presented=true;s.trust=7;s.routine=4;s.lastNight={open:false};}
  assert.deepEqual(Life.ending(a),Life.ending(b));assert.equal(Life.ending(a).key,'settled');
  b.project.presented=false;assert.equal(Life.ending(b).presented,false);assert.match(Life.ending(b).lines[0],/준비가 부족/);
});
test('working adds strain even with preparation, while one rest removes exactly two strain',()=>{
  const s=stocked();basic(s);Life.act(s,'prepare');Life.act(s,'packBag');Life.sleep(s,true);depart(s);
  Life.act(s,'workReview');Life.finishWork(s,{completed:true});assert.equal(s.strain,1);
  s.strain=5;Life.arriveHome(s);assert.equal(Life.fatigue(s),'tired');Life.act(s,'rest');assert.equal(s.strain,3);assert.equal(Life.fatigue(s),'normal');
});
test('prepared work gets real source links and deliberate reviews consume a fatigue-dependent budget',()=>{
  const s=Life.create();s.day=4;s.phase='work';s.hasBag=true;s.bagPrepared=true;s.preparedDays=[4];
  const definition={slots:[{id:'completedCount',hint:'완료 수를 찾는다.'}],cards:[{id:'eight',sourceId:'table'}],sources:[{id:'table',title:'현황 표'}],solution:{completedCount:'eight'}};
  assert.deepEqual(Life.workBudget(s,definition).hints,[{slotId:'completedCount',sourceId:'table',text:'현황 표'}]);assert.equal(Life.workBudget(s).remaining,4);
  assert.equal(Life.act(s,'workReview').ok,true);assert.equal(Life.workBudget(s).remaining,3);assert.equal(s.workMin,5);
  s.strain=4;assert.equal(Life.workBudget(s).total,3);s.strain=7;assert.equal(Life.workBudget(s).total,2);
  assert.equal(Life.act(s,'workReview').ok,true);const before=JSON.stringify(s);assert.equal(Life.act(s,'workReview').reason,'noWorkActions');assert.equal(JSON.stringify(s),before);
});
test('unprepared work spends one opportunity finding its reference and does not charge that time twice',()=>{
  const s=Life.create();s.day=3;s.phase='work';assert.equal(Life.workBudget(s).sourceAvailable,false);
  assert.equal(Life.act(s,'openReference').ok,true);assert.equal(Life.workBudget(s).sourceAvailable,true);assert.equal(Life.workBudget(s).remaining,3);
  assert.equal(Life.act(s,'openReference').reason,'alreadyAvailable');Life.act(s,'workReview');assert.equal(Life.finishWork(s,{completed:true}).work.extraMinutes,20);
});
test('the final meeting needs materials by 09:20 and forgotten equipment can really miss it',()=>{
  const onTime=Life.create(),late=Life.create();for(const s of [onTime,late]){s.day=12;s.phase='work';s.hasBag=true;s.bagPrepared=true;s.preparedDays=[12];}
  assert.equal(Life.workBudget(onTime).availableMinutes,20);assert.equal(Life.workBudget(onTime).deadlineAt,'09:20');Life.act(onTime,'workReview');Life.finishWork(onTime,{completed:true});assert.equal(onTime.project.presented,true);
  late.flags.borrowedLaptop=true;assert.equal(Life.workBudget(late).availableMinutes,0);assert.equal(Life.act(late,'workReview').reason,'notEnoughWorkTime');
  const report=Life.finishWork(late,{completed:true}).work;assert.equal(report.completed,true);assert.equal(report.onTime,false);assert.equal(late.project.presented,false);
});
test('an open bedroom without play or a familiar bed can produce a real nighttime play episode',()=>{
  const s=stocked();basic(s);Life.sleep(s,true);assert.ok(s.lastNight.wakeReasons.includes('play'));assert.equal(s.flags.nightPlay,true);assert.equal(s.nightIssue.playing,true);assert.ok(s.energy<=2);
  const quiet=stocked();basic(quiet);Life.act(quiet,'hoodie');Life.sleep(quiet,true);assert.equal(quiet.nightIssue.playing,false);
});
