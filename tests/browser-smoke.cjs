// Run with: NODE_PATH=<directory containing playwright> node tests/browser-smoke.cjs
// Requires the local server from npm start. No remote services or analytics.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async () => {
  await fs.mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:4173/');
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  await page.screenshot({ path:'test-results/harbor-mobile.png', fullPage:true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await page.getByRole('button', { name:'Open the harbor' }).click();
  await page.screenshot({ path:'test-results/seal-mobile.png', fullPage:true });
  const load = () => page.evaluate(() => JSON.parse(localStorage.getItem('contraband-cove.save.v1')));
  for (let i=0;i<5;i++) {
    let s = await load(); const c=s.cases[s.index];
    if (c.checks.includes('weight')) {
      await page.locator('[data-tab="weight"]').click();
      let mass=c.actual;
      for (const w of [10,5,2,1]) while(mass>=w) { await page.getByRole('button',{name:`Add ${w} kg`,exact:true}).click(); mass-=w; }
      await page.getByRole('status').filter({hasText:`Balanced at ${c.actual} kg`}).waitFor();
      assert.equal((await load()).measured,c.actual);
      if(i===2)await page.screenshot({path:'test-results/weighing-mobile.png',fullPage:true});
    }
    const invalid = c.checks.includes('seal') && ['symbol','marks','border'].some(k=>c.reference[k]!==c.presented[k]) || c.checks.includes('weight') && c.actual!==c.declared;
    const verdict=invalid?'hold':'clear';
    await page.locator(`[data-verdict="${verdict}"]`).click();
    s=await load(); const coins=s.coins;
    await page.reload();
    assert.equal((await load()).coins,coins);
    await page.getByRole('button',{name:i===4?'Finish shift':'Next shipment',exact:true}).click();
  }
  let s=await load(); assert.equal(s.index,5); assert.equal(s.coins,110);
  await page.screenshot({path:'test-results/summary-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Visit the harbor'}).click();
  await page.locator('[data-action="train"]').click();
  assert.equal((await load()).trained,true); assert.equal((await load()).coins,50);
  await page.getByRole('button',{name:'View shift report'}).click();
  await page.getByRole('button',{name:'Next shift',exact:true}).click();
  assert.equal((await load()).shift,2);
  // Service-worker cache contains the complete runtime and works offline.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await page.getByRole('heading',{name:/Captain/}).waitFor();
  await context.setOffline(false);
  const desktop = await browser.newPage({ viewport:{width:1280,height:960} });
  desktop.on('pageerror',e=>errors.push(e.message));
  await desktop.goto('http://localhost:4173/');
  await desktop.waitForFunction(()=>[...document.images].every(i=>i.complete));
  await desktop.screenshot({path:'test-results/harbor-desktop.png',fullPage:true});
  await desktop.getByRole('button',{name:'Open the harbor'}).click();
  await desktop.screenshot({path:'test-results/seal-desktop.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: mobile five-ship loop, weighing, result reload, training, next shift, offline reload, desktop rendering; no browser errors.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
