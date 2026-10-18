/* ASVAB Coach 2.3 features: weekly test + score goal, today's plan, real-test reading passages,
   electronics by ear, test-day tips, and daily reminders. Loads after audio.js and before handsfree.js. */
'use strict';
const EXTRA_VCTX = {};
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const dayStart = d => { const x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); };
const daysSince = iso => Math.round((dayStart(new Date()) - dayStart(new Date(iso))) / 864e5);

/* ======================= 1. Weekly practice test + score goal ======================= */
// A short MEPS-style mix: the real CAT counts x 0.4 (rounded), same time per question as the real test.
const WEEKLY = Object.fromEntries(MEPS_ORDER.map(k => { const [n, min] = CAT[k]; const w = Math.max(4, Math.round(n * 0.4)); return [k, [w, Math.round(min * w / n * 10) / 10]]; }));
const weeklyTotal = () => MEPS_ORDER.reduce((a, k) => a + WEEKLY[k][0], 0);
const weeklyMinutes = () => Math.round(MEPS_ORDER.reduce((a, k) => a + WEEKLY[k][1], 0));
function weeklyHist(){ return Store.get('weekly', []); }
function weeklyDay(){ return settings.weeklyDay == null ? 0 : +settings.weeklyDay; }
function weeklyDue(now = new Date()){
  const L = weeklyHist(); const last = L[L.length - 1]; if (!last) return true;
  const d = daysSince(last.date); if (d >= 7) return true;
  return now.getDay() === weeklyDay() && d >= 4;
}
function weeklyNudge(){ return weeklyDue() && Store.get('weeklySnooze', '') !== today(); }
function weeklyStart(){ M = { running:true, part:0, res:{}, log:[], kind:'weekly', order:MEPS_ORDER, counts:WEEKLY }; mepsIntro(); }
function weeklyChartSVG(list){
  const a = list.slice(-8); if (!a.length) return '<p>No weekly tests yet.</p>';
  const W = 640, H = 260, P = 44, max = 300, y = v => H - P - (H - 2*P) * Math.min(v, max) / max, bw = (W - 2*P) / a.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Weekly IT line score estimates for the last ${a.length} weeks">`;
  [[212,'#003A8C'],[156,'#7A4E00']].forEach(([v, c]) => { s += `<line x1="${P}" x2="${W-P}" y1="${y(v)}" y2="${y(v)}" stroke="${c}" stroke-width="2" stroke-dasharray="8 5"/><text x="${W-P+4}" y="${y(v)+5}" font-size="15" fill="${c}">${v}</text>`; });
  a.forEach((t, i) => { const x = P + i*bw + bw*0.1, w = bw*0.38, d = new Date(t.date);
    [[t.it212,'#003A8C',0],[t.it156,'#B07800',1]].forEach(([v, c, j]) => { const yy = y(v || 0); s += `<rect x="${x + j*w}" y="${yy}" width="${w*0.92}" height="${Math.max(1, H-P-yy)}" fill="${c}"/><text x="${x + j*w + w*0.46}" y="${yy-5}" text-anchor="middle" font-size="14" font-weight="bold">${v ?? ''}</text>`; });
    s += `<text x="${x + w}" y="${H-P+20}" text-anchor="middle" font-size="14">${d.getMonth()+1}/${d.getDate()}</text>`; });
  return s + `</svg><p>Blue bars: main IT rule (AR + MK + EI + VE), goal 212. Gold bars: other IT rule (VE + MK + GS), goal 156. Dashed lines are the goals. Oldest week on the left.</p>`;
}
function weeklySummary(h, prev){
  const need = (v, goal) => v >= goal ? 'That meets the line. Keep a cushion.' : `About ${goal - v} points still needed.`;
  const f = h.focus.map(k => SECTIONS[k]);
  let ch = 'This is your first weekly test.';
  if (prev && prev.it212 != null){ const d = h.it212 - prev.it212; ch = d > 0 ? `The main rule is up ${d} points from last time.` : d < 0 ? `The main rule is down ${-d} points from last time. That happens. Keep going.` : 'The main rule is the same as last time.'; }
  return `Weekly test done. You got ${h.right} of ${h.total}. Main IT rule, AR plus MK plus EI plus VE: about ${h.it212} of 212. ${need(h.it212, 212)} Other IT rule, VE plus MK plus GS: about ${h.it156} of 156. ${need(h.it156, 156)} ${ch} Focus this week: ${f[0]} and ${f[1]}. Estimate only. Confirm with a recruiter.`;
}
function weeklyReport(){
  M.running = false; const res = M.res; const e = estimates(res); const S2 = e.S;
  const right = Object.values(res).reduce((a, r) => a + r.right, 0), total = Object.values(res).reduce((a, r) => a + r.total, 0);
  const hist = weeklyHist(); const prev = hist[hist.length - 1];
  const h = { date:new Date().toISOString(), res, S:S2, it212: S2.AR + S2.MK + S2.EI + S2.VE, it156: S2.VE + S2.MK + S2.GS, afqt:e.afqt, right, total, focus: itFocus(e).slice(0, 2).map(o => o.k) };
  hist.push(h); Store.set('weekly', hist.slice(-52)); Store.set('weeklySnooze', '');
  const sum = speakable(weeklySummary(h, prev));
  app().innerHTML = `<h1>Weekly test: score report</h1>
  <div class="card"><div class="row"><div class="big-word" style="flex:1" id="wkSum">${sum.html}</div>${sayBtn('#'+sum.id)}</div>
    <p class="notice"><strong>Estimate only, confirm with a recruiter.</strong></p></div>
  <div class="card" id="wkGoal"><h2>Score goal</h2>
    <p>Main rule: about <strong>${h.it212}</strong> of 212. ${h.it212 >= 212 ? 'Meets the line.' : `Still need about <strong>${212 - h.it212}</strong>.`}</p>
    <p>Other rule: about <strong>${h.it156}</strong> of 156. ${h.it156 >= 156 ? 'Meets the line.' : `Still need about <strong>${156 - h.it156}</strong>.`}</p></div>
  <div class="card" id="wkChart"><h2>Week by week</h2>${weeklyChartSVG(hist)}</div>
  <div class="card" id="wkFocus"><h2>Focus this week</h2><ol class="focus-list">${h.focus.map(k => `<li data-sec="${k}"><strong>${SECTIONS[k]}</strong> (est. ${S2[k]})</li>`).join('')}</ol>
    <div class="row">${h.focus.map((k, i) => `<button class="${i ? '' : 'primary'}" data-wf="${k}">Practice ${SECTIONS[k]}</button>`).join('')}</div></div>
  <div class="card"><table><tr><th>Part</th><th>Right</th><th>Est. score</th></tr>
  ${MEPS_ORDER.map(k => `<tr><td>${SECTIONS[k]}</td><td>${res[k].right} of ${res[k].total}${res[k].answered < res[k].total ? ` (${res[k].total - res[k].answered} not answered, scored as random guesses)` : ''}</td><td>${S2[k]}</td></tr>`).join('')}
  <tr><td>VE (WK + PC)</td><td></td><td>${S2.VE}</td></tr></table></div>
  ${itPanelHTML(e, 'from this weekly test')}
  <div class="row"><button onclick="go('review')">Go over my misses</button><button onclick="go('progress')">My progress</button><button onclick="go('home')">Home</button></div>`;
  $$('[data-wf]').forEach(b => b.onclick = () => go('practice', b.dataset.wf));
  M = null;
  if (HF.on) HF.enter('weeklyreport', h.focus); else Speech.speakEl($('#wkSum'));
}
SCREENS.weekly = () => {
  const hist = weeklyHist(); const last = hist[hist.length - 1];
  app().innerHTML = `<h1>Weekly practice test</h1>
  <div class="card"><p class="big-word">${weeklyTotal()} questions. About ${weeklyMinutes()} minutes.</p>
    <p>A short version of the real test: the same 6 parts, in the same order, in the same mix. Same time per question as the real test.</p>
    <table><tr><th>Part</th><th>Questions</th><th>Minutes</th></tr>${MEPS_ORDER.map(k => `<tr><td>${SECTIONS[k]}</td><td>${WEEKLY[k][0]}</td><td>${WEEKLY[k][1]}</td></tr>`).join('')}</table>
    <p>No hints. No going back. Answer every question.</p>
    <p>${last ? `Last weekly test: ${new Date(last.date).toLocaleDateString()}, main IT rule about ${last.it212} of 212.` : 'You have not taken one yet.'} ${weeklyDue() ? 'It is due now.' : `Next one: ${DAYS[weeklyDay()]}.`}</p></div>
  ${hist.length ? `<div class="card"><h2>Week by week</h2>${weeklyChartSVG(hist)}</div>` : ''}
  <div class="row"><button class="primary" id="wStart">Start the weekly test</button><button onclick="go('home')">Not now</button></div>
  <p><small>Estimate only, confirm with a recruiter.</small></p>`;
  $('#wStart').onclick = weeklyStart;
};
function weeklyNudgeHTML(){
  if (!weeklyNudge()) return '';
  return `<div class="card nudge" id="weeklyNudge"><p class="big-word">Your weekly test is due.</p><p>${weeklyTotal()} questions, about ${weeklyMinutes()} minutes. It shows how close you are to 212.</p>
    <div class="row"><button class="primary" id="wnStart">Start weekly test</button><button id="wnLater">Not today</button></div></div>`;
}
Object.assign(EXTRA_VCTX, {
  weekly: {
    help: 'Say start the test to begin the weekly test. Say home to leave.',
    async intro(){ await Speech.say(`Weekly practice test. ${weeklyTotal()} questions in 6 parts, about ${weeklyMinutes()} minutes. Real time pressure, scaled down. No hints and no going back. Answer every question. Say start the test, or home.`); },
    async handle(t){ if (isGo(t, ['start weekly test', 'start the weekly test'])){ weeklyStart(); return true; } return false; },
  },
  weeklyreport: {
    help: 'Say practice and a section name, review misses, progress, or home. Say repeat to hear the report again.',
    async intro(alive){ await sayEl('#wkSum'); if (!alive()) return;
      const panel = $('#itPanel'); if (panel) for (const el of $$('h3, p', panel)){ if (!alive()) return; if (el.closest('.notice')) continue; await Speech.say(textOf(el)); }
      if (alive()) await Speech.say('Estimate only. Confirm with a recruiter. Say practice and a section name, review misses, or home.'); },
    async handle(t, all, raw, focus){
      if (focus && anyOf(t, ['focus one', 'first focus', 'practice the first one', 'practice focus'])){ go('practice', focus[0]); return true; }
      if (focus && anyOf(t, ['focus two', 'second focus', 'practice the second one'])){ go('practice', focus[1]); return true; }
      return false; },
  },
});

