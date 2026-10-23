import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import subprocess
import unittest
from unittest import mock
import zipfile

spec = importlib.util.spec_from_file_location('member_download', Path(__file__).with_name('member_download.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def meta(data, **extra):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), **extra}


class MemberDownloads(unittest.TestCase):
    def test_unsafe_paths_and_symlink_parents_are_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for name in ['../secret', '/secret', 'a/../../secret', 'a\\secret', 'C:/secret', './secret', 'a//secret']:
                with self.subTest(name=name), self.assertRaises(m.DownloadError):
                    m.target_path(root, name)
            (root / 'link').symlink_to(root, target_is_directory=True)
            with self.assertRaises(m.DownloadError):
                m.target_path(root, 'link/secret.pdf')

    def test_course_and_name_filters_intersect(self):
        rows = [{'id': 1, 'name': 'math.zip', 'courses': ['ib-aa-hl']},
                {'id': 2, 'name': 'physics.zip', 'courses': ['ib-physics']},
                {'id': 3, 'name': 'math-extra.zip', 'courses': ['ib-aa-sl']}]
        self.assertEqual([a['id'] for a in m.select_assets(rows, ['ib-aa-hl'], ['MATH'], [])], [1])
        self.assertEqual(m.select_assets(rows, ['ib-physics'], ['math'], []), [])

    def test_download_requires_explicit_selection(self):
        for command in ['download', 'materialize']:
            with self.subTest(command=command), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as e:
                m.parse_args([command])
            self.assertEqual(e.exception.code, 2)

    def test_remote_metadata_is_bound_to_inventory_and_requires_digest(self):
        local = [{'id': 1, 'name': 'math.zip', 'size': 3, 'group': '数学', 'courses': []}]
        remote = [{'tag_name': 'subject-resources', 'assets': [
            {'id': 1, 'name': 'math.zip', 'size': 3, 'state': 'uploaded', 'digest': 'sha256:' + 'a' * 64}]}]
        self.assertEqual(m.bind_assets(local, remote)[0]['sha256'], 'a' * 64)
        with self.assertRaises(m.DownloadError):
            m.bind_assets([{**local[0], 'sha256': 'b' * 64}], remote)
        for field, value in [('name', '../math.zip'), ('size', 4), ('digest', None), ('state', 'starter')]:
            changed = json.loads(json.dumps(remote))
            changed[0]['assets'][0][field] = value
            with self.subTest(field=field), self.assertRaises(m.DownloadError):
                m.bind_assets(local, changed)

    def test_verified_download_is_skipped_without_request(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); (root / 'small.zip').write_bytes(b'abc')
            asset = {'id': 1, 'name': 'small.zip', 'size': 3, 'sha256': meta(b'abc')['sha256'], 'tag': 'resources'}
            with mock.patch.object(m, 'gh') as gh:
                result = m.download_asset(asset, root)
            gh.assert_not_called()
            self.assertEqual(result, 'present')

    def test_failed_download_keeps_existing_file_and_cleans_temporary_data(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); (root / 'small.zip').write_bytes(b'old')
            asset = {'id': 1, 'name': 'small.zip', 'size': 3, 'sha256': meta(b'abc')['sha256'], 'tag': 'resources'}
            def fake_gh(*args, **kwargs):
                Path(args[args.index('--output') + 1]).write_bytes(b'bad')
            with mock.patch.object(m, 'gh', side_effect=fake_gh), self.assertRaises(m.DownloadError):
                m.download_asset(asset, root, replace=True)
            self.assertEqual((root / 'small.zip').read_bytes(), b'old')
            self.assertEqual([p.name for p in root.iterdir()], ['small.zip'])

    def test_valid_download_uses_official_gh_command_and_atomic_output(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            asset = {'id': 1, 'name': 'small.zip', 'size': 3, 'sha256': meta(b'abc')['sha256'], 'tag': 'resources'}
            def fake_gh(*args, **kwargs):
                self.assertEqual(args[:3], ('release', 'download', 'resources'))
                self.assertIn('github.com/' + m.REPO, args)
                self.assertIn('--clobber', args)
                Path(args[args.index('--output') + 1]).write_bytes(b'abc')
            with mock.patch.object(m, 'gh', side_effect=fake_gh):
                self.assertEqual(m.download_asset(asset, root), 'downloaded')
            self.assertEqual((root / 'small.zip').read_bytes(), b'abc')
            self.assertEqual(len(list(root.iterdir())), 1)

    def test_question_selection_deduplicates_paths_and_rejects_unknown_ids(self):
        rows = [{'id': 'Q1', 'course_id': 'amc8', 'paths': ['a.pdf', 'b.pdf']},
                {'id': 'Q2', 'course_id': 'amc8', 'paths': ['a.pdf']}]
        self.assertEqual(m.select_paths(rows, ['amc8'], [], []), ['a.pdf', 'b.pdf'])
        with self.assertRaises(m.DownloadError):
            m.select_paths(rows, [], ['missing'], [])

    def test_extract_only_requested_regular_files_after_sha_validation(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); archive = root / 'shard.zip'; output = root / 'out'; output.mkdir()
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('course/q1.pdf', b'one')
                z.writestr('course/q2.pdf', b'two')
                z.writestr('../outside.pdf', b'bad')
            index = {'course/q1.pdf': meta(b'one'), 'course/q2.pdf': meta(b'two')}
            self.assertEqual(m.extract_paths(archive, ['course/q1.pdf'], index, output), 1)
            self.assertEqual((output / 'course/q1.pdf').read_bytes(), b'one')
            self.assertFalse((output / 'course/q2.pdf').exists())
            self.assertFalse((root / 'outside.pdf').exists())

    def test_bad_zip_member_never_replaces_existing_destination(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); archive = root / 'shard.zip'; output = root / 'out'; output.mkdir()
            (output / 'q.pdf').write_bytes(b'old')
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('q.pdf', b'bad')
            with self.assertRaises(m.DownloadError):
                m.extract_paths(archive, ['q.pdf'], {'q.pdf': meta(b'new')}, output, replace=True)
            self.assertEqual((output / 'q.pdf').read_bytes(), b'old')
            self.assertEqual([p.name for p in output.iterdir()], ['q.pdf'])

    def test_duplicate_or_symlink_zip_member_is_rejected(self):
        for kind in ['duplicate', 'symlink']:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as d:
                root = Path(d); archive = root / 'shard.zip'; output = root / 'out'; output.mkdir()
                with zipfile.ZipFile(archive, 'w') as z:
                    if kind == 'duplicate':
                        z.writestr('q.pdf', b'one')
                        with __import__('warnings').catch_warnings():
                            __import__('warnings').simplefilter('ignore')
                            z.writestr('q.pdf', b'one')
                    else:
                        entry = zipfile.ZipInfo('q.pdf'); entry.create_system = 3; entry.external_attr = 0o120777 << 16
                        z.writestr(entry, b'one')
                with self.assertRaises(m.DownloadError):
                    m.extract_paths(archive, ['q.pdf'], {'q.pdf': meta(b'one')}, output)
                self.assertEqual(list(output.iterdir()), [])


    def test_package_members_are_verified_and_resume_without_package_download(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); archive = root / 'pack.zip'; output = root / 'out'; output.mkdir()
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('course/q.pdf', b'one')
                z.writestr('course/not-selected.pdf', b'two')
            asset = {'id': 9, 'name': 'pack.zip', 'sha256': m.sha256(archive)}
            receipts = {}
            self.assertEqual(m.extract_package_members(archive, ['course/q.pdf'], asset, output, receipts), 1)
            self.assertEqual((output / 'course/q.pdf').read_bytes(), b'one')
            self.assertFalse((output / 'course/not-selected.pdf').exists())
            self.assertTrue(m.package_member_present('course/q.pdf', asset, output, receipts))
            (output / 'course/q.pdf').write_bytes(b'bad')
            self.assertFalse(m.package_member_present('course/q.pdf', asset, output, receipts))

    def test_package_receipt_does_not_allow_changed_asset_or_path_traversal(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); archive = root / 'pack.zip'; output = root / 'out'; output.mkdir()
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('../bad.pdf', b'bad')
            asset = {'id': 9, 'name': 'pack.zip', 'sha256': m.sha256(archive)}
            with self.assertRaises(m.DownloadError):
                m.extract_package_members(archive, ['../bad.pdf'], asset, output, {})
            self.assertFalse((root / 'bad.pdf').exists())
            (output / 'q.pdf').write_bytes(b'one')
            receipts = {'q.pdf': {**meta(b'one'), 'asset': 9, 'packageSha256': 'a' * 64}}
            self.assertFalse(m.package_member_present('q.pdf', asset, output, receipts))

    def test_package_selection_retains_full_archive_fallback_and_casefolds_courses(self):
        questions = [{'id': 'Q1', 'course_id': 'AMC8', 'paths': [],
                      'packages': [{'name': 'pack.zip', 'tag': 'amc', 'member': None}]},
                     {'id': 'Q2', 'course_id': 'AIME', 'paths': [],
                      'packages': [{'name': 'part.zip', 'tag': 'subject-resources', 'member': 'q2.pdf'}]}]
        self.assertEqual(len(m.select_questions(questions, ['amc8'], [])), 1)
        groups, fallback = m.package_groups(questions)
        self.assertTrue(groups['pack.zip']['whole'])
        self.assertEqual(groups['part.zip']['members'], {'q2.pdf'})
        self.assertEqual(fallback, 1)


    def test_materialize_command_covers_indexed_pdf_package_member_and_whole_package(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); output = root / 'output'; source = {}
            for name, path, data in [('shard.zip', 'indexed/q.pdf', b'indexed'),
                                     ('pack.zip', 'package/q.pdf', b'package'),
                                     ('whole.zip', 'whole/q.pdf', b'whole')]:
                stream = io.BytesIO()
                with zipfile.ZipFile(stream, 'w') as bundle:
                    bundle.writestr(path, data)
                source[name] = stream.getvalue()
            assets = [{'id': i, 'name': name, 'size': len(data), 'group': 'Test', 'tag': 'resources',
                       'sha256': hashlib.sha256(data).hexdigest(), 'courses': ['TEST']}
                      for i, (name, data) in enumerate(source.items(), 1)]
            questions = [{'id': 'Q1', 'course_id': 'TEST', 'paths': ['indexed/q.pdf'], 'packages': []},
                         {'id': 'Q2', 'course_id': 'TEST', 'paths': [],
                          'packages': [{'name': 'pack.zip', 'tag': 'resources', 'member': 'package/q.pdf'}]},
                         {'id': 'Q3', 'course_id': 'TEST', 'paths': [],
                          'packages': [{'name': 'whole.zip', 'tag': 'resources', 'member': None}]}]
            index = {'repository': m.REPO, 'files': {'indexed/q.pdf': meta(b'indexed', shard='shard.zip')},
                     'shards': {'shard.zip': meta(source['shard.zip'])}}
            files = {'MANIFEST': assets, 'QUESTIONS': questions, 'PDF_INDEX': index}
            patches = []
            for name, value in files.items():
                path = root / (name + '.json'); path.write_text(json.dumps(value))
                patches.append(mock.patch.object(m, name, path))
            remote = [{'tag_name': 'resources', 'assets': [
                {**asset, 'state': 'uploaded', 'digest': 'sha256:' + asset['sha256']} for asset in assets]}]
            def fake_gh(*args, **kwargs):
                name = args[args.index('--pattern') + 1]
                Path(args[args.index('--output') + 1]).write_bytes(source[name])
            with contextlib.ExitStack() as stack:
                for patch in patches:
                    stack.enter_context(patch)
                remote_call = stack.enter_context(mock.patch.object(m, 'remote_releases', return_value=remote))
                gh_call = stack.enter_context(mock.patch.object(m, 'gh', side_effect=fake_gh))
                result = io.StringIO()
                with contextlib.redirect_stdout(result), contextlib.redirect_stderr(io.StringIO()):
                    m.main(['materialize', '--course', 'test', '--output', str(output), '--json'])
                answer = json.loads(result.getvalue())
                self.assertEqual(answer['restored'], 2)
                self.assertEqual(answer['wholePackageQuestions'], 1)
                self.assertEqual((output / 'indexed/q.pdf').read_bytes(), b'indexed')
                self.assertEqual((output / 'package/q.pdf').read_bytes(), b'package')
                self.assertEqual((output / 'whole.zip').read_bytes(), source['whole.zip'])
                self.assertEqual(gh_call.call_count, 3)
                self.assertEqual(list(output.glob('.member-download-*')), [])
                result = io.StringIO()
                with contextlib.redirect_stdout(result), contextlib.redirect_stderr(io.StringIO()):
                    m.main(['materialize', '--course', 'TEST', '--output', str(output), '--json'])
                answer = json.loads(result.getvalue())
                self.assertEqual(answer['restored'], 0)
                self.assertEqual(answer['alreadyPresent'], 2)
                self.assertEqual(gh_call.call_count, 3)
                self.assertEqual(remote_call.call_count, 1)


    def test_course_listing_merges_question_shards_into_existing_course_fields(self):
        for initial_courses in [[], ['BBO']]:
            with self.subTest(initial_courses=initial_courses), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                assets = [{'id': 1, 'name': 'pdfs-one.zip', 'size': 3, 'group': 'PDF', 'courses': initial_courses}]
                questions = [{'id': 'IBO-Q1', 'course_id': 'IBO', 'paths': ['ibo/q1.pdf'], 'packages': []}]
                index = {'files': {'ibo/q1.pdf': {'shard': 'pdfs-one.zip'}}}
                with contextlib.ExitStack() as stack:
                    for name, value in [('MANIFEST', assets), ('QUESTIONS', questions), ('PDF_INDEX', index)]:
                        path = root / (name + '.json'); path.write_text(json.dumps(value))
                        stack.enter_context(mock.patch.object(m, name, path))
                    result = io.StringIO()
                    with contextlib.redirect_stdout(result):
                        m.main(['list', '--course', 'IBO', '--json'])
                    answer = json.loads(result.getvalue())
                self.assertEqual([row['id'] for row in answer['assets']], [1])
                self.assertEqual(set(answer['assets'][0]['courses']), set(initial_courses) | {'IBO'})


    def test_gh_retries_one_transient_network_failure(self):
        for message in ['unexpected EOF', 'net/http: TLS handshake timeout', 'i/o timeout',
                        'connection reset by peer', 'HTTP 502: Bad Gateway',
                        'HTTP 503: Service Unavailable', 'HTTP 504: Gateway Timeout']:
            with self.subTest(message=message):
                failed = subprocess.CompletedProcess(['gh'], 1, stdout='', stderr=message)
                passed = subprocess.CompletedProcess(['gh'], 0, stdout='[]', stderr='')
                with mock.patch.object(m.subprocess, 'run', side_effect=[failed, passed]) as run:
                    self.assertEqual(m.gh('api', 'user'), '[]')
                self.assertEqual(run.call_count, 2)

    def test_gh_network_exhaustion_is_bounded_and_does_not_expose_urls(self):
        failed = subprocess.CompletedProcess(['gh'], 1, stdout='',
            stderr='HTTP 502: https://release-assets.githubusercontent.com/item?signature=private unexpected EOF')
        with mock.patch.object(m.subprocess, 'run', return_value=failed) as run:
            with self.assertRaises(m.DownloadError) as error:
                m.gh('release', 'download', 'resources')
        self.assertEqual(run.call_count, 2)
        self.assertIn('网络', str(error.exception))
        self.assertNotIn('signature', str(error.exception))
        self.assertNotIn('http', str(error.exception))

    def test_gh_authentication_failure_is_not_retried(self):
        failed = subprocess.CompletedProcess(['gh'], 1, stdout='', stderr='HTTP 401: Bad credentials')
        with mock.patch.object(m.subprocess, 'run', return_value=failed) as run:
            with self.assertRaises(m.DownloadError) as error:
                m.gh('api', 'user')
        self.assertEqual(run.call_count, 1)
        self.assertIn('账号', str(error.exception))
        self.assertNotIn('网络', str(error.exception))


if __name__ == '__main__':
    unittest.main()
