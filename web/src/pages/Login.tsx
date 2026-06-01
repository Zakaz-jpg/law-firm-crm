import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getBaseUrl, setBaseUrl } from '../api/client'
import s from './Login.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [serverUrl, setServerUrl] = useState(getBaseUrl)
  const [showServer, setShowServer] = useState(!getBaseUrl())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (serverUrl) setBaseUrl(serverUrl)
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/cases')
    } catch (err) {
      setError((err as Error).message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>⚖️</div>
        <h1 className={s.title}>LawCRM</h1>
        <p className={s.subtitle}>Управление делами</p>

        <form className={s.form} onSubmit={handleSubmit}>
          <input
            className={s.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className={s.input}
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <div className={s.error}>{error}</div>}

          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <button className={s.serverToggle} onClick={() => setShowServer(v => !v)} type="button">
          🌐 {showServer ? 'Скрыть' : 'Адрес сервера'}
        </button>

        {showServer && (
          <div className={s.serverField}>
            <input
              className={s.input}
              type="url"
              placeholder="https://xxxx.loca.lt"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
            />
            <p className={s.hint}>URL без /api/v1 в конце</p>
          </div>
        )}
      </div>
    </div>
  )
}
