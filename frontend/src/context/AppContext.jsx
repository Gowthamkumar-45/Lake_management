import React, { createContext, useContext, useState, useCallback } from 'react'
import { auth as authApi } from '../services/api.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [role, setRole] = useState(() => {
    // Require both token and role — no token means session is stale
    if (!localStorage.getItem('wbms_token')) {
      localStorage.removeItem('wbms_role')
      localStorage.removeItem('wbms_user')
      return null
    }
    return localStorage.getItem('wbms_role') || null
  })
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem('wbms_token')) return null
    const saved = localStorage.getItem('wbms_user')
    return saved ? JSON.parse(saved) : null
  })
  const [toastMsg, setToastMsg] = useState(null)
  const [toastType, setToastType] = useState('info')

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password)
    localStorage.setItem('wbms_token', data.token)
    localStorage.setItem('wbms_role', data.role)
    localStorage.setItem('wbms_user', JSON.stringify(data))
    setRole(data.role)
    setUser(data)
    return data
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch {}
    localStorage.removeItem('wbms_token')
    localStorage.removeItem('wbms_role')
    localStorage.removeItem('wbms_user')
    setRole(null)
    setUser(null)
  }, [])

  const toast = useCallback((msg, type = 'info') => {
    setToastMsg(msg)
    setToastType(type)
    setTimeout(() => setToastMsg(null), 3500)
  }, [])

  const clearToast = useCallback(() => setToastMsg(null), [])

  return (
    <AppContext.Provider value={{ role, user, login, logout, toast, toastMsg, toastType, clearToast }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
