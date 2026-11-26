# 09: types for every import path, and a deliberate public surface

Read `prompts/dx/00-README.md` first. Wave 3. Needs 10 and 13 merged.

## Goal

Every documented import path of the `xactions` package has accurate TypeScript types
generated from the source, and the package states which paths are public API.

## Why

- `package.json` declares about 20 subpath exports (`./scrapers`, `./mcp`, `./client`,
  `./analytics` and so on). Only the root has a `types` condition. An editor gives no
  completion for the rest.
- `types/index.d.ts` is hand-written (1,365 lines). The 2026-08-27 audit found 28
  runtime exports with no type and about 50 declared names that do not exist at runtime.
  Re-measure both before you start.
- `"./src/*": "./src/*"` exposes every internal file as public API, so any internal
  refactor can break a user.

## Do

1. **Measure the drift.** Script a comparison of the names each subpath exports at
   runtime against the names its types declare. Commit it as a test that fails on drift.
2. **Generate declarations from JSDoc.** Use `tsc` with `allowJs`, `declaration`,
   `emitDeclarationOnly` over the public entry points, output to a gitignored directory
   built by `prepack`. Fix JSDoc where the generated type is `any` on a public function:
   parameters, return shapes, the record types for tweet, profile and user. Keep the
   hand-written file only where generation cannot express something; say where.
3. **Add a `types` condition to every subpath** in `exports`, and make
   `npm run typecheck` consume them.
4. **Prove it from the outside.** In the tarball smoke test
   (`.github/workflows/ci.yml`), add a TypeScript file that imports from every subpath
   and compiles under `strict` against the packed tarball.
5. **Classify the wildcard.** Find what real users import through `./src/*`: the
   repository's own `examples/`, `docs/`, `skills/`, `packages/`, and the plugin
   packages. Give each such path a named export. Then mark `./src/*` deprecated in the
   docs and CHANGELOG with the release it will be removed in. Removing it is a breaking
   change for a major version and is the owner's call: do not remove it.
6. **One page:** `docs/library/` gets "Public API": every subpath, what it is for, one
   import example each, and the stability promise.

## Do not

- Do not rename or remove a runtime export.
- Do not raise the typecheck baseline to get a pass.

## Done when

- The drift test passes with zero undeclared runtime exports and zero phantom types.
- The outside-in TypeScript compile passes against the packed tarball.
- `npm pack --dry-run` shows the declarations in the tarball; report the size change.
