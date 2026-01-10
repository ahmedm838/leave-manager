import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn, signUpEmployee } from '../lib/auth'
import { Spinner } from '../components/Spinner'
import { ThemeToggle } from '../components/ThemeToggle'

export function Login() {
  const nav = useNavigate()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function switchTab(next: 'signin' | 'signup') {
    setTab(next)
    setError(null)
    setBusy(false)
    setPassword('')
    setConfirmPassword('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const cleanEmail = email.trim()
      if (tab === 'signin') {
        await signIn(cleanEmail, password)
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        await signUpEmployee(cleanEmail, password)
      }
      nav('/app/dashboard')
    } catch (err: any) {
      setError(err?.message ?? (tab === 'signin' ? 'Sign in failed' : 'Sign up failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{tab === 'signin' ? 'Sign in' : 'Sign up'}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {tab === 'signin'
                ? 'Use your company email and password.'
                : 'Create your password using your company email.'}
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => switchTab('signin')}
            className={`px-3 py-2 text-sm ${tab === 'signin' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-transparent text-slate-700 dark:text-slate-200'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchTab('signup')}
            className={`px-3 py-2 text-sm ${tab === 'signup' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-transparent text-slate-700 dark:text-slate-200'}`}
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">Email</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
          </div>
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">Password</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
          </div>

          {tab === 'signup' && (
            <div>
              <label className="text-sm text-slate-700 dark:text-slate-200">Re-type password</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                type="password"
                required
              />
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 text-white py-2 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 disabled:opacity-60"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> {tab === 'signin' ? 'Signing in' : 'Creating account'}
              </span>
            ) : (
              tab === 'signin' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        {tab === 'signin' && (
          <div className="mt-4 text-sm">
            <Link to="/forgot-password" className="text-slate-900 dark:text-slate-100 underline">Forgot password?</Link>
          </div>
        )}
      </div>
    </div>
  )
}
