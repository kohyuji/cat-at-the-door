/* Persistent game rules; no drawing or browser dependencies. */
var Life = (function () {
  'use strict';
  var BEDTIME=1380, MORNING_START=440, DEPARTURE=490;
  var DURATIONS={dress:5,makeBed:3,packBag:5,pickBag:0,feed:10,water:5,play:30,prepare:60,rest:30,hoodie:15,storeSuit:10,deskSpace:15,calmRain:30,weekendSpace:45,phonePlan:10,requestFiles:15,openReference:15,workReview:5,dishes:20,laundry:60,tidy:45};
  var schedule=[
    {day:0,task:'내일 입을 옷과 가방 준비',required:[],deadline:false},
    {day:1,task:'메일과 공유 폴더 확인',required:['mail','folder','messenger'],deadline:false},
    {day:2,task:'날짜별 파일 정리',required:['file0911','file0914','file0915'],deadline:false},
    {day:3,task:'진행 현황 합계 확인',required:['completedCount','pendingCount','totalCount'],deadline:false},
    {day:4,task:'팀 회의 자료 초안 작성',required:['meetingDate','completedCount','pendingCount'],deadline:true},
    {day:5,task:'동료와 담당 업무 확인',required:['myPart','peerPart','checkBy'],deadline:false},
    {day:6,task:'집안일과 휴식',required:[],weekend:true},
    {day:7,task:'월요일 준비',required:[],weekend:true},
    {day:8,task:'변경된 회의 시각 확인',required:['meetingTime','arriveBy','updateNotice'],deadline:false},
    {day:9,task:'회의에 쓸 원본 파일 대조',required:['rowsFile','agendaFile','timeNotice'],deadline:true},
    {day:10,task:'회의 자료 두 장 고르기',required:['coverPage','tablePage','discardPage'],deadline:false},
    {day:11,task:'회의 자료 최종 확인',required:['meetingHeader','summaryRow','finalFile'],deadline:false},
    {day:12,task:'09:20까지 회의 자료 준비',required:['reportCopy','receiver','meetingTime'],deadline:true}
  ];
  function clamp(n,lo,hi){return Math.max(lo,Math.min(hi,n));}
  function num(n,fallback){return Number.isFinite(n)?n:fallback;}
  function name(n,fallback){return String(n||'').trim().slice(0,20)||fallback;}
  function needs(){return{fed:false,played:false,comfort:false};}
  function weekend(day){return day===6||day===7;}
  function nextWorkDay(day){do{day+=1;}while(weekend(day));return Math.min(12,day);}
  function valid(s){return !!(s&&s.needs&&s.flags&&s.roller&&Array.isArray(s.log));}
  function result(ok,message,cash,minutes,extra){var out={ok:ok,message:message,cost:{cash:cash||0,minutes:minutes||0},minutes:minutes||0};if(extra)Object.keys(extra).forEach(function(key){out[key]=extra[key];});return out;}
  function create(me,cat){return{
    version:2,me:name(me,'김신입'),cat:name(cat,'보리'),day:0,phase:'evening',cash:58000,food:0,favoriteFood:0,water:false,energy:3,prep:0,trust:4,strain:0,routine:0,
    hoodie:false,suitStored:false,needs:needs(),done:{},dailyDone:{},flags:{},log:[],work:[],eveningMin:60,eveningStartMin:1200,morningMin:0,dayMinutes:60,commuteMin:0,workMin:0,workActionsUsed:0,
    roller:{owned:false,active:false,dirty:0,usedToday:false},fur:0,dressed:false,bedMade:false,bagPacked:false,bagPrepared:false,hasBag:false,packedForDay:null,
    preparedDays:[],planDays:[],issueQueue:[],transactions:[],lastNight:null,nightIssue:null,lastArrivedDay:0,project:{title:'첫 팀 회의',meetingDay:12,meetingTime:'09:30',materialsBy:'09:20',presented:false,finished:false,launched:false},support:false
  };}
  function clock(s){var minute;if(s.phase==='morning')minute=MORNING_START+s.morningMin;else if(s.phase==='work')minute=540+(s.workMin||0)+(s.flags.lateMinutes||0)+(s.flags.borrowedLaptop?45:0);else if(s.phase==='afterWork')minute=1140+(s.commuteMin||0);else minute=num(s.eveningStartMin,weekend(s.day)?600:1200)+s.eveningMin;
    return{minutes:minute,text:String(Math.floor(minute/60)%24).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'),remaining:Math.max(0,(s.phase==='morning'?DEPARTURE:BEDTIME)-minute),daytime:minute<1200,lateMinutes:s.phase==='morning'?Math.max(0,minute-DEPARTURE):Math.max(0,minute-BEDTIME),departureAt:'08:10',bedtime:'23:00'};}
  function fatigue(s){return s.energy<=0||s.strain>=7?'exhausted':s.energy<=1||s.strain>=4?'tired':'normal';}
  function duration(s,type){if(type==='play'&&s.flags.catEager)return 20;if(type==='prepare'&&s.flags.deskSeat)return 50;return DURATIONS[type];}
  function repeated(s,type,message){return s.done[type]?result(false,message||'오늘은 이미 했다.',0,0,{reason:'alreadyDone'}):null;}
  function canSpend(s,minutes,essential){if(s.phase!=='evening'||essential||minutes<=clock(s).remaining)return null;return result(false,'이 일을 마치면 취침 시간을 넘긴다. 오늘 할 일부터 고르자.',0,0,{reason:'notEnoughTime',remainingMinutes:clock(s).remaining,alternatives:['feed','water','sleep']});}
  function spend(s,type,minutes,cash){var before=clock(s).text;if(cash){s.cash-=cash;s.transactions.push({day:s.day,type:type,cash:-cash});}s.dayMinutes+=minutes;if(s.phase==='evening')s.eveningMin+=minutes;else if(s.phase==='afterWork')s.commuteMin+=minutes;else if(s.phase==='work')s.workMin+=minutes;else s.morningMin+=minutes;s.done[type]=true;return{before:before,after:clock(s).text};}
  function purchase(s,type,price,portions,favorite){if(s.cash<price)return result(false,'돈이 모자란다. 남은 사료와 살 수 있는 양을 확인하자.',0,0,{reason:'notEnoughCash',needed:price,alternatives:['buyFood','smallFood']});var time=spend(s,type,15,price);s.food+=portions;if(favorite)s.favoriteFood+=portions;s.flags.initialShopDone=true;s.flags.foodLowAcknowledged=false;return result(true,favorite?'좋아하는 습식 사료를 샀다.':'평소 먹는 건사료를 샀다.',price,15,{clock:time,portions:portions,favorite:favorite});}
  function preparedFor(s,day){return s.preparedDays.indexOf(day)!==-1;}
  function ready(s){var c=clock(s),problems=[];if(weekend(s.day))problems.push('weekend');if(s.phase!=='morning')problems.push('wrongPhase');if(!s.dressed)problems.push('notDressed');if(!s.hasBag&&!s.flags.borrowedLaptop)problems.push('noBag');return{ok:problems.length===0,problems:problems,dressed:s.dressed,hasBag:s.hasBag,bagPacked:s.bagPacked,prepared:!!(s.hasBag&&s.bagPrepared),minutesUntilDeparture:c.remaining,lateMinutes:Math.max(0,MORNING_START+s.morningMin-DEPARTURE),alternatives:!s.hasBag?['packBag','pickBag','borrowLaptop']:[]};}
  function unresolved(s){return s.issueQueue.filter(function(issue){return !issue.resolved;});}
  function workTask(s){
    var task=schedule[clamp(s.day,0,12)],carried=unresolved(s).filter(function(issue){return issue.fromDay<s.day;});
    var prepared=!!(s.hasBag&&s.bagPrepared&&preparedFor(s,s.day)),late=num(s.flags.lateMinutes,Math.max(0,s.morningMin-50)),extra=[];
    var available=(s.day===12?20:120)-late-(s.flags.borrowedLaptop?45:0)-(s.workMin||0);
    var missingFiles=!!(s.flags.missingFiles||s.flags.missingPhotos);
    if(!prepared&&!s.flags.referenceOpened)extra.push({id:'findReference',label:'원본 자료를 찾아 확인한다',minutes:15});
    if(s.flags.borrowedLaptop)extra.push({id:'borrowLaptop',label:'공용 노트북을 설정한다',minutes:45});
    if(missingFiles)extra.push({id:'requestFiles',label:'집에 둔 자료 파일을 요청한다',minutes:15});
    carried.forEach(function(issue){extra.push({id:issue.id,label:issue.label,issue:true});});
    return{day:s.day,title:task.task,deadline:!!task.deadline,required:task.required.slice(),prepared:prepared,clueAvailable:prepared,sourceAvailable:prepared||!!s.flags.referenceOpened,lateMinutes:late,borrowedLaptop:!!s.flags.borrowedLaptop,missingFiles:missingFiles,missingPhotos:missingFiles,spentMinutes:s.workMin||0,availableMinutes:Math.max(0,available),deadlineAt:s.day===12?'09:20':null,meetingAt:s.day===12?'09:30':null,extraSteps:extra,carryover:carried.map(function(issue){return Object.assign({},issue);})};
  }
  function workBudget(s,definition){
    var task=workTask(s),condition=fatigue(s),base=condition==='exhausted'?2:condition==='tired'?3:4;
    var total=Math.max(0,base-Math.ceil(task.lateMinutes/15)-(task.borrowedLaptop?2:0));
    var remaining=Math.max(0,total-(s.workActionsUsed||0)),hints=[];
    if(task.prepared&&definition&&definition.slots&&definition.cards){
      definition.slots.forEach(function(slot){
        var card=definition.cards.find(function(item){return item.id===definition.solution[slot.id];});
        var source=card&&definition.sources.find(function(item){return item.id===card.sourceId;});
        hints.push({slotId:slot.id,sourceId:card&&card.sourceId,text:source?source.title:slot.hint||'전날 확인한 메모'});
      });
    }
    return{total:total,remaining:remaining,spent:s.workActionsUsed||0,fatigue:condition,prepared:task.prepared,sourceAvailable:task.sourceAvailable,hints:hints,availableMinutes:task.availableMinutes,deadlineAt:task.deadlineAt,meetingAt:task.meetingAt,canReview:remaining>0&&task.availableMinutes>=DURATIONS.workReview,canOpenReference:!task.sourceAvailable&&remaining>0&&task.availableMinutes>=DURATIONS.openReference};
  }
  function act(s,type,opts){opts=opts||{};if(!valid(s))return result(false,'진행 상태를 확인할 수 없다.',0,0,{reason:'invalidState'});if(s.phase==='ending')return result(false,'마지막 밤이 지났다.',0,0,{reason:'finished'});var again,blocked,time,targetDay;
    if(type==='askFood'||type==='askSupport'||type==='buyRefill'||type==='peelRoller')return result(false,'지금은 할 수 없는 일이다.',0,0,{reason:'removedAction'});
    if(type==='openReference'||type==='workReview'){
      if(s.phase!=='work')return result(false,'회사에서 할 일이다.',0,0,{reason:'wrongPhase'});
      var budget=workBudget(s);
      if(type==='openReference'&&budget.sourceAvailable)return result(false,'원본 자료는 열려 있다.',0,0,{reason:'alreadyAvailable'});
      if(type==='workReview'&&!budget.sourceAvailable)return result(false,'원본 자료부터 열어 확인하자.',0,0,{reason:'referenceClosed',alternatives:['openReference']});
      if(!budget.remaining)return result(false,'오늘 집중해서 검수할 힘을 다 썼다. 남은 항목은 팀장에게 알리자.',0,0,{reason:'noWorkActions',budget:budget,alternatives:['reportUnfinished']});
      if(budget.availableMinutes<DURATIONS[type])return result(false,'자료를 놓아야 할 시간이 됐다. 지금 확인한 부분과 남은 부분을 알리자.',0,0,{reason:'notEnoughWorkTime',budget:budget,alternatives:['reportUnfinished']});
      time=spend(s,type,DURATIONS[type],0);s.workActionsUsed=(s.workActionsUsed||0)+1;
      if(type==='openReference')s.flags.referenceOpened=true;
      return result(true,type==='openReference'?'공유 폴더에서 원본 자료를 찾았다.':'놓은 자료를 검수했다.',0,DURATIONS[type],{clock:time,budget:workBudget(s)});
    }
    if(type==='buyFood')return purchase(s,type,12000,4,false);if(type==='buyFavorite')return purchase(s,type,15000,3,true);if(type==='smallFood')return purchase(s,type,5000,1,true);
    if(type==='buyRoller'){if(s.roller.owned)return result(false,'돌돌이는 이미 있다.',0,0,{reason:'alreadyOwned'});if(s.cash<4000)return result(false,'돌돌이를 살 돈이 모자란다. 털이 남은 채 출근할 수 있다.',0,0,{reason:'notEnoughCash'});time=spend(s,type,0,4000);s.roller.owned=true;return result(true,'돌돌이를 샀다. 당분간 새로 살 필요는 없다.',4000,0,{clock:time});}
    if(type==='startRoller'){if(!s.roller.owned)return result(false,'돌돌이가 없다.',0,0,{reason:'noRoller'});if(s.fur<=0)return result(false,'정장에 털이 없다.',0,0,{reason:'noFur'});s.roller.active=true;s.roller.usedToday=true;return result(true,'돌돌이를 정장에 댔다.',0,0);}
    if(type==='roll'||type==='rollerStroke'){if(!s.roller.active)return result(false,'돌돌이를 정장에 대자.',0,0,{reason:'rollerNotActive'});var removed=Math.min(s.fur,Math.max(0,Math.floor(num(opts.amount,1))));s.fur-=removed;s.roller.dirty+=removed;return result(true,s.fur?'털이 돌돌이에 붙었다.':'정장에 붙은 털을 뗐다.',0,0,{removed:removed,left:s.fur,sheetFull:false});}
    if(type==='stopRoller'){s.roller.active=false;return result(true,'돌돌이를 내려놓았다.',0,0);}
    if(type==='secureWindow'){if(s.flags.windowSecured)return result(false,'창문과 커튼은 닫혀 있다.',0,0,{reason:'alreadyDone'});s.flags.windowSecured=true;return result(true,'창문을 잠그고 커튼을 닫았다.',0,0);}
    if(type==='acknowledgeFood'){s.flags.foodLowAcknowledged=true;return result(true,'남은 사료를 확인했다.',0,0,{food:s.food});}
    if(type==='leaveHome'){if(s.phase!=='morning'||weekend(s.day))return result(false,'오늘은 출근할 때가 아니다.',0,0,{reason:'wrongPhase'});if(!s.dressed)return result(false,'출근할 옷부터 입자.',0,0,{reason:'notDressed',alternatives:['dress']});if(!s.hasBag&&!opts.borrowLaptop)return result(false,'가방을 두고 왔다. 돌아가거나 회사 노트북을 빌릴 수 있다.',0,0,{reason:'noBag',alternatives:['pickBag','borrowLaptop'],borrowedDelay:45});s.flags.borrowedLaptop=!s.hasBag&&!!opts.borrowLaptop;s.flags.missingFiles=s.flags.borrowedLaptop&&(s.day===9||s.day===12);s.flags.missingPhotos=s.flags.missingFiles;s.flags.departureRecorded=true;s.flags.lateMinutes=Math.max(0,s.morningMin-50);return result(true,s.flags.borrowedLaptop?'회사에서 노트북을 빌리기로 했다. 설정에 45분이 필요하다.':s.flags.lateMinutes?'출발 시간을 넘겼다. 도착하면 밀린 일부터 확인하자.':'가방을 들고 나왔다.',0,0,{lateMinutes:s.flags.lateMinutes,borrowLaptop:s.flags.borrowedLaptop,workTask:workTask(s)});}
    if(type==='feed'){again=repeated(s,type,'밥은 이미 주었다.');if(again)return again;if(s.food<=0){s.flags.emptyBowl=true;s.flags.foodWarningSeen=true;return result(false,'사료가 없다. 휴대폰이나 가방에서 가게를 확인하자.',0,0,{reason:'noFood',alternatives:['buyFood','buyFavorite'],mandatoryShop:true});}var favorite=opts.kind==='favorite'||opts.favorite===true,dry=s.food-s.favoriteFood;if(favorite&&s.favoriteFood<=0)return result(false,'좋아하는 습식 사료가 없다.',0,0,{reason:'noFavoriteFood',alternatives:['feed','buyFavorite']});if(!favorite&&dry<=0)favorite=true;time=spend(s,type,DURATIONS.feed,0);s.food-=1;if(favorite)s.favoriteFood-=1;s.needs.fed=true;s.flags.emptyBowl=false;s.flags.catEager=favorite;if(s.food<=1){s.flags.foodWarningSeen=true;s.flags.foodLowAcknowledged=false;}return result(true,favorite?'봉지를 열자 고양이가 다가왔다. 그릇을 놓기도 전에 코를 내민다.':'그릇을 놓자 고양이가 먹기 시작했다.',0,DURATIONS.feed,{clock:time,reaction:favorite?'eager':'eat',favorite:favorite,foodLow:s.food<=1});}
    if(type==='water'){again=repeated(s,type,'물은 이미 갈았다.');if(again)return again;time=spend(s,type,DURATIONS.water,0);s.water=true;return result(true,'그릇에 깨끗한 물을 담았다.',0,DURATIONS.water,{clock:time});}
    if(type==='dress'||type==='makeBed'||type==='pickBag'){if(s.phase!=='morning')return result(false,'아침에 할 일이다.',0,0,{reason:'wrongPhase'});if(type==='dress'&&s.dressed||type==='makeBed'&&s.bedMade||type==='pickBag'&&s.hasBag)return result(false,'이미 준비했다.',0,0,{reason:'alreadyDone'});if(type==='pickBag'&&!s.bagPacked)return result(false,'가방에 필요한 물건부터 넣자.',0,0,{reason:'bagNotPacked',alternatives:['packBag']});}
    else if(type==='packBag'){targetDay=s.phase==='morning'?s.day:nextWorkDay(s.day);if(s.bagPacked&&s.packedForDay===targetDay)return result(false,'가방은 챙겼다.',0,0,{reason:'alreadyDone'});}
    else{if(type==='hoodie'&&s.hoodie||type==='storeSuit'&&s.suitStored||type==='deskSpace'&&s.flags.deskSeat)return result(false,'자리는 이미 마련했다.',0,0,{reason:'alreadyDone'});if(type==='prepare'){targetDay=num(opts.day,s.phase==='morning'?s.day:nextWorkDay(s.day));if(preparedFor(s,targetDay))return result(false,'그날 쓸 자료는 정리했다.',0,0,{reason:'alreadyPrepared'});}if(type==='phonePlan'){if(s.dailyDone.phonePlan)return result(false,'오늘 일정은 확인했다.',0,0,{reason:'alreadyDone'});}else{again=repeated(s,type);if(again)return again;}}
    if(!Object.prototype.hasOwnProperty.call(DURATIONS,type))return result(false,'지금은 할 수 없는 일이다.',0,0,{reason:'unknownAction'});if(type==='weekendSpace'&&!weekend(s.day))return result(false,'주말에 하기로 한 일이다.',0,0,{reason:'notWeekend'});if(type==='requestFiles'&&!s.flags.missingFiles&&!s.flags.missingPhotos)return result(false,'필요한 자료 파일이 있다.',0,0,{reason:'notNeeded'});var minutes=duration(s,type);blocked=canSpend(s,minutes,false);if(blocked)return blocked;time=spend(s,type,minutes,0);var message='';
    if(type==='dress'){s.dressed=true;message='출근할 옷을 입었다.';}if(type==='makeBed'){s.bedMade=true;message='이불을 펴고 베개를 정리했다.';}if(type==='packBag'){s.bagPacked=true;s.packedForDay=targetDay;s.bagPrepared=preparedFor(s,targetDay);message=s.bagPrepared?'정리한 자료와 노트북을 가방에 넣었다.':'노트북을 가방에 넣었다. 자료는 아직 정리하지 않았다.';}if(type==='pickBag'){s.hasBag=true;message=s.bagPrepared?'자료가 든 가방을 집었다.':'가방을 집었다. 회사에서 원본 자료부터 찾아야 한다.';}
    if(type==='play'){s.needs.played=true;message=s.flags.catEager?'장난감을 꺼내자 금세 다가와 놀았다.':'고양이가 장난감을 잡고 한동안 놓지 않는다.';}if(type==='prepare'){targetDay=num(opts.day,s.phase==='morning'?s.day:nextWorkDay(s.day));if(s.preparedDays.indexOf(targetDay)===-1)s.preparedDays.push(targetDay);s.prep=clamp(s.prep+1,0,3);if(s.bagPacked&&s.packedForDay===targetDay)s.bagPrepared=true;message='내일 쓸 원본과 확인할 항목을 정리했다.';}if(type==='rest'){s.energy=clamp(s.energy+1,0,3);s.strain=clamp(s.strain-2,0,10);message='눈을 감고 몸을 쉬었다.';}if(type==='hoodie'){s.hoodie=true;s.needs.comfort=true;s.flags.hoodiePlaced=true;message='입던 후드티를 접어 고양이가 누울 곳에 뒀다.';}if(type==='storeSuit'){s.suitStored=true;s.flags.suitProtected=true;message='정장을 옷장에 걸었다.';}if(type==='deskSpace'){s.flags.deskSeat=true;message='상자를 옆 의자에 뒀다. 보리가 서류 대신 그쪽에 앉았다.';}if(type==='calmRain'){s.needs.comfort=true;s.flags.rainComforted=true;message='몸의 떨림이 멎을 때까지 곁에 앉았다.';}if(type==='weekendSpace'){s.routine=clamp(s.routine+1,0,6);s.needs.comfort=true;s.flags.cozyBox=true;message='상자에 담요를 깔고 주변 물건을 정리했다.';}if(type==='phonePlan'){targetDay=num(opts.day,s.phase==='morning'?s.day:nextWorkDay(s.day));if(s.planDays.indexOf(targetDay)===-1)s.planDays.push(targetDay);s.dailyDone.phonePlan=true;s.flags.workPlanAsked=true;message='내일 필요한 자료와 마감 시간을 확인했다.';}if(type==='requestFiles'){s.flags.missingFiles=false;s.flags.missingPhotos=false;s.flags.photosRecovered=true;message='요청한 자료 파일을 받았다.';}if(type==='dishes')message='설거지를 하고 그릇을 말렸다.';if(type==='laundry'){s.flags.petFurToday=false;s.flags.laundryDone=true;message='옷을 세탁하고 널었다.';}if(type==='tidy'){s.flags.tidyDone=true;message='바닥과 책상 위를 정리했다.';}
    return result(true,message,0,minutes,{clock:time,fatigue:fatigue(s),prepared:s.bagPrepared});
  }
  function sleep(s,open){if(!valid(s))return result(false,'진행 상태를 확인할 수 없다.',0,0,{reason:'invalidState'});if(s.phase!=='evening')return result(false,'집에서 잠자리를 정하자.',0,0,{reason:s.phase==='ending'?'finished':'wrongPhase'});open=!!open;var oldDay=s.day,c=clock(s),beforeEnergy=s.energy,beforeTrust=s.trust,storm=oldDay===3||!!s.flags.raining,safePlace=s.hoodie||s.flags.cozyBox||s.needs.comfort,comforted=s.needs.comfort||(open&&s.needs.fed)||(s.flags.windowSecured&&(safePlace||s.needs.played)),hunger=!s.needs.fed,thirst=!s.water,calling=!open&&!safePlace&&!s.needs.played,playing=open&&!s.needs.played&&!safePlace,late=Math.max(0,c.minutes-BEDTIME),latePenalty=Math.min(2,Math.ceil(late/45)),recovery=2-(hunger?2:0)-(thirst?1:0)-(calling?1:0)-(playing?1:0)-(storm&&!comforted?1:0)-latePenalty,maximum=latePenalty>=2?1:latePenalty===1?2:3;
    if(hunger)maximum=Math.min(maximum,1);else if(thirst||calling||playing||storm&&!comforted)maximum=Math.min(maximum,2);
    s.energy=clamp(s.energy+recovery,0,maximum);var change=(hunger?-1.2:0)+(thirst?-.4:0)+(calling?-.5:0)+(s.needs.played?.5:0)+(s.needs.comfort?.3:0)+(open?.15:0)-(storm&&!comforted?.4:0);s.trust=Math.round(clamp(s.trust+change,0,10)*100)/100;if(late||s.energy<=1)s.strain=clamp(s.strain+1,0,10);if(!hunger&&!thirst&&(safePlace||open||s.needs.played))s.routine=clamp(s.routine+1,0,6);var wakeReasons=[];if(hunger)wakeReasons.push('hunger');if(thirst)wakeReasons.push('thirst');if(calling)wakeReasons.push('calling');if(playing)wakeReasons.push('play');if(storm&&!comforted)wakeReasons.push('rain');
    var note={day:oldDay,open:open,fed:s.needs.fed,played:s.needs.played,comfort:s.needs.comfort,water:s.water,hoodie:s.hoodie,minutes:s.eveningMin,bedtime:c.text,lateMinutes:late,earlySleep:c.daytime,energyBefore:beforeEnergy,energyAfter:s.energy,trustBefore:beforeTrust,trustAfter:s.trust,storm:storm,comforted:!!comforted,windowSecured:!!s.flags.windowSecured,cash:s.cash,food:s.food,missedCare:hunger,wakeReasons:wakeReasons};s.log.push(note);s.lastNight=note;s.nightIssue={day:oldDay,reasons:wakeReasons.slice(),hunger:hunger,thirst:thirst,calling:calling,playing:playing,rain:storm&&!comforted};s.flags.nightHunger=hunger;s.flags.nightThirst=thirst;s.flags.nightCalling=calling;s.flags.nightPlay=playing;s.flags.emptyBowl=hunger;s.flags.catEager=false;s.flags.windowSecured=false;s.flags.rainComforted=false;s.flags.raining=false;s.roller.active=false;s.roller.usedToday=false;s.fur=s.suitStored?(open?1:0):open?10+Math.min(6,s.log.filter(function(night){return night.open;}).length):s.flags.catInCloset?6:0;s.flags.catInCloset=false;
    if(oldDay>=12){s.phase='ending';return result(true,'마지막 밤이 지났다.',0,0,{ending:ending(s),night:note});}s.day+=1;s.phase='morning';s.morningMin=0;s.dayMinutes=0;s.commuteMin=0;s.workMin=0;s.workActionsUsed=0;s.dailyDone={};s.flags.referenceOpened=false;s.dressed=false;s.bedMade=false;s.hasBag=false;s.bagPacked=s.packedForDay===s.day;s.bagPrepared=s.bagPacked&&preparedFor(s,s.day);s.flags.workDelayMinutes=0;s.flags.borrowedLaptop=false;s.flags.missingFiles=false;s.flags.missingPhotos=false;s.flags.photosRecovered=false;s.flags.departureRecorded=false;s.flags.lateMinutes=0;
    return result(true,hunger?'밤중에 빈 밥그릇을 긁는 소리가 났다.':thirst?'물을 찾는 소리에 잠에서 깼다.':calling?'닫힌 문 앞에서 울음이 이어졌다.':storm&&!comforted?'천둥에 몇 번이나 잠이 깼다.':'알람이 울렸다.',0,0,{night:note,weekend:weekend(s.day),earlySleep:c.daytime,fatigue:fatigue(s)});
  }
  function addIssue(s,day,key,label,reason,deadline){var id=day+':'+key,existing=s.issueQueue.find(function(issue){return issue.id===id;});if(!existing)s.issueQueue.push({id:id,key:key,fromDay:day,label:label||key,reason:reason,deadline:!!deadline,resolved:false});}
  function actAtNight(s,type,opts){
    if(!valid(s)||s.phase!=='morning'||!s.lastNight||!s.nightIssue||s.nightIssue.day!==s.day-1)return result(false,'밤중에 할 일이 아니다.',0,0,{reason:'wrongPhase'});
    if(type!=='feed'&&type!=='water')return result(false,'밥이나 물을 챙긴 뒤 다시 눕자.',0,0,{reason:'wrongAction'});
    var morning=s.morningMin,dayMinutes=s.dayMinutes,nightBefore=s.lastNight.nightCareMinutes||0,r=act(s,type,opts);
    if(r.ok){
      s.morningMin=morning;s.dayMinutes=dayMinutes;
      s.lastNight.nightCareMinutes=(s.lastNight.nightCareMinutes||0)+r.minutes;
      if(!s.lastNight.nightCare)s.lastNight.nightCare=[];
      s.lastNight.nightCare.push({type:type,minutes:r.minutes});
      function nightTime(minutes){return String(Math.floor((160+minutes)/60)).padStart(2,'0')+':'+String((160+minutes)%60).padStart(2,'0');}
      r.clock={before:nightTime(nightBefore),after:nightTime(nightBefore+r.minutes)};r.atNight=true;
    }
    return r;
  }
  function finishWork(s,opts){
    opts=opts||{};
    if(!valid(s))return result(false,'진행 상태를 확인할 수 없다.',0,0,{reason:'invalidState'});
    var previous=s.work.find(function(work){return work.day===s.day;});
    if(previous)return result(true,previous.reason,0,0,{alreadyDone:true,work:previous});
    if(s.day<1||s.day>12||s.phase==='ending')return result(false,'오늘의 업무를 기록할 수 없다.',0,0,{reason:'wrongDay'});
    if(weekend(s.day))return result(false,'오늘은 출근하지 않는다.',0,0,{reason:'weekend',weekend:true});
    if(s.phase!=='morning'&&s.phase!=='work')return result(false,'출근한 뒤 업무를 마치자.',0,0,{reason:'wrongPhase'});
    var task=workTask(s),item=schedule[s.day],condition=fatigue(s),completed=opts.completed!==false;
    var missing=Array.isArray(opts.missing)?opts.missing.slice():completed?[]:item.required.slice();
    var fileKey=s.day===9?'rowsFile':s.day===12?'reportCopy':null;
    if(task.missingFiles&&fileKey&&missing.indexOf(fileKey)===-1)missing.push(fileKey);
    missing=missing.filter(function(key,index){return typeof key==='string'&&missing.indexOf(key)===index;});
    var resolved=Array.isArray(opts.resolved)?opts.resolved:[];
    s.issueQueue.forEach(function(issue){if(!issue.resolved&&resolved.indexOf(issue.id)!==-1){issue.resolved=true;issue.resolvedDay=s.day;}});
    missing.forEach(function(key){addIssue(s,s.day,key,opts.labels&&opts.labels[key],!completed?'unfinished':'missingData',item.deadline);});
    var planned=s.planDays.indexOf(s.day)!==-1;
    var referenceTime=!task.prepared&&!s.flags.referenceOpened?(planned?5:15):0;
    var delay=(s.workMin||0)+task.lateMinutes+(task.borrowedLaptop?45:0)+referenceTime;
    var onTime=s.day!==12||delay<=20;
    var status=!completed?'missed':missing.length?'partial':!onTime?'late':condition!=='normal'?'strained':task.prepared?'good':'steady';
    var reason=status==='missed'?'남은 항목을 적고 퇴근했다. 내일 먼저 확인해야 한다.':status==='partial'?'자료를 공유했지만 빠진 항목이 있다. 다음에 고칠 일을 적었다.':status==='late'?'자료는 완성했지만 09:20을 넘겼다. 회의에서 준비가 늦어진 것을 알렸다.':status==='strained'?'자료를 공유했다. 집중하기 어려워 다시 확인할 힘이 적었다.':task.prepared?'챙겨 온 원본을 확인하며 자료를 공유했다.':'공유 폴더에서 원본을 찾아 자료를 공유했다.';
    var report={day:s.day,task:item.task,deadline:!!item.deadline,status:status,prepared:task.prepared,energy:s.energy,fatigue:condition,reason:reason,planned:planned,completed:completed,onTime:onTime,missing:missing,resolved:resolved.slice(),carryover:unresolved(s).map(function(issue){return issue.id;}),lateMinutes:task.lateMinutes,borrowedLaptop:task.borrowedLaptop,extraMinutes:delay,reviewsUsed:s.workActionsUsed||0};
    s.work.push(report);s.workMin=delay;
    if(preparedFor(s,s.day)){s.preparedDays=s.preparedDays.filter(function(day){return day!==s.day;});s.prep=Math.max(0,s.prep-1);}
    s.energy=Math.max(0,s.energy-1);
    s.strain=clamp(s.strain+1+(!task.prepared||missing.length||!completed||condition!=='normal'?1:0),0,10);
    s.flags.workDelayMinutes=delay;
    if(s.day===12){s.project.presented=completed&&onTime&&missing.length===0&&unresolved(s).length===0;s.project.finished=s.project.presented;s.project.launched=s.project.presented;}
    s.phase='afterWork';
    return result(true,reason,0,0,{work:report,issues:unresolved(s),project:s.project});
  }
  function arriveHome(s){if(!valid(s)||s.phase==='ending'||s.phase==='evening'&&s.lastArrivedDay===s.day)return;s.phase='evening';s.eveningMin=weekend(s.day)?0:60+(s.flags.workDelayMinutes||0);s.eveningStartMin=weekend(s.day)?600:1200;s.needs=needs();s.water=false;s.done={};s.lastArrivedDay=s.day;s.hasBag=false;s.bagPacked=false;s.bagPrepared=false;s.packedForDay=null;s.roller.active=false;}
  function objective(s){if(!s.flags.initialShopDone)return{key:'firstFood',text:'휴대폰에서 사료를 산다.',actions:['buyFood','buyFavorite'],mandatory:true};if(s.phase==='morning'){if(!s.dressed)return{key:'dress',text:'출근할 옷을 입는다. 08:10까지 집을 나선다.',actions:['dress']};if(!s.hasBag)return{key:'bag',text:s.bagPacked?'챙긴 가방을 집는다.':'노트북과 자료를 가방에 넣는다.',actions:s.bagPacked?['pickBag']:['packBag']};return{key:'commute',text:'08:10까지 집을 나선다.',actions:['leaveHome']};}if(s.phase==='work')return{key:'work',text:schedule[s.day].task,actions:['work'],task:workTask(s)};if(s.phase==='afterWork')return{key:'home',text:'집으로 돌아간다.',actions:['commuteHome']};if(s.food<=1&&!s.flags.foodLowAcknowledged)return{key:'foodLow',text:'남은 사료를 확인하고 다음 밥을 준비한다.',actions:['acknowledgeFood','buyFood','buyFavorite'],mandatory:true};if(!s.needs.fed)return{key:'feed',text:'고양이 밥을 준비한다.',actions:['feed']};if(!s.water)return{key:'water',text:'물을 갈아 준다.',actions:['water']};return{key:'evening',text:weekend(s.day)?'집안일, 고양이와 놀기, 내일 준비 중 할 일을 고른다.':'남은 시간에 할 일을 고르고 23:00 전에 눕는다.',actions:['play','prepare','rest','sleep']};}
  function ending(s){
    if(!valid(s))return{key:'finding',title:'첫 두 주가 끝났다',lines:['내일 할 일을 적었다.']};
    var pending=unresolved(s),presented=s.project.presented;
    var projectLine=presented?'금요일 아침, 준비한 자료로 첫 팀 회의를 마쳤다.':'첫 팀 회의에서 준비가 부족한 부분을 알렸다. 남은 자료는 월요일에 보완하기로 했다.';
    if(s.strain>=8||s.energy<=0)return{key:'worn',title:'첫 두 주가 끝났다',presented:presented,lines:[projectLine,s.cat+' 곁에 앉아 알람을 다시 맞췄다. 주말 일정은 비워 뒀다.']};
    if(s.trust<=3)return{key:'distance',title:'첫 두 주가 끝났다',presented:presented,lines:[projectLine,s.cat+'는 소파 끝에서 나를 봤다. 이번에는 내가 가까이 앉아 기다렸다.']};
    if(presented&&s.routine>=3&&s.trust>=5&&s.strain<=5){
      var resting=s.lastNight&&!s.lastNight.open?'문을 닫았다. '+s.cat+(s.hoodie?'는 후드티 위에서':s.flags.cozyBox?'는 담요를 깐 상자에서':'는 소파에서')+' 잠들었다.':s.cat+'가 베개 옆에 누웠다. 나는 휴대폰을 내려놓았다.';
      return{key:'settled',title:'첫 두 주가 끝났다',presented:true,lines:[projectLine,resting]};
    }
    return{key:'finding',title:'첫 두 주가 끝났다',presented:presented,pending:pending.length,lines:[projectLine,s.lastNight&&!s.lastNight.open?s.cat+'는 거실에서, 나는 방에서 잤다. 내일은 출근하지 않는다.':s.cat+'가 베개 옆에 누웠다. 내일은 출근하지 않는다.']};
  }
  return{create:create,act:act,actAtNight:actAtNight,sleep:sleep,finishWork:finishWork,arriveHome:arriveHome,ending:ending,ready:ready,clock:clock,fatigue:fatigue,duration:duration,objective:objective,workTask:workTask,workBudget:workBudget,schedule:schedule,DURATIONS:DURATIONS,EVENING_LIMIT:180,SHEET_CAPACITY:Number.MAX_SAFE_INTEGER};
}());
if(typeof module!=='undefined'&&module.exports)module.exports=Life;
