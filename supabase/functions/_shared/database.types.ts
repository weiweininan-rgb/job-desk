// Server-side subset of deploy/schema.sql. Keep column names aligned with schema changes.
type Table<Row extends Record<string, unknown>> = {
  Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [];
};
export type JobSource = {
  id: string; owner_id: string; fingerprint: string; company_name: string; position: string;
  batch: string; location: string; apply_url: string; article_url: string; notes: string;
  published_at: string; source_updated_at: string; is_chengdu: boolean; is_major_company: boolean;
  is_pinned: boolean; is_deprioritized: boolean; status: string;
  last_opened_at: string | null; created_at: string; updated_at: string;
};
export type Database = {
  public: {
    Tables: {
      job_sources: Table<JobSource>;
      user_settings: Table<{
        owner_id: string; profile_keywords: string[]; major_companies: string[];
        preferred_cities: string[]; last_synced_at: string | null;
        last_manual_synced_at: string | null; last_auto_synced_at: string | null;
        sync_in_progress_at: string | null; updated_at: string;
      }>;
      sync_runs: Table<{
        id: string; owner_id: string; trigger: string; status: string; message: string;
        created_count: number; updated_count: number; unchanged_count: number;
        filtered_count: number; read_count: number; created_at: string;
      }>;
      feishu_connections: Table<{
        owner_id: string; refresh_token: string; refresh_token_expires_at: string | null;
        scope: string | null; connected_at: string; updated_at: string;
      }>;
      feishu_oauth_states: Table<{
        state: string; owner_id: string; expires_at: string; created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      claim_feishu_sync_slot: { Args: { p_owner_id: string }; Returns: boolean };
      release_feishu_sync_slot: { Args: { p_owner_id: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
export const errorMessage = (error: unknown, fallback: string) =>
  error && typeof error === 'object' && 'message' in error ? String(error.message) : fallback;
