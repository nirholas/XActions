// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The part of every XActions userscript that is not the script itself: the
 * menu, the settings form, the confirmation before a write, and the wrong-page
 * warning. scripts/build-userscripts.mjs inlines this file into each
 * <id>.user.js with the `export` keywords removed, so it must stay
 * self-contained: no imports, and no globals beyond what the wrapper passes in.
 *
 * Every function takes the userscript manager API (`gm`) and the page window
 * (`win`) as arguments instead of reaching for GM_* globals, so the tests can
 * call the same code the browser runs.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** Option types the settings form can edit. Others are shown read-only. */
export const EDITABLE_TYPES = ['boolean', 'number', 'string', 'array', 'object', 'null'];

/** Names that switch a script into preview mode. */
export const DRY_RUN_OPTION_NAMES = ['dryRun', 'DRY_RUN'];

/**
 * Compile a page glob to a regular expression. `**` matches anything,
 * `*` matches one path segment.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      out += '.*';
      i++;
    } else if (ch === '*') {
      out += '[^/]+';
    } else {
      out += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
}

/**
 * Reduce a URL to scheme, host and path, with twitter.com spelled x.com and
 * no trailing slash, so it can be matched against a page glob.
 *
 * @param {string} href
 * @returns {string}
 */
export function normalizeUrl(href) {
  const url = new URL(href);
  let host = url.hostname.toLowerCase();
  if (host === 'twitter.com' || host.endsWith('.twitter.com')) host = host.replace(/twitter\.com$/, 'x.com');
  if (host === 'www.x.com' || host === 'mobile.x.com') host = 'x.com';
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
  return `https://${host}${path}`;
}

/**
 * True when the URL is one of the pages the tool expects.
 *
 * @param {string[]} pages - Globs from the manifest.
 * @param {string} href
 * @returns {boolean}
 */
export function pageMatches(pages, href) {
  const url = normalizeUrl(href);
  return pages.some((glob) => {
    if (globToRegExp(glob).test(url)) return true;
    // "https://x.com/**" should accept the bare root as well as "/".
    return glob.endsWith('/**') && globToRegExp(glob.slice(0, -3)).test(url);
  });
}

/**
 * A page glob as a person would type it: no scheme, `*` for the variable part.
 *
 * @param {string} glob
 * @returns {string}
 */
