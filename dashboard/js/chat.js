// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions Chat page: attach X accounts, posts and threads, then ask about
// them. Attachments resolve through POST /api/chat/context; answers stream
// from POST /api/chat as Server-Sent Events (sources, lane, delta, done,
// error) and cite posts by number. Conversations, with their resolved
// attachments, live in localStorage, so a follow-up question costs no X reads.
// by nichxbt

import { BYOK_PROVIDERS } from '/js/ask/lanes.js';

const $ = (id) => document.getElementById(id);
const els = {
  rail: $('rail'), railOpen: $('btn-rail-open'), railClose: $('btn-rail-close'),
  newBtn: $('btn-new'), searchBtn: $('btn-search'), search: $('rail-search'), searchInput: $('search-input'),
  list: $('convo-list'), railEmpty: $('rail-empty'), railLabel: $('rail-label'),
  laneSelect: $('lane-select'), laneLabel: $('lane-label'), laneModel: $('lane-model'), lanePanel: $('lane-panel'),
  laneOptions: $('lane-options'), laneKey: $('lane-key'), laneKeyInput: $('lane-key-input'),
  meter: $('meter'), meterText: $('meter-text'), meterFill: $('meter-fill'), exportBtn: $('btn-export'),
  stage: $('stage'), hero: $('hero'), heroTitle: $('hero-title'), heroSub: $('hero-sub'), thread: $('thread'),
  form: $('composer'), attachments: $('attachments'), input: $('question'), send: $('send'), hint: $('hint'),
  attachBtn: $('btn-attach'), quick: $('quick'),
  popover: $('attach-popover'), attachForm: $('attach-form'), attachInput: $('attach-input'), attachSubmit: $('attach-submit'), examples: $('examples'),
  toast: $('toast'),
};

const STORAGE = { conversations: 'xactions.chat.conversations', lane: 'xactions.chat.lane', keys: 'xactions.ask.keys', rail: 'xactions.chat.rail' };
const BUDGET = 24_000;
const MAX_ITEMS = 8;
const MAX_CONVERSATIONS = 40;
const EXAMPLES = ['@NASA', '@XDevelopers', '@nichxbt'];
const PROMPTS = [
  'Summarize what they have been posting about lately',
  'What numbers or stats have they shared?',
  'Which posts got the most engagement, and why?',
  'Who do they mention and work with most?',
  'Draft a post that tags them and cites their own numbers',
];
const API_BASES = location.hostname === 'localhost' && location.port !== '3001' ? ['/api', 'http://localhost:3001/api'] : ['/api'];

let conversations = load(STORAGE.conversations, []);
let current = null;
let streaming = null;
const pending = new Set();

// ---- Storage ------------------------------------------------------------------

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function persist() {
  if (!current) return;
  current.updatedAt = Date.now();
  conversations = [current, ...conversations.filter((c) => c.id !== current.id)].slice(0, MAX_CONVERSATIONS);
  // Attached posts make conversations heavy; when the browser's quota is
  // reached, the oldest conversations go first rather than the current one.
  while (!save(STORAGE.conversations, conversations) && conversations.length > 1) conversations.pop();
  renderRail();
}

// ---- Helpers ----------------------------------------------------------------

