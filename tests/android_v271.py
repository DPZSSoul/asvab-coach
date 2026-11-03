"""2.7.1: Android Chrome emulation. The recognizer fails if started while (or up to ~700 ms after, audio focus release) the device voice speaks,
ignores continuous, sometimes leaves speechSynthesis.speaking stuck, and Test mic runs first. Hands-free must keep listening and act."""
import os, sys, json, pathlib, time
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765/')
APP = pathlib.Path(__file__).resolve().parent.parent
FAKES = open(APP/'tests'/'fakes.js').read()
ANDROID = """(() => { const R = window.webkitSpeechRecognition; let lastSpeakEnd = 0; const sy = window.speechSynthesis;
  const sp = sy.speak.bind(sy); sy.speak = u => { const oe = () => { lastSpeakEnd = Date.now(); }; const w = setInterval(() => { if (!sy.speaking){ oe(); clearInterval(w); } }, 20); sp(u);
    if (window.__stuckOnce){ window.__stuckOnce = false; const o = u.onend; u.onend = e => { o && o(e); setTimeout(() => { sy.speaking = true; }, 0); }; } };
  window.__androidFails = 0;
  class A extends R { set continuous(v){} get continuous(){ return false; }
    start(){ if (sy.speaking || Date.now() - lastSpeakEnd < (window.__focusMs || 700)){ window.__androidFails++; const code = window.__failCode || 'aborted';
        this._live = false; setTimeout(() => { this.onerror && this.onerror({ error:code }); this.onend && this.onend(); }, 30); return; }
      super.start(); } }
  window.webkitSpeechRecognition = A; window.SpeechRecognition = A; })();"""
res = []
def ok(n, c, i=''): res.append((n, bool(c), i)); print(('PASS ' if c else 'FAIL ') + n + (f'  [{i}]' if i else ''), flush=True)
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'])
    for code in ['aborted', 'audio-capture', 'not-allowed']:
        ctx = br.new_context(user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36')
        ctx.grant_permissions(['microphone'], origin=BASE.rstrip('/'))
        ctx.add_init_script(FAKES); ctx.add_init_script(ANDROID); ctx.add_init_script(f"window.__failCode = '{code}';")
        p = ctx.new_page(); errors = []; p.on('pageerror', lambda e: errors.append(str(e)))
        p.set_default_timeout(15000); p.goto(BASE + 'index.html?fast=1&silence=800&reply=300'); p.wait_for_selector('h1')
        p.evaluate("localStorage.clear(); settings.hfAuto = false; saveSettings()")
        ok(f'[{code}] version 2.7.1', p.evaluate("APP_VERSION").startswith('2.7.1'))
        # Test mic first (works, like on his phone)
        p.evaluate("window.__heard.push('so you can hear my')"); p.click('#hfMicTest')
        p.wait_for_function("/heard/i.test(document.querySelector('#hfMicBox .mt-out').textContent)", timeout=20000)
        ok(f'[{code}] test mic transcribes', 'so you can hear my' in p.inner_text('#hfMicBox'))
        # simulate a stale screen-off flag from a freeze event, then start hands-free
        p.evaluate("document.dispatchEvent(new Event('freeze'))")
        p.evaluate("window.__stuckOnce = true; window.__heard.push('__error:no-speech')")   # first answer: no
        p.click('#hfStartBig'); time.sleep(0.5)
        # force recognizer starts during speech
        p.evaluate("HF.say('This is a fairly long sentence so the mic is asked to open while the voice is still talking')")
        time.sleep(4)
        ok(f'[{code}] hands-free stays on after Android mic errors', p.evaluate("HF.on"), str(p.evaluate("[HF.on, HF.mic, HF.lastEv, window.__androidFails]")))
        ok(f'[{code}] not stuck suspended', not p.evaluate("HF.suspended"))
        p.evaluate("HF.pending && HF.pending.resolve(false); HF.pending = null")
        p.evaluate("window.__heard.push('history')")
        try: p.wait_for_function("location.hash.startsWith('#progress') || location.hash.startsWith('#history') || /Heard: \"history/.test((document.getElementById('hfHeard')||{}).textContent||'')", timeout=15000); acted = True
        except Exception: acted = False
        ok(f'[{code}] says "history" -> heard and acted', acted, str(p.evaluate("[location.hash, (document.getElementById('hfHeard')||{}).textContent, HF.lastEv]")))
        ok(f'[{code}] debug line visible', p.locator('#hfDbg').count() == 1 and 'last:' in p.inner_text('#hfDbg'), p.inner_text('#hfDbg') if p.locator('#hfDbg').count() else '')
        ok(f'[{code}] no page errors', not errors, ' | '.join(errors[:3]))
        ctx.close()
    br.close()
json.dump(res, open(APP/'tests'/'android_v271_results.json', 'w'), indent=1)
sys.exit(0 if all(r[1] for r in res) else 1)
