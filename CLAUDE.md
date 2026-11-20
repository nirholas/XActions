# XActions: instructions for Claude

**Read [AGENTS.md](AGENTS.md).** It is the single source of truth for how to work in this
repository, and it is kept current. This file adds only what is specific to Claude; it
deliberately does not restate AGENTS.md, because the last time four files described the
repository they drifted apart and an agent worked a whole session from the stale one.

AGENTS.md answers, in this order: which lane to use (shell out to the `xactions` CLI, or
load the MCP server), the CLI lane and its output contract, the MCP lane, a table from
common request to the exact file that answers it, the skills, the directory map and the
three runtime contexts, and the mistakes that have actually cost people time here.

## Claude Code specifics

Install the skills so they are available in every session:

```bash
xactions skills install --all --global   # writes ~/.claude/skills/<id>/
xactions skills install --all            # or ./.claude/skills/ in this project
xactions skills list                     # what is installed, and from where
```

Add the MCP server:

```bash
claude mcp add xactions -- npx -y xactions-mcp
```

Load only the tools the session needs. The full list is 160 tools and about 60 KB of
JSON before you have read a single tweet:

```bash
claude mcp add xactions -- npx -y xactions-mcp --tools read,analytics
```

Hold every write for human approval before you let an agent near a real account:

```bash
XACTIONS_MCP_REQUIRE_APPROVAL=1 npx xactions-mcp
```

Writes then become drafts, released with `xactions drafts approve <id>` or the
`x_approve_draft` tool. Independently of that gate, every write is charged against a
rolling 24 hour per-account cap that survives a restart.

## Claude Desktop

`.mcpb` is a bundle the user drags onto Settings > Extensions. It carries the server and
its dependencies and prompts for the session cookie and the tool groups at install time,
so nothing is typed into a config file. Built by `node scripts/build-mcpb.mjs` and
attached to each release.

Everything else is in [AGENTS.md](AGENTS.md).
