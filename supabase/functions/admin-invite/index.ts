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

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  if (req.method !== "POST") return text(405, "Method not allowed")

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    // NOTE: Supabase secret names cannot start with the SUPABASE_ prefix in many projects.
    // We support both to keep deployments flexible.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) return text(500, "Missing SUPABASE_URL / SERVICE_ROLE_KEY")

    const authHeader = req.headers.get("Authorization") || ""
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!jwt) return text(401, "Unauthorized")

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Verify caller exists + is admin (based on employees table)
    const { data: caller, error: callerErr } = await adminClient.auth.getUser(jwt)
    if (callerErr || !caller?.user) return text(401, "Unauthorized")

    const callerId = caller.user.id
    const { data: adminRow, error: adminRowErr } = await adminClient
      .from("employees")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle()

    if (adminRowErr) return text(400, adminRowErr.message)
    if (!adminRow || adminRow.role !== "admin") return text(403, "Forbidden")

    const payload = (await req.json()) as Payload
    if (!payload?.email || !payload?.full_name || !payload?.code) return text(400, "Bad request")

    const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(payload.email)
    if (inviteErr) return text(400, inviteErr.message)

    const invitedId = invited.user?.id
    if (!invitedId) return text(400, "Invite failed")

    const { data: emp, error: empErr } = await adminClient
      .from("employees")
      .upsert(
        {
          user_id: invitedId,
          email: payload.email,
          full_name: payload.full_name,
          code: payload.code,
          role: payload.role,
          annual_allowance: payload.annual_allowance ?? 21,
          sudden_allowance: payload.sudden_allowance ?? 7,
          hiring_date: payload.hiring_date ?? null,
        },
        { onConflict: "email" }
      )
      .select("*")
      .single()

    if (empErr) return text(400, empErr.message)

    return json(200, { invited_user_id: invitedId, employee: emp })
  } catch (e) {
    return json(500, { error: String(e?.message ?? e) })
  }
})
