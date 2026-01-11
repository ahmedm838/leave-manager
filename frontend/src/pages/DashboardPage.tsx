
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Employee, LeaveRecord, LeaveType, RoleName, YearStatus } from "../types";

function yearNow(): number {
  return new Date().getFullYear();
}

async function fetchMyEmployee(): Promise<Employee> {
  // Prefer getSession() on initial load; it reads from persisted storage.
  const { data: sessData, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) throw new Error(`Auth session error: ${sessErr.message}`);
  const uid = sessData.session?.user?.id;
  if (!uid) throw new Error("Not authenticated (no session)");

  // Validate token with the Auth API to provide a clear error if JWT is invalid/expired.
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(`Auth user error: ${userErr.message}`);
  if (!userData.user?.id) throw new Error("Not authenticated (no user)");

  const { data, error } = await supabase
    .from("employees")
    .select("id, auth_user_id, code, name, user_id, hiring_date, planned_annual_balance, unplanned_annual_balance, roles(name)")
    .eq("auth_user_id", uid)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      "No employee profile is linked to this login. Ask Admin to create your employee record (and set auth_user_id to your Auth user id).",
    );
  }
  return data as any;
}

export default function DashboardPage() {
  const [me, setMe] = useState<Employee | null>(null);
  const [status, setStatus] = useState<YearStatus | null>(null);
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [year, setYear] = useState<number>(yearNow());

  const role: RoleName | null = (me?.roles?.name ?? null) as any;

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const emp = await fetchMyEmployee();
        setMe(emp);

        const { data: types, error: tErr } = await supabase
          .from("leave_types")
          .select("id, name, deduct_from")
          .order("id", { ascending: true });
        if (tErr) throw tErr;
        setLeaveTypes(types as any);

      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        setErr(null);

        // Ensure the year row exists by selecting/creating via admin? For non-admin, it exists once admin recorded leaves.
        const { data: st, error: stErr } = await supabase
          .from("v_employee_year_status")
          .select("*")
          .eq("employee_id", me.id)
          .eq("year", year)
          .maybeSingle();
        if (stErr) throw stErr;
        setStatus(st as any);

        const { data: rec, error: recErr } = await supabase
          .from("leave_records")
          .select("id, employee_id, code, start_date, end_date, leave_days, leave_type_id, remarks, leave_types(name, deduct_from)")
          .eq("employee_id", me.id)
          .gte("start_date", `${year}-01-01`)
          .lte("start_date", `${year}-12-31`)
          .order("start_date", { ascending: false });
        if (recErr) throw recErr;
        setRecords(rec as any);

      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, [me, year]);

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 dark:bg-red-950/40 dark:border-red-800/60 p-3 text-sm">
          {err}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {me ? (
              <>
                <span className="font-semibold">{me.name}</span> · Code {me.code} · Hired {me.hiring_date} · Role {role}
              </>
            ) : (
              "Loading profile…"
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="label">Year</div>
          <input
            className="input w-28"
            type="number"
            value={year}
            min={2000}
            max={2100}
            onChange={(e) => setYear(parseInt(e.target.value || `${yearNow()}`, 10))}
          />
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-sm font-semibold">Planned</div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Beginning: <span className="font-semibold">{status?.beginning_planned_balance ?? "—"}</span>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Utilized: <span className="font-semibold">{status?.utilized_planned_days ?? "—"}</span>
          </div>
          <div className="mt-2 text-lg font-bold">
            Remaining: {status?.remaining_planned_days ?? "—"}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold">Un-Planned</div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Beginning: <span className="font-semibold">{status?.beginning_unplanned_balance ?? "—"}</span>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Utilized: <span className="font-semibold">{status?.utilized_unplanned_days ?? "—"}</span>
          </div>
          <div className="mt-2 text-lg font-bold">
            Remaining: {status?.remaining_unplanned_days ?? "—"}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold">Other Leave Types</div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Total utilized (non-deducted): <span className="font-semibold">{status?.utilized_other_days ?? "—"}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Includes: {leaveTypes.filter(t => t.deduct_from === "none").map(t => t.name).join(", ")}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">My Leave Records ({year})</h2>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Leave days are inclusive (end - start + 1). Cross-year records are not allowed.
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2 pr-3">Start</th>
                <th className="py-2 pr-3">End</th>
                <th className="py-2 pr-3">Days</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td className="py-3 text-slate-500 dark:text-slate-400" colSpan={5}>No records for this year.</td></tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className="border-t border-slate-200/60 dark:border-slate-800/60">
                    <td className="py-2 pr-3">{r.start_date}</td>
                    <td className="py-2 pr-3">{r.end_date}</td>
                    <td className="py-2 pr-3 font-semibold">{r.leave_days}</td>
                    <td className="py-2 pr-3">{r.leave_types?.name ?? r.leave_type_id}</td>
                    <td className="py-2 pr-3">{r.remarks ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {role === "Admin" && <AdminSection currentYear={year} leaveTypes={leaveTypes} />}
    </div>
  );
}

function AdminSection({ currentYear, leaveTypes }: { currentYear: number; leaveTypes: LeaveType[] }) {
  const [tab, setTab] = useState<"employees" | "leaves" | "status" | "password">("employees");
  return (
    <section className="card p-5">
      <div className="flex flex-wrap gap-2">
        <button className={tab==="employees" ? "btn" : "btn-secondary"} onClick={() => setTab("employees")}>Employees</button>
        <button className={tab==="leaves" ? "btn" : "btn-secondary"} onClick={() => setTab("leaves")}>Add Leaves (Bulk)</button>
        <button className={tab==="status" ? "btn" : "btn-secondary"} onClick={() => setTab("status")}>Employee Status</button>
        <button className={tab==="password" ? "btn" : "btn-secondary"} onClick={() => setTab("password")}>Reset Password</button>
      </div>

      <div className="mt-6">
        {tab === "employees" && <AdminEmployees />}
        {tab === "leaves" && <AdminBulkLeaves currentYear={currentYear} leaveTypes={leaveTypes} />}
        {tab === "status" && <AdminEmployeeStatus currentYear={currentYear} />}
        {tab === "password" && <AdminResetPassword />}
      </div>
    </section>
  );
}

function AdminEmployees() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [hiringDate, setHiringDate] = useState("");
  const [role, setRole] = useState<RoleName>("User");
  const [password, setPassword] = useState("");
  const [planned, setPlanned] = useState(14);
  const [unplanned, setUnplanned] = useState(7);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess.session?.access_token;
      if (!jwt) throw new Error("No session");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-invite`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          code, name, user_id: userId, hiring_date: hiringDate, role,
          password,
          planned_annual_balance: planned,
          unplanned_annual_balance: unplanned,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setMsg(`Created/updated user: ${j.email}`);
    } catch (e:any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600 dark:text-slate-300">
        Create or update an employee and their login. User ID must be letters/numbers and dots only.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="label mb-1">Code (6 digits, starts with 2)</div>
          <input className="input" value={code} onChange={(e)=>setCode(e.target.value)} />
        </div>
        <div>
          <div className="label mb-1">Name (at least 3 words)</div>
          <input className="input" value={name} onChange={(e)=>setName(e.target.value)} />
        </div>
        <div>
          <div className="label mb-1">User ID</div>
          <input className="input" value={userId} onChange={(e)=>setUserId(e.target.value)} placeholder="e.g. ahmed.moustafa" />
        </div>
        <div>
          <div className="label mb-1">Hiring date</div>
          <input className="input" type="date" value={hiringDate} onChange={(e)=>setHiringDate(e.target.value)} />
        </div>
        <div>
          <div className="label mb-1">Role</div>
          <select className="input" value={role} onChange={(e)=>setRole(e.target.value as RoleName)}>
            <option value="User">User</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <div>
          <div className="label mb-1">Initial password (min 6)</div>
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <div>
          <div className="label mb-1">Planned annual balance</div>
          <input className="input" type="number" value={planned} onChange={(e)=>setPlanned(parseInt(e.target.value||"14",10))} />
        </div>
        <div>
          <div className="label mb-1">Un-Planned annual balance</div>
          <input className="input" type="number" value={unplanned} onChange={(e)=>setUnplanned(parseInt(e.target.value||"7",10))} />
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-300/60 bg-red-50 dark:bg-red-950/40 dark:border-red-800/60 p-3 text-sm">{err}</div>}
      {msg && <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/60 p-3 text-sm">{msg}</div>}

      <button className="btn" disabled={busy} onClick={invite}>{busy ? "Saving…" : "Save Employee"}</button>
    </div>
  );
}

type BulkRow = { code: string; start_date: string; end_date: string; leave_type_id: number; remarks: string };

function AdminBulkLeaves({ currentYear, leaveTypes }: { currentYear: number; leaveTypes: LeaveType[] }) {
  const defaultTypeId = leaveTypes.find(t => t.name === "Planned")?.id ?? (leaveTypes[0]?.id ?? 1);
  const [rows, setRows] = useState<BulkRow[]>([
    { code: "", start_date: `${currentYear}-01-01`, end_date: `${currentYear}-01-01`, leave_type_id: defaultTypeId, remarks: "" },
  ]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function addRow() {
    setRows(r => [...r, { code: "", start_date: `${currentYear}-01-01`, end_date: `${currentYear}-01-01`, leave_type_id: defaultTypeId, remarks: "" }]);
  }
  function update(i: number, patch: Partial<BulkRow>) {
    setRows(r => r.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  }
  function remove(i: number) {
    setRows(r => r.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setBusy(true); setErr(null); setMsg(null);

    // Normalize employee code to avoid mismatches (spaces, zero-width chars, Arabic-Indic digits)
    const normalizeCode = (input: string) => {
      const map: Record<string, string> = {
        "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
        "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
      };
      return (input ?? "")
        .trim()
        .replace(/[\u200B\uFEFF]/g, "")        // zero-width space / BOM
        .replace(/\s+/g, "")                  // all whitespace
        .replace(/[٠-٩۰-۹]/g, (d) => map[d] ?? d);
    };

    let insertedCount = 0;
    const missingCodes: string[] = [];

    try {
      const normalizedRows = rows.map(r => ({
        ...r,
        code: normalizeCode(r.code),
      }));

      const distinctCodes = Array.from(new Set(normalizedRows.map(r => r.code).filter(Boolean)));

      if (distinctCodes.length === 0) {
        throw new Error("Please enter at least one employee code.");
      }

      // Pre-validate codes so one missing code does not block other inserts
      const { data: empRows, error: empErr } = await supabase
        .from("employees")
        .select("code")
        .in("code", distinctCodes);

      if (empErr) throw empErr;

      const existing = new Set((empRows ?? []).map((e:any) => normalizeCode(e.code)));

      const rowsToInsert = normalizedRows.filter(r => {
        if (!r.code) return false;
        if (!existing.has(r.code)) {
          if (!missingCodes.includes(r.code)) missingCodes.push(r.code);
          return false;
        }
        return true;
      });

      // Insert one by one to preserve clear balance/validation errors
      for (const row of rowsToInsert) {
        const { error } = await supabase.from("leave_records").insert({
          code: row.code,
          start_date: row.start_date,
          end_date: row.end_date,
          leave_type_id: row.leave_type_id,
          remarks: row.remarks || null,
        });
        if (error) throw error;
        insertedCount += 1;
      }

      setMsg(`Inserted ${insertedCount} record(s).`);
      if (missingCodes.length > 0) {
        setErr(`Employee not found for code(s): ${missingCodes.join(", ")}.`);
      }
    } catch (e:any) {
      const base = e?.message ?? String(e);
      setErr(insertedCount > 0 ? `Inserted ${insertedCount} record(s) before failure. ${base}` : base);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600 dark:text-slate-300">
        Add multiple leave records in one shot. If a deducted balance is insufficient, the insert fails with an error.
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-600 dark:text-slate-300">
            <tr>
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Start</th>
              <th className="py-2 pr-3">End</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Remarks</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-200/60 dark:border-slate-800/60">
                <td className="py-2 pr-3"><input className="input" value={r.code} onChange={(e)=>update(i,{code:e.target.value})} /></td>
                <td className="py-2 pr-3"><input className="input" type="date" value={r.start_date} onChange={(e)=>update(i,{start_date:e.target.value})} /></td>
                <td className="py-2 pr-3"><input className="input" type="date" value={r.end_date} onChange={(e)=>update(i,{end_date:e.target.value})} /></td>
                <td className="py-2 pr-3">
                  <select className="input" value={r.leave_type_id} onChange={(e)=>update(i,{leave_type_id:parseInt(e.target.value,10)})}>
                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </td>
                <td className="py-2 pr-3"><input className="input" value={r.remarks} onChange={(e)=>update(i,{remarks:e.target.value})} /></td>
                <td className="py-2 pr-3">
                  <button className="btn-secondary" onClick={()=>remove(i)} disabled={rows.length===1}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {err && <div className="rounded-xl border border-red-300/60 bg-red-50 dark:bg-red-950/40 dark:border-red-800/60 p-3 text-sm">{err}</div>}
      {msg && <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/60 p-3 text-sm">{msg}</div>}

      <div className="flex gap-2">
        <button className="btn-secondary" onClick={addRow}>Add row</button>
        <button className="btn" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Submit"}</button>
      </div>
    </div>
  );
}

function AdminEmployeeStatus({ currentYear }: { currentYear: number }) {
  const [code, setCode] = useState("");
  const [year, setYear] = useState(currentYear);
  const [status, setStatus] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [edit, setEdit] = useState<any | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  async function load() {
    setErr(null);
    setInfo(null);
    try {
      const { data: emp, error: empErr } = await supabase.from("employees").select("id, code, name, hiring_date").eq("code", code).single();
      if (empErr) throw empErr;

      const { data: st, error: stErr } = await supabase
        .from("v_employee_year_status")
        .select("*")
        .eq("employee_id", emp.id)
        .eq("year", year)
        .maybeSingle();
      if (stErr) throw stErr;
      setStatus(st);

      const { data: rec, error: recErr } = await supabase
        .from("leave_records")
        .select("id, start_date, end_date, leave_days, leave_type_id, leave_types(name, deduct_from), remarks")
        .eq("employee_id", emp.id)
        .gte("start_date", `${year}-01-01`)
        .lte("start_date", `${year}-12-31`)
        .order("start_date", { ascending: false });
      if (recErr) throw recErr;
      setRecords(rec as any);
    } catch (e:any) {
      setErr(e?.message ?? String(e));
      setStatus(null);
      setRecords([]);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setEditBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const { error } = await supabase.from("leave_records").update({
        start_date: edit.start_date,
        end_date: edit.end_date,
        leave_type_id: edit.leave_type_id,
        remarks: edit.remarks || null,
      }).eq("id", edit.id);
      if (error) throw error;

      setInfo("Leave record updated.");
      setEdit(null);
      await load();
    } catch (e:any) {
      setErr(e?.message ?? String(e));
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteRecord(id: string) {
    setErr(null);
    setInfo(null);
    try {
      const { error } = await supabase.from("leave_records").delete().eq("id", id);
      if (error) throw error;
      setInfo("Leave record deleted.");
      await load();
    } catch (e:any) {
      setErr(e?.message ?? String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <div className="label mb-1">Employee code</div>
          <input className="input" value={code} onChange={(e)=>setCode(e.target.value)} placeholder="e.g. 200123" />
        </div>
        <div>
          <div className="label mb-1">Year</div>
          <input className="input" type="number" value={year} onChange={(e)=>setYear(parseInt(e.target.value||`${currentYear}`,10))} />
        </div>
        <div className="flex items-end">
          <button className="btn" onClick={load}>Load</button>
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-300/60 bg-red-50 dark:bg-red-950/40 dark:border-red-800/60 p-3 text-sm">{err}</div>}
      {info && <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/60 p-3 text-sm">{info}</div>}

      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-sm font-semibold">Planned</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">Beginning: <span className="font-semibold">{status.beginning_planned_balance}</span></div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Utilized: <span className="font-semibold">{status.utilized_planned_days}</span></div>
            <div className="mt-2 text-lg font-bold">Remaining: {status.remaining_planned_days}</div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-semibold">Un-Planned</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">Beginning: <span className="font-semibold">{status.beginning_unplanned_balance}</span></div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Utilized: <span className="font-semibold">{status.utilized_unplanned_days}</span></div>
            <div className="mt-2 text-lg font-bold">Remaining: {status.remaining_unplanned_days}</div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-semibold">Other</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">Utilized (non-deducted): <span className="font-semibold">{status.utilized_other_days}</span></div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-bold">Leave history ({year})</h3>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2 pr-3">Start</th>
                <th className="py-2 pr-3">End</th>
                <th className="py-2 pr-3">Days</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Remarks</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td className="py-3 text-slate-500 dark:text-slate-400" colSpan={6}>No records.</td></tr>
              ) : (
                records.map((r:any) => (
                  <tr key={r.id} className="border-t border-slate-200/60 dark:border-slate-800/60">
                    <td className="py-2 pr-3">{r.start_date}</td>
                    <td className="py-2 pr-3">{r.end_date}</td>
                    <td className="py-2 pr-3 font-semibold">{r.leave_days}</td>
                    <td className="py-2 pr-3">{r.leave_types?.name}</td>
                    <td className="py-2 pr-3">{r.remarks ?? ""}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <button className="btn-secondary" onClick={() => setEdit({ ...r })}>Edit</button>
                        <button className="btn-secondary" onClick={() => deleteRecord(r.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold">Edit leave</h4>
            <button className="btn-secondary" onClick={() => setEdit(null)}>Close</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <div>
              <div className="label mb-1">Start</div>
              <input className="input" type="date" value={edit.start_date} onChange={(e)=>setEdit({ ...edit, start_date: e.target.value })} />
            </div>
            <div>
              <div className="label mb-1">End</div>
              <input className="input" type="date" value={edit.end_date} onChange={(e)=>setEdit({ ...edit, end_date: e.target.value })} />
            </div>
            <div>
              <div className="label mb-1">Leave type id</div>
              <input className="input" type="number" value={edit.leave_type_id} onChange={(e)=>setEdit({ ...edit, leave_type_id: parseInt(e.target.value||"0",10) })} />
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You can also edit type by ID; the system enforces balances.
              </div>
            </div>
            <div>
              <div className="label mb-1">Remarks</div>
              <input className="input" value={edit.remarks ?? ""} onChange={(e)=>setEdit({ ...edit, remarks: e.target.value })} />
            </div>
          </div>

          <div className="mt-4">
            <button className="btn" disabled={editBusy} onClick={saveEdit}>{editBusy ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminResetPassword() {
  const [employees, setEmployees] = useState<Array<Pick<Employee, "id" | "code" | "name" | "user_id">>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newPass, setNewPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadEmployees() {
    setLoadingEmployees(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, code, name, user_id")
        .order("code", { ascending: true });
      if (error) throw error;

      const list = (data ?? []) as any;
      setEmployees(list);

      // Auto-select first employee if none selected
      if (!selectedUserId && list.length > 0) {
        setSelectedUserId(list[0].user_id);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoadingEmployees(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reset() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      if (!selectedUserId) throw new Error("Please select an employee.");
      if (!newPass || newPass.length < 6) throw new Error("Password must be at least 6 characters.");

      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess.session?.access_token;
      if (!jwt) throw new Error("No session");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({ user_id: selectedUserId, new_password: newPass }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as any).error || "Failed");

      setMsg("Password updated.");
      setNewPass("");
    } catch (e:any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600 dark:text-slate-300">
        Reset an employee's login password (Admin only).
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="label mb-1">Employee</div>
          <div className="flex gap-2">
            <select
              className="input"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingEmployees || employees.length === 0}
            >
              {employees.length === 0 ? (
                <option value="">No employees found</option>
              ) : (
                employees.map((e) => (
                  <option key={e.id} value={e.user_id}>
                    {e.code} — {e.name}
                  </option>
                ))
              )}
            </select>

            <button
              className="btn-secondary whitespace-nowrap"
              onClick={loadEmployees}
              disabled={loadingEmployees}
              title="Reload employees list"
            >
              {loadingEmployees ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Select an employee, then set a new password.
          </div>
        </div>

        <div>
          <div className="label mb-1">New password (min 6)</div>
          <input className="input" type="password" value={newPass} onChange={(e)=>setNewPass(e.target.value)} />
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-300/60 bg-red-50 dark:bg-red-950/40 dark:border-red-800/60 p-3 text-sm">{err}</div>}
      {msg && <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/60 p-3 text-sm">{msg}</div>}

      <button className="btn" disabled={busy || loadingEmployees || employees.length===0} onClick={reset}>
        {busy ? "Updating…" : "Update password"}
      </button>
    </div>
  );
}

