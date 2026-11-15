"""Refresh the teacher shelf from the public teaching site's published Git tree."""
import argparse
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = 'samuelyeung-space/samuelyeung-space.github.io'
RAW = f'https://raw.githubusercontent.com/{SITE}/main/public'
COURSES = {
    'AMC 8': 'amc8', 'AMC 10': 'amc10', 'AMC 12': 'amc12',
    'BMO 1': 'bmo1', 'BMO 1 & 2': 'bmo1',
    'IB AA HL': 'ib-aa-hl', 'IB AA SL': 'ib-aa-sl', 'IB AI HL': 'ib-ai-hl',
    'Cambridge 9709': 'cie-9709', 'IGCSE 0580': 'cie-0580', 'IGCSE 0606': 'cie-0606',
    'Edexcel IAL': 'ial-math-p1', 'HKDSE M1': 'dse-m1', 'HKDSE M2': 'dse-m2', 'SAT Math': 'sat-math',
}
LABELS = {
    'Practice questions': '专题练习', 'Student book': '学生册', 'Worked solutions': '详解册',
    'Technique book': '解题方法', 'Formula reference': '公式手册', 'Quick sheet': '公式速查',
    'Problems': '学生册', 'Problems in English': '英文题本', 'Worked proofs': '证明详解',
    'Notes & exercises': '讲义与练习', 'Practice sheet': '练习', 'Six worked problems': '例题详解',
    'Topic guide': '专题讲义', 'Topic workbook': '专题练习',
}

def git(site, *args):
    return subprocess.check_output(['git', '-C', str(site), *args], text=True).strip()

def published_books(site, commit):
    manifest = {}
    for line in git(site, 'ls-tree', '-rl', commit, '--', 'public/books').splitlines():
        info, path = line.split('\t')
        mode, kind, sha, size = info.split()
        if mode == '100644' and kind == 'blob' and path.endswith('.pdf'):
            manifest['/' + path.removeprefix('public/')] = (sha, int(size))
    books = {}
    for lib in ('amc', 'bmo', 'maths'):
        catalogue = json.loads(git(site, 'show', f'{commit}:content/library-{lib}.json'))
        for row in catalogue:
            level = row['level']
            section = row['title']
            if level == 'AP':
                course = 'ap-' + section.replace(' ', '-').lower()
                level = 'AP ' + section
            else:
                course = COURSES[level]
            for file in row['files']:
                path = urlsplit(file['href']).path
                if not re.fullmatch(r'/books/[a-z]+/[a-z0-9._-]+\.pdf', path):
                    raise ValueError(f'Unexpected public PDF path: {path}')
                if path not in manifest or path in books:
                    continue
                sha, size = manifest[path]
                label = file['label'].split(' · ')[0]
                title = row['topic'] if lib == 'amc' and label in ('Student book', 'Worked solutions') else section
                label = file['label'].replace(label, LABELS[label], 1)
                books[path] = {
                    'id': 'teacher/' + path.removeprefix('/books/').removesuffix('.pdf'),
                    'course': course, 'subject': 'math', 'reader_course': level,
                    'section': title, 'classification': label, 'title': f'{level} · {title} · {label}',
                    'name': PurePosixPath(path).name, 'url': RAW + path,
                    'bytes': size, 'source': {'kind': 'public_teaching_library', 'commit': commit, 'blob_sha': sha},
                }
                if level == 'BMO 1 & 2':
                    books[path]['related_courses'] = ['bmo2']
                    books[path]['aliases'] = ['BMO2']
    return list(books.values())

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('site_checkout', type=Path)
    args = parser.parse_args()
    remote = git(args.site_checkout, 'remote', 'get-url', 'origin').rstrip('/').removesuffix('.git')
    if remote not in (f'https://github.com/{SITE}', f'git@github.com:{SITE}'):
        raise ValueError('Expected the public teaching-site repository.')
    # Query the remote branch, independent of unpushed local edits.
    commit = git(args.site_checkout, 'ls-remote', 'origin', 'refs/heads/main').split()[0]
    books = published_books(args.site_checkout, commit)
    if not books:
        raise ValueError('The public teaching site does not contain any listed PDFs.')
    path = ROOT / 'data/library-books.json'
    shelf = json.loads(path.read_text())
    shelf['books'] = [b for b in shelf['books'] if b.get('source', {}).get('kind') != 'public_teaching_library'] + books
    path.write_text(json.dumps(shelf, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{len(books)} published PDFs at {commit}')

if __name__ == '__main__':
    main()
