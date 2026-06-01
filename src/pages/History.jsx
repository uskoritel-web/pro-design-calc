// Страница истории расчётов
import { useState, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { loadCalculations, deleteCalculation } from '../utils/storage';
import { fmt } from '../utils/calculations';

export default function History() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalculations().then(data => {
      setList(data);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Удалить этот расчёт?')) return;
    await deleteCalculation(id);
    setList(prev => prev.filter(c => c.id !== id));
  };

  const handleOpen = (id) => {
    window.location.href = `/kp?id=${id}`;
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return '—'; }
  };

  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      <AppHeader />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white mb-1">История расчётов</h1>
            <p className="text-white/40 text-sm">{list.length} расчётов сохранено</p>
          </div>
          <a
            href="/app"
            className="bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-colors text-sm"
          >
            + Новый
          </a>
        </div>

        {loading ? (
          <div className="text-center py-24 text-white/40">Загрузка...</div>
        ) : list.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-white/60 mb-2">Расчётов пока нет</h2>
            <p className="text-white/30 text-sm mb-6">Сохраните первый расчёт в калькуляторе</p>
            <a href="/app" className="text-brand-blue hover:underline text-sm">Открыть калькулятор →</a>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(calc => (
              <div
                key={calc.id}
                onClick={() => handleOpen(calc.id)}
                className="bg-white/5 border border-white/10 active:border-brand-blue/50 active:bg-white/8
                  hover:border-brand-blue/50 hover:bg-white/8
                  rounded-2xl px-4 sm:px-6 py-4 sm:py-5 transition-all cursor-pointer"
              >
                {/* Верхняя строка: название + сумма + удалить */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="text-white font-bold truncate">
                        {calc.клиент || calc.объект || 'Без названия'}
                      </h3>
                    </div>
                    {calc.клиент && calc.объект && (
                      <p className="text-white/40 text-sm truncate">{calc.объект}</p>
                    )}
                    <p className="text-white/30 text-xs mt-1">{formatDate(calc.createdAt)}</p>
                    {calc.last_notified_at && (
                      <p className="text-brand-blue/70 text-xs mt-0.5">
                        Клиент открывал — {new Date(calc.last_notified_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    )}
                    {calc.confirmed_at && (
                      <p className="text-green-400/80 text-xs mt-0.5">
                        ✅ Подтверждён — {new Date(calc.confirmed_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    )}
                    {calc.feedback && (
                      <p className="text-purple-400/80 text-xs mt-0.5">
                        💬 {[
                          { ok:'✅', bit:'😐', high:'😟' }[calc.feedback.цена],
                          { complete:'✅', adjust:'✏️', missing:'🤔' }[calc.feedback.состав],
                          { ready:'🤝', think:'⏳', looking:'🔍' }[calc.feedback.шаг],
                        ].filter(Boolean).join(' · ')} Оставил отзыв
                      </p>
                    )}
                  </div>

                  {/* Сумма + удалить */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-white font-black text-lg sm:text-xl">
                        {calc.result ? fmt(calc.result.итогоКлиент ?? calc.result.итогоСНаценкой) : '—'}
                      </div>
                      {calc.result?.маржа !== null && calc.result?.маржа !== undefined && (
                        <div className={`text-xs mt-0.5 ${calc.result.маржа >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          маржа {calc.result.маржаПроцент}%
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, calc.id)}
                      className="text-white/20 hover:text-red-400 active:text-red-400 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
                      title="Удалить"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Краткая разбивка + кнопка открыть */}
                {calc.result && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex gap-3 text-xs text-white/40 flex-wrap">
                      {calc.result.листы > 0 && <span>Корпуса: {calc.result.листы} л.</span>}
                      {calc.result.фасады > 0 && <span>Фасады: {fmt(calc.result.фасады)}</span>}
                      {calc.result.монтаж > 0 && <span>Монтаж: {fmt(calc.result.монтаж)}</span>}
                    </div>
                    <span className="text-brand-blue text-xs font-semibold flex-shrink-0 ml-3">
                      Открыть →
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
