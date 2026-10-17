# Mock OpenAI-compatible endpoint used to test server.py's proxy end to end.
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n=int(self.headers['Content-Length']); body=json.loads(self.rfile.read(n))
        auth=self.headers.get('Authorization')
        txt=json.dumps({"seen_auth": auth, "model": body.get("model"), "n_messages": len(body["messages"])})
        out=json.dumps({"choices":[{"message":{"role":"assistant","content":txt}}]}).encode()
        self.send_response(200); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(out))); self.end_headers(); self.wfile.write(out)
    def log_message(self,*a): pass
HTTPServer(('127.0.0.1',8799),H).serve_forever()
