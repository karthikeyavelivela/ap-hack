import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Play, Quote, Radar, Star, TrendingUp, ShieldAlert } from 'lucide-react';
import { Section, Heading, Fade, CountUp } from './bits';
import { LinkButton, Sprite, Pill, SeverityBadge } from '@/components/ui';
import { Orb } from '@/components/Orb';
import { APMap } from '@/components/APMap';
import { LayerIcon } from '@/features/layers/LayerIcon';
import { LAYERS } from '@/mocks/layersContent';
import { usePublicStats } from '@/hooks/queries';
import { A, AVATAR, CHANNEL_ICON, REGION_SCENE } from '@/assets';
import { STORES } from '@/mocks/geo';
import { cn } from '@/lib';

const TESTI = [
  { n: 'Lakshmi Prasanna', r: 'Regional Manager, Coastal Andhra', a: 3, q: 'Monday used to be four dashboards and a lot of guessing. Now I open one page, read five issues, and call three store managers before ten.' },
  { n: 'Srinivas Naidu', r: 'Store Manager, Visakhapatnam', a: 1, q: 'A customer wrote in Telugu that a counter staff shouted at them. Head office knew before I did. That never happened before.' },
  { n: 'Meena Iyer', r: 'Head of Store Operations', a: 4, q: 'The freezer alert came two days before the weekly report would have. We saved a full day of ice cream and a lot of angry reviews.' },
];

