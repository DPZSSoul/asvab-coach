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
- Math ladder: the study pack's 15-level catch-up track (place value up to the ASVAB bridge), with a 15-question
  placement check, a spoken lesson per level, and 4 sets of 10 per level (600 items). 8 of 10 moves you up;
  two misses in a row send you back one level for a quick review.
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
python3 build/validate.py       # counts, 4 choices, answer keys, sympy/arithmetic math checks
python3 build/make_single.py    # writes asvab-coach.html
python3 tests/e2e.py            # Playwright end-to-end tests (needs a running server on :8765)
```

Questions are original practice items written in the ASVAB style. They are not real ASVAB questions.
