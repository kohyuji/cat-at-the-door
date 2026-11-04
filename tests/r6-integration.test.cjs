const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {game,fixture,read,pour,Life}=require('./r5-helpers.cjs');
const records=[];let images,renderer;
async function evidence(g,name){
 const {createCanvas,loadImage}=require('@napi-rs/canvas');images||=Object.fromEntries(await Promise.all(Object.entries(g.runtime.PixelArt.assetSources).map(async([k,f])=>[k,await loadImage(path.join(__dirname,'..',f))])));
 if(!renderer){const vm=require('node:vm');renderer=vm.createContext({Life,console,Math,OffscreenCanvas:function(w,h){return createCanvas(w,h);}});for(const file of ['pixel-render.js','life-view.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),renderer);renderer.PixelArt.setImages(images);}const canvas=createCanvas(640,360),ctx=canvas.getContext('2d'),G={...g.capture(),images};renderer.LifeView.draw(ctx,G);
 const folder=path.join(__dirname,'../.preview',g.runtime.PixelArt.assetSources.r6PeopleV2?'r6-v2-integration':'r6-integration');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,name+'.png'),canvas.toBuffer('image/png'));records.push({name,snapshot:g.snap()});fs.writeFileSync(path.join(folder,'evidence.json'),JSON.stringify({kind:'Actual runtime state/input and final Canvas assets, no browser/audio device',records},null,2));
}
test('R6 final coordinates: street glass door guide, click and approach share layout',async()=>{
 const g=await game({state:fixture(),scene:'street',intro:'sheltered'}),p=g.runtime.LifeView.layout.street.home;
 assert.equal(g.capture().guide.x,p.cx);assert.equal(g.capture().guide.y,p.cy);g.pointer('pointerdown',p.cx,p.cy);g.step(4);assert.equal(g.snap().scene,'shop');assert.equal(g.snap().shopMode,'intro');assert.ok(Math.abs(g.snap().hero.x-320)<1);
});
test('R6 final pointer regions: sofa, bowl and cat body are distinct, including cat over toy',async()=>{
 for(const id of ['rest','food','water','cat','toy']){
  const s=fixture(2);s.needs.fed=id!=='food';s.water=id!=='water';s.waterLevel=s.water?2:0;s.needs.played=false;const g=await game({state:s});g.step(3);
  const p=id==='cat'?{cx:g.snap().cat.x,cy:g.snap().cat.y-31}:g.runtime.LifeView.hotspots(g.capture())[id];g.pointer('pointerdown',p.cx,p.cy);g.step(3.2);
  if(id==='rest'){assert.ok(g.capture().restAt!=null);assert.equal(g.snap().mini,undefined);}else assert.equal(g.snap().mini,{food:'feed',water:'water',cat:'pet',toy:'play'}[id]);
 }
});
test('R6 final coordinates: selected wet can starts at generated can and ends in its bowl',async()=>{
 const s=fixture(2);s.favoriteFood=1;s.food=2;const g=await game({state:s});g.target('밥그릇');g.ack('닭고기');const m=g.capture().mini,l=g.runtime.LifeView.layout.mini.feed;
 assert.equal(m.foodKind,'favorite');assert.deepEqual({...m.origin},{...l.favoriteStart});assert.deepEqual({...m.target},{...l.favoriteTarget});await evidence(g,'wet-can-start');pour(g);assert.equal(g.snap().state.lastFoodKind,'favorite');await evidence(g,'wet-can-result');
});
test('R6 final coordinates: sweep and mop use provided floor tool and patch points',async()=>{
 for(const type of ['sweep','mop']){const s=fixture(2);s.floor={fur:8,dust:8};const g=await game({state:s});g.target(type==='sweep'?'바닥의 털을':'물걸레로');const m=g.capture().mini,l=g.runtime.LifeView.layout.mini[type];assert.deepEqual({...m.p},{...l.tool});assert.equal(m.patches.length,8);assert.ok(m.patches.every((p,i)=>p.x===l.patches[i].x&&p.y===l.patches[i].y));g.pointer('pointerdown',m.p.x,m.p.y);await evidence(g,type+'-start');for(const p of m.patches)g.pointer('pointermove',p.x,p.y);g.pointer('pointerup',440,327);g.step(1.5);read(g);assert.equal(g.snap().state.floor[type==='sweep'?'fur':'dust'],0);}
});
test('R6 final storm save: pointer close, keyboard open, doorway and dawn recover with final assets',async()=>{
 const s=fixture(3);s.revision=5;const g=await game({state:s,scene:'living'});g.target('흔들리는 창문');const m=g.capture().mini;g.pointer('pointerdown',m.p.x,m.p.y);g.pointer('pointermove',384,175);await evidence(g,'curtain-half-closed');g.pointer('pointermove',m.target.x,m.target.y);g.pointer('pointerup',m.target.x,m.target.y);g.step(1.4);read(g,'내 일을');g.toRoom('bedroom');g.click('menuButton');g.click('saveExitButton');g.click('continueButton');g.toRoom('living');assert.equal(g.snap().state.windowClosed,true);g.target('커튼을 연다');read(g,'커튼을 연다');g.button('miniActions','키보드로');g.step(1.4);assert.equal(g.snap().state.curtainClosed,false);
});
test('R6 final installed equipment retains actual sprite ownership and running supplies after save',async()=>{
 const s=fixture(8);s.cash=250000;s.food=24;const g=await game({state:s});for(const id of Object.keys(Life.EQUIPMENT))Life.act(g.capture().s,'buyEquipment',{id});Life.act(g.capture().s,'refillFeeder');Life.act(g.capture().s,'refillFountain');g.click('menuButton');g.click('saveExitButton');g.click('continueButton');await evidence(g,'equipment-installed');assert.ok(Object.values(g.snap().state.equipment).every(Boolean));assert.ok(g.snap().state.supplies.feeder>0);assert.equal(g.snap().state.supplies.fountain,4);
});
