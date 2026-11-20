// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions - organizations end to end: members, accounts, drafts, approval, publish, stats.
// Offline: XACTIONS_HOME is a temp directory and the X client is a recording double
// passed through the same `createClient` seam the CLI uses.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  addAccount,
  approvePost,
  createOrg,
  createPost,
  editPost,
  getPost,
  listOrgs,
  orgCalendar,
  orgPaths,
  orgStats,
  publishDue,
  rejectPost,
  removeAccount,
  removeMember,
  resolveActor,
  setMember,
  updateSettings,
  loadOrg,
  verifyAudit,
} from '../../src/orgs/index.js';
import { remaining } from '../../src/mcp/action-caps.js';

const CLI = fileURLToPath(new URL('../../src/cli/index.js', import.meta.url));

const jar = (id) => [
  { name: 'auth_token', value: `token-${id}` },
  { name: 'ct0', value: `csrf-${id}` },
  { name: 'twid', value: `u%3D${id}` },
];

/**
 * A client double that logs in as `loginAs` and records every write.
 * `sendTweet` returns ids t1, t2, ... unless told to omit them.
 */
function recorder({ identities = {}, omitIdFor = [], failFor = [] } = {}) {
  const calls = [];
  let n = 0;
  const createClient = async (cookies, handle) => ({
    async me() {
      return { id: `id-${handle}`, username: identities[handle] ?? handle };
    },
    async sendTweet(text) {
      calls.push({ handle, op: 'post', text });
      if (failFor.includes(handle)) throw new Error('HTTP 403: suspended');
      n++;
      return omitIdFor.includes(handle) ? { text } : { id: `t${n}`, text };
    },
    async retweet(id) {
      calls.push({ handle, op: 'repost', id });
    },
  });
  return { calls, createClient };
}

