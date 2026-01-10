import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

type Payload = {
  email: string
  full_name: string
  code: string
  role: "admin" | "user"
  annual_allowance: number
  sudden_allowance: number
  hiring_date?: string | null
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const authHeader = req.headers.get("Authorization") || ""
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!jwt) return new Response("Unauthorized", { status: 401 })

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Verify caller exists + is admin (based on employees table)
  const { data: caller, error: callerErr } = await adminClient.auth.getUser(jwt)
  if (callerErr || !caller?.user) return new Response("Unauthorized", { status: 401 })

  const callerId = caller.user.id
  const { data: adminRow } = await adminClient
    .from("employees")
    .select("role")
    .eq("user_id", callerId)
    .maybeSingle()

  if (!adminRow || adminRow.role !== "admin") return new Response("Forbidden", { status: 403 })

  const payload = (await req.json()) as Payload
  if (!payload?.email || !payload?.full_name || !payload?.code) return new Response("Bad request", { status: 400 })

  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(payload.email)
  if (inviteErr) return new Response(inviteErr.message, { status: 400 })

  const invitedId = invited.user?.id
  if (!invitedId) return new Response("Invite failed", { status: 400 })

  const { data: emp, error: empErr } = await adminClient
    .from("employees")
    .upsert({
      user_id: invitedId,
      email: payload.email,
      full_name: payload.full_name,
      code: payload.code,
      role: payload.role,
      annual_allowance: payload.annual_allowance ?? 21,
      sudden_allowance: payload.sudden_allowance ?? 7,
      hiring_date: payload.hiring_date ?? null
    }, { onConflict: "email" })
    .select("*")
    .single()

  if (empErr) return new Response(empErr.message, { status: 400 })

  return new Response(JSON.stringify({ invited_user_id: invitedId, employee: emp }), {
    headers: { "Content-Type": "application/json" },
    status: 200
  })
})
