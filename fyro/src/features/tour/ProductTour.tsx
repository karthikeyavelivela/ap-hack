import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { Orb } from '@/components/Orb';
import { Button } from '@/components/ui';
import { useAuth, useTour, useUI, useTara } from '@/store';
import { voice } from '@/services/voice';
import { ROLE_LABEL } from '@/app/nav';
import { cn } from '@/lib';

interface Step { sel: string; title: string; body: string }
const S: Record<string, Step> = {
  sidebar: { sel: 'nav[aria-label="Primary"]', title: 'Your navigation', body: 'Everything you can open lives here. It adapts to your role, so you only see what you can act on.' },
  search: { sel: '[data-tour="global-search"]', title: 'Search everything', body: 'Press Cmd or Ctrl K to jump to a store, incident, record or page in a keystroke.' },
  week: { sel: '[data-tour="week-picker"]', title: 'Pick the week', body: 'Every number, brief and radar result follows this week selector. The current week is 41, 6 to 12 October.' },
  kpis: { sel: '[data-tour="kpis"]', title: 'Your numbers at a glance', body: 'Records processed, deduped incidents, escalations, alert precision and lead time, each compared with last week.' },
  emerging: { sel: '[data-tour="emerging-widget"]', title: 'Emerging-Issue Radar', body: 'Store and issue pairs rising faster than chance explains. This is where a failing freezer shows up days early.' },
  incidents: { sel: '[data-tour="nav-incidents"]', title: 'Incidents', body: 'Records from four channels merged into one incident, with owner, severity and an SLA clock.' },
  briefs: { sel: '[data-tour="nav-briefs"]', title: 'Weekly regional briefs', body: 'One page per region: the five issues that matter, with verbatim quotes and record IDs. Export as PDF.' },
  routing: { sel: '[data-tour="nav-routing"]', title: 'Routing', body: 'Every issue type has an owning function and a deadline. Head Office can change owners and SLAs here.' },
  layers: { sel: '[data-tour="nav-layers"]', title: 'The 10 pipeline layers', body: 'See how raw Tenglish becomes an action list. Each layer has a live demo you can play with.' },
  queue: { sel: '[data-tour="queue"]', title: 'Your routed queue', body: 'Incidents waiting for your function, sorted by severity, each with a live SLA timer.' },
  tara: { sel: '[data-tour="tara-launcher"]', title: 'Ask Tara', body: 'Question about a store or a layer? Ask Tara by typing or speaking. She answers in your language and can read the answer aloud.' },
};
const ROLE_STEPS: Record<string, (keyof typeof S)[]> = {
  HEAD_OFFICE: ['sidebar', 'search', 'week', 'kpis', 'emerging', 'incidents', 'briefs', 'routing', 'layers', 'tara'],
  REGIONAL_MANAGER: ['sidebar', 'search', 'week', 'kpis', 'emerging', 'briefs', 'incidents', 'tara'],
  FUNCTION_OWNER: ['sidebar', 'search', 'week', 'kpis', 'queue', 'routing', 'tara'],
  STORE_MANAGER: ['sidebar', 'search', 'week', 'incidents', 'emerging', 'tara'],
  ANALYST: ['sidebar', 'search', 'week', 'kpis', 'layers', 'emerging', 'tara'],
};

function find(sel: string): HTMLElement | null {
  return [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0) ?? null;
}

export default function ProductTour() {
  const { t } = useTranslation();
  const { step, setStep, stop } = useTour();
  const user = useAuth((s) => s.user)!;
  const lang = useUI((s) => s.lang);
  const T = useTara();
  const steps = (ROLE_STEPS[user.role] ?? ROLE_STEPS.ANALYST).map((k) => S[k]).filter((s) => !!find(s.sel) || s.sel.includes('tara'));
  const cur = steps[Math.min(step, steps.length - 1)];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const last = step >= steps.length - 1;

  useLayoutEffect(() => {
    const upd = () => { const el = cur && find(cur.sel); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setRect(el.getBoundingClientRect()); } else setRect(null); };
    upd(); const h = setTimeout(upd, 350);
    window.addEventListener('resize', upd); window.addEventListener('scroll', upd, true);
    return () => { clearTimeout(h); window.removeEventListener('resize', upd); window.removeEventListener('scroll', upd, true); };
  }, [cur, step]);
  const end = (complete: boolean) => { voice.stop(); stop(true, user.role); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') end(false); else if (e.key === 'ArrowRight') last ? end(true) : setStep(step + 1); else if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cur) return null;
  const pad = 8;
  const bubbleStyle: React.CSSProperties = rect
    ? { top: Math.min(window.innerHeight - 280, Math.max(12, rect.bottom + 16)), left: Math.min(window.innerWidth - 392, Math.max(12, rect.left)) }
    : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  if (rect && rect.bottom + 280 > window.innerHeight) bubbleStyle.top = Math.max(12, rect.top - 270);
  if (rect && (rect.height > window.innerHeight * 0.5 || rect.bottom + 280 > window.innerHeight) && rect.right + 400 < window.innerWidth) { bubbleStyle.left = rect.right + 20; bubbleStyle.top = Math.max(12, Math.min(window.innerHeight - 290, rect.top + 40)); }

  return createPortal(
    <div data-tour-root className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="absolute inset-0" onClick={() => undefined} />
      {rect ? <motion.div layout initial={false} animate={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="pointer-events-none fixed rounded-2xl ring-2 ring-caramel" style={{ boxShadow: '0 0 0 9999px rgba(30,20,12,.62)' }} /> : <div className="fixed inset-0 bg-b900/60" />}
      <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="fixed w-[min(380px,calc(100vw-24px))] rounded-3xl border border-line bg-surface p-5 shadow-lift" style={bubbleStyle}>
        <div className="flex items-start gap-3"><Orb size={42} mood="happy" /><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold uppercase tracking-wider text-b500">{t('Tour for {{role}}', { role: t(ROLE_LABEL[user.role]) })}</div><h2 className="mt-0.5 text-base font-bold">{t(cur.title)}</h2></div></div>
        <p className="mt-2.5 text-sm leading-relaxed text-ink/80">{t(cur.body)}</p>
        <button onClick={() => void voice.speak(t(cur.body), { lang, speaker: T.speaker, pace: T.pace }).catch(() => undefined)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-caramel hover:underline"><Volume2 className="h-3.5 w-3.5" />{t('Read aloud')}</button>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, i) => <button key={i} aria-label={`Go to step ${i + 1}`} onClick={() => setStep(i)} className={cn('h-2 rounded-full transition-all', i === step ? 'w-5 bg-b900' : 'w-2 bg-line hover:bg-b500')} />)}</div>
          <div className="flex gap-1.5"><Button size="sm" variant="ghost" onClick={() => end(false)}>{t('Skip')}</Button>{step > 0 && <Button size="sm" variant="secondary" onClick={() => setStep(step - 1)}>{t('Back')}</Button>}<Button size="sm" onClick={() => (last ? end(true) : setStep(step + 1))} data-autofocus>{last ? t('Done') : t('Next')}</Button></div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
