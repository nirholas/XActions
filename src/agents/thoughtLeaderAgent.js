#!/usr/bin/env node
// XActions — Thought Leader Agent (Main Orchestrator)
// 24/7 LLM-powered autonomous agent for X.com thought leadership
// by nichxbt

import fs from 'fs';
import path from 'path';
import { BrowserDriver } from './browserDriver.js';
import { LLMBrain } from './llmBrain.js';
import { Scheduler } from './scheduler.js';
import { AgentDatabase } from './database.js';
import { Persona } from './persona.js';
import { ContentCalendar } from './contentCalendar.js';
import { EngagementNetwork } from './engagementNetwork.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * @typedef {Object} AgentConfig
 * @property {{ name: string, searchTerms: string[], influencers: string[], keywords: string[] }} niche
 * @property {{ name: string, handle: string, tone: string, expertise: string[], opinions: string[], avoid: string[], exampleTweets?: string[] }} persona
 * @property {{ provider: string, apiKey: string, models: { fast: string, mid: string, smart: string } }} llm
 * @property {{ timezone: string, sleepHours: [number, number] }} schedule
 * @property {{ dailyLikes: number, dailyFollows: number, dailyComments: number, dailyPosts: number }} limits
 * @property {{ headless: boolean, sessionPath: string, proxy?: string }} browser
 */

const DEFAULT_CONFIG_PATH = path.resolve('data', 'agent-config.json');

/**
 * The main 24/7 orchestrator for the Thought Leader Agent.
 */
