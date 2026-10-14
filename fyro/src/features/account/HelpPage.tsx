import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Play, LifeBuoy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, Card, SectionTitle, Input, Textarea, Select, Button, toast, Pill } from '@/components/ui';
import { api } from '@/services/api';
import { useTour, useAuth } from '@/store';
import { cn } from '@/lib';

const FAQ: [string, string][] = [
  ['How often does the data refresh?', 'The pipeline processes new records continuously. Weekly briefs are generated every Monday for the week that just closed, and the radar re-evaluates daily series every day.'],
  ['Why did an incident combine records from different channels?', 'Records join an incident when they share a store, an issue family and fall within 72 hours of each other. Four channels describing one broken freezer become one incident with four sources.'],
  ['What does the severity badge mean?', 'S1 critical, S2 high, S3 medium, S4 low. Safety, allergen, hygiene and staff-misconduct issues are always S1 no matter what the model says.'],
  ['When does an incident escalate to Head Office?', 'When it is S1, or when it reaches the configured number of channels and records within the window at S2 or worse. See Severity & escalation for the live rule.'],
  ['How accurate are the alerts?', 'The Evaluation page shows alert precision with a Wilson 95% confidence interval and lead time on the three planted test incidents.'],
  ['Can I use Telugu, Hindi, Tamil or Marathi?', 'Yes. The interface, the tour and Tara work in all five languages. Staff notes can be typed in any of them.'],
];
const KEYS: [string, string][] = [['Cmd / Ctrl + K', 'Open global search'], ['Esc', 'Close dialogs, drawers and the search'], ['← / →', 'Move through the product tour'], ['Tab / Shift + Tab', 'Move between controls'], ['Enter', 'Open the highlighted row or result']];

export default function HelpPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useAuth((s) => s.user)!;
  const start = useTour((s) => s.start);
  const [open, setOpen] = useState<number | null>(0);
  const [f, setF] = useState({ name: user.name, email: user.email, topic: 'question', message: '' });
  const m = useMutation({ mutationFn: () => api.post<{ ticket: string }>('/api/contact', f), onSuccess: (r) => { toast.success(t('Ticket {{id}} created. We reply within a working day.', { id: r.ticket })); setF({ ...f, message: '' }); }, onError: (e: Error) => toast.error(e.message) });
  return (
    <div className="max-w-4xl">
      <PageHeader title={t('Help')} actions={<Button variant="secondary" size="sm" icon={<Play className="h-4 w-4" />} onClick={() => { nav('/app'); setTimeout(start, 350); }}>{t('Replay product tour')}</Button>} />
      <div className="space-y-6">
        <Card><SectionTitle title={t('Frequently asked questions')} />
          <div className="mt-3 divide-y divide-line/60">{FAQ.map(([q, a], i) => (
            <div key={q}><button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold">{t(q)}<ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open === i && 'rotate-180')} /></button>
              <AnimatePresence initial={false}>{open === i && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pb-4 text-sm leading-relaxed text-ink/70">{t(a)}</motion.p>}</AnimatePresence></div>
          ))}</div></Card>
        <Card><SectionTitle title={t('Keyboard shortcuts')} /><ul className="mt-3 grid gap-2 sm:grid-cols-2">{KEYS.map(([k, d]) => <li key={k} className="flex items-center gap-3 rounded-2xl bg-surface2/60 px-4 py-3 text-sm"><Pill tone="outline">{k}</Pill>{t(d)}</li>)}</ul></Card>
        <Card><SectionTitle title={t('Contact support')} eyebrow={<span className="inline-flex items-center gap-1"><LifeBuoy className="h-3 w-3" />support@fyro.in</span> as never} />
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate(); }}>
            <Input label={t('Name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><Input label={t('Email')} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <Select label={t('Topic')} className="sm:col-span-2" value={f.topic} onChange={(v) => setF({ ...f, topic: v })} options={[{ value: 'question', label: t('Question') }, { value: 'bug', label: t('Something is broken') }, { value: 'access', label: t('Access request') }]} />
            <Textarea label={t('How can we help?')} className="sm:col-span-2" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            <div className="sm:col-span-2"><Button type="submit" loading={m.isPending}>{t('Send message')}</Button></div></form></Card>
      </div>
    </div>
  );
}
