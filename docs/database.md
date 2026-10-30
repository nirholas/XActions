# Database Schema

**You probably do not need this.** The CLI, the Node.js library, the MCP server,
and the browser console scripts all run with no database at all. This page is
for the self-hosted API server and dashboard, which persist users, jobs,
billing, and follower history in PostgreSQL via [Prisma](https://www.prisma.io/).

Schema: [`prisma/schema.prisma`](../prisma/schema.prisma). The Prisma CLI reads
`DATABASE_URL` (and `.env`) through [`prisma.config.js`](../prisma.config.js), and
the server connects through the PostgreSQL driver adapter in
[`src/utils/prisma.js`](../src/utils/prisma.js), the one client every module shares.
A `?schema=` parameter in the URL selects the PostgreSQL schema.

---

## Setup

```bash
# 1. Point at a database
export DATABASE_URL="postgresql://user:password@localhost:5432/xactions?schema=public"

# 2. Generate the typed client
npx prisma generate

# 3. Create the tables
npm run db:push        # fast, for development
npm run db:migrate     # versioned migrations, for anything you will deploy
```

Then optionally seed and inspect:

```bash
npm run db:seed        # sample rows
npm run db:studio      # browser UI at localhost:5555
```

Docker Compose brings up PostgreSQL and Redis together:

```bash
npm run docker:up
```

### db:push vs db:migrate

`db:push` reshapes the database to match the schema with no migration history.
It is fast and destructive, which is fine locally and wrong in production.
`db:migrate` writes a versioned migration you can review, replay, and roll back.
Use `db:migrate` for anything that will ever run somewhere you care about.

---

## The models

Eleven models in four groups.

### Accounts and billing

**`User`** — one row per account. Supports three sign-in paths: password, X
OAuth 2.0 (`twitterId`, `twitterAccessToken`), and guest (`isGuest`). `credits`
is the metered balance consumed by operations. `sessionCookie` holds the X
session used to run that user's jobs.

**`Subscription`** — the user's plan. `tier` and `status` mirror Stripe, with
`stripeCustomerId` and `stripeSubscriptionId` as the join keys. One per user.

**`Payment`** — Stripe charges. `creditsAdded` records what a one-off top-up
bought, so a balance can be reconstructed from history.

**`CryptoPayment`** — the same, settled on-chain. Carries `txHash`, `provider`,
and an `expiresAt` so an unconfirmed invoice does not sit pending forever.
Nullable `userId` because a payment can arrive before an account exists,
matched later by `email`.

**`License`** — self-hosted and white-label licensing. `maxUsers`,
`maxInstances`, `whiteLabel`, `customDomain`, and `apiAccess` are the feature
flags; `activations` and `instanceIds` track where a key is in use.

### Work

**`Operation`** — one user-initiated job (an unfollow sweep, a scrape) with its
`config`, `result`, `status`, and counters. This is the audit trail: what was
requested, what happened, what it cost in credits.

**`JobQueue`** — the durable work queue behind those operations. `status`,
`priority`, `attempts`, and `maxAttempts` drive retries; `error` and `failedAt`
capture the last failure. Indexed on `(status, priority)` because that is the
query the worker runs constantly.

Why both: `Operation` is what the user sees, `JobQueue` is how it gets done. One
operation can produce several queue entries.

### Follower history

This is what makes "who unfollowed me" possible. X does not expose it, so it has
to be diffed from snapshots over time.

**`FollowerSnapshot`** — the full follower list at a point in time, with
`totalCount`. Taken on a schedule.

**`FollowerChange`** — the diff between consecutive snapshots. `type` is
`follow` or `unfollow`, `detectedAt` is when the change was noticed (not when it
happened, which X does not reveal), and `followedSince` preserves how long they
had been following before they left.

**`UnfollowerSchedule`** — per-user polling config. `interval`, `nextRunAt`, and
an optional `webhookUrl` to notify on change. Indexed on `(active, nextRunAt)`
so the scheduler can find due rows cheaply.

**`AccountSnapshot`** — general-purpose account archive (profile, tweets, media)
keyed by `username` and `type`. Backs the account-backup and portability
features.

### Storage note

`followers`, `data`, `config`, `result`, and `metadata` are `String` columns
holding JSON rather than native `Json` columns. That keeps the schema portable
across PostgreSQL versions and SQLite, at the cost of not being able to query
inside them. Parse on read.

---

## Common queries

```js
import { prisma } from './src/utils/prisma.js';

// Who unfollowed a user in the last week
const lost = await prisma.followerChange.findMany({
  where: {
    userId,
    type: 'unfollow',
    detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  },
  orderBy: { detectedAt: 'desc' },
});

// Follower count over time
const history = await prisma.followerSnapshot.findMany({
  where: { username: 'nasa' },
  select: { totalCount: true, createdAt: true },
  orderBy: { createdAt: 'asc' },
});

// Claim the next job (worker loop)
const job = await prisma.jobQueue.findFirst({
  where: { status: 'pending', attempts: { lt: 3 } },
  orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
});

// A user's plan and remaining credits
const account = await prisma.user.findUnique({
  where: { id: userId },
  select: { credits: true, subscription: { select: { tier: true, status: true } } },
});
```

---

## Retention

`FollowerSnapshot` stores an entire follower list per row. On a large account
polled daily, that grows fast. Prune old snapshots once the changes have been
derived from them:

```js
await prisma.followerSnapshot.deleteMany({
  where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
});
```

`FollowerChange` rows are small and worth keeping: they are the history that
snapshots exist to produce.

---

## Changing the schema

1. Edit [`prisma/schema.prisma`](../prisma/schema.prisma).
2. `npx prisma migrate dev --name describe_your_change`
3. `npx prisma generate`
4. Commit both the schema and the generated migration.

CI runs `prisma migrate deploy`, falling back to `prisma db push` if no
migration applies, so a PR that changes the schema without a migration will
still pass tests but will not be deployable. Include the migration.

---

## Related

- [Configuration](configuration.md) — `DATABASE_URL` and the rest
- [REST API](rest-api.md) — the endpoints backed by these tables
- [Deployment](deployment.md) — running the server and its database
- [Architecture](architecture.md) — how the pieces fit together
