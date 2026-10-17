import json, re, random, sys
sys.path.insert(0,'.')
from lessons import L
D=json.load(open('existing.json'))
V=json.load(open('/home/box/asvab-study/vocab.json'))
VOC={w['word'].lower():dict(w,theme=s['theme']) for s in V['sets'] for w in s['words']}
LET='ABCD'
rng=random.Random(2026)

# ---------- new original PC passages ----------
NEW_PC=[
("Many offices lose files because no one makes backups. A backup is a copy of data kept in a second place. Experts suggest the 3-2-1 rule. Keep three copies of important data, on two kinds of storage, with one copy off site. If a fire or a virus hits the office, the off-site copy is still safe. A backup only helps if it works. So technicians should test it by restoring a few files each month.",
 [("What is the main idea of the passage?","Good backups protect data from loss.",["Fires are the main cause of lost files.","Offices should stop using computers.","Viruses cannot harm backups."],"pc-main-idea",2,"Every line is about backups and keeping data safe."),
  ("Under the 3-2-1 rule, how many copies of data should be kept?","Three",["One","Two","Four"],"pc-detail",1,"The passage says: keep three copies of important data."),
  ("Why should one copy be kept off site?","So it stays safe if the office is damaged.",["So it opens faster.","So it costs less.","So no one has to test it."],"pc-detail",2,"The passage says the off-site copy is safe from a fire or virus at the office."),
  ("What should technicians do each month?","Restore a few files to test the backup.",["Delete old backups.","Buy new storage.","Move every file off site."],"pc-detail",1,"The last sentence says to test by restoring a few files each month.")]),
("Honeybees tell each other where to find food by dancing. When a worker bee finds flowers, it returns to the hive. Then it moves in a figure-eight pattern and waggles its body. The direction of the dance points toward the food. The longer the bee waggles, the farther away the flowers are. Other bees watch the dance and then fly to the spot.",
 [("The passage mainly describes:","how bees share where food is",["how bees build a hive","why bees sting","how flowers make honey"],"pc-main-idea",2,"The whole passage explains the dance that shows other bees where food is."),
  ("A bee that waggles for a long time is most likely showing that the flowers are:","far away",["close by","almost gone","a new color"],"pc-inference",3,"The passage says a longer waggle means the flowers are farther away."),
  ("What does the direction of the dance show?","Which way the food is",["How many bees should go","What time it is","How much honey is left"],"pc-detail",1,"The passage says the direction of the dance points toward the food.")]),
("Some people think asking for help is a sign of weakness. In fact, the opposite is often true. Strong teams depend on members who speak up when they are stuck. A sailor who hides a problem with a pump may cause a bigger failure later. A sailor who asks early lets the team fix it while it is still small.",
 [("What is the author's main point?","Asking for help early makes a team stronger.",["Strong people never need help.","Pumps fail often at sea.","Sailors should work alone."],"pc-main-idea",2,"The author says asking for help is not weak. It helps the team fix problems early."),
  ("In the passage, the word DEPEND most nearly means:","rely",["argue","wait","leave"],"pc-vocab",2,"Strong teams rely on members who speak up. Rely fits the sentence."),
  ("If a sailor hides a pump problem, what will most likely happen?","A bigger failure could happen later.",["The pump will fix itself.","The team will work faster.","Nothing will change."],"pc-inference",2,"The passage says hiding a problem may cause a bigger failure later.")]),
("Before you replace a laptop battery, shut the computer down fully. Next, unplug the power cord and any cables. Then turn the laptop over and remove the screws on the battery cover. Lift out the old battery and set the new one in place. Finally, replace the cover. Charge the new battery for several hours before first use.",
 [("What should be done right after shutting down the laptop?","Unplug the power cord and cables.",["Remove the screws.","Charge the battery.","Lift out the old battery."],"pc-sequence",1,"The word Next comes right after shutting down. It says to unplug the cord and cables."),
  ("What is the last step in the passage?","Charge the new battery for several hours.",["Shut the computer down.","Remove the screws.","Turn the laptop over."],"pc-sequence",1,"The final sentence says to charge the new battery before first use."),
  ("The purpose of this passage is to:","give steps for replacing a battery",["sell a new laptop","explain how batteries are made","warn about old computers"],"pc-author",2,"The passage is a set of steps in order: first, next, then, finally.")]),
("Norfolk, Virginia, is home to the largest naval base in the world. Naval Station Norfolk supports dozens of ships and many aircraft squadrons. Tens of thousands of sailors and civilians work there. Because the base is so big, the city's shops, schools, and roads are planned around it.",
 [("According to the passage, Naval Station Norfolk is:","the largest naval base in the world",["the oldest city in Virginia","a base for only aircraft","a small training school"],"pc-detail",1,"The first sentence says it is the largest naval base in the world."),
  ("In the passage, the word SUPPORTS most nearly means:","takes care of",["holds up","argues for","pays for"],"pc-vocab",3,"The base serves and takes care of ships. Holds up is the everyday meaning, but it does not fit here."),
  ("What can you infer from the passage?","The base has a big effect on life in the city.",["Few people live in Norfolk.","The base will close soon.","Ships cannot dock in Norfolk."],"pc-inference",2,"Shops, schools, and roads are planned around the base. So it shapes city life.")]),
]

