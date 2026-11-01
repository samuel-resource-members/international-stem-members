"""Resolve one registered library file using the existing stores and downloaders.

This module has no import-time dependency on either repository's maintenance
modules. Files are recovered into a caller-owned temporary directory; originals
and remote indexes are never changed.
"""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile
import threading
import time
import zipfile

MEMBER_LIMIT = 250 * 1024 * 1024
ASSET_LIMIT = 1024 ** 3
MAIN_REPOSITORY = 'yangyangnovelist-hub/international-stem-past-papers'
HASH = re.compile(r'[a-f0-9]{64}')


def digest(path):
    result = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def relative_path(value):
    if (not isinstance(value, str) or not value or '\\' in value or ':' in value
            or any(ord(char) < 32 or ord(char) == 127 for char in value)):
        raise ValueError('Invalid registered file path')
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in ('', '.', '..') for part in value.split('/')):
        raise ValueError('Invalid registered file path')
    return path.as_posix()


def check_file(path, sha256=None, size=None, *, limit=ASSET_LIMIT):
    path = Path(path)
    if not path.is_file() or path.is_symlink():
        raise ValueError('Registered file is missing or is not a regular file')
    actual_size = path.stat().st_size
    if actual_size > limit:
        raise ValueError('Registered file exceeds the size limit')
    if size is not None and (type(size) is not int or size < 0 or actual_size != size):
        raise ValueError('Registered file size differs')
    if sha256 is not None and (not HASH.fullmatch(sha256) or digest(path) != sha256):
        raise ValueError('Registered file checksum differs')
    return path


def _copy_stream(source, target, expected_size, limit):
    if expected_size < 0 or expected_size > limit:
        raise ValueError('Archive member exceeds the size limit')
    written = 0
    with Path(target).open('wb') as output:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            written += len(chunk)
            if written > expected_size or written > limit:
                raise ValueError('Archive member exceeds its declared size')
            output.write(chunk)
    if written != expected_size:
        raise ValueError('Archive member is truncated')


@contextmanager
def _tar_stream(package):
    """Read tar/zstd as a stream without unpacking the archive onto disk."""
    with Path(package).open('rb') as handle:
        magic = handle.read(4)
    if magic != b'\x28\xb5\x2f\xfd':
        with tarfile.open(package, mode='r|*') as archive:
            yield archive
        return
    executable = shutil.which('zstd')
    if not executable:
        raise RuntimeError('zstd is required to read this archive')
    # An external decompressor keeps this usable with the existing system Python.
    with tempfile.TemporaryFile() as errors:
        process = subprocess.Popen([executable, '-dc', '--', str(package)], stdout=subprocess.PIPE, stderr=errors)
        timer = threading.Timer(240, process.kill)
        timer.daemon = True
        timer.start()
        try:
            with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
                yield archive
            # Consume the trailer so the decompressor can finish without a full pipe.
            while process.stdout.read(1024 * 1024):
                pass
            if process.wait(timeout=10):
                raise ValueError('Compressed archive could not be read')
        finally:
            timer.cancel()
            if process.poll() is None:
                process.kill()
            process.wait(timeout=10)
            process.stdout.close()


