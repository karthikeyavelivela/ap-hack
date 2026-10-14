import { useTranslation } from 'react-i18next';
import { Section, Heading, Fade } from './bits';
import { LinkButton } from '@/components/ui';
import { AVATAR, A, REGION_SCENE } from '@/assets';

const TEAM = [['Ananya Rao', 'Co-founder, Product'], ['Ravindra Kumar', 'Co-founder, Retail Ops'], ['Kiran Teja', 'ML Engineering'], ['Sowmya Devi', 'Design'], ['Prof. M. Sastry', 'Advisor, Linguistics'], ['Deepa Nair', 'Customer Success']];

export default function About() {
  const { t } = useTranslation();
  return (
    <div>
      <header className="bg-b900 pb-20 pt-36 text-center text-white"><div className="container-x"><div className="eyebrow !text-sand">{t('About')}</div><h1 className="mx-auto mt-3 max-w-4xl font-display text-6xl leading-[0.95] sm:text-8xl">{t('Stores already tell you what is wrong. We make it audible.')}</h1></div></header>
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2"><Fade><Heading eyebrow={t('Mission')} title={t('Listen in the language customers use')} sub={t('Retail feedback in Andhra Pradesh is written in Telugu mixed with English, Hindi and Tamil, with typos and emojis. Most analytics throws it away. FYRO reads it, merges it and routes it so the right person acts this week.')} /></Fade><Fade delay={0.1}><img src={A.bannerStore} alt="" className="w-full rounded-3xl border border-line" loading="lazy" /></Fade></div>
      </Section>
      <Section className="bg-surface">
        <Heading center eyebrow={t('Why Andhra Pradesh')} title={t('A hard, honest test case')} />
        <div className="grid gap-5 md:grid-cols-3">{(['uttarandhra', 'coastal', 'rayalaseema'] as const).map((r, i) => <Fade key={r} delay={i * 0.07}><div className="card overflow-hidden"><img src={REGION_SCENE[r]} alt="" className="h-40 w-full object-cover" loading="lazy" /><p className="p-5 text-sm text-ink/70">{[t('Three scripts and four languages across 26 districts.'), t('Festival spikes and cyclone power cuts that distort every weekly average.'), t('Heat that breaks equipment long before anyone files a ticket.')][i]}</p></div></Fade>)}</div>
      </Section>
      <Section>
        <Heading center eyebrow={t('Team')} title={t('The people behind FYRO')} />
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">{TEAM.map(([n, r], i) => <Fade key={n} delay={i * 0.05} className="text-center"><img src={AVATAR[i]} alt={n} className="mx-auto h-28 w-28 rounded-full border border-line object-cover" loading="lazy" /><div className="mt-3 text-sm font-semibold">{n}</div><div className="text-xs text-ink/55">{r}</div></Fade>)}</div>
        <div className="mt-12 text-center"><LinkButton to="/contact" size="lg">{t('Get in touch')}</LinkButton></div>
      </Section>
    </div>
  );
}
