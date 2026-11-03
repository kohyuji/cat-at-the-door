'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {buildReview}=require('./build-review.cjs');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist');

function buildWeb(){
 // 실행에 필요한 파일만 복사합니다. 이전 버전·기획서·검사용 화면은 공개하지 않습니다.
 const files=['index.html','src/life.css','src/life-state.js','src/life-story.js','src/pixel-render.js','src/life-view.js','src/life-game.js',
  'assets/rooms-pixel.png','assets/places-pixel.png','assets/poses-with-cat.png','assets/poses-solo.png','assets/fonts/DungGeunMo.woff'];
 for(const file of files){
  const dest=path.join(output,file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(path.join(root,file),dest);
 }
 buildReview(path.join(output,'downloads/Cat-at-the-Door.html'));
 return output;
}
module.exports={buildWeb};
if(require.main===module)console.log('웹 실행 파일 준비 완료: '+buildWeb());
