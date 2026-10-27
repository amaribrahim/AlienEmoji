#!/usr/bin/env python3
"""Local-only static preview with HTTP byte ranges for accurate media seeking."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re

class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.byte_range = None
        path = Path(self.translate_path(self.path))
        requested = self.headers.get('Range')
        if not requested or not path.is_file(): return super().send_head()
        size = path.stat().st_size
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested)
        if not match or not any(match.groups()):
            self.send_error(416); return None
        left, right = match.groups()
        start = int(left) if left else max(0, size-int(right))
        end = min(size-1, int(right)) if left and right else size-1
        if start > end or start >= size:
            self.send_response(416); self.send_header('Content-Range', f'bytes */{size}'); self.end_headers(); return None
        source = path.open('rb'); source.seek(start)
        self.byte_range = end-start+1
        self.send_response(206)
        self.send_header('Content-type', self.guess_type(str(path)))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(self.byte_range))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        return source

    def copyfile(self, source, outputfile):
        if self.byte_range is None: return super().copyfile(source, outputfile)
        remaining = self.byte_range
        while remaining:
            chunk = source.read(min(65536, remaining))
            if not chunk: break
            outputfile.write(chunk); remaining -= len(chunk)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    print(f'Preview: http://127.0.0.1:{args.port}/portfolio/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(root))).serve_forever()
