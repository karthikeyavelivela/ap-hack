// Illustrations live in /public/assets (sheets are pre-sliced into /public/assets/sliced by scripts/slice.py).
const S = (n: string) => `/assets/sliced/${n}.webp`;

export const A = {
  paper: '/assets/paper.webp',
  particles: '/assets/bg-particles.webp',
  store: '/assets/store.webp',
  bannerStore: '/assets/banner-store.webp',
  bannerWarm: '/assets/banner-warm.webp',
  loginHero: '/assets/login-hero.png',
  radarMap: '/assets/radar-map.webp',
  apMap: '/assets/ap-map.webp',
  mail: '/assets/tara-mail.webp',
  success: '/assets/tara-success.webp',
  pipelineStrip: '/assets/pipeline-strip.webp',
  pipelineHero: '/assets/pipeline-hero.webp',
} as const;

export const CHANNEL_ICON: Record<string, string> = { review: S('icons-channels-0'), app: S('icons-channels-1'), whatsapp: S('icons-channels-2'), ticket: S('icons-channels-3') };
export const TARA_STATE = { cozy: S('tara-states-0'), box: S('tara-states-1'), sleeping: S('tara-states-2'), unplug: S('tara-states-3'), done: S('tara-states-4') };
export const TARA_ERROR = { lost: S('tara-errors-0'), forbidden: S('tara-errors-1'), broken: S('tara-errors-2') };
export const TARA_POSE = { welcome: S('tara-poses-0'), search: S('tara-poses-1'), charts: S('tara-poses-2'), radar: S('tara-poses-3'), report: S('tara-poses-4'), thumbs: S('tara-poses-5') };
export const LAYER_ICON: string[] = Array.from({ length: 10 }, (_, i) => S(`layer-icons-${i}`));
export const FEATURE_ICON: string[] = Array.from({ length: 6 }, (_, i) => S(`feature-icons-${i}`));
export const AVATAR: string[] = Array.from({ length: 6 }, (_, i) => S(`avatars-${i}`));
export const REGION_SCENE: Record<string, string> = { uttarandhra: S('landscapes-0'), coastal: S('landscapes-1'), rayalaseema: S('landscapes-2') };
export const STORE_TIER: Record<string, string> = { Express: S('store-tiers-0'), Supermarket: S('store-tiers-1'), Hypermarket: S('store-tiers-2') };
