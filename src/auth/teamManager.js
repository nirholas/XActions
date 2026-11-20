// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Team & Multi-User Manager
 * Team creation, role-based access, shared workspaces, and activity logging.
 *
 * Kills: Phantombuster (team plans), Taplio (team features)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { xactionsHome } from '../utils/savedSession.js';

const DATA_DIR = xactionsHome();
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity-log.json');

// ============================================================================
// Roles & Permissions
// ============================================================================

const ROLES = {
  owner: { level: 100, canManageTeam: true, canDeleteTeam: true, canRunActions: true, canViewAnalytics: true },
  admin: { level: 80, canManageTeam: true, canDeleteTeam: false, canRunActions: true, canViewAnalytics: true },
  member: { level: 50, canManageTeam: false, canDeleteTeam: false, canRunActions: true, canViewAnalytics: true },
  viewer: { level: 10, canManageTeam: false, canDeleteTeam: false, canRunActions: false, canViewAnalytics: true },
};

/**
 * Check if a user has permission for an action
 */
export function checkPermission(userRole, action) {
  const role = ROLES[userRole];
  if (!role) return false;

  const actionMap = {
    'manage-team': role.canManageTeam,
    'delete-team': role.canDeleteTeam,
    'run-actions': role.canRunActions,
    'view-analytics': role.canViewAnalytics,
    'manage-members': role.canManageTeam,
    'run-automations': role.canRunActions,
    'scrape': role.canRunActions,
    'view-data': role.canViewAnalytics,
  };

  return actionMap[action] ?? role.level >= 50;
}

// ============================================================================
// Member identity
// ============================================================================
//
// Membership is keyed by user id, with the username kept on each entry as a
// display field. Keyed by username, a user who renamed lost their teams, and
// whoever took the old name inherited the roles.
//
// Every function below that takes a user accepts either `{ id, username }`
// (the API server, where users have ids) or a bare username string (the CLI
// and MCP server, which run as one local user and have no ids).
//
// Entries written before the change have no `userId`. They keep working by
// username until a caller presents that username together with an id; the
// entry is then claimed for that id and rewritten (migrated on read).

/** Normalise a user argument to `{ id, username }`. */
function asMember(user) {
  if (user && typeof user === 'object') return { id: user.id || undefined, username: user.username };
  return { id: undefined, username: user };
}

/**
 * Find `who` in a team, claiming a legacy (id-less) entry for `who.id` and
 * refreshing the display username of an id'd one.
 *
 * @returns {{ member: object|null, changed: boolean }}
 */
function findMember(team, who) {
  const members = team.members || [];
  if (!who.id) {
    // No id to go on (CLI, MCP, or a username no account holds): username.
    return { member: members.find((m) => m.username === who.username) || null, changed: false };
  }

  let changed = false;
  let member = members.find((m) => m.userId === who.id) || null;
  const legacy = who.username ? members.find((m) => !m.userId && m.username === who.username) : null;

  if (legacy && !member) {
    legacy.userId = who.id;
    member = legacy;
    changed = true;
  } else if (legacy && member) {
    // The same person under both keys: keep the stronger role on the id'd entry.
    if ((ROLES[legacy.role]?.level || 0) > (ROLES[member.role]?.level || 0)) member.role = legacy.role;
    team.members = members.filter((m) => m !== legacy);
    changed = true;
  }

  if (member && who.username && member.username !== who.username) {
    member.username = who.username;
    changed = true;
  }
  if (member?.role === 'owner' && (team.ownerId !== who.id || team.owner !== member.username)) {
    team.ownerId = who.id;
    team.owner = member.username;
    changed = true;
  }
  return { member, changed };
}

/** A new member entry for `who`. */
function memberEntry(who, role) {
  return {
    ...(who.id ? { userId: who.id } : {}),
    username: who.username,
    role,
    joinedAt: new Date().toISOString(),
  };
}

/**
 * Claim every legacy membership held under `user.username` for `user.id`, and
 * bring the display username of the user's id'd entries up to date. Call it
 * with the old name before a rename (so nothing is left behind under it) and
 * with the new one after.
 *
 * @param {{ id: string, username: string }} user
 * @returns {Promise<number>} how many teams changed
 */
