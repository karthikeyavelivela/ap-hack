import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, Inbox } from 'lucide-react';
import { PageHeader, Card, SectionTitle, Pill, Skeleton, QueryError, DataTable, Stat, Sprite } from '@/components/ui';
import { BarsChart, AreaTrend, Donut } from '@/components/charts';
import { incidentColumns } from '@/features/dashboard/widgets';
import { useStore } from '@/hooks/queries';
import { useAuth } from '@/store';
import { STORE_TIER, TARA_ERROR } from '@/assets';
import { fmt, fmtDate } from '@/lib';
import { REGIONS } from '@/mocks/geo';

export default function StoreProfile() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useAuth((s) => s.user)!;
  const q = useStore(id);
  const fallback = user.role === 'STORE_MANAGER' ? '/app' : '/app/stores';

  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-80" /><Skeleton className="h-44" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>;
  if (q.isError || !q.data) {
    const e = q.error as Error & { status?: number };
    return (
      <div><PageHeader title={e?.status === 403 ? t('Not your store') : t('Store not available')} back={fallback} />
        <Card className="flex flex-col items-center py-10 text-center"><Sprite src={e?.status === 403 ? TARA_ERROR.forbidden : TARA_ERROR.lost} size={200} /><QueryError error={e ?? new Error('Unknown')} onRetry={() => void q.refetch()} compact /></Card></div>
    );
  }
  const { store: s, rates, channelMix, incidents, health, storeRate, districtRate, staffNotes, series } = q.data;
  const region = REGIONS.find((r) => r.id === s.region)!;
  const rel = storeRate / Math.max(0.01, districtRate);

  return (
    <div>
      <PageHeader back={fallback} crumbs={[{ label: t('Stores'), to: '/app/stores' }, { label: region.name }, { label: s.code }]} title={<span className="flex flex-wrap items-center gap-3">{s.code} · {s.name}<Pill tone="dark">{s.format}</Pill></span>}
        subtitle={`${s.districtName} · ${region.name} · ${t('manager')} ${s.manager} · ${t('opened')} ${s.opened}`}
        actions={<><Link to={`/app/map?district=${s.districtId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-caramel hover:underline"><MapIcon className="h-4 w-4" />{t('Show on map')}</Link><Link to={`/app/inbox?store=${s.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-caramel hover:underline"><Inbox className="h-4 w-4" />{t('Store feedback')}</Link></>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <Card className="flex flex-col items-center text-center"><img src={STORE_TIER[s.format]} alt="" className="h-36 w-auto object-contain" />
          <div className="mt-3 grid w-full grid-cols-2 gap-4 text-left"><Stat label={t('Health score')} value={health} sub="/ 100" /><Stat label={t('Area')} value={`${fmt(s.sqft)}`} sub="sq ft" /><Stat label={t('Weekly transactions')} value={fmt(s.weeklyTx)} /><Stat label={t('Exposure')} value={`${(s.weeklyTx / 1000).toFixed(1)}k`} sub={t('per week')} /></div></Card>
        <Card>
          <SectionTitle title={t('Issue rate vs district')} eyebrow={t('Per 1,000 transactions, this week')} right={<Pill tone={rel > 1.2 ? 'dark' : 'soft'}>{rel.toFixed(1)}× {t('district average')}</Pill>} />
          {rates.length ? <BarsChart data={rates.map((r) => ({ name: r.label, raw: Number(r.raw.toFixed(2)), shrunk: Number(r.shrunk.toFixed(2)), district: Number(r.district.toFixed(2)) }))} x="name" keys={['raw', 'shrunk', 'district']} horizontal height={Math.max(220, rates.length * 48)} labels={{ raw: t('Raw rate'), shrunk: t('Shrunk rate'), district: t('District rate') }} /> : <p className="py-10 text-center text-sm text-ink/60">{t('No issues this week.')}</p>}
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card><SectionTitle title={t('Issues per day')} eyebrow={t('Last 42 days')} /><AreaTrend data={series.map((v, i) => ({ d: `D${i + 1}`, v }))} x="d" keys={['v']} height={190} /></Card>
        <Card><SectionTitle title={t('Channel mix')} /><Donut height={190} data={channelMix.map((c) => ({ name: c.label, value: c.count }))} center={<div><div className="text-2xl font-bold">{channelMix.reduce((a, c) => a + c.count, 0)}</div><div className="text-[11px] text-ink/60">{t('records')}</div></div>} />
          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">{channelMix.map((c) => <span key={c.channel} className="truncate">{c.label}: <b className="tabular-nums">{c.count}</b></span>)}</div></Card>
        <Card><SectionTitle title={t('Staff notes')} />{staffNotes.length ? <ul className="mt-3 space-y-3">{staffNotes.map((n) => <li key={n.id} className="rounded-2xl bg-surface2/60 p-3 text-sm">“{n.text}”<div className="mt-1 text-xs text-ink/55">{n.author} · {fmtDate(n.ts)}</div></li>)}</ul> : <p className="py-8 text-center text-sm text-ink/60">{t('No staff notes this week.')}</p>}</Card>
      </div>
      <Card pad={false} className="mt-5">
        <div className="p-5 pb-2 sm:p-6 sm:pb-2"><SectionTitle title={t('Incident history')} eyebrow={`${incidents.length} ${t('recent')}`} /></div>
        <DataTable columns={incidentColumns(t)} rows={incidents} rowKey={(r) => r.id} onRowClick={(r) => nav(`/app/incidents/${r.id}`)} dense empty={{ title: t('No incidents'), body: t('This store has no merged incidents yet.') }} />
      </Card>
    </div>
  );
}
