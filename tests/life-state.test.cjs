const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Life=require('../src/life-state.js');
const Story=require('../src/life-story.js');
function stock(s=Life.create()){if(s.food<1)assert.equal(Life.act(s,'buyFood').ok,true);return s;}
function care(s){stock(s);assert.equal(Life.act(s,'feed').ok,true);assert.equal(Life.act(s,'water').ok,true);}
function morning(s){Life.finishNight(s);care(s);Life.act(s,'dress');Life.act(s,'packBag');Life.act(s,'pickBag');assert.equal(Life.act(s,'leaveHome').ok,true);s.phase='work';}
function toDay(day){const s=Life.create('하늘','보리');s.day=day;s.phase='work';s.hasBag=true;return s;}

test('the browser model has the same API as the Node model',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/life-state.js'),'utf8'),context);
 assert.equal(vm.runInContext('typeof Life.timeBand',context),'function');assert.equal(vm.runInContext('typeof Life.finishNight',context),'function');assert.equal(vm.runInContext('Life.create().cash',context),58000);
});
test('only two office days ask for file sorting and every file has one matching date',()=>{
 for(const day of Life.schedule.filter(d=>d.day>0&&!d.weekend)){
  const task=Story.task({day:day.day},'work');assert.equal(task.kind,[2,9].includes(day.day)?'sort':'routine');
  assert.deepEqual(task.slots.map(s=>s.id),day.required);
  for(const slot of task.slots){const card=task.cards.find(c=>c.id===task.solution[slot.id]);assert.ok(card);assert.match(card.text,new RegExp(slot.id.slice(4)));}
 }
});
test('the first food purchase never claims an already familiar diet',()=>{
 const s=Life.create();assert.equal(Life.objective(s).key,'firstFood');assert.equal(Life.act(s,'feed').reason,'noFood');
 const first=Life.act(s,'buyFood');assert.equal(first.firstPurchase,true);assert.doesNotMatch(first.message,/평소|먹이던|좋아하/);assert.equal(s.food,8);assert.equal(s.cash,46000);
 const next=Life.act(s,'buyFood');assert.equal(next.firstPurchase,false);assert.match(next.message,/먹이던/);
});
test('the whole morning and evening diet remains affordable with the roller',()=>{
 const s=Life.create();Life.act(s,'buyFavorite');Life.act(s,'buyFavorite');Life.act(s,'buyFood');Life.act(s,'buyFood');Life.act(s,'buyRoller');
 assert.equal(s.cash,0);assert.equal(s.food,28);assert.equal(s.favoriteFood,12);assert.equal(s.roller.owned,true);
 assert.equal(Life.act(s,'buyFood').reason,'notEnoughCash');assert.equal(Life.act(s,'askSupport').reason,'removedAction');
});
test('food varieties stay separate and cannot buy permanent affection',()=>{
 const s=stock();const trust=s.trust,before=s.food;assert.equal(Life.act(s,'feed',{kind:'favorite'}).reason,'noFavoriteFood');assert.equal(s.food,before);
 Life.act(s,'smallFood');assert.equal(s.favoriteFood,1);Life.act(s,'feed',{kind:'favorite'});assert.equal(s.favoriteFood,0);assert.equal(s.trust,trust);assert.equal(s.flags.catEager,true);assert.equal(Life.duration(s,'play'),20);
});
test('two evening choices replace minute arithmetic while basic care remains possible',()=>{
 const s=stock();assert.deepEqual([Life.timeBand(s).slots,Life.timeBand(s).used],[2,0]);
 care(s);assert.equal(Life.timeBand(s).used,0);Life.act(s,'play');assert.equal(Life.timeBand(s).label,'늦은 저녁');Life.act(s,'rest');assert.equal(Life.timeBand(s).label,'잘 시간');
 const before=JSON.stringify(s);assert.equal(Life.act(s,'prepare').reason,'notEnoughTime');assert.equal(JSON.stringify(s),before);
 assert.equal(Life.act(s,'secureWindow').ok,true);assert.ok(!/분/.test(Life.timeBand(s).label));
});
test('weekend choices move through morning afternoon evening and night',()=>{
 const s=stock();s.day=6;s.phase='morning';Life.arriveHome(s);assert.equal(Life.clock(s).text,'10:00');assert.equal(Life.timeBand(s).slots,4);
 Life.act(s,'laundry');assert.equal(Life.timeBand(s).label,'주말 오후');Life.act(s,'play');assert.equal(Life.timeBand(s).label,'해 질 무렵');Life.act(s,'prepare');assert.equal(Life.timeBand(s).label,'주말 저녁');Life.act(s,'rest');assert.equal(Life.timeBand(s).label,'잘 시간');assert.equal(Life.timeBand(s).remaining,0);
 assert.equal(Life.finishWork(s).reason,'weekend');
});
test('the prepared physical bag survives the night and still needs picking up',()=>{
 const s=stock();care(s);Life.act(s,'prepare');Life.act(s,'packBag');assert.equal(s.bagPrepared,true);Life.sleep(s,true);Life.finishNight(s);
 assert.equal(s.bagPacked,true);assert.equal(s.hasBag,false);Life.act(s,'dress');assert.equal(Life.act(s,'leaveHome').reason,'noBag');Life.act(s,'pickBag');assert.equal(Life.ready(s).ok,true);assert.equal(Life.workTask(s).prepared,true);
});
test('washing dishes uses one weekend activity slot and cannot be repeated',()=>{
 const s=stock();s.day=6;s.phase='morning';Life.arriveHome(s);assert.equal(Life.timeBand(s).used,0);
 assert.equal(Life.act(s,'dishes').ok,true);assert.equal(Life.timeBand(s).used,1);assert.equal(Life.timeBand(s).label,'주말 오후');
 const before=JSON.stringify(s);assert.equal(Life.act(s,'dishes').reason,'alreadyDone');assert.equal(JSON.stringify(s),before);
});
test('preparation is dated and cannot be repeated for a second reward',()=>{
 const s=stock();s.day=6;s.phase='morning';Life.arriveHome(s);Life.act(s,'prepare');assert.deepEqual(s.preparedDays,[8]);const before=JSON.stringify(s);assert.equal(Life.act(s,'prepare').reason,'alreadyPrepared');assert.equal(JSON.stringify(s),before);
});
test('finishing a normal shift advances to an actual evening instead of 09:05',()=>{
 const s=toDay(2);assert.equal(Life.clock(s).text,'09:00');Life.finishWork(s,{completed:true});assert.equal(Life.clock(s).text,'18:00');Life.arriveHome(s);assert.equal(Life.clock(s).text,'20:00');assert.equal(Life.timeBand(s).slots,2);
});
test('an unfinished task costs this evening and persists into the next shift',()=>{
 const s=toDay(2);Life.finishWork(s,{completed:false});assert.equal(s.work[0].status,'missed');assert.equal(s.issueQueue.filter(i=>!i.resolved).length,3);Life.arriveHome(s);assert.equal(Life.timeBand(s).slots,1);assert.equal(Life.clock(s).text,'21:00');
 s.day=3;s.phase='work';Life.finishWork(s,{completed:true});assert.equal(s.issueQueue.filter(i=>!i.resolved).length,0);assert.equal(s.flags.overtime,true);assert.equal(s.workMissed,1);
});
test('forgetting the bag has a visible late return even after successful work',()=>{
 const s=stock();s.day=2;s.phase='morning';Life.act(s,'dress');assert.equal(Life.act(s,'leaveHome').reason,'noBag');Life.act(s,'leaveHome',{borrowLaptop:true});s.phase='work';Life.finishWork(s,{completed:true});assert.equal(s.work[0].borrowedLaptop,true);assert.equal(s.work[0].extraMinutes,60);Life.arriveHome(s);assert.equal(Life.timeBand(s).slots,1);
});
test('choosing to finish the extra page today or tomorrow changes which evening is lost',()=>{
 const today=toDay(4),tomorrow=toDay(4);Life.finishWork(today,{completed:true,choice:'today'});Life.finishWork(tomorrow,{completed:true,choice:'tomorrow'});Life.arriveHome(today);Life.arriveHome(tomorrow);assert.equal(Life.timeBand(today).slots,1);assert.equal(Life.timeBand(tomorrow).slots,2);
 tomorrow.day=5;tomorrow.phase='work';Life.finishWork(tomorrow,{completed:true});Life.arriveHome(tomorrow);assert.equal(Life.timeBand(tomorrow).slots,1);
});
test('work cannot be replayed to erase missed tasks or produce money',()=>{
 const s=toDay(12),cash=s.cash;Life.finishWork(s,{completed:false});assert.equal(Life.finishWork(s,{completed:true}).alreadyDone,true);assert.equal(s.work.length,1);assert.equal(s.cash,cash);assert.equal(s.project.presented,false);
});
test('morning and evening food and water are genuinely different care periods',()=>{
 const s=stock();care(s);Life.act(s,'hoodie');Life.sleep(s,false);Life.finishNight(s);assert.equal(s.needs.fed,false);assert.equal(s.water,false);assert.equal(s.done.feed,undefined);
 morning(s);assert.equal(s.careLog.find(c=>c.day===1&&c.when==='morning').fed,true);Life.finishWork(s,{completed:true});Life.arriveHome(s);assert.equal(s.needs.fed,false);assert.equal(s.water,false);assert.equal(Life.act(s,'feed').ok,true);
});
test('night hunger is actionable but feeding at night does not consume breakfast or morning time',()=>{
 const s=stock();const night=Life.sleep(s,false);assert.deepEqual(night.night.wakeReasons,['hunger','thirst','calling']);const energy=s.energy;
 assert.equal(Life.actAtNight(s,'feed').ok,true);assert.equal(Life.actAtNight(s,'water').ok,true);assert.equal(s.morningMin,0);assert.equal(s.needs.fed,false);assert.equal(s.water,false);assert.equal(s.lastNight.nightCare.length,2);assert.equal(s.energy,energy);
 assert.equal(Life.actAtNight(s,'feed').reason,'alreadyDone');Life.finishNight(s);assert.equal(Life.actAtNight(s,'water').reason,'wrongPhase');assert.equal(Life.act(s,'feed').ok,true);
});
test('repeated missed meals cause visible concern withdrawal and an intervention ending',()=>{
 const s=stock();for(let n=0;n<3;n++){Life.sleep(s,false);if(s.phase==='ending')break;s.dressed=true;Life.act(s,'leaveHome',{borrowLaptop:true});if(s.phase==='ending')break;s.phase='work';Life.finishWork(s,{completed:true});Life.arriveHome(s);}
 assert.ok(s.careDebt>=5);assert.equal(s.flags.careConcern,true);assert.equal(s.flags.catWithdrawn,true);assert.equal(s.phase,'ending');assert.equal(Life.ending(s).key,'neglected');assert.match(Life.ending(s).lines.join(' '),/빈 그릇|사료와 물/);
});
test('feeding after an omission repairs concern rather than causing a delayed arbitrary loss',()=>{
 const s=stock();s.careDebt=3;s.flags.catWithdrawn=true;Life.act(s,'feed');assert.equal(s.careDebt,2);assert.equal(s.flags.catWithdrawn,false);s.needs.fed=false;Life.act(s,'feed');assert.equal(s.careDebt,1);assert.equal(s.flags.careConcern,false);assert.notEqual(Life.ending(s).key,'neglected');
});
test('a familiar cat bed allows a closed door without an automatic calling penalty',()=>{
 const s=stock();care(s);Life.act(s,'hoodie');Life.sleep(s,false);assert.equal(s.flags.nightCalling,false);assert.equal(s.nightIssue.playing,false);assert.deepEqual(s.lastNight.wakeReasons,[]);
});
test('storm discomfort and ordinary door choices have different causes',()=>{
 const s=stock();s.day=3;care(s);Life.sleep(s,false);assert.equal(s.lastNight.storm,true);assert.ok(s.lastNight.wakeReasons.includes('rain'));
 const quiet=stock();quiet.day=3;care(quiet);Life.act(quiet,'hoodie');Life.act(quiet,'secureWindow');Life.sleep(quiet,false);assert.equal(quiet.nightIssue.rain,false);
});
test('the roller remains owned and usable through the story without buying sheets',()=>{
 const s=stock();Life.act(s,'buyRoller');s.fur=15;Life.act(s,'startRoller');assert.equal(Life.act(s,'roll',{amount:10}).removed,10);Life.act(s,'stopRoller');Life.act(s,'startRoller');Life.act(s,'roll',{amount:99});assert.equal(s.fur,0);assert.equal(s.roller.owned,true);assert.equal(Life.act(s,'buyRoller').reason,'alreadyOwned');assert.equal(Life.act(s,'peelRoller').reason,'removedAction');
});
test('a two-week route feeds both mornings and evenings and reaches distinct final outcomes',()=>{
 const s=Life.create('하늘','보리');Life.act(s,'buyRoller');stock(s);Life.act(s,'hoodie');const office=[];
 for(let day=0;day<=12;day++){
  assert.equal(s.day,day);care(s);if(day===0)Life.act(s,'play');else{Life.act(s,day%2?'rest':'prepare');Life.act(s,'play');}if(day<12)Life.act(s,'packBag');if(day===3)Life.act(s,'secureWindow');Life.sleep(s,day%2===0);if(s.phase==='ending')break;
  Life.finishNight(s);if([6,7].includes(s.day)){Life.arriveHome(s);continue;}morning(s);office.push(s.day);Life.finishWork(s,{completed:true});Life.arriveHome(s);
 }
 assert.deepEqual(office,[1,2,3,4,5,8,9,10,11,12]);assert.equal(s.phase,'ending');assert.equal(s.project.presented,true);assert.equal(s.careDebt,0);assert.ok(s.cash>=0);assert.ok(s.strain<8);assert.equal(s.log.length,13);assert.equal(Life.ending(s).key,'settled');
 const failed=toDay(12);failed.workMissed=3;Life.finishWork(failed,{completed:true});assert.equal(failed.project.presented,false);assert.match(Life.ending(failed).lines[0],/빠뜨린/);
});
test('all team-lead lines use speech rather than report narration in an attributed voice',()=>{
 for(const item of Life.schedule.filter(d=>d.day>0&&!d.weekend)){const s=toDay(item.day);for(const l of Story.dialogue(s,'lead')){assert.equal(l.who,'팀장');assert.doesNotMatch(l.text,/했다\.$|한다\.$|들어갔다\.$|접속한다\.$/);}Life.finishWork(s,{completed:true});for(const l of Story.workReport(s))assert.doesNotMatch(l.text,/했다\.$|한다\.$|들어갔다\.$/);}
 assert.equal(Story.workChoice({day:4}).choices.length,2);assert.equal(Story.workChoice({day:5}),null);
});
