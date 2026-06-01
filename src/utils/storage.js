// Настройки — хранятся локально на устройстве (localStorage)
// Расчёты — хранятся в Supabase (общие для всех устройств)
import { supabase } from './supabase';

export const defaultSettings = {
  ценаЛиста: 0,
  коэфНиз: 1.8,
  коэфВерх: 3.0,
  монтажПроцент: 15,
  доставка: 6000,
  прайсФасадов: [
    { id: 1, материал: 'ЛДСП', закупка: '', наценка: 30 },
    { id: 2, материал: 'МДФ плёнка', закупка: '', наценка: 30 },
    { id: 3, материал: 'МДФ эмаль', закупка: '', наценка: 30 },
    { id: 4, материал: 'Постформинг', закупка: '', наценка: 30 },
  ],
};

// ── Настройки (Supabase) ──────────────────────────────────────────────────────

// Загрузить настройки (общие для всех устройств)
export async function loadSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('data')
    .eq('id', 'default')
    .single();

  if (error || !data) return { ...defaultSettings };
  const saved = data.data;
  // Миграция: старое поле коэф → коэфНиз/коэфВерх
  if (saved.коэф !== undefined && saved.коэфНиз === undefined) {
    saved.коэфНиз = defaultSettings.коэфНиз;
    saved.коэфВерх = defaultSettings.коэфВерх;
    delete saved.коэф;
  }
  // Миграция: старое поле цена в прайсФасадов → закупка + наценка
  if (Array.isArray(saved.прайсФасадов)) {
    saved.прайсФасадов = saved.прайсФасадов.map(item => {
      if (item.цена !== undefined && item.закупка === undefined) {
        return { id: item.id, материал: item.материал, закупка: item.цена, наценка: 30 };
      }
      return item;
    });
  }
  return { ...defaultSettings, ...saved };
}

// Сохранить настройки
export async function saveSettings(settings) {
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 'default', data: settings }, { onConflict: 'id' });

  if (error) console.error('Supabase saveSettings:', error);
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
    console.error('Supabase loadCalculations:', error);
    return [];
  }
  return data.map(row => row.data);
}

// Загрузить один расчёт по id
export async function loadCalculationById(id) {
  const { data, error } = await supabase
    .from('calculations')
    .select('data')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data.data;
}

// Сохранить или обновить расчёт
export async function saveCalculation(calc) {
  const { error } = await supabase
    .from('calculations')
    .upsert({ id: calc.id, data: calc }, { onConflict: 'id' });

  if (error) console.error('Supabase saveCalculation:', error);
}

// Удалить расчёт
export async function deleteCalculation(id) {
  const { error } = await supabase
    .from('calculations')
    .delete()
    .eq('id', id);

  if (error) console.error('Supabase deleteCalculation:', error);
}

// ── Начальная форма расчёта ──────────────────────────────────────────────────

export function defaultForm(settings) {
  return {
    id: Date.now().toString(),
    клиент: '',
    объект: '',
    изображение: null,
    нижняя: '',
    верхняя: '',
    пеналы: '',
    фасады: [{ id: Date.now(), материал: '', площадь: '', цена: '' }],
    фрезеровкаВкл: false,
    фрезеровкаОбъём: '',
    фрезеровкаЦена: '',
    столешница: '',
    фурнитура: '',
    монтажПроцент: settings.монтажПроцент,
    доставка: settings.доставка,
    себестоимость: '',
    наценкаСкрытаяТип: 'none',
    наценкаСкрытая: '',
    наценкаВидимаяТип: 'none',
    наценкаВидимая: '',
    скидкаТип: 'none',
    скидка: '',
    createdAt: new Date().toISOString(),
  };
}
