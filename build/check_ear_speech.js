// every spoken check in the ear lessons: the key value, the spoken answer text, and words a person would say all parse to the same number
global.window = {}; require('../earlessons.js'); const MS = require('../mathspeech.js'); const E = window.ASVAB_EAR;
const v = s => { const x = MS.said(String(s)); return x ? x.v.n + '/' + x.v.d : null; };
let n = 0; const bad = [];
for (const g of ['ei', 'tips']) for (const L of E[g]) for (const s of L.steps){
  if (s.t !== 'check') continue; n++;
  const k = v(s.v); if (!k) { bad.push([L.id, 'key does not parse', s.v]); continue; }
  if (v(s.a) !== k) bad.push([L.id, 'answer text', s.a, v(s.a), k]);
  if (!/Say (the (\w+ )?number|\d+ for)/.test(s.q)) bad.push([L.id, 'check does not ask for a number', s.q]);
}
console.log(JSON.stringify({ checks: n, problems: bad.length, first: bad.slice(0, 10) }));
process.exit(bad.length ? 1 : 0);
