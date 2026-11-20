// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Roles inside an organization, and what each one may do.
 *
 * An organization is a family of X accounts one team runs in the open: a
 * newsroom's main, breaking and regional handles, or a company's main, dev,
 * status and support accounts. The people on the team get one role each.
 *
 *   owner   everything, including settings and other owners
 *   admin   connects and removes accounts, manages members below owner
 *   editor  approves, rejects and publishes posts
 *   writer  drafts posts and edits their own drafts
 *   viewer  reads the queue, the calendar, the stats and the log
 *
 * These roles run on one machine against files the operator can read, so
 * they are an accountability and review workflow, not a security boundary:
 * anyone with access to XACTIONS_HOME can edit the files directly. The
 * hash-chained audit log (`audit.js`) is what makes that tampering visible.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** Roles from most to least privileged. */
export const ROLES = Object.freeze(['owner', 'admin', 'editor', 'writer', 'viewer']);

const LEVEL = Object.freeze({ owner: 100, admin: 80, editor: 60, writer: 40, viewer: 10 });

/**
 * The lowest role allowed to perform each action.
 * @type {Readonly<Record<string, string>>}
 */
export const PERMISSIONS = Object.freeze({
  'org:settings': 'owner',
  'members:manage': 'admin',
  'accounts:manage': 'admin',
  'posts:approve': 'editor',
  'posts:reject': 'editor',
  'posts:publish': 'editor',
  'posts:edit-any': 'editor',
  'posts:draft': 'writer',
  'posts:read': 'viewer',
});

/**
 * Thrown when a member tries something their role does not allow.
 */
export class OrgPermissionError extends Error {
  constructor(member, role, action) {
    super(`${member} is ${articled(role)} and cannot ${describe(action)}; that needs ${articled(PERMISSIONS[action])} or above.`);
    this.name = 'OrgPermissionError';
    this.code = 'ORG_PERMISSION_DENIED';
    this.member = member;
    this.role = role;
    this.action = action;
  }
}

function articled(role) {
  return /^[aeiou]/.test(role) ? `an ${role}` : `a ${role}`;
}

function describe(action) {
  return {
    'org:settings': 'change organization settings',
    'members:manage': 'manage members',
    'accounts:manage': 'connect or remove accounts',
    'posts:approve': 'approve posts',
    'posts:reject': 'reject posts',
    'posts:publish': 'publish posts',
    'posts:edit-any': "edit someone else's post",
    'posts:draft': 'draft posts',
    'posts:read': 'read posts',
  }[action] ?? action;
}

/**
 * @param {string} role
 * @returns {boolean}
 */
export function isRole(role) {
  return ROLES.includes(role);
}

/**
 * Whether `role` may perform `action`.
 * @param {string} role
 * @param {string} action a key of PERMISSIONS
 * @returns {boolean}
 */
export function can(role, action) {
  const needed = PERMISSIONS[action];
  if (!needed) throw new Error(`Unknown org action "${action}"`);
  return (LEVEL[role] ?? -1) >= LEVEL[needed];
}

/**
 * Throw OrgPermissionError unless `member` may perform `action`.
 * @param {{name: string, role: string}} member
 * @param {string} action
 */
export function assertCan(member, action) {
  if (!can(member.role, action)) throw new OrgPermissionError(member.name, member.role, action);
}

/**
 * Whether `actorRole` may grant, change or remove `targetRole`. Only an
 * owner touches owners; an admin manages everyone below admin.
 * @param {string} actorRole
 * @param {string} targetRole
 * @returns {boolean}
 */
export function canManageRole(actorRole, targetRole) {
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin') return LEVEL[targetRole] < LEVEL.admin;
  return false;
}
