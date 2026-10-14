import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useUI } from '@/store';
import type { FeedbackRecord, Channel } from '@/mocks/recordsGen';
import type { EmergingItem, IncidentStatus, DetectDay } from '@/mocks/derived';
import type { Sev, FnId } from '@/mocks/taxonomy';
import type { RegionId, Store } from '@/mocks/geo';
import type { User, Policy } from '@/mocks/db';

export interface IncidentRow {
  id: string; title: string; storeId: string; storeName: string; districtName: string; region: RegionId; issue: string; issueLabel: string; family: string;
  fn: FnId; fnName: string; severity: Sev; status: IncidentStatus; owner: string; channels: Channel[]; count: number; firstTs: number; lastTs: number;
  dueTs: number; detectedTs: number; planted: string | null; escalated: boolean; topQuote: string;
}
export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number; counts?: Record<IncidentStatus, number> }
export interface Kpi { value: number; delta: number }
export interface Kpis {
  week: number; records: Kpi; incidents: Kpi; escalations: Kpi; precision: Kpi & { lo: number; hi: number }; leadTime: Kpi; s1: { value: number }; actionable: { value: number };
}
export interface IssueAggRow { issue: string; count: number; prev: number; delta: number; trend: 'up' | 'down' | 'flat'; significant: boolean; z: number; label: string; fn: FnId }
export interface Trends {
  daily: { day: number; date: string; review: number; app: number; whatsapp: number; ticket: number; issues: number }[];
  weekly: { week: number; records: number; actionable: number; s1: number; incidents: number }[];
  top: IssueAggRow[]; fnLoad: { fn: FnId; name: string; open: number }[]; sevMix: { severity: number; count: number }[]; langMix: { lang: string; count: number }[];
}
export interface MapData {
  week: number; issue: string | null;
  regions: { id: RegionId; name: string; count: number; s1: number; rate: number; stores: number; emerging: number }[];
  districts: { id: string; name: string; region: RegionId; stores: number; count: number; s1: number; rate: number; emerging: number }[];
  stores: { id: string; name: string; districtId: string; region: RegionId; lat: number; lng: number; format: string; count: number; s1: number; rate: number; emerging: boolean }[];
}
export type EmergingRow = EmergingItem & { issueLabel: string; fn: FnId; storeName: string };
export interface BriefIssue { rank: number; issue: string; label: string; fn: FnId; count: number; prev: number; delta: number; trend: 'up' | 'down' | 'flat'; significant: boolean; z: number; severity: Sev; stores: { id: string; name: string; count: number }[]; quotes: { id: string; channel: Channel; text: string; gloss: string; storeId: string }[] }
export interface Brief {
  region: RegionId; regionName: string; week: number; range: string; generatedAt: number; totals: { records: number; actionable: number; s1: number; stores: number };
  topIssues: BriefIssue[]; emerging: { id: string; storeId: string; issue: string; label: string; score: number; incidentId: string | null }[]; escalations: IncidentRow[]; escalationRule: string;
  precision: { p: number; lo: number; hi: number; n: number; line: string };
}
export interface Notif { id: string; title: string; body: string; ts: number; read: boolean; kind: 'alert' | 'escalation' | 'system' | 'sla'; link?: string }
export interface PublicUser extends Omit<User, 'password'> { invited?: boolean }

const useWeek = () => useUI((s) => s.week);
const retry = (n: number, e: unknown) => n < 2 && (e as { status?: number })?.status !== 403 && (e as { status?: number })?.status !== 404 && (e as { status?: number })?.status !== 401 && (e as { code?: string })?.code !== 'SIMULATED';

