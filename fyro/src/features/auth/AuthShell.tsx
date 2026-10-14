import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { Orb } from '@/components/Orb';
import { LayerIcon } from '@/features/layers/LayerIcon';
import { A, LAYER_ICON } from '@/assets';
import { LanguageSwitcher, ThemeToggle } from '@/components/shell/Controls';
import { LAYERS } from '@/mocks/layersContent';
import { useTranslation } from 'react-i18next';

function BrandPanel() {
  const { t } = useTranslation();
  const [on, setOn] = useState(0);
  useEffect(() => { const h = setInterval(() => setOn((o) => (o + 1) % 10), 1100); return () => clearInterval(h); }, []);
  return (
    <div className="relative hidden flex-1 overflow-hidden bg-b900 lg:block">
      <img src={A.particles} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-br from-b900/70 via-transparent to-b900/80" />
      <div className="relative flex h-full flex-col justify-between p-12 text-white">
        <div className="flex items-center justify-between">
          <Logo light size={34} to="/" />
          <div className="flex items-center gap-2 text-white [&_*]:text-white"><LanguageSwitcher compact /></div>
        </div>
        <div className="mx-auto max-w-xl text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="mx-auto mb-6 flex justify-center">
            <Orb size={150} mood="happy" webgl />
          </motion.div>
          <h2 className="font-display text-6xl leading-none">{t('Turning store chatter into action')}</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-white/80">{t('Four channels, five languages, one prioritised weekly list for every store in Andhra Pradesh.')}</p>
        </div>
        <div>
          <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{t('10 layers, live')}</div>
          <div className="flex items-end justify-center gap-2.5">
            {LAYER_ICON.map((src, i) => (
              <motion.div key={i} animate={{ scale: on === i ? 1.22 : 1, opacity: on === i ? 1 : 0.55, y: on === i ? -6 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 p-1.5 shadow-lift">
                <LayerIcon i={i} />
              </motion.div>
            ))}
          </div>
          <div className="mt-3 text-center text-sm font-medium text-white/90">{t(LAYERS[on].title)}</div>
        </div>
      </div>
    </div>
  );
}

/** Phone-proportioned auth card with curved gradient hero, plus the brand panel on desktop. */
export function AuthShell({ children, hero = true, heading }: { children: ReactNode; hero?: boolean; heading?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="mx-auto flex w-full max-w-[460px] flex-col lg:mx-0 lg:max-w-none lg:basis-[500px] lg:items-center lg:justify-center lg:px-8 lg:py-8">
        <div className="relative flex w-full flex-1 flex-col overflow-hidden bg-bg lg:max-h-[860px] lg:flex-none lg:rounded-[40px] lg:border lg:border-line lg:bg-surface lg:shadow-lift">
          {hero && (
            <div className="relative overflow-hidden rounded-b-[40px] bg-gradient-to-br from-b900 via-b700 to-caramel px-6 pb-7 pt-6 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Logo light size={38} to="/" tag />
                </div>
                <div className="relative z-10 -mt-1 flex items-center gap-1 text-white [&_button]:text-white [&_button:hover]:bg-white/15"><ThemeToggle /><div className="lg:hidden"><LanguageSwitcher /></div></div>
              </div>
              <img src={A.loginHero} alt="" aria-hidden className="pointer-events-none absolute -right-2 bottom-0 h-[170px] w-auto select-none object-contain opacity-95 mix-blend-normal sm:h-[190px]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="h-[110px]" />
              {heading}
            </div>
          )}
          <div className="flex-1 px-6 pb-8 pt-6">{children}</div>
        </div>
        <p className="py-4 text-center text-[11px] text-ink/50 lg:hidden">{t('Store voices, turned into action.')}</p>
      </div>
      <BrandPanel />
    </div>
  );
}
