import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import te from './locales/te.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import mr from './locales/mr.json';
import { useUI, Lang } from '@/store';

// English text is the key (gettext style); non-English locales map English → translation.
export const LANGS: { code: Lang; label: string; native: string; tts: string }[] = [
  { code: 'en', label: 'English', native: 'English', tts: 'en-IN' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', tts: 'te-IN' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', tts: 'hi-IN' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', tts: 'ta-IN' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', tts: 'mr-IN' },
];

i18n.use(initReactI18next).init({
  resources: { en: { translation: {} }, te: { translation: te }, hi: { translation: hi }, ta: { translation: ta }, mr: { translation: mr } },
  lng: useUI.getState().lang,
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

const sync = (l: Lang) => { document.documentElement.lang = l; if (i18n.language !== l) void i18n.changeLanguage(l); };
sync(useUI.getState().lang);
useUI.subscribe((s, p) => { if (s.lang !== p.lang) sync(s.lang); });

export default i18n;
