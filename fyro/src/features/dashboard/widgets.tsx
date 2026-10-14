import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Radar as RadarIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, Skeleton, TrendArrow, Pill, SeverityBadge, SectionTitle, Bar, Sprite, EmptyState, DataTable, Column, LinkButton } from '@/components/ui';
import { Async } from '@/components/Async';
import { Spark } from '@/components/charts';
import { APMap, HeatLegend } from '@/components/APMap';
import { useKpis, useEmerging, useTrends, useIncidents, useMapData, IncidentRow, Kpi } from '@/hooks/queries';
import { A, TARA_STATE, TARA_POSE, CHANNEL_ICON } from '@/assets';
import { fmt, fmtDate, cn, slaLabel } from '@/lib';
import type { RegionId } from '@/mocks/geo';

export function KpiGrid({ items }: { items?: { key: string; label: string; value: ReactNode; delta?: number; invert?: boolean; sub?: string }[] }) {
  if (!items) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[118px]" />)}</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" data-tour="kpis">
      {items.map((k, i) => (
        <motion.div key={k.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35 }}>
          <Card hover className="h-full !p-5">
            <div className="text-xs font-semibold text-ink/60">{k.label}</div>
            <div className="mt-1.5 text-[28px] font-bold leading-none tabular-nums">{k.value}</div>
            <div className="mt-3 flex items-center gap-2 text-xs text-ink/60">
              {k.delta !== undefined && <TrendArrow dir={k.delta > 0.5 ? 'up' : k.delta < -0.5 ? 'down' : 'flat'} value={`${k.delta > 0 ? '+' : ''}${k.delta}%`} />}
              {k.sub && <span>{k.sub}</span>}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

const dl = (k: Kpi | undefined) => k?.delta;
export function useKpiItems() {
  const { t } = useTranslation();
  const q = useKpis();
  const d = q.data;
  const items = d && [
    { key: 'records', label: t('Records processed'), value: fmt(d.records.value), delta: dl(d.records), sub: t('vs last week') },
    { key: 'incidents', label: t('Deduped incidents'), value: fmt(d.incidents.value), delta: dl(d.incidents), sub: t('vs last week') },
    { key: 'esc', label: t('Escalations'), value: fmt(d.escalations.value), delta: dl(d.escalations), sub: t('open rule hits') },
    { key: 'precision', label: t('Alert precision'), value: `${d.precision.value}%`, sub: `95% CI ${(d.precision.lo * 100).toFixed(0)}–${(d.precision.hi * 100).toFixed(0)}` },
    { key: 'lead', label: t('Avg lead time'), value: `${d.leadTime.value} d`, sub: t('before weekly report') },
  ];
  return { items, q };
}

export function EmergingWidget({ limit = 3, region }: { limit?: number; region?: RegionId }) {
  const { t } = useTranslation();
  const q = useEmerging();
  return (
    <Card className="relative overflow-hidden !p-0" data-tour="emerging-widget">
      <div className="absolute inset-0 bg-b900" />
      <img src={A.radarMap} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-t from-b900 via-b900/60 to-transparent" />
      <div className="relative p-5 text-white sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><RadarIcon className="h-5 w-5 text-sand" /><h2 className="text-lg font-semibold">{t('Emerging-Issue Radar')}</h2></div>
          <Link to="/app/emerging" className="inline-flex items-center gap-1 text-sm font-semibold text-sand hover:underline">{t('Open radar')}<ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-4 space-y-2.5">
          <Async q={q} skeleton={<div className="space-y-2.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 !bg-white/10" />)}</div>}>
            {(d) => {
              const items = d.items.filter((e) => !region || e.region === region).slice(0, limit);
              if (!items.length) return <p className="rounded-2xl bg-white/10 p-4 text-sm text-white/80">{t('No emerging issues this week. The radar is quiet.')}</p>;
              return items.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <Link to={`/app/emerging?focus=${e.id}`} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3.5 backdrop-blur transition hover:bg-white/15">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full bg-sand text-b900"><span className="text-[15px] font-bold leading-none">{e.score}</span><span className="text-[8px] font-semibold uppercase">score</span></div>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{e.issueLabel}</div><div className="truncate text-xs text-white/70">{e.storeId} · {e.storeName}</div></div>
                    <div className="hidden w-24 sm:block"><Spark data={e.series.slice(-14)} color="#F4D9B2" /></div>
                  </Link>
                </motion.div>
              ));
            }}
          </Async>
        </div>
      </div>
    </Card>
  );
}

export function TopIssuesCard({ title }: { title?: string }) {
  const { t } = useTranslation();
  const q = useTrends();
  return (
    <Card>
      <SectionTitle title={title ?? t('Top 5 issues statewide')} eyebrow={t('This week')} right={<Link className="text-sm font-semibold text-caramel hover:underline" to="/app/explorer">{t('Explore')}</Link>} />
      <div className="mt-4 space-y-3.5">
        <Async q={q} skeleton={<Skeleton className="h-56" />}>
          {(d) => {
            const top = d.top.slice(0, 5);
            const max = Math.max(...top.map((x) => x.count), 1);
            return top.map((x, i) => (
              <div key={x.issue}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-b900 text-[10px] font-bold text-white">{i + 1}</span><span className="truncate font-medium">{x.label}</span></span>
                  <span className="flex shrink-0 items-center gap-2"><span className="tabular-nums text-ink/70">{x.count}</span><TrendArrow dir={x.trend} value={x.delta >= 0 ? `+${x.delta}` : x.delta} significant={x.significant} /></span>
                </div>
                <Bar value={x.count} max={max} tone={i === 0 ? 'dark' : 'caramel'} />
              </div>
            ));
          }}
        </Async>
      </div>
    </Card>
  );
}

