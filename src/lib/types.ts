export type Role = 'admin' | 'user'

export type Employee = {
  id: string
  // Can be NULL for pre-registered employees before they create an auth account.
  user_id: string | null
  code: string
  full_name: string
  email: string
  role: Role
  hiring_date: string | null
  annual_allowance: number
  sudden_allowance: number
  created_at: string
}

// Leave types are configured in the database (ENUM / constraint). The UI loads them dynamically.
export type LeaveType = string
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type LeaveRequest = {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  leave_type: LeaveType
  reason: string | null
  status: LeaveStatus
  requested_at: string
  decided_at: string | null
  decided_by: string | null
  decision_note: string | null
}
