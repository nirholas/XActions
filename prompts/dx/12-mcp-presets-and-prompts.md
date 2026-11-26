# 12: MCP presets by job, and the skills as MCP prompts

Read `prompts/dx/00-README.md` first. Wave 2. Needs 10 merged. Run after 11 if both are
in flight, since both edit tool metadata.

## Goal

A new user starts the MCP server for a job by name instead of learning 19 group names,
and every MCP client can use the 50 skills, not only clients that install skill files.

## Why

- The server advertises 165 tools, about 60 KB of schema. `AGENTS.md` tells agents not
  to load them all and lists 19 groups to choose from. That is the right mechanism with
  no easy way in.
- The local server exposes no MCP prompts and no resources:
  `grep -n "prompts\|resources" src/mcp/server.js` printed nothing on 2026-11-26. The
  hosted edge server has `src/mcp/edgePrompts.js`. The 50 skills in `skills/` reach only
  clients that support skill directories.

Check the current MCP specification for prompts and resources before implementing.

## Do

**Presets**

1. Define presets as data in `src/mcp/presets.js`: a name, one line saying who it is
   for, and the groups and individual tools it selects. Start with: `research` (read,
   analytics), `monitor` (read, monitoring, analytics), `community-manager` (read, write,
   dm, lists, drafts, with approval on), `growth` (read, write, automation, persona,
   drafts), `data` (read, data, graph), `read-only` (everything without a side effect),
   `full`. Size each one: tool count and schema bytes.
2. `--preset <name>` and `XACTIONS_MCP_PRESET`, composing with `--tools` and `--exclude`
   in a documented order. A preset that includes writes turns
   `XACTIONS_MCP_REQUIRE_APPROVAL` on unless the user set it explicitly.
3. `xactions mcp-config --preset <name>` writes the preset into the client config, and
   with no preset given on a terminal, asks which one, showing the tool counts.
4. Add the preset choice to the `.mcpb` install prompt (`scripts/build-mcpb.mjs`).

**Prompts and resources**

5. Serve each skill as an MCP prompt: name and description from the `SKILL.md`
   frontmatter (`skills/index.json` is the index), arguments where the skill takes a
   target account or topic, body from the skill. Only list prompts whose tools are
   loaded under the current filter.
6. Serve as resources: the skill files, the browser script manifest when it exists, and
   the current session status (`doctor` output as JSON).
7. Declare the `prompts` and `resources` capabilities only when the lists are non-empty.

## Do not

- Do not copy skill text into source files. Read the skill files at start-up.
- Do not change default behaviour: with no preset and no filter, the tool list is what
  it is today.

## Done when

- Tests cover each preset's tool set, the composition order, the approval default, and
  `prompts/list`, `prompts/get`, `resources/list`, `resources/read`.
- A real client session (the SDK client in a test, over stdio) lists and fetches a
  prompt.
- `docs/mcp-setup.md`, `AGENTS.md`, `CLAUDE.md` and README document presets with their
  sizes; the tarball smoke test still passes with `skills/` read from the package.
