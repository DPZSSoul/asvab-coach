"""2.3 features by VOICE ONLY (one tap to start): weekly test, today's plan, real-test passages (both modes),
electronics by ear with spoken number checks, test-day tips, reminder voice commands."""
import json, os, sys, time, pathlib
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765/')
APP = pathlib.Path(__file__).resolve().parent.parent
FAKES = open(APP/'tests'/'fakes.js').read()
results = []
def ok(name, cond, info=''):
    results.append((name, bool(cond), info)); print(('PASS ' if cond else 'FAIL ') + name + (f'  [{info}]' if info else ''), flush=True)
NATO = ['alpha','bravo','charlie','delta']
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    ctx = br.new_context(); ctx.add_init_script(FAKES); errors = []
    ctx.add_init_script("window.Notification = class { constructor(){} static requestPermission(){ return Promise.resolve('denied'); } }; window.Notification.permission = 'denied';")
    p = ctx.new_page()
    p.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None); p.on('pageerror', lambda e: errors.append(str(e)))
    taps = {'n': 0}; p.expose_function('__countTap', lambda: taps.__setitem__('n', taps['n'] + 1))
    p.goto(BASE + 'index.html?fast=1&silence=1500'); p.wait_for_selector('h1')
    p.evaluate("document.addEventListener('pointerdown', () => window.__countTap(), true)")
    mark = {'i': 0}
    def heard(sub, timeout=20000):
        try: p.wait_for_function("([m,s]) => window.__spoken.slice(m).join(' ').toLowerCase().includes(s.toLowerCase())", arg=[mark['i'], sub], timeout=timeout); return True
        except Exception: return False
    def say(text, expect=None, timeout=20000):
        mark['i'] = p.evaluate('window.__spoken.length'); p.evaluate("t => window.__heard.push(t)", text)
        return heard(expect, timeout) if expect else True
    def last(n=6): return ' | '.join(p.evaluate(f'window.__spoken.slice(-{n})'))
    p.click('#hfStartBig'); heard('start by itself next time'); say('no', 'Tap Start hands-free next time')
    ok("home reads the weekly nudge and today's plan", heard('Your weekly test is due') and heard("Say today's plan"), last())

    # ---- weekly test by voice ----
    ok('"weekly test" opens it and reads counts', say('weekly test', 'Say start the test', 30000) and heard('34 questions') and 'Weekly practice test' in p.inner_text('h1'), last())
    ok('"start the test" -> part 1 intro read aloud', say('start the test', 'Say begin') and heard('Weekly test. Part 1 of 6: General Science') and heard('6 questions'), last())
    ok('"begin" -> first question read, answer by voice', say('begin', 'Your answer?') and p.evaluate('M.done') == 0)
    a = p.evaluate('M.q.answer')
    ok('NATO answer moves to the next question (no hints, no going back)', say(NATO[a], 'Your answer?') and p.evaluate('M.done') == 1 and p.evaluate('M.log[0].ok'))
    ok('"hint" is refused like the real test', say('hint', 'No hints'))
    ok('"time left" answers', say('time left', 'Time left:'))
    p.evaluate("""() => { clearInterval(M.timer); M.order.forEach(k => { const n = M.counts[k][0]; M.res[k] = { right: Math.round(n * 0.55), total:n, answered:n, guessed:0 }; }); M.part = M.order.length; weeklyReport(); }""")
    ok('weekly report read aloud: 212, 156, points needed, focus, estimate only',
       heard('of 212', 30000) and heard('of 156') and heard('Focus this week') and heard('Estimate only') and heard('Say practice and a section name', 40000), last(4))
    ok('"repeat" re-reads the report', say('repeat', 'Weekly test done', 30000))
    # ---- today's plan by voice ----
    ok('"today\'s plan" opens the plan and reads it', say("today's plan", 'Say start, or different subject', 30000) and "Today's plan" in p.inner_text('h1'), last())
    k0 = p.evaluate('PLAN.pick')
    ok('"different subject" switches', say('different subject', 'Say start, or different subject', 30000) and p.evaluate('PLAN.pick') != k0, p.evaluate('PLAN.pick'))
    mark['i'] = p.evaluate('window.__spoken.length'); p.evaluate("PLAN.alt = -1; planAlt()"); heard('Say start, or different subject', 30000)
    ok('plan pick is the AR ladder (below the bridge)', p.evaluate('PLAN.pick.kind') == 'ladder', p.evaluate('PLAN.pick'))
    l1 = p.evaluate('PLAN.lesson.lines[1]')[:30]
    ok('"start" plays the lesson, line by line, by itself', say('start', 'Step 1: the lesson') and heard(l1, 30000), l1)
    ok('"skip lesson" goes to the 10 questions', say('skip lesson', 'Say the answer', 30000) or heard('Your answer?'), last())
    ok('plan questions are the ladder (10)', p.evaluate('LR && LR.qs.length') == 10)
    q = p.evaluate('LR.qs[0]')
    spoken = str(q['value']).replace('/', ' over ') if q.get('mode') == 'say' else NATO[q['answer']]
    ok('answer the first plan question by voice', say(spoken, 'Say next', 30000) and p.evaluate('LR.results[0].ok'), spoken)
    p.evaluate("() => { ladNext(); for (let k = 0; k < 20 && LR; k++){ const qq = LR.qs[LR.i]; ladAnswer(LR.i === 3 ? (qq.answer + 1) % 4 : qq.answer); ladNext(); } }")
    ok('recap read aloud: score, the miss, streak', heard('Recap. You got 9 of 10', 30000) and heard('Miss 1:') and heard('Streak') and heard('Say home, progress, or another plan', 40000), last(3))
    # ---- real-test passages by voice ----
    ok('"real test passages" (locked) offers try it anyway', say('real test passages', 'Say try it anyway', 30000) and 'Locked' in p.inner_text('main'))
    ok('"try it anyway" unlocks', say('try it anyway', 'Say read aloud first', 30000) and p.locator('#pcrAloud').count() == 1)
    ok('"read aloud first": question, then the passage, then choices', say('read aloud first', 'Your answer?', 60000) and heard('Question.') and heard('Now the passage') and p.evaluate('S.pcMode') == 'aloud', last(3))
    a = p.evaluate('S.qs[0].answer')
    ok('answer a real-level question by voice', say(NATO[a], 'How sure were you', 30000) and p.evaluate('S.results[0].correct'))
    say('sure', 'Say next')
    ok('"read the passage" re-reads it', say('next', 'Your answer?', 60000) and say('read the passage', 'Passage.', 30000))
    ok('"home" leaves the set', say('home', 'Home.', 30000))
    ok('"real passages" then "on my own": reads only question and choices', say('real passages', 'Say read aloud first', 30000) and say('on my own', 'Say the letter when you are ready', 60000) and heard('read the passage on the screen') and p.evaluate('S.pcMode') == 'own', last(3))
    ok('"guide me" starts the moving highlight', say('guide me', 'Guide on', 30000) and p.locator('.passage-text .w.hl').count() == 1)
    ok('"stop guide" stops it', say('stop guide', 'Guide off', 30000) and p.locator('.passage-text .w.hl').count() == 0)
    # ---- electronics by ear by voice ----
    ok('"electronics by ear" lists 8 lessons', say('electronics by ear', 'Say lesson and a number', 40000) and heard("Ohm's law as a triangle") and p.locator('[data-el]').count() == 8)
    c = p.evaluate("EAR.ei[1].steps.filter(s => s.t === 'check')")
    ok('"lesson 2" plays and asks the first spoken check', say('lesson 2', 'Quick check. ' + c[0]['q'][:20], 40000), last(2))
    ok(f'saying the number ("{c[0]["v"]}") -> "Yes!"', say(c[0]['v'], 'Yes!', 30000) and heard('Quick check. ' + c[1]['q'][:20], 30000), last(2))
    ok('a wrong number -> "Not quite" with the answer', say('99', 'Not quite. The answer is ' + c[1]['a'], 30000))
    ok('"skip" gives the answer and finishes the lesson', heard('Quick check.', 30000) and say('skip', 'That is the lesson', 30000) and p.evaluate("JSON.parse(localStorage.getItem('asvab.ear')).done['ei-2']"), last(2))
    ok('"next lesson" goes to lesson 3', say('next lesson', 'lesson 3', 30000) and 'Series' in p.inner_text('h1'))
    # ---- test-day tips by voice ----
    ok('"test day tips" lists 9 tips', say('test day tips', 'Say lesson and a number', 40000) and p.locator('[data-el]').count() == 9)
    ok('"lesson 1" reads the tip, then a spoken check', say('lesson 1', 'cannot go back', 40000) and heard('Quick check.', 40000))
    ok('"zero" answers the check', say('zero', 'Yes!', 30000))
    ok('"play all" sends it to Audio lessons at the tips', say('play all', 'Audio lessons', 30000) and p.evaluate('AL.list[AL.i].title').startswith('Test-day tip 1'))
    # ---- reminders by voice ----
    ok('"settings" reads the reminder status', say('settings', 'Reminder is off', 30000))
    ok('"reminder on" turns it on at 6 PM', say('reminder on', 'Reminder on, every day at 6 PM', 30000) and p.evaluate('settings.remindOn'))
    ok('"remind me at 7 pm" sets 19:00', say('remind me at 7 pm', 'every day at 7 PM', 30000) and p.evaluate('settings.remindTime') == '19:00' and p.input_value('#remTime') == '19:00')
    ok('"reminder off" turns it off', say('reminder off', 'Reminder off', 30000) and not p.evaluate('settings.remindOn'))
    ok('"electronics" alone still opens the EI section', say('electronics', 'Say start to begin', 30000) and 'Electronics Information' in p.inner_text('h1'))
    ok('never listens while the app is speaking', p.evaluate('window.__recWhileSpeaking') == 0)
    ok('only one tap in the whole voice run', taps['n'] == 1, taps['n'])
    ok('no console errors in the voice features run', not errors, errors[:3])
    br.close()
print(f"\n{sum(r[1] for r in results)}/{len(results)} passed")
json.dump([{'test':n,'pass':b,'info':str(i)} for n,b,i in results], open(APP/'tests'/'features_voice_results.json','w'), indent=1)
sys.exit(0 if all(r[1] for r in results) else 1)
