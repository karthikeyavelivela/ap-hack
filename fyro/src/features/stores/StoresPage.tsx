import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Table2, Search } from 'lucide-react';
import { PageHeader, Card, Select, Input, Segmented, Pill, DataTable, Pagination, Skeleton, EmptyState, QueryError, Button } from '@/components/ui';
import { useStores } from '@/hooks/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { useUI } from '@/store';
import { STORE_TIER, TARA_STATE } from '@/assets';
import { DISTRICTS } from '@/mocks/geo';
import { fmt } from '@/lib';

const DEFAULTS = { view: 'cards', region: '', district: '', format: '', q: '', size: '', page: '1', sort: 'rate' };
const PAGE = 18;

export default function StoresPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const uiRegion = useUI((s) => s.region);
  const [f, set] = useUrlState(DEFAULTS);
  const q = useStores({ region: f.region || (uiRegion !== 'all' ? uiRegion : undefined), district: f.district || undefined, format: f.format || undefined, q: f.q || undefined });
  const rows = useMemo(() => {
    let r = q.data ?? [];
    if (f.size === 'small') r = r.filter((s) => s.sqft < 10000);
    if (f.size === 'mid') r = r.filter((s) => s.sqft >= 10000 && s.sqft < 30000);
    if (f.size === 'large') r = r.filter((s) => s.sqft >= 30000);
    return r.slice().sort((a, b) => (f.sort === 'rate' ? b.ratePer1k - a.ratePer1k : f.sort === 'count' ? b.weekIssues - a.weekIssues : f.sort === 'size' ? b.sqft - a.sqft : a.code.localeCompare(b.code)));
  }, [q.data, f.size, f.sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(Number(f.page), pages);
  const slice = rows.slice((page - 1) * PAGE, page * PAGE);
  const dOpts = DISTRICTS.filter((d) => !f.region || d.region === f.region);

  return (
    <div>
      <PageHeader title={t('Store directory')} subtitle={t('{{n}} stores across 26 districts. Rates are issues per 1,000 transactions this week.', { n: q.data?.length ?? '…' })}
        actions={<Segmented size="sm" label="View" value={f.view} onChange={(v) => set({ view: v })} options={[{ value: 'cards', label: <><LayoutGrid className="h-3.5 w-3.5" />{t('Cards')}</> }, { value: 'table', label: <><Table2 className="h-3.5 w-3.5" />{t('Table')}</> }]} />} />
      <Card className="mb-5 !p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input className="sm:col-span-2" aria-label={t('Search')} icon={<Search className="h-4 w-4" />} placeholder={t('Search code, name or district')} value={f.q} onChange={(e) => set({ q: e.target.value, page: '1' })} />
          <Select size="sm" aria-label={t('Region')} value={f.region} onChange={(v) => set({ region: v, district: '', page: '1' })} options={[{ value: '', label: t('All regions') }, { value: 'uttarandhra', label: 'Uttarandhra' }, { value: 'coastal', label: 'Coastal Andhra' }, { value: 'rayalaseema', label: 'Rayalaseema' }]} />
          <Select size="sm" aria-label={t('District')} value={f.district} onChange={(v) => set({ district: v, page: '1' })} options={[{ value: '', label: t('All districts') }, ...dOpts.map((d) => ({ value: d.id, label: d.name }))]} />
          <Select size="sm" aria-label={t('Format')} value={f.format} onChange={(v) => set({ format: v, page: '1' })} options={[{ value: '', label: t('All formats') }, { value: 'Hypermarket', label: 'Hypermarket' }, { value: 'Supermarket', label: 'Supermarket' }, { value: 'Express', label: 'Express' }]} />
          <Select size="sm" aria-label={t('Size')} value={f.size} onChange={(v) => set({ size: v, page: '1' })} options={[{ value: '', label: t('Any size') }, { value: 'small', label: '< 10k sq ft' }, { value: 'mid', label: '10–30k sq ft' }, { value: 'large', label: '30k+ sq ft' }]} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink/60"><span><b className="text-ink">{rows.length}</b> {t('stores')}</span>
          <Select size="sm" aria-label={t('Sort')} className="w-44" value={f.sort} onChange={(v) => set({ sort: v })} options={[{ value: 'rate', label: t('Sort: issue rate') }, { value: 'count', label: t('Sort: issue count') }, { value: 'size', label: t('Sort: size') }, { value: 'code', label: t('Sort: code') }]} /></div>
      </Card>

      {q.isError ? <Card><QueryError error={q.error as Error} onRetry={() => void q.refetch()} /></Card> : f.view === 'table' ? (
        <Card pad={false}>
          <DataTable rows={slice} rowKey={(s) => s.id} loading={q.isLoading} onRowClick={(s) => nav(`/app/stores/${s.id}`)} columns={[
            { key: 'code', header: t('Store'), cell: (s) => <div><div className="font-semibold">{s.code}</div><div className="text-xs text-ink/60">{s.name}</div></div> },
            { key: 'dist', header: t('District'), hideOnMobile: true, cell: (s) => s.districtName },
            { key: 'fmt', header: t('Format'), cell: (s) => <Pill>{s.format}</Pill> },
            { key: 'sq', header: t('Sq ft'), align: 'right', hideOnMobile: true, cell: (s) => <span className="tabular-nums">{fmt(s.sqft)}</span> },
            { key: 'tx', header: t('Weekly tx'), align: 'right', hideOnMobile: true, cell: (s) => <span className="tabular-nums">{fmt(s.weeklyTx)}</span> },
            { key: 'n', header: t('Issues'), align: 'right', cell: (s) => <span className="tabular-nums">{s.weekIssues}</span> },
            { key: 'r', header: t('Rate / 1k'), align: 'right', cell: (s) => <Pill tone={s.ratePer1k > 1.2 ? 'dark' : 'soft'}>{s.ratePer1k.toFixed(2)}</Pill> },
          ]} empty={{ title: t('No stores match') }} />
        </Card>
      ) : q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : slice.length === 0 ? <Card><EmptyState src={TARA_STATE.box} title={t('No stores match')} action={<Button size="sm" variant="secondary" onClick={() => set({ ...DEFAULTS })}>{t('Clear filters')}</Button>} /></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {slice.map((s) => (
            <button key={s.id} onClick={() => nav(`/app/stores/${s.id}`)} className="card card-hover flex items-center gap-4 p-4 text-left">
              <img src={STORE_TIER[s.format]} alt="" className="h-24 w-28 shrink-0 object-contain" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="font-bold">{s.code}</span><Pill>{s.format}</Pill></div>
                <div className="truncate text-sm text-ink/70">{s.name}</div><div className="truncate text-xs text-ink/55">{s.districtName} · {fmt(s.sqft)} sq ft</div>
                <div className="mt-2 flex items-center gap-3"><div><div className="text-lg font-bold tabular-nums leading-none">{s.weekIssues}</div><div className="text-[10px] text-ink/55">{t('issues')}</div></div><div><div className="text-lg font-bold tabular-nums leading-none">{s.ratePer1k.toFixed(2)}</div><div className="text-[10px] text-ink/55">{t('per 1k tx')}</div></div></div>
              </div>
            </button>
          ))}
        </div>
      )}
      <Pagination page={page} pages={pages} onPage={(p) => set({ page: String(p) })} total={rows.length} pageSize={PAGE} />
    </div>
  );
}
