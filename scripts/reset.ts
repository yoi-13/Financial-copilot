/**
 * Reset all system data while keeping user accounts.
 * Run: npx tsx scripts/reset.ts
 */
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const dbPassword = env['SUPABASE_DB_PASSWORD'] || 'Pathetic@pastaholic213213';
const projectRef = 'cefhrfsfohopkaghdodo';
const region = 'ap-southeast-2';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

async function run() {
  // Clear storage via Supabase admin client
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: files } = await supabase.storage.from('receipts').list();
  if (files && files.length > 0) {
    const paths = files.map((f: any) => f.name);
    await supabase.storage.from('receipts').remove(paths);
    console.log(`  ✓ ${paths.length} receipt file(s) removed`);
  } else {
    console.log('  ✓ No receipt files to remove');
  }

  // Clear table data via pg connection
  const pool = new Pool({
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 6543,
    database: 'postgres',
    user: `postgres.${projectRef}`,
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  console.log('✓ Connected to database.');

  await client.query('DELETE FROM daily_reports');
  console.log('  ✓ daily_reports cleared');

  await client.query('DELETE FROM daily_sales');
  console.log('  ✓ daily_sales cleared');

  await client.query('DELETE FROM expenses');
  console.log('  ✓ expenses cleared');

  await client.query('DELETE FROM inventory_items');
  console.log('  ✓ inventory_items cleared');

  client.release();
  await pool.end();

  console.log('\n✓ All system data reset. User accounts preserved.');
}

run().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
