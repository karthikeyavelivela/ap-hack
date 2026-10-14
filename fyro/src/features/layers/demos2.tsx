import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipForward, RotateCcw, Check, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, Button, Pill, Select, Slider, Segmented, Skeleton, Bar, SeverityBadge, QueryError, DataTable } from '@/components/ui';
import { Async } from '@/components/Async';
import { APMap } from '@/components/APMap';
import { useChartColors, tipStyle, BarsChart } from '@/components/charts';
import { BriefSheet } from '@/features/briefs/BriefSheet';
import { DetectorChart } from '@/features/emerging/parts';
import { DemoShell, usePipeline } from './demos1';
import { useEmerging, useEmergingReplay, useTaxonomy, useRouting, useFunctions, useBrief, useEvalSummary, useEvalLead, useEvalPrecision } from '@/hooks/queries';
import { CHANNEL_ICON } from '@/assets';
import { ISSUE_BY_ID } from '@/mocks/taxonomy';
import { CHANNEL_LABEL } from '@/mocks/recordsGen';
import { wilson } from '@/mocks/evalStats';
import { REGIONS, RegionId } from '@/mocks/geo';
import { WEEKS, weekLabel, cn } from '@/lib';

/* ───────────── 5 · De-duplication ───────────── */
const H = 3600000;
const T0 = Date.UTC(2026, 9, 10, 4);
const DEDUP = [
  { id: 'R1', channel: 'review', storeId: 'ATP-07', ts: T0, text: 'Freezer not working since morning, ice cream melted. Order ORD48213 total Rs 540' },
  { id: 'R2', channel: 'app', storeId: 'ATP-07', ts: T0 + 5 * H, text: 'freezer pani cheyyatledu, ice cream karigipoyayi order ORD48213' },
  { id: 'R3', channel: 'whatsapp', storeId: 'ATP-07', ts: T0 + 20 * H, text: 'ATP-07 mgr: frzr nt wrkng stk ledu, bill Rs 540' },
  { id: 'R4', channel: 'ticket', storeId: 'ATP-07', ts: T0 + 30 * H, text: 'Customer: fridge kharab hai, ice cream pighal gayi' },
  { id: 'R5', channel: 'review', storeId: 'KNL-04', ts: T0 + 6 * H, text: 'Freezer not working, ice cream melted' },
  { id: 'R6', channel: 'review', storeId: 'ATP-07', ts: T0 + 120 * H, text: 'Freezer not working again, ice cream melted' },
];
export function DedupDemo() {
  const { t } = useTranslation();
  const [merged, setMerged] = useState(false);
  const q = usePipeline<{ matrix: { score: number; blocked: boolean; reasons: string[] }[][]; clusters: string[][]; entities: { id: string; order: string | null; amount: string | null }[] }>('dedup', { records: DEDUP });
  const main = q.data?.clusters.find((c) => c.includes('R1')) ?? [];
  return (
    <DemoShell title={t('Merge four channels into one incident')}>
      <div className="mb-4 flex flex-wrap items-center gap-3"><Button icon={merged ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />} onClick={() => setMerged((m) => !m)} disabled={!q.data}>{merged ? t('Reset') : t('Run de-duplication')}</Button><span className="text-xs text-ink/55">{t('Blocking: same store · same issue family · within ±72h')}</span></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {DEDUP.filter((r) => !merged || !main.includes(r.id)).map((r) => (
            <motion.div layout key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.7, x: 40 }} className="rounded-2xl border border-line bg-surface p-3.5">
              <div className="flex items-center gap-2 text-xs"><img src={CHANNEL_ICON[r.channel]} alt="" className="h-6 w-6 object-contain" /><b>{CHANNEL_LABEL[r.channel as 'review']}</b><span className="ml-auto font-mono text-ink/50">{r.id} · {r.storeId}</span></div>
              <p className="mt-1.5 text-[13px]">{r.text}</p>
              {q.data && <div className="mt-2 flex flex-wrap gap-1">{q.data.entities.find((e) => e.id === r.id)?.order && <Pill tone="sand">order {q.data.entities.find((e) => e.id === r.id)!.order}</Pill>}{q.data.entities.find((e) => e.id === r.id)?.amount && <Pill tone="sand">Rs {q.data.entities.find((e) => e.id === r.id)!.amount}</Pill>}{!main.includes(r.id) && <Pill>{r.storeId !== 'ATP-07' ? 'other store' : '> 72h gap'}</Pill>}</div>}
            </motion.div>
          ))}
          {merged && (
            <motion.div layout key="inc" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border-2 border-b900 bg-b900 p-4 text-inverse shadow-lift md:col-span-2 xl:col-span-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/70">{t('Merged incident')}</div>
              <div className="mt-1 text-lg font-bold">Freezer failure · ATP-07</div>
              <div className="mt-2 flex items-center gap-2"><div className="flex -space-x-1.5">{DEDUP.filter((r) => main.includes(r.id)).map((r) => <img key={r.id} src={CHANNEL_ICON[r.channel]} alt="" className="h-8 w-8 rounded-full border-2 border-b900 bg-white object-contain p-0.5" />)}</div><Pill tone="sand">{main.length} {t('sources')}</Pill></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {q.isLoading ? <Skeleton className="mt-5 h-52" /> : q.isError ? <QueryError error={q.error as Error} compact /> : q.data && (
        <div className="mt-6"><div className="eyebrow mb-2">{t('Similarity matrix (blocked pairs dimmed)')}</div>
          <div className="overflow-x-auto"><table className="text-center text-xs"><thead><tr><th />{DEDUP.map((r) => <th key={r.id} className="px-2 py-1 font-mono">{r.id}</th>)}</tr></thead>
            <tbody>{q.data.matrix.map((row, i) => <tr key={i}><th className="px-2 py-1 font-mono">{DEDUP[i].id}</th>{row.map((c, j) => <td key={j} title={c.reasons.join(', ')} className={cn('h-9 w-12 border border-surface font-semibold tabular-nums', c.blocked && i !== j && 'opacity-35')} style={{ background: `rgba(107,66,38,${0.08 + c.score * 0.85})`, color: c.score > 0.5 ? '#fff' : '#000' }}>{c.score.toFixed(2)}</td>)}</tr>)}</tbody></table></div></div>
      )}
    </DemoShell>
  );
}

