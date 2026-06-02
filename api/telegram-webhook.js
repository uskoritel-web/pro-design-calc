// Telegram Bot Webhook
// /link  — показывает кнопки с проектами для привязки темы
// /status — статус проекта и расчётов этой темы

const SITE = 'https://pro-design-calc.vercel.app';

async function tgPost(path, token, body) {
  return fetch(`https://api.telegram.org/bot${token}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('ru-RU'); } catch { return '—'; }
}

function fmtMoney(n) {
  return n ? `${Math.round(n).toLocaleString('ru-RU')} ₽` : '—';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();

  const update   = req.body;
  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const SB_URL   = process.env.VITE_SUPABASE_URL;
  const SB_KEY   = process.env.VITE_SUPABASE_KEY;
  const sbH      = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

  // ── Нажатие inline-кнопки (/link flow) ──────────────────────────────────
  if (update.callback_query) {
    const query    = update.callback_query;
    const data     = query.data || '';
    const threadId = query.message?.message_thread_id;
    const chatId   = query.message?.chat?.id;
    const msgId    = query.message?.message_id;

    await tgPost('answerCallbackQuery', TG_TOKEN, { callback_query_id: query.id });

    if (data.startsWith('link:')) {
      const projectId = data.slice(5);
      const resp      = await fetch(`${SB_URL}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=id,data`, { headers: sbH });
      const rows      = await resp.json();

      if (!rows?.length) {
        await tgPost('editMessageText', TG_TOKEN, { chat_id: chatId, message_id: msgId, text: '❌ Проект не найден — возможно, удалён.' });
        return res.status(200).end();
      }

      const project    = rows[0].data;
      const absoluteId = String(chatId).replace(/^-100/, '');
      const topicUrl   = `https://t.me/c/${absoluteId}/${threadId}`;
      const updated    = { ...project, threadId, topicUrl };

      await fetch(`${SB_URL}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`, {
        method: 'PATCH', headers: { ...sbH, Prefer: 'return=minimal' },
        body: JSON.stringify({ data: updated }),
      });

      const name = [project.клиент, project.объект].filter(Boolean).join(' — ') || 'Без названия';
      await tgPost('editMessageText', TG_TOKEN, {
        chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
        text: `✅ <b>Тема привязана к проекту:</b>\n${name}${project.номер ? ' · ' + project.номер : ''}\n\nТеперь пишите /status чтобы узнать статус.`,
        reply_markup: { inline_keyboard: [] },
      });
    }

    return res.status(200).end();
  }

  // ── Текстовые команды ────────────────────────────────────────────────────
  const message  = update?.message;
  if (!message?.text) return res.status(200).end();

  const text     = message.text.trim();
  const threadId = message.message_thread_id;
  const chatId   = message.chat?.id;

  const send = (msg) => tgPost('sendMessage', TG_TOKEN, {
    chat_id: chatId, message_thread_id: threadId,
    text: msg, parse_mode: 'HTML', disable_web_page_preview: true,
  });

  // ── /status — статус проекта этой темы ──────────────────────────────────
  if (text.startsWith('/status')) {
    if (!threadId) {
      await send('Команда /status работает только внутри тем групп.');
      return res.status(200).end();
    }

    // Находим проект по threadId
    const projResp = await fetch(`${SB_URL}/rest/v1/projects?select=id,data&order=created_at.desc`, { headers: sbH });
    const projRows = await projResp.json() || [];
    const projRow  = projRows.find(r => String(r.data?.threadId) === String(threadId));

    if (!projRow) {
      await send(`Эта тема не привязана ни к одному проекту.\n\nНапишите /link — выберите проект из кнопок.`);
      return res.status(200).end();
    }

    const p    = projRow.data;
    const name = [p.клиент, p.объект].filter(Boolean).join(' — ') || 'Без названия';
    const lines = [];

    // Заголовок
    lines.push(`📋 <b>${name}${p.номер ? ' · ' + p.номер : ''}</b>`);
    if (p.заметки) {
      const notes = p.заметки.length > 200 ? p.заметки.slice(0, 200) + '…' : p.заметки;
      lines.push(`💬 ${notes}`);
    }
    lines.push('');

    // Расчёты
    const calcResp = await fetch(`${SB_URL}/rest/v1/calculations?select=id,data,created_at&order=created_at.desc&limit=100`, { headers: sbH });
    const allCalcs = (await calcResp.json() || []).filter(c => c.data?.projectId === projRow.id);

    if (allCalcs.length === 0) {
      lines.push('🧮 Расчётов ещё нет');
      const calcUrl = `${SITE}/app?projectId=${projRow.id}${p.клиент ? '&клиент=' + encodeURIComponent(p.клиент) : ''}${p.объект ? '&объект=' + encodeURIComponent(p.объект) : ''}`;
      lines.push(`👉 <a href="${calcUrl}">Создать первый расчёт</a>`);
    } else {
      lines.push(`🧮 Расчётов: <b>${allCalcs.length}</b>`);
      // Показываем последние 3
      for (const cr of allCalcs.slice(0, 3)) {
        const c   = cr.data;
        const sum = fmtMoney(c.result?.итогоКлиент ?? c.result?.итогоСНаценкой);
        lines.push(`\n• <b>${sum}</b> от ${fmtDate(c.createdAt)}`);
        if (c.last_notified_at) lines.push(`  👀 Клиент открывал ${fmtDate(c.last_notified_at)}`);
        else                    lines.push(`  📨 Клиент ещё не открывал`);
        if (c.confirmed_at)     lines.push(`  ✅ Подтвердил ${fmtDate(c.confirmed_at)}`);
        if (c.feedback)         lines.push(`  💬 Оставил отзыв`);
        lines.push(`  🔗 <a href="${SITE}/kp?id=${cr.id}">Открыть расчёт</a>`);
      }
      if (allCalcs.length > 3) lines.push(`\n  … ещё ${allCalcs.length - 3}`);
    }

    // Ссылки проекта
    if (p.ссылки?.length) {
      lines.push('');
      p.ссылки.forEach(l => lines.push(`🔗 <a href="${l.url}">${l.заголовок || 'Ссылка'}</a>`));
    }

    await send(lines.join('\n'));
    return res.status(200).end();
  }

  // ── /link — показывает кнопки с проектами для привязки ──────────────────
  if (text.startsWith('/link')) {
    if (!threadId) {
      await send('Команда /link работает только внутри тем групп.');
      return res.status(200).end();
    }

    const resp     = await fetch(`${SB_URL}/rest/v1/projects?select=id,data&order=created_at.desc`, { headers: sbH });
    const all      = resp.ok ? (await resp.json() || []) : [];
    const unlinked = all.filter(r => !r.data?.threadId);

    if (unlinked.length === 0) {
      const text = all.length === 0
        ? `На сайте ещё нет ни одного проекта.\n\nЧтобы привязать эту тему:\n1. Откройте <a href="${SITE}/history">Проекты</a> на сайте\n2. Нажмите «+ Добавить», заполните карточку\n3. В разделе «Тема в Telegram» выберите «Тема уже есть»\n4. Вернитесь сюда и напишите /link`
        : `Все проекты уже привязаны к темам ✅\n\nЕсли нужно добавить новый — создайте карточку на <a href="${SITE}/history">сайте</a>.`;
      await send(text);
      return res.status(200).end();
    }

    const buttons = unlinked.slice(0, 10).map(r => {
      const label = [r.data.клиент, r.data.объект].filter(Boolean).join(' — ') || 'Без названия';
      const num   = r.data.номер ? ` · ${r.data.номер}` : '';
      return [{ text: label + num, callback_data: `link:${r.id}` }];
    });

    await tgPost('sendMessage', TG_TOKEN, {
      chat_id: chatId, message_thread_id: threadId,
      text: 'Выберите проект для привязки к этой теме:',
      reply_markup: { inline_keyboard: buttons },
    });

    return res.status(200).end();
  }

  return res.status(200).end();
}
