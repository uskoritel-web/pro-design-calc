// Экран входа для команды (общий пароль).
import { useState } from 'react';
import { login } from '../utils/storage';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(false);
    try {
      const ok = await login(password);
      if (ok) {
        onSuccess();
      } else {
        setError(true);
        setPassword('');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🪚</div>
          <h1 className="text-2xl font-black text-white mb-1">Мебель ПроДизайн</h1>
          <p className="text-white/40 text-sm">Вход для команды</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              autoFocus
              placeholder="Введите пароль"
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors ${
                error ? 'border-red-500/60' : 'border-white/15 focus:border-brand-blue'
              }`}
            />
            {error && <div className="text-red-400 text-xs mt-1.5">Неверный пароль</div>}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Проверяем…</>
              : 'Войти'}
          </button>
        </div>
      </form>
    </div>
  );
}
