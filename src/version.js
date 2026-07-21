// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Single source of truth for the package version.
 *
 * Read from package.json at runtime so `xactions --version`, the MCP server
 * handshake, and the A2A agent card can never drift from the published
 * version again (they were pinned at 3.0.0 / 3.1.0 / 3.1.0 while npm served
 * 3.4.0). package.json is always present in the published tarball.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');

export const VERSION = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
export default VERSION;
