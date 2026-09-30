import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCase, initialState, currentCase, correctVerdict, reduce, restore, validateCase, sealMatches, scaleAngle, totalWeight, ECONOMY, readyToJudge, dailyRules } from '../src/game.js';
function begin(s=initialState()) {
  s=reduce(s,{type:'start'});
  if(s.screen==='briefing') s=reduce(s,{type:'acknowledgeRules'});
  if(s.screen==='introduction') s=reduce(s,{type:'beginInspection'});
  return s;
}
function complete(s) {
  const c=currentCase(s);
  if(c.checks.includes('seal'))s=reduce(s,{type:'checked',check:'seal'});
  if(c.checks.includes('weight')) {
    s=reduce(s,{type:'resetWeights'});
    for(let i=0;i<c.actual;i++)s=reduce(s,{type:'weight',value:1});
  }
  return s;
}
test('generated cases remain deterministic and solvable across tiers',()=>{
  for(let seed=0;seed<30;seed++)for(let shift=1;shift<20;shift++)for(let i=0;i<5;i++){
    const c=makeCase(seed,shift,i,true);assert.ok(validateCase(c));assert.deepEqual(c,makeCase(seed,shift,i,true));
    const bad=c.checks.includes('seal')&&!sealMatches(c)||c.checks.includes('weight')&&c.actual!==c.declared;
    assert.equal(correctVerdict(c),bad?'hold':'clear');
  }
});
test('first shift teaches tools separately and then combines them',()=>{
 const s=initialState();assert.deepEqual(s.cases.map(c=>c.type),['seal','seal','weight','weight','both']);
 assert.deepEqual(s.cases.slice(0,4).map(correctVerdict),['clear','hold','clear','hold']);
});
test('new shift requires briefing then captain introduction',()=>{
 let s=reduce(initialState(),{type:'start'});assert.equal(s.screen,'briefing');
 s=reduce(s,{type:'beginInspection'});assert.equal(s.screen,'briefing');
 s=reduce(s,{type:'acknowledgeRules'});assert.equal(s.screen,'introduction');
 s=reduce(s,{type:'beginInspection'});assert.equal(s.screen,'inspection');
 assert.ok(s.briefed&&s.introduced);assert.equal(s.coins,0);
});
test('seal verdict is blocked until explicit marking',()=>{
 let s=begin();s=reduce(s,{type:'focus',part:'marks'});
 s=reduce(s,{type:'judge',verdict:'clear'});assert.equal(s.screen,'inspection');assert.equal(s.coins,0);
 assert.equal(readyToJudge(s),false);
 s=reduce(s,{type:'checked',check:'seal'});assert.ok(readyToJudge(s));
 s=reduce(s,{type:'judge',verdict:'clear'});assert.equal(s.coins,22);
});
test('combined case requires both steps and cannot forge a weight completion',()=>{
 let s=initialState();s.index=4;s=begin(s);
 s=reduce(s,{type:'checked',check:'weight'});assert.equal(s.checked.length,0);
 s=reduce(s,{type:'checked',check:'seal'});assert.equal(readyToJudge(s),false);
 s=reduce(s,{type:'judge',verdict:'hold'});assert.equal(s.results.length,0);
 s=complete(s);assert.ok(readyToJudge(s));assert.equal(s.screen,'inspection');
 s=reduce(s,{type:'judge',verdict:correctVerdict(currentCase(s))});assert.equal(s.results.length,1);
});
test('heavier scale side moves down and balanced scale is level',()=>{
 assert.ok(scaleAngle(10,5)<0);assert.ok(scaleAngle(5,10)>0);assert.equal(scaleAngle(10,10),0);assert.equal(scaleAngle(30,0),-12);
 assert.equal(totalWeight([1,2,5,10]),18);
});
test('correct rewards stay idempotent after result reload and duplicate next',()=>{
 let s=complete(begin());s=reduce(s,{type:'judge',verdict:'clear',durationMs:2500});
 assert.equal(s.coins,22);s=restore(JSON.stringify(s));s=reduce(s,{type:'judge',verdict:'clear'});
 assert.equal(s.coins,22);assert.equal(s.results.length,1);
 s=reduce(s,{type:'next'});assert.equal(s.screen,'introduction');s=reduce(s,{type:'next'});assert.equal(s.index,1);
});
test('false clearance and false hold earn zero without deductions',()=>{
 for(const index of [0,1]){
  let s=initialState();s.index=index;s.results=index?[{id:s.cases[0].id}]:[];s.coins=99;s=complete(begin(s));
  s=reduce(s,{type:'judge',verdict:correctVerdict(currentCase(s))==='clear'?'hold':'clear'});
  assert.equal(s.coins,99);assert.equal(s.results[index].shipment,0);assert.equal(s.results[index].clerk,0);
 }
});
test('combined evidence needs all facts to match to clear',()=>{
 const c=makeCase(1,1,4);c.presented={...c.reference};c.actual=c.declared+1;assert.equal(correctVerdict(c),'hold');
 c.actual=c.declared;assert.equal(correctVerdict(c),'clear');c.presented.marks++;assert.equal(correctVerdict(c),'hold');
});
test('every captain has an introduction and every new shift has a briefing',()=>{
 let s=begin();
 for(let i=0;i<5;i++){
  if(i){assert.equal(s.screen,'introduction');s=reduce(s,{type:'beginInspection'});}
  s=complete(s);s=reduce(s,{type:'judge',verdict:correctVerdict(currentCase(s))});s=reduce(s,{type:'next'});
 }
 assert.equal(s.screen,'summary');assert.equal(s.coins,110);
 s=reduce(s,{type:'nextShift'});assert.equal(s.screen,'briefing');assert.equal(s.shift,2);assert.equal(s.briefed,false);assert.equal(s.introduced,false);
 assert.equal(s.history.length,1);assert.equal(dailyRules(s).title,'Daily rules · Shift 2');
});
test('training and berth purchases remain affordable and idempotent',()=>{
 let s=initialState();assert.equal(reduce(s,{type:'train'}).trained,false);
 s.coins=200;s=reduce(s,{type:'train'});s=reduce(s,{type:'train'});assert.equal(s.coins,140);
 s=reduce(s,{type:'upgrade'});s=reduce(s,{type:'upgrade'});assert.equal(s.coins,20);assert.ok(s.berth);
 s=complete(begin(s));s=reduce(s,{type:'judge',verdict:'clear'});assert.equal(s.results[0].clerk,ECONOMY.trainedClerk);
});
test('berth upgrade changes next shift cargo only',()=>{
 let s=initialState();s.coins=120;s=reduce(s,{type:'upgrade'});assert.ok(s.cases.every(c=>!c.premium));
 s.index=5;s=reduce(s,{type:'nextShift'});assert.ok(s.cases.some(c=>c.premium&&c.reward===35));
});
test('weight evidence persists after balancing, removing, and resetting weights',()=>{
 let s=initialState();s.index=2;s=begin(s);const actual=currentCase(s).actual;
 s=reduce(s,{type:'weight',value:1});assert.equal(readyToJudge(s),false);s=complete(s);assert.ok(readyToJudge(s));
 assert.equal(s.measured,actual);s=reduce(s,{type:'removeWeight',index:0});assert.equal(totalWeight(s.weights),actual-1);
 s=reduce(s,{type:'resetWeights'});assert.equal(s.measured,actual);assert.ok(readyToJudge(s));
 for(let i=0;i<10;i++)s=reduce(s,{type:'weight',value:10});assert.equal(totalWeight(s.weights),30);
});
test('harbor resumes briefing, introduction, tool state, and result',()=>{
 let s=reduce(initialState(),{type:'start'});
 for(const stage of ['briefing','introduction','inspection','result']){
  assert.equal(s.screen,stage);
  s=reduce(s,{type:'harbor'});s=restore(JSON.stringify(s));s=reduce(s,{type:'start'});assert.equal(s.screen,stage);
  if(stage==='briefing')s=reduce(s,{type:'acknowledgeRules'});
  if(stage==='introduction')s=reduce(s,{type:'beginInspection'});
  if(stage==='inspection'){s=complete(s);s=reduce(s,{type:'judge',verdict:'clear'});}
 }
});
test('version 1 saves migrate coins, upgrades and evidence without replaying rewards',()=>{
 let old=complete(begin());old.version=1;delete old.briefed;delete old.introduced;old.coins=57;old.berth=true;
 let s=restore(JSON.stringify(old));assert.equal(s.version,2);assert.equal(s.screen,'briefing');assert.equal(s.coins,57);assert.ok(s.berth);assert.deepEqual(s.checked,['seal']);
 s=begin(s);s=reduce(s,{type:'judge',verdict:'clear'});const paid=s.coins;
 s.version=1;delete s.briefed;delete s.introduced;s=restore(JSON.stringify(s));assert.equal(s.screen,'result');assert.equal(s.coins,paid);
 s=reduce(s,{type:'next'});assert.equal(s.screen,'briefing');s=begin(s);assert.equal(s.screen,'inspection');
});
test('invalid saves rejected and completed evidence persists',()=>{
 assert.equal(restore('broken'),null);assert.equal(restore('{"version":100}'),null);
 let s=complete(begin());assert.deepEqual(restore(JSON.stringify(s)),s);s.coins=-1;assert.equal(restore(JSON.stringify(s)),null);
});
test('time alone never awards coins',()=>{const s=initialState();assert.equal(reduce(s,{type:'tick',seconds:999999}).coins,0);assert.equal(restore(JSON.stringify(s)).coins,0);});
