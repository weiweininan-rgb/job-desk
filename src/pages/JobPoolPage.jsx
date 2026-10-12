import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Building2, CalendarClock, CheckCircle2, CircleDot, CircleOff, FileUp, Filter, Link2, MapPin, Pencil, Pin, PinOff, RefreshCw, Save, Search, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useJobSources } from '@/hooks/useJobSources';
import { toast } from 'sonner';
import { feishuEnabled } from '@/lib/featureFlags';
import { formatSourceDate, sourceDateValue } from '@/lib/jobMatcher';

const statusLabel = { pool: '待投递', pending_confirmation: '待确认', converted: '已转入', archived: '已归档' };
const isExternalUrl = (value) => /^https?:\/\//i.test(value?.trim());
const normalizeGroupUrl = (value = '') => {
  try {
    const url = new URL(value.trim());
    url.hash = '';
    return `${url.origin}${url.pathname.replace(/\/$/, '')}${url.search}`.toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
};

export default function JobPoolPage() {
  const {
    data: jobs = [], isLoading, error, sync, isSyncing, syncRuns, isLoadingSyncRuns,
    feishuConnection, isLoadingFeishuConnection, connectFeishu, isConnectingFeishu,
    importWorkbook, isImporting, markPending, confirm, updateNotes, isUpdatingNotes,
    updatePersonalState, isUpdatingPersonalState,
  } = useJobSources();
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('all');
  const [sortBy, setSortBy] = useState('published_desc');
  const [onlyChengdu, setOnlyChengdu] = useState(false);
  const [onlyMajor, setOnlyMajor] = useState(false);
  const [onlyActive, setOnlyActive] = useState(true);
  const refreshTokenExpiresAt = feishuConnection?.refreshTokenExpiresAt ? new Date(feishuConnection.refreshTokenExpiresAt) : null;
  const feishuAuthorizationExpired = Boolean(
    refreshTokenExpiresAt && !Number.isNaN(refreshTokenExpiresAt.getTime()) && refreshTokenExpiresAt.getTime() <= Date.now(),
  );
  const needsFeishuConnection = !feishuConnection?.connected || feishuAuthorizationExpired;

  const groupedJobs = useMemo(() => {
    const groups = new Map();
    jobs.forEach((job) => {
      const normalizedApplyUrl = isExternalUrl(job.apply_url) ? normalizeGroupUrl(job.apply_url) : '';
      const normalizedArticleUrl = isExternalUrl(job.article_url) ? normalizeGroupUrl(job.article_url) : '';
      const sharedLink = normalizedApplyUrl || normalizedArticleUrl;
      const key = sharedLink ? `${job.company_name.trim().toLowerCase()}|${sharedLink}|${job.batch}` : `source:${job.id}`;
      const current = groups.get(key);
      if (!current) {
        groups.set(key, {
          ...job,
          items: [job],
          sourceIds: [job.id],
          positions: [job.position],
          locations: job.location ? [job.location] : [],
          noteItems: job.notes ? [job.notes] : [],
        });
        return;
      }
      current.items.push(job);
      current.sourceIds.push(job.id);
      if (job.position && !current.positions.includes(job.position)) current.positions.push(job.position);
      if (job.location && !current.locations.includes(job.location)) current.locations.push(job.location);
      if (job.notes && !current.noteItems.includes(job.notes)) current.noteItems.push(job.notes);
      current.is_chengdu = current.is_chengdu || job.is_chengdu;
      current.is_major_company = current.is_major_company || job.is_major_company;
      current.is_pinned = current.is_pinned || job.is_pinned;
      current.is_deprioritized = current.is_deprioritized || job.is_deprioritized;
    });

    return [...groups.values()].map((group) => {
      const activeItems = group.items.filter((item) => ['pool', 'pending_confirmation'].includes(item.status));
      const activeIds = activeItems.map((item) => item.id);
      return {
        ...group,
        position: group.positions.join('、'),
        location: group.locations.join('、'),
        notes: group.noteItems.join('\n\n'),
        status: activeIds.length === 0
          ? group.items.every((item) => item.status === 'archived') ? 'archived' : 'converted'
          : activeItems.some((item) => item.status === 'pending_confirmation') ? 'pending_confirmation' : 'pool',
        activeIds,
      };
    });
  }, [jobs]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get('feishu');
    const message = url.searchParams.get('message');
    if (!status) return;
    if (status === 'connected') toast.success(message ?? '飞书已连接');
    else toast.error(message ?? '飞书连接未完成');
    url.searchParams.delete('feishu');
    url.searchParams.delete('message');
    window.history.replaceState({}, '', url);
  }, []);

  const filtered = useMemo(() => {
    const dateValue = sourceDateValue;
    const priorityValue = (job) => Number(job.is_chengdu) + Number(job.is_major_company);
    return groupedJobs
      .filter((job) => {
        const matchesSearch = !search || `${job.company_name} ${job.position} ${job.location}`.toLowerCase().includes(search.toLowerCase());
        return matchesSearch && (batch === 'all' || job.batch === batch) && (!onlyChengdu || job.is_chengdu) && (!onlyMajor || job.is_major_company) && (!onlyActive || ['pool', 'pending_confirmation'].includes(job.status));
      })
      .sort((left, right) => {
        const pinnedCompare = Number(right.is_pinned) - Number(left.is_pinned);
        if (pinnedCompare) return pinnedCompare;
        const deprioritizedCompare = Number(left.is_deprioritized) - Number(right.is_deprioritized);
        if (deprioritizedCompare) return deprioritizedCompare;
        if (sortBy === 'published_asc') return dateValue(left.published_at) - dateValue(right.published_at);
        if (sortBy === 'priority') return priorityValue(right) - priorityValue(left) || dateValue(right.published_at) - dateValue(left.published_at);
        if (sortBy === 'company') return left.company_name.localeCompare(right.company_name, 'zh-CN');
        return dateValue(right.published_at) - dateValue(left.published_at) || priorityValue(right) - priorityValue(left);
      });
  }, [groupedJobs, search, batch, onlyChengdu, onlyMajor, onlyActive, sortBy]);

  const openApplication = (job) => {
    if (!isExternalUrl(job.apply_url)) {
      toast.error('该岗位来源没有投递官网链接');
      return;
    }
    window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    markPending(job.activeIds?.length ? job.activeIds : job.sourceIds ?? [job.id]);
  };

  const selectWorkbook = (event) => {
    const [file] = event.target.files;
    if (file) importWorkbook(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-900/15 sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold tracking-[0.2em] text-amber-300">JOB DESK / 岗位管理</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">待投递岗位池</h1><p className="mt-2 text-sm text-slate-300">只保留匹配方向的机会，把时间留给更值得投递的岗位。</p></div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} className="hidden" type="file" accept=".xlsx,.xls" onChange={selectWorkbook} />
            <Button asChild variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white"><a href={import.meta.env.BASE_URL + 'job-template.xlsx'} download>下载 Excel 模板</a></Button>
            <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-amber-400 text-slate-950 hover:bg-amber-300"><FileUp className="mr-2 h-4 w-4" />{isImporting ? '正在导入…' : '上传 Excel 导入'}</Button>
            {feishuEnabled && !isLoadingFeishuConnection && needsFeishuConnection && <Button onClick={connectFeishu} disabled={isConnectingFeishu} variant="outline" className="border-amber-300 bg-transparent text-amber-200 hover:bg-slate-800 hover:text-amber-100"><Link2 className="mr-2 h-4 w-4" />{isConnectingFeishu ? '正在跳转…' : feishuAuthorizationExpired ? '重新连接飞书' : '连接飞书'}</Button>}
            {feishuEnabled && <Button onClick={sync} disabled={isSyncing} variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white"><RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />{isSyncing ? '同步中…' : '飞书立即同步'}</Button>}
          </div>
        </div>
      </section>

      {feishuEnabled && <SyncRunSummary syncRuns={syncRuns} isLoading={isLoadingSyncRuns} />}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索公司、职位或地点" /></div>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={batch} onChange={(event) => setBatch(event.target.value)}><option value="all">全部批次</option><option value="提前批">提前批</option><option value="秋招正式批">秋招正式批</option></select>
          <select aria-label="岗位排序" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="published_desc">最新发布</option><option value="published_asc">最早发布</option><option value="priority">重点优先</option><option value="company">公司名称</option></select>
          <div className="flex flex-wrap gap-2"><Button variant={onlyChengdu ? 'default' : 'outline'} size="sm" onClick={() => setOnlyChengdu(!onlyChengdu)}><MapPin className="mr-1 h-3.5 w-3.5" />优先城市</Button><Button variant={onlyMajor ? 'default' : 'outline'} size="sm" onClick={() => setOnlyMajor(!onlyMajor)}><Star className="mr-1 h-3.5 w-3.5" />行业大厂</Button><Button variant={onlyActive ? 'secondary' : 'outline'} size="sm" onClick={() => setOnlyActive(!onlyActive)}><Filter className="mr-1 h-3.5 w-3.5" />{onlyActive ? '未完成' : '全部状态'}</Button></div>
        </div>
      </section>

      <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{isLoading ? '正在加载岗位…' : `找到 ${filtered.length} 个匹配岗位`}</p><div className="flex gap-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />优先城市</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />行业大厂</span></div></div>

      {error && <p role="alert" className="text-red-700">岗位读取失败：{error.message}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((job) => <JobCard key={job.id} job={job} onOpen={() => openApplication(job)} onConfirm={() => confirm({ representativeId: job.activeIds?.[0] ?? job.sourceIds?.[0] ?? job.id, siblingIds: (job.activeIds ?? []).filter((id) => id !== (job.activeIds?.[0] ?? job.sourceIds?.[0] ?? job.id)) })} onUpdateNotes={updateNotes} isUpdatingNotes={isUpdatingNotes} onUpdatePersonalState={updatePersonalState} isUpdatingPersonalState={isUpdatingPersonalState} />)}
      </div>
      {!isLoading && !error && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-14 text-center text-slate-500">暂无岗位。上传符合模板的 Excel，或在求职跟踪中手动添加投递记录。</div>}
    </div>
  );
}

function SyncRunSummary({ syncRuns, isLoading }) {
  const latest = syncRuns[0];
  if (isLoading) return <p className="text-xs text-slate-500">正在读取最近同步记录…</p>;
  if (!latest) return <p className="text-xs text-slate-500">尚无同步记录。连接飞书后可立即同步岗位。</p>;
  const status = latest.status === 'success' ? { label: '同步成功', className: 'bg-emerald-50 text-emerald-800' } : latest.status === 'skipped' ? { label: '本次跳过', className: 'bg-slate-100 text-slate-700' } : { label: '同步失败', className: 'bg-red-50 text-red-800' };
  const syncedAt = new Date(latest.created_at);
  const time = Number.isNaN(syncedAt.getTime()) ? '时间待确认' : syncedAt.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-900">最近同步 <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${status.className}`}>{status.label}</span></p><p className="mt-1 text-xs text-slate-500">{time} · {latest.trigger === 'scheduled' ? '定时同步' : '手动同步'}</p></div><p className="text-xs text-slate-600">{latest.message || `有效行 ${latest.read_count ?? 0} · 新增 ${latest.created_count} · 更新 ${latest.updated_count} · 未变化 ${latest.unchanged_count ?? 0}`}</p></section>;
}

function JobCard({ job, onOpen, onConfirm, onUpdateNotes, isUpdatingNotes, onUpdatePersonalState, isUpdatingPersonalState }) {
  const converted = job.status === 'converted';
  const archived = job.status === 'archived';
  const [expanded, setExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState(job.notes ?? '');
  const positions = job.positions ?? [job.position];
  const notesTooLong = job.notes?.length > 20;
  const visibleNotes = notesTooLong && !notesExpanded ? `${job.notes.slice(0, 20)}…` : job.notes;
  const hasArticleUrl = isExternalUrl(job.article_url);
  const hasApplyUrl = isExternalUrl(job.apply_url);
  const batchClass = job.batch === '提前批' ? 'bg-amber-100 text-amber-900 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100';
  const sourceIds = job.sourceIds ?? [job.id];
  const isDeprioritized = Boolean(job.is_deprioritized);

  useEffect(() => setNotesDraft(job.notes ?? ''), [job.notes]);

  const saveNotes = async () => {
    await onUpdateNotes({ ids: job.sourceIds ?? [job.id], notes: notesDraft });
    setNotesEditing(false);
    setNotesExpanded(false);
  };

  const togglePinned = async () => {
    await onUpdatePersonalState({ ids: sourceIds, is_pinned: !job.is_pinned, is_deprioritized: false });
    toast.success(job.is_pinned ? '已取消置顶' : '已置顶');
  };

  const toggleDeprioritized = async () => {
    await onUpdatePersonalState({ ids: sourceIds, is_pinned: false, is_deprioritized: !isDeprioritized });
    toast.success(isDeprioritized ? '已恢复为可投递岗位' : '已标记为暂不投递');
  };

return <Card className={`group relative overflow-hidden border-slate-200 bg-white transition ${isDeprioritized ? 'opacity-65 grayscale-[0.8] hover:opacity-80' : 'hover:-translate-y-0.5 hover:shadow-lg'} ${job.is_chengdu ? 'border-l-4 border-l-rose-500' : ''}`}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="flex items-center gap-2 font-display text-xl font-bold text-slate-950"><Building2 className="h-4 w-4 shrink-0 text-slate-400" />{job.company_name}</p><div className="mt-2 space-y-1 text-sm font-medium leading-6 text-slate-700">{positions.slice(0, expanded ? positions.length : 3).map((position) => <p key={position}>{position}</p>)}{positions.length > 3 && <button type="button" className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline" onClick={() => setExpanded((value) => !value)}>{expanded ? '收起职位' : `查看其余 ${positions.length - 3} 个职位`}</button>}</div></div><Badge variant="outline" className="shrink-0">{statusLabel[job.status]}</Badge></div><div className="mt-4 flex flex-wrap gap-2"><Badge className={batchClass}>{job.batch}</Badge>{job.is_pinned && <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100"><Pin className="mr-1 h-3 w-3" />已置顶</Badge>}{isDeprioritized && <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200"><CircleOff className="mr-1 h-3 w-3" />暂不投递</Badge>}{job.is_chengdu && <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50"><MapPin className="mr-1 h-3 w-3" />优先城市</Badge>}{job.is_major_company && <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100"><Star className="mr-1 h-3 w-3" />行业大厂</Badge>}</div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant={job.is_pinned ? 'default' : 'outline'} size="sm" className={job.is_pinned ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : ''} disabled={isUpdatingPersonalState} onClick={togglePinned}>{job.is_pinned ? <PinOff className="mr-1 h-3.5 w-3.5" /> : <Pin className="mr-1 h-3.5 w-3.5" />}{job.is_pinned ? '取消置顶' : '置顶'}</Button><Button type="button" variant="outline" size="sm" className={isDeprioritized ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100'} disabled={isUpdatingPersonalState} onClick={toggleDeprioritized}><CircleOff className="mr-1 h-3.5 w-3.5" />{isDeprioritized ? '恢复投递' : '暂不投递'}</Button></div><div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{job.location || '地点待确认'}</p><p className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5" />{job.published_at ? `发布时间 ${formatSourceDate(job.published_at)}` : '发布时间待确认'}</p></div><div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-slate-700"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-amber-900">其他信息（含内推码）</p>{!notesEditing && <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-amber-900 hover:bg-amber-100 hover:text-amber-950" onClick={() => setNotesEditing(true)}><Pencil className="mr-1 h-3 w-3" />编辑</Button>}</div>{notesEditing ? <><Textarea className="mt-2 min-h-28 bg-white text-xs leading-5" value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} placeholder="可填写内推码、薪资参考或个人备注" /><div className="mt-2 flex flex-wrap gap-2"><Button type="button" size="sm" className="h-7 bg-slate-950 text-xs hover:bg-slate-800" disabled={isUpdatingNotes} onClick={saveNotes}><Save className="mr-1 h-3 w-3" />{isUpdatingNotes ? '保存中…' : '保存'}</Button><Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={isUpdatingNotes} onClick={() => setNotesDraft('')}>清空内容</Button><Button type="button" size="sm" variant="ghost" className="h-7 text-xs" disabled={isUpdatingNotes} onClick={() => { setNotesDraft(job.notes ?? ''); setNotesEditing(false); }}><X className="mr-1 h-3 w-3" />取消</Button></div></> : <>{job.notes ? <><p className="mt-1 whitespace-pre-wrap leading-5">{visibleNotes}</p>{notesTooLong && <button type="button" className="mt-1 text-amber-900 underline-offset-2 hover:underline" onClick={() => setNotesExpanded((value) => !value)}>{notesExpanded ? '收起' : '展开'}</button>}</> : <p className="mt-1 text-slate-500">暂无其他信息</p>}</>}</div><div className="mt-4 flex flex-wrap gap-2 text-xs"><a className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 ${hasArticleUrl ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'cursor-not-allowed border-slate-100 text-slate-400'}`} href={hasArticleUrl ? job.article_url : undefined} target={hasArticleUrl ? '_blank' : undefined} rel={hasArticleUrl ? 'noreferrer' : undefined}><Link2 className="h-3.5 w-3.5" />官方推送</a><a className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 ${hasApplyUrl ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'cursor-not-allowed border-slate-100 text-slate-400'}`} href={hasApplyUrl ? job.apply_url : undefined} target={hasApplyUrl ? '_blank' : undefined} rel={hasApplyUrl ? 'noreferrer' : undefined}><ArrowUpRight className="h-3.5 w-3.5" />投递官网</a></div><div className="mt-5 flex gap-2">{!converted && !archived && <Button size="sm" className="flex-1 bg-slate-950 hover:bg-slate-800" onClick={onOpen} disabled={!hasApplyUrl} title={hasApplyUrl ? '打开投递官网并标记待确认' : '来源未提供投递官网链接'}><ArrowUpRight className="mr-1.5 h-4 w-4" />{hasApplyUrl ? '去投递' : '缺少投递链接'}</Button>}{job.status === 'pending_confirmation' && <Button size="sm" className="flex-1 bg-emerald-700 hover:bg-emerald-600" onClick={onConfirm}><CheckCircle2 className="mr-1.5 h-4 w-4" />确认已投递</Button>}{converted && <p className="flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-50 text-sm font-medium text-emerald-700"><CircleDot className="h-4 w-4" />已转入跟踪</p>}{archived && <p className="flex flex-1 items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-500">旧链接已归档</p>}</div></CardContent></Card>;
}
