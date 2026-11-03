/* Scene painting only. Interaction coordinates stay in the 640 × 360 world. */
var LifeView = (function () {
  'use strict';
  var C={ink:'#304650',line:'#6e858d',paper:'#f5f5ec',ivory:'#e8ece5',blue:'#779fb1',navy:'#41667d',mint:'#8cb6a6',green:'#6a9180',floor:'#b9c9c6',night:'#36516d',skin:'#efc5a5',fur:'#e8b775'};
  function r(c,x,y,w,h,col){if(w<=0||h<=0)return;c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function box(c,x,y,w,h,col,line){r(c,x,y,w,h,line||C.ink);r(c,x+2,y+2,w-4,h-4,col);}
  function oval(c,x,y,rx,ry,col){for(var yy=-Math.ceil(ry);yy<=Math.ceil(ry);yy++){var a=1-yy*yy/(ry*ry||1);if(a<0)continue;var xx=Math.max(1,Math.floor(rx*Math.sqrt(a)));r(c,x-xx,y+yy,xx*2+1,1,col);}}
  function line(c,x1,y1,x2,y2,col,width){var n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(var i=0;i<=n;i++)r(c,x1+(x2-x1)*i/(n||1),y1+(y2-y1)*i/(n||1),width||1,width||1,col);}
  function text(c,s,x,y,size,col,align){c.fillStyle=col||C.ink;c.font=(size||12)+'px DungGeunMo, monospace';c.textAlign=align||'left';c.textBaseline='middle';c.fillText(s,x,y);}
  function art(c,type,x,y,s){PixelArt.item(c,type,x,y,s||1);}
  function sprite(c,x,y,s,fn){c.save();c.translate(Math.round(x),Math.round(y));c.scale(s,s);fn();c.restore();}
  function person(c,p,variant,pose){sprite(c,p.x,p.y,2.15,function(){PixelArt.person(c,0,0,variant,p.dir,p.walk,pose||(p.walk?'walk':p.pose||'stand'));});}
  function cat(c,p){sprite(c,p.x,p.y,1.6,function(){PixelArt.cat(c,0,0,p.dir,p.walk,p.pose||(p.walk?'walk':'sit'));});}
  function npc(c,x,y,variant,dir,pose){person(c,{x:x,y:y,dir:dir||1,walk:0},variant,pose||'stand');}
  function dots(c,x,y,n,col){for(var i=0;i<n;i++)r(c,x+(i*17)%31,y+(i*11)%24,3,1,col);}
  function panel(c,G){r(c,0,0,640,360,'#28485699');box(c,51,28,538,304,C.ivory,C.ink);r(c,55,32,530,6,C.paper);r(c,55,301,530,27,'#d2dfd7');}
  function floor(c,y,col){r(c,0,y,640,360-y,col||C.floor);for(var i=0;i<8;i++)r(c,0,y+i*17,640,1,'#92aaa933');}
  function atlas(c,G,scene){var room=scene==='bedroom'||scene==='living',image=G.images&&(room?G.images.rooms:G.images.places),idx=room?(scene==='living'?1:0):({street:0,station:1,office:2})[scene],count=room?2:3;
    if(image&&image.complete!==false&&(image.naturalWidth||image.width)&&idx!==undefined){var iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;c.drawImage(image,0,Math.round(ih*idx/count),iw,Math.round(ih/count),0,0,640,360);return true;}
    PixelArt.fallback(c,scene,G.now||0);return false;
  }
  function beyondDoor(c,x,y,w,h,room){
    function q(a,b,d,e,col){r(c,x+a*w,y+b*h,d*w,e*h,col);}
    q(0,0,1,1,'#98afa8');q(.1,.07,.85,.68,'#c9d6ca');q(0,.74,1,.26,'#b6c5b8');
    q(0,0,.07,1,'#718d84');q(.95,0,.05,1,'#718d84');q(.07,.02,.88,.035,'#718d84');
    for(var i=0;i<4;i++)q(.07,.79+i*.055,.88,.006,'#91a99a');
    line(c,x+w*.4,y+h*.74,x+w*.17,y+h,'#93aa9a');line(c,x+w*.65,y+h*.74,x+w*.9,y+h,'#93aa9a');
    if(room==='living'){
      q(.21,.42,.26,.19,'#b4c7b6');q(.22,.43,.24,.17,'#dce2d2');q(.33,.43,.014,.16,'#8ea99d');
      q(.22,.62,.28,.18,'#b4c7b6');q(.23,.64,.26,.14,'#d4ddce');q(.35,.64,.014,.14,'#91a99b');q(.21,.605,.30,.026,C.paper);
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
    box(c,x-3,y-3,w+6,h+6,'#d9e3d9',C.line);r(c,x+3,y+3,w-6,h-6,'#4e6b61');beyondDoor(c,x+5,y+5,w-10,h-10,other);
    var hx=x+5,dw=Math.max(13,Math.round((w-10)*(1-amount*.87))),sag=Math.round(amount*13);
    // The hinge edge stays fixed; the free edge recedes, exposing a continuous room.
    for(var i=0;i<dw;i++){var inset=Math.round(sag*i/dw);r(c,hx+i,y+5+inset,1,h-10-inset*2,i<2||i>dw-4?C.line:i<5?'#c4d3c7':'#eff0e3');}
    var edge=hx+dw-3;r(c,edge,y+5+sag,3,h-10-sag*2,'#7f9d8b');r(c,edge+1,y+7+sag,1,h-14-sag*2,'#bacdbb');
    if(dw>28){var px=hx+9,pw=dw-19;box(c,px,y+29,pw,h*.33,'#e2e8dc','#b5c6b6');box(c,px,y+h*.56,pw,h*.29,'#e2e8dc','#b5c6b6');}
    r(c,edge-6,y+h*.56,5,4,C.line);r(c,edge-7,y+h*.56+1,7,2,'#7b9685');
    r(c,hx-1,y+39,3,11,'#6b8578');r(c,hx-1,y+h-57,3,11,'#6b8578');r(c,hx,y+41,1,7,'#d2ddca');r(c,hx,y+h-55,1,7,'#d2ddca');
    r(c,x+1,y+h-3,w-2,5,'#d4dece');r(c,x+3,y+h+2,w-6,2,'#809b88');r(c,x+w-4,y+4,3,h-7,'#c3d2c3');
  }
  function door(c,G,scene){if(!G.doorOpen||G.catControl)return;var bedroom=scene==='bedroom';portal(c,bedroom?497:26,bedroom?54:55,bedroom?109:94,bedroom?238:225,bedroom?'living':'bedroom',1);}
  function curtain(c,x,y,w,h,t,closed,storm){var sway=closed?0:Math.round(Math.sin(t*3)*2*(storm?2:1)),cw=closed?w/2+1:22;
    if(storm)PixelArt.rain(c,{x:x+10,y:y+9,w:w-20,h:h-13},t,closed?.35:1.1);
    for(var side=0;side<2;side++){var xx=side?x+w-cw:x;
      r(c,xx+sway*(side?-1:1),y,cw,h,'#e8eadd');for(var i=4;i<cw;i+=8)r(c,xx+i+sway*(side?-1:1),y+3,2,h-3,'#c9d2c8');r(c,xx,y+h-4,cw,3,'#bbc7be');}
    r(c,x-3,y-4,w+6,3,C.line);
  }
  function windowMotion(c,G,scene){var bedroom=scene==='bedroom',x=bedroom?57:420,y=bedroom?45:53,w=bedroom?192:174,h=bedroom?137:107,t=G.now||0,storm=!!(G.s&&!G.intro&&(G.s.day===3||G.s.day===11)&&G.s.phase==='evening');
    if(G.s&&G.s.phase==='morning'){r(c,x+42,y+18,w-84,h-31,'#b2d6dd66');r(c,x+37,y+20,3,h-36,'#e9f4ee66');}
    if(storm&&!G.curtainClosed){r(c,x+31,y+12,w-62,h-25,'#38536b33');if(G.flash>0)r(c,x+28,y+9,w-56,h-19,'rgba(232,247,246,'+Math.min(.8,G.flash*3)+')');}
    curtain(c,x,y,w,h,t,G.curtainClosed,storm);
    if(storm&&!G.curtainClosed){var p=(t%2.5)/2.5;if(p<.45){var q=p/.45;for(var i=0;i<3;i++){r(c,588+i*6+q*4,93-i*5,2,10+i*5,'rgba(215,236,231,'+(.7*(1-q))+')');r(c,586+i*6+q*4,92-i*5,3,2,'rgba(215,236,231,'+(.7*(1-q))+')');}}}
  }
  function coat(c,x,y,scale,fur){art(c,'suit',x,y,scale);if(fur)dots(c,x-11*scale,y-24*scale,Math.min(12,fur),C.fur);}
  function cozyBox(c,x,y,w){var h=Math.round(w*.44),l=x-w/2;box(c,l,y-h,w,h,'#a6b9a4',C.line);r(c,l+5,y-h+4,w-10,h-9,'#6d8c7b');oval(c,x,y-13,w/2-8,7,'#cfdfcc');r(c,l+1,y-15,w-2,13,'#b3c4aa');r(c,l+6,y-13,w-12,2,'#dce7d3');r(c,x-12,y-15,24,6,'#8ba88e');r(c,l+2,y-h+2,3,h-4,'#d2dfc8');}
  function deskBox(c,x,y,w){var h=Math.round(w*.44),l=x-w/2;box(c,l,y-h,w,h,'#b9b69e',C.line);r(c,l+5,y-h+4,w-10,h-10,'#7b8979');r(c,l-6,y-h-3,w/2+6,5,'#d2d1b8');r(c,x+3,y-h-3,w/2+3,5,'#d2d1b8');box(c,l+10,y-18,w-20,12,'#c4dbcf','#a1bcb0');r(c,l+12,y-14,w-24,2,'#e1eee2');r(c,l+1,y-11,w-2,9,'#b9b69e');r(c,x-7,y-9,14,3,'#8e9e8b');r(c,l+3,y-h+3,2,h-6,'#e5e3ca');}
  function bedroom(c,G){var s=G.s||{},t=G.now||0;atlas(c,G,'bedroom');door(c,G,'bedroom');windowMotion(c,G,'bedroom');
    if(!G.dressed)coat(c,421,226,1.9,s.fur||0);
    art(c,'briefcase',510,320,1.4);art(c,'document',305,212,1.15);
    if(s.flags&&s.flags.deskSeat)deskBox(c,361,281,49);
    if(s.prep>0){r(c,285,194,11,3,C.mint);r(c,285,201,17,2,C.line);}
    if(s.roller&&s.roller.owned)art(c,'roller',458,288,1.1);
    if(s.flags&&s.flags.toyAtDoor)art(c,'toy',542,321,1.2);
    if(G.sleeping){
      c.save();c.translate(110,260);c.rotate(Math.PI/2);c.scale(2,2);PixelArt.person(c,0,0,'hoodie',0,0,'sleep');c.restore();
      r(c,80,248,65,38,'#779bb6');r(c,80,248,65,3,'#c8dfdf');for(var i=0;i<3;i++)r(c,83+i*20,252,2,30,'#aec9d2');r(c,83,265,58,2,'#aec9d2');
    }
    var showCat=G.doorOpen||G.jump||G.sleeping&&G.cat.y<300;
    if(showCat&&G.cat)cat(c,G.cat);
    if(!G.sleeping)person(c,G.hero,G.dressed?'suit':'hoodie');
    if(G.dressed&&s.fur>0)dots(c,G.hero.x-13,G.hero.y-75,Math.min(7,s.fur),C.fur);
    if(G.sleeping){r(c,0,0,640,360,'#17374f55');var b=(Math.sin(t*1.8)+1)*.5;r(c,96,251,26,1,'rgba(213,231,233,'+(.13+b*.13)+')');}
  }
  function lowPaws(c,G){r(c,0,0,640,35,'#203f4b22');r(c,0,0,18,360,'#1e3b4518');r(c,622,0,18,360,'#1e3b4518');}
  function camera(G){if(!G.catControl)return {scale:1,x:0,y:0};var p=Math.min(1,Math.max(0,(G.now-G.cameraAt)/1.2)),scale=1+.18*p;return {scale:scale,x:Math.round(Math.max(640-640*scale,Math.min(0,320-G.cat.x*scale))),y:Math.round(360-360*scale)};}
  function living(c,G){var s=G.s||{},t=G.now||0;atlas(c,G,'living');door(c,G,'living');windowMotion(c,G,'living');
    art(c,'foodBag',599,317,1.2);art(c,s.needs&&s.needs.fed?'bowlFull':'bowlEmpty',550,329,1.22);
    if(s.water)art(c,'water',490,329,1.15);else{art(c,'bowlEmpty',490,329,1.15);r(c,477,324,25,3,'#739db3');}
    if(!G.carried&&!(s.flags&&s.flags.toyAtDoor))art(c,'toy',360,329,1.35);
    if(s.flags&&s.flags.toyAtDoor)art(c,'toy',69,326,1.2);
    if(s.flags&&s.flags.cozyBox)cozyBox(c,510,323,88);
    if(s.hoodie){c.save();c.translate(510,311);c.scale(1.7,.7);art(c,'hoodie',0,0,1);c.restore();dots(c,495,298,7,C.fur);}
    if(!s.suitStored){c.save();c.translate(513,270);c.rotate(.09);coat(c,0,0,1.65,s.fur||0);c.restore();}
    if(s.roller&&s.roller.owned)art(c,'roller',331,277,1);
    if(G.intro==='routine'||s.flags&&s.flags.introFur)dots(c,G.hero.x-14,G.hero.y-74,8,C.fur);
    if(G.catControl){r(c,0,0,640,360,'#23455633');r(c,35,276,79,3,'#f1e6c790');if(G.catStage==='door'){var p=(t%2.6)/2.6;if(p<.5){for(var i=0;i<3;i++)r(c,113+i*6,263-i*4,2,6+i*4,'rgba(220,233,226,'+(.8*(1-p*2))+')');}}
      if(G.catStage==='scent'){for(var k=0;k<3;k++){var a=(t*.8+k*.33)%1;r(c,494+k*10,286-a*27,2,4,'rgba(230,237,218,'+((1-a)*.55)+')');}}
      if(G.catStage==='scent'&&G.cat.pose==='sleep'&&!s.suitStored){var j=Math.min(1,Math.max(0,(2.4-(G.lockedUntil-t))/.65));cat(c,{x:G.cat.x,y:G.cat.y+(269-G.cat.y)*j-Math.sin(j*Math.PI)*23,dir:G.cat.dir,walk:t,pose:j<1?'jump':'sleep'});}else cat(c,G.cat);
      if(G.carried)art(c,'toy',G.cat.x+(G.cat.dir<0?-25:25),G.cat.y-8,1);lowPaws(c,G);return;
    }
    if(G.restAt){npc(c,478,277,'hoodie',1,'sit');}
    else person(c,G.hero,G.dressed?'suit':'hoodie');
    if(G.cat)cat(c,G.cat);
    if(G.intro==='routine'){box(c,556,137,10,17,C.paper,C.line);r(c,559,141,4,8,C.mint);}
    if(G.intro==='montage')montage(c,G);
  }
  function montage(c,G){var t=G.now||0,p=(t-(G.montageAt||0))/8,phase=Math.floor(p*4)%4; r(c,0,0,640,360,phase%2?'#dfede522':'#2e506a44');
    if(phase===0){art(c,'document',290,259,1.8);npc(c,330,310,'hoodie',1,'sit');cat(c,{x:348,y:290,dir:-1,walk:t,pose:'sleep'});}
    if(phase===1){art(c,'phone',338,271,1.7);cat(c,{x:374,y:311,dir:-1,walk:0,pose:'sit'});}
    if(phase===2){art(c,'foodBag',345,271,1.3);art(c,'bowlFull',377,322,1.4);cat(c,{x:410,y:323,dir:-1,walk:0,pose:'eat'});}
    if(phase===3){npc(c,470,274,'hoodie',1,'sit');cat(c,{x:510,y:285,dir:-1,walk:t,pose:'sleep'});art(c,'phone',487,253,1);}
    var q=(p*4)%1;if(q<.15||q>.85)r(c,0,0,640,360,'rgba(41,69,85,'+(Math.abs(q-.5)*.55)+')');
  }
  function street(c,G){atlas(c,G,'street');var t=G.now||0;PixelArt.rain(c,{x:0,y:0,w:640,h:360},t,.85);
    // The kitten is below the awning, apart from the clear route home at the right.
    if(G.intro==='meet'){box(c,410,303,37,18,'#9b9e89','#5d736f');r(c,407,299,43,5,'#c5c6ad');cat(c,{x:443,y:320,dir:-1,walk:t,pose:'fear'});}
    else if(G.intro==='sheltered'){cat(c,G.cat);for(var i=0;i<3;i++){oval(c,568+i*20,328-i*9,3,2,'#d8e7de99');oval(c,573+i*20,337-i*9,3,2,'#d8e7de99');}}
    person(c,G.hero,'hoodie');if(G.intro==='meet'||G.intro==='sheltered')art(c,'umbrella',G.hero.x+13,G.hero.y-93,2.8);
    for(var j=0;j<12;j++){var px=(j*53+17)%640,py=295+(j*19)%62,a=(t*1.9+j*.27)%1;r(c,px-a*4,py,3+a*9,1,'rgba(213,236,237,'+(.35*(1-a))+')');}
  }
  function station(c,G){atlas(c,G,'station');var t=G.now||0;var tx=G.trainX===undefined?15:G.trainX,open=tx<=15?Math.min(1,Math.max(0,(t-(G.stationAt||0)-4.16)*1.5)):0;
    // Match the train to the platform edge; doors meet the boarding area.
    c.save();c.translate(tx,132);c.scale(1.25,1.35);PixelArt.train(c,0,0,open,t);c.restore();
    r(c,0,271,640,6,'#b8be95');for(var i=0;i<64;i++)r(c,i*10,272,4,2,'#e6e8cf');
    npc(c,160,312,'peer',1);npc(c,535,316,'suit',-1);person(c,G.hero,'suit');
    if(open>.6){r(c,tx+279,267,56,2,'#dce8e0');r(c,tx+282,270,50,2,'#95b5af');}
  }
  function trainInterior(c,G){var t=G.now||0,elapsed=t-(G.rideAt||0),moving=elapsed<3.5; r(c,0,0,640,360,'#d7e2df');r(c,0,25,640,8,'#a1b6bb');floor(c,275,'#aabebd');
    for(var i=0;i<4;i++){var x=20+i*153;box(c,x,62,125,119,C.line,C.ink);r(c,x+4,66,117,111,'#62859a');
      c.save();c.beginPath();c.rect(x+4,66,117,111);c.clip();for(var j=0;j<5;j++){var bx=x+((j*49-(moving?t*145:0))%245+245)%245-60;r(c,bx,95+(j%2)*20,34,83,'#91a8ae');r(c,bx+5,115,8,12,'#d4ded5');r(c,bx+19,116,8,12,'#c5d9dc');}c.restore();r(c,x+7,70,112,2,'#c3dbdc');}
    r(c,0,187,640,7,C.line);r(c,0,220,640,49,'#709caa');r(c,0,221,640,4,'#a9c8c9');for(var n=0;n<8;n++)r(c,n*88,223,2,44,'#507d90');r(c,0,268,640,8,'#577c8b');
    for(var k=0;k<6;k++){var xx=35+k*107;r(c,xx,31,2,34,C.line);box(c,xx-6,61,15,19,'#dce6dd',C.line);r(c,xx-3,64,9,10,'#9eb6b8');}
    r(c,260,29,4,265,C.line);r(c,262,30,1,263,C.paper);box(c,526,53,104,228,'#c8d8d3',C.ink);r(c,577,55,2,224,C.line);
    for(var d=0;d<2;d++){box(c,537+d*47,75,36,105,'#577f94',C.line);r(c,542+d*47,82,25,2,'#a6c7ce');r(c,568+d*21,191,2,18,C.line);}
    npc(c,343,266,'peer',1,'sit');npc(c,462,266,'lead',-1,'sit');person(c,G.hero,'suit');
    if(!moving){r(c,528,280,100,3,C.paper);r(c,587,203,2,14,C.mint);}
  }
  function office(c,G){atlas(c,G,'office');var s=G.s||{};
    box(c,282,236,99,11,C.paper,C.line);r(c,286,247,5,52,C.line);r(c,372,247,5,52,C.line);art(c,'document',322,234,1.4);art(c,'briefcase',372,300,.85);
    if(G.officeDone){r(c,311,215,19,2,C.mint);r(c,312,220,13,2,C.mint);}
    npc(c,445,305,'lead',-1);npc(c,180,310,'peer',1);if(s.day===8)npc(c,510,310,'boss',-1);person(c,G.hero,'suit');if(s.fur>0)dots(c,G.hero.x-13,G.hero.y-75,Math.min(7,s.fur),C.fur);
  }
  function photo(c,G){r(c,0,0,640,360,'#28485688');box(c,233,36,174,279,'#425966',C.ink);r(c,240,47,160,246,'#e5ede4');r(c,292,41,54,3,C.line);r(c,292,302,54,3,C.line);
    box(c,250,66,140,174,'#d2e2d8',C.paper);r(c,253,181,134,56,'#93b4aa');r(c,267,165,106,31,'#759b92');r(c,273,193,5,18,C.line);r(c,361,193,5,18,C.line);
    sprite(c,315,184,2.7,function(){PixelArt.cat(c,0,0,-1,G.now,'sleep');});art(c,'toy',355,221,1.5);text(c,'호떡이',320,263,15,C.ink,'center');
  }
  function shop(c,G){r(c,0,0,640,360,'#294a5888');box(c,82,52,476,252,C.ivory);r(c,86,221,468,13,'#96b4a7');r(c,86,280,468,20,C.line);
    art(c,'foodBag',188,215,3.3);art(c,'foodBag',326,215,2.15);art(c,'roller',461,216,2.6);
    box(c,133,241,109,25,C.paper,C.line);box(c,275,241,105,25,C.paper,C.line);box(c,410,241,105,25,C.paper,C.line);
    text(c,'6회 · 18,000',188,254,12,C.ink,'center');text(c,'2회 · 6,000',327,254,12,C.ink,'center');text(c,'4,000원',462,254,12,C.ink,'center');
  }
  function bowl(c,x,y,type,progress){art(c,'bowlEmpty',x,y,3.6);if(type==='water'){oval(c,x,y-27,37,9,'#6f929d');if(progress>.02){oval(c,x,y-27,37*Math.min(1,progress*2),9*Math.min(1,progress*2),'#87becd');r(c,x-20,y-30,26,2,'#d5ece8');}}
    else for(var i=0;i<Math.ceil(progress*30);i++)r(c,x-31+(i*17)%62,y-34+(i*7)%15,7,4,i%2?'#94805b':'#ab966a');}
  function bottle(c,x,y,tilt){c.save();c.translate(Math.round(x),Math.round(y));c.rotate(tilt||0);box(c,-20,-63,40,61,'#b8d7dc',C.line);r(c,-10,-72,20,10,C.line);r(c,-10,-75,20,6,C.blue);r(c,-16,-39,32,30,'#77acbc');r(c,-12,-57,5,33,'#e4f1e8');r(c,-18,-26,36,16,C.paper);c.restore();}
  function miniFeed(c,G,m){panel(c,G);var water=m.type==='water',p=m.p,t=G.now||0;
    r(c,67,273,506,26,'#c2d4c8');bowl(c,385,272,water?'water':'food',m.progress);
    if(water)bottle(c,p.x,p.y,m.pouring?2.7:0);else{c.save();c.translate(p.x,p.y);c.rotate(m.pouring?2.7:0);art(c,'foodBag',0,0,2.2);c.restore();}
    if(m.pouring){var mouthX=p.x+32,mouthY=p.y+65;for(var i=0;i<12;i++){var a=(t*(water?2.7:1.6)+i*.083)%1,xx=mouthX+(water?Math.sin(i)*2:(i*7)%10-5);r(c,xx,mouthY+a*Math.max(12,244-mouthY),water?2:4,water?7:3,water?'#84bbcbd0':i%2?'#8a7957':'#a48c63');}}
    var cp=m.complete?465:508;sprite(c,cp,m.complete?285:288,2.2,function(){PixelArt.cat(c,0,0,-1,0,m.complete?'eat':'sit');});
    if(m.progress>0){for(var k=0;k<Math.ceil(m.progress*12);k++)r(c,341+k*8,289,5,3,water?C.blue:C.green);}
    if(!m.down&&!m.complete){art(c,'hand',p.x+45,p.y+15,1.5);}
  }
  function miniPlay(c,G,m){panel(c,G);r(c,57,91,526,90,'#dce7dc');r(c,57,181,526,118,'#c5d7cc');for(var i=0;i<9;i++)r(c,59+i*65,293,40,1,'#a5bfb1');
    var p=m.pointer||{x:320,y:220},t=G.now||0;line(c,p.x+25,p.y-73,p.x,p.y-13,C.wood||'#8a9b83',3);line(c,p.x,p.y-13,p.x-8,p.y-2,C.line,1);r(c,p.x-12,p.y-3,9,8,C.blue);r(c,p.x-15,p.y+1,7,3,C.mint);
    sprite(c,m.catX,m.catY,1.8,function(){PixelArt.cat(c,0,0,m.catDir||1,m.catWalk||0,m.catY<284?'jump':m.catWalk?'walk':'sit');});
    if(m.progress>0){var n=Math.min(3,Math.ceil(m.progress*3));for(var j=0;j<n;j++){oval(c,280+j*24,66,4,3,C.mint);r(c,279+j*24,59,2,2,C.mint);r(c,284+j*24,60,2,2,C.mint);}}
    if(m.complete){PixelArt.cat(c,m.catX,m.catY,m.catDir,0,'sit');}
  }
  function miniDocs(c,G,m){panel(c,G);r(c,63,49,514,250,'#cad8d3');
    if(m.deskCat||G.s.flags&&G.s.flags.deskSeat){box(c,528,185,53,43,'#91afa3',C.line);r(c,523,223,64,9,'#739b8b');r(c,528,232,4,60,C.line);r(c,578,232,4,60,C.line);}
    for(var i=0;i<3;i++){var x=95+i*155;box(c,x,232,128,66,'#a2b5b0',C.line);r(c,x+5,239,118,47,'#dce6dc');r(c,x+18,285,92,4,C.mint);text(c,String(i+1),x+63,313,12,C.line,'center');}
    m.cards.forEach(function(a){box(c,a.x+3,a.y+3,a.w,a.h,'#9cadab');box(c,a.x,a.y,a.w,a.h,C.paper,a.placed?C.green:C.line);r(c,a.x+9,a.y+10,a.w-18,5,C.blue);r(c,a.x+9,a.y+21,a.w-35,2,C.line);for(var j=0;j<4;j++)r(c,a.x+10,a.y+31+j*6,a.w-21-(j%2)*15,1,'#acbbb6');text(c,a.word,a.x+a.w/2,a.y+71,12,C.ink,'center');if(a.placed){r(c,a.x+a.w-15,a.y+8,3,7,C.green);r(c,a.x+a.w-12,a.y+12,6,3,C.green);}});
    if(m.deskCat){var phase=m.deskPhase||'blocking',route=m.catRoute||'beside',cozy=m.cozy||{x:100,y:280},t=G.now||0;
      deskBox(c,cozy.x,cozy.y,70);
      if(phase!=='away'){var p=phase==='moving'?Math.min(1,Math.max(0,(t-(m.catMoveAt||t))/1.5)):phase==='settled'?1:0;
        var dest=route==='away'?{x:92,y:301}:{x:550,y:232};var xy=m.deskCatxy||{x:305+(dest.x-305)*p,y:180+(dest.y-180)*p-Math.sin(p*Math.PI)*10};
        sprite(c,xy.x,xy.y,2.3,function(){PixelArt.cat(c,0,0,route==='away'?-1:1,t,phase==='moving'?'walk':'sleep');});
        if(phase==='blocking'&&m.drag==='guideCat')art(c,'hand',(m.pointer||{}).x||325,(m.pointer||{}).y||180,1.4);
      }
    }else if(G.s.flags&&G.s.flags.deskSeat)deskBox(c,550,232,70);
  }
  function miniArrange(c,G,m){panel(c,G);r(c,58,259,524,40,'#c8d8cc');r(c,447,59,6,179,C.line);r(c,549,59,6,179,C.line);r(c,447,58,108,6,C.line);r(c,439,237,25,5,C.line);r(c,541,237,23,5,C.line);
    box(c,420,274,148,27,'#c0d2c6',C.line);for(var i=0;i<12;i++)r(c,426+i*12,279,3,16,C.paper);r(c,414,272,160,3,C.paper);
    if(G.s.suitStored)coat(c,501,180,2,0);if(G.s.hoodie){c.save();c.translate(488,296);c.scale(2.2,.9);art(c,'hoodie',0,0);c.restore();}
    if(G.s.flags&&G.s.flags.cozyBox)cozyBox(c,488,296,115);
    m.items.forEach(function(a){if(a.type==='box')cozyBox(c,a.x,a.y+30,78);else art(c,a.type,a.x,a.y+30,2.2);});
    if(m.drag&&typeof m.drag==='object'){var suit=m.drag.type==='suit';r(c,suit?456:426,suit?75:278,suit?88:133,2,'#f6ffef');}
  }
  function miniRoller(c,G,m){panel(c,G);coat(c,317,296,5.15,0);var s=G.s;
    m.fur.forEach(function(f){if(f.on){r(c,f.x-4,f.y,9,2,C.fur);r(c,f.x+2,f.y-2,2,5,'#f4d6a0');}});
    art(c,'roller',m.p.x,m.p.y+60,2.6);var dirty=s.roller.dirty||0;
    for(var i=0;i<dirty;i++)r(c,m.p.x-20+(i*11)%39,m.p.y-20+(i*7)%15,5,2,'#b8a476');
    box(c,446,55,103,54,C.paper,C.line);r(c,451,60,91,43,'#e7e9da');dots(c,454,66,Math.min(18,dirty*2),'#a89873');
    var fold=m.drag==='peel'?Math.min(50,Math.max(0,(m.pointer.y||m.peelY)-m.peelY)):9;line(c,539,60,539-fold,60+fold,C.line,2);r(c,541-fold,62+fold,fold,3,'#fbfff6');
    art(c,'hand',538-fold,79+fold,1.1);
    for(var j=0;j<8;j++)r(c,455+j*10,121,7,3,j<dirty?'#b59a70':'#b9cfc3');
  }
  function miniCurtain(c,G,m){panel(c,G);box(c,112,66,420,206,'#e1e8df',C.line);r(c,119,74,406,188,'#456a83');
    for(var i=0;i<7;i++){r(c,127+i*60,174+(i%2)*19,44,88,'#31536c');r(c,137+i*60,195,8,11,'#a8bbb3');}
    PixelArt.rain(c,{x:119,y:74,w:406,h:188},G.now,1.5);r(c,320,74,4,188,C.paper);r(c,119,166,406,4,C.paper);
    var progress=m.progress||0,w=42+progress*165;curtain(c,112,64,420,208,G.now,false,false);
    for(var side=0;side<2;side++){var x=side?532-w:112;r(c,x,64,w,208,'#e4e9dc');for(var j=5;j<w;j+=12)r(c,x+j,68,3,202,'#bdcdbf');r(c,x,265,w,7,'#a4bcae');}
    art(c,'hand',400+progress*160,170,2);sprite(c,488,304,1.6,function(){PixelArt.cat(c,0,0,-1,0,progress>.8?'sit':'fear');});
  }
  function miniBed(c,G,m){panel(c,G);box(c,82,168,282,131,C.line,C.ink);r(c,88,163,270,34,C.paper);box(c,102,173,86,37,'#e4ede1','#b6c8c0');
    var p=m.progress||0,by=252-p*68;r(c,91,by,264,298-by,'#789fb6');r(c,91,by,264,5,'#d7e8e4');for(var i=0;i<9;i++)r(c,96+i*30,by+6,3,290-by,'#b2d0d4');for(var j=0;j<4;j++)r(c,95,by+21+j*22,254,2,'#b2d0d4');
    if(p>.2){c.save();c.translate(153,205);c.scale(1.8,1.8);PixelArt.person(c,0,0,'hoodie',0,0,'sleep');c.restore();r(c,153,by,200,298-by,'#789fb6');r(c,153,by,200,4,'#d7e8e4');}
    var open=m.door||0;portal(c,440,55,119,245,'living',open);
    if(open>.45)PixelArt.cat(c,515,285,-1,0,'sit');else r(c,446,293,106,2,'#dfd6b8');
    art(c,'hand',m.drag==='door'?(m.pointer||{}).x||540:289,m.drag==='door'?(m.pointer||{}).y||191:by+16,1.7);
  }
  function miniUmbrella(c,G,m){atlas(c,G,'street');r(c,0,0,640,360,'#274c6633');var p=m.p,progress=m.progress||0,t=G.now||0;
    var cx=332,cy=293;box(c,296,279,76,39,'#a8aa90',C.line);r(c,292,274,85,8,'#c4c7ae');sprite(c,cx,cy,1.55,function(){PixelArt.cat(c,0,0,-1,progress>.7?0:t,progress>.7?'sit':'fear');});
    // Rain is clipped around the moving umbrella so the shelter is visible.
    var left=p.x-90,right=p.x+90,roof=p.y-130;PixelArt.rain(c,{x:0,y:0,w:Math.max(0,left),h:360},t,1);PixelArt.rain(c,{x:right,y:0,w:Math.max(0,640-right),h:360},t,1);PixelArt.rain(c,{x:left,y:0,w:180,h:Math.max(0,roof+8)},t,.8);
    sprite(c,p.x,p.y+23,4,function(){art(c,'umbrella',0,0);});art(c,'hand',p.x+8,p.y+6,2);
    if(progress>.7){oval(c,333,317,40,3,'#b4d3ca88');r(c,329,254,3,2,C.paper);r(c,339,251,2,3,C.paper);}
  }
  function miniPet(c,G,m){panel(c,G);r(c,57,224,526,75,'#bad0c3');art(c,'hoodie',237,296,4.5);sprite(c,371,276,3.1,function(){PixelArt.cat(c,0,0,-1,0,m.complete?'sleep':'sit');});
    var p=m.pointer||{x:330,y:220};art(c,'hand',p.x,p.y,2.4);
    if(m.moved>30){var count=Math.min(20,Math.floor(m.moved/6));for(var i=0;i<count;i++)r(c,183+(i*23)%103,208+(i*17)%68,5,2,C.fur);}
    if(m.complete){for(var j=0;j<3;j++){var a=(G.now+j*.3)%1;r(c,370+j*8,184-a*15,2,3,'rgba(194,222,203,'+(1-a)+')');}}
  }
  function mini(c,G){var m=G.mini;if(!m)return;switch(m.type){case'feed':case'water':miniFeed(c,G,m);break;case'play':miniPlay(c,G,m);break;case'prepare':case'work':miniDocs(c,G,m);break;case'arrange':miniArrange(c,G,m);break;case'roller':miniRoller(c,G,m);break;case'curtain':miniCurtain(c,G,m);break;case'bed':miniBed(c,G,m);break;case'umbrella':miniUmbrella(c,G,m);break;case'pet':miniPet(c,G,m);break;}}
  function focus(c,G){var n=G.nearest;if(!n||G.dialog||G.mini||G.catControl||G.transition)return;var a=.3+Math.sin((G.now||0)*4)*.14;oval(c,n.ax,n.ay+3,17,3,'rgba(242,251,237,'+a+')');}
  function draw(c,G){c.save();c.imageSmoothingEnabled=false;var scene=G.scene,cam=camera(G);c.translate(cam.x,cam.y);c.scale(cam.scale,cam.scale);
    if(scene==='bedroom')bedroom(c,G);else if(scene==='living')living(c,G);else if(scene==='street')street(c,G);else if(scene==='station')station(c,G);else if(scene==='train')trainInterior(c,G);else if(scene==='office')office(c,G);else PixelArt.fallback(c,scene,G.now||0);
    focus(c,G);if(G.photo)photo(c,G);if(G.shopping)shop(c,G);mini(c,G);c.restore();
  }
  function title(c,t){c.save();c.imageSmoothingEnabled=false;r(c,0,0,640,360,'#dfe9e2');floor(c,271,'#bccfca');r(c,0,267,640,5,'#a1b8b1');box(c,226,40,186,237,C.paper,C.line);r(c,232,47,174,224,'#cbdad1');r(c,242,57,153,201,'#d8e3d7');r(c,385,171,7,11,C.line);r(c,232,266,174,5,'#8ca9a1');
    r(c,84,73,94,108,C.paper);r(c,89,78,84,98,'#a8ccd2');r(c,129,78,3,98,C.paper);r(c,89,125,84,3,C.paper);r(c,74,69,21,120,'#e9ede0');r(c,170,69,20,120,'#e9ede0');
    for(var i=0;i<3;i++){r(c,87+i*3,73,1,111,'#bdcfc5');r(c,173+i*3,73,1,111,'#bdcfc5');}
    box(c,490,245,63,35,'#a5bba6',C.line);r(c,516,189,4,59,C.green);for(var j=0;j<6;j++)oval(c,515+(j%2?13:-11),195+j*6,13,5,j%2?'#86ad92':'#a7c4a8');
    sprite(c,347,281,1.8,function(){PixelArt.cat(c,0,0,-1,t,'sit');});art(c,'toy',290,286,1.8);r(c,230,272,175,2,'#eff0d4');var p=(t%5)/5;if(p<.12)r(c,402,95,2,16,'#f4f7ed');c.restore();
  }
  function end(c,G,key){var s=G.s,g=Object.assign({},G,{catControl:false,photo:false,shopping:false,mini:null,nearest:null,transition:null,intro:'',dressed:false,curtainClosed:true,cat:Object.assign({},G.cat,{walk:0}),hero:Object.assign({},G.hero,{walk:0,pose:'stand'})});
    g.scene='living';g.doorOpen=s.lastNight?s.lastNight.open:true;g.restAt=G.now;g.cat={x:key==='distance'?574:510,y:314,dir:-1,walk:0,pose:key==='distance'?'sit':'sleep'};
    if((key==='settled'||key==='finding')&&g.doorOpen){g.scene='bedroom';g.sleeping=true;g.cat={x:150,y:260,dir:-1,walk:0,pose:'sleep'};}
    else{g.sleeping=false;if(key==='worn'&&s.trust>=4)g.cat={x:478,y:261,dir:-1,walk:0,pose:'sleep'};}
    draw(c,g);if(key==='shared')art(c,'phone',388,291,1.5);if(key==='finding'&&!g.doorOpen)art(c,'document',330,267,1.3);
  }
  return {draw:draw,title:title,camera:camera,end:end};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=LifeView;
