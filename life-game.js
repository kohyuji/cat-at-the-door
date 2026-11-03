/* Cat at the Door: 이동, 생활 동작, 관계의 흔적을 연결하는 장면 제어. */
(function(){
'use strict';
const $=id=>document.getElementById(id), canvas=$('world'),ctx=canvas.getContext('2d');
const titleCtx=$('titleCanvas').getContext('2d'), portrait=$('portrait').getContext('2d');
const W=640,H=360,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const G={s:null,scene:'street',mode:'title',intro:'',hero:{x:100,y:320,dir:1,walk:0},cat:{x:430,y:323,dir:-1,walk:0,pose:'sit'},keys:{},goal:null,pending:null,mini:null,dialog:null,now:0,last:0,doorOpen:true,doorAmount:1,dressed:false,transition:null,noticeUntil:0,lockedUntil:0,nearest:null,commute:'work',rideAt:0,trainX:680,catControl:false,catStage:'',carried:null,curtainClosed:false,jump:null,ambient:0,thunderAt:8,flash:0,images:{},menu:false,officeTalk:{},cameHomeDay:-1,placeCache:[],auto:[],lastUI:0,clickAt:0};
const Audio={enabled:true,ctx:null,rain:null};
function audioStart(){try{Audio.ctx ||= new (window.AudioContext||window.webkitAudioContext)();Audio.ctx.resume();}catch(_){}}
function tone(freq=440,duration=.07,type='triangle',volume=.025,pan=0){if(!Audio.enabled||!Audio.ctx)return;try{const a=Audio.ctx,o=a.createOscillator(),v=a.createGain(),p=a.createStereoPanner();o.type=type;o.frequency.value=freq;v.gain.setValueAtTime(volume,a.currentTime);v.gain.exponentialRampToValueAtTime(.001,a.currentTime+duration);p.pan.value=pan;o.connect(v);v.connect(p);p.connect(a.destination);o.start();o.stop(a.currentTime+duration);}catch(_){}}
function noise(duration=.8,volume=.035,pan=0,low=700){if(!Audio.enabled||!Audio.ctx)return;try{const a=Audio.ctx,n=Math.ceil(a.sampleRate*duration),b=a.createBuffer(1,n,a.sampleRate),data=b.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);const src=a.createBufferSource(),f=a.createBiquadFilter(),v=a.createGain(),p=a.createStereoPanner();src.buffer=b;f.type='lowpass';f.frequency.value=low;v.gain.value=volume;p.pan.value=pan;src.connect(f);f.connect(v);v.connect(p);p.connect(a.destination);src.start();}catch(_){}}
function rainAudio(on){if(!Audio.ctx)return;if(!on||!Audio.enabled){if(Audio.rain){try{Audio.rain.stop();}catch(_){}Audio.rain=null;}return;}if(Audio.rain)return;try{const a=Audio.ctx,n=a.sampleRate*3,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1);const src=a.createBufferSource(),f=a.createBiquadFilter(),v=a.createGain();src.buffer=b;src.loop=true;f.type='lowpass';f.frequency.value=2300;v.gain.value=.012;src.connect(f);f.connect(v);v.connect(a.destination);src.start();Audio.rain=src;}catch(_){}}
function later(seconds,fn){G.auto.push({at:G.now+seconds,fn});}
function notice(text,seconds=4){$('sceneNotice').textContent=text;$('sceneNotice').hidden=!text;G.noticeUntil=G.now+seconds;}
function setScene(scene,x=100,y=318){G.scene=scene;G.hero.x=x;G.hero.y=y;G.goal=null;G.pending=null;G.keys={};G.cat.pose='sit';updateUI();}
function fade(fn,seconds=.8){G.transition={start:G.now,duration:seconds,fn,switched:false};G.goal=null;G.keys={};G.lockedUntil=G.now+seconds;}
function dateInfo(){return LifeStory.days[clamp(G.s?.day||0,0,12)];}
function isStorm(){return !G.intro&&G.s&&(G.s.day===3||G.s.day===11)&&G.s.phase==='evening';}
function canSchedule(type,minutes){if(G.s.done[type]){notice('오늘은 이미 마쳤다.');return false;}if(G.s.phase==='evening'&&G.s.eveningMin+minutes>180){say([{who:G.s.me,text:'이것까지 하면 잠을 줄여야 한다. 오늘 꼭 해야 할 일부터 정하자.'}]);return false;}return true;}
function perform(type,opts={},quiet=false){const r=Life.act(G.s,type,opts);if(!quiet)notice(r.message,5);updateUI();if(r.ok)save();return r;}
function updateUI(){if(!G.s)return;const info=dateInfo();$('dateLabel').textContent=G.intro==='meet'||G.intro==='sheltered'?'2025년 겨울':G.intro==='montage'?['2026년 2월','4월','7월','9월'][Math.min(3,Math.floor((G.now-G.montageAt)/2))]:G.intro?'그해 겨울':`${info.date} (${info.weekday})`;
 $('moneyButton').textContent=`가방 · ${G.s.cash.toLocaleString()}원`;
 let text='';if(!G.intro){if(G.s.phase==='evening'){const m=(G.s.day===6||G.s.day===7?18*60:20*60)+G.s.eveningMin;text=`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}else if(G.s.phase==='morning'){const m=7*60+20+G.s.morningMin;text=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}else if(G.s.phase==='work')text='회사';else text='퇴근길';}$('timeLabel').textContent=G.s.day===0&&!G.intro?'첫 출근 전날 · '+text:text;
 $('soundButton').textContent=Audio.enabled?'소리 켬':'소리 끔';}
function say(lines,done=null,choices=null){if(typeof lines==='string')lines=[{who:G.s?.me||'나',text:lines}];if(!lines?.length){done?.();return;}G.dialog={lines,index:0,count:0,elapsed:0,done,choices,last:G.now};G.keys={};G.goal=null;$('dialogue').hidden=false;$('choices').replaceChildren();paintDialogue();}
function paintDialogue(){const d=G.dialog;if(!d)return;const line=d.lines[d.index];if(G.photoPending&&/호떡|사진/.test(line.text))G.photo=true;$('speaker').textContent=line.who==='나'?G.s.me:line.who;$('speech').textContent=line.text.slice(0,d.count);$('choices').replaceChildren();const complete=d.count>=line.text.length,last=d.index===d.lines.length-1;
 $('dialogueNext').hidden=complete&&last&&!!d.choices;
 if(complete&&last&&d.choices){for(const option of d.choices){const b=document.createElement('button');b.textContent=option.text;b.onclick=()=>{if(G.now-d.last<.25)return;const fn=option.run;closeDialogue();fn?.();};$('choices').appendChild(b);}}
 portrait.clearRect(0,0,48,64);portrait.imageSmoothingEnabled=false;const who=line.who;if(who===G.s.cat||who==='고양이'){portrait.save();portrait.translate(-5,8);portrait.scale(2,2);PixelArt.cat(portrait,15,21,1,G.now,'sit');portrait.restore();}else{const kind=who.includes('팀장')?'lead':who.includes('동기')?'peer':who.includes('사장')?'boss':'hoodie';PixelArt.person(portrait,24,62,kind,0,0,'stand');}}
function closeDialogue(){G.dialog=null;G.photo=false;G.photoPending=false;$('dialogue').hidden=true;G.lockedUntil=G.now+.25;canvas.focus({preventScroll:true});}
function advanceDialogue(){const d=G.dialog;if(!d||G.now-d.last<.23)return;d.last=G.now;const line=d.lines[d.index];if(d.count<line.text.length){d.count=line.text.length;paintDialogue();return;}if(d.index===d.lines.length-1){if(d.choices)return;const done=d.done;closeDialogue();done?.();}else{d.index++;d.count=0;d.elapsed=0;paintDialogue();}}
$('dialogueNext').onclick=advanceDialogue;$('speech').onclick=advanceDialogue;
function openInventory(){if(G.dialog||G.mini||!G.s)return;G.menu=true;G.keys={};const s=G.s,info=dateInfo(),body=$('inventoryBody');body.replaceChildren();
 const title=document.createElement('h2');title.textContent='가방';body.appendChild(title);
 const table=document.createElement('div');table.className='inventory-stats';for(const [k,v,icon]of [['생활비',s.cash.toLocaleString()+'원','briefcase'],['사료',`${s.food}회분`,'foodBag'],['돌돌이',s.roller.owned?`새 접착면 ${s.roller.sheets}장${s.roller.sheetOpen?' · 쓰던 면 별도':''}`:'아직 없음','roller'],['오늘의 약속',info.task,'document'],['급여 안내','월 2,450,000원 / 첫 정산 1,110,000원','phone'],['별도 확보','교통비와 기본 식비는 따로 두었다.','briefcase']]){const p=document.createElement('p');const graphic=document.createElement('canvas');graphic.width=42;graphic.height=42;graphic.setAttribute('aria-hidden','true');PixelArt.item(graphic.getContext('2d'),icon,21,38,.85);const a=document.createElement('strong');a.textContent=k+' ';const span=document.createElement('span');span.append(a,document.createTextNode(v));p.append(graphic,span);table.appendChild(p);}body.appendChild(table);
 const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{closeInventory();fn();};body.appendChild(b);};
 add('사료를 마련한다',()=>shop());if(!s.roller.owned)add('돌돌이 본체 + 첫 롤 · 4,000원',()=>perform('buyRoller'));else if(s.roller.sheets<5)add('교체롤 20장 · 2,000원',()=>perform('buyRefill'));
 if(!s.support)add('동기에게 연락한다',()=>askPeer());if(s.phase==='evening')add('일정을 확인하고 연락한다 · 15분',()=>{const r=perform('phonePlan');if(r.ok)say([{who:'동기',text:'어디까지 준비했는지 먼저 알려주면 같이 순서를 맞춰 볼 수 있어요.'}]);});
 $('inventory').hidden=false;}
function closeInventory(){G.menu=false;$('inventory').hidden=true;canvas.focus({preventScroll:true});}
$('moneyButton').onclick=openInventory;$('inventoryClose').onclick=closeInventory;
$('soundButton').onclick=()=>{Audio.enabled=!Audio.enabled;if(Audio.enabled)audioStart();rainAudio(isStorm()||G.scene==='street');updateUI();};
$('helpButton').onclick=()=>say([{who:'조작',text:'WASD 또는 방향키로 움직입니다. 가까이 가서 E를 누르거나 인물과 사물을 선택할 수 있어요.'},{who:'조작',text:'물건을 집은 뒤에는 끌어서 사용합니다. 시간은 활동을 마친 만큼 흐르고, 손이 느리다고 벌을 받지는 않아요.'}]);
function key(e,down){if(e.target.matches('input,textarea'))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' ','e','enter'].includes(k))e.preventDefault();if(e.repeat&&down&&(k==='e'||k==='enter'||k===' '))return;if(k==='escape'&&down){if(G.menu)closeInventory();else if(G.mini)exitMini();return;}if(G.dialog){if(down&&['e','enter',' '].includes(k))advanceDialogue();return;}if(down&&(k==='e'||k==='enter')){interact();return;}G.keys[k]=down;}
document.addEventListener('keydown',e=>key(e,true));document.addEventListener('keyup',e=>key(e,false));window.addEventListener('blur',()=>{G.keys={};});
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();G.keys[b.dataset.key]=true;};b.onpointerup=b.onpointercancel=()=>{G.keys[b.dataset.key]=false;};}
$('touchInteract').onclick=interact;$('contextButton').onclick=interact;
function target(id,label,x,y,w,h,ax,ay,fn){return {id,label,x,y,w,h,ax,ay,fn};}
function targets(){if(G.mode!=='play'||G.mini||G.dialog||G.transition)return[];const s=G.s,scene=G.scene,T=[];
 if(G.catControl){if(G.catStage==='door')T.push(target('catdoor','문틈으로 앞발을 넣는다',20,115,100,205,70,320,catDoorTry));
  if(G.catStage==='toy')T.push(target('cattoy',G.carried?'문틈에 밀어 넣는다':'인형을 문다',G.carried?20:335,G.carried?110:300,G.carried?105:50,G.carried?210:45,G.carried?70:360,325,G.carried?catLeaveToy:catPickToy));
  if(G.catStage==='scent')T.push(target('catscent','냄새가 나는 옷에 눕는다',455,240,120,100,510,323,catNest));return T;}
 if(G.intro==='meet')return[target('kitten','고양이에게 다가간다',420,285,60,50,435,320,()=>say(LifeStory.opening,()=>startMini('umbrella')))];
 if(G.intro==='sheltered')return[target('home','집으로 데려간다',525,190,100,145,550,320,adopt)];
 if(G.intro==='hoodie')return[target('pet','손을 내민다',G.cat.x-25,G.cat.y-30,50,40,G.cat.x-28,320,()=>startMini('pet'))];
 if(G.intro==='routine')return[target('light','불을 끈다',525,130,70,150,550,315,startMontage)];
 if(G.intro)return[];
 if(scene==='station'){if(G.trainX<50)T.push(target('board','열차에 탄다',250,120,160,220,330,322,boardTrain));return T;}
 if(scene==='train'){if(G.now-G.rideAt>3.5)T.push(target('alight','내린다',530,100,100,235,575,320,alight));return T;}
 if(scene==='office'){T.push(target('lead','팀장에게 말을 건다',410,135,70,140,445,305,()=>talk('lead')),target('peer','동기에게 말을 건다',145,160,75,140,180,310,()=>talk('peer')),target('desk','내 자료를 정리한다',290,205,95,100,330,310,()=>startMini('work')),target('exit','퇴근한다',550,90,80,245,575,315,leaveOffice));if(s.day===8)T.push(target('boss','사장님과 이야기한다',485,170,65,130,510,310,()=>talk('boss')));return T;}
 if(scene==='bedroom'){
  T.push(target('room','부엌 쪽으로 나간다',500,65,130,265,558,315,()=>moveRoom('living')),target('desk','자료를 준비한다',225,165,150,115,310,310,()=>startMini('prepare')),target('bed',s.phase==='morning'?'잠자리를 정리한다':'잠자리에 눕는다',10,220,180,105,180,315,s.phase==='morning'?()=>notice('베개 옆에 밤의 흔적이 남아 있다.'):bedtime));
  T.push(target('clothes','옷을 챙긴다',372,125,110,170,435,310,()=>s.phase==='morning'?dress():startMini('arrange')));
  if(s.phase==='morning')T.push(target('bag','출근 가방을 집는다',490,280,60,55,510,318,leaveHome));
 }else if(scene==='living'){
  T.push(target('room','방으로 들어간다',15,60,125,265,75,315,()=>moveRoom('bedroom')),target('food','밥을 준비한다',520,275,95,65,550,322,()=>startMini('feed')),target('water','물을 갈아 준다',470,290,55,45,490,322,()=>startMini('water')),target('cat','곁에 앉는다',G.cat.x-25,G.cat.y-35,50,37,clamp(G.cat.x-30,40,600),322,catInteract),target('toy','함께 논다',335,294,55,45,360,323,()=>startMini('play')),target('hoodie','옷과 자리를 정리한다',445,230,125,80,490,317,()=>startMini('arrange')),target('rest','잠깐 쉰다',410,185,175,110,450,310,rest));
  if(isStorm()&&!G.curtainClosed)T.push(target('curtain','창문과 커튼을 정리한다',410,55,190,140,570,315,()=>startMini('curtain')));
  if(s.phase==='morning')T.push(target('exit','출근한다',210,255,60,80,235,323,leaveHome));
 }return s.phase==='morning'?T.filter(t=>!['desk','toy','hoodie','rest'].includes(t.id)):T;
}
function interact(){if(G.dialog){advanceDialogue();return;}if(G.mode!=='play'||G.menu||G.transition||G.now<G.lockedUntil)return;if(G.mini){miniKey();return;}const t=G.nearest;if(t)t.fn();}
function clickWorld(e){if(G.mode!=='play'||G.menu||G.dialog||G.transition||G.now<G.lockedUntil)return;const p=point(e);if(G.mini){miniDown(p,e);return;}if(G.catControl){const list=targets(),hit=list.find(t=>p.x>=t.x&&p.x<=t.x+t.w&&p.y>=t.y&&p.y<=t.y+t.h);if(hit){G.goal={x:hit.ax,y:hit.ay};G.pending=hit;}else G.goal={x:clamp(p.x,25,615),y:clamp(p.y,293,338)};return;}const hit=targets().slice().reverse().find(t=>p.x>=t.x&&p.x<=t.x+t.w&&p.y>=t.y&&p.y<=t.y+t.h);if(hit){G.goal={x:hit.ax,y:hit.ay};G.pending=hit;}else if(p.y>270)G.goal={x:clamp(p.x,25,615),y:clamp(p.y,285,339)};}
function point(e){const r=canvas.getBoundingClientRect();const p={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height},cam=LifeView.camera(G);return {x:(p.x-cam.x)/cam.scale,y:(p.y-cam.y)/cam.scale};}
canvas.addEventListener('pointerdown',e=>{audioStart();canvas.focus({preventScroll:true});try{canvas.setPointerCapture(e.pointerId);}catch(_){}clickWorld(e);});
canvas.addEventListener('pointermove',e=>{if(G.mini)miniMove(point(e));});canvas.addEventListener('pointerup',e=>{if(G.mini)miniUp(point(e));});canvas.addEventListener('pointercancel',()=>{if(G.mini)G.mini.drag=null;});
function updateMovement(dt){if(G.dialog||G.menu||G.transition||G.mini||G.now<G.lockedUntil)return;const actor=G.catControl?G.cat:G.hero,keys=G.keys;let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(dx||dy){G.goal=null;G.pending=null;}else if(G.goal){const d=distance(actor,G.goal);if(d<3){actor.x=G.goal.x;actor.y=G.goal.y;G.goal=null;const t=G.pending;G.pending=null;t?.fn();}else{dx=(G.goal.x-actor.x)/d;dy=(G.goal.y-actor.y)/d;}}
 if(dx||dy){const len=Math.hypot(dx,dy)||1,speed=G.catControl?132:128;actor.x=clamp(actor.x+dx/len*speed*dt,22,618);actor.y=clamp(actor.y+dy/len*speed*dt,281,339);if(dx)actor.dir=dx>0?1:-1;actor.walk+=dt;}else actor.walk=0;
 const near=targets().map(t=>({...t,d:distance(actor,{x:t.ax,y:t.ay})})).sort((a,b)=>a.d-b.d)[0];G.nearest=near&&near.d<63?near:null;$('contextButton').hidden=!G.nearest;if(G.nearest)$('contextButton').textContent='E · '+G.nearest.label;
}
function updateCat(dt){if(G.catControl||G.mini||G.transition)return;const c=G.cat,s=G.s;if(!s)return;if(G.now<(G.catEatUntil||0)){c.x=G.catEatX||575;c.y=323;c.dir=-1;c.pose='eat';c.walk=0;return;}if(G.jump){const j=G.jump,p=clamp((G.now-j.start)/j.duration,0,1);c.x=j.x0+(j.x1-j.x0)*p;c.y=j.y0+(j.y1-j.y0)*p-Math.sin(p*Math.PI)*34;c.pose='jump';if(p>=1){G.jump=null;c.pose='sleep';}return;}
 if(isStorm()&&!G.curtainClosed){c.x=570+Math.sin(G.now*5)*1.5;c.y=307;c.pose='fear';return;}
 let aim=null;if(G.intro==='sheltered')aim={x:G.hero.x-35,y:G.hero.y+2};else if(G.scene==='living'&&s.needs.fed&&!s.needs.played&&s.trust>=4)aim={x:G.hero.x+35,y:G.hero.y+4};else if(G.scene==='living'&&s.hoodie)aim={x:510,y:315};
 if(aim){const dx=aim.x-c.x,dy=aim.y-c.y,d=Math.hypot(dx,dy);if(d>4){const step=Math.min(d,dt*62);c.x+=dx/d*step;c.y+=dy/d*step;c.dir=dx>=0?1:-1;c.walk+=dt;c.pose='walk';}else{c.walk=0;c.pose=s.hoodie?'sleep':'sit';}}else{c.walk=0;if(c.pose!=='eat')c.pose='sit';}}

function adopt(){fade(()=>{setScene('living',260);G.intro='name';G.cat.x=400;G.cat.y=323;$('naming').hidden=false;$('catName').focus();},1);}
$('nameForm').onsubmit=e=>{e.preventDefault();G.s.cat=$('catName').value.trim()||'보리';$('naming').hidden=true;G.intro='hoodie';G.cat.x=390;G.cat.y=323;say([{who:G.s.me,text:`${G.s.cat}…?`},{who:G.s.cat,text:'야옹.'}],()=>notice('다가온 고양이에게 손을 내민다.',4));};
function startMontage(){G.intro='montage';G.montageAt=G.now;G.keys={};G.hero.x=330;G.cat.x=348;G.cat.y=290;G.cat.pose='sleep';later(8,()=>{G.intro='offer';say([{who:'휴대폰',text:`${G.s.me} 님, 최종 합격을 축하드립니다. 첫 출근은 9월 14일 월요일입니다.`},{who:'휴대폰',text:'월 급여 2,450,000원. 중도 입사 첫 정산은 9월 25일, 1,110,000원입니다.'},{who:G.s.me,text:'내일은… 정말 출근이네.'}],()=>{G.intro='';G.s.phase='evening';G.s.day=0;G.doorOpen=true;setScene('bedroom',380);G.cat.x=420;G.cat.y=323;notice('가방과 내일 입을 옷을 챙겨 둔다. 배고픈 기척도 들린다.',6);updateUI();save();});});}
function moveRoom(room){if(G.intro)return;fade(()=>{setScene(room,room==='living'?125:520);G.cat.x=room==='living'?G.s.hoodie?510:430:460;G.cat.y=323;},.65);}
function catInteract(){if(G.s.phase==='morning'){tone(260,.12,'sine',.015);notice('문 앞에서 가방 냄새를 맡고 한 번 몸을 비빈다.',3);return;}if(isStorm()&&!G.curtainClosed){say([{who:G.s.me,text:'창문이 덜컹일 때마다 몸이 움찔한다. 먼저 바람부터 막자.'}]);return;}if(G.s.needs.played){G.cat.pose='sit';tone(160,.3,'sine',.018);notice(G.s.trust>3?'손에 이마를 한 번 비볐다.':'한 걸음 떨어져 앉았다. 지금은 기다려 주기로 했다.');return;}startMini('play');}
function rest(){if(!canSchedule('rest',40))return;const r=perform('rest',{},true);if(r.ok){G.restAt=G.now;G.cat.pose=G.s.hoodie?'sleep':'sit';G.lockedUntil=G.now+2.4;notice('등을 기대고 어깨의 힘을 풀었다.',3);later(2.4,()=>{G.restAt=null;updateUI();});}}
function dress(){if(G.dressed){startMini('roller');return;}G.dressed=true;G.hero.pose='stand';tone(500,.06);notice(G.s.fur?'정장을 입었다. 소매에 남은 털이 보인다.':'걸어 둔 정장을 입고 가방을 챙겼다.',4);updateUI();}
function leaveHome(){const s=G.s;if([6,7].includes(s.day)){notice('오늘은 출근하지 않는 날이다.');return;}if(s.phase!=='morning'){notice('오늘은 집에서 마무리할 일이 남아 있다.');return;}if(!G.dressed){say([{who:s.me,text:'정장과 가방부터 챙기자. 오늘 입을 옷은 방 안에 걸려 있다.'}]);return;}if(s.fur>0&&!s.flags['furSeen'+s.day]){s.flags['furSeen'+s.day]=true;say([{who:s.me,text:'소매에 털이 붙어 있다. 정리하고 갈 수도 있고, 시간이 급하면 이대로 갈 수도 있다.'}],null,[{text:'정장을 살핀다',run:()=>startMini('roller')},{text:'가방을 들고 나간다',run:()=>enterStation('work')}]);return;}enterStation('work');}
function enterStation(direction){G.commute=direction;fade(()=>{setScene('station',75);G.trainX=680;G.stationAt=G.now;G.hero.pose='stand';notice(direction==='work'?'출근길':'퇴근길',2);tone(620,.15,'sine',.02);},1);}
function boardTrain(){if(G.trainX>50)return;fade(()=>{setScene('train',140);G.rideAt=G.now;tone(740,.16,'sine',.02);if(G.s.day===1&&G.commute==='work')say([{who:G.s.me,text:'같은 문을 닫고 나왔는데, 오늘은 갈 곳이 있다.'}]);},.8);}
function alight(){if(G.now-G.rideAt<3.5)return;if(G.commute==='work')enterOffice();else arriveHome();}
function enterOffice(){fade(()=>{setScene('office',570);G.s.phase='work';G.officeTalk={};G.officeDone=G.s.work.some(w=>w.day===G.s.day);G.photo=false;notice(dateInfo().task,6);if(G.s.day===1)say([{who:'동기',text:'새로 오신 분이죠? 팀장님은 저쪽에 계세요. 저는 옆자리예요.'}]);},1);}
function talk(role){if(G.s.day===8&&role==='boss'&&!G.officeDone){say([{who:'사장',text:'우선 오늘 자료부터 같이 볼까요. 정리한 부분을 팀에 공유해 주세요.'}]);return;}G.officeTalk[role]=true;G.photo=false;G.photoPending=role==='boss';let choices=null;
 if(role==='peer')choices=[{text:'고맙다고 한다',run:()=>{}},...(G.s.food<=1?[{text:'사료를 조금 부탁한다',run:()=>{const r=perform('askFood');if(r.ok)say([{who:'동기',text:'오늘 먹일 만큼 챙겨 줄게요. 다음 장 볼 때 같이 사요.'}]);}}]:[]),...(!G.s.support&&G.s.day>=2?[{text:'집에서 겹친 일을 이야기한다',run:()=>{perform('askSupport');say([{who:'동기',text:'전날 어디까지 할 수 있는지 먼저 말해 줘요. 같이 맞출 부분은 맞추면 돼요.'}]);}}]:[])];
 if(role==='boss')choices=[{text:'초안을 먼저 보내겠다고 한다',run:()=>{perform('phonePlan',{day:9});G.photo=false;}},{text:'필요한 부분을 메모한다',run:()=>{G.photo=false;}}];
 say(LifeStory.dialogue(G.s,role),()=>{G.photo=false;},choices);}
function leaveOffice(){if(!G.officeDone){say([{who:'팀장',text:'오늘 정리할 자료가 아직 책상에 남아 있어요. 끝낸 부분과 남긴 부분은 공유하고 갑시다.'}],null,[{text:'내 자리로 돌아간다',run:()=>{G.goal={x:330,y:310};}},{text:'부족한 상태를 알리고 퇴근한다',run:()=>completeWork(true)}]);return;}if(G.s.day===8&&!G.officeTalk.boss){G.goal={x:510,y:310};G.pending={fn:()=>talk('boss')};return;}enterStation('home');}
function completeWork(left=false){if(G.officeDone)return;const report=Life.finishWork(G.s,{completed:!left});G.officeDone=report.ok;G.s.phase='afterWork';updateUI();save();say(LifeStory.workReport(G.s),()=>{if(G.s.day===12)notice('첫 정산이 입금됐다. 가방에서 명세를 확인할 수 있다.',7);if(left)leaveOffice();});}
function arriveHome(){fade(()=>{const s=G.s;Life.arriveHome(s);G.cameHomeDay=s.day;G.dressed=false;G.doorOpen=true;G.curtainClosed=!!(s.routine>=3&&s.hoodie&&s.day===11);G.cat.x=s.trust<=2?570:430;G.cat.y=323;G.cat.pose='sit';setScene('living',220);if(G.curtainClosed)perform('secureWindow',{},true);s.eveningMin=(s.day===8?60:s.day===3?20:0)+(s.flags.workDelayMinutes||0);notice(LifeStory.homeLine(s),7);if(s.food<=1)later(5,()=>notice(`봉지가 가벼워졌다. 다음 밥 ${s.food}회분이 남아 있다.`,6));if(s.day===4&&!s.suitStored){s.flags.scentNight=true;}save();},1);}
function askPeer(){say([{who:'동기',text:G.s.food<=1?'마침 우리 집 사료도 덜어 놓은 게 있어요. 오늘 먹일 건 챙겨 줄게요.':'오늘 어떤 일이 겹쳤어요? 할 수 있는 부분부터 같이 맞춰 봐요.'}],null,[...(G.s.food<=1?[{text:'먹일 사료를 조금 부탁한다',run:()=>perform('askFood')}]:[]),{text:'내일 일정을 미리 맞춘다',run:()=>{perform('askSupport');perform('phonePlan');}},{text:'전화를 마친다',run:()=>{}}]);}
function shop(){if(G.intro)return;G.shopping=true;say([{who:'가게',text:'필요한 물건을 골라 주세요. 한 봉지 대신 필요한 만큼 덜어 갈 수도 있어요.'}],()=>{G.shopping=false;},[
 {text:'사료 6회분 · 18,000원',run:()=>{G.shopping=false;perform('buyFood');save();}},
 {text:'사료 소분 2회분 · 6,000원',run:()=>{G.shopping=false;perform('smallFood');save();}},
 ...(!G.s.roller.owned?[{text:'돌돌이 + 첫 롤 · 4,000원',run:()=>{G.shopping=false;perform('buyRoller');save();}}]:[]),
 {text:'동기에게 도움을 청한다',run:()=>{G.shopping=false;askPeer();}},
 {text:'고르지 않고 돌아간다',run:()=>{G.shopping=false;}}
 ]);}
function bedtime(){if(G.s.phase!=='evening')return;const missing=[];if(!G.s.needs.fed)missing.push('밥그릇이 비어 있다');if(!G.s.water)missing.push('물을 아직 갈지 않았다');if(missing.length){say([{who:G.s.me,text:missing.join('. ')+'. 잠들기 전에 돌아볼 수 있다.'}],null,[{text:'부엌으로 돌아간다',run:()=>moveRoom('living')},{text:'오늘은 이대로 눕는다',run:()=>startMini('bed')}]);return;}startMini('bed');}
function beginSleep(){const day=G.s.day,open=G.doorOpen;G.lastSleepDay=day;G.sleeping=true;G.hero.x=90;G.hero.y=262;G.hero.pose='sleep';G.mini=null;hideMini();G.lockedUntil=G.now+5;
 if(open){G.cat.x=330;G.cat.y=323;G.cat.pose='walk';G.bedApproach=true;}
 tone(140,.5,'sine',.012);later(4.8,()=>{const r=Life.sleep(G.s,open);G.sleeping=false;G.bedApproach=false;if(G.s.phase==='ending'){showEnding();return;}if(!open&&(day===0||day===4)){catPerspective(day);return;}morning(r.message);});}
function catPerspective(oldDay){fade(()=>{G.catControl=true;G.catStage=oldDay===4?'scent':'door';G.catOldDay=oldDay;G.carried=null;G.cameraAt=G.now;setScene('living',75);G.cat.x=80;G.cat.y=324;G.cat.pose='stand';G.dressed=false;G.hero.pose='sleep';$('moneyButton').hidden=true;$('timeLabel').hidden=true;noise(.3,.02,-.7,400);},1.2);}
function catDoorTry(){G.catStage='toy';G.cat.pose='sit';tone(530,.17,'sine',.035,-.7);notice('안쪽에서 이불이 한 번 움직였다. 문은 열리지 않는다.',4);}
function catPickToy(){G.carried='toy';tone(900,.04);notice('익숙한 문 쪽으로 가져간다.',3);}
function catLeaveToy(){G.carried=null;G.s.flags.toyAtDoor=true;G.cat.pose='sleep';G.lockedUntil=G.now+2;later(2,()=>endCatPerspective());}
function catNest(){G.cat.pose='sleep';if(!G.s.suitStored){G.s.flags.catSleptOnSuit=true;G.s.fur=Math.max(G.s.fur,8);}else G.s.flags.catUsedHoodie=true;G.lockedUntil=G.now+2.4;later(2.4,()=>endCatPerspective());}
function endCatPerspective(){G.catControl=false;G.carried=null;$('moneyButton').hidden=false;$('timeLabel').hidden=false;morning();}
function morning(message=''){fade(()=>{G.hero.pose='stand';G.dressed=false;G.curtainClosed=true;G.sleeping=false;G.doorOpen=false;setScene('bedroom',200);G.cat.x=G.s.hoodie?510:430;G.cat.y=323;tone(820,.12,'sine',.03);later(.25,()=>tone(1000,.12,'sine',.025));
  if(G.s.day===6||G.s.day===7){Life.arriveHome(G.s);notice(G.s.day===6?'출근하지 않는 날. 물건과 내 자리를 돌아볼 시간이 있다.':'내일 쓸 자료와 내 휴식도 챙겨 둔다.',6);updateUI();}
  else if(G.s.flags.catSleptOnSuit){notice('문은 닫았는데 정장 위에 털이 남아 있다. 곁의 회색 옷에서도 같은 냄새가 난다.',7);G.s.flags.catSleptOnSuit=false;}
  else if(G.s.flags.catUsedHoodie){notice('정장은 옷걸이에 그대로다. 낮은 자리의 후드티에 작은 몸 자국이 남았다.',7);G.s.flags.catUsedHoodie=false;}
  else if(G.s.flags.toyAtDoor&&!G.s.flags.toyDiscovered){notice('방문 앞에 쥐 인형이 놓여 있다. 방금 지나온 밤의 그 자리다.',6);G.s.flags.toyDiscovered=true;}
  else if(message)notice(message,5);updateUI();save();},1.2);}
function showEnding(){G.mode='ending';rainAudio(false);const e=Life.ending(G.s);G.endingKey=e.key;$('gameScreen').hidden=true;$('endingTitle').textContent=e.title;$('endingText').replaceChildren();for(const line of e.lines){const p=document.createElement('p');p.textContent=line;$('endingText').appendChild(p);}const p=document.createElement('p');p.className='ending-record';p.textContent=`열두 날의 일과 ${G.s.log.length}번의 밤이 집에 남았다.`;$('endingText').appendChild(p);$('endingScreen').hidden=false;localStorage.removeItem('catdoor-life-save');}
function save(){if(G.intro||G.catControl)return;try{localStorage.setItem('catdoor-life-save',JSON.stringify({state:G.s,scene:G.scene,dressed:G.dressed,doorOpen:G.doorOpen}));}catch(_){}}

function startMini(type){if(G.mini||G.dialog)return;const s=G.s;const spec={feed:['밥 준비','봉지를 그릇 위로 옮겨 기울인다.'],water:['물 갈기','물병을 파란 그릇 위로 옮긴다.'],play:['함께 놀기','낚싯대를 움직이다 잠시 멈춰 잡을 기회를 준다.'],prepare:['내일의 자료','문서를 필요한 자리에 옮겨 정리한다.'],work:['오늘 맡은 일','자료의 순서와 자리를 정리해 공유한다.'],arrange:['물건의 자리','정장은 옷걸이로, 내 냄새가 남은 옷은 낮은 자리로 옮긴다.'],curtain:['비 오는 창문','커튼을 옆으로 당겨 바람과 번쩍임을 막는다.'],roller:['정장 손질','돌돌이를 쥐고 털 위를 민다. 쓴 면이 더러워지면 모서리를 벗긴다.'],bed:['잠자리','문손잡이로 틈을 정하고, 이불을 당겨 눕는다.'],umbrella:['우산','우산을 고양이 쪽으로 기울인다.'],pet:['곁에 앉기','고양이 등을 따라 천천히 손을 움직인다.']};
 if(type==='roller'&&!s.roller.owned){say([{who:s.me,text:'돌돌이가 아직 없다. 하나 사 두면 남은 접착면은 다음 날도 쓸 수 있다.'}],null,[{text:'본체와 첫 롤을 산다 · 4,000원',run:()=>{if(perform('buyRoller').ok)startMini('roller');}},{text:'오늘은 이대로 간다',run:()=>{}}]);return;}
 if(type==='roller'&&s.fur<=0){notice('정장에 남은 털은 없다. 새 접착면을 쓸 필요가 없다.');return;}
 if(type==='feed'&&s.needs.fed){notice('그릇은 채웠다. 더 붓기보다 고양이가 먹는 모습을 지켜본다.');return;}if(type==='feed'&&s.food<=0){shop();return;}if(type==='water'&&s.water){notice('물은 이미 깨끗하다.');return;}
 if(type==='play'&&!canSchedule('play',35))return;if(type==='prepare'&&!canSchedule('prepare',50))return;if(type==='work'&&G.officeDone){notice('오늘 맡은 자료는 공유했다. 남은 이야기를 듣고 퇴근할 수 있다.');return;}
 const m=G.mini={type,start:G.now,drag:null,p:{x:180,y:170},progress:0,moved:0,catX:320,catY:285,lastP:null,lastMove:G.now,complete:false,placed:{},cards:[],fur:[],pointer:{x:320,y:220},door:G.doorOpen?1:0};
 if(type==='prepare'&&s.day===2&&!s.flags.deskEvent){m.deskCat=true;m.deskPhase='blocking';m.cozy={x:100,y:280};m.deskCatxy={x:305,y:180};spec.prepare[1]='빈 상자를 옆으로 옮기거나 고양이를 책상 밖으로 부드럽게 안내한다.';}
 if(type==='prepare'||type==='work'){const words=s.day===1&&type==='work'?['계정 안내','인수인계','이번 주 일정']:s.day===9?['현황','근거','대응안']:s.day===12?['끝낸 일','남은 일','인계할 곳']:['원본 수치','정리한 표','보고 요약'];m.cards=words.map((word,i)=>({x:110+i*145,y:113,w:100,h:90,word,slot:i,placed:false}));}
 if(type==='roller'){const count=Math.max(1,s.fur);for(let i=0;i<count;i++)m.fur.push({x:220+(i*59)%190,y:110+(i*37)%170,on:true});m.p={x:145,y:165};m.used=false;}
 if(type==='arrange'){m.items=[...(!s.suitStored?[{type:'suit',x:190,y:160}]:[]),...(!s.hoodie?[{type:'hoodie',x:310,y:180}]:[]),...([6,7].includes(s.day)&&!s.done.weekendSpace?[{type:'box',x:265,y:170}]:[])];if(!m.items.length){G.mini=null;notice('정장은 걸려 있고, 낮은 자리에는 익숙한 옷이 놓여 있다.');return;}}
 if(type==='umbrella')m.p={x:190,y:150};
 G.goal=null;G.keys={};$('minigameBar').hidden=false;$('miniLabel').textContent=spec[type][0];$('miniHint').textContent=spec[type][1];$('miniExit').hidden=type==='umbrella'||type==='pet';$('contextButton').hidden=true;}
function hideMini(){$('minigameBar').hidden=true;}
function exitMini(){if(!G.mini)return;if(G.mini.type==='roller')perform('stopRoller',{},true);G.mini=null;hideMini();G.lockedUntil=G.now+.25;updateUI();save();}
$('miniExit').onclick=exitMini;
function finishMini(fn,wait=.75){const m=G.mini;if(!m||m.complete)return;m.complete=true;G.lockedUntil=G.now+wait;later(wait,()=>{G.mini=null;hideMini();fn?.();updateUI();save();});}
function miniDown(p){const m=G.mini;if(!m||m.complete)return;m.pointer=p;m.down=true;m.lastP=p;
 if(['feed','water','roller','umbrella'].includes(m.type)){if(m.type==='roller'&&p.x>435&&p.y<115){m.drag='peel';m.peelY=p.y;}else m.drag='tool';m.offset={x:p.x-m.p.x,y:p.y-m.p.y};}
 if(m.deskCat&&m.deskPhase==='blocking'){if(Math.hypot(p.x-m.cozy.x,p.y-m.cozy.y)<55){m.drag=m.cozy;m.offset={x:p.x-m.cozy.x,y:p.y-m.cozy.y};return;}if(Math.hypot(p.x-305,p.y-180)<60){m.drag='guideCat';return;}}
 if(m.type==='prepare'||m.type==='work'){const card=m.cards.slice().reverse().find(a=>!a.placed&&p.x>a.x&&p.x<a.x+a.w&&p.y>a.y&&p.y<a.y+a.h);if(card&&!(m.deskCat&&m.deskPhase==='blocking'&&card.slot===1)){m.drag=card;m.offset={x:p.x-card.x,y:p.y-card.y};}}
 if(m.type==='arrange'){const item=m.items.find(a=>Math.hypot(a.x-p.x,a.y-p.y)<55);if(item)m.drag=item;}
 if(m.type==='curtain')m.drag='curtain';
 if(m.type==='bed'){m.drag=p.x>425?'door':'blanket';m.initial=p;}
 if(m.type==='pet')m.drag='hand';
}
function miniMove(p){const m=G.mini;if(!m||m.complete)return;const delta=m.lastP?Math.hypot(p.x-m.lastP.x,p.y-m.lastP.y):0;m.pointer=p;if(delta>1)m.lastMove=G.now;
 if(m.type==='play'){m.lastP=p;return;}
 if(!m.down)return;
 if(m.drag==='guideCat'){if(p.x<190){deskRoute('away');}m.lastP=p;return;}
 if(m.drag==='tool'){m.p={x:p.x-(m.offset?.x||0),y:p.y-(m.offset?.y||0)};if(m.type==='roller'){
   const hits=m.fur.filter(f=>f.on&&Math.abs(f.x-m.p.x)<32&&Math.abs(f.y-m.p.y)<16);if(hits.length){if(!m.used){const r=perform('startRoller',{},true);if(!r.ok){notice(r.message);return;}m.used=true;}
    const r=perform('roll',{amount:hits.length},true);if(r.ok){hits.slice(0,r.removed).forEach(f=>f.on=false);tone(220,.025,'sawtooth',.008);}else notice(r.message,3);}
  }}
 if(m.drag==='peel'&&p.y-m.peelY>55){const r=perform('peelRoller',{},true);if(r.ok){m.used=false;m.drag=null;notice('더러워진 접착면을 벗겼다. 다음 쓸기에서 새 면을 쓴다.',3);}}
 if(typeof m.drag==='object'&&m.drag){m.drag.x=p.x-(m.offset?.x||0);m.drag.y=p.y-(m.offset?.y||0);}
 if(m.drag==='curtain')m.progress=clamp((p.x-400)/160,0,1);
 if(m.drag==='door'){m.door=clamp((p.x-430)/150,0,1);G.doorOpen=m.door>.5;}
 if(m.drag==='blanket')m.progress=clamp((m.initial.y-p.y)/85,0,1);
 if(m.drag==='hand'){m.moved+=delta;if(m.moved>90){tone(130,.3,'sine',.015);finishMini(()=>{if(G.intro==='hoodie'){G.intro='routine';G.s.flags.introFur=true;notice('후드티의 회색 천에 치즈색 털이 남았다.',5);}else perform('play');},1.2);}}
 m.lastP=p;
}
function miniUp(p){const m=G.mini;if(!m||m.complete)return;m.down=false;
 if(['feed','water'].includes(m.type)&&Math.abs(p.x-385)<95&&p.y>100&&p.y<340){m.p={x:353,y:155};m.placed=true;}
 if(m.deskCat&&m.deskPhase==='blocking'&&m.drag===m.cozy){if(p.x>485&&p.y>215){if(perform('deskSpace').ok)deskRoute('beside');else m.cozy={x:100,y:280};}m.drag=null;return;}
 if(m.type==='prepare'||m.type==='work'){const c=m.drag;if(c&&typeof c==='object'&&m.cards.includes(c)){const i=Math.floor((p.x-95)/155);if(p.y>230&&p.y<330&&i===c.slot){c.placed=true;c.x=103+i*155;c.y=248;tone(600+i*80,.05);}else{c.x=110+c.slot*145;c.y=113;}}if(m.cards.every(c=>c.placed))finishMini(()=>m.type==='work'?completeWork():perform('prepare'),1);}
 if(m.type==='arrange'&&m.drag&&typeof m.drag==='object'){const item=m.drag;if(item.type==='suit'&&p.x>440&&p.y<245){const r=perform('storeSuit');if(r.ok)m.items=m.items.filter(a=>a!==item);}if(item.type==='hoodie'&&p.x>395&&p.y>245){const r=perform('hoodie');if(r.ok)m.items=m.items.filter(a=>a!==item);}if(item.type==='box'&&p.x>395&&p.y>245){const r=perform('weekendSpace');if(r.ok)m.items=m.items.filter(a=>a!==item);}if(!m.items.length)finishMini(()=>{},1);}
 if(m.type==='curtain'&&m.progress>.8){G.curtainClosed=true;perform('secureWindow',{},true);finishMini(()=>{G.cat.pose='sit';G.cat.x=530;noise(.15,.012,.7,300);say([{who:G.s.me,text:'창문이 조용해졌다. 웅크렸던 몸이 조금 펴진다.'}],null,[{text:'곁에 앉아 진정시킨다 · 30분',run:()=>{if(perform('calmRain').ok){G.restAt=G.now;G.lockedUntil=G.now+2;later(2,()=>G.restAt=null);}}},{text:'익숙한 자리를 두고 내 일을 한다',run:()=>{}}]);},1.4);}
 if(m.type==='bed'&&m.progress>.8){beginSleep();return;}
 if(m.type==='umbrella'){const progress=clamp((m.p.x-190)/130,0,1);if(progress>.7){m.progress=1;finishMini(()=>{G.intro='sheltered';G.cat.x=445;G.cat.y=323;say([{who:G.s.me,text:'같이 갈까?'}],()=>notice('가게 앞을 지나 집으로 향한다.',5));},1.8);}}
 m.drag=null;
}
function deskRoute(route){const m=G.mini;if(!m||m.deskPhase!=='blocking')return;m.catRoute=route;m.deskPhase='moving';m.catMoveAt=G.now;if(route==='beside')m.cozy={x:550,y:232};m.drag=null;G.s.flags.deskEvent=true;tone(350,.1,'triangle',.02);later(1.5,()=>{if(G.mini===m){m.deskPhase=route==='beside'?'settled':'away';$('miniHint').textContent=route==='beside'?'비워진 자료를 정리한다. 옆자리에는 작은 숨소리가 남았다.':'고양이가 바닥으로 내려갔다. 비워진 자료를 정리한다.';}});}
function miniKey(){const m=G.mini;if(!m||m.complete)return;
 if(m.deskCat&&m.deskPhase==='blocking'){if(perform('deskSpace').ok)deskRoute('beside');else deskRoute('away');return;}if(m.deskPhase==='moving')return;
 if(m.type==='roller'){if(G.s.roller.sheetOpen&&G.s.roller.dirty>=Life.SHEET_CAPACITY){perform('peelRoller');m.used=false;return;}const f=m.fur.find(a=>a.on);if(f){miniDown({x:m.p.x,y:m.p.y});miniMove({x:f.x,y:f.y});m.down=false;m.drag=null;}else exitMini();}
 else if(m.type==='play'){m.pointer={x:m.catX,y:285};m.lastMove=G.now-2;}
 else if(m.type==='feed'||m.type==='water'){m.p={x:385,y:155};m.down=true;m.drag='tool';}
 else if(m.type==='prepare'||m.type==='work'){const c=m.cards.find(a=>!a.placed);if(c){m.drag=c;miniUp({x:145+c.slot*155,y:285});}}
 else if(m.type==='arrange'){const item=m.items[0];if(item){m.drag=item;miniUp(item.type==='suit'?{x:490,y:165}:{x:480,y:290});}else exitMini();}
 else if(m.type==='curtain'){m.progress=1;miniUp({x:580,y:150});}
 else if(m.type==='bed'){m.progress=1;miniUp({x:210,y:120});}
 else if(m.type==='pet'){m.moved=100;miniDown({x:330,y:220});miniMove({x:360,y:220});}
 else if(m.type==='umbrella'){m.p.x=320;miniUp({x:320,y:150});}
}

function updateMini(dt){const m=G.mini;if(!m||m.complete)return;
 if(m.deskPhase==='moving'){const p=clamp((G.now-m.catMoveAt)/1.5,0,1);m.deskCatxy={x:305+(m.catRoute==='beside'?245:-235)*p,y:180+(m.catRoute==='beside'?52:130)*p};}
 if(m.type==='feed'||m.type==='water'){
  const pouring=(m.down||m.placed)&&Math.abs(m.p.x-385)<65&&m.p.y>75&&m.p.y<210;
  m.pouring=pouring;if(pouring){m.progress=clamp(m.progress+dt*.65,0,1);if(G.now-(m.soundAt||0)>.18){m.soundAt=G.now;if(m.type==='water')noise(.08,.013,.2,1600);else tone(240+Math.random()*100,.02,'triangle',.01);}}
  if(m.progress>=1){const type=m.type;G.cat.x=385;G.cat.y=285;G.cat.pose='eat';finishMini(()=>{perform(type);G.catEatUntil=G.now+2.5;G.catEatX=type==='water'?515:575;G.cat.x=G.catEatX;G.cat.y=323;G.cat.pose='eat';},1.4);}
 }
 if(m.type==='play'){
  const aim=clamp(m.pointer.x,100,545),dx=aim-m.catX,step=Math.min(Math.abs(dx),dt*95);m.catX+=Math.sign(dx)*step;m.catDir=dx>=0?1:-1;m.catWalk=Math.abs(dx)>12?G.now:0;
  // The cat needs a catch, not frantic movement: pause and leave the feather near the floor.
  const catchable=G.now-m.lastMove>.55&&Math.abs(dx)<24&&m.pointer.y>230;
  if(catchable){m.progress+=dt*.44;m.catY=285-Math.sin(Math.min(1,(G.now-m.lastMove-.55)*3)*Math.PI)*14;}
  else m.catY=285;
  if(m.progress>=1){m.catY=285;tone(160,.3,'sine',.02);finishMini(()=>{perform('play');G.cat.x=410;G.cat.y=323;G.cat.pose='sit';},1.6);}
 }
 if(m.type==='umbrella')m.progress=clamp((m.p.x-190)/130,0,1);
 if(m.type==='roller'&&m.used&&!m.fur.some(f=>f.on)&&!m.finishedNotice){m.finishedNotice=true;notice('소매의 털이 접착면에 붙었다. 쓴 면을 유지한 채 내려놓을 수 있다.',5);}
}
function update(dt){
 const due=G.auto.filter(a=>a.at<=G.now);G.auto=G.auto.filter(a=>a.at>G.now);for(const a of due)a.fn();
 if(G.transition){const tr=G.transition,p=(G.now-tr.start)/tr.duration;if(p>=.5&&!tr.switched){tr.switched=true;tr.fn();}if(p>=1&&G.transition===tr)G.transition=null;}
 if(G.dialog){const d=G.dialog,line=d.lines[d.index];d.elapsed+=dt;const next=Math.min(line.text.length,Math.floor(d.elapsed*32));if(next>d.count){const previous=d.count;d.count=next;if(next%2===0&&/\S/.test(line.text[next-1]||'')&&next>previous)tone(190+(line.text.charCodeAt(next-1)%9)*24,.032,'triangle',.012);paintDialogue();}}
 if(G.mode!=='play')return;
 if(G.scene==='station'){const elapsed=G.now-G.stationAt;G.trainX=elapsed<1?680:Math.max(15,680-(elapsed-1)*210);if(G.trainX===15&&!G.trainArrived){G.trainArrived=true;tone(680,.2,'sine',.02);noise(.5,.02,0,1200);}}
 if(G.scene!=='station')G.trainArrived=false;
 if(G.sleeping&&G.bedApproach&&!G.jump){const c=G.cat;if(c.x>195){c.x=Math.max(195,c.x-dt*100);c.pose='walk';c.dir=-1;c.walk+=dt;}else{G.bedApproach=false;G.jump={start:G.now,duration:.65,x0:195,y0:323,x1:150,y1:260};}}
 updateMovement(dt);if(!G.sleeping||G.jump)updateCat(dt);updateMini(dt);
 const storm=isStorm()&&['bedroom','living'].includes(G.scene);rainAudio(storm||G.scene==='street');
 if(storm){if(G.now>G.thunderAt){G.thunderAt=G.now+9+Math.random()*6;G.flash=.26;noise(1.6,G.curtainClosed?.018:.05,.65,550);}G.flash=Math.max(0,G.flash-dt);if(!G.curtainClosed&&G.now-(G.clueAt||0)>4){G.clueAt=G.now;noise(.2,.025,.8,950);}}
 else G.flash=0;
 if(G.noticeUntil&&G.now>G.noticeUntil){$('sceneNotice').hidden=true;G.noticeUntil=0;}
 if(G.now-G.lastUI>.5){G.lastUI=G.now;updateUI();}
 if(G.dialog||G.menu||G.mini||G.transition||G.sleeping||G.intro==='montage')$('contextButton').hidden=true;
}
function frame(ms){const t=ms/1000,dt=Math.min(.05,G.last?t-G.last:0);G.last=t;G.now=t;update(dt);
 if(G.mode==='title')LifeView.title(titleCtx,t);else if(G.mode==='ending'){LifeView.end($('endingCanvas').getContext('2d'),G,G.endingKey);}else{LifeView.draw(ctx,G);if(G.transition){const p=clamp((G.now-G.transition.start)/G.transition.duration,0,1);ctx.fillStyle=`rgba(30,51,61,${Math.sin(p*Math.PI)})`;ctx.fillRect(0,0,W,H);}}
 requestAnimationFrame(frame);
}
function begin(){audioStart();G.mode='play';G.s=Life.create($('playerName').value.trim()||'김신입','보리');G.intro='meet';G.auto=[];G.dialog=null;G.mini=null;G.hero.pose='stand';G.cat={x:445,y:323,dir:-1,walk:0,pose:'fear'};G.doorOpen=true;G.dressed=false;G.catControl=false;
 $('titleScreen').hidden=true;$('gameScreen').hidden=false;$('endingScreen').hidden=true;setScene('street',100);canvas.focus({preventScroll:true});notice('WASD로 걷거나 바닥을 선택해 움직인다. 비를 피하지 못한 작은 몸이 보인다.',7);
}
$('startButton').onclick=begin;$('restartButton').onclick=()=>{G.mode='title';G.auto=[];G.mini=null;G.dialog=null;G.catControl=false;$('endingScreen').hidden=true;$('gameScreen').hidden=true;$('titleScreen').hidden=false;rainAudio(false);};
async function loadAssets(){const urls=window.__LIFE_ASSETS||{rooms:'assets/rooms-pixel.png',places:'assets/places-pixel.png'};await Promise.all(Object.entries(urls).map(([key,url])=>new Promise(resolve=>{const im=new Image();im.onload=()=>{G.images[key]=im;resolve();};im.onerror=()=>resolve();im.src=url;})));$('startButton').disabled=false;}
function offerResume(){try{const data=JSON.parse(localStorage.getItem('catdoor-life-save')||'null');if(!data?.state||data.state.phase==='ending'||!Array.isArray(data.state.work))return;const b=document.createElement('button');b.textContent='이어서';b.className='resume-button';$('startButton').after(b);b.onclick=()=>{audioStart();G.s=data.state;G.mode='play';G.intro='';G.dressed=!!data.dressed;G.doorOpen=!!data.doorOpen;G.hero.pose='stand';$('titleScreen').hidden=true;$('gameScreen').hidden=false;const phase=G.s.phase;const scene=phase==='work'||phase==='afterWork'?'office':phase==='morning'?'bedroom':['bedroom','living'].includes(data.scene)?data.scene:'living';setScene(scene,phase==='work'?330:200);G.officeDone=G.s.work.some(w=>w.day===G.s.day);G.cat.x=G.s.hoodie?510:430;G.cat.y=323;canvas.focus({preventScroll:true});notice('가방과 집에 남은 물건은 그대로다.',4);};}catch(_){} }
ctx.imageSmoothingEnabled=false;titleCtx.imageSmoothingEnabled=false;
loadAssets();offerResume();requestAnimationFrame(frame);
// State is inspectable for review; interaction still goes through the real controls.
window.CatDoorReview={snapshot:()=>JSON.parse(JSON.stringify({scene:G.scene,intro:G.intro,hero:G.hero,cat:G.cat,mini:G.mini?.type,dialogue:G.dialog?.lines[G.dialog.index],state:G.s,catControl:G.catControl,camera:LifeView.camera(G),doorOpen:G.doorOpen}))};
})();
