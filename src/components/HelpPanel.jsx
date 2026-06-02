// Панель справки — открывается кнопкой «?» в шапке
import { getTips } from '../utils/hints';

export default function HelpPanel({ onClose }) {
  const tips = getTips(window.location.pathname);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 pt-20 overflow-auto" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>

        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Что делать на этой странице?</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Список советов */}
        <div className="p-6 space-y-4">
          {tips.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Нет специальных подсказок для этой страницы</p>
          ) : (
            tips.map((tip, i) => (
              <div key={i} className="flex gap-3 items-start p-4 bg-gray-900/40 rounded-xl border border-gray-700/50">
                <span className="text-2xl flex-shrink-0">{tip.icon}</span>
                <p className="text-gray-200 text-sm leading-relaxed">{tip.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Футер */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-between items-center">
          <a href="/settings" className="text-sm text-blue-400 hover:text-blue-300">Настройки и прайс →</a>
          <button onClick={onClose} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
