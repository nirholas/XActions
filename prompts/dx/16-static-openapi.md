# 16: publish the API description as a file

Read `prompts/dx/00-README.md` first. Wave 1.

## Goal

The REST API and the hosted edge API each have a static, validated `openapi.json` that
ships with every release and is served by the site, plus the artifacts people import
into their own tools.

## Why

The descriptions exist only as JavaScript modules (`api/openapi.js`,
`src/edge/openapi.js`, `functions/openapi.json.js`). `git ls-files | grep -i openapi`
shows no static spec for the main API. Someone who wants a typed client, a Postman
collection or a no-code connector has to run the server first. The 2026-08-27 audit
lists "OpenAPI spec, then generated clients" as open.

## Do

1. **Emit:** `scripts/build-openapi.mjs` imports the spec modules and writes
   `openapi/api.json` and `openapi/edge.json`. Decide whether these are committed or
   built: commit them only if a `--check` mode in `npm run docs:check` keeps them in
   step with the source. Report which you chose and why.
2. **Validate** against the OpenAPI 3.1 schema in a test. Fix what fails in the source
   modules: missing `operationId`, responses without schemas, parameters without types,
   security schemes that do not match `api/middleware/auth.js` and the x402 middleware.
   `tests/api/contract.test.js` already walks every path against the real app; extend it
   rather than writing a second walker.
3. **Every operation gets** a stable unique `operationId`, a summary, a tag matching its
   route module, request and response schemas, and at least one example taken from a
   real response (run the app locally; do not invent sample data).
4. **Describe payment honestly.** Routes behind x402 document the 402 response, its
   headers and the price source (`api/config/x402-config.js`).
5. **Derived artifacts**, generated in the build and attached to releases in
   `.github/workflows/release.yml`:
   - a Postman collection and a Bruno collection;
   - TypeScript types for requests and responses (`openapi-typescript` or the current
     equivalent; check it is maintained) published inside `packages/xactions-edge` for
     the edge spec if they match its hand-written `index.d.ts`, otherwise report the
     differences.
6. **Serve it:** the site exposes `/openapi.json` (it may already; keep the URL) and a
   rendered reference page using a maintained renderer (Scalar or Redoc). Link it from
   `docs/api-reference.md` and README.
7. Check `integrations/n8n` against the spec and list any endpoint it calls that the
   spec does not describe.

## Do not

- Do not change a route's behaviour to match the spec without a failing test first. When
  spec and code disagree, the code is the truth unless the code is a bug.
- Do not hand-write the JSON.

## Done when

- Both specs validate; the contract test passes.
- `npm run build:openapi -- --check` is in `docs:check`.
- A generated TypeScript client compiled against the spec makes one real call to a local
  server in a test.
