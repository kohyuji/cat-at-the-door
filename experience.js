/* v4의 규칙·그림 도구 위에서 경험을 확장한다. 외부 라이브러리 없음. */
const XS = { epoch:0, readyAt:0, actions:new Map(), serial:0, drag:null, dialog:null, screen:"title" };
const resetV4 = reset;
reset = function(){
  resetV4();
  s.experience = { firstCat:false, rain:false, quiet:false, awaySeen:false };
};
const action = fn => { const key = "a" + (++XS.serial); XS.actions.set(key,fn); return key; };
const buttonHTML = b => `<button data-action="${action(b.fn)}" data-epoch="${XS.epoch}" class="${b.primary?'primary':b.subtle?'subtle':''}" ${b.disabled?'disabled':''}>${b.label}${b.hint?`<small>${b.hint}</small>`:''}</button>`;
const spotHTML = b => `<button class="hotspot ${b.kind||''}" data-action="${action(b.fn)}" data-epoch="${XS.epoch}" ${b.gesture?`data-gesture="${b.gesture}"`:''} style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;" aria-label="${b.label}${b.hint?' · '+b.hint:''}"><span>${b.label}${b.hint?`<small>${b.hint}</small>`:''}</span></button>`;
function show(o){
  clearTimeout(hTimer); hTimer = null;
  XS.epoch++; XS.readyAt = performance.now() + 480; XS.actions.clear(); XS.drag = null; XS.screen = o.id || o.title;
  $app.dataset.ready='false';const epoch=XS.epoch;setTimeout(()=>{if(XS.epoch===epoch)$app.dataset.ready='true';},480);
  const displayDay=o.id==='work-result'?s.day:Math.min(s.day+1,10),now=Math.max(0,displayDay-1);
  const dots = Array.from({length:10},(_,i)=>`<i class="day-dot ${i<now?'past':i===now?'now':''}"></i>`).join('');
  const help = action(()=>openNote('선택과 조작',[
    '장면에 이름이 붙은 물건을 직접 선택합니다. 문은 손잡이를 왼쪽으로 끌어 열 수도 있습니다. 같은 행동을 하는 별도 버튼은 없습니다.',
    '고양이와 함께 자면 다음 날 정장에 털이 묻습니다. 회사의 반응은 예상 월급에, 돌돌이는 월급날 지출에 영향을 줍니다.',
    '고양이와의 관계는 숫자로 표시하지 않습니다. 울음소리, 잠드는 자리, 아침의 배웅을 살펴보세요. 모든 선택은 키보드 Tab과 Enter로도 할 수 있습니다.'
  ]));
  const restart = action(()=>openNote('이야기를 처음부터 시작할까요?',['이번 플레이의 선택 기록은 지워집니다. 이미 찾은 엔딩과 이름은 남습니다.'],()=>goTitle(),'처음부터 시작'));
  const income = money().monthly;
  $app.innerHTML = `<header class="masthead"><div class="wordmark">Cat at the Door<small>같은 문 앞에서, 다른 마음으로</small></div><nav class="utilities" aria-label="게임 메뉴"><button data-action="${help}" data-epoch="${XS.epoch}">도움말</button><button data-action="${restart}" data-epoch="${XS.epoch}">처음으로</button></nav></header>
    <div class="workspace screen-enter"><section class="visual-column" aria-label="${o.tag||'장면'}"><div class="chapter"><span class="chapter-label">${o.tag||''}</span><small>${o.perspective||'나의 쪽'}</small></div>
      <div class="room-frame" id="stage"><div class="artwork">${o.art||roomArt()}</div>${(o.spots||[]).map(spotHTML).join('')}${o.shade?'<div class="shade" style="--hes:3.4s"></div>':''}</div>
      <p class="stage-note" id="stageNote" aria-live="polite">${o.note||'장면 속의 이름표를 선택해 보세요.'}</p>
      ${o.progress===false?'':`<div class="progress" aria-label="열 밤 중 ${displayDay}번째">${dots}<span class="progress-label">열 번의 밤</span></div><div class="status-line"><span>${s.day<10?`월급날까지 ${10-s.day}일`:'첫 월급날'}</span><span>예상 월급 <strong>${income}만원</strong> · 체면 ${bossFace()}</span></div>`}
    </section><section class="story-panel" aria-label="이야기"><p class="eyebrow">${o.kicker||'CAT AT THE DOOR'}</p><h2 id="storyHeading" tabindex="-1">${o.title}</h2>${(o.paragraphs||[]).map(t=>`<p>${t}</p>`).join('')}${o.extra||''}<div class="actions">${(o.buttons||[]).map(buttonHTML).join('')}</div>${o.footer||''}</section></div><footer class="credit">v4에서 이어지는 이야기 · 경험 확장 검토본</footer>`;
  document.getElementById('storyHeading')?.focus({preventScroll:true});
  window.scrollTo(0,0);
  if(o.after) o.after();
}
function runAction(el,e){
  if(!el || el.disabled || XS.dialog || Number(el.dataset.epoch)!==XS.epoch || performance.now()<XS.readyAt || (e && e.detail>1)) return;
  const fn = XS.actions.get(el.dataset.action); if(!fn) return;
  XS.readyAt = performance.now()+220;
  fn();
}
$app.addEventListener('click', e=>{
  const el=e.target.closest('[data-action]');
  if(performance.now()<(XS.skipClickUntil||0)){e.preventDefault();return;}
  runAction(el,e);
});
$app.addEventListener('keydown',e=>{ if(e.repeat && (e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();} },true);
$app.addEventListener('pointerdown',e=>{
  const el=e.target.closest('[data-gesture]');
  if(!el || performance.now()<XS.readyAt || e.button!==0) return;
  XS.drag={el,x:e.clientX,y:e.clientY,epoch:XS.epoch,kind:el.dataset.gesture,progress:0};
  try{el.setPointerCapture(e.pointerId);}catch(_){}
});
$app.addEventListener('pointermove',e=>{
  const d=XS.drag; if(!d || d.epoch!==XS.epoch) return;
  const width=document.getElementById('stage').getBoundingClientRect().width;
  d.distance=Math.hypot(e.clientX-d.x,e.clientY-d.y);
  d.progress=Math.max(0,Math.min(1,(d.x-e.clientX)/(width*.13)));
  if(d.kind==='door'){
    const leaf=document.getElementById('doorLeaf'); if(leaf) leaf.style.transform=`scaleX(${1-d.progress*.75})`;
  }else{
    d.el.style.transform=`translate(${e.clientX-d.x}px,${e.clientY-d.y}px)`;
  }
});
$app.addEventListener('pointerup',e=>{
  const d=XS.drag;XS.drag=null;if(!d||d.epoch!==XS.epoch)return;
  const complete=d.kind==='door'?d.progress>.55:(d.distance||0)>40;
  if(complete){XS.skipClickUntil=performance.now()+200;runAction(d.el,{detail:1});}
  else{if((d.distance||0)>8)XS.skipClickUntil=performance.now()+200;d.el.style.transform='';const leaf=document.getElementById('doorLeaf');if(leaf)leaf.style.transform='';}
});
$app.addEventListener('pointercancel',()=>{if(XS.drag)XS.drag.el.style.transform='';XS.drag=null;const leaf=document.getElementById('doorLeaf');if(leaf)leaf.style.transform='';});
function openNote(title,lines,confirm,label){
  if(XS.dialog)return;
  const previous=document.activeElement;
  const box=document.createElement('div');box.className='dialog-cover';
  box.innerHTML=`<section class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialogTitle"><h2 id="dialogTitle">${title}</h2>${lines.map(t=>`<p>${t}</p>`).join('')}<button id="dialogClose">${confirm?'계속 플레이':'장면으로 돌아가기'}</button>${confirm?` <button id="dialogConfirm">${label}</button>`:''}</section>`;
  XS.dialog=box;document.body.appendChild(box);
  const close=()=>{box.remove();XS.dialog=null;XS.readyAt=performance.now()+480;previous?.focus({preventScroll:true});};
  box.querySelector('#dialogClose').onclick=close;
  if(confirm)box.querySelector('#dialogConfirm').onclick=()=>{close();confirm();};
  box.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='Tab'){const items=[...box.querySelectorAll('button')],i=items.indexOf(document.activeElement);e.preventDefault();items[(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();}
  });
  box.querySelector('button').focus();
}
function setNote(text){const n=document.getElementById('stageNote');if(n)n.textContent=text;}

