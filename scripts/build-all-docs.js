#!/usr/bin/env node
/**
 * Build ALL SEO-Optimized HTML Pages from every .md file in the project
 * Scans: docs/, skills/, tutorials/claude-prompts/, root docs, plugins, extension
 * Outputs to: dashboard/docs/ with sub-paths matching source structure
 * Does NOT overwrite existing dashboard/docs/*.html from Phase 2
 * by nichxbt
 */

import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const OUT_BASE = path.join(ROOT, 'dashboard', 'docs');
const SITE_URL = 'https://xactions.app';

// ─── Source Definitions ─────────────────────────────────────────────
// Each source: { dir, glob/files, outSubdir, sectionName, sectionIcon }
const SOURCES = [
  // docs/ top-level reference docs
  {
    dir: 'docs',
    files: [
      'getting-started.md', 'usage.md', 'automation.md', 'monitoring.md',
      'cli-reference.md', 'ai-api.md', 'api-reference.md', 'deployment.md',
      'dom-selectors.md', 'mcp-setup.md', 'openrouter.md', 'xactions-reference.md',
      'analytics.md', 'FEATURE_INVENTORY.md', 'GROWTH_STRATEGY.md'
    ],
    outSubdir: 'guides',
    section: 'Guides & Reference',
    icon: '📖',
    priority: 0.7
  },
  // docs/agents/ — developer patterns
  {
    dir: 'docs/agents',
    files: ['browser-script-patterns.md', 'contributing-features.md', 'selectors.md'],
    outSubdir: 'guides/developer',
    section: 'Developer Guides',
    icon: '🛠️',
    priority: 0.6
  },
  // docs/research/
  {
    dir: 'docs/research',
    files: ['algorithm-cultivation.md', 'llm-powered-thought-leader.md'],
    outSubdir: 'research',
    section: 'Research & Architecture',
    icon: '🔬',
    priority: 0.6
  },
  // docs/case-studies/
  {
    dir: 'docs/case-studies',
    files: ['robust-dom-extraction.md'],
    outSubdir: 'case-studies',
    section: 'Case Studies',
    icon: '📋',
    priority: 0.6
  },
  // skills/ — each SKILL.md
  {
    dir: 'skills',
    scanPattern: '**/SKILL.md',
    outSubdir: 'skills',
    section: 'Agent Skills',
    icon: '🎯',
    priority: 0.7
  },
  // skills/ — reference sub-docs
  {
    dir: 'skills',
    scanPattern: '**/references/*.md',
    outSubdir: 'skills',
    section: 'Skill References',
    icon: '📚',
    priority: 0.5
  },
  // tutorials/claude-prompts/
  {
    dir: 'tutorials/claude-prompts',
    scanPattern: '*.md',
    outSubdir: 'tutorials',
    section: 'Claude Tutorials',
    icon: '🤖',
    priority: 0.7
  },
  // Root documentation files
  {
    dir: '.',
    files: [
      'CONTRIBUTING.md', 'CHANGELOG.md', 'ROADMAP.md',
      'SECURITY.md', 'CODE_OF_CONDUCT.md', 'README.md'
    ],
    outSubdir: 'project',
    section: 'Project Info',
    icon: '📄',
    priority: 0.5
  },
  // Plugin & extension READMEs
  {
    dir: '.',
    files: [
      'extension/README.md',
      'integrations/n8n/README.md',
      'src/plugins/excel/README.md',
      'src/plugins/google-sheets/README.md',
      'src/plugins/template/README.md',
      'examples/README.md',
      'scripts/README.md'
    ],
    outSubdir: 'extras',
    section: 'Extensions & Plugins',
    icon: '🔌',
    priority: 0.5
  },
  // docs/launch/ — release announcements
  {
    dir: 'docs/launch',
    scanPattern: '*.md',
    outSubdir: 'launch',
    section: 'Launch & Releases',
    icon: '🚀',
    priority: 0.5
  }
];

