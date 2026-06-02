// Скрипт резервного копирования данных из Supabase
// Запуск: node scripts/backup-supabase.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Укажите VITE_SUPABASE_URL и VITE_SUPABASE_KEY в .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function backup() {
  const timestamp = new Date().toISOString().slice(0, 10);
  const backupDir = path.join(process.cwd(), 'backups', timestamp);

  // Создаём папку
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`📦 Создаём резервную копию в ${backupDir}...`);

  // Скачиваем все таблицы
  const tables = ['calculations', 'projects', 'settings'];

  for (const table of tables) {
    console.log(`  Экспорт ${table}...`);
    const { data, error } = await supabase.from(table).select('*');

    if (error) {
      console.error(`  ❌ Ошибка при экспорте ${table}:`, error.message);
      continue;
    }

    const filePath = path.join(backupDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  ✅ ${table}: ${data.length} записей сохранено`);
  }

  // Создаём README с информацией о бэкапе
  const readme = `# Резервная копия ${timestamp}

Создано: ${new Date().toLocaleString('ru-RU')}
База: ${SUPABASE_URL}

## Содержимое

- calculations.json — расчёты и КП
- projects.json — проекты из очереди
- settings.json — настройки прайса

## Восстановление

1. Зайти в Supabase Dashboard → Table Editor
2. Выбрать таблицу → Insert → Bulk insert
3. Скопировать содержимое соответствующего JSON файла
`;

  fs.writeFileSync(path.join(backupDir, 'README.md'), readme, 'utf-8');

  console.log(`\n✅ Бэкап завершён: ${backupDir}`);
  console.log(`💾 Общий размер: ${(fs.readdirSync(backupDir).reduce((sum, f) =>
    sum + fs.statSync(path.join(backupDir, f)).size, 0) / 1024).toFixed(1)} KB`);
}

backup().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
