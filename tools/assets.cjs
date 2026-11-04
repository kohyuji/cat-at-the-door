const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
// 브라우저와 빌드는 같은 최종 자산 목록을 쓴다. 시안 PNG를 같은 키에 넣지 않는다.
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'src/pixel-render.js'),'utf8'),context);
const images=Object.fromEntries(Object.entries(context.PixelArt.assetSources));
function availableImages(){
 for(const file of Object.values(images))if(!fs.existsSync(path.join(root,file)))throw new Error('필수 게임 그림이 없습니다: '+file);
 return images;
}
function availableManifests(){
 const files=['assets/r4-asset-manifest.json'];
 if(Object.values(images).some(file=>file.startsWith('assets/r5-')))files.push('assets/r5-asset-manifest.json');
 if(Object.values(images).some(file=>file.startsWith('assets/r6-')))files.push('assets/r6-asset-manifest.json');
 for(const file of files)if(!fs.existsSync(path.join(root,file)))throw new Error('최종 자산 계약이 아직 없습니다: '+file);
 return files;
}
module.exports={images,availableImages,availableManifests};
