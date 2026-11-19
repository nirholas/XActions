// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Per-action bookkeeping shared by the bulk operation engines: the rolling
 * 24 hour action cap and cancellation.
 *
 * The bulk follow, unfollow, like and reply engines never charged the cap that
 * every other write path charges, so one job could spend an account's whole
 * daily budget and more. Each engine now asks `spend()` before every write. A
 * cap that is reached stops the loop and the job returns what it did, rather
 * than failing and losing the partial result.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/**
 * @param {(actionClass: string) => Promise<unknown>} [charge] - ctx.charge from the job context
 * @param {() => boolean} [isCancelled]
 */
export function actionBudget(charge, isCancelled = () => false) {
  let stoppedReason = null;
  return {
    /** Why the loop stopped early, or null. */
    get stoppedReason() {
      return stoppedReason;
    },

    /**
     * Whether one more write of this class may go ahead. False once the job is
     * cancelled or the account's cap is reached; any other error is thrown.
     *
     * @param {'follow'|'unfollow'|'like'|'reply'} actionClass
     */
    async spend(actionClass) {
      if (stoppedReason) return false;
      if (isCancelled()) {
        stoppedReason = 'cancelled';
        return false;
      }
      if (!charge) return true;
      try {
        await charge(actionClass);
        return true;
      } catch (err) {
        if (err?.name !== 'ActionCapExceededError') throw err;
        stoppedReason = err.message;
        return false;
      }
    },
  };
}
