// Vercel serverless function
// POST /api/notify — Telegram уведомления + обновление Supabase
// body: { type: 'open' | 'confirm' | 'feedback', calcId, feedback? }

const FEEDBACK_LABELS = {
  цена:   { ok: 'В бюджете ✅', bit: 'Чуть выше ожиданий 😐', high: 'Значительно дороже 😟' },
  состав: { complete: 'Всё включено ✅', adjust: 'Хочу скорректировать ✏️', missing: 'Многого не хватает 🤔' },
  шаг:    { ready: 'Готов к следующему шагу 🤝', think: 'Нужно подумать ⏳', looking: 'Смотрю другие варианты 🔍' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, calcId, feedback } = req.body || {};
  if (!type || !calcId) return res.status(400).json({ error: 'Missing type or calcId' });

  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TG_CHAT  = process.env.TELEGRAM_CHAT_ID;
  const SB_URL   = process.env.VITE_SUPABASE_URL;
  const SB_KEY   = process.env.VITE_SUPABASE_KEY;

  if (!TG_TOKEN || !TG_CHAT) return res.status(500).json({ error: 'Telegram not configured' });
  if (!SB_URL   || !SB_KEY)  return res.status(500).json({ error: 'Supabase not configured' });

  const sbHeaders = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };

  // Загружаем расчёт
  const fetchResp = await fetch(
    `${SB_URL}/rest/v1/calculations?id=eq.${encodeURIComponent(calcId)}&select=data`,
    { headers: sbHeaders }
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
      const ago = Date.now() - new Date(calc.last_notified_at).getTime();
      if (ago < 30 * 60 * 1000) return res.status(200).json({ skipped: true, reason: 'dedup' });
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
      `💰 Цена: ${label('цена',   fb.цена)}`,
      `📦 Состав: ${label('состав', fb.состав)}`,
      `👣 Дальше: ${label('шаг',    fb.шаг)}`,
    ].join('\n');
    updateData = { ...calc, feedback: { ...fb, submitted_at: now } };

  } else {
    return res.status(400).json({ error: 'Unknown type' });
  }

  // Обновляем Supabase
  if (updateData) {
    await fetch(`${SB_URL}/rest/v1/calculations?id=eq.${encodeURIComponent(calcId)}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ data: updateData }),
    });
  }

  // Telegram
  const tgResp = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text: message, parse_mode: 'HTML' }),
  });
  const tgData = await tgResp.json();
  if (!tgData.ok) {
    console.error('Telegram error:', tgData);
    return res.status(502).json({ error: 'Telegram send failed', details: tgData });
  }

  return res.status(200).json({ ok: true });
}
