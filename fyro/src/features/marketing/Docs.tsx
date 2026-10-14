import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Section } from './bits';
import { Pill, SeverityBadge, Tabs } from '@/components/ui';
import { ISSUES, FUNCTIONS } from '@/mocks/taxonomy';
import { cn } from '@/lib';

const API: [string, string, string, boolean][] = [
  ['POST', '/api/auth/login', 'Sign in with email or phone and password', false], ['POST', '/api/auth/signup', 'Create an account', false], ['POST', '/api/auth/logout', 'End the session', false], ['POST', '/api/auth/forgot', 'Request a reset code', false], ['POST', '/api/auth/reset', 'Reset a password with a code', false], ['POST', '/api/auth/verify-otp', 'Verify a one-time code', false], ['POST', '/api/auth/oauth/:provider', 'Mock Google / Apple sign-in', false], ['GET', '/api/auth/me', 'Current user', true], ['POST', '/api/auth/refresh', 'Refresh the token', true],
  ['GET', '/api/regions · /districts · /stores · /stores/:id', 'Geography and stores', false], ['GET', '/api/taxonomy · /functions', 'Issue types and owning functions', false],
  ['GET', '/api/feedback', 'Filterable, cursor-paginated record stream', true], ['GET', '/api/feedback/:id', 'One record with tokens, translation and labels', true], ['POST', '/api/feedback/staff-note', 'Submit a staff note', true],
  ['POST', '/api/pipeline/{clean,langid,transliterate,classify,severity,dedup,normalise}', 'Run a pipeline layer on your own text', false], ['GET', '/api/pipeline/status', 'Layer health', true],
  ['GET', '/api/incidents · /incidents/:id', 'List and detail', true], ['PATCH', '/api/incidents/:id', 'Change status, owner or severity', true], ['POST', '/api/incidents/:id/{comments,escalate,resolve}', 'Act on an incident', true],
  ['GET', '/api/emerging · /emerging/:id · /emerging/replay', 'Radar results and day-by-day replay', false], ['GET', '/api/briefs · /briefs/:region/:week', 'Weekly regional briefs', false],
  ['GET/PUT', '/api/routing/rules', 'Issue → owner map and SLAs', true], ['GET', '/api/routing/queue', 'A function queue', true], ['GET/PUT', '/api/policy', 'Severity floors and escalation rule', true], ['POST', '/api/policy/preview', 'Live preview of a rule change', true],
  ['GET', '/api/eval/{summary,lead-time,precision,confusion}', 'Evaluation results', false], ['GET', '/api/analytics/{kpis,trends,map,explorer}', 'Dashboards and explorer', true],
  ['GET/POST/PATCH/DELETE', '/api/users', 'User management (Head Office)', true], ['GET/POST', '/api/notifications · /notifications/read', 'Notification centre', true], ['POST', '/api/tara/chat', 'Streamed assistant reply (NDJSON)', false], ['POST', '/api/contact', 'Contact form', false],
];

export default function Docs() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'tax' | 'sev' | 'esc' | 'api'>('tax');
  return (
    <div>
      <header className="bg-b900 pb-14 pt-36 text-center text-white"><div className="container-x"><div className="eyebrow !text-sand">{t('Docs')}</div><h1 className="mx-auto mt-3 max-w-3xl font-display text-6xl leading-[0.95] sm:text-8xl">{t('How FYRO decides')}</h1></div></header>
      <Section className="!py-10">
        <div className="mx-auto max-w-5xl">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'tax', label: t('Taxonomy'), count: 30 }, { value: 'sev', label: t('Severity policy') }, { value: 'esc', label: t('Escalation rule') }, { value: 'api', label: t('API reference'), count: API.length }]} />
          <div className="mt-6">
            {tab === 'tax' && <div className="grid gap-3 md:grid-cols-2">{FUNCTIONS.map((f) => <div key={f.id} className="card p-5"><h3 className="font-bold">{f.name}</h3><ul className="mt-3 space-y-1.5">{ISSUES.filter((i) => i.fn === f.id).map((i) => <li key={i.id} className="flex items-center justify-between gap-2 text-sm"><span>{i.label}</span><SeverityBadge s={i.floor} /></li>)}</ul></div>)}</div>}
            {tab === 'sev' && <div className="card space-y-4 p-6 text-[15px] leading-relaxed"><p><b>severity = max(policy floor, model severity)</b>, where max means the more severe of the two.</p><div className="grid gap-3 sm:grid-cols-2">{[[1, 'Critical', 'Safety, allergen, hygiene or misconduct. SLA 2 hours.'], [2, 'High', 'Equipment, payments, overcharging. SLA 8–24 hours.'], [3, 'Medium', 'Stock, queues, pricing, app issues. SLA 2–3 days.'], [4, 'Low', 'Assortment, parking, clutter. SLA 5–7 days.']].map(([s, n, d]) => <div key={s as number} className="flex items-start gap-3 rounded-2xl bg-surface2/60 p-4"><SeverityBadge s={s as 1} /><div><div className="font-semibold">{n as string}</div><div className="text-sm text-ink/65">{d as string}</div></div></div>)}</div><p className="text-sm text-ink/65">Under FSSAI rules, a possible undeclared allergen is never treated as a medium issue. The floor holds even when the model is unsure.</p></div>}
            {tab === 'esc' && <div className="card space-y-3 p-6 text-[15px] leading-relaxed"><p>An incident escalates to Head Office when <b>any</b> of these is true:</p><ul className="list-disc space-y-1.5 pl-5"><li>It is severity S1.</li><li>It appears in 4 channels with 30 or more records inside 72 hours at severity S2 or worse.</li><li>Its emerging score reaches 80.</li></ul><p className="text-sm text-ink/65">Head Office can tune every threshold in Severity &amp; escalation, with a live preview of how many incidents would escalate.</p></div>}
            {tab === 'api' && <div className="card overflow-hidden"><div className="divide-y divide-line/60">{API.map(([m, p, d, auth]) => <div key={p} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm"><Pill tone={m === 'GET' ? 'soft' : 'dark'} className="w-28 justify-center font-mono">{m}</Pill><code className="min-w-0 flex-1 break-all font-mono text-[13px]">{p}</code><span className="text-ink/60">{d}</span><Pill className={cn(!auth && 'opacity-60')}>{auth ? 'Bearer token' : 'open'}</Pill></div>)}</div><p className="border-t border-line p-4 text-xs text-ink/55">Backend is mocked in the browser with MSW. Demo credentials are in the README.</p></div>}
          </div>
        </div>
      </Section>
    </div>
  );
}