/* ───────────── 6 · Normalisation ───────────── */
const shrink = (n: number, T: number, mu: number, m: number) => ({ raw: n / T, shrunk: (n + m * mu) / (T + m) });
export function NormaliseDemo() {
  const { t } = useTranslation();
  const k = useChartColors();
  const [small, setSmall] = useState({ n: 4, T: 5 });
  const [big, setBig] = useState({ n: 30, T: 45 });
  const [mu, setMu] = useState(0.6);
  const [m, setM] = useState(8);
  const a = shrink(small.n, small.T, mu, m); const b = shrink(big.n, big.T, mu, m);
  const curve = useMemo(() => Array.from({ length: 24 }, (_, i) => { const T = 1 + i * 2.2; const n = Math.round(T * 0.8); const r = shrink(n, T, mu, m); return { T: Math.round(T), raw: Number(r.raw.toFixed(2)), shrunk: Number(r.shrunk.toFixed(2)), mu }; }), [mu, m]);
  return (
    <DemoShell title={t('A corner shop vs a hypermarket')} hint={t('Same formula as the pipeline: (n + m·μ) / (T + m)')}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-surface2/50 p-4"><div className="font-semibold">Express · small store</div><Slider label={t('Complaints this week')} value={small.n} min={0} max={30} onChange={(n) => setSmall((s) => ({ ...s, n }))} /><Slider label={t('Transactions (thousands)')} value={small.T} min={2} max={60} onChange={(T) => setSmall((s) => ({ ...s, T }))} /></div>
        <div className="space-y-4 rounded-2xl bg-surface2/50 p-4"><div className="font-semibold">Hypermarket</div><Slider label={t('Complaints this week')} value={big.n} min={0} max={120} onChange={(n) => setBig((s) => ({ ...s, n }))} /><Slider label={t('Transactions (thousands)')} value={big.T} min={2} max={60} onChange={(T) => setBig((s) => ({ ...s, T }))} /></div>
        <Slider label={t('District mean rate μ (per 1k tx)')} value={mu} min={0.1} max={2} step={0.05} onChange={setMu} format={(n) => n.toFixed(2)} />
        <Slider label={t('Prior strength m (k transactions)')} value={m} min={1} max={30} onChange={setM} />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[[t('Raw count'), small.n, big.n, 0], [t('Raw rate / 1k'), a.raw, b.raw, 2], [t('Shrunk rate / 1k'), a.shrunk, b.shrunk, 2]].map(([l, x, y, d]) => (
          <Card key={l as string} className="!p-4"><div className="text-xs font-semibold text-ink/60">{l as string}</div>
            {[['Express', x], ['Hyper', y]].map(([nm, v], i) => (<div key={nm as string} className="mt-2"><div className="flex justify-between text-sm"><span>{nm as string}</span><b className="tabular-nums">{(v as number).toFixed(d as number)}</b></div><Bar value={v as number} max={Math.max(x as number, y as number, 0.01)} tone={i ? 'sand' : 'dark'} /></div>))}</Card>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink/70">{t('Raw counts blame the hypermarket; raw rates blame the corner shop. Shrinkage moves the small store {{p}}% of the way to the district mean.', { p: Math.round((1 - small.T / (small.T + m)) * 100) })}</p>
      <div className="mt-5"><div className="eyebrow mb-2">{t('Shrinkage toward the district mean as exposure grows')}</div>
        <div style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={curve} margin={{ left: -14, right: 8, top: 8 }}><CartesianGrid stroke={k.grid} strokeDasharray="3 5" vertical={false} /><XAxis dataKey="T" tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: 'k transactions', position: 'insideBottom', offset: -2, fontSize: 11, fill: k.text }} /><YAxis tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} /><RTooltip contentStyle={tipStyle(k.bg, k.text)} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Line dataKey="raw" name="Raw rate" stroke={k.c[2]} strokeWidth={2} dot={false} /><Line dataKey="shrunk" name="Shrunk rate" stroke={k.c[0]} strokeWidth={2.5} dot={false} /><Line dataKey="mu" name="District mean" stroke={k.c[1]} strokeDasharray="5 4" dot={false} /></LineChart></ResponsiveContainer></div></div>
    </DemoShell>
  );
}

