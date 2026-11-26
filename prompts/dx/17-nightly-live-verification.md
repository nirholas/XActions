# 17: prove nightly that it still works against x.com

Read `prompts/dx/00-README.md` first. Wave 1.

## Goal

Every night an automated run exercises the real read paths against x.com and publishes
the result: a dated badge in the README and a status page that says which features work
today.

## Why

X changing its site is the main way this project breaks, and users cannot tell from the
repository whether a failure is theirs or everyone's. No workflow runs on a schedule:
`grep -ln "schedule:" .github/workflows/*.yml` prints nothing. The pieces exist:
`npm run check:endpoints`, `npm run sync:endpoints:check`, `xactions doctor`, and
`dashboard/status.html`. The 2026-08-27 audit asks for a "last verified against x.com on
DATE" badge.

## Do

1. **The probe:** `scripts/live-check.mjs`. Guest tier, no account, no secrets. For each
   check record `id`, `status`, `ms` and a short `detail`:
   - query-ID discovery from x.com's bundles succeeds;
   - profile, tweets, thread, media and hashtag reads return real rows for stable public
     accounts;
   - the transaction-id signing produces an accepted request;
   - the hosted edge endpoint (`xactions.app/mcp`) answers `tools/list` and one free
     read;
   - every selector in `docs/agents/selectors.md` that can be checked logged out still
     matches on a live page (Puppeteer).
   Output `status.json` with a timestamp and the package version. Exit non-zero when a
   check that passed last time fails.
2. **Be a good citizen.** A handful of requests per run, the project's normal delays,
   one retry with backoff, and a rate-limit response is recorded as `limited`, not as a
   failure.
3. **The workflow:** `.github/workflows/live-check.yml`, on a nightly `schedule` and
   `workflow_dispatch`. It runs the probe and publishes `status.json` where the site and
   the badge can read it without a commit to `main` each night (a `status` branch, a
   release asset on a fixed tag, or the Pages deployment: pick one, explain).
4. **Tell people.** On a new failure the workflow opens one issue labelled
   `x-changed` with the failing checks, or comments on the open one; it closes it when
   the checks pass again. Never more than one open at a time.
5. **Show it:** a README badge (shields.io endpoint badge reading `status.json`) saying
   "verified against x.com" with the date, and `dashboard/status.html` rendering the
   per-feature table from the same file. `xactions doctor` gains one line: the last
   public verification date and whether it passed, fetched with a short timeout and
   skipped silently offline.
6. **Logged-in checks are optional and off by default.** If the owner later adds a
   dedicated test account's cookie as a secret, the probe also checks search and
   followers. Build it, keyed on the secret's presence; do not ask for the secret.

## Do not

- Do not use a real personal account, and do not put any credential in the repository.
- Do not write to X in any check.

## Done when

- `node scripts/live-check.mjs` runs locally against the live guest tier; show the
  output.
- Tests cover the status file shape, the regression rule and the `limited` case using
  recorded responses.
- The workflow passes `actionlint` if available; say if it could not be run.
- Your report names what the owner does to turn it on (merge, and nothing else unless
  you needed a setting).
