import { ISSUES, ISSUE_BY_ID, Lang, Sev, PolicyCat } from './taxonomy';
import { hash } from './rng';

/* ───────────── Layer 1 · Channel cleaning ───────────── */
const EMOJI: Record<string, string> = {
  '😡': '<ANGRY>', '😠': '<ANGRY>', '🤬': '<ANGRY>', '😤': '<ANGRY>', '😢': '<SAD>', '😭': '<SAD>', '🤢': '<DISGUST>', '😷': '<DISGUST>',
  '🙏': '<THANKS>', '👍': '<GOOD>', '😊': '<HAPPY>', '😍': '<HAPPY>', '❤️': '<LOVE>', '⚠️': '<WARN>', '🔥': '<URGENT>', '👎': '<BAD>',
};
const SHORTHAND: Record<string, string> = {
  frzr: 'freezer', nt: 'not', wrkng: 'working', stk: 'stock', pls: 'please', plz: 'please', cust: 'customer', lbl: 'label', clsd: 'closed',
  q: 'queue', pwr: 'power', stpd: 'stopped', msg: 'message', tmrw: 'tomorrow', abt: 'about', wt: 'what', bcz: 'because', ppl: 'people', hv: 'have', thr: 'there',
};

export interface CleanStep { id: string; label: string; changed: boolean; text: string }
export interface CleanResult { original: string; cleaned: string; truncated: boolean; steps: CleanStep[] }

export function cleanText(input: string, channel?: string): CleanResult {
  const steps: CleanStep[] = [];
  let t = input;
  const push = (id: string, label: string, next: string) => {
    steps.push({ id, label, changed: next !== t, text: next });
    t = next;
  };
  if (channel === 'ticket' || /^(agent|customer)\s*:/im.test(t)) {
    const customerOnly = t.split(/\n|(?=Agent:|Customer:)/).map((l) => l.trim()).filter((l) => l && !/^agent\s*:/i.test(l)).map((l) => l.replace(/^customer\s*:\s*/i, '')).join(' ');
    push('agent', 'Remove agent turns from transcript', customerOnly);
  } else push('agent', 'Remove agent turns from transcript', t);
  push('emoji', 'Emoji → sentiment tokens', t.replace(/(😡|😠|🤬|😤|😢|😭|🤢|😷|🙏|👍|😊|😍|❤️|⚠️|🔥|👎)/g, (m) => ` ${EMOJI[m] ?? ''} `));
  push('elong', 'Collapse letter elongation', t.replace(/([a-zA-Z])\1{2,}/g, '$1').replace(/([!?.])\1{2,}/g, '$1$1'));
  push('short', 'Expand WhatsApp shorthand', t.replace(/\b[a-zA-Z]+\b/g, (w) => SHORTHAND[w.toLowerCase()] ?? w));
  push('rating', 'Strip star-rating decorations', t.replace(/[★☆]{1,5}/g, ' ').replace(/\b\d\s*★/g, ' '));
  push('space', 'Normalise whitespace', t.replace(/\s+/g, ' ').trim());
  const truncated = /(\.\.\.|…)$/.test(input.trim()) || (input.length >= 150 && !/[.!?]$/.test(input.trim()));
  steps.push({ id: 'trunc', label: 'Truncation flag', changed: truncated, text: truncated ? t + '  [TRUNCATED]' : t });
  return { original: input, cleaned: t, truncated, steps };
}

/* ───────────── Layer 2 · Language ID + transliteration ───────────── */
const EN_WORDS = new Set(('the a an is are was were not no yes and or but of to in on at for with from by it its this that very too so just now ' +
  'freezer fridge ice cream store billing counter queue minutes waiting floor dirty trolleys clean stock milk packets curd shelf price label ' +
  'allergy allergic peanuts offer board app crash payment fail failed money order cancel reason delivery late hours otp login staff rude products ' +
  'brands variety aisles cartons restock shelves rats rice bags grain section customer slipped water leak parking space bikes bike block ac hot ' +
  'lights off power cut current bill extra item items expiry expired oil bottles boxes damaged tomatoes weight please check morning since missing ' +
  'attitude behaviour english good great friendly fresh vegetables smooth variety again nice offers happy thank you helpful thanks ' +
  'sorry working working wrong order home tomatoes fell wet pls plz ok okay hello bhai').split(/\s+/));

