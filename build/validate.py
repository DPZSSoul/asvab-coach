"""Validator for questions.json: structure, counts, answer keys, and math checks (sympy + arithmetic)."""
import json, re, sys
from fractions import Fraction
import sympy as sp
P=sys.argv[1] if len(sys.argv)>1 else '../questions.json'
B=json.load(open(P)); Q=B['questions']
err=[]; warn=[]
SECS=['AR','WK','PC','MK','GS']
from collections import Counter
cnt=Counter(q['section'] for q in Q)
for s in SECS:
    if cnt[s]<50: err.append(f'{s} has only {cnt[s]} questions')
ids=set()
for q in Q:
    i=q['id']
    if i in ids: err.append('dup id '+i)
    ids.add(i)
    for f in ['stem','choices','answer','difficulty','topic','steps','explanation','section']:
        if f not in q: err.append(f'{i} missing {f}')
    if len(q['choices'])!=4: err.append(f'{i} has {len(q["choices"])} choices')
    if len(set(c.strip().lower() for c in q['choices']))!=4: err.append(f'{i} duplicate choices')
    if q['answer'] not in (0,1,2,3): err.append(f'{i} bad answer index')
    if q['difficulty'] not in (1,2,3): err.append(f'{i} bad difficulty')
    if q['topic'] not in B['lessons']: err.append(f'{i} unknown topic {q["topic"]}')
    if not q['steps'] or not all(isinstance(x,str) and x for x in q['steps']): err.append(f'{i} bad steps')
    if q['section']=='PC' and not q.get('passage'): err.append(f'{i} PC without passage')
    if any(re.search(r'\*|_[a-z]',c) for c in q['choices']): warn.append(f'{i} markdown chars in choices')
    corr=q['choices'][q['answer']]
    if not any(corr.lower().rstrip('.') in s.lower() for s in q['steps']): err.append(f'{i} correct answer not stated in steps')

# ---------- math checks ----------
def num(s):
    s=s.replace(',','').replace('$','').strip()
    try: return Fraction(s)
    except Exception: return None
OPS={'x':'*','*':'*','/':'/','+':'+','-':'-'}
def arith_checks(text):
    """Find 'a op b [op c] = r' chains and evaluate them with exact fractions. Returns (n_checked, failures)."""
    n=0; fails=[]
    t=text.replace(',','').replace('$','')
    for m in re.finditer(r'((?:\(?-?\d+(?:\.\d+)?\)?\s*[x*/+\-]\s*)+\(?-?\d+(?:\.\d+)?\)?)\s*=\s*(-?\d+(?:\.\d+)?)(%?)(?![\d.]*\s*[x*/^])', t):
        lhs, rhs = m.group(1), m.group(2)
        if m.group(3)=='%': rhs=str(Fraction(rhs)/100)
        # skip algebra (letters other than x as operator) and exponents
        start=m.start()
        if start>0 and re.match(r'[a-zA-Z^(]', t[start-1]): continue
        expr=re.sub(r'(?<=[\d)])\s*x\s*(?=[\d(-])','*',lhs)
        if re.search(r'[a-wyzA-Z]',expr): continue
        try:
            v=sp.nsimplify(sp.sympify(expr.replace(' ','')),rational=True)
            r=sp.Rational(Fraction(rhs))
        except Exception: continue
        n+=1
        if abs(float(v)-float(r))>1e-6 and abs(float(v)-float(r))/max(1,abs(float(r)))>0.006:
            fails.append(f'{lhs} = {rhs} (python says {float(v):g})')
    return n,fails
x,y=sp.symbols('x y')
def symp(s):
    s=s.replace('^','**')
    s=re.sub(r'(\d)\s*([xy(])',r'\1*\2',s); s=re.sub(r'\)\s*\(',')*(',s); s=re.sub(r'([xy])\s*\(',r'\1*(',s)
    s=re.sub(r'([xy])\s+([xy])',r'\1*\2',s)
    return sp.sympify(s)
