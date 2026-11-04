/* Local-only impact verification and review artifacts for the selected v2 art. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {game,fixture,read,pour,pet,Life}=require('../tests/r5-helpers.cjs');
const {availableImages}=require('./assets.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.preview/r6-v2-review'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[],frames=[];
function check(name,condition){assert.ok(condition,name);checks.push(name);}
function buildFiles(){
 const dist=path.join(root,'dist'),files=[];
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else files.push(path.relative(dist,f).split(path.sep).join('/'));}}walk(dist);
 assert.ok(files.every(f=>!/(?:-source|-contact-source|style-proof)/.test(f)),'source/proof files in output');
 for(const f of files)if(f!=='index.html'&&!f.startsWith('downloads/'))assert.ok(fs.readFileSync(path.join(dist,f)).equals(fs.readFileSync(path.join(root,f))),f+' source/build mismatch');
 const offline=fs.readFileSync(path.join(dist,'downloads/Cat-at-the-Door.html'),'utf8');let scripts=0;for(const m of offline.matchAll(/<script>([\s\S]*?)<\/script>/g)){new vm.Script(m[1],{filename:'offline-'+(++scripts)});}assert.equal(scripts,6);
 return{status:'all source/build files match; 6 offline script blocks compile; no source/proof files',files:files.map(file=>{const b=fs.readFileSync(path.join(dist,file));return{file,bytes:b.length,sha256:hash(b)};})};
}
async function main(){
 fs.mkdirSync(out,{recursive:true});const sources=availableImages(),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/r6-asset-manifest.json'),'utf8'));
 check('R6 manifest version 2',manifest.version===2);
 const newKeys=['r6PeopleV2','r6CleanV2','r6WetV2','r6CareV2','r6TransitV2','r6Bed'];
 check('all six selected v2 runtime assets present',newKeys.every(k=>sources[k]===manifest.assets[k].file));
 const excluded=[...manifest.archiveNotLoaded,'assets/r5-bedtime.png','assets/r5-bed-lighting.png','assets/r5-poses.png','assets/r5-care.png'];
 check('rejected, source, proof and vertical-bed assets not loaded',excluded.every(f=>!Object.values(sources).includes(f)));
 const images=Object.fromEntries(await Promise.all(Object.entries(sources).map(async([k,f])=>[k,await loadImage(path.join(root,f))])));
 const renderer=vm.createContext({Life,Math,console,OffscreenCanvas:function(w,h){return createCanvas(w,h);}});
 for(const f of ['pixel-render.js','life-view.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',f),'utf8'),renderer);
 function shot(g,name){const cv=createCanvas(640,360),G={...g.capture(),images};renderer.LifeView.draw(cv.getContext('2d'),G);const file=path.join(out,name+'.png'),bytes=cv.toBuffer('image/png');fs.writeFileSync(file,bytes);frames.push({name,file,sha256:hash(bytes),scene:g.snap().scene,mini:g.snap().mini});return hash(bytes);}
 const s=fixture(2);s.needs={fed:true,played:true,comfort:true};s.water=true;s.waterLevel=2;s.hoodie=true;
 const home=await game({state:s,scene:'living',hero:{x:300,y:323,dir:1,walk:0,pose:'stand'}});
 check('Continue loads new art keys',newKeys.every(k=>home.snap().assetKeys.includes(k)));
 const idle=shot(home,'house');home.press('ArrowRight',true);home.step(.25);check('actual input starts walk',home.snap().hero.pose==='walk'&&home.snap().hero.walk>0);const walking=shot(home,'walking');check('actual walking frame differs from idle',walking!==idle);home.press('ArrowRight',false);home.step(.15);check('release returns idle',home.snap().hero.walk===0&&home.snap().hero.pose==='stand');
 home.click('menuButton');home.click('saveExitButton');home.click('continueButton');check('saved state resumes with new art and same name/food',home.snap().state.cat===s.cat&&home.snap().state.food===s.food&&newKeys.every(k=>home.snap().assetKeys.includes(k)));
 for(const type of ['feed','water']){const g=await game({state:fixture(2),scene:'living'});const p=g.runtime.LifeView.hotspots(g.capture())[type==='feed'?'food':'water'];g.pointer('pointerdown',p.cx,p.cy);g.step(4);check(type+' same object click enters care',g.snap().mini===type);const m=g.capture().mini,l=g.runtime.LifeView.layout.mini[type];check(type+' retains tool/target coordinates',m.p.x===l.start.x&&m.p.y===l.start.y&&m.target.x===l.target.x&&m.target.y===l.target.y);g.pointer('pointerdown',m.p.x,m.p.y);g.pointer('pointermove',m.target.x,m.target.y);g.step(.4);shot(g,type);g.pointer('pointerup',m.target.x,m.target.y);g.step(3);read(g);check(type+' completes through actual pointer',type==='feed'?g.snap().state.needs.fed:g.snap().state.waterLevel===3);}
 const p=await game({state:fixture(2),scene:'living'});pet(p);check('new pet care completes same gesture',p.snap().state.needs.comfort&&p.snap().state.clothesFur.hoodie>0);shot(p,'pet');
 const wetState=fixture(2);wetState.favoriteFood=1;wetState.food=2;const wet=await game({state:wetState});wet.target('밥그릇');wet.ack('닭고기');const wm=wet.capture().mini;wet.pointer('pointerdown',wm.p.x,wm.p.y);wet.pointer('pointermove',wm.target.x,wm.target.y);wet.step(.4);shot(wet,'wet');wet.pointer('pointerup',wm.target.x,wm.target.y);wet.step(3);read(wet);check('selected wet food remains favorite after completion',wet.snap().state.lastFoodKind==='favorite');
 const trainState=fixture(1,'morning');Object.assign(trainState,{dressed:true,hasBag:true,bagPacked:true,water:true,waterLevel:2});trainState.needs.fed=true;const train=await game({state:trainState,scene:'living'});train.target('신발을 신고',1);train.step(5);train.target('열차에 탄다',2.4);check('actual commute reaches train',train.snap().scene==='train');shot(train,'train');
 const bed=await game({state:fixture(),scene:'bedroom',intro:'bedPhone',heroOnBed:true,bedStage:'waking'});check('prior bed save resumes with selected bed atlas',bed.snap().heroOnBed&&bed.snap().bedStage==='waking'&&bed.snap().assetKeys.includes('r6Bed'));shot(bed,'bed-resume');
 execFileSync('git',['diff','--quiet','HEAD','--','src/life-game.js','src/life-state.js','src/life-story.js','src/life.css','index.html'],{cwd:root});check('controller, model, story, CSS and HTML unchanged since efdae82',true);
 const dist=path.join(root,'dist'),web=fs.readFileSync(path.join(dist,'index.html'),'utf8'),offline=fs.readFileSync(path.join(dist,'downloads/Cat-at-the-Door.html'),'utf8');
 const webAssets=JSON.parse(web.match(/window.__LIFE_ASSETS=(.*?);<\/script>/)[1]),inline=JSON.parse(offline.match(/window.__LIFE_ASSETS=(.*?);<\/script>/)[1]);
 check('web and offline use exact final loader keys',JSON.stringify(Object.keys(webAssets))===JSON.stringify(Object.keys(sources))&&JSON.stringify(Object.keys(inline))===JSON.stringify(Object.keys(sources)));
 const buildHashes=[];
 for(const [key,file]of Object.entries(sources)){const bytes=fs.readFileSync(path.join(root,file)),digest=hash(bytes);assert.equal(hash(fs.readFileSync(path.join(dist,file))),digest,file);assert.equal(hash(Buffer.from(inline[key].split(',')[1],'base64')),digest,key+' inline');assert.equal(webAssets[key],file+'?v='+digest.slice(0,12));if(manifest.assets[key])assert.equal(digest,manifest.assets[key].sha256);buildHashes.push({key,file,sha256:digest});}
 check('all final source/web/inline image bytes and cache hashes match',true);
 check('all rejected/source/unused files absent from web output',excluded.every(f=>!fs.existsSync(path.join(dist,f))));
 const html=path.join(dist,'downloads/Cat-at-the-Door.html');const report={status:'local ready / publication held',baseSource:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),checks,frames,buildHashes,localHTML:html,offlineSHA256:hash(fs.readFileSync(html)),webIndexSHA256:hash(fs.readFileSync(path.join(dist,'index.html'))),scope:'Selected v2 assets, care/walk/save/input and build only. No economics/full 13-day rerun; no browser/audio/network/push/deployment.'};
 report.buildFiles=buildFiles();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:checks.length,frames:frames.length,images:buildHashes.length,localHTML:html,report:path.join(out,'report.json')},null,2));
}
if(process.argv.includes('--build-only')){const f=path.join(out,'report.json'),r=JSON.parse(fs.readFileSync(f,'utf8'));r.buildFiles=buildFiles();fs.writeFileSync(f,JSON.stringify(r,null,2));console.log(JSON.stringify({status:r.buildFiles.status,files:r.buildFiles.files.length}));}
else main().catch(e=>{console.error(e);process.exitCode=1;});
