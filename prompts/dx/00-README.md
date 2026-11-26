# prompts/dx: make XActions easier to use

23 prompts, one task each. Together they make the tools, scripts and APIs in this
repository easier to find, install and run. Every prompt is self-contained: hand one
file to one agent with a fresh context.

Numbers quoted in the prompts were measured on 2026-11-26. Re-measure before you rely
on one; the command to do so is next to each number.

## Order

Prompts in the same wave touch different files and can run at the same time. A later
wave starts after the prompts it names have merged.

**Wave 1 (parallel)**

- `01` browser scripts: one home, one manifest
- `06` README: merge repeated sections
- `10` split `src/mcp/server.js`
- `13` split `src/cli/index.js`
- `16` static `openapi.json`
- `17` nightly live verification
- `18` CLI and MCP Docker image
- `20` devcontainer
- `23` `node:sqlite` evaluation

**Wave 2**

- `02` `xactions script` command (needs 01 and 13)
- `03` userscript build (needs 01)
- `04` extension generated from the manifest (needs 01)
- `05` browser script safety defaults (needs 01)
- `07` docs restructured by lane (needs 06)
- `11` MCP tool annotations (needs 10)
- `12` MCP presets and prompts (needs 10)
- `14` CLI output contract (needs 13)
- `15` `doctor --report` and issue forms (needs 13)
- `19` plugin and workflow scaffolds (needs 13)

**Wave 3**

- `08` docs site and generated pages (needs 01 and 07)
- `09` library types and exports (needs 10 and 13)
- `21` sibling projects extraction (owner decisions inside)
- `22` root layout and deploy configs (needs 18)

## How to run one

Give each agent its own worktree so parallel prompts cannot collide:

```bash
git worktree add ../XActions-dx-01 -b dx/01-browser-scripts
cd ../XActions-dx-01 && npm ci
```

Then hand the agent the prompt file and nothing else. Merge branches in wave order.

## Rules every prompt inherits

1. **Read `AGENTS.md` first.** It is the source of truth for how this repository works.
2. **Other agents are working here.** Stage explicit paths, never `git add -A`. Re-read a
   file before you edit it if time has passed. Work on `src/xapi/` and `docs/x-api/` was
   in progress on 2026-11-26, with uncommitted edits in `src/mcp/server.js`,
   `src/mcp/tool-groups.js`, `src/cli/index.js`, `README.md` and `docs/`. Do not touch
   `src/xapi/` or `docs/x-api/` unless your prompt says so, and do not start prompts 06,
   10 or 13 until `git status` shows that work has been committed.
3. **Nothing is removed without the owner's yes.** A move leaves the old path working
   (the prompt says how). When you find something that should be deleted, list it in
   your report with the one command that deletes it.
4. **No mocks, no stubs, no placeholder data, no TODO comments.** Finish what you start.
5. **Behaviour changes are test-first.** Write the test, watch it fail for the right
   reason, then change the code.
6. **Lint, types and coverage are ratchets.** Fix your code; never regenerate
   `eslint-suppressions.json` or `config/typecheck-baseline.json` to get a pass.
7. **Run before you report:** `npm test`, `npm run lint`, `npm run typecheck`,
   `npm run docs:check`.
8. **Document what users will notice.** Add a `CHANGELOG.md` entry under `[Unreleased]`
   and update the doc that covers the feature. Counts in `AGENTS.md`, `README.md` and
   `llms.txt` are checked by `docs:check`; keep them true.
9. **Commit locally, do not ship.** One commit per topic, a subject that describes the
   change. Do not push, publish to npm or PyPI, create a release, create a repository,
   or change a registry listing. Prepare it so that step is one command and name the
   command in your report.
10. **The machine is shared with other projects.** Work only inside your worktree. Never
    stop a process you did not start, and never bind a port that is already in use
    (3000 often is: pick a free one and pass it explicitly). Run one test suite at a
    time. If a tool your prompt needs is missing (Docker, for example), do not install
    it system-wide: finish everything else and report which checks you could not run.
11. **House style:** ES modules, `const` over `let`, async/await, the Apache-2.0 notice
    and `@author nich (@nichxbt)` on every new file. Do not use the em-dash or en-dash
    characters anywhere.

## What to report

What changed, what you ran and what it printed, anything you chose not to do and why,
and the one command for each step that needs the owner.
