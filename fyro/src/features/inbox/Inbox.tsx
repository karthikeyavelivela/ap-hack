import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { PageHeader, Card, Select, Input, Pill, SeverityBadge, Drawer, Skeleton, Bar, EmptyState, QueryError, Button } from '@/components/ui';
import { VirtualList } from '@/components/VirtualList';
import { useFeedback, useRecord, useTaxonomy } from '@/hooks/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { useUI } from '@/store';
import { CHANNEL_ICON, TARA_STATE } from '@/assets';
import { CHANNEL_LABEL } from '@/mocks/recordsGen';
import { ISSUE_BY_ID } from '@/mocks/taxonomy';
import { fmtDate, cn } from '@/lib';

const DEFAULTS = { channel: '', lang: '', store: '', region: '', issue: '', severity: '', actionable: '', q: '', from: '', to: '', record: '' };

export const LANG_STYLE: Record<string, string> = {
  te: 'bg-[#3B2414] text-white', hi: 'bg-[#6B4226] text-white', ta: 'bg-[#A47148] text-black', mr: 'bg-[#C9A27E] text-black', en: 'border border-line bg-surface2 text-ink', sym: 'border border-dashed border-line text-ink/60',
};
export const LANG_NAME: Record<string, string> = { te: 'Telugu', hi: 'Hindi', ta: 'Tamil', mr: 'Marathi', en: 'English', sym: 'Symbol' };

export function LangChip({ lang, children, title }: { lang: string; children: React.ReactNode; title?: string }) {
  return <span title={title ?? LANG_NAME[lang]} className={cn('inline-block rounded-lg px-2 py-1 text-[13px] font-medium', LANG_STYLE[lang])}>{children}</span>;
}
export function LangLegend() {
  return <div className="flex flex-wrap gap-2 text-[11px] font-semibold">{['te', 'hi', 'ta', 'mr', 'en'].map((l) => <span key={l} className={cn('rounded-md px-2 py-0.5', LANG_STYLE[l])}>{LANG_NAME[l]}</span>)}</div>;
}

function RecordDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useRecord(id);
  const d = q.data;
  return (
    <Drawer open={!!id} onClose={onClose} width={560} title={<span className="flex items-center gap-2">{id}{d && <SeverityBadge s={d.severity.severity} />}</span>}>
      {q.isLoading && <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-16" /><Skeleton className="h-32" /></div>}
      {q.isError && <QueryError error={q.error as Error} onRetry={() => void q.refetch()} compact />}
      {d && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink/65">
            <img src={CHANNEL_ICON[d.record.channel]} alt="" className="h-7 w-7 object-contain" /><b className="text-ink">{CHANNEL_LABEL[d.record.channel]}</b>
            <span>·</span><span>{fmtDate(d.record.ts)}</span><span>·</span><Link to={`/app/stores/${d.store.id}`} className="font-semibold text-caramel hover:underline">{d.store.code} {d.store.name}</Link>
            {d.record.rating && <Pill>{'★'.repeat(d.record.rating)}</Pill>}
            {d.cleaned.truncated && <Pill tone="outline">truncated</Pill>}
          </div>
          <section><div className="eyebrow mb-1.5">{t('Original text')}</div><p className="whitespace-pre-line rounded-2xl bg-surface2/60 p-4 text-sm leading-relaxed">{d.record.text}</p></section>
          <section>
            <div className="mb-2 flex items-center justify-between"><div className="eyebrow">{t('Language per token')}</div><LangLegend /></div>
            <div className="flex flex-wrap gap-1.5">{d.tokens.map((tk, i) => <LangChip key={i} lang={tk.lang}>{tk.text}</LangChip>)}</div>
          </section>
          <section><div className="eyebrow mb-1.5">{t('Transliteration to native script')}</div><p className="rounded-2xl bg-surface2/60 p-4 text-[15px] leading-relaxed">{d.native}</p></section>
          <section><div className="eyebrow mb-1.5">{t('English translation')}</div><p className="rounded-2xl border border-line p-4 text-sm font-medium">{d.translation}</p></section>
          <section>
            <div className="mb-2 flex items-center justify-between"><div className="eyebrow">{t('Predicted labels')}</div><Pill tone={d.classification.tier === 'llm' ? 'dark' : 'soft'}>{t('decided by')} {d.classification.tier === 'rules' ? 'rules' : d.classification.tier === 'muril' ? 'MuRIL' : 'LLM'}</Pill></div>
            <div className="space-y-2.5">
              {d.classification.scores.slice(0, 5).map((s, i) => (
                <div key={s.id}><div className="mb-1 flex justify-between text-sm"><span className={cn(i === 0 && 'font-semibold')}>{ISSUE_BY_ID.get(s.id)!.label}</span><span className="tabular-nums text-ink/65">{(s.p * 100).toFixed(1)}%</span></div><Bar value={s.p} tone={i === 0 ? 'dark' : 'sand'} /></div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink/55">{d.severity.reasons.join(' · ')}</p>
          </section>
          <section className="rounded-2xl border border-line p-4">
            <div className="eyebrow mb-1.5">{t('Belongs to incident')}</div>
            {d.incident ? (
              <Link to={`/app/incidents/${d.incident.id}`} className="flex items-center justify-between gap-3 hover:underline"><span className="min-w-0"><span className="block truncate font-semibold">{d.incident.issueLabel}</span><span className="text-xs text-ink/60">{d.incident.id} · {d.incident.count} reports · {d.incident.channels.length} channels</span></span><SeverityBadge s={d.incident.severity} /></Link>
            ) : <p className="text-sm text-ink/60">{t('Not part of an incident (isolated report).')}</p>}
          </section>
        </div>
      )}
    </Drawer>
  );
}

export default function Inbox() {
  const { t } = useTranslation();
  const uiRegion = useUI((s) => s.region);
  const [f, set] = useUrlState(DEFAULTS);
  const tax = useTaxonomy();
  const params = useMemo(() => ({ channel: f.channel, lang: f.lang, store: f.store.toUpperCase(), region: f.region || (uiRegion !== 'all' ? uiRegion : ''), issue: f.issue, severity: f.severity, actionable: f.actionable, q: f.q, from: f.from, to: f.to }), [f, uiRegion]);
  const q = useFeedback(params);
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total ?? 0;
  const clear = () => set({ ...DEFAULTS });
  const anyFilter = Object.entries(f).some(([k, v]) => k !== 'record' && v);

  return (
    <div>
      <PageHeader title={t('Feedback inbox')} subtitle={t('Every raw record from every channel, newest first. Click a row to see what the pipeline did with it.')} />
      <Card className="mb-5 !p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Input className="sm:col-span-2" aria-label={t('Search')} icon={<Search className="h-4 w-4" />} placeholder={t('Search text, record ID or store')} value={f.q} onChange={(e) => set({ q: e.target.value })} />
          <Select size="sm" aria-label={t('Channel')} value={f.channel} onChange={(v) => set({ channel: v })} options={[{ value: '', label: t('All channels') }, ...Object.entries(CHANNEL_LABEL).map(([k, l]) => ({ value: k, label: l }))]} />
          <Select size="sm" aria-label={t('Language')} value={f.lang} onChange={(v) => set({ lang: v })} options={[{ value: '', label: t('All languages') }, { value: 'te', label: 'Telugu' }, { value: 'hi', label: 'Hindi' }, { value: 'ta', label: 'Tamil' }, { value: 'mr', label: 'Marathi' }, { value: 'en', label: 'English' }]} />
          <Select size="sm" aria-label={t('Issue type')} value={f.issue} onChange={(v) => set({ issue: v })} options={[{ value: '', label: t('All issue types') }, ...(tax.data ?? []).map((i) => ({ value: i.id, label: i.label }))]} />
          <Select size="sm" aria-label={t('Severity')} value={f.severity} onChange={(v) => set({ severity: v })} options={[{ value: '', label: t('Any severity') }, { value: '1', label: 'S1' }, { value: '2', label: 'S2' }, { value: '3', label: 'S3' }, { value: '4', label: 'S4' }]} />
          <Select size="sm" aria-label={t('Actionable')} value={f.actionable} onChange={(v) => set({ actionable: v })} options={[{ value: '', label: t('Actionable: any') }, { value: 'true', label: t('Actionable only') }, { value: 'false', label: t('Non-actionable') }]} />
          <Select size="sm" aria-label={t('Region')} value={f.region} onChange={(v) => set({ region: v })} options={[{ value: '', label: t('All regions') }, { value: 'uttarandhra', label: 'Uttarandhra' }, { value: 'coastal', label: 'Coastal Andhra' }, { value: 'rayalaseema', label: 'Rayalaseema' }]} />
          <Input aria-label={t('Store code')} placeholder={t('Store, e.g. ATP-07')} value={f.store} onChange={(e) => set({ store: e.target.value })} className="[&_input]:!py-2 [&_input]:text-[13px]" />
          <Select size="sm" aria-label={t('Date range')} value={f.from} onChange={(v) => set({ from: v, to: v ? String(Number(v) + 6) : '' })} options={[{ value: '', label: t('All dates') }, { value: '35', label: 'Week 41' }, { value: '28', label: 'Week 40' }, { value: '21', label: 'Week 39' }, { value: '14', label: 'Week 38' }, { value: '7', label: 'Week 37' }]} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/60"><span><b className="text-ink">{total.toLocaleString('en-IN')}</b> {t('records')}</span>{anyFilter && <Button size="sm" variant="ghost" onClick={clear}>{t('Clear filters')}</Button>}</div>
      </Card>

      <Card pad={false} className="overflow-hidden">
        {q.isError ? <QueryError error={q.error as Error} onRetry={() => void q.refetch()} /> : q.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[72px]" />)}</div> : items.length === 0 ? (
          <EmptyState src={TARA_STATE.box} title={t('No records match')} body={t('Try clearing a filter.')} action={<Button variant="secondary" size="sm" onClick={clear}>{t('Clear filters')}</Button>} />
        ) : (
          <VirtualList items={items} rowHeight={84} height="min(68vh, 720px)" onNearEnd={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
            render={(r) => (
              <button onClick={() => set({ record: r.id }, { replace: false })} className={cn('flex h-full w-full items-center gap-3.5 border-b border-line/60 px-4 text-left transition hover:bg-surface2/70 sm:px-5', f.record === r.id && 'bg-surface2')}>
                <img src={CHANNEL_ICON[r.channel]} alt={CHANNEL_LABEL[r.channel]} className="h-10 w-10 shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 whitespace-pre-line text-[13.5px] leading-snug">{r.text.replace(/^Agent:.*\n/gim, '').replace(/\nAgent:.*$/gim, '')}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink/55"><span className="font-mono">{r.id}</span><span>{r.storeId}</span><span>{fmtDate(r.ts)}</span><span className="font-semibold uppercase">{r.lang}</span>{r.incidentId && <span className="font-semibold text-caramel">{r.incidentId}</span>}</div>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">{r.issue ? <><SeverityBadge s={r.severity} /><span className="max-w-[150px] truncate text-[11px] text-ink/60">{ISSUE_BY_ID.get(r.issue)?.label}</span></> : <Pill>{t('no issue')}</Pill>}</div>
              </button>
            )} />
        )}
        {q.isFetchingNextPage && <div className="border-t border-line p-3 text-center text-xs text-ink/60">{t('Loading more…')}</div>}
      </Card>
      <RecordDrawer id={f.record || null} onClose={() => set({ record: '' }, { replace: false })} />
    </div>
  );
}
