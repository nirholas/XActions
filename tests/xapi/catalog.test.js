// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { describe, expect, it } from 'vitest';
import {
  OPERATIONS,
  OAUTH2,
  SOURCE,
  RATE_LIMITS,
  describeOperation,
  getOperation,
  listOperations,
  listTags,
  rateLimitsFor,
} from '../../src/xapi/index.js';

describe('generated X API catalog', () => {
  it('has a unique id, a valid method and a v2 path on every operation', () => {
    const ids = new Set();
    for (const op of OPERATIONS) {
      expect(ids.has(op.id), `duplicate id ${op.id}`).toBe(false);
      ids.add(op.id);
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).toContain(op.method);
      expect(op.path.startsWith('/2/')).toBe(true);
      expect(op.write).toBe(op.method !== 'GET');
      expect(typeof op.label).toBe('string');
    }
    expect(OPERATIONS.length).toBe(SOURCE.operations);
    expect(OPERATIONS.length).toBeGreaterThan(200);
  });

  it('links every operation to its official reference page', () => {
    const missing = OPERATIONS.filter((op) => !op.docsUrl?.startsWith('https://docs.x.com/'));
    expect(missing.map((op) => op.id)).toEqual([]);
  });

  it('declares every path parameter the route needs, as required', () => {
    for (const op of OPERATIONS) {
      for (const [, name] of op.path.matchAll(/\{([^}]+)\}/g)) {
        const param = op.params.find((p) => p.name === name && p.in === 'path');
        expect(param, `${op.id} lacks path param ${name}`).toBeTruthy();
        expect(param.required).toBe(true);
      }
    }
  });

  it('only names scopes the OAuth 2.0 section lists, and every operation accepts some credential', () => {
    const scopes = new Set(OAUTH2.scopes);
    for (const op of OPERATIONS) {
      for (const s of op.auth.oauth2User ?? []) expect(scopes.has(s), `${op.id} scope ${s}`).toBe(true);
      expect(op.auth.bearer || op.auth.oauth2User || op.auth.oauth1User, `${op.id} has no auth`).toBeTruthy();
    }
  });

  it('marks streams as GET operations and keeps no prose from the spec', () => {
    for (const op of OPERATIONS) {
      if (op.streaming) expect(op.method).toBe('GET');
      expect(op).not.toHaveProperty('description');
      expect(op).not.toHaveProperty('summary');
    }
    expect(OPERATIONS.some((op) => op.streaming)).toBe(true);
  });
});

describe('operation lookup', () => {
  it('finds an operation by id, case-insensitively, or by route in either path style', () => {
    const byId = getOperation('getUsersFollowers');
    expect(getOperation('getusersfollowers')).toBe(byId);
    expect(getOperation('GET /2/users/{id}/followers')).toBe(byId);
    expect(getOperation('get /2/users/:id/followers')).toBe(byId);
  });

  it('suggests near names for a typo', () => {
    try {
      getOperation('getUsersFollowrs');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.code).toBe('unknown_operation');
      expect(err.suggestions).toContain('getUsersFollowers');
    }
  });

  it('filters by query words, tag, write and streaming', () => {
    const followers = listOperations({ query: 'followers' }).map((op) => op.id);
    expect(followers).toContain('getUsersFollowers');
    expect(listOperations({ tag: 'Posts' }).every((op) => op.tag === 'Posts')).toBe(true);
    expect(listOperations({ write: true }).every((op) => op.write)).toBe(true);
    expect(listOperations({ streaming: true }).every((op) => op.streaming)).toBe(true);
    const tags = listTags();
    expect(tags.reduce((n, t) => n + t.count, 0)).toBe(OPERATIONS.length);
  });
});

describe('published rate limits', () => {
  it('parses into app and user limits with positive numbers', () => {
    expect(RATE_LIMITS.length).toBeGreaterThan(50);
    for (const entry of RATE_LIMITS) {
      expect(entry.limits.length).toBeGreaterThan(0);
      for (const l of entry.limits) {
        expect(['app', 'user']).toContain(l.scope);
        expect(l.requests).toBeGreaterThan(0);
        expect(l.windowSeconds).toBeGreaterThan(0);
      }
    }
  });

  it('matches routes whatever the path parameters are called', () => {
    const a = rateLimitsFor('GET', '/2/tweets/{id}');
    expect(a.length).toBeGreaterThan(0);
    expect(rateLimitsFor('get', '/2/tweets/:tweet_id')).toEqual(a);
    expect(rateLimitsFor('GET', '/2/does/not/exist')).toEqual([]);
  });

  it('is attached to described operations', () => {
    expect(describeOperation('searchPostsRecent').rateLimits.length).toBeGreaterThan(0);
  });
});
