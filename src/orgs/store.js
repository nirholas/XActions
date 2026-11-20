// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Organizations: a family of X accounts one team runs in the open.
 *
 * A newsroom with main, breaking and regional handles; a company with main,
 * dev, status and support accounts; a brand with affiliates who post on its
 * behalf and say so. This store keeps, per organization:
 *
 *   $XACTIONS_HOME/orgs/<slug>/
 *     org.json          name, settings, members and their roles, accounts
 *     posts.json        the post queue: drafts, approvals, publish results
 *     audit.jsonl       hash-chained log of every change (audit.js)
 *     sessions/<h>.json one cookie jar per account, owner-only (sessions.js)
 *
 * A post is one announcement across one or more accounts. Its first target is
 * the primary; every other target is either a variant written for that
 * account, or a repost of the primary. Content checks (guards.js) run when a
 * post is drafted and again when it is edited, and editing an approved post
 * sends it back to draft, so nothing ships in a form nobody approved.
 *
 * Every read-change-write runs under the same cross-process file lock the
 * draft store and the action ledger use.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withFileLock } from '../utils/fileLock.js';
import { xactionsHome } from '../utils/savedSession.js';
import { appendAudit } from './audit.js';
import {
  DEFAULT_DISCLOSURE,
  DEFAULT_SIMILARITY_THRESHOLD,
  applyDisclosure,
  findRecentEchoes,
  findSimilarPairs,
} from './guards.js';
import { assertCan, canManageRole, isRole, ROLES } from './roles.js';
import { deleteSession, writeSession } from './sessions.js';

/** Environment variable naming the member a command acts as. */
export const MEMBER_ENV = 'XACTIONS_ORG_MEMBER';

/** Account kinds. `affiliate` accounts must disclose every post. */
export const ACCOUNT_KINDS = Object.freeze(['owned', 'affiliate']);

/** Post statuses. */
export const POST_STATUSES = Object.freeze(['draft', 'approved', 'rejected', 'published', 'partial', 'failed']);

/** X's limit for accounts without Premium. Longer posts are allowed with a warning. */
export const STANDARD_POST_LENGTH = 280;

const DEFAULT_SETTINGS = Object.freeze({
  twoPersonApproval: false,
  similarityThreshold: DEFAULT_SIMILARITY_THRESHOLD,
  disclosureTag: DEFAULT_DISCLOSURE,
});

/**
 * Thrown when a post fails a content check.
 */
export class OrgContentError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'OrgContentError';
    this.code = 'ORG_CONTENT_REJECTED';
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Paths and names
// ---------------------------------------------------------------------------

/** @returns {string} directory holding every organization */
export function orgsRoot() {
  return join(xactionsHome(), 'orgs');
}

/**
 * @param {string} slug
 * @returns {{dir: string, org: string, posts: string, audit: string, sessions: string, session: (handle: string) => string}}
 */
export function orgPaths(slug) {
  const dir = join(orgsRoot(), assertSlug(slug));
  return {
    dir,
    org: join(dir, 'org.json'),
    posts: join(dir, 'posts.json'),
    audit: join(dir, 'audit.jsonl'),
    sessions: join(dir, 'sessions'),
    session: (handle) => join(dir, 'sessions', `${normalizeHandle(handle)}.json`),
  };
}

/**
 * Organization slugs are lower-case letters, digits and dashes, so they are
 * safe as a directory name on every platform.
 * @param {string} slug
 * @returns {string}
 */
export function assertSlug(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug)) {
    throw new Error(`"${slug}" is not a valid organization id: use lower-case letters, digits and dashes, up to 64 characters.`);
  }
  return slug;
}

/**
 * Lower-case an X handle and drop a leading @. X handles are 1 to 15
 * letters, digits and underscores.
 * @param {string} handle
 * @returns {string}
 */
export function normalizeHandle(handle) {
  const h = String(handle ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_]{1,15}$/.test(h)) throw new Error(`"${handle}" is not a valid X handle.`);
  return h;
}

function memberName(name) {
  const n = String(name ?? '').trim();
  if (!n || n.length > 64 || /[\n\r\t]/.test(n)) throw new Error(`"${name}" is not a valid member name: 1 to 64 characters, no line breaks.`);
  return n;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  renameSync(tmp, file);
}

function requireOrg(slug) {
  const paths = orgPaths(slug);
  if (!existsSync(paths.org)) throw new Error(`No organization "${slug}". Create it with \`xactions org create ${slug}\`.`);
  return paths;
}

