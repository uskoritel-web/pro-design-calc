// Шапка приложения с навигацией (используется на всех страницах кроме лендинга)
import { useState } from 'react';
import HelpPanel from './HelpPanel';

function Logo() {
  return (
    <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
      <img
        src="/Лого SVG/основная версия лого белый.svg"
        alt="ПроДизайн"
        className="h-8 sm:h-10 w-auto"
      />
    </a>
  );
}

// Ссылка навигации с подсветкой активной страницы
function NavLink({ href, children, icon }) {
  const active = window.location.pathname === href;
  return (
    <a
      href={href}
      className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-0 text-xs sm:text-sm font-medium
        px-3 sm:px-3 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      {/* Иконка на мобильном */}
      <span className="text-base sm:hidden">{icon}</span>
      <span>{children}</span>
    </a>
  );
}

export default function AppHeader() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className="border-b border-white/10 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo />

          <nav className="flex items-center gap-0 sm:gap-1">
            <NavLink href="/app" icon="🧮">Расчёт</NavLink>
            <NavLink href="/history" icon="📁">Проекты</NavLink>
            <NavLink href="/settings" icon="⚙️">Настройки</NavLink>
            <NavLink href="/guide" icon="📖">Гайд</NavLink>

            {/* Кнопка справки */}
            <button
              onClick={() => setShowHelp(true)}
              className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 transition-colors text-lg font-bold"
              title="Что делать на этой странице?"
            >
              ?
            </button>
          </nav>
        </div>
      </header>

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
    </>
  );
}
