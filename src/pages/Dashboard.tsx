import React, { useEffect, useState } from 'react'
import { fetchMyLeaveSummary } from '../lib/api'
import { Spinner } from '../components/Spinner'
import { Link } from 'react-router-dom'

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white border shadow-sm p-4">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const s = await fetchMyLeaveSummary()
        if (!ignore) setSummary(s)
      } catch (e: any) {
        if (!ignore) setError(e?.message ?? 'Failed to load summary')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link to="/app/request-new" className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm hover:bg-slate-800">New request</Link>
      </div>

      {loading ? (
        <div className="mt-6"><Spinner /></div>
      ) : error ? (
        <div className="mt-6 text-sm text-red-600">{error}</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Annual remaining (current year)" value={String(summary?.annual_remaining ?? '—')} sub="Days" />
          <Card title="Sudden remaining (current year)" value={String(summary?.sudden_remaining ?? '—')} sub="Days" />
          <Card title="Approved sick (current year)" value={String(summary?.sick_used ?? '—')} sub="Days" />
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-white border shadow-sm p-4">
        <div className="font-semibold">Tips</div>
        <ul className="mt-2 text-sm text-slate-700 list-disc pl-5 space-y-1">
          <li>Submit requests early to allow approval time.</li>
          <li>Check “My history” for status updates.</li>
          <li>If your balance looks incorrect, contact an admin to review records.</li>
        </ul>
      </div>
    </div>
  )
}
