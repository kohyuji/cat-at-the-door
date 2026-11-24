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
      return { from: '늘봄손해보험', time: '오후 4:10', preview: '[늘봄손해보험] ' + me + ' 님, 위촉이 확정되었습니다...',
        body: '[늘봄손해보험] ' + me + ' 님, 보험설계사 위촉이 확정되었습니다. 축하드립니다.\n\n4월 13일(월) 오전 9시까지 새솔지점으로 출근해 주세요.\n\n설계사는 회사 직원이 아니라 위촉 계약을 맺은 개인사업자라 기본급이 없습니다. 이번 달 계약 수수료는 5월 8일(금)에 한 번에 지급됩니다.\n\n첫 달에 계약 ' + Life.GOAL + '건을 채우시면 신입 정착지원금도 함께 드립니다.' };
    },
    job: { from: '행복슈퍼 사장님', time: '오전 9:40', preview: '주말에 진열 좀 도와줄 사람 찾아요...',
      body: '주말에 진열 좀 도와줄 사람 찾아요. 토요일, 일요일 둘 다 돼요.\n\n오후 3시 전에 가게로 오면 네 시간, 시급 10,320원으로 41,280원 드릴게요. 상자를 나르는 일이라 좀 고돼요.\n\n가게 벽에 공고 붙여 놨어요.' },
    // 첫 출근 전날 밤, 지점장님이 보내는 문자: 이 일이 무슨 일인지
    boss: function (me) {
      return { from: '새솔지점 지점장', time: '오후 7:20', preview: me + ' 씨, 내일부터 같이 일할 지점장이에요...',
        body: me + ' 씨, 내일부터 같이 일할 새솔지점 지점장이에요.\n\n우리 일은 고객님 이야기를 잘 듣고, 그분께 필요한 보장을 찾아 권해 드리는 거예요. 차로 출퇴근을 시작한 분께는 운전자보험, 처음 혼자 사는 분께는 화재보험처럼요.\n\n내일 9시 조회에서 봬요. 집에서 지하철로 50분이니 8시 10분에는 나오세요.' };
    },
    group: { from: '윤순자 사장님', time: '오후 3:20', body: '설계사님, 우리 식당 직원들 단체보험 좀 알아보려고요. 가게 일 끝나는 저녁 8시에만 시간이 되는데, 오늘 지점으로 가도 될까요?', yes: '8시에 뵐게요', no: '다음에 뵐게요' }
  };

  var PRODUCT = { dental: '치아보험', car: '운전자보험', travel: '여행자보험', home: '화재보험', pet: '펫보험', group: '단체상해보험' };
  var SHORT = { dental: '치아', car: '운전자', travel: '여행자', home: '화재', pet: '펫', group: '단체', price: '요금표', contract: '계약서' };
  var ITEM = { dry: '건사료', wet: '습식 사료', sand: '모래', toy: '쥐돌이', tower: '캣타워', feeder: '자동 급식기', roller: '돌돌이', coffee: '커피', lunch: '도시락', lunchOut: '지안과 점심', charcoal: '번개탄', robot: '로봇청소기', autoToy: '자동 장난감' };
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
    c16: { name: '송지아', look: 'customerB', tint: 100 },
    c17: { name: '장수빈', look: 'customerC', tint: 250 },
    c18: { name: '홍재원', look: 'customerA', tint: 30 },
    c19: { name: '유가은', look: 'customerB', tint: 300 },
    c20: { name: '권도윤', look: 'customerA', tint: 160 },
    c21: { name: '백승아', look: 'customerB', tint: 60 },
    // 소개로 오는 고객 (솔직하게 권하지 않은 고객이 소개해 준다)
    r1: { name: '서유나', look: 'customerB', tint: 210 },
    r2: { name: '문태오', look: 'customerC', tint: 90 }
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
    photos: '고객님 고양이 사진을 보다가, 나도 휴대폰 속 사진을 보여 드렸다.',
    yawn: '어젯밤에 잠을 설쳤더니...',
    busyLeft: '늦는 바람에 바쁜 고객님이 먼저 가 버리셨대.',
    smell: '고객님이 코를 찡그리신다... 아침에 화장실을 안 치우고 나왔더니 옷에 냄새가 뱄나 봐.',
    stink: '고객님이 코를 막으셨다. 며칠 쌓인 화장실 냄새가 옷에 잔뜩 뱄어...',
    lost: '오늘은 못 땄네.'
  };
  var LOST = {
    busyLeft: '늦어서 그냥 가셨다', lateLeft: '늦어서 기다리다 가셨다', sneeze: '정장의 털에 재채기를 하셨다', late: '늦어서 기분이 상하셨다',
    fur: '정장의 털이 거슬리셨다', yawn: '하품을 참지 못했다', mistake: '설계를 여러 번 잘못 보여 드렸다', slow: '너무 오래 기다리시게 했다',
    wrongProduct: '걱정과 다른 보험을 권했다', missing: '걱정하신 보장을 빠뜨렸다', mood: '마음이 움직이지 않으셨다', declined: '솔직하게 말씀드리고 이번엔 가입하지 않았다', later: '나중에 다시 오신다고 했다',
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
    stormAlone: '천둥 치는 밤을 소파 밑에서 혼자 떨었다',
    kneadPet: '새벽 꾹꾹이를 받아 줬다', kneadPush: '새벽 꾹꾹이에 이불을 덮어썼다', mealTogether: '주말에 마주 앉아 같이 먹었다',
    waitedAsleep: '야근하는 동안 현관에서 기다리다 잠들었다', lateHome: '늦게 들어온 밤, 현관에서 오래 기다렸다',
    moved: '자판 위에서 내려놓았다', lid: '노트북을 덮고 같이 놀았다'
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
    1: [{ who: 'me', text: '7시 40분. 지하철로 50분 걸리니까 8시 10분에는 나가야 9시 조회에 안 늦어.' }, { who: 'me', text: '늦으면 오전 고객님은 기다리다 그냥 가 버린대. 서두르자.' }],
    6: [{ who: 'me', text: '토요일이다. 오늘은 하루가 길어.' }],
    25: [{ who: 'me', text: '내일이 첫 달 마감이다.' }],
    26: [{ who: 'me', text: '오늘이 마감이고, 수수료 들어오는 날이다.' }]
  };

  function assembly(s, late) {
    var lines = [], d = s.day, cl = Life.clientsOn(d), me = s.me;
    if (late) lines.push({ who: 'lead', text: me + ' 씨, 오전 고객님은 기다리다 가셨어요. 오후 고객님은 놓치지 마요.' });
    if (d === 1) {
      lines.push({ who: 'lead', text: '오늘부터 함께할 신입 설계사 ' + me + ' 씨예요.' });
      lines.push({ who: 'lead', text: '설계사는 고객님 이야기를 듣고, 그분께 꼭 맞는 보험을 권해 드리는 사람이에요.', board: true });
      lines.push({ who: 'lead', text: '첫 주는 치아보험과 화재보험부터 해요. 여행자, 운전자, 펫보험은 하나씩 늘려 갈 거예요.', board: true });
      lines.push({ who: 'lead', text: '첫 달 마감은 5월 8일이에요. 저 실적 그래프에서 기준선 ' + Life.GOAL + '건을 넘기면 정착지원금이 나와요.', chart: true });
      lines.push({ who: 'lead', text: '오늘은 오전, 오후에 한 분씩이고, 내일부터는 하루 한 분이에요. 조회에 늦으면 첫 고객님은 그냥 가세요.' });
      lines.push({ who: 'lead', text: '첫 주는 선배가 옆에 앉아서 같이 봐 줄 거예요.' });
    } else if (Life.day(s).final) {
      lines.push({ who: 'lead', text: '오늘이 첫 달 마감이에요. 상담 끝나고 실적 그래프 앞에서 봐요.' });
    } else if (!late) {
      lines.push({ who: 'lead', text: '좋은 아침이에요. ' + me + ' 씨 오늘 고객은 ' + (cl.length === 2 ? '두 분' : '한 분') + '이에요.' });
    }
    if (s.seen.bossTalk === d) bossTalk(s).forEach(function (l) { lines.push(l); });
    var nu = { 2: 'travel', 3: 'car', 4: 'pet' }[d];
    if (nu) lines.push({ who: 'lead', text: '오늘부터 ' + PRODUCT[nu] + ' 안내서도 책상에 놓아 둘게요.', board: true });
    // 옷에 화장실 냄새가 배어 온 날: 지점장님이 먼저 알아채고 선배가 귓속말로 알려 준다
    if (s.smell > 1) {
      lines.push({ who: 'lead', text: '...잠깐, 이거 무슨 냄새죠? ' + me + ' 씨 쪽에서 나는 것 같은데.', sniff: true });
      lines.push({ who: 'peer', text: me + ' 씨, 옷에서 고양이 화장실 냄새가 많이 나요. 이대로 고객님 만나면 큰일이에요.' });
    } else if (s.smell > 0) {
      lines.push({ who: 'lead', text: '음? 어디서 화장실 냄새 같은 게 나는데... 다들 창문 좀 열어요.', sniff: true });
      lines.push({ who: 'peer', text: '(작게) ' + me + ' 씨, 옷에서 냄새 조금 나요. 고양이 화장실 아침에 안 치웠죠?' });
    }
    return lines;
  }
  // 냄새 때문에 처음 계약을 놓친 뒤에 선배가 알려 준다
  function seniorSmell(s, lend) {
    var lines = [
      { who: 'peer', text: '아까 고객님이 자꾸 몸을 뒤로 빼시던 거 봤죠? 옷에 밴 냄새 때문이에요.' },
      { who: 'peer', text: '고양이 화장실은 출근 전에 꼭 치우고 나와요. 냄새는 돌돌이로도 안 빠져요.' }
    ];
    if (lend) lines.push({ who: 'peer', text: '오후 상담 전에 제 섬유 탈취제 좀 뿌려 줄게요. 다 빠지진 않아도 조금은 나을 거예요.', spray: true });
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
  // ---------- 상담 ----------
  // 보장 항목 이름
  var COVER = {
    fill: '때우는 치료', implant: '임플란트', gum: '잇몸 치료',
    settle: '형사합의금', fine: '벌금', lawyer: '변호사 비용', injury: '내가 다친 치료비',
    med: '현지 병원비', luggage: '짐 분실', delay: '비행기 지연',
    fire: '불난 집 수리', liab: '남에게 입힌 피해', theft: '도둑',
    surgery: '수술비', clinic: '통원 치료비', bite: '남을 문 사고',
    hospital: '입원 일당'
  };
  // 단체보험은 같은 이름이 다른 뜻이라 따로 둔다
  var COVER_GROUP = { injury: '일하다 다친 치료비', hospital: '입원 일당', surgery: '수술비' };
  function coverName(product, item) { return product === 'group' ? COVER_GROUP[item] : COVER[item]; }

  // 고객이 하는 말. life: 사는 이야기, worry: 걱정, budget: 한 달 예산, hook: 지금 들어야 할 이유
  // yes: 청약서 질문 중 '예'라고 답하는 줄과 그때 하는 말
  var TALK = {
    c1: { life: '아버지가 쉰도 안 돼서 틀니를 하셨어요.', worry: '저도 그렇게 될까 봐요. 이가 빠지면 임플란트가 그렇게 비싸다면서요.', budget: '한 달에 3만 원 안쪽이면 좋겠어요.' },
    c16: { life: '독립해서 처음 혼자 살아요. 오래된 빌라 2층이에요.', worry: '친구가 집에서 물이 새서 아래층 천장 수리비를 물어 줬대요. 저도 그럴까 봐요.', budget: '만 원대면 들고 싶어요.' },
    c2: { life: '딸이 프랑스에 살아요. 처음으로 3주 다녀오려고요.', worry: '거기서 아프면 병원비가 많이 나온다던데요.', budget: '한 번 내는 거면 4만 원까지는 괜찮아요.' },
    c3: { life: '회사가 멀리 이사 가서, 이제 차로 출퇴근해요.', worry: '자동차보험은 들었는데, 사고로 사람이 다치면 합의금은 따로 들 수 있다고 해서요.', budget: '한 달에 만 원대면 돼요.' },
    c10: { life: '고양이가 이제 세 살이에요.', worry: '나이 들면 병원비가 많이 든다고 해서요. 수술이라도 하면 몇백이라던데.', budget: '3만 원대까지는 생각하고 있어요.' },
    c7: { life: '고양이가 전기레인지 위에 자꾸 올라가요. 지난주엔 버튼을 밟아서 불이 켜졌어요.', worry: '집 비운 사이에 불이 날까 봐요. 세탁기 호스도 오래돼서 아래층에 물이 샐까 봐 걱정이고요.', budget: '만 오천 원 안쪽이요.' },
    c8: { life: '점심시간에 잠깐 나왔어요. 다음 주에 베트남 출장이 갑자기 잡혔어요.', worry: '거기서 아프거나 다치면 병원은 어떻게 하나 싶어서요.', budget: '한 번 내는 거면 2만 원 안쪽이요.' },
    c9: { life: '아이 학원 데려다주느라 하루에 운전만 두 시간이에요.', worry: '학원 앞이 어린이보호구역이라, 사고 나면 합의금에 벌금까지 나온다고 들었어요.', budget: '2만 원은 안 넘었으면 해요. 하나하나 다 설명해 주세요.' },
    c4: { life: '아들이 교정을 시작했어요. 교정은 보험이 안 된다더라고요.', worry: '저라도 들어 두려고요. 이 때우는 게 한 번 할 때마다 부담돼서요.', budget: '3만 원 안에서요.', yes: { line: 0, say: '아, 작년 가을에 어금니 하나 때웠어요.' } },
    c11: { life: '할머니가 시골에서 혼자 사세요. 오래된 집이에요.', worry: '겨울에 난로를 때시는데 불이 날까 봐요.', budget: '할머니 집이라 제가 낼 거예요. 만 원 정도요.' },
    c12: { life: '계모임 친구들이랑 칠순 기념으로 일본에 가요.', worry: '나이가 있으니 가서 아플까 봐요.', budget: '한 번 내는 거면 3만 원까지요. 꼼꼼히 봐 주세요.', yes: { line: 0, say: '작년 겨울부터 무릎 때문에 정형외과에 다녀요.' } },
    c13: { life: '치아보험은 3년 전에 하나 들어 놨어요. 이거요.', worry: '아버지가 이번에 임플란트를 하셨는데, 제 건 때우는 것만 되더라고요.', budget: '지금 내는 것 말고, 더 내는 건 2만 5천 원까지요.' },
    c14: { life: '장롱면허예요. 운전대 잡은 지 10년도 넘었어요.', worry: '사람이라도 다치게 하면 어쩌나 싶어요.', budget: '만 원대면요.', hook: '다음 주부터 아내랑 번갈아 차로 출퇴근하기로 했어요.' },
    c15: { life: '아이들 생일마다 초를 잔뜩 켜요.', worry: '불도 걱정이고, 애들이 놀다가 남의 집 물건을 깨뜨릴까 봐도요.', budget: '만 2천 원이 최대예요. 다른 데서도 알아보고 왔어요.' },
    c6: { life: '식당 식구가 저까지 일곱이에요.', worry: '주방 일이라 데고 베이는 일이 잦아요. 입원이라도 하면 그동안 일당도 못 받고요.', budget: '한 달에 8만 원까지는 낼게요.' },
    c17: { life: '보호소에서 일곱 살 강아지를 데려왔어요.', worry: '나이가 있어서 병원 갈 일이 많을 것 같아요.', budget: '4만 원까지요.', yes: { line: 0, say: '지난달에 피부병으로 병원에 다녔어요.' } },
    c18: { life: '점심시간이라 빨리 가 봐야 해요. 주말마다 캠핑 가느라 장거리 운전을 해요.', worry: '멀리 가다 사고 나면 상대방 합의금도 그렇고, 제가 다치는 것도 걱정이에요.', budget: '2만 원 안쪽이요.' },
    c19: { life: '신혼여행으로 하와이에 가요. 고양이는 친정에 맡기고요.', worry: '가서 아프면 병원비가 엄청나다던데, 짐 잃어버리는 것도 걱정이에요.', budget: '한 번 내는 거면 5만 원 정도요.' },
    c20: { life: '회사 건강검진을 받았는데요.', worry: '잇몸이 안 좋다고 치료받으래요. 잇몸 치료가 되는 보험이 있을까 해서요.', budget: '3만 원까지요.', yes: { line: 1, say: '검진에서 치주염이라고 나왔어요.' } },
    r1: { life: '민혁 씨 소개로 왔어요. 필요한 것만 권해 주신다고 해서요.', worry: '이사한 집 아래층이 가게예요. 물이라도 새면 큰일이래요.', budget: '만 원대요.' },
    c21: { life: '저는 아직 이가 멀쩡해요.', worry: '그래도 때우는 거랑 임플란트 같은 큰 치료가 다 됐으면 해요.', budget: '3만 원까지요.', hook: '어머니가 이가 약하셔서 일찍부터 고생하셨거든요.' },
    r2: { life: '도윤 씨가 소개해 줬어요. 솔직하게 말해 주는 분이라고요.', worry: '처음 차를 샀는데 매일 어린이집 앞을 지나가요. 사고 나면 벌금도 크다고 해서요.', budget: '2만 원 안쪽이요.' }
  };
  // 청약서의 알릴 의무 질문 (상품마다 세 줄)
  var QUESTIONS = {
    dental: ['최근 1년 안에 충치 치료나 진단을 받은 적이 있다', '최근 5년 안에 잇몸 질환으로 치료나 진단을 받은 적이 있다', '지금 틀니를 쓰고 있다'],
    car: ['영업용(택시, 화물차 등)으로 운전한다', '최근 1년 안에 면허가 정지되거나 취소된 적이 있다', '오토바이를 탄다'],
    travel: ['최근 3개월 안에 병원에서 진찰이나 검사를 받은 적이 있다', '여행 중 스쿠버다이빙 같은 위험한 활동을 할 예정이다', '여행 금지 국가에 간다'],
    home: ['건물 안에서 음식점이나 공장을 운영한다', '최근 1년 안에 불이나 물이 새는 사고가 있었다', '집이 오래 비어 있다'],
    pet: ['최근 1년 안에 병으로 동물병원 치료를 받은 적이 있다', '수술을 받은 적이 있다', '동물등록을 하지 않았다'],
    group: ['높은 곳이나 화학 약품을 다루는 일을 하는 직원이 있다', '직원 중 지금 치료 중인 사람이 있다', '직원이 자주 바뀐다']
  };
  // 상품설명서에서 꼭 짚어야 하는 굵은 칸 세 개
  var EXPLAIN = {
    dental: ['가입하고 처음 90일은 때우는 치료도 보장되지 않아요.', '임플란트 같은 큰 치료는 1년 안에는 절반만 나와요.', '교정이나 미용 치료는 보장되지 않아요.'],
    car: ['음주나 무면허 운전 사고는 보장되지 않아요.', '형사합의금은 다친 정도에 따라 나오는 한도가 달라요.', '중간에 해지하면 낸 돈보다 훨씬 적게 돌려받아요.'],
    travel: ['여행 전부터 앓던 병은 보장이 안 될 수 있어요.', '위험한 레저 활동 중 사고는 빠져요.', '현지 병원 영수증과 진단서를 꼭 챙겨 오셔야 해요.'],
    home: ['일부러 낸 불은 보장되지 않아요.', '남에게 입힌 피해는 한 건마다 고객님이 먼저 내는 돈(자기부담금)이 있어요.', '중간에 해지하면 낸 돈보다 훨씬 적게 돌려받아요.'],
    pet: ['가입하고 처음 30일 안에 생긴 병은 보장되지 않아요.', '치료비의 일부는 고객님이 내셔야 해요.', '타고난 병이나 가입 전 병은 빠져요.'],
    group: ['일부러 다치거나 싸워서 다친 건 보장되지 않아요.', '직원이 바뀌면 명단을 꼭 알려 주셔야 해요.', '중간에 해지하면 낸 돈보다 훨씬 적게 돌려받아요.']
  };
  var DESIGN = {
    pickFirst: '어떤 보험이 맞을지부터 골라 볼게요.',
    wrongProduct: ['음... 제가 말씀드린 건 그게 아닌데요.', '아, 그건 저랑은 상관없는 것 같아요.'],
    missing: function (product, item) { return '그럼 ' + coverName(product, item) + '은요? 그게 제일 걱정인데요.'; },
    over: function (pr) { return '한 달에 ' + Life.won(pr) + '이요? 생각보다 비싸네요...'; },
    overOnce: function (pr) { return Life.won(pr) + '이면 그냥 여행 경비에 보탤래요.'; },
    overPush: '음... 좋다고 하시니까, 일단 해 볼게요.',
    ok: '네, 이 정도면 좋네요.',
    switchAsk: '이거 해지하고 새로 드는 게 나을까요?',
    switched: '그럼 예전 건 해지하고 이걸로 할게요.',
    kept: '아, 예전 건 그대로 두고 비어 있는 것만 채우는 거군요.'
  };
  var APPLY = {
    intro: '청약서예요. 질문에 하나씩 답해 주세요.',
    no: ['아니요.', '아니요, 없어요.', '그것도 아니요.'],
    tell: '그대로 적기',
    hide: '이건 안 적으셔도 돼요',
    toldExclusion: { dental: '말씀해 주셔서 다행이에요. 그 치아는 보장에서 잠시 빠지지만, 나머지는 그대로예요.', travel: '말씀해 주셔서 다행이에요. 무릎 치료는 보장에서 빠지고, 나머지는 그대로예요.', pet: '말씀해 주셔서 다행이에요. 피부병은 보장에서 빠지지만, 다른 병은 그대로예요.' },
    toldRefuse: '솔직히 말씀드리면, 지금은 잇몸 보장을 넣을 수가 없어요. 치료부터 받으시는 게 맞아요.',
    clientThanks: '그렇게 말해 주는 사람은 처음이에요. 주변에 보험 알아보는 사람 있으면 소개할게요.',
    clientHid: '아, 그래도 돼요? 그럼 아니요로 할게요.'
  };
  var SIGN = {
    explainIntro: '설명서에서 굵게 된 곳은 꼭 짚어 드려야 해요.',
    copies: '약관이랑 청약서 부본이에요. 집에서 한 번 더 보세요.',
    signed: '여기 서명할게요.',
    lost: '음... 조금 더 생각해 볼게요.',
    delay: { c14: '근데 운전 좀 익숙해지면 그때 들게요.', c21: '근데 아직 멀쩡하니까 나중에 들어도 되지 않을까요?' },
    persuade: { c14: '다음 주부터 출퇴근하신다고 하셨죠. 운전을 시작하는 첫날부터 보장이 있어야 해요.', c21: '어머니가 이가 약하셨다고 하셨죠. 치아보험은 이가 건강할 때만 들 수 있고, 들고 나서도 처음 몇 달은 보장이 안 돼요.' },
    persuaded: { c14: '...그러네요. 첫 출근 날부터 되게 해 주세요.', c21: '그럼 멀쩡할 때 들어 둘게요.' },
    later: '그럼 나중에 다시 올게요.',
    rushed: '...설명은 집에 가서 읽어 볼게요.'
  };
  var TUTORIAL = {
    listen: [{ who: 'peer', text: '고객님 말씀 중에 중요한 말은 눌러서 상담 노트에 적어 두세요. 세 줄까지 적을 수 있어요.' }],
    design: [{ who: 'peer', text: '맞는 안내서를 태블릿으로 끌어 오고, 걱정하신 보장을 켜세요. 보험료가 예산을 넘지 않게요.' }],
    apply: [{ who: 'peer', text: '청약서는 제가 옆에서 같이 볼게요. 고객님이 예라고 하시는 건 꼭 그대로 적어야 해요.' }],
    explain: [{ who: 'peer', text: '서명 전에 굵은 칸 세 개를 짚어 드리고, 약관이랑 부본을 건네요. 건너뛰면 나중에 취소될 수 있어요.' }]
  };
  // 계약이 취소될 때 오는 연락 (지점장)
  var CANCEL = {
    hide: function (n) { return n + ' 고객님이 해피콜에서, 설계사가 청약서에 알릴 사항을 안 적어도 된다고 했다고 답하셨대요. 계약은 취소됐어요. 내일 아침에 저 좀 봐요.'; },
    unexplained: function (n) { return n + ' 고객님이 해피콜에서 설명을 제대로 못 들었다고 하셔서, 청약을 철회하셨어요.'; },
    switch: function (n) { return n + ' 고객님 계약이 승환 점검에 걸렸어요. 예전 보험을 다시 살리고 새 계약은 취소하셨대요.'; },
    over: function (n) { return n + ' 고객님이 보험료가 부담된다고 청약을 철회하셨어요.'; }
  };
  var CANCEL_SHORT = { hide: '알릴 의무를 넘겨서 해피콜에서 취소', unexplained: '설명을 건너뛰어서 철회', switch: '갈아타게 해서 승환 점검에서 취소', over: '예산을 넘겨서 청약철회' };
  function bossTalk(s) {
    return [
      { who: 'lead', text: s.me + ' 씨, 청약서에 알릴 사항을 안 적으면 어떻게 되는지 알아요?' },
      { who: 'lead', text: '고객님이 나중에 보험금을 청구하면 보험사가 진료 기록을 확인해요. 그때 드러나면 보험금이 안 나오고 계약이 해지될 수 있어요. 제일 손해 보는 건 고객님이에요.' },
      { who: 'lead', text: '실적 급한 거 알아요. 그래도 그건 하면 안 돼요.' }
    ];
  }
  // 요금 안내
  var BILL = {
    phone: { name: '휴대폰 요금', from: '통신사' },
    rent: { name: '월세와 관리비', from: '집주인' },
    loan: { name: '학자금 대출 상환', from: '한국장학재단' }
  };
  // 고지는 휴대폰으로 온다: 통신사와 장학재단은 안내 문자, 월세는 집주인 문자
  function billNotice(id, due, amount) {
    var body = {
      phone: '[휴대폰 요금 안내]\n4월 청구 요금 ' + Life.won(amount) + '\n납부 마감일 ' + due,
      rent: '4월 월세와 관리비 ' + Life.won(amount) + ' ' + due + '까지 입금 부탁드립니다.',
      loan: '[학자금 대출 상환 안내]\n이번 달 상환액 ' + Life.won(amount) + '\n납입일 ' + due
    }[id];
    return { from: BILL[id].from, preview: body.replace(/\n/g, ' ').slice(0, 26), body: body };
  }
  // 휴대폰 요금과 학자금은 납부일에 통장에서 자동이체로 빠져나가고, 잔액이 모자라면 출금되지 않는다.
  // 월세는 집주인 계좌로 직접 보낸다.
  var MONEY = {
    autoOut: function (id, amount, left) { return '[자동이체 출금]\n' + BILL[id].name + ' ' + Life.won(amount) + '\n잔액 ' + Life.won(left); },
    autoFail: function (id, amount) { return '[자동이체 미출금]\n잔액이 부족해 ' + BILL[id].name + ' ' + Life.won(amount) + '이 출금되지 않았습니다.'; },
    rentDay: function (amount, wallet, pending) { return '오늘은 월세 날이다. 월세와 관리비 ' + Life.won(amount) + ', 통장에는 ' + Life.won(wallet) + '. 수수료 ' + Life.won(pending) + '은 5/8에야 들어온다.'; },
    rentMsg: '오늘 월세 날이에요. 확인 부탁드립니다.',
    cashHint: '모자란 돈은 카드 현금서비스로 당겨 올 수 있다. 대신 이자가 붙는다.',
    pay: '지금 보내 드릴게요.',
    defer: '죄송한데 5/8까지만 기다려 주실 수 있을까요?',
    cashSend: '오늘 안으로 보내 드릴게요.',
    cash: '현금서비스를 받아 넣는다',
    leave: '그냥 둔다',
    deferText: { from: '집주인', body: '네, 8일까지는 기다릴게요. 그 뒤로는 어렵습니다.' },
    cashNote: '카드 현금서비스로 30만 원을 받았다. 다음 카드값에 이자까지 붙어서 나간다.',
    late: '이대로면 연체다. 5/8에 연체료를 더해 내야 한다.',
    cashSms: function (n) { return '[카드 현금서비스]\n' + Life.won(n) + '이 입금되었습니다.\n이자는 다음 카드 결제일에 함께 청구됩니다.'; }
  };
  function statement(s, p) {
    var l = [{ label: '4월 계약 수수료', amount: p.gross }];
    if (p.settle) l.push({ label: '신입 정착지원금', amount: p.settle });
    l.push({ label: '사업소득세 3.3%', amount: -p.tax });
    return l;
  }
  var MARK_NOTE = { sneeze: '고양이 털 알레르기가 있으심', cat: '고양이를 키우심. 고양이 이야기 좋아하심', clock: '점심시간에 짬 내서 오시는 분. 오래 걸리면 안 됨', doubt: '꼼꼼하게 따져 보시는 분. 설명을 다 들으셔야 함', none: '' };
  var CONSULT = { greet: '안녕하세요.', slow: '음... 시간이 좀 걸리네요.', lost: '음... 생각해 볼게요.' };
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
      if (s.contracts >= Life.GOAL) tips.push('기준 실적은 채웠어요. 정착지원금은 5월 8일 수수료랑 같이 들어가요.');
      else tips.push('지금 ' + s.contracts + '건이에요. 5월 8일까지 ' + left + '건 남았어요.');
      tips.push('수수료는 계약이 유지돼야 받아요. 무리하게 권한 계약은 금방 취소돼요.');
      tips.push('고객 메모는 집 노트북으로 보냈어요. 읽어 보면 어떤 상품을 찾는지 미리 알 수 있어요.');
      tips.push('피곤하면 하품이 나와요. 일찍 자는 것도 일이에요.');
    } else {
      if (s.fur > 0 && !s.owned.roller) tips.push('소매에 아직 털 있어요. 돌돌이는 역 앞 슈퍼에 있어요.');
      if (s.smell > 0 || (s.today && s.today.notes && s.today.notes.indexOf('smell') >= 0)) tips.push('내일은 고양이 화장실 꼭 치우고 나와요. 냄새는 고객님이 제일 먼저 알아요.');
      tips.push('고객님 말씀 중에 걱정이랑 예산은 꼭 노트에 적어요. 설계할 때 그거 보고 해요.');
      tips.push('청약서에 예라고 하신 건 그대로 적어요. 해피콜에서 다 물어봐요.');
      tips.push('이미 보험이 있는 분께는 비어 있는 보장만 채워 드려요. 갈아타게 하면 승환 점검에 걸려요.');
      tips.push('고양이 키우는 고객님한테는 털이 오히려 반가운 얘깃거리예요.');
      tips.push('저녁에 늦게 자면 다음 날 상담 때 하품 나와요. 저도 그랬어요.');
    }
    var key = who + 'Tip', n = s.seen[key] || 0;
    s.seen[key] = n + 1;
    return [{ who: who, text: tips[n % tips.length] }];
  }
  function goalReached(s) {
    return [
      { who: 'lead', text: s.me + ' 씨! 방금 계약으로 ' + s.contracts + '건이에요. 첫 달 기준 ' + Life.GOAL + '건 달성!' },
      { who: 'peer', text: '와, 벌써요? 축하해요!' },
      { who: 'lead', text: '정착지원금은 5월 8일에 수수료랑 같이 들어가요. 그때까지 계약이 취소되지 않게 잘 챙겨요.' }
    ];
  }
  // 집 냉장고에 붙여 둔 돌봄 메모. 검은 화면이 아니라 종이 한 장으로 보여 준다.
  // 냉장고에 붙여 둔 돌봄 메모. 한 번에 다 알려 주지 않고, 그 일이 처음 생기는 날 한 줄씩 늘어난다.
  var CARE_ROWS = [
    { from: 0, icon: 'bowl', text: '밥은 아침저녁 두 번. 굶기면 마음이 준다.' },
    { from: 0, icon: 'drop', text: '물은 매일 새로. 그릇이 마르면 마음이 준다.' },
    { from: 0, icon: 'mouse', text: '쥐돌이로 놀아 주기. 안 놀면 밤에 문 앞에서 운다.' },
    { from: 0, icon: 'zzz', text: '나는 11시 전에 자기. 늦을수록 체력이 덜 찬다.' },
    { from: 1, icon: 'rice', text: '나도 저녁 먹기. 굶고 자면 다음 날 체력이 준다.' },
    { from: 1, icon: 'camera', text: '반짝이는 순간은 휴대폰으로 남겨 두기.' },
    { from: 2, icon: 'poop', text: '똥은 출근 전에 치우기. 안 치우면 옷에 냄새가 밴다.' },
    { from: 2, icon: 'clock', text: '모래는 나흘에 한 번 새로. 떨어지면 똥도 못 퍼낸다.' },
    { from: 2, icon: 'fur', text: '바닥 털은 빗자루로. 쌓이면 정장에 묻는다.' },
    { from: 4, icon: 'paw', text: '먼지 발자국은 대걸레로. 쌓이면 밤새 재채기한다.' },
    { from: 4, icon: 'heart', text: '습식은 비싸지만 먹을 때마다 마음 +1.' }
  ];
  function careNote(cat, day, seenDay) {
    var d = day === undefined ? 99 : day, old = seenDay === undefined ? 99 : seenDay;
    return {
      title: j(cat, 'of') + ' 하루',
      rows: CARE_ROWS.filter(function (r) { return r.from <= d; }).map(function (r) { return { icon: r.icon, text: r.text, fresh: r.from > old }; })
    };
  }
  function careFresh(day, seenDay) { return CARE_ROWS.some(function (r) { return r.from <= day && r.from > seenDay; }); }
  function groupOffer(s) {
    return [{ who: 'lead', text: s.me + ' 씨, 식당 사장님 한 분이 직원 단체보험을 알아보신대요. 문자 보냈다던데 확인해 봐요.' }];
  }
  function evaluation(s) {
    var c = s.contracts, pass = c >= Life.GOAL;
    return pass ? [
      { who: 'lead', text: '첫 달 ' + c + '건. 기준선을 넘겼네요.' },
      { who: 'lead', text: '축하해요, ' + s.me + ' 씨. 정착지원금도 오늘 같이 들어가요.' }
    ] : [
      { who: 'lead', text: '첫 달 ' + c + '건이에요. 기준선까지 ' + (Life.GOAL - c) + '건 모자라서 정착지원금은 이번엔 안 나와요.' },
      { who: 'lead', text: '수수료는 계약한 만큼 들어가요. 다음 달에 다시 해 봐요.' }
    ];
  }

  // ---------- 둘이라서: 한 달의 사건 ----------
  // 기(4/13~15) 둘이라 무겁다, 승(4/16~20) 쌓이다가 풀린다, 전(4/21~23) 잘될수록 멀어진다, 결(4/24) 다시 비.
  // 사건은 꼭 일어나고, 플레이어의 손이 그 결과만 바꾼다. 설명하는 말은 줄이고 장면과 손짓으로 보여 준다.
  var BEAT = {
    meal: [{ who: 'me', text: '배고프다... 나도 뭘 좀 먹어야지.' }],
    // 사진으로 남기고 싶은 순간을 처음 본 날
    moment: {
      suit: function (s) { return [{ who: 'me', text: '내 정장 위에서 자고 있네.' }, { who: 'me', text: '털 다 묻겠다... 그래도 이건 찍어 둬야지.' }]; },
      sun: function (s) { return [{ who: 'me', text: '볕 드는 자리는 귀신같이 안다니까.' }]; },
      box: function (s) { return [{ who: 'me', text: '반찬은 냉장고에 넣었고, 상자는 ' + j(s.cat, 'bare') + ' 차지네.' }]; }
    },
    knead: function (s) { return [{ who: 'narr', text: '새벽 다섯 시. 얼굴 위에 말랑한 발이 꾹, 꾹.' }]; },
    kneadPet: function (s) { return [{ who: 'narr', text: j(s.cat, 'subject') + ' 골골거린다. 다시 잠들기는 글렀다.' }]; },
    kneadPush: function (s) { return [{ who: 'narr', text: '이불을 머리끝까지 덮었다. 발이 멈췄다.' }]; },
    storm: [
      { who: 'peer', text: '오늘 밤에 천둥 친대요. 고양이들은 천둥을 엄청 무서워해요.' },
      { who: 'peer', text: '창문 커튼을 쳐 주면 좀 나아요.' }
    ],
    friday: function (s) { return [{ who: 'narr', text: s.contracts < 5 ? '금요일. 실적 그래프에서 내 칸이 제일 짧다. 지점장님은 아무 말 없이 다음 사람으로 넘어갔다.' : '금요일. 첫 주가 끝났다.' }]; },
    dinnerText: { from: '동기 단톡', time: '오후 5:52', preview: '금요일인데 다 같이 저녁 먹고 가요!',
      body: '금요일인데 다 같이 저녁 먹고 가요!\n\n제 친구가 여행자보험 알아본대서 소개해 줄게요 ㅎㅎ', yes: '갈게요!', no: '오늘은 먼저 갈게요' },
    alarmCat: function (s) { return [{ who: 'narr', text: '알람이 울리지 않았다. 대신 얼굴 위에 말랑한 발이 꾹, 꾹.' }, { who: 'me', text: '...7시 40분. 고마워, ' + j(s.cat, 'call') + '.' }]; },
    alarmLate: function (s) { return [{ who: 'narr', text: '알람이 울리지 않았다.' }, { who: 'me', text: '8시 20분...?! 늦었다!' }]; },
    overtime: function (s) { return [{ who: 'lead', text: '첫 달 마감 전이니까요. 남을 사람은 남아서 한 건 더 해 봐요.' }, { who: 'me', text: '(집에서 ' + j(s.cat, 'subject') + ' 기다릴 텐데.)' }]; },
    waitedAsleep: function (s) { return [{ who: 'narr', text: j(s.cat, 'subject') + ' 현관 매트 위에서 웅크린 채 잠들어 있었다.' }]; },
    lateHome: function (s) { return [{ who: 'narr', text: j(s.cat, 'subject') + ' 현관에서 한참 기다린 얼굴이다.' }]; },
    prep: function (s) { return [{ who: 'me', text: '내일 발표 준비만 하고 자자.' }]; },
    onKeys: function (s) { return [{ who: 'narr', text: '타닥. ' + j(s.cat, 'subject') + ' 자판 위에 앉았다.' }]; },
    prepWork: function (s) { return [{ who: 'narr', text: j(s.cat, 'object') + ' 옆으로 내려놓았다. 슬라이드가 하나씩 채워진다.' }, { who: 'narr', text: j(s.cat, 'subject') + ' 등을 돌리고 앉았다.' }]; },
    prepLid: function (s) { return [{ who: 'narr', text: '노트북을 덮었다.' }, { who: 'me', text: '그래. 오늘은 너랑 놀자.' }]; },
    rain: function (s) { var l = [{ who: 'narr', text: '돌아오는 길, 그날처럼 비가 온다.' }]; if (s.fur > 0) l.push({ who: 'me', text: '소매에 털 한 가닥이 남아 있다. ...그냥 두자.' }); return l; },
    home: function (s) {
      return s.hearts >= 3 ? [{ who: 'narr', text: j(s.cat, 'subject') + ' 현관에서 기다리고 있었다.' }, { who: 'narr', text: '오늘은 내 밥도 차렸다. 둘이 먹는 저녁.' }]
        : [{ who: 'narr', text: j(s.cat, 'subject') + ' 소파 위에서 고개만 들었다.' }, { who: 'narr', text: '오늘은 내 밥도 차렸다. 마주 앉아 먹는 건 나 혼자였다.' }];
    }
  };

  // ---------- 동네 사람들 (v7) ----------
  // 옆집 할머니, 입사 동기 지안, 슈퍼 사장님. 처음 마주치는 순간, 내미는 손, 청하는 손.
  var PEOPLE = {
    // 4/14 밤: 고양이 우는 소리 때문에 옆집에서 문을 두드린다
    knock: {
      sound: '똑똑똑. 누가 현관문을 두드린다.',
      open: function (s) { return [
        { who: 'grandma', text: '옆집 사는 사람이야. 요 며칠 밤마다 애기 우는 소리가 나서 와 봤어.' },
        { who: 'grandma', text: '고양이지? 새벽에 그렇게 울면 나도 잠을 못 자.' }
      ]; },
      bow: function (s) { return [
        { who: 'me', text: '죄송합니다. 제가 이번 주부터 출근을 해서, 낮에 혼자 있다 보니 밤에 우나 봐요. 조심할게요.' },
        { who: 'grandma', text: '...그래. 우리 영감 살아 있을 때는 개를 키웠어. 짐승은 혼자 두면 울어.' },
        { who: 'grandma', text: '방문 닫지 말고 같이 자 봐. 그럼 덜 울 거야.' }
      ]; },
      shut: function (s) { return [{ who: 'narr', text: '고개만 까딱하고 문을 닫았다. 복도에서 혀 차는 소리가 들리다가 멀어졌다.' }]; }
    },
    // 4/16 저녁: 옆집 택배가 우리 집 앞에 와 있다
    parcel: {
      notice: [{ who: 'narr', text: '문 앞에 놓여 있던 택배 상자를 들고 들어왔다. 받는 사람이 302호다.' }, { who: 'me', text: '옆집 거네. 잘못 왔나 보다.' }],
      met: function (s) { return [
        { who: 'grandma', text: '아이고, 그게 거기 가 있었어? 고마워.' },
        { who: 'grandma', text: '들어와서 귤이라도 하나 먹고 가.' },
        { who: 'me', text: '괜찮아요. ' + j(s.cat, 'subject') + ' 기다려서요.' },
        { who: 'grandma', text: '그래, 어서 가 봐.' }
      ]; },
      // 4/14에 문을 닫아 버린 뒤 처음 마주 선 자리
      stranger: function (s) { return [
        { who: 'grandma', text: '아이고, 그게 거기 가 있었어? ...고마워.' },
        { who: 'me', text: '저번엔 죄송했어요. 일을 막 시작해서 저도 정신이 없었어요.' },
        { who: 'grandma', text: '...그래. 처음엔 다 그래. 방문 열어 두고 같이 자 봐. 그럼 덜 울 거야.' }
      ]; },
      // 그날 밤 못 갖다드리면 다음 날 아침
      left: [{ who: 'me', text: '어젯밤에 못 갖다드린 택배... 나가는 길에 302호 문 앞에 두고 가자.' }]
    },
    // 가까워진 뒤 어느 저녁: 문고리에 걸린 반찬통
    dish: {
      notice: [{ who: 'narr', text: '현관문 손잡이에 봉지가 걸려 있다. 반찬통에 멸치볶음이 꽉 차 있다.' }, { who: 'narr', text: '쪽지가 붙어 있다. 「많이 했어. 먹어. -302호」' }],
      eat: [{ who: 'narr', text: '밥에 멸치볶음을 얹어 먹었다. 누가 해 준 반찬은 오랜만이다.' }],
      back: function (s) { return [
        { who: 'grandma', text: '벌써 다 먹었어? 입에 맞았나 보네.' },
        { who: 'me', text: '네, 정말 맛있었어요. 잘 먹었습니다.' }
      ]; }
    },
    // 찾아가 인사드리기 (몇 번째인지에 따라)
    visit: [
      function (s) { return [{ who: 'grandma', text: '왔어? 고양이는 잘 있고?' }, { who: 'me', text: '네, 요즘은 밤에 덜 울어요.' }, { who: 'grandma', text: '다행이네. 짐승도 사람도 혼자 있으면 울어.' }]; },
      function (s) { return [{ who: 'grandma', text: '오늘은 일찍 왔네. 회사는 다닐 만해?' }, { who: 'me', text: '아직 정신없어요.' }, { who: 'grandma', text: '처음엔 다 그래. 밥이나 잘 챙겨 먹어.' }]; },
      function (s) { return [{ who: 'grandma', text: '시골 동생이 사과를 한 상자 보냈어. 두 개 가져가.' }, { who: 'narr', text: '손에 사과 두 알이 들렸다.' }]; },
      function (s) { return [{ who: 'grandma', text: '요새 얼굴이 좀 폈네.' }, { who: 'me', text: '그래요?' }, { who: 'grandma', text: '그래. 처음 봤을 땐 다 죽어 가는 얼굴이더니.' }]; }
    ],
    repaid: { grandma: { who: 'grandma', text: '고양이 밥? 그거 일도 아니야. 또 늦으면 말해.' } },
    // 현관 비밀번호: 가까운 사이가 되면 할머니가 먼저 꺼내는 말 (우리 집 현관은 도어락)
    key: {
      offer: [{ who: 'grandma', text: '혼자 살면서 고양이 키우기 쉽지 않지. 늦는 날 있으면 말해.' }, { who: 'grandma', text: '현관 비밀번호 알려 주면 밥은 내가 줄게.' }],
      give: function (s) { return [{ who: 'me', text: '그럼... 부탁드려도 될까요?' }, { who: 'narr', text: '쪽지에 현관 비밀번호를 적어 드렸다.' }, { who: 'grandma', text: '그럼. 이웃 좋다는 게 뭐야. 늦는 날엔 문자 해.' }, { who: 'narr', text: '할머니 번호를 휴대폰에 저장했다.' }]; },
      keep: function (s) { return [{ who: 'me', text: '괜찮아요. 제가 어떻게든 해 볼게요.' }, { who: 'grandma', text: '그래. 마음 바뀌면 말해.' }]; }
    },
    // 늦게 들어온 밤, 할머니가 다녀간 흔적
    fedNote: function (s) { return [
      { who: 'narr', text: '밥그릇은 깨끗이 비어 있고, 물그릇에는 물이 찰랑인다. 신발장 위에 쪽지가 있다.' },
      { who: 'narr', text: '「밥 주고 물 갈아 놨어. 잘 먹더라. -302호」' }
    ]; },
    // 4/13 첫 출근 지하철: 옆에 선 사람이 내 소매의 털을 본다
    train: {
      see: [{ who: 'narr', text: '옆에 선 사람이 자꾸 내 소매를 본다. 손에 든 서류 봉투에 우리 회사 로고가 찍혀 있다.' }],
      talk: function (s) { return [
        { who: 'me', text: '저... 혹시 새솔지점 가세요?' },
        { who: 'mate', text: '네! 오늘 첫 출근이에요. 혹시 같이 위촉되신...?' },
        { who: 'me', text: '네. ' + s.me + (Life.hasBatchim(s.me) ? '이에요.' : '예요.') },
        { who: 'mate', text: '저는 윤지안이에요. 근데 소매에 털이... 고양이 키우세요? 저희 본가에도 있어요.' },
        { who: 'me', text: '아... 네. 겨울에 데려왔어요.' }
      ]; },
      brush: [{ who: 'narr', text: '소매를 털고 창밖을 봤다. 털은 반쯤 남았다.' }]
    },
    // 점심: 지안의 문자 (4/15, 4/21, 5/4)
    lunch: {
      text: function (s, first) { return { from: '지안', time: '오후 12:05', preview: '점심 같이 먹을래요?', body: (first ? '같은 날 위촉된 지안이에요! ' : '') + '점심 같이 먹을래요? 지점 앞 김치찌개집이요.', yes: '좋아요, 갈게요', no: '오늘은 도시락 먹을게요' }; },
      after: [
        [{ who: 'narr', text: '김치찌개 9,000원. 지안도 이번 달 목표가 열두 건이라고 했다. 나랑 같았다.' }],
        [{ who: 'narr', text: '지안은 어제 고객님 앞에서 약관을 거꾸로 펼쳤다고 했다. 둘이서 한참 웃었다.' }],
        [{ who: 'narr', text: '지안이 본가 고양이 사진을 보여 줬다. 나도 휴대폰을 꺼냈다.' }]
      ]
    },
    // 4/27 저녁: 실적이 모자란 지안
    refer: {
      text: { from: '지안', time: '오후 8:10', preview: '이번 달 기준 실적까지 두 건 남았는데...', body: '이번 달 기준 실적까지 두 건 남았는데 다음 주가 마감이라 ㅠㅠ\n혹시 소개해 줄 만한 분 있으면 부탁해요...', yes: '내일 만나는 고객님 한 분 소개해 줄게요', no: '저도 빠듯해서요. 힘내요!' },
      thanks: { from: '지안', time: '오후 8:16', preview: '진짜요? 고마워요...', body: '진짜요? 고마워요. 이건 꼭 갚을게요.' },
      gave: [{ who: 'narr', text: '내일 오기로 한 고객님 한 분을 지안에게 넘겼다. 내 실적 그래프에는 스티커가 하나 덜 붙는다.' }]
    },
    // 부탁할 때 쓰는 글. first: 처음 써 둔 글, again: 보내기를 누르는 동안 지웠다가 남은 글, final: 보낸 글
    ask: {
      cat: {
        grandma: function (s) { return { first: '할머니, 오늘 늦을 것 같은데 고양이 밥 좀', again: '할머니, 오늘', final: '할머니, 오늘 제가 늦을 것 같은데... 혹시 ' + j(s.cat, 'bare') + ' 저녁밥 좀 부탁드려도 될까요?' }; },
        reply: { grandma: '그래, 걱정 말고 일 봐. 사료는 늘 두던 데 있지?' }
      },
      cover: {
        mate: function (s) { return { first: '지안 씨, 저 오늘 조금 늦을 것 같아요', again: '지안 씨, 저', final: '지안 씨, 저 오늘 조금 늦을 것 같아요. 첫 고객님 오시면 조금만 기다려 주시라고 전해 줄 수 있어요?' }; },
        reply: { mate: '네네, 걱정 말고 조심히 와요! 차 한 잔 드리고 있을게요.' }
      },
      work: {
        mate: function (s) { return { first: '지안 씨, 혹시 오늘 야근 같이', again: '지안 씨, 혹시', final: '지안 씨, 혹시 오늘 청약서 정리만 같이 해 줄 수 있어요? 집에 고양이가 혼자 있어서요.' }; },
        reply: { mate: '그래요, 저도 어차피 남아요. 서류는 제가 정리할게요. 상담만 해요!' }
      },
      money: {
        boss: function (s) { return { first: '사장님, 죄송한데 혹시', again: '사장님', final: '사장님, 정말 죄송한데요... 8일에 수수료 들어오면 바로 갚을게요. 10만 원만 빌려주실 수 있을까요?' }; },
        reply: { boss: '그래, 지금 보내 줄게. 갚는 건 들어오면 해.' }
      }
    },
    // 부탁할 일이 생겼을 때 하는 혼잣말
    think: {
      cat: function (s) { return [{ who: 'me', text: '오늘은 늦게 들어간다. ' + j(s.cat, 'bare') + ' 저녁은...' }]; },
      catNobody: function (s) { return [{ who: 'narr', text: '연락처를 끝까지 내려 봐도, 부탁할 사람이 없다.' }]; },
      cover: [{ who: 'me', text: '이대로면 첫 고객님이 기다리다 가실 텐데...' }],
      work: [{ who: 'me', text: '혼자 다 하면 10시는 넘겠다...' }],
      money: function (s, name, amount) { return [{ who: 'me', text: name + ' ' + Life.won(amount) + '... 모자란다.' }, { who: 'me', text: '사장님께 부탁드려 볼까.' }]; }
    },
    // 부탁을 들어준 뒤
    helped: {
      cover: [{ who: 'narr', text: '지점에 도착하니 첫 고객님이 지안과 차를 마시며 기다리고 계셨다.' }],
      work: [{ who: 'narr', text: '지안이 청약서를 정리해 준 덕분에 한 시간 일찍 나왔다.' }],
      money: [{ who: 'narr', text: '사장님이 10만 원을 보내 주셨다. 5/8에 갚아야 할 돈이 하나 늘었다.' }]
    },
    // 동네 지도에서 처음 길을 고를 때
    mapHint: [{ who: 'me', text: '어디로 갈까.' }]
  };

  // ---------- 엄마 (v7) ----------
  // 휴대폰 연락처 이름 (대화방 이름과 같다)
  var CONTACT = { mom: '엄마', mate: '지안', grandma: '옆집 할머니', boss: '행복슈퍼 사장님' };
  // 프롤로그 전부터 와 있던 엄마 문자 37개. 하나도 답하지 않은 채 쌓였다. [년, 월, 일, 시각, 글]
  var MOM_UNREAD = [
    [2025, 9, 15, '오후 8:12', '추석에 내려오니? 기차표 엄마가 끊어 줄까'],
    [2025, 10, 4, '오전 9:30', '바쁘면 안 와도 된다. 송편 얼려서 보낼게'],
    [2025, 10, 6, '오후 6:05', '추석 잘 보내라. 밥 꼭 챙겨 먹고'],
    [2025, 10, 13, '오후 9:41', '택배 받았니? 송편이랑 김치 넣었다'],
    [2025, 10, 20, '오후 9:15', '감 따서 보낼까'],
    [2025, 10, 27, '오후 10:02', '요즘 날이 차다. 두꺼운 이불 꺼내 덮어라'],
    [2025, 11, 3, '오전 7:50', '아침은 먹었니'],
    [2025, 11, 10, '오후 8:30', '전화 한번 해라. 목소리 좀 듣자'],
    [2025, 11, 13, '오전 8:15', '오늘 수능날이네. 너 시험 보던 날 생각난다'],
    [2025, 11, 17, '오후 8:48', '엄마 휴대폰 바꿨다. 사진이 잘 나오네 ㅎㅎ'],
    [2025, 11, 21, '오후 9:12', '바쁘구나. 답 안 해도 된다'],
    [2025, 11, 30, '오후 7:44', '김장했다. 김치 보낼까'],
    [2025, 12, 5, '오후 10:30', '보일러 아끼지 말고 틀어라. 감기 걸린다'],
    [2025, 12, 12, '오전 8:30', '눈 온다더라. 미끄러지지 않게 조심해라'],
    [2025, 12, 17, '오후 8:05', '엄마 꿈에 네가 나왔다. 별일 없지?'],
    [2025, 12, 24, '오후 9:00', '크리스마스 이브네. 케이크라도 하나 사 먹어라'],
    [2025, 12, 31, '오후 11:58', '올 한 해 고생 많았다'],
    [2026, 1, 1, '오전 12:03', '새해 복 많이 받아라. 엄마는 너 건강한 게 제일이다'],
    [2026, 1, 8, '오후 7:12', '많이 춥지. 수도 얼지 않게 물 조금 틀어 놓고 자라'],
    [2026, 1, 13, '오후 10:40', '잘 자라'],
    [2026, 1, 19, '오후 9:50', '목소리 듣고 싶다'],
    [2026, 1, 28, '오후 6:40', '귤 한 상자 사 놨다. 오면 가져가라'],
    [2026, 2, 5, '오후 8:20', '설에는 내려오니?'],
    [2026, 2, 10, '오후 3:10', '떡국 떡 보냈다. 설에 꼭 끓여 먹어라'],
    [2026, 2, 12, '오후 9:33', '안 와도 괜찮다. 엄마 서운하지 않다'],
    [2026, 2, 17, '오전 9:00', '새해 복 많이 받아라'],
    [2026, 2, 21, '오후 6:00', '엄마가 전화했었다'],
    [2026, 2, 26, '오후 10:11', '요즘은 어떻게 지내니'],
    [2026, 3, 3, '오전 8:00', '3월인데도 아직 쌀쌀하다. 옷 따뜻하게 입고 다녀라'],
    [2026, 3, 11, '오후 9:05', '답 안 해도 되니까 읽기만 해라'],
    [2026, 3, 15, '오후 8:12', '이번 주는 좀 따뜻하다더라'],
    [2026, 3, 20, '오후 7:30', '엄마 요즘 노래 교실 다닌다 ㅎㅎ'],
    [2026, 3, 24, '오후 7:20', '날이 풀려서 마당에 상추 모종 심었다'],
    [2026, 3, 27, '오후 9:40', '밥은 먹고 다니니'],
    [2026, 4, 2, '오후 8:15', '동네 개천에 벚꽃 폈다. 너 어릴 때 거기서 사진 찍은 거 기억나니'],
    [2026, 4, 9, '오후 9:00', '보고 싶다'],
    [2026, 4, 11, '오후 6:30', '주말인데 뭐 하니']
  ];
  // 받지 않은 엄마 전화 [년, 월, 일, 시각]
  var MOM_MISSED = [[2026, 1, 1, '오전 12:05'], [2026, 2, 17, '오전 9:02'], [2026, 2, 21, '오후 5:52'], [2026, 3, 27, '오후 9:42']];
  // 엄마가 고양이를 아는지: 고양이 사진을 한 장이라도 받았으면 안다
  function catKnown(s) { return (s.sent || []).some(function (e) { return e.who === 'mom'; }); }
  var MOM = {
    unread: MOM_UNREAD, missed: MOM_MISSED,
    // 4/17 금요일 밤 (아직 아무 답도 안 했으면 늘 하던 말, 답을 했으면 조금 더 아는 말)
    // 아직 한 번도 답하지 않았으면(bond 0) 늘 하던 말에 짧은 답 하나, 이미 닿았으면 조금 더 아는 말에 답 둘. 답하지 않고 닫아도 된다.
    text417: function (s, bond) {
      if (bond < 1) return '요즘은 어떻게 지내니. 밥은 먹고 다니고?';
      return s.mom.knows ? '금요일이네. 회사는 다닐 만하니? 밥은 먹고 다니고?' : catKnown(s) ? '금요일이네. 밥은 먹고 다니니? 고양이 사진 또 보내라 ㅎㅎ' : '금요일이네. 밥은 먹고 다니니?';
    },
    reply417: function (bond) { return bond < 1 ? ['응, 괜찮아.'] : ['응, 잘 먹고 다녀.', '그냥 그래.']; },
    // 내 답에 엄마가 다시 보내는 문자 (답하지 않았으면 없다)
    back417: function (s, bond, pick) {
      if (pick == null) return null;
      if (bond < 1) return '...그래. 답장해 줘서 고맙다. 밥 잘 챙겨 먹어라';
      return pick === 0 ? '그래야지 ㅎㅎ 주말엔 푹 쉬어라' : '그래. 그런 날도 있다. 오늘은 일찍 자라';
    },
    after417: function (s, bond, pick) {
      var l = bond < 1 ? (pick == null ? '답장 칸을 한참 보다가 휴대폰을 엎어 놓았다.' : '몇 번을 썼다 지우고, 그 한 줄만 보냈다.') : (pick === 1 ? '괜찮다고 하지 않은 건 처음이다.' : null);
      var out = []; if (l) out.push({ who: 'narr', text: l });
      out.push({ who: 'narr', text: j(s.cat, 'subject') + ' 말없이 옆에 와서 앉았다.' });
      return out;
    },
    // 4/28 화요일 밤 (아직 한 번도 답하지 않았으면 답할 말이 뜨지 않는다)
    text428: '어버이날에 내려오니? 바쁘면 안 와도 된다',
    reply428: ['그날 일해서 못 가. 대신 전화할게.', '아직 잘 모르겠어.'],
    back428: ['그래. 전화만 해도 엄마는 좋다', '그래. 바쁘면 안 와도 된다'],
    // 사진을 받은 엄마의 답. r: Life.sendPhoto의 결과 (days: 엄마에게 사진을 보낸 날 수)
    photoReply: function (s, r, fromParcel) {
      if (r.today) return [['이쁘다 ㅎㅎ', '이것도 이쁘네', '엄마 이거 저장했다'][(r.days + s.sent.length) % 3]];
      var k = r.kind;
      if (k === 'box') return [fromParcel ? '엄마가 보낸 상자에 들어가 있네 ㅎㅎ 반찬보다 상자가 더 맘에 들었나 보다' : '상자에 쏙 들어갔네 ㅎㅎ 고양이들은 상자를 그렇게 좋아한다더라'];
      if (k === 'sun') return ['햇볕 쬐는 거 보니 엄마도 따뜻하다. 너도 주말엔 볕 좀 쬐어라'];
      if (k === 'suit') return [s.mom.knows ? '옷 위에서 자네 ㅎㅎ 털 붙겠다. 출근할 때 잘 털고 가라' : '옷 위에서 자네 ㅎㅎ 털 붙겠다'];
      if (k === 'room') return ['이건 뭐니? 고양이는 어디 갔니 ㅎㅎ'];
      if (r.days <= 2) return ['또 보냈네 ㅎㅎ 고양이가 너를 많이 따르나 보다. 너도 밥 잘 챙겨 먹어라'];
      if (r.days === 3) return ['엄마가 사진 보고 또 봤다. 표정이 꼭 너 어릴 때 같다 ㅎㅎ'];
      if (r.days === 4) return ['너는 어떠니. 요즘 잠은 잘 자니? 엄마는 노래 교실 다니는 재미로 산다 ㅎㅎ'];
      return ['사진 볼 때마다 엄마도 기분이 좋다. 힘든 일 있으면 엄마한테 말해라. 엄마는 언제나 네 편이다'];
    },
    // 택배가 오는 날: 모레면 '모레쯤', 주말을 넘기면 그 요일
    parcelText: function (s, day) { return '반찬 좀 보냈다. ' + (day === s.day + 2 ? '모레쯤' : Life.DAYS[day].wd + '요일쯤') + ' 도착할 거다. 오면 바로 냉장고에 넣어라'; },
    declined: '바쁘구나. 고양이 참 이쁘다. 사진 또 보내라',
    // 처음 사진을 보낸 날, 바로 걸려 오는 전화
    firstCall: {
      open: function (s) { return [
        { who: 'mom', text: '...여보세요? 너니?' },
        { who: 'me', text: '...응, 엄마.' },
        { who: 'mom', text: '아이고, 이게 얼마 만이야. 사진 보고 깜짝 놀랐다. 고양이 키우니?' },
        { who: 'me', text: '응. 겨울에 비 오는 날 데려왔어.' },
        { who: 'mom', text: '그랬구나. 이름은?' },
        { who: 'me', text: s.cat + '.' },
        { who: 'mom', text: s.cat + '... 이쁘네. 너는? 밥은 먹고 다니니? 요즘은 뭐 하고 지내?' }
      ]; },
      picks: ['보험 회사 다녀. 설계사 일 시작했어.', '그냥... 이것저것 해.'],
      told: [{ who: 'mom', text: '그래? 잘됐다... 처음이라 힘들 텐데, 몸 조심하고.' }],
      hid: [{ who: 'mom', text: '그래. 말하기 싫으면 안 해도 된다. 밥만 잘 챙겨 먹어라.' }],
      close: function (s, parcel) {
        var l = [];
        if (parcel) l.push({ who: 'mom', text: '반찬 좀 보내 줄게. 주소는 그대로지?' }, { who: 'me', text: '...응.' });
        l.push({ who: 'mom', text: '사진 또 보내라. 엄마는 그거면 된다.' });
        return l;
      }
    },
    // 내가 거는 전화 (하루 한 번)
    chat: [
      function (s) {
        var l = [{ who: 'mom', text: '웬일이야? 무슨 일 있니?' }, { who: 'me', text: '아니, 그냥.' }];
        if (catKnown(s)) l.push({ who: 'mom', text: '그래... 목소리 들으니 좋다. ' + j(s.cat, 'bare') + '는 잘 있고?' }, { who: 'me', text: '응. 지금 옆에 있어.' }, { who: 'mom', text: '그래. 너도 일찍 자라.' });
        else l.push({ who: 'mom', text: '그래... 목소리 들으니 좋다.' }, { who: 'mom', text: '일찍 자라.' });
        return l;
      },
      function (s) { return [{ who: 'mom', text: '밥은 먹었니?' }, { who: 'me', text: s.myMeal ? '응, 먹었어.' : '이제 먹으려고.' }, { who: 'mom', text: '늦게 먹지 말고. 엄마는 오늘 노래 교실 다녀왔다.' }]; },
      function (s) { return [{ who: 'mom', text: s.mom.knows ? '요즘 회사는 어때?' : '요즘 어떻게 지내?' }, { who: 'me', text: '그냥... 그럭저럭.' }, { who: 'mom', text: '그래. 그럭저럭이면 됐다. 무리하지 말고.' }]; }
    ],
    // 내가 건 전화에서 가까워졌을 때: 반찬을 부친다고 한다
    parcelCall: [{ who: 'mom', text: '참, 반찬 좀 보내 줄게. 주소는 그대로지?' }, { who: 'me', text: '...응. 고마워.' }],
    // 가까워지기 전에는 걸다가 끊는다
    hesitate: [{ who: 'narr', text: '통화 버튼을 눌렀다가, 신호가 가기 전에 끊었다.' }],
    // 반찬 택배
    parcelNotice: [{ who: 'narr', text: '문 앞에 놓여 있던 상자를 들고 들어왔다. 보내는 사람: 엄마.' }],
    parcelOpen: [{ who: 'narr', text: '김치, 멸치볶음, 장조림. 아이스팩은 반쯤 녹아 있다.' }, { who: 'narr', text: '반찬통 사이에 쪽지가 끼워져 있다. 「밥 꼭 챙겨 먹어라. -엄마」' }],
    parcelGot: '잘 받았니? 김치는 금방 시니까 먼저 먹어라',
    eat: [{ who: 'narr', text: '엄마 반찬을 꺼내 밥을 먹었다. 집에서 먹던 맛이다.' }],
    // 5/8 어버이날
    morning: function (s) { return [{ who: 'narr', text: '오늘은 어버이날이다.' }, { who: 'me', text: s.mom.promised ? '전화하겠다고 했지.' : '...엄마한테 전화해 볼까.' }]; },
    parentsDay: {
      // talked: 오늘 전에 엄마와 통화한 적이 있는지
      open: function (s, bond, talked) {
        if (bond < 1) return [{ who: 'mom', text: '...여보세요? 너니? 무슨 일 있니?' }, { who: 'me', text: '아니. 오늘 어버이날이잖아.' }, { who: 'mom', text: '...그래. 전화해 줘서 고맙다.' }, { who: 'mom', text: '요즘은 어떻게 지내?' }];
        return [{ who: 'mom', text: talked ? '여보세요? 응, 엄마야.' : '여보세요? 아이고, 웬일로 전화를 다 하고.' }, { who: 'me', text: '엄마, 오늘 어버이날이잖아. 늘 고마워.' }, { who: 'mom', text: '고맙긴. ' + (s.mom.knows ? '회사는 어때? 힘들지는 않고?' : '요즘은 어때? 지낼 만하니?') }];
      },
      picks: function (bond) { return bond >= 2 ? ['응, 괜찮아.', '사실... 좀 힘들었어.'] : ['응, 괜찮아.']; },
      fine: function (s, bond) { return bond < 1 ? [{ who: 'mom', text: '그래. 괜찮으면 됐다.' }, { who: 'narr', text: '괜찮다는 말이 오늘도 먼저 나왔다.' }] : [{ who: 'mom', text: '그래. 너는 늘 괜찮다고 하더라.' }, { who: 'mom', text: '엄마는 네 목소리 들으니 됐다.' }]; },
      hard: function (s) { return [{ who: 'mom', text: '...그랬구나.' }, { who: 'mom', text: '말해 줘서 고맙다. 엄마는 그 말이 듣고 싶었다.' }, { who: 'me', text: '...응.' }, { who: 'mom', text: '힘들면 언제든 전화해라.' + (catKnown(s) ? ' ' + j(s.cat, 'to') + '도 안부 전하고.' : '') }]; }
    },
    noCall: '오늘 바쁘지? 엄마는 괜찮다. 밥 잘 챙겨 먹어라',
    catKnown: catKnown
  };

  var NAMES = { me: null, lead: '지점장님', peer: '선배', cat: null, owner: '슈퍼 사장님', grandma: '옆집 할머니', mate: '지안', mom: '엄마' };

  var ENDING = {
    family: { title: '우리 집', body: function (s) { return ['첫 달 기준 실적을 채웠다.', '첫 수수료로 ' + j(s.cat, 'of') + ' 펫보험을 들었다. 계약서 맨 위에 처음으로 우리 집 주소를 적었다.', '천둥 치던 밤도, 서랍 속 아침도 다 지나갔다. 이제 이 집은 우리 집이다.']; } },
    both: { title: '두 몸을 건사했다', body: function (s) { return ['첫 달 기준 실적을 채웠다.', '현관을 열면 오늘도 ' + j(s.cat, 'subject') + ' 앉아 있다.']; } },
    catStays: { title: function (s) { return '실적은 아직, ' + j(s.cat, 'topic') + ' 곁에'; }, body: function (s) { return ['첫 달 실적은 모자랐다.', '그래도 밤마다 ' + j(s.cat, 'subject') + ' 내 옆에서 잔다.']; } },
    soso: { title: '그럭저럭 둘이서', body: function (s) { return ['첫 달 기준 실적을 채웠다.', j(s.cat, 'topic') + ' 가끔 나를 모른 척한다. 그래도 저녁이면 현관에 와 있다.']; } },
    clumsy: { title: '둘 다 아직 서툴다', body: function (s) { return ['첫 달 실적은 모자랐다.', j(s.cat, 'with') + ' 나는 아직 서로에게 서툴다.']; } },
    oneBody: { title: '한 몸만 건사했다', body: function (s) { return ['첫 달 기준 실적을 채웠다.', '집에 오면 ' + j(s.cat, 'subject') + ' 더 이상 현관에 나와 있지 않다.']; } },
    again: { title: '다시 처음부터', body: function (s) { return ['일도, ' + j(s.cat, 'with') + '의 하루도 잘 풀리지 않았다.', '이건 게임이니까, 처음부터 다시 해 볼 수 있다.']; } },
    emptyBowl: { title: '빈 밥그릇', body: function (s) { return ['밥그릇이 너무 자주 비어 있었다.', '어느 날 아침, ' + j(s.cat, 'subject') + ' 열린 창틈으로 나가 슈퍼 앞으로 돌아갔다. 슈퍼 사장님이 밥을 챙겨 준다고 한다.', '이건 게임이니까, 처음부터 다시 해 볼 수 있다.']; } }
  };
  function endingTitle(key, s) { var t = ENDING[key].title; return typeof t === 'function' ? t(s) : t; }
  // 엔딩 글 끝에 붙는 사진첩 한 줄
  function endingArc(key, s) {
    if (key === 'emptyBowl') return null;
    var n = (s.photos || []).length;
    return n ? '휴대폰 사진첩을 넘긴다. 고객 메모 캡처 사이사이에 ' + j(s.cat, 'subject') + ' ' + n + '장.' : '휴대폰 사진첩에는 고객 메모 캡처뿐이다.';
  }
  var GRADE_NAME = { good: 'GOOD ENDING', normal: 'NORMAL ENDING', bad: 'BAD ENDING', hidden: 'HIDDEN ENDING' };
  // 아직 못 본 엔딩 칸에 보이는 귀띔
  var ENDING_HINT = {
    family: '천둥 치던 밤, 서랍 속 아침, 그리고 가득 찬 사진첩...',
    both: '기준 ' + Life.GOAL + '건, 마음 네 칸, 사진 ' + Life.PHOTO_GOOD + '장 이상',
    soso: '기준 ' + Life.GOAL + '건, 그런데 마음이나 사진이 조금 모자라면',
    catStays: '실적은 모자라도 마음은 네 칸 이상',
    clumsy: '실적도 마음도 조금씩 모자라면',
    oneBody: '기준은 채웠지만 마음이 한 칸 이하',
    again: '일도 고양이도 잘 안 풀리면',
    emptyBowl: '밥그릇이 너무 자주 비면'
  };

  // 엔딩 글에 넣을, 실제로 있었던 날 하나
  function memory(s, key) {
    var ev = s.events, pick = null, date = function (d) { return Life.DAYS[d].date; };
    var good = ['lid', 'catWoke', 'curtain', 'drawer', 'catLover', 'firstPhoto', 'groupSigned', 'firstContract', 'together'];
    var bad = ['waitedAsleep', 'moved', 'drawerLate', 'stormAlone', 'lonely', 'scratched'];
    var order = key === 'oneBody' || key === 'again' || key === 'clumsy' || key === 'emptyBowl' ? bad.concat(good) : good;
    for (var i = 0; i < order.length && !pick; i++) for (var k = ev.length - 1; k >= 0; k--) if (ev[k].key === order[i]) { pick = ev[k]; break; }
    if (!pick) return null;
    var c = s.cat;
    var text = {
      lid: '발표 전날 밤, 노트북을 덮고 ' + j(c, 'with') + ' 놀았다.',
      catWoke: '알람이 고장 난 아침, ' + j(c, 'subject') + ' 나를 깨웠다.',
      firstPhoto: '처음으로 ' + j(c, 'of') + ' 사진을 찍었다.',
      waitedAsleep: '야근한 밤, ' + j(c, 'subject') + ' 현관 매트에서 기다리다 잠들었다.',
      moved: '발표 전날 밤, 자판 위의 ' + j(c, 'object') + ' 내려놓았다.',
      groupSigned: '밤 8시, 남아서 단체보험을 계약했다.',
      curtain: '비 오던 밤, 커튼을 쳐 주었다.',
      drawer: '아침에 서랍 속 후드티 위에서 ' + j(c, 'object') + ' 찾았다.',
      drawerLate: j(c, 'subject') + ' 하루 종일 서랍 속에 갇혀 있었다.',
      stormAlone: '천둥 치는 밤, ' + j(c, 'subject') + ' 소파 밑에서 혼자 떨었다.',
      catLover: '고양이를 키우는 고객님이 내 소매의 털을 보고 웃었다.',
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
    // 프롤로그의 겨울을 고양이 쪽에서 다시 본다
    lines.push('작년 겨울. 비가 오던 밤, 슈퍼 앞에서 울었다. 처음 보는 사람이 우산을 기울였다.');
    lines.push('그 사람 방에서 겨울을 났다. 사람은 휴대폰을 보며 자주 한숨을 쉬었다. 나는 그 옆에서 잤다.');
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
      if (ev.indexOf('catWoke') >= 0) parts.push('사람이 안 일어나길래 얼굴을 눌러 깨웠다');
      if (ev.indexOf('waitedAsleep') >= 0) parts.push('현관에서 기다리다 잠들었다');
      if (ev.indexOf('helperFed') >= 0) parts.push('옆집 할머니가 와서 밥을 줬다. 손이 따뜻했다');
      if (ev.indexOf('lid') >= 0) parts.push('따뜻한 상자 위에 앉았더니 사람이 상자를 덮고 놀아 줬다');
      if (ev.indexOf('moved') >= 0) parts.push('따뜻한 상자 위에 앉았는데 사람이 나를 내려놓았다');
      if (d.photos) parts.push('사람이 나를 보고 웃으며 휴대폰을 들었다');
      if (ev.indexOf('kneadPet') >= 0) parts.push('새벽에 얼굴을 꾹꾹 눌렀다. 사람이 쓰다듬어 줬다');
      if (ev.indexOf('kneadPush') >= 0) parts.push('새벽에 얼굴을 눌렀더니 사람이 이불 속으로 숨었다');
      if (d.together) parts.push('사람 옆에서 잤다. 따뜻했다');
      else if (ev.indexOf('scratched') >= 0) parts.push('문을 긁었더니 사람이 깼다');
      else if (ev.indexOf('lonely') >= 0) parts.push('문 앞에서 잤다');
      if (Life.DAYS[d.day].final) parts.push('사람이 비 냄새를 묻히고 왔다. 현관에서 기다렸다');
      if (!parts.length) parts.push(Life.DAYS[d.day].kind === 'work' ? '사람이 아침에 나가서 저녁에 왔다' : '사람이 하루 종일 집에 있었다');
      lines.push(date + '. ' + parts.join('. ') + '.');
    });
    return lines;
  }

  return {
    opening: opening, phone: phone, MOM: MOM, CONTACT: CONTACT, PRODUCT: PRODUCT, SHORT: SHORT, ITEM: ITEM, ITEM_DESC: ITEM_DESC, CLIENT: CLIENT, ORDINAL: ORDINAL,
    MARK_NOTE: MARK_NOTE, COVER: COVER, coverName: coverName, TALK: TALK, QUESTIONS: QUESTIONS, EXPLAIN: EXPLAIN, DESIGN: DESIGN, APPLY: APPLY, SIGN: SIGN, CANCEL: CANCEL, CANCEL_SHORT: CANCEL_SHORT, bossTalk: bossTalk, BILL: BILL, billNotice: billNotice, MONEY: MONEY, statement: statement, officeTip: officeTip, goalReached: goalReached, careNote: careNote, careFresh: careFresh,
    CAUSE: CAUSE, LOST: LOST, HEART: HEART, morningNote: morningNote, catLine: catLine, DAY_INTRO: DAY_INTRO,
    assembly: assembly, senior: senior, seniorSmell: seniorSmell, TUTORIAL: TUTORIAL, CONSULT: CONSULT, leaveOffice: leaveOffice, groupOffer: groupOffer,
    evaluation: evaluation, NAMES: NAMES, PEOPLE: PEOPLE, ENDING: ENDING, endingTitle: endingTitle, endingArc: endingArc, BEAT: BEAT, GRADE_NAME: GRADE_NAME, ENDING_HINT: ENDING_HINT, memory: memory, epilogue: epilogue
  };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = Story;
