import { useAuth } from '@/store';

/** Pluggable chat provider: swap the mock brain for a real LLM without touching UI. */
export interface TaraProvider {
  name: string;
  chat(message: string, ctx: { lang: string; route: string; role?: string; storeId?: string; region?: string }, onToken: (t: string) => void): Promise<{ intent: string; mood: 'happy' | 'concerned' | 'neutral' }>;
}

export const MockApiProvider: TaraProvider = {
  name: 'Mock brain (MSW)',
  async chat(message, ctx, onToken) {
    const token = useAuth.getState().token;
    const r = await fetch('/api/tara/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ message, context: ctx }) });
    if (!r.ok || !r.body) throw new Error('Tara could not answer right now.');
    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ''; let meta = { intent: 'fallback', mood: 'neutral' as 'happy' | 'concerned' | 'neutral' };
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop() ?? '';
      for (const l of lines) { if (!l) continue; const j = JSON.parse(l); if (j.t === 'token') onToken(j.v); else if (j.t === 'done') meta = { intent: j.intent, mood: j.mood }; }
    }
    return meta;
  },
};

/** Optional Sarvam chat adapter (OpenAI-compatible). Disabled by default; set VITE_SARVAM_CHAT=1 and VITE_SARVAM_API_KEY. */
export const SarvamChatProvider: TaraProvider = {
  name: 'Sarvam chat',
  async chat(message, ctx, onToken) {
    const key = import.meta.env.VITE_SARVAM_API_KEY as string;
    const r = await fetch('https://api.sarvam.ai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: 'sarvam-m', messages: [{ role: 'system', content: `You are Tara, FYRO's retail insights assistant. Answer briefly in language ${ctx.lang}.` }, { role: 'user', content: message }] }) });
    if (!r.ok) throw new Error('Sarvam chat failed');
    const j = await r.json(); const text: string = j.choices?.[0]?.message?.content ?? '';
    for (const w of text.split(/(\s+)/)) { onToken(w); await new Promise((x) => setTimeout(x, 14)); }
    return { intent: 'llm', mood: 'neutral' };
  },
};

export const activeProvider: TaraProvider = import.meta.env.VITE_SARVAM_CHAT === '1' && import.meta.env.VITE_SARVAM_API_KEY ? SarvamChatProvider : MockApiProvider;

export const SUGGESTIONS: Record<string, string[]> = {
  HEAD_OFFICE: ['Which incidents are S1?', 'Why is ATP-07 flagged?', 'Summarise Rayalaseema this week', 'What is emerging?', 'Explain layer 7'],
  REGIONAL_MANAGER: ['Summarise my region this week', 'Which incidents are S1?', 'Why is ATP-07 flagged?', 'What is emerging?'],
  FUNCTION_OWNER: ['Which incidents are S1?', 'What is the escalation rule?', 'Who owns allergen issues?', 'What is emerging?'],
  STORE_MANAGER: ['Why is ATP-07 flagged?', 'Tell me about this store', 'What is the escalation rule?', 'Explain layer 4'],
  ANALYST: ['Explain layer 3', 'What is the alert precision?', 'How many records this week?', 'Explain layer 7'],
  PUBLIC: ['Explain layer 7', 'What is the escalation rule?', 'Explain layer 5', 'Explain layer 1'],
};
