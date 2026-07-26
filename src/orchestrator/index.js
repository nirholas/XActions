// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Fleet Orchestrator
 *
 * Drives one task across many X/Twitter accounts, one HTTP client per account,
 * each egressing its own sticky proxy IP. The per-account unit (`runTask`) is
 * queue-agnostic: a Bull worker can call it unchanged.
 *
 * @example
 * import { runFleet } from 'xactions/orchestrator';
 * await runFleet({ taskName: 'homeTimeline', params: { limit: 5 } });
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

// The per-account unit a future Bull worker calls, plus the fleet driver.
export { runTask, runFleet, persistOutcome, buildScraperForAccount, healthProbe, resolveHandleRestId, authorHandleOf } from './runner.js';
export { TASKS, listTasks } from './tasks.js';
export { loadAccounts, validateAccount, updateAccountStatus, saveAccounts, ACCOUNTS_FILE } from './accountStore.js';
export { makeProxiedFetch, redactProxy } from './proxiedFetch.js';
export { importAccounts, describeAccount } from './import.js';
export { postTweetSafe, deleteTweetSafe } from './write.js';
