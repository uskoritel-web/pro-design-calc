// Главный роутер приложения + гейт авторизации команды
import { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import Calculator from './pages/Calculator';
import Settings from './pages/Settings';
import History from './pages/History';
import KP from './pages/KP';
import KPPublic from './pages/KPPublic';
import Guide from './pages/Guide';
import Login from './pages/Login';
import { checkAuth } from './utils/storage';
import './index.css';

// Выбор страницы по пути
function routePage(path) {
  if (path.startsWith('/settings'))  return <Settings />;
  if (path.startsWith('/history'))   return <History />;
  if (path.startsWith('/guide'))     return <Guide />;
  if (path.startsWith('/kp'))        return <KP />;
  if (path.startsWith('/app'))       return <Calculator />;
  return <Landing />;
}

export default function App() {
  const path = window.location.pathname;
  // Публичная страница КП для клиента — без авторизации
  const isPublic = path.startsWith('/kp-public');

  const [auth, setAuth] = useState(isPublic ? 'public' : 'checking'); // public | checking | authed | anon

  useEffect(() => {
    if (isPublic) return undefined;
    let alive = true;
    checkAuth().then((ok) => { if (alive) setAuth(ok ? 'authed' : 'anon'); });
    // Если сессия истекла во время работы — вернёмся к экрану входа
    const onUnauthorized = () => setAuth('anon');
    window.addEventListener('pdc-unauthorized', onUnauthorized);
    return () => { alive = false; window.removeEventListener('pdc-unauthorized', onUnauthorized); };
  }, [isPublic]);

  if (isPublic) return <KPPublic />;

  if (auth === 'checking') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <span className="inline-block w-8 h-8 border-4 border-white/20 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (auth === 'anon') return <Login onSuccess={() => setAuth('authed')} />;

  return routePage(path);
}
