import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Send, Mic, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { useAuth, useTara, useUI, TaraMood } from '@/store';
import { Orb } from '@/components/Orb';
import { Switch, toast } from '@/components/ui';
import { activeProvider, SUGGESTIONS } from '@/services/tara';
import { voice } from '@/services/voice';
import { cn } from '@/lib';

const PAT = /\{\{(store|inc|rec|layer|brief):([^}]+)\}\}/g;
function Rich({ text }: { text: string }) {
  const out: React.ReactNode[] = []; let last = 0; let m: RegExpExecArray | null; PAT.lastIndex = 0; let k = 0;
  while ((m = PAT.exec(text))) {
    out.push(text.slice(last, m.index));
    const [, type, id] = m;
    const to = type === 'store' ? `/app/stores/${id}` : type === 'inc' ? `/app/incidents/${id}` : type === 'rec' ? `/app/inbox?record=${id}` : type === 'layer' ? `/app/layers/${id}` : `/app/briefs?region=${id}`;
    out.push(<Link key={k++} to={to} className="mx-0.5 inline-flex items-center rounded-full bg-b900 px-2 py-0.5 text-[12px] font-semibold text-inverse no-underline hover:bg-b700">{type === 'layer' ? `Layer ${id}` : type === 'brief' ? 'regional briefs' : id}</Link>);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return <span className="whitespace-pre-line">{out}</span>;
}

export function useTaraChat() {
  const { t } = useTranslation();
  const lang = useUI((s) => s.lang);
  const user = useAuth((s) => s.user);
  const loc = useLocation();
  const T = useTara();
  const [busy, setBusy] = useState(false);

  const speak = useCallback(async (id: string, text: string) => {
    T.setMood('speaking');
    try {
      const r = await voice.speak(text, { lang, speaker: useTara.getState().speaker, pace: useTara.getState().pace, onStart: () => T.setMood('speaking') });
      T.setDeviceVoice(r.deviceVoice); T.patch(id, { usedDeviceVoice: r.deviceVoice });
    } catch { toast.error(t('Voice playback failed.')); }
    T.setMood('idle');
  }, [lang, T, t]);

  const send = useCallback(async (text: string, doSpeak?: boolean) => {
    const msg = text.trim(); if (!msg || busy) return;
    T.push({ id: `u${Date.now()}`, from: 'user', text: msg, ts: Date.now() });
    const id = `t${Date.now()}`;
    T.push({ id, from: 'tara', text: '', ts: Date.now(), streaming: true });
    setBusy(true); T.setMood('thinking');
    let acc = '';
    try {
      const r = await activeProvider.chat(msg, { lang, route: loc.pathname, role: user?.role, storeId: user?.storeId, region: user?.region }, (tok) => { acc += tok; useTara.getState().patch(id, { text: acc }); });
      T.patch(id, { streaming: false, mood: r.mood === 'concerned' ? 'concerned' : 'happy' });
      T.setMood(r.mood === 'concerned' ? 'concerned' : 'happy');
      if (doSpeak ?? useTara.getState().autoSpeak) await speak(id, acc);
      else setTimeout(() => useTara.getState().setMood('idle'), 1800);
    } catch (e) {
      T.patch(id, { text: (e as Error).message, streaming: false }); T.setMood('idle');
    } finally { setBusy(false); }
  }, [busy, lang, loc.pathname, user, T, speak]);

  // external prompts (e.g. "Ask Tara about this layer")
  useEffect(() => { if (T.pending && !busy) { const p = T.pending; T.clearPending(); void send(p.text, p.speak); } }, [T.pending, busy]); // eslint-disable-line react-hooks/exhaustive-deps
  return { send, speak, busy };
}

export function TaraChat({ big }: { big?: boolean }) {
  const { t } = useTranslation();
  const T = useTara();
  const user = useAuth((s) => s.user);
  const { send, speak, busy } = useTaraChat();
  const lang = useUI((s) => s.lang);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [T.messages]);

  const mic = async () => {
    if (listening) return;
    setListening(true); T.setMood('listening');
    try { const tr = await voice.listen(lang); setText(tr); } catch (e) { toast.error((e as Error).message); }
    setListening(false); T.setMood('idle');
  };
  const chips = SUGGESTIONS[user?.role ?? 'PUBLIC'];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn('flex flex-col items-center border-b border-line bg-gradient-to-b from-surface2/70 to-transparent px-4 pb-3', big ? 'pt-6' : 'pt-4')}>
        <Orb size={big ? 150 : 110} mood={T.mood} webgl live />
        <div className="mt-3 text-sm font-semibold">Tara</div>
        <div className="text-xs text-ink/55">{T.mood === 'thinking' ? t('Thinking…') : T.mood === 'speaking' ? t('Speaking…') : T.mood === 'listening' ? t('Listening…') : t('Ask me about your stores')}</div>
        <div className="mt-2 flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2"><Switch label={t('Auto-speak')} checked={T.autoSpeak} onChange={T.setAutoSpeak} className="!h-5 !w-9 [&>span]:!h-4 [&>span]:!w-4" />{t('Auto-speak')}</label>
          {T.deviceVoice && <span className="rounded-full bg-surface2 px-2 py-0.5 font-medium">{t('Using device voice')}</span>}
          <button onClick={() => { voice.stop(); T.clear(); }} className="flex items-center gap-1 text-ink/55 hover:text-ink" aria-label={t('Clear chat')}><Trash2 className="h-3.5 w-3.5" />{t('Clear')}</button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {T.messages.length === 0 && <p className="rounded-2xl bg-surface2/60 p-4 text-sm text-ink/70">{t('Hi, I am Tara. Ask about stores, incidents, regions or any of the 10 pipeline layers, in any of the five languages.')}</p>}
        {T.messages.map((m) => (
          <div key={m.id} className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[88%] rounded-3xl px-4 py-2.5 text-[14px] leading-relaxed', m.from === 'user' ? 'rounded-br-lg bg-b900 text-inverse' : 'rounded-bl-lg bg-surface2 text-ink')}>
              {m.from === 'tara' ? <><Rich text={m.text || '…'} />{m.streaming && <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-b700 align-middle" />}</> : m.text}
              {m.from === 'tara' && !m.streaming && m.text && <button onClick={() => (T.mood === 'speaking' ? (voice.stop(), T.setMood('idle')) : void speak(m.id, m.text))} aria-label={t('Read aloud')} className="ml-2 inline-flex translate-y-0.5 items-center text-b500 hover:text-ink">{T.mood === 'speaking' ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="border-t border-line p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{chips.map((c) => <button key={c} onClick={() => void send(c)} disabled={busy} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium transition hover:border-b500 disabled:opacity-50">{c}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); const v = text; setText(''); void send(v); }} className="flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Ask Tara…')} aria-label={t('Message Tara')} className="field !py-2.5" />
          <button type="button" onClick={() => void mic()} aria-label={t('Voice input')} className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line transition', listening ? 'bg-b900 text-inverse' : 'bg-surface2 hover:border-b500')}><Mic className="h-[18px] w-[18px]" /></button>
          <button type="submit" disabled={busy || !text.trim()} aria-label={t('Send')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-b900 text-inverse transition hover:bg-b700 disabled:opacity-50"><Send className="h-[18px] w-[18px]" /></button>
        </form>
      </div>
    </div>
  );
}
