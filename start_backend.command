#!/bin/bash
cd "$(dirname "$0")/backend"
source venv/bin/activate

echo "================================================"
echo "  LawCRM — запуск бэкенда и туннеля"
echo "================================================"

# Запускаем бэкенд в фоне
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
sleep 2

echo ""
echo "✓ Бэкенд запущен (PID $BACKEND_PID)"
echo ""
echo "Создаю публичный URL через localtunnel..."

# Запускаем localtunnel и показываем URL
npx localtunnel --port 8000 2>&1 | while read line; do
    if [[ "$line" == *"your url is:"* ]]; then
        URL=$(echo "$line" | awk '{print $NF}')
        echo ""
        echo "================================================"
        echo "  АДРЕС СЕРВЕРА ДЛЯ ПРИЛОЖЕНИЯ:"
        echo ""
        echo "  ${URL}/api/v1"
        echo ""
        echo "  Вставь этот URL в поле 'Адрес сервера'"
        echo "  на экране входа в LawCRM"
        echo "================================================"
    fi
    echo "$line"
done

# Убиваем бэкенд при выходе
kill $BACKEND_PID 2>/dev/null
