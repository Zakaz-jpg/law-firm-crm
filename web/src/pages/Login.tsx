import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, getBaseUrl, setBaseUrl, saveTokens } from '../api/client'
import s from './Login.module.css'

type Step = 'credentials' | 'code'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [serverUrl, setServerUrl] = useState(getBaseUrl)
  const [showServer, setShowServer] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1: validate password, then send code
  async function handleCredentials(e: FormEvent) {
    e.preventDefault()
    if (serverUrl) setBaseUrl(serverUrl)
    setLoading(true)
    setError('')
    try {
      // Validate password (tokens discarded — only used to confirm credentials)
      await api.login(email, password)
      // Password OK → send verification code
      await api.requestCode(email)
      setStep('code')
    } catch (err) {
      setError((err as Error).message || 'Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: verify code → save tokens → enter app
  async function handleCode(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const tokens = await api.verifyCode(email, code.trim())
      saveTokens(tokens, remember)
      navigate('/cases')
    } catch (err) {
      setError((err as Error).message || 'Неверный или истёкший код')
    } finally {
      setLoading(false)
    }
  }

  const logo = (
    <div className={s.brand}>
      <div className={s.logo}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L3 7l9 5 9-5-9-5z"/>
          <path d="M3 12l9 5 9-5"/>
          <path d="M3 17l9 5 9-5"/>
        </svg>
      </div>
      <h1 className={s.title}>LawCRM</h1>
      <p className={s.subtitle}>Управление юридическими делами</p>
    </div>
  )

  const serverSection = (
    <div className={s.serverSection}>
      <button className={s.serverToggle} onClick={() => setShowServer(v => !v)} type="button">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
          <line x1="6" y1="6" x2="6.01" y2="6"/>
          <line x1="6" y1="18" x2="6.01" y2="18"/>
        </svg>
        {showServer ? 'Скрыть адрес сервера' : 'Настроить сервер'}
      </button>
      {showServer && (
        <div className={s.serverField}>
          <input className={s.input} type="url" placeholder="https://xxxx.loca.lt" value={serverUrl} onChange={e => setServerUrl(e.target.value)} />
          <p className={s.hint}>URL без /api/v1 в конце</p>
        </div>
      )}
    </div>
  )

  if (step === 'code') {
    return (
      <div className={s.page}>
        <div className={s.card}>
          {logo}
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
            Код подтверждения отправлен на <strong>{email}</strong>
          </p>
          <form className={s.form} onSubmit={handleCode}>
            <div className={s.field}>
              <label className={s.label} htmlFor="code">Код из письма</label>
              <input
                id="code"
                className={s.input}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="123456"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {error && <div className={s.error}>{error}</div>}

            <div className={s.options}>
              <label className={s.checkLabel}>
                <input type="checkbox" className={s.checkbox} checked={remember} onChange={e => setRemember(e.target.checked)} />
                <span className={s.checkText}>Запомнить меня</span>
              </label>
            </div>

            <button className={s.btn} type="submit" disabled={loading || code.length < 6}>
              {loading ? <span className={s.spinner} /> : 'Войти'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button type="button" className={s.serverToggle} onClick={() => { setStep('credentials'); setError(''); setCode('') }}>
                Назад
              </button>
              <button
                type="button"
                className={s.serverToggle}
                disabled={loading}
                onClick={async () => {
                  setError('')
                  setCode('')
                  try { await api.requestCode(email) } catch (err) { setError((err as Error).message) }
                }}
              >
                Отправить снова
              </button>
            </div>
          </form>
          {serverSection}
        </div>
      </div>
    )
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        {logo}
        <form className={s.form} onSubmit={handleCredentials}>
          <div className={s.field}>
            <label className={s.label} htmlFor="email">Email</label>
            <input
              id="email"
              className={s.input}
              type="email"
              placeholder="name@firm.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="password">Пароль</label>
            <div className={s.passwordWrap}>
              <input
                id="password"
                className={s.input}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button className={s.eyeBtn} type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className={s.error}>{error}</div>}

          <div className={s.options}>
            <label className={s.checkLabel}>
              <input type="checkbox" className={s.checkbox} checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span className={s.checkText}>Запомнить меня</span>
            </label>
          </div>

          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? <span className={s.spinner} /> : 'Далее'}
          </button>
        </form>
        {serverSection}
      </div>
    </div>
  )
}
