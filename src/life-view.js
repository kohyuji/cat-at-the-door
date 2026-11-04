/* 장면과 소품을 그린다. 조작 좌표는 640 × 360 기준이다. */
var LifeView = (function () {
  'use strict';
  var titleImages=null,jumpMemory=new WeakMap();
  var C={ink:'#304650',line:'#6e858d',paper:'#efedef',ivory:'#ecebef',blue:'#779fb1',navy:'#41667d',mint:'#8c9baa',green:'#7d8791',floor:'#c3b9ae',night:'#36516d',skin:'#efc5a5',fur:'#e8b775'};
  function r(c,x,y,w,h,col){if(w<=0||h<=0)return;c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function box(c,x,y,w,h,col,line){r(c,x,y,w,h,line||C.ink);r(c,x+2,y+2,w-4,h-4,col);}
  function oval(c,x,y,rx,ry,col){for(var yy=-Math.ceil(ry);yy<=Math.ceil(ry);yy++){var a=1-yy*yy/(ry*ry||1);if(a<0)continue;var xx=Math.max(1,Math.floor(rx*Math.sqrt(a)));r(c,x-xx,y+yy,xx*2+1,1,col);}}
  function line(c,x1,y1,x2,y2,col,width){var n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(var i=0;i<=n;i++)r(c,x1+(x2-x1)*i/(n||1),y1+(y2-y1)*i/(n||1),width||1,width||1,col);}
  function poly(c,points,col){var low=Math.floor(Math.min.apply(null,points.map(function(p){return p[1];}))),high=Math.ceil(Math.max.apply(null,points.map(function(p){return p[1];})));for(var y=low;y<=high;y++){var xs=[];for(var i=0;i<points.length;i++){var a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort(function(a,b){return a-b;});for(var j=0;j+1<xs.length;j+=2)r(c,xs[j],y,xs[j+1]-xs[j]+1,1,col);}}
  function text(c,s,x,y,size,col,align){c.fillStyle=col||C.ink;c.font=(size||16)+'px NeoDunggeunmoPro, DOSGothic, monospace';c.textAlign=align||'left';c.textBaseline='middle';c.fillText(s,x,y);}
  function art(c,type,x,y,s){PixelArt.item(c,type,x,y,s||1);}
  function sprite(c,x,y,s,fn){c.save();c.translate(Math.round(x),Math.round(y));c.scale(s,s);fn();c.restore();}
  function person(c,p,variant,pose){var back=p.pose==='back'||p.facing==='shelf'||p.facing==='back',intent=p.walk>0&&(!pose||/^(stand|front|back|standBack|walkBack|umbrella)$/.test(pose))?(pose==='umbrella'?'umbrellaWalk':'walk'):pose||(back?'back':p.pose||'stand');sprite(c,p.x,p.y,2.15,function(){PixelArt.person(c,0,0,variant,p.dir,p.walk,intent);});}
  function hero(c,G,variant,pose){if(!pose&&/^(sleep|bedSleep)$/.test(G.hero.pose||''))pose='stand';person(c,G.hero,variant,pose);if(G.s&&G.s.hasBag&&!G.sleeping)art(c,'briefcase',G.hero.x+(G.hero.dir<0?-27:27),G.hero.y-3+(G.hero.walk?Math.sin(G.hero.walk*8)*2:0),1.1);}
  function cat(c,p){if(!p)return;sprite(c,p.x,p.y,1.6,function(){PixelArt.cat(c,0,0,p.dir,p.walk,p.pose||(p.walk?'walk':'sit'));});}
  function npc(c,x,y,variant,dir,pose,t){person(c,{x:x,y:y,dir:dir||1,walk:t||0},variant,pose||'stand');}
  function dots(c,x,y,n,col){for(var i=0;i<n;i++)r(c,x+(i*17)%31,y+(i*11)%24,3,1,col);}
  function rollerFur(i){var points=[[243,174],[390,182],[278,181],[353,176],[247,208],[386,218],[279,219],[354,222],[244,246],[392,249],[280,266],[353,270],[277,244],[358,200],[276,201],[351,249]];return{x:points[i%points.length][0],y:points[i%points.length][1],on:true};}
  function coatMask(x,y){return(x>=269&&x<=289&&y>=159&&y<=281)||(x>=347&&x<=366&&y>=158&&y<=282)||(x>=238&&x<=254&&y>=164&&y<=254)||(x>=382&&x<=397&&y>=164&&y<=255);}
  function rollerHead(m){return{x:m.p.x-31,y:m.p.y-17,w:62,h:34};}
  function rollerPeel(m){return{x:m.p.x+19,y:m.p.y-17,w:14,h:16};}
  function panel(c,G){r(c,0,0,640,360,'#30344288');box(c,51,28,538,304,C.ivory,C.ink);r(c,55,32,530,6,C.paper);r(c,55,301,530,27,'#d1d0d5');}
  function floor(c,y,col){r(c,0,y,640,360-y,col||C.floor);for(var i=0;i<8;i++)r(c,0,y+i*17,640,1,'#8e858533');}
  function sceneSlice(c,im,a,x,y,w,h){var sx=(im.naturalWidth||im.width)/1672,sy=(im.naturalHeight||im.height)/941;c.drawImage(im,a[0]*sx,a[1]*sy,a[2]*sx,a[3]*sy,x,y,w,h);}

  var pixelSurfaces=new WeakMap(),careBaselines=[250,250,251,251,251,251,248,248,244,245,244,245,247,247,247,247,248,248,243,243,239,239,239,239];
  var layout={
    bedroom:{phone:{x:112,y:207,w:38,h:38,cx:130,cy:225},room:{x:526,y:78,w:96,h:200,cx:600,cy:188,gx:572,gy:319},bed:{x:24,y:181,w:228,h:120},clothes:{x:430,y:184,w:92,h:90},bag:{x:492,y:289,w:39,h:35},roller:{x:439,y:245,w:40,h:48},curtain:{x:33,y:32,w:204,h:144,cx:225,cy:111,gx:280,gy:319}},
    bedtime:{phone:{x:104,y:231,w:42,h:32,cx:125,cy:246},room:{x:526,y:78,w:96,h:200,cx:600,cy:188,gx:572,gy:319}},
    living:{room:{x:526,y:78,w:96,h:200,cx:600,cy:188,gx:572,gy:319},food:{x:531,y:300,w:46,h:42,cx:550,cy:320,gx:550,gy:333},water:{x:469,y:300,w:45,h:42,cx:490,cy:320,gx:490,gy:333},litter:{x:143,y:277,w:77,h:59,cx:180,cy:309,gx:229,gy:327},rest:{x:374,y:188,w:147,h:90,cx:447,cy:244,gx:447,gy:300},curtain:{x:386,y:40,w:130,h:120,cx:507,cy:111,gx:449,gy:304},catHide:{x:511,y:248},catReveal:{x:521,y:304},robot:{x:112,y:263,w:35,h:34,cx:130,cy:284,gx:130,gy:320},sweep:{x:233,y:248,w:25,h:48,cx:245,cy:280,gx:245,gy:323},mop:{x:267,y:248,w:25,h:48,cx:279,cy:280,gx:279,gy:323},toy:{x:333,y:288,w:52,h:48,cx:360,cy:321,gx:360,gy:325}},
    street:{home:{x:413,y:146,w:187,h:171,cx:501,cy:242,gx:551,gy:320}},
    shop:{dry:{x:208,y:136,w:60,h:58,gx:238,gy:320,cx:238,base:185},wet:{x:304,y:136,w:60,h:58,gx:334,gy:320,cx:334,base:185},dark:{x:402,y:136,w:60,h:58,gx:432,gy:320,cx:432,base:185},shoproller:{x:496,y:136,w:60,h:58,gx:526,gy:320,cx:526,base:185},small:{x:208,y:201,w:60,h:46,gx:238,gy:320,cx:238,base:235},shopexit:{x:12,y:82,w:130,h:182,gx:80,gy:320}},
    mini:{feed:{start:{x:270,y:255},target:{x:338,y:310}},water:{start:{x:270,y:255},target:{x:338,y:310}},curtain:{closed:{x:320,y:175},open:{x:448,y:175},handle:{x:448,y:175}},litter:{tool:{x:110,y:190},safe:{x:232,y:150,w:176,h:60},clumpPoints:[{x:250,y:166},{x:286,y:191},{x:324,y:164},{x:361,y:193},{x:394,y:167},{x:321,y:195}]}}
  };
  layout.shop.appliances={x:281,y:196,w:272,h:43,cx:418,cy:219,gx:426,gy:326};
  layout.shop.appliances.base=235;
  layout.mini.sweep={tool:{x:130,y:315},patches:[{x:245,y:294},{x:310,y:294},{x:375,y:294},{x:440,y:294},{x:245,y:327},{x:310,y:327},{x:375,y:327},{x:440,y:327}]};
  layout.mini.mop=layout.mini.sweep;
  layout.mini.feed.favoriteStart={x:320,y:220};
  layout.mini.feed.favoriteTarget={x:341,y:310};
  function outfit(G){return G.dressed||G.s&&G.s.dressed?'suit':'hoodie';}
  function bedView(G){return !G.catControl&&(G.scene==='bedroom'||G.scene==='bedtime')&&!!(G.scene==='bedtime'||G.sleeping||G.heroOnBed||G.intro==='bedPhone'||G.mini&&G.mini.type==='bed');}
  function hotspots(G){G=G||{};var a=G.scene==='living'?layout.living:G.scene==='street'?layout.street:G.scene==='shop'?layout.shop:layout.bedroom,h=Object.assign({},a,{phone:bedView(G)?layout.bedtime.phone:layout.bedroom.phone,shop:layout.shop,mini:layout.mini}),e=G.s&&G.s.equipment||{};if(h.room)h.room=Object.assign({},h.room,{cx:G.doorOpen===false?550:600,cy:188});if(G.scene==='living'){if(e.autoLitter)h.litter={x:146,y:259,w:69,h:77,cx:180,cy:290,gx:229,gy:327};if(e.feeder)h.food={x:530,y:270,w:42,h:65,cx:550,cy:309,gx:550,gy:334};if(e.fountain)h.water={x:468,y:281,w:43,h:54,cx:490,cy:313,gx:490,gy:334};}return h;}
  function minute(G){if(G.timeFlow){var f=G.timeFlow;return f.from+(f.to-f.from)*Math.max(0,Math.min(1,f.progress||0));}if(typeof G.timeVisualMinute==='number')return G.timeVisualMinute;if(G.s&&typeof G.s.visualMinute==='number')return G.s.visualMinute;return G.s&&typeof Life!=='undefined'&&Life.clock?Life.clock(G.s).minutes:G.s&&G.s.minute!==undefined?G.s.minute:540;}
  function pixelFrame(c,paint){var cv=pixelSurfaces.get(c.canvas);if(!cv){cv=PixelArt.surface(c,640,360);if(cv)pixelSurfaces.set(c.canvas,cv);}if(!cv){c.save();c.imageSmoothingEnabled=false;paint(c);c.restore();return;}var pc=cv.getContext('2d');pc.setTransform(1,0,0,1,0,0);pc.clearRect(0,0,640,360);pc.imageSmoothingEnabled=false;paint(pc);c.save();c.imageSmoothingEnabled=false;c.drawImage(cv,0,0,640,360,0,0,640,360);c.restore();}
  function roomLight(c,G){var m=minute(G);if(m>=1140||m<360)r(c,0,0,640,360,G.lightsOff||G.nightScene?'#141d3b88':'#18223748');else if(m>=960)r(c,0,0,640,360,'rgba(170,103,84,'+(Math.min(.13,(m-960)/180*.13))+')');}
  function bedroomRack(c,G){var s=G.s||{},dressed=outfit(G)==='suit',kind=dressed?(s.hoodie?'rackEmpty':'rackHoodie'):s.suitStored===false?'rackEmpty':'rackSuit';art(c,kind,476,274,.96);}
  function bedtime(c,G,m){var open=(m?m.door:G.doorOpen)>.5,stage=G.bedStage||'',awake=!!(m||G.intro==='bedPhone'||/^(thinking|choosing|settling|waking|awake)$/.test(stage)),g=Object.assign({},G,{doorOpen:open}),a=PixelArt.r6Rects.bed[awake?0:1],im=G.images&&G.images.r6Bed;atlas(c,g,'bedroom');windowMotion(c,g,'bedroom');bedroomRack(c,g);if(im){c.save();c.imageSmoothingEnabled=false;c.drawImage(im,a[0],a[1],a[2],a[3],24,181,228,120);c.restore();}if(G.phoneBuzz&&G.now>=G.phoneBuzz.start&&G.now-G.phoneBuzz.start<G.phoneBuzz.duration){var p=layout.bedtime.phone,b=Math.sin((G.now-G.phoneBuzz.start)*58)>0?1:0;line(c,p.x-4,p.y+4+b,p.x-2,p.y+11+b,'#edcb8a',1);line(c,p.x+28,p.y+3-b,p.x+30,p.y+10-b,'#edcb8a',1);}if(!G.s||!G.s.hasBag)art(c,'briefcase',510,320,1.1);if(G.catOnBed)cat(c,{x:195,y:250,dir:-1,walk:G.now||0,pose:'sleep'});else if(G.jump)jumpCat(c,G);roomLight(c,g);}
  function careBackdrop(c,G){c.save();c.translate(-218,-240);c.scale(1.8,1.8);atlas(c,G,'living');windowMotion(c,G,'living');roomLight(c,G);c.restore();}
  function care(c,G,kind,m){careBackdrop(c,G);m=m||{};var start=m.origin||layout.mini[kind]&&layout.mini[kind].start||layout.mini.feed.start,motion=m.motion;if(motion===undefined&&m.p)motion=Math.max(0,Math.min(1,((m.p.x-start.x)*68+(m.p.y-start.y)*55)/(68*68+55*55)));var frame;if(kind==='pet')frame=m.complete||!m.down&&!(m.moved>0)?3:Math.floor((m.moved||0)/24)%3;else frame=m.complete||m.progress>=1?3:m.pouring?2:(motion||0)>.25?1:0;var group=(outfit(G)==='suit'?12:0)+(kind==='water'?4:kind==='pet'?8:0),k=1.15,x=start.x-109*k,y=start.y-195*k+(250-careBaselines[group+frame])*k;if(kind==='feed'&&m.foodKind==='favorite'){var wi=(outfit(G)==='suit'?4:0)+frame,wa=PixelArt.r6Rects.wet[wi];PixelArt.r6Part(c,'wet',wi,323,316,wa[2]*.65);}else PixelArt.scene(c,'r5Care',group+frame,6,4,x,y,256*k,256*k);if(!m.down&&!m.complete&&!(m.progress>0)&&!(m.moved>0))arrow(c,kind==='pet'?358:start.x,kind==='pet'?225:start.y-17);}
  function winter(c,G){var shot=G.winterShot||G.montageKind||'study',night=G.montageNight!==undefined?G.montageNight:((G.winterMonth||0)%2===1);if(shot==='home'||shot==='care'){care(c,Object.assign({},G,{dressed:false,s:Object.assign({},G.s,{dressed:false})}),'pet',{down:true,moved:75+(G.now||0)*12,origin:layout.mini.feed.start});return;}if(shot==='parttime'){PixelArt.scene(c,'r5Winter',2+(night?1:0),2,2,0,0,640,360);return;}var g=Object.assign({},G,{timeFlow:null,timeVisualMinute:night?1320:600,doorOpen:false});atlas(c,g,'bedroom');windowMotion(c,g,'bedroom');bedroomRack(c,g);art(c,'chair',351,288,1.1);npc(c,345,284,'hoodie',-1,'study');art(c,'notebook',314,200,.8);roomLight(c,g);}

  function atlas(c,G,scene){if(scene==='bedroom'||scene==='living'){if(PixelArt.scene(c,'r5Home',(scene==='living'?2:0)+(G.doorOpen?1:0),2,2,0,0,640,360))return true;}if(scene==='shop'&&PixelArt.scene(c,'r5Shop',0,1,1,0,0,640,360))return true;var fresh=G.images&&G.images.r4Scenes,cell={bedroom:[0,0,836,471],living:[836,0,836,471],shop:[0,471,836,470],office:[836,471,836,470]}[scene];
    if(fresh&&fresh.complete!==false&&(fresh.naturalWidth||fresh.width)&&cell){sceneSlice(c,fresh,cell,0,0,640,360);return true;}
    var outdoors=G.images&&G.images.r4Outdoors,outCell={street:G.springStreet||G.s&&G.s.flags&&G.s.flags.employed&&!G.intro?[836,471,836,470]:[0,0,836,471],station:[836,0,836,471],train:[0,471,836,470]}[scene];
    if(outdoors&&outdoors.complete!==false&&(outdoors.naturalWidth||outdoors.width)&&outCell){sceneSlice(c,outdoors,outCell,0,0,640,360);return true;}
    var room=scene==='bedroom'||scene==='living';if(room){PixelArt.fallback(c,scene,G.now||0);return false;}
    var image=G.images&&G.images.places,idx=({street:0,station:1,office:2})[scene],count=3;
    if(image&&image.complete!==false&&(image.naturalWidth||image.width)&&idx!==undefined){var iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;c.drawImage(image,0,Math.round(ih*idx/count),iw,Math.round(ih/count),0,0,640,360);return true;}
    PixelArt.fallback(c,scene,G.now||0);return false;
  }
  function windowMotion(c,G,scene){var bedroom=scene==='bedroom',m=minute(G),closed=typeof G.curtainClosed==='boolean'?G.curtainClosed:!!(G.s&&G.s.curtainClosed),storm=!!(G.s&&G.s.day===3&&G.s.phase==='evening'),index=bedroom?(closed?3:m>=1140||m<360?2:m>=1020?1:0):(closed?7:m>=1140||m<360||storm?6:m>=1020?5:4),x=bedroom?135:451,y=bedroom?176:160,width=bedroom?204:130;PixelArt.part(c,'windows',index,x,y,width);if(storm&&!closed)PixelArt.rain(c,bedroom?{x:76,y:58,w:120,h:102}:{x:421,y:65,w:60,h:74},G.now||0,.8);}
  function coat(c,x,y,scale,fur){art(c,'suit',x,y,scale);if(fur)dots(c,x-11*scale,y-24*scale,Math.min(12,fur),C.fur);}
  function cozyBox(c,x,y,w){art(c,'cozyBox',x,y,w/51);}
  function deskBox(c,x,y,w){art(c,'crate',x,y,w/39);}

  function jumpCat(c,G){var p=G.cat,j=G.jump,t=G.now||0;if(!p)return;
    if(j){var q=Math.max(0,Math.min(1,(t-j.start)/(j.duration||.55))),flight=Math.max(0,(q-.12)/.88),frame=q<.06?0:q<.12?1:flight<.2?2:flight<.42?3:flight<.62?4:flight<.87?5:6;
      var x=j.x0+(j.x1-j.x0)*flight,base=j.y0+(j.y1-j.y0)*flight,y=base-Math.sin(flight*Math.PI)*28;
      oval(c,x,base,17-5*Math.sin(flight*Math.PI),2,'#34536525');
      cat(c,Object.assign({},p,{x:x,y:y,pose:'jump'+frame}));
    }else cat(c,p);
  }
  function bedroom(c,G){if(bedView(G)){bedtime(c,G);return;}var s=G.s||{};atlas(c,G,'bedroom');windowMotion(c,G,'bedroom');bedroomRack(c,G);if(!s.hasBag)art(c,'briefcase',510,320,1.1);if(s.roller&&s.roller.owned)art(c,'roller',458,288,.9);if(s.flags&&s.flags.toyAtDoor)art(c,'toy',542,321,.9);roomLight(c,G);if(G.doorOpen&&G.cat)cat(c,G.cat);hero(c,G,outfit(G));if(s.fur>0)dots(c,G.hero.x-13,G.hero.y-60,Math.min(7,s.fur),C.fur);}
  function lowPaws(c,G){r(c,0,0,640,35,'#203f4b22');r(c,0,0,18,360,'#1e3b4518');r(c,622,0,18,360,'#1e3b4518');}
  function camera(G){if(!G.catControl)return {scale:1,x:0,y:0};var p=Math.min(1,Math.max(0,(G.now-G.cameraAt)/1.2)),scale=1+.18*p;return {scale:scale,x:Math.round(Math.max(640-640*scale,Math.min(0,320-G.cat.x*scale))),y:Math.round(360-360*scale)};}
  function catNeed(c,G){var need=G.catNeed,cat=G.cat;if(!need||!cat||G.intro||G.catControl||G.nightScene||G.mini||G.dialog||G.ack||G.menu)return;var bowlX=need==='food'?550:490,near=need==='play'?Math.abs(cat.x-360)<60||Math.abs(cat.x-G.hero.x)<65:Math.abs(cat.x-bowlX)<38;
    var phase=((G.now||0)+.9)%5.4;if(!near||phase>1.8)return;var x=Math.max(29,Math.min(611,cat.x)),y=cat.y-62;
    box(c,x-20,y-12,40,29,'#f0edf0','#7b8291');r(c,x-4,y+17,6,4,'#7b8291');r(c,x-3,y+15,4,4,'#f0edf0');
    if(need==='play')art(c,'toy',x,y+10,1.1);else{art(c,'bowlEmpty',x,y+11,.9);if(need==='water'){r(c,x-2,y-8,4,4,'#78afc4');r(c,x-3,y-5,6,4,'#78afc4');r(c,x-1,y-6,1,3,'#d1ece7');}}
    if(need!=='play'&&phase<1.1){var tap=(Math.sin(phase*12)+1)/2,px=cat.x+(bowlX-cat.x)*(.48+tap*.2);r(c,px-3,cat.y-5-tap*3,8,3,'#ebd9b7');r(c,px-2,cat.y-2-tap*3,6,2,'#c8b599');}
  }
  function floorDirt(c,s){var f=s.floor||{},fur=Math.min(12,f.fur||0),dust=Math.min(12,f.dust||0);for(var i=0;i<fur*2;i++){var x=234+(i*83)%330,y=286+(i*17)%59;line(c,x-3,y+1,x+2,y-1,'#e4d5bc',1);line(c,x,y-2,x+2,y+2,'#e4d5bc',1);}for(var j=0;j<dust;j++){var dx=245+(j*61)%300,dy=294+(j*23)%48;oval(c,dx,dy,6,2,'#817a7160');}}
  function livingObjects(c,G){
    var s=G.s||{},e=s.equipment||{},supply=s.supplies||{},bins=s.bins||{},careState=G.nightScene&&s.nightIssue?s.nightIssue:null,fed=careState&&careState.needs?careState.needs.fed:s.needs&&s.needs.fed,water=careState?careState.water:s.water;
    art(c,'shoes',71,289,.83);floorDirt(c,s);
    if(e.autoLitter)art(c,s.litterDirty>0||bins.litter>=8?'autoLitterFull':'autoLitter',180,331,1);
    else{art(c,'litterTray',180,325,.92);art(c,'scoop',216,315,.75);for(var ld=0;ld<Math.min(7,s.litterDirty||0);ld++)oval(c,164+(ld*13)%30,309+(ld*5)%7,2,1,'#997553');}
    art(c,'foodBag',610,319,.72);
    if(e.feeder)art(c,supply.feeder>0?'feeder':'feederEmpty',550,331,1.12);
    else art(c,fed?(s.lastFoodKind==='favorite'?'bowlWet':'bowlFull'):'bowlEmpty',550,329,.8);
    if(e.fountain)art(c,supply.fountain>0?'fountain':'fountainEmpty',490,331,1.08);
    else art(c,water?(s.waterLevel===1?'waterLow':'water'):'waterEmpty',490,329,.8);
    if(e.robot)art(c,'robot',130,294,.9);
    art(c,'broom',245,296,.67);art(c,'mop',279,296,.67);
    if(!G.carried&&!(s.flags&&s.flags.toyAtDoor)){
      var broken=s.toy&&(e.premiumToy?s.toy.premium:s.toy.basic)<=0;
      art(c,e.premiumToy?(broken?'premiumToyBroken':'premiumToy'):'toy',360,329,e.premiumToy?.87:.9);
      if(broken&&!e.premiumToy){line(c,349,316,370,329,'#a05951',2);line(c,370,316,349,329,'#a05951',2);}
    }
    if(s.flags&&s.flags.toyAtDoor)art(c,'toy',584,326,.9);
    if(s.hoodie)art(c,'hoodieFolded',520,317,.9);else if(s.flags&&s.flags.hoodieEvent)art(c,'hoodieFolded',496,278,.9);
    if(s.done&&s.done.dishes===false)art(c,'plateDirty',286,184,.7);
  }
  function sofaFront(c,G){c.save();c.beginPath();c.rect(374,188,148,91);c.clip();atlas(c,G,'living');roomLight(c,G);c.restore();}
  function living(c,G){var s=G.s||{};atlas(c,G,'living');windowMotion(c,G,'living');livingObjects(c,G);roomLight(c,G);if(G.cleaningBackdrop)return;if(G.catControl){cat(c,G.cat);if(G.carried)art(c,'toy',G.cat.x+(G.cat.dir<0?-20:20),G.cat.y-8,.8);lowPaws(c,G);return;}if(G.intro==='montage'){winter(c,G);return;}var hiding=G.cat&&G.cat.pose==='fear'&&G.cat.x>=480&&G.cat.x<540;if(hiding){cat(c,G.cat);sofaFront(c,G);}if(G.restAt!=null)npc(c,444,290,outfit(G),1,'sofaRest');else hero(c,G,outfit(G));var current=outfit(G)==='suit'?'suit':'hoodie',fur=s.clothesFur?s.clothesFur[current]:s.fur;if(fur>0)dots(c,(G.restAt!=null?444:G.hero.x)-12,(G.restAt!=null?290:G.hero.y)-65,Math.min(8,fur),C.fur);if(!hiding)cat(c,G.cat);catNeed(c,G);}
  function montage(c,G){winter(c,G);}
  function street(c,G){atlas(c,G,'street');var t=G.now||0,spring=G.springStreet||G.s&&G.s.flags&&G.s.flags.employed&&!G.intro,hasUmbrella=G.intro==='meet'||G.intro==='sheltered'||G.mini&&G.mini.type==='umbrella',p=G.mini&&G.mini.type==='umbrella'?(G.mini.anchor||G.mini.p):null,grip=p||{x:G.hero.x+26,y:G.hero.y-72},tilt=G.mini&&G.mini.type==='umbrella'?(G.mini.tilt||0):G.intro==='sheltered'?.85:0,angle=tilt*.28,cx=grip.x+Math.sin(angle)*75,left=cx-43,right=cx+43,roof=grip.y-Math.cos(angle)*75;if(!spring){if(hasUmbrella){PixelArt.rain(c,{x:0,y:0,w:Math.max(0,left),h:360},t,.9);PixelArt.rain(c,{x:right,y:0,w:Math.max(0,640-right),h:360},t,.9);PixelArt.rain(c,{x:left,y:0,w:86,h:Math.max(0,roof)},t,.8);}else PixelArt.rain(c,{x:0,y:0,w:640,h:360},t,.8);}cat(c,G.cat);hero(c,G,outfit(G),hasUmbrella?'umbrella':undefined);if(hasUmbrella){c.save();c.translate(grip.x,grip.y);c.rotate(angle);art(c,'umbrella',0,7,2);c.restore();}}
  function station(c,G){atlas(c,G,'station');var t=G.now||0;var tx=G.trainX===undefined?15:G.trainX,open=tx<=15?Math.min(1,Math.max(0,(t-(G.stationAt||0)-4.16)*1.5)):0;
    // Match the train to the platform edge; doors meet the boarding area.
    c.save();c.translate(tx,154);c.scale(1.25,1.35);PixelArt.train(c,0,0,open,t);c.restore();
    r(c,0,284,640,6,'#e6bf72');for(var i=0;i<64;i++)r(c,i*10,286,4,2,'#fff1c8');
    npc(c,160,312,'commuterB',1);npc(c,535,316,'commuterC',-1);hero(c,G,'suit');
    if(open>.6){r(c,tx+279,282,56,2,'#dce8e0');r(c,tx+282,285,50,2,'#95b5af');}
  }
  function trainInterior(c,G){var t=G.now||0,elapsed=t-(G.rideAt||0),moving=elapsed<3.5;
    if(G.images&&G.images.r4Outdoors){atlas(c,G,'train');
      [24,159,296,433].forEach(function(x){c.save();c.beginPath();c.rect(x,128,117,81);c.clip();r(c,x,128,117,81,'#add2e4');for(var j=0;j<6;j++){var bx=x+((j*49-(moving?t*145:0))%285+285)%285-55;r(c,bx,146+(j%3)*11,34,76,'#829db6');r(c,bx+5,164,7,10,'#e6ead6');r(c,bx+20,164,7,10,'#d8e7de');}r(c,x+8,133,99,2,'#d8eef0');c.restore();});
      npc(c,72,305,'commuterB',1,'transit0');npc(c,207,305,'commuterA',1,'transit1');npc(c,408,305,'commuterC',1,'transit2');npc(c,502,305,'commuterB',1,'transit3');hero(c,G,'suit');return;
    }
    r(c,0,0,640,360,'#d7e2df');r(c,0,25,640,8,'#a1b6bb');floor(c,275,'#aabebd');
    for(var i=0;i<4;i++){var x=20+i*153;box(c,x,62,125,119,C.line,C.ink);r(c,x+4,66,117,111,'#62859a');
      c.save();c.beginPath();c.rect(x+4,66,117,111);c.clip();for(var j=0;j<5;j++){var bx=x+((j*49-(moving?t*145:0))%245+245)%245-60;r(c,bx,95+(j%2)*20,34,83,'#91a8ae');r(c,bx+5,115,8,12,'#d4ded5');r(c,bx+19,116,8,12,'#c5d9dc');}c.restore();r(c,x+7,70,112,2,'#c3dbdc');}
    r(c,0,187,640,7,C.line);r(c,0,220,640,49,'#709caa');r(c,0,221,640,4,'#a9c8c9');for(var n=0;n<8;n++)r(c,n*88,223,2,44,'#507d90');r(c,0,268,640,8,'#577c8b');
    for(var k=0;k<6;k++){var xx=35+k*107;r(c,xx,31,2,34,C.line);box(c,xx-6,61,15,19,'#dbdadf',C.line);r(c,xx-3,64,9,10,'#9eb6b8');}
    r(c,260,29,4,265,C.line);r(c,262,30,1,263,C.paper);box(c,526,53,104,228,'#c8d8d3',C.ink);r(c,577,55,2,224,C.line);
    for(var d=0;d<2;d++){box(c,537+d*47,75,36,105,'#577f94',C.line);r(c,542+d*47,82,25,2,'#a6c7ce');r(c,568+d*21,191,2,18,C.line);}
    npc(c,43,269,'commuterB',1,'sit');npc(c,214,268,'commuterA',1,'sit');npc(c,336,269,'commuterC',-1,'sit');npc(c,421,267,'commuterB',1,'sit');npc(c,487,268,'commuterA',-1,'sit');hero(c,G,'suit');
    if(!moving){r(c,528,280,100,3,C.paper);r(c,587,203,2,14,C.mint);}
  }
  function consultation(c,G){var con=G.consultation||{},t=G.now||0,id=String(con.id||con.name||''),variant=con.customerVariant||con.variant||(/2|elder|family/.test(id)?'customerB':/3|young/.test(id)?'customerC':'customerA');
    if(!/^customer[ABC]$/.test(variant))variant='customerA';
    if(!(G.images&&G.images.r4Seated)){art(c,'chair',252,322,2);art(c,'chair',452,322,2);}
    person(c,{x:252,y:322,dir:1,walk:t*.5},'suit','sit');
    person(c,{x:452,y:322,dir:-1,walk:t},variant,'sit');
    box(c,275,281,153,13,'#ac9381','#655c59');r(c,279,282,145,4,'#ceb9a8');
    r(c,284,294,6,32,'#796b60');r(c,414,294,6,32,'#796b60');r(c,291,294,123,6,'#988576');
    art(c,'folder',341,280,.92);art(c,'document',381,278,.7);art(c,'waterBottle',408,277,.7);
    if(con.stage>0){r(c,365,248,11,2,'#759d88');r(c,365,253,16,2,'#a2bca0');}
    if(con.complete){art(c,'document',398,262,.7);}
  }
  function office(c,G){atlas(c,G,'office');var state=G.s||{},t=G.now||0;
    if(G.consultation){consultation(c,G);return;}
    npc(c,445,305,'lead',-1);npc(c,180,310,'peer',1);
    if(G.workMontage){var shift=G.workMontage,elapsed=t-(shift.start||0),progress=Math.max(0,Math.min(1,elapsed/(shift.duration||4)));
      if(!(G.images&&G.images.r4Seated))art(c,'chair',303,322,1.8);person(c,{x:303,y:322,dir:1,walk:t},'suit','sit');
      box(c,280,281,141,12,'#ac9381','#655c59');r(c,284,282,133,3,'#ceb9a8');r(c,286,293,5,33,'#796b60');r(c,409,293,5,33,'#796b60');
      art(c,'laptop',368,280,.95);art(c,'document',400,280,.65);
      art(c,'handRest',337,271+Math.round(Math.sin(elapsed*10)),.8);
      oval(c,460,62,21,21,'#c77e67');oval(c,460,62,18,18,'#fff4df');for(var i=0;i<4;i++){var ca=i*Math.PI/2;line(c,460+Math.sin(ca)*14,62-Math.cos(ca)*14,460+Math.sin(ca)*16,62-Math.cos(ca)*16,C.line,1);}
      var hour=(9+progress*9)*Math.PI/6,minute=progress*Math.PI*18;line(c,460,62,460+Math.sin(hour)*9,62-Math.cos(hour)*9,C.ink,2);line(c,460,62,460+Math.sin(minute)*13,62-Math.cos(minute)*13,C.line,1);
    }else{art(c,'chair',330,307,1.5);box(c,282,240,109,10,'#e4c496','#705d4e');r(c,287,250,5,49,'#8d7154');r(c,380,250,5,49,'#8d7154');art(c,'folder',319,239,.8);hero(c,G,'suit');}
    if(state.fur>0&&!G.workMontage)dots(c,G.hero.x-13,G.hero.y-60,Math.min(7,state.fur),C.fur);
    if(G.officeDone&&!G.officeFeedback)art(c,'document',G.hero.x+(G.hero.dir<0?-33:33),G.hero.y-8,.95);
    if(G.officeDone&&G.officeFeedback&&typeof G.handoffAt==='number'){var pass=Math.min(1,Math.max(0,t-G.handoffAt)),ease=pass*pass*(3-2*pass),startX=G.hero.x+(G.hero.dir<0?-33:33),startY=G.hero.y-8;
      c.save();c.translate(Math.round(startX+(422-startX)*ease),Math.round(startY+(293-startY)*ease-Math.sin(pass*Math.PI)*9));c.rotate(Math.sin(pass*Math.PI)*.13);art(c,'document',0,0,.95);c.restore();}
  }
  function shop(c,G){atlas(c,G,'shop');var intro=G.shopMode==='intro';art(c,'foodBag',238,185,1);art(c,'wetFood',334,185,1);art(c,intro?'darkProduct':'bowlEmpty',432,185,1);if(!(G.s&&G.s.roller&&G.s.roller.owned))art(c,'roller',526,185,.9);art(c,'foodBag',238,235,.72);['autoLitter','feeder','fountain','robot','premiumToy'].forEach(function(kind,i){art(c,kind,304+i*48,235,.6);});hero(c,G,outfit(G),G.hero.walk?'walk':'back');if(G.shopMode==='final')cat(c,{x:390,y:326,dir:-1,walk:0,pose:'sit'});}
  function miniFeed(c,G,m){care(c,G,m.type,m);}
  function miniPlay(c,G,m){careBackdrop(c,G);var p=m.pointer||{x:320,y:220},t=G.now||0,e=G.s&&G.s.equipment||{},premium=e.premiumToy&&G.s.toy&&G.s.toy.premium>0;art(c,premium?'premiumToy':'toy',p.x,p.y+7,premium?1.2:1.1);var hop=Math.max(0,285-m.catY),phase=(t*6)%Math.PI,pose=m.complete?'play':hop>2?(phase<Math.PI/2?'jump3':'jump5'):hop>0?'land':m.catWalk?'walk':'play';sprite(c,m.catX,m.catY,1.8,function(){PixelArt.cat(c,0,0,m.catDir||1,m.catWalk||t,pose);});}
  function wrap(c,value,x,y,width,size,lineHeight,maxLines,align){var rows=[],row='',used=0;String(value||'').split('').forEach(function(ch){var charWidth=/[\u0000-\u007f]/.test(ch)?size*.56:size;if(ch==='\n'||used+charWidth>width){rows.push(row);row=ch==='\n'?'':ch;used=ch==='\n'?0:charWidth;}else{row+=ch;used+=charWidth;}});if(row)rows.push(row);rows.slice(0,maxLines||4).forEach(function(s,i){text(c,s,x,y+i*lineHeight,size,C.ink,align||'left');});}
  function workSlot(c,a,kind,index,trash,now){var w=a.w||128,h=a.h||66,wrong=typeof a.wrong==='number'?a.wrong>now:!!a.wrong,edge=wrong?'#ad6155':C.line;
    if(kind==='timeline'){box(c,a.x,a.y,w,h,C.paper,edge);r(c,a.x+2,a.y+2,w-4,8,'#7daba4');r(c,a.x+16,a.y-5,4,13,C.line);r(c,a.x+w-20,a.y-5,4,13,C.line);r(c,a.x+3,a.y+11,w-6,2,'#bfd3c6');}
    else if(trash){box(c,a.x+4,a.y+2,w-8,h-2,'#b6c6c0',edge);r(c,a.x,a.y-3,w,7,edge);r(c,a.x+w/2-13,a.y-9,26,6,edge);for(var i=0;i<4;i++)r(c,a.x+17+i*(w-30)/4,a.y+13,3,h-20,'#91a89f');r(c,a.x+11,a.y+13,w-22,32,'#ede9ee');}
    else if(kind==='fix'){box(c,a.x,a.y,w,h,C.paper,edge);r(c,a.x+12,a.y+4,1,h-9,'#c49886');for(var j=0;j<3;j++)r(c,a.x+15,a.y+18+j*16,w-20,1,'#cecad2');}
    else if(kind==='select'){box(c,a.x,a.y,w,h,'#c6c3c8',edge);r(c,a.x+4,a.y+4,w-8,h-8,C.paper);box(c,a.x+w/2-14,a.y-6,28,11,'#adc2b7',edge);}
    else{r(c,a.x+5,a.y-7,Math.min(w*.46,55),10,edge);r(c,a.x+7,a.y-5,Math.min(w*.46,55)-4,8,index%2?'#adcabc':'#a7c5d0');box(c,a.x,a.y,w,h,index%2?'#b2cbbd':'#abc5cd',edge);r(c,a.x+5,a.y+8,w-10,h-16,'#ebe9e8');}
    if(wrong)r(c,a.x+9,a.y+h-8,w-18,3,'#bd8f7f');
    if(!a.cardId){wrap(c,a.label,a.x+w/2,a.y+23,w-19,15,18,2,'center');if(a.hint)wrap(c,a.hint,a.x+w/2,a.y+51,w-19,11,13,1,'center');}
  }
  function miniCalculate(c,G,m){panel(c,G);box(c,84,40,472,278,C.paper,'#a7a9b4');r(c,90,46,460,4,'#e1dee5');art(c,'chart',111,72,.66);text(c,'처리 목록',139,60,17,C.ink);
    var available=m.referenceReady!==false,rows=m.task.rows||[],tx=105,ty=78,tw=430,rh=24;
    box(c,tx,ty,tw,146,'#efedec',C.line);r(c,tx+2,ty+2,tw-4,23,'#d0cdd5');text(c,'항목',121,ty+13,15,C.ink);text(c,'완료',395,ty+13,15,C.ink,'center');text(c,'대기',482,ty+13,15,C.ink,'center');
    for(var i=0;i<5;i++){var row=rows[i]||{},yy=ty+25+i*rh;r(c,tx+2,yy,tw-4,rh-1,i%2?'#ebe9e8':'#fafbf2');if(available){text(c,row.label||'',121,yy+11,15,C.ink);text(c,row.completed===undefined?'—':String(row.completed),395,yy+11,18,C.ink,'center');text(c,row.pending===undefined?'—':String(row.pending),482,yy+11,18,C.ink,'center');}else{r(c,121,yy+10,100+i%2*35,2,'#c5d2c4');text(c,'—',395,yy+11,18,C.line,'center');text(c,'—',482,yy+11,18,C.line,'center');}}
    r(c,353,ty+1,1,144,C.line);r(c,439,ty+1,1,144,C.line);
    var summary=(m.task.sources||[]).find(function(source){return source.id==='summary';}),old=summary&&summary.text||'',oldNumbers=['완료','대기','전체'].map(function(key){var match=old.match(new RegExp(key+'\\s*(\\d+)'));return match?key+' '+match[1]:'';}).filter(Boolean);
    if(available&&oldNumbers.length)text(c,'기존 요약  '+oldNumbers.join(' / '),106,237,13,C.line);else if(!available)text(c,'원본을 열면 처리 목록이 보인다',320,237,14,C.line,'center');
    (m.slots||[]).slice(0,3).forEach(function(slot,i){var x=104+i*147,value=slot.inputValue===undefined||slot.inputValue===''?'—':String(slot.inputValue),wrong=typeof slot.wrong==='number'?slot.wrong>G.now:!!slot.wrong;box(c,x,250,138,54,'#e6e4e5',wrong?'#ad6155':C.line);text(c,slot.label||['완료 합계','대기 합계','전체 건수'][i],x+69,263,14,C.ink,'center');text(c,value,x+69,288,22,wrong?'#9c5549':C.navy,'center');});
  }
  function miniDocs(c,G,m){if(m.task&&m.task.kind==='calculate'){miniCalculate(c,G,m);return;}panel(c,G);r(c,63,49,514,250,'#cad8d3');
    var rawKind=m.task&&m.task.kind||'sort',kind=({setup:'select',calculate:'fix',assign:'sort',selectFiles:'select',assemble:'sort',handIn:'select'})[rawKind]||rawKind;
    art(c,kind==='timeline'?'calendar':kind==='fix'?'chart':'folder',87,82,.78);if(kind==='fix'){r(c,108,65,40,3,rawKind==='calculate'?'#759d94':'#b98470');r(c,108,71,25,2,rawKind==='calculate'?'#759d94':'#b98470');}else if(kind==='select'){for(var ci=0;ci<3;ci++){box(c,118+ci*13,62,8,8,C.paper,C.line);}}else if(kind==='discard'){r(c,118,64,24,3,C.line);r(c,123,68,14,10,'#9cb6a7');}
    if(m.deskCat||G.s.flags&&G.s.flags.deskSeat){box(c,528,185,53,43,'#979ca6',C.line);r(c,523,223,64,9,'#7b8495');r(c,528,232,4,60,C.line);r(c,578,232,4,60,C.line);}
    var slots=m.slots&&m.slots.length?m.slots:[{x:95,y:232,w:128,h:66,label:'1'},{x:250,y:232,w:128,h:66,label:'2'},{x:405,y:232,w:128,h:66,label:'3'}];
    if(kind==='timeline'&&slots.length>1){var first=slots[0],last=slots[slots.length-1],sy=first.y-18;line(c,first.x+first.w/2,sy,last.x+last.w/2,sy,'#759e93',2);slots.forEach(function(a){oval(c,a.x+a.w/2,sy,4,4,'#759e93');});}
    slots.forEach(function(a,i){var trash=kind==='discard'&&(/discard|trash|remove|bin/.test(a.id||'')||i===slots.length-1);workSlot(c,a,kind,i,trash,G.now);});
    (m.cards||[]).forEach(function(a){var value=a.text||a.word||'',aw=a.w||100,ah=a.h||90,wrong=typeof a.wrong==='number'?a.wrong>G.now:!!a.wrong,icon=a.icon||a.image||'sheet';if(!['folder','sheet','document','calendar','chart'].includes(icon))icon=kind==='timeline'?'calendar':'sheet';box(c,a.x+3,a.y+3,aw,ah,'#9cadab');box(c,a.x,a.y,aw,ah,C.paper,wrong?'#ad6155':m.complete?C.green:C.line);art(c,icon,a.x+20,a.y+25,.46);r(c,a.x+34,a.y+13,aw-44,3,wrong?'#bd8f7f':C.blue);wrap(c,value,a.x+aw/2,a.y+39,aw-14,value.length>17?14:15,17,Math.floor((ah-31)/17),'center');if(a.placed){r(c,a.x+aw-16,a.y+6,2,10,m.complete?C.green:C.navy);r(c,a.x+aw-16,a.y+6,7,2,m.complete?C.green:C.navy);r(c,a.x+aw-11,a.y+6,2,7,m.complete?C.green:C.navy);}else if(wrong){line(c,a.x+aw-16,a.y+7,a.x+aw-9,a.y+14,'#ad6155',2);line(c,a.x+aw-9,a.y+7,a.x+aw-16,a.y+14,'#ad6155',2);}});
    if(m.deskCat){var phase=m.deskPhase||'blocking',route=m.catRoute||'beside',cozy=m.cozy||{x:100,y:280},t=G.now||0;
      deskBox(c,cozy.x,cozy.y,70);
      if(phase!=='away'){var p=phase==='moving'?Math.min(1,Math.max(0,(t-(m.catMoveAt||t))/1.5)):phase==='settled'?1:0;
        var dest=route==='away'?{x:92,y:301}:{x:550,y:232};var xy=m.deskCatxy||{x:305+(dest.x-305)*p,y:180+(dest.y-180)*p-Math.sin(p*Math.PI)*10};
        sprite(c,xy.x,xy.y,2.3,function(){PixelArt.cat(c,0,0,route==='away'?-1:1,t,phase==='moving'?'walk':'sleep');});
        if(phase==='blocking'&&m.drag==='guideCat')art(c,'hand',(m.pointer||{}).x||325,(m.pointer||{}).y||180,1.4);
      }
    }else if(G.s.flags&&G.s.flags.deskSeat)deskBox(c,550,232,70);
  }
  function miniArrange(c,G,m){panel(c,G);art(c,'rackBoth',500,270,1.2);if(G.s.hoodie)art(c,'hoodieFolded',488,296,1.5);(m.items||[]).forEach(function(a){art(c,a.type,a.x,a.y+30,2.2);});}
  function miniLaundry(c,G,m){panel(c,G);r(c,57,256,526,43,'#cbc4c0');art(c,'laundryBasket',490,296,3.4);r(c,433,214,110,4,'#e8f3e5');
    m.items.forEach(function(a){art(c,'hoodie',a.x,a.y+30,2.6);for(var i=0;i<9;i++)r(c,a.x-20+(i*11)%40,a.y-32+(i*7)%42,4,2,C.fur);});
    if(m.complete){art(c,'hoodie',490,253,1.3);for(var j=0;j<3;j++){var p=((G.now||0)+j*.33)%1;oval(c,465+j*20,218-p*28,2,2,'rgba(233,245,234,'+(1-p)+')');}}
  }
  function miniRoller(c,G,m){panel(c,G);art(c,outfit(G)==='suit'?'suit':'hoodie',317,296,5.15);(m.fur||[]).forEach(function(f){if(f.on&&coatMask(f.x,f.y)){r(c,f.x-4,f.y,9,2,C.fur);r(c,f.x+2,f.y-2,2,5,'#f4d6a0');}});art(c,'roller',m.p.x,m.p.y+60,2.6);}
  function miniCurtain(c,G,m){panel(c,G);var p=Math.max(0,Math.min(1,m.progress||0)),closed=m.opening?1-p:p,night=minute(G)>=1140||minute(G)<360,base=night?6:4;PixelArt.part(c,'windows',base,320,319,300);if(G.s&&G.s.day===3&&G.s.phase==='evening'&&closed<.95)PixelArt.rain(c,{x:250,y:95,w:120,h:150},G.now||0,1);if(closed>0){c.save();c.beginPath();c.rect(170,38,150*closed,281);c.rect(470-150*closed,38,150*closed,281);c.clip();PixelArt.part(c,'windows',7,320,319,300);c.restore();}var h=m.p||{x:m.opening?320:448,y:175};art(c,'handGrip',h.x,h.y+8,1.05);if(!m.down&&!m.complete)arrow(c,h.x,h.y-18,m.opening?'right':'left');}
  function miniLitter(c,G,m){panel(c,G);var im=G.images&&G.images.r4Props,a=PixelArt.atlas.props[8];if(im){var w=300,h=w*a[3]/a[2];c.drawImage(im,a[0],a[1],a[2],a[3],170,315-h,w,h);}(m.clumps||[]).forEach(function(a){if(!a.removed){oval(c,a.x,a.y,11,7,'#96744f');oval(c,a.x-2,a.y-2,8,4,'#b28a59');}});var p=m.p||m.pointer||{x:160,y:160};art(c,'scoop',p.x,p.y+8,2.1);cat(c,{x:550,y:301,dir:-1,walk:0,pose:m.complete?'sit':'lookUp'});}
  function miniBed(c,G,m){bedtime(c,G,m);}
  function miniUmbrella(c,G,m){street(c,G);if(!m.down&&!m.complete){var p=m.anchor||m.p||{x:G.hero.x+26,y:G.hero.y-72};arrow(c,p.x+10,p.y-14,'right');}}
  function miniPet(c,G,m){care(c,G,'pet',m);}
  function miniBag(c,G,m){panel(c,G);art(c,'bagOpen',465,297,3.1);(m.items||[]).forEach(function(a){if(!a.placed)art(c,a.type||a.id,a.x,a.y+28,1.65);});if(!m.down&&!(m.items||[]).every(function(a){return a.placed;}))arrow(c,465,157);}
  function miniDishes(c,G,m){panel(c,G);(m.items||[]).forEach(function(a){art(c,(a.clean||0)>=1?'plate':'plateDirty',a.x,a.y+30,2.5);});var p=m.pointer||{x:215,y:200};art(c,'sponge',p.x,p.y+10,2);}
  function miniClean(c,G,m){var g=Object.assign({},G,{cleaningBackdrop:true});living(c,g);var hiding=G.cat&&G.cat.pose==='fear'&&G.cat.x>=480&&G.cat.x<540;if(hiding){cat(c,G.cat);sofaFront(c,G);}(m.patches||[]).forEach(function(p){if(p.clean)return;if(m.type==='sweep'){for(var i=0;i<4;i++)line(c,p.x-8+i*4,p.y-3+(i%2)*3,p.x-4+i*4,p.y+2+(i%2)*2,'#e5d3b5',1);}else oval(c,p.x,p.y,13,4,'#746b6055');});var p=m.p||{x:350,y:314},x=Math.max(90,Math.min(550,p.x-25)),y=Math.max(286,Math.min(338,p.y+4));npc(c,x,y,outfit(G),1,m.type,(m.down?G.now:0)||0);if(m.type==='mop'&&m.down)line(c,p.x-10,p.y+3,p.x+12,p.y+3,'#bdcfdb66',2);if(!m.down&&!m.complete)arrow(c,p.x,p.y-15);if(!hiding)cat(c,G.cat);}
  function mini(c,G){var m=G.mini;if(!m)return;switch(m.type){case'feed':case'water':miniFeed(c,G,m);break;case'litter':miniLitter(c,G,m);break;case'play':miniPlay(c,G,m);break;case'prepare':case'work':miniDocs(c,G,m);break;case'bag':miniBag(c,G,m);break;case'dishes':miniDishes(c,G,m);break;case'arrange':miniArrange(c,G,m);break;case'laundry':miniLaundry(c,G,m);break;case'roller':miniRoller(c,G,m);break;case'curtain':miniCurtain(c,G,m);break;case'bed':miniBed(c,G,m);break;case'umbrella':miniUmbrella(c,G,m);break;case'pet':miniPet(c,G,m);break;case'sweep':case'mop':miniClean(c,G,m);break;}}
  function arrow(c,x,y,dir){c.save();c.translate(Math.round(x),Math.round(y));if(dir==='right')c.rotate(-Math.PI/2);else if(dir==='left')c.rotate(Math.PI/2);
    poly(c,[[-6,-31],[6,-31],[6,-18],[15,-18],[0,0],[-15,-18],[-6,-18]],'#332d32');
    poly(c,[[-3,-28],[3,-28],[3,-15],[9,-15],[0,-5],[-9,-15],[-3,-15]],'#ffd268');c.restore();
  }
  function focus(c,G){if(!G.guide||G.dialog||G.transition||G.mini)return;var map=hotspots(G),id=G.guideId||'',a=id==='physicalPhone'?map.phone:map[id],n=G.guide,x=a?(a.cx===undefined?a.x+a.w/2:a.cx):n.x,y=(a?(a.cy===undefined?a.y:a.cy):n.y)-3+Math.round(Math.sin((G.now||0)*4)*2);arrow(c,x,y);}
  function draw(c,G){if(PixelArt.setImages)PixelArt.setImages(G.images);if(G.images)titleImages=G.images;var memo=jumpMemory.get(G)||{};if(G.jump)memo.active=true;else if(memo.active){memo.active=false;memo.landedAt=G.now||0;}jumpMemory.set(G,memo);pixelFrame(c,function(pc){pc.save();var cam=camera(G);pc.translate(cam.x,cam.y);pc.scale(cam.scale,cam.scale);if(G.mini&&/^(feed|water|pet|bed|umbrella|play|sweep|mop)$/.test(G.mini.type)){mini(pc,G);pc.restore();return;}var scene=G.scene;if(scene==='bedroom'||scene==='bedtime')bedroom(pc,G);else if(scene==='living')living(pc,G);else if(scene==='street')street(pc,G);else if(scene==='shop')shop(pc,G);else if(scene==='station')station(pc,G);else if(scene==='train')trainInterior(pc,G);else if(scene==='office')office(pc,G);else if(scene==='winter'||scene==='montage')winter(pc,G);else PixelArt.fallback(pc,scene,G.now||0);mini(pc,G);focus(pc,G);pc.restore();});}
  function title(c,t,G){var im=G&&G.images||titleImages||(PixelArt.setImages?PixelArt.setImages():{});if(G&&G.images)titleImages=G.images;PixelArt.setImages(im);var g={images:im,s:{day:0,phase:'morning',minute:540,food:1,water:true,needs:{fed:true},flags:{},suitStored:true},now:t||0,doorOpen:true,curtainClosed:false};pixelFrame(c,function(pc){atlas(pc,g,'living');windowMotion(pc,g,'living');art(pc,'shoes',67,330,.95);art(pc,'bowlFull',550,329,.8);art(pc,'water',490,329,.8);art(pc,'toy',360,329,.9);var phase=(t||0)%12,x=phase<5?300+phase*22:phase<7?410:phase<11?410-(phase-7)*27.5:300,pose=phase<5||phase>=7&&phase<11?'walk':phase<7?'groom':'sit';cat(pc,{x:x,y:326,dir:phase<7?1:-1,walk:t||0,pose:pose});});}
  function end(c,G,key){var s=G.s,g=Object.assign({},G,{catControl:false,photo:false,shopping:false,mini:null,nearest:null,transition:null,intro:'',dressed:false,curtainClosed:true,cat:Object.assign({},G.cat,{walk:0}),hero:Object.assign({},G.hero,{walk:0,pose:'stand'})});
    g.scene='living';g.doorOpen=s.lastNight?s.lastNight.open:true;g.restAt=G.now;g.cat={x:key==='distance'?574:510,y:314,dir:-1,walk:0,pose:key==='distance'?'sit':'sleep'};
    if((key==='settled'||key==='finding')&&g.doorOpen){g.scene='bedroom';g.sleeping=true;g.catOnBed=true;g.cat={x:150,y:260,dir:-1,walk:0,pose:'sleep'};}
    else{g.sleeping=false;if(key==='worn'&&s.trust>=4)g.cat={x:478,y:261,dir:-1,walk:0,pose:'sleep'};}
    draw(c,g);if(key==='shared')art(c,'phone',388,291,1.5);if(key==='finding'&&!g.doorOpen)art(c,'document',330,267,1.3);
  }
  return {layout:layout,hotspots:hotspots,logicalSize:{width:640,height:360},pixelGrid:{width:640,height:360},draw:draw,mini:mini,title:title,camera:camera,end:end,coatMask:coatMask,rollerFur:rollerFur,rollerHead:rollerHead,rollerPeel:rollerPeel};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=LifeView;
