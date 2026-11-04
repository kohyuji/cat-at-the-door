/* R5 변경 흐름의 실제 Canvas 자료. DOM은 메모리 모형이며 브라우저·오디오는 열지 않는다. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const {game,fixture,read,black,message,pet}=require('../tests/r5-helpers.cjs');
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline'),revision=baseline?'3232c46':null,label=baseline?'before':'after',out=path.join(root,'.preview/r5-evidence');
const records=[];let imageCache={};
async function imagesFor(g){const sources=g.runtime.PixelArt.assetSources,key=JSON.stringify(sources);if(!imageCache[key]){const images={};for(const [id,file] of Object.entries(sources))images[id]=await loadImage(path.join(root,file));imageCache[key]=images;}return imageCache[key];}
function wrap(c,text,x,y,width,lineHeight){let row='',line=0;for(const ch of String(text)){if(c.measureText(row+ch).width>width){c.fillText(row,x,y+line*lineHeight);line++;row=ch;}else row+=ch;}if(row)c.fillText(row,x,y+line*lineHeight);return(line+1)*lineHeight;}
async function capture(g,name,ids,{dpr=1}={}){
 const state=g.capture(),images=await imagesFor(g),frame=createCanvas(640*dpr,600*dpr),c=frame.getContext('2d');c.scale(dpr,dpr);c.imageSmoothingEnabled=false;c.fillStyle=baseline?'#edf3f1':'#e8e8e9';c.fillRect(0,0,640,600);
 const render={...state,images};g.runtime.PixelArt.setImages(images);c.save();c.translate(0,60);g.runtime.LifeView.draw(c,render);c.restore();
 c.fillStyle='#30343b';c.font='18px DOSGothic';c.fillText(name+' · '+label,10,24);const minute=g.runtime.Life.clock(state.s).minutes;c.fillText(g.runtime.Life.formatTime?g.runtime.Life.formatTime(minute):g.runtime.Life.clock(state.s).text,518,24);
 if(!baseline&&!g.get('clockWidget').hidden){c.strokeStyle='#4e6079';c.lineWidth=2;c.beginPath();c.arc(477,27,21,0,Math.PI*2);c.stroke();for(const [length,angle]of [[11,(minute%720)*Math.PI/360],[17,(minute%60)*Math.PI/30]]){c.beginPath();c.moveTo(477,27);c.lineTo(477+Math.sin(angle)*length,27-Math.cos(angle)*length);c.stroke();}}
 const line=state.dialog?.lines?.[state.dialog.index];if(line){c.fillStyle=baseline?'#fcfdf5':'#f6f4f0';c.fillRect(4,432,632,164);c.strokeStyle=baseline?'#779f91':'#8a929f';c.strokeRect(4,432,632,164);let x=18;if(line.who){const v=line.who===state.s.cat||line.who==='고양이'?'cat':line.who==='팀장'?'lead':state.dressed?'suit':'hoodie';g.runtime.PixelArt.portrait(c,v,14,446,112,140);x=145;c.font='17px DOSGothic';c.fillStyle='#526782';c.fillText(line.who==='나'?state.s.me:line.who,x,456);}c.font='18px DOSGothic';c.fillStyle='#30343b';wrap(c,line.text,x,482,620-x,26);
  if(state.dialog.purchase){let y=512;for(const [key,value] of [['보유금액',state.dialog.purchase.balance],['상품 가격',state.dialog.purchase.price],['구매 후 잔액',state.dialog.purchase.balance-state.dialog.purchase.price]]){c.font='16px DOSGothic';c.fillText(key,x,y);c.fillText(value.toLocaleString()+'원',470,y);y+=23;}}
 }else if(state.mini){c.font='18px DOSGothic';c.fillStyle='#30343b';wrap(c,g.get('miniLabel').textContent+' · '+g.get('miniHint').textContent,12,455,615,27);}
 const file=path.join(out,label+'-'+name+'.png');fs.writeFileSync(file,frame.toBuffer('image/png'));records.push({name,ids,file,snapshot:g.snap(),ui:{phone:g.get('phoneBody').textContent,purchase:baseline?null:g.get('purchaseSummary').textContent,clock:g.get('timeLabel').textContent,elapsed:baseline?null:g.get('elapsedAction').textContent}});
}
async function setup(saved){return game(saved,{revision});}
async function main(){fs.mkdirSync(out,{recursive:true});GlobalFonts.registerFromPath(path.join(root,'assets/fonts/NeoDunggeunmoPro-Regular.woff2'),'DOSGothic');
 const phone=baseline?await setup({state:fixture(),intro:'bedPhone',scene:'bedroom'}):await setup(null);if(!baseline)black(phone);await capture(phone,'01-phone-bedroom',['F06','F14','F15','F32']);
 const shop=await setup({state:fixture(),intro:'sheltered',scene:'shop',shopMode:'intro'});shop.target('건사료');shop.step(1.5);await capture(shop,'02-purchase',['F20','F21','F22','F23']);
 const feeding=await setup({state:fixture(2),scene:'living'});feeding.target('밥그릇');const tool=feeding.capture().mini.p;feeding.pointer('pointerdown',tool.x,tool.y);feeding.pointer('pointermove',baseline?385:338,baseline?155:220);feeding.step(.4);await capture(feeding,'03-feed',['F24','F25','F37']);
 const petState=fixture(2);petState.dressed=true;petState.suitStored=false;const petting=await setup({state:petState,scene:'living'});petting.target('쓰다듬');petting.pointer('pointerdown',280,235);for(let i=0;i<4;i++){petting.pointer('pointermove',i%2?280:430,235);petting.step(.22);}await capture(petting,'04-pet-suit',['F25','F36']);
 const prep=await setup({state:fixture(),intro:'offer',scene:'bedroom'});message(prep);read(prep);prep.target('침실로');await capture(prep,'05-prep-target',['F28','F29','F30']);
 const sleeping=fixture();sleeping.needs={fed:true,played:true,comfort:true};sleeping.water=true;sleeping.waterLevel=3;const bed=await setup({state:sleeping,scene:'bedroom'});bed.target('잠자리에');if(!baseline)read(bed);await capture(bed,'06-bed-choice',['F32','F41','F43']);bed.key('ArrowRight');bed.button('miniActions','이대로 잠들기',2);await capture(bed,'07-sleeping',['F32','F33','F42']);bed.step(3);await capture(bed,'08-waking',['F32','F34','F35','F42']);
 const commuteState=fixture(1,'afterWork');commuteState.dressed=true;commuteState.suitStored=false;const commute=await setup({state:commuteState,scene:'shop',shopMode:'general',shopReturn:'commute'});await capture(commute,'09-commute-outfit',['F38']);
 const timeState=fixture();timeState.minute=1040;const clock=await setup({state:timeState});await capture(clock,'10-time-start',['F31']);clock.target('소파에서 쉰다',1.8);await capture(clock,'11-time-during',['F31']);clock.step(2);await capture(clock,'12-time-after',['F31'],{dpr:baseline?1:2});
 fs.writeFileSync(path.join(out,label+'-evidence.json'),JSON.stringify({revision:revision||'working R5',kind:'실제 월드 Canvas와 DOM 내용 기반 대사/시계 검토 패널; 브라우저 계산 결과는 아님',records},null,2));console.log(JSON.stringify({label,count:records.length,out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
