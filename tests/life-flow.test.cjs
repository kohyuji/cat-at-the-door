const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game,SAVE_KEY}=require('./game-harness.cjs');
const Life=require('../src/life-state.js'),Story=require('../src/life-story.js');
function state(day=0,phase='evening'){
 const s=Life.create('하늘','땅콩');Life.act(s,'buyFood');for(let i=0;i<3;i++)Life.winterShift(s,i);s.flags.employed=s.flags.routineIntroduced=true;s.flags['learned:feed']=s.flags['learned:water']=s.flags['learned:litter']=true;s.day=day;s.phase=phase;s.minute=phase==='morning'?440:phase==='work'?540:1200;return s;
}
function read(g,choose){
 for(let i=0;i<120&&g.snap().dialogue;i++){
  g.step(.4);const buttons=g.get('choices').children;
  if(buttons.length){let b;if(typeof choose==='function')b=buttons[choose(g.snap())];else b=choose?Array.from(buttons).find(b=>b.textContent.includes(choose)):buttons[0];assert.ok(b,'dialogue choice '+choose);b.onclick();}else g.key('Enter');
 }
 g.step(.4);if(g.snap().dialogue)read(g,choose);
}
function black(g){for(let i=0;i<30&&g.snap().black;i++){g.step(.4);g.key('Enter');}g.step(.5);}
function message(g){g.click('phoneButton');g.button('phoneBody','메시지');g.button('phoneBody','담당자');g.button('phoneBody','내려놓는다');}
function buy(g,label='건사료 12,000'){g.target(label);read(g,'산다');read(g);}
function care(g){g.toRoom('living');if(!g.snap().state.needs.fed){g.target('밥그릇');if(g.snap().mini==='feed')g.drag([180,170],[385,155],3.5);read(g);}if(g.snap().state.waterChangedDay!==g.snap().state.day){g.target('물그릇');if(g.snap().mini==='water')g.drag([180,170],[385,155],3.5);read(g);}if(g.snap().state.litterDirty){g.target('모래를');if(g.snap().mini==='litter'){g.pointer('pointerdown',160,160);for(const [x,y] of [[245,185],[293,185],[341,185],[389,185]])g.pointer('pointermove',x,y);g.pointer('pointerup',389,185);g.step(1.2);}read(g);}}
function pet(g){g.target('쓰다듬');g.pointer('pointerdown',280,235);for(let i=0;i<12;i++){g.pointer('pointermove',i%2?280:430,235);g.step(.22);}g.pointer('pointerup',430,235);g.step(1.8);read(g);}
function play(g){g.toRoom('living');g.target('쥐 인형으로');g.drag([330,235],[460,245],4);read(g);}
function sleep(g,open){g.toRoom('bedroom');g.target('잠자리에');if(g.snap().ack)g.ack('오늘은 그대로');g.key(open?'ArrowRight':'ArrowLeft');g.button('miniActions','이대로 잠들기',5);g.step(.8);if(g.snap().catControl){if(g.snap().guideId==='catopen')g.target('앞발로 열린',3);else if(g.snap().guideId==='catscent')g.target('옷 냄새',3);else{g.target('문을 앞발');g.target('쥐 인형을 문다');g.target('인형을 문 앞',3);}}if(g.snap().nightScene){read(g,'다시 눕는다');g.step(3);}read(g);g.clearAck();}
function startOffice(g){g.toRoom('bedroom');g.target('출근복');read(g);if(!g.snap().state.bagPacked){g.target('가방을');for(const i of g.snap().items)g.drag([i.x,i.y],[455,245],.15);g.step(1.6);}if(!g.snap().state.hasBag)g.target('가방을 집는다');g.toRoom('living');g.target('신발을 신고');if(g.snap().ack)g.ack('오늘은 그냥');g.step(1);if(g.snap().scene==='station')g.target('열차에 탄다',5);assert.equal(g.snap().scene,'office');g.target('팀장에게');read(g);}
function consult(g){g.target('내 자리');read(g,snap=>{const c=Story.customers(snap.state).find(c=>c.id===snap.state.currentConsultation.id);return c.correct[snap.state.currentConsultation.step];});g.step(2);read(g);}
function settle(g,overtime=false){g.target('내 자리');read(g,overtime?'추가 고객':'정산한다');if(overtime){read(g,snap=>{const c=Story.customers(snap.state).find(c=>c.id===snap.state.currentConsultation.id);return c.correct[snap.state.currentConsultation.step];});g.step(2);read(g);g.target('내 자리');read(g);}assert.equal(g.snap().state.phase,'afterWork');g.target('퇴근한다',2);assert.equal(g.snap().scene,'shop');g.target('장보기를 마치고',2);read(g);}

