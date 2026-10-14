import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import type { Role } from '@/mocks/db';

// Storage wrapper: never throws (private windows, blocked storage…)
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
const storage = createJSONStorage(() => safeStorage);

export interface SessionUser {
  id: string; name: string; email: string; phone: string; role: Role;
  region?: 'uttarandhra' | 'coastal' | 'rayalaseema'; fn?: string; storeId?: string; active: boolean; lastActive: string;
}

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  expired: boolean;
  setSession: (token: string, user: SessionUser, remember?: boolean) => void;
  setUser: (u: SessionUser) => void;
  logout: (expired?: boolean) => void;
  clearExpired: () => void;
}
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null, user: null, expired: false,
      setSession: (token, user) => set({ token, user, expired: false }),
      setUser: (user) => set({ user }),
      logout: (expired = false) => set({ token: null, user: null, expired }),
      clearExpired: () => set({ expired: false }),
    }),
    { name: 'fyro.auth', storage, partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
);

export type Lang = 'en' | 'te' | 'hi' | 'ta' | 'mr';
interface UIState {
  theme: 'light' | 'dark';
  lang: Lang;
  sidebarCollapsed: boolean;
  week: number;
  region: string;
  paletteOpen: boolean;
  simulateErrors: boolean;
  setTheme: (t: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
  toggleSidebar: () => void;
  setWeek: (w: number) => void;
  setRegion: (r: string) => void;
  setPalette: (o: boolean) => void;
  setSimulateErrors: (b: boolean) => void;
}
export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light', lang: 'en', sidebarCollapsed: false, week: 41, region: 'all', paletteOpen: false, simulateErrors: false,
      setTheme: (theme) => { applyTheme(theme); set({ theme }); },
      toggleTheme: () => get().setTheme(get().theme === 'light' ? 'dark' : 'light'),
      setLang: (lang) => set({ lang }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setWeek: (week) => set({ week }),
      setRegion: (region) => set({ region }),
      setPalette: (paletteOpen) => set({ paletteOpen }),
      setSimulateErrors: (simulateErrors) => set({ simulateErrors }),
    }),
    { name: 'fyro.ui', storage, partialize: (s) => ({ theme: s.theme, lang: s.lang, sidebarCollapsed: s.sidebarCollapsed, week: s.week, region: s.region }) },
  ),
);
export function applyTheme(t: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('fyro.theme', t); } catch { /* ignore */ }
}

export type TaraMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'concerned';
export interface TaraMessage { id: string; from: 'user' | 'tara'; text: string; ts: number; streaming?: boolean; mood?: TaraMood; usedDeviceVoice?: boolean }
interface TaraState {
  open: boolean;
  mood: TaraMood;
  messages: TaraMessage[];
  pending: { text: string; speak?: boolean } | null;
  ask: (text: string, speak?: boolean) => void;
  clearPending: () => void;
  autoSpeak: boolean;
  speaker: string;
  pace: number;
  useSarvam: boolean;
  deviceVoice: boolean;
  setOpen: (o: boolean) => void;
  setMood: (m: TaraMood) => void;
  push: (m: TaraMessage) => void;
  patch: (id: string, p: Partial<TaraMessage>) => void;
  clear: () => void;
  setAutoSpeak: (b: boolean) => void;
  setSpeaker: (s: string) => void;
  setPace: (p: number) => void;
  setUseSarvam: (b: boolean) => void;
  setDeviceVoice: (b: boolean) => void;
}
export const useTara = create<TaraState>()(
  persist(
    (set) => ({
      open: false, mood: 'idle', messages: [], pending: null, ask: (text, speak) => set({ open: true, pending: { text, speak } }), clearPending: () => set({ pending: null }), autoSpeak: false, speaker: 'anushka', pace: 1, useSarvam: true, deviceVoice: false,
      setOpen: (open) => set({ open }),
      setMood: (mood) => set({ mood }),
      push: (m) => set((s) => ({ messages: [...s.messages, m] })),
      patch: (id, p) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...p } : m)) })),
      clear: () => set({ messages: [] }),
      setAutoSpeak: (autoSpeak) => set({ autoSpeak }),
      setSpeaker: (speaker) => set({ speaker }),
      setPace: (pace) => set({ pace }),
      setUseSarvam: (useSarvam) => set({ useSarvam }),
      setDeviceVoice: (deviceVoice) => set({ deviceVoice }),
    }),
    { name: 'fyro.tara', storage, partialize: (s) => ({ autoSpeak: s.autoSpeak, speaker: s.speaker, pace: s.pace, useSarvam: s.useSarvam, messages: s.messages.slice(-30).map((m) => ({ ...m, streaming: false })) }) },
  ),
);
// Live audio amplitude (0..1) — mutated outside React to avoid re-renders at 60fps.
export const taraAmp = { value: 0 };

interface TourState {
  completed: Record<string, boolean>;
  running: boolean;
  step: number;
  start: () => void;
  stop: (complete?: boolean, role?: string) => void;
  setStep: (n: number) => void;
}
export const useTour = create<TourState>()(
  persist(
    (set) => ({
      completed: {}, running: false, step: 0,
      start: () => set({ running: true, step: 0 }),
      stop: (complete, role) => set((s) => ({ running: false, step: 0, completed: complete && role ? { ...s.completed, [`tourCompleted:${role}`]: true } : s.completed })),
      setStep: (step) => set({ step }),
    }),
    { name: 'fyro.tour', storage, partialize: (s) => ({ completed: s.completed }) },
  ),
);
