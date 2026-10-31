'use strict';
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');

const zones = html.slice(html.indexOf('function drawZones('), html.indexOf('/* ---------- 금붕어 ---------- */'));
if (!zones.includes('const localTeam = viewerTeam();')) throw new Error('zone visibility must use the local viewer perspective');
if (/if\s*\(localTeam\s*!=\s*null\s*&&\s*p\.team\s*!==\s*localTeam\)\s*continue/.test(zones)) throw new Error('opponent-owned zones must also render');
if (!zones.includes("const mine = p.team === localTeam;")) throw new Error('zones need own/opponent visual treatment');
if (!zones.includes('mine ? 0.13') || !zones.includes('mine ? 0.105')) throw new Error('zone overlays should be transparent and stronger for the viewer side');
if (!zones.includes("const localTeam = viewerTeam();") || !zones.includes('const mine = s.team === localTeam;')) throw new Error('active stone badges need viewer-relative emphasis');
if (!zones.includes("mine ? '#d9ae58' : '#625d52'")) throw new Error('own applied stones must be clearer than opponent stones');

// Exercise miniRun with reduced-motion enabled. It must complete the map intro
// callback rather than keeping the lobby trapped in the intro overlay.
const start = html.indexOf('function miniRun(');
if (start < 0) throw new Error('miniRun missing');
let depth = 0, end = -1, opened = false;
for (let i = html.indexOf('{', start); i < html.length; i++) {
  if (html[i] === '{') { depth++; opened = true; }
  if (html[i] === '}') { depth--; if (opened && depth === 0) { end = i + 1; break; } }
}
if (end < 0) throw new Error('miniRun block unterminated');
const fn = html.slice(start, end);
let rafId = 0;
const queue = new Map();
let called = 0, drawnAt = null, tickedAt = null;
const sandbox = {
  reduceMotion: true,
  MN: 300,
  window: { devicePixelRatio: 1 },
  performance: { now: () => 10 },
  requestAnimationFrame: cb => { const id = ++rafId; queue.set(id, cb); return id; },
  cancelAnimationFrame: id => queue.delete(id),
  miniStop: null, called: 0, drawnAt: null, tickedAt: null
};
vm.createContext(sandbox);
vm.runInContext(fn + `\nminiRun({width:0,height:0,getContext:()=>({setTransform(){}})}, {d:4,draw(g,t){globalThis.drawnAt=t},tick(t){globalThis.tickedAt=t}}, ()=>{globalThis.called++}, false);`, sandbox);
if (queue.size !== 1) throw new Error('reduced-motion intro should schedule its initial frame');
const [id, cb] = [...queue.entries()][0]; queue.delete(id); cb(20);
if (sandbox.called !== 1) throw new Error(`reduced-motion intro callback expected once, got ${sandbox.called}`);
if (!(sandbox.drawnAt > 3.9 && sandbox.tickedAt > 3.9)) throw new Error('reduced-motion intro must draw its final frame');
if (queue.size !== 0) throw new Error('reduced-motion intro must stop its animation loop after completion');

console.log('v27 zone visibility / motion startup checks: PASS');
console.log(' - both sides see star, cliff, and dragon effect zones');
console.log(' - the viewer side sees its actually buffed stones more clearly');
console.log(' - reduced-motion map intro completes and releases the lobby flow');
