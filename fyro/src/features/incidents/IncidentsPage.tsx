import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LayoutList, Columns3, Search, GripVertical } from 'lucide-react';
import { PageHeader, Card, DataTable, Pagination, Segmented, Select, Pill, SeverityBadge, Input, toast, Skeleton, EmptyState, QueryError } from '@/components/ui';
import { useIncidents, IncidentRow, Paged } from '@/hooks/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { useUI } from '@/store';
import { api } from '@/services/api';
import { incidentColumns } from '@/features/dashboard/widgets';
import { CHANNEL_ICON, TARA_STATE } from '@/assets';
import { cn } from '@/lib';
import type { IncidentStatus } from '@/mocks/derived';

const DEFAULTS = { view: 'table', status: '', severity: '', region: '', fn: '', channel: '', q: '', sort: 'severity', page: '1' };
const COLS: { id: IncidentStatus; label: string }[] = [
  { id: 'new', label: 'New' }, { id: 'acknowledged', label: 'Acknowledged' }, { id: 'in_progress', label: 'In progress' }, { id: 'resolved', label: 'Resolved' },
];

function Card2({ i, onOpen, onMove }: { i: IncidentRow; onOpen: () => void; onMove: (s: IncidentStatus) => void }) {
  const { t } = useTranslation();
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', i.id); e.dataTransfer.effectAllowed = 'move'; }}
      className="group cursor-grab rounded-2xl border border-line bg-surface p-3.5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift active:cursor-grabbing">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onOpen} className="min-w-0 text-left"><div className="truncate text-sm font-semibold hover:underline">{i.issueLabel}</div><div className="truncate text-xs text-ink/60">{i.id} · {i.storeId}</div></button>
        <GripVertical className="h-4 w-4 shrink-0 text-ink/30" aria-hidden />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><SeverityBadge s={i.severity} /><span className="text-xs tabular-nums text-ink/60">{i.count} {t('reports')}</span></div>
        <div className="flex -space-x-1.5">{i.channels.map((c) => <img key={c} src={CHANNEL_ICON[c]} alt={c} className="h-6 w-6 rounded-full border-2 border-surface bg-surface2 object-contain p-0.5" />)}</div>
      </div>
      <label className="mt-2.5 block"><span className="sr-only">{t('Move to')}</span>
        <select value={i.status} onChange={(e) => onMove(e.target.value as IncidentStatus)} className="w-full cursor-pointer rounded-full border border-line bg-surface2 px-3 py-1 text-xs font-medium outline-none focus:border-caramel">
          {COLS.map((c) => <option key={c.id} value={c.id}>{t(c.label)}</option>)}
        </select>
      </label>
    </div>
  );
}

