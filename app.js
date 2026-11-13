const app = document.getElementById('app');

/* ---------- data model ----------
   The data is a tree. A node with "items" is a group (its % = weighted mean of its children);
   any other node is a measured leaf:
     steps:  [[label, 0|1], ...]           milestones reached / total
     status: key of data.statuses          fixed score per status (e.g. Draghi measures)
     done/of (+ "lower": smaller is better) value against target
   "weight" (default 1) sets how much a node counts in its parent; 0 = shown but not counted. */

let STATUS = {};
const leafP = i => i.status != null ? STATUS[i.status][1]
  : i.steps ? i.steps.filter(s => s[1]).length / i.steps.length
  : Math.min(1, i.lower ? i.of / i.done : i.done / i.of);

const mean = (xs, f) => {
  let w = 0, s = 0;
  for (const x of xs) { const k = x.weight ?? 1; w += k; s += k * f(x); }
  return w ? s / w : 0;
};
const P = n => n.items ? mean(n.items, P) : leafP(n);

const r = p => Math.round(p * 100);
const num = p => `<b class="n" data-v="${r(p)}">${r(p)}%</b>`;
const host = u => new URL(u).hostname.replace(/^www\./, '');
const NAMES = { AT: 'Austria', BE: 'Belgium', BG: 'Bulgaria', CY: 'Cyprus', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark',
  EE: 'Estonia', EL: 'Greece', ES: 'Spain', FI: 'Finland', FR: 'France', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland',
  IT: 'Italy', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', MT: 'Malta', NL: 'Netherlands', PL: 'Poland',
  PT: 'Portugal', RO: 'Romania', SE: 'Sweden', SI: 'Slovenia', SK: 'Slovakia' };
const country = k => NAMES[k] || k;
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const key = n => n.id || slug(n.name);          // a node's segment in the URL
const href = path => '#' + path.join('/');

// a full-width block filled to p; n = position (staggered animation), color = theme colour
// q (optional) = share against, drawn in red from the right edge
const block = (p, n, inner, link, color, id, q) => {
  const tag = link ? 'a' : 'section';
  return `<${tag} class="blk${n ? '' : ' hero'}${q != null ? ' vs' : ''}"${id ? ` id="${id}"` : ''}${link ? ` href="${link}"` : ''} style="--p:${(p * 100).toFixed(1)};--i:${Math.min(n, 12)}${color ? `;--c:${color}` : ''}${q != null ? `;--q:${q}` : ''}"><div class="in">${inner}</div></${tag}>`;
};

// the 12 stars of the EU flag: five-pointed, upright, on a circle
const starPts = (x, y, R) => Array.from({ length: 10 }, (_, k) => {
  const a = (k * 36 - 90) * Math.PI / 180, rr = k % 2 ? R * .382 : R;
  return `${(x + rr * Math.cos(a)).toFixed(2)},${(y + rr * Math.sin(a)).toFixed(2)}`;
}).join(' ');
const stars = `<svg class="stars" viewBox="-50 -50 100 100" aria-hidden="true">${
  Array.from({ length: 12 }, (_, k) => {
    const a = k * Math.PI / 6;
    return `<polygon style="--k:${k}" points="${starPts(36 * Math.sin(a), -36 * Math.cos(a), 7)}"/>`;
  }).join('')}</svg>`;

const searchBox = `<form class="search" role="search"><input type="search" placeholder="Search" aria-label="Search" autocomplete="off"><ul class="hits"></ul></form>`;
let SOURCES = {}; // shared sources: an item's src can list a key of data.sources instead of [label, url]
const sources = src => src ? `<p class="src">${src.map(s => typeof s === 'string' ? SOURCES[s] : s).map(s => `<a href="${s[1]}" target="_blank" rel="noopener">${s[0]} <small>${host(s[1])}</small></a>`).join('')}</p>` : '';
const note = n => n.note ? `<p class="m"><em>${n.note}</em></p>` : '';

// search index: every node, with the words it can be found by
function buildIndex(root) {
  const idx = [];
  const walk = (n, path, parent) => {
    if (path.length) idx.push({
      label: n.name, sub: parent.name === root.name ? '' : parent.name, href: href(path),
      text: norm([n.name, parent.name, n.unit || '', ...(n.keywords || []), ...(n.steps || []).map(s => s[0])].join(' '))
    });
    for (const c of n.items || []) walk(c, [...path, key(c)], n);
  };
  walk(root, [], root);
  return idx;
}