/* 공간: 침대·닫힌 문·내일의 정장. 위치는 밤마다 유지한다. */
function roomArt(o={}){
  const rainy=o.rain ?? s.day===2, open=o.open||false, cat=o.cat||'', quiet=s.cold>=6;
  const lines=Array.from({length:9},(_,i)=>`<path d="M0,${182+i*3} H320 M${i*41},178 l-20,22" stroke="#503d3028" stroke-width=".6"/>`).join('');
  const rain=rainy?`<g class="rain">${Array.from({length:7},(_,i)=>`<path d="M${29+i*9},35 l-3,13" stroke="#d7e3e5" opacity=".5"/>`).join('')}</g>`:'';
  const door=open?`${doorOpen()}<path d="M216,176 L170,200 H320 L290,176" fill="#f8d89b" opacity=".14"/>`:
    `<rect x="214" y="42" width="78" height="138" rx="2" fill="#352e30"/><g id="doorLeaf" class="door-leaf">${doorClosed(quiet?0:s.cold>3?.4:1,quiet)}</g>`;
  const sleeping=cat==='bed'?`<g class="cat-arrive"><g class="breath">${catLoaf(110,127,.62)}</g></g>`:'';
  return V(`<defs><linearGradient id="nightWall" x2="0" y2="1"><stop stop-color="#3e525e"/><stop offset="1" stop-color="#293a48"/></linearGradient><radialGradient id="windowGlow"><stop stop-color="#eed9ad" stop-opacity=".13"/><stop offset="1" stop-color="#eed9ad" stop-opacity="0"/></radialGradient></defs>
    <rect width="320" height="200" fill="url(#nightWall)"/><circle cx="67" cy="58" r="108" fill="url(#windowGlow)"/>
    <path d="M0,178 H320" stroke="#b9a081" stroke-width="4"/>${floor()}${lines}
    <rect x="22" y="26" width="74" height="61" rx="2" fill="#152a40" stroke="#b29472" stroke-width="3"/>
    ${rainy?'':`<circle cx="76" cy="43" r="10" fill="var(--moon)"/><circle cx="82" cy="39" r="9" fill="#152a40"/><circle cx="36" cy="42" r=".8" fill="#fff0c7"/><circle cx="54" cy="65" r=".7" fill="#fff0c7"/>`}${rain}
    <path d="M59,27 v60 M23,57 H95" stroke="#b29472" stroke-width="2"/>
    <path d="M13,20 h10 v77 l-9,8z M96,20 h10 l-2,84 -8,-8z" fill="#809293"/>
    <rect x="118" y="27" width="32" height="29" rx="2" fill="#e4d7be"/><path d="M118,33 h32" stroke="#b58069" stroke-width="5"/>
    <text x="134" y="48" text-anchor="middle" font-size="9" fill="#4b4944">${Math.min(s.day+1,10)}일</text>
    <path d="M173,35 v35 M162,70 h23" stroke="#b9a28a" stroke-width="1.5"/><path d="M161,73 l12,-6 12,6 -2,26 h-20z" fill="var(--suit)"/>
    <ellipse cx="102" cy="180" rx="78" ry="9" fill="#554a40" opacity=".35"/>
    <rect x="13" y="124" width="153" height="48" rx="5" fill="#bda68c"/><rect x="13" y="111" width="12" height="65" rx="2" fill="#755b49"/>
    <rect x="23" y="119" width="140" height="43" rx="5" fill="var(--sheet)"/><ellipse cx="46" cy="122" rx="19" ry="10" fill="#eee5d2"/>
    <circle cx="47" cy="114" r="10" fill="var(--skin)"/><path d="M37,113 q10,-15 20,0" fill="var(--hair)"/><path d="M43,117 h3 M50,117 h3" stroke="var(--paw)" stroke-width="1.2"/>
    <path d="M58,119 q50,-12 106,2 v40 H58z" fill="var(--blanket)"/><path d="M62,129 q55,-8 100,1" stroke="#b6c3b8" stroke-width="1" opacity=".55"/>
    <rect x="168" y="139" width="31" height="32" rx="2" fill="#7c624e"/><rect x="174" y="131" width="21" height="9" rx="2" fill="#253644"/><text x="185" y="138" text-anchor="middle" font-size="5" fill="#e4c789">06:30</text>
    <path d="M176,151 h15" stroke="#b99b79"/><circle cx="184" cy="156" r="1.3" fill="#d5b792"/>
    ${door}${toys(s.toys)}${s.hoodie?`<rect x="228" y="180" width="59" height="13" rx="6" fill="var(--hoodie)"/><path d="M236,184 q14,8 28,0" stroke="#d0c7b8" fill="none" stroke-width="1"/>`:''}
    ${sleeping}${cat==='door'?catSit(256,177,.58):''}${cat==='hoodie'?catLoaf(243,183,.64):''}
    ${o.food&&s.food?foodBag(187,196,s.food==='fav'):''}${o.closedEyes||cat==='bed'?'':`<text x="303" y="29" text-anchor="end" font-size="12" fill="#f1d093">${rainy?'비':quiet?'…':s.cold>3?'…':'야옹'}</text>`}`);
}
function livingArt(o={}){
  const where=o.where||'door', toy=o.toy;
  const catX={door:258,toy:174,closet:118,sofa:46,curtain:51}[where]||258;
  return V(`<rect width="320" height="200" fill="#3a4c59"/><rect y="179" width="320" height="21" fill="var(--floor)"/>
    <rect x="21" y="24" width="61" height="65" fill="#193247" stroke="#b59673" stroke-width="3"/>
    <path d="M17,20 h18 v91 l-15,9z M69,20 h18 v101 l-18,-8z" fill="#9aaca4"/>
    <rect x="12" y="128" width="72" height="47" rx="8" fill="#728c89"/><rect x="9" y="121" width="16" height="57" rx="5" fill="#546f70"/><rect x="70" y="121" width="16" height="57" rx="5" fill="#546f70"/>
    <rect x="99" y="47" width="57" height="132" fill="#9c795c" stroke="#624b3f" stroke-width="2"/><path d="M127,48 v131" stroke="#624b3f"/><circle cx="122" cy="108" r="2" fill="#e6c28a"/><circle cx="132" cy="108" r="2" fill="#e6c28a"/>
    <rect x="226" y="25" width="72" height="154" fill="#9c795c" stroke="#624b3f" stroke-width="3"/><circle cx="238" cy="110" r="4" fill="#e6c28a"/><rect x="227" y="176" width="70" height="3" fill="#edcd8b"/>
    <path d="M226,180 l-24,20 h118 l-23,-20" fill="#f6d798" opacity=".13"/>
    ${s.hoodie?`<rect x="230" y="181" width="60" height="13" rx="5" fill="var(--hoodie)"/>`:''}
    ${bowl(187,175,true,false)}${toy?`<g id="movingMouse"><ellipse cx="178" cy="191" rx="8" ry="4" fill="#bf8c6e"/><circle cx="185" cy="188" r="2.4" fill="#d4ad93"/><path d="M170,191 q-10,-3 -12,3" stroke="#d6b1a0" fill="none"/></g>`:''}
    ${o.noCat?'':o.sleep?catLoaf(catX-12,187,.7):catAway(catX,187,.8)}
    <text x="262" y="46" text-anchor="middle" font-size="8" fill="#473b35">방문</text>`);
}
function phoneArt(){
  return V(`<rect width="320" height="200" fill="#53646a"/>${floor()}${person(55,180,{fur:1})}${ceo(264,180,true)}
    <rect x="113" y="15" width="95" height="176" rx="13" fill="#242d39" stroke="#d5c2a4" stroke-width="1"/><rect x="120" y="32" width="81" height="141" rx="5" fill="#d7c3a5"/>
    <text x="160" y="50" text-anchor="middle" font-size="9" fill="#4d443d">우리 집 호떡</text><rect x="126" y="59" width="69" height="89" rx="3" fill="#839e97"/>${catSit(160,140,.94,{closed:true})}
    <text x="160" y="165" text-anchor="middle" font-size="7" fill="#4d443d">치즈 고양이 · 호떡이</text><rect x="146" y="21" width="29" height="3" rx="2" fill="#9aa5a8"/>`);
}
function closetArt(){
  return V(`<rect width="320" height="200" fill="#53646a"/>${floor()}
    <rect x="116" y="17" width="185" height="162" rx="3" fill="#785b48"/><rect x="123" y="24" width="171" height="147" fill="#3d454b"/>
    <path d="M217,24 v148 M220,112 H294" stroke="#aa8a67" stroke-width="4"/>
    <path d="M128,41 H210" stroke="#bead94" stroke-width="2"/><path d="M153,50 l17,-8 17,8z" fill="none" stroke="#bead94" stroke-width="2"/>
    <path d="M130,144 q35,-6 80,0 l-3,26 h-80z" fill="var(--suit)"/>
    ${Array.from({length:8},(_,i)=>`<path d="M${133+i*9},${151+(i%3)*5} l5,2" stroke="var(--fur)" stroke-width="1.7"/>`).join('')}
    ${catLoaf(160,157,.67)}
    <path d="M234,146 l8,-7 h26 l10,7 v20 h-44z" fill="var(--hoodie)"/><path d="M246,139 q9,11 18,0" stroke="#d4cbbb" fill="none" stroke-width="2"/>
    <text x="257" y="130" text-anchor="middle" font-size="7" fill="#eee0c8">회색 후드티</text><text x="166" y="74" text-anchor="middle" font-size="8" fill="#eee0c8">내일 입을 정장</text>
    ${person(63,178,{face:'sad',body:'var(--shirt)'})}`);
}
const noteSpot = (label,x,y,w,h,lines) => ({label,x,y,w,h,kind:'inspect',fn:()=>openNote(label,lines)});

