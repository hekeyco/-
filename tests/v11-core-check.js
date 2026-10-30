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
const bounceVelocity = new Function(`${extractFunction('bounceVelocity')}; return bounceVelocity;`)();
// Flat wall: tangential velocity preserved; normal velocity reverses at the shared 0.92 restitution.
let [vx, vy] = bounceVelocity(120, 300, 0, -1, 0.92);
assert(Math.abs(vx - 120) < 1e-9);
assert(Math.abs(vy + 276) < 1e-9);
// Diagonal surface: normal component reflects while tangent remains unchanged.
const q = Math.SQRT1_2;
[vx, vy] = bounceVelocity(100, 0, -q, q, 0.92);
const beforeN = 100 * -q;
const afterN = vx * -q + vy * q;
assert(Math.abs(afterN + beforeN * 0.92) < 1e-8);
// Obstacles may use the same normal reflection plus the legacy minimum kick.
[vx, vy] = bounceVelocity(0, 40, 0, -1, 0.92, 160);
assert(Math.abs(vy + 160) < 1e-9);

const centerFirst = new Function('hyp', 'CX', 'CY', `${extractFunction('centerFirst')}; return centerFirst;`)(
  (x, y) => Math.hypot(x, y), 0, 0
);
const ordered = centerFirst({}, [
  { id: 9, x: 9, y: 0 },
  { id: 3, x: 0, y: 2 },
  { id: 4, x: 0, y: -2 },
  { id: 1, x: 4, y: 0 }
]);
assert.deepStrictEqual(ordered.map(x => x.id), [3, 4, 1, 9]);

assert(/edgeF:\s*1\.65,\s*edgeD:\s*1\.6\s*\*\s*GAP/.test(html), 'cliff range and 65% friction should remain configured');
assert(/boltEvery:\s*2,\s*boltV:\s*620/.test(html), 'lightning should be buffed to 620');
assert(html.includes("ef *= hasSyn(owner, 'fortress') ? 2.5 : A.edgeF;"), 'cliff drag application missing');
assert(!html.includes('A.edgeM') && !html.includes('P.wallRest'), 'old cliff armor or separate wall restitution remains');
assert(html.includes("${G.round}:${p.id}:${w.picks[p.id]}:${offer.bonus ? 'bonus' : 'base'}"), 'reveal key missing');
assert(html.includes("id=\"netCopy\""), 'room copy control missing');
assert(html.includes("K.baseLeft(w, p.team, p.id) < left ? '다음 증강 <b>없음</b>'"), 'unavailable next basic pick should display none');
assert(/revive: 3,/.test(html) && /kingV: 1\.4/.test(html) && /denseV: 1\.24/.test(html) && /dragonM: 2\.1/.test(html) && /tengenH: 1\.7/.test(html), 'jade tier buffs missing');
for (const marker of [
  "const best = centerFirst(w, w.stones.filter(s => live(s) && s.owner === p.id && !s.king))[0];",
  "const best = centerFirst(w, w.stones.filter(s => live(s) && s.owner === p.id && !s.pillar))[0];",
  "const cand = centerFirst(w, w.stones.filter(s => s.owner === pid && buffOK(w, pid, s.id)));",
  "const mine = centerFirst(w, w.stones.filter(s => live(s) && s.owner === p.id && !s.big && !s.small)).slice(0, A.sizeN);"
]) assert(html.includes(marker), 'center-target routine not shared by every auto target path');
console.log('v11 core checks: PASS');
console.log(' - shared wall/obstacle vector reflection and restitution');
console.log(' - center-nearest stable target ordering');
console.log(' - cliff friction/range and lightning buff');
console.log(' - one-time offer reveal guard, room-code copy UI, and no-next-pick indicator');
console.log(' - modest jade-tier value buffs');

// Reverse-map collapse: each removed pair must be orthogonally adjacent and leave one connected component.
const revTilesAdjacent = new Function(`${extractFunction('revTilesAdjacent')}; return revTilesAdjacent;`)();
const revPairKeepsConnected = new Function(`${extractFunction('revTilesAdjacent')}; ${extractFunction('revPairKeepsConnected')}; return revPairKeepsConnected;`)();
let activeTiles = Array.from({ length: 9 }, (_, i) => i);
let completedDrops = 0;
for (let round = 0; round < 3; round++) {
  const candidates = [];
  for (let i = 0; i < activeTiles.length; i++) for (let j = i + 1; j < activeTiles.length; j++) {
    const a = activeTiles[i], b = activeTiles[j];
    if (revTilesAdjacent(a, b) && revPairKeepsConnected(activeTiles, a, b)) candidates.push([a, b]);
  }
  assert(candidates.length > 0, `reverse-map round ${round + 1} must have a legal adjacent pair`);
  const [a, b] = candidates[(round * 7) % candidates.length];
  assert(revTilesAdjacent(a, b), 'removed tiles must touch edge-to-edge');
  assert(revPairKeepsConnected(activeTiles, a, b), 'remaining area must stay connected');
  activeTiles = activeTiles.filter(i => i !== a && i !== b);
  completedDrops++;
}
assert.strictEqual(completedDrops, 3, 'reverse map must collapse exactly three pairs');
assert.strictEqual(activeTiles.length, 3, 'three connected tiles must remain');
assert(html.includes('revDrops: w.revDrops || 0') && html.includes('rvc: w.revDrops || 0'), 'collapse count must persist in snapshots and online sync');
assert(html.includes('data-book-aug=') && html.includes('book-keys'), 'quick augmentation guide and hover details missing');
console.log('v12 reverse-map and quick-guide checks: PASS');
console.log(' - three adjacent-pair collapses preserve one connected area');
console.log(' - collapse count survives snapshots and online sync');
console.log(' - compact descriptions/keywords with hover details');

console.log('legacy dimension-specific checks superseded by the v15 four-portal suite');
