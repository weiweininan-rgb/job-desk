import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseJobWorkbook } from '@/lib/excelJobImport';
import { DEFAULT_MAJOR_COMPANIES, DEFAULT_PROFILE_KEYWORDS, formatSourceDate } from '@/lib/jobMatcher';
import { feishuEnabled } from '@/lib/featureFlags';

const fetchJobSources = async () => {
  const { data, error } = await supabase
    .from('job_sources')
    .select('*')
    .order('is_chengdu', { ascending: false })
    .order('is_major_company', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((source) => ({ ...source, published_at: formatSourceDate(source.published_at) }));
};

export const useJobSources = () => {
  const queryClient = useQueryClient();
  const sources = useQuery({ queryKey: ['job-sources'], queryFn: fetchJobSources });
  const feishuConnection = useQuery({
    queryKey: ['feishu-connection'],
    enabled: feishuEnabled,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('feishu-oauth-callback', { body: { action: 'status' } });
      if (error) throw error;
      return data;
    },
  });
  const syncRuns = useQuery({
    queryKey: ['sync-runs'],
    enabled: feishuEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_runs')
        .select('id, trigger, status, created_count, updated_count, unchanged_count, filtered_count, read_count, message, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['job-sources'] });
  const refreshSyncRuns = () => queryClient.invalidateQueries({ queryKey: ['sync-runs'] });

  const markPending = useMutation({
    mutationFn: async (ids) => {
      const sourceIds = Array.isArray(ids) ? ids : [ids];
      const { error } = await supabase.from('job_sources').update({ status: 'pending_confirmation', last_opened_at: new Date().toISOString() }).in('id', sourceIds);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (error) => toast.error('无法更新投递状态：' + error.message),
  });

  const confirm = useMutation({
    mutationFn: async ({ representativeId, siblingIds = [] }) => {
      const { error } = await supabase.rpc('confirm_job_source', { p_job_source_id: representativeId });
      if (error) throw error;
      if (siblingIds.length) {
        const { error: siblingError } = await supabase.from('job_sources').update({ status: 'converted', updated_at: new Date().toISOString() }).in('id', siblingIds);
        if (siblingError) throw siblingError;
      }
    },
    onSuccess: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('已转入求职跟踪');
    },
    onError: (error) => toast.error('转入失败：' + error.message),
  });

  const updateNotes = useMutation({
    mutationFn: async ({ ids, notes }) => {
      const { error } = await supabase
        .from('job_sources')
        .update({ notes: notes.trim(), updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success('其他信息已保存');
    },
    onError: (error) => toast.error('无法保存其他信息：' + error.message),
  });

  const updatePersonalState = useMutation({
    mutationFn: async ({ ids, is_pinned, is_deprioritized }) => {
      const { error } = await supabase
        .from('job_sources')
        .update({ is_pinned, is_deprioritized, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (error) => toast.error('无法更新岗位标记：' + error.message),
  });

  const sync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-feishu', { body: { mode: 'manual' } });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      refresh();
      refreshSyncRuns();
      if (result?.skipped) toast.message(result.message);
      else toast.success(`同步完成：有效行 ${result?.readCount ?? 0}，新增 ${result?.created ?? 0}，更新 ${result?.updated ?? 0}，未变化 ${result?.unchanged ?? 0}`);
    },
    onError: (error) => {
      refreshSyncRuns();
      toast.error('同步失败：' + error.message);
    },
  });

  const connectFeishu = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('feishu-oauth-callback', { body: { action: 'start' } });
      if (error) throw error;
      if (!data?.authorizationUrl) throw new Error('未获得飞书授权链接');
      window.location.assign(data.authorizationUrl);
    },
    onError: (error) => toast.error('无法打开飞书授权：' + error.message),
  });

  const importWorkbook = useMutation({
    mutationFn: async (file) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const { data: savedSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('owner_id', userData.user.id)
        .maybeSingle();
      if (settingsError) throw settingsError;

      const settings = savedSettings ? { ...savedSettings, preferred_cities: savedSettings.preferred_cities ?? ['成都'] } : { profile_keywords: DEFAULT_PROFILE_KEYWORDS, major_companies: DEFAULT_MAJOR_COMPANIES, preferred_cities: [] };
      const result = await parseJobWorkbook(file, settings);
      if (!result.jobs.length) return result;

      const { error } = await supabase.from('job_sources').upsert(
        result.jobs.map((job) => ({ ...job, owner_id: userData.user.id, updated_at: new Date().toISOString() })),
        { onConflict: 'owner_id,fingerprint' },
      );
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      refresh();
      toast.success(`Excel「${result.sheetName}」：读取 ${result.sourceRowCount} 行，收录 ${result.jobs.length}，过滤 ${result.filteredCount}`);
    },
    onError: (error) => toast.error('Excel 导入失败：' + error.message),
  });

  return {
    ...sources,
    markPending: markPending.mutate,
    isMarking: markPending.isPending,
    confirm: confirm.mutate,
    isConfirming: confirm.isPending,
    updateNotes: updateNotes.mutateAsync,
    isUpdatingNotes: updateNotes.isPending,
    updatePersonalState: updatePersonalState.mutateAsync,
    isUpdatingPersonalState: updatePersonalState.isPending,
    sync: sync.mutate,
    isSyncing: sync.isPending,
    syncRuns: syncRuns.data ?? [],
    isLoadingSyncRuns: syncRuns.isLoading,
    feishuConnection: feishuConnection.data,
    isLoadingFeishuConnection: feishuConnection.isLoading,
    connectFeishu: connectFeishu.mutate,
    isConnectingFeishu: connectFeishu.isPending,
    importWorkbook: importWorkbook.mutate,
    isImporting: importWorkbook.isPending,
  };
};
