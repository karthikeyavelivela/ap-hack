import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { User as UserIcon, Mail, Phone, Lock, ShieldCheck, ArrowLeft, Building2, MapPin, Wrench, Store as StoreIcon, LineChart } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Button, Input, Select, StepBadge, toast, Sprite } from '@/components/ui';
import { api } from '@/services/api';
import { useAuth, SessionUser } from '@/store';
import { A } from '@/assets';
import { ROLES, Role } from '@/mocks/db';
import { ROLE_LABEL } from '@/app/nav';
import { useRegions, useFunctions } from '@/hooks/queries';
import type { Store, District } from '@/mocks/geo';
import { cn } from '@/lib';

const BackToLogin = () => {
  const { t } = useTranslation();
  return <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-caramel hover:underline"><ArrowLeft className="h-4 w-4" />{t('Back to log in')}</Link>;
};

export function OtpInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const refs = Array.from({ length: 6 }, () => ({ current: null as HTMLInputElement | null }));
  const set = (i: number, c: string) => {
    const arr = value.padEnd(6, ' ').split('');
    arr[i] = c || ' ';
    onChange(arr.join('').trimEnd().replace(/ /g, ''));
    if (c && i < 5) refs[i + 1].current?.focus();
  };
  return (
    <div>
      <div className="flex justify-between gap-2" role="group" aria-label="One-time code">
        {Array.from({ length: 6 }).map((_, i) => (
          <input key={i} ref={(el) => { refs[i].current = el; }} inputMode="numeric" maxLength={1} aria-label={`Digit ${i + 1}`} value={value[i] ?? ''}
            onChange={(e) => set(i, e.target.value.replace(/\D/g, '').slice(-1))}
            onKeyDown={(e) => { if (e.key === 'Backspace' && !value[i] && i > 0) refs[i - 1].current?.focus(); }}
            onPaste={(e) => { e.preventDefault(); const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); onChange(p); refs[Math.min(5, p.length)].current?.focus(); }}
            className={cn('h-14 w-full min-w-0 rounded-2xl border bg-surface2 text-center text-xl font-bold outline-none transition focus:border-caramel focus:shadow-glow', error ? 'border-b900' : 'border-transparent')} />
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium">⚠ {error}</p>}
    </div>
  );
}

/* ───────────── Forgot ───────────── */
export function Forgot() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const m = useMutation({ mutationFn: () => api.post<{ message: string }>('/api/auth/forgot', { email }), onSuccess: (r) => { toast.success(r.message); nav(`/reset-password?email=${encodeURIComponent(email)}`); }, onError: (e: Error) => toast.error(e.message) });
  const submit = (e: FormEvent) => { e.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(t('Enter a valid email address')); setErr(''); m.mutate(); };
  return (
    <AuthShell>
      <h1 className="text-[26px] font-bold">{t('Forgot password?')}</h1>
      <p className="mt-1 text-sm text-ink/60">{t('Enter your email and we will send a 6-digit reset code.')}</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <Input label={t('Email')} icon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.in" error={err} autoFocus />
        <Button type="submit" size="lg" full loading={m.isPending}>{t('Send reset code')}</Button>
      </form>
      <BackToLogin />
    </AuthShell>
  );
}

/* ───────────── Reset ───────────── */
export function Reset() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState(sp.get('email') ?? '');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const m = useMutation({ mutationFn: () => api.post('/api/auth/reset', { email, code, password: pw }), onSuccess: () => { toast.success(t('Password updated. Please log in.')); nav('/login'); }, onError: (e: Error) => setErrs({ code: e.message }) });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) n.email = t('Enter a valid email address');
    if (code.length < 6) n.code = t('Enter the 6-digit code');
    if (pw.length < 8) n.pw = t('Use at least 8 characters');
    setErrs(n); if (!Object.keys(n).length) m.mutate();
  };
  return (
    <AuthShell>
      <h1 className="text-[26px] font-bold">{t('Reset password')}</h1>
      <p className="mt-1 text-sm text-ink/60">{t('Demo code: 123456')}</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <Input label={t('Email')} icon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} error={errs.email} />
        <div><div className="mb-1.5 px-1 text-xs font-semibold text-ink/75">{t('6-digit code')}</div><OtpInput value={code} onChange={setCode} error={errs.code} /></div>
        <Input label={t('New password')} type="password" icon={<Lock className="h-4 w-4" />} value={pw} onChange={(e) => setPw(e.target.value)} error={errs.pw} autoComplete="new-password" />
        <Button type="submit" size="lg" full loading={m.isPending}>{t('Update password')}</Button>
      </form>
      <BackToLogin />
    </AuthShell>
  );
}

