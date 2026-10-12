// Export a fresh-history source bundle. Never copy the private workspace wholesale.
import { access, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const target = resolve(root,'release',`job-desk-${Date.now()}`);
const files = ['.env.example','.gitignore','.eslintrc.cjs','.nvmrc','components.json','index.html','jsconfig.json','package.json','package-lock.json','postcss.config.js','tailwind.config.js','vite.config.js','README.md','LICENSE','SECURITY.md','CONTRIBUTING.md','THIRD_PARTY_NOTICES.md'];
const folders = ['deploy','scripts','tests','public'];
const allowedDocs = ['DEPLOYMENT.md','AI_DEPLOY.md','FEISHU.md','RELEASE_CHECKLIST.md','VALIDATION.md'];
const selected = [...files, ...allowedDocs.map(name=>'docs/'+name), '.github/workflows/deploy-pages.yml',
  'supabase/functions/_shared/database.types.ts',
  'supabase/functions/_shared/oauthUrl.ts',
  'supabase/functions/sync-feishu/index.ts','supabase/functions/feishu-oauth-callback/index.ts'];
async function collect(dir) {
  for (const entry of await readdir(join(root,dir),{withFileTypes:true})) {
    const path = dir+'/'+entry.name;
    if (entry.isSymbolicLink()) throw new Error('Release refuses symbolic links: '+path);
    if (path === 'src/supabase') continue;
    if (entry.isDirectory()) await collect(path); else selected.push(path);
  }
}
for (const dir of ['src',...folders]) await collect(dir);
// This intentionally excludes history, production migrations, .env.local, logs,
// screenshots, operational AGENTS.md and private company-intel-query.
const forbidden = [/https:\/\/[a-z]{20}\.supabase\.co/i,/https:\/\/(?!example\.)[\w.-]+\.feishu\.cn\/wiki\/[A-Za-z0-9]{12,}/i,/@meituan[-]nocode/i,/sb_secret_[A-Za-z0-9_-]{20,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for (const file of selected) {
  const text = await readFile(join(root,file),'utf8');
  if (forbidden.some(pattern=>pattern.test(text))) throw new Error('Private identifier or credential pattern detected in '+file+'; value not printed.');
  for (const jwt of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try { if (JSON.parse(Buffer.from(jwt.split('.')[1],'base64url')).role === 'service_role') throw new Error('Service role token in '+file); }
    catch (error) { if (error.message.startsWith('Service role')) throw error; }
  }
}
await mkdir(target,{recursive:true});
for (const file of selected) {
  await mkdir(resolve(target,file,'..'),{recursive:true});
  await cp(join(root,file),join(target,file),{errorOnExist:true,force:false});
}
await mkdir(join(target,'supabase'),{recursive:true});
await writeFile(join(target,'supabase/config.toml'),'[functions.sync-feishu]\nverify_jwt = false\n\n[functions.feishu-oauth-callback]\nverify_jwt = false\n');
// Preserve upstream license notices for installed packages; avoids relabeling third-party code as MIT.
const lock = JSON.parse(await readFile(join(root,'package-lock.json'),'utf8'));
const inventory = [];
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path.startsWith('node_modules/')) continue;
  try {
    await access(join(root,path));
    const packageJson = JSON.parse(await readFile(join(root,path,'package.json'),'utf8'));
    const licenseFiles = (await readdir(join(root,path))).filter(name => /^(license|licence|copying|notice)(\.|$)/i.test(name));
    const dest = join(target,'third-party',path.replaceAll('node_modules/','').replaceAll('/','__'));
    await mkdir(dest,{recursive:true});
    for (const name of licenseFiles) await cp(join(root,path,name),join(dest,name));
    inventory.push({ name:packageJson.name, version:packageJson.version, license:packageJson.license ?? entry.license ?? 'UNKNOWN', notices:licenseFiles });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await writeFile(join(target,'third-party/inventory.json'),JSON.stringify(inventory,null,2)+'\n');
console.log(`Prepared ${selected.length} source files and ${inventory.length} dependency notices in ${relative(root,target)}. No Git history, account data or remote changes copied. Review before publishing.`);
