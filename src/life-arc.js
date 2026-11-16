/* 열이틀을 꿰는 이야기: 선배가 작년 겨울에 잃어버린 고양이.
   처음: 선배가 소매의 삼색 털을 알아보고(4/13), 슈퍼 벽에 포스터가 다시 붙는다(4/14).
   중간: 천둥 예보(4/15), 선배의 휴대폰 사진(4/17), 슈퍼 사장님의 기억(주말), 선배의 문자(4/19), 옛 이름 불러 보기(4/20).
   절정: 4/23 저녁, 선배가 같이 퇴근해 집에 온다. 고양이는 그동안 쌓인 정을 따라 한 사람에게 간다.
   끝: 엔딩과 고양이 일기가 프롤로그의 비 오는 밤을 고양이 쪽에서 다시 보여 준다.
   대사는 Story.ARC, 값은 Life(bond, visitEnd), 여기서는 장면과 손짓만 만든다. */
var Arc = (function () {
  'use strict';
  var V = { peer: null, collar: null, visiting: false };
  function S() { return G.s; }
  function say(l) { return UI.say(l); }
  function narr(t) { return { who: 'narr', text: t }; }

  // ---------- 그림 ----------
  // 거리의 슈퍼 벽 (창문 왼쪽 기둥)에 붙은 작은 포스터
  var POSTER = { x: 164, y: 202, w: 32, h: 42 };
  function posterUp(s) { return !!s && !(G.pro && G.pro.active) && s.day >= 2 && !s.arc.outcome; }
  function drawStreetPoster(c) {
    var s = S(); if (!posterUp(s)) return;
    var p = POSTER, t = G.t;
    View.r(c, p.x + 2, p.y + 2, p.w, p.h, 'rgba(0,0,0,.18)');
    View.r(c, p.x, p.y, p.w, p.h, '#fbf7ec');
    View.r(c, p.x, p.y, p.w, 7, '#d0473c');
    View.r(c, p.x + 7, p.y + 10, 18, 14, '#e9e1cf');
    View.cat(c, G, p.x + 16, p.y + 24, 1, 0, 'sit', .55);
    for (var i = 0; i < 3; i++) View.r(c, p.x + 4, p.y + 28 + i * 4, p.w - 8 - i * 4, 1.5, '#8a8178');
    View.r(c, p.x + 13, p.y - 2, 6, 3, 'rgba(224,138,108,.9)'); // 테이프
    if (!s.seen.arcPoster) View.outline(c, { x: p.x - 3, y: p.y - 3, w: p.w + 6, h: p.h + 6 }, t);
  }
  function posterSpot(onRead) {
    var p = POSTER;
    return { id: 'poster', x: p.x - 6, y: p.y - 6, w: p.w + 12, h: p.h + 12, tap: function () {
      // 종이는 행동이 끝난 뒤에 띄운다 (행동 중에는 아무것도 누를 수 없어서 닫을 수 없다)
      return Engine.walkTo(p.x + p.w / 2 + 34).then(function () {
        G.hero.pose = 'back';
        setTimeout(function () { showPaper('poster').then(function () { G.hero.pose = null; S().seen.arcPoster = true; if (onRead) onRead(); }); }, 0);
      });
    } };
  }
  // 크게 본 포스터: 비에 번진 전화번호, 사진 속 삼색이
  function drawPoster(c) {
    var s = S(), info = Story.ARC.poster(s), x = 182, y = 14, w = 276, h = 330;
    c.fillStyle = 'rgba(20,18,26,.72)'; c.fillRect(0, 0, 640, 360);
    View.box(c, x, y, w, h, '#fbf7ec', '#2f2a33', 3);
    View.r(c, x + w / 2 - 20, y - 6, 40, 12, 'rgba(224,138,108,.85)');
    View.r(c, x + 3, y + 3, w - 6, 40, '#d0473c');
    View.text(c, info.title, x + w / 2, y + 28, 19, '#fffaf0');
    // 사진
    View.box(c, x + 70, y + 54, 136, 104, '#e9e1cf', '#5b4636', 2);
    View.r(c, x + 74, y + 58, 128, 50, '#cfe0ea');
    View.cat(c, G, x + 138, y + 150, -1, G.t, 'sit', 2.4);
    info.rows.forEach(function (r, i) { View.text(c, r, x + w / 2, y + 182 + i * 22, 12, '#2f2a33'); });
    // 전화번호 끝자리는 비에 번졌다
    View.text(c, info.phone, x + w / 2 - 18, y + 282, 15, '#2f2a33');
    c.save(); c.globalAlpha = .55;
    for (var i = 0; i < 4; i++) View.r(c, x + w / 2 + 42 + i * 3, y + 270 + i * 2, 16, 14 - i * 2, '#8fa4b8');
    c.restore();
    View.text(c, info.stamp, x + w - 14, y + h - 14, 10, '#9a5a3c', 'right');
  }
  // 선배의 휴대폰 사진: 창가에 앉은 삼색이 (대화창 위로 보이게 화면 위쪽에)
  function drawPhoto(c) {
    var s = S(), x = 236, y = 10, w = 168, h = 214;
    View.box(c, x, y, w, h, '#22202a', '#111018', 3);
    View.r(c, x + 10, y + 22, w - 20, h - 40, '#f3dfb8');
    View.r(c, x + 22, y + 34, w - 44, 90, '#a9cbe0');
    View.r(c, x + 22, y + 78, w - 44, 3, '#fffaf0'); View.r(c, x + w / 2 - 1, y + 34, 3, 90, '#fffaf0');
    View.r(c, x + 14, y + 124, w - 28, 10, '#c9a77c');
    View.cat(c, G, x + w / 2 + 6, y + 124, -1, G.t, 'sit', 2.2);
    View.text(c, Life.oldName(s) + ' ♥', x + w / 2, y + 160, 14, '#5b4636');
    View.text(c, '작년 11월', x + w / 2, y + 180, 10, '#8a8178');
    View.r(c, x + w / 2 - 14, y + 8, 28, 5, '#3b3846');
  }
  // 겹쳐 보이는 종이 한 장. 아무 데나 누르면 닫힌다.
  function showPaper(kind) {
    var oldHot = G.hotFn, oldWalk = G.walk, done = false;
    G.overlay = kind === 'poster' ? drawPoster : drawPhoto;
    G.hotFn = function () { return [{ id: 'paperClose', x: 0, y: 0, w: 640, h: 360, glow: false, tap: function () { done = true; return null; } }]; };
    G.walk = null; UI.sfx('page');
    return Engine.until(function () { return done; }).then(function () { G.overlay = null; G.hotFn = oldHot; G.walk = oldWalk; });
  }

  // ---------- 지점과 거리 ----------
  // 퇴근 전 지점: 날마다 선배 이야기 한 토막
  function officeLines(s) {
    var A = Story.ARC, d = s.day, key = 'arcOffice' + d;
    if (s.seen[key] || s.arc.outcome) return [];
    var lines = d === 1 ? A.d1(s) : d === 3 ? A.d3(s) : d === 5 ? A.d5(s) : d === 10 ? A.d10(s) : Life.day(s).eve ? A.d11Office : [];
    if (lines.length) s.seen[key] = true;
    return lines.map(function (l) {
      return { who: l.who, text: l.text, on: function () {
        if (l.photo) { G.overlay = drawPhoto; UI.sfx('page'); s.seen.arcPhoto = true; }
        if (l.who === 'peer' && Work.Wk.peer) { Work.Wk.peer.dir = 1; }
      } };
    });
  }
  function clearOverlay() { G.overlay = null; }
  // 4/14부터 퇴근길에 포스터가 보인다. 처음에는 꼭 읽고 간다.
  function streetBeat(s) {
    if (s.day === 1 && !s.seen.arcStreet1) { s.seen.arcStreet1 = true; return say([{ who: 'me', text: Story.ARC.d1Street }]); }
    if (!posterUp(s) || s.seen.arcPoster) return Promise.resolve();
    var p = POSTER;
    G.guide = { x: p.x + p.w / 2, y: p.y - 8, dir: 'down' };
    return say([{ who: 'me', text: Story.ARC.d2Street }]).then(function () {
      return Engine.until(function () { return s.seen.arcPoster; });
    }).then(function () { G.guide = null; return say(Story.ARC.d2After(s)); });
  }
  // 주말 이후 슈퍼에서 사장님이 그 겨울 이야기를 한다
  function ownerLines(s) {
    if (s.day < 6 || !s.seen.arcPhoto || s.seen.arcOwner || s.arc.outcome) return null;
    s.seen.arcOwner = true;
    return Story.ARC.owner(s);
  }
  // 4/19 일요일 아침 선배 문자
  function weekendText(s) {
    if (s.day !== 7 || s.seen.arcText || s.arc.outcome) return Promise.resolve();
    s.seen.arcText = true;
    var m = Story.ARC.text(s);
    return UI.phoneWait({ from: m.from, time: m.time, preview: m.preview, body: m.body, replies: m.replies }, '10:12').then(function () { return say(Story.ARC.textAfter(s)); });
  }

  // ---------- 집 ----------
  function drawPeerHome(c) {
    var p = V.peer; if (!p) return;
    View.shadow(c, p.x, 335, 20);
    View.person(c, G, p.x, 334, 'peer', p.dir, G.t, 'stand', 2.35);
    if (V.collar && !V.collar.held) drawCollar(c, V.collar.x, V.collar.y, 2);
  }
  function drawCollar(c, x, y, px) {
    var u = px || 1;
    c.save(); c.strokeStyle = '#d0473c'; c.lineWidth = 2.2 * u; c.beginPath(); c.ellipse(x, y, 7 * u, 3 * u, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    View.r(c, x - 2 * u, y + 2 * u, 4 * u, 4 * u, '#f2c14e'); View.r(c, x - .5 * u, y + 4 * u, u, u, '#7a5a1c');
  }
  // 목걸이를 건 고양이: 목 언저리에 빨간 줄과 금빛 방울
  function collarOn(c, k) {
    var s = S(); if (!s || !s.arc || !s.arc.collar || !k.visible) return;
    if (k.pose === 'sleep') return;
    var sc = (k.scale || 1.75) / 1.75, sit = k.pose === 'sit' || k.pose === 'purr' || k.pose === 'groom' || k.pose === 'rub';
    var x = k.x + k.dir * (sit ? 9 : 13) * sc, y = k.y - (sit ? 23 : 19) * sc;
    View.r(c, x - 5 * sc, y, 10 * sc, 2.5 * sc, '#d0473c');
    View.r(c, x - 2 * sc, y + 2.5 * sc, 4 * sc, 4 * sc, '#f2c14e');
    View.r(c, x - .5 * sc, y + 5 * sc, 1 * sc, 1 * sc, '#7a5a1c');
  }
  function slidePeer(to, secs) {
    var p = V.peer, from = p.x, t0 = G.t;
    p.dir = to > from ? 1 : -1;
    return new Promise(function (resolve) {
      (function step() { var q = Math.min(1, (G.t - t0) / secs); p.x = from + (to - from) * q; if (q < 1) setTimeout(step, 30); else resolve(); }());
    });
  }
  function catWalk(x, run) { var k = G.cat; Home.H.catAct = 'still'; k.pose = 'walk'; return Engine.catTo(x, { y: 336, run: !!run }).then(function () { k.pose = 'sit'; }); }
  function tapWait(spots) {
    var H = Home.H, pick = null;
    H.arcHot = function () { return spots.map(function (sp) { var o = {}; for (var k in sp) o[k] = sp[k]; o.tap = function () { pick = sp.id; return null; }; return o; }); };
    return Engine.until(function () { return pick; }).then(function () { H.arcHot = null; return pick; });
  }

  // 4/20 저녁: 옛 이름을 불러 본다. 정이 쌓였으면 돌아오고, 아니면 현관만 본다 (4/23의 예고)
  function rehearsal() {
    var s = S(), k = G.cat, A = Story.ARC;
    if (s.day !== 8 || s.seen.arcRehearsal || s.hidden || s.arc.outcome) return Promise.resolve();
    s.seen.arcRehearsal = true;
    var LVE = View.L.living.entrance;
    return say(A.d8Call(s)).then(function () {
      Engine.puff({ x: k.x, y: k.y - 52, icon: 'bang', px: 1, life: 1 });
      return catWalk(LVE.x + LVE.w + 18);
    }).then(function () { k.dir = -1; return say(A.d8Door(s)); }).then(function () {
      if (Life.choosesMe(s)) {
        return catWalk(G.hero.x - 26, true).then(function () { k.dir = 1; k.pose = 'rub'; UI.sfx('purr'); return say(A.d8Back(s)); });
      }
      return Engine.sleep(1.4).then(function () { return say(A.d8Stay(s)); });
    }).then(function () { Home.H.catAct = null; });
  }

  // 4/23 저녁: 선배가 온다
  async function visit() {
    var s = S(), H = Home.H, k = G.cat, A = Story.ARC, LVE = View.L.living.entrance;
    V.visiting = true;
    H.mode = 'evening'; H.inBed = false; H.curtain = 0; H.closeUp = null; H.catAct = 'still'; H.searching = false;
    Home.enter('living', { mode: 'evening', heroX: 300, catRoom: 'living', catX: 500 });
    G.hero.dir = -1; k.visible = true; k.pose = 'sit'; k.dir = -1;
    V.peer = { x: 70, dir: 1 }; H.entranceOpen = 1; H.extraDraw = drawPeerHome; H.arcHot = function () { return []; };
    G.hudShow.clock = true;
    await Engine.fade(0, .5);
    UI.sfx('door');
    await catWalk(380);
    k.dir = -1;
    await say(A.visitIn(s));
    await slidePeer(110, .5);
    H.entranceOpen = 0; UI.sfx('door');
    var look = A.look(s);
    if (look.length) await say(look);
    await say(A.peerCall(s));
    Engine.puff({ x: k.x, y: k.y - 52, icon: 'bang', px: 1, life: 1.2 });
    await say(A.turn(s));
    await catWalk(206);
    k.dir = -1;
    // 나도 이름을 부른다: 고양이를 누르는 손짓
    G.hand = { x: k.x + 4, y: k.y - 24, tx: k.x + 4, ty: k.y - 22, period: 1.4, t0: G.t };
    await tapWait([{ id: 'callCat', x: k.x - 26, y: k.y - 46, w: 52, h: 50, pulse: true }]);
    G.hand = null;
    await say(A.myCall(s));
    k.dir = 1; G.hero.dir = 1;
    await Engine.sleep(1.1);
    if (Life.choosesMe(s)) {
      await catWalk(G.hero.x + 28, true);
      k.dir = -1; k.pose = 'rub'; UI.sfx('purr');
      await say(A.kept(s));
      // 선배 손의 방울 목걸이를 고양이 목에 걸어 준다 (끌어다 놓기)
      V.collar = { x: V.peer.x + 26, y: 262 };
      var done = false;
      H.arcHot = function () {
        if (done) return [];
        return [{ id: 'collar', x: V.collar.x - 16, y: V.collar.y - 14, w: 32, h: 28, pulse: true, drag: {
          start: function () { V.collar.held = true; G.hand = null; UI.sfx('tap'); },
          move: function (d) { V.collar.x = d.x; V.collar.y = d.y; },
          end: function (d) {
            V.collar.held = false;
            if (Math.abs(d.x - k.x) < 44 && d.y > k.y - 70 && d.y < k.y + 10) { done = true; V.collar = null; }
            else { V.collar.x = V.peer.x + 26; V.collar.y = 262; }
            return null;
          } } }];
      };
      G.hand = { x: V.collar.x, y: V.collar.y, tx: k.x, ty: k.y - 24, period: 2.2, t0: G.t };
      var drawHeld = H.extraDraw;
      H.extraDraw = function (c) { drawHeld(c); if (V.collar && V.collar.held) drawCollar(c, V.collar.x, V.collar.y, 2); };
      await Engine.until(function () { return done; });
      G.hand = null; H.arcHot = function () { return []; }; H.extraDraw = drawPeerHome;
      Life.visitEnd(s, 'kept');
      UI.sfx('bell'); k.pose = 'purr';
      Engine.puff({ x: k.x, y: k.y - 52, icon: 'heart', px: 1, life: 1.4 });
      await say(A.keptBye(s));
      H.entranceOpen = 1; UI.sfx('door');
      await slidePeer(-30, .9);
      H.entranceOpen = 0; UI.sfx('door');
      await say([narr(A.after.kept)]);
    } else {
      await catWalk(V.peer.x + 34);
      k.dir = -1; k.pose = 'rub'; UI.sfx('purr'); G.hero.dir = -1;
      await say(A.toPeer(s));
      // 붙잡을까(고양이를 누른다), 보내 줄까(현관문을 연다)
      G.outlineAll = true; setTimeout(function () { G.outlineAll = false; }, 2600);
      var pick = await tapWait([
        { id: 'holdCat', x: k.x - 26, y: k.y - 46, w: 52, h: 50, pulse: true },
        { id: 'openDoor', x: LVE.x, y: LVE.y, w: LVE.w, h: LVE.h, pulse: true }
      ]);
      if (pick === 'holdCat') {
        await catWalk(G.hero.x + 28);
        k.dir = -1;
        await say(A.hold(s));
        Life.visitEnd(s, 'keptHard');
        H.entranceOpen = 1; UI.sfx('door');
        await slidePeer(-30, .9);
        H.entranceOpen = 0; UI.sfx('door');
        await say([narr(A.after.keptHard)]);
      } else {
        H.entranceOpen = 1; UI.sfx('door');
        await say(A.letGo(s));
        V.peer.dir = -1;
        var leaving = slidePeer(-30, 1.4);
        await catWalk(-10);
        await leaving;
        Life.visitEnd(s, 'farewell');
        k.visible = false; k.room = 'none';
        H.entranceOpen = 0; UI.sfx('door');
        await say([narr(A.after.farewell)]);
      }
    }
    H.extraDraw = null; H.arcHot = null; V.peer = null; V.collar = null; V.visiting = false; H.catAct = null; G.hand = null;
  }
  // 4/23 지하철: 선배가 옆에 서 있다
  function drawTrainPeer(c) {
    if (!Work.Wk.withPeer) return;
    View.person(c, G, G.hero.x + 52, 344, 'peer', -1, G.t, 'stand', 2.35);
  }

  return {
    V: V, POSTER: POSTER, posterUp: posterUp, drawStreetPoster: drawStreetPoster, posterSpot: posterSpot, showPaper: showPaper,
    officeLines: officeLines, clearOverlay: clearOverlay, streetBeat: streetBeat, ownerLines: ownerLines, weekendText: weekendText,
    rehearsal: rehearsal, visit: visit, collarOn: collarOn, drawTrainPeer: drawTrainPeer,
    visiting: function () { return V.visiting; }
  };
}());
