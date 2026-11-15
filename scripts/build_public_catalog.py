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
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
REPO = 'samuel-resource-members/international-stem-members'
RAW = f'https://raw.githubusercontent.com/{REPO}/main'
REL = f'https://github.com/{REPO}/releases/download'
CATALOG = ROOT / 'catalog'
QUESTIONS = ROOT / 'questions'
CHUNK = 80
SUBJECTS = {'math': '数学', 'physics': '物理', 'chemistry': '化学', 'biology': '生物', 'science': '综合科学'}


def cell(value):
    return str(value or '').replace('|', '\\|').replace('\n', ' ').strip()


def chapter_anchor(value):
    return 'chapter-' + hashlib.sha256(value.encode()).hexdigest()[:10]


def paper_identity(entry):
    """Only recover missing display fields from an explicit Cambridge paper code."""
    year, session, paper = entry.get('year'), entry.get('session'), entry.get('paper')
    match = re.search(r'(?:^|[-_:])(\d{4})-([msw])(\d{2})-(?:qp|ms)-(\d{2})(?:$|[-_])', entry['group'])
    if match:
        year = year or 2000 + int(match[3])
        session = session or {'m': 'February/March', 's': 'May/June', 'w': 'October/November'}[match[2]]
        paper = paper or match[4]
    label_parts = [str(v) for v in [session, ('Paper ' + str(paper)) if paper else '', entry.get('variant')] if v and v != 'annual']
    return str(year or '年份未标注'), ' · '.join(label_parts) or entry['group']


def question_link(question):
    prefix = f'{RAW}/questions/'
    target = question.get('question_file', '')
    if not target.startswith(prefix):
        raise ValueError(f"Question link is outside this catalogue: {question['id']}")
    relative = '../../questions/' + target[len(prefix):]
    if not (CATALOG / 'papers' / unquote(relative)).resolve().is_file():
        raise ValueError(f'Missing question page: {relative}')
    return f"[Q{cell(question.get('question_number') or question['id'])}]({relative})"


TOPIC_LABELS = {
    'Algebra': '代数', 'Geometry': '几何', 'Number theory': '数论',
    'Counting and probability': '计数与概率', 'Logic and data': '逻辑与数据',
    'Vectors and Voronoi diagrams': '向量与 Voronoi 图',
    'Probability and statistics': '概率与统计', 'Integration': '积分',
    'Complex numbers': '复数', 'Permutations and combinations': '排列组合',
    'Differentiation': '微分', 'Additional Mathematics': '附加数学',
}


def teacher_shelf():
    groups = collections.defaultdict(lambda: collections.defaultdict(list))
    courses = collections.defaultdict(list)
    for book in json.loads((ROOT / 'data/library-books.json').read_text())['books']:
        if not book.get('url') or not book.get('reader_course'):
            continue
        label = book['reader_course']
        groups[label][book['section']].append((book['classification'], book['url']))
        for course in [book['course'], *book.get('related_courses', [])]:
            if label not in courses[course]:
                courses[course].append(label)

    def anchor(label):
        return 'books-' + re.sub('[^a-z0-9]+', '-', label.lower()).strip('-')

    lines = ['# 教材与讲义', '', '[按课程找原卷与分类题](README.md)', '',
             '选择课程，再点学生册、详解册或练习名称即可下载 PDF。', '']
    lines += [' · '.join(f'[{cell(name)}](#{anchor(name)})' for name in groups), '']
    for name, sections in groups.items():
        lines += [f'<a id="{anchor(name)}"></a>', '', f'## {cell(name)}', '',
                  '| 卷别或专题 | 教材与讲义 |', '| --- | --- |']
        if name == 'IGCSE 0654':
            lines[-2:-2] = ['[历年原卷与评分](courses/CIE-0654-originals.md)', '']
        for section, resources in sections.items():
            links = ' · '.join(f'[{cell(label)}]({url})' for label, url in resources)
            translated = TOPIC_LABELS.get(section)
            title = f'{translated} · {section}' if translated else section
            lines.append(f'| {cell(title)} | {links} |')
        lines.append('')
    (CATALOG / 'books.md').write_text('\n'.join(lines), encoding='utf-8')
    return {course: ' · '.join(f'[{cell(label)} 教材与讲义](../books.md#{anchor(label)})' for label in labels)
            for course, labels in courses.items()}


