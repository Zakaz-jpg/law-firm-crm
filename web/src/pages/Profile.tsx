import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import s from './Profile.module.css'

const ROLES = [
  { value: 'lawyer', label: 'Адвокат' },
  { value: 'senior_lawyer', label: 'Старший адвокат' },
  { value: 'jurist', label: 'Юрист' },
  { value: 'paralegal', label: 'Помощник юриста' },
  { value: 'admin', label: 'Администратор' },
]

export function roleLabel(role?: string | null) {
  return ROLES.find(r => r.value === role)?.label ?? role ?? '—'
}

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [role, setRole] = useState(user?.role ?? 'lawyer')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess(false)
    setProfileSaving(true)
    try {
      await updateUser({ full_name: fullName.trim(), role })
      setProfileSuccess(true)
    } catch (err: any) {
      setProfileError(err.message ?? 'Ошибка сохранения')
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess(false)
    if (newPwd !== confirmPwd) {
      setPwdError('Новые пароли не совпадают')
      return
    }
    if (newPwd.length < 6) {
      setPwdError('Пароль должен быть не менее 6 символов')
      return
    }
    setPwdSaving(true)
    try {
      await api.changePassword(currentPwd, newPwd)
      setPwdSuccess(true)
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err: any) {
      setPwdError(err.message ?? 'Ошибка смены пароля')
    } finally {
      setPwdSaving(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className={s.page}>
      <h1 className={s.title}>Профиль</h1>

      <div className={s.avatarRow}>
        <div className={s.avatar}>{initials}</div>
        <div>
          <div className={s.avatarName}>{user?.full_name}</div>
          <div className={s.avatarEmail}>{user?.email}</div>
        </div>
      </div>

      <div className={s.sections}>
        {/* Личные данные */}
        <section className={s.card}>
          <h2 className={s.sectionTitle}>Личные данные</h2>
          <form onSubmit={handleProfileSave} className={s.form}>
            <label className={s.label}>
              Полное имя
              <input
                className={s.input}
                value={fullName}
                onChange={e => { setFullName(e.target.value); setProfileSuccess(false) }}
                placeholder="Имя Фамилия"
                required
              />
            </label>
            <label className={s.label}>
              Роль
              <select
                className={s.select}
                value={role}
                onChange={e => { setRole(e.target.value); setProfileSuccess(false) }}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            {profileError && <div className={s.error}>{profileError}</div>}
            {profileSuccess && <div className={s.success}>Сохранено</div>}
            <button className={s.saveBtn} type="submit" disabled={profileSaving}>
              {profileSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        </section>

        {/* Смена пароля */}
        <section className={s.card}>
          <h2 className={s.sectionTitle}>Смена пароля</h2>
          <form onSubmit={handlePasswordSave} className={s.form}>
            <label className={s.label}>
              Текущий пароль
              <input
                className={s.input}
                type="password"
                value={currentPwd}
                onChange={e => { setCurrentPwd(e.target.value); setPwdSuccess(false) }}
                required
                autoComplete="current-password"
              />
            </label>
            <label className={s.label}>
              Новый пароль
              <input
                className={s.input}
                type="password"
                value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setPwdSuccess(false) }}
                required
                autoComplete="new-password"
              />
            </label>
            <label className={s.label}>
              Повторите новый пароль
              <input
                className={s.input}
                type="password"
                value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setPwdSuccess(false) }}
                required
                autoComplete="new-password"
              />
            </label>
            {pwdError && <div className={s.error}>{pwdError}</div>}
            {pwdSuccess && <div className={s.success}>Пароль изменён</div>}
            <button className={s.saveBtn} type="submit" disabled={pwdSaving}>
              {pwdSaving ? 'Сохранение…' : 'Изменить пароль'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
