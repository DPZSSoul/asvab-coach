"""2.7.0: screen-off pause/resume (same question + timer), errors while hidden, mic chip, mic test, headset list."""
import os, sys, json, pathlib, time
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765/')
APP = pathlib.Path(__file__).resolve().parent.parent
FAKES = open(APP/'tests'/'fakes.js').read()
HIDE = """(() => { let h = false; Object.defineProperty(document, 'hidden', { get: () => h, configurable:true });
  Object.defineProperty(document, 'visibilityState', { get: () => h ? 'hidden' : 'visible', configurable:true });
  window.__setHidden = (v, fire = true) => { h = v; if (fire) document.dispatchEvent(new Event('visibilitychange')); }; })();"""
res = []
def ok(n, c, i=''): res.append((n, bool(c), i)); print(('PASS ' if c else 'FAIL ') + n + (f'  [{i}]' if i else ''), flush=True)
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'])
    ctx = br.new_context(); ctx.add_init_script(FAKES); ctx.add_init_script(HIDE); errors = []
    p = ctx.new_page()
    p.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None); p.on('pageerror', lambda e: errors.append(str(e)))
    p.set_default_timeout(15000); p.goto(BASE + 'index.html?fast=1&silence=1500'); p.wait_for_selector('h1')
    p.evaluate("localStorage.clear(); settings.hfAuto = false; saveSettings()")
    ok('version 2.7.x', p.evaluate("APP_VERSION").startswith('2.7.'))
    ok('no italics tags', p.evaluate("document.querySelectorAll('i,em').length") == 0)
    ok('home start card has Test mic + lock note', p.locator('#hfMicTest').count() == 1 and 'Locking the screen pauses hands-free' in p.inner_text('.hf-card'))
    # practice in hands-free with a timer, move to question 2
    p.evaluate("AR_REAL = true; startSession('AR', 3, { skipReview:true, hf:true, timer:true })"); p.wait_for_selector('.choice'); time.sleep(1)
    p.evaluate("nextQ()"); p.wait_for_function("S && S.i === 1"); time.sleep(2)
    ok('mic chip shown in bar', p.locator('#micChip').count() == 1 and 'Mic:' in p.inner_text('#micChip'), p.inner_text('#micChip'))
    qid = p.evaluate("S.qs[1].id")
    p.evaluate("__setHidden(true)"); time.sleep(0.3)
    snap = p.evaluate("JSON.parse(localStorage.getItem('hfSnap'))")
    left0 = snap['S']['left']
    ok('suspend: flags, timer stopped, snapshot saved', p.evaluate("HF.suspended && !S.timer") and snap['S']['qIds'][1] == qid and snap['S']['i'] == 1 and snap['ctxName'] == 'question', str({k: snap[k] for k in ['ctxName', 'hash']}))
    time.sleep(2.5)
    ok('timer frozen while hidden', abs(p.evaluate("S.left") - left0) < 0.3, f"{left0} -> {p.evaluate('S.left')}")
    ok('hands-free still on while hidden', p.evaluate("HF.on"))
    n0 = p.evaluate("window.__spoken.length")
    p.evaluate("__setHidden(false)"); time.sleep(2)
    sp = ' '.join(p.evaluate("n => window.__spoken.slice(n)", n0))
    ok('wake: welcome back + same question re-read', 'Welcome back. Here is question 2 again' in sp and p.evaluate("S.i") == 1, sp[:140])
    l1 = p.evaluate("S.left"); time.sleep(1.2); l2 = p.evaluate("S.left")
    ok('wake: timer restarts from saved left', l1 <= left0 + 0.1 and left0 - l1 < 3 and l2 < l1, f"{left0} {l1} {l2}")
    # errors while the screen is off (no event yet, as when the lock races the recognizer) do not turn hands-free off
    time.sleep(1); p.evaluate("__setHidden(true, false); window.__heard.push('__error:not-allowed', '__error:audio-capture', '__error:aborted')"); time.sleep(2.5)
    ok('errors while hidden keep hands-free on', p.evaluate("HF.on"), str(p.evaluate("HF.mic")))
    p.evaluate("__setHidden(false, false)"); time.sleep(1)
    # network error: chip Offline, backoff, still on
    p.evaluate("window.__heard.length = 0; window.__heard.push('__error:network')"); p.wait_for_function("HF.mic === 'network'", timeout=10000)
    ok('network error: chip Offline, hands-free stays on', 'Offline' in p.inner_text('#micChip') and p.evaluate("HF.on && HF.netFails >= 1"), p.inner_text('#micChip'))
    states = p.evaluate("""['listening','no-speech','not-allowed','audio-capture','network','unsupported'].map(c => { HF.setMic(c); return document.getElementById('micChip').textContent; })""")
    ok('chip states', states == ['Mic: Listening', 'Mic: Heard nothing', 'Mic: Blocked', 'Mic: No mic', 'Mic: Offline', 'Mic: Browser unsupported'], str(states))
    # cold boot restore: snapshot then reload (page thrown away while the screen was off)
    p.evaluate("HF.setMic('listening'); nextQ()"); p.wait_for_function("S && S.i === 2"); time.sleep(1.5)
    qid3 = p.evaluate("S.qs[2].id")
    p.evaluate("__setHidden(true)"); left3 = p.evaluate("JSON.parse(localStorage.getItem('hfSnap')).S.left")
    p.reload(); p.wait_for_selector('h1'); time.sleep(1)
    tap = p.locator('#hfContinueBtn').count() == 1
    if tap:
        ok('cold boot: tap button with question visible', 'question 3' in p.inner_text('#hfContinue') and p.evaluate("S && S.qs[S.i].id") == qid3 and p.locator('.choice').count() == 4)
        p.click('#hfContinueBtn')
    time.sleep(2)
    sp = ' '.join(p.evaluate("window.__spoken"))
    ok('cold boot: same question, hands-free on, welcome', p.evaluate("HF.on && S.i === 2 && S.qs[2].id") == qid3 and 'Welcome back. Here is question 3 again' in sp, sp[:120])
    lc = p.evaluate("S.left"); ok('cold boot: timer from saved left', lc <= left3 + 0.1 and left3 - lc < 5, f"{left3} -> {lc}")
    ok('snapshot cleared after restore', p.evaluate("localStorage.getItem('hfSnap')") is None)
    # stale snapshot (over 2 hours) is ignored
    p.evaluate("void HF.stop(false)"); p.evaluate("localStorage.setItem('hfSnap', JSON.stringify({v:1, ts:Date.now()-3*3600e3, on:true, ctxName:'home', hash:'#home'}))")
    p.reload(); p.wait_for_selector('h1'); time.sleep(1)
    ok('old snapshot ignored', p.locator('#hfContinueBtn').count() == 0 and not p.evaluate("HF.on"))
    # no wake lock in hands-free audio lessons
    ok('audio lessons: no wake lock in hands-free', 'if (!HF.on) keepAwake(true)' in p.evaluate("alStart.toString()"))
    # settings: mic card, test mic, headset list
    p.evaluate("go('settings')"); ok('settings mic card + headset note', p.locator('#micCard').count() == 1 and "Voice answers use your phone's default mic" in p.inner_text('#micCard'))
    p.click('#micTestBtn'); p.wait_for_function("/heard|Voice error|nothing|blocked|No mic/i.test(document.querySelector('#micTestBox .mt-out').textContent)", timeout=20000)
    ok('test mic runs getUserMedia then a listen', len(p.inner_text('#micTestBox')) > 5, p.inner_text('#micTestBox')[:120])
    ok('mic kinds', p.evaluate("[micKind('AirPods Pro'), micKind('USB Headset'), micKind('Default - Microphone Array')]") == ['Bluetooth', 'Wired', 'Built-in'])
    ok('mic help text', len(p.evaluate("micHelpText()")) >= 1)
    # no mic permission yet: restored question is shown under a big tap button
    br2 = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    c2 = br2.new_context(); c2.add_init_script(FAKES); q2 = c2.new_page(); q2.goto(BASE + 'index.html?fast=1'); q2.wait_for_selector('h1')
    qid = q2.evaluate("allQuestions().filter(q => q.section === 'AR')[3].id")
    q2.evaluate("qid => localStorage.setItem('hfSnap', JSON.stringify({v:1, ts:Date.now(), on:true, ctxName:'question', hash:'#home', S:{sec:'AR', qIds:[qid, qid], i:1, results:[], left:100, timerOn:true, per:120, hints:1}}))", qid)
    q2.reload(); q2.wait_for_selector('#hfContinueBtn', timeout=8000)
    ok('no permission: tap button + question visible', 'question 2' in q2.inner_text('#hfContinue') and q2.locator('.choice').count() == 4 and not q2.evaluate("HF.on"))
    q2.click('#hfContinueBtn'); time.sleep(1.5)
    ok('tap continues on same question with hint', q2.evaluate("HF.on && S.i === 1 && S.hints === 1 && S.left <= 100 && S.left > 95"), str(q2.evaluate("[HF.on, S.i, S.hints, S.left]")))
    br2.close()
    errors = [x for x in errors if 'ERR_FAILED' not in x and 'CORS' not in x]; ok('no console errors', not errors, ' | '.join(errors[:5]))
    br.close()
json.dump(res, open(APP/'tests'/'v27_results.json', 'w'), indent=1)
sys.exit(0 if all(r[1] for r in res) else 1)