const LEX: Record<string, Lang> = {};
const addLex = (lang: Lang, field: 'te' | 'hi' | 'ta' | 'mr') => {
  for (const it of ISSUES) {
    for (const w of tokenize(it[field])) if (!EN_WORDS.has(w) && !/^\d/.test(w) && !LEX[w]) LEX[w] = lang;
  }
};
export function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-zÀ-ɏ]+|\d+g?|[ऀ-ॿఀ-౿஀-௿]+/g) ?? []);
}
// Marathi-specific markers first so they are not swallowed by Hindi.
['aahe', 'aat', 'khup', 'zale', 'kela', 'madhe', 'var', 'hota', 'thambla', 'gelet', 'jast', 'kami', 'mulala', 'vikat', 'ghan', 'chhan', 'karto'].forEach((w) => (LEX[w] = 'mr'));
addLex('te', 'te'); addLex('hi', 'hi'); addLex('ta', 'ta'); addLex('mr', 'mr');
['hai', 'nahi', 'bahut', 'bhi', 'ka', 'ke', 'ko', 'par', 'mein', 'se', 'kar', 'raha', 'gaya', 'ho', 'aaye', 'kam', 'ek', 'do', 'bhai', 'accha', 'achhe'].forEach((w) => (LEX[w] = 'hi'));
['ledu', 'ga', 'lo', 'ki', 'undi', 'unnayi', 'chala', 'ani', 'ma', 'papa', 'rendu', 'okati', 'inkoti', 'takkuva', 'evaru', 'cheyyatledu', 'pani', 'meeda', 'kani', 'bagundi', 'bagunnayi'].forEach((w) => (LEX[w] = 'te'));
['illa', 'romba', 'la', 'ah', 'aana', 'vera', 'kammi', 'irukku', 'nalla', 'seyyala', 'velai', 'naala'].forEach((w) => (LEX[w] = 'ta'));
['bhai', 'yaar'].forEach((w) => (LEX[w] = 'hi'));

export interface LangToken { text: string; lang: Lang | 'sym'; native?: string }
const SCRIPT_LANG = (w: string): Lang | null => (/[ఀ-౿]/.test(w) ? 'te' : /[஀-௿]/.test(w) ? 'ta' : /[ऀ-ॿ]/.test(w) ? 'hi' : null);

export function langId(text: string): { tokens: LangToken[]; dominant: Lang; mix: Record<Lang, number> } {
  const raw = text.match(/<[A-Z]+>|[^\s]+/g) ?? [];
  const mix: Record<Lang, number> = { te: 0, hi: 0, ta: 0, mr: 0, en: 0 };
  const tokens: LangToken[] = raw.map((w) => {
    if (/^<[A-Z]+>$/.test(w) || /^[\d\W]+$/.test(w)) return { text: w, lang: 'sym' as const };
    const clean = w.toLowerCase().replace(/[^a-zऀ-ॿఀ-౿஀-௿]/g, '');
    const sc = SCRIPT_LANG(clean);
    const lang: Lang = sc ?? LEX[clean] ?? 'en';
    mix[lang]++;
    return { text: w, lang };
  });
  const dominant = (Object.keys(mix) as Lang[]).sort((a, b) => mix[b] - mix[a])[0];
  return { tokens, dominant, mix };
}

