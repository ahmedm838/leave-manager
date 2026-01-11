// supabase/functions/admin-invite/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InvitePayload = {
  email: string;
  password: string;
  full_name: string;
  employee_code: string;
  hiring_date?: string; // YYYY-MM-DD
  role?: "Admin" | "User";
  planned_entitlement?: number;   // default 15
  unplanned_entitlement?: number; // default 7
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      error:
        "Missing server config: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set",
    });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return jsonResponse(401, { error: "Missing Authorization header" });
  }

  // Service-role client (server-side)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 1) Validate caller and ensure caller is Admin (in public.employees)
  const { data: callerUser, error: callerErr } = await supabase.auth.getUser(
    token,
  );
  if (callerErr || !callerUser?.user) {
    return jsonResponse(401, { error: "Invalid JWT" });
  }

  const callerId = callerUser.user.id;

  const { data: callerEmployee, error: callerEmpErr } = await supabase
    .from("employees")
    .select("role")
    .eq("user_id", callerId)
    .maybeSingle();

  if (callerEmpErr) {
    return jsonResponse(500, { error: callerEmpErr.message });
  }

  if (!callerEmployee || callerEmployee.role !== "Admin") {
    return jsonResponse(403, { error: "Forbidden: Admin only" });
  }

  // 2) Read payload
  let payload: InvitePayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const email = (payload.email || "").trim().toLowerCase();
  const password = payload.password || "";
  const full_name = (payload.full_name || "").trim();
  const employee_code = (payload.employee_code || "").trim();

  const role = payload.role ?? "User";
  const planned_entitlement = Number.isFinite(payload.planned_entitlement)
    ? Number(payload.planned_entitlement)
    : 15;
  const unplanned_entitlement = Number.isFinite(payload.unplanned_entitlement)
    ? Number(payload.unplanned_entitlement)
    : 7;

  if (!email || !password || !full_name || !employee_code) {
    return jsonResponse(400, {
      error:
        "Missing required fields: email, password, full_name, employee_code",
    });
  }

  // 3) Prevent duplicates in employees by email or employee_code
  const { data: existing, error: existingErr } = await supabase
    .from("employees")
    .select("id")
    .or(`email.eq.${email},employee_code.eq.${employee_code}`)
    .limit(1);

  if (existingErr) {
    return jsonResponse(500, { error: existingErr.message });
  }
  if (existing && existing.length > 0) {
    return jsonResponse(409, {
      error: "Employee already exists (email or employee code)",
    });
  }

  // 4) Create Auth user
  const { data: created, error: createErr } = await supabase.auth.admin
    .createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createErr || !created?.user) {
    return jsonResponse(400, { error: createErr?.message ?? "Create user failed" });
  }

  const newUserId = created.user.id;

  // 5) Insert into employees
  const { data: empInserted, error: empErr } = await supabase
    .from("employees")
    .insert({
      user_id: newUserId,
      email,
      full_name,
      employee_code,
      hiring_date: payload.hiring_date ?? null,
      role,
      planned_entitlement,
      unplanned_entitlement,
    })
    .select("id, user_id, email, full_name, employee_code, role")
    .single();

  if (empErr) {
    // rollback auth user if employees insert fails
    await supabase.auth.admin.deleteUser(newUserId);
    return jsonResponse(400, { error: empErr.message });
  }

  return jsonResponse(200, {
    ok: true,
    employee: empInserted,
  });
});
