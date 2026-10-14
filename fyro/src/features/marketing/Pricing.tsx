import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Section, Fade } from './bits';
import { Segmented, LinkButton, Pill } from '@/components/ui';
import { cn } from '@/lib';

const TIERS = [
  { n: 'Store', m: 4900, tag: 'One store, one manager', f: ['Store dashboard and checklist', 'Staff note submission', 'Incident tracking', 'Tara assistant', 'Email support'], to: '/signup' },
  { n: 'Region', m: 49000, tag: 'A whole region, up to 40 stores', f: ['Everything in Store', 'Emerging-Issue Radar', 'Weekly regional brief + PDF', 'Store leaderboards', 'Routing and SLAs', 'Priority support'], pop: true, to: '/signup' },
  { n: 'Enterprise', m: 0, tag: 'The whole chain', f: ['Everything in Region', 'All regions and functions', 'Policy and taxonomy editor', 'SSO and audit log', 'Custom channels and languages', 'Dedicated success manager'], to: '/contact' },
];

export default function Pricing() {
  const { t } = useTranslation();
  const [yearly, setYearly] = useState(true);
  return (
    <div>
      <header className="bg-b900 pb-16 pt-36 text-center text-white"><div className="container-x"><div className="eyebrow !text-sand">{t('Pricing')}</div><h1 className="mx-auto mt-3 max-w-3xl font-display text-6xl leading-[0.95] sm:text-8xl">{t('Pay for the stores you listen to')}</h1><div className="mt-8 flex justify-center"><Segmented label="Billing" value={yearly ? 'y' : 'm'} onChange={(v) => setYearly(v === 'y')} options={[{ value: 'm', label: t('Monthly') }, { value: 'y', label: <>{t('Yearly')} <Pill tone="sand" className="!py-0">−20%</Pill></> }]} className="!border-white/20 !bg-white/10 [&_button]:!text-white [&_button[aria-checked=true]]:!text-b900" /></div></div></header>
      <Section>
        <div className="grid gap-6 lg:grid-cols-3">{TIERS.map((p, i) => { const price = Math.round(p.m * (yearly ? 0.8 : 1)); return (
          <Fade key={p.n} delay={i * 0.08}><div className={cn('card relative flex h-full flex-col p-7', p.pop && 'border-b900 shadow-lift lg:-translate-y-3')}>
            {p.pop && <Pill tone="dark" className="absolute -top-3 left-7">{t('Most popular')}</Pill>}
            <h3 className="text-xl font-bold">{p.n}</h3><p className="text-sm text-ink/60">{t(p.tag)}</p>
            <div className="mt-5 h-16">{p.m ? <div className="flex items-baseline gap-1"><span className="text-sm font-semibold">₹</span><motion.span key={price} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-6xl">{price.toLocaleString('en-IN')}</motion.span><span className="text-sm text-ink/55">/ {t('month')}</span></div> : <div className="font-display text-5xl">{t("Let's talk")}</div>}</div>
            <ul className="mt-4 flex-1 space-y-2.5">{p.f.map((f) => <li key={f} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-caramel" strokeWidth={3} />{t(f)}</li>)}</ul>
            <LinkButton to={p.to} full size="lg" variant={p.pop ? 'primary' : 'secondary'} className="mt-7">{p.m ? t('Start free trial') : t('Contact sales')}</LinkButton>
          </div></Fade>); })}</div>
        <p className="mt-8 text-center text-sm text-ink/55">{t('Illustrative pricing for the demo. 14-day trial, no card needed.')}</p>
      </Section>
    </div>
  );
}
