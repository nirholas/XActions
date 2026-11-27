// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The CLI's top-level failure handling: a crash prints its message instead of
 * an unhandled-rejection stack, and any failed command ends with one line
 * pointing at `xactions doctor --report`, so the issue that follows arrives
 * with the version, platform and install method already in it.
 *
 * Commands catch their own errors and set `process.exitCode`, so the line is
 * written when the process exits non-zero rather than from a catch block.
 * Two failures do not get it: a usage error Commander reports (an unknown
 * command, a missing argument), which is not a bug, and doctor itself, whose
 * output is the report.
 *
 * Everything goes to stderr; stdout stays data.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

export const REPORT_HINT = 'If this looks like a bug in XActions, run `xactions doctor --report` and paste the result into a new issue.';

/**
 * @param {{code: number|null|undefined, command: string|null, usageError: boolean}} state
 * @returns {boolean}
 */
export function shouldHint({ code, command, usageError }) {
  return Boolean(code) && !usageError && command !== 'doctor';
}

/**
 * The top-level command a run used: `drafts` for `xactions drafts approve`.
 * @param {import('commander').Command} command
 * @returns {string}
 */
function topLevelName(command) {
  let current = command;
  while (current.parent && current.parent.parent) current = current.parent;
  return current.name();
}

/**
 * @param {import('commander').Command} command
 * @param {(command: import('commander').Command) => void} visit
 */
function walk(command, visit) {
  visit(command);
  for (const sub of command.commands) walk(sub, visit);
}

/**
 * Watch a program for failures and write the hint when the process exits
 * with one. Call after every command is registered: Commander copies output
 * settings to a subcommand only when it is created, so each is set here.
 * @param {import('commander').Command} program
 * @param {{proc?: NodeJS.Process, write?: (text: string) => void}} [options]
 */
export function installFailureHint(program, { proc = process, write = (text) => proc.stderr.write(text) } = {}) {
  let usageError = false;
  /** @type {string|null} */
  let command = null;

  walk(program, (cmd) => {
    const current = cmd.configureOutput();
    const forward = current.outputError || ((text, out) => out(text));
    cmd.configureOutput({
      ...current,
      outputError(text, out) {
        usageError = true;
        forward(text, out);
      },
    });
  });

  program.hook('preAction', (_root, actionCommand) => {
    command = topLevelName(actionCommand);
  });

  proc.on('exit', (code) => {
    if (shouldHint({ code: code || Number(proc.exitCode || 0), command, usageError })) write(`\n${REPORT_HINT}\n`);
  });
}

/**
 * Report an error no command caught: its message, and its stack only when
 * DEBUG is set.
 * @param {unknown} error
 * @param {{write?: (text: string) => void, proc?: {exitCode?: number|string|null, env: Record<string, string|undefined>}}} [options]
 */
export function reportFatal(error, { write = (text) => process.stderr.write(text), proc = process } = {}) {
  const err = /** @type {Error} */ (error);
  const message = err?.message || String(error);
  write(`${message}\n`);
  if (proc.env.DEBUG && err?.stack) write(`${err.stack}\n`);
  proc.exitCode = 1;
}
