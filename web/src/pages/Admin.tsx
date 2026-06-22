import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import type { AdminUser } from '../api/types'
import s from './Admin.module.css'

const ROLES = [
  { value: 'lawyer', label: 'Адвокат' },
  { value: 'senior_lawyer', label: 'Старший адвокат' },
  { value: 'jurist', label: 'Юрист' },
  { value: 'paralegal', label: 'Помощник' },
  { value: 'admin', label: 'Администратор' },
  { value: 'viewer', label: 'Только чтение' },
]

interface LogEntry { id: number; user_email: string | null; action: string; entity_type: string; entity_id: number | null; new_value: string | null; created_at: string }

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'users' | 'logs'>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [createModal, setCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', full_name: '', password: '', role: 'lawyer' })
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    setLoading(true)
    Promise.all([
      tab === 'users' ? api.adminUsers() : Promise.resolve(null),
      tab === 'logs' ? api.adminLogs() : Promise.resolve(null),
    ]).then(([u, l]) => {
      if (u) setUsers(u)
      if (l) setLogs(l)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [tab, isAdmin])

  async function saveUser(u: AdminUser, patch: Partial<AdminUser>) {
    setSaving(true); setError('')
    try {
      const updated = await api.adminUpdateUser(u.id, patch)
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x))
      setEditUser(null)
    } catch (err: any) { setError(err.message ?? 'Ошибка') }
    finally { setSaving(false) }
  }

  async function deleteUser(id: number) {
    if (!confirm('Удалить пользователя?')) return
    await api.adminDeleteUser(id)
    setUsers(prev => prev.filter(x => x.id !== id))
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setCreateSaving(true); setCreateError('')
    try {
      const created = await api.adminCreateUser(createForm)
      setUsers(prev => [...prev, created])
      setCreateModal(false)
      setCreateForm({ email: '', full_name: '', password: '', role: 'lawyer' })
    } catch (err: any) { setCreateError(err.message ?? 'Ошибка') }
    finally { setCreateSaving(false) }
  }

  if (!isAdmin) {
    return <div className={s.page}><p className={s.noAccess}>Доступ только для администраторов</p></div>
  }

  return (
    <div className={s.page}>
      <h1 className={s.title}>Администрирование</h1>

      <div className={s.tabs}>
        <button className={`${s.tab} ${tab === 'users' ? s.tabActive : ''}`} onClick={() => setTab('users')}>Пользователи</button>
        <button className={`${s.tab} ${tab === 'logs' ? s.tabActive : ''}`} onClick={() => setTab('logs')}>Логи</button>
      </div>

      {tab === 'users' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button className={s.editBtn} onClick={() => { setCreateModal(true); setCreateError('') }}>
            + Создать пользователя
          </button>
        </div>
      )}

      {loading ? (
        <div className={s.loading}>Загрузка...</div>
      ) : tab === 'users' ? (
        <div className={s.table}>
          <div className={s.thead}>
            <span>Пользователь</span><span>Роль</span><span>Статус</span><span>Создан</span><span></span>
          </div>
          {users.map(u => (
            <div key={u.id} className={s.trow}>
              <div>
                <div className={s.userName}>{u.full_name}</div>
                <div className={s.userEmail}>{u.email}</div>
              </div>
              <span className={s.roleBadge}>{ROLES.find(r => r.value === u.role)?.label ?? u.role}</span>
              <span className={s.statusBadge} style={{ color: u.is_active ? '#16a34a' : '#dc2626' }}>
                {u.is_active ? 'Активен' : 'Заблокирован'}
              </span>
              <span className={s.dateCell}>{new Date(u.created_at).toLocaleDateString('ru')}</span>
              <div className={s.rowActions}>
                <button className={s.editBtn} onClick={() => setEditUser(u)}>Изменить</button>
                {u.id !== user?.id && (
                  <button className={s.delBtn} onClick={() => deleteUser(u.id)}>Удалить</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={s.table}>
          <div className={s.thead}>
            <span>Дата</span><span>Пользователь</span><span>Действие</span><span>Объект</span>
          </div>
          {logs.map(l => (
            <div key={l.id} className={s.trow}>
              <span className={s.dateCell}>{new Date(l.created_at).toLocaleString('ru', { dateStyle: 'short', timeStyle: 'short' })}</span>
              <span>{l.user_email ?? '—'}</span>
              <span className={s.actionBadge} data-action={l.action}>{l.action}</span>
              <span>{l.entity_type} {l.entity_id ? `#${l.entity_id}` : ''}</span>
            </div>
          ))}
          {logs.length === 0 && <p className={s.empty}>Логов нет</p>}
        </div>
      )}

      {createModal && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setCreateModal(false)}>
          <div className={s.modal}>
            <h2 className={s.modalTitle}>Новый пользователь</h2>
            <form className={s.form} onSubmit={createUser}>
              <label className={s.label}>Email
                <input className={s.input} type="email" required value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
              </label>
              <label className={s.label}>ФИО
                <input className={s.input} required value={createForm.full_name}
                  onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} />
              </label>
              <label className={s.label}>Пароль
                <input className={s.input} type="password" required minLength={6} value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} />
              </label>
              <label className={s.label}>Роль
                <select className={s.select} value={createForm.role}
                  onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              {createError && <div className={s.error}>{createError}</div>}
              <div className={s.btns}>
                <button type="button" className={s.cancelBtn} onClick={() => setCreateModal(false)}>Отмена</button>
                <button type="submit" className={s.saveBtn} disabled={createSaving}>
                  {createSaving ? 'Создаю...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setEditUser(null)}>
          <div className={s.modal}>
            <h2 className={s.modalTitle}>{editUser.full_name}</h2>
            <div className={s.form}>
              <label className={s.label}>Роль
                <select className={s.select} defaultValue={editUser.role}
                  onChange={e => setEditUser(prev => prev ? { ...prev, role: e.target.value } : prev)}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              <label className={s.label}>Статус
                <select className={s.select} defaultValue={String(editUser.is_active)}
                  onChange={e => setEditUser(prev => prev ? { ...prev, is_active: e.target.value === 'true' } : prev)}>
                  <option value="true">Активен</option>
                  <option value="false">Заблокирован</option>
                </select>
              </label>
              {error && <div className={s.error}>{error}</div>}
              <div className={s.btns}>
                <button className={s.cancelBtn} onClick={() => setEditUser(null)}>Отмена</button>
                <button className={s.saveBtn} disabled={saving}
                  onClick={() => saveUser(editUser, { role: editUser.role, is_active: editUser.is_active })}>
                  {saving ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
