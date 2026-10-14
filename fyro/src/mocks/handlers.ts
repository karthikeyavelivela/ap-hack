import { http, HttpResponse, delay } from 'msw';
import { Derived, buildDerived, loadRecords, Incident, emergingForWeek, aggregateIssues, recordsInWeek, weeklyTotals, detectSeries, IncidentStatus, C3_THRESHOLD, P_THRESHOLD, MIN_3DAY } from './derived';
import { STORES, STORE_BY_ID, REGIONS, DISTRICTS, DISTRICT_BY_ID, regionName, RegionId } from './geo';
import { ISSUES, ISSUE_BY_ID, FUNCTIONS, FN_BY_ID, Sev, FnId } from './taxonomy';
import { CHANNELS, CHANNEL_LABEL, NUM_DAYS, DAY0, weekEnd, CURRENT_WEEK, WEEKS, MOCK_NOW, PLANTED, FeedbackRecord, Channel } from './recordsGen';
import { cleanText, langId, transliterate, translate, classify, severityFor, similarity, normalise, entities } from './nlp';
import * as db from './db';
import { User, Role } from './db';
import { evalSummary, wilson } from './evalStats';
import { taraBrain } from './taraBrain';

let derivedP: Promise<Derived> | null = null;
export const getDerived = () => (derivedP ??= loadRecords().then(buildDerived));

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const json = (data: unknown, init?: ResponseInit) => HttpResponse.json(data as never, init);
const err = (status: number, message: string, code?: string) => HttpResponse.json({ error: message, code }, { status });

function userFrom(req: Request): User | null {
  const h = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!h) return null;
  const uid = /^tok_(u\d+)_/.exec(h)?.[1];
  return db.USERS.find((u) => u.id === uid && u.active) ?? null;
}
const publicUser = (u: User) => { const { password, ...rest } = u; return rest; };

async function guard(req: Request, opts: { auth?: boolean; flaky?: boolean } = { auth: true, flaky: true }): Promise<{ user: User | null; fail?: Response }> {
  await delay(rand(300, 900));
  if (req.headers.get('x-fyro-fail') === '1') return { user: null, fail: err(500, 'Simulated server error (enabled in Settings → Developer)', 'SIMULATED') };
  const user = userFrom(req);
  if (opts.auth !== false && !user) return { user: null, fail: err(401, 'Session expired. Please sign in again.', 'UNAUTHENTICATED') };
  if (opts.flaky && req.method === 'GET' && Math.random() < 0.015) return { user, fail: err(503, 'Upstream temporarily unavailable', 'FLAKY') };
  return { user };
}
const open = (flaky = false) => ({ auth: false, flaky });

/* scope helpers */
const storeInScope = (u: User | null, storeId: string) => {
  if (!u) return true;
  const s = STORE_BY_ID.get(storeId)!;
  if (u.role === 'REGIONAL_MANAGER') return s.region === u.region;
  if (u.role === 'STORE_MANAGER') return s.id === u.storeId;
  return true;
};
const incScope = (u: User | null) => (i: Incident) => {
  if (!u) return true;
  if (u.role === 'FUNCTION_OWNER') return effective(i).fn === u.fn;
  return storeInScope(u, i.storeId);
};
const recScope = (u: User | null) => (r: FeedbackRecord) => storeInScope(u, r.storeId);

function effective(i: Incident) {
  const p = db.incidentPatches.get(i.id);
  return { ...i, status: p?.status ?? i.status, owner: p?.owner ?? i.owner, severity: p?.severity ?? i.severity, fn: p?.fn ?? i.fn };
}
function shouldEscalate(i: Incident & { severity: Sev }): boolean {
  const e = db.policy.escalation;
  return (e.anyS1 && i.severity === 1) || (i.channels.length >= e.minChannels && i.count >= e.minRecords && i.severity <= 2);
}
function sourceRecords(d: Derived, i: Incident) {
  return i.recordIds.map((id) => d.records[Number(id.slice(3)) - 1]);
}
function incidentSummary(d: Derived, i: Incident) {
  const e = effective(i);
  const patch = db.incidentPatches.get(i.id);
  const recs = i.recordIds;
  const fnDef = FN_BY_ID.get(e.fn)!;
  const detectedTs = d.records[Number(recs[Math.min(3, recs.length - 1)].slice(3)) - 1].ts;
  const dueTs = detectedTs + db.routing.sla[e.fn][e.severity] * 3600000;
  const store = STORE_BY_ID.get(i.storeId)!;
  return {
    id: i.id, title: i.title, storeId: i.storeId, storeName: store.name, districtName: store.districtName, region: i.region, issue: i.issue,
    issueLabel: ISSUE_BY_ID.get(i.issue)!.label, family: i.family, fn: e.fn, fnName: fnDef.name, severity: e.severity, status: e.status, owner: e.owner,
    channels: i.channels, count: i.count, firstTs: i.firstTs, lastTs: i.lastTs, dueTs, detectedTs, planted: i.planted ?? null,
    escalated: patch?.escalated ?? shouldEscalate(e), topQuote: i.topQuote,
  };
}
function storeSeries(d: Derived, storeId: string) {
  const out = new Array<number>(NUM_DAYS).fill(0);
  for (const [k, ser] of d.series) if (k.startsWith(storeId + '|')) for (let i = 0; i < NUM_DAYS; i++) out[i] += ser[i];
  return out;
}
function weekOf(url: URL) { const w = Number(url.searchParams.get('week')); return WEEKS.includes(w) ? w : CURRENT_WEEK; }

