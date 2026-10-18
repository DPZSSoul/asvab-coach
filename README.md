# ASVAB Coach

A simple, dyslexia-friendly ASVAB study app: Arithmetic Reasoning, Word Knowledge,
Paragraph Comprehension, Math Knowledge, General Science, Electronics Information.
Built around the Navy IT line scores (AR+MK+EI+VE 212, VE+MK+GS 156, or the CT rule).

Big buttons. High contrast. Large sans-serif text. No italics. Read-aloud on every
question, passage, and choice, with words lit up as they are read.

## Open it

- Web (https, voice answers work in Chrome/Edge): see the GitHub Pages link for this repo.
- One file, offline: open `asvab-coach.html` in any browser.
- Local with AI proxy: `OPENAI_API_KEY=sk-... python3 server.py`, then open http://localhost:8000

## Hands-free (the main way to use it)

Tap **Start hands-free** once on the home screen. Browsers need that one tap to turn on the mic and the voice.
After that the whole app works by voice: it reads every screen, lesson, passage, question, choice, result,
score, streak, the IT focus plan, and the review of the last 10 misses. Listening pauses while the app talks.

Say things like: "arithmetic", "electronics", "start", "Bravo", "option C", the answer words, "sure / shaky /
guessed", "next", "repeat", "read the passage", "hint", "explain", "skip review", "start MEPS mode", "time left",
"progress", "error log", "tutor", "my last miss", "new question" (dictate a question), "math ladder",
"go to fractions", "level 6", "what level am I", "slower", "faster", "pause", "resume", "back", "home", "help",
"stop hands-free". Quitting MEPS and removing a miss ask "yes or no" first. The app can remember hands-free and
start it by itself next time when the mic is already allowed. A wake word ("coach") is optional in Settings.

## Features

- 537 original ASVAB-style questions (A-D): AR 85, WK 110, PC 73, MK 90, GS 87, EI 92. Each has difficulty 1-3,
  a topic from the official content areas, and a step-by-step explanation. See `build/blueprint.md` for the
  official sources, formats, timing, and the app's topic-share targets (the DoD does not publish shares).
- Arithmetic Reasoning is the catch-up track. Opening AR (tap, or say "arithmetic") goes to your saved level,
  e.g. "Arithmetic Reasoning: Level 6 of 27, Same Fraction, Different Names". 27 audio-first levels: mental
  math, negatives, 12 small fraction steps, decimals and money, percents, ratios, the mystery number in a box,
  one-step and two-step equations, words to an equation, rate, averages, interest, perimeter and area, and an
  A-D ASVAB bridge. Each level has a spoken lesson with quick checks and 4 sets of 10 items (1,080, each checked
  by sympy and by a spoken round trip). You answer by saying the number ("three fourths", "2 point 5",
  "x equals 7", "4 dollars and 50 cents"). 8 of 10 moves you up; two misses in a row send you back one level.
  After each answer: why, "explain again slower", "another one like this". After the bridge level, AR uses the
  85 real-test-level questions in normal adaptive practice. "Real test questions" inside AR opens them any time.
  The "Math ladder" tile and "math ladder" voice command go to the same place. MEPS mode uses the real AR items.
- Learn by ear: audio lessons (listen-only; say pause, resume, next lesson, repeat that), speed drills (times
  tables, halves, percents, mixed; optional answer timer that gets faster), vocab by ear (word, meaning, memory
  hook, then you say it back), and read along (big text read aloud with highlighting, then you read it and get
  words correct per minute and accuracy, tracked over time).
- Voice answers: Chrome mishearings are accepted ("hey", "eh", "a.", "bee", "see", "sea", "the", "dee", "first",
  "letter A", or the answer value). It uses all recognition alternatives and never loops: one short re-prompt,
  then it says what it heard and reads the choices once. Say "what did you hear" for the last transcripts.
