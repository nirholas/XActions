// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * An in-memory stand-in for @prisma/client, for API tests that need rows
 * without Postgres. Every model is a plain array of row objects; queries
 * support equality, OR/AND/NOT and the few operators the API uses (in, notIn,
 * lte, gte). Calls are recorded in `db.calls` as [model, method, where].
 *
 *   vi.mock('@prisma/client', () => import('../fixtures/memoryPrisma.js'));
 *   import { db } from '../fixtures/memoryPrisma.js';
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

const tables = new Map();
const calls = [];

function table(model) {
  if (!tables.has(model)) tables.set(model, []);
  return tables.get(model);
}

function matchValue(value, cond) {
  if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
    if ('notIn' in cond) return !cond.notIn.includes(value);
    if ('in' in cond) return cond.in.includes(value);
    if ('lte' in cond) return value <= cond.lte;
    if ('gte' in cond) return value >= cond.gte;
    return false;
  }
  return value === cond;
}

function matches(row, where = {}) {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return cond.some((w) => matches(row, w));
    if (key === 'AND') return cond.every((w) => matches(row, w));
    if (key === 'NOT') return !matches(row, cond);
    return matchValue(row[key], cond);
  });
}

const newRow = (model, data) => ({ id: `${model}_${table(model).length + 1}`, createdAt: new Date(), ...data });

function newest(rows, orderBy) {
  if (!orderBy?.createdAt) return rows;
  const sorted = [...rows].sort((a, b) => a.createdAt - b.createdAt);
  return orderBy.createdAt === 'desc' ? sorted.reverse() : sorted;
}

function delegate(model) {
  const record = (method, where) => calls.push([model, method, where]);
  return {
    async findUnique({ where }) {
      record('findUnique', where);
      return table(model).find((r) => matches(r, where)) || null;
    },
    async findFirst({ where, orderBy } = {}) {
      record('findFirst', where);
      return newest(table(model).filter((r) => matches(r, where)), orderBy)[0] || null;
    },
    async findMany({ where, orderBy } = {}) {
      record('findMany', where);
      return newest(table(model).filter((r) => matches(r, where)), orderBy);
    },
    async count({ where } = {}) {
      record('count', where);
      return table(model).filter((r) => matches(r, where)).length;
    },
    async create({ data }) {
      record('create', data);
      const row = newRow(model, data);
      table(model).push(row);
      return row;
    },
    async update({ where, data }) {
      record('update', where);
      const row = table(model).find((r) => matches(r, where));
      if (!row) throw Object.assign(new Error(`No ${model} row matches`), { code: 'P2025' });
      return Object.assign(row, data);
    },
    async updateMany({ where, data }) {
      record('updateMany', where);
      const rows = table(model).filter((r) => matches(r, where));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    },
    async upsert({ where, create, update }) {
      record('upsert', where);
      const row = table(model).find((r) => matches(r, where));
      if (row) return Object.assign(row, update);
      const created = newRow(model, create);
      table(model).push(created);
      return created;
    },
    async delete({ where }) {
      record('delete', where);
      const rows = table(model);
      const i = rows.findIndex((r) => matches(r, where));
      if (i === -1) throw Object.assign(new Error(`No ${model} row matches`), { code: 'P2025' });
      return rows.splice(i, 1)[0];
    },
    async deleteMany({ where } = {}) {
      record('deleteMany', where);
      const rows = table(model);
      const keep = rows.filter((r) => !matches(r, where));
      const count = rows.length - keep.length;
      rows.splice(0, rows.length, ...keep);
      return { count };
    },
  };
}

/** The shared tables and call log. */
export const db = {
  tables,
  calls,
  table,
  reset() {
    tables.clear();
    calls.length = 0;
  },
};

/** Drop-in for @prisma/client's PrismaClient: any model name is a table. */
export class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'then' || typeof prop !== 'string') return target[prop];
        if (prop.startsWith('$')) return async (arg) => (typeof arg === 'function' ? arg(target) : undefined);
        return delegate(prop);
      },
    });
  }
}
