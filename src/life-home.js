/* 집: 거실과 침실. 돌봄은 끌기와 누르기로 하고, 평일 아침에는 행동마다 벽시계가 간다.
   저녁 칸을 쓰는 일은 장난감, 소파, 책상 위 고객 카드, (비 오는 밤) 커튼뿐이다. */
var Home = (function () {
  'use strict';
  var LV = View.L.living, BR = View.L.bedroom;
  // 물건 자리 (그림 기준점은 바닥 가운데)
  var P = {
    entrance: { x: 20, y: 46, w: 94, h: 212 }, lDoor: { x: 541, y: 50, w: 88, h: 208 },
    bag: { x: 126, y: 300 }, wet: { x: 132, y: 330 }, food: { x: 164, y: 330 }, bowl: { x: 206, y: 334 }, water: { x: 266, y: 334 }, bottle: { x: 306, y: 330 },
    feeder: { x: 160, y: 300 }, coffee: { x: 202, y: 178 }, lunch: { x: 236, y: 178 }, toy: { x: 452, y: 342 }, tower: { x: 352, y: 336 },
    litter: { x: 588, y: 348 }, scoop: { x: 628, y: 344 }, sand: { x: 542, y: 346 }, sofa: { x: 380, y: 168, w: 162, h: 96 }, clock: { x: 66, y: 26 },
    bDoor: { x: 523, y: 48, w: 98, h: 212 }, bed: { x: 26, y: 192, w: 182, h: 130 }, desk: { x: 265, y: 180, w: 148, h: 85 },
    cards: { x: 302, y: 183 }, roller: { x: 404, y: 183 }, laptop: { x: 330, y: 183 }, charger: { x: 374, y: 183 }, bBag: { x: 246, y: 334 },
    suitRack: { x: 452, y: 246 }, hoodieRack: { x: 490, y: 246 }, drawer: { x: 358, y: 224, w: 46, h: 32 }
  };
  var H = {
    room: 'living', mode: 'evening', waiter: null, held: null, pour: 0, stroke: 0, toy: null, roll: null, curtain: 0, curtainDrag: false,
    door: 0, doorDrag: false, closeUp: null, said: {}, catAct: null, catT: 0, catNext: 0, meowT: 0, furSpots: [], pro: false,
    packed: { laptop: false, charger: false }, umbrella: 0, petHand: null, searching: false, searched: {}, lineQueue: []
  };
  function S() { return G.s; }
  function rect(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }
  function around(p, w, h, dy) { return rect(p.x - w / 2, p.y - h + (dy || 0), w, h); }
  function inside(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  function timed() { return S() && S().phase === 'morning'; }
  function slotted() { return S() && (S().phase === 'evening' || S().phase === 'weekend'); }
  function cMin(n) { return { icon: 'clock', text: n + '분' }; }
  function cSlot(n) { return { icon: 'slot', text: String(n || 1) }; }
  function cBolt(n) { return { icon: 'bolt', text: (n > 0 ? '+' : '−') + Math.abs(n), cls: n > 0 ? 'good' : 'bad' }; }
  function cHeart(n) { return { icon: 'heart', text: (n > 0 ? '+' : '−') + Math.abs(n), cls: n > 0 ? 'good' : 'bad' }; }
  function say(lines) { return UI.say(lines); }
  function me(text) { return { who: 'me', text: text }; }
  function narr(text) { return { who: 'narr', text: text }; }
  // 그날 한 번만 하는 말
  function once(key, lines) {
    var k = (S() ? S().day : 'p') + ':' + key;
    if (H.said[k]) return Promise.resolve(false);
    H.said[k] = true;
    return say(lines).then(function () { return true; });
  }
  function seen(key) { var s = S(); if (!s) return true; if (!s.seen) s.seen = {}; if (s.seen[key]) return true; s.seen[key] = true; return false; }

  // ---------- 하늘과 빛 ----------
  function sky() {
    var s = S(); if (!s) return 'night';
    if (H.skyOverride) return H.skyOverride;
    if (H.pro) return 'winter';
    var d = Life.day(s);
    if (s.phase === 'morning') return 'day';
    if (s.phase === 'weekend') return s.minute < 900 ? 'day' : s.minute < 1080 ? 'dusk' : 'night';
    if (d.storm && (s.phase === 'evening' || s.phase === 'night')) return 'storm';
    return 'night';
  }
  function dim() {
    var s = S(); if (!s) return 0;
    if (H.mode === 'night') return .58;
    var m = sky();
    return m === 'day' ? 0 : m === 'dusk' ? .12 : .26;
  }

  // ---------- 고양이 ----------
  var CATSPOT = { bowl: P.bowl.x + 26, water: P.water.x + 26, litter: P.litter.x - 40 };
  function catHidden() { var s = S(); return !!(s && s.hidden); }
  function needs() {
    var s = S(); if (!s) return null;
    if (s.bowl === 'full') return 'eat';
    if (H.pro) return !s.fed[s.meal] && s.bowl !== 'ate' ? 'hungry' : null;
    if (!s.fed[s.meal] && s.bowl !== 'ate') return 'hungry';
    if (!s.water) return 'thirsty';
    if (s.litter.poop >= 2 || s.litter.sand <= 0) return 'litter';
    return null;
  }
  function catTick(dt) {
    var k = G.cat, s = S();
    if (!s) return;
    k.visible = !catHidden() || H.mode === 'night';
    if (catHidden()) return;
    if (H.toy && H.toy.pounce) return;
    if (H.catAct === 'pet' || H.catAct === 'still' || H.catAct === 'play' || H.catAct === 'sleep' || H.catAct === 'lap') { if (H.catAct === 'pet') k.pose = 'purr'; return; }
    if (H.mode === 'night') return;
    if (k.room !== H.room) { // 방을 옮기면 조금 뒤에 따라온다
      if (!k.follow) { k.follow = G.t + .9; }
      if (G.t > k.follow) { k.follow = 0; k.room = H.room; k.x = H.room === 'living' ? 560 : 540; k.y = 336; k.tx = null; }
      return;
    }
    var need = H.room === 'living' ? needs() : null;
    if (H.catAct === 'eat') {
      k.pose = 'eat';
      if (G.t > H.catT) { H.catAct = null; Life.ate(s); }
      return;
    }
    if (k.tx !== null && k.tx !== undefined) { k.pose = k.ty !== null && k.ty !== undefined && Math.abs(k.ty - k.y) > 3 ? 'jump' : k.run ? 'run' : 'walk'; return; }
    k.ty = null;
    if (need === 'eat') {
      if (Math.abs(k.x - CATSPOT.bowl) > 4 || k.y < 330) { Engine.catTo(CATSPOT.bowl, { y: 336, run: true }); return; }
      k.dir = -1; H.catAct = 'eat'; H.catT = G.t + 2.6;
      var wet = s.bowlKind === 'wet';
      queueLine(wet ? 'wetAte' : 'ate', true);
      return;
    }
    if (need === 'hungry' || need === 'thirsty') {
      var spot = need === 'hungry' ? CATSPOT.bowl + 6 : CATSPOT.water + 4;
      if (Math.abs(k.x - spot) > 4 || k.y < 330) { Engine.catTo(spot, { y: 336 }); return; }
      k.dir = -1; k.pose = need === 'hungry' ? 'lookUp' : 'sit';
      if (G.t > H.meowT) { H.meowT = G.t + 5 + Math.random() * 2; Engine.puff({ x: k.x - 6, y: k.y - 52, icon: need === 'hungry' ? 'bang' : 'drop', px: 1, life: 1.2 }); if (need === 'hungry') UI.sfx('meow'); }
      return;
    }
    if (need === 'litter') {
      if (G.t > H.catNext) { H.catNext = G.t + 1.6; Engine.catTo(CATSPOT.litter + (Math.random() < .5 ? -24 : 20), { y: 336 }); }
      else k.pose = 'stand';
      return;
    }
    // 평소: 주인공 곁, 소파, 창가를 오간다
    if (G.t > H.catNext) {
      H.catNext = G.t + 4 + Math.random() * 5;
      var r = Math.random(), x;
      if (H.room === 'living' && r < .3) { Engine.catTo(420 + Math.random() * 90, { y: 228 }); return; }
      if (H.room === 'bedroom' && r < .3) { Engine.catTo(110 + Math.random() * 60, { y: 278 }); return; }
      x = G.hero.x + (Math.random() < .5 ? -1 : 1) * (50 + Math.random() * 40);
      Engine.catTo(Math.max(40, Math.min(600, x)), { y: 336 });
      return;
    }
    k.pose = k.y < 300 && Math.random() < .002 ? 'sleep' : k.pose === 'sleep' ? 'sleep' : (Math.floor(G.t / 3) % 5 === 0 ? 'groom' : 'sit');
  }
  function queueLine(key, narrate) { H.lineQueue.push({ key: key, narrate: narrate }); }
  function flushLines() {
    if (!H.lineQueue.length || UI.busy() || G.drag || G.acting) return;
    var q = H.lineQueue.shift(), s = S();
    var text = Story.catLine(q.key, s.cat);
    if ((q.key === 'ate' || q.key === 'wetAte') && seen('line:' + q.key)) return;
    Engine.run(function () { return once(q.key, [q.narrate ? narr(text) : me(text)]); });
  }
  // 방에 들어설 때 보이는 이유 한 줄
  function noticeNeeds() {
    var n = needs(), s = S(); if (!n || n === 'eat') return Promise.resolve();
    if (n === 'hungry' && !s.food.dry && !s.food.wet) return once('noFood', [me('사료가 다 떨어졌네. 퇴근길에 사 와야겠다.')]);
    return once(n, [me(Story.catLine(n === 'thirsty' ? 'thirsty' : n, s.cat))]);
  }

  // ---------- 그리기 ----------
  function drawCat(c) {
    var k = G.cat;
    if (!k.visible || k.room !== H.room) return;
    if (H.toy && H.toy.pounce) { View.cat(c, G, k.x, k.y, k.dir, G.t, 'jump', k.scale); return; }
    View.shadow(c, k.x, k.y + 1, 15);
    View.cat(c, G, k.x, k.y, k.dir, G.t, k.walking ? (k.run ? 'run' : 'walk') : k.pose, k.scale);
  }
  function drawHero(c) {
    var h = G.hero; if (!h.visible) return;
    var look = H.pro ? 'hoodie' : (S() && S().wearing) || 'hoodie', pose = h.walking ? 'walk' : (h.pose || 'stand');
    View.shadow(c, h.x, h.y + 1, 20);
    View.person(c, G, h.x, h.y, look, h.walking ? h.dir : (h.face === undefined ? h.dir : h.face), G.t, pose, h.scale);
    // 정장이나 후드티에 붙은 털
    var fur = H.pro ? (H.proFur ? 2 : 0) : (S() && S().wearing === 'suit' ? S().fur : 0);
    if (fur > 0 && pose !== 'sit') furOn(c, h.x, h.y - 96 * h.scale / 2.35, fur, 1);
  }
  var FUR = [[-10, 2], [6, 8], [-3, 18], [9, 24], [-12, 30], [3, 34], [-6, 12], [11, 14], [0, 26]];
  function furOn(c, x, y, n, px) { for (var i = 0; i < Math.min(FUR.length, n * 3); i++) View.icon(c, 'fur', x + FUR[i][0], y + FUR[i][1], px || 1); }
  function drawLiving(c) {
    var s = S(), t = G.t;
    View.bg(c, G, 'living');
    View.entranceDoor(c, LV.entrance, H.entranceOpen || 0);
    View.roomDoor(c, G, LV.door, H.mode === 'night' ? (s.door === 'open' ? .82 : 0) : .82, 'bedroom', [40, 60, 92, 230], H.mode === 'night');
    View.windowView(c, G, LV.window, sky(), t, H.room === 'living' ? H.curtain : 0, sky() === 'storm');
    if (slotted() && !H.pro) View.slotClock(c, P.clock.x, P.clock.y, 13, s.slotsMax - s.slots, s.slotsMax);
    else View.wallClock(c, P.clock.x, P.clock.y, 13, s ? s.minute : 1200, timed() ? Life.T.leaveBy : 0);
    if (!H.pro) {
      if (s.pantry.coffee > 0 && !(H.held && H.held.id === 'coffee')) View.cup(c, P.coffee.x, P.coffee.y, .55);
      if (s.pantry.lunch > 0) View.lunchbox(c, P.lunch.x, P.lunch.y, .55);
      if (s.owned.feeder) View.feeder(c, P.feeder.x, P.feeder.y, .9);
      if (s.owned.tower) View.catTower(c, P.tower.x, P.tower.y, .95);
      View.bag(c, P.bag.x, P.bag.y, 1.1);
      var ll = s.litter;
      View.litterBox(c, P.litter.x, P.litter.y, ll.poop, ll.sand, t);
      if (ll.poop > 0 && !(H.held && H.held.id === 'scoop' && H.held.full)) for (var i = 0; i < Math.min(3, ll.poop); i++) View.icon(c, 'poop', P.litter.x - 12 + i * 12, P.litter.y - 18, 1);
      if (!(H.held && H.held.id === 'scoop')) View.item(c, 'scoop', P.scoop.x, P.scoop.y, 1.1);
      if (s.pantry.sand > 0 && !(H.held && H.held.id === 'sand')) View.sandBag(c, P.sand.x, P.sand.y, 1);
      if (!(H.held && H.held.id === 'toy') && !(H.toy && H.toy.caught)) View.toy(c, P.toy.x, P.toy.y, t);
      if (s.food.wet > 0 && !(H.held && H.held.id === 'wet')) View.item(c, 'wetFood', P.wet.x, P.wet.y, 1.05);
    }
    if (!(H.held && H.held.id === 'food')) View.foodBag(c, P.food.x, P.food.y, s.food.dry, 8);
    View.bowl(c, P.bowl.x, P.bowl.y, s.bowl, s.bowlKind, t);
    View.waterBowl(c, P.water.x, P.water.y, s.water ? (s.phase === 'morning' ? 1 : .55) : 0);
    if (!(H.held && H.held.id === 'bottle')) View.item(c, 'waterBottle', P.bottle.x, P.bottle.y, 1.1);
    // 사람과 고양이는 발 위치 순서로
    var actors = [{ y: G.hero.y, f: drawHero }, { y: G.cat.y + (G.cat.y < 300 ? -100 : 0), f: drawCat }];
    actors.sort(function (a, b) { return a.y - b.y; }).forEach(function (a) { a.f(c); });
    if (catHidden() && sky() === 'storm' && H.room === 'living') { // 소파 밑으로 보이는 꼬리
      View.r(c, 470, 258, 16, 3, '#d89553'); View.r(c, 484, 255, 4, 4, '#d89553');
      if (Math.floor(t * 1.5) % 4) { View.r(c, 452, 252, 2, 2, '#f5e27a'); View.r(c, 458, 252, 2, 2, '#f5e27a'); }
    }
    drawHeld(c);
    var dk = dim(); if (dk) View.nightTint(c, dk);
    if (dk >= .2) View.lampGlow(c, 470, 120, 150, .18);
  }
  function drawBedroom(c) {
    var s = S(), t = G.t, night = H.mode === 'night';
    View.bg(c, G, 'bedroom');
    View.windowView(c, G, BR.window, sky(), t, H.room === 'bedroom' ? H.curtain : 0, sky() === 'storm');
    var catOnBed = G.cat.visible && G.cat.room === 'bedroom' && H.catAct === 'sleep';
    View.bed(c, G, !!H.inBed, catOnBed, t, !H.inBed);
    if (!H.pro && s.cards.length) s.cards.forEach(function (id, i) { View.card(c, G, id, P.cards.x + i * 28, P.cards.y, !!s.prepared[id], .52); });
    if (H.packing) {
      if (!H.packed.laptop && !(H.held && H.held.id === 'laptop')) View.item(c, 'laptop', P.laptop.x, P.laptop.y, .9);
      if (!H.packed.charger && !(H.held && H.held.id === 'charger')) View.item(c, 'charger', P.charger.x, P.charger.y, .8);
      View.bag(c, P.bBag.x, P.bBag.y, 1.25);
    }
    if (!H.pro && s.owned.roller && !(H.held && H.held.id === 'roller')) View.item(c, 'roller', P.roller.x, P.roller.y, .9);
    var wearing = H.pro ? 'hoodie' : s.wearing;
    if (wearing !== 'suit' && !H.pro) View.hangerSuit(c, P.suitRack.x, P.suitRack.y, s.fur, t);
    if (wearing !== 'hoodie' || H.hoodieHung) { View.item(c, 'hoodie', P.hoodieRack.x, P.hoodieRack.y, 1.45); if (H.proFur && H.hoodieHung) furOn(c, P.hoodieRack.x, P.hoodieRack.y - 44, 2, 1); }
    var dopen = night ? H.door : .82;
    var dr = View.roomDoor(c, G, BR.door, dopen, 'living', [400, 60, 96, 230], night);
    H.handle = { x: dr.hx, y: dr.hy };
    if (night && G.cat.room === 'living' && G.cat.visible && H.door > .4) { // 문틈 너머 거실의 고양이
      View.cat(c, G, BR.door.x + 40, BR.door.y + BR.door.h - 6, -1, t, G.cat.pose === 'sleep' ? 'sleep' : 'sit', 1.2);
    }
    if (!H.inBed) {
      var actors = [{ y: G.hero.y, f: drawHero }, { y: G.cat.y, f: drawCat }];
      if (G.cat.room === 'bedroom' && H.catAct !== 'sleep') actors.sort(function (a, b) { return a.y - b.y; }).forEach(function (a) { a.f(c); });
      else drawHero(c);
    }
    drawHeld(c);
    var dk = dim(); if (dk) View.nightTint(c, dk);
    if (night) View.lampGlow(c, 290, 160, 70, .22);
    else if (dk >= .2) View.lampGlow(c, 285, 150, 120, .2);
  }
  function drawHeld(c) {
    var h = H.held; if (!h) return;
    var tilt = h.tilt || 0;
    if (h.id === 'food') View.foodBag(c, h.x, h.y, undefined, 8, tilt);
    else if (h.id === 'wet') { c.save(); c.translate(h.x, h.y); c.rotate(tilt); View.item(c, 'wetFood', 0, 0, 1.05); c.restore(); }
    else if (h.id === 'bottle') { c.save(); c.translate(h.x, h.y); c.rotate(tilt); View.item(c, 'waterBottle', 0, 0, 1.1); c.restore(); }
    else if (h.id === 'scoop') { View.item(c, 'scoop', h.x, h.y, 1.2); if (h.full) View.icon(c, 'poop', h.x, h.y - 10, 1); }
    else if (h.id === 'sand') { c.save(); c.translate(h.x, h.y); c.rotate(tilt); View.sandBag(c, 0, 0, 1); c.restore(); }
    else if (h.id === 'toy') { c.strokeStyle = '#6f6258'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(h.x, h.y - 46); c.lineTo(h.x + (h.sway || 0), h.y - 6); c.stroke(); View.r(c, h.x - 2, h.y - 50, 4, 6, '#7a5a3c'); View.toy(c, h.x + (h.sway || 0), h.y + 4, G.t, true); }
    else if (h.id === 'roller') View.item(c, 'roller', h.x, h.y + 10, 1.2);
    else if (h.id === 'laptop') View.item(c, 'laptop', h.x, h.y, .9);
    else if (h.id === 'charger') View.item(c, 'charger', h.x, h.y, .8);
    else if (h.id === 'coffee') View.cup(c, h.x, h.y, .6);
    else if (h.id === 'hand') View.item(c, 'hand', h.x, h.y + 10, 1.2);
    if (h.pouring) {
      if (h.id === 'food' || h.id === 'wet') Engine.puff({ x: h.x - 14, y: h.y - 4, kibble: true, life: .35, rise: 0 });
      if (h.id === 'bottle') Engine.puff({ x: h.x - 14, y: h.y - 2, splash: true, life: .35, rise: 0 });
      if (h.id === 'sand') Engine.puff({ x: h.x - 10, y: h.y, kibble: true, life: .35, rise: 0 });
    }
  }
  function draw(c) { if (H.room === 'bedroom') drawBedroom(c); else drawLiving(c); drawCloseUp(c); }

  // ---------- 고객 카드 크게 보기 ----------
  function drawCloseUp(c) {
    var cu = H.closeUp; if (!cu) return;
    var s = S();
    c.fillStyle = 'rgba(20,18,26,.72)'; c.fillRect(0, 0, 640, 360);
    var n = s.cards.length, gap = 120, x0 = 320 - (n - 1) * gap / 2;
    s.cards.forEach(function (id, i) {
      var flip = s.prepared[id] || (cu.flipT && G.t > cu.flipT + i * .25);
      View.card(c, G, id, x0 + i * gap, 268, !!flip, 2.6);
      var info = Life.CLIENTS[id];
      View.text(c, Story.CLIENT[id].name, x0 + i * gap, 286, 15, '#fffaf0');
      if (info.mark !== 'none' && !flip) View.icon(c, info.mark === 'cat' ? 'pet' : info.mark, x0 + i * gap, 312, 2);
    });
  }

  // ---------- 끌어서 놓기 ----------
  function holder(id, home, opts) {
    opts = opts || {};
    return {
      start: function (d) { H.held = { id: id, x: d.x, y: d.y, tilt: 0 }; H.pour = 0; UI.sfx('tap'); if (opts.start) opts.start(d); },
      move: function (d) {
        var h = H.held; if (!h) return;
        h.x = d.x; h.y = d.y;
        var over = opts.target && inside(d, typeof opts.target === 'function' ? opts.target() : opts.target);
        h.over = over;
        if (opts.move) opts.move(d, over);
      },
      end: function (d) {
        var h = H.held; H.held = null;
        if (!h) return;
        if (opts.end) return opts.end(d, h);
      },
      cancel: function () { H.held = null; }
    };
  }
  // 그릇 위에 잠깐 기울이고 있으면 부어진다
  function pourer(id, target, ok, commit) {
    var done = false;
    return holder(id, null, {
      target: target,
      start: function () { done = false; },
      move: function (d, over) {
        var h = H.held, can = ok();
        if (over && can) { h.tilt = -.9; h.pouring = true; H.pour += 1; }
        else { h.tilt = over ? -.15 : 0; h.pouring = false; }
        if (H.pour > 9 && !done) { done = true; }
      },
      end: function (d, h) {
        if (done || (h.over && ok() && H.pour > 2)) return commit();
        if (h.over && !ok()) return commit(true);
        return null;
      }
    });
  }
  function tickPour() { // 그릇 위에 가만히 대고 있어도 부어지게
    if (G.drag && H.held && H.held.pouring) H.pour += G.dt * 14;
  }

  // ---------- 돌봄 동작 ----------
  function heroGo(x) { return Engine.walkTo(x); }
  function feedCommit(kind, blocked) {
    var s = S();
    if (blocked) {
      var why = Life.feedBlock(s, kind);
      UI.sfx('bad');
      if (why === 'fed') return say([me(Story.catLine(s.meal === 'am' ? 'fed' : 'fedPm', s.cat))]);
      if (why === 'noFood') return say([me('사료가 다 떨어졌네. 퇴근길에 사 와야겠다.')]);
      return null;
    }
    var r = Life.feed(s, kind);
    if (!r.ok) return feedCommit(kind, true);
    UI.sfx('pour');
    if (r.minutes) Engine.puff({ x: P.bowl.x, y: P.bowl.y - 40, icon: 'clock', text: '+' + r.minutes + '분', px: 1 });
    H.said[s.day + ':hungry'] = true;
    G.cat.tx = null; H.catNext = 0;
    if (H.onCare) H.onCare('feed');
    return null;
  }
  function waterCommit(blocked) {
    var s = S();
    if (blocked || s.water) { UI.sfx('bad'); return say([me('물은 아직 넉넉해.')]); }
    var r = Life.water(s);
    UI.sfx('water');
    if (r.minutes) Engine.puff({ x: P.water.x, y: P.water.y - 40, icon: 'clock', text: '+' + r.minutes + '분', px: 1 });
    if (H.onCare) H.onCare('water');
    return null;
  }
  function scoopDrag() {
    var moved = 0;
    return holder('scoop', null, {
      start: function () { moved = 0; },
      move: function (d, over) {
        var s = S(), box = rect(P.litter.x - 30, P.litter.y - 34, 60, 36);
        if (inside(d, box) && s.litter.poop > 0) { moved += 4; if (moved > 40 && !H.held.full) { H.held.full = true; UI.sfx('scoop'); } }
      },
      end: function (d, h) {
        var s = S();
        if (!h.full) return null;
        var r = Life.scoop(s);
        if (r.ok && r.minutes) Engine.puff({ x: P.litter.x, y: P.litter.y - 50, icon: 'clock', text: '+' + r.minutes + '분', px: 1 });
        H.said[s.day + ':litter'] = true;
        if (H.onCare) H.onCare('scoop');
        return null;
      }
    });
  }
  function sandCommit(blocked) {
    var s = S(), r = Life.refill(s);
    if (!r.ok) { UI.sfx('bad'); return r.why === 'full' ? say([me('모래는 아직 깨끗해.')]) : null; }
    UI.sfx('pour');
    if (r.minutes) Engine.puff({ x: P.litter.x, y: P.litter.y - 50, icon: 'clock', text: '+' + r.minutes + '분', px: 1 });
    if (H.onCare) H.onCare('sand');
    return null;
  }
  // 쓰다듬기: 누른 채 등을 쓸어야 한다
  function petDrag() {
    var dist = 0, lastX = 0;
    return {
      start: function (d) { dist = 0; lastX = d.x; H.held = { id: 'hand', x: d.x, y: d.y }; H.catAct = 'still'; G.cat.tx = null; },
      move: function (d) {
        if (!H.held) return;
        H.held.x = d.x; H.held.y = Math.min(d.y, G.cat.y - 18);
        var k = G.cat, onBack = Math.abs(d.x - k.x) < 34 && d.y > k.y - 60 && d.y < k.y + 6;
        if (onBack) { dist += Math.abs(d.x - lastX); }
        lastX = d.x;
        if (dist > 30 && H.catAct !== 'pet') { H.catAct = 'pet'; UI.sfx('purr'); }
      },
      end: function () {
        H.held = null;
        var s = S(), ok = dist > 70;
        if (!ok) { H.catAct = null; return null; }
        var r = Life.pet(s);
        H.catAct = 'pet';
        setTimeout(function () { if (H.catAct === 'pet') H.catAct = null; }, 1800);
        if (!r.ok) { H.catAct = null; return null; }
        if (r.minutes) Engine.puff({ x: G.cat.x, y: G.cat.y - 60, icon: 'clock', text: '+' + r.minutes + '분', px: 1 });
        Engine.puff({ x: G.cat.x - 8, y: G.cat.y - 50, icon: 'heart', px: 1, life: 1.4 });
        if (H.onCare) H.onCare('pet');
        return once('purr', [me(Story.catLine('purr', s.cat))]);
      },
      cancel: function () { H.held = null; H.catAct = null; }
    };
  }
  // 장난감: 누른 채 흔들다가 멈추면 고양이가 덮친다
  function toyDrag() {
    var flips = 0, lastDir = 0, still = 0, lastX = 0, lastMove = 0;
    return holder('toy', null, {
      start: function (d) {
        flips = 0; lastDir = 0; still = 0; lastX = d.x; lastMove = G.t;
        H.toy = { shaking: 0, ready: false, lastMove: G.t };
        G.cat.tx = null; H.catAct = 'play'; G.cat.pose = 'lookUp';
        if (G.hand && G.hand.shake) G.hand = null;
      },
      move: function (d) {
        var dx = d.x - lastX;
        if (Math.abs(dx) > 3) {
          var dir = dx > 0 ? 1 : -1;
          if (lastDir && dir !== lastDir) flips++;
          lastDir = dir; lastX = d.x; lastMove = G.t; H.toy.lastMove = G.t;
        }
        H.held.sway = Math.max(-8, Math.min(8, dx * 2));
        H.toy.shaking = flips;
        if (flips >= 4) H.toy.ready = true;
      },
      end: function () {
        var t = H.toy; H.toy = null; H.catAct = null;
        if (t && t.caught) return null;
        return null;
      }
    });
  }
  function tickToy() {
    var t = H.toy, k = G.cat;
    if (!t || !G.drag || !H.held || H.held.id !== 'toy') return;
    var h = H.held;
    k.dir = h.x < k.x ? -1 : 1;
    if (!t.pounce) {
      // 고양이는 장난감 쪽으로 몸을 낮춘다
      k.pose = t.ready ? 'play' : 'lookUp';
      if (Math.abs(k.x - h.x) > 90) { k.x += Math.sign(h.x - k.x) * 60 * G.dt; }
      var calm = G.t - (t.lastMove || G.t);
      if (t.ready && calm > .45) {
        t.pounce = true; t.t0 = G.t; t.fromX = k.x; t.fromY = k.y; UI.sfx('meow');
      }
    } else {
      var q = Math.min(1, (G.t - t.t0) / .45);
      k.x = t.fromX + (h.x - t.fromX) * q;
      k.y = t.fromY - Math.sin(q * Math.PI) * 50 + (Math.min(336, h.y + 20) - t.fromY) * q * .2;
      if (q >= 1 && !t.caught) {
        t.caught = true; k.y = 336;
        var s = S(), r = Life.slot(s, 'play');
        G.drag = null; H.held = null; H.toy = null; H.catAct = 'play';
        if (r.ok) { UI.sfx('good'); Engine.puff({ x: k.x, y: k.y - 50, icon: 'heart', px: 1, life: 1.4 }); }
        setTimeout(function () { H.catAct = null; }, 1600);
        if (H.onSlot) H.onSlot('play');
      }
    }
  }
  // 돌돌이: 정장 위를 문지르면 털이 떨어진다
  function rollerDrag() {
    var rubbed = 0;
    return holder('roller', null, {
      start: function () { rubbed = 0; H.rollHits = 0; },
      move: function (d) {
        var s = S(), target = s.wearing === 'suit' ? around({ x: G.hero.x, y: G.hero.y - 40 }, 50, 90) : rect(P.suitRack.x - 26, P.suitRack.y - 62, 52, 66);
        if (inside(d, target) && s.fur > 0) { rubbed += 5; if (Math.floor(rubbed / 30) > H.rollHits) { H.rollHits++; Engine.puff({ x: d.x + 10, y: d.y, icon: 'fur', px: 1, life: .6, rise: -10 }); } }
      },
      end: function () {
        var s = S();
        if (rubbed < 120 || !s.fur) return null;
        var r = Life.roll(s);
        if (r.ok) { UI.sfx('good'); if (r.minutes) Engine.puff({ x: P.suitRack.x, y: P.suitRack.y - 80, icon: 'clock', text: '+' + r.minutes + '분', px: 1 }); }
        return null;
      }
    });
  }
  // 비 오는 밤의 커튼: 가장자리를 끌어 닫는다
  function curtainDrag() {
    return {
      start: function () { H.curtainDrag = true; },
      move: function (d) { var w = H.room === 'living' ? LV.window : BR.window; H.curtain = Math.max(0, Math.min(1, (d.x - w.x) / (w.w / 2))); },
      end: function () {
        H.curtainDrag = false;
        if (H.curtain < .7) { H.curtain = 0; return null; }
        H.curtain = 1;
        var s = S(), r = Life.slot(s, 'curtain');
        if (!r.ok) return null;
        UI.sfx('good');
        var k = G.cat; k.visible = true; k.room = H.room; k.x = 486; k.y = 262; H.catAct = 'lap';
        return say([narr(Story.catLine('stormOut', s.cat))]).then(function () {
          G.hero.tx = null; G.hero.x = 430; G.hero.y = 262; G.hero.pose = 'sit'; k.x = 452; k.y = 238;
          return Engine.sleep(1.2);
        }).then(function () { G.hero.pose = null; G.hero.y = 334; G.hero.x = 420; H.catAct = null; k.y = 336; k.x = 470; if (H.onSlot) H.onSlot('curtain'); });
      }
    };
  }
  // 밤의 방문: 손잡이를 잡고 끄는 방향으로 문이 움직인다 (왼쪽 = 열림)
  function doorDrag() {
    var x0 = 0, a0 = 0;
    return {
      start: function (d) { x0 = d.x; a0 = H.door; H.doorDrag = true; if (G.hand && G.hand.door) G.hand = null; },
      move: function (d) { H.door = Math.max(0, Math.min(1, a0 + (x0 - d.x) / (BR.door.w * .8))); },
      end: function () {
        H.doorDrag = false;
        var open = H.door > .45;
        H.door = open ? 1 : 0;
        Life.setDoor(S(), open); UI.sfx('door');
        if (H.onDoor) H.onDoor(open);
        return null;
      }
    };
  }

  // ---------- 누를 수 있는 곳 ----------
  function hotLiving() {
    var s = S(), list = [], m = H.mode;
    if (H.closeUp) return [{ id: 'closeUp', x: 0, y: 0, w: 640, h: 360, glow: false, tap: closeCards }];
    if (m === 'night') return [];
    var morning = m === 'morning';
    // 문
    list.push({ id: 'lDoor', x: P.lDoor.x, y: P.lDoor.y, w: P.lDoor.w, h: P.lDoor.h, tap: function () { return goRoom('bedroom'); } });
    if (!H.pro) list.push({ id: 'entrance', x: P.entrance.x, y: P.entrance.y, w: P.entrance.w, h: P.entrance.h,
      chips: m === 'weekend' ? [cSlot(1)] : null, tap: tapEntrance });
    // 밥, 물
    if (s.food.dry > 0 || !H.pro) list.push({ id: 'food', x: P.food.x - 17, y: P.food.y - 36, w: 34, h: 38, chips: morning ? [cMin(Life.T.feed)] : null,
      drag: pourer('food', rect(P.bowl.x - 24, P.bowl.y - 56, 48, 60), function () { return !Life.feedBlock(s, 'dry'); }, function (bl) { return feedCommit('dry', bl); }) });
    if (!H.pro && s.food.wet > 0) list.push({ id: 'wet', x: P.wet.x - 14, y: P.wet.y - 28, w: 28, h: 30, chips: morning ? [cMin(Life.T.feed), cHeart(1)] : [cHeart(1)],
      drag: pourer('wet', rect(P.bowl.x - 24, P.bowl.y - 56, 48, 60), function () { return !Life.feedBlock(s, 'wet'); }, function (bl) { return feedCommit('wet', bl); }) });
    list.push({ id: 'bottle', x: P.bottle.x - 12, y: P.bottle.y - 36, w: 24, h: 38, chips: morning ? [cMin(Life.T.water)] : null,
      drag: pourer('bottle', rect(P.water.x - 24, P.water.y - 56, 48, 60), function () { return !s.water; }, function (bl) { return waterCommit(bl); }) });
    if (!H.pro) {
      if (s.litter.poop > 0) list.push({ id: 'scoop', x: P.scoop.x - 13, y: P.scoop.y - 24, w: 26, h: 28, chips: morning ? [cMin(Life.T.scoop)] : null, drag: scoopDrag() });
      if (s.pantry.sand > 0) list.push({ id: 'sand', x: P.sand.x - 15, y: P.sand.y - 34, w: 30, h: 36, chips: morning ? [cMin(Life.T.sand)] : null,
        drag: pourer('sand', rect(P.litter.x - 32, P.litter.y - 60, 64, 64), function () { return s.litter.sand < Life.SAND_DAYS || s.litter.poop > 0; }, function (bl) { return sandCommit(bl); }) });
      if (morning && s.pantry.coffee > 0 && !s.coffee) list.push({ id: 'coffee', x: P.coffee.x - 12, y: P.coffee.y - 24, w: 24, h: 26, chips: [cMin(Life.T.coffee), cBolt(1)], tap: drinkCoffee });
      if (slotted() && s.pantry.lunch > 0 && s.energy < Life.MAX) list.push({ id: 'lunch', x: P.lunch.x - 13, y: P.lunch.y - 22, w: 26, h: 24, chips: [cBolt(1)], tap: eatLunch });
      // 저녁 칸
      if (slotted() && !Life.slotBlock(s, 'play')) list.push({ id: 'toy', x: P.toy.x - 18, y: P.toy.y - 22, w: 36, h: 26, chips: [cSlot(1), cBolt(-1), cHeart(1)], drag: toyDrag() });
      if (slotted() && !Life.slotBlock(s, 'rest')) list.push({ id: 'sofa', x: P.sofa.x, y: P.sofa.y, w: P.sofa.w, h: P.sofa.h, chips: [cSlot(1), cBolt(1)], tap: rest });
      if (slotted() && !Life.slotBlock(s, 'curtain') && catHidden()) list.push({ id: 'curtain', x: LV.window.x - 6, y: LV.window.y, w: 40, h: LV.window.h, chips: [cSlot(1), cHeart(1)], drag: curtainDrag() });
    }
    // 고양이
    var k = G.cat;
    if (k.visible && k.room === 'living' && !catHidden() && k.y > 200) list.push({ id: 'cat', x: k.x - 28, y: k.y - 50, w: 56, h: 54, chips: morning ? [cMin(Life.T.pet)].concat(s.petted ? [] : [cHeart(1)]) : (s.petted ? null : [cHeart(1)]), drag: petDrag(), glow: false });
    if (H.searching) list = list.concat(searchSpots('living'));
    return list;
  }
  function hotBedroom() {
    var s = S(), list = [], m = H.mode;
    if (H.closeUp) return [{ id: 'closeUp', x: 0, y: 0, w: 640, h: 360, glow: false, tap: closeCards }];
    if (m === 'night') {
      list.push({ id: 'handle', x: H.handle.x - 22, y: H.handle.y - 30, w: 40, h: 60, drag: doorDrag(), glow: true });
      if (s.cards.length) list.push({ id: 'cards', x: P.cards.x - 14, y: P.cards.y - 32, w: 30 + 28 * (s.cards.length - 1), h: 34, tap: openCards });
      return list;
    }
    var morning = m === 'morning';
    list.push({ id: 'bDoor', x: P.bDoor.x, y: P.bDoor.y, w: P.bDoor.w, h: P.bDoor.h, tap: function () { return goRoom('living'); } });
    if (H.packing) {
      if (!H.packed.laptop) list.push({ id: 'laptop', x: P.laptop.x - 26, y: P.laptop.y - 20, w: 52, h: 22, drag: packDrag('laptop') });
      if (!H.packed.charger) list.push({ id: 'charger', x: P.charger.x - 14, y: P.charger.y - 18, w: 28, h: 20, drag: packDrag('charger') });
      return list;
    }
    if (!H.pro) {
      if (s.wearing !== 'suit') list.push({ id: 'suit', x: P.suitRack.x - 24, y: P.suitRack.y - 64, w: 48, h: 68, chips: morning ? [cMin(Life.T.dress)] : null, tap: dress, off: !morning });
      if (morning && s.owned.roller && s.fur > 0) list.push({ id: 'roller', x: P.roller.x - 13, y: P.roller.y - 20, w: 26, h: 22, chips: morning ? [cMin(Life.T.roller)] : null, drag: rollerDrag() });
      if (s.cards.length) list.push({ id: 'cards', x: P.cards.x - 14, y: P.cards.y - 32, w: 30 + 28 * (s.cards.length - 1), h: 34,
        chips: slotted() && !Life.slotBlock(s, 'prep') ? [cSlot(1), cBolt(-1)] : null, tap: openCards });
      if (slotted() || H.bedOK) list.push({ id: 'bed', x: P.bed.x, y: P.bed.y + 40, w: P.bed.w, h: P.bed.h - 40, chips: [{ icon: 'zzz', text: '' }], tap: tapBed });
      if (slotted() && !Life.slotBlock(s, 'curtain') && catHidden()) list.push({ id: 'curtain', x: BR.window.x - 6, y: BR.window.y, w: 50, h: BR.window.h, chips: [cSlot(1), cHeart(1)], drag: curtainDrag() });
    } else if (H.bedOK) list.push({ id: 'bed', x: P.bed.x, y: P.bed.y + 40, w: P.bed.w, h: P.bed.h - 40, tap: tapBed });
    if (H.pro && H.rackOK) list.push({ id: 'rack', x: 420, y: 118, w: 96, h: 140, tap: hangHoodie });
    var k = G.cat;
    if (k.visible && k.room === 'bedroom' && !catHidden() && k.y > 300) list.push({ id: 'cat', x: k.x - 28, y: k.y - 50, w: 56, h: 54, chips: morning ? [cMin(Life.T.pet)].concat(s.petted ? [] : [cHeart(1)]) : (s.petted ? null : [cHeart(1)]), drag: petDrag(), glow: false });
    if (H.searching) list = list.concat(searchSpots('bedroom'));
    return list;
  }
  function hot() { if (H.lock) return []; return H.room === 'bedroom' ? hotBedroom() : hotLiving(); }
  function walkable(p) {
    if (H.mode === 'night' || H.closeUp) return null;
    return Math.max(H.room === 'living' ? 130 : 220, Math.min(H.room === 'living' ? 560 : 520, p.x));
  }

  // ---------- 행동 ----------
  function goRoom(room) {
    var toDoor = H.room === 'living' ? 584 : 570;
    return heroGo(toDoor).then(function () { UI.sfx('door'); return Engine.fade(1, .2); }).then(function () {
      H.room = room; G.hero.x = room === 'living' ? 584 : 560; G.hero.dir = -1; G.hero.tx = room === 'living' ? 520 : 470;
      if (G.cat.room !== room && !catHidden()) G.cat.follow = G.t + .8;
      return Engine.fade(0, .2);
    }).then(function () { if (room === 'living') return noticeNeeds(); });
  }
  function tapEntrance() {
    var s = S();
    if (H.mode === 'morning') {
      if (s.wearing !== 'suit') { UI.sfx('bad'); return say([me('정장부터 입어야지.')]); }
      return heroGo(96).then(function () { resolveWait('leave'); });
    }
    if (H.mode === 'weekend') {
      if (Life.slotBlock(s, 'shop')) return null;
      return heroGo(96).then(function () { resolveWait('shop'); });
    }
    return say([me(s.phase === 'evening' ? '오늘은 이제 쉬자.' : '나갈 일은 없어.')]);
  }
  function tapBed() {
    if (H.pro) return heroGo(200).then(function () { resolveWait('bed'); });
    return heroGo(220).then(function () { resolveWait('bed'); });
  }
  function dress() {
    var s = S();
    return heroGo(P.suitRack.x - 30).then(function () {
      G.hero.face = 1;
      var r = Life.dress(s);
      if (!r.ok) return null;
      UI.sfx('page');
      Engine.puff({ x: P.suitRack.x, y: P.suitRack.y - 80, icon: 'clock', text: '+' + r.minutes + '분', px: 1 });
      G.hero.face = undefined;
      if (s.fur > 0 && !s.seen.furSuit) { s.seen.furSuit = true; return say([me(s.owned.roller ? '정장에 털이 붙었네.' : '정장에 털이 잔뜩 붙었네... 떼어 낼 게 없는데.')]); }
      return null;
    });
  }
  function drinkCoffee() {
    var s = S();
    return heroGo(P.coffee.x + 26).then(function () {
      var r = Life.coffee(s); if (!r.ok) return null;
      UI.sfx('good');
      Engine.puff({ x: P.coffee.x, y: P.coffee.y - 30, icon: 'bolt', text: '+1', px: 1 });
      Engine.puff({ x: P.coffee.x + 30, y: P.coffee.y - 30, icon: 'clock', text: '+' + r.minutes + '분', px: 1 });
      return null;
    });
  }
  function eatLunch() {
    var s = S();
    return heroGo(P.lunch.x + 30).then(function () {
      var r = Life.lunch(s); if (!r.ok) return null;
      UI.sfx('good'); Engine.puff({ x: P.lunch.x, y: P.lunch.y - 30, icon: 'bolt', text: '+1', px: 1 });
      return null;
    });
  }
  function rest() {
    var s = S();
    return heroGo(440).then(function () {
      G.hero.x = 440; G.hero.y = 262; G.hero.pose = 'sit'; G.hero.face = 1;
      var r = Life.slot(s, 'rest');
      Engine.puff({ x: 440, y: 180, icon: 'zzz', px: 1, life: 1.6 });
      return Engine.sleep(1.4).then(function () {
        G.hero.pose = null; G.hero.y = 334; G.hero.face = undefined;
        if (r.ok && H.onSlot) H.onSlot('rest');
      });
    });
  }
  function openCards() {
    var s = S();
    return heroGo(P.cards.x + 10).then(function () {
      H.closeUp = { flipT: 0 }; UI.sfx('page');
      if (slotted() && !Life.slotBlock(s, 'prep')) {
        H.closeUp.prep = true;
      }
      return null;
    });
  }
  function closeCards() {
    var s = S(), cu = H.closeUp;
    if (cu && cu.prep && !cu.flipT) { // 준비하기: 카드를 뒤집어 상품을 본다
      cu.flipT = G.t;
      var r = Life.slot(s, 'prep');
      UI.sfx('page');
      return Engine.sleep(1.2).then(function () { if (r.ok && H.onSlot) H.onSlot('prep'); });
    }
    H.closeUp = null;
    return null;
  }
  function packDrag(id) {
    return holder(id, null, {
      target: rect(P.bBag.x - 30, P.bBag.y - 46, 60, 50),
      end: function (d, h) {
        if (!h.over) return null;
        H.packed[id] = true; UI.sfx('page');
        if (H.packed.laptop && H.packed.charger) resolveWait('packed');
        return null;
      }
    });
  }
  function hangHoodie() {
    H.hoodieHung = true; H.rackOK = false; UI.sfx('page');
    return heroGo(470).then(function () { resolveWait('hung'); });
  }
  // 4/21: 아침에 보이지 않는 고양이 찾기
  var SPOTS = {
    living: [{ id: 'underSofa', x: 384, y: 236, w: 154, h: 30 }, { id: 'counter', x: 120, y: 184, w: 186, h: 72 }, { id: 'window', x: 386, y: 38, w: 144, h: 124 }],
    bedroom: [{ id: 'drawer', x: P.drawer.x, y: P.drawer.y, w: P.drawer.w, h: P.drawer.h }, { id: 'bed', x: 30, y: 250, w: 174, h: 70 }, { id: 'rack', x: 420, y: 118, w: 96, h: 140 }]
  };
  function searchSpots(room) {
    return SPOTS[room].filter(function (sp) { return !H.searched[sp.id]; }).map(function (sp) {
      return { id: 'search-' + sp.id, x: sp.x, y: sp.y, w: sp.w, h: sp.h, chips: [cMin(Life.T.search)], tap: function () { return search(sp); } };
    });
  }
  function search(sp) {
    var s = S();
    return heroGo(sp.x + sp.w / 2).then(function () {
      var r = Life.search(s, sp.id === 'drawer' ? 'drawer' : sp.id);
      H.searched[sp.id] = true;
      Engine.puff({ x: sp.x + sp.w / 2, y: sp.y - 6, icon: 'clock', text: '+' + Life.T.search + '분', px: 1 });
      if (r.found) {
        H.searching = false; UI.sfx('meow');
        var k = G.cat; k.room = 'bedroom'; k.visible = true; k.x = P.drawer.x + 20; k.y = 336; k.pose = 'sit';
        return say([me(Story.catLine('found', s.cat))]);
      }
      return say([me(['여긴 없네.', '여기도 없어.', '어디 간 거지...'][Math.min(2, Object.keys(H.searched).length - 1)])]);
    });
  }

  // ---------- 흐름 연결 ----------
  function wait(types) { return new Promise(function (resolve) { H.waiter = { types: types, resolve: resolve }; }); }
  function resolveWait(type) {
    var w = H.waiter;
    if (w && w.types.indexOf(type) >= 0) { H.waiter = null; w.resolve(type); return true; }
    return false;
  }
  function tick(dt) { catTick(dt); tickPour(); tickToy(); flushLines(); if (H.extraTick) H.extraTick(dt); }
  function enter(room, opts) {
    opts = opts || {};
    H.room = room; H.mode = opts.mode || H.mode;
    if (opts.heroX !== undefined) { G.hero.x = opts.heroX; G.hero.tx = null; }
    G.hero.y = 334; G.hero.pose = null; G.hero.visible = true; G.hero.face = undefined; G.hero.scale = 2.35;
    if (opts.catRoom) { G.cat.room = opts.catRoom; G.cat.x = opts.catX || 400; G.cat.y = opts.catY || 336; G.cat.tx = null; }
    Engine.setScene({ draw: draw, hot: hot, tick: tick, walk: walkable, place: room });
  }
  return {
    P: P, H: H, enter: enter, wait: wait, resolveWait: resolveWait, goRoom: goRoom, noticeNeeds: noticeNeeds, needs: needs, draw: draw,
    drawLiving: drawLiving, drawBedroom: drawBedroom, sky: sky, once: once, seen: seen, cMin: cMin, cSlot: cSlot, cBolt: cBolt, cHeart: cHeart,
    openCards: openCards, furOn: furOn
  };
}());
