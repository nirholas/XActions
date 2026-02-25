/**
 * XActions — Content Calendar
 * Weekly content planning, review queue, auto-post, performance tracking
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// by nichxbt

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const CALENDAR_FILE = path.join(DATA_DIR, 'content-calendar.json');

class ContentCalendar {
  constructor(config = {}) {
    this.config = config;
    this.persona = config.persona || {};
    this.niche = config.niche || {};
    this.postsPerDay = config.postsPerDay || 3;
    this.threadPerWeek = config.threadPerWeek || 1;
    this.contentMix = config.contentMix || {
      insight: 0.30,
      question: 0.15,
      hot_take: 0.10,
      tutorial: 0.10,
      story: 0.10,
      curated: 0.10,
      engagement: 0.10,
      meta: 0.05,
    };
    this.calendar = this._load();
  }

  // ── Load / Save ──────────────────────────────────────────────────────────

  _load() {
    try {
      if (fs.existsSync(CALENDAR_FILE)) {
        return JSON.parse(fs.readFileSync(CALENDAR_FILE, 'utf-8'));
      }
    } catch { /* start fresh */ }
    return { weeks: {}, queue: [], published: [], performance: {} };
  }

  _save() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CALENDAR_FILE, JSON.stringify(this.calendar, null, 2));
  }

  // ── Weekly Plan ──────────────────────────────────────────────────────────

  /**
   * Generate a weekly content plan
   * @param {string} weekId - ISO week string (e.g., "2025-W03")
   * @param {object} llm - LLMBrain instance for content generation
   * @returns {object} Weekly plan with daily slots
   */
  async generateWeeklyPlan(weekId, llm) {
    const week = {
      id: weekId,
      createdAt: new Date().toISOString(),
      days: {},
      status: 'draft',
    };

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const threadDay = Math.floor(Math.random() * 5); // Thread on a weekday

    for (let d = 0; d < 7; d++) {
      const dayName = dayNames[d];
      const isWeekend = d >= 5;
      const dayPostCount = isWeekend ? Math.max(1, this.postsPerDay - 1) : this.postsPerDay;
      const slots = [];

      for (let s = 0; s < dayPostCount; s++) {
        const contentType = this._pickContentType();
        const timeSlot = this._getOptimalTime(s, dayPostCount);

        const slot = {
          id: `${weekId}-${d}-${s}`,
          day: dayName,
          time: timeSlot,
          type: contentType,
          status: 'planned',
          text: null,
          generatedAt: null,
          publishedAt: null,
          metrics: null,
        };

        // Generate content if LLM is available
        if (llm) {
          try {
            const result = await llm.generateContent({
              type: contentType === 'thread' ? 'thread' : 'tweet',
              persona: this.persona,
              niche: this.niche,
              context: `This is for ${dayName}, slot ${s + 1} of ${dayPostCount}. Content type: ${contentType}.`,
            });
            slot.text = result.text;
            slot.generatedAt = new Date().toISOString();
            slot.status = 'review';
          } catch (err) {
            console.warn(`⚠️ Failed to generate content for ${dayName} slot ${s}:`, err.message);
          }
        }

        slots.push(slot);
      }

      // Add thread slot on thread day
      if (d === threadDay && this.threadPerWeek > 0) {
        slots.push({
          id: `${weekId}-${d}-thread`,
          day: dayName,
          time: '14:00',
          type: 'thread',
          status: 'planned',
          text: null,
          generatedAt: null,
          publishedAt: null,
          metrics: null,
        });
      }

      week.days[dayName] = slots;
    }

    this.calendar.weeks[weekId] = week;
    this._save();
    console.log(`📅 Generated weekly plan: ${weekId} (${Object.values(week.days).flat().length} posts)`);
    return week;
  }

  // ── Review Queue ─────────────────────────────────────────────────────────

  /**
   * Add content to the review queue
   */
  addToQueue(content) {
    this.calendar.queue.push({
      ...content,
      addedAt: new Date().toISOString(),
      status: 'pending',
    });
    this._save();
  }

  /**
   * Get pending items in the review queue
   */
  getQueue() {
    return this.calendar.queue.filter((item) => item.status === 'pending');
  }

  /**
   * Approve a queued item (mark ready to publish)
   */
  approveItem(itemId) {
    const item = this.calendar.queue.find((i) => i.id === itemId);
    if (item) {
      item.status = 'approved';
      item.approvedAt = new Date().toISOString();
      this._save();
      return true;
    }
    return false;
  }

  /**
   * Reject a queued item
   */
  rejectItem(itemId, reason) {
    const item = this.calendar.queue.find((i) => i.id === itemId);
    if (item) {
      item.status = 'rejected';
      item.rejectedAt = new Date().toISOString();
      item.rejectReason = reason;
      this._save();
      return true;
    }
    return false;
  }

  // ── Auto-Post ────────────────────────────────────────────────────────────

  /**
   * Get the next content item that should be posted
   * @returns {object|null} Content item ready to post
   */
  getNextToPost() {
    const now = new Date();
    const currentWeek = this._getWeekId(now);
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check calendar slots first
    const week = this.calendar.weeks[currentWeek];
    if (week?.days?.[currentDay]) {
      for (const slot of week.days[currentDay]) {
        if (slot.status === 'review' && slot.text && slot.time <= currentTime) {
          return slot;
        }
      }
    }

    // Check approved queue items
    const approved = this.calendar.queue.find((i) => i.status === 'approved');
    return approved || null;
  }

  /**
   * Mark content as published
   */
  markPublished(itemId, tweetId) {
    // Check calendar
    for (const week of Object.values(this.calendar.weeks)) {
      for (const slots of Object.values(week.days)) {
        const slot = slots.find((s) => s.id === itemId);
        if (slot) {
          slot.status = 'published';
          slot.publishedAt = new Date().toISOString();
          slot.tweetId = tweetId;
          this.calendar.published.push({ ...slot });
          this._save();
          return true;
        }
      }
    }

    // Check queue
    const queueItem = this.calendar.queue.find((i) => i.id === itemId);
    if (queueItem) {
      queueItem.status = 'published';
      queueItem.publishedAt = new Date().toISOString();
      queueItem.tweetId = tweetId;
      this.calendar.published.push({ ...queueItem });
      this._save();
      return true;
    }

    return false;
  }

  // ── Performance Tracking ─────────────────────────────────────────────────

  /**
   * Record performance metrics for published content
   */
  recordPerformance(tweetId, metrics) {
    this.calendar.performance[tweetId] = {
      ...this.calendar.performance[tweetId],
      ...metrics,
      updatedAt: new Date().toISOString(),
    };

    // Update the published entry too
    const pub = this.calendar.published.find((p) => p.tweetId === tweetId);
    if (pub) pub.metrics = metrics;

    this._save();
  }

  /**
   * Get performance summary by content type
   * @returns {object} Aggregated performance by type
   */
  getPerformanceSummary() {
    const byType = {};

    for (const pub of this.calendar.published) {
      const type = pub.type || 'unknown';
      if (!byType[type]) {
        byType[type] = { count: 0, totalLikes: 0, totalImpressions: 0, totalReplies: 0 };
      }
      byType[type].count++;
      if (pub.metrics) {
        byType[type].totalLikes += pub.metrics.likes || 0;
        byType[type].totalImpressions += pub.metrics.impressions || 0;
        byType[type].totalReplies += pub.metrics.replies || 0;
      }
    }

    // Compute averages
    for (const type of Object.keys(byType)) {
      const t = byType[type];
      t.avgLikes = t.count > 0 ? Math.round(t.totalLikes / t.count) : 0;
      t.avgImpressions = t.count > 0 ? Math.round(t.totalImpressions / t.count) : 0;
      t.avgReplies = t.count > 0 ? Math.round(t.totalReplies / t.count) : 0;
    }

    return byType;
  }

  /**
   * Get best-performing content type
   */
  getBestContentType() {
    const summary = this.getPerformanceSummary();
    let best = null;
    let bestAvg = 0;

    for (const [type, stats] of Object.entries(summary)) {
      if (stats.count >= 3 && stats.avgLikes > bestAvg) {
        best = type;
        bestAvg = stats.avgLikes;
      }
    }

    return best;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _pickContentType() {
    const rand = Math.random();
    let cumulative = 0;
    for (const [type, weight] of Object.entries(this.contentMix)) {
      cumulative += weight;
      if (rand < cumulative) return type;
    }
    return 'insight';
  }

  _getOptimalTime(slotIndex, totalSlots) {
    // Spread posts across the day: morning (8-10), midday (12-14), evening (17-19)
    const windows = ['08:30', '09:00', '12:00', '13:00', '17:00', '18:00', '19:30', '20:00'];
    const spacing = Math.floor(windows.length / totalSlots);
    const idx = Math.min(slotIndex * spacing, windows.length - 1);
    return windows[idx];
  }

  _getWeekId(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  /**
   * Get statistics about the calendar
   */
  getStats() {
    const totalPlanned = Object.values(this.calendar.weeks)
      .flatMap((w) => Object.values(w.days).flat())
      .length;
    const published = this.calendar.published.length;
    const queued = this.calendar.queue.filter((i) => i.status === 'pending').length;

    return {
      weeksPlanned: Object.keys(this.calendar.weeks).length,
      totalPlanned,
      published,
      queued,
      performance: this.getPerformanceSummary(),
    };
  }
}

export { ContentCalendar };
