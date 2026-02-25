// XActions — Database Tests
// by nichxbt

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentDatabase } from '../../src/agents/database.js';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.resolve('data', 'test-agent.db');

describe('AgentDatabase', () => {
  let db;

  beforeEach(() => {
    // Remove test DB if it exists
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new AgentDatabase(TEST_DB_PATH);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  describe('logAction', () => {
    it('should log an action and retrieve it', () => {
      db.logAction('like', 'tweet123', { score: 85 });
      const actions = db.getRecentActions(10);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('like');
      expect(actions[0].target_id).toBe('tweet123');
      const meta = JSON.parse(actions[0].metadata);
      expect(meta.score).toBe(85);
    });

    it('should log actions without metadata', () => {
      db.logAction('explore', null);
      const actions = db.getRecentActions(10);
      expect(actions.length).toBe(1);
      expect(actions[0].metadata).toBeNull();
    });
  });

  describe('getActionsToday', () => {
    it('should count actions for today', () => {
      db.logAction('like', 'tweet1');
      db.logAction('like', 'tweet2');
      db.logAction('follow', 'user1');
      expect(db.getActionsToday('like')).toBe(2);
      expect(db.getActionsToday('follow')).toBe(1);
      expect(db.getActionsToday()).toBe(3);
    });

    it('should return 0 for no actions', () => {
      expect(db.getActionsToday('like')).toBe(0);
    });
  });

  describe('isDuplicate', () => {
    it('should detect duplicates', () => {
      expect(db.isDuplicate('like', 'tweet123')).toBe(false);
      db.logAction('like', 'tweet123');
      expect(db.isDuplicate('like', 'tweet123')).toBe(true);
    });

    it('should distinguish between different types', () => {
      db.logAction('like', 'tweet123');
      expect(db.isDuplicate('comment', 'tweet123')).toBe(false);
    });
  });

  describe('follow tracking', () => {
    it('should track follows', () => {
      db.trackFollow('user1', 'AI');
      db.trackFollow('user2', 'AI');
      const following = db.getFollowing();
      expect(following.length).toBe(2);
    });

    it('should track unfollows', () => {
      db.trackFollow('user1', 'AI');
      db.trackUnfollow('user1');
      const following = db.getFollowing();
      expect(following.length).toBe(0);
    });
  });

  describe('content tracking', () => {
    it('should record and retrieve content', () => {
      const id = db.recordContent('tweet', 'Hello world');
      expect(id).toBeGreaterThan(0);

      const posts = db.getRecentPosts(10);
      expect(posts.length).toBe(1);
      expect(posts[0].text).toBe('Hello world');
      expect(posts[0].type).toBe('tweet');
    });

    it('should update content metrics', () => {
      const id = db.recordContent('tweet', 'Test');
      db.updateContentMetrics(id, { impressions: 100, likes: 5 });

      const posts = db.getRecentPosts(10);
      expect(posts[0].impressions).toBe(100);
      expect(posts[0].likes).toBe(5);
    });
  });

  describe('daily metrics', () => {
    it('should record and retrieve daily metrics', () => {
      db.recordDailyMetrics({ followers: 100, likes_given: 50 });

      const today = new Date().toISOString().split('T')[0];
      const rows = db.db.prepare('SELECT * FROM metrics WHERE date = ?').all(today);
      expect(rows.length).toBe(1);
      expect(rows[0].followers).toBe(100);
      expect(rows[0].likes_given).toBe(50);
    });

    it('should update existing daily metrics', () => {
      db.recordDailyMetrics({ followers: 100 });
      db.recordDailyMetrics({ followers: 105, likes_given: 20 });

      const today = new Date().toISOString().split('T')[0];
      const rows = db.db.prepare('SELECT * FROM metrics WHERE date = ?').all(today);
      expect(rows.length).toBe(1);
      expect(rows[0].followers).toBe(105);
      expect(rows[0].likes_given).toBe(20);
    });
  });

  describe('LLM usage', () => {
    it('should record LLM usage', () => {
      db.recordLLMUsage('deepseek/deepseek-chat', 1000, 200);
      const usage = db.getLLMUsage(1);
      expect(usage.length).toBe(1);
      expect(usage[0].input_tokens).toBe(1000);
      expect(usage[0].output_tokens).toBe(200);
    });

    it('should aggregate usage for same model and day', () => {
      db.recordLLMUsage('deepseek/deepseek-chat', 1000, 200);
      db.recordLLMUsage('deepseek/deepseek-chat', 500, 100);
      const usage = db.getLLMUsage(1);
      expect(usage.length).toBe(1);
      expect(usage[0].calls).toBe(2);
      expect(usage[0].input_tokens).toBe(1500);
      expect(usage[0].output_tokens).toBe(300);
    });

    it('should calculate cost', () => {
      db.recordLLMUsage('deepseek/deepseek-chat', 1000000, 500000);
      const cost = db.getLLMCost(1);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('growth report', () => {
    it('should return growth report structure', () => {
      db.recordDailyMetrics({ followers: 100, likes_given: 50 });
      db.recordContent('tweet', 'Test post');
      db.recordLLMUsage('test-model', 100, 50);

      const report = db.getGrowthReport(7);
      expect(report).toHaveProperty('followers');
      expect(report).toHaveProperty('engagement');
      expect(report).toHaveProperty('content');
      expect(Array.isArray(report.followers)).toBe(true);
    });
  });

  describe('getTodaySummary', () => {
    it('should return structured summary', () => {
      db.logAction('like', 'tweet1');
      db.logAction('like', 'tweet2');
      db.logAction('follow', 'user1');
      db.logAction('comment', 'tweet3');
      db.logAction('post', null);

      const summary = db.getTodaySummary();
      expect(summary.likes).toBe(2);
      expect(summary.follows).toBe(1);
      expect(summary.comments).toBe(1);
      expect(summary.posts).toBe(1);
      expect(summary.total).toBe(5);
    });
  });
});
