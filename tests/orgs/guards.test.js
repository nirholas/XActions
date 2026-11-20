// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions - organization content checks, roles, audit chain and session encryption. Offline.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  applyDisclosure,
  findRecentEchoes,
  findSimilarPairs,
  hasDisclosure,
  normalizeText,
  similarity,
} from '../../src/orgs/guards.js';
import { can, canManageRole, assertCan } from '../../src/orgs/roles.js';
import { appendAudit, readAudit, verifyAudit } from '../../src/orgs/audit.js';
import { cleanJar, openSession, readSession, sealSession, writeSession } from '../../src/orgs/sessions.js';

const JAR = [
  { name: 'auth_token', value: 'a1', domain: '.x.com' },
  { name: 'ct0', value: 'c1', domain: '.x.com' },
  { name: 'twid', value: 'u%3D42', domain: '.x.com' },
];

describe('guards', () => {
  it('normalises case, links and punctuation away', () => {
    expect(normalizeText('Launch DAY!! https://acme.dev/x  — see you')).toBe('launch day see you');
  });

  it('scores texts that differ only by a link or punctuation as identical', () => {
    expect(similarity('Acme 2.0 is live https://a.dev/1', 'acme 2.0 is LIVE! https://a.dev/2')).toBe(1);
  });

  it('scores the same news in different words well under the threshold', () => {
    const a = 'Acme 2.0 is here. Builds are twice as fast.';
    const b = 'Devs: 2.0 ships a new CLI and incremental compiles. Migration guide in the docs.';
    expect(similarity(a, b)).toBeLessThan(0.3);
  });

  it('treats two texts with no words as indistinguishable', () => {
    expect(similarity('🚀', 'https://a.dev')).toBe(1);
    expect(similarity('🚀', 'words here')).toBe(0);
  });

  it('reports every similar pair with its score', () => {
    const pairs = findSimilarPairs([
      { handle: 'a', text: 'Big news today for everyone' },
      { handle: 'b', text: 'Big news today for everyone!' },
      { handle: 'c', text: 'Something else entirely, nothing shared' },
    ]);
    expect(pairs).toEqual([{ a: 'a', b: 'b', score: 1 }]);
  });

  it('flags a repeat of what another account published inside the window, not the same account', () => {
    const now = Date.parse('2026-11-19T12:00:00Z');
    const published = [
      { handle: 'acme', text: 'Maintenance tonight at 10pm UTC', publishedAt: '2026-11-18T12:00:00Z', postId: 'p_1' },
      { handle: 'acme', text: 'Old news from last month here', publishedAt: '2026-10-01T12:00:00Z', postId: 'p_0' },
    ];
    const items = [
      { handle: 'acmestatus', text: 'Maintenance tonight at 10pm UTC!' },
      { handle: 'acme', text: 'Maintenance tonight at 10pm UTC' },
      { handle: 'acmedev', text: 'Old news from last month here' },
    ];
    expect(findRecentEchoes(items, published, { now })).toEqual([
      { handle: 'acmestatus', echoes: 'acme', postId: 'p_1', score: 1 },
    ]);
  });

  it('matches a disclosure tag as a whole word, case-insensitively', () => {
    expect(hasDisclosure('love it #AD', '#ad')).toBe(true);
    expect(hasDisclosure('#ad, love it', '#ad')).toBe(true);
    expect(hasDisclosure('my #adventure', '#ad')).toBe(false);
    expect(hasDisclosure('##ad', '#ad')).toBe(false);
  });

  it('appends a missing disclosure once', () => {
    expect(applyDisclosure('Try this  ', '#ad')).toEqual({ text: 'Try this #ad', added: true });
    expect(applyDisclosure('Try this #ad', '#ad')).toEqual({ text: 'Try this #ad', added: false });
  });
});