export async function claimMemberships(user) {
  const who = asMember(user);
  if (!who.id) return 0;
  const teams = await loadTeams();
  let changed = 0;
  for (const team of Object.values(teams)) {
    if (findMember(team, who).changed) changed++;
  }
  if (changed) await saveTeams(teams);
  return changed;
}

/**
 * Whether memberships written before membership was keyed by id are still
 * held under this username, unclaimed. Someone taking the name would claim
 * them, so a rename onto it is refused until they are.
 *
 * @param {string} username
 * @returns {Promise<boolean>}
 */
export async function hasUnclaimedMemberships(username) {
  const teams = await loadTeams();
  return Object.values(teams).some((t) => (t.members || []).some((m) => !m.userId && m.username === username));
}

// ============================================================================
// Team Management
// ============================================================================

/**
 * Create a new team
 *
 * @param {string} name
 * @param {{ id: string, username: string }|string} owner
 */
export async function createTeam(name, owner) {
  const who = asMember(owner);
  const teams = await loadTeams();
  const teamId = crypto.randomUUID();

  teams[teamId] = {
    id: teamId,
    name,
    owner: who.username,
    ...(who.id ? { ownerId: who.id } : {}),
    members: [memberEntry(who, 'owner')],
    createdAt: new Date().toISOString(),
  };

  await saveTeams(teams);
  await logActivity(teamId, who, 'team:created', { name });
  console.log(`✅ Team "${name}" created (ID: ${teamId})`);
  return teams[teamId];
}

/**
 * Invite a user to a team
 */
export async function inviteUser(teamId, email, role = 'member') {
  if (!ROLES[role]) throw new Error(`Invalid role: ${role}`);
  if (role === 'owner') throw new Error('Cannot invite as owner');

  const teams = await loadTeams();
  const team = teams[teamId];
  if (!team) throw new Error('Team not found');

  const token = crypto.randomBytes(32).toString('hex');
  team.invites = team.invites || [];
  team.invites.push({ email, role, token, createdAt: new Date().toISOString(), accepted: false });
  await saveTeams(teams);

  return { token, email, role, teamId };
}

/**
 * Accept an invite
 *
 * @param {string} token
 * @param {{ id: string, username: string }|string} user
 */
export async function acceptInvite(token, user) {
  const who = asMember(user);
  const teams = await loadTeams();

  for (const [teamId, team] of Object.entries(teams)) {
    const invite = (team.invites || []).find(i => i.token === token && !i.accepted);
    if (invite) {
      // Check if already a member
      if (findMember(team, who).member) {
        await saveTeams(teams);
        return { error: 'Already a team member' };
      }

      team.members.push(memberEntry(who, invite.role));
      invite.accepted = true;
      await saveTeams(teams);
      await logActivity(teamId, who, 'member:joined', { role: invite.role });

      return { teamId, team: team.name, role: invite.role };
    }
  }

  return { error: 'Invalid or expired invite token' };
}

/**
 * Remove a user from a team
 *
 * @param {string} teamId
 * @param {{ id?: string, username: string }|string} user
 */
export async function removeUser(teamId, user) {
  const who = asMember(user);
  const teams = await loadTeams();
  const team = teams[teamId];
  if (!team) return { error: 'Team not found' };

  const { member } = findMember(team, who);
  if (!member) return { error: 'User not in team' };
  if (member.role === 'owner') return { error: 'Cannot remove team owner' };

  team.members = team.members.filter(m => m !== member);
  await saveTeams(teams);
  await logActivity(teamId, { id: member.userId, username: member.username }, 'member:removed', {});

  return { status: 'removed', username: member.username };
}

/**
 * Update a user's role
 *
 * @param {string} teamId
 * @param {{ id?: string, username: string }|string} user
 * @param {string} newRole
 */
