import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fetchApplications = async () => {
  const { data, error } = await supabase
    .from('applications')
    .select('*, job_sources(article_url, batch, is_chengdu, is_major_company, is_pinned)')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data || []).map((application) => {
    const source = Array.isArray(application.job_sources)
      ? application.job_sources[0]
      : application.job_sources;

    return {
      ...application,
      batch: application.batch ?? source?.batch ?? null,
      is_chengdu: application.is_chengdu ?? source?.is_chengdu ?? false,
      is_major_company: application.is_major_company ?? source?.is_major_company ?? false,
      is_pinned: application.is_pinned ?? source?.is_pinned ?? false,
    };
  });
};

const createApplication = async (application) => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const { data, error } = await supabase
    .from('applications')
    .insert([{ ...application, owner_id: userData.user.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

const updateApplication = async ({ id, ...updates }) => {
  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

const deleteApplication = async (id) => {
  const { error } = await supabase.rpc('delete_application_and_restore_source', { p_application_id: id });
  if (error) throw new Error('删除失败：' + error.message);
  return { success: true, id };
};

export const useApplications = () => {
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading, error } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
  });

  const createMutation = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('申请记录添加成功');
    },
    onError: (error) => {
      toast.error('添加失败: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('申请记录更新成功');
    },
    onError: (error) => {
      toast.error('更新失败: ' + error.message);
    },
  });

  // 优化删除 mutation，添加详细的错误处理和状态反馈
  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onMutate: async (id) => {
      // 取消正在进行的重新获取，避免乐观更新冲突
      await queryClient.cancelQueries({ queryKey: ['applications'] });
      await queryClient.cancelQueries({ queryKey: ['allInterviews'] });
      
      // 保存之前的状态，以便出错时回滚
      const previousApplications = queryClient.getQueryData(['applications']);
      const previousInterviews = queryClient.getQueryData(['allInterviews']);
      
      // 乐观更新：从 UI 中立即移除该记录
      queryClient.setQueryData(['applications'], (old) => {
        if (!old) return [];
        return old.filter(app => app.id !== id);
      });
      
      // 同时移除关联的面试记录
      queryClient.setQueryData(['allInterviews'], (old) => {
        if (!old) return [];
        return old.filter(interview => interview.application_id !== id);
      });
      
      return { previousApplications, previousInterviews };
    },
    onSuccess: (data) => {
      console.log('Delete mutation succeeded:', data);
      toast.success('申请记录删除成功');
      
      // 确保数据是最新的
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['allInterviews'] });
      queryClient.invalidateQueries({ queryKey: ['job-sources'] });
    },
    onError: (error, id, context) => {
      console.error('Delete mutation failed:', error);
      
      // 回滚到之前的状态
      if (context?.previousApplications) {
        queryClient.setQueryData(['applications'], context.previousApplications);
      }
      if (context?.previousInterviews) {
        queryClient.setQueryData(['allInterviews'], context.previousInterviews);
      }
      
      // 显示详细的错误信息
      let errorMessage = '删除失败';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage += ': ' + error.code;
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      // 无论成功或失败，都重新获取数据以确保一致性
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['allInterviews'] });
    },
  });

  return {
    applications,
    isLoading,
    error,
    createApplication: createMutation.mutate,
    createApplicationAsync: createMutation.mutateAsync,
    updateApplication: updateMutation.mutate,
    updateApplicationAsync: updateMutation.mutateAsync,
    deleteApplication: deleteMutation.mutateAsync, // 关键修复：使用 mutateAsync 返回 Promise
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
