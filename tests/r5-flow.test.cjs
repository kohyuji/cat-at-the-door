const {test}=require('node:test'),assert=require('node:assert/strict');
const {game,Life,fixture,read,black,message,pour,care,clean,pet,play,buy,bed,commute,consult,settle,SAVE_KEY}=require('./r5-helpers.cjs');

test('F08/F14~16/F27 첫 전화는 침대의 실물을 집고 상단 재접근·분리된 메시지를 읽는다',async()=>{
 const g=await game();black(g);assert.equal(g.snap().intro,'bedPhone');assert.equal(g.get('phoneButton').hidden,true);assert.equal(g.snap().heroOnBed,true);assert.equal(g.snap().guideId,'physicalPhone');const hero=g.snap().hero.x;g.target('베개 옆 휴대폰');assert.equal(g.snap().hero.x,hero);assert.equal(g.snap().heroOnBed,true);assert.equal(g.get('phoneButton').hidden,false);assert.match(g.get('phoneBody').textContent,/다음부터는/);g.button('phoneBody','메시지');g.button('phoneBody','채용 담당자');assert.equal(g.get('phoneBody').querySelectorAll('.message-bubble').length,2);g.button('phoneBody','내려놓는다');assert.equal(g.snap().heroOnBed,true);read(g);assert.equal(g.snap().scene,'street');
});

test('F18 이미 접근한 위치에서 우산 손잡이만 기울이고 다시 걷지 않는다',async()=>{
 const g=await game({state:Life.create('하늘','땅콩'),intro:'meet',scene:'street'});g.target('고양이에게');read(g);const before=g.snap().hero,p=g.snap().miniTool;assert.equal(g.snap().mini,'umbrella');g.drag([p.x,p.y],[p.x+85,p.y],2.4);assert.equal(g.snap().hero.x,before.x);assert.equal(g.snap().hero.y,before.y);assert.equal(g.snap().intro,'sheltered');assert.equal(g.snap().cat.pose,'purr');
});

test('F21/F23 상품은 뒤로 보고 보유금·가격·결제후 잔액을 구분하며 번개탄도 취소할 수 있다',async()=>{
 const s=Life.create('하늘','땅콩'),g=await game({state:s,intro:'sheltered',scene:'shop',shopMode:'intro'});g.target('번개탄');assert.equal(g.snap().hero.pose,'back');assert.match(g.get('purchaseSummary').textContent,/보유금액12,000원상품 가격12,000원구매 후 잔액0원/);assert.doesNotMatch(g.snap().dialogue.text,/멈춘다/);read(g,'취소한다');assert.equal(g.snap().state.cash,12000);buy(g);assert.equal(g.snap().state.cash,0);assert.equal(g.snap().state.food,8);
});

test('F23 확인한 어두운 상품만 다른 갈래로 가며 다시 고르면 구매 전 상태로 돌아온다',async()=>{
 const g=await game({state:Life.create('하늘','땅콩'),intro:'sheltered',scene:'shop',shopMode:'intro'});g.target('번개탄');g.step(2);g.button('choices','구매한다');assert.equal(g.snap().state.cash,0);assert.match(g.snap().dialogue.text,/다시 선택/);read(g,'다시 고른다');assert.equal(g.snap().state.cash,12000);assert.equal(g.snap().state.transactions.length,0);
});

test('F26 겨울은 취준·가끔 알바·귀가 컷신이며 상점/회사 플레이 타깃이 없다',async()=>{
 const s=Life.create('하늘','땅콩');Life.act(s,'buyFood');const g=await game({state:s,intro:'montage',scene:'living'});const shots=new Set();for(let i=0;i<50&&g.snap().intro!=='offer';i++){if(g.snap().scene==='winter'){shots.add(g.capture().winterShot);assert.equal(g.get('hotspots').children.length,0);}if(g.snap().black)black(g);if(g.snap().dialogue){g.step(.38);g.key('Enter');}else g.step(.4);}read(g);assert.equal(g.snap().state.winterStep,3);assert.equal(g.snap().state.cash,28000);assert.deepEqual([...shots].sort(),['home','parttime','study']);
});

