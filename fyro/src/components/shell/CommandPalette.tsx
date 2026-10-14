import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, CornerDownLeft, Store, Siren, Inbox, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth, useUI } from '@/store';
import { NAV, NAV_FOOT, canAccess } from '@/app/nav';
import { api } from '@/services/api';
import { cn } from '@/lib';
import type { IncidentRow, Paged } from '@/hooks/queries';
import type { FeedbackRecord } from '@/mocks/recordsGen';
import type { Store as StoreT } from '@/mocks/geo';

interface Item { id: string; group: string; label: string; sub?: string; to: string; icon: JSX.Element }

export function CommandPalette() {
  const { paletteOpen, setPalette } = useUI();
  const user = useAuth((s) => s.user);
  const nav = useNavigate();
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(!useUI.getState().paletteOpen); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setPalette]);
  useEffect(() => { if (paletteOpen) { setQ(''); setDq(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 40); } }, [paletteOpen]);
  useEffect(() => { const h = setTimeout(() => setDq(q.trim()), 220); return () => clearTimeout(h); }, [q]);

  const enabled = paletteOpen && dq.length >= 2;
  const stores = useQuery({ queryKey: ['palette-stores', dq], enabled, queryFn: () => api.get<StoreT[]>('/api/stores', { q: dq }) });
  const incs = useQuery({ queryKey: ['palette-inc', dq], enabled, queryFn: () => api.get<Paged<IncidentRow>>('/api/incidents', { q: dq, pageSize: 5 }) });
  const recs = useQuery({ queryKey: ['palette-rec', dq], enabled, queryFn: () => api.get<{ items: FeedbackRecord[] }>('/api/feedback', { q: dq, limit: 5 }) });

  const items: Item[] = useMemo(() => {
    const role = user?.role;
    const low = q.trim().toLowerCase();
    const pages = role ? [...NAV, ...NAV_FOOT].filter((n) => canAccess(n.to, role) && (!low || t(n.label).toLowerCase().includes(low) || n.label.toLowerCase().includes(low))).slice(0, low ? 6 : 8)
      .map((n) => ({ id: n.to, group: t('Pages'), label: t(n.label), to: n.to, icon: <LayoutGrid className="h-4 w-4" /> })) : [];
    const s = (stores.data ?? []).slice(0, 5).map((x) => ({ id: x.id, group: t('Stores'), label: `${x.code} · ${x.name}`, sub: x.districtName, to: `/app/stores/${x.id}`, icon: <Store className="h-4 w-4" /> }));
    const i = (incs.data?.items ?? []).map((x) => ({ id: x.id, group: t('Incidents'), label: `${x.id} · ${x.issueLabel}`, sub: `${x.storeId} · S${x.severity}`, to: `/app/incidents/${x.id}`, icon: <Siren className="h-4 w-4" /> }));
    const r = (recs.data?.items ?? []).map((x) => ({ id: x.id, group: t('Records'), label: `${x.id} · ${x.text.replace(/\s+/g, ' ').slice(0, 70)}`, sub: x.storeId, to: `/app/inbox?record=${x.id}`, icon: <Inbox className="h-4 w-4" /> }));
    return [...pages, ...s, ...i, ...r];
  }, [q, user, stores.data, incs.data, recs.data, t]);

  useEffect(() => { setIdx(0); }, [items.length]);
  const go = (it: Item) => { setPalette(false); nav(it.to); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && items[idx]) go(items[idx]);
    else if (e.key === 'Escape') setPalette(false);
  };
  const loading = enabled && (stores.isFetching || incs.isFetching || recs.isFetching);
  let lastGroup = '';
  return createPortal(
    <AnimatePresence>
      {paletteOpen && (
        <motion.div className="fixed inset-0 z-[150] flex items-start justify-center px-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-b900/45 backdrop-blur-sm" onClick={() => setPalette(false)} aria-hidden />
          <motion.div role="dialog" aria-modal="true" aria-label={t('Search')} initial={{ y: -16, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -10, opacity: 0 }} className="relative w-full max-w-xl overflow-hidden rounded-[24px] border border-line bg-surface shadow-lift">
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <Search className="h-5 w-5 text-b500" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={t('Search stores, incidents, records and pages…')} className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink/40" aria-label={t('Search')} />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-ink/50">ESC</kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {items.map((it, i) => {
                const head = it.group !== lastGroup ? ((lastGroup = it.group), true) : false;
                return (
                  <div key={`${it.group}-${it.id}`}>
                    {head && <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink/45">{it.group}</div>}
                    <button onMouseEnter={() => setIdx(i)} onClick={() => go(it)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', i === idx ? 'bg-surface2' : '')}>
                      <span className="text-b500">{it.icon}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{it.label}</span>{it.sub && <span className="block truncate text-xs text-ink/55">{it.sub}</span>}</span>
                      {i === idx && <CornerDownLeft className="h-3.5 w-3.5 text-ink/40" />}
                    </button>
                  </div>
                );
              })}
              {loading && <p className="px-3 py-3 text-sm text-ink/55">{t('Searching…')}</p>}
              {!loading && !items.length && <p className="px-3 py-8 text-center text-sm text-ink/55">{t('No results. Try a store code like ATP-07.')}</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
