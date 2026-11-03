/* Crisp, original pixel sprites. All anchors are feet/bottom-centre except train (top-left).
   Coordinates are native 640x360 pixels. t / walk are seconds; no DOM or external assets. */
var PixelArt = (function () {
  'use strict';
  var C = {
    ink:'#293c48', line:'#40535d', wall:'#e5e9e5', wallShade:'#ccd5d3', floor:'#c0beb0',
    paper:'#f5f4e9', white:'#e9f0ed', blue:'#739eac', blueDark:'#467383', navy:'#365569',
    teal:'#6fa79c', green:'#8ba58b', grey:'#a1adb0', greyDark:'#75868d', hair:'#4b4140',
    skin:'#e9b68e', skinLight:'#f4cba3', ginger:'#d89553', gingerLight:'#f0bd77',
    gingerDark:'#a96c3e', furWhite:'#f3e4c3', brown:'#8d7460', wood:'#a99c84',
    woodDark:'#817a69', glass:'#a4c3cc', night:'#455f77', food:'#8b6842'
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
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(dir<0?-1:1,1);
    var suit=variant==='suit'||variant==='lead'||variant==='boss'||variant==='commuterA';
    var commuter=variant.indexOf('commuter')===0;
    var body=variant==='commuterA'?'#81959f':variant==='commuterB'?'#aaa995':variant==='commuterC'?'#688797':suit?C.navy:variant==='peer'?'#c8d8c0':C.grey;
    var shade=variant==='commuterA'?'#607884':variant==='commuterB'?'#8b927f':variant==='commuterC'?'#496b80':suit?'#273f52':variant==='peer'?'#87a38c':C.greyDark;
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
    r(c,6,hy+5,2,2,C.ink);r(c,13,hy+5,2,2,C.ink);r(c,10,hy+8,2,1,C.brown);
    r(c,0,hy+8,4,1,C.furWhite);r(c,16,hy+8,4,1,C.furWhite);
    c.restore();
  }
  function item(c,type,x,y,scale) {
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
  function fallback(c,scene,t) {
    r(c,0,0,640,360,C.wall);r(c,0,235,640,5,C.wallShade);floor(c,240);
    if(scene==='bedroom') {
      window(c,40,30,135,102);door(c,548,48,68,196);
      box(c,26,220,178,83,C.wood);r(c,30,212,168,38,C.paper);r(c,36,204,51,18,C.white);
      r(c,85,220,113,69,C.blue);r(c,91,227,103,3,C.glass);r(c,38,300,4,13,C.woodDark);r(c,191,300,4,13,C.woodDark);
      box(c,244,171,136,11,C.wood);r(c,252,182,5,66,C.woodDark);r(c,369,182,5,66,C.woodDark);item(c,'chair',310,252);
      box(c,274,141,57,31,C.navy);r(c,280,146,45,21,C.glass);r(c,270,172,65,3,C.greyDark);
      r(c,434,71,4,171,C.greyDark);r(c,509,71,4,171,C.greyDark);r(c,434,71,79,4,C.greyDark);
      item(c,'box',472,244);item(c,'suit',475,154);
    } else if(scene==='living') {
      door(c,28,48,74,196);box(c,132,155,190,91,C.grey);box(c,132,151,190,10,C.paper);
      box(c,203,151,64,8,C.greyDark);r(c,234,135,4,19,C.line);r(c,234,135,14,3,C.line);
      box(c,329,91,68,155,C.paper);r(c,330,145,65,2,C.greyDark);r(c,337,119,3,16,C.greyDark);r(c,337,164,3,26,C.greyDark);
      window(c,449,37,139,101);box(c,425,187,179,63,C.blueDark);r(c,432,192,165,47,C.blue);
      r(c,427,174,13,67,C.blueDark);r(c,591,174,13,67,C.blueDark);r(c,437,214,152,3,C.blueDark);
      r(c,443,249,4,9,C.woodDark);r(c,589,249,4,9,C.woodDark);box(c,452,278,133,38,C.wallShade,C.grey);
      item(c,'bowlEmpty',484,304);item(c,'water',548,304);item(c,'foodBag',602,280);
    } else if(scene==='street') {
      r(c,0,0,640,270,'#718e9d');r(c,0,270,640,90,'#8eabae');
      [0,103,214,355,480,570].forEach(function(xx,i){box(c,xx,50+(i%3)*19,92,219,C.wallShade);for(var k=0;k<3;k++)box(c,xx+15+k*23,87,13,26,C.glass);});
      box(c,360,110,250,160,C.paper);r(c,360,110,250,22,C.teal);box(c,379,146,94,119,C.glass);box(c,486,146,105,119,C.glass);
      r(c,0,270,640,5,C.paper);r(c,0,329,640,2,C.wallShade);r(c,100,286,50,2,'#a9c1c1');
    } else if(scene==='station') {
      r(c,0,0,640,250,'#c9d8d7');r(c,0,56,640,9,C.teal);r(c,0,130,640,118,'#657d8b');
      for(var p=0;p<5;p++)box(c,55+p*130,16,18,231,C.paper,C.grey);floor(c,250);
      r(c,0,255,640,10,'#9faf91');for(var q=0;q<32;q++)r(c,q*21,259,13,2,C.paper);
      box(c,15,213,30,46,C.greyDark);r(c,19,219,22,6,C.teal);r(c,43,233,31,3,C.greyDark);
    } else if(scene==='office') {
      window(c,30,26,210,102);window(c,267,26,210,102);door(c,551,48,61,195);
      [102,290,475].forEach(function(xx){box(c,xx-53,181,122,10,C.paper,C.greyDark);r(c,xx-45,191,4,53,C.greyDark);r(c,xx+54,191,4,53,C.greyDark);box(c,xx-22,141,48,34,C.navy);r(c,xx-18,145,40,25,C.glass);r(c,xx-27,176,58,3,C.greyDark);item(c,'chair',xx,252);});
      box(c,331,299,112,8,C.paper,C.greyDark);item(c,'document',390,296);
    }
  }
  return {palette:C,person:person,cat:cat,item:item,train:train,rain:rain,fallback:fallback};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=PixelArt;
