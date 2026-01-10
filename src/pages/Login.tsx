import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../lib/auth'
import { Spinner } from '../components/Spinner'
import { ThemeToggle } from '../components/ThemeToggle'

export function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      nav('/app/dashboard')
    } catch (err: any) {
      setError(err?.message ?? 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Use your company email and password.</p>
          </div>
          <ThemeToggle />
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

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 text-white py-2 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 disabled:opacity-60"
          >
            {busy ? <span className="inline-flex items-center gap-2"><Spinner /> Signing in</span> : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <Link to="/forgot-password" className="text-slate-900 dark:text-slate-100 underline">Forgot password?</Link>
        </div>
      </div>
    </div>
  )
}
