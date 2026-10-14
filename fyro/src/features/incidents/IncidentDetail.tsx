import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Siren, ArrowUpRight, CheckCircle2, Radar, MessageSquare, Send, Layers } from 'lucide-react';
import { PageHeader, Card, SectionTitle, SeverityBadge, Pill, Button, Select, Skeleton, Textarea, Modal, toast, Avatar, QueryError, Reveal } from '@/components/ui';
import { AreaTrend } from '@/components/charts';
import { useIncident, useIncidentMutations, useFunctions } from '@/hooks/queries';
import { useMockNow } from '@/hooks/useMockNow';
import { useAuth } from '@/store';
import { CHANNEL_ICON } from '@/assets';
import { fmtDate, slaLabel, cn } from '@/lib';
import { CHANNEL_LABEL } from '@/mocks/recordsGen';
import type { IncidentStatus } from '@/mocks/derived';

const STATUSES: IncidentStatus[] = ['new', 'acknowledged', 'in_progress', 'resolved'];

export default function IncidentDetail() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const q = useIncident(id);
  const m = useIncidentMutations(id);
  const fns = useFunctions();
  const user = useAuth((s) => s.user)!;
  const now = useMockNow();
  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState(false);
  const readOnly = user.role === 'ANALYST';

  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-40" /><div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
  if (q.isError || !q.data) {
    const e = q.error as Error & { status?: number };
    return <div><PageHeader title={e?.status === 404 ? t('Incident not found') : t('Could not load incident')} back="/app/incidents" /><Card><QueryError error={e ?? new Error('Unknown')} onRetry={() => void q.refetch()} /></Card></div>;
  }
  const { incident: i, records, evidence, series, byChannel, comments, activity } = q.data;
  const sla = slaLabel(i.dueTs, now);
  const owners = (fns.data ?? []).map((f) => f.owner);

  return (
    <div>
      <PageHeader
        back="/app/incidents" crumbs={[{ label: t('Incidents'), to: '/app/incidents' }, { label: i.id }]}
        title={<span className="flex flex-wrap items-center gap-3"><Siren className="h-6 w-6 text-b700" />{i.issueLabel}<SeverityBadge s={i.severity} long /></span>}
        subtitle={<span>{i.id} · <Link className="font-semibold text-caramel hover:underline" to={`/app/stores/${i.storeId}`}>{i.storeId} {i.storeName}</Link> · {i.districtName}</span>}
        actions={!readOnly && (
          <>
            <Button variant="secondary" icon={<ArrowUpRight className="h-4 w-4" />} disabled={i.escalated || m.escalate.isPending} onClick={() => setConfirm(true)}>{i.escalated ? t('Escalated') : t('Escalate')}</Button>
            <Button icon={<CheckCircle2 className="h-4 w-4" />} disabled={i.status === 'resolved'} loading={m.resolve.isPending} onClick={() => m.resolve.mutate(undefined, { onSuccess: () => toast.success(t('Incident resolved')), onError: (e) => toast.error((e as Error).message) })}>{i.status === 'resolved' ? t('Resolved') : t('Resolve')}</Button>
          </>
        )}
      />

      <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
        <div className="space-y-5">
          <Reveal>
            <Card>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div><div className="text-xs font-medium text-ink/60">{t('SLA')}</div><div className={cn('mt-1 inline-flex rounded-full px-3 py-1 text-sm font-bold', sla.breached ? 'bg-b900 text-inverse' : 'bg-surface2')}>{sla.text}</div><div className="mt-1 text-xs text-ink/55">{t('Due')} {fmtDate(i.dueTs)}</div></div>
                <div><div className="text-xs font-medium text-ink/60">{t('Channel diversity')}</div><div className="mt-1 flex items-center gap-2"><div className="flex -space-x-1.5">{i.channels.map((c) => <img key={c} src={CHANNEL_ICON[c]} alt={CHANNEL_LABEL[c]} title={CHANNEL_LABEL[c]} className="h-8 w-8 rounded-full border-2 border-surface bg-surface2 object-contain p-0.5" />)}</div><Pill tone="dark">{i.channels.length} / 4</Pill></div><div className="mt-1 text-xs text-ink/55">{i.channels.length >= 3 ? t('Strongly corroborated') : t('Needs more evidence')}</div></div>
                <div><div className="text-xs font-medium text-ink/60">{t('Source records')}</div><div className="mt-1 text-2xl font-bold tabular-nums">{i.count}</div><div className="text-xs text-ink/55">{fmtDate(i.firstTs)} → {fmtDate(i.lastTs)}</div></div>
                <div><div className="text-xs font-medium text-ink/60">{t('Owner')}</div><div className="mt-1 flex items-center gap-2"><Avatar name={i.owner} size={28} /><span className="text-sm font-semibold">{i.owner}</span></div><div className="mt-1 text-xs text-ink/55">{i.fnName}</div></div>
              </div>
              {!readOnly && (
                <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
                  <Select label={t('Status')} value={i.status} onChange={(v) => m.patch.mutate({ status: v as IncidentStatus }, { onSuccess: () => toast.success(t('Status updated')), onError: (e) => toast.error((e as Error).message) })} options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))} />
                  <Select label={t('Assign owner')} value={i.owner} onChange={(v) => m.patch.mutate({ owner: v }, { onSuccess: () => toast.success(t('Assigned to {{name}}', { name: v })), onError: (e) => toast.error((e as Error).message) })} options={[...new Set([i.owner, ...owners])].map((o) => ({ value: o, label: o }))} />
                  <Select label={t('Severity')} value={String(i.severity)} onChange={(v) => m.patch.mutate({ severity: Number(v) as 1 }, { onSuccess: () => toast.success(t('Severity updated')), onError: (e) => toast.error((e as Error).message) })} options={[{ value: '1', label: 'S1 Critical' }, { value: '2', label: 'S2 High' }, { value: '3', label: 'S3 Medium' }, { value: '4', label: 'S4 Low' }]} />
                </div>
              )}
            </Card>
          </Reveal>

          <Reveal delay={0.05}>
            <Card>
              <SectionTitle title={t('Evidence quotes')} eyebrow={t('One verbatim record per channel')} />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {evidence.map((e) => (
                  <Link key={e.id} to={`/app/inbox?record=${e.id}`} className="block rounded-2xl border border-line bg-surface2/50 p-4 transition hover:-translate-y-0.5 hover:border-b500">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink/65"><img src={CHANNEL_ICON[e.channel]} alt="" className="h-6 w-6 object-contain" />{CHANNEL_LABEL[e.channel]}<span className="ml-auto font-mono text-[11px]">{e.id}</span></div>
                    <p className="whitespace-pre-line text-sm italic leading-relaxed">“{e.text.replace(/^Agent:.*\n/gim, '').replace(/\nAgent:.*$/gim, '')}”</p>
                    <p className="mt-2 text-xs text-ink/60">{t('English')}: {e.gloss}</p>
                  </Link>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <SectionTitle title={t('Source timeline')} eyebrow={`${q.data.totalRecords} ${t('records, newest first')}`} />
              <ol className="relative mt-4 space-y-4 border-l-2 border-line pl-6">
                {records.slice(0, 24).map((r) => (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[33px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-surface2"><img src={CHANNEL_ICON[r.channel]} alt="" className="h-4 w-4 object-contain" /></span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink/60"><span className="font-semibold text-ink">{CHANNEL_LABEL[r.channel]}</span><span>{fmtDate(r.ts)}</span><Pill>{r.lang.toUpperCase()}</Pill><Link className="font-mono hover:underline" to={`/app/inbox?record=${r.id}`}>{r.id}</Link></div>
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm">{r.text.replace(/^Agent:.*\n/gim, '').replace(/\nAgent:.*$/gim, '')}</p>
                  </li>
                ))}
              </ol>
              {records.length > 24 && <p className="mt-3 text-center text-xs text-ink/55">{t('Showing 24 of {{n}}. Open the inbox filtered by this store for the rest.', { n: q.data.totalRecords })}</p>}
            </Card>
          </Reveal>
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle title={t('Reports per day')} eyebrow={t('Last 10 days')} />
            <AreaTrend data={series.map((s) => ({ day: `D${s.day - 34}`, count: s.count }))} x="day" keys={['count']} height={170} />
            <div className="mt-3 grid grid-cols-2 gap-2">{byChannel.map((c) => <div key={c.channel} className="flex items-center gap-2 rounded-xl bg-surface2/60 px-3 py-2 text-xs"><img src={CHANNEL_ICON[c.channel]} alt="" className="h-5 w-5 object-contain" /><span className="flex-1 truncate">{c.label}</span><b className="tabular-nums">{c.count}</b></div>)}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/app/emerging?focus=${q.data.emergingId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-caramel hover:underline"><Radar className="h-4 w-4" />{t('Radar analysis')}</Link>
              <Link to={`/app/layers/7?store=${i.storeId}&issue=${i.issue}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-caramel hover:underline"><Layers className="h-4 w-4" />{t('Replay detection')}</Link>
            </div>
          </Card>

          <Card>
            <SectionTitle title={t('Comments')} eyebrow={`${comments.length}`} />
            <div className="mt-3 space-y-3">
              {comments.length === 0 && <p className="text-sm text-ink/55">{t('No comments yet. Add context for the next person.')}</p>}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3"><Avatar name={c.author} size={30} /><div className="min-w-0 flex-1 rounded-2xl bg-surface2/60 px-3.5 py-2.5"><div className="text-xs font-semibold">{c.author} <span className="font-normal text-ink/50">· {fmtDate(c.ts)}</span></div><p className="mt-0.5 text-sm">{c.text}</p></div></div>
              ))}
            </div>
            <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; m.comment.mutate(text, { onSuccess: () => { setText(''); toast.success(t('Comment added')); }, onError: (er) => toast.error((er as Error).message) }); }}>
              <Textarea aria-label={t('Add a comment')} placeholder={t('Add a comment')} value={text} onChange={(e) => setText(e.target.value)} className="[&_textarea]:min-h-[72px]" />
              <Button type="submit" size="sm" loading={m.comment.isPending} icon={<Send className="h-3.5 w-3.5" />}>{t('Post')}</Button>
            </form>
          </Card>

          <Card>
            <SectionTitle title={t('Activity')} />
            <ul className="mt-3 space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-b500" /><div><div>{a.action}</div><div className="text-xs text-ink/55">{a.actor} · {fmtDate(a.ts)}</div></div></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title={t('Escalate to Head Office?')} footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>{t('Cancel')}</Button><Button loading={m.escalate.isPending} onClick={() => m.escalate.mutate(undefined, { onSuccess: () => { setConfirm(false); toast.success(t('Escalated. Head Office was notified.')); }, onError: (e) => toast.error((e as Error).message) })}>{t('Escalate')}</Button></>}>
        <p className="text-sm text-ink/75">{t('Head Office and the regional manager will be notified immediately, and the incident is flagged as escalated in every queue.')}</p>
      </Modal>
    </div>
  );
}
