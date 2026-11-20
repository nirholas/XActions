// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions org` - run a family of X accounts as a team.
 *
 * A newsroom's main, breaking and regional handles, a company's main, dev,
 * status and support accounts, or a brand and the affiliates who post for it
 * and say so. Members get roles, posts go through draft, approval and
 * publish, cross-posts are checked against X's duplicate-content rule,
 * affiliate posts are labelled, and every change lands in a hash-chained
 * audit log. The library lives in `src/orgs/`; docs in `docs/orgs.md`.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  ACCOUNT_KINDS,
  POST_STATUSES,
  ROLES,
  approvePost,
  createOrg,
  createPost,
  editPost,
  getPost,
  isSessionEncrypted,
  listOrgs,
  listPosts,
  loadOrg,
  normalizeHandle,
  orgCalendar,
  orgPaths,
  orgStats,
  publishDue,
  readAudit,
  rejectPost,
  removeAccount,
  removeMember,
  resolveActor,
  setMember,
  updateSettings,
  verifyAccountSession,
  verifyAudit,
  addAccount,
  createSessionClient,
  KEY_ENV,
} from '../../orgs/index.js';
import { getXactionsHome as xactionsHome } from '../../mcp/action-caps.js';

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function cut(text, max) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function paint(status) {
  return (
    {
      draft: chalk.yellow,
      approved: chalk.cyan,
      rejected: chalk.gray,
      published: chalk.green,
      partial: chalk.magenta,
      failed: chalk.red,
      pending: chalk.yellow,
      unconfirmed: chalk.magenta,
    }[status]?.(status) ?? status
  );
}

function collect(value, previous) {
  return [...previous, value];
}

function guarded(fn) {
  return async (...args) => {
    const command = args.at(-1);
    const options = typeof command?.opts === 'function' ? command.opts() : {};
    try {
      await fn(...args);
    } catch (error) {
      if (options.json) printJson({ error: error.message, code: error.code, details: error.details });
      else console.error(chalk.red(`\n  ${error.message}\n`));
      process.exitCode = 1;
    }
  };
}

function printNotices(notices) {
  for (const n of notices) console.log(chalk.yellow(`  ! ${n}`));
}

