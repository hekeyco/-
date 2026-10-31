'use strict';
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');

// Stat terms and the color-key/hover additions are rolled back to plain text.
assert.match(html, /const statText = value => esc\(String\(value\)\);/);
assert(!html.includes('STAT_TERM_INFO'), 'stat hover glossary must be removed');
assert(!html.includes('class=\"stat-key\"'), 'extra stat color key must be removed');
assert(!html.includes('stat-power{color:'), 'colored stat styling must be removed');
assert(!html.includes('curve: [[\'쏘기 전\''), 'duplicate curve stat badge must be removed');

// Lightning repeats every four of the owner's shots and stays visible outside aim mode.
assert.match(html, /boltEvery:\s*3,\s*boltV:\s*620/);
assert.match(html, /function drawLightningPreview\(w, now\)[\s\S]*?G\.state === 'roundEnd'[\s\S]*?G\.players\.find\(q => localHuman\(q\) && cnt\(q, 'bolt'\)\)[\s\S]*?const next = current \+ \(K\.A\.boltEvery - \(current % K\.A\.boltEvery\)\)[\s\S]*?내 번개 · \$\{countdown\}/);
assert.match(html, /bolt:.*?내 샷 3번째마다 3×3 낙뢰/);

// Distinct transcendence labels; Heaven and Black Hole keep their dedicated stamps only.
assert.match(html, /if \(e\.id !== 'heaven' && e\.id !== 'hole'\) fxStamp\(CX, CY, AUG\[e\.id\]\.seal, AUG\[e\.id\]\.name/);
assert.match(html, /fxStamp\(CX, CY - 40, '甦', '역천'/);
assert.match(html, /fxStamp\(CX, CY - 40, '黑', '흑점'/);

// Fish travel stays within four vertical cells of its pond origin.
assert.match(html, /const yMin = Math\.max\(lo \+ 0\.6 \* GAP, h\.y - 2 \* GAP\), yMax = Math\.min\(hi - 0\.6 \* GAP, h\.y \+ 2 \* GAP\)/);
assert.match(html, /clamp\(h\.y \+ Math\.sin\(ang\) \* d, yMin, yMax\)/);

// Gise force, theft loss counter, and one-time appearance for Lone Road.
assert.match(html, /momV:\s*1\.25/);
assert.match(html, /countLoss\(w, s\);\s*\/\* 도둑에게 빼앗긴 기본 돌은 원래 주인의 증강 카운터에 반영 \*\/[\s\S]*?s\.owner = p\.id/);
assert.match(html, /'loneSeen'\]/);
assert.match(html, /loneSeen:\s*\{\}/);
assert.match(html, /id === 'lone' && \(\(w\.loneSeen && w\.loneSeen\[p\.id\]\) \|\| !morePicks\(w, p\)\)/);
assert.match(html, /if \(ids\.includes\('lone'\)\) w\.loneSeen\[pid\] = 1/);
assert.match(html, /if \(ids\[idx\] === 'lone'\) w\.loneSeen\[pid\] = 1/);

// The player-facing guides describe these updated rules.
for (const phrase of ['금붕어는 연못 주변에 나타나 1수 뒤 돌아갑니다.', '도둑에게 빼앗긴 기본 돌', '외길은 한 번 등장하면 다시 나오지 않습니다', '내 샷 3번째마다'])
  assert(html.includes(phrase), `missing in-game rules phrase: ${phrase}`);

console.log('v18 visual/UX checks: PASS');
console.log(' - stat color and hover additions rolled back');
console.log(' - 3-shot private lightning preview and named transcendence stamps');
console.log(' - pond vertical bounds, theft counter, and one-time Lone Road offers');
