// Шапка приложения с навигацией (используется на всех страницах кроме лендинга)

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <div className="bg-brand-blue rounded-lg p-1.5 flex items-center justify-center">
        <span className="text-white font-black text-xs leading-none px-1">ПРО</span>
      </div>
      <div>
        <div className="text-white font-black text-sm sm:text-base leading-none tracking-tight">Дизайн</div>
        <div className="text-white/40 text-xs font-medium hidden sm:block">считаем мебель</div>
      </div>
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
  return (
    <header className="border-b border-white/10 bg-[#0D0D1A]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Logo />

        <nav className="flex items-center gap-0 sm:gap-1">
          <NavLink href="/app" icon="🧮">Расчёт</NavLink>
          <NavLink href="/history" icon="📁">Проекты</NavLink>
          <NavLink href="/settings" icon="⚙️">Настройки</NavLink>
        </nav>
      </div>
    </header>
  );
}