/* ───────────── Verify OTP (standalone) ───────────── */
export function VerifyOtp() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const m = useMutation({ mutationFn: () => api.post('/api/auth/verify-otp', { code }), onSuccess: () => { toast.success(t('Verified')); nav('/login'); }, onError: (e: Error) => setErr(e.message) });
  return (
    <AuthShell>
      <h1 className="text-[26px] font-bold">{t('Verify your code')}</h1>
      <p className="mt-1 text-sm text-ink/60">{t('We sent a 6-digit code. Demo code: 123456')}</p>
      <form onSubmit={(e) => { e.preventDefault(); if (code.length < 6) setErr(t('Enter the 6-digit code')); else { setErr(''); m.mutate(); } }} className="mt-6 space-y-5">
        <OtpInput value={code} onChange={setCode} error={err} />
        <Button type="submit" size="lg" full loading={m.isPending}>{t('Verify')}</Button>
      </form>
      <BackToLogin />
    </AuthShell>
  );
}

/* ───────────── Sign up (multi-step) ───────────── */
const ROLE_ICON: Record<Role, JSX.Element> = {
  HEAD_OFFICE: <Building2 className="h-5 w-5" />, REGIONAL_MANAGER: <MapPin className="h-5 w-5" />, FUNCTION_OWNER: <Wrench className="h-5 w-5" />, STORE_MANAGER: <StoreIcon className="h-5 w-5" />, ANALYST: <LineChart className="h-5 w-5" />,
};
const ROLE_DESC: Record<Role, string> = {
  HEAD_OFFICE: 'All regions, policy and users', REGIONAL_MANAGER: 'One region, its briefs and stores', FUNCTION_OWNER: 'One function and its routed queue', STORE_MANAGER: 'One store and its checklist', ANALYST: 'Pipeline, models and exports',
};

