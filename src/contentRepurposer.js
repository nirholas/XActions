/**
 * ============================================================
 * ♻️ Content Repurposer — Production Grade
 * ============================================================
 *
 * @name        contentRepurposer.js
 * @description Transform existing tweets into new content formats.
 *              Convert single tweets → threads, threads → single
 *              tweets, long tweets → tweet storms, tweets → blog
 *              outlines, tweets → quote-tweet templates. Maximize
 *              content ROI by repurposing your top-performing posts.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to your profile page (x.com/youraccount) or any tweet
 * 2. Paste this script into DevTools console
 * 3. Use the XActions.* commands below
 *
 * ── Commands ────────────────────────────────────────────────
 *  XActions.scan()
 *    → Scrapes your recent tweets from the timeline
 *
 *  XActions.toThread(index)
 *    → Converts a single tweet into a thread outline (1→many)
 *
 *  XActions.toSummary(index)
 *    → Condenses a thread or long tweet into one punchy tweet
 *
 *  XActions.toStorm(index)
 *    → Breaks a long tweet into a numbered tweet storm
 *
 *  XActions.toBlog(index)
 *    → Generates a blog-post outline from a tweet or thread
 *
 *  XActions.toQuoteTemplates(index)
 *    → Creates 3 quote-retweet variations for engagement
 *
 *  XActions.all(index)
 *    → Runs ALL repurposing strategies on one tweet
 *
 *  XActions.list()
 *    → Shows all scraped tweets with indices
 *
 *  XActions.export()
 *    → Downloads all repurposed content as JSON
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    scrollRounds: 5,
    scrollDelay: 1800,
    maxTweets: 50,
    maxTweetLength: 280,
    threadPartLength: 260,  // Leave room for numbering
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  let tweets = [];
  const repurposed = [];

  // ── Scrape tweets from current timeline ───────────────────
  const scrapeTweets = async () => {
    console.log('🔍 Scanning timeline for tweets to repurpose...\n');
    const seen = new Set();
    tweets = [];

    for (let round = 0; round < CONFIG.scrollRounds && tweets.length < CONFIG.maxTweets; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        if (tweets.length >= CONFIG.maxTweets) break;

        const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
        if (!tweetTextEl) continue;
        const text = tweetTextEl.textContent.trim();
        if (text.length < 10 || seen.has(text.slice(0, 80))) continue;
        seen.add(text.slice(0, 80));

        // Metrics
        const metricsBar = article.querySelector('[role="group"]');
        const metricEls = metricsBar ? metricsBar.querySelectorAll('[data-testid]') : [];
        const metrics = { replies: 0, retweets: 0, likes: 0, views: 0 };
        for (const el of metricEls) {
          const tid = el.getAttribute('data-testid') || '';
          const val = parseInt((el.textContent || '').replace(/[,\s]/g, ''), 10) || 0;
          if (tid.includes('reply')) metrics.replies = val;
          else if (tid.includes('retweet')) metrics.retweets = val;
          else if (tid.includes('like')) metrics.likes = val;
        }
        const viewSpan = article.querySelector('a[href*="/analytics"] span');
        if (viewSpan) metrics.views = parseInt(viewSpan.textContent.replace(/[,\s]/g, ''), 10) || 0;

        // Link to tweet
        const timeLink = article.querySelector('time')?.closest('a');
        const tweetUrl = timeLink ? timeLink.getAttribute('href') : '';

        // Has media?
        const hasMedia = !!article.querySelector('[data-testid="tweetPhoto"]') ||
                         !!article.querySelector('video') ||
                         !!article.querySelector('[data-testid="card.wrapper"]');

        tweets.push({
          index: tweets.length,
          text,
          metrics,
          url: tweetUrl ? `https://x.com${tweetUrl}` : '',
          hasMedia,
          charCount: text.length,
          wordCount: text.split(/\s+/).length,
        });
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`✅ Found ${tweets.length} tweets. Use XActions.list() to see them.\n`);
    return tweets;
  };

  // ── Helper: word-wrap into chunks ─────────────────────────
  const splitIntoChunks = (text, maxLen) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if ((current + ' ' + trimmed).trim().length <= maxLen) {
        current = (current + ' ' + trimmed).trim();
      } else {
        if (current) chunks.push(current);
        current = trimmed;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  };

  // ── Repurpose: Tweet → Thread ─────────────────────────────
  const toThread = (idx) => {
    const tweet = tweets[idx];
    if (!tweet) { console.log('❌ Invalid index. Use XActions.list()'); return; }

    console.log(`\n🧵 REPURPOSE → THREAD from tweet #${idx}\n`);
    console.log(`Original (${tweet.charCount} chars): "${tweet.text.slice(0, 120)}..."\n`);

    const result = { type: 'thread', sourceIndex: idx, parts: [] };

    // Hook tweet
    const hookWords = tweet.text.split(/\s+/).slice(0, 8).join(' ');
    result.parts.push({
      number: 1,
      text: `${hookWords}...\n\nHere's what most people get wrong 🧵👇`,
      role: 'Hook — grab attention',
    });

    // Body parts by sentence splitting
    const chunks = splitIntoChunks(tweet.text, CONFIG.threadPartLength);
    for (let i = 0; i < chunks.length; i++) {
      result.parts.push({
        number: i + 2,
        text: chunks[i],
        role: `Body part ${i + 1}`,
      });
    }

    // Closing
    result.parts.push({
      number: result.parts.length + 1,
      text: `TL;DR:\n\n${tweet.text.slice(0, 180)}\n\nIf this was helpful, RT the first tweet ♻️`,
      role: 'Summary + CTA',
    });

    // Display
    console.log('━━━ GENERATED THREAD ━━━');
    for (const part of result.parts) {
      console.log(`\n  ${part.number}/ [${part.role}]`);
      console.log(`  "${part.text}"`);
    }
    console.log(`\n  Total parts: ${result.parts.length}`);

    repurposed.push(result);
    return result;
  };

  // ── Repurpose: Tweet → Single Summary ─────────────────────
  const toSummary = (idx) => {
    const tweet = tweets[idx];
    if (!tweet) { console.log('❌ Invalid index.'); return; }

    console.log(`\n📝 REPURPOSE → SUMMARY from tweet #${idx}\n`);

    const words = tweet.text.split(/\s+/);
    const keyPhrases = [];

    // Extract key phrases (simple heuristic: longest words, capitalized words)
    const meaningful = words.filter(w => w.length > 4 && !w.startsWith('@') && !w.startsWith('http'));
    const unique = [...new Set(meaningful)].slice(0, 8);

    // Build condensed version
    const sentences = tweet.text.match(/[^.!?]+[.!?]+/g) || [tweet.text];
    const firstSentence = sentences[0]?.trim() || tweet.text.slice(0, 100);
    const lastSentence = sentences.length > 1 ? sentences[sentences.length - 1]?.trim() : '';

    const result = {
      type: 'summary',
      sourceIndex: idx,
      variations: [
        { label: 'Punchy', text: `${firstSentence}${lastSentence ? '\n\n' + lastSentence : ''}` },
        { label: 'Question hook', text: `What if ${firstSentence.toLowerCase().replace(/^[A-Z]/, c => c.toLowerCase())}?\n\n${unique.slice(0, 4).join(' → ')} → 💡` },
        { label: 'Stat-style', text: `${tweet.wordCount} words, 1 truth:\n\n${firstSentence}` },
      ],
    };

    console.log('━━━ GENERATED SUMMARIES ━━━');
    for (const v of result.variations) {
      const len = v.text.length;
      const fits = len <= 280 ? '✅' : `⚠️ ${len} chars`;
      console.log(`\n  [${v.label}] ${fits}`);
      console.log(`  "${v.text}"`);
    }

    repurposed.push(result);
    return result;
  };

  // ── Repurpose: Long Tweet → Storm ─────────────────────────
  const toStorm = (idx) => {
    const tweet = tweets[idx];
    if (!tweet) { console.log('❌ Invalid index.'); return; }

    console.log(`\n⛈️ REPURPOSE → TWEET STORM from tweet #${idx}\n`);

    const chunks = splitIntoChunks(tweet.text, 260); // 260 = leave room for "1/N" label
    const total = chunks.length;

    const result = {
      type: 'storm',
      sourceIndex: idx,
      parts: chunks.map((chunk, i) => ({
        number: `${i + 1}/${total}`,
        text: `${i + 1}/${total} ${chunk}`,
        charCount: (`${i + 1}/${total} ` + chunk).length,
      })),
    };

    console.log('━━━ GENERATED TWEET STORM ━━━');
    for (const part of result.parts) {
      const fits = part.charCount <= 280 ? '✅' : `⚠️ ${part.charCount}`;
      console.log(`\n  [${part.number}] ${fits}`);
      console.log(`  "${part.text}"`);
    }
    console.log(`\n  Total tweets: ${total}`);

    repurposed.push(result);
    return result;
  };

  // ── Repurpose: Tweet → Blog Outline ───────────────────────
  const toBlog = (idx) => {
    const tweet = tweets[idx];
    if (!tweet) { console.log('❌ Invalid index.'); return; }

    console.log(`\n📰 REPURPOSE → BLOG OUTLINE from tweet #${idx}\n`);

    const sentences = tweet.text.match(/[^.!?]+[.!?]+/g) || [tweet.text];
    const title = sentences[0]?.trim().replace(/[.!?]+$/, '') || tweet.text.slice(0, 60);

    const result = {
      type: 'blog',
      sourceIndex: idx,
      outline: {
        title: `${title}: Everything You Need to Know`,
        subtitle: `From a tweet that got ${tweet.metrics.likes} likes — here's the full story.`,
        sections: [
          { heading: '## Introduction', notes: `Expand on: "${sentences[0]?.trim() || tweet.text.slice(0, 100)}"` },
          ...sentences.slice(1).map((s, i) => ({
            heading: `## Section ${i + 1}`,
            notes: `Deep dive into: "${s.trim()}"`,
          })),
          { heading: '## Key Takeaways', notes: 'Bullet-point the main lessons' },
          { heading: '## Call to Action', notes: `Link back to original tweet: ${tweet.url}` },
        ],
        estimatedWords: Math.max(500, tweet.wordCount * 15),
        seoKeywords: [...new Set(tweet.text.split(/\s+/).filter(w => w.length > 5 && !w.startsWith('@') && !w.startsWith('http')))].slice(0, 5),
      },
    };

    console.log('━━━ GENERATED BLOG OUTLINE ━━━');
    console.log(`\n  Title: ${result.outline.title}`);
    console.log(`  Subtitle: ${result.outline.subtitle}`);
    console.log(`  Est. words: ${result.outline.estimatedWords}`);
    console.log(`  SEO keywords: ${result.outline.seoKeywords.join(', ')}\n`);
    for (const section of result.outline.sections) {
      console.log(`  ${section.heading}`);
      console.log(`    → ${section.notes}`);
    }

    repurposed.push(result);
    return result;
  };

  // ── Repurpose: Tweet → Quote-Tweet Templates ──────────────
  const toQuoteTemplates = (idx) => {
    const tweet = tweets[idx];
    if (!tweet) { console.log('❌ Invalid index.'); return; }

    console.log(`\n💬 REPURPOSE → QUOTE-TWEET TEMPLATES from tweet #${idx}\n`);

    const firstLine = tweet.text.split(/[.!?\n]/)[0]?.trim() || tweet.text.slice(0, 60);

    const result = {
      type: 'quoteTemplates',
      sourceIndex: idx,
      templates: [
        {
          style: 'Agreement + Amplification',
          text: `This. 100%.\n\n"${firstLine}"\n\nPeople still sleeping on this. 👇`,
        },
        {
          style: 'Personal Take',
          text: `I've been saying this for months.\n\n"${firstLine}"\n\nHere's what I'd add: [your insight]`,
        },
        {
          style: 'Contrarian / Debate',
          text: `Hot take: this is only half the story.\n\n"${firstLine}"\n\nWhat's missing: [your counterpoint]`,
        },
      ],
    };

    console.log('━━━ GENERATED QUOTE-TWEET TEMPLATES ━━━');
    for (const t of result.templates) {
      const len = t.text.length;
      console.log(`\n  [${t.style}] (${len} chars)`);
      console.log(`  "${t.text}"`);
    }

    repurposed.push(result);
    return result;
  };

  // ── Run all strategies ────────────────────────────────────
  const runAll = (idx) => {
    const tweet = tweets[idx];
    if (!tweet) { console.log('❌ Invalid index.'); return; }

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log(`║  ♻️ FULL REPURPOSE — Tweet #${idx}`.padEnd(57) + '║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\nOriginal: "${tweet.text.slice(0, 150)}..."`);
    console.log(`Metrics: ${tweet.metrics.likes} likes • ${tweet.metrics.retweets} RTs • ${tweet.metrics.replies} replies\n`);

    toThread(idx);
    toSummary(idx);
    toStorm(idx);
    toBlog(idx);
    toQuoteTemplates(idx);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ✅ Generated 5 content formats from tweet #${idx}`);
    console.log(`  📊 Total repurposed items: ${repurposed.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  };

  // ── List scraped tweets ───────────────────────────────────
  const listTweets = () => {
    if (tweets.length === 0) {
      console.log('❌ No tweets scraped yet. Run XActions.scan() first.');
      return;
    }

    console.log(`\n📋 SCRAPED TWEETS (${tweets.length})\n`);
    for (const t of tweets) {
      const preview = t.text.slice(0, 80).replace(/\n/g, ' ');
      console.log(`  [${t.index}] "${preview}..." — ❤️ ${t.metrics.likes} 🔄 ${t.metrics.retweets} (${t.charCount} chars)`);
    }
    console.log('\nUse XActions.toThread(i), .toSummary(i), .toStorm(i), .toBlog(i), .toQuoteTemplates(i), or .all(i)');
  };

  // ── Export ────────────────────────────────────────────────
  const exportAll = () => {
    if (repurposed.length === 0) {
      console.log('❌ No repurposed content yet.');
      return;
    }

    const data = {
      originalTweets: tweets.map(t => ({ index: t.index, text: t.text, metrics: t.metrics, url: t.url })),
      repurposedContent: repurposed,
      generatedAt: new Date().toISOString(),
      totalFormats: repurposed.length,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `xactions-repurposed-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    console.log(`📥 Exported ${repurposed.length} repurposed content items.`);
  };

  // ── Controls ──────────────────────────────────────────────
  window.XActions = window.XActions || {};
  window.XActions.scan = scrapeTweets;
  window.XActions.toThread = toThread;
  window.XActions.toSummary = toSummary;
  window.XActions.toStorm = toStorm;
  window.XActions.toBlog = toBlog;
  window.XActions.toQuoteTemplates = toQuoteTemplates;
  window.XActions.all = runAll;
  window.XActions.list = listTweets;
  window.XActions.export = exportAll;

  // ── Init ──────────────────────────────────────────────────
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  ♻️ CONTENT REPURPOSER — Ready                    ║');
  console.log('║  by nichxbt — v1.0                                ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n📋 Commands:');
  console.log('  XActions.scan()            — Scrape tweets from page');
  console.log('  XActions.list()            — List scraped tweets');
  console.log('  XActions.toThread(i)       — Convert → thread');
  console.log('  XActions.toSummary(i)      — Convert → short summary');
  console.log('  XActions.toStorm(i)        — Convert → tweet storm');
  console.log('  XActions.toBlog(i)         — Convert → blog outline');
  console.log('  XActions.toQuoteTemplates(i) — Create quote-RT variations');
  console.log('  XActions.all(i)            — Run ALL repurposing');
  console.log('  XActions.export()          — Download all as JSON');
  console.log('\nStart with: XActions.scan()');
})();
