// supabase/functions/admin-reset-password/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ResetPayload = {
  email?: string;
  employee_code?: string;
  new_password: string;
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

  // Service-role client
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 1) Validate caller and ensure Admin
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
  let payload: ResetPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const email = (payload.email || "").trim().toLowerCase();
  const employee_code = (payload.employee_code || "").trim();
  const new_password = payload.new_password || "";

  if (!new_password || new_password.length < 6) {
    return jsonResponse(400, {
      error: "new_password is required and must be at least 6 characters",
    });
  }

  if (!email && !employee_code) {
    return jsonResponse(400, { error: "Provide email or employee_code" });
  }

  // 3) Locate employee user_id
  let q = supabase.from("employees").select("user_id, email, employee_code");

  if (email) q = q.eq("email", email);
  if (!email && employee_code) q = q.eq("employee_code", employee_code);

  const { data: emp, error: empErr } = await q.maybeSingle();

  if (empErr) {
    return jsonResponse(500, { error: empErr.message });
  }
  if (!emp?.user_id) {
    return jsonResponse(404, { error: "Employee not found" });
  }

  // 4) Reset password in Auth
  const { error: updErr } = await supabase.auth.admin.updateUserById(
    emp.user_id,
    { password: new_password },
  );

  if (updErr) {
    return jsonResponse(400, { error: updErr.message });
  }

  return jsonResponse(200, {
    ok: true,
    message: "Password updated",
    target: { email: emp.email, employee_code: emp.employee_code },
  });
});
