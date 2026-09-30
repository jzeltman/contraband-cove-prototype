// npm start, then: NODE_PATH=<directory containing playwright> node tests/browser-smoke.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async()=>{
 await fs.mkdir('test-results',{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const load=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('contraband-cove.save.v1')));
 const noVerdict=async()=>assert.equal(await page.locator('[data-verdict]').count(),0);
 const screenshot=async name=>{await page.waitForFunction(()=>[...document.images].every(i=>i.complete));await page.screenshot({path:`test-results/${name}.png`,fullPage:true});};
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
   if(i===0)await screenshot('seal-unmarked-mobile');
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
  await page.locator(`[data-verdict="${bad?'hold':'clear'}"]`).click();s=await load();const coins=s.coins;
  await page.reload();assert.equal((await load()).coins,coins);
  await page.getByRole('button',{name:i===4?'Finish shift':'Next shipment',exact:true}).click();
 }
 let s=await load();assert.equal(s.index,5);assert.equal(s.coins,110);await screenshot('summary-mobile');
 await page.getByRole('button',{name:'Visit the harbor'}).click();await page.locator('[data-action="train"]').click();assert.equal((await load()).coins,50);
 await page.getByRole('button',{name:'View shift report'}).click();await page.getByRole('button',{name:'Next shift',exact:true}).click();
 assert.equal((await load()).shift,2);assert.equal((await load()).screen,'briefing');
 await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();
 await page.getByRole('heading',{name:'Daily rules',exact:true}).waitFor();await context.setOffline(false);
 for(const width of [320,1280]){
  const p=await browser.newPage({viewport:{width,height:900}});p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:4173/');await p.getByRole('button',{name:'Open the harbor'}).click();
  await p.getByRole('button',{name:'Acknowledge & meet the captain'}).click();await p.getByRole('button',{name:'Begin inspection'}).click();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`No overflow at ${width}px`);
  await p.waitForFunction(()=>[...document.images].every(i=>i.complete));await p.screenshot({path:`test-results/inspection-${width}.png`,fullPage:true});await p.close();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: briefings, every captain introduction, verdict gating, combined checks, header dialogs, sticky portrait, narrow/desktop layouts, saving, progression, and offline reload.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
