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
    ok('unknown speech -> short "did not get that" line (no command words to echo)', say('purple monkey dishwasher', "Sorry, I did not get that"))
    # ---- section -> answer -> next ----
    ok('fuzzy section name "math knowlege" opens Math Knowledge', say('math knowlege', 'Say start to begin') and 'Knowledge' in p.inner_text('h1'))
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
    say('fifteen questions', '15 questions')
    ok('pre-session review is read aloud and "skip review" starts', say('start', 'Quick look at your last') and heard('Miss 1 of') and say('skip review', 'Your answer?') and p.evaluate('!!S'), last())
    # ---- real-phone mishearings of A/B/C/D (the "says sorry and repeats" bug) ----
    def cur(): return p.evaluate('S.qs[S.i].answer')
    def right(): return p.evaluate('S.results.length && S.results[S.results.length-1].correct')
    a = cur(); t = ['hey', 'bee', 'see', 'the'][a]
    ok(f'lone letter heard as "{t}" is accepted', say(t, 'How sure were you') and right(), last())
    ok('stray "hey" at the confidence prompt -> one short re-prompt', say('hey', 'Say sure, shaky, or guessed. Or say next'))
    ok('second miss at the confidence prompt marks it shaky and moves on (no loop)', say('banana', 'I will mark it shaky') and say('next', 'Your answer?'))
    a = cur(); t = ['a.', 'be', 'sea', 'dee'][a]
    ok(f'letter with a period / sound-alike "{t}" is accepted', say(t, 'How sure were you') and right(), last())
    say('sure', 'Say next'); say('next', 'Your answer?')
    a = cur(); t = 'kate||' + ['eh', 'b', 'si', 'd'][a]
    ok(f'second recognition alternative is used ("{t}")', say(t, 'How sure were you') and right(), last())
    say('sure', 'Say next'); say('next', 'Your answer?')
    a = cur(); t = '~' + ['ay', 'bee', 'c', 'delta'][a]
    ok(f'interim-only result is used ("{t[1:]}")', say(t, 'How sure were you') and right(), last())
    say('sure', 'Say next'); say('next', 'Your answer?')
    a = cur(); t = ['first', 'second', 'third', 'fourth'][a]
    ok(f'ordinal "{t}" is accepted', say(t, 'How sure were you') and right(), last())
    say('sure', 'Say next'); say('next', 'Your answer?')
    q_reads = lambda: sum(1 for x in p.evaluate('window.__spoken') if x.startswith('Question.'))
    r0 = q_reads()
    ok('empty transcript -> short re-prompt (not the whole question)', say('__empty', 'Say Alpha, Bravo, Charlie, or Delta, or say the answer') and q_reads() == r0)
    say('__echo'); p.wait_for_timeout(1800)
    ok('the app hearing its own voice is ignored', p.evaluate('HF.misses') == 1 and p.evaluate('VOICE_LOG.some(x => x.echo)'), p.evaluate('HF.misses'))
    ok('second miss says what it heard and reads the choices once', say('banana split', 'I heard "banana split"') and heard('Say the letter or the answer') and q_reads() == r0, last(8))
    mark['i'] = p.evaluate('window.__spoken.length'); p.evaluate("window.__heard.push('zebra crossing')"); p.wait_for_timeout(2500)
    ok('third miss stays quiet: it never loops', p.evaluate('window.__spoken.length') == mark['i'] and not p.evaluate('S.answered'), last())
    a = cur()
    ok('"letter X" then works', say('letter ' + 'abcd'[a], 'How sure were you') and right(), last())
    ok('"what did you hear" reads the transcript log', say('what did you hear', 'Here is what I heard last') and heard('banana split'))
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
    # ---- Arithmetic Reasoning = the audio-first catch-up track ----
    ok('"arithmatic" opens the AR catch-up track at his level', say('arithmatic', 'Arithmetic Reasoning: Level 1 of 27') and 'Arithmetic Reasoning: Level 1 of 27' in p.inner_text('h1'), p.inner_text('h1'))
    say('home', 'Say a section name')
    ok('"math ladder" is an alias for the same place', say('math ladder', 'Arithmetic Reasoning: Level 1 of 27') and '#ladder' in p.url)
    ok('"go to fractions" opens level 4, What a Fraction Means', say('go to fractions', 'What a Fraction Means') and p.get_attribute('#ladView', 'data-level') == '4', last())
    ok('"what level am I" answers', say('what level am i', 'you are on level 1 of 27'))
    ok('"level three" jumps to level 3', say('level three', 'level 3') and p.get_attribute('#ladView', 'data-level') == '3')
    say('go to fractions', 'What a Fraction Means')
    ok('spoken lesson: picture + quick check asked out loud', say('lesson', 'Quick check', 60000) and heard('pizza') and p.evaluate('LL && !!LL.wait'), last())
    ok('quick check answered "three fourths" -> Yes', say('three fourths', 'Yes!', 30000) and heard('Quick check', 60000), last())
    ok('quick check answered "one sixth" (as "1/6") -> Yes, lesson ends', say('1/6', 'Yes!', 30000) and heard('That is the lesson', 60000), last())
    ok('"start" begins a set of spoken questions (no letters read)', say('start', 'Say the answer.') and p.evaluate('LR && LR.n') == 4)
    ok('a non-number twice: short line, then what it heard + the question once (no loop)', say('purple', 'Say the answer as a number') and say('purple', 'I heard "purple". I need a number'), last())
    allok = True; extra = False; slow = False
    for k in range(10):
        q = p.evaluate('LR.qs[LR.i]'); v = q['value']; sa = q['sayAnswer']
        spoken = sa if k % 3 == 0 else (v if k % 3 == 1 else 'um ' + sa)
        if k == 2: spoken = 'nine||' + sa      # a wrong first alternative: the right one in the list still counts
        if not say(spoken, 'another one like this'): allok = False; break
        if k == 0: slow = say('explain again slower', 'Say next, or another one like this', 40000)
        if k == 1:
            n0 = p.evaluate('LR.qs.length'); extra = say('another one like this', 'Say the answer.') and p.evaluate('LR.qs.length') == n0 + 1 and p.evaluate('LR.qs[LR.i].extra')
            q = p.evaluate('LR.qs[LR.i]'); say(q['sayAnswer'], 'another one like this')
        if not say('next', 'Say the answer.' if k < 9 else 'Say start for level'): allok = False; break
    ok('"explain again slower" re-reads the steps slowly', slow)
    ok('"another one like this" adds an extra question that does not count', extra)
    st = p.evaluate("JSON.parse(localStorage.getItem('asvab.ladder'))")
    ok('spoken answers ("three fourths", "3/4", "um ...") pass level 4 and move to 5', allok and st and st['passed'].get('4') and st['level'] == 5 and st['best']['4'] == 10, [st, last()])
    ok('"what level am I" now says level 5', say('what level am i', 'level 5 of 27'))
    say('math ladder', 'Arithmetic Reasoning: Level 5 of 27')
    ok('"real test questions" opens the 85 real AR questions', say('real test questions', 'Say start to begin') and p.locator('#arRealNote').count() == 1 and 'Arithmetic Reasoning' in p.inner_text('h1'))
    say('home', 'Say a section name')
    # ---- learn by ear: speed drills ----
    ok('"speed drills" opens drills', say('speed drills', 'Say times tables') and 'Speed drills' in p.inner_text('h1'))
    say('timer on', 'Timer on')
    ok('"times tables" starts and reads a fact', say('times tables', '?') and p.evaluate('!!DR && DR.timer'))
    def drill_q():   # wait until the next fact is on screen and has been read out, then return its answer
        until("DR && !DR.answered && window.__spoken.length && window.__spoken[window.__spoken.length - 1] === DR.qs[DR.i].q + '?'", 20000)
        return p.evaluate('DR.qs[DR.i].a')
    good = True
    for k in range(10):
        a = drill_q()
        if k == 3: ok('drill: a wrong answer gets a short reason', say(str(a + 1), 'Not quite')); continue
        if k == 5:
            mark['i'] = p.evaluate('window.__spoken.length'); ok('drill: no answer -> "Time." and the reason (answer timer)', heard('Time.', 20000)); continue
        if not say(('x equals ' if k == 7 else '') + str(a), 'Right.' if k < 9 else 'You got'): good = False
    ok('drill: 8 of 10 by voice', good and heard('You got 8 of 10', 20000) and p.evaluate("JSON.parse(localStorage.getItem('asvab.drill')).best.times") == 8, last())
    good = True
    say('again', '?')
    for k in range(10):
        a = drill_q()
        if not say(str(a), 'Right.' if k < 9 else 'You got'): good = False
    ok('drill: 10 fast -> the timer gets a little faster', good and heard('The timer is now 9.5 seconds', 20000) and p.evaluate("JSON.parse(localStorage.getItem('asvab.drill')).limit") == 9.5, last())
    say('home', 'Say a section name')
    # ---- vocab by ear ----
    ok('"vocab by ear" says a word, meaning and hook, then asks', say('vocab by ear', 'Now you say it') and heard('Memory hook'))
    w = p.evaluate('VQ.w')
    ok('saying the meaning back counts', say('it means ' + w[2][0], 'Yes!') and heard('Next word', 20000))
    ok('"I do not know" gives the meaning again', say("i don't know", 'You will hear it again soon'))
    say('home', 'Say a section name')
    # ---- audio lessons (listen only) ----
    ok('"audio lessons" opens the listen-only player', say('audio lessons', 'Say play to start') and 'Audio lessons' in p.inner_text('h1'))
    ok('"play" starts at his level and keeps talking with no answers needed', say('play', 'Level 5: Halves and Quarters') and heard('quarter', 30000) and until('AL.j >= 3', 30000), last())
    say('so then he told me the meeting is at noon back in the office'); p.wait_for_timeout(1500)
    ok('background talk does not navigate away', 'Audio lessons' in p.inner_text('h1'))
    ok('"next lesson" jumps ahead', say('next lesson', 'means') and p.evaluate('AL.i') == 1, last())
    ok('"pause" pauses, "resume" goes on', say('pause', 'Paused') and p.evaluate('HF.paused') and say('resume') and until('!HF.paused') and heard('.', 20000))
    ok('"repeat that" replays a line', say('repeat that') and heard('.', 20000))
    ok('"stop" stops playing', say('stop', 'Stopped') and not p.evaluate('AL.playing'))
    say('home', 'Say a section name')
    # ---- read along ----
    ok('"read along" shows big text', say('read along', 'Say listen') and p.locator('.read-big').count() >= 1)
    say('listen', 'Say my turn', 60000)
    txt = p.evaluate('RA.text.text'); words = txt.split(); read = ' '.join(words[:3] + words[4:])   # he skips one word
    ok('"my turn" listens to him read', say('my turn', 'Go ahead'))
    ok('reading is scored: words correct per minute + accuracy, and saved', say(read, 'words correct per minute', 30000) and p.evaluate("JSON.parse(localStorage.getItem('asvab.reading')).slice(-1)[0].correct") == len(words) - 1, last())
    say('home', 'Say a section name')
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
