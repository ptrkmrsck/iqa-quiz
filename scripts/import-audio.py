"""Import form-specific notation, Faisal Zedan demos, and musical examples."""
import concurrent.futures, hashlib, html, json, pathlib, re, subprocess, sys
from urllib.parse import urljoin
ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'https://www.maqamworld.com'
def fetch(url):
    return subprocess.check_output(['curl','-fsSL','--retry','2','--max-time','90',url])
def clean(value):
    return ' '.join(html.unescape(re.sub('<[^>]+>',' ',value)).split())
rows=json.loads((ROOT/'rhythms.json').read_text())
cache=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else None
def page(url):
    return url,(cache/url.rsplit('/',1)[1]).read_text() if cache else fetch(url).decode()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    pages=dict(pool.map(page,dict.fromkeys(r['source'] for r in rows)))
assets=ROOT/'assets/audio';assets.mkdir(exist_ok=True)
downloads={}
for row in rows:
    forms=[]
    for i,notation in enumerate(row['notations']):
        meter=row['meter']
        if 'hachaa' in notation: meter=re.search(r'hachaa_(\d)_(\d)',notation).expand(r'\1/\2')
        label=('Form '+['I','II','III'][i]) if len(row['notations'])>1 else 'Standard form'
        if 'hachaa' in notation:label=meter+' form'
        forms.append(dict(id=pathlib.Path(notation).stem,label=label,meter=meter,notation=notation,notationSource=row['notationSources'][i],tabla=[],examples=[]))
    current=None
    pattern=r'<h3[^>]*>(?P<heading>.*?)</h3>|<img[^>]+src="(?P<notation>/note/iqaa/[^"]+)"|<div[^>]+class="(?P<classes>[^"]*\btrack\b[^"]*)"[^>]+data-song="(?P<song>[^"]+)"(?P<body>.*?)</label>'
    for match in re.finditer(pattern,pages[row['source']],re.S):
        if match['heading'] is not None:
            heading=clean(match['heading'])
            # These tempo variants have examples but no separate source notation.
            if 'faster form of' in heading or 'slower form of' in heading:
                current=dict(id=row['id']+'-4-4',label='Faster 4/4 form' if 'faster' in heading else 'Slower 4/4 form',meter='4/4',notation=None,notationSource=None,notationNote='MaqamWorld does not provide a separate transcription for this tempo variant.',tabla=[],examples=[])
                forms.append(current)
            continue
        if match['notation']:
            current=next((f for f in forms if f['notation'] and pathlib.Path(f['notation']).name==pathlib.Path(match['notation']).name),None)
            continue
        if current is None:continue
        source=urljoin(BASE,html.unescape(match['song']).strip())
        demo='demo-track' in match['classes']
        body=clean(match['body'])
        if demo:
            if 'Tabla demonstration by Faisal Zedan' not in body:continue
            # Fox's 2/4 demonstration follows its slower-example section.
            target=forms[0] if row['id']=='fox' else current
            if not source.startswith(BASE+'/demo/iqaa/tabla/'):raise ValueError(source)
            local='assets/audio/'+pathlib.Path(match['song']).name
        else:
            if not source.startswith(BASE+'/audio/iqaa/'):continue
            target=current
            local='assets/audio/example-'+hashlib.sha256(source.encode()).hexdigest()[:16]+'.mp3'
        title=re.search(r'<b>(.*?)</b>',match['body'],re.S)
        credits=[clean(x) for x in re.findall(r'<span[^>]*>(.*?)</span>',match['body'],re.S)]
        track=dict(src=local,source=source,title=clean(title[1]) if title else '',credits=credits)
        if demo:track['performer']='Faisal Zedan'
        target['tabla' if demo else 'examples'].append(track)
        downloads[local]=source
    row['forms']=forms
    row['audio']=forms[0]['tabla'][0] if forms[0]['tabla'] else None

def download(item):
    local,source=item
    path=ROOT/local
    if not path.exists():
        data=fetch(source)
        if not data or not(data.startswith(b'ID3') or data[0]==255):raise ValueError('Not MP3: '+source)
        path.write_bytes(data)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(download,downloads.items()))
(ROOT/'rhythms.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('Forms:',sum(len(r['forms']) for r in rows),'Tracks:',len(downloads))
for r in rows:
    if len(r['forms'])>1:print(r['name'],[(f['label'],len(f['tabla']),len(f['examples'])) for f in r['forms']])
