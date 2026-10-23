"""Reuse the frozen member browser and split its data into protected assets."""
from pathlib import Path
import json,re,shutil
from urllib.parse import urlparse,unquote

root=next(p for p in Path(__file__).resolve().parents if (p/'index.html').is_file() and (p/'.admin/transfer-receipt.json').is_file())
portal=Path(__file__).resolve().parents[1]
dist=portal/'dist'
if dist.exists():shutil.rmtree(dist)
dist.mkdir()
shutil.copytree(portal/'public',dist,dirs_exist_ok=True)
html=(root/'index.html').read_text()
html=re.sub(r'<meta\s+http-equiv="Content-Security-Policy"[^>]*>','',html,count=1,flags=re.I)
scripts=list(re.finditer(r'<script\b[^>]*>(.*?)</script>',html,re.S))
assert len(scripts)==4
data=json.loads(scripts[2].group(1));questions=data['questions']
assert len(questions)==27284 and len({q['course_id'] for q in questions})==68
receipts=json.loads((root/'.admin/transfer-receipt.json').read_text())
assets={(x['target_tag'],x['name']):x['destination_id'] for x in receipts}
for q in questions:
    parts=urlparse(q['links']['download']).path.split('/')
    q['links']['download']='/download/'+str(assets[(parts[-2],unquote(parts[-1]))])
chunks=[];part=[];size=0
directory=dist/'catalogue';directory.mkdir(exist_ok=True)
def flush():
    global part,size
    if not part:return
    name=f'part-{len(chunks)}.json'
    (directory/name).write_text('['+','.join(part)+']')
    chunks.append('/catalogue/'+name);part=[];size=0
for q in questions:
    text=json.dumps(q,ensure_ascii=False,separators=(',',':'))
    if size+len(text.encode())>8*1024*1024:flush()
    part.append(text);size+=len(text.encode())
flush()
manifest={'records':len(questions),'courses':sorted({q['course_id'] for q in questions}),'parts':chunks}
(directory/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False))
(dist/'math-config.js').write_text(scripts[0].group(1))
(dist/'mathjax.js').write_text(scripts[1].group(1))
reader=scripts[3].group(1)
reader=reader.replace("const data=JSON.parse(document.getElementById('library-data').textContent),questions=data.questions;", "const manifest=await protectedJson('/catalogue/manifest.json'); const groups=await Promise.all(manifest.parts.map(protectedJson)); const questions=groups.flat();document.getElementById('library-loading').remove();")
bootstrap="""async function protectedJson(url){const r=await fetch(url,{cache:'no-store'});if(r.status===401||r.status===403){location.replace('/');throw new Error('请重新登录。');}if(!r.ok)throw new Error('题库暂时无法载入，请刷新重试。');return r.json();}
document.querySelector('[data-signout]').addEventListener('click',async()=>{await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.replace('/');});
protectedJson('/api/me').then(me=>{document.querySelector('[data-member-email]').textContent=me.email;if(me.role==='admin')document.querySelector('[data-owner-link]').hidden=false;}).catch(()=>{});
(async()=>{try{
"""
(dist/'library.js').write_text(bootstrap+reader+"\n}catch(error){document.getElementById('library-loading').textContent=/[\\u4e00-\\u9fff]/.test(error.message)?error.message:'题库暂时无法载入，请刷新重试。';}})();")
replacements=['<script src="/math-config.js"></script>','<script defer src="/mathjax.js"></script>','','<script defer src="/library.js"></script>']
for match,replacement in reversed(list(zip(scripts,replacements))):html=html[:match.start()]+replacement+html[match.end():]
nav='<nav class="member-nav"><a href="/library" class="wordmark">会员题库</a><div><a href="/resources">资源库</a><a href="/submit">提交资料</a><a href="/account">账户</a><a href="/admin" data-owner-link hidden>管理</a><span data-member-email></span><button type="button" data-signout>退出</button></div></nav>'
html=html.replace('</head>','<link rel="stylesheet" href="/portal.css"><link rel="icon" href="/favicon.svg"></head>')
html=html.replace('<body>','<body class="reader-body">'+nav,1)
html=html.replace('</header>','</header><p id="library-loading" class="loading-note" role="status">正在载入题目…</p>',1)
html=html.replace('公式、图表与完整题面请以题目 PDF 为准。','完整题面与图表请查看题目包。')
(dist/'library.html').write_text(html)
assert max(f.stat().st_size for f in dist.rglob('*') if f.is_file())<25*1024*1024
print(json.dumps({'records':len(questions),'courses':68,'protected_chunks':len(chunks),'bytes':sum(f.stat().st_size for f in dist.rglob('*') if f.is_file())}))
