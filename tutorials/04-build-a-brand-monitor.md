# Tutorial 04 — Build a brand monitor

**Time:** 30 minutes · **Login required:** yes · **You need:** Tutorial 01 finished

Build a service that watches X for mentions of a term, scores each one for
sentiment, and posts an alert when something negative appears. By the end you
will have a program you can leave running.

We build it in five passes, each one working before the next starts. That order
matters: it means you always have something you can run, and when a pass breaks
you know exactly which change did it.

```bash
mkdir brand-monitor && cd brand-monitor
npm init -y
npm pkg set type=module
npm install xactions
```

```bash
export X_AUTH_TOKEN=...    # from DevTools > Application > Cookies > x.com
export X_CSRF_TOKEN=...
```

Search is session-tier, so both cookies are required. `npx xactions connect`
captures them for you through a real browser if you would rather not dig them
out by hand. See [Tutorial 01, step 4](01-your-first-scrape.md#step-4--log-in).

---

## Pass 1 — Get the mentions

`monitor.js`:

```js
import { Scraper, SearchMode } from 'xactions/client';

const QUERY = process.argv[2] || 'xactions';

const scraper = new Scraper();
await scraper.setCookies(`auth_token=${process.env.X_AUTH_TOKEN}; ct0=${process.env.X_CSRF_TOKEN}`);

for await (const tweet of scraper.searchTweets(QUERY, 20, SearchMode.Latest)) {
  console.log(`${tweet.id}: ${tweet.text.replace(/\s+/g, ' ').slice(0, 100)}`);
}
```

```bash
node monitor.js "your brand"
```

If this fails with `AUTH_REQUIRED`, your cookies are missing or `ct0` is absent.
Fix that before continuing; nothing below will work without it.

---

## Pass 2 — Only report what is new

A monitor that re-reports the same posts every cycle is noise. Track what you
have seen, and treat the first pass as a baseline rather than alerting on the
entire backlog:

```js
const seen = new Set();
let baseline = true;

async function poll() {
  let fresh = 0;

  for await (const tweet of scraper.searchTweets(QUERY, 25, SearchMode.Latest)) {
    if (seen.has(tweet.id)) continue;
    seen.add(tweet.id);

    // First pass records what already existed. Without this, starting the
    // monitor alerts on months of history at once.
    if (baseline) continue;

    fresh += 1;
    console.log(`${tweet.id}: ${tweet.text.slice(0, 100)}`);
  }

  if (baseline) {
    baseline = false;
    console.log(`Baseline set: ${seen.size} existing posts ignored.`);
  } else if (fresh === 0) {
    console.log('No new matches.');
  }
}

await poll();
setInterval(poll, 60_000);
```

`seen` grows without bound over a long run. For anything you intend to leave up
for weeks, persist it and cap it: a `Set` of the last 10,000 IDs is plenty,
because X search only reaches back so far anyway.

---

## Pass 3 — Score the sentiment

XActions ships a rule-based analyzer that runs entirely offline: no model, no
key, no network call, no per-request cost.

```js
import { analyzeSentiment } from 'xactions/analytics';

const sentiment = await analyzeSentiment(tweet.text);
// { score: -0.6, label: 'negative', confidence: 1, keywords: ['terrible', 'broken'] }
```

Wire it into the loop:

```js
fresh += 1;
const sentiment = await analyzeSentiment(tweet.text || '');
const marker = { positive: '+', negative: '!', neutral: ' ' }[sentiment.label];

console.log(`${marker} ${tweet.text.slice(0, 90)}`);
console.log(`   https://x.com/i/web/status/${tweet.id}`);
```

`https://x.com/i/web/status/<id>` is the form to reach for when you are building
links from search or timeline results. It needs only the post id and redirects
to the real permalink, so it keeps working even when a result does not carry the
author's handle.

Want a model instead? Same function, same return shape, so nothing downstream
changes:

```js
const sentiment = await analyzeSentiment(tweet.text, { mode: 'llm' });
```

That runs on free models and needs no key, but it calls a model per post. Start with the rule-based mode. It is
instant, and good enough to decide whether something is worth a human look,
which is the only decision this program is making.

---

## Pass 4 — Alert

Printing to a terminal nobody is watching is not monitoring. Post negatives to a
webhook:

```js
async function notify(tweet, sentiment) {
  if (!process.env.ALERT_WEBHOOK) return;

  try {
    await fetch(process.env.ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Negative mention: ${tweet.text}`,
        url: `https://x.com/i/web/status/${tweet.id}`,
        sentiment,
        detectedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    // A dead webhook must not kill the monitor.
    console.error(`Webhook failed: ${error.message}`);
  }
}
```

```js
if (sentiment.label === 'negative') await notify(tweet, sentiment);
```

Slack and Discord both accept a JSON body with a `text` field, so this works
against either with no changes:

```bash
export ALERT_WEBHOOK=https://hooks.slack.com/services/...
```

---

## Pass 5 — Survive

The difference between a script and a service is what happens on a bad day.

**A failed poll must not end the run.** Rate limits and transient 5xx both
resolve themselves by the next interval:

```js
async function poll() {
  try {
    // ... the loop
  } catch (error) {
    console.error(`[${new Date().toISOString()}] poll failed: ${error.message}`);
    return;   // Try again next interval.
  }
}
```

**Back off when throttled.** Guest tokens are throttled hard, and even
authenticated search has limits:

```js
catch (error) {
  if (error.code === 'RATE_LIMITED') {
    const waitMs = error.rateLimitReset
      ? Math.max(0, error.rateLimitReset - Date.now())
      : 15 * 60_000;
    console.error(`Rate limited. Sleeping ${Math.round(waitMs / 1000)}s.`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  return;
}
```

**Shut down cleanly**, so you can tell a stop from a crash:

```js
process.on('SIGINT', () => {
  clearInterval(timer);
  console.log(`\nStopped. ${seen.size} unique posts seen.`);
  process.exit(0);
});
```

**Poll on a sane interval.** 60 seconds is fine for a brand nobody talks about
and wasteful for one that trends. Match it to the volume you actually see, and
remember every poll spends rate-limit budget you might want for something else.

---

## The finished thing

[`examples/07-keyword-monitor.js`](../examples/07-keyword-monitor.js) is all five
passes assembled, and it runs:

```bash
node examples/07-keyword-monitor.js "your brand" 120
ALERT_WEBHOOK=https://hooks.slack.com/... node examples/07-keyword-monitor.js "your brand"
```

---

## Where to take it

**Watch competitors too.** Run several queries in one process and tag alerts by
which query matched.

**Track it over time.** Write every scored mention to a file or a database and
you have a sentiment trend, which is far more useful than any single alert.
`aggregateResults()` from `xactions/analytics` gives you average, median, and
direction over a batch.

**Reply automatically.** With a session you can `x_reply` from the MCP server or
`scraper.sendTweet()` from the library. Be careful: an auto-responder that
misreads sarcasm is a worse problem than the one it solves.

**Deploy it.** A Dockerfile ships with the repo, and
[docs/deployment.md](../docs/deployment.md) covers Railway, Fly.io, and Docker.
This is a single long-lived process with no database, so the smallest instance
anywhere will do.

---

## What you learned

- Build in passes, each one runnable, so a break has one obvious cause
- Baseline the first poll or you alert on the entire backlog
- Sentiment analysis runs offline and free; upgrade to a model only if you must
- A failed poll returns, it does not throw
- `error.code === 'RATE_LIMITED'` carries `rateLimitReset`: use it to back off
- Build post links from the id (`/i/web/status/<id>`), which never depends on a handle

## Next

- [Examples](../examples/) — more programs to take apart
- [Analytics docs](../docs/analytics.md) — sentiment, reputation, follower tracking
- [Deployment](../docs/deployment.md) — putting it somewhere permanent
