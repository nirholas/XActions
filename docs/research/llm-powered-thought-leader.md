# 24/7 LLM-Powered Thought Leadership Agent — Architecture & Implementation Guide

> How to run automated algorithm cultivation and content creation continuously with AI intelligence.

---

## Overview

This document describes the architecture for running the XActions Thought Leader system **24/7** with **LLM/AI model support** built in. Instead of pasting scripts into a browser console, this system uses headless browser automation (Puppeteer/Playwright) orchestrated by a Node.js agent that leverages LLMs for intelligent decision-making.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         THOUGHT LEADER AGENT                                  │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                          ORCHESTRATOR                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │ Scheduler│  │ Session  │  │ Rate Limiter │  │ Health Monitor   │   │  │
│  │  │ (cron +  │  │ Manager  │  │ (per-action  │  │ (crash recovery, │   │  │
│  │  │ variance)│  │ (cookies)│  │  daily caps) │  │  alert on block) │   │  │
│  │  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘   │  │
│  │       └──────────────┴───────────────┴───────────────────┘             │  │
│  └──────────────────────────────┬──────────────────────────────────────────┘  │
│                                  │                                              │
│  ┌───────────────────────────────┼──────────────────────────────────────────┐  │
│  │              BROWSER LAYER    │                                            │  │
│  │  ┌────────────────────────────▼─────────────────────────────────────┐    │  │
│  │  │              Puppeteer + Stealth Plugin                           │    │  │
│  │  │  ┌────────────────────────────────────────────────────────────┐  │    │  │
│  │  │  │  Page Actions:                                              │  │    │  │
│  │  │  │  navigate() | search() | scroll() | click() | type()       │  │    │  │
│  │  │  │  screenshot() | extractText() | waitForSelector()          │  │    │  │
│  │  │  └────────────────────────────────────────────────────────────┘  │    │  │
│  │  │  ┌────────────────────────────────────────────────────────────┐  │    │  │
│  │  │  │  Anti-Detection:                                            │  │    │  │
│  │  │  │  stealth plugin | mouse simulation | scroll variance       │  │    │  │
│  │  │  │  viewport rotation | UA rotation | timezone matching       │  │    │  │
│  │  │  └────────────────────────────────────────────────────────────┘  │    │  │
│  │  └──────────────────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        LLM BRAIN                                          │  │
│  │                                                                            │  │
│  │  ┌────────────────┐ ┌─────────────────┐ ┌──────────────────────────────┐ │  │
│  │  │ Content Scorer │ │ Reply Generator │ │ Content Creator              │ │  │
│  │  │ (fast model)   │ │ (mid model)     │ │ (smart model)               │ │  │
│  │  │                │ │                 │ │                              │ │  │
│  │  │ Input: tweet   │ │ Input: tweet +  │ │ Input: topic + persona      │ │  │
│  │  │ Output: 0-100  │ │  thread context │ │ Output: tweet/thread/quote  │ │  │
│  │  │ + reason       │ │ Output: reply   │ │ + schedule time             │ │  │
│  │  └────────────────┘ └─────────────────┘ └──────────────────────────────┘ │  │
│  │  ┌────────────────┐ ┌─────────────────┐ ┌──────────────────────────────┐ │  │
│  │  │ Trend Analyzer │ │ Strategy Engine │ │ Persona Enforcer             │ │  │
│  │  │ (what's hot?)  │ │ (adapt tactics) │ │ (consistency check)          │ │  │
│  │  └────────────────┘ └─────────────────┘ └──────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                     DATA LAYER                                            │  │
│  │  ┌───────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────────────────┐  │  │
│  │  │ SQLite DB │ │ Action Log   │ │ Metrics  │ │ Session Store         │  │  │
│  │  │ (state,   │ │ (every click │ │ (growth  │ │ (cookies, tokens,     │  │  │
│  │  │  follows, │ │  timestamped)│ │  charts) │ │  fingerprint config)  │  │  │
│  │  │  likes)   │ │              │ │          │ │                       │  │  │
│  │  └───────────┘ └──────────────┘ └──────────┘ └───────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20+ | Async orchestration |
| **Browser** | Puppeteer Extra + Stealth | Headless Chrome, anti-detection |
| **LLM Provider** | OpenRouter / OpenAI / Ollama | Model routing, cost control |
| **Database** | SQLite (better-sqlite3) | Action log, state, metrics |
| **Scheduler** | node-cron + custom variance | Circadian rhythm simulation |
| **Process Mgmt** | PM2 / Docker | 24/7 uptime, auto-restart |
| **Monitoring** | XActions Dashboard / Webhooks | Alerts, metrics visualization |

---

## Component Details

### 1. Orchestrator (`thoughtLeaderAgent.js`)

The main event loop that coordinates all other components:

```javascript
// Pseudocode — see src/agents/thoughtLeaderAgent.js for full implementation
import { BrowserDriver } from './browserDriver.js';
import { LLMBrain } from './llmBrain.js';
import { Scheduler } from './scheduler.js';
import { Database } from './database.js';

class ThoughtLeaderAgent {
  constructor(config) {
    this.config = config;
    this.browser = new BrowserDriver(config.browser);
    this.llm = new LLMBrain(config.llm);
    this.scheduler = new Scheduler(config.schedule);
    this.db = new Database(config.dbPath);
    this.running = false;
  }

  async start() {
    this.running = true;
    await this.browser.launch();
    await this.browser.restoreSession();

    while (this.running) {
      const activity = this.scheduler.getNextActivity();
      
      if (activity.type === 'sleep') {
        await this.sleep(activity.duration);
        continue;
      }

      try {
        await this.executeActivity(activity);
      } catch (err) {
        this.handleError(err);
      }

      await this.humanPause();
    }
  }

  async executeActivity(activity) {
    switch (activity.type) {
      case 'search-engage':
        return this.searchAndEngage(activity.query, activity.tab);
      case 'home-feed':
        return this.browseHomeFeed();
      case 'influencer-visit':
        return this.visitInfluencer(activity.username);
      case 'create-content':
        return this.createContent(activity.contentType);
      case 'engage-replies':
        return this.engageWithReplies();
      case 'explore':
        return this.browseExplore();
      case 'own-profile':
        return this.visitOwnProfile();
    }
  }

  async searchAndEngage(query, tab) {
    await this.browser.navigate(searchUrl(query, tab));
    const tweets = await this.browser.extractTweets();
    
    for (const tweet of tweets) {
      // LLM scores relevance
      const score = await this.llm.scoreRelevance(tweet.text, this.config.niche);
      
      if (score > 60 && this.rateLimiter.canLike()) {
        await this.browser.likeTweet(tweet);
        this.db.logAction('like', tweet.id);
      }
      
      if (score > 80 && this.rateLimiter.canComment()) {
        // LLM generates contextual reply
        const reply = await this.llm.generateReply(tweet, this.config.persona);
        await this.browser.replyToTweet(tweet, reply);
        this.db.logAction('comment', tweet.id, { reply });
      }

      await this.humanScroll();
    }
  }

  async createContent(type) {
    // LLM analyzes trends and generates content
    const trending = await this.browser.getTrendingTopics();
    const content = await this.llm.generateContent({
      type, // 'tweet' | 'thread' | 'quote'
      persona: this.config.persona,
      niche: this.config.niche,
      trends: trending,
      recentPosts: this.db.getRecentPosts(20),
    });
    
    await this.browser.postContent(content);
    this.db.logAction('post', null, { content });
  }
}
```

### 2. Browser Driver (`browserDriver.js`)

Wraps Puppeteer with X.com-specific actions:

```javascript
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

class BrowserDriver {
  async launch() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        `--window-size=${randomInt(1280,1920)},${randomInt(720,1080)}`,
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: randomInt(1280,1920), height: randomInt(720,1080) });
  }

  async restoreSession() {
    const cookies = JSON.parse(fs.readFileSync('session.json', 'utf8'));
    await this.page.setCookie(...cookies);
    await this.page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
  }

  async saveSession() {
    const cookies = await this.page.cookies();
    fs.writeFileSync('session.json', JSON.stringify(cookies));
  }

  async navigate(url) {
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 15000 });
    await sleep(randomInt(1000, 2000));
  }

  async extractTweets() {
    return this.page.evaluate(() => {
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(tweets).map(tweet => ({
        id: tweet.querySelector('a[href*="/status/"]')?.href?.match(/status\/(\d+)/)?.[1],
        text: tweet.querySelector('[data-testid="tweetText"]')?.textContent || '',
        author: tweet.querySelector('a[href^="/"]')?.getAttribute('href')?.replace('/', ''),
        isAd: !!tweet.querySelector('[data-testid="placementTracking"]'),
      })).filter(t => t.id && !t.isAd);
    });
  }

  async likeTweet(tweet) {
    await this.page.evaluate((tweetId) => {
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      for (const t of tweets) {
        const link = t.querySelector(`a[href*="/status/${tweetId}"]`);
        if (link) {
          const btn = t.querySelector('[data-testid="like"]');
          if (btn) btn.click();
          break;
        }
      }
    }, tweet.id);
    await sleep(randomInt(500, 1500));
  }

  async replyToTweet(tweet, text) {
    // Click reply, wait for compose box, type text, click post
    await this.page.evaluate((tweetId) => {
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      for (const t of tweets) {
        const link = t.querySelector(`a[href*="/status/${tweetId}"]`);
        if (link) {
          t.querySelector('[data-testid="reply"]')?.click();
          break;
        }
      }
    }, tweet.id);
    
    await sleep(1500);
    await this.page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 5000 });
    await this.humanType('[data-testid="tweetTextarea_0"]', text);
    await sleep(800);
    await this.page.click('[data-testid="tweetButton"]');
    await sleep(1500);
  }

  async humanType(selector, text) {
    await this.page.focus(selector);
    for (const char of text) {
      await this.page.keyboard.type(char, { delay: randomInt(30, 100) });
    }
  }

  async humanScroll(pixels = randomInt(400, 800)) {
    await this.page.evaluate((px) => {
      window.scrollBy({ top: px, behavior: 'smooth' });
    }, pixels);
    await sleep(randomInt(1000, 3000));
  }

  async postContent(content) {
    if (content.type === 'tweet') {
      await this.navigate('https://x.com/compose/tweet');
      await this.humanType('[data-testid="tweetTextarea_0"]', content.text);
      await sleep(1000);
      await this.page.click('[data-testid="tweetButton"]');
    }
    // Thread posting, quote posting, etc.
  }

  async getTrendingTopics() {
    await this.navigate('https://x.com/explore/tabs/trending');
    return this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="trend"]')).map(el => ({
        text: el.textContent,
      }));
    });
  }
}
```

### 3. LLM Brain (`llmBrain.js`)

Tiered model routing for cost efficiency:

```javascript
class LLMBrain {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.models = {
      fast: config.fastModel || 'deepseek/deepseek-chat',          // Scoring, classification
      mid:  config.midModel || 'anthropic/claude-3.5-haiku',        // Reply generation
      smart: config.smartModel || 'anthropic/claude-sonnet-4',   // Content creation + strategy
    };
    this.persona = config.persona;
  }

  async call(model, messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500,
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async scoreRelevance(tweetText, niche) {
    const result = await this.call(this.models.fast, [
      { role: 'system', content: `Score this tweet 0-100 for relevance to: ${niche.keywords.join(', ')}.
        Respond with only a JSON object: { "score": N, "reason": "one sentence" }` },
      { role: 'user', content: tweetText },
    ], { temperature: 0.1, maxTokens: 100 });
    
    try {
      return JSON.parse(result).score;
    } catch {
      return 50; // Default mid-score on parse failure
    }
  }

  async generateReply(tweet, persona) {
    const result = await this.call(this.models.mid, [
      { role: 'system', content: `You are ${persona.name}, a ${persona.niche} thought leader.
        Tone: ${persona.tone}
        
        Generate a short reply (1-2 sentences) to this tweet. Be natural, add value.
        Don't use hashtags. Vary style (question, agreement, insight, mild pushback).
        Never start with "Great point" or "Interesting" — be more creative.` },
      { role: 'user', content: `Tweet by @${tweet.author}: "${tweet.text}"` },
    ], { temperature: 0.8, maxTokens: 150 });
    
    return result.trim();
  }

  async generateContent({ type, persona, niche, trends, recentPosts }) {
    const recent = recentPosts.map(p => p.text).join('\n---\n');
    const trendText = trends.map(t => t.text).join(', ');

    const prompt = type === 'thread'
      ? `Write a 4-6 tweet thread about a ${niche.name} topic. Current trending: ${trendText}. 
         Format: Each tweet separated by ---. First tweet should hook. Last should have a takeaway.`
      : `Write a single tweet about ${niche.name}. Under 280 characters. 
         Make it insightful, potentially controversial, or actionable.`;

    const result = await this.call(this.models.smart, [
      { role: 'system', content: `You are ${persona.name}, writing as yourself on X/Twitter.
        Tone: ${persona.tone}
        Expertise: ${persona.expertise.join(', ')}
        Recent posts (avoid repetition): ${recent}
        
        ${prompt}` },
      { role: 'user', content: `Generate a ${type} now.` },
    ], { temperature: 0.9, maxTokens: type === 'thread' ? 1000 : 300 });

    return { type, text: result.trim() };
  }

  async analyzeStrategy(metrics) {
    const result = await this.call(this.models.smart, [
      { role: 'system', content: `Analyze these X/Twitter growth metrics and recommend specific adjustments.
        Be concrete: more/less of what, specific timing changes, content type shifts.` },
      { role: 'user', content: JSON.stringify(metrics, null, 2) },
    ], { temperature: 0.5, maxTokens: 500 });

    return result;
  }
}
```

### 4. Scheduler (`scheduler.js`)

Circadian rhythm with realistic variance:

```javascript
class Scheduler {
  constructor(config) {
    this.timezone = config.timezone || 'America/New_York';
    this.schedule = config.schedule || this.defaultSchedule();
  }

  defaultSchedule() {
    return {
      // hour: { active: bool, intensity: 0-1, activities: [...] }
      0: { active: false }, 1: { active: false }, 2: { active: false },
      3: { active: false }, 4: { active: false }, 5: { active: false },
      6:  { active: true, intensity: 0.3, activities: ['home-feed'] },
      7:  { active: true, intensity: 0.6, activities: ['search-engage', 'home-feed'] },
      8:  { active: true, intensity: 0.8, activities: ['search-engage', 'engage-replies'] },
      9:  { active: true, intensity: 1.0, activities: ['create-content', 'search-engage'] },
      10: { active: true, intensity: 0.9, activities: ['search-engage', 'influencer-visit'] },
      11: { active: true, intensity: 0.6, activities: ['home-feed'] },
      12: { active: true, intensity: 0.7, activities: ['explore', 'home-feed'] },
      13: { active: true, intensity: 0.5, activities: ['home-feed'] },
      14: { active: false },  // Afternoon break
      15: { active: true, intensity: 0.6, activities: ['search-engage'] },
      16: { active: true, intensity: 0.8, activities: ['search-engage', 'search-people'] },
      17: { active: true, intensity: 1.0, activities: ['create-content', 'engage-replies'] },
      18: { active: true, intensity: 0.9, activities: ['search-engage', 'influencer-visit'] },
      19: { active: true, intensity: 0.8, activities: ['home-feed', 'engage-replies'] },
      20: { active: true, intensity: 0.7, activities: ['home-feed'] },
      21: { active: true, intensity: 0.5, activities: ['home-feed', 'own-profile'] },
      22: { active: true, intensity: 0.3, activities: ['home-feed'] },
      23: { active: false },
    };
  }

  getNextActivity() {
    const now = new Date();
    const hour = now.getHours();
    const slot = this.schedule[hour];

    if (!slot?.active) {
      // Sleep until next active hour
      const nextActive = this.findNextActiveHour(hour);
      const sleepMs = this.msUntilHour(nextActive);
      return { type: 'sleep', duration: sleepMs };
    }

    // Add ±15 min variance
    const variance = (Math.random() - 0.5) * 30 * 60 * 1000;

    // Pick random activity from this hour's options
    const activity = slot.activities[Math.floor(Math.random() * slot.activities.length)];
    
    return {
      type: activity,
      intensity: slot.intensity,
      scheduledFor: Date.now() + variance,
    };
  }

  findNextActiveHour(currentHour) {
    for (let i = 1; i <= 24; i++) {
      const h = (currentHour + i) % 24;
      if (this.schedule[h]?.active) return h;
    }
    return 7; // fallback
  }

  msUntilHour(targetHour) {
    const now = new Date();
    const target = new Date(now);
    target.setHours(targetHour, Math.floor(Math.random() * 30), 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target - now;
  }
}
```

---

## Deployment Options

### Option A: Docker (Recommended)

```dockerfile
FROM node:20-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 libatk-bridge2.0-0 libgtk-3-0 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

CMD ["node", "src/agents/thoughtLeaderAgent.js"]
```

```yaml
# docker-compose.agent.yml
version: '3.8'
services:
  thought-leader:
    build: .
    restart: unless-stopped
    volumes:
      - ./data/session.json:/app/data/session.json
      - ./data/agent.db:/app/data/agent.db
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - AGENT_TIMEZONE=America/New_York
      - AGENT_NICHE=ai-engineering
      - AGENT_MODE=normal
    mem_limit: 2g
    cpus: '1.0'
```

### Option B: PM2 (Direct VPS)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'thought-leader',
    script: 'src/agents/thoughtLeaderAgent.js',
    cron_restart: '0 4 * * *',  // Restart daily at 4 AM (session refresh)
    max_memory_restart: '1G',
    env: {
      OPENROUTER_API_KEY: 'sk-...',
      AGENT_TIMEZONE: 'America/New_York',
    },
  }],
};
```

### Option C: Railway/Fly.io

Both are supported natively by the project. Deploy with:

```bash
# Railway
railway up

