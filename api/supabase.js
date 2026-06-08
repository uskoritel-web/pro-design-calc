// Vercel Serverless Function: Прозрачный proxy для обхода блокировки Supabase
//
// Проблема: Операторы РФ блокируют *.supabase.co
// Решение: Все запросы проксируются через vercel.app без изменений
//
// Usage: GET/POST /api/supabase?path=/rest/v1/calculations&...

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey, Authorization, Prefer, Accept, x-client-info');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('[Proxy] Missing env vars');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Получаем путь из query параметра
    const { path, ...queryParams } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Строим полный URL к Supabase
    const targetUrl = new URL(SUPABASE_URL + path);

    // Добавляем query параметры
    Object.entries(queryParams).forEach(([key, value]) => {
      targetUrl.searchParams.append(key, value);
    });

    // Копируем headers от клиента + добавляем apikey
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    };

    // Копируем важные headers от клиента
    if (req.headers['prefer']) {
      headers['Prefer'] = req.headers['prefer'];
    }
    if (req.headers['accept']) {
      headers['Accept'] = req.headers['accept'];
    }

    // Формируем запрос к Supabase
    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Добавляем body для POST/PATCH
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    console.log('[Proxy]', req.method, path, targetUrl.search);

    // Проксируем запрос
    const response = await fetch(targetUrl.toString(), fetchOptions);

    // Копируем headers ответа
    response.headers.forEach((value, key) => {
      // Пропускаем некоторые headers которые конфликтуют
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Возвращаем body как есть
    const data = await response.text();

    return res.status(response.status).send(data);
  } catch (err) {
    console.error('[Proxy] Exception:', err);
    return res.status(500).json({ error: err.message });
  }
}
