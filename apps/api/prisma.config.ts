import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

config({
  path: path.resolve(dirname, '../../.env'),
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});