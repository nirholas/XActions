// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: signatures in types/index.d.ts that had drifted from the runtime,
 * and the "types" condition that lets TypeScript find them under "exports".
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dts = readFileSync(path.join(root, 'types/index.d.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const { signWebhookBody } = await import('../../src/notifications/webhook.js');
const { listPlugins, getPluginScrapers, getPluginActions } = await import('../../src/plugins/index.js');

describe('declaration signatures match the runtime', () => {
  it('signWebhookBody takes the timestamp it signs', () => {
    expect(signWebhookBody.length).toBe(3);
    expect(dts).toMatch(/export function signWebhookBody\(rawBody: string \| Buffer, secret: string, timestamp: number \| string\): string;/);
  });

  it('listPlugins is async and the plugin getters return arrays', async () => {
    expect(listPlugins()).toBeInstanceOf(Promise);
    expect(dts).toMatch(/export function listPlugins\(\): Promise<PluginInfo\[\]>;/);
    expect(Array.isArray(getPluginScrapers())).toBe(true);
    expect(Array.isArray(getPluginActions())).toBe(true);
    expect(dts).toMatch(/export function getPluginScrapers\(\): Array</);
    expect(dts).toMatch(/export function getPluginActions\(\): Array</);
  });
});

describe('package.json exports', () => {
  it('points TypeScript at the declarations from the root export, types first', () => {
    const root = pkg.exports['.'];
    expect(Object.keys(root)[0]).toBe('types');
    expect(root.types).toBe('./types/index.d.ts');
    expect(root.default).toBe('./src/index.js');
  });
});
