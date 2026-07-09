# TASK: PWA оффлайн-режим, установка на главный экран и локальные пуш-уведомления (PWA Setup & Offline)

**Дата создания:** 2026-07-07  
**Приоритет:** Low  
**Фаза:** Phase 5  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (Medium)

---

## Цель

Превратить гостевой интерфейс в полноценное прогрессивное веб-приложение (PWA): добавить манифест и иконки, настроить Service Worker для оффлайн-кэширования структуры меню ресторана, реализовать баннер установки приложения на главный экран мобильного телефона (Add to Home Screen) и локальные пуш-уведомления о смене статусов заказов гостя.

---

## Контекст

- **Зависит от:** TASK_04 (Frontend Foundation), TASK_05 (Menu PWA), TASK_06 (WebSocket)
- **Затрагивает:** Frontend only
- **Связанный контракт:** —

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 5, «PWA: оффлайн-кэш меню, иконка на экране, push-уведомления».

---

## Затронутые файлы

### Создать новые

**Frontend:**
- `frontend/public/manifest.json` — Манифест PWA приложения (название, иконки, цвета, режим отображения).
- `frontend/public/sw.js` — Нативный Service Worker с логикой кэширования статики и API-запросов меню (Cache-First для статики, Network-First с fallback в кэш для меню).
- `frontend/src/components/guest/PwaInstallBanner.tsx` — Плавающий баннер-кнопка «Добавить на главный экран» для мобильных устройств.

### Изменить существующие

**Frontend:**
- `frontend/src/app/layout.tsx` — Подключить `manifest.json`, метатеги `theme-color`, `apple-mobile-web-app-capable` и скрипт регистрации Service Worker.
- `frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx` — Внедрить компонент `PwaInstallBanner` и сделать запрос разрешения на отправку уведомлений (`Notification.requestPermission()`).
- `frontend/src/app/(guest)/order/[orderId]/page.tsx` — При получении WebSocket уведомления о смене статуса заказа, если вкладка не активна (или просто в реальном времени), вызывать локальное Push-уведомление через Service Worker / Notification API.

---

## Точная реализация (Technical Design)

### 1. manifest.json

Разместить в `frontend/public/manifest.json`:
```json
{
  "name": "QTab — Инновационное QR Меню",
  "short_name": "QTab",
  "description": "Заказ блюд по QR-коду, вызов официанта и оплата в один клик.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F0F0F",
  "theme_color": "#D4A853",
  "icons": [
    {
      "src": "/uploads/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/uploads/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```
*(Иконки можно сгенерировать программно или положить заглушки в папку public).*

### 2. Service Worker (`frontend/public/sw.js`)

Реализуем простую и надежную стратегию Cache-First для статических файлов и Network-First с fallback в Cache для API-запроса меню ресторана (`/api/v1/menu/*`).

```javascript
const CACHE_NAME = 'qtab-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Для API меню используем Network-First с переходом в кэш при ошибке сети
  if (url.pathname.includes('/api/v1/menu/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Для статических файлов Cache-First
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});
```

### 3. Регистрация Service Worker (layout.tsx)
Внедрить в корневой `layout.tsx` код регистрации сервис-воркера в браузере:
```typescript
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered successfully:', reg.scope);
    }).catch((err) => {
      console.error('SW registration failed:', err);
    });
  });
}
```

### 4. Кнопка установки PwaInstallBanner.tsx
Отслеживать глобальное событие `beforeinstallprompt`, сохранять объект `deferredPrompt` в стейт.
Показывать красивую плашку внизу экрана (например, «Установить QTab на экран домой»). При клике вызывать `deferredPrompt.prompt()` и скрывать плашку.

### 5. Локальные Push-уведомления
При изменении статуса заказа в `app/(guest)/order/[orderId]/page.tsx` по WebSocket:
```typescript
if (Notification.permission === 'granted') {
  new Notification('QTab — Обновление заказа', {
    body: `Статус вашего заказа: ${newStatusText}! 🍕`,
    icon: '/uploads/icon-192.png'
  });
}
```

---

## Риски и подводные камни (Edge Cases)

- **Кэширование API ответов авторизации:** Никогда не кэшировать запросы авторизации (`/api/v1/auth/**`, `/api/v1/guest/auth/**`), иначе логин/регистрация сломаются при сбое интернета. Ограничить кэширование только эндпоинтом `/api/v1/menu/*`.
- **Браузерные ограничения:** Событие `beforeinstallprompt` поддерживается в Chrome/Android, но не поддерживается в iOS Safari. На iOS Safari выводить простую текстовую подсказку: «Чтобы установить приложение: нажмите кнопку Поделиться -> Добавить на экран Домой».

---

## Порядок реализации для агента

### Frontend
- [x] 1. Создать иконки и положить в public (или сгенерировать простые цветные PNG заглушки).
- [x] 2. Создать `public/manifest.json`.
- [x] 3. Написать Service Worker в `public/sw.js` с логикой оффлайн-кэша меню.
- [x] 4. Зарегистрировать Service Worker и manifest в `src/app/layout.tsx`.
- [x] 5. Создать компонент `PwaInstallBanner.tsx` с отслеживанием `beforeinstallprompt` и подсказкой для iOS Safari.
- [x] 6. Внедрить баннер на страницу меню гостя.
- [x] 7. Добавить запрос прав на уведомления и локальные Push-уведомления на странице трекинга заказа.
- [x] 8. Проверить сборку фронтенда `cd frontend && pnpm run build`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1`.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [x] Запусти `.\rotate-backup.ps1`.
4. [x] Синхронизируй `ROADMAP.md`.
5. [x] Перемести файл этой задачи в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ручного тестирования ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Открыть гостевое меню в браузере (желательно Chrome).
2. Браузер должен запросить разрешение на отправку уведомлений — нажмите «Разрешить».
3. Внизу экрана должен появиться плавающий баннер «Установить QTab на экран». Нажмите его — должен открыться системный диалог установки PWA.
4. Открыть Chrome DevTools, перейти во вкладку **Application** -> **Service Workers** и убедиться, что `/sw.js` успешно зарегистрирован и активен.
5. Во вкладке **Cache Storage** должен появиться кэш `qtab-cache-v1`.
6. Имитировать оффлайн-режим (вкладка Network -> поставить Offline).
7. Обновить страницу меню ресторана — меню должно успешно загрузиться из кэша Service Worker.
8. Сделать тестовый заказ, открыть страницу трекинга `/order/[id]`. Сменить статус заказа в админке — на рабочем столе должно всплыть системное пуш-уведомление о смене статуса.
