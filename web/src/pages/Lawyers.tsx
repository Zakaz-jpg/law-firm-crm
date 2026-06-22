import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { CompanyLawyer } from '../api/types'
import s from './Clients.module.css'

export default function Lawyers() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [lawyers, setLawyers] = useState<CompanyLawyer[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ full_name: '', position: '', specialization: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Create account modal state
  const [accountModal, setAccountModal] = useState<CompanyLawyer | null>(null)
  const [accountForm, setAccountForm] = useState({ email: '', password: '' })
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState('')

  useEffect(() => { api.lawyers().then(setLawyers).finally(() => setLoading(false)) }, [])

  const filtered = lawyers.filter(l =>
    l.full_name.toLowerCase().includes(q.toLowerCase()) ||
    (l.position ?? '').toLowerCase().includes(q.toLowerCase())
  )

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true); setError('')
    try {
      const created = await api.createLawyer(form)
      setLawyers(prev => [...prev, created])
      setModal(false)
      setForm({ full_name: '', position: '', specialization: '', phone: '', email: '' })
    } catch (err: any) {
      setError(err.message ?? 'Ошибка')
    } finally { setSaving(false) }
  }

  function openAccountModal(lawyer: CompanyLawyer) {
    setAccountModal(lawyer)
    setAccountForm({ email: lawyer.email ?? '', password: '' })
    setAccountError('')
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!accountModal) return
    setAccountSaving(true); setAccountError('')
    try {
      await api.adminCreateLawyerAccount(accountModal.id, accountForm)
      setLawyers(prev => prev.map(l => l.id === accountModal.id ? { ...l, user_id: -1 } : l))
      setAccountModal(null)
    } catch (err: any) {
      setAccountError(err.message ?? 'Ошибка')
    } finally { setAccountSaving(false) }
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Юристы компании</h1>
        {isAdmin && <button className={s.createBtn} onClick={() => setModal(true)}>+ Добавить</button>}
      </div>

      <input className={s.search} placeholder="Поиск по имени или должности..." value={q} onChange={e => setQ(e.target.value)} />

      {loading ? (
        <div className={s.loading}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className={s.empty}>Юристов нет</div>
      ) : (
        <div className={s.list}>
          {filtered.map(l => (
            <div key={l.id} className={s.card}>
              <div className={s.avatar}>{initials(l.full_name)}</div>
              <div className={s.info}>
                <div className={s.name}>{l.full_name}</div>
                <div className={s.details}>
                  {l.position && <span>{l.position}</span>}
                  {l.phone && <span>{l.phone}</span>}
                  {l.email && <span>{l.email}</span>}
                  {!l.is_active && <span style={{ color: '#dc2626' }}>Неактивен</span>}
                  {l.user_id
                    ? <span style={{ color: '#16a34a' }}>Аккаунт создан</span>
                    : isAdmin && (
                      <button
                        style={{ fontSize: '12px', padding: '2px 8px', marginLeft: '4px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #2563eb', color: '#2563eb', background: 'transparent' }}
                        onClick={() => openAccountModal(l)}
                      >
                        + Создать аккаунт
                      </button>
                    )
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className={s.modal}>
            <h2 className={s.modalTitle}>Новый юрист</h2>
            <form className={s.form} onSubmit={create}>
              <input className={s.input} placeholder="ФИО *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              <input className={s.input} placeholder="Должность" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
              <input className={s.input} placeholder="Специализация" value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} />
              <input className={s.input} placeholder="Телефон" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <input className={s.input} placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              {error && <div className={s.error}>{error}</div>}
              <div className={s.btns}>
                <button type="button" className={s.cancelBtn} onClick={() => setModal(false)}>Отмена</button>
                <button type="submit" className={s.submitBtn} disabled={saving}>{saving ? 'Создаю...' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {accountModal && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setAccountModal(null)}>
          <div className={s.modal}>
            <h2 className={s.modalTitle}>Создать аккаунт — {accountModal.full_name}</h2>
            <form className={s.form} onSubmit={createAccount}>
              <input
                className={s.input}
                placeholder="Email для входа *"
                type="email"
                value={accountForm.email}
                onChange={e => setAccountForm(f => ({ ...f, email: e.target.value }))}
                required
              />
              <input
                className={s.input}
                placeholder="Пароль *"
                type="password"
                value={accountForm.password}
                onChange={e => setAccountForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
              {accountError && <div className={s.error}>{accountError}</div>}
              <div className={s.btns}>
                <button type="button" className={s.cancelBtn} onClick={() => setAccountModal(null)}>Отмена</button>
                <button type="submit" className={s.submitBtn} disabled={accountSaving}>
                  {accountSaving ? 'Создаю...' : 'Создать аккаунт'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
