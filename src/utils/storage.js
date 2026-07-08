// Настройки и расчёты хранятся в Supabase (общие для всех устройств)
import { supabase } from './supabase';

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

// ── Настройки (Supabase) ──────────────────────────────────────────────────────

// Загрузить настройки (общие для всех устройств)
export async function loadSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('data')
    .eq('id', 'default');

  // Ошибка сети/БД — НЕ маскируем под «настроек ещё нет».
  // Иначе форма настроек показала бы пустой прайс, а сохранение затёрло бы реальный.
  if (error) {
    console.error('Supabase loadSettings error:', error);
    throw new Error('Не удалось загрузить настройки: ' + (error.message || 'нет связи'));
  }
  // Настроек ещё нет в базе — это нормальный первый запуск, отдаём дефолты.
  if (!data || data.length === 0) return { ...defaultSettings };
  const saved = data[0].data;
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
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 'default', data: settings });

  if (error) {
    console.error('Supabase saveSettings:', error);
    throw new Error('Не удалось сохранить настройки: ' + (error.message || 'нет связи'));
  }
}

// ── Расчёты (Supabase) ───────────────────────────────────────────────────────

// Загрузить все расчёты (от новых к старым)
export async function loadCalculations() {
  const { data, error } = await supabase
    .from('calculations')
    .select('data, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Supabase loadCalculations error:', error);
    throw new Error('DB error: ' + error.message);
  }
  if (!data) return [];
  // Отбрасываем битые записи без data, чтобы одна такая не роняла всю историю
  return data.filter(row => row.data).map(row => row.data);
}

// Загрузить один расчёт по id.
// Ошибка сети/БД — throw (чтобы отличать от «расчёт не найден»).
// Расчёт отсутствует — возвращаем null.
export async function loadCalculationById(id) {
  const { data, error } = await supabase
    .from('calculations')
    .select('data')
    .eq('id', id);

  if (error) {
    console.error('Supabase loadCalculationById error:', error);
    throw new Error('Не удалось загрузить расчёт: ' + (error.message || 'нет связи'));
  }
  if (!data || data.length === 0) return null;
  // Берём первый элемент массива (proxy не поддерживает .single())
  return data[0].data;
}

// Сохранить или обновить расчёт
export async function saveCalculation(calc) {
  const { error } = await supabase
    .from('calculations')
    .upsert({ id: calc.id, data: calc });

  if (error) {
    console.error('Supabase saveCalculation:', error);
    throw new Error('Не удалось сохранить расчёт: ' + (error.message || 'нет связи'));
  }
}

// Удалить расчёт
export async function deleteCalculation(id) {
  const { error } = await supabase
    .from('calculations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase deleteCalculation:', error);
    throw new Error('Не удалось удалить расчёт: ' + (error.message || 'нет связи'));
  }
}

// ── Проекты (очередь на расчёт) ─────────────────────────────────────────────

export async function loadProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('data, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase loadProjects error:', error);
    throw new Error('DB error: ' + error.message);
  }
  if (!data) return [];
  return data.filter(row => row.data).map(row => row.data);
}

export async function saveProject(project) {
  const { error } = await supabase
    .from('projects')
    .upsert({ id: project.id, data: project });
  if (error) {
    console.error('Supabase saveProject:', error);
    throw new Error('Не удалось сохранить проект: ' + (error.message || 'нет связи'));
  }
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) {
    console.error('Supabase deleteProject:', error);
    throw new Error('Не удалось удалить проект: ' + (error.message || 'нет связи'));
  }
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