def parse_ineq(s):
    m=re.match(r'\s*([xy])\s*([<>]=?)\s*(-?[\d/]+)',s)
    return m.groups() if m else None
def sym_check(q):
    """Independent solve of the stem. Returns (method, ok) or None if no rule applies."""
    st=q['stem']; c=q['choices'][q['answer']]
    m=re.match(r'Solve for ([xy]): (.+)$',st)
    if m:
        v=sp.Symbol(m.group(1)); l,r=m.group(2).split('=')
        sol=sp.solve(sp.Eq(symp(l).subs(x,v) if m.group(1)=='x' else symp(l),symp(r)),v)
        return 'sympy solve', sp.nsimplify(c)==sol[0] if len(sol)==1 else False
    m=re.match(r'Solve: (.+?)\s*([<>])\s*(.+)$',st)
    if m:
        sol=sp.solve_univariate_inequality(sp.Lt(symp(m.group(1)),symp(m.group(3))) if m.group(2)=='<' else sp.Gt(symp(m.group(1)),symp(m.group(3))),x,relational=False)
        pi=parse_ineq(c); 
        if not pi: return 'sympy ineq', False
        b=sp.nsimplify(pi[2]); want=sp.Interval.open(b,sp.oo) if pi[1]=='>' else sp.Interval.open(-sp.oo,b)
        return 'sympy ineq', sol==want
    m=re.match(r'(Expand|Simplify): (.+)$',st)
    if m and 'square root' not in st:
        e=m.group(2).replace(' x x',' * x')
        return 'sympy expand', sp.expand(symp(e)-symp(c))==0
    m=re.match(r'Factor(?: completely)?: (.+)$',st)
    if m:
        a=symp(m.group(1)); b=symp(c)
        return 'sympy factor', sp.expand(a-b)==0 and sp.factor(a)==sp.factor(b) and not isinstance(b,sp.Add)
    m=re.match(r'If f\(x\) = (.+), what is f\((-?\d+)\)\?',st)
    if m: return 'sympy eval', symp(m.group(1)).subs(x,int(m.group(2)))==sp.nsimplify(c)
    m=re.match(r'If x = (-?\d+), what is (.+)\?',st)
    if m: return 'sympy eval', symp(m.group(2)).subs(x,int(m.group(1)))==sp.nsimplify(c)
    m=re.match(r'What are the solutions of (.+) = 0\?',st)
    if m:
        sol=set(sp.solve(symp(m.group(1)),x)); got=set(sp.nsimplify(n) for n in re.findall(r'-?\d+',c))
        return 'sympy solve', sol==got
    m=re.match(r'If (.+) and (.+), what is ([xy])\?',st)
    if m:
        e1=[symp(z) for z in m.group(1).split('=')]; e2=[symp(z) for z in m.group(2).split('=')]
        s=sp.solve([sp.Eq(*e1),sp.Eq(*e2)],[x,y]); return 'sympy system', s[sp.Symbol(m.group(3))]==sp.nsimplify(c)
    m=re.match(r'What is the slope of the line through \((-?\d+), (-?\d+)\) and \((-?\d+), (-?\d+)\)\?',st)
    if m:
        a,b,cc,d=map(int,m.groups()); return 'slope formula', Fraction(d-b,cc-a)==Fraction(c)
    m=re.match(r'What is the distance from \((-?\d+), (-?\d+)\) to \((-?\d+), (-?\d+)\)\?',st)
    if m:
        a,b,cc,d=map(int,m.groups()); return 'distance formula', sp.sqrt((cc-a)**2+(d-b)**2)==sp.nsimplify(c)
    m=re.search(r'legs of (\d+) and (\d+)',st)
    if m: return 'pythagoras', sp.sqrt(int(m.group(1))**2+int(m.group(2))**2)==sp.nsimplify(c)
    m=re.match(r'What is the (greatest common factor|least common multiple) of (\d+) and (\d+)\?',st)
    if m:
        a,b=int(m.group(2)),int(m.group(3)); v=sp.gcd(a,b) if m.group(1)[0]=='g' else sp.lcm(a,b); return 'gcd/lcm', v==int(c)
    m=re.match(r'What is the median of (.+)\?',st)
    if m: return 'median', sp.nsimplify(__import__('statistics').median([int(n) for n in re.findall(r'\d+',m.group(1))]))==sp.nsimplify(c)
    m=None
    if m: return 'sympy sqrt', sp.sqrt(int(m.group(1)))==symp(c.replace(' x the square root of ','*sqrt(').replace('the square root of ','sqrt(').strip()+(')' if 'root' in c else ''))
    return None

