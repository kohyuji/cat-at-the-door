// Local, separate scenario harness. It never changes the shipping controller.
require('./build-review.cjs');
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../../.preview');
let html=fs.readFileSync(path.join(dir,'Cat-at-the-Door-life-review.html'),'utf8');
const harness=`
function fixtures(){
 const bar=document.createElement('nav');bar.style.cssText='position:fixed;bottom:0;left:0;z-index:50;background:#edf3f1;padding:4px;display:flex;gap:4px;font-size:12px';
 for(const [label,scene,day,phase]of [['집','living',0,'evening'],['출근 전','bedroom',1,'morning'],['회사','office',8,'work'],['비','living',3,'evening'],['책상','bedroom',2,'evening'],['닫힌 문','living',5,'morning']]){
 const b=document.createElement('button');b.textContent=label;b.onclick=()=>{
 G.auto=[];G.mini=null;G.dialog=null;G.transition=null;G.lockedUntil=0;G.mode='play';G.s=Life.create('하늘','보리');G.s.day=day;G.s.phase=phase;G.s.lastArrivedDay=phase==='evening'?day:day-1;G.s.prep=1;G.s.fur=10;G.s.roller.owned=true;G.s.roller.sheets=20;
 G.intro='';G.dressed=false;G.sleeping=false;G.catControl=false;G.doorOpen=true;G.curtainClosed=false;G.cat={x:430,y:323,dir:-1,walk:0,pose:'sit'};G.hero.pose='stand';G.photo=false;G.shopping=false;G.officeDone=false;G.officeTalk={};
 $('titleScreen').hidden=true;$('gameScreen').hidden=false;$('endingScreen').hidden=true;$('dialogue').hidden=true;$('inventory').hidden=true;$('moneyButton').hidden=false;$('timeLabel').hidden=false;hideMini();setScene(scene,220);canvas.focus();
 if(label==='닫힌 문')catPerspective(4);
 };bar.appendChild(b);
 }document.body.appendChild(bar);
}
loadAssets();fixtures();requestAnimationFrame(frame);`;
html=html.replace('loadAssets();offerResume();requestAnimationFrame(frame);',harness);
fs.writeFileSync(path.join(dir,'life-playtest.html'),html);
console.log(path.join(dir,'life-playtest.html'));
