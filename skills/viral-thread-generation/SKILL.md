---
name: viral-thread-generation
description: Researches trending topics and competitor threads to generate high-engagement thread content with optimized hooks, value ladders, and calls to action. Use when creating threads or planning viral content.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Viral Thread Generation

MCP-powered workflow for researching trends, analyzing successful threads, and generating high-engagement thread content.

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `x_search_tweets` | Find trending conversations and competitor threads |
| `x_get_tweets` | Analyze competitor content patterns |
| `x_get_profile` | Audience context for tone matching |
| `x_get_followers` | Understand target audience interests |

## Thread Structure Template

Every thread follows this 5-part structure:

1. **Hook** — First tweet. Stops the scroll. Use: curiosity gap, bold claim, or surprising stat.
2. **Credibility** — Why the reader should listen. Brief proof, experience, or data.
3. **Value ladder** — 3-7 tweets delivering the core content. Each tweet is self-contained but builds on the previous. Use numbered lists, one idea per tweet.
4. **Twist/insight** — Unexpected angle, counterintuitive takeaway, or personal story.
5. **CTA** — Call to action: follow, retweet, bookmark, reply, or link.

## Workflow

1. **Research trending topics** — Call `x_search_tweets` with 3-5 queries related to your niche. Sort by engagement. Identify topics with high reply counts (indicates discussion potential).
2. **Analyze competitor threads** — Call `x_get_tweets` for 3-5 competitor accounts with `limit: 50`. Filter for threads (tweets with "🧵" or "Thread:" or high reply counts). Note which hooks and formats performed best.
3. **Mine audience interests** — Call `x_get_followers` with `limit: 100` for your account. Scan bios for common interests, job titles, and pain points.
4. **Generate 3 thread drafts** — For each, apply the thread structure template:
   - Thread A: Educational (how-to or framework)
   - Thread B: Story-driven (case study or personal experience)
   - Thread C: Contrarian (challenge common wisdom)
5. **Optimize hooks** — Write 3 hook variations per thread. Test criteria:
   - Creates curiosity gap or tension
   - Under 200 characters
   - No hashtags in hook tweet
   - Includes a number, question, or bold claim
6. **Add engagement triggers** — Insert throughout each thread:
   - "Bookmark this" at the value peak
   - A reply prompt ("What would you add?")
   - Retweet hook in final tweet
7. **Format for posting** — Number each tweet, keep under 280 chars, end thread with CTA.

## Output Template

```
## Thread Drafts: {topic}

### Thread A: {title} (Educational)
**Hook options:**
1. "{hook variation 1}"
2. "{hook variation 2}"
3. "{hook variation 3}"

**Thread (selected hook):**
1/ {hook}
2/ {credibility}
3/ {value point 1}
4/ {value point 2}
5/ {value point 3}
6/ {twist/insight}
7/ {CTA — follow + retweet}

**Engagement triggers:** {where bookmarks/replies are prompted}

### Thread B: {title} (Story)
{same structure}

### Thread C: {title} (Contrarian)
{same structure}

### Posting Strategy
- Best day/time: {recommendation}
- Space threads 2-3 days apart
- Reply to your own thread with bonus content 1hr after posting
```

## Tips

- Threads with 7-12 tweets perform best — long enough for value, short enough to finish
- First tweet determines 80% of thread performance — invest most time there
- Add line breaks in tweets for readability
- End mid-thread tweets with a hook to the next ("But here's what most people miss →")
