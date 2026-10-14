import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Section, Heading, Fade } from './bits';
import { LinkButton } from '@/components/ui';
import { FEATURE_ICON, A } from '@/assets';

const F = [
  ['Early warning', 'The radar spots rising store × issue pairs days before a weekly report, with p-values and a space-time scan.', '/layers/7'],
  ['Cross-channel dedup', 'Four channels describing one broken freezer become a single incident with every source kept.', '/layers/5'],
  ['Smart routing', 'Thirty issue types map to five owning functions with SLAs and a clear escalation rule.', '/layers/8'],
  ['Regional briefs', 'One page per region with five issues, verbatim quotes, English gloss and record IDs. Export to PDF.', '/layers/9'],
  ['Truly multilingual', 'Telugu, Hindi, Tamil, Marathi and English in the same sentence, tagged word by word.', '/layers/2'],
  ['Tara, your assistant', 'Ask in any language. Tara links to the evidence and reads answers aloud with Sarvam AI voices.', '/login'],
] as const;

export default function Features() {
  const { t } = useTranslation();
  return (
    <div>
      <header className="bg-b900 pb-20 pt-36 text-center text-white"><div className="container-x"><div className="eyebrow !text-sand">{t('Features')}</div><h1 className="mx-auto mt-3 max-w-3xl font-display text-6xl leading-[0.95] sm:text-8xl">{t('Everything between a complaint and a fix')}</h1></div></header>
      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{F.map(([h, b, to], i) => (
          <Fade key={h} delay={(i % 3) * 0.07}><Link to={to} className="card card-hover group flex h-full flex-col p-6"><img src={FEATURE_ICON[i]} alt="" className="h-36 w-36 object-contain transition-transform duration-500 group-hover:scale-110" loading="lazy" /><h3 className="mt-3 text-xl font-bold">{t(h)}</h3><p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink/65">{t(b)}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-caramel">{t('See it work')}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link></Fade>
        ))}</div>
      </Section>
      <Section className="bg-surface"><div className="grid items-center gap-10 lg:grid-cols-2"><Fade><img src={A.pipelineHero} alt="" className="w-full rounded-3xl border border-line" loading="lazy" /></Fade><Fade delay={0.1}><Heading title={t('Built for operators, not data scientists')} sub={t('Every number links to the records behind it. Every alert says why it fired. Every action has an owner and a deadline.')} /><LinkButton to="/login" size="lg">{t('Try the live demo')}</LinkButton></Fade></div></Section>
    </div>
  );
}
