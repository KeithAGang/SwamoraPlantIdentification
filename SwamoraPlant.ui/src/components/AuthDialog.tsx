import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { authApi } from '@/lib/auth-client'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface AuthDialogProps {
  open: boolean
  onClose: () => void
  initialMode?: 'login' | 'signup'
}

function LeafMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
      <path
        d="M12 2C7 4 4 8 4 13c0 5 4 9 9 9 4 0 7-3 7-7 0-6-5-11-8-13z"
        fill="#caf26b"
        stroke="#9be24a"
        strokeWidth="1"
      />
      <path
        d="M8 16c2-4 5-6 9-7"
        stroke="#5fa42d"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function AuthDialog({ open, onClose, initialMode = 'login' }: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setName('')
      setEmail('')
      setPassword('')
      setError('')
      setLoading(false)
    }
  }, [open, initialMode])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result =
        mode === 'login'
          ? await authApi.login(email, password)
          : await authApi.signup(name, email, password)
      setAuth(result.user, result.token)
      onClose()
      navigate({ to: '/dashboard' })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(
        axiosErr.response?.data?.error ||
          (mode === 'login'
            ? 'Invalid email or password'
            : 'Could not create account'),
      )
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-7 sm:p-8">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 h-9 w-9 rounded-full bg-neutral-100 hover:bg-neutral-200 inline-flex items-center justify-center text-neutral-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2 mb-6">
          <LeafMark />
          <span className="text-lg font-semibold tracking-tight text-neutral-900">
            FarmSight
          </span>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          {mode === 'login'
            ? 'Sign in to continue to your dashboard.'
            : 'Join FarmSight and grow smarter with AI.'}
        </p>

        {/* Tabs */}
        <div className="mt-5 inline-flex bg-neutral-100 rounded-full p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={
              'px-4 py-1.5 rounded-full transition-colors ' +
              (mode === 'login'
                ? 'bg-[#caf26b] text-neutral-900 font-medium shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900')
            }
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={
              'px-4 py-1.5 rounded-full transition-colors ' +
              (mode === 'signup'
                ? 'bg-[#caf26b] text-neutral-900 font-medium shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900')
            }
          >
            Sign up
          </button>
        </div>

        {error && (
          <div className="mt-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-name" className="text-sm font-medium text-neutral-800">
                Full name
              </Label>
              <Input
                id="auth-name"
                type="text"
                autoComplete="name"
                placeholder="Jane Farmer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 rounded-xl px-3"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-sm font-medium text-neutral-800">
              Email
            </Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl px-3"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password" className="text-sm font-medium text-neutral-800">
              Password
            </Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              className="h-11 rounded-xl px-3"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-[#caf26b] text-neutral-900 font-medium hover:bg-[#bce855] shadow-sm"
          >
            {loading
              ? mode === 'login'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-5">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-neutral-900 font-medium hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-neutral-900 font-medium hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>,
    document.body,  )
}