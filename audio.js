/* Learn by ear: speed drills, Audio lessons (listen only, like a podcast), Vocab by ear, and Read along.
   Built for earbuds and a phone in the pocket: everything is spoken, answers are said out loud, touch is a backup. */
'use strict';
/* ---------------- vocab by ear (original word list: meaning, words that count as right, memory hook) ---------------- */
const VOCAB = [
 ['abundant', 'more than enough; plenty', ['plenty', 'lots', 'a lot', 'more than enough', 'many', 'plentiful'], 'Abundant sounds like "a bun dance": so many buns they could dance.'],
 ['adjacent', 'next to', ['next to', 'beside', 'near', 'nearby', 'touching', 'neighboring'], 'Adjacent: "add a gent" next to you. Next to.'],
 ['candid', 'honest and open', ['honest', 'open', 'truthful', 'frank', 'direct'], 'A candid camera shows the honest truth.'],
 ['cease', 'to stop', ['stop', 'end', 'quit', 'halt'], 'Cease-fire means stop firing.'],
 ['concise', 'short and clear', ['short', 'brief', 'clear', 'to the point'], 'Concise: cut it to size. Short.'],
 ['diligent', 'hard-working and careful', ['hard working', 'hardworking', 'careful', 'works hard', 'busy', 'industrious'], 'A diligent sailor digs in and works hard.'],
 ['durable', 'lasts a long time; tough', ['lasts', 'tough', 'strong', 'long lasting', 'sturdy'], 'Durable sounds like duration: it lasts.'],
 ['feasible', 'possible; can be done', ['possible', 'can be done', 'doable', 'workable', 'able to be done'], 'Feasible: if it is feasible, it is doable.'],
 ['hazard', 'a danger', ['danger', 'risk', 'threat', 'dangerous'], 'Hazard lights warn of danger.'],
 ['hostile', 'unfriendly; like an enemy', ['unfriendly', 'enemy', 'angry', 'mean', 'aggressive'], 'Hostile has "host" but it is the opposite of a friendly host.'],
 ['imply', 'to hint at', ['hint', 'suggest', 'suggest without saying'], 'Imply: put it in, without saying it out loud.'],
 ['inevitable', 'sure to happen', ['sure to happen', 'certain', 'unavoidable', 'going to happen', 'bound to happen'], 'Inevitable: you can not avoid it. Like taxes.'],
 ['meager', 'very small; not enough', ['small', 'little', 'not enough', 'tiny', 'scant'], 'A meager meal leaves you hungry.'],
 ['novice', 'a beginner', ['beginner', 'new', 'newbie', 'rookie', 'new person'], 'Novice sounds like "nova", new. A new person.'],
 ['obsolete', 'out of date; no longer used', ['out of date', 'old', 'outdated', 'no longer used', 'not used'], 'Obsolete: so old it is obviously done.'],
 ['prudent', 'wise and careful', ['wise', 'careful', 'smart', 'sensible', 'cautious'], 'A prudent person plans before acting.'],
 ['reluctant', 'not wanting to', ['not wanting', 'unwilling', 'hesitant', 'does not want'], 'Reluctant: you have to re-pull them to get them going.'],
 ['scarce', 'hard to find; rare', ['rare', 'hard to find', 'not much', 'few', 'little'], 'Scarce rhymes with "rare-ce". Rare.'],
 ['tedious', 'boring and long', ['boring', 'dull', 'long', 'tiring'], 'Tedious: like reading a phone book. Boring.'],
 ['vacant', 'empty', ['empty', 'unused', 'open', 'nobody'], 'Vacant sounds like vacation: everyone left. Empty.'],
 ['vigilant', 'watchful; on guard', ['watchful', 'alert', 'on guard', 'careful', 'watching'], 'A vigilant sentry watches all night, like a vigil.'],
 ['wary', 'careful; watchful of danger', ['careful', 'cautious', 'watchful', 'suspicious'], 'Wary sounds like worry. Careful.'],
 ['brisk', 'quick and lively', ['quick', 'fast', 'lively', 'energetic'], 'A brisk walk is a quick walk.'],
 ['commence', 'to begin', ['begin', 'start'], 'Commencement is the start of a new life after school.'],
 ['deter', 'to discourage; to stop from doing', ['discourage', 'stop', 'prevent', 'keep from', 'scare off'], 'A guard dog deters thieves.'],
 ['elated', 'very happy', ['happy', 'joyful', 'thrilled', 'overjoyed', 'excited'], 'Elated: lifted up, like an elevator. Very happy.'],
 ['frugal', 'careful with money', ['careful with money', 'cheap', 'thrifty', 'saves money', 'saving'], 'Frugal: you eat fruit, not steak, to save money.'],
 ['jeopardy', 'danger', ['danger', 'risk', 'at risk', 'peril'], 'On the game show you put your money in danger.'],
 ['lucid', 'clear and easy to understand', ['clear', 'easy to understand', 'understandable'], 'Lucid like Lucite plastic: clear.'],
 ['mend', 'to fix', ['fix', 'repair'], 'Mend a net. Fix it.'],
 ['ominous', 'threatening; a sign of bad things', ['threatening', 'scary', 'bad sign', 'menacing', 'warning'], 'Ominous dark clouds mean a storm is coming.'],
 ['placid', 'calm', ['calm', 'peaceful', 'still', 'quiet'], 'A placid lake has no waves.'],
 ['rigid', 'stiff; does not bend', ['stiff', 'does not bend', 'hard', 'firm', 'strict'], 'A rigid steel bar will not bend.'],
 ['sparse', 'thin and spread out', ['thin', 'spread out', 'few', 'scattered'], 'Sparse hair: only a few spare hairs.'],
 ['tranquil', 'calm and quiet', ['calm', 'quiet', 'peaceful'], 'Tranquil: like a tranquilizer, it calms you down.'],
 ['valor', 'great courage', ['courage', 'bravery', 'brave'], 'A medal of valor is for bravery.'],
];
function vocabState(){ return Object.assign({ words:{} }, Store.get('vocab', {})); }
function vocabNext(){ const st = vocabState(); const score = w => { const s = st.words[w[0]] || { seen:0, right:0 }; return s.right * 3 - s.seen + Math.random(); };
  return VOCAB.slice().sort((a, b) => score(a) - score(b))[0]; }
