/* ASVAB Coach - single page app. No libraries. Works from http(s), localhost, and file://. */
'use strict';
const BANK = window.ASVAB_BANK;
const SECTIONS = BANK.sections;               // {AR:'Arithmetic Reasoning', ...}
const APP_VERSION = '2.2.0 (bank '+BANK.version+')';
const SEC_ORDER = ['AR','WK','PC','MK','GS','EI'];
const MEPS_ORDER = ['GS','AR','WK','PC','MK','EI'];   // real CAT-ASVAB order (officialasvab.com)
const CAT = BANK.cat;                          // {GS:[15,12], ...} questions, minutes (officialasvab.com, no tryout items)
const LESSONS = BANK.lessons;
const DAILY_GOAL = 10;
const LET = ['A','B','C','D'];
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const app = () => document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random()*a.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtTime = s => { s=Math.max(0,Math.ceil(s)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const dot = s => { s = String(s).trim(); return /[.!?]$/.test(s) ? s : s + '.'; };
const firstSentence = t => (String(t).match(/^.*?[.!?](\s|$)/) || [t])[0].trim();

/* ---------------- storage ---------------- */
const KEY = 'asvab.';
const Store = {
  get(k, d){ try{ const v = localStorage.getItem(KEY+k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(KEY+k, JSON.stringify(v)); }catch(e){ toast('Could not save. Storage is full or blocked.'); } },
  keys(){ return Object.keys(localStorage).filter(k => k.startsWith(KEY)).map(k => k.slice(KEY.length)); }
};
const DEFAULT_SETTINGS = { rate:0.9, voiceURI:'', readAlong:true, timerOn:true, dark:false, apiKey:'', apiBase:'https://api.openai.com/v1', model:'gpt-4o-mini', autoRead:false, hfAuto:null, hfWake:false };
let settings = Object.assign({}, DEFAULT_SETTINGS, Store.get('settings', {}));
function saveSettings(){ Store.set('settings', settings); document.body.classList.toggle('dark', !!settings.dark); }

function allQuestions(){ return BANK.questions.concat(Store.get('custom', [])); }
function qById(id){ return allQuestions().find(q => q.id === id) || (Store.get('errors',[]).find(e => e.q && e.q.id===id) || {}).q; }
function sectionPool(sec){ return allQuestions().filter(q => q.section === sec); }

/* ---------------- daily streak ---------------- */
function bumpDaily(n=1){ const d = Store.get('daily', {}); d[today()] = (d[today()]||0) + n; Store.set('daily', d); renderStreak(); }
function streakInfo(){
  const d = Store.get('daily', {}); const t = d[today()]||0; let streak = 0;
  const day = new Date(); if (t < DAILY_GOAL) day.setDate(day.getDate()-1);
  while ((d[today(day)]||0) >= DAILY_GOAL){ streak++; day.setDate(day.getDate()-1); }
  return { todayCount:t, streak, goalMet: t >= DAILY_GOAL };
}
function renderStreak(){ const s = streakInfo(); const el = document.getElementById('streak');
  if (el) el.textContent = `Today ${Math.min(s.todayCount,DAILY_GOAL)}/${DAILY_GOAL}${s.goalMet?' done':''} | Streak ${s.streak} day${s.streak===1?'':'s'}`; }

/* ---------------- spaced repetition (Leitner, 5 boxes) ---------------- */
const BOX_DAYS = [0, 0, 1, 3, 7, 16];   // index = box. Box 1 comes back after 5 minutes.
function srsUpdate(qid, correct, conf){
  const srs = Store.get('srs', {}); const c = srs[qid] || { box:0, right:0, wrong:0 };
  if (!correct){ c.box = 1; c.wrong++; }
  else { c.right++;
    if (conf === 'sure') c.box = Math.min(5, Math.max(1, c.box) + 1);
    else if (conf === 'shaky') c.box = Math.min(3, Math.max(1, c.box) + 1);
    else c.box = Math.max(1, c.box);               // guessed: stays, comes back tomorrow
  }
  const ms = c.box === 1 ? 5*60*1000 : BOX_DAYS[c.box]*86400000;
  c.due = Date.now() + (correct && conf==='guessed' ? 86400000 : ms);
  c.seen = Date.now(); srs[qid] = c; Store.set('srs', srs);
  const q = qById(qid); if (q && SECTIONS[q.section]) histRecord(q.section, correct);
}
/* per-section rolling accuracy (last 50 answers), used by the score estimate and IT focus plan */
function histRecord(sec, ok){ const h = Store.get('hist', {}); h[sec] = (h[sec] || []).concat(ok ? 1 : 0).slice(-50); Store.set('hist', h); }
function dueList(sec){ const srs = Store.get('srs', {}); const now = Date.now();
  return sectionPool(sec).filter(q => srs[q.id] && srs[q.id].due <= now).sort((a,b) => srs[a.id].box - srs[b.id].box || srs[a.id].due - srs[b.id].due); }

/* ---------------- adaptive difficulty ---------------- */
function level(sec){ return Store.get('level', {})[sec] || 1; }
function adaptRecord(sec, correct){
  const rec = Store.get('recent', {}); const lv = Store.get('level', {});
  const r = (rec[sec] || []).concat(correct ? 1 : 0).slice(-10); let msg = '';
  const cur = lv[sec] || 1;
  if (r.length >= 8){
    const acc = r.reduce((a,b)=>a+b,0) / r.length;
    if (acc > 0.8 && cur < 3){ lv[sec] = cur+1; rec[sec] = []; Store.set('level', lv); Store.set('recent', rec); return `Level up! ${SECTIONS[sec]} is now level ${cur+1} of 3.`; }
    if (acc < 0.6 && cur > 1){ lv[sec] = cur-1; rec[sec] = []; Store.set('level', lv); Store.set('recent', rec); return `Level set to ${cur-1} of 3. We will build up again.`; }
  }
  rec[sec] = r; Store.set('recent', rec); return msg;
}
function pickQuestions(sec, n, opts={}){
  const pool = sectionPool(sec).filter(q => !opts.topic || q.topic === opts.topic);
  const srs = Store.get('srs', {}); const now = Date.now(); const lv = level(sec);
  const chosen = []; const used = new Set();
  const take = q => { if (!used.has(q.id) && chosen.length < n){ chosen.push(q); used.add(q.id); } };
  dueList(sec).filter(q => pool.includes(q)).slice(0, Math.ceil(n/2)).forEach(take);    // missed ones first
  const fresh = q => !srs[q.id];
  const notDue = q => srs[q.id] && srs[q.id].due > now;
  const tiers = [ q => fresh(q) && q.difficulty===lv, q => fresh(q) && Math.abs(q.difficulty-lv)===1, q => fresh(q), q => !notDue(q), () => true ];
  for (const t of tiers){ shuffle(pool.filter(t)).forEach(take); if (chosen.length >= n) break; }
  if (sec === 'PC'){ // keep questions about the same passage next to each other
    const order = []; chosen.forEach(q => { if (!order.includes(q.passageId)) order.push(q.passageId); });
    chosen.sort((a,b) => order.indexOf(a.passageId) - order.indexOf(b.passageId));
  }
  return chosen;
}

/* ---------------- topics: re-learn vs reps ---------------- */
function topicRecord(topic, correct, conf){
  const t = Store.get('topics', {}); const r = t[topic] || { seen:0, relearn:false, sureStreak:0, misses:0 };
  r.seen++; r.last = today();
  if (!correct || conf !== 'sure'){ r.relearn = true; r.sureStreak = 0; if (!correct) r.misses++; }
  else { r.sureStreak++; if (r.sureStreak >= 3) r.relearn = false; }
  t[topic] = r; Store.set('topics', t); return r;
}

/* ---------------- error log ---------------- */
function logError(q, guessIdx, mode){
  const errs = Store.get('errors', []);
  errs.unshift({ id: 'e'+Date.now()+Math.floor(Math.random()*1000), qid:q.id, section:q.section, topic:q.topic, date:new Date().toISOString(), mode,
    stem:q.stem, passage:q.passage||'', choices:q.choices, guess: guessIdx==null ? null : guessIdx, guessText: guessIdx==null ? 'No answer (time ran out)' : q.choices[guessIdx],
    answer:q.answer, answerText:q.choices[q.answer], explanation:q.explanation, steps:q.steps, q });
  Store.set('errors', errs.slice(0, 500));
}

/* ---------------- score tracker ---------------- */
function saveAttempt(sec, correct, total, mode){
  const a = Store.get('attempts', {}); (a[sec] = a[sec] || []).push({ date:new Date().toISOString(), correct, total, pct: Math.round(100*correct/Math.max(1,total)), mode });
  Store.set('attempts', a);
}

function toast(msg){ let t = document.getElementById('toast'); if (!t){ t = document.createElement('div'); t.id='toast';
  t.style.cssText='position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#111;color:#fff;padding:14px 20px;border-radius:12px;z-index:50;font-size:1rem;max-width:90%;border:3px solid #FFD400';
  t.setAttribute('role','status'); document.body.appendChild(t); }
  t.textContent = msg; t.style.display='block'; clearTimeout(t._h); t._h = setTimeout(()=> t.style.display='none', 3500); }

/* ---------------- text to speech with read-along ---------------- */
// Words are wrapped in <span class="w">. We speak a "sayable" version (symbols in words)
// and map each boundary event back to the word span. If boundary events never fire
// (common with online voices), we estimate timing from word length and the rate.
function wordsHTML(text){
  return String(text ?? '').split(/(\s+)/).map(p => /^\s+$/.test(p) || p==='' ? p : `<span class="w">${esc(p)}</span>`).join('');
}
// 3/4 -> "3 fourths", 1/2 -> "1 half": how people say fractions out loud
const DEN_WORD = { 2:['half','halves'], 3:['third','thirds'], 4:['fourth','fourths'], 5:['fifth','fifths'], 6:['sixth','sixths'], 7:['seventh','sevenths'], 8:['eighth','eighths'],
  9:['ninth','ninths'], 10:['tenth','tenths'], 11:['eleventh','elevenths'], 12:['twelfth','twelfths'], 16:['sixteenth','sixteenths'], 100:['hundredth','hundredths'] };
function fracWords(n, d){ const w = DEN_WORD[d]; return w ? `${n} ${n === 1 ? w[0] : w[1]}` : `${n} over ${d}`; }
function sayable(word, prev, next){
  let w = word;
  if (w === 'x' && prev && next && /[\d)]$/.test(prev) && /^[\d(]/.test(next)) return 'times';
  if (w === 'x' && prev && next && /\^?\d*$/.test(prev) && /^x/.test(next)) return 'times';
  if (w === '=') return 'equals'; if (w === '+') return 'plus'; if (w === '-' || w === '−') return 'minus';
  if (w === '/' || w === '÷') return 'divided by'; if (w === '<') return 'is less than'; if (w === '>') return 'is greater than';
  if (w === '*' || w === '×') return 'times';
  w = w.replace(/\^2\b/g, ' squared').replace(/\^3\b/g, ' cubed').replace(/\^\(?(-?\w+)\)?/g, ' to the power of $1')
       .replace(/√/g, ' root ').replace(/π/g, ' pi').replace(/(\d)\s*%/g, '$1 percent').replace(/\|/g, ' absolute ')
       .replace(/(^|[^\w.])(\d+)\/(\d+)(?!\d|\.\d)/g, (m, pre, n, d) => pre + fracWords(+n, +d));
  if (/^\d+\/\d+[.,;:!?]*$/.test(word) && prev && /^-?\d+$/.test(prev)) w = 'and ' + w;   // 2 1/2 -> 2 and 1 half
  if (/^[A-Z]{4,}[.,:;!?"]*$/.test(w.replace(/^["(]/,''))) w = w.toLowerCase();   // ALL-CAPS words: say them, do not spell
  return w;
}
const Speech = {
  ok: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
  gen: 0,   // bumped by stop(): ends every running read
  recent: [], lastEnd: 0,   // what the app said lately (to ignore its own echo)
  seq: 0,   // bumped by each new read: ends the previous read only
  voices(){ return this.ok ? speechSynthesis.getVoices() : []; },
  voice(){ const vs = this.voices(); return vs.find(v => v.voiceURI === settings.voiceURI) || vs.find(v => /^en-US/i.test(v.lang) && v.localService) || vs.find(v => /^en/i.test(v.lang)) || null; },
  stop(){ this.gen++; this.seq++; if (this.ok) speechSynthesis.cancel(); $$('.w.hl').forEach(e => e.classList.remove('hl')); $$('.say[aria-pressed="true"]').forEach(b => b.setAttribute('aria-pressed','false')); },
  // speak plain text (no highlight)
  say(text){ const span = document.createElement('div'); span.innerHTML = wordsHTML(text); return this.speakSpans($$('.w', span), ''); },
  // speak a DOM element that contains .w spans, with highlight
  speakEl(el, prefix=''){ if (!el) return Promise.resolve(); return this.speakSpans($$('.w', el), prefix); },
  async speakSpans(spans, prefix=''){
    if (!this.ok){ toast('This browser cannot read aloud.'); return; }
    const my = ++this.seq, g = this.gen; const alive = () => my === this.seq && g === this.gen;
    speechSynthesis.cancel(); await sleep(60); if (!alive()) return;
    // chunk at sentence ends so long passages are read in small parts (and Chrome does not cut off)
    const chunks = []; let cur = [];
    spans.forEach((s,i) => { cur.push(i); if (/[.!?:]["')]*$/.test(s.textContent) && cur.length >= 3 || cur.length >= 28){ chunks.push(cur); cur=[]; } });
    if (cur.length) chunks.push(cur);
    if (!chunks.length && prefix) chunks.push([]);
    for (let ci=0; ci<chunks.length; ci++){
      if (!alive()) return;
      await this.speakChunk(spans, chunks[ci], ci===0 ? prefix : '', alive);
    }
    spans.forEach(s => s.classList.remove('hl'));
  },
  speakChunk(spans, idxs, prefix, alive){
    return new Promise(resolve => {
      let text = prefix ? prefix + ' ' : ''; const starts = [];
      idxs.forEach((i,k) => { const w = spans[i].textContent; const sw = sayable(w, k?spans[idxs[k-1]].textContent:'', k<idxs.length-1?spans[idxs[k+1]].textContent:'');
        starts.push(text.length); text += sw + ' '; });
      const u = new SpeechSynthesisUtterance(text.trim()); const v = this.voice(); if (v){ u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = Number(settings.rate) || 0.9;
      let gotBoundary = false, timers = [], last = -1, finished = false;
      const mark = k => { if (!settings.readAlong || !alive()) return; if (last >= 0 && spans[idxs[last]]) spans[idxs[last]].classList.remove('hl');
        if (spans[idxs[k]]){ spans[idxs[k]].classList.add('hl'); last = k; } };
      u.onboundary = e => { if (e.name && e.name !== 'word') return; gotBoundary = true; timers.forEach(clearTimeout); timers = [];
        if (prefix && e.charIndex < (starts[0] ?? 0)) return; let k = 0; while (k+1 < starts.length && starts[k+1] <= e.charIndex) k++; mark(k); };
      u.onstart = () => { timers.push(setTimeout(() => { if (gotBoundary || !settings.readAlong) return;
          // fallback estimate: about 14 spoken characters per second at rate 1, plus pauses at punctuation
          const cps = 14 * u.rate, t0 = 400; let t = prefix ? (prefix.length+1)/cps*1000 : 0;
          idxs.forEach((i,k) => { const sw = text.slice(starts[k], (starts[k+1] ?? text.length)); timers.push(setTimeout(() => { if (!gotBoundary) mark(k); }, Math.max(0, t - t0)));
            t += sw.length/cps*1000 + (/[.,;:!?]$/.test(spans[i].textContent) ? 220/u.rate : 0); });
        }, 400)); };
      let watchdog = null;
      const done = () => { if (finished) return; finished = true; Speech.lastEnd = Date.now(); if (Speech.recent.length) Speech.recent[Speech.recent.length - 1].end = Date.now(); clearInterval(watchdog); timers.forEach(clearTimeout); if (last>=0 && spans[idxs[last]]) spans[idxs[last]].classList.remove('hl'); resolve(); };
      u.onend = done; u.onerror = e => { if (e && e.error === 'not-allowed' && Speech.onBlocked) Speech.onBlocked(); done(); };
      Speech.recent.push({ text: text.trim(), at: Date.now() }); if (Speech.recent.length > 12) Speech.recent.shift();
      speechSynthesis.speak(u);
      // safety: finish if the read was stopped or the engine never fires onend
      watchdog = setInterval(() => { if (!alive()) done(); else if (!speechSynthesis.speaking && !speechSynthesis.pending) setTimeout(done, 300); }, 1000);
    });
  }
};
if (Speech.ok && speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = () => { const s = document.getElementById('voiceSel'); if (s) fillVoices(s); };
// Click-to-speak buttons: <button class="say" data-say="#elementId" data-prefix="Choice A.">
document.addEventListener('click', e => {
  const b = e.target.closest('.say'); if (!b) return; e.preventDefault(); e.stopPropagation();
  if (b.getAttribute('aria-pressed') === 'true'){ Speech.stop(); return; }
  const el = document.querySelector(b.dataset.say); Speech.stop(); b.setAttribute('aria-pressed','true');
  Speech.speakEl(el, b.dataset.prefix || '').then(() => b.setAttribute('aria-pressed','false'));
}, true);
let sayCounter = 0;
function sayBtn(target, prefix='', label='Read') { return `<button class="say small" type="button" aria-label="Read aloud" aria-pressed="false" data-say="${target}" data-prefix="${esc(prefix)}">${label}</button>`; }
function speakable(text, cls='', tag='div'){ const id = 'sp' + (++sayCounter); return { id, html: `<${tag} id="${id}" class="${cls}">${wordsHTML(text)}</${tag}>` }; }

/* ---------------- speech recognition ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const Voice = {
  ok: !!SR, rec: null,
  why(){
    if (!SR) return 'Voice answers need Chrome or Edge. This browser does not support speech recognition. You can still tap the buttons.';
    if (!window.isSecureContext) return 'Voice answers need a secure page (https or localhost). Open the web link or run server.py, then try again.';
    return '';
  },
  note(){ return this.why() || (location.protocol === 'file:' ? 'You opened the app as a file. Chrome may block the mic here. If voice answers fail, use the web link (https) or run server.py.' : ''); },
  listen(ms=9000, opts={}){
    return new Promise(resolve => {
      if (!SR){ resolve({ error:'unsupported' }); return; }
      try { this.stop(); } catch(e){}
      const r = new SR(); this.rec = r; r.lang = 'en-US'; r.interimResults = true; r.maxAlternatives = 5; r.continuous = !!opts.continuous;
      let done = false, interim = [], finals = [], lastErr = null; const t0 = Date.now();
      const finish = v => { if (done) return; done = true; clearTimeout(t); setListening(false); v.ms = Date.now() - t0; voiceLog(v); resolve(v); };
      const result = () => { const alts = [...new Set(finals.concat(interim).map(x => String(x || '').trim()).filter(Boolean))];
        return alts.length ? { text: opts.continuous ? finals.join(' ') || interim.join(' ') : alts[0], alts, interim: interim.slice() } : { text:'', alts:[], empty:true }; };
      let idle = null; const bump = () => { if (!opts.continuous) return; clearTimeout(idle); idle = setTimeout(() => { try { r.stop(); } catch(e){} }, opts.idleMs || 6000); };
      r.onresult = e => {
        let fin = false; interim = []; bump();
        for (let i = e.resultIndex || 0; i < e.results.length; i++){ const res = e.results[i];
          const isFinal = res.isFinal !== false;   // fakes and old engines send plain arrays: treat them as final
          for (let k = 0; k < res.length; k++){ const x = res[k] && res[k].transcript; if (x == null) continue; if (isFinal) finals.push(x); else interim.push(x); }
          if (isFinal) fin = true; }
        if (fin && !opts.continuous) finish(result());
        if (opts.continuous && /\b(i am done|im done|i'm done)\s*\.?$/i.test(finals.join(' '))) { try { r.stop(); } catch(e){} }
      };
      r.onerror = e => { lastErr = e.error || 'error'; if (lastErr === 'no-speech' && (finals.length || interim.length)) return; if (!opts.continuous || FATAL_MIC_ERRS.includes(lastErr)) finish({ error: lastErr, alts: interim.slice() }); };
      r.onend = () => { const v = result(); finish(v.empty && !opts.continuous ? { error: lastErr || 'no-speech' } : v); };
      const t = setTimeout(() => { try{ r.stop(); }catch(e){} }, ms);
      try { r.start(); setListening(true); } catch(e){ finish({ error: 'start-failed' }); }
    });
  },
  stop(){ if (this.rec){ try{ this.rec.abort(); }catch(e){} this.rec = null; } setListening(false); }
};
const FATAL_MIC_ERRS = ['not-allowed', 'service-not-allowed', 'audio-capture'];
// hidden debug log of what the recognizer heard (Settings > Voice debug log; say "what did you hear")
const VOICE_LOG = (() => { try { return JSON.parse(localStorage.getItem('asvab.voicelog')) || []; } catch(e){ return []; } })();   // keeps the last session's log after a reload
function voiceLog(v){ VOICE_LOG.push({ at: new Date().toISOString(), text: v.text || '', alts: v.alts || [], interim: v.interim || [], error: v.error || (v.empty ? 'empty' : ''), ctx: (typeof HF !== 'undefined' && HF.ctxName) || '' });
  if (VOICE_LOG.length > 80) VOICE_LOG.shift(); try { localStorage.setItem('asvab.voicelog', JSON.stringify(VOICE_LOG.slice(-40))); } catch(e){} }
function setListening(on){ $$('.listen-status').forEach(el => el.innerHTML = on ? '<span class="listen-dot"></span>Listening... speak now.' : ''); }
const LETTER_WORDS = { a:0, ay:0, eh:0, hey:0, alpha:0, alfa:0, b:1, be:1, bee:1, bravo:1, c:2, see:2, sea:2, si:2, charlie:2, d:3, dee:3, de:3, delta:3, the:3 };
function normalize(s){ return String(s).toLowerCase().replace(/['\u2019]/g,'').replace(/[$,]/g,'').replace(/[^a-z0-9.%/ -]/g,' ').replace(/\s+/g,' ').trim(); }
// Returns {type:'answer', index} | {type:'cmd', cmd} | {type:'conf', value} | null
function parseVoice(alts, choices){
  const list = (Array.isArray(alts) ? alts : [alts]).filter(x => x != null && String(x).trim());
  const nc = choices ? choices.map(normalize) : null;
  const answerOf = (raw) => {
    const t = normalize(raw).replace(/\.$/, ''); if (!t) return null;
    if (nc){ const i = nc.findIndex(c => c === t); if (i >= 0) return i; }
    const li = MS.letterIndex(raw, choices); if (li != null) return li;
    if (nc){
      const vi = MS.choiceByValue(raw, choices); if (vi != null) return vi;
      const scores = nc.map(c => { const cw = c.split(' ').filter(w => w.length > 2); if (!cw.length) return t.includes(c) && c.length > 1 ? 1 : 0;
        return cw.filter(w => t.includes(w)).length / cw.length; });
      const best = Math.max(...scores); if (best >= 0.6 && scores.filter(x => x === best).length === 1) return scores.indexOf(best);
    }
    return null;
  };
  for (let k = 0; k < list.length; k++){
    const raw = list[k]; const t = normalize(raw); if (!t) continue;
    // a lone letter sound ("hey", "a.", "see") is an answer, even if it looks like a word
    const a0 = answerOf(raw); if (a0 != null && t.split(' ').length <= 3) return { type:'answer', index:a0 };
    if (k === 0){
      if (/\b(not sure|unsure|kind of|kinda|maybe|so so|shaky|sorta|sort of)\b/.test(t)) return { type:'conf', value:'shaky' };
      if (/\bguess(ed|ing)?\b/.test(t)) return { type:'conf', value:'guessed' };
      if (/\b(sure|certain|confident|positive|i knew it)\b/.test(t)) return { type:'conf', value:'sure' };
      if (/\b(repeat|again|say that|what was that|read it)\b/.test(t)) return { type:'cmd', cmd:'repeat' };
      if (/\b(next|skip|move on|go on)\b/.test(t)) return { type:'cmd', cmd:'next' };
      if (/\b(hint|help|clue)\b/.test(t)) return { type:'cmd', cmd:'hint' };
      if (/\b(stop|quit|pause|end)\b/.test(t)) return { type:'cmd', cmd:'stop' };
    }
    if (a0 != null) return { type:'answer', index:a0 };
  }
  return null;
}

/* ---------------- LLM (OpenAI-compatible) ---------------- */
// Path 1: his own key in Settings (kept only in this browser's localStorage) -> call the endpoint directly.
// Path 2: no key -> use the same-origin proxy /api/chat (server.py reads OPENAI_API_KEY from the environment).
let proxyState = null;
async function proxyAvailable(){
  if (proxyState !== null) return proxyState;
  if (!/^https?:$/.test(location.protocol)) return (proxyState = false);
  try { const r = await fetch('api/health', { cache:'no-store' }); const j = r.ok ? await r.json() : null; proxyState = !!(j && j.proxy && j.configured); }
  catch(e){ proxyState = false; }
  return proxyState;
}
async function llmReady(){ return !!settings.apiKey || await proxyAvailable(); }
async function llmChat(messages, { json=false, temperature=0.4, maxTokens=1200 } = {}){
  const body = { model: settings.model || 'gpt-4o-mini', messages, temperature, max_tokens: maxTokens };
  if (json) body.response_format = { type:'json_object' };
  let url, headers = { 'Content-Type':'application/json' };
  if (settings.apiKey){ url = (settings.apiBase || 'https://api.openai.com/v1').replace(/\/+$/,'') + '/chat/completions'; headers.Authorization = 'Bearer ' + settings.apiKey; }
  else if (await proxyAvailable()){ url = 'api/chat'; }
  else throw new Error('No AI connection. Add your API key in Settings, or run server.py with OPENAI_API_KEY set.');
  let r = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) });
  if (!r.ok && json && r.status === 400){ delete body.response_format; r = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) }); }
  if (!r.ok){ let t = ''; try{ t = (await r.text()).slice(0,300); }catch(e){} throw new Error(`AI request failed (${r.status}). ${t}`); }
  const j = await r.json(); const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!c) throw new Error('AI sent an empty reply.'); return c;
}
const TUTOR_SYSTEM = () => `You are a patient ASVAB tutor for a Navy recruit aiming at the IT rating. He has a dyslexia-like reading disability.
Follow these tutor rules exactly. They are the most important part of your job.

${window.TUTOR_RULES || ''}

Extra format rules for this app:
- Plain text only. No markdown, no tables, no italics, no bold, no emoji.
- Short lines. Max about 12 words per sentence. Blank line between steps.
- Keep each reply under 90 words. One step or one hint per reply. End with one question for him.
- Say symbols in words (times, divided by, plus, minus, equals).
- Never give the final answer until the rules allow it. Label hints as "Hint 1 (the idea):", "Hint 2 (the first step):", "Hint 3 (a similar example):".
- Do not mention tracker.py or files.`;

/* ---------------- shared UI pieces ---------------- */
function lessonHTML(topic, opts={}){
  const L = LESSONS[topic]; if (!L) return '';
  const parts = [['What it is', L.what.join(' ')], ['Why it matters', L.why], ['Tiny example', L.example.join(' ')], ['The rule', L.idea], ['Worked example', L.worked.join(' ')]];
  return `<div class="card"><h3>Lesson: ${esc(L.name)}</h3>` + parts.filter(p => !opts.only || opts.only.includes(p[0])).map(([h,t]) => { const s = speakable(t); return `<h3>${h} ${sayBtn('#'+s.id)}</h3>${s.html}`; }).join('') + `</div>`;
}
function stepsHTML(steps){ const s = speakable(''); const id = s.id;
  return `<div class="row"><strong>Step by step</strong> ${sayBtn('#'+id)}</div><ol class="steps" id="${id}">` + steps.map(t => `<li>${wordsHTML(t)}</li>`).join('') + `</ol>`; }
function questionHTML(q, opts={}){
  let h = '';
  if (q.passage){ const p = speakable(q.passage, 'passage-text'); h += `<div class="card passage"><div class="row"><strong>Passage</strong> ${sayBtn('#'+p.id,'','Read passage')}</div>${p.html}</div>`; }
  const st = speakable(q.stem, 'stem');
  h += `<div class="card"><div class="row" style="justify-content:space-between"><span class="pill">${esc(q.label||SECTIONS[q.section]||q.section)}</span>${opts.meta||''}</div>
    <div class="row" style="align-items:flex-start"><div style="flex:1">${st.html}</div>${sayBtn('#'+st.id,'','Read')}</div>
    <div class="choices" role="group" aria-label="Answer choices">` +
    q.choices.map((c,i) => { const id = 'ch'+(++sayCounter);
      return `<div class="choice-row"><button class="choice" data-i="${i}" ${opts.disabled?'disabled':''} aria-label="Choice ${LET[i]}: ${esc(c)}"><span class="letter">${LET[i]}</span><span id="${id}">${wordsHTML(c)}</span></button>${sayBtn('#'+id, 'Choice '+LET[i]+'.', 'Read')}</div>`; }).join('') +
    `</div><div class="listen-status" aria-live="polite"></div></div>`;
  return h;
}
function markChoices(q, picked){ $$('.choice').forEach(b => { const i = +b.dataset.i; b.disabled = true;
  if (i === q.answer) b.classList.add('correct'); if (i === picked && picked !== q.answer) b.classList.add('wrong'); if (i === picked) b.classList.add('picked'); }); }
async function readQuestionAloud(q, withPassage=true){
  const pass = $('.passage-text'), stem = $('.stem');
  const g = Speech.gen; if (withPassage && pass) await Speech.speakEl(pass, "Passage."); if (g !== Speech.gen) return;
  await Speech.speakEl(stem, 'Question.'); if (g !== Speech.gen) return;
  const chs = $$('.choice'); for (let i=0;i<chs.length;i++){ if (g !== Speech.gen) return; await Speech.speakEl(chs[i].querySelector('span[id]'), LET[i] + '.'); }
}
function chartSVG(attempts){
  const a = attempts.slice(-12); if (!a.length) return '<p>No scores yet. Do a practice set.</p>';
  const W = 640, H = 240, P = 40, bw = (W - P*2) / a.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Scores for the last ${a.length} attempts">`;
  [0,50,80,100].forEach(v => { const y = H-P - (H-2*P)*v/100; s += `<line x1="${P}" x2="${W-P}" y1="${y}" y2="${y}" stroke="currentColor" stroke-opacity="${v===80?0.6:0.25}" stroke-dasharray="${v===80?'6 4':''}"/><text x="4" y="${y+6}" font-size="16">${v}%</text>`; });
  const pts = [];
  a.forEach((t,i) => { const x = P + i*bw + bw*0.15, h = (H-2*P)*t.pct/100, y = H-P-h; pts.push([x+bw*0.35, y]);
    s += `<rect x="${x}" y="${y}" width="${bw*0.7}" height="${Math.max(1,h)}" fill="${t.mode==='meps'?'#7A4E00':'#003A8C'}" opacity="0.85"/><text x="${x+bw*0.35}" y="${y-6}" text-anchor="middle" font-size="16" font-weight="bold">${t.pct}</text><text x="${x+bw*0.35}" y="${H-P+22}" text-anchor="middle" font-size="14">${i+1}</text>`; });
  s += `<polyline fill="none" stroke="#FFB000" stroke-width="4" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
  return s + `</svg><p>Bars: your score each time (oldest on the left). Gold line: your trend. Dashed line: 80% goal. Brown bars are MEPS runs.</p>`;
}
function praise(){ return pick(['Nice try. You showed your work.','Good. You did not give up.','I like how you checked it.','You are thinking like a technician.','Mistakes help your brain learn.','You are closer than you think.','Good effort. Keep going.']); }

/* ---------------- router ---------------- */
let S = null;      // current practice session
let M = null;      // current MEPS run
function cleanup(){ Speech.stop(); Voice.stop(); if (S && S.timer) clearInterval(S.timer); if (S) S.hf = false; if (M && M.timer) clearInterval(M.timer); if (typeof LR !== 'undefined') LR = null; }
function go(name, arg){
  if (M && M.running && name !== 'meps-run' && !confirm('Leave the MEPS test? Your run will end.')) return;
  if (M && name !== 'meps-run') M.running = false;
  // Arithmetic Reasoning is the catch-up track until its last level is passed (or he picked the real questions)
  if (name === 'home' && typeof AR_REAL !== 'undefined') AR_REAL = false;
  if (name === 'practice' && arg === 'AR' && typeof arDone === 'function' && !arDone() && !AR_REAL){ name = 'ladder'; arg = undefined; }
  cleanup(); window.scrollTo(0,0);
  const fn = SCREENS[name] || SCREENS.home; fn(arg); renderStreak();
  if (typeof NAV_STACK !== 'undefined'){ NAV_STACK.push([SCREENS[name] ? name : 'home', arg]); if (NAV_STACK.length > 30) NAV_STACK.shift(); }
  if (typeof HF !== 'undefined' && HF.on) HF.enter(SCREENS[name] ? name : 'home', arg);
  const h = '#' + name + (arg && typeof arg === 'string' ? '/' + arg : ''); if (location.hash !== h) history.replaceState(null, '', h);
  const f = app().querySelector('h1'); if (f){ f.setAttribute('tabindex','-1'); f.focus({ preventScroll:true }); }
}
const SCREENS = {};

function itFocusHTML(){
  const e = practiceEstimates(); const f = itFocus(e); const top = f.slice(0, 2);
  const rule = e.S.AR != null && e.S.MK != null && e.S.EI != null && e.S.VE != null ? `Main IT rule estimate: AR + MK + EI + VE = ${e.S.AR + e.S.MK + e.S.EI + e.S.VE} (need 212).` : 'Main IT rule: AR + MK + EI + VE = 212 or more.';
  return `<div class="card" id="itFocus"><h2>IT focus for today</h2><p>${rule}</p>
    <ol class="focus-list">${f.map(o => `<li data-sec="${o.k}"><strong>${SECTIONS[o.k]}</strong>${o.v != null ? ` (est. ${o.v})` : ''}: ${o.why}</li>`).join('')}</ol>
    <p>Today: practice your top two.</p>
    <div class="row">${top.map((o,i) => { const t = weakTopic(o.k); return `<button class="${i===0?'primary':''}" data-focus="${o.k}">Practice ${SECTIONS[o.k]}</button>${t ? `<button class="small" data-flesson="${t}">Lesson: ${esc(LESSONS[t].name)}</button>` : ''}`; }).join('')}</div>
    <p><small>Estimate only, confirm with a recruiter. Based on your last 50 answers in each part.</small></p></div>`;
}
SCREENS.home = () => {
  const s = streakInfo(); const errs = Store.get('errors', []);
  app().innerHTML = `<h1>Hi. Ready to study?</h1>
  <div class="card hf-card">${HF.on ? `<p class="big-word">Hands-free is on. Just talk. Say "help".</p><button class="small" id="hfStopBig">Stop hands-free</button>`
    : `<button class="hf-start" id="hfStartBig">Start hands-free</button><p>One tap. Then the whole app works by voice. It reads everything and listens for you.</p>${Voice.why() ? `<p class="bad-text">${esc(Voice.why())}</p>` : ''}`}</div>
  <div class="card"><div class="big-word">Today: ${s.todayCount} of ${DAILY_GOAL} questions</div>
    <div class="bar" aria-hidden="true"><div style="width:${Math.min(100, s.todayCount*10)}%"></div></div>
    <p>${s.goalMet ? 'Goal done for today. Great work.' : `Do ${DAILY_GOAL - s.todayCount} more to keep your streak.`} Streak: ${s.streak} day${s.streak===1?'':'s'}.</p></div>
  ${itFocusHTML()}
  <h2>Practice a section</h2>
  <div class="grid">${SEC_ORDER.map(k => k === 'AR' && !arDone()
      ? `<button class="tile" id="arTile" onclick="go('practice','AR')">${SECTIONS[k]}<small>Catch-up level ${ladState().level} of ${NLEV}: ${esc(ladLevel(ladState().level).title)}</small></button>`
      : `<button class="tile" onclick="go('practice','${k}')">${SECTIONS[k]}<small>Level ${level(k)} of 3 | ${dueList(k).length} due</small></button>`).join('')}</div>
  <h2>Learn by ear</h2>
  <div class="grid">
    <button class="tile primary" onclick="go('audio')">Audio lessons<small>Listen only. Like a podcast for work.</small></button>
    <button class="tile" onclick="go('drill')">Speed drills<small>Quick mental math out loud</small></button>
    <button class="tile" onclick="go('vocab')">Vocab by ear<small>Hear a word. Say what it means.</small></button>
    <button class="tile" onclick="go('readalong')">Read along<small>Big text. Read it out loud.</small></button>
  </div>
  <h2>More</h2>
  <div class="grid">
    <button class="tile primary" onclick="go('ladder')">Math ladder<small>${esc(ladderStatusText().replace('In Arithmetic Reasoning you are on ', 'Arithmetic Reasoning catch-up: '))}</small></button>
    <button class="tile" onclick="go('handsfree')">Hands-free practice<small>It reads. You answer out loud.</small></button>
    <button class="tile" onclick="go('tutor')">Tutor<small>Get help on a question.</small></button>
    <button class="tile" onclick="go('review')">My misses<small>${errs.length} saved</small></button>
    <button class="tile" onclick="go('progress')">My progress<small>Scores and topics</small></button>
    <button class="tile" onclick="go('meps')">MEPS practice test<small>6 parts, real time limits</small></button>
    <button class="tile" onclick="go('settings')">Settings<small>Voice, AI key, backup</small></button>
  </div>
  <p><small>App version ${esc(APP_VERSION)}</small></p>`;
  $$('[data-focus]').forEach(b => b.onclick = () => go('practice', b.dataset.focus));
  const hs = $('#hfStartBig'); if (hs) hs.onclick = () => { HF.start(); if (HF.on) SCREENS.home(); };
  const hx = $('#hfStopBig'); if (hx) hx.onclick = () => { HF.stop(); SCREENS.home(); };
  $$('[data-flesson]').forEach(b => b.onclick = () => go('lesson', b.dataset.flesson));
};

SCREENS.practice = (sec) => {
  sec = SECTIONS[sec] ? sec : 'AR'; const [n, min] = CAT[sec]; const per = Math.round(min*60/n);
  const pool = sectionPool(sec); const custom = pool.filter(q => q.custom).length;
  const arBack = sec === 'AR' ? (arDone() ? `<div class="card"><p>You finished the catch-up track. These are the real test-level questions.</p><button class="small" id="arBack">Catch-up track (math ladder)</button></div>`
    : `<div class="card" id="arRealNote"><p>Real test questions. Your catch-up track is on level ${ladState().level} of ${NLEV}.</p><button class="small" id="arBack">Back to the catch-up track</button></div>`) : '';
  app().innerHTML = `<h1>${SECTIONS[sec]}</h1>${arBack}
  <div class="card"><p>Level ${level(sec)} of 3. ${dueList(sec).length} questions are due for review.</p>
  <p>${pool.length} questions in the bank${custom ? ` (${custom} made by AI)` : ''}.</p></div>
  <div class="card"><label for="cnt">How many questions?</label>
    <div class="row" id="cntRow">${[5,10,15].map(c => `<button class="${c===10?'primary':''}" data-c="${c}">${c}</button>`).join('')}</div>
    <div class="toggle"><input type="checkbox" id="timerOn" ${settings.timerOn?'checked':''}><label for="timerOn" style="margin:0">Timer on: ${fmtTime(per)} per question (real CAT pace)</label></div>
  </div>
  <div class="row"><button class="primary" id="startBtn">Start practice</button><button id="hfBtn">Start hands-free</button></div>
  <h2>Need new questions?</h2>
  <div class="card"><p>Make 5 new ${SECTIONS[sec]} questions with AI. They are checked, then saved on this device.</p>
    <button id="genBtn">Generate more questions</button><div id="genOut" aria-live="polite"></div></div>`;
  let count = 10;
  $$('#cntRow button').forEach(b => b.onclick = () => { count = +b.dataset.c; $$('#cntRow button').forEach(x => x.classList.toggle('primary', x === b)); });
  $('#timerOn').onchange = e => { settings.timerOn = e.target.checked; saveSettings(); };
  $('#startBtn').onclick = () => startSession(sec, count, { hf:false });
  $('#hfBtn').onclick = () => startSession(sec, count, { hf:true });
  $('#genBtn').onclick = () => generateQuestions(sec, 5, $('#genOut'));
  const ab = $('#arBack'); if (ab) ab.onclick = () => go('ladder');
};

function startSession(sec, n, opts={}){
  const qs = pickQuestions(sec, n, opts);
  if (!qs.length){ toast('No questions found.'); return; }
  if (opts.hf && !HF.on) HF.start({ fromSession:true });
  const begin = () => { cleanup(); S = { sec, qs, i:0, results:[], hf: !!opts.hf, timerOn: opts.hf ? (opts.timer ?? false) : settings.timerOn,
    per: CAT[sec][1]*60/CAT[sec][0], mode: (opts.hf || HF.on) ? 'handsfree' : 'practice', topic: opts.topic }; renderQ(); };
  preReview(begin);
}
function preReview(next){
  const errs = Store.get('errors', []).slice(0, 10);
  if (!errs.length || opts_skipReview){ next(); return; }
  app().innerHTML = `<h1>Quick look: your last ${errs.length} misses</h1><p>Read the right answers. Then start. You can skip this.</p>
    <div class="row"><button class="primary" id="goBtn">Start now</button><button id="skipBtn">Skip review</button></div>` +
    errs.map((e,k) => { const a = speakable(`${e.stem} The right answer is: ${dot(e.answerText)} ${firstSentence(e.explanation)}`);
      return `<div class="card"><div class="row" style="justify-content:space-between"><span class="pill">${esc(SECTIONS[e.section])}</span>${sayBtn('#'+a.id)}</div>
        <div class="hidden">${a.html}</div><div class="stem">${esc(e.stem)}</div>
        <p>You said: <span class="bad-text">${esc(e.guessText)}</span></p><p>Right answer: <span class="ok-text">${esc(e.answerText)}</span></p><p>${esc(firstSentence(e.explanation))}</p></div>`; }).join('') +
    `<div class="row"><button class="primary" id="goBtn2">Start now</button></div>`;
  ['goBtn','skipBtn','goBtn2'].forEach(id => $('#'+id).onclick = next);
  if (HF.on) HF.enter('prereview', { errs, next, k:0 });
}
let opts_skipReview = false;

function renderQ(){
  if (!S) return; Speech.stop(); Voice.stop(); if (S.timer) clearInterval(S.timer);
  const q = S.qs[S.i]; S.answered = false; S.conf = null; S.hints = 0; S.left = S.per;
  app().innerHTML = `<div class="row" style="justify-content:space-between"><h1 style="margin:0">Question ${S.i+1} of ${S.qs.length}</h1>
      ${S.timerOn ? `<span class="timer" id="tmr" aria-label="Time left">${fmtTime(S.left)}</span>` : '<span class="pill">No timer</span>'}</div>
    ${S.timerOn ? '<div class="bar" id="tbar"><div style="width:100%"></div></div>' : ''}
    ${HF.on ? `<div class="card" id="hfBox"><strong>Hands-free is on.</strong> Say A, B, C, or D. Or the answer. Say "repeat", "hint", "read the passage", or "skip".<div class="row"><button class="small" id="hfPauseBtn">Pause voice</button></div></div>` : ''}
    ${questionHTML(q, { meta: `<span class="pill">Level ${q.difficulty}</span>` })}
    <div class="row" id="qTools"><button class="small" id="hintBtn">Hint</button><button class="small" id="skipQ">Skip</button><button class="small" onclick="go('home')">End</button></div>
    <div id="hintBox"></div><div id="fb"></div>`;
  $$('.choice').forEach(b => b.onclick = () => answer(+b.dataset.i));
  $('#hintBtn').onclick = () => showHint(q);
  $('#skipQ').onclick = () => nextQ();
  if (HF.on){ $('#hfPauseBtn').onclick = () => HF.pause(); }
  if (S.timerOn){ const t0 = Date.now(), total = S.per; S.timer = setInterval(() => {
      S.left = total - (Date.now()-t0)/1000; const el = $('#tmr'), bar = $('#tbar');
      if (el) el.textContent = fmtTime(S.left); if (bar){ bar.firstElementChild.style.width = Math.max(0, 100*S.left/total) + '%'; bar.classList.toggle('low', S.left < total*0.2); }
      if (S.left <= 0){ clearInterval(S.timer); if (!S.answered){ toast('Time is up.'); answer(null); } } }, 250); }
  if (HF.on) HF.enter('question');
  else if (settings.autoRead) readQuestionAloud(q);
}
function hintTexts(q){ const L = LESSONS[q.topic] || {}; return [ 'Hint 1 (the idea): ' + (L.idea || 'Read the question again. What does it ask?'), 'Hint 2 (the first step): ' + (q.steps.find(s => !/^(The idea|Topic|Answer)/.test(s)) || q.steps[0]) ]; }
function showHint(q){ const h = hintTexts(q); if (S.hints >= h.length){ toast('No more hints here. Try the Tutor for more help.'); return; }
  const s = speakable(h[S.hints++]); $('#hintBox').insertAdjacentHTML('beforeend', `<div class="card"><div class="row" style="align-items:flex-start"><div style="flex:1">${s.html}</div>${sayBtn('#'+s.id)}</div></div>`);
  return h[S.hints-1]; }
function answer(i){
  if (!S || S.answered) return; S.answered = true; if (S.timer) clearInterval(S.timer); Voice.stop();
  const q = S.qs[S.i]; const correct = i === q.answer; markChoices(q, i);
  S.results.push({ qid:q.id, correct, guess:i, topic:q.topic }); bumpDaily(1);
  if (!correct) logError(q, i, S.mode);
  const lvMsg = adaptRecord(q.section, correct);
  const head = correct ? 'Right!' : (i == null ? `Time ran out. The answer is ${LET[q.answer]}: ${dot(q.choices[q.answer])}` : `Not yet. The answer is ${LET[q.answer]}: ${dot(q.choices[q.answer])}`);
  const why = speakable(head + ' ' + firstSentence(q.explanation));
  $('#qTools').classList.add('hidden');
  $('#fb').innerHTML = `<div class="card feedback ${correct?'ok':'bad'}"><div class="row" style="align-items:flex-start"><div style="flex:1" class="big-word">${why.html}</div>${sayBtn('#'+why.id)}</div>
      ${correct ? '' : `<p>${esc(praise())}</p>`}${stepsHTML(q.steps)}${lvMsg ? `<p class="pill">${esc(lvMsg)}</p>` : ''}</div>
    <div class="card" id="confBox"><h2>How sure were you?</h2><div class="row">
      <button class="primary" data-c="sure">Sure</button><button data-c="shaky">Shaky</button><button data-c="guessed">Guessed</button></div></div><div id="after"></div>`;
  $$('#confBox button').forEach(b => b.onclick = () => setConf(b.dataset.c));
  $('#fb').scrollIntoView({ behavior:'smooth', block:'start' });
  if (HF.on) HF.enter('feedback', why.id);
  else if (settings.autoRead) Speech.speakEl(document.getElementById(why.id));
}
function setConf(c){
  if (!S || S.conf) return; S.conf = c; const q = S.qs[S.i]; const r = S.results[S.results.length-1]; r.conf = c;
  srsUpdate(q.id, r.correct, c); topicRecord(q.topic, r.correct, c);
  $$('#confBox button').forEach(b => { b.disabled = true; b.classList.toggle('primary', b.dataset.c === c); });
  const relearn = !r.correct || c !== 'sure'; const L = LESSONS[q.topic] || { name:q.topic };
  const msg = relearn ? `Topic to re-learn: ${L.name}. Here is the lesson.` : 'Nice. You knew it. This topic just needs reps.';
  const m = speakable(msg);
  $('#after').innerHTML = `<div class="card"><div class="row" style="align-items:flex-start"><div style="flex:1"><strong>${m.html}</strong></div>${sayBtn('#'+m.id)}</div></div>
    ${relearn ? lessonHTML(q.topic, { only:['What it is','The rule','Worked example'] }) : ''}
    <div class="row">${relearn ? `<button id="tutorBtn">Tutor me on this</button>` : ''}<button class="primary" id="nextBtn">${S.i+1 < S.qs.length ? 'Next question' : 'See my score'}</button></div>`;
  $('#nextBtn').onclick = nextQ; if (relearn) $('#tutorBtn').onclick = () => { const qq = q; go('tutor'); startBankTutor(qq); };
  $('#nextBtn').focus({ preventScroll:true });
  return msg;
}
function nextQ(){ if (!S) return; Speech.stop(); Voice.stop(); S.i++; if (S.i >= S.qs.length) endSession(); else renderQ(); }
function endSession(){
  const s = S; if (s.timer) clearInterval(s.timer); s.hf = false;
  const done = s.results.length, right = s.results.filter(r => r.correct).length;
  if (done) saveAttempt(s.sec, right, done, s.mode);
  const misses = s.results.filter(r => !r.correct);
  const sum = speakable(`You got ${right} out of ${done}. ${right === done && done ? 'Perfect set!' : 'Good effort. Every miss teaches you something.'}`);
  app().innerHTML = `<h1>Set done</h1><div class="card"><div class="row"><div class="big-word" style="flex:1" id="setSum">${sum.html}</div>${sayBtn('#'+sum.id)}</div>
    <p>Level now: ${level(s.sec)} of 3.</p></div>
    ${misses.length ? `<h2>Your misses</h2>` + misses.map(r => { const q = qById(r.qid); return `<div class="card"><div class="stem">${esc(q.stem)}</div><p>Right answer: <span class="ok-text">${esc(q.choices[q.answer])}</span></p><button class="small" data-t="${esc(q.id)}">Tutor me</button></div>`; }).join('') : ''}
    <div class="row"><button class="primary" onclick="go('practice','${s.sec}')">Practice again</button><button onclick="go('progress')">My progress</button><button onclick="go('home')">Home</button></div>`;
  $$('[data-t]').forEach(b => b.onclick = () => { const q = qById(b.dataset.t); go('tutor'); startBankTutor(q); });
  S = null;
  if (HF.on) HF.enter('done', { sec:s.sec });
}

/* ---------------- hands-free loop ---------------- */
SCREENS.handsfree = () => {
  const why = Voice.note();
  app().innerHTML = `<h1>Hands-free voice mode</h1>
  <div class="card"><p>Tip: the big Start hands-free button on the home screen runs the whole app by voice.</p><p>I read the question and the choices.</p><p>You say the answer. Say "A", "B", "Bravo", "option C", or the answer words.</p>
  <p>I tell you if it is right, and why.</p><p>Then say how sure you were: "sure", "shaky", or "guessed".</p>
  <p>You can also say "repeat", "hint", "next", or "stop".</p></div>
  ${why ? `<div class="notice"><strong>Heads up:</strong> ${esc(why)}</div>` : ''}
  <h2>Pick a section</h2><div class="grid">${SEC_ORDER.map(k => `<button class="tile" data-s="${k}">${SECTIONS[k]}</button>`).join('')}</div>
  <div class="toggle"><input type="checkbox" id="hfTimer"><label for="hfTimer" style="margin:0">Use the CAT timer too</label></div>`;
  $$('[data-s]').forEach(b => b.onclick = () => (b.dataset.s === 'AR' && !arDone()) ? go('ladder') : startSession(b.dataset.s, 10, { hf:true, timer: $('#hfTimer').checked }));
};
/* ---------------- tutor ---------------- */
// Offline tutor for bank questions follows 08_tutor_rules.md:
// 1 what it is + why, 2 tiny example, 3 ask him to try, 4 hint ladder (idea, first step, similar worked example),
// 5 check kindly, 6 reveal only after all 3 hints AND a try (or he asks after all hints), 7 lock it in.
let T = null;
SCREENS.tutor = () => {
  const errs = Store.get('errors', []).slice(0, 8);
  app().innerHTML = `<h1>Tutor</h1><p>I will help you step by step. You do the thinking. I give hints.</p>
  <h2>Pick a question you missed</h2>
  ${errs.length ? errs.map(e => `<button class="tile" style="width:100%;margin:6px 0" data-e="${esc(e.id)}">${esc(e.stem.length > 90 ? e.stem.slice(0,90)+'...' : e.stem)}<small>${esc(SECTIONS[e.section])} | ${new Date(e.date).toLocaleDateString()}</small></button>`).join('') : '<p>No misses yet.</p>'}
  <div class="row"><button onclick="go('review')">See all misses</button></div>
  <h2>Or type or paste a question</h2>
  <div class="card"><label for="pasteQ">The question (and the choices, if you have them)</label><textarea id="pasteQ" placeholder="Example: A car goes 45 miles per hour for 3 hours. How far does it go?"></textarea>
    <label for="pasteA">What did you answer? (optional)</label><input type="text" id="pasteA">
    <div class="row"><button id="micQ">Speak the question</button><button class="primary" id="startPaste">Start tutor</button></div><div class="listen-status"></div><div id="pasteMsg"></div></div>`;
  $$('[data-e]').forEach(b => b.onclick = () => { const e = Store.get('errors', []).find(x => x.id === b.dataset.e); if (e) startBankTutor(e.q || qById(e.qid), e.guess); });
  $('#micQ').onclick = () => dictate($('#pasteQ'));
  $('#startPaste').onclick = () => startPasteTutor($('#pasteQ').value.trim(), $('#pasteA').value.trim());
};
async function dictate(input){
  const why = Voice.why(); if (why){ toast(why); return; }
  const r = await Voice.listen(15000); if (r.error){ toast(r.error === 'no-speech' ? 'I did not hear anything.' : 'Mic problem: ' + r.error); return; }
  input.value = (input.value ? input.value + ' ' : '') + r.text; input.focus();
}
function findBankMatch(text){
  const n = normalize(text); if (n.length < 12) return null;
  let best = null, bestScore = 0; const tw = new Set(n.split(' ').filter(w => w.length > 2));
  for (const q of allQuestions()){ const qw = normalize(q.stem).split(' ').filter(w => w.length > 2); if (!qw.length) continue;
    const sc = qw.filter(w => tw.has(w)).length / qw.length; if (sc > bestScore){ bestScore = sc; best = q; } }
  return bestScore >= 0.85 ? best : null;
}
function startBankTutor(q, firstGuess){
  if (!q) return; Speech.stop(); const L = LESSONS[q.topic] || { name:q.topic, what:[q.explanation], why:'', example:[], idea:'', worked:q.steps };
  T = { q, stage:0, hints:0, tries:0, triedAfter3:false, wrong:new Set(), solved:false };
  if (firstGuess != null && firstGuess !== q.answer) T.wrong.add(firstGuess);
  app().innerHTML = `<h1>Tutor: ${esc(L.name)}</h1><div id="tq"></div><div id="tchat" class="chat"></div><div id="tbtns" class="row"></div>`;
  renderTutorQ(); if (HF.on) HF.enter('banktutor');
  const bubbles = [ `Step 1: What it is.\n${L.what.join('\n')}\nWhy it matters: ${L.why}`, `Step 2: A tiny example.\n${L.example.join('\n')}` ];
  bubbles.forEach(b => tutorSay(b));
  tutorSay(HF.on ? 'Step 3: Want to try? Say the answer you think is right. Or say "I don\'t know".' : 'Step 3: Want to try? Tap the answer you think is right. Or tap "I don\'t know".');
  tutorButtons();
}
function renderTutorQ(){ $('#tq').innerHTML = questionHTML(T.q);
  $$('#tq .choice').forEach(b => { const i = +b.dataset.i; if (T.wrong.has(i)) { b.classList.add('wrong'); b.disabled = true; } b.onclick = () => tutorTry(i); });
  if (T.solved) markChoices(T.q, T.q.answer); }
function tutorSay(text, who='bot'){
  const s = speakable(text); const div = document.createElement('div'); div.className = 'msg ' + who;
  div.innerHTML = who === 'bot' ? `<div class="row" style="align-items:flex-start;margin:0"><div style="flex:1">${s.html}</div>${sayBtn('#'+s.id)}</div>` : s.html;
  $('#tchat').appendChild(div); div.scrollIntoView({ behavior:'smooth', block:'nearest' });
  if (who === 'bot' && HF.on){ const el = document.getElementById(s.id); HF.tq = (HF.tq || Promise.resolve()).then(() => el.isConnected && HF.on ? HF.run(() => Speech.speakEl(el)) : null); }
  else if (who === 'bot' && settings.autoRead) Speech.speakEl(document.getElementById(s.id));
  return div;
}
function tutorButtons(){
  const b = $('#tbtns'); if (!b) return;
  if (T.solved){ b.innerHTML = `<button class="primary" id="tSimilar">Try a similar one</button><button onclick="go('tutor')">Back to tutor</button><button onclick="go('home')">Home</button>`;
    $('#tSimilar').onclick = () => { const pool = sectionPool(T.q.section).filter(x => x.topic === T.q.topic && x.id !== T.q.id); startBankTutor(pool.length ? pick(pool) : pick(sectionPool(T.q.section))); }; return; }
  b.innerHTML = `<button id="tIdk">I don't know</button><button id="tHint">${T.hints < 3 ? 'Give me a hint' : 'No more hints'}</button><button id="tShow">Show the answer</button><button id="tAI" class="hidden">Ask the AI tutor</button>`;
  $('#tIdk').onclick = () => { tutorSay("I don't know", 'me'); nextHint(); };
  $('#tHint').onclick = () => { if (T.hints < 3) nextHint(); else tutorSay('You have all 3 hints. Try it now. Or tap "Show the answer".'); };
  $('#tShow').onclick = () => { tutorSay('Show me the answer.', 'me');
    if (T.hints < 3){ tutorSay('I hear you. Let me give you a hint first. You are close.'); nextHint(); } else reveal(); };
  llmReady().then(ok => { const a = $('#tAI'); if (ok && a){ a.classList.remove('hidden'); a.onclick = () => startChat(bankQuestionText(T.q), T.wrong.size ? T.q.choices[[...T.wrong][0]] : '', T.q); } });
}
function nextHint(){
  const L = LESSONS[T.q.topic] || {}; T.hints++;
  const first = T.q.steps.find(s => !/^(The idea|Topic|Answer|Read the question first)/.test(s)) || T.q.steps[0];
  const H = { 1: `Hint 1 (the idea):\n${L.idea || 'Read the question again. What does it ask for?'}\nWant to try again?`,
              2: `Hint 2 (the first step):\n${first}\nOnly the first move. Can you finish it?`,
              3: `Hint 3 (a similar example, new numbers):\n${(L.worked || []).join('\n')}\nNow try yours the same way.` };
  tutorSay(H[T.hints]); tutorButtons();
}
function tutorTry(i){
  if (T.solved) return; T.tries++; if (T.hints >= 3) T.triedAfter3 = true;
  tutorSay(`I pick ${LET[i]}: ${T.q.choices[i]}`, 'me');
  if (i === T.q.answer){
    T.solved = true; markChoices(T.q, i);
    tutorSay(`Yes! ${LET[i]} is right.\n${praise()}\nHere is why:\n${T.q.steps.join('\n')}`);
    tutorSay('Step 7: Lock it in. Say the rule in your own words. You can type it, say it, or just say it out loud to yourself.');
    lockIn(); bumpDaily(0); topicRecord(T.q.topic, true, T.hints ? 'shaky' : 'sure'); tutorButtons(); return;
  }
  T.wrong.add(i); renderTutorQ();
  tutorSay(`${praise()}\nNot yet. ${LET[i]} is not it. That is OK.\nLet's look again.`);
  if (T.hints < 3) nextHint();
  else if (T.triedAfter3){ tutorSay('You tried after every hint. That is real effort. Let me show you.'); reveal(); }
  else tutorButtons();
}
function reveal(){
  T.solved = true; markChoices(T.q, T.q.answer);
  tutorSay(`The answer is ${LET[T.q.answer]}: ${dot(T.q.choices[T.q.answer])}\nHere is each step and why it works:\n${T.q.steps.map((s,k) => (k+1)+'. '+s).join('\n')}\nYou worked hard on this. Good job sticking with it.`);
  tutorSay('Now say the rule in your own words. Then try a similar one.');
  lockIn(); tutorButtons();
}
function lockIn(){ const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<label for="rule">The rule, in my words</label><input type="text" id="rule"><div class="row"><button class="small" id="ruleMic">Say it</button><button class="small" id="ruleOk">Done</button></div><div class="listen-status"></div>`;
  $('#tchat').appendChild(d); $('#ruleMic').onclick = () => dictate($('#rule')); if (T) T.ruleDone = false;
  $('#ruleOk').onclick = () => { const v = $('#rule').value.trim(); tutorSay(v ? v : '(said it out loud)', 'me'); tutorSay('Perfect. That is the rule. Now try a similar one alone.'); d.remove(); }; }
function bankQuestionText(q){ return (q.passage ? 'Passage: ' + q.passage + '\n' : '') + q.stem + '\n' + q.choices.map((c,i) => `${LET[i]}. ${c}`).join('\n'); }

async function startPasteTutor(text, mine){
  if (!text){ toast('Type or paste a question first.'); return; }
  const match = findBankMatch(text);
  if (match){ startBankTutor(match); toast('Found this question in the bank. Tutor works offline.'); return; }
  if (!(await llmReady())){ $('#pasteMsg').innerHTML = `<div class="notice"><p>The AI tutor needs a connection.</p><p>Add your API key in Settings. Or run server.py with a key.</p><button onclick="go('settings')">Go to Settings</button></div>`; return; }
  startChat(text, mine);
}
let CHAT = null;
function startChat(question, mine, bankQ){
  CHAT = { messages: [ { role:'system', content: TUTOR_SYSTEM() },
    { role:'user', content: `Here is a question I got wrong.\n\n${question}\n\n${mine ? 'My answer was: ' + mine : 'I am not sure how to do it.'}${bankQ ? '\n(Answer key for you only, do not reveal early: ' + bankQ.choices[bankQ.answer] + '. Steps: ' + bankQ.steps.join(' ') + ')' : ''}\nPlease help me step by step.` } ] };
  app().innerHTML = `<h1>AI tutor</h1><div class="card passage"><div class="stem" style="white-space:pre-wrap">${esc(question)}</div></div><div id="tchat" class="chat"></div>
    <div class="card"><label for="chatIn">Your reply</label><textarea id="chatIn" style="min-height:90px"></textarea>
    ${HF.on ? '<p>Hands-free: just talk. I send what you say.</p>' : ''}<div class="row"><button id="chatMic">Speak</button><button class="primary" id="chatSend">Send</button><button id="chatIdk">I don't know</button><button id="chatHint">Hint please</button></div><div class="listen-status"></div></div>`;
  $('#chatMic').onclick = () => dictate($('#chatIn'));
  $('#chatSend').onclick = () => { const v = $('#chatIn').value.trim(); if (v){ $('#chatIn').value = ''; chatSend(v); } };
  $('#chatIdk').onclick = () => chatSend("I don't know.");
  $('#chatHint').onclick = () => chatSend('Can I have the next hint?');
  if (HF.on) HF.enter('chat');
  chatSend(null);
}
async function chatSend(text){
  if (text){ CHAT.messages.push({ role:'user', content:text }); tutorSay(text, 'me'); }
  const wait = tutorSay('Thinking...'); $$('#chatSend,#chatIdk,#chatHint').forEach(b => b.disabled = true);
  try { const reply = (await llmChat(CHAT.messages, { temperature:0.5, maxTokens:400 })).replace(/[*_#`]/g, '');
    CHAT.messages.push({ role:'assistant', content: reply }); wait.remove(); tutorSay(reply); }
  catch(e){ wait.remove(); tutorSay('Sorry. The AI tutor did not answer.\n' + e.message); }
  $$('#chatSend,#chatIdk,#chatHint').forEach(b => b.disabled = false);
}

/* ---------------- error log review ---------------- */
SCREENS.review = (filter) => {
  const errs = Store.get('errors', []); const f = SECTIONS[filter] ? filter : '';
  const list = errs.filter(e => !f || e.section === f);
  app().innerHTML = `<h1>My misses</h1><p>${errs.length} saved. Newest first.</p>
    <div class="row"><button class="small ${f?'':'primary'}" onclick="go('review')">All</button>${SEC_ORDER.map(k => `<button class="small ${f===k?'primary':''}" onclick="go('review','${k}')">${k}</button>`).join('')}</div>
    ${list.length ? '' : '<p>No misses here. Nice.</p>'}
    ${list.slice(0, 100).map(e => { const s = speakable(`${e.stem} You said: ${dot(e.guessText)} The right answer is: ${dot(e.answerText)} ${e.explanation}`);
      return `<div class="card"><div class="row" style="justify-content:space-between"><span class="pill">${esc(SECTIONS[e.section])} | ${new Date(e.date).toLocaleDateString()}</span>${sayBtn('#'+s.id)}</div>
      <div class="hidden">${s.html}</div>${e.passage ? `<p>${esc(e.passage)}</p>` : ''}<div class="stem">${esc(e.stem)}</div>
      <p>You said: <span class="bad-text">${esc(e.guessText)}</span></p><p>Right answer: <span class="ok-text">${esc(e.answerText)}</span></p>
      <p>${esc(e.explanation)}</p><div class="row"><button class="small" data-e="${esc(e.id)}">Tutor me</button><button class="small" data-d="${esc(e.id)}">Remove</button></div></div>`; }).join('')}`;
  $$('[data-e]').forEach(b => b.onclick = () => { const e = errs.find(x => x.id === b.dataset.e); go('tutor'); startBankTutor(e.q || qById(e.qid), e.guess); });
  $$('[data-d]').forEach(b => b.onclick = () => { Store.set('errors', Store.get('errors', []).filter(x => x.id !== b.dataset.d)); go('review', f); });
};

/* ---------------- progress ---------------- */
SCREENS.progress = () => {
  const att = Store.get('attempts', {}); const topics = Store.get('topics', {});
  const relearn = Object.entries(topics).filter(([k,v]) => v.relearn && LESSONS[k]);
  const reps = Object.entries(topics).filter(([k,v]) => !v.relearn && LESSONS[k]);
  const meps = Store.get('meps', []);
  app().innerHTML = `<h1>My progress</h1>
  ${itPanelHTML(practiceEstimates(), 'from your practice')}
  ${byEarProgressHTML()}
  <div class="two-col">
    <div class="card"><h2>Topics to re-learn</h2><p>Missed, or right but not sure.</p>${relearn.length ? relearn.map(([k,v]) => `<button class="small" style="width:100%;margin:4px 0" data-l="${k}">${esc(LESSONS[k].name)} (${SECTIONS[LESSONS[k].section] ? LESSONS[k].section : ''})</button>`).join('') : '<p>None right now.</p>'}</div>
    <div class="card"><h2>Just needs reps</h2><p>You were right and sure.</p>${reps.length ? reps.map(([k,v]) => `<button class="small" style="width:100%;margin:4px 0" data-l="${k}">${esc(LESSONS[k].name)} (${LESSONS[k].section})</button>`).join('') : '<p>None yet.</p>'}</div>
  </div>
  ${SEC_ORDER.map(k => { const a = att[k] || []; const last = a[a.length-1];
    return `<div class="card"><h2>${SECTIONS[k]}</h2><p>Level ${level(k)} of 3. ${a.length} attempts.${last ? ` Last: ${last.pct}%.` : ''}${a.length > 1 ? ` First: ${a[0].pct}%.` : ''}</p>${chartSVG(a)}</div>`; }).join('')}
  ${meps.length ? `<div class="card"><h2>MEPS practice runs</h2><table><tr><th>Date</th><th>Est. AFQT</th><th>Raw</th></tr>${meps.slice(-10).reverse().map(m => `<tr><td>${new Date(m.date).toLocaleDateString()}</td><td>${m.afqt}</td><td>${m.right}/${m.total}</td></tr>`).join('')}</table></div>` : ''}`;
  $$('[data-l]').forEach(b => b.onclick = () => go('lesson', b.dataset.l));
};
// catch-up track, reading fluency, and speed drill progress in one card
function byEarProgressHTML(){
  const st = typeof ladState === 'function' ? ladState() : null; const rd = Store.get('reading', []); const dr = Store.get('drill', null);
  const lastR = rd[rd.length - 1], firstR = rd[0], bestR = rd.reduce((m, x) => Math.max(m, x.wcpm), 0);
  const DN = { times:'Times tables', halves:'Halves and quarters', percent:'Percent facts', mixed:'Mixed' };
  return `<div class="card" id="earProg"><h2>Catch-up, reading, and drills</h2>
    ${st ? `<p>${esc(arHeader(st.level))}. ${Object.keys(st.passed || {}).length} of ${NLEV} levels passed.</p>` : ''}
    <p>${rd.length ? `Reading: last ${lastR.wcpm} words correct per minute at ${lastR.acc}% accuracy. Best ${bestR}. First ${firstR.wcpm}. ${rd.length} reading${rd.length === 1 ? '' : 's'}.` : 'Reading: no readings yet. Try Read along.'}</p>
    <p>${dr && dr.best && Object.keys(dr.best).length ? 'Speed drills best: ' + Object.entries(dr.best).map(([k, v]) => `${DN[k] || k} ${v} of 10`).join(', ') + `. Answer timer: ${dr.limit} seconds.` : 'Speed drills: none yet.'}</p></div>`;
}
SCREENS.lesson = (topic) => {
  const L = LESSONS[topic]; if (!L){ go('progress'); return; }
  app().innerHTML = `<h1>${esc(L.name)}</h1>${lessonHTML(topic)}
    <div class="row"><button class="primary" id="lp">Practice this topic</button><button id="lt">Tutor me on it</button><button onclick="go('progress')">Back</button></div>`;
  $('#lp').onclick = () => startSession(L.section, 5, { topic });
  $('#lt').onclick = () => { const pool = sectionPool(L.section).filter(q => q.topic === topic); if (pool.length) startBankTutor(pick(pool)); };
};

/* ---------------- simulated MEPS (CAT-ASVAB) ---------------- */
SCREENS.meps = () => {
  const total = MEPS_ORDER.reduce((a,k) => a + CAT[k][1], 0);
  app().innerHTML = `<h1>MEPS practice test</h1>
  <div class="card"><p>Six parts, in the real order. Real CAT-ASVAB question counts and time limits.</p>
  <table><tr><th>Part</th><th>Questions</th><th>Minutes</th></tr>${MEPS_ORDER.map(k => `<tr><td>${SECTIONS[k]}</td><td>${CAT[k][0]}</td><td>${CAT[k][1]}</td></tr>`).join('')}<tr><td><strong>Total</strong></td><td>${MEPS_ORDER.reduce((a,k)=>a+CAT[k][0],0)}</td><td>${total}</td></tr></table>
  <p>Source: officialasvab.com (proctored CAT-ASVAB, scored questions, no tryout items).</p></div>
  <div class="card"><p>No hints. No tutor. No going back.</p><p>The clock is on screen. When time runs out, the next part starts.</p><p>No going back to change an answer. That is the real rule too.</p><p>If time runs out, the real test scores the rest as random guesses. That costs points. So answer every question. Guess if you must.</p></div>
  <div class="row"><button class="primary" id="mStart">Start the test</button><button onclick="go('home')">Not now</button></div>`;
  $('#mStart').onclick = () => { M = { running:true, part:0, res:{}, log:[] }; mepsIntro(); };
};
function mepsIntro(){
  if (!M || !M.running) return; Speech.stop(); const k = MEPS_ORDER[M.part]; const [n, min] = CAT[k]; let wait = 20;
  app().innerHTML = `<h1>Part ${M.part+1} of ${MEPS_ORDER.length}: ${SECTIONS[k]}</h1><div class="card"><p class="big-word">${n} questions. ${min} minutes.</p>
    <p>Starts by itself in <span id="mWait">${wait}</span> seconds.</p></div><div class="row"><button class="primary" id="mBegin">Begin now</button><button id="mQuit">Quit test</button></div>`;
  M.timer = setInterval(() => { wait--; const e = $('#mWait'); if (e) e.textContent = wait; if (wait <= 0){ clearInterval(M.timer); mepsBegin(); } }, 1000);
  $('#mBegin').onclick = () => { clearInterval(M.timer); mepsBegin(); };
  if (HF.on) HF.enter('mepspart');
  $('#mQuit').onclick = () => { if (confirm('Quit the test?')){ M.running = false; clearInterval(M.timer); go('home'); } };
}
function mepsBegin(){
  const k = MEPS_ORDER[M.part]; const [n, min] = CAT[k];
  M.ann = new Set(); M.sec = k; M.used = new Set(); M.diff = 2; M.n = n; M.done = 0; M.res[k] = { right:0, total:n, answered:0 }; M.end = Date.now() + min*60000;
  clearInterval(M.timer); M.timer = setInterval(mepsTick, 500); mepsNextQ();
}
function mepsPick(){
  const pool = sectionPool(M.sec).filter(q => !M.used.has(q.id));
  for (const d of [M.diff, M.diff-1, M.diff+1, M.diff-2, M.diff+2]){ const c = pool.filter(q => q.difficulty === d); if (c.length) return pick(c); }
  return pick(pool);
}
function mepsTick(){
  if (!M || !M.running) { clearInterval(M && M.timer); return; }
  const left = (M.end - Date.now())/1000; const e = $('#mClock'); if (e) e.textContent = fmtTime(left);
  if (left <= 0){ clearInterval(M.timer); toast('Time is up for this part.'); mepsFinishPart(); return; }
  if (HF.on) mepsAnnounce(left);
}
// hands-free: say the time left every 5 minutes and at 1 minute, but never in the middle of reading
function mepsAnnounce(left){
  const total = CAT[M.sec][1]*60; const marks = []; for (let m = 300; m < total; m += 300) marks.push(m); if (total > 90) marks.push(60);
  const due = marks.filter(m => left <= m && !M.ann.has(m)); if (!due.length) return;
  if (HF.talking > 0 || HF.pending){ return; }               // wait until reading is done
  due.forEach(m => M.ann.add(m)); HF.say(`Time left: ${spokenTime(left)}.`);
}
function mepsNextQ(){
  if (M.done >= M.n){ clearInterval(M.timer); mepsFinishPart(); return; }
  const q = mepsPick(); if (!q){ mepsFinishPart(); return; } M.used.add(q.id); M.q = q;
  app().innerHTML = `<div class="row" style="justify-content:space-between"><h1 style="margin:0">${SECTIONS[M.sec]}</h1>
    <div class="card" style="margin:0;padding:6px 14px" aria-live="off"><span class="timer">Time left: <span id="mClock">${fmtTime((M.end-Date.now())/1000)}</span></span><br><span>Questions left: ${M.n - M.done}</span></div></div>
    ${questionHTML(q)}`;
  $$('.choice').forEach(b => b.onclick = () => mepsAnswer(+b.dataset.i));
  if (HF.on) HF.enter('mepsq');
}
function mepsAnswer(i){
  const q = M.q; const ok = i === q.answer; M.done++; M.res[M.sec].answered++; if (ok) M.res[M.sec].right++;
  M.diff = Math.max(1, Math.min(3, M.diff + (ok ? 1 : -1)));
  M.log.push({ q, i, ok }); bumpDaily(1); srsUpdate(q.id, ok, ok ? 'shaky' : null); if (!ok) logError(q, i, 'meps');
  mepsNextQ();
}
function mepsFinishPart(){
  if (!M || !M.running) return; clearInterval(M.timer); const r = M.res[M.sec];
  // Official rule: unfinished items are scored as though answered at random (1 in 4 chance each).
  r.guessed = (r.total - r.answered) * 0.25;
  saveAttempt(M.sec, r.right, r.total, 'meps');
  M.part++; if (M.part < MEPS_ORDER.length) mepsIntro(); else mepsReport();
}
function normCdf(z){ const t = 1/(1+0.2316419*Math.abs(z)); const d = 0.3989423*Math.exp(-z*z/2); const p = d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274)))); return z > 0 ? 1-p : p; }
function estimates(res){
  // ESTIMATE ONLY. Real ASVAB scoring uses item response theory and norm tables we do not have.
  // Here: standard score ~ 20 + 60 x (fraction right), so 50% right is about 50 (the official average).
  const ss = p => Math.round(20 + 60*p);
  const frac = k => res[k] && res[k].total ? (res[k].right + (res[k].guessed||0)) / res[k].total : null;
  const S = {}; SEC_ORDER.forEach(k => { const f = frac(k); S[k] = f == null ? null : ss(f); });
  const w = res.WK && res.PC ? ((res.WK.right+(res.WK.guessed||0)) + (res.PC.right+(res.PC.guessed||0))) / (res.WK.total + res.PC.total) : null;
  S.VE = w == null ? null : ss(w);       // VE comes from WK + PC (exact DoD formula is not public)
  const have = (...k) => k.every(z => S[z] != null);
  const comp = have('VE','AR','MK') ? 2*S.VE + S.AR + S.MK : null;   // AFQT composite = 2VE + AR + MK
  const afqt = comp == null ? null : Math.max(1, Math.min(99, Math.round(100*normCdf((comp - 200)/36))));
  return { S, ve:S.VE, afqt, line: have('VE','MK','GS') ? S.VE + S.MK + S.GS : null };
}
/* estimate from everyday practice: last 50 answers per section, needs 10+ to count */
function practiceEstimates(){
  const h = Store.get('hist', {}); const res = {};
  SEC_ORDER.forEach(k => { const a = h[k] || []; if (a.length >= 10) res[k] = { right: a.reduce((x,y)=>x+y,0), total: a.length }; });
  const e = estimates(res); e.counts = Object.fromEntries(SEC_ORDER.map(k => [k, (h[k]||[]).length])); return e;
}
function afqtCategory(p){ return p >= 93 ? 'I' : p >= 65 ? 'II' : p >= 50 ? 'IIIA' : p >= 31 ? 'IIIB' : p >= 21 ? 'IVA' : p >= 16 ? 'IVB' : p >= 10 ? 'IVC' : 'V'; }
/* Navy IT line score rules (MyNavyHR, IT rating card). CT is a separate test given at MEPS, so the app cannot estimate it. */
const IT_RULES = [
  { id:'sg1', name:'IT, 4-year (main rule)', parts:['AR','MK','EI','VE'], min:212 },
  { id:'sg2', name:'IT, 4-year (other rule)', parts:['VE','MK','GS'], min:156 },
  { id:'atf', name:'IT, 6-year (ATF) rule', parts:['VE','AR','MK','GS'], min:214 },
];
const PART_NAME = { VE:'Verbal (WK + PC)', AR:'Arithmetic Reasoning', MK:'Math Knowledge', EI:'Electronics Information', GS:'General Science', WK:'Word Knowledge', PC:'Paragraph Comprehension' };
/* rank the IT-formula subtests from weakest to strongest. MK and VE count in every rule. */
function itFocus(e){
  const weight = { AR:2, MK:3, EI:1, GS:2, WK:3, PC:3 };
  const list = SEC_ORDER.map(k => {
    const v = e.S[k]; const need = 56;   // about 56 in each part clears 212 / 156 / 214 with a small cushion
    const prio = v == null ? 100 + weight[k] : weight[k] * (need - v);
    return { k, v, prio, why: v == null ? 'Not enough data yet. Do 10 or more.' : v < need ? `About ${need - v} points below a safe level.` : 'On track. Keep it fresh.' };
  });
  return list.sort((a,b) => b.prio - a.prio);
}
function weakTopic(sec){
  const t = Store.get('topics', {}); const tops = Object.keys(LESSONS).filter(z => LESSONS[z].section === sec);
  const scored = tops.map(z => ({ z, r: t[z] })).filter(o => o.r);
  const bad = scored.filter(o => o.r.relearn).sort((a,b) => b.r.misses - a.r.misses);
  if (bad.length) return bad[0].z;
  const unseen = tops.filter(z => !t[z]); return unseen.length ? unseen[0] : null;
}
function itPanelHTML(e, where){
  const S = e.S; const bar = (v, max) => `<div class="bar" aria-hidden="true"><div style="width:${Math.max(0,Math.min(100, Math.round(100*v/max)))}%"></div></div>`;
  const rows = IT_RULES.map(r => {
    const vals = r.parts.map(p => S[p]); const ok = vals.every(v => v != null); const sum = ok ? vals.reduce((a,b)=>a+b,0) : null;
    const weakest = ok ? r.parts.slice().sort((a,b) => S[a]-S[b])[0] : r.parts.find(p => S[p] == null);
    return `<div class="it-rule" data-rule="${r.id}"><h3>${r.name}: ${r.parts.join(' + ')} = ${r.min} or more</h3>
      ${ok ? `<p>Your estimate: ${r.parts.map(p => `${p} ${S[p]}`).join(' + ')} = <strong>${sum}</strong>. ${sum >= r.min ? 'Meets the line. Keep a cushion.' : `Need about ${r.min - sum} more points.`}</p>${bar(sum, r.min)}
      <p>Focus: ${PART_NAME[weakest]}.</p>` : `<p>Not enough data yet. Practice ${r.parts.filter(p => S[p] == null).map(p => PART_NAME[p]).join(', ')}.</p>`}</div>`;
  }).join('');
  const ct = S.VE != null && S.MK != null ? `Your VE + MK is about ${S.VE + S.MK}. With this rule, CT must be at least ${Math.max(60, 156 - S.VE - S.MK)}.` : '';
  return `<div class="card" id="itPanel"><h2>Navy IT line scores (${where})</h2>
    <p>You qualify for IT if you meet ANY one rule. Source: MyNavyHR IT rating card.</p>${rows}
    <div class="it-rule" data-rule="ct"><h3>Cyber test rule: CT + MK + VE = 156 or more, AND CT 60 or more</h3><p>CT is the Cyber Test. It is a separate test, often given at MEPS. This app cannot estimate it. Ask your recruiter about it. ${ct}</p></div>
    <h3>AFQT estimate</h3>${e.afqt == null ? '<p>Not enough data yet. Practice AR, MK, WK, and PC.</p>' :
      `<p>AFQT = 2 x VE + AR + MK. Your estimate: about <strong>${e.afqt}</strong> (category ${afqtCategory(e.afqt)}). The Navy minimum is 31. ${e.afqt >= 31 ? 'Above the minimum.' : 'Below 31. Make AR, MK, WK, and PC your first focus.'}</p>${bar(e.afqt, 99)}`}
    <div class="notice"><strong>Estimate only, confirm with a recruiter.</strong> This is NOT an official score. The real CAT-ASVAB adapts to you and uses norm tables. Rules can change.</div></div>`;
}
function mepsReport(){
  M.running = false; const res = M.res; const e = estimates(res);
  const right = Object.values(res).reduce((a,r) => a + r.right, 0), total = Object.values(res).reduce((a,r) => a + r.total, 0);
  const hist = Store.get('meps', []); hist.push({ date:new Date().toISOString(), res, afqt:e.afqt, right, total }); Store.set('meps', hist);
  const it1 = e.S.AR + e.S.MK + e.S.EI + e.S.VE;
  const sum = speakable(`Test done. You got ${right} out of ${total}. Estimated AFQT: about ${e.afqt}. IT main rule estimate: ${it1} of 212. This is only an estimate.`);
  app().innerHTML = `<h1>MEPS practice: score report</h1>
  <div class="card"><div class="row"><div class="big-word" style="flex:1" id="mepsSum">${sum.html}</div>${sayBtn('#'+sum.id)}</div></div>
  <div class="card"><table><tr><th>Part</th><th>Right</th><th>Percent</th><th>Est. standard score</th></tr>
  ${MEPS_ORDER.map(k => `<tr><td>${SECTIONS[k]}</td><td>${res[k].right} of ${res[k].total}${res[k].answered < res[k].total ? ` (${res[k].total - res[k].answered} not answered, scored as random guesses)` : ''}</td><td>${Math.round(100*res[k].right/res[k].total)}%</td><td>${e.S[k]}</td></tr>`).join('')}
  <tr><td>VE (WK + PC)</td><td colspan="2"></td><td>${e.ve}</td></tr></table></div>
  ${itPanelHTML(e, 'from this test')}
  <div class="row"><button class="primary" onclick="go('review')">Go over my misses</button><button onclick="go('progress')">My progress</button><button onclick="go('home')">Home</button></div>`;
  M = null;
  if (HF.on) HF.enter('mepsreport');
}

