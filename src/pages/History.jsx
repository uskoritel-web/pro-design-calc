// Страница «Проекты» — две вкладки: очередь на расчёт и готовые расчёты
import { useState, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { loadCalculations, deleteCalculation, loadProjects, saveProject, deleteProject } from '../utils/storage';
import { fmt } from '../utils/calculations';

// ─── Вспомогательные ────────────────────────────────────────────────────────

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

function formatDateShort(iso) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
}

// ─── Форма добавления/редактирования проекта ────────────────────────────────

function ProjectForm({ initial, onSave, onCancel }) {
  const [клиент, setКлиент]   = useState(initial?.клиент || '');
  const [объект, setОбъект]   = useState(initial?.объект || '');
  const [заметки, setЗаметки] = useState(initial?.заметки || '');
  const [ссылки, setCсылки]   = useState(initial?.ссылки || []);

  const addLink = () => setCсылки(s => [...s, { id: Date.now(), заголовок: '', url: '' }]);
  const updateLink = (id, field, val) => setCсылки(s => s.map(l => l.id === id ? { ...l, [field]: val } : l));
  const removeLink = (id) => setCсылки(s => s.filter(l => l.id !== id));

  const handleSave = () => {
    if (!клиент.trim() && !объект.trim()) return;
    onSave({
      id: initial?.id || Date.now().toString(),
      клиент: клиент.trim(),
      объект: объект.trim(),
      заметки: заметки.trim(),
      ссылки: ссылки.filter(l => l.url.trim()),
      createdAt: initial?.createdAt || new Date().toISOString(),
    });
  };

  const inputCls = "w-full bg-white/5 border border-white/15 hover:border-white/30 focus:border-brand-blue text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none transition-colors";

  return (
    <div className="bg-white/5 border border-brand-blue/30 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Клиент</label>
          <input value={клиент} onChange={e => setКлиент(e.target.value)} placeholder="Иванов И.И." className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Объект</label>
          <input value={объект} onChange={e => setОбъект(e.target.value)} placeholder="Кухня, ул. Ленина 5" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1.5">Заметки / пожелания заказчика</label>
        <textarea
          value={заметки}
          onChange={e => setЗаметки(e.target.value)}
          placeholder="Бюджет ~300к, хотят МДФ эмаль, угловая кухня, тёмные фасады..."
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1.5">Ссылки</label>
        <div className="space-y-2">
          {ссылки.map(link => (
            <div key={link.id} className="flex gap-2 items-center">
              <input
                value={link.заголовок}
                onChange={e => updateLink(link.id, 'заголовок', e.target.value)}
                placeholder="Название (напр. Дизайн-проект)"
                className="w-36 bg-white/5 border border-white/15 focus:border-brand-blue text-white placeholder-white/25 rounded-xl px-3 py-2.5 text-sm outline-none"
              />
              <input
                value={link.url}
                onChange={e => updateLink(link.id, 'url', e.target.value)}
                placeholder="https://... или ссылка на сообщение в ТГ"
                className="flex-1 bg-white/5 border border-white/15 focus:border-brand-blue text-white placeholder-white/25 rounded-xl px-3 py-2.5 text-sm outline-none"
              />
              <button onClick={() => removeLink(link.id)} className="text-white/30 hover:text-red-400 text-xl w-8 flex-shrink-0">×</button>
            </div>
          ))}
          <button onClick={addLink} className="text-brand-blue/70 hover:text-brand-blue text-sm transition-colors">
            + Добавить ссылку
          </button>
        </div>
        <p className="text-white/25 text-xs mt-1.5">
          Ссылки на Яндекс Диск, дизайн-проект, сообщения из Telegram-группы — всё подходит
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave}
          className="flex-1 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl text-sm transition-colors">
          {initial ? 'Сохранить' : 'Добавить проект'}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2.5 border border-white/15 text-white/50 hover:text-white rounded-xl text-sm transition-colors">
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Карточка проекта из очереди ─────────────────────────────────────────────

function ProjectCard({ project, onDelete, onEdit, onCreateTopic }) {
  const [expanded, setExpanded]   = useState(false);
  const [copied, setCopied]       = useState(false);
  const [creating, setCreating]   = useState(false);
  const hasDetails = project.заметки || (project.ссылки?.length > 0);

  const startCalcUrl = `/app?${new URLSearchParams({
    ...(project.клиент    ? { клиент:    project.клиент }    : {}),
    ...(project.объект    ? { объект:    project.объект }    : {}),
    ...(project.id        ? { projectId: project.id }        : {}),
  }).toString()}`;

  const handleCreateTopic = async () => {
    setCreating(true);
    await onCreateTopic(project);
    setCreating(false);
  };

  const handleCopyLinkCmd = async () => {
    await navigator.clipboard.writeText(`/link ${project.id.slice(-6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-4">

        {/* Заголовок */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold truncate">
              {project.клиент || project.объект || 'Без названия'}
            </h3>
            {project.клиент && project.объект && (
              <p className="text-white/40 text-sm truncate">{project.объект}</p>
            )}
            <p className="text-white/25 text-xs mt-1">{formatDateShort(project.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onEdit} className="text-white/30 hover:text-white/70 transition-colors text-sm px-2 py-1">✎</button>
            <button onClick={onDelete} className="text-white/20 hover:text-red-400 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
          </div>
        </div>

        {/* Статус темы Telegram */}
        <div className="mt-3">
          {project.threadId ? (
            <a
              href={project.topicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-green-400/80 hover:text-green-400 transition-colors"
            >
              ✅ Тема в Telegram — открыть ↗
            </a>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCreateTopic}
                disabled={creating}
                className="inline-flex items-center gap-1.5 text-xs bg-white/8 hover:bg-white/12 border border-white/15 hover:border-brand-blue/50 text-white/70 hover:text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              >
                {creating ? (
                  <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Создаём тему…</>
                ) : (
                  <>✈️ Создать тему в ТГ</>
                )}
              </button>
              <button
                onClick={handleCopyLinkCmd}
                title="Если тема уже создана вручную — вставьте эту команду в неё"
                className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  copied
                    ? 'border-green-500/40 text-green-400'
                    : 'border-white/10 text-white/30 hover:text-white/60 hover:border-white/20'
                }`}
              >
                {copied ? '✓ Скопировано' : '📋 Привязать вручную'}
              </button>
              {copied && (
                <span className="text-xs text-white/30">
                  Вставь <span className="text-white/50 font-mono">/link {project.id.slice(-6)}</span> в нужную тему
                </span>
              )}
            </div>
          )}
        </div>

        {/* Заметки превью */}
        {project.заметки && !expanded && (
          <p className="text-white/40 text-sm mt-2.5 line-clamp-2">{project.заметки}</p>
        )}

        {/* Развёрнутые детали */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {project.заметки && (
              <div>
                <div className="text-xs text-white/40 mb-1 font-medium">Заметки</div>
                <p className="text-white/70 text-sm whitespace-pre-wrap">{project.заметки}</p>
              </div>
            )}
            {project.ссылки?.length > 0 && (
              <div>
                <div className="text-xs text-white/40 mb-1.5 font-medium">Ссылки</div>
                <div className="space-y-1">
                  {project.ссылки.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-brand-blue hover:underline text-sm">
                      🔗 {link.заголовок || link.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Кнопки */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          {hasDetails && (
            <button onClick={() => setExpanded(e => !e)} className="text-white/40 hover:text-white/60 text-xs transition-colors">
              {expanded ? '↑ Свернуть' : '↓ Подробнее'}
            </button>
          )}
          <div className="flex-1" />
          <a href={startCalcUrl}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
            Начать расчёт →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Главный компонент ───────────────────────────────────────────────────────

export default function History() {
  const [tab, setTab]                 = useState('queue'); // 'queue' | 'done'
  const [calcs, setCalcs]             = useState([]);
  const [projects, setProjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editingProject, setEditing]  = useState(null);

  useEffect(() => {
    Promise.all([loadCalculations(), loadProjects()]).then(([c, p]) => {
      setCalcs(c);
      setProjects(p);
      setLoading(false);
    });
  }, []);

  // ── Telegram тема ──
  const handleCreateTopic = async (project) => {
    try {
      const resp = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_project', projectId: project.id, projectData: project }),
      });
      const data = await resp.json();
      if (data.ok && data.threadId) {
        setProjects(prev => prev.map(p =>
          p.id === project.id ? { ...p, threadId: data.threadId, topicUrl: data.topicUrl } : p
        ));
      } else {
        alert(`Не удалось создать тему: ${data.error || 'неизвестная ошибка'}\n\nПроверьте что бот добавлен в группу как администратор с правом управления темами.`);
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при создании темы. Попробуйте ещё раз.');
    }
  };

  // ── Проекты ──
  const handleSaveProject = async (project) => {
    await saveProject(project);
    setProjects(prev => {
      const exists = prev.find(p => p.id === project.id);
      return exists ? prev.map(p => p.id === project.id ? project : p) : [project, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Удалить этот проект?')) return;
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  // ── Расчёты ──
  const handleDeleteCalc = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Удалить этот расчёт?')) return;
    await deleteCalculation(id);
    setCalcs(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      <AppHeader />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Заголовок */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl sm:text-2xl font-black text-white">Проекты</h1>
          {tab === 'queue' && !showForm && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-colors text-sm"
            >
              + Добавить
            </button>
          )}
          {tab === 'done' && (
            <a href="/app" className="bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-colors text-sm">
              + Новый расчёт
            </a>
          )}
        </div>

        {/* Вкладки */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit mb-6">
          {[['queue', `Надо посчитать`, projects.length], ['done', 'Готовые расчёты', calcs.length]].map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setShowForm(false); setEditing(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                tab === key ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-white/20' : 'bg-white/10'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-24 text-white/40">Загрузка...</div>
        ) : (

          /* ── Вкладка «Надо посчитать» ── */
          tab === 'queue' ? (
            <div className="space-y-3">
              {showForm && (
                <ProjectForm
                  initial={editingProject}
                  onSave={handleSaveProject}
                  onCancel={() => { setShowForm(false); setEditing(null); }}
                />
              )}

              {projects.length === 0 && !showForm ? (
                <div className="text-center py-24">
                  <div className="text-5xl mb-4">📋</div>
                  <h2 className="text-xl font-bold text-white/60 mb-2">Очередь пуста</h2>
                  <p className="text-white/30 text-sm mb-6">Добавьте проект — и Антон сразу увидит что считать</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-brand-blue hover:underline text-sm"
                  >
                    + Добавить первый проект
                  </button>
                </div>
              ) : (
                projects.map(p => (
                  editingProject?.id === p.id ? (
                    <ProjectForm
                      key={p.id}
                      initial={p}
                      onSave={handleSaveProject}
                      onCancel={() => { setEditing(null); }}
                    />
                  ) : (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onDelete={() => handleDeleteProject(p.id)}
                      onEdit={() => { setEditing(p); setShowForm(false); }}
                      onCreateTopic={handleCreateTopic}
                    />
                  )
                ))
              )}
            </div>

          /* ── Вкладка «Готовые расчёты» ── */
          ) : (
            <div className="space-y-3">
              {calcs.length === 0 ? (
                <div className="text-center py-24">
                  <div className="text-5xl mb-4">🧮</div>
                  <h2 className="text-xl font-bold text-white/60 mb-2">Расчётов пока нет</h2>
                  <p className="text-white/30 text-sm mb-6">Сохраните первый расчёт в калькуляторе</p>
                  <a href="/app" className="text-brand-blue hover:underline text-sm">Открыть калькулятор →</a>
                </div>
              ) : calcs.map(calc => (
                <div
                  key={calc.id}
                  onClick={() => window.location.href = `/kp?id=${calc.id}`}
                  className="bg-white/5 border border-white/10 hover:border-brand-blue/50 hover:bg-white/8 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold truncate">{calc.клиент || calc.объект || 'Без названия'}</h3>
                      {calc.клиент && calc.объект && <p className="text-white/40 text-sm truncate">{calc.объект}</p>}
                      <p className="text-white/30 text-xs mt-1">{formatDate(calc.createdAt)}</p>
                      {calc.last_notified_at && (
                        <p className="text-brand-blue/70 text-xs mt-0.5">
                          Клиент открывал — {formatDateShort(calc.last_notified_at)}
                        </p>
                      )}
                      {calc.confirmed_at && (
                        <p className="text-green-400/80 text-xs mt-0.5">
                          ✅ Подтверждён — {formatDateShort(calc.confirmed_at)}
                        </p>
                      )}
                      {calc.feedback && (
                        <p className="text-purple-400/80 text-xs mt-0.5">
                          💬 {[
                            { ok: '✅', bit: '😐', high: '😟' }[calc.feedback.цена],
                            { complete: '✅', adjust: '✏️', missing: '🤔' }[calc.feedback.состав],
                            { ready: '🤝', think: '⏳', looking: '🔍' }[calc.feedback.шаг],
                          ].filter(Boolean).join(' · ')} Оставил отзыв
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-white font-black text-lg sm:text-xl">
                          {calc.result ? fmt(calc.result.итогоКлиент ?? calc.result.итогоСНаценкой) : '—'}
                        </div>
                        {calc.result?.маржа != null && (
                          <div className={`text-xs mt-0.5 ${calc.result.маржа >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            маржа {calc.result.маржаПроцент}%
                          </div>
                        )}
                      </div>
                      <button
                        onClick={e => handleDeleteCalc(e, calc.id)}
                        className="text-white/20 hover:text-red-400 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {calc.result && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <div className="flex gap-3 text-xs text-white/40 flex-wrap">
                        {calc.result.листы > 0 && <span>Корпуса: {calc.result.листы} л.</span>}
                        {calc.result.фасады > 0 && <span>Фасады: {fmt(calc.result.фасады)}</span>}
                        {calc.result.монтаж > 0 && <span>Монтаж: {fmt(calc.result.монтаж)}</span>}
                      </div>
                      <span className="text-brand-blue text-xs font-semibold flex-shrink-0 ml-3">Открыть →</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
