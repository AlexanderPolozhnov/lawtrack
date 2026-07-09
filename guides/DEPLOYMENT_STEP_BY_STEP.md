# Пошаговое руководство по продакшн-деплою QTab

Это подробная инструкция по развёртыванию мультитенантной системы **QTab** (бэкенд Spring Boot 3, фронтенд Next.js 16, PostgreSQL, Redis) на бесплатных облачных платформах.

---

## 🏗 Общая архитектура деплоя

| Компонент | Платформа | Роль | Тариф |
|---|---|---|---|
| **DNS & CDN & WAF** | **Cloudflare** | Защита от DDoS, SSL/TLS, проксирование трафика | Бесплатный (Free) |
| **Frontend** | **Vercel** | Хостинг Next.js 16 (App Router, PWA, SSR) | Бесплатный (Hobby) |
| **Backend** | **Render** | Docker-контейнер со Spring Boot 3 (Java 21) | Бесплатный (Free Web Service) |
| **База данных** | **Neon** | Serverless PostgreSQL для хранения данных | Бесплатный (Free) |
| **Кэш & Сессии** | **Upstash** | Serverless Redis для сессий и кэширования меню | Бесплатный (Free) |

---

## 📌 Шаг 1. Подготовка домена и DNS в Cloudflare

Мы хотим, чтобы сервис был доступен по красивым адресам:
* Фронтенд (гость/админ PWA): `https://qtab.xyz` (или `www.qtab.xyz`)
* Бэкенд API / WebSockets: `https://api.qtab.xyz`

