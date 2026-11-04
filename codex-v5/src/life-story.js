/* 짧은 직접 상담과 생활 장면. 값의 변경은 Life가 맡는다. */
var LifeStory=(function(){
 'use strict';
 var days=Array.from({length:13},function(_,i){return{date:'4/'+(11+i),weekday:['일','월','화','수','목','금','토'][i%7],weekend:i===6||i===7,event:i===3?'storm':i===4?'hoodie':'routine',task:i===0?'첫 출근 전날':i===6||i===7?'쉬는 날':'고객 상담'};});
 var phone={rejection:{sender:'채용 담당자',title:'지원 결과',preview:'지원 결과를 안내드립니다.',messages:['지원해 주셔서 감사합니다.','이번 채용에서는 함께하지 못하게 되었습니다.']},offer:{sender:'인사 담당자',title:'최종 합격',preview:'최종 합격을 축하드립니다.',messages:['최종 합격을 축하드립니다!','4월 12일(월) 오전 9시에 뵙겠습니다.','노트북과 충전기를 챙겨 주세요.']}};
 var profiles=[
  {name:'이하나',need:'처음 취직했어요. 매달 부담은 작게 하고 싶어요.',question:'지금 꼭 필요한 보장부터 고를 수 있을까요?',options:['예산부터 확인하고 기본 보장을 안내한다','가장 큰 묶음 상품부터 권한다'],correct:0,follow:'한 달에 3만 원 정도면 좋겠어요.',answers:['그 안에서 가능한 보장과 제외 항목을 설명한다','지금 서명하면 자세한 설명은 나중에 한다'],answer:0},
  {name:'박민수',need:'전에 가입한 게 있어요. 같은 보장을 두 번 내고 싶지 않아요.',question:'기존 계약을 먼저 볼 수 있나요?',options:['새 계약부터 작성한다','기존 계약에서 겹치는 부분을 함께 확인한다'],correct:1,follow:'겹치는 보장 하나는 빼고 싶어요.',answers:['빠지는 보장과 달라지는 금액을 짚어 준다','빠지는 항목 없이 모두 필요하다고 한다'],answer:0},
  {name:'최유진',need:'가족을 돌보고 있어서 갑자기 큰돈이 나가는 게 걱정이에요.',question:'제 상황에 맞게 설명해 주실래요?',options:['생활비와 걱정하는 상황을 먼저 묻는다','상품 이름을 빠르게 나열한다'],correct:0,follow:'당장 결정을 재촉받으면 불안해요.',answers:['오늘만 가능한 계약이라고 재촉한다','이해한 내용을 확인하고 생각할 시간을 준다'],answer:1},
  {name:'정수아',need:'아까 설명을 잘 못 들었어요. 어려운 용어가 많네요.',question:'조금 쉽게 다시 설명해 주실 수 있나요?',options:['이미 설명한 부분이니 서명부터 부탁한다','일상에서 생길 수 있는 상황으로 다시 설명한다'],correct:1,follow:'그러면 보장되지 않는 경우도 있나요?',answers:['제외되는 상황도 함께 설명한다','걱정할 필요가 없다고만 한다'],answer:0},
  {name:'강지훈',need:'일하는 시간이 일정하지 않아요. 납입 날짜가 걱정이에요.',question:'계속 유지할 수 있는 조건이 중요해요.',options:['수입 주기와 납입 가능 시점을 먼저 확인한다','첫 달 금액만 보고 계약을 권한다'],correct:0,follow:'중간에 부담이 커지면 어떻게 하나요?',answers:['아무 문제도 없을 거라고 단정한다','변경·중단 조건과 불이익을 설명한다'],answer:1}
 ];
 function customers(s){var p=profiles[(s.day-1+profiles.length)%profiles.length],q=profiles[s.day%profiles.length],r=profiles[(s.day+1)%profiles.length];return[p,q,r].map(function(v,i){return Object.assign({},v,{id:s.day+':'+i,variant:['customerA','customerB','customerC'][i],optional:i===2,correct:[v.correct,v.answer],concerns:v.need});});}
 function message(s,kind){var p=phone[kind];if(!p)return p;return Object.assign({},p,{messages:p.messages.map(function(text,i){return kind==='rejection'&&i===0?s.me+'님, '+text:text;})});}
 function nightReason(night){var order=['thirst','hunger','litter','rain','calling','play'];return order.find(function(reason){return night.wakeReasons.includes(reason);})||'play';}
 function nightLine(s,reason){return{thirst:'물을 못 챙겼구나. 빈 그릇을 핥고 있었네.',hunger:'저녁 밥을 못 줬구나. 배가 고팠겠다.',litter:'모래가 더러워서 들어가지 못하고 있네.',rain:'창문 소리에 놀랐구나. 먼저 창을 잠가야겠다.',calling:'닫힌 문 앞에서 불렀구나. 혼자 있는 게 불안했나 봐.',play:'오늘 못 놀아 줘서 아직 힘이 남았나 봐.'}[reason];}
 function dialogue(s,role){if(role==='peer'){
  var last=s.work.filter(function(w){return w.day<s.day;}).at(-1),lines=[];
  if(s.flags.lateMinutes>0)lines.push('오늘 아침 많이 바빴죠? 첫 약속이 밀리면 저는 점심 전에 순서를 다시 잡아요.');
  if(s.clothesOdor&&s.clothesOdor.suit>=2)lines.push('옷에 집 냄새가 조금 남았어요. 고양이 화장실을 치우고 환기하면 한결 낫더라고요.');
  else if(s.clothesFur.suit>=6)lines.push('소매에 털이 붙었네요. 고객 오시기 전에 한번 떼면 좋겠어요.');
  if(s.energy<=1)lines.push('밤에 잘 못 주무셨어요? 저는 설명하다 헷갈리면 잠깐 멈추고 고객 말을 다시 확인해요.');
  if(last&&last.income>=32000)lines.push('어제 계약 잘 마치셨네요. 받은 수당으로 오늘 저녁은 조금 여유롭게 보내세요.');
  else if(last&&last.contracts===0)lines.push('어제 계약이 안 돼서 속상했죠. 상담 수당은 들어왔으니 오늘 한 분씩 다시 해 봐요.');
  var everyday=['고양이 이름이 '+s.cat+'라고 했죠? 집에 가면 현관까지 마중 나와요?','저는 퇴근 전에 장볼 걸 적어 둬요. 집에 갔다 다시 나오면 너무 늦더라고요.','어제는 집안일을 다 하려다 늦게 잤어요. 오늘은 급한 것부터 하려고요.','용품 구역에 자동급식기가 있더라고요. 밥을 대신 챙겨 줘도 놀아 주는 시간은 따로 필요하겠죠.','오늘 상담 끝나고 뭐 하세요? 저는 일찍 들어가서 소파에 좀 앉아 있으려고요.'];
  lines.push(everyday[(s.day-1)%everyday.length]);if(s.day===1&&!s.roller.owned)lines.unshift('저는 상담 전에 돌돌이로 소매를 확인해요. 슈퍼에서 4천 원에 샀어요.');return lines.slice(0,3).map(function(text){return{who:'동료',text:text};});}
  var lines=[];if(s.day===1)lines.push({who:'팀장',text:s.me+' 씨, 고객 상담·영업팀에 오신 걸 환영해요. 오늘 고객 두 분의 필요와 예산을 듣고 제안해 주세요.'},{who:'팀장',text:'끝까지 상담하면 한 분당 8,000원, 계약이 되면 8,000원이 더 붙어요. 퇴근 정산 때 바로 입금됩니다.'});
  if(s.clothesFur.suit>=6)lines.push({who:'팀장',text:'정장에 털이 많이 붙었어요. 고객을 만나기 전에는 옷부터 확인해 주세요. 오늘 상담 반응에도 영향이 있을 거예요.'});
  if(s.clothesOdor&&s.clothesOdor.suit>=2)lines.push({who:'팀장',text:'옷에 냄새가 배어 있어요. 상담실을 환기하고 다음 출근 전에는 집의 모래와 옷을 함께 정리해 주세요.'});
  if(s.energy<=0)lines.push({who:'팀장',text:'많이 피곤해 보여요. 고객이 말한 내용을 한 번 더 확인하면서 진행해 주세요.'});
  if(s.day!==1)lines.push({who:'팀장',text:s.day===4?'예약 고객 두 분 뒤에 추가 상담 요청이 있어요. 받으면 수입이 늘지만 한 시간 늦게 퇴근해요.':'오늘도 예약 고객 두 분이에요. 상담실에서 이야기 듣고 제안해 주세요.'});return lines;}
 function workReport(s){var r=s.work.find(function(w){return w.day===s.day;});return r?[{who:'팀장',text:'오늘 상담 '+r.consultations+'건, 계약 '+r.contracts+'건입니다. '+r.income.toLocaleString()+'원을 입금했어요.'}]:[];}
 function homeLine(s){if(s.flags.morningCareMissed)return Life.josa(s.cat,'subject')+' 빈 밥그릇과 현관 사이를 오간다. 아침에 두고 간 그릇이 그대로다.';if(s.day===3&&!s.windowClosed)return '천둥이 치자 '+Life.josa(s.cat,'subject')+' 소파 뒤로 숨었다. 창문이 덜컹거린다.';if(!s.needs.played)return Life.josa(s.cat,'subject')+' 쥐 인형을 물고 와 내 발 앞에 내려놓았다.';return Life.josa(s.cat,'subject')+' 현관 앞에 앉아 기다렸다.';}
 return{days:days,phone:phone,message:message,nightReason:nightReason,nightLine:nightLine,opening:[{who:'나',text:'고양이?'},{who:'나',text:'쫄딱 젖었잖아…'}],customers:customers,dialogue:dialogue,workReport:workReport,homeLine:homeLine,task:function(){return{kind:'consultation'};}};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=LifeStory;