def extract_member(package, reference, destination, expected_sha256=None, expected_bytes=None,
                   *, limit=MEMBER_LIMIT, allow_suffix=True):
    """Extract exactly one regular file; reject missing or ambiguous matches.

    If the file has no independent SHA, callers must first verify the containing
    archive. Archive integrity and a per-file source checksum are not equivalent.
    """
    reference = relative_path(reference)
    package = Path(package)
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_symlink():
        raise ValueError('Destination must not be a symbolic link')
    def matches(name):
        clean = name[2:] if name.startswith('./') else name
        return clean == reference or (allow_suffix and clean.endswith('/' + reference))
    with tempfile.TemporaryDirectory(prefix='.library-member-', dir=destination.parent) as folder:
        incoming = Path(folder) / 'file'
        found = 0
        if zipfile.is_zipfile(package):
            with zipfile.ZipFile(package) as archive:
                for info in archive.infolist():
                    if not matches(info.filename):
                        continue
                    found += 1
                    if found != 1:
                        raise ValueError('Archive member is ambiguous')
                    relative_path(info.filename[2:] if info.filename.startswith('./') else info.filename)
                    file_type = stat.S_IFMT(info.external_attr >> 16)
                    if info.is_dir() or file_type not in (0, stat.S_IFREG):
                        raise ValueError('Archive member is not a regular file')
                    if expected_bytes is not None and info.file_size != expected_bytes:
                        raise ValueError('Archive member size differs')
                    with archive.open(info) as source:
                        _copy_stream(source, incoming, info.file_size, limit)
        else:
            started = time.monotonic()
            with _tar_stream(package) as archive:
                for info in archive:
                    if time.monotonic() - started > 240:
                        raise TimeoutError('Archive lookup exceeded its time limit')
                    if not matches(info.name):
                        continue
                    found += 1
                    if found != 1:
                        raise ValueError('Archive member is ambiguous')
                    relative_path(info.name[2:] if info.name.startswith('./') else info.name)
                    if not info.isfile():
                        raise ValueError('Archive member is not a regular file')
                    if expected_bytes is not None and info.size != expected_bytes:
                        raise ValueError('Archive member size differs')
                    with archive.extractfile(info) as source:
                        _copy_stream(source, incoming, info.size, limit)
        if found != 1:
            raise ValueError('Archive member is missing')
        check_file(incoming, expected_sha256, expected_bytes, limit=limit)
        os.replace(incoming, destination)
    return destination


