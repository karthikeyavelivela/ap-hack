import { Derived, detectSeries, emergingForWeek, P_THRESHOLD } from './derived';
import { ISSUES, ISSUE_BY_ID, FUNCTIONS, Sev } from './taxonomy';
import { STORE_BY_ID } from './geo';
import { PLANTED, NUM_DAYS, weekEnd, dayDate } from './recordsGen';
import { severityFor } from './nlp';

function prf(tp: number, fp: number, fn: number) {
  const p = tp + fp ? tp / (tp + fp) : 0;
  const r = tp + fn ? tp / (tp + fn) : 0;
  return { p, r, f1: p + r ? (2 * p * r) / (p + r) : 0 };
}

export function wilson(k: number, n: number, z = 1.96) {
  if (!n) return { p: 0, lo: 0, hi: 0 };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { p, lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
}

export function isTrueEvent(storeId: string, issue: string, day: number): boolean {
  if (PLANTED.some((p) => p.storeId === storeId && p.issue === issue && day >= p.start)) return true;
  const s = STORE_BY_ID.get(storeId)!;
  if (issue === 'billing_queue' && s.region === 'coastal' && day >= 33) return true;
  if (issue === 'power_cut' && ['kakinada', 'konaseema', 'bapatla', 'prakasam', 'east-godavari'].includes(s.districtId) && day >= 22 && day <= 26) return true;
  if ((issue === 'freezer_failure' || issue === 'ac_failure') && s.region === 'rayalaseema' && day >= 28) return true;
  return false;
}

let cache: ReturnType<typeof compute> | null = null;
export function evalSummary(d: Derived) {
  if (!cache) cache = compute(d);
  return cache;
}

function compute(d: Derived) {
  const labelled = d.records.filter((r) => r.labelled);
  // issue classification
  const perClass = ISSUES.map((it) => {
    let tp = 0, fp = 0, fn = 0;
    for (const r of labelled) {
      const t = r.trueIssue || null;
      if (t === it.id && r.issue === it.id) tp++;
      else if (t !== it.id && r.issue === it.id) fp++;
      else if (t === it.id && r.issue !== it.id) fn++;
    }
    return { id: it.id, label: it.label, fn: it.fn, support: tp + fn, ...prf(tp, fp, fn) };
  });
  const macroF1 = perClass.filter((c) => c.support > 0).reduce((a, c) => a + c.f1, 0) / perClass.filter((c) => c.support > 0).length;
  // severity
  const sevLabels: Sev[] = [1, 2, 3, 4];
  const sevMatrix: number[][] = sevLabels.map(() => sevLabels.map(() => 0));
  for (const r of labelled) {
    const t = severityFor(r.trueIssue || null, r.text).severity;
    sevMatrix[t - 1][r.severity - 1]++;
  }
  const sevPer = sevLabels.map((s, i) => {
    const tp = sevMatrix[i][i];
    const fp = sevMatrix.reduce((a, row, k) => a + (k === i ? 0 : row[i]), 0);
    const fn = sevMatrix[i].reduce((a, v, k) => a + (k === i ? 0 : v), 0);
    return { severity: s, support: tp + fn, ...prf(tp, fp, fn) };
  });
  const sevF1 = sevPer.reduce((a, c) => a + c.f1, 0) / sevPer.length;
  // actionable
  let atp = 0, afp = 0, afn = 0;
  for (const r of labelled) {
    const t = !!r.trueIssue;
    if (t && r.actionable) atp++; else if (!t && r.actionable) afp++; else if (t && !r.actionable) afn++;
  }
  const act = prf(atp, afp, afn);
  const s1 = sevPer[0];
  // function confusion
  const fnIds = FUNCTIONS.map((f) => f.id);
  const fnMatrix = fnIds.map(() => fnIds.map(() => 0));
  for (const r of labelled) {
    if (!r.trueIssue || !r.issue) continue;
    const a = fnIds.indexOf(ISSUE_BY_ID.get(r.trueIssue)!.fn);
    const b = fnIds.indexOf(ISSUE_BY_ID.get(r.issue)!.fn);
    fnMatrix[a][b]++;
  }

  // lead time for planted incidents
  const leadTime = PLANTED.map((p) => {
    const ser = d.series.get(`${p.storeId}|${p.issue}`)!;
    const det = detectSeries(ser, 3);
    const first = det.findIndex((x, i) => i >= p.start && x.fired);
    const manualDay = weekEnd(41);
    const firstC2 = det.findIndex((x, i) => i >= p.start && x.c2Fired);
    const firstC3 = det.findIndex((x, i) => i >= p.start && x.c3Fired);
    return {
      key: p.key, storeId: p.storeId, issue: p.issue, title: p.title, rampStart: p.start,
      detectedDay: first, detectedDate: first >= 0 ? dayDate(first).toISOString().slice(0, 10) : null,
      leadDays: first >= 0 ? manualDay - first : 0, manualDay, firstC2, firstC3,
      reportsBeforeDetection: first >= 0 ? ser.slice(p.start, first + 1).reduce((a, b) => a + b, 0) : 0,
    };
  });

  // false-alarm vs lead-time sweep over p-value gate
  const sweep = [0.05, 0.02, 0.01, 0.003, 0.001, 0.0003, 0.0001, 0.00001].map((pThr) => {
    let fa = 0, tot = 0;
    for (const [key, ser] of d.series) {
      const [storeId, issue] = key.split('|');
      const det = detectSeries(ser, 3);
      for (let e = 14; e < NUM_DAYS; e++) {
        const x = det[e];
        const fires = (x.c2Fired || x.c3Fired) && x.poissonP < pThr && x.x3 >= 5;
        tot++;
        if (fires && !isTrueEvent(storeId, issue, e)) fa++;
      }
    }
    const leads = PLANTED.map((p) => {
      const det = detectSeries(d.series.get(`${p.storeId}|${p.issue}`)!, 3);
      const f = det.findIndex((x, i) => i >= p.start && (x.c2Fired || x.c3Fired) && x.poissonP < pThr && x.x3 >= 5);
      return f >= 0 ? weekEnd(41) - f : 0;
    });
    const weeks = (NUM_DAYS - 14) / 7;
    return { pThreshold: pThr, falseAlarmsPerWeek: fa / weeks, falseAlarmRate: fa / tot, avgLeadDays: leads.reduce((a, b) => a + b, 0) / leads.length };
  });

  // precision of alerts across the last 4 weeks
  let n = 0, k = 0;
  const bySeverity: Record<number, { n: number; k: number }> = { 1: { n: 0, k: 0 }, 2: { n: 0, k: 0 }, 3: { n: 0, k: 0 }, 4: { n: 0, k: 0 } };
  const weekly: { week: number; n: number; k: number }[] = [];
  for (const w of [38, 39, 40, 41]) {
    const items = emergingForWeek(d, w);
    let wn = 0, wk = 0;
    for (const it of items) {
      const ok = isTrueEvent(it.storeId, it.issue, it.peakDay);
      n++; wn++; if (ok) { k++; wk++; }
      const sev = ISSUE_BY_ID.get(it.issue)!.floor;
      bySeverity[sev].n++; if (ok) bySeverity[sev].k++;
    }
    weekly.push({ week: w, n: wn, k: wk });
  }
  const precision = { ...wilson(k, n), n, k };
  return {
    metrics: { macroF1, severityF1: sevF1, actionableF1: act.f1, s1Recall: s1.r, labelled: labelled.length, actionablePrecision: act.p, actionableRecall: act.r },
    perClass, sevMatrix, sevPer, fnMatrix, fnIds, leadTime, sweep, precision,
    bySeverity: Object.entries(bySeverity).map(([s, v]) => ({ severity: Number(s), n: v.n, k: v.k, ...wilson(v.k, v.n) })),
    weekly,
    gates: { pThreshold: P_THRESHOLD },
  };
}
