// Создаёт таблицы в базе: npm run db:init  (читает DATABASE_URL из .env или окружения)
import fs from 'node:fs';
import pg from 'pg';

if (!process.env.DATABASE_URL && fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL не задан'); process.exit(1); }

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
const { rows } = await client.query("select table_name from information_schema.tables where table_schema='public' order by 1");
console.log('Готово. Таблицы:', rows.map((r) => r.table_name).join(', '));
await client.end();
