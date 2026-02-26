/**
 * XActions Client — Cookie Parser
 *
 * Parses Set-Cookie headers from HTTP responses and updates the CookieJar.
 * Also provides helper functions to extract critical Twitter tokens (ct0, twid, auth_token).
 *
 * Note: Node.js fetch() does NOT expose Set-Cookie headers by default for security.
 * Use response.headers.getSetCookie() (Node 18.14+) or undici which does expose them.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Parse a single Set-Cookie header
// ============================================================================

/**
 * Parse a single Set-Cookie header value into a Cookie object.
 *
 * @param {string} header - A single Set-Cookie header string
 * @returns {{ name: string, value: string, domain?: string, path?: string, expires?: Date|null, httpOnly?: boolean, secure?: boolean, sameSite?: string }|null}
 */
export function parseSetCookieHeader(header) {
  if (!header || typeof header !== 'string') return null;

  const parts = header.split(';').map((s) => s.trim());
  if (parts.length === 0) return null;

  // First part is name=value
  const mainPart = parts[0];
  const eqIndex = mainPart.indexOf('=');
  if (eqIndex === -1) return null;

  const name = mainPart.slice(0, eqIndex).trim();
  // Handle quoted values
  let value = mainPart.slice(eqIndex + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }

  if (!name) return null;

  /** @type {any} */
  const cookie = {
    name,
    value,
    domain: undefined,
    path: undefined,
    expires: null,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  };

  // Parse attributes (case-insensitive)
  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i];
    const attrEq = attr.indexOf('=');

    if (attrEq === -1) {
      // Flag attribute (no value)
      const flag = attr.toLowerCase();
      if (flag === 'httponly') cookie.httpOnly = true;
      else if (flag === 'secure') cookie.secure = true;
      continue;
    }

    const attrName = attr.slice(0, attrEq).trim().toLowerCase();
    const attrValue = attr.slice(attrEq + 1).trim();

    switch (attrName) {
      case 'domain':
        cookie.domain = attrValue;
        break;
      case 'path':
        cookie.path = attrValue;
        break;
      case 'expires':
        try {
          const date = new Date(attrValue);
          if (!isNaN(date.getTime())) {
            cookie.expires = date;
          }
        } catch {
          // Ignore invalid dates
        }
        break;
      case 'max-age': {
        const seconds = parseInt(attrValue, 10);
        if (!isNaN(seconds)) {
          cookie.expires = new Date(Date.now() + seconds * 1000);
        }
        break;
      }
      case 'samesite':
        cookie.sameSite = attrValue;
        break;
    }
  }

  return cookie;
}

// ============================================================================
// Parse multiple Set-Cookie headers
// ============================================================================

/**
 * Parse multiple Set-Cookie headers into an array of Cookie objects.
 *
 * @param {string[]} headers - Array of Set-Cookie header strings
 * @returns {Array<{ name: string, value: string, domain?: string, path?: string, expires?: Date|null, httpOnly?: boolean, secure?: boolean, sameSite?: string }>}
 */
export function parseSetCookieHeaders(headers) {
  if (!Array.isArray(headers)) return [];
  return headers.map(parseSetCookieHeader).filter(Boolean);
}

// ============================================================================
// Update CookieJar from a fetch Response
// ============================================================================

/**
 * Extract Set-Cookie headers from a fetch Response and update the CookieJar.
 * Critical: call this after every Twitter API request to keep ct0 current.
 *
 * @param {import('./CookieJar.js').CookieJar} jar - The CookieJar to update
 * @param {Response} response - The fetch Response object
 */
export function updateJarFromResponse(jar, response) {
  if (!jar || !response) return;

  let setCookies = [];

  // Modern Node.js (18.14+): response.headers.getSetCookie()
  if (typeof response.headers?.getSetCookie === 'function') {
    setCookies = response.headers.getSetCookie();
  } else if (typeof response.headers?.get === 'function') {
    // Fallback: some runtimes combine Set-Cookie into a single header
    const raw = response.headers.get('set-cookie');
    if (raw) {
      // Split on comma that's followed by a cookie name pattern (name=)
      // This is fragile but works for Twitter's cookies
      setCookies = raw.split(/,(?=\s*[a-zA-Z_][a-zA-Z0-9_]*=)/);
    }
  }

  if (setCookies.length === 0) return;

  const parsed = parseSetCookieHeaders(setCookies);
  for (const cookie of parsed) {
    jar.set(cookie);
  }
}

// ============================================================================
// Token / ID Extraction Helpers
// ============================================================================

/**
 * Extract the CSRF token (ct0 cookie value) from a CookieJar.
 *
 * @param {import('./CookieJar.js').CookieJar} jar
 * @returns {string|null}
 */
export function extractCsrfToken(jar) {
  if (!jar) return null;
  return jar.getValue('ct0') || null;
}

/**
 * Extract the authenticated user ID from the twid cookie.
 * twid format: "u%3D1234567890" → decodeURIComponent → "u=1234567890" → "1234567890"
 *
 * @param {import('./CookieJar.js').CookieJar} jar
 * @returns {string|null}
 */
export function extractUserId(jar) {
  if (!jar) return null;
  const twid = jar.getValue('twid');
  if (!twid) return null;

  try {
    const decoded = decodeURIComponent(twid);
    return decoded.replace('u=', '');
  } catch {
    return null;
  }
}

/**
 * Extract the auth_token cookie value from a CookieJar.
 *
 * @param {import('./CookieJar.js').CookieJar} jar
 * @returns {string|null}
 */
export function extractAuthToken(jar) {
  if (!jar) return null;
  return jar.getValue('auth_token') || null;
}
