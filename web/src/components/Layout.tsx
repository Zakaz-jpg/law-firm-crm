import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import s from './Layout.module.css'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={s.root}>
      <aside className={s.sidebar}>
        <div className={s.logo}>
          <span className={s.logoIcon}>⚖️</span>
          <span className={s.logoText}>LawCRM</span>
        </div>
        <nav className={s.nav}>
          <NavLink to="/cases" className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
            📁 Дела
          </NavLink>
          <NavLink to="/clients" className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
            👥 Клиенты
          </NavLink>
        </nav>
        <div className={s.footer}>
          <div className={s.userInfo}>
            <div className={s.userName}>{user?.full_name}</div>
            <div className={s.userEmail}>{user?.email}</div>
          </div>
          <button className={s.logoutBtn} onClick={handleLogout}>Выйти</button>
        </div>
      </aside>
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  )
}
