# TASK: Frontend — Полный Order Flow с подтверждением кодом, per-item статусы, обновлённый UI

**Дата создания:** 2026-07-08  
**Приоритет:** High  
**Фаза:** Phase 4 (Integration & Polish)  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

> [!TIP]
> Эта задача — чисто фронтенд. Зависит от TASK_29 (бэкенд confirmation code + per-item statuses).
> Крупная фронтенд-доработка: диалог подтверждения заказа кодом, per-item status tracking у гостя, обновлённые WebSocket обработчики, общий `useStompClient` хук.

---

## Цель

Реализовать полный frontend order lifecycle: (1) после оформления заказа гость видит окно ввода 4-значного кода, (2) после подтверждения — страница отслеживания с per-item статусами, (3) обновлённые WebSocket обработчики для новых event типов, (4) общий `useStompClient` хук для устранения дублирования кода.

---

## Контекст

- **Зависит от:** TASK_29_ORDER_CONFIRMATION_BACKEND (должна быть выполнена первой!)
- **Затрагивает:** Frontend only
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — секции Orders, WebSocket

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — Tailwind CSS v4, shadcn/ui, Framer Motion для анимаций, Inter/Playfair шрифты.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- **Выжимка из текущего кода:**
  - STOMP WebSocket дублируется в 4 файлах (order page, receipt page, dashboard, kitchen). Нужен общий хук.
  - Order status page использует `STATUS_FLOW` с ключами `CREATED`/`COOKING` — нужно обновить на `PENDING_CONFIRMATION`/`CONFIRMED`/`PREPARING`.
  - `CartDrawer.tsx` (23KB) отвечает за оформление заказа — после `createOrder()` нужно показывать dialog для ввода кода.
  - Нет `OrderItemStatus` на фронтенде — нужно добавить.
  - `useGuestStore` хранит `activeOrderId` — используется для навигации после создания заказа.

---

## Затронутые файлы

### Создать новые

#### 1. useStompClient.ts — Общий WebSocket хук
- `frontend/src/hooks/useStompClient.ts`
  - Принимает: `subscriptions: { topic: string, handler: (data: any) => void }[]`
  - Возвращает: `{ connected: boolean, client: Client | null }`
  - Единая логика `getWsUrl()`, reconnect, heartbeat
  - Избавит от дублирования в 4 файлах

#### 2. OrderConfirmationDialog.tsx — Диалог ввода кода подтверждения
- `frontend/src/components/guest/OrderConfirmationDialog.tsx`
  - Modal/Sheet с 4-значным PIN-вводом
  - Показывается после успешного `POST /api/v1/order` когда статус = `PENDING_CONFIRMATION`
  - UI: 4 отдельных инпута (как при вводе OTP/SMS-кода), автофокус, автоматический submit при заполнении
  - Анимация: появление снизу (Framer Motion `slideUp`)
  - Состояния: ожидание кода, ввод, проверка (loading), ошибка (неверный код), успех
  - При успешном подтверждении: переход на страницу отслеживания заказа
  - Текст: "Назовите номер столика официанту, и он сообщит вам код подтверждения"
  - i18n: все тексты через `useTranslation`

#### 3. OrderItemStatusBadge.tsx — Бейдж статуса позиции
- `frontend/src/components/guest/OrderItemStatusBadge.tsx`
  - Отображает статус отдельной позиции: PENDING, PREPARING, READY, SERVED, CANCELLED
  - Цвета: PENDING=zinc, PREPARING=amber, READY=emerald, SERVED=blue, CANCELLED=red
  - Анимация смены статуса: Framer Motion `layoutId`
  - Compact mode для списка позиций

### Изменить существующие

#### 1. frontend/src/components/guest/CartDrawer.tsx — ИЗМЕНИТЬ flow после создания заказа
- **Текущее поведение:** После `createOrder()` → redirect на `/order/{orderId}`
- **Новое поведение:** После `createOrder()` → показать `OrderConfirmationDialog` с ожиданием кода
- Конкретно: В обработчике `handleSubmitOrder()` (или аналогичном) после получения `CreateOrderResponse` с `status: "PENDING_CONFIRMATION"`:
  1. Сохранить `orderId` в state
  2. Показать `OrderConfirmationDialog`
  3. НЕ редиректить сразу

#### 2. frontend/src/app/(guest)/order/[orderId]/page.tsx — ПОЛНАЯ переработка status tracking
- **Обновить STATUS_FLOW:**
  ```typescript
  const STATUS_FLOW = [
    { key: 'PENDING_CONFIRMATION', label: t('order.pendingConfirmation'), icon: FileText, color: 'amber' },
    { key: 'CONFIRMED', label: t('order.confirmed'), icon: CheckCircle2, color: 'blue' },
    { key: 'PREPARING', label: t('order.preparing'), icon: Flame, color: 'orange' },
    { key: 'READY', label: t('order.ready'), icon: CheckCircle2, color: 'emerald' },
    { key: 'SERVED', label: t('order.served'), icon: Utensils, color: 'green' },
  ];
  ```

