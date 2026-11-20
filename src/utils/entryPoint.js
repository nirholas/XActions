// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Is a module the process entry point?
 *
 * Modules that double as a script guard their startup code with this, so that
 * importing them (from the CLI, the API server, a test or a user's own script)
 * never runs a wizard, opens a port or calls process.exit in someone else's
 * process.
 *
 * The comparison is on real paths. A name test such as
 * `process.argv[1].endsWith('setup.js')` is wrong both ways: it fires for any
 * unrelated script that happens to share the name, and it never fires for an
 * npm bin, because `process.argv[1]` is then the symlink in node_modules/.bin
 * while `import.meta.url` is the real file.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * @param {string} moduleUrl - The caller's `import.meta.url`
 * @param {string} [argv1=process.argv[1]] - The script path node was started with
 * @returns {boolean}
 */
export function isEntryPoint(moduleUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  let self;
  try {
    self = realpathSync(fileURLToPath(moduleUrl));
  } catch {
    // Not a file URL (or the file is gone): it cannot be the script node ran.
    return false;
  }
  // `node src/a2a/index` works without the extension, so try that spelling too.
  for (const candidate of [argv1, `${argv1}.js`]) {
    try {
      if (realpathSync(candidate) === self) return true;
    } catch {
      // This spelling does not exist on disk; the next one might.
    }
  }
  return false;
}