export const useKpis = () => { const week = useWeek(); return useQuery({ queryKey: ['kpis', week], queryFn: () => api.get<Kpis>('/api/analytics/kpis', { week }), placeholderData: keepPreviousData, retry }); };
export const useTrends = () => { const week = useWeek(); return useQuery({ queryKey: ['trends', week], queryFn: () => api.get<Trends>('/api/analytics/trends', { week }), placeholderData: keepPreviousData, retry }); };
export const useMapData = (issue?: string) => { const week = useWeek(); return useQuery({ queryKey: ['map', week, issue ?? ''], queryFn: () => api.get<MapData>('/api/analytics/map', { week, issue }), placeholderData: keepPreviousData, retry }); };
export const useEmerging = () => { const week = useWeek(); return useQuery({ queryKey: ['emerging', week], queryFn: () => api.get<{ week: number; items: EmergingRow[]; gates: { c3: number; p: number; minVolume: number; minChannels: number } }>('/api/emerging', { week }), placeholderData: keepPreviousData, retry }); };
export const useEmergingReplay = (storeId: string, issue: string) => useQuery({ queryKey: ['replay', storeId, issue], queryFn: () => api.get<{ storeId: string; issue: string; issueLabel: string; storeName?: string; days: (DetectDay & { channels: number })[]; dates: string[]; gates: { c3: number; p: number; minVolume: number } }>('/api/emerging/replay', { storeId, issue }), retry });
export const useIncidents = (params: Record<string, string | number | undefined>) => useQuery({ queryKey: ['incidents', params], queryFn: () => api.get<Paged<IncidentRow>>('/api/incidents', params), placeholderData: keepPreviousData, retry });
export const useIncident = (id: string) => useQuery({
  queryKey: ['incident', id],
  queryFn: () => api.get<{
    incident: IncidentRow; records: FeedbackRecord[]; totalRecords: number; series: { day: number; count: number }[]; byChannel: { channel: Channel; label: string; count: number }[];
    evidence: { id: string; channel: Channel; text: string; gloss: string; ts: number }[]; comments: { id: string; author: string; role: string; text: string; ts: number }[];
    activity: { id: string; actor: string; action: string; ts: number }[]; emergingId: string;
  }>(`/api/incidents/${id}`), retry,
});
export const useBriefs = (region: string | undefined, week: number) => useQuery({ queryKey: ['briefs', region, week], queryFn: () => api.get<Brief[]>('/api/briefs', { region, week }), placeholderData: keepPreviousData, retry });
export const useBrief = (region: string, week: number) => useQuery({ queryKey: ['brief', region, week], queryFn: () => api.get<Brief>(`/api/briefs/${region}/${week}`), retry });
export const useStores = (params: Record<string, string | undefined> = {}) => useQuery({ queryKey: ['stores', params], queryFn: () => api.get<(Store & { weekIssues: number; ratePer1k: number })[]>('/api/stores', params), placeholderData: keepPreviousData, retry });
export const useStore = (id: string) => useQuery({
  queryKey: ['store', id],
  queryFn: () => api.get<{ store: Store; rates: { issue: string; label: string; count: number; raw: number; shrunk: number; district: number }[]; channelMix: { channel: Channel; label: string; count: number }[]; incidents: IncidentRow[]; districtRate: number; health: number; storeRate: number; issuesWeek: number; staffNotes: { id: string; text: string; author: string; ts: number }[]; series: number[] }>(`/api/stores/${id}`), retry,
});
export const useRegions = () => useQuery({ queryKey: ['regions'], queryFn: () => api.get<{ id: RegionId; name: string; telugu: string; blurb: string; stores: number; records: number; incidents: number; districtNames: string[] }[]>('/api/regions'), staleTime: 600000, retry });
export const useTaxonomy = () => useQuery({ queryKey: ['taxonomy'], queryFn: () => api.get<{ id: string; label: string; fn: FnId; defaultFn: FnId; floor: Sev; family: string; policy: string | null }[]>('/api/taxonomy'), retry });
export const useFunctions = () => useQuery({ queryKey: ['functions'], queryFn: () => api.get<{ id: FnId; name: string; owner: string; slaHours: Record<Sev, number> }[]>('/api/functions'), staleTime: 600000, retry });
export const usePolicy = () => useQuery({ queryKey: ['policy'], queryFn: () => api.get<Policy>('/api/policy'), retry });
export const useRouting = () => useQuery({ queryKey: ['routing'], queryFn: () => api.get<{ issueOwner: Record<string, FnId>; sla: Record<FnId, Record<Sev, number>>; escalation: Policy['escalation']; functions: { id: FnId; name: string; owner: string }[] }>('/api/routing/rules'), retry });
export const useQueue = (fn: string) => useQuery({ queryKey: ['queue', fn], queryFn: () => api.get<{ function: FnId; items: IncidentRow[]; total: number; breached: number; resolvedTrend: { week: number; resolved: number; opened: number }[]; severityMix: { severity: number; count: number }[] }>('/api/routing/queue', { function: fn }), placeholderData: keepPreviousData, retry });
export const useEvalSummary = () => useQuery({ queryKey: ['eval', 'summary'], queryFn: () => api.get<{ metrics: { macroF1: number; severityF1: number; actionableF1: number; s1Recall: number; labelled: number; actionablePrecision: number; actionableRecall: number }; perClass: { id: string; label: string; fn: FnId; support: number; p: number; r: number; f1: number }[]; sevPer: { severity: number; support: number; p: number; r: number; f1: number }[]; bySeverity: { severity: number; n: number; k: number; p: number; lo: number; hi: number }[]; weekly: { week: number; n: number; k: number }[] }>('/api/eval/summary'), retry });
export const useEvalLead = () => useQuery({ queryKey: ['eval', 'lead'], queryFn: () => api.get<{ planted: { key: string; storeId: string; issue: string; title: string; rampStart: number; detectedDay: number; detectedDate: string | null; leadDays: number; manualDay: number; firstC2: number; firstC3: number; reportsBeforeDetection: number }[]; sweep: { pThreshold: number; falseAlarmsPerWeek: number; falseAlarmRate: number; avgLeadDays: number }[] }>('/api/eval/lead-time'), retry });
export const useEvalPrecision = () => useQuery({ queryKey: ['eval', 'precision'], queryFn: () => api.get<{ precision: { p: number; lo: number; hi: number; n: number; k: number }; bySeverity: { severity: number; n: number; k: number; p: number; lo: number; hi: number }[]; weekly: { week: number; n: number; k: number; p: number; lo: number; hi: number }[] }>('/api/eval/precision'), retry });
export const useEvalConfusion = () => useQuery({ queryKey: ['eval', 'conf'], queryFn: () => api.get<{ severity: { labels: string[]; matrix: number[][] }; function: { labels: string[]; matrix: number[][] } }>('/api/eval/confusion'), retry });
export const useUsers = () => useQuery({ queryKey: ['users'], queryFn: () => api.get<PublicUser[]>('/api/users'), retry });
export const useNotifications = () => useQuery({ queryKey: ['notifs'], queryFn: () => api.get<{ items: Notif[]; unread: number }>('/api/notifications'), refetchInterval: 60000, retry });
export const usePipelineStatus = () => useQuery({ queryKey: ['pipeline-status'], queryFn: () => api.get<{ layers: { id: number; name: string; throughput: number; latencyMs: number; health: string }[]; drift: { week: number; psi: number }[]; records: number }>('/api/pipeline/status'), retry });
export const usePublicStats = () => useQuery({ queryKey: ['public-stats'], queryFn: () => api.get<{ records: number; incidents: number; avgLeadDays: number; stores: number; districts: number; languages: number; pins: { id: string; lon: number; lat: number; region: RegionId }[] }>('/api/public/stats'), staleTime: 600000, retry });
export const useExplorer = (params: Record<string, string | undefined>) => useQuery({ queryKey: ['explorer', params], queryFn: () => api.get<{ by: string; metric: string; rows: { key: string; label: string; count: number; s1: number; actionable: number; tx: number; rate: number }[]; total: number }>('/api/analytics/explorer', params), placeholderData: keepPreviousData, retry });

