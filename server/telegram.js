// Telegram-уведомления. Если TELEGRAM_BOT_TOKEN/CHAT_ID не заданы — тихо no-op.
// Node 20 имеет глобальный fetch.
const { pool } = require('./db');

const FEEDBACK_LABELS = {
  цена:   { ok: 'В бюджете ✅', bit: 'Чуть выше ожиданий 😐', high: 'Значительно дороже 😟' },
  состав: { complete: 'Всё включено ✅', adjust: 'Хочу скорректировать ✏️', missing: 'Многого не хватает 🤔' },
  шаг:    { ready: 'Готов к следующему шагу 🤝', think: 'Нужно подумать ⏳', looking: 'Смотрю другие варианты 🔍' },
};

function cfg() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
    site: process.env.SITE_URL || 'https://kalkulator-mebeli.na4u.ru',
  };
}

async function tgSend(token, chatId, text, threadId) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (threadId) body.message_thread_id = Number(threadId);
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function threadForCalc(calc) {
  if (!calc || !calc.projectId) return null;
  try {
    const { rows } = await pool.query('SELECT data FROM projects WHERE id = $1', [calc.projectId]);
    return (rows[0] && rows[0].data && rows[0].data.threadId) || null;
  } catch {
    return null;
  }
}

function dateStr() {
  return new Date().toLocaleString('ru-RU', {
    timeZone: 'Asia/Yekaterinburg',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Уведомление по расчёту (open/confirm/feedback)
async function sendNotify(type, calc, feedback) {
  const { token, chat, site } = cfg();
  if (!token || !chat || !calc) return;

  const client = calc.клиент || calc.объект || 'Клиент';
  const kpNum = String(calc.id || '').slice(-6);
  const link = `\n🔗 <a href="${site}/kp?id=${calc.id}">Открыть расчёт</a>`;
  const threadId = await threadForCalc(calc);

  let message = '';
  if (type === 'open') {
    if (calc.трекингВкл === false) return;
    message = `👀 <b>${client}</b> открыл КП #${kpNum}\n🕐 ${dateStr()}${link}`;
  } else if (type === 'confirm') {
    if (calc.подтверждениеВкл === false) return;
    message = `✅ <b>${client}</b> подтвердил КП #${kpNum}!\n📞 Свяжитесь с клиентом.${link}`;
  } else if (type === 'feedback') {
    if (calc.опросВкл === false) return;
    const fb = feedback || {};
    const label = (q, v) => (FEEDBACK_LABELS[q] && FEEDBACK_LABELS[q][v]) || v || '—';
    message = [
      `💬 <b>Отзыв клиента</b> — КП #${kpNum} (<b>${client}</b>)`,
      `💰 Цена: ${label('цена', fb.цена)}`,
      `📦 Состав: ${label('состав', fb.состав)}`,
      `👣 Дальше: ${label('шаг', fb.шаг)}`,
      link,
    ].join('\n');
  } else {
    return;
  }

  await tgSend(token, chat, message, threadId);
}

// Создание темы форума под новый проект. Возвращает {ok, threadId, topicUrl}.
async function createProjectTopic(projectData) {
  const { token, chat, site } = cfg();
  if (!token || !chat) return { ok: false, error: 'Telegram не настроен' };

  const namePart = [projectData.клиент, projectData.объект].filter(Boolean).join(' — ');
  const topicName = [namePart || 'Новый проект', projectData.номер].filter(Boolean).join(' · ');

  const resp = await fetch(`https://api.telegram.org/bot${token}/createForumTopic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, name: topicName }),
  });
  const topic = await resp.json();
  if (!topic.ok) return { ok: false, error: topic.description || 'createForumTopic failed' };

  const threadId = topic.result.message_thread_id;
  const absoluteId = String(chat).replace(/^-100/, '');
  const topicUrl = `https://t.me/c/${absoluteId}/${threadId}`;

  const lines = [`📋 <b>Проект создан</b>`];
  if (projectData.номер) lines.push(`🔢 ${projectData.номер}`);
  if (projectData.клиент) lines.push(`👤 ${projectData.клиент}`);
  if (projectData.объект) lines.push(`📍 ${projectData.объект}`);
  if (projectData.заметки) lines.push(`\n💬 ${projectData.заметки}`);
  if (projectData.ссылки && projectData.ссылки.length) {
    lines.push('');
    projectData.ссылки.forEach((l) => lines.push(`🔗 <a href="${l.url}">${l.заголовок || l.url}</a>`));
  }
  lines.push(`\n🧮 <a href="${site}/history">Открыть очередь проектов</a>`);
  await tgSend(token, chat, lines.join('\n'), threadId);

  return { ok: true, threadId, topicUrl };
}

module.exports = { sendNotify, createProjectTopic };
