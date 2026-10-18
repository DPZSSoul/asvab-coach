import re
import sympy as sp
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
