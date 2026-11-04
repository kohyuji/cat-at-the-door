/* 이동, 생활 조작, 장면 전환. 시간은 행동이 끝났을 때만 진행한다. */
(function(){
'use strict';
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d'),titleCtx=$('titleCanvas').getContext('2d'),portrait=$('portrait').getContext('2d');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const SAVE_KEY='catdoor-life-v4';
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
function notice(text,seconds=4){if(G.dialog)return;$('sceneNotice').textContent=text;$('sceneNotice').hidden=!text;G.noticeUntil=G.now+seconds;}
function fade(fn,duration=.65){G.transition={start:G.now,duration,fn,switched:false};G.goal=null;G.pending=null;G.keys={};G.lockedUntil=G.now+duration;}
function setScene(scene,x=220,y=320){G.scene=scene;Object.assign(G.hero,{x,y,walk:0,pose:'stand'});G.goal=null;G.pending=null;G.keys={};G.cat.pose='sit';updateUI();}
function nextDay(){let day=G.s.day+1;while([6,7].includes(day))day++;return Math.min(12,day);}
function save(){
 if(!G.s||G.mode==='title'||G.mode==='ending'||(G.s.phase==='ending'&&G.shopMode!=='final')||G.endingPlayback)return false;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({state:G.s,scene:G.scene,intro:G.intro,hero:G.hero,cat:G.cat,doorOpen:G.doorOpen,curtainClosed:G.curtainClosed,officeTalk:G.officeTalk,officeDone:G.officeDone,officeFeedback:G.officeFeedback,catControl:G.catControl,catStage:G.catStage,catOldDay:G.catOldDay,carried:G.carried,pendingNight:G.pendingNight,nightScene:G.nightScene,nightData:G.nightData,blackIndex:G.blackIndex,shopMode:G.shopMode,shopReturn:G.shopReturn,phonePage:G.phonePage,phoneKind:G.phoneKind,finalEnding:G.finalEnding}));return true;}catch(_){return false;}
}
function act(type,opts={},quiet=false){const before=Life.timeBand(G.s),r=Life.act(G.s,type,opts);if(!quiet)notice(r.message,4);if(r.ok){G.dressed=G.s.dressed;const after=Life.timeBand(G.s);if(after.used!==before.used||after.label!==before.label){G.timeChangeUntil=G.now+3;$('timeChange').textContent=after.label;$('timeChange').hidden=false;tone(520,.12);}save();}updateUI();return r;}
function ack(text,options=[{text:'확인'}]){G.ack=true;G.keys={};G.goal=null;$('ackText').textContent=text;$('ackActions').replaceChildren();for(const option of options){button($('ackActions'),option.text,()=>{G.ack=false;$('acknowledge').hidden=true;G.lockedUntil=G.now+.3;option.run?.();});}$('acknowledge').hidden=false;updateUI();}
function say(lines,done=null,choices=null){$('sceneNotice').hidden=true;if(!lines?.length){done?.();return;}G.dialog={lines,index:0,count:0,elapsed:0,last:G.now,done,choices};G.goal=null;G.keys={};$('dialogue').hidden=false;paintDialogue();updateUI();}
function paintDialogue(){
 const d=G.dialog;if(!d)return;const line=d.lines[d.index],who=line.who||'';
 $('speaker').textContent=who==='나'?G.s.me:who;$('speaker').hidden=!who;
 $('speech').textContent=line.text.slice(0,d.count);$('choices').replaceChildren();
 const full=d.count>=line.text.length,last=d.index===d.lines.length-1;$('dialogueNext').hidden=full&&last&&!!d.choices;
 if(full&&last&&d.choices)for(const c of d.choices)button($('choices'),c.text,()=>{if(G.dialog!==d||G.now-d.last<.25)return;closeDialogue();c.run?.();});
 portrait.clearRect(0,0,80,80);portrait.hidden=!who;portrait.imageSmoothingEnabled=false;
 if(who===G.s.cat||who==='고양이'){portrait.save();portrait.translate(40,65);portrait.scale(1.15,1.15);PixelArt.cat(portrait,0,0,-1,0,'sit');portrait.restore();}
 else if(who)PixelArt.person(portrait,40,76,who.includes('팀장')?'lead':/동기|동료/.test(who)?'peer':G.consultation?.name===who?G.consultation.variant||'customerA':G.dressed?'suit':'hoodie',0,0,'stand');
}
function closeDialogue(){G.dialog=null;$('dialogue').hidden=true;G.lockedUntil=G.now+.35;canvas.focus({preventScroll:true});}
function advanceDialogue(){const d=G.dialog;if(!d||G.now-d.last<.25)return;d.last=G.now;const line=d.lines[d.index];if(d.count<line.text.length){d.count=line.text.length;d.elapsed=line.text.length/35;paintDialogue();return;}if(d.index===d.lines.length-1){if(d.choices)return;const done=d.done;closeDialogue();done?.();}else{d.index++;d.count=0;d.elapsed=0;paintDialogue();}}
// 대화창 어느 곳이든 누를 수 있다. 선택 버튼은 자기 행동만 실행한다.
$('dialogue').onclick=e=>{if(e?.target?.tagName==='BUTTON')return;advanceDialogue();};
$('dialogueNext').onclick=e=>{e?.stopPropagation?.();advanceDialogue();};
function closePhone(){G.menu=false;$('phone').hidden=true;G.lockedUntil=G.now+.3;const done=G.phoneDone;G.phoneDone=null;done?.();canvas.focus({preventScroll:true});}
function phoneMessage(message,done){
 G.menu=true;G.phoneDone=done;G.phoneKind=message===LifeStory.phone.offer?'offer':'rejection';G.phonePage='home';G.phoneUnread=true;G.goal=null;G.keys={};renderPhone();updateUI();
}
function renderPhone(){
 const p=$('phoneBody');p.replaceChildren();$('phoneClose').hidden=!!G.phoneDone;$('phone').hidden=false;
 const message=LifeStory.phone[G.phoneKind];addText(p,'small','9:41');
 if(G.phonePage==='home'){
  addText(p,'h2','휴대폰');const apps=addText(p,'div','','phone-apps');button(apps,G.phoneUnread?'메시지 ①':'메시지',()=>{G.phonePage='messages';renderPhone();});
  if(!G.phoneDone)button(apps,'가계부',()=>{G.phonePage='ledger';renderPhone();});
 }else if(G.phonePage==='messages'){
  button(p,'‹ 홈 화면',()=>{G.phonePage='home';renderPhone();});addText(p,'h2','메시지');
  if(message)button(p,message.sender+(G.phoneUnread?' · 새 메시지 1':''),()=>{G.phonePage='message';G.phoneUnread=false;renderPhone();});
 }else if(G.phonePage==='message'&&message){
  addText(p,'h2',message.sender);addText(p,'small',message.title);addText(p,'p',message.body,'message-bubble');button(p,'휴대폰을 내려놓는다',()=>{G.phoneUnread=false;closePhone();});
 }else{
  addText(p,'h2','생활비 '+G.s.cash.toLocaleString()+'원');const today=G.s.transactions.filter(t=>t.day===G.s.day&&!t.id.startsWith('winter:'));addText(p,'p','오늘 입금 '+today.filter(t=>t.cash>0).reduce((n,t)=>n+t.cash,0).toLocaleString()+'원 · 오늘 지출 '+(-today.filter(t=>t.cash<0).reduce((n,t)=>n+t.cash,0)).toLocaleString()+'원','phone-balance');
  for(const t of G.s.transactions.slice(-12))addText(p,'p',t.label+' '+(t.cash>0?'+':'')+t.cash.toLocaleString()+'원');
  button(p,'‹ 홈 화면',()=>{G.phonePage='home';renderPhone();});
 }
}
function openPhone(){
 if(G.dialog||G.mini||G.ack||!G.s||G.catControl||(G.sleeping&&G.intro!=='bedPhone')||G.nightScene||G.workMontage)return;
 if(G.intro==='bedPhone'){G.sleeping=false;phoneMessage(LifeStory.phone.rejection,rejected);return;}
 if(G.intro==='offer'){phoneMessage(LifeStory.phone.offer,employed);return;}
 G.menu=true;G.phoneDone=null;G.phonePage='ledger';G.goal=null;G.keys={};renderPhone();
}
function enterShop(mode='general',returnTo='home'){
 G.shopMode=mode;G.shopReturn=returnTo;fade(()=>{setScene('shop',320);G.cat.x=390;save();});
}
function buyFromShelf(action){
 const first=G.shopMode==='intro';
 if(action==='dark'){
  say([{who:'',text:'오늘의 이야기는 여기서 멈춘다. 이 장면은 현실이 아니기에, 당신에게는 다시 선택할 기회가 있다.'}],null,[{text:'슈퍼 앞에서 다시 시작한다',run:()=>{G.intro='sheltered';setScene('street',380);save();}}]);return;
 }
 const price=Life.prices[action][0],product=Life.prices[action][3];
 say([{who:'나',text:product+' · '+price.toLocaleString()+'원. 남은 생활비는 '+G.s.cash.toLocaleString()+'원이다.'}],null,[{text:'산다',run:()=>{const r=act(action,{},true);say([{who:'',text:r.message}],()=>{if(r.ok&&first)adopt();else save();});}},{text:'진열대에 둔다',run:()=>{}}]);
}
function exitShop(){
 if(G.shopMode==='intro'){say([{who:'나',text:'먼저 사료를 골라야겠다.'}]);return;}
 if(G.shopMode==='final'){finalDoor();return;}
 if(G.shopReturn==='commute')arriveHome();else fade(()=>setScene('living',100));
}