function vocabCheck(words, t){ return words.some(k => fuzzyHas(t, k)); }
let VQ = null;
SCREENS.vocab = () => {
  const st = vocabState(); const known = VOCAB.filter(w => (st.words[w[0]] || {}).right >= 2).length;
  VQ = { w: vocabNext(), n: 0, right: 0 };
  app().innerHTML = `<h1>Vocab by ear</h1><div class="card"><p>Hear a word, what it means, and a memory hook. Then say the meaning back.</p><p id="vocabKnown">You know ${known} of ${VOCAB.length} words.</p></div>
    <div class="card" id="vocabCard"></div><div class="row"><button class="primary" id="vocabStart">${HF.on ? 'Next word' : 'Hear a word'}</button><button onclick="go('home')">Home</button></div>`;
  $('#vocabStart').onclick = () => vocabShow(true);
  vocabShow(false);
};
function vocabShow(speak){
  const [w, mean, , hook] = VQ.w;
  $('#vocabCard').innerHTML = `<p class="big-word" id="vocabWord">${esc(w)}</p><p id="vocabMean">${wordsHTML('It means: ' + mean + '.')}</p><p>${wordsHTML('Memory hook: ' + hook)}</p>
    <div class="row"><button id="vocabGot">I said it right</button><button id="vocabMiss">I did not know</button></div><p id="vocabFb" aria-live="polite"></p>`;
  $('#vocabGot').onclick = () => vocabScore(true); $('#vocabMiss').onclick = () => vocabScore(false);
  if (HF.on) HF.enter('vocabq'); else if (speak) Speech.say(vocabIntroText());
}
function vocabIntroText(){ const [w, mean, , hook] = VQ.w; return `The word is ${w}. ${w} means ${mean}. Memory hook: ${hook} Now you say it: what does ${w} mean?`; }
function vocabScore(ok){
  const st = vocabState(); const w = VQ.w[0]; const s = st.words[w] || { seen:0, right:0 }; s.seen++; if (ok) s.right++; st.words[w] = s; Store.set('vocab', st); bumpDaily(1);
  VQ.n++; if (ok) VQ.right++; const msg = ok ? `Yes! ${w} means ${VQ.w[1]}.` : `${w} means ${VQ.w[1]}. You will hear it again soon.`;
  const fb = $('#vocabFb'); if (fb) fb.textContent = msg; VQ.w = vocabNext(); return msg;
}
/* ---------------- speed drills: quick facts out loud, with an optional timer that gets a bit faster as he improves ---------------- */
const DRILLS = {
  times: { name:'Times tables', make: r => { const a = 2 + r(11), b = 2 + r(11); return { q:`${a} times ${b}`, a: a * b }; } },
  halves: { name:'Halves and quarters', make: r => { const k = r(3); if (k === 0){ const n = 2 * (2 + r(49)); return { q:`half of ${n}`, a:n / 2 }; }
      if (k === 1){ const n = 4 * (1 + r(25)); return { q:`a quarter of ${n}`, a:n / 4 }; } const n = 4 * (1 + r(12)); return { q:`three fourths of ${n}`, a:3 * n / 4 }; } },
  percent: { name:'Percent facts', make: r => { const k = r(4); if (k === 0){ const n = 10 * (1 + r(20)); return { q:`10 percent of ${n}`, a:n / 10 }; }
      if (k === 1){ const n = 2 * (5 + r(46)); return { q:`50 percent of ${n}`, a:n / 2 }; } if (k === 2){ const n = 4 * (5 + r(21)); return { q:`25 percent of ${n}`, a:n / 4 }; }
      const n = 10 * (2 + r(9)); return { q:`20 percent of ${n}`, a:n / 5 }; } },
};
DRILLS.mixed = { name:'Mixed facts', make: r => DRILLS[['times', 'halves', 'percent'][r(3)]].make(r) };
function drillState(){ return Object.assign({ limit:10, timer:false, best:{}, log:[] }, Store.get('drill', {})); }
let DR = null;
SCREENS.drill = (kind) => {
  const st = drillState();
  if (!kind || !DRILLS[kind]){
    app().innerHTML = `<h1>Speed drills</h1><div class="card"><p>10 quick facts. Hear it, say the answer. Speed comes from knowing why, so each miss gets a short reason.</p>
      <div class="toggle"><input type="checkbox" id="drTimer" ${st.timer ? 'checked' : ''}><label for="drTimer" style="margin:0">Answer timer: ${st.limit} seconds (gets a little faster as you improve)</label></div></div>
      <div class="grid">${Object.entries(DRILLS).map(([k, d]) => `<button class="tile" data-dr="${k}">${d.name}<small>${st.best[k] != null ? `Best: ${st.best[k]} of 10` : 'New'}</small></button>`).join('')}</div>`;
    $('#drTimer').onchange = e => { const s = drillState(); s.timer = e.target.checked; Store.set('drill', s); };
    $$('[data-dr]').forEach(b => b.onclick = () => go('drill', b.dataset.dr)); return;
  }
  const rnd = n => Math.floor(Math.random() * n); const qs = []; const seen = new Set();
  while (qs.length < 10){ const q = DRILLS[kind].make(rnd); if (!seen.has(q.q)){ seen.add(q.q); qs.push(q); } }
  DR = { kind, qs, i:0, right:0, fast:0, timer: st.timer, limit: st.limit, t0:0 };
  drillRender();
};
function drillWhy(q){ const m = q.q.match(/^(\d+) times (\d+)$/); if (m) return `${m[1]} groups of ${m[2]} is ${q.a}.`;
  if (/^half of (\d+)/.test(q.q)) return `Half means divide by 2. ${q.q.split(' ').pop()} divided by 2 is ${q.a}.`;
  if (/quarter of|25 percent/.test(q.q)) return `A quarter means divide by 4. ${q.q.split(' ').pop()} divided by 4 is ${q.a}.`;
  if (/three fourths/.test(q.q)){ const n = +q.q.split(' ').pop(); return `One fourth of ${n} is ${n / 4}. Three of those is ${q.a}.`; }
  if (/^10 percent/.test(q.q)) return `10 percent means divide by 10. That is ${q.a}.`;
  if (/^50 percent/.test(q.q)) return `50 percent is half. That is ${q.a}.`;
  if (/^20 percent/.test(q.q)){ const n = +q.q.split(' ').pop(); return `10 percent of ${n} is ${n / 10}. Double it: ${q.a}.`; }
  return `The answer is ${q.a}.`; }
