import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen, Menu, Search } from 'lucide-react';
import { useAuth, useUI, useTour } from '@/store';
import { NAV, NAV_FOOT, NavItem, canAccess, ROLE_LABEL } from '@/app/nav';
import { Logo } from '@/components/Logo';
import { Breadcrumbs, IconButton, Drawer, Spinner, Pill, Tooltip, Crumb } from '@/components/ui';
import { ThemeToggle, LanguageSwitcher, WeekPicker, RegionFilter, NotificationBell, ProfileMenu } from '@/components/shell/Controls';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { Forbidden } from '@/routes/ErrorPages';
import { cn } from '@/lib';

const TaraDock = lazy(() => import('@/features/tara/TaraDock'));
const ProductTour = lazy(() => import('@/features/tour/ProductTour'));

const CRUMB_LABELS: Record<string, string> = {
  app: 'Dashboard', inbox: 'Feedback inbox', incidents: 'Incidents', emerging: 'Emerging radar', briefs: 'Regional briefs', routing: 'Routing', stores: 'Stores', map: 'AP map',
  layers: 'Pipeline layers', evaluation: 'Evaluation', explorer: 'Data explorer', taxonomy: 'Taxonomy', policy: 'Severity & escalation', users: 'Users', notifications: 'Notifications',
  settings: 'Settings', help: 'Help', tara: 'Ask Tara',
};

function NavList({ items, collapsed, onNavigate, t }: { items: NavItem[]; collapsed: boolean; onNavigate?: () => void; t: (s: string) => string }) {
  return (
    <ul className="space-y-1">
      {items.map((n) => {
        const Icon = n.icon;
        const link = (
          <NavLink to={n.to} end={n.to === '/app'} onClick={onNavigate} data-tour={n.tour}
            className={({ isActive }) => cn('group flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-b900 text-inverse shadow-soft' : 'text-ink hover:bg-surface2', collapsed && 'justify-center px-0')}>
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {!collapsed && <span className="truncate">{t(n.label)}</span>}
          </NavLink>
        );
        return <li key={n.to}>{collapsed ? <Tooltip text={t(n.label)} side="right">{link}</Tooltip> : link}</li>;
      })}
    </ul>
  );
}

function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const user = useAuth((s) => s.user)!;
  const { t } = useTranslation();
  const tr = (s: string) => t(s);
  const mine = (sec: NavItem['section']) => NAV.filter((n) => n.section === sec && n.roles.includes(user.role));
  const sections: [string, NavItem[]][] = [['', mine('main')], [t('Insight'), mine('insight')], [t('Admin'), mine('admin')]];
  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className={cn('flex items-center px-2 pt-2', collapsed && 'justify-center')}>
        <Logo to="/app" size={collapsed ? 24 : 30} />
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-4 overflow-y-auto">
        {sections.map(([title, items]) => items.length > 0 && (
          <div key={title || 'main'}>
            {title && !collapsed && <div className="eyebrow mb-1.5 px-3.5">{title}</div>}
            <NavList items={items} collapsed={collapsed} onNavigate={onNavigate} t={tr} />
          </div>
        ))}
      </nav>
      <div className="border-t border-line pt-3">
        <NavList items={NAV_FOOT.filter((n) => n.roles.includes(user.role))} collapsed={collapsed} onNavigate={onNavigate} t={tr} />
        {!collapsed && <div className="mt-3 px-3"><Pill tone="dark">{ROLE_LABEL[user.role]}</Pill></div>}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, token } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar, setPalette } = useUI();
  const [drawer, setDrawer] = useState(false);
  const { completed, running, start } = useTour();

  useEffect(() => { setDrawer(false); }, [loc.pathname]);
  // one-time product tour on first login per role
  useEffect(() => {
    if (!user || running) return;
    if (completed[`tourCompleted:${user.role}`]) return;
    const h = setTimeout(() => { if (loc.pathname === '/app') start(); }, 1400);
    return () => clearTimeout(h);
  }, [user, completed, running, start, loc.pathname]);

  const crumbs: Crumb[] = useMemo(() => {
    const parts = loc.pathname.split('/').filter(Boolean);
    const out: Crumb[] = [];
    let path = '';
    parts.forEach((p, i) => {
      path += '/' + p;
      const base = CRUMB_LABELS[p];
      out.push({ label: base ? t(base) : decodeURIComponent(p).replace(/-/g, ' '), to: i === parts.length - 1 ? undefined : path });
    });
    return out.length > 1 ? out : [{ label: t('Dashboard') }];
  }, [loc.pathname, t]);

  if (!token || !user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  const allowed = canAccess(loc.pathname, user.role);
  const wide = sidebarCollapsed ? 'lg:pl-[84px]' : 'lg:pl-[264px]';

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-full focus:bg-b900 focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-surface/90 backdrop-blur transition-[width] duration-300 lg:block', sidebarCollapsed ? 'w-[84px]' : 'w-[264px]')}>
        <Sidebar collapsed={sidebarCollapsed} />
        <button onClick={toggleSidebar} aria-label={sidebarCollapsed ? t('Expand sidebar') : t('Collapse sidebar')} className="absolute -right-3.5 top-20 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface shadow-soft hover:bg-surface2" data-tour="sidebar-toggle">
          {sidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </aside>
      <Drawer open={drawer} onClose={() => setDrawer(false)} side="left" width={288} title={<Logo to="/app" size={26} />}><div className="-mx-5 -my-5"><Sidebar collapsed={false} onNavigate={() => setDrawer(false)} /></div></Drawer>

      <div className={cn('transition-[padding] duration-300', wide)}>
        <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-2 px-3 sm:px-6">
            <IconButton label={t('Open menu')} className="lg:hidden" onClick={() => setDrawer(true)}><Menu className="h-5 w-5" /></IconButton>
            <Breadcrumbs items={crumbs} className="hidden min-w-0 flex-1 sm:block" />
            <div className="flex-1 sm:hidden" />
            <button onClick={() => setPalette(true)} data-tour="global-search" className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[13px] text-ink/60 transition hover:border-b500 md:inline-flex md:w-56 lg:w-72" aria-label={t('Search')}>
              <Search className="h-4 w-4" /> <span className="flex-1 text-left">{t('Search')}</span><kbd className="rounded-md border border-line px-1.5 text-[10px] font-semibold">⌘K</kbd>
            </button>
            <IconButton label={t('Search')} className="md:hidden" onClick={() => setPalette(true)}><Search className="h-[18px] w-[18px]" /></IconButton>
            <div className="hidden xl:block"><WeekPicker /></div>
            {(user.role === 'HEAD_OFFICE' || user.role === 'ANALYST') && <div className="hidden 2xl:block"><RegionFilter /></div>}
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell />
            <ProfileMenu />
          </div>
          <div className="flex items-center gap-2 border-t border-line/60 px-3 py-2 xl:hidden sm:px-6"><WeekPicker /></div>
        </header>
        <main id="main" className="px-3 pb-28 pt-6 sm:px-6 lg:px-8" tabIndex={-1}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} className="mx-auto max-w-[1360px]">
              {allowed ? <Outlet /> : <Forbidden onBack={() => nav('/app')} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette />
      <Suspense fallback={null}><TaraDock /></Suspense>
      <Suspense fallback={<Spinner className="hidden" />}>{running && <ProductTour />}</Suspense>
    </div>
  );
}
