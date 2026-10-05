# Odium — сайт студии

Сайт игровой студии Odium с доской пожеланий по каждой игре. ТЗ — [docs/spec.md](docs/spec.md), план разработки — [DEV_PLAN.md](DEV_PLAN.md).

## Запуск для разработки

Нужен Node.js 24 (версия записана в `.nvmrc`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Сайт откроется на http://localhost:3000.

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Сервер разработки |
| `npm run build`, `npm start` | Сборка и запуск продакшн-версии |
| `npm run lint` | ESLint |
| `npm run typecheck` | Проверка типов |
| `npm run format` | Форматирование Prettier (`format:check` — только проверка) |
