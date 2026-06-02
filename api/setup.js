// Одноразовая настройка бота: регистрирует вебхук и команды-кнопки.
// Открыть в браузере один раз: https://pro-design-calc.vercel.app/api/setup
export default async function handler(req, res) {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const BASE  = 'https://pro-design-calc.vercel.app';
  if (!TOKEN) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });

  const tg = (method, body) => fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

  const [webhook, commands] = await Promise.all([
    tg('setWebhook', { url: `${BASE}/api/telegram-webhook`, drop_pending_updates: true }),
    tg('setMyCommands', {
      commands: [
        { command: 'status', description: 'Статус проекта и расчётов этой темы' },
        { command: 'link',   description: 'Привязать тему к проекту' },
      ],
    }),
  ]);

  return res.status(200).json({ webhook, commands });
}