/* 시작: 글은 관계와 사정을 설명하는 데 사용한다. */
goTitle = function(){
  reset();let saved={};try{saved=JSON.parse(localStorage.getItem('catgame-names')||'{}')||{};}catch(_){}
  show({id:'title',tag:'첫 출근 전날',perspective:'한 사람과 한 고양이의 이야기',kicker:'INTERACTIVE STORY',title:'같이 잘까,\n오늘은 혼자 잘까?',progress:false,
    art:roomArt({open:true,cat:'bed'}),note:'문 하나를 사이에 둔 열 번의 밤.',paragraphs:['취준하던 동안 매일 같이 자던 고양이. 내일부터는 나를 기다리는 회사가 생겼다.','내 생활을 지키는 일과, 나만 기다리는 존재를 돌보는 일 사이에서.'],
    extra:`<div class="names"><label>내 이름<input id="pname" maxlength="6" placeholder="김신입" value="${esc(saved.me||'')}" autocomplete="off"></label><label>고양이 이름<input id="cname" maxlength="6" placeholder="보리" value="${esc(saved.cat||'')}" autocomplete="off"></label></div>`,
    buttons:[{label:'이야기 시작',primary:true,fn:()=>startGame(false)},...(getFound().length?[{label:'첫 번째 밤부터',subtle:true,fn:()=>startGame(true)}]:[])]});
};
startGame = function(skip){
  const p=document.getElementById('pname').value.trim(),c=document.getElementById('cname').value.trim();
  ME=esc(p||'김신입');CAT=esc(c||'보리');try{localStorage.setItem('catgame-names',JSON.stringify({me:p,cat:c}));}catch(_){}
  skip?night():prologue(0);
};
prologue = function(i){
  const parts=[
    {tag:'작년 겨울',title:'우산 하나의 자리',art:sceneStore(),paragraphs:['서른한 번째 불합격 문자를 받은 밤이었다.',`편의점 앞에 젖은 고양이가 있었다. 비를 피할 곳도, 기다리는 사람도 없는 것 같았다.`],note:'우산을 고양이 쪽으로 기울여 주세요.',spots:[{label:'우산을 기울여 준다',x:13,y:28,w:34,h:48,fn:()=>prologue(1)}]},
    {tag:'취준생의 밤들',title:'늘 열려 있던 문',art:roomArt({open:true,cat:'bed'}),paragraphs:[`${J(CAT,'이라는','라는')} 이름이 생겼다. 자소서를 쓰다 늦게 누우면, 늘 베개 옆으로 와서 몸을 말았다.`,'회색 후드티는 늘 털투성이였다. 그때는 그게 별일이 아니었다.'],note:'침대의 불을 끄고, 함께 밤을 보내세요.',spots:[{label:'불을 끄고 같이 잔다',x:9,y:51,w:43,h:32,fn:()=>prologue(2)}]},
    {tag:'지난주',title:'나를 기다리는 곳',art:scenePass(),paragraphs:['드디어 합격했다. 난생처음 검은 정장을 샀다.',`회사에서는 옷차림도 신경 써 달라고 했다. ${CATi()} 정장에 코를 대더니 재채기를 했다.`,'내일은 첫 출근. 오늘은 푹 자야 한다.'],note:'처음으로, 잠들기 전에 문을 닫습니다.',buttons:[{label:'방문을 닫는다',primary:true,fn:()=>night()}]}
  ];show({...parts[i],id:'prologue-'+i,progress:false,kicker:'문이 닫히기 전'});
};
night = function(){
  if(s.day>=10)return payday();
  if(s.day===2&&!s.experience.rain)return rainyNight();
  if(s.day>=6&&s.cold>=4&&!s.experience.quiet)return quietNight();
  const away=s.cold>=6,cmp=compareLine(),extra=nightExtra();
  show({id:'night',tag:`${s.day+1}번째 밤`,kicker:'내일도 출근이니까',title:away?'오늘은 오지 않았다':'문 하나를 사이에 두고',art:roomArt(),
    paragraphs:[NIGHTS[s.day],`${cmp?cmp+' ':''}${cryLine()}`],note:'문과 침대는 서로 다른 선택입니다. 다른 물건에서는 오늘의 사정을 살펴볼 수 있어요.',
    spots:[
      {label:away?`${CATo()} 찾아 함께 잔다`:`${CATo()} 들이고 같이 잔다`,hint:away?'거실로 나가기':'손잡이를 왼쪽으로 끌거나 선택',x:67,y:26,w:28,h:61,gesture:'door',kind:'door-control',fn:()=>choose(true)},
      {label:'문을 닫아 두고 혼자 잔다',hint:'내일을 위해 잠을 청한다',x:5,y:56,w:47,h:32,fn:()=>hesitate()},
      noteSpot('내일의 일정',34,12,15,21,[NIGHTS[s.day],'첫 회사에서 인정받고 싶다. 내일도 멀쩡한 얼굴로 출근하고 싶다.']),
      ...(s.toys?[noteSpot('문 앞에 남은 인형',70,88,26,11,[extra||`${CATi()} 문 밑으로 밀어 넣은 쥐 인형이다.`,`${KN[s.toys]}째다. 어젯밤엔 문을 열었는지 잠깐 생각했다.`])]:[])
    ]});
};
hesitate = function(){
  const away=s.cold>=6;
  show({id:'hesitate',tag:`${s.day+1}번째 밤 · 이불 속`,kicker:'아직 잠들지 못했다',title:away?'조용한 이불 속':'눈을 감아도 들린다',art:roomArt({closedEyes:true}),shade:true,
    paragraphs:[away?'푹 잘 수 있을 것 같다. 그런데 이불 한쪽이 이상하게 넓다.':`이불을 끌어올렸다. 문 너머의 ${s.cold>3?'작은 기척':'울음소리'}는 아직 들린다.`,'잠들기 전까지는 일어나도 된다.'],note:'잠시 그대로 있으면 혼자 잠듭니다. 마음이 바뀌면 문을 열 수 있어요.',
    spots:[{label:away?'…일어나서 찾는다':'…그래도 문을 연다',x:66,y:27,w:29,h:62,kind:'hesitate-door',fn:()=>choose(true,true)}]});
  hTimer=setTimeout(()=>{hTimer=null;choose(false);},3400*HES);
};
choose = function(sleep,late=false){
  clearTimeout(hTimer);hTimer=null;
  s.prevLevel=cryLevel(s.cold);
  const rec={open:sleep,late,cold:s.cold,rain:s.day===2,toy:false,place:''};s.hist.push(rec);
  if(sleep){
    const wasCold=s.cold>=6;rec.place=wasCold?'sofa':'bed';s.slept++;s.cold=Math.max(0,s.cold-2);s.memo='slept';s.streak=0;
    show({id:'together',tag:`${s.day+1}번째 밤`,title:wasCold?'내가 먼저 다가갔다':'다시, 원래 자리',kicker:'함께 잠든 밤',art:wasCold?livingArt({where:'sofa',sleep:true}):roomArt({open:true,cat:'bed'}),paragraphs:[openLine(wasCold,late),'알람은 아침 여섯 시 반. 정장은 옷걸이에 걸려 있다.'],note:'따뜻한 밤의 흔적은 내일 아침에도 남습니다.',buttons:[{label:'아침을 맞는다',primary:true,fn:()=>morningWork([],true,false)}]});return;
  }
  s.streak++;
  if(!s.closetDone&&s.streak>=2&&s.day>=1&&s.day<=7&&s.cold<6){rec.place='closet';s.cold++;return catMoment(rec,()=>closetMorning());}
  rec.place=s.hoodie?'hoodie':s.cold>=6?'away':'door';
  if(s.cold<=3){s.toys++;rec.toy=true;}
  s.cold=s.hoodie?Math.min(3,s.cold+1):s.cold+1;s.memo=s.hoodie?'hoodie':cryLevel(s.cold);
  const morning=()=>morningWork(['푹 잤다. 머리는 맑다.',rec.toy?`문 밑으로 쥐 인형이 들어와 있었다. ${s.toys===1?'어젯밤 처음 본 것이다.':`이제 ${KN[s.toys]}다.`}`:seeOffLine()],false,false);
  if(!s.experience.firstCat||rec.rain||(rec.place==='away'&&!s.experience.awaySeen))return catMoment(rec,morning);
  morning();
};

