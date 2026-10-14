import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';
import { LinkButton, IconButton } from '@/components/ui';
import { LanguageSwitcher, ThemeToggle } from '@/components/shell/Controls';
import { useAuth } from '@/store';
import { cn } from '@/lib';

const TaraDock = lazy(() => import('@/features/tara/TaraDock'));
const LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/features', label: 'Features' },
  { to: '/regions', label: 'Regions' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/docs', label: 'Docs' },
  { to: '/about', label: 'About' },
];

export default function PublicLayout() {
  const { t } = useTranslation();
  const loc = useLocation();
  const token = useAuth((s) => s.token);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let raf = 0;
    const tick = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 12);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="min-h-screen bg-bg">
      <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-300', scrolled ? 'py-2' : 'py-4')}>
        <div className="container-x">
          <div className={cn('flex items-center justify-between gap-3 rounded-full border px-4 py-2 transition-all duration-300 sm:px-5', 'border-line bg-surface/85 shadow-soft backdrop-blur-xl')}>
            <Logo size={30} />
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('rounded-full px-4 py-2 text-sm font-medium transition hover:bg-surface2', isActive && 'bg-surface2 font-semibold')}>{t(l.label)}</NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-1.5">
              <LanguageSwitcher compact />
              <ThemeToggle />
              <div className="hidden items-center gap-2 sm:flex">
                {token ? <LinkButton to="/app" size="sm">{t('Open app')}</LinkButton> : (<><LinkButton to="/login" variant="ghost" size="sm">{t('Log in')}</LinkButton><LinkButton to="/signup" size="sm">{t('Get started')}</LinkButton></>)}
              </div>
              <IconButton label={open ? t('Close menu') : t('Open menu')} className="lg:hidden" onClick={() => setOpen((o) => !o)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</IconButton>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="container-x mt-2 lg:hidden">
              <div className="rounded-3xl border border-line bg-surface p-3 shadow-lift">
                {LINKS.map((l) => <Link key={l.to} to={l.to} className="block rounded-2xl px-4 py-3 text-[15px] font-medium hover:bg-surface2">{t(l.label)}</Link>)}
                <div className="mt-2 grid grid-cols-2 gap-2 p-1">
                  {token ? <LinkButton to="/app" full className="col-span-2">{t('Open app')}</LinkButton> : (<><LinkButton to="/login" variant="secondary" full>{t('Log in')}</LinkButton><LinkButton to="/signup" full>{t('Get started')}</LinkButton></>)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main id="main"><AnimatePresence mode="wait" initial={false}><motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}><Outlet /></motion.div></AnimatePresence></main>
      <Footer />
      <Suspense fallback={null}><TaraDock /></Suspense>
    </div>
  );
}

function Footer() {
  const { t } = useTranslation();
  const cols = [
    { h: 'Product', l: [['/how-it-works', 'How it works'], ['/features', 'Features'], ['/regions', 'Regions'], ['/pricing', 'Pricing']] },
    { h: 'Resources', l: [['/docs', 'Docs'], ['/layers/7', 'Emerging radar'], ['/layers/9', 'Weekly brief'], ['/contact', 'Contact']] },
    { h: 'Company', l: [['/about', 'About'], ['/privacy', 'Privacy'], ['/terms', 'Terms'], ['/login', 'Log in']] },
  ];
  return (
    <footer className="mt-24 border-t border-line bg-surface/60">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo size={34} tag />
          <p className="mt-4 max-w-xs text-sm text-ink/65">{t('Voice-of-Store Engine for Andhra Pradesh retail. Telugu, Hindi, Tamil, Marathi and English in, one weekly action list out.')}</p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <div className="eyebrow mb-3">{t(c.h)}</div>
            <ul className="space-y-2 text-sm">{c.l.map(([to, label]) => <li key={to}><Link to={to} className="text-ink/75 transition hover:text-ink hover:underline">{t(label)}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-ink/55">© 2026 FYRO. {t('Built in Andhra Pradesh.')}</div>
    </footer>
  );
}
