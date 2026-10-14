import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save, ShieldAlert } from 'lucide-react';
import { PageHeader, Card, SectionTitle, Switch, Slider, Button, Pill, SeverityBadge, toast, Skeleton } from '@/components/ui';
import { usePolicy, IncidentRow } from '@/hooks/queries';
import { useDebounced } from '@/hooks/useUrlState';
import { useAuth } from '@/store';
import { api } from '@/services/api';
import { POLICY_LABEL } from '@/mocks/taxonomy';
import type { Policy } from '@/mocks/db';
import { Link } from 'react-router-dom';

export default function PolicyPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const edit = useAuth((s) => s.user!.role === 'HEAD_OFFICE');
  const pol = usePolicy();
  const [d, setD] = useState<Policy | null>(null);
  useEffect(() => { if (pol.data) setD(JSON.parse(JSON.stringify(pol.data))); }, [pol.data]);
  const key = useDebounced(JSON.stringify(d), 300);
  const preview = useQuery({ queryKey: ['policy-preview', key], enabled: !!d, queryFn: () => api.post<{ total: number; current: number; preview: number; delta: number; sample: IncidentRow[] }>('/api/policy/preview', { escalation: d!.escalation, forced: d!.forced }), staleTime: 30000 });
  const save = useMutation({ mutationFn: () => api.put('/api/policy', { escalation: d!.escalation, forced: d!.forced }), onSuccess: () => { toast.success(t('Policy saved')); void qc.invalidateQueries({ queryKey: ['policy'] }); void qc.invalidateQueries({ queryKey: ['routing'] }); void qc.invalidateQueries({ queryKey: ['kpis'] }); }, onError: (e: Error) => toast.error(e.message) });
  const dirty = JSON.stringify(d) !== JSON.stringify(pol.data);
  if (!d) return <div><PageHeader title={t('Severity & escalation policy')} /><Skeleton className="h-96" /></div>;
  const e = d.escalation;
  const setE = (p: Partial<Policy['escalation']>) => setD({ ...d, escalation: { ...e, ...p } });
  return (
    <div>
      <PageHeader title={t('Severity & escalation policy')} subtitle={edit ? t('Changes show a live preview of how many incidents this week would escalate.') : t('Read-only. Head Office edits policy.')} actions={edit && <Button icon={<Save className="h-4 w-4" />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>{t('Save policy')}</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card><SectionTitle title={t('Policy floors (force S1)')} eyebrow="severity = max(floor, model)" />
            <div className="mt-3 space-y-2">{(Object.keys(POLICY_LABEL) as (keyof typeof POLICY_LABEL)[]).map((k) => <div key={k} className="flex items-center justify-between rounded-2xl bg-surface2/60 px-4 py-3"><div><div className="text-sm font-semibold">{POLICY_LABEL[k]}</div><div className="text-xs text-ink/55">{t('Always S1 when matched')}</div></div><Switch label={POLICY_LABEL[k]} checked={d.forced[k]} onChange={(b) => edit && setD({ ...d, forced: { ...d.forced, [k]: b } })} className={edit ? '' : 'pointer-events-none opacity-60'} /></div>)}</div></Card>
          <Card><SectionTitle title={t('Escalation rule')} />
            <div className="mt-3 space-y-5">
              <div className="flex items-center justify-between rounded-2xl bg-surface2/60 px-4 py-3"><span className="text-sm font-semibold">{t('Escalate any S1 incident')}</span><Switch label="Any S1" checked={e.anyS1} onChange={(b) => edit && setE({ anyS1: b })} className={edit ? '' : 'pointer-events-none opacity-60'} /></div>
              <fieldset disabled={!edit} className="grid gap-5 sm:grid-cols-2">
                <Slider label={t('Minimum channels')} value={e.minChannels} min={1} max={4} onChange={(n) => setE({ minChannels: n })} />
                <Slider label={t('Minimum records')} value={e.minRecords} min={3} max={80} onChange={(n) => setE({ minRecords: n })} />
                <Slider label={t('Window (hours)')} value={e.windowHours} min={24} max={168} step={24} onChange={(n) => setE({ windowHours: n })} />
                <Slider label={t('Emerging score')} value={e.emergingScore} min={50} max={100} onChange={(n) => setE({ emergingScore: n })} />
              </fieldset>
            </div></Card>
        </div>
        <Card className="h-fit border-b700 lg:sticky lg:top-24">
          <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-b700" /><h2 className="text-base font-semibold">{t('Live preview · week 41')}</h2></div>
          {preview.isLoading || !preview.data ? <Skeleton className="mt-4 h-40" /> : (
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-surface2/60 p-3"><div className="text-2xl font-bold tabular-nums">{preview.data.current}</div><div className="text-[11px] text-ink/60">{t('now')}</div></div><div className="rounded-2xl bg-b900 p-3 text-inverse"><div className="text-2xl font-bold tabular-nums">{preview.data.preview}</div><div className="text-[11px] text-white/75">{t('with changes')}</div></div><div className="rounded-2xl bg-surface2/60 p-3"><div className="text-2xl font-bold tabular-nums">{preview.data.delta >= 0 ? '+' : ''}{preview.data.delta}</div><div className="text-[11px] text-ink/60">{t('difference')}</div></div></div>
              <p className="mt-3 text-xs text-ink/60">{t('of {{n}} incidents active this week would escalate to Head Office.', { n: preview.data.total })}</p>
              <ul className="mt-3 space-y-2">{preview.data.sample.map((i) => <li key={i.id}><Link to={`/app/incidents/${i.id}`} className="flex items-center gap-2 rounded-xl border border-line p-2.5 text-sm hover:border-b500"><SeverityBadge s={i.severity} /><span className="min-w-0 flex-1 truncate">{i.issueLabel} · {i.storeId}</span><Pill>{i.count}</Pill></Link></li>)}</ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
