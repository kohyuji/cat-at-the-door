/* 이야기 흐름: 처음 화면, 프롤로그, 4/12~4/24의 하루, 밤의 문, 고양이 시점, 결산, 엔딩. */
var Game = (function () {
  'use strict';
  var KEY = 'catdoor-v6-save'; // 같은 github.io 주소의 다른 판(/codex-v5-claude/ 등)과 저장이 섞이지 않게
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
    if (w === 'owner') return { name: Story.NAMES.owner, face: { variant: 'customerC', hue: 200 } };
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
    var due = morning ? Life.T.leaveBy : Life.homeTime(s) ? Life.T.bedtime : 0;
    return { show: G.hudShow, date: d.date + ' ' + d.wd, minute: s.minute, due: due, dueKind: morning ? 'leave' : 'bed', late: !!due && s.minute > due,
      commute: Life.T.commute, arrive: s.minute + Life.T.commute,
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
    H.pro = true; H.inBed = true; H.awake = true; H.mode = 'pro'; H.skyOverride = 'winter';
    Home.enter('bedroom', { mode: 'pro', heroX: 220, catRoom: 'none' });
    G.cat.visible = false; G.cat.room = 'none'; H.lock = true;
    await Engine.fade(0, .9);
    await Engine.sleep(.8);
    var rej = Story.phone.rejection(name);
    await UI.phoneWait({ from: rej.from, time: rej.time, preview: rej.preview, body: rej.body }, '10:42');
    await say([me('떨어졌구나. 하하....'), me('그래, 내가 그럼 그렇지.')]);
    H.lock = false;
    await Engine.fade(1, .7);
    H.inBed = false; H.awake = false;
    await rainyStreet();
    await proShelf();
    await proHome();
    await montage();
  }
  async function rainyStreet() {
    var st = { umbrella: 0, tilted: false, cat: { x: 520, visible: false, pose: 'fear', dir: -1 }, go: false };
    G.hero.x = 40; G.hero.dir = 1; G.hero.tx = null;
    var umb = function () { return { x: G.hero.x + 16, y: 190 }; };
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
        View.person(c, G, h.x, 342, 'hoodie', 1, t, h.walking ? 'umbrellaWalk' : 'umbrella', 2.35);
        // 우산은 손에 든 채로 머리 위에. 기울이면 고양이 쪽으로 넘어간다 (주인공과 같은 픽셀 크기)
        var a = h.walking ? 0 : st.umbrella * 1.0;
        PixelArt.umbrella(c, h.x + (h.walking ? 6 : 16), h.walking ? 262 : 258, a, View.HERO_PX);
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
    // 우산 아래에서 고양이가 울고, 주인공이 젖은 고양이에게 말을 건다
    await say([{ who: 'cat', text: '야옹~' }, me('너도 참 기구한 신세로구나.')]);
    st.cat.dir = -1; st.cat.pose = 'walk';
    await new Promise(function (resolve) {
      var from = st.cat.x, to = G.hero.x + 26, t0 = G.t;
      (function step() { var q = Math.min(1, (G.t - t0) / .9); st.cat.x = from + (to - from) * q; if (q < 1) setTimeout(step, 30); else resolve(); }());
    });
    st.cat.pose = 'rub'; UI.sfx('purr');
    await Engine.sleep(1.3);
    st.ready = true;
    G.guide = { x: 508, y: 160, dir: 'down' };
    await Engine.until(function () { return st.go; });
    G.guide = null;
    await Engine.walkTo(508);
    await Engine.fade(1, .4);
  }
  async function proShelf() {
    G.hudShow.wallet = true;
    var first = true;
    while (true) {
      // 계산대의 사장님에게 고른 것을 내밀고 값을 치른다
      var pick = await Work.shop({ pro: true, intro: first ? [narr('원래 사려던 번개탄 옆에 건사료가 눈에 띄었다.')] : null });
      first = false;
      if (pick === 'charcoal') {
        await Engine.fade(1, .7);
        G.hudShow.wallet = false;
        await UI.gameOver();
        G.pro.wallet = 12000;
        G.hudShow.wallet = true;
        continue;
      }
      if (pick === 'dry') { await say([{ who: 'owner', text: '고양이 키우세요? 비 오는데 조심히 가요.' }]); await Engine.sleep(.3); break; }
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
    await Engine.walkTo(420);
    var cat = await UI.askName();
    G.pro.cat = cat; s.cat = cat;
    s.seen['line:ate'] = true; // 밥 먹는 줄은 아래에서 한 번만 말한다
    UI.sfx('meow');
    // 밥
    G.hand = { x: P.food.x, y: P.food.y - 18, tx: P.bowl.x, ty: P.bowl.y - 30, period: 2.2, t0: G.t };
    await Engine.until(function () { return s.fed.pm; });
    G.hand = null;
    await Engine.until(function () { return H.catAct === 'eat'; });
    await say([narr(Story.catLine('ate', cat))]);
    await say([me('물도 담아주자.')]);
    G.hand = { x: P.bottle.x, y: P.bottle.y - 18, tx: P.water.x, ty: P.water.y - 30, period: 2.2, t0: G.t };
    await Engine.until(function () { return s.water; });
    G.hand = null;
    await Engine.until(function () { return H.catAct !== 'eat'; });
    // 쓰다듬기
    await Engine.sleep(.4);
    // 물병과 겹치지 않는 빈 바닥에 앉힌 뒤 쓰다듬기를 보여 준다
    H.catAct = null;
    await Engine.catTo(352, { y: 336 });
    G.cat.dir = 1; G.cat.pose = 'sit'; H.catAct = 'still';
    await say([me('젖은 털을 쓰다듬어 줄까.')]);
    G.hand = { stroke: true, x: G.cat.x - 26, y: G.cat.y - 26, dx: 52, period: 1.3, t0: G.t, follow: true };
    var follow = setInterval(function () { if (G.hand && G.hand.follow) { G.hand.x = G.cat.x - 26; G.hand.y = G.cat.y - 26; } }, 60);
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
    H.bedOK = true; G.guide = { x: 122, y: 212, dir: 'down' };
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
    Home.enter('bedroom', { mode: 'evening', heroX: 300, catRoom: 'bedroom', catX: 420, catY: 336 });
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
    // 첫 출근 전날 밤: 지점장님이 이 일이 무슨 일인지 문자로 알려 준다
    if (!s.seen.bossText) {
      s.seen.bossText = true;
      var bt = Story.phone.boss(s.me);
      await UI.phoneWait({ from: bt.from, time: bt.time, preview: bt.preview, body: bt.body }, '7:20');
      await say([me('고객님 걱정을 듣고 맞는 보험을 권하는 일... 잘할 수 있을까.')]);
    }
    // 냉장고에 붙여 둔 돌봄 메모: 고양이와 나의 하루 규칙을 종이 한 장으로
    if (!s.seen.careMemo) {
      await say([me('참, 냉장고에 붙여 둔 ' + Life.josa(s.cat, 'of') + ' 메모도 다시 봐 두자.')]);
      await guideTo(function () { return H.room === 'living' ? { x: P.memo.x + 20, y: P.memo.y - 2, dir: 'down' } : { x: 585, y: 40, dir: 'down' }; },
        function () { return H.closeUp && H.closeUp.kind === 'memo'; });
      await Engine.until(function () { return !H.closeUp; });
    }
    // 처음 놀아 주기: 쥐돌이를 잡고 흔들다가, 멈추면 고양이가 덮친다 (손이 그 모양을 보여 준다)
    if (!s.seen.firstPlay && !s.played) {
      s.seen.firstPlay = true;
      await say([me(Life.josa(s.cat, 'call') + ', 쥐돌이 놀이 할까?')]);
      await new Promise(function (resolve) {
        var chk = setInterval(function () {
          if (s.played) { clearInterval(chk); G.hand = null; G.guide = null; resolve(); return; }
          if (UI.busy()) return;
          if (H.room !== 'living') { G.guide = { x: 585, y: 40, dir: 'down' }; return; }
          G.guide = null;
          if (!G.drag && !G.hand) G.hand = { shake: true, x: P.toy.x, y: P.toy.y - 30, period: 2.4, t0: G.t, firstPlay: true };
        }, 150);
      });
      await Engine.until(function () { return !G.acting; });
    }
    checkpoint();
    await evening();
  }
  // 조건이 맞을 때까지 화살표로 가리킨다 (방을 옮기면 화살표도 따라간다)
  function guideTo(where, done) {
    return new Promise(function (resolve) {
      var chk = setInterval(function () {
        if (done()) { clearInterval(chk); G.guide = null; resolve(); return; }
        if (!UI.busy()) G.guide = where();
      }, 120);
    });
  }
  // 저녁 (평일 저녁과 주말 낮을 같이 쓴다). 침대에 누워 잠들면 끝난다.
  async function evening() {
    var s = G.s;
    H.mode = s.phase === 'weekend' ? 'weekend' : 'evening';
    H.onLate = guideBed; H.onAct = null;
    G.hudShow.clock = true;
    if (!s.seen.eveClock && s.phase === 'evening') {
      s.seen.eveClock = true;
      G.hudShow.energy = true; G.hudShow.hearts = true;
      if (H.room !== 'living') { await Engine.fade(1, .25); Home.enter('living', { mode: 'evening', heroX: 300 }); G.cat.room = 'living'; G.cat.x = 470; await Engine.fade(0, .25); }
      UI.point($('hudClock'));
      await say([me('11시 전에는 자야 내일 아침이 덜 힘들겠지.'), me('그 전까지 뭘 할지는 내 마음이다.')]);
      UI.point(null); G.outlineAll = true;
      setTimeout(function () { G.outlineAll = false; }, 2600);
    }
    if (s.minute >= Life.T.bedtime) guideBed();
    while (true) {
      var r = await Home.wait(['bed', 'shop']);
      if (r === 'shop') { await goShop(); continue; }
      G.guide = null;
      var slept = await night();
      if (slept) return;
    }
  }
  function guideBed() {
    var spot = function () { return H.room === 'bedroom' ? { x: 122, y: 212, dir: 'down' } : { x: 585, y: 40, dir: 'down' }; };
    G.guide = spot();
    var chk = setInterval(function () {
      if (H.mode === 'night') { G.guide = null; clearInterval(chk); return; }
      if (!G.guide) { clearInterval(chk); return; }
      G.guide = spot();
    }, 300);
  }
  async function arriveHome() {
    var s = G.s;
    H.mode = 'evening'; H.inBed = false; H.curtain = 0; H.closeUp = null; H.catAct = null; H.searching = false; H.searched = {};
    Home.enter('living', { mode: 'evening', heroX: 70, catRoom: 'living', catX: 150 });
    G.hero.dir = 1;
    G.cat.visible = !s.hidden;
    G.hudShow.clock = true;
    await Engine.fade(0, .4);
    var storm = Life.day(s).storm && s.hidden && !s.stormDone;
    if (storm) { UI.sfx('thunder'); G.flash = .9; }
    await Engine.walkTo(180);
    var lonely = s.today.hearts.filter(function (h) { return h.key === 'alone' || h.key === 'aloneTower'; })[0];
    if (!s.hidden) await say([narr(Story.catLine(lonely && lonely.key === 'aloneTower' ? 'towerWatch' : 'waited', s.cat))]);
    if (lonely && lonely.key === 'alone' && !s.locked) await say([me(Story.catLine('alone', s.cat))]);
    if (storm) {
      // 천둥에 숨은 고양이: 번쩍일 때마다 소파 밑 꼬리가 떨고, 창문 커튼이 빛난다
      UI.sfx('thunder'); G.flash = .8;
      await say([narr(Story.catLine('storm', s.cat)), me(Story.catLine('stormHint', s.cat))]);
      H.stormGuide = true;
    } else if (s.locked) {
      // 아침에 못 찾고 나간 날: 현관에 없다. 침실 쪽에서 작게 우는 소리.
      UI.sfx('meow');
      await say([narr(Story.catLine('lockedHome', s.cat))]);
      H.searching = true;
    }
    await Home.noticeNeeds();
  }
  // 밤: 침대에 누워 문을 고른다. 뒤로 가면 저녁으로 돌아간다.
  async function night() {
    var s = G.s, prevMode = H.mode, first = s.day === 0;
    H.stormGuide = false;
    H.mode = 'night'; H.inBed = true; H.awake = true; H.closeUp = null; G.hero.visible = false;
    if (H.room !== 'bedroom') { await Engine.fade(1, .25); }
    // 첫날 밤은 문을 열어 두고 같이 잔다 (다음 날 아침 정장에 털이 묻는다)
    if (first) Life.setDoor(s, true);
    H.doorLocked = first;
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
    if (first && !s.seen.firstNight) {
      s.seen.firstNight = true;
      await say([me('문 열어 두자. ' + Life.josa(s.cat, 'subject') + ' 혼자 거실에서 자면 쓸쓸하잖아.')]);
    } else if (!s.seen.doorHint && !first) {
      s.seen.doorHint = true;
      var dx = H.door > .5 ? -50 : 50;
      G.hand = { x: H.handle.x, y: H.handle.y, tx: H.handle.x + dx, ty: H.handle.y, period: 2.2, t0: G.t, door: true };
    }
    var btn = $('actionButton'), back = $('backButton');
    btn.textContent = '이대로 잠들기'; btn.hidden = false; back.hidden = false;
    var choice = await new Promise(function (resolve) {
      btn.onclick = function () { if (!UI.busy() && !G.drag) resolve('sleep'); };
      back.onclick = function () { if (!UI.busy() && !G.drag) resolve('back'); };
    });
    btn.hidden = true; back.hidden = true; btn.onclick = null; back.onclick = null; G.hand = null; H.onDoor = null; H.doorLocked = false;
    if (choice === 'back') {
      H.mode = prevMode; H.inBed = false; H.awake = false; H.catAct = null; G.hero.visible = true; G.hero.x = 250; G.hero.y = 334;
      if (k.room === 'living' || !k.visible) { k.room = 'living'; }
      Home.enter('bedroom', { mode: prevMode });
      return false;
    }
    H.awake = false;
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
        View.entranceDoor(c, View.L.living.entrance, 0);
        View.roomDoor(c, G, door, pov.crack || 0, 'bedroom');
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
    if (!s.seen.pov) { // 처음 한 번은 고를 수 있는 두 곳을 함께 빛낸다
      s.seen.pov = true; G.outlineAll = true;
      setTimeout(function () { G.outlineAll = false; }, 2600);
    }
    await Engine.until(function () { return pov.pick; });
    await Engine.sleep(pov.pick === 'wait' ? 1.4 : .6);
    return pov.pick;
  }
  function wakeLines(s, note) {
    var lines = [], w = G.wake;
    if (note) lines.push(narr(note));
    if (s.phase === 'morning' && s.litter.poop > 0 && s.litter.sand > 0 && !s.seen.smellHint) { s.seen.smellHint = true; lines.push(me(Story.catLine('smellAm', s.cat))); }
    if (w && w.key) lines.push(narr(Story.HEART[w.key] + '.' + (s.phase === 'morning' ? ' 치우느라 ' + Life.T.accident + '분이 걸렸다.' : '')));
    // 자동 물건이 밤사이 한 일 (처음 한 번씩, 닳았을 때는 꼭)
    var last = s.ledger[s.ledger.length - 1], ln = last ? last.notes : [];
    if (ln.indexOf('autoToyWorn') >= 0) lines.push(me(Story.catLine('autoToyWorn', s.cat)));
    else if (ln.indexOf('autoToy') >= 0 && !s.seen.autoToyNote) { s.seen.autoToyNote = true; lines.push(narr(Story.catLine('autoToy', s.cat))); }
    if (s.today.notes.indexOf('robot') >= 0 && !s.seen.robotNote) { s.seen.robotNote = true; lines.push(narr(Story.catLine('robot', s.cat))); }
    (Story.DAY_INTRO[s.day] || []).forEach(function (l) { lines.push({ who: l.who, text: l.text }); });
    return lines;
  }
  async function morning() {
    var s = G.s, note = Story.morningNote(G.wake ? G.wake.note : null, s.cat);
    H.mode = 'morning'; H.inBed = false; H.closeUp = null; H.curtain = 0; H.catAct = null; H.searching = false; H.searched = {};
    G.hudShow = { date: true, clock: true, wallet: true, food: true, energy: true, hearts: true };
    Home.enter('bedroom', { mode: 'morning', heroX: 250 });
    placeCatMorning();
    await Engine.fade(0, .5);
    var lines = wakeLines(s, note);
    G.wake = null;
    if (Life.tired(s) && !s.seen.tiredMorning) { s.seen.tiredMorning = true; lines.push(me('몸이 무겁다... 피곤하면 뭘 해도 오래 걸리는데.')); }
    if (lines.length) await say(lines);
    if (s.hidden) { await say([me(Story.catLine('hidden', s.cat))]); H.searching = true; }
    await Home.wait(['leave']);
    H.searching = false;
    // 화면이 다 어두워진 뒤에 집을 나선다 (그 사이 창밖이 밤으로 바뀌어 보이지 않게)
    await Engine.fade(1, .4);
    Life.leaveHome(s);
    await Work.commute(false);
    await Work.workDay();
    if (Life.day(s).group) await Work.groupEvening();
    if (Life.day(s).final) { await evaluation(); return; }
    await Work.leaveOffice();
    await Work.commute(true);
    var choice = await Work.walkHome();
    if (choice === 'shop') { await Work.shop(); await Engine.fade(1, .3); }
    H.stormGuide = false;
    Life.arriveHome(s);
    checkpoint();
    await arriveHome();
    await evening();
  }
  async function weekend() {
    var s = G.s, note = Story.morningNote(G.wake ? G.wake.note : null, s.cat);
    H.mode = 'weekend'; H.inBed = false; H.closeUp = null; H.curtain = 0; H.catAct = null;
    G.hudShow = { date: true, clock: true, wallet: true, food: true, energy: true, hearts: true };
    Home.enter('bedroom', { mode: 'weekend', heroX: 250 });
    placeCatMorning();
    await Engine.fade(0, .5);
    var lines = wakeLines(s, note);
    G.wake = null;
    if (s.floor.fur + s.floor.dust >= 4 && !s.seen.cleanDay) { s.seen.cleanDay = true; lines.push(me('털 뭉치는 빗자루로, 먼지 발자국은 대걸레로. 오늘은 청소부터 할까.')); }
    if (lines.length) await say(lines);
    // 첫 주말 아침: 슈퍼 사장님의 알바 문자
    if (!s.seen.jobText) {
      s.seen.jobText = true;
      var m = Story.phone.job;
      await UI.phoneWait({ from: m.from, time: m.time, preview: m.preview, body: m.body }, '9:40');
      await say([me('네 시간에 5,000원... 사료값이 모자라면 해 볼 만하겠다.'), me('대신 몸은 고되고, ' + Life.josa(s.cat, 'subject') + ' 또 혼자 있겠지.')]);
    }
    await evening();
  }
  // 집에서 다시 나가 슈퍼에 다녀온다 (저녁이든 주말이든 몇 번이든. 한 번에 40분, 밤 11시 넘으면 심야 할증)
  async function goShop() {
    var s = G.s, mode = H.mode, r = Life.act(s, 'shop');
    if (!r.ok) return;
    await Engine.fade(1, .35);
    var dark = s.phase === 'evening' || s.minute >= 1080;
    Work.street({ hot: null, walk: null, dusk: !dark && s.minute >= 900, night: dark });
    G.hero.x = 560; G.hero.dir = -1;
    await Engine.fade(0, .35);
    await Engine.walkTo(508);
    await Engine.fade(1, .3);
    await Work.shop();
    await Engine.fade(1, .3);
    Home.enter('living', { mode: mode, heroX: 80 });
    if (!s.hidden) G.cat.room = 'living';
    await Engine.fade(0, .35);
    spentNote(r.minutes);
  }
  function spentNote(m) { if (m) Engine.puff({ x: 110, y: 220, icon: 'clock', text: '+' + m + '분', px: 1 }); }
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
  // 본 엔딩은 이 브라우저에 따로 남긴다 (처음부터 다시 해도 도감은 그대로)
  var DEX_KEY = 'catdoor-v6-endings';
  function dexLoad() { try { var a = JSON.parse(localStorage.getItem(DEX_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function dexAdd(key) {
    var list = dexLoad(), isNew = list.indexOf(key) < 0;
    if (isNew) { list.push(key); try { localStorage.setItem(DEX_KEY, JSON.stringify(list)); } catch (e) { /* 저장소를 못 쓰면 이번 판만 */ } }
    return { list: list, isNew: isNew };
  }
  function drawEnding(key) {
    var cv = $('endingCanvas'), c = cv.getContext('2d'), s = G.s;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== 640 * dpr) { cv.width = 640 * dpr; cv.height = 360 * dpr; }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;
    var close = key === 'both' || key === 'catStays' || key === 'soso' || key === 'family';
    H.room = 'living'; H.mode = 'evening'; H.inBed = false; H.closeUp = null; H.curtain = 0; H.held = null; H.stormGuide = false;
    G.hero.visible = true; G.hero.x = 130; G.hero.y = 334; G.hero.pose = null; G.hero.dir = 1;
    G.cat.visible = key !== 'emptyBowl'; G.cat.room = 'living';
    if (key === 'family') { G.hero.x = 430; G.hero.y = 262; G.hero.pose = 'sit'; G.hero.face = 1; G.cat.x = 455; G.cat.y = 238; G.cat.pose = 'purr'; G.cat.dir = -1; }
    else if (close) { G.cat.x = 190; G.cat.y = 336; G.cat.pose = 'purr'; G.cat.dir = -1; }
    else if (key === 'clumsy') { G.cat.x = 470; G.cat.y = 228; G.cat.pose = 'groom'; }
    else { G.cat.x = 500; G.cat.y = 228; G.cat.pose = 'sleep'; }
    s.wearing = key === 'family' ? 'hoodie' : 'suit';
    if (key === 'emptyBowl') { s.bowl = 'empty'; H.entranceOpen = 0; G.hero.visible = false; }
    Home.drawLiving(c);
    G.hero.face = undefined;
    // 등급마다 화면 위에 한 겹: 좋음과 숨은 엔딩은 하트가 오르고, 나쁨은 어둡게 가라앉는다
    var t = G.t, grade = Life.GRADE[key];
    if (grade === 'good' || grade === 'hidden') {
      for (var i = 0; i < 9; i++) { var q = ((t * .18 + i / 9) % 1); View.icon(c, 'heart', 60 + i * 64 + Math.sin(t + i) * 8, 340 - q * 300, grade === 'hidden' ? 2 : 1, { alpha: q < .1 ? q * 10 : 1 - q }); }
      if (grade === 'hidden') View.lampGlow(c, 440, 230, 180, .35);
    } else if (grade === 'bad') {
      c.fillStyle = 'rgba(10,10,24,.35)'; c.fillRect(0, 0, 640, 360);
    }
  }
  var endingLoop = 0;
  function endingScreen() {
    var s = G.s, e = Life.ending(s), body = Story.ENDING[e.key].body(s), mem = Story.memory(s, e.key), grade = e.grade || Life.GRADE[e.key];
    var dex = dexAdd(e.key);
    $('gameScreen').hidden = true; $('ending').hidden = false;
    var root = $('ending'); root.className = 'ending grade-' + grade; root.scrollTop = 0;
    // 장면은 계속 움직인다
    var key = e.key, myLoop = ++endingLoop;
    (function loop() { if (myLoop !== endingLoop || root.hidden) return; drawEnding(key); requestAnimationFrame(loop); }());
    // 도장: 화면이 열리고 잠깐 뒤 쾅
    var stamp = $('endingStamp'); stamp.textContent = Story.GRADE_NAME[grade]; stamp.classList.remove('slam');
    setTimeout(function () { stamp.classList.add('slam'); UI.sfx('stamp'); setTimeout(function () { UI.sfx(grade === 'bad' ? 'gloom' : grade === 'hidden' ? 'mystery' : 'fanfare'); }, 250); }, 600);
    $('endingGrade').textContent = Story.GRADE_NAME[grade] + ' · 엔딩 ' + Life.ENDINGS.length + '개 중 ' + (Life.ENDINGS.indexOf(e.key) + 1) + '번';
    $('endingTitle').textContent = Story.endingTitle(e.key, s);
    var lines = body.map(function (l, i) { return '<p style="animation-delay:' + (1.6 + i * .7).toFixed(1) + 's">' + UI.esc(l) + '</p>'; });
    if (mem) lines.push('<p class="memory" style="animation-delay:' + (1.6 + body.length * .7).toFixed(1) + 's">' + UI.esc(mem) + '</p>');
    $('endingBody').innerHTML = lines.join('');
    // 엔딩 도감: 여덟 칸. 본 것은 이름과 등급, 못 본 것은 귀띔만.
    $('dexTitle').innerHTML = UI.esc('엔딩 도감 · 찾은 엔딩 ' + dex.list.length + ' / ' + Life.ENDINGS.length) + (dex.isNew ? '<span class="new">NEW</span>' : '');
    $('endingDex').innerHTML = Life.ENDINGS.map(function (k) {
      var g = Life.GRADE[k], got = dex.list.indexOf(k) >= 0;
      if (!got) return '<div class="dex locked"><small>' + UI.esc(g === 'hidden' ? '? ? ?' : Story.GRADE_NAME[g]) + '</small><b>???</b><span>' + UI.esc(Story.ENDING_HINT[k]) + '</span></div>';
      return '<div class="dex ' + g + (k === e.key ? ' now' : '') + '"><small>' + UI.esc(Story.GRADE_NAME[g]) + '</small><b>' + UI.esc(Story.endingTitle(k, s)) + '</b></div>';
    }).join('');
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
      UI.black(Story.epilogue(s)).then(function () { $('ending').hidden = false; endingLoop++; var ml = endingLoop; (function loop() { if (ml !== endingLoop || root.hidden) return; drawEnding(key); requestAnimationFrame(loop); }()); });
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
    document.body.classList.add('playing');
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
      if (!$('playerName').value.trim()) { $('playerName').focus(); return; }
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
    $('playerName').addEventListener('input', function () { $('startButton').disabled = !$('playerName').value.trim(); });
    setTimeout(function () { try { if (!$('titleScreen').hidden) $('playerName').focus(); } catch (e) { /* 무시 */ } }, 300);
    $('rotateHint').addEventListener('click', function () { document.body.classList.add('rotate-ok'); });
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
    steps: { prologue: prologue, rainyStreet: rainyStreet, proShelf: proShelf, proHome: proHome, montage: montage, dayZero: dayZero, morning: morning, evening: evening, night: night, catPOV: catPOV, arriveHome: arriveHome, weekend: weekend, goShop: goShop } };
}());
