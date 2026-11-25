/* 휴대폰: 실제로 쓰는 앱 다섯 개만 있다. 메시지, 전화, 카메라, 사진, 은행.
   - 메시지는 사람마다 한 방에 쌓인다. 기록은 게임 상태(s.phone)에 저장되어 이어 하기에도 남는다.
   - 사진은 사진첩에서 대화방으로 끌어다 놓으면 보내진다.
   - 은행은 잔액, 나갈 돈, 들어올 수수료를 보여 주고, 요금이 모자랄 때 고르는 자리가 된다.
   게임 쪽 일(누가 답장하는지, 사진을 찍으면 무엇이 남는지)은 setHooks로 받은 함수가 정한다. */
var Phone = (function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(t) { return UI.esc(t); }
  function sfx(n) { UI.sfx(n); }

  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  var APPS = [
    { id: 'msg', name: '메시지', bg: '#34c759', svg: '<path d="M12 4C6.5 4 2.5 7.4 2.5 11.6c0 2.4 1.3 4.5 3.4 5.9-.2 1.4-.9 2.6-1.9 3.5 2 0 3.8-.8 5-1.9.9.2 1.9.3 3 .3 5.5 0 9.5-3.4 9.5-7.6S17.5 4 12 4z" fill="#fff"/>' },
    { id: 'call', name: '전화', bg: '#34c759', svg: '<path d="M7 3.5l3 3.6-1.8 2.2c1 2.2 2.6 3.9 4.6 4.8l2.2-1.8 3.5 3-1.6 3.2C10.6 18.2 5.8 13.4 3.5 6.8z" fill="#fff"/>' },
    { id: 'camera', name: '카메라', bg: 'linear-gradient(#d9dadc,#9a9ca0)', svg: '<rect x="3" y="7" width="18" height="12" rx="2" fill="#2c2c2e"/><rect x="8" y="5" width="8" height="3" rx="1" fill="#2c2c2e"/><circle cx="12" cy="13" r="4" fill="#5a5a5e" stroke="#c7c7cc" stroke-width="1.5"/>' },
    { id: 'photo', name: '사진', bg: '#fff', svg: '<g transform="translate(12 12)"><ellipse rx="3" ry="6" cy="-4" fill="#f9c440"/><ellipse rx="3" ry="6" cy="-4" fill="#f57b39" transform="rotate(60)"/><ellipse rx="3" ry="6" cy="-4" fill="#e9428a" transform="rotate(120)"/><ellipse rx="3" ry="6" cy="-4" fill="#9a5ce6" transform="rotate(180)"/><ellipse rx="3" ry="6" cy="-4" fill="#3d9bf0" transform="rotate(240)"/><ellipse rx="3" ry="6" cy="-4" fill="#4cc764" transform="rotate(300)"/></g>' },
    { id: 'bank', name: '은행', bg: 'linear-gradient(#2f6fd6,#1d4fa8)', svg: '<path d="M4 9.5L12 5l8 4.5z" fill="#fff"/><rect x="5.5" y="10.5" width="2.2" height="6" fill="#fff"/><rect x="10.9" y="10.5" width="2.2" height="6" fill="#fff"/><rect x="16.3" y="10.5" width="2.2" height="6" fill="#fff"/><rect x="4" y="17.5" width="16" height="2" fill="#fff"/>' }
  ];
  var VIEWS = ['iosHome', 'iosList', 'iosThread', 'iosAsk', 'iosCalls', 'iosCam', 'iosPhotos', 'iosBank', 'iosCall'];

  // log: { c(대화방 이름), ymd: [년, 월, 일], time('오후 7:05'), dir: 'in' | 'out', text, photo(사진 id), u(안 읽음), old(게임 전부터 쌓여 있던 글) }
  // calls: { c, ymd, time, kind: 'missed' | 'in' | 'out', n, seen }
  // 날짜가 오늘보다 뒤인 글과 통화는 아직 보이지 않는다 (프롤로그의 겨울에 봄에 올 문자가 미리 보이지 않게).
  var P = { log: [], calls: [], waits: [], view: 'home', conv: null, clock: '10:42', ask: null, cam: null, viewer: null, bank: null, call: null, tray: false, sel: null, drag: null, rings: null };
  var H = {
    today: function () { return [2026, 4, 12]; },
    contact: function () { return { face: false }; },    // { face: 얼굴이 보이는 사이인지, send: 사진을 보낼 수 있는 방인지 }
    photos: function () { return []; },                   // [{ id, day, kind, to: [] }]
    photoSent: null,                                      // (c, id) → Promise<[답장 글]>
    canCamera: function () { return false; },
    focus: function () { return { x: 320, y: 260 }; },
    shot: function () { return null; },                   // → { id } 사진을 남겼으면
    bank: function () { return null; },
    cash: function () { return false; },
    canCall: function () { return false; },
    call: null                                            // (c) → Promise (전화 한 통의 이야기)
  };
  function setHooks(h) { for (var k in h) H[k] = h[k]; }

  // ---------- 날짜 ----------
  function sameYmd(a, b) { return a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }
  function ymdNum(y) { return y ? y[0] * 10000 + y[1] * 100 + y[2] : 0; }
  // 올해가 아닌 날짜에만 해를 붙인다
  function dateLabel(ymd) {
    if (!ymd) return '';
    var d = new Date(ymd[0], ymd[1] - 1, ymd[2]);
    return (ymd[0] !== today()[0] ? ymd[0] + '년 ' : '') + ymd[1] + '월 ' + ymd[2] + '일 ' + WD[d.getDay()] + '요일';
  }
  function shortDate(ymd) { return ymd ? (ymd[0] !== today()[0] ? (ymd[0] % 100) + '. ' : '') + ymd[1] + '. ' + ymd[2] + '.' : ''; }
  function vis(m) { return !m.ymd || ymdNum(m.ymd) <= ymdNum(today()); }
  function mins(t) { var k = /(오전|오후) (\d+):(\d+)/.exec(t || ''); if (!k) return 0; return ((+k[2] % 12) + (k[1] === '오후' ? 12 : 0)) * 60 + +k[3]; }

  // ---------- 화면 고르기 ----------
  function el(id) {
    var e = $(id);
    if (!e) {
      e = document.createElement('div'); e.id = id; e.className = 'ios-app'; e.hidden = true;
      $('iosHomebar').parentNode.insertBefore(e, $('iosHomebar'));
    }
    return e;
  }
  function show(id) {
    VIEWS.forEach(function (v) { var e = v === 'iosHome' ? $('iosHome') : el(v); if (e) e.hidden = v !== id; });
    if (id !== 'iosCam') camStop();
  }
  // 대화방 목록: 가장 최근 글이 온 방부터 (날짜와 시각으로, 같으면 나중에 들어온 글)
  function convs() {
    var best = {};
    P.log.forEach(function (m, i) {
      if (!vis(m)) return;
      var k = [ymdNum(m.ymd), mins(m.time), i], b = best[m.c];
      if (!b || k[0] > b[0] || (k[0] === b[0] && (k[1] > b[1] || (k[1] === b[1] && k[2] > b[2])))) best[m.c] = k;
    });
    return Object.keys(best).sort(function (a, b) { var x = best[a], y = best[b]; return (y[0] - x[0]) || (y[1] - x[1]) || (y[2] - x[2]); });
  }
  function lastOf(c) { for (var i = P.log.length - 1; i >= 0; i--) if (P.log[i].c === c && vis(P.log[i])) return P.log[i]; return null; }
  function unreadOf(c) { return P.log.filter(function (m) { return m.c === c && m.u && vis(m); }).length; }
  function unreadAll() { return P.log.filter(function (m) { return m.u && vis(m); }).length; }
  // 휴대폰 단추의 표시는 새로 온 글에만 뜬다 (오래 쌓인 엄마 문자는 메시지 앱 숫자로만 보인다)
  function unreadNew() { return P.log.filter(function (m) { return m.u && !m.old && vis(m); }).length; }
  function pendingReply() { return P.waits.some(function (w) { return w.replies && w.reply == null && !w.optional; }); }
  function missed() { return P.calls.filter(function (x) { return x.kind === 'missed' && !x.seen && vis(x); }).length; }
  function badge() {
    var n = unreadNew() + (pendingReply() ? 1 : 0);
    $('phoneBadge').hidden = !n && !P.rings; $('phoneBadge').textContent = '!';
    return n;
  }
  function ring(on) { $('phoneButton').classList.toggle('ring', !!on); }

  // 얼굴: 가까워지기 전에는 빈 실루엣, 가까워지면 그 사람의 대화 얼굴을 동그랗게 잘라 쓴다
  var FACE_OF = { mom: ['mom'], mate: ['mate'], grandma: ['grandma'], one: ['one'], boss: ['customerC', 200] }, faceUrl = {};
  function faceSrc(id) {
    if (faceUrl[id] !== undefined) return faceUrl[id];
    var f = FACE_OF[id], url = null;
    if (f && typeof document !== 'undefined' && window.View && window.G) {
      try {
        var cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
        var g = cv.getContext('2d'); g.fillStyle = '#e9dfcc'; g.fillRect(0, 0, 96, 96);
        if (View.portrait(g, G, f[0], 0, 0, 96, 96, f[1])) url = cv.toDataURL('image/png');
      } catch (e) { url = null; }
    }
    if (url) faceUrl[id] = url;
    return url;
  }
  function avatar(c, big) {
    var k = H.contact(c) || {};
    if (k.face) { var src = faceSrc(k.id); return '<span class="ios-avatar face' + (src ? ' pic' : '') + (big ? ' big' : '') + '" data-who="' + esc(k.id || '') + '">' + (src ? '<img src="' + src + '" alt="">' : esc(c.charAt(0))) + '</span>'; }
    if (k.person) return '<span class="ios-avatar sil' + (big ? ' big' : '') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="4.2" fill="#fff"/><path d="M4 21c.6-4.2 3.8-6.6 8-6.6s7.4 2.4 8 6.6z" fill="#fff"/></svg></span>';
    return '<span class="ios-avatar' + (big ? ' big' : '') + '">' + esc(c.charAt(0)) + '</span>';
  }

  // ---------- 홈 ----------
  function home() {
    P.view = 'home';
    var counts = { msg: unreadAll(), call: missed() };
    $('iosHome').innerHTML = APPS.map(function (a) {
      var off = a.id === 'camera' && !H.canCamera();
      return '<button class="ios-app-icon' + (off ? ' off' : '') + '" data-app="' + a.id + '"><span class="glyph" style="background:' + a.bg + '"><svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">' + a.svg + '</svg></span>' + esc(a.name) + (counts[a.id] ? '<b>' + counts[a.id] + '</b>' : '') + '</button>';
    }).join('');
    show('iosHome');
  }

  // ---------- 메시지 ----------
  function list() {
    P.view = 'list'; P.conv = null; P.tray = false;
    el('iosList').innerHTML = '<div class="ios-nav"><button data-nav="home">‹</button><span></span><span></span></div><div class="ios-title">메시지</div><div class="ios-scroll">' +
      convs().map(function (c) {
        var m = lastOf(c), n = unreadOf(c);
        var pre = m.photo ? '사진' : (m.text || '');
        return '<button class="ios-row" data-conv="' + esc(c) + '">' + avatar(c) + '<span><span class="who">' + esc(c) + '<small>' + esc(sameYmd(m.ymd, H.today()) ? m.time : shortDate(m.ymd)) + '</small></span><span class="pre">' + esc(pre) + '</span></span>' + (n ? '<i class="unread">' + (n > 1 ? n : '') + '</i>' : '') + '</button>';
      }).join('') + '</div>';
    show('iosList');
  }
  function bubble(m) {
    if (m.photo) return '<div class="bubble photo ' + m.dir + '">' + photoImg(m.photo) + '</div>';
    return '<div class="bubble ' + m.dir + '">' + esc(m.text) + '</div>';
  }
  function thread(c, keepScroll) {
    P.view = 'thread'; P.conv = c;
    P.log.forEach(function (m) { if (m.c === c && vis(m)) m.u = false; });
    P.waits.forEach(function (w) { if (w.c === c) w.read = true; });
    var prev = null, html = '';
    P.log.forEach(function (m) {
      if (m.c !== c || !vis(m)) return;
      if (!prev || !sameYmd(prev.ymd, m.ymd)) html += '<div class="ios-day">' + esc(dateLabel(m.ymd)) + (m.time ? ' ' + esc(m.time) : '') + '</div>';
      html += bubble(m); prev = m;
    });
    var w = P.waits.filter(function (x) { return x.c === c && x.replies && x.reply == null; })[0];
    var k = H.contact(c) || {}, canSend = k.send && H.photos().length > 0 && !w;
    var out = '<div class="ios-nav"><button data-nav="list">‹</button><span></span><span></span></div><div class="ios-head">' + avatar(c, true) + esc(c) + '</div><div class="ios-msgs" id="threadMsgs">' + html + '</div>';
    if (w) out += '<div class="ios-replies">' + w.replies.map(function (r, i) { return '<button data-reply="' + i + '">' + esc(r) + '</button>'; }).join('') + '</div>';
    else if (canSend) out += '<div class="ios-compose photo-bar"><button class="ios-plus' + (P.tray ? ' on' : '') + '" data-tray="1" aria-label="사진"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="2" fill="currentColor"/><path d="M4 18l6-5 4 3 3-2 4 4" fill="none" stroke="currentColor" stroke-width="2"/></svg></button><div class="ios-field muted"></div></div>' + (P.tray ? trayHTML() : '');
    var box0 = $('threadMsgs'), top0 = keepScroll && box0 ? box0.scrollTop : null;
    el('iosThread').innerHTML = out;
    show('iosThread');
    badge();
    var box = $('threadMsgs');
    if (top0 !== null) box.scrollTop = top0;
    else {
      // 가장 최근에 받은 글의 첫 줄부터 보이게 (긴 문자가 화면이 낮은 가로 폰에서 잘리지 않게)
      var ins = box.querySelectorAll('.bubble.in'), b = ins[ins.length - 1], lastOut = box.lastElementChild;
      box.scrollTop = b && lastOut && lastOut.classList.contains('in') ? Math.max(0, b.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 28) : box.scrollHeight;
    }
  }
  // 사진 고르는 줄: 엄지손톱만 한 사진을 끌어 위 대화창에 놓으면 보내진다
  function trayHTML() {
    var ps = H.photos().slice().reverse();
    return '<div class="ios-tray">' + ps.map(function (p) { return '<span class="tray-thumb" data-thumb="' + esc(p.id) + '">' + photoImg(p.id) + '</span>'; }).join('') + '</div>';
  }
  function add(m) { P.log.push(m); return m; }
  function today() { return H.today(); }
  // 새 문자가 오고, 그 문자를 읽고(답이 있으면 답하고) 휴대폰을 닫을 때까지 기다린다.
  // optional: 답할 말이 있어도 답하지 않고 닫을 수 있다 (그때는 undefined로 끝난다)
  function wait(msg, clock) {
    var e = add({ c: msg.from, ymd: msg.ymd || today(), time: msg.time || '', dir: 'in', text: msg.body, photo: msg.photo || null, u: true });
    if (clock) setClock(clock);
    sfx('buzz'); ring(true);
    var p = new Promise(function (resolve) { P.waits.push({ c: e.c, entry: e, replies: msg.replies || null, optional: !!msg.optional, reply: null, read: false, resolve: resolve }); });
    badge();
    if (!$('phone').hidden) refresh(); else UI.point($('phoneButton'));
    return p;
  }
  // 기다리지 않는 문자 (읽든 말든 흐름은 이어진다)
  function drop(msg) {
    var e = add({ c: msg.from, ymd: msg.ymd || today(), time: msg.time || '', dir: msg.dir || 'in', text: msg.body, photo: msg.photo || null, u: (msg.dir || 'in') === 'in' });
    if (e.dir === 'in' && !msg.quiet) sfx('buzz');
    badge(); if (!$('phone').hidden) refresh();
    return e;
  }
  function refresh() {
    if (P.view === 'home') home();
    else if (P.view === 'list') list();
    else if (P.view === 'thread') thread(P.conv, true);
    else if (P.view === 'calls') calls();
    else if (P.view === 'bank') bank();
  }
  function setClock(c) { P.clock = c; $('iosTime').textContent = c; }

  // ---------- 열고 닫기 ----------
  function open(view) {
    if (!$('phone').hidden) return;
    ring(false); UI.point(null);
    var ck = H.clock && H.clock(); if (ck) P.clock = ck;   // 집에서는 지금 게임 시각
    $('iosTime').textContent = P.clock;
    $('phone').hidden = false;
    sfx('tap');
    if (P.rings) { incomingScreen(); return; }
    if (view === 'camera') camera(); else if (view === 'bank') bank(); else home();
  }
  function close() {
    if (P.ask) { askEnd(); return; }
    if (P.call && P.call.screen) return;                  // 걸려 온 전화는 받거나 끊어야 닫힌다
    if (P.bank && P.bank.must) return;                    // 보내기로 한 돈은 보내야 닫힌다
    if (P.bank && P.bank.resolve) { var r = P.bank.resolve, how = P.bankPick || 'leave', o = P.bank.o; P.bank = null; if (!P.bankPick && o && o.pay) o.pay('leave'); r(how); }
    P.bankPick = null; P.bank = null;
    camStop(); viewerClose();
    $('phone').hidden = true; P.tray = false; P.sel = null;
    var done = P.waits.filter(function (w) { return w.read && (!w.replies || w.reply != null || w.optional); });
    P.waits = P.waits.filter(function (w) { return done.indexOf(w) < 0; });
    done.forEach(function (w) { w.resolve(w.reply == null ? undefined : w.reply); });
    if (P.waits.length) ring(true);
    badge();
    var after = P.after || []; P.after = [];
    after.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  }
  // 휴대폰을 닫은 다음에 할 일 (사진을 보낸 뒤 걸려 오는 전화 같은 것)
  function afterClose(f) { if ($('phone').hidden) { setTimeout(f, 0); return; } (P.after = P.after || []).push(f); }

  // ---------- 부탁하기 (청하는 손) ----------
  // 받는 사람 목록에는 지금 이 부탁을 들어줄 수 있는 사람만 뜬다. 글은 저절로 써지고, 보내기를 길게 눌러야 보내진다.
  // 누르는 동안 쓴 글이 한 번 지워졌다가 다시 써진다. 손을 떼면 처음 쓴 글로 돌아간다.
  // o: { list: [{ id, name }], draft(id) → { first, again, final }, reply(id) → 답장, clock, time } → 보낸 사람의 id (아무에게도 안 보냈으면 null)
  var HOLD = 2.6;
  function ask(o) {
    return new Promise(function (resolve) {
      P.ask = { o: o, resolve: resolve, sent: null, to: null, timers: [] };
      ring(false); UI.point(null);
      if (o.clock) P.clock = o.clock;
      $('iosTime').textContent = P.clock;
      $('phone').hidden = false;
      sfx('tap');
      askList();
    });
  }
  function askClear() { var a = P.ask; if (!a) return; a.timers.forEach(clearTimeout); a.timers = []; if (a.hold) { cancelAnimationFrame(a.hold.raf); a.hold = null; } }
  function askList() {
    var a = P.ask; askClear(); a.to = null;
    var rows = a.o.list.map(function (p) {
      return '<button class="ios-row" data-ask-to="' + esc(p.id) + '">' + avatar(p.name) + '<span><span class="who">' + esc(p.name) + '</span><span class="pre"></span></span></button>';
    }).join('');
    el('iosAsk').className = 'ios-app ios-ask';
    el('iosAsk').innerHTML = '<div class="ios-nav"><span></span><span>새 메시지</span><span></span></div><div class="ios-to">받는 사람:</div>' + (rows || '<div class="ios-empty"></div>');
    show('iosAsk');
  }
  function askType(text, done, speed) {
    var a = P.ask, field = $('askText'), cur = field.textContent, i = 0;
    // 지금 글과 새 글이 같은 앞부분까지는 두고, 나머지만 지우고 다시 쓴다
    while (i < cur.length && i < text.length && cur[i] === text[i]) i++;
    var steps = [];
    for (var k = cur.length; k > i; k--) steps.push(cur.slice(0, k - 1));
    for (var m = i + 1; m <= text.length; m++) steps.push(text.slice(0, m));
    var n = 0;
    (function next() {
      if (!P.ask || P.ask !== a) return;
      if (n >= steps.length) { if (done) done(); return; }
      field.textContent = steps[n++];
      a.timers.push(setTimeout(next, n <= cur.length - i ? 32 : (speed || 42)));
    }());
  }
  function askCompose(id) {
    var a = P.ask, p = a.o.list.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    askClear(); a.to = id; a.name = p.name; a.d = a.o.draft(id);
    // 그 사람과 나눈 글이 있으면 위에 보인다 (부탁은 그 대화에 이어진다)
    var past = P.log.filter(function (m) { return m.c === p.name; }).slice(-4).map(bubble).join('');
    el('iosAsk').innerHTML = '<div class="ios-nav"><button data-ask-nav="list">‹</button><span></span><span></span></div><div class="ios-head">' + avatar(p.name, true) + esc(p.name) + '</div>' +
      '<div class="ios-msgs" id="askMsgs">' + past + '</div><div class="ios-compose"><div class="ios-field" id="askText"></div><button class="ios-send" id="askSend" disabled aria-label="보내기"><i></i></button></div>';
    var box = $('askMsgs'); box.scrollTop = box.scrollHeight;
    var send = $('askSend');
    send.addEventListener('pointerdown', askHoldStart);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { send.addEventListener(ev, askHoldStop); });
    askType(a.d.first, function () { send.disabled = false; send.classList.add('ready'); });
  }
  function askHoldStart(e) {
    var a = P.ask; if (!a || a.sent || $('askSend').disabled) return;
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ }
    var t0 = performance.now(), send = $('askSend'), stage = 0;
    a.hold = { raf: 0 };
    (function frame(now) {
      if (!a.hold) return;
      var q = Math.min(1, (now - t0) / 1000 / HOLD);
      send.style.setProperty('--p', (q * 100).toFixed(1) + '%');
      // 누르고 있는 동안: 잠깐 멈칫, 쓴 글을 지우고, 다시 쓴다
      if (stage === 0 && q > .18) { stage = 1; askType(a.d.again, null, 40); }
      if (stage === 1 && q > .5) { stage = 2; askType(a.d.final, null, 30); }
      if (q >= 1) { a.hold = null; askSent(); return; }
      a.hold.raf = requestAnimationFrame(frame);
    }(t0));
  }
  function askHoldStop() {
    var a = P.ask; if (!a || !a.hold || a.sent) return;
    askClear();
    $('askSend').style.setProperty('--p', '0%');
    askType(a.d.first, null, 20); // 손을 떼면 처음 쓴 글로 돌아간다
  }
  function askSent() {
    var a = P.ask, msgs = $('askMsgs'), send = $('askSend');
    askClear();
    a.sent = a.to;
    $('askText').textContent = ''; send.disabled = true; send.classList.remove('ready'); send.style.setProperty('--p', '0%');
    var ymd = today();
    add({ c: a.name, ymd: ymd, time: a.o.time || '', dir: 'out', text: a.d.final });
    msgs.insertAdjacentHTML('beforeend', '<div class="ios-day">' + esc(a.o.time || '') + '</div><div class="bubble out">' + esc(a.d.final) + '</div>');
    msgs.scrollTop = msgs.scrollHeight;
    sfx('tap');
    var nav = el('iosAsk').querySelector('[data-ask-nav]'); if (nav) nav.remove();
    a.timers.push(setTimeout(function () {
      msgs.insertAdjacentHTML('beforeend', '<div class="bubble in typing"><i></i><i></i><i></i></div>');
      msgs.scrollTop = msgs.scrollHeight;
      a.timers.push(setTimeout(function () {
        var tp = msgs.querySelector('.typing'); if (tp) tp.remove();
        var rep = a.o.reply(a.sent);
        add({ c: a.name, ymd: ymd, time: a.o.time || '', dir: 'in', text: rep });
        msgs.insertAdjacentHTML('beforeend', '<div class="bubble in">' + esc(rep) + '</div>');
        msgs.scrollTop = msgs.scrollHeight;
        sfx('buzz'); a.replied = true;
      }, 1500));
    }, 700));
  }
  function askClick(b) {
    var a = P.ask;
    if (b.dataset.askTo) { sfx('tap'); askCompose(b.dataset.askTo); }
    else if (b.dataset.askNav === 'list' && !a.sent) { sfx('tap'); askList(); }
  }
  function askEnd() {
    var a = P.ask; if (!a) return;
    if (a.sent && !a.replied) return; // 답장이 올 때까지는 닫히지 않는다
    askClear(); P.ask = null;
    el('iosAsk').hidden = true; $('phone').hidden = true;
    badge(); if (P.waits.length) ring(true);
    a.resolve(a.sent);
  }

  // ---------- 사진 저장소 ----------
  // 찍은 사진의 그림은 이 기기 브라우저에만 남는다(게임 저장과 따로). 없으면 회색 자리와 날짜만 보인다.
  var STORE = 'catdoor-claude-photos', IMG = null;
  function store() {
    if (IMG) return IMG;
    try { IMG = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { IMG = {}; }
    return IMG;
  }
  function storeSave() { try { localStorage.setItem(STORE, JSON.stringify(IMG || {})); } catch (e) { /* 꽉 찼으면 그림은 이번 판에만 */ } }
  function storeClear() { IMG = {}; try { localStorage.removeItem(STORE); } catch (e) { /* 무시 */ } }
  function photoImg(id) {
    var src = store()[id];
    if (src) return '<img alt="" src="' + src + '">';
    var p = H.photos().filter(function (x) { return x.id === id; })[0];
    return '<span class="ph-none">' + esc(p ? (Life.DAYS[p.day] || {}).date || '' : '') + '</span>';
  }

  // ---------- 카메라 ----------
  // 집에서 언제든 열 수 있다. 뷰파인더는 지금 게임 화면에서 고양이(없으면 나) 둘레를 세로로 잘라 보여 준다.
  var CW = 150, CH = 200;
  function crop() {
    var f = H.focus() || { x: 320, y: 260 };
    var x = Math.max(0, Math.min(640 - CW, f.x - CW / 2)), y = Math.max(0, Math.min(360 - CH, f.y - CH * .62));
    return { x: x, y: y };
  }
  function camera() {
    if (!H.canCamera()) { nudge('camera'); return; }
    P.view = 'camera';
    var ps = H.photos(), last = ps[ps.length - 1];
    el('iosCam').className = 'ios-app ios-cam';
    el('iosCam').innerHTML = '<div class="ios-nav dark"><button data-nav="home">‹</button><span>사진</span><span></span></div><div class="cam-view"><canvas id="camView" width="' + CW * 2 + '" height="' + CH * 2 + '"></canvas><i class="cam-flash" id="camFlash"></i></div>' +
      '<div class="cam-bar"><button class="cam-last" data-app="photo">' + (last ? photoImg(last.id) : '') + '</button><button class="cam-shutter" data-shutter="1" aria-label="찍기"></button><span></span></div>';
    show('iosCam');
    P.cam = { raf: 0 };
    if (H.camOpen) H.camOpen();
    (function loop() {
      if (!P.cam) return;
      var cv = $('camView'), w = $('world');
      if (cv && w) {
        var c = cv.getContext('2d'), r = w.width / 640, o = crop();
        c.imageSmoothingEnabled = false;
        c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
        try { c.drawImage(w, o.x * r, o.y * r, CW * r, CH * r, 0, 0, cv.width, cv.height); } catch (e) { /* 무시 */ }
      }
      P.cam.raf = requestAnimationFrame(loop);
    }());
  }
  function camStop() { if (P.cam) { cancelAnimationFrame(P.cam.raf); P.cam = null; } }
  function shoot() {
    var cv = $('camView'); if (!cv) return;
    var meta = H.shot(); if (!meta) { nudge('camera'); return; }
    sfx('shutter');
    var fl = $('camFlash'); if (fl) { fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); }
    try {
      var t = document.createElement('canvas'); t.width = CW; t.height = CH;
      var tc = t.getContext('2d'); tc.imageSmoothingEnabled = false; tc.drawImage(cv, 0, 0, CW, CH);
      var ids = Object.keys(store());
      if (ids.length >= 60) delete IMG[ids[0]]; // 오래된 그림부터 비운다 (사진 기록은 남는다)
      IMG[meta.id] = t.toDataURL('image/jpeg', .82); storeSave();
    } catch (e) { /* 그림을 못 남겨도 사진 기록은 남는다 */ }
    var lb = el('iosCam').querySelector('.cam-last'); if (lb) lb.innerHTML = photoImg(meta.id);
  }

  // ---------- 사진 ----------
  function photos() {
    P.view = 'photos';
    var ps = H.photos().slice().reverse();
    el('iosPhotos').innerHTML = '<div class="ios-nav"><button data-nav="home">‹</button><span></span><span></span></div><div class="ios-title">사진</div>' +
      (ps.length ? '<div class="ios-grid">' + ps.map(function (p) { return '<button class="grid-thumb" data-photo="' + esc(p.id) + '">' + photoImg(p.id) + (p.to && p.to.length ? '<i class="sent"></i>' : '') + '</button>'; }).join('') + '</div>' : '<div class="ios-empty"></div>');
    show('iosPhotos');
  }
  function viewer(id) {
    var ps = H.photos(), i = ps.map(function (p) { return p.id; }).indexOf(id); if (i < 0) return;
    var p = ps[i];
    P.viewer = id;
    var box = el('iosPhotos'), d = Life.DAYS[p.day] || {};
    var ov = box.querySelector('.ios-viewer');
    if (!ov) { ov = document.createElement('div'); ov.className = 'ios-viewer'; box.appendChild(ov); }
    ov.innerHTML = '<div class="ios-nav dark"><button data-viewer="close">‹</button><span>' + esc(d.date ? d.date.replace('/', '월 ') + '일' : '') + '</span><span></span></div><div class="viewer-img">' + photoImg(id) + '</div>' +
      '<div class="viewer-bar"><button data-viewer="prev"' + (i > 0 ? '' : ' disabled') + '>‹</button><span>' + (p.to || []).map(function (c) { return avatar(c); }).join('') + '</span><button data-viewer="next"' + (i < ps.length - 1 ? '' : ' disabled') + '>›</button></div>';
  }
  function viewerClose() { P.viewer = null; var ov = document.querySelector('.ios-viewer'); if (ov) ov.remove(); }
  function viewerStep(d) { var ps = H.photos(), i = ps.map(function (p) { return p.id; }).indexOf(P.viewer) + d; if (i >= 0 && i < ps.length) viewer(ps[i].id); }

  // 사진을 대화창에 놓았다: 보내고, 답장을 기다린다
  function sendPhoto(c, id) {
    var e = add({ c: c, ymd: today(), time: H.timeLabel ? H.timeLabel() : '', dir: 'out', photo: id });
    P.tray = false; P.sel = null; sfx('tap');
    thread(c);
    var box = $('threadMsgs'); box.scrollTop = box.scrollHeight;
    if (!H.photoSent) return;
    Promise.resolve(H.photoSent(c, id, e)).then(function (replies) {
      if (!replies || !replies.length) return;
      var k = 0;
      (function next() {
        if (k >= replies.length) return;
        var r = replies[k++];
        setTimeout(function () {
          var b = $('threadMsgs');
          if (P.view === 'thread' && P.conv === c && b) { b.insertAdjacentHTML('beforeend', '<div class="bubble in typing"><i></i><i></i><i></i></div>'); b.scrollTop = b.scrollHeight; }
          setTimeout(function () {
            var en = add({ c: c, ymd: today(), time: H.timeLabel ? H.timeLabel() : '', dir: 'in', text: r, u: true });
            if (P.view === 'thread' && P.conv === c && !$('phone').hidden) thread(c); else en.u = true;
            sfx('buzz'); badge(); next();
          }, 1300);
        }, 600);
      }());
    });
  }
  // 끌기: 엄지손톱 사진을 집어 대화창 위에서 놓으면 보낸다. 그냥 누르면 위로 살짝 들려 끌 수 있다고 알려 준다.
  function dragStart(e) {
    var t = e.target.closest('.tray-thumb'); if (!t) return;
    e.preventDefault();
    var g = t.cloneNode(true); g.className = 'tray-ghost'; document.body.appendChild(g);
    P.drag = { id: t.dataset.thumb, ghost: g, x0: e.clientX, y0: e.clientY, src: t, moved: 0 };
    t.classList.add('lifted');
    dragMove(e);
    window.addEventListener('pointermove', dragMove, { passive: false });
    window.addEventListener('pointerup', dragEnd);
    window.addEventListener('pointercancel', dragEnd);
  }
  function dragMove(e) {
    var d = P.drag; if (!d) return;
    d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0));
    d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
    var box = $('threadMsgs'); if (box) box.classList.toggle('drop', overBox(e, box));
    if (e.cancelable) e.preventDefault();
  }
  function overBox(e, box) { var r = box.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }
  function dragEnd(e) {
    var d = P.drag; if (!d) return;
    P.drag = null;
    window.removeEventListener('pointermove', dragMove); window.removeEventListener('pointerup', dragEnd); window.removeEventListener('pointercancel', dragEnd);
    d.ghost.remove(); d.src.classList.remove('lifted');
    var box = $('threadMsgs'); if (box) box.classList.remove('drop');
    if (box && d.moved > 12 && overBox(e, box)) { sendPhoto(P.conv, d.id); return; }
    // 그냥 눌렀다: 사진이 위로 한 번 들썩인다
    d.src.animate && d.src.animate([{ transform: 'none' }, { transform: 'translateY(-14px)' }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
  }

  // ---------- 은행 ----------
  // model: { wallet, out: [{ date, name, amount, status, id }], pending(5/8에 들어올 수수료, 프롤로그에는 null), lost, borrowed: [{ when, name, amount, note }], canCash, cash }
  function won(n) { return Life.won(n); }
  var STATUS = { soon: '예정', due: '보내기 전', paid: '출금 완료', sent: '보냄', unpaid: '미출금', deferred: '5/8로 미룸', late: '연체' };
  function bank() {
    P.view = 'bank';
    var m = H.bank(); if (!m) { nudge('bank'); return; }
    var B = P.bank || {};
    var rows = m.out.map(function (o) {
      var hot = B.unpaid && B.unpaid === o.id && !P.bankPick;
      return '<div class="bank-row' + (hot ? ' hot' : '') + (o.status === 'paid' || o.status === 'sent' ? ' done' : '') + '"><span class="d">' + esc(o.date) + '</span><span class="n">' + esc(o.name) + '<small class="st ' + o.status + '">' + esc(STATUS[o.status] || '') + '</small></span><b>' + won(o.amount) + '</b>' +
        (hot ? '<div class="bank-pick">' + (B.canCash ? '<button data-bank="cash">현금서비스로 채우기</button>' : '') + '<button data-bank="leave" class="plain">그냥 두기</button></div>' : '') + '</div>';
    }).join('');
    var borrowed = m.borrowed.map(function (b) { return '<div class="bank-row"><span class="d">' + esc(b.when) + '</span><span class="n">' + esc(b.name) + '<small>' + esc(b.note || '') + '</small></span><b>' + won(b.amount) + '</b></div>'; }).join('');
    var html = '<div class="ios-nav"><button data-nav="home">‹</button><span></span><span></span></div>' +
      '<div class="bank-card"><small>입출금 통장</small><strong>' + won(m.wallet) + '</strong></div><div class="ios-scroll">' +
      '<h5>이번 달 나갈 돈</h5>' + rows +
      (m.pending ? '<h5>들어올 돈</h5><div class="bank-row"><span class="d">5/8</span><span class="n">수수료<small>예정</small></span><b>' + won(m.pending) + '</b></div>' : '') +
      (m.lost ? '<div class="bank-row lost"><span class="d"></span><span class="n">철회·취소로 빠진 수수료</span><b>−' + won(m.lost) + '</b></div>' : '') +
      (borrowed ? '<h5>갚을 돈</h5>' + borrowed : '') +
      (m.canCash && !B.unpaid && !B.transfer && !P.bankPick ? '<button class="bank-ad" data-bank="ad"><b>카드 현금서비스</b><span>지금 바로 ' + won(m.cash) + ' 입금</span></button>' : '') +
      '</div>';
    if (B.ad) html += '<div class="bank-sheet"><p><b>카드 현금서비스</b></p><p class="big">' + won(m.cash) + '</p><p class="fine">다음 카드값에 이자가 붙어서 나갑니다.</p><button data-bank="take">받기</button><button data-bank="adClose" class="plain">닫기</button></div>';
    if (B.transfer && !P.bankPick) {
      var t = B.transfer, short = m.wallet < t.amount;
      html += '<div class="bank-sheet"><p>받는 분 <b>' + esc(t.to) + '</b></p><p class="big">' + won(t.amount) + '</p><p class="fine">통장 잔액 ' + won(m.wallet) + '</p>' +
        (short && t.cash ? '<p class="fine warn">모자란 돈은 카드 현금서비스 ' + won(m.cash) + '로 채웁니다. 다음 카드값에 이자가 붙어서 나갑니다.</p><button data-bank="cashSend">현금서비스 받고 보내기</button>' : short && t.optional ? '<p class="fine warn">잔액이 모자랍니다.</p>' : '<button data-bank="send">보내기</button>') +
        (t.optional ? '<button data-bank="leave" class="plain">보내지 않기</button>' : '') + '</div>';
    }
    el('iosBank').className = 'ios-app ios-bank';
    el('iosBank').innerHTML = html;
    show('iosBank');
  }
  // 고르는 은행 화면은 바로 열린다 (문자를 읽고 닫은 손이 그대로 은행 앱을 누른 것처럼)
  function openBank(clock) {
    if (clock) setClock(clock);
    ring(false); UI.point(null);
    $('iosTime').textContent = P.clock;
    if ($('phone').hidden) { $('phone').hidden = false; sfx('tap'); }
    bank();
  }
  // 요금이 통장에서 빠지지 못했다: 은행 앱의 그 줄에서 고른다. 고르지 않고 닫으면 그냥 둔다.
  // o: { id, canCash, clock, pay(how) }: 고른 순간 pay('cash' | 'leave')가 불리고, 바뀐 잔액과 상태를 보여 준 뒤 닫힌다.
  function bankUnpaid(o) {
    return new Promise(function (resolve) {
      P.bankPick = null;
      P.bank = { unpaid: o.id, canCash: o.canCash, resolve: resolve, o: o };
      openBank(o.clock);
    });
  }
  // 돈을 보낸다 (월세): 은행 앱의 보내기 화면. 보내기 전에는 닫히지 않는다.
  // o: { to, amount, cash(모자란 돈을 현금서비스로 채우는지), clock, pay(how), optional(보내지 않고 닫을 수 있다: 축의금) }
  function bankTransfer(o) {
    return new Promise(function (resolve) {
      P.bankPick = null;
      P.bank = { transfer: o, must: !o.optional, resolve: resolve, o: o };
      openBank(o.clock);
    });
  }
  function bankClick(b) {
    var a = b.dataset.bank, B = P.bank || {};
    if (P.bankPick) return;
    sfx('tap');
    if (a === 'ad') { P.bank = { ad: true }; bank(); return; }
    if (a === 'adClose') { P.bank = null; bank(); return; }
    if (a === 'take') { H.cash(); sfx('coin'); P.bank = null; bank(); return; }
    var how = a === 'cash' || a === 'cashSend' ? 'cash' : a === 'send' ? 'pay' : a === 'leave' ? 'leave' : null;
    if (!how || !B.resolve) return;
    P.bankPick = how; B.must = false;
    if (B.o && B.o.pay) B.o.pay(how);
    if (how !== 'leave') sfx('coin');
    bank();
    setTimeout(function () { if (P.bank === B) close(); }, 1100);
  }

  // ---------- 전화 ----------
  function calls() {
    P.view = 'calls';
    P.calls.forEach(function (x) { if (vis(x)) x.seen = true; });
    var rows = P.calls.filter(vis).reverse().map(function (x) {
      return '<button class="ios-row call-row" data-call="' + esc(x.c) + '">' + avatar(x.c) + '<span><span class="who' + (x.kind === 'missed' ? ' missed' : '') + '">' + esc(x.c) + (x.n > 1 ? ' (' + x.n + ')' : '') + '<small>' + esc(shortDate(x.ymd)) + '</small></span><span class="pre">' + esc({ missed: '부재중 전화', in: '받은 전화', out: '건 전화' }[x.kind]) + '</span></span></button>';
    }).join('');
    el('iosCalls').innerHTML = '<div class="ios-nav"><button data-nav="home">‹</button><span></span><span></span></div><div class="ios-title">최근 기록</div><div class="ios-scroll">' + rows + '</div>';
    show('iosCalls');
    badge();
  }
  function logCall(c, kind, ymd, time) {
    var last = P.calls[P.calls.length - 1];
    if (last && last.c === c && last.kind === kind && kind === 'missed') { last.n = (last.n || 1) + 1; last.ymd = ymd || today(); last.seen = false; return; }
    P.calls.push({ c: c, kind: kind, ymd: ymd || today(), time: time || '', n: 1 });
  }
  // 걸려 오는 전화: 휴대폰이 울린다. 휴대폰을 열면 받기와 거절이 보인다. 한참 안 받으면 부재중이 된다.
  function incoming(c, sec) {
    return new Promise(function (resolve) {
      P.rings = { c: c, resolve: resolve };
      ring(true); badge(); UI.point($('phoneButton'));
      var beep = setInterval(function () { if (!P.rings) { clearInterval(beep); return; } sfx('buzz'); }, 1400);
      sfx('buzz');
      P.rings.timer = setTimeout(function () {
        if (!P.rings || P.rings.c !== c || P.call) return;
        var r = P.rings; P.rings = null; clearInterval(beep);
        logCall(c, 'missed'); ring(false); UI.point(null); badge();
        if (!$('phone').hidden) refresh();
        r.resolve('missed');
      }, (sec || 25) * 1000);
      if (!$('phone').hidden) incomingScreen();
    });
  }
  function incomingScreen() {
    var r = P.rings; if (!r) return;
    P.call = { screen: true };
    el('iosCall').className = 'ios-app ios-call';
    el('iosCall').innerHTML = '<div class="call-top">' + avatar(r.c, true) + '<b>' + esc(r.c) + '</b><small>휴대전화</small></div><div class="call-btns"><button class="decline" data-ans="no" aria-label="거절"><svg viewBox="0 0 24 24"><path d="M3 13.5c5-4 13-4 18 0l-2 3-4-1v-2.5c-2-.6-4-.6-6 0V15.5l-4 1z" fill="#fff"/></svg></button><button class="accept" data-ans="yes" aria-label="받기"><svg viewBox="0 0 24 24"><path d="M7 3.5l3 3.6-1.8 2.2c1 2.2 2.6 3.9 4.6 4.8l2.2-1.8 3.5 3-1.6 3.2C10.6 18.2 5.8 13.4 3.5 6.8z" fill="#fff"/></svg></button></div>';
    show('iosCall');
  }
  function answer(yes) {
    var r = P.rings; if (!r) return;
    clearTimeout(r.timer); P.rings = null; P.call = null;
    ring(false); UI.point(null);
    logCall(r.c, yes ? 'in' : 'missed');
    sfx('tap');
    $('phone').hidden = true; badge();
    r.resolve(yes ? 'answer' : 'decline');
  }
  // 통화 중: 휴대폰은 닫히고 화면 위에 통화 막대가 뜬다. 대화는 대화창으로 이어진다.
  function bar() {
    var b = $('callBar');
    if (!b) { b = document.createElement('div'); b.id = 'callBar'; b.className = 'call-bar'; b.hidden = true; ($('gameScreen') || document.body).appendChild(b); b.addEventListener('click', barClick); }
    return b;
  }
  function callStart(c) {
    var b = bar(); P.talk = { c: c, t0: Date.now(), timer: 0 };
    b.innerHTML = '<span class="dot"></span><b>' + esc(c) + '</b><span id="callTime">0:00</span><div class="call-picks" id="callPicks"></div>';
    b.hidden = false;
    P.talk.timer = setInterval(function () { var s = Math.floor((Date.now() - P.talk.t0) / 1000), t = $('callTime'); if (t) t.textContent = Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + s % 60; }, 500);
  }
  function callEnd() {
    if (P.talk) clearInterval(P.talk.timer);
    P.talk = null; bar().hidden = true; sfx('tap');
  }
  // 통화 중에 할 말을 고른다
  function callPick(options) {
    return new Promise(function (resolve) {
      var box = $('callPicks'); if (!box) { resolve(0); return; }
      P.talkPick = resolve;
      box.innerHTML = options.map(function (o, i) { return '<button data-pick="' + i + '">' + esc(o) + '</button>'; }).join('');
    });
  }
  function barClick(e) {
    var b = e.target.closest('button'); if (!b || b.dataset.pick == null || !P.talkPick) return;
    var r = P.talkPick; P.talkPick = null; $('callPicks').innerHTML = ''; sfx('tap'); r(+b.dataset.pick);
  }
  function talking() { return !!P.talk; }
  // 전화 앱에서 누른 사람에게 건다 (걸 수 있는 사람만)
  function dial(c) {
    if (!H.canCall(c) || !H.call) { nudge('call'); return; }
    sfx('tap');
    el('iosCall').className = 'ios-app ios-call';
    el('iosCall').innerHTML = '<div class="call-top">' + avatar(c, true) + '<b>' + esc(c) + '</b><small>연결 중...</small></div>';
    show('iosCall'); P.call = { screen: true };
    setTimeout(function () {
      P.call = null; $('phone').hidden = true; logCall(c, 'out'); badge();
      Promise.resolve(H.call(c)).catch(function (e) { console.error(e); });
    }, 1600);
  }

  // 눌러도 지금은 쓸 수 없는 앱: 살짝 흔들린다
  function nudge(app) {
    var b = document.querySelector('[data-app="' + app + '"]');
    if (b && b.animate) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 240 });
    sfx('bad');
  }

  // ---------- 누르기 ----------
  function click(e) {
    var b = e.target.closest('button'), screen = e.target.closest('.iphone');
    if (!screen) { close(); return; }
    if (P.ask) { if (b) askClick(b); return; }
    if (!b) return;
    var d = b.dataset;
    if (d.ans) { answer(d.ans === 'yes'); return; }
    if (P.call && P.call.screen) return;
    if (d.app) {
      if (d.app === 'msg') { sfx('tap'); list(); }
      else if (d.app === 'call') { sfx('tap'); calls(); }
      else if (d.app === 'camera') camera();
      else if (d.app === 'photo') { sfx('tap'); photos(); }
      else if (d.app === 'bank') { sfx('tap'); bank(); }
      return;
    }
    if (d.nav === 'home') { if (P.bank && P.bank.must) return; sfx('tap'); home(); return; }
    if (d.nav === 'list') { sfx('tap'); P.tray = false; list(); return; }
    if (d.conv != null) { sfx('tap'); P.tray = false; thread(d.conv); return; }
    if (d.reply != null) {
      var w = P.waits.filter(function (x) { return x.c === P.conv && x.replies && x.reply == null; })[0]; if (!w) return;
      w.reply = +d.reply; sfx('tap');
      add({ c: w.c, ymd: today(), time: w.entry.time, dir: 'out', text: w.replies[w.reply] });
      thread(P.conv);
      setTimeout(close, 900);
      return;
    }
    if (d.tray) { sfx('tap'); P.tray = !P.tray; thread(P.conv, true); return; }
    if (d.shutter) { shoot(); return; }
    if (d.photo) { sfx('tap'); viewer(d.photo); return; }
    if (d.viewer === 'close') { sfx('tap'); viewerClose(); return; }
    if (d.viewer === 'prev') { viewerStep(-1); return; }
    if (d.viewer === 'next') { viewerStep(1); return; }
    if (d.call) { dial(d.call); return; }
    if (d.bank) { bankClick(b); return; }
  }
  function init() {
    $('phone').addEventListener('click', click);
    $('phone').addEventListener('pointerdown', dragStart);
    $('iosHomebar').addEventListener('click', function (e) { e.stopPropagation(); if (P.bank && P.bank.must) return; if (P.call && P.call.screen) return; if ($('phone').hidden) return; if (P.view !== 'home' && !P.ask) { sfx('tap'); home(); return; } close(); });
    $('phoneButton').addEventListener('click', function () { open(); });
  }

  // ---------- 저장과 불러오기 ----------
  // 대화방 이름을 고친다 (연락처에 저장한 이름을 바꿨다)
  function rename(from, to) {
    if (from === to) return;
    P.log.forEach(function (m) { if (m.c === from) m.c = to; });
    P.calls.forEach(function (x) { if (x.c === from) x.c = to; });
    P.waits.forEach(function (w) { if (w.c === from) w.c = to; });
    if (P.conv === from) P.conv = to;
    badge();
  }
  function exportState() { return JSON.parse(JSON.stringify({ log: P.log, calls: P.calls })); }
  function load(o, opts) {
    o = o ? JSON.parse(JSON.stringify(o)) : {};
    P.log = o.log || []; P.calls = o.calls || [];
    P.waits = []; P.rings = null; P.ask = null; P.bank = null; P.bankPick = null; P.call = null; P.after = [];
    if (opts && opts.fresh) storeClear();
    badge();
  }
  function busy() { return !$('phone').hidden || !!P.talk; }

  return {
    init: init, setHooks: setHooks, wait: wait, drop: drop, ask: ask, open: open, close: close, afterClose: afterClose, setClock: setClock,
    bankUnpaid: bankUnpaid, bankTransfer: bankTransfer, incoming: incoming, callStart: callStart, callEnd: callEnd, callPick: callPick, talking: talking,
    logCall: logCall, exportState: exportState, rename: rename, load: load, busy: busy, ring: ring, badge: badge, dateLabel: dateLabel,
    camOn: function () { return !!P.cam && !$('phone').hidden; },
    P: P
  };
}());
