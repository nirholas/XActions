# types/

TypeScript declarations for the `xactions` package (`index.d.ts` is the package `types` entry; `client/` covers the HTTP client).

Consumers get them automatically:

    import { Scraper, scrapeProfile } from 'xactions';   // typed

When you add or change a public export in `src/`, update the matching declaration here.
