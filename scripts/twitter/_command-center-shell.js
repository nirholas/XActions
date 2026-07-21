/*
 * ============================================================
 * SOURCE SHELL for xactions-command-center.js  (do not paste this file)
 * ============================================================
 * This is the UI shell for the XActions Command Center. It is NOT the
 * script users run. `scripts/build-toolkit.mjs` injects the tool catalog
 * and every bundled tool at the __XA_INJECT_DATA__ marker below and writes
 * the runnable result to scripts/twitter/xactions-command-center.js.
 *
 * To change the launcher UI, edit THIS file, then run:
 *   node scripts/build-toolkit.mjs
 *
 * The injected data provides three bindings this shell relies on:
 *   CATALOG     - array of tool metadata { id, title, emoji, category,
 *                 danger, desc, where, defaults, stopGlobal }
 *   CATEGORIES  - ordered array of { id, label, emoji }
 *   TOOLS       - object mapping tool id -> function that runs the tool
 */

(function xactionsCommandCenter() {
  // Intentionally NOT in strict mode: bundled tools are pasted verbatim and
  // some rely on sloppy-mode semantics exactly as they do when run standalone.

  // Re-pasting the script replaces any live instance cleanly.
  if (window.XActionsCommandCenter && typeof window.XActionsCommandCenter.destroy === 'function') {
    try { window.XActionsCommandCenter.destroy(); } catch (e) { /* ignore */ }
  }

  /* __XA_INJECT_DATA__ */

  const VERSION = '__XA_VERSION__';
  const PANEL_ID = 'xactions-command-center';
  const FAB_ID = 'xactions-command-center-fab';
  const LS_KEY = 'xactions_command_center_v1';
  const TAG = '[XActions Command Center]';

  const DANGER = {
    safe: { label: 'Safe', color: '#00ba7c', note: 'Read-only or export. Does not change your account.' },
    caution: { label: 'Writes', color: '#ffd400', note: 'Performs actions on your account (likes, follows, posts). Runs at a human pace.' },
    destructive: { label: 'Bulk / irreversible', color: '#f4212e', note: 'Bulk changes that cannot be undone in one click (mass unfollow, unlike, block, clear). Read the warning before running.' }
  };

  // ---- persisted UI state ----------------------------------------------------

  const DEFAULT_STATE = { favorites: [], recents: [], pos: { top: 72, left: null }, category: 'all' };

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const saved = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...saved };
    } catch (e) { return structuredClone(DEFAULT_STATE); }
  }
  function saveState() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  const state = loadState();

  const byId = Object.fromEntries(CATALOG.map((t) => [t.id, t]));

  // ---- small helpers ---------------------------------------------------------

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      }
    }
    for (const c of [].concat(children || [])) {
      if (c === null || c === undefined) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

  function toast(msg, kind) {
    const t = el('div', { class: 'xcc-toast ' + (kind || ''), text: msg });
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 3200);
  }

  // ---- styles ----------------------------------------------------------------

  const STYLE = `
  #${PANEL_ID}, #${FAB_ID} { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; }
  #${PANEL_ID} *, #${FAB_ID} * { box-sizing: border-box; }
  #${PANEL_ID} {
    position: fixed; width: 380px; max-height: 90vh; background: #15202b; color: #e7e9ea;
    border: 1px solid #38444d; border-radius: 16px; font-size: 13px; z-index: 2147483647;
    box-shadow: 0 12px 40px rgba(0,0,0,0.55); display: flex; flex-direction: column;
  }
  #${PANEL_ID} .xcc-header {
    background: #1d9bf0; color: #fff; padding: 11px 14px; cursor: move; border-radius: 15px 15px 0 0;
    display: flex; align-items: center; justify-content: space-between; font-weight: 800; font-size: 14px; flex: 0 0 auto;
  }
  #${PANEL_ID} .xcc-header .xcc-hbtns { display: flex; gap: 5px; }
  #${PANEL_ID} .xcc-header button {
    background: rgba(255,255,255,0.16); border: none; color: #fff; width: 25px; height: 25px;
    border-radius: 7px; cursor: pointer; font-size: 13px; line-height: 1; transition: background 0.15s;
  }
  #${PANEL_ID} .xcc-header button:hover { background: rgba(255,255,255,0.32); }
  #${PANEL_ID} .xcc-search { padding: 10px 12px 6px; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-search input {
    width: 100%; background: #192734; color: #e7e9ea; border: 1px solid #38444d; border-radius: 10px;
    padding: 9px 12px; font-size: 13px; outline: none;
  }
  #${PANEL_ID} .xcc-search input:focus { border-color: #1d9bf0; }
  #${PANEL_ID} .xcc-cats { display: flex; gap: 5px; overflow-x: auto; padding: 4px 12px 8px; flex: 0 0 auto; scrollbar-width: none; }
  #${PANEL_ID} .xcc-cats::-webkit-scrollbar { display: none; }
  #${PANEL_ID} .xcc-cat {
    white-space: nowrap; background: #192734; border: 1px solid #38444d; color: #8899a6; border-radius: 999px;
    padding: 4px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  }
  #${PANEL_ID} .xcc-cat:hover { color: #e7e9ea; }
  #${PANEL_ID} .xcc-cat.active { background: #1d9bf0; border-color: #1d9bf0; color: #fff; }
  #${PANEL_ID} .xcc-body { overflow-y: auto; flex: 1 1 auto; padding: 0 8px 8px; }
  #${PANEL_ID} .xcc-body::-webkit-scrollbar { width: 9px; }
  #${PANEL_ID} .xcc-body::-webkit-scrollbar-thumb { background: #38444d; border-radius: 5px; }
  #${PANEL_ID} .xcc-group-label { color: #536471; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; padding: 12px 8px 5px; }
  #${PANEL_ID} .xcc-row {
    display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: pointer; transition: background 0.12s;
  }
  #${PANEL_ID} .xcc-row:hover, #${PANEL_ID} .xcc-row.active { background: #1e2a37; }
  #${PANEL_ID} .xcc-row .xcc-emoji { font-size: 18px; width: 24px; text-align: center; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-row .xcc-meta { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .xcc-row .xcc-title { font-weight: 700; display: flex; align-items: center; gap: 7px; }
  #${PANEL_ID} .xcc-row .xcc-title .xcc-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-row .xcc-sub { color: #8899a6; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${PANEL_ID} .xcc-star { flex: 0 0 auto; color: #536471; font-size: 15px; cursor: pointer; padding: 2px; transition: color 0.15s, transform 0.1s; }
  #${PANEL_ID} .xcc-star:hover { transform: scale(1.2); }
  #${PANEL_ID} .xcc-star.on { color: #ffd400; }
  #${PANEL_ID} .xcc-empty { text-align: center; color: #536471; padding: 40px 20px; font-size: 12.5px; }
  /* detail */
  #${PANEL_ID} .xcc-detail { padding: 10px 14px 4px; }
  #${PANEL_ID} .xcc-back { background: none; border: none; color: #1d9bf0; cursor: pointer; font-size: 12.5px; font-weight: 700; padding: 4px 0 8px; display: inline-flex; gap: 5px; align-items: center; }
  #${PANEL_ID} .xcc-dtitle { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 800; }
  #${PANEL_ID} .xcc-badges { display: flex; gap: 6px; margin: 9px 0; flex-wrap: wrap; }
  #${PANEL_ID} .xcc-badge { padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }
  #${PANEL_ID} .xcc-badge.cat { background: #192734; color: #8899a6; border: 1px solid #38444d; }
  #${PANEL_ID} .xcc-ddesc { color: #cfd9e0; font-size: 13px; line-height: 1.5; margin: 4px 0 10px; }
  #${PANEL_ID} .xcc-where { background: #192734; border: 1px solid #38444d; border-radius: 10px; padding: 9px 11px; font-size: 12px; margin-bottom: 10px; }
  #${PANEL_ID} .xcc-where b { color: #e7e9ea; }
  #${PANEL_ID} .xcc-where .xcc-where-link { color: #1d9bf0; text-decoration: none; word-break: break-all; }
  #${PANEL_ID} .xcc-where.warn { border-color: #ffd400; }
  #${PANEL_ID} .xcc-warn {
    background: rgba(244,33,46,0.12); border: 1px solid rgba(244,33,46,0.5); border-radius: 10px;
    padding: 9px 11px; font-size: 12px; color: #ffb3b8; margin-bottom: 10px; line-height: 1.45;
  }
  #${PANEL_ID} .xcc-opts { margin-bottom: 10px; }
  #${PANEL_ID} .xcc-opts > summary {
    cursor: pointer; font-weight: 800; color: #e7e9ea; list-style: none; padding: 6px 0; font-size: 12.5px;
    display: flex; justify-content: space-between; align-items: center;
  }
  #${PANEL_ID} .xcc-opts > summary::after { content: '\\25be'; color: #8899a6; }
  #${PANEL_ID} .xcc-opts[open] > summary::after { content: '\\25b4'; }
  #${PANEL_ID} .xcc-optbar { display: flex; gap: 8px; margin: 2px 0 8px; }
  #${PANEL_ID} .xcc-optbar button { background: none; border: none; color: #1d9bf0; cursor: pointer; font-size: 11.5px; font-weight: 700; padding: 0; }
  #${PANEL_ID} .xcc-field { display: grid; gap: 3px; margin-bottom: 8px; }
  #${PANEL_ID} .xcc-field > label { color: #8899a6; font-size: 11px; }
  #${PANEL_ID} .xcc-field input[type="text"], #${PANEL_ID} .xcc-field input[type="number"], #${PANEL_ID} .xcc-field select, #${PANEL_ID} .xcc-json {
    background: #192734; color: #e7e9ea; border: 1px solid #38444d; border-radius: 8px; padding: 7px 9px; font-size: 12px; width: 100%; outline: none;
  }
  #${PANEL_ID} .xcc-field input:focus, #${PANEL_ID} .xcc-json:focus { border-color: #1d9bf0; }
  #${PANEL_ID} .xcc-check { display: flex; align-items: center; gap: 8px; color: #e7e9ea; font-size: 12.5px; cursor: pointer; margin-bottom: 8px; }
  #${PANEL_ID} .xcc-check input { accent-color: #1d9bf0; width: 15px; height: 15px; }
  #${PANEL_ID} .xcc-sub-obj { border: 1px solid #2b3742; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
  #${PANEL_ID} .xcc-sub-obj > .xcc-sub-title { color: #8899a6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
  #${PANEL_ID} .xcc-json { min-height: 90px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; resize: vertical; }
  #${PANEL_ID} .xcc-json.bad { border-color: #f4212e; }
  #${PANEL_ID} .xcc-run {
    width: 100%; border: none; border-radius: 12px; padding: 12px 0; font-weight: 800; font-size: 14px; cursor: pointer;
    color: #04120c; background: #00ba7c; transition: filter 0.15s, transform 0.05s; margin-bottom: 4px;
  }
  #${PANEL_ID} .xcc-run.caution { background: #ffd400; color: #1a1400; }
  #${PANEL_ID} .xcc-run.destructive { background: #f4212e; color: #fff; }
  #${PANEL_ID} .xcc-run:hover { filter: brightness(1.1); }
  #${PANEL_ID} .xcc-run:active { transform: scale(0.99); }
  /* dock */
  #${PANEL_ID} .xcc-dock { border-top: 1px solid #38444d; padding: 8px 12px; flex: 0 0 auto; max-height: 150px; overflow-y: auto; }
  #${PANEL_ID} .xcc-dock-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  #${PANEL_ID} .xcc-dock-head span { color: #536471; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
  #${PANEL_ID} .xcc-dock-head button { background: none; border: none; color: #f4212e; font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; }
  #${PANEL_ID} .xcc-run-item { display: flex; align-items: center; gap: 8px; background: #192734; border-radius: 8px; padding: 6px 9px; margin-bottom: 5px; font-size: 12px; }
  #${PANEL_ID} .xcc-run-item .xcc-ri-meta { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .xcc-run-item .xcc-ri-title { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${PANEL_ID} .xcc-run-item .xcc-ri-time { color: #536471; font-size: 10.5px; }
  #${PANEL_ID} .xcc-run-item button { background: #f4212e; border: none; color: #fff; border-radius: 7px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-run-item button.ghost { background: #38444d; }
  #${PANEL_ID} .xcc-footer { padding: 7px 14px 10px; color: #536471; font-size: 10.5px; text-align: center; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-footer a { color: #1d9bf0; text-decoration: none; }
  #${PANEL_ID}.xcc-min .xcc-search, #${PANEL_ID}.xcc-min .xcc-cats, #${PANEL_ID}.xcc-min .xcc-body, #${PANEL_ID}.xcc-min .xcc-footer, #${PANEL_ID}.xcc-min .xcc-dock { display: none; }
  #${FAB_ID} {
    position: fixed; bottom: 22px; right: 22px; width: 52px; height: 52px; border-radius: 50%; background: #1d9bf0;
    color: #fff; border: none; cursor: pointer; font-size: 24px; z-index: 2147483646; box-shadow: 0 6px 20px rgba(29,155,240,0.5);
    display: flex; align-items: center; justify-content: center; transition: transform 0.15s, filter 0.15s;
  }
  #${FAB_ID}:hover { transform: scale(1.08); filter: brightness(1.08); }
  .xcc-toast {
    position: fixed; bottom: 22px; left: 50%; transform: translate(-50%, 20px); background: #192734; color: #e7e9ea;
    border: 1px solid #38444d; border-radius: 12px; padding: 11px 18px; font-size: 13px; z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; opacity: 0; transition: opacity 0.25s, transform 0.25s;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5); max-width: 80vw;
  }
  .xcc-toast.show { opacity: 1; transform: translate(-50%, 0); }
  .xcc-toast.good { border-color: #00ba7c; }
  .xcc-toast.bad { border-color: #f4212e; }
  `;

  // ---- launched-tool tracking (the dock) ------------------------------------

  const launched = []; // { id, title, at, stopGlobal }

  function fmtTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ---- panel construction ----------------------------------------------------

  let panel, fab, els = {}, view = 'list', activeIndex = 0, visibleRows = [];

  function build() {
    const style = el('style', { id: PANEL_ID + '-style', html: STYLE });
    document.head.appendChild(style);

    panel = el('div', { id: PANEL_ID });
    panel.style.top = (state.pos.top || 72) + 'px';
    if (state.pos.left !== null && state.pos.left !== undefined) panel.style.left = state.pos.left + 'px';
    else panel.style.right = '22px';

    const header = el('div', { class: 'xcc-header' }, [
      el('span', { html: '&#9889; XActions Command Center' }),
      el('div', { class: 'xcc-hbtns' }, [
        el('button', { title: 'Minimize', text: '–', onclick: () => panel.classList.toggle('xcc-min') }),
        el('button', { title: 'Close', text: '✕', onclick: close })
      ])
    ]);
    els.search = el('input', { type: 'text', placeholder: 'Search ' + CATALOG.length + ' tools…', spellcheck: 'false', autocomplete: 'off', oninput: () => { activeIndex = 0; renderList(); } });
    els.searchWrap = el('div', { class: 'xcc-search' }, [els.search]);
    els.cats = el('div', { class: 'xcc-cats' });
    els.body = el('div', { class: 'xcc-body' });
    els.dock = el('div', { class: 'xcc-dock', style: 'display:none' });
    els.footer = el('div', { class: 'xcc-footer', html: 'XActions v' + VERSION + ' · <a href="https://github.com/nirholas/XActions" target="_blank" rel="noopener">github.com/nirholas/XActions</a> · <a href="https://xactions.app" target="_blank" rel="noopener">xactions.app</a>' });

    panel.append(header, els.searchWrap, els.cats, els.body, els.dock, els.footer);
    document.body.appendChild(panel);

    fab = el('button', { id: FAB_ID, title: 'XActions Command Center', html: '&#9889;', onclick: open, style: 'display:none' });
    document.body.appendChild(fab);

    renderCats();
    renderList();
    makeDraggable(header);
    document.addEventListener('keydown', onKey, true);
    els.search.focus();
  }

  function renderCats() {
    els.cats.innerHTML = '';
    const all = [{ id: 'all', label: 'All', emoji: '✨' }, { id: 'favorites', label: 'Favorites', emoji: '⭐' }, ...CATEGORIES];
    for (const c of all) {
      const chip = el('button', { class: 'xcc-cat' + (state.category === c.id ? ' active' : ''), text: c.emoji + ' ' + c.label, onclick: () => { state.category = c.id; saveState(); activeIndex = 0; renderCats(); renderList(); } });
      els.cats.appendChild(chip);
    }
  }

  function matches(tool, q) {
    if (!q) return true;
    const hay = (tool.title + ' ' + tool.desc + ' ' + tool.category + ' ' + tool.id).toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  }

  function renderList() {
    view = 'list';
    els.searchWrap.style.display = '';
    els.cats.style.display = '';
    els.body.innerHTML = '';
    const q = els.search.value.trim();
    let pool = CATALOG.slice();
    if (state.category === 'favorites') pool = pool.filter((t) => state.favorites.includes(t.id));
    else if (state.category !== 'all') pool = pool.filter((t) => t.category === state.category);
    pool = pool.filter((t) => matches(t, q));

    visibleRows = [];

    if (!pool.length) {
      els.body.appendChild(el('div', { class: 'xcc-empty', html: 'No tools match. Try another search or category.' }));
      renderDock();
      return;
    }

    // Favorites + Recents shortcuts only on the unfiltered "all" view.
    if (state.category === 'all' && !q) {
      if (state.favorites.length) appendGroup('⭐ Favorites', state.favorites.map((id) => byId[id]).filter(Boolean));
      const recents = state.recents.map((id) => byId[id]).filter(Boolean);
      if (recents.length) appendGroup('\u{1f552} Recent', recents);
    }

    if (state.category === 'all' && !q) {
      for (const cat of CATEGORIES) {
        const items = pool.filter((t) => t.category === cat.id);
        if (items.length) appendGroup(cat.emoji + ' ' + cat.label, items);
      }
    } else {
      appendGroup(null, pool);
    }
    highlight();
    renderDock();
  }

  function appendGroup(label, items) {
    if (label) els.body.appendChild(el('div', { class: 'xcc-group-label', text: label }));
    for (const tool of items) {
      const idx = visibleRows.length;
      const star = el('span', {
        class: 'xcc-star' + (state.favorites.includes(tool.id) ? ' on' : ''), title: 'Favorite', html: '★',
        onclick: (e) => { e.stopPropagation(); toggleFav(tool.id); }
      });
      const row = el('div', { class: 'xcc-row', onclick: () => openDetail(tool.id) }, [
        el('span', { class: 'xcc-emoji', text: tool.emoji }),
        el('div', { class: 'xcc-meta' }, [
          el('div', { class: 'xcc-title' }, [
            el('span', { class: 'xcc-dot', style: 'background:' + DANGER[tool.danger].color, title: DANGER[tool.danger].label }),
            document.createTextNode(tool.title)
          ]),
          el('div', { class: 'xcc-sub', text: tool.desc })
        ]),
        star
      ]);
      row.dataset.idx = idx;
      visibleRows.push({ tool, row });
      els.body.appendChild(row);
    }
  }

  function highlight() {
    visibleRows.forEach((r, i) => r.row.classList.toggle('active', i === activeIndex));
    const active = visibleRows[activeIndex];
    if (active) active.row.scrollIntoView({ block: 'nearest' });
  }

  function toggleFav(id) {
    const i = state.favorites.indexOf(id);
    if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(id);
    saveState();
    if (view === 'list') renderList();
  }

  function pushRecent(id) {
    state.recents = [id, ...state.recents.filter((r) => r !== id)].slice(0, 6);
    saveState();
  }

  // ---- detail view -----------------------------------------------------------

  function openDetail(id) {
    const tool = byId[id];
    if (!tool) return;
    view = 'detail';
    els.searchWrap.style.display = 'none';
    els.cats.style.display = 'none';
    els.body.innerHTML = '';

    const wrap = el('div', { class: 'xcc-detail' });
    wrap.appendChild(el('button', { class: 'xcc-back', html: '← All tools', onclick: renderList }));
    wrap.appendChild(el('div', { class: 'xcc-dtitle' }, [el('span', { text: tool.emoji }), document.createTextNode(tool.title)]));

    const cat = CATEGORIES.find((c) => c.id === tool.category);
    wrap.appendChild(el('div', { class: 'xcc-badges' }, [
      el('span', { class: 'xcc-badge cat', text: (cat ? cat.label : tool.category) }),
      el('span', { class: 'xcc-badge', style: 'background:' + DANGER[tool.danger].color + ';color:#04120c', text: DANGER[tool.danger].label })
    ]));

    wrap.appendChild(el('div', { class: 'xcc-ddesc', text: tool.desc }));

    // Where to run
    const onRight = pageMatches(tool.where);
    const whereBox = el('div', { class: 'xcc-where' + (onRight === false ? ' warn' : '') });
    whereBox.innerHTML = '<b>Where to run:</b> ' + esc(tool.where.label) +
      (tool.where.url ? ' &middot; <a class="xcc-where-link" href="' + esc(tool.where.url) + '" target="_blank" rel="noopener">open page ↗</a>' : '') +
      (onRight === false ? '<br><span style="color:#ffd400">You may not be on the right page for this tool.</span>' : '');
    wrap.appendChild(whereBox);

    // Danger note
    if (tool.danger !== 'safe') {
      wrap.appendChild(el('div', { class: (tool.danger === 'destructive' ? 'xcc-warn' : 'xcc-where') }, [
        el('span', { html: (tool.danger === 'destructive' ? '⚠️ ' : '') + esc(DANGER[tool.danger].note) })
      ]));
    }

    // Options form
    let form = null;
    if (tool.defaults && Object.keys(tool.defaults).length) {
      const details = el('details', { class: 'xcc-opts' });
      details.appendChild(el('summary', { text: '⚙️ Options' }));
      form = buildForm(tool.defaults);
      const bar = el('div', { class: 'xcc-optbar' }, [
        el('button', { text: 'Reset', onclick: () => { form.reset(); } }),
        el('button', { text: form.jsonMode() ? 'Form editor' : 'Edit as JSON', onclick: (e) => { const j = form.toggleJson(); e.target.textContent = j ? 'Form editor' : 'Edit as JSON'; } })
      ]);
      details.append(bar, form.element);
      wrap.appendChild(details);
    }

    const runBtn = el('button', { class: 'xcc-run ' + tool.danger, text: '▶ Run ' + tool.title });
    let armed = false;
    runBtn.addEventListener('click', () => {
      if (tool.danger === 'destructive' && !armed) {
        armed = true;
        runBtn.textContent = '⚠️ Click again to confirm. This cannot be undone';
        setTimeout(() => { if (armed) { armed = false; runBtn.textContent = '▶ Run ' + tool.title; } }, 4000);
        return;
      }
      let cfg = null;
      if (form) {
        try { cfg = form.getValue(); }
        catch (e) { toast('Options are not valid JSON: ' + e.message, 'bad'); return; }
      }
      runTool(tool.id, cfg);
    });
    wrap.appendChild(runBtn);

    if (tool.stopGlobal) {
      wrap.appendChild(el('div', { class: 'xcc-footer', style: 'text-align:left;padding:8px 0 2px', html: 'This tool runs until done or stopped. Use <b>Stop</b> in the panel dock, or run <code>window.' + esc(tool.stopGlobal) + '()</code> in the console.' }));
    }

    els.body.appendChild(wrap);
    renderDock();
  }

  function pageMatches(where) {
    if (!where || !where.match) return null;
    try {
      const path = location.pathname + location.search;
      return where.match.some((rx) => new RegExp(rx, 'i').test(path));
    } catch (e) { return null; }
  }

  // ---- options form builder --------------------------------------------------

  function buildForm(defaults) {
    const root = el('div');
    let jsonMode = false;
    const jsonArea = el('textarea', { class: 'xcc-json', spellcheck: 'false', style: 'display:none' });
    const fieldsWrap = el('div');
    root.append(fieldsWrap, jsonArea);

    const getters = [];
    function renderFields(obj, container, prefix) {
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        const path = prefix ? prefix + '.' + key : key;
        if (val === null || typeof val === 'function') continue;
        if (typeof val === 'boolean') {
          const input = el('input', { type: 'checkbox' });
          input.checked = val;
          container.appendChild(el('label', { class: 'xcc-check' }, [input, document.createTextNode(key)]));
          getters.push({ path, get: () => input.checked });
        } else if (typeof val === 'number') {
          const input = el('input', { type: 'number', value: String(val) });
          container.appendChild(el('div', { class: 'xcc-field' }, [el('label', { text: key }), input]));
          getters.push({ path, get: () => { const n = Number(input.value); return Number.isFinite(n) ? n : val; } });
        } else if (typeof val === 'string') {
          const input = el('input', { type: 'text', value: val });
          container.appendChild(el('div', { class: 'xcc-field' }, [el('label', { text: key }), input]));
          getters.push({ path, get: () => input.value });
        } else if (Array.isArray(val)) {
          const primitive = val.every((v) => typeof v === 'string' || typeof v === 'number');
          if (primitive) {
            const input = el('input', { type: 'text', value: val.join(', ') });
            container.appendChild(el('div', { class: 'xcc-field' }, [el('label', { text: key + ' (comma-separated)' }), input]));
            getters.push({ path, get: () => input.value.split(',').map((s) => s.trim()).filter(Boolean) });
          } else {
            addJsonField(container, key, val, path);
          }
        } else if (typeof val === 'object') {
          // one level of nesting as a labelled sub-section
          if (!prefix) {
            const sub = el('div', { class: 'xcc-sub-obj' }, [el('div', { class: 'xcc-sub-title', text: key })]);
            container.appendChild(sub);
            renderFields(val, sub, path);
          } else {
            addJsonField(container, key, val, path);
          }
        }
      }
    }
    function addJsonField(container, key, val, path) {
      const area = el('textarea', { class: 'xcc-json', spellcheck: 'false', style: 'min-height:60px' });
      area.value = JSON.stringify(val, null, 2);
      container.appendChild(el('div', { class: 'xcc-field' }, [el('label', { text: key + ' (JSON)' }), area]));
      getters.push({ path, get: () => JSON.parse(area.value) });
    }

    function setDeep(obj, path, value) {
      const parts = path.split('.');
      let o = obj;
      for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] || {}; o = o[parts[i]]; }
      o[parts[parts.length - 1]] = value;
    }

    renderFields(defaults, fieldsWrap, '');

    return {
      element: root,
      jsonMode: () => jsonMode,
      toggleJson() {
        jsonMode = !jsonMode;
        if (jsonMode) { jsonArea.value = JSON.stringify(this.getValueFromFields(), null, 2); jsonArea.style.display = ''; fieldsWrap.style.display = 'none'; }
        else { fieldsWrap.style.display = ''; jsonArea.style.display = 'none'; }
        return jsonMode;
      },
      getValueFromFields() {
        const out = clone(defaults);
        for (const g of getters) { try { setDeep(out, g.path, g.get()); } catch (e) { /* keep default */ } }
        return out;
      },
      getValue() {
        if (jsonMode) { jsonArea.classList.remove('bad'); try { return JSON.parse(jsonArea.value); } catch (e) { jsonArea.classList.add('bad'); throw e; } }
        return this.getValueFromFields();
      },
      reset() {
        jsonMode = false; jsonArea.style.display = 'none'; fieldsWrap.style.display = '';
        fieldsWrap.innerHTML = ''; getters.length = 0; renderFields(defaults, fieldsWrap, '');
      }
    };
  }

  // ---- running a tool --------------------------------------------------------

  function runTool(id, cfg) {
    const tool = byId[id];
    if (!tool || typeof TOOLS[id] !== 'function') { toast('Tool not found: ' + id, 'bad'); return; }
    pushRecent(id);
    if (cfg) window.__XA_LAUNCH_CFG = cfg; else delete window.__XA_LAUNCH_CFG;
    let started = true;
    try {
      TOOLS[id]();
    } catch (e) {
      started = false;
      console.error(TAG, 'failed to start', id, e);
      toast('Failed to start ' + tool.title + ': ' + e.message, 'bad');
    }
    // The tool has read CONFIG synchronously by now; clear the shared override.
    delete window.__XA_LAUNCH_CFG;
    if (!started) return;
    launched.unshift({ id, title: tool.title, at: Date.now(), stopGlobal: tool.stopGlobal });
    toast('▶ Launched “' + tool.title + '”. Open the Console (F12) to watch progress', 'good');
    panel.classList.remove('xcc-min');
    renderDock();
  }

  function renderDock() {
    if (!launched.length) { els.dock.style.display = 'none'; els.dock.innerHTML = ''; return; }
    els.dock.style.display = '';
    els.dock.innerHTML = '';
    const anyStoppable = launched.some((l) => l.stopGlobal);
    const head = el('div', { class: 'xcc-dock-head' }, [
      el('span', { text: 'Launched this session' }),
      anyStoppable ? el('button', { text: 'Stop all', onclick: stopAll }) : el('button', { text: 'Clear', style: 'color:#536471', onclick: () => { launched.length = 0; renderDock(); } })
    ]);
    els.dock.appendChild(head);
    for (const item of launched.slice(0, 8)) {
      const controls = item.stopGlobal
        ? el('button', { text: 'Stop', onclick: () => stopOne(item) })
        : el('button', { class: 'ghost', text: 'Console', title: 'Progress prints to the DevTools Console', onclick: () => toast('Open DevTools → Console to see this tool’s progress') });
      els.dock.appendChild(el('div', { class: 'xcc-run-item' }, [
        el('span', { text: byId[item.id] ? byId[item.id].emoji : '▶' }),
        el('div', { class: 'xcc-ri-meta' }, [
          el('div', { class: 'xcc-ri-title', text: item.title }),
          el('div', { class: 'xcc-ri-time', text: 'started ' + fmtTime(item.at) })
        ]),
        controls
      ]));
    }
  }

  function stopOne(item) {
    if (item.stopGlobal && typeof window[item.stopGlobal] === 'function') {
      try { window[item.stopGlobal](); toast('⏹ Stopping ' + item.title + '…'); }
      catch (e) { toast('Could not stop ' + item.title + ': ' + e.message, 'bad'); }
    }
  }
  function stopAll() {
    const globals = [...new Set(launched.map((l) => l.stopGlobal).filter(Boolean))];
    let n = 0;
    for (const g of globals) { if (typeof window[g] === 'function') { try { window[g](); n++; } catch (e) { /* ignore */ } } }
    toast(n ? '⏹ Sent stop to ' + n + ' running tool' + (n > 1 ? 's' : '') : 'Nothing running to stop');
  }

  // ---- keyboard --------------------------------------------------------------

  function onKey(e) {
    // Global reopen shortcut.
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      if (e.shiftKey) return; // leave X's own shortcuts alone
      e.preventDefault(); e.stopPropagation();
      if (panel && panel.style.display !== 'none') els.search.focus();
      else open();
      return;
    }
    if (!panel || panel.style.display === 'none') return;
    const inField = e.target && panel.contains(e.target) && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target !== els.search;
    if (e.key === 'Escape') {
      if (view === 'detail') { e.preventDefault(); renderList(); els.search.focus(); }
      else { e.preventDefault(); close(); }
      return;
    }
    if (view !== 'list' || inField) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, visibleRows.length - 1); highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); highlight(); }
    else if (e.key === 'Enter') { const r = visibleRows[activeIndex]; if (r) { e.preventDefault(); openDetail(r.tool.id); } }
  }

  // ---- drag ------------------------------------------------------------------

  function makeDraggable(handle) {
    let sx, sy, st, sl, dragging = false;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      const r = panel.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; st = r.top; sl = r.left;
      panel.style.right = 'auto'; panel.style.left = sl + 'px';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const top = Math.max(0, Math.min(window.innerHeight - 60, st + e.clientY - sy));
      const left = Math.max(0, Math.min(window.innerWidth - 60, sl + e.clientX - sx));
      panel.style.top = top + 'px'; panel.style.left = left + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      const r = panel.getBoundingClientRect();
      state.pos = { top: Math.round(r.top), left: Math.round(r.left) };
      saveState();
    });
  }

  // ---- lifecycle -------------------------------------------------------------

  function open() {
    if (!panel) return;
    panel.style.display = 'flex';
    if (fab) fab.style.display = 'none';
    view = 'list';
    renderList();
    els.search.focus();
  }
  function close() {
    if (!panel) return;
    panel.style.display = 'none';
    if (fab) fab.style.display = 'flex';
  }
  function destroy() {
    document.removeEventListener('keydown', onKey, true);
    if (panel) panel.remove();
    if (fab) fab.remove();
    const s = document.getElementById(PANEL_ID + '-style');
    if (s) s.remove();
    delete window.XActionsCommandCenter;
  }

  build();

  console.log('%c⚡ XActions Command Center v' + VERSION, 'color:#1d9bf0;font-weight:bold;font-size:14px');
  console.log('%c' + CATALOG.length + ' tools loaded. Search, pick one, and press Run. Reopen anytime with the ⚡ button or Cmd/Ctrl+K.', 'color:#8899a6');

  window.XActionsCommandCenter = {
    open, close, destroy,
    tools: () => CATALOG.map((t) => ({ id: t.id, title: t.title, category: t.category, danger: t.danger })),
    run: (id, cfg) => runTool(id, cfg || null),
    version: VERSION
  };
})();
