import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { PageHeader, Card, Select, Segmented, Pill, Skeleton, Button, QueryError } from '@/components/ui';
import { APMap, HeatLegend } from '@/components/APMap';
import { useMapData, useTaxonomy } from '@/hooks/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { REGIONS, DISTRICT_BY_ID, RegionId } from '@/mocks/geo';
import { cn } from '@/lib';

const DEFAULTS = { region: '', district: '', issue: '', metric: 'rate' };

export default function MapPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [f, set] = useUrlState(DEFAULTS);
  const tax = useTaxonomy();
  const q = useMapData(f.issue || undefined);
  const d = q.data;
  const district = f.district ? DISTRICT_BY_ID.get(f.district) : null;
  const region = (district?.region ?? (f.region || null)) as RegionId | null;
  const metric = (r: { rate: number; count: number }) => (f.metric === 'rate' ? r.rate : r.count);
  const values = useMemo(() => (d ? Object.fromEntries(d.districts.map((x) => [x.id, metric(x)])) : undefined), [d, f.metric]); // eslint-disable-line react-hooks/exhaustive-deps
  const level = district ? 'store' : region ? 'district' : 'state';
  const back = () => (district ? set({ district: '' }, { replace: false }) : set({ region: '' }, { replace: false }));

  const rows = !d ? [] : level === 'state' ? d.regions.map((r) => ({ id: r.id, name: r.name, sub: `${r.stores} ${t('stores')}`, v: metric(r), s1: r.s1, em: r.emerging, go: () => set({ region: r.id }, { replace: false }) }))
    : level === 'district' ? d.districts.filter((x) => x.region === region).sort((a, b) => metric(b) - metric(a)).map((x) => ({ id: x.id, name: x.name, sub: `${x.stores} ${t('stores')}`, v: metric(x), s1: x.s1, em: x.emerging, go: () => set({ district: x.id }, { replace: false }) }))
      : d.stores.filter((s) => s.districtId === district!.id).sort((a, b) => metric(b) - metric(a)).map((s) => ({ id: s.id, name: `${s.id} · ${s.name}`, sub: s.format, v: metric(s), s1: s.s1, em: s.emerging ? 1 : 0, go: () => nav(`/app/stores/${s.id}`) }));
  const max = Math.max(0.0001, ...rows.map((r) => r.v));
  const issueLabel = f.issue ? tax.data?.find((i) => i.id === f.issue)?.label : t('All issues');

  return (
    <div>
      <PageHeader title={t('Andhra Pradesh map')} subtitle={t('Drill from state to region, district and store. Colour shows {{m}} for {{i}}.', { m: f.metric === 'rate' ? t('issues per 1,000 transactions') : t('issue count'), i: issueLabel ?? '' })}
        actions={<>
          <Select size="sm" aria-label={t('Issue layer')} className="w-56" value={f.issue} onChange={(v) => set({ issue: v })} options={[{ value: '', label: t('Heat layer: all issues') }, ...(tax.data ?? []).map((i) => ({ value: i.id, label: i.label }))]} />
          <Segmented size="sm" label="Metric" value={f.metric} onChange={(v) => set({ metric: v })} options={[{ value: 'rate', label: t('Rate') }, { value: 'count', label: t('Count') }]} />
        </>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {level !== 'state' && <Button size="sm" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={back}>{district ? t('Back to {{r}}', { r: REGIONS.find((r) => r.id === region)?.name }) : t('Back to state')}</Button>}
        <nav aria-label="Map level" className="flex items-center gap-1 text-sm">
          <button onClick={() => set({ region: '', district: '' }, { replace: false })} className={cn('rounded-full px-3 py-1', level === 'state' ? 'bg-b900 font-semibold text-inverse' : 'hover:bg-surface2')}>{t('Andhra Pradesh')}</button>
          {region && <><ChevronRight className="h-3.5 w-3.5 opacity-50" /><button onClick={() => set({ district: '' }, { replace: false })} className={cn('rounded-full px-3 py-1', level === 'district' ? 'bg-b900 font-semibold text-inverse' : 'hover:bg-surface2')}>{REGIONS.find((r) => r.id === region)!.name}</button></>}
          {district && <><ChevronRight className="h-3.5 w-3.5 opacity-50" /><span className="rounded-full bg-b900 px-3 py-1 font-semibold text-inverse">{district.name}</span></>}
        </nav>
      </div>
      {q.isError ? <Card><QueryError error={q.error as Error} onRetry={() => void q.refetch()} /></Card> : (
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <Card className="!p-3 sm:!p-5"><div className="aspect-[8/7] w-full">
            {q.isLoading || !d ? <Skeleton className="h-full w-full" /> : <APMap values={values} focusRegion={region} focusDistrict={district?.id ?? null} stores={d.stores} pulse={d.stores.filter((s) => s.emerging).map((s) => s.id)}
              onRegion={(r) => set({ region: r }, { replace: false })} onDistrict={(id) => set({ district: id }, { replace: false })} onStore={(id) => nav(`/app/stores/${id}`)} />}
          </div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><HeatLegend label={t('Low')} labelHi={t('High')} /><span className="text-xs text-ink/55">{t('Pulsing pins are stores flagged by the radar.')}</span></div></Card>
          <Card pad={false}>
            <div className="border-b border-line p-5"><div className="eyebrow">{level === 'state' ? t('Regions') : level === 'district' ? t('Districts') : t('Stores')}</div><div className="text-lg font-semibold">{district?.name ?? (region ? REGIONS.find((r) => r.id === region)!.name : t('Andhra Pradesh'))}</div></div>
            <ul className="max-h-[560px] divide-y divide-line/60 overflow-y-auto">
              {q.isLoading ? Array.from({ length: 6 }).map((_, i) => <li key={i} className="p-4"><Skeleton className="h-10" /></li>) : rows.map((r) => (
                <li key={r.id}><button onClick={r.go} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-surface2/70">
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{r.name}</div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface2"><div className="h-full rounded-full bg-caramel" style={{ width: `${(r.v / max) * 100}%` }} /></div></div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5"><span className="text-sm font-bold tabular-nums">{f.metric === 'rate' ? r.v.toFixed(2) : Math.round(r.v)}</span><span className="text-[11px] text-ink/55">{r.sub}</span></div>
                  {r.em > 0 && <Pill tone="dark">{r.em}</Pill>}
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink/35" />
                </button></li>
              ))}
              {!q.isLoading && rows.length === 0 && <li className="p-8 text-center text-sm text-ink/60">{t('No stores in this view.')}</li>}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
