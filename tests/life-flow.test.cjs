const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Life=require('../src/life-state.js');
const SAVE_KEY='catdoor-life-v3';

// 실제 HTML의 요소와 상태·대사·입력·렌더 코드를 함께 사용한다.
// 대체 오디오 장치는 실제 소리를 내지 않고, 그리기 장치는 잘못된 좌표를 검출한다.
async function game(saved,{autoStart=true}={}){
 const nodes=new Map(),all=[],events={},storage=new Map(),paint={},audio={constructors:0,resumes:0,starts:0};let frame,time=0;
 class FakeAudioContext{
  constructor(){audio.constructors++;this.currentTime=0;this.sampleRate=3000;this.destination={};}
  resume(){audio.resumes++;}createOscillator(){return{frequency:{value:0},connect(){},start(){audio.starts++;},stop(){}};}
  createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  createBiquadFilter(){return{frequency:{value:0},connect(){}};}
  createBuffer(channels,length){return{getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){return{connect(){},start(){audio.starts++;},stop(){}};}
 }
 const numeric={fillRect:4,clearRect:4,strokeRect:4,translate:2,scale:2,rotate:1,moveTo:2,lineTo:2,arc:5,ellipse:7,quadraticCurveTo:4,bezierCurveTo:6};
 const drawing=new Proxy({measureText:t=>({width:String(t).length*8}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {
  get(o,k){if(!(k in o))o[k]=(...args)=>{paint[k]=(paint[k]||0)+1;const values=k==='drawImage'?args.slice(1):k==='fillText'||k==='strokeText'?args.slice(1,3):numeric[k]?args.slice(0,numeric[k]):[];for(const value of values)assert.ok(Number.isFinite(value),`${String(k)} has invalid coordinate ${value}`);};return o[k];},set(o,k,v){o[k]=v;return true;}
 });
 const descendants=n=>n.children.flatMap(c=>[c,...(c.children?descendants(c):[])]);
 class Node{
  constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.id=id;this.hidden=false;this.value='';this._text='';this.children=[];this.dataset={};this.listeners={};this.attributes={};this.style={setProperty(){}};this.disabled=false;this.checked=false;this.width=640;this.height=360;all.push(this);}
  get textContent(){return this._text+this.children.map(n=>n.textContent||'').join('');}set textContent(v){this._text=String(v??'');this.children=[];}
  get lastChild(){return this.children.at(-1);}get childNodes(){return this.children;}
  getContext(){return drawing;}getBoundingClientRect(){return{left:0,top:0,width:640,height:360};}
  addEventListener(k,fn){this.listeners[k]=fn;}setAttribute(k,v){this.attributes[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}getAttribute(k){return this.attributes[k]??null;}setPointerCapture(){}focus(){}
  matches(selector){return selector.split(',').some(raw=>{const s=raw.trim();if(s==='[data-key]')return this.dataset.key!==undefined;if(s.startsWith('.'))return(this.className||'').split(' ').includes(s.slice(1));if(s.startsWith('#'))return this.id===s.slice(1);return this.tagName.toLowerCase()===s;});}
  querySelectorAll(selector){return descendants(this).filter(n=>n.matches?.(selector));}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  replaceChildren(...a){this._text='';this.children=[];this.append(...a);}append(...a){for(const child of a){const n=typeof child==='string'?{textContent:child}:child;n.parentNode=this;this.children.push(n);}}appendChild(n){this.append(n);return n;}after(n){n.afterNode=this;}
 }
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 for(const match of html.matchAll(/<([a-z0-9]+)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)){const n=new Node(match[1],match[3]);n.hidden=/\bhidden\b/.test(match[2]);nodes.set(n.id,n);}
 const get=id=>{assert.ok(nodes.has(id),`index.html is missing #${id}`);return nodes.get(id);};
 const document={getElementById:get,createElement:tag=>new Node(tag),createTextNode:t=>({textContent:String(t)}),addEventListener:(k,fn)=>events[k]=fn,querySelectorAll:s=>all.filter(n=>n.matches(s)),fonts:{ready:Promise.resolve()}};
 if(saved)storage.set(SAVE_KEY,JSON.stringify({state:saved.state,scene:saved.scene||'living',doorOpen:true,officeTalk:{},officeDone:false,officeFeedback:false,...saved}));
 const sandbox={document,console,Math,JSON,Map,Set,requestAnimationFrame:fn=>frame=fn,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},window:{addEventListener(){},AudioContext:FakeAudioContext},Image:class{constructor(){this.complete=true;this.width=this.naturalWidth=1280;this.height=this.naturalHeight=1440;}set src(v){this.onload?.();}}};
 const c=vm.createContext(sandbox);for(const file of ['life-state.js','life-story.js','pixel-render.js','life-view.js','life-game.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),c,{filename:file});
 await Promise.resolve();await Promise.resolve();
 const snap=()=>sandbox.window.CatDoorReview.snapshot();
 const step=(seconds=.4)=>{for(let i=0;i<Math.ceil(seconds*30);i++){time+=1000/30;frame(time);}};
 const press=(k,down)=>events[down?'keydown':'keyup']({key:k,target:new Node(),repeat:false,preventDefault(){}});
 const key=k=>{press(k,true);press(k,false);};
 const screen=(x,y)=>{const camera=snap().camera||{scale:1,x:0,y:0};return{clientX:x*camera.scale+camera.x,clientY:y*camera.scale+camera.y,pointerId:1};};
 const pointer=(kind,x,y)=>get('world').listeners[kind](screen(x,y));
 const drag=(from,to,wait=.1)=>{pointer('pointerdown',...from);pointer('pointermove',...to);pointer('pointerup',...to);step(wait);};
 const find=(scope,text)=>descendants(typeof scope==='string'?get(scope):scope).find(n=>n.tagName==='BUTTON'&&!n.disabled&&(text instanceof RegExp?text.test(n.textContent):n.textContent.includes(text)));
 const button=(scope,text,wait=.5)=>{const b=find(scope,text);assert.ok(b,`button ${text} in ${scope}: ${(typeof scope==='string'?get(scope):scope).textContent}`);b.onclick();step(wait);};
 const click=(id,wait=.5)=>{const n=get(id);assert.ok(!n.disabled,`#${id} is disabled`);n.onclick({target:n,stopPropagation(){}});step(wait);};
 const ack=(text,wait=.5)=>{assert.equal(snap().ack,true,'an acknowledgement must be open');button('ackActions',text||/.*/,wait);};
 const clearAck=()=>{if(snap().ack)ack(find('ackActions','조금 뒤에')?'조금 뒤에':/.*/);};
 const dialogues=(choice)=>{for(let i=0;i<80&&snap().dialogue;i++){step(.32);if(get('choices').children.length){const b=choice?find('choices',choice):get('choices').children[0];assert.ok(b,'dialogue choice exists');b.onclick();}else key('Enter');}assert.equal(snap().dialogue,undefined,'dialogue should finish');step(.4);};
 const target=(label,wait=3.8)=>{let b;for(let i=0;i<30&&!b;i++){b=descendants(get('hotspots')).find(n=>(n.getAttribute?.('aria-label')||'').includes(label));if(!b)step(.1);}assert.ok(b,`target ${label}: ${descendants(get('hotspots')).map(n=>n.getAttribute?.('aria-label')).join('|')} :: ${JSON.stringify(snap())}`);b.onclick();step(wait);};
 const toRoom=room=>{if(snap().scene!==room)target(room==='living'?'부엌으로':'침실로');clearAck();assert.equal(snap().scene,room);};
 const fillTask=()=>{assert.equal(snap().mini,'work');for(const slot of snap().slots){const current=snap(),card=current.cards.find(c=>c.id===current.task.solution[slot.id]);drag([card.x+55,card.y+35],[slot.x+65,slot.y+33]);}};
 const pack=()=>{toRoom('bedroom');target('가방을');if(snap().mini==='bag'){for(const item of snap().items)drag([item.x,item.y],[455,245],.15);step(1.5);}assert.ok(snap().state.bagPacked);};
 const start=()=>{if(saved)click('continueButton',.8);else{get('playerName').value='하늘';click('startButton',.6);}};
 step(.3);if(autoStart)start();
 return{get,snap,step,key,press,pointer,drag,button,click,find,ack,clearAck,dialogues,target,toRoom,fillTask,pack,paint,audio,all,start,storage};
}

function stateAt(day=0,phase='evening'){
 const s=Life.create('하늘','보리');Life.act(s,'buyFood');Life.act(s,'hoodie');s.flags.employed=true;
 for(let d=0;d<day;d++){
  if(!s.food)Life.act(s,'buyFood');Life.act(s,'feed');Life.act(s,'water');Life.sleep(s,true);Life.finishNight(s);
  if(d+1===day&&phase==='morning')return s;
  if(Life.schedule[s.day].weekend){Life.arriveHome(s);continue;}
  if(!s.food)Life.act(s,'buyFood');Life.act(s,'feed');Life.act(s,'water');Life.act(s,'dress');Life.act(s,'packBag');Life.act(s,'pickBag');Life.act(s,'leaveHome');
  if(d+1===day&&phase==='work'){s.phase='work';return s;}
  Life.finishWork(s,{completed:true});Life.arriveHome(s);
 }
 return s;
}
function care(g){
 g.toRoom('living');g.clearAck();if(g.snap().state.food<=2){g.click('foodLabel');g.button('phoneBody','12,000원');g.clearAck();}
 if(!g.snap().state.needs.fed){g.target('밥그릇');if(g.snap().ack)g.ack('건사료');g.drag([180,170],[385,155],3.5);g.clearAck();assert.equal(g.snap().state.needs.fed,true);}
 if(!g.snap().state.water){g.target('물그릇');g.drag([180,170],[385,155],3.5);g.clearAck();assert.equal(g.snap().state.water,true);}
}
function stroke(g){g.pointer('pointerdown',280,235);for(let i=0;i<10;i++){g.pointer('pointermove',i%2?280:430,235);g.step(.24);}g.pointer('pointerup',430,235);g.step(1.8);}
function door(g,open=true,wait=5){assert.equal(g.snap().mini,'bed');g.drag([535,180],[open?580:420,180]);assert.equal(g.snap().doorDecision,true);g.button('miniActions',open?'열어 두고':'닫고',wait);}
function finishCat(g){
 if(!g.snap().catControl)return;
 if(g.snap().guideId==='catscent'){g.target('옷 냄새',4);return;}
 g.target('문을 앞발',.5);g.target('쥐 인형을',2);g.target('인형을 문 앞',4);g.step(3);
}
function sleep(g,open=true){g.toRoom('bedroom');g.target('잠자리에');if(g.snap().ack)g.ack('오늘은 그대로');door(g,open);finishCat(g);if(g.snap().nightScene&&g.snap().ack)g.ack('다시 눕는다',4);g.clearAck();}
async function rescue(g,{open=true}={}){
 assert.equal(g.snap().intro,'rejection');g.button('phoneBody','확인');g.target('고양이에게');g.dialogues();g.drag([190,150],[320,150],2.4);g.dialogues();
 g.target('편의점에');assert.doesNotMatch(g.get('phoneBody').textContent,/첫.?출근|회사 메모|오늘 할 일|평소|익숙한|늘 먹는/);
 g.button('phoneBody','12,000원');assert.match(g.get('ackText').textContent,/사료.*그릇/);g.ack('집에 데려간다',1);
 g.get('catName').value='보리';g.get('nameForm').onsubmit({preventDefault(){}});g.dialogues();
 g.target('밥그릇');g.drag([180,170],[385,155],3.5);g.target('물그릇');g.drag([180,170],[385,155],3.5);
 g.target('쓰다듬');stroke(g);g.dialogues();assert.equal(g.snap().intro,'routine');g.target('잠자리에');door(g,open);finishCat(g);g.step(3.5);
 assert.equal(g.snap().intro,'offer');assert.match(g.get('phoneBody').textContent,/합격|첫 출근/);g.button('phoneBody','확인');g.dialogues();assert.equal(g.snap().state.flags.employed,true);assert.equal(g.snap().intro,'');
}
function play(g){g.toRoom('living');g.target('쥐 인형으로');assert.equal(g.snap().mini,'play');g.drag([320,235],[460,245],4.8);assert.equal(g.snap().state.needs.played,true);}
function commute(g,{bag=true}={}){
 care(g);g.toRoom('bedroom');g.target('출근복');if(bag){g.pack();if(!g.snap().state.hasBag)g.target('가방을 집는다');}
 g.toRoom('living');g.target('신발을 신고',.7);if(g.snap().ack)g.ack('오늘은 빌린다',1);g.step(3);
 if(g.snap().scene==='station')g.target('열차에 탄다',6);assert.equal(g.snap().scene,'office');
}
function office(g){
 g.target('팀장에게');g.dialogues();if(g.snap().state.day===1){g.target('동료에게');g.dialogues();}
 g.target('내 자리',1.8);if(g.snap().mini==='work'){g.fillTask();g.button('miniActions','파일 정리 끝내기',1.5);}else g.step(4.2);
 g.dialogues('내일 출근');assert.equal(g.snap().state.phase,'afterWork');assert.ok(Life.clock(g.snap().state).minutes>=1080);g.target('퇴근한다',4.5);g.clearAck();
}
function lastMoment(g){
 const scenes=[];for(let i=0;i<10&&!g.snap().endingMoment;i++){g.step(1);scenes.push(g.snap().scene);if(g.snap().dialogue)g.dialogues();g.step(.5);}
 assert.ok(g.snap().endingMoment,'마지막 장면에는 직접 할 행동이 남아 있다');assert.equal(g.get('endingScreen').hidden,true);
 g.step(5);assert.equal(g.snap().endingMoment,true);assert.equal(g.get('endingScreen').hidden,true,'기다리기만 해서는 마지막 행동을 건너뛰지 않는다');
 const key=Life.ending(g.snap().state).key;
 if(key==='worn')g.target('소파에 앉아 알람을 끈다',4);
 else if(key==='distance'||key==='neglected'){g.target('물그릇을 채워 놓는다');assert.equal(g.snap().mini,'water');g.drag([180,170],[385,155],4);}
 else{g.target('보리에게 손을 내민다');assert.equal(g.snap().mini,'pet');g.pointer('pointerdown',330,235);g.pointer('pointerup',330,235);g.step(2);assert.equal(g.get('endingScreen').hidden,true);stroke(g);}
 g.step(3.5);assert.equal(g.get('endingScreen').hidden,false);return scenes;
}

test('실제 HTML 요소로 초기화되고 시작 전에는 소리가 없으며 시작과 이어하기 후에만 켜진다',async()=>{
 const g=await game(null,{autoStart:false});assert.equal(g.audio.constructors,0);g.step(4);assert.equal(g.audio.starts,0);g.start();assert.equal(g.audio.constructors,1);assert.ok(g.audio.starts>0);
 g.click('soundButton');const n=g.audio.starts;g.step(3);assert.equal(g.audio.starts,n);assert.equal(g.get('soundButton').getAttribute('aria-label'),'소리 켜기');
 const r=await game({state:stateAt()},{autoStart:false});assert.equal(r.audio.constructors,0);r.start();assert.equal(r.audio.constructors,1);
});

test('구조와 첫 장보기에는 미래의 출근 정보나 이미 아는 사료가 나오지 않고 직접 돌본 뒤 취직한다',async()=>{
 const g=await game();await rescue(g);assert.equal(g.snap().state.me,'하늘');assert.equal(g.snap().state.cat,'보리');assert.ok(g.paint.drawImage>0);assert.ok(g.paint.fillRect>0);
});

test('대화창 넓은 본문으로 이어 읽고 빠른 중복 클릭은 다음 줄과 사물 행동을 건너뛰지 않는다',async()=>{
 const g=await game();g.button('phoneBody','확인');g.target('고양이에게');const first=g.snap().dialogue.text,hero=g.snap().hero.x;
 g.get('dialogue').onclick({target:g.get('speech')});const next=g.snap().dialogue.text;assert.notEqual(next,first);g.get('dialogue').onclick({target:g.get('speech')});assert.equal(g.snap().dialogue.text,next);
 g.step(1.2);g.get('dialogue').onclick({target:g.get('speech')});assert.notEqual(g.snap().dialogue.text,next);assert.equal(g.snap().hero.x,hero);assert.equal(g.snap().mini,undefined);g.dialogues();assert.equal(g.snap().mini,'umbrella');
});

test('첫 잠자리도 문을 실제로 닫을 수 있으며 누르기만 해서는 잠들지 않는다',async()=>{
 const g=await game();await rescue(g,{open:false});assert.equal(g.snap().state.flags.employed,true);assert.ok(g.snap().state.food>0);
 const s=stateAt();Life.act(s,'feed');Life.act(s,'water');const d=await game({state:s,scene:'bedroom'});d.target('잠자리에');const confirm=d.get('miniActions').children[0];assert.equal(confirm.disabled,true);
 d.pointer('pointerdown',535,180);d.pointer('pointerup',535,180);d.step(1);assert.equal(d.snap().doorDecision,false);assert.equal(confirm.disabled,true);
 d.drag([535,180],[420,180]);assert.equal(d.snap().miniDoor,0);assert.match(confirm.textContent,/닫고/);d.drag([440,180],[580,180]);assert.equal(d.snap().miniDoor,1);assert.match(confirm.textContent,/열어/);assert.equal(d.snap().state.day,0);
});

test('메뉴에서 저장하고 나간 뒤 이어 하며 처음부터 시작은 확인 후 기존 기록을 지운다',async()=>{
 const g=await game({state:stateAt()});g.click('menuButton');assert.equal(g.snap().paused,true);const x=g.snap().hero.x;g.press('d',true);g.step(2);g.press('d',false);assert.equal(g.snap().hero.x,x);
 g.click('saveButton');assert.match(g.get('saveStatus').textContent,/저장했/);assert.equal(JSON.parse(g.storage.get(SAVE_KEY)).state.version,3);
 g.click('saveExitButton');assert.equal(g.get('titleScreen').hidden,false);assert.equal(g.get('continueButton').hidden,false);g.click('continueButton');assert.equal(g.snap().paused,false);assert.equal(g.snap().state.cat,'보리');
 g.click('menuButton');g.click('newGameButton');assert.ok(g.storage.has(SAVE_KEY));g.click('newGameButton');assert.equal(g.storage.has(SAVE_KEY),false);assert.equal(g.get('continueButton').hidden,true);g.click('startButton');assert.equal(g.snap().intro,'rejection');
});

test('가방은 세 물건을 실제로 넣어야 챙겨지고 저녁 한 칸으로 보이며 산수 안내가 없다',async()=>{
 const s=stateAt(),g=await game({state:s,scene:'bedroom'});const before=g.snap().state.eveningUsed;g.target('가방을');assert.equal(g.snap().mini,'bag');g.key('e');assert.equal(g.snap().state.bagPacked,false);
 g.drag([145,150],[300,300]);assert.equal(g.snap().items[0].placed,false);
 for(const item of g.snap().items)g.drag([item.x,item.y],[455,245],.15);g.step(1.5);assert.equal(g.snap().state.bagPacked,true);assert.equal(g.snap().state.eveningUsed,before+1);
 assert.match(g.get('dayRhythm').textContent,/늦은 저녁|잘 시간/);assert.doesNotMatch(g.get('dayRhythm').textContent,/분|남은 저녁|620/);assert.equal(g.get('taskSource').hidden,true);
});

test('날짜 정리는 틀린 폴더를 거부하고 맞는 세 파일을 넣었을 때 한 가지 마침 행동만 열린다',async()=>{
 const g=await game({state:stateAt(2,'work'),scene:'office'});g.target('팀장에게');g.dialogues();g.target('내 자리');assert.equal(g.snap().task.kind,'sort');assert.equal(g.get('taskSource').hidden,true);assert.equal(g.get('miniActions').children.length,1);
 const s=g.snap(),card=s.cards.find(c=>c.id===s.task.solution[s.slots[0].id]);g.drag([card.x+50,card.y+30],[s.slots[1].x+60,s.slots[1].y+30]);assert.equal(g.snap().slots[1].cardId,null);assert.equal(g.get('miniActions').children[0].disabled,true);
 g.fillTask();assert.equal(g.get('miniActions').children[0].disabled,false);g.button('miniActions','파일 정리 끝내기',1.5);g.dialogues();assert.equal(g.snap().state.work.at(-1).completed,true);assert.equal(g.snap().state.phase,'afterWork');assert.ok(Life.clock(g.snap().state).minutes>=1080);
});

test('평범한 근무일은 낮부터 퇴근까지 흘러가고 일을 남기면 실제 저녁 선택이 줄어든다',async()=>{
 const good=await game({state:stateAt(3,'work'),scene:'office'});good.target('팀장에게');good.dialogues();good.target('내 자리',1.5);assert.equal(good.snap().workMontage,true);assert.equal(good.snap().mini,undefined);assert.match(good.get('shiftProgress').textContent,/일하는 중/);good.step(4.2);good.dialogues();good.target('퇴근한다',2);good.clearAck();assert.equal(good.snap().state.eveningSlots,2);
 const missed=await game({state:stateAt(2,'work'),scene:'office'});missed.target('팀장에게');missed.dialogues();missed.target('팀장에게');missed.dialogues('마무리하기 어렵');missed.target('퇴근한다',2);missed.clearAck();assert.equal(missed.snap().state.work.at(-1).completed,false);assert.equal(missed.snap().state.workMissed,1);assert.equal(missed.snap().state.eveningSlots,1);assert.match(missed.get('timeLabel').textContent,/늦은 저녁/);
});

test('새벽에 깼다는 배너 아래 실제 밥을 주며 그 돌봄은 아침 시간이나 아침 식사로 계산하지 않는다',async()=>{
 const s=stateAt(2);Life.act(s,'water');const food=s.food,g=await game({state:s,scene:'bedroom'});g.target('잠자리에');g.ack('오늘은 그대로');door(g,true,5);
 assert.equal(g.snap().nightScene,true);assert.equal(g.get('nightBanner').hidden,false);assert.match(g.get('nightBanner').textContent,/새벽.*잠에서 깼다/);assert.match(g.get('ackText').textContent,/새벽/);
 g.ack('지금 밥을 준다');assert.equal(g.snap().mini,'feed');g.drag([180,170],[385,155],3.5);g.step(5);assert.equal(g.snap().nightScene,false);assert.equal(g.snap().state.food,food-1);assert.equal(g.snap().state.morningMin,0);assert.equal(g.snap().state.needs.fed,false);assert.equal(g.snap().state.lastNight.nightCare[0].type,'feed');assert.equal(g.get('nightBanner').hidden,true);
});

test('쥐 인형의 화면 위치에서 놀이가 시작되고 움직임 뒤 멈추면 잡으며 쓰다듬기는 한 번 누르기로 끝나지 않는다',async()=>{
 const s=stateAt();Life.act(s,'feed');Life.act(s,'water');const g=await game({state:s});g.pointer('pointerdown',365,320);g.pointer('pointerup',365,320);g.step(3);assert.equal(g.snap().mini,'play');g.step(3);assert.equal(g.snap().state.needs.played,false);
 g.drag([320,235],[460,245],4.8);assert.equal(g.snap().state.needs.played,true);g.target('쓰다듬');assert.equal(g.snap().mini,'pet');g.pointer('pointerdown',330,235);g.pointer('pointerup',330,235);g.step(3);assert.equal(g.snap().mini,'pet');stroke(g);assert.equal(g.snap().mini,undefined);assert.equal(g.snap().state.flags.petFurToday,true);
});

test('돌봄을 하지 않고 출근할 때 빈 그릇을 확인하며 놓고 간 가방은 늦은 귀가로 이어진다',async()=>{
 const s=stateAt(2,'morning'),g=await game({state:s,scene:'bedroom'});g.target('출근복');g.toRoom('living');g.target('신발을 신고');assert.match(g.get('ackText').textContent,/밥그릇.*현관/);g.ack('오늘은 그냥 나간다');assert.match(g.get('ackText').textContent,/가방/);g.ack('오늘은 빌린다',2);assert.equal(g.snap().scene,'office');assert.equal(g.snap().state.flags.morningCareMissed,true);assert.ok(g.snap().state.careDebt>=1);g.target('팀장에게');g.dialogues();g.target('내 자리');g.fillTask();g.button('miniActions','파일 정리 끝내기',1.5);g.dialogues();g.target('퇴근한다',2);g.clearAck();assert.equal(g.snap().state.eveningSlots,1);assert.equal(g.snap().state.work.at(-1).borrowedLaptop,true);
});

test('열두 날짜를 실제 집 조작과 짧은 근무로 진행하고 주말 집안일과 마지막 장면을 끝까지 본다',async()=>{
 const g=await game();await rescue(g);care(g);g.pack();play(g);sleep(g,true);
 const seen=new Set();let sorted=0;
 for(let round=0;round<14&&!g.snap().endingPlayback&&g.snap().state.phase!=='ending';round++){
  const day=g.snap().state.day;seen.add(day);g.clearAck();
  if(Life.schedule[day].weekend){
   care(g);g.target('빨래를 모은다');for(const item of g.snap().items)g.drag([item.x,item.y],[490,270],.2);g.step(1.8);
   g.target('밀린 설거지');g.pointer('pointerdown',150,200);for(const x of [150,210,150,210,150,270,330,270,330,270,390,450,390,450,390]){g.pointer('pointermove',x,200);g.step(.12);}g.pointer('pointerup',390,200);g.step(1.7);assert.equal(g.snap().state.done.dishes,true);play(g);g.target('소파에서 쉰다');assert.doesNotMatch(g.get('dayRhythm').textContent,/분|620/);sleep(g,true);continue;
  }
  commute(g);if(day===2||day===9)sorted++;office(g);care(g);
  if(day===3){g.target('흔들리는 창문');g.drag([400,170],[560,170],1.5);g.dialogues();g.step(2.2);}
  if(Life.timeBand(g.snap().state).remaining>=2)play(g);g.toRoom('living');g.target('소파에서 쉰다');sleep(g,true);
 }
 assert.ok(g.snap().endingPlayback);assert.equal(g.snap().state.work.length,10);assert.equal(g.snap().state.log.length,13);assert.equal(sorted,2);assert.ok(seen.has(6)&&seen.has(7));assert.equal(g.snap().state.project.presented,true);
 const scenes=lastMoment(g);
 assert.ok(scenes.includes('office'));assert.ok(scenes.includes('living'));assert.ok(g.get('endingText').textContent.length>10);assert.ok(g.paint.fillRect>1000);assert.equal(JSON.parse(g.storage.get(SAVE_KEY)).finished,true);
});

test('피곤이 쌓인 마지막 밤에는 소파에 직접 앉아야 이야기가 끝난다',async()=>{
 const s=stateAt(12);Life.act(s,'feed');Life.act(s,'water');assert.equal(Life.ending(s).key,'worn');const g=await game({state:s,scene:'bedroom'});sleep(g);assert.equal(g.snap().state.phase,'ending');lastMoment(g);assert.match(g.get('endingTitle').textContent,/금요일/);
});

test('여러 번 빈 그릇을 두고 지내면 일찍 이야기가 멈추며 마지막 물 붓기가 누적된 돌봄 누락을 지우지 않는다',async()=>{
 const s=Life.create('하늘','보리');Life.act(s,'buyFood');Life.act(s,'hoodie');s.flags.employed=true;
 for(let day=0;day<2;day++){Life.sleep(s,true);Life.finishNight(s);Life.act(s,'dress');Life.act(s,'packBag');Life.act(s,'pickBag');Life.act(s,'leaveHome');Life.finishWork(s,{completed:true});Life.arriveHome(s);}
 assert.equal(s.careDebt,4);const g=await game({state:s,scene:'bedroom'});sleep(g);assert.equal(g.snap().state.phase,'ending');assert.equal(Life.ending(g.snap().state).key,'neglected');const debt=g.snap().state.careDebt,trust=g.snap().state.trust;lastMoment(g);assert.equal(g.snap().state.careDebt,debt);assert.equal(g.snap().state.trust,trust);assert.match(g.get('endingTitle').textContent,/아침/);
});
