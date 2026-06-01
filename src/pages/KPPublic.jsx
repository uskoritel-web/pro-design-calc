// Публичная страница КП — для отправки клиенту.
// Задача 7: трекинг открытия → Telegram
// Задача 8: кнопка «Подтвердить предложение»
// Задача 9: таймер срока действия
import { useState, useEffect, useRef, useCallback } from 'react';
import KPTemplate from '../components/kp/KPTemplate';
import { loadCalculationById } from '../utils/storage';

// Масштабирует A4 под ширину экрана на мобильных
function ScaledPreview({ docRef, calc }) {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    if (wrapperRef.current) {
      const available = wrapperRef.current.parentElement.clientWidth - 16;
      setScale(Math.min(1, available / 794));
    }
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const isMobile = scale < 1;

  return (
    <div ref={wrapperRef} style={isMobile ? {
      width: `${794 * scale}px`,
      height: `${1123 * scale * 2}px`,
      position: 'relative', overflow: 'hidden',
    } : {}}>
      <div
        ref={docRef}
        style={{
          ...(isMobile ? { transformOrigin: 'top left', transform: `scale(${scale})`, width: '794px' } : {}),
          boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
        }}
        className="rounded-sm overflow-hidden"
      >
        <KPTemplate calc={calc} />
      </div>
    </div>
  );
}

// Форматирует оставшееся время
function formatTimeLeft(ms) {
  if (ms <= 0) return null;
  const days    = Math.floor(ms / 86400000);
  const hours   = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (days > 1)  return `${days} дн. ${hours} ч.`;
  if (days === 1) return `1 день ${hours} ч. ${minutes} мин.`;
  if (hours > 0) return `${hours} ч. ${minutes} мин. ${seconds} сек.`;
  return `${minutes} мин. ${seconds} сек.`;
}

export default function KPPublic() {
  const [calc, setCalc]             = useState(null);
  const [fetching, setFetching]     = useState(true);
  const [loading, setLoading]       = useState(false);
  const [confirmState, setConfirm]  = useState('idle'); // idle | loading | done
  const [timeLeft, setTimeLeft]     = useState(null);
  const docRef = useRef(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { setFetching(false); return; }

    loadCalculationById(id).then(found => {
      if (found) {
        setCalc(found);
        if (found.confirmed_at) setConfirm('done');
        // Задача 7: трекинг открытия
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'open', calcId: id }),
        }).catch(() => {}); // тихо — не мешаем загрузке страницы
      }
      setFetching(false);
    });
  }, []);

  // Задача 9: обратный отсчёт
  useEffect(() => {
    if (!calc?.срокДействия) return;
    const tick = () => {
      const deadline = new Date(calc.срокДействия);
      deadline.setHours(23, 59, 59, 999); // до конца дня
      setTimeLeft(deadline - Date.now());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [calc]);

  // Задача 8: подтверждение
  const handleConfirm = async () => {
    if (confirmState !== 'idle') return;
    setConfirm('loading');
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'confirm', calcId: calc.id }),
      });
    } catch {}
    setConfirm('done');
  };

  const handleDownloadPDF = async () => {
    if (!docRef.current) return;
    setLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const name = calc?.клиент || calc?.объект || 'КП';
      await html2pdf().set({
        margin: 0,
        filename: `КП ПроДизайн — ${name}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(docRef.current).save();
    } catch (e) {
      console.error('PDF error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!calc) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-2xl font-bold text-gray-600 mb-2">Предложение не найдено</h2>
        <p className="text-gray-400 text-sm">Возможно, ссылка устарела или неверна.</p>
      </div>
    );
  }

  const title = calc.клиент
    ? `Коммерческое предложение для ${calc.клиент}`
    : calc.объект || 'Коммерческое предложение';

  const isExpired = calc.срокДействия && timeLeft !== null && timeLeft <= 0;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Шапка */}
      <div className="bg-white border-b border-gray-200 print:hidden sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-gray-400 mb-0.5">ПроДизайн · Коммерческое предложение</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{title}</div>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50
              text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Создаём…
              </>
            ) : '⬇ Скачать PDF'}
          </button>
        </div>
      </div>

      {/* Таймер срока действия */}
      {calc.срокДействия && (
        <div className={`print:hidden ${isExpired ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border-b`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            {isExpired ? (
              <div className="text-sm text-red-600">
                Срок действия предложения истёк. Свяжитесь с нами для актуального расчёта.
              </div>
            ) : (
              <>
                <div className="text-sm text-blue-700">
                  Предложение действительно до{' '}
                  <span className="font-semibold">
                    {new Date(calc.срокДействия).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                {timeLeft !== null && timeLeft > 0 && (
                  <div className="text-xs text-blue-500 flex-shrink-0 font-mono">
                    {formatTimeLeft(timeLeft)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Документ */}
      <div className="py-6 sm:py-10 flex justify-center px-2 sm:px-0 print:p-0">
        <ScaledPreview docRef={docRef} calc={calc} />
      </div>

      {/* Кнопка подтверждения */}
      {!isExpired && (
        <div className="print:hidden pb-10 flex justify-center px-4">
          <div className="w-full max-w-[794px]">
            {confirmState === 'done' ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-5 text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-green-800 font-semibold text-base mb-1">Предложение подтверждено!</div>
                <div className="text-green-600 text-sm">Менеджер свяжется с вами в ближайшее время.</div>
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={confirmState === 'loading'}
                className="w-full py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60
                  text-white font-bold text-base rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {confirmState === 'loading' ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Отправляем…
                  </>
                ) : '✅ Подтвердить предложение'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Версия для печати */}
      <div className="hidden print:block">
        <KPTemplate calc={calc} />
      </div>
    </div>
  );
}