// Files/dirs to SKIP (internal, agent-only, not SEO-worthy)
const SKIP_PATHS = new Set([
  'docs/prompt',         // Internal prompt engineering
  'docs/pr-reviews',     // Internal PR reviews
  '.claude-plugin',      // Agent config
  '.github',             // GitHub templates
  'archive',             // Archived code
  'seo-prompts',         // SEO prompts we created
  'docs/examples',       // Already converted in Phase 2
]);
const SKIP_FILES = new Set([
  'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'AUDIT_REPORT.md',
  'AGENT_PROMPTS.md', 'llms.txt', 'llms-full.txt'
]);

// ─── Helpers ────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractTitle(markdown) {
  // Strip YAML frontmatter first
  const cleaned = markdown.replace(/^---[\s\S]*?---\n*/m, '');
  const match = cleaned.match(/^#\s+(.+)$/m);
  if (match) return match[1].replace(/[🧠🔍❤️🎬📋👋🧹🔔📊🚫🎯🔑🚀🌊📝🧵🖼️🔗📈⚙️🔌📚📂🗑️💔⏰✉️📬📡🤖🔊🔇⚠️🔒💾📥👤✏️👥📱🏘️🚪🎙️⭐📰💼💰💬🔁🗺️]/g, '').trim();
  return null;
}

function extractDescription(markdown) {
  const cleaned = markdown.replace(/^---[\s\S]*?---\n*/m, '');
  const lines = cleaned.split('\n');
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim();
    if (line.startsWith('> ')) return line.slice(2).replace(/\*\*/g, '').trim();
    if (line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('-') && !line.startsWith('---') && !line.startsWith('|') && !line.startsWith('```') && line.length > 30) {
      return line.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    }
  }
  return null;
}

