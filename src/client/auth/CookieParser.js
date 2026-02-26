/**
 * XActions Client — Cookie Parser
 * Parses Set-Cookie headers from HTTP responses and updates the CookieJar.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

/**
 * Parse a single Set-Cookie header value.
 *
 * @param {string} header - Raw Set-Cookie header string
 * @returns {import('./CookieJar.js').Cookie|null}
 */
export function parseSetCookieHeader(header) {
  if (!header || typeof header !== 'string') return null;

  const parts = header.split(';').map((p) => p.trim());
  if (parts.length === 0) return null;

  // First part is name=value
  const firstEq = parts[0].indexOf('=');
  if (firstEq === -1) return null;

  const name = parts[0].slice(0, firstEq).trim();
  const value = parts[0].slice(firstEq + 1).trim().replace(/^"(.*)"$/, '$1');

  if (!name) return null;

  /** @type {import('./CookieJar.js').Cookie} */
  const cookie = {
    name,
    value,
    domain: '.x.com',
    path: '/',
    expires: null,
    httpOnly: false,
    secure: false,
    sameSite: 'None',
  };

  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i];
    const eqIdx = attr.indexOf('=');
    const key = (eqIdx === -1 ? attr : attr.slice(0, eqIdx)).trim().toLowerCase();
    const val = eqIdx === -1 ? '' : attr.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, '$1');

    switch (key) {
      case 'domain':
        cookie.domain = val.startsWith('.') ? val : '.' + val;
        break;
      case 'path':
        cookie.path = val || '/';
        break;
      case 'expires': {
        const d = new Date(val);
        if (!isNaN(d.getTime())) cookie.expires = d;
        break;
      }
      case 'max-age': {
        const seconds = parseInt(val, 10);
        if (!isNaN(seconds)) {
          cookie.expires = new Date(Date.now() + seconds * 1000);
        }
        break;
      }
      case 'httponly':
        cookie.httpOnly = true;
        break;
      case 'secure':
        cookie.secure = true;
        break;
      case 'samesite':
        cookie.sameSite = val || 'None';
        break;
    }
  }

  return cookie;
}

/**
 * Parse multiple Set-Cookie headers.
 *
 * @param {string[]} headers - Array of raw Set-Cookie header strings
 * @returns {import('./CookieJar.js').Cookie[]}
 */
export function parseSetCookieHeaders(headers) {
  if (!Array.isArray(headers)) return [];
  return headers.map(parseSetCookieHeader).filter(Boolean);
}

/**
 * Update a CookieJar with cookies from an HTTP Response.
 * Extracts Set-Cookie headers and updates/adds cookies.
 *
 * Note: Node.js fetch (undici) exposes Set-Cookie via getSetCookie().
 * Standard fetch does NOT expose Set-Cookie from response.headers.get().
 *
 * @param {import('./CookieJar.js').CookieJar} jar - CookieJar to update
 * @param {Response} response - Fetch Response object
 */
export function updateJarFromResponse(jar, response) {
  if (!jar || !response) return;

  let setCookieHeaders = [];

  // Node.js undici / modern runtimes expose getSetCookie()
  if (typeof response.headers.getSetCookie === 'function') {
    setCookieHeaders = response.headers.getSetCookie();
  } else {
    // Fallback: try raw header (may be concatenated)
    const raw = response.headers.get('set-cookie');
    if (raw) {
      // Multiple Set-Cookie headers are sometimes joined by comma
      // but cookies can contain commas in expires, so split carefully
      setCookieHeaders = splitSetCookieString(raw);
    }
  }

  const cookies = parseSetCookieHeaders(setCookieHeaders);
  for (const cookie of cookies) {
    jar.set(cookie);
  }
}

/**
 * Split a concatenated set-cookie string back into individual headers.
 * Handles commas in expires dates.
 *
 * @param {string} combined - Combined set-cookie string
 * @returns {string[]}
 */
function splitSetCookieString(combined) {
  if (!combined) return [];
  const result = [];
  let current = '';
  const parts = combined.split(',');

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    // Check if this looks like it starts a new cookie (has name=value before any ;)
    if (current && /^[^;=]+=/.test(part) && !/^\s*\d{2}\s/.test(part)) {
      result.push(current.trim());
      current = part;
    } else {
      current += (current ? ',' : '') + part;
    }
  }
  if (current) result.push(current.trim());
  return result;
}

/**
 * Extract the CSRF token (ct0 cookie value) from a CookieJar.
 *
 * @param {import('./CookieJar.js').CookieJar} jar
 * @returns {string|null}
 */
export function extractCsrfToken(jar) {
  return jar ? jar.getValue('ct0') : null;
}

/**
 * Extract the user ID from the twid cookie.
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
 * Extract the auth_token cookie value.
 *
 * @param {import('./CookieJar.js').CookieJar} jar
 * @returns {string|null}
 */
export function extractAuthToken(jar) {
  return jar ? jar.getValue('auth_token') : null;
}
