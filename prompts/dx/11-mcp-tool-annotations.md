# 11: tell MCP clients which tools are safe

Read `prompts/dx/00-README.md` first. Wave 2. Needs 10 merged.

## Goal

Every tool on the local MCP server carries the standard MCP annotations, so a client can
auto-approve reads and warn before destructive calls.

## Why

The six hosted edge tools set `annotations` (`grep -n annotations src/mcp/edgeTools.js`).
None of the 165 local tools do: `grep -c "readOnlyHint\|destructiveHint"
src/mcp/server.js` printed 0 on 2026-11-26. To a client, `x_get_profile` and a
delete-all-tweets tool look equally risky, so the user either approves 165 tools one
prompt at a time or turns approval off for all of them.

Check the current MCP specification for the annotation fields and their meanings before
writing any (`@modelcontextprotocol/sdk` in `node_modules`, and
modelcontextprotocol.io). Do not rely on memory for the field list.

## Do

1. For each tool definition under `src/mcp/tools/`, set `title` and `annotations`:
   `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`, each decided by
   reading the handler, not the name.
   - Read-only: fetches and returns, changes nothing on X and nothing in local state a
     user would care about.
   - Destructive: deletes, unfollows, blocks, removes, clears, leaves, overwrites.
   - Not destructive but a write: post, like, follow, bookmark, schedule, send.
   - Idempotent: calling twice with the same arguments leaves the same state.
2. **One source of truth for "is a write".** The `writes` selector in
   `src/mcp/tool-groups.js` (`WRITE_TOOLS`, `isWriteTool`, `ACTION_CLASS`), the approval gate and the action caps each already decide
   which tools write. Make all of them and the annotations read the same per-tool flag.
   If they disagree today about any tool, that is a finding: report each one, fix it
   test-first, and say what changed.
3. Add a test that fails when a tool has no annotations, when a tool held by the
   approval gate is marked read-only, and when a read-only tool is charged an action cap.
4. Show the annotations where people choose tools: the README tool table and
   `docs/mcp-setup.md` gain a column or a legend; `xactions mcp-config` help mentions
   that reads are marked for auto-approval.
5. Regenerate registry manifests with `npm run registry:sync`.

## Do not

- Do not mark a tool read-only because its name starts with `get`. Read the handler.
- Do not change tool names, schemas or behaviour.

## Done when

- `tools/list` from a running server shows annotations on all tools (print the counts
  per combination).
- The new test passes; the snapshot test from prompt 10 is updated only by the added
  fields.
- Your report lists every tool where the existing write classifications disagreed.
