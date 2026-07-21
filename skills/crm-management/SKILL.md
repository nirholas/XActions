---
name: crm-management
description: Manage a CRM (Contact Relationship Management) system for your X followers and contacts. Tag, segment, search, and sync follower data. Use when users want to manage relationships with their X audience at scale.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# CRM Management

API-powered CRM system for managing relationships with your X followers and contacts.

## Entry Points

| Goal | Route | Method |
|------|-------|--------|
| List CRM contacts | `GET /api/crm/contacts` | REST API |
| Sync followers to CRM | `POST /api/crm/sync` | REST API |
| Tag a contact | `POST /api/crm/contacts/:id/tag` | REST API |
| Search contacts | `GET /api/crm/contacts?q=query` | REST API |
| Segment contacts | `GET /api/crm/segments` | REST API |
| Export contacts | `GET /api/crm/export` | REST API |

## API Usage

### Sync followers to CRM

```bash
POST /api/crm/sync
Authorization: Bearer <token>
```

Pulls your current followers from X and upserts them into the CRM database.

### Tag a contact

```bash
POST /api/crm/contacts/:id/tag
Authorization: Bearer <token>
Content-Type: application/json

{ "tag": "vip" }
```

### Search contacts

```bash
GET /api/crm/contacts?q=nichxbt&tag=vip&minFollowers=1000
Authorization: Bearer <token>
```

### Segment contacts

```bash
GET /api/crm/segments?criteria=engagement&threshold=high
Authorization: Bearer <token>
```

## Use Cases

| Goal | Approach |
|------|----------|
| Find your most engaged followers | `GET /api/crm/segments?criteria=engagement` |
| Tag VIP followers for special treatment | `POST /api/crm/contacts/:id/tag` with `{ "tag": "vip" }` |
| Export follower list to CSV/JSON | `GET /api/crm/export?format=csv` |
| Find followers above a follower threshold | `GET /api/crm/contacts?minFollowers=5000` |

## Notes

- CRM data is stored in PostgreSQL via Prisma (`User`, `FollowerSnapshot` models)
- Sync is incremental — only changed followers are updated
- Tags and segments are stored per-user in the database
- Requires authenticated API session (JWT or session cookie)

## Related Skills

- **follower-monitoring** — Track follower changes over time
- **lead-generation** — Qualify followers as B2B leads
- **analytics-insights** — Analyze engagement patterns
- **growth-automation** — Grow followers to add to CRM
