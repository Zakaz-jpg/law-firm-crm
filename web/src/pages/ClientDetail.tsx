import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Client, Case } from '../api/types'
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS } from '../api/types'
import s from './ClientDetail.module.css'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [c, cs] = await Promise.all([
          api.getClient(Number(id)),
          api.cases({ client_id: Number(id) }),
        ])
        setClient(c)
        setCases(cs)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div className={s.loading}>Загрузка...</div>
  if (!client) return <div className={s.loading}>Клиент не найден</div>

  const initials = client.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className={s.page}>
      <button className={s.back} onClick={() => navigate('/clients')}>← Назад к клиентам</button>

      <div className={s.profileCard}>
        <div className={s.avatar}>{initials}</div>
        <div className={s.profileInfo}>
          <h1 className={s.name}>{client.full_name}</h1>
          <div className={s.contacts}>
            {client.phone && <span className={s.contact}>📞 {client.phone}</span>}
            {client.email && <span className={s.contact}>✉️ {client.email}</span>}
            {client.inn && <span className={s.contact}>ИНН: {client.inn}</span>}
            {client.address && <span className={s.contact}>📍 {client.address}</span>}
          </div>
          {client.notes && <p className={s.notes}>{client.notes}</p>}
          <button className={s.editBtn} onClick={() => setEditing(true)}>Редактировать</button>
        </div>
        <div className={s.stats}>
          <div className={s.stat}>
            <span className={s.statNum}>{cases.length}</span>
            <span className={s.statLabel}>Всего дел</span>
          </div>
          <div className={s.stat}>
            <span className={s.statNum}>{cases.filter(c => c.status === 'active').length}</span>
            <span className={s.statLabel}>Активных</span>
          </div>
          <div className={s.stat}>
            <span className={s.statNum}>{cases.filter(c => c.status === 'won').length}</span>
            <span className={s.statLabel}>Выиграно</span>
          </div>
        </div>
      </div>

      {editing && (
        <EditClientModal
          client={client}
          onClose={() => setEditing(false)}
          onSaved={updated => { setClient(updated); setEditing(false) }}
        />
      )}

      <h2 className={s.sectionTitle}>История дел</h2>

      {cases.length === 0 ? (
        <div className={s.empty}>У клиента нет дел</div>
      ) : (
        <div className={s.caseList}>
          {cases.map(c => (
            <div key={c.id} className={s.caseCard} onClick={() => navigate(`/cases/${c.id}`)}>
              <div className={s.caseTop}>
                <span className={s.caseTitle}>{c.title}</span>
                <span
                  className={s.badge}
                  style={{ color: STATUS_COLORS[c.status], background: STATUS_COLORS[c.status] + '22' }}
                >
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
              <div className={s.caseMeta}>
                {c.case_number && <span>№ {c.case_number}</span>}
                {c.category && <span>{CATEGORY_LABELS[c.category] ?? c.category}</span>}
                {c.next_hearing_date && (
                  <span style={new Date(c.next_hearing_date) < new Date() ? { color: '#dc2626' } : {}}>
                    📅 {new Date(c.next_hearing_date).toLocaleDateString('ru')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EditClientModal({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: (c: Client) => void }) {
  const [fullName, setFullName] = useState(client.full_name)
  const [phone, setPhone] = useState(client.phone ?? '')
  const [email, setEmail] = useState(client.email ?? '')
  const [inn, setInn] = useState(client.inn ?? '')
  const [address, setAddress] = useState(client.address ?? '')
  const [notes, setNotes] = useState(client.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const updated = await api.updateClient(client.id, {
        full_name: fullName,
        phone: phone || undefined,
        email: email || undefined,
        inn: inn || undefined,
        address: address || undefined,
        notes: notes || undefined,
      })
      onSaved(updated)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <h2 className={s.modalTitle}>Редактировать клиента</h2>
        <form onSubmit={submit} className={s.form}>
          <input className={s.input} placeholder="ФИО или название *" value={fullName} onChange={e => setFullName(e.target.value)} required />
          <input className={s.input} placeholder="Телефон" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className={s.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className={s.input} placeholder="ИНН" value={inn} onChange={e => setInn(e.target.value)} />
          <input className={s.input} placeholder="Адрес" value={address} onChange={e => setAddress(e.target.value)} />
          <textarea className={s.input} placeholder="Примечания" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
          {error && <div className={s.error}>{error}</div>}
          <div className={s.btns}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="submit" className={s.submitBtn} disabled={saving || !fullName}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
