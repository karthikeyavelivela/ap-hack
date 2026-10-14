import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Play, Shield, AlertTriangle } from 'lucide-react';
import { Card, Segmented, Textarea, Pill, Bar, Skeleton, Select, Switch, Slider, Button, SeverityBadge, QueryError } from '@/components/ui';
import { LangChip, LangLegend, LANG_STYLE } from '@/features/inbox/Inbox';
import { api } from '@/services/api';
import { useDebounced } from '@/hooks/useUrlState';
import { useTaxonomy } from '@/hooks/queries';
import { CHANNEL_ICON } from '@/assets';
import { CHANNEL_LABEL } from '@/mocks/recordsGen';
import { ISSUE_BY_ID, POLICY_LABEL } from '@/mocks/taxonomy';
import { cn } from '@/lib';

export function usePipeline<T>(path: string, body: unknown, enabled = true) {
  const key = JSON.stringify(body);
  const dkey = useDebounced(key, 300);
  return useQuery({ queryKey: ['pipe', path, dkey], queryFn: () => api.post<T>(`/api/pipeline/${path}`, JSON.parse(dkey)), enabled, placeholderData: keepPreviousData, staleTime: 60_000, retry: 1 });
}

export function DemoShell({ title, children, hint }: { title?: string; children: ReactNode; hint?: string }) {
  const { t } = useTranslation();
  return (
    <Card className="!p-0 overflow-hidden" data-demo>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface2/60 px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-caramel opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-b700" /></span><h2 className="text-[15px] font-semibold">{title ?? t('Live demo')}</h2></div>
        <span className="text-xs text-ink/55">{hint ?? t('Runs on mock records through the mock API')}</span>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </Card>
  );
}

/* ───────────── 1 · Channel cleaning ───────────── */
const CLEAN_SAMPLES: Record<string, string> = {
  review: '★★☆☆☆ Freezer not working since morningggg 😡😡 ice cream melted!!!! Please look into it.',
  app: 'billing lo chala queue 😤😤 30 minutes waitttt chesam',
  whatsapp: 'ATP-07 mgr: frzr nt wrkng stk ledu pls chk 🔥 cust complaining abt melted ice crm and the compressor has been making noise since yest and nobody from the service team has come to look at it even after',
  ticket: 'Agent: Namaste, thank you for calling FYRO Mart support. How may I help you?\nCustomer: label lo peanuts ani ledu, ma papa ki allergy vachindi 😢\nAgent: Let me note this down for you.',
};
export function CleanDemo() {
  const { t } = useTranslation();
  const [ch, setCh] = useState('whatsapp');
  const [text, setText] = useState(CLEAN_SAMPLES.whatsapp);
  const q = usePipeline<{ cleaned: string; truncated: boolean; steps: { id: string; label: string; changed: boolean; text: string }[] }>('clean', { text, channel: ch });
  return (
    <DemoShell title={t('Clean a record live')}>
      <Segmented size="sm" label="Channel" value={ch} onChange={(v) => { setCh(v); setText(CLEAN_SAMPLES[v]); }} options={Object.entries(CHANNEL_LABEL).map(([k, l]) => ({ value: k, label: <><img src={CHANNEL_ICON[k]} alt="" className="h-4 w-4 object-contain" />{l}</> }))} />
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div><div className="eyebrow mb-1.5">{t('Raw text (editable)')}</div><Textarea aria-label="Raw text" value={text} onChange={(e) => setText(e.target.value)} className="[&_textarea]:min-h-[150px] [&_textarea]:font-mono [&_textarea]:text-[13px]" />
          <p className="mt-1.5 text-xs text-ink/55">{t('Paste your own text, including emojis, shorthand and transcripts.')}</p></div>
        <div>
          <div className="eyebrow mb-1.5">{t('Cleaned text')}</div>
          {q.isLoading ? <Skeleton className="h-[150px]" /> : q.isError ? <QueryError error={q.error as Error} onRetry={() => void q.refetch()} compact /> : q.data && (
            <div className="rounded-2xl border border-line bg-surface p-4"><p className="whitespace-pre-line text-[14px] leading-relaxed">{q.data.cleaned || '…'}</p>{q.data.truncated && <Pill tone="dark" className="mt-3">{t('Truncated: lower confidence')}</Pill>}</div>
          )}
        </div>
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.steps.map((s, i) => (
          <motion.li key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={cn('flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm', s.changed ? 'border-b700 bg-b900 text-inverse' : 'border-line bg-surface2/50 text-ink/60')}>
            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', s.changed ? 'bg-white/20' : 'bg-line')}>{s.changed ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className="h-1 w-2 rounded bg-ink/30" />}</span>{s.label}
          </motion.li>
        ))}
      </ol>
    </DemoShell>
  );
}

