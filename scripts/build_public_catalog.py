#!/usr/bin/env python3
"""Build the link-navigable public catalogue from data/questions.json and data/pdf-store.json.

Output (all derived, safe to regenerate):
  catalog/index.json                 courses with counts and the file to open next
  catalog/courses/<course>.json      papers / groups inside one course
  catalog/papers/<group>.json        full question records of one paper, with resolved download URLs
  questions/<course>/<question>.md   one question per file: metadata, OCR text, source files
"""
from __future__ import annotations

import collections
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = 'samuel-resource-members/international-stem-members'
RAW = f'https://raw.githubusercontent.com/{REPO}/main'
REL = f'https://github.com/{REPO}/releases/download'
CATALOG = ROOT / 'catalog'
QUESTIONS = ROOT / 'questions'
CHUNK = 80


def safe(name: str) -> str:
    name = re.sub(r'[^A-Za-z0-9._-]+', '_', name).strip('._')
    return name[:150] or 'item'


class Namer:
    """Case-insensitive unique file names inside one directory."""

    def __init__(self):
        self.seen: dict[str, set[str]] = collections.defaultdict(set)

    def __call__(self, directory: str, raw: str) -> str:
        base = safe(raw)
        key = base.lower()
        if key in self.seen[directory]:
            base = f"{base}-{hashlib.sha1(raw.encode()).hexdigest()[:6]}"
            key = base.lower()
        self.seen[directory].add(key)
        return base


def resolve_files(rec, store_files, shards):
    out = []
    for path in rec.get('paths') or []:
        meta = store_files.get(path)
        if not meta:
            out.append({'path': path, 'resolved': False})
            continue
        shard = meta['shard']
        out.append({
            'path': path,
            'bytes': meta['bytes'],
            'sha256': meta['sha256'],
            'shard': shard,
            'shard_bytes': shards.get(shard, {}).get('bytes'),
            'url': f'{REL}/resources/{shard}',
            'resolved': True,
        })
    for pkg in rec.get('packages') or []:
        out.append({
            'package': pkg.get('name'),
            'release': pkg.get('tag'),
            'member': pkg.get('member'),
            'url': f"{REL}/{pkg.get('tag')}/{pkg.get('name')}",
            'resolved': True,
        })
    return out


def flatten(node) -> str:
    if isinstance(node, str):
        return node
    if isinstance(node, dict):
        return ''.join(flatten(c) for c in node.get('children') or [])
    if isinstance(node, list):
        return ''.join(flatten(c) for c in node)
    return str(node)


def group_key(rec) -> str:
    """Paper identity: explicit paper_id, else the paper prefix encoded in the question id / tag, else course+year."""
    if rec.get('paper_id'):
        return rec['paper_id']
    qid = rec['id']
    if '__q' in qid:
        return qid.split('__q')[0]
    for tag in rec.get('topic_tags') or []:
        m = re.match(r'^(.*?)[-_ ]?Q\d+[a-z]?$', tag, flags=re.IGNORECASE)
        if m and m.group(1):
            return m.group(1)
    return f"{rec['course_id']}--{rec.get('year') or 'undated'}--{rec.get('paper') or 'all'}--{rec.get('variant') or 'x'}"


def chunk_by_bytes(members, limit=350_000):
    chunks, cur, size = [], [], 0
    for r in members:
        n = len(json.dumps(r, ensure_ascii=False).encode())
        if cur and size + n > limit:
            chunks.append(cur); cur, size = [], 0
        cur.append(r); size += n
    if cur or not chunks:
        chunks.append(cur)
    return chunks


def label(rec) -> str:
    parts = [rec['course_id'], str(rec.get('year') or ''), rec.get('session') or '', rec.get('paper') or '', rec.get('variant') or '']
    parts = [p for p in parts if p and p != 'annual']
    return ' · '.join(parts) + f" · Q{rec.get('question_number') or '?'}"


def question_markdown(rec, files) -> str:
    lines = [f"# {label(rec)}", '']
    meta = [
        ('id', rec['id']), ('course', rec['course_id']), ('exam', rec.get('exam_id')), ('subject', rec.get('subject')),
        ('year', rec.get('year')), ('session', rec.get('session')), ('paper', rec.get('paper')), ('variant', rec.get('variant')),
        ('question_number', rec.get('question_number')), ('paper_id', rec.get('paper_id')),
        ('chapter', rec.get('chapter')), ('knowledge_point', rec.get('knowledge_point')), ('problem_type', rec.get('problem_type')),
        ('topic_tags', ', '.join(rec.get('topic_tags') or [])),
    ]
    for k, v in meta:
        if v not in (None, '', []):
            lines.append(f"- {k}: {v}")
    display = rec.get('display') or {}
    if display.get('stem_nodes'):
        lines += ['', '## Statement', '']
        for node in display['stem_nodes']:
            lines += [flatten(node).strip(), '']
        if display.get('choices'):
            lines += ['Choices:', '']
            for c in display['choices']:
                lines.append(f"- {flatten(c)}")
            lines.append('')
    text = (rec.get('search_text') or '').strip('\n')
    lines += ['', '## Text (OCR)', '', '```text', text if text else '(no OCR text; use the source file below)', '```', '']
    answers = rec.get('answer_candidates') or []
    if answers:
        lines += ['## Answer / mark scheme candidates', '']
        for a in answers:
            if isinstance(a, dict):
                lines.append(f"- [{a.get('title') or a.get('url')}]({a.get('url')})")
            else:
                lines.append(f"- {a}")
        lines.append('')
    lines += ['## Source files', '']
    if not files:
        lines.append('- (no stored file for this question)')
    for f in files:
        if 'package' in f:
            member = f" · member `{f['member']}`" if f.get('member') else ''
            lines.append(f"- package `{f['package']}` (release `{f['release']}`){member}: {f['url']}")
        elif f.get('resolved'):
            mb = round((f.get('shard_bytes') or 0) / 1048576)
            lines.append(f"- `{f['path']}` ({f['bytes']} bytes, sha256 `{f['sha256']}`) inside shard `{f['shard']}` ({mb} MB): {f['url']}")
        else:
            lines.append(f"- `{f['path']}` (not in the current store index)")
    lines += ['', 'Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.', '']
    return '\n'.join(lines)


