'use strict';
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');
assert.match(html, /function inDragon\(w, s\) \{[\s\S]*?const owner = w\.players\[s\.owner\];[\s\S]*?if \(!owner \|\| !cnt\(owner, 'dragon'\)\) return false;[\s\S]*?return w\.stones\.some\(o => o !== s && live\(o\) && hyp\(o\.x - s\.x, o\.y - s\.y\) < A\.dragonD\);/,
  'only stones owned by a Dragon holder receive the buff; nearby allied or enemy stones qualify the cluster');
assert.match(html, /아군이나 상대 돌이 모이면, 그 범위 안의 내 돌만 무게/,
  'description must clarify that enemy stones count but only own stones receive the buff');
assert.match(html, /내 대마 돌 주변\(아군·상대 포함\).*내 돌 무게/,
  'stat summary must distinguish cluster members from buff recipients');
console.log('v19 dragon owner-only buff checks: PASS');