/* ---------------- AI question generation ---------------- */
const SEC_TOPICS = sec => Object.keys(LESSONS).filter(k => LESSONS[k].section === sec);
function arithmeticProblems(text){
  const bad = []; const re = /(-?\d+(?:\.\d+)?)\s*(x|×|\*|\/|÷|\+|-|−)\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)(?![\d.]*\s*(?:x|×|\*|\/|\^))/g; let m;
  const t = String(text).replace(/(\d),(\d{3})/g, '$1$2').replace(/\$/g, '');
  while ((m = re.exec(t))){
    const pre = t.slice(Math.max(0, m.index-2), m.index); if (/[\w^)\/]$/.test(pre.trim()) && pre.trim()) continue;   // part of a longer chain or algebra
    const a = +m[1], b = +m[3], r = +m[4]; let v;
    switch (m[2]){ case 'x': case '×': case '*': v = a*b; break; case '/': case '÷': v = a/b; break; case '+': v = a+b; break; default: v = a-b; }
    if (Math.abs(v - r) > 0.011 && Math.abs(v - r)/Math.max(1, Math.abs(r)) > 0.005 && Math.abs(v*100 - r) > 0.011) bad.push(`${m[1]} ${m[2]} ${m[3]} = ${m[4]} (should be ${+v.toFixed(4)})`);
  }
  return bad;
}
function validateGenerated(raw, sec, existing){
  const errs = []; const q = {};
  if (!raw || typeof raw !== 'object') return { errs:['not an object'] };
  q.stem = String(raw.stem || '').trim(); if (q.stem.length < 8) errs.push('stem too short');
  q.choices = Array.isArray(raw.choices) ? raw.choices.map(c => String(c).replace(/^[A-D][.)]\s*/, '').trim()) : [];
  if (q.choices.length !== 4) errs.push('needs exactly 4 choices');
  if (new Set(q.choices.map(c => c.toLowerCase())).size !== q.choices.length || q.choices.some(c => !c)) errs.push('choices repeat or are empty');
  let a = raw.answer; if (typeof a === 'string'){ a = a.trim(); a = /^[A-Da-d]$/.test(a) ? 'ABCD'.indexOf(a.toUpperCase()) : (/^\d$/.test(a) ? +a : q.choices.indexOf(a)); }
  q.answer = a; if (!(a >= 0 && a <= 3 && Number.isInteger(a))) errs.push('answer must be 0-3 or A-D');
  q.difficulty = Math.round(+raw.difficulty); if (!(q.difficulty >= 1 && q.difficulty <= 3)) errs.push('difficulty must be 1-3');
  const topics = SEC_TOPICS(sec); q.topic = topics.includes(raw.topic) ? raw.topic : topics[0];
  q.steps = Array.isArray(raw.steps) ? raw.steps.map(s => String(s).trim()).filter(Boolean) : [];
  if (q.steps.length < 2 || q.steps.length > 10) errs.push('needs 2-10 steps');
  q.explanation = String(raw.explanation || q.steps.join(' ')).trim();
  if (sec === 'PC'){ q.passage = String(raw.passage || '').trim(); if (q.passage.split(/\s+/).length < 30) errs.push('PC needs a passage of 30+ words'); }
  if (/[*_#`]/.test(q.stem + q.choices.join(''))) errs.push('has markdown symbols');
  if (existing.has(normalize(q.stem) + '|' + normalize(q.passage || ''))) errs.push('duplicate of a bank question');
  if (!errs.length && (sec === 'AR' || sec === 'MK')){
    const bad = arithmeticProblems(q.steps.join(' ') + ' ' + q.explanation); if (bad.length) errs.push('math check failed: ' + bad[0]);
    const num = (q.choices[q.answer].replace(/[$,]/g,'').match(/-?\d+(?:\.\d+)?(?:\/\d+)?/) || [])[0];
    if (num && !(q.steps.join(' ') + ' ' + q.explanation).replace(/[$,]/g,'').includes(num)) errs.push('steps never reach the keyed answer');
  }
  if (!errs.length && !q.steps.some(s => /answer/i.test(s))) q.steps.push(`Answer: ${dot(q.choices[q.answer])}`);
  return { q, errs };
}
async function generateQuestions(sec, n, out){
  out.innerHTML = '<p>Checking the AI connection...</p>';
  if (!(await llmReady())){ out.innerHTML = `<div class="notice"><p>This needs an AI API key.</p><p>Add it in Settings. Or run server.py with OPENAI_API_KEY.</p><button onclick="go('settings')">Go to Settings</button></div>`; return; }
  const ex = shuffle(sectionPool(sec).filter(q => !q.custom)).slice(0, 2).map(q => { const o = { stem:q.stem, choices:q.choices, answer:q.answer, difficulty:q.difficulty, topic:q.topic, steps:q.steps, explanation:q.explanation }; if (q.passage) o.passage = q.passage; return o; });
  const prompt = `Write ${n} new, original ASVAB-style ${SECTIONS[sec]} (${sec}) practice questions, like the CAT-ASVAB.
The reader has a reading disability. Use short sentences and plain words. No markdown. No italics.
Rules:
- Exactly 4 choices. Exactly one is correct. Wrong choices should be common mistakes.
- "answer" is the index 0-3 of the correct choice.
- "difficulty": 1 easy, 2 medium, 3 hard. Aim near ${level(sec)}. Mix a little.
- "topic": one of ${JSON.stringify(SEC_TOPICS(sec))}.
- "steps": 3 to 6 short steps, under 15 words each. The last step is "Answer: <the correct choice>."
- "explanation": one or two short sentences.
${sec === 'PC' ? '- Each question has a "passage" of 50 to 110 words. You may ask 2 or 3 questions about one passage. Repeat the same passage text exactly.\n' : ''}${sec === 'AR' || sec === 'MK' ? '- Check every calculation twice. Show the math in the steps like "12 x 3 = 36". The correct choice must match the steps.\n' : ''}${sec === 'WK' ? '- Use a sentence with the word in CAPITALS, like the examples, or the word alone.\n' : ''}- Do not copy the examples. Do not copy real ASVAB items.
Return JSON only: {"questions":[ ... ]}
Examples: ${JSON.stringify(ex)}`;
  out.innerHTML = '<p>Writing questions. This can take 20 seconds...</p>';
  try {
    const txt = await llmChat([{ role:'system', content:'You write original ASVAB practice questions. You return strict JSON only.' }, { role:'user', content: prompt }], { json:true, temperature:0.7, maxTokens:3000 });
    let data; try { data = JSON.parse(txt.replace(/^```(json)?|```$/g, '').trim()); } catch(e){ throw new Error('AI did not return valid JSON.'); }
    const arr = Array.isArray(data) ? data : (data.questions || []);
    const existing = new Set(allQuestions().map(q => normalize(q.stem) + '|' + normalize(q.passage || '')));
    const custom = Store.get('custom', []); const added = [], rejected = [];
    arr.forEach((raw, k) => { const { q, errs } = validateGenerated(raw, sec, existing);
      if (errs.length){ rejected.push(`#${k+1}: ${errs.join(', ')}`); return; }
      q.id = `C-${sec}-${Date.now().toString(36)}-${k}`; q.section = sec; q.custom = true; q.source = 'ai-generated ' + today();
      if (q.passage) q.passageId = 'CP-' + normalize(q.passage).slice(0, 24);
      existing.add(normalize(q.stem) + '|' + normalize(q.passage || '')); custom.push(q); added.push(q); });
    Store.set('custom', custom);
    out.innerHTML = `<div class="card"><p class="ok-text">Added ${added.length} new question${added.length===1?'':'s'}.</p>${rejected.length ? `<p>Rejected ${rejected.length} that failed the checks:</p><ul>${rejected.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
      <p>AI questions can still have mistakes. If one looks wrong, tell your tutor or delete it in Settings.</p></div>`;
  } catch(e){ out.innerHTML = `<div class="notice">${esc(e.message)}</div>`; }
}

/* ---------------- settings, export, import ---------------- */
function fillVoices(sel){ const vs = Speech.voices().filter(v => /^en/i.test(v.lang)); const cur = Speech.voice();
  sel.innerHTML = vs.length ? vs.map(v => `<option value="${esc(v.voiceURI)}" ${cur && v.voiceURI === cur.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})${v.localService ? '' : ' - online'}</option>`).join('') : '<option value="">Default voice</option>'; }
SCREENS.settings = () => {
  const custom = Store.get('custom', []);
  app().innerHTML = `<h1>Settings</h1>
  <div class="card"><h2>Voice</h2>
    <label for="rate">Speech speed: <span id="rateVal">${settings.rate}</span></label><input type="range" id="rate" min="0.5" max="1.5" step="0.05" value="${settings.rate}">
    <label for="voiceSel">Voice</label><select id="voiceSel"></select>
    <div class="row"><button class="small" id="testVoice">Test voice</button></div>
    <div id="sample">${wordsHTML('This is read-along mode. Each word lights up as I say it.')}</div>
    <div class="toggle"><input type="checkbox" id="readAlong" ${settings.readAlong?'checked':''}><label for="readAlong" style="margin:0">Read-along: light up words as they are read</label></div>
    <div class="toggle"><input type="checkbox" id="autoRead" ${settings.autoRead?'checked':''}><label for="autoRead" style="margin:0">Read each question aloud by itself</label></div>
    <p>${Speech.ok ? '' : 'This browser cannot read aloud.'} ${esc(Voice.note() || 'Voice answers work here.')}</p></div>
  <div class="card"><h2>Hands-free</h2>
    <div class="toggle"><input type="checkbox" id="hfAuto" ${settings.hfAuto?'checked':''}><label for="hfAuto" style="margin:0">Start hands-free by itself next time (when the mic is already allowed)</label></div>
    <div class="toggle"><input type="checkbox" id="hfWake" ${settings.hfWake?'checked':''}><label for="hfWake" style="margin:0">Wake word: only listen to commands that start with "coach"</label></div></div>
  <div class="card"><h2>Voice debug log</h2><p>What the mic heard lately, newest first. The other guesses are in brackets. Say "what did you hear" any time to hear the last few.</p>
    <div class="row"><button class="small" id="vlogRefresh">Refresh</button><button class="small" id="vlogCopy">Copy log</button><button class="small" id="vlogClear">Clear log</button></div>
    <ol id="vlog" class="vlog"></ol></div>
  <div class="card"><h2>Screen</h2>
    <div class="toggle"><input type="checkbox" id="dark" ${settings.dark?'checked':''}><label for="dark" style="margin:0">Dark, high contrast</label></div>
    <div class="toggle"><input type="checkbox" id="timerSet" ${settings.timerOn?'checked':''}><label for="timerSet" style="margin:0">Timer on in practice</label></div></div>
  <div class="card"><h2>AI (for new questions and the pasted-question tutor)</h2>
    <p>Your key stays only in this browser. It is never put in a backup file.</p>
    <label for="apiBase">API address (OpenAI-compatible)</label><input type="url" id="apiBase" value="${esc(settings.apiBase)}">
    <label for="model">Model</label><input type="text" id="model" value="${esc(settings.model)}">
    <label for="apiKey">API key</label><input type="password" id="apiKey" value="${esc(settings.apiKey)}" autocomplete="off" placeholder="sk-...">
    <div class="row"><button class="primary" id="saveAI">Save</button><button id="testAI">Test AI</button><button id="clearKey">Remove key</button></div><div id="aiOut"></div></div>
  <div class="card"><h2>Backup</h2><p>Save everything to a file: the questions, AI questions (${custom.length}), and your progress.</p>
    <div class="row"><button class="primary" id="exportBtn">Download question bank</button><label class="btn" for="importFile" style="margin:0;display:inline-flex;align-items:center">Import a backup</label><input type="file" id="importFile" accept="application/json,.json" class="hidden"></div><div id="ioOut"></div></div>
  <div class="card"><h2>Clean up</h2><div class="row"><button id="clearCustom">Delete AI questions (${custom.length})</button><button id="resetAll">Reset all progress</button></div></div>
  <p>Questions are original ASVAB-style practice items, not real ASVAB questions. App version ${esc(APP_VERSION)}.</p>`;
  const drawLog = () => { const el = $('#vlog'); if (!el) return; const rows = VOICE_LOG.slice(-40).reverse();
    el.innerHTML = rows.length ? rows.map(x => `<li><b>${esc(x.at.slice(11, 19))}</b> ${esc(x.ctx || '')}: ${x.text ? '"' + esc(x.text) + '"' : '<i>(' + esc(x.error || 'nothing') + ')</i>'}${x.alts && x.alts.length > 1 ? ' [' + esc(x.alts.slice(1).join(' | ')) + ']' : ''}${x.echo ? ' (own voice, ignored)' : ''}</li>`).join('') : '<li>Nothing yet. Turn on hands-free and say something.</li>'; };
  drawLog(); $('#vlogRefresh').onclick = drawLog;
  $('#vlogClear').onclick = () => { VOICE_LOG.length = 0; try { localStorage.removeItem('asvab.voicelog'); } catch(e){} drawLog(); };
  $('#vlogCopy').onclick = () => { const t = JSON.stringify(VOICE_LOG.slice(-40), null, 1); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Log copied.'), () => toast('Could not copy.')); };
  const sel = $('#voiceSel'); fillVoices(sel); sel.onchange = () => { settings.voiceURI = sel.value; saveSettings(); };
  $('#rate').oninput = e => { settings.rate = +e.target.value; $('#rateVal').textContent = settings.rate; saveSettings(); };
  $('#testVoice').onclick = () => Speech.speakEl($('#sample'));
  [['readAlong','readAlong'],['autoRead','autoRead'],['dark','dark'],['timerSet','timerOn'],['hfAuto','hfAuto'],['hfWake','hfWake']].forEach(([id,k]) => $('#'+id).onchange = e => { settings[k] = e.target.checked; saveSettings(); });
  $('#saveAI').onclick = () => { settings.apiBase = $('#apiBase').value.trim() || DEFAULT_SETTINGS.apiBase; settings.model = $('#model').value.trim() || DEFAULT_SETTINGS.model; settings.apiKey = $('#apiKey').value.trim(); saveSettings(); toast('Saved.'); };
  $('#clearKey').onclick = () => { settings.apiKey = ''; $('#apiKey').value = ''; saveSettings(); toast('Key removed.'); };
  $('#testAI').onclick = async () => { $('#saveAI').click(); $('#aiOut').textContent = 'Testing...'; try { const r = await llmChat([{ role:'user', content:'Reply with the single word: ready' }], { maxTokens:5 }); $('#aiOut').innerHTML = `<p class="ok-text">AI works. It said: ${esc(r)}</p>`; } catch(e){ $('#aiOut').innerHTML = `<p class="bad-text">${esc(e.message)}</p>`; } };
  $('#exportBtn').onclick = exportAll;
  $('#importFile').onchange = e => { const f = e.target.files[0]; if (f) importAll(f); };
  $('#clearCustom').onclick = () => { if (confirm('Delete all AI-made questions?')){ Store.set('custom', []); go('settings'); } };
  $('#resetAll').onclick = () => { if (confirm('Erase ALL progress, misses, and scores on this device? Download a backup first if you want one.')){ Store.keys().filter(k => k !== 'settings').forEach(k => localStorage.removeItem(KEY+k)); go('home'); } };
};
function exportData(){
  const progress = {}; Store.keys().forEach(k => { progress[k] = Store.get(k); });
  if (progress.settings) progress.settings = Object.assign({}, progress.settings, { apiKey:'' });   // never export the key
  return { app:'ASVAB Coach', format:1, exportedAt:new Date().toISOString(), bankVersion:BANK.version, questions:BANK.questions, lessons:LESSONS, custom:Store.get('custom', []), progress };
}
function exportAll(){
  const blob = new Blob([JSON.stringify(exportData(), null, 1)], { type:'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `asvab-coach-backup-${today()}.json`; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Backup downloaded.');
}
function importAll(file){
  const rd = new FileReader();
  rd.onload = () => { try {
      const d = JSON.parse(rd.result); if (d.app !== 'ASVAB Coach' || !d.progress) throw new Error('This is not an ASVAB Coach backup.');
      if (!confirm('Replace the progress on this device with this backup?')) return;
      const keep = settings.apiKey;
      Object.entries(d.progress).forEach(([k,v]) => { if (k !== 'settings') Store.set(k, v); });
      if (d.progress.settings){ settings = Object.assign({}, DEFAULT_SETTINGS, d.progress.settings, { apiKey: keep }); saveSettings(); }
      if (Array.isArray(d.custom)) Store.set('custom', d.custom);
      $('#ioOut').innerHTML = `<p class="ok-text">Backup restored. ${(d.custom||[]).length} AI questions. ${(d.progress.errors||[]).length} misses.</p>`; renderStreak();
    } catch(e){ $('#ioOut').innerHTML = `<p class="bad-text">${esc(e.message)}</p>`; } };
  rd.readAsText(file);
}

/* ---------------- start ---------------- */
function boot(){
  saveSettings(); renderStreak();
  const [name, arg] = (location.hash.slice(1) || 'home').split('/');
  go(['home','practice','handsfree','tutor','review','progress','meps','settings','lesson','ladder','ladlesson','audio','drill','vocab','readalong'].includes(name) ? name : 'home', arg);
  renderHfBar();
  // auto-resume hands-free when he asked for it and the mic is already allowed (no prompt needed)
  if (settings.hfAuto && !Voice.why()){
    const tryStart = () => { HF.start({ auto:true }); if (HF.on && (location.hash.startsWith('#home') || !location.hash)) SCREENS.home(); };
    if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name:'microphone' }).then(p => { if (p.state === 'granted') tryStart(); }).catch(() => {});
  }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.ASVAB_SINGLE_FILE)
  { navigator.serviceWorker.register('sw.js').then(r => r.update && r.update()).catch(err => console.warn('Service worker not registered:', err.message));
    // When a new version takes over, reload once so old installs get the new app.
    let reloaded = false; const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded && !(M && M.running)){ reloaded = true; location.reload(); } }); }
}
window.addEventListener('keydown', e => {   // keyboard: 1-4 or A-D to answer, N for next
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const k = e.key.toLowerCase(); const i = 'abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : '1234'.indexOf(k);
  if (i >= 0){ const b = $$('.choice')[i]; if (b && !b.disabled){ b.click(); e.preventDefault(); } }
  if (k === 'n'){ const b = $('#nextBtn'); if (b) b.click(); }
});
// boot runs from handsfree.js, the last script, so every part is loaded first