function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function isXUrl(url) { return typeof url === 'string' && /^https:\/\/(?:x|twitter)\.com\//.test(url); }
function formatK(n) { return n >= 1000 ? `${Math.round(n / 100) / 10}K`.replace('.0K', 'K') : String(n); }
function formatCount(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}K`;
  return n.toLocaleString();
}
function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add('is-visible');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => els.toast.classList.remove('is-visible'), 3200);
}
/** Whether pasted text is a link (or handle) that should become an attachment. */
function looksAttachable(text) {
  const t = text.trim();
  return /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}(?:\/status\/\d+)?\/?(?:[?#]\S*)?$/i.test(t);
}

// ---- Markdown + citations ----------------------------------------------------

marked.setOptions({ gfm: true, breaks: false });
function renderMarkdown(text, sources = []) {
  const html = DOMPurify.sanitize(marked.parse(text));
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('code, pre, a')) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (!/\[\d+(?:\s*,\s*\d+)*\]/.test(node.data)) continue;
    const frag = doc.createDocumentFragment();
    let last = 0;
    // Models write both [3] and [3, 4]; each number becomes its own link.
    for (const m of node.data.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
      frag.append(node.data.slice(last, m.index));
      for (const part of m[1].split(',')) {
        const n = Number(part.trim());
        const src = sources.find((s) => s.n === n);
        if (src && isXUrl(src.url)) {
          const a = doc.createElement('a');
          a.className = 'cite';
          a.href = src.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.title = src.title;
          a.textContent = String(n);
          frag.append(a);
        } else {
          frag.append(`[${n}]`);
        }
      }
      last = m.index + m[0].length;
    }
    frag.append(node.data.slice(last));
    node.replaceWith(frag);
  }
  for (const a of doc.querySelectorAll('a:not(.cite)')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  return doc.body.innerHTML;
}

/** The sources an answer actually cited, in the order first cited. */
function citedSources(text, sources) {
  const seen = new Set();
  for (const m of text.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) for (const p of m[1].split(',')) seen.add(Number(p.trim()));
  return [...seen].map((n) => sources.find((s) => s.n === n)).filter((s) => s && isXUrl(s.url)).slice(0, 12);
}

// ---- Conversations ------------------------------------------------------------

function newConversation() {
  return { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title: '', items: [], messages: [], updatedAt: Date.now() };
}

function titleFor(c) {
  if (c.title) return c.title;
  if (c.items.length) return c.items.map((i) => i.label.split(':')[0]).join(', ');
  return 'New chat';
}

function startNew() {
  if (streaming) streaming.abort();
  current = newConversation();
  render();
  els.input.focus();
}

function openConversation(id) {
  const found = conversations.find((c) => c.id === id);
  if (!found) return;
  if (streaming) streaming.abort();
  current = found;
  render();
  if (narrow.matches) setRail(false);
}

function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);
  save(STORAGE.conversations, conversations);
  if (current?.id === id) startNew();
  else renderRail();
}

// ---- Rendering ------------------------------------------------------------------

function render() {
  renderRail();
  renderAttachments();
  renderThread();
  renderQuick();
  renderMeter();
  updateSend();
}

function renderRail() {
  const q = els.searchInput.value.trim().toLowerCase();
  const shown = conversations.filter((c) => {
    if (!q) return true;
    const hay = [titleFor(c), ...c.items.map((i) => i.label), ...c.messages.map((m) => m.content)].join(' ').toLowerCase();
    return hay.includes(q);
  });
  els.list.innerHTML = shown.map((c) => `
    <div class="convo${current?.id === c.id ? ' is-active' : ''}">
      <button type="button" class="convo-open" data-id="${escapeHtml(c.id)}">
        <span class="convo-t">${escapeHtml(titleFor(c))}</span>
        <span class="convo-s">${escapeHtml(`${c.items.length} attached · ${ago(c.updatedAt)}`)}</span>
      </button>
      <button type="button" class="convo-del" data-del="${escapeHtml(c.id)}" aria-label="Delete conversation">×</button>
    </div>`).join('');
  els.railEmpty.hidden = shown.length > 0;
  els.railEmpty.textContent = q ? 'No matches.' : 'No conversations yet.';
  els.railLabel.hidden = shown.length === 0;
}

function attachmentIcon(item) {
  const avatar = item.profile?.avatar;
  if (avatar && /^https:\/\/pbs\.twimg\.com\//.test(avatar)) return `<img src="${escapeHtml(avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  if (item.kind === 'account') return escapeHtml((item.profile?.username || '?')[0].toUpperCase());
  return item.kind === 'thread' ? '🧵' : '✎';
}

function renderAttachments() {
  const items = current.items.map((item) => {
    const sub = item.kind === 'account'
      ? `${formatCount(item.profile?.followers || 0)} followers · ${item.posts.length} posts`
      : `${item.posts.length} post${item.posts.length === 1 ? '' : 's'}${item.truncated ? ' · partial' : ''}`;
    const title = isXUrl(item.url)
      ? `<a class="att-t" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</a>`
      : `<span class="att-t">${escapeHtml(item.label)}</span>`;
    return `<span class="att"><span class="att-ico">${attachmentIcon(item)}</span><span class="att-body">${title}<span class="att-s">${escapeHtml(sub)} · ${formatK(item.tokens || 0)} tokens</span></span><button type="button" class="att-x" data-remove="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.label)}">×</button></span>`;
  });
  for (const label of pending) {
    items.push(`<span class="att is-loading"><span class="att-ico"></span><span class="att-body"><span class="att-t">Reading ${escapeHtml(label)}…</span><span class="att-s">from x.com</span></span></span>`);
  }
  els.attachments.innerHTML = items.join('');
}

