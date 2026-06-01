// Логика расчёта стоимости мебели

// Форматирование суммы в рубли
export const fmt = (n) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(n || 0)) + ' ₽';

// Расчёт количества листов ЛДСП
export function calcSheets(нижняя, верхняя, пеналы, коэфНиз = 1.8, коэфВерх = 3.0) {
  const листыНиз = нижняя > 0 ? Math.ceil(нижняя / коэфНиз) : 0;
  const листыВерх = верхняя > 0 ? Math.ceil(верхняя / коэфВерх) : 0;
  return пеналы + листыНиз + листыВерх;
}

// Подбор оптимального раскроя столешницы из листов 3050 и 4200 мм.
// Условие: каждый кусок ≥ минКусок мм (по умолч. 500 мм).
// Критерий: минимальная закупочная стоимость, при равной — меньше швов.
export function calcTableTopCutting(нужнаяДлинаМм, столешницы) {
  const L = Math.round(parseFloat(нужнаяДлинаМм) || 0);
  if (L <= 0) return null;

  const МИН    = Math.round(parseFloat(столешницы?.минКусок)   || 500);
  const C3050  = parseFloat(столешницы?.закупка3050) || 0;
  const C4200  = parseFloat(столешницы?.закупка4200) || 0;
  const Н      = parseFloat(столешницы?.наценка)     || 0;
  const Л3050  = 3050;
  const Л4200  = 4200;

  if (L < МИН) return { error: `Минимальная длина — ${МИН} мм` };

  let лучший = null;
  // Максимально нужных листов — L / МИН (каждый минимального размера)
  const maxN = Math.min(Math.ceil(L / МИН) + 2, 20);

  for (let n1 = 0; n1 <= maxN; n1++) {
    for (let n2 = 0; n2 <= maxN - n1; n2++) {
      if (n1 + n2 === 0) continue;
      const T = n1 * Л3050 + n2 * Л4200;
      if (T < L) continue;                         // не хватает материала
      if (L < (n1 + n2) * МИН) continue;          // куски не влезут в минимум

      const cost   = n1 * C3050 + n2 * C4200;
      const sheets = n1 + n2;
      const лучше  = !лучший
        || cost < лучший.cost
        || (cost === лучший.cost && sheets < лучший.sheets);

      if (лучше) лучший = { n1, n2, T, sheets, cost };
    }
  }

  if (!лучший) return { error: 'Не удалось подобрать раскрой' };

  // Раскладываем L на куски для отображения
  const sizes = [
    ...Array(лучший.n1).fill(Л3050),
    ...Array(лучший.n2).fill(Л4200),
  ].sort((a, b) => b - a);

  const pieces = [];
  let rem = L;
  for (let i = 0; i < sizes.length; i++) {
    if (i === sizes.length - 1) {
      pieces.push({ sheet: sizes[i], piece: rem, waste: sizes[i] - rem });
    } else {
      const rest    = sizes.length - i - 1;
      const maxRest = sizes.slice(i + 1).reduce((s, x) => s + x, 0);
      const min     = Math.max(МИН, rem - maxRest);
      const max     = Math.min(sizes[i], rem - rest * МИН);
      const p       = Math.round(Math.min(max, Math.max(min, rem / (rest + 1))));
      pieces.push({ sheet: sizes[i], piece: p, waste: sizes[i] - p });
      rem -= p;
    }
  }

  return {
    n1: лучший.n1,
    n2: лучший.n2,
    sheets: лучший.sheets,
    joints: лучший.sheets - 1,
    cost: лучший.cost,
    costКлиент: Math.round(лучший.cost * (1 + Н / 100)),
    pieces,
  };
}

// Вычислить сумму наценки или скидки по типу и значению
function calcAdjustment(base, тип, значение) {
  if (тип === 'percent' && значение > 0) return base * (значение / 100);
  if (тип === 'sum' && значение > 0) return значение;
  return 0;
}