# Fly.io
fly deploy
```

---

## Cost Estimates

### LLM Costs (Monthly)

| Activity | Model Tier | Calls/Day | Tokens/Call | Monthly Cost |
|----------|-----------|-----------|-------------|-------------|
| Relevance scoring | Fast (DeepSeek) | 200 | ~200 | ~$0.80 |
| Reply generation | Mid (Haiku) | 20 | ~300 | ~$1.50 |
| Content creation | Smart (Sonnet) | 5 | ~800 | ~$3.00 |
| Strategy analysis | Smart (Sonnet) | 1 | ~1000 | ~$0.50 |
| **Total** | | | | **~$5-10/mo** |

If using local models (Ollama with Llama 3.1):
- **$0/month** for LLM costs
- Requires machine with 16GB+ RAM (for 7B model) or GPU (for 70B)

### Infrastructure Costs

| Option | Monthly Cost |
|--------|-------------|
| Hetzner CAX11 (ARM VPS) | $4.15 |
| DigitalOcean Basic | $6.00 |
| Railway (Hobby) | $5.00 |
| Fly.io (shared-cpu-1x) | $3.19 |
| Home server | $0 (electricity only) |

**Total all-in cost: $8-15/month** for a fully autonomous 24/7 thought leadership agent.

---

## Session Management

The most critical piece for 24/7 operation is maintaining authenticated sessions:

```javascript
class SessionManager {
  constructor(cookiePath = 'data/session.json') {
    this.cookiePath = cookiePath;
  }

