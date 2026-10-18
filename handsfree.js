/* App-wide hands-free mode. One tap starts it (browsers need one tap to unlock the mic and audio).
   It reads every screen aloud, listens all the time, and runs the whole app by voice.
   Listening pauses while the app talks, so it does not hear itself. Touch keeps working too. */
'use strict';
const FATAL_MIC = ['not-allowed', 'service-not-allowed', 'audio-capture', 'unsupported'];
const GLOBAL_HELP = 'You can always say: home, back, repeat, slower, faster, pause, help, or stop hands-free.';
function lev(a, b){ const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = Array.from({ length:n+1 }, (_, j) => j);
  for (let i = 1; i <= m; i++){ const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1)); prev = cur; } return prev[n]; }
// fuzzy: does the text contain this phrase (word by word, small spelling slips allowed)?
function fuzzyHas(t, phrase){
  if (new RegExp('\\b' + phrase + '\\b').test(t)) return true;
  const tw = t.split(' '), pw = phrase.split(' ');
  for (let s = 0; s + pw.length <= tw.length; s++){
    if (pw.every((w, k) => { const x = tw[s+k]; const d = lev(x, w); return d === 0 || (w.length >= 5 && d <= 1) || (w.length >= 8 && d <= 2); })) return true;
  }
  return false;
}
const anyOf = (t, list) => list.some(p => fuzzyHas(t, p.replace(/'/g, '')));
const SECTION_WORDS = {
  AR: ['arithmetic reasoning', 'arithmetic', 'math word problems'],
  WK: ['word knowledge', 'vocabulary', 'vocab', 'synonyms'],
  PC: ['paragraph comprehension', 'paragraph', 'paragraphs', 'reading comprehension', 'comprehension', 'reading'],
  MK: ['math knowledge', 'mathematics knowledge', 'mathematics'],
  GS: ['general science', 'science'],
  EI: ['electronics information', 'electronics', 'electronic', 'electricity', 'electrical'],
};
function sectionIn(t){ let best = null, bl = 0;
  for (const [k, list] of Object.entries(SECTION_WORDS)) for (const p of list) if (fuzzyHas(t, p) && p.length > bl){ best = k; bl = p.length; }
  return best; }
const isYes = t => /^(yes|yeah|yep|yup|sure|ok|okay|correct|do it|please do|affirmative|yes please)\b/.test(t) || /\byes\b/.test(t);
const isNo = t => /^(no|nope|nah|cancel|don't|do not|negative|not now|never mind)\b/.test(t) || /\bno\b/.test(t);
// "start" style commands must be the whole phrase, so "start MEPS mode" is not read as "start" here
const isGo = (t, more = []) => /^(ok |okay |yes |yeah |lets |let us |please )?(start|begin|go|ready|go ahead|start now|begin now|lets go|start it|start practice|start a set|start the set|start the test|start level|i am ready|im ready)( please| now)?$/.test(t) || /^(yes|yeah|yep|ok|okay)$/.test(t) || more.some(m => fuzzyHas(t, m));
const textOf = el => el ? el.innerText.replace(/\s+/g, ' ').trim() : '';

const HF = {
  on:false, paused:false, talking:0, looping:false, epoch:0, ctxName:'', ctx:null, arg:null, pending:null, dictation:null, silent:0, startFails:0, stage:'', heard:'',
  supported(){ return !Voice.why(); },
  async start(opts = {}){
    const why = Voice.why();
    if (why){ toast(why); if (!opts.quiet) Speech.say(why); renderHfBar(); return false; }
    this.on = true; this.paused = false; this.silent = 0; this.startFails = 0; document.body.classList.add('hf-on'); renderHfBar();
    this.loop();
    const name = (location.hash.slice(1) || 'home').split('/')[0];
    if (opts.fromSession) return true;
    await this.run(async alive => { await Speech.say(opts.auto ? 'Hands-free is back on.' : 'Hands-free is on. Say help any time.'); });
    if (settings.hfAuto == null && !opts.auto){
      const yes = await this.ask('Do you want hands-free to start by itself next time? Say yes or no.');
      settings.hfAuto = !!yes; saveSettings();
      await this.run(async () => { await Speech.say(yes ? 'OK. It will start by itself when the mic is allowed.' : 'OK. Tap Start hands-free next time.'); });
    }
    this.enter(this.ctxName || (VCTX[name] ? name : 'home'), this.arg);
    return true;
  },
  stop(say = true){ this.on = false; this.pending = null; this.dictation = null; Voice.stop(); Speech.stop(); document.body.classList.remove('hf-on'); renderHfBar();
    if (say) Speech.say('Hands-free is off. Tap Start hands-free to turn it back on.'); },
  pause(){ this.paused = true; Speech.stop(); renderHfBar(); this.run(async () => { await Speech.say('Paused. Say resume when you are ready.'); }); },
  resume(){ this.paused = false; renderHfBar(); this.enter(this.ctxName, this.arg); },
  // run a block of speech; any newer run or a screen change ends the old one
  async run(fn){
    const ep = ++this.epoch; this.talking++; Voice.stop(); this.setStage('speaking');
    try { await fn(() => ep === this.epoch && this.on); } catch (e){ console.warn('hands-free:', e); }
    finally { this.talking--; if (!this.talking) this.setStage(this.on ? 'listening' : ''); }
  },
  say(text){ return this.run(async () => { await Speech.say(text); }); },
  // a yes/no question by voice
  ask(question){ return new Promise(resolve => { this.pending = { question, resolve }; this.run(async () => { await Speech.say(question); }); }); },
  enter(name, arg){
    this.ctxName = name; this.arg = arg; this.ctx = VCTX[name] || null; this.dictation = null;
    renderHfBar(); if (!this.on || this.paused) return;
    if (this.ctx && this.ctx.intro) this.run(alive => this.ctx.intro(alive, arg));
  },
  setStage(s){ this.stage = s; const el = document.getElementById('hfState'); if (el) el.textContent = !this.on ? '' : this.paused ? 'Paused. Say "resume".' : s === 'speaking' ? 'Speaking...' : 'Listening. Say "help".'; },
  async loop(){
    if (this.looping) return; this.looping = true;
    try {
      while (this.on){
        if (this.talking > 0 || (Speech.ok && (speechSynthesis.speaking || speechSynthesis.pending))){ await sleep(120); continue; }
        this.setStage('listening');
        const r = await Voice.listen(this.dictation ? 20000 : 12000);
        if (!this.on) break;
        if (this.talking > 0) continue;              // the app started talking: ignore this turn
        if (r.error){
          if (FATAL_MIC.includes(r.error)){ this.micBlocked(r.error); break; }
          if (r.error === 'start-failed'){ if (++this.startFails > 8){ this.micBlocked(r.error); break; } await sleep(400); continue; }
          this.startFails = 0;
          if (r.error === 'no-speech' || r.error === 'aborted'){ if (r.error === 'no-speech' && ++this.silent % 8 === 0 && !this.paused && !this.dictation) await this.say('I am still listening. Say help to hear what you can say.'); continue; }
          await sleep(500); continue;                 // network or other: try again
        }
        this.startFails = 0; this.silent = 0;
        // do not await: a command may ask a yes/no question, and this loop must keep listening for the reply
        this.handle(r.alts && r.alts.length ? r.alts : [r.text], r.text || '').catch(e => console.warn('hands-free:', e));
        await sleep(150);
      }
    } finally { this.looping = false; this.setStage(''); }
  },
  micBlocked(err){
    const msg = err === 'audio-capture' ? 'I cannot find a microphone.' : (Voice.why() || 'The microphone is blocked. Allow the mic for this site, then tap Start hands-free.');
    this.on = false; document.body.classList.remove('hf-on'); renderHfBar(); toast(msg); Speech.say(msg + ' You can still tap the buttons.');
  },
  async handle(alts, raw){
    const all = alts.map(normalize).filter(Boolean); if (!all.length) return;
    let t = all[0];
    this.heard = raw; const hv = document.getElementById('hfHeard'); if (hv) hv.textContent = raw ? `I heard: "${raw}"` : '';
    if (settings.hfWake){ const w = all.find(x => /^(hey )?coach\b/.test(x)); if (!w && !this.pending && !this.dictation) return; if (w) t = w.replace(/^(hey )?coach\b\s*/, ''); if (!t) { await this.say('Yes?'); return; } }
    if (this.paused){ if (anyOf(t, ['resume', 'start listening', 'wake up', 'continue', 'i am back', 'im back', 'unpause'])) this.resume(); return; }
    if (this.pending){
      const p = this.pending;
      if (isYes(t) && !isNo(t)){ this.pending = null; p.resolve(true); return; }
      if (isNo(t)){ this.pending = null; p.resolve(false); return; }
      await this.say('Please say yes or no. ' + p.question); return;
    }
    if (this.dictation){ await this.dictation.onText(t, raw); return; }
    // an exact answer text ("faster", "steel") beats any command word
    if (this.ctx && this.ctx.choices){ const ch = this.ctx.choices(); if (ch){ const i = ch.map(normalize).indexOf(t); if (i >= 0){ this.ctx.pick(i); return; } } }
    // global commands first
    if (anyOf(t, ['stop hands free', 'turn off hands free', 'exit hands free', 'hands free off', 'stop handsfree'])){ this.stop(); return; }
    if (anyOf(t, ['pause', 'stop listening', 'be quiet', 'hold on', 'wait a minute', 'take a break'])){ this.pause(); return; }
    if (/^(help|what can i say|commands|options|what do i say)\b/.test(t) || t === 'help me'){ await this.help(); return; }
    if (anyOf(t, ['slower', 'slow down', 'too fast'])){ settings.rate = Math.max(0.5, Math.round((Number(settings.rate) - 0.1) * 10) / 10); saveSettings(); await this.say(`Slower. Speed ${settings.rate}.`); return; }
    if (anyOf(t, ['faster', 'speed up', 'too slow'])){ settings.rate = Math.min(1.6, Math.round((Number(settings.rate) + 0.1) * 10) / 10); saveSettings(); await this.say(`Faster. Speed ${settings.rate}.`); return; }
    if (/\bwhat level am i\b|\bmy level\b|\bwhat level\b|\bwhich level\b/.test(t)){ await this.say(levelReport()); return; }
    if (this.ctx && this.ctx.handle){ const done = await this.ctx.handle(t, all, raw, this.arg); if (done) return; }
    if (/\b(repeat|again|say that again|what was that|say it again|one more time)\b/.test(t)){ this.enter(this.ctxName, this.arg); return; }
    if (await this.nav(t)) return;
    await this.say("I didn't catch that. Say it again, or say help.");
  },
  async help(){
    const h = this.ctx && this.ctx.help ? (typeof this.ctx.help === 'function' ? this.ctx.help(this.arg) : this.ctx.help) : 'Say a section name, math ladder, MEPS, progress, tutor, or review misses.';
    await this.say(h + ' ' + GLOBAL_HELP);
  },
  async leaveMeps(){ if (!(M && M.running)) return true; const yes = await this.ask('Quit the MEPS test? Your run will end. Say yes or no.');
    if (yes){ M.running = false; clearInterval(M.timer); } else { await this.say('OK. Keep going.'); if (M && M.running && M.q && this.ctxName === 'mepsq') this.enter('mepsq'); } return yes; },
  async nav(t){
    const to = async (name, arg) => { if (M && M.running && !(await this.leaveMeps())) return true; go(name, arg); return true; };
    if (anyOf(t, ['home', 'main menu', 'go home', 'start over', 'menu'])) return to('home');
    if (/^(go )?back\b|\bgo back\b|\bprevious screen\b/.test(t)){ const prev = NAV_STACK.length > 1 ? NAV_STACK[NAV_STACK.length - 2] : ['home']; NAV_STACK.splice(-2); return to(prev[0], prev[1]); }
    if (anyOf(t, ['meps', 'meps mode', 'practice test', 'full test', 'mock test', 'meps test', 'maps mode', 'meeps'])) return to('meps');
    if (anyOf(t, ['progress', 'my progress', 'my scores', 'scores', 'score report', 'line score', 'line scores'])) return to('progress');
    if (anyOf(t, ['error log', 'my misses', 'review misses', 'misses', 'mistakes', 'review my misses', 'missed questions', 'review'])) return to('review');
    if (anyOf(t, ['tutor', 'tutor me', 'teacher', 'help me learn'])) return to('tutor');
    if (anyOf(t, ['settings', 'options menu'])) return to('settings');
    if (/\b(ladder|catch up|catchup)\b/.test(t) || (/\b(go to|work on|learn|study|teach me|open|level)\b/.test(t) && ladderFind(t))){
      const n = ladderFind(t); return to(/\blevel\b|go to|work on|learn|study|teach me|open/.test(t) && n ? 'ladder' : 'ladder', n ? String(n) : undefined); }
    if (anyOf(t, ['it focus', 'the plan', 'my plan', 'what should i practice', 'what should i study', 'focus plan'])){ await this.say(itPlanText(true)); return true; }
    if (anyOf(t, ['streak', 'my streak', 'daily goal'])){ const s = streakInfo(); await this.say(`Today: ${s.todayCount} of ${DAILY_GOAL}. Streak: ${s.streak} day${s.streak === 1 ? '' : 's'}.`); return true; }
    const sec = sectionIn(t); if (sec) return to('practice', sec);
    if (anyOf(t, ['practice', 'start practice', 'lets practice'])){ const f = itFocus(practiceEstimates())[0]; return to('practice', f.k); }
    if (anyOf(t, ['hands free practice', 'voice practice'])) return to('handsfree');
    return false;
  },
  // free speech capture (tutor question, lock-in rule)
  dictate(input, prompt, onDone){
    this.dictation = { onText: async (t, raw) => {
      if (/^(done|finished|that's it|thats it|that is it|i'm done|im done|end|stop)$/.test(t) || /\b(i'm done|im done|that's all|thats all)\b/.test(t)){ this.dictation = null; await onDone(input.value.trim()); return; }
      if (/^(cancel|never mind)$/.test(t)){ this.dictation = null; await this.say('Canceled.'); this.enter(this.ctxName, this.arg); return; }
      if (/^(clear|start over|erase)$/.test(t)){ input.value = ''; await this.say('Cleared. Say it again.'); return; }
      if (/^(read it back|read it|repeat)$/.test(t)){ await this.say(input.value || 'Nothing yet.'); return; }
      input.value = (input.value ? input.value + ' ' : '') + raw; await this.say('Got it. Say more, or say done.');
    } };
    return this.say(prompt);
  },
};
let NAV_STACK = [];
function levelReport(){
  const lv = SEC_ORDER.map(k => `${SECTIONS[k]}: level ${level(k)} of 3`).join('. ');
  return ladderStatusText() + ' Practice levels: ' + lv + '.';
}
function itPlanText(full){
  const e = practiceEstimates(); const f = itFocus(e);
  const top = f.slice(0, 2).map(o => `${SECTIONS[o.k]}${o.v != null ? ', estimate ' + o.v : ''}. ${o.why}`).join(' Then ');
  let s = `IT focus for today: ${top}`;
  if (full && e.S.AR != null && e.S.MK != null && e.S.EI != null && e.S.VE != null) s += ` Your main IT rule estimate is ${e.S.AR + e.S.MK + e.S.EI + e.S.VE}. You need 212.`;
  return s + ' This is an estimate only. Confirm with a recruiter.';
}
function renderHfBar(){
  let bar = document.getElementById('hfBar');
  if (!bar){ bar = document.createElement('div'); bar.id = 'hfBar'; bar.setAttribute('role', 'status'); const h = document.querySelector('header.top'); (h || document.body).insertAdjacentElement('afterend', bar); }
  if (!HF.on){ bar.className = 'hf-bar off'; bar.innerHTML = ''; return; }
  bar.className = 'hf-bar';
  bar.innerHTML = `<span class="listen-dot"></span><strong>Hands-free</strong> <span id="hfState"></span> <span id="hfHeard"></span>
    <button class="small" id="hfPauseTop">${HF.paused ? 'Resume' : 'Pause'}</button><button class="small" id="hfStopTop">Stop hands-free</button>`;
  $('#hfPauseTop').onclick = () => HF.paused ? HF.resume() : HF.pause(); $('#hfStopTop').onclick = () => HF.stop();
  HF.setStage(HF.stage);
}
// speech engines that need a tap first (autoplay rules): show one big "tap anywhere" layer
Speech.onBlocked = () => {
  if (document.getElementById('tapLayer')) return;
  const d = document.createElement('button'); d.id = 'tapLayer'; d.className = 'tap-layer'; d.textContent = 'Tap anywhere to turn on the voice';
  d.onclick = () => { d.remove(); if (HF.on) HF.enter(HF.ctxName, HF.arg); else HF.start(); }; document.body.appendChild(d);
};

/* ---------- what each screen says and hears ---------- */
const sayEl = (sel, prefix) => Speech.speakEl(typeof sel === 'string' ? $(sel) : sel, prefix);
function answerFrom(all, choices){ return parseVoice(all, choices); }
const VCTX = {
  home: {
    help: 'Say a section name, like arithmetic, word knowledge, or electronics. Or say practice, math ladder, MEPS, progress, tutor, review misses, the plan, or settings.',
    async intro(alive){
      const s = streakInfo();
      await Speech.say(`Home. Today you did ${s.todayCount} of ${DAILY_GOAL} questions. Streak: ${s.streak} day${s.streak === 1 ? '' : 's'}.`); if (!alive()) return;
      await Speech.say(itPlanText(false)); if (!alive()) return;
      await Speech.say('Say a section name, practice, math ladder, MEPS, progress, tutor, review misses, or help.');
    },
  },
  practice: {
    help: sec => `Say start to begin. Say five, ten, or fifteen questions. Say timer on or timer off. Or say another section name.`,
    async intro(alive, sec){
      const n = HF.count || 10;
      await Speech.say(`${SECTIONS[sec]}. Level ${level(sec)} of 3. ${dueList(sec).length} due for review. Say start to begin ${n} questions. Say timer on or off. Or say help.`);
    },
    async handle(t, all, raw, sec){
      const n = numberIn(t); if (n && [5,10,15].includes(n) && /question|^\w+$/.test(t)){ HF.count = n; await HF.say(`${n} questions. Say start.`); return true; }
      if (/\btimer (on|off)\b/.test(t)){ settings.timerOn = /on/.test(t.match(/timer (on|off)/)[1]); saveSettings(); const c = $('#timerOn'); if (c) c.checked = settings.timerOn; await HF.say(`Timer ${settings.timerOn ? 'on' : 'off'}. Say start.`); return true; }
      if (isGo(t) || t === 'practice'){ startSession(sec, HF.count || 10, { hf:true, timer:settings.timerOn }); return true; }
      return false;
    },
  },
  handsfree: {
    help: 'Say a section name to start 10 questions. For example: arithmetic, or electronics.',
    async intro(){ await Speech.say('Hands-free practice. Say a section name to start 10 questions.'); },
    async handle(t){ const sec = sectionIn(t); if (sec){ startSession(sec, 10, { hf:true, timer:false }); return true; } return false; },
  },
  prereview: {
    help: 'Say next miss to hear the next one. Say skip review or start to begin practice.',
    async intro(alive, st){ st.k = 0; await Speech.say(`Quick look at your last ${st.errs.length} misses before you start. Say skip review to start now.`); if (!alive()) return; await readMiss(st, alive); },
    async handle(t, all, raw, st){
      if (anyOf(t, ['skip review', 'skip']) || isGo(t)){ st.next(); return true; }
      if (anyOf(t, ['next miss', 'next', 'next one', 'another'])){ st.k++; if (st.k >= st.errs.length){ await HF.say('That was the last one. Say start.'); return true; } HF.run(alive => readMiss(st, alive)); return true; }
      if (/\b(repeat|again)\b/.test(t)){ HF.run(alive => readMiss(st, alive)); return true; }
      return false;
    },
  },
  question: {
    choices: () => S && !S.answered ? S.qs[S.i].choices : null, pick: i => answer(i),
    help: 'Say A, B, C, or D. Or say the answer words. You can say repeat, read the passage, read the choices, hint, skip, or end practice.',
    async intro(alive){ if (!S) return; await readQuestionAloud(S.qs[S.i]); if (!alive()) return; await Speech.say('Your answer?'); },
    async handle(t, all){
      if (!S) return false; const q = S.qs[S.i];
      if (anyOf(t, ['read the passage', 'passage', 'read passage'])){ HF.run(async () => { await (q.passage ? sayEl('.passage-text', 'Passage.') : Speech.say('This question has no passage.')); }); return true; }
      if (anyOf(t, ['read the choices', 'choices', 'options', 'read the options'])){ HF.run(async alive => { const chs = $$('.choice'); for (let i = 0; i < chs.length && alive(); i++) await sayEl(chs[i].querySelector('span[id]'), LET[i] + '.'); }); return true; }
      if (/\b(hint|clue|explain|help me)\b/.test(t)){ const h = showHint(q); await HF.say(h || 'No more hints. Give it your best try.'); return true; }
      if (/\b(skip|next|pass)\b/.test(t)){ await HF.say('Skipping.'); nextQ(); return true; }
      if (anyOf(t, ['end practice', 'quit', 'end set', 'stop practice', 'i am done', 'finish'])){ const y = await HF.ask('End this set? Say yes or no.'); if (y) endSession(); else HF.enter('question'); return true; }
      if (/\btime\b/.test(t) && S.timerOn){ await HF.say(`Time left: ${fmtTime(S.left)}.`); return true; }
      const p = answerFrom(all, q.choices); if (p && p.type === 'answer'){ answer(p.index); return true; }
      if (p && p.type === 'cmd' && p.cmd === 'repeat'){ HF.enter('question'); return true; }
      return false;
    },
  },
  feedback: {
    help: 'Say sure, shaky, or guessed. Or say repeat, or explain.',
    async intro(alive, whyId){ await sayEl('#' + whyId); if (!alive()) return; await Speech.say('How sure were you? Say sure, shaky, or guessed.'); },
    async handle(t, all, raw, whyId){
      if (/\b(explain|steps|why|step by step)\b/.test(t)){ HF.run(async alive => { await sayEl('ol.steps'); if (alive()) await Speech.say('How sure were you? Say sure, shaky, or guessed.'); }); return true; }
      const p = parseVoice(all, null);
      if (p && p.type === 'conf'){ const msg = setConf(p.value); HF.enter('afterconf', msg); return true; }
      if (/\bnext\b/.test(t)){ setConf('shaky'); nextQ(); return true; }
      return false;
    },
  },
  afterconf: {
    help: 'Say next for the next question. Say explain to hear the steps, lesson to hear the lesson, or tutor me.',
    async intro(alive, msg){ await Speech.say(msg.replace('Here is the lesson.', 'Say lesson to hear it.')); if (!alive()) return; await Speech.say(S && S.i + 1 < S.qs.length ? 'Say next, or explain.' : 'Say next to see your score.'); },
    async handle(t){
      if (!S) return false; const q = S.qs[S.i];
      if (/\b(next|continue|go on|move on|score|ready)\b/.test(t)){ nextQ(); return true; }
      if (/\b(explain|steps|why)\b/.test(t)){ HF.run(async () => { await sayEl('ol.steps'); await Speech.say('Say next when you are ready.'); }); return true; }
      if (/\blesson\b/.test(t)){ HF.run(async alive => { const L = LESSONS[q.topic]; if (!L){ await Speech.say('No lesson for this one.'); return; }
        await Speech.say(`${L.name}. ${L.what.join(' ')} The rule: ${L.idea} Example: ${L.worked.join(' ')}`); if (alive()) await Speech.say('Say next when you are ready.'); }); return true; }
      if (anyOf(t, ['tutor me', 'tutor', 'help me with this'])){ const qq = q; go('tutor'); startBankTutor(qq); return true; }
      return false;
    },
  },
  done: {
    help: 'Say practice again, progress, math ladder, or home.',
    async intro(alive, info){ await sayEl('#setSum'); if (!alive()) return; await Speech.say('Say practice again, progress, or home.'); },
    async handle(t, all, raw, info){ if (anyOf(t, ['practice again', 'again', 'another set', 'one more set'])){ go('practice', info.sec); return true; } return false; },
  },
  tutor: {
    help: 'Say my last miss, or miss number 2. Say new question to say a question out loud.',
    async intro(alive){ const n = Store.get('errors', []).length; await Speech.say(`Tutor. You have ${n} saved miss${n === 1 ? '' : 'es'}. Say my last miss, miss number 2, or new question to say a question out loud.`); },
    async handle(t){
      const errs = Store.get('errors', []);
      const tutorMiss = k => { const e = errs[k]; if (!e){ HF.say('I do not have that one. Say my last miss.'); return; } startBankTutor(e.q || qById(e.qid), e.guess); };
      if (anyOf(t, ['new question', 'my own question', 'dictate', 'say a question', 'type a question', 'paste a question', 'paste'])){
        const box = $('#pasteQ'); if (!box) return false; box.value = '';
        HF.dictate(box, 'Say your question and the choices. Say done when you finish.', async text => {
          if (!text){ await HF.say('I did not get a question. Say new question to try again.'); return; }
          const a = $('#pasteA'); HF.dictate(a, 'What did you answer? Say it, or say done to skip.', async () => { startPasteTutor(text, a.value.trim()); });
        }); return true; }
      if (/\b(miss|question|number)\b/.test(t) && numberIn(t)){ tutorMiss(numberIn(t) - 1); return true; }
      if (anyOf(t, ['last miss', 'my last miss', 'latest', 'last one', 'most recent']) || isGo(t)){ tutorMiss(0); return true; }
      return false;
    },
  },
  banktutor: {
    choices: () => T && !T.solved ? T.q.choices : null, pick: i => { if (!T.wrong.has(i)) tutorTry(i); },
    help: 'Say your answer, like A or Bravo. Or say I don\'t know, hint, show the answer, read the question, or try a similar one.',
    async intro(){ /* the tutor messages are read as they appear */ },
    async handle(t, all){
      if (!T) return false;
      if ($('#rule') && !T.ruleDone){ if (anyOf(t, ['skip', 'next', 'similar', 'try a similar one'])) { $('#ruleOk').click(); T.ruleDone = true; } else { $('#rule').value = t.replace(/^(my rule is|the rule is)\s*/, ''); $('#ruleOk').click(); T.ruleDone = true; return true; } }
      if (T.solved && anyOf(t, ['similar', 'try a similar one', 'another one', 'another', 'next', 'yes'])){ $('#tSimilar') && $('#tSimilar').click(); return true; }
      if (anyOf(t, ["i don't know", 'i dont know', 'no idea', 'not sure', 'dunno'])){ const b = $('#tIdk'); if (b) b.click(); return true; }
      if (/\b(hint|clue)\b/.test(t)){ const b = $('#tHint'); if (b) b.click(); return true; }
      if (anyOf(t, ['show the answer', 'show me the answer', 'tell me the answer', 'what is the answer', 'give up'])){ const b = $('#tShow'); if (b) b.click(); return true; }
      if (anyOf(t, ['read the question', 'read it', 'question'])){ HF.run(() => readQuestionAloud(T.q)); return true; }
      if (!T.solved){ const p = parseVoice(all, T.q.choices); if (p && p.type === 'answer'){ if (T.wrong.has(p.index)){ await HF.say(`You already tried ${LET[p.index]}. Pick another one.`); return true; } tutorTry(p.index); return true; } }
      return false;
    },
  },
  chat: {
    help: 'Just talk. I send what you say to the tutor. Say hint, or I don\'t know.',
    async intro(){},
    async handle(t, all, raw){
      if (!CHAT) return false;
      if (/\b(hint|clue)\b/.test(t)){ chatSend('Can I have the next hint?'); return true; }
      if (anyOf(t, ["i don't know", 'i dont know', 'no idea'])){ chatSend("I don't know."); return true; }
      if (/^(home|back|help|go home|main menu|progress|meps)\b/.test(t)) return false;
      chatSend(raw); return true;
    },
  },
  review: {
    help: 'Say next to hear the next miss. Say tutor me, remove this one, or home.',
    async intro(alive, f){ const list = reviewList(f); HF.revK = 0; await Speech.say(`My misses. ${list.length} saved.` + (list.length ? ' Here is the newest.' : ' Nice work.')); if (!alive() || !list.length) return; await readReviewItem(alive); },
    async handle(t){
      const list = reviewList(HF.arg); if (!list.length) return false;
      if (/\b(next|another)\b/.test(t)){ HF.revK++; if (HF.revK >= Math.min(list.length, 100)){ HF.revK = 0; await HF.say('That was the last one. Starting over.'); } HF.run(readReviewItem); return true; }
      if (/\b(previous|last one|go back one)\b/.test(t)){ HF.revK = Math.max(0, HF.revK - 1); HF.run(readReviewItem); return true; }
      if (anyOf(t, ['tutor me', 'tutor', 'help me with this'])){ const e = list[HF.revK]; go('tutor'); startBankTutor(e.q || qById(e.qid), e.guess); return true; }
      if (anyOf(t, ['remove', 'remove this one', 'delete', 'delete this one', 'i got it'])){ const e = list[HF.revK];
        const y = await HF.ask('Remove this miss from your list? Say yes or no.');
        if (y){ Store.set('errors', Store.get('errors', []).filter(x => x.id !== e.id)); go('review', HF.arg); await HF.say('Removed.'); } else await HF.say('Kept.'); return true; }
      return false;
    },
  },
  progress: {
    help: 'Say read the sections to hear each score. Say the plan, home, or a section name.',
    async intro(alive){
      await Speech.say('My progress.'); if (!alive()) return;
      const panel = $('#itPanel'); if (panel){ for (const el of $$('h3, p', panel)){ if (!alive()) return; if (el.closest('.notice')) continue; await Speech.say(textOf(el)); } }
      if (!alive()) return; await Speech.say('Estimate only. Confirm with a recruiter.');
      const relearn = Object.entries(Store.get('topics', {})).filter(([k, v]) => v.relearn && LESSONS[k]).map(([k]) => LESSONS[k].name);
      if (alive() && relearn.length) await Speech.say('Topics to re-learn: ' + relearn.slice(0, 6).join(', ') + '.');
      if (alive()) await Speech.say('Say read the sections, the plan, or home.');
    },
    async handle(t){
      if (anyOf(t, ['read the sections', 'sections', 'section scores', 'read sections'])){ HF.run(async alive => { const att = Store.get('attempts', {});
        for (const k of SEC_ORDER){ if (!alive()) return; const a = att[k] || []; await Speech.say(`${SECTIONS[k]}: level ${level(k)} of 3. ${a.length ? `Last score ${a[a.length-1].pct} percent.` : 'No scores yet.'}`); } }); return true; }
      return false;
    },
  },
  lesson: {
    help: 'Say practice this topic, tutor me, repeat, or back.',
    async intro(alive, topic){ const L = LESSONS[topic]; if (!L) return; await Speech.say(`Lesson: ${L.name}. What it is: ${L.what.join(' ')} Why it matters: ${L.why} Example: ${L.example.join(' ')} The rule: ${L.idea} Worked example: ${L.worked.join(' ')}`); if (alive()) await Speech.say('Say practice this topic, or tutor me.'); },
    async handle(t, all, raw, topic){ const L = LESSONS[topic]; if (!L) return false;
      if (anyOf(t, ['practice this topic', 'practice it']) || isGo(t) || t === 'practice'){ startSession(L.section, 5, { topic, hf:true }); return true; }
      if (anyOf(t, ['tutor me', 'tutor'])){ const pool = sectionPool(L.section).filter(q => q.topic === topic); if (pool.length) startBankTutor(pick(pool)); return true; }
      return false; },
  },
  settings: {
    help: 'Say slower, faster, read along on or off, dark mode on or off, auto start on or off, wake word on or off, or home.',
    async intro(){ await Speech.say(`Settings. Reading speed ${settings.rate}. Auto start is ${settings.hfAuto ? 'on' : 'off'}. Wake word is ${settings.hfWake ? 'on. Start each command with the word coach' : 'off'}. ` + VCTX.settings.help); },
    async handle(t){
      const onoff = t.match(/\b(on|off)\b/); if (!onoff) return false; const v = onoff[1] === 'on';
      const set = async (k, name) => { settings[k] = v; saveSettings(); await HF.say(`${name} ${v ? 'on' : 'off'}.`); go('settings'); return true; };
      if (/read ?along|highlight/.test(t)) return set('readAlong', 'Read along');
      if (/dark/.test(t)) return set('dark', 'Dark mode');
      if (/auto ?start|start by itself|remember/.test(t)) return set('hfAuto', 'Auto start');
      if (/wake/.test(t)) return set('hfWake', 'Wake word');
      if (/timer/.test(t)) return set('timerOn', 'Practice timer');
      return false;
    },
  },
  meps: {
    help: 'Say start the test to begin. Say home to leave.',
    async intro(){ await Speech.say(`MEPS practice test. Six parts in the real order. 85 questions. 144 minutes. No hints and no going back. If time runs out, the rest count as random guesses. So answer every question. Say start the test, or home.`); },
    async handle(t){ if (isGo(t, ['start meps', 'start meps mode'])){ $('#mStart').click(); return true; } return false; },
  },
  mepspart: {
    help: 'Say begin to start this part now. Say quit to end the test.',
    async intro(){ if (!M) return; const k = MEPS_ORDER[M.part]; const [n, min] = CAT[k]; await Speech.say(`Part ${M.part + 1} of ${MEPS_ORDER.length}: ${SECTIONS[k]}. ${n} questions. ${min} minutes. Say begin. Or it starts by itself.`); },
    async handle(t){
      if (isGo(t)){ const b = $('#mBegin'); if (b) b.click(); return true; }
      if (anyOf(t, ['quit', 'quit meps', 'end the test', 'stop the test', 'exit'])){ if (await HF.leaveMeps()) go('home'); return true; }
      return false;
    },
  },
  mepsq: {
    choices: () => M && M.q ? M.q.choices : null, pick: i => mepsAnswer(i),
    help: 'Say A, B, C, or D, or the answer words. Say repeat, read the passage, read the choices, or time left. There are no hints in MEPS mode.',
    async intro(alive){ if (!M || !M.q) return; await readQuestionAloud(M.q); if (alive()) await Speech.say('Your answer?'); },
    async handle(t, all){
      if (!M || !M.q) return false;
      if (/\btime\b/.test(t)){ await HF.say(`Time left: ${spokenTime((M.end - Date.now()) / 1000)}. Questions left: ${M.n - M.done}.`); return true; }
      if (/\b(hint|clue|explain|tutor)\b/.test(t)){ await HF.say('No hints in MEPS mode. Just like the real test. Give it your best answer.'); return true; }
      if (anyOf(t, ['read the passage', 'passage'])){ HF.run(async () => { await (M.q.passage ? sayEl('.passage-text', 'Passage.') : Speech.say('No passage.')); }); return true; }
      if (anyOf(t, ['read the choices', 'choices', 'options'])){ HF.run(async alive => { const chs = $$('.choice'); for (let i = 0; i < chs.length && alive(); i++) await sayEl(chs[i].querySelector('span[id]'), LET[i] + '.'); }); return true; }
      if (anyOf(t, ['quit', 'quit meps', 'end the test', 'stop the test', 'exit'])){ if (await HF.leaveMeps()) go('home'); return true; }
      if (/\b(skip|next|pass)\b/.test(t)){ await HF.say('No skipping on the real test. Pick your best answer. A guess is better than nothing.'); return true; }
      const p = parseVoice(all, M.q.choices); if (p && p.type === 'answer'){ mepsAnswer(p.index); return true; }
      return false;
    },
  },
  mepsreport: {
    help: 'Say review misses, progress, or home.',
    async intro(alive){ await sayEl('#mepsSum'); if (!alive()) return;
      const panel = $('#itPanel'); if (panel) for (const el of $$('h3, p', panel)){ if (!alive()) return; if (el.closest('.notice')) continue; await Speech.say(textOf(el)); }
      if (alive()) await Speech.say('Estimate only. Confirm with a recruiter. Say review misses, progress, or home.'); },
  },
  ladder: {
    help: 'Say start to do a set of 10. Say lesson to hear the lesson. Say placement test to find your level. Say go to fractions, or level 6, to move. Say what level am I.',
    async intro(alive, arg){ const st = ladState(); const view = Math.min(15, Math.max(1, +arg || st.level));
      await Speech.say(ladderStatusText() + (view !== st.level ? ` You are looking at level ${view}: ${ladLevel(view).title}.` : '')); if (!alive()) return;
      await Speech.say(st.placed ? 'Say start, lesson, go to a level, or help.' : 'New here? Say placement test. Or say start, lesson, or help.'); },
    async handle(t, all, raw, arg){
      const view = Math.min(15, Math.max(1, +arg || ladState().level));
      if (anyOf(t, ['placement test', 'placement', 'placement check', 'find my level'])){ ladStart(0); return true; }
      const n = ladderFind(t); if (n && n !== view){ go('ladder', String(n)); return true; }
      if (/\blesson\b/.test(t)){ go('ladlesson', String(view)); return true; }
      if (isGo(t) || t === 'practice'){ ladStart(view); return true; }
      if (n){ go('ladder', String(n)); return true; }
      return false;
    },
  },
  ladlesson: {
    help: 'Say start to do a set. Say repeat to hear the lesson again. Say back to the ladder.',
    async intro(alive, arg){ const n = +arg || ladState().level; await Speech.say(`Level ${n} lesson: ${ladLevel(n).title}.`); if (!alive()) return; await sayEl('#ladLessonBody'); if (alive()) await Speech.say('Say start to do a set of 10.'); },
    async handle(t, all, raw, arg){ if (isGo(t) || t === 'practice'){ ladStart(+arg || ladState().level); return true; } return false; },
  },
  ladq: {
    choices: () => LR && !LR.answered ? LR.qs[LR.i].choices : null, pick: i => ladAnswer(i),
    help: 'Say A, B, C, or D, or the answer. Say repeat, hint, or end.',
    async intro(alive){ if (!LR) return; await readQuestionAloud(LR.qs[LR.i]); if (alive()) await Speech.say('Your answer?'); },
    async handle(t, all){
      if (!LR) return false; const q = LR.qs[LR.i];
      if (/\b(hint|clue|help me)\b/.test(t)){ await HF.say(ladHint()); return true; }
      if (anyOf(t, ['read the choices', 'choices'])){ HF.run(async alive => { const chs = $$('.choice'); for (let i = 0; i < chs.length && alive(); i++) await sayEl(chs[i].querySelector('span[id]'), LET[i] + '.'); }); return true; }
      if (anyOf(t, ['end', 'quit', 'stop the set', 'end set'])){ const y = await HF.ask('End this set? Say yes or no.'); if (y) go('ladder'); else HF.enter('ladq'); return true; }
      const p = parseVoice(all, q.choices); if (p && p.type === 'answer'){ ladAnswer(p.index); return true; }
      return false;
    },
  },
  ladfb: {
    help: 'Say next. Or say repeat to hear why again.',
    async intro(alive, whyId){ await sayEl('#' + whyId); if (alive()) await Speech.say(LR && LR.i + 1 < LR.qs.length ? 'Say next.' : 'Say next to see your score.'); },
    async handle(t){ if (/\b(next|continue|go on|ready|score)\b/.test(t)){ ladNext(); return true; } return false; },
  },
  laddone: {
    help: 'Say start to do the next set. Say lesson, math ladder, or home.',
    async intro(alive, info){ await Speech.say(info.msg); if (alive()) await Speech.say(`Say start for level ${info.level}, lesson, or home.`); },
    async handle(t, all, raw, info){
      if (/\blesson\b/.test(t)){ go('ladlesson', String(info.level)); return true; }
      if (isGo(t, ['next level', 'next set', 'try again']) || t === 'again'){ ladStart(info.level); return true; }
      return false; },
  },
};
function spokenTime(s){ s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60), r = s % 60; return (m ? `${m} minute${m === 1 ? '' : 's'}` : '') + (m && r ? ' and ' : '') + (r || !m ? `${r} second${r === 1 ? '' : 's'}` : ''); }
async function readMiss(st, alive){
  const e = st.errs[st.k]; if (!e) return;
  await Speech.say(`Miss ${st.k + 1} of ${st.errs.length}. ${SECTIONS[e.section] || ''}. ${e.stem} The right answer is: ${dot(e.answerText)} ${firstSentence(e.explanation)}`);
  if (alive()) await Speech.say(st.k + 1 < st.errs.length ? 'Say next miss, or skip review.' : 'That was the last one. Say start.');
}
function reviewList(f){ const errs = Store.get('errors', []); return errs.filter(e => !SECTIONS[f] || e.section === f).slice(0, 100); }
async function readReviewItem(alive){
  const list = reviewList(HF.arg); const e = list[HF.revK]; if (!e) return;
  await Speech.say(`Miss ${HF.revK + 1} of ${list.length}. ${SECTIONS[e.section] || ''}. ${e.stem} You said: ${dot(e.guessText)} The right answer is: ${dot(e.answerText)} ${e.explanation}`);
  if (alive()) await Speech.say('Say next, tutor me, or remove this one.');
}

boot();
