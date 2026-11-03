/* v4의 규칙·그림 도구 위에서 경험을 확장한다. 외부 라이브러리 없음. */
const XS = { epoch:0, readyAt:0, actions:new Map(), serial:0, drag:null, dialog:null, screen:"title" };
const resetV4 = reset;
reset = function(){
  resetV4();
  s.experience = { firstCat:false, rain:false, quiet:false, awaySeen:false };
};
const action = fn => { const key = "a" + (++XS.serial); XS.actions.set(key,fn); return key; };
const buttonHTML = b => `<button data-action="${action(b.fn)}" data-epoch="${XS.epoch}" class="${b.primary?'primary':b.subtle?'subtle':''}" ${b.disabled?'disabled':''}>${b.label}${b.hint?`<small>${b.hint}</small>`:''}</button>`;
const spotHTML = b => `<button class="hotspot ${b.kind||''}" data-action="${action(b.fn)}" data-epoch="${XS.epoch}" ${b.gesture?`data-gesture="${b.gesture}"`:''} style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;" aria-label="${b.label}"></button>`;
function show(o){
  clearTimeout(hTimer);clearTimeout(XS.hintTimer);hTimer=null;
  XS.epoch++;const delay=o.minDelay||480;XS.readyAt=performance.now()+delay;XS.actions.clear();XS.drag=null;XS.screen=o.id||o.title;
  $app.dataset.ready='false';const epoch=XS.epoch;setTimeout(()=>{if(XS.epoch===epoch)$app.dataset.ready='true';},delay);
  const help = action(()=>openNote('선택과 조작',[
    '장면 속 사물에 마우스를 올리면 만질 수 있는 곳이 반응합니다. 터치로 선택할 수도 있습니다.',
    '문은 손잡이를 왼쪽으로 끌어 열 수 있습니다. 이불을 선택하면 덮어쓰고 잠을 청합니다.',
    '키보드로는 Tab으로 사물을 찾고 Enter로 선택합니다. 돌돌이는 Space나 Enter로 한 줄씩 밉니다.'
  ]));
  const restart = action(()=>openNote('이야기를 처음부터 시작할까요?',['이번 플레이의 선택 기록은 지워집니다. 이미 찾은 엔딩과 이름은 남습니다.'],()=>goTitle(),'처음부터 시작'));
  const stamp=o.stamp??(o.tag||'').split(' · ')[0];
  const artwork=`<div class="room-frame ${o.stageClass||''}" id="stage"><div class="artwork">${o.art||roomArt()}</div>${(o.spots||[]).map(spotHTML).join('')}${o.shade?'<div class="shade" style="--hes:3.4s"></div>':''}</div>`;
  if(o.isTitle){
    $app.innerHTML=`<section class="title-screen"><div class="title-picture">${artwork}</div><div class="title-menu"><h1>Cat at the Door</h1>${o.extra||''}<div class="actions">${(o.buttons||[]).map(buttonHTML).join('')}</div></div></section>`;
  }else{
    $app.innerHTML=`<div class="game-screen"><nav class="utilities" aria-label="게임 메뉴"><button data-action="${help}" data-epoch="${XS.epoch}" aria-label="도움말">?</button><button data-action="${restart}" data-epoch="${XS.epoch}" aria-label="처음으로">↶</button></nav><h2 id="storyHeading" class="sr-only" tabindex="-1">${o.title||stamp}</h2>${stamp?`<p class="time-stamp">${stamp}</p>`:''}${artwork}
      ${(o.paragraphs||[]).length?`<section class="dialogue">${o.paragraphs.map(t=>`<p>${t}</p>`).join('')}</section>`:''}${o.extra||''}<p id="stageNote" class="context-hint" aria-live="polite" hidden></p><div class="actions">${(o.buttons||[]).map(buttonHTML).join('')}</div></div>`;
    document.getElementById('storyHeading')?.focus({preventScroll:true});
  }
  window.scrollTo(0,0);
  if(o.after) o.after();
  const hint=o.hint||((o.spots||[]).length?o.note:null);
  if(hint)XS.hintTimer=setTimeout(()=>{if(XS.epoch===epoch)setNote(hint);},5000);
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
  if(d.kind==='umbrella'){
    d.progress=Math.max(0,Math.min(1,(e.clientX-d.x)/(width*.16)));
    const umbrella=document.getElementById('umbrella');if(umbrella)umbrella.style.transform=`rotate(${d.progress*32}deg)`;
  }else if(d.kind==='door'){
    const leaf=document.getElementById('doorLeaf'); if(leaf) leaf.style.transform=`scaleX(${1-d.progress*.75})`;
  }else{
    d.el.style.transform=`translate(${e.clientX-d.x}px,${e.clientY-d.y}px)`;
  }
});
$app.addEventListener('pointerup',e=>{
  const d=XS.drag;XS.drag=null;if(!d||d.epoch!==XS.epoch)return;
  const complete=d.kind==='door'||d.kind==='umbrella'?d.progress>.55:(d.distance||0)>40;
  if(complete){XS.skipClickUntil=performance.now()+200;runAction(d.el,{detail:1});}
  else{if((d.distance||0)>8)XS.skipClickUntil=performance.now()+200;d.el.style.transform='';const leaf=document.getElementById('doorLeaf');if(leaf)leaf.style.transform='';const umbrella=document.getElementById('umbrella');if(umbrella)umbrella.style.transform='';}
});
$app.addEventListener('pointercancel',()=>{if(XS.drag)XS.drag.el.style.transform='';XS.drag=null;const leaf=document.getElementById('doorLeaf');if(leaf)leaf.style.transform='';const umbrella=document.getElementById('umbrella');if(umbrella)umbrella.style.transform='';});
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
function setNote(text){const n=document.getElementById('stageNote');if(n){n.textContent=text;n.hidden=false;}}

