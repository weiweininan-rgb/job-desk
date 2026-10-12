import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { type Database, errorMessage } from '../_shared/database.types.ts';
import { poolRedirectUrl } from '../_shared/oauthUrl.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
});

const config = () => {
  const appId = Deno.env.get('FEISHU_APP_ID');
  const appSecret = Deno.env.get('FEISHU_APP_SECRET');
  const redirectUri = Deno.env.get('FEISHU_OAUTH_REDIRECT_URI');
  const appUrl = Deno.env.get('APP_URL');
  if (!appId || !appSecret || !redirectUri || !appUrl) throw new Error('缺少飞书 OAuth 服务端配置');
  return { appId, appSecret, redirectUri, appUrl };
};

async function currentOwner(request: Request, ownerEmail: string | undefined) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || user.email !== ownerEmail) throw new Error('无权操作飞书连接');
  return user;
}

function redirectToPool(appUrl: string, status: 'connected' | 'denied' | 'failed', message: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: poolRedirectUrl(appUrl, status, message) },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient<Database>(url, service);
  const ownerEmail = Deno.env.get('OWNER_EMAIL');

  if (request.method === 'GET') {
    const { appId, appSecret, redirectUri, appUrl } = config();
    const callback = new URL(request.url);
    const state = callback.searchParams.get('state');
    const code = callback.searchParams.get('code');
    const denied = callback.searchParams.get('error');
    if (!state) return redirectToPool(appUrl, 'failed', '授权状态缺失，请回到网站重新连接。');

    const { data: savedState } = await admin.from('feishu_oauth_states').delete().eq('state', state).gt('expires_at', new Date().toISOString()).select('*').maybeSingle();
    if (!savedState || new Date(savedState.expires_at) < new Date()) {
      return redirectToPool(appUrl, 'failed', '授权已过期，请回到网站重新连接。');
    }
    if (denied || !code) return redirectToPool(appUrl, 'denied', '你未授予读取表格的权限。');

    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ grant_type: 'authorization_code', client_id: appId, client_secret: appSecret, code, redirect_uri: redirectUri }),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || token.code !== 0 || !token.refresh_token) {
      return redirectToPool(appUrl, 'failed', token.msg ?? '飞书未返回可长期使用的授权令牌。');
    }
    const now = new Date();
    const refreshExpiresAt = token.refresh_token_expires_in
      ? new Date(now.getTime() + Number(token.refresh_token_expires_in) * 1000).toISOString()
      : null;
    const { error } = await admin.from('feishu_connections').upsert({
      owner_id: savedState.owner_id,
      refresh_token: token.refresh_token,
      refresh_token_expires_at: refreshExpiresAt,
      scope: token.scope ?? null,
      connected_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    if (error) return redirectToPool(appUrl, 'failed', '授权已完成，但保存连接信息失败。');
    return redirectToPool(appUrl, 'connected', '已获得你的只读表格授权，可以开始同步岗位。');
  }

  try {
    const { action } = await request.json();
    const owner = await currentOwner(request, ownerEmail);
    if (action === 'status') {
      const { data } = await admin.from('feishu_connections').select('connected_at, refresh_token_expires_at').eq('owner_id', owner.id).maybeSingle();
      return json({ connected: Boolean(data), connectedAt: data?.connected_at ?? null, refreshTokenExpiresAt: data?.refresh_token_expires_at ?? null });
    }
    if (action !== 'start') return json({ error: '未知操作' }, 400);

    const { appId, redirectUri } = config();
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await admin.from('feishu_oauth_states').delete().lt('expires_at', new Date().toISOString());
    const { error } = await admin.from('feishu_oauth_states').insert({ state, owner_id: owner.id, expires_at: expiresAt });
    if (error) throw error;
    const authorizeUrl = new URL('https://accounts.feishu.cn/open-apis/authen/v1/authorize');
    authorizeUrl.search = new URLSearchParams({
      client_id: appId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'sheets:spreadsheet:readonly offline_access',
      state,
    }).toString();
    return json({ authorizationUrl: authorizeUrl.toString() });
  } catch (error) {
    return json({ error: errorMessage(error, '无法开始飞书授权') }, 500);
  }
});
