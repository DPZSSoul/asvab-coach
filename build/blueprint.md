# ASVAB Coach blueprint (realism audit, 2026-10-17)

This file says what the real test covers and how the app's question bank is built to match it.
Every official fact below has a source link. All questions in the app are original. No official
sample items were copied. Official samples were read only to match style and level.

## What the official sources say, and what they do NOT say

- **Official content areas:** published (sources below).
- **Official share of questions per content area:** NOT published. DoD says only that every form is
  "constructed to the same test content specifications" and balanced by "content taxonomy"
  (Technical Bulletin No. 2). The exact percentages are not public.
  So the "app target %" below is our own estimate, made to cover every official area evenly.
  It is labeled "app target", never "official".
- **Reading level:** official. WK words "are often found in books used by high school students".
  PC passages are "generally written for a target audience of 10th graders" (CEP Technical Chapter).

## Sources

1. officialasvab.com, What to Expect (CAT-ASVAB counts and time limits, order of subtests):
   https://www.officialasvab.com/applicants/what-to-expect/
2. officialasvab.com, The CAT-ASVAB (adaptive branching; time-out penalty "scoring the items that were not
   completed as though they were answered at random"): https://www.officialasvab.com/applicants/cat-asvab/
3. officialasvab.com, Understanding ASVAB Scores (standard score scale: about half score 50 or more, about 16% score 60 or more;
   AFQT from AR, MK, PC, WK, as a 1-99 percentile; AFQT categories): https://www.officialasvab.com/applicants/scores/
4. officialasvab.com, Sample Questions, one page per subtest (style only):
   https://www.officialasvab.com/general-science-gs/ , https://www.officialasvab.com/arithmetic-reasoning-ar/ ,
   https://www.officialasvab.com/word-knowledge-wk/ , https://www.officialasvab.com/paragraph-comprehension-pc/ ,
   https://www.officialasvab.com/mathematics-knowledge-mk/ , https://www.officialasvab.com/electronics-information-ei/
5. ASVAB Fact Sheet (CAT has a penalty for random guessing; no going back): https://www.officialasvab.com/wp-content/uploads/2025/04/ASVAB-Fact_Sheet.pdf
6. ASVAB CEP Technical Chapter (content areas for each test; reading level):
   https://prod-media.asvabprogram.com/CEP_PDF_Contents/ASVAB_CEP_Technical_Chapter.pdf
7. ASVAB Technical Bulletin No. 2, CAT-ASVAB Forms 3 and 4 (AFQT = 2VE + AR + MK; same content specs for all forms;
   GS factor structure: life/biological, physical/earth-space, chemistry):
   https://www.officialasvab.com/wp-content/uploads/2019/08/asvab_techbulletin_2.pdf
8. MyNavyHR, IT rating page (entry line scores):
   https://www.mynavyhr.navy.mil/Career-Management/Community-Management/Enlisted/Information-Warfare/IT/

## Timing (official, proctored CAT-ASVAB, scored items, no tryout items) [1]

| Order | Subtest | Questions | Minutes | App pace per question |
|---|---|---|---|---|
| 1 | General Science (GS) | 15 | 12 | 48 s |
| 2 | Arithmetic Reasoning (AR) | 15 | 55 | 3 min 40 s |
| 3 | Word Knowledge (WK) | 15 | 9 | 36 s |
| 4 | Paragraph Comprehension (PC) | 10 | 27 | 2 min 42 s |
| 5 | Mathematics Knowledge (MK) | 15 | 31 | about 2 min 4 s |
| 6 | Electronics Information (EI) | 15 | 10 | 40 s |

With tryout items the limits are longer (GS 25, AR 113, WK 18, PC 75, MK 65, EI 21 minutes) [1].
The app uses the no-tryout limits (the stricter ones).

Test rules the app copies [2][5]: adaptive (right answer means a harder next item, wrong means easier),
no going back, no calculator, and if time runs out the unfinished items are scored as random guesses.

## Navy IT entry rules (MyNavyHR, checked 2026-10-17) [8]

IT/SG (4-year): AR+MK+EI+VE >= 212, or VE+MK+GS >= 156, or CT+MK+VE >= 156 AND CT >= 60.
IT/ATF (6-year): VE+AR+MK+GS >= 214, or VE+MK+GS >= 156, or CT+MK+VE >= 156 AND CT >= 60.
Also: normal color vision, normal hearing, no speech impediment, SSBI eligible, U.S. citizen.
AFQT = 2VE + AR + MK [7]. The Navy minimum AFQT of 31 (diploma) comes from the study pack research notes, not from these pages.
VE is a scaled mix of WK and PC. The exact VE formula is not public.

## Per subtest

Difficulty in the app: 1 = easy, 2 = medium, 3 = hard. The real CAT pulls from "very easy to very hard" [2].
The app's adaptive mode moves the level up above 80% and down below 60%.

### General Science (GS): "Knowledge of physical and biological sciences" [1]
Official areas [6]: life science (botany, zoology, anatomy and physiology, ecology); earth and space science
(astronomy, geology, meteorology, oceanography); physical science (force and motion, energy, fluids, atomic structure, chemistry).
Style [4]: short fact question or sentence completion ("Salt helps melt ice because it ..."), 4 choices, little or no math.

| App topic | Official area | App target |
|---|---|---|
| gs-human-body | life: anatomy and physiology | 14% |
| gs-cells-life | life: botany, zoology, ecology, cells | 20% |
| gs-earth-space | earth and space: astronomy, geology, meteorology, oceanography | 26% |
| gs-chemistry | physical: atomic structure, chemistry | 18% |
| gs-physics | physical: force and motion, energy, fluids | 22% |

### Arithmetic Reasoning (AR): "Ability to solve arithmetic word problems" [1]
Official areas [6]: one-step and multi-step word problems; whole numbers; rational numbers (fractions, decimals);
ratio and proportion; interest and percentage; measurement; order of operations.
Style [4]: every item is a short real-life word problem ("A tire turns 552 times a minute ..."). No bare computation.

| App topics | Official area | App target |
|---|---|---|
| ar-money, ar-number | whole numbers, multi-step | 15% |
| ar-fractions, ar-average | rational numbers | 15% |
| ar-ratio, ar-rate, ar-work | ratio and proportion (rates, work) | 35% |
| ar-percent, ar-interest | interest and percentage | 25% |
| ar-units, ar-geometry | measurement | 10% |

### Word Knowledge (WK): "select the correct meaning of a word presented in context and identify the best synonym" [1]
Official style [4]: mostly "WORD most nearly means" with one-word choices, plus some items with the word in a sentence.
Level: high-school reading words [6].

| App topic | Style | App target |
|---|---|---|
| wk-synonym | "WORD most nearly means" | about 60% |
| wk-context | word in a sentence | about 40% |

### Paragraph Comprehension (PC): "Ability to obtain information from written passages" [1]
Official skills [6]: stated and reworded facts; sequence of events; drawing conclusions; main idea; author's purpose and tone;
style and technique. Passages are 10th-grade level [6] and vary in length.
Style [4]: a passage of 2 to 6 sentences, then "According to the passage ...", "The author implies ...",
"The word X refers to ...". On the CAT most passages have one question.

| App topic | Official skill | App target |
|---|---|---|
| pc-detail | stated and reworded facts | 30% |
| pc-inference | drawing conclusions | 22% |
| pc-main-idea | main idea | 18% |
| pc-vocab | word or phrase in context (style and technique) | 12% |
| pc-author | author's purpose and tone | 12% |
| pc-sequence | sequence of events | 6% |

### Mathematics Knowledge (MK): "Knowledge of high school mathematics principles" [1]
Official areas [6]: number theory, numeration, algebraic operations and equations, geometry and measurement, probability.
Style [4]: short bare math items (a root, a volume, simplifying a fraction with variables, ratios).

| App topics | Official area | App target |
|---|---|---|
| mk-number, mk-fractions | number theory, numeration | 20% |
| mk-exponents | numeration (powers, roots, scientific notation) | 12% |
| mk-equations, mk-inequalities, mk-systems, mk-polynomials, mk-quadratics, mk-functions | algebraic operations and equations | 38% |
| mk-area-volume, mk-triangles-angles, mk-slope | geometry and measurement | 25% |
| mk-probability | probability | 5% |

### Electronics Information (EI): "Knowledge of electricity and electronics" [1]
Official areas [6]: electrical circuits; electrical and electronic systems; electrical currents; electrical tools,
symbols, devices, and materials.
Style [4]: short fact questions ("Which is measured with an ohmmeter?", "What does AC stand for?"), simple circuit math,
and why a part behaves as it does. The real test shows circuit drawings. The app writes circuits in words instead.

| App topic | Official area | App target |
|---|---|---|
| ei-basics | electrical currents: current, voltage, resistance, units | 12% |
| ei-ohms-law | electrical circuits: Ohm's law | 10% |
| ei-power | electrical circuits: power | 10% |
| ei-series-parallel | electrical circuits: series and parallel (incl. series/parallel Ohm's law) | 18% |
| ei-ac-dc | electrical currents: AC and DC | 10% |
| ei-components | devices: resistor, capacitor, diode, transistor, transformer, fuse, relay | 15% |
| ei-symbols-tools | tools and symbols: meters, schematic symbols in words, color code | 12% |
| ei-magnetism | systems: magnetism, motors, generators, induction | 7% |
| ei-materials | materials: conductors, insulators, semiconductors | 6% |

## Audit rules applied to the bank

1. AR: every item must be a word problem. Bare computation items were rewritten as word problems.
   A probability item was moved to MK (probability is an MK area).
2. WK: changed to about 60% "most nearly means" and 40% in context, to match the official samples.
3. PC: new passages were added for inference, author purpose/tone, sequence and vocabulary in context. Some extra detail
   items were removed to fix the balance. More passages are written at a 10th-grade level and marked difficulty 3.
4. GS: added oceanography, meteorology, astronomy, fluids, ecology and genetics, which were missing or thin.
   Exact duplicates were removed. Every keyed fact was re-checked.
5. All AR, MK and EI math is re-checked with Python by `build/validate.py` (sympy, exact fractions, and an independent EI formula check).
6. The app's content shares are checked against the "app target" tables above (within +/- 10 points) by the validator.
