# Next.js App Router Architecture Audit — goxus front

**Date:** 2025-06-03  
**Auditor:** Hermes Agent (moonshotai/kimi-k2.6)  
**Scope:** `/home/bookworker06JAN1979/Sources/golang.app/goxus/front/`  
**Stack:** Next.js 16.2.6, React 19.2.4, Tailwind CSS v4, shadcn/ui v4 (Base UI), react-hook-form + zod  

---

## 1. Executive Summary

- Приложение построено на современном стеке: Next.js 16.2.6 (App Router), React 19.2.4, Tailwind CSS v4, shadcn/ui v4 (Base UI), react-hook-form + zod. React Compiler включен.
- Гидратация контролируется корректно: используется `next-themes`, `suppressHydrationWarning`, `useSyncExternalStore` для `localStorage` и `matchMedia`. Auth-guard в dashboard layout рендерит `Skeleton` вместо `null` — правильно.
- Основная архитектурная проблема: практически все страницы внутри `(dashboard)` являются Client Components из-за авторизации и интерактивности, тогда как App Router дает мощь Server Components. Это упущенная возможность для SSR/производительности.
- Критический пробел в тестовом покрытии: 8.37% общего покрытия, 0% на компонентах и страницах. `tsconfig.json` исключает `__tests__` и `e2e` — типы в тестах не проверяются.
- Навигация содержит мертвые ссылки (`/roles`, `/settings`) без соответствующих `page.tsx`.
- Нет App Router конвенционных файлов: `loading.tsx`, `error.tsx`, `not-found.tsx`.

---

## 2. Severity Table

| Severity | Problem | File(s) |
|---|---|---|
| **Critical** | Нет `loading.tsx` / `error.tsx` / `not-found.tsx` — стандартные App Router fallback-ы отсутствуют | `app/`, `app/(dashboard)/`, `app/login/` |
| **Critical** | `tsconfig.json` исключает `__tests__/**` и `e2e` — типы тестов не проверяются `tsc` | `tsconfig.json` |
| **Critical** | Очень низкое тестовое покрытие: 8.37% total, 0% на компонентах/страницах/хуках | vitest coverage report |
| **Medium** | Users page целиком Client Component с `fetch` в `useEffect` — данные можно грузить на сервере | `app/(dashboard)/users/page.tsx` |
| **Medium** | Мертвые ссылки `/roles` и `/settings` в sidebar и header — ведут на 404 | `app-sidebar.tsx`, `app-header.tsx` |
| **Medium** | `API_BASE` дублируется (`lib/auth.ts` и `lib/api.ts`) — риск рассинхронизации | `lib/auth.ts:26`, `lib/api.ts:6` |
| **Medium** | `use-mobile.ts` и `use-local-storage.ts` без `"use client"` — хрупко при импорте в другие файлы | `hooks/use-mobile.ts`, `hooks/use-local-storage.ts` |
| **Medium** | `app-header.tsx`: `DropdownMenuTrigger` (avatar) без `aria-label` — доступность | `app-header.tsx:101` |
| **Low** | Search и Settings кнопки в header — UI-макеты без `onClick` | `app-header.tsx:69`, `app-header.tsx:91` |
| **Low** | `deleteUser` вызывается без `AbortSignal`, хотя поддерживает его | `app/(dashboard)/users/page.tsx:109` |
| **Low** | `formatDate` хардкодит `en-US` locale | `lib/date.ts` |
| **Low** | `document.cookie` напрямую в `sidebar.tsx` (строка 86) — лучше через `js-cookie` | `components/ui/sidebar.tsx` |
| **Low** | CSS custom property `--radix-dropdown-menu-trigger-width` может не работать с Base UI | `app-sidebar.tsx:79` |

---

## 3. Prioritized Recommendations

1. **Добавить App Router fallback-файлы (`loading.tsx`, `error.tsx`, `not-found.tsx`)**
   — улучшит UX при медленной сети и ошибках. `loading.tsx` особенно важен для users (fetch).

2. **Убрать исключение тестов из `tsconfig.json` `include`**
   — типовая безопасность тестов критична для рефакторинга. Исключать из сборки можно через `outDir` или `tsconfig.test.json`.

3. **Разделить `UsersPage` на Server Component + Client Component**
   — Server Component делает `fetchUsers()`, передает `initialData`. Client Component отвечает за поиск, пагинацию, delete dialog. Уменьшит JS bundle и улучшит FCP.

4. **Убрать дублирование `API_BASE`**
   — `lib/auth.ts` должен импортировать `API_BASE` из `lib/api.ts`. Единый источник истины.

5. **Добавить `"use client"` в хуки `use-mobile.ts` и `use-local-storage.ts`**
   — предотвратит случайный импорт в Server Component.

6. **Создать заглушки страниц `/roles` и `/settings` (или убрать ссылки)**
   — избежать 404 для пользователей.

7. **Начать писать компонентные тесты (RTL + Vitest)**
   — покрытие 8% на front недопустимо для production. Начать с `AppHeader`, `AppSidebar`, `LoginPage`.

---

## 4. Top 3 Fixes — Code Examples

### Fix 1: Server/Client split для UsersPage

Создать server wrapper и вынести интерактивность в клиентский компонент:

```tsx
// app/(dashboard)/users/page.tsx (Server Component)
import { fetchUsersFromServer } from "@/lib/users.server"
import { UsersPageClient } from "./users-page-client"

export default async function UsersPage() {
  const users = await fetchUsersFromServer() // fetch с Bearer из cookie/headers
  return <UsersPageClient initialUsers={users} />
}

// app/(dashboard)/users/users-page-client.tsx ("use client")
// Вся текущая логика state, search, pagination, delete dialog —
// но без useEffect fetch, initialUsers из props.
```

### Fix 2: Убрать дублирование `API_BASE`

```ts
// lib/auth.ts — заменить строку 26 на:
import { API_BASE } from "./api"
```

### Fix 3: Добавить `loading.tsx` для dashboard и users

```tsx
// app/(dashboard)/loading.tsx
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
export default function Loading() {
  return <DashboardSkeleton />
}
```

---

## 5. Architecture Score

| Критерий | Score | Comment |
|---|---|---|
| Стек / современность | 9/10 | Next.js 16, React 19, Tailwind v4, shadcn v4, React Compiler |
| Server/Client split | 5/10 | Все страницы в dashboard — Client Components |
| Гидратация / стабильность | 8/10 | useSyncExternalStore, next-themes, skeleton вместо null |
| Доступность (a11y) | 6/10 | Неполные aria-label, нет `role="alert"` на ошибках |
| Тестирование | 3/10 | 8.37% coverage, 0% компонентов, тесты вне tsconfig |
| Типобезопасность | 7/10 | `strict: true`, но тесты не типизируются |
| Производительность | 6/10 | Нет code splitting по страницам, users грузит все сразу |
| UI консистентность | 7/10 | shadcn v4 используется корректно, но есть placeholder UI |

---

## 6. Conclusion

Приложение имеет современную технологическую базу, но страдает от классического подхода "все клиентское" внутри App Router. Основные усилия должны быть направлены на использование Server Components для data fetching, добавление стандартных App Router fallback-ов и резкое повышение тестового покрытия.
