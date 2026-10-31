'use strict';
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');
function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert(start >= 0, `missing ${name}`);
  const brace = html.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = brace; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) { end = i + 1; break; }
  }
  assert(end > brace, `unterminated ${name}`);
  return html.slice(start, end);
}
const GAP = 75.67;
const S = 2 * 83.835 + GAP * 18;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const MAPS = { dim: { portals: true }, pond: { frog: true } };
const emitted = [];
const portalApiFactory = new Function('MAPS', 'clamp', 'S', 'GAP', 'emit', 'freeAt', 'nearSpot', `
  ${extractFunction('portalRand')}
  ${extractFunction('portalLayoutAt')}
  ${extractFunction('makePortalLayout')}
  ${extractFunction('portalsOf')}
  const portalAt = (P, x, y) => { if (!P) return -1; for (let i = 0; i < P.length; i++) { const q = P[i]; if (x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1) return i; } return -1; };
  ${extractFunction('portalStep')}
  return { makePortalLayout, portalsOf, portalStep, portalAt };
`);
const portalApi = portalApiFactory(MAPS, clamp, S, GAP, (_w, e) => emitted.push(e), () => true, () => null);

// 1,000 deterministic seeds: four edge gates, top/bottom 甲 and left/right 乙.
for (let i = 1; i <= 1000; i++) {
  const seed = Math.imul(i, 2654435761) >>> 0;
  const w = { map: 'dim', portalSeed: seed, shrink: 0 };
  const gates = portalApi.makePortalLayout(w);
  assert.strictEqual(gates.length, 4);
  assert.deepStrictEqual(gates.map(g => g.label), ['甲', '甲', '乙', '乙']);
  assert.deepStrictEqual(gates.map(g => g.pair), [0, 0, 1, 1]);
  assert.deepStrictEqual(gates.map(g => g.team), [0, 0, 1, 1]);
  assert(gates[0].vertical === false && gates[1].vertical === false, 'top/bottom gates must be horizontal');
  assert(gates[2].vertical === true && gates[3].vertical === true, 'left/right gates must be vertical');
  assert(Math.abs(gates[0].cx - (S * w.portalAlongT)) < 1e-8, 'top gate uses randomized x');
  assert(Math.abs(gates[1].cx - (S * (1 - w.portalAlongT))) < 1e-8, 'bottom gate mirrors top x');
  assert(Math.abs(gates[2].cy - (S * w.portalAlongT)) < 1e-8, 'left gate uses randomized y');
  assert(Math.abs(gates[3].cy - (S * (1 - w.portalAlongT))) < 1e-8, 'right gate mirrors left y');
  assert(Math.abs(gates[0].cx + gates[1].cx - S) < 1e-8, 'top and bottom x positions are mirrored');
  assert(Math.abs(gates[2].cy + gates[3].cy - S) < 1e-8, 'left and right y positions are mirrored');
  
  assert(w.portalAlongT >= 0.42 && w.portalAlongT <= 0.58);
  const maxShrink = GAP * 5;
  w.shrink = maxShrink;
  const maxGates = portalApi.portalsOf(w);
  assert(Math.abs(maxGates[0].y0 - maxShrink) < 1e-8 && Math.abs(maxGates[1].y1 - (S - maxShrink)) < 1e-8);
  assert(Math.abs(maxGates[2].x0 - maxShrink) < 1e-8 && Math.abs(maxGates[3].x1 - (S - maxShrink)) < 1e-8);
  // At the same edge the two orthogonal portals meet only at distinct edge centers; they must not overlap.
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
    const A = maxGates[a], B = maxGates[b];
    const overlapX = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0);
    const overlapY = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
    assert(!(overlapX > 0 && overlapY > 0), 'portals must not overlap at max shrink');
  }
}

// Both portal pairs follow their own opposite edges as the board shrinks.
const movingWorld = { map: 'dim', portalSeed: 777, shrink: 0 };
portalApi.makePortalLayout(movingWorld);
const start = portalApi.portalsOf(movingWorld).map(g => ({ ...g }));
movingWorld.shrink = GAP * 5;
const afterShrink = portalApi.portalsOf(movingWorld);
assert.strictEqual(afterShrink.length, 4);
assert.notStrictEqual(afterShrink[0].cy, start[0].cy);
assert.notStrictEqual(afterShrink[2].cx, start[2].cx);

// 甲 top↔bottom and 乙 left↔right; direction retained and speed ×1.2.
for (const [sourceIndex, destinationIndex, label, team] of [[0, 1, '甲', 0], [1, 0, '甲', 0], [2, 3, '乙', 1], [3, 2, '乙', 1]]) {
  const w = { map: 'dim', portalSeed: 42, shrink: 0 };
  const gates = portalApi.makePortalLayout(w);
  const source = gates[sourceIndex], destination = gates[destinationIndex];
  const stone = { x: source.cx, y: source.cy, r: GAP * 0.45, vx: 300, vy: -400, _mv: true, ptl: -1 };
  const beforeAngle = Math.atan2(stone.vy, stone.vx);
  portalApi.portalStep(w, stone);
  if (destinationIndex === 0) assert(stone.y > destination.y1, 'exit beyond top portal edge into board');
  if (destinationIndex === 1) assert(stone.y < destination.y0, 'exit beyond bottom portal edge into board');
  if (destinationIndex === 2) assert(stone.x > destination.x1, 'exit beyond left portal edge into board');
  if (destinationIndex === 3) assert(stone.x < destination.x0, 'exit beyond right portal edge into board');
  assert(Math.abs(stone.vx - 360) < 1e-8 && Math.abs(stone.vy + 480) < 1e-8);
  assert(Math.abs(Math.atan2(stone.vy, stone.vx) - beforeAngle) < 1e-8);
  const event = emitted[emitted.length - 1];
  assert.strictEqual(event.label, label);
  assert.strictEqual(event.team, team);
  assert.strictEqual(event.boost, 1.2);
  assert(Math.abs(event.speedAfter / event.speedBefore - 1.2) < 1e-8, 'portal must retain its 1.2x boost');
}

