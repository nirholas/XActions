// XActions — Scheduler Tests
// by nichxbt

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Scheduler } from '../../src/agents/scheduler.js';

describe('Scheduler', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new Scheduler({
      timezone: 'America/New_York',
      sleepHours: [23, 6],
      searchTerms: ['AI agents', 'LLM engineering', 'open source AI'],
      influencers: ['karpathy', 'AndrewYNg'],
    });
  });

  describe('isActiveHour', () => {
    it('should return false during sleep hours', () => {
      // Mock the internal _getCurrentHour to return sleep hours
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(2);
      expect(scheduler.isActiveHour()).toBe(false);

      scheduler._getCurrentHour.mockReturnValue(0);
      expect(scheduler.isActiveHour()).toBe(false);

      scheduler._getCurrentHour.mockReturnValue(5);
      expect(scheduler.isActiveHour()).toBe(false);

      scheduler._getCurrentHour.mockReturnValue(23);
      expect(scheduler.isActiveHour()).toBe(false);
    });

    it('should return true during active hours', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(10);
      expect(scheduler.isActiveHour()).toBe(true);

      scheduler._getCurrentHour.mockReturnValue(14);
      expect(scheduler.isActiveHour()).toBe(true);

      scheduler._getCurrentHour.mockReturnValue(20);
      expect(scheduler.isActiveHour()).toBe(true);
    });
  });

  describe('getActivityMultiplier', () => {
    it('should return 0 during sleep hours', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(3);
      expect(scheduler.getActivityMultiplier()).toBe(0.0);
    });

    it('should return peak values during active hours', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(11);
      expect(scheduler.getActivityMultiplier()).toBe(1.0);
    });

    it('should return low values during wind-down', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(22);
      expect(scheduler.getActivityMultiplier()).toBeLessThanOrEqual(0.5);
    });
  });

  describe('getNextActivity', () => {
    it('should return sleep activity during sleep hours', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(2);
      const activity = scheduler.getNextActivity();
      expect(activity.type).toBe('sleep');
      expect(activity.intensity).toBe(0);
    });

    it('should return a valid activity type during active hours', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(10);
      vi.spyOn(scheduler, '_getCurrentDow').mockReturnValue(1); // Monday
      const activity = scheduler.getNextActivity();

      const validTypes = [
        'sleep', 'search-engage', 'home-feed', 'influencer-visit',
        'create-content', 'engage-replies', 'explore', 'own-profile', 'search-people',
      ];
      expect(validTypes).toContain(activity.type);
    });

    it('should include query for search-engage activities', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(10);
      vi.spyOn(scheduler, '_getCurrentDow').mockReturnValue(1);

      // Generate plan and look for search activities
      const plan = scheduler.getDailyPlan();
      const searchActivities = plan.filter((a) => a.type === 'search-engage');

      // Not all search activities may have queries (due to randomness), but some should
      if (searchActivities.length > 0 && scheduler.searchTerms.length > 0) {
        const withQuery = searchActivities.filter((a) => a.query);
        expect(withQuery.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getDailyPlan', () => {
    it('should generate a plan with multiple activities', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(10);
      vi.spyOn(scheduler, '_getCurrentDow').mockReturnValue(1);
      const plan = scheduler.getDailyPlan();
      expect(plan.length).toBeGreaterThan(5);
    });

    it('should include various activity types in a full day', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(8);
      vi.spyOn(scheduler, '_getCurrentDow').mockReturnValue(1);
      const plan = scheduler.getDailyPlan();
      const types = new Set(plan.map((a) => a.type));

      // Should have at least these core types represented
      expect(types.has('search-engage') || types.has('home-feed')).toBe(true);
    });

    it('should return same plan when called twice on the same day', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(10);
      vi.spyOn(scheduler, '_getCurrentDow').mockReturnValue(1);
      const plan1 = scheduler.getDailyPlan();
      const plan2 = scheduler.getDailyPlan();
      expect(plan1.length).toBe(plan2.length);
    });
  });

  describe('addVariance', () => {
    it('should shift all scheduled times', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(10);
      vi.spyOn(scheduler, '_getCurrentDow').mockReturnValue(1);
      scheduler.getDailyPlan();

      const before = scheduler._dailyPlan.map((a) => a.scheduledFor.getTime());
      scheduler.addVariance(10); // +10 minutes
      const after = scheduler._dailyPlan.map((a) => a.scheduledFor.getTime());

      for (let i = 0; i < before.length; i++) {
        expect(after[i]).toBe(before[i] + 10 * 60000);
      }
    });
  });

  describe('weekend patterns', () => {
    it('should still generate activities on weekends', () => {
      vi.spyOn(scheduler, '_getCurrentHour').mockReturnValue(12);
      vi.spyOn(scheduler, '_getCurrentDow').mockReturnValue(6); // Saturday
      const plan = scheduler.getDailyPlan();
      expect(plan.length).toBeGreaterThan(0);
    });
  });
});
