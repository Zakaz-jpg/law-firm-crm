import { Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Calendar from './pages/Calendar'
import Lawyers from './pages/Lawyers'
import Admin from './pages/Admin'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: '40px', fontFamily: 'monospace', color: '#dc2626', background: '#fff', minHeight: '100vh' }}>
        <h2>Ошибка приложения</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>{this.state.error}</pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '8px 16px', cursor: 'pointer' }}>
          Перезагрузить
        </button>
      </div>
    )
    return this.props.children
  }
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/lawyers" element={<Lawyers />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  )
}
