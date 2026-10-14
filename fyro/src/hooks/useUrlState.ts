import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Filters live in the URL so browser back/forward restores them. */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [sp, setSp] = useSearchParams();
  const state = useMemo(() => {
    const o: Record<string, string> = {};
    for (const k of Object.keys(defaults)) o[k] = sp.get(k) ?? defaults[k];
    return o as T;
  }, [sp, defaults]);
  const set = useCallback((patch: Partial<T>, opts?: { replace?: boolean }) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '' || v === defaults[k]) n.delete(k); else n.set(k, String(v));
      }
      return n;
    }, { replace: opts?.replace ?? true });
  }, [setSp, defaults]);
  return [state, set, sp] as const;
}

import { useEffect, useState } from 'react';
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => { const h = setTimeout(() => setV(value), ms); return () => clearTimeout(h); }, [value, ms]);
  return v;
}
