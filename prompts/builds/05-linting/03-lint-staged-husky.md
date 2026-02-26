# Build 05-03 — Lint-Staged & Husky Pre-Commit Hooks

> **Agent Role:** Implementer
> **Depends on:** `05-01` (ESLint), `05-02` (Prettier)
> **Creates:** `.husky/pre-commit`, updates `package.json`

---

## Task

Set up Git pre-commit hooks using Husky and lint-staged so that every commit automatically lints and formats only the staged files. This prevents new lint violations from being introduced.

---

## Step 1 — Install Dependencies

```bash
npm install -D husky lint-staged
```

---

## Step 2 — Initialize Husky

```bash
npx husky init
```

This creates the `.husky/` directory and adds a `"prepare": "husky"` script to `package.json`.

Verify the `prepare` script exists:
```bash
cat package.json | grep '"prepare"'
```

If `npx husky init` did not add `"prepare": "husky"` to scripts, add it manually.

---

## Step 3 — Create Pre-Commit Hook

### File: `.husky/pre-commit`

```sh
npx lint-staged
```

Make sure the file is executable:

```bash
chmod +x .husky/pre-commit
```

---

## Step 4 — Configure lint-staged in `package.json`

Add the `"lint-staged"` key at the top level of `package.json` (not inside `"scripts"`):

```json
{
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.md": [
      "prettier --write"
    ],
    "*.json": [
      "prettier --write"
    ],
    "*.{html,css}": [
      "prettier --write"
    ]
  }
}
```

### Order matters

1. `eslint --fix` runs first — auto-fixes lint errors (var→const, missing semicolons, etc.)
2. `prettier --write` runs second — formats the ESLint-fixed output

This ensures ESLint fixes are also formatted by Prettier before commit.

---

## Step 5 — Verify the Full Pipeline

```bash
# Test 1: Verify husky directory exists
ls -la .husky/pre-commit

# Test 2: Verify pre-commit hook content
cat .husky/pre-commit

# Test 3: Verify lint-staged config is in package.json
cat package.json | grep -A 15 '"lint-staged"'

# Test 4: Simulate lint-staged on a test file
echo 'var x = 1' > /tmp/test-lint-staged.js
cp /tmp/test-lint-staged.js src/__test-lint-staged.js
git add src/__test-lint-staged.js
npx lint-staged --verbose 2>&1 | tail -20
# Clean up
git restore --staged src/__test-lint-staged.js
rm -f src/__test-lint-staged.js /tmp/test-lint-staged.js

# Test 5: Verify prepare script
npm run prepare 2>&1 | tail -5
```

---

## Step 6 — Final `package.json` Scripts Section

After this build, the scripts section should include at minimum:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint --fix .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  }
}
```

And the top-level `lint-staged` config block.

---

## Acceptance Criteria

- [ ] `husky` and `lint-staged` installed as devDependencies
- [ ] `.husky/pre-commit` exists and contains `npx lint-staged`
- [ ] `.husky/pre-commit` is executable (`chmod +x`)
- [ ] `"prepare": "husky"` exists in `package.json` scripts
- [ ] `"lint-staged"` config exists in `package.json` with rules for `*.js`, `*.md`, `*.json`, `*.{html,css}`
- [ ] JS files run `eslint --fix` then `prettier --write` on commit
- [ ] Markdown files run `prettier --write` on commit
- [ ] `npm run prepare` runs without errors
- [ ] Pre-commit hook triggers lint-staged when committing staged files
