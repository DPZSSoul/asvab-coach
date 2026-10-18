"""Build ladder.js: the 15-level AR/MK math catch-up ladder from the study pack (06_catchup + _build/catchup_gen.py).
Questions come from the pack's generator (verified by its own verify_catchup.py); we re-check every item here too."""
import sys, re, json, glob, random, os
from fractions import Fraction as F
sys.path.insert(0, '/home/box/asvab-study/_build')
from catchup_gen import make_set, TITLES
import sympy as sp
PACK = '/home/box/asvab-study/06_catchup'
SETS = 4
KEYWORDS = {1:['place value','adding','add and subtract','subtraction','addition','numbers'],2:['multiplication','multiply','times tables','times'],
 3:['division','divide','dividing'],4:['order of operations','pemdas','operations'],5:['negative numbers','negatives','negative'],
 6:['fractions','fractions one','fractions 1','what fractions are'],7:['fractions two','fractions 2','fraction math'],8:['decimals','decimal'],
 9:['percents','percent','percentages'],10:['ratios','proportions','ratio','proportion'],11:['word problems','word problem'],
 12:['algebra','basic algebra','equations'],13:['exponents','roots','square roots','powers'],14:['geometry','shapes','area'],15:['bridge','asvab bridge','bridge to asvab']}
def lesson_blocks(md):
    out=[]; code=False; buf=[]
    for line in md.splitlines():
        if line.strip().startswith('```'):
            if code: out.append({'t':'pre','x':'\n'.join(buf)}); buf=[]
            code=not code; continue
        if code: buf.append(line); continue
        s=line.strip()
        if not s or s=='---': continue
        if s.startswith('#'):
            lvl=len(s)-len(s.lstrip('#')); txt=s.lstrip('#').strip()
            if lvl==1: continue
            out.append({'t':'h','x':txt})
        elif re.match(r'^([-*]|\d+\.)\s',s): out.append({'t':'li','x':re.sub(r'^([-*]|\d+\.)\s+','',s).replace('**','')})
        else: out.append({'t':'p','x':s.replace('**','')})
    return out
def extra_check(stem,c):
    m=re.fullmatch(r'Solve: (.+)',stem)
    if m:
        x=sp.Symbol('x'); l,r=m.group(1).split('=')
        e=lambda s: sp.sympify(re.sub(r'(\d)\s*([x(])',r'\1*\2',s.replace('^','**')))
        sol=sp.solve(sp.Eq(e(l),e(r)),x); got=re.search(r'-?\d+(?:/\d+)?',c).group(0)
        assert len(sol)==1 and sol[0]==sp.Rational(got),(stem,c,sol); return True
    m=re.fullmatch(r'In ([\d.]+), what does the digit (\d) stand for\?',stem)
    if m:
        num,d=m.group(1),m.group(2)
        if num.count(d)!=1: return 'ambiguous'      # the digit shows up twice (e.g. 0.77): two right answers
        dec=num.split('.')[1] if '.' in num else ''; whole=num.split('.')[0]
        names=['tenths','hundredths','thousandths']; pos=dec.find(d)
        want = f"{d} {names[pos]}" if pos>=0 else None
        assert want is None or c==want,(stem,c,want); return True
    return False
rng=random.Random(15)
levels=[]; total=0; seen_letters=[0]*4
for L in range(1,16):
    lf=glob.glob(f'{PACK}/L{L:02d}_*_lesson.md')[0]
    sets=[]
    for s in range(1,SETS+1):
        qs=[]
        base=make_set(L,s); fixed=0
        for k in range(len(base)):
            stem,c,w,e=base[k]; t=1
            while extra_check(stem,c)=='ambiguous':
                stem,c,w,e=make_set(L,s+100*t)[k]; t+=1; fixed+=1
            base[k]=(stem,c,w,e)
        for k,(stem,c,w,e) in enumerate(base):
            assert c not in w and len(set(w))==3, (stem,c,w)
            p=rng.randrange(4); ch=w[:]; rng.shuffle(ch); ch.insert(p,c); seen_letters[p]+=1
            steps=[x.strip()+('' if x.strip().endswith(('.','?','!')) else '.') for x in re.split(r'(?<=[.!?])\s+',e) if x.strip()]
            qs.append({'id':f'LAD-{L:02d}-{s}-{k+1:02d}','section':'LADDER','level':L,'stem':stem,'choices':ch,'answer':p,'steps':steps+[f'Answer: {c}.'.replace('..','.')],'explanation':e,'topic':f'lad-{L}','difficulty':1})
        sets.append(qs); total+=len(qs)
    levels.append({'n':L,'title':TITLES[L],'keywords':KEYWORDS[L],'lesson':lesson_blocks(open(lf).read())})
    levels[-1]['sets']=sets
# placement check
pm=open(f'{PACK}/00_placement.md').read(); pa=open(f'{PACK}/00_placement_answers.md').read()
place=[]
for m in re.finditer(r'^(\d+)\. (.+?)\n\n((?:\s+[A-D]\. .+\n?)+)',pm,re.M):
    num=int(m.group(1)); stem=m.group(2).strip(); ch=[re.sub(r'^\s*[A-D]\.\s*','',x) for x in m.group(3).strip().splitlines()]
    km=re.search(rf'^{num}\. ([A-D]) - (.+?)\s+\(Level (\d+)\)',pa,re.M)
    place.append({'id':f'PLACE-{num:02d}','section':'LADDER','level':int(km.group(3)),'stem':stem,'choices':ch,'answer':'ABCD'.index(km.group(1)),'explanation':km.group(2),'steps':[km.group(2)],'topic':'placement','difficulty':1})
assert len(place)==15 and all(len(q['choices'])==4 for q in place), len(place)
data={'version':'2026-10-18','source':'Study pack 06_catchup (15 levels), generator _build/catchup_gen.py','mastery':8,'setSize':10,'levels':levels,'placement':place}
open(os.path.join(os.path.dirname(__file__),'..','ladder.js'),'w').write('window.ASVAB_LADDER='+json.dumps(data,ensure_ascii=False)+';\n')
print('levels',len(levels),'items',total,'placement',len(place),'answer positions',seen_letters)
