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

## Features

- 537 original ASVAB-style questions (A-D): AR 85, WK 110, PC 73, MK 90, GS 87, EI 92. Each has difficulty 1-3,
  a topic from the official content areas, and a step-by-step explanation. See `build/blueprint.md` for the
  official sources, formats, timing, and the app's topic-share targets (the DoD does not publish shares).
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