// If no safe landing spot exists, do not fall back to the destination portal center or overlap stones.
const blockedEvents = [];
const blockedApi = portalApiFactory(MAPS, clamp, S, GAP, (_w, e) => blockedEvents.push(e), () => false, () => null);
{
  const w = { map: 'dim', portalSeed: 91, shrink: 0 };
  const gates = blockedApi.makePortalLayout(w), source = gates[0];
  const stone = { x: source.cx, y: source.cy, r: GAP * 0.45, vx: 300, vy: -400, _mv: true, ptl: -1 };
  const before = { x: stone.x, y: stone.y };
  blockedApi.portalStep(w, stone);
  assert.strictEqual(stone.x, before.x);
  assert.strictEqual(stone.y, before.y);
  assert.strictEqual(stone.ptl, 0, 'blocked portal should remain locked to source until it exits');
  assert.strictEqual(blockedEvents.length, 0, 'blocked teleport should not emit a false portal event');
}

// Rewind invalidates the edge-geometry cache so the next portal read fits the current shrunken board.
assert(html.includes('w.portalGeomShrink = -1;'), 'rewind must invalidate cached portal geometry');
assert(html.includes('portalGeomShrink !== (w.shrink || 0)'), 'portal geometry must be recomputed after shrink');
assert(html.includes('pa: w.portalAxis') && html.includes('pt: w.portalAlongT'), 'portal layout seed must be saved online');
assert(html.includes('pl: (MAPS[w.map].portals ? portalsOf(w) : []).map'), 'portal coordinates must be serialized online');
assert(html.includes('w.fish = (o.fs || []).map(([x, y, px, py, left, hop = 1, ox = x, oy = y])'), 'fish hop state must survive online restore');
assert(html.includes('fs: (w.fish || []).map(f => [r1(f.x), r1(f.y), f.px, f.py, f.left, f.hop || 1'), 'fish hop state must be serialized');
assert(html.includes('fish: (w.fish || []).map(f => Object.assign({}, f))'), 'fish state must be preserved by snapshots and CPU clones');
assert(html.includes('portalAxis: w.portalAxis, portalAlongT: w.portalAlongT'), 'portal layout seed must be cloned for CPU simulation');
console.log('v15 dimension checks: PASS');
console.log(' - 1,000 seeded layouts create mirrored top/bottom 甲 and left/right 乙 portal pairs');
console.log(' - all four portals follow the shrinking edges and remain non-overlapping');
console.log(' - portal exits are placed beyond the destination opening without overlap');
console.log(' - online/CPU/rewind portal geometry state is retained');

// Pond fish returns after one turn and each successful catch grants a fixed +10%.
const A = { fishStay: 1, fishPower: 1.10, frogEvery: 5, fishLeapMin: 2.8, fishLeapSpan: 2.6, fishCatch: 20 };
const fishPlan = new Function('S', 'GAP', 'CX', 'CY', 'A', 'clamp', `${extractFunction('fishPlan')}; return fishPlan;`)(S, GAP, S / 2, S / 2, A, clamp);
const pondWorld = { shrink: 0, shots: 5, holes: [{ x: 500, y: 500, r: 40, pond: true }], fish: [] };
let fish = fishPlan(pondWorld)[0];
assert(fish && fish.hop === 1 && fish.left === 0, 'fish must appear for one turn');
const gone = fishPlan({ ...pondWorld, shots: 6, fish: [fish] })[0];
assert(gone.gone, 'fish must return after one turn');
const collectFish = new Function('live', 'hyp', 'emit', 'A', `${extractFunction('collectFish')}; return collectFish;`)(
  s => !s.dead, (x, y) => Math.hypot(x, y), (_w, event) => emitted.push(event), A
);
const collector = { id: 10, owner: 0, x: 100, y: 100, r: 20, _mv: true, fishBoost: 0, dead: false };
const catchWorld = { shot: {}, stones: [collector], fish: [{ ...fish, x: 100, y: 100, px: 80, py: 100, hop: 1 }] };
assert.strictEqual(collectFish(catchWorld), true);
assert.strictEqual(collector.fishBoost, 0.1, 'each catch must grant exactly +10%');
assert(html.includes('fishStay: 1'), 'pond fish duration must be one turn');
assert(html.includes('const gain = 0.10;'), 'fish reward must be fixed at +10%');
assert(html.includes('1수 뒤 돌아갑니다'), 'pond rules must describe the one-turn return');
assert(!html.includes('+8%·+6%'), 'old diminishing fish rewards must be removed');
console.log('v15 pond checks: PASS');
console.log(' - fish returns after one turn; each catch grants fixed +10%');
console.log(' - diminishing fish rewards removed');
console.log(' - online/CPU snapshots preserve fish state');