/* 고양이 관점은 사람의 선택을 되돌리지 않는다. 다음 아침에 같은 흔적이 남는다. */
function catMoment(rec,next){
  s.experience.firstCat=true;
  const closet=rec.place==='closet',away=rec.place==='away',hoodie=rec.place==='hoodie';
  if(away)s.experience.awaySeen=true;
  const finish=()=>show({id:'cat-rest',tag:`${s.day+1}번째 밤 · 문 너머`,perspective:`${CAT}의 쪽`,kicker:'같은 밤, 반대편',title:closet?'익숙한 냄새가 났다':hoodie?'문 앞의 내 자리':away?'오늘은 부르지 않았다':'문은 열리지 않았다',
    art:closet?closetArt():livingArt({where:hoodie?'door':away?'sofa':'door',sleep:true}),paragraphs:[closet?'옷장 아래에 그 사람 냄새가 나는 옷이 있었다. 소매에 코를 묻고 몸을 말았다.':hoodie?'그 사람 옷 위에 몸을 말았다. 문 너머에서 숨소리가 들린다.':away?'소파 끝에 몸을 말았다. 어제는 문 앞에서 기다렸었다.':rec.rain?'천둥이 칠 때마다 문에 등을 붙였다. 안에서는 아무 소리도 나지 않았다.':'쥐 인형을 밀어 넣었다. 한동안 문틈을 바라봤다.'],note:'다음 아침, 다시 나의 쪽으로 돌아갑니다.',buttons:[{label:'아침이 온다',primary:true,fn:next}]});
  if(closet)return show({id:'cat-closet',tag:`${s.day+1}번째 밤 · 문 너머`,perspective:`${CAT}의 쪽`,kicker:'사람이 잠든 사이',title:'닫힌 문 앞에서',art:livingArt({toy:true}),paragraphs:['문 안에서 불이 꺼졌다. 불러도 대답이 없다.','다른 방에서 익숙한 냄새가 난다.'],note:'옷장을 선택해 냄새가 나는 곳으로 가 보세요.',spots:[{label:'옷장으로 간다',x:30,y:24,w:21,h:64,fn:finish}]});
  if(away||hoodie)return finish();
  show({id:'cat-toy',tag:`${s.day+1}번째 밤 · 문 너머`,perspective:`${CAT}의 쪽`,kicker:'사람이 잠든 사이',title:'제일 좋아하는 것을',art:livingArt({where:'toy',toy:true}),paragraphs:[rec.rain?'창밖이 번쩍했다. 그 사람은 방 안에 있다.':'문이 닫혔다. 침대 옆으로 가는 길이 막혔다.','제일 좋아하는 쥐 인형을 가져가면 열어 줄까.'],note:'쥐 인형을 문 쪽으로 끌거나 선택해 밀어 넣으세요.',spots:[{label:'인형을 문 밑으로 밀어 넣는다',x:47,y:78,w:20,h:21,gesture:'toy',kind:'toy-control',fn:finish}]});
}
function rainyNight(){
  let found=false;
  const find=()=>{if(found)return;found=true;s.experience.rain=true;
    show({id:'rain-found',tag:'3번째 밤 · 천둥',kicker:'오늘은 다르게 들린다',title:'커튼 뒤의 작은 몸',art:livingArt({where:'curtain'}),paragraphs:[`${CATi()} 커튼 뒤에 웅크리고 있다. 창문이 덜컹거리자 귀를 낮췄다.`,'내일은 보고서 마감이다. 아직 확인할 것이 남았는데, 발이 쉽게 떨어지지 않는다.'],note:'찾아낸 것과 함께 있어 주는 것은 서로 다른 일입니다.',buttons:[{label:`방문을 열고 ${CATw()} 잔다`,primary:true,fn:()=>choose(true)},{label:'방으로 돌아가 혼자 잔다',hint:'오늘 밤은 내일을 준비한다',fn:()=>hesitate()}]});};
  show({id:'rain-search',tag:'3번째 밤 · 비',kicker:'낯선 소리',title:'늘 오던 자리에 없다',art:livingArt({noCat:true}),paragraphs:['천둥이 친다. 평소 같으면 문 앞에서 울었을 텐데 조용하다.','거실 어딘가에서 바스락거리는 소리가 들린다.'],note:'기척이 나는 곳을 살펴보세요. 물건을 선택하면 단서를 확인할 수 있습니다.',
    spots:[{label:'커튼 뒤를 살핀다',x:4,y:9,w:25,h:50,fn:find},{label:'소파 아래를 살핀다',x:3,y:58,w:25,h:31,fn:()=>setNote('소파 아래에는 없다. 창가 쪽에서 커튼이 조금 흔들렸다.')},{label:'옷장 옆을 살핀다',x:29,y:25,w:23,h:63,fn:()=>setNote('옷장 옆은 조용하다. 커튼 아래에서 꼬리가 살짝 보였다.')}],
    buttons:[{label:'오늘은 그냥 잠을 청한다',subtle:true,fn:()=>{s.experience.rain=true;hesitate();}}]});
}
function quietNight(){
  s.experience.quiet=true;
  show({id:'quiet-house',tag:`${s.day+1}번째 밤 · 귀가`,kicker:'잠은 잘 잤는데',title:'이제 조용해졌다',art:livingArt({where:'sofa',sleep:true}),paragraphs:[`현관문을 열어도 ${CATi()} 오지 않는다. 사료는 줄어 있다.`,'잠을 깨우는 소리가 없어졌는데, 내가 먼저 거실 쪽을 보게 됐다.'],note:'익숙했던 배웅이 없어졌습니다.',spots:[noteSpot('소파 끝의 고양이',2,62,27,34,[`${CATi()} 눈을 떴다가 다시 감았다.`,'오늘 함께 있고 싶다면, 내가 먼저 이쪽으로 와야 한다.'])],buttons:[{label:'방으로 들어간다',primary:true,fn:()=>night()}]});
}

