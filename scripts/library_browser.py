#!/usr/bin/env python3
"""Human reader over the existing indexes; files are restored only when opened.

No new question database or archive is created. This module is copied, byte for
byte, into the member distribution by sync_reader.py.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from functools import lru_cache
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import shutil
import threading
import tempfile
import time
from urllib.parse import parse_qs, quote, unquote, urlparse
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
SUBJECTS = {'math': '数学', 'physics': '物理', 'chemistry': '化学', 'biology': '生物',
            'science': '综合科学', 'economics': '经济', 'business': '商科'}
CODE_SUBJECT = {'0580':'math','0606':'math','9709':'math','0610':'biology','9700':'biology',
                '0625':'physics','9702':'physics','0620':'chemistry','9701':'chemistry',
                '0654':'science','0455':'economics','9708':'economics','0450':'business','9609':'business'}
DOCUMENTS = {'question_paper':'试卷','mark_scheme':'评分标准','answer_key':'答案',
             'solutions':'详解','examiner_report':'考官报告','specimen':'样卷',
             'question_booklet':'分类练习','mark_scheme_booklet':'分类评分标准'}


def read_json(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else default


def course_key(value):
    value = str(value or '').strip().lower().replace('_', '-').replace('caie-', 'cie-')
    return {'edexcel-uk':'edexcel-uk-math'}.get(value,value)


def subject_for(course, fallback=''):
    for word in ('physics','chemistry','biology','economics','business'):
        if word in course: return word
    match = re.search(r'(?<!\d)(\d{4})(?!\d)', course)
    if match and match[1] in CODE_SUBJECT: return CODE_SUBJECT[match[1]]
    if fallback: return fallback
    if course in ('bbo','ibo','nzibo','toronto-biology'): return 'biology'
    if course in ('usnco',): return 'chemistry'
    if course.startswith(('bpho','usapho','ipho','fma','physicsbowl')): return 'physics'
    return 'math'


def paper_course(row):
    if row.get('course_id'): return course_key(row['course_id'])
    exam, ident = row.get('exam_id', ''), row.get('id', '')
    if exam.startswith('caie'):
        match = re.search(r'(?<!\d)(0\d{3}|9\d{3})(?!\d)', str(row.get('syllabus_code',''))+' '+ident)
        if match: return 'cie-'+match[1]
    if exam == 'ib-dp':
        level = re.search(r'-(hl|sl)(?:-|$)', ident)
        track = re.search(r'-(aa|ai)(?:-|$)', ident)
        subject = track[1] if track else row.get('subject','')
        return 'ib-'+subject+('-'+level[1] if level else '')
    if exam == 'hkdse':
        match = re.match(r'hkdse-(core|m1|m2)(?:-|$)', ident)
        return 'dse-'+(match[1] if match else row.get('subject',''))
    if exam == 'edexcel-ial':
        unit = re.search(r'unit[-\s]+(\d+)', str(row.get('paper','')).lower())
        subject = row.get('subject','')
        if subject == 'math':
            component = re.search(r'\b(fp[123]|[pmsfd]\d|c12|c34)\b', str(row.get('paper','')).lower())
            if component: return 'ial-math-'+component[1]
            code=re.search(r'W(MA1[1-4]|FM0[1-3]|ME0[1-3]|ST0[1-3]|DM11)',ident.upper())
            if code:
                part={'MA':'p','FM':'f','ME':'m','ST':'s','DM':'d'}[code[1][:2]]
                return 'ial-math-'+part+code[1][-1]
        if not unit:
            code=re.search(r'W(?:PH|BI|CH)(?:0|1)(\d)',ident.upper())
            if code: return 'ial-'+subject+'-unit-'+code[1]
        return 'ial-'+subject+('-unit-'+unit[1] if unit else '')
    if exam in ('edexcel-uk','edexcel-igcse','aqa-a-level','ocr-a-level'):
        return exam+'-'+row.get('subject','')
    return course_key(exam)


def course_label(course):
    if course.startswith('cie-'): return 'CIE '+course[4:].upper()
    if course.startswith('ib-'): return 'IB '+course[3:].replace('-', ' ').upper()
    if course.startswith('dse-'): return 'DSE '+course[4:].replace('-', ' ').upper()
    return course.replace('-', ' ').upper()


def friendly_name(title, suffix='.pdf'):
    text = re.sub(r'[\x00-\x1f/\\:*?"<>|]', ' ', str(title))
    text = re.sub(r'\s+', ' ', text).strip(' .')[:140] or '资料'
    return text if text.lower().endswith(suffix.lower()) else text+suffix


def flatten(value):
    if isinstance(value, str): return value
    if isinstance(value, list): return ' '.join(flatten(v) for v in value)
    if isinstance(value, dict): return ' '.join(flatten(value.get(k,'')) for k in
        ('primary','placements','chapter','section','knowledge_point','problem_type','subtype'))
    return ''


def question_year(row):
    explicit=row.get('year') or (row.get('extra') or {}).get('year')
    if explicit: return explicit
    source=(row.get('extra') or {}).get('source_as_recorded','')
    match=re.search(r'(?<!\d)((?:19|20)\d{2})(?!\d)',source or row.get('id',''))
    if match: return int(match[1])
    match=re.search(r'-(?:s|w|m)(\d{2})-',row.get('id',''))
    return 2000+int(match[1]) if match else None


def question_subject(row, course):
    if course=='cie-0654':
        for part in ('physics','biology','chemistry'):
            if ':'+part+':' in row.get('id',''): return part
        return 'science'
    return subject_for(course,row.get('subject',''))


def github_asset(url):
    parsed=urlparse(url or '')
    match=re.fullmatch(r'/([^/]+/[^/]+)/releases/download/([^/]+)/(.+)',parsed.path)
    if parsed.scheme=='https' and parsed.netloc=='github.com' and match:
        return {'kind':'release','repository':match[1],'tag':unquote(match[2]),'asset':unquote(match[3])}
    return None


class Library:
    def __init__(self, root=ROOT, local_books=None):
        self.root = Path(root)
        self.member = (self.root/'scripts/member_download.py').is_file()
        self.store = read_json(self.root/'data/pdf-store.json', {'files':{}, 'shards':{}})
        self.by_sha = {}
        for path, meta in self.store['files'].items(): self.by_sha.setdefault(meta.get('sha256'), path)
        self.files = {}; self.salt = secrets.token_hex(16); self.lock = threading.RLock()
        self.courses = {}; self.papers = []
        raw = read_json(self.root/'data/papers.json')
        if raw is None: raw = read_json(self.root/'data/reader-papers.json', {}).get('papers', [])
        for row in raw:
            course = paper_course(row); subject = row.get('subject') or subject_for(course)
            title = ' · '.join(str(v) for v in [course_label(course), row.get('year'), row.get('session'),
                ('P'+str(row['paper'])) if row.get('paper') else '', row.get('variant'),
                DOCUMENTS.get(row.get('document_type'),row.get('document_type'))] if v)
            self.papers.append({'id':row['id'],'title':title,'course':course,'subject':subject,
                'year':row.get('year'),'classification':DOCUMENTS.get(row.get('document_type'),''),'_raw':row})
            self.count(course, subject, 'papers')
        self.manifest = read_json(self.root/'coordination/catalogue/manifest.json', {'courses':{}})
        self.reader_extra = read_json(self.root/'data/reader-question-files.json', {}).get('questions',{})
        self.member_questions = defaultdict(list)
        if self.member:
            for row in read_json(self.root/'data/questions.json', []):
                overlay=self.reader_extra.get(row['id'],{})
                if overlay.get('retired'): continue
                if overlay.get('year') and not row.get('year'): row['year']=overlay['year']
                course = course_key(row['course_id']); self.member_questions[course].append(row)
                self.count(course, row.get('subject') or subject_for(course), 'questions')
        else:
            for course, meta in self.manifest['courses'].items():
                active=meta['search_records']-meta.get('classification_states',{}).get('retired_as_reference_only',0)
                self.count(course_key(course), subject_for(course), 'questions', active)
        topical = read_json(self.root/'data/topical-resources.json', {}).get('resources', [])
        self.topical = defaultdict(list)
        for row in topical:
            course = course_key(row.get('course_id')); self.topical[course].append(row)
            self.count(course, subject_for(course), 'questions')
        self.books = read_json(self.root/'data/library-books.json', {}).get('books', [])
        if local_books and Path(local_books).is_file() and not self.member:
            self.books += read_json(Path(local_books), {}).get('books', [])
        # Multiple aliases to the exact same reader PDF appear only once.
        unique = {}; by_id={b['id']:dict(b) for b in self.books}; self.books=list(by_id.values())
        for book in self.books:
            ref = book.get('ref', {}); key = ref.get('sha256') or book['id']
            if key not in unique: unique[key] = book
            elif ref.get('kind') == 'local': unique[key]['ref'] = ref
        self.books = list(unique.values())
        for book in self.books: self.count(book['course'],book['subject'],'books')
        self.papers.sort(key=lambda p:(str(p.get('year') or ''),p['id']),reverse=True)

    def count(self, course, subject, kind, amount=1):
        entry = self.courses.setdefault(course, {'id':course,'label':course_label(course),
            'subject':subject,'subjects':[],'papers':0,'questions':0,'books':0})
        if subject not in entry['subjects']: entry['subjects'].append(subject)
        if course=='cie-0654': entry['subjects']=list(dict.fromkeys(entry['subjects']+['science','physics','chemistry','biology']))
        if subject != entry['subject']: entry['subject'] = 'science'
        entry[kind] += amount

    def summary(self):
        return {'courses':list(self.courses.values()),'counts':{
            kind:sum(c[kind] for c in self.courses.values()) for kind in ('papers','questions','books')}}

    def register(self, ref, name, label='', size=None):
        identity = json.dumps(ref, ensure_ascii=False, sort_keys=True)
        key = hashlib.sha256((self.salt+identity).encode()).hexdigest()[:32]
        with self.lock: self.files[key] = (ref,name)
        return {'id':key,'name':name,'label':label,'bytes':size or ref.get('bytes'), 'available':True}

    def store_file(self, path, name, label=''):
        meta = self.store['files'].get(path)
        if meta: return self.register({'kind':'store','path':path,**meta}, name, label, meta['bytes'])
        return None

    def paper_files(self, row, title):
        name = friendly_name(title); paths = []
        preferred = row.get('preferred_original_pdf_storage') or {}
        if preferred.get('path'): paths.append(preferred['path'])
        paths += [row.get(k) for k in ('pdf_store_path','stored_pdf','source_pdf') if isinstance(row.get(k),str)]
        paths += [a['path'] for a in row.get('original_pdf_storage',[]) if a.get('path')]
        paths += [a['path'] for a in row.get('assets',[]) if a.get('kind')=='repository' and a.get('path')]
        if row.get('source_sha256') in self.by_sha: paths.append(self.by_sha[row['source_sha256']])
        for path in paths:
            found = self.store_file(path,name)
            if found: return [found]
        for key in ('stored_pdf_url','archive_asset_url'):
            ref=github_asset(row.get(key))
            if ref and ref['asset'].lower().endswith('.pdf'):
                if self.member and ref['repository']!=self.store.get('repository'): continue
                ref['sha256']=row.get('stored_asset_sha256') or row.get('source_sha256')
                return [self.register(ref,name)]
        # Public original links stay usable when an archived copy is unavailable.
        for key in ('url','source_url'):
            url = row.get(key,'')
            if isinstance(url,str) and url.startswith('https://'):
                suffix = '.pdf' if urlparse(url).path.lower().endswith('.pdf') else '.html'
                return [{'url':url,'name':friendly_name(title,suffix),'available':True}]
        return []

    @lru_cache(maxsize=2)
    def question_rows(self, course):
        if self.member: return self.member_questions.get(course,[])
        actual=next((c for c in self.manifest['courses'] if course_key(c)==course),course)
        meta = self.manifest['courses'].get(actual,{})
        rows = []
        for path in meta.get('files',[]):
            with (self.root/path).open(encoding='utf-8') as stream:
                rows += [q for line in stream if line.strip() for q in [json.loads(line)]
                         if q.get('classification_state')!='retired_as_reference_only']
        return rows

    def question_item(self, row, course):
        extra = row.get('extra') or {}; year = question_year(row)
        overlay=self.reader_extra.get(row['id'],{})
        classification = row.get('classification') or {k:row.get(k,'') for k in ('chapter','knowledge_point','problem_type')}
        title = extra.get('source_as_recorded') or overlay.get('title') or row['id']
        files=[]; expected=row.get('question_pdf_sha256') or row.get('preferred_pdf_sha256')
        if expected in self.by_sha:
            files.append(self.store_file(self.by_sha[expected],friendly_name(title),'题目'))
        elif self.member:
            for path in row.get('paths',[]):
                found=self.store_file(path,friendly_name(title+' · '+Path(path).name),'题目')
                if found: files.append(found)
            for ref in overlay.get('refs',[]):
                files.append(self.register(ref,friendly_name(title),'题目'))
            for pkg in ([] if overlay.get('refs') else row.get('packages',[])):
                name=friendly_name(title) if pkg.get('member') else pkg['name']
                files.append(self.register({'kind':'release','repository':self.store.get('repository'),
                    'tag':pkg['tag'],'asset':pkg['name'],'member':pkg.get('member')},name,'题目'))
        else:
            for asset in row.get('assets',[]):
                if asset.get('kind')=='repository':
                    found=self.store_file(asset.get('path'),friendly_name(title),'题目')
                    if found: files.append(found)
                elif asset.get('kind')=='release':
                    member=asset.get('member') or asset.get('member_reference') or asset.get('relative_to_handoff')
                    if asset.get('relative_to_handoff') and asset.get('handoff'):
                        member=asset['handoff'].rstrip('/')+'/'+asset['relative_to_handoff']
                    name=friendly_name(title) if member else asset['asset']
                    files.append(self.register({'kind':'release','repository':asset.get('repository') or self.store.get('repository'),
                        'tag':asset['tag'],'asset':asset['asset'],'member':member,'sha256':expected,
                        'package_sha256':asset.get('source_package_sha256')},name,'题目'))
        for answer in row.get('answer_candidates',extra.get('answer_candidates',[])) or []:
            if not isinstance(answer,dict): continue
            answer_title=answer.get('title') or '参考评分资料'
            answer_file=self.store_file(answer.get('local_pdf'),friendly_name(answer_title),'参考评分资料')
            if answer_file: files.append(answer_file)
            elif str(answer.get('url','')).startswith('https://'):
                files.append({'url':answer['url'],'name':friendly_name(answer_title,'.pdf' if '.pdf' in answer['url'].lower() else '.html'),
                              'label':'参考评分资料','available':True})
        # Keep matching provenance statuses internally; no classification is upgraded.
        label=flatten(classification)
        if row.get('classification_state')=='automatic_suggestion': label += '（题型参考）'
        return {'id':row['id'],'title':title,'course':course,'subject':question_subject(row,course),
            'year':year,'classification':label,'text':row.get('text',row.get('search_text','')),'files':files}

    def search(self, params):
        kind=params.get('kind','papers'); course=params.get('course',''); subject=params.get('subject','')
        if kind not in ('papers','questions','books'): raise ValueError('未知资料类型')
        limit=max(1,min(100,int(params.get('limit',30)))); offset=max(0,int(params.get('offset',0)))
        terms=params.get('q','').casefold().split(); year=params.get('year','')
        if kind=='questions' and not course: return {'total':0,'items':[]}
        if kind=='papers': rows=self.papers
        elif kind=='books': rows=self.books
        else:
            # Filter raw rows before resolving links or registering files.
            rows=[]
            for q in self.question_rows(course):
                rows.append({'id':q['id'],'course':course,'subject':question_subject(q,course),
                    'year':question_year(q),
                    'title':(q.get('extra') or {}).get('source_as_recorded') or self.reader_extra.get(q['id'],{}).get('title') or q['id'],
                    'text':q.get('text',q.get('search_text','')),
                    'classification':q.get('classification') or {k:q.get(k) for k in ('chapter','knowledge_point','problem_type')},'_raw':q})
            for t in self.topical.get(course,[]):
                rows.append({'id':t['id'],'course':course,'subject':subject_for(course),'title':t['title'],
                    'year':t.get('year'),'classification':'专题练习','_topical':t})
        matches=[]
        for row in rows:
            if course and row['course']!=course: continue
            if subject and row['subject']!=subject and not (subject=='science' and row['course']=='cie-0654'): continue
            if year and str(row.get('year') or '')!=year: continue
            text=' '.join([str(row.get(k) or '') for k in ('id','title','text','year')]+[flatten(row.get('classification'))]).casefold()
            if not all(term in text for term in terms): continue
            matches.append(row)
        results=[]
        for raw in matches[offset:offset+limit]:
            row={k:v for k,v in raw.items() if not k.startswith('_') and k not in ('ref','url','name','status','source')}
            if kind=='papers': row['files']=self.paper_files(raw['_raw'],row['title'])
            elif kind=='books':
                if raw.get('ref'): row['files']=[self.register(raw['ref'],raw.get('name') or friendly_name(row['title']))]
                else: row['files']=[{'url':raw.get('url'),'name':raw.get('name') or friendly_name(row['title']), 'available':bool(raw.get('url'))}]
            elif raw.get('_topical'): row['files']=self.paper_files(raw['_topical'],row['title'])
            else: row=self.question_item(raw['_raw'],course)
            results.append(row)
        return {'total':len(matches),'items':results}


class ReaderServer(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self, address, library, cache):
        self.library=library; self.cache=Path(cache); self.last_request=time.monotonic()
        self.file_lock=threading.Lock()
        from library_files import FileResolver
        self.resolver=FileResolver(library.root,cache_root=self.cache/'assets')
        super().__init__(address, ReaderHandler)


class ReaderHandler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass

    def send_bytes(self, data, mime, status=200):
        self.send_response(status);self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff');self.end_headers()
        if self.command!='HEAD': self.wfile.write(data)

    def do_HEAD(self): self.do_GET()

    def do_GET(self):
        self.server.last_request=time.monotonic()
        host=self.headers.get('Host',''); expected='127.0.0.1:'+str(self.server.server_port)
        if host!=expected:
            return self.send_bytes(b'Local access only','text/plain',403)
        origin=self.headers.get('Origin')
        if origin and origin!='http://'+expected:
            return self.send_bytes(b'Local access only','text/plain',403)
        route=urlparse(self.path); library=self.server.library
        try:
            if route.path in ('/','/index.html'):
                source=library.root/('reader.html' if library.member else 'index.html')
                return self.send_bytes(source.read_bytes(),'text/html; charset=utf-8')
            if route.path=='/api/library/summary': result=library.summary()
            elif route.path=='/api/library/search':
                result=library.search({k:v[-1] for k,v in parse_qs(route.query).items()})
            elif route.path.startswith('/api/library/file/'):
                token=unquote(route.path.rsplit('/',1)[-1])
                if token not in library.files: return self.send_bytes('文件入口已失效，请返回目录重新打开。'.encode(),'text/plain; charset=utf-8',404)
                ref,name=library.files[token]; destination=self.server.cache/'opened'/token/name
                with self.server.file_lock:
                    path=self.server.resolver.resolve(ref,destination)
                self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(name)[0] or 'application/octet-stream')
                self.send_header('Content-Disposition',"inline; filename*=UTF-8''"+quote(name))
                self.send_header('Content-Length',str(path.stat().st_size));self.send_header('X-Content-Type-Options','nosniff')
                self.end_headers()
                if self.command!='HEAD':
                    with path.open('rb') as source: shutil.copyfileobj(source,self.wfile,1024*1024)
                return
            else: return self.send_bytes(b'Not found','text/plain',404)
            self.send_bytes(json.dumps(result,ensure_ascii=False).encode(),'application/json; charset=utf-8')
        except (BrokenPipeError,ConnectionResetError): pass
        except ValueError as error:
            self.send_bytes(json.dumps({'error':str(error)},ensure_ascii=False).encode(),'application/json; charset=utf-8',400)
        except Exception as error:
            # Keep local paths, authentication stderr and archive internals out of the reader page.
            print(f'取用失败: {type(error).__name__}: {error}',flush=True)
            self.send_bytes('暂时无法取得文件。请检查网络和 GitHub 登录后，返回目录重试。'.encode(),'text/plain; charset=utf-8',502)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=ROOT)
    parser.add_argument('--port',type=int,default=0)
    parser.add_argument('--no-open',action='store_true')
    parser.add_argument('--idle-minutes',type=int,default=30)
    parser.add_argument('--local-books',type=Path,default=Path.home()/'.config/stem-library/local-books.json')
    args=parser.parse_args()
    library=Library(args.root,args.local_books)
    with tempfile.TemporaryDirectory(prefix='stem-reader-') as cache:
        server=ReaderServer(('127.0.0.1',args.port),library,cache)
        url=f'http://127.0.0.1:{server.server_port}/'
        print('题库已打开：'+url+'\n使用浏览器保存所需 PDF。关闭此终端即可退出。',flush=True)
        if not args.no_open: webbrowser.open(url)
        def idle_stop():
            while True:
                time.sleep(30)
                if args.idle_minutes>0 and time.monotonic()-server.last_request>args.idle_minutes*60:
                    server.shutdown();return
        threading.Thread(target=idle_stop,daemon=True).start()
        try: server.serve_forever()
        except KeyboardInterrupt: pass
        finally: server.server_close()


if __name__=='__main__': main()
