/* Arithmetic Reasoning catch-up track (the "math ladder"). Audio-first: questions are spoken, and he answers by
   saying the number ("three fourths", "point five", "x equals 4"). Only the last level (ASVAB bridge) uses A, B, C, D.
   Opening Arithmetic Reasoning comes here until the last level is passed. 8 of 10 right moves you up. */
'use strict';
const LADDER = window.ASVAB_LADDER || { levels:[], placement:[], mastery:8, setSize:10 };
const NLEV = LADDER.levels.length || 1;
const NUM_WORDS = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15,
  sixteen:16, seventeen:17, eighteen:18, nineteen:19, twenty:20, first:1, second:2, third:3, won:1, to:2, too:2, for:4, ate:8 };
function numberIn(t){ const m = String(t).match(/\b(\d{1,2})\b/); if (m) return +m[1];
  const d = MS.wordsToDigits(String(t)).match(/\b(\d{1,2})\b/); if (d && !/\b(to|too|for|won|ate)\b/.test(t.split(' ').find(w => w in NUM_WORDS) || '')) return +d[1];
  const w = String(t).split(/\s+/).find(x => x in NUM_WORDS && !['to','too','for','won','ate'].includes(x)); return w ? NUM_WORDS[w] : null; }
const clampLv = n => Math.min(NLEV, Math.max(1, Math.round(+n) || 1));
function ladState(){
  const raw = Store.get('ladder', {}); let st = Object.assign({ v:3, level:1, placed:false, passed:{}, tries:{}, best:{}, log:[] }, raw);
  if (raw && raw.level && raw.v !== 3){   // saved by the old 15-level ladder: move to the new levels, never upward past what he has shown
    const map = LADDER.oldToNew || {}; const nm = o => map[o] || 1;
    const top = nm(raw.level); const passed = {};
    Object.keys(raw.passed || {}).forEach(k => { const n = nm(+k); if (n < top) passed[n] = true; });
    let lv = top; for (let k = 1; k < top; k++) if (!passed[k]){ lv = k; break; }   // the first new small step he has not done yet
    st = { v:3, level: lv, placed: !!raw.placed, passed, tries:{}, best:{}, log: raw.log || [], migrated:true };
    ladSave(st);
  }
  st.level = clampLv(st.level); return st;
}
function ladSave(s){ s.v = 3; Store.set('ladder', s); }
function ladLevel(n){ return LADDER.levels[clampLv(n) - 1]; }
function arDone(){ return !!ladState().passed[NLEV]; }
let AR_REAL = false;   // he chose "real test questions" for this visit; cleared when he goes home
function ladderFind(t){
  const n = numberIn(t); if (n && n >= 1 && n <= NLEV && /\blevel\b/.test(t)) return n;
  let best = null, bl = 0;
  LADDER.levels.forEach(l => l.keywords.forEach(k => { if (new RegExp('\\b' + k + '\\b').test(t) && k.length > bl){ best = l.n; bl = k.length; } }));
  return best;
}
function arHeader(n){ const L = ladLevel(n); return `Arithmetic Reasoning: Level ${L.n} of ${NLEV}, ${L.title}`; }
function ladderStatusText(){
  const st = ladState(); const L = ladLevel(st.level); const passed = Object.keys(st.passed).length;
  if (st.passed[NLEV]) return `You finished the Arithmetic Reasoning catch-up track: all ${NLEV} levels. Arithmetic Reasoning now uses the real test questions.`;
  return `In Arithmetic Reasoning you are on level ${st.level} of ${NLEV}: ${L.title}. You passed ${passed} level${passed === 1 ? '' : 's'}.`;
}
function arRealCount(){ return (typeof sectionPool === 'function' ? sectionPool('AR') : []).filter(q => !q.custom).length; }
function openRealAR(){ AR_REAL = true; go('practice', 'AR'); }
let LR = null;   // current ladder run
SCREENS.ladder = (arg) => {
  const st = ladState(); const view = clampLv(+arg || st.level); const L = ladLevel(view);
  const passedN = Object.keys(st.passed).length;
  app().innerHTML = `<h1 id="arHead">${esc(arHeader(st.level))}</h1>
  <div class="card" id="ladStatus"><p class="big-word">${esc(st.passed[NLEV] ? ladderStatusText() : `You are on level ${st.level} of ${NLEV}: ${ladLevel(st.level).title}.`)}</p>
    <p>${passedN} level${passedN === 1 ? '' : 's'} passed. Get ${LADDER.mastery} of ${LADDER.setSize} right to move up. You can say your answers, like "three fourths" or "x equals 4".</p>
    ${st.migrated ? '<p>The catch-up track has new, smaller steps now. Your level was moved to match.</p>' : ''}
    ${st.placed ? '' : '<p>New here? Take the placement check. It stops at your first miss.</p>'}</div>
  <div class="card" id="ladView" data-level="${view}"><h2>Level ${view}: ${esc(L.title)}</h2>
    <p>${st.passed[view] ? 'Passed.' : view === st.level ? 'This is your level now.' : ''} ${st.best[view] != null ? `Best: ${st.best[view]} of 10.` : ''}</p>
    <div class="row"><button class="primary" id="ladStart">Start a set (10 questions)</button><button id="ladLesson">Lesson</button></div></div>
  <div class="row"><button id="ladPlace">Placement check</button><button class="small" id="arReal">Real test questions (${arRealCount()})</button></div>
  <h2>All levels</h2><div class="grid">${LADDER.levels.map(l => `<button class="tile ${l.n === view ? 'primary' : ''}" data-lv="${l.n}">Level ${l.n}${st.passed[l.n] ? ' (passed)' : ''}${l.n === st.level ? ' (you)' : ''}<small>${esc(l.title)}</small></button>`).join('')}</div>`;
  $('#ladStart').onclick = () => ladStart(view);
  $('#ladLesson').onclick = () => go('ladlesson', String(view));
  $('#ladPlace').onclick = () => ladStart(0);
  $('#arReal').onclick = openRealAR;
  $$('[data-lv]').forEach(b => b.onclick = () => go('ladder', b.dataset.lv));
};
function lessonStepHTML(b, k){
  if (b.t === 'check') return `<div class="card lad-check"><p><strong>Quick check:</strong> ${wordsHTML(b.q)}</p><details><summary>Show the answer</summary><p>${wordsHTML(b.a + '. ' + b.why)}</p></details></div>`;
  if (b.t === 'h') return `<h3>${wordsHTML(b.x)}</h3>`;
  if (b.t === 'pre') return `<pre class="lad-pre" aria-hidden="true">${esc(b.x)}</pre>`;
  return `<p class="lad-li" data-step="${k}">${wordsHTML(b.x)}</p>`;
}
SCREENS.ladlesson = (arg) => {
  const n = clampLv(+arg || ladState().level); const L = ladLevel(n);
  app().innerHTML = `<h1>Level ${n} lesson: ${esc(L.title)}</h1>
  <div class="row"><button class="primary" id="ladStart">Start a set</button><button onclick="go('ladder','${n}')">Back to Arithmetic Reasoning</button></div>
  <div class="card">${sayBtn('#ladLessonBody', '', 'Read the lesson')}<div id="ladLessonBody">${L.lesson.map(lessonStepHTML).join('')}</div></div>
  <div class="row"><button class="primary" id="ladStart2">Start a set</button></div>`;
  $('#ladStart').onclick = $('#ladStart2').onclick = () => ladStart(n);
};
function ladStart(n){
  const st = ladState(); let qs, label;
  if (!n){ qs = LADDER.placement; label = 'Placement check'; }
  else { const L = ladLevel(n); const set = (st.tries[n] || 0) % L.sets.length; qs = L.sets[set]; label = `Level ${n}, set ${'ABCD'[set]}`; }
  cleanup(); window.scrollTo(0,0);
  LR = { n, qs: qs.map(q => Object.assign({}, q, { label: n ? `Arithmetic Reasoning, level ${n}` : 'Placement check' })), i:0, right:0, results:[], label, used: new Set(qs.map(q => q.id)) };
  history.replaceState(null, '', '#ladder/' + (n || st.level));
  ladRender();
}
const ladIsSay = q => q.mode === 'say';
function ladRender(){
  const q = LR.qs[LR.i]; LR.answered = false; LR.hinted = false;
  const counted = LR.qs.filter(x => !x.extra).length; const pos = LR.qs.slice(0, LR.i + 1).filter(x => !x.extra).length;
  app().innerHTML = `<h1>${esc(LR.label)}: ${q.extra ? 'extra practice' : `question ${pos} of ${counted}`}</h1>${questionHTML(q)}
    ${ladIsSay(q) ? '<p class="say-hint">Say the answer, like "3 fourths" or "12". Or tap it.</p>' : ''}
    <div class="row" id="ladTools"><button class="small" id="ladHint">Hint</button><button class="small" onclick="go('ladder')">End</button></div><div id="hintBox"></div><div id="fb"></div>`;
  $$('.choice').forEach(b => b.onclick = () => ladAnswer(+b.dataset.i));
  $('#ladHint').onclick = () => ladHint();
  if (HF.on) HF.enter('ladq'); else if (settings.autoRead) ladReadQ(q);
}
// spoken questions are read as a question only; the 4 choices are for tapping (A, B, C, D are read at the bridge level)
async function ladReadQ(q){ if (ladIsSay(q)){ await Speech.say(q.say || q.stem); } else await readQuestionAloud(q); }
function ladHint(){
  const q = LR.qs[LR.i]; const first = (q.steps || [])[0];
  const h = LR.hinted ? 'No more hints. Give it your best try.' : 'Hint: ' + (first ? dot(first) : 'Do one step at a time.');
  LR.hinted = true; const s = speakable(h);
  $('#hintBox').innerHTML = `<div class="card"><div class="row" style="align-items:flex-start"><div style="flex:1">${s.html}</div>${sayBtn('#' + s.id)}</div></div>`;
  return h;
}
// a spoken answer: compare the value he said with the key
function ladAnswerSaid(raw){
  if (!LR || LR.answered) return false; const q = LR.qs[LR.i];
  const s = MS.said(raw); if (!s) return false;
  const [a, b = '1'] = String(q.value).split('/'); const key = MS.fr(+a, +b);
  let note = '';
  if (MS.eq(s.v, key)){
    if (q.form === 'simplest' && s.unreduced) note = 'That is the same amount, but it can be simpler.';
    else if (q.form === 'mixed' && key.d !== 1 && s.kind !== 'mixed') note = 'That is the same amount. Say it as a mixed number, like 3 and 1 half.';
    else if (q.form === 'improper' && s.kind === 'mixed') note = 'That is the same amount. Say it as a top-heavy fraction, like 9 fourths.';
    if (!note) return ladAnswer(q.answer, raw), true;
  }
  const hit = q.choices.findIndex(c => { const v = MS.parseValue(c); return v && MS.eq(v, s.v); });
  ladAnswer(note ? -1 : hit, raw, note || (hit < 0 ? `You said ${MS.str(s.v).replace('/', ' over ')}.` : ''));
  return true;
}
function ladAnswer(i, raw, note){
  if (!LR || LR.answered) return; LR.answered = true; const q = LR.qs[LR.i]; const ok = i === q.answer; markChoices(q, i);
  if (!q.extra){ if (ok) LR.right++; LR.results.push({ ok, level:q.level, id:q.id, guess:i, said: raw || '' }); }
  bumpDaily(1);
  const keyTxt = ladIsSay(q) ? q.sayAnswer : `${LET[q.answer]}: ${q.choices[q.answer]}`;
  const head = ok ? 'Right!' : `${note ? note + ' ' : ''}Not yet. The answer is ${dot(keyTxt)}`;
  const why = speakable(head + ' ' + (q.steps || [q.explanation]).join(' '));
  $('#ladTools').classList.add('hidden');
  const last = LR.i + 1 >= LR.qs.length || (!LR.n && !ok);
  $('#fb').innerHTML = `<div class="card feedback ${ok ? 'ok' : 'bad'}"><div class="row" style="align-items:flex-start"><div style="flex:1" class="big-word" id="ladWhy">${why.html}</div>${sayBtn('#' + why.id)}</div>${ok ? '' : `<p>${esc(praise())}</p>`}</div>
    <div class="row"><button class="primary" id="nextBtn">${last ? 'See my score' : 'Next question'}</button><button id="ladSlow">Explain again slower</button><button id="ladMore">Another one like this</button></div>`;
  $('#nextBtn').onclick = ladNext; $('#nextBtn').focus({ preventScroll:true });
  $('#ladSlow').onclick = () => ladExplainSlow(); $('#ladMore').onclick = () => { ladAnotherLike(); };
  if (HF.on) HF.enter('ladfb', why.id); else if (settings.autoRead) Speech.speakEl(document.getElementById(why.id));
}
async function ladExplainSlow(){
  const q = LR && LR.qs[LR.i]; if (!q) return; const old = settings.rate; settings.rate = Math.max(0.5, (Number(old) || 0.9) - 0.25);
  try { for (const s of (q.steps || [q.explanation])) { await Speech.say(s); await sleep(500); } } finally { settings.rate = old; }
}
// one more of the same kind (from another set), as extra practice that does not count toward the score
function ladAnotherLike(){
  if (!LR) return false; const q = LR.qs[LR.i]; const L = ladLevel(q.level);
  const pool = L.sets.flat().filter(x => x.type === q.type && !LR.used.has(x.id)).concat(L.sets.flat().filter(x => !LR.used.has(x.id)));
  const pick = pool[0]; if (!pick) return false;
  LR.used.add(pick.id); LR.qs.splice(LR.i + 1, 0, Object.assign({}, pick, { extra:true, label: LR.qs[LR.i].label }));
  ladNext(); return true;
}
function ladNext(){ if (!LR) return; Speech.stop(); const r = LR.results; if (!LR.n && r.length && !r[r.length - 1].ok) return ladEnd();
  LR.i++; if (LR.i >= LR.qs.length) ladEnd(); else ladRender(); }
