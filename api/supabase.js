// Vercel Serverless Function: Proxy для обхода блокировки Supabase мобильными провайдерами
//
// Проблема: Операторы РФ блокируют *.supabase.co
// Решение: Запросы идут через vercel.app/api/supabase → supabase.co (обход блокировки)
//
// Usage:
//   POST /api/supabase
//   Body: { table: 'calculations', method: 'select', params: {...} }

export default async function handler(req, res) {
  // CORS для фронтенда
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { table, method, params = {} } = req.body;

    if (!table || !method) {
      return res.status(400).json({ error: 'Missing table or method' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing env vars:', { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_KEY: !!SUPABASE_KEY });
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Строим URL запроса к Supabase REST API
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    let fetchOptions = {
      method: 'GET',
      headers,
    };

    // SELECT
    if (method === 'select') {
      const queryParams = new URLSearchParams();
      if (params.select) queryParams.append('select', params.select);
      if (params.order) queryParams.append('order', params.order);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.eq) {
        Object.entries(params.eq).forEach(([key, val]) => {
          queryParams.append(key, `eq.${val}`);
        });
      }
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
    }

    // INSERT / UPSERT
    else if (method === 'insert' || method === 'upsert') {
      fetchOptions.method = 'POST';
      fetchOptions.body = JSON.stringify(params.data);
      if (params.onConflict) {
        headers['Prefer'] = `resolution=merge-duplicates`;
        url += `?on_conflict=${params.onConflict}`;
      }
    }

    // UPDATE
    else if (method === 'update') {
      fetchOptions.method = 'PATCH';
      fetchOptions.body = JSON.stringify(params.data);
      if (params.eq) {
        const queryParams = new URLSearchParams();
        Object.entries(params.eq).forEach(([key, val]) => {
          queryParams.append(key, `eq.${val}`);
        });
        url += '?' + queryParams.toString();
      }
    }

    // DELETE
    else if (method === 'delete') {
      fetchOptions.method = 'DELETE';
      if (params.eq) {
        const queryParams = new URLSearchParams();
        Object.entries(params.eq).forEach(([key, val]) => {
          queryParams.append(key, `eq.${val}`);
        });
        url += '?' + queryParams.toString();
      }
    }

    else {
      return res.status(400).json({ error: `Unsupported method: ${method}` });
    }

    console.log('[Supabase Proxy]', method.toUpperCase(), table, url);

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('[Supabase Proxy] Error:', response.status, data);
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ data, error: null });
  } catch (err) {
    console.error('[Supabase Proxy] Exception:', err);
    return res.status(500).json({ error: err.message });
  }
}
