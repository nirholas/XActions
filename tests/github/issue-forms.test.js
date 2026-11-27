// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The issue forms in .github/ISSUE_TEMPLATE follow GitHub's issue form
 * syntax, so a broken form is caught here instead of by someone who could not
 * file a bug. The rules are GitHub's own ("Syntax for issue forms" and
 * "Syntax for GitHub's form schema" in the GitHub docs); a form that breaks
 * one silently falls back to a blank issue or disappears from the chooser.
 *
 * Also pins the contract between `xactions doctor --issue` and the bug form:
 * the link names the form's file and its report field's id.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

import { BUG_FORM, REPORT_FIELD } from '../../src/cli/doctor/report.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.github/ISSUE_TEMPLATE');
const TYPES = new Set(['markdown', 'textarea', 'input', 'dropdown', 'checkboxes']);
const TOP_LEVEL = new Set(['name', 'description', 'title', 'labels', 'assignees', 'projects', 'type', 'body']);
const ATTRIBUTES = {
  markdown: new Set(['value']),
  textarea: new Set(['label', 'description', 'placeholder', 'value', 'render']),
  input: new Set(['label', 'description', 'placeholder', 'value']),
  dropdown: new Set(['label', 'description', 'multiple', 'options', 'default']),
  checkboxes: new Set(['label', 'description', 'options']),
};

const forms = readdirSync(DIR)
  .filter((f) => /\.ya?ml$/.test(f) && f !== 'config.yml')
  .map((file) => ({ file, form: yaml.load(readFileSync(path.join(DIR, file), 'utf-8')) }));

/** @param {string} file */
const formNamed = (file) => forms.find((f) => f.file === file)?.form;

describe('issue forms', () => {
  it('replace the Markdown templates entirely', () => {
    expect(readdirSync(DIR).filter((f) => f.endsWith('.md'))).toEqual([]);
    expect(forms.map((f) => f.file).sort()).toEqual(['bug_report.yml', 'feature_request.yml', 'script_broken.yml']);
  });

  for (const { file, form } of forms) {
    describe(file, () => {
      it('has the required top-level keys and no unknown ones', () => {
        expect(typeof form.name).toBe('string');
        expect(form.name.length).toBeGreaterThan(0);
        expect(typeof form.description).toBe('string');
        expect(form.description.length).toBeGreaterThan(0);
        expect(Array.isArray(form.body)).toBe(true);
        expect(form.body.length).toBeGreaterThan(0);
        for (const key of Object.keys(form)) expect(TOP_LEVEL.has(key), `unknown key ${key}`).toBe(true);
        if (form.labels !== undefined) expect(Array.isArray(form.labels) || typeof form.labels === 'string').toBe(true);
      });

      it('uses only valid field types, with the attributes each requires', () => {
        const ids = new Set();
        const labels = new Set();
        let nonMarkdown = 0;
        for (const field of form.body) {
          expect(TYPES.has(field.type), `type ${field.type}`).toBe(true);
          expect(typeof field.attributes).toBe('object');
          for (const key of Object.keys(field)) expect(['type', 'id', 'attributes', 'validations']).toContain(key);
          for (const key of Object.keys(field.attributes)) {
            expect(ATTRIBUTES[field.type].has(key), `${field.type} cannot have ${key}`).toBe(true);
          }
          if (field.type === 'markdown') {
            expect(typeof field.attributes.value).toBe('string');
            expect(field.id).toBeUndefined();
            expect(field.validations).toBeUndefined();
            continue;
          }
          nonMarkdown += 1;
          expect(typeof field.attributes.label).toBe('string');
          expect(labels.has(field.attributes.label), `duplicate label ${field.attributes.label}`).toBe(false);
          labels.add(field.attributes.label);
          if (field.id !== undefined) {
            expect(field.id).toMatch(/^[A-Za-z0-9_-]+$/);
            expect(ids.has(field.id), `duplicate id ${field.id}`).toBe(false);
            ids.add(field.id);
          }
          if (field.validations !== undefined) {
            expect(Object.keys(field.validations)).toEqual(['required']);
            expect(typeof field.validations.required).toBe('boolean');
          }
          if (field.type === 'dropdown') {
            const { options } = field.attributes;
            expect(Array.isArray(options) && options.length > 0).toBe(true);
            expect(new Set(options).size).toBe(options.length);
            for (const option of options) {
              expect(typeof option).toBe('string');
              expect(option).not.toBe('None');
            }
          }
          if (field.type === 'checkboxes') {
            for (const option of field.attributes.options) expect(typeof option.label).toBe('string');
          }
        }
        expect(nonMarkdown, 'a form needs at least one field that is not markdown').toBeGreaterThan(0);
      });

      it('carries no dash characters the house style forbids', () => {
        expect(readFileSync(path.join(DIR, file), 'utf-8')).not.toMatch(/[\u2013\u2014]/);
      });
    });
  }

  it('bug form requires the doctor report, the command, what happened and what was expected', () => {
    const bug = formNamed(BUG_FORM);
    const required = bug.body.filter((f) => f.validations?.required).map((f) => f.id);
    expect(required).toEqual(expect.arrayContaining([REPORT_FIELD, 'command', 'what-happened', 'expected', 'lane']));
  });

  it('bug form asks which lane, with every lane XActions ships', () => {
    const lane = formNamed(BUG_FORM).body.find((f) => f.id === 'lane');
    expect(lane.type).toBe('dropdown');
    expect(lane.attributes.options).toEqual(['CLI', 'MCP server', 'Browser script', 'Browser extension', 'Node library', 'HTTP API', 'Hosted (xactions.app)']);
  });

  it('script form requires the script, the page and the console error', () => {
    const script = formNamed('script_broken.yml');
    const required = script.body.filter((f) => f.validations?.required).map((f) => f.id);
    expect(required).toEqual(expect.arrayContaining(['script', 'page', 'console-error']));
  });

  it('config routes questions to Discussions and keeps blank issues off', () => {
    const config = yaml.load(readFileSync(path.join(DIR, 'config.yml'), 'utf-8'));
    expect(config.blank_issues_enabled).toBe(false);
    for (const link of config.contact_links) {
      expect(Object.keys(link).sort()).toEqual(['about', 'name', 'url']);
      expect(link.url).toMatch(/^https:\/\//);
    }
    expect(config.contact_links.some((l) => /\/discussions/.test(l.url))).toBe(true);
    expect(readFileSync(path.join(DIR, 'config.yml'), 'utf-8')).not.toMatch(/[\u2013\u2014]/);
  });
});
