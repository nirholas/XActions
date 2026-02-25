// XActions — AntiDetection Tests
// by nichxbt

import { describe, it, expect, beforeEach } from 'vitest';
import { AntiDetection } from '../../src/agents/antiDetection.js';

describe('AntiDetection', () => {
  let ad;

  beforeEach(() => {
    ad = new AntiDetection();
  });

  describe('generateFingerprint', () => {
    it('should return a valid fingerprint object', () => {
      const fp = ad.generateFingerprint();
      expect(fp).toHaveProperty('viewport');
      expect(fp).toHaveProperty('userAgent');
      expect(fp).toHaveProperty('timezone');
      expect(fp).toHaveProperty('locale');
    });

    it('should have a valid viewport with width and height', () => {
      const fp = ad.generateFingerprint();
      expect(fp.viewport.width).toBeGreaterThan(800);
      expect(fp.viewport.height).toBeGreaterThan(500);
    });

    it('should return a real Chrome user agent', () => {
      const fp = ad.generateFingerprint();
      expect(fp.userAgent).toContain('Chrome');
      expect(fp.userAgent).toContain('Mozilla');
    });

    it('should produce varying fingerprints', () => {
      const fps = new Set();
      for (let i = 0; i < 20; i++) {
        fps.add(JSON.stringify(ad.generateFingerprint().viewport));
      }
      // With 20 samples, we should see at least 2 different viewports
      expect(fps.size).toBeGreaterThan(1);
    });
  });

  describe('addJitter', () => {
    it('should return a number close to the base', () => {
      const jittered = ad.addJitter(1000);
      expect(typeof jittered).toBe('number');
      expect(jittered).toBeGreaterThan(500);
      expect(jittered).toBeLessThan(2000);
    });

    it('should vary across calls', () => {
      const results = new Set();
      for (let i = 0; i < 20; i++) {
        results.add(ad.addJitter(1000));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('getCircadianPattern', () => {
    it('should return 24 elements', () => {
      const pattern = ad.getCircadianPattern();
      expect(pattern).toHaveLength(24);
    });

    it('should have values between 0 and 1', () => {
      const pattern = ad.getCircadianPattern();
      for (const val of pattern) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('should have low values during sleep hours', () => {
      const pattern = ad.getCircadianPattern();
      // Hours 2-5 should be low activity
      const sleepAvg = (pattern[2] + pattern[3] + pattern[4] + pattern[5]) / 4;
      const dayAvg = (pattern[10] + pattern[11] + pattern[14] + pattern[15]) / 4;
      expect(sleepAvg).toBeLessThan(dayAvg);
    });
  });
});
