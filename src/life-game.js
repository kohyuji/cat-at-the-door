/* 이동, 생활 조작, 장면 전환. 시간은 행동이 끝났을 때만 진행한다. */
(function(){
'use strict';
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d'),titleCtx=$('titleCanvas').getContext('2d'),portrait=$('portrait').getContext('2d');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const SAVE_KEY='catdoor-life-v3';
const G={s:null,mode:'title',scene:'street',intro:'',hero:{x:110,y:320,dir:1,walk:0,pose:'stand'},cat:{x:440,y:323,dir:-1,walk:0,pose:'fear'},keys:{},goal:null,pending:null,mini:null,dialog:null,menu:false,ack:false,paused:false,now:0,last:0,auto:[],lockedUntil:0,transition:null,images:{},doorOpen:true,dressed:false,curtainClosed:false,catControl:false,catStage:'',carried:null,guide:null,commute:'work',trainX:680,officeTalk:{},officeDone:false,officeFeedback:false,noticeUntil:0,flash:0,thunderAt:8,jump:null,catOnBed:false,sleeping:false,nightScene:false,lastUI:0,checklistOpen:true};
const Audio={enabled:true,ctx:null,rain:null,volume:.6};
function audioStart(){if(!Audio.enabled)return;try{Audio.ctx||=new(window.AudioContext||window.webkitAudioContext)();Audio.ctx.resume();}catch(_){}}
function tone(f=440,d=.07,type='triangle',volume=.02){if(!Audio.enabled||!Audio.ctx)return;try{const a=Audio.ctx,o=a.createOscillator(),v=a.createGain();o.type=type;o.frequency.value=f;v.gain.setValueAtTime(volume*Audio.volume,a.currentTime);v.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.connect(v);v.connect(a.destination);o.start();o.stop(a.currentTime+d);}catch(_){}}
function noise(d=.5,volume=.02){if(!Audio.enabled||!Audio.ctx)return;try{const a=Audio.ctx,b=a.createBuffer(1,Math.ceil(a.sampleRate*d),a.sampleRate),v=a.createGain(),f=a.createBiquadFilter(),src=a.createBufferSource(),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);f.type='lowpass';f.frequency.value=800;v.gain.value=volume*Audio.volume;src.buffer=b;src.connect(f);f.connect(v);v.connect(a.destination);src.start();}catch(_){}}
function rainAudio(on){if(!Audio.ctx)return;if(!on||!Audio.enabled){if(Audio.rain){try{Audio.rain.stop();}catch(_){}Audio.rain=null;}return;}if(Audio.rain)return;try{const a=Audio.ctx,b=a.createBuffer(1,a.sampleRate*3,a.sampleRate),v=a.createGain(),f=a.createBiquadFilter(),src=a.createBufferSource(),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;f.type='lowpass';f.frequency.value=2300;v.gain.value=.012*Audio.volume;src.buffer=b;src.loop=true;src.connect(f);f.connect(v);v.connect(a.destination);src.start();Audio.rain=src;}catch(_){}}
const later=(seconds,fn)=>G.auto.push({at:G.now+seconds,fn});
const addText=(parent,tag,text,cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;parent.appendChild(n);return n;};
const button=(parent,text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=fn;parent.appendChild(b);return b;};
const info=()=>LifeStory.days[clamp(G.s?.day||0,0,12)],weekend=()=>[6,7].includes(G.s.day);
const isStorm=()=>!G.intro&&G.s?.day===3&&G.s.phase==='evening';
function notice(text,seconds=4){$('sceneNotice').textContent=text;$('sceneNotice').hidden=!text;G.noticeUntil=G.now+seconds;}
function fade(fn,duration=.65){G.transition={start:G.now,duration,fn,switched:false};G.goal=null;G.pending=null;G.keys={};G.lockedUntil=G.now+duration;}
function setScene(scene,x=220,y=320){G.scene=scene;Object.assign(G.hero,{x,y,walk:0,pose:'stand'});G.goal=null;G.pending=null;G.keys={};G.cat.pose='sit';updateUI();}
function nextDay(){let day=G.s.day+1;while([6,7].includes(day))day++;return Math.min(12,day);}
function save(){
 if(!G.s||G.mode==='title'||G.mode==='ending'||G.s.phase==='ending'||G.endingPlayback)return false;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({state:G.s,scene:G.scene,intro:G.intro,hero:G.hero,cat:G.cat,doorOpen:G.doorOpen,curtainClosed:G.curtainClosed,officeTalk:G.officeTalk,officeDone:G.officeDone,officeFeedback:G.officeFeedback,catControl:G.catControl,catStage:G.catStage,catOldDay:G.catOldDay,carried:G.carried,pendingNight:G.pendingNight,nightScene:G.nightScene,nightData:G.nightData}));return true;}catch(_){return false;}
}
function act(type,opts={},quiet=false){const before=Life.timeBand(G.s),r=Life.act(G.s,type,opts);if(!quiet)notice(r.message,4);if(r.ok){G.dressed=G.s.dressed;const after=Life.timeBand(G.s);if(after.used!==before.used||after.label!==before.label){G.timeChangeUntil=G.now+3;$('timeChange').textContent=after.label;$('timeChange').hidden=false;tone(520,.12);}save();}updateUI();return r;}
function ack(text,options=[{text:'확인'}]){G.ack=true;G.keys={};G.goal=null;$('ackText').textContent=text;$('ackActions').replaceChildren();for(const option of options){button($('ackActions'),option.text,()=>{G.ack=false;$('acknowledge').hidden=true;G.lockedUntil=G.now+.3;option.run?.();});}$('acknowledge').hidden=false;updateUI();}
function say(lines,done=null,choices=null){if(!lines?.length){done?.();return;}G.dialog={lines,index:0,count:0,elapsed:0,last:G.now,done,choices};G.goal=null;G.keys={};$('dialogue').hidden=false;paintDialogue();updateUI();}
function paintDialogue(){
 const d=G.dialog;if(!d)return;const line=d.lines[d.index],who=line.who||'';
 $('speaker').textContent=who==='나'?G.s.me:who;$('speaker').hidden=!who;
 $('speech').textContent=line.text.slice(0,d.count);$('choices').replaceChildren();
 const full=d.count>=line.text.length,last=d.index===d.lines.length-1;$('dialogueNext').hidden=full&&last&&!!d.choices;
 if(full&&last&&d.choices)for(const c of d.choices)button($('choices'),c.text,()=>{if(G.now-d.last<.25)return;closeDialogue();c.run?.();});
 portrait.clearRect(0,0,80,80);portrait.hidden=!who;portrait.imageSmoothingEnabled=false;
 if(who===G.s.cat||who==='고양이'){portrait.save();portrait.translate(40,65);portrait.scale(1.15,1.15);PixelArt.cat(portrait,0,0,-1,0,'sit');portrait.restore();}
 else if(who)PixelArt.person(portrait,40,76,who.includes('팀장')?'lead':/동기|동료/.test(who)?'peer':G.dressed?'suit':'hoodie',0,0,'stand');
}
function closeDialogue(){G.dialog=null;$('dialogue').hidden=true;G.lockedUntil=G.now+.35;canvas.focus({preventScroll:true});}
function advanceDialogue(){const d=G.dialog;if(!d||G.now-d.last<.25)return;d.last=G.now;const line=d.lines[d.index];if(d.count<line.text.length){d.count=line.text.length;paintDialogue();return;}if(d.index===d.lines.length-1){if(d.choices)return;const done=d.done;closeDialogue();done?.();}else{d.index++;d.count=0;d.elapsed=0;paintDialogue();}}
// 대화창 어느 곳이든 누를 수 있다. 선택 버튼은 자기 행동만 실행한다.
$('dialogue').onclick=e=>{if(e?.target?.tagName==='BUTTON')return;advanceDialogue();};
$('dialogueNext').onclick=e=>{e?.stopPropagation?.();advanceDialogue();};
function closePhone(){G.menu=false;$('phone').hidden=true;G.lockedUntil=G.now+.3;const done=G.phoneDone;G.phoneDone=null;done?.();canvas.focus({preventScroll:true});}
function phoneMessage(message,done){G.menu=true;G.phoneDone=done;G.goal=null;G.keys={};const p=$('phoneBody');p.replaceChildren();addText(p,'small',message.sender);addText(p,'h2',message.title);addText(p,'p',message.body);button(p,'확인',closePhone);$('phoneClose').hidden=true;$('phone').hidden=false;updateUI();}
function openPhone(tab='today'){
 if(G.dialog||G.mini||G.ack||!G.s||G.catControl||G.sleeping||G.nightScene||G.workMontage)return;
 G.menu=true;G.keys={};G.goal=null;G.phoneDone=null;const p=$('phoneBody');p.replaceChildren();$('phoneClose').hidden=false;
 const first=!!G.intro;addText(p,'h2',first?'편의점':tab==='food'?'사료와 생활용품':'휴대폰');
 addText(p,'p','생활비 '+G.s.cash.toLocaleString()+'원'+(first?'':' · 사료 '+G.s.food+'끼'),'phone-balance');
 if(!first){const nav=addText(p,'div','','phone-apps');button(nav,'오늘',()=>openPhone());button(nav,'사료·생활용품',()=>openPhone('food'));}
 if(tab==='food'||first){
  if(first)addText(p,'p','집에 데려가기 전에 사료와 그릇부터 사자.');
  const grid=addText(p,'div','','shop-grid');
  const offers=[{action:'buyFood',name:first?'고양이용 건사료':'늘 먹는 건사료',price:12000,portion:8,desc:'기본 사료. 든든하게 먹인다.'},{action:'buyFavorite',name:first?'닭고기 습식 사료':'좋아하는 닭고기 습식',price:15000,portion:6,desc:first?'부드러운 사료. 처음 먹여 본다.':'봉지를 열면 먼저 다가온다.'},{action:'smallFood',name:'습식 한 끼',price:3000,portion:1,desc:'한 끼만 산다.'}];
  for(const offer of offers){const card=addText(grid,'div','','shop-product'),im=document.createElement('canvas');im.width=80;im.height=90;PixelArt.item(im.getContext('2d'),offer.action==='buyFood'?'foodBag':'wetFood',40,83,2);card.appendChild(im);addText(card,'strong',offer.name);addText(card,'p',offer.portion+'끼 · '+offer.desc);const b=button(card,offer.price.toLocaleString()+'원 · '+(first?'사기':'주문'),()=>{const r=act(offer.action,{},true);if(!r.ok){ack(r.message);return;}G.s.flags.initialShopDone=true;closePhone();if(first){ack('사료와 작은 그릇 두 개를 샀다.',[{text:'집에 데려간다',run:adopt}]);}else{ack('사료가 도착했다. '+G.s.food+'끼를 먹일 수 있다.');save();}});b.disabled=G.s.cash<offer.price;}
  if(!first&&!G.s.roller.owned){const row=addText(p,'div','','phone-card');addText(row,'strong','옷에 붙은 털을 떼는 돌돌이');const im=document.createElement('canvas');im.width=80;im.height=80;PixelArt.item(im.getContext('2d'),'roller',40,65,2);row.appendChild(im);button(row,'돌돌이 구입 · 4,000원',()=>{if(act('buyRoller').ok)openPhone('food');});}
 }else{
  addText(p,'h3',G.s.phase==='work'?'오늘 회사에서':weekend()?'쉬는 날':'오늘 챙길 것');
  for(const row of checklist())addText(p,'p',(row.done?'✓ ':'□ ')+row.text);
  if(G.s.flags.careConcern)addText(p,'p','보리가 밥그릇 앞에서 기다리는 일이 잦아졌다. 오늘 밥과 물을 먼저 확인하자.','care-warning');
  if(G.s.roller.owned)addText(p,'p','돌돌이: 침실 옷걸이 옆에 있다.');
 }
 $('phone').hidden=false;updateUI();
}
$('phoneClose').onclick=closePhone;$('phoneButton').onclick=()=>openPhone();$('foodLabel').onclick=()=>openPhone('food');
function lowFood(){if(G.intro||G.ack||G.menu||G.dialog||G.mini||G.nightScene||G.s.food>1||G.s.flags.foodLowAcknowledged)return;act('acknowledgeFood',{},true);ack(G.s.food?'사료가 한 끼 남았다. 다음 밥을 미리 준비하자.':'사료가 떨어졌다. 보리가 빈 봉지 옆에서 기다린다.',[{text:'사료 주문',run:()=>openPhone('food')},{text:'조금 뒤에',run:()=>{}}]);}
function checklist(){
 const s=G.s;if(!s||G.intro||G.nightScene||G.catControl)return[];
 if(G.scene==='office')return[{text:'오늘 맡은 일',done:G.officeDone},{text:'퇴근',done:s.phase==='afterWork'}];
 const rows=[{text:'밥',done:s.needs.fed},{text:'물',done:s.water}];
 if(s.phase==='morning')rows.push({text:'출근복',done:s.dressed},{text:'가방',done:s.hasBag});
 else rows.push({text:'놀이',done:s.needs.played},{text:'내 휴식',done:!!s.done.rest});return rows;
}
function updateUI(){
 if(!G.s)return;const s=G.s,band=Life.timeBand(s),hidden=!!G.intro||G.catControl||G.nightScene||G.endingPlayback||G.endingMoment;
 $('menuButton').hidden=!!(G.endingPlayback||G.endingMoment);
 $('dateLabel').textContent=G.intro?'겨울':G.catControl?'그날 밤':info().date+' ('+info().weekday+')';
 $('timeLabel').textContent=G.nightScene?'새벽 2:40':G.catControl?'문이 닫힌 뒤':G.intro?'':G.scene==='office'?(G.workMontage?(G.workProgress<.35?'오전':G.workProgress<.7?'점심 이후':'퇴근 무렵'):G.officeDone?'오후 6시':'출근'):(s.day===0?'첫 출근 전날 · ':'')+band.label;
 $('foodLabel').textContent='◒ 사료 '+s.food+'끼';$('foodLabel').hidden=!!G.intro||G.catControl||G.endingPlayback||G.endingMoment;
 $('energyLabel').textContent=({normal:'괜찮음',tired:'피곤함',exhausted:'몹시 피곤함'})[Life.fatigue(s)];$('energyLabel').hidden=hidden;
 $('phoneButton').hidden=!!G.intro||G.catControl||G.nightScene||G.endingPlayback||G.endingMoment;$('phoneBadge').hidden=s.food>1;
 $('soundButton').innerHTML=Audio.enabled?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8q6 4 0 8" fill="none" stroke="currentColor" stroke-width="2"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
 $('soundButton').setAttribute('aria-label',Audio.enabled?'소리 끄기':'소리 켜기');
 $('nightBanner').hidden=!G.nightScene;$('nightBanner').textContent='새벽 2:40 · 잠에서 깼다';
 $('routineToggle').hidden=hidden||G.scene==='office';$('routineChecklist').hidden=hidden||!G.checklistOpen||!!G.mini||!!G.dialog;
 $('routineChecklist').replaceChildren();if(!$('routineChecklist').hidden)for(const row of checklist())addText($('routineChecklist'),'span',(row.done?'✓ ':'○ ')+row.text,'check-item'+(row.done?' checked':''));
 $('dayRhythm').hidden=hidden||G.scene==='office'||s.phase==='morning';$('dayRhythm').replaceChildren();
 if(!$('dayRhythm').hidden){addText($('dayRhythm'),'span',band.label,'time-label');for(let i=0;i<band.slots;i++)addText($('dayRhythm'),'span',i<band.used?'✓':'○','time-segment '+(i<band.used?'used':i===band.used?'current':''));addText($('dayRhythm'),'small',band.remaining?'하고 싶은 일을 하나씩':'이제 잠자리에 들 시간');}
 $('eveningOptions').hidden=true;$('shiftProgress').hidden=!G.workMontage;$('shiftProgress').textContent=G.workMontage?'일하는 중  '+['오전','점심','오후','퇴근'][Math.min(3,Math.floor((G.workProgress||0)*4))]:'';
 refreshGuide();refreshHotspots();
}
$('soundButton').onclick=()=>{Audio.enabled=!Audio.enabled;if(Audio.enabled)audioStart();rainAudio(isStorm());updateUI();};
$('routineToggle').onclick=()=>{G.checklistOpen=!G.checklistOpen;updateUI();};
function target(id,label,x,y,w,h,ax,ay,fn){return{id,label,x,y,w,h,ax,ay,fn};}
function targets(){
 if(G.mode!=='play'||G.mini||G.dialog||G.menu||G.ack||G.transition||G.sleeping||G.paused||G.workMontage||G.endingPlayback||G.nightScene)return[];
 const s=G.s,T=[];
 if(G.endingMoment){const key=G.finalEnding.key;if(key==='worn')return[target('endrest','소파에 앉아 알람을 끈다',410,180,175,115,450,315,()=>{G.endingMoment=false;G.endingPlayback=true;G.restAt=G.now;notice('알람을 끄고 눈을 감았다. 내일 아침은 서두르지 않아도 된다.',4);later(3,showEnding);})];if(key==='distance'||key==='neglected')return[target('endwater','물그릇을 채워 놓는다',468,295,60,50,490,325,()=>startMini('water',{ending:true}))];return[target('endcat','보리에게 손을 내민다',G.cat.x-40,G.cat.y-50,90,60,G.cat.x-35,320,()=>startMini('pet',{ending:true}))];}
 if(G.catControl){if(G.catStage==='door')return[target('catdoor','문을 앞발로 밀어 본다',582,70,58,235,600,323,catDoorTry)];if(G.catStage==='toy')return[target('cattoy',G.carried?'인형을 문 앞에 놓는다':'쥐 인형을 문다',G.carried?575:330,G.carried?260:295,G.carried?65:70,55,G.carried?590:360,325,G.carried?catLeaveToy:catPickToy)];return[target('catscent','옷 냄새를 맡고 눕는다',455,240,130,105,520,323,catNest)];}
 if(G.intro==='meet')return[target('kitten','상자 옆 고양이에게 다가간다',410,270,80,75,380,320,()=>say(LifeStory.opening,()=>startMini('umbrella')))];
 if(G.intro==='sheltered')return[target('home','편의점에 들어간다',520,165,110,175,550,320,()=>openPhone('food'))];
 if(G.intro==='firstFeed')return[target('food','밥그릇을 채운다',525,290,90,55,550,325,feedChoice)];
 if(G.intro==='firstWater')return[target('water','물그릇을 채운다',468,295,60,50,490,325,()=>startMini('water'))];
 if(G.intro==='hoodie')return[target('pet','고양이를 쓰다듬는다',G.cat.x-40,G.cat.y-50,90,60,G.cat.x-35,320,()=>startMini('pet'))];
 if(G.intro==='routine')return[target('bed','잠자리에 눕는다',10,210,190,125,180,315,()=>startMini('bed'))];if(G.intro)return[];
 if(G.scene==='station')return G.trainX<=20?[target('board','열차에 탄다',250,130,160,190,330,322,boardTrain)]:[];
 if(G.scene==='train')return[];
 if(G.scene==='office'){
  T.push(target('lead',G.officeDone?'팀장에게 인사한다':'팀장에게 말을 건다',410,135,70,170,390,315,()=>talk('lead')),target('peer','동료에게 말을 건다',140,155,80,155,245,315,()=>talk('peer')));
  if(!G.officeDone)T.push(target('desk','내 자리에서 일한다',280,202,108,105,330,316,()=>G.officeTalk.lead?startWork():talk('lead')));
  if(G.officeDone)T.push(target('exit','퇴근한다',550,80,80,250,575,320,()=>commute('home')));return T;
 }
 if(G.scene==='bedroom'){
  T.push(target('room','부엌으로 나간다',500,65,130,265,558,315,()=>moveRoom('living')),target('bed',s.phase==='morning'?'이불을 편다':'잠자리에 눕는다',10,215,185,115,180,315,s.phase==='morning'?makeBed:bedtime),target('clothes',s.phase==='morning'?'출근복을 입는다':'옷을 걸어 둔다',375,120,105,150,435,315,()=>s.phase==='morning'?dress():startMini('arrange')));
  if(s.phase==='morning'||s.day<12)T.push(target('bag',s.hasBag?'가방을 들고 있다':s.bagPacked?'가방을 집는다':'가방을 챙긴다',485,275,65,65,510,323,packBag));
  if(s.phase==='evening'&&s.day<12&&!s.bagPacked)T.push(target('desk','내일 들고 갈 가방을 챙긴다',225,165,150,110,310,315,()=>startMini('bag')));
  if(s.roller.owned&&s.phase==='morning'&&s.dressed&&s.fur)T.push(target('roller','옷에 붙은 털을 뗀다',440,248,45,55,455,320,()=>startMini('roller')));
 }else{
  T.push(target('room','침실로 들어간다',590,70,50,225,585,320,()=>moveRoom('bedroom')),target('food','밥그릇을 채운다',525,290,90,55,550,325,feedChoice),target('water','물그릇을 씻고 물을 담는다',468,295,60,50,490,325,()=>startMini('water')),target('cat','고양이를 쓰다듬는다',G.cat.x-32,G.cat.y-45,70,45,clamp(G.cat.x-30,45,595),323,()=>startMini('pet')));
  if(s.phase==='morning')T.push(target('exit','신발을 신고 출근한다',20,45,110,285,80,320,leaveHome));
  else{
   T.push(target('toy','쥐 인형으로 보리와 논다',330,298,75,49,360,325,()=>startMini('play')),target('rest','소파에서 쉰다',410,180,175,115,450,315,rest));
   if(!s.hoodie)T.push(target('hoodie','후드티로 보리 자리를 만든다',455,255,100,55,500,325,()=>startMini('arrange')));
   if(weekend()&&!s.done.laundry)T.push(target('laundry','빨래를 모은다',235,260,85,80,275,323,()=>startMini('laundry')));
   if(weekend()&&!s.done.dishes)T.push(target('dishes','밀린 설거지를 한다',205,140,175,105,290,320,()=>startMini('dishes')));
   if(isStorm()&&!G.curtainClosed)T.push(target('curtain','흔들리는 창문을 닫는다',410,55,180,140,570,315,()=>startMini('curtain')));
  }
 }return T;
}
function desired(){
 if(G.endingMoment)return{id:G.finalEnding.key==='worn'?'endrest':['distance','neglected'].includes(G.finalEnding.key)?'endwater':'endcat',text:''};
 if(G.catControl)return{id:G.catStage==='door'?'catdoor':G.catStage==='toy'?'cattoy':'catscent',text:''};
 if(G.intro)return{id:({meet:'kitten',sheltered:'home',firstFeed:'food',firstWater:'water',hoodie:'pet',routine:'bed'})[G.intro],text:({meet:'상자 안에서 울음소리가 난다.',sheltered:'집에 가기 전에 편의점에 들르자.',firstFeed:'작은 그릇 앞에 고양이가 앉았다.',firstWater:'이번에는 물도 담아 주자.',hoodie:'고양이가 손 냄새를 맡는다.',routine:'고양이가 졸기 시작했다.'})[G.intro]||''};
 if(G.scene==='station')return{id:'board',text:G.trainX>20?'열차가 들어온다.':'열린 문으로 탄다.'};
 if(G.scene==='office')return{id:!G.officeTalk.lead?'lead':G.officeDone?'exit':G.s.day===1&&!G.officeTalk.peer?'peer':'desk',text:''};
 if(G.selectedGuide)return G.selectedGuide;return{id:'',text:''};
}
function refreshGuide(){const blocked=G.mode!=='play'||G.dialog||G.menu||G.ack||G.mini||G.transition||G.sleeping||G.paused||G.workMontage||G.endingPlayback||G.nightScene;const goal=blocked?{id:'',text:''}:desired();$('objectiveText').textContent=goal.text||'';$('objectiveText').hidden=!goal.text;let t=targets().find(t=>t.id===goal.id);if(goal.room&&goal.room!==G.scene)t=targets().find(t=>t.id==='room');G.guide=t?{x:t.x+t.w/2,y:t.y,w:t.w,h:t.h,label:t.label}:null;G.guideId=t?.id;}
let hotspotKey='';const hotspotNodes=new Map();
function refreshHotspots(){const list=targets(),key=list.map(t=>t.id).join('|'),wrap=$('hotspots'),cam=LifeView.camera(G);if(key!==hotspotKey){hotspotKey=key;wrap.replaceChildren();hotspotNodes.clear();for(const t of list){const b=document.createElement('button');b.className='object-hit';b.onclick=()=>selectTarget(targets().find(a=>a.id===t.id));wrap.appendChild(b);hotspotNodes.set(t.id,b);}}for(const t of list){const b=hotspotNodes.get(t.id);b.setAttribute('aria-label',t.label);b.title=t.label;b.style.left=(t.x*cam.scale+cam.x)/6.4+'%';b.style.top=(t.y*cam.scale+cam.y)/3.6+'%';b.style.width=t.w*cam.scale/6.4+'%';b.style.height=t.h*cam.scale/3.6+'%';}}
function selectTarget(t){if(!t||G.now<G.lockedUntil||G.dialog||G.menu||G.ack||G.transition||G.mini||G.workMontage)return;audioStart();G.selectedGuide=null;const a=G.catControl?G.cat:G.hero;if(dist(a,{x:t.ax,y:t.ay})<25){a.dir=t.x+t.w/2>a.x?1:-1;t.fn();}else{G.goal={x:t.ax,y:t.ay};G.pending=t;}canvas.focus({preventScroll:true});}
function point(e){const r=canvas.getBoundingClientRect(),cam=LifeView.camera(G);return{x:((e.clientX-r.left)*640/r.width-cam.x)/cam.scale,y:((e.clientY-r.top)*360/r.height-cam.y)/cam.scale};}
canvas.addEventListener('pointerdown',e=>{audioStart();canvas.focus();try{canvas.setPointerCapture(e.pointerId);}catch(_){}if(G.dialog){advanceDialogue();return;}if(G.menu||G.ack||G.paused||G.transition||G.now<G.lockedUntil)return;const p=point(e);if(G.mini){miniDown(p);return;}const hit=targets().slice().reverse().find(t=>p.x>=t.x&&p.x<=t.x+t.w&&p.y>=t.y&&p.y<=t.y+t.h);if(hit)selectTarget(hit);else if(p.y>280&&!G.workMontage&&!G.endingPlayback)G.goal={x:clamp(p.x,22,618),y:clamp(p.y,285,338)};});
canvas.addEventListener('pointermove',e=>{if(G.mini)miniMove(point(e));});canvas.addEventListener('pointerup',e=>{if(G.mini)miniUp(point(e));});canvas.addEventListener('pointercancel',()=>{if(G.mini){G.mini.down=false;G.mini.drag=null;}});
function key(e,down){if(e.target.matches('input,textarea'))return;const k=e.key.toLowerCase();if(k==='escape'&&down){if(G.paused)resumePlay();else if(G.menu&&!$('phoneClose').hidden)closePhone();else if(G.mini)exitMini();else openPause();return;}if(G.paused)return;if(G.dialog){if(down&&!e.repeat&&(k===' '||k==='enter')){e.preventDefault();advanceDialogue();}return;}if(!['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(k))return;e.preventDefault();G.keys[k]=down;}
document.addEventListener('keydown',e=>key(e,true));document.addEventListener('keyup',e=>key(e,false));
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();G.keys[b.dataset.key]=true;});for(const event of ['pointerup','pointercancel','pointerleave'])b.addEventListener(event,()=>G.keys[b.dataset.key]=false);}
function updateMovement(dt){if(G.dialog||G.menu||G.ack||G.transition||G.mini||G.sleeping||G.nightScene||G.workMontage||G.endingPlayback||G.now<G.lockedUntil)return;const a=G.catControl?G.cat:G.hero,k=G.keys;let dx=(k.d||k.arrowright?1:0)-(k.a||k.arrowleft?1:0),dy=(k.s||k.arrowdown?1:0)-(k.w||k.arrowup?1:0);if(dx||dy){G.goal=null;G.pending=null;}else if(G.goal){const d=dist(a,G.goal);if(d<4){a.x=G.goal.x;a.y=G.goal.y;G.goal=null;const t=G.pending;G.pending=null;if(t)a.dir=t.x+t.w/2>a.x?1:-1;t?.fn();}else{dx=(G.goal.x-a.x)/d;dy=(G.goal.y-a.y)/d;}}if(dx||dy){const l=Math.hypot(dx,dy)||1;a.x=clamp(a.x+dx/l*dt*165,22,618);a.y=clamp(a.y+dy/l*dt*165,281,339);if(dx)a.dir=dx>0?1:-1;a.walk+=dt;}else a.walk=0;}
function updateCat(dt){
 if(G.catControl||G.mini||G.transition||G.nightScene||G.scene==='office'||G.endingMoment)return;const c=G.cat,s=G.s;if(!s)return;
 if(G.jump){const j=G.jump,p=clamp((G.now-j.start)/j.duration,0,1);c.x=j.x0+(j.x1-j.x0)*p;c.y=j.y0+(j.y1-j.y0)*p-Math.sin(p*Math.PI)*28;c.pose='jump';if(p>=1){G.jump=null;c.pose='sleep';G.catOnBed=true;}return;}if(G.sleeping)return;
 if(G.now<(G.catEatUntil||0)){c.x=G.catEatX;c.y=323;c.dir=-1;c.pose='eat';return;}
 if(isStorm()&&!G.curtainClosed){c.x=587;c.y=278;c.pose='fear';return;}
 G.catNeed=null;let aim=null;
 if(s.flags.catWithdrawn&&G.scene==='living'){aim={x:570,y:316};c.pose='sit';}
 else if(G.scene==='living'&&!s.needs.fed){G.catNeed='food';aim={x:G.now%8<5?565:clamp(G.hero.x+35,150,550),y:323};}
 else if(G.scene==='living'&&!s.water){G.catNeed='water';aim={x:515,y:323};}
 else if(G.scene==='living'&&!s.needs.played&&!G.intro){G.catNeed='play';aim={x:355,y:323};}
 else if(G.scene==='living'&&s.hoodie)aim={x:510,y:315};
 if(aim){const d=dist(c,aim);if(d>5){c.x+=(aim.x-c.x)/d*Math.min(d,dt*65);c.y+=(aim.y-c.y)/d*Math.min(d,dt*65);c.dir=aim.x>c.x?1:-1;c.walk+=dt;c.pose='walk';}else{c.walk=0;c.pose=s.hoodie&&!G.catNeed?'sleep':'sit';}}else{c.walk=0;c.pose='sit';}
}
function adopt(){fade(()=>{setScene('living',260);G.intro='name';G.cat.x=390;G.cat.y=323;$('naming').hidden=false;$('catName').focus();save();});}
$('nameForm').onsubmit=e=>{e.preventDefault();G.s.cat=$('catName').value.trim()||'보리';$('naming').hidden=true;G.intro='firstFeed';say([{who:'나',text:G.s.cat+'야. 우선 밥부터 먹자.'}],()=>save());};
function startMontage(){G.catControl=false;G.intro='montage';G.montageAt=G.now;setScene('living',330);notice('같이 사는 동안 계절이 바뀌었다.',3);later(3,()=>{G.intro='offer';phoneMessage(LifeStory.phone.offer,()=>{const old=G.s;G.s=Life.create(old.me,old.cat);G.s.cash=old.cash;G.s.food=old.food;G.s.favoriteFood=old.favoriteFood;G.s.hoodie=true;G.s.flags.initialShopDone=true;G.s.flags.employed=true;G.s.flags.introFur=true;G.intro='';G.doorOpen=true;G.catOnBed=false;setScene('living',220);G.cat.x=430;G.cat.y=323;say([{who:'나',text:'드디어 내일 첫 출근이다. 노트북이랑 충전기부터 챙겨 두자.'}],()=>{G.selectedGuide={id:'bag',room:'bedroom',text:''};save();});});});}
function moveRoom(room){fade(()=>{setScene(room,room==='living'?570:520);G.cat.x=room==='living'?(G.s.hoodie?510:430):460;G.cat.y=323;save();});}
function makeBed(){if(G.s.bedMade)return;const r=act('makeBed',{},true);if(r.ok){G.bedStraightenedAt=G.now;G.lockedUntil=G.now+.8;notice('구겨진 이불을 폈다.');}}
function dress(){if(act('dress').ok){G.dressed=true;if(G.s.day===1)notice('정장 소매에 주황색 털이 붙어 있다.',5);}}
function packBag(){if(G.s.hasBag){notice('가방을 들고 있다.');return;}if(!G.s.bagPacked)startMini('bag');else if(G.s.phase==='morning')act('pickBag');else notice('노트북과 충전기를 챙겨 두었다.');}
function rest(){if(act('rest').ok){G.restAt=G.now;G.lockedUntil=G.now+2;later(2,()=>{G.restAt=null;notice('어깨에서 힘이 풀린다.');});}}
function leaveHome(borrow=false){
 const s=G.s;
 if(!G.departureCareConfirmed&&(!s.needs.fed||!s.water)){const what=!s.needs.fed?'밥그릇이 비어 있다.':'물그릇이 비어 있다.';ack(what+' 보리가 현관까지 따라왔다.',[{text:'먼저 챙긴다',run:()=>{G.selectedGuide={id:!s.needs.fed?'food':'water',text:''};}},{text:'오늘은 그냥 나간다',run:()=>{G.departureCareConfirmed=true;leaveHome(borrow);}}]);return;}
 const r=act('leaveHome',{borrowLaptop:borrow},true);if(!r.ok){if(r.reason==='noBag')ack('노트북 가방을 놓고 나가려 한다. 회사에서 빌리면 오늘 일이 밀린다.',[{text:'가방을 챙긴다',run:()=>moveRoom('bedroom')},{text:'오늘은 빌린다',run:()=>leaveHome(true)}]);else ack(r.message);return;}G.departureCareConfirmed=false;commute('work');
}
function commute(direction){G.commute=direction;G.guide=null;if(!(G.s.day===1&&direction==='work')){direction==='work'?enterOffice():arriveHome();return;}fade(()=>{setScene('station',85);G.trainX=680;G.stationAt=G.now;});}
function boardTrain(){if(G.scene!=='station')return;fade(()=>{setScene('train',200);later(2,enterOffice);},.35);}
function enterOffice(){fade(()=>{setScene('office',565);G.s.phase='work';G.officeTalk={};G.officeDone=G.s.work.some(w=>w.day===G.s.day);G.officeFeedback=G.officeDone;G.dressed=true;if(G.s.flags.borrowedLaptop)notice('노트북을 빌려 연결하는 동안 동료들은 일을 시작했다. 오늘은 퇴근이 늦어진다.',6);else if(G.s.flags.lateMinutes)notice('늦게 도착해 밀린 일부터 시작한다.',5);updateUI();save();});}
function talk(role){
 if(role==='lead'&&G.officeDone){say(LifeStory.workReport(G.s),()=>save());return;}
 if(role==='lead'&&G.officeTalk.lead){say([{who:'팀장',text:'오늘 맡은 일은 어느 정도 됐어요?'}],null,[{text:'이어서 할게요',run:()=>{}},{text:'오늘은 마무리하기 어렵겠어요',run:()=>completeWork(false)}]);return;}
 G.officeTalk[role]=true;say(LifeStory.dialogue(G.s,role),()=>{if(role==='peer'&&G.s.day>=1&&G.s.fur>0)G.s.flags.peerKnowsCat=true;save();});
}
function startWork(){const task=LifeStory.task(G.s,'work');if(task.kind==='sort')startMini('work');else runShift(true);}
function runShift(completed){
 if(G.workMontage)return;G.workProgress=0;G.workMontage={start:G.now,duration:4,completed};G.goal=null;G.keys={};
 notice(G.s.flags.careConcern?'아침에 두고 온 빈 그릇이 자꾸 생각난다.':'메일을 읽고, 동료와 확인하고, 점심을 먹고 다시 일을 한다.',4);
 later(4,()=>{G.workMontage=null;const choice=LifeStory.workChoice(G.s);if(completed&&choice)say([{who:'팀장',text:'이제 퇴근하셔도 돼요. 아까 그 한 장은 오늘 보고 가실래요, 내일 아침에 먼저 보실래요?'}],null,choice.choices.map(option=>({text:option.text,run:()=>completeWork(true,option.id)})));else completeWork(completed);});updateUI();
}
function completeWork(completed,choice){const finish=()=>{const r=Life.finishWork(G.s,{completed,choice,missing:completed?[]:Life.workTask(G.s).required});G.officeDone=r.ok;G.officeFeedback=true;G.workMontage=null;G.hero.pose='stand';say(LifeStory.workReport(G.s),()=>{save();updateUI();});};if(G.mini)finishMini(finish,.8);else finish();}
function arriveHome(){fade(()=>{Life.arriveHome(G.s);G.dressed=false;G.doorOpen=true;G.catOnBed=false;G.curtainClosed=false;G.selectedGuide=null;setScene('living',150);G.cat.x=isStorm()?587:G.s.flags.catWithdrawn?570:365;G.cat.y=isStorm()?278:323;notice(LifeStory.homeLine(G.s),5);if(G.s.day===1&&!G.s.roller.owned&&!G.s.flags.rollerPrompted){G.s.flags.rollerPrompted=true;later(1,()=>ack('오늘 소매에 붙은 털을 보고 옆자리 동료가 돌돌이를 알려 줬다. 옷걸이 옆에 하나 두면 출근 전에 쓸 수 있다.',[{text:'돌돌이 구입 · 4,000원',run:()=>{if(act('buyRoller').ok)notice('옷걸이 옆에 돌돌이를 뒀다.');}},{text:'나중에 휴대폰으로 산다',run:()=>{}}]));}else later(1,lowFood);save();});}
function feedChoice(){if(G.s.needs.fed){notice('밥그릇에 사료가 남아 있다.');return;}if(!G.s.food){openPhone('food');return;}if(G.s.favoriteFood>0&&G.s.food>G.s.favoriteFood)ack('오늘은 무엇을 줄까?',[{text:'건사료',run:()=>startMini('feed',{foodKind:'normal'})},{text:'닭고기 습식',run:()=>startMini('feed',{foodKind:'favorite'})}]);else startMini('feed',{foodKind:G.s.favoriteFood?'favorite':'normal'});}
function bedtime(){if(G.s.phase!=='evening')return;const missing=[];if(!G.s.needs.fed)missing.push('밥그릇');if(!G.s.water)missing.push('물그릇');if(missing.length)ack(missing.join('과 ')+'이 비어 있다. 보리가 그 앞에 앉아 기다린다.',[{text:'챙기고 잔다',run:()=>moveRoom('living')},{text:'오늘은 그대로 잔다',run:()=>startMini('bed')}]);else startMini('bed');}
function beginSleep(open){
 const intro=G.intro==='routine';G.doorOpen=open;G.lastSleepDay=G.s.day;G.sleeping=true;G.catOnBed=false;G.hero.pose='sleep';G.mini=null;hideMini();G.lockedUntil=G.now+3.8;G.cat.x=open?300:510;G.cat.y=323;if(open)G.bedApproach=true;
 later(3.6,()=>{G.sleeping=false;G.bedApproach=false;G.jump=null;if(intro){if(!open){G.introClosed=true;G.s.flags.introClosed=true;catPerspective(0);}else startMontage();return;}const day=G.s.day,r=Life.sleep(G.s,open);if(G.s.phase==='ending'){playEnding();return;}if(!open&&(day===0||day===4)&&!G.s.flags['catView'+day]){G.s.flags['catView'+day]=true;G.pendingNight=r.night;catPerspective(day);return;}if(r.night?.wakeReasons?.length)nightWake(r.night);else morning();});
}
function nightWake(night){G.nightScene=true;G.nightData=night;G.catOnBed=false;G.doorOpen=true;const reason=night.wakeReasons[0];fade(()=>{setScene('living',250);G.cat.x=reason==='hunger'?565:reason==='thirst'?515:reason==='calling'?600:587;G.cat.y=323;G.cat.pose='sit';const hunger=night.wakeReasons.includes('hunger'),thirst=night.wakeReasons.includes('thirst');const line=hunger?'새벽에 그릇을 긁는 소리가 났다. 불을 켜니 밥그릇이 비어 있다.':thirst?'새벽에 보리가 빈 물그릇을 핥는 소리에 깼다.':reason==='rain'?'새벽에 창문이 덜컹거렸다. 보리가 놀라서 숨었다.':reason==='play'?'새벽에 보리가 이불 끝을 물고 당긴다.':'새벽에 문 앞에서 보리가 계속 운다.';
 ack(line,[{text:hunger?(G.s.food?'지금 밥을 준다':'사료 봉지를 확인한다'):thirst?'지금 물을 준다':'보리 곁에 앉는다',run:()=>{if(hunger&&!G.s.food){ack('봉지가 비었다. 아침에는 사료부터 사야겠다.',[{text:'아침에 가게를 확인한다',run:backToSleep}]);return;}if(hunger||thirst)startMini(hunger?'feed':'water',{night:true});else{G.restAt=G.now;later(2,()=>{G.restAt=null;backToSleep();});}}},{text:'다시 눕는다',run:backToSleep}]);updateUI();save();});}
