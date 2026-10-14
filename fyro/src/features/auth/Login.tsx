import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, AlertTriangle, Clock, Apple } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Button, Input, Checkbox, toast } from '@/components/ui';
import { api, ApiError } from '@/services/api';
import { useAuth, SessionUser } from '@/store';
import { ROLES, Role } from '@/mocks/db';
import { ROLE_LABEL, DEMO_ACCOUNTS } from '@/app/nav';
import { cn } from '@/lib';

interface LoginRes { token: string; user: SessionUser }

export function OAuthButtons({ onDone }: { onDone: (r: LoginRes) => void }) {
  const { t } = useTranslation();
  const m = useMutation({ mutationFn: (p: string) => api.post<LoginRes>(`/api/auth/oauth/${p}`), onSuccess: onDone, onError: (e: Error) => toast.error(e.message) });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="secondary" loading={m.isPending && m.variables === 'google'} onClick={() => m.mutate('google')} icon={<svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden><path fill="#6B4226" d="M21.35 11.1H12v2.98h5.35c-.5 2.4-2.5 3.6-5.35 3.6a6 6 0 1 1 0-12c1.5 0 2.85.55 3.9 1.45l2.1-2.1A9 9 0 1 0 12 21c5.2 0 8.6-3.6 8.6-8.8 0-.4-.05-.75-.1-1.1z" /></svg>}>Google</Button>
      <Button variant="secondary" loading={m.isPending && m.variables === 'apple'} onClick={() => m.mutate('apple')} icon={<Apple className="h-[18px] w-[18px]" strokeWidth={1.75} />}>Apple</Button>
      <span className="sr-only">{t('Or continue with')}</span>
    </div>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const [sp] = useSearchParams();
  const { setSession, expired, clearExpired, token } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [errs, setErrs] = useState<{ id?: string; pw?: string; form?: string; limited?: boolean }>({});
  const [shake, setShake] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const showExpired = expired || sp.get('expired') === '1';
  const from = (loc.state as { from?: string } | null)?.from ?? '/app';

  useEffect(() => { if (token && !showExpired) nav(from, { replace: true }); }, [token, showExpired, from, nav]);
  useEffect(() => () => clearExpired(), [clearExpired]);

  const done = (r: LoginRes) => { setSession(r.token, r.user, keep); clearExpired(); toast.success(t('Welcome back, {{name}}', { name: r.user.name.split(' ')[0] })); nav(from, { replace: true }); };
  const login = useMutation({
    mutationFn: () => api.post<LoginRes>('/api/auth/login', { identifier, password }),
    onSuccess: done,
    onError: (e: Error) => { setErrs({ form: e.message, limited: (e as ApiError).code === 'RATE_LIMIT' }); setShake((s) => s + 1); },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errs = {};
    if (!identifier.trim()) next.id = t('Enter your email or phone');
    if (password.length < 6) next.pw = t('Password must be at least 6 characters');
    setErrs(next);
    if (next.id || next.pw) { setShake((s) => s + 1); return; }
    login.mutate();
  };
  const pick = (r: Role) => { setRole(r); setIdentifier(DEMO_ACCOUNTS[r].email); setPassword(DEMO_ACCOUNTS[r].password); setErrs({}); };

  return (
    <AuthShell>
      {showExpired && (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-2xl border border-line bg-surface2 px-4 py-3 text-sm"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{t('Your session expired. Please sign in again.')}</div>
      )}
      <h1 className="text-[28px] font-bold leading-tight">{t('Welcome Back')}</h1>
      <p className="mt-1 text-sm text-ink/60">{t('Sign in to see this weeks action list.')}</p>
      <form onSubmit={submit} noValidate className={cn('mt-5 space-y-3.5', shake > 0 && 'shake')} key={shake}>
        <Input label={t('Email or phone')} icon={<Mail className="h-4 w-4" />} value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="head@fyro.in" autoComplete="username" error={errs.id} />
        <Input label={t('Password')} type="password" icon={<Lock className="h-4 w-4" />} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" error={errs.pw} />
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <Checkbox checked={keep} onChange={setKeep} label={t('Keep me signed in')} />
          <Link to="/forgot-password" className="text-[13px] font-semibold text-caramel hover:underline">{t('Forgot Password?')}</Link>
        </div>
        {errs.form && (
          <div role="alert" className="flex items-start gap-2 rounded-2xl border border-b900/30 bg-surface2 px-4 py-3 text-sm font-medium"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{errs.form}</div>
        )}
        <Button type="submit" size="lg" full loading={login.isPending} disabled={errs.limited}>{t('Log In')}</Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink/50"><span className="h-px flex-1 bg-line" />{t('Or continue with')}<span className="h-px flex-1 bg-line" /></div>
      <OAuthButtons onDone={done} />

      <div className="mt-6" data-demo-roles>
        <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">{t('Try a demo role')}</div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {ROLES.map((r) => (
            <button key={r} type="button" onClick={() => pick(r)} aria-pressed={role === r}
              className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition', role === r ? 'border-b900 bg-b900 text-inverse' : 'border-line bg-surface2 hover:border-b500')}>
              {t(ROLE_LABEL[r])}
            </button>
          ))}
        </div>
        {role && <p className="mt-2 text-center text-xs text-ink/55">{t('Credentials filled. Press Log In.')}</p>}
      </div>

      <p className="mt-6 text-center text-sm text-ink/70">{t("Don't have an account?")} <Link to="/signup" className="font-semibold text-caramel hover:underline">{t('Sign Up')}</Link></p>
    </AuthShell>
  );
}
