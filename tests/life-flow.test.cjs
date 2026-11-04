const {test}=require('node:test'),assert=require('node:assert/strict');
const {game,Life,Story,fixture,read,care,play,buy,bed,commute,consult,settle,SAVE_KEY}=require('./r5-helpers.cjs');

test('미완료 상담을 저장해 이어서 응대하고 미완료 수당·중복 입금을 막는다',async()=>{
 const s=fixture(2,'work'),customer=Story.customers(s)[0];Life.beginConsultation(s,customer);Life.answerConsultation(s,customer.correct[0]);const g=await game({state:s,scene:'office'});assert.equal(g.snap().state.currentConsultation.step,1);read(g,()=>customer.correct[1]);g.step(2);read(g);g.target('팀장에게');read(g);g.target('팀장에게');read(g,'남기고 정산');assert.equal(g.snap().state.work[0].missing,1);assert.equal(g.snap().state.work[0].income,24000);const cash=g.snap().state.cash;g.click('menuButton');g.click('saveExitButton');g.click('continueButton');assert.equal(g.snap().state.cash,cash);assert.equal(g.snap().state.transactions.filter(t=>t.id==='wage:2').length,1);
});

test('저장한 이름·옷·물건·문을 유지하고 초기화는 두 번째 확인 후 실행한다',async()=>{
 const s=fixture();s.cat='사라';s.bagPacked=true;s.bagContents=['laptop','charger'];s.doorOpen=false;s.curtainClosed=true;s.clothesFur.hoodie=7;s.fur=7;const g=await game({state:s,scene:'bedroom'});g.click('menuButton');g.click('saveButton');g.click('saveExitButton');g.click('continueButton');assert.equal(g.snap().state.cat,'사라');assert.deepEqual(g.snap().state.bagContents,['laptop','charger']);assert.equal(g.snap().state.fur,7);assert.equal(g.snap().doorOpen,false);g.click('menuButton');g.click('newGameButton');assert.ok(g.storage.has(SAVE_KEY));g.click('newGameButton');assert.equal(g.storage.has(SAVE_KEY),false);
});

test('최종 통합 회귀: 주말과 근무 10일·매일 직접 돌봄·마지막 슈퍼/문·중복 없는 결산',async()=>{
 const s=fixture();s.bagPacked=true;s.bagContents=['laptop','charger'];s.roller.owned=true;s.hoodie=true;const g=await game({state:s});care(g);play(g);bed(g,true);const seen=new Set();
 for(let round=0;round<13&&g.snap().state.phase!=='ending';round++){
  const day=g.snap().state.day;seen.add(day);read(g);care(g);
  if([6,7].includes(day)){g.target('낮을 느긋하게');read(g);care(g);play(g);bed(g,day===7);continue;}
  commute(g);consult(g);consult(g);settle(g);g.toRoom('bedroom');g.target('정장을 벗고');read(g);
  if(g.snap().state.food<2){g.toRoom('living');g.target('슈퍼에 다녀');buy(g);g.target('장보기를 마치고',2);read(g);}
  care(g);if(day===3){g.target('흔들리는 창문');g.drag([400,170],[560,170],1.5);read(g,'내 일을');}play(g);g.toRoom('living');g.target('소파에서 쉰다');read(g);bed(g,day%2===0);
 }
 read(g);assert.equal(g.snap().shopMode,'final');assert.equal(g.snap().state.work.length,10);assert.equal(g.snap().state.transactions.filter(t=>t.id.startsWith('wage:')).length,10);assert.ok(seen.has(6)&&seen.has(7));assert.equal(g.snap().state.log.length,13);assert.equal(g.snap().state.bagPacked,true);g.target('장보기를 마치고',2);read(g);g.button('miniActions','이대로 잠들기',3);read(g);assert.equal(g.get('endingScreen').hidden,false);assert.match(g.get('endingText').textContent,/계약 20건/);
});
