"""2.6.0: AR history, recap (shown + spoken), stuck -> breakdown by voice, offline micro-step hints, home layout."""
import os, sys, json, pathlib, time
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765/')
APP = pathlib.Path(__file__).resolve().parent.parent
FAKES = open(APP/'tests'/'fakes.js').read()
res = []
def ok(n, c, i=''): res.append((n, bool(c), i)); print(('PASS ' if c else 'FAIL ') + n + (f'  [{i}]' if i else ''), flush=True)
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    ctx = br.new_context(); ctx.add_init_script(FAKES); errors = []
    p = ctx.new_page()
    p.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None); p.on('pageerror', lambda e: errors.append(str(e)))
    p.set_default_timeout(15000); p.goto(BASE + 'index.html?fast=1&silence=1500'); p.wait_for_selector('h1')
    ok('home shows math first', p.locator('#arTile').count() == 1 and p.locator('details.more').count() == 1)
    ok('no italics tags', p.evaluate("document.querySelectorAll('i,em').length") == 0)
    phrases = ["I don't know", "I'm not sure", "I don't get it", "I'm stuck", "not sure", "no idea", "help", "confused"]
    ok('isStuck phrases', p.evaluate("ps => ps.every(isStuck)", phrases))
    ok('isStuck negatives', not p.evaluate("['twelve','b','three fourths','next'].some(isStuck)"))
    # steps never state the final answer; percent uses the tens trick
    st = p.evaluate("arSteps({section:'AR',topic:'ar-percent',stem:'A $20 shirt is 10% off. How much is the discount?',choices:['$2','$18','$1','$10'],answer:0})")
    ok('percent tens trick first', 'tens' in st[0]['say'] and st[0]['expect'] == 2, st[0]['say'])
    bad = p.evaluate("""() => { const qs = allQuestions().filter(q => q.section === 'AR'); const out = [];
      for (const q of qs){ const ans = q.choices[q.answer]; const a = ans.replace(/[$,]/g, ''); const toks = x => x.replace(/[$,]/g, '').split(/[^0-9.\/a-z]+/i).map(w => w.replace(/\.$/, ''));
        if (toks(q.stem).includes(a)) continue; for (const s of arSteps(q)) if (toks(s.say.replace(/\d+ percent/g, '')).includes(a)) out.push(q.id + ': ' + s.say); } return out; }""")
    ok('no step text contains the answer (bank)', not bad, '; '.join(bad[:3]))
    # history from a practice session + recap
    p.evaluate("localStorage.clear(); location.reload()"); p.wait_for_selector('h1')
    p.evaluate("AR_REAL = true; startSession('AR', 2, { skipReview:true })"); p.wait_for_selector('.choice')
    p.evaluate("const q = S.qs[0]; answer((q.answer+1)%4)"); p.evaluate("setConf('guessed')"); p.click('#nextBtn')
    p.wait_for_selector('.choice'); p.evaluate("answer(S.qs[1].answer)"); p.evaluate("setConf('sure')"); p.click('#nextBtn')
    p.wait_for_selector('#recapCard')
    txt = p.inner_text('#recapCard'); ok('recap shown', 'You missed 1' in txt and 'right answer is' in txt, txt[:120])
    lines = p.evaluate("[...document.querySelectorAll('ul.recap li')].map(x => x.textContent)")
    ok('recap lines under 12 words', all(len(l.split()) < 12 for l in lines), str(lines))
    time.sleep(1.5); spoken = ' '.join(p.evaluate('window.__spoken'))
    ok('recap spoken', 'You missed 1' in spoken)
    h = p.evaluate("arHist()"); ok('history stored 2', len(h) == 2 and all(k in h[0] for k in ['question','choices','yours','right','ok','date']))
    p.evaluate("go('history','wrong')"); ok('history wrong filter', p.locator('.hist-item').count() == 1)
    p.click('#hRetry'); p.wait_for_selector('.choice'); ok('retry starts', p.evaluate("S && S.mode === 'retry' && S.qs.length === 1"))
    # ladder answers are logged
    p.evaluate("go('home'); ladStart(17)"); p.wait_for_selector('.choice'); p.evaluate("ladAnswer((LR.qs[0].answer+1)%4, 'two')")
    ok('ladder answer in history', p.evaluate("arHist()[0].mode === 'ladder' && !arHist()[0].ok"))
    # hands-free: stuck in a ladder question -> breakdown by voice
    p.evaluate("go('home')"); p.evaluate("void HF.start()"); time.sleep(1); p.evaluate("window.__heard.push('no')"); time.sleep(3)
    p.evaluate("ladStart(17)"); p.wait_for_selector('.choice'); time.sleep(1)
    stem = p.evaluate("LR.qs[0].stem")
    p.evaluate("window.__heard.push(\"I'm stuck\")"); p.wait_for_selector('#bdBox', timeout=15000)
    ok('voice stuck -> breakdown (ladder)', p.evaluate("HF.ctxName") == 'breakdown', stem)
    time.sleep(1.5); n0 = p.evaluate("document.querySelectorAll('#bdList li').length")
    p.evaluate("window.__heard.push('ok')"); time.sleep(2.5)
    exp = p.evaluate("BD && BD.steps[BD.k] && BD.steps[BD.k].expect")
    n1 = p.evaluate("document.querySelectorAll('#bdList li').length")
    ok('voice advances a step', n1 > n0 or exp is not None, f'{n0}->{n1}')
    # hands-free: "help" on a practice question -> breakdown
    p.evaluate("AR_REAL = true; startSession('AR', 1, { skipReview:true, hf:true })"); p.wait_for_selector('.choice'); time.sleep(1.5)
    p.evaluate("window.__heard.push('help')"); p.wait_for_selector('#bdBox', timeout=15000)
    ok('voice "help" on question -> breakdown', p.evaluate("HF.ctxName") == 'breakdown')
    p.evaluate("window.__heard.push('back to the question')"); time.sleep(5)
    ok('back to question context', p.evaluate("HF.ctxName") == 'question')
    p.evaluate("void HF.stop()")
    # v2.6.1: sound-alike voice routing on home
    ok('canon arithmetic latter', p.evaluate("voiceCanon('Arithmetic latter.')") == 'math ladder')
    ok('canon keeps letter b', p.evaluate("voiceCanon('letter B')") == 'letter b')
    ok('canon level three', p.evaluate("voiceCanon('level three')") == 'level 3')
    p.evaluate("go('home')"); time.sleep(0.5); p.evaluate("void HF.start()"); time.sleep(1.5); p.evaluate("window.__heard.push('no')"); time.sleep(3)
    def home_say(phrase):
        p.evaluate("go('home')"); p.wait_for_function("HF.ctxName === 'home'"); m = p.evaluate("window.__spoken.length")
        try: p.wait_for_function("m => window.__spoken.slice(m).join(' ').includes('Say help for more')", arg=m, timeout=15000)
        except Exception: pass
        m = p.evaluate("window.__spoken.length"); p.evaluate("t => window.__heard.push(t)", phrase); time.sleep(3); return m
    for phrase, want in [('arithmetic ladder', 'ladder'), ('arithmetic latter', 'ladder'), ('math letter', 'ladder'), ('level three', 'ladder/3'), ("todays plan", 'plan'), ('history||his tree', 'history'), ('blah||math ladders', 'ladder'), ('speed drill', 'drill')]:
        home_say(phrase); h = p.evaluate("location.hash.slice(1)")
        ok(f'voice "{phrase}" -> {want}', h.startswith(want), h + ' | ' + p.evaluate("(document.getElementById('hfHeard')||{}).textContent||''"))
    m = home_say('purple monkey')
    ok('unknown on home speaks heard + options', any('I heard purple monkey' in x for x in p.evaluate('m => window.__spoken.slice(m)', m)), str(p.evaluate('window.__spoken')[-2:]))
    ok('heard line shown', 'Heard: "purple monkey"' in p.evaluate("document.getElementById('hfHeard').textContent"))
    p.evaluate("void HF.stop(false)")
    # coach offline
    p.route('**/*workers.dev*/**', lambda r: r.abort()); time.sleep(2); p.goto(BASE + "index.html"); time.sleep(2); p.evaluate("void go('coach')"); time.sleep(1); print(p.evaluate("location.hash")); 
    try: p.wait_for_function("!!(document.querySelector('#offlineGo') || document.querySelector('#chatIn'))", timeout=20000)
    except Exception: print(p.inner_text('#app')[:300])
    ok('coach screen: offline fallback or chat', p.evaluate("!!(document.querySelector('#offlineGo') || document.querySelector('#chatIn'))"))
    errors = [x for x in errors if 'ERR_FAILED' not in x]; ok('no console errors', not errors, ' | '.join(errors[:5]))
    br.close()
json.dump(res, open(APP/'tests'/'ar_v26_results.json', 'w'), indent=1)
sys.exit(0 if all(r[1] for r in res) else 1)
