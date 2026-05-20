import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authApi } from '@/lib/auth-client'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LeafMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className="w-10 h-10"
      aria-hidden="true"
    >
      <path
        d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4z"
        fill="var(--color-primary, #2d5a27)"
        opacity="0.12"
      />
      <path
        d="M32 10C20 12 14 20 12 32c4-2 8-3 12-3 8 0 14-6 14-14 0-2-.3-3.7-1-5H32z"
        fill="var(--color-primary, #2d5a27)"
        opacity="0.7"
      />
      <path
        d="M12 32c0 0 4-8 14-10"
        stroke="var(--color-primary, #2d5a27)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { token, user } = await authApi.login(email, password)
      setAuth(user, token)
      navigate({ to: '/' })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="flex flex-col items-center mb-10 gap-3">
          <LeafMark />
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">FarmSight</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sign in to continue</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-lg px-8 py-8 shadow-paper">
          {error && (
            <div className="mb-5 px-3 py-2.5 bg-destructive/8 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        {/* Footer mark */}
        <p className="text-center text-xs text-muted-foreground/60 mt-8">
          Plant identification system
        </p>
      </div>
    </div>
  )
}
