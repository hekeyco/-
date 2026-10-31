'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const styleBlocks = [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
assert.strictEqual(styleBlocks.length, 2, 'Expected two style blocks');
const css = styleBlocks[1];

// Preserve the uploaded UI base while allowing responsive lobby/map-selection updates.
assert.match(css, /\.menu\{width:min\(96vw,1240px\)\}/, 'Desktop lobby must widen without changing its visual theme');
assert.match(css, /\.maps\{display:grid;grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/, 'Desktop map cards must fit in one row');
assert.match(css, /@media\s*\(min-width:\s*861px\)[\s\S]*?max-width:\s*1600px/,
  'Desktop header and stage must widen to 1600px');
assert.match(css, /@media\s*\(max-width:\s*860px\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  'Narrow screens must preserve the single-column layout');
assert.match(css, /@media\s*\(max-width:\s*520px\)[\s\S]*?quick-rule\s*\{\s*grid-template-columns:\s*1fr/,
  'Compact quick rules must fit phone widths');
assert(!html.includes('function showBookAugTip('), 'book must not open a second hover explanation');
assert(!html.includes('function augTipHTML('), 'owned augment list must not open a second detail popup');
assert.match(html, /const augCopy = id =>/, 'single-line augmentation summaries must be available');
assert.match(html, /function resize\(\)[\s\S]*?Math\.min\(side, W\)/,
  'Board size must remain constrained by available height and width');

console.log('v14 layout checks: PASS');
console.log(' - uploaded UI theme retained with a wider desktop lobby and one-row map cards');
console.log(' - desktop-only width expansion to 1600px');
console.log(' - single-column responsive layout below 861px');
console.log(' - phone-friendly quick-rules layout');
console.log(' - single-pass augmentation descriptions and height-limited board sizing');
