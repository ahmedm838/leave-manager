import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import type { Employee } from './lib/types'
import { getMyEmployeeProfile } from './lib/api'
import { RequireAuth, RequireRole } from './components/Guard'
import { AppLayout } from './components/AppLayout'

import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { NewRequest } from './pages/NewRequest'
import { History } from './pages/History'
import { AdminApprovals } from './pages/AdminApprovals'
import { AdminEmployees } from './pages/AdminEmployees'

export default function App() {
  const [me, setMe] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function loadProfile() {
      setLoading(true)
      try {
        const profile = await getMyEmployeeProfile()
        if (!ignore) setMe(profile)
      } catch {
        if (!ignore) setMe(null)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadProfile()

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => {
      ignore = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<RequireAuth me={me} loading={loading} />}>
        <Route path="/app" element={me ? <AppLayout me={me} /> : <div />} >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="request-new" element={<NewRequest />} />
          <Route path="history" element={<History />} />

          <Route element={me ? <RequireRole me={me} role="admin" /> : <div />}>
            <Route path="admin/approvals" element={<AdminApprovals />} />
            <Route path="admin/employees" element={<AdminEmployees />} />
          </Route>

          <Route index element={<Navigate to="/app/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<div className="p-6">Not found</div>} />
    </Routes>
  )
}
