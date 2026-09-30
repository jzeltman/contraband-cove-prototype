import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCase, initialState, currentCase, correctVerdict, reduce, restore, validateCase, sealMatches, scaleAngle, totalWeight, ECONOMY } from '../src/game.js';

test('all generated fixtures are solvable and deterministic across tiers', () => {
  for (let seed = 0; seed < 30; seed++) for (let shift = 1; shift < 20; shift++) for (let i = 0; i < 5; i++) {
    const c = makeCase(seed,shift,i,true); assert.ok(validateCase(c)); assert.deepEqual(c,makeCase(seed,shift,i,true));
    const mismatch = c.checks.includes('seal') && !sealMatches(c) || c.checks.includes('weight') && c.actual !== c.declared;
    assert.equal(correctVerdict(c),mismatch?'hold':'clear');
  }
});
test('onboarding teaches separately and introduces a combined case', () => {
  const s = initialState(); assert.deepEqual(s.cases.map(c=>c.type),['seal','seal','weight','weight','both']);
  assert.deepEqual(s.cases.slice(0,4).map(correctVerdict),['clear','hold','clear','hold']);
});
test('heavier side moves down and equal weights balance', () => {
  assert.ok(scaleAngle(10,5)<0); assert.ok(scaleAngle(5,10)>0); assert.equal(scaleAngle(10,10),0);
  assert.equal(scaleAngle(30,0),-12); assert.equal(totalWeight([1,2,5,10]),18);
});
test('correct verdict rewards exactly once, even after reloading result', () => {
  let s=reduce(initialState(),{type:'start'}); const c=currentCase(s);
  s=reduce(s,{type:'judge',verdict:correctVerdict(c),durationMs:2500});
  assert.equal(s.coins,22); assert.equal(s.results.length,1);
  s=restore(JSON.stringify(s)); s=reduce(s,{type:'judge',verdict:correctVerdict(c)});
  assert.equal(s.coins,22); assert.equal(s.results.length,1);
  s=reduce(s,{type:'next'}); s=reduce(s,{type:'next'}); assert.equal(s.index,1);
});
test('false clearance and false hold both earn zero without deductions', () => {
  for(const index of [0,1]) {
    let s=initialState(); s.index=index; s.results=index?[{id:s.cases[0].id}]:[]; s.coins=99; s.screen='inspection';
    s=reduce(s,{type:'judge',verdict:correctVerdict(currentCase(s))==='clear'?'hold':'clear'});
    assert.equal(s.coins,99); assert.equal(s.results[index].shipment,0); assert.equal(s.results[index].clerk,0);
  }
});
test('combined case requires all evidence to match', () => {
  const c=makeCase(1,1,4); c.presented={...c.reference}; c.actual=c.declared+1;
  assert.equal(correctVerdict(c),'hold'); c.actual=c.declared; assert.equal(correctVerdict(c),'clear');
  c.presented.marks++; assert.equal(correctVerdict(c),'hold');
});
test('five shipments complete a shift and next shift starts immediately', () => {
  let s=reduce(initialState(),{type:'start'});
  for(let i=0;i<5;i++) { s=reduce(s,{type:'judge',verdict:correctVerdict(currentCase(s))}); s=reduce(s,{type:'next'}); }
  assert.equal(s.index,5); assert.equal(s.screen,'summary'); assert.equal(s.coins,110);
  s=reduce(s,{type:'nextShift'}); assert.equal(s.shift,2); assert.equal(s.index,0); assert.equal(s.screen,'inspection'); assert.equal(s.history.length,1);
});
test('training and berth purchases are affordable and idempotent', () => {
  let s=initialState(); assert.equal(reduce(s,{type:'train'}).trained,false);
  s.coins=200; s=reduce(s,{type:'train'}); s=reduce(s,{type:'train'}); assert.equal(s.coins,140); assert.equal(s.trained,true);
  s=reduce(s,{type:'upgrade'}); s=reduce(s,{type:'upgrade'}); assert.equal(s.coins,20); assert.equal(s.berth,true);
  s=reduce(s,{type:'start'}); s=reduce(s,{type:'judge',verdict:correctVerdict(currentCase(s))}); assert.equal(s.results[0].clerk,ECONOMY.trainedClerk);
});
test('upgraded berth produces premium shipments only on the next shift', () => {
  let s=initialState(); s.coins=120; s=reduce(s,{type:'upgrade'}); assert.ok(s.cases.every(c=>!c.premium));
  s.index=5; s=reduce(s,{type:'nextShift'}); assert.ok(s.cases.some(c=>c.premium&&c.reward===35));
});
test('weights have tap add/remove/reset, a cap, and persist measured evidence', () => {
  let s=initialState(); s.index=2; s.screen='inspection'; const actual=currentCase(s).actual;
  for(let i=0;i<actual;i++)s=reduce(s,{type:'weight',value:1});
  assert.equal(s.measured,actual); assert.ok(s.checked.includes('weight'));
  s=reduce(s,{type:'removeWeight',index:0}); assert.equal(totalWeight(s.weights),actual-1);
  s=reduce(s,{type:'resetWeights'}); assert.equal(s.weights.length,0); assert.equal(s.measured,actual);
  for(let i=0;i<10;i++)s=reduce(s,{type:'weight',value:10}); assert.equal(totalWeight(s.weights),30);
});
test('invalid saves are rejected and unfinished evidence survives reload', () => {
  assert.equal(restore('broken'),null); assert.equal(restore('{"version":100}'),null);
  let s=initialState(); s.screen='inspection'; s.sealFocus='marks'; s.checked=['seal'];
  assert.deepEqual(restore(JSON.stringify(s)),s); s.coins=-1; assert.equal(restore(JSON.stringify(s)),null);
});
test('time passing alone never changes income', () => {
  const s=initialState(); assert.equal(reduce(s,{type:'tick',seconds:999999}).coins,0);
  assert.equal(restore(JSON.stringify(s)).coins,0);
});
