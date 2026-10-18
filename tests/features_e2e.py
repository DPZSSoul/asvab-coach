"""2.3 features, by touch: weekly test + score goal, today's plan, real-test passages, electronics by ear,
test-day tips, daily reminder. Run with the server on :8765 (or BASE=...)."""
import json, os, sys, time, pathlib, re
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765/')
APP = pathlib.Path(__file__).resolve().parent.parent
FAKES = open(APP/'tests'/'fakes.js').read()
NOTIFY = """window.__notes = [];
window.Notification = class { constructor(t, o){ window.__notes.push([t, o && o.body]); } static requestPermission(){ Notification.permission = window.__permAnswer || 'granted'; return Promise.resolve(Notification.permission); } };
window.Notification.permission = 'default';
if (window.ServiceWorkerRegistration) ServiceWorkerRegistration.prototype.showNotification = function(t, o){ window.__notes.push([t, o && o.body, 'sw']); return Promise.resolve(); };"""
results = []
def ok(name, cond, info=''):
    results.append((name, bool(cond), info)); print(('PASS ' if cond else 'FAIL ') + name + (f'  [{info}]' if info else ''), flush=True)
def ls(p, k): return p.evaluate(f"JSON.parse(localStorage.getItem('asvab.{k}') || 'null')")
TODAY = time.strftime('%Y-%m-%d')

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    ctx = br.new_context(); ctx.add_init_script(FAKES); ctx.add_init_script(NOTIFY); errors = []
    p = ctx.new_page()
    p.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None); p.on('pageerror', lambda e: errors.append(str(e)))
    p.goto(BASE + 'index.html?fast=1'); p.wait_for_selector('h1')
    ok('app version 2.3.0', '2.3.0' in p.evaluate('APP_VERSION'), p.evaluate('APP_VERSION'))

    # ================= 1. weekly test =================
    W = p.evaluate('WEEKLY'); CAT = p.evaluate('CAT'); order = p.evaluate('MEPS_ORDER')
    ok('weekly: 30-35 questions, all 6 parts, real order', 30 <= sum(v[0] for v in W.values()) <= 35 and list(W.keys()) == order == ['GS','AR','WK','PC','MK','EI'], W)
    ok('weekly: official proportions (CAT counts x 0.4)', all(W[k][0] == max(4, round(CAT[k][0]*0.4)) for k in order) and W['PC'][0] < W['GS'][0])
    ok('weekly: same time per question as the real CAT (scaled time pressure)', all(abs(W[k][1]/W[k][0] - CAT[k][1]/CAT[k][0]) < 0.02 for k in order), {k: round(W[k][1]/W[k][0], 3) for k in order})
    ok('weekly: due on first run, nudge on home', p.evaluate('weeklyDue()') and p.locator('#weeklyNudge').count() == 1 and p.locator('#weeklyTile').count() == 1)
    p.click('#wnLater'); p.evaluate("go('home')")
    ok('weekly: "Not today" hides the nudge for today', p.locator('#weeklyNudge').count() == 0 and ls(p, 'weeklySnooze') == TODAY)
    def due(days_ago, wday_today):
        return p.evaluate("""([d, w]) => { const t = new Date(); t.setDate(t.getDate() - d); Store.set('weekly', [{ date:t.toISOString(), it212:150, it156:120 }]);
            settings.weeklyDay = w ? new Date().getDay() : (new Date().getDay() + 3) % 7; return weeklyDue(); }""", [days_ago, wday_today])
    ok('weekly due rule: 2 days ago -> not due', due(2, True) is False and due(2, False) is False)
    ok('weekly due rule: 7+ days ago -> due', due(7, False) is True and due(9, False) is True)
    ok('weekly due rule: chosen weekday and 4+ days -> due; other day -> not', due(4, True) is True and due(4, False) is False and due(3, True) is False)
    p.evaluate("localStorage.removeItem('asvab.weekly'); settings.weeklyDay = 0; saveSettings(); go('weekly')")
    ok('weekly screen: counts, minutes, start button', '34 questions' in p.inner_text('main') and p.locator('#wStart').count() == 1 and 'Estimate only' in p.inner_text('main'))
    p.click('#wStart'); p.wait_for_selector('#mBegin')
    ok('weekly part 1 intro: "Weekly test. Part 1 of 6: General Science", 6 questions', 'Weekly test. Part 1 of 6: General Science' in p.inner_text('h1') and '6 questions' in p.inner_text('main'), p.inner_text('h1'))
    p.click('#mBegin'); p.wait_for_selector('#mClock')
    ok('weekly GS clock = 4:48', p.inner_text('#mClock') in ('4:48', '4:47'), p.inner_text('#mClock'))
    seen = {}
    for part in range(6):
        if part: p.wait_for_selector('#mBegin'); p.click('#mBegin')
        sec = p.evaluate('M.sec'); n = p.evaluate('M.n'); seen[sec] = n
        for k in range(n):
            p.wait_for_function('M && M.q && document.querySelector(".choice")')
            a = p.evaluate('M.q.answer'); right = (k % 3 != 2)   # 2 of 3 right
            p.click(f'.choice[data-i="{a if right else (a+1)%4}"]')
    p.wait_for_selector("h1:has-text('Weekly test: score report')")
    ok('weekly run: each part asked its scaled count', seen == {k: W[k][0] for k in order}, seen)
    h = ls(p, 'weekly')[-1]; txt = p.inner_text('#wkSum')
    ok('weekly report: IT 212 (AR+MK+EI+VE) and 156 (VE+MK+GS) estimates', h['it212'] == h['S']['AR'] + h['S']['MK'] + h['S']['EI'] + h['S']['VE'] and h['it156'] == h['S']['VE'] + h['S']['MK'] + h['S']['GS'] and f"{h['it212']} of 212" in txt and f"{h['it156']} of 156" in txt, txt)
    need = 212 - h['it212']
    ok('weekly report: points still needed', (f'About {need} points still needed' in txt) if need > 0 else 'meets the line' in txt, txt)
    ok('weekly report: 2 focus subjects', p.locator('#wkFocus li[data-sec]').count() == 2 and len(h['focus']) == 2 and 'Focus this week' in txt)
    ok('weekly report: week-over-week chart with dashed goal lines', p.locator('#wkChart svg rect').count() == 2 and p.locator('#wkChart svg line[stroke-dasharray]').count() == 2)
    ok('weekly report: "Estimate only" label kept', 'Estimate only' in txt and 'Estimate only, confirm with a recruiter' in p.inner_text('main'))
    ok('weekly report: IT panel and per-part table', p.locator('#itPanel').count() == 1 and p.locator('table tr').count() >= 8)
    try: p.wait_for_function("window.__spoken.join(' ').includes('Weekly test done')", timeout=8000); spk = True
    except Exception: spk = False
    ok('weekly report read aloud (no hands-free)', spk)
    ok('weekly: no longer due after taking it', p.evaluate('weeklyDue()') is False)
    s2 = p.evaluate("weeklySummary({ it212:200, it156:150, right:20, total:34, focus:['AR','EI'] }, { it212:190 })")
    ok('weekly summary: change since last week, points needed', 'up 10 points' in s2 and 'About 12 points still needed' in s2 and 'About 6 points still needed' in s2 and 'Arithmetic Reasoning and Electronics Information' in s2, s2)
    p.evaluate("""() => { const L = []; for (let i = 3; i >= 1; i--){ const d = new Date(); d.setDate(d.getDate() - 7*i); L.push({ date:d.toISOString(), it212:170 + 10*i, it156:130 + i }); } Store.set('weekly', L.concat(Store.get('weekly'))); go('progress'); }""")
    ok('progress shows the weekly chart (4 weeks, 8 bars)', p.locator('#wkProg svg rect').count() == 8)
    p.evaluate("go('meps')"); p.click('#mStart')
    ok('real MEPS run unchanged (15 GS questions, 12 minutes)', 'Part 1 of 6: General Science' in p.inner_text('h1') and '15 questions. 12 minutes' in p.inner_text('main') and 'Weekly' not in p.inner_text('h1'))
    p.evaluate("M.running = false; clearInterval(M.timer); M = null; go('home')")

    # ================= 2. today's plan =================
    p.evaluate("localStorage.removeItem('asvab.daily'); localStorage.removeItem('asvab.plans')")
    p.evaluate("go('home')")
    ok("home: Today's plan tile", p.locator('#planTile').count() == 1)
    p.click('#planTile'); p.wait_for_selector('#planStart')
    ok("plan: below the bridge -> AR ladder at his level", p.evaluate('PLAN.pick.kind') == 'ladder' and p.evaluate('PLAN.pick.level') == p.evaluate('ladState().level') and 'catch-up' in p.inner_text('main'))
    ok('plan: shows the 3 steps', all(s in p.inner_text('main') for s in ['Short audio lesson', '10 questions', 'recap']))
    p.click('#planAlt'); alt = p.evaluate('PLAN.pick')
    ok('plan: "Different subject" picks another one', alt['kind'] == 'sec', alt)
    p.evaluate("PLAN = null; go('plan','new')")
    p.click('#planStart')
    ok('plan step 1: lesson lines on screen, played with highlighting', p.locator('#planLines .lad-li').count() >= 3 and 'step 1 of 3' in p.inner_text('h1'))
    try: p.wait_for_function("document.querySelector('#planLines .lad-li.now')", timeout=5000); hl = True
    except Exception: hl = False
    ok('plan lesson highlights the line being read', hl)
    p.click('#planSkip'); p.wait_for_selector('.choice')
    ok('plan step 2: 10 ladder questions, read to him', p.evaluate('LR && LR.qs.length') == 10 and p.evaluate('LR.byEar') is True)
    for k in range(10):
        p.evaluate(f"() => {{ const q = LR.qs[LR.i]; ladAnswer({ 'q.answer' if k not in (2, 5) else '(q.answer + 1) % 4' }); }}"); p.evaluate('ladNext()')
    p.wait_for_selector("h1:has-text('recap')")
    rt = p.inner_text('#planSum')
    ok('plan step 3: recap with score, the misses, and the answers', 'You got 8 of 10' in rt and 'Miss 1:' in rt and 'Miss 2:' in rt and 'The answer is' in rt, rt[:200])
    ok('plan recap mentions streak and daily goal', 'Streak' in rt and 'Daily goal done' in rt, rt[-160:])
    ok('plan counts toward the streak: +10 today', (ls(p, 'daily') or {}).get(TODAY) == 10 and p.evaluate('streakInfo().goalMet'))
    ok('plan saved as done today', (ls(p, 'plans') or {}).get(TODAY, {}).get('n') == 10)
    try: p.wait_for_function("window.__spoken.join(' ').includes('Recap. You got 8 of 10')", timeout=8000); spk = True
    except Exception: spk = False
    ok('plan recap read aloud', spk)
    ok('plan recap is short (about a minute of speech)', len(rt.split()) < 190, len(rt.split()))
    # past the bridge: weakest IT subject
    p.evaluate("() => { const st = ladState(); st.passed[NLEV] = true; ladSave(st); const h = {}; ['AR','WK','PC','MK','GS','EI'].forEach(k => h[k] = Array(20).fill(1)); h.EI = Array(20).fill(0).map((x,i) => i < 6 ? 1 : 0); Store.set('hist', h); PLAN = null; go('plan','new'); }")
    ok('plan: past the bridge -> weakest IT subject (EI)', p.evaluate('PLAN.pick.kind') == 'sec' and p.evaluate('PLAN.pick.sec') == 'EI', p.evaluate('PLAN.pick'))
    ok('plan EI lesson uses an Electronics by ear lesson', 'Electronics by ear' in p.evaluate('PLAN.lesson.title'))
    p.click('#planStart'); p.click('#planSkip'); p.wait_for_selector('.choice')
    ok('plan section questions: 10, no timer, no pre-review', p.evaluate('S.qs.length') == 10 and p.evaluate('S.timerOn') is False and p.locator('#tmr').count() == 0)
    for k in range(10):
        a = p.evaluate('S.qs[S.i].answer'); p.click(f'.choice[data-i="{(a+1)%4 if k == 0 else a}"]'); p.click('#confBox button[data-c="sure"]'); p.click('#nextBtn')
    p.wait_for_selector("h1:has-text('recap')")
    ok('plan section recap: 9 of 10, 1 miss', 'You got 9 of 10' in p.inner_text('#planSum') and 'Miss 1:' in p.inner_text('#planSum') and 'Miss 2:' not in p.inner_text('#planSum'))
    p.evaluate("go('home')"); ok('leaving the plan clears it', p.evaluate('PLAN') is None)
    p.evaluate("() => { const st = ladState(); delete st.passed[NLEV]; ladSave(st); localStorage.removeItem('asvab.hist'); }")

    # ================= 3. real-test passages =================
    R = p.evaluate('PCR')
    wc = [len(x['text'].split()) for x in R['passages']]
    ok('PC real: 12+ passages of 100-150 words', len(R['passages']) >= 12 and all(100 <= w <= 150 for w in wc), wc)
    per = {x['id']: sum(q['passageId'] == x['id'] for q in R['questions']) for x in R['passages']}
    ok('PC real: 24+ questions, 1-3 per passage, all with explanations and 4 choices', len(R['questions']) >= 24 and all(1 <= v <= 3 for v in per.values()) and all(q['explanation'] and len(q['choices']) == 4 for q in R['questions']), per)
    kinds = {q['kind'] for q in R['questions']}
    ok('PC real: official mix (main idea, detail, inference, vocab in context, purpose, sequence)', {'main-idea','detail','inference','vocab','purpose','sequence'} <= kinds, kinds)
    ok('PC real: existing PC bank unchanged and separate', p.evaluate("sectionPool('PC').every(q => q.set !== 'real')") and p.evaluate("sectionPool('PC').length") >= 50)
    p.evaluate("go('practice','PC')")
    ok('PC practice screen has the real-test card (locked, Try it anyway)', p.locator('#pcrCard').count() == 1 and 'Try it anyway' in p.inner_text('#pcrCard'))
    p.evaluate("go('pcreal')")
    ok('PC real locked under 10 answers', 'Locked' in p.inner_text('main') and p.locator('#pcrAnyway').count() == 1)
    p.evaluate("Store.set('hist', { PC: Array(20).fill(0).map((x,i) => i < 12 ? 1 : 0) }); go('pcreal')")
    ok('PC real locked at 60%', 'Locked' in p.inner_text('main') and '60%' in p.inner_text('main'))
    p.evaluate("Store.set('hist', { PC: Array(20).fill(0).map((x,i) => i < 15 ? 1 : 0) }); go('pcreal')")
    ok('PC real unlocks at 75%', p.locator('#pcrAloud').count() == 1 and p.locator('#pcrOwn').count() == 1)
    p.evaluate("Store.set('hist', {}); go('pcreal')"); p.click('#pcrAnyway')
    ok('PC real "Try it anyway" unlocks by choice', p.locator('#pcrAloud').count() == 1 and ls(p, 'pcrealOpen') is True)
    m0 = p.evaluate('window.__spoken.length')
    p.click('#pcrAloud'); p.wait_for_selector('.choice')
    ok('PC real set: 4 passages', len(set(p.evaluate('S.qs.map(q => q.passageId)'))) == 4 and p.evaluate('S.pcMode') == 'aloud')
    order_ok = p.evaluate("(() => { const st = document.querySelector('.stem').closest('.card'), ps = document.querySelector('.card.passage'); return !!(st.compareDocumentPosition(ps) & Node.DOCUMENT_POSITION_FOLLOWING); })()")
    ok('PC real: question shown before the passage, big read-along text', order_ok and p.locator('.passage-text.read-big').count() == 1)
    try: p.wait_for_function(f"window.__spoken.slice({m0}).join(' ').includes('Now the passage')", timeout=15000); sp = p.evaluate(f"window.__spoken.slice({m0}).join(' ')")
    except Exception: sp = p.evaluate(f"window.__spoken.slice({m0}).join(' ')")
    ok('read-aloud mode: reads the question first, then the passage', 'Question.' in sp and 'Now the passage' in sp and sp.index('Question.') < sp.index('Now the passage'), sp[:160])
    try: p.wait_for_function("document.querySelector('.passage-text .w.hl')", timeout=8000); hl = True
    except Exception: hl = False
    ok('read-aloud mode: read-along highlighting in the passage', hl)
    n = p.evaluate('S.qs.length')
    for k in range(n):
        a = p.evaluate('S.qs[S.i].answer'); p.click(f'.choice[data-i="{a}"]'); p.click('#confBox button[data-c="sure"]'); p.click('#nextBtn')
    p.wait_for_selector("h1:has-text('Set done')")
    lg = ls(p, 'pcreal')
    ok('PC real set done: log saved, history counts toward PC', lg['log'][-1]['right'] == n and lg['log'][-1]['mode'] == 'aloud' and len(ls(p, 'hist')['PC']) == n)
    p.click("button:has-text('Practice again')")
    ok('PC real "Practice again" returns to the real passages', 'Real test passages' in p.inner_text('h1'))
    m0 = p.evaluate('window.__spoken.length')
    p.click('#pcrOwn'); p.wait_for_selector('.choice')
    ok('PC real rotates to passages he has not seen', not (set(p.evaluate('S.qs.map(q => q.passageId)')) & set(q for q in [x['passageId'] for x in R['questions']][:0])) and p.evaluate("S.qs.every(q => JSON.parse(localStorage.getItem('asvab.pcreal')).seen[q.passageId] === 1)"))
    ok('own mode: Guide me button and big text', p.locator('#pcrGuide').count() == 1 and 'On your own' in p.inner_text('#pcrMode'))
    p.click('#pcrGuide'); time.sleep(1.3)
    ok('own mode: Guide me moves a silent highlight through the passage', p.locator('.passage-text .w.hl').count() == 1 and p.inner_text('#pcrGuide') == 'Stop guide')
    p.click('#pcrGuide'); ok('Stop guide clears it', p.locator('.passage-text .w.hl').count() == 0)
    p.evaluate("pcrRead(S.qs[0])"); time.sleep(1.5); sp = p.evaluate(f"window.__spoken.slice({m0}).join(' ')")
    ok('own mode: reads the question and choices, not the passage', 'read the passage on the screen' in sp and 'Now the passage' not in sp, sp[:200])
    p.evaluate("go('home')")

    # ================= 4. electronics by ear, 5. test-day tips =================
    E = p.evaluate('EAR')
    ok('electronics by ear: 8 lessons on the 8 topics', len(E['ei']) == 8 and all(any(w in ' '.join(l['title'] for l in E['ei']).lower() for w in ws) for ws in [['water'],['ohm'],['series','parallel'],['power'],['ac and dc'],['conductor'],['parts','component'],['magnet']]))
    allx = ' '.join(s.get('x', '') for l in E['ei'] for s in l['steps']).lower()
    ok('EI lessons use the mental pictures (pressure, flow, narrow pipe, triangle, lanes, P = V x I)', all(w in allx for w in ['pressure', 'flow', 'narrow', 'triangle', 'lane', 'power']), '')
    ok('every EI lesson ends with spoken checks ("Say the number")', all(l['steps'][-1]['t'] == 'check' and all(re.search(r'Say the (\w+ )?number', s['q']) for s in l['steps'] if s['t'] == 'check') for l in E['ei']))
    p.evaluate("go('practice','EI')")
    ok('EI section links Electronics by ear', p.locator('#eiEar').count() == 1)
    p.click('#eiEarGo'); ok('EI link opens the lesson list', 'Electronics by ear' in p.inner_text('h1') and p.locator('[data-el]').count() == 8)
    p.click('[data-el="ei-2"]')
    ok('EI lesson page: steps and quick checks', 'Ohm' in p.inner_text('h1') and p.locator('.lad-check').count() == 3)
    m0 = p.evaluate('window.__spoken.length'); p.click('#elPlay')
    try: p.wait_for_function(f"window.__spoken.slice({m0}).join(' ').includes('That is the lesson')", timeout=30000); done = True
    except Exception: done = False
    sp = p.evaluate(f"window.__spoken.slice({m0}).join(' ')")
    ok('EI lesson plays by ear: check, think pause, then the answer', done and 'Quick check.' in sp and 'The answer is 3 amps' in sp and ls(p, 'ear')['done'].get('ei-2') == TODAY, sp[-120:])
    p.evaluate("AL = null; go('audio')")
    titles = p.evaluate('AL.list.map(x => x.title)')
    ok('Audio lessons include 8 EI lessons and 9 test-day tips', sum(t.startswith('Electronics by ear') for t in titles) == 8 and sum(t.startswith('Test-day tip') for t in titles) == 9, len(titles))
    p.evaluate("go('audio','ei')"); ok('go audio/ei jumps to the first EI lesson', p.evaluate('AL.list[AL.i].title').startswith('Electronics by ear 1'))
    p.evaluate("go('audio','tips')"); ok('go audio/tips jumps to the first tip', p.evaluate('AL.list[AL.i].title').startswith('Test-day tip 1'))
    p.evaluate("go('home')")
    ok('home: Test-day tips tile', p.locator('#tipsTile').count() == 1)
    p.click('#tipsTile')
    ok('Test-day tips list: 9 tips', 'Test-day tips' in p.inner_text('h1') and p.locator('[data-el]').count() == 9)
    tipx = ' '.join(s.get('x', '') + ' ' + s.get('q', '') for l in E['tips'] for s in l['steps']).lower()
    need = {'answer every': 'answer every', 'no going back': 'cannot go back', 'random guesses': 'random', 'adapts': 'harder', 'pacing': 'minutes', 'elimination': 'rule out', 'question first': 'read the question before', 'scratch paper': 'scratch paper', 'units': 'units', 'ID': ' id', 'rest': 'rest', 'food': 'eat', 'calm': 'breath', 'recruiter accommodations': 'accommodation'}
    miss = [k for k, w in need.items() if w not in tipx]
    ok('tips cover every requested topic', not miss, miss)
    p.click('[data-el="tip-1"]'); ok('tip page cites its sources', 'officialasvab.com' in p.inner_text('main'))
    src = p.evaluate("fetch('SOURCES.md').then(r => r.text())")
    ok('SOURCES.md cites officialasvab.com pages for every tip source key', all(k in src for k in ['officialasvab.com', 'cat-applicants', 'fact-sheet', 'what-to-expect', 'preparing', 'accommodations']) and all(all(s in src for s in l['src']) for l in E['tips']))

    # ================= 6. reminders =================
    p.evaluate("go('settings')")
    ok('settings: daily reminder card (toggle, time, weekly day)', p.locator('#remCard #remOn').count() == 1 and p.locator('#remTime').count() == 1 and p.locator('#weeklyDay option').count() == 7)
    p.fill('#remTime', '00:00'); p.dispatch_event('#remTime', 'change'); p.check('#remOn')
    p.wait_for_function("settings.remindOn === true && Notification.permission === 'granted' && /allowed/.test(document.querySelector('#remStatus').textContent)")
    ok('turning it on asks for notification permission and saves the time', p.evaluate('settings.remindTime') == '00:00' and 'allowed' in p.inner_text('#remStatus'))
    p.evaluate("localStorage.removeItem('asvab.daily'); localStorage.removeItem('asvab.remindLast'); localStorage.removeItem('asvab.remindDismiss'); window.__notes.length = 0; reminderTick()")
    p.wait_for_function('window.__notes.length >= 1', timeout=5000)
    ok('due reminder shows a notification (Notifications API)', 'Time to study' in p.evaluate('window.__notes[0][1]'), p.evaluate('window.__notes'))
    p.evaluate('reminderTick(); reminderTick()'); time.sleep(0.5)
    ok('only one notification per day', p.evaluate('window.__notes.length') == 1)
    p.evaluate("go('home')")
    ok('fallback banner on the home screen when due', p.locator('#remindBanner').count() == 1 and "Start today's plan" in p.inner_text('#remindBanner'))
    p.click('#remDismiss'); p.evaluate("go('home')")
    ok('banner can be dismissed for the day', p.locator('#remindBanner').count() == 0)
    p.evaluate("localStorage.removeItem('asvab.remindDismiss'); bumpDaily(10); go('home')")
    ok('no reminder once the 10-a-day goal is met (goal stays 10)', p.locator('#remindBanner').count() == 0 and p.evaluate('reminderDue()') is False and p.evaluate('DAILY_GOAL') == 10)
    p.evaluate("localStorage.removeItem('asvab.daily'); settings.remindTime = '23:59'; saveSettings(); go('home')")
    ok('no banner before the chosen time', p.locator('#remindBanner').count() == 0 or time.strftime('%H:%M') >= '23:59')
    tm = p.evaluate("['remind me at 7 pm', 'reminder at 6 30', 'remind me at 7 p.m.', 'remind me at 9 am', 'remind me at 12 pm', 'remind me at 5'].map(parseSpokenTime)")
    ok('spoken times parse', tm == ['19:00', '18:30', '19:00', '09:00', '12:00', '17:00'], tm)
    sw = p.evaluate("fetch('sw.js').then(r => r.text())")
    ok('service worker: periodic sync reminder + notification click opens the plan', 'periodicsync' in sw and 'notificationclick' in sw and '#plan' in sw)
    p.evaluate('remSyncSW()'); time.sleep(0.5)
    st = p.evaluate("caches.open('asvab-state').then(c => c.match('./reminder-state')).then(r => r ? r.json() : null)")
    ok('reminder state shared with the service worker', st and st['on'] is True and st['time'] == '23:59', st)
    p.evaluate("settings.remindOn = false; saveSettings()")
    # denied permission: banner only
    ctx3 = br.new_context(); ctx3.add_init_script(FAKES); ctx3.add_init_script(NOTIFY + "window.__permAnswer = 'denied';")
    q = ctx3.new_page(); q.goto(BASE + 'index.html?fast=1'); q.wait_for_selector('h1'); q.evaluate("go('settings')")
    q.fill('#remTime', '00:00'); q.dispatch_event('#remTime', 'change'); q.check('#remOn'); q.wait_for_function("Notification.permission === 'denied'")
    q.evaluate('reminderTick()'); q.evaluate("go('home')")
    ok('notifications denied -> no notification, banner fallback', q.evaluate('window.__notes.length') == 0 and q.locator('#remindBanner').count() == 1 and 'banner' in q.evaluate('remStatusText()'))
    ctx3.close()
    # single self-contained file over file:// has the new features
    ctx4 = br.new_context(); ctx4.add_init_script(FAKES); e4 = []
    f = ctx4.new_page(); f.on('pageerror', lambda e: e4.append(str(e))); f.goto('file://' + str(APP/'asvab-coach.html')); f.wait_for_selector('h1')
    for s_, a_ in [('weekly', None), ('plan', 'new'), ('pcreal', None), ('earset', 'ei'), ('earlesson', 'tip-3'), ('settings', None)]:
        f.evaluate(f"go('{s_}', {repr(a_) if a_ else 'undefined'})")
    ok('single-file asvab-coach.html includes all 2.3 screens (file://)', not e4 and f.evaluate('PCR.questions.length') == len(R['questions']) and f.evaluate('EAR.ei.length') == 8 and f.locator('#remCard').count() == 1, e4[:2])
    ctx4.close()
    ok('no console errors in the features run', not errors, errors[:3])
    br.close()
print(f"\n{sum(r[1] for r in results)}/{len(results)} passed")
json.dump([{'test':n,'pass':b,'info':str(i)} for n,b,i in results], open(APP/'tests'/'features_results.json','w'), indent=1)
sys.exit(0 if all(r[1] for r in results) else 1)