- **Добавить per-item статусы:**
  В секции "Состав заказа" каждый item теперь показывает свой индивидуальный статус через `OrderItemStatusBadge`.
  Заменить текущий простой список на:
  ```tsx
  {order.items.map((item) => (
    <div key={item.menuItemId} className="py-3 flex justify-between items-center">
      <div className="min-w-0 flex-1">
        <h4 className="font-medium text-white/90 truncate">{item.nameRu}</h4>
        <p className="text-xs text-white/40">{item.quantity} шт. × {item.unitPrice} BYN</p>
      </div>
      <div className="flex items-center gap-2">
        <OrderItemStatusBadge status={item.status} />
        <span className="font-bold text-white font-serif">
          {(item.quantity * item.unitPrice).toFixed(2)} BYN
        </span>
      </div>
    </div>
  ))}
  ```

- **Обработка нового WebSocket event `ITEM_STATUS_CHANGED`:**
  При получении event с `type: "ITEM_STATUS_CHANGED"` — обновить статус конкретного item без полного refetch.

- **Обработка нового статуса `PENDING_CONFIRMATION`:**
  Если текущий статус = `PENDING_CONFIRMATION` — показать блок с информацией о коде и `OrderConfirmationDialog`.

- **Заменить inline STOMP на `useStompClient` хук.**

#### 3. frontend/src/app/(staff)/dashboard/page.tsx — Обновить для новых статусов
- Обновить WebSocket обработчик для event `CONFIRMATION_REQUIRED` — показывать confirmation code в карточке заказа
- Обновить фильтры статусов: `PENDING_CONFIRMATION, CONFIRMED, PREPARING, READY, SERVED`
- **Заменить inline STOMP на `useStompClient` хук.**

#### 4. frontend/src/app/(staff)/kitchen/page.tsx — Обновить для новых статусов и per-item
- Показывать только заказы со статусом `CONFIRMED` или items в статусе `PENDING`/`PREPARING`
- Добавить кнопку "Взять в работу" (`POST /api/v1/kitchen/orders/{orderId}/take`)
- Добавить per-item кнопки "Готово" (`PATCH /api/v1/kitchen/orders/{orderId}/items/{itemId}/status`)
- **Заменить inline STOMP на `useStompClient` хук.**

#### 5. frontend/src/components/staff/OrderQueueCard.tsx — Обновить маппинг статусов
- Обновить `statusDetails` маппинг:
  ```typescript
  const statusDetails: Record<string, {...}> = {
    'PENDING_CONFIRMATION': { label: 'Ожидает код', color: 'amber', icon: Clock },
    'CONFIRMED': { label: 'Подтверждён', color: 'blue', icon: Check },
    'PREPARING': { label: 'Готовится', color: 'orange', icon: Play },
    'READY': { label: 'Готов', color: 'emerald', icon: CheckCircle },
    'SERVED': { label: 'Подан', color: 'green', icon: UserCheck },
  };
  ```
- Для заказов в статусе `PENDING_CONFIRMATION` — показать confirmation code крупным шрифтом, чтобы официант мог его прочитать гостю

#### 6. frontend/src/components/staff/KitchenOrderCard.tsx — Per-item статусы
- Вместо чекбоксов для "готово весь заказ" → per-item кнопки "Готово" для каждой позиции
- Каждая позиция может быть отмечена как `READY` независимо
- Визуальное разделение: PENDING items слева, PREPARING по центру, READY справа (mini-kanban в карточке)

#### 7. frontend/src/app/(guest)/receipt/page.tsx — Обновить WebSocket
- **Заменить inline STOMP на `useStompClient` хук.**

#### 8. frontend/src/locales/ru.json — Добавить новые i18n ключи
```json
{
  "order": {
    "pendingConfirmation": "Ожидает подтверждения",
    "pendingConfirmationDesc": "Назовите номер столика официанту для получения кода",
    "confirmed": "Подтверждён",
    "confirmedDesc": "Заказ передан на кухню",
    "preparing": "Готовится",
    "preparingDesc": "Шеф-повар готовит ваши блюда",
    "confirmationCode": "Код подтверждения",
    "enterCode": "Введите 4-значный код",
    "codeHint": "Назовите номер столика официанту, и он сообщит вам код подтверждения",
    "invalidCode": "Неверный код. Попробуйте ещё раз",
    "verifying": "Проверяем код...",
    "itemStatus": "Статус блюда",
    "itemPending": "Ожидает",
    "itemPreparing": "Готовится",
    "itemReady": "Готово",
    "itemServed": "Подано",
    "itemCancelled": "Отменено"
  }
}
```

