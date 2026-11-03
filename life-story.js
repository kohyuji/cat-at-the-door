/* 대화와 화면에 표시할 업무 메모. 게임 상태는 변경하지 않는다. */
var LifeStory=(function(){
  'use strict';
  var days=[
    {date:'9/13',weekday:'일',weekend:true,event:'first',task:'첫 출근에 가져갈 노트북과 옷을 챙긴다',deadline:false,eveningHook:'내일은 첫 출근이다. 가방과 옷을 챙겨야 한다.'},
    {date:'9/14',weekday:'월',weekend:false,event:'first',task:'회사 메일과 공유 폴더, 팀 메신저를 연다',deadline:false,eveningHook:'하루 종일 집을 비웠다. 현관 안에서 고양이 발소리가 들린다.'},
    {date:'9/15',weekday:'화',weekend:false,event:'desk',task:'날짜가 섞인 팀 메모 파일을 정리한다',deadline:false,eveningHook:'가방에서 메모를 꺼내자 고양이가 책상을 바라본다.'},
    {date:'9/16',weekday:'수',weekend:false,event:'storm',task:'처리 목록 다섯 줄을 보고 완료·대기 건수를 다시 센다',deadline:false,eveningHook:'비가 세게 온다. 집에 들어왔는데 고양이가 보이지 않는다.'},
    {date:'9/17',weekday:'목',weekend:false,event:'closet',task:'회의 메모의 잘못된 날짜와 합계를 고친다',deadline:true,eveningHook:'정장을 소파에 벗어 뒀다. 고양이가 소매 냄새를 맡는다.'},
    {date:'9/18',weekday:'금',weekend:false,event:'plan',task:'내가 확인할 표와 동료가 쓸 회의 안건을 나눠 적는다',deadline:false,eveningHook:'첫 주 출근이 끝났다. 세탁할 옷이 쌓였다.'},
    {date:'9/19',weekday:'토',weekend:true,event:'weekend',task:'빨래하고 필요한 사료를 산 뒤 쉰다',deadline:false,eveningHook:'출근하지 않는 토요일이다. 밀린 빨래부터 할까.'},
    {date:'9/20',weekday:'일',weekend:true,event:'plan',task:'월요일 가방을 챙기고 고양이와 집에서 보낸다',deadline:false,eveningHook:'내일 가져갈 가방이 열려 있다. 고양이가 발 가까이에 누웠다.'},
    {date:'9/21',weekday:'월',weekend:false,event:'schedule',task:'금요일 회의가 오전 9시 반으로 바뀐 것을 확인한다',deadline:false,eveningHook:'회의가 삼십 분 당겨졌다. 달력과 첫 장의 시간을 고쳤다.'},
    {date:'9/22',weekday:'화',weekend:false,event:'deadline',task:'공유 폴더에서 처리 목록·회의 안건·시간 변경 메일을 모은다',deadline:true,eveningHook:'내일 확인할 파일 세 개를 모았다. 집에서는 밥그릇 소리가 난다.'},
    {date:'9/23',weekday:'수',weekend:false,event:'preview',task:'인쇄 미리보기에서 예전 첫 장을 빼낸다',deadline:false,eveningHook:'같은 첫 장이 두 번 들어간 것을 고쳤다. 집에 와서는 남은 사료도 살핀다.'},
    {date:'9/24',weekday:'목',weekend:false,event:'handoff',task:'내일 가져갈 두 장을 확인하고 확인본으로 저장한다',deadline:false,eveningHook:'회의에 가져갈 종이는 두 장이다. 가방에 넣을 것을 확인한다.'},
    {date:'9/25',weekday:'금',weekend:false,event:'meeting',task:'9시 반 회의에 맞춰 확인본 두 장을 팀장에게 건넨다',deadline:true,eveningHook:'금요일 회의가 끝났다. 집에 돌아와 신발을 벗는다.'}
  ];
  var phone={
    rejection:{sender:'채용 담당자',title:'지원 결과 안내',body:'이번 채용에는 함께하지 못하게 되었습니다.'},
    offer:{sender:'인사 담당자',title:'첫 출근 안내',body:'9월 14일 월요일 오전 9시까지 와 주세요. 노트북과 충전기를 가져오시면 됩니다. 첨부한 첫날 안내는 출근해서 함께 확인하겠습니다.'}
  };
  var opening=[{who:'고양이',text:'야옹…'},{who:'나',text:'거기 있으면 다 젖겠다.'},{who:'나',text:'우리 집에서 말리고 갈래?'}];
  function source(id,title,text){return{id:id,title:title,text:text};}
  function slot(id,label,hint){return{id:id,label:label,hint:hint};}
  function card(id,text,sourceId){return{id:id,text:text,sourceId:sourceId};}
  function job(id,kind,title,goal,sources,entries,extra,successText,remainingText,hints){
    var result={id:id,kind:kind,title:title,goal:goal,sources:sources,
      steps:['화면의 메모와 문서를 확인한다.','잘못됐거나 빠진 내용을 고친 뒤 확인한다.'],
      slots:[],cards:[],solution:{},successText:successText,remainingText:remainingText,
      preparedHints:hints||[],hints:hints||[]};
    entries.forEach(function(entry,i){var cardId=id+'-'+i;result.slots.push(slot(entry[0],entry[1],entry[2]));result.cards.push(card(cardId,entry[3],entry[4]||sources[0].id));result.solution[entry[0]]=cardId;});
    (extra||[]).forEach(function(entry,i){result.cards.push(card(id+'-extra-'+i,entry[0],entry[1]||sources[0].id));});
    return result;
  }
  var countRows=[
    {label:'신청서 확인',completed:3,pending:1},
    {label:'연락처 수정',completed:2,pending:0},
    {label:'파일 정리',completed:1,pending:2},
    {label:'일정 확인',completed:2,pending:0},
    {label:'비품 확인',completed:0,pending:1}
  ];
  var countText='9월 1~15일 처리 목록. 신청서 확인: 완료 3 / 대기 1. 연락처 수정: 완료 2 / 대기 0. 파일 정리: 완료 1 / 대기 2. 일정 확인: 완료 2 / 대기 0. 비품 확인: 완료 0 / 대기 1.';
  var tasks=[null,
    job('first-login','setup','첫날 컴퓨터 설정','회사 메일, 공유 폴더, 팀 메신저를 어디에서 여는지 확인한다.',
      [source('orientation','첫날 안내','회사 메일에는 회의 초대가 온다. 팀 공유 폴더에는 함께 쓰는 파일이 있다. 팀 메신저에는 오늘 알릴 짧은 공지를 쓴다. 9/25 금요일 오전 10시 팀 회의에 쓸 메모를 앞으로 함께 확인한다.')],[
        ['mail','회의 초대 확인','개인 초대 메일을 어디서 보는가?','회사 메일'],
        ['folder','함께 쓰는 파일','내 컴퓨터에만 두면 다른 사람이 못 본다.','팀 공유 폴더'],
        ['messenger','짧은 팀 공지','팀에 바로 알릴 때 쓴다.','팀 메신저']
      ],[], '메일과 공유 폴더가 열리고 팀 메신저에 들어왔다.','아직 열지 못한 항목을 확인하고 자리에서 다시 접속한다.',['회의 초대는 회사 메일, 함께 쓰는 문서는 공유 폴더에 있다.']),
    job('dated-files','sort','섞인 파일 정리','이름에 적힌 날짜를 보고 팀 메모를 해당 날짜에 넣는다.',
      [source('files','받은 파일','팀메모_0914.txt, 팀메모_0911.txt, 팀메모_0915.txt가 한 폴더에 섞여 있다. 숫자 네 자리는 월과 일이다. 문서를 다른 날 폴더에 넣으면 이전 내용을 잘못 열 수 있다.')],[
        ['file0911','9/11 금요일','파일 이름의 날짜를 확인한다.','팀메모_0911.txt'],
        ['file0914','9/14 월요일','파일 이름의 날짜를 확인한다.','팀메모_0914.txt'],
        ['file0915','9/15 화요일','파일 이름의 날짜를 확인한다.','팀메모_0915.txt']
      ],[], '팀 메모 세 개가 해당 날짜의 폴더에 들어갔다.','다른 날짜에 들어간 파일이나 아직 정리하지 않은 파일이 남았다.',['0911은 9월 11일이다. 파일을 열기 전에 이름부터 확인한다.']),
    job('count-rows','calculate','합계 다시 세기','다섯 줄의 완료와 대기를 각각 더하고 전체 건수를 고친다.',
      [source('rows','처리 목록',countText),source('summary','요약란','요약란에는 완료 9건, 대기 4건, 전체 13건이라고 적혀 있다. 행의 숫자와 맞는지 다시 센다.')],[
        ['completedCount','완료 합계','완료 열의 다섯 숫자를 더한다.','8건','rows'],
        ['pendingCount','대기 합계','대기 열의 다섯 숫자를 더한다.','4건','rows'],
        ['totalCount','전체 건수','완료와 대기를 합한다.','12건','rows']
      ],[['13건','summary']], '완료 8건, 대기 4건, 전체 12건으로 요약을 고쳤다.','다섯 줄과 요약의 숫자가 아직 맞지 않는 항목이 있다.',['완료 열은 3+2+1+2+0, 대기 열은 1+0+2+0+1이다.']),
    job('handout-errors','fix','첫 장의 날짜와 합계','회의 초대와 처리 목록을 보고 잘못 적힌 세 항목을 확인한다.',
      [source('invite','회의 초대','9월 25일 금요일 오전 10시 팀 회의다. 내일 회의가 아니라 다음 주 금요일 회의다.'),source('checked','확인한 처리 목록','9월 1~15일 기준 완료 8건, 대기 4건이다.'),source('draft','지금 열린 첫 장','날짜가 9/24 목요일로, 완료가 9건으로 적혀 있다. 대기는 4건이다.')],[
        ['meetingDate','회의 날짜','메일 초대와 같은 날짜여야 한다.','9/25 금요일','invite'],
        ['completedCount','완료 건수','처리 목록의 완료 합계와 대조한다.','8건','checked'],
        ['pendingCount','대기 건수','처리 목록의 대기 합계와 대조한다.','4건','checked']
      ],[['9/24 목요일','draft']], '첫 장의 날짜는 9/25 금요일, 처리 건수는 완료 8건과 대기 4건으로 맞췄다.','회의 날짜나 처리 건수에 아직 확인하지 못한 항목이 남았다.',['회의 초대는 9/25다. 요약만 보지 말고 어제 확인한 합계를 사용한다.']),
    job('who-does-what','assign','누가 확인할지 적기','팀장이 말한 담당 부분과 확인 시각을 메모한다.',
      [source('roles','나눠 맡은 일','내 담당은 처리표의 날짜와 합계 확인이다. 동료는 회의 안건 한 장을 쓴다. 팀장은 다음 주 목요일 퇴근 전에 두 장을 마지막으로 확인한다.')],[
        ['myPart','내가 확인할 부분','처리표에서 맡은 부분이다.','처리표의 날짜와 합계'],
        ['peerPart','동료가 쓸 부분','회의에서 이야기할 내용을 쓴다.','회의 안건 한 장'],
        ['checkBy','팀장 확인 시각','회의 전날까지 확인한다.','9/24 목요일 퇴근 전']
      ],[], '내가 확인할 표, 동료가 쓸 안건, 팀장 확인 시각을 적었다.','담당 부분이나 목요일 확인 시각이 메모에서 빠졌다.',['동료는 안건을 쓴다. 처리표의 날짜와 합계는 내가 확인한다.']),
    null,null,
    job('meeting-time-change','timeline','회의가 삼십 분 당겨졌다','새 공지를 읽고 회의 시각과 종이를 가져갈 시각을 바꾼다.',
      [source('new-notice','월요일 회의 안내','금요일 회의를 오전 10시에서 9시 30분으로 당깁니다. 시작 10분 전까지 확인본을 회의실에 놓아 주세요. 내 달력과 첫 장의 시각도 함께 고칩니다.'),source('old-time','이전 초대','이전 회의 초대에는 오전 10시라고 적혀 있다. 가장 최근 공지를 확인한다.')],[
        ['meetingTime','새 회의 시각','월요일 새 안내에 적힌 시작 시각이다.','09:30','new-notice'],
        ['arriveBy','종이를 놓을 시각','시작 10분 전이다.','09:20','new-notice'],
        ['updateNotice','함께 고칠 곳','한 곳만 고치면 옛 시각을 볼 수 있다.','내 달력과 첫 장의 시각','new-notice']
      ],[['10:00','old-time']], '내 달력과 첫 장을 9시 반으로 고쳤다. 종이는 9시 20분까지 놓기로 했다.','달력이나 첫 장에 옛 시각이 남아 있다.',['월요일 새 안내를 기준으로 한다. 종이는 회의 시작보다 10분 먼저 가져간다.']),
    job('collect-originals','selectFiles','필요한 파일 세 개','공유 폴더에서 원본 세 개를 찾아 작업 창에 모은다.',
      [source('paths','공유 폴더 목록','팀공유/9월회의/0915_처리목록.xlsx, 팀공유/9월회의/회의안건_0918.docx, 팀공유/9월회의/시간변경_0921.eml을 쓴다. 이전 초대_0914.eml에는 10시가 적혀 있다.')],[
        ['rowsFile','처리 건수 원본','완료와 대기를 확인할 표다.','0915_처리목록.xlsx'],
        ['agendaFile','동료가 쓴 안건','금요일에 동료가 쓰기로 한 문서다.','회의안건_0918.docx'],
        ['timeNotice','최신 시간 공지','월요일 변경 공지를 사용한다.','시간변경_0921.eml']
      ],[['이전초대_0914.eml','paths']], '처리 목록과 회의 안건, 시간 변경 메일을 같은 작업 창에 모았다.','아직 찾지 못한 원본 파일이 있다. 이전 초대를 대신 쓰지 않도록 확인한다.',['파일은 회사 공유 폴더에 있다. 시간 공지는 0921 날짜를 확인한다.']),
    job('remove-old-page','discard','예전 첫 장 빼내기','인쇄 미리보기에서 필요한 두 장만 남기고 예전 첫 장을 뺀다.',
      [source('preview','인쇄 미리보기','현재 첫 장: 9/25 금요일 09:30. 처리표: 완료 8건, 대기 4건. 예전 첫 장: 9/24 목요일 10:00. 예전 첫 장까지 넣으면 첫 장이 두 번 나온다.')],[
        ['coverPage','남길 첫 장','날짜와 시각을 함께 본다.','9/25 금요일 09:30 첫 장'],
        ['tablePage','남길 처리표','확인한 건수를 담은 표다.','완료 8건 · 대기 4건 처리표'],
        ['discardPage','빼낼 종이','이미 고친 예전 첫 장이다.','9/24 목요일 10:00 첫 장']
      ],[], '예전 첫 장을 뺐다. 현재 첫 장과 처리표, 두 장만 남았다.','예전 첫 장이 남아 있거나 필요한 장을 빼냈다.',['지울 것은 숫자가 다른 옛 첫 장이다. 처리표는 남겨 둔다.']),
    job('two-page-copy','assemble','내일 가져갈 두 장','날짜와 건수를 확인한 두 장을 확인본으로 저장한다.',
      [source('final-check','목요일 확인 메모','첫 장은 9/25 금요일 09:30이다. 처리표 요약은 완료 8건, 대기 4건, 전체 12건이다. 두 장을 0925_팀회의_확인본.pdf로 저장한다. 이전 초안은 그대로 두고 확인본과 구분한다.')],[
        ['meetingHeader','첫 장 날짜·시각','가장 최근 회의 시각을 사용한다.','9/25 금요일 09:30'],
        ['summaryRow','처리표 합계','완료와 대기를 합한 값도 확인한다.','완료 8 · 대기 4 · 전체 12'],
        ['finalFile','저장할 파일','이전 초안을 덮어쓰지 않는다.','0925_팀회의_확인본.pdf']
      ],[['0925_팀회의_초안.pdf','final-check']], '첫 장과 처리표 두 장을 확인하고 0925_팀회의_확인본.pdf로 저장했다.','내일 가져갈 두 장에서 아직 확인하지 못한 항목이 있다.',['수요일에 예전 첫 장을 뺐다. 확인본은 현재 첫 장과 처리표 두 장이다.']),
    job('morning-meeting','handIn','팀장에게 확인본 건네기','9시 반 회의에 가져갈 확인본을 골라 팀장에게 건넨다.',
      [source('meeting','금요일 아침 메모','회의는 09:30 시작이다. 가져갈 것은 0925_팀회의_확인본.pdf를 인쇄한 두 장이다. 팀장에게 건네며 첫 장의 날짜와 처리표 합계를 같이 확인한다.')],[
        ['reportCopy','가져갈 종이','확인본 두 장을 가져간다.','0925_팀회의_확인본.pdf · 2장'],
        ['receiver','건넬 사람','확인하기로 한 사람에게 건넨다.','팀장'],
        ['meetingTime','회의 시작','바뀐 시각에 맞춰 간다.','09:30']
      ],[['0925_팀회의_초안.pdf · 3장','meeting']], '확인본 두 장을 팀장에게 건넸다. 날짜와 처리표를 보며 회의를 시작했다.','확인본에서 고칠 곳을 표시받았다. 팀장과 해당 장을 다시 확인한다.',['어제 저장한 확인본을 사용한다. 초안 파일은 가져가지 않는다.'])
  ];
  tasks[2].steps=['파일 이름에 적힌 날짜를 읽는다.','각 날짜의 폴더로 파일을 옮긴다.'];
  tasks[3].rows=countRows;
  tasks[3].steps=['완료 열과 대기 열을 각각 더한다.','요약의 숫자를 고친다.'];
  tasks[4].rows=countRows;
  tasks[8].steps=['이전 초대와 새 공지를 비교한다.','바뀐 시작 시각과 10분 전 시각을 적는다.'];
  tasks[10].steps=['세 장의 날짜와 내용을 살핀다.','남길 두 장을 구분하고 예전 첫 장은 빼낸다.'];
  tasks[10].discardSlot='discardPage';
  tasks[12].handoff={receiver:'lead',file:'0925_팀회의_확인본.pdf',pages:2,time:'09:30'};

  function prep(day,title,goal,memo,entries){
    var result=job('prepare-'+day,'prepare',title,goal,[source('known','지금까지 받은 메모',memo)],entries,[],'내일 확인할 내용을 메모했다.','아직 메모하지 않은 항목이 있다.',[]);
    result.day=day;result.targetDay=day;return result;
  }
  var preparations={
    1:prep(1,'첫 출근 준비','출근 안내에 적힌 준비물과 첫날 확인할 것을 메모한다.','월요일 오전 9시까지 출근한다. 노트북과 충전기를 가져간다. 첫날 안내는 회사에 가서 함께 확인한다.',[
      ['computer','가져갈 컴퓨터','노트북만 가져가면 충전할 수 없다.','노트북과 충전기'],
      ['orientation','확인할 안내','출근해서 함께 읽는다.','첨부된 첫날 안내'],
      ['arrival','도착 예정','첫 출근 안내의 시각이다.','월요일 오전 9시']]),
    2:prep(2,'파일 이름 확인 준비','내일 파일을 정리할 때 확인할 기준을 적는다.','팀 메모 파일의 이름에는 날짜가 네 자리로 붙어 있다. 문서 내용이 비슷하더라도 날짜를 보고 폴더를 골라야 한다.',[
      ['fileName','먼저 볼 것','비슷한 문서를 구분한다.','파일 이름 뒤의 네 자리 날짜'],
      ['monthDay','숫자 읽는 법','앞 두 자리와 뒤 두 자리를 나눈다.','앞은 월 · 뒤는 일'],
      ['folderDate','넣을 폴더','이름과 폴더가 같은 날짜인지 본다.','같은 날짜의 팀 메모 폴더']]),
    3:prep(3,'합계 확인 준비','내일 처리표에서 어떤 열을 더할지 적는다.','처리 목록에는 완료와 대기 열이 따로 있다. 전체는 두 열을 합한 값이다. 요약만 복사하지 말고 표의 각 줄을 확인한다.',[
      ['doneColumn','먼저 더할 열','첫 번째 합계다.','각 줄의 완료 건수'],
      ['waitColumn','따로 더할 열','완료에 섞지 않는다.','각 줄의 대기 건수'],
      ['wholeCount','마지막에 볼 값','두 합계를 합친다.','완료 합계 + 대기 합계']]),
    4:prep(4,'첫 장 검토 준비','이미 받은 초대와 오늘 확인한 합계를 메모한다.','회의 초대에는 9/25 금요일 오전 10시라고 적혀 있다. 오늘 확인할 표는 9월 1~15일 처리 목록이며 완료 8건, 대기 4건이다.',[
      ['inviteDate','초대의 날짜','현재 받은 초대 기준이다.','9/25 금요일'],
      ['countNote','표의 합계','요약에 옮기기 전 확인한다.','완료 8건 · 대기 4건'],
      ['comparePlan','내일 대조할 것','첫 장만 보고 넘기지 않는다.','회의 초대와 처리 목록 원본']]),
    5:prep(5,'오늘 고친 내용 적기','날짜와 건수를 어디서 확인했는지 남긴다.','오늘 검토한 것은 첫 장의 회의 날짜와 처리표의 완료·대기 합계다. 내일 팀에서 나눠 맡을 부분을 정할 때 이 메모를 본다.',[
      ['dateReference','날짜의 근거','초대에 적힌 날짜를 쓴다.','회사 메일의 회의 초대'],
      ['countReference','건수의 근거','요약 대신 행을 확인한다.','다섯 줄의 처리 목록'],
      ['fixedNote','수정 기록','어디를 고쳤는지 적는다.','첫 장 날짜와 처리표 합계']]),
    8:prep(8,'월요일에 확인할 것','금요일에 나눈 담당 부분과 현재 회의 시각을 적는다.','금요일까지 받은 초대는 9/25 오전 10시 회의다. 나는 처리표의 날짜와 합계, 동료는 회의 안건 한 장을 맡았다. 팀장은 목요일 퇴근 전에 두 장을 확인한다.',[
      ['knownTime','지금 받은 회의 시각','금요일까지 받은 안내다.','9/25 금요일 오전 10시'],
      ['ownPart','내가 확인할 것','나눠 맡은 부분이다.','처리표의 날짜와 합계'],
      ['peerPart','동료에게 받을 것','내가 새로 만들지 않는다.','동료가 쓸 회의 안건 한 장']]),
    9:prep(9,'원본 파일 찾을 준비','내일 회사 공유 폴더에서 찾을 파일을 적는다.','오늘 회의가 9시 반으로 바뀌었다. 내일은 처리 목록과 동료의 회의 안건, 오늘 시간 변경 공지를 모은다. 파일은 회사 공유 폴더에 있다.',[
      ['countFilePlan','건수를 볼 파일','표의 원본이 필요하다.','처리 목록 파일'],
      ['agendaPlan','받을 문서','동료가 맡은 내용이다.','동료의 회의 안건 문서'],
      ['noticePlan','시간을 확인할 파일','오늘 받은 새 공지다.','월요일 시간 변경 메일']]),
    10:prep(10,'인쇄 전 점검 메모','내일 미리보기에서 확인할 날짜와 장수를 적는다.','현재 회의는 9/25 금요일 09:30이다. 가져갈 종이는 첫 장과 처리표, 두 장이다. 이전 첫 장은 기록용으로 남아 있으니 인쇄할 때 섞이지 않게 한다.',[
      ['currentTime','현재 회의','월요일 바뀐 시각이다.','9/25 금요일 09:30'],
      ['pageCount','필요한 장수','첫 장과 처리표를 센다.','두 장'],
      ['oldPage','주의할 파일','옛 첫 장이 함께 들어갈 수 있다.','이전 첫 장은 인쇄에서 제외']]),
    11:prep(11,'확인본 저장 준비','내일 두 장을 확인할 때 대조할 내용을 모은다.','회의는 금요일 오전 9시 반이다. 처리표는 완료 8건, 대기 4건, 전체 12건이다. 팀장에게 넘길 때 초안과 확인본의 이름을 구분한다.',[
      ['headerCheck','첫 장 확인','현재 회의 날짜와 시각이다.','9/25 금요일 09:30'],
      ['sumCheck','처리표 확인','완료와 대기를 함께 적는다.','완료 8 · 대기 4 · 전체 12'],
      ['saveCheck','저장 전 확인','다른 파일을 가져가지 않게 한다.','초안과 확인본 파일 이름 구분']]),
    12:prep(12,'내일 회의 준비','오늘 저장한 확인본과 바뀐 회의 시각을 적는다.','내일 회의는 오전 9시 반이다. 오늘 확인할 파일은 0925_팀회의_확인본.pdf이며 두 장이다. 확인하지 못한 항목이 있으면 가져가기 전에 다시 본다.',[
      ['copyNote','가져갈 파일','오늘 저장할 확인본이다.','0925_팀회의_확인본.pdf'],
      ['timeNote','회의 시작','이전 초대의 10시와 다르다.','09:30'],
      ['lastCheck','아침에 다시 볼 것','빼놓은 항목이 없어야 한다.','확인하지 못한 날짜와 건수']])
  };
  function num(s,key,fallback){var value=Number(s&&s[key]);return Number.isFinite(value)?value:fallback;}
  function dayOf(s){return Math.max(0,Math.min(12,Math.floor(num(s,'day',0))));}
  function nextWorkDay(d){d=Math.max(1,Math.min(12,d));while(d===6||d===7)d++;return d;}
  function task(s,mode){var d=typeof s==='number'?s:dayOf(s);d=nextWorkDay(d+(mode==='prepare'?1:0));var out=JSON.parse(JSON.stringify(mode==='prepare'?preparations[d]:tasks[d]));out.day=d;out.targetDay=d;return out;}
  function flag(s,key){return !!(s&&s.flags&&s.flags[key]);}
  function me(s){return String(s&&s.me||'나');}
  function cat(s){return String(s&&s.cat||'보리');}
  function line(who,text){return{who:who,text:text};}
  function speech(who,texts){return texts.map(function(t){return line(who,t);});}
  function workAt(s,d){var list=s&&Array.isArray(s.work)?s.work:[];for(var i=list.length-1;i>=0;i--)if(Number(list[i].day)===d)return list[i];return null;}
  function missing(record){return record&&Array.isArray(record.missing)?record.missing:[];}
  function incomplete(record){return !!record&&(record.completed===false||record.status==='missed'||missing(record).length>0);}
  function labelFor(key,d){var all=tasks[d]?tasks[d].slots:[];for(var i=0;i<all.length;i++)if(all[i].id===key)return all[i].label;for(var n=1;n<tasks.length;n++)if(tasks[n])for(var j=0;j<tasks[n].slots.length;j++)if(tasks[n].slots[j].id===key)return tasks[n].slots[j].label;return'확인할 항목';}
  function labels(record,d){return missing(record).map(function(key){return labelFor(typeof key==='string'?key:key.key||key.id,d);}).join('·');}
  function pending(s){var seen=[],list=s&&Array.isArray(s.issueQueue)?s.issueQueue:[];list.filter(function(i){return !i.resolved;}).forEach(function(i){var label=labelFor(i.key,i.fromDay);if(seen.indexOf(label)<0)seen.push(label);});return seen.slice(0,3).join('·')+(seen.length>3?' 외 '+(seen.length-3)+'개':'');}
  function presented(s,r){if(!r||incomplete(r))return false;if(s&&s.project&&typeof s.project.presented==='boolean')return s.project.presented;return !pending(s);}
  function leadDialogue(s,d){
    var name=me(s),r=workAt(s,d);
    switch(d){
      case 1:return speech('팀장',[
        name+' 씨, 일단 메일부터 열어 볼까요. 공유 폴더랑 팀 메신저도 연결해 드릴게요.',
        '25일 금요일 열 시에 팀 회의가 있어요. 거기서 볼 메모 두 장을 같이 확인할 겁니다.',
        '오늘 다 할 필요는 없어요. 메일이랑 폴더가 열리는지 보고, 옆자리에도 인사하세요.'
      ]);
      case 2:return speech('팀장',[
        '팀 메모 파일이 한 폴더에 섞여 있네요. 이름에 날짜가 붙어 있어요.',
        '11일, 14일, 15일 폴더에 나눠 넣어 주세요. 다른 날 파일을 여는 일이 자꾸 있어서요.'
      ]);
      case 3:return speech('팀장',[
        '여기 다섯 줄만 봐 주세요. 맨 아래 합계가 안 맞는 것 같아요.',
        '완료랑 대기를 따로 더한 다음 전체도 확인해 주세요. 요약 숫자를 그대로 옮기면 또 틀립니다.'
      ]);
      case 4:
        if(r)return speech('팀장',incomplete(r)?[
          '아직 확인할 게 있네요. '+(labels(r,d)||'표시한 항목')+'부터 다시 봅시다.',
          '지금 못 고친 것은 메모에 남겨 둘게요.'
        ]:[
          '날짜랑 건수는 맞네요. 첫 장은 이걸로 두죠.',
          '내일은 동료가 쓸 안건이랑 내가 확인할 표를 나눠 적어 봅시다.'
        ]);
        return speech('팀장',[
          '회의는 금요일인데 첫 장에는 목요일로 적혔네요.',
          '처리 건수도 어제 센 표랑 대조해 주세요. 첫 장과 표가 서로 다르면 회의 때 헷갈려요.'
        ]);
      case 5:return speech('팀장',[
        '처리표 날짜랑 합계는 '+name+' 씨가 봐 주세요. 회의 안건 한 장은 옆자리에서 쓸 거예요.',
        '다음 주 목요일 퇴근 전에 저한테 두 장을 보여 주세요. 금요일 아침에 고치려면 바빠요.'
      ]);
      case 8:return speech('팀장',[
        '금요일 회의가 삼십 분 당겨졌어요. 열 시가 아니라 아홉 시 반입니다.',
        '아홉 시 이십 분까지 확인본을 회의실에 놓아 주세요.',
        '달력이랑 문서 첫 장도 바꿔 주세요. 예전 시각을 보고 오지 않게요.'
      ]);
      case 9:return speech('팀장',[
        '공유 폴더에서 파일 세 개만 모아 주세요. 처리 목록, 회의 안건, 어제 시간 바뀐 메일입니다.',
        '이름이 비슷한 옛 초대도 있어요. 메일 날짜까지 보고 골라 주세요.'
      ]);
      case 10:return speech('팀장',[
        '미리보기를 보니 첫 장이 두 번 들어갔네요. 한 장은 예전 날짜예요.',
        '현재 첫 장하고 처리표만 남겨 주세요. 인쇄하면 두 장이면 됩니다.'
      ]);
      case 11:return speech('팀장',[
        '내일 가져갈 두 장을 오늘 보고 갑시다. 첫 장 날짜랑 처리표 합계만 다시 확인해 주세요.',
        '파일 이름 끝에 확인본이라고 붙여 주세요. 아침에 초안을 가져가지 않게요.'
      ]);
      case 12:return speech('팀장',[
        '회의 아홉 시 반이에요. 확인본 한 부 가져오셨어요?',
        '여기 주세요. 첫 장하고 처리표를 같이 볼게요.'
      ]);
      default:return[];
    }
  }
  function peerDialogue(s,d){
    var name=me(s),pet=cat(s),r=workAt(s,d);
    switch(d){
      case 1:return speech('동료',[
        '안녕하세요. 제 자리가 바로 옆이에요.',
        '메신저 초대 왔을 거예요. 점심 갈 때 거기로 알려 드릴게요.'
      ]);
      case 2:return speech('동료',[
        '파일 이름이 너무 비슷하죠. 저도 어제 다른 날 메모를 열었어요.',
        '날짜 네 자리부터 보면 좀 낫더라고요.'
      ]);
      case 3:return speech('동료',num(s,'energy',3)<=1?[
        '커피 가져왔어요. 같이 마셔요.',
        '오늘 많이 피곤해 보여요. 아까 같은 줄을 계속 보고 계셔서요.'
      ]:[
        '저도 합계가 열셋인 줄 알았어요. 위에서 다시 더하니까 다르네요.',
        '퇴근할 때 우산 챙기세요. 밖에 비 오기 시작했어요.'
      ]);
      case 4:return speech('동료',[
        '목요일이랑 금요일이 자꾸 헷갈리네요. 달력부터 다시 봤어요.',
        '제 안건 파일은 내일 정리해서 올릴게요.'
      ]);
      case 5:
        if(!flag(s,'peerKnowsCat')&&num(s,'fur',0)>0)return[
          line('동료','소매에 털 붙었네요. 고양이 키워요?'),
          line(name,'네. '+pet+'라고 해요. 취업 준비할 때부터 같이 살았어요.'),
          line('동료','그럼 요즘은 혼자 집에 있겠네요.'),
          line(name,'네. 혼자 두고 나오는 게 아직 좀 낯설어요.'),
          line('동료','그렇겠네요. 오늘은 몇 시쯤 가세요?'),
          line(name,'일 끝나면 바로 가려고요.')
        ];
        return[
          line('동료','첫 주 끝나가네요. 주말에 뭐 해요?'),
          line(name,'빨래요. 일주일 치가 쌓였어요.'),
          line('동료','저도요. 오늘은 빨리 끝내고 싶네요.')
        ];
      case 8:return speech('동료',[
        '저도 달력 고쳤어요. 금요일에 열 시로 생각하고 오면 늦겠네요.',
        '안건 파일은 금요일에 올려 뒀어요. 못 찾으면 말씀하세요.'
      ]);
      case 9:return speech('동료',flag(s,'borrowedLaptop')?[
        '공용 노트북이면 공유 폴더를 다시 연결해야 할 거예요.',
        '제 컴퓨터에 파일 세 개가 열려 있어요. 연결이 안 되면 링크를 보내 드릴게요.'
      ]:[
        '회의 안건은 이름 끝에 0918 붙은 파일이에요.',
        '아침 초대랑 시간 변경 메일이 같이 있으니 날짜까지 보고 골라 주세요.'
      ]);
      case 10:return speech('동료',[
        '어, 첫 장 두 개 아니에요? 이건 시간이 열 시인데요.',
        '뒤에 있는 아홉 시 반 적힌 걸 남겨야겠네요.'
      ]);
      case 11:return speech('동료',flag(s,'workloadShared')?[
        '부탁하신 회의 안건 파일은 제가 다시 읽었어요. 빠진 줄은 없어요.',
        '처리표 숫자는 확인하고 오셨어요? 그건 원본이랑 같이 봐야 해요.'
      ]:[
        '내일 아침에 종이 찾느라 바쁘겠네요. 저는 가방에 넣어 뒀어요.',
        '파일은 확인본으로 저장했는지 한 번 더 봐요. 저번엔 초안을 뽑아 와서요.'
      ]);
      case 12:
        if(r&&presented(s,r))return flag(s,'peerKnowsCat')?[
          line('동료','첫 회의 어땠어요?'),
          line(name,'긴장했어요. 끝나니까 좀 풀리네요.'),
          line('동료','오늘도 '+pet+' 밥 주러 바로 가세요?'),
          line(name,'네. 밥 먹이고 저도 좀 쉬려고요.')
        ]:[
          line('동료','첫 회의 어땠어요?'),
          line(name,'긴장했어요. 끝나니까 좀 풀리네요.'),
          line('동료','저도 이제 가려고요. 수고했어요.')
        ];
        if(r)return speech('동료',r.status==='late'?[
          '종이는 맞는데 건네는 시간이 좀 늦었네요. 회의 직전에 급했어요.',
          '저는 안건에 나온 얘기만 적고 가려고요.'
        ]:[
          '회의에서 다시 볼 곳이 좀 남았네요.',
          '제가 쓴 안건 파일은 공유 폴더에 있어요. 필요하면 다시 열어 봐요.'
        ]);
        return speech('동료',[
          '확인본은 챙기셨어요? 팀장님이 첫 장부터 보신대요.',
          '저는 안건 파일 열어 뒀어요.'
        ]);
      default:return[];
    }
  }
  function dialogue(s,role){s=s||{};var d=dayOf(s);if(days[d].weekend)return[];if(role==='lead')return leadDialogue(s,d).slice(0,6);if(role==='peer')return peerDialogue(s,d).slice(0,6);return[];}
  function workReport(s,opts){
    s=s||{};var d=dayOf(s),r=workAt(s,d),item=tasks[d];if(!item)return[];
    if(!r)return speech('팀장',[item.goal]);
    if(d===12&&r.completed!==false&&!missing(r).length&&!pending(s)&&(r.status==='late'||r.onTime===false))return speech('팀장',[
      '확인본의 날짜와 숫자는 맞아요. 다만 약속한 아홉 시 이십 분을 넘겼네요.',
      '종이를 놓을 시간까지 생각하고 와야 해요. 우선 이걸 나눠서 같이 봅시다.'
    ]);
    if(r.completed===false&&!missing(r).length&&!pending(s))return speech('팀장',d===12?[
      '확인본을 건네는 단계까지 마치지 못했네요. 지금 모은 종이부터 같이 확인합시다.'
    ]:[
      '고른 내용은 남겨 뒀어요. 오늘은 확인하고 공유하는 데까지 마치지 못했네요.'
    ]);
    if(incomplete(r)||(d===12&&!presented(s,r)))return speech('팀장',[
      d===12?'이 부분은 다시 봐야겠어요. 지금 가져온 종이에서 고칠 곳을 표시할게요.':'아직 확인할 항목이 남았어요: '+(labels(r,d)||'표시한 항목')+'.',
      d===12&&pending(s)?pending(s)+' 항목을 원본하고 다시 확인합시다.':item.remainingText
    ]);
    var text=[item.successText];
    if(r.status==='strained')text.push('확인은 됐는데 같은 줄을 여러 번 읽고 있었어요. 오늘 많이 피곤한가 봐요.');
    else if(num(r,'lateMinutes',0)>0)text.push('오늘 늦게 도착한 만큼 확인할 시간이 짧았죠. 가져올 것은 빠뜨리지 않았는지 봤어요.');
    else if(d===11&&pending(s))text.push('전에 표시한 '+pending(s)+' 항목도 회의 전에 확인해야 해요.');
    return speech('팀장',text);
  }
  function homeLine(s){
    s=s||{};var d=dayOf(s),pet=cat(s),r=workAt(s,d);
    if(d===0)return'내일은 첫 출근이다. 노트북과 충전기를 가방에 넣어야 한다.';
    if(d===1)return pet+'가 현관에서 기다린다. 신발을 벗는 동안 내 다리에 몸을 비빈다.';
    if(d===2)return'가방에서 메모를 꺼내 책상에 올렸다. '+pet+'가 그쪽을 바라본다.';
    if(d===3)return'창문이 덜컹거린다. '+pet+'가 소파 뒤에서 몸을 웅크렸다.';
    if(d===4)return s.suitStored?(s.hoodie?'정장은 방 안에 걸려 있다. '+pet+'는 거실의 회색 후드티를 앞발로 누른다.':'정장은 방 안에 걸려 있다. '+pet+'는 소파 앞에 앉아 나를 본다.'):'정장을 소파에 벗어 뒀다. '+pet+'가 소매 냄새를 맡는다.';
    if(d===5)return'이번 주 출근은 끝났다. 세탁할 옷을 모으는 동안 '+pet+'가 옆에 앉는다.';
    if(d===6)return'출근하지 않는 토요일이다. 빨래와 장보기를 마치고 나면 쉴 수 있다.';
    if(d===7)return'내일 가져갈 가방을 챙긴다. '+pet+'가 내 발 가까이에 누웠다.';
    if(d===8)return'금요일 회의 시간을 달력에 고쳤다. '+pet+'는 밥그릇 앞에서 나를 본다.';
    if(d===9)return incomplete(r)?'확인하지 못한 파일 이름을 적어 왔다. 가방을 내려놓고 '+pet+'를 찾는다.':'회사에서 파일을 확인하고 돌아왔다. '+pet+'가 현관으로 다가온다.';
    if(d===10)return num(s,'food',0)<=0?'사료 봉지가 비었다. 오늘 먹일 사료를 사 와야 한다.':'사료 봉지의 남은 양을 살핀다. '+pet+'가 봉지 소리에 고개를 든다.';
    if(d===11)return num(s.flags||{},'workDelayMinutes',0)>0?'생각보다 늦게 돌아왔다. '+pet+'가 가방을 내려놓는 나를 올려다본다.':'내일 가져갈 가방을 내려놓았다. '+pet+'가 내 발에 몸을 비빈다.';
    if(d===12){
      if(r&&r.status==='late'&&!incomplete(r)&&!pending(s))return'확인본은 맞았지만 약속한 시각보다 늦게 건넸다. 집에 돌아오니 '+pet+'가 고개를 든다.';
      return presented(s,r)?'첫 회의가 끝났다. 집에 돌아오니 '+pet+'가 밥그릇 앞에서 기다린다.':'회의에서 확인을 마치지 못했다. 현관문을 열자 '+pet+'가 고개를 든다.';
    }
    return pet+'가 내가 움직이는 방향으로 고개를 돌린다.';
  }
  return{days:days,phone:phone,opening:opening,tasks:tasks,preparations:preparations,task:task,workTask:task,dialogue:dialogue,workReport:workReport,homeLine:homeLine};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=LifeStory;