test('시작 전 오디오는 만들지 않으며 블랙 한 줄씩과 문자 앱을 직접 거쳐 불합격을 읽는다',async()=>{
 const g=await game(null,{autoStart:false});assert.equal(g.audio.constructors,0);g.start();assert.equal(g.snap().intro,'black');assert.equal(g.snap().state.cash,12000);assert.equal(g.snap().black.index,0);g.step(.4);g.key('Enter');const index=g.snap().black.index;g.key('Enter');assert.equal(g.snap().black.index,index,'빠른 중복 입력이 다음 줄을 건너뛰지 않는다');black(g);assert.equal(g.snap().intro,'bedPhone');assert.equal(g.get('phoneButton').hidden,false);message(g);read(g);assert.equal(g.snap().intro,'meet');assert.equal(g.snap().scene,'street');assert.equal(g.audio.constructors,1);g.click('soundButton');const n=g.audio.starts;g.step(3);assert.equal(g.audio.starts,n);
});
test('구조·진열대 구매·이름·첫 돌봄·같이 잠·겨울 생계·봄 합격을 입력으로 연결한다',async()=>{
 const g=await game();black(g);message(g);read(g);g.target('고양이에게');read(g);g.drag([190,150],[320,150],2.4);read(g);assert.equal(g.snap().intro,'sheltered');g.target('슈퍼에 들어');assert.equal(g.snap().scene,'shop');g.target('습식 사료');read(g,'산다');read(g);assert.equal(g.snap().state.cash,12000);assert.equal(g.snap().intro,'sheltered');buy(g);g.step(1);assert.equal(g.snap().intro,'name');g.get('catName').value='안녕';g.get('nameForm').onsubmit({preventDefault(){}});read(g);g.target('밥그릇');g.drag([180,170],[385,155],3.5);read(g);g.target('물그릇');g.drag([180,170],[385,155],3.5);read(g);pet(g);assert.equal(g.snap().scene,'living');assert.equal(g.snap().intro,'furLook');assert.ok(g.snap().state.clothesFur.hoodie>0);g.target('침실로');read(g);g.target('잠자리에',5);assert.equal(g.snap().state.doorOpen,true);
 for(let i=0;i<20&&g.snap().intro!=='offer';i++){if(g.snap().black)black(g);g.step(2.5);read(g);}
 assert.equal(g.snap().intro,'offer');assert.equal(g.snap().state.winterStep,3);assert.equal(g.snap().state.cash,28000);message(g);read(g);assert.equal(g.snap().intro,'');assert.equal(g.snap().state.cat,'안녕');assert.equal(g.snap().state.flags.employed,true);assert.ok(g.paint.drawImage>0);
});
test('어두운 상품 선택은 실행 묘사 없이 멈추며 슈퍼 앞에서 다시 선택한다',async()=>{
 const g=await game({state:Life.create('하늘','땅콩'),scene:'shop',intro:'sheltered',shopMode:'intro'});g.target('번개탄');assert.match(g.snap().dialogue.text,/다시 선택/);read(g,'다시 시작');assert.equal(g.snap().scene,'street');assert.equal(g.snap().state.cash,12000);assert.equal(g.snap().state.food,0);
});
test('회사에서 두 단계 상담을 직접 하고 일일 정산 뒤 진열대를 거쳐 귀가한다',async()=>{
 const s=state(2,'work');s.dressed=true;s.bagPacked=s.hasBag=true;const g=await game({state:s,scene:'office'});g.target('팀장에게');read(g);consult(g);assert.equal(g.snap().state.consultations.length,1);assert.equal(g.snap().state.work.length,0);consult(g);settle(g);assert.equal(g.snap().scene,'living');assert.equal(g.snap().state.work[0].consultations,2);assert.equal(g.snap().state.work[0].income,48000);assert.equal(g.snap().state.minute,1120);assert.equal(g.snap().state.dressed,false);
});
test('저장된 진행 중 상담은 남은 응대부터 계속하며 정산 입금은 한 번이다',async()=>{
 const s=state(2,'work'),c=Story.customers(s)[0];Life.beginConsultation(s,c);Life.answerConsultation(s,c.correct[0]);const g=await game({state:s,scene:'office'});assert.equal(g.snap().state.currentConsultation.step,1);read(g,snap=>Story.customers(snap.state)[0].correct[1]);g.step(2);read(g);assert.equal(g.snap().state.consultations.length,1);g.target('팀장에게');read(g);g.target('팀장에게');read(g,'남기고 정산');assert.equal(g.snap().state.work[0].missing,1);const cash=g.snap().state.cash;g.click('menuButton');g.click('saveButton');g.click('saveExitButton');g.click('continueButton');assert.equal(g.snap().state.cash,cash);assert.equal(g.snap().state.transactions.filter(t=>t.id==='wage:2').length,1);
});
test('놀이 표시와 실제 장난감 입력이 일치하고 누르지 않은 이동은 장난감을 바꾸지 않는다',async()=>{
 const s=state();const g=await game({state:s});g.target('쥐 인형으로');const before=g.snap().mini;g.pointer('pointermove',500,250);g.step(1);assert.equal(g.snap().state.needs.played,false);assert.equal(g.snap().mini,before);g.drag([330,235],[460,245],4);assert.equal(g.snap().state.needs.played,true);assert.equal(g.snap().state.minute,1230);assert.equal(g.snap().mini,undefined);
});
test('문 방향키·단일 잠들기·다시 열기와 모든 경로의 고양이 시점을 연결한다',async()=>{
 const s=state();Life.act(s,'feed');Life.act(s,'water');Life.act(s,'play');const g=await game({state:s,scene:'bedroom'});g.target('잠자리에');assert.equal(g.get('miniActions').children.length,1);assert.equal(g.get('miniActions').children[0].textContent,'이대로 잠들기');g.key('ArrowLeft');assert.equal(g.snap().miniDoor,0);g.button('miniActions','이대로 잠들기',1);assert.equal(g.get('reopenDoor').hidden,false);g.click('reopenDoor',5);assert.equal(g.snap().doorOpen,true);assert.equal(g.snap().catControl,true);g.target('앞발로 열린',3);read(g);assert.equal(g.snap().state.day,1);assert.equal(g.snap().doorOpen,true);assert.equal(g.snap().state.flags.catOpenTrace,true);
 const closed=await game({state:s,scene:'bedroom'});sleep(closed,false);assert.equal(closed.snap().state.flags.toyAtDoor,true);assert.equal(closed.snap().doorOpen,false);
});
test('빈 사료·구매 실패·한 끼 구매 뒤 밥 주기로 수습하며 모래도 실제로 제거한다',async()=>{
 const s=state();s.cash=3000;s.food=0;s.litterDirty=3;s.flags.foodLowAcknowledged=true;delete s.flags['learned:litter'];const g=await game({state:s});g.target('밥그릇');buy(g);assert.equal(g.snap().state.food,0);buy(g,'건사료 한 끼');assert.equal(g.snap().state.food,1);g.target('장보기를 마치고',2);care(g);assert.equal(g.snap().state.needs.fed,true);assert.equal(g.snap().state.litterDirty,0);assert.equal(g.snap().state.cash,0);
});
test('비·커튼 조작이 상태에 남고 완료한 밥·물 유도는 사라진다',async()=>{
 const s=state(3);const g=await game({state:s});care(g);g.target('흔들리는 창문');g.drag([400,170],[560,170],1.5);read(g,'내 일을');assert.equal(g.snap().state.curtainClosed,true);assert.equal(g.snap().state.windowClosed,true);assert.equal(g.snap().state.waterChangedDay,3);const labels=g.get('hotspots').children.map(n=>n.getAttribute('aria-label'));assert.equal(labels.some(x=>x.includes('밥그릇')),false);assert.equal(labels.some(x=>x.includes('물그릇')),false);
});
test('마지막 날 결산은 첫 슈퍼와 마지막 문을 거쳐 수입을 재지급하지 않고 끝난다',async()=>{
 const s=state(12);Life.act(s,'feed');Life.act(s,'water');Life.act(s,'play');const cash=s.cash,g=await game({state:s,scene:'bedroom'});g.target('잠자리에');g.button('miniActions','이대로 잠들기',5);read(g);assert.equal(g.snap().shopMode,'final');assert.equal(g.snap().scene,'shop');read(g);g.target('장보기를 마치고',2);read(g);assert.equal(g.snap().mini,'bed');g.key('ArrowLeft');g.button('miniActions','이대로 잠들기',3);read(g);assert.equal(g.get('endingScreen').hidden,false);assert.equal(g.snap().state.cash,cash);assert.match(g.get('endingText').textContent,/근무 수입|매일 받은/);assert.equal(JSON.parse(g.storage.get(SAVE_KEY)).finished,true);
});


