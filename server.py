#!/usr/bin/env python3
"""ASVAB Coach local server + tiny AI proxy.

Serves the app and forwards POST /api/chat to an OpenAI-compatible endpoint.
The key comes ONLY from the environment. Nothing is hardcoded.

  export OPENAI_API_KEY=sk-...                         # required for AI features
  export OPENAI_BASE_URL=https://api.openai.com/v1     # optional, any OpenAI-compatible API
  export OPENAI_MODEL=gpt-4o-mini                      # optional default model
  python3 server.py            # then open http://localhost:8000  (localhost counts as secure,
                               # so voice answers work in Chrome/Edge)
Options: PORT (default 8000), HOST (default 127.0.0.1).
"""
import json, os, sys, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get('OPENAI_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')
MAX_BODY = 200_000

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.webmanifest': 'application/manifest+json', '.js': 'text/javascript', '.json': 'application/json'}
    def __init__(self, *a, **kw): super().__init__(*a, directory=ROOT, **kw)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache'); super().end_headers()
    def _json(self, code, obj):
        b = json.dumps(obj).encode(); self.send_response(code)
        self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        if self.path.split('?')[0].endswith('/api/health'):
            return self._json(200, {'proxy': True, 'configured': bool(os.environ.get('OPENAI_API_KEY')), 'model': MODEL})
        if self.path.startswith('/build/'): return self._json(404, {'error': 'not found'})
        return super().do_GET()
    def do_POST(self):
        if not self.path.split('?')[0].endswith('/api/chat'): return self._json(404, {'error': 'not found'})
        key = os.environ.get('OPENAI_API_KEY')
        if not key: return self._json(503, {'error': 'Server has no OPENAI_API_KEY set.'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BODY: return self._json(413, {'error': 'Request too large or empty.'})
        try: body = json.loads(self.rfile.read(n))
        except Exception: return self._json(400, {'error': 'Bad JSON.'})
        allowed = {k: body[k] for k in ('messages', 'temperature', 'max_tokens', 'response_format') if k in body}
        if not isinstance(allowed.get('messages'), list): return self._json(400, {'error': 'messages must be a list'})
        allowed['model'] = body.get('model') or MODEL
        allowed['max_tokens'] = min(int(allowed.get('max_tokens') or 1200), 4000)
        req = urllib.request.Request(BASE + '/chat/completions', data=json.dumps(allowed).encode(),
                                     headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read(); self.send_response(r.status)
                self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
        except urllib.error.HTTPError as e:
            self._json(e.code, {'error': e.read().decode('utf-8', 'replace')[:500]})
        except Exception as e:
            self._json(502, {'error': str(e)})

if __name__ == '__main__':
    host = os.environ.get('HOST', '127.0.0.1'); port = int(os.environ.get('PORT', '8000'))
    print(f'ASVAB Coach on http://{"localhost" if host in ("127.0.0.1","0.0.0.0") else host}:{port}  (AI proxy: {"on" if os.environ.get("OPENAI_API_KEY") else "off - no OPENAI_API_KEY"})')
    ThreadingHTTPServer((host, port), Handler).serve_forever()
