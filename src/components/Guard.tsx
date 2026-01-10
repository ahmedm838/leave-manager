import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { Employee, Role } from '../lib/types'

export function RequireAuth({ me, loading }: { me: Employee | null; loading: boolean }) {
  if (loading) return <div className="p-6">Loading...</div>
  if (!me) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireRole({ me, role }: { me: Employee; role: Role }) {
  if (me.role !== role) return <Navigate to="/app/dashboard" replace />
  return <Outlet />
}
