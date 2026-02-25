// XActions — Scheduler Module
// Circadian rhythm activity scheduler with human-like variance
// by nichxbt

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Gaussian random (Box-Muller).
 */
function gaussianRandom(mean = 0, stdev = 1) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z * stdev + mean;
}

/**
 * @typedef {Object} Activity
 * @property {string} type - Activity type
 * @property {number} intensity - 0.0 to 1.0
 * @property {Date} scheduledFor - When to execute
 * @property {number} durationMinutes - Estimated duration
 * @property {string} [query] - Search query for search-engage
 * @property {string} [username] - Username for influencer-visit
 */

// Default daily schedule template: hour → activity types
const DEFAULT_SCHEDULE = {
  6:  [{ type: 'home-feed', duration: 15 }],
  7:  [{ type: 'search-engage', duration: 20 }, { type: 'home-feed', duration: 10 }],
  8:  [{ type: 'influencer-visit', duration: 15 }, { type: 'search-engage', duration: 15 }],
  9:  [{ type: 'create-content', duration: 20 }, { type: 'engage-replies', duration: 10 }],
  10: [{ type: 'search-engage', duration: 20 }, { type: 'home-feed', duration: 15 }],
  11: [{ type: 'search-people', duration: 15 }, { type: 'explore', duration: 10 }],
  12: [{ type: 'home-feed', duration: 15 }],
  13: [{ type: 'search-engage', duration: 15 }, { type: 'influencer-visit', duration: 10 }],
  14: [{ type: 'create-content', duration: 15 }, { type: 'search-engage', duration: 20 }],
  15: [{ type: 'engage-replies', duration: 15 }, { type: 'home-feed', duration: 10 }],
  16: [{ type: 'search-engage', duration: 20 }, { type: 'explore', duration: 10 }],
  17: [{ type: 'influencer-visit', duration: 15 }, { type: 'search-people', duration: 10 }],
  18: [{ type: 'home-feed', duration: 15 }],
  19: [{ type: 'create-content', duration: 20 }, { type: 'search-engage', duration: 15 }],
  20: [{ type: 'engage-replies', duration: 15 }, { type: 'home-feed', duration: 10 }],
  21: [{ type: 'own-profile', duration: 5 }, { type: 'search-engage', duration: 15 }],
  22: [{ type: 'home-feed', duration: 10 }],
};

// Activity intensity multiplier per hour (0.0-1.0)
const HOURLY_INTENSITY = [
  // 0-5: sleep
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  // 6-8: waking up
  0.2, 0.4, 0.6,
  // 9-11: morning peak
  0.8, 0.9, 1.0,
  // 12-13: lunch dip
  0.7, 0.6,
  // 14-17: afternoon
  0.8, 0.9, 0.8, 0.7,
  // 18-19: evening
  0.6, 0.7,
  // 20-22: night wind-down
  0.8, 0.6, 0.3,
  // 23: almost sleep
  0.1,
];

/**
 * Circadian rhythm activity scheduler with human-like variance.
 */
class Scheduler {
  /**
   * @param {Object} [config]
   * @param {string} [config.timezone='America/New_York']
   * @param {[number, number]} [config.sleepHours=[23, 6]] - [start, end] in 24h format
   * @param {string[]} [config.searchTerms] - Search queries for search-engage activities
   * @param {string[]} [config.influencers] - Usernames for influencer-visit activities
   * @param {number} [config.varianceMinutes=20] - Base variance in minutes
   */
  constructor(config = {}) {
    this.timezone = config.timezone || 'America/New_York';
    this.sleepStart = config.sleepHours?.[0] ?? 23;
    this.sleepEnd = config.sleepHours?.[1] ?? 6;
    this.searchTerms = config.searchTerms || [];
    this.influencers = config.influencers || [];
    this.varianceMinutes = config.varianceMinutes ?? 20;

    /** @type {Activity[]} Today's planned activities */
    this._dailyPlan = [];
    this._planDate = null;
    this._activityIndex = 0;
  }

  /**
   * Get the current hour in the configured timezone.
   * @returns {number} Hour (0-23)
   */
  _getCurrentHour() {
    const now = new Date();
    const tzTime = new Date(now.toLocaleString('en-US', { timeZone: this.timezone }));
    return tzTime.getHours();
  }

  /**
   * Get current day of week in configured timezone (0=Sun, 6=Sat).
   * @returns {number}
   */
  _getCurrentDow() {
    const now = new Date();
    const tzTime = new Date(now.toLocaleString('en-US', { timeZone: this.timezone }));
    return tzTime.getDay();
  }

  /**
   * Check if the current moment is during sleep hours.
   * @returns {boolean}
   */
  _isSleepHour(hour) {
    if (this.sleepStart > this.sleepEnd) {
      // Sleep wraps past midnight (e.g., 23 → 6)
      return hour >= this.sleepStart || hour < this.sleepEnd;
    }
    return hour >= this.sleepStart && hour < this.sleepEnd;
  }

  /**
   * Check if it's currently an active hour.
   * @returns {boolean}
   */
  isActiveHour() {
    return !this._isSleepHour(this._getCurrentHour());
  }

