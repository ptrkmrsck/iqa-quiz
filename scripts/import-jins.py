"""Import jins metadata and source pitches. Media stays on Maqam World.

PNG files are read into memory only to obtain coordinate-space dimensions.
No pitches, tonic/ghammaz roles, or playback sequences are inferred.
"""
import concurrent.futures
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import struct
import subprocess
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.maqamworld.com'
INDEX = BASE + '/en/jins.php'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []
    def find(self, tag=None, cls=None):
        for child in self.children:
            if isinstance(child, Node):
                if (tag is None or child.tag == tag) and (cls is None or cls in child.attrs.get('class', '').split()):
                    yield child
                yield from child.find(tag, cls)
    def text(self):
        icons = {'icon-halfflat': 'half-flat', 'icon-halfsharp': 'half-sharp'}
        for cls in self.attrs.get('class', '').split():
            if cls in icons:
                return icons[cls]
        return ' '.join(' '.join(c.text() if isinstance(c, Node) else c for c in self.children).split())

class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.last_area = None
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        self.last_area = node if tag == 'area' else None
        if tag not in VOID:
            self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break
    def handle_data(self, data):
        self.stack[-1].children.append(data)
        if data.strip():
            self.last_area = None
    def handle_comment(self, comment):
        if self.last_area is not None:
            self.last_area.attrs['source-comment'] = comment.strip()


def fetch(url):
    return subprocess.check_output(['curl', '-fsSL', '--retry', '2', '--max-time', '60', url])


def note_label(raw):
    for icon, label in [('halfflat', ' half-flat'), ('halfsharp', ' half-sharp')]:
        raw = re.sub(r'<i\b[^>]*class=[\'"][^\'"]*icon-' + icon + r'[^\'"]*[\'"][^>]*>\s*</i>', label, raw)
    return Document(html.unescape(raw)).root.text()


def import_page(item):
    source, name = item
    markup = fetch(source).decode('utf-8')
    doc = Document(markup).root
    heading = next(doc.find('div', 'heading'))
    # Only the explanatory paragraphs preceding the first recording player.
    introduction = markup[markup.index('<div class="heading'):].split('<div class="player-area"', 1)[0]
    paragraphs = [p.text() for p in Document(introduction).root.find('p') if 'clicknotes' not in p.attrs.get('class', '').split() and p.text()]
    maps = {m.attrs.get('name'): m for m in doc.find('map')}
    diagrams = []
    warnings = []
    for image in doc.find('img'):
        path = image.attrs.get('src', '')
        if '/note/jins/' not in path:
            continue
        image_url = urljoin(source, path)
        png = fetch(image_url)
        if png[:8] != b'\x89PNG\r\n\x1a\n':
            raise ValueError('Expected PNG: ' + image_url)
        width, height = struct.unpack('>II', png[16:24])
        map_name = image.attrs.get('usemap', '').lstrip('#')
        if map_name not in maps:
            raise ValueError('Missing note map: ' + source)
        notes = []
        for area in maps[map_name].find('area'):
            if 'playNote' not in area.attrs.get('class', '').split():
                continue
            a = area.attrs
            coords = [float(x.strip()) for x in a['coords'].split(',')]
            frequency = float(a['data-frequency'])
            if a.get('shape') != 'circle' or len(coords) != 3 or frequency <= 0:
                raise ValueError('Unexpected note: ' + source + str(a))
            if not (0 <= coords[0] <= width and 0 <= coords[1] <= height):
                warnings.append('Note center outside image: ' + a.get('alt', ''))
            notes.append({'label': note_label(a.get('alt', '')), 'sourceLabelHtml': a.get('alt', ''),
                          'frequencyHz': frequency, 'position': {'x': coords[0], 'y': coords[1], 'radius': coords[2]},
                          'sourceComment': a.get('source-comment', '')})
        if not notes:
            raise ValueError('No playable notes: ' + source)
        diagrams.append({'id': Path(urlparse(image_url).path).stem, 'source': image_url,
                         'width': width, 'height': height, 'mapName': map_name, 'notes': notes})
    examples = []
    for track in doc.find('div', 'track'):
        if not track.attrs.get('data-song'):
            continue
        title = next(track.find('b'), None)
        examples.append({'source': urljoin(source, track.attrs['data-song'].strip()),
                         'title': title.text() if title else '',
                         'credits': [s.text() for s in track.find('span') if s.text()]})
    pronunciations = list(dict.fromkeys(urljoin(source, a.attrs['data-audio']) for a in doc.find('a', 'pronunciation') if a.attrs.get('data-audio')))
    # Preserve explanatory prose for later human review; it is not a quiz answer key.
    row = {'id': Path(urlparse(source).path).stem, 'name': name, 'source': source,
           'sourceHeading': heading.text(), 'sourceDescriptions': paragraphs,
           'pronunciationSources': pronunciations, 'notations': diagrams, 'examples': examples,
           'review': {'status': 'unreviewed', 'warnings': warnings,
                      'needs': ['Identify core notes versus baggage and alternatives',
                                'Confirm tonic and ghammaz roles from source explanation',
                                'Choose reference-note sequence; source order is not a verified scale',
                                'Review musical examples before quiz use']}}
    if not diagrams:
        raise ValueError('No notation: ' + source)
    return row


def main():
    doc = Document(fetch(INDEX).decode('utf-8')).root
    pages = {}
    for a in doc.find('a'):
        url = urljoin(INDEX, a.attrs.get('href', ''))
        if re.fullmatch(re.escape(BASE) + r'/en/jins/[^/]+\.php', url):
            pages.setdefault(url, a.text().removeprefix('Jins '))
    if not pages:
        raise ValueError('Jins index empty')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(import_page, pages.items()))
    rows.sort(key=lambda r: r['name'].lstrip('‘').lower())
    path = ROOT / 'jins.json'
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'ajnas': len(rows), 'diagrams': sum(len(r['notations']) for r in rows),
                      'notes': sum(len(n['notes']) for r in rows for n in r['notations']),
                      'examples': sum(len(r['examples']) for r in rows),
                      'pronunciations': sum(len(r['pronunciationSources']) for r in rows),
                      'warnings': {r['id']: r['review']['warnings'] for r in rows if r['review']['warnings']}}, indent=2))

if __name__ == '__main__':
    main()
