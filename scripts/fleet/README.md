# Fleet tooling

Everything the fleet operator needs is a `xactions fleet …` subcommand. The full
guide is **[docs/fleet-runbook.md](../../docs/fleet-runbook.md)**.

**No credentials live here.** The account store is `~/.xactions/accounts.json`
(mode 600), outside this git repository.

## Quick reference

```bash
xactions fleet import <file> [--proxies <f>] [--write]   # onboard accounts (mints ct0)
xactions fleet doctor [--live] [--only <h>]              # validate store (+ live probe)
xactions fleet list                                      # show accounts
xactions fleet health [--only <h>]                       # bucket alive/parked
xactions fleet run --task homeTimeline [--params <json>] # run a read task
xactions fleet post --handle <h> --text "…" [--confirm]  # guarded write (preview w/o --confirm)
xactions fleet rm --handle <h> --id <id>                 # delete + confirm gone
```

## What's still a script

`gates.mjs` — the read-only acceptance harness (QA, not daily ops). Reports
`PASS / FAIL / VACUOUS / SKIP`, where `VACUOUS` (a criterion that held only because
nothing ran) counts as failure. Run after code changes:

```bash
node scripts/fleet/gates.mjs
```
