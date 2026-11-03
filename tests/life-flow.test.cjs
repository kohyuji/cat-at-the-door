const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// The controller is exercised through its DOM handlers and animation clock.
// Rendering gets a separate real-browser check; these tests detect broken routes.
async function game(){
 const nodes=new Map(),events={},storage=new Map();let frame,clock=0;
 const context2d=new Proxy({},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 class Node{
  constructor(id=''){this.id=id;this.hidden=false;this.value='';this.textContent='';this.children=[];this.dataset={};this.listeners={};this.disabled=false;}
  getContext(){return context2d;}getBoundingClientRect(){return {left:0,top:0,width:640,height:360};}
  addEventListener(k,fn){this.listeners[k]=fn;}setAttribute(){}setPointerCapture(){}focus(){}
  matches(){return this.id==='playerName'||this.id==='catName';}
  replaceChildren(...a){this.children=a;}append(...a){this.children.push(...a);}appendChild(a){this.children.push(a);}after(){}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id);};
 const document={getElementById:get,createElement:()=>new Node(),createTextNode:t=>({textContent:t}),addEventListener:(k,f)=>events[k]=f,querySelectorAll:()=>[]};
 const sandbox={document,console,Math,JSON,Map,Set,Image:class{set src(v){this.onload?.();}},requestAnimationFrame:fn=>frame=fn,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},LifeView:{draw(){},title(){}},window:{addEventListener(){}}};
 sandbox.window.window=sandbox.window;const c=vm.createContext(sandbox);
 for(const file of ['life-state.js','life-story.js','pixel-render.js','life-view.js','life-game.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),c,{filename:file});
 sandbox.LifeView=c.LifeView;
 await Promise.resolve();await Promise.resolve();
 const step=(seconds=.4)=>{for(let i=0;i<Math.ceil(seconds*30);i++){clock+=1000/30;frame(clock);}};
 const snap=()=>JSON.parse(JSON.stringify(sandbox.window.CatDoorReview.snapshot()));
 const key=k=>{events.keydown({key:k,target:new Node(),repeat:false,preventDefault(){}});events.keyup({key:k,target:new Node(),preventDefault(){}});};
 const point=(x,y)=>({clientX:x,clientY:y,pointerId:1});
 const click=(x,y,wait=4)=>{const cam=snap().camera||{scale:1,x:0,y:0};x=x*cam.scale+cam.x;y=y*cam.scale+cam.y;get('world').listeners.pointerdown(point(x,y));get('world').listeners.pointerup(point(x,y));step(wait);};
 const drag=(a,b)=>{get('world').listeners.pointerdown(point(...a));get('world').listeners.pointermove(point(...b));get('world').listeners.pointerup(point(...b));step(2);};
 const dialogues=()=>{for(let i=0;i<40&&snap().dialogue;i++){step(.35);key('e');if(get('choices').children.length&&snap().dialogue){const label=get('choices').children[0];step(.35);label.onclick();}}assert.equal(snap().dialogue,undefined,'dialogue route must finish');step(.4);};
 const choose=label=>{for(let i=0;i<20&&!get('choices').children.some(b=>b.textContent.includes(label));i++){step(.35);key('e');}const b=get('choices').children.find(b=>b.textContent.includes(label));assert.ok(b,`choice ${label}`);step(.35);b.onclick();step(.4);};
 get('playerName').value='하늘';get('startButton').onclick();step(.5);
 return {get,step,snap,key,click,drag,dialogues,choose};
}
async function prologue(g){
 g.click(445,310);g.dialogues();assert.equal(g.snap().mini,'umbrella');
 g.drag([190,150],[320,150]);g.dialogues();assert.equal(g.snap().intro,'sheltered');
 g.click(575,260);assert.equal(g.snap().intro,'name');g.get('catName').value='보리';g.get('nameForm').onsubmit({preventDefault(){}});g.dialogues();
 g.click(390,310);assert.equal(g.snap().mini,'pet');g.drag([320,220],[440,220]);g.step(2);assert.equal(g.snap().intro,'routine');
 g.click(550,160);g.step(9);g.dialogues();assert.equal(g.snap().intro,'');assert.equal(g.snap().scene,'bedroom');
}
test('rescue keeps its outcome, names the cat afterwards and reaches the first real evening',async()=>{const g=await game();await prologue(g);assert.equal(g.snap().state.me,'하늘');assert.equal(g.snap().state.flags.introFur,true);assert.equal(g.snap().state.day,0);});
test('care gestures, a closed-door cat route, commute, NPC dialogue and actual office work connect',async()=>{
 const g=await game();await prologue(g);
 g.click(560,200);assert.equal(g.snap().scene,'living');
 g.click(570,315);assert.equal(g.snap().mini,'feed');g.drag([180,170],[385,155]); // hold is needed, not just an incidental click
 assert.equal(g.snap().state.needs.fed,false);
 g.key('e');g.step(3.2);assert.equal(g.snap().state.needs.fed,true);
 g.click(490,320);assert.equal(g.snap().mini,'water');g.key('e');g.step(3.2);assert.equal(g.snap().state.water,true);
 g.click(75,170);g.click(100,270);assert.equal(g.snap().mini,'bed');
 g.drag([550,160],[430,160]);assert.equal(g.snap().doorOpen,false);g.drag([200,260],[200,145]);g.step(5);
 assert.equal(g.snap().catControl,true);g.click(70,260);g.click(360,320);g.click(70,260);g.step(4);assert.equal(g.snap().catControl,false);assert.equal(g.snap().state.day,1);
 g.click(430,200);g.click(510,310);g.dialogues();if(g.snap().mini==='roller'){g.get('miniExit').onclick();g.step(.4);g.click(510,310);}
 assert.equal(g.snap().scene,'station');g.step(4);g.click(330,240);g.dialogues();g.step(4);g.click(575,240);g.dialogues();assert.equal(g.snap().scene,'office');
 g.click(445,210);g.dialogues();g.click(330,245);assert.equal(g.snap().mini,'work');g.key('e');g.key('e');g.key('e');g.step(2);g.dialogues();assert.equal(g.snap().state.work.length,1);assert.equal(g.snap().state.phase,'afterWork');
});
test('the real controller reaches payday through twelve dates, weekends, food purchases and the boss episode',async()=>{
 const g=await game();await prologue(g);
 const commute=()=>{g.step(4);g.click(330,240);g.dialogues();g.step(4);g.click(575,240);g.dialogues();g.step(1.5);};
 for(let day=0;day<=12;day++){
  assert.equal(g.snap().state.day,day);
  if(g.snap().scene!=='living')g.click(560,200);
  if(g.snap().state.food===0){g.get('moneyButton').onclick();const supply=g.get('inventoryBody').children.find(n=>n.textContent==='사료를 마련한다');assert.ok(supply);supply.onclick();g.choose('6회분');}
  g.click(570,315);assert.equal(g.snap().mini,'feed',`feed day${day}: ${JSON.stringify(g.snap())}`);g.key('e');g.step(3.4);
  g.click(490,320);g.key('e');g.step(3.4);
  g.click(360,315);g.key('e');g.step(4.4);assert.equal(g.snap().state.needs.played,true);
  g.click(75,170);g.click(310,210);assert.equal(g.snap().mini,'prepare');if(day===2){g.drag([100,280],[550,232]);assert.equal(g.snap().state.flags.deskSeat,true);g.step(2);}for(let i=0;i<3;i++)g.key('e');g.step(2);
  g.click(100,270);g.key('e');g.step(8);
  if(day===12){assert.equal(g.snap().state.phase,'ending');break;}
  if([6,7].includes(day+1)){assert.equal(g.snap().state.phase,'evening');continue;}
  assert.equal(g.snap().state.phase,'morning');g.click(430,200);g.click(510,310);
  if(g.snap().dialogue)g.choose('가방을 들고 나간다');g.step(1.2);assert.equal(g.snap().scene,'station',JSON.stringify(g.snap()));
  commute();assert.equal(g.snap().scene,'office');
  g.click(445,210);g.dialogues();g.click(180,220);g.dialogues();
  g.click(330,245);for(let i=0;i<3;i++)g.key('e');g.step(2);g.dialogues();
  g.click(575,230);if(day+1===8){assert.ok(g.snap().dialogue);g.dialogues();g.click(575,230);}
  assert.equal(g.snap().scene,'station');commute();assert.equal(g.snap().scene,'living');
 }
 const s=g.snap().state;assert.equal(s.work.length,10);assert.equal(s.log.length,13);assert.equal(s.payday.firstPay,1110000);assert.equal(s.transactions.filter(t=>t.type==='firstPay').length,1);assert.ok(s.cash>1000000);
});
