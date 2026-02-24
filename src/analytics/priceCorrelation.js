/**
 * XActions Tweet-Price Correlation Engine
 *
 * Analyzes the relationship between a user's tweet activity and
 * a crypto token's price movements. Fetches prices from CoinGecko
 * or GeckoTerminal and aligns them with scraped tweet timestamps.
 *
 * Inspired by https://github.com/rohunvora/tweet-price-charts
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Price Fetching — CoinGecko (free, no key) + GeckoTerminal (DEX pools)
// ============================================================================

/**
 * Fetch historical price data from CoinGecko (hourly granularity).
 * @param {string} tokenId — CoinGecko coin ID (e.g. 'bitcoin', 'solana')
 * @param {number} fromTs — UNIX timestamp (seconds)
 * @param {number} toTs — UNIX timestamp (seconds)
 * @returns {Promise<Array<{ts: number, price: number}>>}
 */
export const fetchCoinGeckoPrices = async (tokenId, fromTs, toTs) => {
  const url = `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart/range?vs_currency=usd&from=${fromTs}&to=${toTs}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`CoinGecko API ${resp.status}: ${text || resp.statusText}`);
  }
  const data = await resp.json();
  return (data.prices || []).map(([ts, price]) => ({ ts, price }));
};

/**
 * Fetch historical OHLCV from GeckoTerminal (for DEX-only tokens).
 * @param {string} network — e.g. 'solana', 'eth', 'bsc'
 * @param {string} poolAddress — pool/pair contract address
 * @param {number} fromTs — UNIX timestamp (seconds)
 * @param {number} toTs — UNIX timestamp (seconds)
 * @returns {Promise<Array<{ts: number, price: number, open: number, high: number, low: number, close: number}>>}
 */
export const fetchGeckoTerminalPrices = async (network, poolAddress, fromTs, toTs) => {
  const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolAddress}/ohlcv/hour?aggregate=1&limit=1000`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`GeckoTerminal API ${resp.status}: ${text || resp.statusText}`);
  }
  const data = await resp.json();
  const candles = data?.data?.attributes?.ohlcv_list || [];
  return candles
    .map(([ts, o, h, l, c]) => ({
      ts: ts * 1000,
      price: parseFloat(c),
      open: parseFloat(o),
      high: parseFloat(h),
      low: parseFloat(l),
      close: parseFloat(c),
    }))
    .filter(p => p.ts >= fromTs * 1000 && p.ts <= toTs * 1000)
    .sort((a, b) => a.ts - b.ts);
};

// ============================================================================
// Alignment — match each tweet to closest price point
// ============================================================================

/**
 * Find the closest price point to a given timestamp.
 * @param {Array<{ts: number, price: number}>} prices
 * @param {number} targetTs — milliseconds
 * @returns {{ts: number, price: number}|null}
 */
