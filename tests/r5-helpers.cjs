const {game,SAVE_KEY}=require('./game-harness.cjs'),Life=require('../src/life-state.js'),Story=require('../src/life-story.js');
function fixture(day=0,phase='evening'){
 const s=Life.create('하늘','땅콩');Life.act(s,'buyFood');for(let i=0;i<3;i++)Life.winterShift(s,i);s.flags.employed=s.flags.routineIntroduced=s.flags.phoneIntroduced=true;s.day=day;s.phase=phase;s.minute=phase==='morning'?440:phase==='work'?540:1200;return s;
}
function read(g,choice){for(let i=0;i<160&&g.snap().dialogue;i++){g.step(.38);const options=g.get('choices').children;if(options.length){let b=typeof choice==='function'?options[choice(g.snap())]:choice?options.find(b=>b.textContent.includes(choice)):options[0];if(!b||b.disabled)throw new Error('대화 선택 없음: '+choice);b.onclick();}else g.key('Enter');}g.step(.4);if(g.snap().dialogue)read(g,choice);}
function black(g){for(let i=0;i<40&&g.snap().black;i++){g.step(.38);g.key('Enter');}g.step(.4);read(g);}
function message(g,{physical=false}={}){if(physical)g.target('베개 옆 휴대폰');else g.click('phoneButton');g.button('phoneBody','메시지');g.button('phoneBody','담당자');g.button('phoneBody','내려놓는다');}
function pour(g){const p=g.snap().miniTool,t=g.snap().miniTarget;g.drag([p.x,p.y],[t.x,t.y],3.5);read(g);}
function care(g){g.toRoom('living');if(!g.snap().state.needs.fed){g.target('밥그릇');pour(g);}if(g.snap().state.waterChangedDay!==g.snap().state.day){g.target('물그릇');pour(g);}if(g.snap().state.litterDirty){g.target('모래를');clean(g);}}
function clean(g){const p=g.snap().miniTool;g.pointer('pointerdown',p.x,p.y);for(const c of g.snap().clumps)g.pointer('pointermove',c.x,c.y);g.pointer('pointerup',400,220);g.step(1.2);read(g);}
function pet(g){g.target('쓰다듬');g.pointer('pointerdown',280,235);for(let i=0;i<12;i++){g.pointer('pointermove',i%2?280:430,235);g.step(.22);}g.pointer('pointerup',430,235);g.step(1.8);}
function play(g){g.toRoom('living');if(g.snap().state.toy?.basic===0&&!g.snap().state.equipment?.premiumToy){g.target('슈퍼에 다녀');g.target('생활 가전');g.button('choices','기본 장난감 교체');read(g,'구매한다');read(g);g.target('장보기를 마치고',2);read(g);}g.target('쥐 인형으로');g.drag([330,235],[460,245],4);read(g);}
function buy(g,label='건사료 12,000'){g.target(label);read(g,'구매한다');read(g);}
function bed(g,open=true){g.toRoom('bedroom');g.target('잠자리에');read(g);g.key(open?'ArrowRight':'ArrowLeft');g.button('miniActions','이대로 잠들기',5);g.step(.8);if(g.snap().catControl){if(g.snap().guideId==='catscent')g.target('옷 냄새',3);else{g.target('문을 앞발');g.target('쥐 인형을 문다');g.target('인형을 문 앞',3);}}if(g.snap().nightScene){read(g,'다시 눕는다');g.step(3);}read(g);}
function commute(g){g.toRoom('bedroom');g.target('출근복');read(g);if(g.snap().state.roller.owned&&g.snap().state.fur){g.target('옷에 붙은 털');g.button('miniActions','키보드로');g.step(2);}if(!g.snap().state.bagPacked){g.target('가방을');for(const i of g.snap().items)g.drag([i.x,i.y],[455,245],.2);g.step(1.6);read(g);}if(!g.snap().state.hasBag)g.target('가방을 집는다');g.toRoom('living');g.target('신발을 신고');if(g.snap().ack)g.ack('오늘은 그냥');g.step(1);if(g.snap().scene==='station')g.target('열차에 탄다',5);g.target('팀장에게');read(g);}
function consult(g){g.target('내 자리');read(g,snap=>Story.customers(snap.state).find(c=>c.id===snap.state.currentConsultation.id).correct[snap.state.currentConsultation.step]);g.step(2);read(g);}
function settle(g){g.target('내 자리');read(g,'정산한다');g.target('퇴근한다',2);g.target('장보기를 마치고',2);read(g);}
module.exports={game,Life,Story,SAVE_KEY,fixture,read,black,message,pour,care,clean,pet,play,buy,bed,commute,consult,settle};