/* ======================= 2. Today's plan: 10 minutes ======================= */
let PLAN = null;
function planOptions(){
  const out = []; const st = ladState();
  if (!arDone()) out.push({ kind:'ladder', level: st.level });
  for (const o of itFocus(practiceEstimates())){ if (o.k === 'AR' && !arDone()) continue; out.push({ kind:'sec', sec:o.k }); }
  return out;
}
function planPick(alt = 0){ const o = planOptions(); return o[alt % o.length]; }
function planName(p){ return p.kind === 'ladder' ? `Arithmetic Reasoning catch-up, level ${p.level}: ${ladLevel(p.level).title}` : SECTIONS[p.sec]; }
function planLesson(p){
  if (p.kind === 'ladder'){ const L = ladLevel(p.level); const lines = [`Level ${L.n} lesson: ${L.title}.`];
    for (const b of L.lesson){ if (b.t === 'check'){ lines.push(`Think about this one. ${b.q}`); lines.push(`The answer is ${b.a}. ${b.why}`); } else if (b.t === 'say' || b.t === 'li' || b.t === 'p') lines.push(b.x); }
    return { title:`Level ${L.n}: ${L.title}`, lines: lines.slice(0, 14) }; }
  if (p.sec === 'EI'){ const t = weakTopic('EI'); const E = (window.ASVAB_EAR || {}).ei || [];
    const L = E.find(l => (l.topics || []).includes(t)) || E[Object.keys(Store.get('plans', {})).length % Math.max(1, E.length)];
    if (L) return { title:'Electronics by ear: ' + L.title, lines: [L.title + '.'].concat(earLines(L)) }; }
  const t = weakTopic(p.sec) || Object.keys(LESSONS).find(k => LESSONS[k].section === p.sec); const L = LESSONS[t];
  if (!L) return { title:SECTIONS[p.sec], lines:[`Today: ${SECTIONS[p.sec]}.`] };
  return { title:L.name, topic:t, lines: [`Lesson: ${L.name}.`].concat(L.what, [`Why it matters: ${L.why}`, `The rule: ${L.idea}`, 'Worked example.'], L.worked).filter(Boolean) };
}
function earLines(L){ const out = []; for (const b of L.steps){ if (b.t === 'check'){ out.push(`Think about this one. ${b.q}`); out.push(`The answer is ${b.a}. ${b.why}`); } else out.push(b.x); } return out; }
function plansDone(){ return Store.get('plans', {}); }
SCREENS.plan = (arg) => {
  if (!PLAN || arg === 'new') PLAN = { stage:'pick', alt:0 };
  if (PLAN.stage === 'recap' && PLAN.recapHTML){ app().innerHTML = PLAN.recapHTML; planRecapWire(); return; }
  PLAN.stage = 'pick'; PLAN.pick = planPick(PLAN.alt); PLAN.lesson = planLesson(PLAN.pick); PLAN.j = 0;
  const done = plansDone()[today()];
  const s = speakable(`Today's plan. About 10 minutes. One: a short lesson on ${PLAN.lesson.title}. Two: 10 questions by ear. Three: a one minute recap of your misses.`);
  app().innerHTML = `<h1>Today's plan</h1>
  <div class="card"><p class="big-word">${esc(planName(PLAN.pick))}</p>
    <div class="row" style="align-items:flex-start"><div style="flex:1" id="planIntro">${s.html}</div>${sayBtn('#'+s.id)}</div>
    <ol class="focus-list"><li>Short audio lesson (about 3 minutes)</li><li>10 questions, read to you</li><li>One minute recap of your misses</li></ol>
    <p>${PLAN.pick.kind === 'ladder' ? 'Picked because you are still on the catch-up track.' : 'Picked because it is your weakest IT part right now.'}</p>
    ${done ? `<p class="ok-text">You already did a plan today (${done.right} of ${done.n}). One more is fine.</p>` : ''}</div>
  <div class="row"><button class="primary" id="planStart">Start today's plan</button><button id="planAlt">Different subject</button><button onclick="go('home')">Home</button></div>`;
  $('#planStart').onclick = planStartLesson; $('#planAlt').onclick = planAlt;
};
function planAlt(){ if (!PLAN) PLAN = { stage:'pick', alt:0 }; PLAN.alt++; go('plan'); }
function planStartLesson(){
  if (!PLAN) return; PLAN.stage = 'lesson'; PLAN.j = 0; Speech.stop();
  const L = PLAN.lesson;
  app().innerHTML = `<h1>Today's plan, step 1 of 3: lesson</h1><p class="big-word">${esc(L.title)}</p>
  <div class="card" id="planLines">${L.lines.map((x, k) => `<p class="lad-li" data-pl="${k}">${wordsHTML(x)}</p>`).join('')}</div>
  <div class="row"><button class="primary" id="planSkip">Start the 10 questions</button><button id="planPlay">Play the lesson</button><button onclick="go('home')">End</button></div>`;
  $('#planSkip').onclick = planQuestions; $('#planPlay').onclick = () => { PLAN.j = 0; planPlayLocal(); };
  if (HF.on) HF.enter('planlesson'); else planPlayLocal();
}
async function planPlayLine(alive){
  if (!PLAN || PLAN.stage !== 'lesson') return false; const L = PLAN.lesson;
  if (PLAN.j >= L.lines.length) return false;
  const k = PLAN.j; $$('#planLines .lad-li.now').forEach(x => x.classList.remove('now')); const el = $(`[data-pl="${k}"]`); if (el){ el.classList.add('now'); el.scrollIntoView && el.scrollIntoView({ block:'nearest' }); }
  await Speech.speakEl(el); if (!alive()) return false; PLAN.j = k + 1;
  if (/^Think about this one/.test(L.lines[k])) await sleep(fastMode() ? 300 : 3500);
  return true;
}
const fastMode = () => /[?&]fast=1/.test(location.search);
async function planPlayLocal(){
  const g = Speech.gen; const alive = () => g === Speech.gen && PLAN && PLAN.stage === 'lesson';
  while (alive() && await planPlayLine(alive)) await sleep(200);
  if (alive() && PLAN.j >= PLAN.lesson.lines.length){ await Speech.say('Now 10 questions.'); if (alive()) planQuestions(); }
}
function planQuestions(){
  if (!PLAN) return; Speech.stop(); PLAN.stage = 'qs'; const p = PLAN.pick;
  if (p.kind === 'ladder'){ ladStart(p.level); if (LR) LR.byEar = true; }
  else startSession(p.sec, 10, { hf: HF.on, noTimer:true, skipReview:true, byEar:true });
}
// called by endSession / ladEnd while a plan is running; returns true when it took over the screen
function planHook(kind, r){
  if (!PLAN || PLAN.stage !== 'qs') return false;
  let items;
  if (kind === 'sec') items = r.results.map(x => { const q = qById(x.qid); return { ok:x.correct, stem:q.stem, ans: q.choices[q.answer], why: firstSentence(q.explanation) }; });
  else items = r.results.map(x => { const q = r.qs.find(z => z.id === x.id) || {}; return { ok:x.ok, stem: q.say || q.stem || '', ans: q.mode === 'say' ? q.sayAnswer : (q.choices || [])[q.answer], why: (q.steps || [q.explanation || '']).slice(-1)[0] || '' }; });
  planRecap(items, kind === 'lad' ? r : null); return true;
}
const clip = (s, n = 180) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '...' : s; };
function planRecap(items, lad){
  const n = items.length, right = items.filter(x => x.ok).length, miss = items.filter(x => !x.ok);
  const d = plansDone(); d[today()] = { date:new Date().toISOString(), pick:PLAN.pick, right, n }; Store.set('plans', d);
  const s = streakInfo();
  const lines = [`Recap. You got ${right} of ${n}.`]
    .concat(miss.length ? miss.slice(0, 4).map((m, k) => `Miss ${k + 1}: ${clip(m.stem)} The answer is ${dot(m.ans)} ${clip(m.why, 140)}`) : ['No misses. Great work.'])
    .concat(miss.length > 4 ? [`${miss.length - 4} more are saved in My misses.`] : [])
    .concat([`That is today's plan. Today: ${s.todayCount} of ${DAILY_GOAL} questions. ${s.goalMet ? 'Daily goal done.' : `${DAILY_GOAL - s.todayCount} more for your daily goal.`} Streak: ${s.streak} day${s.streak === 1 ? '' : 's'}.`]);
  const sp = speakable(lines.join(' '));
  PLAN.stage = 'recap';
  PLAN.recapHTML = `<h1>Today's plan, step 3 of 3: recap</h1>
  <div class="card"><div class="row" style="align-items:flex-start"><div class="big-word" style="flex:1" id="planSum">${sp.html}</div>${sayBtn('#'+sp.id)}</div></div>
  ${lad ? `<p>Catch-up level ${ladState().level} of ${NLEV}.</p>` : ''}
  <div class="row"><button class="primary" onclick="go('home')">Home</button><button onclick="go('progress')">My progress</button><button id="planAgain">Another plan</button></div>`;
  app().innerHTML = PLAN.recapHTML; planRecapWire(); history.replaceState(null, '', '#plan');
  if (HF.on) HF.enter('planrecap'); else Speech.speakEl($('#planSum'));
}
function planRecapWire(){ const b = $('#planAgain'); if (b) b.onclick = () => { PLAN = null; go('plan', 'new'); }; }
Object.assign(EXTRA_VCTX, {
  plan: {
    help: "Say start to begin today's plan. Say different subject for another one. Or say home.",
    async intro(alive){ if (PLAN && PLAN.stage === 'recap'){ HF.enter('planrecap'); return; } await sayEl('#planIntro'); if (alive()) await Speech.say(`Subject: ${planName(PLAN.pick)}. Say start, or different subject.`); },
    async handle(t){
      if (!PLAN) return false;
      if (anyOf(t, ['different subject', 'another subject', 'something else', 'change subject', 'other subject', 'different one'])){ planAlt(); return true; }
      if (isGo(t, ["start today's plan", 'start the plan', 'start my plan'])){ planStartLesson(); return true; }
      return false; },
  },
  planlesson: {
    priority: true, strictNav: true,
    listenMs: () => 1800,
    help: 'Say skip lesson to go to the questions. Say repeat that, or pause.',
    async intro(alive){ if (!PLAN) return; if (PLAN.j === 0) await Speech.say("Step 1: the lesson."); if (alive()) await VCTX.planlesson.next(alive); },
    async next(alive){ if (!PLAN || PLAN.stage !== 'lesson') return;
      if (PLAN.j >= PLAN.lesson.lines.length){ await Speech.say('Step 2: 10 questions.'); if (alive()) planQuestions(); return; }
      await planPlayLine(alive); },
    async onSilence(){ if (PLAN && PLAN.stage === 'lesson') HF.run(alive => VCTX.planlesson.next(alive)); },
    async onMiss(){ if (PLAN && PLAN.stage === 'lesson') HF.run(alive => VCTX.planlesson.next(alive)); },
    async handle(t){
      if (!PLAN) return false;
      if (anyOf(t, ['skip lesson', 'skip the lesson', 'start questions', 'start the questions', 'questions', 'skip'])){ planQuestions(); return true; }
      if (anyOf(t, ['repeat that', 'say that again', 'again'])){ PLAN.j = Math.max(0, PLAN.j - 1); HF.run(alive => VCTX.planlesson.next(alive)); return true; }
      return false; },
  },
  planrecap: {
    help: 'Say repeat to hear the recap again. Say another plan, progress, or home.',
    async intro(alive){ await sayEl('#planSum'); if (alive()) await Speech.say('Say home, progress, or another plan.'); },
    async handle(t){ if (anyOf(t, ['another plan', 'new plan', 'one more plan'])){ PLAN = null; go('plan', 'new'); return true; } return false; },
  },
});

