// XActions Shared Sidebar — X/Twitter-style navigation
// by nichxbt

(function () {
  const sidebar = document.querySelector('.sidebar-left');
  if (!sidebar) return;

  const path = window.location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';

  const icons = {
    home: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    run: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    scripts: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    automations: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    workflows: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
    agent: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 14 22h-4a7 7 0 0 1-6.73-3H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/></svg>',
    monitor: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    unfollowers: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>',
    video: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    threads: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    ai: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
    a2a: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    integrations: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
    graph: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><line x1="6" y1="9" x2="6" y2="15"/><line x1="18" y1="9" x2="18" y2="15"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="18" x2="15" y2="18"/></svg>',
    docs: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    tutorials: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    blog: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    useCases: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    pricing: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    status: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    priceCharts: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    threadComposer: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    team: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    about: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    github: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
    login: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    admin: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    aiTools: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    aiApi: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    changelog: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    faq: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    contact: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    compare: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="6 9 12 3 18 9"/><polyline points="6 15 12 21 18 15"/></svg>'
  };

  const navItems = [
    // Core
    { href: '/', label: 'Home', icon: icons.home },
    { href: '/run', label: 'Run', icon: icons.run },
    { href: '/scripts', label: 'Scripts', icon: icons.scripts },
    { href: '/features', label: 'Features', icon: icons.scripts },
    // Automation & Growth
    { href: '/automations', label: 'Automations', icon: icons.automations },
    { href: '/workflows', label: 'Workflows', icon: icons.workflows },
    { href: '/agent', label: 'AI Agent', icon: icons.agent },
    { href: '/monitor', label: 'Monitor', icon: icons.monitor },
    { href: '/unfollowers', label: 'Unfollowers', icon: icons.unfollowers },
    // Content & Media
    { href: '/video', label: 'Video', icon: icons.video },
    { href: '/thread', label: 'Thread Reader', icon: icons.threads },
    { href: '/thread-composer', label: 'Threads', icon: icons.threadComposer },
    { href: '/calendar', label: 'Calendar', icon: icons.calendar },
    // Intelligence & AI
    { href: '/mcp', label: 'AI / MCP', icon: icons.ai },
    { href: '/a2a', label: 'A2A Protocol', icon: icons.a2a },
    { href: '/ai', label: 'AI Tools', icon: icons.aiTools },
    { href: '/ai-api', label: 'AI API', icon: icons.aiApi },
    { href: '/analytics-dashboard', label: 'Analytics', icon: icons.analytics },
    { href: '/analytics', label: 'Engagement', icon: icons.analytics },
    { href: '/price-correlation', label: 'Price Charts', icon: icons.priceCharts },
    { href: '/graph', label: 'Social Graph', icon: icons.graph },
    // Platform
    { href: '/integrations', label: 'Integrations', icon: icons.integrations },
    { href: '/team', label: 'Team', icon: icons.team },
    { href: '/admin', label: 'Admin', icon: icons.admin },
    { href: '/login', label: 'Login', icon: icons.login },
    // Resources
    { href: '/docs', label: 'Docs', icon: icons.docs },
    { href: '/tutorials', label: 'Tutorials', icon: icons.tutorials },
    { href: '/blog', label: 'Blog', icon: icons.blog },
    { href: '/use-cases', label: 'Use Cases', icon: icons.useCases },
    { href: '/compare', label: 'Compare', icon: icons.compare },
    { href: '/pricing', label: 'Pricing', icon: icons.pricing },
    { href: '/faq', label: 'FAQ', icon: icons.faq },
    { href: '/changelog', label: 'Changelog', icon: icons.changelog },
    { href: '/contact', label: 'Contact', icon: icons.contact },
    { href: '/status', label: 'Status', icon: icons.status },
    { href: '/about', label: 'About', icon: icons.about },
    { href: 'https://github.com/nirholas/XActions', label: 'GitHub', icon: icons.github, external: true }
  ];

  function isActive(href) {
    if (href === '/') return path === '/' || path === '' || path === '/index';
    return path === href || path.startsWith(href + '/');
  }

  const nav = navItems.map(item => {
    const active = isActive(item.href) ? ' active' : '';
    const ext = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${item.href}" class="nav-item${active}" aria-label="${item.label}"${ext}>
      <span class="nav-icon" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    </a>`;
  }).join('\n        ');

  sidebar.innerHTML = `
      <div class="logo">
        <a href="/" aria-label="XActions Home">
          <span class="logo-icon">⚡</span>
        </a>
      </div>
      <nav>
        ${nav}
      </nav>
      <a href="/run" class="action-btn">Run Script</a>
      <a href="/" class="user-menu" id="user-menu-link">
        <div class="user-avatar" id="user-avatar">⚡</div>
        <div class="user-info">
          <div class="user-name" id="user-display-name">XActions</div>
          <div class="user-handle" id="user-handle">Loading...</div>
        </div>
        <span class="user-menu-dots">···</span>
      </a>`;

  // Populate user info from stored auth token
  (function loadUserInfo() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Not logged in — show GitHub link
      const link = document.getElementById('user-menu-link');
      link.href = 'https://github.com/nirholas/XActions';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.getElementById('user-display-name').textContent = 'Star on GitHub';
      document.getElementById('user-handle').textContent = '100% open source';
      return;
    }

    // Decode JWT payload (base64) for immediate display — no network needed
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const username = payload.username || 'User';
      document.getElementById('user-display-name').textContent = username;
      document.getElementById('user-handle').textContent = `@${username}`;
      document.getElementById('user-avatar').textContent = username[0].toUpperCase();

      const link = document.getElementById('user-menu-link');
      link.href = '/dashboard';
      link.removeAttribute('target');
      link.removeAttribute('rel');
    } catch {
      // Malformed JWT — clear it and show logged-out state
      localStorage.removeItem('authToken');
      document.getElementById('user-display-name').textContent = 'Sign in';
      document.getElementById('user-handle').textContent = '';
      document.getElementById('user-menu-link').href = '/login';
    }

    // Fetch full user info from API for Twitter handle + avatar
    const apiBase = window.location.hostname === 'localhost'
      ? 'http://localhost:3001/api'
      : '/api';

    fetch(`${apiBase}/user/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const displayName = data.twitterUsername || data.username || 'User';
        const handle = data.twitterUsername ? `@${data.twitterUsername}` : `@${data.username}`;
        document.getElementById('user-display-name').textContent = displayName;
        document.getElementById('user-handle').textContent = handle;
        if (data.twitterUsername) {
          document.getElementById('user-avatar').textContent = data.twitterUsername[0].toUpperCase();
        }
      })
      .catch(() => { /* non-critical, keep JWT-decoded display */ });
  }());

  // Inject sidebar CSS overrides (wins cascade over inline <style> blocks)
  const style = document.createElement('style');
  style.textContent = `
    .logo { padding: 8px 12px; margin-bottom: 4px; }
    .logo a { display: inline-flex !important; align-items: center; justify-content: center; text-decoration: none; color: var(--text-primary); font-size: 1.8rem; padding: 12px; border-radius: 9999px; transition: background 0.2s; line-height: 1; gap: 0 !important; font-weight: normal !important; }
    .logo a:hover { background: var(--accent-light); }
    .logo-icon { font-size: 1.75rem; line-height: 1; }
    .nav-icon { width: 26px !important; height: 26px; display: flex !important; align-items: center; justify-content: center; flex-shrink: 0; font-size: unset !important; text-align: unset !important; }
    .nav-icon svg { width: 26px; height: 26px; }
    .nav-item.active .nav-icon svg { stroke-width: 2.5; }
    .sidebar-left nav { overflow-y: auto; }
    .sidebar-left nav::-webkit-scrollbar { width: 0; }
    .user-menu { padding: 12px; border-radius: 9999px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s; margin-bottom: 12px; text-decoration: none; color: var(--text-primary); }
    .user-menu:hover { background: var(--bg-tertiary, #202327); }
    .user-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent) 0%, #7856ff 100%); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; flex-shrink: 0; }
    .user-info { flex: 1; min-width: 0; }
    .user-name { font-weight: 700; font-size: 0.9375rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-handle { color: var(--text-secondary); font-size: 0.9375rem; }
    .user-menu-dots { color: var(--text-primary); font-size: 1.2rem; }
    @media (max-width: 768px) {
      .nav-item span:last-child, .user-info, .user-menu-dots { display: none; }
      .logo a { padding: 8px; }
      .nav-item { justify-content: center; padding: 12px; }
      .action-btn { width: 50px; height: 50px; padding: 0; font-size: 0; }
      .action-btn::before { content: '⚡'; font-size: 1.5rem; }
      .user-menu { justify-content: center; }
    }`;
  document.head.appendChild(style);
})();
