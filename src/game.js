export const BUILD = '0.1.0';
export const SAVE_KEY = 'contraband-cove.save.v1';
export const ECONOMY = Object.freeze({ shipment: 20, premium: 35, clerk: 2, trainedClerk: 6, trainingCost: 60, berthCost: 120 });
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
  const first = shift === 1;
  const type = first ? ['seal', 'seal', 'weight', 'weight', 'both'][index] : ['seal', 'weight', 'seal', 'weight', 'both'][index];
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
    reward: premium ? ECONOMY.premium : ECONOMY.shipment, review: index === 1 || index === 4 };
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
export function initialState(seed = 28471) {
  return { version: 1, seed, coins: 0, trained: false, berth: false, shift: 1, index: 0, cases: Array.from({ length: 5 }, (_, i) => makeCase(seed, 1, i)), results: [], history: [], screen: 'harbor', tab: 'seal', weights: [], measured: null, sealFocus: null, checked: [], events: [], activeMs: 0 };
}
export function currentCase(s) { return s.cases[s.index]; }
export function totalWeight(weights) { return weights.reduce((a, b) => a + b, 0); }
// Positive means the right/reference side moves down. Cargo is on the left.
export function scaleAngle(actual, reference) { return Math.max(-12, Math.min(12, (reference - actual) * 2)); }
function event(s, type, detail = {}) { s.events = [...s.events.slice(-499), { type, build: BUILD, shift: s.shift, caseId: currentCase(s)?.id, ...detail }]; }
export function reduce(state, action) {
  const s = structuredClone(state);
  const c = currentCase(s);
  switch (action.type) {
    case 'start':
      s.screen = s.index >= 5 ? 'summary' : s.results.length > s.index ? 'result' : 'inspection';
      if (c && !c.checks.includes(s.tab)) s.tab = c.checks[0];
      event(s, 'inspection_open'); break;
    case 'harbor': s.screen = 'harbor'; break;
    case 'tab':
      if (c && c.checks.includes(action.tab)) { s.tab = action.tab; event(s, 'tool_open', { tool: action.tab }); } break;
    case 'focus': if (c && ['symbol', 'marks', 'border'].includes(action.part)) { s.sealFocus = action.part; event(s, 'seal_focus', { part: action.part }); } break;
    case 'checked': if (c && c.checks.includes(action.check) && !s.checked.includes(action.check)) s.checked.push(action.check); break;
    case 'weight':
      if (s.screen !== 'inspection' || !c.checks.includes('weight') || ![1, 2, 5, 10].includes(action.value)) break;
      if (totalWeight(s.weights) + action.value <= 30) { s.weights.push(action.value); event(s, 'weight_added', { value: action.value }); }
      if (totalWeight(s.weights) === c.actual) { s.measured = c.actual; if (!s.checked.includes('weight')) s.checked.push('weight'); }
      break;
    case 'removeWeight': if (s.screen === 'inspection') s.weights.splice(action.index, 1); break;
    case 'resetWeights': s.weights = []; break;
    case 'judge': {
      if (s.screen !== 'inspection' || !c || s.results.some(r => r.id === c.id) || !['clear', 'hold'].includes(action.verdict)) break;
      const correct = action.verdict === correctVerdict(c);
      const shipment = correct ? c.reward : 0;
      const clerk = correct ? (s.trained ? ECONOMY.trainedClerk : ECONOMY.clerk) : 0;
      const durationMs = Math.max(0, Math.min(Number(action.durationMs) || 0, 3600000));
      s.coins += shipment + clerk;
      s.results.push({ id: c.id, verdict: action.verdict, correct, shipment, clerk, durationMs });
      s.activeMs += durationMs;
      s.screen = 'result';
      event(s, 'judgment', { caseType: c.type, correct, verdict: action.verdict, durationMs, shipment, clerk });
      break;
    }
    case 'next':
      if (s.screen !== 'result') break;
      s.index++; s.weights = []; s.measured = null; s.checked = []; s.sealFocus = null;
      s.screen = s.index === 5 ? 'summary' : 'inspection';
      if (s.index < 5) s.tab = currentCase(s).checks[0];
      else event(s, 'shift_complete', { correct: s.results.filter(r => r.correct).length });
      break;
    case 'nextShift':
      if (s.index !== 5) break;
      s.history = [...s.history.slice(-19), { shift: s.shift, results: s.results }];
      s.shift++; s.index = 0; s.results = []; s.weights = []; s.measured = null; s.checked = []; s.sealFocus = null;
      s.cases = Array.from({ length: 5 }, (_, i) => makeCase(s.seed, s.shift, i, s.berth));
      s.tab = s.cases[0].checks[0]; s.screen = 'inspection'; event(s, 'next_shift'); break;
    case 'train':
      if (!s.trained && s.coins >= ECONOMY.trainingCost) { s.coins -= ECONOMY.trainingCost; s.trained = true; event(s, 'training_purchased'); } break;
    case 'upgrade':
      if (!s.berth && s.coins >= ECONOMY.berthCost) { s.coins -= ECONOMY.berthCost; s.berth = true; event(s, 'berth_purchased'); } break;
    default: return state;
  }
  return s;
}
export function restore(raw) {
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !Number.isSafeInteger(s.seed) || !Number.isSafeInteger(s.coins) || s.coins < 0 || typeof s.trained !== 'boolean' || typeof s.berth !== 'boolean' || !Number.isInteger(s.shift) || s.shift < 1 || !Number.isInteger(s.index) || s.index < 0 || s.index > 5) return null;
    if (!Array.isArray(s.cases) || s.cases.length !== 5 || !s.cases.every(validateCase) || !Array.isArray(s.results) || s.results.length > 5 || s.results.length < s.index || s.results.length > s.index + 1 || !Array.isArray(s.weights) || !s.weights.every(w => [1, 2, 5, 10].includes(w)) || totalWeight(s.weights) > 30 || !Array.isArray(s.events) || !Array.isArray(s.history) || !Array.isArray(s.checked)) return null;
    if (!['harbor', 'inspection', 'result', 'summary'].includes(s.screen)) return null;
    if (s.index === 5) s.screen = s.screen === 'harbor' ? 'harbor' : 'summary';
    else if (s.results.length > s.index && s.screen !== 'harbor') s.screen = 'result';
    else if (s.screen === 'result' || s.screen === 'summary') return null;
    return s;
  } catch { return null; }
}