  async save(page) {
    const cookies = await page.cookies('https://x.com');
    fs.writeFileSync(this.cookiePath, JSON.stringify(cookies, null, 2));
    log('Session saved');
  }

  async restore(page) {
    if (!fs.existsSync(this.cookiePath)) {
      throw new Error('No session file — manual login required first');
    }
    const cookies = JSON.parse(fs.readFileSync(this.cookiePath, 'utf8'));
    await page.setCookie(...cookies);
    log('Session restored');
  }

  async isValid(page) {
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    });
    return isLoggedIn;
  }

  async refresh(page) {
    // Sessions typically last 30-90 days
    // Periodic cookie refresh prevents expiration
    await this.save(page);
  }
}
```

**Initial setup requires one manual login:**
1. Launch browser in headed mode (non-headless)
2. Navigate to x.com and log in manually
3. Script captures and saves cookies
4. All subsequent runs use saved cookies

---

## Monitoring & Alerts

### Webhook Notifications

```javascript
const notify = async (event, data) => {
  if (!process.env.WEBHOOK_URL) return;
  await fetch(process.env.WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  });
};

// Example alerts:
// notify('session_expired', { action: 'manual re-login required' })
// notify('rate_limited', { action: 'likes', remaining: 0 })
// notify('daily_summary', { likes: 142, follows: 23, comments: 8 })
// notify('content_posted', { type: 'thread', topic: 'AI agents' })
```

Supports: Discord webhooks, Slack, Telegram bots, email via SMTP, or custom endpoints.

---

## Security Considerations

1. **Credentials**: Never store passwords. Use cookie-based session persistence only.
2. **API keys**: Use environment variables, never commit to code.
3. **Session files**: Encrypt at rest (`session.json` contains auth cookies).
4. **Network**: Run behind VPN if IP reputation matters.
5. **Logs**: Redact sensitive data from action logs.
6. **Access**: Restrict SSH/admin access to the deployment server.

---

## Getting Started

```bash
# 1. Install dependencies
npm install puppeteer-extra puppeteer-extra-plugin-stealth better-sqlite3

# 2. Create config
cp config/agent-config.example.json config/agent-config.json
# Edit with your niche, persona, API keys

# 3. Initial login (headed browser)
node src/agents/setup.js --login
# → Opens browser, you log in manually, cookies saved

# 4. Test run (5-minute quick session)
node src/agents/thoughtLeaderAgent.js --test

# 5. Start 24/7 operation
pm2 start ecosystem.config.js
# or
docker compose -f docker-compose.agent.yml up -d
```

---

*See the full research paper at `docs/research/algorithm-cultivation.md` and the build prompts at `prompts/09-algorithm-cultivation-system.md`.*
