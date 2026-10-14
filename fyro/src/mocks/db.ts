import { ISSUES, FUNCTIONS, FnId, Sev, PolicyCat } from './taxonomy';
import { RegionId } from './geo';
import { IncidentStatus } from './derived';

export type Role = 'HEAD_OFFICE' | 'REGIONAL_MANAGER' | 'FUNCTION_OWNER' | 'STORE_MANAGER' | 'ANALYST';
export const ROLES: Role[] = ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'FUNCTION_OWNER', 'STORE_MANAGER', 'ANALYST'];

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  region?: RegionId;
  fn?: FnId;
  storeId?: string;
  active: boolean;
  invited?: boolean;
  lastActive: string;
}

export const DEMO_PASSWORD = 'Fyro@123';
export const USERS: User[] = [
  { id: 'u1', name: 'Priya Raghavan', email: 'head@fyro.in', phone: '9000000001', password: DEMO_PASSWORD, role: 'HEAD_OFFICE', active: true, lastActive: '2026-10-14T08:12:00Z' },
  { id: 'u2', name: 'Venkat Subba Reddy', email: 'region@fyro.in', phone: '9000000002', password: DEMO_PASSWORD, role: 'REGIONAL_MANAGER', region: 'rayalaseema', active: true, lastActive: '2026-10-14T07:40:00Z' },
  { id: 'u3', name: 'Meena Iyer', email: 'function@fyro.in', phone: '9000000003', password: DEMO_PASSWORD, role: 'FUNCTION_OWNER', fn: 'store_ops', active: true, lastActive: '2026-10-13T17:05:00Z' },
  { id: 'u4', name: 'Ravi Teja', email: 'store@fyro.in', phone: '9000000004', password: DEMO_PASSWORD, role: 'STORE_MANAGER', storeId: 'ATP-07', region: 'rayalaseema', active: true, lastActive: '2026-10-14T06:55:00Z' },
  { id: 'u5', name: 'Nisha Kapoor', email: 'analyst@fyro.in', phone: '9000000005', password: DEMO_PASSWORD, role: 'ANALYST', active: true, lastActive: '2026-10-14T09:01:00Z' },
  { id: 'u6', name: 'Lakshmi Prasanna', email: 'lakshmi@fyro.in', phone: '9000000006', password: DEMO_PASSWORD, role: 'REGIONAL_MANAGER', region: 'coastal', active: true, lastActive: '2026-10-12T11:20:00Z' },
  { id: 'u7', name: 'Rohit Varma', email: 'rohit@fyro.in', phone: '9000000007', password: DEMO_PASSWORD, role: 'FUNCTION_OWNER', fn: 'supply_chain', active: true, lastActive: '2026-10-13T09:45:00Z' },
  { id: 'u8', name: 'Srinivas Naidu', email: 'srinivas@fyro.in', phone: '9000000008', password: DEMO_PASSWORD, role: 'STORE_MANAGER', storeId: 'VSP-03', region: 'uttarandhra', active: true, lastActive: '2026-10-14T05:30:00Z' },
  { id: 'u9', name: 'Anusha K', email: 'anusha@fyro.in', phone: '9000000009', password: DEMO_PASSWORD, role: 'STORE_MANAGER', storeId: 'TPT-03', region: 'rayalaseema', active: false, lastActive: '2026-09-28T10:00:00Z' },
];

export const OTP_CODE = '123456';

export interface Policy {
  forced: Record<Exclude<PolicyCat, null>, boolean>;
  escalation: { anyS1: boolean; minChannels: number; minRecords: number; windowHours: number; emergingScore: number };
  severityFloors: Record<string, Sev>;
}
export const policy: Policy = {
  forced: { safety: true, allergen: true, hygiene: true, misconduct: true },
  escalation: { anyS1: true, minChannels: 4, minRecords: 30, windowHours: 72, emergingScore: 80 },
  severityFloors: Object.fromEntries(ISSUES.map((i) => [i.id, i.floor])),
};

export interface RoutingRules {
  issueOwner: Record<string, FnId>;
  sla: Record<FnId, Record<Sev, number>>;
}
export const routing: RoutingRules = {
  issueOwner: Object.fromEntries(ISSUES.map((i) => [i.id, i.fn])) as Record<string, FnId>,
  sla: Object.fromEntries(FUNCTIONS.map((f) => [f.id, { ...f.slaHours }])) as Record<FnId, Record<Sev, number>>,
};

export interface IncidentPatch {
  status?: IncidentStatus;
  owner?: string;
  severity?: Sev;
  fn?: FnId;
  escalated?: boolean;
  escalatedAt?: number;
  resolvedAt?: number;
}
export interface Comment { id: string; incidentId: string; author: string; role: Role; text: string; ts: number }
export interface Activity { id: string; incidentId: string; actor: string; action: string; ts: number }
export const incidentPatches = new Map<string, IncidentPatch>();
export const comments: Comment[] = [];
export const activities: Activity[] = [];

