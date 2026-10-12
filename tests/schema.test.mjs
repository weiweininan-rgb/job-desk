import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('empty database initialization, owner isolation, transfer and reversible abandonment', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
    `);
    const schema = await readFile(new URL('../deploy/schema.sql', import.meta.url), 'utf8');
    await db.exec(schema);
    const login = async user => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${user}';`);
    const first = '00000000-0000-0000-0000-000000000001';
    const second = '00000000-0000-0000-0000-000000000002';
    const assertSyncPrivileges = async () => {
      await db.exec('reset role;');
      const rows = (await db.query(`
        select proname,
          has_function_privilege('anon',oid,'EXECUTE') as anon_allowed,
          has_function_privilege('authenticated',oid,'EXECUTE') as user_allowed,
          has_function_privilege('service_role',oid,'EXECUTE') as server_allowed
        from pg_proc where proname in ('claim_feishu_sync_slot','release_feishu_sync_slot')
      `)).rows;
      assert.equal(rows.length, 2);
      for (const row of rows) {
        assert.equal(row.anon_allowed, false, row.proname);
        assert.equal(row.user_allowed, false, row.proname);
        assert.equal(row.server_allowed, true, row.proname);
      }
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role};`);
        await assert.rejects(db.query('select claim_feishu_sync_slot($1)', [first]), /permission denied/);
        await assert.rejects(db.query('select release_feishu_sync_slot($1)', [first]), /permission denied/);
        await db.exec('reset role;');
      }
      await db.exec('set role service_role;');
      assert.equal((await db.query('select claim_feishu_sync_slot($1) as claimed', [first])).rows[0].claimed, true);
      await db.query('select release_feishu_sync_slot($1)', [first]);
      await db.exec('reset role;');
    };
    await assertSyncPrivileges();
    // Reproduce an older Supabase installation's explicit default grants, then upgrade it.
    await db.exec(`
      grant execute on function public.claim_feishu_sync_slot(uuid) to anon, authenticated;
      grant execute on function public.release_feishu_sync_slot(uuid) to anon, authenticated;
    `);
    await db.exec(await readFile(new URL('../deploy/upgrades/202610120001_restrict_feishu_sync_rpc.sql', import.meta.url), 'utf8'));
    await assertSyncPrivileges();
    await login(first);
    await db.exec(`insert into job_sources(owner_id,fingerprint,company_name,position,apply_url)
      values(auth.uid(),'example','示例公司','产品经理','https://example.com');`);
    const source = (await db.query('select id from job_sources')).rows[0].id;
    const id = (await db.query('select confirm_job_source($1) as id', [source])).rows[0].id;
    assert.equal((await db.query('select confirm_job_source($1) as id', [source])).rows[0].id, id);
    assert.equal((await db.query('select status from job_sources')).rows[0].status, 'converted');
    await db.exec(`insert into application_interviews(application_id,round) values(${id},'一面');`);
    await db.exec(`update applications set is_abandoned=true where id=${id};`);
    assert.equal((await db.query('select is_abandoned,status from applications')).rows[0].is_abandoned, true);
    assert.equal((await db.query('select status from applications')).rows[0].status, '已投递');
    await db.exec(`update applications set is_abandoned=false where id=${id};`);
    await db.exec("update user_settings set preferred_cities=array['上海'] where owner_id=auth.uid();");
    await login(second);
    for (const table of ['applications','application_interviews','job_sources','user_settings']) {
      assert.equal((await db.query(`select * from ${table}`)).rows.length, 0);
    }
    await assert.rejects(db.query('select confirm_job_source($1)', [source]));
    await assert.rejects(db.query('select delete_application_and_restore_source($1)', [id]));
    await assert.rejects(db.query('select * from feishu_connections'));
    await assert.rejects(db.query('select claim_feishu_sync_slot($1)', [first]));
    await assert.rejects(db.query(`insert into applications(owner_id,company_name) values($1,'伪造')`, [first]));
    await db.exec(`update applications set company_name='无权更改' where id=${id};`);
    await login(first);
    assert.equal((await db.query('select company_name from applications')).rows[0].company_name, '示例公司');
    await db.query('select delete_application_and_restore_source($1)', [id]);
    assert.equal((await db.query('select * from applications')).rows.length, 0);
    assert.equal((await db.query('select * from application_interviews')).rows.length, 0);
    assert.equal((await db.query('select status from job_sources')).rows[0].status, 'pool');
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select confirm_job_source($1)', [source]));
    await db.exec('reset role;');
    await assert.rejects(db.exec(schema), /NEW empty project/);
    await db.exec('rollback;');
  } finally { await db.close(); }
});
