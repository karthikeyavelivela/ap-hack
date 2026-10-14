import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer, Share2 } from 'lucide-react';
import { PageHeader, Button, Skeleton, Card, QueryError, toast } from '@/components/ui';
import { BriefSheet } from './BriefSheet';
import { shareLink } from './BriefsPage';
import { useBrief } from '@/hooks/queries';
import { REGIONS, RegionId } from '@/mocks/geo';

export default function BriefView() {
  const { region = '', week = '41' } = useParams();
  const [sp, setSp] = useSearchParams();
  const { t } = useTranslation();
  const q = useBrief(region, Number(week));
  const name = REGIONS.find((r) => r.id === (region as RegionId))?.name ?? region;

  useEffect(() => {
    if (sp.get('print') === '1' && q.data) {
      const h = setTimeout(() => { window.print(); setSp((p) => { const n = new URLSearchParams(p); n.delete('print'); return n; }, { replace: true }); }, 700);
      return () => clearTimeout(h);
    }
  }, [sp, q.data, setSp]);

  return (
    <div>
      <div className="no-print">
        <PageHeader back="/app/briefs" crumbs={[{ label: t('Regional briefs'), to: '/app/briefs' }, { label: name }, { label: `${t('Week')} ${week}` }]} title={`${name} · ${t('Week')} ${week}`}
          actions={<>
            <Button variant="secondary" size="sm" icon={<Share2 className="h-4 w-4" />} onClick={() => void shareLink(location.href.split('?')[0], t('Brief link copied'))}>{t('Share')}</Button>
            <Button size="sm" icon={<Printer className="h-4 w-4" />} onClick={() => { toast.info(t('Choose "Save as PDF" in the print dialog')); setTimeout(() => window.print(), 400); }}>{t('Export PDF')}</Button>
          </>} />
      </div>
      {q.isLoading ? <Skeleton className="mx-auto h-[720px] max-w-[900px]" /> : q.isError ? <Card><QueryError error={q.error as Error} onRetry={() => void q.refetch()} /></Card> : q.data && <BriefSheet b={q.data} />}
    </div>
  );
}
