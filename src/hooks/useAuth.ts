import { useContext } from 'react'

import { AuthContext } from '@/hooks/AuthContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다')
  }
  return ctx
}
