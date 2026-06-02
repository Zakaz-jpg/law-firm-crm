export interface Case {
  id: number
  title: string
  case_number: string | null
  status: string
  category: string | null
  court: string | null
  description: string | null
  next_hearing_date: string | null
  lawyer_id: number
  client_id: number | null
  client: Client | null
  attachments: Attachment[]
  created_at: string
  updated_at: string
}

export interface Client {
  id: number
  full_name: string
  phone: string | null
  email: string | null
  inn: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: number
  case_id: number
  original_filename: string
  content_type: string
  file_size: number
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface CalendarEvent {
  case_id: number
  case_number: string | null
  title: string
  court: string | null
  hearing_date: string
}

export interface SyncResponse {
  synced_at: string
  cases: Case[]
  clients: Client[]
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Активное',
  suspended: 'Приостановлено',
  closed: 'Закрыто',
  won: 'Выиграно',
  lost: 'Проиграно',
}

export const CATEGORY_LABELS: Record<string, string> = {
  civil: 'Гражданское',
  criminal: 'Уголовное',
  administrative: 'Административное',
  corporate: 'Корпоративное',
  other: 'Прочее',
}

export const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  suspended: '#d97706',
  closed: '#6b7280',
  won: '#2563eb',
  lost: '#dc2626',
}
