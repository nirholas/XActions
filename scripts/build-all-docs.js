#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Render every documentation markdown file in the repo to an HTML page.
 *
 * Output goes to dashboard/docs/, which the Cloudflare build copies to
 * pages-out/ and serves under /docs.
 *
 * Design notes worth knowing before editing:
 *
 *   - **Directories are scanned, not listed.** An earlier version enumerated
 *     docs/ file by file, so five newly written guides silently had no page and
 *     twelve links across the site pointed at nothing. Anything dropped into a
 *     scanned directory now gets a page automatically.
 *   - **CSS and JS are shared assets, not inlined.** Inlining put ~200 lines of
 *     identical CSS into 350 files, so a spacing change rewrote every page and
 *     readers re-downloaded the stylesheet on every navigation.
 *   - **Headings get stable IDs.** They drive the on-page contents rail, the
 *     `#anchor` links, and deep links written in markdown.
 *   - **A search index is emitted** so the site has real search rather than a
 *     link to a list of 350 pages.
 *
 * Usage:
 *   npm run site:docs
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license Apache-2.0
 */

import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const OUT_BASE = path.join(ROOT, 'dashboard', 'docs');
const ASSET_SRC = path.join(ROOT, 'site', 'assets');
const SITE_URL = 'https://xactions.app';
const REPO_URL = 'https://github.com/nirholas/XActions';

// ─── Sources ────────────────────────────────────────────────────────
//
// `scanPattern: '*.md'` is strongly preferred over an explicit `files` list:
// a list is a thing that goes out of date the first time somebody adds a doc.

const SOURCES = [
  {
    dir: 'docs',
    scanPattern: '*.md',
    outSubdir: 'guides',
    section: 'Guides & Reference',
    icon: '📖',
    priority: 0.8,
  },
  {
    dir: 'tutorials',
    scanPattern: '*.md',
    outSubdir: 'learn',
    section: 'Tutorials',
    icon: '🎓',
    priority: 0.8,
  },
  {
    dir: 'docs/agents',
    scanPattern: '*.md',
    outSubdir: 'guides/developer',
    section: 'Developer Guides',
    icon: '🛠️',
    priority: 0.6,
  },
  {
    dir: 'docs/architecture',
    scanPattern: '*.md',
    outSubdir: 'architecture',
    section: 'Architecture',
    icon: '🏗️',
    priority: 0.6,
  },
  {
    dir: 'docs/automation',
    scanPattern: '*.md',
    outSubdir: 'automation',
    section: 'Browser Automation',
    icon: '⚙️',
    priority: 0.7,
  },
  {
    dir: 'docs/research',
    scanPattern: '*.md',
    outSubdir: 'research',
    section: 'Research & Architecture',
    icon: '🔬',
    priority: 0.6,
  },
  {
    dir: 'docs/case-studies',
    scanPattern: '*.md',
    outSubdir: 'case-studies',
    section: 'Case Studies',
    icon: '📋',
    priority: 0.6,
  },
  {
    dir: 'skills',
    scanPattern: '**/SKILL.md',
    outSubdir: 'skills',
    section: 'Agent Skills',
    icon: '🎯',
    priority: 0.7,
  },
  {
    dir: 'skills',
    scanPattern: '**/references/*.md',
    outSubdir: 'skills',
    section: 'Skill References',
    icon: '📚',
    priority: 0.5,
  },
  {
    dir: 'tutorials/claude-prompts',
    scanPattern: '*.md',
    outSubdir: 'prompts',
    section: 'Claude Prompt Library',
    icon: '🤖',
    priority: 0.7,
  },
  {
    dir: '.',
    files: ['CONTRIBUTING.md', 'CHANGELOG.md', 'ROADMAP.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'README.md'],
    outSubdir: 'project',
    section: 'Project Info',
    icon: '📄',
    priority: 0.5,
  },
  {
    dir: '.',
    files: [
      'extension/README.md',
      'integrations/n8n/README.md',
      'src/plugins/excel/README.md',
      'src/plugins/google-sheets/README.md',
      'src/plugins/template/README.md',
      'examples/README.md',
      'scripts/README.md',
    ],
    outSubdir: 'extras',
    section: 'Extensions & Plugins',
    icon: '🔌',
    priority: 0.5,
  },
  {
    dir: 'docs/launch',
    scanPattern: '*.md',
    outSubdir: 'launch',
    section: 'Launch & Releases',
    icon: '🚀',
    priority: 0.5,
  },
];

/** Files that exist for agents or internal process, not for readers. */
const SKIP_FILES = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'docs/audits/2026-02-24-quality-coverage.md',
  'AGENT_PROMPTS.md',
  'TEMPLATE.md',
]);

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Remove a YAML frontmatter block, if the file opens with one.
 *
 * The obvious regex for this, `/^---[\s\S]*?---\n*​/m`, is wrong in a way that
 * is easy to miss: with the `m` flag `^---` matches any line beginning with
 * three dashes, so in a document that uses `---` as a horizontal rule it
 * matched from the first rule to the second and deleted everything between
 * them. Whole tables and sections vanished from generated pages while the
 * markdown they came from looked fine.
 *
 * Anchored to position 0, no `m` flag, and only when the very first characters
 * are a fence.
 *
 * @param {string} markdown
 * @returns {string}
 */
