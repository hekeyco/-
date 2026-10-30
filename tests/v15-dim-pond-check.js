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
const portalApi = new Function('MAPS', 'clamp', 'S', 'GAP', 'emit', `
  ${extractFunction('portalRand')}
  ${extractFunction('portalLayoutAt')}
  ${extractFunction('makePortalLayout')}
  ${extractFunction('portalsOf')}
  const portalAt = (P, x, y) => { if (!P) return -1; for (let i = 0; i < P.length; i++) { const q = P[i]; if (x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1) return i; } return -1; };
  ${extractFunction('portalStep')}
  return { makePortalLayout, portalsOf, portalStep, portalAt };
`)(MAPS, clamp, S, GAP, (_w, e) => emitted.push(e));

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
  const stone = { x: source.cx, y: source.cy, vx: 300, vy: -400, _mv: true, ptl: -1 };
  const beforeAngle = Math.atan2(stone.vy, stone.vx);
  portalApi.portalStep(w, stone);
  assert(Math.abs(stone.x - destination.cx) < 1e-8 && Math.abs(stone.y - destination.cy) < 1e-8);
  assert(Math.abs(stone.vx - 360) < 1e-8 && Math.abs(stone.vy + 480) < 1e-8);
  assert(Math.abs(Math.atan2(stone.vy, stone.vx) - beforeAngle) < 1e-8);
  const event = emitted[emitted.length - 1];
  assert.strictEqual(event.label, label);
  assert.strictEqual(event.team, team);
  assert.strictEqual(event.boost, 1.2);
}

// Rewind invalidates the edge-geometry cache so the next portal read fits the current shrunken board.
assert(html.includes('w.portalGeomShrink = -1;'), 'rewind must invalidate the cached portal geometry');
assert(html.includes('portalGeomShrink !== (w.shrink || 0)'), 'portal geometry must be recomputed after the board shrinks');
assert(html.includes('pa: w.portalAxis') && html.includes('pt: w.portalAlongT'), 'portal layout seed must be saved online');
assert(html.includes('pl: (MAPS[w.map].portals ? portalsOf(w) : []).map'), 'portal coordinates and pair labels must be serialized online');
assert(html.includes('w.fish = (o.fs || []).map(([x, y, px, py, left])'), 'fish lifetime must survive online restore');
assert(html.includes('fs: (w.fish || []).map(f => [r1(f.x), r1(f.y), f.px, f.py, f.left])'), 'fish lifetime must be serialized online');
assert(html.includes('fish: (w.fish || []).map(f => Object.assign({}, f))'), 'fish lifetime must be preserved by snapshots and CPU clones');
assert(html.includes('portalAxis: w.portalAxis, portalAlongT: w.portalAlongT'), 'portal layout seed must be cloned for CPU simulation');
console.log('v15 dimension checks: PASS');
console.log(' - 1,000 seeded layouts create mirrored top/bottom 甲 and left/right 乙 portal pairs');
console.log(' - each opposite-edge pair uses a mirrored position across the board center');
console.log(' - all four portals follow their edges and remain non-overlapping at maximum shrink');
console.log(' - 甲↔甲 and 乙↔乙 transport preserve direction and apply 1.2x speed');
console.log(' - online/CPU/rewind portal geometry state is retained');