function leaf(i, n, path, color, basis) {
  const p = leafP(i);
  const measure = i.status != null ? STATUS[i.status][0]
    : i.steps ? `${i.steps.filter(s => s[1]).length} / ${i.steps.length} milestones`
    : i.lower ? `${i.done} ${i.unit} (target ≤ ${i.of})` : `${i.done} / ${i.of} ${i.unit}`;
  const meta = [measure, i.year, i.basis && `<span class="tag" title="${basis[i.basis]}">${i.basis}</span>`].filter(Boolean).join(' · ');
  // per-country value: a number, or [for, against] — "against" fills red from the right
  const chip = ([k, v]) => {
    const [a, q] = [].concat(v);
    return `<span style="--p:${a}${q != null ? `;--q:${q}` : ''}"${q != null ? ' class="vs"' : ''}>${country(k)} <b>${Math.round(a)}${q != null ? ` / <em>${Math.round(q)}</em>` : ''}</b></span>`;
  };
  return block(p, n, `
    <div class="row"><span>${i.name}</span>${num(p)}</div>
    <p class="m">${meta}</p>
    ${note(i)}
    ${i.against != null ? `<p class="m"><em class="against">${i.against}% ${i.againstLabel || 'against'}</em></p>` : ''}
    ${i.missing ? `<p class="m">Missing: ${i.missing.map(country).join(', ')}</p>` : ''}
    ${i.by ? `<div class="by">${Object.entries(i.by).sort((a, b) => [].concat(b[1])[0] - [].concat(a[1])[0]).map(chip).join('')}</div>` : ''}
    ${i.steps ? `<ul class="steps">${i.steps.map(s => `<li class="${s[1] ? 'ok' : ''}">${s[0]}</li>`).join('')}</ul>` : ''}
    ${sources(i.src)}`,
    null, color, path.join('/'), i.against);
}

// a page for any group: header block, then one block per child (groups link deeper, leaves show details)
function page(d, node, path, color, src) {
  const p = P(node), root = !path.length;
  let head;
  if (root) {
    const done = p >= 1; // one day
    document.title = done ? 'The European Union is complete' : `The European Union is at ${r(p)}%`;
    head = `${stars}<h1>The European <b>Union</b> is ${done ? 'complete' : `at ${num(p)}`}</h1>`;
  } else {
    document.title = `${node.name} ${r(p)}%`;
    head = `<a class="up" href="${href(path.slice(0, -1))}">&lt; Back</a><h1>${node.name} ${num(p)}</h1>${note(node)}${sources(src)}`;
  }
  return block(p, 0, head + searchBox, null, color)
    + node.items.map((c, n) => {
        const cp = [...path, key(c)], cc = c.color || color;
        return c.items
          ? block(P(c), n + 1, `<div class="row"><span>${c.name}</span>${num(P(c))}</div>${note(c)}`, href(cp), cc)
          : leaf(c, n + 1, cp, cc, d.basis);
      }).join('');
}

// numbers count up alongside the fill animation
function countUp() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = [...app.querySelectorAll('.n')], t0 = performance.now(), dur = 1200;
  const tick = t => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    for (const el of els) el.textContent = Math.round(el.dataset.v * e) + '%';
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// live results while typing; Enter jumps to the first one
function wireSearch(idx) {
  const form = app.querySelector('.search'), input = form.querySelector('input'), list = form.querySelector('.hits');
  let hits = [];
  input.addEventListener('input', () => {
    const words = norm(input.value).split(/\s+/).filter(Boolean);
    hits = words.length ? idx.filter(e => words.every(w => e.text.includes(w))).slice(0, 8) : [];
    list.innerHTML = hits.map(h => `<li><a href="${h.href}">${h.label}${h.sub ? ` <small>${h.sub}</small>` : ''}</a></li>`).join('')
      || (words.length ? '<li class="none">No match</li>' : '');
  });
  form.addEventListener('submit', e => { e.preventDefault(); if (hits[0]) location.hash = hits[0].href; });
}

// follow the URL down the tree; stop at the deepest group, remember a leaf to highlight.
// colour and sources are inherited: a group without its own uses its nearest ancestor's
function locate(root) {
  let node = root, path = [], color, src, target = null;
  for (const seg of location.hash.slice(1).split('/').filter(Boolean)) {
    const c = (node.items || []).find(c => key(c) === seg);
    if (!c) break;
    if (!c.items) { target = [...path, seg].join('/'); break; }
    node = c; path.push(seg); color = c.color || color; src = c.src || src;
  }
  return { node, path, color, src, target };
}

function render(d, root, idx) {
  const { node, path, color, src, target } = locate(root);
  app.innerHTML = page(d, node, path, color, src)
    + `<footer>Updated ${d.updated} · <a href="data.json">data.json</a></footer>`;
  wireSearch(idx);
  countUp();
  const el = target && document.getElementById(target);
  if (el) { el.scrollIntoView(); el.classList.add('hit'); } else scrollTo(0, 0);
}

fetch('data.json')
  .then(res => res.json())
  .then(d => {
    STATUS = d.statuses || {};
    SOURCES = d.sources || {};
    const root = { name: 'The European Union', items: d.categories };
    const idx = buildIndex(root);
    render(d, root, idx);
    addEventListener('hashchange', () => render(d, root, idx));
  })
  .catch(() => { app.textContent = 'Could not load data.json'; });
