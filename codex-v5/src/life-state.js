/* 생활과 돌봄의 상태. 화면이나 브라우저 없이 같은 규칙을 검사할 수 있다. */
var Life=(function(){
 'use strict';
 var BEDTIME=1380,MORNING_START=440,DEPARTURE=490;
 var DURATIONS={dress:5,makeBed:3,packBag:5,pickBag:0,feed:10,water:5,pet:0,play:30,prepare:30,rest:30,hoodie:15,storeSuit:5,deskSpace:15,calmRain:30,weekendSpace:45,phonePlan:0,requestFiles:0,openReference:0,workReview:0,dishes:20,laundry:60,tidy:45};
 var BIG={play:1,prepare:1,rest:1,hoodie:1,deskSpace:1,calmRain:1,weekendSpace:1,laundry:1,dishes:1,tidy:1};
 var schedule=[
  {day:0,task:'첫 출근 전날',required:[]},
  {day:1,task:'첫 출근',required:[]},
  {day:2,task:'날짜별 파일 정리',required:['file0911','file0914','file0915']},
  {day:3,task:'비 오는 수요일',required:[]},
  {day:4,task:'퇴근 전 부탁',required:[],deadline:true},
  {day:5,task:'첫 금요일',required:[]},
  {day:6,task:'주말',required:[],weekend:true},
  {day:7,task:'일요일',required:[],weekend:true},
  {day:8,task:'다시 월요일',required:[]},
  {day:9,task:'이번 주 파일 정리',required:['file0921','file0922','file0923']},
  {day:10,task:'수요일',required:[]},
  {day:11,task:'회의 전날',required:[]},
  {day:12,task:'첫 팀 회의',required:[],deadline:true}
 ];
 function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
 function num(n,f){return Number.isFinite(n)?n:f;}
 function name(n,f){return String(n||'').trim().slice(0,20)||f;}
 function needs(){return{fed:false,played:false,comfort:false};}
 function weekend(day){return day===6||day===7;}
 function nextWorkDay(day){do{day++;}while(weekend(day));return Math.min(12,day);}
 function valid(s){return !!(s&&s.needs&&s.flags&&s.roller&&Array.isArray(s.log));}
 function result(ok,message,cash,minutes,extra){var r={ok:ok,message:message,cost:{cash:cash||0,minutes:minutes||0},minutes:minutes||0};if(extra)Object.keys(extra).forEach(function(k){r[k]=extra[k];});return r;}
 function create(me,cat){return{
  version:3,me:name(me,'김신입'),cat:name(cat,'보리'),day:0,phase:'evening',cash:58000,food:0,favoriteFood:0,water:false,energy:3,prep:0,trust:4,strain:0,routine:0,
  hoodie:false,suitStored:false,needs:needs(),done:{},dailyDone:{},flags:{},log:[],work:[],careLog:[],neglectMeals:0,careDebt:0,workMissed:0,
  eveningSlots:2,eveningUsed:0,eveningMin:0,eveningStartMin:1200,morningMin:0,dayMinutes:0,commuteMin:0,workMin:0,workActionsUsed:0,
  roller:{owned:false,active:false,dirty:0,usedToday:false},fur:0,dressed:false,bedMade:false,bagPacked:false,bagPrepared:false,hasBag:false,packedForDay:null,
  preparedDays:[],planDays:[],issueQueue:[],transactions:[],lastNight:null,nightIssue:null,lastArrivedDay:0,
  project:{title:'첫 팀 회의',meetingDay:12,meetingTime:'09:30',materialsBy:'09:20',presented:false,finished:false,launched:false},support:false
 };}
 function clock(s){var minute;
  if(s.phase==='morning')minute=MORNING_START+(s.morningMin||0);
  else if(s.phase==='work')minute=540+(s.workMin||0)+(s.flags.lateMinutes||0)+(s.flags.borrowedLaptop?45:0);
  else if(s.phase==='afterWork')minute=1080+(s.flags.workDelayMinutes||0);
  else minute=num(s.eveningStartMin,weekend(s.day)?600:1200)+(s.eveningMin||0);
  return{minutes:minute,text:String(Math.floor(minute/60)%24).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'),remaining:Math.max(0,(s.phase==='morning'?DEPARTURE:BEDTIME)-minute),daytime:minute<1200,lateMinutes:s.phase==='morning'?Math.max(0,minute-DEPARTURE):Math.max(0,minute-BEDTIME),departureAt:'08:10',bedtime:'23:00'};
 }
 function timeBand(s){var used=num(s.eveningUsed,0),slots=num(s.eveningSlots,weekend(s.day)?4:2),label,period;
  if(s.phase==='morning'){label='출근 전 아침';period='morning';slots=0;used=0;}
  else if(s.phase==='work'){label='회사에서 보내는 낮';period='work';slots=0;used=0;}
  else if(s.phase==='afterWork'){label=(s.flags.workDelayMinutes||0)>=30?'늦은 퇴근':'퇴근 시간';period='commute';slots=0;used=0;}
  else if(weekend(s.day)){label=['주말 오전','주말 오후','해 질 무렵','주말 저녁','잘 시간'][Math.min(4,used)];period=['morning','afternoon','sunset','evening','night'][Math.min(4,used)];}
  else{label=used>=slots?'잘 시간':used===0?(slots===1?'늦은 저녁':'저녁'):'늦은 저녁';period=used>=slots?'night':'evening';}
  return{label:label,period:period,slots:slots,used:used,remaining:Math.max(0,slots-used),late:used>slots||clock(s).minutes>BEDTIME};
 }
 function fatigue(s){return s.energy<=0||s.strain>=7?'exhausted':s.energy<=1||s.strain>=4?'tired':'normal';}
 function duration(s,type){if(type==='play'&&s.flags.catEager)return 20;return DURATIONS[type];}
 function preparedFor(s,day){return (s.preparedDays||[]).indexOf(day)!==-1;}
 function unresolved(s){return (s.issueQueue||[]).filter(function(i){return !i.resolved;});}
 function refreshCare(s){s.flags.careConcern=(s.careDebt||0)>=2;s.flags.catWithdrawn=(s.careDebt||0)>=3||s.trust<=2;}
 function missedMeal(s,when){s.neglectMeals=(s.neglectMeals||0)+1;s.careDebt=(s.careDebt||0)+1;s.careLog=s.careLog||[];s.careLog.push({day:s.day,when:when,fed:false});refreshCare(s);}
 function canSpend(s,type){if(s.phase!=='evening'||!BIG[type])return null;var band=timeBand(s);return band.remaining?null:result(false,'벌써 잘 시간이다. 밥과 물을 챙기고 오늘은 쉬자.',0,0,{reason:'notEnoughTime',remainingSlots:0,alternatives:['feed','water','sleep']});}
 function spend(s,type,minutes,cash){var before=clock(s).text;
  if(cash){s.cash-=cash;s.transactions.push({day:s.day,type:type,cash:-cash});}
  s.dayMinutes=(s.dayMinutes||0)+minutes;
  if(s.phase==='evening'){
   if(BIG[type]){s.eveningUsed=num(s.eveningUsed,0)+1;s.eveningMin=weekend(s.day)?[0,180,360,540,690][Math.min(4,s.eveningUsed)]:Math.round((1380-s.eveningStartMin-30)*s.eveningUsed/Math.max(1,s.eveningSlots));}
   else s.eveningMin=(s.eveningMin||0)+minutes;
  }else if(s.phase==='work')s.workMin=(s.workMin||0)+minutes;
  else if(s.phase==='afterWork')s.commuteMin=(s.commuteMin||0)+minutes;
  else s.morningMin=(s.morningMin||0)+minutes;
  s.done[type]=true;return{before:before,after:clock(s).text};
 }
 function purchase(s,type,price,portions,favorite){if(s.cash<price)return result(false,'돈이 모자란다. 한 끼 포장도 살 수 있는지 확인해 보자.',0,0,{reason:'notEnoughCash',needed:price,alternatives:['buyFood','smallFood']});var first=!s.flags.initialShopDone,time=spend(s,type,0,price);s.food+=portions;if(favorite)s.favoriteFood+=portions;s.flags.initialShopDone=true;s.flags.foodLowAcknowledged=false;return result(true,first?'고양이용 사료와 그릇을 샀다. 집에 가서 조금 먹여 보자.':favorite?'닭고기 습식 사료를 샀다.':'먹이던 건사료를 샀다.',price,0,{clock:time,portions:portions,favorite:favorite,firstPurchase:first});}
 function ready(s){var problems=[];if(weekend(s.day))problems.push('weekend');if(s.phase!=='morning')problems.push('wrongPhase');if(!s.dressed)problems.push('notDressed');if(!s.hasBag&&!s.flags.borrowedLaptop)problems.push('noBag');return{ok:!problems.length,problems:problems,dressed:s.dressed,hasBag:s.hasBag,bagPacked:s.bagPacked,prepared:!!(s.hasBag&&s.bagPrepared),minutesUntilDeparture:clock(s).remaining,lateMinutes:Math.max(0,(s.morningMin||0)-50),alternatives:!s.hasBag?['packBag','pickBag','borrowLaptop']:[]};}
 function workTask(s){var task=schedule[clamp(s.day,0,12)],prepared=!!(s.hasBag&&s.bagPrepared&&preparedFor(s,s.day)),late=num(s.flags.lateMinutes,Math.max(0,(s.morningMin||0)-50));return{day:s.day,title:task.task,deadline:!!task.deadline,required:task.required.slice(),prepared:prepared,clueAvailable:true,sourceAvailable:true,lateMinutes:late,borrowedLaptop:!!s.flags.borrowedLaptop,missingFiles:false,missingPhotos:false,spentMinutes:s.workMin||0,availableMinutes:480,deadlineAt:s.day===12?'09:20':null,meetingAt:s.day===12?'09:30':null,extraSteps:[],carryover:unresolved(s).map(function(i){return Object.assign({},i);})};}
 function workBudget(s){return{total:1,remaining:1,spent:0,fatigue:fatigue(s),prepared:workTask(s).prepared,sourceAvailable:true,hints:[],availableMinutes:480,deadlineAt:s.day===12?'09:20':null,meetingAt:s.day===12?'09:30':null,canReview:true,canOpenReference:false};}
 function act(s,type,opts){opts=opts||{};if(!valid(s))return result(false,'진행 상태를 확인할 수 없다.',0,0,{reason:'invalidState'});if(s.phase==='ending')return result(false,'이번 이야기는 끝났다.',0,0,{reason:'finished'});var time,targetDay,again;
  if(['askFood','askSupport','buyRefill','peelRoller'].indexOf(type)!==-1)return result(false,'지금 할 수 없는 일이다.',0,0,{reason:'removedAction'});
  if(type==='buyFood')return purchase(s,type,12000,8,false);
  if(type==='buyFavorite')return purchase(s,type,15000,6,true);
  if(type==='smallFood')return purchase(s,type,3000,1,true);
  if(type==='buyRoller'){if(s.roller.owned)return result(false,'돌돌이는 이미 있다.',0,0,{reason:'alreadyOwned'});if(s.cash<4000)return result(false,'돌돌이를 살 돈이 모자란다.',0,0,{reason:'notEnoughCash'});time=spend(s,type,0,4000);s.roller.owned=true;return result(true,'돌돌이를 샀다. 옷걸이 옆에 두었다.',4000,0,{clock:time});}
  if(type==='startRoller'){if(!s.roller.owned)return result(false,'돌돌이가 없다.',0,0,{reason:'noRoller'});if(s.fur<=0)return result(false,'옷에 털이 없다.',0,0,{reason:'noFur'});s.roller.active=true;s.roller.usedToday=true;return result(true,'옷에 돌돌이를 댔다.',0,0);}
  if(type==='roll'||type==='rollerStroke'){if(!s.roller.active)return result(false,'돌돌이를 먼저 집자.',0,0,{reason:'rollerNotActive'});var removed=Math.min(s.fur,Math.max(0,Math.floor(num(opts.amount,1))));s.fur-=removed;s.roller.dirty+=removed;return result(true,s.fur?'털이 돌돌이에 붙었다.':'옷에 붙은 털을 뗐다.',0,0,{removed:removed,left:s.fur,sheetFull:false});}
  if(type==='stopRoller'){s.roller.active=false;return result(true,'돌돌이를 옷걸이 옆에 두었다.',0,0);}
  if(type==='acknowledgeFood'){s.flags.foodLowAcknowledged=true;return result(true,'남은 사료를 확인했다.',0,0,{food:s.food});}
  if(type==='secureWindow'){if(s.flags.windowSecured)return result(false,'창문은 닫혀 있다.',0,0,{reason:'alreadyDone'});s.flags.windowSecured=true;return result(true,'창문을 잠그고 커튼을 닫았다.',0,0);}
  if(type==='leaveHome'){
   if(s.phase!=='morning'||weekend(s.day))return result(false,'지금은 출근할 때가 아니다.',0,0,{reason:'wrongPhase'});
   if(!s.dressed)return result(false,'출근할 옷부터 입자.',0,0,{reason:'notDressed',alternatives:['dress']});
   if(!s.hasBag&&!opts.borrowLaptop)return result(false,'노트북 가방을 두고 나가려 한다.',0,0,{reason:'noBag',alternatives:['pickBag','borrowLaptop'],borrowedDelay:60});
   s.flags.borrowedLaptop=!s.hasBag&&!!opts.borrowLaptop;s.flags.missingFiles=false;s.flags.missingPhotos=false;s.flags.lateMinutes=Math.max(0,(s.morningMin||0)-50);
   if(!s.flags.departureRecorded){s.careLog=s.careLog||[];if(!s.needs.fed)missedMeal(s,'morning');else s.careLog.push({day:s.day,when:'morning',fed:true});s.flags.morningCareMissed=!s.needs.fed||!s.water;s.flags.morningWaterMissed=!s.water;if(s.flags.morningCareMissed)s.trust=clamp(s.trust-.35,0,10);s.flags.departureRecorded=true;refreshCare(s);}
   return result(true,s.flags.borrowedLaptop?'공용 노트북을 빌려야 해서 오늘은 퇴근이 늦어진다.':s.flags.morningCareMissed?'빈 그릇을 남겨 두고 집을 나왔다.':'문을 잠그고 집을 나섰다.',0,0,{lateMinutes:s.flags.lateMinutes,borrowLaptop:s.flags.borrowedLaptop,workTask:workTask(s)});
  }
  if(type==='feed'){
   if(s.needs.fed)return result(false,'밥은 이미 주었다.',0,0,{reason:'alreadyDone'});
   if(s.food<=0){s.flags.emptyBowl=true;return result(false,'사료가 없다. 휴대폰에서 사료를 주문하자.',0,0,{reason:'noFood',alternatives:['buyFood','smallFood'],mandatoryShop:true});}
   var favorite=opts.kind==='favorite'||opts.favorite===true;if(favorite&&s.favoriteFood<=0)return result(false,'습식 사료가 없다.',0,0,{reason:'noFavoriteFood'});if(!favorite&&s.food-s.favoriteFood<=0)favorite=true;
   time=spend(s,type,10,0);s.food--;if(favorite)s.favoriteFood--;s.needs.fed=true;s.flags.emptyBowl=false;s.flags.catEager=favorite;s.careDebt=Math.max(0,(s.careDebt||0)-1);refreshCare(s);
   if(s.food<=2){s.flags.foodWarningSeen=true;s.flags.foodLowAcknowledged=false;}
   return result(true,favorite?'보리가 봉지 냄새를 맡더니 그릇으로 달려왔다.':'보리가 그릇에 코를 대고 사료를 먹기 시작했다.',0,10,{clock:time,reaction:favorite?'eager':'eat',favorite:favorite,foodLow:s.food<=2});
  }
  if(type==='water'){if(s.water)return result(false,'물은 이미 갈았다.',0,0,{reason:'alreadyDone'});time=spend(s,type,5,0);s.water=true;return result(true,'보리가 새 물을 몇 모금 마셨다.',0,5,{clock:time});}
  if(type==='openReference'||type==='workReview'||type==='requestFiles'){if(s.phase!=='work')return result(false,'회사에서 할 일이다.',0,0,{reason:'wrongPhase'});s.flags.referenceOpened=true;s.flags.missingFiles=false;s.flags.missingPhotos=false;return result(true,'필요한 파일을 열었다.',0,0,{budget:workBudget(s)});}
  if(type==='pet'){if(s.done.pet)return result(false,'보리가 옆에 앉아 천천히 눈을 감았다.',0,0,{reason:'alreadyDone'});s.done.pet=true;s.needs.comfort=true;return result(true,'보리가 손에 볼을 비볐다.',0,0);}
  if(type==='dress'||type==='makeBed'||type==='pickBag'){if(s.phase!=='morning')return result(false,'아침에 할 일이다.',0,0,{reason:'wrongPhase'});if(type==='dress'&&s.dressed||type==='makeBed'&&s.bedMade||type==='pickBag'&&s.hasBag)return result(false,'이미 준비했다.',0,0,{reason:'alreadyDone'});if(type==='pickBag'&&!s.bagPacked)return result(false,'가방에 물건부터 넣자.',0,0,{reason:'bagNotPacked'});}
  else if(type==='packBag'){targetDay=s.phase==='morning'?s.day:nextWorkDay(s.day);if(s.bagPacked&&s.packedForDay===targetDay)return result(false,'가방은 챙겼다.',0,0,{reason:'alreadyDone'});}
  else if(type==='prepare'){targetDay=num(opts.day,s.phase==='morning'?s.day:nextWorkDay(s.day));if(preparedFor(s,targetDay))return result(false,'가방은 미리 챙겨 두었다.',0,0,{reason:'alreadyPrepared'});}
  else if(type==='hoodie'&&s.hoodie||type==='storeSuit'&&s.suitStored||type==='deskSpace'&&s.flags.deskSeat)return result(false,'이미 자리를 마련했다.',0,0,{reason:'alreadyDone'});
  else if(s.done[type])return result(false,'오늘은 이미 했다.',0,0,{reason:'alreadyDone'});
  if(!Object.prototype.hasOwnProperty.call(DURATIONS,type))return result(false,'지금 할 수 없는 일이다.',0,0,{reason:'unknownAction'});
  if(type==='weekendSpace'&&!weekend(s.day))return result(false,'주말에 할 일이다.',0,0,{reason:'notWeekend'});
  if(BIG[type]&&s.phase!=='evening')return result(false,'집에 돌아와서 하자.',0,0,{reason:'wrongPhase'});
  var blocked=canSpend(s,type);if(blocked)return blocked;var minutes=duration(s,type);time=spend(s,type,minutes,0);var message='';
  if(type==='dress'){s.dressed=true;message='출근할 옷을 입었다.';}
  if(type==='makeBed'){s.bedMade=true;message='이불을 가볍게 폈다.';}
  if(type==='packBag'){s.bagPacked=true;s.packedForDay=targetDay;s.bagPrepared=preparedFor(s,targetDay);message='노트북과 충전기를 가방에 넣었다.';}
  if(type==='pickBag'){s.hasBag=true;message='노트북 가방을 들었다.';}
  if(type==='play'){s.needs.played=true;message='보리가 장난감을 붙잡고 뒷발을 바쁘게 움직였다.';}
  if(type==='prepare'){if(s.preparedDays.indexOf(targetDay)===-1)s.preparedDays.push(targetDay);s.prep=1;if(s.bagPacked&&s.packedForDay===targetDay)s.bagPrepared=true;message='내일 가져갈 물건을 미리 챙겼다.';}
  if(type==='rest'){s.energy=clamp(s.energy+1,0,3);s.strain=clamp(s.strain-2,0,10);message='잠깐 눈을 감고 쉬었다. 어깨에 힘이 조금 풀렸다.';}
  if(type==='hoodie'){s.hoodie=true;s.needs.comfort=true;s.flags.hoodiePlaced=true;message='보리가 후드티 냄새를 맡더니 그 위에 누웠다.';}
  if(type==='storeSuit'){s.suitStored=true;s.flags.suitProtected=true;message='정장을 옷걸이에 걸었다.';}
  if(type==='deskSpace'){s.flags.deskSeat=true;s.needs.comfort=true;message='보리가 옆 의자의 상자 안으로 들어갔다.';}
  if(type==='calmRain'){s.needs.comfort=true;s.flags.rainComforted=true;message='곁에 앉아 있으니 보리가 소파 밖으로 나왔다.';}
  if(type==='weekendSpace'){s.routine=clamp(s.routine+1,0,10);s.needs.comfort=true;s.flags.cozyBox=true;message='담요를 깐 상자에 보리가 앞발부터 들어갔다.';}
  if(type==='phonePlan'){s.planDays.push(nextWorkDay(s.day));s.dailyDone.phonePlan=true;message='내일 일정을 확인했다.';}
  if(type==='dishes')message='그릇을 씻고 말렸다.';
  if(type==='laundry'){s.flags.laundryDone=true;message='빤 옷을 널었다. 보리가 흔들리는 소매 아래에 앉았다.';}
  if(type==='tidy'){s.flags.tidyDone=true;message='바닥에 널린 물건을 치웠다.';}
  return result(true,message,0,minutes,{clock:time,band:timeBand(s),fatigue:fatigue(s),prepared:s.bagPrepared});
 }
 function sleep(s,open){
  if(!valid(s))return result(false,'진행 상태를 확인할 수 없다.',0,0,{reason:'invalidState'});
  if(s.phase!=='evening')return result(false,'집에서 잠자리를 정하자.',0,0,{reason:s.phase==='ending'?'finished':'wrongPhase'});
  open=!!open;var oldDay=s.day,c=clock(s),beforeEnergy=s.energy,beforeTrust=s.trust,storm=oldDay===3||!!s.flags.raining,safePlace=!!(s.hoodie||s.flags.cozyBox||s.needs.comfort),hunger=!s.needs.fed,thirst=!s.water,calling=!open&&!safePlace&&!s.needs.played,playing=open&&!s.needs.played&&!safePlace,comforted=s.needs.comfort||(s.flags.windowSecured&&(safePlace||s.needs.played)),late=Math.max(0,c.minutes-BEDTIME);
  if(hunger)missedMeal(s,'evening');else{s.careLog=s.careLog||[];s.careLog.push({day:oldDay,when:'evening',fed:true});}
  var penalty=(hunger?2:0)+(thirst?1:0)+(calling||playing?1:0)+(storm&&!comforted?1:0)+(late?1:0);
  s.energy=clamp(s.energy+2-penalty,0,penalty?2:3);
  var change=(hunger?-1:0)+(thirst?-.3:0)+(calling?-.2:0)+(s.needs.played?.4:0)+(s.needs.comfort?.2:0);
  s.trust=Math.round(clamp(s.trust+change,0,10)*100)/100;
  if(penalty||s.energy<=1)s.strain=clamp(s.strain+1,0,10);else if(s.done.rest)s.strain=Math.max(0,s.strain-1);
  if(!hunger&&!thirst&&(safePlace||s.needs.played))s.routine=clamp(s.routine+1,0,10);
  var wakes=[];if(hunger)wakes.push('hunger');if(thirst)wakes.push('thirst');if(calling)wakes.push('calling');if(playing)wakes.push('play');if(storm&&!comforted)wakes.push('rain');
  var note={day:oldDay,open:open,fed:!hunger,played:s.needs.played,comfort:s.needs.comfort,water:!thirst,hoodie:s.hoodie,minutes:s.eveningMin,bedtime:c.text,lateMinutes:late,earlySleep:c.daytime,energyBefore:beforeEnergy,energyAfter:s.energy,trustBefore:beforeTrust,trustAfter:s.trust,storm:storm,comforted:!!comforted,windowSecured:!!s.flags.windowSecured,cash:s.cash,food:s.food,missedCare:hunger,wakeReasons:wakes};
  s.log.push(note);s.lastNight=note;s.nightIssue={day:oldDay,reasons:wakes.slice(),hunger:hunger,thirst:thirst,calling:calling,playing:playing,rain:storm&&!comforted,needs:{fed:!hunger,played:s.needs.played,comfort:s.needs.comfort},water:!thirst,done:{},finished:false};
  s.flags.nightHunger=hunger;s.flags.nightThirst=thirst;s.flags.nightCalling=calling;s.flags.nightPlay=playing;s.flags.emptyBowl=hunger;s.flags.catEager=false;s.flags.windowSecured=false;s.flags.rainComforted=false;s.flags.raining=false;s.roller.active=false;s.roller.usedToday=false;
  s.fur=s.suitStored?(open?3:0):open?12:s.flags.catInCloset?6:0;s.flags.catInCloset=false;refreshCare(s);
  if(oldDay>=12||(s.careDebt||0)>=5){s.phase='ending';return result(true,'이번 밤이 끝났다.',0,0,{ending:ending(s),night:note});}
  s.day++;s.phase='morning';s.morningMin=0;s.dayMinutes=0;s.commuteMin=0;s.workMin=0;s.workActionsUsed=0;s.dailyDone={};s.done={};s.needs=needs();s.water=false;
  s.flags.referenceOpened=false;s.dressed=false;s.bedMade=false;s.hasBag=false;s.bagPacked=s.packedForDay===s.day;s.bagPrepared=s.bagPacked&&preparedFor(s,s.day);
  s.flags.workDelayMinutes=0;s.flags.borrowedLaptop=false;s.flags.missingFiles=false;s.flags.missingPhotos=false;s.flags.departureRecorded=false;s.flags.lateMinutes=0;
  return result(true,wakes.length?'밤중에 잠에서 깼다.':'아침 알람이 울렸다.',0,0,{night:note,weekend:weekend(s.day),earlySleep:c.daytime,fatigue:fatigue(s)});
 }
 function actAtNight(s,type,opts){
  if(!valid(s)||s.phase!=='morning'||!s.nightIssue||s.nightIssue.finished||s.nightIssue.day!==s.day-1)return result(false,'지금은 밤중이 아니다.',0,0,{reason:'wrongPhase'});
  if(type!=='feed'&&type!=='water')return result(false,'밥이나 물을 챙긴 뒤 다시 눕자.',0,0,{reason:'wrongAction'});
  var morning={needs:s.needs,water:s.water,done:s.done,morningMin:s.morningMin,dayMinutes:s.dayMinutes},night=s.nightIssue;
  s.needs=night.needs;s.water=night.water;s.done=night.done;
  var r=act(s,type,opts);
  night.needs=s.needs;night.water=s.water;night.done=s.done;
  s.needs=morning.needs;s.water=morning.water;s.done=morning.done;s.morningMin=morning.morningMin;s.dayMinutes=morning.dayMinutes;
  if(r.ok){var before=s.lastNight.nightCareMinutes||0;s.lastNight.nightCareMinutes=before+r.minutes;s.lastNight.nightCare=s.lastNight.nightCare||[];s.lastNight.nightCare.push({type:type,minutes:r.minutes});r.clock={before:'02:40',after:'02:55'};r.atNight=true;if(type==='feed')night.hunger=false;else night.thirst=false;}
  return r;
 }
 function finishNight(s){if(!valid(s)||s.phase!=='morning')return false;if(s.nightIssue)s.nightIssue.finished=true;s.needs=needs();s.water=false;s.done={};s.morningMin=0;s.dayMinutes=0;return true;}
 function addIssue(s,key,label){if(!s.issueQueue.some(function(i){return i.id===s.day+':'+key;}))s.issueQueue.push({id:s.day+':'+key,key:key,fromDay:s.day,label:label||'마치지 못한 일',reason:'unfinished',resolved:false});}
 function finishWork(s,opts){
  opts=opts||{};if(!valid(s))return result(false,'진행 상태를 확인할 수 없다.',0,0,{reason:'invalidState'});
  var previous=s.work.find(function(w){return w.day===s.day;});if(previous)return result(true,previous.reason,0,0,{alreadyDone:true,work:previous});
  if(s.day<1||s.day>12||s.phase==='ending')return result(false,'오늘은 업무를 기록할 수 없다.',0,0,{reason:'wrongDay'});
  if(weekend(s.day))return result(false,'주말에는 출근하지 않는다.',0,0,{reason:'weekend'});
  if(s.phase!=='morning'&&s.phase!=='work')return result(false,'출근한 뒤 업무를 마치자.',0,0,{reason:'wrongPhase'});
  var task=workTask(s),condition=fatigue(s),completed=opts.completed!==false,missing=Array.isArray(opts.missing)?opts.missing.slice():[];
  if(!completed&&!missing.length)missing=schedule[s.day].required.length?schedule[s.day].required.slice():['unfinished'];
  var overtime=opts.overtime===true||opts.choice==='today',defer=opts.defer===true||opts.choice==='tomorrow';
  var deferred=s.flags.deferredWorkDay===s.day&&!task.prepared;
  var carry=unresolved(s),delay=!completed||missing.length?90:overtime?60:task.borrowedLaptop?60:task.lateMinutes>0?45:carry.length?60:deferred?45:condition==='exhausted'&&!task.prepared?45:0;
  if(s.flags.deferredWorkDay===s.day)s.flags.deferredWorkDay=null;
  if(defer)s.flags.deferredWorkDay=nextWorkDay(s.day);
  var resolved=[];if(completed&&!missing.length)carry.forEach(function(i){i.resolved=true;i.resolvedDay=s.day;resolved.push(i.id);});
  missing.forEach(function(k){addIssue(s,k,opts.labels&&opts.labels[k]);});
  if(!completed||missing.length)s.workMissed=(s.workMissed||0)+1;
  var onTime=s.day!==12||(!task.borrowedLaptop&&task.lateMinutes<20),status=!completed?'missed':missing.length?'partial':!onTime?'late':delay?'strained':task.prepared?'good':'steady';
  var reason=!completed||missing.length?'마치지 못한 일을 다시 확인하느라 퇴근이 늦어졌다.':delay?'밀린 일과 준비를 마치고 나니 밖이 어두워졌다.':'오늘 할 일을 마치고 퇴근했다.';
  var report={day:s.day,task:schedule[s.day].task,deadline:!!schedule[s.day].deadline,status:status,prepared:task.prepared,energy:s.energy,fatigue:condition,reason:reason,completed:completed,onTime:onTime,missing:missing,resolved:resolved,carryover:unresolved(s).map(function(i){return i.id;}),lateMinutes:task.lateMinutes,borrowedLaptop:task.borrowedLaptop,extraMinutes:delay,reviewsUsed:0};
  s.work.push(report);s.workMin=540+delay;s.energy=Math.max(0,s.energy-1);s.strain=clamp(s.strain+1+(delay>=45?1:0),0,10);s.flags.workDelayMinutes=delay;s.flags.overtime=delay>=30;
  if(preparedFor(s,s.day))s.preparedDays=s.preparedDays.filter(function(d){return d!==s.day;});
  if(s.day===12){s.project.presented=completed&&!missing.length&&onTime&&(s.workMissed||0)<3;s.project.finished=s.project.presented;s.project.launched=s.project.presented;}
  s.phase='afterWork';return result(true,reason,0,0,{work:report,issues:unresolved(s),project:s.project,eveningSlots:delay>=30?1:2});
 }
 function arriveHome(s){if(!valid(s)||s.phase==='ending'||s.phase==='evening'&&s.lastArrivedDay===s.day)return;
  s.phase='evening';s.eveningStartMin=weekend(s.day)?600:(s.flags.workDelayMinutes||0)>=30?1260:1200;s.eveningMin=0;s.eveningUsed=0;s.eveningSlots=weekend(s.day)?4:(s.flags.workDelayMinutes||0)>=30?1:2;
  s.needs=needs();s.water=false;s.done={};s.lastArrivedDay=s.day;s.hasBag=false;s.bagPacked=false;s.bagPrepared=false;s.packedForDay=null;s.roller.active=false;
 }
 function objective(s){if(!s.flags.initialShopDone)return{key:'firstFood',text:'고양이에게 줄 사료',actions:['buyFood','buyFavorite'],mandatory:true};if(s.phase==='morning')return{key:'morning',text:'출근 전',actions:['dress','packBag','feed','water','leaveHome']};if(s.phase==='work')return{key:'work',text:schedule[s.day].task,actions:['work'],task:workTask(s)};if(s.phase==='afterWork')return{key:'home',text:'집으로',actions:['commuteHome']};return{key:'home',text:timeBand(s).label,actions:['feed','water','play','prepare','rest','sleep']};}
 function ending(s){
  var pet=s&&s.cat||'보리',presented=!!(s&&s.project&&s.project.presented),meeting=presented?'금요일 회의에서 맡은 일을 설명했다. 팀장은 고개를 끄덕이고 다음 안건을 넘겼다.':'금요일 회의에서 내가 빠뜨린 일을 동료가 대신 설명했다. 회의 뒤에는 팀장과 다음 주 일정을 다시 잡았다.';
  if((s.careDebt||0)>=5)return{key:'neglected',title:'아침 일정을 바꿨다',presented:presented,lines:[pet+'는 빈 그릇 옆에 앉아 있었다. 불러도 장난감을 꺼내도 움직이지 않았다.','회사에 전화를 걸어 오전에 늦겠다고 말했다. 사료와 물부터 챙기고, '+pet+'의 상태를 살폈다.','밥을 채우는 일부터 다시 시작해야 했다. 혼자 감당하기 어려운 날에는 미리 돌봄을 부탁할 사람도 찾아보기로 했다.']};
  if(s.strain>=8||s.energy<=0)return{key:'worn',title:'금요일 밤',presented:presented,lines:[meeting,'집에 와서 소파에 앉자 그대로 눈이 감겼다. '+pet+'가 무릎을 건드려도 한참 뒤에야 손을 뻗었다.','내일 할 일을 적으려다 휴대폰을 내려놓았다. 이번 주말에는 내 잠과 '+pet+'의 밥부터 챙기기로 했다.']};
  if(s.flags.catWithdrawn||s.trust<=2.5)return{key:'distance',title:'금요일 밤',presented:presented,lines:[meeting,'문을 열었지만 '+pet+'는 달려오지 않았다. 소파 아래에서 나를 바라보다 고개를 돌렸다.','새 밥과 물을 놓고 바닥에 앉았다. 금방 예전처럼 돌아오리라 기대하지 않고, 오늘은 그 자리에서 기다렸다.']};
  if(presented&&s.routine>=4&&s.trust>=5&&s.strain<=6)return{key:'settled',title:'금요일 밤',presented:true,lines:[meeting,'집에 돌아오자 '+pet+'가 현관 앞까지 나왔다. 밥을 먹고 나서는 장난감을 물고 내 발 앞에 내려놓았다.',s.lastNight&&!s.lastNight.open?'놀이를 마친 '+pet+'는 거실의 자기 자리로 갔다. 나는 방문을 닫고 알람을 껐다. 내일은 늦잠을 자도 된다.':'불을 끄고 누우니 '+pet+'가 이불 끝에 몸을 붙였다. 알람은 꺼 두었다. 내일은 서두르지 않아도 된다.']};
  return{key:'finding',title:'금요일 밤',presented:presented,lines:[meeting,pet+'가 장난감 옆에서 졸고 있었다. 손을 내밀자 코를 대고 냄새를 맡았다.','첫 출근 전에는 하루 종일 함께 있었다. 이제는 짧아진 저녁 안에서 서로의 생활을 다시 익히고 있다.','내일은 출근하지 않는다. 아침 밥을 주고 나면, 오늘 미뤄 둔 놀이부터 하기로 했다.']};
 }
 return{create:create,act:act,actAtNight:actAtNight,finishNight:finishNight,sleep:sleep,finishWork:finishWork,arriveHome:arriveHome,ending:ending,ready:ready,clock:clock,timeBand:timeBand,fatigue:fatigue,duration:duration,objective:objective,workTask:workTask,workBudget:workBudget,schedule:schedule,DURATIONS:DURATIONS,EVENING_LIMIT:180,SHEET_CAPACITY:Number.MAX_SAFE_INTEGER};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=Life;
