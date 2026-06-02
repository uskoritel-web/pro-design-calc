# Резервное копирование данных

## Быстрый способ (вручную)

1. Открыть https://supabase.com/dashboard
2. Выбрать проект калькулятора
3. **Table Editor** → для каждой таблицы:
   - `calculations` (расчёты)
   - `projects` (проекты)
   - `settings` (настройки)
4. Кнопка **"..."** → **Export to CSV**
5. Сохранить файлы на компьютер

## Автоматический бэкап (скрипт)

```bash
# 1. Убедись что .env файл настроен (скопируй из .env.example)
cp .env.example .env
# Заполни VITE_SUPABASE_URL и VITE_SUPABASE_KEY

# 2. Запусти скрипт
node scripts/backup-supabase.js
```

Бэкап сохранится в папку `backups/YYYY-MM-DD/`

## Восстановление из бэкапа

### Вариант 1: Через Supabase Dashboard
1. Table Editor → выбери таблицу
2. Insert → Bulk insert
3. Скопируй содержимое JSON файла из бэкапа
4. Вставь и сохрани

### Вариант 2: Через SQL
1. SQL Editor в Supabase
2. Загрузи JSON и выполни:
```sql
INSERT INTO calculations (id, data, created_at)
SELECT 
  (value->>'id')::text,
  (value->>'data')::jsonb,
  (value->>'created_at')::timestamptz
FROM json_array_elements('[... твой JSON ...]'::json);
```

## Расписание бэкапов

**Рекомендуется:**
- Еженедельно (каждое воскресенье) — ручной экспорт CSV
- Перед важными изменениями — запуск скрипта
- После перехода на Supabase Pro — настроить автоматический daily backup

## Хранение

- Локально: папка `backups/` (добавлена в .gitignore)
- Облако: загружать на Google Drive / Яндекс.Диск раз в месяц
- GitHub: **НЕ коммитить бэкапы в репозиторий** (там данные клиентов)

## Размер данных

Обычно:
- calculations: ~10-50 записей = 50-200 KB
- projects: ~5-20 записей = 10-50 KB  
- settings: 1 запись = 2-5 KB

Итого: **~100-300 KB** на полный бэкап