function renderQuick() {
  const hasItems = current.items.length > 0;
  const empty = current.messages.length === 0;
  els.hero.classList.toggle('is-hidden', !empty);
  els.thread.classList.toggle('is-visible', !empty);
  if (!empty) { els.quick.innerHTML = ''; return; }
  if (hasItems) {
    els.heroTitle.textContent = `Ask about ${current.items.map((i) => (i.kind === 'account' ? i.label : i.kind)).join(', ')}`;
    els.heroSub.textContent = 'Pick a starting point or write your own question. Attach more accounts or posts to compare them.';
    els.quick.innerHTML = PROMPTS.map((p) => `<button type="button" class="quick-btn" data-prompt="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('');
  } else {
    els.heroTitle.textContent = 'What do you want to know about an account?';
    els.heroSub.textContent = 'Attach an X account, a post or a thread, then ask. Answers cite the posts they come from, with links you can click.';
    els.quick.innerHTML = `
      <button type="button" class="quick-btn" data-open-attach="account"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Attach an account</button>
      <button type="button" class="quick-btn" data-open-attach="post"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Paste a post link</button>
      <button type="button" class="quick-btn" data-example="@NASA"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>Try it with @NASA</button>`;
  }
}

function renderMeter() {
  const used = current.items.reduce((sum, i) => sum + (i.tokens || 0), 0);
  els.meterText.textContent = `${formatK(used)} / ${formatK(BUDGET)}`;
  els.meterFill.style.width = `${Math.min(100, (used / BUDGET) * 100)}%`;
  els.meter.classList.toggle('is-warn', used > BUDGET * 0.8 && used <= BUDGET);
  els.meter.classList.toggle('is-over', used > BUDGET);
  els.meter.title = used > BUDGET
    ? 'Over budget: the oldest posts of the largest attachment are left out of each question.'
    : 'Estimated tokens of attached context, against the budget one question can carry';
  els.exportBtn.disabled = current.messages.length === 0;
}

function renderThread() {
  els.thread.innerHTML = '';
  for (const message of current.messages) {
    if (message.role === 'user') appendUser(message.content);
    else paintAssistant(appendAssistantShell(), message);
  }
  els.stage.scrollTop = els.stage.scrollHeight;
}

function appendUser(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-user';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  el.append(bubble);
  els.thread.append(el);
}

function appendAssistantShell() {
  const el = document.createElement('div');
  el.className = 'msg msg-assistant';
  el.innerHTML = '<div class="avatar" aria-hidden="true">⚡</div><div class="answer"></div>';
  els.thread.append(el);
  return el.querySelector('.answer');
}

function paintAssistant(el, message, { live = false } = {}) {
  if (message.error) {
    el.innerHTML = `<div class="error-card"><strong>No answer this time</strong>${escapeHtml(message.error)}</div>`;
    return;
  }
  if (!message.content) {
    el.innerHTML = '<span class="thinking" aria-label="Thinking"><i></i><i></i><i></i></span>';
    return;
  }
  const cited = live ? [] : citedSources(message.content, message.sources || []);
  const chips = cited.map((s) => `<a class="source" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(s.title)}"><span class="source-n">${s.n}</span><span class="source-t">${escapeHtml(s.title)}</span></a>`).join('');
  const meta = live ? '' : `
    <div class="meta">
      <span>${escapeHtml(message.model ? `${message.lane} · ${message.model}` : message.lane || '')}</span>
      <span class="meta-actions">
        <button type="button" class="meta-btn" data-copy>Copy</button>
        <button type="button" class="meta-btn" data-retry>Retry</button>
      </span>
    </div>`;
  const notice = !live && message.dropped ? `<p class="notice">${message.dropped} older posts were left out to fit the context budget.</p>` : '';
  el.innerHTML = `${renderMarkdown(message.content, message.sources || [])}${live ? '<span class="cursor" aria-hidden="true"></span>' : ''}${chips ? `<div class="sources">${chips}</div>` : ''}${notice}${meta}`;
  el.dataset.text = message.content;
}

function updateSend() {
  if (streaming) return;
  const ready = Boolean(els.input.value.trim()) && current.items.length > 0 && pending.size === 0;
  els.send.disabled = !ready;
  els.hint.textContent = current.items.length
    ? `${current.items.length} attached · Enter sends, Shift+Enter adds a line`
    : 'Attach an account or post to ask about it';
}

function setStreaming(on) {
  els.send.classList.toggle('is-stop', on);
  els.send.setAttribute('aria-label', on ? 'Stop' : 'Send');
  els.send.innerHTML = on
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
  if (on) els.send.disabled = false;
  else updateSend();
}

// ---- API ------------------------------------------------------------------------

async function postJson(path, body, signal) {
  let lastError = null;
  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
      const type = res.headers.get('content-type') || '';
      if (!type.includes('json') && !type.includes('event-stream')) { lastError = new Error(`HTTP ${res.status}`); continue; }
      return res;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw Object.assign(new Error('The chat API is not reachable from this page. Run it with `node api/server.js`, or use xactions.app/chat.'), { cause: lastError });
}

async function attach(raw) {
  const input = String(raw || '').trim();
  if (!input) return;
  if (current.items.length + pending.size >= MAX_ITEMS) { showToast(`Up to ${MAX_ITEMS} attachments per conversation.`); return; }
  const label = input.length > 40 ? `${input.slice(0, 39)}…` : input;
  pending.add(label);
  renderAttachments();
  updateSend();
  try {
    const res = await postJson('/chat/context', { input });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    if (current.items.some((i) => i.id === data.id)) {
      showToast(`${data.label.split(':')[0]} is already attached.`);
    } else {
      current.items.push(data);
      if (!data.posts.length) showToast(`${data.label} has no public posts X would show without a login.`);
    }
    persist();
  } catch (error) {
    showToast(error.message);
  } finally {
    pending.delete(label);
    render();
  }
}

function selectedByok() {
  const lane = localStorage.getItem(STORAGE.lane) || 'auto';
  if (lane === 'auto') return undefined;
  const key = load(STORAGE.keys, {})[lane];
  return key ? { provider: lane, apiKey: key } : undefined;
}

async function submit(question) {
  const q = question.trim();
  if (!q || streaming || !current.items.length || pending.size) return;
  closePanels();
  if (!current.title) current.title = q.length > 60 ? `${q.slice(0, 59)}…` : q;
  const history = current.messages.filter((m) => !m.error && m.content).map((m) => ({ role: m.role, content: m.content }));
  current.messages.push({ role: 'user', content: q });
  const message = { role: 'assistant', content: '', sources: [], lane: '', model: '' };
  current.messages.push(message);
  els.input.value = '';
  autosize();
  renderQuick();
  appendUser(q);
  const el = appendAssistantShell();
  paintAssistant(el, message);
  els.stage.scrollTop = els.stage.scrollHeight;

  const controller = new AbortController();
  streaming = controller;
  setStreaming(true);
  let frame = 0;
  const repaint = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      paintAssistant(el, message, { live: true });
      const nearBottom = els.stage.scrollHeight - els.stage.scrollTop - els.stage.clientHeight < 160;
      if (nearBottom) els.stage.scrollTop = els.stage.scrollHeight;
    });
  };

  try {
    const res = await postJson('/chat', { question: q, history, items: current.items, byok: selectedByok() }, controller.signal);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const line = buffer.slice(0, idx).split('\n').find((l) => l.startsWith('data:'));
        buffer = buffer.slice(idx + 2);
        if (!line) continue;
        const event = JSON.parse(line.slice(5));
        if (event.type === 'sources') { message.sources = event.sources; message.dropped = event.dropped || 0; }
        else if (event.type === 'lane') { message.lane = event.lane; showLane(event.lane); }
        else if (event.type === 'delta') { message.content += event.text; repaint(); }
        else if (event.type === 'done') { message.lane = event.lane; message.model = event.model; showLane(event.lane, event.model); }
        else if (event.type === 'error') throw new Error(event.message);
      }
    }
    if (!message.content) throw new Error('The model returned an empty answer. Try again.');
  } catch (error) {
    if (controller.signal.aborted) {
      if (!message.content) message.error = 'Stopped.';
    } else {
      message.error = /every LLM lane failed/.test(error.message)
        ? 'Every free model is busy right now. Try again in a minute, or pick a provider and use your own key.'
        : error.message;
    }
  } finally {
    cancelAnimationFrame(frame);
    streaming = null;
    setStreaming(false);
    paintAssistant(el, message);
    persist();
    renderMeter();
  }
}

