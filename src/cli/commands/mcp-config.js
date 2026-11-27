// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions mcp-config` - print or write the MCP client config for XActions.
 *
 * With `--preset <name>` the server is started for that job
 * (`xactions-mcp --preset research`), so the client loads a fraction of the
 * tool list. With no preset on an interactive terminal it asks which one,
 * showing what each costs; piped or scripted, it asks nothing and prints the
 * same config it always has.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import chalk from 'chalk';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** Clients with a known config file, in the order they are listed. */
export const CLIENTS = ['claude', 'cursor', 'windsurf', 'vscode'];

/** The chooser's answer for "no preset": the full list, approval off, as before presets existed. */
const NO_PRESET = '';

/**
 * Where each client keeps its MCP config on each OS.
 *
 * @param {string} [home=os.homedir()]
 * @returns {Record<string, Record<string, string>>}
 */
export function configPaths(home = os.homedir()) {
  return {
    claude: {
      darwin: path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      win32: path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json'),
      linux: path.join(home, '.config', 'Claude', 'claude_desktop_config.json'),
    },
    cursor: {
      darwin: path.join(home, '.cursor', 'mcp.json'),
      win32: path.join(home, '.cursor', 'mcp.json'),
      linux: path.join(home, '.cursor', 'mcp.json'),
    },
    windsurf: {
      darwin: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
      win32: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
      linux: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
    },
    vscode: {
      darwin: path.join('.vscode', 'mcp.json'),
      win32: path.join('.vscode', 'mcp.json'),
      linux: path.join('.vscode', 'mcp.json'),
    },
  };
}

/**
 * The `xactions` server entry for a client config.
 *
 * @param {{ preset?: string | null }} [options]
 * @returns {{ command: string, args: string[], env: Record<string, string> }}
 */
export function buildMcpEntry({ preset } = {}) {
  return {
    command: 'npx',
    args: ['-y', 'xactions-mcp', ...(preset ? ['--preset', preset] : [])],
    env: {
      XACTIONS_SESSION_COOKIE: 'your_auth_token_here',
    },
  };
}

/**
 * The chooser's choices: each preset with its tool count, schema size and
 * approval default, then "no preset" for the full list as before.
 *
 * @param {Array<{name: string}>} tools
 * @returns {Promise<Array<{name: string, value: string, short: string}>>}
 */
export async function presetChoices(tools) {
  const { PRESETS, measurePreset } = await import('../../mcp/presets.js');
  const width = Math.max(...PRESETS.map((p) => p.name.length));
  const choices = PRESETS.map((preset) => {
    const size = measurePreset(preset, tools);
    const cost = `${String(size.tools).padStart(3)} tools, ${String(Math.round(size.bytes / 1024)).padStart(2)} KB${size.requireApproval ? ', writes held' : ''}`;
    return { name: `${preset.name.padEnd(width)}  ${cost}  ${chalk.gray(preset.summary)}`, value: preset.name, short: preset.name };
  });
  choices.push({ name: `${'no preset'.padEnd(width)}  ${String(tools.length).padStart(3)} tools, every tool, approval off`, value: NO_PRESET, short: 'no preset' });
  return choices;
}

/**
 * Ask which preset to use, on an interactive terminal only.
 *
 * @returns {Promise<string>} a preset name, or '' for no preset
 */
async function askForPreset() {
  const [{ default: inquirer }, { TOOLS }] = await Promise.all([import('inquirer'), import('../../mcp/server.js')]);
  const { preset } = await inquirer.prompt([{
    type: 'select',
    name: 'preset',
    message: 'Which job is this server for? (a smaller tool list is cheaper and more accurate)',
    choices: await presetChoices(TOOLS),
    default: 'research',
    pageSize: 10,
  }]);
  return preset;
}

/**
 * Register the command.
 * @param {import('commander').Command} program
 */
