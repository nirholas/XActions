// XActions — Anti-Detection Module
// Human behavior simulation for Puppeteer automation
// by nichxbt

/**
 * @typedef {Object} SessionFingerprint
 * @property {{ width: number, height: number }} viewport
 * @property {string} userAgent
 * @property {string} timezone
 * @property {string} locale
 * @property {number} colorDepth
 */

// Pool of real Chrome user agents (Windows, Mac, Linux — Chrome 120-131)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney',
];

const LOCALES = ['en-US', 'en-GB', 'en-CA', 'en-AU'];

/**
 * Compute a point on a cubic Bezier curve at parameter t ∈ [0, 1].
 */
function bezierPoint(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/**
 * Generate Bezier control points between two positions with natural overshoot.
 */
function generateBezierPath(startX, startY, endX, endY, steps = 25) {
  const points = [];
  const dx = endX - startX;
  const dy = endY - startY;

  // Control points with some randomness and slight overshoot
  const cp1x = startX + dx * (0.2 + Math.random() * 0.2);
  const cp1y = startY + dy * (0.0 + Math.random() * 0.3);
  const cp2x = startX + dx * (0.6 + Math.random() * 0.2);
  const cp2y = startY + dy * (0.7 + Math.random() * 0.3);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: Math.round(bezierPoint(t, startX, cp1x, cp2x, endX)),
      y: Math.round(bezierPoint(t, startY, cp1y, cp2y, endY)),
    });
  }

  // 15% chance of overshoot + correction
  if (Math.random() < 0.15) {
    const overshootX = endX + (Math.random() * 8 - 4);
    const overshootY = endY + (Math.random() * 8 - 4);
    points.push({ x: Math.round(overshootX), y: Math.round(overshootY) });
    // Correct back
    points.push({ x: Math.round(endX + (overshootX - endX) * 0.3), y: Math.round(endY + (overshootY - endY) * 0.3) });
    points.push({ x: endX, y: endY });
  }

  return points;
}

/**
 * Gaussian random number using Box-Muller transform.
 */
function gaussianRandom(mean = 0, stdev = 1) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z * stdev + mean;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Anti-detection module — simulates human behavior for Puppeteer pages.
 */
class AntiDetection {
  /**
   * Generate a randomized session fingerprint.
   * @returns {SessionFingerprint}
   */
  generateFingerprint() {
    const width = rand(1280, 1920);
    const height = rand(720, 1080);
    return {
      viewport: { width, height },
      userAgent: USER_AGENTS[rand(0, USER_AGENTS.length - 1)],
      timezone: TIMEZONES[rand(0, TIMEZONES.length - 1)],
      locale: LOCALES[rand(0, LOCALES.length - 1)],
      colorDepth: [24, 32][rand(0, 1)],
    };
  }

  /**
   * Move the mouse along a Bezier curve path from current position to (x, y).
   * @param {import('puppeteer').Page} page
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   */
  async moveMouse(page, x, y) {
    const mouse = page.mouse;
    // Get approximate current position or start from random edge
    const startX = this._lastMouseX ?? rand(100, 400);
    const startY = this._lastMouseY ?? rand(100, 400);

    const path = generateBezierPath(startX, startY, x, y, rand(18, 35));

    for (const point of path) {
      await mouse.move(point.x, point.y);
      await sleep(rand(2, 12));
    }

    this._lastMouseX = x;
    this._lastMouseY = y;
  }

  /**
   * Human-like click: hover over element, short pause, then click with variable duration.
   * @param {import('puppeteer').Page} page
   * @param {string} selector - CSS selector to click
   */
  async humanClick(page, selector) {
    const el = await page.$(selector);
    if (!el) throw new Error(`Element not found: ${selector}`);

    const box = await el.boundingBox();
    if (!box) throw new Error(`Element not visible: ${selector}`);

    // Target a random point within the element
    const targetX = box.x + rand(Math.floor(box.width * 0.2), Math.floor(box.width * 0.8));
    const targetY = box.y + rand(Math.floor(box.height * 0.2), Math.floor(box.height * 0.8));

    // Move mouse to target
    await this.moveMouse(page, targetX, targetY);

    // Pre-click hover pause (50-300ms)
    await sleep(rand(50, 300));

    // Click with variable hold duration
    await page.mouse.down();
    await sleep(rand(30, 120)); // Human click hold time
    await page.mouse.up();

    // Post-click small pause
    await sleep(rand(100, 400));
  }