describe('roles', () => {
  it('orders permissions owner > admin > editor > writer > viewer', () => {
    expect(can('writer', 'posts:draft')).toBe(true);
    expect(can('writer', 'posts:approve')).toBe(false);
    expect(can('editor', 'posts:publish')).toBe(true);
    expect(can('editor', 'accounts:manage')).toBe(false);
    expect(can('admin', 'org:settings')).toBe(false);
    expect(can('viewer', 'posts:read')).toBe(true);
    expect(can('nobody', 'posts:read')).toBe(false);
  });

  it('lets admins manage only roles below admin', () => {
    expect(canManageRole('admin', 'editor')).toBe(true);
    expect(canManageRole('admin', 'admin')).toBe(false);
    expect(canManageRole('owner', 'owner')).toBe(true);
    expect(canManageRole('editor', 'viewer')).toBe(false);
  });

  it('explains a refusal in terms of the role needed', () => {
    expect(() => assertCan({ name: 'sam', role: 'writer' }, 'posts:approve')).toThrow(/sam is a writer and cannot approve posts; that needs an editor/);
  });
});

describe('audit chain', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-audit-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('chains entries and verifies an untouched log', () => {
    const file = path.join(dir, 'audit.jsonl');
    appendAudit(file, { actor: 'nich', action: 'org.create' });
    appendAudit(file, { actor: 'sam', action: 'post.draft', details: { post: 'p_1' } });
    const entries = readAudit(file);
    expect(entries.map((e) => e.seq)).toEqual([1, 2]);
    expect(entries[1].prev).toBe(entries[0].hash);
    expect(verifyAudit(file)).toEqual({ ok: true, entries: 2 });
  });

  it('pinpoints an edited line', () => {
    const file = path.join(dir, 'audit.jsonl');
    for (const action of ['a', 'b', 'c']) appendAudit(file, { actor: 'nich', action });
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    const edited = JSON.parse(lines[1]);
    edited.actor = 'someone-else';
    lines[1] = JSON.stringify(edited);
    fs.writeFileSync(file, lines.join('\n') + '\n');
    expect(verifyAudit(file)).toMatchObject({ ok: false, brokenAt: 2 });
  });

  it('pinpoints a deleted line', () => {
    const file = path.join(dir, 'audit.jsonl');
    for (const action of ['a', 'b', 'c']) appendAudit(file, { actor: 'nich', action });
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    fs.writeFileSync(file, [lines[0], lines[2]].join('\n') + '\n');
    expect(verifyAudit(file)).toMatchObject({ ok: false, brokenAt: 2 });
  });
});

describe('sessions', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-sess-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('round-trips through encryption and refuses the wrong passphrase', () => {
    const sealed = sealSession(JAR, 'right');
    // `auth_token` has an underscore, which base64 never produces, so it
    // cannot turn up in the ciphertext by chance.
    expect(JSON.stringify(sealed)).not.toContain('auth_token');
    expect(openSession(sealed, 'right')).toEqual(JAR);
    expect(() => openSession(sealed, 'wrong')).toThrow(/not the passphrase/);
  });

  it('writes owner-only files, encrypted only when the key is set', () => {
    const plain = path.join(dir, 'plain.json');
    const sealed = path.join(dir, 'sealed.json');
    expect(writeSession(plain, JAR, { env: {} })).toEqual({ encrypted: false });
    expect(writeSession(sealed, JAR, { env: { XACTIONS_ORG_KEY: 'k' } })).toEqual({ encrypted: true });
    if (process.platform !== 'win32') expect(fs.statSync(sealed).mode & 0o777).toBe(0o600);
    expect(readSession(plain, { env: {} })).toEqual(JAR);
    expect(readSession(sealed, { env: { XACTIONS_ORG_KEY: 'k' } })).toEqual(JAR);
    expect(() => readSession(sealed, { env: {} })).toThrow(/is encrypted. Set XACTIONS_ORG_KEY/);
  });

  it('requires a logged-in jar with both auth_token and ct0, and drops other sites', () => {
    expect(() => cleanJar([{ name: 'ct0', value: 'c' }])).toThrow(/no auth_token/);
    expect(() => cleanJar([{ name: 'auth_token', value: 'a' }])).toThrow(/no ct0/);
    const kept = cleanJar([...JAR, { name: 'sid', value: 's', domain: '.example.com' }]);
    expect(kept.map((c) => c.name)).toEqual(['auth_token', 'ct0', 'twid']);
  });
});
