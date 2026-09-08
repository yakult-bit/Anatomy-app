"""Fetch official per-entry license evidence before downloading any model."""
import json,re,urllib.request,hashlib,html,zipfile,io
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; CACHE=ROOT/'work/nih-hra'; CACHE.mkdir(parents=True,exist_ok=True)
IDS=[20996,20979,20980,20995,20984,20964,20965]
def get(url,path):
 if not path.exists():
  with urllib.request.urlopen(url,timeout=60) as r:path.write_bytes(r.read())
 return path.read_bytes()
def entry(text):
 chunks=[]
 for m in re.finditer(r'self\.__next_f\.push\((\[.*?\])\)</script>',text):
  a=json.loads(m[1])
  if len(a)>1 and isinstance(a[1],str):chunks.append(a[1])
 def walk(x):
  if isinstance(x,dict):
   if isinstance(x.get('entry'),dict):return x['entry']
   for v in x.values():
    z=walk(v)
    if z:return z
  elif isinstance(x,list):
   for v in x:
    z=walk(v)
    if z:return z
 for line in ''.join(chunks).splitlines():
  try:
   z=walk(json.loads(line.split(':',1)[1]))
   if z:return z
  except (ValueError,IndexError):pass
 raise ValueError('No published entry found')
records=[]
manifestPath=ROOT/'src/data/nih-hra-sources.json'
pinned={r['id']:r for r in json.loads(manifestPath.read_text())} if manifestPath.exists() else {}
for i in IDS:
 url=f'https://3d.nih.gov/entries/3DPX-{i:06d}';expected=pinned.get(f'3DPX-{i:06d}');pageUrl=f"https://3d.nih.gov/entries/{i}/{expected['version']}" if expected else url;page=get(pageUrl,CACHE/f'{i}.html').decode();e=entry(page);s=e['submission'];m=s['metadata']
 if expected and s['version']!=expected['version']:raise ValueError('NIH revision changed; review source record before importing')
 licenses=sorted(set(re.findall(r'href="(https://creativecommons.org/licenses/[^"]+)"',page)))
 if m.get('license')!='CC-BY' or licenses!=['https://creativecommons.org/licenses/by/4.0/']:raise ValueError(f'Unreviewed license for {i}: {licenses}')
 if not any(c['title']=='Visible Human Female' for c in e['collections']):raise ValueError('Wrong donor collection')
 fs=[f for f in s['inputFiles'] if f['fileFormat']=='GLB'];assert len(fs)==1
 f=fs[0];downloadUrl=f"https://3d.nih.gov/api/download?submissionId={s['submissionId']}&fileIds={f['fileId']}"
 raw=get(downloadUrl,CACHE/(str(i)+'.download'));data=raw
 if zipfile.is_zipfile(io.BytesIO(raw)):
  z=zipfile.ZipFile(io.BytesIO(raw));names=[n for n in z.namelist() if n.endswith('.glb')];assert len(names)==1;data=z.read(names[0])
 (CACHE/f['name']).write_bytes(data);assert len(data)==f['fileSize']
 if expected and hashlib.sha256(data).hexdigest()!=expected['file']['sha256']:raise ValueError('NIH source checksum changed; manual review required')
 r=dict(id=e['threedpxId'],title=m['title'],version=s['version'],sourceUrl=url,collection='NIH 3D Human Reference Atlas — Visible Human Female',creator=e['user']['displayName'],licenseLabel=m['license'],license='CC-BY-4.0',licenseUrl=licenses[0],attribution=html.unescape(re.sub('<[^>]*>','',m.get('attributionInstructions',''))).strip(),attributionHtml=m.get('attributionInstructions',''),description=html.unescape(re.sub('<[^>]*>','',m['description'])).strip(),recordCheckedAt='2026-09-07',pageSha256=hashlib.sha256(page.encode()).hexdigest(),file=dict(name=f['name'],url=downloadUrl,originalFileUrl=f['s3Location'],bytes=len(data),sha256=hashlib.sha256(data).hexdigest()),ontologies=[dict(name=o['ontologyKey'],id=o['sourceKey']) for o in s['ontologies']])
 records.append(r);print(r['id'],r['title'],r['license'],len(data),r['attribution'],flush=True)
(ROOT/'src/data/nih-hra-sources.json').write_text(json.dumps(records,indent=2)+'\n')
