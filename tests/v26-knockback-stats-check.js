'use strict';
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');
const start = html.indexOf('const CORE = (() => {');
const end = html.indexOf("\nif (typeof module !== 'undefined') module.exports = CORE;", start);
assert(start >= 0 && end > start, 'CORE module boundaries must exist');
const K = new Function(`${html.slice(start, end)}; return CORE;`)();

function firstHitVelocity(attackerAugs) {
  const players = [
    { id: 0, team: 0, augs: attackerAugs.slice(), name: 'attacker' },
    { id: 1, team: 1, augs: [], name: 'defender' }
  ];
  const w = K.newWorld(players, '1v1', 'flat');
  const shooter = w.stones.find(s => s.owner === 0);
  const target = w.stones.find(s => s.owner === 1);
  for (const s of w.stones) if (s !== shooter && s !== target) s.dead = true;
  shooter.x = 300; shooter.y = 350;
  target.x = 390; target.y = 350;
  K.restatAll(w);
  K.fireExact(w, 0, shooter.id, 0, 1);
  for (let i = 0; i < 20; i++) {
    K.step(w);
    if (Math.abs(target.vx) > 1) return target.vx;
  }
  throw new Error('test shot never reached target');
}

const base = firstHitVelocity([]);
const fast = firstHitVelocity(['fast']);
const fastTwice = firstHitVelocity(['fast', 'fast']);
const clay = firstHitVelocity(['clay']);
const root = firstHitVelocity(['root']);
const fastRoot = firstHitVelocity(['fast', 'root']);
for (const [name, v] of [['fast', fast], ['fast twice', fastTwice], ['clay', clay], ['root', root], ['fast + root', fastRoot]]) {
  const ratio = Math.abs(v / base);
  assert(ratio > 0.97 && ratio < 1.03, `${name} must not amplify direct opponent knockback (ratio ${ratio})`);
}
assert(K.maxV(K.newWorld([{ id: 0, team: 0, augs: ['fast'] }, { id: 1, team: 1, augs: [] }], '1v1', 'flat'), { id: 0, team: 0, augs: ['fast'] }) > K.P.maxSpeed,
  'strength augments must continue to increase launch speed/range');
assert(html.includes('baseSpeed: baseImpactSpeed') && html.includes('impactRv += a.id === sh.stoneId ? excessShotNormal : -excessShotNormal'),
  'impact normalization must use a neutral baseline while leaving launch speed intact');
console.log('v26 strength/defense knockback checks: PASS');
console.log(` - direct-hit knockback stays within 3% (base ${base.toFixed(1)}, fast ${fast.toFixed(1)}, fast×2 ${fastTwice.toFixed(1)}, clay ${clay.toFixed(1)}, root ${root.toFixed(1)})`);
console.log(' - strength still increases launch speed and range');
