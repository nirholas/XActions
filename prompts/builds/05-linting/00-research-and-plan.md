# Build 05-00 — Research & Plan Lint Strategy# Track 05 — Linting & Formatting: Research & Plan
































Record the total file count and the directory breakdown.```find scripts/ -name '*.js' | head -30find dashboard/js/ -name '*.js' | head -30find api/ -name '*.js' | head -30find src/ -name '*.js' | head -60# List them grouped by directoryfind src/ api/ scripts/ bin/ dashboard/js/ -name '*.js' -not -path '*/node_modules/*' -not -path 'archive/*' | wc -l# Count all JS files by directory```bashCollect every `.js` file that will be in scope for linting:## Step 1 — Enumerate All Source Files---This is a **read-only research step** — no source files are modified.Audit every source file in the XActions codebase to catalog code-style inconsistencies, identify which files are browser scripts vs Node.js scripts (they need different lint configurations), and produce a baseline report that all subsequent builds in this track will reference.## Task---> **Creates:** `prompts/builds/05-linting/LINT_AUDIT_BASELINE.md`> **Depends on:** None (first step in Track 05)> **Agent Role:** Implementer
> **Goal:** Add ESLint + Prettier to the entire codebase. Currently there is zero linting configuration.

---

## Research Phase

### 1. Audit current state
- [ ] Confirm no `.eslintrc`, `eslint.config.js`, `.prettierrc` exists
- [ ] Check package.json for any lint-related devDependencies
- [ ] Count files that would be linted: `find src api -name '*.js' | wc -l`
- [ ] Sample coding style inconsistencies across files

### 2. Determine configuration
- [ ] ESLint flat config (eslint.config.js) vs legacy — use flat config
- [ ] Parser: default for JS, @typescript-eslint/parser for TS migration (Track 02)
- [ ] Plugins needed: import, node, prettier
- [ ] Prettier config: single quotes, trailing commas, 2-space indent (match existing code)
- [ ] Rules: start with `eslint:recommended`, add project-specific rules
- [ ] Ignore patterns: archive/, dashboard/, coverage/, node_modules/

### 3. Research competitor configs
- [ ] `the-convocation/twitter-scraper` — TypeScript strict
- [ ] Popular Node.js ESLint presets (airbnb, standard)

---

## Build Sequence (15 prompts)

| # | Build | Description |
|---|-------|-------------|
| 01 | ESLint config | eslint.config.js with flat config |
| 02 | Prettier config | .prettierrc + .prettierignore |
| 03 | Package.json scripts | lint, lint:fix, format commands |
| 04 | Fix src/utils | Auto-fix + manual fixes for utils/ |
| 05 | Fix src/scrapers | Auto-fix scrapers/ |
| 06 | Fix src/mcp | Auto-fix MCP server |
| 07 | Fix src/cli | Auto-fix CLI |
| 08 | Fix src/auth + src/automation | Auto-fix remaining src/ |
| 09 | Fix api/ | Auto-fix API server |
| 10 | Fix tests/ | Auto-fix test files |
| 11 | Import sorting | eslint-plugin-import order rules |
| 12 | Custom rules | Project-specific rules (no console.log in lib, etc.) |
| 13 | Editor integration | .vscode/settings.json, .editorconfig |
| 14 | CI lint gate | GitHub Actions lint check |
| 15 | Pre-commit hooks | husky + lint-staged |