export function describePage(glob) {
  return glob.replace(/^https:\/\//, '').replace(/\/\*\*$/, ' (any page)');
}

/**
 * Menu caption for running a tool. Carries a warning when the current page is
 * not one the tool expects.
 *
 * @param {{title: string, page: string, pages: string[]}} tool
 * @param {string} href
 * @returns {string}
 */
export function runLabel(tool, href) {
  if (pageMatches(tool.pages, href)) return `▶ Run ${tool.title}`;
  return `⚠ Run ${tool.title} (wrong page: open ${describePage(tool.page)})`;
}

/**
 * Serialise saved settings. JSON has no Infinity, and many limits default to
 * it, so non-finite numbers are wrapped.
 *
 * @param {object} values
 * @returns {string}
 */
export function encodeConfig(values) {
  return JSON.stringify(values, (_key, value) =>
    typeof value === 'number' && !Number.isFinite(value) ? { $number: String(value) } : value,
  );
}

/**
 * Inverse of encodeConfig. Anything unreadable is treated as "no saved settings".
 *
 * @param {unknown} text
 * @returns {object}
 */
export function decodeConfig(text) {
  if (typeof text !== 'string' || text === '') return {};
  try {
    const parsed = JSON.parse(text, (_key, value) =>
      value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && typeof value.$number === 'string'
        ? Number(value.$number)
        : value,
    );
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Storage key for one tool's saved settings. */
export function configKey(id) {
  return `config:${id}`;
}

/**
 * Saved settings for a tool, as an object of option name to value.
 *
 * @param {{getValue: (key: string, fallback: unknown) => unknown}} gm
 * @param {string} id
 * @returns {object}
 */
export function loadConfig(gm, id) {
  return decodeConfig(gm.getValue(configKey(id), ''));
}

/**
 * Save settings for a tool. Only names the tool declares are kept.
 *
 * @param {{setValue: (key: string, value: unknown) => void}} gm
 * @param {{id: string, config: Array<{name: string}>}} tool
 * @param {object} values
 */
export function saveConfig(gm, tool, values) {
  const known = new Set(tool.config.map((o) => o.name));
  const kept = Object.fromEntries(Object.entries(values).filter(([name]) => known.has(name)));
  gm.setValue(configKey(tool.id), encodeConfig(kept));
}

/**
 * Apply saved settings to a script's own CONFIG object, in place. The build
 * wraps each script's settings literal in a call to this, so the defaults stay
 * in the script and only what the user changed is stored.
 *
 * @param {object} defaults - The script's CONFIG literal.
 * @param {object} saved - From loadConfig.
 * @param {Array<{name: string, type: string}>} schema - The tool's manifest config.
 * @returns {object} The same object, updated.
 */
export function applyConfig(defaults, saved, schema) {
  for (const option of schema) {
    if (!EDITABLE_TYPES.includes(option.type)) continue;
    if (!Object.prototype.hasOwnProperty.call(saved, option.name)) continue;
    defaults[option.name] = saved[option.name];
  }
  return defaults;
}

/**
 * True for a string array the form edits one item per line.
 *
 * @param {{type: string, default?: unknown}} option
 * @returns {boolean}
 */
export function isLineList(option) {
  return option.type === 'array' && Array.isArray(option.default) && option.default.every((v) => typeof v === 'string');
}

/**
 * Text shown in the form for an option's current value.
 *
 * @param {{type: string, default?: unknown}} option
 * @param {unknown} value
 * @returns {string|boolean}
 */
export function formatOptionValue(option, value) {
  if (option.type === 'boolean') return Boolean(value);
  if (value === null || value === undefined) return '';
  if (isLineList(option)) return value.join('\n');
  if (option.type === 'array' || option.type === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * Read a value back from the form, or throw with a message for the user.
 *
 * @param {{name: string, type: string, default?: unknown}} option
 * @param {string|boolean} input
 * @returns {unknown}
 */
export function parseOptionInput(option, input) {
  switch (option.type) {
    case 'boolean':
      return Boolean(input);
    case 'number': {
      const text = String(input).trim();
      const value = Number(text);
      if (text === '' || Number.isNaN(value)) throw new Error(`${option.name} must be a number (Infinity is allowed).`);
      return value;
    }
    case 'string':
      return String(input);
    case 'null': {
      const text = String(input);
      return text.trim() === '' ? null : text;
    }
    case 'array':
      if (isLineList(option)) {
        return String(input).split('\n').map((s) => s.trim()).filter(Boolean);
      }
    // falls through: other arrays are edited as JSON
    case 'object': {
      let value;
      try {
        value = JSON.parse(String(input));
      } catch {
        throw new Error(`${option.name} must be valid JSON.`);
      }
      const wantArray = option.type === 'array';
      if (wantArray !== Array.isArray(value) || value === null || typeof value !== 'object') {
        throw new Error(`${option.name} must be a JSON ${wantArray ? 'array' : 'object'}.`);
      }
      return value;
    }
    default:
      throw new Error(`${option.name} cannot be edited here.`);
  }
}

/**
 * The value an option has right now: saved, else the default.
 *
 * @param {{name: string, default?: unknown}} option
 * @param {object} saved
 * @returns {unknown}
 */
export function currentValue(option, saved) {
  return Object.prototype.hasOwnProperty.call(saved, option.name) ? saved[option.name] : option.default;
}

/**
 * Turn the settings form's raw inputs into the values to save. Only options
 * that differ from the script's default are kept, so a later release that
 * changes a default reaches users who never touched that option. An option
 * whose default is an expression (`Infinity`, say) starts empty in the form,
 * and left empty it keeps the script's value.
 *
 * @param {Array<{option: {name: string, type: string, default?: unknown}, input: string|boolean}>} entries
 * @returns {object}
 */
export function collectSettings(entries) {
  const values = {};
  for (const { option, input } of entries) {
    if (option.default === undefined && typeof input === 'string' && input.trim() === '') continue;
    const parsed = parseOptionInput(option, input);
    if (option.default !== undefined && encodeConfig({ v: parsed }) === encodeConfig({ v: option.default })) continue;
    values[option.name] = parsed;
  }
  return values;
}

/**
 * Whether the next run is a dry run, or null when the tool has no dry run.
 *
 * @param {{config: Array<{name: string, default?: unknown}>}} tool
 * @param {object} saved
 * @returns {boolean|null}
 */
export function effectiveDryRun(tool, saved) {
  const option = tool.config.find((o) => DRY_RUN_OPTION_NAMES.includes(o.name));
  if (!option) return null;
  return Boolean(currentValue(option, saved));
}

/**
 * Text of the dialog shown before a run, or null when no dialog is needed
 * (a read-only tool on the right page).
 *
 * @param {{title: string, writes: boolean, page: string, pages: string[], config: object[]}} tool
 * @param {object} saved
 * @param {string} href
 * @returns {string|null}
 */
export function confirmMessage(tool, saved, href) {
  const lines = [];
  const rightPage = pageMatches(tool.pages, href);
  if (!rightPage) {
    lines.push(`${tool.title} expects ${describePage(tool.page)}, and this is ${normalizeUrl(href).replace(/^https:\/\//, '')}.`);
  }
  if (tool.writes) {
    const dry = effectiveDryRun(tool, saved);
    lines.push(`${tool.title} acts on your account.`);
    if (dry === true) lines.push('Dry run is ON: it logs what it would do and changes nothing.');
    else if (dry === false) lines.push('Dry run is OFF: it will make real changes. Turn dry run on in its settings to preview first.');
    else lines.push('It has no dry run: it will make real changes.');
  }
  if (lines.length === 0) return null;
  lines.push('', rightPage ? 'Run it now?' : 'Run it anyway?');
  return lines.join('\n');
}

/**
 * Show a short notice in the corner of the page.
 *
 * @param {Window} win
 * @param {string} text
 * @param {number} [ms]
 */
export function showToast(win, text, ms = 7000) {
  const doc = win.document;
  const box = doc.createElement('div');
  box.setAttribute('role', 'status');
  box.textContent = text;
  Object.assign(box.style, {
    position: 'fixed', left: '16px', bottom: '16px', zIndex: '2147483647', maxWidth: '420px',
    padding: '12px 16px', borderRadius: '10px', background: '#0f1419', color: '#e7e9ea',
    font: '14px/1.4 system-ui, sans-serif', boxShadow: '0 4px 18px rgba(0,0,0,.35)', whiteSpace: 'pre-line',
  });
  doc.body.appendChild(box);
  win.setTimeout(() => box.remove(), ms);
}

/**
 * Build an element with styles and children.
 *
 * @param {Document} doc
 * @param {string} tag
 * @param {object} [style]
 * @param {Array<Node|string>} [children]
 * @returns {HTMLElement}
 */
function el(doc, tag, style = {}, children = []) {
  const node = doc.createElement(tag);
  Object.assign(node.style, style);
  for (const child of children) node.append(child);
  return node;
}

/**
 * An overlay dialog in a shadow root, so x.com's styles cannot reach it.
 * Built with DOM calls only: x.com enforces Trusted Types, which rejects
 * innerHTML.
 *
 * @param {Window} win
 * @param {string} heading
 * @returns {{body: HTMLElement, footer: HTMLElement, close: () => void}}
 */
function openDialog(win, heading) {
  const doc = win.document;
  const host = doc.createElement('div');
  host.setAttribute('data-xactions-dialog', '');
  const root = host.attachShadow({ mode: 'open' });
  const close = () => host.remove();
  const backdrop = el(doc, 'div', {
    position: 'fixed', inset: '0', zIndex: '2147483647', background: 'rgba(0,0,0,.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', font: '14px/1.4 system-ui, sans-serif',
  });
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
  const panel = el(doc, 'div', {
    background: '#15202b', color: '#e7e9ea', borderRadius: '14px', width: 'min(640px, 94vw)',
    maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,.5)',
  });
  const title = el(doc, 'div', { padding: '16px 20px', fontSize: '17px', fontWeight: '700', borderBottom: '1px solid #38444d' }, [heading]);
  const body = el(doc, 'div', { padding: '12px 20px', overflow: 'auto', flex: '1' });
  const footer = el(doc, 'div', { padding: '12px 20px', display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #38444d', flexWrap: 'wrap' });
  panel.append(title, body, footer);
  backdrop.append(panel);
  root.append(backdrop);
  doc.body.appendChild(host);
  doc.addEventListener('keydown', function onKey(event) {
    if (event.key === 'Escape') { close(); doc.removeEventListener('keydown', onKey); }
  });
  return { body, footer, close };
}

/**
 * A dialog button.
 *
 * @param {Document} doc
 * @param {string} text
 * @param {boolean} primary
 * @param {() => void} onClick
 * @returns {HTMLButtonElement}
 */
function button(doc, text, primary, onClick) {
  const node = el(doc, 'button', {
    padding: '8px 16px', borderRadius: '9999px', border: primary ? 'none' : '1px solid #536471', cursor: 'pointer',
    background: primary ? '#1d9bf0' : 'transparent', color: primary ? '#fff' : '#e7e9ea', fontWeight: '700', font: 'inherit',
  }, [text]);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

/**
 * Open the settings form for one tool. Saved values go through saveConfig, and
 * apply from the next run.
 *
 * @param {Window} win
 * @param {object} gm
 * @param {{id: string, title: string, config: Array<{name: string, type: string, default?: unknown, expression?: string, description?: string}>}} tool
 */
export function openSettings(win, gm, tool) {
  const doc = win.document;
  const saved = loadConfig(gm, tool.id);
  const dialog = openDialog(win, `${tool.title}: settings`);
  const fields = [];
  const error = el(doc, 'div', { color: '#f4212e', minHeight: '1.4em', marginTop: '8px' });

  if (tool.config.length === 0) {
    dialog.body.append(el(doc, 'p', {}, ['This script has no settings.']));
  }

  for (const option of tool.config) {
    const row = el(doc, 'label', { display: 'block', margin: '10px 0' });
    const name = el(doc, 'div', { fontWeight: '700', fontFamily: 'ui-monospace, monospace' }, [option.name]);
    row.append(name);
    if (option.description) row.append(el(doc, 'div', { color: '#8b98a5', fontSize: '13px' }, [option.description]));

    if (!EDITABLE_TYPES.includes(option.type)) {
      row.append(el(doc, 'code', { color: '#8b98a5' }, [`${option.expression ?? ''} (fixed in the script)`]));
      dialog.body.append(row);
      continue;
    }

    const value = formatOptionValue(option, currentValue(option, saved));
    let input;
    if (option.type === 'boolean') {
      input = doc.createElement('input');
      input.type = 'checkbox';
      input.checked = value;
    } else if (option.type === 'array' || option.type === 'object') {
      input = doc.createElement('textarea');
      input.rows = Math.min(10, Math.max(3, String(value).split('\n').length + 1));
      input.value = value;
      input.placeholder = isLineList(option) ? 'One per line' : 'JSON';
    } else {
      input = doc.createElement('input');
      input.type = 'text';
      input.value = value;
      if (option.type === 'number' && option.expression) input.placeholder = option.expression;
    }
    if (option.type !== 'boolean') {
      Object.assign(input.style, {
        width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '6px 8px', borderRadius: '6px',
        border: '1px solid #38444d', background: '#0f1419', color: '#e7e9ea', font: '13px ui-monospace, monospace',
      });
    }
    input.name = option.name;
    row.append(input);
    dialog.body.append(row);
    fields.push({ option, input });
  }
  dialog.body.append(error);

  dialog.footer.append(
    button(doc, 'Reset to defaults', false, () => {
      gm.setValue(configKey(tool.id), '');
      dialog.close();
      showToast(win, `${tool.title}: settings reset to the script's defaults.`);
    }),
    button(doc, 'Cancel', false, () => dialog.close()),
    button(doc, 'Save', true, () => {
      let values;
      try {
        values = collectSettings(fields.map(({ option, input }) => ({
          option,
          input: option.type === 'boolean' ? input.checked : input.value,
        })));
      } catch (problem) {
        error.textContent = problem.message;
        return;
      }
      saveConfig(gm, tool, values);
      dialog.close();
      showToast(win, `${tool.title}: settings saved. They apply the next time you run it.`);
    }),
  );
}

/**
 * Run one tool: confirm if needed, then call its body with saved settings.
 *
 * @param {Window} win
 * @param {object} gm
 * @param {{id: string, title: string, writes: boolean, needsCore: boolean, config: object[], run: Function}} tool
 * @param {{core?: Function, page?: Window, confirm?: (text: string) => boolean}} [options]
 *   core inlines src/automation/core.js; page is the page's window (unsafeWindow).
 * @returns {boolean} True when the tool was started.
 */
export function runTool(win, gm, tool, options = {}) {
  const saved = loadConfig(gm, tool.id);
  const message = confirmMessage(tool, saved, win.location.href);
  const ask = options.confirm || ((text) => win.confirm(text));
  if (message && !ask(message)) return false;
  // The script body gets the page's own window, so the console commands some
  // scripts publish (window.XActions.*) are reachable from DevTools.
  const page = options.page || win;
  try {
    if (tool.needsCore && options.core && !(page.XActions && page.XActions.Core)) options.core(page);
    tool.run(page, (defaults) => applyConfig(defaults, saved, tool.config));
  } catch (problem) {
    win.console.error(`XActions: ${tool.title} failed:`, problem);
    showToast(win, `${tool.title} failed: ${problem && problem.message}`);
    return false;
  }
  showToast(win, `${tool.title} started. Open DevTools (F12) > Console to follow its progress.`);
  return true;
}

/**
 * Register the menu for a single-tool userscript and keep the run caption in
 * step with the page. x.com is a single-page app, so the URL changes without a
 * reload; the caption is re-registered when it does.
 *
 * @param {Window} win
 * @param {object} gm - getValue, setValue, registerMenuCommand, unregisterMenuCommand.
 * @param {object} tool
 * @param {{core?: Function, page?: Window}} [options]
 * @returns {{refresh: () => void, ids: () => unknown[]}}
 */
export function installToolMenu(win, gm, tool, options = {}) {
  let ids = [];
  let lastHref = null;
  const refresh = () => {
    const href = win.location.href;
    if (href === lastHref) return;
    lastHref = href;
    for (const id of ids) gm.unregisterMenuCommand(id);
    ids = [gm.registerMenuCommand(runLabel(tool, href), () => runTool(win, gm, tool, options))];
    if (tool.config.length > 0) {
      ids.push(gm.registerMenuCommand(`⚙ Settings: ${tool.title}`, () => openSettings(win, gm, tool)));
    }
  };
  refresh();
  win.setInterval(refresh, 1000);
  return { refresh, ids: () => ids.slice() };
}

/**
 * The picker for the combined userscript: every tool, grouped by category,
 * each with Run and Settings buttons and a wrong-page note.
 *
 * @param {Window} win
 * @param {object} gm
 * @param {object[]} tools
 * @param {{core?: Function, page?: Window}} [options]
 */
export function openPicker(win, gm, tools, options = {}) {
  const doc = win.document;
  const dialog = openDialog(win, 'XActions tools');
  const filter = doc.createElement('input');
  filter.type = 'search';
  filter.placeholder = 'Filter tools';
  Object.assign(filter.style, {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '9999px', marginBottom: '8px',
    border: '1px solid #38444d', background: '#0f1419', color: '#e7e9ea', font: 'inherit',
  });
  dialog.body.append(filter);
  const href = win.location.href;
  const rows = [];
  const categories = [...new Set(tools.map((t) => t.category))];
  for (const category of categories) {
    const section = el(doc, 'section', { margin: '12px 0' }, [el(doc, 'h3', { margin: '8px 0', fontSize: '15px' }, [category])]);
    for (const tool of tools.filter((t) => t.category === category)) {
      const info = el(doc, 'div', { flex: '1', minWidth: '0' }, [
        el(doc, 'div', { fontWeight: '700' }, [tool.title + (tool.writes ? ' ✎' : '')]),
        el(doc, 'div', { color: '#8b98a5', fontSize: '13px' }, [tool.description]),
      ]);
      if (!pageMatches(tool.pages, href)) {
        info.append(el(doc, 'div', { color: '#ffd400', fontSize: '12px' }, [`⚠ Open ${describePage(tool.page)} first`]));
      }
      const actions = el(doc, 'div', { display: 'flex', gap: '6px', alignItems: 'center' });
      if (tool.config.length > 0) actions.append(button(doc, 'Settings', false, () => { dialog.close(); openSettings(win, gm, tool); }));
      actions.append(button(doc, 'Run', true, () => { if (runTool(win, gm, tool, options)) dialog.close(); }));
      const row = el(doc, 'div', { display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #253341' }, [info, actions]);
      row.dataset.search = `${tool.id} ${tool.title} ${tool.description} ${category}`.toLowerCase();
      rows.push({ row, section });
      section.append(row);
    }
    dialog.body.append(section);
  }
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    for (const { row } of rows) row.style.display = !q || row.dataset.search.includes(q) ? 'flex' : 'none';
  });
  dialog.footer.append(el(doc, 'span', { color: '#8b98a5', fontSize: '12px', marginRight: 'auto' }, ['✎ acts on your account']));
  dialog.footer.append(button(doc, 'Close', false, () => dialog.close()));
  filter.focus();
}

/**
 * Register the single menu entry of the combined userscript.
 *
 * @param {Window} win
 * @param {object} gm
 * @param {object[]} tools
 * @param {{core?: Function, page?: Window}} [options]
 * @returns {unknown} The menu command id.
 */
export function installPickerMenu(win, gm, tools, options = {}) {
  return gm.registerMenuCommand(`▶ XActions: open the tool picker (${tools.length} tools)`, () => openPicker(win, gm, tools, options));
}
