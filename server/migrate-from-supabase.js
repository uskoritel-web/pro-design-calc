// Разовая миграция данных Supabase → PostgreSQL.
// Данные забираются через Vercel-прокси (ключи не нужны).
// Запуск на сервере: node migrate-from-supabase.js
const { pool } = require('./db');

const SRC = process.env.MIGRATE_SOURCE || 'https://pro-design-calc.vercel.app/api/supabase';

async function fetchTable(table) {
  const url = `${SRC}?path=/rest/v1/${table}&select=*`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`fetch ${table}: HTTP ${r.status}`);
  const rows = await r.json();
  if (!Array.isArray(rows)) throw new Error(`fetch ${table}: не массив`);
  return rows;
}

async function migrateCalcOrProject(table) {
  const rows = await fetchTable(table);
  let ok = 0;
  for (const row of rows) {
    const id = row.id || (row.data && row.data.id);
    if (!id || !row.data) continue;
    const created = row.created_at || new Date().toISOString();
    await pool.query(
      `INSERT INTO ${table} (id, data, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [id, row.data, created]
    );
    ok++;
  }
  return { total: rows.length, ok };
}

async function migrateSettings() {
  const rows = await fetchTable('settings');
  let ok = 0;
  for (const row of rows) {
    const id = row.id || 'default';
    if (!row.data) continue;
    await pool.query(
      `INSERT INTO settings (id, data, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [id, row.data]
    );
    ok++;
  }
  return { total: rows.length, ok };
}

(async () => {
  try {
    console.log('Источник:', SRC);
    const c = await migrateCalcOrProject('calculations');
    console.log(`calculations: перенесено ${c.ok}/${c.total}`);
    const p = await migrateCalcOrProject('projects');
    console.log(`projects: перенесено ${p.ok}/${p.total}`);
    const s = await migrateSettings();
    console.log(`settings: перенесено ${s.ok}/${s.total}`);
    console.log('Готово.');
  } catch (e) {
    console.error('Ошибка миграции:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
