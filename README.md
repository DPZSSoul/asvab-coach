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
python3 build/make_single.py    # writes asvab-coach.html
python3 tests/e2e.py            # Playwright end-to-end tests (needs a running server on :8765)
python3 tests/voice_e2e.py      # voice-only run with a fake recognizer and noisy transcripts
node tests/speech_unit.js       # spoken-answer parser unit tests
```

Questions are original practice items written in the ASVAB style. They are not real ASVAB questions.
