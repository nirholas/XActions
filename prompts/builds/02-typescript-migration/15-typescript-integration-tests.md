# Build 02-15 — TypeScript Migration Integration Tests

> **Creates:** `tests/typescript/` test suite

---

## Task

Verify the entire TypeScript migration works: compilation, type inference, backward compatibility, and published package shape.

---

## Test Files

### `tests/typescript/compilation.test.ts`
1. Import from every public entry point and verify types resolve
2. Verify `TwitterProfile`, `TwitterTweet` types are accessible
3. Verify `createHttpScraper` return type is properly inferred
4. Verify error type guards narrow correctly
5. Verify adapter registration type-checks

### `tests/typescript/backward-compat.test.ts`
1. Test that `import scrapers from 'xactions/scrapers'` still works
2. Test that `import { scrapeProfile } from 'xactions/scrapers'` works
3. Test that existing JS code can call TS modules
4. Test that the MCP server starts without errors
5. Test that CLI `--help` works

### `tests/typescript/type-inference.test.ts`
```typescript
import { expectTypeOf } from 'vitest';
import { scrapeProfile } from '../../src/scrapers/twitter/http/profile.js';

it('scrapeProfile returns TwitterProfile', () => {
  expectTypeOf(scrapeProfile).returns.resolves.toMatchTypeOf<TwitterProfile>();
});
```

### `tests/typescript/package-shape.test.ts`
1. Run `npm pack --dry-run` and verify output includes `.d.ts` files
2. Verify `dist/` has correct structure
3. Verify no source `.ts` files in package (only compiled `.js` + `.d.ts`)

---

## Acceptance Criteria
- [ ] All imports resolve correctly
- [ ] Type inference works for all public functions
- [ ] Backward compatibility maintained
- [ ] Package shape is correct for publishing
- [ ] All tests pass
