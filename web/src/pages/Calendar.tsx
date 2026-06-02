import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { CalendarEvent } from '../api/types'
import s from './Calendar.module.css'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function pad(n: number) { return String(n).padStart(2, '0') }
function toKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}` }

export default function Calendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    const start = `${year}-${pad(month + 1)}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`
    setLoading(true)
    api.calendar(start, end)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [year, month])

  // Map: "YYYY-MM-DD" → events[]
  const byDay = events.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    const key = e.hearing_date.slice(0, 10)
    ;(acc[key] = acc[key] ?? []).push(e)
    return acc
  }, {})

  // Build calendar grid
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const startOffset = (firstDow + 6) % 7            // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate())
  const selectedEvents = selectedDay ? (byDay[selectedDay] ?? []) : []

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Календарь</h1>
      </div>

      <div className={s.layout}>
        <div className={s.calendarCard}>
          {/* Navigation */}
          <div className={s.nav}>
            <button className={s.navBtn} onClick={prev}>‹</button>
            <span className={s.monthLabel}>{MONTHS[month]} {year}</span>
            <button className={s.navBtn} onClick={next}>›</button>
          </div>

          {/* Weekday headers */}
          <div className={s.grid}>
            {WEEKDAYS.map(d => (
              <div key={d} className={s.weekday}>{d}</div>
            ))}

            {/* Day cells */}
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className={s.emptyCell} />
              const key = toKey(year, month, day)
              const hasEvents = !!byDay[key]?.length
              const isToday = key === todayKey
              const isSelected = key === selectedDay
              return (
                <div
                  key={key}
                  className={`${s.cell} ${isToday ? s.today : ''} ${isSelected ? s.selected : ''} ${hasEvents ? s.hasEvents : ''}`}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                >
                  <span className={s.dayNum}>{day}</span>
                  {hasEvents && (
                    <div className={s.dots}>
                      {byDay[key].slice(0, 3).map((_, di) => (
                        <span key={di} className={s.dot} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {loading && <div className={s.loadingBar} />}
        </div>

        {/* Sidebar — selected day events */}
        <div className={s.sidebar}>
          {selectedDay ? (
            <>
              <div className={s.sidebarTitle}>
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'long', weekday: 'long',
                })}
              </div>
              {selectedEvents.length === 0 ? (
                <div className={s.noEvents}>Заседаний нет</div>
              ) : (
                <div className={s.eventList}>
                  {selectedEvents.map(e => (
                    <Link key={e.case_id} to={`/cases/${e.case_id}`} className={s.eventCard}>
                      <div className={s.eventTime}>{formatTime(e.hearing_date)}</div>
                      <div className={s.eventTitle}>{e.title}</div>
                      {e.case_number && <div className={s.eventMeta}>№ {e.case_number}</div>}
                      {e.court && <div className={s.eventMeta}>{e.court}</div>}
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={s.hint}>
              {events.length > 0
                ? `${events.length} заседани${events.length === 1 ? 'е' : events.length < 5 ? 'я' : 'й'} в этом месяце`
                : 'Нет заседаний в этом месяце'}
              <br /><span className={s.hintSub}>Нажми на дату чтобы увидеть детали</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
