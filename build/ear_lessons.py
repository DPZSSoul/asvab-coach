"""Spoken lessons for Electronics Information (mental pictures) and Test-day tips.
Each quick check is answered by saying a number. `chk` is a sympy expression written straight from the question;
this script checks chk == v for every check, then writes earlessons.js. build/validate.py re-checks the output.
Tip lessons list the claim sources (see SOURCES.md)."""
import json, os
import sympy as sp
from fractions import Fraction as F
S = lambda x: ('say', x)
def C(q, a, v, chk, why): return ('check', q, a, v, chk, why)
EI = [
 ('ei-1', 'Electricity is water in a pipe', ['ei-basics'], [
  S('Picture a water tank with a hose coming out of the bottom.'),
  S('Voltage is the push. It is like water pressure in the hose. More pressure pushes the water harder. Voltage is measured in volts.'),
  S('Current is the flow. It is how much water moves past one spot each second. Current is measured in amps.'),
  S('Resistance is a narrow spot in the hose. A narrow spot fights the flow. Resistance is measured in ohms.'),
  S('So remember: more push, more flow. More narrow, less flow.'),
  S('Two batteries stacked end to end are like two pumps in a row. Their pushes add up.'),
  C('Two batteries of 1 and a half volts each are stacked end to end. How many volts in all? Say the number.', '3 volts', '3', '3/2 + 3/2', 'One and a half plus one and a half is 3. Pushes in a row add up.'),
  C('A narrow spot has 5 ohms. You make it twice as narrow, so the resistance doubles. How many ohms now? Say the number.', '10 ohms', '10', '2*5', 'Double 5 is 10 ohms. More narrow means more resistance, and less flow.'),
 ]),
 ('ei-2', "Ohm's law as a triangle", ['ei-ohms-law'], [
  S("Ohm's law says V equals I times R. V is volts, the push. I is amps, the flow. R is ohms, the narrow spot."),
  S('Picture a triangle. V sits on top. I and R sit side by side on the bottom.'),
  S('Cover the one you want with your thumb. Cover V, and you see I next to R. Side by side means multiply.'),
  S('Cover I, and you see V over R. Over means divide. So amps equal volts divided by ohms.'),
  S('Cover R, and you see V over I. So ohms equal volts divided by amps.'),
  C('A 12 volt battery is hooked to a 4 ohm resistor. How many amps flow? Say the number.', '3 amps', '3', '12/4', 'Cover I. You see V over R. 12 divided by 4 is 3 amps.'),
  C('2 amps flow through a 6 ohm resistor. How many volts? Say the number.', '12 volts', '12', '2*6', 'Cover V. You see I times R. 2 times 6 is 12 volts.'),
  C('A heater pulls 10 amps from 120 volts. How many ohms is it? Say the number.', '12 ohms', '12', '120/10', 'Cover R. You see V over I. 120 divided by 10 is 12 ohms.'),
 ]),
 ('ei-3', 'Series and parallel: one lane or many lanes', ['ei-series-parallel'], [
  S('Series means one lane. Picture a one lane road with toll booths in a row. Every car must go through every booth.'),
  S('In series, the same current goes through every part. The resistances add up: 4 ohms plus 6 ohms is 10 ohms.'),
  S('And if one part breaks, the lane is blocked. Old holiday lights went dark when one bulb broke. That is series.'),
  S('Parallel means many lanes side by side. The traffic splits, and each lane carries part of it.'),
  S('More lanes means it is easier to get through. So in parallel, the total resistance goes down.'),
  S('Two equal resistors in parallel give half of one. Two 10 ohm resistors in parallel give 5 ohms.'),
  S('Your house is wired in parallel. That is why one lamp can be off while the others stay on.'),
  C('A 4 ohm and a 6 ohm resistor are in series. What is the total, in ohms? Say the number.', '10 ohms', '10', '4+6', 'Series is one lane. Resistances add: 4 plus 6 is 10.'),
  C('Two 10 ohm resistors are in parallel. What is the total, in ohms? Say the number.', '5 ohms', '5', '1/(Rational(1,10)+Rational(1,10))', 'Two equal resistors in parallel give half of one. Half of 10 is 5.'),
  C('Three bulbs are in series. One bulb burns out. How many bulbs stay lit? Say the number.', '0', '0', '0', 'Series is one lane. One break blocks the whole lane, so all 3 go dark. The answer is 0.'),
 ]),
 ('ei-4', 'Power: push times flow', ['ei-power'], [
  S('Picture water turning a water wheel. The wheel does more work when the push is strong and the flow is big.'),
  S('Power works the same way. Power equals volts times amps. P equals V times I. Power is measured in watts.'),
  S('You can use a triangle again. P on top, V and I on the bottom. Cover what you want.'),
  S('Your power bill counts kilowatt hours. 1 kilowatt is 1000 watts. 1000 watts for 1 hour is 1 kilowatt hour.'),
  C('A tool uses 120 volts and 2 amps. How many watts? Say the number.', '240 watts', '240', '120*2', 'P equals V times I. 120 times 2 is 240 watts.'),
  C('A 60 watt bulb runs on 120 volts. How many amps does it pull? Say the number.', '1 half of an amp', '1/2', 'Rational(60,120)', 'Cover I. You see P over V. 60 divided by 120 is 1 half. That is point 5 amps.'),
  C('A 1000 watt heater runs for 3 hours. How many kilowatt hours? Say the number.', '3 kilowatt hours', '3', '1000*3/1000', '1000 watts is 1 kilowatt. 1 kilowatt for 3 hours is 3 kilowatt hours.'),
 ]),
 ('ei-5', 'AC and DC', ['ei-ac-dc'], [
  S('DC means direct current. It flows one way only, like water running downhill from a tank. Batteries give DC.'),
  S('AC means alternating current. It flips back and forth, like a saw going push, pull, push, pull. Wall outlets give AC.'),
  S('In the United States, wall power flips 60 times each second. That is 60 hertz. Hertz means cycles per second.'),
  S('A normal wall outlet in the United States gives about 120 volts.'),
  S('Why AC for houses? Its voltage is easy to raise and lower with a transformer, so power can travel far on the lines.'),
  C('How many cycles each second does wall power make in the United States? Say the number.', '60', '60', '60', 'United States wall power is 60 hertz. That means 60 cycles each second.'),
  C('About how many volts does a normal United States wall outlet give? Say the number.', '120 volts', '120', '120', 'A normal outlet gives about 120 volts. Big things like dryers use 240.'),
 ]),
 ('ei-6', 'Conductors and insulators', ['ei-materials'], [
  S('A conductor lets electricity move through it easily. Picture a wide, smooth pipe.'),
  S('Good conductors are metals: silver, copper, gold, and aluminum. Silver is the best, but it costs too much. So most wire is copper.'),
  S('An insulator blocks electricity. Picture a pipe packed with clay. Rubber, glass, plastic, and dry wood are insulators.'),
  S('A wire is copper inside, for the flow, and plastic outside, to keep the flow in and keep you safe.'),
  S('In between are semiconductors, like silicon. They are used to make computer chips.'),
  S('For wire size, a smaller gauge number means a thicker wire. 12 gauge is thicker than 14 gauge, and it can carry more current.'),
  C('Copper, rubber, aluminum, and glass. How many of these are conductors? Say the number.', '2', '2', '2', 'Copper and aluminum are metals, so they conduct. Rubber and glass are insulators. That is 2.'),
  C('Which wire is thicker, 12 gauge or 14 gauge? Say the gauge number.', '12 gauge', '12', '12', 'A smaller gauge number means a thicker wire. So 12 gauge is thicker.'),
 ]),
 ('ei-7', 'Common parts in a circuit', ['ei-components'], [
  S('A resistor is the narrow spot. It limits current.'),
  S('A capacitor is like a small water tank. It fills up with charge and empties again. It is measured in farads.'),
  S('Capacitors side by side, in parallel, add up, like tanks side by side holding more water.'),
  S('A diode is a one way valve. Current can go through it in one direction only. An LED is a diode that gives off light.'),
  S('A transistor is a valve that a small current can open or close. It works as a switch or an amplifier.'),
  S('A fuse is a weak link. If too much current flows, it melts and opens the circuit, to protect the wires. A circuit breaker does the same job, and you can reset it.'),
  S('A switch opens or closes the path. Open means off. Closed means on.'),
  C('A diode is a one way valve. In how many directions can current flow through it? Say the number.', '1 direction', '1', '1', 'A diode lets current through one way only. So 1.'),
  C('A 10 microfarad and a 20 microfarad capacitor are in parallel. How many microfarads in all? Say the number.', '30 microfarads', '30', '10+20', 'Capacitors in parallel add, like tanks side by side. 10 plus 20 is 30.'),
  C('A circuit normally pulls 8 amps. You have fuses rated 5, 10, and 30 amps. What is the smallest fuse that will not blow? Say the number.', '10 amps', '10', 'Min(10,30)', 'A 5 amp fuse would melt at 8 amps. 10 is the smallest one above 8. 30 would not protect the wire well.'),
 ]),
 ('ei-8', 'Magnets and coils', ['ei-magnetism'], [
  S('Every magnet has 2 poles, a north pole and a south pole.'),
  S('Opposite poles pull together. Like poles push apart. North pulls south. North pushes north.'),
  S('If you cut a magnet in half, each piece still gets its own north and south pole.'),
  S('Current in a wire makes a magnetic field around it. Wrap the wire in a coil around iron, and you get an electromagnet. Turn off the current, and the magnet turns off.'),
  S('It works the other way too. Move a magnet near a coil, and current flows. That is how a generator works.'),
  S('A transformer has two coils. The voltage changes by the turns. Half the turns out means half the volts out.'),
  C('How many poles does every magnet have? Say the number.', '2 poles', '2', '2', 'Every magnet has a north pole and a south pole. That is 2.'),
  C('You cut a bar magnet in half. How many poles does each piece have? Say the number.', '2 poles', '2', '2', 'Each piece makes its own north and south pole. So still 2.'),
  C('A transformer has 100 turns in and 50 turns out. 120 volts go in. How many volts come out? Say the number.', '60 volts', '60', '120*50/100', 'Half the turns out means half the volts. Half of 120 is 60.'),
 ]),
]
# Test-day tips. src keys point to SOURCES.md entries.
TIPS = [
 ('tip-1', 'Answer each question. There is no going back.', ['cat-applicants', 'cat-recruiters', 'fact-sheet'], [
  S('On the computer test, called the CAT-ASVAB, you see one question at a time.'),
  S('Once you answer and move on, you cannot go back and change it. So read each question with care before you pick.'),
  S('Each part has a time limit. The screen shows the time and the questions left, in the lower right corner.'),
  S('If time runs out, the questions you did not reach are scored as if you had guessed at random. That lowers your score.'),
  S('So keep a steady pace and answer every question. If time is almost gone, keep answering as well as you can. The official fact sheet says careful answers beat random guesses.'),
  C('How many times can you go back and change an answer on the computer test? Say the number.', '0', '0', '0', 'Zero. Once you move on, the answer is locked in.'),
 ]),
 ('tip-2', 'Harder questions are a good sign', ['cat-applicants', 'cat-recruiters', 'faqs'], [
  S('The computer test adapts to you. Everyone starts with a question of medium difficulty.'),
  S('If you get one right, the next one is usually harder. If you miss one, the next one is usually easier.'),
  S('So if the questions feel hard, that often means you are doing well. Do not panic. Stay steady.'),
  S('Scores are linked so they mean the same thing for everyone, even though people get different questions.'),
  C('You get a question right. Is the next one usually easier or harder? Say 1 for easier, or 2 for harder.', '2, harder', '2', '2', 'A right answer usually brings a harder question. Harder is a good sign.'),
 ]),
 ('tip-3', 'Pacing for each part', ['cat-applicants', 'what-to-expect'], [
  S('Here are the real limits, for the parts that count for Navy IT.'),
  S('General Science: 15 questions in 12 minutes. That is about 48 seconds each.'),
  S('Arithmetic Reasoning: 15 questions in 55 minutes. That is more than 3 minutes each. Use that time. Write your work down.'),
  S('Word Knowledge: 15 questions in 9 minutes. That is about 36 seconds each. Move fast. You know it or you do not.'),
  S('Paragraph Comprehension: 10 questions in 27 minutes. That is about 2 and a half minutes each.'),
  S('Math Knowledge: 15 questions in 31 minutes. That is about 2 minutes each.'),
  S('Electronics Information: 15 questions in 10 minutes. That is 40 seconds each.'),
  S('Do not spend too long on one question. Almost everyone finishes before time runs out, so a steady pace works.'),
  S('Some people get extra tryout questions that do not count. When that happens, the time limit is longer too.'),
  C('How many minutes do you get for Arithmetic Reasoning? Say the number.', '55 minutes', '55', '55', 'Arithmetic Reasoning gives 55 minutes for 15 questions. Take your time and write it out.'),
  C('Word Knowledge has 15 questions in 9 minutes. How many minutes is that? Say the number.', '9 minutes', '9', '9', 'Only 9 minutes for 15 words. Answer and move on.'),
 ]),
 ('tip-4', 'Rule out wrong answers', ['preparing'], [
  S('When you do not know the answer, do not just guess. First rule out the choices you know are wrong.'),
  S('Look for a choice that is too big, too small, or does not answer the question. Cross it off in your head.'),
  S('Then pick the best one from what is left. Each choice you rule out makes a good guess more likely.'),
  C('There are 4 choices. You rule out 2. How many choices are left? Say the number.', '2', '2', '4-2', '4 minus 2 is 2. Now you pick from 2, not 4.'),
 ]),
 ('tip-5', 'Paragraphs: read the question first', ['preparing', 'coach'], [
  S('This one is a coach tip. For Paragraph Comprehension, read the question before you read the passage.'),
  S('Then you know what to look for. Main idea? A detail? A word meaning?'),
  S('Read the passage once, looking for that. Then go back to the exact line that answers it.'),
  S('The right answer must be backed up by the passage, not by what you already know.'),
 ]),
 ('tip-6', 'Scratch paper, no calculator, and units', ['what-to-expect', 'faqs', 'cat-recruiters', 'preparing'], [
  S('You cannot use a calculator on the ASVAB. The test wants to see if you can do the math by hand.'),
  S('At the testing station you get scratch paper and a pencil. If you need more, press the HELP key. The clock stops while you get help.'),
  S('Use the paper on every math question. Write the numbers down. Draw a quick picture. It keeps you from mixing things up.'),
  S('Check your units. If the question asks for inches and you worked in feet, change it before you answer.'),
  C('A board is 2 feet long. How many inches is that? Say the number.', '24 inches', '24', '2*12', '1 foot is 12 inches. 2 times 12 is 24 inches.'),
 ]),
 ('tip-7', 'The day before and the day of', ['preparing', 'what-to-expect', 'coach'], [
  S('Get plenty of rest the night before. That is official advice.'),
  S('Bring valid identification. You need it to get into the testing room.'),
  S('Do not be late. If you are late, you will be turned away and have to reschedule.'),
  S('Coach tip: eat a normal meal before you go, so hunger does not pull your mind away. Ask your recruiter what else to bring.'),
  S('Your recruiter may drive you there, but cannot come into the testing room.'),
 ]),
 ('tip-8', 'Stay calm', ['coach', 'cat-applicants'], [
  S('Coach tip: if you feel stuck or nervous, take one slow breath in, and one slow breath out.'),
  S('One hard question does not ruin a test. The test adapts, and the next one may be easier.'),
  S('Read the question again, slowly. Ask: what is it really asking? Then do one small step.'),
  S('You have practiced this. Trust your steps.'),
 ]),
 ('tip-9', 'Ask your recruiter about accommodations', ['what-to-expect', 'accommodations'], [
  S('You learn best by listening, and that is OK. Ask your recruiter if any testing accommodations are possible for you.'),
  S('Be ready for the answer to be no. The official ASVAB pages list no accommodations for the enlistment test, and other sources say tests taken with accommodations cannot be used to enlist.'),
  S('So the safest plan is to practice under the real time limits, the way this app does in MEPS mode and the weekly test.'),
  S('Also tell your recruiter the truth about your school history and health. The official site says to answer those questions openly and honestly.'),
 ]),
]
x = sp.Symbol('x')
def val(e): return sp.nsimplify(sp.sympify(e, locals={'Rational': sp.Rational, 'Min': sp.Min}))
out = {'ei': [], 'tips': []}; nchk = 0
for key, group in (('ei', EI), ('tips', TIPS)):
    for lid, title, tags, steps in group:
        L = {'id': lid, 'title': title, ('topics' if key == 'ei' else 'src'): tags, 'steps': []}
        for st in steps:
            if st[0] == 'say': L['steps'].append({'t': 'say', 'x': st[1]})
            else:
                _, q, a, v, chk, why = st
                got = val(chk); want = sp.Rational(F(v).numerator, F(v).denominator)
                assert got == want, (lid, q, chk, got, v); nchk += 1
                L['steps'].append({'t': 'check', 'q': q, 'a': a, 'v': v, 'chk': chk, 'why': why})
        assert sum(1 for s in L['steps'] if s['t'] == 'check') >= (1 if key == 'ei' else 0), lid
        out[key].append(L)
assert len(out['ei']) == 8 and all(any(s['t'] == 'check' for s in L['steps']) for L in out['ei'])
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
open(os.path.join(R, 'earlessons.js'), 'w').write('window.ASVAB_EAR=' + json.dumps(out, ensure_ascii=False) + ';\n')
print('ei lessons', len(out['ei']), 'tip lessons', len(out['tips']), 'checks verified', nchk)
