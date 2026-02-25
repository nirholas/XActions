// XActions — ContentCalendar Tests
// by nichxbt

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContentCalendar } from '../../src/agents/contentCalendar.js';
import fs from 'fs';
import path from 'path';

const CALENDAR_FILE = path.resolve('data', 'content-calendar.json');
let backupExists = false;
let backupData = null;

describe('ContentCalendar', () => {
  let cal;

  beforeEach(() => {
    // Back up existing calendar file
    if (fs.existsSync(CALENDAR_FILE)) {
      backupData = fs.readFileSync(CALENDAR_FILE, 'utf-8');
      backupExists = true;
    }
    cal = new ContentCalendar({
      persona: { name: 'Test', tone: 'friendly' },
      niche: { name: 'AI' },
      postsPerDay: 2,
    });
  });

  afterEach(() => {
    // Restore backup
    if (backupExists && backupData) {
      fs.writeFileSync(CALENDAR_FILE, backupData);
    } else if (fs.existsSync(CALENDAR_FILE)) {
      fs.unlinkSync(CALENDAR_FILE);
    }
    backupExists = false;
    backupData = null;
  });

  describe('constructor', () => {
    it('should initialize with default content mix', () => {
      expect(cal.contentMix).toHaveProperty('insight');
      expect(cal.contentMix).toHaveProperty('question');
      expect(cal.postsPerDay).toBe(2);
    });

    it('should start with empty calendar', () => {
      const fresh = new ContentCalendar();
      expect(fresh.calendar).toHaveProperty('weeks');
      expect(fresh.calendar).toHaveProperty('queue');
      expect(fresh.calendar).toHaveProperty('published');
    });
  });

  describe('addToQueue / getQueue', () => {
    it('should add content to the queue', () => {
      cal.addToQueue({ text: 'Hello world', type: 'tweet' });
      const queue = cal.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].text).toBe('Hello world');
      expect(queue[0].status).toBe('pending');
    });

    it('should add multiple items', () => {
      cal.addToQueue({ text: 'Post 1', type: 'tweet' });
      cal.addToQueue({ text: 'Post 2', type: 'insight' });
      const queue = cal.getQueue();
      expect(queue.length).toBe(2);
    });
  });

  describe('approveItem / rejectItem', () => {
    it('should approve a queued item', () => {
      cal.addToQueue({ id: 'q1', text: 'Approve me', type: 'tweet' });
      const result = cal.approveItem('q1');
      expect(result).toBe(true);
    });

    it('should reject a queued item', () => {
      cal.addToQueue({ id: 'q2', text: 'Reject me', type: 'tweet' });
      const result = cal.rejectItem('q2', 'off-topic');
      expect(result).toBe(true);
    });
  });

  describe('generateWeeklyPlan', () => {
    it('should create a plan without LLM', async () => {
      const plan = await cal.generateWeeklyPlan('2025-W10', null);
      expect(plan.id).toBe('2025-W10');
      expect(plan.status).toBe('draft');
      expect(plan.days).toHaveProperty('Monday');
      expect(plan.days).toHaveProperty('Sunday');
    });

    it('should create slots for each day', async () => {
      const plan = await cal.generateWeeklyPlan('2025-W11', null);
      const mondaySlots = plan.days.Monday;
      expect(mondaySlots.length).toBeGreaterThanOrEqual(1);
      expect(mondaySlots[0]).toHaveProperty('type');
      expect(mondaySlots[0]).toHaveProperty('status');
      expect(mondaySlots[0].status).toBe('planned');
    });
  });

  describe('getStats', () => {
    it('should return stats object', () => {
      const stats = cal.getStats();
      expect(stats).toHaveProperty('weeksPlanned');
      expect(typeof stats.weeksPlanned).toBe('number');
    });
  });

  describe('recordPerformance / getPerformanceSummary', () => {
    it('should record and summarize performance', () => {
      cal.recordPerformance('tweet123', { likes: 10, retweets: 5, replies: 2 });
      const summary = cal.getPerformanceSummary();
      expect(summary).toBeDefined();
    });
  });
});
