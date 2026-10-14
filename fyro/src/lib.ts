export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const fmt = (n: number) => n.toLocaleString('en-IN');
export const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;
export const timeAgo = (ts: number, now: number) => {
  const m = Math.max(0, Math.round((now - ts) / 60000));
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
export const fmtDate = (ts: number) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
export const fmtDay = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
export const MOCK_NOW = Date.UTC(2026, 9, 13, 3, 30);
export const slaLabel = (due: number, now = MOCK_NOW) => {
  const diff = due - now;
  const h = Math.floor(Math.abs(diff) / 3600000);
  const m = Math.floor((Math.abs(diff) % 3600000) / 60000);
  const str = h >= 48 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
  return diff < 0 ? { text: `Breached ${str} ago`, breached: true } : { text: `${str} left`, breached: false };
};
export const downloadCsv = (name: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export const WEEKS = [37, 38, 39, 40, 41];
const DAY0 = Date.UTC(2026, 8, 1);
export const weekRange = (w: number) => {
  const end = 41 - 7 * (41 - w);
  const s = new Date(DAY0 + (end - 6) * 86400000); const e = new Date(DAY0 + end * 86400000);
  const m = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return s.getUTCMonth() === e.getUTCMonth() ? `${s.getUTCDate()}–${e.getUTCDate()} ${m(e)} 2026` : `${s.getUTCDate()} ${m(s)} – ${e.getUTCDate()} ${m(e)} 2026`;
};
export const weekLabel = (w: number) => `Week ${w}, ${weekRange(w)}`;
