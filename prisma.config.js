// Prisma 7 config. Uses CommonJS to avoid needing tsx/ts-node at runtime.
// process.env.DATABASE_URL is provided by the container runtime.
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