/* 옷장 사건: 발견, 대응, 다음 밤의 변화가 같은 물건으로 이어진다. */
closetMorning = function(){
  show({id:'closet-discover',tag:`${s.day+1}일째 아침`,kicker:'같이 자지도 않았는데',title:'정장은 어디 갔지?',art:livingArt({noCat:true}),paragraphs:['푹 자고 일어났다. 그런데 옷걸이에 걸어 둔 정장이 바닥에 내려와 있다.',`옷장 아래에서 ${CAT}의 꼬리가 살짝 움직였다.`],note:'옷장을 열어 안을 살펴보세요.',spots:[{label:'옷장 문을 연다',x:29,y:24,w:23,h:65,fn:()=>closetReveal()}]});
};
function closetReveal(){
  show({id:'closet-choice',tag:`${s.day+1}일째 아침 · 옷장`,kicker:'내 냄새가 나는 곳',title:`검은 정장 위의 ${CAT}`,art:closetArt(),paragraphs:[`정장 소매에 얼굴을 묻은 채 ${CATi()} 자고 있었다. 검은 천 위에 치즈색 털이 수북하다.`,'옆 칸에 취준할 때 입던 회색 후드티가 보인다.'],note:'옷장과 후드티 중 하나를 선택하세요.',spots:[
    {label:'정장을 걸고 옷장을 닫는다',hint:'여기에는 못 들어오게 한다',x:37,y:12,w:31,h:40,fn:()=>closetChoice('lock')},
    {label:'회색 후드티를 문 앞에 깐다',hint:'내 냄새가 나는 다른 자리',x:69,y:58,w:24,h:29,gesture:'hoodie',kind:'toy-control',fn:()=>closetChoice('hoodie')}
  ]});
}
closetChoice = function(k){
  s.closetDone=true;s.closet=k;
  if(k==='lock'){s.cold++;s.memo='closet';}else{s.hoodie=true;s.memo='hoodie-new';s.cold=Math.min(3,Math.max(0,s.cold-1));}
  show({id:'closet-result',tag:`${s.day+1}일째 아침`,title:k==='lock'?'안전해진 정장':'문 앞에 둔 내 옷',kicker:'오늘의 선택이 남는 자리',art:k==='lock'?livingArt({where:'sofa'}):roomArt({cat:'hoodie'}),paragraphs:[k==='lock'?`정장을 털어 다시 걸고 문을 닫았다. 닫히는 소리에 ${CATi()} 귀를 낮췄다.`:`문 앞에 후드티를 깔자 ${CATi()} 한참 냄새를 맡았다. 그러고는 그 위에 몸을 말았다.`,'이미 정장에 붙은 털은 남아 있다. 출근할 시간이다.'],note:k==='lock'?'옷장 문은 이후에도 닫혀 있습니다.':'후드티는 이후의 밤에도 같은 자리에 남습니다.',buttons:[{label:'정장을 입고 출근 준비',primary:true,fn:()=>morningWork([],true,true)}]});
};