function extractFrontmatterField(markdown, field) {
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const fieldMatch = fm.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return fieldMatch ? fieldMatch[1].replace(/^["']|["']$/g, '').trim() : null;
}

function buildKeywords(slug, title, section) {
  const base = ['xactions', 'twitter automation', 'x automation', 'free', 'open source'];
  const fromSlug = slug.split('-').filter(w => w.length > 2);
  const fromTitle = title.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['with', 'from', 'your', 'this', 'that', 'what', 'does', 'will', 'been'].includes(w));
  const keywords = [...new Set([...base, ...fromSlug, ...fromTitle, section.toLowerCase()])];
  return keywords.slice(0, 15).join(', ');
}

// ─── HTML Template ──────────────────────────────────────────────────

function generateHTML({ slug, title, description, keywords, section, icon, urlPath, htmlContent, breadcrumbs, relatedLinks, priority }) {
  const pageTitle = `${title} | XActions`;
  const canonicalUrl = `${SITE_URL}${urlPath}`;
  const seoDescription = (description || `${title} — Free X/Twitter automation documentation by XActions.`).slice(0, 160);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="author" content="nich (@nichxbt)">
  <meta name="robots" content="index, follow">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)} — XActions">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="XActions">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@nichxbt">
  <meta name="twitter:title" content="${escapeHtml(title)} — XActions">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">

  <link rel="canonical" href="${canonicalUrl}">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": ${JSON.stringify(pageTitle)},
    "description": ${JSON.stringify(seoDescription)},
    "url": "${canonicalUrl}",
    "author": { "@type": "Person", "name": "nich", "url": "https://x.com/nichxbt" },
    "publisher": { "@type": "Organization", "name": "XActions", "url": "${SITE_URL}" },
    "datePublished": "2026-02-25",
    "dateModified": "2026-02-25",
    "mainEntityOfPage": "${canonicalUrl}",
    "articleSection": ${JSON.stringify(section)},
    "keywords": ${JSON.stringify(keywords)}
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      ${breadcrumbs.map((b, i) => `{ "@type": "ListItem", "position": ${i + 1}, "name": ${JSON.stringify(b.name)}, "item": "${b.url}" }`).join(',\n      ')}
    ]
  }
  </script>

  <style>
    :root {
      --bg-primary: #000000;
      --bg-secondary: #16181c;
      --bg-tertiary: #202327;
      --accent: #1d9bf0;
      --accent-hover: #1a8cd8;
      --accent-light: rgba(29, 155, 240, 0.1);
      --text-primary: #e7e9ea;
      --text-secondary: #71767b;
      --border: #2f3336;
      --success: #00ba7c;
      --warning: #ffad1f;
      --error: #f4212e;
      --purple: #a855f7;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }
    .layout { display: flex; max-width: 1300px; margin: 0 auto; min-height: 100vh; }
    .sidebar { width: 275px; padding: 0 12px; position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; border-right: 1px solid var(--border); }
    .logo { padding: 12px; }
    .logo a { display: flex; align-items: center; gap: 8px; text-decoration: none; color: var(--text-primary); font-size: 1.5rem; font-weight: 800; padding: 12px; border-radius: 9999px; transition: background .2s; }
    .logo a:hover { background: var(--accent-light); }
    nav { flex: 1; }
    .nav-item { display: flex; align-items: center; gap: 20px; padding: 12px; border-radius: 9999px; font-size: 1.25rem; color: var(--text-primary); text-decoration: none; transition: background .2s; margin-bottom: 4px; }
    .nav-item:hover { background: var(--bg-tertiary); }
    .nav-item.active { font-weight: 700; }
    .nav-icon { font-size: 1.5rem; width: 28px; text-align: center; }
    .action-btn { width: 90%; padding: 16px; background: var(--accent); color: #fff; border: none; border-radius: 9999px; font-size: 1.0625rem; font-weight: 700; cursor: pointer; transition: background .2s; margin: 16px 0; text-decoration: none; display: block; text-align: center; }
    .action-btn:hover { background: var(--accent-hover); }
    .main-content { flex: 1; max-width: 800px; border-right: 1px solid var(--border); }
    .main-header { position: sticky; top: 0; background: rgba(0,0,0,.65); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 16px 20px; z-index: 100; }
    .main-header h1 { font-size: 1.25rem; font-weight: 700; }
    .breadcrumb { font-size: 0.8125rem; color: var(--text-secondary); margin-top: 4px; }
    .breadcrumb a { color: var(--accent); text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .article { padding: 24px 20px; }
    .article h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 8px; line-height: 1.2; }
    .article h2 { font-size: 1.375rem; font-weight: 700; margin: 32px 0 12px; padding-top: 16px; border-top: 1px solid var(--border); }
    .article h3 { font-size: 1.125rem; font-weight: 600; margin: 24px 0 8px; color: var(--accent); }
    .article h4 { font-size: 1rem; font-weight: 600; margin: 16px 0 8px; }
    .article p { color: var(--text-secondary); font-size: 0.9375rem; margin-bottom: 16px; }
    .article ul, .article ol { margin-left: 24px; margin-bottom: 16px; }
    .article li { color: var(--text-secondary); font-size: 0.9375rem; margin-bottom: 6px; }
    .article a { color: var(--accent); text-decoration: none; }
    .article a:hover { text-decoration: underline; }
    .article strong { color: var(--text-primary); }
    .article blockquote { border-left: 3px solid var(--accent); padding: 12px 16px; margin: 16px 0; background: var(--bg-secondary); border-radius: 0 8px 8px 0; }
    .article blockquote p { margin: 0; color: var(--text-secondary); font-style: italic; }
    .article code { background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-family: 'Monaco','Menlo','Consolas', monospace; font-size: 0.875rem; color: var(--accent); }
    .article pre { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 16px; overflow-x: auto; margin: 16px 0; }
    .article pre code { background: none; padding: 0; color: var(--text-primary); font-size: 0.8125rem; display: block; }
    .article table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.875rem; }
    .article th { background: var(--bg-secondary); padding: 10px 12px; text-align: left; border: 1px solid var(--border); font-weight: 600; }
    .article td { padding: 10px 12px; border: 1px solid var(--border); color: var(--text-secondary); }
    .article hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
    .article img { max-width: 100%; border-radius: 12px; }
    .cat-badge { display: inline-block; background: var(--accent-light); color: var(--accent); padding: 4px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-bottom: 16px; }
    .cta-box { background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary)); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center; }
    .cta-box h3 { font-size: 1.25rem; margin-bottom: 8px; color: var(--text-primary); }
    .cta-box p { color: var(--text-secondary); margin-bottom: 16px; }
    .cta-box a { display: inline-block; padding: 12px 24px; background: var(--accent); color: #fff; border-radius: 9999px; text-decoration: none; font-weight: 700; transition: background .2s; }
    .cta-box a:hover { background: var(--accent-hover); }
    .sidebar-right { width: 350px; padding: 16px 24px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
    .sidebar-card { background: var(--bg-secondary); border-radius: 16px; padding: 16px; margin-bottom: 16px; }
    .sidebar-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }
    .sidebar-card a { display: block; color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; padding: 6px 0; border-bottom: 1px solid var(--border); transition: color .2s; }
    .sidebar-card a:last-child { border-bottom: none; }
    .sidebar-card a:hover { color: var(--accent); }
    .site-footer { border-top: 1px solid var(--border); padding: 32px 24px; }
    .footer-content { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 24px; }
    .footer-section h4 { font-size: 0.875rem; font-weight: 700; margin-bottom: 8px; }
    .footer-section p, .footer-section a { color: var(--text-secondary); font-size: 0.8125rem; text-decoration: none; display: block; padding: 3px 0; }
    .footer-section a:hover { color: var(--accent); }
    .footer-bottom { max-width: 1200px; margin: 16px auto 0; padding-top: 16px; border-top: 1px solid var(--border); text-align: center; color: var(--text-secondary); font-size: 0.75rem; }
    @media (max-width: 1024px) { .sidebar-right { display: none; } }
    @media (max-width: 768px) {
      .layout { flex-direction: column; }
      .sidebar { display: none; }
      .main-content { max-width: 100%; border-right: none; }
      .article pre { font-size: 0.75rem; }
      .footer-content { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo"><a href="/">⚡ XActions</a></div>
      <nav>
        <a href="/features" class="nav-item"><span class="nav-icon">⚡</span><span>All Scripts</span></a>
        <a href="/tutorials" class="nav-item"><span class="nav-icon">📚</span><span>Tutorials</span></a>
        <a href="/docs" class="nav-item active"><span class="nav-icon">📖</span><span>Documentation</span></a>
        <a href="/ai" class="nav-item"><span class="nav-icon">🤖</span><span>AI/MCP</span></a>
        <a href="/pricing" class="nav-item"><span class="nav-icon">💰</span><span>Pricing</span></a>
        <a href="/about" class="nav-item"><span class="nav-icon">ℹ️</span><span>About</span></a>
        <a href="https://github.com/nirholas/XActions" class="nav-item" target="_blank" rel="noopener"><span class="nav-icon">⭐</span><span>GitHub</span></a>
      </nav>
      <a href="/dashboard" class="action-btn">Open Dashboard</a>
    </aside>

    <main class="main-content">
      <header class="main-header">
        <h1>${icon} ${escapeHtml(title)}</h1>
        <div class="breadcrumb">
          ${breadcrumbs.map((b, i) => i < breadcrumbs.length - 1 ? `<a href="${b.url}">${escapeHtml(b.name)}</a> ›` : escapeHtml(b.name)).join(' ')}
        </div>
      </header>

      <article class="article">
        <span class="cat-badge">${escapeHtml(section)}</span>
        ${htmlContent}

        <div class="cta-box">
          <h3>⚡ Explore XActions</h3>
          <p>100% free and open-source. No API keys, no fees, no signup.</p>
          <a href="/docs">Browse All Documentation</a>
        </div>
      </article>
    </main>

    <aside class="sidebar-right">
      <div class="sidebar-card">
        <h3>📖 In This Section</h3>
        ${relatedLinks}
      </div>
      <div class="sidebar-card">
        <h3>🔗 Quick Links</h3>
        <a href="/docs">All Documentation</a>
        <a href="/features">All 43+ Features</a>
        <a href="/tutorials">Tutorials</a>
        <a href="/ai">AI Integration</a>
        <a href="/mcp">MCP Server</a>
        <a href="https://github.com/nirholas/XActions" rel="noopener">GitHub</a>
      </div>
    </aside>
  </div>

  <footer class="site-footer">
    <div class="footer-content">
      <div class="footer-section">
        <h4>XActions</h4>
        <p>100% Free & Open Source X/Twitter Automation</p>
        <p>Created by <a href="https://x.com/nichxbt" rel="noopener">@nichxbt</a></p>
      </div>
      <div class="footer-section">
        <h4>Product</h4>
        <a href="/features">Features</a>
        <a href="/pricing">Pricing</a>
        <a href="/run">Run Scripts</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/analytics">Analytics</a>
      </div>
      <div class="footer-section">
        <h4>AI & Developers</h4>
        <a href="/ai">AI Integration</a>
        <a href="/ai-api">AI API (x402)</a>
        <a href="/mcp">MCP Server</a>
        <a href="/docs">Documentation</a>
        <a href="/tutorials">Tutorials</a>
      </div>
      <div class="footer-section">
        <h4>Community</h4>
        <a href="https://github.com/nirholas/XActions" rel="noopener">GitHub</a>
        <a href="/about">About</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2024-2026 XActions. MIT License. No API fees. No limits.</p>
    </div>
  </footer>
</body>
</html>`;
}

// ─── File Scanner ───────────────────────────────────────────────────

function scanFiles(source) {
  const results = [];
  const baseDir = path.join(ROOT, source.dir);

  if (source.files) {
    // Explicit file list
    for (const f of source.files) {
      const fullPath = path.join(ROOT, source.dir, f);
      if (fs.existsSync(fullPath)) {
        results.push({ fullPath, relPath: f });
      }
    }
  } else if (source.scanPattern) {
    // Scan directory with pattern
    const pattern = source.scanPattern;
    if (pattern === '*.md') {
      // Flat directory scan
      if (fs.existsSync(baseDir)) {
        const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.md'));
        for (const f of files) {
          results.push({ fullPath: path.join(baseDir, f), relPath: f });
        }
      }
    } else if (pattern === '**/SKILL.md') {
      // Recursive scan for SKILL.md
      if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir, { withFileTypes: true }).filter(d => d.isDirectory());
        for (const d of dirs) {
          const skillPath = path.join(baseDir, d.name, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            results.push({ fullPath: skillPath, relPath: `${d.name}/SKILL.md` });
          }
        }
      }
    } else if (pattern === '**/references/*.md') {
      // Recursive scan for references/*.md
      if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir, { withFileTypes: true }).filter(d => d.isDirectory());
        for (const d of dirs) {
          const refDir = path.join(baseDir, d.name, 'references');
          if (fs.existsSync(refDir)) {
            const refs = fs.readdirSync(refDir).filter(f => f.endsWith('.md'));
            for (const r of refs) {
              results.push({ fullPath: path.join(refDir, r), relPath: `${d.name}/references/${r}` });
            }
          }
        }
      }
    }
  }
  return results;
}

// ─── Slug Builder ───────────────────────────────────────────────────

function buildSlug(source, relPath) {
  // For skills/SKILL.md → use parent dir name
  if (relPath.endsWith('/SKILL.md')) {
    return relPath.replace('/SKILL.md', '');
  }
  // For skills/X/references/Y.md → use X-Y
  if (relPath.includes('/references/')) {
    const parts = relPath.split('/');
    return `${parts[0]}-${parts[2].replace('.md', '')}`;
  }
  // For root README.md → special handling
  const filename = path.basename(relPath, '.md');
  if (filename === 'README') {
    // Use parent directory name
    const dir = path.dirname(relPath);
    if (dir === '.') return 'readme';
    return slugify(dir.replace(/\//g, '-'));
  }
  return slugify(filename);
}

// ─── Main Build ─────────────────────────────────────────────────────

async function build() {
  console.log('🔨 Building ALL .md → HTML pages...\n');

  marked.setOptions({ breaks: true, gfm: true });

  // Track all generated pages for sitemap and index
  const allPages = [];
  // Track pages by section for related links
  const sectionPages = {};
  let totalCount = 0;

  for (const source of SOURCES) {
    const files = scanFiles(source);
    if (files.length === 0) continue;

    const outDir = path.join(OUT_BASE, source.outSubdir);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    console.log(`\n📂 ${source.section} (${source.dir}) — ${files.length} files`);

    if (!sectionPages[source.section]) sectionPages[source.section] = [];

    for (const { fullPath, relPath } of files) {
      const slug = buildSlug(source, relPath);
      const markdown = fs.readFileSync(fullPath, 'utf-8');
      const cleanedMarkdown = markdown.replace(/^---[\s\S]*?---\n*/m, ''); // Strip frontmatter

      const rawTitle = extractTitle(markdown) || extractFrontmatterField(markdown, 'name') || slugify(slug).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const title = rawTitle;
      const description = extractDescription(markdown) || extractFrontmatterField(markdown, 'description');
      const keywords = buildKeywords(slug, title, source.section);
      const urlPath = `/docs/${source.outSubdir}/${slug}`;

      const breadcrumbs = [
        { name: 'Home', url: SITE_URL },
        { name: 'Docs', url: `${SITE_URL}/docs` },
        { name: source.section, url: `${SITE_URL}/docs/${source.outSubdir}` },
        { name: rawTitle, url: `${SITE_URL}${urlPath}` }
      ];

      const htmlContent = marked.parse(cleanedMarkdown);

      const pageInfo = {
        slug,
        title: rawTitle,
        description: description || `${rawTitle} — XActions documentation`,
        section: source.section,
        icon: source.icon,
        urlPath,
        outSubdir: source.outSubdir,
        priority: source.priority,
        outFile: path.join(outDir, `${slug}.html`)
      };

      sectionPages[source.section].push(pageInfo);
      allPages.push(pageInfo);
    }
  }

  // Now generate allHTML with proper related links
  for (const page of allPages) {
    const source = SOURCES.find(s => s.section === page.section);
    const fullPath = findSourceFile(source, page.slug);
    if (!fullPath) continue;

    const markdown = fs.readFileSync(fullPath, 'utf-8');
    const cleanedMarkdown = markdown.replace(/^---[\s\S]*?---\n*/m, '');
    const htmlContent = marked.parse(cleanedMarkdown);

    // Build related links from same section
    const siblings = sectionPages[page.section] || [];
    const relatedLinks = siblings
      .filter(s => s.slug !== page.slug)
      .slice(0, 8)
      .map(s => `        <a href="${s.urlPath}">${s.icon} ${escapeHtml(s.title)}</a>`)
      .join('\n');

    const breadcrumbs = [
      { name: 'Home', url: SITE_URL },
      { name: 'Docs', url: `${SITE_URL}/docs` },
      { name: page.section, url: `${SITE_URL}/docs/${page.outSubdir}` },
      { name: page.title, url: `${SITE_URL}${page.urlPath}` }
    ];

    const html = generateHTML({
      ...page,
      htmlContent,
      breadcrumbs,
      relatedLinks: relatedLinks || '<a href="/docs">Browse all docs</a>',
      keywords: buildKeywords(page.slug, page.title, page.section)
    });

    fs.writeFileSync(page.outFile, html);
    totalCount++;
    console.log(`  ✅ ${page.outSubdir}/${page.slug}.html`);
  }

  // Generate sitemap entries
  const sitemapXml = allPages.map(p => `  <url>
    <loc>${SITE_URL}${p.urlPath}</loc>
    <lastmod>2026-02-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  fs.writeFileSync(path.join(OUT_BASE, '_sitemap-all-entries.xml'), sitemapXml);

  // Generate a manifest of all pages for the index
  const manifest = allPages.map(p => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    section: p.section,
    icon: p.icon,
    urlPath: p.urlPath,
    outSubdir: p.outSubdir,
    priority: p.priority
  }));
  fs.writeFileSync(path.join(OUT_BASE, '_pages-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n✅ Generated ${totalCount} new HTML pages`);
  console.log(`📋 Sitemap entries → dashboard/docs/_sitemap-all-entries.xml`);
  console.log(`📋 Pages manifest → dashboard/docs/_pages-manifest.json`);
  console.log(`\nTotal indexable doc pages: ${totalCount} + 71 (Phase 2) = ${totalCount + 71}`);
}

// Helper to find source file from page info
function findSourceFile(source, slug) {
  const files = scanFiles(source);
  for (const { fullPath, relPath } of files) {
    const builtSlug = buildSlug(source, relPath);
    if (builtSlug === slug) return fullPath;
  }
  return null;
}

build().catch(console.error);
