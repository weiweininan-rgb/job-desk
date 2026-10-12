import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import AuthPage from "@/pages/AuthPage";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "@/pages/Index";
import JobPoolPage from "@/pages/JobPoolPage";
import SettingsPage from "@/pages/SettingsPage";
import AppErrorBoundary from "@/components/AppErrorBoundary";

const queryClient = new QueryClient();

const SetupRequired = () => (
  <main className="min-h-screen grid place-items-center p-6 app-canvas">
    <section className="max-w-xl rounded-3xl border border-amber-200 bg-white p-8 shadow-xl">
      <p className="text-xs font-bold tracking-[0.22em] text-amber-700">SETUP REQUIRED</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-slate-950">连接你的 Supabase 项目</h1>
      <p className="mt-3 leading-7 text-slate-600">请按照部署指南配置自己的 Supabase 数据库。在线部署设置仓库变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY；本地运行写入 .env.local。</p>
    </section>
  </main>
);

const AuthGate = () => {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return <SetupRequired />;
  if (session === undefined) return <main className="min-h-screen grid place-items-center app-canvas text-slate-600">正在载入个人工作台…</main>;
  if (!session) return <AuthPage />;

  return (
    <Routes>
      <Route element={<DashboardLayout user={session.user} />}>
        <Route path="/pool" element={<JobPoolPage />} />
        <Route path="/tracker" element={<Index />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/pool" replace />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <HashRouter><AuthGate /></HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
