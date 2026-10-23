import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface AdminSessionValue {
  token: string
  setToken: (token: string) => void
  clearToken: () => void
}

const AdminSessionContext = createContext<AdminSessionValue | undefined>(undefined)

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState('')
  const value = useMemo(() => ({ token, setToken, clearToken: () => setToken('') }), [token])
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
}

export function useAdminSession(): AdminSessionValue {
  const context = useContext(AdminSessionContext)
  if (!context) throw new Error('AdminSessionProvider가 필요합니다.')
  return context
}
