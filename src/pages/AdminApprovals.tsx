import React, { useEffect, useState } from 'react'
import { adminDecideRequest, adminListPending } from '../lib/api'
import { Spinner } from '../components/Spinner'

export function AdminApprovals() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await adminListPending()
      setRows(r)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function decide(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    try {
      await adminDecideRequest(id, status)
      await load()
    } catch (e: any) {
      alert(e?.message ?? 'Failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Approvals</h1>
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50" onClick={load}>Refresh</button>
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
                <th className="text-left p-3">Employee</th>
                <th className="text-left p-3">Dates</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{r.employee?.full_name ?? '—'}</div>
                    <div className="text-xs text-slate-500">{r.employee?.code} • {r.employee?.email}</div>
                  </td>
                  <td className="p-3">{r.start_date} → {r.end_date}</td>
                  <td className="p-3">{r.leave_type}</td>
                  <td className="p-3">{r.reason ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === r.id}
                        className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs disabled:opacity-60"
                        onClick={() => decide(r.id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyId === r.id}
                        className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs disabled:opacity-60"
                        onClick={() => decide(r.id, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-4 text-slate-600" colSpan={5}>No pending requests.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