/* 공간: 침대·닫힌 문·내일의 정장. 위치는 밤마다 유지한다. */
function roomArt(o={}){
  const rainy=o.rain ?? s.day===2, open=o.open||false, cat=o.cat||'', quiet=s.cold>=6;
  const lines=Array.from({length:9},(_,i)=>`<path d="M0,${182+i*3} H320 M${i*41},178 l-20,22" stroke="#503d3028" stroke-width=".6"/>`).join('');
  const rain=rainy?`<g class="rain">${Array.from({length:7},(_,i)=>`<path d="M${29+i*9},35 l-3,13" stroke="#d7e3e5" opacity=".5"/>`).join('')}</g>`:'';
  const door=open?`${doorOpen()}<path d="M216,176 L170,200 H320 L290,176" fill="#f8d89b" opacity=".14"/>`:
    `<rect x="214" y="42" width="78" height="138" rx="2" fill="#352e30"/><g id="doorLeaf" class="door-leaf">${doorClosed(quiet?0:s.cold>3?.4:1,quiet)}</g>`;
  const sleeping=cat==='bed'?`<g class="${o.entering?'cat-arrive':''}"><g class="breath">${catLoaf(110,127,.62)}</g></g>`:'';
  return V(`<defs><linearGradient id="nightWall" x2="0" y2="1"><stop stop-color="#3e525e"/><stop offset="1" stop-color="#293a48"/></linearGradient><radialGradient id="windowGlow"><stop stop-color="#eed9ad" stop-opacity=".13"/><stop offset="1" stop-color="#eed9ad" stop-opacity="0"/></radialGradient></defs>
    <rect width="320" height="200" fill="url(#nightWall)"/><circle cx="67" cy="58" r="108" fill="url(#windowGlow)"/>
    <path d="M0,178 H320" stroke="#b9a081" stroke-width="4"/>${floor()}${lines}
    <rect x="22" y="26" width="74" height="61" rx="2" fill="#152a40" stroke="#b29472" stroke-width="3"/>
    ${rainy?'':`<circle cx="76" cy="43" r="10" fill="var(--moon)"/><circle cx="82" cy="39" r="9" fill="#152a40"/><circle cx="36" cy="42" r=".8" fill="#fff0c7"/><circle cx="54" cy="65" r=".7" fill="#fff0c7"/>`}${rain}
    <path d="M59,27 v60 M23,57 H95" stroke="#b29472" stroke-width="2"/>
    <path d="M13,20 h10 v77 l-9,8z M96,20 h10 l-2,84 -8,-8z" fill="#809293"/>
    <rect x="118" y="27" width="32" height="29" rx="2" fill="#e4d7be"/><path d="M118,33 h32" stroke="#b58069" stroke-width="5"/>
    <text x="134" y="48" text-anchor="middle" font-size="9" fill="#4b4944">${Math.min(s.day+1,10)}일</text>
    <path d="M173,35 v35 M162,70 h23" stroke="#b9a28a" stroke-width="1.5"/><path d="M165,72 l8,-4 8,4 8,9 -5,20 -5,-2 v9 h-13 v-9 l-5,2 -5,-20z" fill="var(--suit)"/><path d="M167,73 l6,16 6,-16" fill="var(--shirt)"/>
    <ellipse cx="102" cy="180" rx="78" ry="9" fill="#554a40" opacity=".35"/>
    <rect x="13" y="124" width="153" height="48" rx="5" fill="#bda68c"/><rect x="13" y="111" width="12" height="65" rx="2" fill="#755b49"/>
    <rect x="23" y="119" width="140" height="43" rx="5" fill="var(--sheet)"/><ellipse cx="46" cy="122" rx="19" ry="10" fill="#eee5d2"/>
    ${drawHead(47,114,{closed:true,scale:10/14})}
    <g id="blanketCloth" class="${o.covered?'blanket-rise':''}"><path d="${o.covered?'M35,126 q62,-19 129,-5 v40 H35z':'M58,119 q50,-12 106,2 v40 H58z'}" fill="var(--blanket)"/><path d="${o.covered?'M40,133 q70,-13 122,-3':'M62,129 q55,-8 100,1'}" stroke="#b6c3b8" stroke-width="1" opacity=".55"/></g>
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

function titleArt(){
  return V(`<defs><radialGradient id="titleLight"><stop stop-color="#d3b984" stop-opacity=".25"/><stop offset="1" stop-color="#d3b984" stop-opacity="0"/></radialGradient></defs><rect width="320" height="200" fill="#192732"/><rect y="176" width="320" height="24" fill="#33404a"/><ellipse cx="170" cy="179" rx="108" ry="64" fill="url(#titleLight)"/><rect x="119" y="15" width="100" height="161" fill="#735843" stroke="#453b35" stroke-width="4"/><circle cx="202" cy="100" r="4" fill="#c6a16b"/><rect x="121" y="174" width="96" height="3" fill="#efd297"/><g class="paw-at-door"><ellipse cx="157" cy="178" rx="8" ry="3" fill="#c99b67"/><ellipse cx="177" cy="178" rx="8" ry="3" fill="#c99b67"/></g>`);
}
function storeArt(covered){
  const rain=Array.from({length:24},(_,i)=>`<path d="M${8+i*14},${(i%4)*23} l-9,28" stroke="#c4d2d9" stroke-width="1" opacity=".5"/>`).join('');
  return V(`<defs><mask id="rainMask"><rect width="320" height="200" fill="white"/>${covered?'<path d="M84,92 H190 L167,180 H64z" fill="black"/>':'<path d="M28,78 H133 L111,180 H5z" fill="black"/>'}</mask></defs>
    <rect width="320" height="200" fill="#203543"/><rect x="185" y="25" width="135" height="155" fill="#50626a"/><rect x="185" y="25" width="135" height="21" fill="#889c8c"/><text x="197" y="40" font-size="10" fill="#172d33">24시 편의점</text><rect x="199" y="59" width="107" height="120" fill="#d8be8b"/><path d="M249,60 v118" stroke="#6f7266" stroke-width="3"/><path d="M185,180 L121,200 H320 V180" fill="#ddc189" opacity=".15"/>
    <path d="M0,181 H320" stroke="#82908d" stroke-width="3"/><rect y="183" width="320" height="17" fill="#314851"/>
    ${person(64,181,{hoodie:true,face:covered?'neutral':'sad'})}<path d="M79,134 l8,9" stroke="var(--hoodie)" stroke-width="7" stroke-linecap="round"/><circle cx="87" cy="143" r="3.5" fill="var(--skin)"/>
    <g id="storeCat" class="${covered?'sheltered-cat':''}">${catSit(150,182,.48,{closed:!covered})}</g>
    <ellipse cx="142" cy="188" rx="23" ry="2" fill="#a2b5b5" opacity=".3"/>
    <g id="umbrella" class="${covered?'umbrella-tilt':''}"><path d="M81,78 L87,143 q4,9 10,4" stroke="#bdc0ba" stroke-width="2.5" fill="none"/><path d="M24,83 Q77,20 136,83 Q124,77 113,84 Q101,77 90,83 Q78,76 67,83 Q55,77 44,84 Q34,78 24,83z" fill="#6b929a"/><path d="M81,53 L67,83 M81,53 L90,83 M81,53 L113,84" stroke="#b7cac2" opacity=".5" fill="none"/></g>
    <g class="rain" mask="url(#rainMask)">${rain}</g>${covered?'<path d="M125,153 l2,7 M145,157 l1,7" stroke="#c5dce0" opacity=".5"/>':''}`);
}
function homeArt(o={}){
  const furSpots=[[127,132],[143,117],[181,154],[166,139],[192,123],[150,158],[136,170],[190,173],[155,129],[178,118],[201,143],[207,162],[174,169],[125,151],[163,175],[189,143],[145,144],[173,157],[202,128],[135,120],[155,169],[180,133],[210,151],[139,161]];
  const fur=furSpots.map(([x,y],i)=>`<path d="M${x},${y} q1.5,-1.5 3.5,.5" transform="rotate(${(i%5)*32} ${x} ${y})" stroke="var(--fur)" stroke-width=".85" stroke-linecap="round" fill="none"/>`).join('');
  return V(`<rect width="320" height="200" fill="#867b69"/><rect x="19" y="21" width="64" height="68" fill="#243c50" stroke="#bb9f77" stroke-width="3"/><circle cx="63" cy="40" r="8" fill="#dfc58f"/><path d="M50,22 v67" stroke="#bb9f77" stroke-width="2"/><rect y="177" width="320" height="23" fill="#a18a6b"/>
    <rect x="234" y="93" width="81" height="8" fill="#745a44"/><path d="M243,101 v77 M303,101 v77" stroke="#745a44" stroke-width="5"/><path d="M253,89 v-34 h48 v34" fill="#353d40"/><rect x="257" y="59" width="40" height="28" fill="#d4cbbb"/><path d="M262,66 h22 M262,71 h29 M262,76 h18" stroke="#837f74" stroke-width="1"/>
    <g id="wallSwitch"><rect x="93" y="59" width="14" height="22" rx="2" fill="#c7bca1"/><rect x="97" y="63" width="6" height="13" rx="1" fill="#e9dfc7"/><path d="M97,69 h6" stroke="#b3a78d"/></g><rect x="158" y="76" width="15" height="22" rx="2" fill="var(--skin)"/>
    <path d="M112,111 Q125,85 150,85 H180 Q207,87 219,113 L227,199 H103z" fill="var(--hoodie)"/>
    <path d="M141,87 Q165,112 190,87 M143,144 h43 v25 h-43z" stroke="#7e7b79" stroke-width="3" fill="none"/><path d="M159,103 v20 M174,103 v20" stroke="#e1d7c5" stroke-width="2"/>
    ${drawHead(165,60,{scale:1.65,face:o.fur?'happy':'neutral',closed:o.dark})}
    <g id="pettingHand" class="${o.fur?'petting-hand':''}"><path d="M204,110 q22,20 16,48" stroke="var(--hoodie)" stroke-width="17" fill="none" stroke-linecap="round"/><ellipse cx="220" cy="160" rx="8" ry="5" fill="var(--skin)"/></g>
    <g id="homeCat" class="${o.fur?'cat-rubs':''}">${catSit(240,186,.82,{closed:o.fur,wag:!o.dark})}</g>
    ${o.fur?`<g id="hoodieFur" class="fur-appears">${fur}</g>`:''}
    ${o.named?`<text class="name-call" x="114" y="50" font-size="11" fill="#fff0ce">${CAT}…?</text>`:''}
    ${o.dark?'<rect width="320" height="200" fill="#0e1926" opacity=".65"/>':''}`);
}
function jobMessageArt(){
  return V(`<rect width="320" height="200" fill="#514e47"/><path d="M0,170 H320 V200 H0z" fill="#a08b6c"/><rect x="109" y="9" width="105" height="181" rx="13" fill="#263039" stroke="#b5aa95" stroke-width="1.5"/><rect x="116" y="25" width="91" height="146" rx="5" fill="#e6dfcc"/><rect x="145" y="15" width="31" height="3" rx="2" fill="#8d9996"/>
    <text x="127" y="47" font-size="8" fill="#706b60">채용 담당자</text><path d="M126,57 h71" stroke="#b8b0a0"/><text x="126" y="79" font-size="13" fill="#376953">최종 합격</text><text x="126" y="101" font-size="8" fill="#494941">${ME} 님,</text><text x="126" y="115" font-size="8" fill="#494941">입사를 축하드립니다.</text><text x="126" y="139" font-size="7" fill="#494941">첫 출근: 다음 주 월요일</text><text x="126" y="152" font-size="7" fill="#494941">단정한 정장 착용</text>`);
}
function prepArt(){
  return V(`<rect width="320" height="200" fill="#68716c"/>${floor()}${wardrobe()}<path d="M214,43 l-22,12 h44z" fill="none" stroke="#cfc2a7" stroke-width="2"/><path d="M193,55 l-13,8 -6,64 15,1 6,-36 v55 h42 v-55 l6,36 15,-1 -6,-64 -15,-8z" fill="var(--suit)"/><path d="M206,56 l8,24 8,-24" fill="#eee6d8"/>
    <path d="M160,150 h43 l9,14 v12 h-60 v-12z" fill="var(--hoodie)"/><path d="M173,150 q9,10 19,0" stroke="#d0c8ba" fill="none" stroke-width="2"/>${Array.from({length:9},(_,i)=>`<path d="M${160+i*4},${159+(i%3)*5} l4,2" stroke="var(--fur)" stroke-width="1.5"/>`).join('')}${person(67,178,{hoodie:true,fur:10})}${catSit(114,179,.5)}`);
}
function umbrellaCover(){
  show({id:'umbrella-result',stamp:'작년 겨울',title:'우산 아래로 들어온 고양이',minDelay:1800,art:storeArt(true),spots:[{label:'고양이를 데려간다',x:34,y:60,w:23,h:34,kind:'cat-control',fn:adoptCat}],hint:'비를 피한 고양이가 이쪽을 올려다봅니다.'});
}
function adoptCat(){
  show({id:'cat-name',stamp:'그날 밤',title:'고양이에게 이름을 붙인다',art:homeArt(),extra:`<form class="naming-form" onsubmit="event.preventDefault();nameCat()"><label for="cname">이름을 뭐라고 부를까?</label><input id="cname" maxlength="6" placeholder="보리" autocomplete="off"><button type="submit">불러본다</button></form>`});
}
function nameCat(){
  if(XS.screen!=='cat-name'||performance.now()<XS.readyAt)return;
  const raw=document.getElementById('cname').value.trim();CAT=esc(raw||'보리');try{localStorage.setItem('catgame-names',JSON.stringify({me:XS.rawMe||'',cat:raw}));}catch(_){}
  prologue(1);
}
function hoodiePet(){
  show({id:'hoodie-result',stamp:'그해 겨울',title:'회색 후드티에 남은 털',minDelay:1600,art:homeArt({fur:true}),spots:[{label:'불을 끄고 같이 잔다',x:26,y:25,w:12,h:22,kind:'switch-control',fn:homeSleep}],hint:'벽의 전등 스위치를 끌 수 있습니다.'});
}
function homeSleep(){
  show({id:'home-sleep',stamp:'그해 겨울',title:'함께 잠든 밤',art:homeArt({fur:true,dark:true}),minDelay:2300});
  hTimer=setTimeout(()=>{if(XS.screen==='home-sleep')prologue(2);},2300);
}
function beforeFirstNight(){
  show({id:'first-door',stamp:'첫 출근 전날 밤',title:'처음 방문을 닫는 밤',art:roomArt({open:true,cat:'door'}),spots:[{label:'방문을 닫는다',x:67,y:22,w:26,h:65,kind:'door-control',fn:()=>{
    show({id:'first-door-closed',stamp:'첫 출근 전날 밤',title:'닫힌 문 너머의 고양이',art:roomArt(),stageClass:'first-door-closed',minDelay:1500});
    hTimer=setTimeout(()=>{if(XS.screen==='first-door-closed')night();},1500);
  }}],hint:'내일 아침 알람은 여섯 시 반으로 맞춰 두었습니다.'});
}

/* 시작과 프롤로그: 사물의 변화가 다음 행동으로 이어진다. */
goTitle = function(){
  reset();let saved={};try{saved=JSON.parse(localStorage.getItem('catgame-names')||'{}')||{};}catch(_){}
  show({id:'title',isTitle:true,art:titleArt(),extra:`<div class="names"><label>내 이름<input id="pname" maxlength="6" placeholder="김신입" value="${esc(saved.me||'')}" autocomplete="off"></label></div>`,buttons:[{label:'시작',fn:()=>startGame(false)}]});
};
startGame = function(skip){
  const p=document.getElementById('pname').value.trim();
  ME=esc(p||'김신입');CAT='보리';XS.rawMe=p;try{localStorage.setItem('catgame-names',JSON.stringify({me:p}));}catch(_){}
  skip?night():prologue(0);
};
prologue = function(i){
  if(i===0)return show({id:'prologue-0',stamp:'작년 겨울',title:'비 오는 편의점 앞',art:storeArt(false),paragraphs:['서른한 번째 불합격 문자가 왔다.'],hint:'우산을 고양이 쪽으로 기울여 보세요.',spots:[{label:'우산을 기울여 준다',x:10,y:20,w:37,h:44,gesture:'umbrella',kind:'umbrella-control',fn:umbrellaCover}]});
  if(i===1)return show({id:'prologue-1',stamp:'그해 겨울',title:'집에서 함께 보내는 시간',art:homeArt({named:true}),hint:'곁에 온 고양이에게 손을 내밀어 보세요.',spots:[{label:'고양이를 쓰다듬는다',x:57,y:48,w:25,h:44,gesture:'pet',kind:'cat-control',fn:hoodiePet}]});
  if(i===2)return show({id:'prologue-2',stamp:'지난주',title:'합격 문자',art:jobMessageArt(),spots:[{label:'합격 문자를 내려놓는다',x:33,y:8,w:35,h:85,kind:'phone-control',fn:()=>prologue(3)}],hint:'문자를 읽었다면 휴대폰을 내려놓으세요.'});
  show({id:'prologue-3',stamp:'첫 출근 전날',title:'내일 입을 정장을 준비한다',art:prepArt(),hint:'내일 입을 정장을 확인해 보세요.',spots:[{label:'정장을 준비한다',x:50,y:15,w:34,h:63,kind:'suit-control',fn:beforeFirstNight}]});
};
night = function(){
  if(s.day>=10)return payday();
  if(s.day===2&&!s.experience.rain)return rainyNight();
  if(s.day>=6&&s.cold>=4&&!s.experience.quiet)return quietNight();
  const away=s.cold>=6,cmp=compareLine();
  show({id:'night',stamp:s.day===0?'첫 출근 전날 밤':`${s.day+1}일째 밤`,title:away?'오늘은 오지 않았다':'방문 앞의 고양이',art:roomArt(),
    paragraphs:s.day===0?[]:[NIGHTS[s.day],`${cmp?cmp+' ':''}${cryLine()}`],hint:s.day===0?'문손잡이를 당기거나, 이불을 덮을 수 있습니다.':undefined,
    spots:[
      {label:away?`${CATo()} 찾아 함께 잔다`:`${CATo()} 들이고 같이 잔다`,x:68,y:27,w:23,h:60,gesture:'door',kind:'door-control',fn:()=>choose(true)},
      {label:'문을 닫아 두고 혼자 잔다',x:18,y:58,w:33,h:24,kind:'blanket-control',fn:()=>hesitate()}
    ]});
};
hesitate = function(){
  const away=s.cold>=6;
  show({id:'hesitate',stamp:s.day===0?'첫 출근 전날 밤':`${s.day+1}일째 밤`,title:away?'조용한 이불 속':'눈을 감아도 들린다',art:roomArt({covered:true}),shade:true,
    paragraphs:[],
    spots:[{label:away?'…일어나서 찾는다':'…그래도 문을 연다',x:66,y:27,w:29,h:62,kind:'hesitate-door',fn:()=>choose(true,true)}]});
  hTimer=setTimeout(()=>{hTimer=null;choose(false);},3400*HES);
};
choose = function(sleep,late=false){
  clearTimeout(hTimer);hTimer=null;
  s.prevLevel=cryLevel(s.cold);
  const rec={open:sleep,late,cold:s.cold,rain:s.day===2,toy:false,place:''};s.hist.push(rec);
  if(sleep){
    const wasCold=s.cold>=6;rec.place=wasCold?'sofa':'bed';s.slept++;s.cold=Math.max(0,s.cold-2);s.memo='slept';s.streak=0;
    show({id:'together',stamp:s.day===0?'첫 출근 전날 밤':`${s.day+1}일째 밤`,title:'함께 잠든 밤',minDelay:1500,art:wasCold?livingArt({where:'sofa',sleep:true}):roomArt({open:true,cat:'bed',entering:true}),paragraphs:wasCold?[openLine(wasCold,late)]:[],buttons:[{label:'아침을 맞는다',fn:()=>morningWork([],true,false)}]});return;
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
