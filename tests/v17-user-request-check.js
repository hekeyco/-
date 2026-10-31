'use strict';
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');

// Requested numeric changes.
for (const [name, pattern] of [
  ['normal-map shrink limit', /shrinkStart:\s*25,\s*shrinkTurns:\s*11/],
  ['sand friction +25%', /sand:\s*1\.25/],
  ['marks +20%', /markK:\s*1\.20/],
  ['split pieces -20% size and mass', /splitR:\s*0\.8,\s*splitM:\s*0\.8/],
  ['wedge mass -30%', /wedgeM:\s*1\.7/],
  ['thorns 50%', /thorns:\s*0\.50/],
  ['bomb radius 2 tiles', /bombR:\s*2\s*\*\s*GAP/],
  ['thrice +30% force and no hit multiplier', /thriceV:\s*1\.30,\s*thriceK:\s*1\.0/],
  ['unlimited glut, +5% per stat', /glutR:\s*1\.05,\s*glutM:\s*1\.05,\s*glutV:\s*1\.05,\s*glutN:\s*Infinity/],
  ['bounty 8 shots', /bountyN:\s*8/],
  ['crack two breaks', /crackMax:\s*2/],
  ['dragon +100% mass', /dragonM:\s*2\.0/],
  ['tengen +30% defense', /tengenH:\s*1\.3/],
  ['vortex radius 3 tiles and pull 0.5 tile', /vortexR:\s*3\s*\*\s*GAP,\s*vortexPull:\s*0\.5\s*\*\s*GAP/],
  ['territory width 1 tile', /landW:\s*1\s*\*\s*GAP/],
  ['black hole radius 8 and pull 1 tile', /holeR:\s*8\s*\*\s*GAP,\s*holePull:\s*1\s*\*\s*GAP/],
  ['lightning every three of the owner’s shots', /boltEvery:\s*3/],
  ['Pajuk 12-shot window', /pajukTurns:\s*12/]
]) assert.match(html, pattern, `${name} missing`);

// Augments removed from the selectable pool and combinations disabled.
assert(html.includes("const AUG_DISABLED = new Set(['pass', 'grip', 'hammer', 'rewind', 'clone', 'ko', 'yi', 'first']);"));
assert(html.includes('const AUG_IDS = Object.keys(AUG).filter(id => !AUG_DISABLED.has(id));'));
assert(html.includes('const SYN = [];'));
assert(html.includes('const hasSyn = () => false;'));
assert(html.includes('const synBookHTML = () => \'\';'));
assert(html.includes("if (sh && sh.chain && a.team === b.team && a.team !== shT) { jimp *= A.chainK;"));

// Reworked augmentation rules and their concise descriptions.
assert.match(html, /split:\s*\{ name: '분열',[\s\S]*?tier:\s*1/);
assert.match(html, /brand:[\s\S]*?방어력 −25%/);
assert.match(html, /w\.ice = \{ pid: sp\.id, team: t, cells, turns: 2 \}/);
assert.match(html, /teamCount\(w, p\.team\) < 3 \? 2 : A\.revive/);
assert.match(html, /orleans:\s*\{ name: '오를레앙의 최윤재',[\s\S]*?tier:\s*3/);
assert.match(html, /case 'orleans':[\s\S]*?removeAug\(w, p\.id, old, true\)[\s\S]*?grantBonus\(w, p\.id, 4, 'orleans'\)/);
assert.match(html, /case 'decree':[\s\S]*?removeAug\(w, q\.id, old, true\)[\s\S]*?w\.noAug\[q\.id\] = 1/);
assert.match(html, /bundle:[\s\S]*?은·금 증강 3개 무작위 획득/);
assert.match(html, /pillar:[\s\S]*?중앙에 고정 · 매 수 능력치 \+1% \(최대 \+20%\)/);
assert.match(html, /pajuk:[\s\S]*?12수 안에 상대 기본 돌 2개 격파하면 초월 1장/);

// Pillar central lock, linear +1% per counted shot, cap +20%, reverse-map exclusion.
assert.match(html, /best\.pillar = true; best\.locked = true; best\.pg = 0;[\s\S]*?best\.x = CX; best\.y = CY/);
assert.match(html, /p\.pillar && p\.locked && live\(p\) && p\.pg < A\.pillarCap/);
assert.match(html, /p\.pg\+\+/);
assert.match(html, /disabledAugs: \['tengen', 'wall', 'pillar'\]/);

// Lightning is previewed only for the local human; a strike clears every stone in the 3x3 area.
assert.match(html, /function drawLightningPreview\(w, now\)[\s\S]*?localHuman\(p\)[\s\S]*?drawLightningPreview/);
assert.match(html, /const z = lightningZone\(sh\.shooter,[\s\S]*?s\.x >= z\.x0 && s\.x <= z\.x1 && s\.y >= z\.y0 && s\.y <= z\.y1/);

// Progress and normal-map shrink completion are visible; reverse map is handled separately.
assert.match(html, /const progress = G\.world \? G\.world\.shots : 0/);
assert.match(html, /class="turn-count">진행 \$\{progress\}수/);
assert.match(html, /w\.shrink = Math\.min\(smax, w\.shrink \+ smax \/ P\.shrinkTurns\)/);
assert.match(html, /w\.map !== 'rev'/);
assert.match(html, /done \? '맵 줄어듦 끝'/);

// Fish hop path and reduced pickup force are also covered by v15 pond tests.
assert.match(html, /const gain = 0\.10;/);
assert.match(html, /fishStay:\s*1,/);
assert.match(html, /d = h\.r \+ GAP \* \(0\.65 \+ hsh\(seed \+ 1\) \* 0\.8\)/);

// Portal exits keep the original speed bonus but avoid an overlapping center fallback.
assert.match(html, /s\.x = ex; s\.y = ey; s\.vx \*= 1\.2; s\.vy \*= 1\.2/);
assert.match(html, /else \{ s\.ptl = i; return; \} \/\* 안전한 출구가 없으면 겹쳐 놓지 않고/);

// Compact original keywords are shown by default; full descriptions are preserved for hover.
assert.match(html, /const keyword = typeof a\.short === 'function'[\s\S]*?const detail = typeof a\.desc === 'function'[\s\S]*?a\.desc = \(\) => detail;/);
assert(!html.includes('a.desc = a.short'), 'detailed copy must not be overwritten by short keywords');

console.log('v17 user-request checks: PASS');
console.log(' - all specified balance values, disabled augmentations, and synergy removal');
console.log(' - reworked Orleans, decree, bundle, pillar, Pajuk, and fish rules');
console.log(' - progress/shrink status, local lightning preview, portal exits, concise descriptions');
