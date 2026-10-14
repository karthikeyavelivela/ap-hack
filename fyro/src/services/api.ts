import { useAuth, useUI } from '@/store';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(method: string, url: string, body?: unknown, raw = false): Promise<T> {
  const { token } = useAuth.getState();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (useUI.getState().simulateErrors && !url.startsWith('/api/auth')) headers['x-fyro-fail'] = '1';
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and retry.', 'NETWORK');
  }
  if (raw) return res as unknown as T;
  if (!res.ok) {
    let msg = res.statusText; let code: string | undefined;
    try { const j = await res.json(); msg = j.error ?? msg; code = j.code; } catch { /* ignore */ }
    if (res.status === 401 && token && !url.startsWith('/api/auth/login')) {
      useAuth.getState().logout(true);
      if (!location.pathname.startsWith('/login')) location.assign('/login?expired=1');
    }
    throw new ApiError(res.status, msg, code);
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T,>(url: string, params?: Record<string, string | number | boolean | undefined | null>) => request<T>('GET', withParams(url, params)),
  post: <T,>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T,>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}),
  patch: <T,>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {}),
  del: <T,>(url: string) => request<T>('DELETE', url),
  raw: (method: string, url: string, body?: unknown) => request<Response>(method, url, body ?? {}, true),
};

export function withParams(url: string, params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return url;
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== 'all') p.set(k, String(v)); });
  const q = p.toString();
  return q ? `${url}?${q}` : url;
}
