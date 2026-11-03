/* 장면 속 대사와 짧은 업무 안내. 상태 변경은 Life와 조작 코드에서 처리한다. */
var LifeStory=(function(){
 'use strict';
 var days=[
  {date:'9/13',weekday:'일',weekend:true,event:'first',task:'첫 출근 전날',eveningHook:'내일은 첫 출근이다. 열린 가방 옆에서 보리가 놀고 있다.'},
  {date:'9/14',weekday:'월',event:'first',task:'첫 출근',eveningHook:'현관문을 열자 보리가 발치로 다가왔다. 집을 비운 건 오늘이 처음이다.'},
  {date:'9/15',weekday:'화',event:'desk',task:'섞인 파일 정리',eveningHook:'퇴근해 돌아오니 보리가 장난감 옆에 앉아 있다.'},
  {date:'9/16',weekday:'수',event:'storm',task:'비 오는 날',eveningHook:'집 안이 조용하다. 천둥이 치자 소파 뒤에서 꼬리가 움찔했다.'},
  {date:'9/17',weekday:'목',event:'closet',task:'퇴근 전 부탁',eveningHook:'집에 돌아와 정장을 벗었다.'},
  {date:'9/18',weekday:'금',event:'plan',task:'첫 금요일',eveningHook:'첫 주 출근이 끝났다. 세탁 바구니는 가득하고 보리는 장난감을 끌고 왔다.'},
  {date:'9/19',weekday:'토',weekend:true,event:'weekend',task:'집에서 보내는 토요일',eveningHook:'알람 없는 아침이다. 보리가 이불 끝을 앞발로 꾹꾹 누른다.'},
  {date:'9/20',weekday:'일',weekend:true,event:'plan',task:'일요일',eveningHook:'빨래가 마르는 동안 보리가 창가에서 졸고 있다.'},
  {date:'9/21',weekday:'월',event:'schedule',task:'다시 월요일',eveningHook:'다시 출근한 월요일이 끝났다.'},
  {date:'9/22',weekday:'화',event:'deadline',task:'이번 주 파일 정리',eveningHook:'보리가 빈 그릇을 앞발로 밀었다. 먼저 밥부터 챙길까.'},
  {date:'9/23',weekday:'수',event:'preview',task:'수요일',eveningHook:'소파에 앉자 보리가 장난감을 발 앞에 내려놓았다.'},
  {date:'9/24',weekday:'목',event:'handoff',task:'회의 전날',eveningHook:'내일은 첫 팀 회의다. 가져갈 노트북을 챙겨야 한다.'},
  {date:'9/25',weekday:'금',event:'meeting',task:'첫 팀 회의',eveningHook:'금요일이다. 현관 앞에 가방을 내려놓고 보리 이름을 불렀다.'}
 ];
 var phone={
  rejection:{sender:'채용 담당자',title:'지원 결과 안내',body:'이번 채용에는 함께하지 못하게 되었습니다.'},
  offer:{sender:'인사 담당자',title:'첫 출근 안내',body:'합격을 축하드립니다. 9월 14일 월요일 오전 9시까지 출근해 주세요. 노트북과 충전기를 가져오시면 됩니다.'}
 };
 var opening=[{who:'고양이',text:'야옹…'},{who:'나',text:'거기 있으면 다 젖겠다.'},{who:'나',text:'우리 집에서 말리고 갈래?'}];
 function clone(v){return JSON.parse(JSON.stringify(v));}
 function clampDay(s){return Math.max(0,Math.min(12,Math.floor(Number(s&&s.day)||0)));}
 function nextWorkDay(day){day++;while(day===6||day===7)day++;return Math.min(12,day);}
 function line(who,text){return{who:who,text:text};}
 function speech(who,texts){return texts.map(function(text){return line(who,text);});}
 function me(s){return s&&s.me||'김신입';}
 function cat(s){return s&&s.cat||'보리';}
 function workAt(s,day){return (s.work||[]).find(function(w){return w.day===day;});}
 function sortedTask(day,dates){var slots=[],cards=[],solution={};dates.forEach(function(date,i){var id='file'+date;slots.push({id:id,label:parseInt(date.slice(0,2),10)+'/'+parseInt(date.slice(2),10),hint:''});cards.push({id:'dated-'+date,text:'메모_'+date,sourceId:'dates',icon:'sheet'});solution[id]='dated-'+date;});return{id:'files-'+day,kind:'sort',title:'날짜별 파일 정리',goal:'파일을 같은 날짜의 폴더에 넣는다.',sources:[],steps:['같은 날짜의 폴더로 옮긴다.'],slots:slots,cards:cards,solution:solution,successText:'날짜별로 파일을 나눴다.',remainingText:'아직 정리하지 않은 파일이 남았다.',preparedHints:[],hints:[]};}
 function routine(day){return{id:'shift-'+day,kind:'routine',title:days[day].task,goal:'오늘 맡은 일을 한다.',sources:[],steps:[],slots:[],cards:[],solution:{},successText:'오늘 일을 마쳤다.',remainingText:'오늘 일을 마치지 못했다.',preparedHints:[],hints:[]};}
 var tasks=days.map(function(day,i){return i===0||i===6||i===7?null:routine(i);});
 tasks[2]=sortedTask(2,['0911','0914','0915']);tasks[9]=sortedTask(9,['0921','0922','0923']);
 function bagTask(day){return{id:'bag-'+day,kind:'bag',title:'내일 가져갈 가방',goal:'노트북과 충전기, 수첩을 가방에 넣는다.',day:day,targetDay:day,sources:[],steps:[],slots:[{id:'laptop',label:'노트북'},{id:'charger',label:'충전기'},{id:'notebook',label:'수첩'}],cards:[{id:'laptop',text:'노트북',type:'laptop'},{id:'charger',text:'충전기',type:'charger'},{id:'notebook',text:'수첩',type:'notebook'}],solution:{laptop:'laptop',charger:'charger',notebook:'notebook'},successText:'가방을 챙겼다.',remainingText:'가방에 넣을 물건이 남았다.',preparedHints:[],hints:[]};}
 var preparations={};[1,2,3,4,5,8,9,10,11,12].forEach(function(day){preparations[day]=bagTask(day);});
 function task(s,mode){var day=clampDay(s);if(mode==='prepare')return clone(bagTask(nextWorkDay(day)));return clone(tasks[day]||routine(day));}
 function leadDialogue(s,day){
  var name=me(s),tired=(s.energy||0)<=1||s.strain>=7;
  if(workAt(s,day))return workReport(s);
  switch(day){
   case 1:return speech('팀장',[name+' 씨, 오시느라 수고하셨어요. 이쪽이 쓰실 자리예요.','오늘은 제가 옆에서 알려 드릴게요. 컴퓨터를 켜고 메일이 열리는지만 같이 볼까요?']);
   case 2:return speech('팀장',['이 파일 세 개를 날짜별로 나눠 주세요. 이름 끝의 네 자리가 날짜예요.','다 하시면 오늘 나머지 일은 제가 같이 볼게요.']);
   case 3:return speech('팀장',tired?['오늘 많이 피곤해 보이시네요. 어제 하던 건 제가 먼저 확인해 둘게요.','헷갈리는 게 있으면 바로 말씀해 주세요. 혼자 다시 하지 마시고요.']:['오늘은 어제 정리한 파일로 작업해 볼게요. 제가 먼저 한 번 보여 드릴게요.','밖에 비가 오네요. 퇴근할 때 우산 잊지 마세요.']);
   case 4:return speech('팀장',['마지막으로 이 문서 한 장만 봐 주실 수 있나요? 내일 오전까지면 돼요.','오늘 보고 가셔도 되고, 내일 출근해서 먼저 하셔도 괜찮아요.']);
   case 5:return speech('팀장',['첫 주 고생 많으셨어요. 오늘은 하던 일 마무리하고 가시면 돼요.','다음 주 금요일 아홉 시 반에 팀 회의가 있어요. 이번 주 하신 일은 제가 같이 설명할게요.']);
   case 8:return speech('팀장',['주말 잘 보내셨어요? 금요일 팀 회의는 아홉 시 반에 시작해요.','처음 맡으신 파일 정리 이야기를 짧게 해 주시면 돼요. 수첩에 적어 두셔도 좋고요.']);
   case 9:return speech('팀장',['이번 주 파일이 들어왔어요. 지난번처럼 날짜별로 나눠 주세요.','오늘도 파일 세 개예요. 나머지는 제가 먼저 확인해 뒀어요.']);
   case 10:return speech('팀장',tired?['같은 파일을 두 번 열고 계시더라고요. 제가 옆에서 같이 볼게요.','오늘 일을 마치고 나면 푹 쉬세요. 금요일 회의도 길게 하실 필요 없어요.']:['지난번보다 금방 찾으시네요. 날짜별로 나눠 둬서 저도 편했어요.','오늘은 이 일 마무리하면 퇴근하셔도 돼요.']);
   case 11:return speech('팀장',['내일은 회의실에서 같이 이야기할게요. 새로 만들 자료는 없어요.','노트북이랑 수첩만 챙겨 오세요. 해 보신 일을 편하게 말씀해 주시면 됩니다.']);
   case 12:return speech('팀장',s.flags&&s.flags.borrowedLaptop?['노트북을 두고 오셨군요. 일단 제 옆에서 같이 보시죠.','설정은 회의 뒤에 다시 맞추셔야겠어요. 오늘은 끝나는 시간이 좀 늦겠네요.']:['오셨어요? 아홉 시 반 회의라 곧 시작할게요.','이번 주 파일은 어떻게 정리하셨는지 짧게 들려주세요.']);
   default:return[];
  }
 }
 function peerDialogue(s,day){var pet=cat(s),name=me(s),known=!!(s.flags&&s.flags.peerKnowsCat),fur=(s.fur||0)>0;
  if(day===1&&fur)return[line('동료','안녕하세요. 바로 옆자리예요. 어, 소매에 털 붙었네요. 고양이 키우세요?'),line(name,'네. '+pet+'라고 해요. 취업 준비할 때 데려왔어요.'),line('동료','저도 검은 옷만 입으면 난리예요. 돌돌이 하나 있으면 편해요.'),line(name,'퇴근길에 하나 사야겠네요.')];
  if(day===1)return speech('동료',['안녕하세요. 바로 옆자리예요. 점심 갈 때 같이 가요.','궁금한 건 편하게 물어보세요. 저도 들어온 지 얼마 안 됐어요.']);
  if(day===2)return speech('동료',['저도 어제 다른 날 파일을 열었어요. 날짜부터 보면 덜 헷갈리더라고요.']);
  if(day===3)return speech('동료',known?['천둥 소리 꽤 크네요. 집에 있는 고양이는 괜찮을까요?']:['밖에 비가 엄청 와요. 퇴근할 때 조심해서 가세요.']);
  if(day===4)return speech('동료',['저는 오늘 먼저 가 볼게요. 내일 뵈어요.']);
  if(day===5&&!known&&fur)return[line('동료','소매에 고양이 털이 붙었네요. 같이 사는 고양이가 있어요?'),line(name,'네. '+pet+'라고 해요.'),line('동료','아, '+pet+'. 이제 이름 알았네요.')];
  if(day===5)return speech('동료',['내일은 늦잠 좀 자려고요. 일단 밀린 빨래부터 해야겠지만요.']);
  if(day===8)return speech('동료',known?['주말에는 '+pet+'랑 많이 놀았어요?']:['주말엔 뭐 하셨어요? 저는 집 정리하다 끝났어요.']);
  if(day===9)return speech('동료',['오늘도 같은 파일 정리네요. 이번에는 저보다 빨리 끝내시겠는데요?']);
  if(day===10)return speech('동료',known?['아까 휴대폰 배경 봤어요. '+pet+'가 상자 안에 쏙 들어가 있네요.']:['오늘은 좀 일찍 나가도 되겠어요. 일이 거의 끝났네요.']);
  if(day===11)return speech('동료',['내일 회의 처음이라 떨려요? 저도 처음엔 말이 안 나오더라고요.','해 본 일만 편하게 말하면 돼요. 질문 나오면 저도 옆에서 같이 볼게요.']);
  if(day===12)return speech('동료',s.project&&s.project.presented?['아까 설명 잘 들었어요. 이번 주도 고생하셨어요.']:['오늘 회의 긴장되셨죠. 빠뜨린 건 월요일에 같이 확인해요.']);
  return[];
 }
 function dialogue(s,role){var day=clampDay(s);if(role==='lead')return leadDialogue(s,day);if(role==='peer')return peerDialogue(s,day);return[];}
 function workReport(s){var report=workAt(s,clampDay(s));if(!report)return[];
  if(report.status==='missed'||report.status==='partial')return speech('팀장',['아직 남은 일이 있네요. 그대로 넘기면 내일 파일을 잘못 열 수도 있어요.','남은 부분은 같이 확인하고 가죠. 오늘은 퇴근이 조금 늦어지겠어요.']);
  if(report.borrowedLaptop)return speech('팀장',['오늘은 공용 노트북으로 마무리됐네요. 설정하시느라 늦으셨어요.','내일은 쓰시던 가방을 꼭 챙겨 오세요.']);
  if(report.day===12)return speech('팀장',s.project.presented?['설명 잘 들었어요. 첫 두 주 고생 많으셨습니다.','오늘 일은 여기까지 하시고 퇴근하세요.']:['오늘 빠뜨린 부분은 월요일에 같이 확인하겠습니다.','다음에는 출근 전에 필요한 물건부터 확인해 주세요.']);
  if(report.day===2||report.day===9)return speech('팀장',['날짜별로 잘 나눠 주셨네요. 덕분에 파일 찾기가 편하겠어요.','오늘 나머지 일도 마무리됐어요. 수고하셨습니다.']);
  if(report.extraMinutes>=30)return speech('팀장',['밀린 일까지 보시느라 늦으셨네요. 오늘은 여기까지 하겠습니다.','먼저 퇴근하세요. 수고하셨어요.']);
  return speech('팀장',['오늘 일은 잘 마무리됐어요. 수고하셨습니다.','퇴근하셔도 됩니다. 내일 뵐게요.']);
 }
 function workChoice(s){var day=clampDay(s);if(day!==4)return null;return{prompt:'문서 한 장을 언제 확인할까?',choices:[{id:'today',text:'오늘 확인하고 간다',after:'문서를 확인하고 나오니 밖이 어두워졌다.',overtime:true},{id:'tomorrow',text:'내일 출근해서 먼저 한다',after:'내일 아침에 먼저 확인하겠다고 말하고 퇴근했다.',defer:true}]};}
 function homeLine(s){var pet=cat(s),report=workAt(s,clampDay(s));if(s.flags&&s.flags.catWithdrawn)return pet+'는 소파 아래에 있었다. 이름을 불러도 다가오지 않았다.';if(s.flags&&s.flags.morningCareMissed)return pet+'가 현관에서 밥그릇까지 몇 번이나 오갔다. 아침에 비워 둔 그릇이 그대로다.';if(report&&report.extraMinutes>=30)return '늦게 돌아왔다. '+pet+'가 현관 앞에서 기다리고 있었다.';return days[clampDay(s)].eveningHook;}
 return{days:days,phone:phone,opening:opening,tasks:tasks,preparations:preparations,task:task,dialogue:dialogue,workReport:workReport,homeLine:homeLine,workChoice:workChoice};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=LifeStory;
