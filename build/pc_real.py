"""Real-test-level Paragraph Comprehension set: original passages at real ASVAB length (100-150 words), adult
vocabulary, the official question mix (main idea, stated detail, inference, word in context, author's purpose/tone,
sequence). Checks: length, 4 unique choices, valid key, explanation, type mix. Writes pcreal.js."""
import json, os, re, collections, random
P = []
def passage(pid, title, text, qs): P.append((pid, title, ' '.join(text.split()), qs))
def q(kind, stem, choices, ans, why, line):
    return dict(kind=kind, stem=stem, choices=choices, answer=ans, why=why, line=line)
passage('R01', 'Lockout before repairs', """Before a technician repairs a machine, its power must be shut off and locked out. Lockout means placing a
lock on the switch so that no one can turn the machine back on by mistake. Each worker who will touch the machine adds a
personal lock and a tag with his or her name. The machine cannot be restarted until every lock is removed, and only the
person who placed a lock may remove it. Some workers see this as a slow and needless step, especially for a quick job.
However, safety records show that many serious injuries happen during short repairs, when someone assumes the work will
be finished before anyone notices. A few minutes spent on lockout can prevent an accident that ends a career.""", [
 q('main-idea', 'The passage is mainly about', ['how to repair machines quickly', 'why lockout steps protect workers during repairs', 'why workers dislike safety rules', 'how to write a name on a tag'], 1,
   'Every sentence explains what lockout is and why it prevents injuries.', 'A few minutes spent on lockout can prevent an accident that ends a career.'),
 q('detail', 'According to the passage, who may remove a lock?', ['any supervisor', 'the last worker to finish', 'only the person who placed it', 'anyone who has a tag'], 2,
   'The passage says only the person who placed a lock may remove it.', 'only the person who placed a lock may remove it.'),
 q('inference', 'The author would most likely agree that', ['quick jobs do not need lockout', 'lockout matters even for short repairs', 'tags are more important than locks', 'injuries mostly happen during long repairs'], 1,
   'The author says many serious injuries happen during short repairs, so lockout matters even then.', 'many serious injuries happen during short repairs'),
])
passage('R02', 'The Navajo Code Talkers', """During World War II, the United States Marine Corps needed a way to send battlefield messages that the
enemy could not understand. The answer came from the Navajo language, which had no written alphabet at the time and was
spoken by very few people outside the Navajo Nation. Several hundred Navajo men served as Code Talkers. They built a code
inside their own language, using words such as the Navajo term for turtle to mean a tank. In tests, they could encode,
send, and decode a three-line message in about twenty seconds, while the machines of that time often needed thirty
minutes. The code was never broken. For decades their work stayed secret, and the Code Talkers were not widely honored
until many years after the war.""", [
 q('vocab', 'In the passage, the word "decode" most nearly means', ['to turn a coded message back into plain words', 'to hide a message', 'to send a message by radio', 'to forget a message'], 0,
   'The Code Talkers put messages into code and then decoded them, which means turning them back into plain words.', 'encode, send, and decode a three-line message'),
 q('detail', 'How long did the Code Talkers need for a three-line message?', ['about thirty minutes', 'about two minutes', 'about twenty seconds', 'about ten seconds'], 2,
   'The passage says about twenty seconds. Thirty minutes was the time for machines.', 'in about twenty seconds'),
 q('inference', 'The Navajo language was useful for a code mainly because', ['it was easy to write down', 'very few outsiders could understand it', 'machines could translate it', 'it had many words for tanks'], 1,
   'It had no written alphabet and few people outside the Navajo Nation spoke it, so the enemy could not understand it.', 'spoken by very few people outside the Navajo Nation'),
])
passage('R03', 'Counting the thunder', """During a storm, you see a flash of lightning before you hear the thunder, even though both happen at the
same moment. The reason is speed. Light reaches your eyes almost instantly, but sound travels much more slowly, covering
about one mile every five seconds. This difference gives people a simple way to judge distance. When you see a flash,
count the seconds until the thunder arrives, then divide by five. If you count ten seconds, the storm is roughly two miles
away. Weather experts warn that this method should not make anyone feel safe. Lightning can strike ten miles or more from
the center of a storm, so if you can hear thunder at all, you are close enough to be struck and should move indoors.""", [
 q('detail', 'Based on the passage, if you count fifteen seconds between the flash and the thunder, the storm is about', ['one mile away', 'three miles away', 'five miles away', 'fifteen miles away'], 1,
   'Divide the seconds by five. Fifteen divided by five is three miles.', 'count the seconds until the thunder arrives, then divide by five'),
 q('purpose', "The author's main purpose in the last two sentences is to", ['explain why light is faster than sound', 'warn that hearing thunder means you are in danger', 'describe how storms form', 'show that counting seconds is wrong'], 1,
   'The last two sentences warn that lightning can strike far away, so hearing thunder means you should go inside.', 'if you can hear thunder at all, you are close enough to be struck'),
])
passage('R04', 'The minimum payment trap', """Many people believe that paying the minimum amount on a credit card bill keeps them out of trouble. In
fact, the minimum payment is designed to keep an account open, not to clear the debt. Most of a small payment goes toward
interest, so the amount owed shrinks very slowly. A balance of a few thousand dollars, paid only at the minimum, can take
many years to pay off and may cost more in interest than the original purchases. Financial counselors suggest a
different habit. First, pay more than the minimum whenever possible, even if the extra amount is small. Second, pay off
the card with the highest interest rate first. Finally, avoid adding new charges while an old balance remains. These
steps are simple, but they require patience.""", [
 q('main-idea', 'Which sentence best states the main idea of the passage?', ['Credit cards should never be used.', 'Paying only the minimum is costly, and better habits can clear debt faster.', 'Interest rates are the same on every card.', 'Minimum payments are the fastest way to pay off a card.'], 1,
   'The passage explains why minimum payments cost a lot and then gives habits that help.', 'the minimum payment is designed to keep an account open, not to clear the debt'),
 q('sequence', 'According to the counselors, what should a person do after paying more than the minimum?', ['open a new card', 'stop using the card for a year', 'pay off the card with the highest interest rate first', 'pay only the interest'], 2,
   'The steps are first, second, finally. Second comes paying off the highest-rate card.', 'Second, pay off the card with the highest interest rate first.'),
])
passage('R05', 'Phishing', """Phishing is a trick in which an attacker sends a message that looks as if it comes from a trusted source,
such as a bank or a supervisor. The message usually creates a sense of urgency. It may claim that an account will be
closed or that a payment failed, and it asks the reader to click a link or open a file right away. The link often leads
to a fake login page that captures the user's password. Security teams train employees to slow down. They advise
checking the sender's full address, resting the pointer over a link to see where it really goes, and calling the person
directly when a request seems unusual. A single careless click can give an attacker access to an entire network.""", [
 q('vocab', 'In the passage, the word "urgency" most nearly means', ['a need to act quickly', 'a feeling of calm', 'a kind of password', 'a large reward'], 0,
   'The message pushes the reader to click right away, so urgency means a need to act quickly.', 'asks the reader to click a link or open a file right away'),
 q('inference', 'The passage suggests that attackers create urgency in order to', ['help readers protect their accounts', 'make readers act before they think', 'test the speed of a network', 'close old bank accounts'], 1,
   'Security teams train people to slow down, which suggests the rush is meant to stop careful thinking.', 'Security teams train employees to slow down.'),
 q('detail', 'Which step do security teams advise?', ['replying to the message to ask if it is real', 'opening the file to check it', "checking the sender's full address", 'forwarding the message to coworkers'], 2,
   "The passage lists checking the sender's full address as advice.", "checking the sender's full address"),
])
passage('R06', 'Heat illness on the job', """Heat exhaustion can develop when the body loses too much water and salt through sweating. Early signs
include heavy sweating, headache, dizziness, and muscle cramps. A person with heat exhaustion should move to a cool place,
loosen tight clothing, and sip water. If the symptoms are ignored, heat exhaustion can turn into heatstroke, which is a
medical emergency. In heatstroke, the body's cooling system begins to fail. The skin may become hot and dry, and the
person may become confused or pass out. Anyone showing these signs needs emergency help at once. Supervisors on hot job
sites can lower the risk by scheduling heavy work for cooler hours, providing shade, and reminding workers to drink
water before they feel thirsty.""", [
 q('detail', 'Which is a sign of heatstroke rather than heat exhaustion?', ['heavy sweating', 'a headache', 'muscle cramps', 'hot, dry skin and confusion'], 3,
   'Heavy sweating, headache, and cramps are early signs of heat exhaustion. Hot, dry skin and confusion are signs of heatstroke.', 'The skin may become hot and dry, and the person may become confused'),
 q('sequence', 'According to the passage, heatstroke can follow', ['heat exhaustion that is ignored', 'drinking too much water', 'working in the shade', 'loosening tight clothing'], 0,
   'The passage says if the symptoms are ignored, heat exhaustion can turn into heatstroke.', 'If the symptoms are ignored, heat exhaustion can turn into heatstroke'),
])
passage('R07', 'Grace Hopper', """Grace Hopper was a mathematician and naval officer who helped shape modern computing. In the 1950s, most
programs were written in codes of numbers that only experts could read. Hopper believed that computers should understand
instructions written in words closer to English. Many of her colleagues doubted that this was possible, but she built
one of the first compilers, a program that translates human-friendly instructions into machine code. Her work helped
lead to COBOL, a language that businesses and governments used for decades. Hopper was also known for plain speaking.
She often handed out pieces of wire about a foot long to show how far electricity travels in a billionth of a second.
She retired as a rear admiral in the Navy.""", [
 q('main-idea', 'The passage is mainly about', ['how wires carry electricity', 'how Grace Hopper made computers easier to program', 'why COBOL is no longer used', 'how the Navy chooses admirals'], 1,
   'The passage centers on her idea of English-like instructions, her compiler, and her lasting influence.', 'Hopper believed that computers should understand instructions written in words closer to English.'),
 q('vocab', 'In the passage, the word "doubted" most nearly means', ['agreed', 'questioned whether it was true', 'celebrated', 'paid for'], 1,
   'Her colleagues did not think it was possible, so doubted means questioned whether it was true.', 'Many of her colleagues doubted that this was possible'),
 q('purpose', 'The author mentions the pieces of wire mainly to show that Hopper', ['collected old equipment', 'explained hard ideas in simple, concrete ways', 'worked as an electrician', 'disliked computers'], 1,
   'The wire example comes right after the line about plain speaking, so it shows she made hard ideas easy to picture.', 'Hopper was also known for plain speaking.'),
])
passage('R08', 'Zebra mussels', """Zebra mussels are small freshwater shellfish that first arrived in the Great Lakes in the 1980s, most
likely carried in the ballast water of ships from Europe. With no natural predators to control them, their numbers
exploded. A single female can produce hundreds of thousands of eggs in a year. The mussels attach to any hard surface,
including boat hulls, docks, and the inside of water intake pipes. Power plants and city water systems have spent large
sums clearing clogged pipes. The mussels also filter huge amounts of water, which makes lakes look clearer. Although clear
water may seem like a good sign, it allows sunlight to reach deeper, feeding weeds and changing the food chain that
native fish depend on.""", [
 q('inference', 'The author suggests that the clearer water in these lakes is', ['proof that the lakes are healthy', 'not entirely a good sign', 'caused by power plants', 'good for native fish'], 1,
   'The author says clear water may seem good but feeds weeds and changes the food chain.', 'Although clear water may seem like a good sign'),
 q('detail', 'According to the passage, zebra mussels most likely reached the Great Lakes', ['in the ballast water of ships', 'on the feet of birds', 'through city water pipes', 'in fishing nets from Canada'], 0,
   'The first sentence says they were most likely carried in the ballast water of ships from Europe.', 'most likely carried in the ballast water of ships from Europe'),
])
passage('R09', 'The shift handoff', """At the end of each shift, the outgoing technician completes a handoff with the person taking over. The
process follows a set order. First, the outgoing technician reviews the log of any alarms or failures that occurred
during the shift. Next, both workers walk through any jobs that are still open and agree on which ones must be finished
first. Then the outgoing technician points out any equipment that is tagged out of service and explains why. Only after
these steps does the incoming technician sign the log, which shows that he or she accepts responsibility for the system.
Skipping the handoff may save ten minutes, but it is one of the most common causes of repeated errors, because the new
shift does not know what has already been tried.""", [
 q('sequence', 'What happens right after the alarm log is reviewed?', ['The incoming technician signs the log.', 'Both workers walk through the jobs that are still open.', 'Equipment is tagged out of service.', 'The shift ends.'], 1,
   'First the log is reviewed. Next, both workers walk through open jobs.', 'Next, both workers walk through any jobs that are still open'),
 q('inference', 'Signing the log shows that the incoming technician', ['has fixed every alarm', 'accepts responsibility for the system', 'is leaving for the day', 'disagrees with the outgoing technician'], 1,
   'The passage says signing the log shows he or she accepts responsibility for the system.', 'which shows that he or she accepts responsibility for the system'),
])
passage('R10', 'Why leap years exist', """A calendar year has 365 days, but Earth actually takes about 365 and one quarter days to travel once
around the sun. That extra quarter of a day may seem too small to matter. Over four years, however, it adds up to almost
one full day. Without a correction, the calendar would slowly drift away from the seasons, and after a few centuries,
summer would begin in what the calendar calls spring. To fix the problem, an extra day, February 29, is added about every
four years. Because the true extra amount is slightly less than a quarter of a day, the rule has an exception: years that
end in 00 skip the leap day unless they can be divided evenly by 400. That is why 2000 was a leap year but 1900 was not.""", [
 q('detail', 'According to the passage, why was 1900 not a leap year?', ['It did not have a February.', 'It ends in 00 and cannot be divided evenly by 400.', 'It was too far in the past.', 'Earth moved faster that year.'], 1,
   'Years ending in 00 skip the leap day unless they divide evenly by 400. 1900 does not divide evenly by 400.', 'years that end in 00 skip the leap day unless they can be divided evenly by 400'),
 q('purpose', "The author's main purpose is to", ['argue that calendars should be changed', 'explain why leap years exist and how the rule works', 'describe the four seasons', 'tell the history of February'], 1,
   'The passage explains the extra quarter day, the fix, and the exception to the rule.', 'To fix the problem, an extra day, February 29, is added about every four years.'),
])
passage('R11', 'What libraries do now', """Some people argue that public libraries are no longer needed because so much information is online. This
view misses what libraries actually do today. Many branches offer free internet access to people who have no computer
at home, and staff members help visitors apply for jobs, fill out government forms, and learn basic computer skills.
Libraries also host tax help, English classes, and reading programs for children. For a family on a tight budget, the
library may be the only place where all of these services are free and close by. Closing a branch to save money can end
up costing a community more, as people lose access to the tools they need to find work. Libraries have changed, but their
purpose, opening doors for everyone, has not.""", [
 q('tone', "The author's attitude toward public libraries is best described as", ['doubtful', 'supportive', 'angry', 'uninterested'], 1,
   'The author lists the services libraries give and argues against closing them, so the attitude is supportive.', 'Libraries have changed, but their purpose, opening doors for everyone, has not.'),
 q('inference', 'The author would most likely oppose', ['adding English classes', 'closing library branches to cut costs', 'offering free internet access', 'helping people apply for jobs'], 1,
   'The author says closing a branch to save money can end up costing a community more.', 'Closing a branch to save money can end up costing a community more'),
])
passage('R12', 'Reading a pay stub', """A pay stub lists more than the amount of a paycheck. The first number to find is gross pay, which is the
total earned before anything is taken out. Below it are the deductions. Some are required, such as federal income tax
and Social Security. Others are chosen by the worker, such as health insurance or a retirement plan. Net pay, often
called take-home pay, is what remains after all deductions. New workers are sometimes surprised that their net pay is
much lower than their hourly rate times their hours. Checking each stub is a good habit. Payroll mistakes do happen, and
a worker who does not look may never notice missing overtime pay or a deduction that should have stopped.""", [
 q('vocab', 'In the passage, the word "deductions" most nearly means', ['amounts taken out of pay', 'extra hours worked', 'bonuses', 'hourly rates'], 0,
   'Deductions come between gross pay and net pay, and net pay is what remains after them. So they are amounts taken out.', 'Net pay, often called take-home pay, is what remains after all deductions.'),
 q('detail', 'According to the passage, net pay is', ['the total earned before anything is taken out', 'what remains after all deductions', 'the hourly rate', 'the amount of overtime'], 1,
   'The passage defines net pay as what remains after all deductions.', 'Net pay, often called take-home pay, is what remains after all deductions.'),
 q('inference', 'The author suggests checking each pay stub mainly because', ['it is required by law', 'mistakes can go unnoticed otherwise', 'it raises the hourly rate', 'it lowers taxes'], 1,
   'The last sentence says a worker who does not look may never notice a mistake.', 'a worker who does not look may never notice'),
])
passage('R13', 'A muddy start for the interstates', """In 1919, a young Army officer named Dwight Eisenhower joined a convoy of military trucks that crossed the
United States from Washington, D.C., to San Francisco. The trip took sixty-two days. Roads were often dirt or mud, and
bridges sometimes broke under the weight of the vehicles. Years later, as a general in World War II, Eisenhower saw
Germany's wide, fast highways and understood their value for moving troops and supplies. When he became president, he
pushed for a national network of roads. The Federal-Aid Highway Act of 1956 funded what became the Interstate Highway
System. Today it stretches for more than forty thousand miles and carries a large share of the country's freight, though
few drivers know that it began with a slow, muddy trip.""", [
 q('sequence', 'Which of these happened first?', ['Eisenhower became president.', 'The Federal-Aid Highway Act was passed.', 'Eisenhower saw highways in Germany.', 'Eisenhower crossed the country in a truck convoy.'], 3,
   'The convoy was in 1919. Germany came during World War II, then the presidency, then the 1956 act.', 'In 1919, a young Army officer named Dwight Eisenhower joined a convoy'),
 q('main-idea', 'The passage is mainly about', ["how Eisenhower's experiences led to the interstate highway system", 'why trucks were slow in 1919', 'how bridges are built', "Germany's role in World War II"], 0,
   'The passage follows his 1919 trip and his time in Germany to the highway act he pushed for.', 'When he became president, he pushed for a national network of roads.'),
])
qs = []; kinds = collections.Counter(); R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TOPIC = {'main-idea': 'pc-main-idea', 'detail': 'pc-detail', 'inference': 'pc-inference', 'vocab': 'pc-vocab', 'purpose': 'pc-author', 'tone': 'pc-author', 'sequence': 'pc-sequence'}
TYPE_STEP = {'main-idea': 'Main idea: what is the whole passage about?', 'detail': 'Stated detail: find the exact line.', 'inference': 'Inference: what does the passage suggest, without saying it outright?',
             'vocab': 'Word in context: try each choice in place of the word.', 'purpose': "Author's purpose: why did the author write this part?", 'tone': "Author's attitude: how does the author feel?", 'sequence': 'Sequence: what order did things happen in?'}
