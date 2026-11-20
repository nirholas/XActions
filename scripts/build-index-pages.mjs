#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Build the three landing pages that route people into the documentation:
 *
 *   /docs       every generated page, grouped by section
 *   /tutorials  the guided walkthroughs, plus the AI prompt library
 *   /examples   the runnable programs in examples/
 *
 * All three are generated from what is actually on disk rather than
 * hand-maintained, because a hand-written index is wrong the first time
 * somebody adds a file. /examples in particular reads the header comment of
 * each example, so its descriptions cannot drift from the code.
 *
 * Run after build-all-docs.js, which writes the manifest this consumes.
 *
 * Usage:
 *   npm run site:index
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderPage, escapeHtml, REPO_URL } from './lib/page-shell.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Counts quoted in the copy, read from what they count. The docs index said
// "144 MCP tools" and "93 browser console scripts" long after both had moved.
// Same counting rule as scripts/audit-docs.mjs: one `  {` line per tool entry.
function countMcpTools() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'mcp', 'server.js'), 'utf8');
  const start = source.indexOf('const TOOLS = [');
  const end = source.indexOf('\n];', start);
  const n = start === -1 || end === -1 ? 0 : (source.slice(start, end).match(/^\s{2}\{\s*$/gm) || []).length;
  if (!n) throw new Error('could not count MCP tools in src/mcp/server.js');
  return n;
}
/** Published /scripts/<slug> pages, from the manifest build-script-pages.js writes. */
function countScriptPages() {
  const manifest = path.join(__dirname, '..', 'dashboard', 'scripts', '_manifest.json');
  return JSON.parse(fs.readFileSync(manifest, 'utf8')).length;
}
const MCP_TOOLS = countMcpTools();
const SCRIPT_PAGES = countScriptPages();
const ROOT = path.join(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'dashboard');
const MANIFEST = path.join(DASHBOARD, 'docs', '_pages-manifest.json');

/**
 * Section order for the docs index. Anything not listed follows, sorted by
 * page count, so a new section appears without needing a code change.
 */
const SECTION_ORDER = [
  'Tutorials',
  'Guides & Reference',
  'Browser Automation',
  'Agent Skills',
  'Claude Prompt Library',
  'Developer Guides',
  'Architecture',
  'Research & Architecture',
  'Case Studies',
  'Skill References',
  'Extensions & Plugins',
  'Project Info',
  'Launch & Releases',
];

/**
 * Read the header comment of an example and pull out what it is for.
 *
 * Examples open with a JSDoc block whose first lines are the title and a
 * paragraph explaining the point. Reading them here means the index describes
 * whatever the file currently does.
 *
 * @param {string} file - Filename inside examples/
 * @returns {{file: string, number: string, title: string, blurb: string, usage: string[], needsLogin: boolean}|null}
 */
function parseExample(file) {
  const source = fs.readFileSync(path.join(ROOT, 'examples', file), 'utf8');
  const block = source.match(/\/\*\*([\s\S]*?)\*\//);
  if (!block) return null;

  const lines = block[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*ā?\s?/, '').replace(/^\s*\*\s?/, '').trimEnd());

  const headline = lines.find((l) => /^\d{2}\s+—/.test(l.trim()));
  if (!headline) return null;

  const [number, title] = headline.trim().split(/\s+—\s+/);

  // The blurb is the prose between the headline and the first usage line.
  const start = lines.indexOf(headline) + 1;
  const blurbLines = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('node examples/') || line.startsWith('@')) break;
    if (line) blurbLines.push(line);
    else if (blurbLines.length) break;
  }

  const usage = lines
    .map((l) => l.trim())
    .filter((l) => l.startsWith('node examples/') || l.includes('node examples/'))
    .slice(0, 2);

  return {
    file,
    number,
    title,
    blurb: blurbLines.join(' '),
    usage,
    // The shared helper's authenticated entry point is only imported by the
    // examples that genuinely need a session.
    needsLogin: source.includes('openAuthenticatedScraper'),
  };
}

/**
 * @param {{icon?: string, href: string, title: string, desc: string, meta?: string}} card
 * @returns {string}
 */
function renderCard({ icon, href, title, desc, meta }) {
  return `      <a class="card" href="${href}">
        ${icon ? `<span class="card__icon" aria-hidden="true">${icon}</span>` : ''}
        <span class="card__title">${escapeHtml(title)}</span>
        <span class="card__desc">${escapeHtml(desc)}</span>
        ${meta ? `<span class="card__meta">${meta}</span>` : ''}
      </a>`;
}

/**
 * Build a hero block.
 * @param {string} eyebrow
 * @param {string} heading
 * @param {string} lede
 * @returns {string}
 */
