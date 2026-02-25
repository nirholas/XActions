/**
 * XActions Team & Multi-User Manager
 * Team creation, role-based access, shared workspaces, and activity logging.
 *
 * Kills: Phantombuster (team plans), Taplio (team features)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const DATA_DIR = path.join(os.homedir(), '.xactions');
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
// Team Management
// ============================================================================

/**
 * Create a new team
 */
export async function createTeam(name, ownerUsername) {
  const teams = await loadTeams();
  const teamId = crypto.randomUUID();

  teams[teamId] = {
    id: teamId,
    name,
    owner: ownerUsername,
    members: [{ username: ownerUsername, role: 'owner', joinedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  };

  await saveTeams(teams);
  await logActivity(teamId, ownerUsername, 'team:created', { name });
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
 */
export async function acceptInvite(token, username) {
  const teams = await loadTeams();

  for (const [teamId, team] of Object.entries(teams)) {
    const invite = (team.invites || []).find(i => i.token === token && !i.accepted);
    if (invite) {
      // Check if already a member
      if (team.members.some(m => m.username === username)) {
        return { error: 'Already a team member' };
      }

      team.members.push({ username, role: invite.role, joinedAt: new Date().toISOString() });
      invite.accepted = true;
      await saveTeams(teams);
      await logActivity(teamId, username, 'member:joined', { role: invite.role });

      return { teamId, team: team.name, role: invite.role };
    }
  }

  return { error: 'Invalid or expired invite token' };
}

/**
 * Remove a user from a team
 */
export async function removeUser(teamId, username) {
  const teams = await loadTeams();
  const team = teams[teamId];
  if (!team) return { error: 'Team not found' };

  if (team.owner === username) return { error: 'Cannot remove team owner' };

  team.members = team.members.filter(m => m.username !== username);
  await saveTeams(teams);
  await logActivity(teamId, username, 'member:removed', {});

  return { status: 'removed', username };
}

/**
 * Update a user's role
 */
export async function updateRole(teamId, username, newRole) {
  if (!ROLES[newRole]) throw new Error(`Invalid role: ${newRole}`);
  if (newRole === 'owner') throw new Error('Cannot assign owner role');

  const teams = await loadTeams();
  const team = teams[teamId];
  if (!team) return { error: 'Team not found' };

  const member = team.members.find(m => m.username === username);
  if (!member) return { error: 'User not in team' };
  if (member.role === 'owner') return { error: 'Cannot change owner role' };

  member.role = newRole;
  await saveTeams(teams);
  await logActivity(teamId, username, 'role:changed', { newRole });

  return { username, role: newRole };
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

export async function logActivity(teamId, username, action, target) {
  const activity = await loadActivity();
  activity.push({
    teamId,
    user: username,
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

export async function getUserTeams(username) {
  const teams = await loadTeams();
  return Object.values(teams).filter(t => t.members.some(m => m.username === username));
}

export async function getUserRole(teamId, username) {
  const teams = await loadTeams();
  const team = teams[teamId];
  if (!team) return null;
  const member = team.members.find(m => m.username === username);
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
