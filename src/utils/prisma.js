// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The Prisma client the whole process shares.
 *
 * Prisma 7 connects through a driver adapter and no longer loads .env or reads
 * DATABASE_URL by itself. The URL is read when Prisma first connects, not on
 * import, so a module can load before .env does, and a missing URL fails the
 * first query with a message that names it, as it did on Prisma 5.
 *
 * One client means one connection pool, rather than one per module.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function pgAdapterFromEnv() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Point it at the PostgreSQL database (see docs/database.md).');
  }
  // `?schema=` was a Prisma URL parameter; the pg adapter takes it as an option.
  const schema = new URL(url).searchParams.get('schema') ?? undefined;
  return new PrismaPg({ connectionString: url }, { schema });
}

const adapter = {
  provider: 'postgres',
  adapterName: '@prisma/adapter-pg',
  connect: () => pgAdapterFromEnv().connect(),
};

export const prisma = new PrismaClient({ adapter });