/* ======================= 3. Real-test reading passages (PC) ======================= */
const PCR = window.ASVAB_PCREAL || { passages:[], questions:[] };
function pcAccuracy(){ const a = (Store.get('hist', {}).PC || []).slice(-20); if (a.length < 10) return null; return Math.round(100 * a.reduce((x, y) => x + y, 0) / a.length); }
function pcrUnlocked(){ const p = pcAccuracy(); return (p != null && p >= 75) || !!Store.get('pcrealOpen', false); }
function pcrState(){ return Store.get('pcreal', { seen:{}, log:[] }); }
function pcrCardHTML(){
  const p = pcAccuracy(); const open = pcrUnlocked();
  return `<div class="card" id="pcrCard"><h2>Real test level passages</h2>
    <p>${PCR.passages.length} longer passages (100 to 150 words), ${PCR.questions.length} questions. Adult words, like the real test.</p>
    <p>${open ? 'Unlocked.' : `Unlocks at 75% on your recent reading questions. ${p == null ? 'Do 10 or more PC questions first.' : `You are at ${p}%.`} Or try it now.`}</p>
    <div class="row"><button class="${open ? 'primary' : ''}" id="pcrGo">${open ? 'Open real test passages' : 'Try it anyway'}</button></div></div>`;
}
SCREENS.pcreal = () => {
  const open = pcrUnlocked(); const p = pcAccuracy(); const st = pcrState(); const last = st.log[st.log.length - 1];
  if (!open){
    app().innerHTML = `<h1>Real test passages</h1><div class="card"><p class="big-word">Locked for now.</p>
      <p>These open when your recent Paragraph Comprehension score is 75% or more. ${p == null ? 'Do 10 or more PC questions first.' : `Your last ${Math.min(20, (Store.get('hist', {}).PC || []).length)} PC answers: ${p}%.`}</p>
      <p>You can also try them now. They are harder.</p></div>
      <div class="row"><button class="primary" id="pcrAnyway">Try it anyway</button><button onclick="go('practice','PC')">Back to Paragraph Comprehension</button></div>`;
    $('#pcrAnyway').onclick = () => { Store.set('pcrealOpen', true); go('pcreal'); }; return; }
  app().innerHTML = `<h1>Real test passages</h1>
  <div class="card"><p>${PCR.passages.length} passages, ${PCR.questions.length} questions. A set is 4 passages, with 1 to 3 questions each.</p>
    <p>Tip: read the question first. Then read the passage to find the answer.</p>
    ${last ? `<p>Last set: ${last.right} of ${last.n} (${last.mode === 'own' ? 'on your own' : 'read aloud first'}).</p>` : ''}</div>
  <div class="grid"><button class="tile primary" id="pcrAloud">Read-aloud first<small>I read the question, then the passage, with the words lit up.</small></button>
    <button class="tile" id="pcrOwn">Try it reading on your own<small>You read the passage. Tap Guide me for a moving highlight.</small></button></div>
  <div class="row"><button onclick="go('practice','PC')">Back to Paragraph Comprehension</button></div>`;
  $('#pcrAloud').onclick = () => startPcReal('aloud'); $('#pcrOwn').onclick = () => startPcReal('own');
};
function startPcReal(mode){
  const st = pcrState(); const pas = PCR.passages.slice().sort((a, b) => (st.seen[a.id] || 0) - (st.seen[b.id] || 0) || PCR.passages.indexOf(a) - PCR.passages.indexOf(b)).slice(0, 4);
  pas.forEach(x => st.seen[x.id] = (st.seen[x.id] || 0) + 1); Store.set('pcreal', st);
  const qs = pas.flatMap(x => PCR.questions.filter(q => q.passageId === x.id).map(q => Object.assign({}, q, { label:'Paragraph Comprehension, real test level' })));
  if (!qs.length){ toast('No passages found.'); return; }
  cleanup(); S = { sec:'PC', qs, i:0, results:[], hf: HF.on, timerOn:false, per: CAT.PC[1]*60/CAT.PC[0], mode:'pcreal', pcMode:mode, byEar: mode === 'aloud' };
  history.replaceState(null, '', '#pcreal/' + mode); renderQ();
}
// after renderQ draws a real-level question: question first, then the passage, big text, and the guide button
function pcrDecorate(){
  if (!S || !S.pcMode) return; const pass = $('.card.passage'), stemCard = $('.stem') && $('.stem').closest('.card');
  if (pass && stemCard) stemCard.after(pass);
  const pt = $('.passage-text'); if (pt) pt.classList.add('read-big');
  const note = S.pcMode === 'aloud' ? 'Read-aloud first: I read the question, then the passage, then the choices.' : 'On your own: read the question first. Then read the passage. Tap Guide me for a moving highlight, or Read to me.';
  if (pass){ pass.insertAdjacentHTML('afterbegin', `<p class="pill" id="pcrMode">${note}</p>`);
    pass.querySelector('.row').insertAdjacentHTML('beforeend', `<button class="small" id="pcrGuide">Guide me</button>`); $('#pcrGuide').onclick = () => pcrGuide(); }
}
let PCR_GUIDE = null;
function pcrGuide(stop){
  const b = $('#pcrGuide');
  if (PCR_GUIDE){ clearInterval(PCR_GUIDE); PCR_GUIDE = null; $$('.passage-text .w.hl').forEach(e => e.classList.remove('hl')); if (b) b.textContent = 'Guide me'; return false; }
  if (stop) return false;
  const ws = $$('.passage-text .w'); if (!ws.length) return false; let k = 0; const wpm = settings.guideWpm || 110;
  if (b) b.textContent = 'Stop guide';
  const tick = () => { if (!ws[k] || !ws[k].isConnected){ clearInterval(PCR_GUIDE); PCR_GUIDE = null; const bb = $('#pcrGuide'); if (bb) bb.textContent = 'Guide me'; return; }
    if (k) ws[k - 1].classList.remove('hl'); ws[k].classList.add('hl'); k++; };
  tick(); PCR_GUIDE = setInterval(tick, Math.round(60000 / wpm));
  return true;
}
// read a real-level question: aloud = question, passage, question again, choices. own = question and choices only.
async function pcrRead(q){
  const g = Speech.gen; const ok = () => g === Speech.gen; const stem = $('.stem'), pass = $('.passage-text');
  const first = S.i === 0 || S.qs[S.i - 1].passageId !== q.passageId;
  await Speech.speakEl(stem, 'Question.'); if (!ok()) return;
  if (S.pcMode === 'aloud'){
    if (first){ await Speech.speakEl(pass, 'Now the passage.'); if (!ok()) return; await Speech.speakEl(stem, 'The question again.'); if (!ok()) return; }
    else { await Speech.say('Same passage as before. Say read the passage to hear it again.'); if (!ok()) return; }
  } else { await Speech.say(first ? 'Now read the passage on the screen. Then pick an answer.' : 'Same passage. Look back at it on the screen.'); if (!ok()) return; }
  const chs = $$('.choice'); for (let i = 0; i < chs.length; i++){ if (!ok()) return; await Speech.speakEl(chs[i].querySelector('span[id]'), LET[i] + '.'); }
  if (ok() && S.pcMode === 'own' && HF.on) await Speech.say('Say the letter when you are ready. Say read the passage, or guide me, if you want help.');
}
function pcrDone(s, right, done){ const st = pcrState(); st.log.push({ date:new Date().toISOString(), right, n:done, mode:s.pcMode }); st.log = st.log.slice(-50); Store.set('pcreal', st); }
Object.assign(EXTRA_VCTX, {
  pcreal: {
    help: () => pcrUnlocked() ? 'Say read aloud first, or on my own. Say home to leave.' : 'Say try it anyway, or home.',
    async intro(){ const p = pcAccuracy();
      if (!pcrUnlocked()){ await Speech.say(`Real test passages. They unlock at 75 percent on your recent reading questions. ${p == null ? 'Do 10 or more reading questions first.' : `You are at ${p} percent.`} Say try it anyway, or home.`); return; }
      await Speech.say(`Real test passages. ${PCR.passages.length} longer passages. A set is 4 passages. Say read aloud first, and I read the question, then the passage. Or say on my own, and you read the passage yourself.`); },
    async handle(t){
      if (!pcrUnlocked()){ if (anyOf(t, ['try it anyway', 'try anyway', 'try it', 'unlock', 'open it anyway']) || isGo(t)){ Store.set('pcrealOpen', true); go('pcreal'); return true; } return false; }
      if (anyOf(t, ['read aloud first', 'read aloud', 'read it to me', 'aloud', 'read to me', 'out loud'])){ startPcReal('aloud'); return true; }
      if (anyOf(t, ['on my own', 'my own', 'read on my own', 'by myself', 'myself', 'i will read'])){ startPcReal('own'); return true; }
      return false; },
  },
});

