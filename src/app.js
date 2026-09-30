import { BUILD, SAVE_KEY, ECONOMY, CAPTAINS, PORTS, initialState, currentCase, totalWeight, scaleAngle, reduce, restore, explanation, correctVerdict, readyToJudge, dailyRules } from './game.js';

const root = document.querySelector('#app');
const help = document.querySelector('#help');
const art = name => `./assets/art/runtime/${name}.webp`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let state, storageWarning = '', storageAvailable = true;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  state = raw ? restore(raw) : null;
  if (raw && !state) {
    // Keep an invalid/older save recoverable rather than overwriting it silently.
    localStorage.setItem(`${SAVE_KEY}.recovery.${Date.now()}`, raw);
    storageWarning = 'Your old save could not be loaded. A recovery copy was kept on this device.';
  }
} catch { storageAvailable = false; storageWarning = 'Saving is unavailable in this browser. This session will not persist.'; }
state ||= initialState(28471);
let activeStart = performance.now(), elapsed = 0, installPrompt, waitingWorker;
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
function header() {
  const gameplay = ['briefing', 'introduction', 'inspection'].includes(state.screen);
  if (gameplay) return `<header class="masthead gameplay-header"><button class="round-btn" data-action="harbor" aria-label="Return to harbor">${icon('anchor')}</button><nav class="reference-nav" aria-label="Inspection references">${button(`${icon('book')}<span>Declaration</span>`, 'declaration', 'header-btn', state.screen === 'briefing')}${button(`${icon('seal')}<span>Daily rules</span>`, 'dailyRules', 'header-btn')}</nav><span class="gameplay-shift">SHIFT ${state.shift}</span><button class="round-btn" data-action="help" aria-label="Help and settings">${icon('help')}</button></header>`;
  return `<header class="masthead"><button class="brand" data-action="harbor" aria-label="Contraband Cove harbor">${icon('anchor')}<span>CONTRABAND <b>COVE</b></span></button><div class="header-right"><span class="treasury" aria-label="Treasury ${state.coins} coins">${coins(state.coins)}</span><button class="round-btn" data-action="help" aria-label="Help and settings">${icon('help')}</button></div></header>`;
}
function footer() { return `<footer class="footer"><span>BRASS & TIMBER <span class="separator">/</span> PLAYTEST ${BUILD}</span><button data-action="help">How to play & save info</button><span>${storageAvailable ? 'Saved on this device' : 'Session only'}</span></footer>`; }
function harbor() {
  const finished = state.index === 5;
  const resumed = state.index > 0 || state.results.length > 0;
  const title = finished ? 'A good day’s work.' : state.shift > 1 ? 'The tide brings new trade.' : 'Your cove. Your call.';
  return `<main class="harbor"><section class="harbor-scene"><div class="harbor-picture"><img src="${art('harbor-overview')}" alt="A sunlit customs house and wooden berth in a turquoise cove">${state.berth ? `<img class="berth-overlay" src="${art('berth-upgrade')}" alt="Your expanded berth with a new cargo crane">` : ''}</div><div class="scene-shade"></div><div class="harbor-intro"><span class="eyebrow">WELCOME TO CONTRABAND COVE</span><h1>${title}</h1><p>A little harbor. A sharp eye.<br>Honest trade starts with you.</p><div class="ribbon">${icon('anchor')} Independent harbor · ${state.berth ? 'Improved berth' : "Founder’s berth"}</div></div><div class="shift-ticket"><span class="eyebrow">THE CUSTOMS DESK</span><h2>${finished ? 'Shift complete' : `Shift ${state.shift} awaits`}</h2><p>${finished ? 'Review your earnings, then welcome the next arrivals.' : `${resumed ? `${state.index} of 5 ships inspected.` : 'Five arrivals. Two tools. One keen inspector.'} No rush, no timers.`}</p>${button(`${icon('arrow')}${finished ? 'View shift report' : resumed ? 'Resume inspection' : 'Open the harbor'}`, 'start', 'gold wide')}<small>Progress saves after every shipment.</small></div></section>
    <section class="management"><div class="section-heading"><div><span class="eyebrow">MAKE IT YOUR OWN</span><h2>A thriving little operation</h2></div><span class="subtle">Earn it. Build it. See it grow.</span></div><div class="upgrade-grid">
    <article class="panel upgrade-card"><div class="upgrade-portrait"><img src="${art(state.trained ? 'mara-pleased' : 'mara-neutral')}" alt="Mara, your customs clerk"></div><div class="upgrade-info"><span class="eyebrow">YOUR RIGHT HAND</span><h3>${state.trained ? 'Mara, senior clerk' : 'Mara, customs clerk'}</h3><p>${state.trained ? 'Training complete. Mara processes more routine cargo alongside each successful inspection.' : 'A little guidance goes a long way. Train Mara to process more routine cargo.'}</p><div class="benefit">${icon('coin')} Clerk credit: ${state.trained ? '6' : '2 → 6'} coins / correct verdict</div>${button(state.trained ? `${icon('check')}Training complete` : `${icon('book')}Train clerk <span>${coins(ECONOMY.trainingCost)}</span>`, 'train', 'navy wide', state.trained || state.coins < ECONOMY.trainingCost)}${!state.trained && state.coins < ECONOMY.trainingCost ? `<small>${ECONOMY.trainingCost - state.coins} more coins needed</small>` : ''}</div></article>
    <article class="panel upgrade-card"><div class="berth-detail"><img src="${art('harbor-overview')}" alt="The harbor berth">${state.berth ? `<img class="berth-overlay" src="${art('berth-upgrade')}" alt=""/>` : ''}<span>${icon('anchor')} BERTH ${state.berth ? 'II' : 'I'}</span></div><div class="upgrade-info"><span class="eyebrow">ROOM FOR AMBITION</span><h3>${state.berth ? 'A bigger welcome' : 'Build a better berth'}</h3><p>${state.berth ? 'The new berth welcomes fine-instrument shipments starting next shift.' : 'A reinforced pier and cargo crane attract higher-value shipments.'}</p><div class="benefit">${icon('up')} Premium cargo: 35 coins / correct verdict</div>${button(state.berth ? `${icon('check')}Berth improved` : `${icon('up')}Upgrade berth <span>${coins(ECONOMY.berthCost)}</span>`, 'upgrade', 'navy wide', state.berth || state.coins < ECONOMY.berthCost)}${!state.berth && state.coins < ECONOMY.berthCost ? `<small>${ECONOMY.berthCost - state.coins} more coins needed</small>` : ''}</div></article></div></section></main>`;
}
function sealSvg(s, focus) {
  const symbol = icon(s.symbol).replace('class="icon "', 'class="seal-emblem"').replace('viewBox="0 0 24 24"', 'x="33" y="26" width="54" height="54" viewBox="0 0 24 24"');
  return `<svg class="seal-art" viewBox="0 0 120 120" role="img" aria-label="${s.symbol} emblem, ${s.marks} dots, ${s.border} ring"><circle cx="60" cy="60" r="55" fill="#204453" stroke="#d5ab59" stroke-width="2"/><g fill="none" stroke="${focus === 'border' ? '#fff' : '#e7bd70'}" stroke-width="2"><circle cx="60" cy="60" r="48"/>${s.border === 'double' ? '<circle cx="60" cy="60" r="43"/>' : ''}</g><g color="${focus === 'symbol' ? '#fff' : '#f2e4c7'}">${symbol}</g><g fill="${focus === 'marks' ? '#fff' : '#e7bd70'}">${Array.from({ length: s.marks }, (_, i) => `<circle cx="${60 + (i - (s.marks - 1) / 2) * 12}" cy="90" r="3"/>`).join('')}</g></svg>`;
}
function seals(c) {
  return `<section class="evidence-panel"><div class="tool-title"><div><span class="eyebrow">SEAL OF APPROVAL</span><h2>Does the seal match?</h2></div>${icon('seal')}</div><p class="tool-instruction">Compare the emblem, dots, and rings. Every detail must match.</p><div class="seal-pair"><div class="seal-sheet"><span class="eyebrow">OFFICIAL REFERENCE</span>${sealSvg(c.reference, state.sealFocus)}<strong>${PORTS[c.port]}</strong><small>Trusted harbor register</small></div><div class="seal-sheet presented"><span class="eyebrow">PRESENTED SEAL</span>${sealSvg(c.presented, state.sealFocus)}<strong>Shipping declaration</strong><small>Check against the reference</small></div></div><div class="focus-row" aria-label="Compare a seal detail">${['symbol', 'marks', 'border'].map((p, i) => button(['Emblem', 'Dots', 'Rings'][i], 'focus', `outline ${state.sealFocus === p ? 'selected' : ''}`, false, `data-part="${p}" aria-pressed="${state.sealFocus === p}"`)).join('')}</div>${button(`${icon('check')}${state.checked.includes('seal') ? 'Seal inspected' : 'Mark seal inspected'}`, 'checked', 'outline wide', state.checked.includes('seal'), 'data-check="seal"')}<small class="quiet-note">Your note only. You make the final decision.</small></section>`;
}
function scale(c) {
  const total = totalWeight(state.weights), angle = scaleAngle(c.actual, total);
  const radians = angle * Math.PI / 180, delta = Math.sin(radians) * 124, offset = Math.cos(radians) * 124;
  const status = total === c.actual ? `Balanced at ${total} kg` : total < c.actual ? 'Cargo side is heavier' : 'Weights side is heavier';
  return `<section class="evidence-panel"><div class="tool-title"><div><span class="eyebrow">WEIGH THE EVIDENCE</span><h2>A matter of balance.</h2></div>${icon('scale')}</div><p class="tool-instruction">Add weights to the right pan. Balance the scale, then compare with the declared <strong>${c.declared} kg</strong>.</p><div class="scale-stage"><svg viewBox="0 0 420 280" class="balance" role="img" aria-label="${status}"><image href="${art('scale-stand')}" x="146" y="28" width="128" height="225"/><g transform="rotate(${angle},210,58)" class="beam"><image href="${art('scale-beam')}" x="61" y="8" width="298" height="100"/></g><g transform="translate(${210 - offset},${58 - delta})" class="pan"><image href="${art('scale-pan')}" x="-73" y="-8" width="146" height="138"/><image href="${art(c.cargo)}" x="-44" y="47" width="88" height="66"/></g><g transform="translate(${210 + offset},${58 + delta})" class="pan"><image href="${art('scale-pan')}" x="-73" y="-8" width="146" height="138"/>${total ? `<image href="${art('reference-weight')}" x="-30" y="42" width="60" height="68"/><rect x="-25" y="83" width="50" height="23" rx="4" fill="#183442"/><text x="0" y="100" text-anchor="middle" fill="#fff0d1" font-size="14" font-weight="bold">${total} kg</text>` : ''}</g><text x="84" y="251" text-anchor="middle" class="scale-label">CARGO</text><text x="336" y="251" text-anchor="middle" class="scale-label">WEIGHTS</text></svg></div><div class="scale-status ${total === c.actual ? 'balanced' : ''}" role="status">${total === c.actual ? icon('check') : icon('scale')}${status}<span>${total} kg placed</span></div><div class="weight-rack" aria-label="Reference weights">${[1, 2, 5, 10].map(w => `<button class="weight-btn" data-action="weight" data-value="${w}" ${total + w > 30 ? 'disabled' : ''} aria-label="Add ${w} kg"><img src="${art('reference-weight')}" alt=""><span>+ ${w} kg</span></button>`).join('')}</div><div class="placed-weights">${state.weights.length ? state.weights.map((w, i) => `<button data-action="removeWeight" data-index="${i}" aria-label="Remove ${w} kg weight">${w} kg ×</button>`).join('') : '<small>Tap a weight to add it. Tap a placed weight to remove it.</small>'}</div><div class="scale-bottom">${button('Reset weights', 'resetWeights', 'text-btn', !state.weights.length)}<span>${state.measured === null ? 'Gross weight · packaging included' : `Recorded: ${state.measured} kg`}</span></div></section>`;
}
function manifest(c) {
  const captain = CAPTAINS[c.captain];
  return `<section class="manifest panel"><span class="eyebrow">SHIPPING DECLARATION</span><h3>${captain.ship}</h3><div class="cargo-thumb"><img src="${art(c.cargo)}" alt="${c.cargo.replaceAll('-', ' ')}"></div><dl><div><dt>Cargo</dt><dd>${c.goods}</dd></div><div><dt>Origin</dt><dd>${PORTS[c.port]}</dd></div>${c.checks.includes('weight') ? `<div><dt>Declared gross weight</dt><dd>${c.declared} kg · packaging included</dd></div>` : ''}<div><dt>Shipment reward</dt><dd>${coins(c.reward)}</dd></div><div><dt>Required checks</dt><dd>${c.checks.map(x => x === 'seal' ? 'Seal' : 'Weight').join(' + ')}</dd></div></dl>${c.review ? `<div class="clerk-note"><img src="${art('mara-neutral')}" alt="Mara"><div><strong>Mara suggests: ${c.recommendation.toUpperCase()}</strong><p>${c.recommendation === 'clear' ? '“I think the required checks match. Could you double-check?”' : '“Something may not match the declaration. Please verify.”'}</p><small>Recommendation only—not verified evidence.</small></div></div>` : ''}</section>`;
}
function ruleContent() {
  const rules = dailyRules(state);
  return `<p class="daily-note">${rules.note}</p><div class="daily-rule-list">${rules.entries.map(([symbol,title,body],i) => `<article class="daily-rule"><span class="rule-number">${String(i+1).padStart(2,'0')}</span><div><h3>${icon(symbol)}${title}</h3><p>${body}</p></div></article>`).join('')}</div>`;
}
function briefing() {
  return `<main class="briefing-page"><section class="panel briefing-panel"><span class="eyebrow">CONTRABAND COVE · HARBOR AUTHORITY</span><div class="briefing-heading">${icon('seal')}<div><h1>Daily rules</h1><span>SHIFT ${state.shift} · INSPECTOR'S BRIEFING</span></div></div>${ruleContent()}<p class="reference-reminder">Keep these close. The Daily rules button stays in your header throughout inspection.</p>${button(`Acknowledge & meet the captain${icon('arrow')}`, 'acknowledgeRules', 'gold wide')}</section></main>`;
}
function introduction() {
  const c = currentCase(state), captain = CAPTAINS[c.captain];
  return `<main class="introduction-page"><div class="introduction-grid"><section class="captain-introduction"><div class="intro-portrait"><img src="${art(captain.art)}" alt="${captain.name}"></div><div class="intro-copy"><span class="eyebrow">${c.review ? 'CLERK REVIEW' : 'NEW ARRIVAL'} · SHIP ${state.index + 1} OF 5</span><h1>${captain.name}</h1><p>“${captain.line}”</p></div></section><div class="intro-paperwork">${manifest(c)}<p class="intro-guidance">${c.checks.length === 2 ? 'This shipment requires both seal inspection and weighing.' : c.checks[0] === 'seal' ? 'Compare this shipment’s seal with the official reference.' : 'Balance this shipment and verify its declared gross weight.'}</p>${button(`Begin inspection${icon('arrow')}`, 'beginInspection', 'gold wide')}</div></div></main>`;
}
function inspection() {
  const c = currentCase(state), captain = CAPTAINS[c.captain];
  const ready = readyToJudge(state), remaining = c.checks.filter(check => !state.checked.includes(check));
  const nextCheck = remaining[0];
  return `<main class="inspection inspection-v2"><section class="inspection-presence" aria-label="Captain present during inspection"><div class="presence-water"></div><div class="presence-status"><span class="eyebrow">${c.review ? 'CLERK REVIEW' : 'INSPECTION DESK'} · SHIP ${state.index + 1} / 5</span><h1>${ready ? 'Ready for your verdict.' : 'Examine the shipment.'}</h1><div class="check-progress">${c.checks.map(check => `<span class="${state.checked.includes(check) ? 'complete' : ''}">${icon(state.checked.includes(check) ? 'check' : check === 'seal' ? 'seal' : 'scale')}${check === 'seal' ? 'Seal' : 'Weight'} ${state.checked.includes(check) ? 'inspected' : 'required'}</span>`).join('')}</div></div><img class="persistent-captain" src="${art(captain.art)}" alt="${captain.name}"></section><div class="work-area"><div class="work-main"><nav class="tool-tabs" aria-label="Required inspection tools">${c.checks.map(check => button(`${icon(check === 'seal' ? 'seal' : 'scale')}${check === 'seal' ? 'Seal inspection' : 'Cargo weight'}${state.checked.includes(check) ? ' ✓' : ''}`, 'tab', state.tab === check ? 'active' : '', false, `data-tab="${check}" aria-pressed="${state.tab === check}"`)).join('')}<span>Required: ${c.checks.length === 2 ? 'both checks' : 'one check'}</span></nav>${state.tab === 'seal' ? seals(c) : scale(c)}</div></div><section class="verdict-bar ${ready ? '' : 'inspection-pending'}" aria-label="Inspection progress">${ready ? `<div><strong>Your harbor. Your judgment.</strong><span>Checks complete. Do the findings match? Incorrect verdicts earn zero.</span></div><div class="verdict-actions">${button(`${icon('check')}Clear`, 'judge', 'teal', false, 'data-verdict="clear"')}${button(`${icon('hold')}Hold`, 'judge', 'clay', false, 'data-verdict="hold"')}</div>` : `<div><strong>${state.checked.length} of ${c.checks.length} checks completed</strong><span>${nextCheck === 'seal' ? 'Inspect the seal, then mark it inspected.' : 'Balance the scale to record the cargo weight.'}</span></div>${nextCheck !== state.tab ? button(`Continue to ${nextCheck === 'seal' ? 'seal inspection' : 'weighing'}${icon('arrow')}`, 'tab', 'gold', false, `data-tab="${nextCheck}"`) : `<span class="pending-label">${icon('book')}Complete inspection to unlock your verdict</span>`}`}</section></main>`;
}
function result() {
  const c = currentCase(state), r = state.results[state.index];
  return `<main class="report-page"><section class="panel result-panel"><span class="eyebrow">SHIP ${state.index + 1} OF 5 · VERDICT RECORDED</span><div class="result-emblem ${r.correct ? 'success' : 'mistake'}">${icon(r.correct ? 'check' : 'book')}</div><h1>${r.correct ? 'A sharp eye, inspector.' : 'One to learn from.'}</h1><p class="result-subtitle">You chose ${r.verdict.toUpperCase()}. ${r.correct ? 'The evidence supports your decision.' : `This shipment needed ${correctVerdict(c).toUpperCase()}.`}</p><div class="evidence-review">${explanation(c).map(e => `<p>${icon('seal')}<span>${e}</span></p>`).join('')}</div><div class="reward-breakdown"><div><span>Shipment income</span>${coins(r.shipment)}</div><div><span>Mara's routine cargo credit</span>${coins(r.clerk)}</div><div class="total"><strong>Added to treasury</strong>${coins(r.shipment + r.clerk)}</div></div>${!r.correct ? '<p class="quiet-note">No existing coins or upgrades were lost.</p>' : ''}${button(`${state.index === 4 ? 'Finish shift' : 'Next shipment'}${icon('arrow')}`, 'next', 'gold wide')}${button('Return to harbor', 'harbor', 'text-btn wide')}</section></main>`;
}
function summary() {
  const correct = state.results.filter(r => r.correct).length, shipment = state.results.reduce((a, r) => a + r.shipment, 0), clerk = state.results.reduce((a, r) => a + r.clerk, 0);
  return `<main class="report-page"><section class="panel result-panel summary"><span class="eyebrow">SHIFT ${state.shift} · THE HARBOR LEDGER</span><div class="result-emblem success">${icon('anchor')}</div><h1>Another tide, well met.</h1><p class="result-subtitle">Five ships inspected. A little more experience.</p><div class="summary-stats"><div><strong>${correct}<small>/5</small></strong><span>Correct judgments</span></div><div><strong>${shipment + clerk}</strong><span>Coins earned</span></div></div><div class="ship-results">${state.results.map((r, i) => `<span class="${r.correct ? 'success' : 'mistake'}" title="Ship ${i + 1}: ${r.correct ? 'correct' : 'incorrect'}">${icon(r.correct ? 'check' : 'close')}<small>SHIP ${i + 1}</small></span>`).join('')}</div><div class="reward-breakdown"><div><span>Shipment income</span>${coins(shipment)}</div><div><span>Mara's routine cargo credit</span>${coins(clerk)}</div></div><p>${state.coins >= ECONOMY.trainingCost && !state.trained ? 'You can afford Mara’s training. Put your earnings to work.' : !state.berth ? `Your better berth is ${Math.max(0, ECONOMY.berthCost - state.coins)} coins away.` : 'Your improved harbor is ready for the next arrivals.'}</p>${button(`${icon('anchor')}Visit the harbor`, 'harbor', 'gold wide')}${button(`Next shift${icon('arrow')}`, 'nextShift', 'navy wide')}<button class="export-link" data-action="export">Export playtest log</button></section></main>`;
}
function render() {
  root.innerHTML = `<div class="app-shell ${state.screen === 'inspection' ? 'playing' : ''}">${header()}${storageWarning ? `<div class="save-warning" role="alert">${escape(storageWarning)}</div>` : ''}${({ harbor, briefing, introduction, inspection, result, summary }[state.screen])()}${footer()}</div>`;
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch { storageAvailable = false; storageWarning = 'Your browser could not save progress. Keep this tab open; export your playtest log before leaving.'; }
}
function toast(message) { const t = document.querySelector('#toast'); t.textContent = message; t.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 3800); }
function dispatch(action) {
  const oldScreen = state.screen, previous = state;
  if (action.type === 'judge') action.durationMs = elapsed + (document.hidden ? 0 : performance.now() - activeStart);
  state = reduce(state, action);
  if (state.screen === 'inspection' && (oldScreen !== 'inspection' || action.type === 'next')) { elapsed = 0; activeStart = performance.now(); }
  save(); render();
  if (oldScreen !== state.screen || action.type === 'next') { window.scrollTo({ top: 0, behavior: 'instant' }); const heading = root.querySelector('h1'); heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true }); }
  if (action.type === 'train' && !previous.trained && state.trained) toast('Training complete! Mara now adds 6 coins per correct verdict.');
  if (action.type === 'upgrade' && !previous.berth && state.berth) toast('Berth improved! Premium shipments arrive from your next shift.');
}
let dialogTrigger;
function showDialog(content, label) {
  dialogTrigger = document.activeElement;
  help.innerHTML = content;
  help.setAttribute('aria-label', label);
  help.showModal();
}
help.addEventListener('close', () => dialogTrigger?.isConnected && dialogTrigger.focus());
function openReference(kind) {
  const title = kind === 'declaration' ? 'Shipping declaration' : dailyRules(state).title;
  const content = kind === 'declaration' ? manifest(currentCase(state)) : ruleContent();
  showDialog(`<div class="dialog-heading"><h2>${title}</h2><button class="round-btn" data-action="closeHelp" aria-label="Close ${kind === 'declaration' ? 'declaration' : 'daily rules'}">${icon('close')}</button></div>${content}`, title);
}
function openHelp() {
  help.innerHTML = `<div class="dialog-heading"><h2>The inspector's handbook</h2><button class="round-btn" data-action="closeHelp" aria-label="Close handbook">${icon('close')}</button></div><p><strong>CLEAR</strong> a shipment when every required check matches. <strong>HOLD</strong> any mismatch for verification.</p><div class="help-step">${icon('seal')}<div><h3>Compare the seal</h3><p>Match the emblem, number of dots, and single or double ring against the official reference, then tap Mark seal inspected.</p></div></div><div class="help-step">${icon('scale')}<div><h3>Balance the cargo</h3><p>Tap 1, 2, 5, or 10 kg weights to place them on the right pan. Tap a placed weight to remove it. When balanced, compare the total with the declared gross weight. Packaging is included. Complete every required check to unlock CLEAR and HOLD.</p></div></div><div class="help-step">${icon('coin')}<div><h3>Grow through play</h3><p>Correct verdicts earn shipment income and a separate clerk credit. Incorrect verdicts earn zero; existing coins are never deducted. Train Mara for 60 coins. Improve the berth for 120. There is no offline income.</p></div></div><h3>Install & play offline</h3><p>On iPhone/iPad, use Safari’s Share menu → Add to Home Screen. On Android, use your browser’s Install app or Add to Home screen option. Play in the browser if installation is unavailable. Load once online before playing offline.</p>${installPrompt ? button('Install game', 'install', 'gold wide') : ''}<h3>Your progress & privacy</h3><p>Progress stays in this browser on this device. Clearing site data removes it. No accounts, ads, or remote analytics. The optional export contains local gameplay events, not personal details.</p>${waitingWorker ? button('Apply downloaded update', 'update', 'gold wide') : ''}${button('Export playtest log', 'export', 'outline wide')}<details><summary>Reset this device’s playtest</summary><p>This clears your coins, upgrades, and local playtest log. It cannot be undone.</p>${button('Reset all progress', 'reset', 'clay wide')}</details><small>Prototype ${BUILD} · Balance values are provisional.</small>`;
  dialogTrigger = document.activeElement; help.setAttribute('aria-label', 'Inspector handbook'); help.showModal();
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-action]'); if (!b || b.disabled) return;
  const type = b.dataset.action;
  if (type === 'help') return openHelp();
  if (type === 'declaration' || type === 'dailyRules') return openReference(type);
  if (type === 'closeHelp') return help.close();
  if (type === 'export') {
    const data = { build: BUILD, seed: state.seed, shift: state.shift, coins: state.coins, trained: state.trained, berth: state.berth, activeMs: state.activeMs, currentResults: state.results, history: state.history, events: state.events };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `contraband-cove-playtest-${state.shift}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
  }
  if (type === 'reset') { if (confirm('Reset all local progress, coins, upgrades, and the playtest log?')) { state = initialState(); save(); help.close(); render(); } return; }
  if (type === 'install') { if (installPrompt) { await installPrompt.prompt(); installPrompt = null; help.close(); } return; }
  if (type === 'update') { save(); waitingWorker?.postMessage({ type: 'SKIP_WAITING' }); return; }
  dispatch({ type, tab: b.dataset.tab, part: b.dataset.part, check: b.dataset.check, value: Number(b.dataset.value), index: Number(b.dataset.index), verdict: b.dataset.verdict });
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (state.screen === 'inspection') elapsed += performance.now() - activeStart; save(); }
  else activeStart = performance.now();
});
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
