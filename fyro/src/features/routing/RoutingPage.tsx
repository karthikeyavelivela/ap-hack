import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save, ShieldAlert, Clock, RotateCcw } from 'lucide-react';
import { PageHeader, Card, SectionTitle, DataTable, Select, Button, Pill, SeverityBadge, Skeleton, toast, Segmented, LinkButton } from '@/components/ui';
import { Async } from '@/components/Async';
import { incidentColumns } from '@/features/dashboard/widgets';
import { useRouting, useQueue, useTaxonomy, useFunctions } from '@/hooks/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { useAuth } from '@/store';
import { api } from '@/services/api';
import { LAYER_ICON } from '@/assets';
import { cn } from '@/lib';
import type { FnId, Sev } from '@/mocks/taxonomy';

export default function RoutingPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const canEdit = user.role === 'HEAD_OFFICE';
  const rules = useRouting();
  const tax = useTaxonomy();
  const fns = useFunctions();
  const [f, set] = useUrlState({ fn: user.fn ?? 'store_ops' });
  const queue = useQueue(f.fn);
  const [owners, setOwners] = useState<Record<string, FnId>>({});
  const [sla, setSla] = useState<Record<string, Record<number, number>>>({});
  const dirty = JSON.stringify(owners) !== JSON.stringify(rules.data?.issueOwner ?? {}) || JSON.stringify(sla) !== JSON.stringify(rules.data?.sla ?? {});
  useEffect(() => { if (rules.data) { setOwners({ ...rules.data.issueOwner }); setSla(JSON.parse(JSON.stringify(rules.data.sla))); } }, [rules.data]);

  const save = useMutation({
    mutationFn: () => api.put('/api/routing/rules', { issueOwner: owners, sla }),
    onSuccess: () => { toast.success(t('Routing rules saved')); void qc.invalidateQueries({ queryKey: ['routing'] }); void qc.invalidateQueries({ queryKey: ['queue'] }); void qc.invalidateQueries({ queryKey: ['taxonomy'] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const fnOptions = (fns.data ?? []).map((x) => ({ value: x.id, label: x.name }));
  const laneIdx = (fns.data ?? []).findIndex((x) => x.id === f.fn);

  return (
    <div>
      <PageHeader title={t('Routing board')} subtitle={t('Every issue type has an owner and a clock. Head Office can change owners and SLAs; changes apply to new routing immediately.')}
        actions={canEdit && <><Button variant="secondary" size="sm" icon={<RotateCcw className="h-4 w-4" />} disabled={!dirty} onClick={() => { if (rules.data) { setOwners({ ...rules.data.issueOwner }); setSla(JSON.parse(JSON.stringify(rules.data.sla))); } }}>{t('Discard')}</Button><Button size="sm" icon={<Save className="h-4 w-4" />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>{t('Save changes')}</Button></>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" data-tour="routing-lanes">
        <Async q={fns} skeleton={<>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36" />)}</>}>
          {(list) => list.map((fn, i) => {
            const active = fn.id === f.fn;
            const n = rules.data ? Object.values(rules.data.issueOwner).filter((o) => o === fn.id).length : 0;
            return (
              <button key={fn.id} onClick={() => set({ fn: fn.id })} aria-pressed={active} className={cn('rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5', active ? 'border-b900 bg-b900 text-inverse shadow-lift' : 'border-line bg-surface shadow-soft hover:border-b500')}>
                <div className="flex items-center justify-between"><span className={cn('flex h-10 w-10 items-center justify-center rounded-xl p-1', active ? 'bg-white/90' : 'bg-surface2')}><img src={LAYER_ICON[[0, 4, 5, 2, 1][i] ?? 7]} alt="" className="h-full w-full object-contain" /></span><Pill tone={active ? 'sand' : 'soft'}>{n} {t('issue types')}</Pill></div>
                <div className="mt-3 text-[15px] font-semibold">{fn.name}</div>
                <div className={cn('text-xs', active ? 'text-white/70' : 'text-ink/60')}>{fn.owner}</div>
                <div className={cn('mt-2 flex items-center gap-1 text-xs', active ? 'text-white/80' : 'text-ink/60')}><Clock className="h-3.5 w-3.5" />S1 {sla[fn.id]?.[1] ?? fn.slaHours[1]}h · S2 {sla[fn.id]?.[2] ?? fn.slaHours[2]}h</div>
              </button>
            );
          })}
        </Async>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <Card pad={false}>
          <div className="p-5 pb-2 sm:p-6 sm:pb-2"><SectionTitle title={`${fnOptions[laneIdx]?.label ?? ''} · ${t('queue')}`} eyebrow={`${queue.data?.total ?? '…'} ${t('open')} · ${queue.data?.breached ?? '…'} ${t('past SLA')}`} /></div>
          <DataTable columns={incidentColumns(t, { sla: true })} rows={queue.data?.items.slice(0, 12)} rowKey={(r) => r.id} loading={queue.isLoading} error={queue.error as Error | null} onRetry={() => void queue.refetch()} onRowClick={(r) => nav(`/app/incidents/${r.id}`)} dense skeletonRows={6} empty={{ title: t('Queue clear'), body: t('Nothing is waiting for this function.') }} />
          {queue.data && queue.data.total > 12 && <div className="p-4 text-center"><LinkButton to={`/app/incidents?fn=${f.fn}`} variant="secondary" size="sm">{t('See all {{n}} in Incidents', { n: queue.data.total })}</LinkButton></div>}
        </Card>
        <div className="space-y-6">
          <Card className="border-b700">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-b900 text-white"><ShieldAlert className="h-5 w-5" /></span>
              <div><h2 className="text-base font-semibold">{t('Escalation rule')}</h2>
                {rules.data ? <p className="mt-1 text-sm leading-relaxed text-ink/75">{rules.data.escalation.anyS1 ? t('Any S1 incident, or ') : ''}{t('an incident in {{c}}+ channels with {{r}}+ records inside {{h}} hours at severity S2 or worse.', { c: rules.data.escalation.minChannels, r: rules.data.escalation.minRecords, h: rules.data.escalation.windowHours })}</p> : <Skeleton className="mt-2 h-14" />}
                <LinkButton to="/app/policy" size="sm" variant="secondary" className="mt-3">{t('Edit in policy')}</LinkButton></div></div>
          </Card>
          <Card>
            <SectionTitle title={t('SLA by severity (hours)')} eyebrow={canEdit ? t('Editable') : t('Read only')} />
            <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="py-2 text-left text-[11px] font-semibold uppercase text-ink/50">{t('Function')}</th>{[1, 2, 3, 4].map((s) => <th key={s} className="px-1 py-2"><SeverityBadge s={s as Sev} /></th>)}</tr></thead>
              <tbody>{(fns.data ?? []).map((fn) => (
                <tr key={fn.id} className="border-t border-line/60"><td className="py-2 pr-2 font-medium">{fn.name.replace('People & ', '')}</td>
                  {[1, 2, 3, 4].map((s) => <td key={s} className="px-1 py-1.5 text-center">{canEdit ? <input aria-label={`${fn.name} S${s} hours`} type="number" min={1} max={999} value={sla[fn.id]?.[s] ?? ''} onChange={(e) => setSla((x) => ({ ...x, [fn.id]: { ...(x[fn.id] ?? {}), [s]: Math.max(1, Number(e.target.value) || 1) } }))} className="w-14 rounded-full border border-line bg-surface2 px-2 py-1 text-center text-[13px] tabular-nums outline-none focus:border-caramel" /> : <span className="tabular-nums">{sla[fn.id]?.[s]}</span>}</td>)}</tr>
              ))}</tbody></table></div>
          </Card>
        </div>
      </div>

      <Card pad={false} className="mt-6">
        <div className="p-5 pb-2 sm:p-6 sm:pb-2"><SectionTitle title={t('Issue type → owner')} eyebrow={`${tax.data?.length ?? 30} ${t('issue types')}`} /></div>
        <DataTable dense columns={[
          { key: 'issue', header: t('Issue type'), cell: (r) => <span className="font-medium">{r.label}</span> },
          { key: 'floor', header: t('Severity floor'), cell: (r) => <SeverityBadge s={r.floor} /> },
          { key: 'pol', header: t('Policy'), hideOnMobile: true, cell: (r) => r.policy ? <Pill tone="dark" className="capitalize">{r.policy}</Pill> : <span className="text-ink/40">—</span> },
          { key: 'owner', header: t('Owner'), cell: (r) => canEdit ? <Select size="sm" aria-label={`Owner of ${r.label}`} className="max-w-[210px]" value={owners[r.id] ?? r.fn} onChange={(v) => setOwners((o) => ({ ...o, [r.id]: v as FnId }))} options={fnOptions} /> : <Pill>{fnOptions.find((o) => o.value === (owners[r.id] ?? r.fn))?.label}</Pill> },
        ]} rows={tax.data} rowKey={(r) => r.id} loading={tax.isLoading} error={tax.error as Error | null} onRetry={() => void tax.refetch()} skeletonRows={8} />
      </Card>
    </div>
  );
}
