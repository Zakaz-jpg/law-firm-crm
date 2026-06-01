import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Case } from '../api/types'
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS } from '../api/types'
import s from './CaseDetail.module.css'

const ALL_STATUSES = ['active', 'suspended', 'closed', 'won', 'lost']

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try { setCaseData(await api.getCase(Number(id))) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function changeStatus(status: string) {
    if (!caseData) return
    setStatusLoading(true)
    try { setCaseData(await api.updateStatus(caseData.id, status)) }
    finally { setStatusLoading(false) }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !caseData) return
    setUploading(true)
    try { await api.uploadAttachment(caseData.id, file); await load() }
    finally { setUploading(false); e.target.value = '' }
  }

  if (loading) return <div className={s.loading}>Загрузка...</div>
  if (!caseData) return <div className={s.loading}>Дело не найдено</div>

  return (
    <div className={s.page}>
      <button className={s.back} onClick={() => navigate('/cases')}>← Назад</button>

      <div className={s.header}>
        <div className={s.titleRow}>
          <h1 className={s.title}>{caseData.title}</h1>
          <span className={s.badge} style={{ color: STATUS_COLORS[caseData.status], background: STATUS_COLORS[caseData.status] + '22' }}>
            {STATUS_LABELS[caseData.status]}
          </span>
        </div>
        {caseData.case_number && <div className={s.caseNumber}>Дело № {caseData.case_number}</div>}
      </div>

      <div className={s.grid}>
        {/* Статус */}
        <div className={s.card}>
          <h3 className={s.cardTitle}>Изменить статус</h3>
          <div className={s.statusBtns}>
            {ALL_STATUSES.map(st => (
              <button
                key={st}
                className={`${s.statusBtn} ${caseData.status === st ? s.statusActive : ''}`}
                style={caseData.status === st ? { background: STATUS_COLORS[st], color: '#fff', borderColor: STATUS_COLORS[st] } : {}}
                onClick={() => changeStatus(st)}
                disabled={statusLoading || caseData.status === st}
              >
                {STATUS_LABELS[st]}
              </button>
            ))}
          </div>
        </div>

        {/* Детали */}
        <div className={s.card}>
          <h3 className={s.cardTitle}>Детали</h3>
          <div className={s.infoList}>
            {caseData.category && <InfoRow label="Категория" value={CATEGORY_LABELS[caseData.category] ?? caseData.category} />}
            {caseData.court && <InfoRow label="Суд" value={caseData.court} />}
            {caseData.next_hearing_date && (
              <InfoRow
                label="Заседание"
                value={new Date(caseData.next_hearing_date).toLocaleString('ru')}
                red={new Date(caseData.next_hearing_date) < new Date()}
              />
            )}
          </div>
        </div>

        {/* Клиент */}
        {caseData.client && (
          <div className={s.card}>
            <h3 className={s.cardTitle}>Клиент</h3>
            <div className={s.infoList}>
              <InfoRow label="ФИО / Название" value={caseData.client.full_name} />
              {caseData.client.phone && <InfoRow label="Телефон" value={caseData.client.phone} />}
              {caseData.client.email && <InfoRow label="Email" value={caseData.client.email} />}
              {caseData.client.inn && <InfoRow label="ИНН" value={caseData.client.inn} />}
            </div>
          </div>
        )}

        {/* Описание */}
        {caseData.description && (
          <div className={s.card}>
            <h3 className={s.cardTitle}>Описание</h3>
            <p className={s.desc}>{caseData.description}</p>
          </div>
        )}

        {/* Вложения */}
        <div className={s.card}>
          <div className={s.attachHeader}>
            <h3 className={s.cardTitle}>Вложения ({caseData.attachments.length})</h3>
            <button className={s.uploadBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Загрузка...' : '+ Прикрепить'}
            </button>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={uploadFile} />
          </div>
          {caseData.attachments.length === 0 ? (
            <p className={s.noAttach}>Нет вложений</p>
          ) : (
            <div className={s.attachList}>
              {caseData.attachments.map(a => (
                <div key={a.id} className={s.attachItem}>
                  <span className={s.attachIcon}>{a.content_type.startsWith('image') ? '🖼️' : '📄'}</span>
                  <span className={s.attachName}>{a.original_filename}</span>
                  <span className={s.attachSize}>{formatBytes(a.file_size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className={s.infoRow}>
      <span className={s.infoLabel}>{label}:</span>
      <span className={s.infoValue} style={red ? { color: '#dc2626' } : {}}>{value}</span>
    </div>
  )
}

function formatBytes(b: number) {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} МБ`
  if (b >= 1024) return `${Math.round(b / 1024)} КБ`
  return `${b} Б`
}
