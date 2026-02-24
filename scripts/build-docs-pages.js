#!/usr/bin/env node
/**
 * Build SEO-Optimized HTML Pages from docs/examples/*.md
 * Generates dashboard/docs/<slug>.html for each markdown file
 * by nichxbt
 */

import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const DOCS_DIR = path.join(ROOT, 'docs', 'examples');
const OUT_DIR = path.join(ROOT, 'dashboard', 'docs');
const SITE_URL = 'https://xactions.app';

// Category mappings for structured data and navigation
const CATEGORIES = {
  'unfollow-everyone': { cat: 'Unfollow Tools', icon: '👋', priority: 0.8 },
  'unfollow-non-followers': { cat: 'Unfollow Tools', icon: '🧹', priority: 0.8 },
  'smart-unfollow': { cat: 'Unfollow Tools', icon: '🧠', priority: 0.8 },
  'detect-unfollowers': { cat: 'Follower Monitoring', icon: '🔍', priority: 0.8 },
  'new-follower-alerts': { cat: 'Follower Monitoring', icon: '🔔', priority: 0.7 },
  'audit-followers': { cat: 'Follower Monitoring', icon: '📊', priority: 0.7 },
  'remove-followers': { cat: 'Follower Monitoring', icon: '🚫', priority: 0.7 },
  'auto-liker': { cat: 'Engagement', icon: '❤️', priority: 0.7 },
  'auto-commenter': { cat: 'Engagement', icon: '💬', priority: 0.7 },
  'auto-repost': { cat: 'Engagement', icon: '🔁', priority: 0.7 },
  'follow-engagers': { cat: 'Growth', icon: '🎯', priority: 0.7 },
  'follow-target-followers': { cat: 'Growth', icon: '🎯', priority: 0.7 },
  'keyword-follow': { cat: 'Growth', icon: '🔑', priority: 0.7 },
  'growth-suite': { cat: 'Growth', icon: '🚀', priority: 0.8 },
  'natural-flow': { cat: 'Growth', icon: '🌊', priority: 0.7 },
  'followers-scraping': { cat: 'Scrapers', icon: '📋', priority: 0.7 },
  'following-scraping': { cat: 'Scrapers', icon: '📋', priority: 0.7 },
  'likes-scraping': { cat: 'Scrapers', icon: '❤️', priority: 0.7 },
  'profile-scraping': { cat: 'Scrapers', icon: '👤', priority: 0.7 },
  'hashtag-scraping': { cat: 'Scrapers', icon: '#️⃣', priority: 0.7 },
  'search-tweets': { cat: 'Scrapers', icon: '🔍', priority: 0.7 },
  'tweet-scraping': { cat: 'Scrapers', icon: '🐦', priority: 0.7 },
  'thread-scraping': { cat: 'Scrapers', icon: '🧵', priority: 0.7 },
  'list-scraping': { cat: 'Scrapers', icon: '📝', priority: 0.7 },
  'media-scraping': { cat: 'Scrapers', icon: '🖼️', priority: 0.7 },
  'link-scraper': { cat: 'Scrapers', icon: '🔗', priority: 0.7 },
  'viral-tweet-scraper': { cat: 'Scrapers', icon: '📈', priority: 0.7 },
  'robust-user-extraction': { cat: 'Scrapers', icon: '⚙️', priority: 0.6 },
  'scraper-adapters': { cat: 'Scrapers', icon: '🔌', priority: 0.6 },
  'video-downloader': { cat: 'Content Tools', icon: '🎬', priority: 0.8 },
  'thread-unroller': { cat: 'Content Tools', icon: '🧵', priority: 0.7 },
  'bookmark-exporter': { cat: 'Content Tools', icon: '📚', priority: 0.7 },
  'bookmark-organizer': { cat: 'Content Tools', icon: '📂', priority: 0.7 },
  'clear-all-bookmarks': { cat: 'Content Tools', icon: '🗑️', priority: 0.6 },
  'clear-all-reposts': { cat: 'Content Tools', icon: '🗑️', priority: 0.6 },
  'unlike-all-posts': { cat: 'Content Tools', icon: '💔', priority: 0.6 },
  'post-thread': { cat: 'Posting', icon: '🧵', priority: 0.7 },
  'schedule-posts': { cat: 'Posting', icon: '⏰', priority: 0.7 },
  'create-poll': { cat: 'Posting', icon: '📊', priority: 0.6 },
  'dm-automation': { cat: 'Messaging', icon: '✉️', priority: 0.7 },
  'send-direct-message': { cat: 'Messaging', icon: '📬', priority: 0.6 },
  'monitor-account': { cat: 'Analytics', icon: '📊', priority: 0.7 },
  'engagement-analytics': { cat: 'Analytics', icon: '📈', priority: 0.7 },
  'hashtag-analytics': { cat: 'Analytics', icon: '#️⃣', priority: 0.7 },
  'best-time-to-post': { cat: 'Analytics', icon: '⏰', priority: 0.7 },
  'competitor-analysis': { cat: 'Analytics', icon: '🔍', priority: 0.7 },
  'streaming': { cat: 'Analytics', icon: '📡', priority: 0.6 },
  'block-bots': { cat: 'Safety & Privacy', icon: '🤖', priority: 0.7 },
  'mass-block-unblock': { cat: 'Safety & Privacy', icon: '🚫', priority: 0.7 },
  'mass-unmute': { cat: 'Safety & Privacy', icon: '🔊', priority: 0.6 },
  'mute-keywords-words': { cat: 'Safety & Privacy', icon: '🔇', priority: 0.6 },
  'report-spam': { cat: 'Safety & Privacy', icon: '⚠️', priority: 0.6 },
  'settings-privacy': { cat: 'Safety & Privacy', icon: '🔒', priority: 0.6 },
  'backup-account': { cat: 'Account Management', icon: '💾', priority: 0.7 },
  'download-account-data': { cat: 'Account Management', icon: '📥', priority: 0.7 },
  'profile-management': { cat: 'Account Management', icon: '👤', priority: 0.6 },
  'update-profile': { cat: 'Account Management', icon: '✏️', priority: 0.6 },
  'multi-account': { cat: 'Account Management', icon: '👥', priority: 0.6 },
  'qr-code-sharing': { cat: 'Account Management', icon: '📱', priority: 0.5 },
  'list-manager': { cat: 'Lists & Communities', icon: '📝', priority: 0.6 },
  'join-communities': { cat: 'Lists & Communities', icon: '🏘️', priority: 0.6 },
  'leave-all-communities': { cat: 'Lists & Communities', icon: '🚪', priority: 0.6 },
  'mcp-server': { cat: 'AI & Developer', icon: '🤖', priority: 0.8 },
  'grok-ai': { cat: 'AI & Developer', icon: '🧠', priority: 0.7 },
  'scrape-spaces': { cat: 'Spaces & Live', icon: '🎙️', priority: 0.6 },
  'spaces-live-audio': { cat: 'Spaces & Live', icon: '🎙️', priority: 0.6 },
  'premium-features': { cat: 'Premium', icon: '⭐', priority: 0.5 },
  'articles-longform': { cat: 'Premium', icon: '📰', priority: 0.5 },
  'business-ads': { cat: 'Business', icon: '💼', priority: 0.5 },
  'creator-monetization': { cat: 'Business', icon: '💰', priority: 0.5 },
  'discovery-explore': { cat: 'Discovery', icon: '🔍', priority: 0.5 },
};

function slugToTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match) return match[1].replace(/[🧠🔍❤️🎬📋👋🧹🔔📊🚫🎯🔑🚀🌊📝🧵🖼️🔗📈⚙️🔌📚📂🗑️💔⏰✉️📬📡🤖🚫🔊🔇⚠️🔒💾📥👤✏️👥📱📝🏘️🚪🎙️⭐📰💼💰🔍💬🔁📊]/g, '').trim();
  return null;
}

function extractDescription(markdown) {
  // Try to find a blockquote or first paragraph after title
  const lines = markdown.split('\n');
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i].trim();
    if (line.startsWith('> ')) return line.slice(2).trim();
    if (line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('-') && !line.startsWith('---') && line.length > 20) {
      return line.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    }
  }
  return null;
}

function buildKeywords(slug, title, category) {
  const base = ['xactions', 'twitter automation', 'x automation', 'free'];
  const fromSlug = slug.split('-').filter(w => w.length > 2);
  const fromTitle = title.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['with', 'from', 'your', 'this', 'that', 'what'].includes(w));
  const keywords = [...new Set([...base, ...fromSlug, ...fromTitle, category.toLowerCase(), `${slug.replace(/-/g, ' ')} twitter`, `twitter ${slug.replace(/-/g, ' ')}`])];
  return keywords.slice(0, 15).join(', ');
}

