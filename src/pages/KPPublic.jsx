// Публичная страница КП — для отправки клиенту.
// Задача 7: трекинг открытия → Telegram
// Задача 8: кнопка «Подтвердить предложение»
// Задача 9: таймер срока действия
// Доп: мини-опрос клиента (3 вопроса)
import { useState, useEffect, useRef, useCallback } from 'react';
import KPTemplate from '../components/kp/KPTemplate';
import { loadCalculationById } from '../utils/storage';

const QUESTIONS = [
  {
    id: 'цена',
    q: 'Как вам стоимость предложения?',
    opts: [
      { v: 'ok',   l: 'В моём бюджете',        e: '✅' },
      { v: 'bit',  l: 'Чуть выше ожиданий',     e: '😐' },
      { v: 'high', l: 'Значительно дороже',      e: '😟' },
    ],
  },
  {
    id: 'состав',
    q: 'Всё нужное включено в предложение?',
    opts: [
      { v: 'complete', l: 'Да, всё что нужно',            e: '✅' },
      { v: 'adjust',   l: 'Хочу кое-что скорректировать', e: '✏️' },
      { v: 'missing',  l: 'Многого не хватает',            e: '🤔' },
    ],
  },
  {
    id: 'шаг',
    q: 'Что планируете делать дальше?',
    opts: [
      { v: 'ready',   l: 'Готов к следующему шагу', e: '🤝' },
      { v: 'think',   l: 'Нужно подумать',           e: '⏳' },
      { v: 'looking', l: 'Смотрю другие варианты',   e: '🔍' },
    ],
  },
];

function ScaledPreview({ docRef, calc }) {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);
  const updateScale = useCallback(() => {
    if (wrapperRef.current) {
      setScale(Math.min(1, (wrapperRef.current.parentElement.clientWidth - 16) / 794));
    }
  }, []);
  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);
  const isMobile = scale < 1;
  return (
    <div ref={wrapperRef} style={isMobile ? { width: `${794 * scale}px`, height: `${1123 * scale * 2}px`, position: 'relative', overflow: 'hidden' } : {}}>
      <div ref={docRef} style={{ ...(isMobile ? { transformOrigin: 'top left', transform: `scale(${scale})`, width: '794px' } : {}), boxShadow: '0 4px 32px rgba(0,0,0,0.15)' }} className="rounded-sm overflow-hidden">
        <KPTemplate calc={calc} />
      </div>
    </div>
  );
}

// Осталось времени — без посекундного отсчёта (не давим на клиента)
function formatTimeLeft(ms) {
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 1)  return `${d} дн. ${h} ч.`;
  if (d === 1) return `1 день ${h} ч.`;
  if (h > 0)  return `${h} ч. ${m} мин.`;
  return `${m} мин.`;
}

