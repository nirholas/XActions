/**
 * Unfollower Alerts Service
 * 
 * Detects notable unfollower events and delivers alerts via
 * Socket.IO real-time events and optional webhook POST.
 * 
 * Notable events:
 * - Verified accounts that unfollowed
 * - Accounts with >10k followers that unfollowed
 * - Mass unfollow events (>10 unfollows in one scan)
 * 
 * @module api/services/unfollowerAlerts
 * @author nichxbt
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check scan results for notable events and send alerts
 * @param {Object} io - Socket.IO server instance
 * @param {string} userId - XActions user ID
 * @param {Object} scanResult - Result from followerScanner.runFollowerScan()
 * @returns {Array} Generated alerts
 */
export async function checkAndAlert(io, userId, scanResult) {
  const { gained, lost, totalFollowers, scanDate } = scanResult;
  const alerts = [];

  if (scanResult.isFirstScan) {
    // No alerts on first scan — no diff to compare
    return alerts;
  }

  // 1. Mass unfollow event (>10 unfollows in one scan)
  if (lost.length > 10) {
    alerts.push({
      type: 'mass_unfollow',
      severity: 'warning',
      title: '⚠️ Mass Unfollow Detected',
      message: `${lost.length} accounts unfollowed you in this scan`,
      data: { count: lost.length, unfollowers: lost.slice(0, 20) },
    });
  }

  // 2. Verified accounts that unfollowed
  const verifiedUnfollowers = lost.filter(u => u.verified);
  if (verifiedUnfollowers.length > 0) {
    alerts.push({
      type: 'verified_unfollow',
      severity: 'info',
      title: '✓ Verified Account Unfollowed',
      message: `${verifiedUnfollowers.length} verified account(s) unfollowed you`,
      data: { accounts: verifiedUnfollowers },
    });
  }

  // 3. High-profile unfollowers (>10k followers)
  // Note: We don't always have follower counts from the scrape,
  // but if we do, flag them
  const highProfileUnfollowers = lost.filter(u => u.followerCount && u.followerCount > 10000);
  if (highProfileUnfollowers.length > 0) {
    alerts.push({
      type: 'highprofile_unfollow',
      severity: 'info',
      title: '📊 High-Profile Unfollow',
      message: `${highProfileUnfollowers.length} account(s) with 10k+ followers unfollowed you`,
      data: { accounts: highProfileUnfollowers },
    });
  }

  // 4. Significant net loss (>5% of followers in one scan)
  if (totalFollowers > 0 && lost.length > totalFollowers * 0.05) {
    alerts.push({
      type: 'significant_loss',
      severity: 'critical',
      title: '🚨 Significant Follower Loss',
      message: `Lost ${lost.length} followers (${((lost.length / totalFollowers) * 100).toFixed(1)}% of total)`,
      data: { lost: lost.length, total: totalFollowers },
    });
  }

  // 5. Growth milestone (gained > 100 in one scan)
  if (gained.length > 100) {
    alerts.push({
      type: 'growth_spike',
      severity: 'success',
      title: '🚀 Growth Spike!',
      message: `${gained.length} new followers detected in this scan`,
      data: { count: gained.length },
    });
  }

  // Emit alerts via Socket.IO
  if (alerts.length > 0) {
    const payload = {
      userId,
      scanDate,
      totalFollowers,
      gained: gained.length,
      lost: lost.length,
      alerts,
    };

    io.emit(`unfollower:alerts:${userId}`, payload);
    io.emit('unfollower:scan-complete', {
      userId,
      scanDate,
      totalFollowers,
      gained: gained.length,
      lost: lost.length,
    });
  } else {
    // Still emit scan completion even without alerts
    io.emit('unfollower:scan-complete', {
      userId,
      scanDate,
      totalFollowers,
      gained: gained.length,
      lost: lost.length,
    });
  }

  // Deliver webhook if configured
  await deliverWebhook(userId, {
    event: 'scan_complete',
    scanDate,
    totalFollowers,
    gained: gained.length,
    lost: lost.length,
    alerts,
  });

  return alerts;
}

/**
 * Deliver alert to user-configured webhook URL
 * @param {string} userId - XActions user ID
 * @param {Object} payload - Alert payload
 */
async function deliverWebhook(userId, payload) {
  try {
    const schedule = await prisma.unfollowerSchedule.findUnique({
      where: { userId },
    });

    if (!schedule?.webhookUrl) return;

    const response = await fetch(schedule.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'xactions',
        event: 'unfollower_scan',
        timestamp: new Date().toISOString(),
        ...payload,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      console.warn(`⚠️ Webhook delivery failed for user ${userId}: ${response.status}`);
    } else {
      console.log(`📨 Webhook delivered for user ${userId}`);
    }
  } catch (error) {
    console.warn(`⚠️ Webhook delivery error for user ${userId}:`, error.message);
  }
}

/**
 * Schedule management
 */

const INTERVAL_MS = {
  hourly: 60 * 60 * 1000,
  every6h: 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

/**
 * Set or update auto-scan schedule
 * @param {string} userId - XActions user ID
 * @param {string} interval - 'hourly', 'every6h', 'daily'
 * @param {string} [webhookUrl] - Optional webhook URL for alerts
 * @returns {Object} Schedule record
 */
export async function setSchedule(userId, interval, webhookUrl = null) {
  if (!INTERVAL_MS[interval]) {
    throw new Error(`Invalid interval: ${interval}. Must be one of: ${Object.keys(INTERVAL_MS).join(', ')}`);
  }

  const nextRunAt = new Date(Date.now() + INTERVAL_MS[interval]);

  const schedule = await prisma.unfollowerSchedule.upsert({
    where: { userId },
    update: {
      interval,
      active: true,
      nextRunAt,
      webhookUrl,
    },
    create: {
      userId,
      interval,
      active: true,
      nextRunAt,
      webhookUrl,
    },
  });

  console.log(`📅 Schedule set for user ${userId}: ${interval} (next run: ${nextRunAt.toISOString()})`);
  return schedule;
}

/**
 * Stop auto-scanning for a user
 * @param {string} userId - XActions user ID
 * @returns {Object|null} Updated schedule or null
 */
export async function stopSchedule(userId) {
  try {
    const schedule = await prisma.unfollowerSchedule.update({
      where: { userId },
      data: { active: false },
    });
    console.log(`⏹️ Schedule stopped for user ${userId}`);
    return schedule;
  } catch (error) {
    // No schedule to stop
    return null;
  }
}

/**
 * Get current schedule for a user
 * @param {string} userId - XActions user ID
 * @returns {Object|null} Schedule record
 */
export async function getSchedule(userId) {
  return prisma.unfollowerSchedule.findUnique({
    where: { userId },
  });
}

/**
 * Get all active schedules that are due to run
 * Used by the scheduler to find jobs to process
 * @returns {Array} Schedules due for execution
 */
export async function getDueSchedules() {
  return prisma.unfollowerSchedule.findMany({
    where: {
      active: true,
      nextRunAt: { lte: new Date() },
    },
  });
}

/**
 * Mark a schedule as just executed and set next run time
 * @param {string} userId - XActions user ID
 */
export async function markScheduleExecuted(userId) {
  const schedule = await prisma.unfollowerSchedule.findUnique({
    where: { userId },
  });

  if (!schedule) return;

  const intervalMs = INTERVAL_MS[schedule.interval] || INTERVAL_MS.daily;

  await prisma.unfollowerSchedule.update({
    where: { userId },
    data: {
      lastRunAt: new Date(),
      nextRunAt: new Date(Date.now() + intervalMs),
    },
  });
}
