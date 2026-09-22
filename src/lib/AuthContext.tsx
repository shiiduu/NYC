import { createContext, useContext, useMemo, useState } from 'react'

const MEMBER_KEY = 'trip_member'

export interface TripMember {
  id: string
  username: string
}

interface AuthContextValue {
  member: TripMember | null
  login: (member: TripMember) => void
  logout: () => void
}

function readStoredMember(): TripMember | null {
  try {
    const raw = localStorage.getItem(MEMBER_KEY)
    return raw ? (JSON.parse(raw) as TripMember) : null
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<TripMember | null>(readStoredMember)

  const value = useMemo<AuthContextValue>(
    () => ({
      member,
      login: (nextMember) => {
        try {
          localStorage.setItem(MEMBER_KEY, JSON.stringify(nextMember))
        } catch {
          // localStorage evtl. nicht verfügbar - Login gilt dann nur für diese Session
        }
        setMember(nextMember)
      },
      logout: () => {
        try {
          localStorage.removeItem(MEMBER_KEY)
        } catch {
          // ignore
        }
        setMember(null)
      },
    }),
    [member],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  }
  return context
}
