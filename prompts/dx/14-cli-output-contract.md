# 14: one output contract for every CLI command

Read `prompts/dx/00-README.md` first. Wave 2. Needs 13 merged.

## Goal

Every command that returns data accepts the same output flags and writes to a file the
same way, so a user or a script learns it once.

## Why

- `--compact` and `--fields` are global. `--json` is per command (`AGENTS.md` says so),
  and many commands do not have it.
- `-f, --format` means four different things: graph formats (`html, gexf, d3`), report
  formats (`json,csv,xlsx,md,html`), `json or markdown`, and `json, csv`:
  `grep -n "\-\-format" src/cli/`.
- JSON Lines exists only on `dataset export`. A 50,000-row follower scrape as one JSON
  array cannot be streamed.

## Do

1. **Inventory.** For every command: does it return records, which output flags it
   takes, where it can write. Put the table in your report.
2. **Global flags**, implemented once in `src/cli/lib/`:
   - `--json`: the full structured result on stdout, nothing else on stdout.
   - `--jsonl`: one record per line, written as records arrive for paginated reads.
   - `--csv`: header row plus rows, with correct quoting.
   - `-o, --output <path>`: write to a file; the format follows the extension
     (`.json`, `.jsonl`, `.csv`, `.md`) unless a format flag is given.
   - Existing `--compact` and `--fields` keep working; `--fields` applies to every
     format.
   - Precedence when several are passed is defined, documented and tested. `AGENTS.md`
     says `--compact` wins over `--json` today: keep that.
3. **Stdout is data, stderr is everything else.** With a data format selected, spinners,
   progress, warnings and hints go to stderr, and colours are off when stdout is not a
   terminal. `NO_COLOR` is honoured.
4. **Keep every existing flag working.** Per-command `--json` and `-f/--format` remain
   accepted with their current meaning. Where `-f` is ambiguous, keep it and add the
   global flag beside it; do not repurpose it.
5. **Exit codes:** 0 success, non-zero on failure, and an empty result stays an error as
   `AGENTS.md` requires. With `--json`, an error is also a JSON object on stderr with a
   stable `code`.
6. Document the contract in one section of `docs/cli-reference.md` and in `AGENTS.md`
   ("The output contract"), replacing the per-command notes.

## Do not

- Do not change the default human-readable output of any command.
- Do not remove or change the meaning of an existing flag.

## Done when

- A table-driven test runs every data command's formatter with `--json`, `--jsonl`,
  `--csv`, `--compact` and `--fields` against recorded fixtures and checks stdout is
  parseable and stderr holds the rest.
- `xactions tweets nasa --limit 20 --jsonl | head -3` and the `--csv` equivalent run
  against the live guest tier; show the output.
- The help snapshot from prompt 13 is updated only by the new global flags.