/* ───────────── 2 · Language ID + transliteration ───────────── */
const LANG_SAMPLES = [['Tenglish', 'freezer pani cheyyatledu since morning, ice cream anni karigipoyayi'], ['Hinglish', 'fridge kharab hai bhai, ice cream pighal gayi'], ['Tanglish', 'freezer velai seyyala, ice cream urugiduchu'], ['Marathi', 'freezer chalat nahi, ice cream vitaltay'], ['Mixed', 'billing counter lo staff bahut rude ga matladaru, romba late']];
export function LangDemo() {
  const { t } = useTranslation();
  const [text, setText] = useState(LANG_SAMPLES[0][1]);
  const q = usePipeline<{ tokens: { text: string; lang: string; native?: string }[]; native: string; translation: string; mix: Record<string, number> }>('transliterate', { text });
  const total = q.data ? Object.values(q.data.mix).reduce((a, b) => a + b, 0) || 1 : 1;
  return (
    <DemoShell title={t('Type Tenglish, see the pipeline think')}>
      <div className="flex flex-wrap gap-2">{LANG_SAMPLES.map(([n, s]) => <button key={n} onClick={() => setText(s)} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition', text === s ? 'border-b900 bg-b900 text-inverse' : 'border-line bg-surface2 hover:border-b500')}>{n}</button>)}</div>
      <Textarea aria-label="Text" className="mt-3 [&_textarea]:min-h-[84px]" value={text} onChange={(e) => setText(e.target.value)} />
      {q.isLoading ? <Skeleton className="mt-4 h-40" /> : q.isError ? <QueryError error={q.error as Error} onRetry={() => void q.refetch()} compact /> : q.data && (
        <div className="mt-5 space-y-5">
          <div><div className="mb-2 flex items-center justify-between"><div className="eyebrow">{t('Language per token')}</div><LangLegend /></div>
            <div className="flex flex-wrap gap-1.5">{q.data.tokens.map((tk, i) => <motion.span key={i} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.025 }}><LangChip lang={tk.lang}>{tk.text}</LangChip></motion.span>)}</div></div>
          <div className="flex h-3 overflow-hidden rounded-full border border-line" aria-label="Language mix">{Object.entries(q.data.mix).filter(([, n]) => n > 0).map(([l, n]) => <span key={l} title={`${l}: ${n}`} className={cn('h-full', LANG_STYLE[l])} style={{ width: `${(n / total) * 100}%` }} />)}</div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-surface2/60 p-4"><div className="eyebrow mb-1.5">{t('Native script')}</div><p className="text-[17px] leading-relaxed">{q.data.native}</p></div>
            <div className="rounded-2xl border border-line p-4"><div className="eyebrow mb-1.5">{t('English gloss')}</div><p className="text-[15px] font-medium">{q.data.translation}</p><p className="mt-1.5 text-xs text-ink/55">{t('Dictionary-based mock translation.')}</p></div>
          </div>
        </div>
      )}
    </DemoShell>
  );
}