test('정상 경로는 주말과 열 근무일·일일 입금·마지막 슈퍼를 끝까지 연결한다',async()=>{
 const s=state();s.bagPacked=true;s.bagContents=['laptop','charger'];s.roller.owned=true;s.hoodie=true;
 const g=await game({state:s,scene:'living'});care(g);play(g);sleep(g,true);
 const seen=new Set();
 for(let round=0;round<13&&g.snap().state.phase!=='ending';round++){
  const day=g.snap().state.day;seen.add(day);read(g);care(g);
  if([6,7].includes(day)){
   g.target('낮을 느긋하게');read(g);care(g);play(g);sleep(g,day===7);continue;
  }
  startOffice(g);consult(g);consult(g);settle(g);
  if(g.snap().state.food<2){g.target('슈퍼에 다녀');buy(g);g.target('장보기를 마치고',2);read(g);}
  care(g);
  if(day===3){g.target('흔들리는 창문');g.drag([400,170],[560,170],1.5);read(g,'내 일을');}
  play(g);g.toRoom('living');g.target('소파에서 쉰다');read(g);sleep(g,day%2===0);
 }
 read(g);assert.equal(g.snap().shopMode,'final');assert.equal(g.snap().state.work.length,10);assert.equal(g.snap().state.transactions.filter(t=>t.id.startsWith('wage:')).length,10);assert.ok(seen.has(6)&&seen.has(7));assert.equal(g.snap().state.log.length,13);assert.equal(g.snap().state.bagPacked,true);
 g.target('장보기를 마치고',2);read(g);g.button('miniActions','이대로 잠들기',3);read(g);assert.equal(g.get('endingScreen').hidden,false);assert.match(g.get('endingText').textContent,/계약 20건/);
});



