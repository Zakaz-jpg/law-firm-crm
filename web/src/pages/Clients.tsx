import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type { Client } from '../api/types'
import s from './Clients.module.css'

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setClients(await api.clients(search || undefined)) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Клиенты</h1>
        <button className={s.createBtn} onClick={() => setShowCreate(true)}>+ Новый клиент</button>
      </div>

      <input
        className={s.search}
        placeholder="🔍 Поиск по имени..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className={s.loading}>Загрузка...</div>
      ) : clients.length === 0 ? (
        <div className={s.empty}>Нет клиентов</div>
      ) : (
        <div className={s.list}>
          {clients.map(c => (
            <div key={c.id} className={s.card}>
              <div className={s.avatar}>{c.full_name[0].toUpperCase()}</div>
              <div className={s.info}>
                <div className={s.name}>{c.full_name}</div>
                <div className={s.details}>
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.email && <span>✉️ {c.email}</span>}
                  {c.inn && <span>ИНН: {c.inn}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateClientModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [inn, setInn] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.createClient({ full_name: fullName, phone: phone || undefined, email: email || undefined, inn: inn || undefined })
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
        <h2 className={s.modalTitle}>Новый клиент</h2>
        <form onSubmit={submit} className={s.form}>
          <input className={s.input} placeholder="ФИО или название *" value={fullName} onChange={e => setFullName(e.target.value)} required />
          <input className={s.input} placeholder="Телефон" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className={s.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className={s.input} placeholder="ИНН" value={inn} onChange={e => setInn(e.target.value)} />
          {error && <div className={s.error}>{error}</div>}
          <div className={s.btns}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="submit" className={s.submitBtn} disabled={loading || !fullName}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
