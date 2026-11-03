/* v2.7.1: suspended can no longer stay stuck while the page is visible.
   v2.7.0: screen-off pause and resume, mic status chip, mic test, and headset list.
   Hands-free never keeps the screen on. When the screen turns off, everything pauses cleanly and a snapshot is saved.
   When the screen comes back (or the page reloads within 2 hours), it picks up on the same question with the same time left. */
'use strict';
const HF_SNAP_KEY = 'hfSnap', HF_SNAP_MAX_MS = 2 * 60 * 60 * 1000, HF_SNAP_V = 1;
const LOCK_NOTE = 'Locking the screen pauses hands-free. Unlock to pick up where you left off.';
const MIC_CHIP = {
  listening: ['Listening', 'ok'], heard: ['Listening', 'ok'], paused: ['Paused (screen off)', 'warn'],
  'no-speech': ['Heard nothing', 'warn'], aborted: ['Listening', 'ok'],
  'not-allowed': ['Blocked', 'bad'], 'service-not-allowed': ['Blocked', 'bad'], 'start-failed': ['Blocked', 'bad'],
  'audio-capture': ['No mic', 'bad'], network: ['Offline', 'bad'], unsupported: ['Browser unsupported', 'bad'],
};
function micChipLabel(code){
  if (!Voice.ok || code === 'unsupported') return MIC_CHIP.unsupported;
  if (navigator.onLine === false) return MIC_CHIP.network;
  return MIC_CHIP[code] || ['Listening', 'ok'];
}
async function micPermState(){
  try { if (navigator.permissions && navigator.permissions.query){ const p = await navigator.permissions.query({ name:'microphone' }); return p.state; } } catch(e){}
  return 'unknown';
}
// which browser help to give when the mic does not work
function micHelpText(){
  const ua = navigator.userAgent || '';
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|wv\)|; wv|GSA\//.test(ua);
  const firefox = /Firefox|FxiOS/.test(ua);
  const out = [];
  if (inApp || firefox || !Voice.ok) out.push('This browser cannot hear voice answers. Open this page in Chrome.');
  if (iOS) out.push('iPhone: open Settings, then Siri and Dictation (or General, Keyboard), and turn Dictation on. Then allow the mic for this site in Safari.');
  out.push('In Chrome: tap the lock or settings icon next to the web address, then Site settings, then Microphone, then Allow. Then reload.');
  return out;
}

