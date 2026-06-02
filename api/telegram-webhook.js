// Telegram Bot Webhook — обрабатывает команды из группы
// Команда /link [N] в теме → привязывает тему к проекту
// Регистрация: открыть в браузере один раз:
// https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://pro-design-calc.vercel.app/api/telegram-webhook

async function reply(token, chatId, threadId, text) {
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_thread_id: threadId, text, parse_mode: 'HTML' }),
  });
}

export default async function handler(req, res) {
  // Telegram отправляет POST-запросы на этот эндпоинт
  if (req.method !== 'POST') return res.status(200).end();

  const update  = req.body;
  const message = update?.message;
  if (!message?.text) return res.status(200).end();

  const text     = message.text.trim();
  const threadId = message.message_thread_id;
  const chatId   = message.chat?.id;

  // Обрабатываем только команды /link внутри тем (threadId обязателен)
  if (!text.startsWith('/link') || !threadId) return res.status(200).end();

  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const SB_URL   = process.env.VITE_SUPABASE_URL;
  const SB_KEY   = process.env.VITE_SUPABASE_KEY;
  const sbH      = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

  // Загружаем все проекты
  const resp = await fetch(`${SB_URL}/rest/v1/projects?select=id,data&order=created_at.desc`, { headers: sbH });
  const rows = await resp.json();

  const parts = text.split(/\s+/);
  const arg   = parts[1]; // число или код

  // /link без аргумента → показываем список непривязанных проектов
  if (!arg) {
    const unlinked = rows.filter(r => !r.data.threadId);
    if (unlinked.length === 0) {
      await reply(TG_TOKEN, chatId, threadId, 'Все проекты уже привязаны к темам ✅');
      return res.status(200).end();
    }
    const list = unlinked
      .map((r, i) => `${i + 1}. <b>${r.data.клиент || r.data.объект || 'Без названия'}</b>${r.data.объект && r.data.клиент ? ` — ${r.data.объект}` : ''}`)
      .join('\n');
    await reply(TG_TOKEN, chatId, threadId,
      `Выберите проект для привязки к этой теме:\n\n${list}\n\nОтветьте: <code>/link 1</code>, <code>/link 2</code> и т.д.`
    );
    return res.status(200).end();
  }

  // /link N → привязываем по номеру из списка непривязанных
  let targetRow = null;
  const num = parseInt(arg, 10);
  if (!isNaN(num) && num > 0) {
    const unlinked = rows.filter(r => !r.data.threadId);
    targetRow = unlinked[num - 1];
  }

  if (!targetRow) {
    await reply(TG_TOKEN, chatId, threadId,
      `Проект №${arg} не найден.\nНапишите <code>/link</code> чтобы увидеть список.`
    );
    return res.status(200).end();
  }

  if (targetRow.data.threadId) {
    await reply(TG_TOKEN, chatId, threadId, `ℹ️ Этот проект уже привязан к другой теме.`);
    return res.status(200).end();
  }

  // Вычисляем URL темы
  const absoluteId = String(chatId).replace(/^-100/, '');
  const topicUrl   = `https://t.me/c/${absoluteId}/${threadId}`;

  // Сохраняем в Supabase
  const updated = { ...targetRow.data, threadId, topicUrl };
  await fetch(`${SB_URL}/rest/v1/projects?id=eq.${encodeURIComponent(targetRow.id)}`, {
    method: 'PATCH',
    headers: { ...sbH, Prefer: 'return=minimal' },
    body: JSON.stringify({ data: updated }),
  });

  const name = targetRow.data.клиент || targetRow.data.объект || 'Без названия';
  const obj  = targetRow.data.клиент && targetRow.data.объект ? ` — ${targetRow.data.объект}` : '';
  await reply(TG_TOKEN, chatId, threadId,
    `✅ Тема привязана к проекту: <b>${name}${obj}</b>\n\nТеперь уведомления по этому проекту будут приходить сюда.`
  );

  return res.status(200).end();
}
