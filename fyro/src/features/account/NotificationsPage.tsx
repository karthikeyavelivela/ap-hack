import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, ShieldAlert, Clock, Info, CheckCheck } from 'lucide-react';
import { PageHeader, Card, Button, Skeleton, EmptyState, QueryError } from '@/components/ui';
import { useNotifications } from '@/hooks/queries';
import { api } from '@/services/api';
import { TARA_STATE } from '@/assets';
import { fmtDate, cn } from '@/lib';

const ICON = { alert: Bell, escalation: ShieldAlert, sla: Clock, system: Info };
export default function NotificationsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useNotifications();
  const read = useMutation({ mutationFn: (b: { ids?: string[]; all?: boolean }) => api.post('/api/notifications/read', b), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifs'] }) });
  return (
    <div>
      <PageHeader title={t('Notifications')} subtitle={q.data ? `${q.data.unread} ${t('unread')}` : undefined} actions={<Button variant="secondary" size="sm" icon={<CheckCheck className="h-4 w-4" />} disabled={!q.data?.unread} onClick={() => read.mutate({ all: true })}>{t('Mark all read')}</Button>} />
      <Card pad={false}>
        {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div> : q.isError ? <QueryError error={q.error as Error} onRetry={() => void q.refetch()} /> : q.data!.items.length === 0 ? <EmptyState src={TARA_STATE.cozy} title={t('All quiet')} body={t('New alerts will show up here.')} /> : (
          <ul className="divide-y divide-line/60">{q.data!.items.map((n) => { const I = ICON[n.kind]; return (
            <li key={n.id}><button onClick={() => { read.mutate({ ids: [n.id] }); if (n.link) nav(n.link); }} className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-surface2/60">
              <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full', n.kind === 'escalation' || n.kind === 'alert' ? 'bg-b900 text-white' : 'bg-surface2')}><I className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 flex-1"><span className={cn('block text-sm', !n.read && 'font-bold')}>{n.title}</span><span className="mt-0.5 block text-sm text-ink/65">{n.body}</span><span className="mt-1 block text-xs text-ink/45">{fmtDate(n.ts)}</span></span>
              {!n.read && <span className="mt-2 h-2.5 w-2.5 rounded-full bg-caramel" aria-label="unread" />}
            </button></li>); })}</ul>
        )}
      </Card>
    </div>
  );
}