Object.assign(HF, {
  suspended:false, mic:'listening', netFails:0,
  setMic(code){ this.mic = code; const el = document.getElementById('micChip'); if (!el) return; const [t, c] = micChipLabel(code);
    el.textContent = 'Mic: ' + t; el.className = 'mic-chip ' + c; el.dataset.code = code; },
  // v2.7.1: if the page is visible but suspended stayed true (a freeze/pagehide with no matching resume event, common on Android), wake after 1 s
  waitVisible(){ return new Promise(res => { let vis = 0; const chk = () => { if (!this.on) return res(); if (!document.hidden && !this.suspended) return res();
    if (!document.hidden){ vis = vis || Date.now(); if (Date.now() - vis > 1000){ this.dbg && this.dbg('unstuck suspended'); this.wake(); return res(); } } else vis = 0;
    setTimeout(chk, 250); }; chk(); }); },
  snapshot(){
    const snap = { v:HF_SNAP_V, ts:Date.now(), on:this.on, ctxName:this.ctxName, arg:(typeof this.arg === 'string' || typeof this.arg === 'number') ? this.arg : null, hash:location.hash || '#home' };
    if (S && S.qs) snap.S = { sec:S.sec, qIds:S.qs.map(q => q.id), i:S.i, results:S.results, left:S.left, timerOn:!!S.timerOn, per:S.per, mode:S.mode, byEar:!!S.byEar, hints:S.hints || 0, answered:!!S.answered };
    if (typeof T !== 'undefined' && T && T.q) snap.T = { qId:T.q.id, hints:T.hints, wrong:[...(T.wrong || [])] };
    if (M && M.running) snap.M = { kind:M.kind, part:M.part, sec:M.sec, left:M.end ? (M.end - Date.now()) / 1000 : null };
    if (typeof AL !== 'undefined' && AL) snap.AL = { i:AL.i, j:AL.j };
    snap.hint = S ? (S.hints || 0) : (typeof T !== 'undefined' && T ? T.hints : 0);
    try { localStorage.setItem(HF_SNAP_KEY, JSON.stringify(snap)); } catch(e){}
    return snap;
  },
  // screen off, app switched, or page frozen: stop everything cleanly
  suspend(why){
    if (this.suspended) return; this.suspended = true; this.epoch++;
    try { Voice.stop(); } catch(e){} try { Speech.stop(); } catch(e){} try { window.speechSynthesis && speechSynthesis.cancel(); } catch(e){}
    if (S && S.timer){ clearInterval(S.timer); S.timer = null; S.pausedLeft = S.left; }
    if (M && M.timer && M.end){ clearInterval(M.timer); M.timer = null; M.pausedLeft = (M.end - Date.now()) / 1000; }
    if (typeof AL !== 'undefined' && AL && AL.playing){ AL.run = (AL.run || 0) + 1; AL.wasPlaying = true; }
    if (this.on) this.snapshot();
    this.setMic('paused');
  },
  // screen back on (same page still in memory)
  wake(){
    if (!this.suspended) return; this.suspended = false;
    if (S && S.pausedLeft != null && !S.answered){ S.left = S.pausedLeft; delete S.pausedLeft; qTimerStart(); }
    if (M && M.pausedLeft != null){ M.end = Date.now() + M.pausedLeft * 1000; delete M.pausedLeft; M.timer = setInterval(mepsTick, 500); }
    if (!this.on) return;
    this.setMic('listening');
    const n = S && S.qs && this.ctxName === 'question' ? S.i + 1 : null;
    this.welcome = n ? `Welcome back. Here is question ${n} again:` : 'Welcome back.';
    this.enter(this.ctxName, this.arg);
    this.loop();
  },
});
// say "welcome back" once before the screen's own intro
(() => { const en = HF.enter;
  HF.enter = function(name, arg){
    const w = this.welcome; this.welcome = null;
    if (!w || !this.on || this.paused) return en.call(this, name, arg);
    this.misses = 0; this.ctxName = name; this.arg = arg; this.ctx = VCTX[name] || null; this.dictation = null; renderHfBar();
    this.run(async alive => { await Speech.say(w); if (!alive()) return; if (this.ctx && this.ctx.intro) await this.ctx.intro(alive, arg); });
  };
  const st = HF.stop; HF.stop = function(...a){ try { localStorage.removeItem(HF_SNAP_KEY); } catch(e){} return st.apply(this, a); };
})();
function hfLifecycle(e){
  const hide = e.type === 'pagehide' || e.type === 'freeze' || (e.type === 'visibilitychange' && document.hidden);
  if (hide) HF.suspend(e.type); else if (!document.hidden) HF.wake();
}
['visibilitychange', 'pagehide', 'pageshow', 'freeze', 'resume'].forEach(t => (t === 'freeze' || t === 'resume' ? document : (t === 'visibilitychange' ? document : window)).addEventListener(t, hfLifecycle));
window.addEventListener('online', () => HF.on && HF.setMic(HF.mic)); window.addEventListener('offline', () => HF.on && HF.setMic('network'));

