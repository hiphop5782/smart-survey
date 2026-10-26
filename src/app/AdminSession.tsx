import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface AdminSessionValue {
  token: string
  githubLogin: string
  connect: (token: string, githubLogin: string) => void
  clearToken: () => void
}

const AdminSessionContext = createContext<AdminSessionValue | undefined>(undefined)

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState('')
  const [githubLogin, setGitHubLogin] = useState('')
  const value = useMemo(() => ({
    token,
    githubLogin,
    connect: (nextToken: string, nextLogin: string) => {
      setToken(nextToken)
      setGitHubLogin(nextLogin)
    },
    clearToken: () => {
      setToken('')
      setGitHubLogin('')
    },
  }), [githubLogin, token])
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
}

export function useAdminSession(): AdminSessionValue {
  const context = useContext(AdminSessionContext)
  if (!context) throw new Error('AdminSessionProvider가 필요합니다.')
  return context
}
