import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'node:child_process';

export const TEST_DB_URL =
  'postgresql://vct:vct_test_pw@localhost:5434/vctfantasy_test?schema=public';

export function newTestClient() {
  const adapter = new PrismaPg(TEST_DB_URL);
  return new PrismaClient({ adapter });
}

export function resetTestDb() {
  execSync(`DATABASE_URL="${TEST_DB_URL}" npx prisma migrate reset --force --skip-seed`, {
    stdio: 'inherit',
  });
}
