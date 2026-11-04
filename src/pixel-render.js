/* 인물·고양이·소품의 픽셀 그림. 기차 외에는 발/바닥 중앙을 기준으로 그린다.
   좌표는 640×360 기준이고 t와 walk는 초 단위다. */
var PixelArt = (function () {
  'use strict';
  // R4: generated PNGs stay untouched. Tight source rectangles avoid neighbouring
  // poses; a shared source-pixel scale keeps heads and paws the same size.
  var images={}, peopleScale=.28, catScale=.205;
  var assetSources={r4People:'assets/r4-people-pixel.png',r4Cats:'assets/r4-cats-pixel.png',r4Props:'assets/r4-props-pixel.png',r4Actions:'assets/r4-actions-pixel.png',r4Seated:'assets/r4-seated-pixel.png',r4Portraits:'assets/r4-portraits-approved-cords.png',r4PortraitBase:'assets/r4-portraits-approved.png',r4Scenes:'assets/r4-scenes-urban.png',r4Outdoors:'assets/r4-outdoors-urban.png'};
  Object.assign(assetSources,{r5Home:'assets/r5-home.png',r5Bedtime:'assets/r5-bedtime.png',r5BedLighting:'assets/r5-bed-lighting.png',r5Shop:'assets/r5-shop.png',r5Windows:'assets/r5-windows.png',r5Props:'assets/r5-props.png',r5Poses:'assets/r5-poses.png',r5Care:'assets/r5-care.png',r5Winter:'assets/r5-winter-scenes.png',r5CatPortrait:'assets/r5-cat-portrait.png'});
  Object.assign(assetSources,{r6Bed:'assets/r6-bed.png',r6Poses:'assets/r6-poses.png',r6Devices:'assets/r6-devices.png',r6WetCare:'assets/r6-wet-care.png',r6Transit:'assets/r6-transit.png',r6Bowls:'assets/r6-bowls.png'});
  assetSources.r6DeviceStates='assets/r6-device-states.png';
  // Generated cutouts retain their source PNG alpha. Frames share one source
  // scale, rather than stretching each frame into a fixed-width character.
  var r6Rects={bed:[[49,207,813,480],[958,207,813,480]],poses:[[35,60,206,266],[308,60,204,265],[580,60,205,266],[851,60,207,266],[56,417,167,282],[327,417,167,282],[600,417,166,282],[871,417,166,282],[42,756,208,304],[291,756,193,305],[585,756,208,304],[834,756,193,304],[42,1120,207,298],[293,1120,191,298],[586,1120,207,298],[836,1120,190,298]],devices:[[85,79,298,318],[565,57,206,345],[984,90,250,312],[1411,153,281,237],[89,542,287,281],[540,492,267,347],[964,490,293,349],[1425,542,262,286]],wet:[[30,37,401,369],[473,37,401,369],[917,37,401,369],[1360,37,394,369],[30,481,401,370],[474,481,400,370],[917,481,401,370],[1360,481,394,370]],transit:[[123,144,284,508],[692,136,256,516],[1218,135,265,517],[1754,148,273,504]]};
  r6Rects.bowls=[[43,246,455,278],[587,246,455,278],[1130,245,454,279],[1674,246,456,278]];
  r6Rects.deviceStates=[[131,116,284,466],[643,153,345,429],[1139,359,438,223],[1698,120,406,462]];
  var r6Keys={bed:'r6Bed',poses:'r6Poses',devices:'r6Devices',wet:'r6WetCare',transit:'r6Transit',bowls:'r6Bowls'};
  r6Keys.deviceStates='r6DeviceStates';
  function r6Part(c,kind,index,x,y,width,flip){var a=r6Rects[kind]&&r6Rects[kind][index],im=texture(c,r6Keys[kind]);if(!a||!im)return false;return cut(c,im,a,x,y,width,width*a[3]/a[2],flip);}
  var r5Rects={
    windows:[[15,190,354,257],[399,191,354,256],[783,191,354,256],[1168,191,353,256],[37,578,311,288],[421,577,311,288],[805,577,311,289],[1189,577,311,289]],
    props:[[31,51,256,244],[344,51,256,244],[658,50,256,245],[971,53,256,242],[36,397,242,176],[350,397,242,176],[664,397,241,176],[977,397,242,176],[37,701,243,182],[374,658,191,252],[653,653,261,254],[979,678,235,211],[39,967,235,247],[346,1000,246,204],[671,987,225,228],[1023,985,149,230]],
    poses:[[90,34,147,332],[406,34,128,332],[706,34,145,332],[1029,34,144,333],[90,447,147,342],[407,447,128,342],[706,451,146,338],[1029,451,145,338],[52,897,212,312],[366,897,212,312],[713,858,139,351],[1024,858,141,351]],
    cat:[[286,222,677,936]]
  };
  var r5Keys={windows:'r5Windows',props:'r5Props',poses:'r5Poses',cat:'r5CatPortrait'},textureCache=new WeakMap();
  function surface(c,w,h){if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);if(c.canvas&&c.canvas.ownerDocument){var cv=c.canvas.ownerDocument.createElement('canvas');cv.width=w;cv.height=h;return cv;}try{return new c.canvas.constructor(w,h);}catch(e){return null;}}
  function texture(c,key){var im=images[key];if(!ready(im))return null;if(!/^(?:r5(?:Windows|Props|Poses|Care|CatPortrait)|r6(?:Bed|Poses|Devices|DeviceStates|WetCare|Transit|Bowls))$/.test(key))return im;var tex=textureCache.get(im);if(tex)return tex;tex=surface(c,im.naturalWidth||im.width,im.naturalHeight||im.height);if(!tex)return im;
    var tc=tex.getContext('2d');tc.imageSmoothingEnabled=false;tc.drawImage(im,0,0);var pixels=tc.getImageData(0,0,tex.width,tex.height),d=pixels.data;for(var i=3;i<d.length;i+=4)d[i]=d[i]<128?0:255;tc.putImageData(pixels,0,0);textureCache.set(im,tex);return tex;}
  function part(c,kind,index,x,y,width){var a=r5Rects[kind]&&r5Rects[kind][index],im=texture(c,r5Keys[kind]);if(!a||!im)return false;return cut(c,im,a,x,y,width,width*a[3]/a[2],false);}
  function scene(c,key,index,columns,rows,x,y,w,h){var im=texture(c,key);if(!im)return false;var iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,sw=Math.floor(iw/columns),sh=Math.floor(ih/rows),sx=Math.round(index%columns*iw/columns),sy=Math.round(Math.floor(index/columns)*ih/rows);c.save();c.imageSmoothingEnabled=false;c.drawImage(im,sx,sy,sw,sh,x||0,y||0,w||640,h||360);c.restore();return true;}
  var peopleRects=[[54,30,105,206],[246,30,98,206],[438,30,98,206],[630,30,103,194],[822,30,104,206],[1014,30,99,206],[1205,30,98,206],[1399,30,102,205],[54,286,105,205],[246,286,98,205],[438,286,98,205],[630,286,103,193],[822,286,104,205],[1014,286,98,205],[1206,286,97,205],[1399,286,102,202],[54,536,93,206],[218,564,136,167],[413,560,134,171],[583,569,131,159],[751,632,218,90],[1013,599,113,123],[1188,539,124,199],[1388,544,106,194],[45,796,104,209],[236,801,99,204],[426,794,99,211],[615,801,103,204],[814,791,94,214],[994,829,113,175],[1182,830,131,174],[1370,829,119,175]];
  var catRects=[[40,105,139,120],[232,106,140,119],[424,108,140,117],[614,108,141,117],[806,109,141,117],[994,105,144,121],[1185,109,145,117],[1375,110,147,115],[40,360,139,129],[224,391,142,101],[420,365,139,118],[611,331,128,120],[807,322,130,107],[989,341,136,131],[1180,371,140,121],[1374,392,140,99],[40,605,125,129],[231,605,126,129],[420,660,132,75],[609,657,131,78],[792,613,136,122],[987,662,135,73],[1188,614,138,121],[1380,607,136,127],[23,876,158,99],[228,874,141,110],[412,862,139,129],[599,864,139,127],[800,861,109,130],[992,884,125,109],[1180,852,114,139],[1374,908,123,83]];
  var propRects=[[35,69,148,187],[216,108,153,145],[401,121,160,124],[590,108,163,137],[783,121,163,125],[1001,59,94,199],[1150,128,170,121],[1354,68,147,189],[18,369,174,142],[208,369,176,142],[427,316,106,199],[584,304,169,204],[777,361,164,150],[961,304,173,214],[1152,351,181,168],[1366,344,129,175],[17,564,182,196],[251,556,83,204],[423,577,111,176],[571,589,190,155],[786,586,149,158],[984,585,134,163],[1143,588,184,163],[1350,607,162,138],[18,826,173,151],[215,850,144,117],[384,822,171,161],[570,826,189,157],[786,800,160,202],[991,793,109,204],[1143,843,175,129],[1338,838,181,137]];
  var actionRects=[[70,55,169,267],[384,55,169,267],[695,55,204,267],[1010,55,188,267],[70,378,168,264],[384,381,200,261],[686,392,189,250],[1012,379,168,263],[69,758,181,96],[396,752,150,100],[693,759,187,90],[1014,757,171,102],[47,1037,228,152],[371,1006,202,189],[685,1033,214,152],[1065,988,89,220]];
  var seatedRects=[[71,30,169,276],[385,30,168,276],[698,30,179,276],[1012,30,168,276],[73,348,165,264],[387,351,164,261],[701,348,164,264],[1015,351,163,261],[71,657,169,277],[385,657,168,276],[698,657,169,277],[1012,657,168,277],[75,976,142,262],[389,978,155,260],[702,977,141,261],[1017,978,151,260]];
  // Widths are in the existing PixelArt local coordinates (feet/base at y=0).
  var props={foodBag:[0,27],wetFood:[1,26],bowlEmpty:[2,30],bowlFull:[3,30],water:[4,30],waterBottle:[5,21],toy:[6,23],litterBag:[7,28],litterTray:[8,51],litterDirty:[9,51],scoop:[10,18],suit:[11,31],hoodieFolded:[12,34],hoodie:[13,34],briefcase:[14,31],roller:[15,23],umbrella:[16,60],umbrellaFolded:[17,17],phone:[18,18],laptop:[19,55],notebook:[20,31],sheet:[21,24],document:[21,24],laundryBasket:[22,46],plateDirty:[23,34],plate:[24,34],sponge:[25,19],crate:[26,39],cozyBox:[27,51],chair:[28,29],coatRack:[29,29],pillow:[30,43],blanketFolded:[31,48]};
  function setImages(next){if(next)images=next;return images;}
  function ready(im){return !!(im&&im.complete!==false&&(im.naturalWidth||im.width));}
  function portrait(c,variant,x,y,w,h){if(variant==='cat'&&ready(images.r5CatPortrait)){var ca=r5Rects.cat[0],cw=Math.min(w*.9,h*ca[2]/ca[3]);return part(c,'cat',0,x+w/2,y+h,cw);}var im=ready(images.r4PortraitBase)?images.r4PortraitBase:images.r4Portraits;if(!ready(im))return false;var map={me:0,hoodie:0,suit:1,lead:2,boss:2,peer:3,customerA:4,commuterA:4,customerB:5,commuterB:5,customerC:6,commuterC:6,cat:7},i=map[variant]===undefined?0:map[variant],iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,sw=iw/4,sh=ih/2;
    var dw=Math.round(Math.min(w,h*sw/sh)),dh=Math.round(dw*sh/sw),dx=Math.round(x+(w-dw)/2),dy=Math.round(y+h-dh);c.save();c.imageSmoothingEnabled=false;c.drawImage(im,(i%4)*sw,Math.floor(i/4)*sh,sw,sh,dx,dy,dw,dh);
    // Keep the user's exact approved face pixels. Only the hoodie below the chin
    // comes from the generated colour correction; the other seven cells use base.
    if(i===0&&im===images.r4PortraitBase&&ready(images.r4Portraits)){var split=330,top=Math.round(dh*split/sh);c.drawImage(images.r4Portraits,0,split,384,512-split,dx,dy+top,dw,dh-top);}
    c.restore();return true;}
  function cut(c,im,a,x,y,w,h,flip){if(!ready(im))return false;c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);c.drawImage(im,a[0],a[1],a[2],a[3],Math.round(-w/2),Math.round(-h),Math.round(w),Math.round(h));c.restore();return true;}
  function generatedPerson(c,x,y,variant,dir,t,pose){
    var main=variant==='me'||variant==='hoodie'||variant==='suit';
    if(main&&ready(images.r6Poses)&&/^(sofaRest|study|sweep|mop)$/.test(pose)){var rf=Math.floor((t||0)*3)%2,ri=pose==='sofaRest'?(variant==='suit'?2:0)+rf:pose==='study'?4+rf:pose==='sweep'?8+(variant==='suit'?2:0)+rf:12+(variant==='suit'?2:0)+rf,ra=r6Rects.poses[ri],rs=pose==='sofaRest'?.18:pose==='study'?.175:.19;return r6Part(c,'poses',ri,x,y,ra[2]*rs,pose==='study'||/^(sweep|mop)$/.test(pose)&&rf===1);}
    if(/^transit[0-3]$/.test(pose)&&ready(images.r6Transit)){var ti=Number(pose.slice(7)),ta=r6Rects.transit[ti];return r6Part(c,'transit',ti,x,y,ta[2]*.09,false);}
    if(main&&ready(images.r5Poses)&&/^(stand|front|back|standBack|tired|cafe)$/.test(pose)){var pi=variant==='suit'?4:0;if(pose==='back'||pose==='standBack')pi+=1;else if(pose==='cafe')pi=10+Math.floor((t||0)*3)%2;else pi+=pose==='front'||dir===0?0:dir<0?3:2;var pa=r5Rects.poses[pi],ph=58;return part(c,'poses',pi,x,y,pa[2]*ph/pa[3]);}
    if(!ready(images.r4People))return false;
    if(pose==='sit'&&ready(images.r4Seated)){var si=variant==='suit'?Math.floor((t||0)*2)%4:variant==='customerA'?4:variant==='customerB'?5:variant==='customerC'?6:variant==='peer'?7:variant==='commuterA'?12:variant==='commuterB'?13:variant==='commuterC'?14:variant==='boss'||variant==='lead'?15:8+Math.floor((t||0)*1.2)%4,sa=seatedRects[si],left=si>=4&&si<8||si>=12;
      cut(c,images.r4Seated,sa,x,y,sa[2]*.178,sa[3]*.178,left?dir>0:dir<0);
      if(si>=8&&si<12){c.save();c.translate(Math.round(x),Math.round(y));c.scale(dir<0?-1:1,1);r(c,0,-27,1,4,'#9c5d52');r(c,2,-27,1,4,'#9c5d52');c.restore();}return true;}
    if(ready(images.r4Actions)&&((variant==='suit'&&pose==='sit')||pose==='kneel'||pose==='care')){
      var ai=pose==='sit'?Math.floor((t||0)*2)%4:4+Math.floor((t||0)*3)%4,aa=actionRects[ai];
      return cut(c,images.r4Actions,aa,x,y,aa[2]*.168,aa[3]*.168,dir<0);
    }
    var moving=pose==='walk'||pose==='walkBack'||pose==='umbrellaWalk',frame=moving?Math.floor((t||0)*10)%8:0,index;
    var npc={lead:24,boss:24,peer:25,customerA:26,customerB:27,customerC:28,commuterA:26,commuterB:27,commuterC:28};
    if(npc[variant]!==undefined){index=npc[variant];if(pose==='sit')index=variant==='customerB'||variant==='commuterB'?30:variant==='customerC'||variant==='commuterC'?31:29;}
    else if(pose==='sleep')index=20;
    else if(pose==='bedSleep')index=21;
    else if(pose==='sit')index=17;
    else if(pose==='kneel'||pose==='care')index=18+(Math.floor((t||0)*3)%2);
    else if(pose==='umbrella'||pose==='umbrellaWalk')index=moving?frame:22;
    else if(pose==='tired')index=23;
    else index=variant==='suit'?8+frame:dir===0&&!moving?16:frame;
    var a=peopleRects[index],w=a[2]*peopleScale,h=a[3]*peopleScale;
    // Only the closed eyes/shoulders are shown above the scene's single blanket.
    if(pose==='bedSleep')return cut(c,images.r4People,a,x,y-11,w,h,false);
    var ok=cut(c,images.r4People,a,x,y,w,h,index>=29?dir>0:dir<0);
    if(pose==='carry')item(c,'briefcase',x+(dir<0?-14:14),y-2,.65);
    return ok;
  }
  function generatedCat(c,x,y,dir,t,pose){
    if(!ready(images.r4Cats))return false;var index=16;
    if(pose==='walk')index=Math.floor((t||0)*12)%8;
    else if(pose==='run')index=24+Math.floor((t||0)*14)%2;
    else if(pose==='jump')index=12;
    else if(/^jump[0-7]$/.test(pose))index=8+Number(pose.slice(4));
    else if(pose==='land')index=15;
    else if(pose==='sleep')index=18+Math.floor((t||0)*1.4)%2;
    else if(pose==='eat')index=20;
    else if(pose==='fear')index=21;
    else if(pose==='purr'||pose==='rub')index=22;
    else if(pose==='play')index=26+Math.floor((t||0)*4)%2;
    else if(pose==='groom')index=28;
    else if(pose==='scratch')index=29;
    else if(pose==='lookUp')index=30;
    else if(pose==='stand')index=23;
    else if(Math.floor((t||0)*2)%13===0)index=17;
    var a=catRects[index],w=a[2]*catScale,h=a[3]*catScale;
    return cut(c,images.r4Cats,a,x,y,w,h,dir<0);
  }
  function generatedItem(c,type,x,y,scale){var ds={feederEmpty:[0,33],fountainEmpty:[1,36],premiumToyBroken:[2,42],autoLitterFull:[3,62]}[type];if(ds&&r6Part(c,'deviceStates',ds[0],x,y,ds[1]*(scale||1)))return true;var bowl={waterEmpty:0,waterLow:1,water:2,bowlWet:3}[type];if(bowl!==undefined&&r6Part(c,'bowls',bowl,x,y,30*(scale||1)))return true;var device={autoLitter:[0,62],feeder:[1,33],fountain:[2,36],robot:[3,36],premiumToy:[4,42],broom:[5,38],mop:[6,38],wetCan:[7,24]}[type];if(device&&r6Part(c,'devices',device[0],x,y,device[1]*(scale||1)))return true;var actions={hand:[8,17],handGrip:[9,15],handPoint:[10,17],handRest:[11,17],charger:[12,41],folder:[13,44],shoes:[14,34],umbrellaGrip:[15,10]},ap=actions[type];
    var rp={rackBoth:[0,92],rackSuit:[1,92],rackHoodie:[2,92],rackEmpty:[3,92],bowlEmpty:[4,30],bowlFull:[5,30],waterLow:[6,30],water:[7,30],shoes:[8,36],darkProduct:[9,25],umbrella:[10,42],hoodieFolded:[11,34],bagOpen:[12,42],briefcase:[13,31],clockFace:[14,28],phone:[15,14]}[type];
    if(rp&&part(c,'props',rp[0],x,y,rp[1]*(scale||1)))return true;
    if(type==='roller'&&ready(images.r4Props)){var ra=propRects[15],rw=23*(scale||1);return cut(c,images.r4Props,ra,x,y+2*(scale||1),rw,rw*ra[3]/ra[2],false);}
    if(ap&&ready(images.r4Actions)){var aa=actionRects[ap[0]],aw=ap[1]*(scale||1);return cut(c,images.r4Actions,aa,x,y,aw,aw*aa[3]/aa[2],false);}
    var p=props[type];if(!p||!ready(images.r4Props))return false;var a=propRects[p[0]],w=p[1]*(scale||1),h=w*a[3]/a[2];
    cut(c,images.r4Props,a,x,y,w,h,false);
    if(type==='hoodie'||type==='hoodieFolded'){c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale||1,scale||1);if(type==='hoodie'){r(c,-3,-25,2,7,'#9c5d52');r(c,2,-25,2,7,'#9c5d52');}else{r(c,-6,-11,2,4,'#9c5d52');r(c,1,-11,2,4,'#9c5d52');}c.restore();}return true;}
  var C = {
    ink:'#293c48', line:'#40535d', wall:'#dedcdd', wallShade:'#b7b9c0', floor:'#b8aca3',
    paper:'#eeebe8', white:'#e7e7e9', blue:'#739eac', blueDark:'#467383', navy:'#365569',
    teal:'#8494a8', green:'#aa7972', grey:'#84909e', greyDark:'#657084', hair:'#4b4140',
    skin:'#e9b68e', skinLight:'#f4cba3', ginger:'#d89553', gingerLight:'#f0bd77',
    gingerDark:'#a96c3e', furWhite:'#f3e4c3', brown:'#8d7460', wood:'#9a8270',
    woodDark:'#72675f', glass:'#a4c3cc', night:'#455f77', food:'#8b6842'
  };
  function r(c,x,y,w,h,col) {
    if (w<=0 || h<=0) return;
    c.fillStyle=col; c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
  }
  function box(c,x,y,w,h,fill,border) {
    r(c,x,y,w,h,border||C.ink); r(c,x+1,y+1,w-2,h-2,fill);
  }
  function oval(c,x,y,rx,ry,col) {
    for(var yy=-Math.ceil(ry);yy<=Math.ceil(ry);yy++) {
      var a=1-yy*yy/(ry*ry||1); if(a<0)continue;
      var xx=Math.max(1,Math.floor(rx*Math.sqrt(a)));
      r(c,x-xx,y+yy,xx*2+1,1,col);
    }
  }
  function shadow(c,x,y,w) { oval(c,x,y,w,2,'#263a4933'); }
  function line(c,x1,y1,x2,y2,col,width) {var steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(var i=0;i<=steps;i++)r(c,x1+(x2-x1)*i/(steps||1),y1+(y2-y1)*i/(steps||1),width||1,width||1,col);}
  function head(c,x,y,kind,dir,closed) {
    var hair=kind==='boss'?'#8b999d':kind==='peer'?'#61524b':kind==='commuterA'?'#434b48':kind==='commuterB'?'#8a8071':kind==='commuterC'?'#59626a':C.hair;
    var side=dir!==0;
    r(c,x-7,y-9,14,19,C.ink); r(c,x-9,y-6,18,13,C.ink);
    r(c,x-7,y-7,14,15,C.skin); r(c,x-8,y-4,16,9,C.skinLight);
    r(c,x-6,y-10,12,3,hair);r(c,x-8,y-8,16,5,hair);
    r(c,x-9,y-6,3,7,hair);r(c,x+6,y-6,3,7,hair);
    r(c,x-6,y-4,5,2,hair);r(c,x,y-5,6,2,hair);r(c,x-3,y-3,3,1,hair);
    if(kind==='peer'||kind==='commuterB'){r(c,x-10,y-4,2,12,hair);r(c,x+8,y-4,2,12,hair);}
    if(kind==='commuterC'){r(c,x-8,y-10,16,4,C.navy);r(c,x-9,y-6,18,2,C.blue);}
    if(kind==='boss'||kind==='lead') {
      box(c,x-6,y,5,4,C.skinLight,C.line);box(c,x+2,y,5,4,C.skinLight,C.line);r(c,x-1,y+1,3,1,C.line);
    } else if(closed) { r(c,x-5,y+1,3,1,C.ink);r(c,x+3,y+1,3,1,C.ink); }
    else { r(c,x-4+(side?1:0),y,2,3,C.ink);r(c,x+3+(side?1:0),y,2,3,C.ink); }
    r(c,x-1+(side?1:0),y+6,3,1,C.brown);
    r(c,x+7,y+3,2,3,C.skin);
  }
  function person(c,x,y,variant,dir,walk,pose) {
    variant=variant||'me';dir=dir===-1?-1:dir===0?0:1;walk=walk||0;pose=pose||'stand';
    if(c.canvas&&c.canvas.width<=100&&c.canvas.height<=100&&portrait(c,variant,0,0,c.canvas.width,c.canvas.height))return;
    if(generatedPerson(c,x,y,variant,dir,walk,pose))return;
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(dir<0?-1:1,1);
    var suit=variant==='suit'||variant==='lead'||variant==='boss'||variant==='commuterA';
    var commuter=variant.indexOf('commuter')===0;
    var body=variant==='commuterA'?'#81959f':variant==='commuterB'?'#aaa995':variant==='commuterC'?'#688797':suit?C.navy:variant==='peer'?'#dfd8c7':C.grey;
    var shade=variant==='commuterA'?'#607884':variant==='commuterB'?'#8b927f':variant==='commuterC'?'#496b80':suit?'#273f52':variant==='peer'?'#a99f8b':C.greyDark;
    if(pose==='bedSleep') {
      // 침대에 놓인 베개를 기준으로 머리와 어깨만 그린다. 이불·침대는 장면에 하나다.
      var breath=Math.round((Math.sin(walk*1.7)+1)*.3);
      r(c,-12,-23+breath,24,14,C.ink);r(c,-10,-22+breath,20,12,body);
      r(c,-3,-29,6,9,C.skin);r(c,-2,-28,4,7,C.skinLight);
      r(c,-11,-13,9,4,shade);r(c,5,-14,7,5,C.skinLight);head(c,0,-35,variant,0,true);
      c.restore();return;
    }
    if(pose==='sleep') {
      shadow(c,0,0,30);r(c,-15,-21,28,19,C.ink);r(c,-13,-19,24,15,body);
      r(c,-19,-17,8,7,C.skin);r(c,10,-16,18,13,C.ink);r(c,11,-14,15,9,C.navy);
      r(c,26,-14,5,5,C.ink);r(c,26,-7,5,4,C.ink);head(c,-23,-17,variant,0,true);
      r(c,-12,-10,16,5,shade);r(c,1,-10,6,4,C.skinLight);
      c.restore();return;
    }
    if(pose==='kneel'){
      shadow(c,2,0,18);r(c,-11,-13,22,12,C.ink);r(c,-9,-12,18,9,C.navy);r(c,7,-8,15,7,C.ink);r(c,8,-7,12,4,C.blueDark);
      r(c,-10,-26,20,17,C.ink);r(c,-9,-25,18,14,body);r(c,-6,-28,12,5,shade);r(c,-3,-27,1,6,C.paper);r(c,3,-27,1,6,C.paper);
      r(c,-3,-33,6,8,C.skin);r(c,-2,-32,4,7,C.skinLight);r(c,-13,-23,4,13,C.ink);r(c,-12,-22,2,10,body);r(c,-12,-12,5,4,C.skinLight);
      r(c,9,-23,7,6,body);r(c,14,-20,7,4,C.skinLight);head(c,-1,-38,variant,1,false);c.restore();return;
    }
    var moving=pose==='walk'||pose==='umbrellaWalk', cycle=walk*8, step=moving?Math.sin(cycle):0;
    var bob=moving?Math.round(Math.abs(Math.sin(cycle))*1):0;
    shadow(c,0,0,12);c.translate(0,-bob);
    var left=step>.15?-2:0,right=step<-.15?-2:0,spread=Math.round(step*2);
    r(c,-7,-16,6,13+left,C.ink);r(c,2,-16,6,13+right,C.ink);
    r(c,-6,-15,4,11+left,shade);r(c,3,-15,4,11+right,shade);
    r(c,-8+spread,-3+left,8,3,C.ink);r(c,2-spread,-3+right,9,3,C.ink);
    r(c,-9,-34,18,21,C.ink);r(c,-11,-31,22,14,C.ink);
    r(c,-8,-33,16,19,body);r(c,-10,-29,20,10,body);r(c,-7,-17,14,3,shade);
    r(c,-4,-39,8,9,C.ink);r(c,-3,-39,6,7,C.skin);r(c,-2,-38,4,6,C.skinLight);
    if(suit) {
      r(c,-3,-33,6,9,C.paper);r(c,-1,-32,2,13,variant==='boss'?C.teal:C.blue);
      r(c,-6,-33,3,3,shade);r(c,3,-33,3,3,shade);r(c,-4,-29,2,6,shade);r(c,3,-29,2,6,shade);
      r(c,5,-23,3,1,C.grey);r(c,0,-18,1,1,C.grey);
    } else if(variant==='peer') {
      r(c,-4,-33,8,19,C.paper);r(c,-5,-33,2,8,shade);r(c,4,-33,2,8,shade);r(c,-2,-32,4,2,C.white);
      r(c,-3,-33,3,4,C.white);r(c,1,-33,3,4,C.white);r(c,0,-27,1,1,C.greyDark);
      r(c,2,-23,1,1,C.green);r(c,2,-19,1,1,C.green);
    } else if(commuter){
      r(c,-2,-33,4,19,shade);r(c,0,-28,1,1,C.paper);r(c,0,-22,1,1,C.paper);if(variant==='commuterC')r(c,-7,-35,14,4,C.grey);
    } else {
      r(c,-5,-34,10,3,shade);r(c,-3,-32,1,6,C.paper);r(c,3,-32,1,6,C.paper);
      r(c,-5,-23,10,5,shade);r(c,-4,-23,8,1,body);
    }
    var arm=Math.round(step*3);
    r(c,-13,-29+arm,4,14,C.ink);r(c,-12,-28+arm,2,11,body);r(c,-12,-16+arm,3,4,C.skinLight);
    if(pose==='umbrella'||pose==='umbrellaWalk'){r(c,9,-29,5,10,C.ink);r(c,10,-28,3,7,body);r(c,12,-26,7,5,C.ink);r(c,13,-25,5,3,body);r(c,17,-29,4,5,C.skinLight);}
    else{r(c,9,-29-arm,4,14,C.ink);r(c,10,-28-arm,2,11,body);r(c,10,-16-arm,3,4,C.skinLight);}
    if(pose==='sit') {r(c,-8,-12,14,7,shade);r(c,4,-9,12,5,C.ink);r(c,9,-5,8,3,C.ink);}
    head(c,0,-47,variant,dir,pose==='tired');
    if(pose==='carry'){item(c,'briefcase',14,-9,.65);}
    c.restore();
  }
  function cat(c,x,y,dir,walk,pose) {
    dir=dir===-1?-1:1;walk=walk||0;pose=pose||'stand';
    if(c.canvas&&c.canvas.width<=100&&c.canvas.height<=100&&ready(images.r4Portraits)){c.save();c.setTransform(1,0,0,1,0,0);portrait(c,'cat',0,0,c.canvas.width,c.canvas.height);c.restore();return;}
    if(generatedCat(c,x,y,dir,walk,pose))return;
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(dir,1);
    var sway=Math.round(Math.sin(walk*4)*2),step=pose==='walk'?Math.sin(walk*12):0;
    if(pose!=='jump')shadow(c,-2,0,14);
    if(pose==='sleep') {
      var breath=Math.sin(walk*2)>0?1:0;
      oval(c,-3,-6,13,6+breath,C.ink);oval(c,-3,-6,12,5+breath,C.ginger);
      r(c,-12,-6,4,3,C.gingerDark);r(c,-8,-5,3,2,C.gingerDark);
      r(c,5,-13,9,11,C.ink);r(c,6,-12,7,9,C.gingerLight);r(c,6,-15,3,4,C.gingerDark);
      r(c,7,-7,3,1,C.ink);r(c,11,-7,2,1,C.ink);r(c,-6,-3,13,2,C.gingerLight);
      c.restore();return;
    }
    var fear=pose==='fear',sit=pose==='sit',jump=pose==='jump',eat=pose==='eat';
    var by=fear?-11:sit?-15:-14;
    r(c,-18,by+1+sway,3,7,C.ink);r(c,-20,by-1+sway,3,6,C.ink);
    r(c,-19,by+sway,2,6,C.ginger);r(c,-17,by+3+sway,3,6,C.gingerLight);
    r(c,-13,by,22,11,C.ink);r(c,-12,by+1,20,9,C.ginger);
    r(c,-8,by+1,3,3,C.gingerDark);r(c,-1,by+1,3,3,C.gingerDark);
    r(c,-9,-5,13,3,C.furWhite);
    if(!jump) {
      var a=step>.2?-2:0,b=step<-.2?-2:0;
      r(c,-11,-6,4,6+a,C.ink);r(c,-10,-5,2,4+a,C.gingerLight);r(c,-11,-2+a,4,2,C.furWhite);
      r(c,3,-6,4,6+b,C.ink);r(c,4,-5,2,4+b,C.gingerLight);r(c,3,-2+b,4,2,C.furWhite);
      if(sit)r(c,-11,-10,11,9,C.ginger);
    } else {r(c,-9,-5,5,3,C.furWhite);r(c,1,-5,5,3,C.furWhite);}
    var hy=eat?-10:fear?-13:-19;
    r(c,3,hy,14,12,C.ink);r(c,4,hy+1,12,10,C.gingerLight);
    if(!fear) {
      r(c,3,hy-4,3,5,C.ink);r(c,4,hy-3,2,4,C.gingerDark);
      r(c,13,hy-4,4,5,C.ink);r(c,14,hy-3,2,4,C.gingerDark);
    } else {r(c,1,hy-1,5,2,C.ink);r(c,14,hy-1,5,2,C.ink);}
    r(c,8,hy+1,2,3,C.gingerDark);r(c,12,hy+1,2,2,C.gingerDark);
    r(c,6,hy+5,2,pose==='purr'?1:2,C.ink);r(c,13,hy+5,2,pose==='purr'?1:2,C.ink);r(c,10,hy+8,2,1,C.brown);
    r(c,0,hy+8,4,1,C.furWhite);r(c,16,hy+8,4,1,C.furWhite);
    c.restore();
  }
  function item(c,type,x,y,scale) {
    if(generatedItem(c,type,x,y,scale))return;
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale||1,scale||1);
    switch(type) {
    case 'roller':
      r(c,1,-16,3,16,C.ink);r(c,2,-15,1,12,C.teal);r(c,-2,-20,5,6,C.line);
      box(c,-11,-29,23,12,C.paper);r(c,-9,-27,18,2,C.white);r(c,10,-26,2,6,C.grey);break;
    case 'hoodie':
      r(c,-7,-33,14,5,C.ink);r(c,-9,-30,18,6,C.ink);r(c,-15,-25,30,20,C.ink);
      r(c,-18,-23,6,17,C.ink);r(c,12,-23,6,17,C.ink);r(c,-12,-23,24,22,C.ink);
      r(c,-6,-32,12,5,C.greyDark);r(c,-8,-29,16,5,C.grey);r(c,-14,-24,28,18,C.grey);
      r(c,-17,-22,4,15,C.grey);r(c,14,-22,3,15,C.grey);r(c,-11,-21,22,19,C.grey);
      r(c,-5,-29,10,4,C.greyDark);r(c,-3,-24,1,8,C.paper);r(c,3,-24,1,8,C.paper);
      r(c,-7,-12,14,7,C.greyDark);r(c,-6,-11,12,1,C.grey);break;
    case 'suit':
      r(c,-5,-39,10,2,C.ink);r(c,-1,-38,2,6,C.greyDark);r(c,-12,-33,24,3,C.woodDark);
      r(c,-11,-30,22,29,C.ink);r(c,-17,-28,6,22,C.ink);r(c,11,-28,6,22,C.ink);
      r(c,-10,-29,20,27,C.navy);r(c,-16,-27,4,19,C.navy);r(c,12,-27,4,19,C.navy);
      r(c,-4,-29,8,11,C.paper);r(c,-1,-28,2,15,C.blue);r(c,-6,-28,2,8,C.line);r(c,5,-28,2,8,C.line);
      r(c,0,-10,1,1,C.paper);r(c,5,-17,4,1,C.grey);break;
    case 'foodBag':
      r(c,-13,-34,26,34,C.ink);r(c,-12,-33,24,32,C.paper);r(c,-13,-34,26,4,C.green);
      r(c,-11,-9,22,7,C.teal);r(c,-6,-25,12,12,C.navy);r(c,-7,-28,4,5,C.navy);r(c,3,-28,4,5,C.navy);
      r(c,-3,-18,1,1,C.paper);r(c,3,-18,1,1,C.paper);break;
    case 'wetFood':
      oval(c,0,-3,13,4,C.ink);r(c,-13,-24,26,21,C.ink);r(c,-12,-23,24,20,C.paper);r(c,-12,-19,24,13,C.teal);
      oval(c,0,-24,13,4,C.ink);oval(c,0,-25,12,3,C.grey);r(c,-5,-27,10,2,C.white);r(c,2,-27,4,4,C.line);
      r(c,-5,-16,10,6,C.paper);r(c,-7,-17,3,3,C.paper);r(c,5,-18,3,5,C.paper);r(c,-4,-14,1,1,C.navy);break;
    case 'laundryBasket':
      box(c,-21,-25,42,24,'#b7d0c5');r(c,-23,-28,46,5,C.line);r(c,-21,-27,42,3,C.paper);
      for(var by=0;by<3;by++)for(var bx=0;bx<5;bx++)r(c,-17+bx*8,-20+by*6,5,3,'#7d9c94');
      r(c,-15,-30,12,3,C.grey);r(c,-6,-34,17,7,C.white);r(c,8,-29,8,3,C.blue);break;
    case 'bowlEmpty':case 'bowlFull':case 'water':
      oval(c,0,-5,15,6,C.ink);r(c,-13,-5,26,5,type==='water'?C.blue:C.paper);
      oval(c,0,-7,14,5,type==='water'?C.blue:C.white);oval(c,0,-8,11,3,type==='water'?'#74b9cf':C.greyDark);
      if(type==='water'){r(c,-7,-10,8,1,'#c2e3e7');r(c,5,-8,3,1,'#c2e3e7');}
      if(type==='bowlFull')for(var i=0;i<13;i++)r(c,-9+(i*7)%18,-11+(i%3)*2,3,2,i%2?C.food:C.woodDark);
      break;
    case 'toy':
      r(c,-9,-6,15,5,C.ink);r(c,-8,-7,12,5,C.green);r(c,3,-8,5,5,C.paper);r(c,6,-6,1,1,C.ink);
      r(c,-15,-3,7,1,C.grey);r(c,-17,-2,3,1,C.grey);r(c,-16,-1,2,1,C.grey);break;
    case 'laptop':
      box(c,-24,-33,48,30,C.navy);r(c,-20,-29,40,22,'#a7cbd2');r(c,-15,-25,23,3,C.white);r(c,-15,-19,30,2,'#76a2ae');
      r(c,-28,-3,56,5,C.ink);r(c,-26,-3,52,3,C.grey);r(c,-7,-3,14,2,C.white);break;
    case 'charger':
      line(c,-9,-18,-17,-26,C.ink,2);line(c,-17,-26,-25,-20,C.ink,2);line(c,-25,-20,-18,-7,C.ink,2);line(c,-18,-7,7,-5,C.ink,2);
      box(c,-5,-23,23,21,C.paper);r(c,-1,-19,15,2,C.grey);r(c,17,-18,7,3,C.ink);r(c,22,-20,2,7,C.greyDark);break;
    case 'notebook':
      box(c,-15,-36,31,36,'#95baaa');r(c,-14,-35,5,34,'#497b75');r(c,-5,-28,16,4,C.paper);r(c,-4,-20,14,2,'#cde3d4');r(c,-4,-14,12,2,'#cde3d4');break;
    case 'shoes':
      box(c,-16,-8,13,8,C.navy);r(c,-18,-5,16,5,C.ink);r(c,-15,-10,10,4,C.blueDark);r(c,-15,-8,7,1,C.white);
      box(c,4,-9,13,9,C.navy);r(c,3,-5,17,5,C.ink);r(c,6,-11,9,4,C.blueDark);r(c,7,-9,6,1,C.white);break;
    case 'briefcase':
      box(c,-14,-22,28,20,C.navy);r(c,-7,-27,14,6,C.ink);r(c,-5,-25,10,3,C.floor);
      r(c,-12,-13,24,1,C.blueDark);r(c,-2,-15,4,4,C.grey);break;
    case 'phone':
      box(c,-9,-31,18,31,C.ink);r(c,-7,-27,14,22,C.glass);r(c,-4,-21,9,2,C.paper);
      r(c,-4,-17,7,1,C.paper);r(c,-4,-13,10,1,C.paper);r(c,-2,-3,4,1,C.grey);break;
    case 'umbrella':
      r(c,-1,-31,2,28,C.ink);r(c,-1,-4,6,3,C.ink);r(c,4,-8,2,6,C.ink);
      for(var yy=0;yy<19;yy++){var ww=Math.round(28*Math.sqrt(Math.max(0,1-Math.pow((18-yy)/18,2))));r(c,-ww,-49+yy,ww*2+1,1,C.ink);if(ww>2)r(c,-ww+1,-49+yy,ww*2-1,1,yy<5?'#ffc36b':'#ed7c45');}
      for(var rib=-1;rib<=1;rib++){for(var z=0;z<17;z++)r(c,rib*z*.7,-48+z,1,1,rib?'#ffe5b2':'#b95135');}
      [-20,0,20].forEach(function(xx){r(c,xx-7,-31,14,2,C.ink);r(c,xx-5,-30,10,2,'#ed7c45');});r(c,-1,-53,2,5,C.ink);break;
    case 'folder':
      r(c,-22,-28,18,8,C.ink);r(c,-20,-26,15,5,C.blue);box(c,-22,-23,44,23,C.blueDark);
      r(c,-17,-29,32,15,C.paper);r(c,-14,-25,24,1,C.grey);r(c,-14,-21,20,1,C.grey);
      box(c,-22,-18,44,18,C.blue);r(c,-20,-16,40,2,C.glass);r(c,-7,-11,17,5,C.paper);break;
    case 'calendar':
      box(c,-20,-34,40,34,C.paper);r(c,-19,-33,38,8,C.teal);r(c,-12,-38,3,9,C.line);r(c,9,-38,3,9,C.line);
      for(var cy=0;cy<3;cy++)for(var cx=0;cx<4;cx++)r(c,-14+cx*8,-20+cy*6,5,3,cx===2&&cy===1?C.blueDark:'#bdcdc0');break;
    case 'chart':
      box(c,-19,-34,38,34,C.paper);r(c,-15,-29,26,2,C.blueDark);r(c,-13,-6,27,1,C.line);r(c,-13,-23,1,18,C.line);
      r(c,-8,-14,5,8,C.blue);r(c,0,-21,5,15,C.teal);r(c,8,-25,5,19,C.green);break;
    case 'hand':
      r(c,-5,-10,10,9,C.ink);r(c,-4,-10,8,8,C.skinLight);r(c,-4,-16,2,7,C.ink);r(c,-3,-15,1,7,C.skinLight);
      r(c,4,-8,3,6,C.ink);r(c,4,-7,2,4,C.skin);break;
    case 'sheet':case 'document':
      box(c,-13,-29,24,29,C.paper);r(c,-10,-25,15,2,C.blueDark);r(c,-10,-20,17,1,C.greyDark);
      r(c,-10,-16,17,1,C.greyDark);r(c,-10,-12,12,1,C.greyDark);r(c,2,-8,5,3,C.teal);break;
    case 'chair':
      box(c,-12,-35,24,18,C.blue);r(c,-13,-17,27,6,C.ink);r(c,-11,-16,23,3,C.blueDark);
      r(c,-10,-11,3,11,C.ink);r(c,8,-11,3,11,C.ink);break;
    case 'box':
      box(c,-18,-24,36,24,C.wood);r(c,-17,-22,34,3,C.paper);r(c,-2,-23,4,22,C.woodDark);
      r(c,-9,-12,7,2,C.woodDark);break;
    default: box(c,-7,-14,14,14,C.blue);
    }
    c.restore();
  }
  function train(c,x,y,doorsOpen,t) {
    c.save();c.translate(Math.round(x),Math.round(y));
    var d=typeof doorsOpen==='number'?Math.max(0,Math.min(1,doorsOpen)):(doorsOpen?1:0);
    box(c,0,0,500,98,C.white);r(c,2,4,496,6,C.grey);r(c,2,70,496,8,C.teal);r(c,2,90,496,6,C.greyDark);
    [20,88,156,304,372,440].forEach(function(xx){box(c,xx,18,48,40,C.night);r(c,xx+3,21,42,7,C.glass);r(c,xx+22,19,2,38,C.grey);});
    [220,280].forEach(function(xx){r(c,xx-3,9,45,81,C.ink);r(c,xx,11,39,77,C.wallShade);});
    var mid=251;
    r(c,218,12,64,78,C.ink);r(c,220-Math.round(d*23),13,30,76,C.wallShade);r(c,252+Math.round(d*23),13,28,76,C.wallShade);
    box(c,223-Math.round(d*23),22,23,35,C.night);box(c,255+Math.round(d*23),22,21,35,C.night);
    if(d>0)r(c,mid-Math.round(d*24),88,Math.round(d*48),3,C.paper);
    r(c,236,3,27,4,C.navy);r(c,240,4,19,2,C.paper);
    r(c,15,96,24,5,C.ink);r(c,460,96,24,5,C.ink);r(c,3,8,5,5,C.paper);r(c,491,8,5,5,C.paper);
    c.restore();
  }
  function rain(c,rect,t,intensity) {
    if(!rect)return;intensity=intensity===undefined?1:intensity;t=t||0;
    c.save();c.beginPath();c.rect(rect.x,rect.y,rect.w,rect.h);c.clip();
    var count=Math.ceil(46*Math.max(0,intensity));
    for(var i=0;i<count;i++){
      var xx=rect.x+((i*47+t*14)%(rect.w+20))-10;
      var yy=rect.y+((i*29+t*(72+i%4*11))%(rect.h+18))-12;
      r(c,xx,yy,1,4,'#c9e1e6aa');r(c,xx-1,yy+4,1,4,'#a8cbd1aa');
    }
    c.restore();
  }
  function floor(c,y) {
    r(c,0,y,640,360-y,C.floor);
    for(var i=0;i<8;i++){r(c,0,y+i*14,640,1,'#a7a998');for(var j=0;j<8;j++)r(c,j*90+(i%2)*38,y+i*14,1,14,'#aaad9d');}
  }
  function window(c,x,y,w,h) {
    box(c,x,y,w,h,C.night,C.greyDark);r(c,x+3,y+3,w-6,h-6,'#648499');
    r(c,x+w/2-1,y,2,h,C.paper);r(c,x,y+h-3,w,3,C.paper);
    r(c,x-5,y-3,6,h+9,C.wallShade);r(c,x+w-1,y-3,6,h+9,C.wallShade);
  }
  function door(c,x,y,w,h) {
    box(c,x,y,w,h,C.paper,C.greyDark);r(c,x+5,y+6,w-10,h-15,'#d8e0da');
    r(c,x+w-10,y+h*.55,3,4,C.woodDark);r(c,x+3,y+h-3,w-6,2,C.wallShade);
  }
  function fallback(c,kind,t){var spec={bedroom:['r5Home',0,2,2],living:['r5Home',2,2,2],shop:['r5Shop',0,1,1],street:['r4Outdoors',0,2,2],station:['r4Outdoors',1,2,2],train:['r4Outdoors',2,2,2],office:['r4Scenes',3,2,2]}[kind];if(spec&&scene(c,spec[0],spec[1],spec[2],spec[3],0,0,640,360))return true;r(c,0,0,640,360,C.wall);return false;}
  return {palette:C,person:person,cat:cat,item:item,portrait:portrait,train:train,rain:rain,fallback:fallback,setImages:setImages,assetSources:assetSources,part:part,r6Part:r6Part,scene:scene,surface:surface,r5Rects:r5Rects,r6Rects:r6Rects,atlas:{people:peopleRects,cats:catRects,props:propRects,actions:actionRects,seated:seatedRects,items:props}};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=PixelArt;
