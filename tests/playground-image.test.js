// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The playground image carries only the source directories its Dockerfile
 * copies. When the client grew an import outside them, the container crashed at
 * start with ERR_MODULE_NOT_FOUND and nothing caught it before Cloud Run did.
 * This walks the import graph from playground/server.mjs and checks every file
 * it reaches is copied, and every package it needs is a playground dependency.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENTRY = path.join(ROOT, 'playground/server.mjs');

/** Packages imported only behind an optional path (a configured proxy). */
const OPTIONAL_PACKAGES = new Set(['undici']);

// Static imports are anchored to the start of a line, so example code held in
// a string (the query translator emits `import { Scraper } from 'xactions'`)
// is not mistaken for a real dependency.
const IMPORT_RE =
  /^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/gm;

/** Strip comments and template literals, which hold generated example code. */
const code = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``');

function importGraph(entry) {
  const files = new Set();
  const packages = new Set();
  const missing = [];
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    for (const m of code(fs.readFileSync(file, 'utf8')).matchAll(IMPORT_RE)) {
      const spec = m[1] || m[2] || m[3];
      if (spec.startsWith('.')) {
        let target = path.resolve(path.dirname(file), spec);
        if (!fs.existsSync(target) && fs.existsSync(`${target}.js`)) target = `${target}.js`;
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.js');
        if (fs.existsSync(target)) visit(target);
        else missing.push(`${path.relative(ROOT, file)} -> ${spec}`);
      } else if (!spec.startsWith('node:')) {
        packages.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
      }
    }
  };
  visit(entry);
  return { files: [...files].map((f) => path.relative(ROOT, f)), packages: [...packages], missing };
}

const dockerfile = fs.readFileSync(path.join(ROOT, 'playground/Dockerfile'), 'utf8');
const copied = [...dockerfile.matchAll(/^COPY\s+(?!--from)(\S+)\s+\S+/gm)].map((m) => m[1].replace(/\/$/, ''));
const graph = importGraph(ENTRY);

describe('playground image', () => {
  it('resolves every relative import from server.mjs', () => {
    expect(graph.missing).toEqual([]);
  });

  it('copies every source file server.mjs reaches', () => {
    const uncopied = graph.files.filter((file) => !copied.some((src) => file === src || file.startsWith(`${src}/`)));
    expect(uncopied, 'add a COPY line to playground/Dockerfile').toEqual([]);
  });

  it('declares every package server.mjs reaches', () => {
    const deps = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'playground/package.json'), 'utf8')).dependencies);
    const undeclared = graph.packages.filter((pkg) => !deps.includes(pkg) && !OPTIONAL_PACKAGES.has(pkg));
    expect(undeclared, 'add it to playground/package.json').toEqual([]);
  });
});
