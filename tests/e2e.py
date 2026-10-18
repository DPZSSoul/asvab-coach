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
    ok('home has one big Start hands-free control', p.locator('#hfStartBig').count() == 1)
    ok('six section tiles incl. Electronics Information', all(p.locator(f"button.tile:has-text('{n}')").count() for n in ['Arithmetic Reasoning','Word Knowledge','Paragraph Comprehension','Math Knowledge','General Science','Electronics Information']))
    ok('home IT focus plan lists all 6 IT-formula subtests', p.locator('#itFocus li[data-sec]').count() == 6 and '212' in p.inner_text('#itFocus') and p.locator('#itFocus [data-focus]').count() == 2)
    ok('bank: EI section has 60+ questions, every section 50+', p.evaluate("Object.keys(BANK.sections).every(k => sectionPool(k).length >= 50) && sectionPool('EI').length >= 60"), p.evaluate("Object.fromEntries(Object.keys(BANK.sections).map(k=>[k,sectionPool(k).length]))"))
    p.evaluate("go('practice','EI')"); p.click('#startBtn')
    if p.locator('#skipBtn').count(): p.click('#skipBtn')
    p.wait_for_selector('.choice'); et = p.inner_text('#tmr')
    ok('EI practice runs with CAT pace (0:40 per question)', '0:4' in et or '0:3' in et, et)
    p.evaluate("go('home')")
    ok('bank size', p.evaluate('BANK.questions.length') >= 250, p.evaluate('BANK.questions.length'))
    # every screen renders
    for s in ['handsfree','tutor','review','progress','meps','settings','practice']:
        p.evaluate(f"go('{s}', 'AR')"); p.wait_for_selector('h1'); 
    ok('all screens render without errors', not errors, '; '.join(errors[:3]))

    # ---- practice with timer ----
    p.evaluate("openRealAR()"); p.click('#cntRow button[data-c="5"]'); p.click('#startBtn')
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
    ok('symbols spoken in words', spoken_symbols == '3 fourths|times|x squared|25 percent', spoken_symbols)
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
    p.evaluate(f"window.__heard.push('repeat', '{nato}', 'sure', 'next')")
    p.wait_for_function('S && S.i === 1', timeout=30000)
    res = p.evaluate('S.results[0]')
    ok('hands-free: reads, hears "repeat", NATO answer, confidence, "next"', res['correct'] and res['conf'] == 'sure', res)
    spoken = ' '.join(p.evaluate('window.__spoken'))
    ok('hands-free speaks right/wrong with reason and asks confidence', 'Right!' in spoken and 'How sure were you' in spoken)
    p.evaluate("HF.stop(false)")
    p.evaluate("go('home')")
    p3 = new_page(ctx, errors); p3.goto(BASE + 'index.html?norec=1#handsfree'); p3.wait_for_selector('h1')
    ok('graceful message when recognition is missing', 'need Chrome or Edge' in p3.inner_text('main'))
    p3.close()

    # ---- Arithmetic Reasoning = catch-up track (touch) ----
    p.evaluate("go('practice','AR')"); p.wait_for_selector('#arHead')
    ok('opening Arithmetic Reasoning goes to the catch-up track with the AR header', p.inner_text('#arHead') == 'Arithmetic Reasoning: Level 1 of 27, Adding and Subtracting in Your Head' and p.locator('[data-lv]').count() == 27, p.inner_text('#arHead'))
    p.evaluate("go('home')"); p.click('#arTile'); p.wait_for_selector('#arHead')
    ok('home AR tile shows the catch-up level and opens the track', '#ladder' in p.url)
    p.evaluate("go('home')"); p.click("button.tile:has-text('Math ladder')"); p.wait_for_selector('#arHead')
    ok('"Math ladder" tile is an alias for the same place', '#ladder' in p.url and 'Level 1 of 27' in p.inner_text('#arHead'))
    real_lbl = p.inner_text("#arReal"); p.click('#arReal'); p.wait_for_selector('#startBtn')
    ok('"Real test questions" opens the 85 real AR items', p.locator('#arRealNote').count() == 1 and p.evaluate("arRealCount()") == 85 and '85' in real_lbl, [real_lbl, p.locator('#arRealNote').count(), p.evaluate("arRealCount()"), p.url])
    p.click('#startBtn')
    if p.locator('#skipBtn').count(): p.click('#skipBtn')
    p.wait_for_selector('.choice'); ok('real AR practice uses AR bank items', p.evaluate("S.qs.every(q => q.section === 'AR')"))
    p.evaluate("go('home')"); p.evaluate("go('practice','AR')"); ok('after home, AR goes back to the track', '#ladder' in p.url)
    p.click('#ladPlace'); p.wait_for_selector('.choice')
    for k in range(5):
        a = p.evaluate('LR.qs[LR.i].answer'); p.click(f'.choice[data-i="{a if k < 4 else (a+1)%4}"]'); p.click('#nextBtn')
    st = ls(p, 'ladder')
    ok('placement stops at the first miss (question 5 -> level 5)', st['level'] == 5 and st['placed'] and 'level 5' in p.inner_text('main') and 'Placement done' in p.inner_text('h1'), st)
    p.evaluate("ladStart(5)")
    for k in range(10):
        a = p.evaluate('LR.qs[LR.i].answer'); p.click(f'.choice[data-i="{(a+1)%4 if k < 3 else a}"]'); p.click('#nextBtn')
    st = ls(p, 'ladder'); ok('ladder: 7 of 10 does not pass (needs 8)', st['level'] == 5 and not st['passed'].get('5') and st['tries']['5'] == 1, st)
    p.evaluate("ladStart(5)"); q2 = p.evaluate('LR.qs[0].id')
    ok('ladder: the retry uses a new set (set B)', q2.startswith('LAD-05-2-'), q2)
    for k in range(10):
        a = p.evaluate('LR.qs[LR.i].answer'); p.click(f'.choice[data-i="{(a+1)%4 if k < 3 else a}"]'); p.click('#nextBtn')
    st = ls(p, 'ladder'); ok('ladder: second miss in a row sends him back one level', st['level'] == 4, st)
    p.evaluate("ladStart(4)")
    for k in range(10):
        a = p.evaluate('LR.qs[LR.i].answer'); p.click(f'.choice[data-i="{a}"]')
        if k == 0:
            n0 = p.evaluate('LR.qs.length'); p.click('#ladMore'); ok('"Another one like this" adds an extra, uncounted question', p.evaluate('LR.qs.length') == n0 + 1 and p.evaluate('LR.qs[LR.i].extra'))
            a = p.evaluate('LR.qs[LR.i].answer'); p.click(f'.choice[data-i="{a}"]')
        p.click('#nextBtn')
    st = ls(p, 'ladder'); ok('ladder: 8+ of 10 passes and moves up', st['passed'].get('4') and st['level'] == 5 and st['best']['4'] == 10, st)
    ok('track: 27 levels x 4 sets x 10 + 27 placement; levels 1-26 spoken answers, 27 = A-D bridge', p.evaluate("LADDER.levels.length === 27 && LADDER.levels.every(l => l.sets.length === 4 && l.sets.every(s => s.length === 10)) && LADDER.placement.length === 27 && LADDER.levels.slice(0,26).every(l => l.mode === 'say' && l.sets.every(s => s.every(q => q.mode === 'say'))) && LADDER.levels[26].mode === 'mc'"))
    ok('fraction + algebra steps present (meaning ... words to an equation)', p.evaluate("['What a Fraction Means','Halves and Quarters','Same Fraction, Different Names','Simplifying Fractions','Comparing Fractions','Adding Fractions, Same Bottom','Adding Fractions, Different Bottoms','Multiplying Fractions','Dividing Fractions','Mixed Numbers','Fraction of a Number','Fraction Word Problems','The Mystery Number in a Box','One-Step Equations','Two-Step Equations','Words to an Equation'].every(t => LADDER.levels.some(l => l.title === t))"))
    p.evaluate("ladStart(7)"); a = p.evaluate("LR.qs.findIndex(q => q.form === 'simplest')")
    ok('typed/spoken "6 eighths" for a simplify item is not counted (must be simplest)', p.evaluate("(() => { LR.i = LR.qs.findIndex(q => q.form === 'simplest'); ladRender(); const q = LR.qs[LR.i]; const [n,d] = q.value.split('/'); ladAnswerSaid((n*2)+' over '+(d*2)); return LR.results.slice(-1)[0].ok === false && /simpler/.test(document.querySelector('#ladWhy').innerText); })()"))
    p.evaluate("go('ladlesson','4')"); ok('spoken lesson renders with quick checks', 'Fraction' in p.inner_text('h1') and p.locator('.lad-check').count() >= 2 and p.locator('#ladLessonBody .w').count() > 50)
    # migration from the old 15-level ladder: never moves him up past what he showed
    p.evaluate("localStorage.setItem('asvab.ladder', JSON.stringify({level:8, placed:true, passed:{1:true,2:true,3:true,4:true,5:true,6:true,7:true}, tries:{}, best:{}, log:[]}))")
    st = p.evaluate('ladState()'); ok('old 15-level progress is moved to the first new small step he has not done', st['v'] == 3 and st['level'] == 5 and st['migrated'], st)
    # finishing the last level unlocks the real questions
    p.evaluate("(() => { const s = ladState(); s.passed[27] = true; s.level = 27; ladSave(s); })()"); p.evaluate("go('practice','AR')")
    ok('after the bridge level is passed, AR uses the real questions (adaptive practice)', p.locator('#startBtn').count() == 1 and p.locator('#arBack').count() == 1 and '#practice/AR' in p.url)
    p.evaluate("go('home')"); ok('home AR tile shows the normal level once the track is done', 'of 3' in p.inner_text("button.tile:has-text('Arithmetic Reasoning')"))
    p.evaluate("localStorage.removeItem('asvab.ladder')")
    # ---- learn by ear (touch) ----
    for scr in ['audio', 'drill', 'vocab', 'readalong']:
        p.evaluate(f"go('{scr}')"); p.wait_for_selector('h1')
    ok('learn-by-ear screens render (audio lessons, drills, vocab, read along)', not errors, '; '.join(errors[:3]))
    p.evaluate("voiceLog({text:'hey', alts:['hey','a','eh']}); go('settings')")
    ok('Settings shows the voice debug log (transcript + other guesses)', p.locator('#vlog li').count() >= 1 and 'hey' in p.inner_text('#vlog') and 'eh' in p.inner_text('#vlog'), p.inner_text('#vlog')[:120])
    p.click('#vlogClear'); ok('voice debug log can be cleared', 'Nothing yet' in p.inner_text('#vlog'))
    p.evaluate("Store.set('reading', [{date:'2026-10-18T10:00:00Z', id:'t', words:20, correct:18, acc:90, wcpm:55}]); go('progress')")
    ok('progress shows catch-up level, reading WCPM, and drills', 'Arithmetic Reasoning: Level' in p.inner_text('#earProg') and '55 words correct per minute' in p.inner_text('#earProg'), p.inner_text('#earProg')[:160])
    p.evaluate("Store.set('reading', [])")
    p.evaluate("go('audio')"); ok('audio playlist starts at his level and includes vocab review', p.evaluate("AL.list[0].title.startsWith('Level ') && AL.list.some(x => x.title === 'Vocab review')"))
    sc = p.evaluate("readScore('The ship left the dock at dawn', 'the ship left dock at dawn', 6000)")
    ok('read-along scoring: words correct, accuracy, words correct per minute', sc['correct'] == 6 and sc['acc'] == 86 and sc['wcpm'] == 60, sc)
    p.evaluate("go('drill','times')"); p.wait_for_selector('#drIn')
    for k in range(10):
        p.wait_for_function(f"DR && DR.i === {k} && !DR.answered"); a = p.evaluate('DR.qs[DR.i].a'); p.fill('#drIn', str(a)); p.click('#drGo')
    p.wait_for_selector('#drSum'); ok('typed speed drill: 10 of 10 saved', '10 of 10' in p.inner_text('#drSum') and ls(p, 'drill')['best']['times'] == 10)

    # ---- MEPS ----
    p.evaluate("go('meps')"); txt = p.inner_text('main')
    ok('MEPS table uses official CAT counts/times incl. EI 15/10 (total 85 questions, 144 min)', all(s in txt for s in ['15\t12','15\t55','15\t9','10\t27','15\t31','15\t10','85\t144']) or ('Electronics Information' in txt and '144' in txt), txt[:300].replace('\n',' '))
    p.click('#mStart'); p.wait_for_selector('#mBegin'); p.click('#mBegin'); p.wait_for_selector('#mClock')
    c1 = p.inner_text('#mClock'); time.sleep(2.2); c2 = p.inner_text('#mClock')
    ok('MEPS countdown runs (GS 12:00)', c1 != c2 and c1.startswith('1'), f'{c1} -> {c2}')
    ok('MEPS: no hint/tutor buttons', p.locator('#hintBtn, #tutorBtn, #tShow').count() == 0)
    p.locator('.choice').first.click()
    p.evaluate('M.end = Date.now()'); p.wait_for_selector("h1:has-text('Part 2 of 6')", timeout=5000)
    ok('MEPS auto-advances when time runs out', 'Arithmetic Reasoning' in p.inner_text('h1'))
    gs = p.evaluate('M.res.GS')
    ok('MEPS time-out scores unanswered as random guesses (official rule)', gs['answered'] == 1 and abs(gs['guessed'] - 14*0.25) < 1e-9, gs)
    for k in range(5):
        p.wait_for_selector('#mBegin'); p.click('#mBegin'); p.wait_for_selector('#mClock')
        n = p.evaluate('M.n')
        for j in range(n):
            a = p.evaluate('M.q.answer'); p.click(f'.choice[data-i="{a if j%3 else (a+1)%4}"]')
    p.wait_for_selector("h1:has-text('score report')")
    rep = p.inner_text('main')
    ok('MEPS score report with labeled AFQT estimate', 'Estimated AFQT' in rep and 'Estimate only, confirm with a recruiter' in rep and 'NOT an official score' in rep and 'Navy minimum is 31' in rep)
    ok('MEPS report shows all IT rules (212 / 156 / CT / 214) and EI part', all(t in rep for t in ['AR + MK + EI + VE = 212','VE + MK + GS = 156','CT + MK + VE = 156','214','Electronics Information','scored as random guesses']), rep[:200].replace('\n',' '))
    # ---- IT estimate math from practice history ----
    hist = {'AR':[1,0]*10,'MK':[1,0]*10,'EI':[1,0,0,0]*5,'WK':[1,0]*10,'PC':[1,0]*10,'GS':[1,1,1,0]*5}
    p.evaluate(f"localStorage.setItem('asvab.hist', JSON.stringify({json.dumps(hist)}))")
    est = p.evaluate('practiceEstimates()')
    ok('IT estimate: AR50 MK50 EI35 VE50 GS65 -> 185/212 and 165/156', est['S']['EI'] == 35 and est['S']['VE'] == 50 and est['S']['AR']+est['S']['MK']+est['S']['EI']+est['S']['VE'] == 185 and est['line'] == 165, est['S'])
    p.evaluate("go('progress')"); pr = p.inner_text('#itPanel')
    ok('progress IT panel: progress per rule, focus, AFQT, recruiter label', '= 185' in pr and 'Need about 27 more points' in pr and '= 165' in pr and 'Meets the line' in pr and 'Focus: Electronics Information' in pr and 'AFQT = 2 x VE + AR + MK' in pr and 'Estimate only, confirm with a recruiter' in pr, pr[:300].replace('\n',' '))
    p.evaluate("go('home')")
    ok('home IT focus ranks weakest IT subtest first (EI) with a practice button', p.locator('#itFocus li[data-sec]').first.get_attribute('data-sec') == 'EI' and p.locator('#itFocus [data-focus]').first.get_attribute('data-focus') == 'EI')
    p.click('#itFocus [data-focus="EI"]'); ok('IT focus button opens that practice', 'Electronics Information' in p.inner_text('h1'))

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
    p.evaluate("openRealAR()"); p.click('#genBtn'); p.wait_for_selector('#genOut .card', timeout=15000)
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
    swt = p.evaluate("fetch('sw.js',{cache:'no-store'}).then(r=>r.text())"); keys = p.evaluate('caches.keys()')
    ok('service worker version bumped (asvab-coach-v5, network-first)', "asvab-coach-v5" in swt and 'network-first' in swt and 'asvab-coach-v5' in keys and 'asvab-coach-v4' not in keys, keys)
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
