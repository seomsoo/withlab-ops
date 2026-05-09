import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/ui/Logo'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? '/'

  const canSubmit = email.trim().length > 0 && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setError('')
    setSubmitting(true)

    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-5 py-10">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-[120px] -top-[160px] h-[480px] w-[480px] rounded-full bg-primary-100 opacity-50"
          style={{ filter: 'blur(80px)' }}
        />
        <div
          className="absolute -bottom-[140px] -right-[80px] h-[380px] w-[380px] rounded-full bg-primary-100 opacity-50"
          style={{ filter: 'blur(80px)' }}
        />
      </div>

      <div className="relative flex w-full flex-col items-center gap-[18px]">
        {/* Login card */}
        <div
          className="w-full max-w-[420px] rounded-radius-xl border border-line bg-card"
          style={{
            padding: '36px 36px 32px',
            boxShadow:
              '0 8px 24px rgba(20,28,40,.04), 0 1px 2px rgba(20,28,40,.04)',
          }}
        >
          {/* Brand */}
          <div className="mb-7">
            <Logo size="md" showText showSub />
          </div>

          {/* Form */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-[12.5px] font-semibold text-t-mid">
                이메일
              </label>
              <div className="flex h-12 items-center gap-2.5 rounded-radius-md border border-transparent bg-gray-100 px-3.5 transition-all duration-150 focus-within:border-primary focus-within:bg-card focus-within:shadow-[0_0_0_4px_rgba(49,130,246,.12)]">
                <Mail size={16} className="text-t-mute" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@withlab.kr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 border-none bg-transparent text-[14.5px] text-t-strong outline-none placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-[12.5px] font-semibold text-t-mid">
                비밀번호
              </label>
              <div className="flex h-12 items-center gap-2.5 rounded-radius-md border border-transparent bg-gray-100 px-3.5 transition-all duration-150 focus-within:border-primary focus-within:bg-card focus-within:shadow-[0_0_0_4px_rgba(49,130,246,.12)]">
                <Lock size={16} className="text-t-mute" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 border-none bg-transparent text-[14.5px] text-t-strong outline-none placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  className="grid h-7 w-7 place-items-center rounded-[6px] text-t-mute transition-colors hover:bg-gray-300 hover:text-t-strong"
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="text-[13px] font-medium text-error">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="mt-2 flex h-[50px] w-full items-center justify-center gap-2 rounded-radius-md bg-primary text-[14.5px] font-bold tracking-tight text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-500"
            >
              {submitting && <LoadingSpinner size="sm" />}
              로그인
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