function generateHTML(slug, markdown) {
  const info = CATEGORIES[slug] || { cat: 'Tools', icon: '⚡', priority: 0.6 };
  const rawTitle = extractTitle(markdown) || slugToTitle(slug);
  const title = rawTitle.replace(/^X\/Twitter\s*/i, '').trim();
  const description = extractDescription(markdown) || `${title} — Free X/Twitter automation tool. No API keys, no fees. Open-source browser script by XActions.`;
  const keywords = buildKeywords(slug, title, info.cat);
  const pageTitle = `${title} — Free X/Twitter ${info.cat} Tool | XActions`;
  const canonicalUrl = `${SITE_URL}/docs/${slug}`;
  const seoDescription = description.length > 160 ? description.slice(0, 157) + '...' : description;

  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
  const htmlContent = marked.parse(markdown);

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

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)} — XActions">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="XActions">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@nichxbt">
  <meta name="twitter:title" content="${escapeHtml(title)} — Free X/Twitter Tool">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">

  <link rel="canonical" href="${canonicalUrl}">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">

  <!-- Structured Data - TechArticle -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": ${JSON.stringify(pageTitle)},
    "description": ${JSON.stringify(seoDescription)},
    "url": "${canonicalUrl}",
    "author": { "@type": "Person", "name": "nich", "url": "https://x.com/nichxbt" },
    "publisher": { "@type": "Organization", "name": "XActions", "url": "${SITE_URL}" },
    "datePublished": "2026-02-24",
    "dateModified": "2026-02-24",
    "mainEntityOfPage": "${canonicalUrl}",
    "articleSection": ${JSON.stringify(info.cat)},
    "keywords": ${JSON.stringify(keywords)}
  }
  </script>
  <!-- Structured Data - BreadcrumbList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE_URL}" },
      { "@type": "ListItem", "position": 2, "name": "Documentation", "item": "${SITE_URL}/docs" },
      { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(rawTitle)}, "item": "${canonicalUrl}" }
    ]
  }
  </script>
  <!-- Structured Data - HowTo (for automation guides) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to use ${escapeHtml(title)}",
    "description": ${JSON.stringify(seoDescription)},
    "step": [
      { "@type": "HowToStep", "name": "Open x.com", "text": "Navigate to x.com in your browser and log in to your account." },
      { "@type": "HowToStep", "name": "Open DevTools Console", "text": "Press F12 or Ctrl+Shift+J to open the browser developer console." },
      { "@type": "HowToStep", "name": "Paste the script", "text": "Copy the XActions ${escapeHtml(title)} script and paste it into the console." },
      { "@type": "HowToStep", "name": "Run and monitor", "text": "Press Enter to run. The script shows real-time progress with emoji logs." }
    ],
    "tool": { "@type": "HowToTool", "name": "XActions" },
    "totalTime": "PT2M"
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
    /* Layout */
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
    /* Main */
    .main-content { flex: 1; max-width: 800px; border-right: 1px solid var(--border); }
    .main-header { position: sticky; top: 0; background: rgba(0,0,0,.65); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 16px 20px; z-index: 100; }
    .main-header h1 { font-size: 1.25rem; font-weight: 700; }
    .breadcrumb { font-size: 0.8125rem; color: var(--text-secondary); margin-top: 4px; }
    .breadcrumb a { color: var(--accent); text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    /* Article */
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
    .article code { background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-family: 'Monaco', 'Menlo', 'Consolas', monospace; font-size: 0.875rem; color: var(--accent); }
    .article pre { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 16px; overflow-x: auto; margin: 16px 0; position: relative; }
    .article pre code { background: none; padding: 0; color: var(--text-primary); font-size: 0.8125rem; display: block; }
    .article table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.875rem; }
    .article th { background: var(--bg-secondary); padding: 10px 12px; text-align: left; border: 1px solid var(--border); font-weight: 600; }
    .article td { padding: 10px 12px; border: 1px solid var(--border); color: var(--text-secondary); }
    .article hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
    .article img { max-width: 100%; border-radius: 12px; }
    /* Category badge */
    .cat-badge { display: inline-block; background: var(--accent-light); color: var(--accent); padding: 4px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-bottom: 16px; }
    /* CTA */
    .cta-box { background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary)); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center; }
    .cta-box h3 { font-size: 1.25rem; margin-bottom: 8px; color: var(--text-primary); }
    .cta-box p { color: var(--text-secondary); margin-bottom: 16px; }
    .cta-box a { display: inline-block; padding: 12px 24px; background: var(--accent); color: #fff; border-radius: 9999px; text-decoration: none; font-weight: 700; transition: background .2s; }
    .cta-box a:hover { background: var(--accent-hover); }
    /* Sidebar Right */
    .sidebar-right { width: 350px; padding: 16px 24px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
    .sidebar-card { background: var(--bg-secondary); border-radius: 16px; padding: 16px; margin-bottom: 16px; }
    .sidebar-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }
    .sidebar-card a { display: block; color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; padding: 6px 0; border-bottom: 1px solid var(--border); transition: color .2s; }
    .sidebar-card a:last-child { border-bottom: none; }
    .sidebar-card a:hover { color: var(--accent); }
    /* Footer */
    .site-footer { border-top: 1px solid var(--border); padding: 32px 24px; }
    .footer-content { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 24px; }
    .footer-section h4 { font-size: 0.875rem; font-weight: 700; margin-bottom: 8px; }
    .footer-section p, .footer-section a { color: var(--text-secondary); font-size: 0.8125rem; text-decoration: none; display: block; padding: 3px 0; }
    .footer-section a:hover { color: var(--accent); }
    .footer-bottom { max-width: 1200px; margin: 16px auto 0; padding-top: 16px; border-top: 1px solid var(--border); text-align: center; color: var(--text-secondary); font-size: 0.75rem; }
    /* Responsive */
    @media (max-width: 1024px) { .sidebar-right { display: none; } }
    @media (max-width: 768px) {
      .layout { flex-direction: column; }
      .sidebar { display: none; }
      .main-content { max-width: 100%; border-right: none; }
      .footer-content { grid-template-columns: 1fr 1fr; }
      .article pre { font-size: 0.75rem; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <!-- Sidebar -->
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

    <!-- Main Content -->
    <main class="main-content">
      <header class="main-header">
        <h1>${info.icon} ${escapeHtml(rawTitle)}</h1>
        <div class="breadcrumb">
          <a href="/">Home</a> › <a href="/docs">Docs</a> › ${escapeHtml(rawTitle)}
        </div>
      </header>

      <article class="article">
        <span class="cat-badge">${escapeHtml(info.cat)}</span>
        ${htmlContent}

        <div class="cta-box">
          <h3>⚡ Ready to try ${escapeHtml(title)}?</h3>
          <p>XActions is 100% free and open-source. No API keys, no fees, no signup.</p>
          <a href="/features">Browse All Scripts</a>
        </div>
      </article>
    </main>

    <!-- Sidebar Right -->
    <aside class="sidebar-right">
      <div class="sidebar-card">
        <h3>📖 Related Docs</h3>
        RELATED_LINKS_PLACEHOLDER
      </div>
      <div class="sidebar-card">
        <h3>🔗 Quick Links</h3>
        <a href="/features">All 43+ Features</a>
        <a href="/tutorials">Tutorials</a>
        <a href="/ai">AI Integration</a>
        <a href="/mcp">MCP Server</a>
        <a href="/docs">Documentation Hub</a>
        <a href="https://github.com/nirholas/XActions" rel="noopener">GitHub Repository</a>
      </div>
    </aside>
  </div>

  <!-- Footer -->
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
        <a href="/automations">Automations</a>
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

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getRelatedPages(slug, allSlugs) {
  const info = CATEGORIES[slug] || { cat: 'Tools' };
  const related = allSlugs
    .filter(s => s !== slug && CATEGORIES[s]?.cat === info.cat)
    .slice(0, 5);
  // If fewer than 5, add popular pages
  const popular = ['smart-unfollow', 'detect-unfollowers', 'video-downloader', 'followers-scraping', 'auto-liker', 'growth-suite'];
  for (const p of popular) {
    if (related.length >= 5) break;
    if (p !== slug && !related.includes(p) && allSlugs.includes(p)) related.push(p);
  }
  return related.slice(0, 6);
}

// Main build
async function build() {
  console.log('🔨 Building SEO doc pages...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Read all markdown files
  const files = fs.readdirSync(DOCS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md');

  const allSlugs = files.map(f => f.replace('.md', ''));
  const sitemapEntries = [];
  let count = 0;

  for (const file of files) {
    const slug = file.replace('.md', '');
    const mdPath = path.join(DOCS_DIR, file);
    const markdown = fs.readFileSync(mdPath, 'utf-8');

    // Generate HTML
    let html = generateHTML(slug, markdown);

    // Insert related links
    const related = getRelatedPages(slug, allSlugs);
    const relatedHtml = related.map(r => {
      const rInfo = CATEGORIES[r] || { icon: '📄' };
      const rTitle = slugToTitle(r);
      return `        <a href="/docs/${r}">${rInfo.icon} ${rTitle}</a>`;
    }).join('\n');
    html = html.replace('RELATED_LINKS_PLACEHOLDER', relatedHtml);

    // Write file
    const outPath = path.join(OUT_DIR, `${slug}.html`);
    fs.writeFileSync(outPath, html);

    const info = CATEGORIES[slug] || { priority: 0.6 };
    sitemapEntries.push({ slug, priority: info.priority });
    count++;
    console.log(`  ✅ ${slug}.html`);
  }

  // Generate sitemap entries for easy copy-paste
  const sitemapXml = sitemapEntries.map(e => `  <url>
    <loc>https://xactions.app/docs/${e.slug}</loc>
    <lastmod>2026-02-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n');

  fs.writeFileSync(path.join(OUT_DIR, '_sitemap-entries.xml'), sitemapXml);

  console.log(`\n✅ Generated ${count} HTML pages in dashboard/docs/`);
  console.log(`📋 Sitemap entries saved to dashboard/docs/_sitemap-entries.xml`);
  console.log(`\nNext steps:`);
  console.log(`  1. Add Express route: app.use('/docs', express.static('dashboard/docs'))`);
  console.log(`  2. Append sitemap entries to public/sitemap.xml`);
}

build().catch(console.error);
