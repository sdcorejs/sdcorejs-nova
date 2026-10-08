// Static server for the production build with the CSP headers under test
// (architecture §9): CSP-A enforced, CSP-B report-only. Usage: node server.mjs [port]
// Prints "LISTENING <port>" once ready (port 0 picks a free port).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const port = Number(process.argv[2] ?? 0);

// Vite CSR has no inline script, so no nonce/strict-dynamic is needed (§9).
export const CSP_A = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:", "font-src 'self'", "connect-src 'self'", "object-src 'none'",
  "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');
export const CSP_B = CSP_A.replace("style-src-attr 'unsafe-inline'", "style-src-attr 'none'");

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  response.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Content-Security-Policy': CSP_A,
    'Content-Security-Policy-Report-Only': CSP_B,
    'Cache-Control': 'no-store',
  });
  response.end(readFileSync(file));
}).listen(port, '127.0.0.1', function onListen() {
  console.log(`LISTENING ${this.address().port}`);
});
