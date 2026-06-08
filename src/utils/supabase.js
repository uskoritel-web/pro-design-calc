// Клиент Supabase — облачная база данных для общей истории расчётов
import { createClient } from '@supabase/supabase-js';

// Vercel Edge Proxy для обхода блокировки Supabase мобильными провайдерами
// Все запросы роутятся через /api/supabase (прозрачный proxy)
const USE_PROXY = true; // Переключатель для отката

// Custom fetch: прозрачно проксирует все запросы через Vercel
const customFetch = async (url, options = {}) => {
  if (!USE_PROXY) {
    // Fallback: прямой запрос (старое поведение)
    return fetch(url, options);
  }

  try {
    const urlObj = new URL(url);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Проверяем что это запрос к Supabase
    if (!url.startsWith(supabaseUrl)) {
      return fetch(url, options);
    }

    // Извлекаем path и query
    const path = urlObj.pathname;
    const search = urlObj.search;

    // Строим URL к нашему proxy
    const proxyUrl = `/api/supabase?path=${encodeURIComponent(path)}${search ? '&' + search.slice(1) : ''}`;

    console.log('[Supabase Proxy]', options.method || 'GET', path);

    // Проксируем запрос как есть
    const response = await fetch(proxyUrl, {
      method: options.method || 'GET',
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
      body: options.body,
    });

    return response;
  } catch (err) {
    console.error('[Supabase Proxy] Failed, falling back to direct:', err);
    // Fallback на прямой запрос
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
