
import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { initTheme, toggleTheme } from "./lib/theme";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setSessionChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
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
