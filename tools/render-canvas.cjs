/* 실제 Skia Canvas를 파일로 렌더한다. 브라우저·오디오 장치를 열지 않는다. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
const Life=require('../src/life-state.js');
async function render(){
 GlobalFonts.registerFromPath(path.join(root,'assets/fonts/NeoDunggeunmoPro-Regular.woff2'),'DOSGothic');
 const images={};for(const [key,file] of Object.entries(require('./assets.cjs').availableImages()))images[key]=await loadImage(path.join(root,file));
 const c=vm.createContext({Life,console,Math});for(const file of ['pixel-render.js','life-view.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),c);
 c.PixelArt.setImages?.(images);
 const frames=[];
 function shot(label,scene,patch={}){
  const s=Life.create('하늘','땅콩');Object.assign(s,{food:5,minute:1120,litterDirty:3,day:2});s.flags.routineIntroduced=true;s.roller.owned=true;s.suitStored=true;s.clothesFur.hoodie=6;
  const G={s,images,now:2,scene,intro:'',hero:{x:300,y:323,dir:1,walk:0,pose:'stand'},cat:{x:420,y:323,dir:-1,walk:0,pose:'sit'},doorOpen:true,dressed:false,curtainClosed:false,catControl:false,catOnBed:false,sleeping:false,nightScene:false,mini:null,officeTalk:{},...patch};
  const canvas=createCanvas(640,360),ctx=canvas.getContext('2d');
  if(scene==='title')c.LifeView.title(ctx,G.now,G);else c.LifeView.draw(ctx,G);
  const pixels=ctx.getImageData(0,0,640,360).data;assert.ok(pixels.some((n,i)=>i%4===3&&n>0),'nonempty '+label);frames.push({label,canvas});return canvas;
 }
 shot('타이틀','title');shot('집 · 18:40','living');shot('침실 · 행거','bedroom');
 shot('고객 상담','office',{dressed:true,consultation:{name:'이하나',variant:'customerA',stage:1}});
 shot('슈퍼 · 첫 구매','shop',{shopMode:'intro'});shot('슈퍼 · 생활용품','shop',{shopMode:'general'});
 shot('비 · 창문','living',{s:Object.assign(Life.create('하늘','땅콩'),{day:3,phase:'evening',minute:1200,litterDirty:2})});
 shot('고양이 시점','living',{catControl:true,catStage:'door',cameraAt:0});
 shot('같이 수면','bedroom',{sleeping:true,catOnBed:true,cat:{x:132,y:300,dir:-1,walk:0,pose:'sleep'}});
 const base={start:0,down:true,progress:.5,p:{x:350,y:155},pointer:{x:330,y:235},moved:150,items:[],cards:[],slots:[],fur:[],clumps:[{x:201,y:183,removed:false},{x:308,y:223,removed:true},{x:420,y:185,removed:false}],catX:350,catY:285,catWalk:1,door:.5};
 for(const type of ['feed','water','pet','play','litter','bed','umbrella','roller','bag'])shot('조작 · '+type,'living',{mini:{...base,type}});
 const before=shot('걷기 · 0','living',{now:0,hero:{x:300,y:323,dir:1,walk:.1,pose:'walk'}}),after=shot('걷기 · 1','living',{now:.3,hero:{x:300,y:323,dir:1,walk:.4,pose:'walk'}});assert.notDeepEqual(before.toBuffer('image/png'),after.toBuffer('image/png'));
 const sheet=createCanvas(1920,Math.ceil(frames.length/3)*396),ctx=sheet.getContext('2d');ctx.fillStyle='#f7f3e8';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.font='20px DOSGothic';ctx.fillStyle='#304650';
 frames.forEach((f,i)=>{const x=i%3*640,y=Math.floor(i/3)*396;ctx.drawImage(f.canvas,x,y+36);ctx.fillText(f.label,x+12,y+26);});
 const output=path.join(root,'.preview/r4-canvas-contact.png');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,sheet.toBuffer('image/png'));
 const report={frames:frames.length,images:Object.keys(images),output};fs.writeFileSync(path.join(root,'.preview/r4-canvas-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
render().catch(e=>{console.error(e);process.exitCode=1;});
