import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, Card, SectionTitle, Segmented, Skeleton } from '@/components/ui';
import { Async } from '@/components/Async';
import { EvalDemo } from '@/features/layers/demos2';
import { useEvalConfusion } from '@/hooks/queries';
import { cn } from '@/lib';

function Matrix({ labels, m }: { labels: string[]; m: number[][] }) {
  const max = Math.max(1, ...m.flat());
  return (
    <div className="overflow-x-auto"><table className="text-center text-xs"><thead><tr><th className="p-2 text-left text-[10px] uppercase text-ink/50">true ↓ / predicted →</th>{labels.map((l) => <th key={l} className="max-w-[90px] p-2 font-semibold">{l.replace('People & ', '')}</th>)}</tr></thead>
      <tbody>{m.map((row, i) => <tr key={i}><th className="p-2 text-left font-semibold">{labels[i].replace('People & ', '')}</th>{row.map((v, j) => <td key={j} className={cn('h-12 min-w-[64px] border border-surface font-semibold tabular-nums', i === j && 'ring-1 ring-inset ring-b900/30')} style={{ background: `rgba(107,66,38,${0.05 + (v / max) * 0.9})`, color: v / max > 0.45 ? '#fff' : '#000' }}>{v}</td>)}</tr>)}</tbody></table></div>
  );
}

export default function EvaluationPage() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<'severity' | 'function'>('severity');
  const q = useEvalConfusion();
  return (
    <div className="space-y-6">
      <PageHeader title={t('Evaluation')} subtitle={t('Results of evaluate.py on the labelled sample and the three planted incidents.')} />
      <EvalDemo />
      <Card>
        <SectionTitle title={t('Confusion matrix')} right={<Segmented size="sm" label="Matrix" value={kind} onChange={setKind} options={[{ value: 'severity', label: t('Severity') }, { value: 'function', label: t('Owning function') }]} />} />
        <div className="mt-4"><Async q={q} skeleton={<Skeleton className="h-64" />}>{(d) => <Matrix labels={d[kind].labels} m={d[kind].matrix} />}</Async></div>
      </Card>
    </div>
  );
}
