// Node test of the real v4 rules and rendered action dispatch. Browser layout is checked separately.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function game(){
  let now=0,serial=0;
  const timers=new Map(),nodes=new Map(),storage=new Map(),listeners=new Map();
  function node(id){
    if(!nodes.has(id))nodes.set(id,{id,value:'',disabled:false,innerHTML:'',textContent:'',style:{},dataset:{},classList:{add(){}},focus(){},insertAdjacentHTML(){},addEventListener(k,fn){listeners.set(id+':'+k,fn);},setAttribute(){},querySelector(sel){return node(sel==='.actions button'?'rollDone':sel);},getBoundingClientRect(){return {left:0,top:0,width:640,height:400};}});
    return nodes.get(id);
  }
  const ctx=vm.createContext({document:{getElementById:node,activeElement:node('heading'),body:{appendChild(){}},createElement:()=>node('dialog')},window:{scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},performance:{now:()=>now},setTimeout:(fn,delay=0)=>{const k=++serial;timers.set(k,{fn,at:now+Math.max(0,delay)});return k;},clearTimeout:k=>timers.delete(k),console});
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts=[...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)];
  for(const [,src,inline] of scripts)vm.runInContext(src?fs.readFileSync(path.join(root,src),'utf8'):inline,ctx);
  const read=expr=>vm.runInContext(expr,ctx);
  const plain=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  function buttons(){return [...node('app').innerHTML.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(m=>({key:m[1].match(/data-action="([^"]+)"/)?.[1],epoch:Number(m[1].match(/data-epoch="([^"]+)"/)?.[1]),disabled:/\sdisabled\b/.test(m[1]),submit:/type="submit"/.test(m[1]),hotspot:/class="hotspot\b/.test(m[1]),visibleText:plain(m[2]),text:m[1].match(/aria-label="([^"]+)"/)?.[1]||plain(m[2])})).filter(b=>b.key||b.submit);}
  function advance(ms=600){
    const until=now+ms;
    for(let count=0;count<10000;count++){
      const next=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
      if(!next){now=until;return;}
      const [id,timer]=next;timers.delete(id);now=timer.at;timer.fn();
    }
    throw Error('Fake timer loop did not settle');
  }
  function press(text,{advance=true,detail=1,epoch}={}){
    const b=buttons().find(b=>b.text.includes(text));assert.ok(b,`Missing action ${text} on ${read('XS.screen')}`);
    if(advance)waitReady();
    if(b.submit){assert.match(node('app').innerHTML,/onsubmit="event.preventDefault\(\);nameCat\(\)"/);return read('nameCat()');}
    ctx.input={disabled:b.disabled&&!b.text.startsWith('다 뗐다'),dataset:{action:b.key,epoch:epoch??b.epoch}};
    read(`runAction(input,{detail:${detail}})`);
  }
  function waitReady(){advance(Math.max(1,read('XS.readyAt')-now+1));}
  function flush(){advance(4000);}
  return {read,press,flush,buttons,advance,waitReady,node,html:()=>node('app').innerHTML,visibleText:()=>plain(node('app').innerHTML),fire:(type,event)=>listeners.get('app:'+type)(event)};
}
function play(g,mask,roller,hoodie,skipRoller=false){
  // The introduction has its own timed presentation tests below.
  g.read('reset();night()');
  for(let steps=0;steps<180;steps++){
    const screen=g.read('XS.screen'),day=g.read('s.day'),open=!!(mask&(1<<day));
    if(screen==='ending')return {ending:g.read('endingKey()'),days:g.read('s.day'),history:g.read('s.hist.length'),cold:g.read('s.cold')};
    if(screen==='night')g.press(open?(g.buttons().some(b=>b.text.includes('들이고 같이'))?'들이고 같이':'찾아 함께'):'혼자 잔다');
    else if(screen==='hesitate')g.flush();
    else if(screen==='rain-search')g.press('커튼 뒤');
    else if(screen==='rain-found')g.press(open?'방문을 열고':'방으로 돌아가');
    else if(screen==='quiet-house')g.press('방으로 들어간다');
    else if(screen==='cat-toy')g.press('인형을 문 밑');
    else if(screen==='cat-closet')g.press('옷장으로');
    else if(screen==='cat-rest')g.press('아침이 온다');
    else if(screen==='closet-discover')g.press('옷장 문을 연다');
    else if(screen==='closet-choice')g.press(hoodie?'회색 후드티':'정장을 걸고');
    else if(screen==='closet-result')g.press('출근 준비');
    else if(screen==='roller-offer')g.press(roller?'돌돌이를 산다':'이번에는 사지');
    else if(screen==='roller'){
      if(skipRoller)g.press('손으로 털고');
      else{g.read('while(RL.left>0)rollBand()');g.press('다 뗐다');}
    }
    else if(screen==='together')g.press('아침을 맞는다');
    else if(screen==='ceo-arrival')g.press(g.buttons().some(b=>b.text.includes('휴대폰'))?'휴대폰 사진':'자리로 돌아간다');
    else if(screen==='ceo-phone')g.press('내 자리로');
    else if(screen==='work-result'){
      const b=g.buttons().filter(b=>!['도움말','처음으로'].includes(b.text))[0];g.press(b.text);
    }
    else if(screen==='payday')g.press(g.buttons().some(b=>b.text.includes('빈손'))?'빈손':'저렴한 사료');
    else if(screen==='final-night'){
      const b=g.buttons().find(b=>b.text.includes('방문을')||b.text.includes('문을 열고'));g.press(b.text);
    }
    else throw Error(`Unexpected screen ${screen}`);
  }
  throw Error('Flow did not finish');
}
test('the shared head helper loads after the engine and before the experience',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts=[...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)];
  assert.deepEqual(scripts.map(m=>m[1]||'inline'),['inline','character.js','experience.js']);
  const g=game();assert.equal(g.read('typeof drawHead'),'function');
});
test('the title has one title, the player name, and start; cat naming comes after rescue',()=>{
  const g=game();
  assert.equal(g.visibleText(),'Cat at the Door 내 이름 시작');
  assert.doesNotMatch(g.html(),/id="cname"|INTERACTIVE STORY|같은 문 앞에서|한 사람과 한 고양이|내 생활을 지키는|열 번의 밤/);
  assert.equal(g.buttons().length,1);
  g.node('pname').value='하늘';g.press('시작');
  assert.equal(g.read('XS.screen'),'prologue-0');assert.equal(g.read('ME'),'하늘');
  g.press('우산을 기울여');assert.equal(g.read('XS.screen'),'umbrella-result');
  assert.match(g.html(),/class="umbrella-tilt"/);assert.match(g.html(),/class="sheltered-cat"/);
  g.press('고양이를 데려간다',{advance:false});assert.equal(g.read('XS.screen'),'umbrella-result');
  g.advance(1799);g.press('고양이를 데려간다',{advance:false});assert.equal(g.read('XS.screen'),'umbrella-result');
  g.advance(1);g.press('고양이를 데려간다',{advance:false});assert.equal(g.read('XS.screen'),'cat-name');
  assert.match(g.html(),/id="cname"/);assert.doesNotMatch(g.html(),/id="pname"/);
  g.node('cname').value='두부';g.press('불러본다');
  assert.equal(g.read('CAT'),'두부');assert.equal(g.read('XS.screen'),'prologue-1');
  assert.match(g.html(),/두부…\?/);
});
test('fur, sleeping, and the first closed door remain visible before the next scene',()=>{
  const g=game();g.read('prologue(1)');
  assert.doesNotMatch(g.html(),/id="hoodieFur"/);
  g.press('고양이를 쓰다듬는다');assert.equal(g.read('XS.screen'),'hoodie-result');
  assert.match(g.html(),/id="hoodieFur" class="fur-appears"/);
  g.advance(1599);g.press('불을 끄고 같이 잔다',{advance:false});assert.equal(g.read('XS.screen'),'hoodie-result');
  g.advance(1);g.press('불을 끄고 같이 잔다',{advance:false});assert.equal(g.read('XS.screen'),'home-sleep');
  g.advance(2299);assert.equal(g.read('XS.screen'),'home-sleep');
  g.advance(1);assert.equal(g.read('XS.screen'),'prologue-2');
  g.press('합격 문자를 내려놓는다');assert.equal(g.read('XS.screen'),'prologue-3');
  g.press('정장을 준비한다');assert.equal(g.read('XS.screen'),'first-door');
  g.press('방문을 닫는다');assert.equal(g.read('XS.screen'),'first-door-closed');
  g.advance(1499);assert.equal(g.read('XS.screen'),'first-door-closed');
  g.advance(1);assert.equal(g.read('XS.screen'),'night');assert.equal(g.read('s.hist.length'),0);
});
test('scene objects have accessible names without visible button labels',()=>{
  const g=game();
  for(const screen of ['prologue(0)','prologue(1)','hoodiePet()','beforeFirstNight()','night()']){
    g.read(screen);
    const targets=g.buttons().filter(b=>b.hotspot);assert.ok(targets.length,screen);
    for(const target of targets){assert.equal(target.visibleText,'',target.text);assert.ok(target.text.length>0);}
    assert.match(g.html(),/<h2 id="storyHeading" class="sr-only"/);
    assert.match(g.html(),/<p id="stageNote"[^>]* hidden>/);
    assert.doesNotMatch(g.html(),/class="masthead"|class="eyebrow"|class="chapter"|나의 쪽|문이 닫히기 전/);
  }
  g.read('night()');assert.equal(g.buttons().filter(b=>b.hotspot).length,2);
  assert.match(g.visibleText(),/첫 출근 전날 밤/);
});
test('input lock rejects rapid clicks, stale screens, and a double-click',()=>{
  const g=game();g.press('시작');assert.equal(g.read('XS.screen'),'prologue-0');
  g.press('우산을 기울여',{advance:false});assert.equal(g.read('XS.screen'),'prologue-0');
  g.press('우산을 기울여',{detail:2});assert.equal(g.read('XS.screen'),'prologue-0');
  g.press('우산을 기울여',{epoch:0});assert.equal(g.read('XS.screen'),'prologue-0');
  g.press('우산을 기울여');assert.equal(g.read('XS.screen'),'umbrella-result');
});
test('cat perspective cannot repair the relationship by itself',()=>{
  const g=game();g.read('reset();s.cold=3');
  const before=g.read('s.cold');g.read("catMoment({place:'door',rain:false},()=>{})");g.press('인형을 문 밑');
  assert.equal(g.read('s.cold'),before);assert.equal(g.read('XS.screen'),'cat-rest');
});
test('a cancelled short drag does not turn into a click on the next action',()=>{
  const g=game();g.read('night()');g.advance();
  const b=g.buttons().find(b=>b.text.includes('들이고 같이'));
  const el={disabled:false,dataset:{action:b.key,epoch:b.epoch,gesture:'door'},style:{},setPointerCapture(){}};
  const target={closest:()=>el};
  g.fire('pointerdown',{target,button:0,clientX:600,clientY:120,pointerId:1});
  g.fire('pointermove',{clientX:590,clientY:120});
  g.fire('pointerup',{});
  g.fire('click',{target,detail:1,preventDefault(){}});
  assert.equal(g.read('XS.screen'),'night');assert.equal(g.read('s.hist.length'),0);
  g.advance();g.fire('click',{target,detail:1,preventDefault(){}});
  assert.equal(g.read('XS.screen'),'together');assert.equal(g.read('s.hist.length'),1);
});
test('complete playthroughs keep ten nights and reach all seven endings',()=>{
  const g=game(),found=new Set();
  for(let mask=0;mask<1024;mask++){
    const result=play(g,mask,!!(mask%3),!!(mask%2));
    assert.equal(result.days,10);assert.equal(result.history,10);found.add(result.ending);
  }
  assert.deepEqual([...found].sort(),['boss','broke','good','hoodie','mid','secret','work']);
});
test('skipping the roller on the CEO day uses no refill',()=>{
  const g=game();g.read('reset();s.day=5;s.roller=true;s.pend=[];rollerMorning(true)');
  g.press('손으로 털고');assert.equal(g.read('s.refills'),0);assert.equal(g.read('XS.screen'),'ceo-arrival');
  g.press('휴대폰 사진');assert.equal(g.read('XS.screen'),'ceo-phone');
  assert.equal(g.read('s.bossCat'),true);
});