def coordinated_science_originals():
    records = json.loads((ROOT / 'data/reader-papers.json').read_text())['papers']
    hosts = {'pastpapers.papacambridge.com', 'papers.xtremepape.rs', 'azpastpapers.com'}
    kinds = {'question_paper': '题卷', 'mark_scheme': '评分'}
    by_year = collections.defaultdict(lambda: collections.defaultdict(dict))
    for record in records:
        if (not record['id'].startswith('caie-igcse-0654-') or record.get('access') != 'public'
                or record.get('document_type') not in kinds):
            continue
        url = record.get('url', '')
        location = urlparse(url)
        if location.scheme != 'https' or location.hostname not in hosts or not location.path.lower().endswith('.pdf'):
            continue
        sitting = (record['session'], record['paper'], record['variant'])
        by_year[record['year']][sitting][record['document_type']] = url
    years = sorted(by_year, reverse=True)
    lines = ['# IGCSE 0654 综合科学历年原卷与评分', '',
             '[综合科学教材与讲义](../books.md#books-igcse-0654) · [按章节找题](CIE-0654.md#chapters)', '',
             ' · '.join(f'[{year}](#year-{year})' for year in years), '']
    for year in years:
        lines += [f'<a id="year-{year}"></a>', '', f'## {year}', '',
                  '| 考季 | 卷号 | 题卷与评分 |', '| --- | --- | --- |']
        for (session, paper, variant), documents in sorted(by_year[year].items()):
            links = [f'[{label}](<{documents[kind]}>)' for kind, label in kinds.items() if kind in documents]
            lines.append(f"| {cell(session)} | {cell(paper)}{cell(variant)} | {' · '.join(links)} |")
        lines.append('')
    (CATALOG / 'courses' / 'CIE-0654-originals.md').write_text('\n'.join(lines), encoding='utf-8')