#### 9. frontend/src/locales/en.json — Аналогичные ключи на EN

#### 10. frontend/src/locales/by.json — Аналогичные ключи на BY

---

## Точная реализация (Technical Design)

### useStompClient.ts
```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';

interface StompSubscription {
  topic: string;
  handler: (data: any) => void;
}

interface UseStompClientOptions {
  subscriptions: StompSubscription[];
  enabled?: boolean; // default true
}

function getWsUrl(): string {
  const apiHost = process.env.NEXT_PUBLIC_API_URL || '';
  if (apiHost) {
    return apiHost.replace(/^http/, 'ws') + '/ws';
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  return 'ws://localhost:8080/ws';
}

export function useStompClient({ subscriptions, enabled = true }: UseStompClientOptions) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    
    const client = new Client({
      brokerURL: getWsUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[STOMP]', str);
        }
      },
    });
    
    client.onConnect = () => {
      setConnected(true);
      subscriptions.forEach(({ topic, handler }) => {
        client.subscribe(topic, (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            handler(data);
          } catch (err) {
            console.error('Error parsing STOMP message:', err);
          }
        });
      });
    };
    
    client.onWebSocketClose = () => setConnected(false);
    client.onStompError = () => setConnected(false);
    
    client.activate();
    clientRef.current = client;
    
    return () => { client.deactivate(); };
  }, [enabled, /* subscriptions memo'd by caller */]);
  
  return { connected, client: clientRef.current };
}
```

### OrderConfirmationDialog.tsx
```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';
import { useRouter } from 'next/navigation';

interface OrderConfirmationDialogProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderConfirmationDialog({ orderId, isOpen, onClose }: OrderConfirmationDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Auto-focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);
  
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return; // only digits
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setStatus('idle');
    setErrorMessage('');
    
    // Auto-advance to next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all 4 digits entered
    if (value && index === 3 && newCode.every(d => d !== '')) {
      submitCode(newCode.join(''));
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const submitCode = async (fullCode: string) => {
    setStatus('verifying');
    try {
      await api.post(`/order/${orderId}/confirm`, { code: fullCode });
      setStatus('success');
      setTimeout(() => {
        router.push(`/order/${orderId}`);
      }, 1000);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || t('order.invalidCode') || 'Неверный код');
      setCode(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };
  
  // ... render JSX with AnimatePresence, 4 digit inputs, status indicators
}
```

