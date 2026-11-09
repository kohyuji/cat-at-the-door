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
    job: { from: '행복슈퍼 사장님', time: '오전 9:40', preview: '주말에 진열 좀 도와줄 사람 찾아요...',
      body: '주말에 진열 좀 도와줄 사람 찾아요. 토요일, 일요일 둘 다 돼요.\n\n오후 3시 전에 가게로 오면 네 시간, 5,000원 드릴게요. 상자를 나르는 일이라 좀 고돼요.\n\n가게 벽에 공고 붙여 놨어요.' },
    // 첫 출근 전날 밤, 지점장님이 보내는 문자: 이 일이 무슨 일인지
    boss: function (me) {
      return { from: '새솔지점 지점장', time: '오후 7:20', preview: me + ' 씨, 내일부터 같이 일할 지점장이에요...',
        body: me + ' 씨, 내일부터 같이 일할 새솔지점 지점장이에요.\n\n우리 일은 고객님 이야기를 잘 듣고, 그분께 꼭 맞는 보험 상품을 찾아 권해 드리는 거예요. 이가 시린 분께는 치아보험, 첫 차를 산 분께는 자동차보험처럼요.\n\n내일 9시 조회에서 봬요. 집에서 지하철로 50분이니 8시 10분에는 나오세요.' };
    },
    group: { from: '윤순자 사장님', time: '오후 3:20', body: '설계사님, 우리 식당 직원들 단체보험 좀 알아보려고요. 가게 일 끝나는 저녁 8시에만 시간이 되는데, 오늘 지점으로 가도 될까요?', yes: '8시에 뵐게요', no: '다음에 뵐게요' }
  };

  var PRODUCT = { dental: '치아보험', car: '자동차보험', travel: '여행자보험', home: '화재보험', pet: '펫보험', group: '단체보험' };
  var SHORT = { dental: '치아', car: '자동차', travel: '여행자', home: '화재', pet: '펫', group: '단체', price: '요금표', contract: '계약서' };
  var ITEM = { dry: '건사료', wet: '습식 사료', sand: '모래', toy: '쥐돌이', tower: '캣타워', feeder: '자동 급식기', roller: '돌돌이', coffee: '커피', lunch: '도시락', charcoal: '번개탄', robot: '로봇청소기', autoToy: '자동 장난감' };
  // 슈퍼 진열대에 마우스를 대거나 한 번 누르면 뜨는 설명. 줄마다 한 문장.
  var ITEM_DESC = {
    dry: ['고양이 밥 여덟 끼. 아침저녁 두 번씩 나흘.'],
    wet: ['여섯 끼. 비싸지만 좋아해서 먹을 때마다 마음 +1.'],
    sand: ['화장실 모래 한 포대. 붓고 나흘을 쓴다.', '모래가 바닥나면 똥을 퍼낼 수도 없다.'],
    toy: ['새 쥐돌이. 네 번 놀면 해진다.'],
    roller: ['정장에 붙은 고양이 털을 떼는 돌돌이.', '출근 전에 굴리면 고객님이 털을 못 본다.'],
    coffee: ['마시면 체력 +1. 하루 한 잔.', '저녁 6시 넘어 마시면 그날 밤 잠이 덜 찬다.'],
    lunch: ['저녁에 먹으면 체력 +1.'],
    feeder: ['내가 깜빡한 끼니를 건사료로 대신 준다.'],
    tower: ['혼자 있는 낮에 창밖을 본다.', '출근한 날 마음이 덜 준다.'],
    robot: ['밤마다 돌아서 바닥 털이 더 쌓이지 않게 막는다.', '다 치우지는 못하고, 먼지 발자국은 못 닦는다.'],
    autoToy: ['안 놀아 준 밤에 혼자 놀아서 문 앞에서 울지 않는다.', '마음은 오르지 않는다. 다섯 밤 쓰면 닳는다.'],
    charcoal: ['남은 생활비 12,000원을 전부 쓴다.', '이 아이 밥은 살 수 없다.'],
    proDry: ['고양이 밥 여덟 끼.', '남은 생활비 12,000원을 전부 쓴다.'],
    proWet: ['습식 사료 여섯 끼.', '남은 돈으로는 모자란다.']
  };

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
    c15: { name: '오세영', look: 'customerB', tint: 330 },
    c16: { name: '송지아', look: 'customerB', tint: 100 }
  };

  var ORDINAL = ['첫', '두', '세', '네'];

  // 상담 중 생기는 일과 그 이유 (주인공의 한 줄)
  var CAUSE = {
    late: '늦어서 기분이 상하셨나 봐.',
    sneeze: '아, 털... 아침에 돌돌이를 할걸.',
    sneezeFirst: '고객님이 자꾸 재채기를 하신다. 감기 기운이 있으신가...',
    lateLeft: '늦는 바람에 기다리던 고객님이 먼저 가 버리셨대.',
    tired: '피곤하니까 손이 느려...',
    catLover: '고객님도 고양이 키우시는구나.',
    fur: '소매에 털이... 지저분해 보였겠다.',
    prepared: '메일을 읽어 둔 덕분에 이야기가 잘 풀린다.',
    yawn: '어젯밤에 잠을 설쳤더니...',
    busyLeft: '늦는 바람에 바쁜 고객님이 먼저 가 버리셨대.',
    smell: '고객님이 코를 찡그리신다... 아침에 화장실을 안 치우고 나왔더니 옷에 냄새가 뱄나 봐.',
    stink: '고객님이 코를 막으셨다. 며칠 쌓인 화장실 냄새가 옷에 잔뜩 뱄어...',
    lost: '오늘은 못 땄네.'
  };
  var LOST = {
    busyLeft: '늦어서 그냥 가셨다', lateLeft: '늦어서 기다리다 가셨다', sneeze: '정장의 털에 재채기를 하셨다', late: '늦어서 기분이 상하셨다',
    fur: '정장의 털이 거슬리셨다', yawn: '하품을 참지 못했다', mistake: '엉뚱한 안내서를 건넸다', slow: '너무 오래 기다리시게 했다',
    smell: '옷에 밴 화장실 냄새', stink: '옷에 잔뜩 밴 화장실 냄새'
  };
  var HEART = {
    pet: '쓰다듬어 줬다', play: '쥐돌이로 놀아 줬다', together: '같이 잤다', wet: '습식 사료를 먹었다',
    curtain: '천둥 치는 밤, 커튼을 치고 곁에 있어 줬다', alone: '하루 종일 혼자 있었다', missAm: '아침밥을 걸렀다',
    missPm: '저녁밥을 걸렀다', dry: '물그릇이 말라 있었다', accident: '화장실이 더러워서 거실 바닥에 실수했다',
    accidentBed: '화장실이 더러워서 침대 이불에 실수했다', accidentSand: '모래가 다 떨어져서 거실 바닥에 실수했다',
    accidentSandBed: '모래가 다 떨어져서 침대 이불에 실수했다', lonely: '닫힌 문 앞에서 혼자 잤다',
    aloneTower: '하루 종일 혼자였지만 캣타워에서 창밖을 봤다', dusty: '먼지 때문에 밤새 재채기를 했다',
    jobAlone: '주말에도 알바 가서 혼자 있었다', locked: '서랍 속에 하루 종일 갇혀 있었다',
    stormAlone: '천둥 치는 밤을 소파 밑에서 혼자 떨었다'
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
      towerWatch: j(cat, 'subject') + ' 캣타워 꼭대기에서 창밖을 보다가 내려왔다.',
      alone: '하루 종일 혼자 있었구나.',
      ate: j(cat, 'subject') + ' 기다렸다는 듯이 허겁지겁 사료를 먹기 시작한다.',
      wetAte: j(cat, 'subject') + ' 습식 사료를 핥아 먹는다. 꼬리가 바짝 섰다.',
      storm: '천둥소리에 ' + j(cat, 'subject') + ' 소파 밑으로 숨었다.',
      stormOut: j(cat, 'subject') + ' 슬금슬금 나와서 무릎에 올라왔다.',
      hidden: j(cat, 'subject') + ' 안 보인다. 어디 갔지?',
      found: '서랍 속 후드티 위에 있었네. 내 냄새가 나서 그런가.',
      foundLate: '서랍 속에... 하루 종일 여기 갇혀 있었어? 미안해, 아침에 찾아볼걸.',
      lockedHome: j(cat, 'subject') + ' 현관에 없다. 어디선가 작게 우는 소리가 들린다.',
      stormHint: '번쩍일 때마다 떨고 있네... 창문을 가려 주면 좀 나을까?',
      petFur: '아차, 정장에 털이 묻었다.',
      noScoop: '모래가 다 떨어져서 똥이 바닥에 눌어붙었어. 새 모래부터 부어야 퍼낼 수 있겠다.',
      smellAm: '화장실 냄새가 옷에 배겠다. 나가기 전에 치우자.',
      bringToy: j(cat, 'subject') + ' 쥐돌이를 물고 와서 발 앞에 내려놓았다.',
      fed: '아침은 먹었어. 저녁에 또 줄게.',
      hiddenToy: '천둥이 무서워서 ' + j(cat, 'subject') + ' 안 나와. 놀아 줄 수가 없네. 커튼부터 쳐 줘야겠다.',
      hiddenToyAm: j(cat, 'subject') + ' 안 보이는데 누구랑 놀아.',
      noToy: '쥐돌이가 다 해졌다. 슈퍼에서 새로 사 와야겠다.',
      toyBroke: '쥐돌이 꼬리가 떨어졌다. 다음엔 새 걸 사 와야겠다.',
      played: '오늘은 실컷 놀았어. 이제 졸린가 봐.',
      tired: '너무 지쳐서 놀아 줄 힘이 없어. 소파에서 좀 쉬자.',
      autoToy: j(cat, 'subject') + ' 자동 장난감 깃털을 쫓아다니고 있다. 그래도 자꾸 나를 돌아본다.',
      autoToyWorn: '자동 장난감 깃털이 다 해졌다. 이제 안 돈다.',
      robot: '로봇청소기가 밤새 돌았다. 털 뭉치가 조금 줄었다.',
      sandLow: '모래가 얼마 안 남았네. 새 모래로 갈아 줘야겠다.',
      sandOut: '모래가 다 떨어졌어. 새 모래 부어 줘야 해.',
      noSand: '부을 새 모래가 없네. 퇴근길에 사 와야겠다.',
      litterClean: '화장실은 깨끗해.',
      fedPm: '저녁은 먹었잖아. 내일 아침에 또 줄게.'
    }[key];
  }

  var DAY_INTRO = {
    0: [{ who: 'me', text: '드디어 내일 첫 출근이다.' }, { who: 'me', text: '노트북이랑 충전기부터 챙겨 두자.' }],
    1: [{ who: 'me', text: '7시 40분. 지하철로 50분 걸리니까 8시 10분에는 나가야 9시 조회에 안 늦어.' }, { who: 'me', text: '늦으면 기다리던 고객님이 그냥 가 버린대. 서두르자.' }],
    6: [{ who: 'me', text: '토요일이다. 오늘은 하루가 길어.' }],
    11: [{ who: 'me', text: '내일이 마감이다.' }],
    12: [{ who: 'me', text: '오늘이 수습 마지막 날이다.' }]
  };

  function assembly(s, late) {
    var lines = [], d = s.day, cl = Life.clientsOn(d), me = s.me;
    if (late) lines.push({ who: 'lead', text: me + ' 씨, 고객님 벌써 와 계세요.' });
    if (d === 1) {
      lines.push({ who: 'lead', text: '오늘부터 함께할 수습 설계사 ' + me + ' 씨예요.' });
      lines.push({ who: 'lead', text: '설계사는 고객님 이야기를 듣고, 그분께 꼭 맞는 보험을 권해 드리는 사람이에요.', board: true });
      lines.push({ who: 'lead', text: '치아, 자동차, 여행자, 화재. 고객님이 무엇을 걱정하시는지 들으면 어떤 안내서를 드릴지 보여요.', board: true });
      lines.push({ who: 'lead', text: '수습은 4월 24일까지예요. 저 실적 그래프에서 목표선 8건을 넘기면 정식 설계사가 돼요.', chart: true });
      lines.push({ who: 'lead', text: '조회에 늦으면 기다리던 첫 고객님은 그냥 가세요. 시간 꼭 지켜요.' });
      lines.push({ who: 'lead', text: '오늘 고객은 두 분이에요. 처음 상담은 선배랑 같이 해요.' });
    } else if (Life.day(s).final) {
      lines.push({ who: 'lead', text: '오늘이 마감이에요. 상담 끝나고 실적 그래프 앞에서 봐요.' });
    } else if (!late) {
      lines.push({ who: 'lead', text: '좋은 아침이에요. ' + me + ' 씨 오늘 고객은 ' + (cl.length === 2 ? '두 분' : '한 분') + '이에요.' });
    }
    return lines;
  }
  // 첫 고객을 털 때문에 놓친 뒤에 선배가 알려 준다
  function senior(s, sneezed, lend) {
    var lines = sneezed ? [
      { who: 'peer', text: '아까 고객님 재채기 계속하셨죠? ' + s.me + ' 씨 소매에 고양이 털이 잔뜩 붙어 있었어요.' },
      { who: 'peer', text: '털 알레르기 있는 분들한테는 그거 하나로 끝이에요. 고양이 키워요?' }
    ] : [
      { who: 'peer', text: s.me + ' 씨, 소매에 고양이 털이 잔뜩 붙어 있어요. 고객님이 계속 그거 보시던데.' },
      { who: 'peer', text: '정장에 털 붙어 있으면 지저분해 보여요. 고양이 키워요?' }
    ];
    if (lend) lines.push({ who: 'peer', text: '오후 상담 전에 제 돌돌이로 떼 드릴게요. 가만 있어 봐요.', lend: true });
    lines.push({ who: 'peer', text: '지하철역 앞 슈퍼에 돌돌이 3,000원이면 있어요. 출근 전에 꼭 한 번 굴려요.' });
    return lines;
  }
  var TUTORIAL = [
    { who: 'peer', text: '고객님 말씀을 잘 들어 보세요. 아래 안내서 중에 맞는 걸 눌러 잡고, 고객님 쪽으로 끌어다 드리면 돼요.' },
    { who: 'peer', text: '그다음은 요금표, 마지막이 계약서예요. 엉뚱한 걸 한 번이라도 드리면 바로 생각해 보겠다고 하세요.' }
  ];
  // 고객이 처음에 하는 말. 준비(고객 메모)를 안 했으면 말풍선에도 이 짧은 말만 뜬다.
  var HINT = {
    dental: { say: '요즘 찬물만 마셔도 이가 시려서요. 치과 가기가 겁나요.', bubble: '이가 시려요' },
    car: { say: '다음 주에 첫 차를 뽑아요. 운전이 아직 무서워서요.', bubble: '첫 차를 샀어요' },
    travel: { say: '다음 달에 처음으로 해외여행을 가요. 가서 아프면 어쩌죠?', bubble: '해외여행 가요' },
    home: { say: '집이 오래돼서요. 겨울마다 불 날까 봐 걱정이에요.', bubble: '불 날까 걱정' },
    group: { say: '우리 식당 직원들 다 같이 들 수 있는 거 있을까요?', bubble: '직원 다 같이' }
  };
  var MARK_NOTE = { sneeze: '고양이 털 알레르기가 있으심', cat: '고양이를 키우심. 고양이 이야기 좋아하심', clock: '시간이 없으신 분. 늦으면 바로 가심', none: '' };
  var CONSULT = {
    signed: '여기 서명할게요.',
    lost: '음... 생각해 볼게요.',
    wrong: '이건 제가 찾는 게 아닌데요.',
    slow: '음...',
    greet: '안녕하세요.'
  };
  function leaveOffice(s, first) {
    var lines = [];
    if (first) {
      lines.push({ who: 'lead', text: s.me + ' 씨, 내일 만날 고객님 메모는 메일로 보내 둘게요.' });
      lines.push({ who: 'lead', text: '무슨 상품을 찾으시는지, 털 알레르기는 없는지 적혀 있어요. 집에서 읽고 오면 상담이 훨씬 쉬워요.' });
      lines.push({ who: 'lead', text: '오늘은 들어가 봐요. 문은 저쪽이에요.' });
    }
    return lines;
  }
  // 퇴근 전 지점에서 선배와 지점장님을 누르면 하는 말 (그날 상황에 맞는 것부터)
  function officeTip(s, who) {
    var left = Math.max(0, Life.GOAL - s.contracts), tips = [];
    if (who === 'lead') {
      if (s.contracts >= Life.GOAL) tips.push('목표는 채웠어요. 남은 날 계약은 수당을 1.5배로 쳐 줘요.');
      else tips.push('지금 ' + s.contracts + '건이에요. 24일까지 ' + left + '건 남았어요.');
      tips.push('고객 메모는 집 노트북으로 보냈어요. 읽어 보면 어떤 상품을 찾는지 미리 알 수 있어요.');
      tips.push('피곤하면 안내서 글씨가 눈에 안 들어와요. 일찍 자는 것도 일이에요.');
    } else {
      if (s.fur > 0 && !s.owned.roller) tips.push('소매에 아직 털 있어요. 돌돌이는 역 앞 슈퍼에 있어요.');
      tips.push('엉뚱한 안내서를 한 번이라도 드리면 바로 생각해 보겠다고 하세요. 모르겠으면 고객님 말을 다시 떠올려 봐요.');
      tips.push('고양이 키우는 고객님한테는 털이 오히려 반가운 얘깃거리예요.');
      tips.push('저녁에 늦게 자면 다음 날 상담 때 하품 나와요. 저도 그랬어요.');
    }
    var key = who + 'Tip', n = s.seen[key] || 0;
    s.seen[key] = n + 1;
    return [{ who: who, text: tips[n % tips.length] }];
  }
  function goalReached(s) {
    return [
      { who: 'lead', text: s.me + ' 씨! 방금 계약으로 ' + s.contracts + '건이에요. 수습 목표 8건 달성!' },
      { who: 'peer', text: '와, 벌써요? 축하해요!' },
      { who: 'lead', text: '정식 위촉은 확정이에요. 24일까지 남은 계약은 수당을 1.5배로 드릴게요.' }
    ];
  }
  // 집 냉장고에 붙여 둔 돌봄 메모. 검은 화면이 아니라 종이 한 장으로 보여 준다.
  function careNote(cat) {
    return {
      title: j(cat, 'of') + ' 하루',
      rows: [
        { icon: 'bowl', text: '밥은 아침저녁 두 번. 굶기면 마음이 준다.' },
        { icon: 'drop', text: '물은 매일 새로. 그릇이 마르면 마음이 준다.' },
        { icon: 'poop', text: '똥은 출근 전에 치우기. 안 치우면 옷에 냄새가 밴다.' },
        { icon: 'clock', text: '모래는 나흘에 한 번 새로. 떨어지면 똥도 못 퍼낸다.' },
        { icon: 'heart', text: '습식은 비싸지만 먹을 때마다 마음 +1.' },
        { icon: 'mouse', text: '쥐돌이로 놀아 주기. 안 놀면 밤에 문 앞에서 운다.' },
        { icon: 'fur', text: '바닥 털은 빗자루로. 쌓이면 정장에 묻는다.' },
        { icon: 'zzz', text: '나는 11시 전에 자기. 늦을수록 체력이 덜 찬다.' }
      ]
    };
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

  var NAMES = { me: null, lead: '지점장님', peer: '선배', cat: null, owner: '슈퍼 사장님' };

  var ENDING = {
    family: { title: '우리 집', body: function (s) { return ['정식 설계사가 되었다.', '첫 수당으로 ' + j(s.cat, 'of') + ' 펫보험을 들었다. 계약서 맨 위에 처음으로 우리 집 주소를 적었다.', '천둥 치던 밤도, 서랍 속 아침도 다 지나갔다. 이제 이 집은 우리 집이다.']; } },
    both: { title: '두 몸을 건사했다', body: function (s) { return ['정식 설계사가 되었다.', '현관을 열면 오늘도 ' + j(s.cat, 'subject') + ' 앉아 있다.']; } },
    catStays: { title: function (s) { return '실적은 아직, ' + j(s.cat, 'topic') + ' 곁에'; }, body: function (s) { return ['수습은 한 달 늘었다.', '그래도 밤마다 ' + j(s.cat, 'subject') + ' 내 옆에서 잔다.']; } },
    soso: { title: '그럭저럭 둘이서', body: function (s) { return ['정식 설계사가 되었다.', j(s.cat, 'topic') + ' 가끔 나를 모른 척한다. 그래도 저녁이면 현관에 와 있다.']; } },
    clumsy: { title: '둘 다 아직 서툴다', body: function (s) { return ['수습은 한 달 늘었다.', j(s.cat, 'with') + ' 나는 아직 서로에게 서툴다.']; } },
    oneBody: { title: '한 몸만 건사했다', body: function (s) { return ['정식 설계사가 되었다.', '집에 오면 ' + j(s.cat, 'subject') + ' 더 이상 현관에 나와 있지 않다.']; } },
    again: { title: '다시 처음부터', body: function (s) { return ['일도, ' + j(s.cat, 'with') + '의 하루도 잘 풀리지 않았다.', '이건 게임이니까, 처음부터 다시 해 볼 수 있다.']; } },
    emptyBowl: { title: '빈 밥그릇', body: function (s) { return ['밥그릇이 너무 자주 비어 있었다.', '어느 날 아침, ' + j(s.cat, 'subject') + ' 열린 창틈으로 나가 슈퍼 앞으로 돌아갔다. 슈퍼 사장님이 밥을 챙겨 준다고 한다.', '이건 게임이니까, 처음부터 다시 해 볼 수 있다.']; } }
  };
  function endingTitle(key, s) { var t = ENDING[key].title; return typeof t === 'function' ? t(s) : t; }
  var GRADE_NAME = { good: 'GOOD ENDING', normal: 'NORMAL ENDING', bad: 'BAD ENDING', hidden: 'HIDDEN ENDING' };
  // 아직 못 본 엔딩 칸에 보이는 귀띔
  var ENDING_HINT = {
    family: '천둥 치던 밤과 서랍 속 아침, 둘 다 지켜 준다면...',
    both: '목표 8건, 그리고 마음 네 칸 이상',
    soso: '목표 8건, 마음은 두세 칸',
    catStays: '실적은 모자라도 마음은 네 칸 이상',
    clumsy: '실적도 마음도 조금씩 모자라면',
    oneBody: '목표는 채웠지만 마음이 한 칸 이하',
    again: '일도 고양이도 잘 안 풀리면',
    emptyBowl: '밥그릇이 너무 자주 비면'
  };

  // 엔딩 글에 넣을, 실제로 있었던 날 하나
  function memory(s, key) {
    var ev = s.events, pick = null, date = function (d) { return Life.DAYS[d].date; };
    var good = ['curtain', 'drawer', 'catLover', 'groupSigned', 'firstContract', 'together'];
    var bad = ['drawerLate', 'stormAlone', 'lonely', 'scratched'];
    var order = key === 'oneBody' || key === 'again' || key === 'clumsy' || key === 'emptyBowl' ? bad.concat(good) : good;
    for (var i = 0; i < order.length && !pick; i++) for (var k = ev.length - 1; k >= 0; k--) if (ev[k].key === order[i]) { pick = ev[k]; break; }
    if (!pick) return null;
    var c = s.cat;
    var text = {
      curtain: '비 오던 밤, 커튼을 쳐 주었다.',
      drawer: '아침에 서랍 속 후드티 위에서 ' + j(c, 'object') + ' 찾았다.',
      drawerLate: j(c, 'subject') + ' 하루 종일 서랍 속에 갇혀 있었다.',
      stormAlone: '천둥 치는 밤, ' + j(c, 'subject') + ' 소파 밑에서 혼자 떨었다.',
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
      if (ev.indexOf('drawerLate') >= 0) parts.push('옷 속에 숨었다가 나오지 못했다. 하루가 길었다');
      if (ev.indexOf('stormAlone') >= 0) parts.push('천둥이 무서워서 소파 밑에서 떨었다');
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
    opening: opening, phone: phone, PRODUCT: PRODUCT, SHORT: SHORT, ITEM: ITEM, ITEM_DESC: ITEM_DESC, CLIENT: CLIENT, ORDINAL: ORDINAL,
    HINT: HINT, MARK_NOTE: MARK_NOTE, officeTip: officeTip, goalReached: goalReached, careNote: careNote,
    CAUSE: CAUSE, LOST: LOST, HEART: HEART, morningNote: morningNote, catLine: catLine, DAY_INTRO: DAY_INTRO,
    assembly: assembly, senior: senior, TUTORIAL: TUTORIAL, CONSULT: CONSULT, leaveOffice: leaveOffice, groupOffer: groupOffer,
    evaluation: evaluation, NAMES: NAMES, ENDING: ENDING, endingTitle: endingTitle, GRADE_NAME: GRADE_NAME, ENDING_HINT: ENDING_HINT, memory: memory, epilogue: epilogue
  };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Story;