  /**
   * Get the activity intensity multiplier for the current hour.
   * @returns {number} 0.0-1.0
   */
  getActivityMultiplier() {
    const hour = this._getCurrentHour();
    if (this._isSleepHour(hour)) return 0.0;
    return HOURLY_INTENSITY[hour] || 0.0;
  }

  /**
   * Generate today's activity plan (called once per day or when plan is stale).
   * @returns {Activity[]}
   */
  _generateDailyPlan() {
    const today = new Date().toISOString().split('T')[0];
    if (this._planDate === today && this._dailyPlan.length > 0) {
      return this._dailyPlan;
    }

    const plan = [];
    const dow = this._getCurrentDow();
    const isWeekend = dow === 0 || dow === 6;

    for (const [hourStr, activities] of Object.entries(DEFAULT_SCHEDULE)) {
      const hour = parseInt(hourStr, 10);
      if (this._isSleepHour(hour)) continue;

      for (const activity of activities) {
        // 10% chance to skip any given session (humans are inconsistent)
        if (Math.random() < 0.10) continue;

        // Weekend adjustment: shift some morning activity to midday
        let adjustedHour = hour;
        if (isWeekend && hour < 10) {
          adjustedHour = hour + rand(1, 3); // Wake up later
        }
        if (isWeekend && hour >= 12 && hour <= 15) {
          // More midday activity on weekends — boost duration
        }

        // ±15-30 min jitter on start time
        const jitterMinutes = Math.round(gaussianRandom(0, this.varianceMinutes * 0.75));
        const clampedJitter = Math.max(-30, Math.min(30, jitterMinutes));

        const scheduledFor = new Date();
        scheduledFor.setHours(adjustedHour, clampedJitter + 30, rand(0, 59), 0);

        // ±20% duration variance
        const durationVariance = activity.duration * 0.2;
        let duration = Math.round(activity.duration + gaussianRandom(0, durationVariance));
        duration = Math.max(5, duration);

        // 5% chance of "binge" session (2x normal duration)
        if (Math.random() < 0.05) {
          duration = Math.round(duration * 2);
        }

        const entry = {
          type: activity.type,
          intensity: HOURLY_INTENSITY[adjustedHour] || 0.5,
          scheduledFor,
          durationMinutes: duration,
        };

        // Assign search query or influencer username
        if (activity.type === 'search-engage' || activity.type === 'search-people') {
          if (this.searchTerms.length > 0) {
            entry.query = this.searchTerms[rand(0, this.searchTerms.length - 1)];
          }
        }
        if (activity.type === 'influencer-visit') {
          if (this.influencers.length > 0) {
            entry.username = this.influencers[rand(0, this.influencers.length - 1)];
          }
        }

        plan.push(entry);
      }
    }

    // Sort by scheduled time
    plan.sort((a, b) => a.scheduledFor - b.scheduledFor);

    this._dailyPlan = plan;
    this._planDate = today;
    this._activityIndex = 0;

    return plan;
  }

  /**
   * Get the next activity to execute.
   * @returns {Activity}
   */
  getNextActivity() {
    const hour = this._getCurrentHour();

    // If sleeping, return sleep activity
    if (this._isSleepHour(hour)) {
      // Calculate when to wake up
      const now = new Date();
      const wakeUp = new Date(now);
      if (hour >= this.sleepStart) {
        // Sleep starts today, wake up tomorrow
        wakeUp.setDate(wakeUp.getDate() + 1);
      }
      wakeUp.setHours(this.sleepEnd, rand(0, 30), 0, 0);
      const sleepMs = wakeUp - now;

      return {
        type: 'sleep',
        intensity: 0,
        scheduledFor: wakeUp,
        durationMinutes: Math.round(sleepMs / 60000),
      };
    }

    const plan = this._generateDailyPlan();
    const now = new Date();

    // Find the next activity that hasn't passed
    while (this._activityIndex < plan.length) {
      const activity = plan[this._activityIndex];
      if (activity.scheduledFor > now) {
        return activity;
      }
      // If activity is within a 15-minute window, it's still valid
      const elapsed = (now - activity.scheduledFor) / 60000;
      if (elapsed < 15) {
        this._activityIndex++;
        return activity;
      }
      this._activityIndex++;
    }

    // All scheduled activities done — return a light home-feed browse
    return {
      type: 'home-feed',
      intensity: this.getActivityMultiplier(),
      scheduledFor: new Date(now.getTime() + rand(5, 15) * 60000),
      durationMinutes: rand(10, 20),
    };
  }

  /**
   * Add a global variance offset to all scheduled times.
   * @param {number} minutes - ± minutes to shift all activities
   */
  addVariance(minutes) {
    const offsetMs = minutes * 60000;
    for (const activity of this._dailyPlan) {
      activity.scheduledFor = new Date(activity.scheduledFor.getTime() + offsetMs);
    }
  }

  /**
   * Get today's planned activities for logging/display.
   * @returns {Activity[]}
   */
  getDailyPlan() {
    return this._generateDailyPlan().map((a) => ({
      type: a.type,
      intensity: a.intensity,
      scheduledFor: a.scheduledFor.toISOString(),
      durationMinutes: a.durationMinutes,
      query: a.query,
      username: a.username,
    }));
  }
}

export { Scheduler };
