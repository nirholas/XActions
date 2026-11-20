// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tells a Node program apart from a browser console script.
 *
 * The site publishes browser/, scripts/ and src/automation/ files as "paste
 * this into DevTools on x.com". Those directories also hold Node tools (build
 * and audit scripts, modules that read the filesystem), which cannot run in a
 * browser console, so the page and Ask builders use this check to leave them out.
 *
 * @author nich (@nichxbt)
 */

const NODE_SIGNS = [
  /^#!.*\bnode\b/m,
  /^\s*import\b[^;]*?from\s+['"](?:node:[\w/]+|fs|fs\/promises|path|os|url|child_process|http|https|crypto|stream|readline)['"]/m,
  /\brequire\(\s*['"](?:node:[\w/]+|fs|path|os|child_process)['"]\s*\)/,
  /\bprocess\.(?:argv|exit|env)\b/,
  /\bimport\.meta\.url\b/,
];

/**
 * @param {string} code - The file's source text.
 * @returns {boolean} True when the file is a Node program.
 */
export function isNodeProgram(code) {
  return NODE_SIGNS.some((re) => re.test(code));
}
