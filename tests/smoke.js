// 증강 알까기 빠른 점검: public/index.html 안의 게임 엔진(CORE)을 꺼내
// 모든 지형에서 CPU끼리 증강을 고르며 끝까지 두어 보고, 오류·멈춤·좌표 깨짐·온라인 동기화 어긋남을 찾습니다.
// 실행: npm test   (판 수 바꾸기: GAMES=10 npm test)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const coreSrc = scripts.find(s => /const CORE = \(\(\) => \{/.test(s));
if (!coreSrc) { console.error('CORE 스크립트를 찾지 못했습니다'); process.exit(1); }
const box = { module: { exports: {} }, console, Math, Date, JSON };
vm.runInNewContext(coreSrc, box, { filename: 'core.js' });
const C = box.module.exports;

const GAMES = Number(process.env.GAMES) || 3, CAP = 160;
const problems = [];
const fail = (map, g, msg) => problems.push(`[${map} #${g}] ${msg}`);
let played = 0, finished = 0;

for (const map of C.MAP_IDS) for (let g = 0; g < GAMES; g++) {
  const pl = [{ id: 0, team: 0, augs: [] }, { id: 1, team: 1, augs: [] }];
  const w = C.newWorld(pl, '1v1', map);
  const pick = q => {
    const of = C.rollOffer(w, q);
    if (!of.ids.length) { w.picks[q]++; return; }
    C.gainAug(w, q, of.ids[Math.floor(Math.random() * of.ids.length)]);
    if (w.dcr && w.dcr[q]) C.resolveDecree(w, q);
  };
  try {
    let q; while ((q = C.pendingPick(w)) !== null) pick(q);
    let cur = Math.random() < 0.5 ? 0 : 1, done = false;
    for (let i = 0; i < CAP && !done; i++) {
      C.unsealIfStuck(w, cur);
      const p = C.cpuPlan(w, pl[cur], { maxCand: 16 });
      if (p.heaven) C.heaven(w, cur);
      C.fire(w, cur, p.id, p.ang, p.pw, p.o);
      C.runShot(w);
      while (w.mark.length) { const mp = w.mark.shift(); const t = C.cpuMark(w, mp); if (t != null) C.markRemove(w, mp, t); }
      for (const s of w.stones) {
        if (!C.live(s)) continue;
        if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) fail(map, g, `돌 좌표가 숫자가 아님 (#${s.id})`);
        if (s.vx || s.vy) fail(map, g, `샷이 끝났는데 돌이 움직임 (#${s.id})`);
      }
      w.events = [];
      const o = C.afterShot(w);
      /* 온라인으로 보내는 상태를 풀었다가 다시 묶어도 같은지 (판 가장자리·구멍 크기) */
      const w2 = C.unpackWorld(JSON.parse(JSON.stringify(C.packWorld(w))), pl);
      if (Math.abs((w.shrink || 0) - (w2.shrink || 0)) > 1e-3 || Math.abs((w.vh || 0) - (w2.vh || 0)) > 1e-3) fail(map, g, `온라인으로 받은 판 크기가 다름 (줄어듦 ${w.shrink} → ${w2.shrink}, 구멍 ${w.vh || 0} → ${w2.vh || 0})`);
      if (o.winner != null) { done = true; finished++; break; }
      let guard = 0; while ((q = C.pendingPick(w)) !== null && guard++ < 12) pick(q);
      if (guard >= 12) fail(map, g, '증강 고르기가 끝나지 않음');
      if (!o.again) cur = 1 - cur;
    }
  } catch (e) { fail(map, g, '오류: ' + (e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e)); }
  played++;
}

console.log(`지형 ${C.MAP_IDS.length}종 × ${GAMES}판 = ${played}판, 승부가 난 판 ${finished}`);
if (problems.length) { console.error([...new Set(problems)].slice(0, 30).join('\n')); process.exit(1); }
console.log('이상 없음');
