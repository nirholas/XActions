# types/

TypeScript declarations for the `xactions` package.

- `index.d.ts` is the package `types` entry, for `import ... from 'xactions'`.
- `client/` covers the HTTP client.
- `xapi.d.ts` covers `xactions/xapi`, the official X API v2 lane (wired through the `types` condition of the `./xapi` export in `package.json`).

Consumers get them automatically:

    import { Scraper, scrapeProfile } from 'xactions';   // typed
    import { XApiClient } from 'xactions/xapi';           // typed

When you add or change a public export in `src/`, update the matching declaration here. `tests/types/exports.test.js` and `tests/types/xapi-exports.test.js` fail when a declaration and the runtime exports disagree, and the second also type-checks `tests/types/xapi-consumer.ts` under `--strict`.
