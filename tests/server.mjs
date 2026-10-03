// Local stand-in for nginx.conf, for tests and previews: serves site/ with the same page rules
// (/rawatan -> /rawatan/, /rawatan/ -> rawatan/index.html, dotfiles and unknown paths -> 404.html
// with status 404). Redirect, header and health-check rules are nginx-only and are tested
// against production instead (tests/production.spec.ts).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../site/', import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json',
};

const isFile = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };
const isDir = async (p) => { try { return (await stat(p)).isDirectory(); } catch { return false; } };

const send = async (res, file, status = 200) => {
  res.writeHead(status, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(await readFile(file));
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(ROOT, path));
  const notFound = () => send(res, join(ROOT, '404.html'), 404);
  if (!file.startsWith(normalize(ROOT)) || path.split('/').some((s) => s.startsWith('.'))) return notFound();
  if (path === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok\n'); }
  if (await isFile(file)) return send(res, file);
  if (await isDir(file)) {
    if (!path.endsWith('/')) { res.writeHead(301, { Location: path + '/' }); return res.end(); }
    if (await isFile(join(file, 'index.html'))) return send(res, join(file, 'index.html'));
  }
  return notFound();
}).listen(PORT, '127.0.0.1', () => console.log(`site/ on http://127.0.0.1:${PORT}`));
