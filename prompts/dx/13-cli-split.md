# 13: split the CLI into one module per command group

Read `prompts/dx/00-README.md` first. Wave 1. Prompts 02, 09, 14, 15 and 19 build on this.

## Goal

Each CLI command lives in its own module under `src/cli/commands/`.
`src/cli/index.js` only builds the program and registers them. Behaviour does not change.

## Why

`src/cli/index.js` is about 4,040 lines (`wc -l src/cli/index.js`) with about 120 `.command(`
registrations. `AGENTS.md` already says "index.js registers most commands, commands/
holds the ones with their own modules", so the target pattern exists and most commands
have not been moved to it. Five planned changes need to add or edit commands; in one
file they collide.

## Do

1. **Pin behaviour first.** Write a snapshot test that records `--help` for the program
   and for every command and subcommand (names, descriptions, options, defaults, help
   group, order). Commit it. It must pass unchanged at the end.
2. Read the modules already in `src/cli/commands/` and follow their shape exactly
   (how they register, how they receive shared helpers).
3. Move shared code out of `index.js` into `src/cli/lib/`: config and session loading,
   the output helpers (`--compact`, `--fields`), spinners, error printing, the help
   grouping. One module per concern.
4. Move commands one help group at a time ("Read an account", "Followers and audience",
   and so on), one commit each, running the snapshot test and the existing CLI tests
   after each.
5. Keep start-up fast. Cold start measured 0.4 s (`time node src/cli/index.js
   --version`). Import a command's heavy dependencies inside its action, not at module
   top level. Report the time before and after.
6. The "More: not yet sorted into a group" bucket holds `ask` and `download`. Put them in
   the groups they belong to. This is the only visible change allowed; update the
   snapshot for it deliberately and say so.
7. `CONTRIBUTING.md` gets "Add a CLI command": the file to create, where it registers,
   the test to run.

## Do not

- Do not rename a command or option, change a default, or change output.
- Do not add global flags (prompt 14) or new commands.
- Do not change `bin` entries in `package.json`.

## Done when

- The help snapshot passes, changed only for step 6.
- `src/cli/index.js` contains no command actions; report its new line count.
- `npm test` passes; the tarball smoke test still runs the CLI.
- Cold start is not slower than before.
