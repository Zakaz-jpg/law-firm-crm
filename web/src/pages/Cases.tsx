import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Case } from '../api/types'
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS } from '../api/types'
import s from './Cases.module.css'

const STATUSES = ['', 'active', 'suspended', 'closed', 'won', 'lost']

export default function Cases() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setCases(await api.cases({ status: status || undefined, q: search || undefined })) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [status, search])

  useEffect(() => { load() }, [load])

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Дела</h1>
        <button className={s.createBtn} onClick={() => setShowCreate(true)}>+ Новое дело</button>
      </div>

      <div className={s.filters}>
        <input
          className={s.search}
          placeholder="🔍 Поиск по названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className={s.statusTabs}>
          {STATUSES.map(st => (
            <button
              key={st}
              className={`${s.tab} ${status === st ? s.tabActive : ''}`}
              onClick={() => setStatus(st)}
            >
              {st ? STATUS_LABELS[st] : 'Все'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={s.loading}>Загрузка...</div>
      ) : cases.length === 0 ? (
        <div className={s.empty}>Нет дел</div>
      ) : (
        <div className={s.grid}>
          {cases.map(c => (
            <div key={c.id} className={s.card} onClick={() => navigate(`/cases/${c.id}`)}>
              <div className={s.cardTop}>
                <span className={s.cardTitle}>{c.title}</span>
                <span className={s.badge} style={{ color: STATUS_COLORS[c.status], background: STATUS_COLORS[c.status] + '22' }}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </div>
              {c.case_number && <div className={s.meta}>№ {c.case_number}</div>}
              {c.client && <div className={s.meta}>👤 {c.client.full_name}</div>}
              {c.category && <div className={s.meta}>📂 {CATEGORY_LABELS[c.category] ?? c.category}</div>}
              {c.next_hearing_date && (
                <div className={`${s.meta} ${new Date(c.next_hearing_date) < new Date() ? s.overdue : ''}`}>
                  📅 {new Date(c.next_hearing_date).toLocaleDateString('ru')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateCaseModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}

function CreateCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [caseNumber, setCaseNumber] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.createCase({ title, case_number: caseNumber || undefined, category: category || undefined })
      onCreated()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <h2 className={s.modalTitle}>Новое дело</h2>
        <form onSubmit={submit} className={s.form}>
          <input className={s.input} placeholder="Название *" value={title} onChange={e => setTitle(e.target.value)} required />
          <input className={s.input} placeholder="Номер дела" value={caseNumber} onChange={e => setCaseNumber(e.target.value)} />
          <select className={s.input} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Категория (необязательно)</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.modalBtns}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="submit" className={s.submitBtn} disabled={loading || !title}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
