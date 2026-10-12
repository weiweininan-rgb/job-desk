import { readFile } from 'node:fs/promises';
const args = process.argv.slice(2);
const ref = args.find(arg => /^[a-z]{20}$/.test(arg));
if (!ref) throw new Error('Usage: npm run deploy:database -- PROJECT_REF [--apply]');
if (!args.includes('--apply')) {
  console.log(`Preview: initialize empty project ${ref} with deploy/schema.sql. No remote changes. Add --apply after confirming the target.`);
} else {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('Provide SUPABASE_ACCESS_TOKEN in the process environment, never in VITE_* or chat.');
  const query = await readFile(new URL('../deploy/schema.sql', import.meta.url), 'utf8');
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  // Response bodies may contain database or authentication details; do not log them.
  if (!response.ok) throw new Error(`Initialization failed (HTTP ${response.status}). Check the empty-schema requirement and project access in Supabase. No SQL retry is performed.`);
  console.log('Database initialized. Create the owner account and disable signups in the Supabase dashboard next.');
}
