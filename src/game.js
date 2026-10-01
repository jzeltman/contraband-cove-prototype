export const BUILD = '0.5.0';
export const SAVE_KEY = 'contraband-cove.save.v5';
export const SHIFT_MS = 60000;
export const ECONOMY = Object.freeze({ shipment: 20, premium: 35, clerk: 2, trainedClerk: 6, hireCost: 80, trainingCost: 60, berthCost: 120 });
export const CAPTAINS = [
  { name: 'Captain Finch', ship: 'The Copper Gull', art: 'merchant-captain', line: 'A fair wind and honest cargo. Take a look for yourself.' },
  { name: 'Captain Brine', ship: 'The Old Compass', art: 'weathered-sailor', line: 'Been sailing these waters longer than that dock’s been standing.' },
  { name: 'Captain Vale', ship: 'The Velvet Tide', art: 'well-dressed-trader', line: 'My customers appreciate a careful inspector. As do I.' }
];
export const PORTS = ['Port Amber', 'Northwatch', 'Saltwater Reach'];
export const SEALS = [
  { symbol: 'anchor', marks: 3, border: 'double' },
  { symbol: 'ship', marks: 2, border: 'single' },
  { symbol: 'compass', marks: 4, border: 'double' }
];
export function random(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function makeCase(seed, shift, index, berth = false) {
  const rng = random(seed + shift * 991 + index * 37);
  const pick = n => Math.floor(rng() * n);
  const first = shift === 1 && index < 5;
  const slot = index % 5;
  const type = first ? ['seal', 'seal', 'weight', 'weight', 'both'][index] : ['seal', 'weight', 'seal', 'weight', 'both'][slot];
  const bad = first ? [false, true, false, true, true][index] : (index % 2 === shift % 2);
  const port = pick(3);
  const reference = { ...SEALS[port] };
  const presented = { ...reference };
  const mismatch = type === 'weight' ? 'weight' : type === 'both' && pick(2) ? 'weight' : 'seal';
  if (bad && mismatch === 'seal') {
    const part = pick(3);
    if (part === 0) presented.symbol = ['anchor', 'ship', 'compass'].find(s => s !== reference.symbol);
    if (part === 1) presented.marks = reference.marks === 4 ? 2 : reference.marks + 1;
    if (part === 2) presented.border = reference.border === 'double' ? 'single' : 'double';
  }
  const declared = 5 + pick(16);
  const actual = bad && mismatch === 'weight' ? declared + (pick(2) ? 2 : -2) : declared;
  const premium = berth && index % 2 === 0;
  const c = { id: `${seed}-${shift}-${index}`, type, checks: type === 'both' ? ['seal', 'weight'] : [type], captain: pick(3), port, reference, presented, declared, actual,
    cargo: premium ? 'trade-chest' : pick(2) ? 'wooden-crate' : 'cloth-bundle', goods: premium ? 'Fine instruments' : 'Merchant supplies', premium,
    reward: premium ? ECONOMY.premium : ECONOMY.shipment, review: slot === 1 || slot === 4 };
  const correct = correctVerdict(c);
  c.recommendation = index === 1 ? (correct === 'clear' ? 'hold' : 'clear') : correct;
  return c;
}
export function sealMatches(c) { return ['symbol', 'marks', 'border'].every(k => c.reference[k] === c.presented[k]); }
export function correctVerdict(c) { return (c.checks.includes('seal') && !sealMatches(c)) || (c.checks.includes('weight') && c.actual !== c.declared) ? 'hold' : 'clear'; }
export function explanation(c) {
  const notes = [];
  if (c.checks.includes('seal')) {
    const a = c.reference, b = c.presented;
    if (sealMatches(c)) notes.push('The emblem, dots, and rings match the official seal.');
    else {
      if (a.symbol !== b.symbol) notes.push(`The seal shows a ${b.symbol}; ${PORTS[c.port]} requires a ${a.symbol}.`);
      if (a.marks !== b.marks) notes.push(`The seal has ${b.marks} dots; the official seal has ${a.marks}.`);
      if (a.border !== b.border) notes.push(`The seal has a ${b.border} ring; the official seal has a ${a.border} ring.`);
    }
  }
  if (c.checks.includes('weight')) notes.push(c.actual === c.declared ? `Cargo balances at the declared ${c.declared} kg, packaging included.` : `Cargo weighs ${c.actual} kg, but the declaration says ${c.declared} kg. Hold it for verification.`);
  return notes;
}
export function validateCase(c) {
  return c.checks.length > 0 && c.checks.every(x => ['seal', 'weight'].includes(x)) && Number.isInteger(c.actual) && c.actual > 0 && c.actual <= 30 && Number.isInteger(c.declared) && c.declared > 0 && c.reward > 0 && [c.reference, c.presented].every(s => ['anchor', 'ship', 'compass'].includes(s.symbol) && s.marks >= 1 && s.marks <= 4 && ['single', 'double'].includes(s.border));
}
export function makeShipment(seed, serial, premium = false, single = false) {
  // The same ordered lots support the optional single-cargo comparison mode.
  let group = serial, position = 0;
  if (single) { group = 0; position = serial; while (position >= (group % 3 === 2 ? 3 : 2)) { position -= group % 3 === 2 ? 3 : 2; group++; } }
  const count = single ? 1 : group % 3 === 2 ? 3 : 2;
  const indices = single ? [position] : Array.from({ length: count }, (_, i) => i);
  const captain = group % CAPTAINS.length;
  const lots = indices.map(i => {
    const c = makeCase(seed + group * 101, group + 1, [0, 3, 4][i], premium);
    if (group > 0) {
      const rng = random(seed + group * 811 + i * 613);
      c.presented = { ...c.reference }; c.actual = c.declared;
      if (rng() < 0.4) {
        if (c.checks.includes('seal') && (!c.checks.includes('weight') || rng() < 0.5)) {
          const part = Math.floor(rng() * 3);
          if (part === 0) c.presented.symbol = ['anchor','ship','compass'].find(x=>x!==c.reference.symbol);
          if (part === 1) c.presented.marks = c.reference.marks === 4 ? 2 : c.reference.marks + 1;
          if (part === 2) c.presented.border = c.reference.border === 'single' ? 'double' : 'single';
        } else c.actual = c.declared + 2;
      }
    }
    return { ...c, id: `${seed}-lot-${group}-${i}`, captain,
      cargo: ['cloth-bundle', 'wooden-crate', 'trade-chest'][i],
      goods: ['Cloth bundle', 'Supply crate', 'Instrument chest'][i],
      checked: [], weights: [], measured: null, sealFocus: null, tab: c.checks[0],
      started: false, certified: false, sealWorkMs: 0, result: null, inspectionMs: 0 };
  });
  return { id: `${seed}-ship-${serial}`, captain, introduced: false, lots };
}
export function initialState(seed = 28471, single = false) {
  return { version: 5, seed, single, serial: 0, ship: makeShipment(seed, 0, false, single), activeLot: 0,
    remainingMs: SHIFT_MS, started: false, ended: false, paused: false, overtimeLotId: null,
    timeLevel: 0, warehouseLevel: 0, porter: false, transport: 0, yard: [], delivered: 0,
    shipAdmitted: true, yardReturn: 'harbor', exportWait: [], exportElapsed: 0, exportSerial: 0, outbound: null, exportIncome: 0, exportDepartures: 0, notice: '',
    coins: 0, hired: false, trained: false, berth: false, shift: 1,
    results: [], history: [], departures: 0, screen: 'harbor', returnScreen: 'introduction',
    briefed: false, events: [], activeMs: 0, selectedUpgrade: 'mara' };
}
export function shiftDuration(s) { return SHIFT_MS + s.timeLevel * 30000; }
export function yardCapacity(s) { return 3 + s.warehouseLevel * 3; }
export function reservedSpaces(s) { return s.shipAdmitted ? s.ship.lots.filter(l => !l.result).length : 0; }
export function exportRoom(s) { return yardCapacity(s) - s.yard.length - reservedSpaces(s); }
export function canAdmitShip(s) { return s.shipAdmitted || yardCapacity(s) - s.yard.length >= s.ship.lots.filter(l => !l.result).length; }
export function deliveryDuration(s) { return [8000, 4000, 2000][s.transport]; }
export const DEVELOPMENT = {
  time: { field: 'timeLevel', costs: [60, 120], max: 2 },
  warehouse: { field: 'warehouseLevel', costs: [60, 120], max: 2 },
  porter: { field: 'porter', costs: [80], max: 1 },
  transport: { field: 'transport', costs: [80, 120], max: 2 }
};
export function developmentCost(s, id) { const d = DEVELOPMENT[id]; return d?.costs[Number(s[d.field])]; }
function advanceLogistics(s, active) {
  if (s.porter) {
    let work = active;
    for (const item of [...s.yard]) {
      if (item.kind !== 'import') continue;
      const used = Math.min(work, Math.max(0, deliveryDuration(s) - item.deliveryMs));
      item.deliveryMs += used; work -= used;
      if (item.deliveryMs >= deliveryDuration(s)) {
        s.yard = s.yard.filter(x => x.id !== item.id); s.delivered++;
        event(s, 'porter_delivery', { cargoId: item.id, destination: item.destination });
      }
      if (work <= 0) break;
    }
  }
  s.exportElapsed += active;
  while (s.exportElapsed >= 20000) {
    s.exportElapsed -= 20000;
    if (s.exportWait.length >= 2) continue;
    const i = s.exportSerial++;
    s.exportWait.push({ id: `export-${i}`, kind: 'export', goods: i % 2 ? 'Island spices' : 'Island cloth', cargo: i % 2 ? 'wooden-crate' : 'cloth-bundle', destination: PORTS[Math.floor(i / 2) % 3] });
    event(s, 'export_arrival');
  }
}
export function currentCase(s) { return s.ship.lots[s.activeLot]; }
export function shipmentComplete(s) { return s.ship.lots.every(l => l.result); }
export function readyToJudge(s) {
  const c = currentCase(s);
  return !!c && !c.result && c.checks.every(check => c.checked.includes(check) && (check !== 'weight' || c.measured === c.actual));
}
export function lotStatus(lot) { return lot.result ? lot.result.verdict === 'clear' ? 'Cleared' : 'Held' : lot.started || lot.checked.length ? 'In progress' : 'Unchecked'; }
export function workerTarget(s) {
  if (!s.hired || s.paused || s.ended || s.remainingMs <= 0 || s.screen !== 'inspection') return null;
  return s.ship.lots.find(l => l.id !== currentCase(s).id && !l.result && l.checks.includes('seal') && !l.checked.includes('seal')) || null;
}
export function workerDuration(s) { return s.trained ? 4000 : 8000; }
export function dailyRules(s) {
  return { title: `Daily rules · Shift ${s.shift}`,
    note: s.shift === 1 ? 'One captain, separate cargo decisions. Inspect the cloth seal and weigh the supply crate. Every third vessel adds an instrument chest.' : 'Unfinished cargo waits for you. Every lot still needs its own verdict.',
    entries: [
      ['hold', `${shiftDuration(s)/1000} seconds until the tide turns`, 'The clock starts at your first inspection. Planning, references and pause stop time. At zero, finish only the selected cargo. Other lots wait for the next shift.'],
      ['ship', 'Make room for the next ship', 'Tap the yard to deliver imports to town or secure custody. Exports share this space: unload island goods, then match them to outbound orders. Porters deliver imports while you work.'],
      ['seal', 'Official seals must match', 'Compare the emblem, dots and rings. Mark the seal inspected once you have checked it.'],
      ['scale', 'Gross weight must match exactly', 'Balance the cargo using reference weights. Declared weight includes packaging. No discrepancy is permitted.'],
      ['check', 'Each lot needs every required check', 'Switching cargo preserves your work. Certified checks by hired Mara count; a completed check does not mean the cargo passes.'],
      ['hold', 'Clear matches. Hold discrepancies.', 'Judge every lot separately. A held lot does not condemn the whole shipment. Your verdict routes it to ordinary or secure storage.'],
      ['coin', 'Payment follows correct judgment', 'Correct lot verdicts pay once. Mistakes earn zero and never deduct coins. Ship departure adds no second payment.']
    ] };
}
export function totalWeight(weights) { return weights.reduce((a, b) => a + b, 0); }
export function scaleAngle(actual, reference) { return Math.max(-12, Math.min(12, (reference - actual) * 2)); }
function event(s, type, detail = {}) { s.events = [...s.events.slice(-499), { type, build: BUILD, shift: s.shift, shipId: s.ship.id, lotId: currentCase(s)?.id, ...detail }]; }
function endShift(s) { s.ended = true; s.screen = 'summary'; event(s, 'shift_complete', { lots: s.results.length, departures: s.departures }); }
function startLot(s, index) {
  s.activeLot = index; currentCase(s).started = true; s.screen = 'inspection';
  s.started = true; s.ship.introduced = true; event(s, 'lot_open');
}
function newShip(s) {
  s.shipAdmitted = false; s.serial++; s.ship = makeShipment(s.seed, s.serial, s.berth, s.single);
  s.activeLot = s.hired && s.ship.lots.length > 1 ? 1 : 0;
}
export function reduce(state, action) {
  const s = structuredClone(state), c = currentCase(s);
  if (s.paused && !['resume', 'harbor'].includes(action.type)) return state;
  switch (action.type) {
    case 'pause': s.paused = true; break;
    case 'resume': s.paused = false; break;
    case 'tick': {
      if (!s.started || s.ended || !['introduction', 'inspection', 'result', 'shipment', 'yard', 'outbound'].includes(s.screen)) break;
      const delta = Number(action.ms);
      if (!Number.isFinite(delta) || delta <= 0) break;
      const active = Math.min(delta, s.remainingMs);
      if (active > 0) advanceLogistics(s, active);
      const worker = workerTarget(s);
      if (worker) {
        worker.sealWorkMs = Math.min(workerDuration(s), worker.sealWorkMs + active);
        if (worker.sealWorkMs >= workerDuration(s)) {
          worker.checked.push('seal'); worker.certified = true;
          event(s, 'mara_certified', { targetLotId: worker.id, matches: sealMatches(worker) });
        }
      }
      if (s.screen === 'inspection' && !c.result) c.inspectionMs += delta;
      const before = s.remainingMs;
      s.remainingMs = Math.max(0, before - delta);
      if (before > 0 && s.remainingMs === 0) {
        s.overtimeLotId = s.screen === 'inspection' && c.started && !c.result ? c.id : null;
        event(s, 'tide_turned', { overtimeLotId: s.overtimeLotId });
        if (['introduction', 'yard', 'outbound'].includes(s.screen)) endShift(s);
      }
      break;
    }
    case 'start':
      s.screen = s.ended ? 'summary' : !s.briefed ? 'briefing' : s.returnScreen;
      break;
    case 'acknowledgeRules':
      if (s.screen !== 'briefing') break;
      s.briefed = true; s.screen = 'introduction'; event(s, 'rules_acknowledged'); break;
    case 'beginInspection':
      if (s.screen !== 'introduction' || !s.briefed || s.remainingMs <= 0 || s.ended || c.result) break;
      if (!canAdmitShip(s)) { s.notice = 'Deliver cargo from the yard to make room for this shipment.'; break; }
      s.shipAdmitted = true; startLot(s, s.activeLot); break;
    case 'selectLot': {
      const index = Number(action.index), lot = s.ship.lots[index];
      if (!['inspection', 'introduction'].includes(s.screen) || s.remainingMs <= 0 || !lot || lot.result) break;
      if (s.screen === 'inspection') startLot(s, index); else s.activeLot = index;
      break;
    }
    case 'harbor':
      if (!['harbor', 'upgrades'].includes(s.screen)) s.returnScreen = s.screen;
      s.paused = false; s.screen = 'harbor'; break;
    case 'upgrades':
      if (!['harbor', 'upgrades'].includes(s.screen)) s.returnScreen = s.screen;
      s.screen = 'upgrades'; break;
    case 'selectUpgrade':
      if (s.screen === 'upgrades' && ['desk','mara','training','berth','porter','warehouse','time','transport','secondBerth','lighthouse'].includes(action.id)) s.selectedUpgrade = action.id;
      break;
    case 'tab': if (s.screen === 'inspection' && c.checks.includes(action.tab)) c.tab = action.tab; break;
    case 'focus': if (s.screen === 'inspection' && ['symbol', 'marks', 'border'].includes(action.part)) c.sealFocus = action.part; break;
    case 'checked':
      if (s.screen === 'inspection' && !c.result && c.checks.includes('seal') && action.check === 'seal' && !c.checked.includes('seal')) { c.checked.push('seal'); event(s, 'seal_completed'); } break;
    case 'weight':
      if (s.screen !== 'inspection' || c.result || !c.checks.includes('weight') || ![1, 2, 5, 10].includes(action.value)) break;
      if (totalWeight(c.weights) + action.value <= 30) c.weights.push(action.value);
      if (totalWeight(c.weights) === c.actual) { c.measured = c.actual; if (!c.checked.includes('weight')) c.checked.push('weight'); }
      break;
    case 'removeWeight': if (s.screen === 'inspection') c.weights.splice(action.index, 1); break;
    case 'resetWeights': if (s.screen === 'inspection') c.weights = []; break;
    case 'judge': {
      if (s.screen !== 'inspection' || !s.briefed || !s.ship.introduced || !readyToJudge(s) || !['clear','hold'].includes(action.verdict)) break;
      if (s.remainingMs <= 0 && s.overtimeLotId !== c.id) break;
      if (s.yard.length >= yardCapacity(s)) break;
      const correct = action.verdict === correctVerdict(c);
      const shipment = correct ? c.reward : 0;
      const clerk = correct && s.hired ? (s.trained ? ECONOMY.trainedClerk : ECONOMY.clerk) : 0;
      c.result = { id: c.id, shipId: s.ship.id, goods: c.goods, verdict: action.verdict, correct, shipment, clerk, durationMs: Math.round(c.inspectionMs) };
      s.yard.push({ id: c.id, kind: 'import', goods: c.goods, cargo: c.cargo, destination: action.verdict === 'clear' ? 'Town market' : 'Secure custody', secure: action.verdict === 'hold', deliveryMs: 0 });
      s.coins += shipment + clerk; s.results.push(c.result); s.activeMs += c.result.durationMs;
      s.screen = 'result'; event(s, 'judgment', c.result); break;
    }
    case 'next':
      if (s.screen !== 'result') break;
      if (shipmentComplete(s)) { s.screen = 'shipment'; break; }
      if (s.remainingMs <= 0) { endShift(s); break; }
      startLot(s, s.ship.lots.findIndex(l => !l.result)); break;
    case 'depart':
      if (s.screen !== 'shipment' || !shipmentComplete(s)) break;
      s.departures++; event(s, 'ship_departed');
      if (s.remainingMs <= 0) { endShift(s); break; }
      newShip(s); s.screen = 'introduction'; break;
    case 'nextShift':
      if (!s.ended) break;
      s.history = [...s.history.slice(-19), { shift: s.shift, results: s.results, departures: s.departures }];
      s.shift++; s.results = []; s.departures = 0; s.exportIncome = 0; s.exportDepartures = 0;
      s.remainingMs = shiftDuration(s); s.started = false; s.ended = false; s.paused = false; s.overtimeLotId = null;
      if (shipmentComplete(s)) newShip(s);
      else s.activeLot = s.ship.lots.findIndex(l => !l.result);
      s.screen = 'briefing'; s.briefed = false; s.returnScreen = 'introduction'; event(s, 'next_shift'); break;
    case 'yard':
      if (!['yard', 'outbound'].includes(s.screen)) s.yardReturn = s.screen;
      s.screen = 'yard'; s.notice = ''; break;
    case 'yardBack':
      s.screen = s.ended ? 'summary' : s.yardReturn; s.notice = ''; break;
    case 'deliver': {
      if (s.screen !== 'yard') break;
      const item = s.yard.find(x => x.id === action.id && x.kind === 'import');
      if (!item) break;
      s.yard = s.yard.filter(x => x.id !== item.id); s.delivered++;
      s.notice = `${item.goods} delivered to ${item.destination.toLowerCase()}.`;
      event(s, 'manual_delivery', { cargoId: item.id, destination: item.destination }); break;
    }
    case 'develop': {
      const d = DEVELOPMENT[action.id], price = developmentCost(s, action.id);
      if (s.screen !== 'upgrades' || !d || price === undefined || s.coins < price || (action.id === 'transport' && !s.porter)) break;
      s.coins -= price; s[d.field] = d.field === 'porter' ? true : s[d.field] + 1;
      event(s, 'development', { upgrade: action.id, level: s[d.field] }); break;
    }
    case 'unloadExport': {
      if (s.screen !== 'yard' || !s.briefed || s.ended || s.remainingMs <= 0 || exportRoom(s) <= 0) break;
      const item = s.exportWait.find(x => x.id === action.id); if (!item) break;
      s.started = true; s.exportWait = s.exportWait.filter(x => x.id !== item.id); s.yard.push(item);
      s.notice = `${item.goods} stored for ${item.destination}.`; event(s, 'export_unloaded', { cargoId: item.id }); break;
    }
    case 'outbound': {
      if (s.screen !== 'yard' || !s.briefed || s.ended || s.remainingMs <= 0) break;
      if (!s.outbound) {
        const first = s.yard.find(x => x.kind === 'export'); if (!first) break;
        const items = s.yard.filter(x => x.kind === 'export' && x.destination === first.destination).slice(0, 2);
        s.outbound = { destination: first.destination, orders: items.map(x => ({ goods: x.goods, loaded: false })), captain: (s.exportDepartures + 2) % CAPTAINS.length };
      }
      s.started = true; s.screen = 'outbound'; s.notice = ''; break;
    }
    case 'loadExport': {
      if (s.screen !== 'outbound' || s.remainingMs <= 0 || s.ended || !s.outbound) break;
      const item = s.yard.find(x => x.id === action.id);
      if (!item) break;
      const order = s.outbound.orders.find(x => !x.loaded && x.goods === item.goods);
      if (item.kind !== 'export' || item.destination !== s.outbound.destination || !order) { s.notice = 'That cargo does not match the order. Check the goods and destination.'; break; }
      order.loaded = true; s.yard = s.yard.filter(x => x.id !== item.id);
      s.notice = `${item.goods} loaded aboard.`; event(s, 'export_loaded', { cargoId: item.id }); break;
    }
    case 'dispatchExport': {
      if (s.screen !== 'outbound' || s.remainingMs <= 0 || s.ended || !s.outbound?.orders.every(x => x.loaded)) break;
      const reward = s.outbound.orders.length * 25;
      s.coins += reward; s.exportIncome += reward; s.exportDepartures++;
      event(s, 'export_departed', { reward, destination: s.outbound.destination });
      s.outbound = null; s.screen = 'yard'; s.notice = `Export ship departed. Earned ${reward} coins.`; break;
    }
    case 'backToYard': s.screen = 'yard'; s.notice = ''; break;
    case 'hire':
      if (s.screen === 'upgrades' && !s.hired && s.coins >= ECONOMY.hireCost) { s.coins -= ECONOMY.hireCost; s.hired = true; event(s, 'mara_hired'); } break;
    case 'train':
      if (s.screen === 'upgrades' && s.hired && !s.trained && s.coins >= ECONOMY.trainingCost) { s.coins -= ECONOMY.trainingCost; s.trained = true; event(s, 'training_purchased'); } break;
    case 'upgrade':
      if (s.screen === 'upgrades' && !s.berth && s.coins >= ECONOMY.berthCost) { s.coins -= ECONOMY.berthCost; s.berth = true; event(s, 'berth_purchased'); } break;
    default: return state;
  }
  return s;
}
export function restore(raw) {
  try { const s = JSON.parse(raw); return s?.version === 5 ? s : null; } catch { return null; }
}
