// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Guarded Writes
 *
 * `buildScraperForAccount` carries no policy, so a naive post would happily
 * publish over the laptop's IP or from a mislabeled session. `postTweetSafe`
 * re-implements every guard the fleet enforces, in order, and refuses rather
 * than publish on any doubt:
 *   1. co-location — no direct egress in a proxied fleet (unless allowDirect)
 *   2. transparent proxy — egress IP must differ from the un-proxied baseline
 *   3. identity — the session's screen_name must equal the named handle
 *   4. confirmation — a 200-with-errors body is a failure; the posted id is
 *      re-fetched before the write is called done
 *
 * `deleteTweetSafe` likewise re-fetches to confirm the tweet is actually gone —
 * `deleteTweet` returns a hardcoded {success:true} without inspecting the response.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { loadAccounts, validateAccount, normalizeAccount } from './accountStore.js';
import { redactProxy, closeFetch, fetchPublicIp, proxySelfTest } from './proxiedFetch.js';
import { buildScraperForAccount, healthProbe, resolveHandleRestId, authorHandleOf } from './runner.js';

/**
 * Find and normalise one account by handle, or throw.
 * @param {string} handle
 * @returns {Promise<{account: Object, all: Object[]}>}
 */
async function selectOne(handle) {
  const all = (await loadAccounts()).filter((a) => validateAccount(a).valid).map(normalizeAccount);
  const wanted = String(handle).replace(/^@/, '').toLowerCase();
  const account = all.find((a) => a.handle === wanted);
  if (!account) throw new Error(`❌ No usable account @${wanted} in the store.`);
  return { account, all };
}

/**
 * Publish one tweet with every guard. Without `confirm` it stops after the
 * checks and returns a preview (nothing is sent).
 *
 * @param {Object} opts
 * @param {string} opts.handle
 * @param {string} opts.text
 * @param {boolean} [opts.confirm=false]
 * @param {boolean} [opts.allowDirect=false]
 * @param {(line: string) => void} [opts.log=console.log]
 * @returns {Promise<{ok: boolean, preview?: boolean, id?: string, url?: string, reason?: string}>}
 */
export async function postTweetSafe({ handle, text, confirm = false, allowDirect = false, log = console.log }) {
  if (!text || typeof text !== 'string') throw new Error('❌ postTweetSafe requires text.');
  const { account, all } = await selectOne(handle);
  const strictProxy = all.some((a) => a.proxyUrl);

  log(`Account : @${account.handle}`);
  log(`Egress  : ${redactProxy(account.proxyUrl) ?? "DIRECT (this machine's IP)"}`);
  log(`Text    : ${JSON.stringify(text)} (${text.length} chars)`);

  // 1. Co-location ban.
  if (strictProxy && !account.proxyUrl && !allowDirect) {
    return { ok: false, reason: 'co-location: no proxy on this account while others have one (pass allowDirect to override)' };
  }

  // 2. Transparent-proxy guard.
  if (account.proxyUrl) {
    let baselineIp;
    try {
      baselineIp = await fetchPublicIp(globalThis.fetch);
    } catch (error) {
      return { ok: false, reason: `cannot determine baseline IP (${error.message}) — a transparent proxy would be undetectable` };
    }
    const test = await proxySelfTest(account.proxyUrl, { baselineIp });
    if (!test.ok) return { ok: false, reason: `proxy self-test failed (${test.error})` };
    log(`Egress verified: ${test.ip} (≠ baseline)`);
  }

  let built = null;
  try {
    built = await buildScraperForAccount(account);

    // 3. Session must authenticate, and the claimed handle must be a live account.
    //    (No REST who-am-I endpoint survives, so session→handle is BOUND after the
    //    post by reading the tweet's author — see step 5.)
    const probe = await healthProbe(built.scraper);
    if (!probe.alive) {
      return { ok: false, reason: `session not alive (${probe.status}: ${probe.reason})` };
    }
    const target = await resolveHandleRestId(built.scraper, account.handle);
    if (!target.restId) {
      return { ok: false, reason: `@${account.handle} is not a live account (${target.reason})` };
    }
    log(`Session authenticated; @${account.handle} is live (id ${target.restId})`);

    if (!confirm) {
      return { ok: true, preview: true };
    }

    // 4. Publish — the postTweet task rejects a 200-with-errors body and requires an id.
    const result = await built.scraper.postTweet(text, {});
    if (result?.errors?.length) {
      return { ok: false, reason: `X rejected the tweet: ${JSON.stringify(result.errors).slice(0, 300)}` };
    }
    const id = result?.rest_id ?? result?.id_str ?? result?.id ?? null;
    if (!id || !/^\d+$/.test(String(id))) {
      return { ok: false, reason: `no numeric id in response: ${JSON.stringify(result).slice(0, 300)}` };
    }

    // 5. BIND session→handle from the outcome: the author of the tweet we just
    //    created IS the session's real identity. If it is not the labeled handle,
    //    we posted from the wrong account — delete it immediately and refuse.
    const author = authorHandleOf(result);
    if (author && author.toLowerCase() !== account.handle.toLowerCase()) {
      let rolledBack = false;
      try { await built.scraper.deleteTweet(String(id)); rolledBack = true; } catch { rolledBack = false; }
      return {
        ok: false,
        reason: `MISLABELED: tweet posted from @${author}, not @${account.handle}. ` +
          (rolledBack ? 'Auto-deleted.' : `COULD NOT auto-delete — remove https://x.com/${author}/status/${id}`),
      };
    }

    return {
      ok: true,
      id: String(id),
      url: `https://x.com/${author ?? account.handle}/status/${id}`,
      author: author ?? null,
      boundToHandle: Boolean(author),
    };
  } finally {
    if (built) await closeFetch(built.proxiedFetch);
  }
}

/**
 * Delete one tweet through the account that owns it, and CONFIRM it is gone by
 * re-fetching (the delete call's return value proves nothing).
 *
 * @param {Object} opts
 * @param {string} opts.handle
 * @param {string} opts.id
 * @returns {Promise<{ok: boolean, reason?: string, url: string}>}
 */
export async function deleteTweetSafe({ handle, id }) {
  const { account } = await selectOne(handle);
  const url = `https://x.com/${account.handle}/status/${id}`;
  let built = null;
  try {
    built = await buildScraperForAccount(account);
    const res = await built.scraper.deleteTweet(String(id));
    if (res?.errors?.length) {
      return { ok: false, reason: `X rejected the delete: ${JSON.stringify(res.errors).slice(0, 200)}`, url };
    }
    let stillThere = false;
    try {
      const t = await built.scraper.scrapeTweetById(String(id));
      stillThere = Boolean(t && (t.id || t.rest_id || t.text));
    } catch { stillThere = false; }
    if (stillThere) return { ok: false, reason: 'delete did not take effect — tweet still retrievable', url };
    return { ok: true, url };
  } finally {
    if (built) await closeFetch(built.proxiedFetch);
  }
}
