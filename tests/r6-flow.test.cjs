const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {game,Life,Story,fixture,read,clean,pour}=require('./r5-helpers.cjs');
const {simulate}=require('../tools/r6-balance.cjs');

test('R6-25/27 storm save resumes, actual curtain endpoints close, room stays reachable, next morning reopens',async()=>{
 const s=fixture(3);s.revision=5;const g=await game({state:s,scene:'living',hero:{x:450,y:315},curtainClosed:false});
 g.target('흔들리는 창문');assert.equal(g.snap().mini,'curtain');const p=g.snap().miniTool,t=g.snap().miniTarget;
 g.drag([p.x,p.y],[t.x,t.y],1.4);read(g,'내 일을');assert.equal(g.snap().state.windowClosed,true);assert.equal(g.snap().state.curtainClosed,true);
 g.toRoom('bedroom');assert.equal(g.snap().scene,'bedroom');g.click('menuButton');g.click('saveExitButton');g.click('continueButton');g.toRoom('living');
 const saved=g.snap().state;Life.act(saved,'feed');Life.act(saved,'water');Life.act(saved,'play');Life.sleep(saved,true);assert.equal(saved.curtainClosed,false);assert.equal(saved.curtainReason,null);
 const h=await game({state:saved,scene:'living'});h.target('커튼을 닫거나');read(h,'커튼을 닫는다');h.button('miniActions','키보드로');h.step(1.4);assert.equal(h.snap().state.curtainReason,'manual');
 h.target('커튼을 연다');read(h,'커튼을 연다');const a=h.snap().miniTool,b=h.snap().miniTarget;h.drag([a.x,a.y],[b.x,b.y],1.4);assert.equal(h.snap().state.curtainClosed,false);
});

test('R6-16 picking up scoop cannot remove clumps; all clumps live inside safe soil',async()=>{
 const s=fixture();s.litterDirty=12;const g=await game({state:s});g.target('모래를');const m=g.capture().mini;
 for(const c of m.clumps){assert.ok(c.x>m.safe.x&&c.x<m.safe.x+m.safe.w);assert.ok(c.y>m.safe.y&&c.y<m.safe.y+m.safe.h);assert.ok(Math.hypot(c.x-m.p.x,c.y-m.p.y)>65);}
 g.pointer('pointerdown',m.p.x,m.p.y);g.pointer('pointermove',m.p.x+1,m.p.y);assert.equal(g.snap().clumps.filter(c=>c.removed).length,0);g.pointer('pointerup',m.p.x,m.p.y);clean(g);assert.equal(g.snap().state.litterDirty,0);
});

