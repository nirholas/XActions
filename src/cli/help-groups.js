// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Grouped help for the root `xactions` command.
 *
 * The CLI has grown past fifty top-level commands. Commander prints them as one
 * alphabet-soup list, which tells a new user nothing about where to start and
 * tells an experienced user nothing about what else exists. This module sorts
 * them into task-shaped groups and renders a help screen you can actually scan.
 *
 * The grouping is data, not layout: `GROUPS` below is the single source of
 * truth, and `groupCommands()` reconciles it against the commands actually
 * registered on the program. A command that is registered but ungrouped still
 * shows up (under "More"), and a name listed here that no longer exists is
 * reported by `findStaleGroupEntries()` so the help can never quietly describe
 * a command that was deleted.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 */

import chalk from 'chalk';

/**
 * Task-shaped command groups, in the order a person actually needs them.
 *
 * `hint` is one line explaining when you would reach for this whole group.
 */
export const GROUPS = [
  {
    title: 'Start here',
    hint: 'Set up and verify the install',
    commands: ['quickstart', 'doctor', 'connect', 'login', 'logout', 'mcp-config', 'skills', 'drafts', 'accounts', 'info'],
  },
  {
    title: 'Read an account',
    hint: 'Works with no login at all',
    commands: ['profile', 'tweets', 'thread', 'article', 'media', 'analyze', 'brief', 'report', 'history', 'snapshot'],
  },
  {
    title: 'Followers and audience',
    hint: 'Who follows whom, and who is worth your time',
    commands: ['followers', 'following', 'non-followers', 'audience', 'crm', 'graph'],
  },
  {
    title: 'Search and monitor',
    hint: 'Find posts, then keep watching them',
    commands: ['search', 'hashtag', 'scrape', 'platforms', 'monitor', 'sentiment', 'reputation', 'rss', 'stream'],
  },
  {
    title: 'Write and grow',
    hint: 'Draft, sharpen, schedule, and recycle posts',
    commands: [
      'engage',
      'ai',
      'optimize',
      'hashtags',
      'predict',
      'variations',
      'evergreen',
      'persona',
      'schedule',
      'bulk',
    ],
  },
  {
    title: 'Automate',
    hint: 'Run it without you',
    commands: ['workflow', 'agent', 'notify', 'plugin', 'org', 'team', 'dataset'],
  },
  {
    title: 'Move data',
    hint: 'Export, import, convert, migrate, diff',
    commands: ['export', 'export-data', 'archive', 'import', 'convert', 'migrate', 'diff'],
  },
  {
    title: 'Low level',
    hint: 'The raw HTTP client',
    commands: ['client'],
  },
];

/** Commands that are real but deliberately hidden from the grouped screen. */
const SUPPRESSED = new Set(['help', 'completion']);

/**
 * Reconcile the declared groups against the commands actually registered.
 *
 * @param {import('commander').Command} program
 * @returns {{title: string, hint: string, entries: {name: string, description: string}[]}[]}
 */
export function groupCommands(program) {
  const registered = new Map();
  for (const command of program.commands) {
    const name = command.name();
    if (SUPPRESSED.has(name)) continue;
    registered.set(name, command.description() ?? '');
  }

  const grouped = [];
  const claimed = new Set();

  for (const group of GROUPS) {
    const entries = [];
    for (const name of group.commands) {
      if (!registered.has(name)) continue; // stale entry, reported separately
      entries.push({ name, description: registered.get(name) });
      claimed.add(name);
    }
    if (entries.length > 0) {
      grouped.push({ title: group.title, hint: group.hint, entries });
    }
  }

  // Anything registered but not grouped still has to be reachable from help.
  const leftovers = [...registered.entries()]
    .filter(([name]) => !claimed.has(name))
    .map(([name, description]) => ({ name, description }));

  if (leftovers.length > 0) {
    grouped.push({
      title: 'More',
      hint: 'Not yet sorted into a group',
      entries: leftovers,
    });
  }

  return grouped;
}

/**
 * Group entries naming a command that is no longer registered.
 *
 * Exported so a test can fail the build when the help text drifts away from the
 * program, rather than shipping a help screen that promises a missing command.
 *
 * @param {import('commander').Command} program
 * @returns {string[]}
 */
export function findStaleGroupEntries(program) {
  const registered = new Set(program.commands.map((command) => command.name()));
  return GROUPS.flatMap((group) => group.commands).filter((name) => !registered.has(name));
}

/** The first line of a description, so a long one cannot wreck the columns. */
function firstLine(text) {
  const line = String(text).split('\n')[0].trim();
  return line.length > 78 ? `${line.slice(0, 77)}…` : line;
}

/**
 * Render the grouped command list.
 *
 * @param {import('commander').Command} program
 * @returns {string}
 */
export function renderGroupedCommands(program) {
  const groups = groupCommands(program);
  const width = groups
    .flatMap((group) => group.entries)
    .reduce((max, entry) => Math.max(max, entry.name.length), 0);

  return groups
    .map((group) => {
      const heading = `  ${chalk.bold(group.title)}  ${chalk.dim(group.hint)}`;
      const rows = group.entries.map(
        (entry) =>
          `    ${chalk.cyan(entry.name.padEnd(width))}  ${chalk.gray(firstLine(entry.description))}`
      );
      return [heading, ...rows].join('\n');
    })
    .join('\n\n');
}

/**
 * The full root help screen, replacing Commander's flat default.
 *
 * @param {import('commander').Command} program
 * @param {string} version
 * @returns {string}
 */
export function renderRootHelp(program, version) {
  // `_helpOption` is not in `program.options`, but omitting -h from a help
  // screen is exactly the kind of small lie that makes a CLI feel unfinished.
  const options = [
    ...program.options.map((option) => [option.flags, option.description]),
    ['-h, --help', 'display help for command'],
  ]
    .map(([flags, description]) => `    ${chalk.cyan(flags.padEnd(22))}  ${chalk.gray(description)}`)
    .join('\n');

  return [
    '',
    `${chalk.bold.cyan('⚡ xactions')} ${chalk.dim(`v${version}`)}  ${chalk.dim('the complete X/Twitter toolkit, no API key required')}`,
    '',
    `  ${chalk.dim('Usage:')} xactions <command> [options]`,
    '',
    renderGroupedCommands(program),
    '',
    `  ${chalk.bold('Global options')}`,
    options,
    '',
    `  ${chalk.bold('Examples')}`,
    `    ${chalk.gray('xactions doctor')}                     ${chalk.dim('check what works right now')}`,
    `    ${chalk.gray('xactions profile NASA')}               ${chalk.dim('read any public account, no login')}`,
    `    ${chalk.gray('xactions analyze NASA SpaceX')}        ${chalk.dim('compare two accounts')}`,
    `    ${chalk.gray('xactions tweets NASA --limit 50 --json | jq')}`,
    `    ${chalk.gray('xactions connect')}                    ${chalk.dim('log in once to unlock search and followers')}`,
    '',
    `  ${chalk.dim('New here?')} Run ${chalk.cyan('xactions quickstart')}.`,
    `  ${chalk.dim('Detail on any command:')} ${chalk.cyan('xactions help <command>')}`,
    `  ${chalk.dim('Tab completion:')} ${chalk.cyan('xactions completion --help')}`,
    `  ${chalk.dim('Docs:')} https://xactions.app`,
    '',
  ].join('\n');
}