class ThoughtLeaderAgent {
  /**
   * @param {AgentConfig} config
   */
  constructor(config) {
    this.config = config;
    this.running = false;
    this._startedAt = null;
    this._lastSessionSave = 0;

    // Initialize components
    this.browser = new BrowserDriver({
      headless: config.browser?.headless !== false,
      sessionPath: config.browser?.sessionPath || 'data/session.json',
      proxy: config.browser?.proxy,
    });

    this.llm = new LLMBrain({
      provider: config.llm?.provider || 'openrouter',
      apiKey: config.llm?.apiKey || process.env.OPENROUTER_API_KEY || '',
      models: config.llm?.models,
    });

    this.scheduler = new Scheduler({
      timezone: config.schedule?.timezone || 'America/New_York',
      sleepHours: config.schedule?.sleepHours || [23, 6],
      searchTerms: config.niche?.searchTerms || [],
      influencers: config.niche?.influencers || [],
    });

    this.db = new AgentDatabase(config.dbPath || 'data/agent.db');
    this.persona = new Persona(config.persona || { name: 'Agent', tone: 'friendly', expertise: [], opinions: [], avoid: [] });

    // Wire LLM usage tracking to database
    this.llm.onUsage = (model, input, output) => {
      this.db.recordLLMUsage(model, input, output);
    };

    this.calendar = new ContentCalendar({
      persona: config.persona,
      niche: config.niche,
      postsPerDay: config.limits?.dailyPosts ?? 5,
    });

    this.network = config.network?.enabled
      ? new EngagementNetwork(config.network)
      : null;

    this.limits = {
      dailyLikes: config.limits?.dailyLikes ?? 150,
      dailyFollows: config.limits?.dailyFollows ?? 80,
      dailyComments: config.limits?.dailyComments ?? 25,
      dailyPosts: config.limits?.dailyPosts ?? 5,
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  /**
   * Start the agent's main loop.
   */
  async start() {
    console.log('🚀 Starting Thought Leader Agent...');
    console.log(`📌 Niche: ${this.config.niche?.name || 'Not set'}`);
    console.log(`🎭 Persona: ${this.persona.name}`);

    this.running = true;
    this._startedAt = new Date();

    // Launch browser and restore session
    await this.browser.launch();
    const hasSession = await this.browser.restoreSession();

    if (hasSession) {
      const loggedIn = await this.browser.isLoggedIn();
      if (!loggedIn) {
        console.log('❌ Session expired. Use --login mode to re-authenticate.');
        await this.stop();
        return;
      }
    } else {
      console.log('⚠️ No session found. Use --login mode to authenticate first.');
      await this.stop();
      return;
    }

    console.log('✅ Agent running. Press Ctrl+C to stop.');

    // Main loop
    while (this.running) {
      try {
        const activity = this.scheduler.getNextActivity();

        if (activity.type === 'sleep') {
          const sleepMs = Math.min(activity.durationMinutes * 60000, 8 * 3600000);
          console.log(`😴 Sleeping for ${Math.round(sleepMs / 60000)} minutes...`);
          await this._interruptibleSleep(sleepMs);
          continue;
        }

        // Wait until scheduled time (if in future)
        const waitMs = activity.scheduledFor - new Date();
        if (waitMs > 0 && waitMs < 3600000) {
          console.log(`⏳ Waiting ${Math.round(waitMs / 60000)}min until next activity: ${activity.type}`);
          await this._interruptibleSleep(waitMs);
          if (!this.running) break;
        }

        // Check daily limits
        if (!this._checkLimits()) {
          console.log('🛑 Daily limits reached — sleeping 30 min');
          await this._interruptibleSleep(30 * 60000);
          continue;
        }

        // Execute the activity
        console.log(`\n🎯 Activity: ${activity.type} (intensity: ${activity.intensity.toFixed(2)})`);
        await this._executeActivity(activity);

        // Periodic session save (every 30 min)
        if (Date.now() - this._lastSessionSave > 30 * 60000) {
          await this.browser.saveSession();
          this._lastSessionSave = Date.now();
        }

        // Human pause between activities (1-5 min)
        const pauseMs = rand(60000, 300000) * activity.intensity;
        await this._interruptibleSleep(pauseMs);

      } catch (err) {
        await this._handleError(err);
      }
    }
  }

  /**
   * Gracefully stop the agent.
   */
  async stop() {
    console.log('\n🛑 Stopping agent...');
    this.running = false;
    await this.browser.saveSession().catch(() => {});
    await this.browser.close();
    this.db.close();
    console.log('👋 Agent stopped.');
  }

  /**
   * Get current agent status.
   * @returns {Object}
   */
  getStatus() {
    const uptime = this._startedAt ? Date.now() - this._startedAt.getTime() : 0;
    return {
      running: this.running,
      startedAt: this._startedAt?.toISOString() || null,
      uptimeMs: uptime,
      uptimeHuman: `${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m`,
      niche: this.config.niche?.name || 'Not set',
      persona: this.persona.name,
      todaySummary: this.db.getTodaySummary(),
      limits: this.limits,
      isActiveHour: this.scheduler.isActiveHour(),
    };
  }

  // ─── Activity Handlers ────────────────────────────────────────

  async _executeActivity(activity) {
    switch (activity.type) {
      case 'search-engage':
        return this._searchAndEngage(activity.query, 'top');
      case 'home-feed':
        return this._browseHomeFeed();
      case 'influencer-visit':
        return this._visitInfluencer(activity.username);
      case 'create-content':
        return this._createContent();
      case 'engage-replies':
        return this._engageWithReplies();
      case 'explore':
        return this._browseExplore();
      case 'own-profile':
        return this._visitOwnProfile();
      case 'search-people':
        return this._searchAndFollow(activity.query);
      default:
        console.log(`⚠️ Unknown activity type: ${activity.type}`);
    }
  }

  /**
   * Search for niche content and engage with relevant tweets.
   */
  async _searchAndEngage(query, tab = 'top') {
    if (!query) {
      const terms = this.config.niche?.searchTerms || [];
      query = terms[rand(0, terms.length - 1)] || 'AI';
    }

    console.log(`🔍 Search & engage: "${query}" (${tab})`);
    await this.browser.searchFor(query, tab);
    await sleep(rand(2000, 4000));

    // Scroll a few times to load content
    for (let i = 0; i < rand(2, 4); i++) {
      await this.browser.scrollDown();
      await sleep(rand(1500, 3000));
    }

    const tweets = await this.browser.extractTweets();
    const keywords = this.config.niche?.keywords || this.config.niche?.searchTerms || [];
    let engaged = 0;

    for (const tweet of tweets) {
      if (!this.running) break;
      if (tweet.isAd) continue;
      if (this.db.isDuplicate('like', tweet.id) || this.db.isDuplicate('comment', tweet.id)) continue;

      const score = await this.llm.scoreRelevance(tweet.text, keywords);

      if (score > 60 && this._canDo('like')) {
        await this.browser.likeTweet(tweet.id);
        this.db.logAction('like', tweet.id, { score, query });
        engaged++;
        await sleep(rand(1000, 3000));
      }

      if (score > 80 && this._canDo('comment') && Math.random() < 0.4) {
        try {
          const reply = await this.llm.generateReply(
            { text: tweet.text, author: tweet.author },
            this.persona.toJSON(),
          );
          const validation = this.persona.validateContent(reply);
          if (validation.valid) {
            await this.browser.replyToTweet(tweet.id, reply);
            this.db.logAction('comment', tweet.id, { reply, score, query });
            engaged++;
          }
        } catch (err) {
          console.log(`⚠️ Reply generation failed: ${err.message}`);
        }
        await sleep(rand(2000, 5000));
      }

      // Simulate reading time between tweets
      await this.browser.antiDetection.simulateReading(this.browser.page, rand(2000, 6000));
      await this.browser.scrollDown(rand(200, 500));
    }

    console.log(`✅ Search session done: engaged with ${engaged} tweets`);
  }

  /**
   * Browse the home feed and engage with relevant content.
   */
  async _browseHomeFeed() {
    console.log('🏠 Browsing home feed...');
    await this.browser.navigate('https://x.com/home');
    await sleep(rand(2000, 4000));

    const keywords = this.config.niche?.keywords || this.config.niche?.searchTerms || [];
    let engaged = 0;

    for (let scroll = 0; scroll < rand(3, 6); scroll++) {
      if (!this.running) break;

      const tweets = await this.browser.extractTweets();

      for (const tweet of tweets.slice(0, 5)) {
        if (tweet.isAd || this.db.isDuplicate('like', tweet.id)) continue;

        const score = await this.llm.scoreRelevance(tweet.text, keywords);

        if (score > 50 && this._canDo('like')) {
          await this.browser.likeTweet(tweet.id);
          this.db.logAction('like', tweet.id, { score, source: 'home-feed' });
          engaged++;
          await sleep(rand(800, 2000));
        }

        // Occasionally bookmark high-quality content
        if (score > 85 && Math.random() < 0.3) {
          await this.browser.bookmarkTweet(tweet.id);
          this.db.logAction('bookmark', tweet.id, { score });
          await sleep(rand(500, 1500));
        }
      }

      await this.browser.antiDetection.simulateReading(this.browser.page, rand(3000, 8000));
      await this.browser.scrollDown();
      await sleep(rand(2000, 5000));
    }

    console.log(`✅ Home feed session done: ${engaged} engagements`);
  }

  /**
   * Visit an influencer's profile and engage with their content.
   */
  async _visitInfluencer(username) {
    if (!username) {
      const influencers = this.config.niche?.influencers || [];
      username = influencers[rand(0, influencers.length - 1)];
    }
    if (!username) return;

    console.log(`👤 Visiting influencer: @${username}`);
    await this.browser.navigate(`https://x.com/${username}`);
    await sleep(rand(2000, 4000));

    // Simulate reading the profile (high-weight signal: profile visit = 4x)
    await this.browser.antiDetection.simulateReading(this.browser.page, rand(5000, 10000));

    // Scroll and engage with recent tweets
    for (let i = 0; i < rand(2, 4); i++) {
      await this.browser.scrollDown();
      await sleep(rand(2000, 4000));
    }

    const tweets = await this.browser.extractTweets();
    for (const tweet of tweets.slice(0, 3)) {
      if (this.db.isDuplicate('like', tweet.id)) continue;
      if (this._canDo('like')) {
        await this.browser.likeTweet(tweet.id);
        this.db.logAction('like', tweet.id, { source: 'influencer', influencer: username });
        await sleep(rand(1000, 3000));
      }
    }

    this.db.logAction('profile-visit', username);
    console.log(`✅ Influencer visit done: @${username}`);
  }

  /**
   * Generate and post original content.
   */
  async _createContent() {
    if (!this._canDo('post')) {
      console.log('ℹ️ Daily post limit reached — skipping content creation');
      return;
    }

    // Check calendar for scheduled content first
    const queuedItem = this.calendar.getQueue()?.[0];
    if (queuedItem?.text) {
      console.log('📅 Posting scheduled content from calendar...');
      try {
        const posted = Array.isArray(queuedItem.text)
          ? await this.browser.postThread(queuedItem.text)
          : await this.browser.postTweet(queuedItem.text);
        if (posted) {
          this.calendar.markPublished(queuedItem.id);
          this.db.logAction('post', null, { type: 'scheduled', source: 'calendar' });
          this.db.recordContent(queuedItem.type || 'tweet', Array.isArray(queuedItem.text) ? queuedItem.text.join('\n---\n') : queuedItem.text);
          console.log('✅ Scheduled content posted');
          // Share discovery to network if enabled
          if (this.network) {
            this.network.shareDiscovery(this.persona.handle || 'primary', {
              text: Array.isArray(queuedItem.text) ? queuedItem.text[0] : queuedItem.text,
              topic: this.config.niche?.name,
              relevanceScore: 1.0,
            });
          }
          return;
        }
      } catch (err) {
        console.log(`⚠️ Scheduled post failed: ${err.message}`);
      }
    }

    const types = ['tweet', 'tweet', 'tweet', 'thread']; // Weighted toward tweets
    const type = types[rand(0, types.length - 1)];

    console.log(`✍️ Creating ${type}...`);

    try {
      const trends = await this.browser.getTrendingTopics().catch(() => []);
      const recentPosts = this.db.getRecentPosts(20);

      // Pull network discoveries for inspiration if available
      const networkContent = this.network
        ? this.network.getDiscoveriesForAgent(this.persona.handle || 'primary', 3)
        : [];

      const content = await this.llm.generateContent({
        type,
        persona: this.persona.toJSON(),
        niche: this.config.niche,
        trends: trends.slice(0, 5),
        recentPosts,
        networkDiscoveries: networkContent.map((d) => d.content),
      });

      // Validate content
      const textToValidate = Array.isArray(content.text) ? content.text[0] : content.text;
      const validation = this.persona.validateContent(textToValidate);
      if (!validation.valid) {
        console.log(`⚠️ Content validation failed: ${validation.issues.join(', ')}`);
        return;
      }

      // Persona consistency check
      const consistency = await this.llm.checkPersonaConsistency(textToValidate, this.persona.toJSON());
      if (!consistency.consistent) {
        console.log(`⚠️ Persona mismatch: ${consistency.issues.join(', ')}`);
        return;
      }

      let posted = false;
      if (content.type === 'thread' && Array.isArray(content.text)) {
        posted = await this.browser.postThread(content.text);
      } else {
        posted = await this.browser.postTweet(content.text);
      }

      if (posted) {
        this.db.logAction('post', null, { type: content.type, text: textToValidate.slice(0, 100) });
        this.db.recordContent(content.type, Array.isArray(content.text) ? content.text.join('\n---\n') : content.text);
        this.persona.addExample(textToValidate);
        console.log(`✅ Posted ${content.type}`);
      }
    } catch (err) {
      console.log(`⚠️ Content creation failed: ${err.message}`);
    }
  }

  /**
   * Check own tweet replies and engage back.
   */
  async _engageWithReplies() {
    const handle = this.persona.handle?.replace('@', '') || '';
    if (!handle) {
      console.log('ℹ️ No handle configured — skipping reply engagement');
      return;
    }

    console.log('💬 Engaging with replies...');
    await this.browser.navigate(`https://x.com/${handle}`);
    await sleep(rand(2000, 4000));

    // Click on a recent tweet to see replies
    const tweets = await this.browser.extractTweets();
    if (tweets.length === 0) return;

    const ownTweet = tweets[0];
    await this.browser.navigate(`https://x.com/${handle}/status/${ownTweet.id}`);
    await sleep(rand(2000, 4000));

    // Scroll to see replies
    await this.browser.scrollDown();
    await sleep(rand(2000, 4000));

    const replies = await this.browser.extractTweets();
    const myReplies = replies.filter((t) => t.author !== handle).slice(0, 3);

    for (const reply of myReplies) {
      if (this.db.isDuplicate('like', reply.id)) continue;
      if (this._canDo('like')) {
        await this.browser.likeTweet(reply.id);
        this.db.logAction('like', reply.id, { source: 'reply-engagement' });
        await sleep(rand(1000, 3000));
      }
    }

    console.log(`✅ Engaged with ${myReplies.length} replies`);
  }

  /**
   * Browse the Explore page for trends and random discovery.
   */
  async _browseExplore() {
    console.log('🌐 Browsing Explore...');
    await this.browser.navigate('https://x.com/explore');
    await sleep(rand(3000, 5000));

    // Simulate reading the explore page
    await this.browser.antiDetection.simulateReading(this.browser.page, rand(5000, 10000));

    for (let i = 0; i < rand(2, 4); i++) {
      await this.browser.scrollDown();
      await sleep(rand(2000, 5000));
    }

    this.db.logAction('explore', null);
    console.log('✅ Explore session done');
  }

  /**
   * Visit own profile briefly (meta-signal).
   */
  async _visitOwnProfile() {
    const handle = this.persona.handle?.replace('@', '') || '';
    if (!handle) return;

    console.log('👤 Visiting own profile...');
    await this.browser.navigate(`https://x.com/${handle}`);
    await sleep(rand(3000, 6000));

    // Simulate reading own profile
    await this.browser.antiDetection.simulateReading(this.browser.page, rand(3000, 8000));
    await this.browser.scrollDown(rand(200, 500));

    this.db.logAction('own-profile', handle);
    console.log('✅ Own profile visit done');
  }

  /**
   * Search for people in the niche and follow qualifying users.
   */
  async _searchAndFollow(query) {
    if (!query) {
      const terms = this.config.niche?.searchTerms || [];
      query = terms[rand(0, terms.length - 1)] || 'AI';
    }

    console.log(`👥 Searching people: "${query}"`);
    await this.browser.searchFor(query, 'people');
    await sleep(rand(2000, 4000));

    await this.browser.scrollDown();
    await sleep(rand(1500, 3000));

    const users = await this.browser.extractUserCells();
    let followed = 0;

    for (const user of users.slice(0, 5)) {
      if (!this.running) break;
      if (user.isFollowing) continue;
      if (this.db.isDuplicate('follow', user.username)) continue;
      if (!this._canDo('follow')) break;

      // Score the user's bio for relevance
      const keywords = this.config.niche?.keywords || this.config.niche?.searchTerms || [];
      const score = user.bio ? await this.llm.scoreRelevance(user.bio, keywords) : 30;

      if (score > 40) {
        const ok = await this.browser.followUser(user.username);
        if (ok) {
          this.db.logAction('follow', user.username, { score, query });
          this.db.trackFollow(user.username, this.config.niche?.name);
          followed++;
          await sleep(rand(2000, 5000));
        }
      }
    }

    console.log(`✅ Follow session done: followed ${followed} users`);
  }

  // ─── Rate Limiting ────────────────────────────────────────────

  _canDo(type) {
    const summary = this.db.getTodaySummary();
    switch (type) {
      case 'like': return summary.likes < this.limits.dailyLikes;
      case 'follow': return summary.follows < this.limits.dailyFollows;
      case 'comment': return summary.comments < this.limits.dailyComments;
      case 'post': return summary.posts < this.limits.dailyPosts;
      default: return true;
    }
  }

  _checkLimits() {
    const summary = this.db.getTodaySummary();
    return (
      summary.likes < this.limits.dailyLikes ||
      summary.follows < this.limits.dailyFollows ||
      summary.comments < this.limits.dailyComments ||
      summary.posts < this.limits.dailyPosts
    );
  }

  // ─── Error Recovery ───────────────────────────────────────────

  async _handleError(err) {
    console.log(`❌ Error: ${err.message}`);
    this.db.logAction('error', null, { message: err.message, stack: err.stack?.slice(0, 500) });

    // Screenshot for debugging
    await this.browser.screenshot(`error-${Date.now()}.png`).catch(() => {});

    if (err.message?.includes('timeout') || err.message?.includes('Navigation')) {
      console.log('↩️ Navigation error — waiting 30s then continuing');
      await sleep(30000);
    } else if (err.message?.includes('session') || err.message?.includes('login')) {
      console.log('🔑 Session error — attempting recovery');
      const loggedIn = await this.browser.isLoggedIn().catch(() => false);
      if (!loggedIn) {
        console.log('❌ Session expired — cannot recover. Stopping.');
        await this.stop();
      }
    } else if (err.message?.includes('429') || err.message?.includes('rate')) {
      console.log('⏸️ Rate limited — pausing 15 minutes');
      await this._interruptibleSleep(15 * 60000);
    } else {
      console.log('↩️ Unknown error — waiting 60s then continuing');
      await sleep(60000);
    }
  }

  /**
   * Sleep that can be interrupted by stopping the agent.
   */
  async _interruptibleSleep(ms) {
    const interval = 5000; // Check every 5 seconds
    let remaining = ms;
    while (remaining > 0 && this.running) {
      await sleep(Math.min(interval, remaining));
      remaining -= interval;
    }
  }

  // ─── Static Helpers ───────────────────────────────────────────

  /**
   * Load configuration from a JSON file.
   * @param {string} [configPath]
   * @returns {AgentConfig}
   */
  static loadConfig(configPath) {
    const p = configPath || DEFAULT_CONFIG_PATH;
    if (!fs.existsSync(p)) {
      throw new Error(`Config file not found: ${p}\nRun 'xactions agent setup' to create one.`);
    }
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
}

// ─── CLI Runner ──────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  const configPath = args.includes('--config')
    ? args[args.indexOf('--config') + 1]
    : DEFAULT_CONFIG_PATH;

  const isTest = args.includes('--test');
  const isLogin = args.includes('--login');

  if (isLogin) {
    // Headed mode for manual login
    console.log('🔑 Login mode — browser will open for manual authentication');
    const driver = new BrowserDriver({ headless: false, sessionPath: 'data/session.json' });
    await driver.launch();
    await driver.navigate('https://x.com/login');
    console.log('👉 Log in manually, then press Enter in this terminal...');

    await new Promise((resolve) => {
      process.stdin.once('data', resolve);
    });

    await driver.saveSession();
    await driver.close();
    console.log('✅ Session saved! You can now run the agent normally.');
    process.exit(0);
  }

  let config;
  try {
    config = ThoughtLeaderAgent.loadConfig(configPath);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const agent = new ThoughtLeaderAgent(config);

  // Graceful shutdown
  const shutdown = async () => {
    await agent.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  if (isTest) {
    console.log('🧪 Test mode — running for 5 minutes...');
    setTimeout(async () => {
      console.log('\n⏰ Test time limit reached');
      await agent.stop();
      process.exit(0);
    }, 5 * 60000);
  }

  await agent.start();
}

// Run CLI if this file is executed directly
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('thoughtLeaderAgent.js') ||
  process.argv[1].endsWith('thoughtLeaderAgent')
);

if (isMainModule) {
  main().catch((err) => {
    console.error('💀 Fatal error:', err);
    process.exit(1);
  });
}

export { ThoughtLeaderAgent };
