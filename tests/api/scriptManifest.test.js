// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * api/services/scriptManifest.js: public script ids resolve through
 * browser/index.json to the canonical file, so the download route and the
 * Puppeteer runner serve the same script a user would paste.
 *
 * @author nich (@nichxbt)
 */

import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeScript, findScript, resolveScriptFile } from '../../api/services/scriptManifest.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const at = (p) => join(ROOT, p);

describe('resolveScriptFile', () => {
  it('serves a src/<name> id from its canonical browser/ file', () => {
    expect(resolveScriptFile('src/unfollowEveryone')).toBe(at('browser/unfollowEveryone.js'));
  });

  it('serves an automation/<name> id from the canonical file that replaced it', () => {
    expect(resolveScriptFile('automation/autoLiker')).toBe(at('browser/autoLiker.js'));
    expect(resolveScriptFile('automation/core')).toBe(at('browser/core.js'));
  });

  it('follows an old browser/ name to the script that absorbed it', () => {
    expect(resolveScriptFile('src/videoDownloaderBrowser')).toBe(at('browser/videoDownloader.js'));
  });

  it('still serves the Node modules that are not console scripts from src/', () => {
    expect(resolveScriptFile('automation/rssMonitor')).toBe(at('src/automation/rssMonitor.js'));
  });

  it('refuses a name that escapes its tree', () => {
    expect(resolveScriptFile('src/../package')).toBeNull();
    expect(resolveScriptFile('automation/../../package')).toBeNull();
    expect(resolveScriptFile('other/unfollowEveryone')).toBeNull();
  });
});

describe('findScript and describeScript', () => {
  it('finds the manifest entry and describes it for the listing', () => {
    expect(findScript('src/unfollowEveryone')?.id).toBe('unfollowEveryone');
    expect(describeScript('src/unfollowEveryone')).toMatchObject({
      id: 'unfollowEveryone',
      category: 'cleanup',
      writes: true,
      file: 'browser/unfollowEveryone.js',
    });
  });

  it('returns null for an id with no manifest entry', () => {
    expect(findScript('automation/rssMonitor')).toBeNull();
    expect(describeScript('automation/rssMonitor')).toBeNull();
  });
});
