import { Link, NavLink, Outlet } from 'react-router-dom'
import type { Employee } from '../lib/types'
import { signOut } from '../lib/auth'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        'block rounded-lg px-3 py-2 text-sm ' + (isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')
      }
    >
      {label}
    </NavLink>
  )
}

export function AppLayout({ me }: { me: Employee }) {
  return (
    <div className="min-h-screen">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/app/dashboard" className="font-semibold">Leave Tracker</Link>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-700">
              {me.full_name} <span className="text-slate-400">({me.role})</span>
            </div>
            <button
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={() => signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3">
          <div className="rounded-2xl bg-white shadow-sm border p-3 space-y-1">
            <NavItem to="/app/dashboard" label="Dashboard" />
            <NavItem to="/app/request-new" label="New leave request" />
            <NavItem to="/app/history" label="My history" />

            {me.role === 'admin' && (
              <>
                <div className="pt-2 mt-2 border-t text-xs text-slate-500 px-3">Admin</div>
                <NavItem to="/app/admin/approvals" label="Approvals" />
                <NavItem to="/app/admin/employees" label="Employees" />
              </>
            )}
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
