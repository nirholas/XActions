// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { describe, expect, it } from 'vitest';
import { XApiClient, getOperation, prepareParams } from '../../src/xapi/index.js';

const op = (id) => getOperation(id);

function issuesOf(fn) {
  try {
    fn();
  } catch (err) {
    expect(err.code).toBe('invalid_params');
    return err.issues;
  }
  throw new Error('expected invalid_params');
}

describe('prepareParams', () => {
  it('fills path parameters and builds the query', () => {
    const { path, query } = prepareParams(op('getUsersByUsername'), { username: 'XDevelopers', 'user.fields': ['created_at', 'public_metrics'] });
    expect(path).toBe('/2/users/by/username/XDevelopers');
    expect(query.get('user.fields')).toBe('created_at,public_metrics');
  });

  it('checks path parameters against the published pattern before sending', () => {
    const issues = issuesOf(() => prepareParams(op('getUsersByUsername'), { username: 'a b/../c' }));
    expect(issues[0]).toMatch(/username: "a b\/\.\.\/c" does not match/);
  });

  it('accepts a comma string for a list parameter', () => {
    const { query } = prepareParams(op('getUsersByUsername'), { username: 'x', 'user.fields': 'created_at, id' });
    expect(query.get('user.fields')).toBe('created_at,id');
  });

  it('reports every problem at once: missing, unknown with a suggestion, out of range', () => {
    const issues = issuesOf(() => prepareParams(op('getUsersFollowers'), { max_result: 5, max_results: 5000 }));
    expect(issues.some((i) => i.includes('missing required parameter "id"'))).toBe(true);
    expect(issues.some((i) => i.includes('unknown parameter "max_result"') && i.includes('max_results'))).toBe(true);
    expect(issues.some((i) => i.includes('max_results must be at most'))).toBe(true);
  });

  it('refuses a value outside a closed enum', () => {
    const issues = issuesOf(() => prepareParams(op('searchPostsRecent'), { query: 'x', sort_order: 'newest' }));
    expect(issues[0]).toMatch(/sort_order: "newest" is not allowed/);
  });

  it('warns about, but still sends, a field the published list lacks', () => {
    const { query, warnings } = prepareParams(op('searchPostsRecent'), { query: 'x', 'post.fields': 'created_at,brand_new_field' });
    expect(query.get('post.fields')).toBe('created_at,brand_new_field');
    expect(warnings[0]).toMatch(/brand_new_field/);
  });

  it('maps tweet.fields and post.fields onto whichever name the operation declares', () => {
    const declared = op('searchPostsRecent').params.map((p) => p.name);
    const target = declared.includes('post.fields') ? 'post.fields' : 'tweet.fields';
    const other = target === 'post.fields' ? 'tweet.fields' : 'post.fields';
    const { query } = prepareParams(op('searchPostsRecent'), { query: 'x', [other]: 'created_at' });
    expect(query.get(target)).toBe('created_at');
    expect(query.has(other)).toBe(false);
  });
});

describe('XApiClient.build', () => {
  const client = new XApiClient({ bearerToken: 'B', fetch: async () => { throw new Error('no network in build'); } });

  it('checks the request body against the operation', () => {
    expect(() => client.build('createPosts', {}, {})).toThrow(/needs a request body/);
    expect(() => client.build('getUsersMe', {}, { body: { a: 1 } })).toThrow(/takes no request body/);
  });

  it('describes a call without credentials only when asked to', () => {
    const bare = new XApiClient({});
    expect(() => bare.build('getUsersByUsername', { username: 'x' })).toThrow(/No credential/);
    const plan = bare.build('getUsersByUsername', { username: 'x' }, { requireAuth: false });
    expect(plan.auth).toBeNull();
    expect(plan.url).toBe('https://api.x.com/2/users/by/username/x');
  });
});
