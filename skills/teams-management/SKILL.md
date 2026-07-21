---
name: teams-management
description: Create and manage teams in XActions — invite members, assign roles, and collaborate on automation tasks. Use when users want to set up multi-user access or team-based account management.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Teams Management

API-powered team management for collaborative XActions usage.

## Entry Points

| Goal | Route | Method |
|------|-------|--------|
| Create a team | `POST /api/teams` | REST API |
| List teams | `GET /api/teams` | REST API |
| Get team details | `GET /api/teams/:id` | REST API |
| Invite a team member | `POST /api/teams/:id/invite` | REST API |
| Update member role | `PATCH /api/teams/:id/members/:userId` | REST API |
| Remove a member | `DELETE /api/teams/:id/members/:userId` | REST API |
| Delete a team | `DELETE /api/teams/:id` | REST API |

## API Usage

### Create a team

```bash
POST /api/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Marketing Team",
  "description": "Handles brand account automation"
}
```

### Invite a member

```bash
POST /api/teams/:id/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "colleague@example.com",
  "role": "editor"
}
```

## Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full access, can delete team, manage billing |
| `admin` | Manage members, create automations |
| `editor` | Create and run automations, view reports |
| `viewer` | View reports and analytics only |

## Notes

- Teams are scoped per XActions account
- Invitations are sent via email; invitees must create or link an XActions account
- Role permissions are enforced at the API middleware level
- Teams share operation quotas by default (configurable per team)

## Related Skills

- **delegate-access** — Grant X-native delegate access to post on your behalf
- **billing-management** — Manage subscription plans for your team
- **xactions-mcp-server** — Use the MCP server for team-level AI agent access