function ProductPreview() {
  const rows = [['S1', 'Allergen mislabel', 'TPT-03', 4], ['S1', 'Staff misconduct', 'VSP-03', 4], ['S2', 'Freezer failure', 'ATP-07', 4], ['S3', 'Billing queue', 'VJA-01', 3]] as const;
  return (
    <motion.div initial={{ opacity: 0, y: 40, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.3, duration: 0.9 }} className="relative mx-auto mt-14 max-w-5xl [perspective:1400px]">
      <div className="absolute -inset-x-10 -bottom-10 top-10 rounded-[48px] bg-caramel/30 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-surface text-ink shadow-[0_40px_120px_-20px_rgba(0,0,0,.65)]">
        <div className="flex items-center gap-2 border-b border-line bg-surface2/70 px-4 py-2.5"><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="mx-auto rounded-full bg-surface px-4 py-0.5 text-[11px] text-ink/50">app.fyro.in/app</span></div>
        <div className="grid gap-4 p-4 sm:grid-cols-[1.1fr_1fr] sm:p-6">
          <div>
            <div className="mb-3 grid grid-cols-3 gap-3 text-left">{[['Records', '6,608'], ['Incidents', '429'], ['Lead time', '3.3 d']].map(([l, v]) => <div key={l} className="rounded-2xl border border-line p-3"><div className="text-[11px] text-ink/55">{l}</div><div className="text-xl font-bold tabular-nums">{v}</div></div>)}</div>
            <div className="space-y-2">{rows.map(([s, t, st, ch]) => <div key={t} className="flex items-center gap-3 rounded-2xl border border-line p-3 text-left"><SeverityBadge s={Number(s[1]) as 1} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{t}</div><div className="text-xs text-ink/55">{st}</div></div><div className="flex -space-x-1.5">{['review', 'app', 'whatsapp', 'ticket'].slice(0, ch).map((c) => <img key={c} src={CHANNEL_ICON[c]} alt="" className="h-6 w-6 rounded-full border-2 border-surface bg-surface2 object-contain" />)}</div></div>)}</div>
          </div>
          <div className="relative rounded-2xl border border-line bg-surface2/40 p-2"><div className="aspect-[8/7]"><APMap showLabels={false} interactive={false} stores={STORES.filter((s) => s.code.endsWith('-01') || s.code === 'ATP-07').map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, emerging: ['ATP-07', 'TPT-03', 'VSP-03'].includes(s.id) }))} pulse={['ATP-07']} /></div><Pill tone="dark" className="absolute bottom-3 left-3">● ATP-07 · score 100</Pill></div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const stats = usePublicStats();
  const [on, setOn] = useState(0);
  useEffect(() => { const h = setInterval(() => setOn((o) => (o + 1) % 10), 1500); return () => clearInterval(h); }, []);
  const L = LAYERS[on];
  return (
    <div>
      {/* hero */}
      <header className="relative overflow-hidden bg-b900 pb-24 pt-32 text-white sm:pt-40">
        <img src={A.particles} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-b900/40 via-b900/20 to-b900" />
        <div className="container-x relative text-center">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}><Pill tone="outline" className="!border-white/30 !text-white">● {t('Live across 26 districts of Andhra Pradesh')}</Pill></motion.div>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7 }} className="mx-auto mt-6 max-w-4xl font-display text-[clamp(64px,13vw,168px)] leading-[0.88]">FYRO<span className="text-caramel">.</span></motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mx-auto mt-5 max-w-2xl text-xl font-medium text-white/90 sm:text-2xl">{t('Turning Store Chatter Into Action — Andhra Pradesh')}</motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mx-auto mt-4 max-w-xl text-[16px] text-white/65">{t('Reviews, app ratings, staff WhatsApp notes and call tickets, in Telugu, Hindi, Tamil, Marathi and English, become one ranked weekly list routed to the right owner.')}</motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-8 flex flex-wrap justify-center gap-3"><LinkButton to="/login" size="lg" iconRight={<ArrowRight className="h-4 w-4" />}>{t('Try the live demo')}</LinkButton><LinkButton to="/how-it-works" size="lg" variant="outline" className="!border-white/40 !text-white hover:!bg-white/10" icon={<Play className="h-4 w-4" />}>{t('How it works')}</LinkButton></motion.div>
          <ProductPreview />
        </div>
      </header>

      {/* counters */}
      <section className="border-b border-line bg-surface">
        <div className="container-x grid grid-cols-2 gap-6 py-10 text-center md:grid-cols-4">
          {[[stats.data?.records ?? 40000, t('records processed'), 0, ''], [stats.data?.incidents ?? 1800, t('incidents found'), 0, ''], [stats.data?.avgLeadDays ?? 3.3, t('days earlier than the weekly report'), 1, ''], [stats.data?.stores ?? 122, t('stores in 26 districts'), 0, '']].map(([v, l, d]) => (
            <div key={l as string}><div className="font-display text-5xl sm:text-6xl"><CountUp to={v as number} decimals={d as number} /></div><div className="mt-1 text-sm text-ink/60">{l as string}</div></div>
          ))}
        </div>
      </section>

      {/* pipeline */}
      <Section className="bg-bg">
        <Heading eyebrow={t('The pipeline')} title={t('Ten layers from raw chatter to action')} sub={t('Every layer has its own explainer and a live demo. Watch a record travel through them.')} />
        <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {LAYERS.map((l, i) => (
              <Link key={l.id} to={`/layers/${l.id}`} onMouseEnter={() => setOn(i)} className={cn('group relative rounded-3xl border p-3.5 text-center transition-all duration-500', on === i ? 'border-b900 bg-surface shadow-lift [transform:translateY(-6px)]' : 'border-line bg-surface/60 opacity-70')}>
                <span className={cn('absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors', on === i ? 'bg-b900 text-white' : 'bg-surface2')}>{l.id}</span>
                <div className="mx-auto h-16 w-16"><LayerIcon i={i} /></div><div className="mt-1 line-clamp-2 text-xs font-semibold leading-tight">{l.title}</div>
              </Link>
            ))}
          </div>
          <motion.div key={on} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl bg-b900 p-6 text-white shadow-lift"><div className="text-xs font-semibold uppercase tracking-wider text-sand">Layer {L.id}</div><h3 className="mt-1 text-2xl font-bold">{L.title}</h3><p className="mt-2 text-white/75">{L.tagline}</p><div className="mt-4 rounded-2xl bg-white/10 p-3 font-mono text-[12px]"><div className="text-white/55">{L.example.input}</div><div className="mt-1 text-sand">→ {L.example.output}</div></div><LinkButton to={`/layers/${L.id}`} size="sm" variant="outline" className="mt-5 !border-white/40 !text-white hover:!bg-white/10" iconRight={<ArrowRight className="h-4 w-4" />}>{t('Open explainer')}</LinkButton></motion.div>
        </div>
      </Section>

      {/* radar + map */}
      <Section dark>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Fade><Heading dark eyebrow={t('Emerging-Issue Radar')} title={t('Spot it before the weekly report does')} sub={t('A freezer fails at Anantapur. Reports jump from 0 to 21 a day across four channels. The radar fires two days in. A weekly report would have found it on day seven.')} />
            <div className="flex flex-wrap gap-3"><LinkButton to="/layers/7" variant="primary">{t('Replay the detector')}</LinkButton><LinkButton to="/regions" variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">{t('Explore the regions')}</LinkButton></div>
            <div className="mt-8 grid grid-cols-3 gap-3">{[[Radar, '3 / 3', 'planted incidents caught'], [TrendingUp, '3.3 d', 'average lead time'], [ShieldAlert, '0.82', 'S1 recall']].map(([I, v, l]) => { const Ic = I as typeof Radar; return <div key={l as string} className="rounded-2xl border border-white/15 bg-white/5 p-4"><Ic className="h-5 w-5 text-sand" /><div className="mt-2 text-2xl font-bold">{v as string}</div><div className="text-xs text-white/60">{l as string}</div></div>; })}</div></Fade>
          <Fade delay={0.1}><div className="relative mx-auto aspect-[8/7] max-w-[520px]"><div className="absolute inset-0 rounded-full bg-caramel/20 blur-3xl" /><APMap dark showLabels interactive={false} stores={(stats.data?.pins ?? []).map((p) => ({ id: p.id, lat: p.lat, lng: p.lon }))} pulse={['ATP-07', 'TPT-03', 'VSP-03']} /></div></Fade>
        </div>
      </Section>

      {/* tara */}
      <Section className="bg-surface">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Fade className="order-2 lg:order-1"><div className="relative mx-auto flex max-w-md justify-center"><div className="absolute inset-0 rounded-full bg-caramel/15 blur-3xl" /><Orb size={220} mood="happy" webgl live /></div></Fade>
          <Fade className="order-1 lg:order-2"><Heading eyebrow={t('Meet Tara')} title={t('Ask your stores a question')} sub={t('Tara answers in Telugu, Hindi, Tamil, Marathi or English, links straight to the incident or store, and reads the answer aloud.')} />
            <div className="space-y-2.5">{['Why is ATP-07 flagged?', 'Summarise Rayalaseema this week', 'Which incidents are S1?'].map((q) => <div key={q} className="flex items-center gap-3 rounded-full border border-line bg-bg px-5 py-3 text-sm font-medium"><Star className="h-4 w-4 text-caramel" />{q}</div>)}</div>
            <LinkButton to="/login" className="mt-6" iconRight={<ArrowRight className="h-4 w-4" />}>{t('Ask Tara in the demo')}</LinkButton></Fade>
        </div>
      </Section>

      {/* regions */}
      <Section className="bg-bg">
        <Heading center eyebrow={t('Three regions')} title={t('From Araku hills to Rayalaseema plains')} />
        <div className="grid gap-5 md:grid-cols-3">{(['uttarandhra', 'coastal', 'rayalaseema'] as const).map((r, i) => (
          <Fade key={r} delay={i * 0.08}><Link to={`/regions?r=${r}`} className="card card-hover group block overflow-hidden"><div className="h-52 overflow-hidden"><img src={REGION_SCENE[r]} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" /></div><div className="p-5"><h3 className="text-lg font-bold capitalize">{r === 'coastal' ? 'Coastal Andhra' : r}</h3><p className="mt-1 text-sm text-ink/65">{r === 'uttarandhra' ? 'Port, hills and long supply lines.' : r === 'coastal' ? 'Dense delta towns, festival queues, cyclones.' : 'Hot, dry and wide. Cold-chain under stress.'}</p></div></Link></Fade>
        ))}</div>
      </Section>

      {/* testimonials */}
      <Section className="bg-surface">
        <Heading center eyebrow={t('From the field')} title={t('Operators who stopped guessing')} />
        <div className="grid gap-5 md:grid-cols-3">{TESTI.map((x, i) => (
          <Fade key={x.n} delay={i * 0.08}><figure className="card flex h-full flex-col p-6"><Quote className="h-7 w-7 text-caramel" /><blockquote className="mt-3 flex-1 text-[15px] leading-relaxed">{x.q}</blockquote><figcaption className="mt-5 flex items-center gap-3"><img src={AVATAR[x.a]} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" /><div><div className="text-sm font-semibold">{x.n}</div><div className="text-xs text-ink/55">{x.r}</div></div></figcaption></figure></Fade>
        ))}</div>
      </Section>

      {/* cta */}
      <section className="relative overflow-hidden bg-b900 py-24 text-center text-white">
        <img src={A.particles} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="container-x relative"><Sprite src={A.success} size={150} className="mx-auto" /><h2 className="mx-auto mt-4 max-w-3xl font-display text-5xl leading-none sm:text-7xl">{t('Hear every store. Fix what matters first.')}</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><LinkButton to="/login" size="lg">{t('Try the live demo')}</LinkButton><LinkButton to="/contact" size="lg" variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">{t('Talk to us')}</LinkButton></div></div>
      </section>
    </div>
  );
}
