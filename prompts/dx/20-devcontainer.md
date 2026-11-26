# 20: try it or contribute in one click

Read `prompts/dx/00-README.md` first. Wave 1.

## Goal

Opening the repository in GitHub Codespaces or a local dev container gives a working
environment: dependencies installed, tests runnable, the CLI on the path, with no setup
steps to read.

## Why

There is no `.devcontainer/` (`ls -d .devcontainer` fails). The project needs Node
`>=22.19`, has a native dependency (`better-sqlite3`), an optional Chromium for
Puppeteer, and an API that wants PostgreSQL and Redis. A first-time contributor meets
all of that before running one command. The repository has 117 forks; lowering that
first step is worth it.

## Do

1. **`.devcontainer/devcontainer.json`** on a maintained Node 22 base image (check which
   tag satisfies `>=22.19`). Features: GitHub CLI. `postCreateCommand` runs `npm ci` and
   links the CLI so `xactions` works in the terminal.
2. **Chromium:** install the system libraries Puppeteer needs so the browser paths run
   in the container. Verify by launching Puppeteer headless once in the container and
   say whether you could.
3. **Two configurations**, since most people only need the first:
   - `default`: library, CLI, MCP, tests. No services.
   - `full`: adds PostgreSQL and Redis through a compose file under `.devcontainer/`,
     sets `DATABASE_URL` and the Redis URL, runs `prisma migrate deploy`, and forwards
     port 3001 so `npm run dev` serves the API and dashboard.
4. **Editor setup:** recommended extensions that match the repository's tooling (ESLint,
   EditorConfig, Vitest, Prisma). Merge with `.vscode/` instead of duplicating it.
5. **A first-run message** (`postAttachCommand`): three lines. `xactions quickstart`,
   `npm test`, and where `AGENTS.md` is.
6. **Secrets:** nothing required. Document in `CONTRIBUTING.md` that a session cookie
   can be added as a Codespaces secret named `XACTIONS_SESSION_COOKIE` for logged-in
   features, and that a dedicated account should be used.
7. Add an "Open in Codespaces" badge to README's install section and a short
   "Develop in a container" section to `CONTRIBUTING.md`.

## Do not

- Do not put a credential in any devcontainer file.
- Do not change the production `Dockerfile` or `docker-compose.yml`.

## Done when

- The default container builds locally (`devcontainer build` or `docker build` of the
  resolved configuration), `npm test` passes inside it and `xactions profile nasa`
  returns real data. Show the output, or say exactly which of these you could not run
  and why.
- The full configuration starts the API and `/api/health` answers.
