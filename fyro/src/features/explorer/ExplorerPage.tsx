import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { PageHeader, Card, Select, Segmented, Button, DataTable, Skeleton, toast, Pill } from '@/components/ui';
import { BarsChart, AreaTrend } from '@/components/charts';
import { useExplorer } from '@/hooks/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { downloadCsv, fmt, WEEKS, weekLabel } from '@/lib';

const DEFAULTS = { by: 'issue', metric: 'count', week: '41', chart: 'bar' };
const BY = ['issue', 'region', 'district', 'store', 'channel', 'language', 'function', 'severity', 'format', 'day'];

export default function ExplorerPage() {
  const { t } = useTranslation();
  const [f, set] = useUrlState(DEFAULTS);
  const q = useExplorer({ by: f.by, metric: f.metric, week: f.week === 'all' ? undefined : f.week });
  const rows = q.data?.rows ?? [];
  const data = rows.slice(0, 15).map((r) => ({ name: r.label.length > 26 ? r.label.slice(0, 25) + '…' : r.label, value: f.metric === 'rate' ? Number(r.rate.toFixed(2)) : r.count }));
  return (
    <div>
      <PageHeader title={t('Data explorer')} subtitle={t('Group any slice of the 40,000 records, chart it and export the table as CSV.')}
        actions={<Button size="sm" icon={<Download className="h-4 w-4" />} disabled={!rows.length} onClick={() => { downloadCsv(`fyro-${f.by}-week${f.week}.csv`, rows.map((r) => ({ group: r.label, records: r.count, actionable: r.actionable, s1: r.s1, rate_per_1k_tx: r.rate.toFixed(3) }))); toast.success(t('CSV exported')); }}>{t('Export CSV')}</Button>} />
      <Card className="mb-5 !p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label={t('Group by')} value={f.by} onChange={(v) => set({ by: v })} options={BY.map((b) => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) }))} />
        <Select label={t('Week')} value={f.week} onChange={(v) => set({ week: v })} options={[{ value: 'all', label: t('All 6 weeks') }, ...[...WEEKS].reverse().map((w) => ({ value: String(w), label: weekLabel(w) }))]} />
        <div><div className="mb-1.5 px-1 text-xs font-semibold text-ink/75">{t('Metric')}</div><Segmented size="sm" label="Metric" value={f.metric} onChange={(v) => set({ metric: v })} options={[{ value: 'count', label: t('Count') }, { value: 'rate', label: t('Rate / 1k tx') }]} /></div>
        <div><div className="mb-1.5 px-1 text-xs font-semibold text-ink/75">{t('Chart')}</div><Segmented size="sm" label="Chart" value={f.chart} onChange={(v) => set({ chart: v })} options={[{ value: 'bar', label: t('Bars') }, { value: 'area', label: t('Area') }]} /></div>
      </div></Card>
      <Card className="mb-5">{q.isLoading ? <Skeleton className="h-72" /> : f.chart === 'area' || f.by === 'day' ? <AreaTrend data={data} x="name" keys={['value']} height={300} /> : <BarsChart data={data} x="name" keys={['value']} horizontal height={Math.max(260, data.length * 30)} />}</Card>
      <Card pad={false}><DataTable dense rows={rows} rowKey={(r) => r.key} loading={q.isLoading} error={q.error as Error | null} onRetry={() => void q.refetch()} columns={[
        { key: 'l', header: t('Group'), cell: (r) => <span className="font-medium">{r.label}</span> },
        { key: 'c', header: t('Records'), align: 'right', cell: (r) => <span className="tabular-nums">{fmt(r.count)}</span> },
        { key: 'a', header: t('Actionable'), align: 'right', cell: (r) => <span className="tabular-nums">{fmt(r.actionable)}</span> },
        { key: 's', header: 'S1', align: 'right', cell: (r) => <Pill tone={r.s1 ? 'dark' : 'soft'}>{r.s1}</Pill> },
        { key: 'r', header: t('Rate / 1k tx'), align: 'right', cell: (r) => <span className="tabular-nums">{r.rate.toFixed(2)}</span> },
      ]} /></Card>
    </div>
  );
}
