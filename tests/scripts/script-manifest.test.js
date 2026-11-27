// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * browser/index.json: generated from the scripts, current, and true about them.
 *
 * @author nich (@nichxbt)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { buildManifest } from '../../scripts/build-script-manifest.mjs';
import { parsePages, parseHeader, humanizeId, describeScript } from '../../scripts/lib/script-manifest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'browser/index.json'), 'utf8'));
const byId = new Map(manifest.scripts.map((s) => [s.id, s]));

describe('browser/index.json', () => {
  it('matches a fresh build (run node scripts/build-script-manifest.mjs if not)', () => {
    expect(manifest).toEqual(buildManifest());
  });

  it('has one entry per id, and every path exists and parses as a script', () => {
    const ids = manifest.scripts.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(manifest.count).toBe(ids.length);
    for (const entry of manifest.scripts) {
      const file = join(ROOT, entry.path);
      expect(existsSync(file), entry.path).toBe(true);
      expect(() => new vm.Script(readFileSync(file, 'utf8'), { filename: entry.path })).not.toThrow();
    }
  });

  it('gives every entry the fields the userscript build and the docs read', () => {
    for (const entry of manifest.scripts) {
      expect(entry.title, entry.id).toMatch(/\S/);
      expect(entry.description, entry.id).toMatch(/[.!?]$/);
      expect(entry.category, entry.id).toMatch(/\S/);
      expect(entry.page, entry.id).toBe(entry.pages[0]);
      for (const page of entry.pages) expect(page, entry.id).toMatch(/^https:\/\/([a-z]+\.)?x\.com\//);
      expect(typeof entry.writes).toBe('boolean');
      expect(typeof entry.needsCore).toBe('boolean');
      if (entry.supportsDryRun) expect(typeof entry.dryRunDefault, entry.id).toBe('boolean');
      for (const option of entry.config) {
        expect(option.name).toMatch(/^\w+$/);
        expect('default' in option || 'expression' in option, `${entry.id}.${option.name}`).toBe(true);
      }
    }
  });

  it('includes the src/automation console scripts, and not the Node modules or core.js', () => {
    expect(byId.get('autoLiker').path).toBe('src/automation/autoLiker.js');
    expect(byId.has('core')).toBe(false);
    expect(byId.has('rssMonitor')).toBe(false);
    expect(byId.has('evergreenRecycler')).toBe(false);
  });

  it('reads the facts a user relies on from the scripts themselves', () => {
    const unfollowback = byId.get('unfollowback');
    expect(unfollowback).toMatchObject({
      path: 'browser/unfollowback.js',
      page: 'https://x.com/*/following',
      writes: true,
      supportsDryRun: true,
      dryRunDefault: false,
      needsCore: false,
      configName: 'CONFIG',
    });
    expect(unfollowback.config.find((o) => o.name === 'maxUnfollows')).toEqual({
      name: 'maxUnfollows', type: 'number', expression: 'Infinity', description: 'Cap total unfollows',
    });
    expect(unfollowback.config.find((o) => o.name === 'whitelist')).toMatchObject({ type: 'array', default: [] });

    expect(byId.get('autoLiker')).toMatchObject({ needsCore: true, writes: true, configName: 'OPTIONS' });
    expect(byId.get('detectUnfollowers')).toMatchObject({ writes: false, page: 'https://x.com/*/followers' });
    expect(byId.get('engagementAnalytics').writes).toBe(false);
    expect(byId.get('smartUnfollow')).toMatchObject({ supportsDryRun: true, dryRunDefault: false });
  });
});

describe('header parsing', () => {
  it('turns "Go to" steps into page globs', () => {
    expect(parsePages('// 1. Go to https://x.com/YOUR_USERNAME/followers\n')).toEqual(['https://x.com/*/followers']);
    expect(parsePages('// 1. Go to x.com/home or x.com/search\n')).toEqual(['https://x.com/home', 'https://x.com/search']);
    expect(parsePages('// 1. Go to x.com (any page)\n')).toEqual(['https://x.com/**']);
    expect(parsePages(' * 1. Go to: https://x.com/home or a specific tweet\n')).toEqual(['https://x.com/**']);
    expect(parsePages('// 1. Go to pro.x.com\n')).toEqual(['https://pro.x.com/**']);
    expect(parsePages('// 1. Go to https://twitter.com/i/bookmarks\n')).toEqual(['https://x.com/i/bookmarks']);
    expect(parsePages('(() => {})();\n')).toEqual(['https://x.com/**']);
  });

  it('prefers a banner title and @description, then falls back to the id', () => {
    const banner = '/**\n * ======\n * ==========\n * \u{1F6AB} Unfollow Everyone \u2014 Production Grade\n * ==========\n * @description Unfollow every account.\n */\n';
    expect(parseHeader(banner, 'unfollowEveryone')).toMatchObject({ title: 'Unfollow Everyone', description: 'Unfollow every account.' });
    expect(parseHeader('// Audit Followers on X - by nichxbt\n// Find fakes and bots\n', 'auditFollowers'))
      .toMatchObject({ title: 'Audit Followers', description: 'Find fakes and bots.' });
    expect(humanizeId('dmCalls')).toBe('DM Calls');
    expect(humanizeId('unfollowWDFBLog')).toBe('Unfollow WDFB Log');
  });

  it('describes a script with no settings object', () => {
    const entry = describeScript({ id: 'tiny', path: 'browser/tiny.js', source: '// 1. Go to x.com/home\n(() => { console.log(1); })();\n' });
    expect(entry).toMatchObject({ config: [], configName: null, supportsDryRun: false, dryRunDefault: null, writes: false });
  });
});
