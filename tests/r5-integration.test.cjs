const {test}=require('node:test'),assert=require('node:assert/strict');
const {game,fixture,read,black,pour}=require('./r5-helpers.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.00001,`${a} != ${b}`);
test('최종 좌표: 선반 실제 클릭·접근점·가격표가 같은 상품을 가리킨다',async()=>{
 for(const [id,name]of [['dry','건사료'],['wet','습식'],['dark','번개탄'],['small','한 끼'],['shoproller','돌돌이']]){
  const g=await game({state:fixture(),scene:'shop',shopMode:['dark','dry','wet'].includes(id)?'intro':'general'}),p=g.runtime.LifeView.layout.shop[id];
  const tag=g.get('shopPrices').children.find(n=>n.textContent.includes(name));assert.ok(tag);near(parseFloat(tag.style.left),p.cx/6.4);near(parseFloat(tag.style.top),(p.base+3)/3.6);
  g.pointer('pointerdown',p.x+p.w/2,p.y+p.h/2);g.step(4);assert.ok(g.snap().dialogue);assert.ok(Math.abs(g.snap().hero.x-p.gx)<25);assert.equal(g.snap().hero.pose,'back');assert.match(g.get('purchaseSummary').textContent,/상품 가격/);
 }
});
test('최종 좌표: 실제 전화·집 사물·밥물 도구의 입력이 새 그림에 연결된다',async()=>{
 const phone=await game();black(phone);phone.pointer('pointerdown',83,243);assert.equal(phone.get('phone').hidden,false);assert.equal(phone.snap().heroOnBed,true);
 for(const [scene,label,id]of [['bedroom','부엌으로','room'],['bedroom','가방을','bag'],['bedroom','집에서 입는 옷','clothes'],['living','밥그릇','food'],['living','물그릇','water'],['living','모래를','litter']]){
  const s=fixture(2);s.litterDirty=2;const g=await game({state:s,scene}),p=g.runtime.LifeView.hotspots(g.capture())[id],node=g.get('hotspots').children.find(n=>n.getAttribute('aria-label').includes(label));assert.ok(node,label);
  near(parseFloat(node.style.left),p.x/6.4);near(parseFloat(node.style.top),p.y/3.6);near(parseFloat(node.style.width),p.w/6.4);near(parseFloat(node.style.height),p.h/3.6);
  if(['food','water'].includes(id)){g.pointer('pointerdown',p.x+p.w/2,p.y+p.h/2);g.step(4);assert.equal(g.snap().mini,id==='food'?'feed':'water');assert.equal(g.snap().miniTool.x,270);assert.equal(g.snap().miniTool.y,255);assert.equal(g.snap().miniTarget.x,338);assert.equal(g.snap().miniTarget.y,310);pour(g);assert.ok(!g.snap().mini);}
 }
});
test('최종 좌표: 침대의 실제 문을 양방향 드래그하고 기상 대사 동안 침대에 남는다',async()=>{
 const s=fixture();s.needs={fed:true,played:true,comfort:true};s.water=true;s.waterLevel=3;const g=await game({state:s,scene:'bedroom'});g.target('잠자리에');read(g);assert.equal(g.snap().mini,'bed');
 g.drag([520,150],[600,150]);assert.equal(g.capture().mini.door,1);g.drag([590,150],[510,150]);assert.equal(g.capture().mini.door,0);g.drag([520,150],[600,150]);g.button('miniActions','이대로 잠들기',5);assert.equal(g.snap().catControl,false);assert.equal(g.snap().bedStage,'waking');assert.equal(g.snap().heroOnBed,true);read(g);assert.equal(g.snap().heroOnBed,false);
});