function hero(eyebrow, heading, lede) {
  return `    <span class="eyebrow">${eyebrow}</span>
    <h1>${escapeHtml(heading)}</h1>
    <p class="hero__lede">${lede}</p>`;
}

// ─── /docs ──────────────────────────────────────────────────────────

/**
 * @param {Array} pages
 * @returns {string}
 */
function buildDocsIndex(pages) {
  const bySection = new Map();
  for (const page of pages) {
    // Section READMEs are the index of their own section, so listing them
    // inside that index is a card that links back to the page you are on.
    if (page.slug === 'readme' && page.section !== 'Project Info') continue;
    if (!bySection.has(page.section)) bySection.set(page.section, []);
    bySection.get(page.section).push(page);
  }

  const ordered = [...bySection.entries()].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a[0]);
    const bi = SECTION_ORDER.indexOf(b[0]);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return b[1].length - a[1].length;
  });

  const sections = ordered
    .map(([section, sectionPages]) => {
      const icon = sectionPages[0].icon;
      const cards = sectionPages
        .map((p) => renderCard({
          href: p.urlPath,
          title: p.title,
          desc: p.description,
          meta: `${p.minutes} min read`,
        }))
        .join('\n');

      return `    <h2 id="${section.toLowerCase().replace(/[^\w]+/g, '-')}">${icon} ${escapeHtml(section)} <span class="tag">${sectionPages.length}</span></h2>
    <div class="card-grid">
${cards}
    </div>`;
    })
    .join('\n\n');

  const body = `<main class="content content--wide" id="main">
  <div class="prose">
${hero('📖 Documentation', 'XActions documentation', `${pages.length} pages covering the CLI, the Node.js library, ${''}the MCP server for AI agents, and ${''}the browser console scripts. Press <kbd>⌘K</kbd> to search all of it.`)}

    <div class="quick-links">
      <a class="btn" href="/docs/learn/your-first-scrape">Start here →</a>
      <a class="btn btn--ghost" href="/docs/guides/troubleshooting">Something is broken</a>
      <a class="btn btn--ghost" href="/examples">Runnable examples</a>
    </div>

${sections}
  </div>
</main>`;

  return renderPage({
    title: 'Documentation',
    description: `XActions documentation: ${pages.length} pages on the CLI, the Node.js library, ${MCP_TOOLS} MCP tools for AI agents and ${SCRIPT_PAGES} browser scripts. No X API key needed.`,
    urlPath: '/docs',
    navCurrent: 'docs',
    body,
  });
}

// ─── /tutorials ─────────────────────────────────────────────────────

/**
 * @param {Array} pages
 * @returns {string}
 */
function buildTutorialsIndex(pages) {
  const walkthroughs = pages.filter((p) => p.section === 'Tutorials' && p.slug !== 'readme');
  const prompts = pages.filter((p) => p.section === 'Claude Prompt Library' && p.slug !== 'readme');

  const walkthroughCards = walkthroughs
    .map((p, i) => renderCard({
      icon: String(i + 1).padStart(2, '0'),
      href: p.urlPath,
      title: p.title.replace(/^Tutorial \d+\s*—\s*/, ''),
      desc: p.description,
      meta: `${p.minutes} min`,
    }))
    .join('\n');

  const promptCards = prompts
    .map((p) => renderCard({
      href: p.urlPath,
      title: p.title,
      desc: p.description,
    }))
    .join('\n');

  const body = `<main class="content content--wide" id="main">
  <div class="prose">
${hero('🎓 Tutorials', 'Learn XActions', 'Guided walkthroughs that start from nothing and end with something working. Every command in them has been run.')}

    <h2 id="walkthroughs">Guided walkthroughs</h2>
    <p>Work through these in order the first time. Each one assumes the setup from the one before it.</p>
    <div class="card-grid">
${walkthroughCards}
    </div>

    <h2 id="prompt-library">Prompt library for AI assistants</h2>
    <p>${prompts.length} ready-to-paste prompts that hand an AI assistant a complete task brief. Paste one into Claude, Cursor, or ChatGPT and it has everything it needs to do the job.</p>
    <div class="card-grid">
${promptCards}
    </div>

    <div class="callout">
      <h3>Prefer reading code?</h3>
      <p>The examples directory covers the same ground as short runnable programs.</p>
      <a class="btn" href="/examples">Browse examples</a>
    </div>
  </div>
</main>`;

  return renderPage({
    title: 'Tutorials',
    description: `${walkthroughs.length} guided XActions walkthroughs plus ${prompts.length} ready-to-paste AI prompts. From your first scrape to a deployed brand monitor.`,
    urlPath: '/tutorials',
    navCurrent: 'tutorials',
    body,
  });
}

// ─── /examples ──────────────────────────────────────────────────────

/**
 * @param {Array} examples
 * @returns {string}
 */
