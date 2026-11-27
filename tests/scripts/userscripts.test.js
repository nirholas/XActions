// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The userscript build: metadata, never running on load, settings that
 * survive a save and reach the script, and the wrong-page warning.
 *
 * Generated files are loaded into jsdom with an in-memory implementation of
 * the four userscript manager calls the wrapper makes. The real-browser check
 * (Firefox with Violentmonkey) is described in docs/browser-scripts.md.
 *
 * @author nich (@nichxbt)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { buildUserscripts, updateInstallLists } from '../../scripts/build-userscripts.mjs';
import { parseMetadata, REQUIRED_KEYS, installUrl, grantsUsed, transformBody, CONFIG_HOOK } from '../../scripts/lib/userscript-build.mjs';
import {
  pageMatches, runLabel, encodeConfig, decodeConfig, loadConfig, saveConfig, applyConfig,
  collectSettings, parseOptionInput, confirmMessage, effectiveDryRun,
} from '../../scripts/lib/userscript-runtime.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'browser/index.json'), 'utf8'));
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const byId = new Map(manifest.scripts.map((s) => [s.id, s]));
const EXPECTED_GRANTS = ['GM_getValue', 'GM_registerMenuCommand', 'GM_setValue', 'GM_unregisterMenuCommand', 'unsafeWindow'];

let outDir;
const read = (id) => readFileSync(join(outDir, `${id}.user.js`), 'utf8');
const opened = [];

/**
 * Load a userscript into a fresh page with an in-memory userscript manager.
 */
function load(id, url, saved = {}) {
  const dom = new JSDOM('<!doctype html><html><body><main>x.com</main></body></html>', { url, runScripts: 'outside-only', pretendToBeVisual: true });
  opened.push(dom);
  const w = dom.window;
  const store = new Map(Object.entries(saved));
  const menu = new Map();
  let nextId = 1;
  const logs = [];
  const errors = [];
  w.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
  w.GM_setValue = (key, value) => store.set(key, value);
  w.GM_registerMenuCommand = (caption, onClick) => { const mid = nextId++; menu.set(mid, { caption, onClick }); return mid; };
  w.GM_unregisterMenuCommand = (mid) => menu.delete(mid);
  w.console.log = (...args) => logs.push(args.join(' '));
  w.console.error = (...args) => errors.push(args.join(' '));
  const bodyBefore = w.document.body.innerHTML;
  w.eval(read(id));
  const captions = () => [...menu.values()].map((m) => m.caption);
  const click = (prefix) => [...menu.values()].find((m) => m.caption.startsWith(prefix)).onClick();
  const dialog = () => w.document.querySelector('[data-xactions-dialog]')?.shadowRoot;
  return { w, store, menu, logs, errors, captions, click, dialog, bodyBefore };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), 'xactions-userscripts-'));
  buildUserscripts(outDir);
});

afterAll(() => {
  for (const dom of opened) dom.window.close();
  rmSync(outDir, { recursive: true, force: true });
});

describe('build output', () => {
  it('writes one file per manifest entry plus the combined one, all valid JavaScript', () => {
    const files = readdirSync(outDir).sort();
    expect(files).toEqual([...manifest.scripts.map((s) => `${s.id}.user.js`), 'xactions.user.js'].sort());
    for (const file of files) {
      expect(() => new vm.Script(readFileSync(join(outDir, file), 'utf8'), { filename: file })).not.toThrow();
    }
  });

  it('gives every file a complete metadata block with stable release URLs', () => {
    for (const file of readdirSync(outDir)) {
      const id = file.replace(/\.user\.js$/, '');
      const text = readFileSync(join(outDir, file), 'utf8');
      const meta = parseMetadata(text);
      for (const key of REQUIRED_KEYS) expect(meta[key], `${file} @${key}`).toBeDefined();
      expect(meta.name[0]).toMatch(/^XActions: /);
      expect(meta.namespace).toEqual(['https://github.com/nirholas/XActions']);
      expect(meta.version).toEqual([version]);
      expect(meta.description[0].length).toBeGreaterThan(10);
      expect(meta.match).toEqual(expect.arrayContaining(['https://x.com/*', 'https://twitter.com/*']));
      expect(meta['run-at']).toEqual(['document-idle']);
      expect(meta.updateURL).toEqual([installUrl(id)]);
      expect(meta.downloadURL).toEqual([installUrl(id)]);
      expect(installUrl(id)).toBe(`https://github.com/nirholas/XActions/releases/latest/download/${id}.user.js`);
      expect(meta.require).toBeUndefined();
    }
  });

  it('grants exactly the manager APIs the wrapper calls', () => {
    for (const file of readdirSync(outDir)) {
      const text = readFileSync(join(outDir, file), 'utf8');
      const meta = parseMetadata(text);
      expect(meta.grant, file).toEqual(EXPECTED_GRANTS);
      const code = text.slice(text.indexOf('// ==/UserScript=='));
      expect(grantsUsed(code), file).toEqual(EXPECTED_GRANTS);
    }
  });

  it('adds @match lines for the other x.com hosts a script names', () => {
    expect(parseMetadata(read('xProManager')).match).toContain('https://pro.x.com/*');
    expect(parseMetadata(read('adCampaignManager')).match).toContain('https://ads.x.com/*');
    expect(parseMetadata(read('unfollowback')).match).toEqual(['https://x.com/*', 'https://twitter.com/*']);
  });

  it('inlines core.js only for scripts that need it', () => {
    expect(byId.get('autoLiker').needsCore).toBe(true);
    expect(read('autoLiker')).toContain('window.XActions.Core = (() => {');
    expect(read('unfollowback')).not.toContain('window.XActions.Core = (() => {');
  });

  it('wraps only the settings literal, leaving the rest of the script as written', () => {
    const source = readFileSync(join(ROOT, 'browser/unfollowback.js'), 'utf8');
    const body = transformBody(source, 'browser/unfollowback.js');
    expect(body.replace(`${CONFIG_HOOK}(`, '').replace('});\n\n  // ── Selector', '};\n\n  // ── Selector')).toBe(source);
  });
});

