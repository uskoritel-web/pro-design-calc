// Node API + отдача фронтенда для калькулятора мебели (NetAngels).
// Заменяет Supabase: данные в PostgreSQL, картинки на диске, логин команды.
const fs = require('fs');
const path = require('path');
const express = require('express');
const { pool } = require('./db');
const auth = require('./auth');
const { toPublic } = require('./publicCalc');
const { sendNotify, createProjectTopic } = require('./telegram');

// ── Загрузка секретов из app/.env (не в git; NetAngels-env уже в process.env) ──
(function loadDotenv() {
  try {
    const p = path.join(__dirname, '.env');
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const i = s.indexOf('=');
      if (i < 0) continue;
      const k = s.slice(0, i).trim();
      let v = s.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch (e) {
    console.error('[env] load error:', e.message);
  }
})();

const PORT = process.env.APP_PORT || 3000;
const IP = process.env.APP_IP || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');            // собранный фронтенд (dist)
const UPLOAD_DIR = path.join(__dirname, '..', 'storage', 'uploads'); // картинки — вне app/, переживают редеплой

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // за nginx NetAngels
app.use(express.json({ limit: '20mb' }));

// ── Картинки: base64 из формы → файл на диске, в данных остаётся URL ──
function persistImage(calcId, data) {
  try {
    const img = data && data.изображение;
    if (typeof img === 'string' && img.startsWith('data:image')) {
      const m = img.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/s);
      if (m) {
        const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase().replace(/[^a-z0-9]/g, '');
        const buf = Buffer.from(m[2], 'base64');
        const name = `${calcId}-${Date.now()}.${ext || 'jpg'}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
        data.изображение = `/uploads/${name}`;
      }
    }
  } catch (e) {
    console.error('[img] persist error:', e.message);
  }
  return data;
}

// Собираем объект расчёта для фронтенда: data + статусные колонки
function mergeCalc(row) {
  return {
    ...row.data,
    confirmed_at: row.confirmed_at || undefined,
    last_notified_at: row.last_notified_at || undefined,
    feedback: row.feedback || undefined,
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────
app.get('/api/me', (req, res) => res.json({ authed: auth.isAuthed(req) }));

app.post('/api/login', (req, res) => {
  if (auth.checkPassword(req.body && req.body.password)) {
    auth.setAuthCookie(res);
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'wrong-password' });
});

app.post('/api/logout', (req, res) => {
  auth.clearAuthCookie(res);
  res.json({ ok: true });
});

// ── Настройки (защищено) ──────────────────────────────────────────────────
app.get('/api/settings', auth.requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT data FROM settings WHERE id = 'default'");
    res.json(rows.length ? rows[0].data : null);
  } catch (e) { next(e); }
});

app.put('/api/settings', auth.requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO settings (id, data, updated_at) VALUES ('default', $1, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [req.body]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── Расчёты (защищено) ────────────────────────────────────────────────────
app.get('/api/calculations', auth.requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT data, confirmed_at, last_notified_at, feedback
       FROM calculations ORDER BY created_at DESC LIMIT 500`
    );
    res.json(rows.map(mergeCalc));
  } catch (e) { next(e); }
});

app.get('/api/calculations/:id', auth.requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT data, confirmed_at, last_notified_at, feedback FROM calculations WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not-found' });
    res.json(mergeCalc(rows[0]));
  } catch (e) { next(e); }
});

app.put('/api/calculations/:id', auth.requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = persistImage(id, req.body || {});
    data.id = id;
    await pool.query(
      `INSERT INTO calculations (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [id, data]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.delete('/api/calculations/:id', auth.requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM calculations WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── Проекты (защищено) ────────────────────────────────────────────────────
app.get('/api/projects', auth.requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT data FROM projects ORDER BY created_at DESC');
    res.json(rows.map((r) => r.data));
  } catch (e) { next(e); }
});

app.put('/api/projects/:id', auth.requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body || {};
    data.id = id;
    await pool.query(
      `INSERT INTO projects (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [id, data]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.delete('/api/projects/:id', auth.requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Создать Telegram-тему под проект (командное действие)
app.post('/api/projects/:id/topic', auth.requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const { rows } = await pool.query('SELECT data FROM projects WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not-found' });
    const projectData = rows[0].data;
    const result = await createProjectTopic(projectData);
    if (!result.ok) return res.status(502).json({ error: result.error });
    const updated = { ...projectData, threadId: result.threadId, topicUrl: result.topicUrl };
    await pool.query('UPDATE projects SET data = $2, updated_at = now() WHERE id = $1', [id, updated]);
    res.json({ ok: true, threadId: result.threadId, topicUrl: result.topicUrl });
  } catch (e) { next(e); }
});

// ── Публичная выдача КП (БЕЗ авторизации, только безопасные поля) ──────────
app.get('/api/public/calc/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT data, confirmed_at, feedback FROM calculations WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not-found' });
    res.json(toPublic(rows[0]));
  } catch (e) { next(e); }
});

// ── Трекинг/подтверждение/отзыв от клиента (БЕЗ авторизации) ──────────────
app.post('/api/notify', async (req, res, next) => {
  try {
    const { type, calcId, feedback } = req.body || {};
    if (!calcId || !type) return res.status(400).json({ error: 'bad-request' });

    const { rows } = await pool.query('SELECT data FROM calculations WHERE id = $1', [calcId]);
    if (!rows.length) return res.status(404).json({ error: 'not-found' });
    const calc = rows[0].data || {};

    if (type === 'open') {
      await pool.query(
        `UPDATE calculations SET last_notified_at = now(), open_count = open_count + 1 WHERE id = $1`,
        [calcId]
      );
    } else if (type === 'confirm') {
      await pool.query('UPDATE calculations SET confirmed_at = now() WHERE id = $1', [calcId]);
    } else if (type === 'feedback') {
      await pool.query('UPDATE calculations SET feedback = $2 WHERE id = $1', [calcId, feedback || {}]);
    } else {
      return res.status(400).json({ error: 'unknown-type' });
    }

    // Уведомление в Telegram — необязательно (если настроено)
    sendNotify(type, calc, feedback).catch((e) => console.error('[notify] tg:', e.message));

    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── Статика: картинки ──────────────────────────────────────────────────────
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '7d',
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=604800'),
}));

// ── Статика: собранный фронтенд ────────────────────────────────────────────
app.use(express.static(PUBLIC_DIR, {
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      // index.html всегда свежий, чтобы обновления доходили сразу
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/[.-][0-9a-zA-Z_]{8,}\.(js|css|woff2?|png|jpe?g|svg|webp)$/.test(filePath)) {
      // файлы с хешем в имени — кэшируем надолго
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// ── SPA-фолбэк ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ error: 'not-found' });
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ── Обработка ошибок ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[api] error:', err.message);
  res.status(500).json({ error: 'server-error' });
});

app.listen(PORT, IP, () => {
  console.log(`[server] listening on http://${IP}:${PORT} (NODE ${process.version})`);
});
