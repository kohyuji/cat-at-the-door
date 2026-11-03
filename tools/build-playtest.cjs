// Separate test scenarios; these shortcuts are excluded from the normal game.
require('./build-review.cjs');
const fs=require('node:fs'),path=require('node:path'),dir=path.resolve(__dirname,'../../.preview');
let html=fs.readFileSync(path.join(dir,'Cat-at-the-Door-r2-review.html'),'utf8');
const harness=`
function fixtures(){const bar=document.createElement('nav');bar.style.cssText='position:fixed;bottom:0;left:0;z-index:50;background:#edf3f1;padding:4px;display:flex;gap:4px;font-size:12px';
 for(const [label,scene,day,phase]of [['집','living',0,'evening'],['아침','bedroom',1,'morning'],['회사','office',2,'work'],['비','living',3,'evening'],['책상','bedroom',2,'evening'],['고양이','living',5,'morning'],['수면','bedroom',1,'evening'],['주말','living',6,'evening'],['야간','living',1,'morning'],['엔딩','living',12,'ending']]){
 const b=document.createElement('button');b.textContent=label;b.onclick=()=>{G.auto=[];G.dialog=null;G.mini=null;G.transition=null;G.lockedUntil=0;G.menu=false;G.ack=false;G.mode='play';G.s=Life.create('하늘','보리');Object.assign(G.s,{day,phase,food:4,favoriteFood:1,lastArrivedDay:day,fur:10,preparedDays:[day,nextDay()],hasBag:phase==='work',bagPrepared:phase==='work'});G.s.flags.initialShopDone=true;G.s.roller.owned=true;G.intro='';G.dressed=phase==='work';G.sleeping=false;G.nightScene=false;G.catControl=false;G.catOnBed=false;G.doorOpen=true;G.curtainClosed=false;G.cat={x:430,y:323,dir:-1,walk:0,pose:'sit'};G.officeDone=false;G.officeFeedback=false;G.officeTalk={};$('titleScreen').hidden=true;$('gameScreen').hidden=false;$('endingScreen').hidden=true;$('dialogue').hidden=true;$('phone').hidden=true;$('acknowledge').hidden=true;hideMini();setScene(scene,220);canvas.focus();if(label==='고양이')catPerspective(4);if(label==='수면'){G.s.needs.fed=true;G.s.water=true;beginSleep(true);}if(label==='야간'){G.s.needs.fed=false;nightWake({wakeReasons:['hunger']});}if(label==='엔딩'){G.s.project.launched=true;G.s.routine=4;G.s.trust=6;G.s.lastNight={open:true};showEnding();}};bar.appendChild(b);
 }document.body.appendChild(bar);}
loadAssets();fixtures();requestAnimationFrame(frame);`;
html=html.replace('loadAssets();offerResume();requestAnimationFrame(frame);',harness);
fs.writeFileSync(path.join(dir,'life-playtest-r2.html'),html);console.log(path.join(dir,'life-playtest-r2.html'));
