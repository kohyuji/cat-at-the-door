const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const images={rooms:'assets/rooms-pixel.png',places:'assets/places-pixel.png',r4People:'assets/r4-people.png',r4Cats:'assets/r4-cats.png',r4Props:'assets/r4-props.png',r4Scenes:'assets/r4-scenes.png',r4Actions:'assets/r4-actions.png'};
const availableImages=()=>Object.fromEntries(Object.entries(images).filter(([,p])=>fs.existsSync(path.join(root,p))));
module.exports={images,availableImages};
