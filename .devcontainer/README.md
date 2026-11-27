# Dev containers

Two configurations. Open the repository in GitHub Codespaces, or in VS Code with
the Dev Containers extension (Reopen in Container), and pick one.

| | `XActions` (default) | `XActions (full: API, PostgreSQL, Redis)` |
|---|---|---|
| File | `devcontainer.json` | `full/devcontainer.json` |
| For | the library, the CLI, the MCP server, tests | the above, plus the API server and dashboard |
| Services | none | PostgreSQL 16 and Redis 7, from `full/compose.yaml` |
| Port | none | 3001, forwarded |

Most changes need only the default.

## What you get

Both build `Dockerfile`: the maintained `javascript-node` dev container image on
Node 22 (`engines.node` is `>=22.19`), Debian's Chromium for Puppeteer, and the
GitHub CLI. After the container is created, `post-create.sh` runs `npm ci`,
`npx prisma generate` and `npm link`, so `xactions` runs from this checkout in
any terminal. Each time the editor attaches, `first-run.sh` prints three lines:
the quickstart, the tests, and where `AGENTS.md` is.

The full configuration also sets `DATABASE_URL`, `REDIS_URL`, `REDIS_HOST` and
`REDIS_PORT` to the two services, runs `npx prisma migrate deploy`, and writes a
fresh `JWT_SECRET` and `SESSION_SECRET` to `~/.xactions-dev.env` inside the
container, which every new shell exports. Then:

```bash
npm run dev    # API and dashboard on port 3001
curl -s localhost:3001/api/health
```

## Logging in to X

Nothing is required. Public reads (`xactions profile nasa`, `xactions tweets
nasa`) work with no account. For logged-in features, use a dedicated X account,
never your main one, and either:

- in Codespaces, add a secret named `XACTIONS_SESSION_COOKIE` holding that
  account's `auth_token` cookie (GitHub > Settings > Codespaces > Secrets, scoped
  to this repository or your fork). Codespaces exports it into the container and
  the CLI and MCP server read it from there.
- in a local container, run `xactions login` or `xactions connect` inside it.

No file in this directory holds a credential, and none should.

## Changing it

`tests/devcontainer/config.test.js` checks these files: the Node line, the
Chromium install, the service wiring, the extension list against
`.vscode/extensions.json`, the three-line message, and that no credential is
committed here. Build it locally with the
[Dev Container CLI](https://github.com/devcontainers/cli):

```bash
npx @devcontainers/cli up --workspace-folder .
npx @devcontainers/cli up --workspace-folder . --config .devcontainer/full/devcontainer.json
```
