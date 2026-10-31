'use strict';
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const crypto = require('crypto');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');

// Choice cards display the full one-paragraph explanation directly; hovering them has no popup.
assert.match(html, /function cardHTML\([\s\S]*?aug-desc[^\n]*text\.detail/);
assert.match(html, /document\.addEventListener\('mouseover',[\s\S]*?\.aug-line\[data-aug\], \.book li\[data-book-aug\]/);
assert.doesNotMatch(html, /closest\(['"]\.aug-card/);
assert.match(html, /function buildAugTipV22\([\s\S]*?statHTML\(id\)[\s\S]*?text\.detail/);
assert.match(html, /function refreshAugSurfaces\([\s\S]*?desc\.textContent = copy\.detail/);

// Equal, moderate card widths; responsive grid collapses before overflowing.
assert.match(html, /#ovDraft \.ov-card\{width:min\(94vw,960px\);max-width:960px;box-sizing:border-box;overflow-x:hidden\}/);
assert.match(html, /#ovDraft \.cards\.rr\{width:100%;min-width:0;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(html, /#ovDraft \.cards\.rr>\.aug-card\{width:100%;max-width:100%;min-width:0;min-height:360px;height:100%;box-sizing:border-box/);
assert.match(html, /@media\(max-width:760px\)[\s\S]*?#ovDraft \.cards\.rr\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
assert.match(html, /@media\(max-width:520px\)[\s\S]*?#ovDraft \.cards\.rr\{grid-template-columns:1fr/);

// Japanese mode includes all selectable augmentations and the entire draft/awakening path.
const augJaBlock = html.match(/const AUG_JA = \{([\s\S]*?)\n\};\nconst displayAugName/);
assert(augJaBlock, 'Japanese augmentation dictionary must be present');
const jaIds = [...augJaBlock[1].matchAll(/^\s*([A-Za-z0-9_]+):\s*\[/gm)].map(m => m[1]);
assert(jaIds.length >= 62, `expected all 62 selectable augmentations translated, got ${jaIds.length}`);
assert.match(html, /const displayAugName = id => UI_LANG === 'ja'/);
assert.match(html, /const displayTier = tier => UI_LANG === 'ja'/);
assert.match(html, /function renderDraft\([\s\S]*?displayTier\(offer\.tier\)[\s\S]*?displayAugName\(id\)/);
assert.match(html, /function showDecree\([\s\S]*?UI_LANG === 'ja' \? '超越 · 御命'/);
assert.match(html, /function tierReveal\([\s\S]*?UI_LANG === 'ja' \? '<div class="rv-title">超越/);
assert.match(html, /const timerHTML = \(\) =>[\s\S]*?UI_LANG === 'ja' \? '残り時間'/);
assert.match(html, /langObserver\.observe\(document\.body, \{ subtree: true, childList: true, characterData: true, attributes: true/);
assert.match(html, /if \(r\.type === 'characterData' \|\| r\.type === 'attributes'\) translateTree\(r\.target\)/);
assert.match(html, /function miniLabel\([\s\S]*?if \(UI_LANG === 'ja'\) txt = translateJapaneseText\(txt\)/);
assert.doesNotMatch(html.slice(html.indexOf('const { S, GAP, CX, CY'), html.indexOf('const textOriginals')), /\$\{P\.rockHits\}/, 'UI localization code must use the core alias, not an undefined P variable');

// Map summaries, map guide copy, tutorials, and quick-rule text have Japanese entries.
for (const phrase of [
  '障害物のない基本地形です。', '中央の岩は石を弾き', '左右の池に落ちた石は脱落します。',
  '自分が撃つ石の威力です。', '相手の石をすべて盤外へ落とすと勝利です。',
  'クエスト達成者のみ', '強化を選ぶ', '相手の石をすべて盤外へ落とすと勝利です。', '金魚は5手ごとに出現'
]) assert(html.includes(phrase), `Japanese translation missing: ${phrase}`);
assert.match(html, /const statText = value => esc\(String\(value\)\);[\s\S]*?const statTextUI = value => esc\(UI_LANG === 'ja'/);

// Confirm the core still exports the independent keyword/detail values for Japanese and Korean renderers.
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
assert(scripts.length >= 3, 'expected embedded CORE, bridge and UI scripts');
const sandbox = { module: { exports: {} }, console, Math, Date, performance, crypto: crypto.webcrypto };
vm.createContext(sandbox);
vm.runInContext(scripts[1], sandbox, { timeout: 10000 });
const coreIds = sandbox.module.exports.AUG_IDS;
assert.deepStrictEqual([...jaIds].sort(), [...coreIds].sort(), 'every selectable augmentation must have a Japanese name, keyword, and detail');
const wall = sandbox.module.exports.augCopy('wall');
assert.strictEqual(wall.keyword, '우리 돌만 막는 뒤쪽 벽');
assert(wall.detail.length > wall.keyword.length);

// Execute the actual localization helper with the real core data, checking dynamic pick/quest copy.
const uiScript = scripts[2];
const jaStart = uiScript.indexOf('const AUG_JA = {');
const jaEnd = uiScript.indexOf('const textOriginals', jaStart);
assert(jaStart >= 0 && jaEnd > jaStart);
const jaCode = uiScript.slice(jaStart, jaEnd);
const jaBox = { CORE: sandbox.module.exports, console, Math, String, Object, RegExp };
vm.createContext(jaBox);
vm.runInContext(`(() => { const K = CORE; const MAPS = K.MAPS, AUG = K.AUG, TIER = {1:'은',2:'금',3:'옥',4:'초월'}; let UI_LANG='ja'; ${jaCode}; globalThis.__translate = translateJapaneseText; })()`, jaBox, { timeout: 10000 });
for (const [ko, expected] of [
  ['제1국 · 평야', '第1局 · 平野'],
  ['기본 돌을 3개 잃어서 받는 2번째 증강입니다', '基本石を3個失ったため獲得する2枚目の強化です'],
  ['우리 진영 돌 +1', '自陣の石 +1'],
  ['2선승 달성', '2先取 達成'],
  ['퀘스트를 이뤄 받는 옥 증강입니다', 'クエスト達成で獲得する玉ランク強化です']
]) assert.strictEqual(jaBox.__translate(ko), expected, `Japanese dynamic copy mismatch: ${ko}`);
assert(!/[가-힣]/.test(jaBox.__translate('제1국 · 평야')));
console.log('v31 selection layout/Japanese localization checks: PASS');
console.log(` - ${jaIds.length} augmentation names, keywords and details have Japanese versions`);
console.log(' - uniform 3/2/1-column selection cards, no card-hover popup, old hover help retained on lists/guide');
console.log(' - draft, quest/awakening reveal, map guide and tutorial captions translate in Japanese mode');
