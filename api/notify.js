// Vercel serverless function — Telegram уведомления + Supabase
// types: 'new_project' | 'open' | 'confirm' | 'feedback'

const FEEDBACK_LABELS = {
  цена:   { ok: 'В бюджете ✅', bit: 'Чуть выше ожиданий 😐', high: 'Значительно дороже 😟' },
  состав: { complete: 'Всё включено ✅', adjust: 'Хочу скорректировать ✏️', missing: 'Многого не хватает 🤔' },
  шаг:    { ready: 'Готов к следующему шагу 🤝', think: 'Нужно подумать ⏳', looking: 'Смотрю другие варианты 🔍' },
};

async function tgSend(token, chatId, text, threadId = null) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (threadId) body.message_thread_id = Number(threadId);
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, calcId, projectId, projectData, feedback } = req.body || {};
  if (!type) return res.status(400).json({ error: 'Missing type' });

  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TG_CHAT  = process.env.TELEGRAM_CHAT_ID;
  const SB_URL   = process.env.VITE_SUPABASE_URL;
  const SB_KEY   = process.env.VITE_SUPABASE_KEY;

  if (!TG_TOKEN || !TG_CHAT) return res.status(500).json({ error: 'Telegram not configured' });
  if (!SB_URL   || !SB_KEY)  return res.status(500).json({ error: 'Supabase not configured' });

  const sbH = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

  // ── Создание Telegram-темы для нового проекта ────────────────────────────
  if (type === 'new_project') {
    if (!projectId || !projectData) return res.status(400).json({ error: 'Missing projectId or projectData' });

    const topicName = [projectData.клиент, projectData.объект].filter(Boolean).join(' — ') || 'Новый проект';

    // Создаём тему (форум должен быть включён и бот должен быть админом)
    const topicResp = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/createForumTopic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, name: topicName }),
    });
    const topicData = await topicResp.json();
    if (!topicData.ok) {
      console.error('createForumTopic error:', topicData);
      return res.status(502).json({ error: 'Не удалось создать тему', details: topicData.description });
    }

    const threadId = topicData.result.message_thread_id;

    // URL темы: chat_id вида -100XXXXXXXXXX → убираем -100 → t.me/c/XXXXXXXXXX/threadId
    const absoluteId = String(TG_CHAT).replace(/^-100/, '');
    const topicUrl = `https://t.me/c/${absoluteId}/${threadId}`;

    // Сохраняем threadId и topicUrl в проект
    const updated = { ...projectData, threadId, topicUrl };
    await fetch(`${SB_URL}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      headers: { ...sbH, Prefer: 'return=minimal' },
      body: JSON.stringify({ data: updated }),
    });

    // Первое сообщение в теме — карточка проекта
    const lines = [`📋 <b>Проект создан</b>`];
    if (projectData.клиент) lines.push(`👤 ${projectData.клиент}`);
    if (projectData.объект) lines.push(`📍 ${projectData.объект}`);
    if (projectData.заметки) lines.push(`\n💬 ${projectData.заметки}`);
    if (projectData.ссылки?.length) {
      lines.push('');
      projectData.ссылки.forEach(l => lines.push(`🔗 <a href="${l.url}">${l.заголовок || l.url}</a>`));
    }
    lines.push(`\n🧮 <a href="https://pro-design-calc.vercel.app/history">Открыть очередь проектов</a>`);

    await tgSend(TG_TOKEN, TG_CHAT, lines.join('\n'), threadId);

    return res.status(200).json({ ok: true, threadId, topicUrl });
  }

  // ── Уведомления по расчётам (open / confirm / feedback) ─────────────────

  if (!calcId) return res.status(400).json({ error: 'Missing calcId' });

  const fetchResp = await fetch(
    `${SB_URL}/rest/v1/calculations?id=eq.${encodeURIComponent(calcId)}&select=data`,
    { headers: sbH }
  );
  const rows = await fetchResp.json();
  if (!rows?.length) return res.status(404).json({ error: 'Calculation not found' });

  const calc    = rows[0].data;
  const client  = calc.клиент || calc.объект || 'Клиент не указан';
  const kpNum   = String(calcId).slice(-6);
  const now     = new Date().toISOString();
  const dateStr = new Date().toLocaleString('ru-RU', {
    timeZone: 'Asia/Yekaterinburg',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  let message    = '';
  let updateData = null;

  if (type === 'open') {
    if (calc.трекингВкл === false) return res.status(200).json({ skipped: true, reason: 'tracking disabled' });
    if (calc.last_notified_at) {
      if (Date.now() - new Date(calc.last_notified_at).getTime() < 30 * 60 * 1000)
        return res.status(200).json({ skipped: true, reason: 'dedup' });
    }
    message    = `👀 <b>${client}</b> открыл КП #${kpNum}\n🕐 ${dateStr}`;
    updateData = { ...calc, last_notified_at: now };

  } else if (type === 'confirm') {
    if (calc.подтверждениеВкл === false) return res.status(200).json({ skipped: true, reason: 'confirm disabled' });
    if (calc.confirmed_at) return res.status(200).json({ skipped: true, reason: 'already confirmed' });
    message    = `✅ <b>${client}</b> подтвердил КП #${kpNum}!\n📞 Свяжитесь с клиентом.`;
    updateData = { ...calc, confirmed_at: now };

  } else if (type === 'feedback') {
    if (calc.опросВкл === false) return res.status(200).json({ skipped: true, reason: 'survey disabled' });
    if (calc.feedback) return res.status(200).json({ skipped: true, reason: 'already submitted' });
    const fb = feedback || {};
    const label = (q, v) => FEEDBACK_LABELS[q]?.[v] || v || '—';
    message = [
      `💬 <b>Отзыв клиента</b> — КП #${kpNum} (<b>${client}</b>)`,
      `💰 Цена: ${label('цена', fb.цена)}`,
      `📦 Состав: ${label('состав', fb.состав)}`,
      `👣 Дальше: ${label('шаг', fb.шаг)}`,
    ].join('\n');
    updateData = { ...calc, feedback: { ...fb, submitted_at: now } };

  } else {
    return res.status(400).json({ error: 'Unknown type' });
  }

  if (updateData) {
    await fetch(`${SB_URL}/rest/v1/calculations?id=eq.${encodeURIComponent(calcId)}`, {
      method: 'PATCH',
      headers: { ...sbH, Prefer: 'return=minimal' },
      body: JSON.stringify({ data: updateData }),
    });
  }

  const tgData = await tgSend(TG_TOKEN, TG_CHAT, message);
  if (!tgData.ok) {
    console.error('Telegram error:', tgData);
    return res.status(502).json({ error: 'Telegram send failed', details: tgData });
  }

  return res.status(200).json({ ok: true });
}