def A(c): return f"Answer: {c}" + ('' if c.strip()[-1] in '.?!' else '.')
def sentences(t):
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z0-9("$|-])', t.strip()) if s.strip()]

def tag_ar(s):
    s2=s.lower()
    if re.search(r'chance|probability|at random',s2): return 'ar-fractions'
    if re.search(r'times as old|years old|\bage\b',s2): return 'ar-number'
    if re.search(r'per hour\. (she|he|they) works|overtime|earns \$',s2): return 'ar-money'
    R=[('ar-interest',['interest']),('ar-work',['together','workers','pipe','pump','worker','fills']),
       ('ar-rate',['mph','miles per hour','speed','drives','travels','train','upstream','downstream','jogs','runner','miles in','walks','flies']),
       ('ar-average',['average','mean']),('ar-percent',['%','percent','discount','tax','tip','off']),
       ('ar-ratio',['ratio','map','recipe','at that price','scale','proportion','per ']),
       ('ar-geometry',['area','perimeter','square feet','wall','rectangle','fence','garden','floor']),
       ('ar-number',['consecutive','two numbers','add up to','differ','sum of','number is']),
       ('ar-units',['pints','quarts','minutes','hours','am','pm','inches','feet','ounces','pounds','yards'])]
    for k,ws in R:
        for w in ws:
            if (w in s2) if len(w)>3 or not w.isalpha() else re.search(r'\b'+w+r'\b',s2): return k
    if re.search(r'\d/\d|half|third|quarter',s2): return 'ar-fractions'
    return 'ar-money'
def tag_mk(s):
    s2=s.lower()
    if re.search(r'chance|probability|ways|!',s2): return 'mk-probability'
    if 'slope' in s2 or 'distance from' in s2 and '(' in s2: return 'mk-slope'
    if re.search(r'x\^2 [-+] \d*x [-+] \d+ = 0|solutions of',s2): return 'mk-quadratics'
    if 'f(x)' in s2 or re.search(r'if x = \d',s2): return 'mk-functions'
    if re.search(r'[<>]',s2): return 'mk-inequalities'
    if re.search(r' and (x|y) =|x \+ y|x - y =|and x - y',s2): return 'mk-systems'
    if re.search(r'\bangles?\b|degrees|hypotenuse',s2): return 'mk-triangles-angles'
    if re.search(r'area|perimeter|circumference|volume|cylinder|box is',s2): return 'mk-area-volume'
    if re.search(r'expand|factor[^s]|factor:|simplify: \(|simplify: x|\(\dx|x\^\d.*x',s2) and 'common factor' not in s2: return 'mk-polynomials'
    if re.search(r'solve|number is|less than|more than',s2): return 'mk-equations'
    if re.search(r'\^|square root|10\^',s2): return 'mk-exponents'
    if re.search(r'\d/\d|fraction|0\.\d',s2): return 'mk-fractions'
    return 'mk-number'
def tag_gs(s,c):
    s2=(s+' '+c).lower()
    if re.search(r"\blaw\b|newton|inertia|force",s2): return 'gs-physics'
    if re.search(r'planet|moon|sun\b|rock|earthquake|earth\'s|of earth|the earth|atmosphere|weather|season|magma|crust|tide|fault|core',s2): return 'gs-earth-space'
    if re.search(r'blood|organ|heart|bone|vitamin|brain|nerve|muscle|kidney|lung|body|nutrient|white blood|red blood',s2): return 'gs-human-body'
    if re.search(r'cell|plant|dna|mammal|vertebrate|animal|food chain|mitochondria|photosynthesis|omnivore|herbivore',s2): return 'gs-cells-life'
    if re.search(r'atom|ph\b|ph of|chemical|element|symbol|compound|formula|freez|boil|evapor|condens|solid|melt|atomic|physical change',s2): return 'gs-chemistry'
    return 'gs-physics'
def tag_pc(s):
    s2=s.lower()
    if 'main idea' in s2 or 'mainly' in s2 or "main point" in s2: return 'pc-main-idea'
    if 'most nearly means' in s2 or 'word ' in s2: return 'pc-vocab'
    if re.search(r'infer|most likely|would the author|agree|signals',s2): return 'pc-inference'
    if re.search(r"author's|feel|purpose|tone",s2): return 'pc-author'
    return 'pc-detail'

DIFF_PC={'pc-detail':1,'pc-sequence':1,'pc-main-idea':2,'pc-vocab':2,'pc-author':2,'pc-inference':3}
def diff_pos(it):
    i,n=it['idx'],it['n']
    if it['src']=='quiz' and n==55:  # 40 quiz (easy->hard) + 15 readiness (easy->hard)
        i,n=(i,40) if i<40 else (i-40,15)
    f=i/n
    return 1 if f<0.34 else (2 if f<0.67 else 3)

out=[]; pass_ids={}
DROP={"Which planet is called the Red Planet?","Most weather happens in which layer of the atmosphere?","Water boils at what temperature on the Celsius scale (at sea level)?","Which of these is a vertebrate?"}
def pid_for(passage):
    if passage not in pass_ids: pass_ids[passage]=f"P{len(pass_ids)+1:02d}"
    return pass_ids[passage]
def add(sec, stem, choices, ans, topic, diff, steps, expl, passage=None, src='', extra=None):
    q=dict(id=f"{sec}-{sum(1 for x in out if x['section']==sec)+1:03d}", section=sec, stem=stem, choices=choices, answer=ans,
           difficulty=diff, topic=topic, steps=steps, explanation=expl, source=src)
    if passage: q['passage']=passage; q['passageId']=pid_for(passage)
    if extra: q.update(extra)
    out.append(q)

for sec in ['AR','WK','PC','MK','GS']:
    for it in D[sec]:
        if it['stem'] in DROP: continue
        stem,ch,ans,expl=it['stem'],it['options'],LET.index(it['ans']),it['expl']
        ex=None
        if sec=='AR': topic=tag_ar(stem)
        elif sec=='MK': topic=tag_mk(stem)
        elif sec=='GS': topic=tag_gs(stem,it['correct'])
        elif sec=='PC': topic=tag_pc(stem)
        else: topic='wk-context' if stem.startswith('"') else 'wk-synonym'
        diff=DIFF_PC[topic] if sec=='PC' else diff_pos(it)
        lesson=L[topic]
        if sec in ('AR','MK'):
            steps=['The idea: '+lesson['idea']]+sentences(expl)+[A(it['correct'])]
        elif sec=='WK':
            m=re.search(r'([A-Z]{3,})',stem); w=m.group(1).lower() if m else ''
            v=VOC.get(w) or next((VOC[k] for k in VOC if w.startswith(k[:5]) and len(k)>4), None)
            steps=[]
            if topic=='wk-context': steps.append('Read the sentence. Look for clues.')
            else: steps.append('Make your own short sentence with the word.')
            if v:
                steps.append(f"{w.upper()} means: {v['meaning']}.")
                steps.append(f"Example: {v['example']}")
                steps.append(f"Memory hook: {v['hook']}")
                ex={'theme':v['theme']}
            else:
                steps.append(expl)
            steps.append(f"Put \"{it['correct']}\" in place of {w.upper()}. It fits.")
            steps.append(A(it['correct']))
        elif sec=='PC':
            steps=['Read the question first. What type is it? '+lesson['name']+'.','Find the line in the passage that answers it.']+sentences(expl)+[A(it['correct'])]
        else:
            steps=[f"Topic: {lesson['name']}."]+sentences(expl)+[A(it['correct'])]
        add(sec,stem,ch,ans,topic,diff,steps,expl,it.get('passage'),'study-pack:'+it['src'],ex)

# new PC
for passage,qs in NEW_PC:
    for stem,cor,wr,topic,diff,why in qs:
        p=rng.randrange(4); ch=wr[:]; rng.shuffle(ch); ch.insert(p,cor)
        steps=['Read the question first. What type is it? '+L[topic]['name']+'.','Find the line in the passage that answers it.',why,A(cor)]
        add('PC',stem,ch,p,topic,diff,steps,why,passage,'new-original')

bank=dict(version='2026-10-17', title='ASVAB Coach question bank',
  note='Original ASVAB-style practice questions. Not real ASVAB items.',
  sections={'AR':'Arithmetic Reasoning','WK':'Word Knowledge','PC':'Paragraph Comprehension','MK':'Math Knowledge','GS':'General Science'},
  cat={'GS':[15,12],'AR':[15,55],'WK':[15,9],'PC':[10,27],'MK':[15,31]},
  lessons=L, questions=out)
json.dump(bank,open('../questions.json','w'),indent=1,ensure_ascii=False)
open('../questions.js','w').write('window.ASVAB_BANK='+json.dumps(bank,ensure_ascii=False)+';\n')
from collections import Counter
print(Counter(q['section'] for q in out))
for sec in bank['sections']:
    print(sec, Counter(q['topic'] for q in out if q['section']==sec), Counter(q['difficulty'] for q in out if q['section']==sec))
print('WK no vocab:',sum(1 for q in out if q['section']=='WK' and 'theme' not in q))
