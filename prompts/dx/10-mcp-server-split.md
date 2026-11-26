# 10: split the MCP server into one module per tool domain

Read `prompts/dx/00-README.md` first. Wave 1. Prompts 09, 11 and 12 build on this.

## Goal

Each MCP tool is defined in one small module: its name, description, input schema, group
and handler together. `src/mcp/server.js` becomes transport and dispatch only. Behaviour
does not change at all.

## Why

`src/mcp/server.js` is about 5,500 lines (`wc -l src/mcp/server.js`) holding the table of 165
tools and several dispatch paths. Adding one tool means editing a file nobody can hold in
their head, a contributor's first PR conflicts with everyone else's, and tool metadata
cannot be read as data by docs or registry tooling.

`src/mcp/tool-groups.js` had uncommitted edits by another agent on 2026-11-26 (it imports
from `src/xapi/`). Check `git status` and `git log -5 -- src/mcp` before you start, and
rebase onto whatever has landed.

## Do

1. **Pin behaviour before moving anything.** Write a snapshot test that records, from the
   current server: the full `tools/list` payload (names, descriptions, schemas, order),
   the group of every tool, the result of `--tools`/`--exclude` filtering for several
   selections including `writes`, and which tools the approval gate holds. Commit it
   first. It must pass unchanged at the end.
2. **Layout:** `src/mcp/tools/<domain>.js`, one file per group (read, write, dm, lists,
   spaces, analytics, ai, grok, automation, monitoring, workflows, persona, orgs, graph,
   data, x402, drafts, auth, xapi: `GROUP_NAMES` in `src/mcp/tool-groups.js` is the list). Each exports an array of tool definitions with the handler
   on the definition. `src/mcp/tools/index.js` assembles them in the current order.
3. **Keep the public names.** `TOOLS` stays exported from `src/mcp/server.js` (AGENTS.md
   documents `m.TOOLS`, and `scripts/sync-registry.mjs` counts tools by reading the
   `const TOOLS = [` literal in that file: update that script to import the assembled
   list instead, and keep its `--check` passing).
4. **One dispatch path.** Where the file has several, route them through one lookup from
   tool name to handler. Keep the approval gate (`drafts.js`), the action caps
   (`action-caps.js`) and the x402 wrapper in front of the handler exactly as now.
5. Move in small commits, one domain at a time, running the snapshot test after each.
6. Update `CONTRIBUTING.md` with "Add an MCP tool": the one file to touch and the test
   to run.

## Do not

- Do not rename a tool, change a description, change a schema, or reorder the list.
- Do not add annotations, presets or prompts (prompts 11 and 12).
- Do not touch `edgeServer.js`, `edgeTools.js` or `edgePrompts.js`.

## Done when

- The snapshot test from step 1 passes unmodified.
- `src/mcp/server.js` holds no tool definitions; report its new line count.
- `npm run registry:sync -- --check` and the existing MCP tests pass.
- `npx xactions-mcp` over stdio answers `initialize` and `tools/list` (run it and show
  the tool count).
