# 06: README, merge what is said twice

Read `prompts/dx/00-README.md` first. Wave 1.

## Goal

`README.md` says each thing once. It keeps its depth and its length otherwise.

## Owner's instruction

Do not cut the README down. Remove repetition only. If you are unsure whether two
passages repeat each other, keep both and say so in your report.

## Why

The file is about 1,600 lines (`wc -l README.md`) and several sections exist twice, so a
reader meets two versions of the same instructions and cannot tell which is current.
Line numbers below are from 2026-11-26; find the sections again with
`grep -n '^#\{1,3\} ' README.md`.

- MCP over HTTP: "Run the server over HTTP" (near line 1015) and "Run the MCP server
  over HTTP" (near line 1494).
- Comparison: "How XActions Compares" (near line 100) and "Full Comparison Matrix" (near
  line 1538).
- Contributors: "Contributors" under Contributing (near line 1401) and a second
  "Contributors" at the end (near line 1586).
- Docker and install commands appear in more than one place.
- The table of contents sits near line 213, after several screens of content.

Another agent had uncommitted edits to `README.md` on 2026-11-26. Re-read the file and
check `git status` before every edit.

## Do

1. Read the whole file. List every pair of passages that cover the same thing.
2. For each pair, keep one section in the place a reader would look for it, merge any
   fact only the other one had, and leave nothing behind but a one-line link where the
   second one stood if readers are likely to arrive there.
3. Where the two copies disagree (a tool count, a command, a port), find out which is
   true from the code and keep that.
4. Move the table of contents to directly below the opening "try it" block and make it
   match the headings after your edits.
5. Keep every anchor that something links to. Search the repository, the dashboard pages
   and `llms.txt` for `README.md#` and `#readme` links and keep them resolving.
6. Add "Pick your lane" near the top if it is not there: six lines, one per way in
   (hosted with no install, paste a browser script, CLI, MCP for agents, Node library,
   self-hosted API), each linking to its section. This adds navigation; it replaces
   nothing.

## Do not

- Do not shorten, summarise or move content to other files.
- Do not touch the "Common Questions" section or the opening demo block.
- Do not change badges, counts or claims unless the code proves them wrong.

## Done when

- No two sections cover the same topic; your report lists each merge and the lines saved.
- `npm run docs:check` passes (it checks links, versions and counts).
- Every heading in the table of contents resolves.