function renderPost(post) {
  console.log('');
  console.log(`  ${chalk.bold('Post')}       ${chalk.cyan(post.id)}  ${paint(post.status)}`);
  console.log(`  ${chalk.bold('Written by')} ${post.createdBy}, ${post.createdAt}`);
  if (post.scheduledFor) console.log(`  ${chalk.bold('Scheduled')}  ${post.scheduledFor}`);
  if (post.note) console.log(`  ${chalk.bold('Note')}       ${post.note}`);
  for (const a of post.approvals) console.log(`  ${chalk.bold('Approved')}   ${a.by}, ${a.at}`);
  if (post.rejection) console.log(`  ${chalk.bold('Rejected')}   ${post.rejection.by}, ${post.rejection.at}${post.rejection.reason ? `: ${post.rejection.reason}` : ''}`);
  console.log('');
  post.targets.forEach((t, i) => {
    const role = i === 0 ? 'primary' : t.mode === 'repost' ? 'repost' : 'variant';
    const id = t.tweetId ? chalk.gray(` https://x.com/${t.handle}/status/${t.tweetId}`) : '';
    console.log(`  ${chalk.bold(`@${t.handle}`)} ${chalk.gray(`(${role})`)} ${paint(t.status)}${id}`);
    if (t.text) for (const line of t.text.split('\n')) console.log(`    ${line}`);
    if (t.error) console.log(`    ${chalk.red(t.error)}`);
  });
  console.log('');
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Read a cookie jar for `account add` from the chosen source.
 * @param {{cookiesFile?: string, fromSaved?: boolean, fromBrowser?: string|boolean}} options
 * @returns {Promise<object[]>}
 */
export async function readCookieSource(options) {
  const sources = [options.cookiesFile, options.fromSaved, options.fromBrowser].filter((v) => v !== undefined && v !== false);
  if (sources.length !== 1) {
    throw new Error('Give exactly one session source: --cookies-file <path>, --from-browser [browser], or --from-saved.');
  }
  const { parseCookieInput, readBrowserCookies, SUPPORTED_BROWSERS } = await import('../../client/auth/cookieImport.js');
  if (options.cookiesFile) return parseCookieInput(await fs.readFile(options.cookiesFile, 'utf-8'));
  if (options.fromBrowser !== undefined) {
    const browser = options.fromBrowser === true ? 'firefox' : String(options.fromBrowser).toLowerCase();
    if (!SUPPORTED_BROWSERS.includes(browser)) throw new Error(`Unknown browser "${browser}". Supported: ${SUPPORTED_BROWSERS.join(', ')}.`);
    return readBrowserCookies(browser);
  }
  const file = path.join(xactionsHome(), 'cookies.json');
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch {
    throw new Error(`No saved cookie jar at ${file}. Run \`xactions connect\` or \`xactions login --cookies-file\` first, or pass --cookies-file.`);
  }
}

/**
 * `org account add`: read the session, confirm it logs in as the handle,
 * then store it.
 * @param {string} slug
 * @param {string} handle
 * @param {object} options
 * @param {{createClient?: Function}} [deps]
 */
export async function accountAddCommand(slug, handle, options, deps = {}) {
  const h = normalizeHandle(handle);
  const org = loadOrg(slug);
  resolveActor(org, options.as);
  if (options.kind && !ACCOUNT_KINDS.includes(options.kind)) throw new Error(`--kind must be one of ${ACCOUNT_KINDS.join(', ')}.`);
  const cookies = await readCookieSource(options);

  let identity = null;
  if (options.verify !== false) {
    const client = await (deps.createClient || createSessionClient)(cookies, h);
    identity = await verifyAccountSession(client, h);
  }
  const { account, encrypted } = addAccount(slug, options.as, {
    handle: h,
    label: options.label,
    kind: options.kind || 'owned',
    disclosure: options.disclosure,
    cookies,
    userId: identity?.userId,
    verified: Boolean(identity),
  });
  if (options.json) {
    printJson({ account, encrypted });
    return account;
  }
  console.log(`  ${chalk.green('✓')} Connected ${chalk.bold(`@${account.handle}`)} to ${slug}${account.label ? ` as ${account.label}` : ''} (${account.kind})`);
  console.log(chalk.gray(`    ${identity ? 'Session confirmed to log in as this account.' : 'Not verified (--no-verify).'} ${encrypted ? 'Stored encrypted.' : `Stored unencrypted; set ${KEY_ENV} to encrypt sessions.`}`));
  return account;
}

/**
 * `org draft`.
 * @param {string} slug
 * @param {object} options
 */
export function draftCommand(slug, options) {
  if (!options.account || options.text === undefined) throw new Error('A post needs --account <handle> and --text <text> for the primary.');
  const variants = (options.variant || []).map((v) => {
    const i = v.indexOf('=');
    if (i < 1) throw new Error(`--variant takes handle=text, got "${v}".`);
    return { handle: v.slice(0, i), text: v.slice(i + 1) };
  });
  const { post, notices } = createPost(slug, options.as, {
    primary: { handle: options.account, text: options.text },
    variants,
    reposts: options.repost || [],
    scheduledFor: options.at,
    note: options.note,
  });
  if (options.json) printJson({ post, notices });
  else {
    printNotices(notices);
    console.log(`  ${chalk.green('✓')} Drafted ${chalk.cyan(post.id)} for ${post.targets.map((t) => (t.mode === 'repost' ? `↻@${t.handle}` : `@${t.handle}`)).join(' ')}`);
    console.log(chalk.gray(`    An editor approves it with \`xactions org approve ${slug} ${post.id}\`.`));
  }
  return post;
}

function postsCommand(slug, options) {
  const org = loadOrg(slug);
  resolveActor(org, options.as);
  const posts = listPosts(slug, { status: options.status || 'all' });
  if (options.json) return printJson(posts);
  if (posts.length === 0) {
    console.log(chalk.gray(`\n  No posts. Draft one with \`xactions org draft ${slug} --account <handle> --text "..."\`.\n`));
    return;
  }
  console.log('');
  console.log(`  ${chalk.bold('ID'.padEnd(12))}${chalk.bold('STATUS'.padEnd(11))}${chalk.bold('WHEN'.padEnd(18))}${chalk.bold('ACCOUNTS'.padEnd(32))}${chalk.bold('TEXT')}`);
  for (const p of posts) {
    const when = p.scheduledFor ? p.scheduledFor.slice(0, 16).replace('T', ' ') : 'asap';
    const accounts = cut(p.targets.map((t) => (t.mode === 'repost' ? `↻@${t.handle}` : `@${t.handle}`)).join(' '), 30);
    console.log(`  ${chalk.cyan(p.id.padEnd(12))}${paint(p.status.padEnd(11))}${when.padEnd(18)}${accounts.padEnd(32)}${chalk.gray(cut(p.targets[0].text, 50))}`);
  }
  console.log('');
}

/**
 * `org publish`.
 * @param {string} slug
 * @param {object} options
 * @param {object} [deps]
 */
export async function publishCommand(slug, options, deps = {}) {
  const lines = [];
  const results = await publishDue(slug, {
    as: options.as,
    postId: options.id,
    dryRun: options.dryRun,
    retryFailed: options.retryFailed,
    delayMs: options.delay !== undefined ? Number(options.delay) * 1000 : undefined,
    createClient: deps.createClient,
    onResult: (r) => {
      lines.push(r);
      if (options.json) return;
      const mark = { published: chalk.green('✓'), reposted: chalk.green('↻'), 'would-post': chalk.cyan('·'), 'would-repost': chalk.cyan('↻') }[r.outcome] ?? chalk.yellow('!');
      const link = r.tweetId ? chalk.gray(` https://x.com/${r.handle}/status/${r.tweetId}`) : '';
      const detail = r.error ? chalk.yellow(` ${r.error}`) : r.text ? chalk.gray(` ${cut(r.text, 60)}`) : '';
      console.log(`  ${mark} ${chalk.cyan(r.post)} @${r.handle} ${r.outcome}${link}${detail}`);
    },
  });
  if (options.json) printJson(results);
  else if (results.length === 0) console.log(chalk.gray('\n  Nothing due. Approved posts publish once their scheduled time has passed.\n'));
  if (results.some((r) => r.outcome === 'failed')) process.exitCode = 1;
  return results;
}

function calendarCommand(slug, options) {
  const cal = orgCalendar(slug, { as: options.as, days: Number(options.days ?? 14) });
  if (options.json) return printJson(cal);
  const line = (i) => `    ${chalk.cyan(i.post)} ${paint(i.status)} ${i.scheduledFor ? i.scheduledFor.slice(11, 16) : ''} ${i.accounts.join(' ')} ${chalk.gray(cut(i.text, 50))}`;
  console.log('');
  if (cal.days.length === 0 && cal.unscheduled.length === 0) console.log(chalk.gray('  Nothing drafted or approved.'));
  for (const day of cal.days) {
    console.log(`  ${chalk.bold(day.date === 'overdue' ? chalk.red('Overdue') : day.date)}`);
    day.items.forEach((i) => console.log(line(i)));
  }
  if (cal.unscheduled.length) {
    console.log(`  ${chalk.bold('Unscheduled (publish as soon as approved)')}`);
    cal.unscheduled.forEach((i) => console.log(line(i)));
  }
  console.log('');
}

async function statsCommand(slug, options) {
  const stats = await orgStats(slug, { as: options.as, days: Number(options.days ?? 30) });
  if (options.json) return printJson(stats);
  const n = (v) => (v === null || v === undefined ? '?' : Number(v).toLocaleString('en-US'));
  console.log('');
  console.log(chalk.bold(`  ${slug}, last ${stats.days} days`));
  console.log(`  ${chalk.bold('ACCOUNT'.padEnd(20))}${chalk.bold('LABEL'.padEnd(12))}${chalk.bold('FOLLOWERS'.padStart(11))}${chalk.bold('PUBLISHED'.padStart(11))}${chalk.bold('LIKES'.padStart(9))}${chalk.bold('REPOSTS'.padStart(9))}${chalk.bold('VIEWS'.padStart(11))}${chalk.bold('BUDGET'.padStart(8))}`);
  for (const a of stats.accounts) {
    console.log(`  ${`@${a.handle}`.padEnd(20)}${cut(a.label ?? a.kind, 11).padEnd(12)}${n(a.followers).padStart(11)}${n(a.published).padStart(11)}${n(a.likes).padStart(9)}${n(a.retweets).padStart(9)}${n(a.views).padStart(11)}${n(a.postBudgetLeft).padStart(8)}`);
    if (a.error) console.log(chalk.yellow(`    ${a.error}`));
  }
  const t = stats.totals;
  console.log(`  ${chalk.bold('Total'.padEnd(32))}${n(t.followers).padStart(11)}${n(t.published).padStart(11)}${n(t.likes).padStart(9)}${n(t.retweets).padStart(9)}${n(t.views).padStart(11)}`);
  console.log(chalk.gray('  Likes, reposts and views are summed over the posts this org published. BUDGET is posts left in the 24h cap.\n'));
}

function logCommand(slug, options) {
  const org = loadOrg(slug);
  resolveActor(org, options.as);
  const file = orgPaths(slug).audit;
  if (options.verify) {
    const result = verifyAudit(file);
    if (options.json) printJson(result);
    else if (result.ok) console.log(`  ${chalk.green('✓')} Audit log intact: ${result.entries} entries, every hash matches.`);
    else console.log(`  ${chalk.red('✗')} Audit log broken at entry ${result.brokenAt}: ${result.reason}.`);
    if (!result.ok) process.exitCode = 1;
    return result;
  }
  const entries = readAudit(file).slice(-Number(options.limit ?? 50));
  if (options.json) return printJson(entries);
  console.log('');
  for (const e of entries) {
    const details = Object.entries(e.details || {})
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(' ');
    console.log(`  ${chalk.gray(String(e.seq).padStart(4))} ${chalk.gray(e.at.slice(0, 19).replace('T', ' '))} ${chalk.bold(e.actor.padEnd(14))} ${e.action.padEnd(16)} ${chalk.gray(cut(details, 80))}`);
  }
  console.log('');
}

function showCommand(slug, options) {
  const org = loadOrg(slug);
  resolveActor(org, options.as);
  if (options.json) return printJson(org);
  const paths = orgPaths(slug);
  console.log('');
  console.log(`  ${chalk.bold(org.name)} ${chalk.gray(`(${org.slug})`)}`);
  console.log(chalk.gray(`  two-person approval ${org.settings.twoPersonApproval ? 'on' : 'off'}, similarity threshold ${org.settings.similarityThreshold}, disclosure ${org.settings.disclosureTag}`));
  console.log(`\n  ${chalk.bold('Members')}`);
  for (const m of org.members) console.log(`    ${m.name.padEnd(20)} ${m.role}`);
  console.log(`\n  ${chalk.bold('Accounts')}`);
  if (org.accounts.length === 0) console.log(chalk.gray(`    None yet. Connect one with \`xactions org account add ${slug} <handle> --from-saved\`.`));
  for (const a of org.accounts) {
    const enc = isSessionEncrypted(paths.session(a.handle));
    const session = enc === null ? chalk.red('no session') : enc ? 'encrypted' : chalk.yellow('unencrypted');
    const verified = a.verifiedAt ? chalk.green('verified') : chalk.yellow('unverified');
    console.log(`    ${`@${a.handle}`.padEnd(20)} ${(a.label ?? '').padEnd(12)} ${a.kind.padEnd(10)} ${verified} ${session}${a.kind === 'affiliate' ? chalk.gray(` discloses ${a.disclosure || org.settings.disclosureTag}`) : ''}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register `xactions org` and its sub-commands.
 * @param {import('commander').Command} program
 */
export function registerOrgCommand(program) {
  const org = program
    .command('org')
    .description('Run a team\'s family of X accounts: roles, approvals, audit log');

  const asOpt = ['--as <member>', `Member acting (default: $XACTIONS_ORG_MEMBER, or the only member)`];
  const jsonOpt = ['--json', 'Print JSON'];

  org
    .command('create <org>')
    .description('Create an organization; you become its owner')
    .requiredOption('--owner <name>', 'Your name as the first owner')
    .option('--name <name>', 'Display name')
    .option(...jsonOpt)
    .action(guarded((slug, options) => {
      const created = createOrg({ slug, name: options.name, owner: options.owner });
      if (options.json) return printJson(created);
      console.log(`  ${chalk.green('✓')} Created ${chalk.bold(created.name)} (${slug}), owned by ${options.owner}`);
      console.log(chalk.gray(`    Next: \`xactions org account add ${slug} <handle> --from-saved\` to connect the first account.`));
    }));

  org
    .command('list')
    .description('List organizations')
    .option(...jsonOpt)
    .action(guarded((options) => {
      const orgs = listOrgs();
      if (options.json) return printJson(orgs);
      if (orgs.length === 0) return console.log(chalk.gray('\n  No organizations. Create one with `xactions org create <id> --owner <name>`.\n'));
      for (const o of orgs) console.log(`  ${chalk.cyan(o.slug.padEnd(20))} ${o.name.padEnd(24)} ${o.accounts} accounts, ${o.members} members`);
    }));

  org
    .command('show <org>')
    .description('Members, accounts and settings')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, options) => showCommand(slug, options)));

  org
    .command('settings <org>')
    .description('Change settings (owner only)')
    .option('--two-person <on|off>', 'Require someone other than the writer to approve')
    .option('--threshold <n>', 'Similarity (0.5 to 1) at which two variants count as duplicates')
    .option('--disclosure <tag>', 'Default disclosure tag for affiliate accounts')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, options) => {
      const patch = {};
      if (options.twoPerson !== undefined) {
        if (!['on', 'off'].includes(options.twoPerson)) throw new Error('--two-person takes on or off.');
        patch.twoPersonApproval = options.twoPerson === 'on';
      }
      if (options.threshold !== undefined) patch.similarityThreshold = options.threshold;
      if (options.disclosure !== undefined) patch.disclosureTag = options.disclosure;
      const settings = updateSettings(slug, options.as, patch);
      if (options.json) return printJson(settings);
      console.log(`  ${chalk.green('✓')} ${JSON.stringify(settings)}`);
    }));

  const member = org.command('member').description('Add, change or remove members');
  member
    .command('add <org> <name>')
    .description('Add a member, or change an existing member\'s role')
    .requiredOption('--role <role>', ROLES.join(', '))
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, name, options) => {
      const m = setMember(slug, options.as, { name, role: options.role });
      if (options.json) return printJson(m);
      console.log(`  ${chalk.green('✓')} ${m.name} is ${m.role === 'admin' || m.role === 'owner' || m.role === 'editor' ? `an ${m.role}` : `a ${m.role}`} of ${slug}`);
    }));
  member
    .command('remove <org> <name>')
    .description('Remove a member')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, name, options) => {
      const m = removeMember(slug, options.as, name);
      if (options.json) return printJson(m);
      console.log(`  ${chalk.green('✓')} Removed ${m.name}`);
    }));

  const account = org.command('account').description('Connect or disconnect X accounts');
  account
    .command('add <org> <handle>')
    .description('Connect an account the organization runs; the session is checked against the handle')
    .option('--cookies-file <path>', 'Netscape cookies.txt, Cookie-Editor JSON, or Playwright storageState')
    .option('--from-browser [browser]', 'Read x.com cookies from a local browser (default: firefox)')
    .option('--from-saved', 'Use the session saved by `xactions connect` / `xactions login`')
    .option('--label <label>', 'What this account is for: main, dev, status, support, breaking...')
    .option('--kind <kind>', `${ACCOUNT_KINDS.join(' or ')}; affiliate posts must carry a disclosure`, 'owned')
    .option('--disclosure <tag>', 'Disclosure tag for this affiliate (default: the org setting, #ad)')
    .option('--no-verify', 'Skip checking that the session logs in as this handle')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, handle, options) => accountAddCommand(slug, handle, options)));
  account
    .command('remove <org> <handle>')
    .description('Disconnect an account and delete its saved session')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, handle, options) => {
      const a = removeAccount(slug, options.as, handle);
      if (options.json) return printJson(a);
      console.log(`  ${chalk.green('✓')} Disconnected @${a.handle} and deleted its session`);
    }));
  account
    .command('list <org>')
    .description('List connected accounts')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, options) => showCommand(slug, options)));

  org
    .command('draft <org>')
    .description('Draft a post for one account, with variants or reposts on others')
    .option('--account <handle>', 'Primary account')
    .option('--text <text>', 'Primary text')
    .option('--variant <handle=text>', 'Another account and its own wording (repeatable)', collect, [])
    .option('--repost <handle>', 'Another account that reposts the primary (repeatable)', collect, [])
    .option('--at <iso>', 'Publish at or after this time, e.g. 2026-12-01T09:00:00Z')
    .option('--note <note>', 'Note for the reviewer')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, options) => draftCommand(slug, options)));

  org
    .command('edit <org> <id>')
    .description('Change a post; an approved post goes back to draft')
    .option('--account <handle>', 'Which account\'s text to change (default: the primary)')
    .option('--text <text>', 'New text')
    .option('--at <iso>', 'New schedule; "none" to clear it')
    .option('--note <note>', 'New note')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, id, options) => {
      const { post, notices } = editPost(slug, options.as, id, {
        handle: options.account,
        text: options.text,
        scheduledFor: options.at === undefined ? undefined : options.at === 'none' ? null : options.at,
        note: options.note,
      });
      if (options.json) return printJson({ post, notices });
      printNotices(notices);
      console.log(`  ${chalk.green('✓')} Updated ${chalk.cyan(post.id)}; it is a draft again and needs approval.`);
    }));

  org
    .command('posts <org>')
    .description('The post queue, newest first')
    .option('--status <status>', `${POST_STATUSES.join(', ')}, or all`, 'all')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, options) => postsCommand(slug, options)));

  org
    .command('post <org> <id>')
    .description('One post with every account\'s text and outcome')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, id, options) => {
      resolveActor(loadOrg(slug), options.as);
      const post = getPost(slug, id);
      if (options.json) return printJson(post);
      renderPost(post);
    }));

  org
    .command('approve <org> <id>')
    .description('Approve a draft (editor or above)')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, id, options) => {
      const post = approvePost(slug, options.as, id);
      if (options.json) return printJson(post);
      const when = post.scheduledFor ? `at ${post.scheduledFor}` : 'on the next `xactions org publish`';
      console.log(`  ${chalk.green('✓')} Approved ${chalk.cyan(post.id)}; it publishes ${when}`);
    }));

  org
    .command('reject <org> <id>')
    .description('Reject a post that has not shipped')
    .option('--reason <reason>', 'Why, for the writer')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, id, options) => {
      const post = rejectPost(slug, options.as, id, options.reason);
      if (options.json) return printJson(post);
      console.log(`  ${chalk.green('✓')} Rejected ${chalk.cyan(post.id)}`);
    }));

  org
    .command('publish <org>')
    .description('Publish approved posts that are due (run from cron for scheduling)')
    .option('--id <id>', 'Publish this post now, even if scheduled later')
    .option('--dry-run', 'Show what would be published; write nothing')
    .option('--retry-failed', 'Retry targets that failed on an earlier run')
    .option('--delay <seconds>', 'Pause between writes', '3')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, options) => publishCommand(slug, options)));

  org
    .command('calendar <org>')
    .description('Drafted and approved posts by day')
    .option('--days <n>', 'How far ahead', '14')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, options) => calendarCommand(slug, options)));

  org
    .command('stats <org>')
    .description('Followers, published posts and engagement per account and in total')
    .option('--days <n>', 'Window', '30')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, options) => statsCommand(slug, options)));

  org
    .command('log <org>')
    .description('The audit log; --verify checks its hash chain')
    .option('--limit <n>', 'Most recent entries', '50')
    .option('--verify', 'Check every hash in the chain')
    .option(...asOpt)
    .option(...jsonOpt)
    .action(guarded((slug, options) => logCommand(slug, options)));
}
