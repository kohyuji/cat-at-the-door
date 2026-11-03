/* 이야기 데이터와 조건부 대화. 수치/결과를 변경하지 않는 순수한 읽기 모듈이다. */
var LifeStory = (function () {
  'use strict';

  var days = [
    { date:'9/13', weekday:'일', weekend:true, event:'first', task:'내일 입을 옷과 출근할 가방을 준비한다', deadline:false, eveningHook:'내일은 첫 출근이다. 늘 열려 있던 방문 앞에 새 정장이 걸렸다.' },
    { date:'9/14', weekday:'월', weekend:false, event:'first', task:'인수인계 자료에서 맡은 일을 확인한다', deadline:false, eveningHook:'현관을 열자 발소리가 가까워진다. 가방에는 오늘 받은 자료가 들어 있다.' },
    { date:'9/15', weekday:'화', weekend:false, event:'desk', task:'월간 보고 자료의 표를 정리한다', deadline:false, eveningHook:'노트북을 펼치자 보리가 책상에 올라온다. 자료 옆에는 예전에 함께 쓰던 자리가 남아 있다.' },
    { date:'9/16', weekday:'수', weekend:false, event:'storm', task:'내일 첫 보고에 쓸 근거 자료를 대조한다', deadline:false, eveningHook:'귀갓길부터 비가 굵어졌다. 집에 들어와도 평소의 배웅이 없다.' },
    { date:'9/17', weekday:'목', weekend:false, event:'closet', task:'준비한 자료로 첫 보고를 한다', deadline:true, eveningHook:'거실에 벗어 둔 옷이 있다. 내일 입을 옷과 늘 함께하던 회색 옷의 자리가 눈에 들어온다.' },
    { date:'9/18', weekday:'금', weekend:false, event:'plan', task:'첫 보고의 수정 사항과 다음 주 일정을 확인한다', deadline:false, eveningHook:'가방에 수정 표시가 남은 자료와 다음 주 일정표를 함께 넣었다.' },
    { date:'9/19', weekday:'토', weekend:true, event:'weekend', task:'집의 자리와 미뤄 둔 생활을 정리한다', deadline:false, eveningHook:'출근하지 않는 아침이다. 빛이 드는 자리가 평일 밤과 다르다.' },
    { date:'9/20', weekday:'일', weekend:true, event:'plan', task:'내일의 준비와 내 휴식을 챙긴다', deadline:false, eveningHook:'출근 가방은 아직 열려 있다. 어제 옮겨 둔 물건들 사이로 보리가 지나간다.' },
    { date:'9/21', weekday:'월', weekend:false, event:'ceo', task:'내일 최종 보고를 앞두고 초안을 공유한다', deadline:false, eveningHook:'초안을 함께 검토하느라 평소보다 늦게 돌아왔다. 가방에는 오늘 받은 의견이 붙어 있다.' },
    { date:'9/22', weekday:'화', weekend:false, event:'deadline', task:'최종 보고 자료를 제시간에 공유한다', deadline:true, eveningHook:'큰 보고가 끝났다. 책상 위에는 보완할 표시와 비워진 머그잔이 남아 있다.' },
    { date:'9/23', weekday:'수', weekend:false, event:'food', task:'보고 뒤 수정본을 정리한다', deadline:false, eveningHook:'사료를 준비하며 남은 양을 확인한다. 앞서 구입한 봉지와 비상분도 눈에 들어온다.' },
    { date:'9/24', weekday:'목', weekend:false, event:'stormReturn', task:'공유한 자료의 위치와 다음 담당자를 확인한다', deadline:false, eveningHook:'다시 비가 온다. 지난번과 같은 창문, 같은 소파, 같은 방문이 보인다.' },
    { date:'9/25', weekday:'금', weekend:false, event:'payday', task:'두 주 동안 맡은 일을 정리하고 첫 정산을 확인한다', deadline:true, eveningHook:'첫 정산이 들어왔다. 집에는 이제 각자의 흔적이 남은 자리들이 있다.' }
  ];

  // 한꺼번에 주제를 설명하는 소개가 아니라, 구조 장면에서 오가는 짧은 말이다.
  var opening = [
    { who:'휴대폰', text:'이번 채용에는 함께하지 못하게 되었습니다.' },
    { who:'나', text:'…또네. 이번 겨울만 몇 번째인지.' },
    { who:'고양이', text:'야옹…' },
    { who:'나', text:'거기 있으면 다 젖겠다.' },
    { who:'나', text:'우리 집에서 말리고 갈래?' }
  ];

  function number(s,key,fallback) {
    var value=Number(s && s[key]);
    return Number.isFinite(value)?value:fallback;
  }
  function flag(s,key) { return !!(s && s.flags && s.flags[key]); }
  function me(s) { return String(s && s.me || '나'); }
  function cat(s) { return String(s && s.cat || '보리'); }
  function line(who,text) { return {who:who,text:text}; }
  function speech(who,texts) { return texts.map(function (text) { return line(who,text); }); }
  function dayOf(s) { return Math.max(0,Math.min(12,Math.floor(number(s,'day',0)))); }
  function workAt(s,day) {
    var work=s && Array.isArray(s.work)?s.work:[];
    for(var i=work.length-1;i>=0;i--)if(Number(work[i].day)===day)return work[i];
    return null;
  }
  function lastImportantWork(s) { return workAt(s,4) || workAt(s,3) || workAt(s,2); }
  function plannedFor(s,day) {
    return !!(s && Array.isArray(s.planDays) && s.planDays.indexOf(day)!==-1) || Number(s && s.flags && s.flags.planForDay)===day;
  }
  function prepared(s) {
    var today=workAt(s,dayOf(s));
    return !!(today && today.prepared) || number(s,'prep',0)>=1;
  }
  function exhausted(s) { return number(s,'energy',3)<=0; }
  function hasHoodiePlace(s) { return flag(s,'hoodiePlaced') || !!(s && s.hoodie); }

  function leadDialogue(s,d) {
    var name=me(s), record;
    switch(d) {
      case 0: return [];
      case 1: return speech('팀장',[
        name+' 씨, 오늘은 인수인계 자료부터 봅시다. 모르는 건 표시해 두세요.',
        '목요일 아침에 짧게 첫 보고를 할 거예요. 원본 수치가 어디서 왔는지 확인해 와 주세요.',
        '오늘 다 외울 필요는 없어요. 확인한 것과 아직 모르는 것을 구분하면 됩니다.'
      ]);
      case 2: return speech('팀장',[
        '이 표의 합계가 원본과 맞지 않네요. 먼저 어떤 자료를 쓸지 정하고 정리해 봅시다.',
        prepared(s)?'표시해 온 부분은 같이 확인하죠. 이미 찾은 근거부터 보면 됩니다.':'목요일에 처음 보는 표가 되지 않게, 오늘 한 번은 끝까지 읽어 보세요.'
      ]);
      case 3: return speech('팀장',[
        '내일 아침이 첫 보고예요. 바뀐 숫자에는 근거를 붙여 주세요.',
        '틀린 곳을 표시해 두는 건 괜찮아요. 확인하지 않은 숫자를 확정해서 공유하면 곤란합니다.'
      ]);
      case 4:
        record=workAt(s,4);
        if(!record)return speech('팀장',[
          '오늘 첫 보고에서는 근거 파일을 같이 열어 두고 보겠습니다.',
          '확인하지 못한 숫자는 표시해 주세요. 보고하면서 그 부분부터 같이 맞춥시다.'
        ]);
        return speech('팀장',[
          record.status==='missed'?'오늘 끝낸 부분과 남겨 둔 부분은 확인했어요. 이어서 볼 자료의 위치도 남겨 주세요.':record.status==='strained'?'오늘 공유본은 받았어요. 같은 부분을 여러 번 확인하느라 평소보다 오래 걸렸죠.':record.prepared?'근거 자료를 같이 준비해 와서 확인이 빨랐어요.':'오늘은 원본을 다시 찾아 대조하느라 시간이 더 걸렸죠.',
          '오늘 수정한 부분은 다음 주 최종 보고에도 이어집니다. 표시를 지우지 말고 남겨 두세요.'
        ]);
      case 5: return speech('팀장',[
        '다음 주 화요일이 최종 보고입니다. 월요일에는 초안을 먼저 공유해 주세요.',
        '오늘은 고칠 곳과 이미 끝낸 곳을 나눠 두고 갑시다. 주말에 전부 다시 할 필요는 없어요.'
      ]);
      case 8: return speech('팀장',[
        '내일 아침에 쓸 최종본, 오늘 공유한 초안에서 이어 갑니다.',
        plannedFor(s,8)?'미리 얘기한 일정은 확인했어요. 공유하기로 한 부분부터 먼저 올려 주세요.':'준비가 늦어질 것 같으면 마감이 지난 뒤 말하지 말고, 지금 남은 일을 알려 주세요.',
        '오늘 사장님도 초안을 보실 거예요. 옷보다 자료의 근거를 먼저 확인합시다.'
      ]);
      case 9: return speech('팀장',[
        '오늘 최종 보고입니다. 공유본과 내가 보고 있는 파일이 같은지부터 확인하세요.',
        prepared(s)?'초안에서 바뀐 부분만 짚고 시작하면 됩니다.':'아직 확인하지 못한 부분은 그대로 말하세요. 추측해서 답하지는 맙시다.'
      ]);
      case 10: return speech('팀장',[
        '어제 보고에서 표시한 수정 사항을 정리해 주세요.',
        '새로 다 만드는 일이 아닙니다. 어느 부분이 바뀌었는지 다음 사람이 찾을 수 있게 해 주세요.'
      ]);
      case 11: return speech('팀장',[
        '내일은 두 주 동안 맡은 자료를 한 번 정리할 거예요.',
        '파일 위치와 수정한 이유를 남겨 주세요. 자리에 없는 사람이 봐도 이어서 할 수 있어야 합니다.'
      ]);
      case 12: return speech('팀장',[
        '처음 맡았던 자료와 지금 공유한 자료를 같이 봅시다.',
        '다음 주에도 할 일은 생기겠지만, 오늘 확인한 부분까지는 정리하고 가세요.'
      ]);
      default: return [];
    }
  }

  function peerDialogue(s,d) {
    var name=me(s), pet=cat(s);
    switch(d) {
      case 0: return [];
      case 1: return speech('동기',[
        '책상 서랍은 잘 열려요? 제 건 처음에 손잡이가 안 빠지더라고요.',
        '급여일은 25일이래요. 우리는 중간에 들어와서 이번 첫 정산은 111만 원이고요.',
        '다음 달부터는 계약서에 적힌 월 급여로 나온대요. 저는 첫 달도 전액인 줄 알았어요.'
      ]);
      case 2: return [
        line('동기','요즘 새 생활은 좀 어때요? 퇴근하면 쉬어요?'),
        line(name,pet+'랑 살아요. 취업 준비할 때는 거의 붙어 있었는데, 요즘은 출근하면 혼자 있어요.'),
        line('동기','사진 있어요? 사장님 휴대폰 배경도 치즈 고양이더라고요. 이름이 호떡이랬나.'),
        line('동기','아, 표 원본은 여기예요. 저도 한참 다른 파일을 보고 있었어요.')
      ];
      case 3: return speech('동기',[
        '오늘 저녁부터 비가 세게 온대요. 우산 챙겼어요?',
        exhausted(s)?'눈이 많이 피곤해 보여요. 확인한 데까지만 표시해 놓고, 같은 줄을 계속 읽고 있지는 마요.':'저는 마지막 표를 한 번 더 대조하고 가려고요. 내일 아침에 처음 찾으려니까 불안해서요.'
      ]);
      case 4: return speech('동기',[
        '보고 때 표시받는 부분은 사진 말고 파일에 남겨 둬요. 다음 주에 또 찾아야 하니까요.',
        '저는 집에 일이 있어서 정시에 나가기로 미리 얘기했어요. 같이 확인할 게 있으면 나가기 전에 불러 줘요.',
        '사장님도 아침 돌봄 일정 때문에 회의 시간을 미리 맞추신대요. 호떡이 얘기하실 때 알았어요.'
      ]);
      case 5: return speech('동기',[
        '집에 가져갈 파일을 다 복사하지 말고, 손댈 부분만 표시해 둬요. 저도 어제 헷갈렸어요.',
        '주말에 뭐 해요? 저는 밀린 빨래부터 해야겠어요.'
      ]);
      case 6: return [line('동기','어제 표시한 수정본 위치, 공유 폴더에 남겨 뒀어요. 답은 월요일에 줘도 돼요.')];
      case 7: return [line('동기','내일 아침엔 초안부터 같이 확인해요. 제 쪽 수정은 표시해 놨어요.')];
      case 8: return speech('동기',[
        workAt(s,8)&&workAt(s,8).completed?'오늘 공유한 초안 봤어요. 제가 이어서 확인할 부분도 표시해 뒀어요.':'먼저 끝난 부분이 있으면 공유해 줘요. 제가 기다리는 곳과 따로 할 수 있는 곳을 나눌게요.',
        '사장님도 오늘 초안을 보신대요. 끝난 곳과 아직 확인할 곳을 나눠 두면 좋겠어요.',
        '그래도 내일 자료 마감은 그대로죠. 나머지 확인하고 가요.'
      ]);
      case 9: return speech('동기',[
        '공유본 이름 뒤에 날짜 붙였어요. 예전 파일이랑 헷갈리지 않게요.',
        exhausted(s)?'보고 끝나면 잠깐 앉아 있어요. 방금 같은 질문을 두 번 읽고 있었어요.':'보고 끝나면 제가 발송본을 정리할게요. 수정할 곳은 표시만 해 줘요.'
      ]);
      case 10: return [
        line(name,number(s,'food',4)<=1?'사료가 얼마 안 남았어요. 오늘 퇴근길에 챙겨야겠어요.':'오늘은 퇴근길에 사료가 얼마나 남았는지 보고 가려고요.'),
        line('동기','오늘 먹일 양부터 챙기고, 다음 봉지 살 시간도 잡아 둬요. 저는 집에 가서야 맨날 생각나요.'),
        line('동기',flag(s,'foodHelpReceived')?'지난번처럼 급한 양은 나눌 수 있어요. 다음 봉지는 여유 있을 때 챙겨요.':'급하면 조금 나눌 수는 있어요. 계속 제 걸로 버티지는 말고요.')
      ];
      case 11: return speech('동기',[
        '또 비가 오네요. 지난번에는 퇴근하자마자 창문부터 닫았어요.',
        '내일 정리할 자료는 제 쪽 것까지 한 폴더에 넣어 뒀어요. 수정 이유만 덧붙여 줘요.'
      ]);
      case 12: return speech('동기',[
        '첫 정산 들어왔어요? 입사일부터 계산한 금액이 맞는지 저는 한 번 봤어요.',
        pet+'는 요즘 어때요? 퇴근하고 집에 가면 어디서 기다려요?'
      ]);
      default: return [];
    }
  }

  function bossDialogue(s,d) {
    var name=me(s), pet=cat(s), record=lastImportantWork(s);
    switch(d) {
      case 0: case 6: case 7: return [];
      case 1: return speech('사장',[
        name+' 씨죠? 첫날엔 자료 위치부터 익혀요. 질문할 사람도 같이 알아 두고요.',
        '목요일 첫 보고는 팀장님과 같이 볼 겁니다.'
      ]);
      case 2: return speech('사장',[
        '원본이 여러 개라 처음엔 헷갈릴 거예요. 지금 쓰는 기준을 팀장님께 먼저 확인하세요.',
        '사진이요? 우리 집 호떡이에요. 잠깐, 지금은 통화부터 마저 할게요.'
      ]);
      case 3: return speech('사장',[
        '내일은 수치가 어디서 왔는지부터 보겠습니다.',
        '모르는 부분이 있으면 빈칸으로 남겨 두세요. 그걸 같이 확인하려고 보는 겁니다.'
      ]);
      case 4:
        record=workAt(s,4);
        if(!record)return speech('사장',[
          '첫 보고는 원본 자료를 같이 열어 두고 보겠습니다.',
          '오늘 확인한 수정 사항은 다음 주 최종 보고까지 이어질 거예요.'
        ]);
        return speech('사장',[
          record.status==='missed'?'오늘 못 마친 부분은 표시한 곳부터 이어 갑시다. 다음 사람이 볼 수 있게 자료 위치도 남겨 주세요.':record.status==='strained'?'공유본은 확인했어요. 몇 번씩 다시 대조하느라 오래 걸렸죠. 다음 확인 일정도 같이 봅시다.':record.prepared?'원본을 같이 열어 둬서 확인이 빨랐어요. 이 방식으로 이어 가세요.':'필요한 원본을 찾아 대조했군요. 다음번엔 바로 찾을 수 있게 준비해 두면 시간이 덜 들겠어요.',
          '오늘 나온 수정 사항은 최종 보고 전에 반영합시다.'
        ]);
      case 5: return speech('사장',[
        '다음 주 화요일이 최종 보고입니다. 월요일에 초안을 먼저 보면, 당일에 되돌리는 일이 줄겠죠.',
        '끝난 부분과 아직 확인 중인 부분을 나눠서 공유해 주세요.'
      ]);
      case 8:
        return [
          line('사장',record && record.status==='missed'?'지난주에 남긴 부분이 있었죠. 오늘 초안에서는 그 부분부터 같이 확인합시다.':record && record.status==='strained'?'지난주에는 같은 부분을 몇 번씩 대조하느라 늦어졌죠. 오늘은 확인할 곳을 나눠서 보겠습니다.':record && record.prepared?'지난주 보고는 근거를 같이 준비한 점이 좋았어요. 표시한 수정 사항까지 반영됐는지 보겠습니다.':'지난주에는 근거 자료를 다시 찾느라 시간이 더 걸렸죠. 내일은 바로 찾을 수 있게 확인해 주세요.'),
          line('사장','오늘 공유한 초안을 기준으로, 내일 아침 최종본을 확인합시다. 이 약속은 그대로예요.'),
          line('사장','아, 이 아이가 호떡이에요. 아까 집에서 온 사진이에요. 저도 아침에 혼자 두고 나오면 자꾸 보게 되네요.'),
          line(name,'저도 '+pet+'랑 살아요. 출근하기 전에는 늘 같이 있었는데, 갑자기 혼자 두고 나오게 됐어요.'),
          line('사장',plannedFor(s,9)?(prepared(s)?'내일 일정은 미리 얘기해 줘서 알았어요. 오늘 공유한 자료는 제가 읽어 둘게요. 내일 확인할 부분은 표시해 주세요.':'내일 일정은 미리 얘기해 줘서 알았어요. 오늘 공유한 부분부터 보고, 내일 기다려야 할 부분은 따로 맞춰 봅시다.'):'일정을 조정할 일이 생기면 미리 얘기해 주세요. 먼저 해 둘 일과 다른 사람이 기다리는 일을 같이 정하면 됩니다.'),
          line('사장','초안을 같이 보느라 평소보다 늦었네요. 오늘은 여기까지 정리하고 들어가요.')
        ];
      case 9: return speech('사장',[
        '오늘은 최종본을 봅시다. 어제 공유한 초안에서 달라진 곳을 짚어 주세요.',
        plannedFor(s,9)?(prepared(s)?'오늘 일정 조정한 건 확인했어요. 준비한 자료로 바로 시작하죠.':'오늘 일정은 미리 얘기한 대로 맞춥시다. 필요한 자료를 찾을 순서부터 확인하죠.'):'시간에 쫓겨도 확인하지 않은 내용을 확정해서 말하지는 맙시다.'
      ]);
      case 10: return speech('사장',[
        '어제 보고 뒤에 바뀐 부분을 다음 사람이 찾을 수 있게 남겨 주세요.',
        '문서가 깔끔해 보이는 것보다, 어떤 기준을 썼는지가 분명해야 합니다.'
      ]);
      case 11: return speech('사장',[
        '내일은 처음 맡았던 일과 지금 정리한 것을 같이 보겠습니다.',
        '계속 맡을 부분과 넘길 부분을 구분해 두세요. 혼자 다 붙잡고 있을 필요는 없어요.'
      ]);
      case 12: return speech('사장',[
        '첫 두 주가 끝났네요. 준비한 것과 실제로 공유한 것을 한번 돌아봅시다.',
        '오늘은 여기까지 정리하고 가세요. 다음 주 일은 공유해 둔 일정에서 이어 갑니다.'
      ]);
      default: return [];
    }
  }

  function dialogue(s,person) {
    s=s||{};var d=dayOf(s),result;
    if(days[d].weekend && d>0 && person!=='peer')return [];
    if(person==='lead')result=leadDialogue(s,d);
    else if(person==='peer')result=peerDialogue(s,d);
    else if(person==='boss')result=bossDialogue(s,d);
    else result=[];
    return result.slice(0,6);
  }

  function workReport(s) {
    s=s||{};var d=dayOf(s),record=workAt(s,d),ready=record?!!record.prepared:prepared(s);
    if(days[d].weekend)return [];
    // 중요 업무일에 준비도가 소모된 뒤에도, 이미 기록된 결과를 우선한다.
    var status=record && record.status;
    if(!status)status=exhausted(s)?(ready?'strained':'missed'):(ready?'good':'steady');
    var critical=!!days[d].deadline;
    if(status==='good')return speech('팀장',critical?[
      d===9?'어제 공유한 초안과 같은 파일이네요. 준비한 순서대로 확인할 수 있었어요.':d===12?'자료 위치와 수정 이유까지 정리돼 있네요. 다음 사람이 이어서 볼 수 있겠어요.':'근거 자료를 바로 열 수 있어서 보고가 끊기지 않았어요.',
      d===4?'표시한 수정 사항은 다음 주 최종 보고까지 이어 갑시다.':'오늘 확인한 부분은 이 상태로 공유해 주세요.'
    ]:[
      '맡은 부분은 확인됐어요. 근거 파일을 같이 남겨 둔 점이 좋네요.',
      '새로 확인할 부분만 표시해 놓고, 끝낸 곳은 정리합시다.'
    ]);
    if(status==='missed')return speech('팀장',[
      '오늘 끝낸 부분과 아직 남은 부분은 확인했어요. 지금 공유할 수 있는 내용부터 남겨 주세요.',
      ready?'준비한 자료의 위치도 같이 적어 주세요. 이어서 볼 사람이 처음부터 찾지 않게요.':'아직 확인하지 못한 숫자는 표시해 두세요. 나머지를 보완할 시간을 같이 잡읍시다.',
      record && record.planned?'미리 맞춘 일정에서 남은 일을 다시 나눠 보겠습니다.':'오늘 남긴 일이 있으니, 내일 시작하기 전에 이어 할 순서부터 맞춥시다.'
    ]);
    if(status==='strained')return speech('팀장',[
      ready?'공유본은 받았어요. 자료는 준비됐는데 같은 숫자를 여러 번 확인하느라 오래 걸렸죠.':'공유본은 받았어요. 필요한 자료를 찾고 다시 대조하느라 예정보다 오래 걸렸죠.',
      '오늘 확인한 내용은 남겨 뒀으니, 내일 같은 곳을 처음부터 다시 찾지는 않아도 됩니다.'
    ]);
    return speech('팀장',[
      '오늘 맡은 부분은 이어서 사용할 수 있겠어요.',
      critical?'필요한 근거를 찾아 대조하느라 시간이 더 들었죠. 다음번에는 바로 열 수 있게 준비해 둡시다.':'남은 수정 사항만 표시해 놓고 마무리하세요.'
    ]);
  }

  function homeLine(s) {
    s=s||{};var d=dayOf(s),pet=cat(s),need=s.needs||{};
    var familiar=hasHoodiePlace(s),stable=number(s,'routine',0)>=3,close=number(s,'trust',4)>=7,far=number(s,'trust',4)<=2;
    if(d===0)return '내일은 첫 출근이다. 알람은 여섯 시 반에 맞춰 뒀다.';
    if(d===3) {
      if(flag(s,'rainComforted'))return familiar?pet+'가 후드티 위에서 젖은 앞발을 핥는다. 창문은 닫혀 있다.':pet+'의 귀가 조금씩 올라온다. 닫은 창문에 빗방울이 부딪힌다.';
      return '열어 둔 창문이 바람에 흔들린다. '+pet+'는 늘 있던 자리에 없다.';
    }
    if(d===4) {
      if(s.suitStored)return familiar?'정장은 방 안에 따로 걸려 있다. 거실의 회색 후드티에는 '+pet+'가 코를 묻는다.':'정장은 방 안에 따로 걸려 있다. 거실 의자에는 예전에 함께 입고 뒹굴던 회색 후드티가 남았다.';
      return '거실 소파에 벗어 둔 정장 소매가 내려와 있다. 늘 '+pet+'가 몸을 말던 자리와 겹친다.';
    }
    if(d===2)return '가방에 오늘 정리하던 자료가 들어 있다. 문을 열자 '+pet+'가 고개를 든다.';
    if(d===6)return '출근하지 않는 날이다. 집 안에 남은 내 물건과 '+pet+'의 자리를 천천히 돌아본다.';
    if(d===7)return '내일 쓸 가방이 아직 열려 있다. '+pet+'가 그 옆에서 빈 자리를 찾는다.';
    if(d===8)return '초안을 함께 검토하느라 평소보다 늦게 돌아왔다. 가방에는 내일 보완할 표시가 남아 있다.';
    if(d===9) {
      var report=workAt(s,9);
      return report && report.status==='good'?'보고가 끝난 자료를 내려놓았다. 아직 잠들지 않은 '+pet+'가 이쪽을 바라본다.':'보고에서 보완할 곳을 표시해 왔다. 가방을 내려놓자 손목이 뻐근하다.';
    }
    if(d===10 && number(s,'food',4)<=0)return '사료 봉지는 비었다. 오늘 먹일 양을 마련해야 한다.';
    if(d===10 && number(s,'food',4)<=2)return '사료 봉지를 기울이자 바닥이 접힌다. 다음에 채울 양을 확인할 수 있다.';
    if(d===10)return '밥그릇 옆에서 다음에 덜어 줄 사료를 확인한다. 봉지 안에는 아직 먹일 양이 남아 있다.';
    if(d===11) {
      if(stable&&familiar)return '다시 빗소리가 난다. '+pet+'는 지난번 마련한 자리에서 고개를 들었다가 몸을 만다.';
      if(far)return '비가 오는데도 문 앞에는 오지 않는다. 소파 끝에서 눈만 움직인다.';
      return '창문이 덜컹거리자 '+pet+'의 귀가 내려간다. 지난번 멈춰 섰던 곳을 다시 본다.';
    }
    if(d===12) {
      if(need.fed===false)return '첫 정산 내역을 가방에 넣었다. '+pet+'가 부엌 쪽으로 가서 나를 돌아본다.';
      if(stable&&familiar)return '사료는 채워졌고, 늘 놓는 자리에 내 옷이 있다. '+pet+'는 거기에 앉아 나를 바라본다.';
      if(far)return '밥그릇은 비워졌다. '+pet+'는 내가 지나가자 소파 안쪽으로 자리를 옮긴다.';
      return pet+'가 사료를 먹다 말고 나를 본다. 잠들기 전까지 아직 시간이 남아 있다.';
    }
    if(need.fed===false)return pet+'가 빈 밥그릇 앞에 앉아 있다. 부엌으로 가면 고개를 든다.';
    if(number(s,'energy',3)<=0)return '가방을 내려놓고도 어깨가 무겁다. '+pet+'가 내 발 옆에서 멈춘다.';
    if(stable&&familiar)return pet+'가 후드티 위에 몸을 말았다. 내가 책상에 앉자 눈만 잠깐 뜬다.';
    if(far)return pet+'는 내 쪽으로 오지 않는다. 내가 움직이면 고개만 조금 돌린다.';
    if(close)return pet+'가 꼬리를 세우고 다가온다. 가방을 놓을 때까지 발 옆을 따라온다.';
    return pet+'가 현관과 부엌 사이를 오간다. 내가 움직이면 잠깐 멈춰 기다린다.';
  }

  return {days:days,opening:opening,dialogue:dialogue,workReport:workReport,homeLine:homeLine};
})();

if(typeof module!=='undefined' && module.exports)module.exports=LifeStory;
