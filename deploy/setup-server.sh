#!/bin/bash
# Запустить один раз на сервере: bash setup-server.sh
set -e

apt update && apt upgrade -y
apt install -y nginx python3.11 python3.11-venv python3-pip certbot python3-certbot-nginx

mkdir -p /var/www/lawcrm/backend/uploads
mkdir -p /var/www/lawcrm/frontend

systemctl enable nginx
systemctl start nginx

echo ""
echo "Сервер готов. Теперь запустите deploy.sh с локальной машины."
