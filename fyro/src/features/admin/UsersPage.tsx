import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserPlus, Trash2 } from 'lucide-react';
import { PageHeader, Card, DataTable, Button, Modal, Input, Select, Pill, Avatar, Switch, toast } from '@/components/ui';
import { useUsers, PublicUser } from '@/hooks/queries';
import { useAuth } from '@/store';
import { api } from '@/services/api';
import { ROLES, Role } from '@/mocks/db';
import { ROLE_LABEL } from '@/app/nav';
import { fmtDate } from '@/lib';

export default function UsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const me = useAuth((s) => s.user!);
  const q = useUsers();
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<PublicUser | null>(null);
  const [f, setF] = useState({ name: '', email: '', role: 'STORE_MANAGER' as Role });
  const [err, setErr] = useState<Record<string, string>>({});
  const inv = () => void qc.invalidateQueries({ queryKey: ['users'] });
  const invite = useMutation({ mutationFn: () => api.post('/api/users', f), onSuccess: () => { toast.success(t('Invitation sent to {{e}}', { e: f.email })); setOpen(false); setF({ name: '', email: '', role: 'STORE_MANAGER' }); inv(); }, onError: (e: Error) => setErr({ email: e.message }) });
  const patch = useMutation({ mutationFn: ({ id, ...b }: { id: string; role?: Role; active?: boolean }) => api.patch(`/api/users/${id}`, b), onSuccess: () => { toast.success(t('User updated')); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/api/users/${id}`), onSuccess: () => { toast.success(t('User removed')); setDel(null); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const submit = () => { const n: Record<string, string> = {}; if (f.name.trim().length < 2) n.name = t('Enter a name'); if (!/^\S+@\S+\.\S+$/.test(f.email)) n.email = t('Enter a valid email'); setErr(n); if (!Object.keys(n).length) invite.mutate(); };
  return (
    <div>
      <PageHeader title={t('Users')} subtitle={t('Invite colleagues, change roles and deactivate access.')} actions={<Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setOpen(true)}>{t('Invite user')}</Button>} />
      <Card pad={false}><DataTable rows={q.data} rowKey={(u) => u.id} loading={q.isLoading} error={q.error as Error | null} onRetry={() => void q.refetch()} columns={[
        { key: 'u', header: t('User'), cell: (u) => <div className="flex items-center gap-3"><Avatar name={u.name} size={34} /><div><div className="font-semibold">{u.name}{u.id === me.id && <span className="ml-2 text-xs text-ink/50">({t('you')})</span>}</div><div className="text-xs text-ink/60">{u.email}</div></div></div> },
        { key: 'r', header: t('Role'), cell: (u) => <Select size="sm" aria-label={`Role of ${u.name}`} className="min-w-[170px]" value={u.role} onChange={(v) => patch.mutate({ id: u.id, role: v as Role })} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} disabled={u.id === me.id} /> },
        { key: 's', header: t('Scope'), hideOnMobile: true, cell: (u) => <span className="text-sm text-ink/70">{u.storeId ?? u.region ?? u.fn ?? t('All')}</span> },
        { key: 'l', header: t('Last active'), hideOnMobile: true, cell: (u) => <span className="text-ink/60">{fmtDate(Date.parse(u.lastActive))}</span> },
        { key: 'a', header: t('Active'), cell: (u) => <div className="flex items-center gap-2"><Switch label={`Active ${u.name}`} checked={u.active} onChange={(b) => patch.mutate({ id: u.id, active: b })} className={u.id === me.id ? 'pointer-events-none opacity-50' : ''} />{u.invited && <Pill tone="sand">{t('invited')}</Pill>}</div> },
        { key: 'd', header: '', align: 'right', cell: (u) => <Button size="sm" variant="ghost" aria-label={`Remove ${u.name}`} disabled={u.id === me.id} icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(u)} /> },
      ]} /></Card>
      <Modal open={open} onClose={() => setOpen(false)} title={t('Invite user')} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('Cancel')}</Button><Button loading={invite.isPending} onClick={submit}>{t('Send invite')}</Button></>}>
        <div className="space-y-4"><Input label={t('Full name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} /><Input label={t('Work email')} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err.email} /><Select label={t('Role')} value={f.role} onChange={(v) => setF({ ...f, role: v as Role })} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} /></div>
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} title={t('Remove user?')} footer={<><Button variant="secondary" onClick={() => setDel(null)}>{t('Cancel')}</Button><Button variant="dark" loading={remove.isPending} onClick={() => del && remove.mutate(del.id)}>{t('Remove')}</Button></>}><p className="text-sm">{t('{{n}} will lose access immediately.', { n: del?.name })}</p></Modal>
    </div>
  );
}
