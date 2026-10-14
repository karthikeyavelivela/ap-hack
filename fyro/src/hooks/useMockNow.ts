import { useEffect, useState } from 'react';
import { MOCK_NOW } from '@/lib';

/** Mock "now" that keeps ticking so SLA countdowns feel alive. */
const start = Date.now();
export function useMockNow(everyMs = 1000) {
  const [now, setNow] = useState(MOCK_NOW + (Date.now() - start));
  useEffect(() => {
    const h = setInterval(() => setNow(MOCK_NOW + (Date.now() - start)), everyMs);
    return () => clearInterval(h);
  }, [everyMs]);
  return now;
}
