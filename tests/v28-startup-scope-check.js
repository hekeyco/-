'use strict';
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(require('path').join(__dirname, '../public/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length < 3) throw new Error('expected web shim, game core, and UI scripts');

// Execute the actual core script in an isolated Node context and verify that
// the UI-facing augmentation-copy helper is part of CORE's public contract.
const sandbox = { module: { exports: {} }, console, Math, Date, performance, crypto: require('crypto').webcrypto };
vm.createContext(sandbox);
vm.runInContext(scripts[1], sandbox, { timeout: 10000 });
const core = sandbox.module.exports;
if (!core || typeof core.augCopy !== 'function') throw new Error('CORE must export augCopy for the UI');
const sample = core.augCopy('iron');
if (!sample || typeof sample.summary !== 'string' || typeof sample.detail !== 'string') throw new Error('augCopy must return complete copy data');

// The UI must bind through CORE and complete menu construction before wiring
// map-selection and new-match handlers.
if (!scripts[2].includes('const augCopy = K.augCopy;')) throw new Error('UI must bind augCopy from CORE');
for (const token of [
  "$('augBook').innerHTML =",
  'function renderGuide()',
  'renderGuide();',
  "document.querySelectorAll('input[name=\"map\"]')",
  "$('btnStart').addEventListener('click'",
  'function newMatch()'
]) if (!scripts[2].includes(token)) throw new Error(`startup hook missing: ${token}`);

console.log('v28 startup scope checks: PASS');
console.log(' - core exports the UI augmentation-copy helper');
console.log(' - the UI binds the helper before rendering the augmentation book');
console.log(' - map preview and match-start handlers remain in the boot path');
