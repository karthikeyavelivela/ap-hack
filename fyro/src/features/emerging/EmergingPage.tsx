import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Radar, ChevronDown, Volume2, Check, X, Layers } from 'lucide-react';
import { PageHeader, Card, Pill, SeverityBadge, Skeleton, EmptyState, Button, Bar } from '@/components/ui';
import { Async } from '@/components/Async';
import { Spark } from '@/components/charts';
import { RadarVisual } from './parts';
import { useEmerging, EmergingRow } from '@/hooks/queries';
import { useUI, useTara } from '@/store';
import { CHANNEL_ICON, TARA_STATE } from '@/assets';
import { ISSUE_BY_ID } from '@/mocks/taxonomy';
import { weekLabel, cn } from '@/lib';
import { dayDate } from '@/mocks/recordsGen';

const pfmt = (p: number) => (p < 0.0001 ? '< 0.0001' : p.toFixed(4));

function Detector({ name, fired, value, limit, hint }: { name: string; fired: boolean; value: string; limit: string; hint: string }) {
  return (
    <div className={cn('rounded-2xl border p-3.5', fired ? 'border-b700 bg-b900 text-inverse' : 'border-line bg-surface2/50')}>
      <div className="flex items-center justify-between"><span className="text-sm font-semibold">{name}</span><span className={cn('flex h-5 w-5 items-center justify-center rounded-full', fired ? 'bg-white/20' : 'bg-line')}>{fired ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}</span></div>
      <div className="mt-1.5 text-lg font-bold tabular-nums">{value}</div>
      <div className={cn('text-[11px]', fired ? 'text-white/70' : 'text-ink/55')}>{limit}</div>
      <div className={cn('mt-1.5 text-[11px] leading-snug', fired ? 'text-white/80' : 'text-ink/60')}>{hint}</div>
    </div>
  );
}

