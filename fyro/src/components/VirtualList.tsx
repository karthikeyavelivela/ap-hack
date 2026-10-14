import { ReactNode, useEffect, useRef, useState } from 'react';

/** Fixed-row-height windowing: renders only visible rows (plus overscan) of potentially 40k items. */
export function VirtualList<T>({ items, rowHeight, height, render, onNearEnd, className, overscan = 6 }: {
  items: T[]; rowHeight: number; height: number | string; render: (item: T, index: number) => ReactNode; onNearEnd?: () => void; className?: string; overscan?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [vh, setVh] = useState(600);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setVh(el.clientHeight));
    ro.observe(el); setVh(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((top + vh) / rowHeight) + overscan);
  useEffect(() => { if (onNearEnd && items.length && end >= items.length - 8) onNearEnd(); }, [end, items.length, onNearEnd]);
  return (
    <div ref={ref} className={className} style={{ height, overflowY: 'auto', position: 'relative' }} onScroll={(e) => setTop((e.target as HTMLDivElement).scrollTop)} role="list">
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        {items.slice(start, end).map((it, i) => (
          <div key={start + i} role="listitem" style={{ position: 'absolute', top: (start + i) * rowHeight, left: 0, right: 0, height: rowHeight }}>{render(it, start + i)}</div>
        ))}
      </div>
    </div>
  );
}
