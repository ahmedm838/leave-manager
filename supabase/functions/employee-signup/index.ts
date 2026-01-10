import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

type Payload = {
  email: string
  password: string
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function text(status: number, message: string) {
  return new Response(message, { status, headers: corsHeaders })
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase()
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  if (req.method !== "POST") return text(405, "Method not allowed")

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    // NOTE: Supabase secret names cannot start with the SUPABASE_ prefix in many projects.
    // We support both to keep deployments flexible.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")

    if (!supabaseUrl || !serviceKey) {
      return text(500, "Missing SUPABASE_URL / SERVICE_ROLE_KEY")
    }

    const payload = (await req.json()) as Payload
    const email = normalizeEmail(payload?.email)
    const password = String(payload?.password ?? "")

    if (!email || !password) return text(400, "Bad request")
    if (password.length < 6) return text(400, "Password must be at least 6 characters")

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Only allow signup for emails that exist in the employees table.
    const { data: emp, error: empErr } = await adminClient
      .from("employees")
      .select("id,user_id,email")
      .ilike("email", email)
      .maybeSingle()

    if (empErr) return text(400, empErr.message)

    if (!emp) {
      return text(403, "This email is not registered as an employee. Please contact HR/admin.")
    }

    const existingUserId = emp.user_id as string | null

    // Case 1: employee already linked to an auth user.
    // If this user has never signed in before, allow setting the initial password.
    if (existingUserId) {
      const { data: u, error: uErr } = await adminClient.auth.admin.getUserById(existingUserId)
      if (uErr) return text(400, uErr.message)

      const lastSignInAt = u?.user?.last_sign_in_at

      if (lastSignInAt) {
        // Prevent resetting an active account via the signup screen.
        return text(409, "Account already activated. Please sign in or use 'Forgot password'.")
      }

      const { error: updErr } = await adminClient.auth.admin.updateUserById(existingUserId, {
        password,
        email_confirm: true,
      })

      if (updErr) return text(400, updErr.message)

      return json(200, { mode: "activated", user_id: existingUserId })
    }

    // Case 2: employee exists but not linked yet (user_id is NULL). Create the auth user, then link.
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createErr) return text(400, createErr.message)

    const newUserId = created.user?.id
    if (!newUserId) return text(400, "Sign up failed")

    const { error: linkErr } = await adminClient
      .from("employees")
      .update({ user_id: newUserId })
      .eq("id", emp.id)

    if (linkErr) return text(400, linkErr.message)

    return json(200, { mode: "created", user_id: newUserId })
  } catch (e) {
    return json(500, { error: String((e as any)?.message ?? e) })
  }
})
