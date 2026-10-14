import { useTranslation } from 'react-i18next';
import { PageHeader, Card } from '@/components/ui';
import { TaraChat } from './TaraChat';

export default function TaraPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('Ask Tara')} subtitle={t('Your retail insights assistant. Answers come from live mock data and can be read aloud.')} back="/app" />
      <Card pad={false} className="mx-auto h-[calc(100vh-240px)] min-h-[520px] max-w-3xl overflow-hidden"><TaraChat big /></Card>
    </div>
  );
}
