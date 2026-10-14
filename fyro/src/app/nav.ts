import { LayoutDashboard, Inbox, Siren, Radar, FileText, Route, Store, Map, Layers, Gauge, BarChart3, Tags, ShieldCheck, Users, Bell, Settings, LifeBuoy, Sparkles, LucideIcon } from 'lucide-react';
import type { Role } from '@/mocks/db';

export interface NavItem { to: string; label: string; icon: LucideIcon; roles: Role[]; section: 'main' | 'insight' | 'admin'; tour?: string }
const ALL: Role[] = ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'FUNCTION_OWNER', 'STORE_MANAGER', 'ANALYST'];

export const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, roles: ALL, section: 'main', tour: 'nav-dashboard' },
  { to: '/app/inbox', label: 'Feedback inbox', icon: Inbox, roles: ALL, section: 'main' },
  { to: '/app/incidents', label: 'Incidents', icon: Siren, roles: ALL, section: 'main', tour: 'nav-incidents' },
  { to: '/app/emerging', label: 'Emerging radar', icon: Radar, roles: ALL, section: 'main', tour: 'nav-emerging' },
  { to: '/app/briefs', label: 'Regional briefs', icon: FileText, roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'ANALYST'], section: 'main', tour: 'nav-briefs' },
  { to: '/app/routing', label: 'Routing', icon: Route, roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'FUNCTION_OWNER', 'ANALYST'], section: 'main', tour: 'nav-routing' },
  { to: '/app/stores', label: 'Stores', icon: Store, roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'ANALYST', 'FUNCTION_OWNER'], section: 'insight' },
  { to: '/app/map', label: 'AP map', icon: Map, roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'ANALYST', 'FUNCTION_OWNER'], section: 'insight' },
  { to: '/app/layers', label: 'Pipeline layers', icon: Layers, roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'FUNCTION_OWNER', 'ANALYST'], section: 'insight', tour: 'nav-layers' },
  { to: '/app/evaluation', label: 'Evaluation', icon: Gauge, roles: ['HEAD_OFFICE', 'ANALYST'], section: 'insight' },
  { to: '/app/explorer', label: 'Data explorer', icon: BarChart3, roles: ['HEAD_OFFICE', 'REGIONAL_MANAGER', 'ANALYST'], section: 'insight' },
  { to: '/app/taxonomy', label: 'Taxonomy', icon: Tags, roles: ['HEAD_OFFICE', 'ANALYST'], section: 'admin' },
  { to: '/app/policy', label: 'Severity & escalation', icon: ShieldCheck, roles: ['HEAD_OFFICE', 'ANALYST'], section: 'admin' },
  { to: '/app/users', label: 'Users', icon: Users, roles: ['HEAD_OFFICE'], section: 'admin' },
];
export const NAV_FOOT: NavItem[] = [
  { to: '/app/tara', label: 'Ask Tara', icon: Sparkles, roles: ALL, section: 'main' },
  { to: '/app/notifications', label: 'Notifications', icon: Bell, roles: ALL, section: 'main' },
  { to: '/app/settings', label: 'Settings', icon: Settings, roles: ALL, section: 'main' },
  { to: '/app/help', label: 'Help', icon: LifeBuoy, roles: ALL, section: 'main' },
];

export const ROLE_LABEL: Record<Role, string> = {
  HEAD_OFFICE: 'Head Office', REGIONAL_MANAGER: 'Regional Manager', FUNCTION_OWNER: 'Function Owner', STORE_MANAGER: 'Store Manager', ANALYST: 'Analyst',
};
export const DEMO_ACCOUNTS: Record<Role, { email: string; password: string }> = {
  HEAD_OFFICE: { email: 'head@fyro.in', password: 'Fyro@123' },
  REGIONAL_MANAGER: { email: 'region@fyro.in', password: 'Fyro@123' },
  FUNCTION_OWNER: { email: 'function@fyro.in', password: 'Fyro@123' },
  STORE_MANAGER: { email: 'store@fyro.in', password: 'Fyro@123' },
  ANALYST: { email: 'analyst@fyro.in', password: 'Fyro@123' },
};

/** Which roles may open which path prefix (first match wins, longest prefix first). */
const RULES: [string, Role[]][] = NAV.concat(NAV_FOOT).map((n) => [n.to, n.roles] as [string, Role[]]).sort((a, b) => b[0].length - a[0].length);
export function canAccess(path: string, role: Role): boolean {
  if (path.startsWith('/app/stores/')) return true; // store profile is scoped server-side
  if (path.startsWith('/app/layers/')) return canAccess('/app/layers', role);
  if (path.startsWith('/app/incidents/') || path.startsWith('/app/briefs/')) return canAccess(path.startsWith('/app/briefs') ? '/app/briefs' : '/app/incidents', role);
  const r = RULES.find(([p]) => path === p || (p !== '/app' && path.startsWith(p + '/')));
  return r ? r[1].includes(role) : true;
}