/**
 * Read an organization.
 * @param {string} slug
 * @returns {object}
 */
export function loadOrg(slug) {
  const org = readJson(requireOrg(slug).org);
  org.settings = { ...DEFAULT_SETTINGS, ...org.settings };
  return org;
}

/** Read, change and write org.json under its lock. */
function mutateOrg(slug, fn) {
  const paths = requireOrg(slug);
  return withFileLock(paths.org, () => {
    const org = readJson(paths.org);
    org.settings = { ...DEFAULT_SETTINGS, ...org.settings };
    const result = fn(org);
    org.updatedAt = new Date().toISOString();
    writeJson(paths.org, org);
    return result;
  });
}

function readPosts(paths) {
  return existsSync(paths.posts) ? readJson(paths.posts) : { version: 1, posts: [] };
}

/** Read, change and write posts.json under its lock. */
function mutatePosts(slug, fn) {
  const paths = requireOrg(slug);
  return withFileLock(paths.posts, () => {
    const store = readPosts(paths);
    const result = fn(store);
    writeJson(paths.posts, store);
    return result;
  });
}

function audit(slug, actor, action, details) {
  return appendAudit(orgPaths(slug).audit, { actor, action, details });
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

/**
 * Create an organization with its first owner.
 * @param {{slug: string, name?: string, owner: string}} input
 * @returns {object}
 */
export function createOrg({ slug, name, owner }) {
  const paths = orgPaths(slug);
  const ownerName = memberName(owner);
  mkdirSync(paths.dir, { recursive: true, mode: 0o700 });
  return withFileLock(paths.org, () => {
    if (existsSync(paths.org)) throw new Error(`Organization "${slug}" already exists.`);
    const now = new Date().toISOString();
    const org = {
      version: 1,
      slug,
      name: (name && String(name).trim()) || slug,
      createdAt: now,
      updatedAt: now,
      settings: { ...DEFAULT_SETTINGS },
      members: [{ name: ownerName, role: 'owner', addedAt: now, addedBy: ownerName }],
      accounts: [],
    };
    writeJson(paths.org, org);
    writeJson(paths.posts, { version: 1, posts: [] });
    audit(slug, ownerName, 'org.create', { name: org.name });
    return org;
  });
}

/**
 * Every organization under XACTIONS_HOME, by slug.
 * @returns {Array<{slug: string, name: string, accounts: number, members: number}>}
 */
export function listOrgs() {
  const root = orgsRoot();
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(root, d.name, 'org.json')))
    .map((d) => {
      const org = readJson(join(root, d.name, 'org.json'));
      return { slug: org.slug, name: org.name, accounts: org.accounts.length, members: org.members.length };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Work out who is acting: the name given, else XACTIONS_ORG_MEMBER, else the
 * only member when there is just one.
 * @param {object} org
 * @param {string} [name]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{name: string, role: string}}
 */
export function resolveActor(org, name, env = process.env) {
  const wanted = name || env[MEMBER_ENV];
  if (!wanted) {
    if (org.members.length === 1) return org.members[0];
    throw new Error(`"${org.slug}" has ${org.members.length} members; say who is acting with --as <name> or ${MEMBER_ENV}.`);
  }
  const member = org.members.find((m) => m.name.toLowerCase() === String(wanted).toLowerCase());
  if (!member) throw new Error(`"${wanted}" is not a member of "${org.slug}".`);
  return member;
}

/**
 * Change settings. Owner only.
 * @param {string} slug
 * @param {string|undefined} as
 * @param {{twoPersonApproval?: boolean, similarityThreshold?: number, disclosureTag?: string}} patch
 * @returns {object} the new settings
 */
export function updateSettings(slug, as, patch) {
  const next = {};
  if (patch.twoPersonApproval !== undefined) next.twoPersonApproval = Boolean(patch.twoPersonApproval);
  if (patch.similarityThreshold !== undefined) {
    const t = Number(patch.similarityThreshold);
    if (!Number.isFinite(t) || t < 0.5 || t > 1) throw new Error('The similarity threshold must be between 0.5 and 1.');
    next.similarityThreshold = t;
  }
  if (patch.disclosureTag !== undefined) {
    const tag = String(patch.disclosureTag).trim();
    if (!tag || /\s/.test(tag)) throw new Error('The disclosure tag must be one word, such as #ad or #sponsored.');
    next.disclosureTag = tag;
  }
  const { actor, settings } = mutateOrg(slug, (org) => {
    const actor = resolveActor(org, as);
    assertCan(actor, 'org:settings');
    Object.assign(org.settings, next);
    return { actor, settings: org.settings };
  });
  audit(slug, actor.name, 'org.settings', next);
  return settings;
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/**
 * Add a member, or change an existing member's role.
 * @param {string} slug
 * @param {string|undefined} as
 * @param {{name: string, role: string}} input
 * @returns {{name: string, role: string}}
 */
export function setMember(slug, as, { name, role }) {
  const target = memberName(name);
  if (!isRole(role)) throw new Error(`Role must be one of ${ROLES.join(', ')}.`);
  const { actor, member, previous } = mutateOrg(slug, (org) => {
    const actor = resolveActor(org, as);
    assertCan(actor, 'members:manage');
    const existing = org.members.find((m) => m.name.toLowerCase() === target.toLowerCase());
    if (!canManageRole(actor.role, role) || (existing && !canManageRole(actor.role, existing.role))) {
      throw new Error(`${actor.name} is ${actor.role === 'admin' ? 'an admin' : `a ${actor.role}`} and can only manage members below admin.`);
    }
    if (existing) {
      if (existing.role === 'owner' && role !== 'owner' && org.members.filter((m) => m.role === 'owner').length === 1) {
        throw new Error(`${existing.name} is the only owner; make someone else an owner first.`);
      }
      const previous = existing.role;
      existing.role = role;
      return { actor, member: existing, previous };
    }
    const member = { name: target, role, addedAt: new Date().toISOString(), addedBy: actor.name };
    org.members.push(member);
    return { actor, member, previous: null };
  });
  audit(slug, actor.name, previous ? 'member.role' : 'member.add', { member: member.name, role, previous });
  return member;
}

/**
 * Remove a member.
 * @param {string} slug
 * @param {string|undefined} as
 * @param {string} name
 */
export function removeMember(slug, as, name) {
  const { actor, removed } = mutateOrg(slug, (org) => {
    const actor = resolveActor(org, as);
    assertCan(actor, 'members:manage');
    const index = org.members.findIndex((m) => m.name.toLowerCase() === String(name).toLowerCase());
    if (index === -1) throw new Error(`"${name}" is not a member of "${slug}".`);
    const removed = org.members[index];
    if (!canManageRole(actor.role, removed.role)) throw new Error(`${actor.name} cannot remove ${removed.name}, who is ${removed.role === 'owner' ? 'an owner' : `a ${removed.role}`}.`);
    if (removed.role === 'owner' && org.members.filter((m) => m.role === 'owner').length === 1) {
      throw new Error(`${removed.name} is the only owner and cannot be removed.`);
    }
    org.members.splice(index, 1);
    return { actor, removed };
  });
  audit(slug, actor.name, 'member.remove', { member: removed.name, role: removed.role });
  return removed;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/**
 * Connect an account: store its session and record it on the organization.
 * The caller verifies the session belongs to `handle` before calling this
 * (the CLI does, with `verifyAccountSession()` in publish.js).
 *
 * @param {string} slug
 * @param {string|undefined} as
 * @param {{handle: string, label?: string, kind?: string, disclosure?: string, cookies: object[], userId?: string, verified?: boolean}} input
 * @returns {{account: object, encrypted: boolean}}
 */
export function addAccount(slug, as, { handle, label, kind = 'owned', disclosure, cookies, userId, verified = false }) {
  const h = normalizeHandle(handle);
  if (!ACCOUNT_KINDS.includes(kind)) throw new Error(`Account kind must be one of ${ACCOUNT_KINDS.join(', ')}.`);
  const paths = orgPaths(slug);
  const org = loadOrg(slug);
  assertCan(resolveActor(org, as), 'accounts:manage');
  const { encrypted } = writeSession(paths.session(h), cookies);
  const { actor, account, replaced } = mutateOrg(slug, (o) => {
    const actor = resolveActor(o, as);
    assertCan(actor, 'accounts:manage');
    const now = new Date().toISOString();
    const existing = o.accounts.find((a) => a.handle === h);
    const account = {
      handle: h,
      label: label ? String(label).trim() : existing?.label ?? null,
      kind,
      disclosure: kind === 'affiliate' ? (disclosure ? String(disclosure).trim() : existing?.disclosure ?? null) : null,
      userId: userId ?? existing?.userId ?? null,
      addedAt: existing?.addedAt ?? now,
      addedBy: existing?.addedBy ?? actor.name,
      sessionUpdatedAt: now,
      verifiedAt: verified ? now : existing?.verifiedAt ?? null,
    };
    if (existing) Object.assign(existing, account);
    else o.accounts.push(account);
    return { actor, account, replaced: Boolean(existing) };
  });
  audit(slug, actor.name, replaced ? 'account.session' : 'account.add', { handle: h, kind, label: account.label, verified, encrypted });
  return { account, encrypted };
}

/**
 * Disconnect an account and delete its session. Posts already published stay
 * in the history; pending targets on that account fail at publish time.
 * @param {string} slug
 * @param {string|undefined} as
 * @param {string} handle
 */
export function removeAccount(slug, as, handle) {
  const h = normalizeHandle(handle);
  const { actor, removed } = mutateOrg(slug, (org) => {
    const actor = resolveActor(org, as);
    assertCan(actor, 'accounts:manage');
    const index = org.accounts.findIndex((a) => a.handle === h);
    if (index === -1) throw new Error(`@${h} is not connected to "${slug}".`);
    const [removed] = org.accounts.splice(index, 1);
    return { actor, removed };
  });
  deleteSession(orgPaths(slug).session(h));
  audit(slug, actor.name, 'account.remove', { handle: h });
  return removed;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

function newPostId() {
  return `p_${randomBytes(4).toString('hex')}`;
}

function parseSchedule(at) {
  if (at === undefined || at === null || at === '') return null;
  const t = Date.parse(at);
  if (!Number.isFinite(t)) throw new Error(`"${at}" is not a date and time. Use ISO 8601, such as 2026-12-01T09:00:00Z.`);
  return new Date(t).toISOString();
}

/** Everything the org published, for the cross-account echo check. */
function publishedHistory(store, exceptPostId) {
  const out = [];
  for (const post of store.posts) {
    if (post.id === exceptPostId) continue;
    for (const t of post.targets) {
      if (t.mode === 'post' && t.publishedAt && (t.status === 'published' || t.status === 'unconfirmed')) {
        out.push({ handle: t.handle, text: t.text, publishedAt: t.publishedAt, postId: post.id });
      }
    }
  }
  return out;
}

/**
 * Build and check the target list. Returns targets plus the notices the
 * writer should see (disclosure added, Premium-length warnings).
 */
function buildTargets(org, store, { primary, variants = [], reposts = [] }, exceptPostId) {
  const accounts = new Map(org.accounts.map((a) => [a.handle, a]));
  const seen = new Set();
  const notices = [];

  const take = (handle) => {
    const h = normalizeHandle(handle);
    if (!accounts.has(h)) throw new OrgContentError(`@${h} is not connected to "${org.slug}". Connect it with \`xactions org account add ${org.slug} ${h}\`.`);
    if (seen.has(h)) throw new OrgContentError(`@${h} appears more than once in this post.`);
    seen.add(h);
    return accounts.get(h);
  };

  const written = (handle, text) => {
    const account = take(handle);
    let body = String(text ?? '').trim();
    if (!body) throw new OrgContentError(`The text for @${account.handle} is empty.`);
    if (account.kind === 'affiliate') {
      const tag = account.disclosure || org.settings.disclosureTag;
      const applied = applyDisclosure(body, tag);
      if (applied.added) notices.push(`Added the disclosure ${tag} to @${account.handle}, an affiliate account.`);
      body = applied.text;
    }
    if (body.length > STANDARD_POST_LENGTH) {
      notices.push(`The text for @${account.handle} is ${body.length} characters; X publishes past ${STANDARD_POST_LENGTH} only for Premium accounts.`);
    }
    return { handle: account.handle, mode: 'post', text: body, status: 'pending' };
  };

  if (!primary?.handle) throw new OrgContentError('A post needs a primary account and its text.');
  const targets = [written(primary.handle, primary.text)];
  for (const v of variants) targets.push(written(v.handle, v.text));
  for (const handle of reposts) {
    const account = take(handle);
    if (account.kind === 'affiliate') {
      throw new OrgContentError(`@${account.handle} is an affiliate account. A repost cannot carry a disclosure, so give it its own variant instead.`);
    }
    targets.push({ handle: account.handle, mode: 'repost', status: 'pending' });
  }

  const threshold = org.settings.similarityThreshold;
  const texts = targets.filter((t) => t.mode === 'post');
  const pairs = findSimilarPairs(texts, threshold);
  if (pairs.length) {
    const list = pairs.map((p) => `@${p.a} and @${p.b} (${Math.round(p.score * 100)}% alike)`).join(', ');
    throw new OrgContentError(
      `These variants are too alike to post from separate accounts: ${list}. X's automation rules forbid duplicate posts across accounts you run. Rewrite them for each audience, or have the other accounts repost the primary with --repost.`,
      { pairs },
    );
  }
  const echoes = findRecentEchoes(texts, publishedHistory(store, exceptPostId), { threshold });
  if (echoes.length) {
    const list = echoes.map((e) => `@${e.handle} repeats what @${e.echoes} published in ${e.postId} (${Math.round(e.score * 100)}% alike)`).join('; ');
    throw new OrgContentError(`${list}. Repost the original instead of posting it again from another account.`, { echoes });
  }
  return { targets, notices };
}

/**
 * Draft a post.
 * @param {string} slug
 * @param {string|undefined} as
 * @param {{primary: {handle: string, text: string}, variants?: Array<{handle: string, text: string}>, reposts?: string[], scheduledFor?: string, note?: string}} input
 * @returns {{post: object, notices: string[]}}
 */
export function createPost(slug, as, input) {
  const org = loadOrg(slug);
  const actor = resolveActor(org, as);
  assertCan(actor, 'posts:draft');
  const scheduledFor = parseSchedule(input.scheduledFor);
  const result = mutatePosts(slug, (store) => {
    const { targets, notices } = buildTargets(org, store, input);
    const now = new Date().toISOString();
    const post = {
      id: newPostId(),
      status: 'draft',
      createdAt: now,
      createdBy: actor.name,
      updatedAt: now,
      scheduledFor,
      note: input.note ? String(input.note) : null,
      targets,
      approvals: [],
      rejection: null,
    };
    store.posts.push(post);
    return { post, notices };
  });
  audit(slug, actor.name, 'post.draft', {
    post: result.post.id,
    targets: result.post.targets.map((t) => `${t.mode}:@${t.handle}`),
    scheduledFor,
  });
  return result;
}

/**
 * Change a post's text for one account, its schedule, or its note. An
 * approved or rejected post goes back to draft and loses its approvals.
 * @param {string} slug
 * @param {string|undefined} as
 * @param {string} id
 * @param {{handle?: string, text?: string, scheduledFor?: string|null, note?: string}} change
 * @returns {{post: object, notices: string[]}}
 */
export function editPost(slug, as, id, change) {
  const org = loadOrg(slug);
  const actor = resolveActor(org, as);
  assertCan(actor, 'posts:draft');
  const result = mutatePosts(slug, (store) => {
    const post = findPost(store, id);
    if (!['draft', 'approved', 'rejected'].includes(post.status)) throw new Error(`${id} is ${post.status} and can no longer be edited.`);
    if (post.createdBy !== actor.name) assertCan(actor, 'posts:edit-any');

    let notices = [];
    if (change.text !== undefined) {
      const handle = change.handle ? normalizeHandle(change.handle) : post.targets[0].handle;
      const target = post.targets.find((t) => t.handle === handle);
      if (!target) throw new Error(`${id} has no target @${handle}.`);
      if (target.mode !== 'post') throw new Error(`@${handle} reposts the primary in ${id}; it has no text of its own.`);
      const posts = post.targets.filter((t) => t.mode === 'post').map((t) => ({ handle: t.handle, text: t.handle === handle ? change.text : t.text }));
      const [primary, ...variants] = posts;
      const reposts = post.targets.filter((t) => t.mode === 'repost').map((t) => t.handle);
      ({ targets: post.targets, notices } = buildTargets(org, store, { primary, variants, reposts }, post.id));
    }
    if (change.scheduledFor !== undefined) post.scheduledFor = parseSchedule(change.scheduledFor);
    if (change.note !== undefined) post.note = change.note ? String(change.note) : null;

    const wasApproved = post.status !== 'draft';
    post.status = 'draft';
    post.approvals = [];
    post.rejection = null;
    post.updatedAt = new Date().toISOString();
    return { post, notices, wasApproved };
  });
  audit(slug, actor.name, 'post.edit', {
    post: id,
    handle: change.handle ?? null,
    text: change.text !== undefined,
    scheduledFor: change.scheduledFor,
    returnedToDraft: result.wasApproved,
  });
  return { post: result.post, notices: result.notices };
}

/**
 * Approve a draft. With two-person approval on, the writer cannot approve
 * their own post.
 * @param {string} slug
 * @param {string|undefined} as
 * @param {string} id
 * @returns {object}
 */
export function approvePost(slug, as, id) {
  const org = loadOrg(slug);
  const actor = resolveActor(org, as);
  assertCan(actor, 'posts:approve');
  const post = mutatePosts(slug, (store) => {
    const post = findPost(store, id);
    if (post.status !== 'draft') throw new Error(`${id} is ${post.status}; only a draft can be approved.`);
    if (org.settings.twoPersonApproval && post.createdBy === actor.name) {
      throw new Error(`"${slug}" requires two people: ${actor.name} wrote ${id} and someone else has to approve it.`);
    }
    post.status = 'approved';
    post.approvals.push({ by: actor.name, at: new Date().toISOString() });
    post.updatedAt = new Date().toISOString();
    return post;
  });
  audit(slug, actor.name, 'post.approve', { post: id });
  return post;
}

/**
 * Reject a draft or an approved post that has not shipped.
 * @param {string} slug
 * @param {string|undefined} as
 * @param {string} id
 * @param {string} [reason]
 * @returns {object}
 */
export function rejectPost(slug, as, id, reason) {
  const org = loadOrg(slug);
  const actor = resolveActor(org, as);
  assertCan(actor, 'posts:reject');
  const post = mutatePosts(slug, (store) => {
    const post = findPost(store, id);
    if (!['draft', 'approved'].includes(post.status)) throw new Error(`${id} is ${post.status} and cannot be rejected.`);
    post.status = 'rejected';
    post.approvals = [];
    post.rejection = { by: actor.name, at: new Date().toISOString(), reason: reason ? String(reason) : null };
    post.updatedAt = new Date().toISOString();
    return post;
  });
  audit(slug, actor.name, 'post.reject', { post: id, reason: reason ?? null });
  return post;
}

function findPost(store, id) {
  const post = store.posts.find((p) => p.id === id);
  if (!post) throw new Error(`No post "${id}". Run \`xactions org posts\` to see the queue.`);
  return post;
}

/**
 * The queue, newest first.
 * @param {string} slug
 * @param {{status?: string}} [options]
 * @returns {object[]}
 */
export function listPosts(slug, { status = 'all' } = {}) {
  if (status !== 'all' && !POST_STATUSES.includes(status)) throw new Error(`--status must be one of ${POST_STATUSES.join(', ')}, or all.`);
  const { posts } = readPosts(requireOrg(slug));
  return posts.filter((p) => status === 'all' || p.status === status).reverse();
}

/**
 * One post.
 * @param {string} slug
 * @param {string} id
 * @returns {object}
 */
export function getPost(slug, id) {
  return findPost(readPosts(requireOrg(slug)), id);
}

/**
 * Record what happened when one target was published. Used by publish.js;
 * recomputes the post's status from its targets.
 * @param {string} slug
 * @param {string} id
 * @param {string} handle
 * @param {{status: string, tweetId?: string|null, error?: string|null}} outcome
 * @returns {object} the post
 */
export function recordTargetOutcome(slug, id, handle, outcome) {
  return mutatePosts(slug, (store) => {
    const post = findPost(store, id);
    const target = post.targets.find((t) => t.handle === handle);
    if (!target) throw new Error(`${id} has no target @${handle}.`);
    target.status = outcome.status;
    target.tweetId = outcome.tweetId ?? target.tweetId ?? null;
    target.error = outcome.error ?? null;
    if (outcome.status === 'published' || outcome.status === 'unconfirmed') target.publishedAt = new Date().toISOString();
    post.status = rollupStatus(post);
    post.updatedAt = new Date().toISOString();
    return post;
  });
}

/**
 * Reset failed targets to pending so the next publish retries them.
 * @param {string} slug
 * @param {string} id
 * @returns {object} the post
 */
export function resetFailedTargets(slug, id) {
  return mutatePosts(slug, (store) => {
    const post = findPost(store, id);
    for (const t of post.targets) {
      if (t.status === 'failed') {
        t.status = 'pending';
        t.error = null;
      }
    }
    post.status = rollupStatus(post);
    return post;
  });
}

/**
 * A post's status from its targets. Anything still pending keeps it
 * approved, so the next publish run picks it up.
 * @param {object} post
 * @returns {string}
 */
export function rollupStatus(post) {
  const states = post.targets.map((t) => t.status);
  if (states.includes('pending')) return 'approved';
  const shipped = states.filter((s) => s === 'published' || s === 'unconfirmed').length;
  if (shipped === states.length) return 'published';
  if (shipped > 0) return 'partial';
  return 'failed';
}

export { audit as recordAudit };
