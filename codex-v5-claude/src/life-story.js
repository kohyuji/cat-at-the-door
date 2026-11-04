/* 대사와 글. 값은 Life가 바꾸고, 여기서는 보여 줄 말만 만든다.
   대화창에는 한 번에 한 줄씩 나온다. 고양이 이름 뒤 조사는 Life.josa로 붙인다. */
var Story = (function () {
  'use strict';
  function j(n, k) { return Life.josa(n, k); }

  var opening = ['대학 졸업 후 취업 준비만 4년째. . .', '남은 생활비는 만이천 원', '이번 면접에서도 떨어지면 나는...', '...'];

  var phone = {
    rejection: function (me) {
      return { from: '한빛상사 인사팀', time: '오전 10:42', preview: '[한빛상사] 안녕하세요 ' + me + ' 님...',
        body: '[한빛상사] 안녕하세요 ' + me + ' 님, 한빛상사 인사팀입니다.\n\n신입사원 채용에 지원해 주셔서 감사합니다. 아쉽게도 이번에는 함께하지 못하게 되었습니다.\n\n앞으로 하시는 일에 좋은 결과가 있기를 바랍니다.' };
    },
    offer: function (me) {
      return { from: '늘봄손해보험', time: '오후 4:10', preview: '[늘봄손해보험] ' + me + ' 님, 합격을 축하드립니다...',
        body: '[늘봄손해보험] ' + me + ' 님, 수습 설계사 최종 합격을 축하드립니다.\n\n4월 13일(월) 오전 9시까지 새솔지점으로 출근해 주세요.\n\n수습 기간은 4월 24일(금)까지입니다. 이 기간에 계약 8건을 채우면 정식 설계사로 위촉됩니다.\n\n활동비는 출근한 날마다, 계약 수당은 계약할 때마다 바로 드립니다.' };
    },
    group: { from: '윤순자 사장님', time: '오후 3:20', body: '설계사님, 우리 식당 직원들 단체보험 좀 알아보려고요. 가게 일 끝나는 저녁 8시에만 시간이 되는데, 오늘 지점으로 가도 될까요?', yes: '8시에 뵐게요', no: '다음에 뵐게요' }
  };

  var PRODUCT = { dental: '치아보험', car: '자동차보험', travel: '여행자보험', home: '화재보험', pet: '펫보험', group: '단체보험' };
  var SHORT = { dental: '치아', car: '자동차', travel: '여행자', home: '화재', pet: '펫', group: '단체', price: '요금표', contract: '계약서' };
  var ITEM = { dry: '건사료', wet: '습식 사료', sand: '모래', tower: '캣타워', feeder: '자동 급식기', roller: '돌돌이', coffee: '커피', lunch: '도시락', charcoal: '번개탄' };

  // 고객: 이름, 생김새(look), 옷 색(tint)
  var CLIENT = {
    c1: { name: '박정호', look: 'customerA' },
    c2: { name: '김미숙', look: 'customerB' },
    c3: { name: '이준서', look: 'customerC' },
    c4: { name: '정은영', look: 'customerB', tint: 280 },
    c5: { name: '최민재', look: 'customerC', tint: 350 },
    c6: { name: '윤순자', look: 'customerB', tint: 140, title: '식당 사장님' },
    c7: { name: '서지민', look: 'customerC', tint: 45 },
    c8: { name: '강태호', look: 'customerA', tint: 220 },
    c9: { name: '한소희', look: 'customerB', tint: 200 },
    c10: { name: '문성훈', look: 'customerA', tint: 100 },
    c11: { name: '임하늘', look: 'customerC', tint: 160 },
    c12: { name: '배영숙', look: 'customerB', tint: 30 },
    c13: { name: '조민혁', look: 'customerC' },
    c14: { name: '신동욱', look: 'customerA', tint: 300 },
    c15: { name: '오세영', look: 'customerB', tint: 330 }
  };

  var ORDINAL = ['첫', '두', '세', '네'];

  // 상담 중 생기는 일과 그 이유 (주인공의 한 줄)
  var CAUSE = {
    late: '늦어서 기분이 상하셨나 봐.',
    sneeze: '아, 털... 아침에 돌돌이를 할걸.',
    catLover: '고객님도 고양이 키우시는구나.',
    fur: '소매에 털이... 지저분해 보였겠다.',
    prepared: '어제 자료를 봐 둔 덕분이야.',
    yawn: '어젯밤에 잠을 설쳤더니...',
    busyLeft: '늦는 바람에 바쁜 고객님이 먼저 가 버리셨대.',
    lost: '오늘은 못 땄네.'
  };
  var LOST = {
    busyLeft: '늦어서 그냥 가셨다', sneeze: '털에 재채기를 하셨다', late: '늦어서 기분이 상하셨다',
    fur: '정장의 털이 거슬리셨다', yawn: '하품을 참지 못했다', mistake: '안내서를 잘못 건넸다', slow: '너무 오래 기다리시게 했다'
  };
  var HEART = {
    pet: '쓰다듬어 줬다', play: '쥐돌이로 놀아 줬다', together: '같이 잤다', wet: '습식 사료를 먹었다',
    curtain: '천둥 치는 밤, 커튼을 치고 곁에 있어 줬다', alone: '하루 종일 혼자 있었다', missAm: '아침밥을 걸렀다',
    missPm: '저녁밥을 걸렀다', dry: '물그릇이 말라 있었다', accident: '화장실이 넘쳐서 이불에 실수했다', lonely: '닫힌 문 앞에서 혼자 잤다'
  };
  function morningNote(n, cat) {
    if (!n) return null;
    var c = j(cat, 'subject');
    return {
      wakeHungry: '새벽 다섯 시에 ' + c + ' 얼굴을 밟았다. 배가 고팠나 보다.',
      wakeZoomies: '새벽 다섯 시에 ' + c + ' 온 방을 뛰어다녔다. 안 놀아 줘서 힘이 남았나 보다.',
      scratched: '새벽에 문 긁는 소리에 깼다.',
      lonely: '문을 여니 ' + c + ' 문 앞에 웅크리고 자고 있었다.',
      slept: j(cat, 'with') + ' 같이 푹 잤다.',
      closed: '문을 닫고 푹 잤다.'
    }[n.key] || null;
  }

  // 보리가 하는 일과 이유
  function catLine(key, cat) {
    return {
      hungry: '배고프구나. 밥 줄게.',
      thirsty: '물이 다 떨어졌네.',
      litter: '화장실이 더러워서 못 들어가나 봐.',
      zoomies: '오늘 안 놀아 줘서 힘이 넘치나 봐.',
      scratch: '혼자 자기 싫은가 봐.',
      onHoodie: '내 냄새가 나서 그런가.',
      purr: '기분 좋구나.',
      waited: j(cat, 'subject') + ' 현관에서 기다리고 있었다.',
      alone: '하루 종일 혼자 있었구나.',
      ate: j(cat, 'subject') + ' 기다렸다는 듯이 허겁지겁 사료를 먹기 시작한다.',
      wetAte: j(cat, 'subject') + ' 습식 사료를 핥아 먹는다. 꼬리가 바짝 섰다.',
      storm: '천둥소리에 ' + j(cat, 'subject') + ' 소파 밑으로 숨었다.',
      stormOut: j(cat, 'subject') + ' 슬금슬금 나와서 무릎에 올라왔다.',
      hidden: j(cat, 'subject') + ' 안 보인다. 어디 갔지?',
      found: '서랍 속 후드티 위에 있었네. 내 냄새가 나서 그런가.',
      bringToy: j(cat, 'subject') + ' 쥐돌이를 물고 와서 발 앞에 내려놓았다.',
      fed: '아침은 먹었어. 저녁에 또 줄게.',
      fedPm: '저녁은 먹었잖아. 내일 아침에 또 줄게.'
    }[key];
  }

  var DAY_INTRO = {
    0: [{ who: 'me', text: '드디어 내일 첫 출근이다.' }, { who: 'me', text: '노트북이랑 충전기부터 챙겨 두자.' }],
    1: [{ who: 'me', text: '7시 반. 8시 10분에는 나가야 9시 조회에 안 늦어.' }],
    6: [{ who: 'me', text: '토요일이다. 오늘은 하루가 길어.' }],
    11: [{ who: 'me', text: '내일이 마감이다.' }],
    12: [{ who: 'me', text: '오늘이 수습 마지막 날이다.' }]
  };

  function assembly(s, late) {
    var lines = [], d = s.day, cl = Life.clientsOn(d), me = s.me;
    if (late) lines.push({ who: 'lead', text: me + ' 씨, 고객님 벌써 와 계세요.' });
    if (d === 1) {
      lines.push({ who: 'lead', text: '오늘부터 함께할 수습 설계사 ' + me + ' 씨예요.' });
      lines.push({ who: 'lead', text: '수습은 4월 24일까지예요. 저 실적 그래프에서 목표선 8건을 넘기면 정식 설계사가 돼요.' });
      lines.push({ who: 'lead', text: '오늘 첫 고객은 선배랑 같이 만나요.' });
    } else if (Life.day(s).final) {
      lines.push({ who: 'lead', text: '오늘이 마감이에요. 상담 끝나고 실적 그래프 앞에서 봐요.' });
    } else if (!late) {
      lines.push({ who: 'lead', text: '좋은 아침이에요. ' + me + ' 씨 오늘 고객은 ' + (cl.length === 2 ? '두 분' : '한 분') + '이에요.' });
    }
    return lines;
  }
  function senior(s, hadFur) {
    if (hadFur) return [
      { who: 'peer', text: '어? 소매에 털 묻었어요. 고양이 키워요?' },
      { who: 'peer', text: '이거 빌려줄게요. 돌돌이요. 고객 앞에서는 털이 생각보다 눈에 띄어요.' },
      { who: 'peer', text: '지하철역 앞 슈퍼에 3,000원이면 있어요.' }];
    return [
      { who: 'peer', text: '고객 만나기 전에는 소매 한번 보세요. 털 같은 거 붙어 있으면 싫어하는 분들 있어요.' },
      { who: 'peer', text: '돌돌이는 지하철역 앞 슈퍼에 3,000원이면 있어요.' }];
  }
  var TUTORIAL = [
    { who: 'peer', text: '고객님 말풍선을 잘 보세요. 같은 그림이 그려진 안내서를 끌어다 드리면 돼요.' }
  ];
  var CONSULT = {
    signed: '여기 서명할게요.',
    lost: '음... 생각해 볼게요.',
    wrong: '이건 제가 찾는 게 아닌데요.',
    slow: '음...',
    greet: '안녕하세요.'
  };
  function leaveOffice(s, first) {
    var lines = [];
    if (first) lines.push({ who: 'lead', text: '내일 만날 고객 카드예요. 집에서 보고 오면 상담이 훨씬 쉬워요.' });
    return lines;
  }
  function groupOffer(s) {
    return [{ who: 'lead', text: s.me + ' 씨, 식당 사장님 한 분이 직원 단체보험을 알아보신대요. 문자 보냈다던데 확인해 봐요.' }];
  }
  function evaluation(s) {
    var c = s.contracts, pass = c >= Life.GOAL;
    return pass ? [
      { who: 'lead', text: '12일 동안 ' + c + '건. 목표선을 넘겼네요.' },
      { who: 'lead', text: '축하해요, ' + s.me + ' 씨. 다음 달부터 정식 설계사예요.' }
    ] : [
      { who: 'lead', text: '12일 동안 ' + c + '건이에요. 목표선까지 ' + (Life.GOAL - c) + '건 남았네요.' },
      { who: 'lead', text: '수습을 한 달 더 해 봐요. 다음엔 될 거예요.' }
    ];
  }

  var NAMES = { me: null, lead: '지점장님', peer: '선배', cat: null, owner: '사장님' };

  var ENDING = {
    both: { title: '두 몸을 건사했다', body: function (s) { return ['정식 설계사가 되었다.', '현관을 열면 오늘도 ' + j(s.cat, 'subject') + ' 앉아 있다.']; } },
    catStays: { title: function (s) { return '실적은 아직, ' + j(s.cat, 'topic') + ' 곁에'; }, body: function (s) { return ['수습은 한 달 늘었다.', '그래도 밤마다 ' + j(s.cat, 'subject') + ' 내 옆에서 잔다.']; } },
    soso: { title: '그럭저럭 둘이서', body: function (s) { return ['정식 설계사가 되었다.', j(s.cat, 'topic') + ' 가끔 나를 모른 척한다. 그래도 저녁이면 현관에 와 있다.']; } },
    clumsy: { title: '둘 다 아직 서툴다', body: function (s) { return ['수습은 한 달 늘었다.', j(s.cat, 'with') + ' 나는 아직 서로에게 서툴다.']; } },
    oneBody: { title: '한 몸만 건사했다', body: function (s) { return ['정식 설계사가 되었다.', '집에 오면 ' + j(s.cat, 'subject') + ' 더 이상 현관에 나와 있지 않다.']; } },
    again: { title: '다시 처음부터', body: function (s) { return ['일도, ' + j(s.cat, 'with') + '의 하루도 잘 풀리지 않았다.', '이건 게임이니까, 처음부터 다시 해 볼 수 있다.']; } },
    emptyBowl: { title: '빈 밥그릇', body: function (s) { return ['밥그릇이 너무 자주 비어 있었다.', '어느 날 아침, ' + j(s.cat, 'subject') + ' 열린 창틈으로 나가 슈퍼 앞으로 돌아갔다. 슈퍼 사장님이 밥을 챙겨 준다고 한다.', '이건 게임이니까, 처음부터 다시 해 볼 수 있다.']; } }
  };
  function endingTitle(key, s) { var t = ENDING[key].title; return typeof t === 'function' ? t(s) : t; }

  // 엔딩 글에 넣을, 실제로 있었던 날 하나
  function memory(s, key) {
    var ev = s.events, pick = null, date = function (d) { return Life.DAYS[d].date; };
    var good = ['curtain', 'drawer', 'catLover', 'groupSigned', 'firstContract', 'together'];
    var bad = ['lonely', 'scratched'];
    var order = key === 'oneBody' || key === 'again' || key === 'clumsy' || key === 'emptyBowl' ? bad.concat(good) : good;
    for (var i = 0; i < order.length && !pick; i++) for (var k = ev.length - 1; k >= 0; k--) if (ev[k].key === order[i]) { pick = ev[k]; break; }
    if (!pick) return null;
    var c = s.cat;
    var text = {
      curtain: '비 오던 밤, 커튼을 쳐 주었다.',
      drawer: '아침에 서랍 속 후드티 위에서 ' + j(c, 'object') + ' 찾았다.',
      catLover: '고양이를 키우는 고객님이 내 소매의 털을 보고 웃었다.',
      groupSigned: '밤 8시, 식당 사장님과 단체보험을 계약했다.',
      firstContract: '첫 계약 스티커를 붙였다.',
      together: j(c, 'with') + ' 같이 잤다.',
      lonely: j(c, 'subject') + ' 닫힌 문 앞에서 혼자 잤다.',
      scratched: j(c, 'subject') + ' 밤새 문을 긁었다.'
    }[pick.key];
    return date(pick.day) + ' ' + text;
  }

  // 엔딩 뒤 고양이 시점: 같은 날들을 한 줄씩
  function epilogue(s) {
    var lines = [];
    s.diary.forEach(function (d) {
      var date = Life.DAYS[d.day].date, parts = [];
      if (d.meals === 0) parts.push('그릇이 하루 종일 비어 있었다');
      else if (d.meals === 1 && !Life.DAYS[d.day].final && d.day !== 0) parts.push('밥을 한 번 걸렀다');
      if (d.played) parts.push('쥐를 잡았다');
      var ev = s.events.filter(function (e) { return e.day === d.day; }).map(function (e) { return e.key; });
      if (ev.indexOf('curtain') >= 0) parts.push('천둥이 무서웠는데 사람이 커튼을 쳐 줬다');
      if (ev.indexOf('drawer') >= 0) parts.push('사람 냄새 나는 옷 속에 숨었다');
      if (d.together) parts.push('사람 옆에서 잤다. 따뜻했다');
      else if (ev.indexOf('scratched') >= 0) parts.push('문을 긁었더니 사람이 깼다');
      else if (ev.indexOf('lonely') >= 0) parts.push('문 앞에서 잤다');
      if (Life.DAYS[d.day].final) parts.push('현관에서 기다렸다');
      if (!parts.length) parts.push(Life.DAYS[d.day].kind === 'work' ? '사람이 아침에 나가서 저녁에 왔다' : '사람이 하루 종일 집에 있었다');
      lines.push(date + '. ' + parts.join('. ') + '.');
    });
    return lines;
  }

  return {
    opening: opening, phone: phone, PRODUCT: PRODUCT, SHORT: SHORT, ITEM: ITEM, CLIENT: CLIENT, ORDINAL: ORDINAL,
    CAUSE: CAUSE, LOST: LOST, HEART: HEART, morningNote: morningNote, catLine: catLine, DAY_INTRO: DAY_INTRO,
    assembly: assembly, senior: senior, TUTORIAL: TUTORIAL, CONSULT: CONSULT, leaveOffice: leaveOffice, groupOffer: groupOffer,
    evaluation: evaluation, NAMES: NAMES, ENDING: ENDING, endingTitle: endingTitle, memory: memory, epilogue: epilogue
  };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Story;
