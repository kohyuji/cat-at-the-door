const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {buildWeb}=require('../tools/build-web.cjs');
const {availableImages,availableManifests}=require('../tools/assets.cjs');
test('웹과 오프라인 HTML에 실제 이미지·Neo둥근모·라이선스를 포함하고 JS/CSS 캐시를 구분한다',()=>{
 const root=buildWeb(),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),single=fs.readFileSync(path.join(root,'downloads/Cat-at-the-Door.html'),'utf8');
 assert.match(html,/life-game\.js\?v=[a-f0-9]{12}/);assert.match(single,/data:font\/woff2;base64,/);assert.match(single,/SIL OPEN FONT LICENSE/);assert.doesNotMatch(single,/<script src=/);assert.doesNotMatch(single,/<link rel="stylesheet"/);
 for(const [key,file] of Object.entries(availableImages())){assert.ok(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(__dirname,'..',file))));assert.match(single,new RegExp('"'+key+'":"data:image/png;base64,'));}
 assert.match(single,/data:audio\/wav;base64,/);assert.ok(fs.readFileSync(path.join(root,'assets/audio/phone-vibration.wav')).equals(fs.readFileSync(path.join(__dirname,'../assets/audio/phone-vibration.wav'))));
 assert.ok(fs.existsSync(path.join(root,'assets/fonts/LICENSE-NeoDunggeunmo.txt')));
 const manifests=availableManifests().map(file=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^\uFEFF/,'')));
 const expected=Object.assign({},...manifests.map(m=>m.load||Object.fromEntries(Object.entries(m.assets||{}).map(([key,a])=>[key,a.file]))));
 // The v2 art contract supersedes these historical human/vertical-bed atlases.
 const v2=manifests.find(m=>m.version>=2&&m.assets?.r6PeopleV2),excluded=new Set(v2?[...v2.archiveNotLoaded,'assets/r5-bedtime.png','assets/r5-bed-lighting.png','assets/r5-poses.png','assets/r5-care.png']:[]);
 for(const [key,file]of Object.entries(expected))if(excluded.has(file))delete expected[key];assert.deepEqual(availableImages(),expected);
 for(const file of excluded){assert.ok(!Object.values(availableImages()).includes(file));assert.equal(fs.existsSync(path.join(root,file)),false,'반려·미사용·원본은 빌드에서 제외한다');}
 const bundled=JSON.parse(html.match(/window.__LIFE_ASSETS=(.*?);<\/script>/)[1]);assert.deepEqual(Object.keys(bundled).sort(),Object.keys(expected).sort());
 for(const manifest of manifests)for(const file of manifest.retainedDraftsNotForLoading||[]){if(!Object.values(expected).includes('assets/'+file))assert.equal(fs.existsSync(path.join(root,'assets',file)),false,'시안은 공개 빌드에서 제외한다');}
 for(const manifest of manifests)for(const draft of manifest.drafts||[])if(draft.loaded===false&&!Object.values(expected).includes(draft.file))assert.equal(fs.existsSync(path.join(root,draft.file)),false,'미사용 R5 시안은 공개 빌드에서 제외한다');
 for(const file of availableManifests())assert.ok(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(__dirname,'..',file))));

});
