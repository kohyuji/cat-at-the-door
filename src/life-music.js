/* 장소마다 다른 배경음악. 파일 없이 Web Audio로 짧은 곡을 되풀이한다.
   곡은 한 칸이 8분음표인 32칸(4마디). 음 이름 뒤 '-'는 앞 음을 늘이고 '.'는 쉰다.
   장소가 바뀌면 0.6초 동안 이전 곡을 줄이고 새 곡을 처음부터 튼다. 소리를 끄면 같이 멈춘다. */
var Music = (function () {
  'use strict';
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(tok) {
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(tok); if (!m) return null;
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  function freq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  // "C4 - . E4" -> [{step, note, len}]
  function parse(str) {
    var toks = str.replace(/\|/g, ' ').trim().split(/\s+/), out = [], last = null;
    toks.forEach(function (t, i) {
      if (t === '-') { if (last) last.len++; return; }
      if (t === '.') { last = null; return; }
      last = { step: i, note: midi(t), len: 1 }; out.push(last);
    });
    return { notes: out, len: toks.length };
  }
  function song(bpm, parts) {
    var o = { bpm: bpm, voices: [] };
    parts.forEach(function (p) { var q = parse(p[2]); o.len = Math.max(o.len || 0, q.len); o.voices.push({ wave: p[0], vol: p[1], notes: q.notes, perc: p[3] }); });
    return o;
  }
  // 소리 크기: 효과음(0.03~0.09)보다 한참 작게
  var LEAD = .022, BASS = .026, ARP = .011;
  var SONGS = {
    // 겨울비, 프롤로그와 처음 화면
    rain: song(66, [
      ['triangle', LEAD, 'C5 - - B4 A4 - - - | E4 - - - . . . . | F4 - - E4 D4 - - - | E4 - - - - - . .'],
      ['sine', ARP, 'A3 E4 A4 E4 A3 E4 A4 E4 | E3 B3 E4 B3 E3 B3 E4 B3 | D3 A3 D4 A3 D3 A3 D4 A3 | E3 B3 G#4 B3 E3 B3 G#4 B3'],
      ['sine', BASS, 'A2 - - - - - - - | E2 - - - - - - - | D2 - - - - - - - | E2 - - - - - - -']
    ]),
    // 출근 전 아침: 바쁘고 밝게
    morning: song(126, [
      ['square', LEAD * .7, 'E5 . G5 . C6 - B5 A5 | G5 . E5 . D5 - . . | F5 . A5 . D6 - C6 B5 | A5 - G5 - . . . .'],
      ['triangle', BASS, 'C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .'],
      ['noise', .006, 'C6 . C6 . C6 . C6 . | C6 . C6 . C6 . C6 . | C6 . C6 . C6 . C6 . | C6 . C6 . C6 . C6 .', true]
    ]),
    // 퇴근 뒤 저녁: 따뜻하고 느리게
    evening: song(84, [
      ['triangle', LEAD, 'A4 - - C5 F5 - E5 - | D5 - C5 - A4 - - - | Bb4 - - D5 G5 - F5 - | E5 - C5 - . . . .'],
      ['sine', ARP, 'F4 A4 C5 A4 F4 A4 C5 A4 | D4 F4 A4 F4 D4 F4 A4 F4 | Bb3 D4 F4 D4 Bb3 D4 F4 D4 | C4 E4 G4 E4 C4 E4 G4 E4'],
      ['sine', BASS, 'F2 - - - C3 - - - | D2 - - - A2 - - - | Bb2 - - - F3 - - - | C3 - - - C3 - Bb2 -']
    ]),
    // 주말 낮: 느긋하게
    weekend: song(100, [
      ['triangle', LEAD, 'B4 - D5 - G5 - . F#5 | E5 - D5 - B4 - . . | C5 - E5 - A5 - G5 - | F#5 - - - D5 - . .'],
      ['sine', BASS, 'G2 . D3 . G2 . D3 . | E2 . B2 . E2 . B2 . | C3 . G3 . A2 . E3 . | D3 . A2 . D3 . F#2 .']
    ]),
    // 잠자리: 자장가
    night: song(62, [
      ['sine', LEAD, 'E5 - - - D5 - C5 - | B4 - - - . . . . | C5 - - - B4 - A4 - | G#4 - - - . . . .'],
      ['sine', ARP, 'A3 C4 E4 C4 A3 C4 E4 C4 | G3 B3 D4 B3 G3 B3 D4 B3 | F3 A3 C4 A3 F3 A3 C4 A3 | E3 G#3 B3 G#3 E3 G#3 B3 G#3'],
      ['sine', BASS * .8, 'A2 - - - - - - - | G2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - -']
    ]),
    // 닫힌 문 앞, 고양이의 밤: 거의 비어 있게
    pov: song(56, [
      ['sine', LEAD, 'E5 . . . . . . . | . . . . G5 . . . | . . . . . . . . | D5 . . . . . . .'],
      ['sine', BASS, 'A2 - - - - - - - | - - - - - - - - | F2 - - - - - - - | - - - - - - - -']
    ]),
    // 천둥 치는 저녁: 낮게 웅웅
    storm: song(70, [
      ['triangle', LEAD, 'A4 - - - Bb4 - A4 - | F4 - - - . . . . | G4 - - - A4 - G4 - | E4 - - - . . . .'],
      ['sawtooth', BASS * .45, 'D2 . D2 . D2 . D2 . | D2 . D2 . C2 . C2 . | Bb1 . Bb1 . Bb1 . Bb1 . | A1 . A1 . A1 . C#2 .']
    ]),
    // 지하철: 덜컹덜컹
    train: song(132, [
      ['square', LEAD * .6, 'B4 - - - G4 - E4 - | . . . . . . . . | A4 - - - F#4 - D4 - | . . . . B4 - . .'],
      ['triangle', BASS, 'E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 D2 D3 D2 D3 | B1 B2 B1 B2 B1 B2 D2 D3'],
      ['noise', .007, 'C6 . C6 C6 C6 . C6 C6 | C6 . C6 C6 C6 . C6 C6 | C6 . C6 C6 C6 . C6 C6 | C6 . C6 C6 C6 . C6 C6', true]
    ]),
    // 지점: 사무실의 경쾌한 손놀림
    office: song(108, [
      ['square', LEAD * .6, 'D5 . F5 . Bb5 . A5 G5 | F5 - . . D5 . . . | Eb5 . G5 . C6 . Bb5 A5 | G5 - F5 - . . . .'],
      ['triangle', BASS, 'Bb2 . F3 . Bb2 . F3 . | G2 . D3 . G2 . D3 . | Eb2 . Bb2 . Eb2 . Bb2 . | F2 . C3 . F2 . A2 .']
    ]),
    // 상담: 째깍째깍 조금 긴장되게
    consult: song(112, [
      ['triangle', LEAD, 'A4 . C5 . E5 . D5 . | C5 . B4 . A4 - . . | F4 . A4 . C5 . B4 . | G#4 - - - . . . .'],
      ['sine', BASS, 'A2 . . . A2 . . . | E2 . . . E2 . . . | F2 . . . F2 . . . | E2 . . . E2 . E2 .'],
      ['noise', .005, 'C6 C6 C6 C6 C6 C6 C6 C6 | C6 C6 C6 C6 C6 C6 C6 C6 | C6 C6 C6 C6 C6 C6 C6 C6 | C6 C6 C6 C6 C6 C6 C6 C6', true]
    ]),
    // 퇴근길 거리
    street: song(100, [
      ['triangle', LEAD, 'G4 . C5 . E5 . D5 C5 | A4 - - - G4 - . . | F4 . A4 . C5 . B4 A4 | G4 - - - . . . .'],
      ['sine', BASS, 'C3 . . . G2 . . . | A2 . . . E2 . . . | F2 . . . C3 . . . | G2 . . . G2 . B2 .']
    ]),
    // 슈퍼: 가게 안 노래
    shop: song(120, [
      ['square', LEAD * .6, 'D5 G5 B5 G5 D5 . B4 . | C5 E5 A5 E5 C5 . A4 . | B4 D5 G5 D5 B4 . G4 . | A4 . F#4 . D4 - . .'],
      ['triangle', BASS, 'G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . | G2 . D3 . E2 . B2 . | D2 . A2 . D2 . F#2 .']
    ]),
    // 4/23 선배가 온 저녁
    visit: song(72, [
      ['triangle', LEAD, 'B4 - - - G4 - A4 - | B4 - - - E5 - - - | D5 - - - C5 - B4 - | A4 - - - . . . .'],
      ['sine', ARP, 'E3 B3 G4 B3 E3 B3 G4 B3 | C3 G3 E4 G3 C3 G3 E4 G3 | G3 D4 B4 D4 G3 D4 B4 D4 | D3 A3 F#4 A3 D3 A3 F#4 A3'],
      ['sine', BASS, 'E2 - - - - - - - | C2 - - - - - - - | G2 - - - - - - - | D2 - - - - - - -']
    ])
  };
  SONGS.title = SONGS.rain;

  // 지금 들릴 곡
  function $(id) { return document.getElementById(id); }
  function pick() {
    var end = $('ending');
    if (end && !end.hidden) { var g = end.className.indexOf('grade-bad') >= 0; return g ? 'rain' : 'evening'; }
    var title = $('titleScreen');
    if (title && !title.hidden) return 'title';
    if (typeof Arc !== 'undefined' && Arc.visiting()) return 'visit';
    var p = G.place, H = typeof Home !== 'undefined' ? Home.H : {};
    if (G.pro && G.pro.active && (p === 'street' || p === 'shop' || H.pro)) return 'rain';
    if (p === 'bedroom' || p === 'living') {
      if (H.pro) return 'rain';
      if (H.mode === 'night') return 'night';
      if (Home.sky && Home.sky() === 'storm') return 'storm';
      if (H.mode === 'morning') return 'morning';
      if (H.mode === 'weekend') return 'weekend';
      return 'evening';
    }
    return SONGS[p] ? p : p === 'title' ? 'title' : null;
  }

  var started = false, cur = null, ac = null, timer = null;
  function stopBus(bus, a) {
    if (!bus) return;
    try { bus.gain.cancelScheduledValues(a.currentTime); bus.gain.setValueAtTime(bus.gain.value, a.currentTime); bus.gain.linearRampToValueAtTime(0, a.currentTime + .6); } catch (e) { /* 무시 */ }
    setTimeout(function () { try { bus.disconnect(); } catch (e) { /* 무시 */ } }, 900);
  }
  function play(name, a) {
    var bus = a.createGain();
    bus.gain.setValueAtTime(0, a.currentTime); bus.gain.linearRampToValueAtTime(1, a.currentTime + .6);
    bus.connect(a.destination);
    cur = { name: name, song: SONGS[name], bus: bus, step: 0, t: a.currentTime + .08 };
  }
  var noiseBuf = null;
  function voiceNote(a, bus, v, n, t, dur) {
    var g = a.createGain(), end = t + dur;
    if (v.perc) {
      if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * .1, a.sampleRate); var ch = noiseBuf.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
      var src = a.createBufferSource(), f = a.createBiquadFilter();
      src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 6000;
      g.gain.setValueAtTime(v.vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
      src.connect(f); f.connect(g); g.connect(bus); src.start(t); src.stop(t + .07);
      return;
    }
    var o = a.createOscillator();
    o.type = v.wave; o.frequency.setValueAtTime(freq(n.note), t);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(v.vol, t + .015);
    g.gain.exponentialRampToValueAtTime(v.vol * .55, t + Math.min(dur * .5, .25));
    g.gain.setValueAtTime(v.vol * .55, Math.max(t + .02, end - .06));
    g.gain.exponentialRampToValueAtTime(.0001, end);
    o.connect(g); g.connect(bus); o.start(t); o.stop(end + .02);
  }
  function schedule(a) {
    var sg = cur.song, stepDur = 60 / sg.bpm / 2;
    if (cur.t < a.currentTime - .5) cur.t = a.currentTime + .05; // 탭이 멈췄다 돌아오면 다시 맞춘다
    while (cur.t < a.currentTime + .3) {
      var st = cur.step;
      sg.voices.forEach(function (v) {
        v.notes.forEach(function (n) { if (n.step === st && n.note !== null) voiceNote(a, cur.bus, v, n, cur.t, n.len * stepDur * .95); });
      });
      cur.step = (cur.step + 1) % sg.len;
      cur.t += stepDur;
    }
  }
  function tick() {
    if (!started) return;
    var muted = UI.isMuted();
    if (muted) { if (cur && ac) { stopBus(cur.bus, ac); cur = null; } return; }
    ac = UI.audio(); if (!ac || ac.state !== 'running') return;
    var want = pick();
    if (want === null) want = cur ? cur.name : 'title'; // 검은 화면 등에서는 하던 곡을 이어 간다
    if (!cur || cur.name !== want) { if (cur) stopBus(cur.bus, ac); play(want, ac); }
    schedule(ac);
  }
  function start() {
    if (started) return;
    started = true;
    timer = setInterval(function () { try { tick(); } catch (e) { /* 음악이 안 나도 게임은 계속 */ } }, 60);
  }
  function init() {
    var go = function () { start(); document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); };
    document.addEventListener('pointerdown', go, true);
    document.addEventListener('keydown', go, true);
  }
  if (typeof document !== 'undefined') init();
  return { SONGS: SONGS, pick: pick, parse: parse, current: function () { return cur && cur.name; } };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Music;