passages = []
for pid, title, text, items in P:
    n = len(text.split()); assert 100 <= n <= 150, (pid, n)
    assert 1 <= len(items) <= 3, pid
    passages.append({'id': pid, 'title': title, 'text': text, 'words': n})
    for k, it in enumerate(items, 1):
        c = it['choices']; assert len(c) == 4 and len(set(c)) == 4, (pid, c); assert 0 <= it['answer'] < 4
        # spread the keys evenly over A-D (a fixed pattern, so rebuilds are stable)
        right = c[it['answer']]; rest = [z for z in c if z != right]; want = (len(qs) * 3 + 1) % 4
        rng = random.Random(len(qs)); rng.shuffle(rest); rest.insert(want, right); c = rest; it['answer'] = want
        assert it['why'] and it['line'], pid
        assert it['line'].rstrip('.') in text or it['line'] in text, (pid, it['line'])   # the quoted line really is in the passage
        kinds[it['kind']] += 1
        qs.append({'id': f'PCR-{pid[1:]}-{k}', 'section': 'PC', 'set': 'real', 'passageId': pid, 'passage': text, 'stem': it['stem'], 'choices': c, 'answer': it['answer'],
                   'difficulty': 3, 'topic': TOPIC[it['kind']], 'kind': it['kind'],
                   'steps': ['Read the question first. ' + TYPE_STEP[it['kind']], f'The passage says: "{it["line"]}"', it['why'], f'Answer: {c[it["answer"]]}.'],
                   'explanation': it['why'], 'source': 'original (real-test level)'})
assert len(passages) >= 12 and len(qs) >= 24
assert all(kinds[k] >= 3 for k in ['main-idea', 'detail', 'inference', 'vocab', 'sequence']) and kinds['purpose'] + kinds['tone'] >= 3, kinds
pos = collections.Counter(x['answer'] for x in qs); assert min(pos.values()) >= 6, pos
open(os.path.join(R, 'pcreal.js'), 'w').write('window.ASVAB_PCREAL=' + json.dumps({'version': '2026-10-18', 'passages': passages, 'questions': qs}, ensure_ascii=False) + ';\n')
print('passages', len(passages), 'questions', len(qs), 'words', min(p['words'] for p in passages), '-', max(p['words'] for p in passages), dict(kinds), 'answer positions', dict(pos))
