// Скрипт резервного копирования данных из Supabase
// Запуск: node scripts/backup-supabase.js
// Не требует установки дополнительных пакетов — использует только fetch

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Читаем .env файл вручную
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      process.env[key.trim()] = value.trim();
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Укажите VITE_SUPABASE_URL и VITE_SUPABASE_KEY в .env файле');
  console.error('   Пример: скопируй .env.example в .env и заполни значения');
  process.exit(1);
}

async function fetchTable(tableName) {
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function backup() {
  const timestamp = new Date().toISOString().slice(0, 10);
  const backupDir = path.join(__dirname, '..', 'backups', timestamp);

  // Создаём папку
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`📦 Создаём резервную копию в backups/${timestamp}/...`);

  // Скачиваем все таблицы
  const tables = ['calculations', 'projects', 'settings'];
  let totalRecords = 0;

  for (const table of tables) {
    try {
      console.log(`  📥 Экспорт ${table}...`);
      const data = await fetchTable(table);

      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

      totalRecords += data.length;
      console.log(`  ✅ ${table}: ${data.length} записей сохранено`);
    } catch (err) {
      console.error(`  ❌ Ошибка при экспорте ${table}:`, err.message);
    }
  }

  // Создаём README с информацией о бэкапе
  const readme = `# Резервная копия ${timestamp}

Создано: ${new Date().toLocaleString('ru-RU')}
База: ${SUPABASE_URL}
Записей: ${totalRecords}

## Содержимое

- calculations.json — расчёты и КП
- projects.json — проекты из очереди
- settings.json — настройки прайса

## Восстановление

### Через Supabase Dashboard:
1. Зайти в Supabase Dashboard → Table Editor
2. Выбрать таблицу → Insert → Bulk insert
3. Скопировать содержимое соответствующего JSON файла

### Через SQL Editor:
\`\`\`sql
-- Пример для calculations:
INSERT INTO calculations (id, data, created_at)
SELECT
  (value->>'id')::text,
  (value->>'data')::jsonb,
  (value->>'created_at')::timestamptz
FROM json_array_elements('[... содержимое calculations.json ...]'::json);
\`\`\`
`;

  fs.writeFileSync(path.join(backupDir, 'README.md'), readme, 'utf-8');

  const totalSize = fs.readdirSync(backupDir).reduce((sum, f) =>
    sum + fs.statSync(path.join(backupDir, f)).size, 0);

  console.log(`\n✅ Бэкап завершён!`);
  console.log(`📁 Путь: backups/${timestamp}/`);
  console.log(`📊 Записей: ${totalRecords}`);
  console.log(`💾 Размер: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`\n💡 Сохрани папку backups/ на Google Drive или Яндекс.Диск`);
}

backup().catch(err => {
  console.error('\n❌ Ошибка:', err.message);
  console.error('\nПроверь:');
  console.error('1. Файл .env существует и содержит VITE_SUPABASE_URL и VITE_SUPABASE_KEY');
  console.error('2. Интернет подключен');
  console.error('3. Supabase проект активен (не на паузе)');
  process.exit(1);
});