  /**
   * Human-like typing with variable speed and occasional typos.
   * @param {import('puppeteer').Page} page
   * @param {string} selector - CSS selector of input element
   * @param {string} text - Text to type
   */
  async humanType(page, selector, text) {
    await this.humanClick(page, selector);
    await sleep(rand(200, 500));

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // 2% chance of typo
      if (Math.random() < 0.02 && char.match(/[a-zA-Z]/)) {
        // Type wrong character
        const typoChar = String.fromCharCode(char.charCodeAt(0) + rand(-2, 2));
        await page.keyboard.type(typoChar, { delay: rand(30, 80) });
        await sleep(rand(100, 300));
        // Backspace to fix
        await page.keyboard.press('Backspace');
        await sleep(rand(50, 150));
      }

      // Variable typing speed: fast for common letters, slower for specials
      const isSpecial = !char.match(/[a-zA-Z0-9 ]/);
      const baseDelay = isSpecial ? rand(60, 120) : rand(30, 100);

      // Occasional pause between words
      if (char === ' ' && Math.random() < 0.15) {
        await sleep(rand(150, 500));
      }

      await page.keyboard.type(char, { delay: baseDelay });
    }
  }

  /**
   * Human-like scrolling with variable velocity, acceleration, and deceleration phases.
   * @param {import('puppeteer').Page} page
   * @param {number} pixels - Total pixels to scroll (positive = down)
   */
  async humanScroll(page, pixels) {
    const direction = pixels > 0 ? 1 : -1;
    let remaining = Math.abs(pixels);
    const totalPixels = remaining;

    // 5% chance to scroll past and scroll back ("human mistake")
    const willOvershoot = Math.random() < 0.05;

    while (remaining > 0) {
      // Acceleration phase (first 30%), constant (middle 40%), deceleration (last 30%)
      const progress = 1 - remaining / totalPixels;
      let speedMultiplier;

      if (progress < 0.3) {
        speedMultiplier = 0.3 + progress * 2.3; // Accelerate
      } else if (progress < 0.7) {
        speedMultiplier = 1.0; // Constant
      } else {
        speedMultiplier = 1.0 - (progress - 0.7) * 2.5; // Decelerate
        speedMultiplier = Math.max(speedMultiplier, 0.2);
      }

      const chunk = Math.min(
        remaining,
        Math.round(rand(40, 120) * speedMultiplier),
      );

      await page.mouse.wheel({ deltaY: chunk * direction });
      remaining -= chunk;
      await sleep(rand(15, 50));
    }

    // Overshoot + correction
    if (willOvershoot) {
      const extra = rand(80, 200);
      await page.mouse.wheel({ deltaY: extra * direction });
      await sleep(rand(300, 700));
      await page.mouse.wheel({ deltaY: -extra * direction });
      await sleep(rand(200, 500));
    }
  }

  /**
   * Add Gaussian jitter to a base duration.
   * @param {number} baseDuration - Base duration in ms
   * @returns {number} Jittered duration (always ≥ baseDuration * 0.3)
   */
  addJitter(baseDuration) {
    const jittered = Math.round(gaussianRandom(baseDuration, baseDuration * 0.2));
    return Math.max(Math.round(baseDuration * 0.3), jittered);
  }

  /**
   * Simulate reading: random micro-movements during a pause, as if scanning content.
   * @param {import('puppeteer').Page} page
   * @param {number} durationMs - How long to "read" in ms
   */
  async simulateReading(page, durationMs) {
    const startTime = Date.now();
    const baseX = this._lastMouseX ?? rand(400, 800);
    const baseY = this._lastMouseY ?? rand(300, 600);

    while (Date.now() - startTime < durationMs) {
      // Small random micro-movement (1-5 px)
      const dx = rand(-5, 5);
      const dy = rand(-5, 5);
      await page.mouse.move(baseX + dx, baseY + dy);
      await sleep(rand(200, 800));

      // Occasional small scroll (reading more)
      if (Math.random() < 0.2) {
        await page.mouse.wheel({ deltaY: rand(20, 80) });
        await sleep(rand(100, 300));
      }
    }
  }

  /**
   * Circadian activity intensity multipliers by hour (0-23).
   * Used by the Scheduler for human-like daily rhythm.
   * @returns {number[]} 24-element array of intensity multipliers (0.0-1.0)
   */
  getCircadianPattern() {
    return [
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
  }
}

export { AntiDetection };
