// XActions Shared Sidebar — X/Twitter-style navigation
// by nichxbt

(function () {
  const sidebar = document.querySelector('.sidebar-left');
  if (!sidebar || sidebar.querySelector('nav')) return; // skip if already rendered (e.g. index.html)

  const path = window.location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';

  const icons = {
    home: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    run: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    dashboard: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',
    scripts: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    video: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    threads: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    ai: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
    docs: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    tutorials: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    about: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    github: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>'
  };

  const navItems = [
    { href: '/', label: 'Home', icon: icons.home },
    { href: '/run', label: 'Run', icon: icons.run },
    { href: '/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { href: '/features', label: 'Scripts', icon: icons.scripts },
    { href: '/video', label: 'Video', icon: icons.video },
    { href: '/thread', label: 'Thread Reader', icon: icons.threads },
    { href: '/mcp', label: 'AI / MCP', icon: icons.ai },
    { href: '/docs', label: 'Docs', icon: icons.docs },
    { href: '/tutorials', label: 'Tutorials', icon: icons.tutorials },
    { href: '/about', label: 'About', icon: icons.about },
    { href: 'https://github.com/nirholas/XActions', label: 'GitHub', icon: icons.github, external: true }
  ];

  function isActive(href) {
    if (href === '/') return path === '/' || path === '' || path === '/index';
    return path.startsWith(href);
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
      <a href="/login" class="user-menu" id="user-menu-link">
        <div class="user-avatar" id="user-avatar">?</div>
        <div class="user-info">
          <div class="user-name" id="user-display-name">Login / Sign Up</div>
          <div class="user-handle" id="user-handle">Click to continue</div>
        </div>
        <span class="user-menu-dots">···</span>
      </a>`;

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