def main():
    recs = json.load(open(ROOT / 'data/questions.json', encoding='utf-8'))
    store = json.load(open(ROOT / 'data/pdf-store.json', encoding='utf-8'))
    store_files, shards = store['files'], store['shards']
    for d in (CATALOG, QUESTIONS):
        if d.exists():
            shutil.rmtree(d)
    (CATALOG / 'courses').mkdir(parents=True)
    (CATALOG / 'papers').mkdir(parents=True)
    namer = Namer()

    by_course = collections.defaultdict(list)
    for r in recs:
        by_course[r['course_id']].append(r)

    unresolved = 0
    index_courses = []
    for course_id in sorted(by_course):
        course_recs = by_course[course_id]
        course_file = namer('courses', course_id) + '.json'
        qdir = QUESTIONS / safe(course_id)
        qdir.mkdir(parents=True, exist_ok=True)
        groups = collections.OrderedDict()
        for r in course_recs:
            groups.setdefault(group_key(r), []).append(r)
        group_entries = []
        for key, members in groups.items():
            chunks = chunk_by_bytes(members)
            for ci, chunk in enumerate(chunks):
                gkey = key if len(chunks) == 1 else f"{key}--part{ci + 1:02d}"
                gfile = namer('papers', gkey) + '.json'
                questions = []
                for r in chunk:
                    files = resolve_files(r, store_files, shards)
                    unresolved += sum(1 for f in files if not f.get('resolved'))
                    qfile = namer(f'q/{course_id}', r['id']) + '.md'
                    (qdir / qfile).write_text(question_markdown(r, files), encoding='utf-8')
                    rec = dict(r)
                    rec['files'] = files
                    rec['question_file'] = f"{RAW}/questions/{safe(course_id)}/{qfile}"
                    questions.append(rec)
                first = chunk[0]
                chapters = sorted({r['chapter'] for r in chunk if r.get('chapter')})
                entry = {
                    'group': gkey,
                    'paper_id': first.get('paper_id') or None,
                    'year': first.get('year'), 'session': first.get('session'), 'paper': first.get('paper'), 'variant': first.get('variant'),
                    'question_count': len(chunk), 'chapters': chapters,
                    'file': f"{RAW}/catalog/papers/{gfile}",
                }
                group_entries.append(entry)
                (CATALOG / 'papers' / gfile).write_text(json.dumps({
                    'group': gkey, 'course_id': course_id, 'repository': REPO,
                    'question_count': len(chunk), 'questions': questions,
                }, ensure_ascii=False, indent=1), encoding='utf-8')
        years = sorted({str(r['year']) for r in course_recs if r.get('year')})
        (CATALOG / 'courses' / course_file).write_text(json.dumps({
            'course_id': course_id, 'subject': course_recs[0].get('subject'), 'exam_id': course_recs[0].get('exam_id'),
            'question_count': len(course_recs), 'years': years,
            'questions_dir': f"{RAW}/questions/{safe(course_id)}/",
            'papers': group_entries,
        }, ensure_ascii=False, indent=1), encoding='utf-8')
        index_courses.append({
            'course_id': course_id, 'subject': course_recs[0].get('subject'), 'exam_id': course_recs[0].get('exam_id'),
            'question_count': len(course_recs), 'paper_count': len(group_entries),
            'years': f"{years[0]}–{years[-1]}" if years else '',
            'classified': sum(1 for r in course_recs if r.get('problem_type')),
            'file': f"{RAW}/catalog/courses/{course_file}",
        })

    subjects = collections.Counter(r.get('subject') for r in recs)
    (CATALOG / 'index.json').write_text(json.dumps({
        'schema_version': 1,
        'repository': f'https://github.com/{REPO}',
        'guide': f'{RAW}/catalog/README.md',
        'question_count': len(recs), 'course_count': len(index_courses), 'subjects': dict(subjects),
        'url_patterns': {
            'course': f'{RAW}/catalog/courses/<course_id>.json',
            'paper': f'{RAW}/catalog/papers/<paper_id>.json',
            'question': f'{RAW}/questions/<course_id>/<question_id>.md',
            'store_shard': f'{REL}/resources/<shard>.zip',
        },
        'courses': index_courses,
    }, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"courses={len(index_courses)} questions={len(recs)} unresolved_paths={unresolved}")


if __name__ == '__main__':
    main()
