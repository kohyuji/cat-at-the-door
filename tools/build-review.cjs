'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

// 그림과 글꼴까지 포함해 파일 하나로 실행할 수 있는 게임을 만듭니다.
function buildReview(out=path.join(root,'dist/downloads/Cat-at-the-Door.html')){
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 let css=fs.readFileSync(path.join(root,'src/life.css'),'utf8');
 const font=fs.readFileSync(path.join(root,'assets/fonts/DungGeunMo.woff')).toString('base64');
 css=css.replace("url('../assets/fonts/DungGeunMo.woff')",`url('data:font/woff;base64,${font}')`);
 html=html.replace('<link rel="stylesheet" href="src/life.css">',`<style>${css}</style>`);
 const names={rooms:'rooms-pixel.png',places:'places-pixel.png',posesWithCat:'poses-with-cat.png',posesSolo:'poses-solo.png'};
 const assets=Object.fromEntries(Object.entries(names).map(([key,file])=>[key,'data:image/png;base64,'+fs.readFileSync(path.join(root,'assets',file)).toString('base64')]));
 html=html.replace('<script src="src/life-state.js">',`<script>window.__LIFE_ASSETS=${JSON.stringify(assets)};</script><script src="src/life-state.js">`);
 html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>'<script>\n'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,html);
 return out;
}
module.exports={buildReview};
if(require.main===module)console.log('파일 하나로 실행하는 게임: '+buildReview());
