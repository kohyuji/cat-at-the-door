const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {buildWeb}=require('../tools/build-web.cjs');
const {availableImages}=require('../tools/assets.cjs');
test('웹과 오프라인 HTML에 실제 이미지·Neo둥근모·라이선스를 포함하고 JS/CSS 캐시를 구분한다',()=>{
 const root=buildWeb(),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),single=fs.readFileSync(path.join(root,'downloads/Cat-at-the-Door.html'),'utf8');
 assert.match(html,/life-game\.js\?v=[a-f0-9]{12}/);assert.match(single,/data:font\/woff2;base64,/);assert.match(single,/SIL OPEN FONT LICENSE/);assert.doesNotMatch(single,/<script src=/);assert.doesNotMatch(single,/<link rel="stylesheet"/);
 for(const [key,file] of Object.entries(availableImages())){assert.ok(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(__dirname,'..',file))));assert.match(single,new RegExp('"'+key+'":"data:image/png;base64,'));}
 assert.ok(fs.existsSync(path.join(root,'assets/fonts/LICENSE-NeoDunggeunmo.txt')));
 const manifest=require('../assets/r4-asset-manifest.json'),r6=require('../assets/r6-asset-manifest.json'),load={...manifest.load,...r6.load};assert.deepEqual(availableImages(),load);assert.equal(Object.keys(manifest.load).length,9);assert.equal(Object.keys(availableImages()).length,15);
 for(const [key,info] of Object.entries(r6.images))assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',info.file))).digest('hex'),info.sha256,key);
 const bundled=JSON.parse(html.match(/window.__LIFE_ASSETS=(.*?);<\/script>/)[1]);assert.deepEqual(Object.keys(bundled).sort(),Object.keys(load).sort());
 for(const file of manifest.retainedDraftsNotForLoading)assert.equal(fs.existsSync(path.join(root,'assets',file)),false,'시안은 공개 빌드에서 제외한다');

});