type ScriptTable = { cons: Record<string, number>; vow: Record<string, [number, number | null]>; virama: number };
const mk = (base: number, cons: Record<string, number>, vow: Record<string, [number, number | null]>, virama: number): ScriptTable => ({ cons, vow, virama });
const BRAHMIC_CONS = (off: number): Record<string, number> => ({
  k: off + 0x15, kh: off + 0x16, g: off + 0x17, gh: off + 0x18, ng: off + 0x19, ch: off + 0x1a, chh: off + 0x1b, j: off + 0x1c, jh: off + 0x1d,
  T: off + 0x1f, Th: off + 0x20, D: off + 0x21, Dh: off + 0x22, N: off + 0x23, t: off + 0x24, th: off + 0x25, d: off + 0x26, dh: off + 0x27, n: off + 0x28,
  p: off + 0x2a, ph: off + 0x2b, f: off + 0x2b, b: off + 0x2c, bh: off + 0x2d, m: off + 0x2e, y: off + 0x2f, r: off + 0x30, l: off + 0x32, v: off + 0x35, w: off + 0x35,
  sh: off + 0x36, s: off + 0x38, h: off + 0x39, z: off + 0x1c, q: off + 0x15, x: off + 0x15,
});
const TELUGU = mk(0xc00, BRAHMIC_CONS(0xc00), {
  a: [0xc05, null], aa: [0xc06, 0xc3e], i: [0xc07, 0xc3f], ee: [0xc08, 0xc40], u: [0xc09, 0xc41], oo: [0xc0a, 0xc42], e: [0xc0e, 0xc46], ai: [0xc10, 0xc48], o: [0xc12, 0xc4a], au: [0xc14, 0xc4c],
}, 0xc4d);
const DEVA = mk(0x900, BRAHMIC_CONS(0x900), {
  a: [0x905, null], aa: [0x906, 0x93e], i: [0x907, 0x93f], ee: [0x908, 0x940], u: [0x909, 0x941], oo: [0x90a, 0x942], e: [0x90f, 0x947], ai: [0x910, 0x948], o: [0x913, 0x94b], au: [0x914, 0x94c],
}, 0x94d);
const TAMIL_CONS: Record<string, number> = {
  k: 0xb95, kh: 0xb95, g: 0xb95, gh: 0xb95, ng: 0xb99, ch: 0xb9a, chh: 0xb9a, j: 0xb9c, jh: 0xb9c, T: 0xb9f, Th: 0xb9f, D: 0xb9f, Dh: 0xb9f, N: 0xba3,
  t: 0xba4, th: 0xba4, d: 0xba4, dh: 0xba4, n: 0xba8, p: 0xbaa, ph: 0xbaa, f: 0xbaa, b: 0xbaa, bh: 0xbaa, m: 0xbae, y: 0xbaf, r: 0xbb0, l: 0xbb2, v: 0xbb5, w: 0xbb5,
  zh: 0xbb4, sh: 0xbb7, s: 0xbb8, h: 0xbb9, z: 0xb9c,
};
const TAMIL = mk(0xb80, TAMIL_CONS, {
  a: [0xb85, null], aa: [0xb86, 0xbbe], i: [0xb87, 0xbbf], ee: [0xb88, 0xbc0], u: [0xb89, 0xbc1], oo: [0xb8a, 0xbc2], e: [0xb8e, 0xbc6], ai: [0xb90, 0xbc8], o: [0xb92, 0xbca], au: [0xb94, 0xbcc],
}, 0xbcd);
const TABLES: Record<'te' | 'hi' | 'ta' | 'mr', ScriptTable> = { te: TELUGU, hi: DEVA, ta: TAMIL, mr: DEVA };
const VOWEL_KEYS = ['aa', 'ee', 'oo', 'ai', 'au', 'a', 'i', 'u', 'e', 'o'];
const CONS_KEYS = ['chh', 'ng', 'kh', 'gh', 'ch', 'jh', 'Th', 'Dh', 'th', 'dh', 'ph', 'bh', 'sh', 'zh', 'k', 'g', 'j', 'T', 'D', 'N', 't', 'd', 'n', 'p', 'f', 'b', 'm', 'y', 'r', 'l', 'v', 'w', 's', 'h', 'z', 'q', 'x'];

