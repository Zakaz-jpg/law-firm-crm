import type { Case, Client, Attachment, TokenResponse, SyncResponse, CalendarEvent, CaseStage, CompanyLawyer, EnforcementRecord } from './types'

const BASE_URL_KEY = 'lawcrm_base_url'
const ACCESS_TOKEN_KEY = 'lawcrm_access_token'
const REFRESH_TOKEN_KEY = 'lawcrm_refresh_token'

const DEFAULT_API_URL = ''

export function getBaseUrl(): string {
  return localStorage.getItem(BASE_URL_KEY) || DEFAULT_API_URL
}
export function setBaseUrl(url: string) {
  localStorage.setItem(BASE_URL_KEY, url.replace(/\/+$/, ''))
}

function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY)
}
function getRefresh() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY)
}
export function saveTokens(t: TokenResponse, remember = true) {
  const store = remember ? localStorage : sessionStorage
  store.setItem(ACCESS_TOKEN_KEY, t.access_token)
  store.setItem(REFRESH_TOKEN_KEY, t.refresh_token)
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}
export function isAuthenticated() { return !!getToken() }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getBaseUrl()
  const token = getToken()
  const headers: Record<string, string> = {
    'bypass-tunnel-reminder': 'true',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${base}/api/v1${path}`, { ...init, headers })

  if (res.status === 401 && !path.includes('/auth/')) {
    const refresh = getRefresh()
    if (refresh) {
      const r = await fetch(`${base}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (r.ok) {
        const tokens: TokenResponse = await r.json()
        saveTokens(tokens)
        headers['Authorization'] = `Bearer ${tokens.access_token}`
        const retry = await fetch(`${base}/api/v1${path}`, { ...init, headers })
        if (!retry.ok) throw new Error(await errorMessage(retry))
        return retry.json()
      }
    }
    clearTokens()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) throw new Error(await errorMessage(res))
  if (res.status === 204) return undefined as T
  return res.json()
}

async function errorMessage(res: Response) {
  try { return (await res.json()).detail ?? res.statusText }
  catch { return res.statusText }
}

// Auth
export const api = {
  login: (email: string, password: string) =>
    fetch(`${getBaseUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'bypass-tunnel-reminder': 'true' },
      body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    }).then(async r => {
      if (!r.ok) throw new Error(await errorMessage(r))
      return r.json() as Promise<TokenResponse>
    }),

  me: () => request<{ id: number; email: string; full_name: string; role: string }>('/auth/me'),

  updateProfile: (data: { full_name?: string; role?: string }) =>
    request<{ id: number; email: string; full_name: string; role: string }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (current_password: string, new_password: string) =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  // Cases
  cases: (params?: { status?: string; q?: string; client_id?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.q) qs.set('q', params.q)
    if (params?.client_id) qs.set('client_id', String(params.client_id))
    const query = qs.toString() ? `?${qs}` : ''
    return request<Case[]>(`/cases${query}`)
  },

  getCase: (id: number) => request<Case>(`/cases/${id}`),

  createCase: (data: { title: string; case_number?: string; category?: string; client_id?: number; defendant_id?: number }) =>
    request<Case>('/cases', { method: 'POST', body: JSON.stringify(data) }),

  updateStatus: (id: number, status: string) =>
    request<Case>(`/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  updateCase: (id: number, data: Partial<Case>) =>
    request<Case>(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Clients
  clients: (q?: string) => {
    const query = q ? `?q=${encodeURIComponent(q)}` : ''
    return request<Client[]>(`/clients${query}`)
  },

  getClient: (id: number) => request<Client>(`/clients/${id}`),

  createClient: (data: { full_name: string; phone?: string; email?: string; inn?: string; address?: string; notes?: string }) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),

  updateClient: (id: number, data: Partial<{ full_name: string; phone: string; email: string; inn: string; address: string; notes: string }>) =>
    request<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Attachments
  uploadAttachment: (caseId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<Attachment>(`/cases/${caseId}/attachments`, { method: 'POST', body: form })
  },

  // Enforcement
  enforcement: (caseId: number) => request<EnforcementRecord[]>(`/cases/${caseId}/enforcement`),

  createEnforcement: (caseId: number, data: Partial<EnforcementRecord>) =>
    request<EnforcementRecord>(`/cases/${caseId}/enforcement`, { method: 'POST', body: JSON.stringify(data) }),

  updateEnforcement: (caseId: number, recordId: number, data: Partial<EnforcementRecord>) =>
    request<EnforcementRecord>(`/cases/${caseId}/enforcement/${recordId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteEnforcement: (caseId: number, recordId: number) =>
    request<void>(`/cases/${caseId}/enforcement/${recordId}`, { method: 'DELETE' }),

  // Stages
  stages: (caseId: number) => request<CaseStage[]>(`/cases/${caseId}/stages`),

  createStage: (caseId: number, data: Partial<CaseStage>) =>
    request<CaseStage>(`/cases/${caseId}/stages`, { method: 'POST', body: JSON.stringify(data) }),

  updateStage: (caseId: number, stageId: number, data: Partial<CaseStage>) =>
    request<CaseStage>(`/cases/${caseId}/stages/${stageId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteStage: (caseId: number, stageId: number) =>
    request<void>(`/cases/${caseId}/stages/${stageId}`, { method: 'DELETE' }),

  // Lawyers
  lawyers: () => request<CompanyLawyer[]>('/lawyers'),

  createLawyer: (data: Partial<CompanyLawyer>) =>
    request<CompanyLawyer>('/lawyers', { method: 'POST', body: JSON.stringify(data) }),

  // Calendar
  calendar: (start: string, end: string) =>
    request<CalendarEvent[]>(`/calendar?start=${start}&end=${end}`),

  // Admin
  adminUsers: () => request<any[]>('/admin/users'),
  adminLogs: () => request<any[]>('/admin/logs'),
  adminUpdateUser: (id: number, data: object) => request<any>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminDeleteUser: (id: number) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),

  // Sync
  sync: () => request<SyncResponse>('/sync'),
}
