"""Refresh Maqam World notation for personal study. No audio is downloaded."""
import concurrent.futures, html, json, pathlib, re, subprocess
from urllib.parse import urljoin
BASE = 'https://www.maqamworld.com'
ROOT = pathlib.Path(__file__).resolve().parents[1]
(ROOT/'assets/notation').mkdir(parents=True, exist_ok=True)
def fetch(url):
    return subprocess.check_output(['curl', '-fsSL', '--retry', '2', '--max-time', '45', url])
def text(s): return html.unescape(re.sub('<[^>]+>', '', s)).strip()
index = fetch(BASE+'/en/iqaa.php').decode()
links = {}
for url, label in re.findall(r'<a[^>]+href="([^"]*/iqaa/[^"#]+\.php)"[^>]*>(.*?)</a>', index, re.S):
    label = text(label)
    if re.search(r'\d+/\d+', label): links[(url, label)] = None
pages = {}
for url, _ in links: pages[url] = None
def page(url): return url, fetch(urljoin(BASE,url)).decode()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    pages.update(pool.map(page,pages))
# Manually verified against each English source page; includes body-text names.
alternate_names = json.loads((ROOT/'scripts/alternate-names.json').read_text())
existing = json.loads((ROOT/'rhythms.json').read_text()) if (ROOT/'rhythms.json').exists() else []
audio_by_id = {r['id']: r.get('audio') for r in existing}
forms_by_id = {r['id']: r.get('forms', []) for r in existing}
rows=[]
seen=set()
for (url,label) in links:
    name,meter=re.match(r'(.*?)\s+(\d+/\d+)',label).groups()
    key=(url,meter)
    if key in seen: continue
    seen.add(key)
    images=list(dict.fromkeys(re.findall(r'<img[^>]+src="([^" ]*/note/iqaa/[^" ]+)"',pages[url])))
    if 'mudawwar.php' in url:
        images=[i for i in images if ('shami' in i.lower()) == ('Shami' in name)]
    if not images: raise ValueError((label,images))
    files=[]
    notation_sources=[]
    for image in images:
        filename=image.rsplit('/',1)[1]
        (ROOT/'assets/notation'/filename).write_bytes(fetch(urljoin(BASE,image)))
        files.append('assets/notation/'+filename)
        notation_sources.append(urljoin(BASE,image))
    rows.append(dict(id=files[0].split('/')[-1].rsplit('.',1)[0],name=name,meter=meter,notations=files,notationSources=notation_sources,source=urljoin(BASE,url),alternateNames=alternate_names.get(url.rsplit('/',1)[-1],[])))
for row in rows:
    row['audio'] = audio_by_id.get(row['id'])
    row['forms'] = forms_by_id.get(row['id'], [])
    source_by_file = dict(zip(row['notations'], row['notationSources']))
    for form in row['forms']:
        form['notationSource'] = source_by_file.get(form.get('notation'))
rows.sort(key=lambda x:x['name'].lstrip('‘`').lower())
(ROOT/'rhythms.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(rows)} rhythms')
