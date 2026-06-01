import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import s from './Layout.module.css'

function ScalesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M5 8l7-5 7 5"/>
      <path d="M5 8l-3 7h6L5 8zM19 8l-3 7h6L19 8z"/>
      <path d="M2 15c0 1.66 1.34 3 3 3s3-1.34 3-3"/>
      <path d="M16 15c0 1.66 1.34 3 3 3s3-1.34 3-3"/>
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12"/>
      <path d="M2 12h20"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className={s.root}>
      <aside className={s.sidebar}>
        <div className={s.logo}>
          <div className={s.logoIcon}><ScalesIcon /></div>
          <span className={s.logoText}>LawCRM</span>
        </div>

        <nav className={s.nav}>
          <NavLink to="/" end className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
            <HomeIcon />
            Дашборд
          </NavLink>
          <NavLink to="/cases" className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
            <BriefcaseIcon />
            Дела
          </NavLink>
          <NavLink to="/clients" className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
            <UsersIcon />
            Клиенты
          </NavLink>
        </nav>

        <div className={s.footer}>
          <Link to="/profile" className={s.user}>
            <div className={s.avatar}>{initials}</div>
            <div className={s.userInfo}>
              <div className={s.userName}>{user?.full_name}</div>
              <div className={s.userEmail}>{user?.email}</div>
            </div>
          </Link>
          <button className={s.logoutBtn} onClick={handleLogout}>
            <LogOutIcon />
            Выйти
          </button>
        </div>
      </aside>

      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  )
}
