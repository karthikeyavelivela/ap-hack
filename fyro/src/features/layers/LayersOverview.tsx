import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { PageHeader, StepBadge, Card } from '@/components/ui';
import { LayerIcon } from './LayerIcon';
import { LAYERS } from '@/mocks/layersContent';
import { A } from '@/assets';

export function LayerGrid({ base }: { base: string }) {
  const nav = useNavigate();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {LAYERS.map((l, i) => (
        <motion.button key={l.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 5) * 0.06 }} onClick={() => nav(`${base}/${l.id}`)}
          className="card card-hover group flex flex-col items-start p-5 text-left">
          <div className="flex w-full items-start justify-between"><StepBadge n={l.id} /><div className="h-20 w-20 transition-transform duration-300 group-hover:scale-110"><LayerIcon i={i} /></div></div>
          <h3 className="mt-3 text-[15px] font-semibold leading-tight">{l.title}</h3>
          <p className="mt-1 text-[13px] text-ink/65">{l.tagline}</p>
        </motion.button>
      ))}
    </div>
  );
}

export default function LayersOverview() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('Ten layers, one pipeline')} subtitle={t('Click any layer for an explainer with a live demo on mock records.')} />
      <Card className="mb-6 overflow-hidden !p-0"><img src={A.pipelineStrip} alt="The 10 pipeline layers in sequence" className="w-full" /></Card>
      <LayerGrid base="/app/layers" />
    </div>
  );
}
