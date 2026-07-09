# Пошаговое руководство по продакшн-деплою LawTrack CRM

Это подробное руководство по развертыванию мини-CRM системы **LawTrack** (бэкенд Spring Boot 4, фронтенд Next.js 16, PostgreSQL 16) на бесплатных облачных платформах (Neon, Render, Vercel) с использованием стандартных доменных имен по умолчанию.

---

## 🏗 Общая архитектура деплоя

| Компонент | Платформа | Роль | Тариф |
|---|---|---|---|
| **Frontend** | **Vercel** | Хостинг Next.js 16 (App Router, React 19, Tailwind v4) | Бесплатный (Hobby) |
| **Backend** | **Render** | Docker-контейнер со Spring Boot 4 (Java 21) | Бесплатный (Free Web Service) |
| **База данных** | **Neon** | Serverless PostgreSQL 16 для хранения данных | Бесплатный (Free) |

---

## 📌 Шаг 1. Создание базы данных PostgreSQL в Neon

Мы используем **Neon** (Serverless Postgres), так как у него есть отличный бесплатный тариф, БД быстро "просыпается" при обращении и не удаляется со временем.

1. Зарегистрируйтесь на [Neon.tech](https://neon.tech/).
2. Создайте новый проект:
   * **Project Name:** `lawtrack-db`
   * **Postgres Version:** 16 (или выше)
   * **Region:** Frankfurt (EU Central) — для минимальной задержки с европейскими серверами Render/Vercel.
3. Нажмите **Create project**.
4. В панели управления проектом скопируйте строку подключения **Connection string** (DATABASE_URL) в формате JDBC или стандартную строку подключения URI. Она понадобится для настройки бэкенда на Render.

---

## 📌 Шаг 2. Деплой Бэкенда (Spring Boot 4) на Render

Бэкенд LawTrack автоматически упаковывается в Docker-контейнер с помощью `Dockerfile` в папке `backend/`.

1. Зайдите в [Render Dashboard](https://dashboard.render.com/) и нажмите **New -> Web Service**.
2. Подключите ваш GitHub-репозиторий с проектом LawTrack.
3. Настройте параметры сервиса:
   * **Name:** `lawtrack-backend` (уникальное имя)
   * **Region:** Frankfurt (EU Central).
   * **Root Directory:** `backend` (очень важно указать директорию бэкенда)
   * **Environment (Runtime):** `Docker`
   * **Instance Type:** Free.
   * **Health Check Path:** `/actuator/health` (будет возвращать 200 OK после успешного старта приложения)
4. В разделе **Environment Variables (Переменные окружения)** добавьте следующие ключи:

| Ключ | Пример значения | Описание |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Включает продакшн-режим Spring Boot |
| `PORT` | `8080` | Порт, который слушает приложение в контейнере |
| `DB_HOST` | `ep-cool-cloud-12345.eu-central-1.aws.neon.tech` | Хост базы данных из Neon |
| `DB_PORT` | `5432` | Порт БД |
| `DB_NAME` | `neondb` | Имя БД |
| `DB_USER` | `neondb_owner` | Имя пользователя Neon |
| `DB_PASSWORD` | `ваш_пароль_neon` | Пароль к БД Neon |
| `TELEGRAM_BOT_TOKEN` | `1234567890:ABCdef...` | Токен вашего бота из @BotFather (для уведомлений) |
| `TELEGRAM_CHAT_ID` | `123456789` | ID вашего чата/аккаунта Telegram для получения алертов |
| `FRONTEND_URL` | `https://lawtrack-frontend.vercel.app` | **Полный URL вашего Next.js фронтенда на Vercel** (будет получен на следующем шаге) |
| `ADMIN_TOKEN` | `ваш_секретный_токен` | Опциональный токен авторизации (передается в заголовке `X-Admin-Token` для API защиты) |

5. Нажмите **Create Web Service**. Дождитесь сборки Maven и запуска Docker-контейнера. Вы получите публичный URL вида `https://lawtrack-backend.onrender.com`.

---

## 📌 Шаг 3. Деплой Фронтенда (Next.js 16) на Vercel

1. Зайдите в панель управления [Vercel](https://vercel.com/).
2. Нажмите **Add New -> Project** и выберите ваш репозиторий GitHub.
3. Настройте параметры проекта:
   * **Framework Preset:** Next.js.
   * **Root Directory:** укажите папку `frontend`.
4. В разделе **Environment Variables** добавьте следующую переменную:

| Имя переменной | Значение | Описание |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://lawtrack-backend.onrender.com` | Ссылка на ваш рабочий бэкенд на Render |
| `NEXT_PUBLIC_ADMIN_TOKEN` | `ваш_секретный_токен` | Опциональный токен администратора (должен совпадать с `ADMIN_TOKEN` на бэкенде) |

5. Нажмите **Deploy**. Vercel скомпилирует приложение, настроит кэш и выдаст бесплатный публичный домен вида `https://lawtrack-frontend.vercel.app`.
6. **Важно:** Вернитесь в настройки бэкенда на Render и убедитесь, что переменная `FRONTEND_URL` совпадает с полученным адресом от Vercel, чтобы CORS-запросы не блокировались.

---

## 📌 Шаг 4. Предотвращение засыпания бэкенда (UptimeRobot)

На бесплатном тарифе Render (**Free Web Service**) контейнер переходит в спящий режим после 15 минут неактивности. Холодный старт Spring Boot приложения занимает около 30–50 секунд. Чтобы система работала отзывчиво 24/7 бесплатно:

1. Зарегистрируйтесь на [UptimeRobot.com](https://uptimerobot.com/) (бесплатный тариф).
2. Нажмите **+ Add New Monitor**.
3. Настройте мониторинг:
   * **Monitor Type:** `HTTP(s)`
   * **Friendly Name:** `LawTrack Backend`
   * **URL (или IP):** `https://lawtrack-backend.onrender.com/actuator/health`
   * **Monitoring Interval:** `5 minutes`
4. Нажмите **Create Monitor**.

Теперь UptimeRobot каждые 5 минут будет опрашивать Actuator-эндпоинт бэкенда, не давая ему заснуть и обеспечивая мгновенный отклик при открытии дашборда.

🎉 **Ваша мини-CRM LawTrack полностью развернута в облаке и готова к работе!**
