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

  useEffect(() => {
    loadSettings().then(s => setSettings(s));
  }, []);

  const set = (field, value) => setSettings(s => ({ ...s, [field]: value }));

  // Прайс фасадов: при изменении закупки или наценки — авто-пересчёт цены для клиента
  const updateFasadPrice = (id, field, value) => {
    setSettings(s => ({
      ...s,
      прайсФасадов: s.прайсФасадов.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'закупка' || field === 'наценка') {
          const з = parseFloat(field === 'закупка' ? value : item.закупка) || 0;
          const н = parseFloat(field === 'наценка' ? value : item.наценка) || 0;
          updated.цена = з > 0 ? String(Math.round(з * (1 + н / 100))) : '';
        }
        return updated;
      }),
    }));
  };

  const addFasadRow = () => {
    setSettings(s => ({
      ...s,
      прайсФасадов: [...s.прайсФасадов, { id: Date.now(), материал: '', закупка: '', наценка: 30, цена: '' }],
    }));
  };

  const removeFasadRow = (id) => {
    setSettings(s => ({
      ...s,
      прайсФасадов: s.прайсФасадов.filter(item => item.id !== id),
    }));
  };

  // Столешницы
  const setСтолешницы = (field, value) => {
    setSettings(s => ({
      ...s,
      столешницы: { ...(s.столешницы || {}), [field]: value },
    }));
  };

  // Прайс фурнитуры
  const updateFurniturePrice = (id, value) => {
    setSettings(s => ({
      ...s,
      прайсФурнитуры: s.прайсФурнитуры.map(item =>
        item.id === id ? { ...item, цена: value } : item
      ),
    }));
  };

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
              <p className="text-white/40 text-xs mt-1">
                Цена для клиента — авто (закупка × наценка%) или введите вручную
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div className="hidden sm:flex gap-2 text-xs text-white/40 px-1">
                <div className="flex-1">Материал</div>
                <div className="w-28">Закупка / м²</div>
                <div className="w-24">Наценка</div>
                <div className="w-28">Клиенту / м²</div>
                <div className="w-8" />
              </div>

              {settings.прайсФасадов.map(item => {
                const з = parseFloat(item.закупка) || 0;
                const н = parseFloat(item.наценка) || 0;
                const авто = з > 0 ? String(Math.round(з * (1 + н / 100))) : '';
                return (
                  <div key={item.id} className="space-y-2 sm:space-y-0 sm:flex gap-2 items-center">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/40 mb-1 sm:hidden">Материал</div>
                      <input
                        type="text"
                        value={item.материал}
                        onChange={e => updateFasadPrice(item.id, 'материал', e.target.value)}
                        placeholder="Название материала"
                        className="w-full bg-white/5 border border-white/15 hover:border-white/30 focus:border-brand-blue
                          text-white placeholder-white/30 rounded-xl px-3 sm:px-4 py-3 text-sm outline-none transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-3 sm:contents gap-2">
                      <div className="sm:w-28 flex-shrink-0">
                        <div className="text-xs text-white/40 mb-1 sm:hidden">Закупка</div>
                        <NumInput
                          value={item.закупка}
                          onChange={v => updateFasadPrice(item.id, 'закупка', v)}
                          placeholder="0"
                          suffix="₽"
                        />
                      </div>
                      <div className="sm:w-24 flex-shrink-0">
                        <div className="text-xs text-white/40 mb-1 sm:hidden">Наценка</div>
                        <NumInput
                          value={item.наценка}
                          onChange={v => updateFasadPrice(item.id, 'наценка', v)}
                          placeholder="30"
                          suffix="%"
                        />
                      </div>
                      <div className="sm:w-28 flex-shrink-0">
                        <div className="text-xs text-white/40 mb-1 sm:hidden">Клиенту</div>
                        <NumInput
                          value={item.цена}
                          onChange={v => updateFasadPrice(item.id, 'цена', v)}
                          placeholder={авто || '0'}
                          suffix="₽"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeFasadRow(item.id)}
                      className="hidden sm:flex w-8 h-8 items-center justify-center text-white/30 hover:text-red-400 transition-colors text-xl flex-shrink-0"
                    >
                      ×
                    </button>
                    <button
                      onClick={() => removeFasadRow(item.id)}
                      className="sm:hidden text-xs text-white/30 hover:text-red-400 transition-colors"
                    >
                      × Удалить
                    </button>
                  </div>
                );
              })}

              <button
                onClick={addFasadRow}
                className="text-sm text-brand-blue hover:text-brand-blue/80 transition-colors flex items-center gap-1 mt-2"
              >
                + Добавить материал
              </button>
            </div>
          </div>

          {/* Столешницы */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">Столешницы</h2>
              <p className="text-white/40 text-xs mt-1">Только постформинг, ширина 600 мм. Листы: 3050 мм и 4200 мм.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Закупка листа 3050 мм">
                  <NumInput
                    value={settings.столешницы?.закупка3050 || ''}
                    onChange={v => setСтолешницы('закупка3050', v)}
                    placeholder="0"
                    suffix="₽"
                  />
                </Field>
                <Field label="Закупка листа 4200 мм">
                  <NumInput
                    value={settings.столешницы?.закупка4200 || ''}
                    onChange={v => setСтолешницы('закупка4200', v)}
                    placeholder="0"
                    suffix="₽"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Наценка (единая для обоих)">
                  <NumInput
                    value={settings.столешницы?.наценка ?? 30}
                    onChange={v => setСтолешницы('наценка', v)}
                    placeholder="30"
                    suffix="%"
                  />
                </Field>
                <Field label="Минимальный кусок">
                  <NumInput
                    value={settings.столешницы?.минКусок ?? 500}
                    onChange={v => setСтолешницы('минКусок', v)}
                    placeholder="500"
                    suffix="мм"
                  />
                </Field>
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3 text-xs text-white/40">
                Мин. кусок — некрасивый шов, плохо держится. Значение подобрано опытным путём, уточнить по статистике.
              </div>
            </div>
          </div>

          {/* Прайс фурнитуры */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">Прайс фурнитуры</h2>
              <p className="text-white/40 text-xs mt-1">Цена за единицу. Количество задаётся в каждом расчёте отдельно.</p>
            </div>
            <div className="p-6 space-y-2">
              <div className="flex gap-3 text-xs text-white/40 px-1 mb-1">
                <div className="flex-1">Позиция</div>
                <div className="w-12 text-center">Ед.</div>
                <div className="w-32">Цена / ед.</div>
              </div>
              {(settings.прайсФурнитуры || []).map(item => (
                <div key={item.id} className="flex gap-3 items-center">
                  <div className="flex-1 text-sm text-white/80">{item.название}</div>
                  <div className="w-12 text-xs text-white/40 text-center">{item.единица}</div>
                  <div className="w-32">
                    <NumInput
                      value={item.цена}
                      onChange={v => updateFurniturePrice(item.id, v)}
                      placeholder="0"
                      suffix="₽"
                    />
                  </div>
                </div>
              ))}
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