test('F28~30 합격 뒤 준비 설명을 읽고 침실에 들어가면 가방을 계속 가리킨다',async()=>{
 const g=await game({state:fixture(),intro:'offer',scene:'bedroom'});message(g);assert.equal(g.get('routineToggle').hidden,true);read(g);assert.equal(g.get('routineToggle').hidden,false);assert.equal(g.snap().guideId,'room');g.target('침실로');assert.equal(g.snap().guideId,'bag');g.target('가방을');assert.equal(g.snap().mini,'bag');
});

test('F24~25/F37/F39 밥물과 오염 모래는 배운 뒤에도 같은 직접 입력으로 완료한다',async()=>{
 const s=fixture(2);s.litterDirty=3;s.flags['learned:feed']=s.flags['learned:water']=s.flags['learned:litter']=true;const g=await game({state:s});g.target('밥그릇');assert.equal(g.snap().mini,'feed');const food=g.snap().state.food;g.step(3);assert.equal(g.snap().state.food,food);pour(g);g.target('물그릇');assert.equal(g.snap().mini,'water');pour(g);g.target('모래를');assert.equal(g.snap().mini,'litter');clean(g);assert.equal(g.snap().state.litterDirty,0);assert.equal(g.snap().state.food,food-1);assert.match(g.get('routineChecklist').textContent,/모래 깨끗함/);
});

test('F31 행동 후 바늘과 빛 시각은 중간값을 지나며 걷기/읽기에는 진행되지 않는다',async()=>{
 const g=await game({state:fixture()});const start=g.snap().state.minute;g.target('소파에서 쉰다',1.8);assert.equal(g.snap().state.minute,start+30);assert.ok(g.snap().timeFlow);assert.ok(g.snap().state.visualMinute>start&&g.snap().state.visualMinute<start+30);assert.match(g.get('elapsedAction').textContent,/휴식 중/);assert.ok(g.get('clockMinute').getAttribute('transform'));g.step(2);assert.equal(g.snap().state.visualMinute,undefined);assert.match(g.get('elapsedAction').textContent,/30분/);const clock=g.snap().state.minute;g.step(3);assert.equal(g.snap().state.minute,clock);
});

test('F32~35/F41~43 침대에서 고민하고 문을 고른 뒤 같은 침대에서 자고 일어난다; 열린 문 시점 강제 없음',async()=>{
 const s=fixture();Life.act(s,'feed');Life.act(s,'water');Life.act(s,'play');const g=await game({state:s,scene:'bedroom'});g.target('잠자리에');assert.equal(g.snap().bedStage,'thinking');assert.equal(g.snap().heroOnBed,true);assert.equal(g.snap().sleeping,true);read(g);assert.equal(g.snap().mini,'bed');g.click('miniExit');assert.equal(g.snap().sleeping,false);g.target('잠자리에');read(g);g.key('ArrowRight');g.button('miniActions','이대로 잠들기',2);assert.equal(g.snap().heroOnBed,true);assert.equal(g.snap().sleeping,true);g.step(3);assert.equal(g.snap().catControl,false);assert.equal(g.snap().heroOnBed,true);assert.equal(g.snap().bedStage,'waking');read(g);assert.equal(g.snap().heroOnBed,false);assert.equal(g.snap().state.day,1);assert.match(g.get('energyLabel').textContent,/몸이 가볍다/);
});

test('F36/F38 정장 쓰다듬기·초상화·귀가 정장이 일치하고 행거에서 실제 갈아입는다',async()=>{
 const s=fixture(2);s.dressed=true;s.suitStored=false;const g=await game({state:s,scene:'living'});pet(g);assert.match(g.snap().dialogue.text,/정장에 털/);assert.ok(g.paint.portraits.some(p=>p.variant==='suit'));assert.equal(g.snap().state.clothesFur.suit,4);read(g);g.toRoom('bedroom');g.target('정장을 벗고');read(g);assert.equal(g.snap().state.dressed,false);assert.equal(g.snap().state.clothesFur.suit,4);
 const work=fixture(2,'work');work.dressed=true;const office=await game({state:work,scene:'office'});office.target('팀장에게');read(office);consult(office);consult(office);settle(office);assert.equal(office.snap().state.dressed,true);
});

test('F40 첫 출근 전날에도 현재 입은 후드티의 털을 돌돌이로 뗀다',async()=>{
 const s=fixture();s.roller.owned=true;s.fur=s.clothesFur.hoodie=8;const g=await game({state:s,scene:'bedroom'});g.target('옷에 붙은 털');assert.equal(g.snap().mini,'roller');g.button('miniActions','키보드로');g.step(2);assert.equal(g.snap().state.clothesFur.hoodie,0);assert.equal(g.snap().state.fur,0);
});

