const {test}=require('node:test');
const assert=require('node:assert/strict');
const Life=require('../src/life-state.js');
const Story=require('../src/life-story.js');
function employed(){const s=Life.create('하늘','땅콩');Life.act(s,'buyFood');for(let i=0;i<3;i++)Life.winterShift(s,i);s.flags.employed=s.flags.routineIntroduced=true;return s;}
function morning(s){Life.act(s,'feed');Life.act(s,'water');Life.act(s,'play');Life.act(s,'litter');Life.sleep(s,true);Life.finishNight(s);return s;}
function workState(day=1){const s=employed();s.day=day;s.phase='morning';s.minute=440;Life.act(s,'packBag');Life.act(s,'pickBag');Life.act(s,'dress');Life.act(s,'feed');Life.act(s,'water');Life.act(s,'leaveHome');return s;}
function consult(s,c,wrong=false){assert.ok(Life.beginConsultation(s,c).ok);for(const answer of c.correct)Life.answerConsultation(s,wrong?1-answer:answer);return s.consultations.at(-1);}

test('12,000원에서 사료를 사고 겨울에는 실제 단기 수입과 지출을 이어 간다',()=>{
 const s=Life.create('하늘','땅콩');assert.equal(s.cash,12000);assert.equal(Life.act(s,'buyFavorite').reason,'notEnoughCash');assert.ok(Life.act(s,'buyFood').ok);assert.equal(s.cash,0);assert.equal(s.food,8);
 for(let i=0;i<3;i++){const before=s.cash;assert.ok(Life.winterShift(s,i).ok);assert.equal(s.cash,before+Life.winter[i].income-Life.winter[i].food-Life.winter[i].living);assert.equal(Life.winterShift(s,i).ok,false);}
 assert.equal(s.cash,28000);assert.equal(Life.summary(s).income,292000);assert.equal(12000+Life.summary(s).income-Life.summary(s).spent,s.cash);
});
test('이름의 받침과 호격·주격을 저장된 이름에 맞춘다',()=>{
 assert.equal(Life.josa('땅콩','call'),'땅콩아');assert.equal(Life.josa('땅콩','subject'),'땅콩이가');assert.equal(Life.josa('사라','call'),'사라야');assert.equal(Life.josa('사라','subject'),'사라가');assert.equal(Life.josa('안녕','topic'),'안녕이는');assert.equal(Life.create('  하늘  ',' 땅콩 ').cat,'땅콩');
});
test('정확한 응대·복장·피로가 계약과 오늘 입금을 결정한다',()=>{
 const good=workState(),customers=Story.customers(good);customers.slice(0,2).forEach(c=>assert.equal(consult(good,c).contract,true));const r=Life.finishWork(good);assert.equal(r.work.contracts,2);assert.equal(r.work.income,32000);assert.equal(good.minute,1080);
 const dirty=workState();dirty.clothesFur.suit=8;assert.equal(consult(dirty,Story.customers(dirty)[0]).contract,false);assert.match(dirty.consultations[0].reasons.join(''),/정장.*털/);assert.equal(Life.finishWork(dirty).work.income,8000);
 const tired=workState();tired.energy=0;assert.match(consult(tired,Story.customers(tired)[0]).reasons.join(''),/잠이 부족/);
 const wrong=workState();assert.match(consult(wrong,Story.customers(wrong)[0],true).reasons.join(''),/다른 보장/);
});
test('미완료는 자동완료되지 않고 저장·재정산에도 중복 입금이 없다',()=>{
 let s=workState(),list=Story.customers(s);consult(s,list[0]);Life.beginConsultation(s,list[1]);Life.answerConsultation(s,list[1].correct[0]);const before=s.cash;const first=Life.finishWork(s);assert.equal(first.work.consultations,1);assert.equal(first.work.missing,1);assert.equal(first.work.income,16000);assert.equal(s.cash,before+16000);
 s=JSON.parse(JSON.stringify(s));const cash=s.cash;assert.equal(Life.finishWork(s).alreadyDone,true);assert.equal(s.cash,cash);assert.equal(s.transactions.filter(t=>t.id==='wage:1').length,1);
});
test('추가 상담은 수당과 퇴근·귀가 시각을 함께 바꾼다',()=>{
 const a=workState(4),b=workState(4);Story.customers(a).slice(0,2).forEach(c=>consult(a,c));Story.customers(b).forEach(c=>consult(b,c));Life.finishWork(a);Life.finishWork(b);assert.equal(b.work[0].income-a.work[0].income,16000);assert.equal(b.minute-a.minute,60);Life.arriveHome(a);Life.arriveHome(b);assert.equal(a.minute,1120);assert.equal(b.minute,1180);assert.equal(Life.clock(a).text,'18:40');assert.equal(Life.clock(b).text,'19:40');
 const before=b.cash;Life.arriveHome(b);assert.equal(b.cash,before);assert.equal(b.transactions.filter(t=>t.id==='living:4').length,1);
});
test('아침·저녁 밥, 하루 물 교체와 잔량, 모래의 누적·수습을 구분한다',()=>{
 const s=workState();assert.equal(Life.act(s,'feed').reason,'wrongPhase');Life.finishWork(s);Life.arriveHome(s);assert.equal(s.needs.fed,false);assert.equal(s.waterChangedDay,1);assert.ok(s.waterLevel>0);assert.equal(Life.act(s,'water').reason,'alreadyDone');assert.ok(Life.act(s,'feed').ok);const food=s.food;assert.equal(Life.act(s,'feed').reason,'alreadyDone');assert.equal(s.food,food);assert.ok(s.litterDirty>0);assert.ok(Life.act(s,'litter').ok);assert.equal(s.litterDirty,0);assert.equal(Life.act(s,'litter').reason,'alreadyDone');
});
test('주말에는 출근·수당 없이 아침과 저녁 밥을 각각 줄 수 있다',()=>{
 const s=employed();s.day=6;s.phase='morning';s.minute=440;Life.arriveHome(s);const cash=s.cash;Life.act(s,'feed');assert.equal(s.meals.morning,true);Life.act(s,'afternoon');assert.equal(s.minute,1080);assert.equal(s.needs.fed,false);Life.act(s,'feed');assert.equal(s.meals.evening,true);assert.equal(Life.act(s,'leaveHome').ok,false);assert.equal(Life.finishWork(s).ok,false);assert.equal(s.cash,cash);
});
test('가방 내용과 옷별 털·문·커튼은 밤과 출퇴근을 지나 보존된다',()=>{
 const s=employed();Life.act(s,'packBag');Life.act(s,'pet');const fur=s.clothesFur.hoodie;Life.act(s,'secureWindow');morning(s);assert.deepEqual(s.bagContents,['laptop','charger']);assert.equal(s.bagPacked,true);assert.equal(s.doorOpen,true);assert.equal(s.curtainClosed,true);assert.ok(s.clothesFur.hoodie>=fur);assert.equal(s.clothesFur.suit,0);
 Life.act(s,'dress');Life.act(s,'pet');assert.equal(s.clothesFur.suit,4);Life.act(s,'pickBag');Life.act(s,'leaveHome');Life.finishWork(s);Life.arriveHome(s);assert.equal(s.dressed,true);assert.equal(s.suitStored,false);Life.act(s,'storeSuit');assert.equal(s.dressed,false);assert.equal(s.suitStored,true);assert.equal(s.clothesFur.suit,4);assert.equal(s.bagPacked,true);assert.equal(Life.act(s,'packBag').reason,'alreadyDone');
});
test('돌돌이는 3분 투자로 털을 없애며 소모품 횟수를 세지 않는다',()=>{
 const s=workState();s.phase='morning';s.minute=470;s.clothesFur.suit=s.fur=12;Life.act(s,'buyRoller');const before=s.cash;Life.act(s,'startRoller');Life.act(s,'roll',{amount:30});Life.act(s,'stopRoller');assert.equal(s.fur,0);assert.equal(s.clothesFur.suit,0);assert.equal(s.minute,473);assert.equal(s.cash,before);assert.equal(s.roller.owned,true);
});
test('놀이 누락·배고픔·비·더러운 모래가 각각 밤 반응과 피로에 남는다',()=>{
 const s=employed();s.day=3;s.food=5;s.waterLevel=0;s.litterDirty=4;const r=Life.sleep(s,true);assert.deepEqual(r.night.wakeReasons,['thirst','hunger','litter','rain','play']);assert.equal(s.energy,0);assert.equal(s.phase,'morning');
 const n=employed();n.day=3;Life.act(n,'feed');Life.act(n,'water');Life.act(n,'play');Life.act(n,'secureWindow');Life.act(n,'litter');assert.deepEqual(Life.sleep(n,true).night.wakeReasons,[]);assert.equal(n.energy,3);
});
test('누락은 갑작스러운 엔딩이 아니며 새벽 돌봄은 다음 아침 밥으로 계산하지 않는다',()=>{
 const s=employed();s.careDebt=9;s.waterLevel=1;Life.sleep(s,false);assert.equal(s.phase,'morning');const food=s.food,cash=s.cash;assert.ok(Life.actAtNight(s,'feed').ok);assert.equal(s.food,food-1);assert.equal(s.needs.fed,false);assert.equal(s.minute,476);assert.equal(s.cash,cash);assert.equal(s.lastNight.nightCare[0].type,'feed');Life.finishNight(s);assert.equal(Life.actAtNight(s,'feed').ok,false);
});
test('돈 부족은 구매·사료를 바꾸지 않으며 한 끼 포장이 회복 경로다',()=>{
 const s=employed();s.cash=3000;s.food=0;assert.equal(Life.act(s,'buyFood').ok,false);assert.equal(s.food,0);assert.equal(s.cash,3000);assert.ok(Life.act(s,'smallFood').ok);assert.ok(Life.act(s,'feed').ok);assert.equal(s.cash,0);assert.equal(s.food,0);
});
test('첫 근무 기간 마지막 결산은 이미 받은 수입을 다시 지급하지 않는다',()=>{
 const s=workState(12);Story.customers(s).slice(0,2).forEach(c=>consult(s,c));Life.finishWork(s);Life.arriveHome(s);Life.act(s,'feed');Life.act(s,'water');Life.act(s,'play');Life.act(s,'litter');const cash=s.cash;Life.sleep(s,false);assert.equal(s.phase,'ending');const end=Life.ending(s);assert.equal(s.cash,cash);assert.equal(end.summary.earned,32000);assert.equal(end.summary.contracts,2);assert.match(end.lines.join(''),/슈퍼/);assert.match(end.lines.at(-1),/방문을 닫았다/);
});
module.exports={employed,workState,consult};


test('놀이만 빠뜨린 밤도 다음 아침에 피곤함으로 표시되며 돌봄한 밤과 구별된다',()=>{
 const s=employed();Life.act(s,'feed');Life.act(s,'water');Life.sleep(s,true);assert.deepEqual(s.lastNight.wakeReasons,['play']);assert.equal(Life.fatigue(s),'tired');
});


test('R5 현재 옷에 따라 반복 쓰다듬기의 털·대사가 바뀌고 정장은 실제 갈아입어야 벗는다',()=>{
 const s=employed();s.phase='morning';Life.act(s,'dress');const one=Life.act(s,'pet');assert.match(one.message,/정장에 털/);assert.equal(s.clothesFur.suit,4);const two=Life.act(s,'pet');assert.equal(two.ok,true);assert.equal(s.clothesFur.suit,8);Life.act(s,'storeSuit');const three=Life.act(s,'pet');assert.match(three.message,/후드티에 털/);assert.equal(s.clothesFur.hoodie,4);assert.equal(s.clothesFur.suit,8);
});
