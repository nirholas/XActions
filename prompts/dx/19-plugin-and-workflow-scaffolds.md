# 19: start a plugin or a workflow from a template

Read `prompts/dx/00-README.md` first. Wave 2. Needs 13 merged.

## Goal

Someone who wants to extend XActions gets a working starting point from one command
instead of reading the engine.

## Why

- `xactions plugin` has `install`, `remove`, `list`, `enable`, `disable` and `discover`,
  and no way to create one (`node src/cli/index.js plugin --help`). The audit notes only
  two plugins exist in-tree.
- `xactions workflow create` takes a JSON file or prompts interactively. Three ready
  examples sit in `src/workflows/examples/` (`auto-engage-keywords.json`,
  `competitor-monitor.json`, `follower-growth-report.json`) where the CLI does not show
  them.

## Do

**Plugins**

1. Read `src/plugins/`, `docs/plugins.md` and the two existing plugins to learn the real
   contract: what a plugin can register (scrapers, MCP tools, automation actions), how
   it is discovered, how it is named.
2. `xactions plugin create <name> [--type scraper|mcp-tool|action] [--dir <path>]`
   writes a complete, working `xactions-plugin-<name>` package: `package.json` with the
   right keywords and peer dependency, an entry file that registers one real, small
   capability of the chosen type, a test that loads it through the real plugin loader,
   and a README. Generated from template files under `src/plugins/templates/`, shipped
   in the npm package.
3. `xactions plugin validate [path]` checks a plugin against the contract and explains
   each failure. `plugin install` runs it and refuses an invalid plugin with the reason.
4. `docs/plugins.md` gets a ten-minute walkthrough from `create` to `install` to seeing
   the capability in `xactions plugin list` and, for an MCP tool, in `tools/list`.

**Workflows**

5. Move the examples to a templates directory with a small index (id, title,
   description, what it needs: a session, a webhook URL, a schedule). Keep the old paths
   working.
6. `xactions workflow templates` lists them. `xactions workflow init <template>
   [--set key=value]` creates a workflow from one, asking for the values it needs when
   on a terminal, and validating the result with the engine's own validator.
7. Add templates for the jobs people ask for most, each run for real before it ships:
   alert on a new unfollower, daily digest of mentions to a webhook, weekly follower
   report to a file, repost from an RSS feed with approval. Use only actions and
   triggers that `xactions workflow actions` lists.
8. A JSON Schema for workflow files, generated from `src/workflows/` (actions,
   conditions, triggers), published at a stable path so editors validate and complete
   workflow JSON. The schema must agree with the engine: test both directions.

## Do not

- Do not generate a plugin that only logs a message. The template must do something real.
- Do not publish a plugin to npm.

## Done when

- A test runs `plugin create` into a temp directory for each type, installs the result
  through the real loader and exercises the capability.
- A test creates each workflow template and passes it through the validator; you ran at
  least two templates end to end and say what happened.
- Help snapshot, `docs/cli-reference.md`, `docs/workflows.md` and the command counts are
  updated.
