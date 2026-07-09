# TASK: Премиальный SaaS-лендинг QTab — главная страница продукта

**Дата создания:** 2026-07-07  
**Приоритет:** High  
**Фаза:** Phase 2  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Claude Sonnet 4.6 (Thinking)

---

## Цель

Заменить дефолтную заглушку Next.js на премиальный SaaS-лендинг для продукта QTab. Лендинг должен производить WOW-эффект с первых секунд: тёмная тема, золотые акценты, glassmorphism-карточки, плавные scroll-анимации, интерактивные элементы. Страница включает Hero, социальное доказательство, демонстрацию модулей, пошаговый флоу «Как это работает», тарифные планы, форму запроса демо, FAQ и футер.

---

## Контекст

- **Зависит от:** TASK_04 (Tailwind v4 тема, шрифты, провайдеры)
- **Затрагивает:** Frontend only
- **Связанный контракт:** Не требует API (статичная страница, форма демо — `mailto:` или внешний сервис)

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — Tailwind CSS v4 (стили через CSS переменные, `@theme`), React 19, шрифты Inter + Playfair Display.
- **Выжимка из KNOWN_ISSUES:**
  - Tailwind v4: конфигурация через `globals.css`, не `tailwind.config.js`.
  - `'use client'` обязателен для компонентов с `useState`, `useEffect`, `onClick`, Framer Motion анимациями.
  - `next/image` требует `style={{ height: "auto" }}` если Tailwind v4 переопределяет размеры.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — текущий прогресс.

---

## 🎨 Дизайн-система лендинга (Design Tokens)

### Цветовая палитра

Лендинг использует существующую тёмную тему проекта, расширенную дополнительными градиентами и акцентами:

```
Основные:
  --background:        #0F0F0F     (глубокий чёрный фон)
  --foreground:        #FAFAF8     (молочный белый текст)
  --primary:           #D4A853     (золотой акцент — CTA кнопки, заголовки)
  --card:              #1A1A2E     (фон карточек — тёмно-индиго)

Расширенные (добавить в globals.css):
  --primary-light:     #E8C97A     (светлое золото — hover состояния)
  --primary-dark:      #B8923F     (тёмное золото — active состояния)
  --card-hover:        #22223A     (фон карточки при hover)
  --surface:           #141420     (промежуточный фон секций)
  --surface-elevated:  #1E1E32     (приподнятые элементы)
  --muted:             #8B8BA3     (вторичный текст, подписи)
  --border:            #2A2A3E     (границы, разделители)
  --success:           #34D399     (зелёный — бесплатный тариф)
  --accent-blue:       #3B82F6     (синий — акцент для модулей)
  --accent-purple:     #8B5CF6     (фиолетовый — AI модуль)
  --accent-orange:     #F59E0B     (оранжевый — аналитика)

Градиенты:
  --gradient-gold:     linear-gradient(135deg, #D4A853 0%, #F0D48A 50%, #D4A853 100%)
  --gradient-hero:     radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.15) 0%, transparent 60%)
  --gradient-card:     linear-gradient(180deg, rgba(26,26,46,0.8) 0%, rgba(20,20,32,0.95) 100%)
  --gradient-cta:      linear-gradient(135deg, #D4A853 0%, #B8923F 100%)
```

### Типографика

```
Заголовки секций (h2):     font-family: Playfair Display; font-size: 48px; font-weight: 700; line-height: 1.2
Подзаголовки секций:       font-family: Inter; font-size: 20px; font-weight: 400; color: var(--muted); line-height: 1.6
Hero заголовок (h1):       font-family: Playfair Display; font-size: 64px (desktop) / 40px (mobile); font-weight: 700
Hero подзаголовок:         font-family: Inter; font-size: 22px; font-weight: 400; color: var(--muted)
Карточки — заголовок:      font-family: Inter; font-size: 22px; font-weight: 600
Карточки — описание:       font-family: Inter; font-size: 16px; font-weight: 400; color: var(--muted)
Кнопки CTA:                font-family: Inter; font-size: 18px; font-weight: 600; letter-spacing: 0.02em
Цена — сумма:              font-family: Inter; font-size: 56px; font-weight: 700
Цена — период:             font-family: Inter; font-size: 16px; font-weight: 400; color: var(--muted)
Навигация:                 font-family: Inter; font-size: 15px; font-weight: 500
```

### Отступы и сетка

```
Контейнер:                 max-width: 1280px; margin: 0 auto; padding: 0 24px (mobile) / 0 48px (desktop)
Вертикальные отступы секций: padding: 120px 0 (desktop) / 80px 0 (mobile)
Межсекционный разделитель:  height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent)
Карточки gap:               gap: 24px (desktop) / 16px (mobile)
Border-radius карточек:     16px
Border-radius кнопок CTA:   12px (основные) / 999px (pill-shaped навигационные)
```

### Анимации (добавить в globals.css)

