import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Send, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth, useUI } from '@/store';
import { Card, SectionTitle, Skeleton, Pill, TrendArrow, Bar, Textarea, Button, toast, DataTable, SeverityBadge, LinkButton, Sprite } from '@/components/ui';
import { Async } from '@/components/Async';
import { BarsChart, AreaTrend, Donut, ChartBox, LineChart, Line, XAxis, YAxis, CartesianGrid, RTooltip, useChartColors, tipStyle } from '@/components/charts';
import { KpiGrid, useKpiItems, EmergingWidget, TopIssuesCard, RegionMapCard, EscalationsCard, Greeting, incidentColumns } from './widgets';
import { useBrief, useMapData, useStores, useQueue, useStore, useEvalSummary, usePipelineStatus, useTrends, IncidentRow } from '@/hooks/queries';
import { api } from '@/services/api';
import { ROLE_LABEL } from '@/app/nav';
import { TARA_POSE } from '@/assets';
import { fmt, cn } from '@/lib';
import type { RegionId } from '@/mocks/geo';

/* ───────────── Head Office ───────────── */
function HeadOffice() {
  const { t } = useTranslation();
  const { items } = useKpiItems();
  const trends = useTrends();
  return (
    <div className="space-y-6">
      <KpiGrid items={items} />
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <RegionMapCard />
        <div className="space-y-6">
          <EmergingWidget limit={3} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr]">
        <TopIssuesCard />
        <Card>
          <SectionTitle title={t('Function workload')} eyebrow={t('Open incidents')} />
          <div className="mt-3"><Async q={trends} skeleton={<Skeleton className="h-60" />}>{(d) => <BarsChart data={d.fnLoad.map((f) => ({ name: f.name.replace('People & ', ''), open: f.open }))} x="name" keys={['open']} horizontal height={250} labels={{ open: t('Open incidents') }} colorByIndex />}</Async></div>
        </Card>
        <Card>
          <SectionTitle title={t('Feedback volume')} eyebrow={t('Last 42 days')} />
          <div className="mt-3"><Async q={trends} skeleton={<Skeleton className="h-60" />}>{(d) => <AreaTrend data={d.daily} x="date" keys={['review', 'app', 'whatsapp', 'ticket']} stacked height={250} labels={{ review: t('Reviews'), app: t('App'), whatsapp: 'WhatsApp', ticket: t('Tickets') }} />}</Async></div>
        </Card>
      </div>
      <EscalationsCard />
    </div>
  );
}

/* ───────────── Regional Manager ───────────── */
function Regional({ region }: { region: RegionId }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const week = useUI((s) => s.week);
  const { items } = useKpiItems();
  const brief = useBrief(region, week);
  const map = useMapData();
  const stores = useStores({ region });
  return (
    <div className="space-y-6">
      <KpiGrid items={items} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <SectionTitle title={t('Regional brief preview')} eyebrow={`${t('Week')} ${week}`} right={<LinkButton to={`/app/briefs/${region}/${week}`} size="sm" variant="secondary">{t('Open brief')}</LinkButton>} />
          <div className="mt-4 space-y-3">
            <Async q={brief} skeleton={<Skeleton className="h-64" />}>
              {(b) => (
                <>
                  {b.topIssues.slice(0, 3).map((i) => (
                    <div key={i.issue} className="flex items-start gap-3 rounded-2xl bg-surface2/60 p-3.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-b900 text-xs font-bold text-white">{i.rank}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{i.label}</span><SeverityBadge s={i.severity} /><TrendArrow dir={i.trend} value={i.delta >= 0 ? `+${i.delta}` : i.delta} significant={i.significant} /></div>
                        {i.quotes[0] && <p className="mt-1.5 line-clamp-2 text-[13px] italic text-ink/70">“{i.quotes[0].text}” <span className="not-italic text-ink/50">— {i.quotes[0].gloss}</span></p>}
                      </div>
                      <span className="tabular-nums text-sm font-semibold">{i.count}</span>
                    </div>
                  ))}
                  <p className="text-xs text-ink/55">{b.precision.line}</p>
                </>
              )}
            </Async>
          </div>
        </Card>
        <EmergingWidget region={region} limit={3} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title={t('District breakdown')} eyebrow={t('Issues per 1,000 transactions')} />
          <div className="mt-3"><Async q={map} skeleton={<Skeleton className="h-72" />}>{(d) => <BarsChart horizontal height={Math.max(220, d.districts.filter((x) => x.region === region).length * 34)} data={d.districts.filter((x) => x.region === region).sort((a, b) => b.rate - a.rate).map((x) => ({ name: x.name, rate: Number(x.rate.toFixed(2)) }))} x="name" keys={['rate']} labels={{ rate: t('per 1k tx') }} />}</Async></div>
        </Card>
        <Card pad={false}>
          <div className="p-5 pb-2 sm:p-6 sm:pb-2"><SectionTitle title={t('Store leaderboard')} eyebrow={t('Normalised issue rate, highest first')} /></div>
          <DataTable
            columns={[
              { key: 'store', header: t('Store'), cell: (s) => <div className="min-w-0"><div className="truncate font-semibold">{s.code}</div><div className="truncate text-xs text-ink/60">{s.name}</div></div> },
              { key: 'fmt', header: t('Format'), hideOnMobile: true, cell: (s) => s.format },
              { key: 'n', header: t('Issues'), align: 'right', cell: (s) => <span className="tabular-nums">{s.weekIssues}</span> },
              { key: 'rate', header: t('Rate / 1k'), align: 'right', cell: (s) => <Pill tone={s.ratePer1k > 1.2 ? 'dark' : 'soft'}>{s.ratePer1k.toFixed(2)}</Pill> },
            ]}
            rows={stores.data?.slice().sort((a, b) => b.ratePer1k - a.ratePer1k).slice(0, 8)} rowKey={(s) => s.id} loading={stores.isLoading} error={stores.error as Error | null} onRetry={() => void stores.refetch()} onRowClick={(s) => nav(`/app/stores/${s.id}`)} dense skeletonRows={6} />
        </Card>
      </div>
      <EscalationsCard />
    </div>
  );
}