function backToSleep(){G.nightScene=true;fade(()=>{setScene('bedroom',210);G.sleeping=true;G.catOnBed=false;later(1.8,()=>{G.sleeping=false;G.nightScene=false;G.nightData=null;morning();});});}
function catPerspective(day){fade(()=>{G.catControl=true;G.catStage=day===4?'scent':'door';G.catOldDay=day;G.carried=null;G.cameraAt=G.now;setScene('living',600);G.cat.x=580;G.cat.y=324;G.hero.pose='sleep';G.catOnBed=false;save();});}
function catDoorTry(){G.catStage='toy';tone(520,.14);notice('문 안에서 이불이 움직였다. 문은 열리지 않는다.');}
function catPickToy(){G.carried='toy';tone(900,.05);}
function catLeaveToy(){G.carried=null;G.s.flags.toyAtDoor=true;G.cat.pose='sleep';G.lockedUntil=G.now+1.5;later(1.5,endCat);}
function catNest(){G.cat.pose='sleep';G.s.flags.catUsedHoodie=true;G.lockedUntil=G.now+2;later(2,endCat);}
function endCat(){G.catControl=false;G.carried=null;if(G.introClosed||G.s.flags.introClosed){G.introClosed=false;delete G.s.flags.introClosed;startMontage();return;}const night=G.pendingNight;G.pendingNight=null;if(night?.wakeReasons.length)nightWake(night);else morning();}
function morning(){fade(()=>{Life.finishNight(G.s);G.nightScene=false;G.nightPlaying=false;G.catControl=false;G.sleeping=false;G.catOnBed=false;G.doorOpen=false;G.curtainClosed=false;G.dressed=false;G.hero.pose='stand';G.selectedGuide=null;G.departureCareConfirmed=false;setScene('bedroom',230);G.cat.x=510;G.cat.y=323;if(weekend()){Life.arriveHome(G.s);G.doorOpen=true;notice('오늘은 출근하지 않는다. 창밖이 밝다.',5);}else if(G.s.flags.toyAtDoor&&!G.s.flags.toyDiscovered){G.s.flags.toyDiscovered=true;ack('방문 앞에 쥐 인형이 놓여 있다. 밤에 보리가 가져온 모양이다.');}else notice(G.s.energy<=1?'알람을 두 번 끄고서야 일어났다. 몸이 무겁다.':'알람이 울렸다. 보리가 문 밖에서 기다린다.',5);updateUI();save();});}
function playEnding(){
 G.endingPlayback=true;G.sleeping=false;G.mini=null;hideMini();G.catControl=false;G.nightScene=false;rainAudio(false);const end=Life.ending(G.s);G.endingKey=end.key;G.finalEnding=end;
 fade(()=>{setScene(end.key==='neglected'?'living':'office',330);G.officeDone=true;G.dressed=end.key!=='neglected';G.cat.x=565;G.cat.y=323;say([{who:'',text:end.lines[0]}],()=>fade(()=>{setScene('living',300);G.dressed=false;G.doorOpen=true;G.cat.x=end.key==='neglected'||end.key==='distance'?565:380;G.cat.y=323;G.cat.pose='sit';say(end.lines.slice(1).map(text=>({who:'',text})),()=>{G.endingPlayback=false;G.endingMoment=true;updateUI();});}));});
}
function showEnding(){G.mode='ending';G.endingPlayback=false;G.endingMoment=false;G.sleeping=false;const end=G.finalEnding||Life.ending(G.s);G.endingKey=end.key;$('gameScreen').hidden=true;$('endingTitle').textContent=end.title;$('endingText').replaceChildren();addText($('endingText'),'p',end.lines.at(-1));$('endingScreen').hidden=false;try{localStorage.setItem(SAVE_KEY,JSON.stringify({finished:true}));}catch(_){}}
function startMini(type,opts={}){
 if(G.mini||G.dialog||G.ack||G.workMontage)return;const s=G.s;
 if(type==='prepare')type='bag';
 if(['play','laundry','arrange','dishes'].includes(type)&&s.phase==='morning'){notice('출근 준비를 하고 나갈 시간이다.');return;}
 if(type==='water'&&s.water&&!opts.night&&!opts.ending){notice('물그릇에 깨끗한 물이 있다.');return;}
 if(type==='roller'&&(!s.roller.owned||!s.fur)){notice(s.roller.owned?'옷이 깨끗하다.':'돌돌이는 휴대폰의 생활용품에서 살 수 있다.');return;}
 if(type==='play'&&s.needs.played){notice('보리가 장난감을 끌어안고 쉬고 있다.');return;}
 const slotAction=({bag:s.phase==='evening'?'prepare':null,play:'play',arrange:!s.hoodie?'hoodie':null,laundry:'laundry',dishes:'dishes'})[type];
 if(!G.intro&&slotAction&&s.phase==='evening'&&Life.timeBand(s).remaining<=0){ack('벌써 잠자리에 들 시간이다. 밥과 물을 챙기고, 남은 일은 내일 하자.');return;}
 const labels={feed:['밥 주기','사료 봉지를 그릇 위로 끌어 놓는다.'],water:['물 갈기','물병을 그릇 위로 끌어 놓는다.'],play:['보리와 놀기','쥐 인형을 끌어 움직였다가 보리가 잡을 수 있게 멈춘다.'],bag:['가방 챙기기','노트북, 충전기, 수첩을 가방에 넣는다.'],work:['파일 정리','파일 이름의 날짜와 같은 폴더에 넣는다.'],arrange:['옷과 보리 자리','옷은 걸고, 후드티는 보리 자리로 옮긴다.'],laundry:['빨래 모으기','옷을 세탁 바구니에 넣는다.'],dishes:['설거지','스펀지를 잡고 접시를 문지른다.'],curtain:['창문 닫기','커튼을 끝까지 당겨 닫는다.'],roller:['옷에 붙은 털 떼기','돌돌이를 잡고 털 위로 굴린다.'],bed:['방문','문을 왼쪽으로 밀어 닫거나, 오른쪽으로 당겨 열어 둔다.'],umbrella:['우산','우산 손잡이를 잡고 고양이 쪽으로 옮긴다.'],pet:['쓰다듬기','손을 누른 채 고양이 등 위를 천천히 여러 번 쓸어 준다.']};
 const m=G.mini={type,start:G.now,drag:null,p:{x:180,y:170},pointer:{x:330,y:235},progress:0,moved:0,lastMove:G.now,lastP:null,complete:false,down:false,catX:320,catY:285,cards:[],slots:[],items:[],fur:[],door:G.doorOpen?1:0,decided:false,...opts};
 if(type==='umbrella')m.p={x:190,y:150};
 if(type==='roller'){m.p={x:155,y:155};m.fur=Array.from({length:s.fur},(_,i)=>({...LifeView.rollerFur(i),on:true}));}
 if(type==='bag')m.items=[{id:'laptop',type:'laptop',x:145,y:150,placed:false},{id:'charger',type:'charger',x:260,y:150,placed:false},{id:'notebook',type:'notebook',x:350,y:150,placed:false}];
 if(type==='arrange'||type==='laundry')m.items=type==='laundry'?[{type:'hoodie',x:190,y:155},{type:'hoodie',x:290,y:190}]:[...(!s.suitStored?[{type:'suit',x:190,y:160}]:[]),...(!s.hoodie?[{type:'hoodie',x:310,y:180}]:[])];
 if(type==='dishes')m.items=[{id:'plate1',x:180,y:200,clean:0},{id:'plate2',x:300,y:200,clean:0},{id:'plate3',x:420,y:200,clean:0}];
 if(type==='work'){m.task=LifeStory.task(s,'work');m.referenceReady=true;m.slots=m.task.slots.map((a,i)=>({...a,x:90+i*155,y:232,w:135,h:67,cardId:null}));m.cards=m.task.cards.map((a,i)=>({...a,word:a.text,x:85+i*160,y:95,w:130,h:95,placed:false,homeX:85+i*160}));}
 if(type==='arrange'&&!m.items.length){G.mini=null;notice('옷과 보리 자리는 정리했다.');return;}
 G.goal=null;G.pending=null;G.keys={};G.guide=null;$('minigameBar').hidden=false;$('miniLabel').textContent=labels[type][0];$('miniHint').textContent=labels[type][1];
 $('miniExit').hidden=type==='umbrella';$('miniExit').textContent='돌아가기';$('miniActions').replaceChildren();$('miniActions').hidden=true;$('taskSource').replaceChildren();$('taskSource').hidden=true;
 if(type==='bed'){m.confirm=button($('miniActions'),'문을 직접 움직여 보세요',()=>sleepChoice(m.door===1));m.confirm.disabled=true;$('miniActions').hidden=false;}
 if(type==='work'){m.confirm=button($('miniActions'),'파일 정리 끝내기',()=>completeWork(true));m.confirm.disabled=true;$('miniActions').hidden=false;}
 updateUI();
}
function hideMini(){$('minigameBar').hidden=true;$('miniActions').hidden=true;$('taskSource').hidden=true;}
function exitMini(){if(!G.mini||G.mini.complete)return;if(G.mini.type==='roller')act('stopRoller',{},true);G.mini=null;hideMini();G.lockedUntil=G.now+.3;updateUI();save();}
$('miniExit').onclick=exitMini;
function finishMini(fn,wait=1){const m=G.mini;if(!m||m.complete)return;m.complete=true;G.lockedUntil=G.now+wait;later(wait,()=>{G.mini=null;hideMini();fn?.();updateUI();save();});}
function sleepChoice(open){const m=G.mini;if(!m||m.type!=='bed'||!m.decided||m.complete)return;m.complete=true;G.doorOpen=open;G.lockedUntil=G.now+.8;later(.8,()=>beginSleep(open));}
function miniDown(p){const m=G.mini;if(!m||m.complete)return;m.down=true;m.pointer=p;m.lastP=p;m.downAt=G.now;m.downP=p;
 if(['feed','water','roller','umbrella'].includes(m.type)){m.drag='tool';m.offset={x:p.x-m.p.x,y:p.y-m.p.y};}
 if(m.type==='bed'&&p.x>395&&p.x<590&&p.y>55&&p.y<310)m.drag='door';
 if(m.type==='pet')m.drag='hand';if(m.type==='play')m.hasMoved=false;if(m.type==='dishes')m.drag='sponge';if(m.type==='curtain')m.drag='curtain';
 const card=m.cards.slice().reverse().find(c=>p.x>c.x&&p.x<c.x+c.w&&p.y>c.y&&p.y<c.y+c.h);if(card){for(const slot of m.slots)if(slot.cardId===card.id)slot.cardId=null;card.placed=false;m.drag=card;m.offset={x:p.x-card.x,y:p.y-card.y};}
 if(m.type!=='dishes'){const item=m.items.find(a=>!a.placed&&Math.hypot(a.x-p.x,a.y-p.y)<55);if(item){m.drag=item;m.offset={x:p.x-item.x,y:p.y-item.y};}}
}
function miniMove(p){const m=G.mini;if(!m||m.complete)return;const delta=m.lastP?dist(p,m.lastP):0;m.pointer=p;
 if(m.type==='play'){if(m.down&&delta>3){m.hasMoved=true;m.moved+=delta;m.lastMove=G.now;}m.lastP=p;return;}
 if(!m.down)return;
 if(m.drag==='tool'){m.p={x:p.x-m.offset.x,y:p.y-m.offset.y};if(m.type==='roller'){const hits=m.fur.filter(f=>f.on&&Math.abs(f.x-m.p.x)<35&&Math.abs(f.y-m.p.y)<21);if(hits.length){if(!m.used){if(!act('startRoller',{},true).ok)return;m.used=true;}const r=act('roll',{amount:hits.length},true);if(r.ok){hits.slice(0,r.removed).forEach(f=>f.on=false);tone(210,.03,'sawtooth',.008);}}}}
 if(m.drag&&typeof m.drag==='object'){m.drag.x=p.x-(m.offset?.x||0);m.drag.y=p.y-(m.offset?.y||0);}
 if(m.drag==='door'){m.door=clamp((p.x-430)/120,0,1);m.moved+=delta;}
 if(m.drag==='curtain')m.progress=clamp((p.x-400)/160,0,1);
 if(m.drag==='sponge'){for(const plate of m.items)if(dist(p,plate)<50)plate.clean=Math.min(1,plate.clean+delta/180);if(m.items.every(plate=>plate.clean>=1))finishMini(()=>act('dishes'),1.4);}
 if(m.drag==='hand'&&p.x>240&&p.x<470&&p.y>165&&p.y<300){m.moved+=Math.min(delta,35);m.lastMove=G.now;m.progress=Math.min(1,m.moved/260);if(m.moved>=260&&G.now-m.start>1.8)finishMini(()=>{if(m.ending){G.endingMoment=false;G.endingPlayback=true;G.restAt=G.now;notice('손바닥 아래에서 가르릉거리는 소리가 난다.',4);later(3,showEnding);}else if(G.intro==='hoodie'){G.intro='routine';G.s.flags.introFur=true;setScene('bedroom',330);G.cat.x=390;G.cat.y=323;say([{who:'나',text:'후드티에 털이 잔뜩 붙었네. 졸려? 이제 자러 가자.'}]);}else{G.s.flags.petFurToday=true;notice(G.s.cat+'가 눈을 가늘게 뜨고 손에 얼굴을 비볐다.',5);}},1.6);}
 m.lastP=p;
}
function miniUp(p){const m=G.mini;if(!m||m.complete)return;m.down=false;
 if(['feed','water'].includes(m.type)&&Math.abs(p.x-385)<100&&p.y>100&&p.y<340){m.p={x:353,y:155};m.placed=true;}
 if(m.drag==='door'){if(m.moved>=25){m.door=m.door>.5?1:0;m.decided=true;m.confirm.disabled=false;m.confirm.textContent=m.door?'문을 열어 두고 잠들기':'문을 닫고 잠들기';tone(m.door?480:200,.1);}else m.door=G.doorOpen?1:0;}
 if(m.cards.includes(m.drag)){const card=m.drag,slot=m.slots.find(s=>p.x>s.x&&p.x<s.x+s.w&&p.y>s.y&&p.y<s.y+s.h);if(slot&&m.task.solution[slot.id]===card.id){const old=m.cards.find(a=>a.id===slot.cardId);if(old){old.x=old.homeX;old.y=95;old.placed=false;}slot.cardId=card.id;card.x=slot.x+3;card.y=slot.y+4;card.placed=true;tone(500,.05);$('miniHint').textContent='같은 날짜의 폴더에 넣었다.';}else{card.x=card.homeX;card.y=95;card.placed=false;card.wrong=G.now+1;$('miniHint').textContent='파일 이름 끝의 날짜를 다시 보자.';tone(170,.08);}m.confirm.disabled=!m.slots.every(s=>s.cardId===m.task.solution[s.id]);}
 if(m.items.includes(m.drag)&&m.type!=='dishes'){
  const item=m.drag;if(m.type==='bag'){if(p.x>400&&p.x<565&&p.y>160&&p.y<310){item.placed=true;item.x=455;item.y=245;tone(520,.06);}else{item.x=({laptop:145,charger:260,notebook:350})[item.id];item.y=150;}if(m.items.every(a=>a.placed))finishMini(()=>{if(G.s.phase==='evening')act('prepare',{day:nextDay()},true);act('packBag',{},true);if(G.s.phase==='morning')act('pickBag',{},true);notice('노트북과 충전기를 넣고 가방을 닫았다.',5);},1.2);}
  else{let action=null;if(m.type==='laundry'&&p.x>395&&p.y>215){m.items=m.items.filter(a=>a!==item);if(!m.items.length)finishMini(()=>act('laundry'),1.5);}else{if(item.type==='suit'&&p.x>440&&p.y<245)action='storeSuit';if(item.type==='hoodie'&&p.x>395&&p.y>245)action='hoodie';if(action&&act(action).ok)m.items=m.items.filter(a=>a!==item);if(!m.items.length)finishMini(()=>{},1.2);}}
 }
 if(m.type==='curtain'&&m.progress>.8){G.curtainClosed=true;act('secureWindow',{},true);finishMini(()=>{G.cat.x=535;G.cat.y=310;say([{who:'',text:'창문을 잠그자 덜컹거리는 소리가 멎었다. 소파 뒤에서 보리의 얼굴이 나왔다.'}],null,[{text:'곁에서 진정시킨다',run:()=>{if(act('calmRain').ok){G.restAt=G.now;later(2,()=>G.restAt=null);}}},{text:'내 일을 계속한다',run:()=>{}}]);},1.2);}
 if(m.type==='umbrella'&&clamp((m.p.x-190)/130,0,1)>.7){m.progress=1;finishMini(()=>{G.intro='sheltered';G.cat.pose='sit';G.cat.x=420;G.cat.y=323;say([{who:'나',text:'많이 젖었네. 집에서 말리고 가자.'}]);},2);}
 m.drag=null;
}
function updateMini(dt){const m=G.mini;if(!m||m.complete)return;
 if(['feed','water'].includes(m.type)){m.pouring=(m.down||m.placed)&&Math.abs(m.p.x-385)<65&&m.p.y>75&&m.p.y<210;if(m.pouring){m.progress+=dt*.65;if(G.now-(m.soundAt||0)>.3){m.soundAt=G.now;tone(m.type==='water'?180:280,.03);}}if(m.progress>=1){const type=m.type;finishMini(()=>{if(m.ending){G.endingMoment=false;G.endingPlayback=true;G.restAt=G.now;notice('깨끗한 물을 놓고 조금 떨어져 앉았다.',4);later(3,showEnding);return;}const r=m.night?Life.actAtNight(G.s,type):act(type,type==='feed'?{kind:m.foodKind}:{},true);G.catEatUntil=G.now+3;G.catEatX=type==='water'?515:575;Object.assign(G.cat,{x:G.catEatX,y:323,dir:-1,pose:'eat',walk:0});notice(type==='feed'?'보리가 그릇에 코를 박고 먹기 시작했다.':'보리가 새 물을 마신다.',4);if(m.night){later(3,()=>{if(G.s.nightIssue?.thirst)ack('물그릇도 비어 있다.',[{text:'물도 담아 준다',run:()=>startMini('water',{night:true})},{text:'다시 눕는다',run:backToSleep}]);else backToSleep();});return;}if(G.intro==='firstFeed')G.intro='firstWater';else if(G.intro==='firstWater')G.intro='hoodie';if(r.foodLow)later(3.2,lowFood);},1.5);}}
 if(m.type==='play'){const aim=clamp(m.pointer.x,100,545),dx=aim-m.catX;m.catX+=Math.sign(dx)*Math.min(Math.abs(dx),dt*140);m.catDir=dx>0?1:-1;m.catWalk=Math.abs(dx)>12?G.now:0;const catchable=m.hasMoved&&G.now-m.lastMove>.25&&Math.abs(dx)<45&&m.pointer.y>185;if(catchable)m.progress+=dt*.8;m.catY=catchable?285-Math.abs(Math.sin(G.now*6))*16:285;if(m.progress>=1)finishMini(()=>{act('play',{},true);notice(G.s.cat+'가 쥐 인형을 붙잡고 뒷발로 찬다.',5);},1.5);}
 if(m.type==='umbrella')m.progress=clamp((m.p.x-190)/130,0,1);
 if(m.type==='roller'&&!m.fur.some(f=>f.on)&&!m.finished){m.finished=true;finishMini(()=>{act('stopRoller',{},true);notice('소매가 깨끗해졌다. 옷걸이 옆에 돌돌이를 뒀다.');},1.2);}
}
function openPause(){if(G.mode!=='play'||G.endingPlayback)return;G.paused=true;G.keys={};G.resetConfirm=false;$('newGameButton').textContent='처음부터 다시하기';$('pauseScreen').hidden=false;$('saveStatus').textContent='';rainAudio(false);}
function resumePlay(){G.paused=false;$('pauseScreen').hidden=true;}
function title(){G.mode='title';G.paused=false;G.auto=[];G.dialog=null;G.mini=null;G.menu=false;G.ack=false;G.transition=null;G.workMontage=null;G.endingPlayback=false;G.endingMoment=false;for(const id of ['gameScreen','endingScreen','phone','acknowledge','dialogue','naming','pauseScreen'])$(id).hidden=true;$('titleScreen').hidden=false;rainAudio(false);offerResume();}
$('menuButton').onclick=openPause;$('resumePlay').onclick=resumePlay;
$('saveButton').onclick=()=>{$('saveStatus').textContent=save()?'저장했어요. 진행 중인 조작은 다시 시작합니다.':'브라우저 저장 공간을 확인해 주세요.';};
$('saveExitButton').onclick=()=>{save();title();};
$('newGameButton').onclick=()=>{if(!G.resetConfirm){G.resetConfirm=true;$('saveStatus').textContent='처음부터 시작하면 현재 기록을 지웁니다.';$('newGameButton').textContent='확인 · 처음부터';return;}try{localStorage.removeItem(SAVE_KEY);}catch(_){}title();};
function update(dt){
 if(G.paused)return;const due=G.auto.filter(a=>a.at<=G.now);G.auto=G.auto.filter(a=>a.at>G.now);for(const a of due)a.fn();
 if(G.transition){const tr=G.transition,p=(G.now-tr.start)/tr.duration;if(p>=.5&&!tr.switched){tr.switched=true;tr.fn();}if(p>=1&&G.transition===tr)G.transition=null;}
 if(G.dialog){const d=G.dialog,line=d.lines[d.index];d.elapsed+=dt;const count=Math.min(line.text.length,Math.floor(d.elapsed*35));if(count>d.count){d.count=count;if(count%3===0&&/\S/.test(line.text[count-1]))tone(190+line.text.charCodeAt(count-1)%180,.025,'triangle',.008);paintDialogue();}}
 if(G.mode!=='play')return;
 if(G.workMontage)G.workProgress=clamp((G.now-G.workMontage.start)/G.workMontage.duration,0,1);
 if(G.scene==='station')G.trainX=Math.max(15,680-(G.now-G.stationAt)*420);
 if(G.sleeping&&G.bedApproach&&!G.jump){if(G.cat.x>195){G.cat.x=Math.max(195,G.cat.x-dt*140);G.cat.pose='walk';G.cat.walk+=dt;}else{G.bedApproach=false;G.jump={start:G.now,duration:.55,x0:195,y0:323,x1:132,y1:300};}}
 updateMovement(dt);updateCat(dt);updateMini(dt);const storm=isStorm()&&['living','bedroom'].includes(G.scene);rainAudio(!G.paused&&(storm||G.scene==='street'));
 if(storm&&G.now>G.thunderAt){G.thunderAt=G.now+14;G.flash=.3;noise(1.3,G.curtainClosed?.015:.035);}G.flash=Math.max(0,G.flash-dt);
 if(G.now>G.noticeUntil)$('sceneNotice').hidden=true;if(G.now>G.timeChangeUntil)$('timeChange').hidden=true;
 if(G.now-G.lastUI>.25){G.lastUI=G.now;updateUI();if(!G.intro&&!G.catControl&&!G.nightScene&&!G.sleeping&&!G.endingPlayback&&['morning','evening'].includes(G.s.phase))lowFood();}
}
function frame(ms){const t=ms/1000,dt=Math.min(.05,G.last?t-G.last:0);G.last=t;if(!G.paused)G.now+=dt;update(dt);if(G.mode==='title')LifeView.title(titleCtx,G.now);else if(G.mode==='ending')LifeView.end($('endingCanvas').getContext('2d'),G,G.endingKey);else{LifeView.draw(ctx,G);if(G.transition){ctx.fillStyle='rgba(30,51,61,'+Math.sin(clamp((G.now-G.transition.start)/G.transition.duration,0,1)*Math.PI)+')';ctx.fillRect(0,0,640,360);}}requestAnimationFrame(frame);}
function begin(){audioStart();G.s=Life.create($('playerName').value.trim()||'김신입','보리');G.mode='play';G.intro='rejection';G.auto=[];G.menu=false;G.ack=false;G.dialog=null;G.mini=null;G.catControl=false;G.sleeping=false;G.nightScene=false;G.transition=null;G.officeTalk={};G.officeDone=false;G.officeFeedback=false;G.doorOpen=true;G.catOnBed=false;G.endingPlayback=false;G.hero.pose='stand';G.cat={x:440,y:323,dir:-1,walk:0,pose:'fear'};$('titleScreen').hidden=true;$('gameScreen').hidden=false;$('endingScreen').hidden=true;setScene('street',110);phoneMessage(LifeStory.phone.rejection,()=>{G.intro='meet';notice('휴대폰을 넣으려는데 상자 쪽에서 울음이 들린다.',5);save();});}
$('startButton').onclick=()=>{let previous;try{previous=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(_){}if(previous?.state)ack('새로 시작하면 지금까지의 저장 기록을 덮어씁니다.',[{text:'새로 시작',run:begin},{text:'돌아가기',run:()=>{}}]);else begin();};
$('restartButton').onclick=title;
function restore(saved){audioStart();G.s=saved.state;G.mode='play';G.intro=saved.intro||'';G.auto=[];G.dialog=null;G.mini=null;G.menu=false;G.ack=false;G.sleeping=false;G.paused=false;G.transition=null;G.dressed=G.s.dressed;G.doorOpen=saved.doorOpen;G.curtainClosed=!!saved.curtainClosed;G.catControl=!!saved.catControl;G.catStage=saved.catStage||'';G.catOldDay=saved.catOldDay||0;G.carried=saved.carried;G.pendingNight=saved.pendingNight;G.officeTalk=saved.officeTalk||{};G.officeDone=!!saved.officeDone;G.officeFeedback=!!saved.officeFeedback;G.nightScene=false;G.catOnBed=false;G.endingPlayback=false;$('titleScreen').hidden=true;$('gameScreen').hidden=false;$('endingScreen').hidden=true;setScene(saved.scene||'living',saved.hero?.x||220);G.cat=saved.cat||{x:430,y:323,dir:-1,walk:0,pose:'sit'};if(saved.nightScene&&saved.nightData)nightWake(saved.nightData);else if(G.intro==='rejection')phoneMessage(LifeStory.phone.rejection,()=>{G.intro='meet';});else if(G.intro==='name')$('naming').hidden=false;else if(['montage','offer'].includes(G.intro))startMontage();updateUI();}
function offerResume(){let saved;try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(_){}const valid=!!saved?.state&&saved.state.phase!=='ending';$('continueButton').hidden=!valid;$('continueButton').onclick=()=>valid&&restore(saved);$('startButton').textContent=valid?'처음부터 시작':'시작';}
async function loadAssets(){const urls=window.__LIFE_ASSETS||{rooms:'assets/rooms-pixel.png',places:'assets/places-pixel.png'};await Promise.all(Object.entries(urls).map(([k,url])=>new Promise(resolve=>{const im=new Image();im.onload=()=>{G.images[k]=im;resolve();};im.onerror=resolve;im.src=url;})));if(document.fonts)await document.fonts.ready;$('startButton').disabled=false;}
ctx.imageSmoothingEnabled=false;titleCtx.imageSmoothingEnabled=false;loadAssets();offerResume();requestAnimationFrame(frame);
window.CatDoorReview={snapshot:()=>JSON.parse(JSON.stringify({scene:G.scene,intro:G.intro,hero:G.hero,cat:G.cat,mini:G.mini?.type,task:G.mini?.task,cards:G.mini?.cards,slots:G.mini?.slots,items:G.mini?.items,doorDecision:G.mini?.decided,miniDoor:G.mini?.door,dialogue:G.dialog?.lines[G.dialog.index],state:G.s,catControl:G.catControl,camera:LifeView.camera(G),doorOpen:G.doorOpen,guideId:G.guideId,menu:G.menu,ack:G.ack,paused:G.paused,nightScene:G.nightScene,workMontage:!!G.workMontage,endingPlayback:!!G.endingPlayback,endingMoment:!!G.endingMoment,endingKey:G.endingKey}))};
})();
