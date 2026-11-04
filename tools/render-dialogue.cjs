const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
(async()=>{
 GlobalFonts.registerFromPath(path.join(root,'assets/fonts/NeoDunggeunmoPro-Regular.woff2'),'DOSGothic');
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'src/pixel-render.js'),'utf8'),context);
 const images={};for(const [key,file] of Object.entries(context.PixelArt.assetSources))images[key]=await loadImage(path.join(root,file));context.PixelArt.setImages(images);
 const output=createCanvas(720,380),c=output.getContext('2d');c.fillStyle='#edf3f1';c.fillRect(0,0,720,380);
 for(const [i,variant,name,text] of [[0,'hoodie','하늘','이제 자야 할 시간이다. 너무 고된 하루였어.'],[1,'cat','땅콩','야옹~']]){
  const p=createCanvas(192,192);context.PixelArt.portrait(p.getContext('2d'),variant,0,0,192,192);
  const y=i*190;c.fillStyle='#fcfdf5';c.fillRect(4,y+4,712,180);c.strokeStyle='#779f91';c.lineWidth=3;c.strokeRect(4,y+4,712,180);c.imageSmoothingEnabled=false;c.drawImage(p,24,y+24,128,128);c.fillStyle='#3e7265';c.font='18px DOSGothic';c.fillText(name,176,y+43);c.fillStyle='#263e49';c.font='20px DOSGothic';const lines=text.match(/.{1,22}/g)||[];lines.forEach((line,j)=>c.fillText(line,176,y+78+j*32));
 }
 fs.mkdirSync(path.join(root,'.preview'),{recursive:true});const file=path.join(root,'.preview/r4-dialogue-integration.png');fs.writeFileSync(file,output.toBuffer('image/png'));console.log(JSON.stringify({imageCount:Object.keys(images).length,internal:192,display:128,file}));
})().catch(e=>{console.error(e);process.exitCode=1;});
