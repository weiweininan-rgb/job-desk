import { BriefcaseBusiness, LogOut, Radar, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const links = [
  { to: '/pool', label: '待投递岗位', icon: Radar },
  { to: '/tracker', label: '求职跟踪', icon: BriefcaseBusiness },
  { to: '/settings', label: '筛选与设置', icon: Settings },
];

export default function DashboardLayout({ user }) {
  return (
    <div className="app-canvas min-h-screen text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f7f5ef]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/pool" className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-amber-300">J</span><span><b className="font-display text-lg">求职作战台</b><small className="ml-2 hidden text-slate-500 sm:inline">个人岗位管理</small></span></NavLink>
          <nav className="hidden items-center gap-1 md:flex">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-white'}`}><Icon className="mr-1.5 inline h-4 w-4" />{label}</NavLink>)}</nav>
          <div className="flex items-center gap-2"><span className="hidden max-w-44 truncate text-xs text-slate-500 sm:block">{user.email}</span><Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} title="退出登录"><LogOut className="h-4 w-4" /></Button></div>
        </div>
        <nav className="flex border-t border-slate-200 px-3 md:hidden">{links.map(({ to, label }) => <NavLink key={to} to={to} className={({ isActive }) => `flex-1 py-2 text-center text-xs ${isActive ? 'font-bold text-slate-950' : 'text-slate-500'}`}>{label}</NavLink>)}</nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><Outlet /></main>
    </div>
  );
}
