import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui';
import { LayerBody } from '@/features/layers/LayerPage';
import { LAYER_BY_ID } from '@/mocks/layersContent';
import { NotFound } from '@/routes/ErrorPages';

export default function PublicLayerPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const n = Number(id);
  if (!LAYER_BY_ID.has(n)) return <NotFound />;
  return (
    <div className="container-x pb-8 pt-28">
      <div className="mb-5 flex items-center gap-3"><BackButton fallback="/how-it-works" label={t('How it works')} /></div>
      <LayerBody id={n} base="/layers" />
    </div>
  );
}
