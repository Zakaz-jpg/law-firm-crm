import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { isAuthenticated, clearTokens, saveTokens, api } from '../api/client'

interface AuthContextType {
  isLoggedIn: boolean
  user: { id: number; email: string; full_name: string; role: string } | null
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => void
  updateUser: (data: { full_name?: string; role?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated)
  const [user, setUser] = useState<AuthContextType['user']>(null)

  useEffect(() => {
    if (isLoggedIn && !user) {
      api.me().then(setUser).catch(() => { clearTokens(); setIsLoggedIn(false) })
    }
  }, [isLoggedIn])

  async function login(email: string, password: string, remember = true) {
    const tokens = await api.login(email, password)
    saveTokens(tokens, remember)
    setIsLoggedIn(true)
    const me = await api.me()
    setUser(me)
  }

  function logout() {
    clearTokens()
    setIsLoggedIn(false)
    setUser(null)
  }

  async function updateUser(data: { full_name?: string; role?: string }) {
    const updated = await api.updateProfile(data)
    setUser(updated)
  }

  return <AuthContext.Provider value={{ isLoggedIn, user, login, logout, updateUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
