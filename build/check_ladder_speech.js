// every spoken-answer ladder item: the spoken answer and the shown choice parse back to the key, and no two choices share a value
global.window = {}; require('../ladder.js'); const MS = require('../mathspeech.js'); const L = window.ASVAB_LADDER;
let n = 0, bad = [];
const val = s => { const v = MS.parseValue(s); return v ? v.n + '/' + v.d : null; };
const key = q => { const [a, b = '1'] = q.value.split('/'); const v = MS.fr(+a, +b); return v.n + '/' + v.d; };
for (const lv of L.levels) for (const set of lv.sets) for (const q of set){
  if (q.mode !== 'say') continue; n++;
  const k = key(q);
  if (val(q.sayAnswer) !== k) bad.push([q.id, 'spoken answer', q.sayAnswer, val(q.sayAnswer), k]);
  if (val(q.choices[q.answer]) !== k) bad.push([q.id, 'choice', q.choices[q.answer], val(q.choices[q.answer]), k]);
  const vs = q.choices.map(val); if (new Set(vs).size !== 4 || vs.includes(null)) bad.push([q.id, 'choice values', q.choices.join(' | ')]);
}
for (const q of L.placement) if (!q.id.startsWith('PLACE-')) bad.push([q.id, 'placement id']);
console.log(JSON.stringify({ sayItems: n, problems: bad.length, first: bad.slice(0, 12) }));
process.exit(bad.length ? 1 : 0);
