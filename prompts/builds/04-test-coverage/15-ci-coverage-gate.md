# Build 04-15 — CI Coverage Gate

> **Modifies:** `.github/workflows/ci.yml`
> **Creates:** `.github/workflows/coverage.yml`

---

## Task

Add coverage enforcement to CI. PRs that reduce coverage below thresholds must fail. Coverage reports uploaded as artifacts and displayed via badges.

---

## File: `.github/workflows/coverage.yml`

```yaml
name: Test Coverage

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npx vitest run --coverage
      
      - name: Check coverage thresholds
        run: |
          # vitest.config.js enforces thresholds — if they fail, the command exits non-zero
          echo "Coverage thresholds passed ✅"
      
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 30
      
      - name: Upload to Codecov
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
          token: ${{ secrets.CODECOV_TOKEN }}
      
      - name: Comment coverage on PR
        if: github.event_name == 'pull_request'
        uses: davelosert/vitest-coverage-report-action@v2
        with:
          json-summary-path: ./coverage/coverage-summary.json
          json-final-path: ./coverage/coverage-final.json
```

---

## Modifications to `.github/workflows/ci.yml`

Add coverage step to existing CI workflow:

```yaml
      - name: Run tests
        run: npx vitest run --coverage
        
      - name: Verify coverage thresholds
        run: |
          node -e "
            const summary = require('./coverage/coverage-summary.json');
            const { lines, branches, functions } = summary.total;
            const failures = [];
            if (lines.pct < 60) failures.push('Lines: ' + lines.pct + '% (need 60%)');
            if (branches.pct < 50) failures.push('Branches: ' + branches.pct + '% (need 50%)');
            if (functions.pct < 60) failures.push('Functions: ' + functions.pct + '% (need 60%)');
            if (failures.length) {
              console.error('Coverage below threshold:\\n' + failures.join('\\n'));
              process.exit(1);
            }
            console.log('✅ Coverage OK — Lines: ' + lines.pct + '%, Branches: ' + branches.pct + '%, Functions: ' + functions.pct + '%');
          "
```

---

## README badge

```markdown
[![Coverage](https://codecov.io/gh/nirholas/XActions/branch/main/graph/badge.svg)](https://codecov.io/gh/nirholas/XActions)
```

---

## Threshold Progression Plan

| Phase | Lines | Branches | Functions | Timeline |
|-------|-------|----------|-----------|----------|
| Initial | 60% | 50% | 60% | After Track 04 builds 01-06 |
| Growth | 70% | 60% | 70% | After builds 07-12 |
| Target | 80% | 75% | 80% | After builds 13-15 |

Update thresholds in `vitest.config.js` as coverage improves.

---

## Acceptance Criteria
- [ ] Coverage workflow runs on push and PR
- [ ] Thresholds enforced — PR fails if below
- [ ] Coverage report uploaded as CI artifact
- [ ] Codecov integration for coverage trends
- [ ] PR comment with coverage diff
- [ ] README badge added
- [ ] Existing CI workflow enhanced with coverage step