/* ───────────── 7 · Emerging radar replay ───────────── */
export function RadarDemo() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const store = sp.get('store') ?? 'ATP-07'; const issue = sp.get('issue') ?? 'freezer_failure';
  const em = useEmerging();
  const rep = useEmergingReplay(store, issue);
  const [day, setDay] = useState(9); const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => { setDay(9); setPlaying(false); }, [store, issue]);
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => setDay((d) => { if (d >= 41) { setPlaying(false); return d; } return d + 1; }), 800 / speed);
    return () => clearInterval(timer.current);
  }, [playing, speed]);
  const item = em.data?.items.find((e) => e.storeId === store && e.issue === issue);
  const d = rep.data?.days[day];
  const firstFire = rep.data?.days.findIndex((x) => x.fired) ?? -1;
  const options = (em.data?.items ?? []).slice(0, 12).map((e) => ({ value: `${e.storeId}|${e.issue}`, label: `${e.storeId} · ${e.issueLabel}` }));
  const z = d ? (d.count - d.mean) / d.sd : 0;
  const comp = d ? [['Poisson tail', 38 * Math.min(1, -Math.log10(d.poissonP) / 6), 38], ['Jump size (z)', 25 * Math.min(1, Math.max(0, z) / 8), 25], ['Channels', 20 * (d.channels / 4), 20], ['Volume (7d)', 17 * Math.min(1, (rep.data!.days.slice(Math.max(0, day - 6), day + 1).reduce((a, x) => a + x.count, 0)) / 20), 17]] as [string, number, number][] : [];
  const score = Math.round(comp.reduce((a, c) => a + c[1], 0));
  return (
    <DemoShell title={t('Replay the detector day by day')} hint={t('EARS C2 / C3 · Poisson tail · space-time scan')}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Select label={t('Series')} value={`${store}|${issue}`} onChange={(v) => { const [s, i] = v.split('|'); setSp((p) => { const n = new URLSearchParams(p); n.set('store', s); n.set('issue', i); return n; }, { replace: true }); }} options={options.length ? (options.some((o) => o.value === `${store}|${issue}`) ? options : [{ value: `${store}|${issue}`, label: `${store} · ${ISSUE_BY_ID.get(issue)?.label}` }, ...options]) : [{ value: `${store}|${issue}`, label: `${store} · ${ISSUE_BY_ID.get(issue)?.label}` }]} />
        <div className="flex items-end gap-2"><Button variant="secondary" aria-label="Restart" icon={<RotateCcw className="h-4 w-4" />} onClick={() => { setDay(9); setPlaying(false); }} /><Button icon={playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} onClick={() => { if (day >= 41) setDay(9); setPlaying((p) => !p); }}>{playing ? t('Pause') : t('Play')}</Button><Button variant="secondary" aria-label="Step" icon={<SkipForward className="h-4 w-4" />} onClick={() => setDay((x) => Math.min(41, x + 1))} /></div></div>
      <div className="mt-3 flex flex-wrap items-center gap-4"><div className="min-w-[220px] flex-1"><Slider label={t('Day')} value={day} min={9} max={41} onChange={(n) => { setDay(n); setPlaying(false); }} format={(n) => rep.data?.dates[n]?.slice(5) ?? String(n)} /></div><Segmented size="sm" label="Speed" value={String(speed)} onChange={(v) => setSpeed(Number(v))} options={[{ value: '1', label: '1×' }, { value: '2', label: '2×' }, { value: '4', label: '4×' }]} /></div>
      {rep.isLoading ? <Skeleton className="mt-4 h-64" /> : rep.isError ? <QueryError error={rep.error as Error} onRetry={() => void rep.refetch()} compact /> : rep.data && d && (
        <>
          <div className="mt-4"><DetectorChart days={rep.data.days} dates={rep.data.dates} upTo={day} /></div>
          <div className="mt-2 flex flex-wrap items-center gap-2">{d.fired ? <Pill tone="dark">● FIRED on {rep.data.dates[day]}</Pill> : <Pill>{t('quiet today')}</Pill>}{firstFire >= 0 && day >= firstFire && <Pill tone="sand">{t('first fired')} {rep.data.dates[firstFire]}</Pill>}</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[['EARS C2', d.c2Fired, `${d.count} vs ${d.c2Threshold.toFixed(1)}`, 'today > mean + 3σ'], ['EARS C3', d.c3Fired, d.c3.toFixed(1), `3-day excess > ${d.c3Threshold}`], ['Poisson', d.poissonP < rep.data.gates.p, d.poissonP < 1e-4 ? '< 0.0001' : d.poissonP.toFixed(4), `p < ${rep.data.gates.p}`], ['Gates', d.x3 >= rep.data.gates.minVolume && d.channels >= 2, `${d.x3} in 3d · ${d.channels} ch`, `≥ ${rep.data.gates.minVolume} reports, ≥ 2 channels`]].map(([n, ok, v, l]) => (
              <div key={n as string} className={cn('rounded-2xl border p-3.5', ok ? 'border-b700 bg-b900 text-inverse' : 'border-line bg-surface2/50')}><div className="flex items-center justify-between text-sm font-semibold">{n as string}{ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-50" />}</div><div className="mt-1 text-lg font-bold tabular-nums">{v as string}</div><div className={cn('text-[11px]', ok ? 'text-white/70' : 'text-ink/55')}>{l as string}</div></div>
            ))}
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-line p-4"><div className="mb-3 flex items-center justify-between"><div className="eyebrow">{t('Emerging-score breakdown')}</div><Pill tone="dark">{t('score')} {score}</Pill></div><div className="space-y-2.5">{comp.map(([n, v, max]) => <div key={n}><div className="mb-0.5 flex justify-between text-[13px]"><span>{n}</span><span className="tabular-nums text-ink/65">{v.toFixed(1)} / {max}</span></div><Bar value={v} max={max} tone="dark" /></div>)}</div><p className="mt-3 text-[11px] text-ink/55">score = 38·poisson + 25·jump + 20·channels + 17·volume</p></div>
            <div className="rounded-2xl border border-line p-4"><div className="eyebrow mb-2">{t('Space-time scan')}</div><div className="grid grid-cols-[150px_1fr] items-center gap-4"><div className="aspect-square"><APMap showLabels={false} interactive={false} stores={(item?.scan.stores ?? [store]).map((id) => ({ id, lat: 0, lng: 0 }))} /></div><div className="text-sm"><b>{item ? `LLR ${item.scan.llr.toFixed(1)}` : '—'}</b><div className="text-ink/65">{item ? `${item.scan.radiusKm} km circle · ${item.scan.stores.length} store(s)` : t('Not flagged this week')}</div>{item && <div className="mt-1 text-xs text-ink/55">{item.scan.stores.join(', ')}</div>}</div></div></div>
          </div>
        </>
      )}
    </DemoShell>
  );
}

