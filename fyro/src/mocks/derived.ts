import { STORES, STORE_BY_ID, DISTRICTS, DISTRICT_BY_ID, REGIONS, RegionId } from './geo';
import { ISSUES, ISSUE_BY_ID, FN_BY_ID, Sev, FnId } from './taxonomy';
import { FeedbackRecord, Channel, NUM_DAYS, DAY0, PLANTED, generateAll, weekEnd, WEEKS, CURRENT_WEEK, CHANNELS } from './recordsGen';

/* ───────────── record loading (Web Worker with sync fallback) ───────────── */
let recordsPromise: Promise<FeedbackRecord[]> | null = null;
export function loadRecords(): Promise<FeedbackRecord[]> {
  if (recordsPromise) return recordsPromise;
  recordsPromise = new Promise((resolve) => {
    const fallback = () => resolve(generateAll());
    try {
      const w = new Worker(new URL('./records.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<FeedbackRecord[]>) => { resolve(e.data); w.terminate(); };
      w.onerror = () => { w.terminate(); fallback(); };
      w.postMessage('go');
    } catch { fallback(); }
  });
  return recordsPromise;
}

/* ───────────── incidents ───────────── */
export type IncidentStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved';
export interface Incident {
  id: string;
  storeId: string;
  issue: string;
  family: string;
  fn: FnId;
  severity: Sev;
  channels: Channel[];
  count: number;
  firstTs: number;
  lastTs: number;
  recordIds: string[];
  status: IncidentStatus;
  owner: string;
  region: RegionId;
  districtId: string;
  title: string;
  planted?: string;
  topQuote: string;
}

export interface Derived {
  records: FeedbackRecord[];
  incidents: Incident[];
  incidentById: Map<string, Incident>;
  recordIncident: Map<string, string>;
  series: Map<string, Uint16Array>; // `${store}|${issue}`
  byKey: Map<string, FeedbackRecord[]>;
  storeIncidents: Map<string, Incident[]>;
}

const STATUSES: IncidentStatus[] = ['new', 'acknowledged', 'in_progress', 'resolved'];
const DAY_MS = 86400000;
const END_TS = DAY0 + NUM_DAYS * DAY_MS;

export function buildDerived(records: FeedbackRecord[]): Derived {
  const series = new Map<string, Uint16Array>();
  const byKey = new Map<string, FeedbackRecord[]>();
  const groups = new Map<string, FeedbackRecord[]>();
  for (const r of records) {
    if (!r.issue) continue;
    const k = `${r.storeId}|${r.issue}`;
    let s = series.get(k);
    if (!s) { s = new Uint16Array(NUM_DAYS); series.set(k, s); }
    s[r.day]++;
    const bl = byKey.get(k);
    if (bl) bl.push(r); else byKey.set(k, [r]);
    const gk = `${r.storeId}|${ISSUE_BY_ID.get(r.issue)!.family}`;
    let g = groups.get(gk);
    if (!g) { g = []; groups.set(gk, g); }
    g.push(r);
  }
  const incidents: Incident[] = [];
  for (const [gk, list] of groups) {
    list.sort((a, b) => a.ts - b.ts);
    let cur: FeedbackRecord[] = [];
    const flush = () => {
      if (cur.length >= 4 && new Set(cur.map((r) => r.channel)).size >= 2) incidents.push(makeIncident(cur, gk));
      cur = [];
    };
    for (const r of list) {
      if (cur.length && r.ts - cur[cur.length - 1].ts > 72 * 3600 * 1000) flush();
      cur.push(r);
    }
    flush();
  }
  // planted first, then by severity then recency
  incidents.sort((a, b) => (a.planted ? 0 : 1) - (b.planted ? 0 : 1) || a.severity - b.severity || b.lastTs - a.lastTs);
  incidents.forEach((inc, i) => { inc.id = `INC-${1001 + i}`; });
  const incidentById = new Map(incidents.map((i) => [i.id, i]));
  const recordIncident = new Map<string, string>();
  const storeIncidents = new Map<string, Incident[]>();
  for (const inc of incidents) {
    for (const rid of inc.recordIds) recordIncident.set(rid, inc.id);
    const l = storeIncidents.get(inc.storeId) ?? [];
    l.push(inc);
    storeIncidents.set(inc.storeId, l);
  }
  return { records, incidents, incidentById, recordIncident, series, byKey, storeIncidents };
}

function makeIncident(cur: FeedbackRecord[], gk: string): Incident {
  const [storeId, family] = gk.split('|');
  const store = STORE_BY_ID.get(storeId)!;
  const freq = new Map<string, number>();
  cur.forEach((r) => freq.set(r.issue!, (freq.get(r.issue!) ?? 0) + 1));
  const issue = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const it = ISSUE_BY_ID.get(issue)!;
  const sevs = cur.map((r) => r.severity).sort((a, b) => a - b);
  const sev = (it.policy ? 1 : sevs[Math.min(1, sevs.length - 1)]) as Sev;
  const lastTs = cur[cur.length - 1].ts;
  const planted = cur.find((r) => r.planted)?.planted;
  const ageDays = (END_TS - lastTs) / DAY_MS;
  const h = (cur[0].n * 2654435761) >>> 0;
  let status: IncidentStatus;
  if (planted) status = planted === 'P1' ? 'acknowledged' : 'new';
  else if (ageDays > 9) status = h % 10 < 8 ? 'resolved' : 'in_progress';
  else if (ageDays > 4) status = STATUSES[h % 4];
  else status = STATUSES[h % 3];
  const quote = cur.find((r) => r.channel !== 'ticket') ?? cur[0];
  return {
    id: '', storeId, issue, family, fn: it.fn, severity: sev,
    channels: CHANNELS.filter((c) => cur.some((r) => r.channel === c)),
    count: cur.length, firstTs: cur[0].ts, lastTs, recordIds: cur.map((r) => r.id), status,
    owner: FN_BY_ID.get(it.fn)!.owner, region: store.region, districtId: store.districtId,
    title: `${it.label} · ${store.name}`, planted, topQuote: quote.text,
  };
}

/* ───────────── Layer 7 · emerging-issue detection ───────────── */
export interface DetectDay {
  day: number;
  count: number;
  mean: number;
  sd: number;
  c2Threshold: number;
  c3: number;
  c3Threshold: number;
  c2Fired: boolean;
  c3Fired: boolean;
  x3: number;
  poissonP: number;
  fired: boolean;
}
export const C3_THRESHOLD = 2;
export const P_THRESHOLD = 0.001;
export const MIN_3DAY = 5;

function poissonTail(x: number, lambda: number): number {
  if (x <= 0) return 1;
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let k = 1; k < x; k++) { term *= lambda / k; cdf += term; }
  return Math.max(1e-12, 1 - cdf);
}

export function detectSeries(s: ArrayLike<number>, channelCount3d = 2): DetectDay[] {
  const out: DetectDay[] = [];
  for (let e = 0; e < NUM_DAYS; e++) {
    const lo = Math.max(0, e - 9);
    const hi = e - 3;
    const base: number[] = [];
    for (let d = lo; d <= hi; d++) base.push(s[d]);
    const mean = base.length ? base.reduce((a, b) => a + b, 0) / base.length : 0;
    const varr = base.length > 1 ? base.reduce((a, b) => a + (b - mean) ** 2, 0) / (base.length - 1) : 0;
    const sd = Math.max(Math.sqrt(varr), 0.5);
    const c2Threshold = mean + 3 * sd;
    const x = s[e];
    let c3 = 0;
    for (let i = 0; i < 3; i++) { const v = e - i >= 0 ? s[e - i] : 0; c3 += Math.max(0, (v - mean) / sd - 1); }
    const x3 = (e >= 2 ? s[e - 2] : 0) + (e >= 1 ? s[e - 1] : 0) + x;
    const p = poissonTail(x3, Math.max(mean, 0.05) * 3);
    const c2Fired = x > c2Threshold && x >= 3;
    const c3Fired = c3 > C3_THRESHOLD && x3 >= MIN_3DAY;
    out.push({ day: e, count: x, mean, sd, c2Threshold, c3, c3Threshold: C3_THRESHOLD, c2Fired, c3Fired, x3, poissonP: p, fired: (c2Fired || c3Fired) && p < P_THRESHOLD && x3 >= MIN_3DAY && channelCount3d >= 2 });
  }
  return out;
}

export interface EmergingItem {
  id: string;
  storeId: string;
  issue: string;
  region: RegionId;
  districtId: string;
  score: number;
  firstFireDay: number;
  peakDay: number;
  series: number[];
  last3: number;
  baselineMean: number;
  c2: boolean;
  c3: boolean;
  c3Value: number;
  p: number;
  channels: Channel[];
  corroboration: { channels: number; storesInDistrict: number; severityFloor: Sev };
  scan: { llr: number; radiusKm: number; stores: string[]; centerStore: string };
  planted?: string;
  incidentId?: string;
  why: string;
}

const channelsByKey = new Map<string, Map<number, Set<Channel>>>();
function channelsFor(d: Derived, key: string): Map<number, Set<Channel>> {
  let m = channelsByKey.get(key);
  if (m) return m;
  m = new Map();
  for (const r of d.byKey.get(key) ?? []) {
    let set = m.get(r.day);
    if (!set) { set = new Set(); m.set(r.day, set); }
    set.add(r.channel);
  }
  channelsByKey.set(key, m);
  return m;
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dx = (a.lng - b.lng) * 108; const dy = (a.lat - b.lat) * 111;
  return Math.sqrt(dx * dx + dy * dy);
}

function scanCluster(d: Derived, issue: string, storeId: string, e: number) {
  const centre = STORE_BY_ID.get(storeId)!;
  let best = { llr: 0, radiusKm: 0, stores: [storeId], centerStore: storeId };
  let totalC = 0; let totalB = 0;
  for (const s of STORES) {
    const ser = d.series.get(`${s.id}|${issue}`);
    if (!ser) continue;
    for (let k = 0; k < 3; k++) totalC += ser[Math.max(0, e - k)];
    for (let k = 3; k < 10; k++) totalB += ser[Math.max(0, e - k)];
  }
  const Eall = totalB * (3 / 7);
  for (const radius of [25, 60, 120, 200]) {
    const zone = STORES.filter((s) => km(centre, s) <= radius);
    let c = 0; let b = 0;
    for (const s of zone) {
      const ser = d.series.get(`${s.id}|${issue}`);
      if (!ser) continue;
      for (let k = 0; k < 3; k++) c += ser[Math.max(0, e - k)];
      for (let k = 3; k < 10; k++) b += ser[Math.max(0, e - k)];
    }
    const E = Math.max(0.1, b * (3 / 7));
    if (c > E && totalC > 0 && Eall > 0 && totalC > c) {
      const llr = c * Math.log(c / E) + (totalC - c) * Math.log((totalC - c) / Math.max(0.1, Eall - E));
      if (llr > best.llr) best = { llr, radiusKm: radius, stores: zone.filter((s) => (d.series.get(`${s.id}|${issue}`)?.slice(e - 2, e + 1).reduce((a, x) => a + x, 0) ?? 0) > 0).map((s) => s.id).slice(0, 8), centerStore: storeId };
    } else if (c > E && totalC === c && c >= 3) {
      const llr = c * Math.log(c / E);
      if (llr > best.llr) best = { llr, radiusKm: radius, stores: [storeId], centerStore: storeId };
    }
  }
  return best;
}

const emergingCache = new Map<number, EmergingItem[]>();
export function emergingForWeek(d: Derived, week: number): EmergingItem[] {
  const cached = emergingCache.get(week);
  if (cached) return cached;
  const end = weekEnd(week);
  const items: EmergingItem[] = [];
  for (const [key, ser] of d.series) {
    let recent = 0;
    for (let k = end - 6; k <= end; k++) recent += ser[k];
    if (recent < 4) continue;
    const [storeId, issue] = key.split('|');
    const chMap = channelsFor(d, key);
    let best: { day: number; det: DetectDay; ch: number } | null = null;
    let first = -1;
    for (let e = Math.max(9, end - 6); e <= end; e++) {
      const chs = new Set<Channel>();
      for (let k = e - 2; k <= e; k++) chMap.get(k)?.forEach((c) => chs.add(c));
      const det = detectSeries(ser, chs.size)[e];
      if (det.fired) {
        if (first < 0) first = e;
        if (!best || det.poissonP < best.det.poissonP) best = { day: e, det, ch: chs.size };
      }
    }
    if (!best) continue;
    const store = STORE_BY_ID.get(storeId)!;
    const it = ISSUE_BY_ID.get(issue)!;
    const z = (best.det.count - best.det.mean) / best.det.sd;
    const score = Math.round(Math.min(100, 38 * Math.min(1, -Math.log10(best.det.poissonP) / 6) + 25 * Math.min(1, z / 8) + 20 * (best.ch / 4) + 17 * Math.min(1, recent / 20)));
    const plantedKey = PLANTED.find((p) => p.storeId === storeId && p.issue === issue)?.key;
    const channels = new Set<Channel>();
    for (let k = end - 6; k <= end; k++) chMap.get(k)?.forEach((c) => channels.add(c));
    const inc = d.storeIncidents.get(storeId)?.find((i) => i.issue === issue && i.lastTs >= DAY0 + (end - 2) * DAY_MS);
    const scan = scanCluster(d, issue, storeId, best.day);
    items.push({
      id: `EM-${storeId}-${issue}`, storeId, issue, region: store.region, districtId: store.districtId, score,
      firstFireDay: first, peakDay: best.day, series: Array.from(ser), last3: best.det.count, baselineMean: best.det.mean,
      c2: best.det.c2Fired, c3: best.det.c3Fired, c3Value: best.det.c3, p: best.det.poissonP, channels: [...channels] as Channel[],
      corroboration: { channels: best.ch, storesInDistrict: DISTRICTS.length ? (d.storeIncidents.get(storeId)?.length ?? 0) : 0, severityFloor: it.floor },
      scan, planted: plantedKey, incidentId: inc?.id,
      why: `${it.label} at ${store.code} jumped to ${best.det.count} reports on day ${best.day} against a baseline of ${best.det.mean.toFixed(1)}/day (C2 limit ${best.det.c2Threshold.toFixed(1)}). The 3-day Poisson tail probability is ${best.det.poissonP < 0.0001 ? '<0.0001' : best.det.poissonP.toFixed(4)}, and ${best.ch} channels corroborate it.`,
    });
  }
  items.sort((a, b) => b.score - a.score);
  const top = items.slice(0, 18);
  emergingCache.set(week, top);
  return top;
}

/* ───────────── aggregates ───────────── */
export function recordsInWeek(d: Derived, week: number) {
  const end = weekEnd(week);
  return d.records.filter((r) => r.day > end - 7 && r.day <= end);
}

export interface IssueAgg { issue: string; count: number; prev: number; delta: number; trend: 'up' | 'down' | 'flat'; significant: boolean; z: number }
export function aggregateIssues(d: Derived, week: number, filter: (r: FeedbackRecord) => boolean): IssueAgg[] {
  const end = weekEnd(week);
  const cur = new Map<string, number>(); const prev = new Map<string, number>();
  for (const r of d.records) {
    if (!r.issue || !filter(r)) continue;
    if (r.day > end - 7 && r.day <= end) cur.set(r.issue, (cur.get(r.issue) ?? 0) + 1);
    else if (r.day > end - 14 && r.day <= end - 7) prev.set(r.issue, (prev.get(r.issue) ?? 0) + 1);
  }
  return [...cur.entries()].map(([issue, count]) => {
    const p = prev.get(issue) ?? 0;
    const z = (count - p) / Math.sqrt(Math.max(1, count + p));
    return { issue, count, prev: p, delta: count - p, trend: (z > 1.28 ? 'up' : z < -1.28 ? 'down' : 'flat') as IssueAgg['trend'], significant: Math.abs(z) > 1.96, z };
  }).sort((a, b) => b.count * (4 - Math.min(3, ISSUE_BY_ID.get(b.issue)!.floor)) - a.count * (4 - Math.min(3, ISSUE_BY_ID.get(a.issue)!.floor)));
}

export function weeklyTotals(d: Derived) {
  const rows = WEEKS.map((w) => {
    const end = weekEnd(w);
    let records = 0; let actionable = 0; let s1 = 0;
    for (const r of d.records) if (r.day > end - 7 && r.day <= end) { records++; if (r.actionable) actionable++; if (r.severity === 1) s1++; }
    const incidents = d.incidents.filter((i) => i.lastTs >= DAY0 + (end - 6) * DAY_MS && i.firstTs < DAY0 + (end + 1) * DAY_MS).length;
    return { week: w, records, actionable, s1, incidents };
  });
  return rows;
}

export const regionOfDistrict = (id: string): RegionId => DISTRICT_BY_ID.get(id)!.region;
export const _regions = REGIONS;
export const _cw = CURRENT_WEEK;
