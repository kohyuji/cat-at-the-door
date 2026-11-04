const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const L=require('../src/life-state.js'),Story=require('../src/life-story.js');
function simulate(policy,{extraDays=[],extraCareDays=[]}={}){
 const s=L.create('하늘','보리');L.act(s,'buyFood');L.act(s,'feed');L.act(s,'water');for(let i=0;i<3;i++)L.winterShift(s,i);
 Object.assign(s,{phase:'evening',minute:1200,needs:{fed:false,played:false,comfort:false},meals:{morning:false,evening:false},water:false,waterLevel:0,waterChangedDay:null});
 const rows=[],failures=[];let row;
 const act=(type,opts)=>{const r=L.act(s,type,opts);if(r.ok){if(row)row.actions.push({type,minutes:r.minutes,cost:r.cost.cash});}else failures.push({day:s.day,type,reason:r.reason});return r;};
 const food=()=>{if(s.food<=1&&s.cash>=12000)act('buyFood');if(!s.food&&s.cash>=3000)act('smallFood');};
 const play=()=>{if(s.toy.basic<=0&&(!s.equipment.premiumToy||s.toy.premium<=0))act('replaceToy');act('play');};
 const investments=()=>{if(policy==='punctual')return;if(!s.roller.owned&&s.cash>=4000)act('buyRoller');if(policy!=='priority')return;const next=['premiumToy','autoLitter','fountain','feeder','robot'].find(k=>!s.equipment[k]);if(next&&s.cash>=L.EQUIPMENT[next].price+(s.day===12&&s.food>=2?0:6000))act('buyEquipment',{id:next});};
 const supplies=()=>{if(s.equipment.feeder&&s.supplies.feeder<=1){food();act('refillFeeder');}if(s.equipment.fountain&&s.supplies.fountain<=1)act('refillFountain');if(s.equipment.autoLitter&&s.bins.litter>=6)act('emptyAutoLitter');if(s.equipment.robot&&s.bins.robot>=4)act('emptyRobot');};
 for(let day=0;day<=12;day++){
  assert.equal(s.day,day);row={day,date:Story.days[day].date,actions:[],income:0,late:0,purchases:[]};rows.push(row);
  if(day>0){
   row.wake=L.clock(s).text;
   if([6,7].includes(day))L.arriveHome(s);
   else{
    if(policy!=='neglect'){
     food();supplies();if(!s.needs.fed)act('feed');if(!s.equipment.fountain&&s.waterChangedDay!==s.day&&(policy==='manual'||s.waterLevel<=1))act('water');if(!s.equipment.autoLitter&&policy==='manual')act('litter');
     if(policy==='manual'){act('sweep');act('mop');act('makeBed');act('pet');play();}
    }
    act('dress');
    // The runtime's open-door leg rub is a visible, deterministic contact.
    if(s.doorOpen&&!s.hoodie){s.clothesFur.suit=Math.min(16,s.clothesFur.suit+2);s.fur=s.clothesFur.suit;}
    if(s.clothesOdor.suit>=2&&policy!=='neglect'&&policy!=='punctual')act('freshen');
    if(s.roller.owned&&s.fur&&policy!=='neglect'&&policy!=='punctual'){act('startRoller');act('roll',{amount:s.fur});act('stopRoller');}
    if(!s.bagPacked)act('packBag');act('pickBag');row.departure=L.clock(s).text;assert.ok(act('leaveHome').ok);row.late=s.flags.lateMinutes;
    for(const c of Story.customers(s).slice(0,extraDays.includes(day)?3:2)){L.beginConsultation(s,c);for(const a of c.correct)L.answerConsultation(s,a);}
    const work=L.finishWork(s).work;row.income=work.income;row.contracts=work.contracts;row.workReasons=work.reasons;L.arriveHome(s);
   }
  }
  if(!s.bagPacked)act('packBag');if(s.dressed)act('storeSuit');food();
  if(policy==='neglect'){if(s.food)act('feed');}
  else{
   investments();supplies();if(!s.needs.fed)act('feed');if(!s.equipment.fountain&&s.waterChangedDay!==s.day)act('water');
   if(['priority','efficient','punctual'].includes(policy)){
    if(!s.needs.played)play();if(s.floor.fur>=4&&!s.equipment.robot)act('sweep');if(s.floor.dust>=4&&!s.equipment.robot)act('mop');if(s.odor>=2&&day!==3)act('ventilate');if(s.litterDirty&&!s.equipment.autoLitter)act('litter');if(L.fatigue(s)!=='normal')act('rest');
   }
   if(day===3){act('secureWindow');act('calmRain');}
  }
  if(day===4){s.flags.hoodieEvent=true;if(['priority','efficient','punctual'].includes(policy))act('hoodie');}
  if([6,7].includes(day)){act('afternoon');food();supplies();if(!s.needs.fed)act('feed');if((['priority','efficient','punctual'].includes(policy))&&!s.needs.played)play();}
  if(extraCareDays.includes(day))act('pet');row.readyAt=L.clock(s).text;row.freeMinutes=Math.max(0,1380-s.minute);row.food=s.food;row.bedLate=Math.max(0,s.minute-1380);s.minute=Math.max(1320,s.minute);row.bedtime=L.clock(s).text;row.floor={...s.floor};row.odor=s.odor;row.cash=s.cash;row.equipment=Object.keys(s.equipment).filter(k=>s.equipment[k]);
  const night=L.sleep(s,true).night;row.wakes=night.wakeReasons;row.sleepEnergy=night.energyAfter;row.purchases=s.transactions.filter(t=>t.day===day&&t.type==='purchase'&&!t.id.startsWith('winter:'));row.minutes=row.actions.reduce((n,a)=>n+(a.minutes||0),0);
 }
 assert.equal(s.work.length,10);assert.ok(s.cash>=0);return{policy,rows,summary:{...L.summary(s),lateDays:rows.filter(r=>r.late>0).length,lateMinutes:rows.reduce((n,r)=>n+r.late,0),wakeNights:rows.filter(r=>r.wakes.length).length,houseworkMinutes:rows.reduce((n,r)=>n+r.minutes,0)},failures};
}
if(require.main===module){const results=['neglect','manual','efficient','punctual','priority'].map(p=>simulate(p));const stress=['efficient','priority'].map(p=>simulate(p,{extraDays:[1,2,3,4,5,8,9,10,11,12]}));const extraCare=simulate('efficient',{extraDays:[1,2,3,4,5,8,9,10,11,12],extraCareDays:[2]});const out=path.join(__dirname,'../.preview/r6-balance.json');fs.writeFileSync(out,JSON.stringify({rules:{durations:L.DURATIONS,equipment:L.EQUIPMENT,economy:L.ECONOMY},results,stress,extraCare},null,2));console.log(JSON.stringify(results.map(r=>({policy:r.policy,...r.summary,equipment:r.rows.at(-1).equipment})),null,2));}
module.exports={simulate};