/* ───────────── 3 · Hybrid classifier ───────────── */
type Cls = { issue: string | null; confidence: number; tier: 'rules' | 'muril' | 'llm'; scores: { id: string; p: number; label: string; fn: string }[]; segments: { text: string; issue: string | null; label: string | null; confidence: number }[] };
const CLS_SAMPLES = ['label lo peanuts ani ledu, ma papa ki allergy vachindi', 'freezer pani cheyyatledu, kani billing lo staff rude ga matladaru', 'shelf price okati, billing lo inkoti', 'store chala bagundi, staff manchiga help chesaru'];
export function ClassifierDemo() {
  const { t } = useTranslation();
  const [text, setText] = useState(CLS_SAMPLES[0]);
  const [all, setAll] = useState(false);
  const q = usePipeline<Cls>('classify', { text });
  const tiers = [['rules', 'Tier 1 · Rules', 'Keyword and pattern matches'], ['muril', 'Tier 2 · MuRIL', 'Fine-tuned multilingual model'], ['llm', 'Tier 3 · LLM adjudicator', 'Only for low-margin cases']] as const;
  const idx = q.data ? tiers.findIndex((x) => x[0] === q.data!.tier) : -1;
  return (
    <DemoShell title={t('Watch a record flow through the tiers')}>
      <div className="flex flex-wrap gap-2">{CLS_SAMPLES.map((s) => <button key={s} onClick={() => setText(s)} className={cn('max-w-[260px] truncate rounded-full border px-3 py-1.5 text-xs font-medium transition', text === s ? 'border-b900 bg-b900 text-inverse' : 'border-line bg-surface2 hover:border-b500')}>{s}</button>)}</div>
      <Textarea aria-label="Text" className="mt-3 [&_textarea]:min-h-[70px]" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="relative mt-6 grid gap-3 md:grid-cols-3">
        {tiers.map(([id, name, sub], i) => {
          const hit = idx === i; const passed = idx > i;
          return (
            <div key={id} className="relative">
              <motion.div animate={{ scale: hit ? 1.03 : 1 }} className={cn('rounded-3xl border p-4 transition-colors', hit ? 'border-b900 bg-b900 text-inverse shadow-lift' : passed ? 'border-line bg-surface2/50 opacity-60' : 'border-line bg-surface2/30 opacity-50')}>
                <div className="flex items-center justify-between"><span className="text-sm font-bold">{name}</span>{hit && <Pill tone="sand">{t('decided here')}</Pill>}{passed && <span className="text-[11px]">{t('passed on')}</span>}</div>
                <p className={cn('mt-1 text-xs', hit ? 'text-white/75' : 'text-ink/60')}>{sub}</p>
              </motion.div>
              {i < 2 && <ArrowRight className="absolute -right-3.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-b500 md:block" />}
              {hit && <motion.span layoutId="dot" className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-caramel shadow-[0_0_14px_rgba(164,113,72,.9)]" />}
            </div>
          );
        })}
      </div>
      {q.isLoading ? <Skeleton className="mt-5 h-56" /> : q.isError ? <QueryError error={q.error as Error} onRetry={() => void q.refetch()} compact /> : q.data && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between"><div className="eyebrow">{t('Confidence across 30 issue types')}</div><button className="text-xs font-semibold text-caramel hover:underline" onClick={() => setAll((a) => !a)}>{all ? t('Show top 8') : t('Show all 30')}</button></div>
            <div className={cn('space-y-2.5', all && 'max-h-[360px] overflow-y-auto pr-2')}>
              {q.data.scores.slice(0, all ? 30 : 8).map((s, i) => (<div key={s.id}><div className="mb-0.5 flex justify-between text-[13px]"><span className={cn(i === 0 && 'font-semibold')}>{s.label}</span><span className="tabular-nums text-ink/60">{(s.p * 100).toFixed(1)}%</span></div><Bar value={s.p} max={q.data!.scores[0].p} tone={i === 0 ? 'dark' : 'sand'} /></div>))}
            </div>
          </div>
          <div>
            <div className="eyebrow mb-2">{t('Multi-label sentence split')}</div>
            <ul className="space-y-2">{q.data.segments.map((s, i) => (
              <li key={i} className="rounded-2xl border border-line bg-surface2/40 p-3.5"><p className="text-sm">“{s.text}”</p><div className="mt-2 flex items-center gap-2">{s.issue ? <Pill tone="dark">{s.label}</Pill> : <Pill>{t('no issue')}</Pill>}<span className="text-xs tabular-nums text-ink/60">{(s.confidence * 100).toFixed(0)}%</span></div></li>
            ))}</ul>
            <p className="mt-3 text-xs text-ink/55">{t('Each sentence gets its own label, so one complaint can open two incidents.')}</p>
          </div>
        </div>
      )}
    </DemoShell>
  );
}

