import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_MAJOR_COMPANIES, DEFAULT_PROFILE_KEYWORDS } from '@/lib/jobMatcher';

const defaults = { profile_keywords: DEFAULT_PROFILE_KEYWORDS, major_companies: DEFAULT_MAJOR_COMPANIES, preferred_cities: [] };

const getSettings = async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const { data, error } = await supabase.from('user_settings').select('*').eq('owner_id', userData.user.id).maybeSingle();
  if (error) throw error;
  return data ?? { ...defaults, owner_id: userData.user.id };
};

export const useSettings = () => {
  const client = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const save = useMutation({
    mutationFn: async (values) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const { error } = await supabase.from('user_settings').upsert({ owner_id: userData.user.id, ...values, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['settings'] }),
  });
  return { ...settings, save: save.mutateAsync, isSaving: save.isPending };
};