describe('never runs on load', () => {
  it('only registers menu commands, for every userscript', () => {
    for (const file of readdirSync(outDir)) {
      const id = file.replace(/\.user\.js$/, '');
      const page = load(id, 'https://x.com/home');
      expect(page.logs, id).toEqual([]);
      expect(page.errors, id).toEqual([]);
      expect(page.w.document.body.innerHTML, id).toBe(page.bodyBefore);
      expect(page.w.XActions, id).toBeUndefined();
      if (id === 'xactions') {
        expect(page.captions()).toEqual([`▶ XActions: open the tool picker (${manifest.count} tools)`]);
      } else {
        const entry = byId.get(id);
        expect(page.captions()[0], id).toMatch(new RegExp(`^(▶|⚠) Run `));
        expect(page.captions().length, id).toBe(entry.config.length > 0 ? 2 : 1);
      }
      page.w.close();
    }
  });
});

describe('a write script', () => {
  it('asks first, says dry run is off, and does nothing when declined', () => {
    const page = load('unfollowback', 'https://x.com/nichxbt/following');
    let asked = null;
    page.w.confirm = (text) => { asked = text; return false; };
    page.click('▶ Run Unfollow Non-Followers');
    expect(asked).toContain('acts on your account');
    expect(asked).toContain('Dry run is OFF');
    expect(page.logs).toEqual([]);
  });
});

describe('settings', () => {
  it('round-trip through the form and reach the script body', async () => {
    const page = load('unfollowback', 'https://x.com/nichxbt/following');
    expect(page.captions()).toEqual(['▶ Run Unfollow Non-Followers', '⚙ Settings: Unfollow Non-Followers']);

    page.click('⚙ Settings');
    let root = page.dialog();
    const field = (name) => root.querySelector(`[name="${name}"]`);
    expect(field('dryRun').checked).toBe(false);
    expect(field('maxUnfollows').value).toBe('');
    expect(field('maxUnfollows').placeholder).toBe('Infinity');
    field('dryRun').checked = true;
    field('maxEmptyScrolls').value = '1';
    field('scrollDelay').value = '5';
    field('exportOnComplete').checked = false;
    field('whitelist').value = 'nichxbt\n  friend  \n';
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Save').click();
    expect(page.dialog()).toBeUndefined();

    expect(decodeConfig(page.store.get('config:unfollowback'))).toEqual({
      dryRun: true, maxEmptyScrolls: 1, scrollDelay: 5, exportOnComplete: false, whitelist: ['nichxbt', 'friend'],
    });

    page.click('⚙ Settings');
    root = page.dialog();
    expect(field('dryRun').checked).toBe(true);
    expect(field('whitelist').value).toBe('nichxbt\nfriend');
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Cancel').click();

    let asked = null;
    page.w.confirm = (text) => { asked = text; return true; };
    page.click('▶ Run');
    expect(asked).toContain('Dry run is ON');
    await wait(50);
    expect(page.logs.join('\n')).toContain('YES (preview only)');
  });

  it('rejects input that does not fit the option and keeps the form open', () => {
    const page = load('unfollowback', 'https://x.com/nichxbt/following');
    page.click('⚙ Settings');
    const root = page.dialog();
    root.querySelector('[name="minDelay"]').value = 'soon';
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Save').click();
    expect(page.dialog()).toBeDefined();
    expect(root.textContent).toContain('minDelay must be a number');
    expect(page.store.has('config:unfollowback')).toBe(false);
  });

  it('survive encoding, including Infinity, and only known names are kept', () => {
    const tool = { id: 't', config: [{ name: 'limit', type: 'number' }, { name: 'list', type: 'array', default: [] }] };
    const store = new Map();
    const gm = { getValue: (k, d) => (store.has(k) ? store.get(k) : d), setValue: (k, v) => store.set(k, v) };
    saveConfig(gm, tool, { limit: Infinity, list: ['a'], stray: 1 });
    expect(loadConfig(gm, 't')).toEqual({ limit: Infinity, list: ['a'] });
    expect(decodeConfig(encodeConfig({ n: -Infinity }))).toEqual({ n: -Infinity });
    expect(decodeConfig('not json')).toEqual({});
    expect(applyConfig({ limit: 5, fixed: /x/ }, { limit: 9, fixed: 'no' }, [...tool.config, { name: 'fixed', type: 'regexp' }]))
      .toEqual({ limit: 9, fixed: /x/ });
  });

  it('parse each option type, and drop values equal to the default', () => {
    const num = { name: 'n', type: 'number', default: 3 };
    expect(parseOptionInput(num, ' Infinity ')).toBe(Infinity);
    expect(() => parseOptionInput(num, '')).toThrow(/number/);
    expect(parseOptionInput({ name: 'o', type: 'object', default: {} }, '{"a":1}')).toEqual({ a: 1 });
    expect(() => parseOptionInput({ name: 'o', type: 'object', default: {} }, '[1]')).toThrow(/object/);
    expect(parseOptionInput({ name: 'a', type: 'array', default: [{ x: 1 }] }, '[{"x":2}]')).toEqual([{ x: 2 }]);
    expect(parseOptionInput({ name: 'u', type: 'null', default: null }, '  ')).toBeNull();
    expect(collectSettings([
      { option: num, input: '3' },
      { option: { name: 'max', type: 'number', expression: 'Infinity' }, input: '' },
      { option: { name: 'b', type: 'boolean', default: false }, input: true },
    ])).toEqual({ b: true });
  });
});

