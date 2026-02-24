/**
 * extractUserFromCell Test Suite
 *
 * Comprehensive tests for the core user extraction function used by
 * all XActions automation scripts. Because core.js is a browser script
 * that self-assigns to `window.XActions.Core`, we bootstrap a minimal
 * jsdom environment and eval the source so the real implementation runs
 * against our mock DOM structures.
 *
 * @author nichxbt
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Bootstrap: load core.js inside jsdom so we get the real implementation
// ---------------------------------------------------------------------------

let extractUserFromCell;
let parseCount;

beforeAll(() => {
  const coreSource = readFileSync(
    resolve(__dirname, '..', 'src', 'automation', 'core.js'),
    'utf-8',
  );

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://x.com',
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // Provide globals that core.js expects
  global.window = window;
  global.document = window.document;
  global.localStorage = (() => {
    const store = {};
    return {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i],
    };
  })();
  global.InputEvent = window.InputEvent || Event;
  global.console = { ...console, log: vi.fn() }; // silence core.js logs

  // Evaluate core.js in the jsdom context
  window.eval(coreSource);

  extractUserFromCell = window.XActions.Core.extractUserFromCell;
  parseCount = window.XActions.Core.parseCount;
});

// ---------------------------------------------------------------------------
// DOM helpers — build realistic Twitter UserCell fragments
// ---------------------------------------------------------------------------

/**
 * Create a mock UserCell element and insert it into the document so
 * querySelector / querySelectorAll work as expected.
 */
function createCell(innerHTML) {
  const cell = document.createElement('div');
  cell.setAttribute('data-testid', 'UserCell');
  cell.innerHTML = innerHTML;
  document.body.appendChild(cell);
  return cell;
}

