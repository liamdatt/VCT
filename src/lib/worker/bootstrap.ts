import { startWorker } from './scoring-worker';

declare global {
  var __workerStarted: boolean | undefined;
}

export function bootstrapWorker(): void {
  if (globalThis.__workerStarted) return;
  globalThis.__workerStarted = true;
  if (process.env.NODE_ENV !== 'test' && process.env.WORKER_DISABLED !== '1') {
    startWorker();
  }
}
