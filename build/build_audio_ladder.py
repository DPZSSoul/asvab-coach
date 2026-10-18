"""Build ladder.js: the audio-first Arithmetic Reasoning catch-up track (27 levels).
Levels 1-26: spoken mental-math items from build/audio_levels.py, answered by saying the number.
Level 27 (ASVAB bridge): the study pack's bridge level (4 choices, letters). Every answer is re-checked here with sympy."""
import sys, os, re, json, random
from fractions import Fraction as F
sys.path.insert(0, '/home/box/asvab-study/_build'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr as PE, standard_transformations, implicit_multiplication_application
TR = standard_transformations + (implicit_multiplication_application,)
from audio_levels import LEVELS, FMT, fw, fs
from audio_lessons import LESSONS
from catchup_gen import make_set
from build_ladder_util import extra_check
SETS = 4; x = sp.Symbol('x')
def sym_check(chk, ans):
    v = sp.sympify(chk, locals={'Rational': sp.Rational, 'Eq': sp.Eq, 'Max': sp.Max, 'Min': sp.Min, 'x': x})
    if isinstance(v, sp.Equality):
        sol = sp.solve(v, x); assert len(sol) == 1, (chk, sol); v = sol[0]
    return sp.Rational(v) == sp.Rational(ans.numerator, ans.denominator)
def spoken_ans(v, kind):
    if kind == 'money':
        c = int(round(v * 100)); d_, c_ = divmod(c, 100)
        return (f"{d_} dollar{'s' if d_ != 1 else ''}" if d_ else '') + (' and ' if d_ and c_ else '') + (f"{c_} cents" if c_ else '') or '0 dollars'
    if kind == 'pct': return f"{fs(v)} percent"
    if kind == 'dec': return FMT['dec'](v)
    return fw(v)
def fill_wrong(it):
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
rng = random.Random(27); levels = []; total = 0; letters = [0] * 4; checked = 0
for lid, (title, gen, kws) in enumerate(LEVELS, 1):
    sets = []
    for s in range(1, SETS + 1):
        qs = []
        if gen is None:   # bridge: the study pack's level 15
            for k, (stem, c, w, e) in enumerate(make_set(15, s)):
                t = 1
                while extra_check(stem, c) == 'ambiguous': stem, c, w, e = make_set(15, s + 100 * t)[k]; t += 1
                p = rng.randrange(4); ch = list(w); rng.shuffle(ch); ch.insert(p, c); letters[p] += 1
                steps = [z.strip() + ('' if z.strip().endswith(('.', '?', '!')) else '.') for z in re.split(r'(?<=[.!?])\s+', e) if z.strip()]
                qs.append({'id': f'LAD-{lid:02d}-{s}-{k + 1:02d}', 'section': 'LADDER', 'level': lid, 'type': k, 'mode': 'mc', 'stem': stem, 'choices': ch, 'answer': p,
                           'steps': steps + [f'The answer is {c}.'.replace('..', '.')], 'explanation': e, 'topic': f'lad-{lid}', 'difficulty': 1})
            sets.append(qs); total += len(qs); continue
        r = random.Random(lid * 1000 + s * 17); fns = gen(r); seen = set()
        for k, fn in enumerate(fns):
            ok = False
            for _ in range(60):
                it = fn()
                if it['mode'] == 'say': fill_wrong(it)
                if it['stem'] in seen: continue
                vals = [it['ans']] + it['wrong']
                if it['mode'] == 'say':
                    if len(set(vals)) != 4 or len({FMT[it['kind']](v) for v in vals}) != 4: continue
                    if it['ans'] > 0 and any(w <= 0 for w in it['wrong']) and it['kind'] != 'num': continue
                ok = True; break
            if not ok:   # a repeat stem is fine when the type has few variants; bad choices are not
                vals = [it['ans']] + it['wrong']
                assert it['mode'] != 'say' or (len(set(vals)) == 4 and len({FMT[it['kind']](v) for v in vals}) == 4), ('bad choices', it['stem'], vals)
            seen.add(it['stem'])
            assert sym_check(it['check'], it['ans'] if it['mode'] == 'say' else it['check'] and F(0)) if it['mode'] == 'say' else True, (it['stem'], it['check'], it['ans'])
            checked += 1
            if it['mode'] == 'mc':
                ch = it['textChoices']; assert len(set(ch)) == 4, ch; c = ch[0]; p = rng.randrange(4); rest = ch[1:]; rng.shuffle(rest); rest.insert(p, c); ch = rest
                # the right equation must solve to a whole number; the wrong ones must not give the same x
                e0 = sp.solve(sp.sympify(it['check']), x)[0]
                for wrong in ch:
                    if wrong == c: continue
                    l, rr = wrong.split('=')
                    sol = sp.solve(sp.Eq(PE(l, transformations=TR), PE(rr, transformations=TR)), x); assert e0 not in sol, (wrong, sol, e0)
                    assert sp.solve(sp.Eq(*[PE(z, transformations=TR) for z in c.split('=')]), x) == [e0], c
                q = {'mode': 'mc', 'choices': ch, 'answer': p}
                letters[p] += 1
            else:
                fmt = FMT[it['kind']]; strs = [fmt(v) + ('' if not it['unit'] else '') for v in vals]
                assert len(set(strs)) == 4, strs
                p = rng.randrange(4); rest = strs[1:]; rng.shuffle(rest); rest.insert(p, strs[0]); letters[p] += 1
                q = {'mode': 'say', 'choices': rest, 'answer': p, 'value': f"{it['ans'].numerator}/{it['ans'].denominator}" if it['ans'].denominator != 1 else str(it['ans'].numerator),
                     'kind': it['kind'], 'sayAnswer': spoken_ans(it['ans'], it['kind'])}
                if it['form']: q['form'] = it['form']
            steps = [z if z.endswith(('.', '?', '!')) else z + '.' for z in it['steps'] if z]
            ansTxt = q.get('sayAnswer') or q['choices'][q['answer']]
            q.update({'id': f'LAD-{lid:02d}-{s}-{k + 1:02d}', 'section': 'LADDER', 'level': lid, 'type': k, 'stem': it['stem'], 'check': it['check'],
                      'steps': steps + [f'So the answer is {ansTxt}.'], 'explanation': ' '.join(steps), 'topic': f'lad-{lid}', 'difficulty': 1})
            if it['say']: q['say'] = it['say']
            qs.append(q)
        sets.append(qs); total += len(qs)
    les = [{'t': 'say', 'x': st[1]} if st[0] == 's' else {'t': 'check', 'q': st[1], 'a': st[2], 'why': st[3]} for st in LESSONS[lid - 1]]
    levels.append({'n': lid, 'title': title, 'keywords': kws, 'mode': 'mc' if gen is None else 'say', 'lesson': les, 'sets': sets})
place = [dict(L['sets'][0][0], id=f"PLACE-{L['n']:02d}") for L in levels]
OLD = {1: 1, 2: 2, 3: 2, 4: 2, 5: 3, 6: 4, 7: 9, 8: 16, 9: 17, 10: 18, 11: 22, 12: 19, 13: 26, 14: 26, 15: 27}
data = {'version': '2026-10-18-audio', 'count': len(levels), 'oldToNew': OLD, 'mastery': 8, 'setSize': 10,
        'source': 'Audio-first track: build/audio_levels.py + audio_lessons.py; bridge level from the study pack (06_catchup L15).', 'levels': levels, 'placement': place}
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ladder.js'), 'w').write('window.ASVAB_LADDER=' + json.dumps(data, ensure_ascii=False) + ';\n')
print('levels', len(levels), 'items', total, 'sympy-checked', checked, 'placement', len(place), 'answer positions', letters)
