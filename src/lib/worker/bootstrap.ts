import { startWorker } from './scoring-worker';

declare global {
  var __workerStarted: boolean | undefined;
}

export function bootstrapWorker(): void {
  if (globalThis.__workerStarted) return;
  globalThis.__workerStarted = true;
  // Don't start during `next build` (phase-production-build) or tests.
  // The worker polls the DB continuously; during build there is no DB to hit.
  if (
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.NODE_ENV !== 'test' &&
    process.env.WORKER_DISABLED !== '1'
  ) {
    startWorker();
  }
}
