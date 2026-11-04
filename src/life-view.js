/* 장면과 소품을 그린다. 조작 좌표는 640 × 360 기준이다. */
var LifeView = (function () {
  'use strict';
  var titleImages=null,jumpMemory=new WeakMap();
  var C={ink:'#304650',line:'#6e858d',paper:'#f5f5ec',ivory:'#ecebef',blue:'#779fb1',navy:'#41667d',mint:'#8c9baa',green:'#7d8791',floor:'#c3b9ae',night:'#36516d',skin:'#efc5a5',fur:'#e8b775'};
  function r(c,x,y,w,h,col){if(w<=0||h<=0)return;c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function box(c,x,y,w,h,col,line){r(c,x,y,w,h,line||C.ink);r(c,x+2,y+2,w-4,h-4,col);}
  function oval(c,x,y,rx,ry,col){for(var yy=-Math.ceil(ry);yy<=Math.ceil(ry);yy++){var a=1-yy*yy/(ry*ry||1);if(a<0)continue;var xx=Math.max(1,Math.floor(rx*Math.sqrt(a)));r(c,x-xx,y+yy,xx*2+1,1,col);}}
  function line(c,x1,y1,x2,y2,col,width){var n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(var i=0;i<=n;i++)r(c,x1+(x2-x1)*i/(n||1),y1+(y2-y1)*i/(n||1),width||1,width||1,col);}
  function poly(c,points,col){var low=Math.floor(Math.min.apply(null,points.map(function(p){return p[1];}))),high=Math.ceil(Math.max.apply(null,points.map(function(p){return p[1];})));for(var y=low;y<=high;y++){var xs=[];for(var i=0;i<points.length;i++){var a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort(function(a,b){return a-b;});for(var j=0;j+1<xs.length;j+=2)r(c,xs[j],y,xs[j+1]-xs[j]+1,1,col);}}
  function text(c,s,x,y,size,col,align){c.fillStyle=col||C.ink;c.font=(size||16)+'px NeoDunggeunmoPro, DOSGothic, monospace';c.textAlign=align||'left';c.textBaseline='middle';c.fillText(s,x,y);}
  function art(c,type,x,y,s){PixelArt.item(c,type,x,y,s||1);}
  function sprite(c,x,y,s,fn){c.save();c.translate(Math.round(x),Math.round(y));c.scale(s,s);fn();c.restore();}
  function person(c,p,variant,pose){sprite(c,p.x,p.y,2.15,function(){PixelArt.person(c,0,0,variant,p.dir,p.walk,pose||(p.walk?'walk':p.pose||'stand'));});}
  function hero(c,G,variant,pose){person(c,G.hero,variant,pose);if(G.s&&G.s.hasBag&&!G.sleeping)art(c,'briefcase',G.hero.x+(G.hero.dir<0?-27:27),G.hero.y-3+(G.hero.walk?Math.sin(G.hero.walk*8)*2:0),1.1);}
  function cat(c,p){if(!p)return;sprite(c,p.x,p.y,1.6,function(){PixelArt.cat(c,0,0,p.dir,p.walk,p.pose||(p.walk?'walk':'sit'));});}
  function npc(c,x,y,variant,dir,pose){person(c,{x:x,y:y,dir:dir||1,walk:0},variant,pose||'stand');}
  function dots(c,x,y,n,col){for(var i=0;i<n;i++)r(c,x+(i*17)%31,y+(i*11)%24,3,1,col);}
  function rollerFur(i){var points=[[243,174],[390,182],[278,181],[353,176],[247,208],[386,218],[279,219],[354,222],[244,246],[392,249],[280,266],[353,270],[277,244],[358,200],[276,201],[351,249]];return{x:points[i%points.length][0],y:points[i%points.length][1],on:true};}
  function coatMask(x,y){return(x>=269&&x<=289&&y>=159&&y<=281)||(x>=347&&x<=366&&y>=158&&y<=282)||(x>=238&&x<=254&&y>=164&&y<=254)||(x>=382&&x<=397&&y>=164&&y<=255);}
  function rollerHead(m){return{x:m.p.x-31,y:m.p.y-17,w:62,h:34};}
  function rollerPeel(m){return{x:m.p.x+19,y:m.p.y-17,w:14,h:16};}
  function panel(c,G){r(c,0,0,640,360,'#30344288');box(c,51,28,538,304,C.ivory,C.ink);r(c,55,32,530,6,C.paper);r(c,55,301,530,27,'#d1d0d5');}
  function floor(c,y,col){r(c,0,y,640,360-y,col||C.floor);for(var i=0;i<8;i++)r(c,0,y+i*17,640,1,'#8e858533');}
  function sceneSlice(c,im,a,x,y,w,h){var sx=(im.naturalWidth||im.width)/1672,sy=(im.naturalHeight||im.height)/941;c.drawImage(im,a[0]*sx,a[1]*sy,a[2]*sx,a[3]*sy,x,y,w,h);}
  function atlas(c,G,scene){var fresh=G.images&&G.images.r4Scenes,cell={bedroom:[0,0,836,471],living:[836,0,836,471],shop:[0,471,836,470],office:[836,471,836,470]}[scene];
    if(fresh&&fresh.complete!==false&&(fresh.naturalWidth||fresh.width)&&cell){sceneSlice(c,fresh,cell,0,0,640,360);return true;}
    var outdoors=G.images&&G.images.r4Outdoors,outCell={street:G.springStreet||G.s&&G.s.flags&&G.s.flags.employed&&!G.intro?[836,471,836,470]:[0,0,836,471],station:[836,0,836,471],train:[0,471,836,470]}[scene];
    if(outdoors&&outdoors.complete!==false&&(outdoors.naturalWidth||outdoors.width)&&outCell){sceneSlice(c,outdoors,outCell,0,0,640,360);return true;}
    var room=scene==='bedroom'||scene==='living';if(room){PixelArt.fallback(c,scene,G.now||0);return false;}
    var image=G.images&&G.images.places,idx=({street:0,station:1,office:2})[scene],count=3;
    if(image&&image.complete!==false&&(image.naturalWidth||image.width)&&idx!==undefined){var iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;c.drawImage(image,0,Math.round(ih*idx/count),iw,Math.round(ih/count),0,0,640,360);return true;}
    PixelArt.fallback(c,scene,G.now||0);return false;
  }
  function beyondDoor(c,x,y,w,h,room){
    function q(a,b,d,e,col){r(c,x+a*w,y+b*h,d*w,e*h,col);}
    q(0,0,1,1,'#969aa1');q(.1,.07,.85,.68,'#d2d0ce');q(0,.74,1,.26,'#b5aaa0');
    q(0,0,.07,1,'#777b83');q(.95,0,.05,1,'#777b83');q(.07,.02,.88,.035,'#777b83');
    for(var i=0;i<4;i++)q(.07,.79+i*.055,.88,.006,'#968c84');
    line(c,x+w*.4,y+h*.74,x+w*.17,y+h,'#a29588');line(c,x+w*.65,y+h*.74,x+w*.9,y+h,'#a29588');
    if(room==='living'){
      q(.21,.42,.26,.19,'#b8b9bd');q(.22,.43,.24,.17,'#e6e3de');q(.33,.43,.014,.16,'#989ba2');
      q(.22,.62,.28,.18,'#b8b9bd');q(.23,.64,.26,.14,'#d7d5d1');q(.35,.64,.014,.14,'#92969c');q(.21,.605,.30,.026,C.paper);
      q(.24,.60,.08,.014,C.ink);q(.36,.60,.08,.014,C.ink);q(.41,.56,.018,.05,C.line);q(.41,.56,.06,.012,C.line);
      q(.56,.55,.35,.20,'#557f92');q(.59,.57,.29,.16,'#80a6b4');q(.54,.68,.39,.12,'#5f8b9d');q(.57,.70,.33,.075,'#8aafba');
      q(.55,.64,.04,.15,'#6b96a7');q(.89,.64,.04,.15,'#6b96a7');q(.72,.57,.012,.20,'#557f92');q(.59,.80,.03,.035,'#7c9382');q(.86,.80,.03,.035,'#7c9382');
      q(.64,.23,.035,.08,C.line);q(.59,.31,.14,.025,C.green);q(.62,.335,.08,.015,C.paper);
    }else{
      q(.53,.51,.38,.025,'#9bac99');q(.55,.535,.025,.22,'#7a9585');q(.87,.535,.025,.22,'#7a9585');q(.65,.46,.15,.045,C.navy);q(.67,.465,.11,.03,'#a9c8c7');
      q(.20,.70,.65,.19,'#8ba18d');q(.22,.68,.61,.07,C.paper);q(.28,.66,.28,.047,'#eef0df');q(.24,.75,.59,.13,'#6e96ae');
      q(.27,.765,.53,.012,'#b2cdd0');q(.44,.75,.018,.13,'#b2cdd0');q(.68,.75,.018,.13,'#b2cdd0');q(.25,.89,.03,.03,C.line);q(.77,.89,.03,.03,C.line);
      q(.31,.29,.035,.10,C.line);q(.26,.39,.14,.025,C.green);q(.29,.415,.08,.015,C.paper);
    }
  }
  function portal(c,x,y,w,h,other,amount){amount=Math.max(0,Math.min(1,amount));
    box(c,x-3,y-3,w+6,h+6,'#d4d5d9',C.line);r(c,x+3,y+3,w-6,h-6,'#535b68');beyondDoor(c,x+5,y+5,w-10,h-10,other);
    var hx=x+5,dw=Math.max(13,Math.round((w-10)*(1-amount*.87))),sag=Math.round(amount*13);
    // The hinge edge stays fixed; the free edge recedes, exposing a continuous room.
    for(var i=0;i<dw;i++){var inset=Math.round(sag*i/dw);r(c,hx+i,y+5+inset,1,h-10-inset*2,i<2||i>dw-4?C.line:i<5?'#bfc3c9':'#e7e7e5');}
    var edge=hx+dw-3;r(c,edge,y+5+sag,3,h-10-sag*2,'#7e8792');r(c,edge+1,y+7+sag,1,h-14-sag*2,'#b8c1cd');
    if(dw>28){var px=hx+9,pw=dw-19;box(c,px,y+29,pw,h*.33,'#dfe0e4','#b3b8c0');box(c,px,y+h*.56,pw,h*.29,'#dfe0e4','#b3b8c0');}
    r(c,edge-6,y+h*.56,5,4,C.line);r(c,edge-7,y+h*.56+1,7,2,'#7b9685');
    r(c,hx-1,y+39,3,11,'#717985');r(c,hx-1,y+h-57,3,11,'#717985');r(c,hx,y+41,1,7,'#c4c6cc');r(c,hx,y+h-55,1,7,'#c4c6cc');
    r(c,x+1,y+h-3,w-2,5,'#d6d2ca');r(c,x+3,y+h+2,w-6,2,'#7f818a');r(c,x+w-4,y+4,3,h-7,'#bec2c9');
  }
  function entryDoor(c){
    // 현관은 거실 왼쪽, 침실로 가는 문은 거실 오른쪽에 따로 둔다.
    box(c,20,45,110,242,'#79828f',C.ink);box(c,26,51,98,232,'#c5d2d4','#8499a2');
    box(c,36,69,78,195,'#c0ced0','#9bafb4');box(c,43,78,64,113,'#c7d3d3','#b3c2c5');
    oval(c,74,105,4,4,C.ink);oval(c,74,105,2,2,'#d9e5df');
    box(c,100,168,13,27,C.ink);r(c,103,172,7,8,'#83b7b7');r(c,102,186,15,4,'#e5e5d5');
    r(c,23,93,3,14,C.line);r(c,23,224,3,14,C.line);r(c,18,282,116,7,'#597b80');
    poly(c,[[20,291],[117,291],[137,333],[0,333]],'#a6b4b5');line(c,0,335,138,335,'#597b80',3);
    poly(c,[[27,298],[105,298],[118,319],[15,319]],'#6d8d94');
    for(var i=0;i<5;i++)line(c,28-i*2,301+i*4,104+i*2,301+i*4,'#8ca9ac',1);
    art(c,'shoes',42,333,1.5);art(c,'shoes',102,333,1.3);
  }
  function door(c,G,scene){var bedroom=scene==='bedroom';if(bedroom)portal(c,497,54,109,238,'living',G.doorOpen?1:0);else{entryDoor(c);portal(c,552,62,85,232,'bedroom',G.doorOpen?1:0);}}
  function curtain(c,x,y,w,h,t,closed,storm){var sway=closed?0:Math.round(Math.sin(t*3)*2*(storm?2:1)),cw=closed?w/2+1:22;
    if(storm)PixelArt.rain(c,{x:x+10,y:y+9,w:w-20,h:h-13},t,closed?.35:1.1);
    for(var side=0;side<2;side++){var xx=side?x+w-cw:x;
      r(c,xx+sway*(side?-1:1),y,cw,h,'#e6e3e3');for(var i=4;i<cw;i+=8)r(c,xx+i+sway*(side?-1:1),y+3,2,h-3,'#c7c4c8');r(c,xx,y+h-4,cw,3,'#b6b4bd');}
    r(c,x-3,y-4,w+6,3,C.line);
  }
  function windowMotion(c,G,scene){var bedroom=scene==='bedroom',x=bedroom?40:386,y=bedroom?38:42,w=bedroom?216:148,h=bedroom?140:114,t=G.now||0,storm=!!(G.s&&!G.intro&&G.s.day===3&&G.s.phase==='evening');
    var clock=G.s&&typeof Life!=='undefined'&&Life.clock?Life.clock(G.s):null,minute=clock&&clock.minutes!==undefined?clock.minutes:G.s&&G.s.minute!==undefined?G.s.minute:G.s&&G.s.phase==='morning'?480:1200;
    var night=G.nightScene||G.sleeping||minute>=1140||minute<360,day=!night&&minute<1020,dusk=!night&&!day;
    // 배경의 창문과 커튼을 먼저 가린 뒤 같은 자리에 창문 하나만 그린다.
    r(c,x-3,y-3,w+6,h+9,'#e1dcd8');var gx=x+19,gy=y+8,gw=w-38,gh=h-17;
    box(c,gx-4,gy-4,gw+8,gh+8,'#ece7e3','#637d89');r(c,gx,gy,gw,gh,storm?'#3d596e':day?'#b4c8d8':dusk?'#efb59b':'#466b8c');
    for(var b=0;b<5;b++){var bx=gx+b*gw/5,bh=25+(b%3)*13;r(c,bx,gy+gh-bh,gw/5-2,bh,day?'#8a9ba8':'#31536d');for(var wi=0;wi<2;wi++)r(c,bx+5+wi*9,gy+gh-bh+8,3,5,day?'#d6e7df':'#e5d6a6');}
    if(day){r(c,gx+14,gy+18,25,3,'#edf5eb');r(c,gx+21,gy+14,13,4,'#edf5eb');}
    r(c,gx+gw/2-1,gy,3,gh,'#698493');r(c,gx+2,gy+gh-4,gw-4,3,'#d4e4df');
    if(storm&&!G.curtainClosed){PixelArt.rain(c,{x:gx,y:gy,w:gw,h:gh},t,1.1);if(G.flash>0)r(c,gx,gy,gw,gh,'rgba(232,247,246,'+Math.min(.8,G.flash*3)+')');}
    curtain(c,x,y,w,h,t,!!G.curtainClosed,false);
    if(storm&&!G.curtainClosed){var p=(t%2.5)/2.5;if(p<.45){var q=p/.45;for(var i=0;i<3;i++){r(c,x+w-20+i*3+q*4,y+45-i*5,2,10+i*5,'rgba(215,236,231,'+(.7*(1-q))+')');}}}
  }
  function coat(c,x,y,scale,fur){art(c,'suit',x,y,scale);if(fur)dots(c,x-11*scale,y-24*scale,Math.min(12,fur),C.fur);}
  function cozyBox(c,x,y,w){var h=Math.round(w*.44),l=x-w/2;box(c,l,y-h,w,h,'#a6b9a4',C.line);r(c,l+5,y-h+4,w-10,h-9,'#6d8c7b');oval(c,x,y-13,w/2-8,7,'#cfdfcc');r(c,l+1,y-15,w-2,13,'#b3c4aa');r(c,l+6,y-13,w-12,2,'#dce7d3');r(c,x-12,y-15,24,6,'#8ba88e');r(c,l+2,y-h+2,3,h-4,'#d2dfc8');}
  function deskBox(c,x,y,w){var h=Math.round(w*.44),l=x-w/2;box(c,l,y-h,w,h,'#b9b69e',C.line);r(c,l+5,y-h+4,w-10,h-10,'#7b8979');r(c,l-6,y-h-3,w/2+6,5,'#d2d1b8');r(c,x+3,y-h-3,w/2+3,5,'#d2d1b8');box(c,l+10,y-18,w-20,12,'#c4dbcf','#a1bcb0');r(c,l+12,y-14,w-24,2,'#e1eee2');r(c,l+1,y-11,w-2,9,'#b9b69e');r(c,x-7,y-9,14,3,'#8e9e8b');r(c,l+3,y-h+3,2,h-6,'#e5e3ca');}
  function madeBed(c,G){var at=G.bedStraightenedAt,elapsed=typeof at==='number'?(G.now||0)-at:9;
    // 배경 속 이불을 또 덮지 않는다. 정리를 마친 순간의 작은 반짝임만 보인다.
    if(G.s&&G.s.bedMade&&elapsed<1.6){var fade=1-elapsed/1.6;for(var k=0;k<2;k++){var sx=53+k*105,sy=250-k*18;r(c,sx,sy-4,1,9,'rgba(241,253,225,'+fade+')');r(c,sx-4,sy,9,1,'rgba(241,253,225,'+fade+')');}}
  }
  function bedBase(c){
    // One bed only: frame, mattress, pillow, sleeper, then the single quilt.
    box(c,26,210,178,99,'#bd8b62','#5f5a55');r(c,31,213,168,87,'#f6eedb');
    r(c,27,204,176,13,'#be8a5b');r(c,31,207,168,4,'#efbf84');
    art(c,'pillow',111,243,1.8);r(c,31,301,168,5,'#9b7457');
    r(c,35,308,7,10,'#645d52');r(c,189,308,7,10,'#645d52');
  }
  function quilt(c,G){var made=!!(G.s&&G.s.bedMade),sleeping=!!G.sleeping,top=sleeping?254:made?244:252;
    box(c,32,top,166,301-top,'#779fc5','#4d708e');r(c,34,top+2,162,5,'#d2e5e7');
    for(var i=0;i<8;i++)r(c,39+i*22,top+7,2,293-top,'#b5d5e2');
    for(var j=0;j<3;j++)r(c,34,top+13+j*16,162,2,'#b5d5e2');
    r(c,35,295,160,4,'#527b9c');if(!made&&!sleeping){poly(c,[[32,top],[74,top-7],[94,top+9],[32,top+13]],'#bed6e2');line(c,34,top+12,92,top+8,'#4d708e',1);}
  }
  function jumpCat(c,G){var p=G.cat,j=G.jump,t=G.now||0;if(!p)return;
    if(j){var q=Math.max(0,Math.min(1,(t-j.start)/(j.duration||.55))),flight=Math.max(0,(q-.12)/.88),frame=q<.06?0:q<.12?1:flight<.2?2:flight<.42?3:flight<.62?4:flight<.87?5:6;
      var x=j.x0+(j.x1-j.x0)*flight,base=j.y0+(j.y1-j.y0)*flight,y=base-Math.sin(flight*Math.PI)*28;
      oval(c,x,base,17-5*Math.sin(flight*Math.PI),2,'#34536525');
      cat(c,Object.assign({},p,{x:x,y:y,pose:'jump'+frame}));
    }else cat(c,p);
  }
  function bedroom(c,G){var s=G.s||{},t=G.now||0;atlas(c,G,'bedroom');door(c,G,'bedroom');windowMotion(c,G,'bedroom');
    bedBase(c);
    if(!G.sleeping&&(s.phase==='morning'||s.bedMade))madeBed(c,G);
    if(!G.dressed)coat(c,445,226,1.65,s.clothesFur?s.clothesFur.suit:s.fur||0);
    if(!s.hasBag)art(c,'briefcase',510,320,1.4);art(c,'document',305,188,.85);
    if(!s.hoodie&&G.dressed)art(c,'hoodie',466,226,1.5);
    if(s.flags&&s.flags.deskSeat)deskBox(c,361,281,49);
    if(s.prep>0){r(c,285,194,11,3,C.mint);r(c,285,201,17,2,C.line);}
    if(s.roller&&s.roller.owned)art(c,'roller',458,288,1.1);
    if(s.flags&&s.flags.toyAtDoor)art(c,'toy',542,321,1.2);
    var catInBed=!!(G.sleeping&&G.catOnBed);
    if(G.sleeping)sprite(c,111,272,1.5,function(){PixelArt.person(c,0,0,'hoodie',0,t,'bedSleep');});
    quilt(c,G);
    if(catInBed){var jm=jumpMemory.get(G),age=jm&&jm.landedAt!==undefined?t-jm.landedAt:2;sprite(c,132,299,1.4,function(){PixelArt.cat(c,0,0,-1,t,age<.12?'land':'sleep');});}
    var showCat=G.doorOpen||G.jump||G.sleeping&&G.cat&&G.cat.y<300;
    if(showCat&&G.cat&&!catInBed)jumpCat(c,G);
    if(!G.sleeping)hero(c,G,G.dressed?'suit':'hoodie');
    if(G.dressed&&s.fur>0)dots(c,G.hero.x-13,G.hero.y-60,Math.min(7,s.fur),C.fur);
    if(G.sleeping){r(c,0,0,640,360,'#17374f40');var b=(Math.sin(t*1.8)+1)*.5;r(c,96,251,26,1,'rgba(213,231,233,'+(.13+b*.13)+')');}
  }
  function lowPaws(c,G){r(c,0,0,640,35,'#203f4b22');r(c,0,0,18,360,'#1e3b4518');r(c,622,0,18,360,'#1e3b4518');}
  function camera(G){if(!G.catControl)return {scale:1,x:0,y:0};var p=Math.min(1,Math.max(0,(G.now-G.cameraAt)/1.2)),scale=1+.18*p;return {scale:scale,x:Math.round(Math.max(640-640*scale,Math.min(0,320-G.cat.x*scale))),y:Math.round(360-360*scale)};}
  function catNeed(c,G){var need=G.catNeed,cat=G.cat;if(!need||!cat||G.intro||G.catControl||G.nightScene||G.mini||G.dialog||G.ack||G.menu)return;var bowlX=need==='food'?550:490,near=need==='play'?Math.abs(cat.x-360)<60||Math.abs(cat.x-G.hero.x)<65:Math.abs(cat.x-bowlX)<38;
    var phase=((G.now||0)+.9)%5.4;if(!near||phase>1.8)return;var x=Math.max(29,Math.min(611,cat.x)),y=cat.y-62;
    box(c,x-20,y-12,40,29,'#f6f9ec','#729488');r(c,x-4,y+17,6,4,'#729488');r(c,x-3,y+15,4,4,'#f6f9ec');
    if(need==='play')art(c,'toy',x,y+10,1.1);else{art(c,'bowlEmpty',x,y+11,.9);if(need==='water'){r(c,x-2,y-8,4,4,'#78afc4');r(c,x-3,y-5,6,4,'#78afc4');r(c,x-1,y-6,1,3,'#d1ece7');}}
    if(need!=='play'&&phase<1.1){var tap=(Math.sin(phase*12)+1)/2,px=cat.x+(bowlX-cat.x)*(.48+tap*.2);r(c,px-3,cat.y-5-tap*3,8,3,'#ebd9b7');r(c,px-2,cat.y-2-tap*3,6,2,'#c8b599');}
  }
  function living(c,G){var s=G.s||{},t=G.now||0,care=G.nightScene&&s.nightIssue?s.nightIssue:null,fed=care&&care.needs?care.needs.fed:s.needs&&s.needs.fed,water=care?care.water:s.water;atlas(c,G,'living');door(c,G,'living');windowMotion(c,G,'living');
    art(c,'litterTray',180,325,1.65);art(c,'scoop',224,310,1.25);
    for(var ld=0;ld<Math.min(10,s.litterDirty||0);ld++){var lx=154+(ld*19)%54,ly=299+(ld*7)%15;oval(c,lx,ly,4,2,'#9c7857');r(c,lx-2,ly-2,4,2,'#ba9466');}
    if(s.food===0){c.save();c.translate(599,317);c.scale(1.2,.45);art(c,'foodBag',0,0);c.restore();}else art(c,'foodBag',599,317,1.2);art(c,fed?'bowlFull':'bowlEmpty',568,329,1.22);
    if([6,7].includes(s.day)&&!(s.done&&s.done.laundry))art(c,'laundryBasket',285,324,1.55);
    if(water){art(c,'water',476,329,1.15);if(s.waterLevel===1)oval(c,476,320,8,2,'#d5eaf0');}else{art(c,'bowlEmpty',476,329,1.15);r(c,463,324,25,3,'#739db3');}
    if(!G.carried&&!(s.flags&&s.flags.toyAtDoor))art(c,'toy',360,329,1.35);
    if(s.flags&&s.flags.toyAtDoor)art(c,'toy',585,326,1.2);
    if(s.flags&&s.flags.cozyBox)cozyBox(c,510,323,88);
    if(s.hoodie){art(c,'hoodieFolded',520,317,1.4);dots(c,495,298,Math.min(10,s.clothesFur?s.clothesFur.hoodie:7),C.fur);}
    else if(s.flags&&s.flags.hoodieEvent)art(c,'hoodieFolded',500,276,1.5);
    if(s.done&&s.done.dishes===false){art(c,'plateDirty',286,184,.85);}
    if(G.intro==='routine'||s.flags&&s.flags.petFurToday)dots(c,G.hero.x-14,G.hero.y-60,8,C.fur);
    if(G.catControl){r(c,0,0,640,360,'#23455622');r(c,554,288,80,3,'#f1e6c790');if(G.catStage==='door'){var p=(t%2.6)/2.6;if(p<.5){for(var i=0;i<3;i++)r(c,591-i*6,263-i*4,2,6+i*4,'rgba(220,233,226,'+(.8*(1-p*2))+')');}}
      if(G.catStage==='scent'){for(var k=0;k<3;k++){var a=(t*.8+k*.33)%1;r(c,494+k*10,286-a*27,2,4,'rgba(230,237,218,'+((1-a)*.55)+')');}}
      if(G.catStage==='scent'&&G.cat.pose==='sleep'&&!s.suitStored){var j=Math.min(1,Math.max(0,(2.4-(G.lockedUntil-t))/.65));cat(c,{x:G.cat.x,y:G.cat.y+(269-G.cat.y)*j-Math.sin(j*Math.PI)*23,dir:G.cat.dir,walk:t,pose:j<1?'jump':'sleep'});}else cat(c,G.cat);
      if(G.carried)art(c,'toy',G.cat.x+(G.cat.dir<0?-25:25),G.cat.y-8,1);lowPaws(c,G);return;
    }
    if(G.intro==='montage'){montage(c,G);return;}
    if(G.restAt){npc(c,478,277,'hoodie',1,'sit');}
    else hero(c,G,G.dressed?'suit':'hoodie');
    if(G.cat){var cp=G.catNeed&&G.cat.pose==='sleep'?Object.assign({},G.cat,{pose:'sit'}):G.cat;cat(c,cp);catNeed(c,G);}
    if(G.intro==='routine'){box(c,556,137,10,17,C.paper,C.line);r(c,559,141,4,8,C.mint);}
  }
  function montage(c,G){var t=G.now||0,p=(t-(G.montageAt||0))/8,phase=Math.floor(p*4)%4; r(c,0,0,640,360,phase%2?'#dfede522':'#2e506a44');
    if(phase===0){art(c,'document',290,259,1.8);npc(c,330,310,'hoodie',1,'sit');cat(c,{x:348,y:290,dir:-1,walk:t,pose:'sleep'});}
    if(phase===1){npc(c,330,310,'hoodie',1,'sit');art(c,'phone',355,264,1.5);cat(c,{x:399,y:311,dir:-1,walk:0,pose:'sit'});}
    if(phase===2){npc(c,300,319,'hoodie',1,'kneel');art(c,'foodBag',345,286,1.3);art(c,'bowlFull',377,322,1.4);cat(c,{x:410,y:323,dir:-1,walk:0,pose:'eat'});}
    if(phase===3){npc(c,470,274,'hoodie',1,'sit');cat(c,{x:510,y:285,dir:-1,walk:t,pose:'sleep'});art(c,'phone',487,253,1);}
    var q=(p*4)%1;if(q<.15||q>.85)r(c,0,0,640,360,'rgba(41,69,85,'+(Math.abs(q-.5)*.55)+')');
  }
  function street(c,G){atlas(c,G,'street');var t=G.now||0,spring=G.springStreet||G.s&&G.s.flags&&G.s.flags.employed&&!G.intro;if(!spring)PixelArt.rain(c,{x:0,y:0,w:640,h:360},t,.85);
    // The kitten is below the awning, apart from the clear route home at the right.
    if(G.intro==='meet'){cat(c,{x:443,y:320,dir:-1,walk:t,pose:'fear'});}
    else if(G.intro==='sheltered'){cat(c,G.cat);for(var i=0;i<3;i++){oval(c,568+i*20,328-i*9,3,2,'#d8e7de99');oval(c,573+i*20,337-i*9,3,2,'#d8e7de99');}}
    hero(c,G,'hoodie',G.hero.walk?'umbrellaWalk':'umbrella');if(G.intro==='meet'||G.intro==='sheltered'){c.save();c.translate(G.hero.x+39,G.hero.y-60);c.rotate(.08);art(c,'umbrella',0,0,2.6);c.restore();}
    if(!spring)for(var j=0;j<12;j++){var px=(j*53+17)%640,py=295+(j*19)%62,a=(t*1.9+j*.27)%1;r(c,px-a*4,py,3+a*9,1,'rgba(213,236,237,'+(.35*(1-a))+')');}
  }
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
      npc(c,43,295,'commuterB',1,'sit');npc(c,214,295,'commuterA',1,'sit');npc(c,414,295,'commuterC',-1,'sit');npc(c,492,295,'commuterB',-1,'sit');hero(c,G,'suit');return;
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
  function shop(c,G){atlas(c,G,'shop');var t=G.now||0,intro=G.shopMode==='intro';
    var shelf=G.images&&G.images.r4Scenes;if(shelf&&shelf.complete!==false&&(shelf.naturalWidth||shelf.width))sceneSlice(c,shelf,[302,612,429,174],115,90,480,160);
    // Product centres match the controller's shelf targets; the feet meet shelves.
    art(c,'foodBag',166,168,1.35);art(c,'wetFood',292,168,1.35);
    art(c,intro?'crate':'bowlEmpty',418,168,intro?1.1:1.35);
    if(!(G.s&&G.s.roller&&G.s.roller.owned))art(c,'roller',544,168,1.15);
    art(c,'foodBag',166,238,.85);art(c,'litterBag',292,238,1.25);art(c,'toy',418,238,1.4);
    art(c,'waterBottle',546,238,1.05);
    // Baskets and the counter are scenery, with no permanent object labels.
    art(c,'crate',231,324,1.1);hero(c,G,'hoodie');
    if(G.shopMode==='final')cat(c,{x:Math.max(330,Math.min(433,(G.cat&&G.cat.x)||390)),y:326,dir:-1,walk:0,pose:Math.floor(t)%7===0?'groom':'sit'});
  }
  function bowl(c,x,y,type,progress){art(c,'bowlEmpty',x,y,3.6);if(type==='water'){oval(c,x,y-27,37,9,'#6f929d');if(progress>.02){oval(c,x,y-27,37*Math.min(1,progress*2),9*Math.min(1,progress*2),'#87becd');r(c,x-20,y-30,26,2,'#d5ece8');}}
    else if(type==='wet'){if(progress>.02)oval(c,x,y-27,34*Math.min(1,progress*2),8,'#9c8264');for(var k=0;k<Math.ceil(progress*12);k++)r(c,x-25+(k*13)%50,y-31+(k*5)%10,6,2,'#c0ab84');}
    else for(var i=0;i<Math.ceil(progress*30);i++)r(c,x-31+(i*17)%62,y-34+(i*7)%15,7,4,i%2?'#94805b':'#ab966a');}
  function bottle(c,x,y,tilt){c.save();c.translate(Math.round(x),Math.round(y));c.rotate(tilt||0);art(c,'waterBottle',0,0,1.65);art(c,'handGrip',-16,-21,1.2);c.restore();}
  function miniFeed(c,G,m){panel(c,G);var water=m.type==='water',p=m.p,t=G.now||0;
    r(c,67,273,506,26,'#c8c5c6');bowl(c,385,272,water?'water':m.foodKind==='favorite'?'wet':'food',m.progress);
    if(water)bottle(c,p.x,p.y,m.pouring?2.7:0);else{c.save();c.translate(p.x,p.y);c.rotate(m.pouring?2.7:0);art(c,m.foodKind==='favorite'?'wetFood':'foodBag',0,0,m.foodKind==='favorite'?2.8:2.2);art(c,'handGrip',-23,-20,1.3);c.restore();}
    if(m.pouring){var height=water?73:m.foodKind==='favorite'?65:72,mouthX=p.x+Math.sin(2.7)*height,mouthY=p.y-Math.cos(2.7)*height;for(var i=0;i<12;i++){var a=(t*(water?2.7:1.6)+i*.083)%1,xx=mouthX+(water?Math.sin(i)*2:(i*7)%10-5);r(c,xx,mouthY+a*Math.max(12,244-mouthY),water?2:4,water?7:3,water?'#84bbcbd0':i%2?'#8a7957':'#a48c63');}}
    var cp=m.complete?465:508;sprite(c,cp,m.complete?285:288,2.2,function(){PixelArt.cat(c,0,0,-1,0,m.complete?'eat':'sit');});
    if(m.progress>0){for(var k=0;k<Math.ceil(m.progress*12);k++)r(c,341+k*8,289,5,3,water?C.blue:C.green);}
    if(!m.down&&!m.complete){art(c,'hand',p.x+45,p.y+15,1.5);}
  }
  function miniPlay(c,G,m){panel(c,G);r(c,57,91,526,90,'#e0dfe4');r(c,57,181,526,118,'#c4bcb5');for(var i=0;i<9;i++)r(c,59+i*65,293,40,1,'#ada6a6');
    var p=m.pointer||{x:320,y:220},t=G.now||0;art(c,'toy',p.x,p.y+7,1.35);
    var hop=Math.max(0,285-m.catY),hopPhase=(t*6)%Math.PI,jumpPose=hop>2?(hopPhase<Math.PI/2?'jump3':'jump5'):hop>0?'land':m.catWalk?'walk':'play';
    oval(c,m.catX,288,20-hop*.3,2,'#36536822');sprite(c,m.catX,m.catY,1.8,function(){PixelArt.cat(c,0,0,m.catDir||1,m.catWalk||t,m.complete?'play':jumpPose);});
    if(m.progress>0){var n=Math.min(3,Math.ceil(m.progress*3));for(var j=0;j<n;j++){oval(c,280+j*24,66,4,3,C.mint);r(c,279+j*24,59,2,2,C.mint);r(c,284+j*24,60,2,2,C.mint);}}
  }
  function wrap(c,value,x,y,width,size,lineHeight,maxLines,align){var rows=[],row='',used=0;String(value||'').split('').forEach(function(ch){var charWidth=/[\u0000-\u007f]/.test(ch)?size*.56:size;if(ch==='\n'||used+charWidth>width){rows.push(row);row=ch==='\n'?'':ch;used=ch==='\n'?0:charWidth;}else{row+=ch;used+=charWidth;}});if(row)rows.push(row);rows.slice(0,maxLines||4).forEach(function(s,i){text(c,s,x,y+i*lineHeight,size,C.ink,align||'left');});}
  function workSlot(c,a,kind,index,trash,now){var w=a.w||128,h=a.h||66,wrong=typeof a.wrong==='number'?a.wrong>now:!!a.wrong,edge=wrong?'#ad6155':C.line;
    if(kind==='timeline'){box(c,a.x,a.y,w,h,C.paper,edge);r(c,a.x+2,a.y+2,w-4,8,'#7daba4');r(c,a.x+16,a.y-5,4,13,C.line);r(c,a.x+w-20,a.y-5,4,13,C.line);r(c,a.x+3,a.y+11,w-6,2,'#bfd3c6');}
    else if(trash){box(c,a.x+4,a.y+2,w-8,h-2,'#b6c6c0',edge);r(c,a.x,a.y-3,w,7,edge);r(c,a.x+w/2-13,a.y-9,26,6,edge);for(var i=0;i<4;i++)r(c,a.x+17+i*(w-30)/4,a.y+13,3,h-20,'#91a89f');r(c,a.x+11,a.y+13,w-22,32,'#edf1e5');}
    else if(kind==='fix'){box(c,a.x,a.y,w,h,C.paper,edge);r(c,a.x+12,a.y+4,1,h-9,'#c49886');for(var j=0;j<3;j++)r(c,a.x+15,a.y+18+j*16,w-20,1,'#c9d8d0');}
    else if(kind==='select'){box(c,a.x,a.y,w,h,'#c6c3c8',edge);r(c,a.x+4,a.y+4,w-8,h-8,C.paper);box(c,a.x+w/2-14,a.y-6,28,11,'#adc2b7',edge);}
    else{r(c,a.x+5,a.y-7,Math.min(w*.46,55),10,edge);r(c,a.x+7,a.y-5,Math.min(w*.46,55)-4,8,index%2?'#adcabc':'#a7c5d0');box(c,a.x,a.y,w,h,index%2?'#b2cbbd':'#abc5cd',edge);r(c,a.x+5,a.y+8,w-10,h-16,'#ebe9e8');}
    if(wrong)r(c,a.x+9,a.y+h-8,w-18,3,'#bd8f7f');
    if(!a.cardId){wrap(c,a.label,a.x+w/2,a.y+23,w-19,15,18,2,'center');if(a.hint)wrap(c,a.hint,a.x+w/2,a.y+51,w-19,11,13,1,'center');}
  }
  function miniCalculate(c,G,m){panel(c,G);box(c,84,40,472,278,C.paper,'#a0b5a8');r(c,90,46,460,4,'#e4ecdc');art(c,'chart',111,72,.66);text(c,'처리 목록',139,60,17,C.ink);
    var available=m.referenceReady!==false,rows=m.task.rows||[],tx=105,ty=78,tw=430,rh=24;
    box(c,tx,ty,tw,146,'#efedec',C.line);r(c,tx+2,ty+2,tw-4,23,'#d0e1d2');text(c,'항목',121,ty+13,15,C.ink);text(c,'완료',395,ty+13,15,C.ink,'center');text(c,'대기',482,ty+13,15,C.ink,'center');
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
  function miniArrange(c,G,m){panel(c,G);r(c,58,259,524,40,'#cbc4c0');r(c,447,59,6,179,C.line);r(c,549,59,6,179,C.line);r(c,447,58,108,6,C.line);r(c,439,237,25,5,C.line);r(c,541,237,23,5,C.line);
    box(c,420,274,148,27,'#c6c2c5',C.line);for(var i=0;i<12;i++)r(c,426+i*12,279,3,16,C.paper);r(c,414,272,160,3,C.paper);
    if(G.s.suitStored)coat(c,501,180,2,0);if(G.s.hoodie){c.save();c.translate(488,296);c.scale(2.2,.9);art(c,'hoodie',0,0);c.restore();}
    if(G.s.flags&&G.s.flags.cozyBox)cozyBox(c,488,296,115);
    m.items.forEach(function(a){if(a.type==='box')cozyBox(c,a.x,a.y+30,78);else art(c,a.type,a.x,a.y+30,2.2);});
    if(m.drag&&typeof m.drag==='object'){var suit=m.drag.type==='suit';r(c,suit?456:426,suit?75:278,suit?88:133,2,'#f6ffef');}
  }
  function miniLaundry(c,G,m){panel(c,G);r(c,57,256,526,43,'#cbc4c0');art(c,'laundryBasket',490,296,3.4);r(c,433,214,110,4,'#e8f3e5');
    m.items.forEach(function(a){art(c,'hoodie',a.x,a.y+30,2.6);for(var i=0;i<9;i++)r(c,a.x-20+(i*11)%40,a.y-32+(i*7)%42,4,2,C.fur);});
    if(m.complete){art(c,'hoodie',490,253,1.3);for(var j=0;j<3;j++){var p=((G.now||0)+j*.33)%1;oval(c,465+j*20,218-p*28,2,2,'rgba(233,245,234,'+(1-p)+')');}}
  }
  function miniRoller(c,G,m){panel(c,G);coat(c,317,296,5.15,0);var s=G.s;
    m.fur.forEach(function(f){if(f.on&&coatMask(f.x,f.y)){r(c,f.x-4,f.y,9,2,C.fur);r(c,f.x+2,f.y-2,2,5,'#f4d6a0');}});
    art(c,'roller',m.p.x,m.p.y+60,2.6);var dirty=s.roller.dirty||0;
    for(var i=0;i<dirty;i++)r(c,m.p.x-21+(i*11)%39,m.p.y-10+(i*7)%19,5,2,'#b8a476');
    if(dirty>0){var fold=m.drag==='peel'?Math.min(54,Math.max(0,(m.pointer.y||m.peelY)-m.peelY)):0;box(c,m.p.x+19,m.p.y-16,12,11+fold,'#fbfff1',C.line);r(c,m.p.x+20,m.p.y-15,8,3,'#d2dfca');r(c,m.p.x+23,m.p.y-10+fold*.5,4,2,'#b8a476');if(fold>0)art(c,'hand',m.p.x+30,m.p.y+fold-3,1);}
  }
  function miniCurtain(c,G,m){panel(c,G);box(c,112,66,420,206,'#e1e8df',C.line);r(c,119,74,406,188,'#456a83');
    for(var i=0;i<7;i++){r(c,127+i*60,174+(i%2)*19,44,88,'#31536c');r(c,137+i*60,195,8,11,'#a8bbb3');}
    PixelArt.rain(c,{x:119,y:74,w:406,h:188},G.now,1.5);r(c,320,74,4,188,C.paper);r(c,119,166,406,4,C.paper);
    var progress=m.progress||0,w=42+progress*165;curtain(c,112,64,420,208,G.now,false,false);
    for(var side=0;side<2;side++){var x=side?532-w:112;r(c,x,64,w,208,'#dedbde');for(var j=5;j<w;j+=12)r(c,x+j,68,3,202,'#b8b4bf');r(c,x,265,w,7,'#a8a6b0');}
    art(c,'hand',400+progress*160,170,2);sprite(c,488,304,1.6,function(){PixelArt.cat(c,0,0,-1,0,progress>.8?'sit':'fear');});
  }
  function miniLitter(c,G,m){panel(c,G);r(c,57,262,526,37,'#dbc5a4');
    var im=G.images&&G.images.r4Props;
    if(im&&im.complete!==false&&(im.naturalWidth||im.width)){var tray=PixelArt.atlas.props[8];c.drawImage(im,tray[0],tray[1],tray[2],tray[3],119,91,400,208);}
    else{box(c,119,91,400,208,'#a7c1a7',C.line);box(c,137,123,364,145,'#f2dfba','#779b84');}
    (m.clumps||[]).forEach(function(a){if(a.removed)return;oval(c,a.x,a.y,13,8,'#886c50');oval(c,a.x-2,a.y-3,10,6,'#b08b5d');r(c,a.x-7,a.y-5,4,2,'#d4b37b');r(c,a.x+4,a.y+3,4,2,'#725a45');});
    art(c,'litterBag',548,287,1.3);
    var p=m.p||m.pointer||{x:160,y:160};
    art(c,'scoop',p.x,p.y+8,2.25);art(c,'handGrip',p.x,p.y-44,1.45);
    if(m.down){var removed=(m.clumps||[]).filter(function(a){return a.removed;}).length;for(var i=0;i<Math.min(3,removed);i++)oval(c,p.x-7+i*6,p.y-3+i%2*3,4,3,'#997652');}
    cat(c,{x:551,y:299,dir:-1,walk:G.now||0,pose:m.complete?'sit':'lookUp'});
  }
  function miniBed(c,G,m){var amount=Math.max(0,Math.min(1,m.door||0)),open=amount>.5;
    atlas(c,G,'bedroom');windowMotion(c,G,'bedroom');bedBase(c);quilt(c,G);
    npc(c,330,325,'hoodie',1,'stand');portal(c,497,54,109,238,'living',amount);
    if(open)cat(c,{x:574,y:325,dir:-1,walk:G.now||0,pose:'sit'});
    if(!m.down&&!m.decided&&!m.confirmed){art(c,'handGrip',540+Math.sin((G.now||0)*2)*22,205,1.3);arrow(c,550,175,'right');}
  }
  function miniUmbrella(c,G,m){atlas(c,G,'street');r(c,0,0,640,360,'#274c6633');var p=m.p,progress=m.progress||0,t=G.now||0;
    var cx=400,cy=320,hx=200+progress*90,gripX=hx+39,gripY=260,angle=progress*.34,canopyX=gripX+Math.sin(angle)*111,roof=gripY-Math.cos(angle)*143,left=canopyX-80,right=canopyX+80;
    cat(c,{x:cx,y:cy,dir:-1,walk:progress>.7?0:t,pose:progress>.7?'sit':'fear'});
    PixelArt.rain(c,{x:0,y:0,w:Math.max(0,left),h:360},t,1);PixelArt.rain(c,{x:right,y:0,w:Math.max(0,640-right),h:360},t,1);PixelArt.rain(c,{x:left,y:0,w:160,h:Math.max(0,roof+8)},t,.8);
    person(c,{x:hx,y:320,dir:1,walk:m.down&&!m.complete?t:0},'hoodie',m.down&&!m.complete?'umbrellaWalk':'umbrella');c.save();c.translate(gripX,gripY);c.rotate(angle);art(c,'umbrella',0,0,2.9);c.restore();
    if(progress>.7){oval(c,400,329,30,2,'#b4d3ca88');r(c,381,284,3,2,C.paper);r(c,392,281,2,3,C.paper);}
    if(!m.down&&!m.complete){var a=(Math.sin(t*2)+1)/2;art(c,'hand',242+a*47,205,1.1);r(c,247,213,34,2,'#e2f0e4');r(c,276,210,5,7,'#e2f0e4');}
  }
  function miniPet(c,G,m){panel(c,G);r(c,57,232,526,67,'#dcc9a9');var moved=m.moved||0,p=m.pointer||{x:330,y:240},hx=Math.max(296,Math.min(415,p.x)),hy=Math.max(225,Math.min(258,p.y));
    person(c,{x:220,y:292,dir:1,walk:G.now||0},'hoodie','kneel');
    sprite(c,380,282,3,function(){PixelArt.cat(c,0,0,-1,G.now||0,moved>35?'purr':'stand');});
    line(c,252,246,285,249,'#4e6874',12);line(c,285,249,hx-10,hy-3,'#a9a9b2',10);art(c,'hand',hx,hy+8,1.4);
    if(moved>25){var count=Math.min(10,Math.floor(moved/20));for(var i=0;i<count;i++)r(c,228+(i*11)%44,220+(i*7)%26,4,2,C.fur);}
    if(!m.down&&!m.complete&&moved<30){c.save();c.globalAlpha=.45;art(c,'hand',355+Math.sin((G.now||0)*2)*32,237,1);c.restore();}
    // The cat leans into the hand; no relationship-score hearts.
    if(moved>65){var a=((G.now||0)*.8)%1;line(c,430,226-a*5,437,223-a*5,'#bc9360',1);line(c,431,232-a*5,440,232-a*5,'#bc9360',1);}
  }
  function miniBag(c,G,m){panel(c,G);r(c,57,267,526,32,'#c0b9b5');var bx=400,by=170,bw=130,bh=130;
    box(c,bx,by,bw,bh,'#466a7f',C.ink);r(c,bx+7,by+12,bw-14,bh-21,'#608c9a');box(c,bx+32,by-19,66,26,'#9ab5b9',C.ink);r(c,bx+38,by-13,54,19,C.ivory);
    oval(c,bx+bw/2,by+16,58,12,'#233d4b');r(c,bx+13,by+76,bw-26,2,'#a9cacb');box(c,bx+47,by+71,38,14,'#80a9b2',C.line);
    var count=0;(m.items||[]).forEach(function(item){if(item.placed){count++;return;}art(c,item.type||item.id,item.x,item.y+28,1.75);});
    for(var i=0;i<3;i++){oval(c,442+i*22,278,5,5,i<count?'#dbebcb':'#355569');if(i<count){r(c,440+i*22,277,2,3,C.green);r(c,442+i*22,274,2,5,C.green);}}
    if(!m.down&&!count){var first=(m.items||[]).find(function(item){return !item.placed;});if(first){art(c,'hand',first.x+22,first.y+26,1.2);line(c,first.x+40,first.y+10,385,218,'#91aea4',1);}}
  }
  function miniDishes(c,G,m){panel(c,G);box(c,76,72,488,220,'#adc4c3',C.line);box(c,85,81,470,198,'#6e919d',C.ink);r(c,90,86,460,188,'#b9d5d7');
    r(c,478,57,10,59,C.line);r(c,443,55,45,11,C.line);r(c,442,63,9,17,C.line);r(c,446,79,2,34,'#d3ebe4');
    (m.items||[]).forEach(function(item){var clean=Math.max(0,Math.min(1,item.clean||0));oval(c,item.x,item.y,50,38,C.line);oval(c,item.x,item.y-2,47,35,'#e9e7e6');oval(c,item.x,item.y-2,37,27,'#d7d6da');
      for(var i=0;i<Math.ceil((1-clean)*9);i++)oval(c,item.x-25+(i*13)%53,item.y-17+(i*7)%35,5+(i%2)*2,2,'#a69a73');
      if(clean>=1){r(c,item.x+29,item.y-30,2,11,C.paper);r(c,item.x+25,item.y-25,10,2,C.paper);}
    });
    var p=m.pointer||{x:215,y:200};box(c,p.x-20,p.y-12,40,24,'#c8c979',C.line);r(c,p.x-17,p.y-9,34,7,'#e6e5a1');r(c,p.x-17,p.y+5,34,4,'#7eaa87');
    if(m.down)for(var j=0;j<4;j++)oval(c,p.x-23+(j*17)%49,p.y-16+(j*13)%37,3+j%2,3,'#eef7ed');
  }
  function mini(c,G){var m=G.mini;if(!m)return;switch(m.type){case'feed':case'water':miniFeed(c,G,m);break;case'litter':miniLitter(c,G,m);break;case'play':miniPlay(c,G,m);break;case'prepare':case'work':miniDocs(c,G,m);break;case'bag':miniBag(c,G,m);break;case'dishes':miniDishes(c,G,m);break;case'arrange':miniArrange(c,G,m);break;case'laundry':miniLaundry(c,G,m);break;case'roller':miniRoller(c,G,m);break;case'curtain':miniCurtain(c,G,m);break;case'bed':miniBed(c,G,m);break;case'umbrella':miniUmbrella(c,G,m);break;case'pet':miniPet(c,G,m);break;}}
  function arrow(c,x,y,dir){c.save();c.translate(Math.round(x),Math.round(y));if(dir==='right')c.rotate(-Math.PI/2);else if(dir==='left')c.rotate(Math.PI/2);
    r(c,-5,-26,10,15,'#80532f');r(c,-3,-24,6,14,'#ffca66');
    for(var i=0;i<10;i++){r(c,-11+i,-12+i,23-i*2,1,'#80532f');if(i<8)r(c,-8+i,-11+i,17-i*2,1,'#ffca66');}c.restore();
  }
  function focus(c,G){var n=G.guide;if(!n||G.dialog||G.transition)return;var x=n.x,y=n.y-7+Math.round(Math.sin((G.now||0)*4)*4),w=n.w||0,h=n.h||0,left=x-w/2;
    if(w&&h){var col='#ffc466';r(c,left,n.y,9,2,col);r(c,left,n.y,2,8,col);r(c,left+w-9,n.y,9,2,col);r(c,left+w-2,n.y,2,8,col);r(c,left,n.y+h-2,9,2,col);r(c,left,n.y+h-8,2,8,col);r(c,left+w-9,n.y+h-2,9,2,col);r(c,left+w-2,n.y+h-8,2,8,col);}
    arrow(c,x,y);
    if(n.label&&n.showLabel){var len=String(n.label).length*13;box(c,Math.max(4,Math.min(632-len,x-len/2))-5,y-51,len+10,20,C.paper,C.line);text(c,n.label,Math.max(len/2+4,Math.min(632-len/2,x)),y-40,13,C.ink,'center');}
  }
  function draw(c,G){if(PixelArt.setImages)PixelArt.setImages(G.images);if(G.images)titleImages=G.images;var memo=jumpMemory.get(G)||{};if(G.jump)memo.active=true;else if(memo.active){memo.active=false;memo.landedAt=G.now||0;}jumpMemory.set(G,memo);
    c.save();c.imageSmoothingEnabled=false;var scene=G.scene,cam=camera(G);c.translate(cam.x,cam.y);c.scale(cam.scale,cam.scale);
    if(scene==='bedroom')bedroom(c,G);else if(scene==='living')living(c,G);else if(scene==='street')street(c,G);else if(scene==='shop')shop(c,G);else if(scene==='station')station(c,G);else if(scene==='train')trainInterior(c,G);else if(scene==='office')office(c,G);else PixelArt.fallback(c,scene,G.now||0);
    if(G.nightScene&&!G.sleeping&&!G.catControl&&!G.mini)r(c,0,0,640,360,'#1d3f5855');mini(c,G);focus(c,G);c.restore();
  }
  function title(c,t,G){var im=G&&G.images||titleImages||(PixelArt.setImages?PixelArt.setImages():{});if(G&&G.images)titleImages=G.images;if(PixelArt.setImages)PixelArt.setImages(im);
    var g={images:im,s:{day:0,phase:'morning',minute:540,food:1,water:true,litterDirty:0,needs:{fed:true},flags:{},suitStored:true},now:t||0,doorOpen:true,curtainClosed:false};
    c.save();c.imageSmoothingEnabled=false;atlas(c,g,'living');door(c,g,'living');windowMotion(c,g,'living');
    art(c,'litterTray',180,325,1.65);art(c,'scoop',224,310,1.25);art(c,'bowlFull',568,329,1.22);art(c,'water',476,329,1.15);art(c,'toy',360,329,1.35);
    var phase=(t||0)%12,x=phase<5?300+phase*22:phase<7?410:phase<11?410-(phase-7)*27.5:300,dir=phase<7?1:-1,pose=phase<5||phase>=7&&phase<11?'walk':phase<7?'groom':'sit';
    cat(c,{x:x,y:326,dir:dir,walk:t||0,pose:pose});c.restore();
  }
  function end(c,G,key){var s=G.s,g=Object.assign({},G,{catControl:false,photo:false,shopping:false,mini:null,nearest:null,transition:null,intro:'',dressed:false,curtainClosed:true,cat:Object.assign({},G.cat,{walk:0}),hero:Object.assign({},G.hero,{walk:0,pose:'stand'})});
    g.scene='living';g.doorOpen=s.lastNight?s.lastNight.open:true;g.restAt=G.now;g.cat={x:key==='distance'?574:510,y:314,dir:-1,walk:0,pose:key==='distance'?'sit':'sleep'};
    if((key==='settled'||key==='finding')&&g.doorOpen){g.scene='bedroom';g.sleeping=true;g.catOnBed=true;g.cat={x:150,y:260,dir:-1,walk:0,pose:'sleep'};}
    else{g.sleeping=false;if(key==='worn'&&s.trust>=4)g.cat={x:478,y:261,dir:-1,walk:0,pose:'sleep'};}
    draw(c,g);if(key==='shared')art(c,'phone',388,291,1.5);if(key==='finding'&&!g.doorOpen)art(c,'document',330,267,1.3);
  }
  return {draw:draw,mini:mini,title:title,camera:camera,end:end,coatMask:coatMask,rollerFur:rollerFur,rollerHead:rollerHead,rollerPeel:rollerPeel};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=LifeView;