// Полный расчёт по всем блокам
export function calcTotal(data, settings) {
  const нижняя = parseFloat(data.нижняя) || 0;
  const верхняя = parseFloat(data.верхняя) || 0;
  const пеналы = parseInt(data.пеналы) || 0;

  // ── Корпуса ──
  const листы = (нижняя > 0 || верхняя > 0 || пеналы > 0)
    ? calcSheets(нижняя, верхняя, пеналы, settings.коэфНиз, settings.коэфВерх)
    : 0;
  const корпуса = листы * (settings.ценаЛиста || 0);

  // ── Фасады ──
  const фасадыСумма = (data.фасады || []).reduce((sum, f) => {
    return sum + (parseFloat(f.площадь) || 0) * (parseFloat(f.цена) || 0);
  }, 0);

  // ── Фрезеровка ──
  const фрезеровка = data.фрезеровкаВкл
    ? (parseFloat(data.фрезеровкаОбъём) || 0) * (parseFloat(data.фрезеровкаЦена) || 0)
    : 0;

  // ── Столешница ──
  let столешница = 0;
  if (data.столешницаРежим === 'calc') {
    const tt = calcTableTopCutting(data.столешницаДлина, settings.столешницы);
    столешница = (tt && !tt.error) ? tt.costКлиент : 0;
  } else {
    столешница = parseFloat(data.столешница) || 0;
  }

  // ── Фурнитура ──
  const hasPositions = (data.фурнитураПозиции || []).some(p => parseFloat(p.количество) > 0);
  const фурнитура = hasPositions
    ? data.фурнитураПозиции.reduce((sum, pos) => {
        const priceItem = (settings.прайсФурнитуры || []).find(p => p.id === pos.id);
        return sum + (parseFloat(pos.количество) || 0) * (parseFloat(priceItem?.цена) || 0);
      }, 0)
    : parseFloat(data.фурнитура) || 0;

  const итогоМебель = корпуса + фасадыСумма + фрезеровка + столешница + фурнитура;

  const монтажПроцент = parseFloat(data.монтажПроцент) || 0;
  const монтаж = итогоМебель * (монтажПроцент / 100);
  const доставка = parseFloat(data.доставка) || 0;

  const baseTotal = итогоМебель + монтаж + доставка;

  // ── Скрытая наценка ──────────────────────────────────────────────────────
  const скрытаяСумма = calcAdjustment(
    baseTotal,
    data.наценкаСкрытаяТип,
    parseFloat(data.наценкаСкрытая) || 0
  );
  const скрМульт = baseTotal > 0 ? (baseTotal + скрытаяСумма) / baseTotal : 1;

  const кпКорпуса    = корпуса      * скрМульт;
  const кпФасады     = фасадыСумма  * скрМульт;
  const кпФрезеровка = фрезеровка   * скрМульт;
  const кпСтолешница = столешница   * скрМульт;
  const кпФурнитура  = фурнитура    * скрМульт;
  const кпМонтаж     = монтаж       * скрМульт;
  const кпДоставка   = доставка     * скрМульт;
  const кпBase       = baseTotal    * скрМульт;

  // ── Видимая наценка ──────────────────────────────────────────────────────
  const видимаяСумма = calcAdjustment(
    кпBase,
    data.наценкаВидимаяТип,
    parseFloat(data.наценкаВидимая) || 0
  );

  // ── Скидка ───────────────────────────────────────────────────────────────
  const скидкаСумма = calcAdjustment(
    кпBase + видимаяСумма,
    data.скидкаТип,
    parseFloat(data.скидка) || 0
  );

  const итогоКлиент = кпBase + видимаяСумма - скидкаСумма;

  // ── Финансы ──────────────────────────────────────────────────────────────
  const себестоимость = parseFloat(data.себестоимость) || null;
  const маржа = себестоимость ? итогоКлиент - себестоимость : null;
  const маржаПроцент = маржа && итогоКлиент > 0
    ? (маржа / итогоКлиент * 100).toFixed(1)
    : null;

  return {
    листы, корпуса,
    фасады: фасадыСумма,
    фрезеровка, столешница, фурнитура,
    итогоМебель, монтаж, монтажПроцент, доставка,
    baseTotal, скрытаяСумма,
    кпКорпуса, кпФасады, кпФрезеровка, кпСтолешница, кпФурнитура,
    кпМонтаж, кпДоставка, кпBase, скрМульт,
    видимаяСумма, скидкаСумма, итогоКлиент,
    себестоимость, маржа, маржаПроцент,
    итого: baseTotal,
    итогоСНаценкой: итогоКлиент,
  };
}
