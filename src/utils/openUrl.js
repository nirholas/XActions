// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Open a URL in the user's browser, only when they asked for it.
 *
 * Fire and forget: the caller has already printed the URL, so a machine with
 * no launcher (a container, an SSH session) loses nothing. On Windows the URL
 * goes to the protocol handler directly rather than through `cmd /c start`,
 * which would read every `&` in a query string as a command separator.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { spawn } from 'node:child_process';

/**
 * The launcher command for a platform.
 * @param {string} url
 * @param {string} [platform=process.platform]
 * @returns {{cmd: string, args: string[]}}
 */
export function launcherFor(url, platform = process.platform) {
  if (platform === 'darwin') return { cmd: 'open', args: [url] };
  if (platform === 'win32') return { cmd: 'rundll32', args: ['url.dll,FileProtocolHandler', url] };
  return { cmd: 'xdg-open', args: [url] };
}

/**
 * @param {string} url
 * @returns {boolean} whether a launcher was started
 */
export function openUrl(url) {
  const { cmd, args } = launcherFor(url);
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}