export interface StaffNote { id: string; storeId: string; text: string; author: string; ts: number }
export const staffNotes: StaffNote[] = [];

export interface Notification { id: string; title: string; body: string; ts: number; read: boolean; kind: 'alert' | 'escalation' | 'system' | 'sla'; link?: string; roles: Role[] }
export const notifications: Notification[] = [
  { id: 'n1', kind: 'alert', title: 'S1 · Allergen mislabel flagged at TPT-03', body: 'Peanut label complaint corroborated across 3 channels. Escalated to Merchandising.', ts: Date.UTC(2026, 9, 12, 6, 10), read: false, link: '/app/incidents/INC-1002', roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'FUNCTION_OWNER', 'ANALYST', 'STORE_MANAGER'] },
  { id: 'n2', kind: 'alert', title: 'Emerging · Freezer failure at ATP-07', body: 'Daily reports jumped from 0.4 to 21. EARS C2 and C3 both fired.', ts: Date.UTC(2026, 9, 11, 14, 22), read: false, link: '/app/emerging', roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'FUNCTION_OWNER', 'ANALYST', 'STORE_MANAGER'] },
  { id: 'n3', kind: 'escalation', title: 'Escalation rule triggered · VSP-03', body: 'Staff misconduct reached 3 channels in 72h. Head Office notified.', ts: Date.UTC(2026, 9, 12, 9, 45), read: false, link: '/app/incidents/INC-1003', roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'FUNCTION_OWNER'] },
  { id: 'n4', kind: 'sla', title: 'SLA at risk · 4 incidents due within 2 hours', body: 'Store Operations queue has 4 items nearing breach.', ts: Date.UTC(2026, 9, 12, 7, 5), read: false, link: '/app/routing', roles: ['FUNCTION_OWNER', 'HEAD_OFFICE'] },
  { id: 'n5', kind: 'system', title: 'Week 41 brief is ready', body: 'Regional briefs for all 3 regions were generated.', ts: Date.UTC(2026, 9, 12, 5, 0), read: true, link: '/app/briefs', roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'ANALYST'] },
  { id: 'n6', kind: 'system', title: 'Model refresh · MuRIL adapter v14', body: 'Macro-F1 improved by 0.6 points on the held-out sample.', ts: Date.UTC(2026, 9, 10, 18, 30), read: true, link: '/app/evaluation', roles: ['ANALYST', 'HEAD_OFFICE'] },
  { id: 'n7', kind: 'alert', title: 'Dasara queue spike across Coastal Andhra', body: 'Billing queue complaints are 4.5x baseline in 9 stores.', ts: Date.UTC(2026, 9, 9, 12, 0), read: true, link: '/app/incidents', roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'FUNCTION_OWNER'] },
  { id: 'n8', kind: 'system', title: 'Reminder · submit this week\'s staff notes', body: 'Staff notes lift detection lead time by roughly a day.', ts: Date.UTC(2026, 9, 8, 4, 30), read: true, link: '/app', roles: ['STORE_MANAGER'] },
];
export const readNotifications = new Set<string>();

export interface Contact { id: string; name: string; email: string; topic: string; message: string; ts: number }
export const contacts: Contact[] = [];

export const failedLogins = new Map<string, number>();

let uid = 100;
export const nextId = (p: string) => `${p}${++uid}`;

/* ───────────── session persistence (survives reloads; edits survive navigation) ───────────── */
const KEY = 'fyro.mockdb.v2';
function restore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const j = JSON.parse(raw);
    if (j.users) { USERS.splice(0, USERS.length, ...j.users); }
    if (j.policy) { Object.assign(policy.forced, j.policy.forced); Object.assign(policy.escalation, j.policy.escalation); Object.assign(policy.severityFloors, j.policy.severityFloors); }
    if (j.routing) { Object.assign(routing.issueOwner, j.routing.issueOwner); for (const k of Object.keys(j.routing.sla)) Object.assign((routing.sla as Record<string, unknown>)[k] as object, j.routing.sla[k]); }
    if (j.patches) j.patches.forEach(([k, v]: [string, IncidentPatch]) => incidentPatches.set(k, v));
    if (j.comments) comments.push(...j.comments);
    if (j.activities) activities.push(...j.activities);
    if (j.notes) staffNotes.push(...j.notes);
    if (j.notifications) notifications.splice(0, notifications.length, ...j.notifications);
    if (j.read) j.read.forEach((x: string) => readNotifications.add(x));
    if (j.contacts) contacts.push(...j.contacts);
    if (typeof j.uid === 'number') uid = Math.max(uid, j.uid);
  } catch { /* ignore corrupt state */ }
}
export function saveDb() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      users: USERS, policy, routing, patches: [...incidentPatches.entries()], comments, activities, notes: staffNotes, notifications, read: [...readNotifications], contacts, uid,
    }));
  } catch { /* storage unavailable */ }
}
export function resetDb() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
if (typeof window !== 'undefined') {
  restore();
  setInterval(saveDb, 1500);
  window.addEventListener('pagehide', saveDb);
}
