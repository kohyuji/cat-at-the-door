/* r4 그림에 없는 작은 그림(상품 그림, 고객 표시, 하트, 표정 등).
   한 글자가 한 칸이다. 같은 픽셀 그림체로 보이도록 굵은 외곽선(k)을 쓴다. */
var PixelIcons = (function () {
  'use strict';
  var P = {
    k: '#2f2a33', w: '#fffaf0', g: '#d3d5d8', G: '#8f98a3', d: '#5d6673',
    r: '#e0574f', R: '#a8332e', y: '#f4c95d', Y: '#c8962f', b: '#5f93d6', B: '#3a659f',
    c: '#b5dcf7', o: '#f0a14e', O: '#b86d2b', p: '#f3a9b9', n: '#a0704a', N: '#6e4a2f',
    e: '#79c27a', E: '#3f8b4c', s: '#f5cba4', S: '#d9a47c', v: '#a585d8', m: '#9fd8c9', M: '#4e9d8a',
    x: '#ffffff'
  };
  var G = {
    bowl: [
      '................',
      '................',
      '................',
      '................',
      '......nnnn......',
      '....nnNnnNnn....',
      '...nNnnnnnnNn...',
      '.kkkkkkkkkkkkkk.',
      '.kwwwwwwwwwwwwk.',
      '.kbbbbbbbbbbbbk.',
      '..kbBbbbbbbbbk..',
      '..kbbbbbbbbbbk..',
      '...kbbbbbbbbk...',
      '....kkkkkkkk....',
      '................',
      '................'],
    mouse: [
      '................',
      '................',
      '................',
      '.....kkk........',
      '....kpppk.......',
      '....kpgpkkkk....',
      '...kkggggggkk...',
      '..kgggggggggk...',
      '.kgkgggggggggk..',
      'kpgggggggggggk..',
      '.kkgggggggggk.k.',
      '...kkkkkkkkk..k.',
      '..............k.',
      '.............k..',
      '................',
      '................'],
    tooth: [
      '................',
      '...kkkk..kkkk...',
      '..kwwwwkkwwwwk..',
      '.kwwwwwwwwwwwwk.',
      '.kwwxxwwwwwwwgk.',
      '.kwwxwwwwwwwwgk.',
      '.kwwwwwwwwwwwgk.',
      '..kwwwwwwwwwgk..',
      '..kwwwwwwwwwgk..',
      '..kwwwwkkwwwgk..',
      '..kwwwk..kwwgk..',
      '..kwwk....kwgk..',
      '...kwk....kwk...',
      '...kk......kk...',
      '................',
      '................'],
    car: [
      '................',
      '................',
      '................',
      '.....kkkkkkk....',
      '....kccckccck...',
      '...kccccbcccck..',
      '..kbbbbbbbbbbbk.',
      '.kbbbbbbbbbbbbbk',
      '.kybbbbbbbbbbbrk',
      '.kbbbbbbbbbbbbbk',
      '.kBBkkkBBBBkkkBk',
      '..kkGwGkkkkGwGk.',
      '...kGGGk..kGGGk.',
      '....kkk....kkk..',
      '................',
      '................'],
    travel: [
      '.......kk.......',
      '......kwwk......',
      '......kwwk......',
      '......kwck......',
      '...kk.kwwk.kk...',
      '..kbbkkwwkkbbk..',
      '.kwwwwwwwwwwwwk.',
      'kwwwwwwwwwwwwwwk',
      'kkkkkkkwwkkkkkkk',
      '......kwwk......',
      '......kwwk......',
      '.....kkwwkk.....',
      '....kbbwwbbk....',
      '....kkkkkkkk....',
      '................',
      '................'],
    home: [
      '.......kk.......',
      '......krrk......',
      '.....krrrrk.....',
      '....krrrrrrk....',
      '...krrrrrrrrk...',
      '..krrrrrrrrrrk..',
      '.kRRRRRRRRRRRRk.',
      'kkkkkkkkkkkkkkkk',
      '.kwwwwwwwwwwwwk.',
      '.kwkkkkwwwkkkwk.',
      '.kwkcckwwwknkwk.',
      '.kwkcckwwwknkwk.',
      '.kwkkkkwwwknkwk.',
      '.kwwwwwwwwknkwk.',
      '.kkkkkkkkkkkkkk.',
      '................'],
    pet: [
      '................',
      '.kk..........kk.',
      '.kpk........kpk.',
      '.kook......kook.',
      '.koook....koook.',
      '.kooookkkkooook.',
      '.koooooooooooook',
      'kooookooookooook',
      'koowkkooookkwook',
      'kooookooookooook',
      'koooooopppooooo.',
      '.kowwooopooowwk.',
      '.kowwwwwwwwwwok.',
      '..kkwwwwwwwwkk..',
      '....kkkkkkkk....',
      '................'],
    group: [
      '................',
      '................',
      '..kkk......kkk..',
      '.knnnkkkkkkNNNk.',
      '.ksssknnnnksssk.',
      '.kskknnssnnkksk.',
      '.kssksssssskssk.',
      '..kkksksskskkk..',
      '.kyyksssssskvvk.',
      'kyyyyksssskvvvvk',
      'kyyykmmmmmmkvvvk',
      'kyykmmmmmmmmkvvk',
      'kyykmmmmmmmmkvvk',
      'kyykmmmmmmmmkvvk',
      '.kkkmmmmmmmmkkk.',
      '....kkkkkkkk....'],
    price: [
      '....kkkkkkkk....',
      '...kyyyyyyyyk...',
      '..kyyYYYYYYyyk..',
      '.kyyYyyyyyyYyyk.',
      '.kyYykyykyykYyk.',
      'kyyYykyykyykYyyk',
      'kyyYkkkkkkkkYyyk',
      'kyyYykykkykyYyyk',
      'kyyYkkkkkkkkYyyk',
      'kyyYyykyykyyYyyk',
      '.kyYyykyykyyYyk.',
      '.kyyYyyyyyyYyyk.',
      '..kyyYYYYYYyyk..',
      '...kyyyyyyyyk...',
      '....kkkkkkkk....',
      '................'],
    contract: [
      '..kkkkkkkkk.....',
      '..kwwwwwwwkk....',
      '..kwkkkkkwwkk...',
      '..kwwwwwwwwwk...',
      '..kwkkkkkkwwk.kk',
      '..kwwwwwwwwwkkyk',
      '..kwkkkkkwwwkyk.',
      '..kwwwwwwwwkyk..',
      '..kwwwwwwwkykk..',
      '..kwwwwwwkykwk..',
      '..kwrrwwkkkwwk..',
      '..kwrwrwkwwwwk..',
      '..kwwwrwwwwwwk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................'],
    sneeze: [
      '................',
      '................',
      '.....kkkk.......',
      '....knnnnk......',
      '...knnnnnnk.....',
      '..kssssssssk....',
      '.ksssssssssskc..',
      '.ksskksskkssk...',
      '.kskssssssksc.c.',
      '.kssssssssssk...',
      '.ksssskksssskc.c',
      '..ksskrrkssk....',
      '...kssssssk...c.',
      '....kssssk......',
      '.....kkkk.......',
      '................'],
    clock: [
      '.....kkkkkk.....',
      '...kkwwwwwwkk...',
      '..kwwwwkwwwwwk..',
      '.kwwwwwkwwwwwwk.',
      '.kwwwwwkwwwwwwk.',
      'kwwwwwwkwwwwwwwk',
      'kwwwwwwkwwwwwwwk',
      'kwwwwwwkkkkkwwwk',
      'kwwwwwwwwwwwwwwk',
      'kwwwwwwwwwwwwwwk',
      '.kwwwwwwwwwwwwk.',
      '.kwwwwwwwwwwwwk.',
      '..kwwwwwwwwwwk..',
      '...kkwwwwwwkk...',
      '.....kkkkkk.....',
      '................'],
    heart: [
      '.kk.kk.',
      'krrkrrk',
      'krwrrrk',
      'krrrrrk',
      '.krrrk.',
      '..krk..',
      '...k...'],
    heartEmpty: [
      '.kk.kk.',
      'kggkggk',
      'kgggggk',
      'kgggggk',
      '.kgggk.',
      '..kgk..',
      '...k...'],
    sticker: [
      '.....kk.....',
      '....kyyk....',
      '....kyyk....',
      'kkkkkyykkkkk',
      'kyyyyyyyyyyk',
      '.kyyyyyyyyk.',
      '..kyyyyyyk..',
      '..kyyyyyyk..',
      '.kyyykkyyyk.',
      '.kyyk..kyyk.',
      'kyyk....kyyk',
      'kkk......kkk'],
    coffee: [
      '...k.k.k....',
      '....k.k.....',
      '..kkkkkkkk..',
      '..kwwwwwwkkk',
      '..knNNNNnk.k',
      '..knnnnnnk.k',
      '..knnnnnnkkk',
      '..kwwwwwwk..',
      '...kwwwwk...',
      '...kkkkkk...',
      '............',
      '............'],
    lunch: [
      '............',
      '.kkkkkkkkkk.',
      'krrrrrrrrrrk',
      'kRRRRRRRRRRk',
      'kkkkkkkkkkkk',
      'kwwwwkeeeyyk',
      'kwwwwkeeeyyk',
      'kwwwwkoooyyk',
      'kwwwwkoookkk',
      'kkkkkkkkkkk.',
      '............',
      '............'],
    tower: [
      '..kkkkkkkk..',
      '.kggggggggk.',
      '.kkkkkkkkkk.',
      '....knnk....',
      '..kkknnkkk..',
      '.kggggggggk.',
      '.kkkkkkkkkk.',
      '....knnk....',
      '....knnk....',
      '..kkkkkkkk..',
      '.kggggggggk.',
      '.kkkkkkkkkk.'],
    feeder: [
      '...kkkkkk...',
      '..kccccccK..',
      '..kcnncnck..',
      '..kcnnnnck..',
      '..kccccccK..',
      '..kgggggggk.',
      '..kgkrkgggk.',
      '..kgggggggk.',
      '.kkgggggggkk',
      'kwwkkkkkkkwk',
      'kwnnnnnnnnwk',
      'kkkkkkkkkkkk'],
    zzz: [
      'kkkk..',
      '..k...',
      '.k....',
      'kkkk..',
      '...kkk',
      '....k.',
      '...kkk'],
    bang: [
      '.kk.',
      'kyyk',
      'kyyk',
      'kyyk',
      '.kk.',
      '.kk.',
      'kyyk',
      '.kk.'],
    mail: [
      'kkkkkkkkkk',
      'kwxwwwwxwk',
      'kwwxwwxwwk',
      'kwwwxxwwwk',
      'kwwwwwwwwk',
      'kwwwwwwwwk',
      'kkkkkkkkkk'],
    note: [
      '...kkk',
      '...kpk',
      '...k.k',
      '...k..',
      '.kkk..',
      'kppk..',
      '.kk...'],
    drop: [
      '..k..',
      '.kck.',
      'kcxck',
      'kccck',
      '.kkk.'],
    fur: [
      '.o..o.',
      'o.oo.o',
      '.oOOo.',
      'o.oo.o',
      '.o..o.'],
    poop: [
      '...kk...',
      '..knnk..',
      '..kkkk..',
      '.knnnnk.',
      'kkkkkkkk',
      'knnnnnnk',
      '.kkkkkk.'],
    coin: [
      '..kkkk..',
      '.kyyyyk.',
      'kyyYYyyk',
      'kyYyyYyk',
      'kyYyyYyk',
      'kyyYYyyk',
      '.kyyyyk.',
      '..kkkk..'],
    bolt: [
      '...kkk',
      '..kyyk',
      '.kyyk.',
      'kyyyyk',
      '.kyyk.',
      '.kyk..',
      'kyk...',
      'kk....'],
    slot: [
      '.kkkkkk.',
      '.kwwwwk.',
      '..kwwk..',
      '...kk...',
      '...kk...',
      '..kyyk..',
      '.kyyyyk.',
      '.kkkkkk.'],
    paw: [
      '.kk..kk.',
      'kook.kook',
      '.kk..kk.',
      'k.kkkk.k',
      '.koooook',
      'koooooook',
      '.koooook.',
      '..kkkkk..'],
    charcoal: [
      '....kkkkkkkk....',
      '...kddddddddk...',
      '..kddddddddddk..',
      '..kddrrrrrrddk..',
      '..kdrwwrrwwrdk..',
      '..kdrrrrrrrrdk..',
      '..kddddddddddk..',
      '..kdkkdkkdkkdk..',
      '..kdkGkkGkkGdk..',
      '..kdkkdkkdkkdk..',
      '..kdkGkkGkkGdk..',
      '..kdkkdkkdkkdk..',
      '..kddddddddddk..',
      '..kddddddddddk..',
      '...kkkkkkkkkk...',
      '................']
  };

  G.dental = G.tooth; // 치아보험은 이 그림

  function draw(c, name, x, y, px, opts) {
    var g = G[name];
    if (!g) return false;
    px = px || 2; opts = opts || {};
    var w = g[0].length, h = g.length, ox = Math.round(x - (opts.left ? 0 : w * px / 2)), oy = Math.round(y - (opts.top ? 0 : h * px / 2));
    c.save();
    if (opts.alpha !== undefined) c.globalAlpha *= opts.alpha;
    for (var j = 0; j < h; j++) {
      var row = g[j];
      for (var i = 0; i < row.length; i++) {
        var ch = row.charAt(i);
        if (ch === '.' || ch === ' ') continue;
        var col = opts.mono && ch !== 'k' ? opts.mono : P[ch];
        if (!col) continue;
        var jx = 0, jy = 0;
        if (opts.wobble) { jx = Math.round(Math.sin(opts.wobble * 7 + j * 1.7 + i) * opts.wobbleAmp); jy = Math.round(Math.cos(opts.wobble * 5 + i * 1.3) * opts.wobbleAmp); }
        c.fillStyle = col;
        c.fillRect(ox + i * px + jx, oy + j * px + jy, px, px);
      }
    }
    c.restore();
    return true;
  }
  function size(name, px) { var g = G[name]; px = px || 2; return g ? { w: g[0].length * px, h: g.length * px } : { w: 0, h: 0 }; }

  // 고객 표정 0~4 (화남, 시무룩, 보통, 웃음, 활짝)
  function mood(c, x, y, level, r) {
    r = r || 9;
    var face = level >= 3 ? '#ffd76a' : level === 2 ? '#f4dc9a' : level === 1 ? '#e9c58f' : '#ef9a7a';
    c.save();
    c.fillStyle = P.k;
    disc(c, x, y, r + 1);
    c.fillStyle = face;
    disc(c, x, y, r);
    c.fillStyle = P.k;
    var e = Math.max(1, Math.round(r / 5));
    if (level === 0) {
      c.fillRect(x - r * .62, y - r * .45, r * .42, e); c.fillRect(x + r * .2, y - r * .45, r * .42, e);
    }
    c.fillRect(Math.round(x - r * .45), Math.round(y - r * .2), e + 1, e + 1);
    c.fillRect(Math.round(x + r * .3), Math.round(y - r * .2), e + 1, e + 1);
    var mw = Math.round(r * .9), mx = Math.round(x - mw / 2), my = Math.round(y + r * .35);
    if (level >= 3) {
      c.fillRect(mx, my - e, e, e); c.fillRect(mx + mw - e, my - e, e, e); c.fillRect(mx + e, my, mw - 2 * e, e);
      if (level === 4) { c.fillStyle = '#f39aa8'; c.fillRect(Math.round(x - r * .85), Math.round(y + r * .1), e + 1, e); c.fillRect(Math.round(x + r * .62), Math.round(y + r * .1), e + 1, e); }
    } else if (level === 2) {
      c.fillRect(mx + e, my, mw - 2 * e, e);
    } else {
      c.fillRect(mx, my + e, e, e); c.fillRect(mx + mw - e, my + e, e, e); c.fillRect(mx + e, my, mw - 2 * e, e);
    }
    c.restore();
  }
  function disc(c, x, y, r) {
    for (var yy = -r; yy <= r; yy++) {
      var xx = Math.floor(Math.sqrt(r * r - yy * yy));
      c.fillRect(Math.round(x - xx), Math.round(y + yy), xx * 2 + 1, 1);
    }
  }
  // 작은 캔버스에 그려 HTML 그림으로 쓴다 (영수증, 체력 칸 등).
  var urls = {};
  function url(name, px) {
    var key = name + ':' + (px || 2);
    if (urls[key]) return urls[key];
    if (typeof document === 'undefined') return '';
    var s = size(name, px), cv = document.createElement('canvas');
    cv.width = s.w; cv.height = s.h;
    draw(cv.getContext('2d'), name, 0, 0, px || 2, { left: true, top: true });
    urls[key] = cv.toDataURL();
    return urls[key];
  }
  return { palette: P, grids: G, draw: draw, size: size, mood: mood, disc: disc, url: url };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = PixelIcons;