```css
/* Мягкое появление снизу при скролле */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Мерцание золотой линии */
@keyframes glow-line {
  0%, 100% { opacity: 0.3; width: 60px; }
  50% { opacity: 1; width: 100px; }
}

/* Плавающие частицы фона Hero */
@keyframes float-particle {
  0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0.3; }
  25% { transform: translateY(-30px) translateX(15px) rotate(90deg); opacity: 0.6; }
  50% { transform: translateY(-15px) translateX(-10px) rotate(180deg); opacity: 0.4; }
  75% { transform: translateY(-40px) translateX(20px) rotate(270deg); opacity: 0.7; }
}

/* Пульсация CTA кнопки */
@keyframes pulse-cta {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212, 168, 83, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(212, 168, 83, 0); }
}

/* Вращение иконки */
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Счётчик чисел (для соцдоказательств) */
@keyframes count-up {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

/* Градиентный бордер карточки */
@keyframes border-gradient-rotate {
  0% { --angle: 0deg; }
  100% { --angle: 360deg; }
}
```

---

## 📐 Секции лендинга (детальное описание каждой)

### СЕКЦИЯ 1: Навигация (Sticky Header)

**Позиционирование:** `position: sticky; top: 0; z-index: 50;`  
**Фон:** `background: rgba(15, 15, 15, 0.8); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border);`  
**Высота:** `72px`  
**Поведение при скролле:** Появляется тень `box-shadow: 0 4px 30px rgba(0,0,0,0.3)` после скролла > 50px.

**Содержимое (слева направо):**
1. **Логотип:** Текст «QTab» шрифтом Playfair Display, 24px, bold, цвет `--primary`. Точка в «o» заменена на эмодзи 🍽️ или золотой dot. Рядом маленький badge `SaaS` в pill-shape (border: 1px solid --primary, font-size: 11px, padding: 2px 8px).
2. **Навигационные ссылки (desktop):** `Возможности` | `Как это работает` | `Тарифы` | `FAQ` — smooth scroll к якорям. Hover: цвет → `--primary`, underline animation (золотая линия расширяется слева).
3. **Кнопки (справа):**
   - `Войти` — ghost button (border: 1px solid var(--border), background: transparent). Hover: background → var(--card).
   - `Получить демо` — solid button (background: var(--gradient-cta), color: #0F0F0F, font-weight: 600). Hover: brightness(1.1). Animation: subtle `pulse-cta`.

**Мобильная версия (<768px):** Бургер-меню (lucide: `Menu`). При открытии — fullscreen overlay с `backdrop-filter: blur(30px)`, навигация вертикально по центру, крупные ссылки (24px). Закрытие по `X` (lucide: `X`) или по клику вне.

---

### СЕКЦИЯ 2: Hero (Главный экран)

**Высота:** `min-height: 100vh; display: flex; align-items: center;`  
**Фон:** Многослойный:
1. Base: `var(--background)` (#0F0F0F)
2. Radial gradient: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,168,83,0.12) 0%, transparent 70%)` — тёплое свечение сверху
3. Decorative grid: `background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 60px 60px; opacity: 0.15;` — сетка как у tech-продуктов
4. Floating particles: 5-7 абсолютно позиционированных `<div>` размером 4-8px, золотой цвет, размытие blur(2px), анимация `float-particle` с разными `animation-delay` и `animation-duration` (8s-15s).

**Содержимое (по центру, text-align: center):**

1. **Pill-badge сверху:** `<span>` с текстом `🚀 Революция в ресторанном бизнесе` — border: 1px solid rgba(212,168,83,0.3), background: rgba(212,168,83,0.08), border-radius: 999px, padding: 8px 20px, font-size: 14px, color: var(--primary). Framer Motion: fadeIn + slight scaleUp при маунте.

2. **Заголовок H1:**
   ```
   Цифровое меню
   нового поколения
   ```
   - font-family: Playfair Display
   - font-size: 72px (desktop) / 42px (mobile)
   - font-weight: 700
   - line-height: 1.1
   - Слово **«нового»** выделено gradient text: `background: var(--gradient-gold); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`
   - Framer Motion: `initial={{ opacity: 0, y: 30 }}, animate={{ opacity: 1, y: 0 }}, transition={{ duration: 0.8, delay: 0.2 }}`

3. **Подзаголовок:**
   ```
   От QR-кода на столике до AI-аналитики — полная цифровая
   трансформация вашего ресторана за один день. Без приложений.
   Работает в любом браузере.
   ```
   - font-size: 20px (desktop) / 17px (mobile)
   - color: var(--muted)
   - max-width: 640px
   - margin-top: 24px
   - Framer Motion: fadeIn с delay: 0.4

4. **CTA кнопки (flex row, gap: 16px, margin-top: 40px):**
   - **Основная:** `Попробовать бесплатно` — background: var(--gradient-cta), color: #0F0F0F, padding: 16px 36px, border-radius: 12px, font-size: 18px, font-weight: 600. Hover: scale(1.03), box-shadow: 0 8px 32px rgba(212,168,83,0.3). Рядом с текстом иконка lucide: `ArrowRight` (16px). Animation: `pulse-cta` infinite.
   - **Вторичная:** `Смотреть демо` — border: 1px solid var(--border), background: transparent, color: var(--foreground). Hover: background: var(--card), border-color: var(--primary). Иконка lucide: `Play` (16px) слева.
   - Framer Motion: stagger animation, delay: 0.6

5. **Социальное доказательство под кнопками (margin-top: 48px):**
   - Три элемента в строку (flex, gap: 32px):
     - `✓ Бесплатный тестовый период`
     - `✓ Настройка за 15 минут`
     - `✓ Без установки приложений`
   - font-size: 14px, color: var(--muted)
   - Галочки — цвет var(--success)

6. **Hero-иллюстрация (ниже текста, margin-top: 64px):**
   - Макет мобильного телефона с интерфейсом QTab (генерировать через `generate_image` — мокап мобильного приложения QR-меню ресторана на тёмном фоне с золотыми акцентами)
   - Обернуть в div с `perspective: 1000px; transform: rotateX(5deg) rotateY(-5deg);` — лёгкий 3D-эффект
   - Glow-эффект под телефоном: `box-shadow: 0 40px 100px rgba(212,168,83,0.15);`
   - Framer Motion: `initial={{ opacity: 0, y: 60, scale: 0.9 }}, animate={{ opacity: 1, y: 0, scale: 1 }}, transition={{ duration: 1, delay: 0.8 }}`

---

### СЕКЦИЯ 3: Социальное доказательство (Stats Bar)

**Фон:** `var(--surface)` с верхним и нижним border-gradient разделителем  
**Padding:** `60px 0`  
**Layout:** 4 колонки на desktop, 2x2 на mobile

**Статистики (counter animation при скролле в viewport):**

| Число | Подпись | Иконка (lucide) |
|-------|---------|-----------------|
| `500+` | Ресторанов подключено | `Store` |
| `2M+` | Заказов обработано | `ShoppingBag` |
| `15 мин` | Среднее время настройки | `Clock` |
| `98%` | Клиентов довольны | `Heart` |

- Числа: font-size: 48px, font-weight: 700, color: var(--primary)
- Подписи: font-size: 16px, color: var(--muted)
- Иконки: 24px, color: var(--primary), margin-bottom: 12px
- Между колонками — вертикальный разделитель 1px var(--border) (только desktop)
- **Counter animation:** Числа анимируются от 0 до целевого значения за 2 секунды при появлении в viewport (использовать `useEffect` + `IntersectionObserver` + `requestAnimationFrame`)
- Framer Motion: `whileInView={{ opacity: 1, y: 0 }}, initial={{ opacity: 0, y: 30 }}`

---

### СЕКЦИЯ 4: Возможности системы (Features / Модули)

**Якорь:** `id="features"`  
**Padding:** `120px 0`

**Заголовок секции (по центру):**
- Pill-badge: `Возможности` (аналог hero badge, но с иконкой lucide: `Sparkles`)
- H2: `Всё, что нужно вашему ресторану` — Playfair Display, 48px
- Подзаголовок: `Четыре модуля, которые превращают обычный ресторан в цифровое пространство нового поколения` — Inter, 18px, color: var(--muted), max-width: 600px
- Золотая декоративная линия под заголовком: `width: 80px; height: 3px; background: var(--gradient-gold); border-radius: 2px; margin: 24px auto 0;`

**Карточки модулей (4 штуки, grid: 2 колонки desktop / 1 колонка mobile, gap: 24px):**

Каждая карточка — glassmorphism-стиль:
```css
background: linear-gradient(180deg, rgba(26,26,46,0.6) 0%, rgba(20,20,32,0.9) 100%);
border: 1px solid var(--border);
border-radius: 20px;
padding: 40px;
backdrop-filter: blur(10px);
transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

