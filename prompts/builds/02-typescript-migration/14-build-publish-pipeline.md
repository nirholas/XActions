# Build 02-14 — Update Build & Publish Pipeline

> **Updates:** `package.json`, CI workflow, npm publish config

---

## Task

Update the build and publish pipeline to compile TypeScript, emit declarations, and publish both JS and type definitions.

---

## Changes

### `package.json`
```json
{
  "main": "./dist/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./scrapers": {
      "import": "./dist/scrapers/index.js",
      "types": "./dist/types/scrapers/index.d.ts"
    },
    "./scrapers/twitter/http": {
      "import": "./dist/scrapers/twitter/http/index.js",
      "types": "./dist/types/scrapers/twitter/http/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:watch": "tsc -p tsconfig.build.json --watch",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test"
  },
  "files": ["dist/", "src/", "types/", "README.md", "LICENSE"]
}
```

### CI Workflow Update (`.github/workflows/ci.yml`)
Add TypeScript check step:
```yaml
- name: Type check
  run: npm run typecheck
```

### `.npmignore`
Ensure `src/` is excluded from published package (only `dist/` ships):
```
src/
tests/
prompts/
.github/
```

---

## Acceptance Criteria
- [ ] `npm run build` compiles all TS → JS in `dist/`
- [ ] `npm run typecheck` verifies types without emitting
- [ ] Published package includes `.d.ts` files
- [ ] Exports map points to compiled output
- [ ] CI runs type checking
