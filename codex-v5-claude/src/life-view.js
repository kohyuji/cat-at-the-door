/* 장면 그리기. 좌표는 640×360 기준이고, 캔버스는 기기 해상도에 맞춰 k배로 그린다.
   배경, 사람, 고양이, 소품은 r4 그림을 잘라 쓰고, 없는 것만 같은 그림체로 그린다. */
var View = (function () {
  'use strict';
  var W = 640, H = 360, FLOOR = 334;
  var INK = '#2f2a33';
  var CELL = {
    bedroom: ['r4Scenes', 0, 0, 836, 471], living: ['r4Scenes', 836, 0, 836, 471],
    shop: ['r4Scenes', 0, 471, 836, 470], office: ['r4Scenes', 836, 471, 836, 470],
    streetWinter: ['r4Outdoors', 0, 0, 836, 471], station: ['r4Outdoors', 836, 0, 836, 471],
    train: ['r4Outdoors', 0, 471, 836, 470], streetSpring: ['r4Outdoors', 836, 471, 836, 470]
  };
  // 방 안 물건 자리
  var L = {
    living: {
      entrance: { x: 24, y: 50, w: 86, h: 205 }, door: { x: 545, y: 54, w: 80, h: 201 },
      bag: { x: 128, y: 304 }, clock: { x: 66, y: 30 },
      foodBag: { x: 180, y: 326 }, wetCan: { x: 148, y: 326 }, bowl: { x: 222, y: 328 }, water: { x: 264, y: 328 }, bottle: { x: 298, y: 326 },
      counter: { y: 171 }, coffee: { x: 286, y: 171 }, lunch: { x: 246, y: 171 },
      sofa: { x: 380, y: 168, w: 160, h: 96 }, toy: { x: 446, y: 338 },
      litter: { x: 588, y: 346 }, scoop: { x: 626, y: 340 }, sand: { x: 540, y: 344 },
      window: { x: 386, y: 38, w: 144, h: 124 }, tower: { x: 352, y: 334 }, feeder: { x: 196, y: 300 }
    },
    bedroom: {
      door: { x: 527, y: 52, w: 89, h: 204 }, window: { x: 38, y: 37, w: 218, h: 143 },
      bed: { x: 30, y: 196, w: 174, h: 124 }, pillow: { x: 117, y: 262 },
      desk: { x: 265, y: 180, w: 148, h: 85 }, drawer: { x: 358, y: 228, w: 46, h: 30 }, cards: { x: 318, y: 179 },
      rack: { x: 418, y: 115, w: 98, h: 147 }, suit: { x: 452, y: 244 }, hoodie: { x: 488, y: 244 },
      roller: { x: 404, y: 179 }, laptop: { x: 300, y: 179 }, charger: { x: 352, y: 179 }, bag: { x: 236, y: 336 }
    }
  };
  var mem = { tint: {}, scene: {} };

  function r(c, x, y, w, h, col) { if (w <= 0 || h <= 0) return; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function box(c, x, y, w, h, fill, line, t) { t = t || 2; r(c, x, y, w, h, line || INK); r(c, x + t, y + t, w - 2 * t, h - 2 * t, fill); }
  function poly(c, pts, col) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill(); }
  function disc(c, x, y, rad, col) { c.fillStyle = col; PixelIcons.disc(c, Math.round(x), Math.round(y), Math.round(rad)); }
  function text(c, s, x, y, size, col, align, base) {
    c.fillStyle = col || INK; c.font = (size || 12) + "px 'NeoDunggeunmo', monospace";
    c.textAlign = align || 'center'; c.textBaseline = base || 'middle'; c.fillText(s, x, y);
  }
  function ready(im) { return !!(im && im.complete !== false && (im.naturalWidth || im.width)); }
  function img(G, key) { var im = G.images && G.images[key]; return ready(im) ? im : null; }

  // ---------- 배경 ----------
  function bg(c, G, name, crop) {
    var cell = CELL[name], im = img(G, cell[0]);
    if (!im) { r(c, 0, 0, W, H, '#d9d2c6'); r(c, 0, 255, W, 105, '#a98a6c'); return false; }
    var sx = (im.naturalWidth || im.width) / 1672, sy = (im.naturalHeight || im.height) / 941;
    var x = cell[1], y = cell[2], w = cell[3], h = cell[4];
    if (crop) { x += crop[0] * w / W; y += crop[1] * h / H; w = crop[2] * w / W; h = crop[3] * h / H; }
    c.drawImage(im, x * sx, y * sy, w * sx, h * sy, 0, 0, W, H);
    return true;
  }
  // 다른 방 그림을 문틈 속에 넣는다 (문 너머가 실제 옆방으로 보이게)
  function sceneInto(c, G, name, crop, x, y, w, h) {
    var cell = CELL[name], im = img(G, cell[0]);
    if (!im) { r(c, x, y, w, h, '#b9b3aa'); return; }
    var sx = (im.naturalWidth || im.width) / 1672, sy = (im.naturalHeight || im.height) / 941;
    c.drawImage(im, (cell[1] + crop[0] * cell[3] / W) * sx, (cell[2] + crop[1] * cell[4] / H) * sy, crop[2] * cell[3] / W * sx, crop[3] * cell[4] / H * sy, x, y, w, h);
  }

  // ---------- 그림 자르기 ----------
  function cut(c, im, a, x, y, w, h, flip) {
    c.save(); c.imageSmoothingEnabled = false;
    c.translate(Math.round(x), Math.round(y)); if (flip) c.scale(-1, 1);
    c.drawImage(im, a[0], a[1], a[2], a[3], Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h));
    c.restore();
  }
  function rgb2hsl(r0, g0, b0) {
    var r1 = r0 / 255, g1 = g0 / 255, b1 = b0 / 255, mx = Math.max(r1, g1, b1), mn = Math.min(r1, g1, b1), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r1 ? (g1 - b1) / d + (g1 < b1 ? 6 : 0) : mx === g1 ? (b1 - r1) / d + 2 : (r1 - g1) / d + 4; h *= 60; }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    function f(n) { var k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }
    return [f(0), f(8), f(4)];
  }
  var BASE_HUE = { customerA: 32, customerB: 6, customerC: 214 };
  // 고객 옷 색만 바꾼 그림을 만들어 둔다. 얼굴, 손, 바지, 흰 셔츠는 그대로다.
  function tinted(im, a, look, hue, topFrac) {
    var key = (im.src || im.currentSrc || 'x').slice(-30) + a.join(',') + look + hue;
    if (mem.tint[key]) return mem.tint[key];
    if (typeof document === 'undefined') return null;
    var cv = document.createElement('canvas'); cv.width = a[2]; cv.height = a[3];
    var g = cv.getContext('2d'); g.drawImage(im, a[0], a[1], a[2], a[3], 0, 0, a[2], a[3]);
    try {
      var d = g.getImageData(0, 0, a[2], a[3]), p = d.data, base = BASE_HUE[look], top = Math.round(a[3] * (topFrac || .36));
      for (var y = top; y < a[3]; y++) for (var x = 0; x < a[2]; x++) {
        var i = (y * a[2] + x) * 4; if (p[i + 3] < 10) continue;
        var hsl = rgb2hsl(p[i], p[i + 1], p[i + 2]), dh = Math.abs(((hsl[0] - base + 540) % 360) - 180);
        if (hsl[1] < .16 || hsl[2] > .7 || hsl[2] < .08 || dh > 34) continue;
        var nh = (hue + (hsl[0] - base) + 360) % 360, rgb = hsl2rgb(nh, Math.min(1, hsl[1] * 1.05), hsl[2]);
        p[i] = rgb[0]; p[i + 1] = rgb[1]; p[i + 2] = rgb[2];
      }
      g.putImageData(d, 0, 0);
    } catch (e) { /* 파일로 열어 픽셀을 못 읽으면 원래 색 그대로 */ }
    mem.tint[key] = cv;
    return cv;
  }
  var PEOPLE_INDEX = { customerA: 26, customerB: 27, customerC: 28, lead: 24, peer: 25 };
  var SEATED_INDEX = { customerA: 4, customerB: 5, customerC: 6, peer: 7, lead: 15 };
  // 사람: 서기, 걷기, 쪼그리기 등. scale은 r4 기본 크기의 배수.
  function person(c, G, x, y, variant, dir, t, pose, scale, hue) {
    scale = scale || 2.15;
    var A = PixelArt.atlas, im;
    if ((variant === 'customerA' || variant === 'customerB' || variant === 'customerC') && hue !== undefined && hue !== null && (im = img(G, 'r4People'))) {
      var a = A.people[pose === 'sit' ? (variant === 'customerB' ? 30 : variant === 'customerC' ? 31 : 29) : PEOPLE_INDEX[variant]];
      var cv = tinted(im, a, variant, hue);
      if (cv) { cut(c, cv, [0, 0, a[2], a[3]], x, y, a[2] * .28 * scale, a[3] * .28 * scale, dir > 0 ? false : true); return; }
    }
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(scale, scale);
    PixelArt.person(c, 0, 0, variant, dir, t, pose);
    c.restore();
  }
  // 의자에 앉은 사람 (상담). me: 0~3 정장, 8~11 후드티
  function seated(c, G, x, y, variant, frame, scale, hue, dir) {
    var im = img(G, 'r4Seated'); if (!im) return;
    var A = PixelArt.atlas.seated, idx = variant === 'suit' ? frame : variant === 'hoodie' ? 8 + frame : SEATED_INDEX[variant];
    var a = A[idx], w = a[2] * .178 * scale, h = a[3] * .178 * scale;
    if (hue !== undefined && hue !== null && BASE_HUE[variant] !== undefined) {
      var cv = tinted(im, a, variant, hue, .34);
      if (cv) { cut(c, cv, [0, 0, a[2], a[3]], x, y, w, h, !!dir); return; }
    }
    cut(c, im, a, x, y, w, h, !!dir);
  }
  function portrait(c, G, variant, x, y, w, h, hue) {
    var map = { me: 0, hoodie: 0, suit: 1, lead: 2, peer: 3, customerA: 4, customerB: 5, customerC: 6, cat: 7 };
    var base = img(G, 'r4PortraitBase') || img(G, 'r4Portraits');
    if (!base) return false;
    var i = map[variant] === undefined ? 0 : map[variant], cw = (base.naturalWidth || base.width) / 4, ch = (base.naturalHeight || base.height) / 2;
    var sq = Math.min(cw, ch), a = [(i % 4) * cw, Math.floor(i / 4) * ch + (ch - sq) * .35, cw, sq];
    c.save(); c.imageSmoothingEnabled = false;
    if (hue !== undefined && hue !== null && BASE_HUE[variant] !== undefined) {
      var cv = tinted(base, a, variant, hue, .72);
      if (cv) { c.drawImage(cv, x, y, w, h); c.restore(); return true; }
    }
    c.drawImage(base, a[0], a[1], a[2], a[3], x, y, w, h);
    var cords = img(G, 'r4Portraits');
    if (i === 0 && cords && cords !== base) {
      // 승인된 얼굴은 그대로 두고, 후드티 끈을 고친 아래쪽만 덮는다
      var split = ch * 330 / 512, top = split - a[1];
      if (top > 0 && top < sq) c.drawImage(cords, a[0], split, a[2], sq - top, x, y + h * top / sq, w, h * (sq - top) / sq);
    }
    c.restore();
    return true;
  }
  function cat(c, G, x, y, dir, t, pose, scale) {
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(scale || 1.6, scale || 1.6);
    PixelArt.cat(c, 0, 0, dir, t, pose);
    c.restore();
  }
  function item(c, type, x, y, scale) { PixelArt.item(c, type, x, y, scale || 1); }
  function icon(c, name, x, y, px, opts) { PixelIcons.draw(c, name, x, y, px || 2, opts); }
  function shadow(c, x, y, w) { c.fillStyle = 'rgba(30,24,30,.18)'; c.beginPath(); c.ellipse(x, y, w, Math.max(2, w * .18), 0, 0, Math.PI * 2); c.fill(); }

  // ---------- 소품 ----------
  function wallClock(c, x, y, rad, minute, dueMinute) {
    disc(c, x, y, rad + 2, INK); disc(c, x, y, rad, '#fffaf0');
    for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; r(c, x + Math.sin(a) * (rad - 3) - .5, y - Math.cos(a) * (rad - 3) - .5, 1.4, 1.4, '#8a8f98'); }
    if (dueMinute) { var da = (dueMinute % 720) / 720 * Math.PI * 2; c.strokeStyle = '#e0574f'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x + Math.sin(da) * (rad - 4), y - Math.cos(da) * (rad - 4)); c.lineTo(x + Math.sin(da) * (rad + .5), y - Math.cos(da) * (rad + .5)); c.stroke(); }
    var h = (minute / 60) % 12, m = minute % 60;
    c.strokeStyle = INK; c.lineCap = 'round';
    c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(h / 12 * Math.PI * 2) * rad * .5, y - Math.cos(h / 12 * Math.PI * 2) * rad * .5); c.stroke();
    c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(m / 60 * Math.PI * 2) * rad * .78, y - Math.cos(m / 60 * Math.PI * 2) * rad * .78); c.stroke();
    disc(c, x, y, 1.5, INK);
  }
  // 저녁 칸 시계: 남은 칸을 조각으로 보여 준다
  function slotClock(c, x, y, rad, used, total) {
    disc(c, x, y, rad + 2, INK); disc(c, x, y, rad, '#fffaf0');
    for (var i = 0; i < total; i++) {
      var a0 = -Math.PI / 2 + i / total * Math.PI * 2, a1 = -Math.PI / 2 + (i + 1) / total * Math.PI * 2;
      c.fillStyle = i < used ? '#c9c2b6' : '#ffb05a';
      c.beginPath(); c.moveTo(x, y); c.arc(x, y, rad - 2, a0 + .06, a1 - .06); c.closePath(); c.fill();
    }
    disc(c, x, y, 2, INK);
  }
  function bowl(c, x, y, state, kind, t) {
    item(c, state === 'empty' ? 'bowlEmpty' : 'bowlFull', x, y, 1.15);
    if (state === 'ate') { r(c, x - 9, y - 9, 18, 4, '#f4f1ea'); r(c, x - 5, y - 9, 3, 2, '#8b5a33'); r(c, x + 3, y - 8, 2, 2, '#8b5a33'); }
    if (state === 'full' && kind === 'wet') { r(c, x - 10, y - 11, 20, 4, '#c9705a'); r(c, x - 6, y - 12, 12, 2, '#e08a6c'); }
  }
  function waterBowl(c, x, y, level) {
    item(c, 'water', x, y, 1.15);
    if (level < .99) { // 물이 줄어든 만큼 위를 비운다
      var cut = Math.round((1 - level) * 7);
      r(c, x - 13, y - 12, 26, cut, '#3e5e8c'); r(c, x - 12, y - 12, 24, cut, level < .1 ? '#cfd6e3' : '#5e86c4');
      if (level < .1) { r(c, x - 9, y - 9, 18, 2, '#e2e7ef'); }
    }
  }
  function litterBox(c, x, y, poop, sand, t) {
    item(c, poop > 0 || sand <= 0 ? 'litterDirty' : 'litterTray', x, y, 1.05);
    if (sand <= 0) { r(c, x - 22, y - 18, 44, 6, '#7b7f87'); }
    if (poop >= 2) { // 냄새 줄
      for (var i = 0; i < 3; i++) {
        var ph = (t * 1.2 + i * .33) % 1, xx = x - 10 + i * 10 + Math.sin((t + i) * 4) * 2;
        c.globalAlpha = Math.max(0, .8 - ph * .8); r(c, xx, y - 26 - ph * 18, 2, 6, '#8aa16a'); r(c, xx + 2, y - 31 - ph * 18, 2, 5, '#8aa16a'); c.globalAlpha = 1;
      }
    }
  }
  function foodBag(c, x, y, meals, max, tilt, scale) {
    c.save(); c.translate(x, y); if (tilt) c.rotate(tilt);
    item(c, 'foodBag', 0, 0, 1.15 * (scale || 1));
    c.restore();
    if (meals !== undefined && !tilt) { // 남은 끼니 칸
      for (var i = 0; i < 8; i++) r(c, x - 13 + i * 3.4, y + 3, 2.4, 3, i < meals ? '#a9744a' : '#d8cfc0');
    }
  }
  function bag(c, x, y, scale) { item(c, 'briefcase', x, y, scale || 1.15); }
  function hangerSuit(c, x, y, fur, t) {
    item(c, 'suit', x, y, 1.55);
    if (fur > 0) {
      var spots = [[-10, -36], [6, -30], [-4, -22], [9, -14], [-12, -12], [2, -40], [-7, -6], [11, -26], [0, -16]];
      for (var i = 0; i < Math.min(spots.length, fur * 3); i++) icon(c, 'fur', x + spots[i][0], y + spots[i][1], 1);
    }
  }
  function bed(c, G, sleeping, catOn, t, made) {
    var b = L.bedroom.bed, x = b.x, y = b.y;
    // 머리판, 매트리스, 베개, 이불, 앞 프레임 순서로 한 침대만 그린다
    box(c, x + 16, y, b.w - 32, 58, '#b98a5f', '#5b4636', 3); r(c, x + 24, y + 8, b.w - 48, 42, '#c99b6c'); r(c, x + 24, y + 8, b.w - 48, 4, '#ddb487');
    poly(c, [[x + 10, y + 54], [x + b.w - 10, y + 54], [x + b.w, y + 98], [x, y + 98]], '#f2ece0');
    item(c, 'pillow', L.bedroom.pillow.x, L.bedroom.pillow.y + 6, 1.6);
    if (sleeping) person(c, G, L.bedroom.pillow.x, L.bedroom.pillow.y + 18, 'hoodie', 1, t, 'bedSleep', 1.5);
    var top = sleeping ? y + 70 : made ? y + 74 : y + 72;
    poly(c, [[x + 6, top], [x + b.w - 6, top], [x + b.w + 2, y + 100], [x - 2, y + 100]], '#5f86ad');
    for (var i = 0; i < 7; i++) { var fx = x + 14 + i * 24; poly(c, [[fx, top + 1], [fx + 3, top + 1], [fx + 4 + (fx - x - b.w / 2) * .06, y + 99], [fx + 1 + (fx - x - b.w / 2) * .06, y + 99]], '#88a9c9'); }
    r(c, x + 2, top + 13, b.w - 4, 2, '#88a9c9'); r(c, x, top + 23, b.w, 2, '#88a9c9');
    r(c, x + 4, top, b.w - 8, 3, '#9cbad6');
    box(c, x - 4, y + 98, b.w + 8, 16, '#a97c55', '#5b4636', 3); r(c, x + 2, y + 101, b.w - 4, 3, '#c49a6e');
    r(c, x + 2, y + 114, 7, 9, '#5b4636'); r(c, x + b.w - 9, y + 114, 7, 9, '#5b4636');
    if (catOn) cat(c, G, x + 132, top + 10, -1, t, 'sleep', 1.4);
  }
  // 방문: 경첩은 왼쪽, 손잡이는 오른쪽. 열수록 문짝이 경첩 쪽으로 접힌다 (끄는 방향 = 문이 움직이는 방향)
  function roomDoor(c, G, d, open, beyond, crop, night) {
    var x = d.x, y = d.y, w = d.w, h = d.h;
    box(c, x - 4, y - 4, w + 8, h + 6, '#efe9df', '#6f6258', 3);
    r(c, x, y, w, h, '#4a4440');
    sceneInto(c, G, beyond, crop, x + 2, y + 2, w - 4, h - 2);
    if (night) { c.fillStyle = 'rgba(20,26,52,.55)'; c.fillRect(x + 2, y + 2, w - 4, h - 2); }
    var a = Math.max(0, Math.min(1, open)), lw = Math.max(10, Math.round(w * (1 - a * .84))), sag = Math.round(a * 14);
    // 문짝
    poly(c, [[x, y], [x + lw, y + sag], [x + lw, y + h - sag * .6], [x, y + h]], '#6f6258');
    poly(c, [[x + 2, y + 2], [x + lw - 2, y + sag + 2], [x + lw - 2, y + h - sag * .6 - 1], [x + 2, y + h - 1]], '#f4efe6');
    if (lw > 34) {
      var px = x + 10, pw = lw - 20;
      box(c, px, y + 18 + sag * .5, pw, h * .34, '#ece5d8', '#cfc4b3', 2);
      box(c, px, y + h * .54, pw, h * .34 - sag * .4, '#ece5d8', '#cfc4b3', 2);
    }
    var hx = x + lw - 9, hy = y + h * .52;
    r(c, hx - 1, hy - 5, 5, 12, '#6f6258'); r(c, hx - 9, hy - 1, 12, 4, '#6f6258'); r(c, hx - 8, hy, 10, 2, '#d8d0c4');
    r(c, x, y + h - 2, w, 3, '#6f6258');
    return { hx: hx, hy: hy, lw: lw };
  }
  function entranceDoor(c, d, opening) {
    var x = d.x, y = d.y, w = d.w, h = d.h;
    box(c, x - 4, y - 4, w + 8, h + 6, '#d7d9dc', '#4f5660', 3);
    if (opening > 0) { r(c, x, y, w, h, '#f4eedf'); r(c, x, y + h * .75, w, h * .25, '#c9c3b2'); }
    var lw = Math.round(w * (1 - (opening || 0) * .8));
    box(c, x, y, lw, h, '#7d8a97', '#4f5660', 2);
    if (lw > 40) {
      box(c, x + 9, y + 14, lw - 18, h * .4, '#8896a3', '#66727e', 2); box(c, x + 9, y + h * .5, lw - 18, h * .42, '#8896a3', '#66727e', 2);
      disc(c, x + lw / 2, y + 44, 3, '#2f3640'); disc(c, x + lw / 2, y + 44, 1.5, '#a9c2cf');
      r(c, x + lw - 16, y + h * .48, 4, 14, '#3e454e'); r(c, x + lw - 26, y + h * .48 + 2, 14, 4, '#c7ccd2');
      box(c, x + lw - 22, y + h * .36, 12, 16, '#2c3138', '#2c3138', 1); r(c, x + lw - 20, y + h * .36 + 3, 8, 4, '#5fb38d');
    }
    // 현관 바닥과 신발
    poly(c, [[x - 6, y + h + 2], [x + w + 6, y + h + 2], [x + w + 22, y + h + 30], [x - 22, y + h + 30]], '#b9b6ae');
    for (var i = 0; i < 4; i++) r(c, x - 14 + i * 2, y + h + 9 + i * 6, w + 28 - i * 4, 1, '#a19d94');
  }
  function windowView(c, G, win, mode, t, curtain, storm) {
    var x = win.x, y = win.y, w = win.w, h = win.h, gx = x + 12, gy = y + 10, gw = w - 24, gh = h - 20;
    var sky = mode === 'night' ? '#2c3f63' : mode === 'dusk' ? '#e9a98e' : mode === 'storm' ? '#38506a' : mode === 'winter' ? '#8fa3b8' : '#b9d4e6';
    box(c, gx - 4, gy - 4, gw + 8, gh + 8, '#f1ece3', '#7b8896', 3);
    r(c, gx, gy, gw, gh, sky);
    var lit = mode === 'night' || mode === 'storm' || mode === 'dusk';
    for (var b = 0; b < 6; b++) {
      var bx = gx + b * gw / 6 + 2, bh = 18 + ((b * 37) % 5) * 7;
      r(c, bx, gy + gh - bh, gw / 6 - 4, bh, lit ? '#22324e' : mode === 'winter' ? '#7a8797' : '#8fa6b8');
      for (var wi = 0; wi < 3; wi++) for (var wj = 0; wj < Math.floor(bh / 12); wj++) if ((b + wi + wj) % 3) r(c, bx + 3 + wi * 6, gy + gh - bh + 4 + wj * 10, 3, 4, lit ? '#e8d48f' : '#d9e6ee');
    }
    if (mode === 'day') { r(c, gx + 16, gy + 14, 22, 4, '#f6fbff'); r(c, gx + 22, gy + 10, 12, 4, '#f6fbff'); }
    if (mode === 'night') { r(c, gx + gw - 24, gy + 10, 6, 6, '#f5ecc2'); }
    if (mode === 'winter') for (var s = 0; s < 18; s++) { var sx = gx + ((s * 53 + t * 18) % gw), sy = gy + ((s * 29 + t * 30) % gh); r(c, sx, sy, 2, 2, '#ffffff'); }
    if (storm) { PixelArt.rain(c, { x: gx, y: gy, w: gw, h: gh }, t, 1.2); if (G.flash > 0) { c.fillStyle = 'rgba(235,245,255,' + Math.min(.85, G.flash * 2.5) + ')'; c.fillRect(gx, gy, gw, gh); } }
    r(c, gx + gw / 2 - 1, gy, 3, gh, '#7b8896');
    // 커튼: curtain 0(걷힘) ~ 1(닫힘)
    var cw = 16 + (gw / 2 + 4 - 16) * (curtain || 0), sway = Math.round(Math.sin(t * 2.4) * (storm ? 3 : 1.2) * (1 - (curtain || 0)));
    for (var side = 0; side < 2; side++) {
      var cx0 = side ? x + w - cw + 4 - sway : x - 4 + sway;
      r(c, cx0, y - 2, cw, h + 6, '#efe6dc');
      for (var k = 5; k < cw - 2; k += 7) r(c, cx0 + k, y + 1, 2, h + 2, '#d9cdc0');
      r(c, cx0, y + h, cw, 4, '#cdbfae');
    }
    r(c, x - 8, y - 6, w + 16, 4, '#6f6258');
  }
  function toy(c, x, y, t, held) { item(c, 'toy', x, y, held ? 1.25 : 1.1); }
  function card(c, G, id, x, y, flipped, scale) {
    scale = scale || 1;
    var cl = Story.CLIENT[id], info = Life.CLIENTS[id], w = 44 * scale, h = 58 * scale;
    c.save(); c.translate(Math.round(x - w / 2), Math.round(y - h));
    box(c, 0, 0, w, h, '#fffaf0', INK, 2);
    r(c, 2, 2, w - 4, 10 * scale, info.mark === 'sneeze' ? '#9fd8c9' : info.mark === 'cat' ? '#f6c48e' : info.mark === 'clock' ? '#c9d3ef' : '#e7dfcf');
    if (flipped) {
      icon(c, info.need, w / 2, h * .52, Math.max(1, Math.round(1.6 * scale)));
      text(c, Story.PRODUCT[info.need], w / 2, h - 7 * scale, Math.round(8 * scale));
    } else {
      portrait(c, G, cl.look, 5 * scale, 13 * scale, w - 10 * scale, (w - 10 * scale) * 1.15, cl.tint);
      if (info.mark !== 'none') { box(c, w - 18 * scale, h - 18 * scale, 16 * scale, 16 * scale, '#fffaf0', INK, 1.5); icon(c, info.mark === 'cat' ? 'pet' : info.mark, w - 10 * scale, h - 10 * scale, Math.max(.75, .75 * scale)); }
    }
    c.restore();
  }
  function brochure(c, kind, x, y, scale, opts) {
    opts = opts || {}; scale = scale || 1;
    var w = 46 * scale, h = 58 * scale, col = { dental: '#9fd8c9', car: '#a9c6ec', travel: '#bfe3f5', home: '#f4b9a8', pet: '#f6c48e', group: '#cfe3a8', price: '#fff2b8', contract: '#f3f0e6' }[kind] || '#eee';
    c.save(); c.translate(Math.round(x - w / 2), Math.round(y - h / 2));
    if (opts.lift) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(4, 6, w, h); }
    box(c, 0, 0, w, h, col, INK, 2);
    r(c, 2, 2, w - 4, 4 * scale, 'rgba(255,255,255,.55)');
    var ic = kind === 'price' ? 'price' : kind === 'contract' ? 'contract' : kind;
    icon(c, ic, w / 2, h * .44, Math.max(1, Math.round(1.7 * scale)), { wobble: opts.blur ? opts.t : 0, wobbleAmp: opts.blur ? 1.4 * scale : 0, alpha: opts.blur ? .65 : 1 });
    text(c, Story.SHORT[kind], w / 2, h - 9 * scale, Math.round(9 * scale), INK);
    if (opts.top) { r(c, 0, -4 * scale, w, 3 * scale, '#ff8a3d'); }
    c.restore();
  }
  function bubble(c, x, y, w, h, tailX) {
    box(c, x, y, w, h, '#fffaf0', INK, 3);
    poly(c, [[tailX - 8, y + h - 3], [tailX + 8, y + h - 3], [tailX + 2, y + h + 14]], INK);
    poly(c, [[tailX - 4, y + h - 3], [tailX + 4, y + h - 3], [tailX + 1, y + h + 8]], '#fffaf0');
  }
  function priceTag(c, x, y, price, red) {
    var s = Life.won(price).replace('원', ''), w = Math.max(30, s.length * 6 + 10);
    r(c, x - 1, y - 4, 2, 5, '#7b6b5a');
    box(c, x - w / 2, y, w, 15, red ? '#ffd9d2' : '#fffdf2', INK, 1.5);
    text(c, s, x, y + 8, 11, red ? '#c0392b' : INK);
  }
  function catTower(c, x, y, scale) {
    scale = scale || 1; c.save(); c.translate(x, y); c.scale(scale, scale);
    box(c, -26, -6, 52, 8, '#d9c9b0', INK, 2);
    r(c, -4, -70, 8, 64, '#c9a46f'); for (var i = -66; i < -8; i += 5) r(c, -4, i, 8, 1, '#a9844f');
    box(c, -22, -76, 30, 8, '#cdbba2', INK, 2); box(c, -6, -46, 30, 8, '#cdbba2', INK, 2);
    box(c, -18, -100, 24, 22, '#cdbba2', INK, 2); r(c, -12, -94, 12, 12, '#8a6f52');
    c.restore();
  }
  function feeder(c, x, y, scale) {
    scale = scale || 1; c.save(); c.translate(x, y); c.scale(scale, scale);
    box(c, -13, -44, 26, 22, '#bfe0f0', INK, 2); r(c, -9, -36, 18, 11, '#a7744a');
    box(c, -15, -24, 30, 20, '#eceff1', INK, 2); r(c, -4, -18, 3, 3, '#e0574f'); r(c, 3, -18, 5, 2, '#7d8a97');
    box(c, -17, -6, 34, 7, '#fffaf0', INK, 2); r(c, -12, -6, 24, 3, '#a7744a');
    c.restore();
  }
  // 실적 그래프 (지점 벽, 크게 볼 때 big)
  function chart(c, x, y, w, h, s, big, glow) {
    box(c, x, y, w, h, '#fffdf4', INK, big ? 3 : 2);
    var names = ['나', '선배', '동기A', '동기B'], others = [11, 6, 7];
    var day = s ? s.day : 0, vals = [s ? s.contracts : 0].concat(others.map(function (v) { return Math.min(v, Math.round(v * Math.min(1, (day + 1) / 12))); }));
    var top = y + (big ? 34 : 9), bottom = y + h - (big ? 26 : 8), max = 14, bw = (w - (big ? 60 : 16)) / 4;
    if (big) text(c, '수습 실적', x + w / 2, y + 16, 16);
    var gy = bottom - (bottom - top) * Life.GOAL / max;
    for (var i = 0; i < 4; i++) {
      var bx = x + (big ? 40 : 10) + i * bw, v = vals[i], bh = (bottom - top) * Math.min(v, max) / max;
      r(c, bx, bottom - bh, bw * .62, bh, i === 0 ? '#ffd37a' : '#cfd6de');
      if (i === 0) for (var k = 0; k < v && k < max; k++) icon(c, 'sticker', bx + bw * .31, bottom - (k + .5) * (bottom - top) / max, big ? 1.2 : .5);
      if (big) text(c, names[i], bx + bw * .31, bottom + 12, 12);
    }
    c.strokeStyle = '#e0574f'; c.lineWidth = big ? 2 : 1; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(x + 4, gy); c.lineTo(x + w - 4, gy); c.stroke(); c.setLineDash([]);
    if (big) text(c, '목표 8건', x + 24, gy - 8, 11, '#c0392b');
    if (glow) { c.strokeStyle = 'rgba(255,138,61,' + (.5 + .5 * Math.sin(glow * 6)) + ')'; c.lineWidth = 3; c.strokeRect(x - 3, y - 3, w + 6, h + 6); }
  }
  function charcoal(c, x, y, scale) { icon(c, 'charcoal', x, y - 16 * scale, 2 * scale); }
  function cup(c, x, y, scale) { icon(c, 'coffee', x, y - 12 * scale, 2 * scale); }
  function lunchbox(c, x, y, scale) { icon(c, 'lunch', x, y - 12 * scale, 2 * scale); }
  function sandBag(c, x, y, scale) { item(c, 'litterBag', x, y, scale || 1); }

  // ---------- 안내 ----------
  function arrow(c, x, y, t, dir) {
    // 막대와 머리를 한 덩어리로: 굵은 외곽선 + 밝은 주황
    var bob = Math.round(Math.sin(t * 6) * 4);
    c.save(); c.translate(Math.round(x), Math.round(y + bob)); if (dir === 'up') c.rotate(Math.PI); if (dir === 'left') c.rotate(Math.PI / 2); if (dir === 'right') c.rotate(-Math.PI / 2);
    var pts = [[-6, -30], [6, -30], [6, -14], [15, -14], [0, 0], [-15, -14], [-6, -14]];
    poly(c, pts.map(function (p) { return [p[0] * 1.25, p[1] * 1.25 - 2]; }), INK);
    poly(c, pts, '#ff8a3d');
    poly(c, [[-3, -27], [0, -27], [0, -15], [-3, -15]], '#ffc08f');
    c.restore();
  }
  function ghostHand(c, G, x, y, press, t) {
    var im = img(G, 'r4Actions'); if (!im) return;
    var a = PixelArt.atlas.actions[press ? 9 : 10];
    c.save(); c.globalAlpha = .82;
    cut(c, im, a, x + 18, y + 22, 40, 40 * a[3] / a[2], false);
    if (press) { c.strokeStyle = 'rgba(255,138,61,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 8 + Math.sin(t * 10) * 2, 0, Math.PI * 2); c.stroke(); }
    c.restore();
  }
  function outline(c, sp, t) {
    var pad = 3, a = .55 + .45 * Math.sin(t * 5);
    c.save(); c.strokeStyle = 'rgba(255,138,61,' + a + ')'; c.lineWidth = 2.5; c.setLineDash([6, 4]); c.lineDashOffset = -t * 20;
    c.strokeRect(sp.x - pad, sp.y - pad, sp.w + pad * 2, sp.h + pad * 2); c.restore();
  }
  function fx(c, G) {
    var t = G.t;
    G.fx = G.fx.filter(function (f) { return t - f.t0 < (f.life || 1.2); });
    G.fx.forEach(function (f) {
      var q = (t - f.t0) / (f.life || 1.2), y = f.y - q * (f.rise === undefined ? 22 : f.rise);
      c.save(); c.globalAlpha = q < .8 ? 1 : (1 - q) / .2;
      if (f.icon) icon(c, f.icon, f.x, y, f.px || 2);
      if (f.text) { text(c, f.text, f.x + (f.icon ? 16 : 0), y, f.size || 13, '#fff', 'left'); text(c, f.text, f.x + (f.icon ? 15 : -1), y - 1, f.size || 13, f.col || INK, 'left'); }
      if (f.kibble) for (var i = 0; i < 6; i++) r(c, f.x + Math.sin(i * 2.1) * 6, f.y + q * 20 + i * 2, 3, 3, '#8b5a33');
      if (f.splash) for (var k = 0; k < 5; k++) r(c, f.x + Math.sin(k * 1.7 + q) * 7, f.y + q * 16 + k * 2, 2, 3, '#7fb3e8');
      c.restore();
    });
  }
  function tint(c, col) { c.fillStyle = col; c.fillRect(0, 0, W, H); }
  function nightTint(c, amount) { c.fillStyle = 'rgba(16,22,48,' + (amount || .5) + ')'; c.fillRect(0, 0, W, H); }
  function lampGlow(c, x, y, rad, a) {
    var g = c.createRadialGradient(x, y, 4, x, y, rad); g.addColorStop(0, 'rgba(255,214,140,' + (a || .35) + ')'); g.addColorStop(1, 'rgba(255,214,140,0)');
    c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  return {
    W: W, H: H, FLOOR: FLOOR, L: L, CELL: CELL, r: r, box: box, poly: poly, disc: disc, text: text, img: img,
    bg: bg, sceneInto: sceneInto, cut: cut, tinted: tinted, person: person, seated: seated, portrait: portrait, cat: cat, item: item, icon: icon, shadow: shadow,
    wallClock: wallClock, slotClock: slotClock, bowl: bowl, waterBowl: waterBowl, litterBox: litterBox, foodBag: foodBag, bag: bag, hangerSuit: hangerSuit,
    bed: bed, roomDoor: roomDoor, entranceDoor: entranceDoor, windowView: windowView, toy: toy, card: card, brochure: brochure, bubble: bubble,
    priceTag: priceTag, catTower: catTower, feeder: feeder, chart: chart, charcoal: charcoal, cup: cup, lunchbox: lunchbox, sandBag: sandBag,
    arrow: arrow, ghostHand: ghostHand, outline: outline, fx: fx, tint: tint, nightTint: nightTint, lampGlow: lampGlow
  };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = View;
