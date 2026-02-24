/**
 * Unfollower Scan Scheduler
 * 
 * Background worker that checks for due auto-scan schedules
 * and executes follower scans automatically.
 * 
 * Runs on a 60-second polling interval. For each due schedule:
 * 1. Looks up the user's session cookie
 * 2. Runs a follower scan via followerScanner
 * 3. Checks for alerts via unfollowerAlerts
 * 4. Marks the schedule as executed (sets next run time)
 * 
 * Start via: startScheduler(io) from server.js
 * Stop via:  stopScheduler()
 * 
 * @module api/services/unfollowerScheduler
 * @author nichxbt
 */

import { PrismaClient } from '@prisma/client';
import { runFollowerScan } from './followerScanner.js';
import { checkAndAlert, getDueSchedules, markScheduleExecuted } from './unfollowerAlerts.js';

const prisma = new PrismaClient();

let schedulerInterval = null;
const POLL_INTERVAL = 60 * 1000; // Check every 60 seconds
let isProcessing = false;

/**
 * Process all due schedules
 * @param {Object} io - Socket.IO server instance
 */
async function processDueSchedules(io) {
  if (isProcessing) return; // Prevent overlapping runs
  isProcessing = true;

  try {
    const dueSchedules = await getDueSchedules();

    if (dueSchedules.length === 0) return;

    console.log(`⏰ Scheduler: ${dueSchedules.length} scan(s) due`);

    for (const schedule of dueSchedules) {
      try {
        // Look up user for session cookie
        const user = await prisma.user.findUnique({
          where: { id: schedule.userId },
          select: {
            id: true,
            sessionCookie: true,
            twitterUsername: true,
          },
        });

        if (!user?.sessionCookie || !user?.twitterUsername) {
          console.warn(`⚠️ Scheduler: Skipping user ${schedule.userId} — missing session cookie or username`);
          await markScheduleExecuted(schedule.userId);
          continue;
        }

        console.log(`🔍 Scheduler: Running scan for @${user.twitterUsername}`);

        // Run the scan
        const result = await runFollowerScan(
          user.id,
          user.sessionCookie,
          user.twitterUsername,
          { limit: 5000 }
        );

        // Check for alerts
        await checkAndAlert(io, user.id, result);

        // Mark as executed and set next run time
        await markScheduleExecuted(schedule.userId);

        console.log(`✅ Scheduler: Scan complete for @${user.twitterUsername} (+${result.gained.length}/-${result.lost.length})`);

        // Small delay between scans to avoid hammering X
        await new Promise(r => setTimeout(r, 5000));
      } catch (err) {
        console.error(`❌ Scheduler: Scan failed for user ${schedule.userId}:`, err.message);
        // Still mark as executed to prevent infinite retry loops
        await markScheduleExecuted(schedule.userId);
      }
    }
  } catch (err) {
    console.error('❌ Scheduler: Error checking due schedules:', err.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the scheduler polling loop
 * @param {Object} io - Socket.IO server instance
 */
export function startScheduler(io) {
  if (schedulerInterval) {
    console.warn('⚠️ Scheduler already running');
    return;
  }

  console.log('📅 Unfollower scheduler started (polling every 60s)');
  schedulerInterval = setInterval(() => processDueSchedules(io), POLL_INTERVAL);

  // Also run immediately on start
  processDueSchedules(io);
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏹️ Unfollower scheduler stopped');
  }
}