/* ───────────── 4 · Severity policy ───────────── */
type Sev = { severity: 1 | 2 | 3 | 4; modelSeverity: 1 | 2 | 3 | 4; floor: 1 | 2 | 3 | 4; policy: string | null; forced: boolean; reasons: string[] };
export function SeverityDemo() {
  const { t } = useTranslation();
  const tax = useTaxonomy();
  const [issue, setIssue] = useState('allergen_mislabel');
  const [model, setModel] = useState(3);
  const [forced, setForced] = useState({ safety: true, allergen: true, hygiene: true, misconduct: true });
  const q = usePipeline<Sev>('severity', { issue, modelSeverity: model, forced });
  const it = ISSUE_BY_ID.get(issue)!;
  const s = q.data;
  return (
    <DemoShell title={t('severity = max(policy floor, model severity)')}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Select label={t('Issue type')} value={issue} onChange={setIssue} options={(tax.data ?? []).map((i) => ({ value: i.id, label: `${i.label}${i.policy ? ' ·  policy' : ''}` }))} />
          <Slider label={t('Model severity (S1 most severe)')} value={model} min={1} max={4} onChange={setModel} format={(n) => `S${n}`} />
          <div><div className="eyebrow mb-2">{t('Policy categories forcing S1')}</div>
            <div className="space-y-2">{(Object.keys(POLICY_LABEL) as (keyof typeof POLICY_LABEL)[]).map((k) => <div key={k} className="flex items-center justify-between rounded-2xl bg-surface2/50 px-4 py-2.5 text-sm"><span>{POLICY_LABEL[k]}</span><Switch label={POLICY_LABEL[k]} checked={forced[k]} onChange={(b) => setForced((f) => ({ ...f, [k]: b }))} /></div>)}</div></div>
          {it.policy === 'allergen' && <div className="flex gap-2.5 rounded-2xl border border-b700 bg-surface2 p-3.5 text-[13px]"><Shield className="mt-0.5 h-4 w-4 shrink-0" /><span>{t('FSSAI allergen note: possible undeclared allergen exposure is never treated as a medium issue. The floor holds even when the model is unsure.')}</span></div>}
        </div>
        <div>
          <div className="eyebrow mb-2">{t('Severity ladder')}</div>
          <div className="space-y-2">
            {([1, 2, 3, 4] as const).map((lvl) => {
              const isFinal = s?.severity === lvl; const isFloor = s?.floor === lvl; const isModel = s?.modelSeverity === lvl;
              return (
                <motion.div key={lvl} animate={{ scale: isFinal ? 1.02 : 1 }} className={cn('flex items-center gap-3 rounded-2xl border p-3.5 transition-colors', isFinal ? 'border-b900 bg-b900 text-inverse shadow-lift' : 'border-line bg-surface2/40')}>
                  <SeverityBadge s={lvl} long className={isFinal ? 'ring-2 ring-sand' : ''} />
                  <div className="flex flex-1 flex-wrap justify-end gap-1.5">{isFloor && <Pill tone={isFinal ? 'sand' : 'outline'}>{t('policy floor')}</Pill>}{isModel && <Pill tone={isFinal ? 'sand' : 'outline'}>{t('model says')}</Pill>}{isFinal && <Pill tone="sand"><Check className="h-3 w-3" />{t('final')}</Pill>}</div>
                </motion.div>
              );
            })}
          </div>
          {s && <div className="mt-4 rounded-2xl bg-surface2/60 p-4 text-sm"><div className="font-mono text-[13px]">max(S{s.floor}, S{s.modelSeverity}) = <b>S{s.severity}</b></div>{s.forced && <p className="mt-1.5 flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" />{t('The policy floor overrode a milder model score.')}</p>}<ul className="mt-2 list-disc pl-5 text-xs text-ink/65">{s.reasons.map((r) => <li key={r}>{r}</li>)}</ul></div>}
        </div>
      </div>
    </DemoShell>
  );
}
export const _unused = { Play, useEffect, useMemo, Button };
