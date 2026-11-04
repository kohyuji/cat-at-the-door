'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const io=require('./io.cjs');
const {buildReview}=require('./build-review.cjs');
const {availableImages}=require('./assets.cjs');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist');

function buildWeb(){
 // 실행에 필요한 파일만 복사합니다. 이전 버전·기획서·검사용 화면은 공개하지 않습니다.
 const files=['index.html','src/life.css','src/life-state.js','src/life-story.js','src/pixel-render.js','src/life-view.js','src/life-game.js',
  ...Object.values(availableImages()),'assets/fonts/NeoDunggeunmoPro-Regular.woff2','assets/fonts/LICENSE-NeoDunggeunmo.txt'];
 for(const file of files){
  const dest=path.join(output,file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  io.copy(path.join(root,file),dest);
 }
 const index=path.join(output,'index.html');
 // 업데이트한 코드와 예전 브라우저 캐시가 섞이지 않도록 파일 내용으로 주소를 구분합니다.
 let html=fs.readFileSync(index,'utf8').replace(/(src|href)="(src\/[^"?]+\.(?:js|css))"/g,(_,attribute,file)=>{
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,12);
  return attribute+'="'+file+'?v='+hash+'"';
 });
 const versioned=Object.fromEntries(Object.entries(availableImages()).map(([key,file])=>[key,file+'?v='+crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,12)]));
 html=html.replace('<script src="src/life-state.js',`<script>window.__LIFE_ASSETS=${JSON.stringify(versioned)};</script><script src="src/life-state.js`);
 io.write(index,html);
 const allowed=new Set([...files,'downloads/Cat-at-the-Door.html']);
 function removeOldFiles(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const file=path.join(dir,entry.name),relative=path.relative(output,file).split(path.sep).join('/');
   if(entry.isSymbolicLink())throw new Error('배포 폴더 안의 링크를 확인해 주세요: '+relative);
   if(entry.isDirectory())removeOldFiles(file);
   else if(!allowed.has(relative))fs.unlinkSync(file);
  }
 }
 // 이전 빌드의 글꼴·스프라이트가 새 배포에 섞이지 않도록 생성 파일만 정리합니다.
 removeOldFiles(output);
 buildReview(path.join(output,'downloads/Cat-at-the-Door.html'));
 return output;
}
module.exports={buildWeb};
if(require.main===module)console.log('웹 실행 파일 준비 완료: '+buildWeb());