def _load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError('Existing library downloader is unavailable')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FileResolver:
    def __init__(self, root: Path, cache_root: Path | None = None):
        self.root = Path(root).resolve()
        self._temporary = tempfile.TemporaryDirectory(prefix='library-files-') if cache_root is None else None
        self.cache_root = Path(cache_root or self._temporary.name).resolve()
        self.cache_root.mkdir(parents=True, exist_ok=True)
        self._index = None
        self._member = None
        self._store = None
        self._task = None
        self._caches = {}

    def close(self):
        if self._temporary:
            self._temporary.cleanup()

    def _index_data(self):
        if self._index is None:
            path = self.root / 'data/pdf-store.json'
            self._index = json.loads(path.read_text()) if path.is_file() else {'files': {}, 'shards': {}}
        return self._index

    def _member_downloader(self):
        path = self.root / 'scripts/member_download.py'
        if not path.is_file():
            return None
        if self._member is None:
            self._member = _load_module(path, '_library_member_download')
        return self._member

    def _cache(self, repository):
        if repository not in self._caches:
            path = self.root / 'coordination/task_workspace.py'
            if not path.is_file():
                raise RuntimeError('Existing library downloader is unavailable')
            if self._task is None:
                self._task = _load_module(path, '_library_task_workspace')
            self._caches[repository] = self._task.Cache(self.cache_root / 'assets', repo_root=self.root, repository=repository)
        return self._caches[repository]

    def _existing_package(self, repository, tag, name, expected=None, size=None):
        """Reuse verified shared caches without adding anything to them."""
        shared = Path(os.environ.get('STEM_ASSET_CACHE', Path.home() / '.cache/stem-question-bank'))
        keys = [hashlib.sha256((repository + '\0' + tag + '\0' + name).encode()).hexdigest()]
        if repository == MAIN_REPOSITORY:
            keys.append(hashlib.sha256((tag + '\0' + name).encode()).hexdigest())
        for key in keys:
            meta = shared / 'metadata' / key
            if not meta.is_file():
                continue
            try:
                item = json.loads(meta.read_text())
                sha = item['digest'].removeprefix('sha256:')
                if item.get('name') != name or type(item.get('size')) is not int or not 0 < item['size'] <= ASSET_LIMIT:
                    continue
                if not HASH.fullmatch(sha) or (expected and expected != sha) or (size is not None and size != item['size']):
                    continue
                return check_file(shared / 'objects' / sha, sha, item['size'])
            except (ValueError, KeyError, OSError, TypeError):
                continue
        if expected and size is not None:
            candidates = [Path(os.environ.get('PDF_STORE_CACHE', Path.home() / '.cache/pdf-store')) / name,
                          self.root / 'resources' / name]
            for path in candidates:
                try:
                    return check_file(path, expected, size)
                except (ValueError, OSError):
                    continue
        return None

    def _package(self, ref):
        repository = ref.get('repository') or self._index_data().get('repository') or MAIN_REPOSITORY
        if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
            raise ValueError('Invalid registered repository')
        tag, name = ref['tag'], ref['asset']
        if not re.fullmatch(r'[A-Za-z0-9_.-]+', tag) or relative_path(name) != name or '/' in name:
            raise ValueError('Invalid registered release asset')
        expected = ref.get('package_sha256')
        size = ref.get('package_bytes')
        if expected is not None and not HASH.fullmatch(expected):
            raise ValueError('Invalid package checksum')
        member = self._member_downloader()
        if member and repository != member.REPO:
            raise ValueError('Registered file belongs to a different member repository')
        existing = self._existing_package(repository, tag, name, expected, size)
        if existing:
            return existing
        if member:
            assets = member.load_assets()
            selected = [row for row in assets if row['name'] == name and row.get('tag') == tag]
            if len(selected) != 1:
                raise ValueError('Registered release asset is missing or ambiguous')
            item = selected[0]
            if not HASH.fullmatch(item.get('sha256', '')) or type(item.get('size')) is not int or not 0 < item['size'] <= ASSET_LIMIT:
                raise ValueError('Package lacks bounded integrity metadata')
            if expected and item.get('sha256') != expected:
                raise ValueError('Package checksum differs from the member index')
            if size is not None and item.get('size') != size:
                raise ValueError('Package size differs from the member index')
            folder = self.cache_root / 'packages' / hashlib.sha256((repository + '\0' + tag).encode()).hexdigest()
            member.download_asset(item, folder)
            return check_file(folder / name, item['sha256'], item['size'])
        package, item = self._cache(repository).release_asset(tag, name)
        return check_file(package, expected or item['digest'].removeprefix('sha256:'), size if size is not None else item['size'])

    def _stored(self, relative, destination):
        relative = relative_path(relative)
        index = self._index_data()
        row = index.get('files', {}).get(relative)
        if not isinstance(row, dict) or not HASH.fullmatch(row.get('sha256', '')) or type(row.get('bytes')) is not int:
            raise ValueError('File is absent from the PDF store index')
        original = (self.root / relative).resolve()
        if not original.is_relative_to(self.root):
            raise ValueError('Stored file escapes the repository')
        if original.is_file():
            check_file(original, row['sha256'], row['bytes'])
            return self._copy(original, destination)
        shard_name = relative_path(row['shard'])
        if '/' in shard_name:
            raise ValueError('Invalid PDF store shard name')
        shard = index['shards'][shard_name]
        repository = index.get('repository') or MAIN_REPOSITORY
        tag = shard.get('release') or index.get('release') or 'pdf-store'
        member = self._member_downloader()
        if member and repository != member.REPO:
            raise ValueError('PDF store belongs to a different member repository')
        package = self._existing_package(repository, tag, shard_name, shard['sha256'], shard['bytes'])
        if package is None:
            if member:
                package = self._package({'repository': repository, 'tag': tag, 'asset': shard_name,
                                         'package_sha256': shard['sha256'], 'package_bytes': shard['bytes']})
            else:
                if self._store is None:
                    self._store = _load_module(self.root / 'scripts/pdf_store.py', '_library_pdf_store')
                    self._store.REPO = repository
                    self._store.CACHE = self.cache_root / 'shards'
                package = self._store.shard_bytes(shard_name, {**shard, 'release': tag})
        check_file(package, shard['sha256'], shard['bytes'])
        if member:
            with tempfile.TemporaryDirectory(prefix='selected-', dir=self.cache_root) as folder:
                member.extract_paths(package, [relative], index['files'], Path(folder))
                return self._copy(Path(folder) / relative, destination)
        return extract_member(package, relative, destination, row['sha256'], row['bytes'], allow_suffix=False)

    @staticmethod
    def _copy(source, destination):
        source, destination = Path(source), Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.is_symlink():
            raise ValueError('Destination must not be a symbolic link')
        if source.resolve() == destination.resolve():
            return destination
        with tempfile.NamedTemporaryFile(prefix='.library-file-', dir=destination.parent, delete=False) as output:
            temp = Path(output.name)
            try:
                with source.open('rb') as incoming:
                    shutil.copyfileobj(incoming, output, 1024 * 1024)
                output.flush()
                os.replace(temp, destination)
            finally:
                if temp.exists():
                    temp.unlink()
        return destination

    def resolve(self, ref: dict, destination: Path) -> Path:
        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.library-resolve-', dir=destination.parent) as folder:
            staged = self._resolve(ref, Path(folder) / destination.name)
            final = destination.with_name(staged.name)
            return self._copy(staged, final)

    def _resolve(self, ref: dict, destination: Path) -> Path:
        kind = ref.get('kind')
        if kind == 'store':
            result = self._stored(ref['path'], destination)
        elif kind == 'local':
            supplied = Path(ref['path'])
            source = supplied if supplied.is_absolute() else self.root / relative_path(ref['path'])
            check_file(source, ref.get('sha256'), ref.get('bytes'))
            result = self._copy(source, destination)
        elif kind == 'release':
            package = self._package(ref)
            if ref.get('member'):
                result = extract_member(package, ref['member'], destination, ref.get('sha256'), ref.get('bytes'))
            else:
                # Preserve an archive's actual type; do not hand out ZIP bytes as PDF.
                name = ref['asset'].lower()
                suffix = next((ending for ending in ('.tar.zst', '.tar.gz', '.tar.bz2', '.tar.xz') if name.endswith(ending)), Path(ref['asset']).suffix)
                if zipfile.is_zipfile(package) and suffix.lower() not in ('.zip', '.docx', '.xlsx', '.pptx'):
                    suffix = '.zip'
                if suffix and not destination.name.lower().endswith(suffix.lower()):
                    destination = destination.with_name(destination.stem + suffix)
                result = self._copy(package, destination)
        elif kind == 'split':
            if not ref.get('parts') or not HASH.fullmatch(ref.get('sha256', '')) or type(ref.get('bytes')) is not int or ref['bytes'] > ASSET_LIMIT:
                raise ValueError('Split file lacks bounded integrity metadata')
            destination.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.TemporaryDirectory(prefix='split-', dir=self.cache_root) as folder:
                joined = Path(folder) / 'joined'
                total = 0
                with joined.open('wb') as output:
                    for number, part in enumerate(ref['parts']):
                        if not HASH.fullmatch(part.get('sha256', '')) or type(part.get('bytes')) is not int:
                            raise ValueError('Split part lacks integrity metadata')
                        kind = 'store' if part['path'] in self._index_data().get('files', {}) else 'local'
                        path = self.resolve({**part, 'kind': kind}, Path(folder) / str(number))
                        total += path.stat().st_size
                        if total > ref['bytes']:
                            raise ValueError('Split file exceeds its declared size')
                        with path.open('rb') as incoming:
                            shutil.copyfileobj(incoming, output, 1024 * 1024)
                check_file(joined, ref['sha256'], ref['bytes'])
                result = self._copy(joined, destination)
        else:
            raise ValueError('Unsupported registered file kind')
        return check_file(result, ref.get('sha256'), ref.get('bytes'))