// Конец дня срока действия в локальной таймзоне (а не UTC-полночь)
function endOfDay(dateStr) {
  const [y, mo, da] = String(dateStr).split('-').map(Number);
  if (!y || !mo || !da) {
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  return new Date(y, mo - 1, da, 23, 59, 59, 999);
}

// Имя PDF-файла: заголовок → клиент → объект, без запрещённых символов
function kpFileName(calc) {
  const base = calc?.заголовокКП || calc?.клиент || calc?.объект || 'КП';
  const safe = base.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `КП ПроДизайн — ${safe || 'КП'}.pdf`;
}

export default function KPPublic() {
  const [calc, setCalc]           = useState(null);
  const [fetching, setFetching]   = useState(true);
  const [loadError, setLoadError] = useState(false); // ошибка сети (не «не найдено»)
  const [loading, setLoading]     = useState(false);
  const [confirmState, setConfirm] = useState('idle'); // idle | loading | done
  const [confirmError, setConfirmError] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(null);
  const [answers, setAnswers]     = useState({ цена: null, состав: null, шаг: null });
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const docRef = useRef(null);
  const pdfRef = useRef(null); // немасштабированный экземпляр для PDF

  const load = useCallback(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { setFetching(false); return; }
    setFetching(true);
    setLoadError(false);
    loadCalculationById(id)
      .then(found => {
        if (found) {
          setCalc(found);
          if (found.confirmed_at) setConfirm('done');
          if (found.feedback)     setFeedbackSent(true);
          // Трекинг открытия (пропускаем если preview=1)
          const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';
          if (found.трекингВкл !== false && !isPreview) {
            fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'open', calcId: id }),
            }).catch(() => {});
          }
        }
        // found === null → расчёт не найден (не ошибка)
      })
      .catch(err => { console.error('Ошибка загрузки КП:', err); setLoadError(true); })
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Задача 9: обратный отсчёт
  useEffect(() => {
    if (!calc?.срокДействия || calc.таймерВкл === false) return;
    const tick = () => setTimeLeft(endOfDay(calc.срокДействия) - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [calc]);

  // Задача 8: подтверждение
  const handleConfirm = async () => {
    if (confirmState !== 'idle') return;
    setConfirm('loading');
    setConfirmError(false);
    try {
      const resp = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'confirm', calcId: calc.id }),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      setConfirm('done');
    } catch (err) {
      console.error('Ошибка подтверждения:', err);
      // Не показываем ложное «подтверждено» — даём повторить
      setConfirm('idle');
      setConfirmError(true);
    }
  };

  // Мини-опрос: отправить
  const handleFeedback = async () => {
    if (!QUESTIONS.every(q => answers[q.id])) return;
    setFeedbackLoading(true);
    setFeedbackError(false);
    try {
      const resp = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'feedback', calcId: calc.id, feedback: answers }),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      setFeedbackSent(true);
    } catch (err) {
      console.error('Ошибка отправки отзыва:', err);
      setFeedbackError(true);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const source = pdfRef.current || docRef.current;
    if (!source) return;
    setLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 0, filename: kpFileName(calc),
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(source).save();
    } catch (e) {
      console.error(e);
      alert('Не удалось создать PDF. Попробуйте ещё раз или откройте страницу в другом браузере.');
    }
    finally { setLoading(false); }
  };

  if (fetching) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Загрузка...</div>
    </div>
  );

  // Ошибка сети — предложение существует, но не загрузилось
  if (loadError) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-gray-600 mb-2">Не удалось загрузить</h2>
      <p className="text-gray-400 text-sm mb-6">Проверьте интернет-соединение и попробуйте снова.</p>
      <button onClick={load} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm">
        Обновить
      </button>
    </div>
  );

  if (!calc) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <div className="text-5xl mb-4">📄</div>
      <h2 className="text-2xl font-bold text-gray-600 mb-2">Предложение не найдено</h2>
      <p className="text-gray-400 text-sm">Возможно, ссылка устарела или неверна.</p>
    </div>
  );

  const title     = calc.заголовокКП || (calc.клиент ? `КП для ${calc.клиент}` : calc.объект || 'Коммерческое предложение');
  const isExpired = calc.срокДействия && calc.таймерВкл !== false && timeLeft !== null && timeLeft <= 0;
  const allAnswered = QUESTIONS.every(q => answers[q.id]);

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Шапка */}
      <div className="bg-white border-b border-gray-200 print:hidden sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-gray-400 mb-0.5">ПроДизайн · Коммерческое предложение</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{title}</div>
          </div>
          <button onClick={handleDownloadPDF} disabled={loading}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
            {loading ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Создаём…</> : '⬇ Скачать PDF'}
          </button>
        </div>
      </div>

      {/* Таймер срока действия (Задача 9) */}
      {calc.срокДействия && calc.таймерВкл !== false && (
        <div className={`print:hidden border-b ${isExpired ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            {isExpired ? (
              <div className="text-sm text-red-600">
                Срок действия предложения истёк.{' '}
                <a href="https://pro-design-ekb.ru" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                  Запросить актуальный расчёт →
                </a>
              </div>
            ) : (
              <>
                <div className="text-sm text-blue-700">
                  Предложение действительно до{' '}
                  <span className="font-semibold">
                    {new Date(calc.срокДействия).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                {timeLeft > 0 && <div className="text-xs text-blue-500 flex-shrink-0 font-mono">{formatTimeLeft(timeLeft)}</div>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Документ */}
      <div className="py-6 sm:py-10 flex justify-center px-2 sm:px-0 print:hidden">
        <ScaledPreview docRef={docRef} calc={calc} />
      </div>

      {/* Кнопка подтверждения (Задача 8) + мини-опрос */}
      {!isExpired && (
        <div className="print:hidden pb-12 flex justify-center px-4">
          <div className="w-full max-w-[794px] space-y-4">

            {/* Кнопка «Подтвердить предложение» */}
            {calc.подтверждениеВкл !== false && (
              confirmState === 'done' ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-5 text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-green-800 font-semibold text-base mb-1">Предложение подтверждено!</div>
                  <div className="text-green-600 text-sm">Менеджер свяжется с вами в ближайшее время.</div>
                </div>
              ) : (
                <>
                  <button onClick={handleConfirm} disabled={confirmState === 'loading'}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold text-base rounded-2xl transition-colors flex items-center justify-center gap-2">
                    {confirmState === 'loading' ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Отправляем…</> : '✅ Подтвердить предложение'}
                  </button>
                  {confirmError && (
                    <div className="mt-2 text-sm text-red-600 text-center">
                      Не удалось отправить. Проверьте интернет и нажмите ещё раз.
                    </div>
                  )}
                </>
              )
            )}

            {/* Мини-опрос */}
            {calc.опросВкл !== false && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="font-semibold text-gray-800 text-base">💬 Поделитесь вашим мнением</div>
                  <div className="text-gray-400 text-sm mt-0.5">3 вопроса — займёт меньше минуты</div>
                </div>

                {feedbackSent ? (
                  <div className="px-6 py-8 text-center">
                    <div className="text-3xl mb-3">🙏</div>
                    <div className="text-gray-700 font-semibold text-base mb-1">Спасибо за обратную связь!</div>
                    <div className="text-gray-400 text-sm">Ваше мнение поможет нам стать лучше.</div>
                  </div>
                ) : (
                  <div className="px-6 py-5 space-y-6">
                    {QUESTIONS.map(({ id, q, opts }) => (
                      <div key={id}>
                        <div className="text-sm font-medium text-gray-700 mb-3">{q}</div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {opts.map(({ v, l, e }) => (
                            <button
                              key={v}
                              onClick={() => setAnswers(a => ({ ...a, [id]: v }))}
                              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                                answers[id] === v
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <span className="text-lg leading-none">{e}</span>
                              <span>{l}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={handleFeedback}
                      disabled={!allAnswered || feedbackLoading}
                      className="w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white flex items-center justify-center gap-2"
                    >
                      {feedbackLoading
                        ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Отправляем…</>
                        : allAnswered ? 'Отправить отзыв →' : 'Ответьте на все вопросы'
                      }
                    </button>
                    {feedbackError && (
                      <div className="text-sm text-red-600 text-center">
                        Не удалось отправить отзыв. Проверьте интернет и попробуйте снова.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="hidden print:block"><KPTemplate calc={calc} /></div>

      {/* Скрытый немасштабированный экземпляр для генерации PDF (фикс перекосов) */}
      <div
        aria-hidden="true"
        className="print:hidden"
        style={{ position: 'absolute', left: -99999, top: 0, width: 794, pointerEvents: 'none' }}
      >
        <div ref={pdfRef}>
          <KPTemplate calc={calc} />
        </div>
      </div>
    </div>
  );
}
