'use strict';
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');

// Startup regression: constants interpolated by first-screen summaries must
// be initialized before the summary templates are evaluated (TDZ protection).
const turnDecl = html.indexOf('const TURN_SEC = 30;');
const pickDecl = html.indexOf('const PICK_SEC = 60;');
const ruleSummary = html.indexOf('const RULE_SUM = [');
assert(turnDecl >= 0 && pickDecl >= 0 && ruleSummary >= 0, 'startup constants and rule summary must exist');
assert(turnDecl < ruleSummary, 'TURN_SEC must be initialized before RULE_SUM interpolates it');
assert(pickDecl < ruleSummary, 'PICK_SEC must be initialized before rule rendering');
assert.strictEqual((html.match(/const TURN_SEC = 30;/g) || []).length, 1, 'TURN_SEC must have one declaration');
assert.strictEqual((html.match(/const PICK_SEC = 60;/g) || []).length, 1, 'PICK_SEC must have one declaration');

// The map chooser and guide must still be populated during startup.
assert.match(html, /\$\('mapPick'\)\.innerHTML\s*=\s*\[\.\.\.MAP_ORDER\.map/);
assert.match(html, /\$\('mapPick'\)\.querySelectorAll\('canvas\[data-map\]'\)\.forEach/);
assert.match(html, /renderGuide\(\);/);

console.log('v20 startup checks: PASS');
console.log(' - no TURN_SEC/PICK_SEC temporal-dead-zone during startup');
console.log(' - map thumbnails and guide are initialized');
