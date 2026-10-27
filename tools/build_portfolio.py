#!/usr/bin/env python3
"""Compile self-contained project folders; requires FFmpeg for uncached local audio."""
import argparse
import array
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
from urllib.parse import urlparse

SITE = Path(__file__).resolve().parents[1]
AUDIO = {'audio', 'music', 'sound-design'}

def external(value):
    return urlparse(value).scheme in {'http', 'https'}

def local_file(folder, value):
    path = (folder / value).resolve()
    if not path.is_relative_to(folder.resolve()) or not path.is_file():
        raise ValueError(f'Missing or invalid asset: {folder.name}/{value}')
    return path

def waveform(path, folder):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    relative = Path('waveforms') / (path.stem + '-' + hashlib.sha256(str(path.relative_to(folder)).encode()).hexdigest()[:8] + '.json')
    target = folder / relative
    if target.exists():
        cached = json.loads(target.read_text())
        if cached.get('sha256') == digest:
            return relative.as_posix(), cached['duration']
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    samples = array.array('f'); samples.frombytes(raw)
    import sys
    if sys.byteorder != 'little': samples.byteswap()
    if not samples: raise ValueError(f'Empty audio: {path}')
    bins = min(800, len(samples))
    peaks = [max(abs(x) for x in samples[i*len(samples)//bins:(i+1)*len(samples)//bins]) for i in range(bins)]
    peak = max(peaks) or 1
    result = {'version': 1, 'sha256': digest, 'duration': len(samples)/8000, 'peaks': [round(x/peak, 4) for x in peaks]}
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(result, separators=(',', ':')) + '\n')
    return relative.as_posix(), result['duration']

def video_poster(path, folder):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:16]
    relative = Path('posters') / (path.stem + '-' + digest + '.jpg')
    target = folder / relative
    if not target.exists():
        target.parent.mkdir(exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vf',
                        'thumbnail=60,scale=min(1280\\,iw):-2', '-frames:v', '1',
                        '-q:v', '3', '-y', str(target)], check=True, capture_output=True)
        if not target.is_file(): raise ValueError(f'Could not generate video poster: {path}')
    return relative.as_posix()

def order(item):
    return item.get('order', 1000000)

def build(root, destination):
    root, destination = Path(root).resolve(), Path(destination).resolve()
    if not root.is_dir() or root == destination or root in destination.parents or destination in root.parents:
        raise ValueError('Source and destination must be separate existing content/site locations')
    projects, warnings = [], []
    for metadata in sorted(root.glob('*/project.json')):
        folder = metadata.parent
        if folder.is_symlink() or any(p.is_symlink() for p in folder.rglob('*')):
            raise ValueError(f'Project contains a symlink: {folder.name}')
        slug = folder.name
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug): raise ValueError(f'Invalid folder ID: {slug}')
        data = json.loads(metadata.read_text())
        if data.get('id', slug) != slug: raise ValueError(f'ID must match folder: {slug}')
        if not data.get('title'): raise ValueError(f'Missing title: {slug}')
        data.update(id=slug, slug=slug, basePath=slug+'/')
        data.setdefault('featured', data.get('featuredOrder') is not None)
        cover = data.get('cover') or next((p.name for p in sorted(folder.glob('cover.*')) if p.suffix.lower() in {'.jpg','.jpeg','.png','.webp','.avif','.gif'}), None)
        if cover:
            if not external(cover): local_file(folder, cover)
            data['cover'] = cover
        else: data.pop('cover', None)
        media = data.get('media') or []
        for item in media:
            # Legacy source is provenance; file is the playable asset.
            src = item.get('file') or item.get('source')
            if not src or not item.get('title') or item.get('type') not in AUDIO | {'video','image'}:
                raise ValueError(f'Invalid media metadata in {slug}: {item}')
            path = None if external(src) else local_file(folder, src)
            item['src'] = src
            if item['type'] == 'video':
                if item.get('poster'):
                    if not external(item['poster']): local_file(folder, item['poster'])
                elif path:
                    item['poster'] = video_poster(path, folder)
            if item['type'] in AUDIO:
                if path:
                    item['waveform'], item['duration'] = waveform(path, folder)
                elif item.get('waveform'):
                    if not external(item['waveform']): local_file(folder, item['waveform'])
                else:
                    warnings.append(f'{slug}: external audio "{item["title"]}" needs waveform data; native controls used until supplied.')
            if item.get('uncertain'):
                warnings.append(f'{slug}: {item["title"]}: {item["uncertain"]}')
        data['media'] = sorted(media, key=order)
        if not media: warnings.append(f'{slug}: no media supplied (description and links only).')
        if data.get('uncertain'): warnings.append(f'{slug}: {data["uncertain"]}')
        projects.append(data)
    projects.sort(key=lambda p: (not p['featured'], p.get('featuredOrder',1000000) if p['featured'] else 0, order(p), p['title'].casefold()))
    result = {'projects': projects}
    destination.mkdir(parents=True, exist_ok=True)
    manifest = destination / '.generated-projects.json'
    previous = json.loads(manifest.read_text()) if manifest.exists() else []
    current = [p['id'] for p in projects]
    for slug in current:
        target = destination / slug
        # Never overwrite an unrelated folder on the first build.
        if target.exists() and slug not in previous: raise ValueError(f'Unmanaged destination exists: {target}')
    for slug in previous:
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug): raise ValueError('Invalid build manifest')
        target = destination / slug
        if target.is_symlink(): raise ValueError(f'Refusing symlink destination: {target}')
        if target.exists(): shutil.rmtree(target)
    for slug in current:
        shutil.copytree(root/slug, destination/slug, ignore=shutil.ignore_patterns('.DS_Store'))
    encoded = json.dumps(result, indent=2, ensure_ascii=False) + '\n'
    (root/'projects.json').write_text(encoded)
    (destination/'projects.json').write_text(encoded)
    manifest.write_text(json.dumps(current) + '\n')
    (destination/'content-warnings.txt').write_text('\n'.join(warnings) + '\n')
    print(f'{len(projects)} projects, {sum(len(p["media"]) for p in projects)} media items. ' + str(len(warnings)) + ' content notes.')
    for warning in warnings: print('NOTE: ' + warning)
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=SITE.parent/'portfolio')
    parser.add_argument('--output', type=Path, default=SITE/'portfolio')
    args = parser.parse_args()
    build(args.source, args.output)
