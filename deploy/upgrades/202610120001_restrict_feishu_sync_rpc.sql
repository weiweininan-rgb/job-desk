-- Existing installations: restrict server-only sync locks without changing user data.
begin;
revoke all on function public.claim_feishu_sync_slot(uuid) from public, anon, authenticated;
revoke all on function public.release_feishu_sync_slot(uuid) from public, anon, authenticated;
grant execute on function public.claim_feishu_sync_slot(uuid) to service_role;
grant execute on function public.release_feishu_sync_slot(uuid) to service_role;
commit;
