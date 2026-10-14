import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';
import { Pill, SeverityBadge, TrendArrow, StepBadge, Sprite } from '@/components/ui';
import { CHANNEL_ICON, REGION_SCENE } from '@/assets';
import { CHANNEL_LABEL } from '@/mocks/recordsGen';
import { fmtDate, cn } from '@/lib';
import type { Brief } from '@/hooks/queries';
import { FN_BY_ID } from '@/mocks/taxonomy';
import { STORE_BY_ID } from '@/mocks/geo';

/** One-page weekly brief. Print-friendly (see @media print in styles). */
export function BriefSheet({ b, compact }: { b: Brief; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <article className={cn('print-page card overflow-hidden', compact ? '' : 'mx-auto max-w-[900px]')} aria-label={`Weekly brief ${b.regionName} week ${b.week}`}>
      <header className="relative overflow-hidden bg-gradient-to-br from-b900 via-b700 to-caramel p-6 text-white sm:p-8">
        <img src={REGION_SCENE[b.region]} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-35 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <Logo light size={26} to="/app" />
            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{t('Weekly Regional Brief')}</div>
            <h1 className="mt-1 font-display text-5xl leading-none sm:text-6xl">{b.regionName}</h1>
            <p className="mt-2 text-sm text-white/85">{t('Week')} {b.week} · {b.range}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[[b.totals.records, t('records')], [b.totals.actionable, t('actionable')], [b.totals.s1, 'S1']].map(([v, l]) => (
              <div key={l as string} className="rounded-2xl bg-white/15 px-3.5 py-2.5 backdrop-blur"><div className="text-xl font-bold tabular-nums">{(v as number).toLocaleString('en-IN')}</div><div className="text-[11px] text-white/75">{l}</div></div>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-7 p-6 sm:p-8">
        <section>
          <h2 className="mb-4 text-lg font-bold">{t('Top 5 issues')}</h2>
          <ol className="space-y-4">
            {b.topIssues.map((i) => (
              <li key={i.issue} className="break-inside-avoid rounded-3xl border border-line bg-surface2/40 p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  <StepBadge n={i.rank} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[17px] font-semibold">{i.label}</h3><SeverityBadge s={i.severity} long />
                      <TrendArrow dir={i.trend} value={`${i.delta >= 0 ? '+' : ''}${i.delta} vs ${i.prev}`} significant={i.significant} />
                      <Pill>{i.count} {t('reports')}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-ink/60">{t('Owner')}: {FN_BY_ID.get(i.fn)?.name} · {i.significant ? t('change is statistically significant') : t('within normal variation')}</p>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {i.quotes.map((q) => (
                        <figure key={q.id} className="rounded-2xl bg-surface p-3.5">
                          <blockquote className="text-[13.5px] italic leading-snug">“{q.text}”</blockquote>
                          <figcaption className="mt-1.5 text-xs text-ink/65"><span className="font-semibold not-italic">{t('English')}:</span> {q.gloss}</figcaption>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-ink/55"><img src={CHANNEL_ICON[q.channel]} alt="" className="h-5 w-5 object-contain" />{CHANNEL_LABEL[q.channel]}<Link to={`/app/inbox?record=${q.id}`} className="no-print ml-auto font-mono hover:underline">{q.id}</Link><span className="hidden font-mono print:inline ml-auto">{q.id}</span></div>
                        </figure>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs"><span className="font-semibold text-ink/60">{t('Affected stores')}:</span>
                      {i.stores.map((s) => <Link key={s.id} to={`/app/stores/${s.id}`} className="rounded-full border border-line bg-surface px-2.5 py-1 font-medium hover:border-b500">{s.id} <span className="text-ink/50">· {s.count}</span></Link>)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {b.emerging.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className="mb-3 text-lg font-bold">{t('Emerging this week')}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {b.emerging.map((e) => (
                <Link key={e.id} to={`/app/emerging?focus=${e.id}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-b500">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-b900 text-sm font-bold text-white">{e.score}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{e.label}</span><span className="text-xs text-ink/60">{e.storeId} · {STORE_BY_ID.get(e.storeId)?.name}</span></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-bold">{t('Escalations')}</h2>
          {b.escalations.length === 0 ? <p className="text-sm text-ink/60">{t('No open incident met the escalation rule.')}</p> : (
            <ul className="space-y-2">{b.escalations.map((i) => (
              <li key={i.id}><Link to={`/app/incidents/${i.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3 hover:border-b500"><SeverityBadge s={i.severity} /><span className="font-semibold">{i.issueLabel}</span><span className="text-sm text-ink/65">{i.storeId} · {i.count} reports · {i.channels.length} channels</span><span className="ml-auto text-xs text-ink/55">{i.id} · {fmtDate(i.lastTs)}</span></Link></li>
            ))}</ul>
          )}
          <div className="mt-3 rounded-2xl bg-surface2/70 p-4 text-sm"><b>{t('Escalation rule')}.</b> {b.escalationRule}</div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink/60">
          <span>{b.precision.line}</span>
          <span className="flex items-center gap-2"><Sprite src={CHANNEL_ICON.review} size={0} className="hidden" />{t('Generated by FYRO')} · {fmtDate(b.generatedAt)}</span>
        </footer>
      </div>
    </article>
  );
}
