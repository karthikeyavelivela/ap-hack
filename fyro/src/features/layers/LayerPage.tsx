import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Card, StepBadge, Button, PageHeader, BackButton } from '@/components/ui';
import { LayerIcon } from './LayerIcon';
import { CleanDemo, LangDemo, ClassifierDemo, SeverityDemo } from './demos1';
import { DedupDemo, NormaliseDemo, RadarDemo, RoutingDemo, BriefDemo, EvalDemo } from './demos2';
import { LAYERS, LAYER_BY_ID } from '@/mocks/layersContent';
import { useTara } from '@/store';
import { NotFound } from '@/routes/ErrorPages';

const DEMOS = [CleanDemo, LangDemo, ClassifierDemo, SeverityDemo, DedupDemo, NormaliseDemo, RadarDemo, RoutingDemo, BriefDemo, EvalDemo];

export function LayerBody({ id, base }: { id: number; base: string }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const ask = useTara((s) => s.ask);
  const L = LAYER_BY_ID.get(id)!;
  const Demo = DEMOS[id - 1];
  const [step, setStep] = useState(0);
  useEffect(() => { setStep(0); const h = setInterval(() => setStep((s) => (s + 1) % L.steps.length), 1700); return () => clearInterval(h); }, [id, L.steps.length]);
  const prev = LAYER_BY_ID.get(id - 1); const next = LAYER_BY_ID.get(id + 1);
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden !p-0">
        <div className="grid items-center gap-6 p-6 md:grid-cols-[1fr_220px] md:p-8">
          <div>
            <div className="flex items-center gap-3"><StepBadge n={L.id} size={46} /><span className="eyebrow">{t('Layer')} {L.id} {t('of')} 10</span></div>
            <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">{L.title}</h1>
            <p className="mt-2 text-lg text-ink/70">{L.tagline}</p>
            <Button className="mt-5" variant="secondary" icon={<Sparkles className="h-4 w-4" />} onClick={() => ask(`Explain layer ${L.id}`, false)}>{t('Ask Tara about this layer')}</Button>
          </div>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto h-48 w-48"><LayerIcon i={L.id - 1} /></motion.div>
        </div>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card><div className="eyebrow">{t('What it does')}</div><p className="mt-2 leading-relaxed">{L.what}</p></Card>
        <Card><div className="eyebrow">{t('Why it matters')}</div><p className="mt-2 leading-relaxed">{L.why}</p></Card>
      </div>
      <Card>
        <div className="eyebrow mb-3">{t('How it works')}</div>
        <ol className="grid gap-3 md:grid-cols-5">
          {L.steps.map((s, i) => (
            <motion.li key={s} animate={{ y: step === i ? -4 : 0, opacity: step === i ? 1 : 0.6 }} className={`relative rounded-2xl border p-3.5 text-sm transition-colors ${step === i ? 'border-b900 bg-b900 text-inverse shadow-lift' : 'border-line bg-surface2/40'}`}>
              <span className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === i ? 'bg-white text-b900' : 'bg-b900 text-white'}`}>{i + 1}</span>{s}
              {i < L.steps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-b500 md:block" />}
            </motion.li>
          ))}
        </ol>
      </Card>
      <Demo />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card><div className="eyebrow mb-3">{t('Input → output')}</div><div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]"><div className="rounded-2xl bg-surface2/60 p-4 font-mono text-[13px]">{L.example.input}</div><ArrowRight className="mx-auto h-5 w-5 rotate-90 text-b500 sm:rotate-0" /><div className="rounded-2xl bg-b900 p-4 font-mono text-[13px] text-inverse">{L.example.output}</div></div></Card>
        <div className="grid grid-cols-2 gap-3">{L.metrics.map((m) => <Card key={m.label} className="!p-4"><div className="text-xl font-bold tabular-nums">{m.value}</div><div className="text-xs text-ink/60">{m.label}</div></Card>)}</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        {prev ? <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => nav(`${base}/${prev.id}`)}>{prev.id}. {prev.title}</Button> : <span />}
        {next ? <Button iconRight={<ArrowRight className="h-4 w-4" />} onClick={() => nav(`${base}/${next.id}`)}>{next.id}. {next.title}</Button> : <Button variant="secondary" onClick={() => nav(base === '/app/layers' ? '/app/layers' : '/how-it-works')}>{t('Back to overview')}</Button>}
      </div>
    </div>
  );
}

export default function LayerPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const n = Number(id);
  if (!LAYER_BY_ID.has(n)) return <NotFound inApp />;
  return (
    <div>
      <PageHeader back="/app/layers" crumbs={[{ label: t('Pipeline layers'), to: '/app/layers' }, { label: LAYER_BY_ID.get(n)!.title }]} title={<span className="sr-only">{LAYER_BY_ID.get(n)!.title}</span>} className="!mb-3" />
      <LayerBody id={n} base="/app/layers" />
    </div>
  );
}
export const _l = { LAYERS, Link, BackButton };