/* ======================= 4 + 5. Electronics by ear, test-day tips ======================= */
const EAR = window.ASVAB_EAR || { ei:[], tips:[] };
function earFind(id){ for (const g of ['ei', 'tips']){ const k = EAR[g].findIndex(l => l.id === id); if (k >= 0) return { g, k, L: EAR[g][k] }; } return null; }
const EAR_NAME = { ei:'Electronics by ear', tips:'Test-day tips' };
function earState(){ return Store.get('ear', { done:{} }); }
SCREENS.earset = (g) => {
  g = g === 'tips' ? 'tips' : 'ei'; const list = EAR[g]; const st = earState();
  const intro = g === 'ei' ? 'Spoken lessons with pictures in your head: electricity is water in a pipe. Each lesson ends with quick checks. Say the number.'
    : 'Short spoken tips for test day. Checked against officialasvab.com. Tips marked "coach tip" are advice, not official rules.';
  app().innerHTML = `<h1>${EAR_NAME[g]}</h1><div class="card"><p>${intro}</p></div>
  <div class="row"><button class="primary" id="earAll">Play all in Audio lessons</button>${g === 'ei' ? `<button onclick="go('practice','EI')">Electronics practice</button>` : ''}</div>
  <ol class="focus-list" id="earList">${list.map((L, k) => `<li><button class="tile" style="width:100%;margin:4px 0" data-el="${L.id}">${k + 1}. ${esc(L.title)}<small>${st.done[L.id] ? 'Done' : 'Not heard yet'}${L.steps.some(s => s.t === 'check') ? ` | ${L.steps.filter(s => s.t === 'check').length} quick checks` : ''}</small></button></li>`).join('')}</ol>
  ${g === 'tips' ? '<p><small>Sources are listed in SOURCES.md in the app folder.</small></p>' : ''}`;
  $('#earAll').onclick = () => go('audio', g);
  $$('[data-el]').forEach(b => b.onclick = () => go('earlesson', b.dataset.el));
};
SCREENS.earlesson = (id) => {
  const f = earFind(id); if (!f){ go('earset'); return; } const { g, k, L } = f; const nx = EAR[g][k + 1];
  app().innerHTML = `<h1>${EAR_NAME[g]} ${k + 1} of ${EAR[g].length}: ${esc(L.title)}</h1>
  <div class="row"><button class="primary" id="elPlay">Play the lesson</button>${nx ? `<button id="elNext">Next lesson</button>` : ''}<button id="elBack">All ${EAR_NAME[g].toLowerCase()}</button></div>
  <div class="card" id="earBody">${L.steps.map(lessonStepHTML).join('')}</div>
  ${g === 'tips' ? `<p><small>Source: ${esc((L.src || []).map(s => s === 'coach' ? 'coach tip (not an official rule)' : 'officialasvab.com (' + s + ')').join(', '))}.</small></p>` : ''}
  <div class="row">${nx ? `<button class="primary" id="elNext2">Next lesson</button>` : ''}<button onclick="go('home')">Home</button></div>`;
  $('#elPlay').onclick = () => earPlayLocal(id);
  $('#elBack').onclick = () => go('earset', g);
  if (nx){ $('#elNext').onclick = $('#elNext2').onclick = () => go('earlesson', nx.id); }
};
function earMarkDone(id){ const st = earState(); st.done[id] = today(); Store.set('ear', st); }
function earEndLine(id){ const f = earFind(id); const nx = f && EAR[f.g][f.k + 1]; return `That is the lesson. ${nx ? 'Say next lesson, ' : 'That was the last one. Say '}repeat that, or home.`; }
async function earPlayLocal(id){
  const f = earFind(id); if (!f) return; Speech.stop(); const g = Speech.gen; const ok = () => g === Speech.gen;
  for (let i = 0; i < f.L.steps.length && ok(); i++){ const b = f.L.steps[i];
    $$('.lad-li.now').forEach(x => x.classList.remove('now')); const el = $(`#earBody [data-step="${i}"]`); if (el) el.classList.add('now');
    if (b.t === 'check'){ await Speech.say('Quick check. ' + b.q); if (!ok()) return; await sleep(fastMode() ? 300 : 4000); if (!ok()) return; await Speech.say(`The answer is ${b.a}. ${b.why}`); }
    else await (el ? Speech.speakEl(el) : Speech.say(b.x)); await sleep(200); }
  if (ok()){ earMarkDone(id); await Speech.say('That is the lesson.'); }
}
Object.assign(EXTRA_VCTX, {
  earset: {
    help: g => `Say lesson 1 to ${EAR[g === 'tips' ? 'tips' : 'ei'].length}, start, play all, or home.`,
    async intro(alive, g){ g = g === 'tips' ? 'tips' : 'ei'; const list = EAR[g];
      await Speech.say(`${EAR_NAME[g]}. ${list.length} lessons.`); if (!alive()) return;
      await Speech.say(list.map((L, k) => `${k + 1}: ${L.title}.`).join(' ')); if (!alive()) return;
      await Speech.say('Say lesson and a number, start for the next one you have not heard, or play all.'); },
    async handle(t, all, raw, g){ g = g === 'tips' ? 'tips' : 'ei'; const list = EAR[g];
      if (anyOf(t, ['play all', 'play them all', 'audio lessons'])){ go('audio', g); return true; }
      const n = numberIn(t); if (n && /\b(lesson|number|tip|play)\b/.test(t) && list[n - 1]){ go('earlesson', list[n - 1].id); return true; }
      if (isGo(t, ['first lesson', 'play'])){ const st = earState(); const L = list.find(x => !st.done[x.id]) || list[0]; go('earlesson', L.id); return true; }
      return false; },
  },
  earlesson: {
    help: 'Answer the quick check out loud, like 3 or 1 half. Or say skip. Say repeat that, next lesson, or home.',
    async intro(alive, id){ const f = earFind(id); if (!f) return;
      if (!LL || LL.n !== id) LL = { n:id, steps:f.L.steps, i:0, wait:null, miss:0, end: earEndLine(id), onEnd: () => earMarkDone(id) };
      if (LL.i === 0) await Speech.say(`${EAR_NAME[f.g]}, lesson ${f.k + 1}: ${f.L.title}.`); if (!alive()) return; await llPlay(alive); },
    async handle(t, all, raw, id){
      const f = earFind(id); if (!f) return false;
      if (LL && LL.wait){
        if (/\b(skip|i dont know|no idea|tell me)\b/.test(t)){ const c = LL.wait; LL.wait = null; LL.i++; HF.run(async alive => { await Speech.say(`The answer is ${c.a}. ${c.why}`); if (alive()) await llPlay(alive); }); return true; }
        const said = all.map(x => MS.said(x)).find(Boolean);
        if (said){ const c = LL.wait; const key = MS.value(String(c.v)); LL.wait = null; LL.i++; const ok = key && MS.eq(key, said.v);
          HF.run(async alive => { await Speech.say(ok ? `Yes! ${c.why}` : `Not quite. The answer is ${c.a}. ${c.why}`); if (alive()) await llPlay(alive); }); return true; }
      }
      if (anyOf(t, ['next lesson', 'next one', 'next'])){ const nx = EAR[f.g][f.k + 1]; if (nx){ LL = null; go('earlesson', nx.id); } else await HF.say('That was the last lesson. Say home.'); return true; }
      if (/\b(repeat that|say that again|again)\b/.test(t)){ if (LL){ LL.i = Math.max(0, LL.i - (LL.wait ? 0 : 1)); LL.wait = null; } HF.run(alive => llPlay(alive)); return true; }
      if (anyOf(t, ['start over', 'from the top', 'restart the lesson'])){ LL = null; HF.enter('earlesson', id); return true; }
      if (anyOf(t, ['all lessons', 'lesson list', 'the list'])){ go('earset', f.g); return true; }
      if (anyOf(t, ['play all', 'play them all', 'audio lessons'])){ LL = null; go('audio', f.g); return true; }
      return false; },
    async onSilence(){ if (!LL || !LL.wait) return; LL.miss++;
      if (LL.miss === 1){ await HF.say('Take your time. Say the number, or say skip.'); return; }
      const c = LL.wait; LL.wait = null; LL.i++; LL.miss = 0; HF.run(async alive => { await Speech.say(`The answer is ${c.a}. ${c.why}`); if (alive()) await llPlay(alive); }); },
    async onMiss(){ if (LL && LL.wait) await HF.say('Say the answer as a number, like 3, or 1 half. Or say skip.'); else await HF.say('Say next lesson, repeat that, or home.'); },
  },
});
// audio playlist entries (added to the end of Audio lessons)
function earPlaylist(){
  const out = [];
  EAR.ei.forEach((L, k) => out.push({ group:'ei', title:`Electronics by ear ${k + 1}: ${L.title}`, lines: [{ say:`Electronics by ear, lesson ${k + 1}: ${L.title}.` }].concat(earAudioLines(L)) }));
  EAR.tips.forEach((L, k) => out.push({ group:'tips', title:`Test-day tip ${k + 1}: ${L.title}`, lines: [{ say:`Test-day tip ${k + 1}: ${L.title}.` }].concat(earAudioLines(L)) }));
  return out;
}
function earAudioLines(L){ const out = []; for (const b of L.steps){ if (b.t === 'check'){ out.push({ say:`Think about this one. ${b.q}`, pause:4000 }); out.push({ say:`The answer is ${b.a}. ${b.why}` }); } else out.push({ say:b.x }); } return out; }

