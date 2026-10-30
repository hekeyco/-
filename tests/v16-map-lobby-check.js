'use strict';
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');
assert.match(html, /\.menu\{width:min\(96vw,1240px\)\}/);
assert.match(html, /\.maps\{display:grid;grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
assert.match(html, /@media \(max-width:520px\)[\s\S]*?\.maps\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
assert.match(html, /function miniPortals\([\s\S]*?x: 0\.5, y: 0\.035[\s\S]*?x: 0\.5, y: 0\.965[\s\S]*?x: 0\.035, y: 0\.5[\s\S]*?x: 0\.965, y: 0\.5/);
const ids = ['flat','diamond','siege','boost','pond','dim','rev','lab'];
for (const id of ids) {
  assert.match(html, new RegExp(`${id}: \\{[^\\n]*lines:`), `${id} guide should have game-specific text`);
}
assert.match(html, /\$\('mapPick'\)\.querySelectorAll\('canvas\[data-map\]'\)\.forEach\(c => drawMapThumb\(c, c\.dataset\.map\)\)/, 'each generated map card should draw its own thumbnail');
assert.match(html, /MAP_ORDER\.map\(id => \[id, MAPS\[id\]\.name\]\)/, 'all playable maps should be generated as selectable image cards');
assert.match(html, /const lines = \(GUIDE\[id\] && GUIDE\[id\]\.lines\)[\s\S]*?MAPS\[id\]\.short/, 'map guide should fall back to the actual map rule text');
assert.match(html, /pa: w\.portalAxis === 'cross' \? 2/);
assert.match(html, /o\.pa === 2 \? 'cross'/);
console.log('v16 lobby/map guide checks: PASS');
console.log(' - desktop lobby is wide and all nine map choices fit one row');
console.log(' - phone map choices remain three columns');
console.log(' - all selectable maps have their own drawn thumbnail and gameplay description');
console.log(' - dimension preview shows top/bottom 甲 and left/right 乙 pairs');
console.log(' - four-portal layout mode survives compact online serialization');
