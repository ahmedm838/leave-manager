import { supabase } from './supabaseClient'
import type { Employee, LeaveRequest, LeaveStatus } from './types'

export async function getMyEmployeeProfile(): Promise<Employee | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  return data as Employee | null
}

export async function fetchMyLeaveRequests(): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .order('requested_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as LeaveRequest[]
}

export async function fetchMyLeaveSummary(year?: number): Promise<any> {
  const view = year ? 'v_leave_summary' : 'v_leave_summary_current_year'
  const q = supabase.from(view).select('*')
  const { data, error } = year ? await q.eq('year', year) : await q
  if (error) throw error
  return (data ?? [])[0] ?? null
}

export async function createLeaveRequest(payload: {
  start_date: string
  end_date: string
  leave_type: string
  reason?: string
}) {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      start_date: payload.start_date,
      end_date: payload.end_date,
      leave_type: payload.leave_type,
      reason: payload.reason ?? null
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

// ADMIN APIs
export async function adminListPending(): Promise<(LeaveRequest & { employee: Pick<Employee,'code'|'full_name'|'email'> })[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, employee:employees(code,full_name,email)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as any
}

export async function adminDecideRequest(id: string, status: LeaveStatus, note?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      status,
      decided_at: new Date().toISOString(),
      decided_by: user.id,
      decision_note: note ?? null
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function adminListEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('code', { ascending: true })

  if (error) throw error
  return (data ?? []) as Employee[]
}

export async function adminInviteEmployee(payload: {
  email: string
  full_name: string
  code: string
  role: 'admin' | 'user'
  annual_allowance: number
  sudden_allowance: number
  hiring_date?: string | null
}) {
  const { data, error } = await supabase.functions.invoke('admin-invite', {
    body: payload
  })
  if (error) throw error
  return data
}

export async function adminUpdateEmployee(id: string, patch: Partial<Employee>) {
  const { data, error } = await supabase
    .from('employees')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Employee
}
