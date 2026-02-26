# Build 05-00 — Research & Plan Lint Strategy# Track 05 — Linting & Formatting: Research & Plan





















































































































































































































































- [ ] No source files modified in this step- [ ] Baseline report written to `prompts/builds/05-linting/LINT_AUDIT_BASELINE.md`- [ ] Confirmed no existing ESLint/Prettier/EditorConfig configuration- [ ] Top files by issue count identified- [ ] Code style inconsistencies cataloged with counts for: var/let/const, semicolons, quotes, indentation, equality operators- [ ] Every file classified as Node.js or Browser environment- [ ] All JS files enumerated and counted## Acceptance Criteria---```- Start with warnings, promote to errors after auto-fix passes- Integrate Prettier via `eslint-config-prettier`- Extend `@eslint/js` recommended- Two environment configs: Node.js (globals.node) and Browser (globals.browser)- Use flat config (`eslint.config.js`) for ESLint v9+## Recommended ESLint Config Strategy3. ...2. `src/cli/index.js` — [X] issues1. `src/mcp/server.js` — [X] issues## Files Needing Most Work| Unused variables | XX | Manual review || Mixed indentation | XX | Yes (prettier) || `==` instead of `===` | XX | Yes (eslint --fix) || Mixed quotes | XX | Yes (prettier) || Missing semicolons | XX | Yes (prettier) || `var` declarations | XX | Yes (eslint --fix) ||-------|-------|--------------|| Issue | Count | Auto-fixable? |## Style Inconsistencies| Ignored | XX | `archive/**/*.js` || Tests | XX | `tests/**/*.js` || Dashboard frontend | XX | `dashboard/js/**/*.js` || Browser scripts | XX | `src/automation/*.js`, `src/utils/core.js` || Node.js ESM | XX | `src/{scrapers,mcp,cli,client,auth}/**/*.js`, `api/**/*.js` ||----------|-----------|--------------|| Category | File Count | Glob Pattern |## Environment Classification**Total JS files in scope:** [count]**Date:** [date]# Lint Audit Baseline — Track 05```markdownAfter running all the above commands, produce a markdown report:### File: `prompts/builds/05-linting/LINT_AUDIT_BASELINE.md`## Step 6 — Write Baseline Report---```cat package.json | grep -A5 '"lint"\|"format"'cat package.json | grep -A5 '"eslint\|"prettier\|"lint-staged\|"husky'ls -la .eslintrc* eslint.config.* .prettierrc* .prettierignore .editorconfig 2>/dev/null# Check for existing configs```bashConfirm that no lint tooling currently exists:## Step 5 — Check Existing Lint/Format Configuration---```find src/ api/ scripts/ dashboard/js/ -name '*.js' -exec wc -l {} + | sort -rn | head -20# Top 20 largest JS files```bash| `src/automation/*.js` | 20 files | Browser | All need browser globals || `api/server.js` | ~400+ | Node.js | Express server || `src/utils/core.js` | 675 | Browser IIFE | Special lint config needed || `src/scrapers/twitter/index.js` | 952 | Node.js | HTTP scraper || `src/cli/index.js` | 2,983 | Node.js | CLI entry point || `src/mcp/server.js` | 3,899 | Node.js | Largest file, MCP tool handlers ||------|-------|-------------|-------|| File | Lines | Environment | Notes |Rank files by size and complexity — these will need the most lint work:## Step 4 — Identify High-Priority Files---```grep -rn '!==' src/ api/ --include='*.js' | wc -lgrep -rn '===' src/ api/ --include='*.js' | wc -lgrep -rn '!= [^=]' src/ api/ --include='*.js' | wc -lgrep -rn '[^!=]== [^=]' src/ api/ --include='*.js' | wc -l```bash### 3g — `==` vs `===````grep -rn '^import .* from' src/ api/ --include='*.js' | head -30# Rough count — imports that are never used (ESLint will find these precisely)```bash### 3f — Unused variables```grep -rn ',$' src/ api/ --include='*.js' | wc -l# Count trailing commas in arrays/objects```bash### 3e — Trailing commas```grep -rn '^  [^ ]' src/ api/ --include='*.js' | wc -l     # 2-space indentgrep -rn '^    [^ ]' src/ api/ --include='*.js' | wc -l   # 4-space indent# Check dominant indent size (2 vs 4 spaces)grep -rl '	' src/ api/ --include='*.js' | wc -l# Files using tabs```bash### 3d — Indentation (spaces vs tabs, indent size)```grep -rn '`[^`]*`' src/ api/ --include='*.js' | wc -l# Count template literalsgrep -rn "'[^']*'" src/ api/ --include='*.js' | wc -l# Count single-quoted stringsgrep -rn '"[^"]*"' src/ api/ --include='*.js' | wc -l# Count double-quoted strings```bash### 3c — Quote style (single vs double)```grep -rn '[a-zA-Z0-9)\]"'\''`]$' src/ api/ --include='*.js' | grep -v '//' | grep -v '{$' | grep -v '}$' | wc -l# Lines ending without semicolons (rough heuristic — skip comments, braces, blank lines)```bash### 3b — Semicolons```grep -rl '\bvar ' src/ api/ scripts/ --include='*.js' | sort# List files still using vargrep -rn '\bconst ' src/ api/ scripts/ --include='*.js' | wc -l# Count const declarationsgrep -rn '\blet ' src/ api/ scripts/ --include='*.js' | wc -l# Count let declarationsgrep -rn '\bvar ' src/ api/ scripts/ --include='*.js' | wc -l# Count var declarations```bash### 3a — `var` vs `let` vs `const`For each category, count occurrences across the codebase:## Step 3 — Catalog Code Style Inconsistencies---```grep -rl 'require(' src/ api/ scripts/ --include='*.js' | sort# Files using CommonJS requiregrep -rl '^import ' src/ api/ scripts/ --include='*.js' | sort# Files using ESM importsgrep -rl 'process\.\|require(\|__dirname\|__filename\|Buffer\.' src/ --include='*.js' | sort# Find files using Node globalsgrep -rl 'window\.\|document\.\|sessionStorage\|localStorage' src/ --include='*.js' | sort# Find files using browser globals```bash### Verification commands- `archive/**/*.js` — legacy browser scripts (ignored but noted)- `dashboard/js/*.js` — dashboard frontend JavaScript- `src/automation/*.js` — browser scripts (20 files)- `src/utils/core.js` — browser IIFE pasted into DevTools### Browser files (use `window`, `document`, `sessionStorage`, `console`, DOM APIs)- `dashboard-server.js`- `bin/unfollowx`- `tests/**/*.js`- `scripts/**/*.js`- `api/**/*.js`- `src/auth/**/*.js`- `src/client/**/*.js`- `src/cli/**/*.js`- `src/mcp/**/*.js`- `src/scrapers/**/*.js`### Node.js files (use `process`, `import`, `require`, `__dirname`, `Buffer`)Each file runs in one of two environments. Classify every file:## Step 2 — Classify Runtime Environment---Record the total file count and the directory breakdown.```find scripts/ -name '*.js' | head -30find dashboard/js/ -name '*.js' | head -30find api/ -name '*.js' | head -30find src/ -name '*.js' | head -60# List them grouped by directoryfind src/ api/ scripts/ bin/ dashboard/js/ -name '*.js' -not -path '*/node_modules/*' -not -path 'archive/*' | wc -l# Count all JS files by directory```bashCollect every `.js` file that will be in scope for linting:## Step 1 — Enumerate All Source Files---This is a **read-only research step** — no source files are modified.Audit every source file in the XActions codebase to catalog code-style inconsistencies, identify which files are browser scripts vs Node.js scripts (they need different lint configurations), and produce a baseline report that all subsequent builds in this track will reference.## Task---> **Creates:** `prompts/builds/05-linting/LINT_AUDIT_BASELINE.md`> **Depends on:** None (first step in Track 05)> **Agent Role:** Implementer
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
