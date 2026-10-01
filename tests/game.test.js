import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, makeShipment, makeCase, currentCase, correctVerdict, reduce, restore, validateCase, sealMatches, scaleAngle, totalWeight, ECONOMY, readyToJudge, shipmentComplete, workerTarget, workerDuration, SHIFT_MS } from '../src/game.js';
function begin(s=initialState()) {
 if(s.screen==='harbor') s=reduce(s,{type:'start'});
 if(s.screen==='briefing') s=reduce(s,{type:'acknowledgeRules'});
 if(s.screen==='introduction') s=reduce(s,{type:'beginInspection'});
 return s;
}
function complete(s) {
 const c=currentCase(s);
 if(c.checks.includes('seal'))s=reduce(s,{type:'checked',check:'seal'});
 if(c.checks.includes('weight')){
  s=reduce(s,{type:'resetWeights'});
  let mass=c.actual;
  for(const w of [10,5,2,1])while(mass>=w){s=reduce(s,{type:'weight',value:w});mass-=w;}
 }
 return s;
}
function judge(s, verdict=correctVerdict(currentCase(s))) { return reduce(complete(s),{type:'judge',verdict}); }
function hire(s=initialState()) { s.coins=80;s=reduce(s,{type:'upgrades'});s=reduce(s,{type:'hire'});s=reduce(s,{type:'harbor'});return s; }
function resolveShip(s) {
 while(!shipmentComplete(s)){s=judge(begin(s));s=reduce(s,{type:'next'});}
 assert.equal(s.screen,'shipment');return s;
}
test('deterministic shipments have valid varied evidence and occasional third lots',()=>{
 const outcomes=new Set();
 for(let seed=0;seed<20;seed++)for(let i=0;i<40;i++){
  const ship=makeShipment(seed,i,true);assert.deepEqual(ship,makeShipment(seed,i,true));
  assert.equal(ship.lots.length,i%3===2?3:2);assert.ok(ship.lots.every(validateCase));
  assert.ok(ship.lots.every(l=>l.captain===ship.captain));outcomes.add(ship.lots.slice(0,2).map(correctVerdict).join(','));
 }
 assert.equal(outcomes.size,4,'Do not guarantee exactly one bad lot');
});
test('first shipment teaches seal and weighing with a mixed outcome',()=>{
 const s=initialState();assert.deepEqual(s.ship.lots.map(l=>l.type),['seal','weight']);
 assert.deepEqual(s.ship.lots.map(correctVerdict),['clear','hold']);assert.equal(s.hired,false);
});
test('single-cargo baseline preserves the exact ordered evidence and rewards',()=>{
 let serial=0;
 for(let group=0;group<8;group++)for(const lot of makeShipment(7,group,true).lots){
  assert.deepEqual(makeShipment(7,serial++,true,true).lots[0],lot);
 }
});
test('briefing and first arrival do not consume shift time',()=>{
 let s=reduce(initialState(),{type:'start'});s=reduce(s,{type:'tick',ms:50000});assert.equal(s.remainingMs,SHIFT_MS);
 s=reduce(s,{type:'beginInspection'});assert.equal(s.screen,'briefing');
 s=reduce(s,{type:'acknowledgeRules'});s=reduce(s,{type:'tick',ms:50000});assert.equal(s.remainingMs,SHIFT_MS);
 s=begin(s);s=reduce(s,{type:'tick',ms:1000});assert.equal(s.remainingMs,SHIFT_MS-1000);
});
test('lot switching preserves weights, measured mass, seal focus and checked evidence',()=>{
 let s=begin();s=reduce(s,{type:'focus',part:'marks'});s=reduce(s,{type:'checked',check:'seal'});
 s=reduce(s,{type:'selectLot',index:1});s=reduce(s,{type:'weight',value:2});
 s=reduce(s,{type:'selectLot',index:0});assert.deepEqual(currentCase(s).checked,['seal']);assert.equal(currentCase(s).sealFocus,'marks');
 s=reduce(s,{type:'selectLot',index:1});assert.deepEqual(currentCase(s).weights,[2]);
 s=complete(s);const actual=currentCase(s).actual;s=reduce(s,{type:'resetWeights'});assert.equal(currentCase(s).measured,actual);assert.ok(readyToJudge(s));
 s=restore(JSON.stringify(s));assert.equal(currentCase(s).measured,actual);
});
test('verdicts require all checks and cannot forge weight completion',()=>{
 let s=begin();s=reduce(s,{type:'judge',verdict:'clear'});assert.equal(s.coins,0);
 s.ship=makeShipment(s.seed,2);s.activeLot=2;s.ship.introduced=true;currentCase(s).started=true;
 s=reduce(s,{type:'checked',check:'weight'});assert.deepEqual(currentCase(s).checked,[]);
 s=reduce(s,{type:'checked',check:'seal'});assert.equal(readyToJudge(s),false);
 s=reduce(s,{type:'judge',verdict:'clear'});assert.equal(s.results.length,0);
 s=judge(s);assert.equal(s.results.length,1);
});
test('mixed shipment needs both verdicts and departure adds no second payment',()=>{
 let s=judge(begin());assert.equal(s.coins,20);assert.equal(s.results[0].clerk,0);
 s=reduce(s,{type:'next'});assert.equal(s.screen,'inspection');assert.equal(s.activeLot,1);assert.equal(s.ship.captain,0);
 s=judge(s);assert.equal(s.coins,40);assert.deepEqual(s.ship.lots.map(l=>l.result.verdict),['clear','hold']);
 s=reduce(s,{type:'next'});assert.equal(s.screen,'shipment');s=reduce(s,{type:'depart'});assert.equal(s.coins,40);assert.equal(s.departures,1);
 s=reduce(s,{type:'depart'});assert.equal(s.departures,1);
});
test('finding a discrepancy on first selected lot does not end the shipment',()=>{
 let s=begin();s=reduce(s,{type:'selectLot',index:1});s=judge(s);s=reduce(s,{type:'next'});
 assert.equal(s.screen,'inspection');assert.equal(s.activeLot,0);assert.equal(shipmentComplete(s),false);
});
test('false hold and false clear pay zero without deductions',()=>{
 for(const index of [0,1]){
  let s=begin();s.coins=99;s=reduce(s,{type:'selectLot',index});s=judge(s,correctVerdict(currentCase(s))==='clear'?'hold':'clear');
  assert.equal(s.coins,99);assert.equal(currentCase(s).result.shipment,0);assert.equal(currentCase(s).result.clerk,0);
 }
});
test('reload and repeated judgments cannot repay a resolved lot',()=>{
 let s=judge(begin());s=restore(JSON.stringify(s));s=reduce(s,{type:'judge',verdict:'clear'});assert.equal(s.coins,20);
 s=reduce(s,{type:'next'});s=reduce(s,{type:'selectLot',index:0});assert.equal(s.activeLot,1);assert.equal(s.results.length,1);
});
test('timer allows only selected lot overtime and carries all other progress into next shift',()=>{
 let s=begin();s=reduce(s,{type:'checked',check:'seal'});s=reduce(s,{type:'selectLot',index:1});s=reduce(s,{type:'weight',value:2});
 const shipId=s.ship.id,lot0=s.ship.lots[0].id;
 s=reduce(s,{type:'tick',ms:SHIFT_MS});assert.equal(s.overtimeLotId,currentCase(s).id);
 s=reduce(s,{type:'selectLot',index:0});assert.equal(s.activeLot,1);
 s=reduce(s,{type:'harbor'});s=reduce(s,{type:'start'});assert.equal(s.screen,'inspection');
 s=judge(s);s=reduce(s,{type:'next'});assert.equal(s.screen,'summary');assert.equal(s.coins,20);
 s=reduce(s,{type:'nextShift'});assert.equal(s.ship.id,shipId);assert.equal(currentCase(s).id,lot0);assert.deepEqual(currentCase(s).checked,['seal']);assert.equal(s.results.length,0);
 s=judge(begin(s));assert.equal(s.coins,40);s=reduce(s,{type:'next'});assert.equal(s.screen,'shipment');assert.equal(s.results.length,1);
});
test('unstarted lots survive expiry at an arrival; no free overtime',()=>{
 let s=resolveShip(begin());s=reduce(s,{type:'depart'});const id=s.ship.id;
 s=reduce(s,{type:'tick',ms:SHIFT_MS});assert.equal(s.screen,'summary');assert.equal(s.overtimeLotId,null);
 s=reduce(s,{type:'beginInspection'});assert.equal(s.screen,'summary');
 s=reduce(s,{type:'nextShift'});assert.equal(s.ship.id,id);assert.equal(s.remainingMs,SHIFT_MS);
});
test('expiry during result retains feedback then finishes the appropriate summary',()=>{
 let s=judge(begin());s=reduce(s,{type:'tick',ms:SHIFT_MS});assert.equal(s.screen,'result');
 s=reduce(s,{type:'next'});assert.equal(s.screen,'summary');
 s=resolveShip(begin());s=reduce(s,{type:'tick',ms:SHIFT_MS});assert.equal(s.screen,'shipment');
 s=reduce(s,{type:'depart'});assert.equal(s.screen,'summary');assert.equal(s.coins,40);
});
test('hiring and training are gated, affordable and idempotent',()=>{
 let s=initialState();s.coins=200;s=reduce(s,{type:'hire'});assert.equal(s.hired,false);
 s=reduce(s,{type:'upgrades'});s=reduce(s,{type:'train'});assert.equal(s.trained,false);
 s=reduce(s,{type:'hire'});s=reduce(s,{type:'hire'});assert.equal(s.coins,120);
 s=reduce(s,{type:'train'});s=reduce(s,{type:'train'});assert.equal(s.coins,60);assert.equal(workerDuration(s),4000);
 s=reduce(s,{type:'harbor'});s=judge(begin(s));assert.equal(s.results[0].clerk,6);
});
test('Mara certifies another lot while player inspects and leaves the verdict to the player',()=>{
 let s=begin(hire());s=reduce(s,{type:'selectLot',index:1});assert.equal(workerTarget(s).id,s.ship.lots[0].id);
 s=reduce(s,{type:'tick',ms:7999});assert.equal(s.ship.lots[0].certified,false);
 s=reduce(s,{type:'tick',ms:1});assert.equal(s.ship.lots[0].certified,true);assert.deepEqual(s.ship.lots[0].checked,['seal']);assert.equal(s.results.length,0);assert.equal(s.coins,0);
 s=reduce(s,{type:'selectLot',index:0});assert.ok(readyToJudge(s));s=reduce(s,{type:'judge',verdict:'clear'});assert.equal(s.coins,22);
});
test('worker progress pauses in planning and explicit pause; never advances during overtime',()=>{
 let s=begin(hire());s=reduce(s,{type:'selectLot',index:1});s=reduce(s,{type:'tick',ms:1000});
 s=reduce(s,{type:'pause'});s=reduce(s,{type:'tick',ms:50000});assert.equal(s.ship.lots[0].sealWorkMs,1000);
 s=reduce(s,{type:'resume'});s=reduce(s,{type:'upgrades'});s=reduce(s,{type:'tick',ms:50000});assert.equal(s.ship.lots[0].sealWorkMs,1000);
 s=reduce(s,{type:'harbor'});s=reduce(s,{type:'start'});s.remainingMs=2000;s=reduce(s,{type:'tick',ms:10000});assert.equal(s.ship.lots[0].sealWorkMs,3000);
 s=reduce(s,{type:'tick',ms:10000});assert.equal(s.ship.lots[0].sealWorkMs,3000);assert.equal(s.ship.lots[0].certified,false);
});
test('switching onto a worker target preserves her partial progress without checking selected lot',()=>{
 let s=begin(hire());s=reduce(s,{type:'selectLot',index:1});s=reduce(s,{type:'tick',ms:3000});
 s=reduce(s,{type:'selectLot',index:0});s=reduce(s,{type:'tick',ms:6000});assert.equal(s.ship.lots[0].sealWorkMs,3000);assert.equal(s.ship.lots[0].certified,false);
 s=reduce(s,{type:'selectLot',index:1});s=reduce(s,{type:'tick',ms:5000});assert.ok(s.ship.lots[0].certified);
});
test('certified seal on combined lot does not bypass weighing',()=>{
 let s=begin(hire());s.ship=makeShipment(s.seed,2);s.activeLot=1;s.ship.lots[0].checked=['seal'];
 s=reduce(s,{type:'tick',ms:8000});assert.equal(s.ship.lots[2].certified,true);
 s=reduce(s,{type:'selectLot',index:2});assert.equal(readyToJudge(s),false);s=complete(s);assert.ok(readyToJudge(s));
});
test('premium berth affects new manifests only',()=>{
 let s=initialState();s.coins=120;s=reduce(s,{type:'upgrades'});s=reduce(s,{type:'upgrade'});s=reduce(s,{type:'upgrade'});assert.equal(s.coins,0);
 assert.ok(s.ship.lots.every(l=>!l.premium));s=reduce(s,{type:'harbor'});s=resolveShip(begin(s));s=reduce(s,{type:'depart'});
 assert.ok(s.ship.lots.some(l=>l.premium&&l.reward===ECONOMY.premium));
});
test('more than five arrivals work with no fixed shift count',()=>{
 let s=begin();for(let i=0;i<7;i++){s=reduce(s,{type:'yard'});for(const x of s.yard)s=reduce(s,{type:'deliver',id:x.id});s=reduce(s,{type:'yardBack'});s=resolveShip(begin(s));s=reduce(s,{type:'depart'});}
 assert.equal(s.departures,7);assert.equal(s.ended,false);assert.equal(s.remainingMs,SHIFT_MS);
});
test('weight balance and combined evidence remain correct',()=>{
 assert.ok(scaleAngle(10,5)<0);assert.ok(scaleAngle(5,10)>0);assert.equal(scaleAngle(10,10),0);assert.equal(totalWeight([10,5,2,1]),18);
 const c=makeCase(7,1,4);c.presented={...c.reference};c.actual=c.declared;assert.equal(correctVerdict(c),'clear');
 c.presented.marks++;assert.equal(sealMatches(c),false);assert.equal(correctVerdict(c),'hold');
});
test('prototype restore preserves lot state and rejects another build format',()=>{
 const s=complete(begin());assert.deepEqual(restore(JSON.stringify(s)),s);assert.equal(restore('{"version":3}'),null);assert.equal(restore('bad'),null);
});
