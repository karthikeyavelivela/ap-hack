import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { PageHeader, Card, DataTable, Select, Input, Pill, SeverityBadge, toast } from '@/components/ui';
import { useTaxonomy, useFunctions } from '@/hooks/queries';
import { useAuth } from '@/store';
import { api } from '@/services/api';
import type { FnId, Sev } from '@/mocks/taxonomy';

export default function TaxonomyPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const edit = useAuth((s) => s.user!.role === 'HEAD_OFFICE');
  const tax = useTaxonomy(); const fns = useFunctions();
  const [q, setQ] = useState(''); const [fn, setFn] = useState('');
  const save = useMutation({ mutationFn: ({ id, ...b }: { id: string; floor?: Sev; fn?: FnId }) => api.put(`/api/taxonomy/${id}`, b), onSuccess: () => { toast.success(t('Taxonomy updated')); void qc.invalidateQueries({ queryKey: ['taxonomy'] }); void qc.invalidateQueries({ queryKey: ['routing'] }); }, onError: (e: Error) => toast.error(e.message) });
  const rows = useMemo(() => (tax.data ?? []).filter((r) => (!fn || r.fn === fn) && (!q || r.label.toLowerCase().includes(q.toLowerCase()))), [tax.data, q, fn]);
  const fo = (fns.data ?? []).map((f) => ({ value: f.id, label: f.name }));
  return (
    <div>
      <PageHeader title={t('Issue taxonomy')} subtitle={edit ? t('30 issue types, their owning function and default severity floor. Edits apply immediately.') : t('Read-only view. Head Office can edit owners and severity floors.')} />
      <Card className="mb-5 !p-4"><div className="grid gap-3 sm:grid-cols-3"><Input className="sm:col-span-2" aria-label={t('Search')} icon={<Search className="h-4 w-4" />} placeholder={t('Search issue types')} value={q} onChange={(e) => setQ(e.target.value)} /><Select size="sm" aria-label={t('Function')} value={fn} onChange={setFn} options={[{ value: '', label: t('All functions') }, ...fo]} /></div></Card>
      <Card pad={false}><DataTable dense rows={rows} rowKey={(r) => r.id} loading={tax.isLoading} error={tax.error as Error | null} onRetry={() => void tax.refetch()} columns={[
        { key: 'l', header: t('Issue type'), cell: (r) => <div><div className="font-semibold">{r.label}</div><div className="font-mono text-[11px] text-ink/50">{r.id}</div></div> },
        { key: 'fam', header: t('Family'), hideOnMobile: true, cell: (r) => <Pill>{r.family}</Pill> },
        { key: 'p', header: t('Policy'), hideOnMobile: true, cell: (r) => r.policy ? <Pill tone="dark" className="capitalize">{r.policy}</Pill> : '—' },
        { key: 'fn', header: t('Owning function'), cell: (r) => edit ? <Select size="sm" aria-label={`Owner of ${r.label}`} className="min-w-[170px]" value={r.fn} onChange={(v) => save.mutate({ id: r.id, fn: v as FnId })} options={fo} /> : <Pill>{fo.find((o) => o.value === r.fn)?.label}</Pill> },
        { key: 'f', header: t('Severity floor'), cell: (r) => edit ? <Select size="sm" aria-label={`Floor of ${r.label}`} className="min-w-[120px]" value={String(r.floor)} onChange={(v) => save.mutate({ id: r.id, floor: Number(v) as Sev })} options={[1, 2, 3, 4].map((s) => ({ value: String(s), label: `S${s}` }))} /> : <SeverityBadge s={r.floor} /> },
      ]} /></Card>
    </div>
  );
}