function drillRender(){
  const q = DR.qs[DR.i]; DR.answered = false; DR.t0 = Date.now();
  app().innerHTML = `<h1>${esc(DRILLS[DR.kind].name)}: ${DR.i + 1} of ${DR.qs.length}</h1>
    <div class="card"><p class="big-word" id="drQ">${esc(q.q)}?</p>${DR.timer ? `<p id="drTime">${DR.limit} seconds</p>` : ''}
    <div class="row"><input id="drIn" inputmode="decimal" autocomplete="off" aria-label="Your answer" style="max-width:10em"><button class="primary" id="drGo">Check</button></div><div id="drFb" aria-live="polite"></div></div>`;
  $('#drGo').onclick = () => drillAnswer($('#drIn').value); $('#drIn').onkeydown = e => { if (e.key === 'Enter') drillAnswer($('#drIn').value); };
  if (DR.timer && !HF.on){ clearTimeout(DR.tm); DR.tm = setTimeout(() => drillAnswer(null), DR.limit * 1000); }
  if (HF.on) HF.enter('drillq'); else Speech.say(q.q + '?');
}
function drillAnswer(raw){
  if (!DR || DR.answered) return; const q = DR.qs[DR.i]; clearTimeout(DR.tm);
  const late = raw == null; const said = late ? null : MS.said(String(raw)); if (!late && !said) return false;
  DR.answered = true; const ok = !!said && MS.eq(said.v, MS.fr(q.a * 4, 4)); const fast = ok && (Date.now() - DR.t0) <= DR.limit * 1000;
  if (ok) DR.right++; if (fast) DR.fast++; bumpDaily(1);
  const msg = ok ? 'Right.' : late ? `Time. ${drillWhy(q)}` : `Not quite. ${drillWhy(q)}`;
  const fb = $('#drFb'); if (fb) fb.innerHTML = `<p class="${ok ? 'ok-text' : 'bad-text'}">${esc(msg)}</p>`;
  const next = () => { DR.i++; if (DR.i >= DR.qs.length) drillEnd(); else drillRender(); };
  if (HF.on) HF.run(async alive => { await Speech.say(msg); if (alive()) next(); });
  else Speech.say(msg).then(() => { if (DR && DR.answered) setTimeout(next, 300); });
  return true;
}
function drillEnd(){
  const st = drillState(); const r = DR; st.best[r.kind] = Math.max(st.best[r.kind] ?? 0, r.right); let faster = '';
  if (r.timer && r.fast >= 9 && st.limit > 3){ st.limit = Math.max(3, Math.round((st.limit - 0.5) * 10) / 10); faster = ` Nice speed. The timer is now ${st.limit} seconds.`; }
  st.log.push({ date: new Date().toISOString(), kind: r.kind, right: r.right, fast: r.fast, limit: r.limit }); st.log = st.log.slice(-60); Store.set('drill', st);
  const msg = `You got ${r.right} of 10.${faster} Say again for another drill, or home.`;
  app().innerHTML = `<h1>Drill done</h1><div class="card"><p class="big-word" id="drSum">${esc(msg)}</p></div><div class="row"><button class="primary" id="drAgain">Again</button><button onclick="go('drill')">Other drills</button><button onclick="go('home')">Home</button></div>`;
  const k = r.kind; $('#drAgain').onclick = () => go('drill', k); DR = null;
  if (HF.on) HF.enter('drilldone', { msg, kind:k }); else Speech.say(msg);
}
/* ---------------- Audio lessons: listen only, like a podcast ---------------- */
function audioPlaylist(){
  const st = ladState(); const out = [];
  const order = LADDER.levels.slice(st.level - 1).concat(LADDER.levels.slice(0, st.level - 1));
  for (const L of order){
    const lines = [{ say:`Level ${L.n}: ${L.title}.` }];
    for (const b of L.lesson){ if (b.t === 'check'){ lines.push({ say:`Think about this one. ${b.q}`, pause:4000 }); lines.push({ say:`The answer is ${b.a}. ${b.why}` }); }
      else if (b.t === 'say' || b.t === 'li' || b.t === 'p') lines.push({ say:b.x }); }
    const ex = L.sets[0].slice(0, 3);
    if (L.mode === 'say') ex.forEach((q, k) => { lines.push({ say:`Practice ${k + 1}. ${q.say || q.stem}`, pause:5000 }); lines.push({ say:(q.steps || []).join(' ') }); });
    out.push({ title:`Level ${L.n}: ${L.title}`, lines });
  }
  const st2 = vocabState(); const words = VOCAB.slice().sort((a, b) => ((st2.words[a[0]] || {}).right || 0) - ((st2.words[b[0]] || {}).right || 0)).slice(0, 6);
  out.splice(1, 0, { title:'Vocab review', lines: words.flatMap(([w, mean, , hook]) => [{ say:`${w}.`, pause:1500 }, { say:`${w} means ${mean}. ${hook}` }]) });
  const errs = Store.get('errors', []).slice(0, 5);
  if (errs.length) out.splice(2, 0, { title:'Review of your misses', lines: errs.map(e => ({ say:`${e.stem} The answer is ${e.answerText}. ${firstSentence(e.explanation || '')}` })) });
  return typeof earPlaylist === 'function' ? out.concat(earPlaylist()) : out;
}
let AL = null;
let wakeLock = null;
async function keepAwake(on){ try { if (on && 'wakeLock' in navigator && !wakeLock){ wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
  if (!on && wakeLock){ await wakeLock.release(); wakeLock = null; } } catch(e){} }
SCREENS.audio = (arg) => {
  if (!AL) AL = { list: audioPlaylist(), i:0, j:0, playing:false };
  if (arg === 'ei' || arg === 'tips'){ const k = AL.list.findIndex(x => x.group === arg); if (k >= 0 && AL.list[AL.i].group !== arg){ AL.i = k; AL.j = 0; AL.playing = false; } }
  app().innerHTML = `<h1>Audio lessons</h1><div class="card"><p>Listen only. Good for work with earbuds. It talks through the lessons, gives you a moment to think, then says the answer.</p>
    <p>${HF.on ? 'Say pause, resume, next lesson, previous lesson, or repeat that.' : 'Turn on hands-free to control it by voice: pause, resume, next lesson, repeat that.'}</p></div>
    <div class="card"><p class="big-word" id="alNow">${esc(AL.list[AL.i].title)}</p><p id="alLine"></p>
    <div class="row"><button class="primary" id="alPlay">${AL.playing ? 'Pause' : 'Play'}</button><button id="alPrev">Previous lesson</button><button id="alNext">Next lesson</button><button id="alRep">Repeat that</button></div></div>
    <h2>Playlist</h2><ol class="focus-list">${AL.list.map((x, k) => `<li><button class="link" data-al="${k}">${esc(x.title)}</button></li>`).join('')}</ol>`;
  $('#alPlay').onclick = () => AL.playing ? alStop() : alStart();
  $('#alNext').onclick = () => alJump(AL.i + 1); $('#alPrev').onclick = () => alJump(AL.i - 1); $('#alRep').onclick = () => alRepeat();
  $$('[data-al]').forEach(b => b.onclick = () => alJump(+b.dataset.al));
};
function alShow(){ const n = $('#alNow'), l = $('#alLine'); if (!AL) return; if (n) n.textContent = AL.list[AL.i].title; const ln = AL.list[AL.i].lines[Math.max(0, AL.j - 1)]; if (l) l.textContent = ln ? ln.say : '';
  const p = $('#alPlay'); if (p) p.textContent = AL.playing ? 'Pause' : 'Play'; }
// play one line; in hands-free the loop then listens a moment for a command and comes back here (onSilence)
async function alLine(alive){
  if (!AL) return false; let seg = AL.list[AL.i];
  if (AL.j >= seg.lines.length){ AL.i = (AL.i + 1) % AL.list.length; AL.j = 0; seg = AL.list[AL.i]; await Speech.say('Next: ' + seg.title + '.'); if (!alive()) return false; }
  const ln = seg.lines[AL.j++]; alShow(); await Speech.say(ln.say); AL.pauseMs = ln.pause || 600; return true;
}
async function alStart(){ AL.playing = true; alShow(); keepAwake(true);
  if (HF.on){ HF.enter('audio'); return; }
  const my = ++AL.run; const alive = () => AL && AL.playing && AL.run === my && location.hash.startsWith('#audio');
  while (alive()){ if (!(await alLine(alive))) break; await sleep(AL.pauseMs); } }
function alStop(){ if (!AL) return; AL.playing = false; AL.run = (AL.run || 0) + 1; Speech.stop(); keepAwake(false); alShow(); }
function alJump(i){ if (!AL) return; AL.i = (i + AL.list.length) % AL.list.length; AL.j = 0; const was = AL.playing; alStop(); alShow(); if (was || HF.on) alStart(); }
function alRepeat(){ if (!AL) return; AL.j = Math.max(0, AL.j - 1); const was = AL.playing; alStop(); if (was || HF.on) alStart(); }
/* ---------------- Read along: big text, it reads with highlighting, then he reads and gets words correct per minute ---------------- */
function readTexts(){
  const seen = new Set(); const out = [];
  for (const q of allQuestions()){
    if (q.section !== 'PC' || !q.passage || seen.has(q.passage)) continue; const n = q.passage.split(/\s+/).length; if (n > 90) continue; seen.add(q.passage); out.push({ id:q.id, text:q.passage }); }
  VOCAB.slice(0, 12).forEach(([w, mean], k) => { if (k % 3 === 0) out.push({ id:'VOC-' + k, text: VOCAB.slice(k, k + 3).map(([w2, m2]) => `${w2[0].toUpperCase() + w2.slice(1)} means ${m2}.`).join(' ') }); });
  return out;
}
function readScore(target, heard, ms){
  const norm = s => String(s).toLowerCase().replace(/[\u2019']/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const a = norm(target), use = norm(heard);
  // longest common subsequence: which words of the text he said, in order
  const m = a.length, n = use.length; const D = Array.from({ length:m + 1 }, () => new Array(n + 1).fill(0));
  const same = (x, y) => x === y || (x.length >= 5 && lev(x, y) <= 1) || (x.length >= 8 && lev(x, y) <= 2);
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) D[i][j] = same(a[i], use[j]) ? D[i + 1][j + 1] + 1 : Math.max(D[i + 1][j], D[i][j + 1]);
  const hit = new Array(m).fill(false); let i = 0, j = 0;
  while (i < m && j < n){ if (same(a[i], use[j])){ hit[i] = true; i++; j++; } else if (D[i + 1][j] >= D[i][j + 1]) i++; else j++; }
  const correct = hit.filter(Boolean).length; const mins = Math.max(ms, 3000) / 60000;
  return { words: a.length, correct, acc: Math.round(100 * correct / Math.max(1, a.length)), wcpm: Math.round(correct / mins), hit, list: a };
}
let RA = null;
SCREENS.readalong = (arg) => {
  const texts = readTexts(); const log = Store.get('reading', []);
  const k = arg != null && texts[+arg] ? +arg : (log.length % Math.max(1, texts.length)); RA = { k, text: texts[k], texts, reading:false };
  const best = log.reduce((m, x) => Math.max(m, x.wcpm), 0);
  const s = speakable(RA.text.text, 'read-big');
  app().innerHTML = `<h1>Read along</h1>
    <div class="card"><div id="raText">${s.html}</div></div>
    <div class="row"><button class="primary" id="raListen">1. Listen to it</button><button class="primary" id="raMine">2. My turn: read it aloud</button><button id="raDone" class="hidden">I am done reading</button><button id="raNext">Next text</button></div>
    <div id="raOut" aria-live="polite"></div>
    <h2>My reading progress</h2><div class="card" id="raProg">${log.length ? `<p>Best: ${best} words correct per minute.</p><table><tr><th>Date</th><th>Words correct per minute</th><th>Accuracy</th></tr>${log.slice(-8).reverse().map(x => `<tr><td>${esc(x.date.slice(0, 10))}</td><td>${x.wcpm}</td><td>${x.acc}%</td></tr>`).join('')}</table>` : '<p>No readings yet.</p>'}</div>`;
  $('#raListen').onclick = () => Speech.speakEl($('#raText'));
  $('#raMine').onclick = () => readMine(); $('#raDone').onclick = () => { if (Voice.rec) try { Voice.rec.stop(); } catch(e){} };
  $('#raNext').onclick = () => go('readalong', String((k + 1) % texts.length));
};
async function readMine(){
  if (Voice.why()){ toast(Voice.why()); return; }
  if (HF.on){ RA.reading = true; await HF.say('Go ahead. Read the text out loud. Say I am done when you finish.'); return; }
  $('#raDone').classList.remove('hidden'); $('#raOut').innerHTML = '<p class="listen-status"></p>';
  const r = await Voice.listen(90000, { continuous:true }); $('#raDone').classList.add('hidden');
  readResult(r.text || (r.alts || []).join(' '), r.ms || 0);
}
function readResult(heard, ms){
  RA.reading = false; heard = String(heard || '').replace(/\b(i am done|im done|done)\s*$/i, '');
  const sc = readScore(RA.text.text, heard, ms);
  const log = Store.get('reading', []); log.push({ date: new Date().toISOString(), id: RA.text.id, words: sc.words, correct: sc.correct, acc: sc.acc, wcpm: sc.wcpm }); Store.set('reading', log.slice(-100));
  const missed = sc.list.filter((w, i) => !sc.hit[i]).slice(0, 8);
  const msg = `You read ${sc.correct} of ${sc.words} words right. That is ${sc.acc} percent, at ${sc.wcpm} words correct per minute.` + (missed.length ? ` Words to practice: ${missed.join(', ')}.` : ' Every word. Great reading.');
  const o = $('#raOut'); if (o) o.innerHTML = `<div class="card"><p class="big-word" id="raScore">${esc(msg)}</p></div>`;
  return msg;
}