/* ───────────── 8 · Routing ───────────── */
export function RoutingDemo() {
  const { t } = useTranslation();
  const tax = useTaxonomy(); const rules = useRouting(); const fns = useFunctions();
  const [issue, setIssue] = useState('freezer_failure'); const [sev, setSev] = useState(2); const [records, setRecords] = useState(18); const [channels, setChannels] = useState(3);
  const owner = rules.data?.issueOwner[issue]; const list = fns.data ?? [];
  const ownerIdx = list.findIndex((f) => f.id === owner);
  const e = rules.data?.escalation;
  const escalate = !!e && ((e.anyS1 && sev === 1) || (channels >= e.minChannels && records >= e.minRecords && sev <= 2));
  return (
    <DemoShell title={t('Route an incident to its owner')}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Select label={t('Issue type')} value={issue} onChange={setIssue} options={(tax.data ?? []).map((i) => ({ value: i.id, label: i.label }))} /><Select label={t('Severity')} value={String(sev)} onChange={(v) => setSev(Number(v))} options={[1, 2, 3, 4].map((s) => ({ value: String(s), label: `S${s}` }))} /><Slider label={t('Records in 72h')} value={records} min={1} max={80} onChange={setRecords} /><Slider label={t('Channels')} value={channels} min={1} max={4} onChange={setChannels} /></div>
      <div className="mt-6 grid items-center gap-4 md:grid-cols-[180px_1fr]">
        <div className="rounded-3xl bg-b900 p-4 text-center text-inverse"><div className="text-xs text-white/70">Incident</div><div className="font-bold">{ISSUE_BY_ID.get(issue)?.label}</div><div className="mt-2 flex justify-center"><SeverityBadge s={sev as 1} /></div></div>
        <div className="space-y-2">{list.map((f, i) => { const on = i === ownerIdx; return (
          <div key={f.id} className="flex items-center gap-3"><svg width="70" height="12" className="hidden shrink-0 md:block"><motion.line x1="0" y1="6" x2="70" y2="6" strokeWidth={on ? 3 : 1.5} stroke={on ? '#A47148' : '#D9C3A5'} strokeDasharray={on ? '0' : '4 4'} initial={false} animate={{ pathLength: 1 }} /></svg>
            <motion.div animate={{ scale: on ? 1.02 : 1 }} className={cn('flex flex-1 items-center justify-between rounded-2xl border px-4 py-2.5', on ? 'border-b900 bg-b900 text-inverse shadow-lift' : 'border-line bg-surface2/40 opacity-60')}><span className="text-sm font-semibold">{f.name}</span><span className="text-xs">{f.owner}{on && ` · SLA ${rules.data!.sla[f.id][sev as 1]}h`}</span></motion.div></div>); })}</div>
      </div>
      <div className={cn('mt-5 rounded-2xl border p-4 text-sm', escalate ? 'border-b900 bg-b900 text-inverse' : 'border-line bg-surface2/50')}><b>{escalate ? t('Escalates to Head Office') : t('Stays with the owner')}</b>{e && <span className="ml-2 opacity-80">{t('Rule')}: {e.anyS1 ? 'S1, or ' : ''}{e.minChannels}+ channels, {e.minRecords}+ records, severity S2 or worse.</span>}</div>
    </DemoShell>
  );
}

