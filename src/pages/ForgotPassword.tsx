import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordReset } from '../lib/auth'
import { Spinner } from '../components/Spinner'
import { ThemeToggle } from '../components/ThemeToggle'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      await sendPasswordReset(email.trim())
      setMessage('Password reset email sent. Please check your inbox.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send reset email')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Reset password</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Enter your email to receive a reset link.</p>
          </div>
          <ThemeToggle />
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">Email</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
          </div>

          {message && <div className="text-sm text-green-700 dark:text-green-300">{message}</div>}
          {error && <div className="text-sm text-red-600 dark:text-red-300">{error}</div>}

          <button
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 text-white py-2 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 disabled:opacity-60"
          >
            {busy ? <span className="inline-flex items-center gap-2"><Spinner /> Sending</span> : 'Send reset email'}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <Link to="/login" className="text-slate-700 dark:text-slate-200 underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
