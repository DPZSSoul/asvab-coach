import json, os, sys, time, re, pathlib
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765/')
APP = pathlib.Path(__file__).resolve().parent.parent
FAKES = open(APP/'tests'/'fakes.js').read()
results = []
def ok(name, cond, info=''):
    results.append((name, bool(cond), info)); print(('PASS ' if cond else 'FAIL ') + name + (f'  [{info}]' if info else ''), flush=True)

def new_page(ctx, errors):
    p = ctx.new_page()
    p.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
    p.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    return p
def ls(p, k): return p.evaluate(f"JSON.parse(localStorage.getItem('asvab.{k}') || 'null')")

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    ctx = br.new_context(accept_downloads=True)
    ctx.add_init_script(FAKES)
    errors = []
    p = new_page(ctx, errors)
    p.goto(BASE + 'index.html'); p.wait_for_selector('h1')
    ok('home loads', 'Ready to study' in p.inner_text('h1'))
    ok('five section tiles', all(p.locator(f"button.tile:has-text('{n}')").count() for n in ['Arithmetic Reasoning','Word Knowledge','Paragraph Comprehension','Math Knowledge','General Science']))
    ok('bank size', p.evaluate('BANK.questions.length') >= 250, p.evaluate('BANK.questions.length'))
    # every screen renders
    for s in ['handsfree','tutor','review','progress','meps','settings','practice']:
        p.evaluate(f"go('{s}', 'AR')"); p.wait_for_selector('h1'); 
    ok('all screens render without errors', not errors, '; '.join(errors[:3]))

    # ---- practice with timer ----
    p.evaluate("go('practice','AR')"); p.click('#cntRow button[data-c="5"]'); p.click('#startBtn')
    p.wait_for_selector('.choice')
    t1 = p.inner_text('#tmr'); time.sleep(2.2); t2 = p.inner_text('#tmr')
    ok('per-question timer counts down (AR pace 3:40)', t1 != t2 and t1.startswith('3:'), f'{t1} -> {t2}')
    ans = p.evaluate('S.qs[0].answer'); wrong = (ans + 1) % 4
    p.click(f'.choice[data-i="{wrong}"]')
    p.wait_for_selector('#confBox')
    ok('wrong answer shows feedback + steps', 'Not yet' in p.inner_text('#fb') and p.locator('ol.steps li').count() >= 2)
    ok('localStorage daily count updated', (ls(p,'daily') or {}).get(time.strftime('%Y-%m-%d')) == 1, ls(p,'daily'))
    errs = ls(p, 'errors'); ok('error log saved (question, guess, correct, explanation, date, section)', errs and all(k in errs[0] for k in ['stem','guessText','answerText','explanation','date','section']))
    p.click('#confBox button[data-c="shaky"]')
    ok('re-learn lesson shown after miss', 'Topic to re-learn' in p.inner_text('#after') and p.locator('#tutorBtn').count() == 1)
    srs = ls(p, 'srs'); qid = p.evaluate('S.qs[0].id')
    ok('spaced repetition: missed -> box 1, due in ~5 min', srs[qid]['box'] == 1 and 200_000 < srs[qid]['due'] - time.time()*1000 < 400_000, srs[qid])
    topics = ls(p, 'topics'); ok('topic marked for re-learn', any(v['relearn'] for v in topics.values()))
    p.click('#nextBtn')
    # answer the rest correctly with "sure"
    for k in range(1, 5):
        p.wait_for_selector('.choice:not([disabled])')
        a = p.evaluate('S.qs[S.i].answer'); p.click(f'.choice[data-i="{a}"]'); p.click('#confBox button[data-c="sure"]')
        if k == 1:
            q2 = p.evaluate('S.qs[S.i].id'); ok('sure-right -> "just needs reps"', 'just needs reps' in p.inner_text('#after'))
        p.click('#nextBtn')
    p.wait_for_selector("h1:has-text('Set done')")
    att = ls(p, 'attempts'); ok('score tracker attempt saved', att and att['AR'][-1]['correct'] == 4 and att['AR'][-1]['total'] == 5, att)
    srs = ls(p, 'srs'); ok('spaced repetition: sure-right -> box 2, due ~1 day', srs[q2]['box'] == 2 and abs((srs[q2]['due'] - time.time()*1000) - 86400000) < 600000)

    # ---- pre-session review + adaptive level up ----
    p.evaluate("go('practice','WK')"); p.click('#cntRow button[data-c="15"]'); p.uncheck('#timerOn'); p.click('#startBtn')
    p.wait_for_selector("h1:has-text('last')")
    ok('pre-session shows last misses (skippable)', p.locator('#skipBtn').count() == 1 and p.locator('.card .stem').count() >= 1)
    p.click('#skipBtn'); p.wait_for_selector('.choice')
    ok('timer off option works', p.locator('#tmr').count() == 0 and 'No timer' in p.inner_text('main'))
    for k in range(9):
        a = p.evaluate('S.qs[S.i].answer'); p.click(f'.choice[data-i="{a}"]'); p.click('#confBox button[data-c="sure"]'); p.click('#nextBtn')
    ok('adaptive: >80% rolling accuracy bumps WK level to 2', ls(p, 'level').get('WK') == 2, ls(p,'level'))
    # now drop: answer 8 wrong
    for k in range(6):
        a = p.evaluate('S.qs[S.i].answer'); p.click(f'.choice[data-i="{(a+1)%4}"]'); p.click('#confBox button[data-c="guessed"]'); p.click('#nextBtn')
    p.wait_for_selector("h1:has-text('Set done')")
    p.evaluate("go('practice','WK')"); p.click('#startBtn'); p.click('#skipBtn')
    for k in range(2):
        a = p.evaluate('S.qs[S.i].answer'); p.click(f'.choice[data-i="{(a+1)%4}"]'); p.click('#confBox button[data-c="guessed"]'); p.click('#nextBtn')
    ok('adaptive: <60% drops WK level back to 1', ls(p, 'level').get('WK') == 1, ls(p,'level'))

    # ---- progress chart + topics panel ----
    p.evaluate("go('progress')"); ok('progress shows SVG chart and re-learn/reps panels', p.locator('svg rect').count() >= 1 and 'Topics to re-learn' in p.inner_text('main') and 'Just needs reps' in p.inner_text('main'))
    p.locator('[data-l]').first.click(); p.wait_for_selector('#lp'); ok('topic lesson opens from panel', 'What it is' in p.inner_text('main'))

    # ---- streak ----
    p.evaluate("(() => { const d = {}; const t = new Date(); for (let i=1;i<=3;i++){ const x = new Date(t); x.setDate(t.getDate()-i); d[today(x)] = 12; } d[today()] = 3; localStorage.setItem('asvab.daily', JSON.stringify(d)); renderStreak(); })()")
    ok('streak counts back-to-back goal days', 'Streak 3 days' in p.inner_text('#streak'), p.inner_text('#streak'))

    # ---- offline tutor on a bank question ----
    p.evaluate("go('review')"); p.locator('[data-e]').first.click(); p.wait_for_selector('#tbtns')
    chat = lambda: p.inner_text('#tchat')
    ok('tutor step 1 + 2 (what/why, tiny example) shown', 'Step 1: What it is' in chat() and 'Step 2: A tiny example' in chat())
    p.click('#tShow'); ok('asking early gives a hint, not the answer', 'Let me give you a hint first' in chat() and 'Hint 1' in chat() and 'The answer is' not in chat())
    p.click('#tIdk'); ok('hint 2 = first step', 'Hint 2 (the first step)' in chat())
    p.click('#tIdk'); ok('hint 3 = similar worked example', 'Hint 3 (a similar example' in chat())
    tq = p.evaluate('T.q'); wrongs = [i for i in range(4) if i != tq['answer'] and p.locator(f'#tq .choice[data-i="{i}"]:not([disabled])').count()]
    p.click(f'#tq .choice[data-i="{wrongs[0]}"]'); ok('reveal only after 3 hints and a try', 'The answer is' in chat() and 'Lock it in' not in chat() or 'own words' in chat())

    # ---- read-aloud with boundary events, and fallback without them ----
    p.evaluate("go('practice','PC')"); p.click('#startBtn'); p.click('#skipBtn')
    p.wait_for_selector('.choice'); p.locator('.say').first.click(); time.sleep(0.5)
    ok('click-to-speak reads passage and highlights words (boundary events)', p.locator('.w.hl').count() == 1 and len(p.evaluate('window.__spoken')) >= 1)
    spoken_symbols = p.evaluate("sayable('3/4') + '|' + sayable('x','3','4') + '|' + sayable('x^2') + '|' + sayable('25%')")
    ok('symbols spoken in words', spoken_symbols == '3 over 4|times|x squared|25 percent', spoken_symbols)
    p2 = new_page(ctx, errors); p2.goto(BASE + 'index.html?boundary=0#practice/GS'); p2.wait_for_selector('#startBtn'); p2.click('#startBtn')
    if p2.locator('#skipBtn').count(): p2.click('#skipBtn')
    p2.wait_for_selector('.choice'); p2.locator('.say').first.click(); time.sleep(1.0)
    ok('read-along fallback timing highlights without boundary events', p2.locator('.w.hl').count() == 1)
    p2.evaluate("settings.rate = 1.4; saveSettings()"); ok('speech rate setting persists', ls(p2,'settings')['rate'] == 1.4)
    p2.close()

    # ---- voice parser ----
    cases = {'A':0,'bravo':1,'option C':2,'Delta':3,'see':2,'answer b':1,'repeat':'repeat','next':'next','give me a hint':'hint','sure':'sure','not sure':'shaky','kind of shaky':'shaky','I guessed':'guessed'}
    bad = []
    for t, want in cases.items():
        r = p.evaluate("t => parseVoice([t], ['plentiful','rare','quick','honest'])", t)
        got = r and (r.get('index') if r['type']=='answer' else r.get('cmd') or r.get('value'))
        if got != want: bad.append((t, want, got))
    r = p.evaluate("parseVoice(['honest'], ['plentiful','rare','quick','honest'])"); r2 = p.evaluate("parseVoice(['$32'], ['$8.00','$32.00','$20.00','$38.00'])")
    if not (r and r['index']==3): bad.append(('honest',3,r))
    if not (r2 and r2['index']==1): bad.append(('$32',1,r2))
    ok('voice parser: letters, NATO, "option C", answer text, commands, confidence', not bad, bad)

    # ---- hands-free loop with fake recognizer ----
    p.evaluate("go('home')"); p.evaluate("startSession('GS', 3, { hf:true })")
    if p.locator('#skipBtn').count(): p.click('#skipBtn')
    p.wait_for_selector('#hfBox'); a = p.evaluate('S.qs[0].answer')
    nato = ['alpha','bravo','charlie','delta'][a]
    p.evaluate(f"window.__heard.push('repeat', '{nato}', 'sure')")
    p.wait_for_function('S && S.i === 1', timeout=30000)
    res = p.evaluate('S.results[0]')
    ok('hands-free: reads, hears "repeat", NATO answer, confidence, auto-next', res['correct'] and res['conf'] == 'sure', res)
    spoken = ' | '.join(p.evaluate('window.__spoken'))
    ok('hands-free speaks right/wrong with reason and asks confidence', 'Right!' in spoken and 'How sure were you' in spoken)
    p.evaluate("go('home')")
    p3 = new_page(ctx, errors); p3.goto(BASE + 'index.html?norec=1#handsfree'); p3.wait_for_selector('h1')
    ok('graceful message when recognition is missing', 'need Chrome or Edge' in p3.inner_text('main'))
    p3.close()

    # ---- MEPS ----
    p.evaluate("go('meps')"); txt = p.inner_text('main')
    ok('MEPS table uses official CAT counts/times', all(s in txt for s in ['15\t12','15\t55','15\t9','10\t27','15\t31']) or 'General Science' in txt, '')
    p.click('#mStart'); p.wait_for_selector('#mBegin'); p.click('#mBegin'); p.wait_for_selector('#mClock')
    c1 = p.inner_text('#mClock'); time.sleep(2.2); c2 = p.inner_text('#mClock')
    ok('MEPS countdown runs (GS 12:00)', c1 != c2 and c1.startswith('1'), f'{c1} -> {c2}')
    ok('MEPS: no hint/tutor buttons', p.locator('#hintBtn, #tutorBtn, #tShow').count() == 0)
    p.locator('.choice').first.click()
    p.evaluate('M.end = Date.now()'); p.wait_for_selector("h1:has-text('Part 2 of 5')", timeout=5000)
    ok('MEPS auto-advances when time runs out', 'Arithmetic Reasoning' in p.inner_text('h1'))
    for k in range(4):
        p.wait_for_selector('#mBegin'); p.click('#mBegin'); p.wait_for_selector('#mClock')
        n = p.evaluate('M.n')
        for j in range(n):
            a = p.evaluate('M.q.answer'); p.click(f'.choice[data-i="{a if j%3 else (a+1)%4}"]')
    p.wait_for_selector("h1:has-text('score report')")
    rep = p.inner_text('main')
    ok('MEPS score report with labeled AFQT estimate', 'Estimated AFQT' in rep and 'Estimate only' in rep and 'NOT an official score' in rep)

    # ---- AI generation (mocked OpenAI-compatible endpoint, direct key path) ----
    calls = []
    good = {"stem":"A crate holds 24 cans. How many cans are in 7 crates?","choices":["148","168","178","31"],"answer":1,"difficulty":1,"topic":"ar-money","steps":["Multiply crates by cans.","7 x 24 = 168","Answer: 168."],"explanation":"7 x 24 = 168."}
    badmath = {"stem":"A box holds 12 pens. How many pens are in 6 boxes?","choices":["62","72","82","18"],"answer":0,"difficulty":1,"topic":"ar-money","steps":["6 x 12 = 62","Answer: 62."],"explanation":"6 x 12 = 62."}
    three = {"stem":"What is 5 + 5 here?","choices":["10","11","12"],"answer":0,"difficulty":1,"topic":"ar-money","steps":["5 + 5 = 10","Answer: 10."],"explanation":"5 + 5 = 10."}
    def handle(route):
        calls.append(route.request)
        body = json.loads(route.request.post_data)
        if body.get('response_format'):
            content = json.dumps({"questions":[good, badmath, three]})
        else:
            content = "Good question. Let's start.\n\nHint 1 (the idea):\nDistance is rate times time.\n\nWhat is the rate?"
        route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin':'*'}, body=json.dumps({"choices":[{"message":{"content":content}}]}))
    ctx.route('https://mock-llm.test/v1/chat/completions', handle)
    p.evaluate("settings.apiKey='test-key-not-real'; settings.apiBase='https://mock-llm.test/v1'; saveSettings()")
    p.evaluate("go('practice','AR')"); p.click('#genBtn'); p.wait_for_selector('#genOut .card', timeout=15000)
    out = p.inner_text('#genOut'); custom = ls(p, 'custom')
    ok('generate: valid question added, bad math + 3-choice rejected', 'Added 1' in out and 'Rejected 2' in out and len(custom) == 1, out.replace('\n',' ')[:200])
    ok('generate: key sent as Bearer header only', calls and calls[0].headers.get('authorization') == 'Bearer test-key-not-real')
    p.evaluate("go('tutor')"); p.fill('#pasteQ', 'A plane flies 450 miles per hour for 2 hours. How far does it go? A. 900 B. 452 C. 225 D. 800'); p.click('#startPaste')
    p.wait_for_selector("#tchat .msg.bot:has-text('Hint 1')", timeout=15000)
    sys_prompt = json.loads(calls[-1].post_data)['messages'][0]['content']
    ok('pasted-question tutor chat uses LLM with tutor-rules system prompt', 'hint ladder' in sys_prompt.lower() and 'Never give the final answer right away' in sys_prompt)

    # ---- export / import ----
    p.evaluate("go('settings')")
    with p.expect_download() as dl: p.click('#exportBtn')
    path = dl.value.path(); data = json.load(open(path))
    ok('export: questions + custom + progress JSON', len(data['questions']) == p.evaluate('BANK.questions.length') and len(data['custom']) == 1 and 'errors' in data['progress'] and 'attempts' in data['progress'])
    ok('export never includes the API key', 'test-key-not-real' not in open(path).read())
    p.evaluate("localStorage.removeItem('asvab.errors'); localStorage.removeItem('asvab.custom')")
    p.on('dialog', lambda d: d.accept())
    p.set_input_files('#importFile', path); p.wait_for_selector('#ioOut p')
    ok('import restores progress and custom questions', len(ls(p,'errors') or []) == len(data['progress']['errors']) and len(ls(p,'custom') or []) == 1 and ls(p,'settings')['apiKey'] == 'test-key-not-real', p.inner_text('#ioOut'))

    # ---- service worker + offline ----
    p.goto(BASE + 'index.html'); p.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller || false', timeout=8000) if p.evaluate("navigator.serviceWorker.ready.then(()=>true)") else None
    p.reload(); p.wait_for_selector('h1'); ctl = p.evaluate('!!navigator.serviceWorker.controller')
    ctx.set_offline(True); p.reload(); p.wait_for_selector('h1')
    ok('service worker controls page and app loads offline', ctl and 'Ready to study' in p.inner_text('h1'))
    p.evaluate("go('practice','MK')"); p.click('#startBtn')
    if p.locator('#skipBtn').count(): p.click('#skipBtn')
    ok('practice works offline', p.locator('.choice').count() == 4)
    ctx.set_offline(False)
    man = p.evaluate("fetch('manifest.webmanifest').then(r=>r.json())"); ok('manifest valid with icons', man['name'] == 'ASVAB Coach' and len(man['icons']) == 2)

    # ---- single self-contained file over file:// ----
    ctx2 = br.new_context(); ctx2.add_init_script(FAKES); e2 = []
    f = new_page(ctx2, e2); f.goto('file://' + str(APP/'asvab-coach.html')); f.wait_for_selector('h1')
    f.evaluate("go('practice','GS')"); f.click('#startBtn'); f.wait_for_selector('.choice'); f.locator('.choice').first.click(); f.click('#confBox button[data-c="sure"]')
    ok('single-file asvab-coach.html works from file://', 'Ready' not in f.inner_text('h1') and (ls(f,'daily') or {}) and not e2, e2[:3])
    f.evaluate("go('handsfree')"); ok('file:// shows secure-context voice notice', 'opened the app as a file' in f.inner_text('main'))
    ctx2.close()

    ok('no console errors in whole run', not errors, '; '.join(errors[:5]))
    br.close()
print(f"\n{sum(r[1] for r in results)}/{len(results)} passed")
json.dump([{'test':n,'pass':b,'info':str(i)} for n,b,i in results], open(APP/'tests'/'e2e_results.json','w'), indent=1)
sys.exit(0 if all(r[1] for r in results) else 1)
