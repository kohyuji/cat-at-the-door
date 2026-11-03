const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Life=require('../src/life-state.js');

// The real controller, story, model and renderer run together. The DOM/Canvas
// doubles collect output; they do not complete activities or alter game state.
async function game(saved,{autoStart=true}={}){
 const nodes=new Map(),all=[],events={},storage=new Map(),paint={},audio={constructors:0,resumes:0,starts:0};let frame,time=0;
 class FakeAudioContext{
  constructor(){audio.constructors++;this.currentTime=0;this.sampleRate=3000;this.destination={};}
  resume(){audio.resumes++;}
  createOscillator(){return{frequency:{value:0},connect(){},start(){audio.starts++;},stop(){}};}
  createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  createStereoPanner(){return{pan:{value:0},connect(){}};}
  createBiquadFilter(){return{frequency:{value:0},connect(){}};}
  createBuffer(channels,length){return{getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){return{connect(){},start(){audio.starts++;},stop(){}};}
 }
 const drawing=new Proxy({measureText:t=>({width:String(t).length*8}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get(o,k){if(!(k in o))o[k]=()=>{paint[k]=(paint[k]||0)+1;};return o[k];},set(o,k,v){o[k]=v;return true;}});
 class Node{
  constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.id=id;this.hidden=false;this.value='';this._text='';this.children=[];this.dataset={};this.listeners={};this.attributes={};this.style={setProperty(){}};this.disabled=false;this.checked=false;this.width=640;this.height=360;all.push(this);}
  get textContent(){return this._text+this.children.map(n=>n.textContent||'').join('');}set textContent(v){this._text=String(v??'');this.children=[];}
  get lastChild(){return this.children.at(-1);}get childNodes(){return this.children;}
  getContext(){return drawing;}getBoundingClientRect(){return{left:0,top:0,width:640,height:360};}
  addEventListener(k,fn){this.listeners[k]=fn;}setAttribute(k,v){this.attributes[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}getAttribute(k){return this.attributes[k]??(k.startsWith('data-')?this.dataset[k.slice(5)]??null:null);}setPointerCapture(){}focus(){}
  matches(selector){return selector.split(',').some(raw=>{const s=raw.trim();if(s==='[data-key]')return this.dataset.key!==undefined;if(s.startsWith('.'))return(this.className||'').split(' ').includes(s.slice(1));if(s.startsWith('#'))return this.id===s.slice(1);return this.tagName.toLowerCase()===s;});}
  querySelectorAll(selector){return descendants(this).filter(n=>n.matches?.(selector));}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  replaceChildren(...a){this._text='';this.children=[];this.append(...a);}append(...a){for(const child of a){const n=typeof child==='string'?{textContent:child}:child;n.parentNode=this;this.children.push(n);}}appendChild(n){this.append(n);return n;}after(n){n.afterNode=this;}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id==='world'||id.includes('Canvas')||id==='portrait'?'canvas':id.includes('Name')?'input':'div',id));return nodes.get(id);};
 const descendants=n=>n.children.flatMap(c=>[c,...(c.children?descendants(c):[])]);
 const document={getElementById:get,createElement:tag=>new Node(tag),createTextNode:t=>({textContent:String(t)}),addEventListener:(k,fn)=>events[k]=fn,querySelectorAll:s=>all.filter(n=>n.matches(s)),fonts:{ready:Promise.resolve()}};
 if(saved)storage.set('catdoor-life-v2',JSON.stringify({state:saved.state,scene:saved.scene||'bedroom',doorOpen:true,officeTalk:{},officeFeedback:false}));
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
 const ack=(text,wait=.5)=>{assert.equal(snap().ack,true,'an acknowledgement must be open');button('ackActions',text||/.*/,wait);};
 const clearAck=()=>{if(snap().ack)ack(find('ackActions','확인했어')?'확인했어':/.*/);};
 const dialogues=()=>{for(let i=0;i<60&&snap().dialogue;i++){step(.3);if(get('choices').children.length){get('choices').children[0].onclick();}else key('Enter');}assert.equal(snap().dialogue,undefined,'dialogue should finish');step(.4);};
 const target=(label,wait=3.8)=>{let b;for(let i=0;i<30&&!b;i++){b=descendants(get('hotspots')).find(n=>(n.getAttribute?.('aria-label')||'').includes(label));if(!b)step(.1);}assert.ok(b,`target ${label}: ${descendants(get('hotspots')).map(n=>n.getAttribute?.('aria-label')).join('|')} :: ${JSON.stringify(snap())}`);b.onclick();step(wait);};
 const officeDesk=()=>{pointer('pointerdown',330,245);pointer('pointerup',330,245);step(3.8);};
 const toRoom=room=>{if(snap().scene!==room)target(room==='living'?'부엌으로':'침실로');clearAck();assert.equal(snap().scene,room);};
 const fillTask=()=>{assert.ok(['prepare','work'].includes(snap().mini));if(find('taskSource','원본 찾아 열기'))button('taskSource','원본 찾아 열기');if(find('taskSource','공유 폴더 링크 받기'))button('taskSource','공유 폴더 링크 받기');
  if(snap().state.day===2&&snap().mini==='prepare'&&!snap().state.flags.deskEvent){drag([305,180],[190,300],1.7);}
  if(snap().task.kind==='calculate'){
    const current=snap(),inputs=get('taskSource').querySelectorAll('input');
    for(const slot of current.slots){const input=inputs.find(n=>n.getAttribute('data-slot')===slot.id);assert.ok(input,`numeric input for ${slot.id}`);const answer=current.task.cards.find(c=>c.id===current.task.solution[slot.id]);input.value=answer.text.match(/\d+/)[0];input.oninput({target:input});}
    step(.2);return;
  }
  for(const slot of snap().slots){const current=snap(),cardId=current.task.solution[slot.id],placed=current.slots.find(s=>s.cardId===cardId),live=current.cards.find(c=>c.id===cardId),from=[live.x+55,live.y+35];drag(from,[slot.x+65,slot.y+33]);}
 };
 const review=()=>{button('miniActions',snap().mini==='prepare'?'메모 저장':find('miniActions','최종 확인')?'최종 확인':'검수하고 공유',1.1);};
 const start=()=>{if(saved){const resume=all.find(n=>n.textContent==='이어서'&&typeof n.onclick==='function');assert.ok(resume);resume.onclick();step(.8);}else{get('playerName').value='하늘';get('startButton').onclick();step(.6);}};
 step(.3);if(autoStart)start();
 return{get,snap,step,key,press,pointer,drag,button,find,ack,clearAck,dialogues,target,officeDesk,toRoom,fillTask,review,paint,audio,all,start};
}
async function prologue(g){
 assert.equal(g.snap().intro,'rejection');assert.equal(g.snap().menu,true);assert.match(g.get('phoneBody').textContent,/지원 결과|함께하지/);assert.equal(g.snap().dialogue,undefined);
 g.button('phoneBody','확인');assert.equal(g.snap().intro,'meet');g.target('고양이에게');g.dialogues();assert.equal(g.snap().mini,'umbrella');
 g.drag([190,150],[320,150],2.3);g.dialogues();assert.equal(g.snap().intro,'sheltered');
 g.target('사료를 사고');assert.equal(g.snap().menu,true);assert.equal(g.snap().intro,'sheltered');g.button('phoneBody','12,000원',1.3);
 assert.equal(g.snap().intro,'name');assert.equal(g.snap().state.food,4);assert.equal(g.snap().state.cash,46000);
 g.get('catName').value='보리';g.get('nameForm').onsubmit({preventDefault(){}});g.dialogues();g.target('고양이를 쓰다듬');assert.equal(g.snap().mini,'pet');
 g.drag([300,235],[420,235],1.8);assert.equal(g.snap().intro,'routine');assert.equal(g.snap().state.flags.introFur,true);g.clearAck();
 g.target('보리와 함께');assert.equal(g.snap().mini,'bed');g.button('miniActions','문 열고 같이',8);
 assert.equal(g.snap().intro,'offer');assert.equal(g.snap().menu,true);assert.match(g.get('phoneBody').textContent,/첫 출근|노트북/);g.button('phoneBody','확인');g.clearAck();assert.equal(g.snap().state.day,0);assert.equal(g.snap().intro,'');
}
function resumeState(){const s=Life.create('하늘','보리');Life.act(s,'buyFood');return s;}
function feedAndWater(g){g.toRoom('living');if(g.snap().state.food<=1){g.get('foodLabel').onclick();g.button('phoneBody','12,000원');g.clearAck();}
 g.target('보리 밥을');if(g.snap().ack)g.ack('익숙한 건사료');assert.equal(g.snap().mini,'feed');g.drag([180,170],[385,155],3.4);g.step(3.3);g.clearAck();assert.equal(g.snap().state.needs.fed,true);
 g.target('물을 갈아');g.drag([180,170],[385,155],3.3);assert.equal(g.snap().state.water,true);
}
function bedtime(g,open=true){g.toRoom('bedroom');g.target('잠자리에');if(g.snap().ack){const text=g.get('ackText').textContent;if(text.includes('아직'))g.ack('밤까지 푹');else g.ack('오늘은 이대로');}assert.equal(g.snap().mini,'bed');g.button('miniActions',open?'문 열고':'문 닫고',5);}
function officeWork(g){g.target('팀장에게');g.dialogues();if(g.snap().state.day===1){g.target('동기에게');g.dialogues();}g.officeDesk();assert.equal(g.snap().mini,'work');g.fillTask();g.review();assert.equal(g.snap().state.phase,'afterWork');g.target('팀장에게');g.dialogues();g.target('퇴근한다',6);g.clearAck();assert.equal(g.snap().scene,'living');}
function commute(g,withBag=true){g.toRoom('bedroom');g.target('이불과 베개');g.target('출근할 옷');if(withBag)g.target('노트북 가방');g.toRoom('living');g.target('신발을 신고',.7);if(g.snap().ack)g.ack('회사 노트북을 빌린다',5);else g.step(5);if(g.snap().scene==='station'){g.target('열차에 탄다',6);}g.clearAck();assert.equal(g.snap().scene,'office');}