export async function updateRole(teamId, user, newRole) {
  if (!ROLES[newRole]) throw new Error(`Invalid role: ${newRole}`);
  if (newRole === 'owner') throw new Error('Cannot assign owner role');

  const who = asMember(user);
  const teams = await loadTeams();
  const team = teams[teamId];
  if (!team) return { error: 'Team not found' };

  const { member } = findMember(team, who);
  if (!member) return { error: 'User not in team' };
  if (member.role === 'owner') return { error: 'Cannot change owner role' };

  member.role = newRole;
  await saveTeams(teams);
  await logActivity(teamId, { id: member.userId, username: member.username }, 'role:changed', { newRole });

  return { username: member.username, role: newRole };
}

/**
 * List team members
 */
export async function listTeamMembers(teamId) {
  const teams = await loadTeams();
  const team = teams[teamId];
  if (!team) return { error: 'Team not found' };
  return team.members;
}

// ============================================================================
// Activity Log
// ============================================================================

/**
 * @param {string} teamId
 * @param {{ id?: string, username: string }|string} user
 * @param {string} action
 * @param {object} target
 */
export async function logActivity(teamId, user, action, target) {
  const who = asMember(user);
  const activity = await loadActivity();
  activity.push({
    teamId,
    user: who.username,
    ...(who.id ? { userId: who.id } : {}),
    action,
    target,
    timestamp: new Date().toISOString(),
  });

  // Keep last 10000 entries
  if (activity.length > 10000) activity.splice(0, activity.length - 10000);
  await saveActivity(activity);
}

export async function getActivityLog(teamId, filters = {}) {
  const activity = await loadActivity();
  let filtered = activity.filter(a => a.teamId === teamId);

  if (filters.from) filtered = filtered.filter(a => a.timestamp >= filters.from);
  if (filters.to) filtered = filtered.filter(a => a.timestamp <= filters.to);
  if (filters.user) filtered = filtered.filter(a => a.user === filters.user);
  if (filters.action) filtered = filtered.filter(a => a.action === filters.action);

  return filtered.reverse().slice(0, filters.limit || 100);
}

// ============================================================================
// User Management (for API auth)
// ============================================================================

export async function createUser(username, passwordHash, email) {
  const users = await loadUsers();
  if (users[username]) throw new Error('Username already exists');

  users[username] = {
    username,
    passwordHash,
    email,
    createdAt: new Date().toISOString(),
  };
  await saveUsers(users);
  return { username, email };
}

export async function getUser(username) {
  const users = await loadUsers();
  return users[username] || null;
}

/**
 * The teams a user belongs to. With an id, legacy entries under the username
 * are claimed for it on the way.
 *
 * @param {{ id?: string, username: string }|string} user
 */
export async function getUserTeams(user) {
  const who = asMember(user);
  const teams = await loadTeams();
  let changed = false;
  const mine = Object.values(teams).filter((t) => {
    const found = findMember(t, who);
    changed ||= found.changed;
    return Boolean(found.member);
  });
  if (changed) await saveTeams(teams);
  return mine;
}

/**
 * A user's role in a team, or null when they are not in it.
 *
 * @param {string} teamId
 * @param {{ id?: string, username: string }|string} user
 */
export async function getUserRole(teamId, user) {
  const teams = await loadTeams();
  const team = teams[teamId];
  if (!team) return null;
  const { member, changed } = findMember(team, asMember(user));
  if (changed) await saveTeams(teams);
  return member?.role || null;
}

// ============================================================================
// File Helpers
// ============================================================================

async function loadTeams() {
  try { return JSON.parse(await fsp.readFile(TEAMS_FILE, 'utf-8')); } catch { return {}; }
}

async function saveTeams(teams) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  await fsp.writeFile(TEAMS_FILE, JSON.stringify(teams, null, 2));
}

async function loadUsers() {
  try { return JSON.parse(await fsp.readFile(USERS_FILE, 'utf-8')); } catch { return {}; }
}

async function saveUsers(users) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  await fsp.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

async function loadActivity() {
  try { return JSON.parse(await fsp.readFile(ACTIVITY_FILE, 'utf-8')); } catch { return []; }
}

async function saveActivity(activity) {
  await fsp.writeFile(ACTIVITY_FILE, JSON.stringify(activity, null, 2));
}

// by nichxbt
