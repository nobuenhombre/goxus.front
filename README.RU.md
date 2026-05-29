# Goxus Frontend / Фронтенд

Фронтенд SaaS-платформы **goxus** — клиентское Next.js-приложение, взаимодействующее с Go-бэкендом через REST API.

## Технологический стек

| Технология | Назначение |
|---|---|
| [Next.js](https://nextjs.org/) (App Router) | React-фреймворк с серверными компонентами и роутингом |
| [TypeScript](https://www.typescriptlang.org/) | Типизированный JavaScript |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS-фреймворк |
| [shadcn/ui](https://ui.shadcn.com/) (планируется) | Коллекция переиспользуемых компонентов на Radix UI |

## Требования

- **Node.js** — версия, указанная в `.nvmrc`. Рекомендуется установка через [nvm](https://github.com/nvm-sh/nvm).
- **npm** — менеджер пакетов (поставляется вместе с Node.js).

```bash
nvm use       # переключиться на нужную версию Node.js
node --version
npm --version
```

## Начало работы

Склонируйте репозиторий и установите зависимости:

```bash
npm install
```

Запустите сервер разработки:

```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

## Доступные команды

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск сервера разработки с глобальной перезагрузкой |
| `npm run build` | Сборка приложения для продакшена |
| `npm start` | Запуск продакшен-сервера (требуется предварительная сборка) |
| `npm run lint` | Проверка кода линтером Next.js + ESLint |

## Структура проекта

```
front/
├── public/            # Статические файлы (изображения, favicon, шрифты)
├── src/
│   ├── app/           # Страницы и роутинг (App Router)
│   │   ├── layout.tsx # Корневой лейаут
│   │   ├── page.tsx   # Главная страница
│   │   └── ...        # Остальные маршруты
│   ├── components/    # Переиспользуемые UI-компоненты
│   └── lib/           # Утилиты, конфиги, API-клиенты
├── .nvmrc             # Фиксация версии Node.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts # Конфигурация Tailwind CSS
└── next.config.ts     # Конфигурация Next.js
```

## Интеграция с бэкендом

Фронтенд взаимодействует с Go-бэкендом **goxus.back** через REST API.

- Базовый URL бэкенда задаётся через переменную окружения `NEXT_PUBLIC_API_URL` (по умолчанию `http://localhost:8080`).
- Все запросы к API выполняются через единый HTTP-клиент, расположенный в `src/lib/api.ts` (или аналогичном файле).
- Для аутентификации используется JWT-токен, передаваемый в заголовке `Authorization: Bearer <token>`.
- Ответы бэкенда имеют единый формат: `{ data, error, meta }`.

```typescript
// Пример запроса к бэкенду
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { data, error } = await res.json();
```

## Лицензия

Распространяется под лицензией, указанной в корне репозитория **goxus**.