function Item({ e, rank, open, onToggle, gates }: { e: EmergingRow; rank: number; open: boolean; onToggle: () => void; gates: { c3: number; p: number; minVolume: number } }) {
  const { t } = useTranslation();
  const ask = useTara((s) => s.ask);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250); }, [open]);
  const it = ISSUE_BY_ID.get(e.issue)!;
  const first = dayDate(e.firstFireDay).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return (
    <div ref={ref} id={e.id}>
      <Card hover={!open} pad={false} className={cn('overflow-hidden transition', open && 'border-b500 shadow-lift')}>
        <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-4 p-4 text-left sm:p-5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-b900 text-xs font-bold text-white">{rank}</span>
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-caramel bg-surface2"><span className="text-lg font-bold leading-none">{e.score}</span><span className="text-[8px] font-semibold uppercase tracking-wide text-ink/60">score</span></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{e.issueLabel}</span><SeverityBadge s={it.floor} />{e.planted && <Pill tone="sand">{t('planted test')}</Pill>}</div>
            <div className="mt-0.5 text-sm text-ink/65">{e.storeId} · {e.storeName}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Pill tone={e.c2 ? 'dark' : 'soft'}>EARS C2</Pill><Pill tone={e.c3 ? 'dark' : 'soft'}>EARS C3</Pill><Pill tone="dark">Poisson p {pfmt(e.p)}</Pill>
              <span className="ml-1 flex -space-x-1">{e.channels.map((c) => <img key={c} src={CHANNEL_ICON[c]} alt={c} className="h-5 w-5 rounded-full border border-surface bg-surface2 object-contain" />)}</span>
            </div>
          </div>
          <div className="hidden w-36 shrink-0 md:block"><Spark data={e.series.slice(-21)} fired={Math.max(0, e.firstFireDay - (42 - 21))} height={44} /><div className="text-center text-[10px] text-ink/50">{t('last 21 days')}</div></div>
          <ChevronDown className={cn('h-5 w-5 shrink-0 text-ink/50 transition-transform', open && 'rotate-180')} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="overflow-hidden">
              <div className="space-y-5 border-t border-line p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Detector name="EARS C2" fired={e.c2} value={`${e.last3} / day`} limit={`limit: baseline mean ${e.baselineMean.toFixed(1)} + 3σ`} hint={t('One-day jump above a lagged 7-day baseline.')} />
                  <Detector name="EARS C3" fired={e.c3} value={e.c3Value.toFixed(1)} limit={`limit: > ${gates.c3}`} hint={t('Three days of accumulated excess catch slow ramps.')} />
                  <Detector name="Poisson test" fired={e.p < gates.p} value={`p ${pfmt(e.p)}`} limit={`gate: p < ${gates.p}`} hint={t('Probability of this many reports by chance alone.')} />
                  <Detector name="Space-time scan" fired={e.scan.llr > 5} value={`LLR ${e.scan.llr.toFixed(1)}`} limit={`${e.scan.radiusKm} km · ${e.scan.stores.length} store${e.scan.stores.length === 1 ? '' : 's'}`} hint={e.scan.stores.length > 1 ? `Cluster: ${e.scan.stores.slice(0, 4).join(', ')}` : t('Isolated to this store.')} />
                </div>
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-2xl bg-surface2/50 p-4">
                    <div className="eyebrow mb-2">{t('Why flagged?')}</div>
                    <p className="text-sm leading-relaxed">{e.why}</p>
                    <p className="mt-2 text-xs text-ink/60">{t('First fired on {{d}}.', { d: first })}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" icon={<Volume2 className="h-4 w-4" />} onClick={() => ask(`Why is ${e.storeId} flagged?`, true)}>{t('Ask Tara to read it aloud')}</Button>
                      {e.incidentId && <Button size="sm" variant="ghost" onClick={() => undefined}><Link to={`/app/incidents/${e.incidentId}`} className="underline">{t('Open incident')} {e.incidentId}</Link></Button>}
                      <Link to={`/app/layers/7?store=${e.storeId}&issue=${e.issue}`} className="inline-flex items-center gap-1.5 self-center text-sm font-semibold text-caramel hover:underline"><Layers className="h-4 w-4" />{t('Replay day by day')}</Link>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-line p-4">
                    <div className="eyebrow mb-2">{t('Corroboration factors')}</div>
                    <ul className="space-y-2.5 text-sm">
                      <li className="flex items-center justify-between"><span>{t('Channels reporting')}</span><span className="font-bold tabular-nums">{e.corroboration.channels} / 4</span></li>
                      <li><div className="mb-1 flex justify-between"><span>{t('Evidence volume (7d)')}</span><span className="font-bold tabular-nums">{e.series.slice(-7).reduce((a, b) => a + b, 0)}</span></div><Bar value={e.series.slice(-7).reduce((a, b) => a + b, 0)} max={30} tone="dark" /></li>
                      <li className="flex items-center justify-between"><span>{t('Severity floor')}</span><SeverityBadge s={e.corroboration.severityFloor} /></li>
                      <li className="flex items-center justify-between"><span>{t('Alert gate')}</span><Pill>≥{gates.minVolume} in 3d · ≥2 channels</Pill></li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

export default function EmergingPage() {
  const { t } = useTranslation();
  const week = useUI((s) => s.week);
  const q = useEmerging();
  const [sp, setSp] = useSearchParams();
  const focus = sp.get('focus');
  const items = q.data?.items ?? [];
  const region = useUI((s) => s.region);
  const list = useMemo(() => items.filter((e) => region === 'all' || e.region === region), [items, region]);
  const open = focus ?? list[0]?.id ?? null;

  return (
    <div>
      <PageHeader title={t('Emerging-Issue Radar')} subtitle={t('Store × issue series that are rising faster than chance explains, ranked by emerging score. {{w}}', { w: weekLabel(week) })} actions={<Link to="/app/layers/7" className="inline-flex items-center gap-1.5 text-sm font-semibold text-caramel hover:underline"><Layers className="h-4 w-4" />{t('How the radar works')}</Link>} />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card className="!p-5">
            <RadarVisual flagged={list.map((e) => e.storeId)} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-2xl font-bold tabular-nums">{list.length}</div><div className="text-[11px] text-ink/60">{t('flagged')}</div></div>
              <div><div className="text-2xl font-bold tabular-nums">{list.filter((e) => e.score >= 80).length}</div><div className="text-[11px] text-ink/60">{t('score ≥ 80')}</div></div>
              <div><div className="text-2xl font-bold tabular-nums">{new Set(list.map((e) => e.districtId)).size}</div><div className="text-[11px] text-ink/60">{t('districts')}</div></div>
            </div>
          </Card>
          <Card className="!p-4 text-xs text-ink/65">
            <div className="eyebrow mb-1.5">{t('Alert gates')}</div>
            {q.data ? <ul className="space-y-1"><li>• C2: today &gt; mean + 3σ (σ floor 0.5)</li><li>• C3: 3-day excess &gt; {q.data.gates.c3}</li><li>• Poisson tail p &lt; {q.data.gates.p}</li><li>• ≥ {q.data.gates.minVolume} reports in 3 days, ≥ {q.data.gates.minChannels} channels</li></ul> : <Skeleton className="h-16" />}
          </Card>
        </div>
        <div className="space-y-3">
          <Async q={q} skeleton={<div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>}>
            {() => list.length === 0
              ? <Card><EmptyState src={TARA_STATE.cozy} title={t('The radar is quiet')} body={t('No store × issue series crossed the alert gates this week.')} /></Card>
              : list.map((e, i) => <Item key={e.id} e={e} rank={i + 1} open={open === e.id} gates={q.data!.gates} onToggle={() => setSp((p) => { const n = new URLSearchParams(p); if (open === e.id) n.set('focus', 'none'); else n.set('focus', e.id); return n; }, { replace: true })} />)}
          </Async>
        </div>
      </div>
      <Radar className="hidden" />
    </div>
  );
}
