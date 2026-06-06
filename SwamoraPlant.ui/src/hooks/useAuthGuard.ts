import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/auth-client'

/**
 * Verifies the stored JWT against the server once on mount.
 * Returns `ready` to gate rendering and avoid flash of unauthenticated UI.
 */
export function useAuthGuard() {
  const { token, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate({ to: '/' })
      return
    }
    authApi
      .me(token)
      .then((u) => {
        setAuth(u, token)
        setReady(true)
      })
      .catch(() => {
        clearAuth()
        navigate({ to: '/' })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ready
}
