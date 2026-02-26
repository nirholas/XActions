# Build 02-11 — Migrate CLI to TypeScript

> **Creates:** `src/cli/index.ts`

---

## Task

Convert the 2,982-line CLI to TypeScript with properly typed Commander.js commands, options, and handlers.

---

## Approach

### Commander.js TypeScript Patterns

```typescript
import { Command, Option } from 'commander';

interface ScrapeOptions {
  output?: string;
  format?: 'json' | 'csv' | 'xlsx';
  limit?: number;
  cookie?: string;
  proxy?: string;
  adapter?: 'puppeteer' | 'http' | 'playwright';
  sheetName?: string;
}

const program = new Command()
  .name('xactions')
  .version('3.1.0')
  .description('The Complete X/Twitter Automation Toolkit');

program
  .command('scrape <type> <target>')
  .description('Scrape Twitter data')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <fmt>', 'Output format', 'json')
  .option('-l, --limit <n>', 'Max items to scrape', parseInt)
  .option('--cookie <string>', 'Auth cookie')
  .action(async (type: string, target: string, options: ScrapeOptions) => {
    // Typed handler
  });
```

### Module Extraction

Break the 2,982-line file into:
- `src/cli/index.ts` — Entry point, program setup
- `src/cli/commands/scrape.ts` — Scrape commands
- `src/cli/commands/auth.ts` — Auth commands  
- `src/cli/commands/workflow.ts` — Workflow commands
- `src/cli/commands/plugin.ts` — Plugin commands
- `src/cli/commands/graph.ts` — Graph commands
- `src/cli/commands/portability.ts` — Export/import commands
- `src/cli/utils.ts` — Shared helpers (output handler, spinner, etc.)

---

## Acceptance Criteria
- [ ] CLI compiles as TypeScript
- [ ] All command options typed
- [ ] Handlers have typed arguments
- [ ] CLI broken into command modules
- [ ] `xactions --help` still works
- [ ] All subcommands functional
