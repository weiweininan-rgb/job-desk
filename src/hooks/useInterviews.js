import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fetchInterviews = async (applicationId) => {
  const { data, error } = await supabase
    .from('application_interviews')
    .select('*')
    .eq('application_id', applicationId)
    .order('scheduled_time', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

const fetchAllInterviews = async () => {
  const { data, error } = await supabase
    .from('application_interviews')
    .select('*')
    .order('scheduled_time', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

const createInterview = async (interview) => {
  const { data, error } = await supabase
    .from('application_interviews')
    .insert([interview])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

const updateInterview = async ({ id, ...updates }) => {
  const { data, error } = await supabase
    .from('application_interviews')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

const markReminderTriggered = async (id) => {
  const { error } = await supabase
    .from('application_interviews')
    .update({ reminder_triggered: true })
    .eq('id', id);

  if (error) throw error;
};

const deleteInterview = async (id) => {
  const { error } = await supabase
    .from('application_interviews')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

const deleteInterviewsByApplicationId = async (applicationId) => {
  const { error } = await supabase
    .from('application_interviews')
    .delete()
    .eq('application_id', applicationId);
  
  if (error) throw error;
};

export const useInterviews = (applicationId) => {
  const queryClient = useQueryClient();

  const { 
    data: interviews = [], 
    isLoading, 
    isFetching,
    error 
  } = useQuery({
    queryKey: ['interviews', applicationId],
    queryFn: () => fetchInterviews(applicationId),
    enabled: !!applicationId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (failureCount >= 2) return false;
      return error.message?.includes('network') || error.message?.includes('timeout');
    },
    retryDelay: 1000,
  });

  const createMutation = useMutation({
    mutationFn: createInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['allInterviews'] });
      toast.success('流程节点添加成功');
    },
    onError: (error) => {
      toast.error('添加失败: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['allInterviews'] });
      toast.success('流程节点更新成功');
    },
    onError: (error) => {
      toast.error('更新失败: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['allInterviews'] });
      toast.success('流程节点删除成功');
    },
    onError: (error) => {
      toast.error('删除失败: ' + error.message);
    },
  });

  const reminderMutation = useMutation({
    mutationFn: markReminderTriggered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['allInterviews'] });
    },
  });

  return {
    interviews,
    isLoading,
    isFetching,
    error,
    createInterview: createMutation.mutate,
    createInterviewAsync: createMutation.mutateAsync,
    updateInterview: updateMutation.mutate,
    updateInterviewAsync: updateMutation.mutateAsync,
    markReminderTriggered: reminderMutation.mutateAsync,
    deleteInterview: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useAllInterviews = () => {
  const queryClient = useQueryClient();

  const { data: allInterviews = [], isLoading, error } = useQuery({
    queryKey: ['allInterviews'],
    queryFn: fetchAllInterviews,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const deleteByApplicationIdMutation = useMutation({
    mutationFn: deleteInterviewsByApplicationId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allInterviews'] });
    },
    onError: (error) => {
      toast.error('删除失败: ' + error.message);
    },
  });

  return {
    allInterviews,
    isLoading,
    error,
    deleteInterviewsByApplicationId: deleteByApplicationIdMutation.mutate,
  };
};