export const useFeedback = (params: Record<string, string | undefined>) => useInfiniteQuery({
  queryKey: ['feedback', params],
  queryFn: ({ pageParam }) => api.get<{ items: (FeedbackRecord & { incidentId: string | null })[]; total: number; nextCursor: number | null }>('/api/feedback', { ...params, cursor: pageParam, limit: 100 }),
  initialPageParam: 0, getNextPageParam: (l) => l.nextCursor ?? undefined, retry,
});
export interface RecordDetail {
  record: FeedbackRecord; store: Store; cleaned: { original: string; cleaned: string; truncated: boolean; steps: { id: string; label: string; changed: boolean; text: string }[] };
  tokens: { text: string; lang: string; native?: string }[]; mix: Record<string, number>; native: string; translation: string; machineTranslation: string;
  classification: { issue: string | null; confidence: number; tier: 'rules' | 'muril' | 'llm'; scores: { id: string; p: number }[]; segments: { text: string; issue: string | null; confidence: number }[]; actionable: boolean };
  severity: { severity: Sev; modelSeverity: Sev; floor: Sev; policy: string | null; forced: boolean; reasons: string[] }; incidentId: string | null; incident: IncidentRow | null;
}
export const useRecord = (id: string | null) => useQuery({ queryKey: ['record', id], queryFn: () => api.get<RecordDetail>(`/api/feedback/${id}`), enabled: !!id, retry });

