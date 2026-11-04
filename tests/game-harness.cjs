const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const Life=require('../src/life-state.js');
const SAVE_KEY='catdoor-life-v4';

// 실제 HTML의 요소와 상태·대사·입력·렌더 코드를 함께 사용한다.
// 대체 오디오 장치는 실제 소리를 내지 않고, 그리기 장치는 잘못된 좌표를 검출한다.
async function game(saved,{autoStart=true,devicePixelRatio=1,revision=null,innerWidth=1000,innerHeight=900}={}){
 const read=file=>revision?execFileSync('git',['show',revision+':'+file],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'}):fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 const nodes=new Map(),all=[],events={},storage=new Map(),paint={},audio={constructors:0,resumes:0,starts:0,buzzStarts:0,decoded:0};let frame,time=0;
 class FakeAudioContext{
  constructor(){audio.constructors++;this.currentTime=0;this.sampleRate=3000;this.destination={};}
  resume(){audio.resumes++;}createOscillator(){return{frequency:{value:0},connect(){},start(){audio.starts++;},stop(){}};}
  createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  createBiquadFilter(){return{frequency:{value:0},connect(){}};}
  createBuffer(channels,length){return{getChannelData:()=>new Float32Array(length)};}
  decodeAudioData(b){assert.equal(Buffer.from(b).subarray(0,4).toString(),'RIFF');audio.decoded++;return Promise.resolve({kind:'phone-vibration'});}
  createBufferSource(){return{connect(){},start(){audio.starts++;if(this.buffer?.kind==='phone-vibration')audio.buzzStarts++;},stop(){}};}
 }
 const numeric={fillRect:4,clearRect:4,strokeRect:4,translate:2,scale:2,rotate:1,moveTo:2,lineTo:2,arc:5,ellipse:7,quadraticCurveTo:4,bezierCurveTo:6};
 const drawing=new Proxy({measureText:t=>({width:String(t).length*8}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {
  get(o,k){if(!(k in o))o[k]=(...args)=>{paint[k]=(paint[k]||0)+1;const values=k==='drawImage'?args.slice(1):k==='fillText'||k==='strokeText'?args.slice(1,3):numeric[k]?args.slice(0,numeric[k]):[];for(const value of values)assert.ok(Number.isFinite(value),`${String(k)} has invalid coordinate ${value}`);};return o[k];},set(o,k,v){o[k]=v;return true;}
 });
 const descendants=n=>n.children.flatMap(c=>[c,...(c.children?descendants(c):[])]);
 class Node{
  constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.id=id;this.hidden=false;this.value='';this._text='';this.children=[];this.dataset={};this.listeners={};this.attributes={};this.style={setProperty(name,value){this[name]=value;}};this.disabled=false;this.checked=false;this.width=640;this.height=360;all.push(this);}
  get textContent(){return this._text+this.children.map(n=>n.textContent||'').join('');}set textContent(v){this._text=String(v??'');this.children=[];}
  get lastChild(){return this.children.at(-1);}get childNodes(){return this.children;}
  getContext(){return drawing;}getBoundingClientRect(){return{left:0,top:0,width:640,height:360};}
  addEventListener(k,fn){this.listeners[k]=fn;}setAttribute(k,v){this.attributes[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}getAttribute(k){return this.attributes[k]??null;}setPointerCapture(){}focus(){}
  matches(selector){return selector.split(',').some(raw=>{const s=raw.trim();if(s==='[data-key]')return this.dataset.key!==undefined;if(s.startsWith('.'))return(this.className||'').split(' ').includes(s.slice(1));if(s.startsWith('#'))return this.id===s.slice(1);return this.tagName.toLowerCase()===s;});}
  querySelectorAll(selector){return descendants(this).filter(n=>n.matches?.(selector));}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  replaceChildren(...a){this._text='';this.children=[];this.append(...a);}append(...a){for(const child of a){const n=typeof child==='string'?{textContent:child}:child;n.parentNode=this;this.children.push(n);}}appendChild(n){this.append(n);return n;}after(n){n.afterNode=this;}
 }
 const html=read('index.html');
 for(const match of html.matchAll(/<([a-z0-9]+)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)){const n=new Node(match[1],match[3]);n.hidden=/\bhidden\b/.test(match[2]);for(const dimension of ['width','height']){const value=match[2].match(new RegExp(dimension+'="(\\d+)"'));if(value)n[dimension]=Number(value[1]);}nodes.set(n.id,n);}
 const get=id=>{assert.ok(nodes.has(id),`index.html is missing #${id}`);return nodes.get(id);};
 const document={getElementById:get,createElement:tag=>new Node(tag),createTextNode:t=>({textContent:String(t)}),addEventListener:(k,fn)=>events[k]=fn,querySelectorAll:s=>all.filter(n=>n.matches(s)),fonts:{ready:Promise.resolve()}};
 if(saved)storage.set(SAVE_KEY,JSON.stringify({state:saved.state,scene:saved.scene||'living',doorOpen:true,officeTalk:{},officeDone:false,officeFeedback:false,...saved}));
 const sandbox={document,console,Math,JSON,Map,Set,requestAnimationFrame:fn=>frame=fn,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async file=>{const b=fs.readFileSync(path.join(__dirname,'..',file));return{arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};},window:{devicePixelRatio,innerWidth,innerHeight,addEventListener(){},AudioContext:FakeAudioContext},Image:class{constructor(){this.complete=true;this.width=this.naturalWidth=1280;this.height=this.naturalHeight=1440;}set src(v){this.onload?.();}}};
 const c=vm.createContext(sandbox);for(const file of ['life-state.js','life-story.js','pixel-render.js','life-view.js','life-game.js']){if(file==='life-game.js'){const drawPortrait=c.PixelArt.portrait;c.PixelArt.portrait=(ctx,variant,x,y,w,h)=>{paint.portraits||=[];paint.portraits.push({variant,x,y,w,h});return drawPortrait(ctx,variant,x,y,w,h);};const title=c.LifeView.title;c.LifeView.title=(ctx,t,G)=>{paint.titleAssetKeys=Object.keys(G?.images||{});return title(ctx,t,G);};}const source=read('src/'+file);vm.runInContext(file==='life-game.js'?source.replace('window.CatDoorReview={','window.__R5Capture=()=>G;window.CatDoorReview={'):source,c,{filename:file});}
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
 return{get,snap,step,capture:()=>sandbox.window.__R5Capture(),runtime:c,key,press,pointer,drag,button,click,find,ack,clearAck,dialogues,target,toRoom,fillTask,pack,paint,audio,all,start,storage};
}


module.exports={game,SAVE_KEY};
