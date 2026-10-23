#!/usr/bin/env python3
"""Read member resources through the member's own GitHub CLI login.

PDF materialization follows scripts/pdf_store.py in the original question library:
fetch a content-addressed Release shard, validate it, then validate each selected
member before writing its canonical path. This entry point never uploads assets.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
REPO = 'samuel-resource-members/international-stem-members'
MANIFEST = ROOT / 'portal/src/resource-manifest.json'
PDF_INDEX = ROOT / 'data/pdf-store.json'
QUESTIONS = ROOT / 'data/questions.json'
HASH = re.compile(r'[0-9a-f]{64}')
NAME = re.compile(r'[A-Za-z0-9][A-Za-z0-9._-]{0,199}')
TAG = re.compile(r'[A-Za-z0-9][A-Za-z0-9._-]{0,99}')


class DownloadError(Exception):
    pass


def read_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc:
        raise DownloadError(f'无法读取 {path.name}，请先更新题库仓库。') from exc


def gh(*args, capture=True):
    for attempt in range(2):
        try:
            result = subprocess.run(['gh', *args], capture_output=capture, text=True)
        except FileNotFoundError as exc:
            raise DownloadError('请先安装 GitHub CLI：https://cli.github.com/') from exc
        if result.returncode == 0:
            return result.stdout if capture else ''
        error = (result.stderr or '').lower()
        transient = re.search(r'\beof\b|tls[^\n]*timeout|i/o timeout|connection reset|http[ /:]*(?:502|503|504)\b|(?:502 bad gateway|503 service unavailable|504 gateway timeout)', error)
        if transient and attempt == 0:
            continue
        if transient:
            raise DownloadError('GitHub 网络连接暂时失败，请稍后重试。')
        if re.search(r'http[ /:]*(?:401|403|404)\b|bad credentials|not logged|failed to log in|release not found|authentication', error):
            raise DownloadError('GitHub 账号或仓库权限不可用。请确认 gh auth status --hostname github.com 显示会员账号，并已接受仓库邀请。')
        raise DownloadError('GitHub 命令未完成，请检查 GitHub CLI 后重试。')


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def valid_file(path, size, digest):
    return path.is_file() and not path.is_symlink() and path.stat().st_size == size and sha256(path) == digest


def target_path(root, relative):
    if not isinstance(relative, str) or not relative or '\\' in relative or ':' in relative or any(ord(char) < 32 or ord(char) == 127 for char in relative):
        raise DownloadError('资源路径无效。')
    parts = relative.split('/')
    if any(part in ('', '.', '..') for part in parts) or PurePosixPath(relative).is_absolute():
        raise DownloadError('资源路径无效。')
    root = root.resolve()
    current = root
    for part in parts:
        current /= part
        if current.is_symlink():
            raise DownloadError(f'目标路径含符号链接：{relative}')
    if not current.resolve().is_relative_to(root):
        raise DownloadError('资源路径超出目标目录。')
    return current


def load_assets():
    rows = read_json(MANIFEST)
    if not isinstance(rows, list):
        raise DownloadError('资料包索引格式无效。')
    ids, names = set(), set()
    for row in rows:
        if not isinstance(row, dict) or type(row.get('id')) is not int or row['id'] <= 0 or not NAME.fullmatch(row.get('name', '')):
            raise DownloadError('资料包索引包含无效名称或编号。')
        if type(row.get('size')) is not int or row['size'] < 0 or row['id'] in ids or row['name'] in names:
            raise DownloadError('资料包索引包含重复项或无效大小。')
        courses = row.get('courses', [])
        if not isinstance(courses, list) or any(not isinstance(course, str) for course in courses):
            raise DownloadError('资料包课程索引格式无效。')
        ids.add(row['id']); names.add(row['name'])
    return rows


def load_questions():
    rows = read_json(QUESTIONS)
    if isinstance(rows, dict):
        rows = rows.get('questions')
    if not isinstance(rows, list):
        raise DownloadError('题目索引格式无效。')
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get('id'), str) or not isinstance(row.get('course_id'), str):
            raise DownloadError('题目索引包含无效题号或课程。')
        if not isinstance(row.get('paths'), list) or any(not isinstance(path, str) for path in row['paths']):
            raise DownloadError('题目索引包含无效文件路径。')
    return rows


def add_course_assets(rows, questions, index):
    by_name = defaultdict(set)
    by_id = defaultdict(set)
    for question in questions:
        course = question['course_id']
        for path in question['paths']:
            entry = index.get('files', {}).get(path, {})
            if entry.get('shard'):
                by_name[entry['shard']].add(course)
        for package in question.get('packages', []):
            by_name[package['name']].add(course)
        if question.get('asset_id') is not None:
            by_id[question['asset_id']].add(course)
    return [{**row, 'courses': sorted(set(row.get('courses', [])) | by_name[row['name']] | by_id[row['id']])} for row in rows]


def select_assets(rows, courses, names, ids):
    courses = {course.casefold() for course in courses}
    return [row for row in rows
            if (not courses or courses.intersection(course.casefold() for course in row.get('courses', [])))
            and (not names or any(name.casefold() in row['name'].casefold() for name in names))
            and (not ids or row['id'] in ids)]


def select_questions(rows, courses, ids):
    known = {row['id'] for row in rows}
    missing = set(ids) - known
    if missing:
        raise DownloadError('找不到题号：' + ', '.join(sorted(missing)))
    courses = {course.casefold() for course in courses}
    return [row for row in rows if (not courses or row['course_id'].casefold() in courses) and (not ids or row['id'] in ids)]


def select_paths(rows, courses, ids, paths):
    if courses or ids:
        found = select_questions(rows, courses, ids)
        selected = {path for row in found for path in row['paths']}
        if paths:
            selected &= set(paths)
    else:
        selected = set(paths)
    return sorted(selected)


def remote_releases():
    gh('auth', 'status', '--hostname', 'github.com')
    raw = gh('api', '--hostname', 'github.com', '--paginate', '--slurp', f'repos/{REPO}/releases?per_page=100')
    try:
        pages = json.loads(raw)
        return [release for page in pages for release in page]
    except (ValueError, TypeError) as exc:
        raise DownloadError('GitHub 返回的资料包清单无效。') from exc


def bind_assets(rows, releases):
    remote = {}
    for release in releases:
        for asset in release.get('assets', []):
            remote[asset.get('id')] = (release.get('tag_name', ''), asset)
    result = []
    for row in rows:
        pair = remote.get(row['id'])
        if pair is None:
            raise DownloadError(f'GitHub 资料包不存在：{row["name"]}')
        tag, asset = pair
        digest = asset.get('digest') or ''
        if (not TAG.fullmatch(tag) or asset.get('name') != row['name'] or asset.get('size') != row['size']
                or asset.get('state') != 'uploaded' or not re.fullmatch(r'sha256:[0-9a-f]{64}', digest)
                or ('sha256' in row and row['sha256'] != digest.removeprefix('sha256:'))
                or ('tag' in row and row['tag'] != tag)):
            raise DownloadError(f'GitHub 资料包与索引或摘要不符：{row["name"]}')
        result.append({**row, 'tag': tag, 'sha256': digest.removeprefix('sha256:')})
    return result


def download_asset(asset, root, replace=False):
    if not NAME.fullmatch(asset['name']) or not TAG.fullmatch(asset['tag']) or not HASH.fullmatch(asset['sha256']):
        raise DownloadError('资料包名称、版本或摘要无效。')
    root = root.resolve(); root.mkdir(parents=True, exist_ok=True)
    dest = target_path(root, asset['name'])
    if valid_file(dest, asset['size'], asset['sha256']):
        return 'present'
    if dest.exists() and not replace:
        raise DownloadError(f'已有文件未通过摘要核对：{dest.name}。请移走该文件，或显式加 --replace。')
    with tempfile.TemporaryDirectory(prefix='.member-download-', dir=root) as temp:
        incoming = Path(temp) / asset['name']
        gh('release', 'download', asset['tag'], '--repo', 'github.com/' + REPO,
           '--pattern', asset['name'], '--output', str(incoming), '--clobber')
        if not valid_file(incoming, asset['size'], asset['sha256']):
            raise DownloadError(f'下载摘要不符，请重试：{asset["name"]}')
        target_path(root, asset['name'])
        if dest.exists() and not replace:
            raise DownloadError(f'目标文件已存在：{dest.name}')
        os.replace(incoming, dest)
    return 'downloaded'


def validate_file_meta(path, row, root):
    target_path(root, path)
    if (not isinstance(row, dict) or type(row.get('bytes')) is not int or row['bytes'] < 0
            or not isinstance(row.get('sha256'), str) or not HASH.fullmatch(row['sha256'])):
        raise DownloadError(f'文件摘要索引无效：{path}')


def write_zip_member(bundle, info, path, root, expected=None, replace=False):
    dest = target_path(root, path)
    if dest.exists() and not replace:
        raise DownloadError(f'已有文件未通过摘要核对：{path}。请移走该文件，或显式加 --replace。')
    if stat.S_ISLNK(info.external_attr >> 16) or info.is_dir() or (expected and info.file_size != expected['bytes']):
        raise DownloadError(f'资料包中的文件类型或大小不符：{path}')
    dest.parent.mkdir(parents=True, exist_ok=True)
    target_path(root, path)
    with tempfile.TemporaryDirectory(prefix='.member-download-', dir=dest.parent) as temp:
        incoming = Path(temp) / 'file'
        count = 0; digest = hashlib.sha256()
        with bundle.open(info) as source, incoming.open('wb') as output:
            for chunk in iter(lambda: source.read(1024 * 1024), b''):
                count += len(chunk)
                if count > info.file_size:
                    raise DownloadError(f'文件大小超出索引：{path}')
                digest.update(chunk); output.write(chunk)
        actual = {'bytes': count, 'sha256': digest.hexdigest()}
        if count != info.file_size or (expected and (count != expected['bytes'] or actual['sha256'] != expected['sha256'])):
            raise DownloadError(f'文件摘要不符：{path}')
        target_path(root, path)
        if dest.exists() and not replace:
            raise DownloadError(f'目标文件已存在：{path}')
        os.replace(incoming, dest)
    return actual


def extract_paths(archive, paths, index, root, replace=False):
    root = root.resolve(); root.mkdir(parents=True, exist_ok=True)
    written = 0
    with zipfile.ZipFile(archive) as bundle:
        counts = Counter(info.filename for info in bundle.infolist())
        for path in paths:
            row = index[path]; validate_file_meta(path, row, root)
            dest = target_path(root, path)
            if valid_file(dest, row['bytes'], row['sha256']):
                continue
            if counts[path] != 1:
                raise DownloadError(f'资料包中的文件缺失或重复：{path}')
            write_zip_member(bundle, bundle.getinfo(path), path, root, row, replace)
            written += 1
    return written


def read_receipts(root):
    path = target_path(root, '.member-download.json')
    if not path.exists():
        return {}
    value = read_json(path)
    if not isinstance(value, dict) or value.get('schema') != 1 or not isinstance(value.get('files'), dict):
        raise DownloadError('本地下载摘要记录无效，请移走 .member-download.json 后重试。')
    return value['files']


def save_receipts(root, receipts):
    root = root.resolve(); root.mkdir(parents=True, exist_ok=True)
    target = target_path(root, '.member-download.json')
    with tempfile.TemporaryDirectory(prefix='.member-download-', dir=root) as temp:
        incoming = Path(temp) / 'receipt.json'
        incoming.write_text(json.dumps({'schema': 1, 'files': receipts}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        target_path(root, '.member-download.json')
        os.replace(incoming, target)


def package_member_present(path, asset, root, receipts):
    dest = target_path(root, path)
    row = receipts.get(path)
    return (isinstance(row, dict) and row.get('asset') == asset['id'] and row.get('packageSha256') == asset['sha256']
            and isinstance(row.get('sha256'), str) and HASH.fullmatch(row['sha256']) is not None
            and type(row.get('bytes')) is int and row['bytes'] >= 0 and valid_file(dest, row['bytes'], row['sha256']))


def extract_package_members(archive, paths, asset, root, receipts, replace=False):
    if not HASH.fullmatch(asset['sha256']) or sha256(archive) != asset['sha256']:
        raise DownloadError(f'资料包摘要不符：{asset["name"]}')
    root = root.resolve(); root.mkdir(parents=True, exist_ok=True)
    written = 0; changed = False
    try:
        with zipfile.ZipFile(archive) as bundle:
            counts = Counter(info.filename for info in bundle.infolist())
            for path in sorted(paths):
                dest = target_path(root, path)
                if package_member_present(path, asset, root, receipts):
                    continue
                if counts[path] != 1:
                    raise DownloadError(f'资料包中的文件缺失或重复：{path}')
                info = bundle.getinfo(path)
                if stat.S_ISLNK(info.external_attr >> 16) or info.is_dir():
                    raise DownloadError(f'资料包中的文件类型不符：{path}')
                if dest.exists() and not replace:
                    digest = hashlib.sha256(); count = 0
                    with bundle.open(info) as source:
                        for chunk in iter(lambda: source.read(1024 * 1024), b''):
                            count += len(chunk); digest.update(chunk)
                            if count > info.file_size:
                                raise DownloadError(f'资料包中的文件大小不符：{path}')
                    actual = {'bytes': count, 'sha256': digest.hexdigest()}
                    if count != info.file_size or not valid_file(dest, count, actual['sha256']):
                        raise DownloadError(f'已有文件未通过摘要核对：{path}。请移走该文件，或显式加 --replace。')
                else:
                    actual = write_zip_member(bundle, info, path, root, replace=replace)
                    written += 1
                receipts[path] = {**actual, 'asset': asset['id'], 'packageSha256': asset['sha256']}
                changed = True
    finally:
        if changed:
            save_receipts(root, receipts)
    return written


def package_groups(questions):
    groups = {}; fallback = 0
    for question in questions:
        has_fallback = False
        for package in question.get('packages', []):
            name, tag, member = package.get('name', ''), package.get('tag', ''), package.get('member')
            if not NAME.fullmatch(name) or not TAG.fullmatch(tag) or (member is not None and not isinstance(member, str)):
                raise DownloadError('题目资料包索引无效。')
            group = groups.setdefault(name, {'tag': tag, 'members': set(), 'whole': False})
            if group['tag'] != tag:
                raise DownloadError(f'资料包名称不唯一：{name}')
            if member:
                group['members'].add(member)
            else:
                group['whole'] = True; has_fallback = True
        if has_fallback:
            fallback += 1
    return groups, fallback


def materialize_plan(paths, root, replace=False):
    index = read_json(PDF_INDEX)
    if not isinstance(index, dict) or not isinstance(index.get('files'), dict) or not isinstance(index.get('shards'), dict):
        raise DownloadError('PDF 索引格式无效。')
    if index.get('repository') != REPO:
        raise DownloadError('PDF 索引未指向会员仓库，请先更新仓库。')
    groups = defaultdict(list); present = 0
    for path in paths:
        row = index['files'].get(path)
        validate_file_meta(path, row, root)
        dest = target_path(root, path)
        if valid_file(dest, row['bytes'], row['sha256']):
            present += 1; continue
        if dest.exists() and not replace:
            raise DownloadError(f'已有文件未通过摘要核对：{path}。请移走该文件，或显式加 --replace。')
        shard = row.get('shard')
        if not isinstance(shard, str) or not NAME.fullmatch(shard) or shard not in index['shards']:
            raise DownloadError(f'PDF 分片索引无效：{path}')
        groups[shard].append(path)
    return index, groups, present


def plan_summary(rows):
    return {'repository': REPO, 'assets': rows, 'totalBytes': sum(row['size'] for row in rows)}


def emit(value, json_output):
    if json_output:
        print(json.dumps(value, ensure_ascii=False, separators=(',', ':')))
        return
    if isinstance(value, dict) and 'assets' in value:
        for row in value['assets']:
            print(f'{row["id"]}\t{row["size"] / 1024**2:.1f} MiB\t{row["name"]}')
        print(f'合计 {len(value["assets"])} 个资料包，{value["totalBytes"] / 1024**3:.2f} GiB。')
        if value.get('wholePackageQuestions'):
            print(f'其中 {value["wholePackageQuestions"]} 道题通过 {len(value["wholePackages"])} 个完整资料包获取，整包将保存在目标目录。')
        if 'missingFiles' in value:
            print(f'待恢复 {value["missingFiles"]} 份文件，已有 {value["alreadyPresent"]} 份通过摘要核对。')
    elif isinstance(value, list):
        for row in value:
            print(json.dumps(row, ensure_ascii=False))
    else:
        print(json.dumps(value, ensure_ascii=False))


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description='使用自己的 GitHub 账号获取会员题库。Python 3.9+，GitHub CLI。')
    sub = parser.add_subparsers(dest='command', required=True)
    for command in ['list', 'courses', 'questions', 'download', 'materialize']:
        item = sub.add_parser(command)
        item.add_argument('--json', action='store_true', help='输出 JSON，供自动化读取')
        if command != 'courses':
            item.add_argument('--course', action='append', default=[], help='课程编号，可重复；与其他条件取交集')
        if command in ['list', 'download']:
            item.add_argument('--name', action='append', default=[], help='资料包名称包含的文字，不区分大小写')
            item.add_argument('--asset', type=int, action='append', default=[], help='资料包编号，可重复')
        if command in ['questions', 'materialize']:
            item.add_argument('--question', action='append', default=[], help='完整题号，可重复')
        if command == 'questions':
            item.add_argument('--limit', type=int, default=20, help='最多显示题数，默认 20；0 表示全部')
        if command == 'materialize':
            item.add_argument('--path', action='append', default=[], help='索引中的完整 PDF 路径，可重复')
        if command in ['download', 'materialize']:
            item.add_argument('--all', action='store_true', help='显式选择全部，数据量较大')
            item.add_argument('--dry-run', action='store_true', help='只列下载计划，不下载文件')
            item.add_argument('--output', type=Path, default=Path('resources'), help='保存目录，默认 resources')
            item.add_argument('--replace', action='store_true', help='允许替换未通过摘要核对的已有文件')
    args = parser.parse_args(argv)
    if args.command in ['download', 'materialize']:
        selected = args.course or getattr(args, 'name', []) or getattr(args, 'asset', []) or getattr(args, 'question', []) or getattr(args, 'path', [])
        if not selected and not args.all:
            parser.error('请用 --course、--name、--asset、--question 或 --path 选择资料；全量获取须显式加 --all。')
        if selected and args.all:
            parser.error('--all 不能与筛选条件同时使用。')
    if args.command == 'questions' and args.limit < 0:
        parser.error('--limit 不能为负数。')
    return args


def main(argv=None):
    args = parse_args(argv)
    if args.command == 'courses':
        rows = load_questions(); counts = Counter(row['course_id'] for row in rows)
        emit([{'course_id': course, 'questions': count} for course, count in sorted(counts.items())], args.json)
        return
    if args.command == 'questions':
        rows = select_questions(load_questions(), args.course, args.question)
        total = len(rows)
        if args.limit:
            rows = rows[:args.limit]
        emit({'total': total, 'questions': rows}, args.json)
        return
    assets = load_assets()
    if args.command in ['list', 'download']:
        if QUESTIONS.exists() and PDF_INDEX.exists():
            assets = add_course_assets(assets, load_questions(), read_json(PDF_INDEX))
        rows = select_assets(assets, args.course, args.name, args.asset)
        if args.command == 'list':
            emit(plan_summary(rows), args.json); return
        if not rows:
            raise DownloadError('没有符合条件的资料包；可先运行 list 或 courses。')
        rows = bind_assets(rows, remote_releases())
        if args.dry_run:
            emit(plan_summary(rows), args.json); return
        results = []
        for row in rows:
            print(f'正在核对或下载：{row["name"]}', file=sys.stderr)
            results.append({'id': row['id'], 'name': row['name'], 'status': download_asset(row, args.output, args.replace)})
        emit({'files': results, 'output': str(args.output.resolve())}, args.json)
        return
    questions = load_questions()
    selected = questions if args.all else (select_questions(questions, args.course, args.question) if args.course or args.question else [])
    paths = (sorted({path for row in selected for path in row['paths']}) if not args.path
             else select_paths(questions, args.course, args.question, args.path))
    packages, fallback = package_groups(selected) if not args.path else ({}, 0)
    if not paths and not packages:
        raise DownloadError('没有符合条件的资料；可先运行 questions 查看题号与文件。')
    index, groups, present = materialize_plan(paths, args.output, args.replace)
    receipts = read_receipts(args.output)
    by_name = {row['name']: row for row in assets}
    need = {}
    for shard in sorted(groups):
        if shard not in by_name:
            raise DownloadError(f'会员库中缺少 PDF 分片：{shard}')
        row = by_name[shard]; expected = index['shards'][shard]
        if expected.get('bytes') != row['size'] or not HASH.fullmatch(expected.get('sha256', '')):
            raise DownloadError(f'PDF 分片摘要索引无效：{shard}')
        need[shard] = {**row, 'sha256': expected['sha256']}
    pending_packages = {}
    package_files = []
    for name, group in packages.items():
        row = by_name.get(name)
        if row is None or row.get('tag') != group['tag'] or not HASH.fullmatch(row.get('sha256', '')):
            raise DownloadError(f'会员资料包摘要索引无效：{name}')
        pending = set()
        for path in group['members']:
            if package_member_present(path, row, args.output, receipts):
                present += 1
            else:
                target_path(args.output, path)
                pending.add(path)
        archive = target_path(args.output, name)
        have_archive = valid_file(archive, row['size'], row['sha256'])
        if group['whole']:
            package_files.append(name)
        if pending or (group['whole'] and not have_archive):
            if group['whole'] and archive.exists() and not have_archive and not args.replace:
                raise DownloadError(f'已有资料包未通过摘要核对：{name}。请移走该文件，或显式加 --replace。')
            pending_packages[name] = {**group, 'members': pending, 'haveArchive': have_archive}
            if not have_archive:
                need[name] = row
    rows = list(need.values())
    plan = {**plan_summary(rows), 'files': paths,
            'packageMembers': [{'package': name, 'members': sorted(group['members'])} for name, group in packages.items()],
            'wholePackages': package_files, 'wholePackageQuestions': fallback,
            'alreadyPresent': present, 'missingFiles': sum(map(len, groups.values())) + sum(len(group['members']) for group in pending_packages.values())}
    if args.dry_run:
        emit(plan, args.json); return
    if rows:
        bound = bind_assets(rows, remote_releases())
        for row in bound:
            if row['sha256'] != need[row['name']]['sha256']:
                raise DownloadError(f'GitHub 资料包摘要与文件索引不符：{row["name"]}')
        need = {row['name']: row for row in bound}
    args.output.mkdir(parents=True, exist_ok=True)
    restored = 0
    for name, paths_in_shard in groups.items():
        row = need[name]
        print(f'正在恢复 PDF：{name}（{len(paths_in_shard)} 份）', file=sys.stderr)
        with tempfile.TemporaryDirectory(prefix='.member-download-', dir=args.output.resolve()) as temp:
            folder = Path(temp)
            download_asset(row, folder)
            restored += extract_paths(folder / name, paths_in_shard, index['files'], args.output, args.replace)
    for name, group in pending_packages.items():
        row = need.get(name, by_name[name])
        print(f'正在获取题目资料：{name}', file=sys.stderr)
        if group['whole'] or group['haveArchive']:
            download_asset(row, args.output, args.replace)
            if group['members']:
                restored += extract_package_members(args.output.resolve() / name, group['members'], row, args.output, receipts, args.replace)
        else:
            with tempfile.TemporaryDirectory(prefix='.member-download-', dir=args.output.resolve()) as temp:
                folder = Path(temp)
                download_asset(row, folder)
                restored += extract_package_members(folder / name, group['members'], row, args.output, receipts, args.replace)
    emit({'restored': restored, 'alreadyPresent': present, 'wholePackages': package_files,
          'wholePackageQuestions': fallback, 'output': str(args.output.resolve())}, args.json)



if __name__ == '__main__':
    try:
        main()
    except (DownloadError, OSError, zipfile.BadZipFile, RuntimeError) as exc:
        print(f'无法完成：{exc}', file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print('已停止。重新运行相同命令时会跳过摘要正确的文件。', file=sys.stderr)
        sys.exit(130)
