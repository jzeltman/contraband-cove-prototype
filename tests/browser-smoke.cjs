// npm start, then: NODE_PATH=<directory containing playwright> node tests/browser-smoke.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async()=>{
 await fs.mkdir('test-results',{recursive:true});
 const launch=()=>chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--disable-crashpad-for-testing',...(process.env.CHROMIUM_SINGLE_PROCESS ? ['--no-zygote','--single-process'] : [])]});
 const browser=await launch();
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const load=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('contraband-cove.save.v3')));
 const noVerdict=async()=>assert.equal(await page.locator('[data-verdict]').count(),0);
 const screenshot=async name=>{await page.waitForFunction(()=>[...document.images].every(i=>i.complete));assert.equal(await page.evaluate(()=>[...document.images].every(i=>i.naturalWidth>0)),true,'Images load');await page.screenshot({path:`test-results/${name}.png`,fullPage:true});};
 await page.clock.install();
 await page.goto('http://localhost:4173/');await screenshot('harbor-mobile');
 await page.getByRole('button',{name:'Open the harbor'}).click();
 assert.equal((await load()).screen,'briefing');await noVerdict();await screenshot('daily-rules-mobile');
 await page.reload();assert.equal((await load()).screen,'briefing');
 await page.getByRole('button',{name:'Acknowledge & meet the captain'}).click();
 for(let i=0;i<5;i++){
  assert.equal((await load()).screen,'introduction');await noVerdict();
  await page.getByRole('heading',{name:/Captain/}).waitFor();
  assert.equal(await page.locator('.intro-paperwork .manifest').count(),1);
  if(i===0){await screenshot('introduction-mobile');await page.reload();assert.equal((await load()).screen,'introduction');}
  await page.getByRole('button',{name:'Begin inspection'}).click();await noVerdict();
  let s=await load();const c=s.cases[s.index];
  assert.equal(await page.locator('.gameplay-header .brand').count(),0);
  assert.equal(await page.locator('.work-area .manifest').count(),0);
  await page.getByRole('button',{name:'Declaration',exact:true}).click();
  await page.getByRole('dialog',{name:'Shipping declaration',exact:true}).waitFor();
  await page.getByRole('button',{name:'Close declaration'}).click();
  await page.getByRole('button',{name:'Daily rules',exact:true}).click();
  await page.getByRole('dialog',{name:'Daily rules · Shift 1',exact:true}).waitFor();
  await page.keyboard.press('Escape');assert.deepEqual((await load()).weights,s.weights);
  if(c.checks.includes('seal')){
   await page.getByRole('button',{name:'Dots',exact:true}).click();await noVerdict();
   if(i===0){
    await screenshot('seal-unmarked-mobile');
    await page.locator('[data-action="pause"]').click();
    const paused=(await load()).remainingMs;await page.clock.fastForward(20000);assert.equal((await load()).remainingMs,paused);
    await page.getByRole('button',{name:'Resume shift',exact:true}).click();
    await page.getByRole('button',{name:'Declaration',exact:true}).click();
    const reference=(await load()).remainingMs;await page.clock.fastForward(20000);assert.equal((await load()).remainingMs,reference);await page.keyboard.press('Escape');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    const hidden=(await load()).remainingMs;await page.clock.fastForward(20000);assert.equal((await load()).remainingMs,hidden);
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await page.clock.fastForward(1000);assert.ok((await load()).remainingMs<hidden);
   }
   await page.getByRole('button',{name:'Mark seal inspected',exact:true}).click();
   if(c.checks.length===2){await noVerdict();await page.getByRole('button',{name:'Continue to weighing'}).click();}
  }
  if(c.checks.includes('weight')){
   await noVerdict();await page.locator('[data-tab="weight"]').click();
   let mass=c.actual;for(const w of [10,5,2,1])while(mass>=w){await page.getByRole('button',{name:`Add ${w} kg`,exact:true}).click();mass-=w;}
   await page.getByRole('status').filter({hasText:`Balanced at ${c.actual} kg`}).waitFor();
   assert.equal((await load()).measured,c.actual);
   await page.getByRole('button',{name:'Declaration',exact:true}).click();await page.keyboard.press('Escape');assert.equal((await load()).measured,c.actual);
   if(i===2)await screenshot('weighing-mobile');
  }
  assert.equal(await page.locator('[data-verdict]').count(),2);
  // Sticky references and captain remain visible while scrolling the tool controls.
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  const portrait=await page.locator('.persistent-captain').boundingBox();const header=await page.locator('.gameplay-header').boundingBox();
  assert.ok(portrait&&portrait.y>=0&&portrait.y<300,'Captain portrait stays on screen');assert.ok(header&&header.y>=0&&header.y<2,'Header stays reachable');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(i===4)await screenshot('combined-complete-mobile');
  const bad=c.checks.includes('seal')&&['symbol','marks','border'].some(k=>c.reference[k]!==c.presented[k])||c.checks.includes('weight')&&c.actual!==c.declared;
  if(i===4){await page.clock.fastForward(181000);assert.equal((await load()).screen,'inspection');assert.equal(await page.locator('#clock-label').textContent(),'Finish this cargo');}
  await page.locator(`[data-verdict="${bad?'hold':'clear'}"]`).click();s=await load();const coins=s.coins;
  await page.reload();assert.equal((await load()).coins,coins);
  await page.getByRole('button',{name:i===4?'Finish shift':'Next shipment',exact:true}).click();
 }
 let s=await load();assert.equal(s.ended,true);assert.equal(s.coins,110);await screenshot('summary-mobile');
 await page.getByRole('button',{name:'Visit the harbor'}).click();await page.locator('[data-action="train"]').click();assert.equal((await load()).coins,50);
 await page.getByRole('button',{name:'View shift report'}).click();await page.getByRole('button',{name:'Next shift',exact:true}).click();
 assert.equal((await load()).shift,2);assert.equal((await load()).screen,'briefing');
 await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();
 await page.getByRole('heading',{name:'Daily rules',exact:true}).waitFor();await context.setOffline(false);
 for(const width of [320,1280]){
  const layoutBrowser=await launch();const p=await layoutBrowser.newPage({viewport:{width,height:900}});p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:4173/');await p.getByRole('button',{name:'Open the harbor'}).click();
  await p.getByRole('button',{name:'Acknowledge & meet the captain'}).click();await p.getByRole('button',{name:'Begin inspection'}).click();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`No overflow at ${width}px`);
  await p.waitForFunction(()=>[...document.images].every(i=>i.complete));await p.screenshot({path:`test-results/inspection-${width}.png`,fullPage:true});await layoutBrowser.close();
 }
 // Simulate iPhone status-bar/Dynamic Island insets; desktop Chromium reports 0.
 // Physical iPhone standalone verification is still required from the owner.
 const notchBrowser=await launch();const notchPage=await notchBrowser.newPage({viewport:{width:390,height:844}});
 notchPage.on('pageerror',e=>errors.push(e.message));
 await notchPage.goto('http://localhost:4173/');
 for(const inset of [0,47,59]){
  await notchPage.evaluate(n=>document.documentElement.style.setProperty('--safe-area-top',`${n}px`),inset);
  const brand=await notchPage.locator('.brand').boundingBox();
  assert.ok(brand.y>=inset,`Harbor header clears ${inset}px inset`);
 }
 await notchPage.getByRole('button',{name:'Open the harbor'}).click();
 await notchPage.getByRole('button',{name:'Acknowledge & meet the captain'}).click();
 await notchPage.getByRole('button',{name:'Begin inspection'}).click();
 for(const inset of [0,47,59]){
  await notchPage.evaluate(n=>document.documentElement.style.setProperty('--safe-area-top',`${n}px`),inset);
  await notchPage.evaluate(()=>window.scrollTo(0,300));
  const control=await notchPage.locator('[data-action="declaration"]').boundingBox();
  const presence=await notchPage.locator('.inspection-presence').boundingBox();
  assert.ok(control.y>=inset,`Gameplay controls clear ${inset}px inset`);
  assert.ok(Math.abs(presence.y-(122+inset))<2,`Portrait follows inset-adjusted header`);
  assert.equal(await notchPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 await notchPage.screenshot({path:'test-results/iphone-safe-area.png',fullPage:true});
 await notchBrowser.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: timed shifts, pause, references pause, background pause, overtime,  briefings, every captain introduction, verdict gating, combined checks, header dialogs, sticky portrait, narrow/desktop layouts, saving, progression, and offline reload.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
