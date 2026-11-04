/* 이야기 흐름: 처음 화면, 프롤로그, 4/12~4/24의 하루, 밤의 문, 고양이 시점, 결산, 엔딩. */
var Game = (function () {
  'use strict';
  var KEY = 'catdoor-codex-v5-claude-save';
  var H = Home.H, P = Home.P;
  function $(id) { return document.getElementById(id); }
  function say(l) { return UI.say(l); }
  function me(t) { return { who: 'me', text: t }; }
  function narr(t) { return { who: 'narr', text: t }; }
  function S() { return G.s; }

  // ---------- 말하는 사람 ----------
  function who(line) {
    var s = G.s, w = line.who;
    if (w === 'narr') return { name: '', face: null };
    if (w === 'me') return { name: (G.pro && G.pro.active ? G.pro.me : s && s.me) || '', face: { variant: s && !(G.pro && G.pro.active) && s.wearing === 'suit' ? 'suit' : 'hoodie' } };
    if (w === 'lead') return { name: Story.NAMES.lead, face: { variant: 'lead' } };
    if (w === 'peer') return { name: Story.NAMES.peer, face: { variant: 'peer' } };
    if (w === 'cat') return { name: (G.pro && G.pro.active ? G.pro.cat : s && s.cat) || '', face: { variant: 'cat' } };
    if (w === 'client') { var cl = Story.CLIENT[line.id]; return { name: cl.name + ' ' + (cl.title || '고객님'), face: { variant: cl.look, hue: cl.tint } }; }
    return { name: '', face: null };
  }
  function face(canvas, f) {
    var c = canvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    c.fillStyle = '#e9dfcc'; c.fillRect(0, 0, canvas.width, canvas.height);
    View.portrait(c, G, f.variant, 0, 0, canvas.width, canvas.height, f.hue);
  }

  // ---------- 상단 표시 ----------
  function hudView() {
    var s = G.s, pro = G.pro && G.pro.active;
    if (!s || pro) return { show: G.hudShow, wallet: G.pro ? G.pro.wallet : 0, energy: 0, hearts: 0, food: { dry: 0, wet: 0 }, minute: 0 };
    var d = Life.day(s), morning = s.phase === 'morning';
    return { show: G.hudShow, date: d.date + ' ' + d.wd, minute: s.minute, due: morning ? Life.T.leaveBy : 0, late: morning && s.minute > Life.T.leaveBy,
      wallet: s.wallet, food: s.food, energy: s.energy, hearts: s.hearts };
  }
  function hudAll(on) { G.hudShow = { date: on, clock: on, wallet: on, food: on, energy: on, hearts: on }; }

  // ---------- 저장 ----------
  function checkpoint() { try { localStorage.setItem(KEY, Life.save(G.s)); } catch (e) { /* 저장소를 못 쓰면 건너뜀 */ } }
  function loadSave() { try { return Life.load(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } }

  // ---------- 처음 화면 ----------
  var titleCat = { x: 200, dir: 1, pose: 'walk', until: 0 };
  function drawTitle() {
    var cv = $('titleCanvas'); if (!cv || $('titleScreen').hidden) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== 640 * dpr) { cv.width = 640 * dpr; cv.height = 360 * dpr; }
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;
    var t = G.t;
    if (!G.images.r4Scenes) { c.fillStyle = '#1f1e25'; c.fillRect(0, 0, 640, 360); return; }
    View.bg(c, G, 'living');
    View.entranceDoor(c, View.L.living.entrance, .55 + Math.sin(t * .6) * .05);
    View.windowView(c, G, View.L.living.window, 'dusk', t, 0, false);
    View.roomDoor(c, G, View.L.living.door, .82, 'bedroom', [40, 60, 92, 230], false);
    // 문 앞을 오가는 고양이 (문틀에 가리지 않게 문 앞쪽 바닥으로만)
    var k = titleCat;
    if (t > k.until) {
      if (k.pose === 'walk') { k.pose = Math.random() < .5 ? 'sit' : 'lookUp'; k.until = t + 2 + Math.random() * 2; }
      else { k.pose = 'walk'; k.until = t + 2.5 + Math.random() * 2; if (k.x > 420) k.dir = -1; else if (k.x < 140) k.dir = 1; else k.dir = Math.random() < .5 ? -1 : 1; }
    }
    if (k.pose === 'walk') { k.x += k.dir * 40 * (G.dt || .016); if (k.x > 460 || k.x < 120) { k.dir *= -1; } }
    View.shadow(c, k.x, 337, 15);
    View.cat(c, G, k.x, 336, k.dir, t, k.pose, 1.9);
    c.fillStyle = 'rgba(20,18,30,.25)'; c.fillRect(0, 0, 640, 360);
  }

  // ---------- 프롤로그 ----------
  function proState(me, cat) {
    var s = Life.create(me, cat || '보리');
    s.phase = 'pro'; s.food.dry = Life.DRY_MEALS; s.bowl = 'empty'; s.meal = 'pm'; s.fed = { am: true, pm: false }; s.water = false;
    return s;
  }
  async function prologue(name) {
    G.pro = { me: name, cat: '', wallet: 12000, active: true };
    G.s = proState(name);
    hudAll(false);
    G.fade = 1;
    await UI.black(Story.opening);
    // 이불 속, 진동
    H.pro = true; H.inBed = true; H.mode = 'pro'; H.skyOverride = 'winter';
    Home.enter('bedroom', { mode: 'pro', heroX: 220, catRoom: 'none' });
    G.cat.visible = false; H.lock = true;
    await Engine.fade(0, .9);
    await Engine.sleep(.8);
    var rej = Story.phone.rejection(name);
    await UI.phoneWait({ from: rej.from, time: rej.time, preview: rej.preview, body: rej.body }, '10:42');
    await say([me('떨어졌구나. 하하....'), me('그래, 내가 그럼 그렇지.')]);
    H.lock = false;
    await Engine.fade(1, .7);
    H.inBed = false;
    await rainyStreet();
    await proShelf();
    await proHome();
    await montage();
  }
  async function rainyStreet() {
    var st = { umbrella: 0, tilted: false, cat: { x: 520, visible: false, pose: 'fear', dir: -1 }, go: false };
    G.hero.x = 40; G.hero.dir = 1; G.hero.tx = null;
    var umb = function () { return { x: G.hero.x + 12, y: 200 }; };
    Work.street({
      winter: true,
      draw: function (c) {
        var h = G.hero, t = G.t, k = st.cat;
        if (k.visible) {
          View.shadow(c, k.x, 345, 15);
          View.cat(c, G, k.x + (k.pose === 'fear' ? Math.sin(t * 30) * .8 : 0), 344, k.dir, t, k.pose, 1.75);
          if (!st.tilted) for (var i = 0; i < 5; i++) { var yy = (t * 220 + i * 37) % 60; View.r(c, k.x - 18 + i * 9, 290 + yy, 1, 6, '#9fc3e8'); }
        }
        View.shadow(c, h.x, 343, 20);
        View.person(c, G, h.x, 342, 'hoodie', h.walking ? h.dir : 1, t, h.walking ? 'walk' : 'stand', 2.35);
        // 우산은 손에 든 채로 머리 위에. 기울이면 고양이 쪽으로 넘어간다
        var a = h.walking ? -.06 + Math.sin(t * 9) * .03 : -.06 + st.umbrella * 1.0;
        c.save(); c.translate(h.x + 12, 292); c.rotate(a); View.item(c, 'umbrella', 0, 0, 2.1); c.restore();
        if (st.tilted) for (var j = 0; j < 4; j++) { var y2 = (t * 220 + j * 41) % 70; View.r(c, h.x - 24 + j * 10, 200 + y2, 1, 6, '#9fc3e8'); }
      },
      hot: function () {
        var list = [];
        if (st.cat.visible && !st.tilted && !G.hero.walking) {
          var u = umb();
          list.push({ id: 'umbrella', x: u.x - 60, y: u.y - 50, w: 120, h: 150, drag: {
            start: function (d) { st.x0 = d.x; if (G.hand) G.hand = null; },
            move: function (d) { st.umbrella = Math.max(0, Math.min(1, (d.x - st.x0) / 70)); },
            end: function () { if (st.umbrella > .6) { st.umbrella = 1; st.tilted = true; } else st.umbrella = 0; return null; }
          } });
        }
        if (st.ready) list.push({ id: 'shopDoor', x: Work.SHOPDOOR.x, y: Work.SHOPDOOR.y, w: Work.SHOPDOOR.w, h: Work.SHOPDOOR.h, tap: function () { st.go = true; } });
        return list;
      }
    });
    await Engine.fade(0, .7);
    UI.sfx('rain');
    var walking = Engine.walkTo(330, { speed: 80 });
    await say([me('나도 할 만큼 했어. 더 이상은…')]);
    await walking;
    G.hero.speed = 170;
    UI.sfx('meow');
    await say([narr('슈퍼 앞에서 울음소리가 들린다.')]);
    st.cat.visible = true;
    await Engine.sleep(.5);
    await say([me('고양이?')]);
    await Engine.walkTo(430, { speed: 90 });
    G.hero.speed = 170;
    await say([me('쫄딱 젖었잖아....')]);
    var u = umb();
    G.hand = { x: u.x - 10, y: u.y - 10, tx: u.x + 70, ty: u.y + 10, period: 2, t0: G.t };
    await Engine.until(function () { return st.tilted; });
    G.hand = null; st.cat.pose = 'sit';
    await Engine.sleep(.6);
    UI.sfx('meow');
    await say([{ who: 'cat', text: '야옹~' }]);
    st.cat.dir = -1; st.cat.pose = 'walk';
    await new Promise(function (resolve) {
      var from = st.cat.x, to = G.hero.x + 26, t0 = G.t;
      (function step() { var q = Math.min(1, (G.t - t0) / .9); st.cat.x = from + (to - from) * q; if (q < 1) setTimeout(step, 30); else resolve(); }());
    });
    st.cat.pose = 'rub'; UI.sfx('purr');
    await Engine.sleep(1.3);
    await say([me('우리 집에서 털 좀 말리고 갈래?')]);
    st.ready = true;
    G.guide = { x: 508, y: 160, dir: 'down' };
    await Engine.until(function () { return st.go; });
    G.guide = null;
    await Engine.walkTo(508);
    await Engine.fade(1, .4);
  }
  async function proShelf() {
    G.hudShow.wallet = true;
    while (true) {
      var pick = await Work.shop({ pro: true });
      if (pick === 'charcoal') {
        await Engine.fade(1, .7);
        G.hudShow.wallet = false;
        await UI.gameOver();
        G.hudShow.wallet = true;
        continue;
      }
      if (pick === 'dry') { G.pro.wallet -= 12000; UI.sfx('spend'); await Engine.sleep(.8); break; }
    }
    await Engine.walkTo(90);
    await Engine.fade(1, .5);
    G.hudShow.wallet = false;
  }
  async function proHome() {
    var s = G.s;
    H.pro = true; H.mode = 'pro'; H.inBed = false; H.skyOverride = 'winter'; H.proFur = false; H.hoodieHung = false;
    Home.enter('living', { mode: 'pro', heroX: 70, catRoom: 'living', catX: 130 });
    G.cat.visible = true; G.cat.pose = 'sit';
    await Engine.fade(0, .6);
    await Engine.walkTo(360);
    var cat = await UI.askName();
    G.pro.cat = cat; s.cat = cat;
    UI.sfx('meow');
    // 밥
    G.hand = { x: P.food.x, y: P.food.y - 18, tx: P.bowl.x, ty: P.bowl.y - 30, period: 2.2, t0: G.t };
    await Engine.until(function () { return s.fed.pm; });
    G.hand = null;
    s.seen['line:ate'] = true;
    await Engine.until(function () { return H.catAct === 'eat'; });
    await say([narr(Story.catLine('ate', cat))]);
    await say([me('물도 담아주자.')]);
    G.hand = { x: P.bottle.x, y: P.bottle.y - 18, tx: P.water.x, ty: P.water.y - 30, period: 2.2, t0: G.t };
    await Engine.until(function () { return s.water; });
    G.hand = null;
    await Engine.until(function () { return H.catAct !== 'eat'; });
    // 쓰다듬기
    await Engine.sleep(.6);
    G.cat.tx = null;
    G.hand = { stroke: true, x: G.cat.x - 22, y: G.cat.y - 26, dx: 44, period: 1.6, t0: G.t, follow: true };
    var follow = setInterval(function () { if (G.hand && G.hand.follow) { G.hand.x = G.cat.x - 22; G.hand.y = G.cat.y - 26; } }, 60);
    await Engine.until(function () { return s.petted; });
    clearInterval(follow); G.hand = null;
    await Engine.until(function () { return !UI.busy(); });
    await Engine.sleep(.4);
    H.proFur = true;
    await say([me('후드티에 털이 잔뜩 붙었네.'), me('졸려? 이제 자러 가자.')]);
    G.guide = { x: 585, y: 40, dir: 'down' };
    await Engine.until(function () { return H.room === 'bedroom'; });
    G.guide = null;
    H.rackOK = true; G.guide = { x: 467, y: 108, dir: 'down' };
    await Home.wait(['hung']);
    G.guide = null;
    await say([me('이제 자야 할 시간이다. 너무 고된 하루였어.')]);
    H.bedOK = true; G.guide = { x: 117, y: 188, dir: 'down' };
    await Home.wait(['bed']);
    G.guide = null; H.bedOK = false;
    // 첫날 밤은 같이 잔다
    H.inBed = true; G.hero.visible = false; H.mode = 'night'; H.door = 1;
    G.cat.room = 'bedroom'; G.cat.x = 560; G.cat.y = 336;
    await Engine.catTo(150, { y: 300 });
    H.catAct = 'sleep'; UI.sfx('purr');
    await Engine.sleep(2);
    UI.sfx('sleep');
    await Engine.fade(1, 1.4);
    H.catAct = null; H.inBed = false; G.hero.visible = true; H.proFur = false; H.hoodieHung = false;
  }
  async function montage() {
    var s = G.s;
    await UI.black(['혹독한 계절이 지나고…'], { keep: true });
    var shots = [
      { draw: function (c) { View.bg(c, G, 'streetWinter'); for (var i = 0; i < 40; i++) { var x = (i * 53 + G.t * 20) % 640, y = (i * 37 + G.t * 40) % 360; View.r(c, x, y, 2, 2, '#fff'); } } },
      { draw: function (c) { H.room = 'living'; H.mode = 'pro'; H.skyOverride = 'winter'; G.hero.visible = false; G.cat.room = 'living'; G.cat.x = 470; G.cat.y = 228; G.cat.pose = 'sleep'; G.cat.visible = true; Home.drawLiving(c); } },
      { draw: function (c) { H.room = 'bedroom'; H.skyOverride = 'day'; H.mode = 'pro'; G.cat.room = 'bedroom'; G.cat.x = 150; G.cat.y = 336; G.cat.pose = 'groom'; Home.drawBedroom(c); } }
    ];
    for (var i = 0; i < shots.length; i++) {
      Engine.setScene({ draw: shots[i].draw });
      UI.blackOff(); G.fade = 1;
      await Engine.fade(0, 1.3);
      await Engine.sleep(1.5);
      await Engine.fade(1, 1.3);
    }
    UI.blackOff();
    await UI.black(['그다음 해 봄'], { keep: true });
    UI.blackOff();
    // 봄, 같은 휴대폰 화면으로 합격 문자
    G.hero.visible = true;
    H.pro = true; H.mode = 'pro'; H.skyOverride = 'day';
    Home.enter('bedroom', { mode: 'pro', heroX: 330, catRoom: 'bedroom', catX: 140, catY: 336 });
    H.lock = true;
    await Engine.fade(0, .8);
    var off = Story.phone.offer(G.pro.me);
    await UI.phoneWait({ from: off.from, time: off.time, preview: off.preview, body: off.body }, '4:10');
    H.lock = false;
    await Engine.fade(1, .6);
    // 4/12 일요일 저녁부터 진짜 하루가 시작된다
    var seen = s.seen;
    G.s = Life.create(G.pro.me, G.pro.cat);
    G.s.seen['line:ate'] = !!seen['line:ate'];
    G.pro.active = false; H.pro = false; H.skyOverride = null;
  }

  // ---------- 하루 ----------
  function placeCatMorning() {
    var s = G.s, k = G.cat, note = s.today && s.ledger.length ? s.ledger[s.ledger.length - 1] : null;
    k.tx = null; k.visible = !s.hidden;
    if (s.hidden) { k.room = 'none'; return; }
    if (s.door === 'open') { k.room = 'bedroom'; k.x = 150; k.y = 336; k.pose = 'groom'; }
    else { k.room = 'living'; k.x = 520; k.y = 336; k.pose = 'sit'; }
  }
  async function dayZero() {
    var s = G.s;
    G.hudShow = { date: true, clock: false, wallet: true, food: true, energy: false, hearts: false };
    H.mode = 'evening'; H.inBed = false; H.closeUp = null; H.curtain = 0;
    Home.enter('bedroom', { mode: 'evening', heroX: 300, catRoom: 'bedroom', catX: 140, catY: 336 });
    await Engine.fade(0, .5);
    if (!s.seen.packed) {
      await say(Story.DAY_INTRO[0]);
      H.packing = true; H.packed = { laptop: false, charger: false };
      G.hand = { x: P.laptop.x, y: P.laptop.y - 8, tx: P.bBag.x, ty: P.bBag.y - 24, period: 2.2, t0: G.t };
      var stopHand = setInterval(function () { if (G.hand && H.packed.laptop) { G.hand = null; clearInterval(stopHand); } }, 100);
      await Home.wait(['packed']);
      clearInterval(stopHand); G.hand = null; H.packing = false; s.seen.packed = true;
      UI.sfx('good');
    }
    checkpoint();
    await evening();
  }
  // 저녁 (평일 저녁과 주말 낮을 같이 쓴다). 잠들면 끝난다.
  async function evening() {
    var s = G.s;
    H.mode = s.phase === 'weekend' ? 'weekend' : 'evening';
    H.onSlot = function () {
      if (s.slots <= 0) Engine.run(function () { return say([me(s.phase === 'weekend' ? '벌써 밤이네. 이제 자자.' : '이제 잘 시간이다.')]).then(guideBed); });
    };
    if (!s.seen.slots && s.phase === 'evening') {
      s.seen.slots = true;
      G.hudShow.energy = true; G.hudShow.hearts = true;
      if (H.room !== 'living') { await Engine.fade(1, .25); Home.enter('living', { mode: 'evening', heroX: 520 }); G.cat.room = 'living'; G.cat.x = 470; await Engine.fade(0, .25); }
      G.guide = { x: P.clock.x, y: P.clock.y + 44, dir: 'up' };
      await say([me('저녁에는 두 가지쯤 할 수 있겠다.')]);
      G.guide = null; G.outlineAll = true;
      setTimeout(function () { G.outlineAll = false; }, 2600);
    }
    if (s.slots <= 0) guideBed();
    while (true) {
      var r = await Home.wait(['bed', 'shop']);
      if (r === 'shop') { await weekendShop(); continue; }
      G.guide = null;
      var slept = await night();
      if (slept) return;
    }
  }
  function guideBed() {
    if (H.room === 'bedroom') G.guide = { x: 117, y: 188, dir: 'down' };
    else G.guide = { x: 585, y: 40, dir: 'down' };
    var chk = setInterval(function () {
      if (!G.guide) { clearInterval(chk); return; }
      if (H.mode === 'night') { G.guide = null; clearInterval(chk); return; }
      G.guide = H.room === 'bedroom' ? { x: 117, y: 188, dir: 'down' } : { x: 585, y: 40, dir: 'down' };
    }, 300);
  }
  async function arriveHome() {
    var s = G.s;
    H.mode = 'evening'; H.inBed = false; H.curtain = 0; H.closeUp = null; H.catAct = null;
    Home.enter('living', { mode: 'evening', heroX: 70, catRoom: 'living', catX: 150 });
    G.hero.dir = 1;
    G.cat.visible = !s.hidden;
    await Engine.fade(0, .4);
    if (Life.day(s).storm) { UI.sfx('thunder'); G.flash = .9; }
    await Engine.walkTo(180);
    if (!s.hidden) await say([narr(Story.catLine('waited', s.cat))]);
    var alone = s.today.hearts.filter(function (h) { return h.key === 'alone'; })[0];
    if (alone) await say([me(Story.catLine('alone', s.cat))]);
    if (s.hidden) { UI.sfx('thunder'); G.flash = .8; await say([narr(Story.catLine('storm', s.cat))]); }
    await Home.noticeNeeds();
  }
  // 밤: 침대에 누워 문을 고른다. 뒤로 가면 저녁으로 돌아간다.
  async function night() {
    var s = G.s, prevMode = H.mode;
    H.mode = 'night'; H.inBed = true; H.closeUp = null; G.hero.visible = false;
    if (H.room !== 'bedroom') { await Engine.fade(1, .25); }
    Home.enter('bedroom', { mode: 'night' });
    G.hero.visible = false;
    H.door = s.door === 'open' ? 1 : 0;
    var k = G.cat;
    function catFollowDoor(open) {
      if (s.hidden) { k.visible = false; return; }
      k.visible = true;
      if (open) { k.room = 'bedroom'; H.catAct = 'sleep'; UI.sfx('purr'); }
      else { k.room = 'living'; H.catAct = null; k.pose = 'sit'; }
    }
    catFollowDoor(s.door === 'open');
    H.onDoor = catFollowDoor;
    await Engine.fade(0, .35);
    if (!s.seen.doorHint) {
      s.seen.doorHint = true;
      G.hand = { x: H.handle.x, y: H.handle.y, tx: H.handle.x - 50, ty: H.handle.y, period: 2.2, t0: G.t, door: true };
    }
    var btn = $('actionButton'), back = $('backButton');
    btn.textContent = '이대로 잠들기'; btn.hidden = false; back.hidden = false;
    var choice = await new Promise(function (resolve) {
      btn.onclick = function () { if (!UI.busy() && !G.drag) resolve('sleep'); };
      back.onclick = function () { if (!UI.busy() && !G.drag) resolve('back'); };
    });
    btn.hidden = true; back.hidden = true; btn.onclick = null; back.onclick = null; G.hand = null; H.onDoor = null;
    if (choice === 'back') {
      H.mode = prevMode; H.inBed = false; H.catAct = null; G.hero.visible = true; G.hero.x = 230; G.hero.y = 334;
      if (k.room === 'living' || !k.visible) { k.room = 'living'; }
      Home.enter('bedroom', { mode: prevMode });
      return false;
    }
    UI.sfx('sleep');
    Life.toBed(s);
    var opt = {};
    if (Life.needsPOV(s)) opt.cat = await catPOV();
    var t = Life.sleep(s, opt);
    await Engine.fade(1, .7);
    H.catAct = null; H.inBed = false;
    if (s.ended === 'emptyBowl') return true;
    await UI.receipt(s, t);
    G.wake = Life.morning(s);
    checkpoint();
    return true;
  }
  // 문을 닫고 잔 밤, 놀아 주지 않았다면 고양이가 되어 문 앞에 선다
  async function catPOV() {
    var s = G.s, pov = { pick: null, scratch: 0 };
    await Engine.fade(1, .6);
    await UI.black([Life.josa(s.cat, 'of') + ' 밤']);
    var door = View.L.living.door;
    Engine.setScene({
      place: 'pov',
      draw: function (c) {
        var t = G.t;
        View.bg(c, G, 'living');
        View.roomDoor(c, G, door, pov.crack || 0, 'bedroom', [40, 60, 92, 230], true);
        View.windowView(c, G, View.L.living.window, 'night', t, 0, false);
        View.nightTint(c, .62);
        if (pov.crack) View.lampGlow(c, door.x + 10, door.y + 120, 60, .3);
        var x = pov.pick === 'wait' ? pov.x : door.x + 24, pose = pov.pick === 'wait' ? 'sleep' : pov.scratching ? 'scratch' : 'sit';
        View.cat(c, G, x, 350, -1, t, pose, 3);
        // 가장자리 어둡게 (고양이 눈높이)
        var g = c.createRadialGradient(400, 230, 120, 400, 230, 420); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
        c.fillStyle = g; c.fillRect(0, 0, 640, 360);
      },
      hot: function () {
        if (pov.pick) return [];
        return [
          { id: 'povDoor', x: door.x - 6, y: door.y, w: door.w + 12, h: door.h, chips: [Home.cBolt(-1)], tap: function () {
            pov.scratching = true; UI.sfx('scratch');
            return Engine.sleep(.5).then(function () { UI.sfx('scratch'); return Engine.sleep(.6); }).then(function () { UI.sfx('scratch'); pov.crack = .12; return Engine.sleep(.9); }).then(function () { pov.pick = 'scratch'; });
          } },
          { id: 'povSofa', x: 380, y: 168, w: 162, h: 96, chips: [Home.cHeart(-1)], tap: function () { pov.x = 470; pov.pick = 'wait'; return Engine.sleep(1.2); } }
        ];
      }
    });
    await Engine.fade(0, .6);
    await Engine.until(function () { return pov.pick; });
    await Engine.sleep(pov.pick === 'wait' ? 1.4 : .6);
    return pov.pick;
  }
  async function morning() {
    var s = G.s, note = Story.morningNote(G.wake ? G.wake.note : null, s.cat);
    G.wake = null;
    H.mode = 'morning'; H.inBed = false; H.closeUp = null; H.curtain = 0; H.catAct = null; H.searching = false; H.searched = {};
    G.hudShow = { date: true, clock: true, wallet: true, food: true, energy: true, hearts: true };
    Home.enter('bedroom', { mode: 'morning', heroX: 230 });
    placeCatMorning();
    await Engine.fade(0, .5);
    var lines = [];
    if (note) lines.push(narr(note));
    var acc = s.today.hearts.filter(function (h) { return h.key === 'accident'; })[0];
    if (acc) lines.push(narr(Story.HEART.accident + '. 치우느라 15분이 걸렸다.'));
    (Story.DAY_INTRO[s.day] || []).forEach(function (l) { lines.push({ who: l.who, text: l.text }); });
    if (lines.length) await say(lines);
    if (s.hidden) { await say([me(Story.catLine('hidden', s.cat))]); H.searching = true; }
    await Home.wait(['leave']);
    H.searching = false;
    Life.leaveHome(s);
    await Engine.fade(1, .4);
    await Work.commute(false);
    await Work.workDay();
    if (Life.day(s).group) await Work.groupEvening();
    if (Life.day(s).final) { await evaluation(); return; }
    await Work.leaveOffice();
    await Work.commute(true);
    var choice = await Work.walkHome();
    if (choice === 'shop') { await Work.shop(); await Engine.fade(1, .3); }
    Life.arriveHome(s);
    checkpoint();
    await arriveHome();
    await evening();
  }
  async function weekend() {
    var s = G.s, note = Story.morningNote(G.wake ? G.wake.note : null, s.cat);
    G.wake = null;
    H.mode = 'weekend'; H.inBed = false; H.closeUp = null; H.curtain = 0; H.catAct = null;
    G.hudShow = { date: true, clock: true, wallet: true, food: true, energy: true, hearts: true };
    Home.enter('bedroom', { mode: 'weekend', heroX: 230 });
    placeCatMorning();
    await Engine.fade(0, .5);
    var lines = [];
    if (note) lines.push(narr(note));
    var acc = s.today.hearts.filter(function (h) { return h.key === 'accident'; })[0];
    if (acc) lines.push(narr(Story.HEART.accident + '.'));
    (Story.DAY_INTRO[s.day] || []).forEach(function (l) { lines.push({ who: l.who, text: l.text }); });
    if (lines.length) await say(lines);
    await evening();
  }
  async function weekendShop() {
    var s = G.s, r = Life.slot(s, 'shop');
    if (!r.ok) return;
    await Engine.fade(1, .35);
    Work.street({ hot: null, walk: null });
    G.hero.x = 560; G.hero.dir = -1;
    await Engine.fade(0, .35);
    await Engine.walkTo(508);
    await Engine.fade(1, .3);
    await Work.shop();
    await Engine.fade(1, .3);
    Home.enter('living', { mode: 'weekend', heroX: 80 });
    G.cat.room = 'living';
    await Engine.fade(0, .35);
    if (H.onSlot) H.onSlot('shop');
  }
  async function evaluation() {
    var s = G.s;
    Life.leaveOffice(s);
    UI.sfx('coin');
    Work.office();
    await Engine.fade(0, .3);
    await say(Story.evaluation(s));
    Work.Wk.chart = { fly: false, t0: G.t };
    await Engine.sleep(1.6);
    Work.Wk.chart = null;
    Life.evaluate(s);
    checkpoint();
    await Engine.fade(1, .6);
  }

  // ---------- 엔딩 ----------
  function drawEnding(key) {
    var cv = $('endingCanvas'), c = cv.getContext('2d'), s = G.s;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = 640 * dpr; cv.height = 360 * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;
    var close = key === 'both' || key === 'catStays' || key === 'soso';
    H.room = 'living'; H.mode = 'evening'; H.inBed = false; H.closeUp = null; H.curtain = 0; H.held = null;
    G.hero.visible = true; G.hero.x = 130; G.hero.y = 334; G.hero.pose = null; G.hero.dir = 1;
    G.cat.visible = key !== 'emptyBowl'; G.cat.room = 'living';
    if (close) { G.cat.x = 190; G.cat.y = 336; G.cat.pose = 'purr'; G.cat.dir = -1; }
    else if (key === 'clumsy') { G.cat.x = 470; G.cat.y = 228; G.cat.pose = 'groom'; }
    else { G.cat.x = 500; G.cat.y = 228; G.cat.pose = 'sleep'; }
    s.wearing = 'suit';
    if (key === 'emptyBowl') { s.bowl = 'empty'; H.entranceOpen = 0; G.hero.visible = false; }
    Home.drawLiving(c);
  }
  function endingScreen() {
    var s = G.s, e = Life.ending(s), body = Story.ENDING[e.key].body(s), mem = Story.memory(s, e.key);
    $('gameScreen').hidden = true; $('ending').hidden = false;
    drawEnding(e.key);
    $('endingTitle').textContent = Story.endingTitle(e.key, s);
    $('endingBody').innerHTML = body.map(function (l) { return '<p>' + UI.esc(l) + '</p>'; }).join('') + (mem ? '<p class="memory">' + UI.esc(mem) + '</p>' : '');
    // 가계부와 실적
    var rows = s.ledger.map(function (t) {
      var d = Life.DAYS[t.day], inn = t.earned.reduce(function (a, x) { return a + x.amount; }, 0), out = t.spent.reduce(function (a, x) { return a + x.amount; }, 0);
      return '<tr><td>' + UI.esc(d.date + ' ' + d.wd) + '</td><td class="n">' + (inn ? '+' + Life.won(inn) : '') + '</td><td class="n">' + (out ? '−' + Life.won(out) : '') + '</td><td class="n">' + (t.stickers.length ? t.stickers.map(function () { return UI.img('sticker', 1); }).join('') : '') + '</td></tr>';
    }).join('');
    var max = Math.max(Life.GOAL + 2, s.contracts), bars = s.ledger.map(function (t) { return '<i style="height:' + Math.round(100 * (t.total || 0) / max) + '%"></i>'; }).join('');
    $('ledger').innerHTML = '<h3>' + UI.img('coin', 1) + ' 가계부</h3><table>' + rows + '</table><div class="chart"><span class="goal" style="bottom:' + Math.round(100 * Life.GOAL / max) + '%"></span>' + bars + '</div><p>' + UI.esc('계약 ' + s.contracts + '건 / 목표 ' + Life.GOAL + '건') + '</p>';
    // 고양이 일기
    var days = s.diary.map(function (d) {
      var day = Life.DAYS[d.day];
      return '<div class="diary-day"><small>' + UI.esc(day.date) + '</small><span>' + UI.img('zzz', 1, d.together ? '' : 'off') + UI.img('bowl', 1, d.meals >= 2 || (d.meals >= 1 && (day.final)) ? '' : d.meals ? 'half' : 'off') + UI.img('mouse', 1, d.played ? '' : 'off') + '</span></div>';
    }).join('');
    $('diary').innerHTML = '<h3>' + UI.img('paw', 1) + ' ' + UI.esc(Life.josa(s.cat, 'of') + ' 일기') + '</h3><div class="diary-grid">' + days + '</div>';
    $('epilogueButton').onclick = function () {
      $('ending').hidden = true;
      UI.black(Story.epilogue(s)).then(function () { $('ending').hidden = false; });
    };
    $('restartButton').onclick = function () { clearSave(); location.reload(); };
  }

  // ---------- 큰 흐름 ----------
  async function mainLoop() {
    while (G.s && !G.s.ended) {
      var s = G.s;
      if (s.phase === 'evening' && s.day === 0) await dayZero();
      else if (s.phase === 'morning') await morning();
      else if (s.phase === 'weekend') await weekend();
      else if (s.phase === 'evening') { await arriveHome(); await evening(); }
      else { s.phase = 'evening'; }
    }
    if (G.s && G.s.ended === 'emptyBowl') { G.fade = 1; }
    endingScreen();
  }

  function startGame(fn) {
    $('titleScreen').hidden = true; $('gameScreen').hidden = false;
    Engine.resize();
    G.fade = 1;
    ready.then(fn).catch(function (e) { console.error(e); });
  }
  var ready;
  function boot() {
    UI.init(); Engine.init(); UI.setSpeakers(who, face);
    UI.phoneSeed([]);
    ready = Engine.loadAssets();
    setInterval(function () { if (!$('gameScreen').hidden) UI.hud(hudView()); }, 120);
    (function titleLoop() { drawTitle(); if (!$('titleScreen').hidden) requestAnimationFrame(titleLoop); }());
    var saved = loadSave();
    $('continueButton').hidden = !saved;
    $('startButton').onclick = function () {
      var name = Life.cleanName($('playerName').value, '김신입');
      clearSave();
      startGame(function () { return prologue(name).then(function () { checkpoint(); return mainLoop(); }); });
    };
    $('continueButton').onclick = function () {
      var s = loadSave(); if (!s) return;
      G.s = s; G.pro = { me: s.me, cat: s.cat, wallet: 0, active: false };
      UI.phoneSeed([Story.phone.offer(s.me), Story.phone.rejection(s.me)].map(function (m) { return { from: m.from, time: m.time, preview: m.preview, body: m.body }; }));
      startGame(function () { if (s.ended) { endingScreen(); return null; } return mainLoop(); });
    };
    $('playerName').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('startButton').click(); });
    // 메뉴
    var confirmRestart = false;
    $('menuButton').onclick = function () { $('menu').hidden = false; $('menuStatus').textContent = ''; confirmRestart = false; $('menuRestart').textContent = '처음부터 다시'; };
    $('menuResume').onclick = function () { $('menu').hidden = true; };
    $('menuSave').onclick = function () { $('menuStatus').textContent = G.s && !(G.pro && G.pro.active) ? '저장했어요. 이어서 하면 ' + Life.day(G.s).date + ' ' + (G.s.phase === 'morning' ? '아침' : G.s.phase === 'weekend' ? '낮' : '저녁') + '부터예요.' : '프롤로그가 끝나면 저장할 수 있어요.'; };
    $('menuTitle').onclick = function () { location.reload(); };
    $('menuRestart').onclick = function () {
      if (!confirmRestart) { confirmRestart = true; $('menuRestart').textContent = '한 번 더 누르면 처음부터'; return; }
      clearSave(); location.reload();
    };
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
  // 시험용: 프롤로그를 건너뛰고 원하는 날에서 시작한다 (브라우저 자동 시험에서만 쓴다)
  function testStart(fn) {
    $('titleScreen').hidden = true; $('gameScreen').hidden = false; Engine.resize();
    return ready.then(fn);
  }
  return { checkpoint: checkpoint, loadSave: loadSave, KEY: KEY, mainLoop: mainLoop, endingScreen: endingScreen, testStart: testStart,
    steps: { prologue: prologue, rainyStreet: rainyStreet, proShelf: proShelf, proHome: proHome, montage: montage, dayZero: dayZero, morning: morning, evening: evening, night: night, catPOV: catPOV, arriveHome: arriveHome, weekend: weekend } };
}());
