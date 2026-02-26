# Build 05-13 — EditorConfig & VS Code Settings

> **Agent Role:** Implementer
> **Depends on:** `05-02` (Prettier config — settings must align)
> **Creates:** `.editorconfig`, `.vscode/settings.json`, `.vscode/extensions.json`

---

## Task

Create EditorConfig and VS Code workspace settings so that every contributor — regardless of their editor — automatically uses the same indentation, line endings, and formatting settings. Settings must be consistent with the Prettier config from build 05-02.

---

## Step 1 — Create EditorConfig

### File: `.editorconfig`

```ini
# EditorConfig — https://editorconfig.org
# XActions project — by nichxbt
root = true

# ── Default: all files ──────────────────────────────────────────────
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

# ── JavaScript ──────────────────────────────────────────────────────
[*.js]
indent_size = 2
max_line_length = 100

# ── JSON ────────────────────────────────────────────────────────────
[*.json]
indent_size = 2

# ── YAML ────────────────────────────────────────────────────────────
[*.{yml,yaml}]
indent_size = 2

# ── Markdown ────────────────────────────────────────────────────────
[*.md]
trim_trailing_whitespace = false
max_line_length = off

# ── Shell scripts ───────────────────────────────────────────────────
[*.sh]
indent_size = 2

# ── Makefile (must use tabs) ────────────────────────────────────────
[Makefile]
indent_style = tab

# ── Docker ──────────────────────────────────────────────────────────
[Dockerfile]
indent_size = 2

# ── Prisma schema ──────────────────────────────────────────────────
[*.prisma]
indent_size = 2

# ── HTML / CSS ──────────────────────────────────────────────────────
[*.{html,css}]
indent_size = 2

# ── Git config files ───────────────────────────────────────────────
[.git*]
indent_size = 2
```

### Verification Against Prettier Config

| Setting | EditorConfig | Prettier | Match? |
|---------|-------------|----------|--------|
| Indent style | `space` | (default: spaces) | ✅ |
| Indent size | `2` | `tabWidth: 2` | ✅ |
| Line endings | `lf` | `endOfLine: "lf"` | ✅ |
| Max line length | `100` | `printWidth: 100` | ✅ |
| Trailing whitespace | `trim` | (handled by Prettier) | ✅ |
| Final newline | `insert` | (handled by Prettier) | ✅ |

---

## Step 2 — Create VS Code Workspace Settings

### File: `.vscode/settings.json`

```json
{
  // ── Formatting ────────────────────────────────────────────────────
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,

  // ── Line endings ──────────────────────────────────────────────────
  "files.eol": "\n",

  // ── Trailing whitespace ───────────────────────────────────────────
  "files.trimTrailingWhitespace": true,
  "files.trimFinalNewlines": true,
  "files.insertFinalNewline": true,

  // ── ESLint ────────────────────────────────────────────────────────
  "eslint.enable": true,
  "eslint.validate": [
    "javascript"
  ],
  "eslint.useFlatConfig": true,

  // ── Language-specific formatters ──────────────────────────────────
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit"
    }
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "files.trimTrailingWhitespace": false
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[css]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[yaml]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  // ── File associations ─────────────────────────────────────────────
  "files.associations": {
    "*.js": "javascript",
    ".prettierrc": "json",
    ".eslintrc": "json"
  },

  // ── Search exclusions ─────────────────────────────────────────────
  "search.exclude": {
    "node_modules": true,
    "archive": true,
    "dist": true,
    "coverage": true,
    "package-lock.json": true
  },

  // ── File nesting (declutter explorer) ─────────────────────────────
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "package.json": "package-lock.json, .npmrc, .prettierrc*, .prettierignore, .eslintrc*, eslint.config.*, .editorconfig, vitest.config.*, .lintstagedrc*",
    "tsconfig.json": "tsconfig.*.json"
  }
}
```

---

## Step 3 — Create VS Code Recommended Extensions

### File: `.vscode/extensions.json`

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "editorconfig.editorconfig",
    "streetsidesoftware.code-spell-checker",
    "usernamehw.errorlens"
  ],
  "unwantedRecommendations": []
}
```

| Extension | Purpose |
|-----------|---------|
| `dbaeumer.vscode-eslint` | ESLint integration — real-time lint feedback |
| `esbenp.prettier-vscode` | Prettier integration — format on save |
| `editorconfig.editorconfig` | EditorConfig support |
| `streetsidesoftware.code-spell-checker` | Catch typos in comments and strings |
| `usernamehw.errorlens` | Inline lint error display |

---

## Step 4 — Verify

```bash
# Verify .editorconfig exists and is valid
cat .editorconfig

# Verify .vscode/settings.json is valid JSON
node -e "JSON.parse(require('fs').readFileSync('.vscode/settings.json', 'utf8')); console.log('Valid JSON')"

# Verify .vscode/extensions.json is valid JSON
node -e "JSON.parse(require('fs').readFileSync('.vscode/extensions.json', 'utf8')); console.log('Valid JSON')"

# Check that settings align with Prettier
node -e "
  const prettier = JSON.parse(require('fs').readFileSync('.prettierrc.json', 'utf8'));
  const vscode = JSON.parse(require('fs').readFileSync('.vscode/settings.json', 'utf8'));
  console.log('Prettier tabWidth:', prettier.tabWidth);
  console.log('VS Code tabSize:', vscode['editor.tabSize']);
  console.log('Match:', prettier.tabWidth === vscode['editor.tabSize']);
"
```

---

## Acceptance Criteria

- [ ] `.editorconfig` exists with `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `insert_final_newline = true`, `trim_trailing_whitespace = true`
- [ ] `.editorconfig` has markdown override for `trim_trailing_whitespace = false`
- [ ] `.editorconfig` settings match `.prettierrc.json` values
- [ ] `.vscode/settings.json` exists with `editor.formatOnSave: true`
- [ ] `.vscode/settings.json` sets `editor.defaultFormatter` to Prettier
- [ ] `.vscode/settings.json` enables ESLint with flat config
- [ ] `.vscode/settings.json` enables `source.fixAll.eslint` on save for JS
- [ ] `.vscode/settings.json` sets `files.eol` to `"\n"` (LF)
- [ ] `.vscode/extensions.json` recommends ESLint, Prettier, and EditorConfig extensions
- [ ] All files are valid JSON (where applicable)
