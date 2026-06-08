// Клиент Supabase — облачная база данных для общей истории расчётов
import { createClient } from '@supabase/supabase-js';

// Vercel Edge Proxy для обхода блокировки Supabase мобильными провайдерами
// Все запросы идут через /api/supabase вместо прямого обращения к supabase.co
const USE_PROXY = true; // Переключатель для A/B тестирования или отката

// Custom fetch который роутит запросы через наш proxy
const customFetch = async (url, options = {}) => {
  if (!USE_PROXY) {
    // Fallback: прямой запрос (старое поведение)
    return fetch(url, options);
  }

  try {
    // Парсим URL чтобы понять что за запрос
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Игнорируем не-REST запросы (auth, storage и т.д.)
    if (!path.includes('/rest/v1/')) {
      return fetch(url, options);
    }

    // Извлекаем таблицу из пути: /rest/v1/calculations → calculations
    const tableName = path.split('/rest/v1/')[1]?.split('?')[0];
    if (!tableName) {
      return fetch(url, options);
    }

    // Определяем метод
    const method = options.method?.toLowerCase() || 'get';
    let proxyMethod = 'select';
    if (method === 'post') proxyMethod = 'insert';
    if (method === 'patch') proxyMethod = 'update';
    if (method === 'delete') proxyMethod = 'delete';

    // Формируем тело запроса к proxy
    const proxyBody = {
      table: tableName,
      method: proxyMethod,
      params: {},
    };

    // Парсим query параметры
    const queryParams = Object.fromEntries(urlObj.searchParams.entries());
    if (queryParams.select) proxyBody.params.select = queryParams.select;
    if (queryParams.order) proxyBody.params.order = queryParams.order;
    if (queryParams.limit) proxyBody.params.limit = queryParams.limit;

    // Парсим eq фильтры (id=eq.123 → {id: '123'})
    const eqFilters = {};
    for (const [key, val] of Object.entries(queryParams)) {
      if (val.startsWith('eq.')) {
        eqFilters[key] = val.replace('eq.', '');
      }
    }
    if (Object.keys(eqFilters).length > 0) {
      proxyBody.params.eq = eqFilters;
    }

    // Добавляем body для POST/PATCH
    if (options.body) {
      try {
        proxyBody.params.data = JSON.parse(options.body);
      } catch {
        proxyBody.params.data = options.body;
      }
    }

    // Добавляем onConflict для upsert
    if (urlObj.searchParams.has('on_conflict')) {
      proxyMethod = 'upsert';
      proxyBody.method = 'upsert';
      proxyBody.params.onConflict = urlObj.searchParams.get('on_conflict');
    }

    console.log('[Supabase Custom Fetch] Proxying:', proxyMethod, tableName);

    // Запрос к proxy
    const proxyResponse = await fetch('/api/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyBody),
    });

    const proxyData = await proxyResponse.json();

    if (proxyData.error) {
      console.error('[Supabase Proxy] Error:', proxyData.error);
      throw new Error(JSON.stringify(proxyData.error));
    }

    // Возвращаем Response-совместимый объект
    return {
      ok: proxyResponse.ok,
      status: proxyResponse.status,
      json: async () => proxyData.data,
      text: async () => JSON.stringify(proxyData.data),
    };
  } catch (err) {
    console.error('[Supabase Custom Fetch] Failed, falling back to direct:', err);
    // Fallback на прямой запрос если proxy сломался
    return fetch(url, options);
  }
};

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  {
    global: {
      fetch: customFetch,
    },
  }
);
