import React, { useEffect, useState } from 'react'
import { adminInviteEmployee, adminListEmployees, adminUpdateEmployee } from '../lib/api'
import type { Employee } from '../lib/types'
import { Spinner } from '../components/Spinner'

export function AdminEmployees() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Employee[]>([])
  const [error, setError] = useState<string | null>(null)

  const [invite, setInvite] = useState({
    email: '',
    full_name: '',
    code: '',
    role: 'user' as 'admin' | 'user',
    annual_allowance: 21,
    sudden_allowance: 7,
    hiring_date: ''
  })
  const [invBusy, setInvBusy] = useState(false)
  const [invMsg, setInvMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await adminListEmployees()
      setRows(r)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function doInvite(e: React.FormEvent) {
    e.preventDefault()
    setInvBusy(true)
    setInvMsg(null)
    try {
      await adminInviteEmployee({
        email: invite.email.trim(),
        full_name: invite.full_name.trim(),
        code: invite.code.trim(),
        role: invite.role,
        annual_allowance: Number(invite.annual_allowance),
        sudden_allowance: Number(invite.sudden_allowance),
        hiring_date: invite.hiring_date ? invite.hiring_date : null
      })
      setInvMsg('Invitation sent and employee created.')
      setInvite({ ...invite, email: '', full_name: '', code: '', hiring_date: '' })
      await load()
    } catch (e: any) {
      setInvMsg(e?.message ?? 'Failed to invite')
    } finally {
      setInvBusy(false)
    }
  }

  async function quickUpdate(emp: Employee, patch: Partial<Employee>) {
    try {
      await adminUpdateEmployee(emp.id, patch)
      await load()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to update')
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Employees</h1>

      <div className="mt-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="font-semibold">Invite / add new employee</div>
        <form className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={doInvite}>
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Email" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} required />
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Full name" value={invite.full_name} onChange={e => setInvite({ ...invite, full_name: e.target.value })} required />
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Code" value={invite.code} onChange={e => setInvite({ ...invite, code: e.target.value })} required />

          <select className="rounded-lg border px-3 py-2 text-sm" value={invite.role} onChange={e => setInvite({ ...invite, role: e.target.value as any })}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <input className="rounded-lg border px-3 py-2 text-sm" type="number" placeholder="Annual allowance" value={invite.annual_allowance} onChange={e => setInvite({ ...invite, annual_allowance: Number(e.target.value) })} />
          <input className="rounded-lg border px-3 py-2 text-sm" type="number" placeholder="Sudden allowance" value={invite.sudden_allowance} onChange={e => setInvite({ ...invite, sudden_allowance: Number(e.target.value) })} />

          <input className="rounded-lg border px-3 py-2 text-sm" type="date" value={invite.hiring_date} onChange={e => setInvite({ ...invite, hiring_date: e.target.value })} />

          <div className="md:col-span-2 text-sm text-slate-600 dark:text-slate-300">
            {invMsg}
          </div>

          <button disabled={invBusy} className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 disabled:opacity-60">
            {invBusy ? <span className="inline-flex items-center gap-2"><Spinner /> Inviting</span> : 'Send invite'}
          </button>
        </form>
      </div>

      <div className="mt-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4"><Spinner /></div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-200">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Annual</th>
                <th className="text-left p-3">Sudden</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(emp => (
                <tr key={emp.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="p-3">{emp.code}</td>
                  <td className="p-3">{emp.full_name}</td>
                  <td className="p-3">{emp.email}</td>
                  <td className="p-3">
                    <select
                      className="rounded-lg border px-2 py-1 text-sm"
                      value={emp.role}
                      onChange={e => quickUpdate(emp, { role: e.target.value as any })}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      className="w-24 rounded-lg border px-2 py-1 text-sm"
                      type="number"
                      value={emp.annual_allowance}
                      onChange={e => quickUpdate(emp, { annual_allowance: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      className="w-24 rounded-lg border px-2 py-1 text-sm"
                      type="number"
                      value={emp.sudden_allowance}
                      onChange={e => quickUpdate(emp, { sudden_allowance: Number(e.target.value) })}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-4 text-slate-600 dark:text-slate-300" colSpan={6}>No employees.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
