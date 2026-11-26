# 15: bug reports that arrive with the facts

Read `prompts/dx/00-README.md` first. Wave 2. Needs 13 merged.

## Goal

A user with a problem runs one command and pastes the result into an issue form that
requires it, so the first reply can be a fix instead of a question.

## Why

- `xactions doctor` prints a human report and has one flag, `--refresh-ids`
  (`node src/cli/index.js doctor --help`). There is nothing machine-readable and nothing
  made to paste.
- `.github/ISSUE_TEMPLATE/bug_report.md` is a free-form Markdown template. Its example
  runtime is "Node.js 20" while `package.json` requires `>=22.19`.
- Many past issues were packaging, install and start-up faults (numbers 9, 11, 35, 36, 87) where
  the version, platform and install method were the whole diagnosis.

## Do

1. **`xactions doctor --json`**: every check as an object with `id`, `status`
   (`ok`, `warn`, `fail`), `detail` and `fix`. Stable ids. Exit non-zero when any check
   fails.
2. **`xactions doctor --report`**: a Markdown block for pasting. Include: xactions
   version, how it was installed (global, npx, local clone, Docker: detect it), Node
   version, OS and architecture, which optional dependencies are present (Puppeteer and
   the others `src/utils/optionalDeps.js` knows), guest tier result, whether a session
   is saved and whether it carries `ct0`, query-ID cache age, MCP server self-test,
   installed skills count.
3. **Redaction is the point.** The report never contains a cookie, token, username,
   account id, proxy URL, home directory path or environment variable value. Write the
   test for this first: feed the collector a state full of secrets and assert none
   appear in the output.
4. **`xactions doctor --issue`**: print the report and a prefilled new-issue URL (title
   and body in the query string). Print the URL; open the browser only with `--open`.
5. **Add checks worth having**, each with a fix line: Node version against `engines`,
   the native SQLite module loads, `XACTIONS_HOME` is writable, clock skew (signed
   requests fail on a wrong clock), a stale global install shadowing a newer one.
6. **Issue forms.** Replace the Markdown templates with YAML forms in
   `.github/ISSUE_TEMPLATE/`: bug (required: doctor report, the command run, what
   happened, what was expected; a dropdown for the lane: CLI, MCP, browser script,
   extension, library, API, hosted), feature request, and "a script stopped working on
   x.com" (script id, the page, the console error). Keep `config.yml` routing questions
   to Discussions.
7. Make failures point here: the CLI's top-level error handler ends with one line
   suggesting `xactions doctor --report`.

## Do not

- Do not send anything anywhere. No telemetry, no automatic issue creation.

## Done when

- The redaction test and tests for `--json` shape and exit codes pass.
- `docs/troubleshooting.md` starts with the report command.
- The forms validate (GitHub's schema: `name`, `description`, `body` with typed fields);
  say how you checked.
