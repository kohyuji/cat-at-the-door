/* Shared rules for the life game. No drawing, browser, timer, or audio dependencies. */
var Life = (function () {
  'use strict';
  var EVENING_LIMIT = 180;
  var SHEET_CAPACITY = 8;
  var schedule = [
    { day: 0, task: '첫 출근 준비', deadline: false },
    { day: 1, task: '인수인계 자료', deadline: false },
    { day: 2, task: '월간 보고 자료의 표 정리', deadline: false },
    { day: 3, task: '근거 자료 대조', deadline: false },
    { day: 4, task: '첫 보고', deadline: true },
    { day: 5, task: '다음 주 일정 확인', deadline: false },
    { day: 6, task: '토요일', deadline: false, weekend: true },
    { day: 7, task: '일요일', deadline: false, weekend: true },
    { day: 8, task: '발표 초안 공유', deadline: false },
    { day: 9, task: '최종 보고', deadline: true },
    { day: 10, task: '수정본 정리', deadline: false },
    { day: 11, task: '동료 인수인계', deadline: false },
    { day: 12, task: '두 주 업무 정리', deadline: true }
  ];
  function clamp(n, low, high) { return Math.max(low, Math.min(high, n)); }
  function number(n, fallback) { return Number.isFinite(n) ? n : fallback; }
  function name(value, fallback) { return String(value || '').trim().slice(0, 20) || fallback; }
  function needs() { return { fed: false, played: false, comfort: false }; }
  function result(ok, message, cash, minutes, extra) {
    var out = { ok: ok, message: message, cost: { cash: cash || 0, minutes: minutes || 0 }, minutes: minutes || 0 };
    if (extra) Object.keys(extra).forEach(function (key) { out[key] = extra[key]; });
    return out;
  }
  function create(me, cat) {
    return {
      me: name(me, '김신입'), cat: name(cat, '보리'), day: 0, phase: 'evening',
      cash: 82000, food: 4, water: false, energy: 3, prep: 0, trust: 4,
      strain: 0, routine: 0, support: false, hoodie: false, suitStored: false,
      needs: needs(), done: {}, flags: {}, log: [], work: [], eveningMin: 0,
      roller: { owned: false, sheets: 0, active: false, dirty: 0, usedToday: false, sheetOpen: false },
      fur: 0, monthlySalary: 2450000, firstPay: 1110000, transactions: [],
      dayMinutes: 0, commuteMin: 0, morningMin: 0, lastArrivedDay: 0,
      dailyDone: {}, planDays: [], lastNight: null, payday: null
    };
  }
  function valid(s) { return s && typeof s === 'object' && s.needs && s.roller && Array.isArray(s.log); }
  function finished(s) { return s.phase === 'ending'; }
  function repeated(s, type, message) { return s.done[type] ? result(false, message || '이번에는 이미 마쳤다.', 0, 0, { reason: 'alreadyDone' }) : null; }
  function canSpend(s, minutes, essential) {
    if (s.phase !== 'evening' || essential || s.eveningMin + minutes <= EVENING_LIMIT) return null;
    return result(false, '오늘 남은 시간에는 다 하기 어렵다. 꼭 필요한 돌봄을 먼저 하고, 나머지는 내일로 미루거나 도움을 청할 수 있다.', 0, 0, {
      reason: 'notEnoughTime', remainingMinutes: Math.max(0, EVENING_LIMIT - s.eveningMin),
      alternatives: ['feed', 'water', 'askFood', 'askSupport', 'sleep']
    });
  }
  function spend(s, type, minutes, cash) {
    if (cash) {
      s.cash -= cash;
      s.transactions.push({ day: s.day, type: type, cash: -cash });
    }
    s.dayMinutes += minutes;
    if (s.phase === 'evening') s.eveningMin += minutes;
    else if (s.phase === 'afterWork') s.commuteMin += minutes;
    else s.morningMin += minutes;
    s.done[type] = true;
  }
  function purchase(s, type, cash, minutes, essential, apply, message) {
    if (s.cash < cash) {
      var foodPurchase = type === 'buyFood' || type === 'smallFood';
      return result(false, foodPurchase ? '현금이 모자란다. 작은 봉지를 사거나, 필요한 만큼 나눠 받을 수 있다.' : '지금은 살 돈이 모자란다. 오늘은 남은 털을 정리할 다른 방법을 찾거나 그대로 출근할 수 있다.', 0, 0, {
        reason: 'notEnoughCash', needed: cash, alternatives: foodPurchase ? ['smallFood', 'askFood'] : ['stopRoller']
      });
    }
    var blocked = canSpend(s, minutes, essential);
    if (blocked) return blocked;
    spend(s, type, minutes, cash); apply();
    return result(true, message, cash, minutes, { overtime: s.phase === 'evening' && s.eveningMin > EVENING_LIMIT });
  }
  function act(s, type, opts) {
    opts = opts || {};
    if (!valid(s)) return result(false, '진행 상태를 확인할 수 없다.', 0, 0, { reason: 'invalidState' });
    if (finished(s)) return result(false, '이 이야기는 마지막 밤에 도착했다.', 0, 0, { reason: 'finished' });
    var again, blocked;
    if (type === 'secureWindow') {
      if (s.flags.windowSecured) return result(false, '창문과 커튼은 이미 닫았다.', 0, 0, { reason: 'alreadyDone' });
      s.flags.windowSecured = true;
      return result(true, '창문을 잠그고 커튼을 닫았다. 바람 소리가 한결 작아졌다.', 0, 0);
    }
    if (type === 'startRoller') {
      if (!s.roller.owned) return result(false, '아직 돌돌이가 없다.', 0, 0, { reason: 'noRoller' });
      if (s.fur <= 0) return result(false, '지금 정장에는 뗄 털이 없다.', 0, 0, { reason: 'noFur' });
      if (s.roller.active) return result(true, '같은 접착면으로 계속 정리한다.', 0, 0, { alreadyActive: true });
      if (s.roller.sheetOpen && s.roller.dirty >= SHEET_CAPACITY) return result(false, '접착면이 털로 가득 찼다. 모서리를 벗기면 새 면이 나온다.', 0, 0, { reason: 'dirtySheet', alternatives: ['peelRoller', 'stopRoller'] });
      if (!s.roller.sheetOpen) {
        if (s.roller.sheets <= 0) return result(false, '새 접착면이 남지 않았다. 교체롤을 끼우거나, 오늘은 남은 털을 감수하고 나갈 수 있다.', 0, 0, { reason: 'noSheets', alternatives: ['buyRefill', 'stopRoller'] });
        s.roller.sheets -= 1;
        s.roller.sheetOpen = true;
        s.roller.dirty = 0;
      }
      s.roller.active = true; s.roller.usedToday = true;
      return result(true, '정장 위를 쓸기 시작했다.', 0, 0);
    }
    if (type === 'roll' || type === 'rollerStroke') {
      if (!s.roller.active || !s.roller.sheetOpen) return result(false, '먼저 돌돌이를 정장에 대야 한다.', 0, 0, { reason: 'rollerNotActive' });
      var capacity = Math.max(0, SHEET_CAPACITY - s.roller.dirty);
      if (!capacity) return result(false, '이 면에는 더 붙지 않는다. 더러워진 접착면을 벗길 수 있다.', 0, 0, { reason: 'dirtySheet', alternatives: ['peelRoller', 'stopRoller'] });
      var removed = Math.min(s.fur, capacity, Math.max(1, Math.floor(number(opts.amount, 1))));
      s.fur -= removed; s.roller.dirty += removed;
      return result(true, s.fur ? '지나간 자리의 털이 돌돌이에 붙었다.' : '정장이 다시 깔끔해졌다.', 0, 0, { removed: removed, left: s.fur, sheetFull: s.roller.dirty >= SHEET_CAPACITY });
    }
    if (type === 'peelRoller') {
      if (!s.roller.sheetOpen || s.roller.dirty <= 0) return result(false, '아직 벗겨 낼 더러운 면이 없다.', 0, 0, { reason: 'unusedSheet' });
      s.roller.active = false; s.roller.sheetOpen = false; s.roller.dirty = 0;
      return result(true, '털 묻은 접착면을 벗겼다. 다시 쓸면 새 면 한 장을 사용한다.', 0, 0);
    }
    if (type === 'stopRoller') {
      s.roller.active = false;
      return result(true, s.roller.usedToday ? '돌돌이를 내려놓았다. 사용한 접착면과 남은 털은 그대로다.' : '오늘은 돌돌이를 쓰지 않고 내려놓았다.', 0, 0);
    }
    if (type === 'feed') {
      again = repeated(s, type, '이번에는 이미 밥을 주었다. 더 붓는 대신 그릇과 고양이를 살펴본다.'); if (again) return again;
      if (s.food <= 0) {
        s.flags.foodWarningSeen = true; s.flags.emptyBowl = true;
        return result(false, '봉지가 비었다. 가게에서 사거나 필요한 만큼 나눠 받아야 한다. 돈이 없어도 도움을 청할 수 있다.', 0, 0, { reason: 'noFood', alternatives: ['buyFood', 'smallFood', 'askFood'] });
      }
      spend(s, type, 5, 0); s.food -= 1; s.needs.fed = true; s.flags.emptyBowl = false;
      if (s.food <= 1) s.flags.foodWarningSeen = true;
      return result(true, s.food <= 1 ? '그릇이 채워졌다. 봉지의 바닥이 보인다. 다음 밥도 마련해야 한다.' : '그릇에 사료가 담겼다. 고양이가 냄새를 맡고 먹기 시작한다.', 0, 5, { foodLow: s.food <= 1, overtime: s.phase === 'evening' && s.eveningMin > EVENING_LIMIT });
    }
    if (type === 'water') {
      again = repeated(s, type, '이번에는 이미 깨끗한 물로 갈았다.'); if (again) return again;
      spend(s, type, 3, 0); s.water = true;
      return result(true, '그릇에 깨끗한 물이 찼다.', 0, 3, { overtime: s.phase === 'evening' && s.eveningMin > EVENING_LIMIT });
    }
    if (type === 'buyFood' || type === 'smallFood' || type === 'askFood') {
      if (s.dailyDone.foodSupply) return result(false, '오늘 필요한 사료는 이미 마련했다. 들고 온 봉지부터 정리한다.', 0, 0, { reason: 'alreadyDone' });
      var price = type === 'buyFood' ? 18000 : type === 'smallFood' ? 6000 : 0;
      var minutes = type === 'buyFood' ? 60 : type === 'smallFood' ? 35 : 40;
      var portions = type === 'buyFood' ? 6 : 2;
      return purchase(s, type, price, minutes, true, function () {
        s.food += portions; s.dailyDone.foodSupply = true;
        if (type === 'askFood') { s.support = true; s.flags.foodHelpReceived = true; }
      }, type === 'askFood' ? '필요한 만큼 사료를 나눠 받았다. 혼자 해결하지 않아도 오늘 밥은 줄 수 있다.' : '사료를 마련했다. 봉지 안에 다음 밥들이 남아 있다.');
    }
    if (type === 'buyRoller') {
      if (s.roller.owned) return result(false, '돌돌이 본체는 이미 있다. 필요한 것은 교체롤이다.', 0, 0, { reason: 'alreadyOwned', alternatives: ['buyRefill'] });
      return purchase(s, type, 4000, 0, true, function () { s.roller.owned = true; s.roller.sheets = 20; s.dailyDone.buyRoller = true; }, '4,000원에 본체와 첫 롤을 샀다. 접착면 20장이 들어 있다.');
    }
    if (type === 'buyRefill') {
      if (!s.roller.owned) return result(false, '먼저 돌돌이 본체가 필요하다.', 0, 0, { reason: 'noRoller' });
      if (s.dailyDone.buyRefill) return result(false, '교체롤은 오늘 이미 샀다.', 0, 0, { reason: 'alreadyDone' });
      return purchase(s, type, 2000, 0, true, function () { s.roller.sheets += 20; s.dailyDone.buyRefill = true; }, '교체롤 한 개를 샀다. 새 접착면 20장이 더 생겼다.');
    }
    if (type === 'hoodie' && s.hoodie) return result(false, '후드티 자리는 이미 마련되어 있다.', 0, 0, { reason: 'alreadyDone' });
    if (type === 'storeSuit' && s.suitStored) return result(false, '정장은 이미 따로 걸어 두었다.', 0, 0, { reason: 'alreadyDone' });
    if (type === 'deskSpace' && s.flags.deskSeat) return result(false, '책상 옆자리에 옷을 깔아 두었다. 다음에도 그 자리를 쓸 수 있다.', 0, 0, { reason: 'alreadyDone' });
    if (type === 'askSupport' && s.support) return result(false, '도움을 청할 사람과 방법을 이미 정했다.', 0, 0, { reason: 'alreadyDone' });
    if (type === 'phonePlan') {
      if (s.dailyDone.phonePlan) return result(false, '오늘의 업무 일정은 이미 확인했다.', 0, 0, { reason: 'alreadyDone' });
    } else { again = repeated(s, type); if (again) return again; }
    var times = { play: 35, prepare: 50, rest: 40, hoodie: 25, storeSuit: 15, deskSpace: 15, calmRain: 30, askSupport: 20, weekendSpace: 45, phonePlan: 15 };
    if (!Object.prototype.hasOwnProperty.call(times, type)) return result(false, '지금 할 수 없는 행동이다.', 0, 0, { reason: 'unknownAction' });
    if (type === 'weekendSpace' && s.day !== 6 && s.day !== 7) return result(false, '집을 크게 정리할 일은 주말에 시간을 잡기로 했다.', 0, 0, { reason: 'notWeekend' });
    blocked = canSpend(s, times[type], type === 'askSupport'); if (blocked) return blocked;
    spend(s, type, times[type], 0);
    var messages = {};
    if (type === 'play') { s.needs.played = true; messages.play = '고양이가 장난감을 붙잡고 한동안 놓지 않는다.'; }
    if (type === 'prepare') { s.prep = clamp(s.prep + 1, 0, 3); messages.prepare = '내일 필요한 자료를 정리해 가방 곁에 두었다.'; }
    if (type === 'rest') { s.energy = clamp(s.energy + 1, 0, 3); s.strain = clamp(s.strain - 1, 0, 10); messages.rest = '잠깐 몸을 쉬게 했다. 어깨의 힘이 조금 풀린다.'; }
    if (type === 'hoodie') { s.hoodie = true; s.flags.hoodiePlaced = true; s.needs.comfort = true; messages.hoodie = '회색 후드티를 접어 자리를 마련했다. 고양이가 냄새를 맡는다.'; }
    if (type === 'storeSuit') { s.suitStored = true; s.flags.suitProtected = true; messages.storeSuit = '정장을 고양이가 눕는 옷과 떨어진 곳에 걸었다.'; }
    if (type === 'deskSpace') { s.flags.deskSeat = true; messages.deskSpace = '책상 옆 빈자리에 오래 입던 옷을 깔았다. 자료를 펼칠 자리는 비워 두었다.'; }
    if (type === 'calmRain') { s.needs.comfort = true; s.flags.rainComforted = true; messages.calmRain = '작은 몸의 떨림이 잦아들 때까지 곁에 있었다.'; }
    if (type === 'askSupport') { s.support = true; s.flags.supportAsked = true; s.strain = clamp(s.strain - 1, 0, 10); messages.askSupport = '어려운 날 어떻게 도움을 받을지 이야기를 나눴다.'; }
    if (type === 'weekendSpace') { s.routine = clamp(s.routine + 1, 0, 6); s.needs.comfort = true; s.flags.cozyBox = true; messages.weekendSpace = '고양이 자리와 내 물건의 자리를 함께 정리했다.'; }
    if (type === 'phonePlan') {
      var plannedDay = Math.floor(number(opts.day, s.phase === 'morning' ? s.day : s.day + 1));
      while (plannedDay === 6 || plannedDay === 7) plannedDay += 1;
      plannedDay = clamp(plannedDay, 1, 12);
      if (s.planDays.indexOf(plannedDay) === -1) s.planDays.push(plannedDay);
      s.flags.workPlanAsked = true; s.flags.planForDay = plannedDay;
      s.dailyDone.phonePlan = true;
      messages.phonePlan = '업무의 마감과 필요한 준비를 확인하고, 일정 조정을 부탁했다.';
    }
    return result(true, messages[type], 0, times[type], { overtime: s.phase === 'evening' && s.eveningMin > EVENING_LIMIT });
  }
  function sleep(s, open) {
    if (!valid(s)) return result(false, '진행 상태를 확인할 수 없다.', 0, 0, { reason: 'invalidState' });
    if (finished(s)) return result(false, '마지막 밤의 기록은 이미 남았다.', 0, 0, { reason: 'finished' });
    if (s.phase !== 'evening') return result(false, '집에 돌아와 잠자리를 정할 때가 아니다.', 0, 0, { reason: 'wrongPhase' });
    open = !!open;
    var oldDay = s.day, beforeTrust = s.trust, beforeEnergy = s.energy;
    var storm = oldDay === 3 || oldDay === 11 || !!s.flags.raining;
    var safePlace = s.hoodie || s.routine > 0 || s.needs.comfort;
    var contact = s.needs.played || s.needs.comfort || open;
    var comforted = s.needs.comfort || (open && s.needs.fed) || (safePlace && s.needs.played) || (s.flags.windowSecured && (s.hoodie || s.needs.played));
    var missedCare = !s.needs.fed;
    var late = Math.max(0, s.eveningMin - EVENING_LIMIT);
    var latePenalty = Math.min(2, Math.ceil(late / 45));
    var recovery = 2 - (missedCare ? 3 : 0) - (!s.water ? 1 : 0) - (storm && !comforted ? 1 : 0) - latePenalty;
    var restedLimit = latePenalty >= 2 ? 1 : latePenalty === 1 ? 2 : 3;
    s.energy = clamp(s.energy + recovery, 0, restedLimit);
    // Basic supplies maintain safety. They do not make a relationship grow by themselves.
    var trustChange = (s.needs.fed ? 0 : -1.1) + (s.water ? 0 : -.2) + (s.needs.played ? .6 : 0) + (s.needs.comfort ? .4 : 0);
    if (open) trustChange += .3;
    else if (!safePlace && !s.needs.played) trustChange -= .6;
    else if (!contact) trustChange -= .1;
    if (storm && !comforted) trustChange -= .6;
    s.trust = Math.round(clamp(s.trust + trustChange, 0, 10) * 10) / 10;
    if (late > 0 || s.energy <= 1) s.strain = clamp(s.strain + 1, 0, 10);
    else if (s.done.rest && s.energy >= 2) s.strain = clamp(s.strain - 1, 0, 10);
    if (s.needs.fed && s.water && (contact || safePlace)) s.routine = clamp(s.routine + 1, 0, 6);
    var note = {
      day: oldDay, open: open, fed: s.needs.fed, played: s.needs.played, comfort: s.needs.comfort,
      water: s.water, hoodie: s.hoodie, minutes: s.eveningMin, lateMinutes: late,
      energyBefore: beforeEnergy, energyAfter: s.energy, trustBefore: beforeTrust, trustAfter: s.trust,
      storm: storm, comforted: comforted, windowSecured: !!s.flags.windowSecured, cash: s.cash, food: s.food, missedCare: missedCare
    };
    s.log.push(note); s.lastNight = note;
    s.roller.active = false; s.roller.usedToday = false;
    s.flags.emptyBowl = missedCare; s.flags.rainComforted = false; s.flags.raining = false; s.flags.windowSecured = false;
    s.fur = s.suitStored ? (open ? 1 : 0) : open ? 10 + Math.min(6, s.log.filter(function (r) { return r.open; }).length) : s.flags.catInCloset ? 6 : 0;
    s.flags.catInCloset = false;
    if (oldDay >= 12) {
      s.phase = 'ending';
      return result(true, '마지막 밤의 문을 정했다.', 0, 0, { ending: ending(s), night: note });
    }
    s.day += 1; s.phase = 'morning'; s.dailyDone = {}; s.dayMinutes = 0; s.commuteMin = 0; s.morningMin = 0; s.flags.workDelayMinutes = 0;
    return result(true, missedCare ? '빈 그릇을 찾는 소리에 밤중에 깼다.' : storm && !comforted ? '비바람 속에 몇 번이나 잠이 끊겼다.' : latePenalty ? '늦게 누웠다. 알람이 유난히 빨리 울렸다.' : '밤이 지나고 알람이 울린다.', 0, 0, { night: note, weekend: s.day === 6 || s.day === 7 });
  }
  function finishWork(s, opts) {
    opts = opts || {};
    if (!valid(s)) return result(false, '진행 상태를 확인할 수 없다.', 0, 0, { reason: 'invalidState' });
    var previous = s.work.find(function (item) { return item.day === s.day; });
    if (previous) return result(true, previous.reason, 0, 0, { alreadyDone: true, work: previous });
    if (s.day < 1 || s.day > 12 || finished(s)) return result(false, '오늘의 출근 기록을 만들 수 없다.', 0, 0, { reason: 'wrongDay' });
    if (s.day === 6 || s.day === 7) return result(false, '주말에는 출근하지 않는다.', 0, 0, { reason: 'weekend', weekend: true });
    if (s.phase !== 'morning' && s.phase !== 'work') return result(false, '출근한 뒤에 오늘의 업무를 마칠 수 있다.', 0, 0, { reason: 'wrongPhase' });
    var item = schedule[s.day], planned = s.planDays.indexOf(s.day) !== -1, prepared = s.prep >= 1;
    var energy = s.energy, status = 'steady', reason, completed = opts.completed !== false, extraMinutes = 0;
    if (!completed) {
      status = 'missed';
      reason = '끝낸 부분과 아직 남은 부분을 동료에게 알리고 퇴근했다. 이어서 마칠 일을 메모해 두었다.';
    } else {
      if (item.deadline && !prepared) extraMinutes += planned ? 15 : 30;
      if (energy <= 1) extraMinutes += prepared ? 10 : 20;
      if (energy <= 1) {
        status = 'strained';
        reason = '자료를 정리해 공유했다. 같은 부분을 다시 확인하느라 예정보다 오래 걸렸다.';
      } else if (item.deadline && prepared) {
        status = 'good';
        reason = '준비한 자료로 질문에 답했다. 정리한 내용을 동료에게 건넸다.';
      } else if (item.deadline) {
        reason = planned ? '이야기해 둔 순서대로 필요한 자료를 찾아 일을 마쳤다. 정리한 내용을 공유했다.' : '필요한 자료를 찾아 일을 마치고 공유했다. 준비해 뒀다면 조금 일찍 끝낼 수 있었겠다.';
      } else { reason = '오늘 맡은 일을 마치고 내일 이어 할 부분을 남겼다.'; }
    }
    var report = { day: s.day, task: item.task, deadline: item.deadline, status: status, prepared: prepared, energy: energy, reason: reason, planned: planned, completed: completed, extraMinutes: extraMinutes };
    s.work.push(report);
    if (item.deadline && prepared) s.prep -= 1;
    s.energy = Math.max(0, s.energy - 1);
    if (status === 'missed') s.strain = clamp(s.strain + (planned || s.support ? 1 : 2), 0, 10);
    else if (status === 'strained') s.strain = clamp(s.strain + 1, 0, 10);
    else if (status === 'good' && energy === 3) s.strain = clamp(s.strain - 1, 0, 10);
    s.flags.workDelayMinutes = extraMinutes;
    if (s.day === 12 && !s.flags.paydayPaid) {
      s.cash += s.firstPay; s.flags.paydayPaid = true;
      s.transactions.push({ day: 12, type: 'firstPay', cash: s.firstPay });
      s.payday = { monthlySalary: s.monthlySalary, firstPay: s.firstPay, supplySpending: s.transactions.filter(function (t) { return t.cash < 0; }).reduce(function (sum, t) { return sum - t.cash; }, 0), balance: s.cash };
    }
    s.phase = 'afterWork';
    return result(true, reason, 0, 0, { work: report, payday: s.day === 12 ? s.payday : null });
  }
  function arriveHome(s) {
    if (!valid(s) || finished(s) || (s.phase === 'evening' && s.lastArrivedDay === s.day)) return;
    s.phase = 'evening'; s.eveningMin = 0; s.needs = needs(); s.water = false; s.done = {}; s.lastArrivedDay = s.day;
    s.roller.active = false;
  }
  function ending(s) {
    if (!valid(s)) return { key: 'finding', title: '아직 배우는 중', lines: ['조금 더 시간을 두고 돌아보기로 했다.'] };
    var missed = s.work.filter(function (r) { return r.status === 'missed'; }).length;
    var neglected = s.log.filter(function (r) { return !r.fed || (!r.played && !r.comfort && !r.open && !r.hoodie); }).length;
    var last = s.lastNight || { open: true };
    if (s.strain >= 8 && (missed >= 2 || s.energy <= 1)) return { key: 'worn', title: '잠깐 멈추는 밤', lines: [s.trust >= 4 ? s.cat + '가 무릎에 몸을 말았다. 나는 알람을 다시 맞췄다.' : '열린 문 너머를 바라보다가, 회사에서 가져온 메모를 접었다.', '다음 주 일정에 비워 둘 시간을 적었다. 오늘은 나도 쉬어야 했다.'] };
    if (s.trust <= 3 && neglected >= 3) return { key: 'distance', title: '기다리는 쪽', lines: ['밥그릇과 나 사이에서 ' + s.cat + '가 소파 끝에 앉아 고개만 들었다.', '이번에는 내가 가까이 앉아 기다렸다. 먼저 손을 뻗지는 않았다.'] };
    if (s.support && s.routine >= 2 && s.trust >= 4) return { key: 'shared', title: '함께 버티는 법', lines: ['힘든 날 부탁할 사람의 번호가 휴대폰에 남았다.', s.cat + '가 늘 눕던 자리에 몸을 말았다. 내일 가져갈 가방도 현관에 놓여 있다.'] };
    if (s.routine >= 3 && s.trust >= 5 && s.strain <= 5) return { key: 'settled', title: '우리의 자리', lines: [last.open ? s.cat + '가 들어와 베개 옆에 누웠다. ' + (s.suitStored ? '정장은 옷걸이에 걸려 있다.' : '내일 입을 옷은 아침에 정리하기로 했다.') : '닫힌 문 앞의 ' + (s.hoodie ? '후드티 위에서 ' : s.flags.cozyBox ? '상자 안에서 ' : '매트 위에서 ') + s.cat + '가 조용히 잠들었다.', '알람을 맞춘 손을 내려놓았다. 내일도 돌아올 집이었다.'] };
    return { key: 'finding', title: '아직 배우는 중', lines: [last.open ? s.cat + '가 문턱에 앉았다. 나는 이불을 조금 옆으로 밀었다.' : s.cat + '가 문턱에 앉았다. 나는 내일 챙길 것들을 메모했다.', '다 잘한 날은 아니었다. 내일 바꿔 볼 것은 조금 알 것 같았다.'] };
  }
  return { create: create, act: act, sleep: sleep, finishWork: finishWork, arriveHome: arriveHome, ending: ending, schedule: schedule, EVENING_LIMIT: EVENING_LIMIT, SHEET_CAPACITY: SHEET_CAPACITY };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Life;