1. **Зарегистрируйтесь в [Cloudflare](https://dash.cloudflare.com/)**.
2. Нажмите **Add Site** и введите ваш домен (например, `qtab.xyz`). Выберите бесплатный тариф (Free Plan).
3. Cloudflare выдаст вам два DNS-сервера (Nameservers).
4. Зайдите к вашему регистратору домена (Reg.ru, Namecheap и т.д.) и укажите эти NS-серверы для вашего домена.
5. В Cloudflare перейдите в раздел **SSL/TLS -> Overview** и выберите режим **Full (strict)**. Это гарантирует сквозное шифрование от клиента до Vercel/Render.

---

## 📌 Шаг 2. Создание базы данных PostgreSQL в Neon

Мы используем **Neon** (Serverless Postgres), так как у него **вечный бесплатный тариф** (база не засыпает насовсем и не удаляется через 90 дней, как у Render) и она мгновенно "просыпается" при обращении.

1. Зарегистрируйтесь на [Neon](https://neon.tech/).
2. Создайте новый проект:
   * **Project Name:** `qtab-db`
   * **Postgres Version:** 16 (или выше)
   * **Region:** Франкфурт (Frankfurt / EU Central) или ближайший к вашему бэкенду.
3. Нажмите **Create project**.
4. В дашборде проекта в блоке **Connection Details** скопируйте общую строку подключения **Connection string** (DATABASE_URL). Она понадобится для настройки бэкенда на Render.

---

## 📌 Шаг 3. Создание Redis в Upstash

QTab использует Redis для кэширования меню и хранения гостевых сессий. Мы используем **Upstash** (Serverless Redis), так как он предлагает отличный бесплатный лимит (10 000 запросов в день) и никогда не засыпает.

1. Зарегистрируйтесь на [Upstash](https://upstash.com/).
2. Перейдите во вкладку **Redis** и нажмите **Create Database**:
   * **Name:** `qtab-redis`
   * **Region:** Frankfurt (EU-Central) — для минимальной задержки.
3. После создания скопируйте строку подключения из раздела **Connection Details** (выберите формат URL, он имеет вид `rediss://default:password@endpoint:port`). Это ваша переменная `SPRING_DATA_REDIS_URL`. Также для безопасного подключения (SSL) понадобится флаг `SPRING_DATA_REDIS_SSL_ENABLED=true`.

---

## 📌 Шаг 4. Настройка Telegram Бота в @BotFather

Телеграм-бот QTab мгновенно отправляет уведомления персоналу ресторана о вызовах официанта, новых заказах, запросах счетов и оплатах.

1. Откройте Telegram и найдите официального бота **[@BotFather](https://t.me/BotFather)**.
2. Отправьте команду `/newbot`.
3. Введите название вашего бота (например, `QTab Alerts`).
4. Введите уникальный юзернейм бота, оканчивающийся на `_bot` (например, `my_qtab_alerts_bot`).
5. BotFather выдаст вам **HTTP API Token** (например, `1234567890:ABCdef...`). Сохраните его.

---

## 📌 Шаг 5. Деплой Бэкенда (Spring Boot 3) на Render

Бэкенд собирается и запускается в Docker-контейнере. В корне проекта уже настроен `Dockerfile` (в папке `backend/`).

1. В [Render Dashboard](https://dashboard.render.com/) нажмите **New -> Web Service**.
2. Подключите ваш GitHub-репозиторий.
3. Настройте параметры сервиса:
   * **Name:** `qtab-backend`
   * **Region:** Frankfurt (EU Central).
   * **Root Directory:** `backend`
   * **Environment:** `Docker`
   * **Instance Type:** Free.
   * **Health Check Path:** `/actuator/health` (Spring Boot Actuator отдаст статус 200 OK)
4. В разделе **Environment Variables (Переменные окружения)** добавьте ключи из вашего [.env.prod](file:///C:/.development/Projects/qtab/.env.prod):

| Ключ | Пример значения | Описание |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Включает продакшн-режим Spring Boot |
| `SERVER_PORT` | `8080` | Порт, который слушает приложение в контейнере |
| `DATABASE_URL` | `postgresql://neondb_owner:your_neon_password@ep-cool-cloud-12345.eu-central-1.aws.neon.tech/neondb` | Общая строка подключения к БД Neon (Connection string) |
| `SPRING_DATA_REDIS_URL` | `rediss://default:password@ep-cool-redis-12345.upstash.io:6379` | Строка подключения к Redis из Upstash |
| `SPRING_DATA_REDIS_SSL_ENABLED` | `true` | Включение SSL для безопасного соединения с Redis (для Upstash — `true`) |
| `JWT_SECRET` | `длинная_случайная_строка_минимум_32_символа` | Секретный ключ для подписи JWT токенов |
| `CORS_ALLOWED_ORIGIN` | `https://qtab.xyz,https://www.qtab.xyz` | Точный URL вашего фронтенда |
| `TELEGRAM_BOT_TOKEN` | `1234567890:ABCdef...` | Токен вашего бота из @BotFather |
| `TELEGRAM_BOT_USERNAME` | `@my_qtab_alerts_bot` | Юзернейм бота |
| `GEMINI_API_KEY` | `AIzaSy...` | API-ключ Google Gemini для ИИ-чат-ассистента и аналитики |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Модель ИИ (рекомендуется `gemini-2.5-flash`) |

5. Нажмите **Create Web Service**. Дождитесь завершения сборки Docker-образа. Render выдаст URL сервиса: `https://qtab-backend.onrender.com`.

---

## 📌 Шаг 6. Деплой Фронтенда (Next.js 16) на Vercel

1. Зайдите на [Vercel Dashboard](https://vercel.com/dashboard).
2. Нажмите **Add New -> Project** и импортируйте ваш репозиторий с GitHub.
3. В настройках проекта:
   * **Framework Preset:** Next.js.
   * **Root Directory:** выберите папку `frontend`.
4. Раскройте секцию **Environment Variables** и добавьте переменную:

| Имя переменной | Значение | Описание |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://qtab-backend.onrender.com` (или ваш поддомен `https://api.qtab.xyz`) | Корневой URL вашего API бэкенда на Render (без `/api/v1` на конце, Next.js сам подставит путь) |

5. Нажмите **Deploy**. Vercel выдаст ссылку вида `https://qtab-frontend.vercel.app`.

---

## 📌 Шаг 7. Привязка доменов и проксирование через Cloudflare

Теперь свяжем Vercel и Render с вашим красивым доменом через Cloudflare.

### 7.1. Домен для Фронтенда (`qtab.xyz` и `www.qtab.xyz`)
1. В Vercel перейдите в **Settings -> Domains** вашего проекта и добавьте домены.
2. Vercel покажет записи, которые нужно добавить в DNS.
3. Откройте **Cloudflare -> DNS -> Records** и добавьте записи:
   * **Type:** `CNAME`
   * **Name:** `qtab.xyz` (и `www`)
   * **Target:** `cname.vercel-dns.com`
   * **Proxy status:** ☁️ **DNS only (Серое облачко ОБЯЗАТЕЛЬНО!)**. Vercel выпускает SSL-сертификаты Let's Encrypt сам.

### 7.2. Поддомен для Бэкенда (`api.qtab.xyz`)
1. В панели Render перейдите в настройки вашего Web Service -> **Settings -> Custom Domains** и добавьте `api.qtab.xyz`.
2. Откройте **Cloudflare -> DNS -> Records** и добавьте запись:
   * **Type:** `CNAME`
   * **Name:** `api`
   * **Target:** `qtab-backend.onrender.com` (адрес из панели Render без `https://`)
   * **Proxy status:** ☁️ **DNS only (Серое облачко)** при первом добавлении, чтобы Render мог успешно проверить DNS и выпустить SSL-сертификат.

---

## 📌 Шаг 8. Предотвращение засыпания бэкенда (UptimeRobot)

На бесплатном тарифе Render (**Free Web Service**) контейнер засыпает после 15 минут простоя. Холодный старт Spring Boot (Java 21) занимает 30–50 секунд. Чтобы бэкенд отвечал мгновенно 24/7 бесплатно:

1. Зарегистрируйтесь на [UptimeRobot](https://uptimerobot.com/) (Free Plan).
2. Нажмите **+ Add New Monitor**.
3. Укажите параметры мониторинга:
   * **Monitor Type:** `HTTP(s)`
   * **Friendly Name:** `QTab Backend`
   * **URL (или IP):** `https://api.qtab.xyz/actuator/health` *(или открытый эндпоинт)*
   * **Monitoring Interval:** `5 minutes`
4. Нажмите **Create Monitor**.

Каждые 5 минут UptimeRobot будет опрашивать бэкенд, предотвращая переход контейнера в спящий режим и обеспечивая мгновенный отклик гостям за столом.

🎉 **Ваша система QTab успешно развёрнута в Production-среде и работает 24/7!**