export const handlers = [
  /* ───────────── AUTH ───────────── */
  http.post('/api/auth/login', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const body = (await request.json()) as { identifier: string; password: string };
    const id = (body.identifier ?? '').trim().toLowerCase();
    const fails = db.failedLogins.get(id) ?? 0;
    if (fails >= 5) return err(429, 'Too many attempts. Try again in 15 minutes.', 'RATE_LIMIT');
    const u = db.USERS.find((x) => x.email.toLowerCase() === id || x.phone === id);
    if (!u || u.password !== body.password) { db.failedLogins.set(id, fails + 1); return err(401, `Incorrect email or password. ${4 - fails > 0 ? `${4 - fails} attempts left.` : 'Account locked.'}`, 'BAD_CREDENTIALS'); }
    if (!u.active) return err(403, 'This account has been deactivated. Contact Head Office.', 'DEACTIVATED');
    db.failedLogins.delete(id);
    const token = `tok_${u.id}_${Date.now().toString(36)}`;
    return json({ token, user: publicUser(u) });
  }),
  http.post('/api/auth/signup', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as Partial<User> & { otp?: string };
    if (!b.email || !b.password || !b.name) return err(422, 'Name, email and password are required.');
    if (db.USERS.some((u) => u.email.toLowerCase() === b.email!.toLowerCase())) return err(409, 'An account with this email already exists.');
    const u: User = { id: db.nextId('u'), name: b.name, email: b.email, phone: b.phone ?? '', password: b.password, role: (b.role as Role) ?? 'STORE_MANAGER', region: b.region, fn: b.fn, storeId: b.storeId, active: true, lastActive: new Date(MOCK_NOW).toISOString() };
    if (u.storeId && !u.region) u.region = STORE_BY_ID.get(u.storeId)?.region;
    db.USERS.push(u);
    return json({ ok: true, user: publicUser(u) }, { status: 201 });
  }),
  http.post('/api/auth/logout', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    return json({ ok: true });
  }),
  http.post('/api/auth/forgot', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    return json({ ok: true, message: 'If that account exists, a reset code was sent. Demo code: 123456' });
  }),
  http.post('/api/auth/reset', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { email?: string; code?: string; password?: string };
    if (b.code !== db.OTP_CODE) return err(422, 'That code is not valid. Demo code: 123456', 'BAD_OTP');
    const u = db.USERS.find((x) => x.email.toLowerCase() === (b.email ?? '').toLowerCase());
    if (u && b.password) { u.password = b.password; db.failedLogins.delete(u.email); }
    return json({ ok: true });
  }),
  http.post('/api/auth/verify-otp', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { code: string };
    if (b.code !== db.OTP_CODE) return err(422, 'That code is not valid. Demo code: 123456', 'BAD_OTP');
    return json({ ok: true });
  }),
  http.post('/api/auth/oauth/:provider', async ({ request, params }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const u = db.USERS[0];
    const token = `tok_${u.id}_${Date.now().toString(36)}`;
    return json({ token, user: publicUser(u), provider: params.provider });
  }),
  http.get('/api/auth/me', async ({ request }) => {
    const g = await guard(request, { auth: true }); if (g.fail) return g.fail;
    return json({ user: publicUser(g.user!) });
  }),
  http.post('/api/auth/refresh', async ({ request }) => {
    const g = await guard(request, { auth: true }); if (g.fail) return g.fail;
    const token = `tok_${g.user!.id}_${Date.now().toString(36)}`;
    return json({ token });
  }),

  /* ───────────── META ───────────── */
  http.get('/api/regions', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const d = await getDerived();
    const recs = recordsInWeek(d, CURRENT_WEEK);
    return json(REGIONS.map((r) => ({
      ...r, stores: STORES.filter((s) => s.region === r.id).length,
      records: recs.filter((x) => STORE_BY_ID.get(x.storeId)!.region === r.id).length,
      incidents: d.incidents.filter((i) => i.region === r.id && i.lastTs > DAY0 + 35 * 86400000).length,
      districtNames: r.districts.map((id) => DISTRICT_BY_ID.get(id)!.name),
    })));
  }),
  http.get('/api/districts', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    return json(DISTRICTS.map((x) => ({ ...x, regionName: regionName(x.region) })));
  }),
  http.get('/api/stores', async ({ request }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const u = userFrom(request);
    const url = new URL(request.url);
    const region = url.searchParams.get('region'); const district = url.searchParams.get('district'); const format = url.searchParams.get('format'); const q = url.searchParams.get('q')?.toLowerCase();
    const d = await getDerived();
    const list = STORES.filter((s) => storeInScope(u, s.id) && (!region || s.region === region) && (!district || s.districtId === district) && (!format || s.format === format) && (!q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.districtName.toLowerCase().includes(q)));
    const recs = recordsInWeek(d, CURRENT_WEEK);
    const counts = new Map<string, number>();
    for (const r of recs) if (r.issue) counts.set(r.storeId, (counts.get(r.storeId) ?? 0) + 1);
    return json(list.map((s) => ({ ...s, weekIssues: counts.get(s.id) ?? 0, ratePer1k: ((counts.get(s.id) ?? 0) / (s.weeklyTx / 1000)) })));
  }),
  http.get('/api/stores/:id', async ({ request, params }) => {
    const g = await guard(request, { auth: true, flaky: true }); if (g.fail) return g.fail;
    const s = STORE_BY_ID.get(params.id as string);
    if (!s) return err(404, 'Store not found');
    if (!storeInScope(g.user, s.id)) return err(403, 'You do not have access to this store.', 'FORBIDDEN');
    const d = await getDerived();
    const recs = recordsInWeek(d, CURRENT_WEEK);
    const mine = recs.filter((r) => r.storeId === s.id);
    const dist = recs.filter((r) => STORE_BY_ID.get(r.storeId)!.districtId === s.districtId && r.issue);
    const distTx = STORES.filter((x) => x.districtId === s.districtId).reduce((a, x) => a + x.weeklyTx, 0);
    const distRate = dist.length / (distTx / 1000);
    const byIssue = new Map<string, number>();
    mine.forEach((r) => r.issue && byIssue.set(r.issue, (byIssue.get(r.issue) ?? 0) + 1));
    const distByIssue = new Map<string, number>();
    dist.forEach((r) => distByIssue.set(r.issue!, (distByIssue.get(r.issue!) ?? 0) + 1));
    const rates = [...byIssue.entries()].map(([issue, n]) => {
      const dm = (distByIssue.get(issue) ?? 0) / (distTx / 1000);
      const nm = normalise(n, s.weeklyTx, dm);
      return { issue, label: ISSUE_BY_ID.get(issue)!.label, count: n, raw: nm.raw, shrunk: nm.shrunk, district: dm };
    }).sort((a, b) => b.count - a.count).slice(0, 8);
    const chMix = CHANNELS.map((c) => ({ channel: c, label: CHANNEL_LABEL[c], count: mine.filter((r) => r.channel === c).length }));
    const incidents = (d.storeIncidents.get(s.id) ?? []).map((i) => incidentSummary(d, i)).slice(0, 12);
    const issuesWeek = mine.filter((r) => r.issue).length;
    const health = Math.max(38, Math.round(100 - (issuesWeek / (s.weeklyTx / 1000)) * 9 - incidents.filter((i) => i.status !== 'resolved' && i.severity === 1).length * 8));
    return json({
      store: s, rates, channelMix: chMix, incidents, districtRate: distRate, health,
      storeRate: issuesWeek / (s.weeklyTx / 1000), issuesWeek, staffNotes: db.staffNotes.filter((n) => n.storeId === s.id).slice(-5).reverse(),
      series: storeSeries(d, s.id),
    });
  }),
  http.get('/api/taxonomy', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    return json(ISSUES.map((i) => ({ id: i.id, label: i.label, fn: db.routing.issueOwner[i.id], defaultFn: i.fn, floor: db.policy.severityFloors[i.id], family: i.family, policy: i.policy })));
  }),
  http.put('/api/taxonomy/:id', async ({ request, params }) => {
    const g = await guard(request, { auth: true }); if (g.fail) return g.fail;
    if (g.user!.role !== 'HEAD_OFFICE') return err(403, 'Only Head Office can edit the taxonomy.', 'FORBIDDEN');
    const b = (await request.json()) as { floor?: Sev; fn?: FnId };
    const id = params.id as string;
    if (b.floor) db.policy.severityFloors[id] = b.floor;
    if (b.fn) db.routing.issueOwner[id] = b.fn;
    return json({ ok: true });
  }),
  http.get('/api/functions', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    return json(FUNCTIONS.map((f) => ({ ...f, slaHours: db.routing.sla[f.id] })));
  }),

  /* ───────────── PUBLIC STATS ───────────── */
  http.get('/api/public/stats', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const d = await getDerived();
    const ev = evalSummary(d);
    return json({
      records: d.records.length, incidents: d.incidents.length, avgLeadDays: ev.leadTime.reduce((a, l) => a + l.leadDays, 0) / ev.leadTime.length,
      stores: STORES.length, districts: DISTRICTS.length, languages: 5,
      pins: STORES.filter((s) => s.code.endsWith('-01') || s.code.endsWith('-07')).map((s) => ({ id: s.id, lon: s.lng, lat: s.lat, region: s.region })),
    });
  }),

  /* ───────────── FEEDBACK ───────────── */
  http.get('/api/feedback', async ({ request }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const d = await getDerived();
    const p = new URL(request.url).searchParams;
    const channel = p.get('channel'); const lang = p.get('lang'); const store = p.get('store'); const district = p.get('district'); const region = p.get('region');
    const issue = p.get('issue'); const sev = p.get('severity'); const actionable = p.get('actionable'); const q = p.get('q')?.toLowerCase(); const from = p.get('from'); const to = p.get('to');
    const scope = recScope(g.user);
    const out: FeedbackRecord[] = [];
    for (let i = d.records.length - 1; i >= 0; i--) {
      const r = d.records[i];
      if (channel && r.channel !== channel) continue;
      if (lang && r.lang !== lang) continue;
      if (store && r.storeId !== store) continue;
      if (issue && r.issue !== issue) continue;
      if (sev && r.severity !== Number(sev)) continue;
      if (actionable === 'true' && !r.actionable) continue;
      if (actionable === 'false' && r.actionable) continue;
      if (from && r.day < Number(from)) continue;
      if (to && r.day > Number(to)) continue;
      if (!scope(r)) continue;
      if (region || district) { const s = STORE_BY_ID.get(r.storeId)!; if (region && s.region !== region) continue; if (district && s.districtId !== district) continue; }
      if (q && !(r.text.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.storeId.toLowerCase().includes(q))) continue;
      out.push(r);
    }
    out.sort((a, b) => b.ts - a.ts);
    const limit = Math.min(200, Number(p.get('limit') ?? 50));
    const cursor = Number(p.get('cursor') ?? 0);
    const page = out.slice(cursor, cursor + limit);
    return json({ items: page.map((r) => ({ ...r, incidentId: d.recordIncident.get(r.id) ?? null })), total: out.length, nextCursor: cursor + limit < out.length ? cursor + limit : null });
  }),
  http.get('/api/feedback/:id', async ({ request, params }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const n = Number((params.id as string).slice(3));
    const r = d.records[n - 1];
    if (!r) return err(404, 'Record not found');
    if (!storeInScope(g.user, r.storeId)) return err(403, 'You do not have access to this record.', 'FORBIDDEN');
    const cleaned = cleanText(r.text, r.channel);
    const li = langId(cleaned.cleaned);
    const tr = transliterate(cleaned.cleaned);
    const cls = classify(cleaned.cleaned);
    const inc = d.recordIncident.get(r.id);
    return json({
      record: r, store: STORE_BY_ID.get(r.storeId), cleaned, tokens: tr.tokens, mix: li.mix, native: tr.native,
      translation: r.gloss, machineTranslation: translate(cleaned.cleaned), classification: cls, severity: severityFor(r.issue, r.text),
      incidentId: inc ?? null, incident: inc ? incidentSummary(d, d.incidentById.get(inc)!) : null,
    });
  }),
  http.post('/api/feedback/staff-note', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const b = (await request.json()) as { storeId?: string; text: string };
    if (!b.text || b.text.trim().length < 5) return err(422, 'Please write at least a few words.');
    const storeId = b.storeId ?? g.user!.storeId ?? 'ATP-07';
    const note = { id: db.nextId('sn'), storeId, text: b.text.trim(), author: g.user!.name, ts: MOCK_NOW };
    db.staffNotes.push(note);
    const cls = classify(b.text);
    return json({ ok: true, note, classification: { issue: cls.issue, label: cls.issue ? ISSUE_BY_ID.get(cls.issue)!.label : null, confidence: cls.confidence } }, { status: 201 });
  }),

  /* ───────────── PIPELINE DEMOS (open) ───────────── */
  http.post('/api/pipeline/clean', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { text: string; channel?: string };
    return json(cleanText(b.text ?? '', b.channel));
  }),
  http.post('/api/pipeline/langid', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { text: string };
    return json(langId(cleanText(b.text ?? '').cleaned));
  }),
  http.post('/api/pipeline/transliterate', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { text: string };
    const c = cleanText(b.text ?? '').cleaned;
    const t = transliterate(c);
    return json({ ...t, translation: translate(c), mix: langId(c).mix });
  }),
  http.post('/api/pipeline/classify', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { text: string };
    const c = classify(cleanText(b.text ?? '').cleaned);
    return json({ ...c, scores: c.scores.slice(0, 30).map((s) => ({ ...s, label: ISSUE_BY_ID.get(s.id)!.label, fn: ISSUE_BY_ID.get(s.id)!.fn })), segments: c.segments.map((s) => ({ ...s, label: s.issue ? ISSUE_BY_ID.get(s.issue)!.label : null })) });
  }),
  http.post('/api/pipeline/severity', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { issue?: string; text?: string; forced?: Record<string, boolean>; modelSeverity?: Sev };
    const r = severityFor(b.issue ?? null, b.text ?? '', b.forced as never);
    if (b.modelSeverity && b.issue) {
      const it = ISSUE_BY_ID.get(b.issue)!;
      const active = it.policy && (b.forced?.[it.policy] ?? true);
      const floor = (active ? 1 : it.floor) as Sev;
      return json({ ...r, modelSeverity: b.modelSeverity, floor, severity: Math.min(floor, b.modelSeverity), forced: !!active && b.modelSeverity > 1 });
    }
    return json(r);
  }),
  http.post('/api/pipeline/dedup', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { records: { id: string; channel: string; text: string; storeId: string; ts: number }[] };
    const recs = b.records ?? [];
    const matrix = recs.map((a) => recs.map((c) => (a.id === c.id ? { score: 1, blocked: false, reasons: [] as string[] } : similarity(a, c))));
    const parent = recs.map((_, i) => i);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    matrix.forEach((row, i) => row.forEach((c, j) => { if (i < j && !c.blocked && c.score >= 0.45) parent[find(j)] = find(i); }));
    const clusters = new Map<number, string[]>();
    recs.forEach((r, i) => { const k = find(i); clusters.set(k, [...(clusters.get(k) ?? []), r.id]); });
    return json({ matrix, clusters: [...clusters.values()], entities: recs.map((r) => ({ id: r.id, ...entities(r.text) })) });
  }),
  http.post('/api/pipeline/normalise', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { count: number; tx: number; districtMean: number; m?: number };
    return json(normalise(b.count, b.tx, b.districtMean, b.m ?? 8));
  }),
  http.get('/api/pipeline/status', async ({ request }) => {
    const g = await guard(request, { auth: true }); if (g.fail) return g.fail;
    const d = await getDerived();
    return json({
      layers: [
        { id: 1, name: 'Channel Cleaning', throughput: 1840, latencyMs: 0.8, health: 'healthy' }, { id: 2, name: 'Language ID', throughput: 1790, latencyMs: 3.1, health: 'healthy' },
        { id: 3, name: 'Hybrid Classifier', throughput: 1650, latencyMs: 24, health: 'healthy' }, { id: 4, name: 'Severity Policy', throughput: 1650, latencyMs: 1.2, health: 'healthy' },
        { id: 5, name: 'De-duplication', throughput: 1580, latencyMs: 9, health: 'healthy' }, { id: 6, name: 'Normalisation', throughput: 1580, latencyMs: 0.4, health: 'healthy' },
        { id: 7, name: 'Emerging Radar', throughput: 1580, latencyMs: 41, health: 'healthy' }, { id: 8, name: 'Routing', throughput: 1580, latencyMs: 2, health: 'degraded' },
        { id: 9, name: 'Weekly Brief', throughput: 3, latencyMs: 4200, health: 'healthy' }, { id: 10, name: 'Evaluate', throughput: 1, latencyMs: 9100, health: 'healthy' },
      ],
      drift: Array.from({ length: 10 }, (_, i) => ({ week: 32 + i, psi: Math.round((0.04 + Math.abs(Math.sin(i * 1.3)) * 0.07 + (i > 7 ? 0.03 : 0)) * 1000) / 1000 })),
      records: d.records.length,
    });
  }),

  /* ───────────── INCIDENTS ───────────── */
  http.get('/api/incidents', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const p = new URL(request.url).searchParams;
    const status = p.get('status'); const sev = p.get('severity'); const region = p.get('region'); const fn = p.get('fn'); const store = p.get('store'); const q = p.get('q')?.toLowerCase();
    const sort = p.get('sort') ?? 'severity'; const channel = p.get('channel'); const issue = p.get('issue');
    const week = p.get('week') ? Number(p.get('week')) : null;
    const scope = incScope(g.user);
    let list = d.incidents.filter((i) => scope(i)).map((i) => ({ i, e: effective(i) }));
    list = list.filter(({ i, e }) => (!status || e.status === status) && (!sev || e.severity === Number(sev)) && (!region || i.region === region) && (!fn || e.fn === fn) && (!store || i.storeId === store) && (!issue || i.issue === issue) && (!channel || i.channels.includes(channel as Channel)) &&
      (!q || i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q) || i.storeId.toLowerCase().includes(q)) && (!week || (i.lastTs >= DAY0 + (weekEnd(week) - 6) * 86400000 && i.firstTs < DAY0 + (weekEnd(week) + 1) * 86400000)));
    const mapped = list.map(({ i }) => incidentSummary(d, i));
    mapped.sort((a, b) => sort === 'recent' ? b.lastTs - a.lastTs : sort === 'count' ? b.count - a.count : sort === 'due' ? a.dueTs - b.dueTs : (a.planted ? 0 : 1) - (b.planted ? 0 : 1) || a.severity - b.severity || b.lastTs - a.lastTs);
    const page = Number(p.get('page') ?? 1); const size = Math.min(500, Number(p.get('pageSize') ?? 25));
    const counts = { new: 0, acknowledged: 0, in_progress: 0, resolved: 0 } as Record<IncidentStatus, number>;
    mapped.forEach((m) => counts[m.status]++);
    return json({ items: mapped.slice((page - 1) * size, page * size), total: mapped.length, page, pageSize: size, counts });
  }),
  http.get('/api/incidents/:id', async ({ request, params }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const i = d.incidentById.get(params.id as string);
    if (!i) return err(404, 'Incident not found');
    if (!incScope(g.user)(i)) return err(403, 'This incident is outside your scope.', 'FORBIDDEN');
    const recs = sourceRecords(d, i);
    const series = Array.from({ length: 10 }, (_, k) => { const day = Math.floor((i.lastTs - DAY0) / 86400000) - 9 + k; return { day, count: recs.filter((r) => r.day === day).length }; });
    return json({
      incident: incidentSummary(d, i), records: recs.slice(-80).reverse(), totalRecords: recs.length, series,
      byChannel: CHANNELS.map((c) => ({ channel: c, label: CHANNEL_LABEL[c], count: recs.filter((r) => r.channel === c).length })),
      evidence: CHANNELS.map((c) => recs.filter((r) => r.channel === c).slice(-1)[0]).filter(Boolean).map((r) => ({ id: r.id, channel: r.channel, text: r.text, gloss: r.gloss, ts: r.ts })),
      comments: db.comments.filter((c) => c.incidentId === i.id),
      activity: [
        { id: 'a0', incidentId: i.id, actor: 'FYRO Radar', action: `Incident created from ${i.count} source records across ${i.channels.length} channels`, ts: recs[Math.min(3, recs.length - 1)].ts },
        { id: 'a1', incidentId: i.id, actor: 'FYRO Routing', action: `Routed to ${FN_BY_ID.get(effective(i).fn)!.name} with severity S${effective(i).severity}`, ts: recs[Math.min(3, recs.length - 1)].ts + 120000 },
        ...db.activities.filter((a) => a.incidentId === i.id),
      ].sort((a, b) => b.ts - a.ts),
      emergingId: `EM-${i.storeId}-${i.issue}`,
    });
  }),
  http.patch('/api/incidents/:id', async ({ request, params }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const i = d.incidentById.get(params.id as string);
    if (!i) return err(404, 'Incident not found');
    if (g.user!.role === 'ANALYST') return err(403, 'Analysts have read-only access.', 'FORBIDDEN');
    const b = (await request.json()) as { status?: IncidentStatus; owner?: string; severity?: Sev; fn?: FnId };
    const prev = db.incidentPatches.get(i.id) ?? {};
    db.incidentPatches.set(i.id, { ...prev, ...b, ...(b.status === 'resolved' ? { resolvedAt: MOCK_NOW } : {}) });
    const bits = Object.entries(b).map(([k, v]) => `${k} → ${v}`).join(', ');
    db.activities.push({ id: db.nextId('ac'), incidentId: i.id, actor: g.user!.name, action: `Updated ${bits}`, ts: MOCK_NOW + db.activities.length * 60000 });
    return json({ incident: incidentSummary(d, i) });
  }),
  http.post('/api/incidents/:id/comments', async ({ request, params }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const b = (await request.json()) as { text: string };
    if (!b.text?.trim()) return err(422, 'Write a comment first.');
    const c = { id: db.nextId('c'), incidentId: params.id as string, author: g.user!.name, role: g.user!.role, text: b.text.trim(), ts: MOCK_NOW + db.comments.length * 60000 };
    db.comments.push(c);
    return json(c, { status: 201 });
  }),
  http.post('/api/incidents/:id/escalate', async ({ request, params }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const id = params.id as string;
    const prev = db.incidentPatches.get(id) ?? {};
    db.incidentPatches.set(id, { ...prev, escalated: true, escalatedAt: MOCK_NOW });
    db.activities.push({ id: db.nextId('ac'), incidentId: id, actor: g.user!.name, action: 'Escalated to Head Office', ts: MOCK_NOW + db.activities.length * 60000 });
    db.notifications.unshift({ id: db.nextId('n'), kind: 'escalation', title: `Escalated · ${id}`, body: `${g.user!.name} escalated this incident to Head Office.`, ts: MOCK_NOW, read: false, link: `/app/incidents/${id}`, roles: ['HEAD_OFFICE'] });
    return json({ ok: true });
  }),
  http.post('/api/incidents/:id/resolve', async ({ request, params }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const id = params.id as string;
    const prev = db.incidentPatches.get(id) ?? {};
    db.incidentPatches.set(id, { ...prev, status: 'resolved', resolvedAt: MOCK_NOW });
    db.activities.push({ id: db.nextId('ac'), incidentId: id, actor: g.user!.name, action: 'Marked resolved', ts: MOCK_NOW + db.activities.length * 60000 });
    return json({ ok: true });
  }),

  /* ───────────── EMERGING ───────────── */
  http.get('/api/emerging', async ({ request }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const d = await getDerived();
    const w = weekOf(new URL(request.url));
    const items = emergingForWeek(d, w).filter((e) => storeInScope(g.user, e.storeId) && (g.user?.role !== 'FUNCTION_OWNER' || db.routing.issueOwner[e.issue] === g.user.fn));
    return json({ week: w, items: items.map((e) => ({ ...e, issueLabel: ISSUE_BY_ID.get(e.issue)!.label, fn: db.routing.issueOwner[e.issue], storeName: STORE_BY_ID.get(e.storeId)!.name })), gates: { c3: C3_THRESHOLD, p: P_THRESHOLD, minVolume: MIN_3DAY, minChannels: 2 } });
  }),
  http.get('/api/emerging/replay', async ({ request }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const d = await getDerived();
    const p = new URL(request.url).searchParams;
    const storeId = p.get('storeId') ?? 'ATP-07'; const issue = p.get('issue') ?? 'freezer_failure';
    const ser = d.series.get(`${storeId}|${issue}`) ?? new Uint16Array(NUM_DAYS);
    const chByDay = new Map<number, Set<string>>();
    for (const r of d.byKey.get(`${storeId}|${issue}`) ?? []) { const s = chByDay.get(r.day) ?? new Set(); s.add(r.channel); chByDay.set(r.day, s); }
    const days = detectSeries(ser, 3).map((x) => {
      const chs = new Set<string>(); for (let k = x.day - 2; k <= x.day; k++) chByDay.get(k)?.forEach((c) => chs.add(c));
      return { ...x, channels: chs.size, fired: x.fired && chs.size >= 2 };
    });
    const store = STORE_BY_ID.get(storeId);
    return json({ storeId, issue, issueLabel: ISSUE_BY_ID.get(issue)?.label ?? issue, storeName: store?.name, days, dates: Array.from({ length: NUM_DAYS }, (_, k) => new Date(DAY0 + k * 86400000).toISOString().slice(0, 10)), gates: { c3: C3_THRESHOLD, p: P_THRESHOLD, minVolume: MIN_3DAY } });
  }),
  http.get('/api/emerging/:id', async ({ request, params }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const d = await getDerived();
    for (const w of [CURRENT_WEEK, 40, 39]) {
      const it = emergingForWeek(d, w).find((e) => e.id === params.id);
      if (it) return json({ ...it, issueLabel: ISSUE_BY_ID.get(it.issue)!.label, storeName: STORE_BY_ID.get(it.storeId)!.name });
    }
    return err(404, 'Not currently flagged');
  }),

  /* ───────────── BRIEFS ───────────── */
  http.get('/api/briefs', async ({ request }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const d = await getDerived();
    const p = new URL(request.url).searchParams;
    const w = weekOf(new URL(request.url));
    const regions = (p.get('region') ? [p.get('region')] : REGIONS.map((r) => r.id)) as RegionId[];
    return json(regions.map((r) => buildBrief(d, r, w)));
  }),
  http.get('/api/briefs/:region/:week', async ({ request, params }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const d = await getDerived();
    const r = params.region as RegionId;
    if (!REGIONS.some((x) => x.id === r)) return err(404, 'Unknown region');
    const w = Number(params.week);
    if (!WEEKS.includes(w)) return err(404, 'Brief not available for that week');
    if (g.user?.role === 'REGIONAL_MANAGER' && g.user.region !== r) return err(403, 'This brief belongs to another region.', 'FORBIDDEN');
    return json(buildBrief(d, r, w));
  }),

  /* ───────────── ROUTING ───────────── */
  http.get('/api/routing/rules', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    return json({ issueOwner: db.routing.issueOwner, sla: db.routing.sla, escalation: db.policy.escalation, functions: FUNCTIONS });
  }),
  http.put('/api/routing/rules', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    if (g.user!.role !== 'HEAD_OFFICE') return err(403, 'Only Head Office can edit routing rules.', 'FORBIDDEN');
    const b = (await request.json()) as Partial<{ issueOwner: Record<string, FnId>; sla: typeof db.routing.sla }>;
    if (b.issueOwner) Object.assign(db.routing.issueOwner, b.issueOwner);
    if (b.sla) for (const k of Object.keys(b.sla) as FnId[]) Object.assign(db.routing.sla[k], b.sla[k]);
    return json({ ok: true, issueOwner: db.routing.issueOwner, sla: db.routing.sla });
  }),
  http.get('/api/routing/queue', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const fn = (new URL(request.url).searchParams.get('function') ?? g.user?.fn ?? 'store_ops') as FnId;
    const items = d.incidents.filter((i) => effective(i).fn === fn && effective(i).status !== 'resolved' && i.lastTs > Date.UTC(2026, 8, 28)).map((i) => incidentSummary(d, i)).sort((a, b) => a.severity - b.severity || a.dueTs - b.dueTs);
    const all = d.incidents.filter((i) => effective(i).fn === fn && i.lastTs > Date.UTC(2026, 8, 28)).map((i) => incidentSummary(d, i));
    const resolvedTrend = WEEKS.map((w) => ({ week: w, resolved: all.filter((i) => i.status === 'resolved' && i.lastTs <= DAY0 + (weekEnd(w) + 1) * 86400000 && i.lastTs > DAY0 + (weekEnd(w) - 6) * 86400000).length, opened: all.filter((i) => i.firstTs <= DAY0 + (weekEnd(w) + 1) * 86400000 && i.firstTs > DAY0 + (weekEnd(w) - 6) * 86400000).length }));
    return json({ function: fn, items: items.slice(0, 60), total: items.length, breached: items.filter((i) => i.dueTs < MOCK_NOW).length, resolvedTrend, severityMix: [1, 2, 3, 4].map((s) => ({ severity: s, count: items.filter((i) => i.severity === s).length })) });
  }),

  /* ───────────── POLICY ───────────── */
  http.get('/api/policy', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    return json(db.policy);
  }),
  http.put('/api/policy', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    if (g.user!.role !== 'HEAD_OFFICE') return err(403, 'Only Head Office can edit policy.', 'FORBIDDEN');
    const b = (await request.json()) as Partial<typeof db.policy>;
    if (b.forced) Object.assign(db.policy.forced, b.forced);
    if (b.escalation) Object.assign(db.policy.escalation, b.escalation);
    return json(db.policy);
  }),
  http.post('/api/policy/preview', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const b = (await request.json()) as { escalation?: typeof db.policy.escalation; forced?: typeof db.policy.forced };
    const e = { ...db.policy.escalation, ...b.escalation };
    const forced = { ...db.policy.forced, ...b.forced };
    const week = d.incidents.filter((i) => i.lastTs > DAY0 + 35 * 86400000);
    const count = (esc: typeof e, fo: typeof forced) => week.filter((i) => {
      const it = ISSUE_BY_ID.get(i.issue)!;
      const sev = it.policy && fo[it.policy] ? 1 : Math.min(i.severity, 4);
      return (esc.anyS1 && sev === 1) || (i.channels.length >= esc.minChannels && i.count >= esc.minRecords && sev <= 2);
    });
    const would = count(e, forced);
    const now = count(db.policy.escalation, db.policy.forced);
    return json({ total: week.length, current: now.length, preview: would.length, delta: would.length - now.length, sample: would.slice(0, 6).map((i) => incidentSummary(d, i)) });
  }),

  /* ───────────── EVALUATION ───────────── */
  http.get('/api/eval/summary', async ({ request }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const e = evalSummary(await getDerived());
    return json({ metrics: e.metrics, perClass: e.perClass, sevPer: e.sevPer, bySeverity: e.bySeverity, weekly: e.weekly });
  }),
  http.get('/api/eval/lead-time', async ({ request }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const e = evalSummary(await getDerived());
    return json({ planted: e.leadTime, sweep: e.sweep });
  }),
  http.get('/api/eval/precision', async ({ request }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const e = evalSummary(await getDerived());
    return json({ precision: e.precision, bySeverity: e.bySeverity, weekly: e.weekly.map((w) => ({ ...w, ...wilson(w.k, w.n) })) });
  }),
  http.get('/api/eval/confusion', async ({ request }) => {
    const g = await guard(request, { auth: false, flaky: true }); if (g.fail) return g.fail;
    const e = evalSummary(await getDerived());
    return json({ severity: { labels: ['S1', 'S2', 'S3', 'S4'], matrix: e.sevMatrix }, function: { labels: FUNCTIONS.map((f) => f.name), matrix: e.fnMatrix } });
  }),

  /* ───────────── ANALYTICS ───────────── */
  http.get('/api/analytics/kpis', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const w = weekOf(new URL(request.url));
    const scope = recScope(g.user);
    const cur = recordsInWeek(d, w).filter(scope);
    const prev = w > 37 ? recordsInWeek(d, w - 1).filter(scope) : cur;
    const inWeek = (wk: number) => d.incidents.filter((i) => incScope(g.user)(i) && i.lastTs >= DAY0 + (weekEnd(wk) - 6) * 86400000 && i.firstTs < DAY0 + (weekEnd(wk) + 1) * 86400000);
    const incs = inWeek(w); const incsPrev = w > 37 ? inWeek(w - 1) : incs;
    const esc = incs.filter((i) => shouldEscalate(effective(i)));
    const ev = evalSummary(d);
    const lead = ev.leadTime.reduce((a, l) => a + l.leadDays, 0) / ev.leadTime.length;
    const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : 0);
    return json({
      week: w,
      records: { value: cur.length, delta: delta(cur.length, prev.length) },
      incidents: { value: incs.length, delta: delta(incs.length, incsPrev.length) },
      escalations: { value: esc.length, delta: delta(esc.length, Math.max(1, incsPrev.filter((i) => shouldEscalate(effective(i))).length)) },
      precision: { value: Math.round(ev.precision.p * 1000) / 10, delta: 2.1, lo: ev.precision.lo, hi: ev.precision.hi },
      leadTime: { value: Math.round(lead * 10) / 10, delta: 0.4 },
      s1: { value: cur.filter((r) => r.severity === 1).length },
      actionable: { value: cur.filter((r) => r.actionable).length },
    });
  }),
  http.get('/api/analytics/trends', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const scope = recScope(g.user);
    const daily = Array.from({ length: NUM_DAYS }, (_, day) => ({ day, date: new Date(DAY0 + day * 86400000).toISOString().slice(5, 10), review: 0, app: 0, whatsapp: 0, ticket: 0, issues: 0 }));
    for (const r of d.records) if (scope(r)) { const row = daily[r.day]; row[r.channel]++; if (r.issue) row.issues++; }
    const w = weekOf(new URL(request.url));
    const top = aggregateIssues(d, w, scope).slice(0, 8).map((a) => ({ ...a, label: ISSUE_BY_ID.get(a.issue)!.label, fn: ISSUE_BY_ID.get(a.issue)!.fn }));
    const fnLoad = FUNCTIONS.map((f) => ({ fn: f.id, name: f.name, open: d.incidents.filter((i) => effective(i).fn === f.id && effective(i).status !== 'resolved' && i.lastTs > Date.UTC(2026, 9, 1) && incScope(g.user)(i)).length }));
    const sevMix = [1, 2, 3, 4].map((s) => ({ severity: s, count: recordsInWeek(d, w).filter(scope).filter((r) => r.severity === s && r.actionable).length }));
    const langMix = (['te', 'en', 'hi', 'ta', 'mr'] as const).map((l) => ({ lang: l, count: recordsInWeek(d, w).filter(scope).filter((r) => r.lang === l).length }));
    return json({ daily, weekly: weeklyTotals(d), top, fnLoad, sevMix, langMix });
  }),
  http.get('/api/analytics/map', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const p = new URL(request.url).searchParams;
    const issue = p.get('issue'); const w = weekOf(new URL(request.url));
    const scope = recScope(g.user);
    const recs = recordsInWeek(d, w).filter((r) => r.issue && scope(r) && (!issue || r.issue === issue));
    const byStore = new Map<string, number>(); const bySev1 = new Map<string, number>();
    recs.forEach((r) => { byStore.set(r.storeId, (byStore.get(r.storeId) ?? 0) + 1); if (r.severity === 1) bySev1.set(r.storeId, (bySev1.get(r.storeId) ?? 0) + 1); });
    const emerging = new Set(emergingForWeek(d, w).map((e) => e.storeId));
    const stores = STORES.filter((s) => storeInScope(g.user, s.id)).map((s) => ({ id: s.id, name: s.name, districtId: s.districtId, region: s.region, lat: s.lat, lng: s.lng, format: s.format, count: byStore.get(s.id) ?? 0, s1: bySev1.get(s.id) ?? 0, rate: (byStore.get(s.id) ?? 0) / (s.weeklyTx / 1000), emerging: emerging.has(s.id) }));
    const districts = DISTRICTS.map((x) => {
      const ss = stores.filter((s) => s.districtId === x.id); const tx = STORES.filter((s) => s.districtId === x.id).reduce((a, s) => a + s.weeklyTx, 0);
      const c = ss.reduce((a, s) => a + s.count, 0);
      return { id: x.id, name: x.name, region: x.region, stores: ss.length, count: c, s1: ss.reduce((a, s) => a + s.s1, 0), rate: tx ? c / (tx / 1000) : 0, emerging: ss.filter((s) => s.emerging).length };
    });
    const regions = REGIONS.map((r) => { const ds = districts.filter((x) => x.region === r.id); const tx = STORES.filter((s) => s.region === r.id).reduce((a, s) => a + s.weeklyTx, 0); const c = ds.reduce((a, x) => a + x.count, 0); return { id: r.id, name: r.name, count: c, s1: ds.reduce((a, x) => a + x.s1, 0), rate: c / (tx / 1000), stores: ds.reduce((a, x) => a + x.stores, 0), emerging: ds.reduce((a, x) => a + x.emerging, 0) }; });
    return json({ week: w, issue, regions, districts, stores });
  }),
  http.get('/api/analytics/explorer', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const d = await getDerived();
    const p = new URL(request.url).searchParams;
    const by = p.get('by') ?? 'issue'; const metric = p.get('metric') ?? 'count'; const w = p.get('week') ? weekOf(new URL(request.url)) : null;
    const scope = recScope(g.user);
    const rows = new Map<string, { key: string; label: string; count: number; s1: number; actionable: number; tx: number }>();
    const stores = new Set<string>();
    for (const r of d.records) {
      if (!scope(r)) continue;
      if (w && !(r.day > weekEnd(w) - 7 && r.day <= weekEnd(w))) continue;
      const s = STORE_BY_ID.get(r.storeId)!;
      let key: string; let label: string;
      switch (by) {
        case 'region': key = s.region; label = regionName(s.region); break;
        case 'district': key = s.districtId; label = s.districtName; break;
        case 'store': key = s.id; label = `${s.code} ${s.name}`; break;
        case 'channel': key = r.channel; label = CHANNEL_LABEL[r.channel]; break;
        case 'language': key = r.lang; label = r.lang.toUpperCase(); break;
        case 'function': key = r.issue ? ISSUE_BY_ID.get(r.issue)!.fn : 'none'; label = r.issue ? FN_BY_ID.get(ISSUE_BY_ID.get(r.issue)!.fn)!.name : 'No issue'; break;
        case 'severity': key = `S${r.severity}`; label = `S${r.severity}`; break;
        case 'day': key = String(r.day).padStart(2, '0'); label = new Date(DAY0 + r.day * 86400000).toISOString().slice(5, 10); break;
        case 'format': key = s.format; label = s.format; break;
        default: key = r.issue ?? 'none'; label = r.issue ? ISSUE_BY_ID.get(r.issue)!.label : 'No issue (praise / non-actionable)';
      }
      let row = rows.get(key);
      if (!row) { row = { key, label, count: 0, s1: 0, actionable: 0, tx: 0 }; rows.set(key, row); }
      row.count++; if (r.severity === 1 && r.actionable) row.s1++; if (r.actionable) row.actionable++;
      if (!stores.has(`${key}|${s.id}`)) { stores.add(`${key}|${s.id}`); row.tx += s.weeklyTx; }
    }
    const out = [...rows.values()].map((r) => ({ ...r, rate: r.tx ? (r.actionable / (r.tx / 1000)) : 0 })).sort((a, b) => (by === 'day' ? a.key.localeCompare(b.key) : (metric === 'rate' ? b.rate - a.rate : b.count - a.count)));
    return json({ by, metric, rows: out.slice(0, 60), total: out.length });
  }),

  /* ───────────── USERS ───────────── */
  http.get('/api/users', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    if (g.user!.role !== 'HEAD_OFFICE') return err(403, 'Only Head Office can manage users.', 'FORBIDDEN');
    return json(db.USERS.map(publicUser));
  }),
  http.post('/api/users', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    if (g.user!.role !== 'HEAD_OFFICE') return err(403, 'Only Head Office can invite users.', 'FORBIDDEN');
    const b = (await request.json()) as Partial<User>;
    if (!b.email || !b.name || !b.role) return err(422, 'Name, email and role are required.');
    if (db.USERS.some((u) => u.email.toLowerCase() === b.email!.toLowerCase())) return err(409, 'That email is already invited.');
    const u: User = { id: db.nextId('u'), name: b.name, email: b.email, phone: '', password: db.DEMO_PASSWORD, role: b.role, region: b.region, fn: b.fn, storeId: b.storeId, active: true, invited: true, lastActive: new Date(MOCK_NOW).toISOString() };
    db.USERS.push(u);
    return json(publicUser(u), { status: 201 });
  }),
  http.patch('/api/users/:id', async ({ request, params }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    if (g.user!.role !== 'HEAD_OFFICE') return err(403, 'Only Head Office can edit users.', 'FORBIDDEN');
    const u = db.USERS.find((x) => x.id === params.id);
    if (!u) return err(404, 'User not found');
    const b = (await request.json()) as Partial<User>;
    if (u.id === g.user!.id && (b.active === false || (b.role && b.role !== u.role))) return err(422, 'You cannot change your own role or deactivate yourself.');
    Object.assign(u, { ...(b.role ? { role: b.role } : {}), ...(b.active !== undefined ? { active: b.active } : {}), ...(b.region ? { region: b.region } : {}), ...(b.fn ? { fn: b.fn } : {}), ...(b.name ? { name: b.name } : {}) });
    return json(publicUser(u));
  }),
  http.delete('/api/users/:id', async ({ request, params }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    if (g.user!.role !== 'HEAD_OFFICE') return err(403, 'Only Head Office can remove users.', 'FORBIDDEN');
    if (params.id === g.user!.id) return err(422, 'You cannot remove yourself.');
    const i = db.USERS.findIndex((x) => x.id === params.id);
    if (i < 0) return err(404, 'User not found');
    db.USERS.splice(i, 1);
    return json({ ok: true });
  }),

  /* ───────────── NOTIFICATIONS ───────────── */
  http.get('/api/notifications', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const items = db.notifications.filter((n) => n.roles.includes(g.user!.role)).map((n) => ({ ...n, read: n.read || db.readNotifications.has(`${g.user!.id}:${n.id}`) })).sort((a, b) => b.ts - a.ts);
    return json({ items, unread: items.filter((n) => !n.read).length });
  }),
  http.post('/api/notifications/read', async ({ request }) => {
    const g = await guard(request); if (g.fail) return g.fail;
    const b = (await request.json()) as { ids?: string[]; all?: boolean };
    const ids = b.all ? db.notifications.map((n) => n.id) : b.ids ?? [];
    ids.forEach((id) => db.readNotifications.add(`${g.user!.id}:${id}`));
    return json({ ok: true });
  }),

  /* ───────────── TARA ───────────── */
  http.post('/api/tara/chat', async ({ request }) => {
    const g = await guard(request, { auth: false });
    if (g.fail) return g.fail;
    const b = (await request.json()) as { message: string; context?: never };
    const d = await getDerived();
    let reply = taraBrain(d, b.message ?? '', { ...(b.context ?? {}), role: g.user?.role });
    if (!g.user && !['layer', 'escalation', 'hello', 'fallback', 'eval'].includes(reply.intent)) reply = { intent: 'signin', mood: 'neutral', text: 'Sign in to explore live store data. I can explain any of the 10 pipeline layers or the escalation rule right now.' };
    const enc = new TextEncoder();
    const words = reply.text.split(/(\s+)/);
    const stream = new ReadableStream({
      async start(ctrl) {
        for (const w of words) {
          ctrl.enqueue(enc.encode(JSON.stringify({ t: 'token', v: w }) + '\n'));
          await new Promise((r) => setTimeout(r, 18 + Math.random() * 22));
        }
        ctrl.enqueue(enc.encode(JSON.stringify({ t: 'done', intent: reply.intent, mood: reply.mood }) + '\n'));
        ctrl.close();
      },
    });
    return new HttpResponse(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
  }),

  /* ───────────── CONTACT ───────────── */
  http.post('/api/contact', async ({ request }) => {
    const g = await guard(request, open()); if (g.fail) return g.fail;
    const b = (await request.json()) as { name: string; email: string; topic: string; message: string };
    if (!b.name || !/^\S+@\S+\.\S+$/.test(b.email ?? '') || (b.message ?? '').length < 10) return err(422, 'Please complete all fields with a valid email.');
    db.contacts.push({ id: db.nextId('ct'), name: b.name, email: b.email, topic: b.topic, message: b.message, ts: Date.now() });
    return json({ ok: true, ticket: `FY-${1000 + db.contacts.length}` }, { status: 201 });
  }),
];

