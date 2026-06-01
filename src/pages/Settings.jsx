// Страница настроек: прайс на материалы, коэффициенты, значения по умолчанию
import { useState, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { loadSettings, saveSettings, defaultSettings } from '../utils/storage';

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm text-white/60 mb-1.5">
        {label}
        {hint && <span className="ml-1.5 text-white/30 text-xs">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, placeholder, suffix }) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '0'}
        min={0}
        className="w-full bg-white/5 border border-white/15 hover:border-white/30 focus:border-brand-blue
          text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none transition-colors
          [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({ ...defaultSettings });
  const [savedMsg, setSavedMsg] = useState('');

  // Загружаем настройки из Supabase при открытии страницы
  useEffect(() => {
    loadSettings().then(s => setSettings(s));
  }, []);

  const set = (field, value) => setSettings(s => ({ ...s, [field]: value }));

  // Обновить строку прайса фасадов
  const updateFasadPrice = (id, field, value) => {
    setSettings(s => ({
      ...s,
      прайсФасадов: s.прайсФасадов.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Добавить новый материал фасада
  const addFasadRow = () => {
    setSettings(s => ({
      ...s,
      прайсФасадов: [...s.прайсФасадов, { id: Date.now(), материал: '', цена: '' }],
    }));
  };

  // Удалить материал фасада
  const removeFasadRow = (id) => {
    setSettings(s => ({
      ...s,
      прайсФасадов: s.прайсФасадов.filter(item => item.id !== id),
    }));
  };

  // Сохранить настройки
  const handleSave = async () => {
    await saveSettings(settings);
    setSavedMsg('Настройки сохранены!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      <AppHeader />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl font-black text-white mb-2">Настройки</h1>
        <p className="text-white/50 text-sm mb-8">
          Заполните цены один раз — приложение будет подставлять их в каждый расчёт автоматически.
        </p>

        <div className="space-y-6">

          {/* Корпуса */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">Корпуса (ЛДСП)</h2>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Цена листа ЛДСП" hint="всё включено: лист + распил + кромка + присадка">
                <NumInput
                  value={settings.ценаЛиста}
                  onChange={v => set('ценаЛиста', v)}
                  placeholder="Например: 4500"
                  suffix="₽"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Коэф. нижней базы" hint="м/лист">
                  <NumInput
                    value={settings.коэфНиз}
                    onChange={v => set('коэфНиз', v)}
                    placeholder="1.8"
                    suffix="м/лист"
                  />
                </Field>
                <Field label="Коэф. верхней базы" hint="м/лист">
                  <NumInput
                    value={settings.коэфВерх}
                    onChange={v => set('коэфВерх', v)}
                    placeholder="3.0"
                    suffix="м/лист"
                  />
                </Field>
              </div>

              <div className="bg-white/5 rounded-xl px-4 py-3 text-xs text-white/40 space-y-1">
                <div>Формула: листы = пеналы + ⌈нижняя / коэф.нижней⌉ + ⌈верхняя / коэф.верхней⌉</div>
                <div>Значения подобраны опытным путём. Уточнить после накопления статистики.</div>
              </div>
            </div>
          </div>

          {/* Прайс фасадов */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">Прайс на фасады</h2>
              <p className="text-white/40 text-xs mt-1">Цены за 1 м² (без вычета техники — как говорит Антон)</p>
            </div>
            <div className="p-6 space-y-3">
              {/* Заголовки */}
              <div className="flex gap-3 text-xs text-white/40 px-1">
                <div className="flex-1">Материал</div>
                <div className="w-36">Цена за м²</div>
                <div className="w-8" />
              </div>

              {settings.прайсФасадов.map(item => (
                <div key={item.id} className="flex gap-2 sm:gap-3 items-center">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.материал}
                      onChange={e => updateFasadPrice(item.id, 'материал', e.target.value)}
                      placeholder="Название материала"
                      className="w-full bg-white/5 border border-white/15 hover:border-white/30 focus:border-brand-blue
                        text-white placeholder-white/30 rounded-xl px-3 sm:px-4 py-3 text-sm outline-none transition-colors"
                    />
                  </div>
                  <div className="w-28 sm:w-36 flex-shrink-0">
                    <NumInput
                      value={item.цена}
                      onChange={v => updateFasadPrice(item.id, 'цена', v)}
                      placeholder="0"
                      suffix="₽"
                    />
                  </div>
                  <button
                    onClick={() => removeFasadRow(item.id)}
                    className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-red-400 active:text-red-400 transition-colors text-xl flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                onClick={addFasadRow}
                className="text-sm text-brand-blue hover:text-brand-blue/80 transition-colors flex items-center gap-1 mt-2"
              >
                + Добавить материал
              </button>
            </div>
          </div>

          {/* Монтаж и доставка */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">Монтаж и доставка (по умолчанию)</h2>
              <p className="text-white/40 text-xs mt-1">Можно изменить для каждого расчёта отдельно</p>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Монтаж по умолчанию">
                <NumInput
                  value={settings.монтажПроцент}
                  onChange={v => set('монтажПроцент', v)}
                  placeholder="15"
                  suffix="%"
                />
              </Field>
              <Field label="Доставка по умолчанию">
                <NumInput
                  value={settings.доставка}
                  onChange={v => set('доставка', v)}
                  placeholder="6000"
                  suffix="₽"
                />
              </Field>
            </div>
          </div>

          {/* Кнопка сохранить */}
          <button
            onClick={handleSave}
            className="w-full py-4 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-2xl transition-colors text-sm"
          >
            {savedMsg || 'Сохранить настройки'}
          </button>

        </div>
      </div>
    </div>
  );
}
