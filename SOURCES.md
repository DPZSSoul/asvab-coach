# Sources for the test-day tips

Checked on 2026-10-18 against officialasvab.com. Each tip lesson in `build/ear_lessons.py` lists the keys below.
Tips marked **coach tip** are study advice, not official rules, and the app says so out loud.

| Key | Source | What it supports |
|---|---|---|
| cat-applicants | officialasvab.com, "The CAT-ASVAB" (applicants): https://www.officialasvab.com/applicants/cat-asvab/ | Adaptive: a right answer usually brings a harder item, a wrong one an easier item. Unfinished items at time-out are scored as though answered at random. Nearly all examinees finish each subtest. Scored questions and time limits per subtest (GS 15/12, AR 15/55, WK 15/9, PC 10/27, MK 15/31, EI 15/10), and longer limits when tryout questions are given. |
| cat-recruiters | officialasvab.com, "The CAT-ASVAB" (recruiters): https://www.officialasvab.com/recruiters/cat-asvab/ | All examinees start with a medium question. Answers cannot be changed after moving on. Red HELP key for more scratch paper or another pencil; the subtest clock stops during HELP and instructions. |
| fact-sheet | officialasvab.com, ASVAB Fact Sheet (PDF): https://www.officialasvab.com/wp-content/uploads/2025/04/ASVAB-Fact_Sheet.pdf | You cannot review or change answers on the CAT-ASVAB. If running out of time, keep answering as best you can rather than filling in random guesses, since the CAT-ASVAB has a penalty for guessing. |
| what-to-expect | officialasvab.com, "What to Expect When You Take the ASVAB": https://www.officialasvab.com/applicants/what-to-expect/ | Bring valid identification to be admitted. Latecomers are turned away and must reschedule. The recruiter may drive you but may not enter the testing room. No calculator. Time and questions remaining are shown in the lower right corner. Tryout questions do not count and add time. Answer recruiter screening questions openly and honestly. |
| faqs | officialasvab.com, FAQs: https://www.officialasvab.com/applicants/faqs/ | Why no calculator (hand calculation is assessed). CAT may seem harder or easier because it is tailored; scores are statistically linked. |
| preparing | officialasvab.com, "Preparing for the ASVAB": https://www.officialasvab.com/applicants/preparing-for-the-asvab/ | Get plenty of rest the night before. Read each question carefully. Pay attention to time; do not spend too long on one question. Rule out as many incorrect choices as possible, then make an educated guess. ("Answer the easy questions first and return" and "fill in random guesses" on that page apply to the paper test; the app does not teach them for the CAT.) |
| accommodations | officialasvab.com lists no testing accommodations for the enlistment ASVAB (pages above). Secondary source: Fairfax County Public Schools, ASVAB CEP accommodations consent form (2025): https://www.fcps.edu/system/files/forms/2025-08/asvab-test-accommocations-consent-form-english.pdf | Accommodated (school, Career Exploration Program) tests are paper tests and their results cannot be used for enlistment. The app tells him to ask his recruiter and to expect a "no". |
| coach | Not an official source. | Read the PC question before the passage; eat a normal meal; slow breathing; one hard question does not ruin the test. |

Notes
- The weekly test and MEPS mode use the CAT counts and minutes from `cat-applicants` (the weekly test scales the
  count down by about 0.4 and keeps the same time per question).
- Navy IT line scores (AR+MK+EI+VE 212, VE+MK+GS 156) come from the MyNavyHR IT rating card, as in earlier releases.
  All score numbers in the app are estimates; it says "Estimate only, confirm with a recruiter".