function showLane(lane, model) {
  const choice = localStorage.getItem(STORAGE.lane) || 'auto';
  els.laneLabel.textContent = choice === 'auto' ? 'Auto' : BYOK_PROVIDERS[choice]?.label || 'Auto';
  els.laneModel.textContent = model ? `: ${model}` : lane ? `: ${lane}` : '';
  els.laneSelect.title = model ? `Answered by ${lane} (${model}). Click to choose which model answers.` : 'Choose which model answers';
}

function exportMarkdown() {
  const lines = [`# ${titleFor(current)}`, '', `Attached: ${current.items.map((i) => (isXUrl(i.url) ? `[${i.label}](${i.url})` : i.label)).join(', ')}`, ''];
  for (const m of current.messages) {
    if (m.role === 'user') lines.push(`## ${m.content}`, '');
    else if (m.content) {
      const cited = citedSources(m.content, m.sources || []);
      lines.push(m.content, '');
      if (cited.length) lines.push(...cited.map((s) => `[${s.n}]: ${s.url}`), '');
    }
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `xactions-chat-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---- Panels -------------------------------------------------------------------------

function renderLanes() {
  const lane = localStorage.getItem(STORAGE.lane) || 'auto';
  const keys = load(STORAGE.keys, {});
  const options = [{ id: 'auto', label: 'Auto', sub: 'Free models, no key needed' }].concat(
    Object.entries(BYOK_PROVIDERS).map(([id, p]) => ({ id, label: p.label, sub: keys[id] ? `Your key · ${p.model}` : `Bring your own key · ${p.model}` }))
  );
  els.laneOptions.innerHTML = options.map((o) => `<button type="button" class="lane-option" role="option" aria-checked="${o.id === lane}" data-lane="${o.id}"><span class="check">${o.id === lane ? '✓' : ''}</span><span><span>${escapeHtml(o.label)}</span><span class="sub">${escapeHtml(o.sub)}</span></span></button>`).join('');
  els.laneKey.classList.toggle('is-open', lane !== 'auto');
  els.laneKeyInput.value = lane === 'auto' ? '' : keys[lane] || '';
  els.laneKeyInput.placeholder = lane === 'auto' ? 'API key' : `${BYOK_PROVIDERS[lane].label} API key`;
  showLane();
}

function closePanels() {
  els.lanePanel.classList.remove('is-open');
  els.laneSelect.setAttribute('aria-expanded', 'false');
  els.popover.classList.remove('is-open');
  els.attachBtn.setAttribute('aria-expanded', 'false');
}

function openAttach(kind) {
  closePanels();
  els.popover.classList.add('is-open');
  els.attachBtn.setAttribute('aria-expanded', 'true');
  els.attachInput.placeholder = kind === 'post' ? 'https://x.com/user/status/…' : kind === 'account' ? '@handle or profile link' : '@handle, profile link or post link';
  els.attachInput.focus();
}

const narrow = window.matchMedia('(max-width: 1100px)');

/** Show or hide the conversation rail. Only a choice made on a wide screen is remembered. */
function setRail(open, { remember = !narrow.matches } = {}) {
  els.rail.classList.toggle('is-collapsed', !open);
  els.railOpen.hidden = open;
  if (remember) save(STORAGE.rail, open);
}

function autosize() {
  els.input.style.height = 'auto';
  els.input.style.height = `${Math.min(els.input.scrollHeight, 200)}px`;
}

// ---- Wiring ---------------------------------------------------------------------------

els.examples.innerHTML = EXAMPLES.map((e) => `<button type="button" class="example" data-example="${escapeHtml(e)}">${escapeHtml(e)}</button>`).join('');

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (streaming) { streaming.abort(); return; }
  submit(els.input.value);
});
els.input.addEventListener('input', () => { autosize(); updateSend(); });
els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); els.form.requestSubmit(); }
});
// Pasting an x.com link attaches it instead of typing it into the question.
els.input.addEventListener('paste', (e) => {
  const text = e.clipboardData?.getData('text') || '';
  if (!looksAttachable(text)) return;
  e.preventDefault();
  attach(text);
});
els.form.addEventListener('dragover', (e) => { e.preventDefault(); els.form.classList.add('is-drop'); });
els.form.addEventListener('dragleave', () => els.form.classList.remove('is-drop'));
els.form.addEventListener('drop', (e) => {
  els.form.classList.remove('is-drop');
  const text = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text') || '';
  if (looksAttachable(text)) { e.preventDefault(); attach(text); }
});

els.attachments.addEventListener('click', (e) => {
  const id = e.target.closest('[data-remove]')?.dataset.remove;
  if (!id) return;
  current.items = current.items.filter((i) => i.id !== id);
  persist();
  render();
});

els.quick.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.prompt) submit(btn.dataset.prompt);
  else if (btn.dataset.openAttach) openAttach(btn.dataset.openAttach);
  else if (btn.dataset.example) attach(btn.dataset.example);
});

els.attachBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (els.popover.classList.contains('is-open')) closePanels();
  else openAttach();
});
els.attachForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = els.attachInput.value;
  els.attachInput.value = '';
  closePanels();
  attach(value);
  els.input.focus();
});
els.examples.addEventListener('click', (e) => {
  const value = e.target.closest('[data-example]')?.dataset.example;
  if (!value) return;
  closePanels();
  attach(value);
});

els.thread.addEventListener('click', async (e) => {
  const answer = e.target.closest('.answer');
  if (e.target.closest('[data-copy]') && answer) {
    try { await navigator.clipboard.writeText(answer.dataset.text || ''); showToast('Copied'); } catch { showToast('Copy failed'); }
  }
  if (e.target.closest('[data-retry]') && !streaming) {
    const idx = current.messages.lastIndexOf(current.messages.findLast((m) => m.role === 'user'));
    if (idx === -1) return;
    const question = current.messages[idx].content;
    current.messages = current.messages.slice(0, idx);
    renderThread();
    submit(question);
  }
});

els.laneSelect.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = !els.lanePanel.classList.contains('is-open');
  closePanels();
  if (open) { renderLanes(); els.lanePanel.classList.add('is-open'); els.laneSelect.setAttribute('aria-expanded', 'true'); }
});
els.laneOptions.addEventListener('click', (e) => {
  const lane = e.target.closest('[data-lane]')?.dataset.lane;
  if (!lane) return;
  localStorage.setItem(STORAGE.lane, lane);
  renderLanes();
  if (lane !== 'auto') els.laneKeyInput.focus();
});
els.laneKeyInput.addEventListener('input', () => {
  const lane = localStorage.getItem(STORAGE.lane) || 'auto';
  if (lane === 'auto') return;
  const keys = load(STORAGE.keys, {});
  keys[lane] = els.laneKeyInput.value.trim();
  save(STORAGE.keys, keys);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.panel, .popover, #lane-select, #btn-attach')) closePanels();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (streaming) streaming.abort(); closePanels(); }
  if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); els.input.focus(); }
});

els.newBtn.addEventListener('click', startNew);
els.searchBtn.addEventListener('click', () => {
  const open = !els.search.classList.contains('is-open');
  els.search.classList.toggle('is-open', open);
  els.searchBtn.setAttribute('aria-expanded', String(open));
  if (open) els.searchInput.focus();
  else { els.searchInput.value = ''; renderRail(); }
});
els.searchInput.addEventListener('input', renderRail);
els.list.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]')?.dataset.del;
  if (del) { deleteConversation(del); return; }
  const id = e.target.closest('[data-id]')?.dataset.id;
  if (id) openConversation(id);
});
els.railClose.addEventListener('click', () => setRail(false));
// On a narrow screen the rail floats over the chat: a tap outside closes it,
// and crossing into narrow from wide collapses it.
document.querySelector('.pane').addEventListener('click', (e) => {
  if (narrow.matches && !els.rail.classList.contains('is-collapsed') && !e.target.closest('#btn-rail-open')) setRail(false);
});
narrow.addEventListener('change', () => setRail(narrow.matches ? false : load(STORAGE.rail, true), { remember: false }));
els.railOpen.addEventListener('click', () => setRail(true));
els.exportBtn.addEventListener('click', exportMarkdown);

// ---- Boot -------------------------------------------------------------------------------

setRail(narrow.matches ? false : load(STORAGE.rail, true), { remember: false });
current = newConversation();
renderLanes();
render();

// Deep links: /chat?attach=@base,https://x.com/...&q=question
const params = new URLSearchParams(location.search);
const toAttach = (params.get('attach') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, MAX_ITEMS);
if (toAttach.length) {
  Promise.all(toAttach.map(attach)).then(() => {
    const q = params.get('q');
    if (q && current.items.length) submit(q);
    else if (q) { els.input.value = q; autosize(); updateSend(); }
  });
} else if (params.get('q')) {
  els.input.value = params.get('q');
  autosize();
  updateSend();
}
els.input.focus();