/* v4의 회사·월급 계산은 원래 함수를 사용한다. 결과는 짧은 장면으로 나눠 전달한다. */
finishDay = function(lines,pic){
  const day=s.day+1;s.day++;
  const offerNow=!s.roller&&s.wantOffer&&s.offers<2&&s.day<10;s.wantOffer=false;
  const next=()=>offerNow?rollerEvent():s.day>=10?payday():night();
  const useful=lines.filter(Boolean);
  const pages=[];for(let i=0;i<useful.length;i+=2)pages.push(useful.slice(i,i+2));if(!pages.length)pages.push(['오늘도 하루가 끝났다.']);
  const page=i=>show({id:'work-result',tag:`${day}일째 출근`,kicker:'밤의 선택이 아침으로',title:i?'하루를 버티고':'정장에 남은 밤',art:pic,paragraphs:pages[i],note:'체면에 따른 예상 월급 변화와 돌돌이 지출은 월급날 결산에 반영됩니다.',buttons:[{label:i<pages.length-1?'이어지는 하루':s.day>=10?'첫 월급을 확인한다':'퇴근하고 집으로',primary:true,fn:i<pages.length-1?()=>page(i+1):next}]});page(0);
};
rollerEvent = function(){
  s.offers++;const first=s.offers===1;
  show({id:'roller-offer',tag:'퇴근길 · 선배의 권유',kicker:'지워야 하는 흔적',title:'털은 떼면 되죠',art:sceneRoller(),paragraphs:[first?`선배가 내 어깨의 털을 떼어 준다. “${ME}씨, 고양이 키워요? 저도 그래요.”`:'선배가 내 소매를 보고 돌돌이를 다시 권했다.',`“같이 사는 건 좋은데, 아침마다 손이 가죠. 정장이면 더 그렇고요.”`],
    extra:`<div class="small-ledger"><div><span>본체</span><span>${ROLLER}만원</span></div><div><span>아침마다 리필 한 롤</span><span>${REFILL}만원</span></div></div><p class="muted">사용한 만큼 월급날 카드값으로 빠져나갑니다.</p>`,note:'돌돌이는 체면을 지키는 대신 돈과 수고가 듭니다.',buttons:[{label:'돌돌이를 산다',hint:'같이 잘 방법을 하나 더 마련한다',primary:true,fn:()=>{s.roller=true;night();}},{label:'이번에는 사지 않는다',hint:'털 묻은 출근은 감수해야 한다',fn:()=>night()}]});
};
rollerMorning = function(ceo=false){
  const n=Math.min(18,9+s.slept);RL={strands:suitStrands(n),left:n,total:n,ceo};
  show({id:'roller',tag:`${s.day+1}일째 아침 · 출근 준비`,kicker:ceo?'오늘은 사장님이 오는 날':'같이 잔 밤의 흔적',title:'한 가닥씩 떼어 낸다',art:`<div class="suit" id="suit" tabindex="0" role="button" aria-label="정장을 문질러 털 떼기. 키보드는 스페이스나 엔터로 한 줄씩." aria-describedby="rollLeft">${sceneSuit()}</div>`,
    paragraphs:[ceo?'오늘은 사장님 앞에 설지도 모른다. 평소보다 꼼꼼히 정리하고 싶다.':`어젯밤 ${CATw()} 잔 흔적이 정장 위에 남아 있다. 현관에 걸어 둔 돌돌이를 들었다.`],extra:`<p class="roll-left" id="rollLeft" aria-live="polite">${rollLeftText()}</p><p class="muted">이번에도 리필 한 롤, ${REFILL}만원. 지금까지 ${s.refills}롤을 썼습니다.</p>`,note:'정장을 누른 채 문지르세요. 키보드는 정장에 Tab으로 이동한 뒤 Space 또는 Enter.',buttons:[{label:'다 뗐다, 출근한다',primary:true,disabled:true,fn:()=>rollDone()},{label:'오늘은 손으로 털고 나간다',hint:ceo?'정리가 덜 된 채로 사장님을 만난다':'리필 값은 아끼고, 회사의 반응은 감수',fn:()=>{RL=null;ceo?ceoVisit(s.pend,true,true,false):useRoller(false);}}],after:()=>{
      const b=$app.querySelector('.actions button');b.id='rollDone';bindSuit();
    }});
};
// 원래 v4에서는 사장님 날에 돌돌이를 강제했다. 선택의 의미가 사라지지 않게 건너뛰기도 허용한다.
ceoVisit = function(lines,fur,rolled=false,usedRoller=true){
  if(fur&&s.roller&&!rolled){s.pend=lines;return rollerMorning(true);}
  if(fur&&s.roller&&rolled&&usedRoller){s.salary-=10;s.refills++;}
  s.bossCat=!!fur;if(fur)s.firstFur=false;s.salary+=fur?100:200;
  const end=()=>finishDay(fur?['그날 오후, 팀장님이 내 어깨의 털을 보더니 헛기침했다.','“…사장님 고양이 이름이 호떡이래요.” 아침과는 조금 다른 목소리였다.']:['사장님은 깔끔한 내 정장을 보고 고개를 끄덕인 뒤 지나갔다.'],sceneCeo(fur));
  const phone=()=>show({id:'ceo-phone',tag:'6일째 회사 · 사장님의 휴대폰',kicker:'숨기려던 털 한 가닥',title:'이쪽은 호떡이에요',art:phoneArt(),paragraphs:[`“우리 집 고양이예요. 이름은 호떡. ${J(CAT,'이랑','랑')} 같은 치즈색이네요.”`,'사장님이 화면을 넘기자 자는 사진, 하품하는 사진이 계속 나온다. 내 고양이 사진도 보여 드렸다.'],note:'호떡이는 사장님이 키우는 고양이입니다. 내내 숨기던 털이 대화의 시작이 됐습니다.',buttons:[{label:'내 자리로 돌아간다',primary:true,fn:end}]});
  show({id:'ceo-arrival',tag:'6일째 회사 · 예고됐던 방문',kicker:'옷차림을 신경 쓰라던 날',title:fur?'내 앞에서 멈췄다':'사장님이 지나갔다',art:sceneCeo(fur),paragraphs:fur?[rolled&&usedRoller?'꼼꼼히 밀었는데도 사장님이 내 어깨에서 털 한 가닥을 집어 들었다. 팀장님의 얼굴이 굳는다.':'사장님이 내 어깨에서 치즈색 털 한 가닥을 집어 들었다. 팀장님이 옆에서 자세를 고쳐 앉는다.','“…혹시 치즈 고양이 키워요?” 사장님이 휴대폰을 꺼냈다.']:['어젯밤엔 혼자 잤다. 정장에는 털이 없다.','사장님은 인사만 하고 옆자리로 갔다.'],note:fur?'어떤 반응이 돌아올지, 아직 알 수 없습니다.':'오늘은 고양이 이야기를 나눌 계기가 없었습니다.',buttons:[{label:fur?'휴대폰 사진을 본다':'자리로 돌아간다',primary:true,fn:fur?phone:end}]});
};

