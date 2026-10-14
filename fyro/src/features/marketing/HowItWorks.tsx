import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Section, Heading } from './bits';
import { LayerIcon } from '@/features/layers/LayerIcon';
import { LinkButton, StepBadge } from '@/components/ui';
import { LAYERS } from '@/mocks/layersContent';
import { A } from '@/assets';
import { cn } from '@/lib';

export default function HowItWorks() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setIdx(Math.min(9, Math.floor(v * 10))));
  const prog = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const L = LAYERS[idx];
  return (
    <div>
      <header className="bg-b900 pb-20 pt-36 text-center text-white"><div className="container-x"><div className="eyebrow !text-sand">{t('How it works')}</div><h1 className="mx-auto mt-3 max-w-4xl font-display text-6xl leading-[0.95] sm:text-8xl">{t('From a Telugu complaint to a Monday action list')}</h1><img src={A.pipelineHero} alt="Reviews, ratings, WhatsApp notes and tickets flow through Tara into briefs, routing and the AP map" className="mx-auto mt-12 w-full max-w-4xl rounded-3xl shadow-lift" /></div></header>
      {/* desktop: pinned scroll story */}
      <div ref={ref} className="relative hidden lg:block" style={{ height: '1000vh' }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden bg-bg">
          <div className="container-x grid items-center gap-14 lg:grid-cols-2">
            <div>
              <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-surface2"><motion.div style={{ width: prog }} className="h-full rounded-full bg-gradient-to-r from-b900 to-caramel" /></div>
              <motion.div key={idx} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <div className="flex items-center gap-3"><StepBadge n={L.id} size={48} /><span className="eyebrow">{t('Layer')} {L.id} / 10</span></div>
                <h2 className="mt-4 font-display text-7xl leading-[0.95]">{L.title}</h2>
                <p className="mt-4 text-lg text-ink/70">{L.what}</p>
                <div className="mt-5 rounded-2xl bg-b900 p-4 font-mono text-[13px] text-white"><div className="text-white/55">{L.example.input}</div><div className="mt-1 text-sand">→ {L.example.output}</div></div>
                <LinkButton to={`/layers/${L.id}`} className="mt-6" iconRight={<ArrowRight className="h-4 w-4" />}>{t('Try the live demo')}</LinkButton>
              </motion.div>
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[440px]">
              <div className="absolute inset-0 rounded-full bg-caramel/15 blur-3xl" />
              <motion.div key={`i${idx}`} initial={{ opacity: 0, scale: 0.8, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }} className="absolute inset-0"><LayerIcon i={idx} /></motion.div>
              <div className="absolute -right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">{LAYERS.map((l, i) => <span key={l.id} className={cn('h-2 rounded-full transition-all', i === idx ? 'w-7 bg-b900' : 'w-2 bg-line')} />)}</div>
            </div>
          </div>
        </div>
      </div>
      {/* mobile: stacked */}
      <Section className="lg:hidden"><div className="space-y-6">{LAYERS.map((l, i) => <div key={l.id} className="card p-5"><div className="flex items-center gap-3"><StepBadge n={l.id} /><h3 className="text-xl font-bold">{l.title}</h3></div><div className="mx-auto my-3 h-36 w-36"><LayerIcon i={i} /></div><p className="text-sm text-ink/70">{l.what}</p><Link to={`/layers/${l.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-caramel">{t('Try the live demo')}<ArrowRight className="h-4 w-4" /></Link></div>)}</div></Section>
      <Section className="bg-surface text-center"><Heading center title={t('See it on real-looking data')} sub={t('Log in with a demo role and explore every screen.')} /><LinkButton to="/login" size="lg">{t('Open the demo')}</LinkButton></Section>
    </div>
  );
}