test('R6-12 stable fit and DOM reservation on narrow and wide viewports',async()=>{
 for(const innerWidth of [390,1000]){const g=await game({state:fixture()}, {innerWidth,innerHeight:900});const width=g.get('gameScreen').style['--play-width'];g.click('routineToggle');g.target('쓰다듬');assert.equal(g.get('gameScreen').style['--play-width'],width);g.click('miniExit');g.step(.5);g.click('foodLabel',2);g.target('건사료 12,000');assert.equal(g.get('gameScreen').style['--play-width'],width);}
 const css=fs.readFileSync(path.join(__dirname,'../src/life.css'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.match(css,/\.status-area\{height:216px;position:relative/);assert.match(html,/<div class="status-area">/);assert.match(css,/#routineChecklist\{position:absolute/);
});

test('R6-01 actual WAV is decoded only after gesture; buzz buffer start and visual marker coincide without audio device',async()=>{
 const g=await game(null,{autoStart:false});assert.equal(g.audio.constructors,0);assert.equal(g.audio.starts,0);g.start();await new Promise(resolve=>setImmediate(resolve));
 for(let i=0;i<20&&g.snap().black;i++){g.step(.4);g.key('Enter');}g.step(.4);assert.equal(g.snap().intro,'bedPhone');assert.ok(g.snap().phoneBuzz);assert.equal(g.audio.decoded,1);assert.equal(g.audio.buzzStarts,1);
 const wav=fs.readFileSync(path.join(__dirname,'../assets/audio/phone-vibration.wav'));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.ok(wav.length>44000);assert.equal(wav.readUInt32LE(24),22050);
});

test('R6-29 thirst wins over play in line, choice, actual water and midnight lighting state',async()=>{
 const s=fixture();s.needs.fed=true;s.waterLevel=0;Life.sleep(s,true);const g=await game({state:s,nightScene:true,nightData:s.lastNight});g.step(1);assert.match(g.snap().dialogue.text,/물그릇/);read(g,'물을 담아');assert.equal(g.snap().mini,'water');assert.equal(g.capture().timeVisualMinute,160);pour(g);assert.equal(g.snap().state.nightIssue.thirst,false);assert.ok(g.snap().state.lastNight.nightCare.some(c=>c.type==='water'));
 assert.match(Story.nightLine(s,'thirst'),/물/);assert.doesNotMatch(Story.nightLine(s,'thirst'),/놀/);
});

test('R6-28 hoodie cat view retains cat frame until fade switches atomically into morning',async()=>{
 const s=fixture(5,'morning');s.hoodie=true;s.needs.fed=true;const g=await game({state:s,catControl:true,catStage:'scent',catOldDay:4,scene:'living'});g.target('옷 냄새',2.05);assert.equal(g.snap().catControl,true);assert.equal(g.snap().heroOnBed,false);g.step(1.3);assert.equal(g.snap().catControl,false);assert.equal(g.snap().scene,'bedroom');assert.equal(g.snap().bedStage,'waking');
});

test('R6-18/19 live purchases, supplies, cleaning and all five owners survive save/resume',async()=>{
 const s=fixture();s.cash=250000;s.food=30;const g=await game({state:s});g.click('foodLabel',2);g.target('생활 가전');g.button('choices','자동 화장실');read(g,'구매한다');read(g);assert.equal(g.snap().state.equipment.autoLitter,true);
 for(const id of ['feeder','fountain','robot','premiumToy'])assert.equal(Life.act(g.capture().s,'buyEquipment',{id}).ok,true);
 g.target('장보기를 마치고',2);g.target('급식기를');read(g);assert.ok(g.snap().state.supplies.feeder>0);g.target('정수기를');read(g);assert.equal(g.snap().state.supplies.fountain,4);
 const a=g.capture().s;a.floor={fur:8,dust:8};g.target('바닥의 털을 쓴다');let m=g.capture().mini;g.pointer('pointerdown',m.p.x,m.p.y);for(const p of m.patches)g.pointer('pointermove',p.x,p.y);g.pointer('pointerup',400,275);g.step(1.5);read(g);assert.equal(g.snap().state.floor.fur,0);
 g.target('물걸레로');m=g.capture().mini;g.pointer('pointerdown',m.p.x,m.p.y);for(const p of m.patches)g.pointer('pointermove',p.x,p.y);g.pointer('pointerup',400,275);g.step(1.5);read(g);assert.equal(g.snap().state.floor.dust,0);
 g.click('menuButton');g.click('saveExitButton');g.click('continueButton');assert.ok(Object.values(g.snap().state.equipment).every(Boolean));assert.equal(g.snap().state.supplies.fountain,4);
});

test('R6-18 equipment has bounded food/water/bin effects and never grants affection',()=>{
 const s=fixture();s.cash=300000;s.food=40;const trust=s.trust;for(const id of Object.keys(Life.EQUIPMENT))assert.ok(Life.act(s,'buyEquipment',{id}).ok);assert.equal(s.trust,trust);assert.equal(s.needs.comfort,false);
 Life.act(s,'refillFeeder');Life.act(s,'refillFountain');const stock=s.food,stored=s.supplies.feeder;Life.autoCare(s);assert.equal(s.food,stock);assert.equal(s.supplies.feeder,stored);s.litterDirty=12;Life.autoCare(s);assert.equal(s.bins.litter,8);assert.equal(s.litterDirty,4);Life.act(s,'emptyAutoLitter');assert.equal(s.litterDirty,0);
 s.floor={fur:9,dust:9};Life.act(s,'emptyRobot');assert.equal(s.floor.fur,5);assert.equal(s.floor.dust,6);assert.equal(s.trust,trust);assert.equal(Life.duration(s,'play'),16);s.toy.premium=0;s.toy.basic=1;assert.equal(Life.duration(s,'play'),95);s.toy.basic=0;assert.equal(Life.act(s,'play').reason,'brokenToy');
});

test('R6-24 skipped litter affects clothes and actual contract; clean/air/fresh clothes recover',()=>{
 const s=fixture();s.needs={fed:true,played:true,comfort:true};s.waterLevel=3;s.day=2;s.litterDirty=2;Life.sleep(s,true);Life.act(s,'dress');s.hasBag=true;Life.act(s,'leaveHome');const c=Story.customers(s)[0];Life.beginConsultation(s,c);c.correct.forEach(a=>Life.answerConsultation(s,a));assert.equal(s.consultations[0].contract,false);assert.match(s.consultations[0].reasons.join(''),/냄새/);
 s.day=4;s.phase='evening';s.minute=1200;Life.act(s,'litter');Life.act(s,'ventilate');Life.act(s,'ventilate');Life.act(s,'freshen');assert.equal(s.odor,0);assert.equal(s.clothesOdor.suit,0);
});

test('R6-06/07/14/22/26/30 exact rescue, placeholder, money wording, wet food, natural varied colleague and personalized rejection',()=>{
 assert.match(fs.readFileSync(path.join(__dirname,'../src/life-game.js'),'utf8'),/너도 참 기구한 신세로구나\./);assert.match(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),/id="catName" placeholder="보리"/);
 const s=fixture();s.favoriteFood=2;s.food=3;Life.act(s,'feed',{kind:'favorite'});assert.equal(s.lastFoodKind,'favorite');assert.equal(s.mealKinds.evening,'favorite');assert.match(Story.message(s,'rejection').messages[0],/하늘님/);const all=new Set();for(let day=1;day<=12;day++){s.day=day;all.add(Story.dialogue(s,'peer').map(l=>l.text).join(''));}assert.ok(all.size>=5);assert.equal(Life.create('  ','').me,'김신입');assert.equal(Life.create('가나다라마바사아자차','').me.length,8);
});

test('R6-17 complete 13-day policies expose cost, recoverable neglect and actual investment time savings',()=>{
 const [n,m,e,p]=['neglect','manual','efficient','priority'].map(policy=>simulate(policy));for(const run of [n,m,e,p]){assert.equal(run.rows.length,13);assert.equal(run.summary.consultations,20);assert.ok(run.summary.balance>=0);}assert.equal(p.summary.contracts,20);assert.ok(m.summary.lateMinutes>p.summary.lateMinutes);assert.ok(n.summary.wakeNights>p.summary.wakeNights);assert.ok(p.summary.earned>n.summary.earned);assert.ok(p.rows.at(-1).equipment.length>=4);assert.equal(p.rows.at(-1).late,0);assert.equal(e.summary.contracts,20);assert.equal(e.summary.earned,320000);assert.equal(e.summary.lateDays,0);assert.ok(e.summary.houseworkMinutes>p.summary.houseworkMinutes);const optional=simulate('priority',{extraDays:[3,4,8,10]});assert.equal(optional.rows.at(-1).equipment.length,5);const full=simulate('efficient',{extraDays:[1,2,3,4,5,8,9,10,11,12],extraCareDays:[2]});assert.ok(full.rows[2].bedLate>0);assert.equal(full.rows[1].late,0);
});
