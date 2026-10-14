import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Globe, Moon, Sun, LogOut, Settings, Repeat, PlayCircle, Check, CalendarDays, UserCircle2 } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Popover, MenuItem } from './Popover';
import { IconButton, Avatar, toast, Pill } from '@/components/ui';
import { LANGS } from '@/i18n';
import { useUI, useAuth, useTour, Lang } from '@/store';
import { useNotifications } from '@/hooks/queries';
import { api } from '@/services/api';
import { ROLE_LABEL, DEMO_ACCOUNTS } from '@/app/nav';
import { ROLES, Role } from '@/mocks/db';
import { WEEKS, weekLabel, timeAgo, MOCK_NOW } from '@/lib';

export function ThemeToggle() {
  const { theme, toggleTheme } = useUI();
  const { t } = useTranslation();
  return (
    <IconButton label={theme === 'light' ? t('Switch to dark mode') : t('Switch to light mode')} onClick={toggleTheme}>
      {theme === 'light' ? <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />}
    </IconButton>
  );
}

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useUI();
  const { t } = useTranslation();
  const cur = LANGS.find((l) => l.code === lang)!;
  return (
    <Popover width={200} trigger={compact
      ? <button aria-label={t('Language')} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold hover:bg-surface2"><Globe className="h-[18px] w-[18px]" strokeWidth={1.75} />{cur.native}</button>
      : <IconButton label={t('Language')}><Globe className="h-[18px] w-[18px]" strokeWidth={1.75} /></IconButton>}>
      {(close) => LANGS.map((l) => (
        <MenuItem key={l.code} active={l.code === lang} onClick={() => { setLang(l.code as Lang); close(); toast.info(`${l.native}`); }}>
          <span className="font-medium">{l.native}</span> <span className="text-xs text-ink/50">{l.label}</span>
        </MenuItem>
      ))}
    </Popover>
  );
}

export function WeekPicker() {
  const { week, setWeek } = useUI();
  const { t } = useTranslation();
  return (
    <label className="relative inline-flex items-center" data-tour="week-picker">
      <span className="sr-only">{t('Week')}</span>
      <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-b500" aria-hidden />
      <select value={week} onChange={(e) => setWeek(Number(e.target.value))} className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-surface py-0 pl-9 pr-8 text-[13px] font-semibold outline-none transition hover:border-b500 focus:border-caramel focus:shadow-glow">
        {[...WEEKS].reverse().map((w) => <option key={w} value={w}>{weekLabel(w)}</option>)}
      </select>
    </label>
  );
}

export function RegionFilter() {
  const { region, setRegion } = useUI();
  const { t } = useTranslation();
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{t('Region')}</span>
      <select value={region} onChange={(e) => setRegion(e.target.value)} className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-surface px-4 text-[13px] font-semibold outline-none hover:border-b500 focus:border-caramel">
        <option value="all">{t('All regions')}</option>
        <option value="uttarandhra">Uttarandhra</option>
        <option value="coastal">Coastal Andhra</option>
        <option value="rayalaseema">Rayalaseema</option>
      </select>
    </label>
  );
}

export function NotificationBell() {
  const { data } = useNotifications();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const read = useMutation({ mutationFn: (b: { ids?: string[]; all?: boolean }) => api.post('/api/notifications/read', b), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifs'] }) });
  const unread = data?.unread ?? 0;
  return (
    <Popover width={360} trigger={
      <IconButton label={t('Notifications')} className="relative">
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-b900 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </IconButton>}>
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold">{t('Notifications')}</span>
            {unread > 0 && <button className="text-xs font-semibold text-caramel hover:underline" onClick={() => read.mutate({ all: true })}>{t('Mark all read')}</button>}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {(data?.items ?? []).slice(0, 6).map((n) => (
              <button key={n.id} onClick={() => { read.mutate({ ids: [n.id] }); close(); if (n.link) nav(n.link); }} className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-caramel'}`} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-snug">{n.title}</span>
                  <span className="mt-0.5 block text-xs text-ink/60 line-clamp-2">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-ink/45">{timeAgo(n.ts, MOCK_NOW)}</span>
                </span>
              </button>
            ))}
            {!data?.items.length && <p className="px-3 py-6 text-center text-sm text-ink/55">{t("You're all caught up.")}</p>}
          </div>
          <button onClick={() => { close(); nav('/app/notifications'); }} className="mt-1 w-full rounded-xl py-2.5 text-center text-[13px] font-semibold text-caramel hover:bg-surface2">{t('View all notifications')}</button>
        </div>
      )}
    </Popover>
  );
}

export function ProfileMenu() {
  const { user, setSession, logout } = useAuth();
  const nav = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const startTour = useTour((s) => s.start);
  const sw = useMutation({
    mutationFn: (role: Role) => api.post<{ token: string; user: NonNullable<typeof user> }>('/api/auth/login', { identifier: DEMO_ACCOUNTS[role].email, password: DEMO_ACCOUNTS[role].password }),
    onSuccess: (r) => { setSession(r.token, r.user); qc.clear(); toast.success(t('Switched to {{role}}', { role: ROLE_LABEL[r.user.role] })); nav('/app'); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!user) return null;
  return (
    <Popover width={290} trigger={<button aria-label={t('Profile menu')} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 transition hover:border-b500"><Avatar name={user.name} size={32} /><span className="hidden text-[13px] font-semibold lg:block">{user.name.split(' ')[0]}</span></button>}>
      {(close) => (
        <div>
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar name={user.name} size={40} />
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{user.name}</div><div className="truncate text-xs text-ink/60">{user.email}</div><Pill tone="dark" className="mt-1">{ROLE_LABEL[user.role]}</Pill></div>
          </div>
          <div className="my-1 border-t border-line" />
          <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink/50"><Repeat className="mr-1 inline h-3 w-3" />{t('Switch role (demo)')}</div>
          {ROLES.map((r) => <MenuItem key={r} active={r === user.role} onClick={() => { close(); if (r !== user.role) sw.mutate(r); }}>{ROLE_LABEL[r]}</MenuItem>)}
          <div className="my-1 border-t border-line" />
          <MenuItem icon={<UserCircle2 className="h-4 w-4" />} onClick={() => { close(); nav('/app/settings'); }}>{t('Profile & settings')}</MenuItem>
          <MenuItem icon={<PlayCircle className="h-4 w-4" />} onClick={() => { close(); nav('/app'); setTimeout(startTour, 300); }}>{t('Replay product tour')}</MenuItem>
          <MenuItem icon={<LogOut className="h-4 w-4" />} onClick={async () => { close(); try { await api.post('/api/auth/logout'); } catch { /* ignore */ } logout(); qc.clear(); nav('/login'); }}>{t('Log out')}</MenuItem>
        </div>
      )}
    </Popover>
  );
}
export const _icons = { Settings, Check };
