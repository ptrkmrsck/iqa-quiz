"""Importer checks: run python3 -m unittest discover -s tests -p 'test_*.py'."""
import importlib.util
import json
from pathlib import Path
import struct
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('import_jins', ROOT / 'scripts/import-jins.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ImportJinsTests(unittest.TestCase):
    def test_contextual_pitches_maps_comments_and_microtonal_labels(self):
        page = '''<div class="heading"><h1>Jins Example</h1></div>
        <div class="notation"><img src="/note/jins/one.png" usemap="#one"></div>
        <map name="one"><area class="playNote" shape="circle" coords="10,20,12"
        alt="E4<i class='icon-halfflat'></i>" data-frequency="320"><!-- variable 318~324 --></map>
        <div class="notation"><img src="/note/jins/two.png" usemap="#two"></div>
        <map name="two"><area class="playNote" shape="circle" coords="30,40,13"
        alt="E4<i class='icon-halfflat'></i>" data-frequency="321.33"></map>
        <p>Tonic E<i class="icon-halfflat"></i>.</p>
        <div class="player-area"></div>
        <div class="track" data-song="/audio/jins/example/song.mp3"><label><b>Song</b><span>Performer</span></label></div>'''
        png = b'\x89PNG\r\n\x1a\n' + b'\x00' * 8 + struct.pack('>II', 100, 60)
        with patch.object(module, 'fetch', side_effect=lambda url: png if url.endswith('.png') else page.encode()):
            row = module.import_page(('https://www.maqamworld.com/en/jins/example.php', 'Example'))
        a, b = row['notations']
        self.assertEqual(a['notes'][0]['frequencyHz'], 320)
        self.assertEqual(b['notes'][0]['frequencyHz'], 321.33)
        self.assertEqual(a['notes'][0]['label'], 'E4 half-flat')
        self.assertEqual(a['notes'][0]['sourceComment'], 'variable 318~324')
        self.assertIn('half-flat', row['sourceDescriptions'][0])
        self.assertEqual(row['examples'][0]['credits'], ['Performer'])
        self.assertEqual((a['width'], a['height']), (100, 60))

    def test_catalog_integrity(self):
        rows = json.loads((ROOT / 'jins.json').read_text())
        self.assertEqual(len(rows), 24)
        self.assertEqual(len({r['id'] for r in rows}), len(rows))
        for row in rows:
            self.assertTrue(row['notations'])
            self.assertTrue(row['examples'])
            self.assertEqual(row['review']['status'], 'unreviewed')
            for notation in row['notations']:
                self.assertTrue(notation['source'].startswith(module.BASE + '/note/jins/'))
                for note in notation['notes']:
                    self.assertGreater(note['frequencyHz'], 0)
                    self.assertLessEqual(note['position']['x'], notation['width'])
                    self.assertLessEqual(note['position']['y'], notation['height'])
            for track in row['examples']:
                self.assertTrue(track['source'].startswith(module.BASE + '/audio/jins/'))
                self.assertTrue(track['title'])
