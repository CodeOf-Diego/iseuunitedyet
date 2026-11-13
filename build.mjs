// Minifies the site into dist/ (HTML, CSS, JS, JSON). The sources stay readable;
// GitHub Pages serves dist/ and adds gzip on top.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { transform } from 'esbuild';
import { minify } from 'html-minifier-terser';

const OUT = 'dist';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT);

const files = {
  'index.html': src => minify(src, {
    collapseWhitespace: true, removeComments: true, removeRedundantAttributes: true,
    removeAttributeQuotes: true, minifyCSS: true, minifyJS: true,
  }),
  'style.css': async src => (await transform(src, { loader: 'css', minify: true })).code,
  'app.js': async src => (await transform(src, { loader: 'js', minify: true, target: 'es2020' })).code,
  'data.json': src => JSON.stringify(JSON.parse(src)),
};

let before = 0, after = 0;
for (const [name, min] of Object.entries(files)) {
  const src = await readFile(name, 'utf8');
  const out = await min(src);
  await writeFile(`${OUT}/${name}`, out);
  const a = Buffer.byteLength(src), b = Buffer.byteLength(out);
  before += a; after += b;
  console.log(`${name.padEnd(11)} ${String(a).padStart(7)} → ${String(b).padStart(7)} bytes  (-${Math.round((1 - b / a) * 100)}%)`);
}
console.log(`${'total'.padEnd(11)} ${String(before).padStart(7)} → ${String(after).padStart(7)} bytes  (-${Math.round((1 - after / before) * 100)}%)`);
