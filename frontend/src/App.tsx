
import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { initTheme, toggleTheme } from "./lib/theme";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

// Max session duration: 15 minutes from the moment the user signs in.
// User can also end the session earlier via Logout.
const MAX_SESSION_MS = 15 * 60 * 1000;
const SESSION_STARTED_AT_KEY = "lm_session_started_at";

export default function App() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState<any>(null);
  const nav = useNavigate();

  const expireTimeoutRef = useRef<number | null>(null);
  const expireIntervalRef = useRef<number | null>(null);

  function clearExpiryTimers() {
    if (expireTimeoutRef.current !== null) {
      window.clearTimeout(expireTimeoutRef.current);
      expireTimeoutRef.current = null;
    }
    if (expireIntervalRef.current !== null) {
      window.clearInterval(expireIntervalRef.current);
      expireIntervalRef.current = null;
    }
  }

  async function forceLogout() {
    clearExpiryTimers();
    try {
      localStorage.removeItem(SESSION_STARTED_AT_KEY);
    } catch {
      // ignore storage failures
    }
    await supabase.auth.signOut();
    nav("/login", { replace: true });
  }

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);

      // If there is an existing session (e.g., page refresh) and we don't have a
      // session start time, record it now.
      if (data.session) {
        try {
          const existing = Number(localStorage.getItem(SESSION_STARTED_AT_KEY) ?? "");
          if (!existing || Number.isNaN(existing)) {
            localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
          }
        } catch {
          // ignore storage failures
        }
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      setSessionChecked(true);

      // Only set session start time on explicit sign-in.
      if (evt === "SIGNED_IN") {
        try {
          localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
        } catch {
          // ignore storage failures
        }
      }
      if (evt === "SIGNED_OUT") {
        clearExpiryTimers();
        try {
          localStorage.removeItem(SESSION_STARTED_AT_KEY);
        } catch {
          // ignore storage failures
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Enforce max session time = 15 minutes from session start.
  useEffect(() => {
    clearExpiryTimers();

    if (!session) {
      return;
    }

    let startedAt = Date.now();
    try {
      const stored = Number(localStorage.getItem(SESSION_STARTED_AT_KEY) ?? "");
      if (stored && !Number.isNaN(stored)) {
        startedAt = stored;
      } else {
        localStorage.setItem(SESSION_STARTED_AT_KEY, String(startedAt));
      }
    } catch {
      // If storage is blocked, fall back to a best-effort in-memory timer.
    }

    const remaining = startedAt + MAX_SESSION_MS - Date.now();
    if (remaining <= 0) {
      void forceLogout();
      return;
    }

    expireTimeoutRef.current = window.setTimeout(() => {
      void forceLogout();
    }, remaining);

    // Backup check (handles laptop sleep / tab suspension)
    expireIntervalRef.current = window.setInterval(() => {
      let sAt = startedAt;
      try {
        const stored = Number(localStorage.getItem(SESSION_STARTED_AT_KEY) ?? "");
        if (stored && !Number.isNaN(stored)) sAt = stored;
      } catch {
        // ignore
      }

      if (Date.now() - sAt >= MAX_SESSION_MS) {
        void forceLogout();
      }
    }, 30_000);

    return () => clearExpiryTimers();
  }, [session]);

  async function logout() {
    clearExpiryTimers();
    try {
      localStorage.removeItem(SESSION_STARTED_AT_KEY);
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
    nav("/login");
  }

  if (!sessionChecked) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="card p-6">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-lg">Leave Manager</div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={toggleTheme}>Theme</button>
            {session && <button className="btn" onClick={logout}>Logout</button>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/" element={session ? <DashboardPage /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