test('추가 상담을 직접 완료하면 실제 수당과 19시 퇴근·19시40분 귀가가 된다',async()=>{
 const s=state(4,'work');s.dressed=true;const g=await game({state:s,scene:'office'});g.target('팀장에게');read(g);consult(g);consult(g);g.target('내 자리');
 read(g,snap=>snap.state.currentConsultation?Story.customers(snap.state)[2].correct[snap.state.currentConsultation.step]:0);g.step(2);read(g);g.target('내 자리');read(g);assert.equal(g.snap().state.work[0].income,72000);assert.equal(g.snap().state.minute,1140);g.target('퇴근한다',2);g.target('장보기를 마치고',2);read(g);assert.equal(g.snap().state.minute,1180);
});

test('새벽 밥 수습은 아침 밥·시각과 구별되고 저장 후 이어갈 수 있다',async()=>{
 const s=state(2);Life.act(s,'water');Life.act(s,'play');const food=s.food;const g=await game({state:s,scene:'bedroom'});g.target('잠자리에');g.ack('오늘은 그대로');g.button('miniActions','이대로 잠들기',5);g.step(.8);assert.equal(g.snap().nightScene,true);read(g,'지금 밥');assert.equal(g.snap().mini,'feed');g.drag([180,170],[385,155],3.5);read(g);g.step(3);read(g);assert.equal(g.snap().nightScene,false);assert.equal(g.snap().state.needs.fed,false);assert.equal(g.snap().state.food,food-1);assert.equal(g.snap().state.minute,440);g.click('menuButton');g.click('saveExitButton');g.click('continueButton');assert.equal(g.snap().state.minute,440);assert.equal(g.snap().state.needs.fed,false);
});


test('저장·이어하기는 이름·물건·문·커튼을 유지하고 초기화는 두 번째 확인 뒤 실행한다',async()=>{
 const s=state();s.cat='사라';s.bagPacked=true;s.bagContents=['laptop','charger'];s.doorOpen=false;s.curtainClosed=true;const g=await game({state:s,scene:'bedroom'});g.click('menuButton');g.click('saveButton');g.click('saveExitButton');assert.equal(g.get('continueButton').hidden,false);g.click('continueButton');assert.equal(g.snap().state.cat,'사라');assert.deepEqual(g.snap().state.bagContents,['laptop','charger']);assert.equal(g.snap().doorOpen,false);assert.equal(g.snap().state.curtainClosed,true);g.click('menuButton');g.click('newGameButton');assert.ok(g.storage.has(SAVE_KEY));g.click('newGameButton');assert.equal(g.storage.has(SAVE_KEY),false);assert.equal(g.get('continueButton').hidden,true);
});


test('최종 9개 이미지와 G 타이틀을 로드하고 192px 초상화를 전용 API로 그린다',async()=>{
 const g=await game(null,{autoStart:false}),keys=Object.keys(require('../assets/r4-asset-manifest.json').load).sort();g.step(.1);assert.deepEqual(g.paint.titleAssetKeys.sort(),keys);assert.equal(g.get('portrait').width,192);assert.equal(g.get('portrait').height,192);
 g.start();black(g);message(g);assert.deepEqual(g.snap().assetKeys.sort(),keys);assert.ok(g.paint.portraits.some(p=>p.variant==='hoodie'&&p.w===192&&p.h===192));read(g);g.target('고양이에게');read(g);g.drag([190,150],[320,150],2.4);assert.ok(g.paint.portraits.some(p=>p.variant==='cat'&&p.x===0&&p.y===0&&p.w===192));
});
