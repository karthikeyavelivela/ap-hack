import { generateAll } from './recordsGen';

// Seeded record generation off the main thread.
self.onmessage = () => {
  const records = generateAll();
  (self as unknown as Worker).postMessage(records);
};
