import React, { useEffect, useState } from 'react'
import { createLeaveRequest, fetchLeaveTypes } from '../lib/api'
import { Spinner } from '../components/Spinner'

export function NewRequest() {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [type, setType] = useState('')
  const [types, setTypes] = useState<string[]>([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    async function run() {
      setTypesLoading(true)
      try {
        const list = await fetchLeaveTypes()
        if (!ignore) {
          setTypes(list)
          setType(list[0] ?? '')
        }
      } catch (e: any) {
        if (!ignore) setErr(e?.message ?? 'Failed to load leave types')
      } finally {
        if (!ignore) setTypesLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      if (!start || !end) throw new Error('Please select dates')
      if (!type) throw new Error('Please select a leave type')
      await createLeaveRequest({ start_date: start, end_date: end, leave_type: type, reason })
      setMsg('Request submitted successfully.')
      setStart('')
      setEnd('')
      setReason('')
      setType(types[0] ?? '')
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to submit')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">New leave request</h1>
      <div className="mt-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">Start date</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" value={start} onChange={e => setStart(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">End date</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" value={end} onChange={e => setEnd(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">Type</label>
            {typesLoading ? (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300"><Spinner /> Loading leave types…</div>
            ) : (
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">Reason (optional)</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., family event" />
          </div>

          <div className="md:col-span-2">
            {msg && <div className="text-sm text-green-700 dark:text-green-300">{msg}</div>}
            {err && <div className="text-sm text-red-600 dark:text-red-300">{err}</div>}
          </div>

          <div className="md:col-span-2">
            <button
              disabled={busy || typesLoading}
              className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 disabled:opacity-60"
            >
              {busy ? <span className="inline-flex items-center gap-2"><Spinner /> Submitting</span> : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
