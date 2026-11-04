/* 짧은 직접 상담과 생활 장면. 값의 변경은 Life가 맡는다. */
var LifeStory=(function(){
 'use strict';
 var days=Array.from({length:13},function(_,i){return{date:'4/'+(11+i),weekday:['일','월','화','수','목','금','토'][i%7],weekend:i===6||i===7,event:i===3?'storm':i===4?'hoodie':'routine',task:i===0?'첫 출근 전날':i===6||i===7?'쉬는 날':'고객 상담'};});
 var phone={rejection:{sender:'채용 담당자',title:'지원 결과 안내',body:'안녕하세요. 이번 채용에서는 함께하지 못하게 되었습니다. 지원해 주신 시간과 관심에 감사드립니다.'},offer:{sender:'인사 담당자',title:'최종 합격 안내',body:'고객 상담·영업팀에 합격하셨습니다. 4월 12일 월요일 오전 9시 첫 출근입니다. 상담용 노트북과 충전기를 가져와 주세요. 상담 수당과 계약 수당은 매일 퇴근 정산 뒤 입금됩니다.'}};
 var profiles=[
  {name:'이하나',need:'처음 취직했어요. 매달 부담은 작게 하고 싶어요.',question:'지금 꼭 필요한 보장부터 고를 수 있을까요?',options:['예산부터 확인하고 기본 보장을 안내한다','가장 큰 묶음 상품부터 권한다'],correct:0,follow:'한 달에 3만 원 정도면 좋겠어요.',answers:['그 안에서 가능한 보장과 제외 항목을 설명한다','지금 서명하면 자세한 설명은 나중에 한다'],answer:0},
  {name:'박민수',need:'전에 가입한 게 있어요. 같은 보장을 두 번 내고 싶지 않아요.',question:'기존 계약을 먼저 볼 수 있나요?',options:['새 계약부터 작성한다','기존 계약에서 겹치는 부분을 함께 확인한다'],correct:1,follow:'겹치는 보장 하나는 빼고 싶어요.',answers:['빠지는 보장과 달라지는 금액을 짚어 준다','빠지는 항목 없이 모두 필요하다고 한다'],answer:0},
  {name:'최유진',need:'가족을 돌보고 있어서 갑자기 큰돈이 나가는 게 걱정이에요.',question:'제 상황에 맞게 설명해 주실래요?',options:['생활비와 걱정하는 상황을 먼저 묻는다','상품 이름을 빠르게 나열한다'],correct:0,follow:'당장 결정을 재촉받으면 불안해요.',answers:['오늘만 가능한 계약이라고 재촉한다','이해한 내용을 확인하고 생각할 시간을 준다'],answer:1},
  {name:'정수아',need:'아까 설명을 잘 못 들었어요. 어려운 용어가 많네요.',question:'조금 쉽게 다시 설명해 주실 수 있나요?',options:['이미 설명한 부분이니 서명부터 부탁한다','일상에서 생길 수 있는 상황으로 다시 설명한다'],correct:1,follow:'그러면 보장되지 않는 경우도 있나요?',answers:['제외되는 상황도 함께 설명한다','걱정할 필요가 없다고만 한다'],answer:0},
  {name:'강지훈',need:'일하는 시간이 일정하지 않아요. 납입 날짜가 걱정이에요.',question:'계속 유지할 수 있는 조건이 중요해요.',options:['수입 주기와 납입 가능 시점을 먼저 확인한다','첫 달 금액만 보고 계약을 권한다'],correct:0,follow:'중간에 부담이 커지면 어떻게 하나요?',answers:['아무 문제도 없을 거라고 단정한다','변경·중단 조건과 불이익을 설명한다'],answer:1}
 ];
 function customers(s){var p=profiles[(s.day-1+profiles.length)%profiles.length],q=profiles[s.day%profiles.length],r=profiles[(s.day+1)%profiles.length];return[p,q,r].map(function(v,i){return Object.assign({},v,{id:s.day+':'+i,variant:['customerA','customerB','customerC'][i],optional:i===2,correct:[v.correct,v.answer],concerns:v.need});});}
 function dialogue(s,role){if(role==='peer')return[{who:'동료',text:s.roller.owned?'돌돌이 사셨네요. 상담 전에 소매를 확인하면 마음이 편해요.':'대면 상담은 첫인상도 중요하더라고요. 저는 아침에 돌돌이를 써요. 슈퍼에 4천 원이에요.'}];var lines=[];if(s.day===1)lines.push({who:'팀장',text:s.me+' 씨, 고객 상담·영업팀에 오신 걸 환영해요. 오늘 고객 두 분의 필요와 예산을 듣고 제안해 주세요.'},{who:'팀장',text:'끝까지 상담하면 한 분당 12,000원, 계약이 되면 12,000원이 더 붙어요. 퇴근 정산 때 바로 입금됩니다.'});if(s.clothesFur.suit>=6)lines.push({who:'팀장',text:'정장에 털이 많이 붙었어요. 고객을 만나기 전에는 옷부터 확인해 주세요. 오늘 상담 반응에도 영향이 있을 거예요.'});if(s.energy<=0)lines.push({who:'팀장',text:'많이 피곤해 보여요. 고객이 말한 내용을 한 번 더 확인하면서 진행해 주세요.'});if(s.day!==1)lines.push({who:'팀장',text:s.day===4?'예약 고객 두 분 뒤에 추가 상담 요청이 있어요. 받으면 수입이 늘지만 한 시간 늦게 퇴근해요.':'오늘도 예약 고객 두 분이에요. 상담실에서 이야기 듣고 제안해 주세요.'});return lines;}
 function workReport(s){var r=s.work.find(function(w){return w.day===s.day;});return r?[{who:'팀장',text:'오늘 상담 '+r.consultations+'건, 계약 '+r.contracts+'건입니다. '+r.income.toLocaleString()+'원을 입금했어요.'}]:[];}
 function homeLine(s){if(s.flags.morningCareMissed)return Life.josa(s.cat,'subject')+' 빈 밥그릇과 현관 사이를 오간다. 아침에 두고 간 그릇이 그대로다.';if(s.day===3&&!s.windowClosed)return '천둥이 치자 '+Life.josa(s.cat,'subject')+' 소파 뒤로 숨었다. 창문이 덜컹거린다.';if(!s.needs.played)return Life.josa(s.cat,'subject')+' 쥐 인형을 물고 와 내 발 앞에 내려놓았다.';return Life.josa(s.cat,'subject')+' 현관 앞에 앉아 기다렸다.';}
 return{days:days,phone:phone,opening:[{who:'나',text:'고양이?'},{who:'나',text:'쫄딱 젖었잖아…'}],customers:customers,dialogue:dialogue,workReport:workReport,homeLine:homeLine,task:function(){return{kind:'consultation'};}};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=LifeStory;
