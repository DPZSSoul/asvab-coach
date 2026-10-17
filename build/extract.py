import sys, json
sys.path.insert(0,'/home/box/asvab-study/_build')
import ar_bank, mk_bank, wk_bank, pc_bank, gs_bank, p_ar, p_mk, p_wk_pc, p_gs_ei
out={}
def items(b,src='quiz'):
    r=b.finalize(); n=len(r)
    for i,it in enumerate(r): it['src']=src; it['idx']=i; it['n']=n
    return r
out['AR']=items(ar_bank.build())
out['MK']=items(mk_bank.build())
out['WK']=items(wk_bank.build())
out['PC']=items(pc_bank.build(False))+items(pc_bank.build(True),'readiness')
out['GS']=items(gs_bank.build())
def flat(t):
    r=[]
    if isinstance(t,tuple): t=t[0]
    for k,v in t.items():
        for i,it in enumerate(v): it['src']='practice-'+k; it['idx']=i; it['n']=len(v)
        r+=v
    return r
out['AR']+=flat(p_ar.build_tests()); out['MK']+=flat(p_mk.build_tests())
out['WK']+=flat(p_wk_pc.build_wk()); out['PC']+=flat(p_wk_pc.build_pc()); out['GS']+=flat(p_gs_ei.build_gs())
for k,v in out.items():
    seen=set(); u=[]
    for it in v:
        key=(it['stem'],it.get('passage'))
        if key in seen: continue
        seen.add(key); u.append(it)
    out[k]=u
    print(k,len(v),len(u))
json.dump(out,open('/workspace/asvab-coach-app/build/existing.json','w'),indent=1)
