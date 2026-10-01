import { BUILD, SAVE_KEY, ECONOMY, CAPTAINS, PORTS, initialState, currentCase, totalWeight, scaleAngle, reduce, restore, explanation, correctVerdict, readyToJudge, dailyRules, shipmentComplete, lotStatus, workerTarget, workerDuration, sealMatches } from './game.js';

const root = document.querySelector('#app');
const help = document.querySelector('#help');
const uiArt = name => `./assets/art/runtime/ui/${name}.webp`;
const art = name => ({'merchant-captain':uiArt('captain-merchant'),'mara-neutral':uiArt('mara-clerk'),'mara-pleased':uiArt('mara-clerk'),'wooden-crate':uiArt('cargo-crates'),'cloth-bundle':uiArt('cargo-cloth'),'trade-chest':uiArt('cargo-chest')}[name] || `./assets/art/runtime/${name}.webp`);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const singleMode = new URLSearchParams(location.search).get('shipments') === 'single';
const storageKey = SAVE_KEY + (singleMode ? '.single' : '');
let state, storageWarning = '', storageAvailable = true;
try {
  const raw = localStorage.getItem(storageKey);
  state = raw ? restore(raw) : null;

} catch { storageAvailable = false; storageWarning = 'Saving is unavailable in this browser. This session will not persist.'; }
state ||= initialState(28471, singleMode);
let installPrompt, waitingWorker;
const icon = (name, cls = '') => {
  const paths = {
    anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M7 11h10M4 15c0 4 4 6 8 6s8-2 8-6M2 17l2-3 3 2m10 0 3-2 2 3"/>',
    ship: '<path d="M3 16h18l-3 5H6zM12 3v13M10 5L4 13h6zm4 1 5 7h-5z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 6-5 2 3-6zM12 1v3m0 16v3M1 12h3m16 0h3"/>',
    seal: '<circle cx="12" cy="10" r="7"/><path d="m8 16-1 6 5-3 5 3-1-6m-7-6 2 2 4-4"/>',
    scale: '<path d="M12 3v18M7 21h10M3 7h18M6 7l-4 9h8zm12 0-4 9h8z"/>',
    check: '<path d="m5 12 4 4L20 5"/>',
    hold: '<path d="M8 5v14M16 5v14"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="m12 6 2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    book: '<path d="M12 5v16M12 5Q7 1 2 4v15q5-3 10 2 5-5 10-2V4q-5-3-10 1"/>',
    up: '<path d="M12 21V3m-7 7 7-7 7 7"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v1"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>'
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.anchor}</svg>`;
};
function button(label, action, cls = '', disabled = false, attrs = '') { return `<button class="btn ${cls}" data-action="${action}" ${disabled ? 'disabled' : ''} ${attrs}>${label}</button>`; }
function coins(n) { return `<span class="coins">${icon('coin')}${n.toLocaleString()}</span>`; }
function clockLabel() {
  if (state.remainingMs <= 0) return state.screen === 'inspection' ? 'Finish this cargo' : 'Tide has turned';
  if (state.paused || ['harbor','upgrades'].includes(state.screen) || help.open) return 'Clock paused';
  return state.started ? 'Until tide turns' : 'Starts at inspection';
}
function clockText() {
  const seconds = Math.ceil(state.remainingMs / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function header() {
  const gameplay = ['briefing', 'introduction', 'inspection', 'result', 'shipment'].includes(state.screen);
  const clock = `<div class="tide-clock ${state.remainingMs <= 30000 ? 'low-time' : ''}"><img src="${uiArt('hourglass-half')}" alt=""><div><strong id="clock-time" aria-label="Time remaining">${clockText()}</strong><small id="clock-label">${clockLabel()}</small></div></div>`;
  if (gameplay) return `<header class="masthead gameplay-header"><div class="timer-row"><button class="round-btn" data-action="harbor" aria-label="Return to harbor">${icon('anchor')}</button>${clock}<button class="round-btn pause-button" data-action="pause" aria-label="Pause shift">${icon('hold')}</button></div><nav class="reference-nav" aria-label="Inspection references">${button(`${icon('book')}<span>Declaration</span>`, 'declaration', 'header-btn', state.screen === 'briefing')}${button(`${icon('seal')}<span>Daily rules</span>`, 'dailyRules', 'header-btn')}</nav></header>`;
  return `<header class="masthead"><button class="brand" data-action="harbor" aria-label="Contraband Cove harbor">${icon('anchor')}<span>CONTRABAND <b>COVE</b></span></button><div class="header-right"><span class="treasury" aria-label="Treasury ${state.coins} coins">${coins(state.coins)}</span><button class="round-btn" data-action="help" aria-label="Help and settings">${icon('help')}</button></div></header>`;
}
function footer() { return `<footer class="footer"><span>BRASS & TIMBER <span class="separator">/</span> PLAYTEST ${BUILD}</span><button data-action="help">How to play & save info</button><span>${storageAvailable ? 'Saved on this device' : 'Session only'}</span></footer>`; }
function harbor() {
  const finished = state.ended, pending = state.ship.lots.filter(l => !l.result).length;
  return `<main class="harbor"><section class="harbor-scene"><div class="harbor-picture"><img src="${art('harbor-overview')}" alt="Your harbor">${state.berth ? `<img class="berth-overlay" src="${art('berth-upgrade')}" alt="Improved premium berth">` : ''}</div><div class="scene-shade"></div><div class="harbor-intro"><span class="eyebrow">WELCOME TO CONTRABAND COVE</span><h1>Your cove.<br>Your call.</h1><p>One captain. Every cargo counts.</p><div class="ribbon">${icon('anchor')}${state.hired ? 'Mara is on your crew' : 'An independent inspector'}</div></div><div class="shift-ticket"><span class="eyebrow">THE CUSTOMS DESK</span><h2>${finished ? 'Shift complete' : `Shift ${state.shift} · ${clockText()}`}</h2><p>${state.started ? `${state.results.length} lots judged · ${pending} aboard this vessel.` : singleMode ? 'Comparison playtest: one lot per captain.' : 'Inspect two cargo lots, then welcome larger shipments.'} Planning pauses time.</p>${button(`${icon('arrow')}${finished ? 'View shift report' : state.started ? 'Resume inspection' : 'Open the harbor'}`, 'start', 'gold wide')}</div></section><section class="management harbor-management"><div><span class="eyebrow">BUILD YOUR OPERATION</span><h2>Harbor development</h2><p>${state.hired ? 'Your crew and improvements, all on one chart.' : 'Earn 80 coins to hire Mara. She can inspect another lot while you work.'}</p></div>${button(`${icon('compass')}Open upgrade map`, 'upgrades', 'navy')}${state.single ? '<small>Single-cargo comparison mode</small>' : ''}</section></main>`;
}
function upgradeData() {
  return {
    desk: { title:'Customs desk', art:'customs-house', state:'Built', text:'Your inspection station. Every cargo lot receives its own judgment.' },
    mara: { title:'Hire Mara', art:'mara-clerk', state:state.hired ? 'Hired' : 'Available', text:'Mara certifies the seal on another lot in 8 active seconds while you inspect. You still make the verdict. Adds 2 coins per correct lot.', action:'hire', price:ECONOMY.hireCost, owned:state.hired },
    training: { title:'Train Mara', art:'mara-clerk', state:state.trained ? 'Trained' : state.hired ? 'Available' : 'Hire Mara first', text:'Seal certification takes 4 seconds instead of 8. Clerk credit rises to 6 coins per correct lot.', action:'train', price:ECONOMY.trainingCost, owned:state.trained, locked:!state.hired },
    berth: { title:'Improved berth', art:'dock-extension', state:state.berth ? 'Built' : 'Available', text:'Attract premium cargo worth 35 coins per correct verdict on new arrivals. Existing cargo keeps its declared reward. This improves your one berth.', action:'upgrade', price:ECONOMY.berthCost, owned:state.berth },
    dockhand: { title:'Dockhand', art:'dockhand', state:'Future addition', text:'A future crew member to bring cargo onto the desk and move resolved lots away. Not available in this playtest.' },
    secondBerth: { title:'Second berth', art:'dock-extension', state:'Future addition', text:'A second active vessel is planned after same-ship delegation and storage are tested. Not available in this playtest.' },
    warehouse: { title:'Warehouse wing', art:'warehouse-building', state:'Future addition', text:'Future storage and dispatch capacity. Current routing is represented by each cargo result, without a capacity limit.' },
    lighthouse: { title:'Lighthouse', art:'lighthouse', state:'Future addition', text:'Night shifts are an exploration for a later prototype. This building cannot be purchased yet.' }
  };
}
function upgrades() {
  const data=upgradeData(), chosen=data[state.selectedUpgrade];
  return `<main class="upgrade-page"><div class="map-title"><span class="eyebrow">PLANNING · CLOCK AND CREW PAUSED</span><h1>Harbor development</h1><p>Earn it. Build it. See work getting done.</p></div><section class="upgrade-map" aria-label="Harbor upgrade map"><svg class="map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 9V23H25V43M50 23H75V32"/><path class="future-route" d="M75 32V65H25V65M50 65V89"/></svg>${Object.entries(data).map(([id,u])=>`<button class="map-node node-${id} ${state.selectedUpgrade===id?'selected':''} ${u.state==='Future addition'?'future':''}" data-action="selectUpgrade" data-id="${id}" aria-pressed="${state.selectedUpgrade===id}" aria-label="${u.title}: ${u.state}"><img src="${uiArt(u.art)}" alt=""><strong>${u.title}</strong><span>${icon(u.owned || id==='desk'?'check':u.action&&!u.locked?'up':'hold')}${u.state}</span></button>`).join('')}</section><section class="panel map-detail" aria-label="Selected upgrade"><img src="${uiArt(chosen.art)}" alt=""><div><h2>${chosen.title}</h2><p>${chosen.text}</p>${chosen.action ? button(chosen.owned ? `${icon('check')}${chosen.state}` : `${chosen.title} · ${coins(chosen.price)}`,chosen.action,'gold wide',chosen.owned||chosen.locked||state.coins<chosen.price) : `<strong class="map-state">${chosen.state}</strong>`}${chosen.action&&!chosen.owned&&!chosen.locked&&state.coins<chosen.price?`<small>${chosen.price-state.coins} more coins needed</small>`:''}${chosen.locked?'<small>Hire Mara to unlock training.</small>':''}</div></section>${button(`${icon('anchor')}Return to harbor`, 'harbor','teal wide')}</main>`;
}
function lotSelector() {
  return `<nav class="cargo-selector" aria-label="Shipment cargo">${state.ship.lots.map((l,i)=>`<button class="lot-card ${i===state.activeLot?'selected':''} ${l.result?'resolved':''}" data-action="selectLot" data-index="${i}" aria-label="Lot ${i+1}: ${l.goods}, ${lotStatus(l)}" aria-pressed="${i===state.activeLot}" ${l.result || state.remainingMs<=0 ? 'disabled':''}><img src="${art(l.cargo)}" alt=""><strong>${l.goods}</strong><span class="lot-status">${icon(l.result?l.result.verdict==='clear'?'check':'hold':l.started||l.checked.length?'book':'help')}${lotStatus(l)}</span><small class="lot-checks">${l.checked.length}/${l.checks.length} checks${l.certified?' · Mara ✓':''}</small></button>`).join('')}</nav>`;
}
function crewStatus() {
  if(!state.hired) return '<p class="crew-hint">Work toward a helping hand: hire Mara from the upgrade map.</p>';
  const target=workerTarget(state), certified=state.ship.lots.filter(l=>l.certified).length;
  return `<div class="crew-status"><img src="${uiArt('mara-clerk')}" alt=""><div><strong>${target ? `Mara: checking ${target.goods.toLowerCase()}` : state.remainingMs<=0 ? 'Mara has finished for this shift' : 'Mara is ready to help'}</strong><small>${target ? `${Math.ceil((workerDuration(state)-target.sealWorkMs)/1000)}s · certified seal check` : certified ? `${certified} seal${certified===1?'':'s'} certified · you make the verdicts` : 'Select the supply crate to let Mara check the cloth seal.'}</small>${target?`<progress aria-label="Mara seal check progress" value="${target.sealWorkMs}" max="${workerDuration(state)}"></progress>`:''}</div></div>`;
}
function certificate(c) { return c.certified ? `<p class="certificate">${icon('check')}Seal certified by Mara: ${sealMatches(c)?'emblem, dots and rings match.':'a discrepancy was found.'} ${c.checks.includes('weight')&&!c.checked.includes('weight')?'Weight still needs its own check.':'You make the final verdict.'}</p>` : ''; }
function sealSvg(s, focus) {
  const symbol = icon(s.symbol).replace('class="icon "', 'class="seal-emblem"').replace('viewBox="0 0 24 24"', 'x="33" y="26" width="54" height="54" viewBox="0 0 24 24"');
  return `<svg class="seal-art" viewBox="0 0 120 120" role="img" aria-label="${s.symbol} emblem, ${s.marks} dots, ${s.border} ring"><image href="${uiArt('seal-wax-blank')}" x="0" y="0" width="120" height="120"/><circle cx="60" cy="60" r="42" fill="#761b16" fill-opacity=".65"/><g fill="none" stroke="${focus === 'border' ? '#fff' : '#e7bd70'}" stroke-width="2"><circle cx="60" cy="60" r="39"/>${s.border === 'double' ? '<circle cx="60" cy="60" r="35"/>' : ''}</g><g color="${focus === 'symbol' ? '#fff' : '#f2e4c7'}">${symbol}</g><g fill="${focus === 'marks' ? '#fff' : '#e7bd70'}">${Array.from({ length: s.marks }, (_, i) => `<circle cx="${60 + (i - (s.marks - 1) / 2) * 12}" cy="90" r="3"/>`).join('')}</g></svg>`;
}
function seals(c) {
  return `<section class="evidence-panel"><div class="tool-title"><div><span class="eyebrow">SEAL OF APPROVAL</span><h2>Seal of approval</h2></div>${icon('seal')}</div><p class="tool-instruction">Compare the emblem, dots, and rings. Every detail must match.</p><div class="seal-pair"><div class="seal-sheet"><span class="eyebrow">OFFICIAL EXAMPLE</span>${sealSvg(c.reference, currentCase(state).sealFocus)}<strong>${PORTS[c.port]}</strong><small>Trusted harbor register</small></div><div class="seal-sheet presented"><span class="eyebrow">CARGO SEAL</span>${sealSvg(c.presented, currentCase(state).sealFocus)}<strong>Shipping declaration</strong><small>Check against the reference</small></div></div><div class="focus-row" aria-label="Compare a seal detail">${['symbol', 'marks', 'border'].map((p, i) => button(['Emblem', 'Dots', 'Rings'][i], 'focus', `outline ${currentCase(state).sealFocus === p ? 'selected' : ''}`, false, `data-part="${p}" aria-pressed="${currentCase(state).sealFocus === p}"`)).join('')}</div>${button(`${icon('check')}${currentCase(state).checked.includes('seal') ? 'Seal inspected' : 'Mark seal inspected'}`, 'checked', 'outline wide', currentCase(state).checked.includes('seal'), 'data-check="seal"')}<small class="quiet-note">Your note only. You make the final decision.</small></section>`;
}
function scale(c) {
  const total = totalWeight(currentCase(state).weights), angle = scaleAngle(c.actual, total);
  const radians = angle * Math.PI / 180, delta = Math.sin(radians) * 124, offset = Math.cos(radians) * 124;
  const status = total === c.actual ? `Balanced at ${total} kg` : total < c.actual ? 'Cargo side is heavier' : 'Weights side is heavier';
  return `<section class="evidence-panel"><div class="tool-title"><div><span class="eyebrow">WEIGH THE EVIDENCE</span><h2>Weigh the evidence</h2></div>${icon('scale')}</div><p class="tool-instruction">Add weights to the right pan. Balance the scale, then compare with the declared <strong>${c.declared} kg</strong>.</p><div class="scale-stage"><svg viewBox="0 0 420 280" class="balance" role="img" aria-label="${status}"><image href="${art('scale-stand')}" x="146" y="28" width="128" height="225"/><g transform="rotate(${angle},210,58)" class="beam"><image href="${art('scale-beam')}" x="61" y="8" width="298" height="100"/></g><g transform="translate(${210 - offset},${58 - delta})" class="pan"><image href="${art('scale-pan')}" x="-73" y="-8" width="146" height="138"/><image href="${art(c.cargo)}" x="-44" y="47" width="88" height="66"/></g><g transform="translate(${210 + offset},${58 + delta})" class="pan"><image href="${art('scale-pan')}" x="-73" y="-8" width="146" height="138"/>${total ? `<image href="${art('reference-weight')}" x="-30" y="42" width="60" height="68"/><rect x="-25" y="83" width="50" height="23" rx="4" fill="#183442"/><text x="0" y="100" text-anchor="middle" fill="#fff0d1" font-size="14" font-weight="bold">${total} kg</text>` : ''}</g><text x="84" y="251" text-anchor="middle" class="scale-label">CARGO</text><text x="336" y="251" text-anchor="middle" class="scale-label">WEIGHTS</text></svg></div><div class="scale-status ${total === c.actual ? 'balanced' : ''}" role="status">${total === c.actual ? icon('check') : icon('scale')}${status}<span>${total} kg placed</span></div><div class="weight-rack" aria-label="Reference weights">${[1, 2, 5, 10].map(w => `<button class="weight-btn" data-action="weight" data-value="${w}" ${total + w > 30 ? 'disabled' : ''} aria-label="Add ${w} kg"><img src="${art('reference-weight')}" alt=""><span>+ ${w} kg</span></button>`).join('')}</div><div class="placed-weights">${currentCase(state).weights.length ? currentCase(state).weights.map((w, i) => `<button data-action="removeWeight" data-index="${i}" aria-label="Remove ${w} kg weight">${w} kg ×</button>`).join('') : '<small>Tap a weight to add it. Tap a placed weight to remove it.</small>'}</div><div class="scale-bottom">${button('Reset weights', 'resetWeights', 'text-btn', !currentCase(state).weights.length)}<span>${currentCase(state).measured === null ? 'Gross weight · packaging included' : `Recorded: ${currentCase(state).measured} kg`}</span></div></section>`;
}
function manifest(c) {
  return `<section class="manifest panel"><span class="eyebrow">SHIP MANIFEST · LOT ${state.activeLot+1} OF ${state.ship.lots.length}</span><h3>${CAPTAINS[state.ship.captain].ship}</h3><ol class="manifest-lots">${state.ship.lots.map((l,i)=>`<li class="${i===state.activeLot?'current':''}">${l.goods} · ${lotStatus(l)}</li>`).join('')}</ol><dl><div><dt>Selected cargo</dt><dd>${c.goods}</dd></div><div><dt>Origin</dt><dd>${PORTS[c.port]}</dd></div>${c.checks.includes('weight')?`<div><dt>Declared gross weight</dt><dd>${c.declared} kg · packaging included</dd></div>`:''}<div><dt>Correct lot reward</dt><dd>${coins(c.reward)}</dd></div><div><dt>Required checks</dt><dd>${c.checks.map(x=>x==='seal'?'Seal':'Weight').join(' + ')}</dd></div></dl>${certificate(c)}</section>`;
}
function ruleContent() {
  const rules = dailyRules(state);
  return `<p class="daily-note">${rules.note}</p><div class="daily-rule-list">${rules.entries.map(([symbol,title,body],i) => `<article class="daily-rule"><span class="rule-number">${String(i+1).padStart(2,'0')}</span><div><h3>${icon(symbol)}${title}</h3><p>${body}</p></div></article>`).join('')}</div>`;
}
function briefing() {
  return `<main class="briefing-page"><section class="panel briefing-panel"><span class="eyebrow">CONTRABAND COVE · HARBOR AUTHORITY</span><div class="briefing-heading">${icon('seal')}<div><h1>Daily rules</h1><span>SHIFT ${state.shift} · INSPECTOR'S BRIEFING</span></div></div>${ruleContent()}<p class="reference-reminder">Keep these close. The Daily rules button stays in your header throughout inspection.</p>${button(`Acknowledge & meet the captain${icon('arrow')}`, 'acknowledgeRules', 'gold wide')}</section></main>`;
}
function introduction() {
  const c=currentCase(state), captain=CAPTAINS[state.ship.captain];
  return `<main class="introduction-page"><div class="introduction-grid"><section class="captain-introduction"><div class="intro-portrait"><img src="${art(captain.art)}" alt="${captain.name}"></div><div class="intro-copy"><span class="eyebrow">${state.ship.introduced?'SHIPMENT RESUMED':'NEW ARRIVAL'} · ${state.ship.lots.length} CARGO LOT${state.ship.lots.length===1?'':'S'}</span><h1>${captain.name}</h1><p>“${state.ship.introduced?'The remaining cargo is right where you left it.':captain.line}”</p></div></section><div class="intro-paperwork">${lotSelector()}${manifest(c)}<p class="intro-guidance">${state.hired?'Mara can check another lot’s seal while you work.':'Choose a cargo lot to bring onto the inspection desk.'}</p>${button(`Bring lot to desk${icon('arrow')}`,'beginInspection','teal wide')}</div></div></main>`;
}
function inspection() {
  const c = currentCase(state), captain = CAPTAINS[c.captain];
  const ready = readyToJudge(state), remaining = c.checks.filter(check => !currentCase(state).checked.includes(check));
  const nextCheck = remaining[0];
  return `<main class="inspection inspection-v2"><section class="inspection-presence" aria-label="Captain present during inspection"><div class="presence-water"></div><div class="presence-status"><span class="eyebrow">${CAPTAINS[state.ship.captain].ship} · LOT ${state.activeLot+1}/${state.ship.lots.length}</span><h1>${ready ? 'Ready for your verdict.' : c.goods}</h1><div class="check-progress">${c.checks.map(check => `<span class="${currentCase(state).checked.includes(check) ? 'complete' : ''}">${icon(currentCase(state).checked.includes(check) ? 'check' : check === 'seal' ? 'seal' : 'scale')}${check === 'seal' ? 'Seal' : 'Weight'} ${currentCase(state).checked.includes(check) ? 'inspected' : 'required'}</span>`).join('')}</div></div><img class="persistent-captain" src="${art(captain.art)}" alt="${captain.name}"></section><div class="work-area"><div class="work-main">${lotSelector()}<div id="crew-work">${crewStatus()}</div>${certificate(c)}<nav class="tool-tabs" aria-label="Required inspection tools">${c.checks.map(check => button(`${icon(check === 'seal' ? 'seal' : 'scale')}${check === 'seal' ? 'Seal inspection' : 'Cargo weight'}${currentCase(state).checked.includes(check) ? ' ✓' : ''}`, 'tab', currentCase(state).tab === check ? 'active' : '', false, `data-tab="${check}" aria-pressed="${currentCase(state).tab === check}"`)).join('')}<span>Required: ${c.checks.length === 2 ? 'both checks' : 'one check'}</span></nav>${currentCase(state).tab === 'seal' ? seals(c) : scale(c)}</div></div><section class="verdict-bar ${ready ? '' : 'inspection-pending'}" aria-label="Inspection progress">${ready ? `<div><strong>Your harbor. Your judgment.</strong><span>Checks complete. Do the findings match? Incorrect verdicts earn zero.</span></div><div class="verdict-actions">${button(`${icon('check')}Clear`, 'judge', 'teal', false, 'data-verdict="clear"')}${button(`${icon('hold')}Hold`, 'judge', 'clay', false, 'data-verdict="hold"')}</div>` : `<div><strong>${currentCase(state).checked.length} of ${c.checks.length} checks completed</strong><span>${nextCheck === 'seal' ? 'Inspect the seal, then mark it inspected.' : 'Balance the scale to record the cargo weight.'}</span></div>${nextCheck !== currentCase(state).tab ? button(`Continue to ${nextCheck === 'seal' ? 'seal inspection' : 'weighing'}${icon('arrow')}`, 'tab', 'gold', false, `data-tab="${nextCheck}"`) : `<span class="pending-label">${icon('book')}Complete inspection to unlock your verdict</span>`}`}</section></main>`;
}
function nextLabel() { return shipmentComplete(state) ? 'Shipment summary' : state.remainingMs<=0 ? 'Finish shift' : 'Next cargo lot'; }
function captainReceipt() { const captain=CAPTAINS[state.ship.captain];return `<div class="receipt-captain"><img src="${art(captain.art)}" alt="${captain.name}"><div><strong>${captain.name}</strong><small>${captain.ship}</small></div></div>`; }
function result() {
  const c=currentCase(state), r=c.result;
  return `<main class="report-page">${captainReceipt()}<section class="panel result-panel"><span class="eyebrow">LOT ${state.activeLot+1} · ${c.goods.toUpperCase()}</span><div class="routing-animation"><img src="${art(c.cargo)}" alt=""><span>${icon('arrow')}${r.verdict==='clear'?'Ordinary storage':'Secure storage'}</span></div><h1>${r.correct?'A sharp eye, inspector.':'One to learn from.'}</h1><p class="result-subtitle">You chose ${r.verdict.toUpperCase()}. ${r.correct?'The evidence supports your decision.':`This cargo needed ${correctVerdict(c).toUpperCase()}.`}</p><div class="evidence-review">${explanation(c).map(e=>`<p>${icon('book')}<span>${e}</span></p>`).join('')}</div><div class="reward-breakdown"><div><span>Cargo income</span>${coins(r.shipment)}</div>${state.hired?`<div><span>Mara’s cargo credit</span>${coins(r.clerk)}</div>`:''}<div class="total"><strong>Added to treasury</strong>${coins(r.shipment+r.clerk)}</div></div>${button(`${nextLabel()}${icon('arrow')}`,'next','gold wide')}${button('Return to harbor','harbor','text-btn wide')}</section></main>`;
}
function shipment() {
  const lots=state.ship.lots, cleared=lots.filter(l=>l.result.verdict==='clear').length, total=lots.reduce((n,l)=>n+l.result.shipment+l.result.clerk,0);
  return `<main class="report-page">${captainReceipt()}<section class="panel result-panel"><span class="eyebrow">SHIPMENT ACCOUNTED FOR</span><h1>Ready to sail.</h1><p class="result-subtitle">${cleared} cleared · ${lots.length-cleared} held</p><div class="shipment-ledger">${lots.map(l=>`<div><img src="${art(l.cargo)}" alt=""><span><strong>${l.goods}</strong><small>${icon(l.result.verdict==='clear'?'check':'hold')}${lotStatus(l)} · ${l.result.correct?'Correct judgment':'Incorrect judgment'}</small></span>${coins(l.result.shipment+l.result.clerk)}</div>`).join('')}</div><p>${total} coins already paid across this shipment. Departure adds no second payment.</p>${button(`${state.remainingMs<=0?'Depart & finish shift':'Let the ship depart'}${icon('arrow')}`,'depart','teal wide')}</section></main>`;
}
function summary() {
  const correct=state.results.filter(r=>r.correct).length, total=state.results.reduce((n,r)=>n+r.shipment+r.clerk,0), pending=state.ship.lots.filter(l=>!l.result).length;
  return `<main class="report-page"><section class="panel result-panel summary"><span class="eyebrow">SHIFT ${state.shift} · HARBOR LEDGER</span><h1>The tide has turned.</h1><p class="result-subtitle">${state.results.length} cargo lots judged · ${state.departures} ships departed</p><div class="summary-stats"><div><strong>${correct}<small>/${state.results.length}</small></strong><span>Correct judgments</span></div><div><strong>${total}</strong><span>Coins earned</span></div></div><p class="carryover-note">${pending?`${pending} unresolved lot${pending===1?'':'s'} on ${CAPTAINS[state.ship.captain].ship} will wait until next shift. All inspection progress is saved.`:'All cargo on this vessel is accounted for.'}</p>${button(`Next shift${icon('arrow')}`,'nextShift','teal wide')}${button(`${icon('compass')}Open upgrade map`,'upgrades','navy wide')}${button('Visit the harbor','harbor','text-btn wide')}<button class="export-link" data-action="export">Export playtest log</button></section></main>`;
}
function render() {
  root.innerHTML = `<div class="app-shell ${state.screen === 'inspection' ? 'playing' : ''}">${header()}${storageWarning ? `<div class="save-warning" role="alert">${escape(storageWarning)}</div>` : ''}${({ harbor, upgrades, briefing, introduction, inspection, result, shipment, summary }[state.screen])()}${footer()}${state.paused ? `<div class="pause-overlay" role="dialog" aria-modal="true" aria-label="Shift paused"><section class="panel pause-panel"><img src="${uiArt('hourglass-half')}" alt=""><h1>Time to take a breath.</h1><p>Shift paused · ${clockText()} remaining</p><p>No time passes and no income is earned.</p>${button('Resume shift', 'resume', 'teal wide')}${button('Harbor planning', 'harbor', 'navy wide')}</section></div>` : ''}</div>`;
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { storageAvailable = false; storageWarning = 'Your browser could not save progress. Keep this tab open; export your playtest log before leaving.'; }
}
function toast(message) { const t = document.querySelector('#toast'); t.textContent = message; t.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 3800); }
function dispatch(action) {
  syncClock();
  const oldScreen = state.screen, previous = state;
  state = reduce(state, action);
  save(); render();
  if (action.type === 'pause') root.querySelector('[data-action="resume"]')?.focus();
  if (oldScreen !== state.screen || ['next','selectLot'].includes(action.type)) { window.scrollTo({ top: 0, behavior: 'instant' }); const heading = root.querySelector('h1'); heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true }); }
  if (action.type === 'hire' && !previous.hired && state.hired) toast('Mara hired! Inspect one lot while she certifies another seal.');
  if (action.type === 'train' && !previous.trained && state.trained) toast('Training complete! Mara checks seals in 4 seconds and adds 6 coins per correct lot.');
  if (action.type === 'upgrade' && !previous.berth && state.berth) toast('Berth improved! New arrivals can bring premium cargo.');
}
let dialogTrigger;
function showDialog(content, label) {
  dialogTrigger = document.activeElement;
  help.innerHTML = content;
  help.setAttribute('aria-label', label);
  syncClock(); help.showModal(); updateClock();
}
help.addEventListener('close', () => { clockAt = performance.now(); updateClock(); dialogTrigger?.isConnected && dialogTrigger.focus(); });
function openReference(kind) {
  const title = kind === 'declaration' ? 'Shipping declaration' : dailyRules(state).title;
  const content = kind === 'declaration' ? manifest(currentCase(state)) : ruleContent();
  showDialog(`<div class="dialog-heading"><h2>${title}</h2><button class="round-btn" data-action="closeHelp" aria-label="Close ${kind === 'declaration' ? 'declaration' : 'daily rules'}">${icon('close')}</button></div>${content}`, title);
}
function openHelp() {
  syncClock();
  help.innerHTML = `<div class="dialog-heading"><h2>The inspector's handbook</h2><button class="round-btn" data-action="closeHelp" aria-label="Close handbook">${icon('close')}</button></div><p><strong>CLEAR</strong> a cargo lot when every required check matches. <strong>HOLD</strong> any mismatch for verification.</p><div class="help-step">${icon('seal')}<div><h3>Compare the seal</h3><p>Match the emblem, number of dots, and single or double ring against the official reference, then tap Mark seal inspected.</p></div></div><div class="help-step">${icon('scale')}<div><h3>Balance the cargo</h3><p>Tap 1, 2, 5, or 10 kg weights to place them on the right pan. Tap a placed weight to remove it. When balanced, compare the total with the declared gross weight. Packaging is included. Complete every required check to unlock CLEAR and HOLD.</p></div></div><div class="help-step">${icon('coin')}<div><h3>Grow through play</h3><p>Correct verdicts earn cargo income. Hired Mara adds separate clerk credit. Incorrect verdicts earn zero; existing coins are never deducted. Hire Mara for 80 coins. She certifies a seal on another lot in 8 active seconds. Train her for 60 to reduce that to 4 seconds. Improve the berth for 120. There is no offline income.</p></div></div><h3>The tide clock</h3><p>Each shift gives you three minutes. Start the clock at your first inspection, then welcome as many arrivals as you can. At zero, finish only the selected cargo. Other lots and their checks wait for next shift. Workers stop at closing. Harbor planning, references, Help, Pause and leaving the app stop the clock. No offline time or income.</p><h3>Compare the shipment loop</h3><p>For a playtest comparison, the same cargo evidence and rewards can arrive under individual captains. Each mode has its own prototype save.</p><p><a href="?shipments=single">Single-cargo comparison</a> · <a href="?shipments=batch">Multi-cargo shipments</a></p><h3>Install & play offline</h3><p>On iPhone/iPad, use Safari’s Share menu → Add to Home Screen. On Android, use your browser’s Install app or Add to Home screen option. Play in the browser if installation is unavailable. Load once online before playing offline.</p>${installPrompt ? button('Install game', 'install', 'gold wide') : ''}<h3>Your progress & privacy</h3><p>Progress stays in this browser on this device. Clearing site data removes it. No accounts, ads, or remote analytics. The optional export contains local gameplay events, not personal details.</p>${waitingWorker ? button('Apply downloaded update', 'update', 'gold wide') : ''}${button('Export playtest log', 'export', 'outline wide')}<details><summary>Reset this device’s playtest</summary><p>This clears your coins, upgrades, and local playtest log. It cannot be undone.</p>${button('Reset all progress', 'reset', 'clay wide')}</details><small>Prototype ${BUILD} · Balance values are provisional.</small>`;
  dialogTrigger = document.activeElement; help.setAttribute('aria-label', 'Inspector handbook'); help.showModal(); updateClock();
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-action]'); if (!b || b.disabled) return;
  const type = b.dataset.action;
  if (type === 'help') return openHelp();
  if (type === 'declaration' || type === 'dailyRules') return openReference(type);
  if (type === 'closeHelp') return help.close();
  if (type === 'export') {
    const data = { build: BUILD, seed: state.seed, shift: state.shift, coins: state.coins, hired: state.hired, trained: state.trained, single: state.single, ship: state.ship, berth: state.berth, activeMs: state.activeMs, currentResults: state.results, history: state.history, events: state.events };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `contraband-cove-playtest-${state.shift}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
  }
  if (type === 'reset') { if (confirm('Reset all local progress, coins, upgrades, and the playtest log?')) { state = initialState(28471, singleMode); save(); help.close(); render(); } return; }
  if (type === 'install') { if (installPrompt) { await installPrompt.prompt(); installPrompt = null; help.close(); } return; }
  if (type === 'update') { save(); waitingWorker?.postMessage({ type: 'SKIP_WAITING' }); return; }
  dispatch({ type, tab: b.dataset.tab, part: b.dataset.part, check: b.dataset.check, value: Number(b.dataset.value), index: Number(b.dataset.index), verdict: b.dataset.verdict, id: b.dataset.id });
});
let clockAt = performance.now();
let clockWasVisible = !document.hidden;
function updateClock() {
  const time = document.querySelector('#clock-time'), label = document.querySelector('#clock-label');
  if (time) time.textContent = clockText();
  if (label) label.textContent = clockLabel();
  document.querySelector('.tide-clock')?.classList.toggle('low-time', state.remainingMs <= 30000);
  const next = document.querySelector('[data-action="next"]');
  if (next) next.innerHTML = `${nextLabel()}${icon('arrow')}`;
  const crew = document.querySelector('#crew-work');
  if (crew) crew.innerHTML = crewStatus();
  document.querySelectorAll('.lot-card').forEach(el => {
    const l=state.ship.lots[Number(el.dataset.index)];
    el.disabled=!!l.result || state.remainingMs<=0;
    el.setAttribute('aria-label', `Lot ${Number(el.dataset.index)+1}: ${l.goods}, ${lotStatus(l)}`);
    el.querySelector('.lot-status').innerHTML=`${icon(l.result?l.result.verdict==='clear'?'check':'hold':l.started||l.checked.length?'book':'help')}${lotStatus(l)}`;
    el.querySelector('.lot-checks').textContent=`${l.checked.length}/${l.checks.length} checks${l.certified?' · Mara ✓':''}`;
  });
}
function syncClock() {
  const now = performance.now(), ms = now - clockAt; clockAt = now;
  if (!clockWasVisible || help.open) return;
  const certificates=state.ship.lots.filter(l=>l.certified).length;
  const before = state.screen, seconds = Math.ceil(state.remainingMs / 1000);
  state = reduce(state, { type: 'tick', ms });
  if(state.ship.lots.filter(l=>l.certified).length>certificates) toast('Mara completed a seal check. Select that lot to review her findings.');
  if (seconds !== Math.ceil(state.remainingMs / 1000) || before !== state.screen) save();
  if (before !== state.screen) { render(); window.scrollTo(0, 0); }
  updateClock();
}
setInterval(syncClock, 200);
document.addEventListener('visibilitychange', () => {
  syncClock();
  clockWasVisible = !document.hidden;
  if (document.hidden) save();
});
window.addEventListener('pagehide', () => { syncClock(); save(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const notify = () => { waitingWorker = reg.waiting; if (waitingWorker) toast('An update is ready. Open Help (?) to apply it safely.'); };
    notify(); reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', notify));
  }).catch(() => { /* Browser play still works if offline installation is unavailable. */ });
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (waitingWorker && !refreshing) { refreshing = true; location.reload(); } });
}
render();
