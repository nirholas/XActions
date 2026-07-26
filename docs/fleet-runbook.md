# Fleet Runbook — operating 40+ X accounts from the CLI

Operational guide for the multi-account orchestrator (`src/orchestrator/`). Every
operation is a `xactions fleet …` subcommand — no loose scripts in the daily loop.
Read top to bottom the first time; after that use it as a lookup.

> **One invariant above all — the co-location ban.** An account whose proxy is
> dead, absent (in a fleet where any other account has one), or unverifiable is
> **parked**, never run from your own IP. X bans accounts that share an egress IP
> as a cluster. The fleet enforces this for you; do not defeat it with
> `--allow-direct` on real accounts.

---

## 0. Prerequisites

- Node 22 on `PATH`. If it is keg-only:
  ```bash
  export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
  ```
- Run from the repo root. The CLI entry is `src/cli/index.js`; below it is written
  as `xactions` (its installed name).
- **Credentials never enter the repo.** The account store lives at
  `~/.xactions/accounts.json`, mode `600`, outside this git tree. `.gitignore` also
  blocks `accounts*.json`/`accounts*.tsv` as a backstop.
- One command per account state change writes a run report to
  `~/.xactions/fleet-runs/<timestamp>.json`. Reports carry **no** cookies or proxy
  passwords — safe to keep and read.

---

## 1. Onboard accounts — `fleet import`

Two input shapes, auto-detected:

**Combolist** (one account per line), the common bulk format:
```
login:password:email:emailpassword:auth_token:2fa_secret
```
Only `login` (→ handle) and the 40-hex `auth_token` are used; everything else is
dropped. **These lists carry no `ct0`, so one is minted per account.** X's CSRF is
a double-submit check (header must equal the `ct0` cookie, which the client always
satisfies), so a self-minted `ct0` authenticates a valid `auth_token` — verified
live. Passwords, emails and 2FA secrets are **not** persisted.

**TSV / CSV** with a header row (columns matched by name, any order):
```
handle   auth_token   ct0   proxyUrl
handle   cookies                proxyUrl
```

Dry run first (writes nothing):
```bash
xactions fleet import ~/.xactions/accounts.tsv
```
Commit it (backs up any existing store, writes mode 600):
```bash
xactions fleet import ~/.xactions/accounts.tsv --write
```

Pair proxies **1:1 by line order** from a separate file (one URL per line):
```bash
xactions fleet import ~/.xactions/combo.txt --proxies ~/.xactions/proxies.txt --write
```
Import **refuses** if there are fewer proxies than accounts or any proxy repeats —
the fleet never double-books an egress IP. A duplicate `auth_token` across two
lines is a benign **skip** (one session, two labels); a real error (no token,
missing `ct0` in TSV, a handle appearing twice under *different* tokens) blocks the
whole write.

---

## 2. Validate before running — `fleet doctor`