/* ======================= 6. Daily reminder ======================= */
function remTime(){ return /^\d{1,2}:\d{2}$/.test(settings.remindTime || '') ? settings.remindTime : '18:00'; }
function remSpoken(t = remTime()){ let [h, m] = t.split(':').map(Number); const pm = h >= 12; const h12 = h % 12 || 12; return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${pm ? 'PM' : 'AM'}`; }
function remPassed(now = new Date()){ const [h, m] = remTime().split(':').map(Number); return now.getHours() * 60 + now.getMinutes() >= h * 60 + m; }
function reminderDue(now = new Date()){ return !!settings.remindOn && remPassed(now) && !streakInfo().goalMet; }
function reminderBannerHTML(){
  if (!reminderDue() || Store.get('remindDismiss', '') === today()) return '';
  const s = streakInfo();
  return `<div class="card nudge" id="remindBanner" role="status"><p class="big-word">Study reminder</p><p>It is past ${esc(remSpoken())}. You did ${s.todayCount} of ${DAILY_GOAL} today. ${DAILY_GOAL - s.todayCount} more keeps your streak.</p>
    <div class="row"><button class="primary" id="remPlan">Start today's plan</button><button id="remDismiss">Dismiss for today</button></div></div>`;
}
function reminderWire(){ const p = $('#remPlan'); if (p) p.onclick = () => go('plan', 'new');
  const d = $('#remDismiss'); if (d) d.onclick = () => { Store.set('remindDismiss', today()); const b = $('#remindBanner'); if (b) b.remove(); }; }
