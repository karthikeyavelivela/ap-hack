import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home } from 'lucide-react';
import { Button, LinkButton, Sprite } from '@/components/ui';
import { TARA_ERROR } from '@/assets';
import { Logo } from '@/components/Logo';

function Shell({ src, code, title, body, onBack, inApp }: { src: string; code: string; title: string; body: string; onBack?: () => void; inApp?: boolean }) {
  const nav = useNavigate();
  const { t } = useTranslation();
  return (
    <div className={inApp ? 'flex min-h-[60vh] items-center justify-center' : 'flex min-h-screen flex-col items-center justify-center px-4 py-10'}>
      {!inApp && <Logo className="mb-8" />}
      <div className="flex max-w-lg flex-col items-center text-center">
        <Sprite src={src} size={inApp ? 230 : 280} />
        <div className="font-display text-6xl text-caramel">{code}</div>
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-ink/65">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack ?? (() => (window.history.length > 1 ? nav(-1) : nav('/')))}>{t('Go back')}</Button>
          <LinkButton to={inApp ? '/app' : '/'} icon={<Home className="h-4 w-4" />}>{inApp ? t('Back to dashboard') : t('Home')}</LinkButton>
        </div>
      </div>
    </div>
  );
}

export function NotFound({ inApp }: { inApp?: boolean }) {
  const { t } = useTranslation();
  return <Shell src={TARA_ERROR.lost} code="404" title={t('This path leads nowhere')} body={t('Tara looked everywhere, but the page you wanted is not here. It may have moved, or the link may be mistyped.')} inApp={inApp} />;
}
export function ServerError() {
  const { t } = useTranslation();
  return <Shell src={TARA_ERROR.broken} code="500" title={t('Something broke on our side')} body={t('Tara is already fixing it. Please go back and try again in a moment.')} />;
}
export function Forbidden({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  return <Shell src={TARA_ERROR.forbidden} code="403" title={t('This area is not open to your role')} body={t('Your current role does not include this page. Switch role from the profile menu or ask Head Office for access.')} onBack={onBack} inApp />;
}
