"""Seed sweep for the audio-first ladder: run every level's generators over many seeds (not only the 4 shipped sets)
and check each item with sympy, plus mental-math size limits and 4 distinct choices. Usage: python3 build/sweep_ladder.py [seeds]"""
import sys, os, re, json
from fractions import Fraction as F
import random
sys.path.insert(0, '/home/box/asvab-study/_build'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sympy as sp
from audio_levels import LEVELS, FMT
from build_ladder_util import extra_check
from catchup_gen import make_set
SEEDS = int(sys.argv[1]) if len(sys.argv) > 1 else 200
x = sp.Symbol('x'); LOC = {'Rational': sp.Rational, 'Eq': sp.Eq, 'Max': sp.Max, 'Min': sp.Min, 'x': x}
def value(chk):
    v = sp.sympify(chk, locals=LOC)
    if isinstance(v, sp.Equality):
        sol = sp.solve(v, x); assert len(sol) == 1, (chk, sol); v = sol[0]
    return sp.Rational(v)
def fill_wrong(it):   # same rule as build_audio_ladder.py
    ans = it['ans']; fmt = FMT[it['kind']]; out = []; seen = {fmt(ans)}
    pool = list(it['wrong']) + ([ans + 1, ans - 1, ans + 2, ans * 2, ans + 3, ans - 2, ans + 10] if ans.denominator == 1 else
           [ans + F(1, ans.denominator), ans - F(1, ans.denominator), ans * 2, F(ans.denominator, ans.numerator) if ans.numerator else F(1, 2), ans + 1, F(1, 2), F(1, 3), F(2, 3), F(1, 4)])
    for w in pool:
        w = F(w); f = fmt(w)
        if f in seen or w == ans: continue
        if ans > 0 and w <= 0: continue
        seen.add(f); out.append(w)
        if len(out) == 3: break
    it['wrong'] = out; return it
cache = {}
def val(chk):
    if chk not in cache: cache[chk] = value(chk)
    return cache[chk]
errs = []; per = {}; biggest = {}
for lid, (title, gen, kws) in enumerate(LEVELS, 1):
    n = 0; big = 0
    for seed in range(SEEDS):
        if gen is None:
            for stem, c, w, e in make_set(15, seed + 1):
                n += 1
                if len({c, *w}) != 4: errs.append((lid, seed, stem, 'choices', c, w))
                try: extra_check(stem, c)
                except AssertionError as ex: errs.append((lid, seed, stem, 'key', str(ex)[:120]))
            continue
        r = random.Random(seed * 7919 + lid)
        for fn in gen(r):
            it = fn(); n += 1
            nums = [abs(int(z)) for z in re.findall(r'\d+', it['stem'])]; big = max([big] + nums)
            try:
                if it['mode'] == 'say':
                    if val(it['check']) != sp.Rational(it['ans'].numerator, it['ans'].denominator): errs.append((lid, seed, it['stem'], 'check', it['check'], str(it['ans'])))
                    fill_wrong(it); vals = [it['ans']] + it['wrong']
                    if len(set(vals)) != 4 or len({FMT[it['kind']](v) for v in vals}) != 4: errs.append((lid, seed, it['stem'], 'choices', [str(v) for v in vals]))
                else:
                    val(it['check'])
                    if len(set(it['textChoices'])) != 4: errs.append((lid, seed, it['stem'], 'mc choices'))
            except Exception as ex: errs.append((lid, seed, it['stem'], 'error', repr(ex)[:120]))
    per[lid] = n; biggest[lid] = big
# mental math: the largest number said in any question stem (money and distance levels can go higher)
print(json.dumps({'seeds': SEEDS, 'items': sum(per.values()), 'perLevel': per, 'largestNumberInStem': biggest, 'errors': len(errs), 'first': errs[:10]}))
sys.exit(1 if errs else 0)
