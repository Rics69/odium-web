# Odium — сайт студии

Сайт игровой студии Odium с доской пожеланий по каждой игре. ТЗ — [docs/spec.md](docs/spec.md), план разработки — [DEV_PLAN.md](DEV_PLAN.md).

## Запуск для разработки

Нужны Node.js 24 (версия записана в `.nvmrc`) и запущенный Docker.

```bash
npm install
cp .env.example .env.local
npm run services:up
npm run db:migrate
npm run dev
```

Сайт откроется на http://localhost:3000, проверка здоровья — http://localhost:3000/api/health. Письма, которые отправляет сайт, видны в Mailpit: http://localhost:8025.

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Сервер разработки |
| `npm run build`, `npm start` | Сборка и запуск продакшн-версии |
| `npm run lint` | ESLint |
| `npm run typecheck` | Проверка типов |
| `npm run format` | Форматирование Prettier (`format:check` — только проверка) |
| `npm run services:up`, `services:down` | Запустить и остановить PostgreSQL и Mailpit в Docker |
| `npm run db:generate` | Создать миграцию по изменениям схемы в `lib/db/schema.ts` |
| `npm run db:migrate` | Применить миграции из `drizzle/` |
| `npm run db:studio` | Drizzle Studio — просмотр базы в браузере |