def build_human_catalog():
    """Create readable views from existing identities without rewriting question content."""
    index = json.loads((CATALOG / 'index.json').read_text(encoding='utf-8'))
    courses = index['courses']
    overlay_path = ROOT / 'data' / 'reader-question-files.json'
    overlay = json.loads(overlay_path.read_text(encoding='utf-8')) if overlay_path.is_file() else {}
    retired = {qid for qid, value in overlay.get('questions', {}).items() if value.get('retired') is True}
    shelves = teacher_shelf()
    coordinated_science_originals()
    overview = ['# 按学科找题', '', '[返回首页](../README.md) · [教材与讲义](books.md) · [在线检索](https://stem-member-library.xpartara.workers.dev/library)', '',
                '选择课程，再按章节、年份或试卷查阅题目。题目页保留原题及已有分类；完整题面与图表请以原题文件为准。', '']
    generated = set()
    for subject, title in SUBJECTS.items():
        selected = [c for c in courses if c.get('subject') == subject]
        if not selected:
            continue
        overview += [f'## {title}', '', '| 课程 | 年份 | 题目 |', '| --- | --- | ---: |']
        for c in selected:
            filename = Path(urlparse(c['file']).path).name
            course_path = CATALOG / 'courses' / filename
            course = json.loads(course_path.read_text(encoding='utf-8'))
            course_md = course_path.with_suffix('.md')
            chapters = collections.defaultdict(list)
            groups = []
            for entry in course['papers']:
                paper_json = CATALOG / 'papers' / Path(urlparse(entry['file']).path).name
                data = json.loads(paper_json.read_text(encoding='utf-8'))
                paper_md = paper_json.with_suffix('.md')
                questions = [q for q in data['questions'] if q['id'] not in retired]
                year, paper_label = paper_identity(entry)
                chapter_groups = collections.defaultdict(list)
                for q in questions:
                    chapter_groups[q.get('chapter') or '未标注章节'].append(q)
                paper_lines = [f"# {cell(c['course_id'])} · {cell(year)} · {cell(paper_label)}", '',
                               f"[返回课程](../courses/{course_md.name}) · [全部课程](../README.md)", '',
                               '点击题号查看题目。', '']
                for chapter, members in sorted(chapter_groups.items()):
                    anchor = chapter_anchor(chapter)
                    paper_lines += [f'<a id="{anchor}"></a>', '', f'## {cell(chapter)}', '',
                                    '| 题目 | 知识点 | 题型 |', '| --- | --- | --- |']
                    paper_lines += [f"| {question_link(q)} | {cell(q.get('knowledge_point')) or '—'} | {cell(q.get('problem_type')) or '—'} |" for q in members]
                    paper_lines.append('')
                    chapters[chapter].append((year, paper_label, paper_md.name, len(members), anchor))
                paper_md.write_text('\n'.join(paper_lines) + '\n', encoding='utf-8')
                generated.add(paper_md)
                groups.append((year, paper_label, paper_md.name, len(questions), list(chapter_groups), questions[0] if questions else None))
            question_count = sum(group[3] for group in groups)
            overview.append(f"| [{cell(c['course_id'])}](courses/{course_md.name}) | {cell(c.get('years')) or '见课程目录'} | {question_count:,} |")
            lines = [f"# {cell(c['course_id'])}", '', '[全部课程](../README.md) · [在线检索](https://stem-member-library.xpartara.workers.dev/library)', '',
                     f"{title} · {question_count:,} 道题 · {len(groups):,} 个试卷或题组入口", '',
                     '[按年份与试卷](#papers) · [按章节](#chapters)', '', '<a id="papers"></a>', '', '## 年份与试卷', '']
            shelf = shelves.get(c['course_id'].lower())
            if shelf:
                lines[3:3] = ['', shelf]
            if c['course_id'] == 'CIE-0654':
                lines[3:3] = ['', '[历年原卷与对应评分](CIE-0654-originals.md)']
            by_year = collections.defaultdict(list)
            for group in groups:
                by_year[group[0]].append(group)
            for year in sorted(by_year, reverse=True):
                lines += [f'### {cell(year)}', '', '| 试卷 / 题组 | 题目 | 章节 |', '| --- | --- | --- |']
                for _, paper_label, name, count, names, first in by_year[year]:
                    first_link = question_link(first) if first else ''
                    lines.append(f"| [{cell(paper_label)}](../papers/{name}) | {first_link} · [全部 {count} 题](../papers/{name}) | {cell('、'.join(names))} |")
                lines.append('')
            lines += ['<a id="chapters"></a>', '', '## 章节', '']
            for chapter, entries in sorted(chapters.items()):
                lines += [f'### {cell(chapter)}', '', ' · '.join(
                    f"[{cell(year)} {cell(label)}（{count} 题）](../papers/{filename}#{anchor})"
                    for year, label, filename, count, anchor in entries), '']
            course_md.write_text('\n'.join(lines) + '\n', encoding='utf-8')
            generated.add(course_md)
        overview.append('')
    overview += ['[资料维护与批量取用](../docs/library-maintenance.md)', '']
    (CATALOG / 'README.md').write_text('\n'.join(overview), encoding='utf-8')
    print(f'human_courses={len(courses)} human_papers={sum(1 for p in generated if p.parent.name == "papers")}')


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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--human-only', action='store_true', help='Refresh readable course and paper views from the existing catalogue only')
    args = parser.parse_args()
    if args.human_only:
        build_human_catalog()
        return
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
    build_human_catalog()


if __name__ == '__main__':
    main()