// Pond fish spawn, then remain in the same place for three complete following turns.
const A = { fishStay: 3, fishPower: 1.10, frogEvery: 5, fishLeapMin: 1.4, fishLeapSpan: 1.4, fishCatch: 20 };
const fishPlan = new Function('S', 'GAP', 'CX', 'CY', 'A', 'clamp', `${extractFunction('fishPlan')}; return fishPlan;`)(S, GAP, S / 2, S / 2, A, clamp);
const pondWorld = { shrink: 0, shots: 5, holes: [{ x: 500, y: 500, r: 40, pond: true }, { x: 1500, y: 1300, r: 40, pond: true }], fish: [] };
const spawned = fishPlan(pondWorld);
assert.strictEqual(spawned.length, 2, 'fish should spawn from both ponds at the interval');
assert(spawned.every(f => f.left === 3), 'fish must begin with three full turns remaining');
let current = { ...spawned[0] };
for (const left of [2, 1]) {
  const next = fishPlan({ ...pondWorld, shots: 6 + (3 - left), fish: [current] })[0];
  assert.strictEqual(next.left, left);
  assert.strictEqual(next.stay, true);
  assert.strictEqual(next.x, current.x);
  assert.strictEqual(next.y, current.y);
  current = next;
}
const expired = fishPlan({ ...pondWorld, shots: 9, fish: [current] })[0];
assert.strictEqual(expired.left, 0);
assert.strictEqual(expired.gone, true, 'fish must leave after the third full following turn');

// A fish grants +10% per pickup, stacks on the same stone, and is removed on collection.
const collectFish = new Function('live', 'hyp', 'emit', 'A', `${extractFunction('collectFish')}; return collectFish;`)(
  s => !s.dead, (x, y) => Math.hypot(x, y), (_w, event) => emitted.push(event), A
);
const collector = { id: 10, owner: 0, x: 100, y: 100, r: 20, _mv: true, fishBoost: 0, dead: false };
const catchWorld = { shot: {}, stones: [collector], fish: [
  { x: 100, y: 100, px: 80, py: 100 }, { x: 100, y: 100, px: 80, py: 100 }
] };
assert.strictEqual(collectFish(catchWorld), true);
assert.strictEqual(collector.fishBoost, 1);
assert.strictEqual(catchWorld.fish.length, 1, 'caught fish must disappear immediately');
assert.strictEqual(collectFish(catchWorld), true);
assert.strictEqual(collector.fishBoost, 2, 'same stone can collect repeatedly');
assert.strictEqual(catchWorld.fish.length, 0);
assert.match(html, /const vmaxOf = \(w, s, pid = s\.owner\) => maxV\(w, w\.players\[pid\]\) \* \(1 \+ \(A\.fishPower - 1\) \* Math\.max\(0, Math\.floor\(s\.fishBoost \\|\\\\\\| 0\)\)\)/, 'shot speed must multiply by +10% per fish charge');
const oneFishSpeed = 100 * (1 + (A.fishPower - 1));
const testSpeed = 100 * (1 + (A.fishPower - 1) * 2);
assert(Math.abs(oneFishSpeed - 110) < 1e-9, 'one fish grants +10% power on the next firing');
assert(Math.abs(testSpeed - 120) < 1e-9, 'two fish grants +20% power on next firing speed');
assert(/const fishCharges = Math\.max\(0, Math\.floor\(s\.fishBoost \|\| 0\)\);\s*if \(fishCharges\) \{ s\.fishBoost = 0;/.test(html), 'fish charges must be consumed on the next launch');
assert(html.includes('fishStay: 3') && html.includes('fishPower: 1.10'), 'pond balance constants must be 3 turns and +10% per fish');
assert(html.includes('const plans = MAPS[w.map].frog ? fishPlan(w) : []') && html.includes('w.fish = [];'), 'phase updates must remove expired fish from the board');
assert(html.includes('금붕어는 3수 동안 머문 뒤 연못으로 돌아갑니다'), 'pond rules must describe the three-turn stay');
assert(html.includes('ctx.fillText(`${left}수`, f.x, f.y - 48)'), 'pond fish must show the number of turns remaining');
assert(html.includes('갑(甲)은 갑(甲)으로, 을(乙)은 을(乙)로 연결'), 'dimension introduction must explain the two matching pairs');
console.log('v15 pond checks: PASS');
console.log(' - fish spawn with three full turns and stay at one location');
console.log(' - uncaught fish exits after the third following turn');
console.log(' - each catch stacks +10% on the same stone and removes the fish immediately');
console.log(' - stacked bonus is consumed at the next shot');
