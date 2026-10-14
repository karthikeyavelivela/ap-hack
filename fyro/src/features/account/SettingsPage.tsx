import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, KeyRound, Eye, EyeOff, Copy, RotateCcw } from 'lucide-react';
import { PageHeader, Card, SectionTitle, Select, Switch, Slider, Segmented, Button, Avatar, Pill, toast } from '@/components/ui';
import { useAuth, useUI, useTara, useTour } from '@/store';
import { LANGS } from '@/i18n';
import { voice, SPEAKERS, hasSarvam } from '@/services/voice';
import { ROLE_LABEL } from '@/app/nav';
import { resetDb } from '@/mocks/db';

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 py-3.5 last:border-0"><div className="min-w-0"><div className="text-sm font-semibold">{title}</div>{hint && <div className="text-xs text-ink/55">{hint}</div>}</div>{children}</div>;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useAuth((s) => s.user)!;
  const ui = useUI(); const tara = useTara(); const startTour = useTour((s) => s.start);
  const [show, setShow] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('fyro.notifprefs') ?? '{"alerts":true,"escalations":true,"sla":true,"digest":false}'); } catch { return { alerts: true, escalations: true, sla: true, digest: false }; } });
  const setPref = (k: string, v: boolean) => setPrefs((p) => { const n = { ...p, [k]: v }; try { localStorage.setItem('fyro.notifprefs', JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const key = 'fy_live_••••••••••••7c2f';
  return (
    <div className="max-w-3xl">
      <PageHeader title={t('Settings')} />
      <div className="space-y-6">
        <Card><SectionTitle title={t('Profile')} />
          <div className="mt-4 flex items-center gap-4"><Avatar name={user.name} size={60} /><div><div className="text-lg font-semibold">{user.name}</div><div className="text-sm text-ink/65">{user.email} · +91 {user.phone}</div><Pill tone="dark" className="mt-1.5">{t(ROLE_LABEL[user.role])}</Pill></div></div></Card>
        <Card><SectionTitle title={t('Appearance & language')} />
          <Row title={t('Language')} hint={t('Applies to the whole app and to Tara')}><Select size="sm" aria-label={t('Language')} className="w-44" value={ui.lang} onChange={(v) => ui.setLang(v as never)} options={LANGS.map((l) => ({ value: l.code, label: `${l.native} · ${l.label}` }))} /></Row>
          <Row title={t('Theme')}><Segmented size="sm" label="Theme" value={ui.theme} onChange={ui.setTheme} options={[{ value: 'light', label: t('Light') }, { value: 'dark', label: t('Dark') }]} /></Row></Card>
        <Card><SectionTitle title={t('Tara voice')} eyebrow={hasSarvam ? 'Sarvam AI · bulbul:v3' : t('Device voice (no Sarvam key set)')} />
          <Row title={t('Auto-speak replies')}><Switch label={t('Auto-speak replies')} checked={tara.autoSpeak} onChange={tara.setAutoSpeak} /></Row>
          <Row title={t('Voice')} hint={t('Sarvam speaker name')}><Select size="sm" aria-label={t('Voice')} className="w-44" value={tara.speaker} onChange={tara.setSpeaker} options={SPEAKERS.map((s) => ({ value: s, label: s }))} /></Row>
          <div className="py-3.5"><Slider label={t('Speed')} value={tara.pace} min={0.6} max={1.6} step={0.1} onChange={tara.setPace} format={(n) => `${n.toFixed(1)}×`} /></div>
          <Button size="sm" variant="secondary" icon={<Play className="h-4 w-4" />} onClick={() => void voice.speak(t('Hello, I am Tara. This is how I sound.'), { lang: ui.lang, speaker: tara.speaker, pace: tara.pace })}>{t('Play a sample')}</Button></Card>
        <Card><SectionTitle title={t('Notifications')} />
          {[['alerts', t('Emerging alerts')], ['escalations', t('Escalations')], ['sla', t('SLA reminders')], ['digest', t('Weekly email digest')]].map(([k, l]) => <Row key={k} title={l}><Switch label={l} checked={!!prefs[k]} onChange={(b) => { setPref(k, b); toast.success(t('Preference saved')); }} /></Row>)}</Card>
        <Card><SectionTitle title={t('Product tour')} />
          <Row title={t('Replay the guided tour')} hint={t('Tailored to your role')}><Button size="sm" variant="secondary" icon={<Play className="h-4 w-4" />} onClick={() => { nav('/app'); setTimeout(startTour, 350); }}>{t('Replay tour')}</Button></Row></Card>
        <Card><SectionTitle title={t('API keys')} eyebrow={t('Masked')} />
          <Row title="FYRO API key" hint={t('Mock key. Real keys are issued by your backend.')}><div className="flex items-center gap-2"><code className="rounded-full bg-surface2 px-3 py-1.5 text-xs">{show ? 'fy_live_5b1d0c92e47a7c2f' : key}</code><button aria-label={show ? 'Hide key' : 'Show key'} onClick={() => setShow((s) => !s)} className="rounded-full p-2 hover:bg-surface2">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button><button aria-label="Copy key" onClick={() => { void navigator.clipboard?.writeText('fy_live_5b1d0c92e47a7c2f'); toast.success(t('Copied')); }} className="rounded-full p-2 hover:bg-surface2"><Copy className="h-4 w-4" /></button></div></Row>
          <p className="mt-2 flex items-start gap-2 text-xs text-ink/55"><KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('A Sarvam key set in VITE_SARVAM_API_KEY ships to the browser. Proxy it through a backend in production.')}</p></Card>
        <Card><SectionTitle title={t('Developer')} />
          <Row title={t('Simulate API errors')} hint={t('Every request fails so you can see error states and retry buttons')}><Switch label={t('Simulate API errors')} checked={ui.simulateErrors} onChange={ui.setSimulateErrors} /></Row>
          <Row title={t('Reset demo data')} hint={t('Clears edits to incidents, users, policy and routing')}><Button size="sm" variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => { resetDb(); toast.success(t('Demo data reset. Reloading…')); setTimeout(() => location.reload(), 600); }}>{t('Reset')}</Button></Row></Card>
      </div>
    </div>
  );
}
