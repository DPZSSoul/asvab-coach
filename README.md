# ASVAB Coach

A simple, dyslexia-friendly ASVAB study app: Arithmetic Reasoning, Word Knowledge,
Paragraph Comprehension, Math Knowledge, General Science.

Big buttons. High contrast. Large sans-serif text. No italics. Read-aloud on every
question, passage, and choice, with words lit up as they are read.

## Open it

- Web (https, voice answers work in Chrome/Edge): see the GitHub Pages link for this repo.
- One file, offline: open `asvab-coach.html` in any browser.
- Local with AI proxy: `OPENAI_API_KEY=sk-... python3 server.py`, then open http://localhost:8000

## Features

- 391 original ASVAB-style questions (A-D), each with difficulty 1-3, a topic, and step-by-step explanation.
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