export function transliterateWord(word: string, lang: 'te' | 'hi' | 'ta' | 'mr'): string {
  const tb = TABLES[lang];
  let w = word.toLowerCase().replace(/ii/g, 'ee').replace(/uu/g, 'oo').replace(/w/g, 'v');
  w = w.replace(/tt/g, 'T').replace(/dd/g, 'D').replace(/nn/g, 'N').replace(/ll/g, 'l').replace(/ss/g, 's').replace(/kk/g, 'k').replace(/pp/g, 'p').replace(/mm/g, 'm');
  let out = '';
  let i = 0;
  let afterCons = false;
  while (i < w.length) {
    const rest = w.slice(i);
    const v = VOWEL_KEYS.find((k) => rest.startsWith(k));
    const matchCons = CONS_KEYS.find((k) => rest.startsWith(k) && tb.cons[k] !== undefined);
    if (matchCons && !(v && !matchCons)) {
      if (afterCons) out += String.fromCodePoint(tb.virama);
      out += String.fromCodePoint(tb.cons[matchCons]);
      afterCons = true;
      i += matchCons.length;
    } else if (v) {
      const [ind, mat] = tb.vow[v];
      if (afterCons) { if (mat) out += String.fromCodePoint(mat); }
      else out += String.fromCodePoint(ind);
      afterCons = false;
      i += v.length;
    } else {
      out += w[i];
      afterCons = false;
      i++;
    }
  }
  if (afterCons && (lang === 'ta')) out += String.fromCodePoint(tb.virama);
  return out;
}

export function transliterate(text: string): { tokens: LangToken[]; native: string } {
  const { tokens } = langId(text);
  const outTokens = tokens.map((t) => {
    if (t.lang === 'sym' || t.lang === 'en') return { ...t, native: t.text };
    const clean = t.text.replace(/[^a-zA-Z]/g, '');
    if (!clean || /[^\u0000-ɏ]/.test(t.text)) return { ...t, native: t.text };
    return { ...t, native: transliterateWord(clean, t.lang as 'te' | 'hi' | 'ta' | 'mr') };
  });
  return { tokens: outTokens, native: outTokens.map((t) => t.native).join(' ') };
}

