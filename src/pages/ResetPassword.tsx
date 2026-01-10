import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from '../lib/auth'
import { Spinner } from '../components/Spinner'
import { supabase } from '../lib/supabaseClient'

export function ResetPassword() {
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!ignore) setReady(!!session)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setReady(!!session)
    })
    return () => {
      ignore = true
      sub.subscription.unsubscribe()
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updatePassword(password)
      nav('/app/dashboard')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border shadow-sm p-6">
        <h1 className="text-xl font-semibold">Set a new password</h1>

        {!ready ? (
          <div className="mt-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2"><Spinner /> Validating reset link…</span>
            <div className="mt-2">If this screen does not proceed, open the reset link again from your email.</div>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm text-slate-700">New password</label>
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={8} />
              <div className="mt-1 text-xs text-slate-500">Minimum 8 characters.</div>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <button disabled={busy} className="w-full rounded-lg bg-slate-900 text-white py-2 hover:bg-slate-800 disabled:opacity-60">
              {busy ? <span className="inline-flex items-center gap-2"><Spinner /> Updating</span> : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
