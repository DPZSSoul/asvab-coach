"""Build asvab-coach.html: one self-contained file (CSS, questions, tutor rules, JS inline)."""
import base64, os, re
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd=lambda f: open(os.path.join(R,f),encoding='utf-8').read()
html=rd('index.html')
safe=lambda s: s.replace('</script','<\\/script')
icon='data:image/png;base64,'+base64.b64encode(open(os.path.join(R,'icon-192.png'),'rb').read()).decode()
html=html.replace('<link rel="manifest" href="manifest.webmanifest">\n','')
html=html.replace('<link rel="icon" href="icon-192.png">',f'<link rel="icon" href="{icon}">').replace('<link rel="apple-touch-icon" href="icon-192.png">\n','')
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+rd('styles.css')+'\n</style>')
html=html.replace('<script src="questions.js"></script>','<script>window.ASVAB_SINGLE_FILE=true;\n'+safe(rd('questions.js'))+'</script>')
html=html.replace('<script src="tutor_rules.js"></script>','<script>'+safe(rd('tutor_rules.js'))+'</script>')
html=html.replace('<script src="app.js"></script>','<script>\n'+safe(rd('app.js'))+'\n</script>')
assert 'src="' not in html and 'href="styles' not in html
open(os.path.join(R,'asvab-coach.html'),'w',encoding='utf-8').write(html)
print('asvab-coach.html', len(html)//1024, 'KB')
