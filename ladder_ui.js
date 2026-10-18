/* Math ladder: the 15-level catch-up track from the study pack (06_catchup).
   It builds the math under Arithmetic Reasoning (AR) and Math Knowledge (MK). 8 of 10 right moves you up. */
'use strict';
const LADDER = window.ASVAB_LADDER || { levels:[], placement:[], mastery:8, setSize:10 };
const NUM_WORDS = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, first:1, second:2, third:3, won:1, to:2, too:2, for:4, ate:8 };
function numberIn(t){ const m = String(t).match(/\b(\d{1,2})\b/); if (m) return +m[1];
  const w = String(t).split(/\s+/).find(x => x in NUM_WORDS && !['to','too','for','won','ate'].includes(x)); return w ? NUM_WORDS[w] : null; }
function ladState(){ return Object.assign({ level:1, placed:false, passed:{}, tries:{}, best:{}, log:[] }, Store.get('ladder', {})); }
function ladSave(s){ Store.set('ladder', s); }
function ladLevel(n){ return LADDER.levels[Math.min(15, Math.max(1, n)) - 1]; }
function ladderFind(t){
  const n = numberIn(t); if (n && n >= 1 && n <= 15 && /\blevel\b/.test(t)) return n;
  let best = null, bl = 0;
  LADDER.levels.forEach(l => l.keywords.forEach(k => { if (new RegExp('\\b' + k + '\\b').test(t) && k.length > bl){ best = l.n; bl = k.length; } }));
  return best;
}
function ladderStatusText(){
  const st = ladState(); const L = ladLevel(st.level); const passed = Object.keys(st.passed).length;
  return `On the math ladder you are on level ${st.level} of 15: ${L.title}. You passed ${passed} level${passed === 1 ? '' : 's'}.`;
}
let LR = null;   // current ladder run
SCREENS.ladder = (arg) => {
  const st = ladState(); const view = Math.min(15, Math.max(1, +arg || st.level)); const L = ladLevel(view);
  const passedN = Object.keys(st.passed).length;
  app().innerHTML = `<h1>Math ladder</h1>
  <div class="card" id="ladStatus"><p class="big-word">You are on level ${st.level} of 15: ${esc(ladLevel(st.level).title)}.</p>
    <p>${passedN} level${passedN === 1 ? '' : 's'} passed. Get ${LADDER.mastery} of ${LADDER.setSize} right to move up.</p>
    <p>This ladder builds the math under Arithmetic Reasoning and Math Knowledge.</p>
    ${st.placed ? '' : '<p>New here? Take the placement check first. It has 15 questions.</p>'}</div>
  <div class="card" id="ladView" data-level="${view}"><h2>Level ${view}: ${esc(L.title)}</h2>
    <p>${st.passed[view] ? 'Passed.' : view === st.level ? 'This is your level now.' : ''} ${st.best[view] != null ? `Best: ${st.best[view]} of 10.` : ''}</p>
    <div class="row"><button class="primary" id="ladStart">Start a set (10 questions)</button><button id="ladLesson">Read the lesson</button></div></div>
  <div class="row"><button id="ladPlace">Placement check</button></div>
  <h2>All levels</h2><div class="grid">${LADDER.levels.map(l => `<button class="tile ${l.n === view ? 'primary' : ''}" data-lv="${l.n}">Level ${l.n}${st.passed[l.n] ? ' (passed)' : ''}${l.n === st.level ? ' (you)' : ''}<small>${esc(l.title)}</small></button>`).join('')}</div>`;
  $('#ladStart').onclick = () => ladStart(view);
  $('#ladLesson').onclick = () => go('ladlesson', String(view));
  $('#ladPlace').onclick = () => ladStart(0);
  $$('[data-lv]').forEach(b => b.onclick = () => go('ladder', b.dataset.lv));
};
function ladLessonHTML(L){
  return L.lesson.map(b => b.t === 'h' ? `<h3>${wordsHTML(b.x)}</h3>` : b.t === 'li' ? `<p class="lad-li"><span aria-hidden="true">&#8226; </span>${wordsHTML(b.x)}</p>`
    : b.t === 'pre' ? `<pre class="lad-pre" aria-hidden="true">${esc(b.x)}</pre>` : `<p>${wordsHTML(b.x)}</p>`).join('');
}
SCREENS.ladlesson = (arg) => {
  const n = Math.min(15, Math.max(1, +arg || ladState().level)); const L = ladLevel(n);
  app().innerHTML = `<h1>Level ${n}: ${esc(L.title)}</h1>
  <div class="row"><button class="primary" id="ladStart">Start a set</button><button onclick="go('ladder','${n}')">Back to the ladder</button></div>
  <div class="card">${sayBtn('#ladLessonBody', '', 'Read the lesson')}<div id="ladLessonBody">${ladLessonHTML(L)}</div></div>
  <div class="row"><button class="primary" id="ladStart2">Start a set</button></div>`;
  $('#ladStart').onclick = $('#ladStart2').onclick = () => ladStart(n);
};
function ladStart(n){
  const st = ladState(); let qs, label;
  if (!n){ qs = LADDER.placement; label = 'Placement check'; }
  else { const L = ladLevel(n); const set = (st.tries[n] || 0) % L.sets.length; qs = L.sets[set]; label = `Level ${n}, set ${'ABCD'[set]}`; }
  cleanup(); window.scrollTo(0,0);
  LR = { n, qs: qs.map(q => Object.assign({}, q, { label: n ? `Math ladder, level ${n}` : 'Placement check' })), i:0, right:0, results:[], label };
  history.replaceState(null, '', '#ladder/' + (n || st.level));
  ladRender();
}
function ladRender(){
  const q = LR.qs[LR.i]; LR.answered = false; LR.hinted = false;
  app().innerHTML = `<h1>${esc(LR.label)}: question ${LR.i + 1} of ${LR.qs.length}</h1>${questionHTML(q)}
    <div class="row" id="ladTools"><button class="small" id="ladHint">Hint</button><button class="small" onclick="go('ladder')">End</button></div><div id="hintBox"></div><div id="fb"></div>`;
  $$('.choice').forEach(b => b.onclick = () => ladAnswer(+b.dataset.i));
  $('#ladHint').onclick = () => ladHint();
  if (HF.on) HF.enter('ladq'); else if (settings.autoRead) readQuestionAloud(q);
}
function ladHint(){
  const q = LR.qs[LR.i]; const L = ladLevel(q.level);
  const rule = (L.lesson.find(b => b.t === 'li' && b.x.length > 12) || {}).x;
  const h = LR.hinted ? 'No more hints. Give it your best try.' : 'Hint: Read it again slowly. Do one step at a time.' + (rule ? ' Remember: ' + dot(rule) : '');
  LR.hinted = true; const s = speakable(h);
  $('#hintBox').innerHTML = `<div class="card"><div class="row" style="align-items:flex-start"><div style="flex:1">${s.html}</div>${sayBtn('#' + s.id)}</div></div>`;
  return h;
}
function ladAnswer(i){
  if (!LR || LR.answered) return; LR.answered = true; const q = LR.qs[LR.i]; const ok = i === q.answer; markChoices(q, i);
  if (ok) LR.right++; LR.results.push({ ok, level:q.level, id:q.id, guess:i }); bumpDaily(1);
  const head = ok ? 'Right!' : `Not yet. The answer is ${LET[q.answer]}: ${dot(q.choices[q.answer])}`;
  const why = speakable(head + ' ' + q.explanation);
  $('#ladTools').classList.add('hidden');
  $('#fb').innerHTML = `<div class="card feedback ${ok ? 'ok' : 'bad'}"><div class="row" style="align-items:flex-start"><div style="flex:1" class="big-word" id="ladWhy">${why.html}</div>${sayBtn('#' + why.id)}</div>${ok ? '' : `<p>${esc(praise())}</p>`}</div>
    <div class="row"><button class="primary" id="nextBtn">${LR.i + 1 < LR.qs.length ? 'Next question' : 'See my score'}</button></div>`;
  $('#nextBtn').onclick = ladNext; $('#nextBtn').focus({ preventScroll:true });
  if (HF.on) HF.enter('ladfb', why.id); else if (settings.autoRead) Speech.speakEl(document.getElementById(why.id));
}
function ladNext(){ if (!LR) return; Speech.stop(); LR.i++; if (LR.i >= LR.qs.length) ladEnd(); else ladRender(); }
function ladEnd(){
  const st = ladState(); const r = LR; let msg;
  if (!r.n){
    const firstWrong = r.results.findIndex(x => !x.ok); const start = firstWrong < 0 ? 15 : r.qs[firstWrong].level;
    st.level = start; st.placed = true; for (let k = 1; k < start; k++) st.passed[k] = true;
    msg = firstWrong < 0 ? `You got all 15 right. Start at level 15: ${ladLevel(15).title}.`
      : `You got ${r.right} of 15. Your first miss was question ${firstWrong + 1}. Start at level ${start}: ${ladLevel(start).title}.`;
  } else {
    const n = r.n; st.best[n] = Math.max(st.best[n] ?? 0, r.right); st.log.push({ date:new Date().toISOString(), level:n, right:r.right, total:r.qs.length });
    if (r.right >= LADDER.mastery){
      st.passed[n] = true; st.tries[n] = 0; if (n >= st.level) st.level = Math.min(15, n + 1);
      msg = `You got ${r.right} of 10. You passed level ${n}! ` + (n < 15 ? `Next: level ${n + 1}, ${ladLevel(n + 1).title}.` : 'You finished the whole ladder. Now drill Arithmetic Reasoning and Math Knowledge.');
    } else {
      st.tries[n] = (st.tries[n] || 0) + 1;
      if (st.tries[n] >= 2 && n > 1){ st.tries[n] = 0; st.level = n - 1; msg = `You got ${r.right} of 10. That is OK. Go back to level ${n - 1} for a quick review. Then try level ${n} again.`; }
      else { st.level = n; msg = `You got ${r.right} of 10. You need ${LADDER.mastery} to move up. Read the lesson again. Then try the next set.`; }
    }
  }
  ladSave(st); const sum = speakable(msg);
  app().innerHTML = `<h1>${r.n ? 'Set done' : 'Placement done'}</h1>
    <div class="card"><div class="row"><div class="big-word" style="flex:1" id="ladSum">${sum.html}</div>${sayBtn('#' + sum.id)}</div></div>
    <div class="row"><button class="primary" id="ladGo">Go to level ${st.level}</button><button id="ladLes">Lesson for level ${st.level}</button><button onclick="go('home')">Home</button></div>`;
  $('#ladGo').onclick = () => go('ladder', String(st.level)); $('#ladLes').onclick = () => go('ladlesson', String(st.level));
  LR = null; if (HF.on) HF.enter('laddone', { msg, level:st.level });
}