### OrderItemStatusBadge.tsx
```tsx
'use client';

import { motion } from 'framer-motion';
import { Clock, Flame, CheckCircle2, Utensils, XCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  PENDING: { label: 'order.itemPending', color: 'text-zinc-400', icon: Clock, bg: 'bg-zinc-500/10' },
  PREPARING: { label: 'order.itemPreparing', color: 'text-amber-400', icon: Flame, bg: 'bg-amber-500/10' },
  READY: { label: 'order.itemReady', color: 'text-emerald-400', icon: CheckCircle2, bg: 'bg-emerald-500/10' },
  SERVED: { label: 'order.itemServed', color: 'text-blue-400', icon: Utensils, bg: 'bg-blue-500/10' },
  CANCELLED: { label: 'order.itemCancelled', color: 'text-red-400', icon: XCircle, bg: 'bg-red-500/10' },
};

interface OrderItemStatusBadgeProps {
  status: string;
  compact?: boolean;
}

export function OrderItemStatusBadge({ status, compact = false }: OrderItemStatusBadgeProps) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  
  return (
    <motion.span
      layout
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.color} ${config.bg}`}
    >
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {!compact && <span>{t(config.label) || status}</span>}
    </motion.span>
  );
}
```

---

## Риски и подводные камни (Edge Cases)

- **React 19 + Next.js 16:** `use()` для params unwrapping уже используется в order page — сохранить этот паттерн.
- **useStompClient dependencies:** Массив `subscriptions` передаётся как зависимость в useEffect. Нужно мемоизировать через `useMemo` в вызывающем коде, иначе бесконечный reconnect.
- **Confirmation dialog on mobile:** OTP-style inputs могут плохо работать с автозаполнением на iOS. Использовать `inputMode="numeric"` и `pattern="[0-9]*"`.
- **Race condition:** Гость вводит код одновременно с обновлением заказа через WebSocket. Нужно проверять `order.status` перед показом dialog.
- **Backward compatibility:** Старые заказы в БД имеют статус `PENDING_CONFIRMATION` (после миграции V15). Фронтенд должен корректно обрабатывать оба старых (`CREATED`/`COOKING`) и новых статуса.
- **Offline:** Если WebSocket отключён — кнопка "Обновить" для ручного refetch через TanStack Query.

---

## Порядок реализации для агента

> ⚠️ После каждого пункта — отметить [x]
> ⚠️ Бэкенд НЕ трогаем в этой задаче

### Frontend
- [x] 1. Создать `frontend/src/hooks/useStompClient.ts` — общий WebSocket хук.
- [x] 2. Создать `frontend/src/components/guest/OrderItemStatusBadge.tsx` — бейдж статуса позиции.
- [x] 3. Создать `frontend/src/components/guest/OrderConfirmationDialog.tsx` — диалог ввода 4-значного кода.
- [x] 4. Обновить `frontend/src/components/guest/CartDrawer.tsx`:
  - [x] 4a. После `createOrder()` — показать `OrderConfirmationDialog` вместо redirect.
  - [x] 4b. Передать `orderId` и callback'и in dialog.
- [x] 5. Обновить `frontend/src/app/(guest)/order/[orderId]/page.tsx`:
  - [x] 5a. Обновить `STATUS_FLOW` на новые статусы (PENDING_CONFIRMATION, CONFIRMED, PREPARING, READY, SERVED).
  - [x] 5b. Добавить per-item статусы с `OrderItemStatusBadge`.
  - [x] 5c. Обработка нового event `ITEM_STATUS_CHANGED`.
  - [x] 5d. Показ `OrderConfirmationDialog` если статус = PENDING_CONFIRMATION.
  - [x] 5e. Заменить inline STOMP на `useStompClient`.
- [x] 6. Обновить `frontend/src/app/(staff)/dashboard/page.tsx`:
  - [x] 6a. Обновить для новых статусов и confirmation code отображения.
  - [x] 6b. Заменить inline STOMP на `useStompClient`.
- [x] 7. Обновить `frontend/src/app/(staff)/kitchen/page.tsx`:
  - [x] 7a. Показывать только CONFIRMED заказы + items в PENDING/PREPARING.
  - [x] 7b. Добавить кнопку "Взять в работу".
  - [x] 7c. Per-item кнопки "Готово".
  - [x] 7d. Заменить inline STOMP на `useStompClient`.
- [x] 8. Обновить `frontend/src/components/staff/OrderQueueCard.tsx` — новые статусы, confirmation code display.
- [x] 9. Обновить `frontend/src/components/staff/KitchenOrderCard.tsx` — per-item статусы и кнопки.
- [x] 10. Обновить `frontend/src/app/(guest)/receipt/page.tsx` — заменить inline STOMP на `useStompClient`.
- [x] 11. Добавить i18n ключи в `ru.json`, `en.json`, `by.json`.
- [x] 12. `cd frontend && pnpm run build` — финальная проверка сборки.

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта должно производиться **СТРОГО в кодировке UTF-8**. CP1251 ЗАПРЕЩЕНО.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update 2026-07-08: TASK_30 Frontend Order Confirmation Flow`.
3. [ ] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [ ] Синхронизируй `ROADMAP.md`.
5. [ ] Перемести файл из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [ ] Протестируй руками (гайд ниже).

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить: `docker compose up -d`, `.\mvnw.cmd spring-boot:run`, `cd frontend && pnpm run dev`
2. **Гостевой flow (мобильный вид, 375px):**
   - Открыть `/menu/{slug}/{tableId}` — добавить 2-3 блюда в корзину.
   - Нажать "Оформить заказ" — должен появиться dialog с 4-мя полями ввода кода.
   - Текст: "Назовите номер столика официанту для получения кода".
   - Ввести неверный код → ошибка "Неверный код".
   - Получить код от "официанта" (из staff dashboard) → ввести корректный код → redirect на order tracking.
3. **Страница отслеживания заказа:**
   - Статус timeline: PENDING_CONFIRMATION → CONFIRMED → PREPARING → READY → SERVED.
   - Каждая позиция показывает индивидуальный бейдж статуса.
   - WebSocket обновления приходят в реальном времени.
4. **Staff Dashboard:**
   - Новый заказ появляется с confirmation code крупным шрифтом.
   - Статусы корректно маппятся на русские названия.
5. **Kitchen (KDS):**
   - Заказы появляются после подтверждения кода.
   - Кнопка "Взять в работу" → items → PREPARING.
   - Per-item кнопки "Готово" → item → READY.
6. **Переключить язык EN/BY** — проверить переводы новых ключей.