$('phoneClose').onclick=closePhone;$('phoneButton').onclick=()=>openPhone();$('foodLabel').onclick=()=>{if(!G.intro&&!G.dialog&&!G.mini&&!G.menu){if(['living','bedroom'].includes(G.scene))enterShop('general','home');else openPhone();}};
function lowFood(){if(G.intro||G.ack||G.menu||G.dialog||G.mini||G.nightScene||G.s.food>1||G.s.flags.foodLowAcknowledged||!['living','bedroom'].includes(G.scene))return;act('acknowledgeFood',{},true);say([{who:'나',text:G.s.food?'사료가 한 끼 남았다. 다음 밥은 슈퍼에서 사 와야겠다.':'사료 봉지가 비었다. 슈퍼에서 한 끼 포장부터 살 수 있다.'}]);}
function checklist(){
 const s=G.s;if(!s||G.intro||G.nightScene||G.catControl)return[];
 if(G.scene==='office')return[{text:'예약 상담 '+s.consultations.filter(c=>c.day===s.day&&!c.optional).length+'/2',done:G.officeDone}];
 const rows=[{text:s.minute<1080?'아침 밥':'저녁 밥',done:s.needs.fed},{text:'오늘 물 교체',done:s.waterChangedDay===s.day},{text:'모래 '+s.litterDirty+'덩이',done:s.litterDirty===0}];
 if(s.phase==='morning'&&!weekend())rows.push({text:'출근복',done:s.dressed},{text:'가방 들기',done:s.hasBag});
 else rows.push({text:'놀이',done:s.needs.played},{text:'내 휴식',done:!!s.done.rest});return rows;
}
function updateUI(){
 if(!G.s)return;const s=G.s,band=Life.timeBand(s),hidden=!!G.intro||G.catControl||G.nightScene||G.endingPlayback||G.endingMoment||(!G.intro&&!s.flags.routineIntroduced);
 $('menuButton').hidden=!!(G.endingPlayback||G.endingMoment);
 $('dateLabel').textContent=G.intro==='offer'?'봄':G.intro?'겨울':G.catControl?'그날 밤':info().date+' ('+info().weekday+')';
 $('timeLabel').textContent=G.nightScene?'02:40':G.catControl?'그날 밤':G.intro?'':(s.day===0?'첫 출근 전날 · ':'')+Life.clock(s).text;
 $('foodLabel').textContent='◒ 사료 '+s.food+'끼';$('foodLabel').hidden=!!G.intro||G.catControl||G.endingPlayback||G.endingMoment||(!G.intro&&!s.flags.routineIntroduced);
 $('energyLabel').textContent=({normal:'괜찮음',tired:'피곤함',exhausted:'몹시 피곤함'})[Life.fatigue(s)];$('energyLabel').hidden=hidden;
 $('phoneButton').hidden=(!!G.intro&&!['bedPhone','offer'].includes(G.intro))||G.catControl||G.nightScene||G.endingPlayback||G.endingMoment||(!G.intro&&!s.flags.routineIntroduced);$('phoneBadge').hidden=!['bedPhone','offer'].includes(G.intro);$('cashLabel').hidden=hidden;$('cashLabel').textContent=s.cash.toLocaleString()+'원';
 $('soundButton').innerHTML=Audio.enabled?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8q6 4 0 8" fill="none" stroke="currentColor" stroke-width="2"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
 $('soundButton').setAttribute('aria-label',Audio.enabled?'소리 끄기':'소리 켜기');
 $('nightBanner').hidden=!G.nightScene;$('nightBanner').textContent='새벽 2:40 · 잠에서 깼다';
 $('routineToggle').hidden=hidden||G.scene==='office';$('routineChecklist').hidden=hidden||!G.checklistOpen||!!G.mini||!!G.dialog;
 $('routineChecklist').replaceChildren();if(!$('routineChecklist').hidden)for(const row of checklist())addText($('routineChecklist'),'span',(row.done?'✓ ':'○ ')+row.text,'check-item'+(row.done?' checked':''));
 $('dayRhythm').hidden=hidden||G.scene==='office'||s.phase==='morning';$('dayRhythm').replaceChildren();
 if(!$('dayRhythm').hidden)addText($('dayRhythm'),'span',Life.clock(s).text+' · '+band.label,'time-label');
 $('eveningOptions').hidden=true;$('shiftProgress').hidden=!G.workMontage;$('shiftProgress').textContent=G.workMontage?'일하는 중  '+['오전','점심','오후','퇴근'][Math.min(3,Math.floor((G.workProgress||0)*4))]:'';
 $('shopPrices').hidden=G.scene!=='shop'||G.intro==='montage';
 $('shopPrices').replaceChildren();if(!$('shopPrices').hidden){const tags=[['건사료 12,000원',166,181],['습식 15,000원',292,181],...(G.shopMode==='intro'?[['번개탄 12,000원',418,181]]:[['한 끼 3,000원',166,258],...(!s.roller.owned?[['돌돌이 4,000원',544,181]]:[])])];for(const [label,x,y] of tags){const tag=addText($('shopPrices'),'span',label);tag.style.left=x/6.4+'%';tag.style.top=y/3.6+'%';}}
 refreshGuide();refreshHotspots();
}
$('soundButton').onclick=()=>{Audio.enabled=!Audio.enabled;if(Audio.enabled)audioStart();rainAudio(isStorm());updateUI();};
$('routineToggle').onclick=()=>{G.checklistOpen=!G.checklistOpen;updateUI();};
function target(id,label,x,y,w,h,ax,ay,fn){return{id,label,x,y,w,h,ax,ay,fn};}
function targets(){
 if(G.mode!=='play'||G.mini||G.dialog||G.menu||G.ack||G.transition||G.sleeping||G.paused||G.workMontage||G.endingPlayback||G.nightScene)return[];
 const s=G.s,T=[];
 if(G.scene==='shop')return [target('dry','건사료 12,000원',115,104,102,80,166,320,()=>buyFromShelf('buyFood')),target('wet','습식 사료 15,000원',241,104,102,80,292,320,()=>buyFromShelf('buyFavorite')),...(G.shopMode==='intro'?[target('dark','번개탄 12,000원',367,104,102,80,418,320,()=>buyFromShelf('dark'))]:[target('small','건사료 한 끼 3,000원',115,194,102,70,166,320,()=>buyFromShelf('smallFood')),...(!s.roller.owned?[target('shoproller','돌돌이 4,000원',493,104,102,80,544,320,()=>buyFromShelf('buyRoller'))]:[]),target('shopexit','장보기를 마치고 집으로',5,65,70,240,70,320,exitShop)])];
 if(G.catControl){if(G.catStage==='openDoor')return[target('catopen','앞발로 열린 문을 지나 이불로 간다',582,70,58,235,600,323,()=>{G.s.flags.catOpenTrace=true;G.cat.pose='walk';later(1,endCat);})];if(G.catStage==='door')return[target('catdoor','문을 앞발로 밀어 본다',582,70,58,235,600,323,catDoorTry)];if(G.catStage==='toy')return[target('cattoy',G.carried?'인형을 문 앞에 놓는다':'쥐 인형을 문다',G.carried?575:330,G.carried?260:295,G.carried?65:70,55,G.carried?590:360,325,G.carried?catLeaveToy:catPickToy)];return[target('catscent','옷 냄새를 맡고 눕는다',455,240,130,105,520,323,catNest)];}
 if(G.intro==='meet')return[target('kitten','슈퍼 앞 고양이에게 다가간다',410,270,80,75,380,320,()=>say(LifeStory.opening,()=>startMini('umbrella')))];
 if(G.intro==='sheltered')return[target('home','슈퍼에 들어간다',520,165,110,175,550,320,()=>enterShop('intro'))];
 if(G.intro==='firstFeed')return[target('food','밥그릇을 채운다',525,290,90,55,550,325,feedChoice)];
 if(G.intro==='firstWater')return[target('water','물그릇을 채운다',468,295,60,50,490,325,()=>startMini('water'))];
 if(G.intro==='hoodie')return[target('pet','고양이를 쓰다듬는다',G.cat.x-40,G.cat.y-50,90,60,G.cat.x-35,320,()=>startMini('pet'))];
 if(G.intro==='furLook')return[target('room','침실로 들어간다',552,62,85,232,585,320,()=>{G.intro='routine';moveRoom('bedroom');say([{who:'나',text:'이제 자야 할 시간이다. 너무 고된 하루였어.'}]);})];
 if(G.intro==='routine')return[target('bed','잠자리에 눕는다',10,210,190,125,180,315,()=>beginSleep(true))];if(G.intro)return[];
 if(G.scene==='station')return G.trainX<=20?[target('board','열차에 탄다',250,130,160,190,330,322,boardTrain)]:[];
 if(G.scene==='train')return[];
 if(G.scene==='office'){
  T.push(target('lead',G.officeDone?'팀장에게 인사한다':'팀장에게 말을 건다',410,135,70,170,390,315,()=>talk('lead')),target('peer','동료에게 말을 건다',140,155,80,155,245,315,()=>talk('peer')));
  if(!G.officeDone)T.push(target('desk','내 자리에서 일한다',280,202,108,105,330,316,()=>G.officeTalk.lead?startWork():talk('lead')));
  if(G.officeDone)T.push(target('exit','퇴근한다',550,80,80,250,575,320,()=>enterShop('general','commute')));return T;
 }
 if(G.scene==='bedroom'){
  T.push(target('room','부엌으로 나간다',500,65,130,265,558,315,()=>moveRoom('living')),target('bed',s.phase==='morning'?'이불을 편다':'잠자리에 눕는다',10,215,185,115,180,315,s.phase==='morning'?makeBed:bedtime),target('clothes',s.phase==='morning'?'출근복을 입는다':'옷을 걸어 둔다',375,120,105,150,435,315,()=>s.phase==='morning'?dress():act('storeSuit')));
  if(!weekend()&&(s.phase==='morning'||!s.bagPacked))T.push(target('bag',s.hasBag?'가방을 들고 있다':s.bagPacked?'가방을 집는다':'가방을 챙긴다',485,275,65,65,510,323,packBag));
  if(s.phase==='evening'&&s.day===0&&!s.bagPacked)T.push(target('desk','내일 들고 갈 가방을 챙긴다',225,165,150,110,310,315,()=>startMini('bag')));
  if(s.roller.owned&&s.phase==='morning'&&s.dressed&&s.fur)T.push(target('roller','옷에 붙은 털을 뗀다',440,248,45,55,455,320,()=>startMini('roller')));
 }else{
  T.push(target('room','침실로 들어간다',552,62,85,232,585,320,()=>moveRoom('bedroom')),target('food','밥그릇을 채운다',525,290,90,55,550,325,feedChoice),target('water','물그릇을 씻고 물을 담는다',468,295,60,50,490,325,()=>startMini('water')),target('litter','모래를 삽으로 청소한다',130,255,95,80,180,323,()=>startMini('litter')),target('cat','고양이를 쓰다듬는다',G.cat.x-32,G.cat.y-45,70,45,clamp(G.cat.x-30,45,595),323,()=>startMini('pet')));
  if(s.phase==='morning')T.push(target('toy','쥐 인형으로 논다',330,298,75,49,360,325,()=>startMini('play')),target('exit','신발을 신고 출근한다',20,45,110,285,80,320,leaveHome));
  else{
   T.push(target('toy','쥐 인형으로 '+Life.josa(s.cat,'with')+' 논다',330,298,75,49,360,325,()=>startMini('play')),target('rest','소파에서 쉰다 · '+Life.formatTime(s.minute+30),410,180,175,115,450,315,rest));
   if(!s.hoodie&&s.flags.hoodieEvent)T.push(target('hoodie','후드티로 '+s.cat+' 자리를 만든다',455,255,100,55,500,325,()=>{if(act('hoodie').ok)save();}));
   if(weekend()&&s.minute<1080)T.push(target('afternoon','낮을 느긋하게 보내고 저녁으로',410,55,180,120,455,315,()=>{act('afternoon',{},true);say([{who:'',text:'창가에서 '+Life.josa(s.cat,'with')+' 쉬고 밀린 집안일을 하다 보니 해가 기울었다. 저녁 밥을 챙길 시간이다.'}]);}));
   if(weekend()&&!s.done.laundry&&s.clothesFur.hoodie>0)T.push(target('laundry','빨래를 모은다',235,260,85,80,275,323,()=>{const r=act('laundry',{},true);say([{who:'',text:r.message}]);}));
   if(weekend()&&!s.done.dishes&&s.flags.dirtyDishes>0)T.push(target('dishes','밀린 설거지를 한다',205,140,175,105,290,320,()=>{const r=act('dishes',{},true);say([{who:'',text:r.message}]);}));
   if(isStorm()&&!G.curtainClosed)T.push(target('curtain','흔들리는 창문을 닫는다',410,55,180,140,570,315,()=>startMini('curtain')));
  }
 }if(G.scene==='living'&&s.phase!=='morning')T.push(target('shop','슈퍼에 다녀온다',20,45,110,240,80,320,()=>enterShop('general','home')));return T.filter(t=>!(t.id==='food'&&s.needs.fed)&&!(t.id==='water'&&s.waterChangedDay===s.day)&&!(t.id==='litter'&&s.litterDirty===0)&&!(t.id==='toy'&&s.needs.played));
}
function desired(){
 if(G.endingMoment)return{id:G.finalEnding.key==='worn'?'endrest':['distance','neglected'].includes(G.finalEnding.key)?'endwater':'endcat',text:''};
 if(G.catControl)return{id:G.catStage==='openDoor'?'catopen':G.catStage==='door'?'catdoor':G.catStage==='toy'?'cattoy':'catscent',text:''};
 if(G.intro)return{id:({meet:'kitten',sheltered:'home',firstFeed:'food',firstWater:'water',hoodie:'pet',furLook:'room',routine:'bed'})[G.intro],text:''};
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
function key(e,down){if(e.target.matches('input,textarea'))return;const k=e.key.toLowerCase();if(k==='escape'&&down){if(G.paused)resumePlay();else if(G.menu&&!$('phoneClose').hidden)closePhone();else if(G.mini)exitMini();else openPause();return;}if(G.paused)return;if(G.black){if(down&&!e.repeat&&(k===' '||k==='enter')){e.preventDefault();advanceBlack();}return;}if(G.mini?.type==='bed'&&down&&!e.repeat){if(k==='arrowleft'||k==='arrowright'){e.preventDefault();G.mini.door=k==='arrowright'?1:0;G.mini.decided=true;G.mini.confirm.disabled=false;return;}}if(G.dialog){if(down&&!e.repeat&&(k===' '||k==='enter')){e.preventDefault();advanceDialogue();}return;}if(!['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(k))return;e.preventDefault();G.keys[k]=down;}
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
$('nameForm').onsubmit=e=>{e.preventDefault();G.s.cat=$('catName').value.trim().slice(0,8)||'보리';$('naming').hidden=true;G.intro='firstFeed';say([{who:'나',text:Life.josa(G.s.cat,'call')+'. 우선 밥부터 먹자.'}],()=>save());};
function blackLines(lines,done,index=0){G.black={lines,index,count:0,elapsed:0,last:G.now,done};G.blackIndex=index;$('blackScreen').hidden=false;$('blackText').textContent='';G.keys={};}
function advanceBlack(){const b=G.black;if(!b||G.now-b.last<.3)return;b.last=G.now;const line=b.lines[b.index];if(b.count<line.length){b.count=line.length;b.elapsed=line.length/25;$('blackText').textContent=line;return;}if(b.index+1<b.lines.length){b.index++;G.blackIndex=b.index;b.count=0;b.elapsed=0;$('blackText').textContent='';save();}else{G.black=null;$('blackScreen').hidden=true;b.done();}}
$('blackScreen').onclick=advanceBlack;
function rejectionBed(){G.intro='bedPhone';G.sleeping=true;setScene('bedroom',220);G.cat.x=700;G.phoneKind='rejection';noise(.25,.015);$('phoneButton').hidden=false;notice('베개 옆 휴대폰이 진동했다.',5);save();}
function rejected(){say([{who:'나',text:'떨어졌구나. 하하…'},{who:'나',text:'그래, 내가 그럼 그렇지.'},{who:'나',text:'나도 할 만큼 했어. 더 이상은…'}],()=>fade(()=>{G.intro='meet';setScene('street',110);G.cat.x=440;say([{who:'',text:'슈퍼 앞에서 작은 울음소리가 들렸다.'}]);save();}));}
function startMontage(){
 G.catControl=false;G.sleeping=false;G.intro='montage';G.montageAt=G.now;setScene('living',330);
 const index=G.s.winterStep;
 if(index>=3){G.intro='spring';blackLines(['혹독한 계절이 지나고…','그다음 해 봄.'],()=>{G.intro='offer';setScene('bedroom',220);G.phoneKind='offer';notice('휴대폰에 새 문자가 도착했다.',5);save();});return;}
 const entry=Life.winter[index];blackLines([entry.month+' · 아침에는 단기 일터로 향했다.'],()=>{
  setScene('office',330);G.workMontage={start:G.now,duration:2};later(2,()=>{G.workMontage=null;const r=Life.winterShift(G.s,index);G.shopMode='winter';setScene('shop',320);say([{who:'',text:r.message},{who:'',text:'돌아오는 길에 사료를 샀다. 집에서는 밥을 주고, 바닥에 앉아 장난감을 흔들었다.'}],()=>{G.montageAt=G.now;setScene('living',330);G.cat.x=390;G.cat.pose='sleep';say([{who:'나',text:Life.josa(G.s.cat,'call')+', 내일도 다녀올게.'}],()=>{save();startMontage();});});});
 });
}
function employed(){
 G.s.flags.employed=true;G.s.phase='evening';G.s.minute=1200;G.s.day=0;G.s.needs={fed:false,played:false,comfort:false};G.s.meals={morning:false,evening:false};G.s.done={};G.s.waterChangedDay=null;G.s.waterLevel=0;G.s.suitStored=true;G.s.clothesFur.suit=0;G.s.bagPacked=false;G.intro='';G.doorOpen=G.s.doorOpen=true;G.catOnBed=false;setScene('living',220);G.cat.x=430;
 say([{who:'나',text:'드디어 내일 첫 출근이다.'},{who:'나',text:'노트북이랑 충전기부터 챙겨 두자.'}],()=>{G.s.flags.routineIntroduced=true;G.selectedGuide={id:'bag',room:'bedroom',text:''};save();});
}

function moveRoom(room){fade(()=>{setScene(room,room==='living'?570:520);G.cat.x=room==='living'?(G.s.hoodie?510:430):460;G.cat.y=323;save();});}
function makeBed(){if(G.s.bedMade)return;const r=act('makeBed',{},true);if(r.ok){G.bedStraightenedAt=G.now;G.lockedUntil=G.now+.8;notice('구겨진 이불을 폈다.');}}
function dress(){if(act('dress',{},true).ok){G.dressed=true;if(G.doorOpen&&!G.s.hoodie){G.s.clothesFur.suit=Math.min(16,G.s.clothesFur.suit+6);G.s.fur=G.s.clothesFur.suit;G.cat.x=G.hero.x+20;say([{who:'',text:Life.josa(G.s.cat,'subject')+' 다리에 얼굴을 비볐다. 정장 바지에 주황색 털이 붙었다.'}]);}else notice('행거에서 정장을 꺼내 입었다.');save();}}
function packBag(){if(G.s.hasBag){notice('가방을 들고 있다.');return;}if(!G.s.bagPacked)startMini('bag');else if(G.s.phase==='morning')act('pickBag');else notice('노트북과 충전기를 챙겨 두었다.');}
function rest(){if(act('rest').ok){G.restAt=G.now;G.lockedUntil=G.now+2;later(2,()=>{G.restAt=null;notice('어깨에서 힘이 풀린다.');});}}
function leaveHome(borrow=false){
 const s=G.s;
 if(!G.departureCareConfirmed&&(!s.needs.fed||!s.water)){const what=!s.needs.fed?'밥그릇이 비어 있다.':'물그릇이 비어 있다.';ack(what+' '+Life.josa(G.s.cat,'subject')+' 현관까지 따라왔다.',[{text:'먼저 챙긴다',run:()=>{G.selectedGuide={id:!s.needs.fed?'food':'water',text:''};}},{text:'오늘은 그냥 나간다',run:()=>{G.departureCareConfirmed=true;leaveHome(borrow);}}]);return;}
 const r=act('leaveHome',{borrowLaptop:borrow},true);if(!r.ok){if(r.reason==='noBag')ack('노트북 가방을 놓고 나가려 한다. 회사에서 빌리면 오늘 일이 밀린다.',[{text:'가방을 챙긴다',run:()=>moveRoom('bedroom')},{text:'오늘은 빌린다',run:()=>leaveHome(true)}]);else ack(r.message);return;}G.departureCareConfirmed=false;commute('work');
}
function commute(direction){G.commute=direction;G.guide=null;if(!(G.s.day===1&&direction==='work')){direction==='work'?enterOffice():arriveHome();return;}fade(()=>{setScene('station',85);G.trainX=680;G.stationAt=G.now;});}
function boardTrain(){if(G.scene!=='station')return;fade(()=>{setScene('train',200);later(2,enterOffice);},.35);}
function enterOffice(){fade(()=>{setScene('office',565);G.s.phase='work';G.officeTalk={};G.officeDone=G.s.work.some(w=>w.day===G.s.day);G.officeFeedback=G.officeDone;G.dressed=true;if(G.s.flags.borrowedLaptop)notice('노트북을 빌려 연결하는 동안 동료들은 일을 시작했다. 오늘은 퇴근이 늦어진다.',6);else if(G.s.flags.lateMinutes)notice('늦게 도착해 밀린 일부터 시작한다.',5);updateUI();save();});}
function talk(role){
 if(role==='lead'&&G.officeDone){say(LifeStory.workReport(G.s),()=>save());return;}
 if(role==='lead'&&G.officeTalk.lead){say([{who:'팀장',text:'오늘 맡은 일은 어느 정도 됐어요?'}],null,[{text:'이어서 할게요',run:()=>{}},{text:'상담을 남기고 정산한다',run:settleWork}]);return;}
 G.officeTalk[role]=true;say(LifeStory.dialogue(G.s,role),()=>{if(role==='peer'&&G.s.day>=1&&G.s.fur>0)G.s.flags.peerKnowsCat=true;save();});
}
function startWork(){
 const list=LifeStory.customers(G.s),done=G.s.consultations.filter(c=>c.day===G.s.day),pending=list.find(c=>!done.some(x=>x.id===c.id));
 if(!pending){settleWork();return;}
 if(pending.optional){say([{who:'팀장',text:'예약 상담은 끝났어요. 추가 상담을 받으면 수당이 늘고, 귀가는 한 시간 늦어집니다.'}],null,[{text:'추가 고객을 만난다 · 퇴근 19:00',run:()=>consult(pending)},{text:'오늘 상담을 정산한다 · 퇴근 18:00',run:settleWork}]);return;}
 consult(pending);
}
function consult(customer){
 const r=Life.beginConsultation(G.s,customer);if(!r.ok)return;G.consultation={...customer,stage:G.s.currentConsultation?.step||0};G.hero.pose='sit';
 const c=G.s.currentConsultation,step=c.step;
 const prompt=step===0?[customer.need,customer.question]:[customer.follow];
 say(prompt.map(text=>({who:customer.name,text})),null,(step===0?customer.options:customer.answers).map((text,i)=>({text,run:()=>{
  const answer=Life.answerConsultation(G.s,i);save();if(!answer.consultation.completed){consult(customer);return;}
  G.workProgress=0;G.workMontage={start:G.now,duration:1.5};later(1.5,()=>{G.workMontage=null;G.hero.pose='stand';const row=answer.consultation;say([{who:customer.name,text:row.contract?'이 조건이면 괜찮겠어요. 계약할게요.':'오늘은 계약을 보류할게요.'},{who:'',text:row.reasons.join(' ')}],()=>{G.consultation=null;save();});});
 }})));
}
function settleWork(){const r=Life.finishWork(G.s);if(!r.ok){notice(r.message);return;}G.officeDone=true;G.officeFeedback=true;G.hero.pose='stand';const w=r.work;G.s.flags.reportShown=true;say([{who:'',text:'퇴근 정산 · 상담 '+w.consultations+'건 / 계약 '+w.contracts+'건'},{who:'',text:'오늘 입금 '+w.income.toLocaleString()+'원 · 잔액 '+G.s.cash.toLocaleString()+'원'},...w.reasons.map(text=>({who:'',text})),{who:'',text:w.missing?'미완료 상담 '+w.missing+'건은 지급되지 않았다.':'상담 수당과 계약 수당이 계좌에 들어왔다.'}],()=>{save();updateUI();});}
function completeWork(){settleWork();}
function arriveHome(){fade(()=>{Life.arriveHome(G.s);G.dressed=false;G.catOnBed=false;G.curtainClosed=G.s.curtainClosed;G.selectedGuide=null;setScene('living',150);G.cat.x=isStorm()?587:365;G.cat.y=323;const lines=[{who:'',text:LifeStory.homeLine(G.s)},{who:'',text:'교통·식비·주거비 적립 '+(G.s.flags.lastLivingCost||0).toLocaleString()+'원 · 남은 생활비 '+G.s.cash.toLocaleString()+'원'}];
 if(G.s.day===4&&!G.s.hoodie){G.s.flags.hoodieEvent=true;lines.push({who:'',text:Life.josa(G.s.cat,'subject')+' 벗어 둔 후드티 위에서 졸고 있다.'},{who:'나',text:'소파 옆에 이 옷을 펴 두면 어떨까. 내 냄새가 나서 편한가 봐.'});}
 say(lines,()=>save());save();});}

function feedChoice(){if(G.s.needs.fed){notice('밥그릇에 사료가 남아 있다.');return;}if(!G.s.food){enterShop('general','home');return;}if(G.s.favoriteFood>0&&G.s.food>G.s.favoriteFood)ack('오늘은 무엇을 줄까?',[{text:'건사료',run:()=>startMini('feed',{foodKind:'normal'})},{text:'닭고기 습식',run:()=>startMini('feed',{foodKind:'favorite'})}]);else startMini('feed',{foodKind:G.s.favoriteFood?'favorite':'normal'});}
function bedtime(){if(G.s.phase!=='evening')return;const missing=[];if(!G.s.needs.fed)missing.push('밥그릇');if(!G.s.water)missing.push('물그릇');if(missing.length)ack(missing.join('과 ')+'이 비어 있다. '+Life.josa(G.s.cat,'subject')+' 그 앞에 앉아 기다린다.',[{text:'챙기고 잔다',run:()=>moveRoom('living')},{text:'오늘은 그대로 잔다',run:()=>startMini('bed')}]);else startMini('bed');}
function beginSleep(open){
 const intro=G.intro==='routine';if(intro)open=true;G.doorOpen=G.s.doorOpen=open;G.lastSleepDay=G.s.day;G.sleeping=true;G.catOnBed=false;G.hero.pose='sleep';if(!intro)G.s.minute=Math.max(1320,G.s.minute);G.mini=null;hideMini();G.lockedUntil=G.now+.2;if(!intro&&!open){$('reopenDoor').hidden=false;$('reopenDoor').onclick=()=>{G.doorOpen=G.s.doorOpen=true;$('reopenDoor').hidden=true;G.cat.x=300;G.bedApproach=true;};}G.cat.x=open?300:510;G.cat.y=323;if(open)G.bedApproach=true;
 later(3.6,()=>{open=G.doorOpen;$('reopenDoor').hidden=true;G.sleeping=false;G.bedApproach=false;G.jump=null;if(intro){G.s.clothesFur.hoodie=Math.min(16,G.s.clothesFur.hoodie+6);G.s.fur=G.s.clothesFur.hoodie;if(!open){G.introClosed=true;G.s.flags.introClosed=true;catPerspective(0);}else startMontage();return;}const day=G.s.day,r=Life.sleep(G.s,open);if(G.s.phase==='ending'){playEnding();return;}if((day===0||day===4)&&!G.s.flags['catView'+day]){G.s.flags['catView'+day]=true;G.pendingNight=r.night;catPerspective(day);return;}if(r.night?.wakeReasons?.length)nightWake(r.night);else morning();});
}
function nightWake(night){
 G.nightScene=true;G.nightData=night;G.catOnBed=false;const reason=night.wakeReasons[0];fade(()=>{
  setScene('living',250);G.cat.x=reason==='hunger'?565:reason==='thirst'?515:reason==='calling'?600:355;G.cat.y=323;G.cat.pose='sit';
  const lines={hunger:'그릇을 긁는 소리에 깼다. 불을 켜니 밥그릇이 비어 있다.',thirst:Life.josa(G.s.cat,'subject')+' 빈 물그릇을 핥고 있다.',rain:'창문이 덜컹거리자 '+Life.josa(G.s.cat,'subject')+' 소파 뒤로 숨었다.',play:Life.josa(G.s.cat,'subject')+' 장난감을 물고 방 안을 뛰어다닌다.',calling:'문 앞에서 '+Life.josa(G.s.cat,'subject')+' 발로 문을 긁고 운다.',litter:Life.josa(G.s.cat,'subject')+' 더러운 모래통 앞을 서성인다.'};
  const speech=[{who:'',text:lines[reason]}];if(night.wakeReasons.includes('play'))speech.push({who:'나',text:'오늘 못 놀아 줘서 아직 힘이 남았나 봐.'});
  const hunger=night.wakeReasons.includes('hunger'),thirst=night.wakeReasons.includes('thirst');
  say(speech,null,[{text:hunger?'지금 밥을 챙긴다':thirst?'물을 담아 준다':reason==='litter'?'모래를 청소한다':'곁에서 잠깐 기다린다',run:()=>{
   if(hunger&&!G.s.food){say([{who:'나',text:'봉지가 비었다. 아침에는 슈퍼부터 다녀와야겠다.'}],backToSleep);return;}
   if(hunger||thirst)startMini(hunger?'feed':'water',{night:true});else if(reason==='litter'){const r=Life.actAtNight(G.s,'litter');say([{who:'',text:r.message}],backToSleep);}else{G.restAt=G.now;later(1,()=>{G.restAt=null;backToSleep();});}
  }},{text:'다시 눕는다',run:backToSleep}]);save();
 });
}
function backToSleep(){G.nightScene=true;fade(()=>{setScene('bedroom',210);G.sleeping=true;G.catOnBed=false;later(1.8,()=>{G.sleeping=false;G.nightScene=false;G.nightData=null;morning();});});}
function catPerspective(day){fade(()=>{G.catControl=true;G.catStage=G.doorOpen?'openDoor':day===4&&G.s.hoodie?'scent':'door';G.catOldDay=day;G.carried=null;G.cameraAt=G.now;setScene('living',600);G.cat.x=580;G.cat.y=324;G.hero.pose='sleep';G.catOnBed=false;save();});}
function catDoorTry(){G.catStage='toy';tone(520,.14);notice('문 안에서 이불이 움직였다. 문은 열리지 않는다.');}
function catPickToy(){G.carried='toy';tone(900,.05);}
function catLeaveToy(){G.carried=null;G.s.flags.toyAtDoor=true;G.cat.pose='sleep';G.lockedUntil=G.now+1.5;later(1.5,endCat);}
function catNest(){G.cat.pose='sleep';G.s.flags.catUsedHoodie=true;G.lockedUntil=G.now+2;later(2,endCat);}
function endCat(){G.catControl=false;G.carried=null;if(G.introClosed||G.s.flags.introClosed){G.introClosed=false;delete G.s.flags.introClosed;startMontage();return;}const night=G.pendingNight;G.pendingNight=null;if(night?.wakeReasons.length)nightWake(night);else morning();}
function morning(){fade(()=>{Life.finishNight(G.s);G.nightScene=false;G.nightPlaying=false;G.catControl=false;G.sleeping=false;G.catOnBed=false;G.doorOpen=G.s.doorOpen;G.curtainClosed=G.s.curtainClosed;G.dressed=false;G.hero.pose='stand';G.selectedGuide=null;G.departureCareConfirmed=false;setScene('bedroom',230);G.cat.x=510;G.cat.y=323;if(weekend()){Life.arriveHome(G.s);G.doorOpen=G.s.doorOpen;notice('오늘은 출근하지 않는다. 아침 밥을 챙기고 천천히 하루를 보내자.',5);}else if(G.s.flags.toyAtDoor&&!G.s.flags.toyDiscovered){G.s.flags.toyDiscovered=true;ack('방문 앞에 쥐 인형이 놓여 있다. 밤에 '+Life.josa(G.s.cat,'subject')+' 가져온 모양이다.');}else if(G.s.flags.catOpenTrace&&!G.s.flags.openTraceSeen){G.s.flags.openTraceSeen=true;say([{who:'',text:'이불 끝에 주황색 털이 남았다. 밤에는 작은 발소리가 문을 지나왔다.'}]);}else notice(G.s.energy<=1?'알람을 두 번 끄고서야 일어났다. 몸이 무겁다.':'알람이 울렸다. '+Life.josa(G.s.cat,'subject')+' 문 밖에서 기다린다.',5);updateUI();save();});}
function playEnding(){
 G.endingPlayback=true;G.sleeping=false;G.mini=null;hideMini();G.catControl=false;G.nightScene=false;rainAudio(false);G.finalEnding=Life.ending(G.s);G.endingKey=G.finalEnding.key;
 say(G.finalEnding.lines.slice(0,2).map(text=>({who:'',text})),()=>{G.endingPlayback=false;G.s.flags.finalShop=true;G.shopMode='final';G.shopReturn='final';fade(()=>{setScene('shop',320);say([{who:'나',text:'처음엔 만이천 원이 전부였는데. 다음 주 사료도 여기서 고르고 가자.'}]);save();});});
}
function finalDoor(){G.endingPlayback=true;fade(()=>{setScene('bedroom',220);G.doorOpen=G.s.doorOpen;say([{who:'',text:G.finalEnding.lines[2]}],()=>{G.endingPlayback=false;startMini('bed',{final:true});});});}

function showEnding(){G.mode='ending';G.endingPlayback=false;G.endingMoment=false;G.sleeping=false;const end=G.finalEnding||Life.ending(G.s);G.endingKey=end.key;$('gameScreen').hidden=true;$('endingTitle').textContent=end.title;$('endingText').replaceChildren();const q=Life.summary(G.s);for(const line of ['근무 상담 '+q.consultations+'건 · 계약 '+q.contracts+'건','매일 받은 근무 수입 '+q.earned.toLocaleString()+'원','프롤로그부터 총수입 '+q.income.toLocaleString()+'원 · 총지출 '+q.spent.toLocaleString()+'원','남은 생활비 '+q.balance.toLocaleString()+'원',end.lines.at(-1)])addText($('endingText'),'p',line);$('endingScreen').hidden=false;try{localStorage.setItem(SAVE_KEY,JSON.stringify({finished:true}));}catch(_){}}
function startMini(type,opts={}){
 if(G.mini||G.dialog||G.ack||G.workMontage)return;const s=G.s;
 if(type==='prepare')type='bag';
 if(['laundry','arrange','dishes'].includes(type)&&s.phase==='morning'){notice('출근 준비를 하고 나갈 시간이다.');return;}
 if(type==='water'&&s.waterChangedDay===s.day&&!opts.night&&!opts.ending){notice('물그릇에 깨끗한 물이 있다.');return;}
 if(type==='roller'&&(!s.roller.owned||!s.fur)){notice(s.roller.owned?'옷이 깨끗하다.':'돌돌이는 슈퍼에서 살 수 있다.');return;}
 if(type==='play'&&s.needs.played){notice(Life.josa(G.s.cat,'subject')+' 장난감을 끌어안고 쉬고 있다.');return;}
 if(!G.intro&&!opts.night&&['feed','water','litter'].includes(type)&&s.flags['learned:'+type]){const r=act(type,{},true);say([{who:'',text:r.message}]);save();return;}
 const labels={litter:['모래 청소','삽을 누른 채 뭉친 모래 위로 옮긴다.'],feed:['밥 주기','사료 봉지를 그릇 위로 끌어 놓는다.'],water:['물 갈기','물병을 그릇 위로 끌어 놓는다.'],play:[Life.josa(s.cat,'with')+' 놀기','쥐 인형을 끌어 움직였다가 '+Life.josa(G.s.cat,'subject')+' 잡을 수 있게 멈춘다.'],bag:['가방 챙기기','노트북과 충전기를 가방에 넣는다.'],curtain:['창문 닫기','커튼을 끝까지 당겨 닫는다.'],roller:['옷에 붙은 털 떼기','돌돌이를 잡고 털 위로 굴린다.'],bed:['방문',s.flags.doorLearned?'':'왼쪽으로 닫고, 오른쪽으로 연다. 방향키로도 움직일 수 있다.'],umbrella:['우산','우산 손잡이를 잡고 고양이 쪽으로 옮긴다.'],pet:['쓰다듬기','손을 누른 채 고양이 등 위를 천천히 여러 번 쓸어 준다.']};
 const m=G.mini={type,start:G.now,drag:null,p:{x:180,y:170},pointer:{x:330,y:235},progress:0,moved:0,lastMove:G.now,lastP:null,complete:false,down:false,catX:320,catY:285,cards:[],slots:[],items:[],fur:[],door:G.doorOpen?1:0,decided:true,...opts};
 if(type==='litter'){m.p={x:160,y:160};m.clumps=Array.from({length:s.litterDirty},(_,i)=>({x:245+(i%4)*48,y:185+Math.floor(i/4)*38,removed:false}));}
 if(type==='umbrella')m.p={x:190,y:150};
 if(type==='roller'){m.p={x:155,y:155};m.fur=Array.from({length:s.fur},(_,i)=>({...LifeView.rollerFur(i),on:true}));}
 if(type==='bag')m.items=[{id:'laptop',type:'laptop',x:145,y:150,placed:false},{id:'charger',type:'charger',x:260,y:150,placed:false}];
 G.goal=null;G.pending=null;G.keys={};G.guide=null;$('minigameBar').hidden=false;$('miniLabel').textContent=labels[type][0];$('miniHint').textContent=labels[type][1]+(!G.intro&&Life.duration(s,type)?' · 마치면 '+Life.formatTime(s.minute+Life.duration(s,type)): '');
 $('miniExit').hidden=type==='umbrella';$('miniExit').textContent=type==='bed'?'↩':'돌아가기';$('miniExit').setAttribute('aria-label','돌아가기');$('miniActions').replaceChildren();$('miniActions').hidden=true;$('taskSource').replaceChildren();$('taskSource').hidden=true;
 if(type==='bed'){m.confirm=button($('miniActions'),'이대로 잠들기',()=>sleepChoice(m.door===1));m.confirm.disabled=false;s.flags.doorLearned=true;$('miniActions').hidden=false;}

 if(type!=='bed'){
  const access=button($('miniActions'),'키보드로 '+labels[type][0],()=>{
   if(m.complete)return;
   if(['feed','water'].includes(type)){m.p={x:385,y:155};m.placed=true;}
   else if(type==='bag'){for(const item of m.items)item.placed=true;finishMini(()=>{act('packBag',{},true);if(s.phase==='morning')act('pickBag',{},true);notice('노트북과 충전기를 넣고 가방을 닫았다.');});}
   else if(type==='play'){m.pointer={x:440,y:240};m.hasMoved=true;m.lastMove=G.now-.4;}
   else if(type==='pet'){m.down=true;m.drag='hand';m.start=G.now-2;m.lastP={x:280,y:235};m.moved=260;miniMove({x:430,y:235});}
   else if(type==='roller'){act('startRoller',{},true);act('roll',{amount:s.fur},true);m.fur.forEach(f=>f.on=false);}
   else if(type==='litter'){m.clumps.forEach(c=>c.removed=true);finishMini(()=>{const r=act('litter',{},true);s.flags['learned:litter']=true;say([{who:'',text:r.message}]);});}
   else if(type==='curtain'){m.progress=1;miniUp({x:560,y:170});}
   else if(type==='umbrella'){m.p={x:320,y:150};miniUp({x:320,y:150});}
  });access.className='keyboard-action';$('miniActions').hidden=false;
 }
 updateUI();
}
function hideMini(){$('minigameBar').hidden=true;$('miniActions').hidden=true;$('taskSource').hidden=true;}
function exitMini(){if(!G.mini||G.mini.complete)return;if(G.mini.type==='roller')act('stopRoller',{},true);G.mini=null;hideMini();G.lockedUntil=G.now+.3;updateUI();save();}
$('miniExit').onclick=exitMini;
function finishMini(fn,wait=1){const m=G.mini;if(!m||m.complete)return;m.complete=true;G.lockedUntil=G.now+wait;later(wait,()=>{G.mini=null;hideMini();fn?.();updateUI();save();});}
function sleepChoice(open){const m=G.mini;if(!m||m.type!=='bed'||!m.decided||m.complete)return;m.complete=true;G.doorOpen=open;G.lockedUntil=G.now+.8;if(m.final){G.s.doorOpen=open;if(G.s.lastNight)G.s.lastNight.open=open;G.finalEnding=Life.ending(G.s);G.mini=null;hideMini();G.sleeping=true;G.catOnBed=false;G.cat.x=300;G.cat.y=323;G.bedApproach=open;later(2,()=>{G.sleeping=false;G.bedApproach=false;G.jump=null;say([{who:'',text:G.finalEnding.lines.at(-1)}],showEnding);});return;}later(.8,()=>beginSleep(open));}
function miniDown(p){const m=G.mini;if(!m||m.complete)return;m.down=true;if(m.type!=='play')m.pointer=p;m.lastP=p;m.downAt=G.now;m.downP=p;
 if(['feed','water','roller','umbrella','litter'].includes(m.type)){m.drag='tool';m.offset={x:p.x-m.p.x,y:p.y-m.p.y};}
 if(m.type==='bed'&&p.x>395&&p.x<590&&p.y>55&&p.y<310)m.drag='door';
 if(m.type==='pet')m.drag='hand';if(m.type==='play'){m.hasMoved=false;m.drag='toy';m.offset={x:p.x-m.pointer.x,y:p.y-m.pointer.y};}if(m.type==='dishes')m.drag='sponge';if(m.type==='curtain')m.drag='curtain';
 const card=m.cards.slice().reverse().find(c=>p.x>c.x&&p.x<c.x+c.w&&p.y>c.y&&p.y<c.y+c.h);if(card){for(const slot of m.slots)if(slot.cardId===card.id)slot.cardId=null;card.placed=false;m.drag=card;m.offset={x:p.x-card.x,y:p.y-card.y};}
 if(m.type!=='dishes'){const item=m.items.find(a=>!a.placed&&Math.hypot(a.x-p.x,a.y-p.y)<55);if(item){m.drag=item;m.offset={x:p.x-item.x,y:p.y-item.y};}}
}
function miniMove(p){const m=G.mini;if(!m||m.complete)return;const delta=m.lastP?dist(p,m.lastP):0;if(m.type!=='play')m.pointer=p;
 if(m.type==='play'){if(m.down&&delta>3){m.pointer={x:clamp(p.x-(m.offset?.x||0),100,545),y:clamp(p.y-(m.offset?.y||0),190,280)};m.hasMoved=true;m.moved+=delta;m.lastMove=G.now;}m.lastP=p;return;}
 if(!m.down)return;
 if(m.drag==='tool'){m.p={x:p.x-m.offset.x,y:p.y-m.offset.y};if(m.type==='litter'){for(const clump of m.clumps)if(!clump.removed&&dist(m.p,clump)<35)clump.removed=true;if(m.clumps.every(c=>c.removed))finishMini(()=>{const r=act('litter',{},true);G.s.flags['learned:litter']=true;say([{who:'',text:r.message}]);},.8);}
 if(m.type==='roller'){const hits=m.fur.filter(f=>f.on&&Math.abs(f.x-m.p.x)<35&&Math.abs(f.y-m.p.y)<21);if(hits.length){if(!m.used){if(!act('startRoller',{},true).ok)return;m.used=true;}const r=act('roll',{amount:hits.length},true);if(r.ok){hits.slice(0,r.removed).forEach(f=>f.on=false);tone(210,.03,'sawtooth',.008);}}}}
 if(m.drag&&typeof m.drag==='object'){m.drag.x=p.x-(m.offset?.x||0);m.drag.y=p.y-(m.offset?.y||0);}
 if(m.drag==='door'){m.door=clamp((p.x-430)/120,0,1);m.moved+=delta;}
 if(m.drag==='curtain')m.progress=clamp((p.x-400)/160,0,1);
 if(m.drag==='sponge'){for(const plate of m.items)if(dist(p,plate)<50)plate.clean=Math.min(1,plate.clean+delta/180);if(m.items.every(plate=>plate.clean>=1))finishMini(()=>act('dishes'),1.4);}
 if(m.drag==='hand'&&p.x>240&&p.x<470&&p.y>165&&p.y<300){m.moved+=Math.min(delta,35);m.lastMove=G.now;m.progress=Math.min(1,m.moved/260);if(m.moved>=260&&G.now-m.start>1.8)finishMini(()=>{const r=act('pet',{},true);if(G.intro==='hoodie'){G.intro='furLook';G.s.flags.introFur=true;G.s.flags.petFurToday=true;G.cat.pose='purr';say([{who:'나',text:'후드티에 털이 잔뜩 붙었네.'},{who:'나',text:'졸려? 이제 자러 가자.'}]);}else say([{who:'',text:r.message}]);
},1.6);}
 m.lastP=p;
}
function miniUp(p){const m=G.mini;if(!m||m.complete)return;m.down=false;
 if(['feed','water'].includes(m.type)&&Math.abs(p.x-385)<100&&p.y>100&&p.y<340){m.p={x:353,y:155};m.placed=true;}
 if(m.drag==='door'){if(m.moved>=25){m.door=m.door>.5?1:0;m.decided=true;m.confirm.disabled=false;m.confirm.textContent='이대로 잠들기';tone(m.door?480:200,.1);}else m.door=G.doorOpen?1:0;}
 if(m.cards.includes(m.drag)){const card=m.drag,slot=m.slots.find(s=>p.x>s.x&&p.x<s.x+s.w&&p.y>s.y&&p.y<s.y+s.h);if(slot&&m.task.solution[slot.id]===card.id){const old=m.cards.find(a=>a.id===slot.cardId);if(old){old.x=old.homeX;old.y=95;old.placed=false;}slot.cardId=card.id;card.x=slot.x+3;card.y=slot.y+4;card.placed=true;tone(500,.05);$('miniHint').textContent='같은 날짜의 폴더에 넣었다.';}else{card.x=card.homeX;card.y=95;card.placed=false;card.wrong=G.now+1;$('miniHint').textContent='파일 이름 끝의 날짜를 다시 보자.';tone(170,.08);}m.confirm.disabled=!m.slots.every(s=>s.cardId===m.task.solution[s.id]);}
 if(m.items.includes(m.drag)&&m.type!=='dishes'){
  const item=m.drag;if(m.type==='bag'){if(p.x>400&&p.x<565&&p.y>160&&p.y<310){item.placed=true;item.x=455;item.y=245;tone(520,.06);}else{item.x=({laptop:145,charger:260,notebook:350})[item.id];item.y=150;}if(m.items.every(a=>a.placed))finishMini(()=>{act('packBag',{},true);if(G.s.phase==='morning')act('pickBag',{},true);notice('노트북과 충전기를 넣고 가방을 닫았다.',5);},1.2);}
  else{let action=null;if(m.type==='laundry'&&p.x>395&&p.y>215){m.items=m.items.filter(a=>a!==item);if(!m.items.length)finishMini(()=>act('laundry'),1.5);}else{if(item.type==='suit'&&p.x>440&&p.y<245)action='storeSuit';if(item.type==='hoodie'&&p.x>395&&p.y>245)action='hoodie';if(action&&act(action).ok)m.items=m.items.filter(a=>a!==item);if(!m.items.length)finishMini(()=>{},1.2);}}
 }
 if(m.type==='curtain'&&m.progress>.8){G.curtainClosed=G.s.curtainClosed=true;act('secureWindow',{},true);finishMini(()=>{G.cat.x=535;G.cat.y=310;say([{who:'',text:'창문을 잠그자 덜컹거리는 소리가 멎었다. 소파 뒤에서 '+G.s.cat+'의 얼굴이 나왔다.'}],null,[{text:'곁에서 진정시킨다',run:()=>{if(act('calmRain').ok){G.restAt=G.now;later(2,()=>G.restAt=null);}}},{text:'내 일을 계속한다',run:()=>{}}]);},1.2);}
 if(m.type==='umbrella'&&clamp((m.p.x-190)/130,0,1)>.7){m.progress=1;finishMini(()=>{G.intro='sheltered';G.cat.pose='purr';G.cat.x=G.hero.x+20;G.cat.y=323;say([{who:'고양이',text:'야옹~'},{who:'',text:'빗줄기가 우산 밖으로 떨어진다. 고양이가 다리에 얼굴을 부볐다.'},{who:'나',text:'우리 집에서 털 좀 말리고 갈래?'}]);},2);}
 m.drag=null;
}
function updateMini(dt){const m=G.mini;if(!m||m.complete)return;
 if(['feed','water'].includes(m.type)){m.pouring=(m.down||m.placed)&&Math.abs(m.p.x-385)<65&&m.p.y>75&&m.p.y<210;if(m.pouring){m.progress+=dt*.65;if(G.now-(m.soundAt||0)>.3){m.soundAt=G.now;tone(m.type==='water'?180:280,.03);}}if(m.progress>=1){const type=m.type;finishMini(()=>{if(m.ending){G.endingMoment=false;G.endingPlayback=true;G.restAt=G.now;notice('깨끗한 물을 놓고 조금 떨어져 앉았다.',4);later(3,showEnding);return;}const r=m.night?Life.actAtNight(G.s,type):act(type,type==='feed'?{kind:m.foodKind}:{},true);G.catEatUntil=G.now+3;G.catEatX=type==='water'?515:575;Object.assign(G.cat,{x:G.catEatX,y:323,dir:-1,pose:'eat',walk:0});G.s.flags['learned:'+type]=true;
 if(m.night){say([{who:'',text:r.message}],()=>{if(G.s.nightIssue?.thirst)startMini('water',{night:true});else backToSleep();});return;}
 if(G.intro==='firstFeed')G.intro='firstWater';else if(G.intro==='firstWater')G.intro='hoodie';
 say([{who:'',text:r.message}],()=>{if(G.intro==='firstWater')say([{who:'나',text:'물도 담아 주자.'}]);});if(r.foodLow)later(3.2,lowFood);},1.5);}}
 if(m.type==='play'){const aim=clamp(m.pointer.x,100,545),dx=aim-m.catX;m.catX+=Math.sign(dx)*Math.min(Math.abs(dx),dt*140);m.catDir=dx>0?1:-1;m.catWalk=Math.abs(dx)>12?G.now:0;const catchable=m.hasMoved&&G.now-m.lastMove>.25&&Math.abs(dx)<45&&m.pointer.y>185;if(catchable)m.progress+=dt*.8;m.catY=catchable?285-Math.abs(Math.sin(G.now*6))*16:285;if(m.progress>=1)finishMini(()=>{act('play',{},true);notice(Life.josa(G.s.cat,'subject')+' 쥐 인형을 붙잡고 뒷발로 찬다.',5);},1.5);}
 if(m.type==='umbrella')m.progress=clamp((m.p.x-190)/130,0,1);
 if(m.type==='roller'&&!m.fur.some(f=>f.on)&&!m.finished){m.finished=true;finishMini(()=>{act('stopRoller',{},true);notice('소매가 깨끗해졌다. 옷걸이 옆에 돌돌이를 뒀다.');},1.2);}
}
function openPause(){if(G.mode!=='play'||G.endingPlayback)return;G.paused=true;G.keys={};G.resetConfirm=false;$('newGameButton').textContent='처음부터 다시하기';$('pauseScreen').hidden=false;$('saveStatus').textContent='';rainAudio(false);}
function resumePlay(){G.paused=false;$('pauseScreen').hidden=true;}
function title(){G.mode='title';G.paused=false;G.auto=[];G.dialog=null;G.mini=null;G.menu=false;G.ack=false;G.transition=null;G.workMontage=null;G.black=null;$('blackScreen').hidden=true;G.endingPlayback=false;G.endingMoment=false;for(const id of ['gameScreen','endingScreen','phone','acknowledge','dialogue','naming','pauseScreen'])$(id).hidden=true;$('titleScreen').hidden=false;rainAudio(false);offerResume();}
$('menuButton').onclick=openPause;$('resumePlay').onclick=resumePlay;
$('saveButton').onclick=()=>{$('saveStatus').textContent=save()?'저장했어요. 진행 중인 조작은 다시 시작합니다.':'브라우저 저장 공간을 확인해 주세요.';};
$('saveExitButton').onclick=()=>{save();title();};
$('newGameButton').onclick=()=>{if(!G.resetConfirm){G.resetConfirm=true;$('saveStatus').textContent='처음부터 시작하면 현재 기록을 지웁니다.';$('newGameButton').textContent='확인 · 처음부터';return;}try{localStorage.removeItem(SAVE_KEY);}catch(_){}title();};
function update(dt){
 if(G.paused)return;if(G.black){const b=G.black;b.elapsed+=dt;b.count=Math.max(b.count,Math.min(b.lines[b.index].length,Math.floor(b.elapsed*25)));$('blackText').textContent=b.lines[b.index].slice(0,b.count);return;}const due=G.auto.filter(a=>a.at<=G.now);G.auto=G.auto.filter(a=>a.at>G.now);for(const a of due)a.fn();
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
function frame(ms){const t=ms/1000,dt=Math.min(.05,G.last?t-G.last:0);G.last=t;if(!G.paused)G.now+=dt;update(dt);if(G.mode==='title')LifeView.title(titleCtx,G.now,G);else if(G.mode==='ending')LifeView.end($('endingCanvas').getContext('2d'),G,G.endingKey);else{LifeView.draw(ctx,G);if(G.transition){ctx.fillStyle='rgba(30,51,61,'+Math.sin(clamp((G.now-G.transition.start)/G.transition.duration,0,1)*Math.PI)+')';ctx.fillRect(0,0,640,360);}}requestAnimationFrame(frame);}
function begin(){audioStart();G.s=Life.create($('playerName').value.trim()||'김신입','보리');G.mode='play';G.intro='black';G.auto=[];G.menu=false;G.ack=false;G.dialog=null;G.mini=null;G.catControl=false;G.sleeping=false;G.nightScene=false;G.transition=null;G.officeTalk={};G.officeDone=false;G.doorOpen=true;G.catOnBed=false;G.endingPlayback=false;G.hero.pose='stand';G.cat={x:700,y:323,dir:-1,walk:0,pose:'fear'};$('titleScreen').hidden=true;$('gameScreen').hidden=false;$('endingScreen').hidden=true;setScene('bedroom',220);blackLines(['대학 졸업 후 취업 준비만 4년째…','남은 생활비는 만이천 원.','이번 면접에서도 떨어지면 나는…','…'],rejectionBed);save();}

$('startButton').onclick=()=>{let previous;try{previous=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(_){}if(previous?.state)ack('새로 시작하면 지금까지의 저장 기록을 덮어씁니다.',[{text:'새로 시작',run:begin},{text:'돌아가기',run:()=>{}}]);else begin();};
$('restartButton').onclick=title;
function restore(saved){audioStart();G.s=saved.state;G.finalEnding=saved.finalEnding;G.shopMode=saved.shopMode;G.shopReturn=saved.shopReturn;G.phoneKind=saved.phoneKind;G.phonePage=saved.phonePage;G.mode='play';G.intro=saved.intro||'';G.auto=[];G.dialog=null;G.mini=null;G.menu=false;G.ack=false;G.sleeping=false;G.paused=false;G.transition=null;G.dressed=G.s.dressed;G.doorOpen=G.s.doorOpen;G.curtainClosed=!!saved.curtainClosed;G.catControl=!!saved.catControl;G.catStage=saved.catStage||'';G.catOldDay=saved.catOldDay||0;G.carried=saved.carried;G.pendingNight=saved.pendingNight;G.officeTalk=saved.officeTalk||{};G.officeDone=!!saved.officeDone;G.officeFeedback=!!saved.officeFeedback;G.nightScene=false;G.catOnBed=false;G.endingPlayback=false;$('titleScreen').hidden=true;$('gameScreen').hidden=false;$('endingScreen').hidden=true;setScene(saved.scene||'living',saved.hero?.x||220);G.cat=saved.cat||{x:430,y:323,dir:-1,walk:0,pose:'sit'};if(saved.nightScene&&saved.nightData)nightWake(saved.nightData);else if(G.intro==='black')blackLines(['대학 졸업 후 취업 준비만 4년째…','남은 생활비는 만이천 원.','이번 면접에서도 떨어지면 나는…','…'],rejectionBed,saved.blackIndex||0);else if(G.intro==='bedPhone'){G.sleeping=true;}else if(G.intro==='name')$('naming').hidden=false;else if(['montage','spring'].includes(G.intro))startMontage();else if(G.intro==='offer'){G.phoneKind='offer';}else if(G.s.currentConsultation){const customer=LifeStory.customers(G.s).find(c=>c.id===G.s.currentConsultation.id);consult(customer);}
updateUI();}
function offerResume(){let saved;try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(_){}const valid=!!saved?.state&&saved.state.version===4&&(saved.state.phase!=='ending'||saved.shopMode==='final');$('continueButton').hidden=!valid;$('continueButton').onclick=()=>valid&&restore(saved);$('startButton').textContent=valid?'처음부터 시작':'시작';}
async function loadAssets(){const urls=window.__LIFE_ASSETS||{rooms:'assets/rooms-pixel.png',places:'assets/places-pixel.png',r4People:'assets/r4-people.png',r4Cats:'assets/r4-cats.png',r4Props:'assets/r4-props.png',r4Scenes:'assets/r4-scenes.png',r4Actions:'assets/r4-actions.png'};await Promise.all(Object.entries(urls).map(([k,url])=>new Promise(resolve=>{const im=new Image();im.onload=()=>{G.images[k]=im;resolve();};im.onerror=resolve;im.src=url;})));PixelArt.setImages?.(G.images);if(document.fonts)await document.fonts.ready;$('startButton').disabled=false;}
ctx.imageSmoothingEnabled=false;titleCtx.imageSmoothingEnabled=false;loadAssets();offerResume();requestAnimationFrame(frame);
window.CatDoorReview={snapshot:()=>JSON.parse(JSON.stringify({scene:G.scene,intro:G.intro,hero:G.hero,cat:G.cat,mini:G.mini?.type,task:G.mini?.task,cards:G.mini?.cards,slots:G.mini?.slots,items:G.mini?.items,doorDecision:G.mini?.decided,miniDoor:G.mini?.door,dialogue:G.dialog?.lines[G.dialog.index],black:G.black?{index:G.black.index,text:G.black.lines[G.black.index]}:null,shopMode:G.shopMode,consultation:G.consultation,state:G.s,catControl:G.catControl,camera:LifeView.camera(G),doorOpen:G.doorOpen,guideId:G.guideId,menu:G.menu,ack:G.ack,paused:G.paused,nightScene:G.nightScene,workMontage:!!G.workMontage,endingPlayback:!!G.endingPlayback,endingMoment:!!G.endingMoment,endingKey:G.endingKey}))};
})();