export function Signup() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { setSession } = useAuth();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [role, setRole] = useState<Role>('STORE_MANAGER');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [store, setStore] = useState('');
  const [fn, setFn] = useState('store_ops');
  const [otp, setOtp] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const regions = useRegions();
  const fns = useFunctions();
  const districts = useQuery({ queryKey: ['districts'], queryFn: () => api.get<(District & { regionName: string })[]>('/api/districts') });
  const stores = useQuery({ queryKey: ['stores-signup', district], enabled: !!district, queryFn: () => api.get<Store[]>('/api/stores', { district }) });
  const needsScope = role !== 'HEAD_OFFICE' && role !== 'ANALYST';
  const steps = [t('Details'), t('Role'), t('Scope'), t('Verify'), t('Done')];

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/verify-otp', { code: otp });
      await api.post('/api/auth/signup', { ...f, role, region: role === 'REGIONAL_MANAGER' ? region : undefined, fn: role === 'FUNCTION_OWNER' ? fn : undefined, storeId: role === 'STORE_MANAGER' ? store : undefined });
      return api.post<{ token: string; user: SessionUser }>('/api/auth/login', { identifier: f.email, password: f.password });
    },
    onSuccess: (r) => { setSession(r.token, r.user); setStep(4); },
    onError: (e: Error) => setErrs({ otp: e.message }),
  });

  const next = () => {
    const n: Record<string, string> = {};
    if (step === 0) {
      if (f.name.trim().length < 2) n.name = t('Enter your full name');
      if (!/^\S+@\S+\.\S+$/.test(f.email)) n.email = t('Enter a valid email address');
      if (!/^\d{10}$/.test(f.phone)) n.phone = t('Enter a 10-digit mobile number');
      if (f.password.length < 8) n.password = t('Use at least 8 characters');
    }
    if (step === 2 && needsScope) {
      if (role === 'REGIONAL_MANAGER' && !region) n.region = t('Choose a region');
      if (role === 'STORE_MANAGER' && !store) n.store = t('Choose your store');
    }
    if (step === 3) { if (otp.length < 6) { setErrs({ otp: t('Enter the 6-digit code') }); return; } create.mutate(); return; }
    setErrs(n);
    if (Object.keys(n).length) return;
    setStep(step === 1 && !needsScope ? 3 : step + 1);
  };
  const back = () => setStep(step === 3 && !needsScope ? 1 : step - 1);

  return (
    <AuthShell hero={false}>
      <div className="mb-5 flex items-center justify-between">
        <Link to="/login" className="text-sm font-semibold text-caramel hover:underline">{t('Log in')}</Link>
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of 5`}>
          {steps.map((s, i) => <span key={s} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-7 bg-b900' : i < step ? 'w-3 bg-caramel' : 'w-3 bg-line')} />)}
        </div>
      </div>
      <div className="mb-4 flex items-center gap-3"><StepBadge n={step + 1} /><h1 className="text-2xl font-bold">{t('Create your account')}</h1></div>
      <p className="mb-5 text-sm text-ink/60">{steps[step]} · {step + 1}/5</p>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }}>
          {step === 0 && (
            <div className="space-y-3.5">
              <Input label={t('Full name')} icon={<UserIcon className="h-4 w-4" />} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errs.name} autoFocus />
              <Input label={t('Work email')} icon={<Mail className="h-4 w-4" />} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errs.email} autoComplete="email" />
              <Input label={t('Mobile number')} icon={<Phone className="h-4 w-4" />} inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} error={errs.phone} />
              <Input label={t('Password')} type="password" icon={<Lock className="h-4 w-4" />} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errs.password} autoComplete="new-password" hint={t('At least 8 characters')} />
            </div>
          )}
          {step === 1 && (
            <div className="space-y-2.5" role="radiogroup" aria-label={t('Role')}>
              {ROLES.map((r) => (
                <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)} className={cn('flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition', role === r ? 'border-b900 bg-b900 text-inverse' : 'border-line bg-surface hover:border-b500')}>
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', role === r ? 'bg-white/15' : 'bg-surface2')}>{ROLE_ICON[r]}</span>
                  <span><span className="block text-sm font-semibold">{t(ROLE_LABEL[r])}</span><span className={cn('block text-xs', role === r ? 'text-white/75' : 'text-ink/60')}>{t(ROLE_DESC[r])}</span></span>
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              {role === 'REGIONAL_MANAGER' && <Select label={t('Region')} value={region} onChange={setRegion} placeholder={t('Choose a region')} options={(regions.data ?? []).map((r) => ({ value: r.id, label: r.name }))} />}
              {role === 'REGIONAL_MANAGER' && errs.region && <p role="alert" className="text-xs font-medium">⚠ {errs.region}</p>}
              {role === 'FUNCTION_OWNER' && <Select label={t('Function')} value={fn} onChange={setFn} options={(fns.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />}
              {role === 'STORE_MANAGER' && (
                <>
                  <Select label={t('Region')} value={region} onChange={(v) => { setRegion(v); setDistrict(''); setStore(''); }} placeholder={t('Choose a region')} options={(regions.data ?? []).map((r) => ({ value: r.id, label: r.name }))} />
                  <Select label={t('District')} value={district} onChange={(v) => { setDistrict(v); setStore(''); }} placeholder={t('Choose a district')} disabled={!region} options={(districts.data ?? []).filter((d) => d.region === region).map((d) => ({ value: d.id, label: d.name }))} />
                  <Select label={t('Store')} value={store} onChange={setStore} placeholder={t('Choose your store')} disabled={!district} options={(stores.data ?? []).map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} />
                  {errs.store && <p role="alert" className="text-xs font-medium">⚠ {errs.store}</p>}
                </>
              )}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-surface2 p-3.5 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-b700" /><span>{t('We sent a 6-digit code to {{phone}}. Demo code: 123456', { phone: `+91 ${f.phone}` })}</span></div>
              <OtpInput value={otp} onChange={setOtp} error={errs.otp} />
            </div>
          )}
          {step === 4 && (
            <div className="flex flex-col items-center py-4 text-center">
              <Sprite src={A.success} size={220} />
              <h2 className="mt-2 text-xl font-bold">{t('You are all set, {{name}}', { name: f.name.split(' ')[0] })}</h2>
              <p className="mt-1 text-sm text-ink/65">{t('Your account is ready. Tara will show you around.')}</p>
              <Button className="mt-6" size="lg" full onClick={() => nav('/app', { replace: true })}>{t('Enter FYRO')}</Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {step < 4 && (
        <div className="mt-6 flex gap-3">
          {step > 0 && <Button variant="secondary" size="lg" onClick={back} icon={<ArrowLeft className="h-4 w-4" />} aria-label={t('Back')} />}
          <Button size="lg" full onClick={next} loading={create.isPending}>{step === 3 ? t('Verify & create account') : t('Continue')}</Button>
        </div>
      )}
    </AuthShell>
  );
}