/* mutations */
export function useIncidentMutations(id: string) {
  const qc = useQueryClient();
  const invalidate = () => { void qc.invalidateQueries({ queryKey: ['incident', id] }); void qc.invalidateQueries({ queryKey: ['incidents'] }); void qc.invalidateQueries({ queryKey: ['queue'] }); void qc.invalidateQueries({ queryKey: ['kpis'] }); };
  const patch = useMutation({
    mutationFn: (b: { status?: IncidentStatus; owner?: string; severity?: Sev; fn?: FnId }) => api.patch(`/api/incidents/${id}`, b),
    onMutate: async (b) => {
      await qc.cancelQueries({ queryKey: ['incident', id] });
      const prev = qc.getQueryData<{ incident: IncidentRow }>(['incident', id]);
      if (prev) qc.setQueryData(['incident', id], { ...prev, incident: { ...prev.incident, ...b } });
      return { prev };
    },
    onError: (_e, _b, ctx) => { if (ctx?.prev) qc.setQueryData(['incident', id], ctx.prev); },
    onSettled: invalidate,
  });
  const comment = useMutation({ mutationFn: (text: string) => api.post(`/api/incidents/${id}/comments`, { text }), onSuccess: invalidate });
  const escalate = useMutation({
    mutationFn: () => api.post(`/api/incidents/${id}/escalate`),
    onMutate: async () => { const prev = qc.getQueryData<{ incident: IncidentRow }>(['incident', id]); if (prev) qc.setQueryData(['incident', id], { ...prev, incident: { ...prev.incident, escalated: true } }); return { prev }; },
    onError: (_e, _b, ctx) => { if (ctx?.prev) qc.setQueryData(['incident', id], ctx.prev); },
    onSettled: invalidate,
  });
  const resolve = useMutation({
    mutationFn: () => api.post(`/api/incidents/${id}/resolve`),
    onMutate: async () => { const prev = qc.getQueryData<{ incident: IncidentRow }>(['incident', id]); if (prev) qc.setQueryData(['incident', id], { ...prev, incident: { ...prev.incident, status: 'resolved' } }); return { prev }; },
    onError: (_e, _b, ctx) => { if (ctx?.prev) qc.setQueryData(['incident', id], ctx.prev); },
    onSettled: invalidate,
  });
  return { patch, comment, escalate, resolve };
}
