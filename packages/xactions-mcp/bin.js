#!/usr/bin/env node
// XActions MCP Server — thin wrapper package
// This makes `npx xactions-mcp` work by delegating to the xactions package.
// by nichxbt

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

// Resolve the MCP server entry point from the xactions package
const require = createRequire(import.meta.url);
const serverPath = require.resolve('xactions/mcp');

// Import and run the MCP server (it self-starts via main())
await import(pathToFileURL(serverPath).href);