function notifyText(){ const s = streakInfo(); return { title:'ASVAB Coach', body:`Time to study. You did ${s.todayCount} of ${DAILY_GOAL} today. Ten minutes keeps your streak.` }; }
async function showReminder(){
  const n = notifyText(); const opts = { body:n.body, icon:'icon-192.png', tag:'asvab-reminder', data:{ url:'./#plan' } };
  try { if (navigator.serviceWorker && navigator.serviceWorker.controller){ const r = await navigator.serviceWorker.ready; await r.showNotification(n.title, opts); return 'sw'; } } catch(e){}
  try { const x = new Notification(n.title, opts); x.onclick = () => { window.focus(); go('plan', 'new'); x.close(); }; return 'page'; } catch(e){ return 'none'; }
}
function reminderTick(){
  remSyncSW();
  if (!reminderDue()) return;
  if (Store.get('remindLast', '') !== today() && typeof Notification !== 'undefined' && Notification.permission === 'granted'){ Store.set('remindLast', today()); showReminder(); }
  if (!$('#remindBanner') && (location.hash === '' || location.hash.startsWith('#home'))){ const h = reminderBannerHTML(); const h1 = app().querySelector('h1'); if (h && h1){ h1.insertAdjacentHTML('afterend', h); reminderWire(); } }
}
// the service worker reads this to show a reminder when the app is closed (periodic sync, where the browser supports it)
function remSyncSW(){
  if (!('caches' in window) || !/^https?:$/.test(location.protocol)) return;
  const st = { on: !!settings.remindOn, time: remTime(), goalDate: streakInfo().goalMet ? today() : '', notified: Store.get('remindLast', '') };
  caches.open('asvab-state').then(c => c.put('./reminder-state', new Response(JSON.stringify(st), { headers:{ 'content-type':'application/json' } }))).catch(() => {});
}
async function reminderSet(on, time){
  if (time) settings.remindTime = time; settings.remindOn = !!on; saveSettings();
  let perm = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  if (on && perm === 'default'){ try { perm = await Notification.requestPermission(); } catch(e){} }
  if (on && navigator.serviceWorker){ try { const r = await navigator.serviceWorker.ready; if (r.periodicSync) await r.periodicSync.register('asvab-reminder', { minInterval: 60 * 60 * 1000 }); } catch(e){} }
  remSyncSW(); return perm;
}
function remStatusText(){
  const p = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  if (!settings.remindOn) return 'Reminder is off.';
  return `Reminder is on for ${remSpoken()} each day, if you have not done ${DAILY_GOAL} questions yet. ` + (p === 'granted' ? 'Notifications are allowed.' : p === 'denied' ? 'Notifications are blocked in the browser, so you will see a banner when you open the app.' : p === 'unsupported' ? 'This browser has no notifications, so you will see a banner when you open the app.' : 'Notifications are not allowed yet. You will see a banner when you open the app.');
}
function remSettingsHTML(){
  return `<div class="card" id="remCard"><h2>Daily reminder</h2>
    <div class="toggle"><input type="checkbox" id="remOn" ${settings.remindOn ? 'checked' : ''}><label for="remOn" style="margin:0">Remind me to study every day</label></div>
    <label for="remTime">Time</label><input type="time" id="remTime" value="${esc(remTime())}" style="font-size:1.4em">
    <p id="remStatus">${esc(remStatusText())}</p>
    <p>The daily goal stays at ${DAILY_GOAL} questions. No reminder on days you already did them.</p>
    <div class="row"><button class="small" id="remTest">Test the reminder</button></div>
    <h2>Weekly test day</h2><label for="weeklyDay">Remind me about the weekly test on</label>
    <select id="weeklyDay">${DAYS.map((d, i) => `<option value="${i}" ${i === weeklyDay() ? 'selected' : ''}>${d}</option>`).join('')}</select></div>`;
}
function remSettingsWire(){
  const st = () => { const e = $('#remStatus'); if (e) e.textContent = remStatusText(); };
  $('#remOn').onchange = async e => { await reminderSet(e.target.checked, $('#remTime').value); st(); };
  $('#remTime').onchange = async e => { await reminderSet(settings.remindOn, e.target.value); st(); };
  $('#remTest').onclick = async () => { const how = (typeof Notification !== 'undefined' && Notification.permission === 'granted') ? await showReminder() : 'none'; toast(how === 'none' ? 'Notifications are off. You will see a banner on the home screen.' : 'Reminder sent.'); };
  $('#weeklyDay').onchange = e => { settings.weeklyDay = +e.target.value; saveSettings(); };
}
// "remind me at 7 pm", "reminder at 6:30", "remind me at 19 30"
function parseSpokenTime(t){
  t = String(t).toLowerCase().replace(/\./g, '').replace(/\bo clock\b/g, '');
  const m = t.match(/\b(\d{1,2})(?:[: ](\d{2}))?\s*(am|pm|a m|p m|in the morning|in the evening|at night|tonight)?\b/); if (!m) return null;
  let h = +m[1], mi = m[2] ? +m[2] : 0; const ap = (m[3] || '').replace(/\s/g, '');
  if (h > 23 || mi > 59) return null;
  if (/pm|evening|night|tonight/.test(ap) && h < 12) h += 12; if (/am|morning/.test(ap) && h === 12) h = 0;
  if (!ap && h >= 1 && h <= 6) h += 12;   // "remind me at 6" means 6 PM for an after-work reminder
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}
setInterval(() => { try { reminderTick(); } catch(e){} }, 60000);