const GLOSS: [string, string][] = [
  ['pani cheyyatledu', 'is not working'], ['cheyyatledu', 'is not doing'], ['since morning', 'since morning'], ['karigipoyayi', 'melted'], ['kharab hai', 'is broken'], ['pighal gayi', 'melted'],
  ['velai seyyala', 'not working'], ['urugiduchu', 'melted'], ['chalat nahi', 'not working'], ['vitaltay', 'melted'], ['stock ledu', 'out of stock'], ['stock nahi', 'out of stock'], ['stock illa', 'out of stock'],
  ['rude ga matladaru', 'spoke rudely'], ['kodataniki vachaaru', 'tried to hit'], ['ekkuva dabbulu vesaru', 'charged too much'], ['ma papa ki allergy vachindi', 'my child had an allergic reaction'],
  ['allergy vachindi', 'had an allergic reaction'], ['ani ledu', 'is not mentioned'], ['kullipoyina', 'rotten'], ['ammutunnaru', 'are selling'], ['chala', 'very'], ['romba', 'very'], ['bahut', 'very'], ['khup', 'very'],
  ['ledu', 'is not there'], ['illa', 'is not there'], ['nahi', 'not'], ['hai', 'is'], ['undi', 'is'], ['unnayi', 'are'], ['lo', 'in'], ['mein', 'in'], ['madhe', 'in'], ['la', 'in'], ['ki', 'to'],
  ['rendu rojulundi', 'for two days'], ['do din se', 'for two days'], ['rendu naala', 'for two days'], ['takkuva', 'less'], ['kam', 'less'], ['kammi', 'less'], ['kami', 'less'], ['khali', 'empty'], ['kaali', 'empty'],
  ['current ledu', 'there is no power'], ['light gayi', 'power went out'], ['current illa', 'there is no power'], ['light gelet', 'power went out'], ['aagipoyindi', 'stopped'], ['ruk gayi', 'stopped'], ['nindruchu', 'stopped'], ['thambla', 'stopped'],
  ['vedi ga undi', 'is hot'], ['garmi', 'heat'], ['veppam', 'heat'], ['elukalu', 'rats'], ['chuhe', 'rats'], ['eli', 'rat'], ['undir', 'rat'], ['dabbalu', 'boxes'], ['dabbe', 'boxes'], ['nalugipoyayi', 'got crushed'], ['pichak gaye', 'got crushed'],
  ['shelf price okati', 'shelf price is one'], ['billing lo inkoti', 'billing has another'], ['tappu', 'wrong'], ['galat', 'wrong'], ['thappu', 'wrong'], ['chukiche', 'wrong'], ['variety ledu', 'no variety'],
  ['payment fail ayindi', 'payment failed'], ['kani', 'but'], ['par', 'but'], ['aana', 'but'], ['pan', 'but'], ['money cut ayyindi', 'money was deducted'], ['paisa kat gaya', 'money was deducted'], ['crash avtundi', 'crashes'], ['crash ho jata hai', 'crashes'],
  ['order cancel chesaru', 'order was cancelled'], ['order cancel kar diya', 'order was cancelled'], ['reason cheppaledu', 'no reason given'], ['wajah nahi batayi', 'no reason given'], ['late ga vachindi', 'came late'], ['late aayi', 'came late'],
  ['raavatledu', 'is not arriving'], ['nahi aa raha', 'is not arriving'], ['staff takkuva', 'too few staff'], ['staff kam hai', 'too few staff'], ['help cheyyadaniki evaru ledu', 'nobody to help'], ['koi help nahi', 'nobody to help'],
  ['store chala bagundi', 'the store is very good'], ['manchiga help chesaru', 'helped well'], ['bagunnayi', 'are good'], ['bagundi', 'is good'], ['accha hai', 'is good'], ['bhai', 'brother'], ['ga', ''],
];
GLOSS.sort((a, b) => b[0].length - a[0].length);
export function translate(text: string): string {
  let t = ' ' + text.toLowerCase() + ' ';
  const ph = new Map<string, string>();
  GLOSS.forEach(([k, v], i) => {
    const re = new RegExp(`(?<=[\\s,.;!?])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s,.;!?])`, 'g');
    t = t.replace(re, () => { const key = `§${i}§`; ph.set(key, v); return key; });
  });
  ph.forEach((v, k) => { t = t.split(k).join(v); });
  t = t.replace(/\s+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ───────────── Layer 3 · Hybrid classifier ───────────── */
const KW: Record<string, string[]> = {
  freezer_failure: ['freezer', 'fridge', 'frzr', 'chiller', 'ice cream', 'karigi', 'pighal', 'urug'],
  ac_failure: [' ac ', 'a/c', 'aircon', 'veppam', 'garmi', 'vedi', 'hot hot'],
  power_cut: ['current ledu', 'power cut', 'light gayi', 'light gelet', 'current illa', 'pwr cut', 'generator', 'lights anni off'],
  billing_queue: ['queue', 'lambi line', 'rang', 'counters', 'waiting chesam', 'wait kiya', 'kaathirunthom', 'thamblo'],
  cleanliness: ['dirty', 'gandi', 'azhukku', 'ghan aahe', 'not clean', 'saaf nahi', 'clean illa'],
  pest_hygiene: ['rats', 'elukalu', 'chuhe', 'eli odudhu', 'undir', 'cockroach', 'pest'],
  safety_hazard: ['slipped', 'jaarpadaru', 'phisal', 'valukki', 'ghasarla', 'fell', 'wet floor'],
  parking_access: ['parking'],
  overcharging: ['ekkuva dabbulu', 'zyada paise', 'adhiga kaasu', 'jast paise', 'overcharg', 'extra item'],
  out_of_stock: ['stock ledu', 'stock nahi', 'stock illa', 'out of stock', 'stk ledu'],
  expired_product: ['expiry', 'expire', 'expired'],
  short_delivery: ['takkuva vachayi', 'items kam', 'items kammi', 'items kami', 'short in delivery', 'missing'],
  damaged_goods: ['damaged', 'nalugipoyayi', 'pichak', 'nasungiduchu', 'chirdle'],
  stale_produce: ['kullipoyina', 'rotten', 'sadhe', 'azhugina', 'kujlele', 'kullipoyayi'],
  replenishment_delay: ['restock', 'shelves khali', 'shelf kaali', 'shelf rikame', 'empty shelves'],
  price_mismatch: ['shelf price', 'shelf pe price', 'shelf var', 'price differs', 'billing vera'],
  allergen_mislabel: ['allergy', 'allergen', 'allergic', 'peanut'],
  wrong_label: ['weight label', 'label tappu', 'label galat', 'label thappu', 'label chukiche', 'wrong weight'],
  poor_assortment: ['brands', 'variety'],
  promo_not_applied: ['offer board', 'promo', 'apply avvaledu', 'nahi laga', 'billing la poda'],
  shelf_clutter: ['aisle', 'cartons'],
  app_crash: ['crash'],
  payment_failure: ['payment fail', 'money cut', 'paisa kat', 'panam pochu', 'paise kapale'],
  order_cancelled: ['order cancel'],
  delivery_late: ['delivery chala late', 'delivery bahut late', 'delivery romba late', 'delivery khup', 'hours late'],
  otp_issue: ['otp'],
  staff_misconduct: ['abusive', 'threatening', 'kodataniki', 'badtameezi', 'dhamki', 'midhirinaanga', 'arerá', 'rude ga matladaru', 'rude ah pesinanga'],
  staff_rude: ['rude', 'attitude', 'behaviour', 'vartan', 'matladatledu'],
  short_staffed: ['staff takkuva', 'staff kam', 'staff kammi', 'staff kami', 'few staff'],
  staff_training: ['products gurinchi', 'product ke baare', 'product pathi', 'product baddal', 'know the products'],
};

export type Tier = 'rules' | 'muril' | 'llm';
export interface Classification {
  issue: string | null;
  confidence: number;
  tier: Tier;
  scores: { id: string; p: number }[];
  segments: { text: string; issue: string | null; confidence: number }[];
  actionable: boolean;
}

function scoreText(text: string) {
  const t = ' ' + cleanText(text).cleaned.toLowerCase() + ' ';
  const raw: Record<string, number> = {};
  for (const [id, kws] of Object.entries(KW)) {
    let s = 0;
    for (const k of kws) if (t.includes(k)) s += 1 + k.length / 8;
    raw[id] = s;
  }
  return raw;
}

export function classify(text: string): Classification {
  const segs = text.split(/(?<=[.!?])\s+|\s*(?:\bbut\b|\band also\b|\bkani\b|\bpar\b|\baana\b|\|)\s*/i).map((s) => s.trim()).filter((s) => s.length > 3);
  const raw = scoreText(text);
  const entries = Object.entries(raw).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  const second = entries[1];
  const jitter = (id: string) => ((hash(id + text) % 100) / 100) * 0.35;
  const temp = 1.6;
  const exps = ISSUES.map((i) => Math.exp((raw[i.id] + jitter(i.id) * 0.2) / temp));
  const Z = exps.reduce((a, b) => a + b, 0);
  const scores = ISSUES.map((i, k) => ({ id: i.id, p: exps[k] / Z })).sort((a, b) => b.p - a.p);
  const hasIssue = top[1] > 0;
  const margin = top[1] - (second?.[1] ?? 0);
  let tier: Tier = 'rules';
  if (!hasIssue) tier = 'muril';
  else if (margin < 1.2) tier = 'llm';
  else if (top[1] < 2.2) tier = 'muril';
  const confidence = hasIssue ? Math.min(0.99, 0.62 + Math.min(1, top[1] / 4) * 0.25 + Math.min(0.12, margin / 20)) : 0.55;
  const segments = (segs.length ? segs : [text]).map((s) => {
    const r = scoreText(s);
    const e = Object.entries(r).sort((a, b) => b[1] - a[1])[0];
    return { text: s, issue: e[1] > 0 ? e[0] : null, confidence: e[1] > 0 ? Math.min(0.97, 0.66 + e[1] / 10) : 0.5 };
  });
  return { issue: hasIssue ? top[0] : null, confidence, tier, scores, segments, actionable: hasIssue };
}

/* ───────────── Layer 4 · Severity policy ───────────── */
export interface SeverityResult { severity: Sev; modelSeverity: Sev; floor: Sev; policy: PolicyCat; forced: boolean; reasons: string[] }
export function severityFor(issueId: string | null, text = '', policyOverrides?: Partial<Record<Exclude<PolicyCat, null>, boolean>>): SeverityResult {
  if (!issueId) return { severity: 4, modelSeverity: 4, floor: 4, policy: null, forced: false, reasons: ['No actionable issue detected'] };
  const it = ISSUE_BY_ID.get(issueId)!;
  const reasons: string[] = [];
  let model = it.floor as number;
  const t = text.toLowerCase();
  const urgency = [/😡|🤬|<angry>|angry|urgent/, /since morning|3 days|two days|rendu rojulu|do din|hours/].filter((re) => re.test(t)).length;
  if (urgency >= 2) { model -= 1; reasons.push('Anger plus duration cues raise model severity'); }
  if (/child|papa|kid|baby|bachche|kuzhandhai|slipped|fell|allerg/.test(t)) { model -= 1; reasons.push('Vulnerable customer or injury cue'); }
  if (/\b(\d{2,}) (customers|people)\b/.test(t)) { model -= 1; reasons.push('Multiple customers affected'); }
  model = Math.max(1, Math.min(4, model));
  const policyActive = it.policy && (policyOverrides?.[it.policy] ?? true);
  const floor: Sev = policyActive ? 1 : it.floor;
  const severity = Math.min(floor, model) as Sev; // lower number = more severe
  if (policyActive) reasons.unshift(`Policy "${it.policy}" forces floor S1`);
  return { severity, modelSeverity: model as Sev, floor, policy: it.policy, forced: !!policyActive && severity === 1 && model > 1, reasons };
}

/* ───────────── Layer 5 · De-duplication ───────────── */
export interface DedupInput { id: string; channel: string; text: string; storeId: string; ts: number; issue?: string | null }
const ORDER_RE = /\b(?:ord|order)[\s#:-]*([a-z0-9]{5,10})\b/i;
const AMT_RE = /(?:rs\.?|₹)\s*(\d{2,6})/i;
export function entities(text: string) {
  return { order: text.match(ORDER_RE)?.[1] ?? null, amount: text.match(AMT_RE)?.[1] ?? null };
}
export function similarity(a: DedupInput, b: DedupInput): { score: number; blocked: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const sameStore = a.storeId === b.storeId;
  const ia = a.issue ?? classify(a.text).issue;
  const ib = b.issue ?? classify(b.text).issue;
  const fa = ia ? ISSUE_BY_ID.get(ia)?.family : null;
  const fb = ib ? ISSUE_BY_ID.get(ib)?.family : null;
  const within = Math.abs(a.ts - b.ts) <= 72 * 3600 * 1000;
  const blocked = !(sameStore && fa && fa === fb && within);
  if (sameStore) reasons.push('same store'); if (fa && fa === fb) reasons.push('same issue family'); if (within) reasons.push('±72h');
  const ta = new Set(tokenize(translate(cleanText(a.text).cleaned))); const tb = new Set(tokenize(translate(cleanText(b.text).cleaned)));
  const inter = [...ta].filter((x) => tb.has(x)).length;
  let score = inter / Math.max(1, new Set([...ta, ...tb]).size);
  const ea = entities(a.text); const eb = entities(b.text);
  if (ea.order && ea.order === eb.order) { score += 0.3; reasons.push('order ID match'); }
  if (ea.amount && ea.amount === eb.amount) { score += 0.15; reasons.push('bill amount match'); }
  if (ia && ia === ib) score += 0.35;
  return { score: Math.min(1, score), blocked, reasons };
}

/* ───────────── Layer 6 · Normalisation ───────────── */
export function normalise(count: number, tx: number, districtMeanPer1k: number, m = 8) {
  const T = tx / 1000;
  const raw = count / T;
  const shrunk = (count + m * districtMeanPer1k) / (T + m);
  return { raw, shrunk, weight: T / (T + m) };
}
