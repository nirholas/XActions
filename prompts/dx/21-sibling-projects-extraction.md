# 21: give the Python and Spaces projects their own homes

Read `prompts/dx/00-README.md` first. Wave 3. This prompt prepares a change the owner
must approve; it stops before anything irreversible.

## Goal

`python/` and `xspace-agents/` are prepared to live as their own repositories with full
history, each installable from its ecosystem's package registry, and this repository
points to them. Nothing is deleted and nothing is pushed until the owner says yes.

## Why

- Together they are about a third of the tracked files: `git ls-files python | wc -l`
  (375 on 2026-11-26) and `git ls-files xspace-agents | wc -l` (1,004), out of 4,114.
- Each is already a separate project in everything but location. `xspace-agents/` is a
  pnpm and Turborepo TypeScript monorepo with its own lockfiles, CI workflow
  (`.github/workflows/xspace-agents.yml`), licence and `CLAUDE.md`. `python/` has its own
  licence, changelog, contributing guide, `mkdocs.yml` and `AGENTS.md`.
- `xspace-agent` is on npm at 0.2.0 (`npm view xspace-agent version`). The Python
  package directory is `python/xeepy`, and `https://pypi.org/pypi/xeepy/json` returned
  404 on 2026-11-26. Read the package metadata to learn the real distribution name
  before concluding it is unpublished.
- Someone who clones for a browser script downloads both. Someone who wants the Python
  library cannot `pip install` it under that name.

## Do

1. **Find every tie.** What in the root imports, builds, tests, lints, documents or
   deploys from either directory? Check `package.json`, `eslint.config.js`,
   `vitest.config.js`, `.github/workflows/`, `Dockerfile`, `.dockerignore`, the docs and
   the dashboard. What in either directory reaches back into the root? List all of it.
2. **Make each one stand alone** inside its directory: its own README install section,
   licence, CI definition and release steps that work when the directory is the
   repository root. Fix paths that assume the parent.
3. **Python packaging.** Make `python/` build a wheel and an sdist (`python -m build`),
   pass `twine check`, and install into a clean virtual environment where its CLI entry
   point and a real read both run. Fix what stops that. If the name is free on PyPI, say
   so; if not, propose one.
4. **Prepare the split with history:** `git subtree split --prefix=python -b
   split/python` and the same for `xspace-agents`. Verify each branch builds and tests
   pass from its root. These are local branches only.
5. **Prepare this repository's side** as a separate commit that is ready and not made:
   replace each directory with a short README naming the new home, update `AGENTS.md`,
   the root README, `docs/`, the workflow that builds `xspace-agents`, and the root's
   dependency on the published `xspace-agent` package.
6. **Write the runbook** at `docs/internal/sibling-split.md`: the exact commands, in
   order, for the owner: create the two repositories, push the split branches, publish
   to PyPI and npm, then apply the commit from step 5. Include how to roll back.

## Stop here and report

These need the owner's explicit yes, each one separately:

- creating a GitHub repository;
- pushing a split branch anywhere;
- publishing to PyPI or npm;
- removing either directory from this repository.

If the owner prefers to keep both in this repository, steps 2 and 3 still stand on their
own and make both projects installable.

## Done when

- Both split branches exist locally, build and pass their own tests from their roots.
- The Python package installs from its built wheel in a clean environment and runs.
- The runbook exists and every command in it has been dry-run where a dry run exists.
