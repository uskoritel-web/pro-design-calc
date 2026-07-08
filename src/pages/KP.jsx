// Страница предпросмотра и скачивания КП
import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

// Компонент предпросмотра — на мобиле масштабирует A4 под ширину экрана
function MobileScaledPreview({ docRef, calc }) {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    if (wrapperRef.current) {
      const available = wrapperRef.current.parentElement.clientWidth - 16;
      const newScale = Math.min(1, available / 794);
      setScale(newScale);
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
      height: `${1123 * scale * 2}px`, // две страницы
      position: 'relative',
      overflow: 'hidden',
    } : {}}>
      <div
        ref={docRef}
        style={isMobile ? {
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          width: '794px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        } : {
          boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        }}
        className="rounded-sm overflow-hidden"
      >
        <KPTemplate calc={calc} />
      </div>
    </div>
  );
}
import AppHeader from '../components/AppHeader';
import KPTemplate from '../components/kp/KPTemplate';
import { loadCalculationById } from '../utils/storage';

// Публичный адрес приложения. В нативном приложении (Capacitor) origin —
// https://localhost, поэтому клиентские ссылки строим от рабочего домена.
const PUBLIC_BASE = 'https://pro-design-calc.vercel.app';
function publicBase() {
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    return window.location.origin;
  }
  return PUBLIC_BASE;
}

// Имя PDF-файла: заголовок → клиент → объект, без запрещённых в ФС символов
function kpFileName(calc) {
  const base = calc?.заголовокКП || calc?.клиент || calc?.объект || 'КП';
  const safe = base.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `КП ПроДизайн — ${safe || 'КП'}.pdf`;
}