function stripFrontmatter(markdown) {
  if (!markdown.startsWith('---')) return markdown;
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
}

/**
 * Escape a string for use in HTML text or an attribute value.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Slugify for filenames and URLs.
 * @param {string} str
 * @returns {string}
 */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Slugify a heading the way GitHub does, so `#anchor` links written in
 * markdown keep working once rendered to HTML.
 * @param {string} text
 * @returns {string}
 */
function headingSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

/** Emoji stripped from titles so headings read cleanly in nav and <title>. */
// eslint-disable-next-line no-misleading-character-class -- FE0F and 200D are listed so they are stripped on their own
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

/**
 * @param {string} markdown
 * @returns {string|null}
 */
function extractTitle(markdown) {
  const cleaned = stripFrontmatter(markdown);
  const match = cleaned.match(/^#\s+(.+)$/m);
  return match ? match[1].replace(EMOJI, '').trim() : null;
}

/**
 * First paragraph-ish line, used as the meta description and card blurb.
 * @param {string} markdown
 * @returns {string|null}
 */
function extractDescription(markdown) {
  const cleaned = stripFrontmatter(markdown);
  const lines = cleaned.split('\n');

  /**
   * Markdown is hard-wrapped, so a single source line is a fragment. Joining
   * the whole paragraph is the difference between "you will have pulled real
   * data off X from a terminal and from" and a sentence that ends.
   * @param {string[]} collected
   * @returns {string}
   */
  const finish = (collected) => {
    const text = collected
      .join(' ')
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length <= 165) return text;

    // Prefer cutting at a sentence end, and only fall back to an ellipsis when
    // the paragraph has no break anywhere near the limit.
    const stop = text.lastIndexOf('. ', 165);
    return stop > 60 ? text.slice(0, stop + 1) : `${text.slice(0, 162).trimEnd()}…`;
  };

  const paragraph = [];

  for (let i = 0; i < Math.min(lines.length, 40); i += 1) {
    const line = lines[i].trim();

    if (paragraph.length > 0) {
      // Inside a paragraph: a blank line or any block marker ends it.
      if (!line || /^(#|\*|-|---|\||```|>|<)/.test(line)) return finish(paragraph);
      paragraph.push(line);
      continue;
    }

    if (line.startsWith('> ')) {
      paragraph.push(line.slice(2));
      continue;
    }

    if (
      line
      && !line.startsWith('#')
      && !line.startsWith('*')
      && !line.startsWith('-')
      && !line.startsWith('---')
      && !line.startsWith('|')
      && !line.startsWith('```')
      && !line.startsWith('<')
      && line.length > 25
    ) {
      paragraph.push(line);
    }
  }

  return paragraph.length > 0 ? finish(paragraph) : null;
}

/**
 * @param {string} markdown
 * @param {string} field
 * @returns {string|null}
 */
function extractFrontmatterField(markdown, field) {
  const fm = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const found = fm[1].match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return found ? found[1].replace(/^["']|["']$/g, '').trim() : null;
}

/**
 * @param {string} slug
 * @param {string} title
 * @param {string} section
 * @returns {string}
 */
function buildKeywords(slug, title, section) {
  const base = ['xactions', 'twitter automation', 'x automation', 'free', 'open source'];
  const fromSlug = slug.split(/[-/]/).filter((w) => w.length > 2);
  const stop = new Set(['with', 'from', 'your', 'this', 'that', 'what', 'does', 'will', 'been']);
  const fromTitle = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));

  return [...new Set([...base, ...fromSlug, ...fromTitle, section.toLowerCase()])]
    .slice(0, 15)
    .join(', ');
}

/**
 * Estimate reading time. Readers use it to decide whether to start now or
 * bookmark, which is why it is worth the two lines.
 * @param {string} markdown
 * @returns {number} Minutes, minimum 1
 */
function readingMinutes(markdown) {
  const words = markdown.replace(/```[\s\S]*?```/g, '').split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * Render markdown to HTML, giving every h2/h3 a stable id and collecting them.
 * @param {string} markdown
 * @returns {{html: string, headings: Array<{depth: number, text: string, id: string}>}}
 */
function renderMarkdown(markdown) {
  const headings = [];
  const used = new Map();

  const renderer = new marked.Renderer();

  renderer.heading = function heading(token) {
    const text = this.parser.parseInline(token.tokens);
    const plain = text.replace(/<[^>]*>/g, '');
    let id = headingSlug(plain);

    // Duplicate headings are common ("Usage" under several sections). Suffix
    // them the way GitHub does so anchors stay unique and predictable.
    if (used.has(id)) {
      const n = used.get(id) + 1;
      used.set(id, n);
      id = `${id}-${n}`;
    } else {
      used.set(id, 0);
    }

    if (token.depth === 2 || token.depth === 3) {
      headings.push({ depth: token.depth, text: plain, id });
    }

    return `<h${token.depth} id="${id}">${text}</h${token.depth}>\n`;
  };

  const originalLink = renderer.link.bind(renderer);
  renderer.link = function link(token) {
    const html = originalLink(token);
    // External links open in a new tab, with rel hardening. Internal links
    // stay in place so the back button behaves.
    if (/^https?:\/\//.test(token.href) && !token.href.includes('xactions.app')) {
      return html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
    }
    return html;
  };

  const html = marked.parse(markdown, { renderer, gfm: true, breaks: false });
  return { html, headings };
}

// ─── Template ───────────────────────────────────────────────────────

/**
 * Build one documentation page.
 *
 * @param {object} page
 * @returns {string} Full HTML document
 */
function generateHTML(page) {
  const {
    title,
    description,
    keywords,
    section,
    icon,
    urlPath,
    htmlContent,
    breadcrumbs,
    sidebarHtml,
    prev,
    next,
    sourcePath,
    minutes,
  } = page;

  const pageTitle = `${title} — XActions Docs`;
  const canonical = `${SITE_URL}${urlPath}`;
  const seoDescription = (description || `${title} — XActions documentation`).slice(0, 158);
  const ogImage = `${SITE_URL}/og-docs.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(seoDescription)}">
<meta name="keywords" content="${escapeHtml(keywords)}">
<meta name="author" content="nich (@nichxbt)">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="color-scheme" content="light dark">

<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)} — XActions">
<meta property="og:description" content="${escapeHtml(seoDescription)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:site_name" content="XActions">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@nichxbt">
<meta name="twitter:title" content="${escapeHtml(title)} — XActions">
<meta name="twitter:description" content="${escapeHtml(seoDescription)}">
<meta name="twitter:image" content="${ogImage}">

<link rel="canonical" href="${canonical}">
<link rel="manifest" href="/manifest.json">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
<link rel="stylesheet" href="/docs/assets/docs.css">

<script>
/* Applied before first paint so a dark-theme reader never sees a white flash. */
(function(){try{var t=localStorage.getItem('xactions-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": ${JSON.stringify(pageTitle)},
  "description": ${JSON.stringify(seoDescription)},
  "url": "${canonical}",
  "image": "${ogImage}",
  "author": { "@type": "Person", "name": "nich", "url": "https://x.com/nichxbt" },
  "publisher": { "@type": "Organization", "name": "XActions", "url": "${SITE_URL}" },
  "isAccessibleForFree": true,
  "license": "https://www.apache.org/licenses/LICENSE-2.0",
  "mainEntityOfPage": "${canonical}",
  "articleSection": ${JSON.stringify(section)},
  "keywords": ${JSON.stringify(keywords)}
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    ${breadcrumbs
      .map((b, i) => `{ "@type": "ListItem", "position": ${i + 1}, "name": ${JSON.stringify(b.name)}, "item": "${b.url}" }`)
      .join(',\n    ')}
  ]
}
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<header class="topbar">
  <button class="icon-btn menu-toggle" data-menu-toggle aria-expanded="false" aria-label="Open navigation">☰</button>
  <a class="topbar__brand" href="/">⚡ XActions</a>
  <div class="topbar__spacer"></div>
  <button class="search-trigger" data-search-trigger aria-label="Search documentation">
    <span aria-hidden="true">🔍</span><span class="search-trigger__label">Search docs</span><kbd>⌘K</kbd>
  </button>
  <nav class="topbar__nav" aria-label="Main">
    <a class="topbar__link" href="/docs" aria-current="page">Docs</a>
    <a class="topbar__link" href="/tutorials">Tutorials</a>
    <a class="topbar__link" href="/examples">Examples</a>
    <a class="topbar__link" href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a>
  </nav>
  <button class="icon-btn" data-theme-toggle aria-label="Switch theme">☾</button>
</header>

<div class="scrim" data-scrim></div>

<div class="layout">
  <aside class="sidebar" aria-label="Documentation sections">
${sidebarHtml}
  </aside>

  <main class="content" id="main">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      ${breadcrumbs
        .map((b, i) => (i < breadcrumbs.length - 1
          ? `<a href="${b.url}">${escapeHtml(b.name)}</a> <span aria-hidden="true">›</span>`
          : `<span>${escapeHtml(b.name)}</span>`))
        .join(' ')}
    </nav>

    <span class="eyebrow">${icon} ${escapeHtml(section)}</span>

    <article class="prose">
${htmlContent}
    </article>

    <div class="page-meta">
      <span>${minutes} min read</span>
      <a href="${REPO_URL}/edit/main/${sourcePath}" target="_blank" rel="noopener">Edit this page</a>
      <a href="${REPO_URL}/issues/new?title=${encodeURIComponent(`Docs: ${title}`)}" target="_blank" rel="noopener">Report a problem</a>
    </div>

    <nav class="page-nav" aria-label="Previous and next">
      ${prev
        ? `<a class="page-nav__link" href="${prev.urlPath}"><span class="page-nav__dir">← Previous</span><span class="page-nav__title">${escapeHtml(prev.title)}</span></a>`
        : '<span></span>'}
      ${next
        ? `<a class="page-nav__link page-nav__link--next" href="${next.urlPath}"><span class="page-nav__dir">Next →</span><span class="page-nav__title">${escapeHtml(next.title)}</span></a>`
        : ''}
    </nav>

    <div class="callout">
      <h3>⚡ Free and open source</h3>
      <p>No API keys, no monthly fees, no signup. Star the repo if it saved you a subscription.</p>
      <a class="btn" href="${REPO_URL}" target="_blank" rel="noopener">View on GitHub</a>
    </div>
  </main>

  <aside class="toc" data-toc aria-label="On this page">
    <div class="toc__heading">On this page</div>
  </aside>
</div>

<dialog class="search-dialog" data-search-dialog aria-label="Search documentation">
  <input class="search-dialog__input" data-search-input type="search" placeholder="Search the documentation…" aria-label="Search query" autocomplete="off" spellcheck="false">
  <div class="search-dialog__results" data-search-results role="listbox" aria-label="Search results"></div>
  <div class="search-dialog__footer">
    <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
    <span><kbd>↵</kbd> open</span>
    <span><kbd>esc</kbd> close</span>
  </div>
</dialog>

<footer class="site-footer">
  <div class="site-footer__inner">
    <div>
      <h4>XActions</h4>
      <p>Free, open-source X/Twitter automation.</p>
      <p>Built by <a href="https://x.com/nichxbt" target="_blank" rel="noopener">@nichxbt</a></p>
    </div>
    <div>
      <h4>Learn</h4>
      <a href="/docs/learn/your-first-scrape">Your first scrape</a>
      <a href="/docs/learn/mcp-with-claude">MCP with Claude</a>
      <a href="/examples">Examples</a>
      <a href="/docs/guides/troubleshooting">Troubleshooting</a>
    </div>
    <div>
      <h4>Reference</h4>
      <a href="/docs/guides/cli-reference">CLI</a>
      <a href="/docs/guides/api-reference">API</a>
      <a href="/docs/guides/mcp-setup">MCP server</a>
      <a href="/docs/guides/browser-scripts">Browser scripts</a>
    </div>
    <div>
      <h4>Project</h4>
      <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a>
      <a href="/docs/project/contributing">Contributing</a>
      <a href="/docs/project/changelog">Changelog</a>
      <a href="/docs/project/security">Security</a>
    </div>
  </div>
  <div class="site-footer__bottom">
    <p>© 2024–2026 XActions. Apache-2.0 licensed. No API fees.</p>
  </div>
</footer>

<script src="/docs/assets/docs.js" defer></script>
</body>
</html>`;
}

// ─── Scanner ────────────────────────────────────────────────────────

/**
 * Resolve a source definition to concrete markdown files.
 * @param {object} source
 * @returns {Array<{fullPath: string, relPath: string}>}
 */
function scanFiles(source) {
  const results = [];
  const baseDir = path.join(ROOT, source.dir);

  if (source.files) {
    for (const f of source.files) {
      const fullPath = path.join(ROOT, source.dir, f);
      if (fs.existsSync(fullPath) && !SKIP_FILES.has(path.basename(f))) {
        results.push({ fullPath, relPath: f });
      }
    }
    return results;
  }

  if (!fs.existsSync(baseDir)) return results;
  const pattern = source.scanPattern;

  if (pattern === '*.md') {
    for (const f of fs.readdirSync(baseDir)) {
      if (!f.endsWith('.md') || SKIP_FILES.has(f)) continue;
      results.push({ fullPath: path.join(baseDir, f), relPath: f });
    }
  } else if (pattern === '**/SKILL.md') {
    for (const d of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const skillPath = path.join(baseDir, d.name, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        results.push({ fullPath: skillPath, relPath: `${d.name}/SKILL.md` });
      }
    }
  } else if (pattern === '**/references/*.md') {
    for (const d of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const refDir = path.join(baseDir, d.name, 'references');
      if (!fs.existsSync(refDir)) continue;
      for (const r of fs.readdirSync(refDir)) {
        if (!r.endsWith('.md')) continue;
        results.push({ fullPath: path.join(refDir, r), relPath: `${d.name}/references/${r}` });
      }
    }
  }

  return results;
}

/**
 * @param {string} relPath
 * @returns {string}
 */
function buildSlug(relPath) {
  if (relPath.endsWith('/SKILL.md')) return relPath.replace('/SKILL.md', '');

  if (relPath.includes('/references/')) {
    const parts = relPath.split('/');
    return `${parts[0]}-${parts[2].replace('.md', '')}`;
  }

  const filename = path.basename(relPath, '.md');
  if (filename === 'README') {
    const dir = path.dirname(relPath);
    return dir === '.' ? 'readme' : slugify(dir.replace(/\//g, '-'));
  }

  // Tutorials are numbered for reading order; the numbers do not belong in a URL.
  return slugify(filename.replace(/^\d{2}-/, ''));
}

// ─── Build ──────────────────────────────────────────────────────────

/**
 * Copy the shared stylesheet and script next to the generated pages.
 */
function copyAssets() {
  const outDir = path.join(OUT_BASE, 'assets');
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(ASSET_SRC);
  for (const file of files) {
    fs.copyFileSync(path.join(ASSET_SRC, file), path.join(outDir, file));
  }

  console.log(`  assets  → docs/assets/ (${files.join(', ')})`);
}

/**
 * Render the sidebar for one page: its own section expanded, the rest listed.
 *
 * @param {string} activeSlug
 * @param {string} activeSection
 * @param {Record<string, Array>} sectionPages
 * @returns {string} HTML
 */
function buildSidebar(activeSlug, activeSection, sectionPages) {
  const order = SOURCES.map((s) => s.section).filter((s, i, a) => a.indexOf(s) === i);
  const parts = [];

  for (const section of order) {
    const pages = sectionPages[section];
    if (!pages || pages.length === 0) continue;

    const isActive = section === activeSection;
    // Long sections collapse unless the reader is inside one. A 49-item skill
    // list otherwise buries every other section below the fold.
    const shown = isActive || pages.length <= 8 ? pages : pages.slice(0, 5);

    const links = shown
      .map((p) => {
        const current = isActive && p.slug === activeSlug ? ' aria-current="page"' : '';
        return `      <a class="sidebar__link" href="${p.urlPath}"${current}>${escapeHtml(p.title)}</a>`;
      })
      .join('\n');

    const more = shown.length < pages.length
      ? `\n      <a class="sidebar__link" href="/docs">+ ${pages.length - shown.length} more…</a>`
      : '';

    parts.push(`    <div class="sidebar__group">
      <div class="sidebar__heading">${escapeHtml(section)}</div>
${links}${more}
    </div>`);
  }

  return parts.join('\n');
}

async function build() {
  console.log('Building documentation pages\n');

  const allPages = [];
  const sectionPages = {};

  // Pass 1: discover every page, so the sidebar, prev/next, and search index
  // can all see the complete set before anything renders.
  for (const source of SOURCES) {
    const files = scanFiles(source);
    if (files.length === 0) continue;

    sectionPages[source.section] ??= [];

    for (const { fullPath, relPath } of files) {
      const slug = buildSlug(relPath);
      const markdown = fs.readFileSync(fullPath, 'utf-8');
      const body = stripFrontmatter(markdown);

      const title = extractTitle(markdown)
        || extractFrontmatterField(markdown, 'name')
        || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const page = {
        slug,
        title,
        description: extractDescription(markdown)
          || extractFrontmatterField(markdown, 'description')
          || `${title} — XActions documentation`,
        section: source.section,
        icon: source.icon,
        urlPath: `/docs/${source.outSubdir}/${slug}`,
        outSubdir: source.outSubdir,
        outFile: path.join(OUT_BASE, source.outSubdir, `${slug}.html`),
        priority: source.priority,
        sourcePath: source.dir === '.' ? relPath : `${source.dir}/${relPath}`,
        markdown: body,
        minutes: readingMinutes(body),
      };

      sectionPages[source.section].push(page);
      allPages.push(page);
    }
  }

  // Order each section. Tutorials and the prompt library are numbered for
  // reading order, so those keep filename order; everything else is
  // alphabetical, because an unsorted list of 69 guides is not navigation.
  const READING_ORDER = new Set(['Tutorials', 'Claude Prompt Library', 'Project Info']);
  for (const [section, pages] of Object.entries(sectionPages)) {
    if (READING_ORDER.has(section)) continue;
    pages.sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));
  }

  // Pass 2: render. Prev/next walk the section in listed order, which for
  // tutorials is the numbered reading order the filenames encode.
  copyAssets();

  const searchIndex = [];
  let written = 0;

  for (const page of allPages) {
    const siblings = sectionPages[page.section];
    const position = siblings.indexOf(page);

    const { html: htmlContent, headings } = renderMarkdown(page.markdown);

    const finalHtml = generateHTML({
      ...page,
      htmlContent,
      keywords: buildKeywords(page.slug, page.title, page.section),
      breadcrumbs: [
        { name: 'Home', url: SITE_URL },
        { name: 'Docs', url: `${SITE_URL}/docs` },
        { name: page.section, url: `${SITE_URL}/docs` },
        { name: page.title, url: `${SITE_URL}${page.urlPath}` },
      ],
      sidebarHtml: buildSidebar(page.slug, page.section, sectionPages),
      prev: siblings[position - 1] || null,
      next: siblings[position + 1] || null,
    });

    fs.mkdirSync(path.dirname(page.outFile), { recursive: true });
    fs.writeFileSync(page.outFile, finalHtml);
    written += 1;

    // Short keys keep the index small: the browser fetches it whole.
    searchIndex.push({
      t: page.title,
      s: page.section,
      u: page.urlPath,
      k: [page.description, ...headings.map((h) => h.text)].join(' ').slice(0, 400),
    });
  }

  fs.writeFileSync(path.join(OUT_BASE, 'search-index.json'), JSON.stringify(searchIndex));

  fs.writeFileSync(
    path.join(OUT_BASE, '_sitemap-all-entries.xml'),
    allPages
      .map((p) => `  <url>
    <loc>${SITE_URL}${p.urlPath}</loc>
    <changefreq>monthly</changefreq>
    <priority>${p.priority}</priority>
  </url>`)
      .join('\n'),
  );

  fs.writeFileSync(
    path.join(OUT_BASE, '_pages-manifest.json'),
    JSON.stringify(
      allPages.map(({ markdown, outFile, ...rest }) => rest),
      null,
      2,
    ),
  );

  const bySection = Object.entries(sectionPages)
    .filter(([, pages]) => pages.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [section, pages] of bySection) {
    console.log(`  ${String(pages.length).padStart(4)}  ${section}`);
  }

  const indexBytes = fs.statSync(path.join(OUT_BASE, 'search-index.json')).size;
  console.log(`\n  ${written} pages, search index ${(indexBytes / 1024).toFixed(0)}KB\n`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
