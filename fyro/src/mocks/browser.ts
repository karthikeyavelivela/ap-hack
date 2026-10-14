import { setupWorker } from 'msw/browser';
import { handlers, getDerived } from './handlers';

export async function startMocks() {
  const worker = setupWorker(...handlers);
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true, serviceWorker: { url: '/mockServiceWorker.js' } });
  // warm the seeded dataset (worker thread) while the login screen renders
  void getDerived();
}
