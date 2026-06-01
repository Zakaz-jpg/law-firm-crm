import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Case } from '../api/types'
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS } from '../api/types'
import s from './CaseDetail.module.css'

const ALL_STATUSES = ['active', 'suspended', 'closed', 'won', 'lost']

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

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

  async function saveField(patch: Partial<Case>) {
    if (!caseData) return
    const updated = await api.updateCase(caseData.id, patch)
    setCaseData(updated)
  }

  if (loading) return <div className={s.loading}>Загрузка...</div>
  if (!caseData) return <div className={s.loading}>Дело не найдено</div>

  return (
    <div className={s.page}>
      <button className={s.back} onClick={() => navigate('/cases')}>← Назад к делам</button>

      <EditableHeader caseData={caseData} onSave={saveField} />

      <div className={s.grid}>
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

        <EditableDetails caseData={caseData} onSave={saveField} />

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

        <EditableDescription caseData={caseData} onSave={saveField} />

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

function EditableHeader({ caseData, onSave }: { caseData: Case; onSave: (p: Partial<Case>) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(caseData.title)
  const [caseNumber, setCaseNumber] = useState(caseData.case_number ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(caseData.title)
    setCaseNumber(caseData.case_number ?? '')
  }, [caseData])

  async function save() {
    setSaving(true)
    try {
      await onSave({ title, case_number: caseNumber || null })
      setEditing(false)
    } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className={s.header}>
        <div className={s.headerEditForm}>
          <input className={s.editInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="Название дела" />
          <input className={s.editInputSm} value={caseNumber} onChange={e => setCaseNumber(e.target.value)} placeholder="Номер дела" />
          <div className={s.editActions}>
            <button className={s.saveBtn} onClick={save} disabled={saving || !title}>
              {saving ? 'Сохраняю...' : 'Сохранить'}
            </button>
            <button className={s.cancelEditBtn} onClick={() => setEditing(false)}>Отмена</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.header}>
      <div className={s.titleRow}>
        <h1 className={s.title}>{caseData.title}</h1>
        <span className={s.badge} style={{ color: STATUS_COLORS[caseData.status], background: STATUS_COLORS[caseData.status] + '22' }}>
          {STATUS_LABELS[caseData.status]}
        </span>
        <button className={s.editIconBtn} onClick={() => setEditing(true)} title="Редактировать">
          <PencilIcon />
        </button>
      </div>
      {caseData.case_number && <div className={s.caseNumber}>Дело № {caseData.case_number}</div>}
    </div>
  )
}

function EditableDetails({ caseData, onSave }: { caseData: Case; onSave: (p: Partial<Case>) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [court, setCourt] = useState(caseData.court ?? '')
  const [category, setCategory] = useState(caseData.category ?? '')
  const [hearingDate, setHearingDate] = useState(
    caseData.next_hearing_date ? caseData.next_hearing_date.slice(0, 16) : ''
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCourt(caseData.court ?? '')
    setCategory(caseData.category ?? '')
    setHearingDate(caseData.next_hearing_date ? caseData.next_hearing_date.slice(0, 16) : '')
  }, [caseData])

  async function save() {
    setSaving(true)
    try {
      await onSave({
        court: court || null,
        category: category || null,
        next_hearing_date: hearingDate || null,
      })
      setEditing(false)
    } finally { setSaving(false) }
  }

  return (
    <div className={s.card}>
      <div className={s.cardHeaderRow}>
        <h3 className={s.cardTitle}>Детали</h3>
        {!editing && (
          <button className={s.editIconBtn} onClick={() => setEditing(true)} title="Редактировать"><PencilIcon /></button>
        )}
      </div>

      {editing ? (
        <div className={s.editForm}>
          <div className={s.editField}>
            <label className={s.editLabel}>Категория</label>
            <select className={s.editInput} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">— не указана —</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className={s.editField}>
            <label className={s.editLabel}>Суд</label>
            <input className={s.editInput} value={court} onChange={e => setCourt(e.target.value)} placeholder="Название суда" />
          </div>
          <div className={s.editField}>
            <label className={s.editLabel}>Ближайшее заседание</label>
            <input className={s.editInput} type="datetime-local" value={hearingDate} onChange={e => setHearingDate(e.target.value)} />
          </div>
          <div className={s.editActions}>
            <button className={s.saveBtn} onClick={save} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить'}</button>
            <button className={s.cancelEditBtn} onClick={() => setEditing(false)}>Отмена</button>
          </div>
        </div>
      ) : (
        <div className={s.infoList}>
          {caseData.category
            ? <InfoRow label="Категория" value={CATEGORY_LABELS[caseData.category] ?? caseData.category} />
            : <InfoRow label="Категория" value="—" muted />}
          {caseData.court
            ? <InfoRow label="Суд" value={caseData.court} />
            : <InfoRow label="Суд" value="—" muted />}
          {caseData.next_hearing_date ? (
            <InfoRow
              label="Заседание"
              value={new Date(caseData.next_hearing_date).toLocaleString('ru')}
              red={new Date(caseData.next_hearing_date) < new Date()}
            />
          ) : <InfoRow label="Заседание" value="—" muted />}
        </div>
      )}
    </div>
  )
}

function EditableDescription({ caseData, onSave }: { caseData: Case; onSave: (p: Partial<Case>) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(caseData.description ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDesc(caseData.description ?? '') }, [caseData])

  async function save() {
    setSaving(true)
    try { await onSave({ description: desc || null }); setEditing(false) }
    finally { setSaving(false) }
  }

  return (
    <div className={s.card}>
      <div className={s.cardHeaderRow}>
        <h3 className={s.cardTitle}>Описание</h3>
        {!editing && (
          <button className={s.editIconBtn} onClick={() => setEditing(true)} title="Редактировать"><PencilIcon /></button>
        )}
      </div>
      {editing ? (
        <div className={s.editForm}>
          <textarea
            className={s.editTextarea}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Описание дела..."
            rows={5}
          />
          <div className={s.editActions}>
            <button className={s.saveBtn} onClick={save} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить'}</button>
            <button className={s.cancelEditBtn} onClick={() => setEditing(false)}>Отмена</button>
          </div>
        </div>
      ) : (
        <p className={s.desc} style={!caseData.description ? { color: 'var(--c-text-3)' } : {}}>
          {caseData.description || 'Нет описания'}
        </p>
      )}
    </div>
  )
}

function InfoRow({ label, value, red, muted }: { label: string; value: string; red?: boolean; muted?: boolean }) {
  return (
    <div className={s.infoRow}>
      <span className={s.infoLabel}>{label}:</span>
      <span className={s.infoValue} style={red ? { color: '#dc2626' } : muted ? { color: 'var(--c-text-3)' } : {}}>{value}</span>
    </div>
  )
}

function formatBytes(b: number) {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} МБ`
  if (b >= 1024) return `${Math.round(b / 1024)} КБ`
  return `${b} Б`
}
