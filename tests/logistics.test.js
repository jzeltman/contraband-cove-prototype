import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce, shiftDuration, yardCapacity, exportRoom, canAdmitShip, deliveryDuration, currentCase } from '../src/game.js';
const act=(s,type,rest={})=>reduce(s,{type,...rest});
const run=()=>act(act(act(initialState(),'start'),'acknowledgeRules'),'beginInspection');
const imp=(id='i',secure=false)=>({id,kind:'import',goods:'Supply crate',cargo:'wooden-crate',destination:secure?'Secure custody':'Town market',secure,deliveryMs:0});
const exp=(id='e',destination='Port Amber',goods='Island cloth')=>({id,kind:'export',goods,cargo:'cloth-bundle',destination});
test('one-minute shifts upgrade to 90 then 120 seconds without refilling current time',()=>{
 let s=run();s=act(s,'tick',{ms:5000});s=act(s,'upgrades');s.coins=300;
 s=act(s,'develop',{id:'time'});assert.equal(s.coins,240);assert.equal(shiftDuration(s),90000);assert.equal(s.remainingMs,55000);
 s.ended=true;s=act(s,'nextShift');assert.equal(s.remainingMs,90000);
 s=act(s,'upgrades');s=act(s,'develop',{id:'time'});assert.equal(s.coins,120);assert.equal(shiftDuration(s),120000);
 s=act(s,'develop',{id:'time'});assert.equal(s.coins,120);s.ended=true;s=act(s,'nextShift');assert.equal(s.remainingMs,120000);
});
test('development prerequisites and costs cannot be bypassed',()=>{
 let s=initialState();s.coins=300;s=act(s,'develop',{id:'warehouse'});assert.equal(yardCapacity(s),3);
 s=act(s,'upgrades');s=act(s,'develop',{id:'transport'});assert.equal(s.transport,0);assert.equal(s.coins,300);
 s=act(s,'develop',{id:'warehouse'});assert.equal(yardCapacity(s),6);assert.equal(s.coins,240);
 s=act(s,'develop',{id:'warehouse'});assert.equal(yardCapacity(s),9);assert.equal(s.coins,120);
 s=act(s,'develop',{id:'warehouse'});assert.equal(s.coins,120);
 s=act(s,'develop',{id:'porter'});assert.ok(s.porter);assert.equal(s.coins,40);s=act(s,'develop',{id:'porter'});assert.equal(s.coins,40);
 s=act(s,'develop',{id:'transport'});assert.equal(s.transport,0);
});
test('full yard blocks a new shipment; manual delivery restores admission without coins',()=>{
 let s=run();s.shipAdmitted=false;s.screen='introduction';s.yard=[imp('a'),imp('b'),imp('c',true)];assert.equal(canAdmitShip(s),false);
 s=act(s,'beginInspection');assert.equal(s.screen,'introduction');s=act(s,'yard');s=act(s,'deliver',{id:'c'});assert.equal(s.delivered,1);assert.equal(s.coins,0);assert.match(s.notice,/secure custody/);
 assert.equal(canAdmitShip(s),false);s=act(s,'deliver',{id:'a'});s=act(s,'yardBack');s=act(s,'beginInspection');assert.equal(s.screen,'inspection');assert.ok(s.shipAdmitted);
});
test('exports cannot consume room reserved for active inbound cargo',()=>{
 let s=act(run(),'yard');s.exportWait=[exp('a'),exp('b')];assert.equal(exportRoom(s),1);
 s=act(s,'unloadExport',{id:'a'});assert.equal(s.yard.length,1);assert.equal(exportRoom(s),0);
 s=act(s,'unloadExport',{id:'b'});assert.equal(s.exportWait.length,1);assert.equal(s.yard.length,1);
});
test('judged cargo really occupies storage and cannot be inserted twice',()=>{
 let s=run();s=act(s,'checked',{check:'seal'});s=act(s,'judge',{verdict:'hold'});
 assert.equal(s.yard.length,1);assert.equal(s.yard[0].secure,true);assert.equal(s.coins,0);
 s=act(s,'judge',{verdict:'hold'});assert.equal(s.yard.length,1);
});
test('manual deliveries work after closing, exports are not accidentally delivered',()=>{
 let s=run();s.yard=[imp(),exp()];s=act(s,'yard');s=act(s,'tick',{ms:60000});assert.ok(s.ended);s=act(s,'yard');s=act(s,'deliver',{id:'i'});assert.equal(s.yard.length,1);
 s=act(s,'deliver',{id:'e'});assert.equal(s.yard.length,1);s=act(s,'outbound');assert.equal(s.screen,'yard');
});
test('porter works sequentially on imports only, pauses and keeps partial work across shifts',()=>{
 let s=run();s.porter=true;s.yard=[exp(),imp('a'),imp('b')];s=act(s,'tick',{ms:5000});assert.equal(s.yard[1].deliveryMs,5000);
 s=act(s,'pause');s=act(s,'tick',{ms:20000});assert.equal(s.yard[1].deliveryMs,5000);s=act(s,'resume');
 s=act(s,'upgrades');s=act(s,'tick',{ms:20000});assert.equal(s.yard[1].deliveryMs,5000);s=act(s,'harbor');s=act(s,'start');
 s=act(s,'tick',{ms:4000});assert.equal(s.yard.length,2);assert.equal(s.yard[1].deliveryMs,1000);assert.equal(s.yard[0].kind,'export');
 s.remainingMs=1000;s=act(s,'tick',{ms:20000});assert.equal(s.yard[1].deliveryMs,2000);s=act(s,'tick',{ms:20000});assert.equal(s.yard[1].deliveryMs,2000);
});
test('donkey and cart visibly shorten delivery duration, upgrading partial work never produces negative work',()=>{
 let s=run();s.porter=true;s.yard=[imp('a'),imp('b')];s=act(s,'tick',{ms:6000});s=act(s,'upgrades');s.coins=200;
 s=act(s,'develop',{id:'transport'});assert.equal(deliveryDuration(s),4000);s=act(s,'harbor');s=act(s,'start');s=act(s,'tick',{ms:100});assert.equal(s.yard.length,1);assert.equal(s.yard[0].deliveryMs,100);
 s=act(s,'upgrades');s=act(s,'develop',{id:'transport'});assert.equal(deliveryDuration(s),2000);assert.equal(s.coins,0);
});
test('export producers arrive during active time, waiting queue is capped and pause stops arrivals',()=>{
 let s=initialState();s=act(s,'tick',{ms:60000});assert.equal(s.exportWait.length,0);s=run();s=act(s,'tick',{ms:19999});assert.equal(s.exportWait.length,0);
 s=act(s,'tick',{ms:1});assert.equal(s.exportWait.length,1);s=act(s,'pause');s=act(s,'tick',{ms:60000});assert.equal(s.exportWait.length,1);s=act(s,'resume');s=act(s,'tick',{ms:40000});assert.equal(s.exportWait.length,2);
 s=act(s,'tick',{ms:60000});assert.equal(s.exportSerial,2);
});
test('export matching checks goods AND destination, rejects imports and pays exactly once',()=>{
 let s=act(run(),'yard');s.shipAdmitted=false;s.yard=[exp('a'),exp('b','Port Amber','Island spices'),exp('wrong','Northwatch'),imp()];s=act(s,'outbound');assert.equal(s.outbound.orders.length,2);
 for(const id of ['wrong','i']){s=act(s,'loadExport',{id});assert.match(s.notice,/does not match/);assert.equal(s.yard.length,4);}
 s=act(s,'dispatchExport');assert.equal(s.coins,0);s=act(s,'loadExport',{id:'a'});assert.equal(s.yard.length,3);s=act(s,'loadExport',{id:'a'});assert.equal(s.yard.length,3);
 s=act(s,'loadExport',{id:'b'});s=act(s,'dispatchExport');assert.equal(s.coins,50);assert.equal(s.exportIncome,50);assert.equal(s.outbound,null);
 s=act(s,'dispatchExport');assert.equal(s.coins,50);s=act(s,'yardBack');assert.equal(s.screen,'inspection');
});
test('export loading stops at closing and resumes next shift without lost cargo or free overtime',()=>{
 let s=act(run(),'yard');s.yard=[exp('a'),exp('b','Port Amber','Island spices')];s=act(s,'outbound');s=act(s,'loadExport',{id:'a'});s=act(s,'tick',{ms:60000});assert.equal(s.screen,'summary');assert.equal(s.overtimeLotId,null);
 s=act(s,'loadExport',{id:'b'});assert.equal(s.yard.length,1);s=act(s,'dispatchExport');assert.equal(s.coins,0);
 s=act(s,'nextShift');s=act(s,'acknowledgeRules');s=act(s,'yard');s=act(s,'outbound');assert.equal(s.outbound.orders[0].loaded,true);
 s=act(s,'loadExport',{id:'b'});s=act(s,'dispatchExport');assert.equal(s.coins,50);assert.equal(s.exportIncome,50);
});
test('opening yard during inspection overtime preserves only the current lot and return route',()=>{
 let s=run();s=act(s,'tick',{ms:60000});const id=currentCase(s).id;s=act(s,'yard');s=act(s,'tick',{ms:80000});assert.equal(s.overtimeLotId,id);s=act(s,'yardBack');assert.equal(s.screen,'inspection');
});
