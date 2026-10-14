import { mulberry32, pick, int, weighted, cumulative, Rng } from './rng';
import { STORES, DISTRICT_BY_ID } from './geo';
import { ISSUES, ISSUE_BY_ID, PRAISE, Lang, Sev } from './taxonomy';
import { severityFor } from './nlp';

export type Channel = 'review' | 'app' | 'whatsapp' | 'ticket';
export const CHANNELS: Channel[] = ['review', 'app', 'whatsapp', 'ticket'];
export const CHANNEL_LABEL: Record<Channel, string> = { review: 'Online Review', app: 'App Rating', whatsapp: 'Staff WhatsApp', ticket: 'Call-Centre Ticket' };

export const NUM_DAYS = 42; // day 0 = 1 Sep 2026, day 41 = 12 Oct 2026
export const DAY0 = Date.UTC(2026, 8, 1);
export const TOTAL_RECORDS = 40000;
export const dayDate = (d: number) => new Date(DAY0 + d * 86400000);
export const weekEnd = (w: number) => 41 - 7 * (41 - w);
export const WEEKS = [37, 38, 39, 40, 41];
export const CURRENT_WEEK = 41;
export const MOCK_NOW = Date.UTC(2026, 9, 13, 3, 30); // 13 Oct 2026, 09:00 IST

export interface FeedbackRecord {
  id: string;
  n: number;
  channel: Channel;
  day: number;
  ts: number;
  storeId: string;
  text: string;
  gloss: string;
  lang: Lang;
  issue: string | null;
  severity: Sev;
  actionable: boolean;
  confidence: number;
  rating?: number;
  labelled: boolean;
  trueIssue?: string;
  planted?: string;
}

export const PLANTED = [
  { key: 'P1', storeId: 'ATP-07', issue: 'freezer_failure', start: 35, ramp: [2, 3, 5, 8, 12, 16, 21], title: 'Freezer failure at Anantapur', region: 'rayalaseema' },
  { key: 'P2', storeId: 'TPT-03', issue: 'allergen_mislabel', start: 37, ramp: [1, 2, 4, 6, 9], title: 'Allergen mislabel at Tirupati', region: 'rayalaseema' },
  { key: 'P3', storeId: 'VSP-03', issue: 'staff_misconduct', start: 37, ramp: [2, 3, 5, 7, 10], title: 'Staff misconduct at Visakhapatnam', region: 'uttarandhra' },
] as const;

const LANG_W: [Lang, number][] = [['te', 60], ['en', 16], ['hi', 15], ['ta', 6], ['mr', 3]];
const LANG_CUM = cumulative(LANG_W.map((l) => l[1]));
const CH_CUM = cumulative([30, 25, 20, 25]);
const STORE_CUM = cumulative(STORES.map((s) => Math.pow(s.weeklyTx, 0.55)));
const ISSUE_BASE = ISSUES.map((it, i) => (1 / Math.pow(i + 3, 0.55)) * (it.policy ? 0.07 : 1));
const EMO = ['😡', '😤', '🙏', '😢'];
const FILLERS_EN = ['Visited on Sunday.', 'Not the first time.', 'Please look into it.', 'Very disappointed.', 'Be careful next time.'];
const AGENT_OPEN = 'Agent: Namaste, thank you for calling FYRO Mart support. How may I help you?';
const AGENT_MID = ['Agent: I am sorry to hear that, may I have your store name?', 'Agent: Could you share your bill number please?', 'Agent: Let me note this down for you.'];

function typo(r: Rng, s: string): string {
  const words = s.split(' ');
  const i = int(r, 0, words.length - 1);
  const w = words[i];
  if (w.length > 4) words[i] = w.slice(0, 2) + w.slice(3);
  return words.join(' ');
}

function phrase(r: Rng, issueId: string | null, lang: Lang): { text: string; en: string } {
  if (!issueId) {
    const l = PRAISE[lang] ? lang : 'en';
    const i = int(r, 0, PRAISE[l].length - 1);
    return { text: PRAISE[l][i], en: PRAISE.en[Math.min(i, PRAISE.en.length - 1)] };
  }
  const it = ISSUE_BY_ID.get(issueId)!;
  return { text: it[lang] || it.en, en: it.en };
}

