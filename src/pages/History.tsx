import React, { useEffect, useMemo, useState } from 'react'
import { fetchMyLeaveRequests } from '../lib/api'
import type { LeaveRequest } from '../lib/types'
import { Spinner } from '../components/Spinner'

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'approved' ? 'bg-green-100 text-green-800' :
    status === 'rejected' ? 'bg-red-100 text-red-800' :
    status === 'pending' ? 'bg-amber-100 text-amber-800' :
    'bg-slate-100 text-slate-700'
  return <span className={'inline-flex rounded-full px-2 py-0.5 text-xs ' + cls}>{status}</span>
}

export function History() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LeaveRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let ignore = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const r = await fetchMyLeaveRequests()
        if (!ignore) setRows(r)
      } catch (e: any) {
        if (!ignore) setError(e?.message ?? 'Failed to load')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter(r => r.status === filter)
  }, [rows, filter])

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">My history</h1>
        <select className="rounded-lg border px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="mt-4 rounded-2xl bg-white border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4"><Spinner /></div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Dates</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Requested</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.start_date} → {r.end_date}</td>
                  <td className="p-3">{r.leave_type}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                  <td className="p-3">{new Date(r.requested_at).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="p-4 text-slate-600" colSpan={4}>No records.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
