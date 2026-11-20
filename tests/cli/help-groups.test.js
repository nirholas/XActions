// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions — Grouped help tests
// by nichxbt

import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

import {
  GROUPS,
  findStaleGroupEntries,
  groupCommands,
  renderGroupedCommands,
  renderRootHelp,
} from '../../src/cli/help-groups.js';

/** A stand-in program, so these tests never import the 3000-line CLI entry. */
function makeProgram(names) {
  const program = new Command();
  program.name('xactions').version('0.0.0-test');
  for (const name of names) {
    program.command(name).description(`does ${name}`);
  }
  return program;
}

describe('help-groups', () => {
  describe('groupCommands', () => {
    it('sorts registered commands into their declared groups', () => {
      const program = makeProgram(['doctor', 'profile', 'followers']);
      const groups = groupCommands(program);

      const titles = groups.map((group) => group.title);
      expect(titles).toContain('Start here');
      expect(titles).toContain('Read an account');
      expect(titles).toContain('Followers and audience');

      const startHere = groups.find((group) => group.title === 'Start here');
      expect(startHere.entries.map((entry) => entry.name)).toEqual(['doctor']);
    });

    it('omits groups whose commands are all absent', () => {
      const program = makeProgram(['doctor']);
      const titles = groupCommands(program).map((group) => group.title);
      expect(titles).toEqual(['Start here']);
    });

    it('keeps an ungrouped command reachable under More', () => {
      const program = makeProgram(['doctor', 'brand-new-command']);
      const more = groupCommands(program).find((group) => group.title === 'More');

      expect(more).toBeDefined();
      expect(more.entries.map((entry) => entry.name)).toContain('brand-new-command');
    });

    it('never lists a command twice', () => {
      const program = makeProgram(GROUPS.flatMap((group) => group.commands));
      const names = groupCommands(program).flatMap((group) =>
        group.entries.map((entry) => entry.name)
      );
      expect(new Set(names).size).toBe(names.length);
    });

    it('hides help and completion from the grouped screen', () => {
      const program = makeProgram(['doctor', 'completion']);
      const names = groupCommands(program).flatMap((group) =>
        group.entries.map((entry) => entry.name)
      );
      expect(names).not.toContain('completion');
      expect(names).not.toContain('help');
    });
  });

  describe('findStaleGroupEntries', () => {
    it('reports group entries that no longer exist on the program', () => {
      const program = makeProgram(['doctor']);
      const stale = findStaleGroupEntries(program);

      expect(stale).toContain('profile');
      expect(stale).not.toContain('doctor');
    });

    it('reports nothing when every declared command is registered', () => {
      const program = makeProgram(GROUPS.flatMap((group) => group.commands));
      expect(findStaleGroupEntries(program)).toEqual([]);
    });
  });

  describe('renderGroupedCommands', () => {
    it('renders each group heading with its hint', () => {
      const output = renderGroupedCommands(makeProgram(['doctor', 'profile']));
      expect(output).toContain('Start here');
      expect(output).toContain('Set up and verify the install');
      expect(output).toContain('Read an account');
    });

    it('truncates a description that would wreck the columns', () => {
      const program = new Command();
      program.command('doctor').description('x'.repeat(200));
      const output = renderGroupedCommands(program);

      for (const line of output.split('\n')) {
        // eslint-disable-next-line no-control-regex -- matches ANSI escape sequences
        expect(line.replace(/\[[0-9;]*m/g, '').length).toBeLessThan(100);
      }
    });

    it('uses only the first line of a multi-line description', () => {
      const program = new Command();
      program.command('doctor').description('first line\nsecond line');
      expect(renderGroupedCommands(program)).not.toContain('second line');
    });
  });

  describe('renderRootHelp', () => {
    it('includes the version, usage, groups, and the pointers out', () => {
      const program = makeProgram(['doctor', 'profile']);
      const help = renderRootHelp(program, '3.5.0');

      expect(help).toContain('v3.5.0');
      expect(help).toContain('xactions <command> [options]');
      expect(help).toContain('Start here');
      expect(help).toContain('Examples');
      expect(help).toContain('xactions quickstart');
      expect(help).toContain('xactions help <command>');
    });

    it('lists -h even though Commander keeps it off program.options', () => {
      const help = renderRootHelp(makeProgram(['doctor']), '3.5.0');
      expect(help).toContain('-h, --help');
    });
  });
});
