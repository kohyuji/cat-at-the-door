/* 화면 위 HTML 부분: 상단 표시, 한 줄씩 나오는 대화창, 검은 화면 타자, 아이폰, 결산 영수증, 소리.
   규칙은 Life가 정하고, 여기서는 받은 값을 보여 주기만 한다. */
var UI = (function () {
  'use strict';
  var KEY_MUTE = 'catdoor-claude-mute';
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function img(name, px, cls) { return '<img alt="" class="' + (cls || '') + '" src="' + PixelIcons.url(name, px || 1) + '">'; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function sign(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }
  function wonSigned(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Life.won(Math.abs(n)); }

  // ---------- 소리 ----------
  var muted = false, ac = null, noiseBuf = null;
  try { muted = localStorage.getItem(KEY_MUTE) === '1'; } catch (e) { /* 저장소를 못 쓰면 소리 켬 */ }
  function audio() {
    if (muted) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { return null; }
    return ac;
  }
  function tone(f, d, type, vol, to, delay) {
    var a = audio(); if (!a) return;
    var t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
    g.gain.setValueAtTime(vol || .05, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + .03);
  }
  function noise(d, vol, freq, delay, q) {
    var a = audio(); if (!a) return;
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); var ch = noiseBuf.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    var t0 = a.currentTime + (delay || 0), src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = 'bandpass'; f.frequency.value = freq || 1000; f.Q.value = q || 1;
    g.gain.setValueAtTime(vol || .05, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t0); src.stop(t0 + d + .03);
  }
  var SFX = {
    tap: function () { tone(740, .05, 'square', .03); },
    coin: function () { tone(988, .07, 'square', .045); tone(1319, .14, 'square', .045, 0, .07); },
    spend: function () { tone(660, .06, 'square', .035); tone(440, .1, 'square', .035, 0, .06); },
    meow: function () { tone(620, .14, 'triangle', .09, 980); tone(980, .26, 'triangle', .08, 520, .13); },
    purr: function () { for (var i = 0; i < 6; i++) tone(48, .16, 'sawtooth', .035, 44, i * .17); },
    buzz: function () { tone(110, .22, 'sawtooth', .05); tone(110, .22, 'sawtooth', .05, 0, .32); },
    good: function () { tone(784, .08, 'square', .04); tone(1047, .16, 'square', .04, 0, .08); },
    bad: function () { tone(311, .12, 'square', .04); tone(233, .2, 'square', .04, 0, .1); },
    sticker: function () { tone(1047, .06, 'square', .04); tone(1319, .06, 'square', .04, 0, .06); tone(1568, .18, 'square', .04, 0, .12); },
    pour: function () { noise(.45, .05, 2600, 0, 2); },
    water: function () { noise(.5, .04, 900, 0, 3); },
    scoop: function () { noise(.2, .05, 1800, 0, 1); },
    door: function () { noise(.3, .05, 500, 0, 1); },
    scratch: function () { noise(.12, .07, 3400, 0, 2); noise(.12, .06, 3000, .16, 2); },
    sneeze: function () { noise(.25, .08, 1500, .05, .8); tone(500, .08, 'square', .03, 300); },
    thunder: function () { noise(1.6, .28, 110, 0, .7); },
    rain: function () { noise(1.4, .02, 4200, 0, .5); },
    page: function () { noise(.12, .03, 2200, 0, 1); },
    sleep: function () { tone(392, .3, 'triangle', .04); tone(330, .5, 'triangle', .035, 0, .3); },
    yawn: function () { tone(330, .6, 'triangle', .04, 180); },
    over: function () { tone(220, .8, 'triangle', .05, 110); }
  };
  function sfx(name) { try { if (SFX[name]) SFX[name](); } catch (e) { /* 소리가 안 나도 게임은 계속 */ } }
  var SVG_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8c1.5 1.2 1.5 6.8 0 8M19 5c3 2.6 3 11.4 0 14" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  var SVG_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2"/></svg>';
  function drawSound() { var b = $('soundButton'); if (!b) return; b.innerHTML = muted ? SVG_OFF : SVG_ON; b.setAttribute('aria-pressed', muted ? 'false' : 'true'); }
  function setMuted(m) { muted = !!m; try { localStorage.setItem(KEY_MUTE, muted ? '1' : '0'); } catch (e) { /* 무시 */ } drawSound(); }

  // ---------- 상단 표시 ----------
  var last = {};
  function show(id, on) { var el = $(id); if (el) el.hidden = !on; }
  function setHTML(el, html) { if (el.__h !== html) { el.innerHTML = html; el.__h = html; } }
  function float(el, text, good) {
    if (!el || el.hidden) return;
    var r = el.getBoundingClientRect(), d = document.createElement('span');
    d.className = 'delta ' + (good ? 'up' : 'down');
    d.textContent = text;
    d.style.left = Math.round(r.left + r.width / 2 - 14) + 'px';
    d.style.top = Math.round(r.bottom + 2) + 'px';
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1500);
  }
  function hud(v) {
    var sh = v.show || {};
    show('hudDate', sh.date); show('hudClock', sh.clock); show('hudWallet', sh.wallet);
    show('hudFood', sh.food); show('hudEnergy', sh.energy); show('hudHearts', sh.hearts);
    if (sh.date) setHTML($('hudDate'), esc(v.date));
    if (sh.clock) {
      var c = $('hudClock');
      setHTML(c, esc(Life.clock(v.minute)) + (v.due ? '<span class="due">/ ' + esc(Life.clock(v.due)) + '</span>' : ''));
      c.classList.toggle('late', !!v.late);
    }
    if (sh.wallet) setHTML($('hudWallet'), img('coin', 1) + esc(Life.won(v.wallet)));
    if (sh.food) {
      var f = v.food || { dry: 0, wet: 0 }, pips = '', nd = Math.min(f.dry, 10), nw = Math.min(f.wet, 6);
      for (var i = 0; i < nd; i++) pips += '<i class="pip"></i>';
      for (var k = 0; k < nw; k++) pips += '<i class="pip wet"></i>';
      if (!nd && !nw) pips = '<i class="pip off"></i><i class="pip off"></i>';
      setHTML($('hudFood'), img('paw', 1) + pips + (f.dry > 10 ? '<small>+' + (f.dry - 10) + '</small>' : ''));
    }
    if (sh.energy) {
      var e = $('hudEnergy'), cells = '';
      for (var j = 0; j < Life.MAX; j++) cells += '<i class="' + (j < v.energy ? 'on' : '') + '"></i>';
      setHTML(e, cells);
      e.classList.toggle('low', v.energy <= 2 && v.energy > 0); e.classList.toggle('empty', v.energy <= 0);
    }
    if (sh.hearts) {
      var h = '';
      for (var m = 0; m < Life.MAX; m++) h += img(m < v.hearts ? 'heart' : 'heartEmpty', 1);
      setHTML($('hudHearts'), h);
    }
    if (last.ok) {
      if (sh.wallet && v.wallet !== last.wallet) float($('hudWallet'), wonSigned(v.wallet - last.wallet), v.wallet > last.wallet);
      if (sh.energy && v.energy !== last.energy) float($('hudEnergy'), sign(v.energy - last.energy), v.energy > last.energy);
      if (sh.hearts && v.hearts !== last.hearts) float($('hudHearts'), sign(v.hearts - last.hearts), v.hearts > last.hearts);
    }
    last = { ok: true, wallet: v.wallet, energy: v.energy, hearts: v.hearts };
  }
  function hudReset() { last = {}; }

  // ---------- 타자 (대화창과 검은 화면이 함께 쓴다) ----------
  var T = null;
  function typeText(el, text, done, speed) {
    if (T) clearInterval(T.timer);
    T = { el: el, text: text, i: 0, done: done, finished: false, t0: Date.now() };
    el.textContent = '';
    var me = T;
    T.timer = setInterval(function () {
      me.i++;
      me.el.textContent = me.text.slice(0, me.i);
      if (me.i >= me.text.length) { clearInterval(me.timer); me.finished = true; }
    }, speed || 30);
  }
  function advance() {
    if (!T || Date.now() - T.t0 < 90) return false;
    if (!T.finished) { clearInterval(T.timer); T.el.textContent = T.text; T.finished = true; return true; }
    var d = T.done; T = null; d(); return true;
  }

  // ---------- 대화창: 한 번에 한 줄 ----------
  var who = function () { return { name: '', face: null }; }, drawFace = function () {};
  function setSpeakers(whoFn, faceFn) { who = whoFn; drawFace = faceFn; }
  var sayDepth = 0;
  function sayOne(line) {
    if (typeof line === 'string') line = { who: 'me', text: line };
    return new Promise(function (resolve) {
      var box = $('dialogue'), info = who(line) || {};
      box.hidden = false;
      $('speaker').textContent = info.name || '';
      box.classList.toggle('no-face', !info.face);
      if (info.face) drawFace($('portrait'), info.face);
      if (line.sfx) sfx(line.sfx);
      typeText($('speech'), line.text, resolve, line.slow ? 60 : 30);
    });
  }
  // 대화와 검은 화면은 한 줄로 세운다. 두 흐름이 동시에 말을 걸어도 앞의 것이 끝난 뒤에 나온다.
  var textQueue = Promise.resolve();
  function queued(run) {
    var p = textQueue.then(run);
    textQueue = p.catch(function () { /* 다음 줄은 계속 */ });
    return p;
  }
  function say(lines) {
    if (!Array.isArray(lines)) lines = [lines];
    lines = lines.filter(Boolean);
    sayDepth++;
    function end() { sayDepth--; if (!sayDepth) $('dialogue').hidden = true; }
    return queued(function () {
      return lines.reduce(function (p, line) { return p.then(function () { return sayOne(line); }); }, Promise.resolve());
    }).then(end, function (e) { end(); throw e; });
  }
  function talking() { return !$('dialogue').hidden; }

  // ---------- 검은 화면 ----------
  function black(lines, opts) {
    opts = opts || {};
    var el = $('blackScreen'), tx = $('blackText');
    return queued(function () {
      el.hidden = false; tx.textContent = '';
      return lines.reduce(function (p, text) {
        return p.then(function () { return new Promise(function (resolve) { typeText(tx, text, resolve, opts.speed || 75); }); });
      }, Promise.resolve()).then(function () { if (!opts.keep) { el.hidden = true; tx.textContent = ''; } });
    });
  }
  function blackOff() { $('blackScreen').hidden = true; $('blackText').textContent = ''; }
  function blackOn() { $('blackScreen').hidden = false; $('blackText').textContent = ''; }

  // ---------- 휴대폰 ----------
  var APPS = [
    { id: 'msg', name: '메시지', bg: '#34c759', svg: '<path d="M12 4C6.5 4 2.5 7.4 2.5 11.6c0 2.4 1.3 4.5 3.4 5.9-.2 1.4-.9 2.6-1.9 3.5 2 0 3.8-.8 5-1.9.9.2 1.9.3 3 .3 5.5 0 9.5-3.4 9.5-7.6S17.5 4 12 4z" fill="#fff"/>' },
    { id: 'call', name: '전화', bg: '#34c759', svg: '<path d="M7 3.5l3 3.6-1.8 2.2c1 2.2 2.6 3.9 4.6 4.8l2.2-1.8 3.5 3-1.6 3.2C10.6 18.2 5.8 13.4 3.5 6.8z" fill="#fff"/>' },
    { id: 'photo', name: '사진', bg: '#fff', svg: '<g transform="translate(12 12)"><ellipse rx="3" ry="6" cy="-4" fill="#f9c440"/><ellipse rx="3" ry="6" cy="-4" fill="#f57b39" transform="rotate(60)"/><ellipse rx="3" ry="6" cy="-4" fill="#e9428a" transform="rotate(120)"/><ellipse rx="3" ry="6" cy="-4" fill="#9a5ce6" transform="rotate(180)"/><ellipse rx="3" ry="6" cy="-4" fill="#3d9bf0" transform="rotate(240)"/><ellipse rx="3" ry="6" cy="-4" fill="#4cc764" transform="rotate(300)"/></g>' },
    { id: 'camera', name: '카메라', bg: 'linear-gradient(#d9dadc,#9a9ca0)', svg: '<rect x="3" y="7" width="18" height="12" rx="2" fill="#2c2c2e"/><rect x="8" y="5" width="8" height="3" rx="1" fill="#2c2c2e"/><circle cx="12" cy="13" r="4" fill="#5a5a5e" stroke="#c7c7cc" stroke-width="1.5"/>' },
    { id: 'weather', name: '날씨', bg: 'linear-gradient(#4aa3f0,#2a6fd0)', svg: '<circle cx="9" cy="9" r="4" fill="#ffd60a"/><path d="M8 18h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.4 1.6A2.7 2.7 0 0 0 8 18z" fill="#fff"/>' },
    { id: 'clock', name: '시계', bg: '#000', svg: '<circle cx="12" cy="12" r="8.5" fill="#fff"/><path d="M12 7v5l3.5 2" stroke="#000" stroke-width="1.6" fill="none"/>' },
    { id: 'cal', name: '캘린더', bg: '#fff', svg: '<text x="12" y="8" font-size="5" text-anchor="middle" fill="#ff3b30" font-family="sans-serif">DAY</text><text x="12" y="19" font-size="11" text-anchor="middle" fill="#000" font-family="sans-serif">12</text>' },
    { id: 'set', name: '설정', bg: 'linear-gradient(#b6b8bd,#8e9096)', svg: '<circle cx="12" cy="12" r="6.5" fill="none" stroke="#3a3a3c" stroke-width="3" stroke-dasharray="2.4 1.6"/><circle cx="12" cy="12" r="3" fill="#3a3a3c"/>' }
  ];
  var PH = { msgs: [], view: 'home', thread: null, waits: [], clock: '10:42' };
  function phoneBadge() { var n = PH.msgs.filter(function (m) { return m.unread || (m.replies && m.reply == null); }).length; $('phoneBadge').hidden = !n; $('phoneBadge').textContent = '!'; return n; }
  function ring(on) { $('phoneButton').classList.toggle('ring', !!on); }
  function phoneHome() {
    PH.view = 'home';
    var unread = PH.msgs.filter(function (m) { return m.unread || (m.replies && m.reply == null); }).length;
    $('iosHome').innerHTML = APPS.map(function (a) {
      return '<button class="ios-app-icon" data-app="' + a.id + '"><span class="glyph" style="background:' + a.bg + '"><svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">' + a.svg + '</svg></span>' + esc(a.name) + (a.id === 'msg' && unread ? '<b>' + unread + '</b>' : '') + '</button>';
    }).join('');
    $('iosHome').hidden = false; $('iosList').hidden = true; $('iosThread').hidden = true;
  }
  function avatar(m) { return '<span class="ios-avatar">' + esc(m.from.charAt(0)) + '</span>'; }
  function phoneList() {
    PH.view = 'list';
    $('iosList').innerHTML = '<div class="ios-nav"><button data-nav="home">‹</button><span></span><span></span></div><div class="ios-title">메시지</div>' +
      PH.msgs.map(function (m, i) {
        return '<button class="ios-row" data-msg="' + i + '">' + avatar(m) + '<span><span class="who">' + esc(m.from) + '<small>' + esc(m.time) + '</small></span><span class="pre">' + esc(m.preview || m.body) + '</span></span>' + (m.unread ? '<i class="unread"></i>' : '') + '</button>';
      }).join('');
    $('iosHome').hidden = true; $('iosList').hidden = false; $('iosThread').hidden = true;
  }
  function phoneThread(i) {
    var m = PH.msgs[i]; if (!m) return;
    PH.view = 'thread'; PH.thread = i;
    m.unread = false;
    var html = '<div class="ios-nav"><button data-nav="list">‹</button><span></span><span></span></div><div class="ios-head">' + avatar(m) + esc(m.from) + '</div><div class="ios-msgs"><div class="ios-day">' + esc(m.time) + '</div><div class="bubble in">' + esc(m.body) + '</div>' +
      (m.reply != null ? '<div class="bubble out">' + esc(m.replies[m.reply]) + '</div>' : '') + '</div>';
    if (m.replies && m.reply == null) html += '<div class="ios-replies">' + m.replies.map(function (r, k) { return '<button data-reply="' + k + '">' + esc(r) + '</button>'; }).join('') + '</div>';
    $('iosThread').innerHTML = html;
    $('iosHome').hidden = true; $('iosList').hidden = true; $('iosThread').hidden = false;
    phoneBadge();
    // 가장 최근에 받은 문자의 첫 줄부터 보이게 (긴 문자가 화면이 낮은 가로 폰에서 잘리지 않게)
    var box = $('iosThread').querySelector('.ios-msgs');
    if (box) {
      var ins = box.querySelectorAll('.bubble.in'), b = ins[ins.length - 1];
      box.scrollTop = b ? Math.max(0, b.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 28) : box.scrollHeight;
    }
  }
  function phoneOpen() {
    if (!$('phone').hidden) return;
    ring(false); point(null);
    $('iosTime').textContent = PH.clock;
    $('phone').hidden = false;
    sfx('tap');
    phoneHome();
  }
  function phoneClose() {
    $('phone').hidden = true;
    var done = PH.waits.filter(function (w) { return !w.msg.unread && (!w.msg.replies || w.msg.reply != null); });
    PH.waits = PH.waits.filter(function (w) { return done.indexOf(w) < 0; });
    done.forEach(function (w) { w.resolve(w.msg.reply); });
    if (PH.waits.length) { ring(true); }
    phoneBadge();
  }
  // 새 문자가 오고, 그 문자를 읽고(답이 있으면 답하고) 휴대폰을 닫을 때까지 기다린다.
  function phoneWait(msg, clock) {
    msg.unread = true;
    PH.msgs.unshift(msg);
    if (clock) PH.clock = clock;
    phoneBadge(); ring(true); sfx('buzz');
    point($('phoneButton'));
    return new Promise(function (resolve) { PH.waits.push({ msg: msg, resolve: resolve }); });
  }
  function phoneSeed(msgs) { PH.msgs = msgs.map(function (m) { m.unread = false; return m; }); phoneBadge(); }
  function phoneMsgs() { return PH.msgs; }
  function phoneSetClock(c) { PH.clock = c; }
  function phoneClick(e) {
    var b = e.target.closest('button'), screen = e.target.closest('.iphone');
    if (!screen) { phoneClose(); return; }
    if (!b) return;
    if (b.dataset.app === 'msg') { sfx('tap'); phoneList(); }
    else if (b.dataset.app) { b.animate && b.animate([{ transform: 'scale(.94)' }, { transform: 'none' }], { duration: 160 }); }
    else if (b.dataset.nav === 'home') { sfx('tap'); phoneHome(); }
    else if (b.dataset.nav === 'list') { sfx('tap'); phoneList(); }
    else if (b.dataset.msg != null) { sfx('tap'); phoneThread(+b.dataset.msg); }
    else if (b.dataset.reply != null) {
      var m = PH.msgs[PH.thread]; m.reply = +b.dataset.reply; sfx('tap');
      phoneThread(PH.thread);
      setTimeout(phoneClose, 900);
    }
  }

  // ---------- 손가락 화살표 (HTML 쪽 대상) ----------
  function point(el) {
    var p = $('pointer');
    if (!el) { p.hidden = true; p.__el = null; return; }
    p.__el = el; p.hidden = false; placePointer();
  }
  function placePointer() {
    var p = $('pointer'); if (!p || p.hidden || !p.__el) return;
    var r = p.__el.getBoundingClientRect();
    p.style.left = Math.round(r.left + r.width / 2 - 15) + 'px';
    p.style.top = Math.round(r.bottom + 4) + 'px';
  }

  // ---------- 비용 아이콘 ----------
  function chips(list, x, y) {
    var el = $('chips');
    if (!list || !list.length) { el.hidden = true; el.__k = ''; return; }
    var html = list.map(function (c) { return '<span class="chip ' + (c.cls || '') + '">' + (c.icon ? img(c.icon, 1) : '') + esc(c.text || '') + '</span>'; }).join('');
    if (el.__k !== html) { el.innerHTML = html; el.__k = html; }
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
    el.hidden = false;
  }

  // ---------- 하루 결산 영수증 ----------
  function line(label, amount, cls, why) {
    return '<div class="r-line ' + (cls || '') + '"><span>' + esc(label) + (why ? ' <span class="why">' + esc(why) + '</span>' : '') + '</span><b>' + esc(amount || '') + '</b></div>';
  }
  function sec(icon, title, body) { return body ? '<div class="r-sec"><h4>' + img(icon, 1) + esc(title) + '</h4>' + body + '</div>' : ''; }
  function clientName(id) { var c = Story.CLIENT[id]; return c ? c.name + ' 고객님' : ''; }
  function receiptHTML(s, t) {
    var d = Life.DAYS[t.day], h = '';
    h += '<h3>' + esc(d.date + ' (' + d.wd + ')') + '</h3><div class="sub">' + esc(s.me) + ' · ' + esc(s.cat) + '</div>';
    var earned = t.earned.map(function (e) {
      return e.key === 'allowance' ? line('활동비', wonSigned(e.amount), 'plus') : line(Story.PRODUCT[e.need] + (e.pet ? ' + ' + Story.PRODUCT.pet : ''), wonSigned(e.amount), 'plus', clientName(e.id) + (e.bonus ? ' · 성과급 ×' + Life.BONUS : ''));
    }).join('') + t.lost.map(function (l) { return line(clientName(l.id), '0원', 'minus', Story.LOST[l.why]); }).join('');
    h += sec('coin', '번 돈', earned);
    h += sec('coin', '쓴 돈', t.spent.map(function (sp) { return line(Story.ITEM[sp.item], wonSigned(-sp.amount), 'minus'); }).join(''));
    h += sec('heart', Life.josa(s.cat, 'of') + ' 마음', t.hearts.map(function (x) { return line(Story.HEART[x.key], sign(x.delta), x.delta > 0 ? 'plus' : 'minus'); }).join('') +
      '<div class="r-stickers">' + (function () { var o = ''; for (var i = 0; i < Life.MAX; i++) o += img(i < s.hearts ? 'heart' : 'heartEmpty', 1); return o; }()) + '</div>');
    var en = '', next = t.energyNext == null ? s.energy : t.energyNext; for (var k = 0; k < Life.MAX; k++) en += img('bolt', 1, k < next ? '' : 'off');
    var sl = t.sleep, slept = '';
    if (sl) {
      slept = line(Life.clock(sl.bed) + ' 잠듦', sign(sl.gain), sl.gain >= 3 ? 'plus' : 'minus',
        sl.lost.map(function (k) { return { late: '늦게 잠', woke: '새벽에 깸', coffee: '저녁 커피' }[k]; }).join(' · '));
    }
    h += sec('bolt', '내일 아침 체력', slept + '<div class="r-stickers">' + en + '</div>');
    var st = t.stickers.map(function () { return img('sticker', 1); }).join('');
    h += sec('sticker', '실적', '<div class="r-line"><span class="r-stickers">' + st + '</span><b>' + esc((t.total == null ? s.contracts : t.total) + ' / ' + Life.GOAL + '건') + '</b></div>');
    h += '<div class="r-sec r-total"><span>' + img('coin', 1) + ' 지갑</span><span>' + esc(Life.won(s.wallet)) + '</span></div>';
    return h;
  }
  function receipt(s, t) {
    var m = $('receipt'), paper = $('receiptPaper');
    paper.innerHTML = receiptHTML(s, t) + '<div class="r-hint" aria-hidden="true">▼</div>';
    m.hidden = false; m.scrollTop = 0; sfx('page');
    return new Promise(function (resolve) {
      var t0 = Date.now();
      function close(e) {
        if (e && e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
        if (Date.now() - t0 < 600) return;
        m.removeEventListener('click', close); document.removeEventListener('keydown', close);
        m.hidden = true; resolve();
      }
      m.addEventListener('click', close); document.addEventListener('keydown', close);
    });
  }

  // ---------- 작은 창 ----------
  function askName() {
    var m = $('naming'), input = $('catName');
    m.hidden = false; input.value = '';
    setTimeout(function () { try { input.focus(); } catch (e) { /* 무시 */ } }, 50);
    return new Promise(function (resolve) {
      $('nameForm').onsubmit = function (e) {
        e.preventDefault();
        m.hidden = true; input.blur();
        resolve(Life.cleanName(input.value, '보리'));
      };
    });
  }
  function gameOver() {
    var m = $('gameOver'); m.hidden = false; sfx('over');
    return new Promise(function (resolve) { $('retryShelf').onclick = function () { m.hidden = true; resolve(); }; });
  }
  function busy() {
    return !!T || !$('phone').hidden || !$('receipt').hidden || !$('naming').hidden || !$('gameOver').hidden || !$('menu').hidden || !$('blackScreen').hidden || !$('dialogue').hidden;
  }

  function init() {
    drawSound();
    // 대화는 대화창이 아니라 화면 어디를 눌러도 넘어간다 (버튼과 휴대폰, 메뉴는 빼고)
    document.addEventListener('pointerdown', function (e) {
      if ($('dialogue').hidden || (e.button !== undefined && e.button > 0)) return;
      if (e.target && e.target.closest && e.target.closest('button, input, #phone, #menu, #receipt, #naming, #blackScreen, #gameOver')) return;
      if (advance()) sfx('tap');
    });
    $('blackScreen').addEventListener('click', function () { advance(); });
    $('phone').addEventListener('click', phoneClick);
    $('iosHomebar').addEventListener('click', function (e) { e.stopPropagation(); phoneClose(); });
    $('phoneButton').addEventListener('click', phoneOpen);
    $('soundButton').addEventListener('click', function () { setMuted(!muted); if (!muted) sfx('tap'); });
    document.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && T && !(e.target && e.target.tagName === 'INPUT')) { e.preventDefault(); advance(); }
    });
    window.addEventListener('resize', placePointer);
  }

  return {
    init: init, sfx: sfx, setMuted: setMuted, isMuted: function () { return muted; },
    hud: hud, hudReset: hudReset, float: float,
    say: say, talking: talking, setSpeakers: setSpeakers, advance: advance,
    black: black, blackOn: blackOn, blackOff: blackOff,
    phoneWait: phoneWait, phoneOpen: phoneOpen, phoneClose: phoneClose, phoneSeed: phoneSeed, phoneMsgs: phoneMsgs, phoneSetClock: phoneSetClock, ring: ring,
    point: point, placePointer: placePointer, chips: chips,
    receipt: receipt, receiptHTML: receiptHTML, askName: askName, gameOver: gameOver, busy: busy, wait: wait, esc: esc, img: img
  };
}());
