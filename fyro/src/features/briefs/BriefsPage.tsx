import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Printer, Share2 } from 'lucide-react';
import { PageHeader, Tabs, Button, Skeleton, Select, toast, Card, QueryError } from '@/components/ui';
import { BriefSheet } from './BriefSheet';
import { useBrief } from '@/hooks/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { useAuth, useUI } from '@/store';
import { WEEKS, weekLabel } from '@/lib';
import { REGIONS, RegionId } from '@/mocks/geo';

export async function shareLink(url: string, msg: string) {
  try { await navigator.clipboard.writeText(url); toast.success(msg); }
  catch {
    const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast.success(msg); } catch { toast.info(url); }
    ta.remove();
  }
}

export default function BriefsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useAuth((s) => s.user)!;
  const gWeek = useUI((s) => s.week);
  const own = user.role === 'REGIONAL_MANAGER' ? user.region : undefined;
  const [f, set] = useUrlState({ region: own ?? 'rayalaseema', week: String(gWeek) });
  const region = (own ?? f.region) as RegionId;
  const week = Number(f.week);
  const q = useBrief(region, week);
  const tabs = REGIONS.filter((r) => !own || r.id === own).map((r) => ({ value: r.id, label: r.name }));
  const url = `${location.origin}/app/briefs/${region}/${week}`;

  return (
    <div>
      <PageHeader title={t('Weekly Regional Briefs')} subtitle={t('One page per region: the five issues that matter, with verbatim customer quotes and record IDs.')}
        actions={<>
          <Select size="sm" aria-label={t('Week')} value={f.week} onChange={(v) => set({ week: v })} options={[...WEEKS].reverse().map((w) => ({ value: String(w), label: weekLabel(w) }))} />
          <Button variant="secondary" size="sm" icon={<Share2 className="h-4 w-4" />} onClick={() => void shareLink(url, t('Brief link copied'))}>{t('Share')}</Button>
          <Button variant="secondary" size="sm" icon={<ExternalLink className="h-4 w-4" />} onClick={() => nav(`/app/briefs/${region}/${week}`)}>{t('Open page')}</Button>
          <Button size="sm" icon={<Printer className="h-4 w-4" />} onClick={() => nav(`/app/briefs/${region}/${week}?print=1`)}>{t('Export PDF')}</Button>
        </>} />
      <Card pad={false} className="mb-5 px-3"><Tabs tabs={tabs} value={region} onChange={(v) => set({ region: v })} /></Card>
      {q.isLoading ? <Skeleton className="mx-auto h-[720px] max-w-[900px]" /> : q.isError ? <Card><QueryError error={q.error as Error} onRetry={() => void q.refetch()} /></Card> : q.data && <BriefSheet b={q.data} />}
    </div>
  );
}