describe('organizations', () => {
  let home;
  let previous;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-orgs-'));
    previous = { home: process.env.XACTIONS_HOME, key: process.env.XACTIONS_ORG_KEY, member: process.env.XACTIONS_ORG_MEMBER };
    process.env.XACTIONS_HOME = home;
    delete process.env.XACTIONS_ORG_KEY;
    delete process.env.XACTIONS_ORG_MEMBER;

    createOrg({ slug: 'acme', name: 'Acme', owner: 'nich' });
    setMember('acme', 'nich', { name: 'sam', role: 'writer' });
    setMember('acme', 'nich', { name: 'rae', role: 'editor' });
    for (const [handle, label] of [['acme', 'main'], ['acmedev', 'dev'], ['acmestatus', 'status']]) {
      addAccount('acme', 'nich', { handle, label, cookies: jar(handle) });
    }
    addAccount('acme', 'nich', { handle: 'creatorjo', kind: 'affiliate', cookies: jar('jo') });
  });

  afterEach(() => {
    for (const [key, value] of [['XACTIONS_HOME', previous.home], ['XACTIONS_ORG_KEY', previous.key], ['XACTIONS_ORG_MEMBER', previous.member]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(home, { recursive: true, force: true });
  });

  describe('members and accounts', () => {
    it('resolves the acting member from --as, the environment, or a sole member', () => {
      const org = loadOrg('acme');
      expect(resolveActor(org, 'RAE').name).toBe('rae');
      expect(resolveActor(org, undefined, { XACTIONS_ORG_MEMBER: 'sam' }).name).toBe('sam');
      expect(() => resolveActor(org, undefined, {})).toThrow(/has 3 members; say who is acting/);
      expect(() => resolveActor(org, 'mallory')).toThrow(/not a member/);
      createOrg({ slug: 'solo', owner: 'kim' });
      expect(resolveActor(loadOrg('solo'), undefined, {}).name).toBe('kim');
    });

    it('keeps at least one owner and stops admins promoting to admin', () => {
      expect(() => setMember('acme', 'nich', { name: 'nich', role: 'editor' })).toThrow(/only owner/);
      expect(() => removeMember('acme', 'nich', 'nich')).toThrow(/only owner/);
      setMember('acme', 'nich', { name: 'ada', role: 'admin' });
      expect(() => setMember('acme', 'ada', { name: 'sam', role: 'admin' })).toThrow(/only manage members below admin/);
      expect(() => removeMember('acme', 'ada', 'nich')).toThrow(/cannot remove nich/);
      expect(setMember('acme', 'ada', { name: 'sam', role: 'editor' }).role).toBe('editor');
    });

    it('lets only admins and owners connect accounts', () => {
      expect(() => addAccount('acme', 'rae', { handle: 'acmeeu', cookies: jar('eu') })).toThrow(/cannot connect or remove accounts/);
      expect(fs.existsSync(orgPaths('acme').session('acmeeu'))).toBe(false);
    });

    it('limits settings to owners and validates them', () => {
      expect(() => updateSettings('acme', 'rae', { twoPersonApproval: true })).toThrow(/cannot change organization settings/);
      expect(() => updateSettings('acme', 'nich', { similarityThreshold: 0.2 })).toThrow(/between 0.5 and 1/);
      expect(updateSettings('acme', 'nich', { disclosureTag: '#sponsored' }).disclosureTag).toBe('#sponsored');
    });

    it('lists organizations with their counts', () => {
      expect(listOrgs()).toEqual([{ slug: 'acme', name: 'Acme', accounts: 4, members: 3 }]);
    });
  });

  describe('drafting', () => {
    it('refuses variants that are duplicates and points at --repost', () => {
      expect(() =>
        createPost('acme', 'sam', {
          primary: { handle: 'acme', text: 'Acme 2.0 is live! https://acme.dev/a' },
          variants: [{ handle: 'acmedev', text: 'acme 2.0 is live https://acme.dev/b' }],
        }),
      ).toThrow(/too alike to post from separate accounts.*--repost/s);
    });

    it('adds the disclosure to affiliate text and refuses affiliate reposts', () => {
      const { post, notices } = createPost('acme', 'sam', {
        primary: { handle: 'acme', text: 'Acme 2.0 is here' },
        variants: [{ handle: 'creatorjo', text: 'I tried the new build tool for a week' }],
      });
      expect(post.targets[1].text).toBe('I tried the new build tool for a week #ad');
      expect(notices[0]).toMatch(/Added the disclosure #ad to @creatorjo/);
      expect(() => createPost('acme', 'sam', { primary: { handle: 'acme', text: 'Other news' }, reposts: ['creatorjo'] })).toThrow(/cannot carry a disclosure/);
    });

    it('refuses accounts that are not connected, repeated accounts and bad schedules', () => {
      expect(() => createPost('acme', 'sam', { primary: { handle: 'stranger', text: 'hi' } })).toThrow(/not connected/);
      expect(() => createPost('acme', 'sam', { primary: { handle: 'acme', text: 'hi' }, reposts: ['acme'] })).toThrow(/more than once/);
      expect(() => createPost('acme', 'sam', { primary: { handle: 'acme', text: 'hi' }, scheduledFor: 'tomorrowish' })).toThrow(/not a date/);
    });

    it('warns about Premium-length text without refusing it', () => {
      const { notices } = createPost('acme', 'sam', { primary: { handle: 'acme', text: 'x '.repeat(200) } });
      expect(notices.join(' ')).toMatch(/only for Premium accounts/);
    });

    it('sends an approved post back to draft when it is edited', () => {
      const { post } = createPost('acme', 'sam', { primary: { handle: 'acme', text: 'First wording of the news' } });
      approvePost('acme', 'rae', post.id);
      const edited = editPost('acme', 'sam', post.id, { text: 'Second wording of the news' }).post;
      expect(edited.status).toBe('draft');
      expect(edited.approvals).toEqual([]);
      expect(edited.targets[0].text).toBe('Second wording of the news');
    });

    it("stops a writer editing someone else's post", () => {
      setMember('acme', 'nich', { name: 'lee', role: 'writer' });
      const { post } = createPost('acme', 'sam', { primary: { handle: 'acme', text: 'Sam wrote this one' } });
      expect(() => editPost('acme', 'lee', post.id, { text: 'Lee rewrote it' })).toThrow(/edit someone else's post/);
      expect(editPost('acme', 'rae', post.id, { text: 'Rae tightened it' }).post.targets[0].text).toBe('Rae tightened it');
    });

    it('enforces two-person approval and lets editors reject', () => {
      updateSettings('acme', 'nich', { twoPersonApproval: true });
      const { post } = createPost('acme', 'rae', { primary: { handle: 'acme', text: 'Rae wrote and wants to approve' } });
      expect(() => approvePost('acme', 'rae', post.id)).toThrow(/requires two people/);
      expect(() => approvePost('acme', 'sam', post.id)).toThrow(/cannot approve posts/);
      const rejected = rejectPost('acme', 'nich', post.id, 'needs a link');
      expect(rejected.status).toBe('rejected');
      expect(rejected.rejection).toMatchObject({ by: 'nich', reason: 'needs a link' });
      expect(() => approvePost('acme', 'nich', post.id)).toThrow(/only a draft can be approved/);
    });
  });

  describe('publishing', () => {
    function approved(input) {
      const { post } = createPost('acme', 'sam', input);
      approvePost('acme', 'rae', post.id);
      return post.id;
    }

    it('posts the primary, then variants, then reposts the primary', async () => {
      const id = approved({
        primary: { handle: 'acme', text: 'Acme 2.0 is here. Builds are twice as fast.' },
        variants: [{ handle: 'acmedev', text: 'Devs: incremental compiles and a new CLI in 2.0.' }],
        reposts: ['acmestatus'],
      });
      const { calls, createClient } = recorder();
      const results = await publishDue('acme', { as: 'rae', delayMs: 0, createClient });

      expect(calls).toEqual([
        { handle: 'acme', op: 'post', text: 'Acme 2.0 is here. Builds are twice as fast.' },
        { handle: 'acmedev', op: 'post', text: 'Devs: incremental compiles and a new CLI in 2.0.' },
        { handle: 'acmestatus', op: 'repost', id: 't1' },
      ]);
      expect(results.map((r) => r.outcome)).toEqual(['published', 'published', 'reposted']);
      const post = getPost('acme', id);
      expect(post.status).toBe('published');
      expect(post.targets.map((t) => t.tweetId)).toEqual(['t1', 't2', 't1']);
      expect(remaining('acme').classes.post.used).toBe(1);
      expect(remaining('acmestatus').classes.repost.used).toBe(1);
      expect(verifyAudit(orgPaths('acme').audit).ok).toBe(true);
    });

    it('refuses to publish for a writer', async () => {
      await expect(publishDue('acme', { as: 'sam', delayMs: 0, createClient: recorder().createClient })).rejects.toThrow(/cannot publish posts/);
    });

    it('fails a target whose session logs in as a different account, and posts nothing from it', async () => {
      const id = approved({
        primary: { handle: 'acme', text: 'Main account news for everyone' },
        variants: [{ handle: 'acmedev', text: 'Developer details for the same release' }],
      });
      const { calls, createClient } = recorder({ identities: { acmedev: 'acme' } });
      const results = await publishDue('acme', { as: 'rae', delayMs: 0, createClient });
      expect(calls.map((c) => c.handle)).toEqual(['acme']);
      expect(results[1]).toMatchObject({ handle: 'acmedev', outcome: 'failed' });
      expect(results[1].error).toMatch(/logs in as @acme, not @acmedev/);
      expect(getPost('acme', id).status).toBe('partial');
    });

    it('fails reposts when the primary fails, and retries on request', async () => {
      const id = approved({ primary: { handle: 'acme', text: 'Primary that will fail once' }, reposts: ['acmestatus'] });
      const first = recorder({ failFor: ['acme'] });
      const r1 = await publishDue('acme', { as: 'rae', delayMs: 0, createClient: first.createClient });
      expect(r1.map((r) => r.outcome)).toEqual(['failed', 'failed']);
      expect(getPost('acme', id).status).toBe('failed');

      const second = recorder();
      const r2 = await publishDue('acme', { as: 'rae', delayMs: 0, retryFailed: true, createClient: second.createClient });
      expect(r2.map((r) => r.outcome)).toEqual(['published', 'reposted']);
      expect(getPost('acme', id).status).toBe('published');
    });

    it('records a write without a post id as unconfirmed and does not repost it', async () => {
      const id = approved({ primary: { handle: 'acme', text: 'Answer came back without an id' }, reposts: ['acmestatus'] });
      const { calls, createClient } = recorder({ omitIdFor: ['acme'] });
      const results = await publishDue('acme', { as: 'rae', delayMs: 0, createClient });
      expect(results.map((r) => r.outcome)).toEqual(['unconfirmed', 'failed']);
      expect(calls.filter((c) => c.op === 'repost')).toEqual([]);
      expect(getPost('acme', id).status).toBe('partial');
    });

    it('leaves a target pending when its daily cap is spent', async () => {
      process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ accounts: { acmedev: { post: 0 } } });
      try {
        const id = approved({
          primary: { handle: 'acme', text: 'Main news that goes out fine' },
          variants: [{ handle: 'acmedev', text: 'Dev angle that hits the cap' }],
        });
        const results = await publishDue('acme', { as: 'rae', delayMs: 0, createClient: recorder().createClient });
        expect(results.map((r) => r.outcome)).toEqual(['published', 'capped']);
        const post = getPost('acme', id);
        expect(post.status).toBe('approved');
        expect(post.targets[1].status).toBe('pending');
      } finally {
        delete process.env.XACTIONS_ACTION_CAPS;
      }
    });

    it('holds scheduled posts until they are due, unless published by id', async () => {
      const now = Date.parse('2026-11-19T12:00:00Z');
      const id = approved({ primary: { handle: 'acme', text: 'Scheduled for tomorrow morning' }, scheduledFor: '2026-11-20T09:00:00Z' });
      const { calls, createClient } = recorder();
      expect(await publishDue('acme', { as: 'rae', delayMs: 0, now, createClient })).toEqual([]);
      expect(await publishDue('acme', { as: 'rae', delayMs: 0, now: Date.parse('2026-11-20T09:00:01Z'), createClient })).toHaveLength(1);
      expect(calls).toHaveLength(1);
      expect(getPost('acme', id).status).toBe('published');
    });

    it('writes nothing on a dry run', async () => {
      const id = approved({ primary: { handle: 'acme', text: 'Dry run only please' }, reposts: ['acmestatus'] });
      const { calls, createClient } = recorder();
      const results = await publishDue('acme', { as: 'rae', dryRun: true, createClient });
      expect(results.map((r) => r.outcome)).toEqual(['would-post', 'would-repost']);
      expect(calls).toEqual([]);
      expect(getPost('acme', id).status).toBe('approved');
      expect(remaining('acme').classes.post.used).toBe(0);
    });

    it('fails a target on an account that was disconnected after approval', async () => {
      approved({ primary: { handle: 'acme', text: 'Main news first' }, variants: [{ handle: 'acmedev', text: 'Dev account angle on it' }] });
      removeAccount('acme', 'nich', 'acmedev');
      const results = await publishDue('acme', { as: 'rae', delayMs: 0, createClient: recorder().createClient });
      expect(results[1]).toMatchObject({ handle: 'acmedev', outcome: 'failed' });
      expect(results[1].error).toMatch(/no longer connected/);
    });

    it('refuses a later post that repeats what another account already published', async () => {
      approved({ primary: { handle: 'acme', text: 'Scheduled maintenance tonight at ten UTC' } });
      await publishDue('acme', { as: 'rae', delayMs: 0, createClient: recorder().createClient });
      expect(() => createPost('acme', 'sam', { primary: { handle: 'acmestatus', text: 'Scheduled maintenance tonight at ten UTC!' } })).toThrow(/Repost the original/);
    });
  });

  describe('calendar and stats', () => {
    it('groups scheduled work by day with overdue first and unscheduled apart', () => {
      const now = Date.parse('2026-11-19T12:00:00Z');
      createPost('acme', 'sam', { primary: { handle: 'acme', text: 'Late one from yesterday' }, scheduledFor: '2026-11-18T09:00:00Z' });
      createPost('acme', 'sam', { primary: { handle: 'acmedev', text: 'Friday dev notes' }, scheduledFor: '2026-11-21T15:00:00Z' });
      createPost('acme', 'sam', { primary: { handle: 'acmestatus', text: 'Whenever it is approved' } });
      createPost('acme', 'sam', { primary: { handle: 'acme', text: 'Far future announcement' }, scheduledFor: '2027-03-01T00:00:00Z' });
      const cal = orgCalendar('acme', { as: 'rae', now });
      expect(cal.days.map((d) => d.date)).toEqual(['overdue', '2026-11-21']);
      expect(cal.unscheduled.map((i) => i.text)).toEqual(['Whenever it is approved']);
    });

    it('sums profile and post metrics per account', async () => {
      const { post } = createPost('acme', 'sam', {
        primary: { handle: 'acme', text: 'Numbers worth counting' },
        reposts: ['acmestatus'],
      });
      approvePost('acme', 'rae', post.id);
      await publishDue('acme', { as: 'rae', delayMs: 0, createClient: recorder().createClient });

      const createReader = async () => ({
        async getProfile(handle) {
          if (handle === 'creatorjo') throw new Error('HTTP 404');
          return { followersCount: handle.length * 100, followingCount: 10, tweetCount: 5 };
        },
        async getTweet(id) {
          return { id, likes: 7, retweets: 3, replies: 1, views: 900 };
        },
      });
      const stats = await orgStats('acme', { as: 'sam', createReader });
      const acme = stats.accounts.find((a) => a.handle === 'acme');
      expect(acme).toMatchObject({ followers: 400, published: 1, likes: 7, retweets: 3, views: 900, sampled: 1 });
      expect(stats.accounts.find((a) => a.handle === 'acmestatus')).toMatchObject({ published: 1, reposts: 1, likes: 0 });
      expect(stats.accounts.find((a) => a.handle === 'creatorjo').error).toMatch(/profile: HTTP 404/);
      expect(stats.totals).toMatchObject({ accounts: 4, published: 2, likes: 7 });
    });
  });

  describe('cli', () => {
    const cli = (args) =>
      execFileSync(process.execPath, [CLI, ...args], {
        env: { ...process.env, XACTIONS_HOME: home, HOME: home, FORCE_COLOR: '0' },
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

    it('drafts, approves and dry-runs through the real binary', () => {
      const draft = JSON.parse(cli(['org', 'draft', 'acme', '--as', 'sam', '--account', 'acme', '--text', 'From the CLI', '--repost', 'acmestatus', '--json']));
      expect(draft.post.targets.map((t) => t.mode)).toEqual(['post', 'repost']);
      cli(['org', 'approve', 'acme', draft.post.id, '--as', 'rae']);
      const plan = JSON.parse(cli(['org', 'publish', 'acme', '--as', 'rae', '--dry-run', '--json']));
      expect(plan.map((r) => r.outcome)).toEqual(['would-post', 'would-repost']);
      expect(cli(['org', 'log', 'acme', '--as', 'nich', '--verify'])).toMatch(/Audit log intact/);
    });

    it('prints a content refusal as JSON with exit code 1', () => {
      let failure;
      try {
        cli(['org', 'draft', 'acme', '--as', 'sam', '--account', 'acme', '--text', 'Same words here today', '--variant', 'acmedev=Same words here today!', '--json']);
      } catch (error) {
        failure = error;
      }
      expect(failure.status).toBe(1);
      expect(JSON.parse(failure.stdout)).toMatchObject({ code: 'ORG_CONTENT_REJECTED' });
    });
  });
});
