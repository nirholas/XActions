# Team Management

Create teams, invite members, assign roles with granular permissions, and track activity across shared XActions workspaces.

## Architecture

```
src/auth/
└── teamManager.js   # Team CRUD, RBAC, activity logging
```

**Storage:** `~/.xactions/teams.json`, `~/.xactions/users.json`, `~/.xactions/activity-log.json`

## Quick Start

### Node.js

```javascript
import {
  createTeam, inviteUser, acceptInvite, removeUser, listTeamMembers,
  updateRole, checkPermission, getActivityLog
} from 'xactions/src/auth/teamManager.js';

// Create a team (the owner is its first member)
const team = await createTeam('Growth Team', 'nichxbt');

// Invite a member by email; they join with the token the invite returns
const invite = await inviteUser(team.id, 'alice@example.com', 'member');
await acceptInvite(invite.token, 'alice');

// Update role, list members, remove someone
await updateRole(team.id, 'alice', 'admin');
const members = await listTeamMembers(team.id);
await removeUser(team.id, 'alice');

// Check permissions
const canRun = checkPermission('member', 'run-actions');  // true
const canManage = checkPermission('member', 'manage-team');  // false

// View activity log
const log = await getActivityLog(team.id);
```

## REST API

All routes prefixed with `/api/teams`. Requires authentication.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/teams` | Create a team |
| GET | `/api/teams/:id/members` | List team members |
| POST | `/api/teams/:id/invite` | Invite a user (email + role) |
| DELETE | `/api/teams/:id/members/:username` | Remove a member |
| PUT | `/api/teams/:id/members/:username/role` | Update a member's role |
| GET | `/api/teams/:id/activity` | Get team activity log |

Through the API, membership is keyed by user id, with the username kept on
each entry for display, so renaming an account keeps its teams and whoever
takes the old name inherits none of them. `:username` in a path names the
account that holds that username now. Entries saved before ids were recorded
are matched by username until their holder next signs in, then rewritten with
the id. The CLI and MCP tools have no user ids and keep working by username.

### Create a team

```bash
curl -X POST http://localhost:3001/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name": "Growth Team"}'
```

### Invite a member

```bash
curl -X POST http://localhost:3001/api/teams/<id>/invite \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "role": "member"}'
```

## Roles & Permissions

| Role | Level | Description |
|------|-------|-------------|
| `owner` | 100 | Full access — manage team, billing, delete |
| `admin` | 80 | Manage members, run all actions, view analytics |
| `member` | 50 | Run actions, view analytics, manage own data |
| `viewer` | 10 | Read-only access to analytics and results |

### Permission Matrix

| Permission | Owner | Admin | Member | Viewer |
|-----------|-------|-------|--------|--------|
| `manage-team` | Yes | Yes | — | — |
| `manage-members` | Yes | Yes | — | — |
| `run-actions` | Yes | Yes | Yes | — |
| `view-analytics` | Yes | Yes | Yes | Yes |
| `manage-billing` | Yes | — | — | — |
| `export-data` | Yes | Yes | Yes | — |
| `delete-data` | Yes | Yes | — | — |
| `manage-settings` | Yes | Yes | — | — |

## Activity Logging

All team actions are logged automatically:

```javascript
{
  timestamp: "2026-02-25T10:30:00Z",
  user: "alice",
  team: "team-abc123",
  action: "run-actions",
  details: { command: "get_followers", target: "nichxbt" },
  ip: "192.168.1.1"
}
```

View the log via API or Node.js:

```bash
curl http://localhost:3001/api/teams/<id>/activity
```
