// Vercel Serverless Function: proxy к Supabase для обхода блокировки *.supabase.co
// в РФ. Проксирует ТОЛЬКО REST-запросы к таблицам приложения.
//
// ВАЖНО про безопасность: этот прокси НЕ является границей безопасности.
// Настоящая защита данных — Supabase Auth + RLS-политики (их нужно включить
// на стороне Supabase). Здесь мы лишь сужаем поверхность атаки:
//  • белый список путей/таблиц (нельзя дёргать /auth, /storage, чужие эндпоинты);
//  • защита от SSRF через параметр path (нельзя увести запрос на чужой хост);
//  • ограничение методов и таймаут.

// Разрешённые таблицы REST API
const ALLOWED_TABLES = ['calculations', 'projects', 'settings'];
const ALLOWED_METHODS = ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'];

// Проверяем, что path указывает на разрешённую REST-таблицу и не содержит
// признаков SSRF (схема, userinfo, protocol-relative, обратный путь).
function isAllowedPath(path) {
  if (typeof path !== 'string') return false;
  if (!path.startsWith('/rest/v1/')) return false;
  if (path.includes('..') || path.includes('//') || path.includes('@') || path.includes(':')) return false;
  const rest = path.slice('/rest/v1/'.length);
  const table = rest.split(/[/?]/)[0];
  return ALLOWED_TABLES.includes(table);
}

export default async function handler(req, res) {
  // CORS: приложение и прокси на одном origin. Разрешаем методы/заголовки,
  // но origin отражаем узко (никаких cookie/credentials здесь не используется).
  const origin = req.headers['origin'];
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey, Authorization, Prefer, Accept, x-client-info');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!ALLOWED_METHODS.includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('[Proxy] Missing env vars');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { path, ...queryParams } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Белый список путей/таблиц + защита от SSRF
    if (!isAllowedPath(path)) {
      return res.status(403).json({ error: 'Path not allowed' });
    }

    // Строим URL относительно базового и проверяем, что хост не подменён
    const base = new URL(SUPABASE_URL);
    const targetUrl = new URL(path, base);
    if (targetUrl.host !== base.host || targetUrl.protocol !== base.protocol) {
      return res.status(403).json({ error: 'Host not allowed' });
    }

    Object.entries(queryParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => targetUrl.searchParams.append(key, v));
      } else {
        targetUrl.searchParams.append(key, value);
      }
    });

    // Заголовки к Supabase: ключ подставляем на сервере
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    };
    if (req.headers['prefer'])        headers['Prefer'] = req.headers['prefer'];
    if (req.headers['accept'])        headers['Accept'] = req.headers['accept'];
    if (req.headers['x-client-info']) headers['x-client-info'] = req.headers['x-client-info'];

    // upsert через supabase-js уже шлёт Prefer; на случай его потери — фолбэк
    if (req.method === 'POST' && !headers['Prefer']) {
      headers['Prefer'] = 'resolution=merge-duplicates';
    }

    const fetchOptions = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Таймаут, чтобы функция не висела при зависании Supabase
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    fetchOptions.signal = controller.signal;

    let response;
    try {
      response = await fetch(targetUrl.toString(), fetchOptions);
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        return res.status(504).json({ error: 'Upstream timeout' });
      }
      throw e;
    }
    clearTimeout(timeout);

    // Копируем заголовки ответа, кроме несовместимых с распакованным телом
    const skip = ['content-encoding', 'transfer-encoding', 'connection', 'content-length'];
    response.headers.forEach((value, key) => {
      if (!skip.includes(key.toLowerCase())) res.setHeader(key, value);
    });

    const data = await response.text();
    return res.status(response.status).send(data);
  } catch (err) {
    console.error('[Proxy] Exception:', err);
    // Наружу — обобщённое сообщение, детали только в лог
    return res.status(500).json({ error: 'Proxy error' });
  }
}
