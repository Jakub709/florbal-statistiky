#!/usr/bin/env node
'use strict';
/**
 * Florbal – statistiky hráčů. Lokální server bez externích závislostí (stačí Node.js 18+).
 *   npm start            → http://localhost:3000
 *   PORT=8080 npm start  → jiný port
 * Na Netlify místo tohoto serveru běží netlify/functions/api.mjs se stejnou logikou (lib/core.js).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createApi } = require('./lib/core');
const { fileStorage, PASSWORD_FILE } = require('./lib/store');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const handleApi = createApi(fileStorage);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webp': 'image/webp',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 2e6) { reject(new Error('Příliš velký požadavek')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  if (rel === '/admin') rel = '/admin.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Zakázáno'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Nenalezeno'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.jpg' || ext === '.svg' ? 'public, max-age=86400' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      const bodyText = req.method === 'GET' || req.method === 'HEAD' ? '' : await readBody(req);
      const out = await handleApi({
        method: req.method, pathname: url.pathname, headers: req.headers,
        ip: req.socket.remoteAddress, bodyText, secure: false,
      });
      res.writeHead(out.status, { 'X-Content-Type-Options': 'nosniff', ...out.headers });
      res.end(out.body);
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, url);
    } else {
      res.writeHead(405); res.end('Metoda není povolena');
    }
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: e.message || 'Chyba' }));
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n  Florbal běží na http://localhost:${PORT}`);
    console.log(`  Administrace:   http://localhost:${PORT}/admin`);
    if (fs.existsSync(PASSWORD_FILE)) console.log('  První heslo admina najdete v souboru data/PRVNI-HESLO-ADMIN.txt\n');
  });
}

module.exports = { server };