// cold boot: if the page was thrown away while the screen was off, rebuild the same spot
function hfReadSnap(){ try { const s = JSON.parse(localStorage.getItem(HF_SNAP_KEY)); if (s && s.v === HF_SNAP_V && Date.now() - s.ts < HF_SNAP_MAX_MS) return s; } catch(e){} return null; }
async function hfRestore(snapIn){
  const snap = snapIn || hfReadSnap(); if (!snap || !snap.on) return false;
  try { localStorage.removeItem(HF_SNAP_KEY); } catch(e){}
  let n = null;
  if (snap.S && snap.ctxName === 'question'){
    const qs = snap.S.qIds.map(qById).filter(Boolean);
    if (qs.length === snap.S.qIds.length){
      cleanup(); S = { sec:snap.S.sec, qs, i:snap.S.i, results:snap.S.results || [], hf:true, timerOn:snap.S.timerOn, per:snap.S.per || CAT[snap.S.sec][1]*60/CAT[snap.S.sec][0], mode:snap.S.mode || 'handsfree', byEar:snap.S.byEar };
      S.resumeLeft = snap.S.left; n = S.i + 1;
    }
  }
  const begin = async (fromTap) => {
    const ok = await HF.start({ fromSession:true, quiet:true }); if (!ok) return false;
    HF.welcome = n ? `Welcome back. Here is question ${n} again:` : 'Welcome back.';
    if (n){ HF.ctxName = 'question'; renderQ(); history.replaceState(null, '', '#practice/' + S.sec); for (let k = 0; k < (snap.S.hints || 0); k++) showHint(S.qs[S.i]); }
    else {
      const [name, arg] = (snap.hash.slice(1) || 'home').split('/');
      if (snap.T && name === 'tutor'){ go('tutor'); const q = qById(snap.T.qId); if (q){ startBankTutor(q); T.hints = 0; } }
      else go(SCREENS[name] && name !== 'meps-run' ? name : (name === 'meps-run' ? 'meps' : 'home'), arg);
      if (snap.AL && typeof AL !== 'undefined' && AL){ AL.i = snap.AL.i; AL.j = Math.max(0, snap.AL.j - 1); alShow(); }
    }
    return true;
  };
  // show the restored question right away (silent), so he can see it under the tap button
  if (n){ renderQ(); if (S.timer){ clearInterval(S.timer); S.timer = null; } S.resumeLeft = S.left; history.replaceState(null, '', '#practice/' + S.sec); }
  const st = await micPermState();
  if (st === 'granted' && !Voice.why()){ await begin(); if (HF.on) return true; }
  hfTapToContinue(begin, n);
  return true;
}
function hfTapToContinue(begin, n){
  let b = document.getElementById('hfContinue'); if (b) b.remove();
  b = document.createElement('div'); b.id = 'hfContinue'; b.className = 'hf-continue';
  b.innerHTML = `<button class="hf-start" id="hfContinueBtn">Tap to continue hands-free</button><p>${n ? `You were on question ${n}. ` : ''}${esc(LOCK_NOTE)}</p>`;
  document.body.appendChild(b);
  $('#hfContinueBtn').onclick = async () => { b.remove(); await begin(true); };
}

/* ---------- mic test (Settings and the hands-free start card) ---------- */
const MIC_DEV_KEY = 'asvab.micDevice';
async function micTest(box){
  box = typeof box === 'string' ? document.querySelector(box) : box; if (!box) return;
  const out = t => { box.querySelector('.mt-out').textContent = t; };
  box.innerHTML = `<div class="meter"><div class="mt-level" style="width:0%"></div></div><p class="mt-out">Checking the mic...</p><ul class="mt-help"></ul>`;
  const help = () => { box.querySelector('.mt-help').innerHTML = micHelpText().map(x => `<li>${esc(x)}</li>`).join(''); };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ out('This browser cannot use the mic here.'); help(); return { error:'unsupported' }; }
  let stream;
  try {
    const id = localStorage.getItem(MIC_DEV_KEY);
    stream = await navigator.mediaDevices.getUserMedia({ audio: id ? { deviceId:{ ideal:id } } : true });
  } catch(e){
    const code = e && e.name === 'NotFoundError' ? 'audio-capture' : 'not-allowed';
    out(code === 'audio-capture' ? 'No mic found. Plug in or connect a headset, then try again.' : 'The mic is blocked for this site.'); help(); HF.setMic(code); return { error:code };
  }
  // level meter for about 3 seconds
  out('Say something. Watch the bar move.');
  let peak = 0;
  try { const AC = window.AudioContext || window.webkitAudioContext; if (AC){ const ac = new AC(); const src = ac.createMediaStreamSource(stream); const an = ac.createAnalyser(); an.fftSize = 512; src.connect(an);
      const buf = new Uint8Array(an.fftSize); const lv = box.querySelector('.mt-level'); const t0 = Date.now();
      await new Promise(res => { const tick = () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); peak = Math.max(peak, m); lv.style.width = Math.min(100, m * 1.6) + '%'; if (Date.now() - t0 < 3000) requestAnimationFrame(tick); else res(); }; tick(); });
      ac.close && ac.close(); } } catch(e){}
  stream.getTracks().forEach(t => t.stop());
  listMics(true);
  if (Voice.why()){ out('The mic works, but this browser cannot turn speech into words. ' + Voice.why()); help(); return { error:'unsupported', peak }; }
  out('Now say a few words. Listening for 5 seconds...');
  const r = await Voice.listen(5000, {});
  if (r.error){ const [lab] = micChipLabel(r.error); out(r.error === 'no-speech' ? 'I heard nothing. Speak louder or move closer to the mic.' : `Voice error: ${lab} (${r.error}).`); if (r.error !== 'no-speech') help(); return { error:r.error, peak }; }
  out(r.text ? `I heard: "${r.text}". Your mic works.` : 'I heard sound but no words. Try again.'); return { text:r.text, peak };
}

