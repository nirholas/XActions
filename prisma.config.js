// Prisma CLI configuration (migrate, generate, studio, seed).
// Prisma 7 reads the database URL from here instead of schema.prisma, and no
// longer loads .env on its own.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    // Unset during image builds, where `prisma generate` needs no database.
    url: process.env.DATABASE_URL,
  },
});