test('the actual phone, rescue, purchase, naming and gestures reach the first real evening',async()=>{
 const g=await game();await prologue(g);assert.equal(g.snap().scene,'bedroom');assert.equal(g.snap().state.me,'하늘');assert.equal(g.snap().state.cat,'보리');assert.ok(g.paint.drawImage>0);assert.ok(g.paint.fillRect>0);
});
test('sound starts with the start gesture, remains silent on the title, and can be muted',async()=>{
 const g=await game(undefined,{autoStart:false});assert.equal(g.audio.constructors,0);assert.equal(g.audio.starts,0);g.step(5);assert.equal(g.audio.constructors,0);
 g.start();assert.equal(g.audio.constructors,1);assert.ok(g.audio.resumes>=1);assert.ok(g.audio.starts>0);assert.equal(g.get('soundButton').getAttribute('aria-label'),'소리 끄기');
 g.get('soundButton').onclick();const resumes=g.audio.resumes;g.pointer('pointerdown',100,320);g.pointer('pointerup',100,320);g.step(1);
 assert.equal(g.audio.constructors,1);assert.equal(g.audio.resumes,resumes);assert.equal(g.get('soundButton').getAttribute('aria-label'),'소리 켜기');
 g.get('soundButton').onclick();assert.equal(g.audio.constructors,1);assert.ok(g.audio.resumes>resumes);assert.equal(g.get('soundButton').getAttribute('aria-label'),'소리 끄기');
});
test('continue enables sound on its own gesture and a chosen mute survives starting',async()=>{
 const resumed=await game({state:resumeState(),scene:'living'},{autoStart:false});assert.equal(resumed.audio.constructors,0);resumed.start();assert.equal(resumed.audio.constructors,1);assert.ok(resumed.audio.resumes>=1);assert.equal(resumed.get('soundButton').getAttribute('aria-label'),'소리 끄기');
 resumed.target('보리 밥을');resumed.drag([180,170],[385,155],3.4);assert.ok(resumed.audio.starts>0);
 const muted=await game(undefined,{autoStart:false});muted.get('soundButton').onclick();muted.start();muted.button('phoneBody','확인');muted.target('고양이에게');muted.dialogues();assert.equal(muted.audio.constructors,0);assert.equal(muted.audio.starts,0);assert.equal(muted.get('soundButton').getAttribute('aria-label'),'소리 켜기');
});
test('a physical food gesture cannot be replaced by E and the next object guide advances',async()=>{
 const g=await game({state:resumeState(),scene:'living'});assert.equal(g.snap().guideId,'food');g.target('보리 밥을');g.key('e');g.step(3);assert.equal(g.snap().state.needs.fed,false);
 g.drag([180,170],[385,155],3.4);assert.equal(g.snap().state.needs.fed,true);assert.equal(g.snap().guideId,'water');
 g.target('물을 갈아');g.drag([180,170],[385,155],3.4);assert.equal(g.snap().state.water,true);assert.equal(g.get('eveningOptions').hidden,false);g.button('eveningOptions','내일 준비',4);assert.equal(g.snap().guideId,'desk');
});
test('wrong semantic cards produce specific feedback and corrected cards complete preparation',async()=>{
 const s=resumeState();s.needs.fed=true;s.water=true;const g=await game({state:s,scene:'bedroom'});g.target('내일 쓸 파일');assert.equal(g.snap().mini,'prepare');
 const second=g.snap().slots[1],wrong=g.snap().cards.find(c=>c.id!==g.snap().task.solution[second.id]);g.drag([wrong.x+55,wrong.y+35],[second.x+65,second.y+33]);g.button('miniActions','메모 저장');assert.equal(g.snap().ack,true);assert.match(g.get('ackText').textContent,/원본과 다르거나 비어/);assert.equal(g.snap().slots[1].wrong,true);assert.notEqual(g.snap().slots[1].cardId,g.snap().task.solution[second.id]);assert.ok(g.paint.fillText>0);
 g.ack('돌아가서 고친다');g.fillTask();g.review();assert.equal(g.snap().mini,undefined);assert.deepEqual(Array.from(g.snap().state.preparedDays),[1]);g.target('내일 쓸 가방');assert.equal(g.snap().state.bagPrepared,true);
});
test('forgetting the bag requires a real choice and the borrowed computer changes the task',async()=>{
 const s=resumeState();s.day=1;s.phase='morning';const g=await game({state:s,scene:'bedroom'});g.target('출근할 옷');g.toRoom('living');g.target('신발을 신고',1);assert.equal(g.snap().ack,true);assert.match(g.get('ackText').textContent,/45분/);
 g.ack('회사 노트북을 빌린다',2);if(g.snap().scene==='station')g.target('열차에 탄다',6);g.clearAck();assert.equal(g.snap().scene,'office');assert.equal(g.snap().state.flags.borrowedLaptop,true);
 g.target('팀장에게');g.dialogues();g.officeDesk();assert.match(g.get('taskSource').textContent,/공용 노트북/);assert.ok(g.find('taskSource','원본 찾아 열기'));
});
test('an empty bowl wakes the player into an actual room and nighttime feeding preserves morning time',async()=>{
 const g=await game({state:resumeState(),scene:'bedroom'});bedtime(g,true);assert.equal(g.snap().scene,'living');assert.equal(g.snap().ack,true);assert.match(g.get('ackText').textContent,/빈 밥그릇/);assert.equal(g.get('timeLabel').textContent,'02:40');assert.equal(g.snap().state.flags.nightHunger,true);
 g.ack('지금 밥을 채운다',2.6);assert.equal(g.snap().scene,'bedroom');assert.equal(g.snap().state.needs.fed,true);assert.equal(g.snap().state.morningMin,0);assert.equal(g.snap().state.lastNight.nightCareMinutes,10);assert.ok(g.snap().state.energy<3);
});
test('play waits for a real movement and then responds to a move-and-pause gesture',async()=>{
 const s=resumeState();s.needs.fed=true;s.water=true;const g=await game({state:s,scene:'living'});g.target('보리와 논다');assert.equal(g.snap().mini,'play');g.step(7);assert.equal(g.snap().state.needs.played,false);
 g.drag([320,270],[500,270],7);assert.equal(g.snap().state.needs.played,true);
});
test('walking with the keyboard changes position without spending activity time',async()=>{
 const g=await game({state:resumeState(),scene:'living'}),before=g.snap();g.press('d',true);g.step(.5);g.press('d',false);
 assert.ok(g.snap().hero.x>before.hero.x);assert.equal(g.snap().state.eveningMin,before.state.eveningMin);assert.equal(g.snap().state.cash,before.state.cash);
});
test('submitting missing meeting data produces a real correction list on the next workday',async()=>{
 const s=resumeState();s.day=4;s.phase='work';const g=await game({state:s,scene:'office'});
 g.target('팀장에게');g.dialogues();g.officeDesk();if(g.find('taskSource','원본 찾아 열기'))g.button('taskSource','원본 찾아 열기');g.button('miniActions','검수하고 공유');g.ack('빠진 항목을 남기고 공유한다',1.2);
 assert.equal(g.snap().state.work.at(-1).status,'partial');const ids=Array.from(g.snap().state.issueQueue.map(i=>i.id));assert.equal(ids.length,3);
 g.target('팀장에게');g.dialogues();g.target('퇴근한다',6);g.clearAck();feedAndWater(g);g.target('보리와 논다');g.drag([320,270],[500,270],7);g.toRoom('bedroom');g.target('내일 쓸 가방');bedtime(g,true);g.clearAck();commute(g,true);
 g.target('팀장에게');g.dialogues();g.officeDesk();assert.match(g.get('taskSource').textContent,/전날 고치지 못한 항목/);
 const checks=g.get('taskSource').querySelectorAll('input');assert.equal(checks.length,ids.length);g.button('taskSource','원본 찾아 열기');
 const first=g.get('taskSource').querySelectorAll('input')[0];first.checked=true;first.onchange();assert.equal(g.snap().state.workActionsUsed,2);assert.equal(g.get('taskSource').querySelectorAll('input')[0].disabled,true);
 g.fillTask();g.review();assert.equal(g.snap().state.issueQueue[0].resolved,true);assert.equal(g.snap().state.issueQueue.filter(i=>!i.resolved).length,2);assert.deepEqual(Array.from(g.snap().state.work.at(-1).resolved),ids.slice(0,1));
});
test('fatigue limits deliberate reviews and still lets the player report unfinished work',async()=>{
 const s=resumeState();s.day=4;s.phase='work';s.strain=7;const g=await game({state:s,scene:'office'});
 g.target('팀장에게');g.dialogues();g.officeDesk();assert.match(g.get('taskSource').textContent,/검수 2\/2회/);g.button('taskSource','원본 찾아 열기');assert.equal(g.snap().state.workActionsUsed,1);
 g.button('miniActions','검수하고 공유');assert.equal(g.snap().state.workActionsUsed,2);g.ack('돌아가서 고친다');g.fillTask();assert.equal(g.snap().state.workActionsUsed,2,'moving cards does not spend review opportunities');
 g.review();assert.equal(g.snap().ack,true);assert.match(g.get('ackText').textContent,/검수할 힘을 다 썼다/);assert.equal(g.snap().state.work.length,0);
 g.ack('마친 만큼만 팀장에게 알린다',1.2);assert.equal(g.snap().state.work.at(-1).completed,false);assert.ok(g.snap().state.issueQueue.some(i=>i.key==='handIn'));
});
test('counting uses numeric fields, rejects the old 9 and 13 totals, then accepts 8, 4 and 12',async()=>{
 const s=resumeState();s.day=3;s.phase='work';const g=await game({state:s,scene:'office'});g.target('팀장에게');g.dialogues();g.officeDesk();assert.equal(g.snap().task.kind,'calculate');g.button('taskSource','원본 찾아 열기');
 const before=Array.from(g.snap().slots,s=>s.cardId),card=g.snap().cards[0],slot=g.snap().slots[0];g.drag([card.x+30,card.y+30],[slot.x+50,slot.y+30]);assert.deepEqual(Array.from(g.snap().slots,s=>s.cardId),before,'calculation cannot be completed by dragging answer cards');
 const entered={completedCount:'9',pendingCount:'4',totalCount:'13'};for(const input of g.get('taskSource').querySelectorAll('input')){const id=input.getAttribute('data-slot');if(id in entered){input.value=entered[id];input.oninput({target:input});}}
 g.review();assert.equal(g.snap().ack,true);assert.match(g.get('ackText').textContent,/완료 합계/);assert.match(g.get('ackText').textContent,/전체 건수/);g.ack('돌아가서 고친다');g.fillTask();g.review();assert.equal(g.snap().state.phase,'afterWork');assert.equal(g.snap().state.work.at(-1).missing.length,0);
});
test('making a seat beside the desk costs time now and shortens later preparation',async()=>{
 const s=resumeState();s.day=2;s.needs.fed=true;s.water=true;const g=await game({state:s,scene:'bedroom'}),before=s.eveningMin;
 g.target('내일 쓸 파일');g.drag([100,280],[550,232],1.8);assert.equal(g.snap().state.flags.deskSeat,true);assert.equal(g.snap().state.eveningMin,before+15);assert.equal(Life.duration(g.snap().state,'prepare'),50);
 assert.match(g.get('miniActions').textContent,/메모 저장 · 50분/);assert.match(g.get('miniHint').textContent,/50분/);
 g.fillTask();g.review();assert.equal(g.snap().state.eveningMin,before+65);assert.ok(g.snap().state.preparedDays.includes(3));assert.equal(g.snap().state.trust,4);
 const short=resumeState();short.day=2;short.eveningMin=116;short.needs.fed=true;short.water=true;const tight=await game({state:short,scene:'bedroom'});
 tight.target('내일 쓸 파일');tight.drag([100,280],[550,232],1);assert.equal(tight.snap().ack,true);assert.match(tight.get('ackText').textContent,/65분/);assert.equal(tight.snap().state.eveningMin,116);assert.equal(tight.snap().state.flags.deskSeat,undefined);
 tight.clearAck();tight.drag([305,180],[190,300],1.8);tight.fillTask();tight.review();assert.ok(tight.snap().state.preparedDays.includes(3));assert.equal(tight.snap().state.eveningMin,176);
});
test('twelve dates balance rest and preparation and reach the first ordinary team meeting',async()=>{
 const g=await game({state:resumeState(),scene:'bedroom'});const dates=[],rested=[];
 g.toRoom('living');g.target('후드티와 상자');g.drag([310,180],[500,280],1);g.get('miniExit').onclick();g.step(.5);assert.equal(g.snap().state.hoodie,true);
 for(let day=0;day<=12;day++){
  assert.equal(g.snap().state.day,day);dates.push(day);g.clearAck();feedAndWater(g);
  const next=day===5||day===6||day===7?8:day+1,prepare=day<12&&(g.snap().state.strain<2||day===11)&&!g.snap().state.preparedDays.includes(next);
  if(prepare){g.toRoom('bedroom');g.target('내일 쓸 파일');g.fillTask();g.review();g.clearAck();}
  else if(Life.clock(g.snap().state).remaining>=30){g.toRoom('living');g.target('소파에서 쉰다');rested.push(day);}
  if(day<12&&Life.clock(g.snap().state).remaining>=5){g.toRoom('bedroom');g.target('내일 쓸 가방');}
  if(Life.clock(g.snap().state).remaining>=Life.duration(g.snap().state,'play')){g.toRoom('living');g.target('보리와 논다');g.drag([320,270],[500,270],7);assert.equal(g.snap().state.needs.played,true);}
  bedtime(g,true);if(day===12)break;
  if(g.snap().ack&&g.get('ackText').textContent.includes('잠'))g.ack('아침에 챙긴다',2);
  g.clearAck();if([6,7].includes(day+1)){assert.equal(g.snap().state.phase,'evening');assert.match(g.get('timeLabel').textContent,/10:00/);continue;}
  commute(g,true);officeWork(g);
 }
 const s=g.snap().state;assert.equal(s.phase,'ending');assert.equal(s.work.length,10);assert.equal(s.log.length,13);assert.equal(s.project.presented,true);assert.equal(s.issueQueue.filter(i=>!i.resolved).length,0);assert.ok(s.transactions.every(t=>t.cash<0));assert.ok(rested.length>=3);assert.ok(s.work.some(w=>!w.prepared));assert.ok(s.strain<7);assert.deepEqual(dates,[0,1,2,3,4,5,6,7,8,9,10,11,12]);assert.match(g.get('endingText').textContent,/첫 팀 회의를 마쳤다/);
});