/* ───────────── 9 · Brief ───────────── */
export function BriefDemo() {
  const { t } = useTranslation();
  const [region, setRegion] = useState<RegionId>('rayalaseema'); const [week, setWeek] = useState(41);
  const q = useBrief(region, week);
  return (
    <DemoShell title={t('Generate a brief')}>
      <div className="flex flex-wrap items-center gap-3"><Segmented size="sm" label="Region" value={region} onChange={(v) => setRegion(v)} options={REGIONS.map((r) => ({ value: r.id, label: r.name }))} /><Select size="sm" aria-label="Week" className="w-56" value={String(week)} onChange={(v) => setWeek(Number(v))} options={[...WEEKS].reverse().map((w) => ({ value: String(w), label: weekLabel(w) }))} /></div>
      <div className="mt-5 max-h-[760px] overflow-y-auto rounded-3xl">{q.isLoading ? <Skeleton className="h-[600px]" /> : q.isError ? <QueryError error={q.error as Error} onRetry={() => void q.refetch()} compact /> : q.data && <BriefSheet b={q.data} compact />}</div>
    </DemoShell>
  );
}

/* ───────────── 10 · Evaluate ───────────── */
export function EvalDemo() {
  const { t } = useTranslation();
  const s = useEvalSummary(); const l = useEvalLead(); const p = useEvalPrecision(); const k = useChartColors();
  const [kk, setK] = useState(48); const [nn, setN] = useState(62);
  const w = wilson(Math.min(kk, nn), nn);
  return (
    <DemoShell title={t('Metrics you can defend')} hint={t('Computed from the 3,077-record labelled sample')}>
      <Async q={s} skeleton={<Skeleton className="h-28" />}>{(d) => <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Macro-F1', d.metrics.macroF1], ['Severity F1', d.metrics.severityF1], ['Actionable F1', d.metrics.actionableF1], ['S1 recall', d.metrics.s1Recall]].map(([n, v]) => <Card key={n as string} className="!p-4"><div className="text-xs font-semibold text-ink/60">{n as string}</div><div className="text-3xl font-bold tabular-nums">{(v as number).toFixed(2)}</div><Bar value={v as number} className="mt-2" /></Card>)}</div>}</Async>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div><div className="eyebrow mb-2">{t('Lead time on the 3 planted incidents')}</div>
          <Async q={l} skeleton={<Skeleton className="h-40" />}>{(d) => <DataTable dense rowKey={(r) => r.key} rows={d.planted} columns={[{ key: 's', header: t('Incident'), cell: (r) => <div><div className="font-semibold">{r.storeId}</div><div className="text-xs text-ink/60">{ISSUE_BY_ID.get(r.issue)?.label}</div></div> }, { key: 'd', header: t('Detected'), cell: (r) => r.detectedDate }, { key: 'l', header: t('Lead'), align: 'right', cell: (r) => <Pill tone="dark">{r.leadDays} d</Pill> }, { key: 'n', header: t('Reports before'), align: 'right', hideOnMobile: true, cell: (r) => r.reportsBeforeDetection }]} />}</Async></div>
        <div><div className="eyebrow mb-2">{t('False alarms vs lead time (p-gate sweep)')}</div>
          <Async q={l} skeleton={<Skeleton className="h-52" />}>{(d) => <div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={d.sweep.map((x) => ({ p: x.pThreshold < 0.001 ? x.pThreshold.toExponential(0) : String(x.pThreshold), alarms: Number(x.falseAlarmsPerWeek.toFixed(1)), lead: Number(x.avgLeadDays.toFixed(1)) }))} margin={{ left: -14, right: 8, top: 8 }}><CartesianGrid stroke={k.grid} strokeDasharray="3 5" vertical={false} /><XAxis dataKey="p" tick={{ fill: k.text, fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} /><RTooltip contentStyle={tipStyle(k.bg, k.text)} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Line dataKey="alarms" name="False alarms / week" stroke={k.c[0]} strokeWidth={2.5} /><Line dataKey="lead" name="Avg lead (days)" stroke={k.c[2]} strokeWidth={2.5} /></LineChart></ResponsiveContainer></div>}</Async></div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line p-4"><div className="eyebrow mb-2">{t('Alert precision with Wilson 95% CI')}</div>
          <Async q={p} skeleton={<Skeleton className="h-24" />}>{(d) => <div><div className="text-3xl font-bold tabular-nums">{(d.precision.p * 100).toFixed(0)}%<span className="ml-2 text-sm font-medium text-ink/60">({(d.precision.lo * 100).toFixed(0)}–{(d.precision.hi * 100).toFixed(0)}%, n={d.precision.n})</span></div>
            <div className="mt-3 space-y-2">{d.bySeverity.filter((x) => x.n > 0).map((x) => <div key={x.severity} className="flex items-center gap-3 text-sm"><SeverityBadge s={x.severity as 1} /><div className="relative h-2 flex-1 rounded-full bg-surface2"><div className="absolute h-full rounded-full bg-sand" style={{ left: `${x.lo * 100}%`, width: `${(x.hi - x.lo) * 100}%` }} /><div className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded bg-b900" style={{ left: `${x.p * 100}%` }} /></div><span className="w-24 text-right text-xs tabular-nums text-ink/65">{x.k}/{x.n} · {(x.p * 100).toFixed(0)}%</span></div>)}</div></div>}</Async></div>
        <div className="rounded-2xl border border-line p-4"><div className="eyebrow mb-2">{t('Try it: how many alerts would you need?')}</div><div className="grid gap-3 sm:grid-cols-2"><Slider label={t('True alerts')} value={kk} min={0} max={200} onChange={setK} /><Slider label={t('Alerts reviewed')} value={nn} min={5} max={200} onChange={setN} /></div><p className="mt-3 text-sm">{t('Precision')} <b>{(w.p * 100).toFixed(0)}%</b>, 95% CI <b>{(w.lo * 100).toFixed(0)}–{(w.hi * 100).toFixed(0)}%</b>. {t('More reviewed alerts narrow the interval.')}</p></div>
      </div>
      <div className="mt-5"><BarsChart data={(s.data?.perClass ?? []).filter((c) => c.support > 5).sort((a, b) => a.f1 - b.f1).slice(0, 8).map((c) => ({ name: c.label, f1: Number(c.f1.toFixed(2)) }))} x="name" keys={['f1']} horizontal height={260} labels={{ f1: 'F1' }} /><p className="mt-1 text-xs text-ink/55">{t('Weakest issue types by F1')}</p></div>
    </DemoShell>
  );
}
