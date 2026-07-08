// Данные хранятся на своём сервере (NetAngels): Node API + PostgreSQL.
// Все запросы идут на относительный /api с куками сессии.

const API = '/api';

// Обёртка над fetch: куки сессии + различение 401 (нужен вход) от ошибок.
async function apiFetch(path, options = {}) {
  let resp;
  try {
    resp = await fetch(API + path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch (e) {
    throw new Error('Нет связи с сервером. Проверьте интернет.');
  }
  if (resp.status === 401) {
    // Сессия истекла/не выполнен вход — сообщаем приложению
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('pdc-unauthorized'));
    const err = new Error('Требуется вход');
    err.unauthorized = true;
    throw err;
  }
  return resp;
}

async function apiGet(path) {
  const r = await apiFetch(path);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Ошибка сервера (' + r.status + ')');
  return r.json();
}

async function apiSend(method, path, body) {
  const r = await apiFetch(path, { method, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (!r.ok) {
    let msg = 'Ошибка сервера (' + r.status + ')';
    try { const j = await r.json(); if (j && j.error) msg += ': ' + j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return r.json().catch(() => ({}));
}

// ── Аутентификация команды ────────────────────────────────────────────────
export async function checkAuth() {
  try {
    const r = await fetch(API + '/me', { credentials: 'same-origin' });
    if (!r.ok) return false;
    const j = await r.json();
    return !!j.authed;
  } catch {
    return false;
  }
}

export async function login(password) {
  const r = await fetch(API + '/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return r.ok;
}

export async function logout() {
  try { await fetch(API + '/logout', { method: 'POST', credentials: 'same-origin' }); } catch { /* ignore */ }
}

// Генерация неперебираемого уникального ID.
// crypto.randomUUID — в защищённом контексте (https / localhost в Capacitor);
// fallback на случай старых WebView.
export function genId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch { /* fallthrough */ }
  // Fallback: время + случайные символы (тоже не перебирается «в лоб»)
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

export const defaultSettings = {
  ценаЛиста: 0,
  коэфНиз: 1.8,
  коэфВерх: 3.0,
  монтажПроцент: 15,
  доставка: 6000,
  технолог: 0,
  прайсФасадов: [
    { id: 1, материал: 'ЛДСП',        закупка: '', наценка: 30, цена: '' },
    { id: 2, материал: 'МДФ плёнка',  закупка: '', наценка: 30, цена: '' },
    { id: 3, материал: 'МДФ эмаль',   закупка: '', наценка: 30, цена: '' },
    { id: 4, материал: 'Постформинг', закупка: '', наценка: 30, цена: '' },
    { id: 5, материал: 'Алюминиевая рамка со стеклом', закупка: '', наценка: 30, цена: '' },
    { id: 6, материал: 'Алюминиевая рамка с зеркалом', закупка: '', наценка: 30, цена: '' },
    { id: 7, материал: 'Алюминиевая рамка с рельефным стеклом', закупка: '', наценка: 30, цена: '' },
  ],
  столешницы: {
    закупка3050: '',
    закупка4200: '',
    наценка: 30,
    минКусок: 500,
    каменьБелый: '',       // Столешница камень белый (за лист/пог.м — уточнить)
    мойкаКамень: '',       // Мойка камень белый
    подклейкаМойки: '',    // Нижняя подклейка металлической мойки
    подклейка: '',         // Подклейка
  },
  прайсСтолешниц: [
    { id: 1, материал: 'Постформинг', закупка: '', наценка: 30, цена: '' },
    { id: 2, материал: 'Искусственный камень', закупка: '', наценка: 30, цена: '' },
    { id: 3, материал: 'HPL', закупка: '', наценка: 30, цена: '' },
    { id: 4, материал: 'Kerama Granit', закупка: '', наценка: 30, цена: '' },
    { id: 5, материал: 'Акрил', закупка: '', наценка: 30, цена: '' },
    { id: 6, материал: 'Кварцевый агломерат', закупка: '', наценка: 30, цена: '' },
    { id: 7, материал: 'Натуральный камень (гранит/мрамор)', закупка: '', наценка: 30, цена: '' },
    { id: 8, материал: 'Массив дерева', закупка: '', наценка: 30, цена: '' },
    { id: 9, материал: 'Нержавеющая сталь', закупка: '', наценка: 30, цена: '' },
  ],
  прайсФурнитуры: [
    { id: 'ящики',     название: 'Выдвижные ящики',      единица: 'шт.',    цена: '' },
    { id: 'петли',     название: 'Петли',                 единица: 'шт.',    цена: '' },
    { id: 'подсветка', название: 'Подсветка (LED)',       единица: 'шт.',    цена: '' },
    { id: 'лоток',     название: 'Лоток-органайзер',      единица: 'шт.',    цена: '' },
    { id: 'цоколь',    название: 'Цоколь',                единица: 'пог.м',  цена: '' },
    { id: 'сушка',     название: 'Сушка встроенная',      единица: 'шт.',    цена: '' },
    { id: 'мусорница', название: 'Мусорница встроенная',  единица: 'шт.',    цена: '' },
    { id: 'ручки',     название: 'Ручки',                 единица: 'шт.',    цена: '' },
    { id: 'полки',     название: 'Полки',                 единица: 'шт.',    цена: '' },
    { id: 'газлифты',  название: 'Газлифты',              единица: 'шт.',    цена: '' },
    { id: 'корзины',   название: 'Выкатные корзины',      единица: 'шт.',    цена: '' },
    { id: 'угол',      название: 'Угловая система',       единица: 'компл.', цена: '' },
    { id: 'типон',     название: 'Типон',                 единица: 'шт.',    цена: '' },
  ],
  брендыФурнитуры: [
    { id: 1, бренд: 'Boyard', стоимость: '' },
  ],
};

// ── Настройки ─────────────────────────────────────────────────────────────

// Загрузить настройки (общие для всех устройств).
// Ошибка сети → throw (не маскируем под «настроек нет», иначе пустой прайс
// мог бы затереть реальный). Нет данных на сервере → дефолты.
export async function loadSettings() {
  const saved = await apiGet('/settings'); // null если ещё не создано
  if (!saved) return { ...defaultSettings };
  // Миграция: старое поле коэф → коэфНиз/коэфВерх
  if (saved.коэф !== undefined && saved.коэфНиз === undefined) {
    saved.коэфНиз = defaultSettings.коэфНиз;
    saved.коэфВерх = defaultSettings.коэфВерх;
    delete saved.коэф;
  }
  // Миграция: старое поле цена в прайсФасадов → закупка + наценка + цена
  if (Array.isArray(saved.прайсФасадов)) {
    saved.прайсФасадов = saved.прайсФасадов.map(item => {
      if (item.закупка === undefined) {
        // Совсем старый формат — было только поле «цена» (уже с наценкой).
        // Сохраняем её как клиентскую цену, закупку оставляем пустой,
        // чтобы наценка не применилась поверх уже розничной цены.
        return { id: item.id, материал: item.материал, закупка: '', наценка: 30, цена: item.цена || '' };
      }
      // Новый формат без поля цена — вычислить
      if (item.цена === undefined) {
        const з = parseFloat(item.закупка) || 0;
        const н = parseFloat(item.наценка) || 0;
        return { ...item, цена: з > 0 ? String(Math.round(з * (1 + н / 100))) : '' };
      }
      return item;
    });
  }
  // Миграция: добавить отсутствующую фурнитуру
  if (!saved.прайсФурнитуры) {
    saved.прайсФурнитуры = defaultSettings.прайсФурнитуры;
  } else {
    // Добавить новые позиции если их нет
    const existingIds = saved.прайсФурнитуры.map(f => f.id);
    const missing = defaultSettings.прайсФурнитуры.filter(f => !existingIds.includes(f.id));
    if (missing.length > 0) {
      saved.прайсФурнитуры = [...saved.прайсФурнитуры, ...missing];
    }
  }

  // Миграция: добавить отсутствующие фасады
  if (!saved.прайсФасадов) {
    saved.прайсФасадов = defaultSettings.прайсФасадов;
  } else {
    const existingMaterials = saved.прайсФасадов.map(f => f.материал);
    const missing = defaultSettings.прайсФасадов.filter(f => !existingMaterials.includes(f.материал));
    if (missing.length > 0) {
      saved.прайсФасадов = [...saved.прайсФасадов, ...missing];
    }
  }

  // Миграция: добавить новые поля столешниц
  if (!saved.столешницы) {
    saved.столешницы = defaultSettings.столешницы;
  } else {
    // Добавить новые поля если их нет
    saved.столешницы = { ...defaultSettings.столешницы, ...saved.столешницы };
  }

  // Миграция: добавить прайс столешниц
  if (!saved.прайсСтолешниц) {
    saved.прайсСтолешниц = defaultSettings.прайсСтолешниц;
  } else {
    const existingMaterials = saved.прайсСтолешниц.map(f => f.материал);
    const missing = defaultSettings.прайсСтолешниц.filter(f => !existingMaterials.includes(f.материал));
    if (missing.length > 0) {
      saved.прайсСтолешниц = [...saved.прайсСтолешниц, ...missing];
    }
  }

  // Миграция: добавить бренды фурнитуры
  if (!saved.брендыФурнитуры) {
    saved.брендыФурнитуры = defaultSettings.брендыФурнитуры;
  }

  return { ...defaultSettings, ...saved };
}

// Сохранить настройки
export async function saveSettings(settings) {
  await apiSend('PUT', '/settings', settings);
}

// ── Расчёты ──────────────────────────────────────────────────────────────────

// Загрузить все расчёты (от новых к старым)
export async function loadCalculations() {
  const data = await apiGet('/calculations');
  return Array.isArray(data) ? data : [];
}

// Загрузить один расчёт по id (для внутренних страниц команды).
// Ошибка сети — throw; расчёт отсутствует — null.
export async function loadCalculationById(id) {
  return apiGet('/calculations/' + encodeURIComponent(id));
}

// Загрузить БЕЗОПАСНУЮ версию расчёта для публичной страницы клиента
// (без себестоимости, маржи, скрытой наценки).
export async function loadPublicCalculation(id) {
  return apiGet('/public/calc/' + encodeURIComponent(id));
}

// Сохранить или обновить расчёт
export async function saveCalculation(calc) {
  await apiSend('PUT', '/calculations/' + encodeURIComponent(calc.id), calc);
}

// Удалить расчёт
export async function deleteCalculation(id) {
  await apiSend('DELETE', '/calculations/' + encodeURIComponent(id));
}

// ── Проекты (очередь на расчёт) ─────────────────────────────────────────────

export async function loadProjects() {
  const data = await apiGet('/projects');
  return Array.isArray(data) ? data : [];
}

export async function saveProject(project) {
  await apiSend('PUT', '/projects/' + encodeURIComponent(project.id), project);
}

export async function deleteProject(id) {
  await apiSend('DELETE', '/projects/' + encodeURIComponent(id));
}

// Создать Telegram-тему под проект. Возвращает { threadId, topicUrl }.
export async function createProjectTopic(projectId) {
  return apiSend('POST', '/projects/' + encodeURIComponent(projectId) + '/topic');
}

// ── Начальная форма расчёта ──────────────────────────────────────────────────

export function defaultForm(settings) {
  return {
    id: genId(),
    клиент: '',
    объект: '',
    заголовокКП: '',
    изображение: null,
    нижняя: '',
    верхняя: '',
    пеналы: '',
    фасады: [{ id: genId(), материал: '', площадь: '', цена: '' }],
    фрезеровкаВкл: false,
    фрезеровкаОбъём: '',
    фрезеровкаЦена: '',
    столешницаРежим: 'manual',
    столешницаМатериал: '',
    столешница: '',
    столешницаПлощадь: '',
    столешницаДлина: '',
    каменьБелыйМетры: '',
    мойкаКамень: '',
    подклейкаМойки: '',
    подклейка: '',
    фурнитура: '',
    фурнитураБренд: '',
    фурнитураРежим: 'позиции', // 'позиции' — по деталям, 'бренд' — фикс. сумма бренда
    фурнитураПозиции: settings.прайсФурнитуры.map(f => ({
      id: f.id,
      количество: f.id === 'ящики' ? 3 : ''
    })),
    монтажПроцент: settings.монтажПроцент,
    доставка: settings.доставка,
    технолог: settings.технолог ?? 0,
    срокДоставкиДней: '',
    датаПроизводства: '',
    себестоимость: '',
    наценкаСкрытаяТип: 'none',
    наценкаСкрытая: '',
    наценкаВидимаяТип: 'none',
    наценкаВидимая: '',
    скидкаТип: 'none',
    скидка: '',
    projectId: null,
    срокДействия: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    трекингВкл: true,
    подтверждениеВкл: true,
    таймерВкл: true,
    опросВкл: true,
    createdAt: new Date().toISOString(),
  };
}
