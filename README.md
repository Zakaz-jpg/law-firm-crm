# LawCRM — система управления делами для юристов

Полноценная CRM для юридической практики: FastAPI бэкенд + React веб-приложение + iOS + Android.

## 🌐 Веб-версия

**Сайт:** https://zakaz-jpg.github.io/law-firm-crm/

## 🚀 Деплой в один клик

### Шаг 1 — Бэкенд на Render (бесплатно)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Zakaz-jpg/law-firm-crm)

> Render автоматически создаст сервер + PostgreSQL базу данных.  
> После деплоя скопируй URL сервиса (вида `https://lawcrm-api.onrender.com`)

### Шаг 2 — Фронтенд на Vercel (бесплатно)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Zakaz-jpg/law-firm-crm&root-directory=web&framework=vite&build-command=npm+run+build&output-directory=dist)

> После деплоя фронтенд будет доступен по адресу вида `https://law-firm-crm.vercel.app`

---

## 📱 Мобильные приложения

### iOS
1. Открой `mobile/ios/LawCRM.xcodeproj` в Xcode
2. Выбери симулятор или устройство → `Cmd+R`

### Android
1. Открой папку `mobile/android/LawCRM` в Android Studio
2. Нажми Run ▶

---

## 🛠 Локальный запуск

```bash
# Бэкенд
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Фронтенд
cd web
npm install && npm run dev
```

Или двойной клик на `start_backend.command` на Рабочем столе.

---

## 🏗 Стек

| Компонент | Технологии |
|-----------|-----------|
| Бэкенд | Python 3.11, FastAPI, SQLAlchemy, PostgreSQL |
| Веб | React 18, TypeScript, Vite, CSS Modules |
| iOS | Swift 5.9, SwiftUI, SwiftData |
| Android | Kotlin, Jetpack Compose, Room, Hilt |
| Деплой | Render (backend) + Vercel/GitHub Pages (web) |

## 📡 API

После запуска бэкенда документация доступна по адресу:  
`http://localhost:8000/docs`
