const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async()=>{
 await fs.mkdir('test-results',{recursive:true});
 const launch=()=>chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-crashpad-for-testing',...(process.env.CHROMIUM_SINGLE_PROCESS?['--no-zygote','--single-process']:[])]});
 const browser=await launch();const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const key='contraband-cove.save.v5';
 const load=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 const action=type=>page.locator(`[data-action="${type}"]`);
 const shot=async name=>{await page.evaluate(()=>window.scrollTo(0,0));await page.waitForFunction(()=>[...document.images].every(i=>i.complete));assert.ok(await page.evaluate(()=>[...document.images].every(i=>i.naturalWidth>0)));await page.screenshot({path:`test-results/${name}.png`,fullPage:true});};
 const correct=c=>(c.checks.includes('seal')&&['symbol','marks','border'].some(k=>c.reference[k]!==c.presented[k]))||(c.checks.includes('weight')&&c.actual!==c.declared)?'hold':'clear';
 async function clearYard(){
  await action('yard').first().click();
  while((await load()).yard.some(x=>x.kind==='import'))await page.locator('.yard-grid [data-action="deliver"]').first().click();
  await action('yardBack').click();
 }
 async function finishLot(){
  const s=await load(),c=s.ship.lots[s.activeLot];
  if(c.checks.includes('seal')&&!c.checked.includes('seal')){await page.locator('[data-tab="seal"]').click();await action('checked').click();}
  if(c.checks.includes('weight')&&c.measured!==c.actual){
   await page.locator('.tool-tabs [data-tab="weight"]').click();if(await action('resetWeights').isEnabled())await action('resetWeights').click();
   let mass=c.actual;for(const w of [10,5,2,1])while(mass>=w){await page.getByRole('button',{name:`Add ${w} kg`,exact:true}).click();mass-=w;}
  }
  assert.equal(await page.locator('[data-verdict]').count(),2);
  await page.locator(`[data-verdict="${correct(c)}"]`).click();
 }
 await page.clock.install();await page.goto('http://localhost:4173/');
 await action('upgrades').click();assert.equal((await load()).hired,false);
 await page.locator('[data-id="training"]').click();assert.equal(await action('train').isDisabled(),true);
 await page.locator('[data-id="warehouse"]').click();assert.equal(await page.locator('.map-detail [data-action="upgrade"]').count(),0);
 await page.locator('[data-id="mara"]').click();assert.equal(await action('hire').isDisabled(),true);await shot('upgrade-map-locked-mobile');
 await action('harbor').first().click();await action('start').click();await action('acknowledgeRules').click();
 assert.equal((await load()).remainingMs,60000);assert.equal(await page.locator('.lot-card').count(),2);await shot('shipment-introduction-mobile');
 await action('beginInspection').click();assert.equal(await page.locator('[data-verdict]').count(),0);
 await page.locator('[data-action="selectLot"][data-index="1"]').click();await page.getByRole('button',{name:'Add 2 kg',exact:true}).click();
 await page.locator('[data-action="selectLot"][data-index="0"]').click();await action('checked').click();
 await page.locator('[data-action="selectLot"][data-index="1"]').click();assert.deepEqual((await load()).ship.lots[1].weights,[2]);
 await page.reload();assert.deepEqual((await load()).ship.lots[1].weights,[2]);assert.deepEqual((await load()).ship.lots[0].checked,['seal']);
 await action('pause').click();const paused=(await load()).remainingMs;await page.clock.fastForward(20000);assert.equal((await load()).remainingMs,paused);await action('resume').click();
 await action('declaration').click();assert.match(await page.getByRole('dialog').innerText(),/Supply crate/);const reference=(await load()).remainingMs;await page.clock.fastForward(10000);assert.equal((await load()).remainingMs,reference);await page.keyboard.press('Escape');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=(await load()).remainingMs;await page.clock.fastForward(10000);assert.equal((await load()).remainingMs,hidden);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await finishLot();assert.equal((await load()).coins,20);const paid=(await load()).coins;await page.reload();assert.equal((await load()).coins,paid);
 await action('next').click();assert.equal((await load()).activeLot,0);assert.equal((await load()).screen,'inspection');assert.equal((await load()).ship.captain,0);
 await finishLot();await action('next').click();assert.equal((await load()).screen,'shipment');await shot('shipment-summary-mobile');assert.match(await page.locator('.result-subtitle').innerText(),/1 cleared · 1 held/);
 await action('depart').click();await clearYard();assert.equal((await load()).coins,40);
 await action('beginInspection').click();await finishLot();await action('next').click();await finishLot();await action('next').click();
 assert.equal((await load()).coins,80);
 await action('harbor').first().click();await action('upgrades').click();await page.locator('[data-id="mara"]').click();await action('hire').click();assert.equal((await load()).hired,true);assert.equal((await load()).coins,0);assert.equal(await action('hire').isDisabled(),true);await shot('upgrade-map-hired-mobile');
 const planning=(await load()).remainingMs;await page.clock.fastForward(10000);assert.equal((await load()).remainingMs,planning);
 await action('harbor').first().click();await action('start').click();await action('depart').click();await clearYard();assert.equal((await load()).ship.lots.length,3);assert.equal((await load()).activeLot,1);
 await action('beginInspection').click();await page.clock.fastForward(4000);await shot('mara-working-mobile');
 const progress=(await load()).ship.lots[0].sealWorkMs;assert.ok(progress>0&&progress<8000);
 await action('declaration').click();await page.clock.fastForward(10000);assert.equal((await load()).ship.lots[0].sealWorkMs,progress);await page.keyboard.press('Escape');
 await page.clock.fastForward(5000);assert.equal((await load()).ship.lots[0].certified,true);assert.equal((await load()).results.length,4);
 await finishLot();await action('next').click();assert.equal((await load()).activeLot,0);await page.locator('.certificate').waitFor();await shot('mara-certified-mobile');
 await page.clock.fastForward(8000);assert.equal((await load()).ship.lots[2].certified,true);
 await finishLot();await action('next').click();assert.equal((await load()).activeLot,2);assert.equal(await page.locator('[data-verdict]').count(),0);await finishLot();await action('next').click();await action('depart').click();await clearYard();
 await action('beginInspection').click();await page.locator('[data-action="selectLot"][data-index="0"]').click();await action('checked').click();await page.locator('[data-action="selectLot"][data-index="1"]').click();
 const carriedShip=(await load()).ship.id;await page.clock.fastForward(181000);assert.equal((await load()).screen,'inspection');assert.equal(await page.locator('#clock-label').innerText(),'Finish this cargo');assert.equal(await page.locator('[data-action="selectLot"][data-index="0"]').isDisabled(),true);
 await finishLot();await action('next').click();assert.equal((await load()).screen,'summary');await shot('carryover-summary-mobile');
 await action('nextShift').click();assert.equal((await load()).ship.id,carriedShip);assert.equal((await load()).results.length,0);assert.deepEqual((await load()).ship.lots[0].checked,['seal']);
 await action('acknowledgeRules').click();await action('beginInspection').click();assert.equal((await load()).activeLot,0);await finishLot();await action('next').click();assert.equal((await load()).results.length,1);
 await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();await page.getByRole('heading',{name:'Ready to sail.',exact:true}).waitFor();await context.setOffline(false);
 await action('harbor').first().click();await action('upgrades').click();await page.locator('[data-id="training"]').click();await action('train').click();assert.equal((await load()).trained,true);
 await shot('upgrade-map-trained-mobile');

 // Focused logistics scenario; baseline above earns coins through actual judgments.
 const scenario=await page.evaluate(async()=>{
  const {initialState,reduce}=await import('./src/game.js');let s=initialState();
  for(const type of ['start','acknowledgeRules','beginInspection'])s=reduce(s,{type});
  s.screen='introduction';s.shipAdmitted=false;s.coins=600;
  s.yard=['a','b','c'].map((id,i)=>({id,kind:'import',goods:'Supply crate',cargo:'wooden-crate',destination:i===2?'Secure custody':'Town market',secure:i===2,deliveryMs:0}));
  s.exportWait=[{id:'e1',kind:'export',goods:'Island cloth',cargo:'cloth-bundle',destination:'Port Amber'},{id:'e2',kind:'export',goods:'Island spices',cargo:'wooden-crate',destination:'Port Amber'}];
  return s;
 });
 await page.addInitScript(({key,s})=>{if(!sessionStorage.getItem('logistics-fixture')){localStorage.setItem(key,JSON.stringify(s));sessionStorage.setItem('logistics-fixture','yes');}},{key,s:scenario});await page.reload();
 assert.equal(await action('beginInspection').count(),0);assert.match(await page.locator('.capacity-warning').innerText(),/Make room/);
 assert.match(await page.locator('.yard-badge').innerText(),/Yard full/);await action('yard').first().click();await shot('storage-full-mobile');
 await page.locator('.yard-grid [data-id="c"]').click();assert.match(await page.locator('.logistics-notice').innerText(),/secure custody/);
 await action('upgrades').click();await page.locator('[data-id="warehouse"]').click();await page.locator('.map-detail [data-action="develop"]').click();assert.equal((await load()).warehouseLevel,1);
 await page.locator('[data-id="time"]').click();const currentTime=(await load()).remainingMs;await page.locator('.map-detail [data-action="develop"]').click();assert.equal((await load()).timeLevel,1);assert.equal((await load()).remainingMs,currentTime);
 await page.locator('[data-id="porter"]').click();await page.locator('.map-detail [data-action="develop"]').click();assert.equal((await load()).porter,true);
 await page.locator('[data-id="transport"]').click();await page.locator('.map-detail [data-action="develop"]').click();assert.equal((await load()).transport,1);await shot('logistics-upgrades-mobile');
 await action('harbor').first().click();await action('start').click();assert.equal((await load()).screen,'yard');
 await page.clock.fastForward(2000);assert.ok((await load()).yard[0].deliveryMs>=2000);await shot('porter-working-mobile');
 await action('pause').click();const delivery=(await load()).yard[0].deliveryMs;await page.clock.fastForward(15000);assert.equal((await load()).yard[0].deliveryMs,delivery);await action('resume').click();
 await page.clock.fastForward(3000);assert.equal((await load()).yard.some(x=>x.id==='a'),false);
 await page.locator('[data-action="unloadExport"][data-id="e1"]').click();await page.locator('[data-action="unloadExport"][data-id="e2"]').click();await shot('storage-exports-mobile');
 await page.locator('.island-arrivals [data-action="outbound"]').click();assert.equal((await load()).outbound.orders.length,2);
 await page.locator('[data-action="loadExport"][data-id="b"]').click();assert.match(await page.locator('.logistics-notice').innerText(),/does not match/);
 await page.locator('[data-action="loadExport"][data-id="e1"]').click();assert.equal(await action('dispatchExport').isDisabled(),true);await shot('export-loading-mobile');
 await page.clock.fastForward(61000);assert.equal((await load()).screen,'summary');assert.equal((await load()).outbound.orders[0].loaded,true);
 await action('nextShift').click();assert.equal((await load()).remainingMs,90000);await action('acknowledgeRules').click();await action('yard').first().click();await page.locator('.island-arrivals [data-action="outbound"]').click();
 await page.locator('[data-action="loadExport"][data-id="e2"]').click();const beforeExport=(await load()).coins;await action('dispatchExport').click();assert.equal((await load()).coins,beforeExport+50);assert.equal((await load()).outbound,null);await shot('export-delivered-mobile');
 await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();await page.getByRole('heading',{name:'Your storage yard',exact:true}).waitFor();assert.equal((await load()).exportIncome,50);await context.setOffline(false);
 for(const width of [320,1280]){
  const b=await launch(),p=await b.newPage({viewport:{width,height:900}});p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:4173/');
  await p.locator('[data-action="upgrades"]').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:`test-results/map-${width}.png`,fullPage:true});
  await p.locator('[data-action="harbor"]').first().click();await p.locator('[data-action="start"]').click();await p.locator('[data-action="acknowledgeRules"]').click();await p.locator('[data-action="beginInspection"]').click();
  for(const inset of [0,47,59]){
   await p.evaluate(n=>document.documentElement.style.setProperty('--safe-area-top',`${n}px`),inset);await p.evaluate(()=>window.scrollTo(0,300));
   const control=await p.locator('[data-action="declaration"]').boundingBox(),presence=await p.locator('.inspection-presence').boundingBox();
   assert.ok(control.y>=inset);assert.ok(Math.abs(presence.y-((width<650?122:128)+inset))<2);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await p.evaluate(()=>{document.documentElement.style.setProperty('--safe-area-top','0px');window.scrollTo(0,0)});await p.screenshot({path:`test-results/batches-${width}.png`,fullPage:true});
  await p.locator('[data-action="checked"]').click();await p.locator('[data-verdict="clear"]').click();await p.locator('[data-action="yard"]').first().click();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:`test-results/yard-${width}.png`,fullPage:true});await b.close();
 }
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS: time upgrades, full-yard recovery, warehouse, porter/donkey, export unloading/matching/carryover/payment and offline logistics; multi-lot switching and mixed verdicts, no duplicate pay, hiring/training map, certified parallel checks, worker pauses, overtime/carryover, offline resume, narrow/desktop layouts and safe areas.');
})().catch(e=>{console.error(e);process.exit(1)});
