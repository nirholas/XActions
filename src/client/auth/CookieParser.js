/**
 * XActions Client — Cookie Parser
 *
 * Parse Set-Cookie headers from HTTP responses and update the CookieJar.
 * Handles Twitter's cookie format for auth_token, ct0, twid, etc.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

/**
 * Parse a single Set-Cookie header string into a cookie object.
 *
 * @param {string} header - A single Set-Cookie header value
 * @returns {{ name: string, value: string, domain?: string, path?: string, expires?: Date|null, httpOnly?: boolean, secure?: boolean, sameSite?: string }|null}
 */
export function parseSetCookieHeader(header) {
  if (!header || typeof header !== 'string') return null;

  const parts = header.split(';').map((p) => p.trim());
  if (parts.length === 0) return null;

  // First part is name=value
  const firstPart = parts[0];
  const eqIndex = firstPart.indexOf('=');
  if (eqIndex === -1) return null;

  const name = firstPart.slice(0, eqIndex).trim();
  const value = firstPart.slice(eqIndex + 1).trim();
  if (!name) return null;

  const cookie = {
    name,
    value,
    domain: '.x.com',
    path: '/',
    expires: null,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  };

  // Parse attributes
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const attrEq = part.indexOf('=');
    let attrName, attrValue;

    if (attrEq === -1) {
      attrName = part.trim().toLowerCase();
      attrValue = '';
    } else {
      attrName = part.slice(0, attrEq).trim().toLowerCase();
      attrValue = part.slice(attrEq + 1).trim();
      // Remove surrounding quotes
      if (attrValue.startsWith('"') && attrValue.endsWith('"')) {
        attrValue = attrValue.slice(1, -1);
      }
    }

    switch (attrName) {
      case 'domain':
        cookie.domain = attrValue;
        break;
      case 'path':
        cookie.path = attrValue;
        break;
      case 'expires': {
        const d = new Date(attrValue);
        if (!isNaN(d.getTime())) cookie.expires = d;
        break;
      }
      case 'max-age': {
        const seconds = parseInt(attrValue, 10);
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
        cookie.sameSite = attrValue || 'Lax';
        break;
    }
  }

  return cookie;
}

/**
 * Parse multiple Set-Cookie headers.
 *
 * @param {string[]} headers - Array of Set-Cookie header strings
 * @returns {Array<Object>} Parsed cookies
 */
export function parseSetCookieHeaders(headers) {
  if (!Array.isArray(headers)) return [];
  return headers.map(parseSetCookieHeader).filter(Boolean);
}

/**
 * Update a CookieJar from a fetch Response's Set-Cookie headers.
 * Critical: call this after every Twitter API request to keep ct0 current.
 *
 * @param {import('./CookieJar.js').CookieJar} jar
 * @param {Response} response - Fetch Response object
 */
export function updateJarFromResponse(jar, response) {
  if (!response || !response.headers) return;

  // Try to get Set-Cookie headers
  // Note: fetch() may not expose Set-Cookie in browser contexts,
  // but in Node.js (undici) they are accessible.
  let setCookieHeaders = [];

  // Method 1: getSetCookie() — available in Node.js 18.14.1+
  if (typeof response.headers.getSetCookie === 'function') {
    setCookieHeaders = response.headers.getSetCookie();
  }
  // Method 2: raw headers (undici)
  else if (response.headers.raw && typeof response.headers.raw === 'function') {
    setCookieHeaders = response.headers.raw()['set-cookie'] || [];
  }
  // Method 3: get() — returns concatenated value (less reliable)
  else {
    const header = response.headers.get('set-cookie');
    if (header) {
      // Split on comma but be careful with expires dates containing commas
      setCookieHeaders = splitSetCookieString(header);
    }
  }

  const cookies = parseSetCookieHeaders(setCookieHeaders);
  for (const cookie of cookies) {
    jar.set(cookie);
  }
}

/**
 * Split a concatenated Set-Cookie header string that may contain commas.
 * Handles the case where expires contains commas like "Thu, 01 Jan 2026 00:00:00 GMT".
 *
 * @param {string} header
 * @returns {string[]}
 */
function splitSetCookieString(header) {
  const cookies = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < header.length; i++) {
    const char = header[i];

    if (char === ',' && depth === 0) {
      // Check if this comma is inside an expires date
      // Dates look like: "Thu, 01 Jan ..." — if the next chars look like a new cookie, split
      const rest = header.slice(i + 1).trimStart();
      // A new cookie starts with a token followed by =
      if (/^[a-zA-Z_][a-zA-Z0-9_.-]*\s*=/.test(rest)) {
        cookies.push(current.trim());
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    cookies.push(current.trim());
  }

  return cookies;
}

/**
 * Extract the CSRF token (ct0) from a CookieJar.
 *
 * @param {import('./CookieJar.js').CookieJar} jar
 * @returns {string|null}
 */
export function extractCsrfToken(jar) {
  return jar.getValue('ct0') || null;
}

/**
 * Extract the user ID from the twid cookie.
 * twid format: "u%3D1234567890" → "1234567890"
 *
 * @param {import('./CookieJar.js').CookieJar} jar
 * @returns {string|null}
 */
export function extractUserId(jar) {
  const twid = jar.getValue('twid');
  if (!twid) return null;
  try {
    const decoded = decodeURIComponent(twid);
    const match = decoded.match(/u=(\d+)/);
    return match ? match[1] : null;
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
  return jar.getValue('auth_token') || null;
}