/** Remove all cells from the document after each suite */
function cleanup() {
  document.body.innerHTML = '';
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('extractUserFromCell', () => {

  // =========================================================================
  // 1. Happy path
  // =========================================================================
  describe('Happy path — full UserCell', () => {
    let result;

    beforeAll(() => {
      cleanup();
      const cell = createCell(`
        <a href="/johndoe" role="link">
          <div data-testid="User-Name">
            <span>John Doe</span>
            <span>@johndoe</span>
          </div>
        </a>
        <div data-testid="UserDescription">Full-stack dev. Building cool stuff 🚀</div>
        <span>1.5K Followers</span>
        <button data-testid="user-unfollow">Following</button>
        <div data-testid="userFollowIndicator">Follows you</div>
        <svg data-testid="icon-verified"></svg>
      `);
      result = extractUserFromCell(cell);
    });

    it('extracts username', () => {
      expect(result.username).toBe('johndoe');
    });

    it('extracts display name', () => {
      expect(result.displayName).toBe('John Doe');
    });

    it('extracts bio via data-testid strategy', () => {
      expect(result.bio).toBe('Full-stack dev. Building cool stuff 🚀');
    });

    it('parses follower count', () => {
      expect(result.followers).toBe(1500);
    });

    it('detects isFollowing', () => {
      expect(result.isFollowing).toBe(true);
    });

    it('detects followsYou', () => {
      expect(result.followsYou).toBe(true);
    });

    it('detects isVerified', () => {
      expect(result.isVerified).toBe(true);
    });

    it('reports _meta.bioStrategy as testid', () => {
      expect(result._meta.bioStrategy).toBe('testid');
    });

    it('reports _meta.nameStrategy as testid', () => {
      expect(result._meta.nameStrategy).toBe('testid');
    });
  });

  // =========================================================================
  // 2. Bio fallback Strategy 2: dir="auto" without data-testid
  // =========================================================================
  describe('Bio fallback Strategy 2 — dir="auto" without data-testid', () => {
    let result;

    beforeAll(() => {
      cleanup();
      const cell = createCell(`
        <a href="/alice"><span>Alice</span></a>
        <div dir="auto">Passionate about machine learning and open source contributions</div>
      `);
      result = extractUserFromCell(cell);
    });

    it('extracts bio via dir="auto" fallback', () => {
      expect(result.bio).toBe('Passionate about machine learning and open source contributions');
    });

    it('reports _meta.bioStrategy as fallback', () => {
      expect(result._meta.bioStrategy).toBe('fallback');
    });
  });

  // =========================================================================
  // 3. Bio fallback Strategy 3: dir="auto" without role
  // =========================================================================
  describe('Bio fallback Strategy 3 — dir="auto":not([role]) outside links', () => {
    let result;

    beforeAll(() => {
      cleanup();
      // Strategy 2 won't match because the only dir="auto" element has
      // a data-testid, so Strategy 3 kicks in with the second element.
      const cell = createCell(`
        <a href="/bob"><span>Bob Builder</span></a>
        <div dir="auto" data-testid="something">Short</div>
        <div dir="auto">This bio is extracted using strategy three because the first candidate was skipped</div>
      `);
      result = extractUserFromCell(cell);
    });

    it('extracts bio from strategy 3 candidate', () => {
      expect(result.bio).toContain('strategy three');
    });

    it('reports fallback strategy', () => {
      expect(result._meta.bioStrategy).toBe('fallback');
    });
  });

  // =========================================================================
  // 4. Bio fallback Strategy 4: span iteration
  // =========================================================================
  describe('Bio fallback Strategy 4 — span iteration', () => {
    let result;

    beforeAll(() => {
      cleanup();
      // No dir="auto" elements at all; the only bio text is inside a plain span
      const cell = createCell(`
        <a href="/charlie"><span>Charlie</span></a>
        <span>@charlie</span>
        <span>This is a longer biography written inside a span element for testing</span>
      `);
      result = extractUserFromCell(cell);
    });

    it('extracts bio from span iteration', () => {
      expect(result.bio).toContain('longer biography');
    });

    it('reports fallback strategy', () => {
      expect(result._meta.bioStrategy).toBe('fallback');
    });
  });

  // =========================================================================
  // 5. No bio at all
  // =========================================================================
  describe('No bio at all', () => {
    let result;

    beforeAll(() => {
      cleanup();
      const cell = createCell(`
        <a href="/nobio"><span>NoBio</span></a>
        <span>@nobio</span>
      `);
      result = extractUserFromCell(cell);
    });

    it('returns empty string for bio', () => {
      expect(result.bio).toBe('');
    });

    it('reports _meta.bioStrategy as none', () => {
      expect(result._meta.bioStrategy).toBe('none');
    });
  });

  // =========================================================================
  // 6. Username extraction — various href formats
  // =========================================================================
  describe('Username extraction', () => {
    afterEach(() => cleanup());

    it('extracts from simple /<username> href', () => {
      const cell = createCell('<a href="/janedoe"></a>');
      expect(extractUserFromCell(cell).username).toBe('janedoe');
    });

    it('extracts from nested path /<username>/followers via fallback', () => {
      const cell = createCell('<a href="/janedoe/followers"></a>');
      expect(extractUserFromCell(cell).username).toBe('janedoe');
    });

    it('lowercases username', () => {
      const cell = createCell('<a href="/CamelCase"></a>');
      expect(extractUserFromCell(cell).username).toBe('camelcase');
    });

    it('returns empty username when no links exist', () => {
      const cell = createCell('<span>Just text</span>');
      expect(extractUserFromCell(cell).username).toBe('');
    });
  });

  // =========================================================================
  // 7. System paths filtered
  // =========================================================================
  describe('System paths filtered from username', () => {
    afterEach(() => cleanup());

    const systemPaths = ['/i/flow', '/search/advanced', '/explore', '/settings/profile', '/messages'];

    systemPaths.forEach((path) => {
      it(`filters out ${path}`, () => {
        const cell = createCell(`<a href="${path}"></a>`);
        const result = extractUserFromCell(cell);
        expect(result.username).toBe('');
      });
    });
  });

  // =========================================================================
  // 8. Follower count parsing
  // =========================================================================
  describe('Follower count parsing', () => {
    afterEach(() => cleanup());

    const cases = [
      ['1.5K Followers', 1500],
      ['1,234 Followers', 1234],
      ['2M Followers', 2000000],
      ['3.2B Followers', 3200000000],
      ['500 Followers', 500],
      ['12 Followers', 12],
    ];

    cases.forEach(([text, expected]) => {
      it(`parses "${text}" as ${expected}`, () => {
        const cell = createCell(`<a href="/user"></a><span>${text}</span>`);
        expect(extractUserFromCell(cell).followers).toBe(expected);
      });
    });

    it('returns 0 when no follower text present', () => {
      const cell = createCell('<a href="/user"></a>');
      expect(extractUserFromCell(cell).followers).toBe(0);
    });
  });

  // =========================================================================
  // 9. Flags detection
  // =========================================================================
  describe('Flags', () => {
    afterEach(() => cleanup());

    it('detects isFollowing when unfollow button present', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <button data-testid="user-unfollow">Following</button>
      `);
      expect(extractUserFromCell(cell).isFollowing).toBe(true);
    });

    it('isFollowing false when no unfollow button', () => {
      const cell = createCell('<a href="/user"></a>');
      expect(extractUserFromCell(cell).isFollowing).toBe(false);
    });

    it('detects followsYou', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <div data-testid="userFollowIndicator">Follows you</div>
      `);
      expect(extractUserFromCell(cell).followsYou).toBe(true);
    });

    it('detects isVerified by data-testid', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <svg data-testid="icon-verified"></svg>
      `);
      expect(extractUserFromCell(cell).isVerified).toBe(true);
    });

    it('detects isVerified by aria-label', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <svg aria-label="Verified account"></svg>
      `);
      expect(extractUserFromCell(cell).isVerified).toBe(true);
    });

    it('detects isProtected', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <svg data-testid="icon-lock"></svg>
      `);
      expect(extractUserFromCell(cell).isProtected).toBe(true);
    });

    it('all flags false by default', () => {
      const cell = createCell('<a href="/user"></a>');
      const result = extractUserFromCell(cell);
      expect(result.isFollowing).toBe(false);
      expect(result.followsYou).toBe(false);
      expect(result.isVerified).toBe(false);
      expect(result.isProtected).toBe(false);
    });
  });

  // =========================================================================
  // 10. Null safety
  // =========================================================================
  describe('Null safety', () => {
    it('returns null for null input', () => {
      expect(extractUserFromCell(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(extractUserFromCell(undefined)).toBeNull();
    });

    it('handles empty cell gracefully', () => {
      cleanup();
      const cell = createCell('');
      const result = extractUserFromCell(cell);
      expect(result).toBeDefined();
      expect(result.username).toBe('');
      expect(result.bio).toBe('');
    });

    it('handles cell with only whitespace text', () => {
      cleanup();
      const cell = createCell('   \n   ');
      const result = extractUserFromCell(cell);
      expect(result).toBeDefined();
      expect(result.username).toBe('');
    });
  });

  // =========================================================================
  // 11. _meta tracking
  // =========================================================================
  describe('_meta tracking', () => {
    afterEach(() => cleanup());

    it('bioStrategy is "testid" when UserDescription exists', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <div data-testid="UserDescription">A bio that came from the testid element</div>
      `);
      expect(extractUserFromCell(cell)._meta.bioStrategy).toBe('testid');
    });

    it('bioStrategy is "fallback" when bio found by other strategy', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <div dir="auto">A long fallback bio that has more than ten characters</div>
      `);
      expect(extractUserFromCell(cell)._meta.bioStrategy).toBe('fallback');
    });

    it('bioStrategy is "none" when no bio found', () => {
      const cell = createCell('<a href="/user"></a>');
      expect(extractUserFromCell(cell)._meta.bioStrategy).toBe('none');
    });

    it('nameStrategy is "testid" when User-Name testid exists', () => {
      const cell = createCell(`
        <a href="/user">
          <div data-testid="User-Name"><span>Name</span></div>
        </a>
      `);
      expect(extractUserFromCell(cell)._meta.nameStrategy).toBe('testid');
    });

    it('nameStrategy is "fallback" when display name found another way', () => {
      const cell = createCell(`
        <a href="/user"><div dir="ltr"><span>Name Via LTR</span></div></a>
      `);
      expect(extractUserFromCell(cell)._meta.nameStrategy).toBe('fallback');
    });

    it('nameStrategy is "none" when no display name resolved at all', () => {
      // Create a cell with only a system path link (no username, no spans)
      const cell = createCell('<a href="/i/flow"></a>');
      // username is empty, displayName falls back to username ("")
      // Since nameTestId is null and displayName is empty string (falsy),
      // nameStrategy should be 'none'
      expect(extractUserFromCell(cell)._meta.nameStrategy).toBe('none');
    });
  });

  // =========================================================================
  // 12. Display name cascading
  // =========================================================================
  describe('Display name cascading', () => {
    afterEach(() => cleanup());

    it('prefers data-testid="User-Name" strategy', () => {
      const cell = createCell(`
        <a href="/user">
          <div data-testid="User-Name">
            <span>TestID Name</span>
            <span>@user</span>
          </div>
          <div dir="ltr"><span>LTR Name</span></div>
        </a>
      `);
      expect(extractUserFromCell(cell).displayName).toBe('TestID Name');
    });

    it('falls back to dir="ltr" > span', () => {
      const cell = createCell(`
        <a href="/user">
          <div dir="ltr"><span>LTR Display</span></div>
        </a>
      `);
      expect(extractUserFromCell(cell).displayName).toBe('LTR Display');
    });

    it('falls back to first non-@ span with reasonable length', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <span>@user</span>
        <span>Span Name</span>
      `);
      expect(extractUserFromCell(cell).displayName).toBe('Span Name');
    });

    it('uses username when no display name found', () => {
      const cell = createCell(`
        <a href="/someone"></a>
        <span>@someone</span>
      `);
      expect(extractUserFromCell(cell).displayName).toBe('someone');
    });

    it('skips @-prefixed spans in User-Name', () => {
      const cell = createCell(`
        <div data-testid="User-Name">
          <span>@handle</span>
          <span>Real Name</span>
        </div>
        <a href="/handle"></a>
      `);
      expect(extractUserFromCell(cell).displayName).toBe('Real Name');
    });
  });

  // =========================================================================
  // 13. Bio text validation — rejects bad candidates
  // =========================================================================
  describe('Bio text validation', () => {
    afterEach(() => cleanup());

    it('rejects @-prefixed text in dir="auto" fallback', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <div dir="auto">@username</div>
      `);
      expect(extractUserFromCell(cell).bio).toBe('');
    });

    it('rejects short text (<10 chars) in dir="auto" fallback', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <div dir="auto">Too short</div>
      `);
      expect(extractUserFromCell(cell).bio).toBe('');
    });

    it('rejects text matching display name in dir="auto" fallback', () => {
      const cell = createCell(`
        <a href="/user">
          <div data-testid="User-Name"><span>Samantha</span></div>
        </a>
        <div dir="auto">Samantha</div>
      `);
      expect(extractUserFromCell(cell).bio).toBe('');
    });

    it('rejects follower count patterns in span iteration (strategy 4)', () => {
      const cell = createCell(`
        <a href="/user"></a>
        <span>1,234 Followers</span>
        <span>567 Following</span>
      `);
      expect(extractUserFromCell(cell).bio).toBe('');
    });

    it('rejects spans inside links in strategy 4', () => {
      const cell = createCell(`
        <a href="/user"><span>This is a longer span but it is inside a link element</span></a>
      `);
      // The span is inside a link, so strategy 4 skips it
      expect(extractUserFromCell(cell).bio).toBe('');
    });
  });

  // =========================================================================
  // 14. parseCount helper
  // =========================================================================
  describe('parseCount', () => {
    it('parses plain numbers', () => {
      expect(parseCount('500')).toBe(500);
    });

    it('strips commas', () => {
      expect(parseCount('1,234')).toBe(1234);
    });

    it('handles K suffix', () => {
      expect(parseCount('1.5K')).toBe(1500);
    });

    it('handles M suffix', () => {
      expect(parseCount('2M')).toBe(2000000);
    });

    it('handles B suffix', () => {
      expect(parseCount('3.2B')).toBe(3200000000);
    });

    it('returns 0 for null/undefined', () => {
      expect(parseCount(null)).toBe(0);
      expect(parseCount(undefined)).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(parseCount('')).toBe(0);
    });
  });

  // =========================================================================
  // 15. Realistic full Twitter cell
  // =========================================================================
  describe('Realistic Twitter UserCell', () => {
    let result;

    beforeAll(() => {
      cleanup();
      const cell = createCell(`
        <div class="css-175oi2r r-18u37iz r-1q142lx">
          <div data-testid="UserAvatar-Container">
            <a href="/elonmusk" role="link" class="css-175oi2r">
              <img src="https://pbs.twimg.com/profile_images/avatar.jpg" alt="" />
            </a>
          </div>
          <div class="css-175oi2r r-1iusvr4 r-16y2uov">
            <div data-testid="User-Name">
              <div class="css-175oi2r r-1awozwy r-18u37iz r-1wbh5a2">
                <a href="/elonmusk" role="link">
                  <div dir="ltr"><span class="css-1jxf684">Elon Musk</span></div>
                </a>
                <svg data-testid="icon-verified" viewBox="0 0 22 22"><path d="..."></path></svg>
              </div>
              <div class="css-175oi2r r-1awozwy r-18u37iz r-1wbh5a2">
                <a href="/elonmusk" role="link">
                  <div dir="ltr"><span class="css-1jxf684">@elonmusk</span></div>
                </a>
                <div data-testid="userFollowIndicator">
                  <span class="css-1jxf684">Follows you</span>
                </div>
              </div>
            </div>
            <div data-testid="UserDescription">
              <span dir="auto">Mars & Cars, Chips & Dips</span>
            </div>
            <div>
              <span>180.5M Followers</span>
            </div>
          </div>
        </div>
      `);
      result = extractUserFromCell(cell);
    });

    it('extracts username from realistic cell', () => {
      expect(result.username).toBe('elonmusk');
    });

    it('extracts display name from nested structure', () => {
      expect(result.displayName).toBe('Elon Musk');
    });

    it('extracts bio from UserDescription', () => {
      expect(result.bio).toBe('Mars & Cars, Chips & Dips');
    });

    it('parses large follower count', () => {
      expect(result.followers).toBe(180500000);
    });

    it('detects verified badge', () => {
      expect(result.isVerified).toBe(true);
    });

    it('detects follows you indicator', () => {
      expect(result.followsYou).toBe(true);
    });
  });
});