const findClosestPrice = (prices, targetTs) => {
  let best = null;
  let bestDiff = Infinity;
  for (const p of prices) {
    const diff = Math.abs(p.ts - targetTs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
    // Early exit — prices are sorted, so once diff starts growing we passed the closest
    if (best && diff > bestDiff) break;
  }
  return best;
};

/**
 * Align tweets with price data and compute impact windows.
 * @param {Array<{timestamp: number, text: string, url?: string}>} tweets — tweet objects with .timestamp (ms)
 * @param {Array<{ts: number, price: number}>} prices — sorted price points
 * @param {number[]} [windows=[1, 24]] — hours after tweet to measure
 * @returns {Array} tweets enriched with priceAtTweet and impact
 */
export const alignTweetsWithPrices = (tweets, prices, windows = [1, 24]) => {
  return tweets.map(tweet => {
    const atTweet = findClosestPrice(prices, tweet.timestamp);
    if (!atTweet) return { ...tweet, priceAtTweet: null, impact: {} };

    const impact = {};
    for (const hours of windows) {
      const futureTs = tweet.timestamp + hours * 3600_000;
      const futurePrice = findClosestPrice(prices, futureTs);
      // Only accept if the closest point is within half the window
      if (futurePrice && Math.abs(futurePrice.ts - futureTs) < hours * 3600_000 * 0.5) {
        const change = ((futurePrice.price - atTweet.price) / atTweet.price) * 100;
        impact[`${hours}h`] = {
          price: futurePrice.price,
          change: Math.round(change * 100) / 100,
        };
      }
    }

    return { ...tweet, priceAtTweet: atTweet.price, impact };
  });
};

// ============================================================================
// Statistics — summary metrics for the correlation
// ============================================================================

/**
 * Compute correlation statistics from aligned tweet-price data.
 * @param {Array} alignedTweets — output of alignTweetsWithPrices
 * @returns {object|null} stats object, or null if insufficient data
 */
export const computeCorrelationStats = (alignedTweets) => {
  const withImpact = alignedTweets.filter(r => r.impact?.['24h']);
  if (!withImpact.length) return null;

  const changes24h = withImpact.map(r => r.impact['24h'].change);
  const changes1h = withImpact.filter(r => r.impact?.['1h']).map(r => r.impact['1h'].change);
  const positiveCount = changes24h.filter(c => c > 0).length;
  const bigMoves = changes24h.filter(c => Math.abs(c) >= 15);

  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const median = (arr) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  // Tweet frequency analysis
  const timestamps = alignedTweets.map(r => r.timestamp).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push((timestamps[i] - timestamps[i - 1]) / 3600_000);
  }

  // Silence detection — gaps of 48h+ with price context
  const silences = [];
  for (let i = 1; i < timestamps.length; i++) {
    const gapHours = (timestamps[i] - timestamps[i - 1]) / 3600_000;
    if (gapHours >= 48) {
      const priceBefore = findClosestPrice(alignedTweets.filter(t => t.priceAtTweet).map(t => ({ ts: t.timestamp, price: t.priceAtTweet })), timestamps[i - 1]);
      const priceAfter = findClosestPrice(alignedTweets.filter(t => t.priceAtTweet).map(t => ({ ts: t.timestamp, price: t.priceAtTweet })), timestamps[i]);
      silences.push({
        startDate: new Date(timestamps[i - 1]).toISOString(),
        endDate: new Date(timestamps[i]).toISOString(),
        gapHours: Math.round(gapHours),
        priceBefore: priceBefore?.price ?? null,
        priceAfter: priceAfter?.price ?? null,
        priceChange: priceBefore && priceAfter
          ? Math.round(((priceAfter.price - priceBefore.price) / priceBefore.price) * 10000) / 100
          : null,
      });
    }
  }

  // Find best/worst tweets
  const best = withImpact.reduce((b, r) =>
    r.impact['24h'].change > (b?.impact?.['24h']?.change ?? -Infinity) ? r : b, null);
  const worst = withImpact.reduce((w, r) =>
    r.impact['24h'].change < (w?.impact?.['24h']?.change ?? Infinity) ? r : w, null);

  return {
    totalTweets: alignedTweets.length,
    tweetsWithPriceData: withImpact.length,
    avgChange1h: changes1h.length ? Math.round(avg(changes1h) * 100) / 100 : null,
    avgChange24h: Math.round(avg(changes24h) * 100) / 100,
    medianChange24h: Math.round(median(changes24h) * 100) / 100,
    winRate: Math.round((positiveCount / changes24h.length) * 10000) / 100,
    bigMoves: bigMoves.length,
    bigMovePct: Math.round((bigMoves.length / changes24h.length) * 10000) / 100,
    avgHoursBetweenTweets: gaps.length ? Math.round(avg(gaps) * 10) / 10 : null,
    silences,
    bestTweet: best ? { text: best.text?.substring(0, 200), url: best.url, change24h: best.impact['24h'].change, priceAtTweet: best.priceAtTweet } : null,
    worstTweet: worst ? { text: worst.text?.substring(0, 200), url: worst.url, change24h: worst.impact['24h'].change, priceAtTweet: worst.priceAtTweet } : null,
  };
};

// ============================================================================
// High-level API — full correlation analysis
// ============================================================================

/**
 * Run a full tweet-price correlation analysis.
 *
 * @param {object} options
 * @param {Array<{timestamp: number, text: string, url?: string}>} options.tweets — tweet data
 * @param {string} [options.tokenId] — CoinGecko token ID
 * @param {string} [options.network] — GeckoTerminal network
 * @param {string} [options.poolAddress] — GeckoTerminal pool address
 * @param {number[]} [options.windows=[1, 24]] — impact windows in hours
 * @returns {Promise<{aligned: Array, stats: object, meta: object}>}
 */
export const analyzeTweetPriceCorrelation = async ({
  tweets,
  tokenId,
  network,
  poolAddress,
  windows = [1, 24],
}) => {
  if (!tweets?.length) throw new Error('No tweets provided');
  if (!tokenId && !(network && poolAddress)) {
    throw new Error('Either tokenId (CoinGecko) or network + poolAddress (GeckoTerminal) is required');
  }

  // Ensure tweets are sorted by timestamp
  const sorted = [...tweets].sort((a, b) => a.timestamp - b.timestamp);
  const firstTs = Math.floor(sorted[0].timestamp / 1000) - 86400;
  const lastTs = Math.floor(sorted[sorted.length - 1].timestamp / 1000) + 86400 * 2;

  // Fetch prices
  const prices = tokenId
    ? await fetchCoinGeckoPrices(tokenId, firstTs, lastTs)
    : await fetchGeckoTerminalPrices(network, poolAddress, firstTs, lastTs);

  if (!prices.length) throw new Error('No price data returned. Check token ID or pool address.');

  // Align and compute
  const aligned = alignTweetsWithPrices(sorted, prices, windows);
  const stats = computeCorrelationStats(aligned);

  return {
    aligned,
    stats,
    meta: {
      token: tokenId || `${network}/${poolAddress}`,
      priceSource: tokenId ? 'coingecko' : 'geckoterminal',
      pricePoints: prices.length,
      dateRange: {
        from: new Date(sorted[0].timestamp).toISOString(),
        to: new Date(sorted[sorted.length - 1].timestamp).toISOString(),
      },
      windows,
      credit: 'Inspired by https://github.com/rohunvora/tweet-price-charts',
    },
  };
};
