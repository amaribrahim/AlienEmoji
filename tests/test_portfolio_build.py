import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'tools/build_portfolio.py'

class PortfolioBuildTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'source'
        self.dest = Path(self.tmp.name) / 'site'
        self.root.mkdir(); self.dest.mkdir()

    def project(self, slug, **fields):
        folder = self.root / slug
        folder.mkdir(exist_ok=True)
        (folder / 'project.json').write_text(json.dumps({'id': slug, 'title': slug, **fields}))
        return folder

    def build(self):
        self.assertTrue(SCRIPT.exists(), 'Portfolio builder must exist')
        spec = importlib.util.spec_from_file_location('builder', SCRIPT)
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        return module.build(self.root, self.dest)

    def test_order_optional_fields_add_remove_and_preserve_page(self):
        self.project('ordinary', order=1)
        self.project('featured', featured=True, featuredOrder=2)
        (self.dest/'index.html').write_text('keep page')
        data = self.build()
        self.assertEqual([p['id'] for p in data['projects']], ['featured','ordinary'])
        self.assertNotIn('cover', data['projects'][0])
        (self.root/'featured'/'project.json').unlink()
        self.project('new', order=0)
        data = self.build()
        self.assertEqual([p['id'] for p in data['projects']], ['new','ordinary'])
        self.assertFalse((self.dest/'featured').exists())
        self.assertEqual((self.dest/'index.html').read_text(), 'keep page')

    def test_external_media_order_and_provenance(self):
        self.project('example', media=[{'title':'Later','type':'video','source':'https://example.com/later.mp4','order':2}, {'title':'First','type':'video','source':'https://example.com/first.mp4','order':1}])
        self.assertEqual(self.build()['projects'][0]['media'][0]['title'], 'First')

    def test_missing_asset_does_not_replace_index(self):
        self.project('missing', media=[{'title':'Missing','type':'audio','file':'media/missing.mp3'}])
        (self.dest/'projects.json').write_text('previous')
        with self.assertRaisesRegex(ValueError, 'missing.mp3'):
            self.build()
        self.assertEqual((self.dest/'projects.json').read_text(), 'previous')

    def test_escaping_unlisted_symlink_is_rejected_before_output_changes(self):
        folder = self.project('example')
        outside = self.root.parent / 'private.txt'
        outside.write_text('private')
        (folder / 'unlisted.txt').symlink_to(outside)
        (self.dest / 'projects.json').write_text('previous')
        with self.assertRaisesRegex(ValueError, 'symlink'):
            self.build()
        self.assertEqual((self.dest / 'projects.json').read_text(), 'previous')

    def test_waveform_is_derived_from_audio_and_cached(self):
        import math, struct, wave
        folder = self.project('signal', media=[{'title':'Signal','type':'audio','file':'media/signal.wav'}])
        (folder/'media').mkdir()
        with wave.open(str(folder/'media/signal.wav'), 'wb') as audio:
            audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(8000)
            samples = [0]*4000 + [int(16000*math.sin(2*math.pi*440*i/8000)) for i in range(4000)]
            audio.writeframes(struct.pack('<8000h', *samples))
        track = self.build()['projects'][0]['media'][0]
        wavefile = folder / track['waveform']
        data = json.loads(wavefile.read_text())
        self.assertAlmostEqual(data['duration'], 1.0, places=2)
        self.assertEqual(max(data['peaks'][:400]), 0)
        self.assertGreater(max(data['peaks'][400:]), .99)
        before = wavefile.stat().st_mtime_ns
        self.build()
        self.assertEqual(wavefile.stat().st_mtime_ns, before)

    def test_local_video_gets_cached_poster_and_explicit_poster_is_preserved(self):
        import subprocess
        folder = self.project('video', media=[{'title':'Clip','type':'video','file':'media/clip.mp4'}])
        (folder/'media').mkdir()
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=blue:s=160x90:d=0.2','-c:v','libx264',str(folder/'media/clip.mp4')], check=True)
        track = self.build()['projects'][0]['media'][0]
        self.assertIn('poster', track)
        poster = folder/track['poster']
        self.assertTrue(poster.is_file())
        before = poster.stat().st_mtime_ns
        self.build()
        self.assertEqual(poster.stat().st_mtime_ns, before)
        self.project('video', media=[{'title':'Clip','type':'video','file':'media/clip.mp4','poster':track['poster']}])
        self.assertEqual(self.build()['projects'][0]['media'][0]['poster'], track['poster'])

    def test_id_must_match_folder(self):
        self.project('stable', id='different')
        with self.assertRaisesRegex(ValueError, 'ID'):
            self.build()

if __name__ == '__main__': unittest.main()