function buildExamplesIndex(examples) {
  const rows = examples
    .map((ex) => {
      const badge = ex.needsLogin
        ? '<span class="tag tag--auth">login</span>'
        : '<span class="tag tag--ok">no login</span>';

      return `      <a class="card" href="${REPO_URL}/blob/main/examples/${ex.file}" target="_blank" rel="noopener">
        <span class="card__icon" aria-hidden="true">${ex.number}</span>
        <span class="card__title">${escapeHtml(ex.title)}</span>
        <span class="card__desc">${escapeHtml(ex.blurb)}</span>
        <span class="card__meta">${badge} <code>${escapeHtml(ex.file)}</code></span>
      </a>`;
    })
    .join('\n');

  const guestCount = examples.filter((e) => !e.needsLogin).length;

  const body = `<main class="content content--wide" id="main">
  <div class="prose">
${hero('⚡ Examples', 'Runnable examples', `${examples.length} Node.js programs built on the XActions library. Every one runs against the live API and was verified before release. ${guestCount} of them need no account at all.`)}

    <h2 id="run-them">Run them</h2>
    <pre><code>git clone ${REPO_URL}.git
cd XActions
npm install
node examples/01-profile-lookup.js</code></pre>
    <p>That last command needs no API key, no account, and no browser.</p>

    <h2 id="the-examples">The examples</h2>
    <div class="card-grid">
${rows}
    </div>

    <h2 id="guest-vs-session">What needs a login, and why</h2>
    <p>X splits its internal API into two tiers. Profiles and public user timelines are served to anyone. Search, followers, following, likes, bookmarks, and DMs require a logged-in session, and X answers a logged-out request to one of those with a bare <code>404</code>.</p>
    <p>The examples that need a session check for one up front and print setup instructions rather than failing halfway through. See <a href="/docs/guides/configuration">Configuration</a> for how to supply <code>auth_token</code> and <code>ct0</code>.</p>

    <div class="callout">
      <h3>Want the guided version?</h3>
      <p>The tutorials walk through this material step by step, with the reasoning behind each decision.</p>
      <a class="btn" href="/tutorials">Read the tutorials</a>
    </div>
  </div>
</main>`;

  return renderPage({
    title: 'Examples',
    description: `${examples.length} runnable XActions examples: scrape X profiles and timelines with no API key, export followers to CSV, monitor keywords, and drive the MCP server.`,
    urlPath: '/examples',
    navCurrent: 'examples',
    body,
    schema: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "XActions examples",
  "numberOfItems": ${examples.length},
  "itemListElement": [
    ${examples
      .map((ex, i) => `{ "@type": "ListItem", "position": ${i + 1}, "name": ${JSON.stringify(ex.title)}, "url": "${REPO_URL}/blob/main/examples/${ex.file}" }`)
      .join(',\n    ')}
  ]
}
</script>`,
  });
}


// ─── Section indexes ────────────────────────────────────────────────

/**
 * Human names and one-line purposes for the generated docs subtrees. A subtree
 * not listed here still gets an index, titled from its directory name.
 */
const SUBTREE_META = {
  guides: {
    title: 'Guides and reference',
    lede: 'Reference pages for the CLI, the library, the API and the pieces underneath them.',
    icon: '📘',
  },
  skills: {
    title: 'Agent skills',
    lede: 'One page per bundled skill. Each names the exact script, page and arguments for its job.',
    icon: '🧠',
  },
  prompts: {
    title: 'Prompt library',
    lede: 'Prompts that drive XActions from a coding agent, copy-ready.',
    icon: '💬',
  },
  'step-by-step': {
    title: 'Step by step',
    lede: 'Start-to-finish walkthroughs, one task per page.',
    icon: '🪜',
  },
  learn: {
    title: 'Learn',
    lede: 'Start here if you have not run XActions before.',
    icon: '🎓',
  },
  project: {
    title: 'About the project',
    lede: 'How XActions is built, governed and released.',
    icon: '📄',
  },
};

/**
 * Read a generated page's title and description straight out of its HTML.
 *
 * The manifest covers most subtrees but not all of them (step-by-step is written
 * by a different builder), and an index that silently omitted 79 pages would be
 * worse than no index at all. Parsing the file that will actually be served means
 * every page is listed, whoever generated it.
 *
 * @param {string} file absolute path to a generated .html page
 * @returns {{title: string, description: string} | null}
 */
function readPageMeta(file) {
  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? '';
  if (!title) return null;
  // Titles are rendered as "Page name - XActions"; the suffix is noise in a list
  // where every entry shares it.
  return {
    title: title.replace(/\s*[-|]\s*XActions.*$/i, '').trim() || title.trim(),
    description: description.replace(/\s*[-|]\s*XActions.*$/i, '').trim(),
  };
}

/**
 * Build an index page for one docs subtree, listing every page in it.
 *
 * @param {string} subdir directory name under dashboard/docs/
 * @param {Array} pages the full manifest, used for reading time where known
 * @returns {{html: string, count: number} | null}
 */
function buildSubtreeIndex(subdir, pages) {
  const dir = path.join(DASHBOARD, 'docs', subdir);
  if (!fs.existsSync(dir)) return null;

  const minutesBySlug = new Map(
    pages.filter((p) => p.outSubdir === subdir).map((p) => [p.slug, p.minutes])
  );

  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort()
    .map((file) => {
      const meta = readPageMeta(path.join(dir, file));
      if (!meta) return null;
      const slug = file.replace(/\.html$/, '');
      const minutes = minutesBySlug.get(slug);
      return {
        href: `/docs/${subdir}/${slug}`,
        title: meta.title,
        desc: meta.description,
        meta: minutes ? `${minutes} min read` : '',
      };
    })
    .filter(Boolean);

  if (entries.length === 0) return null;

  const info = SUBTREE_META[subdir] ?? {
    title: subdir.replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()),
    lede: `Every page under /docs/${subdir}.`,
    icon: '📁',
  };

  const body = `<main class="content content--wide" id="main">
  <div class="prose">
${hero(`${info.icon} Documentation`, info.title, `${escapeHtml(info.lede)} ${entries.length} pages.`)}

    <div class="quick-links">
      <a class="btn btn--ghost" href="/docs">← All documentation</a>
    </div>

    <div class="card-grid">
${entries.map(renderCard).join('\n')}
    </div>
  </div>
</main>`;

  return {
    count: entries.length,
    html: renderPage({
      title: info.title,
      description: `${info.lede} ${entries.length} pages in the XActions documentation.`,
      // Trailing slash: Pages serves a directory index at /docs/<subdir>/ and
      // 308-redirects the bare spelling there, so a canonical without it
      // points search engines at a redirect.
      urlPath: `/docs/${subdir}/`,
      navCurrent: 'docs',
      body,
    }),
  };
}

// ─── Build ──────────────────────────────────────────────────────────

if (!fs.existsSync(MANIFEST)) {
  console.error('No page manifest. Run `npm run site:docs` first.');
  process.exit(1);
}

const pages = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

const examples = fs
  .readdirSync(path.join(ROOT, 'examples'))
  .filter((f) => /^\d{2}-.*\.js$/.test(f))
  .sort()
  .map(parseExample)
  .filter(Boolean);

const docsIndex = buildDocsIndex(pages);
const tutorialsIndex = buildTutorialsIndex(pages);

// Both spellings of each route get the same page.
//
// Cloudflare Pages serves `foo.html` for `/foo` and also auto-indexes a `foo/`
// directory, and the file wins. Writing only docs/index.html left a stale
// hand-written docs.html shadowing it, so /docs served a page that documented
// an API signature the library never had.
fs.writeFileSync(path.join(DASHBOARD, 'docs.html'), docsIndex);
fs.writeFileSync(path.join(DASHBOARD, 'docs', 'index.html'), docsIndex);

fs.writeFileSync(path.join(DASHBOARD, 'tutorials.html'), tutorialsIndex);
const tutorialsDir = path.join(DASHBOARD, 'tutorials');
if (fs.existsSync(tutorialsDir)) {
  fs.writeFileSync(path.join(tutorialsDir, 'index.html'), tutorialsIndex);
}

fs.writeFileSync(path.join(DASHBOARD, 'examples.html'), buildExamplesIndex(examples));

// Every docs subtree gets its own index. Without one, a visitor who lands on a
// page deep in `guides/` or `skills/` has no way to see its siblings, and the
// directory itself answers 404: 246 pages across six subtrees were unreachable
// except by search or an exact URL.
const subtrees = fs
  .readdirSync(path.join(DASHBOARD, 'docs'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

let subtreeCount = 0;
for (const subdir of subtrees) {
  const built = buildSubtreeIndex(subdir, pages);
  if (!built) continue;
  fs.writeFileSync(path.join(DASHBOARD, 'docs', subdir, 'index.html'), built.html);
  subtreeCount += 1;
  console.log(`  /docs/${subdir.padEnd(12)} ${built.count} pages indexed`);
}

console.log(`  /docs        ${pages.length} pages indexed`);
const countReal = (section) => pages.filter((p) => p.section === section && p.slug !== 'readme').length;
console.log(`  /tutorials   ${countReal('Tutorials')} walkthroughs + ${countReal('Claude Prompt Library')} prompts`);
console.log(`  /examples    ${examples.length} programs (${examples.filter((e) => !e.needsLogin).length} need no login)`);