describe('wrong-page warning', () => {
  it('shows in the menu, follows navigation, and is repeated before a run', async () => {
    const page = load('unfollowback', 'https://x.com/home');
    expect(page.captions()[0]).toBe('⚠ Run Unfollow Non-Followers (wrong page: open x.com/*/following)');
    let asked = null;
    page.w.confirm = (text) => { asked = text; return false; };
    page.click('⚠ Run');
    expect(asked).toContain('expects x.com/*/following, and this is x.com/home');
    expect(asked).toContain('Run it anyway?');

    page.w.history.pushState({}, '', '/nichxbt/following');
    await wait(1200);
    expect(page.captions()[0]).toBe('▶ Run Unfollow Non-Followers');
  });

  it('matches twitter.com, trailing slashes and any-page globs', () => {
    expect(pageMatches(['https://x.com/*/following'], 'https://twitter.com/nichxbt/following/')).toBe(true);
    expect(pageMatches(['https://x.com/*/following'], 'https://x.com/nichxbt/followers')).toBe(false);
    expect(pageMatches(['https://x.com/**'], 'https://x.com/')).toBe(true);
    expect(pageMatches(['https://x.com/**'], 'https://pro.x.com/deck')).toBe(false);
    expect(runLabel({ title: 'T', page: 'https://x.com/**', pages: ['https://x.com/**'] }, 'https://x.com/i/bookmarks')).toBe('▶ Run T');
  });

  it('needs no dialog for a read-only script on the right page', () => {
    const tool = { title: 'R', writes: false, page: 'https://x.com/**', pages: ['https://x.com/**'], config: [] };
    expect(confirmMessage(tool, {}, 'https://x.com/home')).toBeNull();
    expect(effectiveDryRun(tool, {})).toBeNull();
  });
});

describe('core and the combined userscript', () => {
  it('installs core.js before a script that needs it', async () => {
    const page = load('autoLiker', 'https://x.com/home', { 'config:autoLiker': encodeConfig({ MAX_LIKES: 0, MAX_SCROLL_DEPTH: 0 }) });
    page.w.confirm = () => true;
    page.click('▶ Run');
    await wait(50);
    expect(page.w.XActions.Core).toBeDefined();
    expect(page.errors.join('\n')).not.toContain('Core module not loaded');
    expect(page.logs.join('\n')).toContain('Done! Liked 0 tweets');
  });

  it('puts every tool behind one picker', () => {
    const page = load('xactions', 'https://x.com/home');
    page.click('▶ XActions');
    const root = page.dialog();
    const rows = [...root.querySelectorAll('[data-search]')];
    expect(rows.length).toBe(manifest.count);
    const filter = root.querySelector('input[type="search"]');
    filter.value = 'unfollow non';
    filter.dispatchEvent(new page.w.Event('input'));
    const visible = rows.filter((r) => r.style.display !== 'none').map((r) => r.dataset.search.split(' ')[0]);
    expect(visible).toEqual(expect.arrayContaining(['unfollowback', 'unfollowwdfblog']));
    expect(visible.length).toBeLessThan(5);
  });
});

describe('install lists', () => {
  it('in docs/browser-scripts.md and dashboard/run.html are current', () => {
    expect(updateInstallLists(true)).toEqual([]);
  });
});
