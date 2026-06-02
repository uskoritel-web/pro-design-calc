// Лендинг-страница для мотивации команды
import { useState } from 'react';

function IconClock() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/>
    </svg>
  );
}

function IconDocument() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0121 9.414V19a2 2 0 01-2 2z"/>
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-brand-blue rounded-lg p-1.5 flex items-center justify-center">
        <span className="text-white font-black text-xs leading-none px-1">ПРО</span>
      </div>
      <div>
        <div className="text-white font-black text-base sm:text-xl leading-none tracking-tight">Дизайн</div>
        <div className="text-white/50 text-xs font-medium tracking-wider uppercase hidden sm:block">Ремонт и комплектация</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, accent }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5 ${accent}`}>
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-white mb-3 leading-tight">{title}</h3>
      <p className="text-white/60 leading-relaxed text-sm sm:text-base">{description}</p>
    </div>
  );
}

const APK_URL = 'https://github.com/valentintarasenko-del/pro-design-calc/releases/latest/download/Mebel-ProDesign.apk';

// Модальное окно инструкции для Android
function AndroidModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1A1A2E] border border-white/20 rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-2xl mb-3 text-center">🤖</div>
        <h3 className="text-white font-bold text-lg text-center mb-1">Установка на Android</h3>
        <p className="text-white/40 text-xs text-center mb-4">Это не Play Market — устанавливается как APK-файл</p>

        <ol className="space-y-3 text-sm text-white/70 mb-5">
          <li className="flex gap-3">
            <span className="bg-brand-blue/30 text-brand-blue font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span>
            Нажмите <strong className="text-white">«Скачать APK»</strong> ниже — файл загрузится на телефон
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-blue/30 text-brand-blue font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span>
            Откройте файл из уведомлений или папки <strong className="text-white">«Загрузки»</strong>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-blue/30 text-brand-blue font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span>
            Если появится предупреждение — нажмите <strong className="text-white">«Установить всё равно»</strong> (это безопасно, приложение наше)
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-blue/30 text-brand-blue font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">4</span>
            Найдите иконку <strong className="text-white">«Считаем мебель»</strong> на рабочем столе и запустите
          </li>
        </ol>

        <a
          href={APK_URL}
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full bg-brand-blue hover:bg-brand-blue/90 text-white font-bold py-3 rounded-xl text-sm mb-2"
        >
          ⬇ Скачать APK
        </a>
        <button
          onClick={onClose}
          className="w-full text-white/40 hover:text-white/60 py-2 text-sm transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

// Модальное окно инструкции по установке iPhone
function IphoneModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1A1A2E] border border-white/20 rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-2xl mb-3 text-center">🍎</div>
        <h3 className="text-white font-bold text-lg text-center mb-4">Установка на iPhone</h3>
        <ol className="space-y-3 text-sm text-white/70">
          <li className="flex gap-3">
            <span className="bg-brand-blue/30 text-brand-blue font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span>
            Откройте сайт в браузере <strong className="text-white">Safari</strong>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-blue/30 text-brand-blue font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span>
            Нажмите кнопку <strong className="text-white">«Поделиться»</strong> внизу экрана (квадрат со стрелкой вверх)
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-blue/30 text-brand-blue font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span>
            Выберите <strong className="text-white">«На экран «Домой»»</strong>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-blue/30 text-brand-blue font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">4</span>
            Нажмите <strong className="text-white">«Добавить»</strong> — появится иконка на рабочем столе
          </li>
        </ol>
        <button
          onClick={onClose}
          className="mt-5 w-full bg-brand-blue text-white font-semibold py-3 rounded-xl text-sm"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}

function AppScreenshot() {
  return (
    <div className="relative mx-auto max-w-2xl">
      <div className="absolute inset-0 bg-brand-blue/20 blur-3xl rounded-full scale-75" />
      <div className="relative bg-[#0F0F1A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-white/5 px-4 py-3 flex items-center gap-2 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
            <div className="w-3 h-3 rounded-full bg-green-400/60" />
          </div>
          <div className="flex-1 bg-white/5 rounded-md px-3 py-1 text-white/30 text-xs text-center">
            pro-design-calc.vercel.app
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-white/20 rounded w-32" />
            <div className="h-8 bg-brand-blue/60 rounded-lg w-28" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Нижняя база', 'Верхняя база', 'Пеналы', 'Фасады — МДФ'].map((label, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3">
                <div className="text-white/40 text-xs mb-2">{label}</div>
                <div className="h-3 bg-white/15 rounded w-3/4" />
              </div>
            ))}
          </div>
          <div className="bg-brand-blue/20 border border-brand-blue/40 rounded-xl p-4 flex justify-between items-center">
            <span className="text-white/70 text-sm">Итого к расчёту</span>
            <span className="text-white font-bold text-lg">347 500 ₽</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [showIphone, setShowIphone] = useState(false);
  const [showAndroid, setShowAndroid] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900">
      {showAndroid && <AndroidModal onClose={() => setShowAndroid(false)} />}
      {showIphone && <IphoneModal onClose={() => setShowIphone(false)} />}

      {/* Навигация */}
      <nav className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-40 bg-gray-900/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <a
            href="/app"
            className="bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-colors text-xs sm:text-sm whitespace-nowrap"
          >
            <span className="hidden sm:inline">Открыть приложение →</span>
            <span className="sm:hidden">Открыть →</span>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-12 sm:pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-blue/15 border border-brand-blue/30 rounded-full px-4 py-2 text-sm text-brand-blue mb-6 sm:mb-8 font-medium">
          <span className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" />
          Сервис для команды ПроДизайн
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-4 sm:mb-6 tracking-tight">
          ПроДизайн —<br />
          <span className="text-brand-blue">считаем мебель</span>
        </h1>

        <p className="text-base sm:text-xl text-white/60 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          Забудьте про ручной расчёт в Excel и часы за сметой.
          Вводите размеры — получаете красивое КП для клиента.
        </p>

        {/* Основная кнопка */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <a
            href="/app"
            className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-base sm:text-lg"
          >
            Открыть веб-приложение
          </a>
          <a
            href="#features"
            className="border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-semibold px-8 py-4 rounded-2xl transition-colors text-base sm:text-lg"
          >
            Узнать подробнее
          </a>
        </div>

        {/* ── Установить как приложение ── */}
        <div className="max-w-lg mx-auto">
          <p className="text-white/30 text-xs uppercase tracking-wider mb-3 font-medium">
            Установить как приложение
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Компьютер */}
            <a
              href="/app"
              className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-2xl px-3 py-4 transition-all"
            >
              <span className="text-2xl">🖥</span>
              <span className="text-white font-semibold text-xs sm:text-sm">Компьютер</span>
              <span className="text-white/40 text-xs text-center leading-tight">Открыть в браузере</span>
            </a>

            {/* Android */}
            <button
              onClick={() => setShowAndroid(true)}
              className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-2xl px-3 py-4 transition-all w-full"
            >
              <span className="text-2xl">🤖</span>
              <span className="text-white font-semibold text-xs sm:text-sm">Android</span>
              <span className="text-white/40 text-xs text-center leading-tight">Скачать APK</span>
            </button>

            {/* iPhone */}
            <button
              onClick={() => setShowIphone(true)}
              className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-2xl px-3 py-4 transition-all w-full"
            >
              <span className="text-2xl">🍎</span>
              <span className="text-white font-semibold text-xs sm:text-sm">iPhone</span>
              <span className="text-white/40 text-xs text-center leading-tight">Добавить через Safari</span>
            </button>
          </div>
        </div>

        {/* Скриншот */}
        <div className="mt-12 sm:mt-16">
          <AppScreenshot />
        </div>
      </section>

      {/* Три преимущества */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">
            Почему это важно для нас
          </h2>
          <p className="text-white/50 text-base sm:text-lg">Три причины начать пользоваться прямо сейчас</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          <FeatureCard
            icon={<IconClock />}
            accent="bg-brand-blue/20 text-brand-blue"
            title="Считаем кухню за 3 минуты вместо часа"
            description="Больше не нужно сидеть с калькулятором. Вводите метры — приложение считает листы ЛДСП, фасады, монтаж само."
          />
          <FeatureCard
            icon={<IconDocument />}
            accent="bg-brand-orange/20 text-brand-orange"
            title="Красивое КП клиенту в один клик"
            description="Никаких таблиц Excel. Клиент получает профессиональное PDF с логотипом, фото объекта и понятным описанием."
          />
          <FeatureCard
            icon={<IconChart />}
            accent="bg-green-500/20 text-green-400"
            title="Видите маржу по каждому заказу"
            description="Сразу видно: сколько стоит нам, сколько клиенту, и сколько зарабатываем. Больше осознанных решений."
          />
        </div>
      </section>

      {/* Как работает */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-10 md:p-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">Как это работает</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Вводите размеры', desc: 'Длина баз, пеналы, материал фасадов' },
              { step: '02', title: 'Приложение считает', desc: 'Листы ЛДСП, фасады, монтаж — автоматически' },
              { step: '03', title: 'Проверяете итог', desc: 'Видите смету, маржу, корректируете цену' },
              { step: '04', title: 'Отправляете КП', desc: 'Скачиваете PDF и отправляете клиенту' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-blue/20 border border-brand-blue/30 rounded-2xl flex items-center justify-center text-brand-blue font-black text-xs sm:text-sm mx-auto mb-3">
                  {step}
                </div>
                <h3 className="text-white font-bold mb-1 text-sm sm:text-base">{title}</h3>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="bg-gradient-to-br from-brand-blue/20 to-brand-blue/5 border border-brand-blue/30 rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">Готовы попробовать?</h2>
          <p className="text-white/60 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Откройте приложение и сделайте первый расчёт прямо сейчас. Без регистрации.
          </p>
          <a
            href="/app"
            className="inline-block bg-brand-blue hover:bg-brand-blue/90 text-white font-bold px-8 sm:px-10 py-4 rounded-2xl transition-colors text-base sm:text-lg"
          >
            Открыть приложение →
          </a>
        </div>
      </section>

      {/* Футер */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-white/30 text-sm text-center">
            Внутренний сервис компании ПроДизайн · Ремонт и комплектация
          </p>
          <div className="flex gap-4 text-white/30 text-sm">
            <a href="https://pro-design-ekb.ru" target="_blank" rel="noreferrer" className="hover:text-white/60 transition-colors">
              pro-design-ekb.ru
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
