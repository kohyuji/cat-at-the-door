/* 집: 거실과 침실. 돌봄은 끌기나 누르기로 하고, 집에서 하는 일은 모두 벽시계를 움직인다.
   저녁에는 할 일을 마음대로 고르고, 침대를 누르면 하루가 끝난다. 11시가 넘으면 늦게 잔 만큼 체력이 덜 찬다. */
var Home = (function () {
  'use strict';
  var LV = View.L.living, BR = View.L.bedroom;
  // 물건 자리 (그림 기준점은 바닥 가운데)
  var P = {
    entrance: { x: 20, y: 46, w: 94, h: 212 }, lDoor: { x: 541, y: 50, w: 88, h: 208 },
    bag: { x: 126, y: 300 }, wet: { x: 132, y: 330 }, food: { x: 164, y: 330 }, bowl: { x: 206, y: 334 }, water: { x: 266, y: 334 }, bottle: { x: 306, y: 330 },
    feeder: { x: 160, y: 300 }, coffee: { x: 202, y: 178 }, lunch: { x: 236, y: 178 }, toy: { x: 452, y: 342 }, tower: { x: 352, y: 336 },
    litter: { x: 588, y: 348 }, scoop: { x: 628, y: 344 }, sand: { x: 542, y: 346 }, sofa: { x: 380, y: 168, w: 162, h: 96 }, clock: { x: 66, y: 26 },
    memo: { x: 336, y: 120, w: 40, h: 40 }, broom: { x: 392, y: 286 }, mop: { x: 372, y: 288 },
    bDoor: { x: 523, y: 48, w: 98, h: 212 }, bed: { x: 22, y: 228, w: 200, h: 96 }, desk: { x: 265, y: 180, w: 148, h: 85 },
    laptop: { x: 326, y: 186 }, roller: { x: 430, y: 99 }, charger: { x: 374, y: 186 }, bBag: { x: 246, y: 334 },
    suitRack: { x: 452, y: 246 }, hoodieRack: { x: 490, y: 246 }, drawer: { x: 358, y: 224, w: 46, h: 32 }
  };
  var H = {
    room: 'living', mode: 'evening', waiter: null, held: null, pour: 0, toy: null, curtain: 0, curtainDrag: false,
    door: 0, doorDrag: false, closeUp: null, said: {}, catAct: null, catT: 0, catNext: 0, meowT: 0, pro: false,
    packed: { laptop: false, charger: false }, searching: false, searched: {}, lineQueue: [], clean: null, gone: {}, goneDay: -1, yawnT: 0
  };
  function S() { return G.s; }
  function rect(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }
  function around(p, w, h, dy) { return rect(p.x - w / 2, p.y - h + (dy || 0), w, h); }
  function inside(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  function home() { var s = S(); return !!s && !H.pro && Life.homeTime(s); }
  function morning() { var s = S(); return !!s && !H.pro && s.phase === 'morning'; }
  // 비용 표시: 피곤하면 늘어난 분이 빨갛게 보인다
  function cMin(n) { var s = S(), m = s && !H.pro ? Life.cost(s, n) : n, slow = s && !H.pro && Life.tired(s); return { icon: 'clock', text: m + '분', cls: slow ? 'bad' : '' }; }
  function cBolt(n) { return { icon: 'bolt', text: (n > 0 ? '+' : '−') + Math.abs(n), cls: n > 0 ? 'good' : 'bad' }; }
  function cHeart(n) { return { icon: 'heart', text: (n > 0 ? '+' : '−') + Math.abs(n), cls: n > 0 ? 'good' : 'bad' }; }
  function cost(list) { return H.pro ? null : list; }
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
  function spent(p, minutes, dy) { if (minutes) Engine.puff({ x: p.x, y: p.y - (dy || 44), icon: 'clock', text: '+' + minutes + '분', px: 1 }); }

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
  // 밥과 물을 기다릴 때는 두 그릇 사이에 앉는다 (물병, 사료 봉지를 가리지 않게)
  var CATSPOT = { bowl: P.bowl.x + 30, water: P.water.x - 30, litter: P.litter.x - 40 };
  function catHidden() { var s = S(); return !!(s && s.hidden); }
  function needs() {
    var s = S(); if (!s || s.hidden) return null;
    if (s.bowl === 'full') return 'eat';
    if (!s.fed[s.meal] && s.bowl !== 'ate') return 'hungry';
    if (H.pro) return null;
    if (!s.water) return 'thirsty';
    if (s.litter.poop >= 2) return 'litter';
    if (s.litter.sand <= 0) return 'sandOut';
    return null;
  }
  function catTick(dt) {
    var k = G.cat, s = S();
    if (!s) return;
    if (k.room === 'none') { k.visible = false; return; } // 프롤로그 첫 장면처럼 고양이가 아직 없는 때
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
      queueLine({ key: s.bowlKind === 'wet' ? 'wetAte' : 'ate', narrate: true });
      return;
    }
    if (need === 'hungry' || need === 'thirsty') {
      var spot = need === 'hungry' ? CATSPOT.bowl : CATSPOT.water;
      if (Math.abs(k.x - spot) > 4 || k.y < 330) { Engine.catTo(spot, { y: 336 }); return; }
      k.dir = need === 'hungry' ? -1 : 1; k.pose = need === 'hungry' ? 'lookUp' : 'sit';
      if (G.t > H.meowT) { H.meowT = G.t + 5 + Math.random() * 2; Engine.puff({ x: k.x + k.dir * 6, y: k.y - 52, icon: need === 'hungry' ? 'bang' : 'drop', px: 1, life: 1.2 }); if (need === 'hungry') UI.sfx('meow'); }
      return;
    }
    if (need === 'litter' || need === 'sandOut') {
      if (G.t > H.catNext) { H.catNext = G.t + 1.6; Engine.catTo(CATSPOT.litter + (Math.random() < .5 ? -24 : 20), { y: 336 }); }
      else k.pose = 'stand';
      return;
    }
    // 평소: 주인공 곁, 소파, 캣타워를 오간다
    if (G.t > H.catNext) {
      H.catNext = G.t + 4 + Math.random() * 5;
      var r = Math.random(), x;
      if (H.room === 'living' && r < .3) { Engine.catTo(420 + Math.random() * 90, { y: 228 }); return; }
      if (H.room === 'living' && r < .42 && s.owned.tower) { Engine.catTo(P.tower.x, { y: 262 }); return; }
      x = G.hero.x + (Math.random() < .5 ? -1 : 1) * (50 + Math.random() * 40);
      Engine.catTo(Math.max(H.room === 'bedroom' ? 240 : 40, Math.min(600, x)), { y: 336 });
      return;
    }
    k.pose = k.y < 300 && Math.random() < .002 ? 'sleep' : k.pose === 'sleep' ? 'sleep' : (Math.floor(G.t / 3) % 5 === 0 ? 'groom' : 'sit');
  }
  function queueLine(q) { H.lineQueue.push(q); }
  function flushLines() {
    if (!H.lineQueue.length || UI.busy() || G.drag || G.acting) return;
    var q = H.lineQueue.shift(), s = S();
    var text = q.text || Story.catLine(q.key, s.cat);
    if ((q.key === 'ate' || q.key === 'wetAte') && seen('line:' + q.key)) return;
    Engine.run(function () { return once(q.key, [q.narrate ? narr(text) : me(text)]); });
  }
  // 방에 들어설 때 보이는 이유 한 줄 (숨은 날에는 고양이 이야기를 하지 않는다)
  function noticeNeeds() {
    var s = S(), n = needs();
    if (!s || H.pro || s.hidden) return Promise.resolve();
    if (n === 'hungry' && !s.food.dry && !s.food.wet) return once('noFood', [me('사료가 다 떨어졌네. 퇴근길에 사 와야겠다.')]);
    if (n === 'hungry' || n === 'thirsty' || n === 'litter') return once(n, [me(Story.catLine(n, s.cat))]);
    return sandTalk();
  }
  function sandTalk() {
    var s = S(), lines = [];
    if (s.litter.sand <= 0) lines.push(me(Story.catLine('sandOut', s.cat)));
    else if (Life.sandLow(s)) lines.push(me(Story.catLine('sandLow', s.cat)));
    else return Promise.resolve();
    if (!s.pantry.sand) lines.push(me(Story.catLine('noSand', s.cat)));
    return once('sand' + s.litter.sand, lines);
  }

  // ---------- 그리기 ----------
  function drawCat(c) {
    var k = G.cat;
    if (!k.visible || k.room !== H.room) return;
    if (H.toy && H.toy.pounce) { View.cat(c, G, k.x, k.y, k.dir, G.t, 'jump', k.scale); return; }
    View.shadow(c, k.x, k.y + 1, 15);
    View.cat(c, G, k.x, k.y, k.dir, G.t, k.walking ? (k.run ? 'run' : 'walk') : k.pose, k.scale);
  }
  function heroLook() { return H.pro ? 'hoodie' : (S() && S().wearing) || 'hoodie'; }
  function drawHero(c) {
    var h = G.hero; if (!h.visible) return;
    var cleaning = H.clean && H.clean.kind, pose = cleaning ? H.clean.kind : h.walking ? 'walk' : (h.pose || 'stand');
    View.shadow(c, h.x, h.y + 1, 20);
    View.person(c, G, h.x, h.y, heroLook(), h.walking && !cleaning ? h.dir : (h.face === undefined ? h.dir : h.face), G.t, pose, h.scale);
    // 정장이나 후드티에 붙은 털
    var fur = H.pro ? (H.proFur ? 2 : 0) : (S() && S().wearing === 'suit' ? S().fur : 0);
    if (fur > 0 && pose !== 'sit') furOn(c, h.x, h.y - 96 * h.scale / 2.35, fur, 1);
  }
  var FUR = [[-10, 2], [6, 8], [-3, 18], [9, 24], [-12, 30], [3, 34], [-6, 12], [11, 14], [0, 26]];
  function furOn(c, x, y, n, px) { for (var i = 0; i < Math.min(FUR.length, n * 3); i++) View.icon(c, 'fur', x + FUR[i][0], y + FUR[i][1], px || 1); }
  function gone() { var s = S(); if (H.goneDay !== s.day) { H.gone = {}; H.goneDay = s.day; } return H.gone; }
  function drawLiving(c) {
    var s = S(), t = G.t, held = H.held && H.held.id;
    View.bg(c, G, 'living');
    View.entranceDoor(c, LV.entrance, H.entranceOpen || 0);
    View.roomDoor(c, G, LV.door, H.mode === 'night' ? (s.door === 'open' ? 1 : 0) : 1, 'bedroom');
    View.windowView(c, G, LV.window, sky(), t, H.room === 'living' ? H.curtain : 0, sky() === 'storm');
    // 벽시계: 아침에는 나갈 시각, 저녁에는 잘 시각(11시)에 빨간 눈금
    View.wallClock(c, P.clock.x, P.clock.y, 13, s ? s.minute : 1200, H.pro ? 0 : s.phase === 'morning' ? Life.T.leaveBy : Life.T.bedtime);
    if (!H.pro) {
      View.floorDirt(c, s.floor, gone());
      if (s.pantry.coffee > 0 && !s.coffee) View.cup(c, P.coffee.x, P.coffee.y, .55);
      if (s.pantry.lunch > 0) View.lunchbox(c, P.lunch.x, P.lunch.y, .55);
      if (s.owned.feeder) View.feeder(c, P.feeder.x, P.feeder.y, .9);
      if (s.owned.tower) View.catTower(c, P.tower.x, P.tower.y, .95);
      if (!(H.clean && H.clean.kind === 'mop')) View.mop(c, P.mop.x, P.mop.y, 1);
      if (!(H.clean && H.clean.kind === 'sweep')) View.broom(c, P.broom.x, P.broom.y, 1);
      View.bag(c, P.bag.x, P.bag.y, 1.1);
      var ll = s.litter;
      View.litterBox(c, P.litter.x, P.litter.y, ll.poop, ll.sand, t);
      if (ll.poop > 0 && !(held === 'scoop' && H.held.full)) for (var i = 0; i < Math.min(3, ll.poop); i++) View.icon(c, 'poop', P.litter.x - 12 + i * 12, P.litter.y - 18, 1);
      if (held !== 'scoop') View.item(c, 'scoop', P.scoop.x, P.scoop.y, 1.1);
      if (s.pantry.sand > 0 && held !== 'sand') View.sandBag(c, P.sand.x, P.sand.y, 1);
      if (held !== 'toy' && !(H.toy && H.toy.caught)) { if (s.toy > 0) View.toy(c, P.toy.x, P.toy.y, t); else { View.r(c, P.toy.x - 7, P.toy.y - 4, 12, 4, '#9a8f86'); } }
      if (s.food.wet > 0 && held !== 'wet') View.item(c, 'wetFood', P.wet.x, P.wet.y, 1.05);
    }
    if (held !== 'food') View.foodBag(c, P.food.x, P.food.y, s.food.dry, 8);
    View.bowl(c, P.bowl.x, P.bowl.y, s.bowl, s.bowlKind, t);
    View.waterBowl(c, P.water.x, P.water.y, s.water ? (s.phase === 'morning' ? 1 : .55) : 0);
    if (held !== 'bottle') View.item(c, 'waterBottle', P.bottle.x, P.bottle.y, 1.1);
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
    View.bed(c, G, !!H.inBed, catOnBed, t, !H.inBed, !!H.awake);
    // 책상 위 노트북. 읽지 않은 고객 메모가 오면 봉투가 뜬다.
    if (!H.pro && (!H.packing || H.packed.laptop) && s.seen.packed) {
      View.item(c, 'laptop', P.laptop.x, P.laptop.y, .9);
      if (mailWaiting() && !night) View.icon(c, 'mail', P.laptop.x + 4, P.laptop.y - 50 + Math.sin(t * 4) * 3, 2);
    }
    if (H.packing) {
      if (!H.packed.laptop && !(H.held && H.held.id === 'laptop')) View.item(c, 'laptop', P.laptop.x, P.laptop.y, .9);
      if (!H.packed.charger && !(H.held && H.held.id === 'charger')) View.item(c, 'charger', P.charger.x, P.charger.y, .8);
      View.bag(c, P.bBag.x, P.bBag.y, 1.25);
    }
    if (!H.pro && s.owned.roller && !(H.held && H.held.id === 'roller')) View.item(c, 'roller', P.roller.x, P.roller.y, .9);
    var wearing = H.pro ? 'hoodie' : s.wearing;
    if (wearing !== 'suit' && !H.pro) View.hangerSuit(c, P.suitRack.x, P.suitRack.y, s.fur, t);
    if (wearing !== 'hoodie' || H.hoodieHung) { View.item(c, 'hoodie', P.hoodieRack.x, P.hoodieRack.y, 1.45); if (H.proFur && H.hoodieHung) furOn(c, P.hoodieRack.x, P.hoodieRack.y - 44, 2, 1); }
    var dr = View.roomDoor(c, G, BR.door, night ? H.door : 1, 'living');
    H.handle = { x: dr.hx, y: dr.hy };
    if (night && G.cat.room === 'living' && G.cat.visible && H.door > .5) { // 열린 문 너머 거실의 고양이
      View.cat(c, G, BR.door.x + 46, BR.door.y + BR.door.h - 4, -1, t, G.cat.pose === 'sleep' ? 'sleep' : 'sit', 1.2);
    }
    if (!H.inBed) {
      var actors = [{ y: G.hero.y, f: drawHero }, { y: G.cat.y, f: drawCat }];
      if (G.cat.room === 'bedroom' && H.catAct !== 'sleep') actors.sort(function (a, b) { return a.y - b.y; }).forEach(function (a) { a.f(c); });
      else drawHero(c);
    } else if (G.cat.room === 'bedroom' && H.catAct !== 'sleep') drawCat(c); // 침대로 오는 고양이
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
    else if (h.id === 'hand') View.item(c, 'hand', h.x, h.y + 10, 1.2);
    if (h.pouring) {
      if (h.id === 'food' || h.id === 'wet') Engine.puff({ x: h.x - 14, y: h.y - 4, kibble: true, life: .35, rise: 0 });
      if (h.id === 'bottle') Engine.puff({ x: h.x - 14, y: h.y - 2, splash: true, life: .35, rise: 0 });
      if (h.id === 'sand') Engine.puff({ x: h.x - 10, y: h.y, kibble: true, life: .35, rise: 0 });
    }
  }
  function draw(c) { if (H.room === 'bedroom') drawBedroom(c); else drawLiving(c); drawCloseUp(c); }

  // ---------- 크게 보기: 냉장고 돌봄 메모, 노트북 고객 메모 ----------
  function mailWaiting() { var s = S(); return !!s && !H.pro && s.cards.length > 0 && s.cards.some(function (id) { return !s.prepared[id]; }); }
  function paper(c, x, y, w, h, col) { View.box(c, x, y, w, h, col || '#fffaf0', '#2f2a33', 3); }
  function drawCloseUp(c) {
    var cu = H.closeUp; if (!cu) return;
    var s = S(), t = G.t;
    c.fillStyle = 'rgba(20,18,26,.72)'; c.fillRect(0, 0, 640, 360);
    if (cu.kind === 'memo') { // 냉장고에 붙여 둔 종이 한 장
      var note = Story.careNote(s.cat), x = 150, y = 24, w = 340, h = 312;
      paper(c, x, y, w, h, '#fff6d8');
      View.r(c, x + w / 2 - 18, y - 6, 36, 12, 'rgba(224,138,108,.85)'); // 테이프
      View.text(c, note.title, x + w / 2, y + 30, 17, '#2f2a33');
      note.rows.forEach(function (r, i) {
        var ry = y + 66 + i * 36;
        View.icon(c, r.icon, x + 28, ry - 4, 2);
        View.text(c, r.text, x + 52, ry, 12, '#3b3540', 'left');
      });
      return;
    }
    if (cu.kind === 'mail') { // 노트북 화면: 지점장님이 보낸 내일 고객 메모
      var mx = 92, my = 30, mw = 456, mh = 292;
      View.box(c, mx - 10, my - 10, mw + 20, mh + 20, '#3c3a44', '#2f2a33', 3);
      View.r(c, mx, my, mw, mh, '#f4f6fb');
      View.r(c, mx, my, mw, 26, '#5f86c8');
      View.icon(c, 'mail', mx + 18, my + 13, 2);
      View.text(c, '지점장님 · 내일 만날 고객님', mx + 34, my + 17, 12, '#fff', 'left');
      var n = s.cards.length, colW = mw / n;
      s.cards.forEach(function (id, i) {
        var info = Life.CLIENTS[id], cx = mx + colW * i + colW / 2, top = my + 44, open = s.prepared[id];
        if (i) View.r(c, mx + colW * i, top, 1, mh - 56, '#c8cedb');
        View.text(c, Story.CLIENT[id].name + ' 고객님', cx, top + 14, 15, '#2f2a33');
        if (!open) { View.icon(c, 'mail', cx, top + 100 + Math.sin(t * 4) * 2, 4); return; }
        View.icon(c, info.need === 'dental' ? 'tooth' : info.need, cx, top + 70, 3);
        View.text(c, Story.PRODUCT[info.need], cx, top + 112, 14, '#c0392b');
        wrapText(c, '“' + Story.HINT[info.need].say + '”', cx, top + 140, colW - 30, 12, '#3b3540');
        if (info.mark !== 'none') { View.icon(c, info.mark === 'cat' ? 'paw' : info.mark, cx - (colW - 40) / 2 + 8, top + 214, 1); wrapText(c, Story.MARK_NOTE[info.mark], cx + 10, top + 218, colW - 50, 11, '#7a3b30'); }
      });
    }
  }
  function wrapText(c, text, x, y, w, size, col) {
    c.font = size + "px 'NeoDunggeunmo', monospace";
    var line = '', lines = [];
    String(text).split('').forEach(function (ch) {
      if (c.measureText(line + ch).width > w && line) { lines.push(line); line = ch.trim() ? ch : ''; } else line += ch;
    });
    if (line) lines.push(line);
    lines.forEach(function (l, i) { View.text(c, l, x, y + i * (size + 5), size, col); });
  }

  // ---------- 끌어서 놓기 ----------
  function holder(id, opts) {
    opts = opts || {};
    return {
      start: function (d) { H.held = { id: id, x: d.x, y: d.y, tilt: 0 }; H.pour = 0; UI.sfx('tap'); if (opts.walk) G.hero.tx = opts.walk; if (opts.start) opts.start(d); },
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
  function pourer(id, target, ok, commit, walk) {
    var done = false;
    return holder(id, {
      target: target, walk: walk,
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

  // ---------- 주인공 몸짓 ----------
  function heroGo(x) { return Engine.walkTo(x); }
  // 그 자리로 걸어가서 잠깐 동작을 한다 (codex-v5 R6 돌봄 그림)
  function gesture(x, pose, dir, sec) {
    return heroGo(x).then(function () {
      G.hero.dir = dir; G.hero.pose = pose;
      return Engine.sleep(sec || .8);
    }).then(function () { G.hero.pose = null; });
  }

  // ---------- 돌봄 ----------
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
    spent(P.bowl, r.minutes);
    H.said[s.day + ':hungry'] = true;
    G.cat.tx = null; H.catNext = 0;
    if (H.onCare) H.onCare('feed');
    return gesture(P.bowl.x + 46, kind === 'wet' ? 'wetFood' : 'pourFood', -1, .9);
  }
  function feedTap(kind) { return function () { var s = S(); return feedCommit(kind, !!Life.feedBlock(s, kind)); }; }
  function waterCommit(blocked) {
    var s = S();
    if (blocked || s.water) { UI.sfx('bad'); return say([me('물은 아직 넉넉해.')]); }
    var r = Life.water(s);
    UI.sfx('water');
    spent(P.water, r.minutes);
    if (H.onCare) H.onCare('water');
    return gesture(P.water.x + 44, 'pourWater', -1, .9);
  }
  function doScoop() {
    var s = S();
    if (s.litter.poop <= 0) return say([me(Story.catLine('litterClean', s.cat))]).then(sandTalkAgain);
    return gesture(P.litter.x - 50, 'scoop', 1, .9).then(function () {
      var r = Life.scoop(s);
      UI.sfx('scoop');
      spent(P.litter, r.minutes, 50);
      H.said[s.day + ':litter'] = true;
      if (H.onCare) H.onCare('scoop');
      return sandTalk();
    });
  }
  function sandTalkAgain() { var s = S(); delete H.said[s.day + ':sand' + s.litter.sand]; return sandTalk(); }
  function scoopDrag() {
    var moved = 0;
    return holder('scoop', {
      start: function () { moved = 0; },
      move: function (d) {
        var s = S(), box = rect(P.litter.x - 30, P.litter.y - 34, 60, 36);
        if (inside(d, box) && s.litter.poop > 0) { moved += 4; if (moved > 24 && !H.held.full) { H.held.full = true; UI.sfx('scoop'); } }
      },
      end: function (d, h) {
        var s = S();
        if (!h.full) return null;
        var r = Life.scoop(s);
        spent(P.litter, r.minutes, 50);
        H.said[s.day + ':litter'] = true;
        if (H.onCare) H.onCare('scoop');
        return gesture(P.litter.x - 50, 'scoop', 1, .6).then(sandTalk);
      }
    });
  }
  function sandCommit() {
    var s = S(), r = Life.refill(s);
    if (!r.ok) {
      UI.sfx('bad');
      if (r.why === 'full') return say([me('모래는 아직 넉넉해. 거의 다 쓰면 그때 갈자.')]);
      return say([me(Story.catLine('noSand', s.cat))]);
    }
    UI.sfx('pour');
    spent(P.litter, r.minutes, 50);
    if (H.onCare) H.onCare('sand');
    return gesture(P.litter.x - 50, 'care', 1, .9);
  }
  function tapLitter() {
    var s = S();
    if (s.litter.poop > 0) return doScoop();
    if (s.litter.sand < Life.SAND_DAYS && Life.sandLow(s) && s.pantry.sand > 0) return sandCommit();
    return say([me(Story.catLine('litterClean', s.cat))]).then(sandTalkAgain);
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
        spent({ x: G.cat.x, y: G.cat.y }, r.minutes, 64);
        Engine.puff({ x: G.cat.x - 8, y: G.cat.y - 50, icon: 'heart', px: 1, life: 1.4 });
        if (H.onCare) H.onCare('pet');
        return once('purr', [me(Story.catLine('purr', s.cat))]);
      },
      cancel: function () { H.held = null; H.catAct = null; }
    };
  }
  // 커피: 아침이든 저녁이든 하루 한 잔
  function drinkCoffee() {
    var s = S();
    return heroGo(P.coffee.x + 30).then(function () {
      var r = Life.coffee(s); if (!r.ok) return null;
      UI.sfx('good'); G.hero.pose = 'back';
      Engine.puff({ x: P.coffee.x, y: P.coffee.y - 30, icon: 'bolt', text: '+1', px: 1 });
      spent({ x: P.coffee.x + 40, y: P.coffee.y }, r.minutes, 30);
      return Engine.sleep(.7).then(function () {
        G.hero.pose = null;
        if (r.late && !seen('lateCoffee')) return say([me('이 시간에 커피 마시면 잠이 잘 안 올 텐데...')]);
        return null;
      });
    });
  }
  function eatLunch() {
    var s = S();
    return heroGo(P.lunch.x + 30).then(function () {
      var r = Life.lunch(s); if (!r.ok) return null;
      UI.sfx('good'); Engine.puff({ x: P.lunch.x, y: P.lunch.y - 30, icon: 'bolt', text: '+1', px: 1 });
      spent({ x: P.lunch.x + 40, y: P.lunch.y }, r.minutes, 30);
      return null;
    });
  }
  // 집에서 하는 일이 막혔을 때 이유를 말한다
  var BLOCK_LINE = {
    play: { notHome: '지금은 출근 준비할 시간이야. 놀아 주는 건 저녁에.', hidden: 'hiddenToy', noToy: 'noToy', played: 'played' },
    rest: { notHome: '지금 누우면 지각이야.', full: '아직 쌩쌩해.', rested: '더 누워 있으면 잠들겠다. 자려면 침대로 가자.' },
    prep: { notHome: '고객 메모는 저녁에 읽어 두자.', noCard: '새 메일은 없네.' },
    sweep: { notHome: '청소는 퇴근하고 하자.', clean: '바닥은 깨끗해.' },
    mop: { notHome: '청소는 퇴근하고 하자.', clean: '바닥은 깨끗해.' }
  };
  function blockedLine(kind, why) {
    var s = S(), l = BLOCK_LINE[kind] && BLOCK_LINE[kind][why];
    if (!l) return null;
    if (kind === 'play' && why !== 'notHome') l = why === 'hidden' && s.phase === 'morning' ? Story.catLine('hiddenToyAm', s.cat) : Story.catLine(l, s.cat);
    UI.sfx('bad');
    return say([me(l)]);
  }
  // 장난감: 누른 채 흔들다가 멈추면 고양이가 덮친다
  function toyDrag() {
    var flips = 0, lastDir = 0, lastX = 0;
    return holder('toy', {
      start: function (d) {
        flips = 0; lastDir = 0; lastX = d.x;
        H.toy = { shaking: 0, ready: false, lastMove: G.t };
        G.cat.tx = null; H.catAct = 'play'; G.cat.pose = 'lookUp';
        if (G.hand && G.hand.shake) G.hand = null;
      },
      move: function (d) {
        var dx = d.x - lastX;
        if (Math.abs(dx) > 3) {
          var dir = dx > 0 ? 1 : -1;
          if (lastDir && dir !== lastDir) flips++;
          lastDir = dir; lastX = d.x; H.toy.lastMove = G.t;
        }
        H.held.sway = Math.max(-8, Math.min(8, dx * 2));
        H.toy.shaking = flips;
        if (flips >= 4) H.toy.ready = true;
      },
      end: function () {
        var t = H.toy; H.toy = null; H.catAct = null;
        if (t && !t.caught) G.hand = { shake: true, x: P.toy.x, y: P.toy.y - 30, period: 2, t0: G.t };
        setTimeout(function () { if (G.hand && G.hand.shake) G.hand = null; }, 2600);
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
      k.pose = t.ready ? 'play' : 'lookUp';
      if (Math.abs(k.x - h.x) > 90) { k.x += Math.sign(h.x - k.x) * 60 * G.dt; }
      var calm = G.t - (t.lastMove || G.t);
      if (t.ready && calm > .45) { t.pounce = true; t.t0 = G.t; t.fromX = k.x; t.fromY = k.y; UI.sfx('meow'); }
    } else {
      var q = Math.min(1, (G.t - t.t0) / .45);
      k.x = t.fromX + (h.x - t.fromX) * q;
      k.y = t.fromY - Math.sin(q * Math.PI) * 50 + (Math.min(336, h.y + 20) - t.fromY) * q * .2;
      if (q >= 1 && !t.caught) {
        t.caught = true; k.y = 336;
        var s = S(), r = Life.act(s, 'play');
        G.drag = null; H.held = null; H.toy = null; H.catAct = 'play';
        if (r.ok) {
          UI.sfx('good'); Engine.puff({ x: k.x, y: k.y - 50, icon: 'heart', px: 1, life: 1.4 }); spent({ x: k.x + 30, y: k.y }, r.minutes, 64);
          if (r.broke) queueLine({ key: 'toyBroke' });
        }
        setTimeout(function () { H.catAct = null; }, 1600);
        if (H.onAct) H.onAct('play');
      }
    }
  }
  // 돌돌이: 정장 위를 문지르면 털이 떨어진다
  function rollerDrag() {
    var rubbed = 0;
    return holder('roller', {
      start: function () { rubbed = 0; H.rollHits = 0; },
      move: function (d) {
        var s = S(), target = s.wearing === 'suit' ? around({ x: G.hero.x, y: G.hero.y }, 66, 108) : rect(P.suitRack.x - 26, P.suitRack.y - 62, 52, 66);
        if (inside(d, target) && s.fur > 0) { rubbed += 6; if (Math.floor(rubbed / 30) > H.rollHits) { H.rollHits++; Engine.puff({ x: d.x + 10, y: d.y, icon: 'fur', px: 1, life: .6, rise: -10 }); } }
      },
      end: function () {
        var s = S();
        if (rubbed < 120 || !s.fur) return null;
        var r = Life.roll(s);
        if (r.ok) { UI.sfx('good'); spent({ x: P.suitRack.x, y: P.suitRack.y }, r.minutes, 80); }
        return null;
      }
    });
  }
  // 청소: 빗자루(밀대)를 잡고 끄는 쪽으로 주인공이 쓸며 간다. 바닥의 털(먼지)이 다 없어지면 끝.
  function cleanDrag(kind) {
    var key = kind === 'sweep' ? 'fur' : 'dust';
    return {
      start: function (d) {
        if (Life.doBlock(S(), kind)) return;
        H.clean = { kind: kind }; G.hero.tx = Math.max(140, Math.min(540, d.x)); UI.sfx('tap');
      },
      move: function (d) { if (H.clean) G.hero.tx = Math.max(140, Math.min(540, d.x)); },
      end: function () {
        if (!H.clean) return null;
        G.hero.tx = null;
        var s = S(), left = View.dirtSpots(s.floor, key).filter(function (p) { return !gone()[p.key]; });
        H.clean = null;
        if (left.length) return null;
        var r = Life.act(s, kind);
        if (!r.ok) return null;
        UI.sfx('good'); spent({ x: G.hero.x, y: G.hero.y }, r.minutes, 110);
        if (H.onAct) H.onAct(kind);
        return null;
      },
      cancel: function () { H.clean = null; G.hero.tx = null; }
    };
  }
  function tickClean() {
    var c = H.clean, s = S(); if (!c || !s) return;
    var key = c.kind === 'sweep' ? 'fur' : 'dust', hx = G.hero.x + G.hero.dir * 22, g = gone();
    View.dirtSpots(s.floor, key).forEach(function (p) {
      if (g[p.key] || Math.abs(p.x - hx) > 22) return;
      g[p.key] = true;
      Engine.puff({ x: p.x, y: p.y - 4, icon: key === 'fur' ? 'fur' : null, px: 1, life: .5, rise: 8 });
    });
    if (G.t > (c.sfxT || 0)) { c.sfxT = G.t + .35; UI.sfx(c.kind === 'sweep' ? 'scoop' : 'water'); }
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
        var s = S(), r = Life.act(s, 'curtain');
        if (!r.ok) return null;
        UI.sfx('good');
        var k = G.cat; k.visible = true; k.room = H.room; k.x = 486; k.y = 262; H.catAct = 'lap';
        return say([narr(Story.catLine('stormOut', s.cat))]).then(function () {
          G.hero.tx = null; G.hero.x = 430; G.hero.y = 262; G.hero.pose = 'sit'; k.x = 452; k.y = 238;
          return Engine.sleep(1.2);
        }).then(function () { G.hero.pose = null; G.hero.y = 334; G.hero.x = 420; H.catAct = null; k.y = 336; k.x = 470; if (H.onAct) H.onAct('curtain'); });
      }
    };
  }
  // 밤의 방문: 손잡이를 잡고 오른쪽으로 끌면 열리고 왼쪽으로 밀면 닫힌다
  function doorDrag() {
    var x0 = 0, a0 = 0;
    return {
      start: function (d) { x0 = d.x; a0 = H.door; H.doorDrag = true; if (G.hand && G.hand.door) G.hand = null; },
      move: function (d) { H.door = Math.max(0, Math.min(1, a0 + (d.x - x0) / (BR.door.w * .6))); },
      end: function () {
        H.doorDrag = false;
        var open = H.door > .5;
        H.door = open ? 1 : 0;
        Life.setDoor(S(), open); UI.sfx('door');
        if (H.onDoor) H.onDoor(open);
        return null;
      }
    };
  }

  // ---------- 누를 수 있는 곳 (뒤에 넣은 것이 먼저 잡힌다: 고양이는 맨 앞에 넣는다) ----------
  function catSpot(list, room, minY) {
    var s = S(), k = G.cat;
    if (!k.visible || k.room !== room || catHidden() || k.y <= minY) return;
    list.push({ id: 'cat', x: k.x - 22, y: k.y - 46, w: 44, h: 48, chips: cost([cMin(Life.T.pet)].concat(s.petted ? [] : [cHeart(1)])), drag: petDrag(), glow: false });
  }
  function closeSpot() { return [{ id: 'closeUp', x: 0, y: 0, w: 640, h: 360, glow: false, tap: closeUp }]; }
  function hotLiving() {
    var s = S(), list = [], m = H.mode;
    if (H.closeUp) return closeSpot();
    if (m === 'night') return [];
    list.push({ id: 'lDoor', x: P.lDoor.x, y: P.lDoor.y, w: P.lDoor.w, h: P.lDoor.h, tap: function () { return goRoom('bedroom'); } });
    if (!H.pro) {
      list.push({ id: 'entrance', x: P.entrance.x, y: P.entrance.y, w: P.entrance.w, h: P.entrance.h, chips: m === 'weekend' && !s.shopped ? [cMin(Life.T.shopTrip)] : null, tap: tapEntrance });
      list.push({ id: 'memo', x: P.memo.x, y: P.memo.y, w: P.memo.w, h: P.memo.h, tap: openMemo });
      list.push({ id: 'sofa', x: P.sofa.x, y: P.sofa.y, w: P.sofa.w, h: P.sofa.h, chips: Life.doBlock(s, 'rest') ? null : [cMin(Life.T.rest), cBolt(1)], tap: rest });
    }
    // 밥과 물: 끌어서 붓거나, 눌러서 바로
    var bowlR = rect(P.bowl.x - 24, P.bowl.y - 56, 48, 60), waterR = rect(P.water.x - 24, P.water.y - 56, 48, 60);
    list.push({ id: 'bowl', x: bowlR.x + 4, y: P.bowl.y - 22, w: 40, h: 24, tap: feedTap(s.food.dry > 0 || !s.food.wet ? 'dry' : 'wet') });
    list.push({ id: 'waterBowl', x: waterR.x + 4, y: P.water.y - 22, w: 40, h: 24, tap: function () { return waterCommit(); } });
    catSpot(list, 'living', 200); // 고양이는 그릇보다 먼저 잡히고, 사료 봉지·물병보다는 나중에 잡힌다
    list.push({ id: 'food', x: P.food.x - 17, y: P.food.y - 36, w: 34, h: 38, chips: cost([cMin(Life.T.feed)]), tap: feedTap('dry'),
      drag: pourer('food', bowlR, function () { return !Life.feedBlock(s, 'dry'); }, function (bl) { return feedCommit('dry', bl); }, P.bowl.x + 46) });
    if (!H.pro && s.food.wet > 0) list.push({ id: 'wet', x: P.wet.x - 14, y: P.wet.y - 28, w: 28, h: 30, chips: [cMin(Life.T.feed), cHeart(1)], tap: feedTap('wet'),
      drag: pourer('wet', bowlR, function () { return !Life.feedBlock(s, 'wet'); }, function (bl) { return feedCommit('wet', bl); }, P.bowl.x + 46) });
    list.push({ id: 'bottle', x: P.bottle.x - 12, y: P.bottle.y - 36, w: 24, h: 38, chips: cost([cMin(Life.T.water)]), tap: function () { return waterCommit(); },
      drag: pourer('bottle', waterR, function () { return !s.water; }, function (bl) { return waterCommit(bl); }, P.water.x + 44) });
    if (!H.pro) {
      list.push({ id: 'litter', x: P.litter.x - 28, y: P.litter.y - 34, w: 56, h: 36, chips: s.litter.poop > 0 ? [cMin(Life.T.scoop)] : null, tap: tapLitter });
      list.push({ id: 'scoop', x: P.scoop.x - 13, y: P.scoop.y - 26, w: 26, h: 30, chips: s.litter.poop > 0 ? [cMin(Life.T.scoop)] : null, tap: doScoop, drag: s.litter.poop > 0 ? scoopDrag() : null });
      if (s.pantry.sand > 0) list.push({ id: 'sand', x: P.sand.x - 15, y: P.sand.y - 34, w: 30, h: 36, chips: [cMin(Life.T.sand)], tap: sandCommit,
        drag: pourer('sand', rect(P.litter.x - 32, P.litter.y - 60, 64, 64), function () { return s.litter.sand < Life.SAND_DAYS; }, function (bl) { return sandCommit(bl); }, P.litter.x - 50) });
      if (s.pantry.coffee > 0 && !s.coffee) {
        var cc = [cMin(Life.T.coffee), cBolt(1)];
        if (s.phase !== 'morning' && s.minute >= Life.T.workEnd) cc.push({ icon: 'zzz', text: '−1', cls: 'bad' });
        list.push({ id: 'coffee', x: P.coffee.x - 12, y: P.coffee.y - 26, w: 24, h: 28, chips: cc, tap: drinkCoffee });
      }
      if (s.pantry.lunch > 0 && s.energy < Life.MAX) list.push({ id: 'lunch', x: P.lunch.x - 13, y: P.lunch.y - 24, w: 26, h: 26, chips: [cMin(Life.T.lunch), cBolt(1)], tap: eatLunch });
      var playWhy = Life.doBlock(s, 'play');
      list.push({ id: 'toy', x: P.toy.x - 18, y: P.toy.y - 24, w: 36, h: 28, chips: playWhy ? null : [cMin(Life.T.play), cHeart(1)],
        tap: function () { return playWhy ? blockedLine('play', playWhy) : (G.hand = { shake: true, x: P.toy.x, y: P.toy.y - 30, period: 2, t0: G.t }, null); }, drag: playWhy ? null : toyDrag() });
      ['sweep', 'mop'].forEach(function (kind) {
        var why = Life.doBlock(s, kind), p = kind === 'sweep' ? P.broom : P.mop;
        list.push({ id: kind, x: p.x - 12, y: p.y - 48, w: 24, h: 50, chips: why ? null : [cMin(Life.T[kind])],
          tap: function () { return why ? blockedLine(kind, why) : say([me(kind === 'sweep' ? '빗자루를 잡고 바닥을 쓸자.' : '밀대를 잡고 얼룩을 닦자.')]); }, drag: why ? null : cleanDrag(kind) });
      });
      if (Life.doBlock(s, 'curtain') === null && catHidden()) list.push({ id: 'curtain', x: LV.window.x - 6, y: LV.window.y, w: 40, h: LV.window.h, chips: [cMin(Life.T.curtain), cHeart(1)], drag: curtainDrag() });
    }
    if (H.searching) list = list.concat(searchSpots('living'));
    return list;
  }
  function hotBedroom() {
    var s = S(), list = [], m = H.mode;
    if (H.closeUp) return closeSpot();
    if (m === 'night') {
      if (!H.doorLocked) list.push({ id: 'handle', x: H.handle.x - 24, y: H.handle.y - 34, w: 46, h: 66, drag: doorDrag(), glow: true });
      return list;
    }
    catSpot(list, 'bedroom', 300);
    list.push({ id: 'bDoor', x: P.bDoor.x, y: P.bDoor.y, w: P.bDoor.w, h: P.bDoor.h, tap: function () { return goRoom('living'); } });
    if (H.packing) {
      if (!H.packed.laptop) list.push({ id: 'laptop', x: P.laptop.x - 26, y: P.laptop.y - 24, w: 52, h: 26, drag: packDrag('laptop') });
      if (!H.packed.charger) list.push({ id: 'charger', x: P.charger.x - 14, y: P.charger.y - 20, w: 28, h: 22, drag: packDrag('charger') });
      return list;
    }
    if (!H.pro) {
      if (s.wearing !== 'suit') list.push({ id: 'suit', x: P.suitRack.x - 24, y: P.suitRack.y - 64, w: 48, h: 68, chips: morning() ? [cMin(Life.T.dress)] : null, tap: dress });
      if (s.owned.roller && s.fur > 0) list.push({ id: 'roller', x: P.roller.x - 14, y: P.roller.y - 22, w: 28, h: 24, chips: [cMin(Life.T.roller)], drag: rollerDrag() });
      if (s.seen.packed) list.push({ id: 'laptop', x: P.laptop.x - 28, y: P.laptop.y - 30, w: 56, h: 32, chips: mailWaiting() && home() ? [cMin(Life.T.prep)] : null, tap: openMail });
      if (home() || H.bedOK) list.push({ id: 'bed', x: P.bed.x, y: P.bed.y, w: P.bed.w, h: P.bed.h, chips: home() ? [{ icon: 'zzz', text: '' }, cBolt(Math.max(0, Life.sleepGain(s.minute))) ] : null, tap: tapBed });
      if (Life.doBlock(s, 'curtain') === null && catHidden()) list.push({ id: 'curtain', x: BR.window.x - 6, y: BR.window.y, w: 50, h: BR.window.h, chips: [cMin(Life.T.curtain), cHeart(1)], drag: curtainDrag() });
    } else if (H.bedOK) list.push({ id: 'bed', x: P.bed.x, y: P.bed.y, w: P.bed.w, h: P.bed.h, tap: tapBed });
    if (H.pro && H.rackOK) list.push({ id: 'rack', x: 420, y: 118, w: 96, h: 140, tap: hangHoodie });
    if (H.searching) list = list.concat(searchSpots('bedroom'));
    return list;
  }
  function hot() { if (H.lock) return []; return H.room === 'bedroom' ? hotBedroom() : hotLiving(); }
  function walkable(p) {
    if (H.mode === 'night' || H.closeUp || H.clean) return null;
    return Math.max(H.room === 'living' ? 130 : 230, Math.min(H.room === 'living' ? 560 : 520, p.x));
  }

  // ---------- 행동 ----------
  function goRoom(room) {
    var toDoor = H.room === 'living' ? 584 : 570;
    return heroGo(toDoor).then(function () { G.hero.pose = 'back'; UI.sfx('door'); return Engine.sleep(.15); }).then(function () { return Engine.fade(1, .2); }).then(function () {
      G.hero.pose = null;
      H.room = room; G.hero.x = room === 'living' ? 584 : 560; G.hero.dir = -1; G.hero.tx = room === 'living' ? 520 : 470;
      if (G.cat.room !== room && !catHidden() && G.cat.room !== 'none') G.cat.follow = G.t + .8;
      return Engine.fade(0, .2);
    }).then(function () { if (room === 'living') return noticeNeeds(); });
  }
  function tapEntrance() {
    var s = S();
    if (H.mode === 'morning') {
      if (s.wearing !== 'suit') { UI.sfx('bad'); return say([me('정장부터 입어야지.')]); }
      return heroGo(96).then(function () { G.hero.pose = 'back'; resolveWait('leave'); });
    }
    if (H.mode === 'weekend') {
      if (Life.doBlock(s, 'shop') || s.shopped) return say([me('오늘 장은 다 봤어.')]);
      return heroGo(96).then(function () { resolveWait('shop'); });
    }
    return say([me('오늘은 이제 나갈 일 없어.')]);
  }
  function tapBed() {
    if (H.pro) return heroGo(200).then(function () { resolveWait('bed'); });
    var s = S();
    if (s && Life.napFirst(s)) return heroGo(240).then(nap);
    return heroGo(240).then(function () { resolveWait('bed'); });
  }
  // 주말 낮에 누우면 오후 3시까지 낮잠을 잔다
  function nap() {
    var s = S();
    return Engine.fade(1, .4).then(function () {
      H.inBed = true; G.hero.visible = false;
      var r = Life.nap(s);
      return Engine.fade(0, .4).then(function () {
        Engine.puff({ x: 122, y: 220, icon: 'zzz', px: 1, life: 1.6 });
        return Engine.sleep(1.2);
      }).then(function () {
        H.inBed = false; G.hero.visible = true; G.hero.x = 240;
        spent({ x: 240, y: 262 }, r.minutes, 90);
        return say([me('깜빡 낮잠을 잤다. 벌써 오후 3시네.'), me(Life.josa(s.cat, 'subject') + ' 저녁 줄 시간이다.')]);
      });
    });
  }
  function dress() {
    var s = S();
    if (!morning()) return say([me('정장은 내일 아침에 입자.')]);
    return heroGo(P.suitRack.x - 4).then(function () {
      G.hero.pose = 'back';
      return Engine.sleep(.5);
    }).then(function () {
      G.hero.pose = null;
      var r = Life.dress(s);
      if (!r.ok) return null;
      UI.sfx('page');
      spent({ x: P.suitRack.x, y: P.suitRack.y }, r.minutes, 80);
      var lines = [];
      if (s.today.notes.indexOf('floorFur') >= 0 && !seen('floorFur')) lines.push(me('바닥에 굴러다니던 털이 바짓단에 잔뜩 붙었다.'));
      if (s.fur > 0 && !s.seen.furSuit) { s.seen.furSuit = true; lines.push(me(s.owned.roller ? '정장에 털이 붙었네.' : '정장에 털이 좀 붙었네. 뭐, 괜찮겠지.')); }
      return lines.length ? say(lines) : null;
    });
  }
  function rest() {
    var s = S(), why = Life.doBlock(s, 'rest');
    if (why) return blockedLine('rest', why);
    return heroGo(440).then(function () {
      G.hero.x = 440; G.hero.y = 262; G.hero.pose = 'sit'; G.hero.face = 1;
      var r = Life.act(s, 'rest');
      Engine.puff({ x: 440, y: 180, icon: 'zzz', px: 1, life: 1.6 });
      spent({ x: 480, y: 262 }, r.minutes, 90);
      return Engine.sleep(1.4).then(function () {
        G.hero.pose = null; G.hero.y = 334; G.hero.face = undefined;
        if (r.ok && H.onAct) H.onAct('rest');
      });
    });
  }
  function openMemo() {
    return heroGo(P.memo.x + P.memo.w / 2).then(function () {
      G.hero.pose = 'back'; UI.sfx('page');
      H.closeUp = { kind: 'memo' };
      var s = S(); s.seen.careMemo = true;
      return null;
    });
  }
  function openMail() {
    var s = S();
    if (!home()) return blockedLine('prep', 'notHome');
    if (!s.cards.length) return blockedLine('prep', 'noCard');
    return heroGo(P.laptop.x).then(function () {
      G.hero.pose = 'back';
      var read = mailWaiting(), r = read ? Life.act(s, 'prep') : null;
      UI.sfx('page');
      H.closeUp = { kind: 'mail' };
      if (r && r.ok) { H.closeUp.minutes = r.minutes; if (H.onAct) H.onAct('prep'); }
      return null;
    });
  }
  function closeUp() { var cu = H.closeUp; H.closeUp = null; G.hero.pose = null; if (cu && cu.minutes) spent({ x: P.laptop.x, y: P.laptop.y }, cu.minutes, 40); if (H.onClose) H.onClose(); return null; }
  function packDrag(id) {
    return holder(id, {
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
      spent({ x: sp.x + sp.w / 2, y: sp.y }, r.minutes, 6);
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
  // 11시가 넘으면 한 번 알려 주고 침대 쪽을 가리킨다. 억지로 재우지는 않는다.
  function lateTick() {
    var s = S();
    if (!home() || H.mode === 'night' || s.minute < Life.T.bedtime || H.said[s.day + ':late']) return;
    queueLine({ key: 'late', text: '벌써 11시가 넘었네. 늦게 잘수록 내일 아침에 체력이 덜 찰 텐데.' });
    if (H.onLate) H.onLate();
  }
  // 피곤하면 가끔 하품한다
  function yawnTick() {
    var s = S(), h = G.hero;
    if (!s || H.pro || !h.visible || h.walking || H.mode === 'night' || !Life.tired(s) || G.t < H.yawnT) return;
    H.yawnT = G.t + 6 + Math.random() * 3;
    Engine.puff({ x: h.x + 10, y: h.y - 150, icon: 'zzz', px: 1, life: 1.4 });
  }
  function tick(dt) { catTick(dt); tickPour(); tickToy(); tickClean(); lateTick(); yawnTick(); flushLines(); if (H.extraTick) H.extraTick(dt); }
  function enter(room, opts) {
    opts = opts || {};
    H.room = room; H.mode = opts.mode || H.mode; H.clean = null;
    if (opts.heroX !== undefined) { G.hero.x = opts.heroX; G.hero.tx = null; }
    G.hero.y = 334; G.hero.pose = null; G.hero.visible = true; G.hero.face = undefined; G.hero.scale = 2.35;
    if (opts.catRoom) { G.cat.room = opts.catRoom; G.cat.x = opts.catX || 400; G.cat.y = opts.catY || 336; G.cat.tx = null; }
    Engine.setScene({ draw: draw, hot: hot, tick: tick, walk: walkable, place: room });
  }
  return {
    P: P, H: H, enter: enter, wait: wait, resolveWait: resolveWait, goRoom: goRoom, noticeNeeds: noticeNeeds, needs: needs, draw: draw,
    drawLiving: drawLiving, drawBedroom: drawBedroom, sky: sky, once: once, seen: seen, cMin: cMin, cBolt: cBolt, cHeart: cHeart,
    openMemo: openMemo, openMail: openMail, furOn: furOn, mailWaiting: mailWaiting
  };
}());