function ladEnd(){
  const st = ladState(); const r = LR; let msg;
  if (!r.n){
    const firstWrong = r.results.findIndex(x => !x.ok); const start = firstWrong < 0 ? NLEV : r.qs[firstWrong].level;
    st.level = start; st.placed = true; for (let k = 1; k < start; k++) st.passed[k] = true;
    msg = firstWrong < 0 ? `You got all ${r.qs.length} right. Start at level ${NLEV}: ${ladLevel(NLEV).title}.`
      : `You got ${r.right} right before your first miss. Start at level ${start}: ${ladLevel(start).title}.`;
  } else {
    const n = r.n; st.best[n] = Math.max(st.best[n] ?? 0, r.right); st.log.push({ date:new Date().toISOString(), level:n, right:r.right, total:r.results.length });
    if (r.right >= LADDER.mastery){
      st.passed[n] = true; st.tries[n] = 0; if (n >= st.level) st.level = Math.min(NLEV, n + 1);
      msg = `You got ${r.right} of 10. You passed level ${n}! ` + (n < NLEV ? `Next: level ${n + 1}, ${ladLevel(n + 1).title}.` : 'You finished the whole catch-up track. Arithmetic Reasoning now uses the real test questions.');
    } else {
      st.tries[n] = (st.tries[n] || 0) + 1;
      if (st.tries[n] >= 2 && n > 1){ st.tries[n] = 0; st.level = n - 1; msg = `You got ${r.right} of 10. That is OK. Go back to level ${n - 1} for a quick review. Then try level ${n} again.`; }
      else { st.level = n; msg = `You got ${r.right} of 10. You need ${LADDER.mastery} to move up. Hear the lesson again. Then try the next set.`; }
    }
  }
  ladSave(st); const sum = speakable(msg); const finished = !!st.passed[NLEV] && r.n === NLEV && r.right >= LADDER.mastery;
  app().innerHTML = `<h1>${r.n ? 'Set done' : 'Placement done'}</h1>
    <div class="card"><div class="row"><div class="big-word" style="flex:1" id="ladSum">${sum.html}</div>${sayBtn('#' + sum.id)}</div></div>
    <div class="row">${finished ? `<button class="primary" id="ladRealGo">Real Arithmetic Reasoning practice</button>` : `<button class="primary" id="ladGo">Go to level ${st.level}</button><button id="ladLes">Lesson for level ${st.level}</button>`}<button onclick="go('home')">Home</button></div>`;
  if (finished) $('#ladRealGo').onclick = () => go('practice', 'AR');
  else { $('#ladGo').onclick = () => go('ladder', String(st.level)); $('#ladLes').onclick = () => go('ladlesson', String(st.level)); }
  LR = null; if (HF.on) HF.enter('laddone', { msg, level:st.level, finished });
}
