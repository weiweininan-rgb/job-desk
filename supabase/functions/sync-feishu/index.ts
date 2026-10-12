import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { type Database, errorMessage } from '../_shared/database.types.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const normalize = (value = '') => String(value).trim().replace(/\s+/g, ' ').toLowerCase();
const lines = (value = '') => String(value).split(/[\n、；;|]/).map((item) => item.trim()).filter(Boolean);
const isSalaryReferenceLink = (value = '') => {
  const ignored = Deno.env.get('FEISHU_IGNORED_REFERENCE_URL');
  return Boolean(ignored && value.split('?')[0] === ignored.split('?')[0]);
};
const stripSalaryReference = (value = '') => String(value).split('\n')
  .map(line => /薪资统计表/.test(line) ? line.replace(/\[[^\]]*\]\(https?:\/\/[^)]*\)/g, '').replace(/https?:\/\/[^\s]+/g, '').replace(/嵌入式校招薪资统计表/g, '') : line)
  .join('\n').trim();
const asText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(' ');
  if (value == null) return '';
  if (typeof value === 'object') {
    const cell = value as Record<string, unknown>;
    return [cell.link, cell.url, cell.href, cell.target, cell.text, cell.content, cell.value]
      .map(asText)
      .filter(Boolean)
      .join(' ');
  }
  return String(value);
};
const extractUrl = (value: string) => value.match(/https?:\/\/[^\s]+/)?.[0]?.replace(/[),.;，。；）】]+$/, '') ?? '';
const normalizeSourceDate = (value: string, defaultYear = new Date().getFullYear()) => {
  const text = String(value).trim();
  const match = text.match(/(?:(\d{4})[./-])?(\d{1,2})[./-](\d{1,2})/);
  if (!match) return text;
  const year = Number(match[1] ?? defaultYear);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return text;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const isRelevant = (position: string, context: string, keywords: string[]) => !keywords.length || keywords.some((word) => normalize(`${position} ${context}`).includes(normalize(word)));
const fingerprint = (company: string, position: string, applyUrl: string) => [normalize(company), normalize(position), normalize(applyUrl)].join('|');

async function feishuToken(admin: SupabaseClient<Database>, ownerId: string) {
  const { data: connection, error } = await admin.from('feishu_connections').select('refresh_token').eq('owner_id', ownerId).maybeSingle();
  if (error) throw error;
  if (!connection) throw new Error('FEISHU_NOT_CONNECTED: 请先在岗位池连接你的飞书账号');

  const response = await fetch('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: Deno.env.get('FEISHU_APP_ID'),
      client_secret: Deno.env.get('FEISHU_APP_SECRET'),
      refresh_token: connection.refresh_token,
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0 || !payload.access_token || !payload.refresh_token) {
    throw new Error(payload.msg ?? '飞书授权已过期，请重新连接飞书账号');
  }
  const now = new Date();
  const refreshExpiresAt = payload.refresh_token_expires_in
    ? new Date(now.getTime() + Number(payload.refresh_token_expires_in) * 1000).toISOString()
    : null;
  const { error: updateError } = await admin.from('feishu_connections').update({
    refresh_token: payload.refresh_token,
    refresh_token_expires_at: refreshExpiresAt,
    scope: payload.scope ?? null,
    updated_at: now.toISOString(),
  }).eq('owner_id', ownerId);
  if (updateError) throw updateError;
  return payload.access_token;
}

async function readRows(token: string) {
  const spreadsheet = Deno.env.get('FEISHU_SPREADSHEET_TOKEN');
  const sheet = Deno.env.get('FEISHU_SHEET_ID');
  if (!spreadsheet || !sheet) throw new Error('缺少 FEISHU_SPREADSHEET_TOKEN 或 FEISHU_SHEET_ID');
  const readRange = async (start: number, end: number): Promise<unknown[][]> => {
    const range = encodeURIComponent(`${sheet}!A${start}:K${end}`);
    const response = await fetch(`https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${spreadsheet}/values/${range}`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json();
    if (!response.ok || payload.code !== 0) throw new Error(payload.msg ?? '无法读取飞书电子表格');
    const values = payload.data?.valueRange?.values ?? [];
    if (!Array.isArray(values) || !values.every(Array.isArray)) throw new Error('飞书表格返回了无效行结构');
    return values;
  };
  const hasJob = (row: unknown[]) => Boolean(asText(row[1]).trim() && asText(row[2]).trim());
  const rows = await readRange(1, 500);
  let nextStart = 501;
  while (hasJob((await readRange(nextStart, nextStart))[0] ?? [])) {
    rows.push(...await readRange(nextStart, nextStart + 499));
    nextStart += 500;
  }
  return rows;
}

async function releaseSyncLock(admin: SupabaseClient<Database>, ownerId: string) {
  const { error } = await admin
    .from('user_settings')
    .update({ sync_in_progress_at: null })
    .eq('owner_id', ownerId);
  if (error) throw error;
}

async function readAllJobSources(admin: SupabaseClient<Database>, ownerId: string) {
  const pageSize = 1000;
  const allRows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('job_sources')
      .select('id, fingerprint, company_name, position, batch, location, apply_url, article_url, notes, published_at, source_updated_at, is_chengdu, is_major_company, status')
      .eq('owner_id', ownerId)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    allRows.push(...page);
    if (page.length < pageSize) return allRows;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let admin: SupabaseClient<Database> | undefined;
  let ownerId: string | undefined;
  let trigger: 'manual' | 'scheduled' = 'manual';
  let lockAcquired = false;
  try {
    const body = await request.json().catch(() => ({}));
    const { mode = 'manual' } = body;
    const sourceSearch = typeof body.search === 'string' ? body.search.trim() : '';
    const authorization = request.headers.get('Authorization') ?? '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    admin = createClient<Database>(url, service);
    trigger = mode === 'scheduled' ? 'scheduled' : 'manual';
    const ownerEmail = Deno.env.get('OWNER_EMAIL');
    if (mode === 'scheduled') {
      if (!Deno.env.get('SYNC_CRON_SECRET') || request.headers.get('x-sync-secret') !== Deno.env.get('SYNC_CRON_SECRET')) {
        return new Response(JSON.stringify({ error: '无权执行定时同步' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: users, error } = await admin.auth.admin.listUsers();
      if (error) throw error;
      ownerId = users.users.find((candidate) => candidate.email === ownerEmail)?.id;
    } else {
      const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user || user.email !== ownerEmail) return new Response(JSON.stringify({ error: '无权同步' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      ownerId = user.id;
    }
    if (!ownerId) throw new Error('未找到配置的个人账号');

    if (sourceSearch && mode !== 'scheduled') {
      const query = normalize(sourceSearch);
      const matches = (await readRows(await feishuToken(admin, ownerId)))
        .slice(1)
        .map((rawRow) => {
          const row = rawRow.map(asText);
          return {
            company_name: row[1] ?? '',
            positions: row[2] ?? '',
            batch: row[3] ?? '',
            location: row[4] ?? '',
            published_at: row[5] ?? '',
            article_url: extractUrl(row[7] ?? ''),
            apply_url: extractUrl(row[8] ?? ''),
          };
        })
        .filter((row) => normalize(`${row.company_name} ${row.positions} ${row.batch} ${row.location}`).includes(query));
      return Response.json({ matches }, { headers: corsHeaders });
    }

    const { data: settings } = await admin.from('user_settings').select('*').eq('owner_id', ownerId).maybeSingle();
    const now = new Date();
    if (mode === 'scheduled' && settings?.last_auto_synced_at && now.getTime() - new Date(settings.last_auto_synced_at).getTime() < 5 * 24 * 60 * 60 * 1000) {
      await admin.from('sync_runs').insert({ owner_id: ownerId, trigger: 'scheduled', status: 'skipped', message: '距离上次成功同步未满 5 天' });
      return Response.json({ skipped: true, message: '距离上次成功同步未满 5 天' }, { headers: corsHeaders });
    }

    let { data: claimed, error: claimError } = await admin.rpc('claim_feishu_sync_slot', { p_owner_id: ownerId });
    if (claimError) throw claimError;
    if (!claimed && settings?.sync_in_progress_at) {
      const { data: latestSuccess, error: latestSuccessError } = await admin
        .from('sync_runs')
        .select('created_at')
        .eq('owner_id', ownerId)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestSuccessError) throw latestSuccessError;
      if (latestSuccess && new Date(latestSuccess.created_at).getTime() >= new Date(settings.sync_in_progress_at).getTime()) {
        await releaseSyncLock(admin, ownerId);
        ({ data: claimed, error: claimError } = await admin.rpc('claim_feishu_sync_slot', { p_owner_id: ownerId }));
        if (claimError) throw claimError;
      }
    }
    if (!claimed) {
      const message = '已有同步正在进行，请稍后再试';
      await admin.from('sync_runs').insert({ owner_id: ownerId, trigger, status: 'skipped', message });
      return Response.json({ skipped: true, message }, { headers: corsHeaders });
    }
    lockAcquired = true;

    const rows = await readRows(await feishuToken(admin, ownerId));
    const readCount = rows.slice(1).filter((rawRow) => {
      const row = rawRow.map(asText);
      return Boolean(row[1]?.trim() && row[2]?.trim());
    }).length;
    let filtered = 0;
    const keywords = settings?.profile_keywords ?? [];
    const companies = settings?.major_companies ?? [];
    const cities = settings ? settings.preferred_cities ?? ['成都'] : [];
    const legacyRows = await readAllJobSources(admin, ownerId);
    const existingByFingerprint = new Map(legacyRows.map((row) => [row.fingerprint, row]));
    const updatesById = new Map<string, Record<string, unknown>>();
    const insertsByFingerprint = new Map<string, Record<string, unknown>>();
    const unchangedIds = new Set<string>();
    const staleIds = new Set<string>();
    for (const rawRow of rows.slice(1)) {
      // The source worksheet columns are: update date, company, positions, batch, locations, publish date, business info, article URL, application URL, other info.
      const row = rawRow.map(asText);
      const [sourceUpdatedAt, companyName, positions, batchSource, location, publishedAt, businessInfo] = row;
      const articleUrl = extractUrl(row[7] ?? '');
      const sourceApplyUrl = extractUrl(row[8] ?? '');
      const notes = stripSalaryReference([businessInfo, row[9]].filter(Boolean).join('\n'));
      if (!companyName || !positions) continue;
      for (const position of lines(positions)) {
        if (!isRelevant(position, `${notes} ${batchSource}`, keywords)) { filtered += 1; continue; }
        const batch = /提前批/.test(batchSource) ? '提前批' : '秋招正式批';
        const sourceFingerprint = fingerprint(companyName, position, sourceApplyUrl);
        let matched = existingByFingerprint.get(sourceFingerprint);
        if (!matched) {
          const candidates = legacyRows.filter((candidate) => (
            normalize(candidate.company_name) === normalize(companyName)
            && normalize(candidate.position) === normalize(position)
            && candidate.batch === batch
            && normalize(candidate.location) === normalize(location)
          ));
          matched = candidates.find((candidate) => candidate.status !== 'pool')
            ?? candidates.find((candidate) => candidate.apply_url && !isSalaryReferenceLink(candidate.apply_url))
            ?? candidates.find((candidate) => normalize(candidate.apply_url).includes('[object object]'))
            ?? candidates[0];
        }
        // A salary-reference sheet is not an application URL. Preserve a manually
        // corrected official URL instead of restoring the bad source value on sync.
        const applyUrl = isSalaryReferenceLink(sourceApplyUrl) && matched?.apply_url && !isSalaryReferenceLink(matched.apply_url)
          ? matched.apply_url
          : sourceApplyUrl;
        const source = {
          owner_id: ownerId, fingerprint: fingerprint(companyName, position, applyUrl), company_name: companyName, position,
          batch, location, apply_url: applyUrl, article_url: articleUrl,
          notes, published_at: normalizeSourceDate(publishedAt), source_updated_at: normalizeSourceDate(sourceUpdatedAt), is_chengdu: cities.some((city: string) => normalize(location).includes(normalize(city))),
          is_major_company: companies.some((company: string) => normalize(companyName).includes(normalize(company))), updated_at: now.toISOString(),
        };
        const matchingStaleIds = legacyRows
          .filter((candidate) => (
            candidate.id !== matched?.id
            && candidate.status === 'pool'
            && (normalize(candidate.apply_url).includes('[object object]') || isSalaryReferenceLink(sourceApplyUrl))
            && normalize(candidate.company_name) === normalize(companyName)
            && normalize(candidate.position) === normalize(position)
            && candidate.batch === source.batch
            && normalize(candidate.location) === normalize(location)
          ))
          .map((candidate) => candidate.id);
        matchingStaleIds.forEach((id) => staleIds.add(id));
        if (matched) {
          const hasChanged = matched.fingerprint !== source.fingerprint
            || matched.company_name !== source.company_name
            || matched.position !== source.position
            || matched.batch !== source.batch
            || matched.location !== source.location
            || matched.apply_url !== source.apply_url
            || matched.article_url !== source.article_url
            || matched.notes !== source.notes
            || matched.published_at !== source.published_at
            || matched.source_updated_at !== source.source_updated_at
            || matched.is_chengdu !== source.is_chengdu
            || matched.is_major_company !== source.is_major_company;
          if (hasChanged) {
            updatesById.set(matched.id, { ...source, id: matched.id });
            unchangedIds.delete(matched.id);
          } else if (!updatesById.has(matched.id)) {
            unchangedIds.add(matched.id);
          }
        } else {
          insertsByFingerprint.set(source.fingerprint, source);
        }
      }
    }
    const created = insertsByFingerprint.size;
    const updated = updatesById.size;
    const unchanged = unchangedIds.size;
    if (staleIds.size) {
      const { error } = await admin.from('job_sources').update({ status: 'archived', updated_at: now.toISOString() }).in('id', [...staleIds]);
      if (error) throw error;
    }
    if (updatesById.size) {
      const { error } = await admin.from('job_sources').upsert([...updatesById.values()], { onConflict: 'id' });
      if (error) throw error;
    }
    if (insertsByFingerprint.size) {
      const { error } = await admin.from('job_sources').upsert([...insertsByFingerprint.values()], { onConflict: 'owner_id,fingerprint' });
      if (error) throw error;
    }
    await admin.from('user_settings').upsert({
      owner_id: ownerId,
      profile_keywords: keywords,
      major_companies: companies,
      last_synced_at: now.toISOString(),
      ...(mode === 'scheduled' ? { last_auto_synced_at: now.toISOString() } : { last_manual_synced_at: now.toISOString() }),
      updated_at: now.toISOString(),
    });
    await releaseSyncLock(admin, ownerId);
    lockAcquired = false;
    await admin.from('sync_runs').insert({ owner_id: ownerId, trigger, status: 'success', created_count: created, updated_count: updated, unchanged_count: unchanged, filtered_count: filtered, read_count: readCount });
    return Response.json({ created, updated, unchanged, filtered, readCount }, { headers: corsHeaders });
  } catch (error) {
    const message = errorMessage(error, '同步失败');
    if (admin && ownerId) {
      try { await admin.from('sync_runs').insert({ owner_id: ownerId, trigger, status: 'failed', message }); } catch { /* Keep the original failure response if logging fails. */ }
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } finally {
    if (admin && ownerId && lockAcquired) {
      await releaseSyncLock(admin, ownerId).catch(() => undefined);
    }
  }
});
