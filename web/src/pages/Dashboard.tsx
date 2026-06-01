import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import type { Case } from '../api/types'
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS } from '../api/types'
import s from './Dashboard.module.css'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.cases({ limit: 200 } as Parameters<typeof api.cases>[0])
      .then(setCases)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const active = cases.filter(c => c.status === 'active').length
  const won    = cases.filter(c => c.status === 'won').length
  const lost   = cases.filter(c => c.status === 'lost').length
  const total  = cases.length

  const upcoming = cases
    .filter(c => c.next_hearing_date && new Date(c.next_hearing_date) >= now)
    .sort((a, b) => new Date(a.next_hearing_date!).getTime() - new Date(b.next_hearing_date!).getTime())
    .slice(0, 5)

  const overdue = cases.filter(
    c => c.next_hearing_date && new Date(c.next_hearing_date) < now && c.status === 'active'
  )

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
  const firstName = user?.full_name?.split(' ')[0] ?? ''

  return (
    <div className={s.page}>
      <div className={s.welcome}>
        <h1 className={s.greeting}>{greeting}{firstName ? `, ${firstName}` : ''}</h1>
        <p className={s.date}>{now.toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {loading ? (
        <div className={s.loading}>Загрузка...</div>
      ) : (
        <>
          <div className={s.statsGrid}>
            <StatCard label="Всего дел" value={total} color="var(--c-navy)" />
            <StatCard label="Активных" value={active} color="#16a34a" />
            <StatCard label="Выиграно" value={won} color="#2563eb" />
            <StatCard label="Проиграно" value={lost} color="#dc2626" />
          </div>

          {overdue.length > 0 && (
            <div className={s.section}>
              <h2 className={s.sectionTitle}>
                <span className={s.alertDot} />
                Просроченные заседания ({overdue.length})
              </h2>
              <div className={s.caseList}>
                {overdue.map(c => <CaseRow key={c.id} c={c} onClick={() => navigate(`/cases/${c.id}`)} overdue />)}
              </div>
            </div>
          )}

          <div className={s.section}>
            <h2 className={s.sectionTitle}>Ближайшие заседания</h2>
            {upcoming.length === 0 ? (
              <p className={s.empty}>Нет запланированных заседаний</p>
            ) : (
              <div className={s.caseList}>
                {upcoming.map(c => <CaseRow key={c.id} c={c} onClick={() => navigate(`/cases/${c.id}`)} />)}
              </div>
            )}
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}>Активные дела</h2>
            {active === 0 ? (
              <p className={s.empty}>Нет активных дел</p>
            ) : (
              <div className={s.caseList}>
                {cases
                  .filter(c => c.status === 'active')
                  .slice(0, 8)
                  .map(c => <CaseRow key={c.id} c={c} onClick={() => navigate(`/cases/${c.id}`)} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={s.statCard}>
      <span className={s.statValue} style={{ color }}>{value}</span>
      <span className={s.statLabel}>{label}</span>
    </div>
  )
}

function CaseRow({ c, onClick, overdue }: { c: Case; onClick: () => void; overdue?: boolean }) {
  return (
    <div className={s.caseRow} onClick={onClick}>
      <div className={s.caseRowLeft}>
        <span className={s.caseRowTitle}>{c.title}</span>
        <div className={s.caseRowMeta}>
          {c.case_number && <span>№ {c.case_number}</span>}
          {c.client && <span>👤 {c.client.full_name}</span>}
          {c.category && <span>{CATEGORY_LABELS[c.category]}</span>}
        </div>
      </div>
      <div className={s.caseRowRight}>
        {c.next_hearing_date && (
          <span className={`${s.hearingDate} ${overdue ? s.overdue : ''}`}>
            📅 {new Date(c.next_hearing_date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
          </span>
        )}
        <span
          className={s.badge}
          style={{ color: STATUS_COLORS[c.status], background: STATUS_COLORS[c.status] + '22' }}
        >
          {STATUS_LABELS[c.status]}
        </span>
      </div>
    </div>
  )
}
