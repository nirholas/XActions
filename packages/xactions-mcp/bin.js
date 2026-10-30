#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions MCP Server — thin wrapper package
// This makes `npx xactions-mcp` work by delegating to the xactions package.
// by nichxbt

import { createRequire } from 'module';
import { pathToFileURL } from 'url';

// Resolve the MCP server entry point from the xactions package
const require = createRequire(import.meta.url);
const serverPath = require.resolve('xactions/mcp');

// The server only starts itself when it is the process entry point, and here
// this file is, so importing it is not enough: run its main() explicitly.
const { main } = await import(pathToFileURL(serverPath).href);
try {
  await main();
} catch (error) {
  console.error('❌ Fatal error:', error.message);
  if (process.env.DEBUG) console.error(error.stack);
  process.exit(1);
}
