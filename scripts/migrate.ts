/**
 * Database migration & verification script.
 * Run: npx tsx scripts/migrate.ts [verify|run|sql <query>]
 */
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const projectRef = 'cefhrfsfohopkaghdodo';
const dbPassword = 'Pathetic@pastaholic213213';
const region = 'ap-southeast-2';
const args = process.argv.slice(2);

async function run() {
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

  if (args[0] === 'verify') {
    const tables = ['inventory_items', 'expenses', 'daily_sales', 'daily_reports', 'user_settings'];
    for (const table of tables) {
      const { rows } = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
      console.log(`${rows[0].exists ? '✓' : '✗'} ${table}`);
    }
    const { rows: buckets } = await client.query(`SELECT EXISTS (SELECT FROM storage.buckets WHERE id = 'receipts')`);
    console.log(`${buckets[0].exists ? '✓' : '✗'} storage bucket: receipts`);
  } else if (args[0] === 'run') {
    const sql = readFileSync(join(__dirname, '..', 'supabase_migration.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully.');
  } else if (args[0] === 'sql') {
    const query = args.slice(1).join(' ');
    const { rows } = await client.query(query);
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log('Usage: npx tsx scripts/migrate.ts [verify|run|sql <query>]');
  }

  client.release();
  await pool.end();
}

run().catch(console.error);
