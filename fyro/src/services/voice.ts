import { taraAmp } from '@/store';

/**
 * Voice layer (Sarvam AI with browser fallback).
 * WARNING: VITE_SARVAM_API_KEY is bundled into the client and visible to users.
 * In production, proxy these calls through your backend.
 */
const KEY = import.meta.env.VITE_SARVAM_API_KEY as string | undefined;
export const hasSarvam = !!KEY;
const LANG_CODE: Record<string, string> = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN', ta: 'ta-IN', mr: 'mr-IN' };

export interface VoiceProvider {
  speak(text: string, o: { lang: string; speaker: string; pace: number; onStart?: () => void }): Promise<{ deviceVoice: boolean }>;
  stop(): void;
  listen(lang: string): Promise<string>;
}

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let src: AudioBufferSourceNode | null = null;
let raf = 0;

function startMeter() {
  if (!analyser) return;
  const buf = new Uint8Array(analyser.fftSize);
  const tick = () => {
    analyser!.getByteTimeDomainData(buf);
    let s = 0;
    for (const v of buf) s += ((v - 128) / 128) ** 2;
    taraAmp.value = Math.min(1, Math.sqrt(s / buf.length) * 3.2);
    raf = requestAnimationFrame(tick);
  };
  tick();
}
function stopMeter() { cancelAnimationFrame(raf); taraAmp.value = 0; }

export function chunkText(text: string, max = 480): string[] {
  const parts = text.replace(/\{\{[a-z]+:([^}]+)\}\}/g, '$1').replace(/[•*_`]/g, '').split(/(?<=[.!?\n])\s+/);
  const out: string[] = []; let cur = '';
  for (const p of parts) { if ((cur + ' ' + p).length > max) { if (cur) out.push(cur); cur = p; } else cur = cur ? `${cur} ${p}` : p; }
  if (cur) out.push(cur);
  return out;
}

async function sarvamTTS(text: string, lang: string, speaker: string, pace: number): Promise<AudioBuffer> {
  const r = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'api-subscription-key': KEY! },
    body: JSON.stringify({ text, model: 'bulbul:v3', target_language_code: LANG_CODE[lang] ?? 'en-IN', speaker, pace }),
  });
  if (!r.ok) throw new Error(`Sarvam TTS ${r.status}`);
  const j = (await r.json()) as { audios: string[] };
  const bin = atob(j.audios[0]);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  ctx ??= new AudioContext();
  return ctx.decodeAudioData(bytes.buffer);
}

function deviceSpeak(text: string, lang: string, pace: number): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_CODE[lang] ?? 'en-IN'; u.rate = pace;
    // no audio graph access for speechSynthesis: simulate amplitude so the orb still animates
    const sim = setInterval(() => { taraAmp.value = 0.25 + Math.random() * 0.5; }, 90);
    const done = () => { clearInterval(sim); taraAmp.value = 0; resolve(); };
    u.onend = done; u.onerror = done;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
}

export const voice: VoiceProvider = {
  async speak(text, { lang, speaker, pace, onStart }) {
    this.stop();
    const chunks = chunkText(text);
    let device = !hasSarvam;
    if (hasSarvam) {
      try {
        ctx ??= new AudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        analyser ??= ctx.createAnalyser(); analyser.fftSize = 512; analyser.connect(ctx.destination);
        let first = true;
        for (const c of chunks) {
          const buf = await sarvamTTS(c, lang, speaker, pace);
          await new Promise<void>((res) => {
            src = ctx!.createBufferSource(); src.buffer = buf; src.connect(analyser!); src.onended = () => res();
            if (first) { first = false; onStart?.(); startMeter(); }
            src.start();
          });
        }
        stopMeter();
        return { deviceVoice: false };
      } catch { stopMeter(); device = true; }
    }
    if (device) { onStart?.(); await deviceSpeak(chunks.join(' '), lang, pace); }
    return { deviceVoice: true };
  },
  stop() { try { src?.stop(); } catch { /* ignore */ } src = null; stopMeter(); if ('speechSynthesis' in window) speechSynthesis.cancel(); },
  async listen(lang) {
    // Prefer Sarvam STT (record → upload); fall back to the browser SpeechRecognition API.
    if (hasSarvam && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ac = new AudioContext(); const node = ac.createMediaStreamSource(stream); const an = ac.createAnalyser(); node.connect(an);
        const rec = new MediaRecorder(stream); const chunks: Blob[] = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        const buf = new Uint8Array(an.fftSize); let m = 0;
        const meter = () => { an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += ((v - 128) / 128) ** 2; taraAmp.value = Math.min(1, Math.sqrt(s / buf.length) * 4); m = requestAnimationFrame(meter); };
        meter(); rec.start();
        await new Promise((r) => setTimeout(r, 5000));
        await new Promise<void>((r) => { rec.onstop = () => r(); rec.stop(); });
        cancelAnimationFrame(m); taraAmp.value = 0; stream.getTracks().forEach((t) => t.stop()); void ac.close();
        const fd = new FormData(); fd.append('file', new Blob(chunks, { type: rec.mimeType }), 'speech.webm'); fd.append('language_code', LANG_CODE[lang] ?? 'en-IN'); fd.append('model', 'saarika:v2.5');
        const r = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': KEY! }, body: fd });
        if (!r.ok) throw new Error('STT failed');
        return ((await r.json()) as { transcript: string }).transcript;
      } catch { taraAmp.value = 0; /* fall through */ }
    }
    const SR = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!SR) throw new Error('Voice input is not supported in this browser.');
    return new Promise((resolve, reject) => {
      const r = new SR(); r.lang = LANG_CODE[lang] ?? 'en-IN'; r.interimResults = false;
      const sim = setInterval(() => { taraAmp.value = 0.2 + Math.random() * 0.5; }, 90);
      r.onresult = (e: any) => { clearInterval(sim); taraAmp.value = 0; resolve(e.results[0][0].transcript); }; // eslint-disable-line @typescript-eslint/no-explicit-any
      r.onerror = (e: any) => { clearInterval(sim); taraAmp.value = 0; reject(new Error(e.error === 'not-allowed' ? 'Microphone permission denied.' : 'Could not hear you. Try again.')); }; // eslint-disable-line @typescript-eslint/no-explicit-any
      r.onend = () => { clearInterval(sim); taraAmp.value = 0; };
      r.start();
    });
  },
};

export const SPEAKERS = ['anushka', 'manisha', 'vidya', 'arya', 'abhilash', 'karun', 'hitesh'];
