# Build 05-14 — CI Lint Workflow

> **Agent Role:** Implementer
> **Depends on:** `05-01` (ESLint), `05-02` (Prettier), all fix builds (07–12)
> **Creates:** `.github/workflows/lint.yml`

---

## Task

Create a GitHub Actions CI workflow that runs ESLint and Prettier checks on every push to `main` and on all pull requests. The workflow must fail if there are any lint errors or formatting violations, preventing unclean code from merging.

---

## File: `.github/workflows/lint.yml`

```yaml
# .github/workflows/lint.yml — XActions lint & format CI
# by nichxbt
name: Lint & Format

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: lint-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: ESLint & Prettier
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      # ── Checkout ─────────────────────────────────────────────────
      - name: Checkout repository
        uses: actions/checkout@v4

      # ── Setup Node.js ───────────────────────────────────────────
      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      # ── Install dependencies ────────────────────────────────────
      - name: Install dependencies
        run: npm ci

      # ── ESLint ──────────────────────────────────────────────────
      - name: Run ESLint
        run: npm run lint

      # ── Prettier ────────────────────────────────────────────────
      - name: Check Prettier formatting
        run: npm run format:check

      # ── Summary ─────────────────────────────────────────────────
      - name: Lint summary
        if: always()
        run: |
          echo "## Lint Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY

          if npm run lint --silent 2>&1; then
            echo "✅ **ESLint:** All checks passed" >> $GITHUB_STEP_SUMMARY
          else
            echo "❌ **ESLint:** Errors found" >> $GITHUB_STEP_SUMMARY
          fi

          if npm run format:check --silent 2>&1; then
            echo "✅ **Prettier:** All files formatted" >> $GITHUB_STEP_SUMMARY
          else
            echo "❌ **Prettier:** Formatting issues found" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "Run \`npm run format\` locally to fix formatting." >> $GITHUB_STEP_SUMMARY
          fi
```

---

## Workflow Details

### Triggers

| Event | Scope | Purpose |
|-------|-------|---------|
| `push` | `main` branch | Catch any lint regressions merged to main |
| `pull_request` | `main` branch | Block PRs with lint/format violations |

### Concurrency

```yaml
concurrency:
  group: lint-${{ github.ref }}
  cancel-in-progress: true
```

If a new commit is pushed to the same branch while the lint workflow is running, the old run is cancelled. This saves CI minutes.

### Caching

The `actions/setup-node@v4` with `cache: 'npm'` automatically caches `~/.npm` based on `package-lock.json`. This speeds up `npm ci` on subsequent runs.

### Timeout

Set to 10 minutes. Linting the entire codebase should take <2 minutes. The generous timeout is a safety net.

### Permissions

Read-only `contents` permission — this workflow never pushes changes.

---

## Step 2 — Verify Locally

Before pushing the workflow, verify the commands work locally:

```bash
# These must both pass with exit code 0
npm run lint && echo "✅ ESLint passed" || echo "❌ ESLint failed"
npm run format:check && echo "✅ Prettier passed" || echo "❌ Prettier failed"
```

---

## Step 3 — Verify Workflow Syntax

```bash
# Validate YAML syntax
node -e "
  const yaml = require('js-yaml') || console.log('Install js-yaml for validation');
" 2>/dev/null

# Or just check it's valid YAML
python3 -c "
import yaml
with open('.github/workflows/lint.yml') as f:
    yaml.safe_load(f)
print('Valid YAML')
" 2>/dev/null || echo "Python yaml check skipped"

# Check that the .github/workflows/ directory exists
ls -la .github/workflows/
```

---

## Step 4 — Ensure Scripts Exist

Verify the npm scripts referenced in the workflow are defined:

```bash
node -e "
  const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
  const required = ['lint', 'format:check'];
  for (const s of required) {
    if (pkg.scripts?.[s]) {
      console.log('✅', s, '→', pkg.scripts[s]);
    } else {
      console.log('❌', s, '— MISSING');
    }
  }
"
```

---

## Future Enhancements (Not in This Build)

These are stretch goals for future tracks:

- **PR comment with lint results** — use `actions/github-script` to post inline annotations
- **Auto-fix and commit** — use `stefanzweifel/git-auto-commit-action` to auto-fix and push (dangerous for PRs from forks)
- **Lint only changed files** — use `tj-actions/changed-files` + `eslint` on only modified files (faster for large repos)
- **Lint caching** — ESLint caching with `--cache` flag for faster CI

---

## Acceptance Criteria

- [ ] `.github/workflows/lint.yml` exists
- [ ] Workflow triggers on push to `main` and pull requests to `main`
- [ ] Workflow uses Node.js 20 with npm caching
- [ ] Workflow runs `npm ci` (not `npm install`)
- [ ] Workflow runs `npm run lint` and fails on errors
- [ ] Workflow runs `npm run format:check` and fails on violations
- [ ] Workflow has `concurrency` to cancel duplicate runs
- [ ] Workflow has `timeout-minutes: 10`
- [ ] Workflow has read-only `contents` permission
- [ ] Workflow produces a step summary with lint results
- [ ] Both `npm run lint` and `npm run format:check` pass locally before pushing
