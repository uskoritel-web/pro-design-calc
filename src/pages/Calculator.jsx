// Главная страница — расчёт стоимости мебели
import { useState, useMemo, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { calcTotal, fmt } from '../utils/calculations';
import { loadSettings, saveSettings, defaultSettings, defaultForm, saveCalculation, loadCalculationById } from '../utils/storage';

// ─── Вспомогательные компоненты ─────────────────────────────────────────────

// Карточка-блок формы
function Card({ title, children, badge }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-white font-bold">{title}</h3>
        {badge && (
          <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-lg">{badge}</span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// Поле ввода
function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm text-white/60 mb-1.5">
        {label}
        {hint && <span className="ml-1 text-white/30 text-xs">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// Числовой инпут
function NumInput({ value, onChange, placeholder, suffix, min = 0 }) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '0'}
        min={min}
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

// Текстовый инпут
function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/15 hover:border-white/30 focus:border-brand-blue
        text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
    />
  );
}

// Строка в итоговой панели
function ResultRow({ label, value, accent, small, bold }) {
  return (
    <div className={`flex justify-between items-center ${small ? 'py-1' : 'py-2'}`}>
      <span className={`${small ? 'text-xs text-white/40' : 'text-sm text-white/70'}`}>{label}</span>
      <span className={`font-semibold tabular-nums ${
        bold ? 'text-lg text-white' :
        accent === 'blue' ? 'text-brand-blue' :
        accent === 'green' ? 'text-green-400' :
        accent === 'orange' ? 'text-brand-orange' :
        'text-white/90 text-sm'
      }`}>
        {value}
      </span>
    </div>
  );
}

// Строка выбора типа и суммы наценки/скидки
function AdjustRow({ тип, значение, onТип, onЗначение, accent }) {
  const activeClass = accent === 'orange'
    ? 'bg-brand-orange/30 text-white'
    : accent === 'green'
      ? 'bg-green-500/30 text-white'
      : 'bg-white/20 text-white';

  return (
    <div className="flex gap-3">
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
        {[['none', 'Нет'], ['percent', '%'], ['sum', '₽']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => onТип(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              тип === val ? activeClass : 'text-white/40 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {тип !== 'none' && (
        <div className="flex-1">
          <NumInput
            value={значение}
            onChange={onЗначение}
            placeholder="0"
            suffix={тип === 'percent' ? '%' : '₽'}
          />
        </div>
      )}
    </div>
  );
}

// ─── Основной компонент ──────────────────────────────────────────────────────

export default function Calculator() {
  const [settings, setSettings] = useState({ ...defaultSettings });

  // Загружаем настройки из Supabase при старте
  useEffect(() => {
    loadSettings().then(s => setSettings(s));
  }, []);

  const [form, setForm] = useState(() => defaultForm(settings));
  const [saved, setSaved] = useState(false);

  // Если в URL есть ?id=... — загружаем существующий расчёт из Supabase
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      loadCalculationById(id).then(existing => {
        if (existing) {
          // Сливаем с defaultForm чтобы добавить новые поля которых нет в старых расчётах
          setForm(f => ({ ...f, ...existing }));
        }
      });
    }
  }, []);

  // Обновить одно поле формы
  const set = (field, value) => {
    setSaved(false);
    setForm(f => ({ ...f, [field]: value }));
  };

  // Расчёт в реальном времени (пересчитывается при каждом изменении формы)
  const result = useMemo(() => calcTotal(form, settings), [form, settings]);

  // Обновить строку фасада
  const updateFasad = (id, field, value) => {
    setSaved(false);
    setForm(f => ({
      ...f,
      фасады: f.фасады.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Добавить строку фасада
  const addFasad = () => {
    setForm(f => ({
      ...f,
      фасады: [...f.фасады, { id: Date.now(), материал: '', площадь: '', цена: '' }],
    }));
  };

  // Удалить строку фасада
  const removeFasad = (id) => {
    setForm(f => ({
      ...f,
      фасады: f.фасады.filter(item => item.id !== id),
    }));
  };

  // При выборе материала подставляем цену для клиента из прайса (закупка + наценка)
  const onMaterialSelect = (id, материал) => {
    const priceItem = settings.прайсФасадов.find(p => p.материал === материал);
    let цена = item => item.цена;
    if (priceItem) {
      const закупка = parseFloat(priceItem.закупка) || 0;
      const наценка = parseFloat(priceItem.наценка) || 0;
      // Новый формат: закупка + наценка%; старый формат: прямая цена
      const computed = priceItem.закупка !== undefined
        ? (закупка > 0 ? Math.round(закупка * (1 + наценка / 100)) : '')
        : (priceItem.цена || '');
      цена = () => computed;
    }
    setForm(f => ({
      ...f,
      фасады: f.фасады.map(item =>
        item.id === id
          ? { ...item, материал, цена: цена(item) }
          : item
      ),
    }));
  };

  // Загрузить фото объекта
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Читаем как base64 и сохраняем в форму
    const reader = new FileReader();
    reader.onload = (ev) => set('изображение', ev.target.result);
    reader.readAsDataURL(file);
  };

  // Сохранить расчёт
  const handleSave = async () => {
    await saveCalculation({ ...form, result });
    setSaved(true);
  };

  // Сохранить и перейти к КП
  const handleGenerateKP = async () => {
    const calcToSave = { ...form, result };
    await saveCalculation(calcToSave);
    window.location.href = `/kp?id=${form.id}`;
  };

  const hasSheetPrice = settings.ценаЛиста > 0;

  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      <AppHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* Предупреждение если не заполнены настройки */}
        {!hasSheetPrice && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 text-xl">⚠</span>
              <span className="text-yellow-200/90 text-sm">
                Не заполнена цена листа ЛДСП — корпуса считаются в 0 ₽.
              </span>
            </div>
            <a href="/settings" className="text-yellow-400 text-sm font-semibold hover:underline whitespace-nowrap ml-4">
              Открыть настройки →
            </a>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* ── Форма (левая колонка) ── */}
          <div className="flex-1 min-w-0 space-y-4 sm:space-y-5 w-full">

            {/* Блок: Клиент */}
            <Card title="Новый расчёт">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <Field label="Клиент" hint="(необязательно)">
                  <TextInput value={form.клиент} onChange={v => set('клиент', v)} placeholder="Иванов И.И." />
                </Field>
                <Field label="Объект" hint="(необязательно)">
                  <TextInput value={form.объект} onChange={v => set('объект', v)} placeholder="Кухня, ул. Ленина 5" />
                </Field>
              </div>

              {/* Загрузка фото объекта */}
              <Field label="Фото объекта" hint="появится в КП (необязательно)">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className={`flex-1 border-2 border-dashed rounded-xl px-4 py-3 text-sm transition-colors ${
                    form.изображение
                      ? 'border-brand-blue/50 bg-brand-blue/5 text-brand-blue'
                      : 'border-white/15 text-white/40 group-hover:border-white/30 group-hover:text-white/60'
                  }`}>
                    {form.изображение ? '✓ Фото загружено — нажмите чтобы заменить' : '+ Загрузить фото объекта'}
                  </div>
                  {form.изображение && (
                    <img src={form.изображение} alt="" className="w-16 h-12 object-cover rounded-lg border border-white/20" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {form.изображение && (
                  <button
                    onClick={() => set('изображение', null)}
                    className="mt-2 text-xs text-white/30 hover:text-red-400 transition-colors"
                  >
                    × Удалить фото
                  </button>
                )}
              </Field>
            </Card>

            {/* Блок: Корпуса */}
            <Card title="Корпуса (ЛДСП)" badge={result.листы > 0 ? `${result.листы} листов` : undefined}>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
                <Field label="Нижняя база" hint="м">
                  <NumInput value={form.нижняя} onChange={v => set('нижняя', v)} placeholder="3.1" suffix="м" />
                </Field>
                <Field label="Верхняя база" hint="м">
                  <NumInput value={form.верхняя} onChange={v => set('верхняя', v)} placeholder="2.7" suffix="м" />
                </Field>
                <Field label="Пеналы" hint="шт">
                  <NumInput value={form.пеналы} onChange={v => set('пеналы', v)} placeholder="0" suffix="шт" />
                </Field>
              </div>

              {result.листы > 0 && (
                <div className="mt-4 bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-white/60">
                    {form.пеналы || 0} пен. + ⌈{form.нижняя || 0}/{settings.коэфНиз}⌉ + ⌈{form.верхняя || 0}/{settings.коэфВерх}⌉
                  </span>
                  <span className="text-white font-bold">{result.листы} листов</span>
                </div>
              )}
            </Card>

            {/* Блок: Фасады */}
            <Card title="Фасады">
              <div className="space-y-3">
                {form.фасады.map((item, idx) => (
                  <div key={item.id}>
                    {/* Десктоп: горизонтальная строка */}
                    <div className="hidden sm:flex gap-3 items-start">
                      <div className="flex-1">
                        {idx === 0 && <div className="text-xs text-white/40 mb-1.5">Материал</div>}
                        <select
                          value={item.материал}
                          onChange={e => onMaterialSelect(item.id, e.target.value)}
                          className="w-full bg-white/5 border border-white/15 hover:border-white/30 focus:border-brand-blue
                            text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                        >
                          <option value="" className="bg-[#1A1A2E]">— выберите —</option>
                          {settings.прайсФасадов.map(p => (
                            <option key={p.id} value={p.материал} className="bg-[#1A1A2E]">{p.материал}</option>
                          ))}
                          <option value="__custom__" className="bg-[#1A1A2E]">Другой...</option>
                        </select>
                      </div>
                      <div className="w-28">
                        {idx === 0 && <div className="text-xs text-white/40 mb-1.5">Площадь</div>}
                        <NumInput value={item.площадь} onChange={v => updateFasad(item.id, 'площадь', v)} placeholder="0" suffix="м²" />
                      </div>
                      <div className="w-36">
                        {idx === 0 && <div className="text-xs text-white/40 mb-1.5">Цена / м²</div>}
                        <NumInput value={item.цена} onChange={v => updateFasad(item.id, 'цена', v)} placeholder="0" suffix="₽" />
                      </div>
                      <div className="w-28">
                        {idx === 0 && <div className="text-xs text-white/40 mb-1.5">Итого</div>}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 text-right">
                          {fmt((parseFloat(item.площадь) || 0) * (parseFloat(item.цена) || 0))}
                        </div>
                      </div>
                      {form.фасады.length > 1 && (
                        <button onClick={() => removeFasad(item.id)}
                          className={`text-white/30 hover:text-red-400 transition-colors text-lg flex-shrink-0 ${idx === 0 ? 'mt-7' : ''}`}>
                          ×
                        </button>
                      )}
                    </div>

                    {/* Мобильный: карточка */}
                    <div className="sm:hidden bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.материал}
                          onChange={e => onMaterialSelect(item.id, e.target.value)}
                          className="flex-1 bg-white/5 border border-white/15 text-white rounded-xl px-3 py-2.5 text-sm outline-none"
                        >
                          <option value="" className="bg-[#1A1A2E]">— материал —</option>
                          {settings.прайсФасадов.map(p => (
                            <option key={p.id} value={p.материал} className="bg-[#1A1A2E]">{p.материал}</option>
                          ))}
                          <option value="__custom__" className="bg-[#1A1A2E]">Другой...</option>
                        </select>
                        {form.фасады.length > 1 && (
                          <button onClick={() => removeFasad(item.id)} className="text-white/30 hover:text-red-400 text-xl px-1">×</button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-xs text-white/40 mb-1">Площадь</div>
                          <NumInput value={item.площадь} onChange={v => updateFasad(item.id, 'площадь', v)} placeholder="0" suffix="м²" />
                        </div>
                        <div>
                          <div className="text-xs text-white/40 mb-1">Цена/м²</div>
                          <NumInput value={item.цена} onChange={v => updateFasad(item.id, 'цена', v)} placeholder="0" suffix="₽" />
                        </div>
                        <div>
                          <div className="text-xs text-white/40 mb-1">Итого</div>
                          <div className="bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-xs text-white/70 text-right">
                            {fmt((parseFloat(item.площадь) || 0) * (parseFloat(item.цена) || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addFasad}
                className="mt-4 text-sm text-brand-blue hover:text-brand-blue/80 transition-colors flex items-center gap-1"
              >
                + Добавить строку фасадов
              </button>
            </Card>

            {/* Блок: Фрезеровка */}
            <Card title="Фрезеровка">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => set('фрезеровкаВкл', !form.фрезеровкаВкл)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.фрезеровкаВкл ? 'bg-brand-blue' : 'bg-white/20'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${form.фрезеровкаВкл ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="text-sm text-white/70">Есть фрезеровка</span>
              </div>

              {form.фрезеровкаВкл && (
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Field label="Объём" hint="м²">
                    <NumInput value={form.фрезеровкаОбъём} onChange={v => set('фрезеровкаОбъём', v)} placeholder="0" suffix="м²" />
                  </Field>
                  <Field label="Цена за м²">
                    <NumInput value={form.фрезеровкаЦена} onChange={v => set('фрезеровкаЦена', v)} placeholder="0" suffix="₽" />
                  </Field>
                </div>
              )}
            </Card>

            {/* Блок: Остальные позиции */}
            <Card title="Прочие позиции">
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Столешница" hint="сумма вручную">
                  <NumInput value={form.столешница} onChange={v => set('столешница', v)} placeholder="0" suffix="₽" />
                </Field>
                <Field label="Фурнитура" hint="сумма вручную">
                  <NumInput value={form.фурнитура} onChange={v => set('фурнитура', v)} placeholder="0" suffix="₽" />
                </Field>
              </div>
            </Card>

            {/* Блок: Монтаж и доставка */}
            <Card title="Монтаж и доставка">
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Монтаж">
                  <NumInput value={form.монтажПроцент} onChange={v => set('монтажПроцент', v)} placeholder="15" suffix="%" />
                </Field>
                <Field label="Доставка">
                  <NumInput value={form.доставка} onChange={v => set('доставка', v)} placeholder="6000" suffix="₽" />
                </Field>
              </div>
            </Card>

            {/* Блок: Финансы (только в точном режиме или если нужно) */}
            <Card title="Финансы и маржа">
              <div className="space-y-4">
                <Field label="Себестоимость" hint="необязательно — только для контроля маржи">
                  <NumInput value={form.себестоимость} onChange={v => set('себестоимость', v)} placeholder="0" suffix="₽" />
                </Field>

                {/* Скрытая наценка */}
                <Field
                  label="Скрытая наценка"
                  hint="клиент не видит — распределяется по всем статьям"
                >
                  <AdjustRow
                    тип={form.наценкаСкрытаяТип}
                    значение={form.наценкаСкрытая}
                    onТип={v => set('наценкаСкрытаяТип', v)}
                    onЗначение={v => set('наценкаСкрытая', v)}
                  />
                </Field>

                {/* Видимая наценка */}
                <Field
                  label="Видимая наценка"
                  hint="показывается в КП как отдельная строка"
                >
                  <AdjustRow
                    тип={form.наценкаВидимаяТип}
                    значение={form.наценкаВидимая}
                    onТип={v => set('наценкаВидимаяТип', v)}
                    onЗначение={v => set('наценкаВидимая', v)}
                    accent="orange"
                  />
                </Field>

                {/* Скидка */}
                <Field
                  label="Скидка"
                  hint="показывается в КП со знаком минус"
                >
                  <AdjustRow
                    тип={form.скидкаТип}
                    значение={form.скидка}
                    onТип={v => set('скидкаТип', v)}
                    onЗначение={v => set('скидка', v)}
                    accent="green"
                  />
                </Field>
              </div>
            </Card>

          </div>

          {/* ── Панель результатов (на мобиле внизу, на десктопе справа) ── */}
          <div className="w-full lg:w-80 lg:flex-shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">

              {/* Итоговая карточка */}
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-white font-bold">Итог расчёта</h3>
                </div>

                <div className="px-5 py-4 space-y-1">
                  {/* Разбивка по блокам — внутренние суммы (себестоимость менеджера) */}
                  {result.листы > 0 && (
                    <ResultRow label={`Корпуса (${result.листы} л.)`} value={fmt(result.корпуса)} small />
                  )}
                  {result.фасады > 0 && (
                    <ResultRow label="Фасады" value={fmt(result.фасады)} small />
                  )}
                  {result.фрезеровка > 0 && (
                    <ResultRow label="Фрезеровка" value={fmt(result.фрезеровка)} small />
                  )}
                  {result.столешница > 0 && (
                    <ResultRow label="Столешница" value={fmt(result.столешница)} small />
                  )}
                  {result.фурнитура > 0 && (
                    <ResultRow label="Фурнитура" value={fmt(result.фурнитура)} small />
                  )}

                  <div className="border-t border-white/10 my-2" />
                  <ResultRow label="Мебель итого" value={fmt(result.итогоМебель)} />
                  <ResultRow label={`Монтаж (${result.монтажПроцент}%)`} value={fmt(result.монтаж)} small />
                  <ResultRow label="Доставка" value={fmt(result.доставка)} small />

                  <div className="border-t border-white/10 my-2" />
                  <ResultRow label="База" value={fmt(result.baseTotal)} accent="blue" />

                  {/* Скрытая наценка — только для менеджера */}
                  {result.скрытаяСумма > 0 && (
                    <div className="flex justify-between items-center py-1 px-2 bg-white/5 rounded-lg">
                      <span className="text-xs text-white/40">🔒 Скрытая наценка</span>
                      <span className="text-xs text-white/60 font-semibold">+{fmt(result.скрытаяСумма)}</span>
                    </div>
                  )}

                  {/* Видимая наценка */}
                  {result.видимаяСумма > 0 && (
                    <ResultRow label="Доп. услуги (видима)" value={`+${fmt(result.видимаяСумма)}`} accent="orange" small />
                  )}

                  {/* Скидка */}
                  {result.скидкаСумма > 0 && (
                    <ResultRow label="Скидка" value={`−${fmt(result.скидкаСумма)}`} accent="green" small />
                  )}

                  {/* Итоговая сумма для клиента */}
                  <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-4 mt-3 text-center">
                    <div className="text-white/60 text-xs mb-1">Цена для клиента</div>
                    <div className="text-white font-black text-2xl">
                      {fmt(result.итогоКлиент)}
                    </div>
                  </div>

                  {/* Маржа (только если заполнена себестоимость) */}
                  {result.маржа !== null && (
                    <div className={`rounded-xl p-3 mt-2 ${result.маржа >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/50">Себестоимость</span>
                        <span className="text-sm text-white/70">{fmt(result.себестоимость)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-white/50">Маржа</span>
                        <span className={`text-sm font-bold ${result.маржа >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmt(result.маржа)} ({result.маржаПроцент}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    saved
                      ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                      : 'bg-white/10 hover:bg-white/15 border border-white/20 text-white'
                  }`}
                >
                  {saved ? '✓ Расчёт сохранён' : 'Сохранить расчёт'}
                </button>

                <button
                  onClick={handleGenerateKP}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-brand-blue hover:bg-brand-blue/90 text-white transition-colors"
                >
                  Сформировать КП →
                </button>
              </div>

              {/* Подсказка */}
              <p className="text-white/25 text-xs text-center">
                Расчёты сохраняются в облаке.
                <br />Посмотреть все — в разделе «История».
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
