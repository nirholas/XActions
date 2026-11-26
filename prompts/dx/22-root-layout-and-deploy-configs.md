# 22: a root directory a newcomer can read

Read `prompts/dx/00-README.md` first. Wave 3. Needs 18 merged.

## Goal

The repository root holds what a newcomer needs and what tools require to be there.
Everything else lives in a named folder, and every deploy path still works.

## Why

The root has about 80 entries (`ls -A | wc -l`). Hosting configuration for six platforms
sits at the top level: `fly.toml`, `railway.json`, `railway.toml`, `render.yaml`,
`nixpacks.toml`, `Procfile`, `vercel.json`, `wrangler.toml`, `Dockerfile`,
`docker-compose.yml`, `docker-compose.coolify.yml`, `.gcloudignore`, `start.sh`. Registry
manifests add more: `server.json`, `glama.json`, `smithery.yaml`. A visitor scrolls past
all of it to reach the README. The 2026-08-27 audit lists this as open.

## Do

1. **Classify every root entry** into one of:
   - must stay (the tool only reads it from the root and has no path option);
   - can move with a flag or setting;
   - can move freely;
   - looks unused.
   For each platform file, find the rule in that platform's current documentation, not
   from memory, and cite it in your report. Typical cases to verify: Fly accepts
   `--config`; Render blueprints and Railway config files have a configurable path;
   Wrangler accepts `--config`; Vercel reads `vercel.json` from the project root;
   registry crawlers (MCP Registry, Glama, Smithery) may require their manifest at the
   root.
2. **Move what can move** into `deploy/<platform>/`, which already exists for
   `cloudflare` and `gcp`. Update every reference: `package.json` scripts,
   `scripts/deploy.sh`, `.github/workflows/`, `docs/deployment.md`, the README deploy
   buttons, `scripts/sync-registry.mjs`.
3. **Prove each deploy path still resolves** without deploying: the platform's own
   validate or dry-run command where one exists (`fly config validate`, `wrangler deploy
   --dry-run`, `docker compose config`, `docker build`). Where there is none, say so and
   leave that file where it is.
4. **Agent instruction files.** `CLAUDE.md` already defers to `AGENTS.md`. Make
   `GEMINI.md` and `.github/copilot-instructions.md` do the same in a few lines each, so
   there is one source of truth. Both are tracked on purpose (`.gitignore` says so).
5. **One-off checks to report, not act on:**
   - `bin/unfollowx` is described in `bin/README.md` as CommonJS under the Business
     Source License inside an Apache-2.0 repository. State what the file's own header
     says and what `THIRD-PARTY-NOTICES.md` says about it. Relicensing or removing it is
     the owner's decision.
   - Large files in history (`public/demo.mp4`, `dashboard/data/tweet-price/`) per the
     audit: report current sizes. Rewriting history is not in scope.
   - Any root entry in the "looks unused" class, with the evidence.
6. Update the directory map in `AGENTS.md` and the "Project Structure" section of the
   README to match.

## Do not

- Do not deploy anything.
- Do not delete a file. Moves only; list deletion candidates with the command.
- Do not move a file whose platform you could not verify.

## Done when

- Your report has the classification table with a citation for every "must stay".
- Every moved file's deploy path passes its dry run.
- `npm run docs:check`, `npm run registry:sync -- --check` and `npm test` pass.
- The root entry count before and after is in the report.