/* Hover */
&:hover {
  border-color: rgba(212, 168, 83, 0.3);
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

**Карточка 1: 📱 QR-Меню для гостей (Guest PWA)**
- Иконка: lucide `QrCode`, 40px, цвет: `var(--primary)`, фон: `rgba(212,168,83,0.1)`, border-radius: 12px, padding: 12px
- Заголовок: `QR-Меню для гостей`
- Описание: `Гость сканирует QR-код — и моментально получает полноценное меню с фотографиями, фильтрами по аллергенам и модификаторами блюд. Заказ, вызов официанта и оплата — прямо с телефона.`
- Теги-фичи (flex wrap, gap: 8px): 
  - `Поиск по меню` | `Фильтры аллергенов` | `Комментарии к блюдам` | `Real-time статус заказа` | `Вызов официанта` | `Онлайн-оплата`
  - Стиль тега: `background: rgba(212,168,83,0.08); border: 1px solid rgba(212,168,83,0.2); color: var(--primary); font-size: 13px; padding: 4px 12px; border-radius: 6px;`

**Карточка 2: 🖥️ Панель персонала (Staff Dashboard)**
- Иконка: lucide `LayoutDashboard`, 40px, цвет: `var(--accent-blue)`
- Заголовок: `Панель персонала`
- Описание: `Интерактивная карта зала с live-статусами столиков, очередь заказов для официантов и кухонный терминал KDS. Мигающие уведомления о вызовах и звуковые оповещения не дадут пропустить ни одного запроса.`
- Теги: `Карта зала` | `Очередь заказов` | `Кухонный KDS` | `Звуковые алерты` | `Таймеры ожидания`
- Стиль тега: аналог, но цвет `var(--accent-blue)`, фон `rgba(59,130,246,0.08)`, бордер `rgba(59,130,246,0.2)`

**Карточка 3: ⚙️ Админ-панель (Admin Panel)**
- Иконка: lucide `Settings`, 40px, цвет: `var(--accent-orange)`
- Заголовок: `Админ-панель`
- Описание: `Полный контроль над рестораном: редактор меню с drag-and-drop, управление персоналом и сменами, акции и промокоды, финансовая отчётность с экспортом в PDF. Настройте за минуты — управляйте годами.`
- Теги: `Редактор меню` | `Стоп-лист` | `Управление персоналом` | `Акции и промо` | `Финансовые отчёты` | `QR-генератор`
- Стиль тега: цвет `var(--accent-orange)`, фон `rgba(245,158,11,0.08)`

**Карточка 4: 🤖 AI-Аналитика**
- Иконка: lucide `Brain`, 40px, цвет: `var(--accent-purple)`
- Заголовок: `AI-Аналитика`
- Описание: `Умный помощник на базе Gemini AI анализирует отзывы, прогнозирует загрузку зала, рекомендует изменения в меню и повышает средний чек через персонализированные предложения.`
- Теги: `Анализ отзывов` | `Прогноз загрузки` | `Рекомендации для меню` | `AI-ассистент` | `Средний чек`
- Стиль тега: цвет `var(--accent-purple)`, фон `rgba(139,92,246,0.08)`

**Framer Motion:** Каждая карточка — `whileInView`, stagger 0.15s, `initial={{ opacity: 0, y: 40 }}`, `animate={{ opacity: 1, y: 0 }}`.

---

### СЕКЦИЯ 5: Как это работает (How It Works)

**Якорь:** `id="how-it-works"`  
**Фон:** `var(--background)` с тонким radial gradient вверху  
**Padding:** `120px 0`

**Заголовок:** `Запуск за 4 простых шага` — Playfair Display, 48px, по центру. Подзаголовок: `От регистрации до первого заказа гостя — менее 15 минут`

**4 шага — горизонтальная timeline на desktop / вертикальная на mobile:**

Каждый шаг — это круг с номером, соединённый линией со следующим.

**Шаг 1:**
- Номер в круге: `1` — circle 56px, background: var(--gradient-gold), color: #0F0F0F, font-weight: 700, font-size: 22px
- Соединительная линия: `width: 100% (растягивается); height: 2px; background: linear-gradient(90deg, var(--primary), var(--border));`
- Иконка: lucide `UserPlus` 28px, цвет primary
- Заголовок: `Регистрация` — 20px, font-weight: 600
- Описание: `Создайте аккаунт, укажите название ресторана и загрузите логотип. Это займёт 2 минуты.` — 15px, color: var(--muted)

**Шаг 2:**
- Номер: `2`
- Иконка: lucide `UtensilsCrossed` 28px
- Заголовок: `Настройте меню`
- Описание: `Добавьте категории и блюда с фотографиями, ценами и модификаторами. Или импортируйте из Excel.`

**Шаг 3:**
- Номер: `3`
- Иконка: lucide `QrCode` 28px
- Заголовок: `Распечатайте QR-коды`
- Описание: `Система автоматически сгенерирует уникальный QR-код для каждого столика. Скачайте PDF и распечатайте.`

**Шаг 4:**
- Номер: `4`
- Иконка: lucide `Rocket` 28px
- Заголовок: `Принимайте заказы!`
- Описание: `Гости сканируют QR, выбирают блюда и заказывают. Вы видите всё в реальном времени на панели управления.`

**Framer Motion:** Шаги появляются последовательно при скролле (stagger 0.2s).  
**Важно:** На mobile timeline вертикальная, линия идёт вниз, шаги — друг под другом.

---

### СЕКЦИЯ 6: Почему QTab? (Advantages / Сравнение)

**Фон:** `var(--surface)`  
**Padding:** `120px 0`

**Заголовок:** `Почему рестораны выбирают QTab` — Playfair Display, 48px

**Grid 3 колонки (desktop) / 1 колонка (mobile), gap: 24px:**

6 карточек-преимуществ, каждая:
```css
background: var(--card);
border: 1px solid var(--border);
border-radius: 16px;
padding: 32px;
text-align: center;
```

| Иконка (lucide) | Заголовок | Описание |
|---|---|---|
| `Zap` (primary) | `Мгновенная настройка` | `15 минут от регистрации до первого заказа. Никакого оборудования или установки ПО.` |
| `Globe` (accent-blue) | `Работает в браузере` | `Гостям не нужно скачивать приложение. Откройте камеру, наведите на QR — готово.` |
| `TrendingUp` (success) | `+25% к среднему чеку` | `AI-рекомендации и удобный интерфейс увеличивают средний чек на 15-30%.` |
| `Clock` (accent-orange) | `Экономия времени` | `Официанты обслуживают на 40% больше столиков. Кухня видит заказы мгновенно.` |
| `Shield` (accent-purple) | `Безопасность данных` | `Шифрование, RBAC, изоляция данных между ресторанами. Соответствие GDPR.` |
| `HeadphonesIcon` (primary) | `Поддержка 24/7` | `Персональный менеджер, чат поддержки и база знаний. Мы всегда рядом.` |

Иконки в кругах: `width: 56px; height: 56px; border-radius: 12px; background: rgba(color, 0.1);` — где color соответствует цвету иконки.

**Framer Motion:** whileInView stagger 0.1s.

---

### СЕКЦИЯ 7: Тарифные планы (Pricing)

**Якорь:** `id="pricing"`  
**Фон:** `var(--background)` с radial gradient (как Hero, но слабее)  
**Padding:** `120px 0`

**Заголовок:** `Тарифы, которые растут вместе с вами` — Playfair Display, 48px.  
**Подзаголовок:** `Начните бесплатно. Масштабируйтесь, когда будете готовы.`

**Переключатель периода:** `Месяц / Год (-20%)` — pill toggle с анимацией.  
- Стиль: `background: var(--card); border: 1px solid var(--border); border-radius: 999px; padding: 4px;`
- Активный таб: `background: var(--primary); color: #0F0F0F; border-radius: 999px; padding: 8px 24px;`
- При переключении цены анимированно меняются (Framer Motion AnimatePresence, scale + fade)

**3 карточки тарифов + 1 Enterprise (grid: 4 колонки desktop / 1 колонка mobile):**

#### Тариф 1: Free / Демо
```
Фон: var(--card)
Border: 1px solid var(--border)
Badge: (нет)
```
- Название: `Демо` — 22px, font-weight: 600
- Цена: `0 BYN` — 56px, font-weight: 700, color: var(--success)
- Период: `/месяц` — 16px, color: var(--muted)
- Описание: `Для ознакомления с возможностями системы`
- Разделитель: `hr` (gradient)
- Фичи (список с галочками ✓ зелёного цвета):
  - ✓ До 5 столиков
  - ✓ QR-меню для гостей
  - ✓ Базовая панель персонала
  - ✓ 1 аккаунт персонала
  - ✗ Онлайн-оплата (серый, перечеркнутый)
  - ✗ AI-аналитика (серый)
  - ✗ Кастомизация бренда (серый)
- Кнопка: `Начать бесплатно` — ghost button (border: 1px solid var(--border))
- Сноска: `Водяной знак QTab` — 12px, color: var(--muted)

#### Тариф 2: Starter
```
Фон: var(--card)
Border: 1px solid var(--border)
Badge: (нет)
```
- Название: `Стартовый`
- Цена: `50 BYN` (месяц) / `480 BYN` (год — экономия 120)
- Период: `/месяц`
- Описание: `Для небольших кафе и кофеен`
- Фичи:
  - ✓ До 20 столиков
  - ✓ Полное QR-меню с модификаторами
  - ✓ Staff Dashboard + KDS
  - ✓ До 5 аккаунтов персонала
  - ✓ Онлайн-оплата (ЕРИП, карты)
  - ✓ Базовая аналитика
  - ✗ AI-аналитика (серый)
  - ✗ Бронирование (серый)
- Кнопка: `Выбрать тариф` — solid gold button

#### Тариф 3: Business (РЕКОМЕНДУЕМЫЙ — выделен!)
```
Фон: linear-gradient(180deg, rgba(212,168,83,0.08) 0%, var(--card) 40%)
Border: 1px solid rgba(212,168,83,0.4)  ← золотой бордер!
Transform: scale(1.03) ← чуть больше остальных
Box-shadow: 0 0 60px rgba(212,168,83,0.1)
```
- **Badge вверху:** `Популярный выбор` — background: var(--gradient-gold), color: #0F0F0F, font-size: 12px, font-weight: 700, padding: 4px 16px, border-radius: 999px, position: absolute, top: -14px, left: 50%, transform: translateX(-50%).
- Название: `Бизнес`
- Цена: `120 BYN` (месяц) / `1 150 BYN` (год) — цвет var(--primary)
- Описание: `Для ресторанов, стремящихся к максимуму`
- Фичи:
  - ✓ **Безлимитные** столики
  - ✓ Всё из тарифа «Стартовый»
  - ✓ AI-аналитика и рекомендации
  - ✓ Онлайн-бронирование столиков
  - ✓ Безлимит аккаунтов персонала
  - ✓ Программа лояльности
  - ✓ Полная кастомизация бренда
  - ✓ Приоритетная поддержка
- Кнопка: `Выбрать тариф` — solid gold button, **animation: pulse-cta**

#### Тариф 4: Enterprise
```
Фон: var(--card)
Border: 1px solid var(--border)
```
- Название: `Корпоративный`
- Цена: `По запросу` — 36px
- Описание: `Для сетей ресторанов и франшиз`
- Фичи:
  - ✓ Мультифилиальность
  - ✓ White-label решение
  - ✓ Выделенный сервер
  - ✓ Кастомные интеграции (POS, 1С, ERP)
  - ✓ SLA 99.9%
  - ✓ Персональный менеджер
- Кнопка: `Связаться с нами` — ghost button

**Framer Motion:** Карточки — whileInView stagger. Рекомендуемая карточка появляется с лёгким scale bounce.

---

### СЕКЦИЯ 8: Запросить демо / CTA

**Якорь:** `id="demo"`  
**Фон:** Градиентный — `linear-gradient(180deg, var(--background) 0%, var(--surface) 100%);`  
**Padding:** `120px 0`

**Layout:** 2 колонки (desktop) / 1 колонка (mobile)

**Левая часть (текстовая):**
- H2: `Готовы трансформировать ваш ресторан?` — Playfair Display, 42px
- Подзаголовок: `Оставьте заявку — мы свяжемся с вами в течение часа, проведём демонстрацию и поможем настроить систему под ваш бизнес. Абсолютно бесплатно.` — 18px, color: var(--muted)
- Перечень (иконки + текст):
  - ✨ Персональная демонстрация за 30 минут
  - 🎁 14 дней полного доступа бесплатно
  - 🛠️ Помощь в первоначальной настройке
  - 📞 Выделенный менеджер

**Правая часть (форма):**

Glassmorphism-карточка формы:
```css
background: rgba(26, 26, 46, 0.6);
border: 1px solid var(--border);
border-radius: 20px;
padding: 40px;
backdrop-filter: blur(10px);
```

**Поля формы:**
1. `Имя` — input text, placeholder: «Александр», иконка lucide: `User`
2. `Название ресторана` — input text, placeholder: «Чайхона №1», иконка lucide: `Store`
3. `Телефон или Email` — input text, placeholder: «+375 29 123-45-67 или email@example.com», иконка lucide: `Phone`
4. `Количество столиков` — select: `До 10` | `10-30` | `30-50` | `50-100` | `100+`, иконка lucide: `Table`
5. `Комментарий` — textarea, placeholder: «Расскажите о вашем заведении...», 3 строки, необязательное

**Стиль инпутов:**
```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 12px;
padding: 14px 16px 14px 44px; /* место для иконки слева */
color: var(--foreground);
font-size: 16px;
transition: border-color 0.3s;

&:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(212, 168, 83, 0.15);
}

&::placeholder {
  color: var(--muted);
  opacity: 0.6;
}
```

**Кнопка отправки:** `Получить демо-доступ` — full-width, background: var(--gradient-cta), color: #0F0F0F, padding: 16px, font-size: 18px, font-weight: 600, border-radius: 12px. Hover: brightness(1.1), scale(1.01).

**Поведение формы:** Так как бэкенд пока не имеет эндпоинта для демо-заявок, реализовать 2 варианта:
1. **Основной (MVP):** `mailto:` link — при отправке формируется ссылка `mailto:info@qtab.by?subject=Заявка на демо: {restaurantName}&body=...` и открывается почтовый клиент. Одновременно показываем toast (sonner): «Заявка отправлена! Мы свяжемся с вами в ближайшее время 🎉».
2. **Альтернатива:** Данные формы сохраняются в `localStorage` как JSON-лог, показывается toast success.

**Privacy note под формой:** `Отправляя форму, вы соглашаетесь с обработкой персональных данных` — 13px, color: var(--muted).

---

### СЕКЦИЯ 9: FAQ (Часто задаваемые вопросы)

**Якорь:** `id="faq"`  
**Фон:** `var(--background)`  
**Padding:** `120px 0`

**Заголовок:** `Частые вопросы` — Playfair Display, 48px, по центру

**Аккордеон (max-width: 800px, margin: 0 auto):**

Каждый вопрос — раскрывающийся блок:
```css
border: 1px solid var(--border);
border-radius: 12px;
margin-bottom: 12px;
overflow: hidden;

/* Header (кликабельный) */
.faq-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  cursor: pointer;
  font-size: 17px;
  font-weight: 500;
  transition: background 0.3s;
}
.faq-header:hover { background: var(--card); }

/* Body (раскрытое) */
.faq-body {
  padding: 0 24px 20px;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
}
```
Иконка раскрытия: lucide `ChevronDown`, поворот 180° при открытии (Framer Motion rotate).  
Контент: Framer Motion `AnimatePresence` + `motion.div` с `initial={{ height: 0, opacity: 0 }}`, `animate={{ height: "auto", opacity: 1 }}`.

**Вопросы и ответы:**

1. **Нужно ли гостям устанавливать приложение?**
   → Нет. QTab работает как веб-приложение (PWA) прямо в браузере. Гость просто наводит камеру на QR-код — и меню открывается. Работает на любом смартфоне с iOS 14+ или Android 8+.

2. **Какое оборудование необходимо?**
   → Только распечатанные QR-коды для столиков (мы генерируем их автоматически) и устройство для персонала — подойдёт любой планшет, ноутбук или компьютер с браузером.

3. **Как работает оплата через систему?**
   → Гость может оплатить через ЕРИП (белорусская межбанковская система), банковской картой онлайн, либо традиционно — наличными или картой через терминал официанта.

4. **Можно ли кастомизировать меню под бренд ресторана?**
   → Да. На тарифе «Бизнес» доступна полная кастомизация: цвета, логотип, шрифты, баннеры, акции. Ваше меню будет выглядеть как собственное приложение.

5. **Поддерживаете ли вы несколько языков?**
   → Да. Меню можно оформить на русском, белорусском и английском языках. Система автоматически определяет язык браузера гостя.

6. **Что такое AI-аналитика?**
   → Система на базе Google Gemini AI анализирует отзывы гостей, выявляет тренды популярности блюд, прогнозирует загрузку ресторана и помогает оптимизировать меню для увеличения среднего чека.

7. **Есть ли бесплатный пробный период?**
   → Да! Тариф «Демо» полностью бесплатен и позволяет протестировать систему с 5 столиками. Для полного доступа мы предоставляем 14 дней бесплатно при запросе демонстрации.

---

### СЕКЦИЯ 10: Финальный CTA-блок (Before Footer)

**Фон:** Полноширинная полоса с `background: linear-gradient(135deg, rgba(212,168,83,0.1) 0%, rgba(139,92,246,0.05) 100%); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);`  
**Padding:** `80px 0`  
**Layout:** По центру, text-align: center.

- H3: `Начните принимать заказы через QR уже сегодня` — Playfair Display, 36px
- Подзаголовок: `Бесплатно. Без обязательств. За 15 минут.` — 18px, var(--muted)
- Кнопка: `Попробовать бесплатно →` — solid gold, большая (padding: 18px 48px), pulse-cta animation.

---

### СЕКЦИЯ 11: Футер (Footer)

**Фон:** `var(--surface)` (#141420)  
**Padding:** `80px 0 40px`

**Layout:** 4 колонки (desktop) / 2x2 (tablet) / 1 колонка (mobile)

**Колонка 1: Бренд**
- Логотип «QTab» (Playfair Display, 28px, цвет primary)
- Описание: `Инновационная SaaS-платформа для цифровизации ресторанного бизнеса` — 14px, var(--muted), max-width: 280px
- Соцсети (flex row, gap: 12px):
  - Telegram icon (lucide: `Send`) — link
  - Instagram icon (lucide: `Instagram`) — link
  - Email icon (lucide: `Mail`) — link
  - Каждая: 20px, color: var(--muted), hover: color: var(--primary), transition 0.3s

**Колонка 2: Продукт**
- Заголовок: `Продукт` — 14px, font-weight: 600, text-transform: uppercase, letter-spacing: 0.1em, color: var(--foreground), margin-bottom: 16px
- Ссылки (14px, color: var(--muted), hover: color var(--foreground)):
  - Возможности → #features
  - Тарифы → #pricing
  - FAQ → #faq
  - Документация → #

**Колонка 3: Компания**
- Заголовок: `Компания`
- Ссылки:
  - О нас → #
  - Блог → #
  - Карьера → #
  - Контакты → #

**Колонка 4: Юридическое**
- Заголовок: `Юридическое`
- Ссылки:
  - Политика конфиденциальности → #
  - Условия использования → #
  - Обработка данных → #

**Нижний бар (под колонками):**
- Разделитель: `border-top: 1px solid var(--border); padding-top: 24px; margin-top: 48px;`
- Слева: `© 2026 QTab. Все права защищены.` — 13px, var(--muted)
- Справа: `Сделано с ❤️ в Беларуси` — 13px, var(--muted)

---

## Затронутые файлы

### Создать новые

**Frontend:**
- `frontend/src/app/(public)/page.tsx` — или заменить `frontend/src/app/page.tsx` — главная страница лендинг.
- `frontend/src/components/landing/Navbar.tsx` — sticky навигация с прозрачным фоном, blur, бургер-меню.
- `frontend/src/components/landing/HeroSection.tsx` — Hero секция с анимациями, частицами, CTA.
- `frontend/src/components/landing/StatsBar.tsx` — Полоса социальных доказательств с animated counters.
- `frontend/src/components/landing/FeaturesSection.tsx` — 4 карточки модулей с тегами-фичами.
- `frontend/src/components/landing/HowItWorksSection.tsx` — 4-шаговый timeline.
- `frontend/src/components/landing/AdvantagesSection.tsx` — 6 карточек-преимуществ.
- `frontend/src/components/landing/PricingSection.tsx` — 4 тарифных плана с переключателем месяц/год.
- `frontend/src/components/landing/DemoRequestSection.tsx` — Форма запроса демо с glassmorphism.
- `frontend/src/components/landing/FaqSection.tsx` — Аккордеон с вопросами и ответами.
- `frontend/src/components/landing/CtaBanner.tsx` — Финальный CTA-блок.
- `frontend/src/components/landing/Footer.tsx` — Четырёхколоночный футер.
- `frontend/src/hooks/useCountUp.ts` — Кастомный хук для анимации счётчиков при скролле.
- `frontend/src/hooks/useScrollSpy.ts` — Хук для выделения активной секции навигации при скролле (опционально если не существует).

### Изменить существующие

- `frontend/src/app/page.tsx` — Полностью заменить дефолтную заглушку Next.js на лендинг (импорт и композиция всех секций).
- `frontend/src/app/globals.css` — Добавить новые дизайн-токены (--primary-light, --primary-dark, --surface, --muted, --border, --accent-*), добавить новые keyframes (fade-up, glow-line, float-particle, pulse-cta, count-up).
- `frontend/src/app/layout.tsx` — Обновить `<meta>` description для SEO лендинга, добавить OG-теги.

---

## Риски и подводные камни (Edge Cases)

- **Гидратация:** Лендинг — серверный компонент (SSR). Интерактивные части (Navbar бургер, FAQ аккордеон, Pricing переключатель, форма, counter animations, Framer Motion) — отдельные `'use client'` компоненты, которые импортируются в серверный page.
- **Производительность:** Много анимаций — убедиться, что используем `will-change: transform` и `transform` вместо `top/left` для GPU-ускорения. `IntersectionObserver` для ленивых анимаций (не анимировать то, что не в viewport).
- **SEO:** Лендинг должен быть SSR (серверный компонент page.tsx). Все текстовые блоки — в HTML, не в JS-переменных. Добавить `<title>`, `<meta description>`, OG-теги.
- **Мобильная адаптивность:** Breakpoints: 320px (min), 768px (tablet), 1024px (laptop), 1280px (desktop). Тестировать каждую секцию на 375px ширине.
- **Размер бандла:** Framer Motion — тяжёлая библиотека, но она уже в зависимостях. Использовать `lazy` imports для секций ниже fold.
- **Tailwind v4:** Все кастомные цвета должны быть через CSS переменные в `globals.css` и `@theme` директиву, НЕ через tailwind.config.js (его нет в Tailwind v4).

---

## Порядок реализации для агента

> ⚠️ После каждого пункта — отметить [x]
> ⚠️ Задача только Frontend — бэкенд не трогаем.

### Подготовка
- [ ] 1. Обновить `globals.css` — добавить все новые CSS переменные (дизайн-токены) и keyframes-анимации из секции «Дизайн-система».
- [ ] 2. Обновить `layout.tsx` — SEO мета-теги для лендинга.

### Компоненты (создавать в порядке появления на странице)
- [ ] 3. Создать `Navbar.tsx` — sticky навигация + бургер-меню.
- [ ] 4. Создать `HeroSection.tsx` — заголовок, CTA, декоративные частицы.
- [ ] 5. Создать `useCountUp.ts` — хук для animated counters.
- [ ] 6. Создать `StatsBar.tsx` — полоса с 4 статистиками.
- [ ] 7. Создать `FeaturesSection.tsx` — 4 glassmorphism-карточки модулей.
- [ ] 8. Создать `HowItWorksSection.tsx` — 4-шаговый timeline.
- [ ] 9. Создать `AdvantagesSection.tsx` — 6 карточек-преимуществ.
- [ ] 10. Создать `PricingSection.tsx` — тарифы с toggle месяц/год.
- [ ] 11. Создать `DemoRequestSection.tsx` — форма запроса демо.
- [ ] 12. Создать `FaqSection.tsx` — аккордеон.
- [ ] 13. Создать `CtaBanner.tsx` — финальный CTA.
- [ ] 14. Создать `Footer.tsx` — футер.

### Сборка страницы
- [ ] 15. Обновить `page.tsx` — импорт и композиция ВСЕХ секций в правильном порядке.
- [ ] 16. Генерация Hero-иллюстрации через `generate_image` (мокап мобильного интерфейса QR-меню).
- [ ] 17. `cd frontend && pnpm run build`

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Все файлы — СТРОГО UTF-8. CP1251 ЗАПРЕЩЕНА.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни `.\verify-all.ps1` в корне проекта.
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь `## Update 2026-07-XX: Реализация TASK_12 (Премиальный SaaS-лендинг QTab)` в конец.
3. [ ] Запусти `.\rotate-backup.ps1`.
4. [ ] Синхронизируй `ROADMAP.md` — если нужно, добавь пункт «Лендинг / Публичный сайт» и отметь `[x]`.
5. [ ] Перемести задачу из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [ ] Напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить: `cd frontend && pnpm run dev`.
2. Открыть `http://localhost:3000` — должна загрузиться главная страница лендинга QTab.
3. **Навигация:** Sticky header с размытым фоном. Клик по ссылкам — smooth scroll к секциям. На мобильном (<768px) — бургер-меню с fullscreen overlay.
4. **Hero:** Золотой gradient текст «нового поколения», плавающие частицы на фоне, пульсирующая CTA-кнопка. Мокап телефона с 3D-перспективой.
5. **Stats:** Счётчики анимируются от 0 до значения при скролле в viewport.
6. **Модули:** 4 glassmorphism-карточки с hover-эффектом (подъём + золотой бордер). Теги-фичи в цветах каждого модуля.
7. **Как это работает:** Timeline из 4 шагов, появление при скролле.
8. **Тарифы:** Переключатель Месяц/Год меняет цены с анимацией. Карточка «Бизнес» выделена золотым бордером и масштабом.
9. **Форма демо:** Все поля стилизованы, при фокусе — золотой бордер. При отправке — toast «Заявка отправлена».
10. **FAQ:** Аккордеон раскрывается/закрывается с плавной анимацией.
11. **Футер:** 4 колонки, соцсети с hover, copyright.
12. **Responsive:** Проверить на 375px, 768px, 1024px, 1440px — всё должно корректно адаптироваться.