export function registerMcpConfigCommand(program) {
  program
    .command('mcp-config')
    .description('Generate MCP server config for Claude Desktop, Cursor, Windsurf, etc.')
    .option('-w, --write', 'Write config to Claude Desktop config file')
    .option('-c, --client <client>', 'Target client: claude, cursor, windsurf, vscode (default: claude)')
    .option('-p, --preset <name>', 'Start the server for a job: research, monitor, community-manager, growth, data, read-only, full')
    .action(async (options) => {
      const client = options.client || 'claude';
      const platform = process.platform;
      const paths = configPaths();

      // An unknown client used to print Claude Desktop's format and exit 0, and
      // --write then did nothing. Refuse it, the same as search --filter does.
      if (!paths[client]) {
        console.error(chalk.red(`Unknown --client "${client}". Use one of: ${CLIENTS.join(', ')}.`));
        process.exitCode = 1;
        return;
      }

      const { getPreset, UnknownPresetError } = await import('../../mcp/presets.js');
      let preset = null;
      try {
        if (options.preset !== undefined) {
          preset = getPreset(options.preset);
        } else if (process.stdin.isTTY && process.stdout.isTTY) {
          preset = getPreset(await askForPreset());
        }
      } catch (error) {
        if (!(error instanceof UnknownPresetError)) throw error;
        console.error(chalk.red(error.message));
        process.exitCode = 1;
        return;
      }

      const configPath = paths[client][platform] || paths[client].linux;
      const mcpEntry = buildMcpEntry({ preset: preset?.name });

      const fullConfig = client === 'vscode'
        ? { mcp: { servers: { xactions: mcpEntry } } }
        : { mcpServers: { xactions: mcpEntry } };

      console.log(chalk.bold.cyan('\n⚡ XActions MCP Configuration\n'));
      console.log(chalk.gray(`Client: ${client}`));
      console.log(chalk.gray(`OS:     ${platform}`));
      if (configPath) {
        console.log(chalk.gray(`Config: ${configPath}`));
      }
      if (preset) {
        const { TOOLS } = await import('../../mcp/server.js');
        const { measurePreset } = await import('../../mcp/presets.js');
        const size = measurePreset(preset, TOOLS);
        console.log(chalk.gray(`Preset: ${preset.name}, ${size.tools} tools (${Math.round(size.bytes / 1024)} KB of schema)`));
        if (size.requireApproval) {
          console.log(chalk.gray('        writes are held as drafts; approve each with `xactions drafts approve <id>`'));
        }
      }
      console.log();
      console.log(chalk.bold('Add this to your config file:\n'));
      console.log(chalk.white(JSON.stringify(fullConfig, null, 2)));
      console.log();

      if (options.write && configPath) {
        try {
          let existing = {};
          try {
            const data = await fs.readFile(configPath, 'utf-8');
            existing = JSON.parse(data);
          } catch {
            // File doesn't exist yet, start fresh
          }

          if (client === 'vscode') {
            existing.mcp = existing.mcp || {};
            existing.mcp.servers = existing.mcp.servers || {};
            existing.mcp.servers.xactions = mcpEntry;
          } else {
            existing.mcpServers = existing.mcpServers || {};
            existing.mcpServers.xactions = mcpEntry;
          }

          await fs.mkdir(path.dirname(configPath), { recursive: true });
          await fs.writeFile(configPath, JSON.stringify(existing, null, 2));

          console.log(chalk.green(`✅ Config written to ${configPath}`));
          console.log(chalk.yellow('\n⚠️  Remember to:'));
          console.log(chalk.yellow('   1. Replace "your_auth_token_here" with your actual auth_token'));
          console.log(chalk.yellow(`   2. Restart ${client === 'claude' ? 'Claude Desktop' : client} to apply changes`));
        } catch (error) {
          console.error(chalk.red(`Failed to write config: ${error.message}`));
          console.log(chalk.gray('\nCopy the JSON above and paste it manually.'));
          process.exitCode = 1;
        }
      } else if (options.write) {
        console.log(chalk.yellow('Config path not found for this client/OS. Copy the JSON above manually.'));
      } else {
        console.log(chalk.gray('Tip: Use --write to write directly to the config file.'));
        console.log(chalk.gray(`     xactions mcp-config --write --client ${client}${preset ? ` --preset ${preset.name}` : ''}`));
      }

      console.log(chalk.gray('\n📖 Full setup guide: https://github.com/nirholas/XActions/blob/main/docs/mcp-setup.md'));
      console.log();
    });
}
