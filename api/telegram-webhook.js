// Telegram Bot Webhook
// Команда /link в теме → бот показывает кнопки с названиями проектов → нажатие → привязка

async function tgPost(path, token, body) {
  return fetch(`https://api.telegram.org/bot${token}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();

  const update = req.body;
  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const SB_URL   = process.env.VITE_SUPABASE_URL;
  const SB_KEY   = process.env.VITE_SUPABASE_KEY;
  const sbH      = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

  // ── Нажатие на inline-кнопку ─────────────────────────────────────────────
  if (update.callback_query) {
    const query    = update.callback_query;
    const data     = query.data || '';
    const threadId = query.message?.message_thread_id;
    const chatId   = query.message?.chat?.id;
    const msgId    = query.message?.message_id;

    // Сообщаем Telegram что обработали нажатие (убирает "крутилку" на кнопке)
    await tgPost('answerCallbackQuery', TG_TOKEN, { callback_query_id: query.id });

    if (data.startsWith('link:')) {
      const projectId = data.slice(5);

      const resp = await fetch(
        `${SB_URL}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=id,data`,
        { headers: sbH }
      );
      const rows = await resp.json();

      if (!rows?.length) {
        await tgPost('editMessageText', TG_TOKEN, {
          chat_id: chatId, message_id: msgId,
          text: '❌ Проект не найден — возможно, он был удалён.',
        });
        return res.status(200).end();
      }

      const project = rows[0].data;
      const absoluteId = String(chatId).replace(/^-100/, '');
      const topicUrl   = `https://t.me/c/${absoluteId}/${threadId}`;
      const updated    = { ...project, threadId, topicUrl };

      await fetch(`${SB_URL}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        headers: { ...sbH, Prefer: 'return=minimal' },
        body: JSON.stringify({ data: updated }),
      });

      const name = [project.клиент, project.объект].filter(Boolean).join(' — ') || 'Без названия';

      // Редактируем сообщение — убираем кнопки, показываем подтверждение
      await tgPost('editMessageText', TG_TOKEN, {
        chat_id: chatId,
        message_id: msgId,
        text: `✅ <b>Тема привязана к проекту:</b>\n${name}\n\nТеперь уведомления по этому проекту будут появляться здесь.`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] },
      });
    }

    return res.status(200).end();
  }

  // ── Текстовые команды ─────────────────────────────────────────────────────
  const message  = update?.message;
  if (!message?.text) return res.status(200).end();

  const text     = message.text.trim();
  const threadId = message.message_thread_id;
  const chatId   = message.chat?.id;

  // Обрабатываем только команды /link внутри тем
  if (!text.startsWith('/link') || !threadId) return res.status(200).end();

  // Загружаем непривязанные проекты
  const resp  = await fetch(`${SB_URL}/rest/v1/projects?select=id,data&order=created_at.desc`, { headers: sbH });
  const rows  = await resp.json();
  const all      = rows || [];
  const unlinked = all.filter(r => !r.data?.threadId);

  if (unlinked.length === 0) {
    const SITE = 'https://pro-design-calc.vercel.app';
    const text = all.length === 0
      ? `На сайте ещё нет ни одного проекта.\n\nЧтобы привязать эту тему:\n1. Откройте <a href="${SITE}/history">Проекты</a> на сайте\n2. Нажмите «+ Добавить» и заполните карточку\n3. В разделе «Тема в Telegram» выберите «Тема уже есть»\n4. Вернитесь сюда и напишите /link — появятся кнопки с проектами`
      : `Все проекты уже привязаны к темам ✅\n\nЕсли нужно добавить новый — сначала создайте карточку на сайте.`;
    await tgPost('sendMessage', TG_TOKEN, {
      chat_id: chatId, message_thread_id: threadId,
      text, parse_mode: 'HTML', disable_web_page_preview: true,
    });
    return res.status(200).end();
  }

  // Строим кнопки: каждый проект — отдельная кнопка с именем
  const buttons = unlinked.slice(0, 10).map(r => {
    const label = [r.data.клиент, r.data.объект].filter(Boolean).join(' — ') || 'Без названия';
    return [{ text: label, callback_data: `link:${r.id}` }];
  });

  await tgPost('sendMessage', TG_TOKEN, {
    chat_id: chatId,
    message_thread_id: threadId,
    text: 'Выберите проект для привязки к этой теме:',
    reply_markup: { inline_keyboard: buttons },
  });

  return res.status(200).end();
}