export default function IncidentsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const uiRegion = useUI((s) => s.region);
  const [f, set] = useUrlState(DEFAULTS);
  const [over, setOver] = useState<string | null>(null);
  const kanban = f.view === 'kanban';
  const params = useMemo(() => ({ status: kanban ? undefined : f.status || undefined, severity: f.severity || undefined, region: f.region || (uiRegion !== 'all' ? uiRegion : undefined), fn: f.fn || undefined, channel: f.channel || undefined, q: f.q || undefined, sort: f.sort, page: kanban ? 1 : Number(f.page), pageSize: kanban ? 200 : 25 }), [f, kanban, uiRegion]);
  const q = useIncidents(params);

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) => api.patch(`/api/incidents/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['incidents'] });
      const snaps = qc.getQueriesData<Paged<IncidentRow>>({ queryKey: ['incidents'] });
      qc.setQueriesData<Paged<IncidentRow>>({ queryKey: ['incidents'] }, (old) => old && { ...old, items: old.items.map((i) => (i.id === id ? { ...i, status } : i)) });
      return { snaps };
    },
    onError: (e: Error, _v, ctx) => { ctx?.snaps.forEach(([k, d]) => qc.setQueryData(k, d)); toast.error(e.message); },
    onSuccess: (_d, v) => toast.success(t('Moved {{id}} to {{status}}', { id: v.id, status: v.status.replace('_', ' ') })),
    onSettled: () => { void qc.invalidateQueries({ queryKey: ['incidents'] }); void qc.invalidateQueries({ queryKey: ['kpis'] }); },
  });

  const data = q.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const byCol = useMemo(() => Object.fromEntries(COLS.map((c) => [c.id, (data?.items ?? []).filter((i) => i.status === c.id)])) as Record<IncidentStatus, IncidentRow[]>, [data]);

  return (
    <div>
      <PageHeader title={t('Incidents')} subtitle={t('Records from every channel, merged by store, issue family and a 72 hour window.')} actions={
        <Segmented size="sm" label="View" value={f.view} onChange={(v) => set({ view: v })} options={[{ value: 'table', label: <><LayoutList className="h-3.5 w-3.5" />{t('Table')}</> }, { value: 'kanban', label: <><Columns3 className="h-3.5 w-3.5" />{t('Board')}</> }]} />
      } />
      <Card className="mb-5 !p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input className="sm:col-span-2" aria-label={t('Search')} icon={<Search className="h-4 w-4" />} placeholder={t('Search incident, store or ID')} value={f.q} onChange={(e) => set({ q: e.target.value, page: '1' })} />
          {!kanban && <Select size="sm" aria-label={t('Status')} value={f.status} onChange={(v) => set({ status: v, page: '1' })} options={[{ value: '', label: t('All statuses') }, ...COLS.map((c) => ({ value: c.id, label: t(c.label) }))]} />}
          <Select size="sm" aria-label={t('Severity')} value={f.severity} onChange={(v) => set({ severity: v, page: '1' })} options={[{ value: '', label: t('Any severity') }, { value: '1', label: 'S1 Critical' }, { value: '2', label: 'S2 High' }, { value: '3', label: 'S3 Medium' }, { value: '4', label: 'S4 Low' }]} />
          <Select size="sm" aria-label={t('Region')} value={f.region} onChange={(v) => set({ region: v, page: '1' })} options={[{ value: '', label: t('All regions') }, { value: 'uttarandhra', label: 'Uttarandhra' }, { value: 'coastal', label: 'Coastal Andhra' }, { value: 'rayalaseema', label: 'Rayalaseema' }]} />
          <Select size="sm" aria-label={t('Function')} value={f.fn} onChange={(v) => set({ fn: v, page: '1' })} options={[{ value: '', label: t('All functions') }, { value: 'store_ops', label: 'Store Ops' }, { value: 'supply_chain', label: 'Supply Chain' }, { value: 'merch', label: 'Merchandising' }, { value: 'digital', label: 'Digital' }, { value: 'hr', label: 'People & HR' }]} />
          <Select size="sm" aria-label={t('Channel')} value={f.channel} onChange={(v) => set({ channel: v, page: '1' })} options={[{ value: '', label: t('All channels') }, { value: 'review', label: t('Online reviews') }, { value: 'app', label: t('App ratings') }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'ticket', label: t('Call tickets') }]} />
          <Select size="sm" aria-label={t('Sort')} value={f.sort} onChange={(v) => set({ sort: v })} options={[{ value: 'severity', label: t('Sort: severity') }, { value: 'recent', label: t('Sort: most recent') }, { value: 'count', label: t('Sort: most reports') }, { value: 'due', label: t('Sort: SLA due') }]} />
        </div>
        {data?.counts && !kanban && (
          <div className="mt-3 flex flex-wrap gap-2">
            {COLS.map((c) => <button key={c.id} onClick={() => set({ status: f.status === c.id ? '' : c.id, page: '1' })} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition', f.status === c.id ? 'border-b900 bg-b900 text-inverse' : 'border-line bg-surface2 hover:border-b500')}>{t(c.label)} · {data.counts![c.id]}</button>)}
            <span className="ml-auto self-center text-xs text-ink/55">{data.total.toLocaleString('en-IN')} {t('incidents')}</span>
          </div>
        )}
      </Card>

      {!kanban ? (
        <Card pad={false}>
          <DataTable columns={incidentColumns(t)} rows={data?.items} rowKey={(r) => r.id} loading={q.isLoading} error={q.error as Error | null} onRetry={() => void q.refetch()} onRowClick={(r) => nav(`/app/incidents/${r.id}`)}
            empty={{ title: t('No incidents match'), body: t('Clear a filter or widen the date range.') }} />
          <div className="px-5 pb-5"><Pagination page={Number(f.page)} pages={pages} onPage={(p) => set({ page: String(p) })} total={data?.total} pageSize={data?.pageSize} /></div>
        </Card>
      ) : q.isError ? <Card><QueryError error={q.error as Error} onRetry={() => void q.refetch()} /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="kanban">
          {COLS.map((c) => (
            <div key={c.id} onDragOver={(e) => { e.preventDefault(); setOver(c.id); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain'); const inc = data?.items.find((i) => i.id === id); if (inc && inc.status !== c.id) move.mutate({ id, status: c.id }); }}
              className={cn('flex min-h-[320px] flex-col rounded-[22px] border bg-surface2/50 p-3 transition', over === c.id ? 'border-caramel bg-surface2 shadow-glow' : 'border-line')}>
              <div className="mb-3 flex items-center justify-between px-1.5"><h2 className="text-sm font-semibold">{t(c.label)}</h2><Pill tone="dark">{byCol[c.id].length}</Pill></div>
              <div className="space-y-2.5 overflow-y-auto" style={{ maxHeight: 640 }}>
                {q.isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />) : byCol[c.id].slice(0, 30).map((i) => <Card2 key={i.id} i={i} onOpen={() => nav(`/app/incidents/${i.id}`)} onMove={(s) => move.mutate({ id: i.id, status: s })} />)}
                {!q.isLoading && byCol[c.id].length === 0 && <EmptyState src={TARA_STATE.sleeping} title={t('Nothing here')} size={90} />}
                {byCol[c.id].length > 30 && <p className="px-2 text-center text-xs text-ink/55">+{byCol[c.id].length - 30} {t('more. Use filters to narrow down.')}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
