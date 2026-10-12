import { Component } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application render failed:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-canvas grid min-h-screen place-items-center p-6">
        <section className="max-w-md rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl">
          <p className="text-xs font-bold tracking-[0.22em] text-amber-700">PAGE RECOVERY</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-slate-950">页面遇到了异常</h1>
          <p className="mt-3 leading-7 text-slate-600">你的求职数据没有被修改。请刷新页面后重试；若仍出现此页，请记录刚才的操作并反馈给我。</p>
          <Button className="mt-6 bg-slate-950 hover:bg-slate-800" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />刷新页面
          </Button>
        </section>
      </main>
    );
  }
}