/* ───────────── Function Owner ───────────── */
function FunctionOwner({ fn }: { fn: string }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const q = useQueue(fn);
  const { items } = useKpiItems();
  return (
    <div className="space-y-6">
      <KpiGrid items={items} />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card pad={false} data-tour="queue">
          <div className="p-5 pb-2 sm:p-6 sm:pb-2"><SectionTitle title={t('Your routed queue')} eyebrow={`${q.data?.total ?? '…'} ${t('open')} · ${q.data?.breached ?? '…'} ${t('past SLA')}`} right={<LinkButton to="/app/routing" size="sm" variant="secondary">{t('Open routing board')}</LinkButton>} /></div>
          <DataTable columns={incidentColumns(t, { sla: true })} rows={q.data?.items.slice(0, 8)} rowKey={(r: IncidentRow) => r.id} loading={q.isLoading} error={q.error as Error | null} onRetry={() => void q.refetch()} onRowClick={(r) => nav(`/app/incidents/${r.id}`)} dense skeletonRows={6} empty={{ title: t('Queue clear'), body: t('Nothing is waiting for your function.') }} />
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionTitle title={t('Severity mix')} />
            <Async q={q} skeleton={<Skeleton className="h-48" />}>{(d) => <><Donut height={190} data={d.severityMix.map((s) => ({ name: `S${s.severity}`, value: s.count }))} center={<div><div className="text-2xl font-bold">{d.total}</div><div className="text-[11px] text-ink/60">{t('open')}</div></div>} /><div className="mt-2 flex flex-wrap justify-center gap-2">{d.severityMix.map((s) => <span key={s.severity} className="flex items-center gap-1.5"><SeverityBadge s={s.severity as 1} /><span className="text-xs tabular-nums">{s.count}</span></span>)}</div></>}</Async>
          </Card>
          <Card>
            <SectionTitle title={t('Resolution trend')} eyebrow={t('Opened vs resolved')} />
            <div className="mt-2"><Async q={q} skeleton={<Skeleton className="h-44" />}>{(d) => <BarsChart data={d.resolvedTrend.map((w) => ({ week: `W${w.week}`, opened: w.opened, resolved: w.resolved }))} x="week" keys={['opened', 'resolved']} height={190} labels={{ opened: t('Opened'), resolved: t('Resolved') }} />}</Async></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Store Manager ───────────── */
function HealthRing({ score }: { score: number }) {
  const r = 54; const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36" role="img" aria-label={`Store health ${score} out of 100`}>
      <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="12" />
        <motion.circle cx="65" cy="65" r={r} fill="none" stroke="rgb(var(--caramel))" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-bold tabular-nums">{score}</span><span className="text-[11px] font-medium text-ink/60">/ 100</span></div>
    </div>
  );
}

function StoreManager({ storeId }: { storeId: string }) {
  const { t } = useTranslation();
  const q = useStore(storeId);
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ label: string | null; confidence: number } | null>(null);
  const key = `fyro.checklist.${storeId}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(key) ?? '{}')); } catch { /* ignore */ } }, [key]);
  const toggle = (id: string) => setDone((d) => { const n = { ...d, [id]: !d[id] }; try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const note = useMutation({
    mutationFn: () => api.post<{ classification: { label: string | null; confidence: number } }>('/api/feedback/staff-note', { storeId, text }),
    onSuccess: (r) => { toast.success(t('Staff note submitted')); setResult(r.classification); setText(''); void qc.invalidateQueries({ queryKey: ['store', storeId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const checklist = useMemo(() => {
    const inc = (q.data?.incidents ?? []).filter((i) => i.status !== 'resolved').slice(0, 4).map((i) => ({ id: i.id, text: `${i.issueLabel} (${i.id})`, link: `/app/incidents/${i.id}`, sev: i.severity }));
    return [...inc, { id: 'walk', text: t('Walk the floor before opening and photograph any issue'), link: undefined, sev: 0 }, { id: 'note', text: t("Submit today's staff note"), link: undefined, sev: 0 }];
  }, [q.data, t]);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="flex flex-col items-center text-center">
          <div className="eyebrow">{t('Store health')}</div>
          <Async q={q} skeleton={<Skeleton className="my-4 h-36 w-36 !rounded-full" />}>
            {(d) => (
              <>
                <div className="mt-3"><HealthRing score={d.health} /></div>
                <h2 className="mt-3 text-lg font-semibold">{d.store.code} · {d.store.name}</h2>
                <p className="text-sm text-ink/60">{d.store.districtName} · {d.store.format}</p>
                <div className="mt-4 grid w-full grid-cols-2 gap-3 text-left">
                  <div className="rounded-2xl bg-surface2/60 p-3"><div className="text-xs text-ink/60">{t('This week')}</div><div className="text-xl font-bold tabular-nums">{d.issuesWeek}</div><div className="text-xs text-ink/60">{t('issues')}</div></div>
                  <div className="rounded-2xl bg-surface2/60 p-3"><div className="text-xs text-ink/60">{t('vs district')}</div><div className="text-xl font-bold tabular-nums">{(d.storeRate / Math.max(0.01, d.districtRate)).toFixed(1)}×</div><div className="text-xs text-ink/60">{t('issue rate')}</div></div>
                </div>
                <LinkButton to={`/app/stores/${storeId}`} variant="secondary" size="sm" className="mt-4">{t('Open store profile')}</LinkButton>
              </>
            )}
          </Async>
        </Card>
        <Card>
          <SectionTitle title={t("This week's issues")} eyebrow={t('Normalised vs district')} />
          <div className="mt-4 space-y-3">
            <Async q={q} skeleton={<Skeleton className="h-52" />}>
              {(d) => d.rates.length ? d.rates.slice(0, 5).map((r) => (
                <div key={r.issue}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{r.label}</span><span className="tabular-nums text-ink/70">{r.count} · {r.shrunk.toFixed(2)}/1k</span></div>
                  <Bar value={r.shrunk} max={Math.max(...d.rates.map((x) => x.shrunk), 0.1)} tone={r.shrunk > r.district ? 'dark' : 'caramel'} />
                </div>
              )) : <p className="py-8 text-center text-sm text-ink/60">{t('No issues reported this week. Nice work.')}</p>}
            </Async>
          </div>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title={t('Action checklist')} eyebrow={`${Object.values(done).filter(Boolean).length}/${checklist.length} ${t('done')}`} />
          <ul className="mt-3 space-y-2">
            {checklist.map((c) => (
              <li key={c.id}>
                <div className={cn('flex items-center gap-3 rounded-2xl border border-line p-3 transition', done[c.id] && 'bg-surface2/60')}>
                  <button onClick={() => toggle(c.id)} aria-pressed={!!done[c.id]} aria-label={`${done[c.id] ? 'Mark not done' : 'Mark done'}: ${c.text}`} className="shrink-0 text-b700">{done[c.id] ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</button>
                  <span className={cn('flex-1 text-sm', done[c.id] && 'text-ink/50 line-through')}>{c.link ? <Link to={c.link} className="hover:underline">{c.text}</Link> : c.text}</span>
                  {c.sev > 0 && <SeverityBadge s={c.sev as 1} />}
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle title={t('Submit a staff note')} eyebrow={t('Raises detection speed')} />
          <p className="mt-1 text-sm text-ink/60">{t('Write in any language. Telugu, Hindi, Tamil, Marathi or English all work.')}</p>
          <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); if (text.trim().length < 5) { toast.error(t('Please write at least a few words.')); return; } note.mutate(); }}>
            <Textarea aria-label={t('Staff note')} value={text} onChange={(e) => setText(e.target.value)} placeholder="freezer pani cheyyatledu since morning" />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={note.isPending} icon={<Send className="h-4 w-4" />}>{t('Submit note')}</Button>
              {result && <Pill tone="sand">{result.label ?? t('No issue detected')} · {(result.confidence * 100).toFixed(0)}%</Pill>}
            </div>
          </form>
          {q.data && q.data.staffNotes.length > 0 && (
            <div className="mt-4 border-t border-line pt-3"><div className="eyebrow mb-2">{t('Recent notes')}</div>{q.data.staffNotes.map((n) => <p key={n.id} className="truncate text-sm text-ink/70">“{n.text}”</p>)}</div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ───────────── Analyst ───────────── */
function Analyst() {
  const { t } = useTranslation();
  const ps = usePipelineStatus();
  const ev = useEvalSummary();
  const k = useChartColors();
  return (
    <div className="space-y-6">
      <Async q={ev} skeleton={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>}>
        {(d) => (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[[t('Macro-F1'), d.metrics.macroF1], [t('Severity F1'), d.metrics.severityF1], [t('Actionable F1'), d.metrics.actionableF1], [t('S1 recall'), d.metrics.s1Recall]].map(([l, v]) => (
              <Card key={l as string} hover><div className="text-xs font-semibold text-ink/60">{l as string}</div><div className="mt-1 text-[30px] font-bold tabular-nums">{(v as number).toFixed(2)}</div><Bar value={v as number} className="mt-3" /></Card>
            ))}
          </div>
        )}
      </Async>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionTitle title={t('Pipeline health')} eyebrow={t('10 layers')} right={<LinkButton to="/app/layers" size="sm" variant="secondary">{t('Open layers')}</LinkButton>} />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Async q={ps} skeleton={<Skeleton className="h-64 sm:col-span-2" />}>
              {(d) => d.layers.map((l) => (
                <Link key={l.id} to={`/app/layers/${l.id}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:-translate-y-0.5 hover:border-b500">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-b900 text-xs font-bold text-white">{l.id}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{l.name}</span><span className="text-xs text-ink/60">{fmt(l.throughput)}/h · {l.latencyMs}ms</span></span>
                  <Pill tone={l.health === 'healthy' ? 'soft' : 'dark'}>{l.health}</Pill>
                </Link>
              ))}
            </Async>
          </div>
        </Card>
        <Card>
          <SectionTitle title={t('Data drift')} eyebrow="PSI by week" />
          <div className="mt-3"><Async q={ps} skeleton={<Skeleton className="h-56" />}>{(d) => (
            <ChartBox height={230}>
              <LineChart data={d.drift.map((x) => ({ week: `W${x.week}`, psi: x.psi }))} margin={{ left: -18, right: 8, top: 10 }}>
                <CartesianGrid stroke={k.grid} strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 0.2]} />
                <RTooltip contentStyle={tipStyle(k.bg, k.text)} />
                <Line type="monotone" dataKey="psi" stroke={k.c[1]} strokeWidth={2.5} dot={{ r: 3, fill: k.c[0] }} />
              </LineChart>
            </ChartBox>)}</Async></div>
          <p className="mt-1 text-xs text-ink/55">{t('PSI under 0.1 is stable; 0.1–0.25 deserves a look.')}</p>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2"><TopIssuesCard /><EmergingWidget limit={3} /></div>
    </div>
  );
}

export default function Dashboard() {
  const user = useAuth((s) => s.user)!;
  const { t } = useTranslation();
  const body = (() => {
    switch (user.role) {
      case 'HEAD_OFFICE': return <HeadOffice />;
      case 'REGIONAL_MANAGER': return <Regional region={user.region!} />;
      case 'FUNCTION_OWNER': return <FunctionOwner fn={user.fn ?? 'store_ops'} />;
      case 'STORE_MANAGER': return <StoreManager storeId={user.storeId ?? 'ATP-07'} />;
      default: return <Analyst />;
    }
  })();
  const scope = user.role === 'REGIONAL_MANAGER' ? ` · ${user.region}` : user.role === 'STORE_MANAGER' ? ` · ${user.storeId}` : user.role === 'FUNCTION_OWNER' ? ` · ${user.fn?.replace('_', ' ')}` : '';
  return (
    <div>
      <Greeting name={user.name} role={`${t(ROLE_LABEL[user.role])}${scope}`} />
      {body}
    </div>
  );
}
export const _d = { Sprite, TARA_POSE };
