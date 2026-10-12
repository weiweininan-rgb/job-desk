import test from 'node:test';
import assert from 'node:assert/strict';
import { poolRedirectUrl } from '../supabase/functions/_shared/oauthUrl.ts';
import { errorMessage } from '../supabase/functions/_shared/database.types.ts';

test('OAuth redirect keeps a GitHub Pages repository path', () => {
  const url = new URL(poolRedirectUrl('https://example.github.io/job-desk','connected','授权成功'));
  assert.equal(url.pathname, '/job-desk/');
  assert.equal(url.hash, '#/pool');
  assert.equal(url.searchParams.get('feishu'), 'connected');
  assert.equal(url.searchParams.get('message'), '授权成功');
  assert.equal(new URL(poolRedirectUrl('http://localhost:8080','failed','失败')).pathname, '/');
});
test('error messages handle Error, database errors and unknown thrown values', () => {
  assert.equal(errorMessage(new Error('测试'), '失败'),'测试');
  assert.equal(errorMessage({message:'数据库错误'}, '失败'),'数据库错误');
  assert.equal(errorMessage(null,'失败'),'失败');
  assert.equal(errorMessage('unknown','失败'),'失败');
});
