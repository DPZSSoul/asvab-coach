"""Drive the whole app by VOICE ONLY (one tap to start, as browsers require), with a fake SpeechRecognition.
Covers: home -> section -> answer -> next -> explain -> end set -> progress -> error log -> MEPS (hands-free, time
announcements, no hints, voice confirm to quit) -> math ladder (go to fractions, what level am I, pass a level) ->
tutor by voice (answers, hint ladder, lock-in) -> dictated question to the AI tutor -> pause/resume -> fuzzy commands
-> recognition restarts after silence and errors -> never listens while speaking -> auto-resume on a later visit."""
import json, os, sys, time, pathlib
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765/')
APP = pathlib.Path(__file__).resolve().parent.parent
FAKES = open(APP/'tests'/'fakes.js').read()
results = []
def ok(name, cond, info=''):
    results.append((name, bool(cond), info)); print(('PASS ' if cond else 'FAIL ') + name + (f'  [{info}]' if info else ''), flush=True)

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    ctx = br.new_context(); ctx.add_init_script(FAKES); errors = []
    p = ctx.new_page()
    p.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None); p.on('pageerror', lambda e: errors.append(str(e)))
    taps = {'n': 0}
    p.expose_function('__countTap', lambda: taps.__setitem__('n', taps['n'] + 1))
    p.goto(BASE + 'index.html?fast=1&silence=1500'); p.wait_for_selector('h1')
    p.evaluate("document.addEventListener('pointerdown', () => window.__countTap(), true)")
    mark = {'i': 0}
    def heard(sub, timeout=20000):
        # speech is chunked at sentence ends, so compare the joined text, case-insensitive
        try: p.wait_for_function("([m,s]) => window.__spoken.slice(m).join(' ').toLowerCase().includes(s.toLowerCase())", arg=[mark['i'], sub], timeout=timeout); return True
        except Exception: return False
    def say(text, expect=None, timeout=20000):
        mark['i'] = p.evaluate('window.__spoken.length')
        p.evaluate("t => window.__heard.push(t)", text)
        return heard(expect, timeout) if expect else True
    def until(js, timeout=20000):
        try: p.wait_for_function(js, timeout=timeout); return True
        except Exception: return False
    def last(n=6): return ' | '.join(p.evaluate(f'window.__spoken.slice(-{n})'))
    NATO = ['alpha','bravo','charlie','delta']

    # ---- the one tap ----
    p.click('#hfStartBig')
    ok('one tap starts hands-free and offers to remember it', heard('start by itself next time') and p.evaluate('HF.on'))
    ok('voice yes/no answers the remember question', say('no', 'Tap Start hands-free next time') and p.evaluate('settings.hfAuto') is False)
    ok('home is read aloud: streak, IT focus plan, available commands', heard('Streak') and heard('IT focus for today') and heard('Say a section name'))
    ok('help lists commands', say('help', 'You can always say: home, back, repeat'))
    ok('unknown speech -> "I didn\'t catch that"', say('purple monkey dishwasher', "I didn't catch that. Say it again, or say help"))
    # ---- section -> answer -> next ----
    ok('fuzzy section name "arithmatic" opens Arithmetic Reasoning', say('arithmatic', 'Say start to begin') and 'Arithmetic Reasoning' in p.inner_text('h1'))
    say('five questions', '5 questions')
    ok('"start" begins a voice session and reads the question', say('start', 'Your answer?') and p.evaluate('S && S.qs.length') == 5 and heard('Question.'), last())
    a = p.evaluate('S.qs[0].answer')
    ok('NATO answer + feedback + confidence prompt', say(NATO[a], 'How sure were you') and p.evaluate('S.results[0].correct'), last())
    ok('confidence by voice, then waits for "next"', say('sure', 'Say next') and p.evaluate('S.results[0].conf') == 'sure' and p.evaluate('S.i') == 0, last())
    ok('"next" moves on', say('next', 'Your answer?') and p.evaluate('S.i') == 1)
    ok('"repeat" re-reads the question', say('repeat', 'Your answer?') and heard('Question.'))
    a = p.evaluate('S.qs[1].answer'); wrong_txt = p.evaluate(f'S.qs[1].choices[{(a+1)%4}]')
    ok('answer by saying the choice text (wrong on purpose)', say(wrong_txt, 'How sure were you') and p.evaluate('S.results[1].correct') is False, wrong_txt)
    ok('"explain" reads the steps', say('explain', 'How sure were you') and heard('Answer:'))
    say('guessed', 'Say next')
    ok('"slower" lowers the speech rate', say('slower', 'Slower') and abs(p.evaluate('settings.rate') - 0.8) < 1e-9)
    say('faster', 'Faster')
    say('next', 'Your answer?')
    ok('"hint" gives a hint, no answer', say('hint', 'Hint 1') and p.evaluate('!S.answered'))
    ok('"skip" skips', say('skip', 'Your answer?') and p.evaluate('S.i') == 3)
    ok('"end practice" confirms by voice, "no" keeps going', say('end practice', 'End this set? Say yes or no') and say('no', 'Your answer?') and p.evaluate('!!S'))
    ok('"end practice" + "yes" ends the set and reads the score', say('end practice', 'End this set') and say('yes', 'Say practice again') and 'Set done' in p.inner_text('h1'), last())
    # ---- progress, error log ----
    ok('"progress" reads the IT line-score panel', say('progress', 'Say read the sections', 30000) and 'My progress' in p.inner_text('h1') and heard('212'))
    ok('"error log" reads misses one by one', say('error log', 'Say next, tutor me, or remove this one') and 'My misses' in p.inner_text('h1') and heard('Miss 1 of'))
    n0 = len(p.evaluate("JSON.parse(localStorage.getItem('asvab.errors'))"))
    ok('destructive action asks yes/no ("remove" -> "no" keeps it)', say('remove this one', 'Remove this miss') and say('no', 'Kept') and len(p.evaluate("JSON.parse(localStorage.getItem('asvab.errors'))")) == n0)
    # ---- pre-session review of last misses, by voice ----
    say('word knowledge', 'Say start to begin')
    ok('pre-session review is read aloud and "skip review" starts', say('start', 'Quick look at your last') and heard('Miss 1 of') and say('skip review', 'Your answer?') and p.evaluate('!!S'), last())
    say('home', 'Say a section name')
    # ---- MEPS hands-free ----
    ok('"start MEPS mode" opens MEPS and reads the rules', say('start meps mode', 'Say start the test') and 'MEPS' in p.inner_text('h1'))
    ok('"start the test" -> part 1 intro read', say('start the test', 'Part 1 of 6') and p.evaluate('!!(M && M.running)'))
    ok('"begin" -> question read aloud', say('begin', 'Your answer?') and p.evaluate('!!M.q'))
    ok('MEPS: no hints by voice', say('hint', 'No hints in MEPS mode'))
    ok('MEPS: "time left" is spoken', say('time left', 'Time left:'))
    ok('MEPS: voice answer accepted', say('charlie', 'Your answer?') and p.evaluate('M.done') == 1)
    mark['i'] = p.evaluate('window.__spoken.length'); p.evaluate('M.end = Date.now() + 299000')
    ok('MEPS: time left is announced at intervals (5 minutes)', heard('Time left: 4 minutes', 8000), last())
    ok('leaving MEPS asks to confirm; "no" stays', say('home', 'Quit the MEPS test') and say('no', 'Keep going') and p.evaluate('!!(M && M.running)'))
    ok('"yes" quits MEPS', say('home', 'Quit the MEPS test') and say('yes', 'Say a section name') and p.evaluate('!M || !M.running'))
    # ---- math ladder ----
    ok('"math ladder" opens the ladder and reads the level', say('math ladder', 'level 1 of 15') and 'Math ladder' in p.inner_text('h1'))
    ok('"go to fractions" opens level 6', say('go to fractions', 'Fractions 1') and p.get_attribute('#ladView', 'data-level') == '6', last())
    ok('"what level am I" answers', say('what level am i', 'you are on level 1 of 15'))
    ok('"level three" jumps to level 3', say('level three', 'level 3') and p.get_attribute('#ladView', 'data-level') == '3')
    say('go to fractions', 'Fractions 1')
    ok('"lesson" reads the level lesson', say('lesson', 'Say start to do a set of 10', 60000) and 'Fractions' in p.inner_text('h1'))
    ok('"start" begins a ladder set', say('start', 'Your answer?') and p.evaluate('LR && LR.n') == 6)
    allok = True
    for k in range(10):
        a = p.evaluate('LR.qs[LR.i].answer')
        if not say(['A','B','C','D'][a], 'Say next'): allok = False; break
        if not say('next', 'Your answer?' if k < 9 else 'Say start for level'): allok = False; break
    st = p.evaluate("JSON.parse(localStorage.getItem('asvab.ladder'))")
    ok('ladder set by voice: 10 of 10 passes level 6 and moves to 7', allok and st and st['passed'].get('6') and st['level'] == 7, st)
    ok('"what level am I" now says level 7', say('what level am i', 'level 7 of 15'))
    # ---- tutor by voice ----
    ok('"tutor" reads saved misses and options', say('tutor', 'Say my last miss') and 'Tutor' in p.inner_text('h1'))
    ok('"my last miss" starts the step tutor (steps read aloud)', say('my last miss', 'Step 3') and p.evaluate('!!T'))
    tq = p.evaluate('T.q'); w = [i for i in range(4) if i != tq['answer'] and not p.evaluate(f'T.wrong.has({i})')][0]
    ok('tutor: spoken wrong answer -> kind check + hint 1', say(NATO[w], 'Hint 1'), last())
    ok('tutor: "I don\'t know" -> hint 2', say("I don't know", 'Hint 2'))
    ok('tutor: "hint" -> hint 3', say('hint', 'Hint 3'))
    ok('tutor: spoken right answer -> lock it in', say(NATO[tq['answer']], 'Lock it in'))
    ok('tutor: rule said in own words is saved', say('my rule is read the question twice', 'Perfect. That is the rule'))
    # ---- dictate a question to the AI tutor (mocked LLM) ----
    calls = []
    def handle(route):
        calls.append(json.loads(route.request.post_data))
        route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin':'*'}, body=json.dumps({"choices":[{"message":{"content":"Hint 1 (the idea):\nDistance is rate times time.\n\nWhat is the rate?"}}]}))
    ctx.route('https://mock-llm.test/v1/chat/completions', handle)
    p.evaluate("settings.apiKey='test-key-not-real'; settings.apiBase='https://mock-llm.test/v1'; saveSettings()")
    say('tutor', 'Say my last miss')
    ok('"new question" starts dictation', say('new question', 'Say done when you finish'))
    say('a truck drives 50 miles per hour for 4 hours how far does it go', 'Say more, or say done')
    say('done', 'What did you answer')
    ok('dictated question goes to the AI tutor', say('done', 'What is the rate', 30000) and calls and 'truck drives 50 miles' in json.dumps(calls[-1]['messages']))
    ok('free speech in the AI tutor is sent as his reply', say('is it 200 miles', 'What is the rate', 30000) and calls[-1]['messages'][-1]['content'] == 'is it 200 miles')
    # ---- pause / resume / back ----
    ok('"pause" stops reacting', say('pause', 'Paused. Say resume') and p.evaluate('HF.paused'))
    say('progress'); time.sleep(1.5)
    ok('while paused, other commands are ignored', 'AI tutor' in p.inner_text('h1'))
    ok('"resume" comes back', say('resume') and until('!HF.paused'))
    say('home', 'Say a section name')
    ok('fuzzy "electronic" opens Electronics Information', say('electronic', 'Say start to begin') and 'Electronics Information' in p.inner_text('h1'))
    ok('"back" goes to the last screen', say('back', 'Say a section name') and 'Ready to study' in p.inner_text('h1'))
    # ---- robustness ----
    r0 = p.evaluate('window.__recStarts'); time.sleep(4); r1 = p.evaluate('window.__recStarts')
    ok('listening restarts by itself after silence (onend)', r1 > r0 and p.evaluate('HF.on'), f'{r0}->{r1}')
    p.evaluate("window.__heard.push('__error:network')"); time.sleep(1.5)
    ok('recovers from a recognition error and keeps going', say('progress', 'Say read the sections', 30000) and p.evaluate('HF.on'))
    ok('never listens while the app is speaking', p.evaluate('window.__recWhileSpeaking') == 0, p.evaluate('window.__recWhileSpeaking'))
    ok('only one tap in the whole voice run', taps['n'] == 1, taps['n'])
    ok('"stop hands-free" turns it off', say('stop hands free', 'Hands-free is off') and not p.evaluate('HF.on'))
    p.evaluate("go('home')")
    ok('touch still works after voice', p.locator('#hfStartBig').count() == 1)
    ok('no console errors in the voice run', not errors, errors[:3])
    # ---- auto-resume on a later visit, mic already allowed ----
    ctx2 = br.new_context(); ctx2.add_init_script(FAKES)
    origin = BASE.split('/')[0] + '//' + BASE.split('/')[2]
    ctx2.grant_permissions(['microphone'], origin=origin)
    ctx2.add_init_script("if (!sessionStorage.getItem('seeded')) { localStorage.setItem('asvab.settings', JSON.stringify({hfAuto:true})); sessionStorage.setItem('seeded','1'); }")
    q = ctx2.new_page(); q.goto(BASE + 'index.html?fast=1&silence=1500'); q.wait_for_selector('h1')
    try: q.wait_for_function("window.__spoken.join(' ').includes('Hands-free is back on')", timeout=10000); ar = True
    except Exception: ar = False
    ok('auto-resume: hands-free starts by itself when remembered and mic is allowed', ar and q.evaluate('HF.on'))
    ctx2.close(); br.close()
print(f"\n{sum(r[1] for r in results)}/{len(results)} passed")
json.dump([{'test':n,'pass':b,'info':str(i)} for n,b,i in results], open(APP/'tests'/'voice_results.json','w'), indent=1)
sys.exit(0 if all(r[1] for r in results) else 1)
