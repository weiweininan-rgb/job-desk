import { useState } from 'react';
import { LockKeyhole, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) toast.error('登录失败：' + error.message);
  };

  return (
    <main className="min-h-screen app-canvas grid place-items-center p-5">
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        <div className="bg-slate-950 p-8 text-white">
          <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950"><LockKeyhole className="h-5 w-5" /></div>
          <p className="text-xs font-bold tracking-[0.24em] text-amber-300">PRIVATE JOB DESK</p>
          <h1 className="mt-3 font-display text-4xl font-bold">你的求职进度，只属于你。</h1>
        </div>
        <form onSubmit={submit} className="space-y-5 p-8">
          <label className="block text-sm font-medium text-slate-700">邮箱<Input className="mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="block text-sm font-medium text-slate-700">密码<Input className="mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <Button className="w-full bg-slate-950 hover:bg-slate-800" disabled={pending}><LogIn className="mr-2 h-4 w-4" />{pending ? '正在验证…' : '进入工作台'}</Button>
          <p className="text-center text-xs leading-5 text-slate-500">这是单人工作台。账号由 Supabase 控制台预先创建，不开放注册。</p>
        </form>
      </section>
    </main>
  );
}