- IT focus plan on the home screen and an IT line-score panel (estimate only, confirm with a recruiter).
- New in 2.3 (all by voice too):
  - Weekly practice test (say "weekly test"): 34 questions in the real order and mix (GS 6, AR 6, WK 6, PC 4,
    MK 6, EI 6, the CAT counts x 0.4) with the same time per question as the real test (about 58 minutes).
    A home nudge appears when it is due (every 7 days, or on the chosen weekday, Sunday by default). The report
    reads aloud the estimated IT scores against 212 (AR+MK+EI+VE) and 156 (VE+MK+GS), the points still needed,
    the change since last week, a week-by-week chart, and the 2 subjects to focus on. Estimate only.
  - Today's plan (tap, or say "today's plan"): about 10 minutes. It picks the AR catch-up ladder while you are
    below the bridge, otherwise your weakest IT part. A short audio lesson, 10 questions read to you, then a
    one-minute spoken recap of the misses. It counts toward the daily goal of 10 and the streak.
  - Real-test reading passages (PC section, or say "real test passages"): 13 original passages of 120-135 words,
    31 questions (main idea, detail, inference, word in context, purpose, tone, sequence), all explained.
    Unlocks at 75% on your last 20 PC answers, or by choice ("try it anyway"). Two modes: read-aloud first
    (question, then the passage, with highlighting) and on your own (big text, "Guide me" moving highlight).
  - Electronics by ear (EI section link, Audio lessons, or say "electronics by ear"): 8 spoken lessons built on
    pictures (water in a pipe, the Ohm's law triangle, one lane vs many lanes, P = V x I, AC/DC, conductors,
    parts, magnets). Each ends with quick checks; you say the number.
  - Test-day tips (home tile, Audio lessons, or say "test day tips"): 9 short spoken tips checked against
    officialasvab.com. See `SOURCES.md` for every claim and its source; coach tips are marked.
  - Daily reminder (Settings, or say "remind me at 7 PM"): a notification at your time if you allow it, and a
    banner when you open the app, only on days you have not done 10 questions. While the app is closed it is best
    effort (periodic background sync, where the browser supports it).
- MEPS mode: 6 parts in the real order with official CAT counts and minutes; unanswered items at time-out
  are scored as random guesses, like the real test.
  `questions.json` (also embedded as `questions.js` so it works from file://).
- Practice per section, with a per-question timer at real CAT-ASVAB pace (or off).
- Hands-free voice loop: reads the question, listens for "A", "Bravo", "option C", the answer words,
  "repeat", "next", "hint", then "sure / shaky / guessed".
- Tutor: hint ladder (idea, first step, similar worked example), reveal only after tries.
  Works offline for bank questions. Pasted questions use an OpenAI-compatible API.
- Spaced repetition (Leitner, 5 boxes), adaptive difficulty (>80% up, <60% down),
  confidence ratings, re-learn vs reps topics, error log, daily goal of 10 with a streak.
- Simulated MEPS run with official CAT-ASVAB counts and time limits, plus a clearly labeled estimate.
- PWA (service worker + manifest), export/import of the whole bank and progress.

## AI features (optional)

"Generate more questions" and the pasted-question tutor need an OpenAI-compatible API:
- paste your own key in Settings (stored only in this browser's localStorage, never exported), or
- run `server.py` with `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL`, `OPENAI_MODEL`).
No key is stored in this repo.

## Rebuild and check

```
python3 build/build_bank.py     # needs the study pack at /home/box/asvab-study and sympy
python3 build/build_audio_ladder.py   # writes ladder.js (27 levels x 40 items, sympy-checked)
python3 build/sweep_ladder.py 200     # runs every level's generators over 200 seeds (54,000 items) with sympy
python3 build/validate.py       # counts, 4 choices, answer keys, sympy/arithmetic math checks (runs the sweep too)
python3 build/ear_lessons.py    # writes earlessons.js (EI + test-day tip lessons; every spoken check verified by sympy)
python3 build/pc_real.py        # writes pcreal.js (real-test-level PC passages; checks quotes and word counts)
python3 build/make_single.py    # writes asvab-coach.html
python3 tests/e2e.py            # Playwright end-to-end tests (needs a running server on :8765)
python3 tests/voice_e2e.py      # voice-only run with a fake recognizer and noisy transcripts
python3 tests/features_e2e.py   # 2.3 features by touch (weekly test, plan, PC real, ear lessons, tips, reminders)
python3 tests/features_voice.py # 2.3 features by voice only
node tests/speech_unit.js       # spoken-answer parser unit tests
```

Questions are original practice items written in the ASVAB style. They are not real ASVAB questions.
