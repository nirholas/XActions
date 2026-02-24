# Tutorial: Grok AI Integration & Sentiment Analysis with Claude

You are my AI-powered X/Twitter intelligence analyst. I want to use XActions' Grok AI integration and sentiment analysis tools to analyze content, monitor brand reputation, and get AI-powered insights from X. Help me set up and use these advanced AI features.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit. It includes MCP tools for:
- Querying Grok AI (X's built-in AI) via `x_grok_query` and `x_grok_summarize`
- Sentiment analysis via `x_analyze_sentiment` (built-in rules engine or LLM via OpenRouter)
- Reputation monitoring via `x_monitor_reputation` and `x_reputation_report`

## What I Need You To Do

### Phase 1: Grok AI Queries

Use Grok (X's AI) directly through XActions:

1. **Ask Grok a question:**
   ```
   "Ask Grok: What are the trending topics in AI today?"
   ```
   Tool: `x_grok_query`
   - `query`: The question or prompt for Grok
   
   Grok can answer questions about:
   - Current events and trending topics on X
   - Summarize discussions happening on X
   - Provide context on viral tweets
   - Answer general knowledge questions

2. **Summarize content with Grok:**
   ```
   "Use Grok to summarize the discourse around 'AI regulation' on X"
   ```
   Tool: `x_grok_summarize`
   - Gets AI-powered summaries of conversations and topics

3. **Example Grok queries to try:**
   - "What are people saying about [product] on X right now?"
   - "Summarize the debate about [topic] on X"
   - "What are the most viral topics in [industry] today?"
   - "Who are the most influential voices discussing [keyword]?"

### Phase 2: Sentiment Analysis

Analyze the sentiment of any text using XActions' built-in analyzer:

1. **Analyze a single text:**
   ```
   "Analyze the sentiment of this tweet: 'This product is absolutely amazing, best purchase I've ever made!'"
   ```
   Tool: `x_analyze_sentiment`
   - `text`: The text to analyze
   - Returns: score (-1 to 1), label (positive/neutral/negative), confidence, key words

2. **Batch analysis:**
   ```
   "Analyze sentiment for these tweets: ['Great product!', 'Terrible experience', 'It was okay I guess']"
   ```
   - `texts`: Array of strings for batch analysis
   - Returns individual scores plus aggregate

3. **Analysis modes:**
   - **"rules" mode** (default): Offline, zero dependencies, instant. Uses built-in word lists and linguistic rules
   - **"llm" mode**: Uses OpenRouter API for nuanced, context-aware analysis. Requires `OPENROUTER_API_KEY` env var
   
   ```
   "Analyze sentiment in LLM mode: 'I can't believe how bad the response time was'"
   ```

4. **Interpret results:**
   - **Score**: -1.0 (very negative) → 0.0 (neutral) → +1.0 (very positive)
   - **Label**: "positive", "neutral", "negative"
   - **Confidence**: 0.0 to 1.0 (how certain the analysis is)
   - **Keywords**: Which words drove the sentiment score

5. **Practical workflows:**
   
   **Analyze mentions sentiment:**
   ```
   Step 1: "Search for tweets mentioning @mycompany in the last 24 hours"
   Step 2: "Now analyze the sentiment of each of these tweets"
   Step 3: "Summarize: what percentage are positive vs negative?"
   ```
   
   **Analyze competitor perception:**
   ```
   Step 1: "Search tweets about CompetitorProduct"
   Step 2: "Analyze sentiment batch for all these tweets"
   Step 3: "Compare: how does sentiment about CompetitorProduct compare to our product?"
   ```

### Phase 3: Reputation Monitoring

Set up continuous reputation monitoring:

1. **Start a reputation monitor:**
   ```
   "Start monitoring reputation for @mycompany"
   ```
   Tool: `x_monitor_reputation`
   - `action`: "start"
   - `target`: "@mycompany" (username with @) or "product name" (keyword)
   - `type`: "mentions" (default), "keyword", or "replies"
   - `interval`: Polling interval in seconds (default: 900 = 15 min, minimum: 60)
   - `webhookUrl`: Optional URL for real-time alerts

   What it does:
   - Periodically scrapes mentions/keyword results
   - Runs sentiment analysis on each new mention
   - Computes rolling averages
   - Detects sentiment anomalies (sudden drops or spikes)
   - Sends webhook alerts for anomalies

2. **Configure webhook alerts:**
   ```
   "Start monitoring @mycompany with webhook alerts to https://hooks.slack.com/xxx"
   ```
   This sends alerts when:
   - Sudden negative sentiment spike detected
   - Unusual mention volume detected
   - Sentiment drops below threshold

3. **Monitor types:**
   - **mentions**: Track @mentions of a username
   - **keyword**: Track a brand name or product keyword
   - **replies**: Track replies to a specific user's tweets

4. **List active monitors:**
   ```
   "List all my reputation monitors"
   ```
   - `action`: "list"
   - Shows: target, type, interval, status, poll count

5. **Check monitor status:**
   ```
   "Show status for monitor ID xyz"
   ```
   - `action`: "status"
   - `monitorId`: The returned ID
   - Shows: latest data, sentiment trend, alert history

6. **Stop a monitor:**
   ```
   "Stop reputation monitor xyz"
   ```
   - `action`: "stop"
   - `monitorId`: The ID to stop

### Phase 4: Reputation Reports

Generate comprehensive reputation reports:

1. **Generate a report:**
   ```
   "Generate a 7-day reputation report for @mycompany"
   ```
   Tool: `x_reputation_report`
   - `username`: Target username
   - `period`: "24h", "7d", "30d", or "all"
   - `format`: "json" or "markdown" (default: markdown)

2. **What the report includes:**
   - **Sentiment Distribution**: % positive, neutral, negative
   - **Top Positive Mentions**: Best things people are saying
   - **Top Negative Mentions**: Complaints and criticism
   - **Timeline Data**: How sentiment changed over time
   - **Keyword Frequency**: Most common words in mentions
   - **Alerts**: Any anomalies or concerning trends
   - **Volume Analysis**: Mention frequency over time

3. **Report periods:**
   - **24h**: Real-time crisis check — are we being dragged right now?
   - **7d**: Weekly health check — how was the week?
   - **30d**: Monthly trend — where are we heading?
   - **all**: Complete historical view

4. **Example: Crisis detection workflow:**
   ```
   Step 1: "Start monitoring @mycompany every 5 minutes" (interval: 300)
   Step 2: "Generate a 24h reputation report"
   Step 3: "Show me all negative mentions from the report"
   Step 4: "Draft responses to the top 3 complaints"
   ```

### Phase 5: Combined Intelligence Workflows

#### Brand Health Dashboard
```
1. "Start reputation monitor for @mycompany"
2. "Search recent tweets about our brand and analyze sentiment"
3. "Generate a 7-day reputation report"
4. "Compare our sentiment to @competitor's sentiment"
5. "Summarize: What should we focus on this week?"
```

#### Content Strategy from AI Insights
```
1. "Ask Grok what topics are trending in [my niche]"
2. "Search tweets about top 3 trending topics"
3. "Analyze which topics have the most positive sentiment"
4. "Recommend: What should I tweet about today?"
```

#### Customer Sentiment Tracking
```
1. "Monitor keywords: 'product name', 'brand name'"
2. "Generate daily sentiment reports"
3. "Flag any tweet with sentiment score below -0.5"
4. "Draft empathetic responses for negative mentions"
```

#### Competitor Intelligence with Sentiment
```
1. "Monitor mentions of @competitor1, @competitor2, @competitor3"
2. "Run sentiment analysis on each competitor's mentions"
3. "Compare: sentiment distribution across competitors"
4. "Identify: what complaints do their users have that we solve?"
```

### Phase 6: OpenRouter LLM Integration

For more nuanced sentiment analysis, connect an LLM:

1. **Setup:**
   - Get an API key from [OpenRouter](https://openrouter.ai)
   - Set `OPENROUTER_API_KEY` in your environment

2. **LLM vs Rules comparison:**
   | Feature | Rules Mode | LLM Mode |
   |---------|-----------|----------|
   | Speed | Instant | 1-3 seconds |
   | Cost | Free | Per-token |
   | Nuance | Good | Excellent |
   | Sarcasm | Poor | Good |
   | Context | None | Full |
   | Offline | Yes | No |

3. **When to use LLM mode:**
   - Analyzing sarcastic or ironic tweets
   - Need nuanced emotional categorization
   - Detecting subtle negativity or passive-aggression
   - Multi-language sentiment analysis

4. **Example:**
   ```
   "Analyze in LLM mode: 'Oh great, another update that breaks everything. Thanks SO much!'"
   ```
   - Rules mode might score this as positive (words: "great", "thanks")
   - LLM mode correctly identifies sarcasm → negative

## My AI Analysis Goals
(Replace before pasting)
- Brand/account to monitor: @myhandle
- Competitors to track: @comp1, @comp2
- Keywords to monitor: keyword1, keyword2
- Alert webhook URL: (optional)
- OpenRouter API key available: Yes/No

Start with Phase 1 — let's try a Grok query first, then set up sentiment analysis on my mentions.
