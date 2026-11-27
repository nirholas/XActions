// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The CLI and MCP container image, as an MCP client launches it.
 *
 * deploy/docker/cli.Dockerfile builds the image and
 * .github/workflows/docker-publish.yml pushes it under this name. It is a
 * separate package from the API server image (ghcr.io/nirholas/xactions), so
 * neither image's tags can overwrite the other's.
 *
 * @module cli/dockerImage
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** The published CLI image, without a browser. `:browser` adds Chromium. */
export const DOCKER_IMAGE = 'ghcr.io/nirholas/xactions-cli:latest';

/**
 * The named volume mounted at the image's XACTIONS_HOME, so a login, the
 * query-ID cache, checkpoints and the action ledger outlive each `--rm` run.
 */
export const DOCKER_VOLUME = 'xactions:/data';

/**
 * The MCP server entry that runs the image over stdio.
 *
 * `-e XACTIONS_SESSION_COOKIE` carries no value: Docker then forwards the
 * variable from the environment the client starts it with (the entry's `env`),
 * so the cookie is never part of the docker command line that `ps` shows. When
 * the client does not set it, the container falls back to a session saved in
 * the volume by `xactions login`.
 *
 * @param {string} [image]
 * @returns {{command: string, args: string[], env: Record<string, string>}}
 */
export function dockerMcpEntry(image = DOCKER_IMAGE) {
  return {
    command: 'docker',
    args: ['run', '-i', '--rm', '-v', DOCKER_VOLUME, '-e', 'XACTIONS_SESSION_COOKIE', image, 'mcp'],
    env: {
      XACTIONS_SESSION_COOKIE: 'your_auth_token_here',
    },
  };
}
