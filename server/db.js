// Подключение к PostgreSQL (NetAngels пробрасывает реквизиты через env).
const { Pool } = require('pg');

// Используем отдельные поля (host/user/pass/db), а не URL —
// в пароле есть спецсимволы (!, +), которые ломают URL-парсер.
const pool = new Pool({
  host: process.env.DBHOST,
  database: process.env.DBNAME,
  user: process.env.DBUSER,
  password: process.env.DBPASS,
  port: process.env.DBPORT ? Number(process.env.DBPORT) : 5432,
  max: 8,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
