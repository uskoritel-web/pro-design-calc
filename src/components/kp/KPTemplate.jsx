// Шаблон коммерческого предложения — белый A4-документ
// Используется и для предпросмотра в браузере, и для печати/PDF
import { fmt } from '../../utils/calculations';

const BLUE = '#1565C0';
const ORANGE = '#E84B1A';
const GRAY = '#6B7280';
const LIGHT = '#F3F4F6';
const DARK = '#111827';

// Логотип ПроДизайн (CSS-версия для PDF)
function KPLogo({ white = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        background: white ? 'rgba(255,255,255,0.25)' : BLUE,
        borderRadius: 8, padding: '4px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          color: 'white', fontWeight: 900, fontSize: 11,
          letterSpacing: 0.5, lineHeight: 1,
        }}>ПРО</span>
      </div>
      <div>
        <div style={{ color: white ? 'white' : DARK, fontWeight: 900, fontSize: 18, lineHeight: 1 }}>
          Дизайн
        </div>
        <div style={{ color: white ? 'rgba(255,255,255,0.7)' : GRAY, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>
          Ремонт и комплектация
        </div>
      </div>
    </div>
  );
}

// Строка таблицы детализации
function TableRow({ label, detail, amount, isTotal, isSubtotal, isCategory }) {
  if (isCategory) return (
    <tr>
      <td colSpan={3} style={{
        padding: '10px 16px 4px', fontSize: 12, fontWeight: 700,
        color: BLUE, textTransform: 'uppercase', letterSpacing: 0.5,
        borderBottom: `2px solid ${BLUE}`,
      }}>
        {label}
      </td>
    </tr>
  );

  if (isTotal) return (
    <tr style={{ background: BLUE }}>
      <td colSpan={2} style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: 'white' }}>
        {label}
      </td>
      <td style={{ padding: '12px 16px', fontWeight: 900, fontSize: 16, color: 'white', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {amount}
      </td>
    </tr>
  );

  if (isSubtotal) return (
    <tr style={{ background: '#EFF6FF' }}>
      <td colSpan={2} style={{ padding: '8px 16px', fontWeight: 700, fontSize: 12, color: BLUE }}>
        {label}
      </td>
      <td style={{ padding: '8px 16px', fontWeight: 700, fontSize: 13, color: BLUE, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {amount}
      </td>
    </tr>
  );

  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
      <td style={{ padding: '8px 16px', fontSize: 12, color: DARK, width: '50%' }}>{label}</td>
      <td style={{ padding: '8px 16px', fontSize: 12, color: GRAY, width: '30%' }}>{detail}</td>
      <td style={{ padding: '8px 16px', fontSize: 12, color: DARK, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 500 }}>
        {amount}
      </td>
    </tr>
  );
}

// Галочка для списка "что входит"
function CheckItem({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
      <div style={{
        width: 20, height: 20, borderRadius: 10, background: '#DBEAFE',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>
        <span style={{ color: BLUE, fontSize: 11, fontWeight: 700 }}>✓</span>
      </div>
      <span style={{ fontSize: 13, color: DARK, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

// Заглушка для фото
function PhotoPlaceholder() {
  return (
    <div style={{
      width: '100%', height: 220, background: '#F8FAFC',
      border: '2px dashed #CBD5E1', borderRadius: 12,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <div style={{ fontSize: 40, opacity: 0.3 }}>🏠</div>
      <div style={{ fontSize: 12, color: '#94A3B8' }}>Фото объекта не добавлено</div>
    </div>
  );
}

// Форматирование даты
function formatDate(iso) {
  try {
    return new Date(iso || Date.now()).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return ''; }
}

// ─── Главный компонент шаблона ───────────────────────────────────────────────

export default function KPTemplate({ calc }) {
  if (!calc) return null;
  const r = calc.result || {};
  const date = formatDate(calc.createdAt);
  const kpNumber = calc.id ? calc.id.slice(-6) : '000001';

  // Список "что входит" — только ненулевые позиции
  const включено = [
    r.листы > 0 && `Корпусная мебель из ЛДСП 16мм — ${r.листы} листов`,
    r.фасады > 0 && calc.фасады?.some(f => f.материал) &&
      `Фасады: ${[...new Set(calc.фасады.filter(f => f.материал && parseFloat(f.площадь) > 0).map(f => f.материал))].join(', ')}`,
    r.фрезеровка > 0 && 'Фрезеровка фасадов',
    r.столешница > 0 && 'Столешница',
    r.фурнитура > 0 && 'Фурнитура',
    r.монтаж > 0 && `Профессиональный монтаж (${r.монтажПроцент}% от стоимости мебели)`,
    r.доставка > 0 && 'Доставка на объект',
    r.технолог > 0 && 'Технолог (чертежи)',
  ].filter(Boolean);

  // Обратная совместимость: старые расчёты не имеют кп* полей — берём оригинальные
  const кпКорпуса    = r.кпКорпуса    ?? r.корпуса     ?? 0;
  const кпФасады     = r.кпФасады     ?? r.фасады      ?? 0;
  const кпФрезеровка = r.кпФрезеровка ?? r.фрезеровка  ?? 0;
  const кпСтолешница = r.кпСтолешница ?? r.столешница  ?? 0;
  const кпФурнитура  = r.кпФурнитура  ?? r.фурнитура   ?? 0;
  const кпМонтаж     = r.кпМонтаж     ?? r.монтаж      ?? 0;
  const кпДоставка   = r.кпДоставка   ?? r.доставка    ?? 0;
  const кпТехнолог   = r.кпТехнолог   ?? r.технолог    ?? 0;
  const скрМульт     = r.скрМульт     ?? 1;
  const видимаяСумма = r.видимаяСумма ?? 0;
  const скидкаСумма  = r.скидкаСумма  ?? 0;
  const итогоКлиент  = r.итогоКлиент  ?? r.итогоСНаценкой ?? r.итого ?? 0;

  const итоговаяЦена = итогоКлиент;

  return (
    <div className="kp-document kp-page-wrapper" style={{ color: DARK }}>

      {/* ══ СТРАНИЦА 1 ══════════════════════════════════════════════════════ */}

      {/* Шапка документа — синяя полоса */}
      <div style={{
        background: BLUE, padding: '16px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <KPLogo white />
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            Коммерческое предложение
          </div>
          <div style={{ color: 'white', fontSize: 11, fontWeight: 600, marginTop: 2 }}>
            № {kpNumber} от {date}
          </div>
        </div>
      </div>

      {/* Тело страницы 1 */}
      <div style={{ padding: '24px 32px' }}>

        {/* Заголовок */}
        <h1 style={{ fontSize: 28, fontWeight: 900, color: DARK, margin: '0 0 6px', lineHeight: 1.2 }}>
          Кухонный гарнитур
          {calc.клиент ? ` для ${calc.клиент}` : ''}
        </h1>
        {calc.объект && (
          <p style={{ fontSize: 14, color: GRAY, margin: '0 0 24px' }}>📍 {calc.объект}</p>
        )}
        {!calc.объект && <div style={{ marginBottom: 24 }} />}

        {/* Фото объекта — фиксированная высота, изображение вписано без обрезки */}
        {calc.изображение ? (
          <div style={{
            height: 200, borderRadius: 12, marginBottom: 24,
            background: '#F8FAFC', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={calc.изображение}
              alt="Фото объекта"
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <PhotoPlaceholder />
          </div>
        )}

        {/* Блок с ценой */}
        <div style={{
          background: `linear-gradient(135deg, ${BLUE} 0%, #1976D2 100%)`,
          borderRadius: 16, padding: '20px 28px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }} className="no-break">
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 6, letterSpacing: 0.5 }}>
              СТОИМОСТЬ ПОД КЛЮЧ
            </div>
            <div style={{ color: 'white', fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>
              {fmt(итоговаяЦена)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>
              включает монтаж и доставку
            </div>
          </div>
          <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
            {кпКорпуса > 0 && <div>Мебель: {fmt(итогоКлиент - кпДоставка - кпМонтаж - видимаяСумма + скидкаСумма)}</div>}
            {кпМонтаж > 0 && <div>Монтаж: {fmt(кпМонтаж)}</div>}
            {кпДоставка > 0 && <div>Доставка: {fmt(кпДоставка)}</div>}
          </div>
        </div>

        {/* Что входит в стоимость */}
        {включено.length > 0 && (
          <div className="no-break">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: DARK, margin: '0 0 14px', letterSpacing: -0.3 }}>
              В стоимость входит:
            </h2>
            {/* flex + width:50% вместо grid — grid плохо работает в html2canvas */}
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {включено.map((item, i) => (
                <div key={i} style={{ width: '50%', paddingRight: 16, boxSizing: 'border-box' }}>
                  <CheckItem text={item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Условия работы */}
        <div style={{
          marginTop: 28, background: '#F8FAFC', borderRadius: 12,
          padding: '16px 20px', borderLeft: `4px solid ${BLUE}`,
        }} className="no-break">
          <div style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 8 }}>Условия</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              '70% предоплата на материалы',
              'Остаток — в день доставки',
              'Срок изготовления по согласованию',
              'Гарантия на выполненные работы',
            ].map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: GRAY, display: 'flex', gap: 6 }}>
                <span style={{ color: BLUE, flexShrink: 0 }}>→</span> {c}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ СТРАНИЦА 2: ДЕТАЛИЗАЦИЯ ═══════════════════════════════════════ */}
      <div className="page-break" style={{ padding: '24px 32px' }}>

        {/* Маленькая шапка на второй странице */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24, paddingBottom: 16, borderBottom: `2px solid ${BLUE}`,
        }}>
          <KPLogo />
          <div style={{ fontSize: 11, color: GRAY }}>
            {calc.клиент && <span>{calc.клиент} · </span>}
            {date}
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 900, color: DARK, margin: '0 0 20px' }}>
          Детализация стоимости
        </h2>

        {/* Таблица */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, borderSpacing: 0 }} className="no-break">
          <thead>
            <tr style={{ background: LIGHT, borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: GRAY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Позиция
              </th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: GRAY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Параметры
              </th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, color: GRAY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Сумма
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Корпуса */}
            {r.листы > 0 && <>
              <TableRow isCategory label="Корпуса" />
              <TableRow
                label="ЛДСП 16мм — корпусные детали"
                detail={`${r.листы} листов × ${calc.нижняя || 0}+${calc.верхняя || 0}м баз, ${calc.пеналы || 0} пен.`}
                amount={fmt(кпКорпуса)}
              />
              <TableRow isSubtotal label="Итого корпуса" amount={fmt(кпКорпуса)} />
            </>}

            {/* Фасады — цена за м² умножена на коэффициент скрытой наценки */}
            {кпФасады > 0 && <>
              <TableRow isCategory label="Фасады" />
              {(calc.фасады || []).filter(f => parseFloat(f.площадь) > 0).map((f, i) => {
                const площадь = parseFloat(f.площадь) || 0;
                const ценаКП = (parseFloat(f.цена) || 0) * скрМульт;
                return (
                  <TableRow
                    key={i}
                    label={f.материал || 'Фасад'}
                    detail={`${площадь} м² × ${fmt(ценаКП)}/м²`}
                    amount={fmt(площадь * ценаКП)}
                  />
                );
              })}
              <TableRow isSubtotal label="Итого фасады" amount={fmt(кпФасады)} />
            </>}

            {/* Фрезеровка */}
            {кпФрезеровка > 0 && <>
              <TableRow isCategory label="Фрезеровка" />
              <TableRow
                label="Фрезеровка фасадов"
                detail={`${calc.фрезеровкаОбъём} м²`}
                amount={fmt(кпФрезеровка)}
              />
            </>}

            {/* Столешница */}
            {кпСтолешница > 0 && <>
              <TableRow isCategory label="Столешница" />
              <TableRow label="Столешница" detail="" amount={fmt(кпСтолешница)} />
            </>}

            {/* Фурнитура */}
            {кпФурнитура > 0 && <>
              <TableRow isCategory label="Фурнитура" />
              <TableRow label="Фурнитура и комплектующие" detail="" amount={fmt(кпФурнитура)} />
            </>}

            {/* Монтаж, доставка, технолог */}
            {(кпМонтаж > 0 || кпДоставка > 0 || кпТехнолог > 0) && <>
              <TableRow isCategory label="Прочие услуги" />
              {кпМонтаж > 0 && (
                <TableRow
                  label="Профессиональный монтаж"
                  detail={`${r.монтажПроцент}% от стоимости мебели`}
                  amount={fmt(кпМонтаж)}
                />
              )}
              {кпДоставка > 0 && (
                <TableRow label="Доставка на объект" detail="" amount={fmt(кпДоставка)} />
              )}
              {кпТехнолог > 0 && (
                <TableRow label="Технолог (чертежи)" detail="" amount={fmt(кпТехнолог)} />
              )}
            </>}

            {/* Видимая наценка — отдельная строка */}
            {видимаяСумма > 0 && (
              <TableRow
                label="Дополнительные услуги"
                detail=""
                amount={fmt(видимаяСумма)}
              />
            )}

            {/* Скидка — отдельная строка со знаком минус */}
            {скидкаСумма > 0 && (
              <TableRow
                label="Скидка"
                detail=""
                amount={`−${fmt(скидкаСумма)}`}
              />
            )}

            {/* Итого */}
            <TableRow isTotal label="ИТОГО К ОПЛАТЕ" amount={fmt(итоговаяЦена)} />
          </tbody>
        </table>

        {/* Примечания */}
        <div style={{ marginTop: 24, fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
          <p>
            * Стоимость корпусов рассчитана по полному листу ЛДСП 16мм (2750×1830мм),
            включая распил, кромку и присадку.
          </p>
        </div>

        {/* Футер */}
        <div style={{
          marginTop: 32, paddingTop: 16, borderTop: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <KPLogo />
          <div style={{ textAlign: 'right', fontSize: 11, color: GRAY, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 600 }}>pro-design-ekb.ru</div>
            <div>Екатеринбург</div>
          </div>
        </div>
      </div>

    </div>
  );
}