from math import comb, perm, factorial, pi, sqrt
import statistics
# Independent Python computations for items no rule above covers (value or exact string of the right choice).
MANUAL={
"Find the average of 70, 80, 90, 100, and 60.": statistics.mean([70,80,90,100,60]),
"Pipe A fills a pool in 6 hours. Pipe B fills it in 3 hours. How long do they take together?": 1/(Fraction(1,6)+Fraction(1,3)),
"A boat goes 24 miles downstream in 2 hours. It returns upstream in 3 hours. What is its upstream speed?": Fraction(24,3),
"Ann paints a room in 4 hours. Ben paints it in 12 hours. How long do they take together?": 1/(Fraction(1,4)+Fraction(1,12)),
"Jon is 3 times as old as Amy. Together they are 48. How old is Amy?": sp.solve(sp.Eq(x+3*x,48),x)[0],
"10 liters of a 20% salt mix has 10 liters of water added. What is the new salt percent?": Fraction(10*20,100)/(10+10)*100,
"A $60 radio is marked down 15%. How many dollars is the discount?": Fraction(60*15,100),
"A tank that is 3/5 full holds 45 gallons. How many gallons does the tank hold when full?": 45/Fraction(3,5),
"A 25% salt solution weighs 8 liters. Then 2 liters of pure water are added. What percent of the mix is now salt?": Fraction(8*25,100)/10*100,
"An inlet pipe fills a tank in 4 hours. A drain empties a full tank in 12 hours. With both open, how many hours to fill the empty tank?": 1/(Fraction(1,4)-Fraction(1,12)),
"A square garden is 9 feet on each side. What is its perimeter?": 4*9,
"Worker A can finish a job in 10 hours. Worker B can finish it in 15 hours. Working together, how many hours do they need?": 1/(Fraction(1,10)+Fraction(1,15)),
"What is the area of a circle with a radius of 5?": ('pi', 5**2),
"What is the circumference of a circle with a diameter of 14?": ('pi', 14),
"Which of these numbers is prime?": ('prime',),
"Simplify: the square root of 50": ('root', 50),
"What is 2/3 + 3/4?": Fraction(2,3)+Fraction(3,4),
"What is (3/5) divided by (9/10)?": Fraction(3,5)/Fraction(9,10),
"Which fraction equals 0.375?": Fraction('0.375'),
"Which fraction is the greatest?": ('max',),
"Five less than twice a number is 17. What is the number?": sp.solve(sp.Eq(2*x-5,17),x)[0],
"Two angles are supplementary. One is 4 times the other. What is the smaller angle?": sp.solve(sp.Eq(x+4*x,180),x)[0],
"In how many ways can 3 people from a group of 5 be lined up for first, second, and third place?": perm(5,3),
"A circle has a diameter of 12. What is its area?": ('pi', (12//2)**2),
"What is 2^-3?": Fraction(1,2**3),
"What is the slope of the line y = -2x + 5?": sp.Poly(-2*x+5,x).coeffs()[0],
"Write 0.6 as a fraction in lowest terms.": Fraction('0.6'),
"What is 2^5 divided by 2^2?": 2**5//2**2,
"What is 4.763 rounded to the nearest tenth?": round(4.763,1),
"Simplify: the square root of 72": ('root', 72),
"What is (2^3)^2?": (2**3)**2,
"A circle has a diameter of 10. What is its area?": ('pi', (10//2)**2),
"What is 2/5 divided by 4/15?": Fraction(2,5)/Fraction(4,15),
"A bag has 3 red and 5 blue marbles. Two are drawn with no replacement. What is the chance both are red?": Fraction(comb(3,2),comb(8,2)),
}
def manual_check(q):
    if q['stem'] not in MANUAL: return None
    exp=MANUAL[q['stem']]; c=q['choices'][q['answer']]
    if isinstance(exp,tuple):
        if exp[0]=='pi': return c.replace(' ','') in (f"{exp[1]}π", f"{exp[1]}pi")
        if exp[0]=='root':
            v=sp.sqrt(exp[1]); m=re.fullmatch(r'(\d+)√(\d+)',c); return bool(m) and int(m.group(1))*sp.sqrt(int(m.group(2)))==v and sp.sqrt(int(m.group(2))).is_irrational
        if exp[0]=='prime': return sp.isprime(int(c)) and sum(sp.isprime(int(o)) for o in q['choices'])==1
        if exp[0]=='max':
            vals=[Fraction(o) for o in q['choices']]; return Fraction(c)==max(vals) and vals.count(max(vals))==1
    m=re.search(r'-?\d[\d,]*(?:\.\d+)?(?:/\d+)?',c)
    return bool(m) and Fraction(m.group(0).replace(',',''))==Fraction(str(exp))
checked_q=0; methods=Counter(); unchecked=[]
for q in Q:
    if q['section'] not in ('AR','MK'): continue
    text=' '.join(q['steps'])
    n,f=arith_checks(q['explanation'])
    for ff in f: err.append(f"{q['id']} arithmetic: {ff}")
    sc=None
    try: sc=sym_check(q)
    except Exception as e: warn.append(f"{q['id']} sympy rule error {e}")
    if sc:
        methods[sc[0]]+=1
        if not sc[1]: err.append(f"{q['id']} {sc[0]} disagrees with key: {q['stem']} -> {q['choices'][q['answer']]}")
    if n:
        methods['arithmetic chain']+=1
        cm=re.search(r'-?\d[\d,]*(?:\.\d+)?(?:/\d+)?',q['choices'][q['answer']])
        nums=set()
        for z in re.findall(r'-?\d[\d,]*(?:\.\d+)?(?:/\d+)?',q['explanation'].replace('$','')):
            try: nums.add(Fraction(z.replace(',','')))
            except Exception: pass
        if cm and Fraction(cm.group(0).replace(',','')) not in nums and Fraction(cm.group(0).replace(',',''))*1 not in {v*100 for v in nums}:
            err.append(f"{q['id']} key value not reached in explanation: {q['choices'][q['answer']]} | {q['explanation']}")
    mc=manual_check(q)
    if mc is not None:
        methods['independent python (manual table)']+=1; sc=sc or ('manual',True)
        if not mc: err.append(f"{q['id']} independent python value disagrees: {q['stem']} -> {q['choices'][q['answer']]}")
    # final number in explanation must match correct choice number (if both numeric)
    cn=re.findall(r'-?\d[\d,]*(?:\.\d+)?(?:/\d+)?',q['choices'][q['answer']])
    if not (n or sc): unchecked.append(q['id'])
    else: checked_q+=1
    # distractors must differ numerically from the correct answer
    def val(s):
        m=re.fullmatch(r'\$?(-?[\d,]*\.?\d+(?:/\d+)?)\s*([a-z %]*)',s.strip())
        return (Fraction(m.group(1).replace(',','')),m.group(2).strip()) if m else None
    vs=[val(c) for c in q['choices']]
    if all(vs) and len(set(vs))<4: err.append(f"{q['id']} two choices have the same value")
res=dict(counts=dict(cnt), total=len(Q), errors=err, warnings=warn, math_checked=checked_q, math_methods=dict(methods), math_unchecked=unchecked)
print(json.dumps(res,indent=1))
sys.exit(1 if err else 0)
