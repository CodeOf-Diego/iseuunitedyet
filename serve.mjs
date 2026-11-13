// Tiny local server: browsers block fetch() on file:// pages, so open the site through http://.
// Usage: npm start            (sources)   ·   npm start -- dist   (minified build)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.argv[2] || '.', port = 8080;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\]|\.\.)+/, '') || 'index.html';
  try {
    const body = await readFile(join(root, path.endsWith('/') || path.endsWith('\\') ? path + 'index.html' : path));
    res.writeHead(200, { 'Content-Type': (types[extname(path)] || 'application/octet-stream') + '; charset=utf-8' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`http://localhost:${port}/`));