Offline shape + hygiene check (no network): validity, duplicate handles, one
session wearing two labels, and file permissions.
```bash
xactions fleet doctor
```
Add a live probe (exits each account's egress, so run it once proxies are set):
```bash
xactions fleet doctor --live
xactions fleet doctor --live --only foxeva21
```
`--live` reports, per account: session alive (via an authenticated `HomeTimeline`
call) and whether the labeled handle resolves to a live, non-suspended account.

---

## 3. See what you have — `fleet list`

```bash
xactions fleet list
```
Handle, stored status, and the **redacted** proxy per account. A `✗` marks an
invalid record with the reason.

---

## 4. Liveness across the fleet — `fleet health`

```bash
xactions fleet health
xactions fleet health --only foxeva21
xactions fleet health --allow-direct   # proxy-less test only; never on real fleets
```
Buckets every account `alive` / `parked` through its own proxy and persists the
result. `401` → `expired`, `403` → `forbidden`, `429` → `limited` (parked, not
killed), a dead/absent proxy → parked `no-proxy`. Exits 0; parked accounts simply
do not run.

---

## 5. Run a read task — `fleet run`

```bash
xactions fleet run --task homeTimeline --params '{"limit":5}'
xactions fleet run --task homeTimeline --only foxeva21
xactions fleet run --task homeTimeline --dry-run     # prints the plan, touches nothing
XACTIONS_FLEET_CONCURRENCY=8 xactions fleet run --task homeTimeline
```
`--dry-run` shows task, per-account resolved proxy, and pinned user-agent, and
writes nothing. Concurrency is capped at `min(XACTIONS_FLEET_CONCURRENCY, live
accounts)`; in strict-proxy mode every live account owns its egress IP, so the cap
is also the IP count. 1–3 s inter-action jitter and a staggered opening wave are
automatic.

### Task registry

| Task | Reads/Writes | Notes |
|---|---|---|
| `homeTimeline` | read | **Default.** The account's own feed — auth-only, no handle. Works. |
| `searchTweets` | read | `--params '{"query":"…","limit":100}'` |
| `postTweet` | write | Prefer `fleet post` (adds the safety guards). |
| `likeTweet` | write | `--params '{"tweetId":"…"}'` |
| `followTarget` | write | `--params '{"username":"…"}'` |
| `ownTweets` / `scrapeProfile` / `scrapeFollowers` | read | ⚠️ **Currently broken** — see Troubleshooting. Use `homeTimeline`. |

---

## 6. Write safely — `fleet post` and `fleet rm`

`fleet post` re-implements every fleet guard and refuses rather than publish on any
doubt. Without `--confirm` it only previews:
```bash
xactions fleet post --handle foxeva21 --text "hello"            # preview, sends nothing
xactions fleet post --handle foxeva21 --text "hello" --confirm  # publishes
```
Guard order:
1. **Co-location** — refuses an un-proxied account in a proxied fleet (override:
   `--allow-direct`).
2. **Transparent proxy** — the proxy's egress IP must differ from the un-proxied
   baseline, or it refuses.
3. **Session + handle** — the session must authenticate and the labeled handle must
   be a live account.
4. **Identity binding (post-hoc)** — after publishing, the **author of the created
   tweet** is read back. If it is not the labeled handle, the tweet is **deleted
   automatically** and the command reports the mismatch. (No REST "who am I"
   endpoint survives on X, so identity is bound from the real outcome, not a
   promise.)

Roll a tweet back — deletes and **confirms it is actually gone** by re-fetching
(the delete call's own return value is not trusted):
```bash
xactions fleet rm --handle foxeva21 --id 1826000000000000000
```

---

## 7. Acceptance test (QA, not daily ops) — `scripts/fleet/gates.mjs`

Read-only end-to-end check of the whole surface. Reports `PASS / FAIL / VACUOUS /
SKIP` — **`VACUOUS` counts as failure** (a criterion that held only because nothing
ran). Not part of the operator loop; run it after code changes.
```bash
node scripts/fleet/gates.mjs
```

---

## 8. Troubleshooting & known gotchas

**All accounts park as `no-proxy`.** Either no proxy is set (and another account
has one → strict mode) or the proxy failed its self-test. Set a working proxy;
`fleet doctor --live` shows which.

**`fleet run --task ownTweets` (or `scrapeProfile`/`scrapeFollowers`) says "User
not found".** Real scraper bug: `resolveUserId` (`tweets.js:583`) and `scrapeProfile`
(`profile.js:190`) read `resp.data.user.result`, but `client.graphql` double-wraps —
the correct path is `resp.data.data.user.result`. Every username-based scraper
method is affected. **Use `homeTimeline`** (routed around it). The fix is one path
edit in `src/scrapers/**`, deferred under the no-touch rule.

**A write "succeeded" but nothing appeared.** `actions.js::postTweet`/`deleteTweet`
do not inspect the GraphQL `errors` envelope, and `client.request` only throws on
HTTP ≥ 400 — so X can reject a mutation with a `200`. `fleet post`/`fleet rm` and the
`postTweet` task now catch this and require a confirmed id; plain
`fleet run --task postTweet` inherits the task-level check.

**Legacy REST endpoints 404.** `verify_credentials.json` / `settings.json` are dead
for cookie sessions on every host — do not reintroduce them. Health and identity go
through GraphQL (`HomeTimeline`, `UserByScreenName`).

**Process hangs after a command.** Should not happen — every undici proxy pool is
closed on teardown. If it does, a dispatcher leaked; report it.

**SOCKS proxy.** Needs `npm install fetch-socks`; without it the account is parked,
never run direct. `http(s)://` needs nothing extra.

---

## 9. Reference

**Environment**
- `XACTIONS_FLEET_CONCURRENCY` — max parallel accounts (default 5).

**Files**
- `~/.xactions/accounts.json` — the store (mode 600, never in the repo).
- `~/.xactions/accounts.json.bak-<ts>` — automatic backup on every write.
- `~/.xactions/fleet-runs/<ts>.json` — per-run report (no secrets).

**Exit codes** — `0` success; `1` on any failure, refusal, or a write whose
identity binding could not be confirmed.

**Scaling to cluster (documented, not built).** The per-account unit (`runTask`) is
queue-agnostic: a Bull worker wraps the identical `runTask` with a per-account Redis
lock; the JSON store swaps to Prisma behind `accountStore`'s serialized write path;
compose bumps worker replicas. Nothing in the per-account path changes.
