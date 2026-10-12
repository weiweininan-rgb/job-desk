import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
const repo = args.find(arg => /^[\w.-]+\/[\w.-]+$/.test(arg));
if (!repo) throw new Error('Usage: npm run deploy:pages -- OWNER/REPO [--apply]');
if (!args.includes('--apply')) {
  console.log(`Preview: set public frontend variables and enable GitHub Actions Pages for ${repo}. No upload, commit, visibility change or deployment is performed.`);
} else {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!/^https:\/\/[a-z]{20}\.supabase\.co$/.test(url ?? '') || !key) throw new Error('Provide a Supabase URL and anon/publishable key in process environment.');
  if (key.startsWith('sb_secret_')) throw new Error('A secret key must never enter the frontend.');
  if (key.split('.').length === 3) {
    let role;
    try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { throw new Error('Invalid frontend JWT key.'); }
    if (role !== 'anon') throw new Error('Only an anon key is allowed in frontend configuration.');
  } else if (!key.startsWith('sb_publishable_')) throw new Error('Use an anon or publishable key.');
  const run = (command, input) => {
    const result = spawnSync('gh', command, { input, encoding: 'utf8', windowsHide: true });
    if (result.error || result.status !== 0) throw new Error('GitHub configuration failed. Check gh login, repository access and Pages availability; credentials are not logged.');
    return result.stdout;
  };
  for (const [name,value] of Object.entries({ VITE_SUPABASE_URL:url, VITE_SUPABASE_ANON_KEY:key, VITE_ENABLE_FEISHU:process.env.VITE_ENABLE_FEISHU ?? 'false' })) {
    run(['variable','set',name,'--repo',repo], value);
  }
  // PATCH existing Pages; POST only if read-only lookup says Pages is not configured.
  const exists = spawnSync('gh', ['api',`repos/${repo}/pages`], { encoding:'utf8', windowsHide:true });
  if (exists.error) throw new Error('GitHub CLI is unavailable.');
  if (exists.status !== 0 && !exists.stderr.includes('404')) throw new Error('Could not inspect Pages configuration.');
  run(['api',`repos/${repo}/pages`,'--method',exists.status === 0 ? 'PUT' : 'POST','--input','-'], JSON.stringify({ build_type:'workflow' }));
  console.log('Pages configured. Push reviewed release source and run “Deploy personal Job Desk” in Actions. Optional Feishu requires separate server setup.');
}
