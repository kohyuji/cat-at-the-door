/* 캔버스, 그림 불러오기, 매 프레임 그리기, 누르기와 끌기, 주인공과 고양이 움직임.
   장면마다 그릴 것(draw), 누를 수 있는 곳(hot), 매 프레임 할 일(tick)을 G에 꽂아 쓴다. */
var G = {
  s: null, pro: null, t: 0, dt: 0, last: 0, images: {}, k: 2, cssW: 640, cssH: 360,
  place: 'title', draw: null, hotFn: null, tick: null, walk: null,
  hero: { x: 300, y: 334, dir: 1, tx: null, look: 'hoodie', pose: null, visible: true, speed: 170, scale: 2.35 },
  cat: { x: 420, y: 334, dir: -1, pose: 'sit', tx: null, ty: null, visible: true, speed: 110, scale: 1.75, act: null, until: 0, room: 'living' },
  fx: [], flash: 0, fade: 0, hot: [], hover: null, drag: null, press: null, guide: null, hand: null, acting: 0,
  hudShow: { date: false, clock: false, wallet: false, food: false, energy: false, hearts: false },
  outlineAll: false, pointerType: 'mouse'
};
var Engine = (function () {
  'use strict';
  var W = 640, H = 360, cv, c, arrivals = [], catArrivals = [], fades = [];
  function $(id) { return document.getElementById(id); }

  // ---------- 그림 ----------
  function loadAssets() {
    var urls = window.__LIFE_ASSETS || PixelArt.assetSources;
    var keys = Object.keys(urls);
    return Promise.all(keys.map(function (k) {
      return new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () { G.images[k] = im; resolve(); };
        im.onerror = function () { resolve(); };
        im.src = urls[k];
      });
    })).then(function () {
      PixelArt.setImages(G.images);
      return document.fonts && document.fonts.load ? document.fonts.load("16px 'NeoDunggeunmo'").catch(function () {}) : null;
    });
  }

  // ---------- 캔버스 크기 ----------
  function resize() {
    var wrap = $('stageWrap'); if (!wrap || !cv) return;
    var portrait = window.innerWidth <= 720 && window.innerHeight > window.innerWidth;
    var aw = wrap.clientWidth, ah = wrap.clientHeight, w, h;
    if (portrait) { w = aw - 12; h = w * 9 / 16; }
    else { w = Math.min(aw, ah * 16 / 9); h = w * 9 / 16; }
    w = Math.max(160, Math.floor(w)); h = Math.floor(w * 9 / 16);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    G.k = cv.width / W; G.cssW = w; G.cssH = h;
    document.documentElement.style.setProperty('--stage-h', (h + 6) + 'px');
    UI.placePointer();
  }

  // ---------- 좌표 ----------
  function toLogical(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function toStage(x, y) { return { x: cv.offsetLeft + x * G.cssW / W, y: cv.offsetTop + y * G.cssH / H }; }
  function inside(p, s) { return p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h; }
  function hit(p) {
    for (var i = G.hot.length - 1; i >= 0; i--) if (!G.hot[i].off && inside(p, G.hot[i])) return G.hot[i];
    return null;
  }
  function blocked() { return UI.busy() || G.acting > 0 || G.fade > .4; }

  // ---------- 누르기와 끌기 ----------
  // 행동 하나(누른 곳으로 걸어가서 하는 일)는 한 번에 하나만 한다.
  // 다만 그곳으로 걸어가는 동안에 다른 곳을 누르면 앞의 행동은 취소하고 새로 누른 곳으로 간다.
  var current = null;
  function run(fn) {
    if (G.acting) return;
    G.acting++;
    var me = { cancelled: false };
    current = me;
    var done = function () { if (me.cancelled) return; G.acting = Math.max(0, G.acting - 1); if (current === me) current = null; };
    try { Promise.resolve(fn()).then(done, function (e) { console.error(e); done(); }); } catch (e) { console.error(e); done(); }
    current = me.cancelled ? null : current;
  }
  // 지금 하는 행동이 아직 처음 걸음 중이면 취소할 수 있다
  function cancelable() {
    return !!current && !current.cancelled && G.hero.walking && arrivals.some(function (a) { return a.token === current; });
  }
  function cancelAction() {
    var me = current; if (!me) return;
    me.cancelled = true; current = null;
    arrivals = arrivals.filter(function (a) { return a.token !== me; }); // 이 걸음의 다음 단계는 영영 오지 않는다
    G.acting = Math.max(0, G.acting - 1);
    G.hero.tx = null; G.hero.pose = null;
  }
  function chipsFor(spot) {
    if (!spot || !spot.chips) { UI.chips(null); return; }
    var list = typeof spot.chips === 'function' ? spot.chips() : spot.chips;
    var p = toStage(spot.x + spot.w / 2, spot.y - 2);
    UI.chips(list, p.x, Math.max(18, p.y));
  }
  var touchHide = 0;
  function down(e) {
    if (e.button !== undefined && e.button > 0) return;
    G.pointerType = e.pointerType || 'mouse';
    if (G.acting && !UI.busy() && G.fade <= .4 && cancelable()) cancelAction();
    if (blocked()) return;
    var p = toLogical(e), spot = hit(p);
    if (e.pointerType !== 'mouse') { G.hover = spot; chipsFor(spot); clearTimeout(touchHide); }
    if (!spot) {
      if (G.walk && p.y > 150) { var wx = G.walk(p); if (wx !== null && wx !== undefined) G.hero.tx = wx; }
      return;
    }
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ }
    if (spot.drag) {
      G.drag = { spot: spot, x0: p.x, y0: p.y, x: p.x, y: p.y, t0: G.t, moved: 0, path: [{ x: p.x, y: p.y, t: G.t }] };
      if (spot.drag.start) spot.drag.start(G.drag);
    } else {
      G.press = { spot: spot, x0: p.x, y0: p.y };
    }
    e.preventDefault();
  }
  function move(e) {
    var p = toLogical(e);
    if (e.pointerType) G.pointerType = e.pointerType;
    if (G.drag) {
      var d = G.drag, dx = p.x - d.x, dy = p.y - d.y;
      d.moved += Math.sqrt(dx * dx + dy * dy); d.x = p.x; d.y = p.y;
      d.path.push({ x: p.x, y: p.y, t: G.t }); if (d.path.length > 60) d.path.shift();
      if (d.spot.drag.move) d.spot.drag.move(d);
      e.preventDefault();
      return;
    }
    if (e.pointerType === 'mouse' || e.pointerType === undefined) {
      var spot = blocked() ? null : hit(p);
      if (spot !== G.hover) { G.hover = spot; chipsFor(spot); }
      cv.style.cursor = spot ? (spot.drag ? 'grab' : 'pointer') : (G.walk ? 'default' : 'default');
    }
  }
  function up(e) {
    var p = toLogical(e);
    if (G.drag) {
      var d = G.drag; G.drag = null;
      if (d.moved < 7 && d.spot.tap) { if (d.spot.drag.cancel) d.spot.drag.cancel(d); run(d.spot.tap); }
      else if (d.spot.drag.end) { var r = d.spot.drag.end(d); if (r && r.then) run(function () { return r; }); }
    } else if (G.press) {
      var s = G.press.spot; G.press = null;
      if (inside(p, s) && s.tap) run(s.tap);
    }
    if (e.pointerType !== 'mouse') { touchHide = setTimeout(function () { G.hover = null; chipsFor(null); }, 900); }
  }
  function cancel() { if (G.drag && G.drag.spot.drag.cancel) G.drag.spot.drag.cancel(G.drag); G.drag = null; G.press = null; }

  // ---------- 움직임 ----------
  function walkTo(x, opts) {
    opts = opts || {};
    G.hero.tx = Math.max(24, Math.min(616, x));
    if (opts.speed) G.hero.speed = opts.speed;
    var token = current; // 누른 행동 안에서 바로 부른 걸음만 취소할 수 있다
    return new Promise(function (resolve) { arrivals.push({ resolve: resolve, token: token }); });
  }
  function catTo(x, opts) {
    opts = opts || {};
    G.cat.tx = Math.max(20, Math.min(620, x)); G.cat.run = !!opts.run;
    if (opts.y !== undefined) G.cat.ty = opts.y;
    return new Promise(function (resolve) { catArrivals.push(resolve); });
  }
  function moveActors(dt) {
    var h = G.hero;
    if (h.tx !== null && h.tx !== undefined) {
      var dx = h.tx - h.x, step = h.speed * dt;
      if (Math.abs(dx) <= step) { h.x = h.tx; h.tx = null; h.walking = false; var a = arrivals; arrivals = []; a.forEach(function (f) { f.resolve(); }); }
      else { h.x += Math.sign(dx) * step; h.dir = dx > 0 ? 1 : -1; h.walking = true; }
    } else h.walking = false;
    var k = G.cat;
    if (k.tx !== null && k.tx !== undefined) {
      var cx = k.tx - k.x, cs = (k.run ? 250 : k.speed) * dt;
      if (k.ty !== null && k.ty !== undefined) { var cy = k.ty - k.y; k.y += Math.sign(cy) * Math.min(Math.abs(cy), 80 * dt); }
      if (Math.abs(cx) <= cs) { k.x = k.tx; k.tx = null; k.walking = false; var b = catArrivals; catArrivals = []; b.forEach(function (f) { f(); }); }
      else { k.x += Math.sign(cx) * cs; k.dir = cx > 0 ? 1 : -1; k.walking = true; }
    } else k.walking = false;
  }
  function stopActors() { G.hero.tx = null; G.cat.tx = null; var a = arrivals.map(function (x) { return x.resolve; }).concat(catArrivals); arrivals = []; catArrivals = []; a.forEach(function (f) { f(); }); }

  function fade(to, sec) {
    sec = sec || .45;
    return new Promise(function (resolve) { fades.push({ from: G.fade, to: to, t0: G.t, sec: sec, resolve: resolve }); });
  }
  function stepFades() {
    if (!fades.length) return;
    var f = fades[0], q = Math.min(1, (G.t - f.t0) / f.sec);
    G.fade = f.from + (f.to - f.from) * q;
    if (q >= 1) { fades.shift(); f.resolve(); if (fades.length) { fades[0].t0 = G.t; fades[0].from = G.fade; } }
  }
  function sleep(sec) {
    return new Promise(function (resolve) { var until = G.t + sec; (function chk() { if (G.t >= until) resolve(); else setTimeout(chk, 30); }()); });
  }
  // 조건이 맞을 때까지 기다린다 (끌기, 누르기 완료 등)
  function until(fn) {
    return new Promise(function (resolve) { (function chk() { var v = false; try { v = fn(); } catch (e) { console.error(e); } if (v) resolve(v); else setTimeout(chk, 50); }()); });
  }
  function puff(o) { o.t0 = G.t; G.fx.push(o); }

  // ---------- 그리기 ----------
  function render() {
    c.setTransform(G.k, 0, 0, G.k, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#1f1e25'; c.fillRect(0, 0, W, H);
    if (G.draw) G.draw(c);
    if (G.hover && !G.drag && !UI.busy() && G.hover.glow !== false) View.outline(c, G.hover, G.t);
    if (G.outlineAll) G.hot.forEach(function (s) { if (!s.off && s.glow !== false) View.outline(c, s, G.t); });
    else if (!UI.busy()) G.hot.forEach(function (s) { if (s.pulse && s !== G.hover) View.outline(c, s, G.t); }); // 꼭 봐야 할 곳은 계속 빛난다
    if (G.guide && !UI.busy()) View.arrow(c, G.guide.x, G.guide.y, G.t, G.guide.dir);
    if (G.hand) drawHand();
    View.fx(c, G);
    if (G.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(.8, G.flash) + ')'; c.fillRect(0, 0, W, H); }
    if (G.fade > 0) { c.fillStyle = 'rgba(0,0,0,' + Math.min(1, G.fade) + ')'; c.fillRect(0, 0, W, H); }
  }
  // 안내 손: from에서 to로 누른 채 움직이는 모양을 반복해서 보여 준다
  function drawHand() {
    var h = G.hand, q = ((G.t - (h.t0 || 0)) % (h.period || 2)) / (h.period || 2), x, y, press;
    if (h.shake) {
      x = h.x + Math.sin(q * Math.PI * 8) * 18 * (q < .7 ? 1 : 0); y = h.y; press = q > .08 && q < .9;
      if (q >= .7 && q < .9) View.icon(c, 'pause', x + 26, y - 30, 2); // 흔들다가 멈춘다
    }
    else if (h.stroke) { x = h.x + (q < .5 ? q * 2 : 2 - q * 2) * h.dx; y = h.y + Math.sin(q * Math.PI * 2) * 2; press = q > .05 && q < .95; }
    else { var e = Math.min(1, Math.max(0, (q - .15) / .6)); x = h.x + (h.tx - h.x) * e; y = h.y + (h.ty - h.y) * e; press = q > .1 && q < .8; }
    if (h.carry && press) h.carry(c, x, y); // 손이 집어 든 것 (예: 상담 카드)
    View.ghostHand(c, G, x, y, press, G.t);
  }
  function frame(now) {
    var dt = Math.min(.05, ((now - G.last) / 1000) || 0); G.last = now; G.t += dt; G.dt = dt;
    try {
      moveActors(dt); stepFades();
      if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.2);
      if (G.tick) G.tick(dt);
      G.hot = G.hotFn && !blocked() ? (G.hotFn() || []).filter(Boolean) : [];
      if (G.hover && G.hot.indexOf(G.hover) < 0) {
        var same = G.hot.filter(function (s) { return s.id && s.id === G.hover.id; })[0];
        G.hover = same || null; chipsFor(G.hover);
      } else if (G.hover) chipsFor(G.hover);
      if (!G.hover && !UI.busy()) UI.chips(null);
      if (UI.busy()) UI.chips(null);
      render();
    } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }
  function setScene(o) {
    G.draw = o.draw || null; G.hotFn = o.hot || null; G.tick = o.tick || null; G.walk = o.walk || null;
    G.hover = null; G.guide = null; G.hand = null; G.hot = []; UI.chips(null);
    if (o.place) G.place = o.place;
  }
  function init() {
    cv = $('world'); c = cv.getContext('2d');
    cv.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
    resize();
    requestAnimationFrame(function (t) { G.last = t; requestAnimationFrame(frame); });
  }
  return {
    init: init, loadAssets: loadAssets, resize: resize, setScene: setScene, run: run, walkTo: walkTo, catTo: catTo, stopActors: stopActors,
    fade: fade, sleep: sleep, until: until, puff: puff, toStage: toStage, toLogical: toLogical, hit: hit, W: W, H: H
  };
}());
