"""Download the pinned, existing Z-Anatomy FBX files and verify Git blob checksums."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.parse
import urllib.request

project = Path(__file__).resolve().parent.parent
metadata = json.loads((project / 'src/data/model-info.json').read_text())
root = project / 'work/z-anatomy'
root.mkdir(parents=True, exist_ok=True)
revision = metadata['commit']
manifest = [dict(name=f['name'], sha=f['gitBlobSha'], size=f['bytes']) for f in metadata['sourceFiles']]
(root / 'fbx-list.json').write_text(json.dumps(manifest, indent=2))
(root / 'commit.json').write_text(json.dumps({'sha': revision}, indent=2))

def verified(path, item):
    if not path.exists() or path.stat().st_size != item['size']:
        return False
    digest = hashlib.sha1(f'blob {item["size"]}\0'.encode())
    with path.open('rb') as stream:
        while block := stream.read(1024 * 1024):
            digest.update(block)
    return digest.hexdigest() == item['sha']

def fetch(item):
    target = root / item['name']
    if verified(target, item):
        print('Verified existing', item['name'], flush=True)
        return
    url = f'https://raw.githubusercontent.com/LluisV/Z-Anatomy/{revision}/Resources/Models/FBX/{urllib.parse.quote(item["name"])}'
    request = urllib.request.Request(url, headers={'User-Agent': 'Forma-anatomy-asset-import'})
    partial = target.with_suffix('.partial')
    with urllib.request.urlopen(request, timeout=60) as response, partial.open('wb') as output:
        while block := response.read(1024 * 1024):
            output.write(block)
    if not verified(partial, item):
        partial.unlink(missing_ok=True)
        raise ValueError(f'Source checksum mismatch: {item["name"]}')
    partial.replace(target)
    print('Downloaded and verified', item['name'], flush=True)

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(fetch, manifest))
