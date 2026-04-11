import { beforeAll } from 'vitest';

beforeAll(() => {
  process.env.TZ = 'America/Jamaica';
});
