"""Download optional jins audio backups; runtime playback uses source URLs.

Run import-jins.py first. Only the URLs in jins.json are downloaded. Files
are stored under the ignored assets/jins-audio/ directory, preserving their
Maqam World URL paths. No catalog or application files are modified.
"""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
BACKUPS = ROOT / 'assets/jins-audio'


def audio_sources(rows):
    sources = set()
    for row in rows:
        sources.update(track['source'] for track in row['examples'])
        sources.update(row.get('pronunciationSources', []))
    return sorted(sources)


def destination(source):
    url = urlsplit(source)
    parts = unquote(url.path).split('/')
    if (url.scheme != 'https' or url.netloc != 'www.maqamworld.com'
            or url.query or url.fragment or '..' in parts
            or not url.path.endswith('.mp3')):
        raise ValueError(f'Unexpected audio URL: {source}')
    target = BACKUPS.joinpath(*[part for part in parts if part])
    if not target.resolve().is_relative_to(BACKUPS.resolve()):
        raise ValueError(f'Unsafe backup path: {source}')
    return target


def is_mp3(path):
    with path.open('rb') as stream:
        prefix = stream.read(3)
    return (prefix == b'ID3' or
            len(prefix) >= 2 and prefix[0] == 0xff and prefix[1] & 0xe0 == 0xe0)


def download(source):
    target = destination(source)
    if target.exists() and is_mp3(target):
        return 'existing', target.stat().st_size
    target.parent.mkdir(parents=True, exist_ok=True)
    # Download atomically; interrupted or invalid downloads never replace backups.
    with tempfile.NamedTemporaryFile(dir=target.parent, suffix='.part', delete=False) as stream:
        temporary = Path(stream.name)
    try:
        subprocess.run(['curl', '-fsSL', '--retry', '2', '--max-time', '120',
                        '--output', str(temporary), source], check=True)
        if not is_mp3(temporary):
            raise ValueError(f'Download is not an MP3: {source}')
        temporary.replace(target)
        return 'downloaded', target.stat().st_size
    finally:
        temporary.unlink(missing_ok=True)


def main():
    rows = json.loads((ROOT / 'jins.json').read_text())
    sources = audio_sources(rows)
    if not sources:
        raise ValueError('The jins catalog contains no audio URLs.')
    counts = {'downloaded': 0, 'existing': 0}
    total_bytes = 0
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(download, source): source for source in sources}
        for future in concurrent.futures.as_completed(futures):
            try:
                status, size = future.result()
                counts[status] += 1
                total_bytes += size
            except Exception as error:
                errors.append(f'{futures[future]}: {error}')
    print(f'{len(rows)} ajnas; {len(sources)} unique audio URLs; '
          f'{counts["downloaded"]} downloaded; {counts["existing"]} existing; '
          f'{total_bytes:,} bytes; {len(errors)} errors')
    for error in errors:
        print(error)
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