export function RegionMapCard({ onRegion }: { onRegion?: (r: RegionId) => void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const q = useMapData();
  return (
    <Card className="flex flex-col">
      <SectionTitle title={t('Issue rate across Andhra Pradesh')} eyebrow={t('Per 1,000 transactions')} right={<LinkButton to="/app/map" variant="secondary" size="sm">{t('Open map')}</LinkButton>} />
      <div className="mt-3 flex-1">
        <Async q={q} skeleton={<Skeleton className="h-[340px]" />}>
          {(d) => {
            const values = Object.fromEntries(d.districts.map((x) => [x.id, x.rate]));
            return (
              <div className="grid items-center gap-4 md:grid-cols-[1.2fr_1fr]">
                <div className="aspect-[8/7]"><APMap values={values} stores={d.stores.filter((s) => s.emerging)} pulse={d.stores.filter((s) => s.emerging).map((s) => s.id)} onRegion={(r) => (onRegion ? onRegion(r) : nav(`/app/map?region=${r}`))} onDistrict={(id) => nav(`/app/map?district=${id}`)} showLabels /></div>
                <div className="space-y-3">
                  {d.regions.map((r) => (
                    <button key={r.id} onClick={() => nav(`/app/map?region=${r.id}`)} className="w-full rounded-2xl border border-line bg-surface2/50 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-b500">
                      <div className="flex items-center justify-between"><span className="text-sm font-semibold">{r.name}</span>{r.emerging > 0 && <Pill tone="dark">{r.emerging} {t('emerging')}</Pill>}</div>
                      <div className="mt-1 flex items-baseline gap-3 text-xs text-ink/65"><span className="text-lg font-bold text-ink tabular-nums">{r.rate.toFixed(2)}</span><span>{t('per 1k tx')}</span><span>·</span><span>{fmt(r.count)} {t('issues')}</span></div>
                    </button>
                  ))}
                  <HeatLegend label={t('Low')} labelHi={t('High')} />
                </div>
              </div>
            );
          }}
        </Async>
      </div>
    </Card>
  );
}

export function incidentColumns(t: (s: string) => string, opts: { sla?: boolean } = {}): Column<IncidentRow>[] {
  return [
    { key: 'sev', header: t('Sev'), cell: (r) => <SeverityBadge s={r.severity} />, className: 'w-20' },
    { key: 'issue', header: t('Incident'), cell: (r) => (
      <div className="min-w-0"><div className="truncate font-semibold">{r.issueLabel}</div><div className="truncate text-xs text-ink/60">{r.id} · {r.storeId} {r.storeName}</div></div>
    ) },
    { key: 'ch', header: t('Channels'), hideOnMobile: true, cell: (r) => <div className="flex -space-x-1.5">{r.channels.map((c) => <img key={c} src={CHANNEL_ICON[c]} alt={c} className="h-7 w-7 rounded-full border-2 border-surface bg-surface2 object-contain p-0.5" />)}</div> },
    { key: 'n', header: t('Reports'), align: 'right', hideOnMobile: true, cell: (r) => <span className="tabular-nums">{r.count}</span> },
    opts.sla
      ? { key: 'sla', header: 'SLA', cell: (r) => { const s = slaLabel(r.dueTs); return <Pill tone={s.breached ? 'dark' : 'soft'}>{s.text}</Pill>; } }
      : { key: 'last', header: t('Last report'), hideOnMobile: true, cell: (r) => <span className="text-ink/70">{fmtDate(r.lastTs)}</span> },
    { key: 'status', header: t('Status'), cell: (r) => <Pill tone={r.status === 'resolved' ? 'outline' : 'soft'} className="capitalize">{r.status.replace('_', ' ')}</Pill> },
  ];
}

export function EscalationsCard({ params }: { params?: Record<string, string | number | undefined> }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const q = useIncidents({ sort: 'severity', pageSize: 6, status: undefined, week: undefined, ...(params ?? {}), severity: params?.severity ?? 1 });
  return (
    <Card pad={false}>
      <div className="p-5 pb-2 sm:p-6 sm:pb-2"><SectionTitle title={t('Recent escalations')} eyebrow={t('S1 incidents')} right={<Link className="text-sm font-semibold text-caramel hover:underline" to="/app/incidents?severity=1">{t('View all')}</Link>} /></div>
      <DataTable columns={incidentColumns(t)} rows={q.data?.items.filter((i) => i.status !== 'resolved')} rowKey={(r) => r.id} loading={q.isLoading} error={q.error as Error | null} onRetry={() => void q.refetch()} onRowClick={(r) => nav(`/app/incidents/${r.id}`)} skeletonRows={4} dense empty={{ title: t('No S1 incidents'), body: t('Nothing critical is open right now.') }} />
    </Card>
  );
}

export function Greeting({ name, role, children }: { name: string; role: string; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Sprite src={TARA_POSE.welcome} size={84} className="hidden sm:block" />
        <div>
          <div className="eyebrow">{role}</div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[30px]">{t('Hello, {{name}}', { name: name.split(' ')[0] })}</h1>
          <p className="mt-0.5 text-sm text-ink/65">{t('Here is what the stores are telling us this week.')}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
export const _x = { cn, EmptyState, TARA_STATE };