/* ---------- headset list ---------- */
function micKind(label){ const l = String(label || '').toLowerCase();
  if (/bluetooth|airpods|buds|bt\b|hands-?free|wireless|beats|jabra|bose|sony wh|wf-/.test(l)) return 'Bluetooth';
  if (/usb|headset|headphone|earphone|wired|jack|lightning|type-c|usb-c|external/.test(l)) return 'Wired';
  return 'Built-in'; }
let MIC_DEVS = null;
async function listMics(quiet){
  const box = document.getElementById('micList');
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices){ if (box) box.textContent = 'This browser cannot list mics.'; return []; }
  let devs = []; try { devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput'); } catch(e){}
  const old = MIC_DEVS; MIC_DEVS = devs;
  if (old && !quiet) for (const d of devs) if (d.label && !old.some(o => o.deviceId === d.deviceId)) toast('Headset connected: ' + d.label);
  if (box){
    if (!devs.length) box.innerHTML = '<p>No mics found.</p>';
    else if (!devs.some(d => d.label)) box.innerHTML = '<p>Tap Test mic once so the browser shows the mic names.</p>';
    else { const cur = localStorage.getItem(MIC_DEV_KEY) || 'default';
      box.innerHTML = devs.map((d, k) => `<div class="toggle"><input type="radio" name="micDev" id="md${k}" value="${esc(d.deviceId)}" ${d.deviceId === cur ? 'checked' : ''}><label for="md${k}" style="margin:0">${esc(d.label || 'Mic ' + (k+1))} (${micKind(d.label)})</label></div>`).join('');
      box.querySelectorAll('input[name=micDev]').forEach(r => r.onchange = () => { localStorage.setItem(MIC_DEV_KEY, r.value); toast('Mic saved for Test mic.'); }); }
  }
  return devs;
}
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', () => listMics(false));

const MIC_NOTE = "Voice answers use your phone's default mic. Connect your headset and the phone usually switches to it.";
function micCardHTML(){ return `<div class="card" id="micCard"><h2>Microphone</h2>
  <div class="row"><button class="small" id="micTestBtn">Test mic</button><button class="small" id="micListBtn">Refresh mic list</button></div>
  <div id="micTestBox" class="mic-test"></div>
  <h3>Headsets and mics</h3><div id="micList"></div><p>${esc(MIC_NOTE)}</p><p>${esc(LOCK_NOTE)}</p></div>`; }
function wireMicCard(){ const t = $('#micTestBtn'); if (t) t.onclick = () => micTest('#micTestBox'); const l = $('#micListBtn'); if (l) l.onclick = () => listMics(true); listMics(true); }
(() => {
  const se = SCREENS.settings; SCREENS.settings = function(...a){ const r = se.apply(this, a); const h = app().querySelector('.card'); (h ? h.parentNode : app()).insertAdjacentHTML('beforeend', micCardHTML()); wireMicCard(); return r; };
  const ho = SCREENS.home; SCREENS.home = function(...a){ const r = ho.apply(this, a); const c = app().querySelector('.hf-card');
    if (c && !HF.on){ c.insertAdjacentHTML('beforeend', `<button class="small" id="hfMicTest">Test mic</button><div id="hfMicBox" class="mic-test"></div><p><small>${esc(LOCK_NOTE)}</small></p>`); $('#hfMicTest').onclick = () => micTest('#hfMicBox'); }
    return r; };
})();