test('F06 DPR2는 캔버스 내부를 두 배로 만들고 입력은 640좌표를 유지한다',async()=>{
 const g=await game({state:fixture(),scene:'living'},{devicePixelRatio:2});assert.equal(g.get('world').width,1280);assert.equal(g.get('world').height,720);assert.equal(g.get('portrait').width,256);g.target('쥐 인형으로');assert.equal(g.snap().mini,'play');assert.equal(g.capture().images.r4People.complete,true);
});


test('F14~43 첫 구조부터 첫 출근·첫 귀가까지 실제 입력과 경제·옷·문 흐름을 끝까지 연결한다',async()=>{
 const g=await game();black(g);message(g,{physical:true});read(g);g.target('고양이에게');read(g);const umbrella=g.snap().miniTool;g.drag([umbrella.x,umbrella.y],[umbrella.x+85,umbrella.y],2.4);read(g);g.target('슈퍼에 들어');buy(g);g.step(1);g.get('catName').value='누리';g.get('nameForm').onsubmit({preventDefault(){}});read(g);g.target('밥그릇');pour(g);g.target('물그릇');pour(g);pet(g);read(g);assert.equal(g.snap().scene,'living');g.target('침실로');read(g);g.target('잠자리에');read(g);g.step(4);read(g);if(g.snap().black)black(g);read(g);assert.equal(g.snap().intro,'offer');message(g);read(g);assert.equal(g.snap().state.cash,28000);assert.equal(g.snap().guideId,'room',JSON.stringify(g.snap()));g.target('침실로');g.target('가방을');for(const item of g.snap().items)g.drag([item.x,item.y],[455,245],.2);g.step(2.8);read(g);assert.equal(g.snap().guideId,'room',JSON.stringify(g.snap()));care(g);play(g);g.target('슈퍼에 다녀');buy(g,'돌돌이 4,000');g.target('장보기를 마치고',2);read(g);assert.equal(g.snap().state.cash,24000);bed(g,true);assert.equal(g.snap().state.day,1);assert.equal(g.snap().catControl,false);care(g);g.toRoom('bedroom');g.target('출근복');read(g);g.target('옷에 붙은 털');g.button('miniActions','키보드로');g.step(2);assert.equal(g.snap().state.clothesFur.suit,0);g.target('가방을 집는다');g.toRoom('living');g.target('신발을 신고',1);g.step(4);if(g.snap().scene==='station')g.target('열차에 탄다',5);g.target('팀장에게');read(g);consult(g);consult(g);settle(g);assert.equal(g.snap().state.work[0].contracts,2);assert.equal(g.snap().state.work[0].income,48000);assert.equal(g.snap().state.cash,58000);assert.equal(g.snap().scene,'living');assert.equal(g.snap().state.dressed,true);g.toRoom('bedroom');g.target('정장을 벗고');read(g);assert.equal(g.snap().state.dressed,false);assert.equal(g.snap().state.bagPacked,true);
});

test('F31 저장은 실제 행동 종료 시각만 보존하며 경과 연출의 중간 시각을 저장하지 않는다',async()=>{
 const g=await game({state:fixture()});g.target('소파에서 쉰다',1.8);assert.ok(g.snap().state.visualMinute);g.click('menuButton');g.click('saveButton');const saved=JSON.parse(g.storage.get(SAVE_KEY));assert.equal(saved.state.minute,1230);assert.equal(saved.state.visualMinute,undefined);g.click('saveExitButton');g.click('continueButton');assert.equal(g.snap().state.minute,1230);assert.equal(g.snap().state.visualMinute,undefined);
});

test('F39 누적된 모래가 많아도 모든 덩이는 실제 작업영역 안에서 삽으로 치울 수 있다',async()=>{
 const s=fixture(10);s.litterDirty=26;const g=await game({state:s});g.target('모래를');assert.equal(g.snap().mini,'litter');assert.equal(g.snap().clumps.length,26);for(const p of g.snap().clumps)assert.ok(p.x>=134&&p.x<=489&&p.y>=147&&p.y<=267);clean(g);assert.equal(g.snap().state.litterDirty,0);
});
