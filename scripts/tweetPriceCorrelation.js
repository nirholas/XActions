// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/tweetPriceCorrelation.js
// Browser console script — correlate a founder's tweet frequency with token price movements
// Paste in DevTools console on x.com/USERNAME (any crypto founder's profile)
// Inspired by https://github.com/rohunvora/tweet-price-charts
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIG — edit these before running
  // =============================================
  const CONFIG = {
    // Token to track (CoinGecko ID — find at coingecko.com/en/coins/TOKEN)
    tokenId: 'solana',

    // Alternative: GeckoTerminal pool address (for unlisted tokens)
    // Set network + poolAddress to use GeckoTerminal instead of CoinGecko
    network: null,        // e.g. 'solana', 'eth', 'bsc'
    poolAddress: null,    // e.g. '0x...'

    // How many tweets to scrape from the profile (scrolls timeline)
    maxTweets: 100,

    // Price windows to measure impact after each tweet
    impactWindows: [1, 24], // hours

    // Scroll settings
    scrollDelay: 1500,
    maxScrollAttempts: 50,
  };

  // =============================================
  // Helpers
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const downloadCSV = (rows, filename) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const v = r[h] ?? '';
      return typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))
        ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const parseCount = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  const pct = (v) => v > 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;

  // =============================================
  // Price Fetching
  // =============================================

  const fetchCoinGeckoPrices = async (tokenId, startTs, endTs) => {
    const url = `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart/range?vs_currency=usd&from=${startTs}&to=${endTs}`;
    console.log(`💰 Fetching CoinGecko prices for ${tokenId}...`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`CoinGecko API ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    // data.prices = [[timestamp_ms, price], ...]
    return data.prices.map(([ts, price]) => ({ ts, price }));
  };

  const fetchGeckoTerminalPrices = async (network, poolAddress, startTs, endTs) => {
    // GeckoTerminal OHLCV — 1h candles
    const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolAddress}/ohlcv/hour?aggregate=1&limit=1000`;
    console.log(`💰 Fetching GeckoTerminal prices for ${network}/${poolAddress}...`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`GeckoTerminal API ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    const candles = data?.data?.attributes?.ohlcv_list || [];
    return candles
      .map(([ts, o, h, l, c]) => ({ ts: ts * 1000, price: parseFloat(c) }))
      .filter(p => p.ts >= startTs * 1000 && p.ts <= endTs * 1000)
      .sort((a, b) => a.ts - b.ts);
  };

  const fetchPrices = async (startTs, endTs) => {
    if (CONFIG.network && CONFIG.poolAddress) {
      return fetchGeckoTerminalPrices(CONFIG.network, CONFIG.poolAddress, startTs, endTs);
    }
    return fetchCoinGeckoPrices(CONFIG.tokenId, startTs, endTs);
  };

  // =============================================
  // Tweet Scraping (from current profile page)
  // =============================================

  const scrapeTweets = async () => {
    const tweets = [];
    let scrollAttempts = 0;
    let lastCount = 0;
    let staleRounds = 0;

    while (tweets.length < CONFIG.maxTweets && scrollAttempts < CONFIG.maxScrollAttempts) {
      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        if (!link || tweets.find(t => t.url === link)) return;

        const timeEl = tweet.querySelector('time');
        const datetime = timeEl?.getAttribute('datetime');
        if (!datetime) return;

        const text = (tweet.querySelector('[data-testid="tweetText"]')?.textContent || '').substring(0, 280);
        const likes = parseCount(tweet.querySelector('[data-testid="like"] span, [data-testid="unlike"] span')?.textContent);
        const reposts = parseCount(tweet.querySelector('[data-testid="retweet"] span')?.textContent);
        const replies = parseCount(tweet.querySelector('[data-testid="reply"] span')?.textContent);
        const views = parseCount(tweet.querySelector('[data-testid="analyticsButton"] span, a[href*="/analytics"] span')?.textContent);

        tweets.push({
          url: link,
          datetime,
          timestamp: new Date(datetime).getTime(),
          text,
          likes,
          reposts,
          replies,
          views,
        });
      });

      if (tweets.length === lastCount) {
        staleRounds++;
        if (staleRounds >= 5) break;
      } else {
        staleRounds = 0;
        lastCount = tweets.length;
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
      if (scrollAttempts % 5 === 0) console.log(`📜 Scrolled ${scrollAttempts}x — ${tweets.length} tweets found`);
    }

    return tweets.sort((a, b) => a.timestamp - b.timestamp);
  };

  // =============================================
  // Price-Tweet Alignment & Impact Calculation
  // =============================================

  const findClosestPrice = (prices, targetTs) => {
    let best = null;
    let bestDiff = Infinity;
    for (const p of prices) {
      const diff = Math.abs(p.ts - targetTs);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = p;
      }
    }
    return best;
  };

  const computeImpact = (tweets, prices) => {
    return tweets.map(tweet => {
      const atTweet = findClosestPrice(prices, tweet.timestamp);
      if (!atTweet) return { ...tweet, priceAtTweet: null, impact: {} };

      const impact = {};
      for (const hours of CONFIG.impactWindows) {
        const futureTs = tweet.timestamp + hours * 3600 * 1000;
        const futurePrice = findClosestPrice(prices, futureTs);
        if (futurePrice && Math.abs(futurePrice.ts - futureTs) < hours * 3600 * 1000 * 0.5) {
          const change = ((futurePrice.price - atTweet.price) / atTweet.price) * 100;
          impact[`${hours}h`] = { price: futurePrice.price, change: Math.round(change * 100) / 100 };
        }
      }

      return {
        ...tweet,
        priceAtTweet: atTweet.price,
        impact,
      };
    });
  };

  // =============================================
  // Statistics (inspired by tweet-price-charts)
  // =============================================

  const computeStats = (results) => {
    const withImpact = results.filter(r => r.impact?.['24h']);
    if (!withImpact.length) return null;

    const changes24h = withImpact.map(r => r.impact['24h'].change);
    const positiveCount = changes24h.filter(c => c > 0).length;
    const bigMoves = changes24h.filter(c => Math.abs(c) >= 15);

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const median = (arr) => {
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    // Tweet frequency
    const timestamps = results.map(r => r.timestamp).sort();
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push((timestamps[i] - timestamps[i - 1]) / (1000 * 3600));
    }

    return {
      totalTweets: results.length,
      tweetsWithPriceData: withImpact.length,
      avgChange24h: Math.round(avg(changes24h) * 100) / 100,
      medianChange24h: Math.round(median(changes24h) * 100) / 100,
      winRate: Math.round((positiveCount / changes24h.length) * 10000) / 100,
      bigMoves: bigMoves.length,
      bigMovePct: Math.round((bigMoves.length / changes24h.length) * 10000) / 100,
      avgHoursBetweenTweets: gaps.length ? Math.round(avg(gaps) * 10) / 10 : null,
      bestTweet: withImpact.reduce((best, r) => r.impact['24h'].change > (best?.impact?.['24h']?.change ?? -Infinity) ? r : best, null),
      worstTweet: withImpact.reduce((worst, r) => r.impact['24h'].change < (worst?.impact?.['24h']?.change ?? Infinity) ? r : worst, null),
    };
  };

  // =============================================
  // Main
  // =============================================

  const run = async () => {
    console.log('📊 TWEET-PRICE CORRELATION ANALYZER — by nichxbt');
    console.log('💡 Inspired by https://github.com/rohunvora/tweet-price-charts');
    console.log('');

    // Detect profile
    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    if (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i', 'settings'].includes(pathMatch[1])) {
      console.error('❌ Navigate to a profile page first! (x.com/USERNAME)');
      return;
    }
    const username = pathMatch[1];
    console.log(`👤 Analyzing @${username}'s tweets vs ${CONFIG.tokenId || `${CONFIG.network}/${CONFIG.poolAddress}`} price`);
    console.log('');

    // Step 1: Scrape tweets
    console.log('🔍 Step 1/3: Scraping tweets from timeline...');
    const tweets = await scrapeTweets();
    if (!tweets.length) {
      console.error('❌ No tweets found. Make sure you\'re on a profile page with visible tweets.');
      return;
    }
    console.log(`✅ Found ${tweets.length} tweets (${new Date(tweets[0].datetime).toLocaleDateString()} — ${new Date(tweets[tweets.length - 1].datetime).toLocaleDateString()})`);
    console.log('');

    // Step 2: Fetch prices
    console.log('💰 Step 2/3: Fetching token prices...');
    const startTs = Math.floor(tweets[0].timestamp / 1000) - 86400; // 1 day before first tweet
    const endTs = Math.floor(tweets[tweets.length - 1].timestamp / 1000) + 86400 * 2; // 2 days after last
    let prices;
    try {
      prices = await fetchPrices(startTs, endTs);
    } catch (err) {
      console.error(`❌ Price fetch failed: ${err.message}`);
      console.log('💡 Tip: Check CONFIG.tokenId (CoinGecko ID) or set network + poolAddress for GeckoTerminal');
      return;
    }
    console.log(`✅ Got ${prices.length} price points`);
    console.log('');

    // Step 3: Compute correlation
    console.log('🧮 Step 3/3: Computing price impact...');
    const results = computeImpact(tweets, prices);
    const stats = computeStats(results);

    // Display results
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📊 TWEET-PRICE CORRELATION: @${username} × ${CONFIG.tokenId || CONFIG.poolAddress}`);
    console.log('═══════════════════════════════════════════════════');

    if (stats) {
      console.log(`📈 Tweets analyzed:     ${stats.tweetsWithPriceData} / ${stats.totalTweets}`);
      console.log(`📊 Avg 24h change:      ${pct(stats.avgChange24h)}`);
      console.log(`📊 Median 24h change:   ${pct(stats.medianChange24h)}`);
      console.log(`🎯 Win rate (24h):      ${stats.winRate}%`);
      console.log(`🔥 Big moves (±15%):    ${stats.bigMoves} (${stats.bigMovePct}%)`);
      console.log(`⏱️  Avg tweet gap:       ${stats.avgHoursBetweenTweets}h`);
      console.log('');

      if (stats.bestTweet) {
        console.log(`🏆 Best tweet:  ${pct(stats.bestTweet.impact['24h'].change)} — "${stats.bestTweet.text.substring(0, 80)}..."`);
      }
      if (stats.worstTweet) {
        console.log(`💀 Worst tweet: ${pct(stats.worstTweet.impact['24h'].change)} — "${stats.worstTweet.text.substring(0, 80)}..."`);
      }

      // Top 5 movers
      const sorted = results.filter(r => r.impact?.['24h']).sort((a, b) => Math.abs(b.impact['24h'].change) - Math.abs(a.impact['24h'].change));
      if (sorted.length) {
        console.log('');
        console.log('📋 Top 5 price-moving tweets (by |24h change|):');
        sorted.slice(0, 5).forEach((r, i) => {
          console.log(`  ${i + 1}. ${pct(r.impact['24h'].change)} | $${r.priceAtTweet.toFixed(4)} → $${r.impact['24h'].price.toFixed(4)} | "${r.text.substring(0, 60)}..."`);
        });
      }
    } else {
      console.log('⚠️ Not enough price data to compute stats. Try a different token or broader date range.');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');

    // Prepare export data
    const exportData = {
      meta: {
        username,
        token: CONFIG.tokenId || `${CONFIG.network}/${CONFIG.poolAddress}`,
        generatedAt: new Date().toISOString(),
        source: 'XActions tweet-price correlation (inspired by tweet-price-charts)',
        credit: 'https://github.com/rohunvora/tweet-price-charts',
      },
      stats,
      tweets: results.map(r => ({
        url: r.url,
        datetime: r.datetime,
        text: r.text,
        likes: r.likes,
        reposts: r.reposts,
        replies: r.replies,
        views: r.views,
        priceAtTweet: r.priceAtTweet,
        ...Object.fromEntries(
          Object.entries(r.impact || {}).flatMap(([k, v]) => [
            [`price_${k}`, v.price],
            [`change_${k}`, v.change],
          ])
        ),
      })),
    };

    // Download JSON + CSV
    const ts = new Date().toISOString().slice(0, 10);
    download(exportData, `tweet-price-${username}-${CONFIG.tokenId || 'pool'}-${ts}.json`);
    downloadCSV(exportData.tweets, `tweet-price-${username}-${CONFIG.tokenId || 'pool'}-${ts}.csv`);

    console.log('');
    console.log('✅ Done! JSON + CSV downloaded.');
    console.log('💡 Tip: Open the CSV in a spreadsheet to chart tweet dates vs price impact');
  };

  run();
})();
