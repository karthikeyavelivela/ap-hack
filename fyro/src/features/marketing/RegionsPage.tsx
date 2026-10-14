import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Section, Fade } from './bits';
import { APMap } from '@/components/APMap';
import { Button, Pill, Skeleton, LinkButton } from '@/components/ui';
import { useRegions, usePublicStats } from '@/hooks/queries';
import { REGION_SCENE } from '@/assets';
import { REGIONS, DISTRICTS, RegionId } from '@/mocks/geo';
import { cn } from '@/lib';

export default function RegionsPage() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const sel = (sp.get('r') as RegionId | null) ?? null;
  const q = useRegions(); const st = usePublicStats();
  const info = sel ? q.data?.find((r) => r.id === sel) : null;
  return (
    <div>
      <header className="bg-b900 pb-16 pt-36 text-center text-white"><div className="container-x"><div className="eyebrow !text-sand">{t('Regions')}</div><h1 className="mx-auto mt-3 max-w-3xl font-display text-6xl leading-[0.95] sm:text-8xl">{t('Three regions, twenty-six districts')}</h1></div></header>
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="card p-4 sm:p-6"><div className="aspect-[8/7]"><APMap focusRegion={sel} onRegion={(r) => setSp({ r })} onDistrict={(id) => setSp({ r: DISTRICTS.find((d) => d.id === id)!.region })} stores={(st.data?.pins ?? []).map((p) => ({ id: p.id, lat: p.lat, lng: p.lon, districtId: DISTRICTS.find((d) => d.region === p.region)?.id }))} /></div>{sel && <Button className="mt-3" size="sm" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setSp({})}>{t('Back to all regions')}</Button>}</div>
          <div className="space-y-4">
            {REGIONS.map((r, i) => { const d = q.data?.find((x) => x.id === r.id); const on = sel === r.id; return (
              <Fade key={r.id} delay={i * 0.07}><button onClick={() => setSp({ r: r.id })} className={cn('card card-hover flex w-full gap-4 overflow-hidden p-0 text-left', on && 'ring-2 ring-b900')}><img src={REGION_SCENE[r.id]} alt="" className="hidden h-36 w-40 shrink-0 object-cover sm:block" loading="lazy" /><div className="p-5"><div className="flex items-center gap-2"><h3 className="text-lg font-bold">{r.name}</h3><span className="text-sm text-ink/55">{r.telugu}</span></div><p className="mt-1 text-sm text-ink/65">{r.blurb}</p><div className="mt-3 flex flex-wrap gap-2">{d ? <><Pill>{d.stores} stores</Pill><Pill>{d.districtNames.length} districts</Pill><Pill tone="dark">{d.records.toLocaleString('en-IN')} records / wk</Pill></> : <Skeleton className="h-6 w-48" />}</div></div></button></Fade>
            ); })}
            {info && <div className="card p-5"><div className="eyebrow mb-2">{info.name} · {t('districts')}</div><div className="flex flex-wrap gap-1.5">{info.districtNames.map((n) => <Pill key={n}>{n}</Pill>)}</div><LinkButton to="/login" size="sm" className="mt-4">{t('Open this region in the demo')}</LinkButton></div>}
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-ink/55">{t('Map is stylised. District shapes are illustrative.')} <Link to="/contact" className="font-semibold text-caramel hover:underline">{t('Need another state?')}</Link></p>
      </Section>
    </div>
  );
}
