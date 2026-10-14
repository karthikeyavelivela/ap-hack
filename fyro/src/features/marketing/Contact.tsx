import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { Section } from './bits';
import { Input, Textarea, Select, Button, toast, Sprite } from '@/components/ui';
import { api } from '@/services/api';
import { A } from '@/assets';

export default function Contact() {
  const { t } = useTranslation();
  const [f, setF] = useState({ name: '', email: '', topic: 'demo', message: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const m = useMutation({ mutationFn: () => api.post<{ ticket: string }>('/api/contact', f), onSuccess: (r) => { setDone(r.ticket); toast.success(t('Message sent')); }, onError: (e: Error) => toast.error(e.message) });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n: Record<string, string> = {};
    if (f.name.trim().length < 2) n.name = t('Enter your name');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) n.email = t('Enter a valid email address');
    if (f.message.trim().length < 10) n.message = t('Tell us a little more (10+ characters)');
    setErrs(n); if (!Object.keys(n).length) m.mutate();
  };
  return (
    <div>
      <header className="bg-b900 pb-16 pt-36 text-center text-white"><div className="container-x"><div className="eyebrow !text-sand">{t('Contact')}</div><h1 className="mx-auto mt-3 max-w-3xl font-display text-6xl leading-[0.95] sm:text-8xl">{t('Let us hear from you')}</h1></div></header>
      <Section>
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="card p-6 sm:p-8">
            {done ? (
              <div className="flex flex-col items-center py-8 text-center"><Sprite src={A.success} size={200} /><h2 className="mt-2 flex items-center gap-2 text-2xl font-bold"><CheckCircle2 className="h-6 w-6 text-caramel" />{t('Thanks, we got it')}</h2><p className="mt-2 text-ink/65">{t('Your reference is {{id}}. We reply within one working day.', { id: done })}</p><Button className="mt-6" variant="secondary" onClick={() => { setDone(null); setF({ ...f, message: '' }); }}>{t('Send another')}</Button></div>
            ) : (
              <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
                <Input label={t('Name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errs.name} pill={false} />
                <Input label={t('Work email')} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errs.email} pill={false} />
                <Select label={t('Topic')} className="sm:col-span-2" value={f.topic} onChange={(v) => setF({ ...f, topic: v })} options={[{ value: 'demo', label: t('Book a demo') }, { value: 'pricing', label: t('Pricing') }, { value: 'partner', label: t('Partnership') }, { value: 'support', label: t('Support') }]} />
                <Textarea label={t('Message')} className="sm:col-span-2" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} error={errs.message} />
                <div className="sm:col-span-2"><Button type="submit" size="lg" loading={m.isPending}>{t('Send message')}</Button></div>
              </form>
            )}
          </div>
          <div className="space-y-4">{[[Mail, 'hello@fyro.in', t('General')], [Phone, '+91 863 000 0000', t('Mon–Sat, 9am–7pm IST')], [MapPin, 'Vijayawada, Andhra Pradesh', t('Head office')]].map(([I, a, b]) => { const Ic = I as typeof Mail; return <div key={a as string} className="card flex items-center gap-4 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-b900 text-white"><Ic className="h-5 w-5" /></span><div><div className="font-semibold">{a as string}</div><div className="text-xs text-ink/55">{b as string}</div></div></div>; })}</div>
        </div>
      </Section>
    </div>
  );
}
