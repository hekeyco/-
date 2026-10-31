'use strict';
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');

// Wedge remains visible for exactly as long as the stone's active wedge flag.
assert.match(html, /if \(q\.wedge && q\.owner === pid\) \{ q\.wedge = false; q\.km \/= A\.wedgeM; restat\(w, q\); \}/,
  'wedge must end when its owner begins the next shot');
assert.match(html, /function drawStoneMarks\(w, now\)[\s\S]*?if \(s\.wedge\)[\s\S]*?markBadge\(s\.x \+ s\.r \* 0\.78, s\.y \+ s\.r \* 0\.78, '楔'/,
  'wedge stone must keep its visual badge while active');
assert.match(html, /const wedged = w\.stones\.filter\(s => live\(s\) && s\.owner === p\.id && s\.wedge\)[\s\S]*?쐐기 적용[\s\S]*?다음 내 샷 전까지 유지/,
  'player status must show wedge until the effect ends');

// Lightning is driven by this player's own shot counter, not global turn count.
assert.match(html, /boltEvery:\s*3,\s*boltV:\s*620/);
assert.match(html, /if \(cnt\(p, 'bolt'\)\) \{ w\.boltCount\[pid\]\+\+; bolt = w\.boltCount\[pid\] % A\.boltEvery === 0; \}/,
  'lightning must trigger on each third shot by its owner');
assert.match(html, /const countdown = Math\.max\(1, K\.A\.boltEvery - \(current % K\.A\.boltEvery\)\)/,
  'lightning preview must count 3, 2, 1');
assert.match(html, /번개까지 내 샷', Math\.max\(1, K\.A\.boltEvery - \(\(w\.boltCount\[p\.id\] \|\| 0\) % K\.A\.boltEvery\)\)/,
  'player panel must show remaining own shots');
console.log('v21 wedge/lightning checks: PASS');
console.log(' - wedge badge and status remain active until the owner next shoots');
console.log(' - lightning triggers every third shot by its owner; display counts 3, 2, 1');
