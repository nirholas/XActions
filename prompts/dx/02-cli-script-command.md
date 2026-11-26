# 02: `xactions script`, the browser scripts from the terminal

Read `prompts/dx/00-README.md` first. Wave 2. Needs 01 (the manifest) and 13 (the CLI
split) merged.

## Goal

A user can find, read and copy any browser console script without opening GitHub.

## Why

The CLI has about 60 commands (`node src/cli/index.js --help`) and none of them surfaces the
browser scripts, which are the most used part of the project. Today the path is: find
the right file on GitHub among several look-alikes, open raw, select all, copy.

## Do

Add a `script` command in its own module under `src/cli/commands/`, reading
`browser/index.json`:

- `xactions script list [--category <c>] [--writes|--read-only]`: id, title, the page to
  be on. Honour the global `--compact`, `--fields` and `--json` flags.
- `xactions script show <id>`: description, page, config options with defaults, whether
  it writes, whether it needs `core.js`, and the legacy paths.
- `xactions script copy <id> [--set key=value ...] [--with-core]`: put the script on the
  clipboard (pbcopy, wl-copy, xclip, xsel, clip.exe, whichever exists) and print the page
  to open. `--set` rewrites `CONFIG` defaults using the manifest's config schema and
  rejects unknown keys and wrong types. With no clipboard tool, say so and print the
  script to stdout.
- `xactions script print <id>`: the script on stdout, for pipes.
- `xactions script open <id>`: open the right x.com page in the default browser.
- A script that writes and does not default to dry run prints a one-line warning on
  `copy`.

Ship the scripts: add `browser/` (including `index.json`) to `files` in `package.json`.
Check the size cost with `npm pack --dry-run` and report it. The tarball smoke test in
`.github/workflows/ci.yml` must cover `xactions script list`.

Register the command under the right help group and add it to the shell completion in
`src/cli/commands/completion.js`.

## Do not

- Do not execute a browser script from Node. This command hands the script to the user.
- Do not add a second copy of the script list; read the manifest.

## Done when

- Tests cover list filtering, `--set` validation (unknown key, wrong type), the
  no-clipboard fallback and an unknown id (exit code non-zero, a suggestion of the
  closest id).
- `npm pack` then installing the tarball in a temp directory runs `xactions script list`.
- `docs/cli-reference.md`, `docs/browser-scripts.md` and `AGENTS.md` describe it, and the
  command count in each is correct (`npm run docs:check`).
