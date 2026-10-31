'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');
const fnMatch = html.match(/function lightningZone\(pid, shotNo, shrink = 0\) \{[\s\S]*?\n\}/);
const forecastMatch = html.match(/function lightningForecastShrink\(w, futureTurns = 1\) \{[\s\S]*?\n\}/);
assert(fnMatch && forecastMatch, 'lightning zone and shrink forecast helpers must exist');
const GAP = 75.67, N = 19, INSET = 46 + GAP / 2, S = INSET * 2 + GAP * (N - 1);
const maxShrink = S / 2 - 1.5 * GAP;
const ctx = vm.createContext({
  Math, N, GAP, INSET, S,
  L: i => INSET + i * GAP,
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  P: { shrinkStart: 25, shrinkTurns: 11, shrinkStep: GAP * 0.5 },
  A: { revGrowN: 2, revShrinkN: 3 },
  MAPS: { flat: { shrinkMax: maxShrink }, rev: { shrinkMax: maxShrink, revHole: true } }
});
vm.runInContext(fnMatch[0] + '\n' + forecastMatch[0] + '\nthis.zone = lightningZone; this.forecast = lightningForecastShrink;', ctx);
const zone = ctx.zone, forecast = ctx.forecast;
// Check every possible shrink step, including fractional values and the final fully-shrunk board.
for (let i = 0; i <= 2000; i++) {
  const shrink = maxShrink * i / 2000;
  for (let pid = 0; pid < 4; pid++) for (let shot = 1; shot <= 60; shot++) {
    const z = zone(pid, shot, shrink);
    assert(z.x0 >= shrink - 1e-7, `left edge outside board at shrink=${shrink}`);
    assert(z.y0 >= shrink - 1e-7, `top edge outside board at shrink=${shrink}`);
    assert(z.x1 <= S - shrink + 1e-7, `right edge outside board at shrink=${shrink}`);
    assert(z.y1 <= S - shrink + 1e-7, `bottom edge outside board at shrink=${shrink}`);
    assert(Math.abs((z.x1 - z.x0) - 3 * GAP) < 1e-7, 'lightning width must remain exactly 3 cells');
    assert(Math.abs((z.y1 - z.y0) - 3 * GAP) < 1e-7, 'lightning height must remain exactly 3 cells');
  }
}
const final = zone(0, 3, maxShrink);
assert.strictEqual(final.gx, 8, 'final lightning must be horizontally centered on the only fully fitting 3x3 area');
assert.strictEqual(final.gy, 8, 'final lightning must be vertically centered on the only fully fitting 3x3 area');
assert.match(html, /lightningZone\(sh\.shooter, w\.boltCount\[sh\.shooter\] \|\| A\.boltEvery, lightningForecastShrink\(w, 1\)\)/, 'actual strike must include the shrink caused by its own turn');
assert.match(html, /K\.lightningForecastShrink\(w, futureTurns\)/, 'visible preview must account for turns until the next lightning strike');
assert.match(html, /const z = K\.lightningZone\(p\.id, next, targetShrink\)/, 'preview zone must use the forecast board boundary');
// The last normal-map activation is selected against the post-turn final board, not the pre-turn board.
const beforeLastShrink = { map: 'flat', shots: 34, shrink: maxShrink * 10 / 11, noShrink: false, xtra: 0, rvn: 0 };
const postTurnShrink = forecast(beforeLastShrink, 1);
assert(Math.abs(postTurnShrink - maxShrink) < 1e-7, 'forecast must include the final shrink that occurs after the activating shot');
const finalStrike = zone(0, 33, postTurnShrink);
assert(finalStrike.x0 >= maxShrink - 1e-7 && finalStrike.x1 <= S - maxShrink + 1e-7, 'final activation must fit after the final shrink');
// Reverse map rope tightening is simulated separately from the standard map shrink.
const reverse = { map: 'rev', shots: 28, shrink: GAP, noShrink: false, xtra: 0, rvn: 4 };
assert(Math.abs(forecast(reverse, 1) - 1.5 * GAP) < 1e-7, 'reverse map preview must include its next rope tightening');
const stopped = { map: 'flat', shots: 34, shrink: maxShrink * 10 / 11, noShrink: true, xtra: 0, rvn: 0 };
assert(Math.abs(forecast(stopped, 1) - stopped.shrink) < 1e-7, 'no-shrink games must not forecast normal map shrink');
// User asked to change operation only; do not add boundary rules to augmentation copy.
assert.match(html, /bolt: \(\) => '내 세 번째 샷마다 무작위 위치에 3×3 번개가 떨어져 범위 안의 돌을 없앱니다\.'/);
assert.doesNotMatch(html.match(/bolt: \(\) => '[^']*'/)[0], /판|경계|축소/);
console.log('v24 lightning boundary checks: PASS');
console.log(' - preview and strike keep the complete 3x3 area inside the live board');
console.log(' - final-shrink activation accounts for the shrink at the end of the activating shot');
console.log(' - reverse-map rope tightening and no-shrink mode are forecast correctly');
console.log(' - augmentation description remains unchanged');
