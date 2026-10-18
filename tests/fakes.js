// Test doubles injected before the app loads: fake TTS (with or without boundary events) and fake speech recognition.
(() => {
  const params = new URLSearchParams(location.search);
  window.__spoken = []; window.__boundaryMode = params.get('boundary') !== '0';
  class U { constructor(t){ this.text = t; this.rate = 1; } }
  const synth = { speaking:false, pending:false, _cur:null, getVoices(){ return [{ name:'Fake US', lang:'en-US', voiceURI:'fake', localService:true }]; },
    speak(u){ this.speaking = true; this._cur = u; window.__spoken.push(u.text); const words = [...u.text.matchAll(/\S+/g)]; const per = params.get('fast') ? 6 : window.__boundaryMode ? 60 : 250;
      setTimeout(() => { u.onstart && u.onstart({}); }, 10);
      if (window.__boundaryMode) words.forEach((m,i) => setTimeout(() => { if (this._cur === u) u.onboundary && u.onboundary({ name:'word', charIndex:m.index }); }, 20 + i*(params.get('fast') ? 6 : 60)));
      setTimeout(() => { if (this._cur === u){ this.speaking = false; this._cur = null; u.onend && u.onend({}); } }, 40 + words.length*per); },
    cancel(){ const u = this._cur; this._cur = null; this.speaking = false; if (u && u.onend) u.onend({}); }, onvoiceschanged:null };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable:true });
  window.SpeechSynthesisUtterance = U;
  window.__heard = [];   // queue of transcripts the fake recognizer will "hear"
  window.__recStarts = 0;
  window.__recWhileSpeaking = 0; window.__silenceMs = +(params.get('silence') || 0); window.__replyMs = +(params.get('reply') || 1300);
  class FakeRec { start(){ window.__recStarts++; if (window.speechSynthesis.speaking) window.__recWhileSpeaking++;
      const started = Date.now(); this._live = true;
      const tick = () => { if (!this._live) return;
        // a real person needs a moment to answer; only an echo of the app's own voice comes back at once
        const nxt = window.__heard[0]; if (nxt != null && nxt !== '__echo' && Date.now() - started < window.__replyMs){ this._h = setTimeout(tick, 40); return; }
        const t = window.__heard.shift();
        if (t == null){ if (Date.now() - started < window.__silenceMs){ this._h = setTimeout(tick, 40); return; }
          this._live = false; this.onerror && this.onerror({ error:'no-speech' }); this.onend && this.onend(); return; }
        this._live = false; window.__recog = (window.__recog || []).concat(t);
        if (t.startsWith('__error:')){ this.onerror && this.onerror({ error:t.slice(8) }); this.onend && this.onend(); return; }
        if (t === '__empty'){ this.onresult && this.onresult({ resultIndex:0, results: [Object.assign([{ transcript:'' }], { isFinal:true })] }); this.onend && this.onend(); return; }
        if (t === '__echo'){ const last = window.__spoken[window.__spoken.length - 1] || ''; const w = last.split(/\s+/); const tail = w.slice(-5).join(' ');
          this.onresult && this.onresult({ resultIndex:0, results: [Object.assign([{ transcript:tail }], { isFinal:true })] }); this.onend && this.onend(); return; }
        if (t.startsWith('~')){   // interim only: the engine never sends a final result
          this.onresult && this.onresult({ resultIndex:0, results: [Object.assign([{ transcript:t.slice(1) }], { isFinal:false })] }); this.onend && this.onend(); return; }
        const alts = t.split('||');   // "hey||a||eh": several alternatives for one final result
        this.onresult && this.onresult({ resultIndex:0, results: [Object.assign(alts.map(x => ({ transcript:x })), { isFinal:true })] }); this.onend && this.onend(); };
      this._h = setTimeout(tick, 50); }
    stop(){ this.abort(); }
    abort(){ if (!this._live) return; this._live = false; clearTimeout(this._h); this.onerror && this.onerror({ error:'aborted' }); this.onend && this.onend(); } }
  if (params.get('norec') !== '1') { window.webkitSpeechRecognition = FakeRec; window.SpeechRecognition = FakeRec; }
  else { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; }
})();