/* ───────────── brief builder ───────────── */
function buildBrief(d: Derived, region: RegionId, week: number) {
  const rdef = REGIONS.find((r) => r.id === region)!;
  const inRegion = (r: FeedbackRecord) => STORE_BY_ID.get(r.storeId)!.region === region;
  const recs = recordsInWeek(d, week).filter(inRegion);
  const agg = aggregateIssues(d, week, inRegion).slice(0, 5);
  const topIssues = agg.map((a, idx) => {
    const it = ISSUE_BY_ID.get(a.issue)!;
    const pool = recs.filter((r) => r.issue === a.issue);
    const byStore = new Map<string, number>(); pool.forEach((r) => byStore.set(r.storeId, (byStore.get(r.storeId) ?? 0) + 1));
    const stores = [...byStore.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([id, n]) => ({ id, name: STORE_BY_ID.get(id)!.name, count: n }));
    const quotes: { id: string; channel: Channel; text: string; gloss: string; storeId: string }[] = [];
    const seen = new Set<Channel>();
    for (const r of [...pool].sort((x, y) => (x.lang === 'en' ? 1 : 0) - (y.lang === 'en' ? 1 : 0) || y.ts - x.ts)) {
      if (seen.has(r.channel) || r.channel === 'ticket') continue;
      seen.add(r.channel);
      quotes.push({ id: r.id, channel: r.channel, text: cleanText(r.text, r.channel).cleaned.replace(/<[A-Z]+>/g, '').replace(/\s+/g, ' ').trim(), gloss: r.gloss, storeId: r.storeId });
      if (quotes.length >= 2) break;
    }
    const worst = Math.min(...pool.map((r) => r.severity)) as Sev;
    return { rank: idx + 1, issue: a.issue, label: it.label, fn: db.routing.issueOwner[a.issue], count: a.count, prev: a.prev, delta: a.delta, trend: a.trend, significant: a.significant, z: a.z, severity: worst, stores, quotes };
  });
  const emerging = emergingForWeek(d, week).filter((e) => e.region === region).slice(0, 4).map((e) => ({ id: e.id, storeId: e.storeId, issue: e.issue, label: ISSUE_BY_ID.get(e.issue)!.label, score: e.score, incidentId: e.incidentId ?? null }));
  const esc = d.incidents.filter((i) => i.region === region && i.lastTs >= DAY0 + (weekEnd(week) - 6) * 86400000 && i.firstTs < DAY0 + (weekEnd(week) + 1) * 86400000 && shouldEscalate(effective(i)) && effective(i).status !== 'resolved').slice(0, 5).map((i) => incidentSummary(d, i));
  const ev = evalSummary(d);
  const start = new Date(DAY0 + (weekEnd(week) - 6) * 86400000); const end = new Date(DAY0 + weekEnd(week) * 86400000);
  const fmt = (x: Date) => x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return {
    region, regionName: rdef.name, week, range: `${fmt(start)} – ${fmt(end)} ${end.getUTCFullYear()}`, generatedAt: MOCK_NOW,
    totals: { records: recs.length, actionable: recs.filter((r) => r.actionable).length, s1: recs.filter((r) => r.severity === 1 && r.actionable).length, stores: STORES.filter((s) => s.region === region).length },
    topIssues, emerging, escalations: esc,
    escalationRule: `Escalate to Head Office when an incident is S1, or appears in ${db.policy.escalation.minChannels}+ channels with ${db.policy.escalation.minRecords}+ records inside ${db.policy.escalation.windowHours}h, or its emerging score reaches ${db.policy.escalation.emergingScore}.`,
    precision: { p: ev.precision.p, lo: ev.precision.lo, hi: ev.precision.hi, n: ev.precision.n, line: `Alert precision over the last 4 weeks: ${(ev.precision.p * 100).toFixed(0)}% (95% CI ${(ev.precision.lo * 100).toFixed(0)}–${(ev.precision.hi * 100).toFixed(0)}%, n=${ev.precision.n}).` },
  };
}
export const _p = PLANTED;
