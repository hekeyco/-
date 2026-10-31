'use strict';
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const crypto = require('crypto');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');

// Preserve the original short keyword and the original long description independently.
const copyStart = html.indexOf('const AUG_COPY = {};');
const disabledStart = html.indexOf('const AUG_DISABLED', copyStart);
assert(copyStart >= 0 && disabledStart > copyStart, 'augmentation copy initialization must exist');
const copyBlock = html.slice(copyStart, disabledStart);
assert.match(copyBlock, /const keyword = typeof a\.short === 'function' \? String\(a\.short\(\)\)/);
assert.match(copyBlock, /const detail = typeof a\.desc === 'function' \? String\(a\.desc\(\)\)/,
  'full descriptions must be captured before replacing the presentation callbacks');
assert.match(copyBlock, /a\.short = \(\) => keyword;\s*a\.desc = \(\) => detail;/);
assert(!copyBlock.includes('a.desc = a.short'), 'do not overwrite detailed descriptions with the short keyword');
assert.match(copyBlock, /AUG_COPY\[id\] = \{ keyword, detail \}/);
assert.match(copyBlock, /keyword: x\.keyword, summary: x\.keyword, keywords: \[\], detail: x\.detail/);

// Selection cards now show the same concise detailed explanation that used to appear on hover.
// Owned augmentation lists and the guide retain the original short keywords.
assert.match(html, /function cardHTML\([\s\S]*?aug-desc[^\n]*text\.detail/);
assert.match(html, /function renderPlayers\(\)[\s\S]*?aug-summary[^\n]*text\.keyword/);
assert.match(html, /const bookQuick = id =>[\s\S]*?book-quick[^\n]*text\.keyword/);
assert.match(html, /<li data-book-aug="\$\{id\}"/);

// Hover help follows the concise v22 layout: colored effect rows plus one detail paragraph.
assert.match(html, /function buildAugTipV22\([\s\S]*?statHTML\(id\)[\s\S]*?text\.detail/);
assert.match(html, /function showAugTip\([\s\S]*?buildAugTipV22\(id, owner\)/);
assert(!html.includes('tip-keyword'), 'the long gold keyword panel must be removed');
assert.match(html, /\.st-up\{color:#bfecc6/);
assert.match(html, /\.st-foe\{color:#c9dcff/);
assert.match(html, /\.st-down\{color:#ffc2b5/);
assert.match(html, /document.addEventListener\('mouseover',[\s\S]*?\.aug-line\[data-aug\], \.book li\[data-book-aug\]/);
assert.doesNotMatch(html, /closest\(['\"]\.aug-card/);
assert.match(html, /\.aug-tip \.stats\{margin:4px 0 6px\}/);

// Retain concrete concise copy in the user's reference example.
assert.match(html, /wall:\s*\{ name: '철벽'[\s\S]*?short: \(\) => '우리 돌만 막는 뒤쪽 벽'/);
assert.match(html, /pierce:\s*\{ name: '굳건'[\s\S]*?short: \(\) => '첫 타격에 힘을 모두 실음 · 쏜 돌은 멈춤'/);

// Execute the real CORE script: keyword and detail must be different preserved values.
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
assert(scripts.length >= 3, 'expected the embedded CORE script');
const sandbox = { module: { exports: {} }, console, Math, Date, performance, crypto: crypto.webcrypto };
vm.createContext(sandbox);
vm.runInContext(scripts[1], sandbox, { timeout: 10000 });
const coreCopy = sandbox.module.exports.augCopy;
const wall = coreCopy('wall'), pierce = coreCopy('pierce');
assert.strictEqual(wall.keyword, '우리 돌만 막는 뒤쪽 벽');
assert(wall.detail.includes('고무벽이 생겨') && wall.detail.length > wall.keyword.length,
  'Wall hover must retain its complete original detail');
assert.strictEqual(pierce.keyword, '첫 타격에 힘을 모두 실음 · 쏜 돌은 멈춤');
assert(pierce.detail.includes('힘을 모두 실어 보내고') && pierce.detail.length > pierce.keyword.length,
  'Pierce hover must retain its complete original detail');
console.log('v29 augment keyword/tooltip checks: PASS');
console.log(' - full concise detail shown in selection cards; short original keywords retained in owned lists and the guide');
console.log(' - hover matches v22: tier/name, green/blue/red effect chips and one detail line');