export default function KP() {
  const [calc, setCalc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  // Видимый предпросмотр (может быть масштабирован на мобильном)
  const docRef = useRef(null);
  // Скрытый немасштабированный экземпляр — из него строим PDF (без перекосов)
  const pdfRef = useRef(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      loadCalculationById(id)
        .then(found => {
          if (found) setCalc(found);
          // found === null → расчёт не найден (не ошибка сети)
        })
        .catch(err => { console.error('Ошибка загрузки КП:', err); setLoadError(true); })
        .finally(() => setFetching(false));
    } else {
      setFetching(false);
    }
  }, []);

  const isNative = Capacitor.isNativePlatform();
  // Узел для генерации PDF: немасштабированный скрытый экземпляр
  const pdfSource = () => pdfRef.current || docRef.current;

  // Общие опции html2pdf (одно место — чтобы конфиги не разъезжались)
  const pdfOptions = () => ({
    margin: 0,
    filename: kpFileName(calc),
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff', windowWidth: 794 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  });

  // Генерирует base64 PDF из немасштабированного экземпляра
  const buildPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const options = pdfOptions();
    const dataUri = await html2pdf().set(options).from(pdfSource()).output('datauristring');
    return { base64: dataUri.split(',')[1], filename: options.filename };
  };

  // Десктоп: обычное скачивание
  const handleDownloadPDF = async () => {
    if (!pdfSource()) return;
    setLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(pdfOptions()).from(pdfSource()).save();
    } catch (e) {
      console.error('PDF error:', e);
      alert('Ошибка при создании PDF.');
    } finally {
      setLoading(false);
    }
  };

  // Android: сохранить файл и открыть в PDF-просмотрщике
  const handleAndroidSave = async () => {
    if (!pdfSource()) return;
    setLoading(true);
    try {
      const { base64, filename } = await buildPDF();
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { FileOpener } = await import('@capacitor-community/file-opener');

      const saved = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
      });

      // Открываем PDF в системном просмотрщике — из него можно сохранить в Downloads
      await FileOpener.open({
        filePath: saved.uri,
        contentType: 'application/pdf',
      });
    } catch (e) {
      console.error('Android save error:', e);
      alert('Не удалось открыть PDF. Попробуйте кнопку «Отправить».');
    } finally {
      setLoading(false);
    }
  };

  // Android: поделиться через системный share-диалог
  const handleAndroidShare = async () => {
    if (!pdfSource()) return;
    setLoading(true);
    try {
      const { base64, filename } = await buildPDF();
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const saved = await Filesystem.writeFile({
        path: `share_${Date.now()}.pdf`,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({ title: filename, url: saved.uri, dialogTitle: 'Отправить PDF' });
    } catch (e) {
      if (e?.message !== 'Share canceled') {
        console.error('Android share error:', e);
        alert('Ошибка при отправке PDF.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // Копирование в буфер с фолбэком для старых WebView / insecure-контекста
  const copyText = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fallthrough */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyLink = async () => {
    const url = `${publicBase()}/kp-public?id=${calc.id}`;
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      prompt('Скопируйте ссылку для клиента вручную:', url);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-900">
        <AppHeader />
        <div className="flex items-center justify-center py-32 text-white/40">
          Загрузка...
        </div>
      </div>
    );
  }

  if (!calc) {
    return (
      <div className="min-h-screen bg-gray-900">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <div className="text-5xl mb-4">{loadError ? '⚠️' : '📄'}</div>
          <h2 className="text-2xl font-bold text-white/60 mb-2">
            {loadError ? 'Не удалось загрузить КП' : 'КП не найдено'}
          </h2>
          <p className="text-white/30 text-sm mb-6">
            {loadError
              ? 'Проверьте интернет и обновите страницу.'
              : 'Сохраните расчёт в калькуляторе и нажмите «Сформировать КП»'}
          </p>
          {loadError ? (
            <button onClick={() => window.location.reload()} className="text-brand-blue hover:underline text-sm">
              Обновить страницу
            </button>
          ) : (
            <a href="/app" className="text-brand-blue hover:underline text-sm">
              ← Открыть калькулятор
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">

      {/* Шапка — скрыта при печати */}
      <div className="print-hidden">
        <AppHeader />

        {/* Панель управления */}
        <div className="bg-gray-900 border-b border-white/10 py-3 px-4 sm:px-6 sticky top-[57px] z-40">
          <div className="max-w-4xl mx-auto">
            {/* Заголовок */}
            <div className="mb-3">
              <h1 className="text-white font-bold text-base sm:text-lg leading-tight">
                {calc.заголовокКП || (
                  calc.клиент
                    ? `КП для ${calc.клиент}`
                    : calc.объект || 'Коммерческое предложение'
                )}
              </h1>
            </div>

            {/* Кнопки — в ряд, равномерно */}
            <div className="flex gap-2">
              <a
                href={`/app?id=${calc?.id}`}
                className="flex-1 sm:flex-none border border-white/20 hover:border-white/40 text-white/70 hover:text-white
                  font-medium px-3 py-2 rounded-xl transition-colors text-xs sm:text-sm text-center"
              >
                ← Изменить
              </a>
              <button
                onClick={handleCopyLink}
                className={`flex-1 sm:flex-none border font-medium px-3 py-2 rounded-xl transition-colors text-xs sm:text-sm ${
                  copied
                    ? 'border-green-500/50 text-green-400'
                    : 'border-white/20 hover:border-white/40 text-white/70 hover:text-white'
                }`}
              >
                {copied ? '✓ Скопировано' : '🔗 Ссылка для клиента'}
              </button>
              <button
                onClick={async () => {
                  // preview=1 отключает трекинг — обрабатывается на /kp-public
                  const previewUrl = `${publicBase()}/kp-public?id=${calc.id}&preview=1`;
                  const ok = await copyText(previewUrl);
                  if (ok) alert('Скопирована ссылка для команды (без трекинга)');
                  else prompt('Ссылка для команды (без трекинга):', previewUrl);
                }}
                className="flex-1 sm:flex-none border border-white/20 hover:border-white/40 text-white/70 hover:text-white
                  font-medium px-3 py-2 rounded-xl transition-colors text-xs sm:text-sm"
              >
                👁 Для команды
              </button>
              {!isNative && (
                <button
                  onClick={handlePrint}
                  className="flex-1 sm:flex-none border border-white/20 hover:border-white/40 text-white/70 hover:text-white
                    font-medium px-3 py-2 rounded-xl transition-colors text-xs sm:text-sm"
                >
                  🖨 Печать
                </button>
              )}
              {isNative ? (
                <>
                  <button
                    onClick={handleAndroidSave}
                    disabled={loading}
                    className="flex-1 bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 text-white
                      font-semibold px-3 py-2 rounded-xl transition-colors text-xs flex items-center justify-center gap-1"
                  >
                    {loading ? <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '💾 Сохранить'}
                  </button>
                  <button
                    onClick={handleAndroidShare}
                    disabled={loading}
                    className="flex-1 border border-brand-blue/50 hover:border-brand-blue text-brand-blue
                      font-semibold px-3 py-2 rounded-xl transition-colors text-xs flex items-center justify-center gap-1"
                  >
                    {loading ? '...' : '↗ Отправить'}
                  </button>
                </>
              ) : (
              <button
                onClick={handleDownloadPDF}
                disabled={loading}
                className="flex-1 sm:flex-none bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 text-white
                  font-semibold px-3 py-2 rounded-xl transition-colors text-xs sm:text-sm flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="hidden sm:inline">Создаём...</span>
                  </>
                ) : (
                  <>⬇ <span>PDF</span></>
                )}
              </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Предпросмотр КП — ref только здесь, этот элемент ВИДИМ */}
      <div className="print-hidden py-6 sm:py-8 flex justify-center px-2 sm:px-0">
        {/* На мобильном масштабируем A4 чтобы влезал на экран */}
        <MobileScaledPreview docRef={docRef} calc={calc} />
      </div>

      {/* Версия для печати — без ref, html2pdf не должен её трогать */}
      <div className="hidden print:block">
        <KPTemplate calc={calc} />
      </div>

      {/* Скрытый немасштабированный экземпляр для генерации PDF.
          Вынесен за экран (не display:none — иначе html2canvas не отрендерит).
          Фикс перекосов PDF: PDF строится отсюда, а не из scale()-превью. */}
      <div
        aria-hidden="true"
        className="print-hidden"
        style={{ position: 'absolute', left: -99999, top: 0, width: 794, pointerEvents: 'none' }}
      >
        <div ref={pdfRef}>
          <KPTemplate calc={calc} />
        </div>
      </div>

    </div>
  );
}