function decorate(r: Rng, ch: Channel, base: string, issueId: string | null, rating: number, storeId: string, lang: Lang): string {
  let t = base;
  const neg = !!issueId;
  switch (ch) {
    case 'review': {
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      if (r() < 0.45) t += '. ' + pick(r, FILLERS_EN);
      if (neg && r() < 0.3) t += ' ' + pick(r, EMO);
      t = `${stars} ${t}`;
      break;
    }
    case 'app': {
      if (r() < 0.25) t = t.replace(/\./g, '');
      if (neg && r() < 0.35) t += ' ' + pick(r, EMO);
      if (r() < 0.2) t = t.toLowerCase();
      break;
    }
    case 'whatsapp': {
      const it = issueId ? ISSUE_BY_ID.get(issueId) : null;
      if (it?.short && lang === 'te' && r() < 0.5) t = it.short;
      t = t.toLowerCase();
      if (r() < 0.3) t = typo(r, t);
      if (r() < 0.15) t = t.replace(/([aeiou])(?=[^aeiou]|$)/, '$1$1$1');
      t = `${storeId} mgr: ${t}`;
      if (neg && r() < 0.25) t += ' ' + pick(r, ['⚠️', '😡', '🔥']);
      break;
    }
    case 'ticket': {
      t = `${AGENT_OPEN}\nCustomer: ${t}\n${pick(r, AGENT_MID)}`;
      if (r() < 0.22) t = t.slice(0, int(r, 90, 140)) + '…';
      break;
    }
  }
  return t;
}

function buildRecord(n: number): FeedbackRecord {
  const r = mulberry32(90210 + n * 7919);
  const planted = n < 116 ? plantedSlot(n) : null;
  let storeId: string;
  let day: number;
  let issueId: string | null;
  let plantKey: string | undefined;

  if (planted) {
    storeId = planted.storeId; day = planted.day; issueId = planted.issue; plantKey = planted.key;
  } else {
    day = weighted(r, DAY_CUM);
    const si = weighted(r, STORE_CUM);
    const store = STORES[si];
    storeId = store.id;
    if (r() < 0.36) issueId = null;
    else {
      const w = ISSUES.map((it, i) => ISSUE_BASE[i] * seasonal(it.id, store.region, store.districtId, day));
      issueId = ISSUES[weighted(r, cumulative(w))].id;
    }
  }
  const lang: Lang = LANG_W[weighted(r, LANG_CUM)][0];
  const ch: Channel = CHANNELS[weighted(r, CH_CUM)];
  const rating = issueId ? int(r, 1, 2) + (r() < 0.2 ? 1 : 0) : int(r, 4, 5);
  const { text: base, en } = phrase(r, issueId, lang);
  const text = decorate(r, ch, base, issueId, rating, storeId, lang);
  const labelled = n % 13 === 0;
  let pred = issueId;
  let trueIssue: string | undefined;
  if (labelled) {
    trueIssue = issueId ?? '';
    if (issueId) {
      const x = r();
      if (x < 0.09) {
        const same = ISSUES.filter((i) => i.fn === ISSUE_BY_ID.get(issueId!)!.fn && i.id !== issueId);
        pred = pick(r, same).id;
      } else if (x < 0.115) pred = null;
    } else if (r() < 0.045) pred = pick(r, ISSUES).id;
  }
  const sev = severityFor(pred, text).severity;
  const ts = DAY0 + day * 86400000 + int(r, 8, 22) * 3600000 + int(r, 0, 59) * 60000;
  return {
    id: `FB-${String(n + 1).padStart(6, '0')}`, n, channel: ch, day, ts, storeId, text, gloss: en, lang,
    issue: pred, severity: sev, actionable: !!pred, confidence: Math.round((0.6 + r() * 0.39) * 100) / 100,
    rating: ch === 'review' || ch === 'app' ? rating : undefined, labelled, trueIssue, planted: plantKey,
  };
}

const DAY_CUM = cumulative(Array.from({ length: NUM_DAYS }, (_, d) => { const dow = (d + 1) % 7; return dow === 0 || dow === 6 ? 1.3 : 1; }));

function seasonal(issue: string, region: string, district: string, day: number): number {
  let m = 1;
  if (issue === 'billing_queue' && region === 'coastal' && day >= 33) m *= 4.5; // Dasara run-up
  if (issue === 'power_cut' && ['kakinada', 'konaseema', 'bapatla', 'prakasam', 'east-godavari'].includes(district) && day >= 22 && day <= 25) m *= 14; // cyclone
  if ((issue === 'freezer_failure' || issue === 'ac_failure') && region === 'rayalaseema' && day >= 28) m *= 3;
  return m;
}

let PLANT_SLOTS: { key: string; storeId: string; issue: string; day: number }[] | null = null;
function plantedSlot(n: number) {
  if (!PLANT_SLOTS) {
    PLANT_SLOTS = [];
    for (const p of PLANTED) p.ramp.forEach((c, i) => { for (let k = 0; k < c; k++) PLANT_SLOTS!.push({ key: p.key, storeId: p.storeId, issue: p.issue, day: p.start + i }); });
  }
  return PLANT_SLOTS[n] ?? null;
}

export function generateAll(): FeedbackRecord[] {
  const out: FeedbackRecord[] = new Array(TOTAL_RECORDS);
  for (let n = 0; n < TOTAL_RECORDS; n++) out[n] = buildRecord(n);
  return out;
}
export const _unused = DISTRICT_BY_ID;
