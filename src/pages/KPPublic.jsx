// Публичная страница КП — для отправки клиенту.
// Нет шапки приложения, нет кнопки «Изменить».
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

export default function KPPublic() {
  const [calc, setCalc]       = useState(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading]  = useState(false);
  const docRef = useRef(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      loadCalculationById(id).then(found => {
        if (found) setCalc(found);
        setFetching(false);
      });
    } else {
      setFetching(false);
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Шапка — только лого и кнопка скачать */}
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
              text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors
              flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Создаём…
              </>
            ) : (
              <>⬇ Скачать PDF</>
            )}
          </button>
        </div>
      </div>

      {/* Документ */}
      <div className="py-6 sm:py-10 flex justify-center px-2 sm:px-0 print:p-0">
        <ScaledPreview docRef={docRef} calc={calc} />
      </div>

      {/* Версия для печати */}
      <div className="hidden print:block">
        <KPTemplate calc={calc} />
      </div>
    </div>
  );
}
