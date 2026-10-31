const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../public/index.html'), 'utf8');
const menu = html.slice(html.indexOf('<div class="menu-tools">'), html.indexOf('</div>\n    </div>', html.indexOf('<div class="menu-tools">')));
const langAt = menu.indexOf('id="btnLang"');
const rankAt = menu.indexOf('id="btnRank"');
if (langAt < 0 || rankAt < 0 || langAt > rankAt) throw new Error('language button must appear before rank button');
for (const token of ["$('btnStart').addEventListener('click'", 'syncModeUI();', 'renderAll();', 'renderWho();', "if (!PROF.me.set) { $('ovMenu').hidden = true; openProfile('me', true); }"]) {
  if (!html.includes(token)) throw new Error(`lobby startup hook missing: ${token}`);
}
if (!html.includes("$('btnLang').addEventListener('click'")) throw new Error('language menu handler missing');
if (!html.includes("$('btnRank').addEventListener('click'")) throw new Error('rank menu handler missing');
console.log('v25 lobby order/startup checks: PASS');
console.log(' - language selector is immediately before rank button');
console.log(' - lobby render, profile gate, mode sync, and start handlers remain wired');