/* 월급날: 돌봄의 마음과 생활을 버티는 비용이 다시 만난다. */
payday = function(){
  const {monthly,rollerCost,left}=money(),broke=left<FOOD_BASIC;
  show({id:'payday',tag:'첫 월급날 · 퇴근길',kicker:'함께 살기 위해 필요한 것',title:'사료 한 봉지를 들고',art:scenePayday(left),paragraphs:['처음 받은 월급이다. 월세와 카드값을 빼고, 퇴근길에 펫숍에 들렀다.',broke?'사료 한 봉지 값도 남지 않았다. 어젯밤 옆에서 자던 얼굴이 떠올랐다.':`${CAT}의 사료를 사 가야 한다. 이번 달의 밤들이 영수증에도 남아 있다.`],
    extra:`<div class="small-ledger"><div><span>이번 달 월급</span><span>${monthly}만원</span></div><div><span>월세·공과금</span><span>−${FIXED}만원</span></div>${s.roller?`<div><span>돌돌이·리필 ${s.refills}롤</span><span>−${rollerCost}만원</span></div>`:''}<div><strong>남은 돈</strong><strong>${left}만원</strong></div></div>`,
    note:'사료를 사는 것만으로, 함께하지 못한 시간이 되돌아오지는 않습니다.',buttons:broke?[{label:'빈손으로 집에 간다',primary:true,fn:()=>buyFood(null)}]:[{label:`${CAT}의 최애 사료를 산다`,hint:`${FOOD_FAV}만원${left<FOOD_FAV?' · 돈이 모자라다':''}`,disabled:left<FOOD_FAV,primary:true,fn:()=>buyFood('fav')},{label:'저렴한 사료를 산다',hint:`${FOOD_BASIC}만원`,fn:()=>buyFood('cheap')}]});
};
finalNight = function(){
  const key=endingKey(),near=['good','boss','secret','broke'].includes(key),middle=['mid','hoodie'].includes(key);
  show({id:'final-night',tag:'월급날 밤',kicker:'처음 닫았던 그 문',title:'오늘은 내가 먼저',art:roomArt({food:true}),paragraphs:[key==='broke'?`빈손으로 들어왔는데 ${CATi()} 다리에 몸을 비볐다.`:near?`사료를 부어 주자 ${CATi()} 와그작와그작 먹었다. 한동안 그 옆에 앉아 있었다.`:middle?`${CATi()} 문턱까지 왔다가 거기에 앉았다.`:`사료를 부어 두었다. ${CATe()} 내가 방에 들어간 뒤에야 그릇으로 왔다.`,'열흘 전에는 이 문을 닫는 것이 낯설었다. 오늘은 그때의 문 앞에 내가 서 있다.'],note:'마지막 문을 여는 동작은 같아도, 그 너머의 거리는 밤마다 달라졌습니다.',spots:[{label:near?'방문을 활짝 열어 둔다':middle?'방문을 열고 기다린다':`문을 열고 ${CATo()} 부른다`,x:66,y:25,w:29,h:64,kind:'door-control',gesture:'door',fn:()=>ending(key)}]});
};
// 먹이를 거부하는 대신, 먹고도 사람에게 다가오지 않는 것으로 관계를 표현한다.
ENDINGS.work.body=()=>[`${foodLine()} ${CATe()} 내가 방에 들어간 뒤에야 밥그릇으로 왔다.`,'방문을 열고 이름을 불렀다. 거실 어딘가에서 소파가 한 번 삐걱였다. 그뿐이었다.','언제부터 문 앞에서 울지 않았더라. 기억이 나지 않는다.'];
ending = function(key){
  saveFound(key);const e=ENDINGS[key],cb=callback(key);
  show({id:'ending',tag:'열 번의 밤 이후',kicker:'내가 남긴 자리',title:e.title.replace(/^(배드엔딩|굿엔딩|노멀엔딩|히든엔딩|엔딩) · /,''),art:sceneEnding(key),paragraphs:e.body(),note:cb||'처음 문을 닫던 밤과 마지막 밤. 같은 문이었다.',extra:`<p class="muted">${CATw()} 함께 잔 밤 ${s.slept}번 · 찾은 엔딩 ${getFound().length} / ${TOTAL_ENDINGS}</p>`,buttons:[{label:'같은 밤을 보리의 쪽에서'.replace('보리',CAT),primary:true,fn:()=>otherSide()},{label:'다른 선택으로 다시 시작',subtle:true,fn:()=>goTitle()}]});
};
otherSide = function(){
  const items=s.hist.map((r,i)=>`<li>${doorIcon(r)}<div><small>${i+1}번째 밤${r.rain?' · 비':''}</small>${catSide(r,i)}</div></li>`).join('');
  show({id:'diary',tag:'문 너머의 열 밤',perspective:`${CAT}의 쪽`,kicker:'같은 선택을 다시 보며',title:'그날 나는 여기 있었다',art:`<div class="archive-view"><ol class="diary-list">${items}</ol></div>`,paragraphs:['내가 잠든 뒤에도, 문 반대편에는 밤이 이어졌다.',...reveals()],note:'내가 실제로 고른 선택에서 나온 열 번의 밤입니다.',buttons:[{label:'처음의 문으로 돌아간다',primary:true,fn:()=>goTitle()}]});
};
goTitle();
