import { supabase } from './supabaseClient'

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * Self-service employee sign up.
 *
 * Uses the `employee-signup` Edge Function to:
 * - verify the email exists in the `employees` table
 * - set a password for first-time users
 */
export async function signUpEmployee(email: string, password: string) {
  const { data, error } = await supabase.functions.invoke('employee-signup', {
    body: { email, password }
  })
  if (error) {
    // Supabase functions errors often hide the real response body.
    // If available, surface the server response text to the UI.
    const ctx = (error as any)?.context
    if (ctx && typeof ctx.text === 'function') {
      const msg = await ctx.text()
      throw new Error(msg || (error as any)?.message || 'Sign up failed')
    }
    throw error
  }

  // After setting the password server-side, sign in normally.
  await signIn(email, password)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
