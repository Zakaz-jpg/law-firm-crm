#!/bin/bash
# Запускать с корня репозитория: bash deploy/deploy.sh
set -e

SERVER="root@157.22.231.25"
REMOTE="/var/www/lawcrm"

echo "==> Собираю фронтенд..."
cd web
npm run build
cd ..

echo "==> Загружаю бэкенд..."
rsync -avz --delete \
  --exclude='venv/' \
  --exclude='venv_old_broken/' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='.env' \
  --exclude='law_firm.db' \
  backend/ $SERVER:$REMOTE/backend/

echo "==> Загружаю фронтенд..."
rsync -avz --delete web/dist/ $SERVER:$REMOTE/frontend/

echo "==> Загружаю конфиги..."
scp deploy/nginx.conf $SERVER:/etc/nginx/sites-available/lawcrm.su
scp deploy/lawcrm-backend.service $SERVER:/etc/systemd/system/

echo "==> Настраиваю сервер..."
ssh $SERVER bash << 'EOF'
  set -e

  # nginx
  ln -sf /etc/nginx/sites-available/lawcrm.su /etc/nginx/sites-enabled/lawcrm.su
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

  # Python окружение
  cd /var/www/lawcrm/backend
  python3.11 -m venv venv
  venv/bin/pip install --quiet -r requirements.txt

  # Запуск сервиса
  systemctl daemon-reload
  systemctl enable lawcrm-backend
  systemctl restart lawcrm-backend
  sleep 2
  systemctl status lawcrm-backend --no-pager
EOF

echo ""
echo "==> Готово!"
echo "    Сайт: https://lawcrm.su"
echo ""
echo "Если SSL ещё не настроен, выполните на сервере:"
echo "  certbot --nginx -d lawcrm.su -d www.lawcrm.su"
