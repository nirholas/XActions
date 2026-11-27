# Docker: the CLI and the MCP server with no Node install

```bash
docker run --rm ghcr.io/nirholas/xactions-cli profile nasa
```

That is the whole install. The image carries the `xactions` command, the MCP
server and the Node runtime they need (the project itself needs Node 22.19 or
later, which many machines do not have).

This is not the API server image. `ghcr.io/nirholas/xactions` is the Express
backend and dashboard: it runs Prisma migrations at start and expects
PostgreSQL and Redis. See [deployment.md](deployment.md) for that one.

## Tags

| Tag | What is in it |
|-----|---------------|
| `latest`, `<version>` (for example `5.0.0`), `<major>.<minor>` | The CLI and MCP server, no browser. HTTP reads, the guest tier, logged-in reads, MCP over stdio and HTTP |
| `browser`, `<version>-browser`, `<major>.<minor>-browser` | The same plus Debian's Chromium and the optional dependencies (Puppeteer and its stealth plugin, the x402 and Bluesky clients) |
| `main`, `main-browser` | Built from the main branch after CI passes |

Both are published for `linux/amd64` and `linux/arm64`.

Use `:browser` for the commands that drive a browser: `bulk`, `persona run`,
`agent`, and the MCP write tools (follow, post, like and the rest, in the
default local mode). Every read works on the default tag. `xactions connect`
opens a visible browser window and so does not work in a container on either
tag; log in with a cookie file or the environment variable instead (below).

## Keep state in a volume

The image sets `XACTIONS_HOME=/data`. Everything XActions saves goes there: the
session cookie jar, the GraphQL query-ID cache, scrape checkpoints, the daily
action ledger the MCP server charges writes against, held drafts. Mount a named
volume to keep it between `--rm` runs:

```bash
docker run --rm -v xactions:/data ghcr.io/nirholas/xactions-cli tweets nasa --limit 20 --compact
```

The container runs as the non-root `node` user (uid 1000). A new named volume
is created owned by that user, so the first run can write to it. To use a host
directory instead, make it writable by uid 1000, or run as yourself:

```bash
mkdir -p ~/.xactions
docker run --rm --user "$(id -u):$(id -g)" -v ~/.xactions:/data ghcr.io/nirholas/xactions-cli doctor
```

That last form shares one session between the container and a host install of
`xactions`.

## Log in without a browser

Public reads (`profile`, `tweets`, `thread`, `media`, `analyze`, `hashtag`)
need no account. Search, followers, likes, bookmarks and DMs need a session.

**From an exported cookies file**, saved into the volume once:

```bash
docker run -i --rm -v xactions:/data ghcr.io/nirholas/xactions-cli login --cookies-file - < cookies.txt
```

`-` reads the file from stdin, so it works whatever the file's owner and
permissions on the host. It takes the same formats as a path: a Netscape
`cookies.txt`, a Cookie-Editor or EditThisCookie JSON export, a Playwright or
Puppeteer `storageState`, or a raw `auth_token=...; ct0=...` string. A mounted
file works too when uid 1000 can read it:

```bash
docker run --rm -v xactions:/data -v "$PWD/cookies.txt:/cookies.txt:ro" \
  ghcr.io/nirholas/xactions-cli login --cookies-file /cookies.txt
```

**From the environment**, per run, with nothing saved:

```bash
export XACTIONS_SESSION_COOKIE=...   # the auth_token cookie
export XACTIONS_CSRF_TOKEN=...       # optional: the ct0 cookie, which writes need
docker run --rm -e XACTIONS_SESSION_COOKIE -e XACTIONS_CSRF_TOKEN ghcr.io/nirholas/xactions-cli followers nasa --limit 100 --compact
```

`-e NAME` with no value forwards the variable from your shell, so the cookie
is not written on the command line. No cookie or other secret is baked into
the image.

## The MCP server

Over stdio, for a local client. `xactions mcp` is the server; every argument
after it goes to the server (`--tools`, `--exclude`, `--require-approval`):

```bash
docker run -i --rm -v xactions:/data ghcr.io/nirholas/xactions-cli mcp --tools read,analytics
docker run -i --rm -v xactions:/data --entrypoint xactions-mcp ghcr.io/nirholas/xactions-cli
```

`xactions mcp-config --docker` prints the client config for that. Run it from
the image if XActions is not installed on the host:

```bash
docker run --rm ghcr.io/nirholas/xactions-cli mcp-config --docker
docker run --rm ghcr.io/nirholas/xactions-cli mcp-config --docker --client cursor --image ghcr.io/nirholas/xactions-cli:browser
```

```json
{
  "mcpServers": {
    "xactions": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "xactions:/data", "-e", "XACTIONS_SESSION_COOKIE", "ghcr.io/nirholas/xactions-cli:latest", "mcp"],
      "env": { "XACTIONS_SESSION_COOKIE": "your_auth_token_here" }
    }
  }
}
```

Replace the placeholder, or delete `env` to use the session saved in the
volume. Keep the `-i`: stdio MCP needs stdin open. The container exits when
the client disconnects.

Over Streamable HTTP, for a remote client or several local ones. The image
listens on port 3000 on every interface; set a token whenever the port is
reachable from anywhere but your own machine:

```bash
docker run -d --name xactions-mcp -p 3000:3000 \
  -e XACTIONS_MCP_TOKEN=change-me -v xactions:/data \
  ghcr.io/nirholas/xactions-cli mcp --http

curl -s http://localhost:3000/health
```

Clients connect to `http://localhost:3000/mcp` and send
`Authorization: Bearer change-me`. Behind a reverse proxy on another hostname,
also set `XACTIONS_MCP_ALLOWED_HOSTS`. [mcp-setup.md](mcp-setup.md) has the
client side.

## Build it yourself

From the repository root:

```bash
docker build -f deploy/docker/cli.Dockerfile -t xactions-cli .
docker build -f deploy/docker/cli.Dockerfile --target browser -t xactions-cli:browser .
```

The Dockerfile packs the repository with `npm pack`, so the image holds exactly
the files the npm package publishes, and installs the root package's
production dependencies from the lockfile, without the `api/` workspace.

Check a build the way CI does: `--version`, a live `profile nasa --compact`
against the guest tier, the volume's owner, and an MCP `initialize` and
`tools/list` over stdio. It needs Docker and Node on the host:

```bash
deploy/docker/smoke.sh xactions-cli
deploy/docker/smoke.sh xactions-cli:browser --browser
```

## Environment

| Variable | Default in the image | Effect |
|----------|----------------------|--------|
| `XACTIONS_HOME` | `/data` | Where state is saved |
| `XACTIONS_SESSION_COOKIE` | unset | The `auth_token` cookie; wins over a saved session |
| `XACTIONS_CSRF_TOKEN` | unset | The `ct0` cookie, with `XACTIONS_SESSION_COOKIE` |
| `XACTIONS_MCP_TOKEN` | unset | Bearer token required by `mcp --http` |
| `PORT` | `3000` | Port for `mcp --http` |
| `XACTIONS_MCP_HOST` | `0.0.0.0` | Bind address for `mcp --http` |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium` (`:browser` only) | The browser Puppeteer launches |

Everything else in [the MCP environment table](mcp-setup.md) and
[cli-reference.md](cli-reference.md#environment-variables) applies unchanged.
